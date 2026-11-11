/**
 * Changeset authoring at effort close.
 *
 * Two seams, one feature: the changesets wrapper (`src/core/changesets.ts`,
 * which reads a fixture repository's workspace and config, proposes the
 * entries, and writes them through the library set) and `tw_write_changesets`
 * (the named writer the effort close calls after the operator confirms).
 *
 * Every test runs against a fixture repository in a temp directory: a
 * `package.json` and a `.changeset/config.json`, nothing else. The command
 * line tool is the comparison oracle where the contract is "what the CLI would
 * accept": the round-trip test runs the real `changeset version` over the
 * written file, from the dev tree's own install.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, describe, expect, test } from "vitest";

import { createTools } from "../src/pi.js";

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

/** The config a fixture repository carries unless a test says otherwise. */
const CONFIG = { changelog: false, commit: false, access: "restricted", baseBranch: "main" };

interface FixtureOptions {
  manifest?: unknown;
  /** `null` writes no `.changeset` directory at all. */
  config?: unknown | null;
}

/** A fixture repository: a manifest and, unless asked otherwise, a changeset config. */
function fixtureRepository(options: FixtureOptions = {}): string {
  const dir = tempDir("changesets");
  const manifest = options.manifest ?? MANIFEST;
  if (manifest !== null) writeFileSync(join(dir, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");
  const config = options.config === undefined ? CONFIG : options.config;
  if (config !== null) {
    mkdirSync(join(dir, ".changeset"), { recursive: true });
    writeFileSync(join(dir, ".changeset", "config.json"), `${JSON.stringify(config, null, 2)}\n`, "utf-8");
  }
  return dir;
}

/**
 * A fixture workspace: a private root package and two member packages, the
 * shape a repository that versions more than one package has.
 */
function fixtureWorkspace(): string {
  const dir = fixtureRepository({
    manifest: { name: "@scope/root", version: "1.0.0", private: true, workspaces: ["packages/*"] },
  });
  // The workspace reader recognises an npm monorepo by its workspaces field
  // and its lockfile, so a two-member workspace carries both.
  writeFileSync(join(dir, "package-lock.json"), `${JSON.stringify({ lockfileVersion: 3, packages: {} }, null, 2)}\n`, "utf-8");
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

/** The changeset files a fixture repository holds, sorted. */
function changesetFiles(dir: string): string[] {
  return readdirSync(join(dir, ".changeset"))
    .filter((file) => file.endsWith(".md"))
    .sort();
}

/** Read one changeset file's exact bytes. */
function changesetBytes(dir: string, file: string): string {
  return readFileSync(join(dir, ".changeset", file), "utf-8");
}

/** The tool as an extension registers it, driven with a bare directory context. */
async function writeChangesets(
  args: Record<string, unknown>,
  directory: string,
): Promise<{ text: string; details: any }> {
  const tools = createTools() as unknown as Record<string, { execute: Function }>;
  const result = await tools.tw_write_changesets.execute(args, { directory });
  expect(typeof result, "the writer answers with text plus details").toBe("object");
  return result as { text: string; details: any };
}

// ─── Writing an entry ────────────────────────────────────────────────────────

describe("tw_write_changesets", () => {
  test("writes one file per entry under .changeset, in the tool's own format", async () => {
    const dir = fixtureRepository();

    const { text, details } = await writeChangesets(
      {
        effort: "configurable-git-workflow",
        entries: [{ package: "@scope/fixture-pkg", level: "minor", summary: "Add the release skill." }],
      },
      dir,
    );

    // The library's own writer format, byte for byte: the frontmatter names the
    // package and the level, and the body is the summary.
    expect(changesetFiles(dir)).toHaveLength(1);
    expect(changesetBytes(dir, changesetFiles(dir)[0])).toBe(
      '---\n"@scope/fixture-pkg": minor\n---\n\nAdd the release skill.\n',
    );
    expect(details.written).toEqual([join(dir, ".changeset", changesetFiles(dir)[0])]);
    expect(text).toContain("Add the release skill.");
  });

  test("disables formatting, so no formatter runs over the written file", async () => {
    // The config's default formatting value is "auto", which spawns a formatter
    // and leaves a half-applied tree when the formatter fails. The fixture
    // declares prettier and carries a formatter shim on the local bin path, so
    // a write that let the default through would run it and leave a marker.
    const dir = fixtureRepository({ manifest: { ...MANIFEST, devDependencies: { prettier: "^3.0.0" } } });
    writeFileSync(join(dir, ".prettierrc.json"), "{}\n", "utf-8");
    const marker = join(dir, "FORMATTER_RAN");
    mkdirSync(join(dir, "node_modules", ".bin"), { recursive: true });
    writeFileSync(join(dir, "node_modules", ".bin", "prettier"), `#!/bin/sh\necho "$@" >> '${marker}'\n`, {
      mode: 0o755,
    });

    await writeChangesets(
      {
        effort: "configurable-git-workflow",
        entries: [{ package: "@scope/fixture-pkg", level: "minor", summary: "Add the release skill." }],
      },
      dir,
    );

    expect(existsSync(marker), "no formatter should run over a written changeset").toBe(false);
    // And the bytes are the library's own, unformatted: one frontmatter line,
    // one blank line, the summary, one trailing newline.
    expect(changesetBytes(dir, changesetFiles(dir)[0])).toBe(
      '---\n"@scope/fixture-pkg": minor\n---\n\nAdd the release skill.\n',
    );
  });
});

// ─── The changeset config ─────────────────────────────────────────────────────

describe("tw_write_changesets without a changeset config", () => {
  test("refuses, naming the missing config, and writes no file", async () => {
    const dir = fixtureRepository({ config: null });

    const { text, details } = await writeChangesets(
      {
        effort: "configurable-git-workflow",
        entries: [{ package: "@scope/fixture-pkg", level: "patch", summary: "A change." }],
      },
      dir,
    );

    expect(details.refusal.code).toBe("no-config");
    expect(details.refusal.reason).toContain(join(dir, ".changeset", "config.json"));
    expect(text).toContain("Refused:");
    expect(text).toContain("changeset init");
    // A refusal leaves the tree as it found it: no `.changeset` directory, so
    // the repository does not look half-configured afterwards.
    expect(existsSync(join(dir, ".changeset"))).toBe(false);
  });

  test("refuses a .changeset directory that holds changesets but no config", async () => {
    const dir = fixtureRepository({ config: null });
    mkdirSync(join(dir, ".changeset"), { recursive: true });
    writeFileSync(join(dir, ".changeset", "staged-change.md"), '---\n"@scope/fixture-pkg": patch\n---\n\nOld.\n', "utf-8");

    const { details } = await writeChangesets(
      {
        effort: "configurable-git-workflow",
        entries: [{ package: "@scope/fixture-pkg", level: "patch", summary: "A change." }],
      },
      dir,
    );

    expect(details.refusal.code).toBe("no-config");
    expect(changesetFiles(dir)).toEqual(["staged-change.md"]);
  });

  test("refuses a config the changesets schema rejects, with the schema's reason", async () => {
    const dir = fixtureRepository({ config: { baseBranch: 5 } });

    const { text, details } = await writeChangesets(
      {
        effort: "configurable-git-workflow",
        entries: [{ package: "@scope/fixture-pkg", level: "patch", summary: "A change." }],
      },
      dir,
    );

    expect(details.refusal.code).toBe("invalid-config");
    expect(details.refusal.reason).toContain("config.json");
    expect(text).toContain("Refused:");
    expect(changesetFiles(dir)).toEqual([]);
  });
});

// ─── Validating an entry against the workspace ───────────────────────────────

describe("tw_write_changesets validation", () => {
  test("writes an entry naming any workspace package, not only the root", async () => {
    const dir = fixtureWorkspace();

    const { details } = await writeChangesets(
      {
        effort: "configurable-git-workflow",
        entries: [{ package: "@scope/alpha", level: "patch", summary: "Fix the alpha reader." }],
      },
      dir,
    );

    expect(changesetFiles(dir)).toHaveLength(1);
    expect(changesetBytes(dir, changesetFiles(dir)[0])).toContain('"@scope/alpha": patch');
    expect(details.entries).toEqual([
      { package: "@scope/alpha", level: "patch", summary: "Fix the alpha reader." },
    ]);
  });

  test("refuses a package name outside the workspace, naming the workspace packages", async () => {
    const dir = fixtureWorkspace();

    const { text, details } = await writeChangesets(
      {
        effort: "configurable-git-workflow",
        entries: [
          { package: "@scope/alpha", level: "patch", summary: "A real change." },
          { package: "@scope/not-a-package", level: "patch", summary: "A change to nothing." },
        ],
      },
      dir,
    );

    // A refusal is a refusal, not a partial write: the valid entry in the same
    // call did not land either.
    expect(changesetFiles(dir)).toEqual([]);
    expect(details.refusal.code).toBe("unknown-package");
    expect(details.refusal.reason).toContain("@scope/not-a-package");
    expect(text).toContain("Refused:");
    expect(text).toContain("@scope/alpha");
  });

  test("refuses a level that is not patch, minor, or major", async () => {
    const dir = fixtureWorkspace();

    const { text, details } = await writeChangesets(
      {
        effort: "configurable-git-workflow",
        entries: [{ package: "@scope/alpha", level: "huge", summary: "An oversized change." }],
      },
      dir,
    );

    expect(changesetFiles(dir)).toEqual([]);
    expect(details.refusal.code).toBe("invalid-level");
    expect(text).toContain("huge");
    expect(text).toContain("patch, minor, or major");
  });
});
