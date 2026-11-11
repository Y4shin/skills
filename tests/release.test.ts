/**
 * Release mechanics behind a tool.
 *
 * The consume path of the changesets seam (`src/core/changesets.ts`) and the
 * two tools that expose it: `tw_release_plan` reports the pending entries, the
 * versions they produce, and the changelog section text without writing
 * anything, and `tw_release_apply` writes the manifest bump, the changelog
 * section, and the removal of the consumed entries.
 *
 * Every test runs against a fixture repository in a temp directory, so nothing
 * here depends on the command line tool being installed: the fixtures carry a
 * manifest and a `.changeset/` config, and their configs name the CLI's own
 * changelog specifier, which the fixtures do not have. Where the contract is
 * "what the CLI would do", the dev tree's own `changeset version` is the
 * comparison oracle.
 */

import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { afterAll, describe, expect, test } from "vitest";

import { createTools } from "../src/pi.js";
import { applyRelease, planRelease } from "../src/core/changesets.js";

const require = createRequire(import.meta.url);

// ─── Fixtures ────────────────────────────────────────────────────────────────

const roots: string[] = [];

/** A temp directory, removed when the file's tests finish. */
function tempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), `${prefix}-`));
  roots.push(dir);
  return dir;
}

afterAll(() => {
  for (const dir of roots) rmSync(dir, { recursive: true, force: true });
});

/** The manifest a fixture repository carries unless a test says otherwise. */
const MANIFEST = { name: "@scope/fixture-pkg", version: "1.0.0" };

/**
 * The config a fixture repository carries unless a test says otherwise. The
 * changelog specifier is the command line tool's own, which no fixture
 * installs: the release path must render through the standalone changelog
 * package regardless.
 */
const CONFIG = {
  changelog: "@changesets/cli/changelog",
  commit: false,
  access: "restricted",
  baseBranch: "main",
};

/** One changeset file's bytes, in the tool's own format. */
function changeset(pkg: string, level: string, summary: string): string {
  return `---\n"${pkg}": ${level}\n---\n\n${summary}\n`;
}

interface FixtureOptions {
  manifest?: unknown;
  /** `null` writes no `.changeset` directory at all. */
  config?: unknown | null;
  /** Files to write under `.changeset/`, by file name. */
  changesets?: Record<string, string>;
  /** Extra files at the repository root, by name. */
  files?: Record<string, string>;
}

/** A fixture repository: a manifest, a changeset config, and pending entries. */
function fixtureRepository(options: FixtureOptions = {}): string {
  const dir = tempDir("release");
  writeFileSync(join(dir, "package.json"), `${JSON.stringify(options.manifest ?? MANIFEST, null, 2)}\n`, "utf-8");
  const config = options.config === undefined ? CONFIG : options.config;
  if (config !== null) {
    mkdirSync(join(dir, ".changeset"), { recursive: true });
    writeFileSync(join(dir, ".changeset", "config.json"), `${JSON.stringify(config, null, 2)}\n`, "utf-8");
  }
  for (const [name, body] of Object.entries(options.changesets ?? {})) {
    writeFileSync(join(dir, ".changeset", name), body, "utf-8");
  }
  for (const [name, body] of Object.entries(options.files ?? {})) {
    writeFileSync(join(dir, name), body, "utf-8");
  }
  return dir;
}

/** A fixture with one pending minor entry, the common case. */
function oneEntryFixture(options: FixtureOptions = {}): string {
  return fixtureRepository({
    changesets: { "a-change.md": changeset("@scope/fixture-pkg", "minor", "Add the release skill.") },
    ...options,
  });
}

/** A fixture workspace: a private root package and two member packages. */
function fixtureWorkspace(): string {
  const dir = fixtureRepository({
    manifest: { name: "@scope/root", version: "1.0.0", private: true, workspaces: ["packages/*"] },
  });
  // The workspace reader recognises an npm monorepo by its workspaces field
  // and its lockfile, so a two-member workspace carries both.
  writeFileSync(
    join(dir, "package-lock.json"),
    `${JSON.stringify({ lockfileVersion: 3, packages: {} }, null, 2)}\n`,
    "utf-8",
  );
  for (const [name, version] of [
    ["@scope/alpha", "0.1.0"],
    ["@scope/beta", "0.2.0"],
  ]) {
    const memberDir = join(dir, "packages", name.replace("@scope/", ""));
    mkdirSync(memberDir, { recursive: true });
    writeFileSync(join(memberDir, "package.json"), `${JSON.stringify({ name, version }, null, 2)}\n`, "utf-8");
  }
  return dir;
}

/** The changeset files a repository holds, sorted. */
function changesetFiles(dir: string): string[] {
  return readdirSync(join(dir, ".changeset"))
    .filter((file) => file.endsWith(".md"))
    .sort();
}

/** A file's exact bytes, or `null` when it does not exist. */
function bytes(path: string): string | null {
  return existsSync(path) ? readFileSync(path, "utf-8") : null;
}

// ─── Driving the tools ──────────────────────────────────────────────────────

/** One tool as the extension registers it, driven with a bare directory context. */
async function tool(name: string, args: Record<string, unknown>, directory: string) {
  const tools = createTools() as unknown as Record<string, { execute: Function }>;
  const result = await tools[name].execute(args, { directory });
  expect(typeof result, `${name} answers with text plus details`).toBe("object");
  return result as { text: string; details: any };
}

const plan = (dir: string) => tool("tw_release_plan", {}, dir);
const apply = (dir: string) => tool("tw_release_apply", {}, dir);

// ─── The dependency set ─────────────────────────────────────────────────────

/**
 * The whole library set the seam drives: authoring, the workspace read, the
 * config, and the four calls that turn pending entries into a version bump and
 * a changelog section. Every one of them is imported at runtime.
 */
const RELEASE_LIBRARIES = [
  "@changesets/apply-release-plan",
  "@changesets/assemble-release-plan",
  "@changesets/changelog-git",
  "@changesets/config",
  "@changesets/git",
  "@changesets/read",
  "@changesets/types",
  "@changesets/write",
  "@manypkg/get-packages",
];

describe("the release dependency set", () => {
  test("the changesets library set and the workspace reader are runtime dependencies", () => {
    const manifest = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf-8"));

    // A consumer installs dependencies, not devDependencies: a library the
    // seam drives at runtime but declares as a devDependency is missing from
    // every installed copy of the extension.
    for (const name of RELEASE_LIBRARIES) {
      expect(Object.keys(manifest.dependencies), `${name} is a runtime dependency`).toContain(name);
    }
  });

  test("every changesets library the seam imports is a runtime dependency", () => {
    const root = process.cwd();
    const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf-8"));
    const source = readFileSync(join(root, "src/core/changesets.ts"), "utf-8");
    const imported = [...source.matchAll(/from\s+"(@changesets\/[^"]+|@manypkg\/get-packages)"/g)].map(
      (match) => match[1],
    );

    expect(imported.length).toBeGreaterThan(0);
    for (const name of new Set(imported)) {
      expect(Object.keys(manifest.dependencies), `${name} is imported and declared`).toContain(name);
    }
  });

  test("the command line tool is a dev dependency, never a runtime one", () => {
    const manifest = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf-8"));

    // Importing @changesets/cli runs its command line and exits the process,
    // so it may only ever be the comparison oracle in the dev tree.
    expect(Object.keys(manifest.dependencies)).not.toContain("@changesets/cli");
    expect(Object.keys(manifest.devDependencies)).toContain("@changesets/cli");
  });
});
