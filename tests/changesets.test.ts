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
import { dirname, join } from "node:path";
import { afterAll, describe, expect, test } from "vitest";

import { parseChangesetFile } from "@changesets/parse";

import { createTools } from "../src/pi.js";
import { GENERIC_SUMMARY, proposeEntries, readStagedEntries, readWorkspace } from "../src/core/changesets.js";

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

// ─── The generic patch and the dedupe ────────────────────────────────────────

describe("the generic patch", () => {
  test("is proposed for an effort with nothing a user can observe", async () => {
    const dir = fixtureRepository();

    const proposal = await proposeEntries(dir, { changes: [] });

    expect(proposal.refusal).toBeNull();
    expect(proposal.generic).toBe(true);
    expect(proposal.entries).toEqual([
      { package: "@scope/fixture-pkg", level: "patch", summary: GENERIC_SUMMARY },
    ]);
    expect(proposal.skipped).toEqual([]);
  });

  test("is not proposed when the effort names changes a user can observe", async () => {
    const dir = fixtureRepository();

    const proposal = await proposeEntries(dir, {
      changes: [{ package: "@scope/fixture-pkg", level: "minor", summary: "Add the release skill." }],
    });

    expect(proposal.generic).toBe(false);
    expect(proposal.entries).toEqual([
      { package: "@scope/fixture-pkg", level: "minor", summary: "Add the release skill." },
    ]);
  });

  test("is not repeated when an identical entry is already staged", async () => {
    const dir = fixtureRepository();
    writeFileSync(
      join(dir, ".changeset", "already-staged.md"),
      `---\n"@scope/fixture-pkg": patch\n---\n\n${GENERIC_SUMMARY}\n`,
      "utf-8",
    );

    const proposal = await proposeEntries(dir, { changes: [] });

    // The proposal stands, but there is nothing left to write: the same entry
    // is already staged, and a second copy would version the package twice.
    expect(proposal.refusal).toBeNull();
    expect(proposal.entries).toEqual([]);
    expect(proposal.generic).toBe(true);
    expect(proposal.skipped).toEqual([
      { package: "@scope/fixture-pkg", level: "patch", summary: GENERIC_SUMMARY },
    ]);
  });

  test("is staged by the writer when nothing is proposed, and not a second time", async () => {
    const dir = fixtureRepository();

    const first = await writeChangesets({ effort: "configurable-git-workflow" }, dir);
    expect(changesetFiles(dir)).toHaveLength(1);
    expect(first.details.generic).toBe(true);
    expect(changesetBytes(dir, changesetFiles(dir)[0])).toBe(
      `---\n"@scope/fixture-pkg": patch\n---\n\n${GENERIC_SUMMARY}\n`,
    );

    const second = await writeChangesets({ effort: "configurable-git-workflow" }, dir);
    expect(changesetFiles(dir)).toHaveLength(1);
    expect(second.details.written).toEqual([]);
    expect(second.details.skipped).toHaveLength(1);
    expect(second.text).toContain("already staged");
    // Nothing was written the second time: the entry is reported as skipped,
    // not as an entry the call wrote.
    expect(second.details.entries).toEqual([]);
  });

  test("writes one entry when the same change is proposed twice in one call", async () => {
    const dir = fixtureRepository();

    const { details } = await writeChangesets(
      {
        effort: "configurable-git-workflow",
        entries: [
          { package: "@scope/fixture-pkg", level: "patch", summary: "Fix the writer's refusal text." },
          { package: "@scope/fixture-pkg", level: "patch", summary: "Fix the writer's refusal text." },
        ],
      },
      dir,
    );

    expect(changesetFiles(dir)).toHaveLength(1);
    expect(details.written).toHaveLength(1);
    expect(details.skipped).toHaveLength(1);
  });

  test("drops a named change that is already staged, and writes the rest", async () => {
    const dir = fixtureRepository();
    writeFileSync(
      join(dir, ".changeset", "already-staged.md"),
      '---\n"@scope/fixture-pkg": minor\n---\n\nAdd the release skill.\n',
      "utf-8",
    );

    const { details } = await writeChangesets(
      {
        effort: "configurable-git-workflow",
        entries: [
          { package: "@scope/fixture-pkg", level: "minor", summary: "Add the release skill." },
          { package: "@scope/fixture-pkg", level: "patch", summary: "Fix the writer's refusal text." },
        ],
      },
      dir,
    );

    expect(details.skipped).toEqual([
      { package: "@scope/fixture-pkg", level: "minor", summary: "Add the release skill." },
    ]);
    expect(details.written).toHaveLength(1);
    expect(changesetFiles(dir)).toHaveLength(2);
    expect(changesetBytes(dir, changesetFiles(dir).find((file) => file !== "already-staged.md")!)).toBe(
      '---\n"@scope/fixture-pkg": patch\n---\n\nFix the writer\'s refusal text.\n',
    );
  });
});

