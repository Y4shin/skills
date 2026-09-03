/**
 * Structural & grep tests for the grilling-with-ui skill prose, the reverted
 * text-based grilling skill, the Wayfinder text resource, and the Pi
 * path-protection backstop.
 *
 * After splitting the visualizer out of /grilling:
 *  - skills/engineering/grilling/SKILL.md is the text-based skill (ask_user_question),
 *    and skills/engineering/wayfinder/resources/grilling.md drives that text path.
 *  - skills/engineering/grilling-with-ui/SKILL.md is the browser-visualized variant that
 *    drives the grilling CLI (skills/engineering/grilling-with-ui/grilling-cli.mjs).
 *
 * These tests observe three seams:
 *  1. Grep: grilling-with-ui SKILL.md contains NO .grilling.json, tmpdir, or
 *     temp-dir path references (the hiding contract).
 *  2. Structural: grilling-with-ui SKILL.md describes the full round loop using
 *     the CLI surface (start, update, refresh, wait, get, finalize).
 *  3. src/pi.ts registers the grilling temp dir as a protected path.
 *
 * The tests are intentionally at the prose/structural level — they verify
 * behavior (what the skill tells the agent to do) through the public file
 * surface, not through implementation details.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const PROJECT = process.cwd();

function readFile(relativePath: string): string {
  const p = join(PROJECT, relativePath);
  if (!existsSync(p)) throw new Error(`File not found: ${relativePath}`);
  return readFileSync(p, "utf-8");
}

// ─── Seam 1: hiding contract (grep test) ──────────────────────────────

describe("seam 1 — hiding contract: no .grilling.json or temp-dir refs", () => {
  const files = [
    "skills/engineering/grilling-with-ui/SKILL.md",
  ];

  describe.each(files)("%s", (file) => {
    const content = readFile(file);

    test("does not mention .grilling.json", () => {
      expect(content).not.toMatch(/\.grilling\.json/);
    });

    test("does not mention tmpdir", () => {
      expect(content).not.toMatch(/tmpdir/i);
    });

    test("does not mention /tmp/ temp-dir path pattern", () => {
      expect(content).not.toMatch(/\/tmp\/grilling-/);
    });

    test("does not mention os.tmpdir()", () => {
      expect(content).not.toMatch(/os\.tmpdir/i);
    });

    test("does not mention state.json", () => {
      expect(content).not.toMatch(/state\.json/);
    });

    test("does not mention grilling.pid", () => {
      expect(content).not.toMatch(/grilling\.pid/);
    });
  });
});

// ─── Seam 2: structural — full round loop via CLI surface ─────────────

describe("seam 2 — grilling-with-ui SKILL.md describes the full round loop via CLI", () => {
  const content = readFile("skills/engineering/grilling-with-ui/SKILL.md");

  test("mentions start (launch the session)", () => {
    expect(content).toMatch(/\bstart\b/);
  });

  test("mentions update (mutate state)", () => {
    expect(content).toMatch(/\bupdate\b/);
  });

  test("mentions refresh (signal re-render)", () => {
    expect(content).toMatch(/\brefresh\b/);
  });

  test("mentions wait (block on user)", () => {
    expect(content).toMatch(/\bwait\b/);
  });

  test("mentions get (read answers)", () => {
    expect(content).toMatch(/\bget\b/);
  });

  test("mentions finalize (emit markdown + stop server)", () => {
    expect(content).toMatch(/\bfinalize\b/);
  });

  test("mentions the --state <key> handle", () => {
    expect(content).toMatch(/--state/);
  });

  test("describes the round loop: update → set-state → refresh → wait → get → recompute", () => {
    // The skill should describe the round loop sequence using CLI calls.
    // We check for the key verbs in the loop.
    expect(content).toMatch(/set-state/i);
    expect(content).toMatch(/round-done/i);
    expect(content).toMatch(/in-round/i);
  });

  test("describes the completion gate: final-review → wait accepted/rejected", () => {
    expect(content).toMatch(/final-review/i);
    expect(content).toMatch(/accepted/i);
    expect(content).toMatch(/rejected/i);
  });

  test("describes the rejected → in-round resume path", () => {
    // On rejected, the agent resumes in-round to address the gap.
    expect(content).toMatch(/rejected.*in-round|in-round.*rejected/i);
  });

  test("mentions add-question as an update subcommand", () => {
    expect(content).toMatch(/add-question/i);
  });

  test("mentions set-summary as an update subcommand", () => {
    expect(content).toMatch(/set-summary/i);
  });
});

// ─── Seam 2b: core semantics preserved ────────────────────────────────

describe("seam 2b — core grilling semantics preserved in grilling-with-ui SKILL.md", () => {
  const content = readFile("skills/engineering/grilling-with-ui/SKILL.md");

  test("preserves design tree concept", () => {
    expect(content).toMatch(/design tree/i);
  });

  test("preserves frontier concept", () => {
    expect(content).toMatch(/frontier/i);
  });

  test("preserves rounds concept", () => {
    expect(content).toMatch(/round/i);
  });

  test("preserves facts are the agent's job", () => {
    expect(content).toMatch(/fact(s| finding).*job|finding facts/i);
  });

  test("preserves completion gate / shared understanding", () => {
    expect(content).toMatch(/shared understanding/i);
  });

  test("preserves recommended answer", () => {
    expect(content).toMatch(/recommended answer/i);
  });

  test("preserves Wayfinder reference", () => {
    expect(content).toMatch(/Wayfinder/i);
  });

  test("preserves settled decisions recording", () => {
    expect(content).toMatch(/settled decision|settled decisions/i);
  });

  test("preserves downstream consequences", () => {
    expect(content).toMatch(/downstream consequences|consequences/i);
  });

  test("preserves frontier-is-empty completion condition", () => {
    expect(content).toMatch(/frontier is empty|nothing left silently assumed/i);
  });

  test("preserves the canonical grilling URL reference", () => {
    expect(content).toContain("https://raw.githubusercontent.com/mattpocock/skills/refs/heads/main/skills/productivity/grilling/SKILL.md");
  });

  test("preserves model-invoked / Pi-native description", () => {
    expect(content).toMatch(/model-invoked|Pi-native/i);
  });
});

// ─── Seam 2c: text-based grilling skill does not drive the CLI ────────

describe("seam 2c — text-based grilling skill uses ask_user_question, not the CLI", () => {
  const content = readFile("skills/engineering/grilling/SKILL.md");

  test("drives rounds through ask_user_question", () => {
    expect(content).toMatch(/ask_user_question/);
  });

  test("does not reference the grilling CLI / visualizer", () => {
    expect(content).not.toMatch(/grilling-cli\.mjs/);
    expect(content).not.toMatch(/--state/);
    expect(content).not.toMatch(/visualizer/i);
  });
});

// ─── Seam 2d: wayfinder grilling.md reverted to the text path ─────────

describe("seam 2d — wayfinder grilling.md drives the text path, not the CLI", () => {
  const content = readFile("skills/engineering/wayfinder/resources/grilling.md");

  test("asks one question at a time and does not answer for the user", () => {
    expect(content).toMatch(/one question at a time/i);
    expect(content).toMatch(/must not answer on[\s\S]*the user's behalf/i);
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

// ─── Seam 3: Pi path protection ────────────────────────────────────────

describe("seam 3 — src/pi.ts registers grilling temp dir as protected path", () => {
  const content = readFile("src/pi.ts");

  test("registers a tool_call handler for path protection", () => {
    // The extension must listen on "tool_call" to block writes/edits to
    // protected paths (same mechanism as the protected-paths example).
    expect(content).toMatch(/on\(\s*["']tool_call["']/);
  });

  test("protects the grilling temp dir pattern", () => {
    // The handler must check for the grilling temp dir pattern.
    // The CLI creates dirs under os.tmpdir() with the prefix "grilling-".
    expect(content).toMatch(/grilling-/);
  });

  test("blocks write and edit tools to protected paths", () => {
    // The handler must check for "write" and "edit" tool names.
    expect(content).toMatch(/["']write["']/);
    expect(content).toMatch(/["']edit["']/);
  });

  test("returns a block result when path matches", () => {
    // The handler must return { block: true, reason: ... } on match.
    expect(content).toMatch(/block:\s*true/);
  });
});
