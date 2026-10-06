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
import { parse as parseYaml } from "yaml";

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

describe("docs/migration-target.yaml", () => {
  const targetPath = join(PROJECT, "docs", "migration-target.yaml");
  const text = readFileSync(targetPath, "utf-8");
  const data = parseYaml(text) as Record<string, unknown>;

  test("stamps the schema-5 target and no longer claims schema 3", () => {
    expect(data.schema_version).toBe(5);
    expect(text).not.toMatch(/schema_version: 3/);
  });

  test("names the schema-5 artifact types, including architecture and review", () => {
    const model = data.artifact_model as { types: string[] };
    expect(model.types).toContain("architecture");
    expect(model.types).toContain("review");
  });

  test("names the schema-5 map frontmatter fields", () => {
    const model = data.artifact_model as { map_frontmatter: string[] };
    expect(model.map_frontmatter).toContain("ready_for_spec");
    expect(model.map_frontmatter).toContain("origin_effort");
  });

  test("names the schema-5 map body sections", () => {
    const model = data.artifact_model as { map_body_sections: string[] };
    expect(model.map_body_sections).toContain("## Non-goals");
    expect(model.map_body_sections).toContain("## Non-negotiable facts");
  });

  test("the phase chain is the v5 one, with no retired phase in the target", () => {
    const flow = data.planning_flow as { phases: Array<{ step: string }> };
    const steps = flow.phases.map((p) => p.step);
    for (const phase of ["intake", "wayfinder", "to-spec", "to-tickets", "implement-ticket", "finalize-effort"]) {
      expect(steps).toContain(phase);
    }
    for (const retired of ["implement-task", "finalize-task", "triage"]) {
      expect(steps).not.toContain(retired);
    }
  });
});

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