// ─── Reading the staged set ─────────────────────────────────────────────────

describe("readStagedEntries", () => {
  test("separates nothing staged from a staged set it could not read", async () => {
    const empty = await readWorkspace(fixtureRepository());
    const nothing = await readStagedEntries(empty.workspace!);

    // An empty staged set is an answer: the dedupe ran and found nothing.
    expect(nothing.refusal).toBeNull();
    expect(nothing.entries).toEqual([]);

    const broken = fixtureRepository();
    writeFileSync(join(broken, ".changeset", "malformed.md"), "not a changeset at all\n", "utf-8");
    const read = await readWorkspace(broken);
    const unreadable = await readStagedEntries(read.workspace!);

    // An unreadable staged set is not an empty one: it is a named refusal, so
    // no caller can mistake "could not read" for "nothing staged".
    expect(unreadable.refusal).not.toBeNull();
    expect(unreadable.refusal!.code).toBe("unreadable-staged");
    expect(unreadable.refusal!.reason).toContain(join(broken, ".changeset"));
    expect(unreadable.entries).toEqual([]);
  });

  test("reads a staged set that parses, with no refusal", async () => {
    const dir = fixtureRepository();
    writeFileSync(
      join(dir, ".changeset", "staged-change.md"),
      '---\n"@scope/fixture-pkg": minor\n---\n\nAdd the release skill.\n',
      "utf-8",
    );
    const read = await readWorkspace(dir);

    const staged = await readStagedEntries(read.workspace!);

    expect(staged.refusal).toBeNull();
    expect(staged.entries).toEqual([
      { package: "@scope/fixture-pkg", level: "minor", summary: "Add the release skill." },
    ]);
  });
});

// ─── The pre-write proposal ─────────────────────────────────────────────────

describe("tw_write_changesets with dry_run", () => {
  test("returns the entries it would write, and touches nothing", async () => {
    const dir = fixtureRepository();

    const { text, details } = await writeChangesets(
      {
        effort: "configurable-git-workflow",
        dry_run: true,
        entries: [{ package: "@scope/fixture-pkg", level: "minor", summary: "Add the release skill." }],
      },
      dir,
    );

    expect(details.dry_run).toBe(true);
    expect(details.entries).toEqual([
      { package: "@scope/fixture-pkg", level: "minor", summary: "Add the release skill." },
    ]);
    expect(details.skipped).toEqual([]);
    expect(details.generic).toBe(false);
    expect(details.written).toEqual([]);
    // Nothing was written: the operator confirms the proposal first.
    expect(changesetFiles(dir)).toEqual([]);
    expect(text).toContain("Add the release skill.");
  });

  test("reports the generic entry as the proposal for an effort with nothing observable", async () => {
    const dir = fixtureRepository();

    const { text, details } = await writeChangesets({ effort: "configurable-git-workflow", dry_run: true }, dir);

    expect(details.generic).toBe(true);
    expect(details.entries).toEqual([
      { package: "@scope/fixture-pkg", level: "patch", summary: GENERIC_SUMMARY },
    ]);
    expect(changesetFiles(dir)).toEqual([]);
    expect(text).toContain(GENERIC_SUMMARY);
  });

  test("reports an identical staged entry as skipped, so the operator sees it before the write", async () => {
    const dir = fixtureRepository();
    writeFileSync(
      join(dir, ".changeset", "already-staged.md"),
      `---\n"@scope/fixture-pkg": patch\n---\n\n${GENERIC_SUMMARY}\n`,
      "utf-8",
    );

    const { text, details } = await writeChangesets({ effort: "configurable-git-workflow", dry_run: true }, dir);

    expect(details.entries).toEqual([]);
    expect(details.skipped).toEqual([
      { package: "@scope/fixture-pkg", level: "patch", summary: GENERIC_SUMMARY },
    ]);
    expect(details.generic).toBe(true);
    expect(changesetFiles(dir)).toEqual(["already-staged.md"]);
    expect(text).toContain("already staged");
  });

  test("refuses exactly as the write does, and writes nothing", async () => {
    const dir = fixtureRepository({ config: null });

    const { text, details } = await writeChangesets(
      {
        effort: "configurable-git-workflow",
        dry_run: true,
        entries: [{ package: "@scope/fixture-pkg", level: "patch", summary: "A change." }],
      },
      dir,
    );

    expect(details.refusal.code).toBe("no-config");
    expect(details.written).toEqual([]);
    expect(text).toContain("Refused:");
    expect(existsSync(join(dir, ".changeset"))).toBe(false);
  });

  test("writes the confirmed entries when the flag is absent", async () => {
    const dir = fixtureRepository();

    const { details } = await writeChangesets(
      {
        effort: "configurable-git-workflow",
        entries: [{ package: "@scope/fixture-pkg", level: "minor", summary: "Add the release skill." }],
      },
      dir,
    );

    expect(details.dry_run).toBe(false);
    expect(details.written).toHaveLength(1);
    expect(changesetFiles(dir)).toHaveLength(1);
  });
});

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

