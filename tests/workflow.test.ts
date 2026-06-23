/** Tests for core/workflow — version dotfile, gate, init/migrate instructions. */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

import * as workflow from "../src/core/workflow";
import { mkTmp, prdDir } from "./util";

describe("workflow", () => {
  test("read_version absent is zero", () => {
    const t = mkTmp();
    expect(workflow.readVersion(t)).toBe(0);
    expect(workflow.hasVersionFile(t)).toBe(false);
  });

  test("write then read roundtrip", () => {
    const t = mkTmp();
    prdDir(t);
    workflow.writeVersion(t, 1);
    expect(workflow.hasVersionFile(t)).toBe(true);
    expect(workflow.readVersion(t)).toBe(1);
    expect(readFileSync(workflow.versionFile(t), "utf-8")).toBe("1\n");
  });

  test("read_version garbage is zero", () => {
    const t = mkTmp();
    prdDir(t);
    writeFileSync(workflow.versionFile(t), "not-a-number\n");
    expect(workflow.readVersion(t)).toBe(0);
  });

  test("gate empty when current", () => {
    const t = mkTmp();
    prdDir(t);
    workflow.writeVersion(t, workflow.CURRENT_VERSION);
    expect(workflow.gate(t)).toBe("");
  });

  test("gate refuses when uninitialized", () => {
    const out = workflow.gate(mkTmp());
    expect(out).toContain("STOP");
    expect(out).toContain("init-prd-workflow");
  });

  test("gate refuses when stale", () => {
    const t = mkTmp();
    prdDir(t);
    workflow.writeVersion(t, workflow.CURRENT_VERSION - 1);
    const out = workflow.gate(t);
    expect(out).toContain("STOP");
    expect(out).toContain("update-prd-workflow");
  });

  test("gate refuses when ahead", () => {
    const t = mkTmp();
    prdDir(t);
    workflow.writeVersion(t, workflow.CURRENT_VERSION + 1);
    const out = workflow.gate(t);
    expect(out).toContain("STOP");
    expect(out).toContain("out of date");
  });

  test("init fresh stamps current", () => {
    const t = mkTmp();
    prdDir(t);
    const out = workflow.initInstructions(t);
    expect(out).toContain(`workflow-version set ${workflow.CURRENT_VERSION}`);
    expect(out).not.toContain("update-prd-workflow");
  });

  test("init stamps current even with existing artifacts", () => {
    const t = mkTmp();
    const prd = prdDir(t);
    mkdirSync(join(prd, "foo"));
    writeFileSync(join(prd, "foo", "prd.md"), "---\nkind: feature\n---\n");
    const out = workflow.initInstructions(t);
    expect(out).toContain(`workflow-version set ${workflow.CURRENT_VERSION}`);
    expect(out).not.toContain("update-prd-workflow");
  });

  test("init existing file points to update", () => {
    const t = mkTmp();
    prdDir(t);
    workflow.writeVersion(t, workflow.CURRENT_VERSION - 1);
    expect(workflow.initInstructions(t)).toContain("update-prd-workflow");
  });

  test("init noop when current", () => {
    const t = mkTmp();
    prdDir(t);
    workflow.writeVersion(t, workflow.CURRENT_VERSION);
    expect(workflow.initInstructions(t).toLowerCase()).toContain("no-op");
  });

  test("migrate noop at current", () => {
    const t = mkTmp();
    prdDir(t);
    workflow.writeVersion(t, workflow.CURRENT_VERSION);
    expect(workflow.migrateInstructions(t, "fgj").toLowerCase()).toContain("no-op");
  });

  test("migrate without file assumes v0", () => {
    const t = mkTmp();
    const out = workflow.migrateInstructions(t, "fgj");
    expect(out).toContain("v0 → v1");
    expect(out).not.toContain("init-prd-workflow");
    expect(out).toContain(`workflow-version set ${workflow.CURRENT_VERSION}`);
  });

  test("migrate v0->v1 fgj converts epics to milestones", () => {
    const t = mkTmp();
    prdDir(t);
    workflow.writeVersion(t, 0);
    const out = workflow.migrateInstructions(t, "fgj");
    expect(out.toLowerCase()).toContain("milestone");
    expect(out).toContain("forgejo set-milestone");
    expect(out).toContain("epic_milestone");
    expect(out).toContain(`workflow-version set ${workflow.CURRENT_VERSION}`);
  });

  test("migrate v0->v1 local uses tracker commands", () => {
    const t = mkTmp();
    prdDir(t);
    workflow.writeVersion(t, 0);
    const out = workflow.migrateInstructions(t, "local");
    expect(out).toContain("tracker milestone create");
    expect(out).toContain("tracker set-milestone");
    expect(out).toContain(`workflow-version set ${workflow.CURRENT_VERSION}`);
  });

  test("migrate v1->v2 precreates prd issues", () => {
    const t = mkTmp();
    prdDir(t);
    workflow.writeVersion(t, 1);
    const out = workflow.migrateInstructions(t, "fgj");
    expect(out).toContain("v1 → v2");
    expect(out).toContain("set-prd-issue");
    expect(out.toLowerCase()).toContain("placeholder");
    expect(out).toContain(`workflow-version set ${workflow.CURRENT_VERSION}`);
  });

  test("migrate from v0 walks both steps", () => {
    const t = mkTmp();
    prdDir(t);
    workflow.writeVersion(t, 0);
    const out = workflow.migrateInstructions(t, "fgj");
    expect(out).toContain("v0 → v1");
    expect(out).toContain("v1 → v2");
  });
});
