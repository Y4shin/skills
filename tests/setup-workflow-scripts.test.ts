/**
 * Tests for the setup-workflow scripts surface: the schema-5 migration
 * target (docs/migration-target.yaml) the workflow migrates toward. The
 * migration executor coverage lives in tests/tw-migrate-tool.test.ts, which
 * drives the tool through the public tool factory over fixture trees.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { parse as parseYaml } from "yaml";

const PROJECT = process.cwd();

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
