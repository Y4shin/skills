/**
 * Tests for the migration CLI seam (scripts/migrate.mjs spawned via
 * spawnSync, the skill-creator-scripts pattern). Asserts exit code and the
 * stdout report against a real fixture directory on disk.
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "vitest";

const PROJECT = process.cwd();
const SHIM = join(PROJECT, "skills", "engineering", "setup-workflow", "scripts", "migrate.mjs");

function runShim(args: string[], cwd: string) {
  return spawnSync("node", [SHIM, ...args], {
    cwd,
    encoding: "utf-8",
    timeout: 30000,
  });
}

function writeMd(path: string, frontmatter: string, body = ""): void {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, `---\n${frontmatter}---\n${body}`);
}

/** A small v3 fixture tree on disk. */
function makeV3Tree(): string {
  const dir = mkdtempSync(join(tmpdir(), "migrate-cli-"));
  mkdirSync(join(dir, "docs/tasks/maps/effort"), { recursive: true });
  writeFileSync(
    join(dir, "docs/tasks/state.yaml"),
    "slice: null\nschema_version: 3\nmap: effort\ntask: null\n",
  );
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

describe("scripts/migrate.mjs", () => {
  test("--dry-run writes nothing and prints the plan", () => {
    const dir = makeV3Tree();
    try {
      const before = readFileSync(join(dir, "docs/tasks/state.yaml"), "utf-8");
      const result = runShim(["--dry-run"], dir);
      expect(result.status).toBe(0);
      expect(result.stdout).toMatch(/dry run|plan|would/i);
      expect(readFileSync(join(dir, "docs/tasks/state.yaml"), "utf-8")).toBe(before);
      expect(existsSync(join(dir, "docs/tasks/index.md"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a real run exits 0 and prints the report", () => {
    const dir = makeV3Tree();
    try {
      const result = runShim([], dir);
      expect(result.status).toBe(0);
      expect(result.stdout).toMatch(/schema_version 4|migrated/i);
      expect(existsSync(join(dir, "docs/tasks/index.md"))).toBe(true);
      expect(existsSync(join(dir, "docs/tasks/effort/tickets/effort-task/ticket.md"))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a re-run reports the no-op", () => {
    const dir = makeV3Tree();
    try {
      expect(runShim([], dir).status).toBe(0);
      const second = runShim([], dir);
      expect(second.status).toBe(0);
      expect(second.stdout).toMatch(/already|no-op|nothing to do/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a failure exits non-zero with the reason", () => {
    const dir = mkdtempSync(join(tmpdir(), "migrate-cli-"));
    try {
      // A state.yaml that is not a mapping: the CLI must fail loudly.
      mkdirSync(join(dir, "docs/tasks"), { recursive: true });
      writeFileSync(join(dir, "docs/tasks/state.yaml"), "- just\n- a\n- list\n");
      const result = runShim([], dir);
      expect(result.status).not.toBe(0);
      expect(result.stderr.length).toBeGreaterThan(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
