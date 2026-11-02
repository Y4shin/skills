/**
 * Executor-seam coverage for the `tw_migrate` tool: the migration driven
 * through the public tool factory (`createTools()` in src/pi.ts) over fixture
 * trees on disk, replacing the spawn-based shim tests
 * (tests/setup-workflow-scripts.test.ts) as the executor coverage.
 *
 * The expected report texts are the frozen CLI rendering (the parity
 * decision): the same characters the migration CLI printed, pinned as
 * literals so the tool and the wrapper cannot drift apart.
 */

import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test } from "vitest";

import { createTools } from "../src/pi.js";

interface ToolResult {
  text: string;
  details: Record<string, unknown>;
}

/** The frozen report of a real migration run over the plain v3 fixture. */
const REPORT_MIGRATED = [
  "migrated from schema_version 3 to 5",
  "",
  "5 change(s):",
  "  move docs/tasks/effort/tickets/effort-task/ticket.md: moved 'docs/tasks/effort-task/task.md' to " +
    "'docs/tasks/effort/tickets/effort-task/ticket.md' and applied the schema-5 reshape",
  "  move docs/tasks/effort/map.md: moved 'docs/tasks/maps/effort/map.md' to 'docs/tasks/effort/map.md' " +
    "and applied the schema-5 reshape",
  "  rewrite docs/tasks/state.yaml: rebuilt state.yaml at schema_version 5 (from vintage 3)",
  "  add docs/tasks/index.md: wrote 'docs/tasks/index.md' with okf_version \"0.2\" and the tree listing",
  "  add docs/tasks/CHANGELOG.md: created 'docs/tasks/CHANGELOG.md' with conformant frontmatter",
].join("\n");

/** The frozen report of a dry run over the same fixture. */
const REPORT_DRY_RUN = REPORT_MIGRATED.replace(
  "migrated from schema_version 3 to 5",
  "dry run: would migrate from schema_version 3 to 5",
);

/** The frozen no-op answer for an already-current tree. */
const REPORT_NOOP = "already on schema_version 5, nothing to do.";

/** The frozen report over the needs-human fixture (the plain fixture plus a legacy slice directory). */
const REPORT_NEEDS_HUMAN = [
  REPORT_MIGRATED,
  "",
  "1 item(s) needing human eyes:",
  "  slice-dir docs/tasks/login/slices: legacy slice directory 'docs/tasks/login/slices' is reported and " +
    "left in place (v4 dropped slice support)",
].join("\n");

function writeMd(path: string, frontmatter: string, body = ""): void {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, `---\n${frontmatter}---\n${body}`);
}

/** A small v3 fixture tree on disk (the shim tests' fixture). */
function makeV3Tree(): string {
  const dir = mkdtempSync(join(tmpdir(), "tw-migrate-tool-"));
  mkdirSync(join(dir, "docs/tasks/maps/effort"), { recursive: true });
  writeFileSync(join(dir, "docs/tasks/state.yaml"), "slice: null\nschema_version: 3\nmap: effort\ntask: null\n");
  writeMd(
    join(dir, "docs/tasks/maps/effort/map.md"),
    "kind: map\nslug: effort\ntitle: Effort\nstatus: active\ntasks: []\n",
  );
  mkdirSync(join(dir, "docs/tasks/effort-task"), { recursive: true });
  writeMd(
    join(dir, "docs/tasks/effort-task/task.md"),
    "kind: task\ntype: feature\nslug: effort-task\ntitle: T\nmap: effort\nstatus: ready\nblocked_by: []\n",
  );
  return dir;
}

/** The v3 fixture plus one legacy slice directory: the needs-human fixture. */
function makeV3TreeWithSlices(): string {
  const dir = makeV3Tree();
  writeMd(
    join(dir, "docs/tasks/login/slices/1-do-thing.md"),
    "kind: slice\ntitle: Do thing\nslug: do-thing\ntask: ../task.md\nmode: hitl\nstatus: todo\nsize: m\nblocked_by: []\n",
  );
  return dir;
}

/** Every file under `dir`, as sorted [repo-relative path, bytes] pairs. */
function snapshot(dir: string): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  const walk = (d: string): void => {
    for (const name of readdirSync(d).sort()) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else out.push([p.slice(dir.length + 1), readFileSync(p, "utf-8")]);
    }
  };
  walk(dir);
  return out;
}

const dirs: string[] = [];
afterEach(() => {
  while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
});

function tracked(make: () => string): string {
  const dir = make();
  dirs.push(dir);
  return dir;
}

describe("tw_migrate through the public tool factory", () => {
  test("with the dry-run flag set, returns the plan and the tree stays byte-identical", async () => {
    const dir = tracked(makeV3Tree);
    const before = snapshot(dir);
    const tools = createTools();
    const result = (await tools.tw_migrate.execute({ dryRun: true }, { directory: dir })) as ToolResult;

    expect(result.text).toBe(REPORT_DRY_RUN);
    expect(snapshot(dir)).toEqual(before);
  });

  test("a needs-human fixture yields a report that separates the items from the changes", async () => {
    const dir = tracked(makeV3TreeWithSlices);
    const slicePath = join(dir, "docs/tasks/login/slices/1-do-thing.md");
    const sliceBefore = readFileSync(slicePath, "utf-8");
    const tools = createTools();
    const result = (await tools.tw_migrate.execute({}, { directory: dir })) as ToolResult;

    expect(result.text).toBe(REPORT_NEEDS_HUMAN);
    // The two sections are distinct: the change lines under "change(s)", the
    // slice directory under "needing human eyes".
    const changes = result.text.slice(0, result.text.indexOf(" item(s) needing human eyes"));
    expect(changes).toContain("5 change(s):");
    expect(changes).toContain("move docs/tasks/effort/tickets/effort-task/ticket.md");
    expect(changes).not.toContain("slice-dir");
    const human = result.text.slice(result.text.indexOf(" item(s) needing human eyes"));
    expect(human).toContain("slice-dir docs/tasks/login/slices");
    // The reported slice file is left in place, byte for byte.
    expect(readFileSync(slicePath, "utf-8")).toBe(sliceBefore);
  });

  test("an already-current tree returns the no-op answer and nothing is written", async () => {
    const dir = tracked(makeV3Tree);
    const tools = createTools();
    // First run migrates; the tree is then already current.
    await tools.tw_migrate.execute({}, { directory: dir });
    const before = snapshot(dir);

    const result = (await tools.tw_migrate.execute({}, { directory: dir })) as ToolResult;
    expect(result.text).toBe(REPORT_NOOP);
    expect(result.details.noop).toBe(true);
    expect(snapshot(dir)).toEqual(before);
  });

  test("migrates an old-vintage tree and returns the frozen report", async () => {
    const dir = tracked(makeV3Tree);
    const tools = createTools();
    const result = (await tools.tw_migrate.execute({}, { directory: dir })) as ToolResult;

    // The report is the CLI's rendering, character for character.
    expect(result.text).toBe(REPORT_MIGRATED);
    // The tree state: the migration really ran through the production port.
    expect(existsSync(join(dir, "docs/tasks/index.md"))).toBe(true);
    expect(existsSync(join(dir, "docs/tasks/effort/tickets/effort-task/ticket.md"))).toBe(true);
    expect(existsSync(join(dir, "docs/tasks/effort-task/task.md"))).toBe(false);
    expect(readFileSync(join(dir, "docs/tasks/state.yaml"), "utf-8")).toMatch(/^schema_version: 5/m);
  });
});
