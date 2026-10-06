/**
 * Structural & grep tests for the text-based grilling skill and the
 * Wayfinder grilling resource. (The browser-visualized grilling-with-ui variant
 * and its CLI were dropped in the adopt-mp-skills-way map, grilling #1 Q15;
 * the seams that asserted them are removed.)
 *
 *  - skills/engineering/grilling/SKILL.md is the text-based skill (plain-text
 *    rounds, not ask_user_question), and skills/engineering/wayfinder/
 *    resources/grilling.md creates the task document and delegates every
 *    session to that skill (wayfinder-reconcile-and-passes; the interview
 *    method has one home).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const PROJECT = process.cwd();

function readFile(relativePath: string): string {
  return readFileSync(join(PROJECT, relativePath), "utf-8");
}

// ─── Seam 2c: text-based grilling skill uses plain-text rounds ────────

describe("seam 2c - text-based grilling skill uses plain-text rounds, not the CLI", () => {
  const content = readFile("skills/engineering/grilling/SKILL.md");

  test("drives rounds through plain text (Q1/Q2 format)", () => {
    expect(content).toMatch(/Q1|round/i);
  });

  test("does not reference ask_user_question", () => {
    expect(content).not.toMatch(/ask_user_question/);
  });

  test("does not reference the grilling CLI / visualizer", () => {
    expect(content).not.toMatch(/grilling-cli\.mjs/);
    expect(content).not.toMatch(/--state/);
    expect(content).not.toMatch(/visualizer/i);
  });
});

// ─── Seam 2d: wayfinder grilling.md drives the text path ─────────

describe("seam 2d - wayfinder grilling.md delegates the method to the grilling skill", () => {
  const content = readFile("skills/engineering/wayfinder/resources/grilling.md");

  test("delegates every session to the grilling skill", () => {
    expect(content).toMatch(/`grilling` skill/);
  });

  test("does not restate how questions are asked", () => {
    expect(content).not.toMatch(/one question at a time/i);
    expect(content).not.toMatch(/answer on[\s\S]*behalf/i);
    expect(content).not.toMatch(/\bQ1\b/);
  });

  test("does not mention the CLI / visualizer", () => {
    expect(content).not.toMatch(/CLI|visualizer|grilling-cli/i);
  });

  test("still requires the task body to state the decision", () => {
    expect(content).toMatch(/decision/i);
  });

  test("still references parent decisions", () => {
    expect(content).toMatch(/parent decision/i);
  });

  test("still references known choices", () => {
    expect(content).toMatch(/choices|known choice/i);
  });

  test("still references recommended starting answer", () => {
    expect(content).toMatch(/recommended.*answer|starting answer/i);
  });

  test("still references downstream work", () => {
    expect(content).toMatch(/downstream work/i);
  });
});