// ─── The round trip ──────────────────────────────────────────────────────────

describe("the round trip", () => {
  test("the written files parse back to the entries that were written", async () => {
    const dir = fixtureWorkspace();
    const entries = [
      { package: "@scope/alpha", level: "minor" as const, summary: "Add the alpha reader." },
      { package: "@scope/beta", level: "patch" as const, summary: "Fix the beta reader." },
    ];

    const { details } = await writeChangesets({ effort: "configurable-git-workflow", entries }, dir);
    expect(details.written).toHaveLength(2);

    // The changesets parser reads the files back: one release each, the level
    // and the summary exactly as they were written. The file names are the
    // tool's generated ids, so the comparison is keyed by package, not order.
    const parsed = changesetFiles(dir).map((file) => parseChangesetFile(changesetBytes(dir, file)));
    expect(Object.fromEntries(parsed.flatMap((entry) => entry.releases.map((r) => [r.name, r.type])))).toEqual({
      "@scope/alpha": "minor",
      "@scope/beta": "patch",
    });
    expect(parsed.map((entry) => entry.summary).sort()).toEqual(["Add the alpha reader.", "Fix the beta reader."]);

    // And the seam's own reader returns the same entries, so the dedupe reads
    // what the writer wrote.
    const read = await readWorkspace(dir);
    const staged = await readStagedEntries(read.workspace!);
    expect(staged.entries.sort((a, b) => a.package.localeCompare(b.package))).toEqual(
      [...entries].sort((a, b) => a.package.localeCompare(b.package)),
    );
  });

  test("the command line tool accepts and consumes a written entry", async () => {
    // The strongest oracle the ticket names: the real `changeset version`, run
    // from the dev tree's own install over a copy of the fixture, bumps the
    // manifest and consumes the file. A file the CLI rejected would fail here.
    const dir = fixtureRepository();
    await writeChangesets(
      {
        effort: "configurable-git-workflow",
        entries: [{ package: "@scope/fixture-pkg", level: "minor", summary: "Add the release skill." }],
      },
      dir,
    );
    const copy = tempDir("changesets-cli");
    cpSync(dir, copy, { recursive: true });
    const cli = join(dirname(require.resolve("@changesets/cli/package.json")), "bin.js");

    const output = execFileSync(process.execPath, [cli, "version"], { cwd: copy, encoding: "utf-8" });

    expect(output).toContain("All files have been updated");
    expect(JSON.parse(readFileSync(join(copy, "package.json"), "utf-8")).version).toBe("1.1.0");
    expect(readdirSync(join(copy, ".changeset")).filter((file) => file.endsWith(".md"))).toEqual([]);
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

  test("refuses a config file that is not JSON at all", async () => {
    const dir = fixtureRepository({ config: null });
    mkdirSync(join(dir, ".changeset"), { recursive: true });
    writeFileSync(join(dir, ".changeset", "config.json"), "{ not json\n", "utf-8");

    const { details } = await writeChangesets(
      {
        effort: "configurable-git-workflow",
        entries: [{ package: "@scope/fixture-pkg", level: "patch", summary: "A change." }],
      },
      dir,
    );

    expect(details.refusal.code).toBe("invalid-config");
    expect(details.refusal.reason).toContain("not readable JSON");
    expect(changesetFiles(dir)).toEqual([]);
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

  test("writes at the workspace root even when the session sits in a member package", async () => {
    const dir = fixtureWorkspace();

    const { details } = await writeChangesets(
      {
        effort: "configurable-git-workflow",
        entries: [{ package: "@scope/beta", level: "patch", summary: "Fix the beta reader." }],
      },
      join(dir, "packages", "beta"),
    );

    // A changeset belongs to the repository's workspace root, which is where
    // the command line tool reads and writes it too.
    expect(changesetFiles(dir)).toHaveLength(1);
    expect(details.written).toEqual([join(dir, ".changeset", changesetFiles(dir)[0])]);
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
