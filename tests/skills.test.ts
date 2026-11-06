/**
 * Structure tests for SKILL.md files, agent frontmatter, and package manifest.
 * Verifies that all files have the expected structure and references.
 */

import { readFileSync, existsSync, readdirSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "vitest";
import { parse as parseYaml } from "yaml";
import { repoRel } from "./lib/repo-paths.js";
import { parse } from "../src/core/frontmatter.js";
import { findAnomalies, fromFrontmatter, validateArtifact, type Artifact } from "../src/core/art.js";
import { createTools } from "../src/pi.js";
import { GATED_SKILL_NAMES, SKILL_REGISTRY } from "../src/disclosure.js";

const PROJECT = process.cwd();

function readFile(relativePath: string): string {
  const p = join(PROJECT, relativePath);
  if (!existsSync(p)) throw new Error(`File not found: ${relativePath}`);
  return readFileSync(p, "utf-8");
}

function parseFrontmatter(content: string): Record<string, any> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm: Record<string, any> = {};
  for (const line of match[1].split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;
    const key = trimmed.slice(0, colonIdx).trim();
    const value = trimmed.slice(colonIdx + 1).trim();
    fm[key] = value;
  }
  return fm;
}

// ─── Agent frontmatter tests ─────────────────────────────────────────

const AGENT_FILES = [
  "agents/tdd-worker.md",
  "agents/slice-verifier.md",
  "agents/land-worker.md",
  "agents/deviation-reporter.md",
  "agents/code-reviewer.md",
  "agents/architecture-scout.md",
  "agents/skill-reviewer.md",
  "agents/implement-preconditions.md",
  "agents/coherence-refactorer.md",
  "agents/test-runner.md",
  "agents/spec-reconciler.md",
];

describe("agent frontmatter", () => {
  for (const file of AGENT_FILES) {
    const agentName = file.replace("agents/", "").replace(".md", "");
    describe(agentName, () => {
      const content = readFile(file);
      const fm = parseFrontmatter(content);

      test("has frontmatter", () => {
        expect(fm["name"]).toBe(agentName);
      });

      test("has inheritProjectContext: true", () => {
        expect(fm["inheritProjectContext"]).toBe("true");
      });

      test("has defaultContext", () => {
        expect(fm["defaultContext"]).toBeDefined();
      });

      test("has tools defined", () => {
        expect(fm["tools"]).toBeDefined();
      });

      test("has description", () => {
        expect(fm["description"]).toBeDefined();
        expect(fm["description"].length).toBeGreaterThan(10);
      });

      test("allows only tw_feedback among the gated tw_* tools", () => {
        // Policy, not a platform limit. Feedback is telemetry: it never writes
        // docs/tasks/**, so a child that cannot reach the wrapper loses a note,
        // not a write. Every shipped chain is dispatched with `async: true`, so
        // its children are background children, which load ambient extensions;
        // that is what makes a gated wrapper reachable in a child at all. A
        // writer of the tree stays out of every allowlist: those writes belong
        // to the phase that owns the writer, so an agent's capability never
        // depends on which packages a child happens to load.
        const gated = (String(fm["tools"] ?? "").match(/\btw_[a-z_]+/g) ?? []).filter(
          (tool: string) => tool !== "tw_feedback",
        );
        expect(gated, `${file} claims a gated tool CI cannot give it`).toEqual([]);
        // A nested call reaches only an active tool, and a child's allowlist is
        // its whole active set: the store has to be named beside the wrapper.
        if (gated.length === 0 && String(fm["tools"] ?? "").includes("tw_feedback")) {
          expect(String(fm["tools"]), `${file} can call the wrapper but not the store`).toContain("submit_feedback");
        }
      });

      test("frontmatter is valid YAML for the real parser", () => {
        expect(() => parse(content)).not.toThrow();
      });
    });
  }
});

// ─── Skill SKILL.md structure tests ──────────────────────────────────

const SKILL_FILES = [
  "skills/engineering/task-workflow-overview/SKILL.md",
  "skills/engineering/setup-workflow/SKILL.md",
  "skills/engineering/wayfinder/SKILL.md",
  "skills/engineering/implement-ticket/SKILL.md",
  "skills/engineering/finalize-effort/SKILL.md",
  "skills/engineering/tdd/SKILL.md",
  "skills/engineering/code-review/SKILL.md",
  "skills/engineering/task-workflow-doctor/SKILL.md",
  "skills/engineering/workflow-failure/SKILL.md",
  "skills/engineering/diagnosing-bugs/SKILL.md",
  "skills/engineering/codebase-design/SKILL.md",
  "skills/engineering/grilling/SKILL.md",
  "skills/engineering/domain-modeling/SKILL.md",
  "skills/engineering/improve-codebase-architecture/SKILL.md",
  "skills/productivity/wait-what/SKILL.md",
  "skills/engineering/skill-creator/SKILL.md",
  "skills/engineering/prototype/SKILL.md",
  "skills/engineering/research/SKILL.md",
  "skills/engineering/resolving-merge-conflicts/SKILL.md",
  "skills/engineering/wizard/SKILL.md",
  "skills/engineering/intake/SKILL.md",
  "skills/productivity/handoff/SKILL.md",
  "skills/productivity/to-questionnaire/SKILL.md",
  "skills/productivity/teach/SKILL.md",
  "skills/productivity/writing-for-agents/SKILL.md",
  "skills/productivity/grill-me/SKILL.md",
  "skills/engineering/to-spec/SKILL.md",
  "skills/engineering/to-tickets/SKILL.md",
  "skills/engineering/skill-review/SKILL.md",
  "skills/engineering/eval-review/SKILL.md",
];

describe("skill files", () => {
  for (const file of SKILL_FILES) {
    const skillName = file.split("/")[1];
    describe(skillName, () => {
      const content = readFile(file);
      const fm = parseFrontmatter(content);

      test("has name in frontmatter", () => {
        expect(fm["name"]).toBeDefined();
      });

      test("has description", () => {
        expect(fm["description"]).toBeDefined();
        expect(fm["description"].length).toBeGreaterThan(5);
      });

      test("no chain JSON references", () => {
        expect(content).not.toMatch(/\.chain\.json/);
      });

      test("no supervisor/intercom patterns", () => {
        expect(content).not.toContain("subagent_supervisor");
        expect(content).not.toContain("contact_supervisor");
      });

      test("frontmatter is valid YAML for the real parser", () => {
        expect(() => parse(content)).not.toThrow();
      });
    });
  }
});

// ─── Package manifest tests ──────────────────────────────────────────

describe("package.json", () => {
  const pkg = JSON.parse(readFile("package.json"));

  test("has pi block with extensions", () => {
    expect(pkg.pi).toBeDefined();
    expect(pkg.pi.extensions).toBeDefined();
    expect(pkg.pi.extensions).toContain("./src/pi.ts");
  });

  test("has skills list", () => {
    expect(Array.isArray(pkg.pi.skills)).toBe(true);
    expect(pkg.pi.skills.length).toBe(31);
    expect(pkg.pi.skills).toContain("./skills/engineering/codebase-design");
    expect(pkg.pi.skills).toContain("./skills/engineering/domain-modeling");
    expect(pkg.pi.skills).toContain("./skills/engineering/improve-codebase-architecture");
    expect(pkg.pi.skills).toContain("./skills/engineering/grilling");
    expect(pkg.pi.skills).toContain("./skills/productivity/wait-what");
    expect(pkg.pi.skills).toContain("./skills/engineering/skill-creator");
    expect(pkg.pi.skills).toContain("./skills/engineering/skill-review");
  });

  test("has subagents config", () => {
    expect(pkg.pi.subagents).toBeDefined();
    expect(pkg.pi.subagents.agents).toContain("./agents");
  });

  test("no chain files directory", () => {
    expect(existsSync(join(PROJECT, "chains"))).toBe(false);
  });

  test("no skills/archive", () => {
    expect(existsSync(join(PROJECT, "skills", "archive"))).toBe(false);
  });

  test("skills are organized into promoted buckets", () => {
    // Bucket layout (adopt-mp-skills-way, grilling #1 Q3):
    // engineering/ + productivity/ are promoted; misc/in-progress/deprecated are not.
    for (const bucket of ["engineering", "productivity", "misc", "in-progress", "deprecated"]) {
      expect(existsSync(join(PROJECT, "skills", bucket))).toBe(true);
    }
    // No skill dirs left at the top level except the buckets.
    const top = readdirSync(join(PROJECT, "skills"));
    for (const entry of top) {
      expect(["engineering", "productivity", "misc", "in-progress", "deprecated"]).toContain(entry);
    }
  });
});

describe("gated skill manifest", () => {
  const pkg = JSON.parse(readFile("package.json"));

  // The settled gated set (the selective-repo-disable effort): the 10
  // workflow skills a work repo disables. This literal is the independent
  // pin: a manifest edit that is not a settled, reviewed change fails here
  // instead of silently changing the strip.
  const SETTLED_GATED_SKILLS = [
    "task-workflow-overview",
    "setup-workflow",
    "intake",
    "wayfinder",
    "to-spec",
    "to-tickets",
    "implement-ticket",
    "finalize-effort",
    "task-workflow-doctor",
    "workflow-failure",
  ];

  test("exports exactly the settled 10 names, in the settled order", () => {
    expect([...GATED_SKILL_NAMES]).toEqual(SETTLED_GATED_SKILLS);
  });

  test("every manifest name is a pi.skills basename", () => {
    const basenames = (pkg.pi.skills as string[]).map((s) => basename(s));
    for (const name of GATED_SKILL_NAMES) {
      expect(basenames, `${name} must be a pi.skills basename`).toContain(name);
    }
  });

  test("every workflow registry skill is gated; skill-creator is the only ungated registry entry", () => {
    // skill-creator is the nested authoring discipline and stays openable in
    // a gated repo; every other registry entry is a workflow phase the gate
    // must disable.
    const ungatedRegistryEntries = SKILL_REGISTRY.filter(
      (e) => !GATED_SKILL_NAMES.includes(e.name),
    ).map((e) => e.name);
    expect(ungatedRegistryEntries).toEqual(["skill-creator"]);
  });
});

describe("wait-what references", () => {
  const content = readFile("skills/productivity/wait-what/SKILL.md");

  test("stays user-invoked: only the human notices that an answer failed", () => {
    expect(content).toMatch(/^disable-model-invocation: true$/m);
  });

  test("records every invocation under one fixed feedback kind", () => {
    // The count of "the operator had to intervene" is a feedback row, not a
    // reading of the prose. A drifting kind silently breaks the series.
    expect(content).toContain("submit_feedback");
    expect(content).toContain('kind: "wait-what"');
    expect(content).toMatch(/always that literal string/i);
  });

  test("delegates the rewrite to operator-communication instead of restating it", () => {
    expect(content).toContain("`operator-communication` skill");
  });
});

describe("grilling skill references", () => {
  const content = readFile("skills/engineering/grilling/SKILL.md");

  test("is registered as the reusable Pi grilling skill", () => {
    const pkg = JSON.parse(readFile("package.json"));
    expect(pkg.pi.skills).toContain("./skills/engineering/grilling");
    expect(content).toMatch(/^name: grilling/m);
    expect(content).toMatch(/model-invoked|Pi-native/i);
  });

  test("preserves canonical design-tree and round frontier protocol", () => {
    expect(content).toMatch(/design tree/i);
    expect(content).toMatch(/round/i);
    expect(content).toMatch(/frontier/i);
    expect(content).toMatch(/whole frontier|every decision.*prerequisites/i);
    expect(content).toMatch(/prerequisite|depends on/i);
    expect(content).toMatch(/recommended answer/i);
    expect(content).toMatch(/fact(s| finding).*job|finding facts/i);
  });

  test("records decisions and requires shared-understanding completion", () => {
    expect(content).toMatch(/settled decision|settled decisions/i);
    expect(content).toMatch(/downstream consequences|consequences/i);
    expect(content).toMatch(/shared understanding/i);
    expect(content).toMatch(/frontier is empty|nothing left silently assumed/i);
  });

  test("uses plain-text rounds, not the CLI/visualizer", () => {
    // The text-based grilling skill drives rounds through plain text, not
    // Pi's ask_user_question structured interaction. It must NOT reference
    // the grilling CLI/visualizer.
    expect(content).toMatch(/round/i);
    expect(content).not.toMatch(/ask_user_question/);
    expect(content).not.toMatch(/grilling-cli\.mjs/);
    expect(content).not.toMatch(/--state/);
  });
});


describe("domain-modeling skill references", () => {
  const content = readFile("skills/engineering/domain-modeling/SKILL.md");

  test("is registered as a model-invoked Pi skill", () => {
    const pkg = JSON.parse(readFile("package.json"));
    expect(pkg.pi.skills).toContain("./skills/engineering/domain-modeling");
    expect(content).toMatch(/^name: domain-modeling/m);
    expect(content).toMatch(/model-invoked|Pi-native/i);
  });

  test("covers the portable domain modeling vocabulary and output", () => {
    expect(content).toMatch(/concepts?/i);
    expect(content).toMatch(/relationships?/i);
    expect(content).toMatch(/invariants?/i);
    expect(content).toMatch(/ownership/i);
    expect(content).toMatch(/terminology/i);
    expect(content).toMatch(/lifecycle|state transitions?/i);
    expect(content).toMatch(/uncertaint(y|ies)|open questions?/i);
    expect(content).toMatch(/output|deliverable/i);
  });
});

describe("improve-codebase-architecture skill references", () => {
  const content = readFile("skills/engineering/improve-codebase-architecture/SKILL.md");

  test("routes the survey through the scout and wayfinder", () => {
    expect(content).toContain("architecture-scout");
    expect(content).toContain("wayfinder");
    expect(content).toContain("codebase-design");
  });

  test("documents the no-grill mode", () => {
    expect(content).toMatch(/no-grill|don't grill me/i);
  });

  test("has a wayfinder handoff", () => {
    expect(content).toMatch(/hand.*wayfinder|wayfinder.*hand/i);
  });

  test("documents repository context and ADR references", () => {
    expect(content).toContain("CONTEXT.md");
    expect(content).toContain("docs/adr");
  });

  test("documents the complete report and candidate decision flow", () => {
    expect(content).toMatch(/architecture-review-<timestamp>\.html/);
    expect(content).toMatch(/xdg-open|open|start/);
    expect(content).toMatch(/absolute path/i);
    expect(content).toMatch(/Which of these would you like to explore\?/);
    expect(content).toMatch(/candidate.*pick|pick.*candidate/i);
    expect(content).toMatch(/`grilling` skill/);
    expect(content).not.toMatch(/one question at a time/i);
    expect(content).toMatch(/frontier/i);
    expect(content).toMatch(/ADR|docs\/adr/i);
    expect(content).toMatch(/decision.*wayfinder|wayfinder.*decision/i);
  });

  test("is explicitly user-invoked and has an offline report scaffold", () => {
    const fm = parseFrontmatter(content);
    expect(fm["disable-model-invocation"]).toBe("true");
    const report = readFile("skills/engineering/improve-codebase-architecture/HTML-REPORT.md");
    expect(report.trim().length).toBeGreaterThan(0);
    expect(report).toContain("vendor/tailwind.min.js");
    expect(report).toContain("vendor/mermaid.min.js");
    expect(report).not.toMatch(/https?:\/\/cdn\./i);
  });

  test("vendors both report dependencies", () => {
    expect(readFile("skills/engineering/improve-codebase-architecture/vendor/tailwind.min.js").length).toBeGreaterThan(100_000);
    expect(readFile("skills/engineering/improve-codebase-architecture/vendor/mermaid.min.js").length).toBeGreaterThan(1_000_000);
  });
});

describe("codebase-design skill references", () => {
  const content = readFile("skills/engineering/codebase-design/SKILL.md");

  test("documents Pi-native architecture exploration vocabulary", () => {
    expect(content).toMatch(/CodeGraph/i);
    expect(content).toMatch(/boundar(y|ies)/i);
    expect(content).toMatch(/dependenc(y|ies)/i);
    expect(content).toMatch(/reuse/i);
    expect(content).toMatch(/deletion[- ]test/i);
    expect(content).toMatch(/safe extension point/i);
  });

  test("defines expected architecture output", () => {
    expect(content).toMatch(/output|report|deliverable/i);
    expect(content).toMatch(/architecture[- ]scout/i);
    expect(content).toMatch(/architecture survey/i);
  });
});

// ─── Agent file existence tests ──────────────────────────────────────

describe("architecture scout structure", () => {
  test("uses the read-only tool allowlist and fresh context", () => {
    const fm = parseFrontmatter(readFile("agents/architecture-scout.md"));
    // The guidelines tool is gone; the scout reads CONTEXT.md and docs/adr/
    // directly.
    expect(fm.tools).toBe("read, bash");
    expect(fm.defaultContext).toBe("fresh");
    expect(fm.inheritProjectContext).toBe("true");
  });

  test("documents deletion test and architecture heuristics", () => {
    const content = readFile("agents/architecture-scout.md");
    expect(content).toMatch(/deletion test/i);
    expect(content).toMatch(/shallow modules/i);
    expect(content).toMatch(/codebase-design/i);
    expect(content).toMatch(/do not edit|read-only/i);
  });
});

describe("all referenced agents exist", () => {
  const pkg = JSON.parse(readFile("package.json"));

  // Discover all agent names from the agents/ directory
  const agentFiles = AGENT_FILES.map((f) => f.replace("agents/", ""));
  const agentNames = agentFiles.map((f) => f.replace(".md", ""));

  test("each agent file has a corresponding agent name", () => {
    expect(agentNames).toContain("tdd-worker");
    expect(agentNames).toContain("slice-verifier");
    expect(agentNames).toContain("land-worker");
    expect(agentNames).toContain("deviation-reporter");
    expect(agentNames).toContain("architecture-scout");
    expect(agentNames).toContain("implement-preconditions");
    expect(agentNames).toContain("coherence-refactorer");
    expect(agentNames).toContain("test-runner");
    expect(agentNames).toContain("spec-reconciler");  });

  test("agent names are in package subagents path", () => {
    expect(pkg.pi.subagents.agents).toContain("./agents");
  });
});

// ─── Skill references in skills ──────────────────────────────────────

// ─── The intake skill (intake-skill) ─────────────────────────────────

// The front door: intake replaces triage as the single entry to the
// workflow. It is user-invoked (starting an effort is a deliberate human
// act), opens through tw_open, and always creates an effort: a map plus
// exactly one non-negotiables grilling task.
describe("intake skill (intake-skill)", () => {
  const content = readFile("skills/engineering/intake/SKILL.md");
  const fm = parseFrontmatter(content);

  test("is registered in pi.skills and exists as a user-invoked skill", () => {
    const pkg = JSON.parse(readFile("package.json"));
    expect(pkg.pi.skills).toContain("./skills/engineering/intake");
    expect(fm["name"]).toBe("intake");
    expect(fm["disable-model-invocation"]).toBe("true");
  });

  test("opens through tw_open and names the tools it works through", () => {
    expect(content).toMatch(/tw_open/);
    expect(content).toMatch(/tw_create_effort/);
    expect(content).toMatch(/tw_add_task/);
  });

  test("always creates an effort: a map plus exactly one non-negotiables grilling task", () => {
    expect(content).toMatch(/exactly one/i);
    expect(content).toMatch(/non-negotiables grilling task/i);
    expect(content).toMatch(/tw_add_ticket/);
  });

  test("the named creator owns the map and the root index registration", () => {
    // Registration belongs to the front door that creates the effort, so the
    // detail lives here rather than in the planning phase's prose.
    expect(content).toContain("docs/tasks/index.md");
    expect(content).toMatch(/## Live/);
    expect(content).toMatch(/sorted/i);
  });

  test("records the intake facts", () => {
    expect(content).toMatch(/raw request/i);
    expect(content).toMatch(/destination/i);
    expect(content).toMatch(/actor/i);
    expect(content).toMatch(/classification/i);
    expect(content).toMatch(/three to five/i);
    expect(content).toMatch(/steps, expected versus actual, and impact|expected versus actual/i);
    expect(content).toMatch(/constraints/i);
  });

  test("the duplicate and link checks are bounded and time-boxed", () => {
    expect(content).toMatch(/bounded/i);
    expect(content).toMatch(/time-boxed/i);
    expect(content).toMatch(/archived/i);
  });

  test("every bug report becomes an effort; intake decides no simple-versus-full split", () => {
    expect(content).toMatch(/every bug report becomes an effort/i);
    expect(content).toMatch(/subtype: bug/);
    expect(content).toMatch(/no simple-versus-full split|does not decide.*simple/i);
    expect(content).toMatch(/wayfinder/i);
  });

  test("seeds the canonical map sections as empty placeholders", () => {
    expect(content).toMatch(/Non-goals/);
    expect(content).toMatch(/Non-negotiable facts/);
    expect(content).toMatch(/empty placeholder/i);
  });

  test("does not restate opener preconditions or the literal ready_for_spec token", () => {
    expect(content).not.toMatch(/ready_for_spec/);
  });

  test("ships its report resource", () => {
    const report = readFile("skills/engineering/intake/resources/report.md");
    expect(report).toMatch(/## 1\. What is now true/);
  });
});

describe("triage is retired (intake-skill)", () => {
  test("moves to skills/deprecated/triage with its replacement named", () => {
    const deprecated = readFile("skills/deprecated/triage/SKILL.md");
    expect(deprecated).toMatch(/intake/);
    expect(existsSync(join(PROJECT, "skills/engineering/triage"))).toBe(false);
  });

  test("is absent from pi.skills and the docs page tree", () => {
    const pkg = JSON.parse(readFile("package.json"));
    expect(pkg.pi.skills).not.toContain("./skills/engineering/triage");
    expect(existsSync(join(PROJECT, "docs/engineering/triage.md"))).toBe(false);
  });

  test("the deprecated bucket README lists it with its replacement", () => {
    const readme = readFile("skills/deprecated/README.md");
    expect(readme).toContain("[triage](./triage/SKILL.md)");
    expect(readme).toMatch(/Replaced by `intake`/);
  });

  test("the workflow-skills report seam drops triage and carries intake", () => {
    // Seam 4's coverage set is edited when a skill joins or leaves the
    // package; this pins the intake-skill reshuffle.
    const source = readFile("tests/skill-rewire.test.ts");
    expect(source).toContain('"intake"');
  });

  test("the skill surface stays the promoted set: intake in, triage out", () => {
    const pkg = JSON.parse(readFile("package.json"));
    expect(pkg.pi.skills).toContain("./skills/engineering/intake");
    expect(pkg.pi.skills).not.toContain("./skills/engineering/triage");
    expect(pkg.pi.skills.length).toBe(31);
    expect(pkg.pi.skills.filter((s: string) => s.includes("intake") || s.includes("triage"))).toEqual([
      "./skills/engineering/intake",
    ]);
  });

  test("intake has a docs page and triage has none", () => {
    expect(existsSync(join(PROJECT, "docs/engineering/intake.md"))).toBe(true);
    expect(existsSync(join(PROJECT, "docs/engineering/triage.md"))).toBe(false);
    const page = readFile("docs/engineering/intake.md");
    for (const section of ["## What it does", "## When to reach for it", "## Common questions", "## It's working if"]) {
      expect(page).toContain(section);
    }
  });

  test("the no-rejection path: intake never routes a request to a wontfix", () => {
    const intake = readFile("skills/engineering/intake/SKILL.md");
    expect(intake).toMatch(/no rejection path|never reject|no rejection/i);
    expect(intake).not.toMatch(/wontfix/);
  });
  test("the repo-root docs keep the retired bug queue out of the routing tables", () => {
    // The overview's on-ramp and query table reflect the v5 front door: the
    // triage queue and the docs/bugs grep are gone with triage.
    const overview = readFile("skills/engineering/task-workflow-overview/SKILL.md");
    expect(overview).toContain("/skill:intake");
    expect(overview).not.toContain("/skill:triage");
    expect(overview).not.toContain('grep -l "status: reported" docs/bugs/*.md');
    // The effort's own carried constraint: docs/bugs/ survives only as a
    // static archive, so the overview no longer names it as the bug list.
    expect(overview).not.toContain("docs/bugs/");
  });
});

// ─── implement-ticket: the implementation phase ──────────────────────

// The phase is a model-invoked skill in the promoted set: it opens through
// tw_open (the gate) and closes through tw_close. Its chain scripts live
// under the skill directory; the retired implementation router and close-out
// skill sit in skills/deprecated/ with their replacements named and are gone
// from pi.skills and the docs page tree.
describe("implement-ticket skill (implement-ticket-skill)", () => {
  const content = readFile("skills/engineering/implement-ticket/SKILL.md");
  const fm = parseFrontmatter(content);
  const pkg = JSON.parse(readFile("package.json"));

  test("is a model-invoked skill registered in pi.skills", () => {
    expect(pkg.pi.skills).toContain("./skills/engineering/implement-ticket");
    expect(fm["name"]).toBe("implement-ticket");
    // Model-invoked: the frontmatter carries no disable-model-invocation.
    expect(fm["disable-model-invocation"]).toBeUndefined();
  });

  test("opens through tw_open with the effort and target, and closes through tw_close", () => {
    expect(content).toMatch(/tw_open/);
    expect(content).toMatch(/skill: "implement-ticket", effort: "<effort-slug>", target: "<ticket-slug>"/);
    expect(content).toContain("tw_close implement-ticket");
  });

  test("the chain scripts live under the skill; the retired router paths are gone", () => {
    expect(existsSync(join(PROJECT, "skills/engineering/implement-ticket/scripts/ticket-chain.js"))).toBe(true);
    expect(existsSync(join(PROJECT, "skills/engineering/implement-ticket/scripts/end-of-effort.js"))).toBe(true);
    expect(existsSync(join(PROJECT, "skills/engineering/implement-task"))).toBe(false);
    expect(existsSync(join(PROJECT, "skills/engineering/finalize-task"))).toBe(false);
  });

  test("implement-task and finalize-task are retired with their replacements named", () => {
    for (const retired of ["implement-task", "finalize-task"]) {
      expect(pkg.pi.skills).not.toContain(`./skills/engineering/${retired}`);
      expect(existsSync(join(PROJECT, `docs/engineering/${retired}.md`))).toBe(false);
      const deprecated = readFile(`skills/deprecated/${retired}/SKILL.md`);
      expect(deprecated).toMatch(/implement-ticket/);
    }
    const readme = readFile("skills/deprecated/README.md");
    expect(readme).toContain("[implement-task](./implement-task/SKILL.md)");
    expect(readme).toContain("[finalize-task](./finalize-task/SKILL.md)");
  });
});

describe("human-mode resource routing", () => {
  const routers = ["feature", "bug"];

  test.each(routers)("%s router is slim and references both mode resources", (kind) => {
    const content = readFile(`skills/engineering/implement-ticket/resources/${kind}.md`);
    expect(content).toContain(`resources/${kind}/autonomous.md`);
    expect(content).toContain(`resources/${kind}/human.md`);
    expect(content).toMatch(/ambiguous/i);
    expect(content).toMatch(/ask_user_question/);
    expect(content.length).toBeLessThan(2500);
  });

  test.each(routers)("%s mode resources exist and autonomous copy is substantial", (kind) => {
    const autonomous = readFile(`skills/engineering/implement-ticket/resources/${kind}/autonomous.md`);
    const human = readFile(`skills/engineering/implement-ticket/resources/${kind}/human.md`);
    expect(autonomous.length).toBeGreaterThan(2500);
    expect(human.length).toBeGreaterThan(100);
  });

  test.each(routers)("%s router documents clear human phrases, variants, and autonomous fallback", (kind) => {
    const content = readFile(`skills/engineering/implement-ticket/resources/${kind}.md`);
    expect(content).toMatch(/implement (the task )?(yourself|manually)|human mode|manual mode/i);
    expect(content).toMatch(/no prose|no trailing prose|fallback|autonomous/i);
    expect(content).toMatch(/confirmation|confirm/i);
  });
});

describe("human-mode feature pipeline", () => {
  const content = readFile("skills/engineering/implement-ticket/resources/feature/human.md");

  test("requires collaborative architecture planning and explicit consent before implementation", () => {
    expect(content).toMatch(/architecture[- ]spec/i);
    expect(content).toMatch(/collaborat(e|ively).*review|review.*architecture/i);
    expect(content).toMatch(/explicit (user|human) consent|consent.*before/i);
    expect(content).toMatch(/no ticket (code|implementation).*before.*handoff/i);
    // v5: the architecture document lives at the effort root (to-tickets'
    // output); ordering reads the effort graph.
    expect(content).toMatch(/docs\/tasks\/<effort>\/architecture\.md/);
    expect(content).toContain("tw_dependency_levels <effort-slug>");
  });

  test("defines per-ticket handoff and human-owned implementation boundary", () => {
    expect(content).toMatch(/per[- ]ticket.*handoff/i);
    expect(content).toMatch(/non[- ]code context/i);
    expect(content).toMatch(/verification contract/i);
    expect(content).toMatch(/human.*implement/i);
    expect(content).toMatch(/explicit.*request.*code assistance|code assistance.*explicit/i);
  });

  test("defines read-only verifier-first fast-fail chain", () => {
    expect(content).toMatch(/verifier[- ]first/i);
    expect(content).toMatch(/read[- ]only/i);
    expect(content).toMatch(/fast[- ]fail/i);
    expect(content).toContain("slice-verifier");
    expect(content).toContain("deviation-reporter");
    expect(content).toContain("code-reviewer");
    expect(content).toMatch(/must not edit|cannot edit/i);
    expect(content).toMatch(/failure.*return|return.*failure/i);
  });

  test("keeps planning, handoff, verification, landing, and refactoring in order", () => {
    const stages = ["## 1.", "## 2.", "## 3.", "## 4.", "## 5."];
    const positions = stages.map((stage) => content.indexOf(stage));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(content).toMatch(/approval gate/i);
  });

  test("gates findings, landing, progression, and refactoring on approval", () => {
    expect(content).toMatch(/present.*findings|findings.*present/i);
    expect(content).toMatch(/explicit.*approval.*landing|approval.*before.*landing/i);
    expect(content).toContain("land-worker");
    expect(content).toMatch(/next ticket.*approval|approval.*next ticket/i);
    expect(content).toMatch(/whole-effort.*refactor|collaborative.*refactor/i);
    expect(content).toMatch(/consent.*refactor|approval.*refactor/i);
  });
});

describe("human-mode bug pipeline", () => {
  const content = readFile("skills/engineering/implement-ticket/resources/bug/human.md");

  test("requires collaborative reproduction and diagnosis planning with consent", () => {
    expect(content).toMatch(/reproduction|reproduce/i);
    expect(content).toMatch(/diagnos(e|is)/i);
    expect(content).toMatch(/cause|regression seam|acceptance criteria|scope/i);
    expect(content).toMatch(/explicit (user|human) consent|consent.*before/i);
    expect(content).toMatch(/not.*feature.*architecture|do not.*architecture-spec/i);
  });

  test("defines human implementation handoff and forbids unrequested edits", () => {
    expect(content).toMatch(/implementation handoff|hand.*human/i);
    expect(content).toMatch(/do not write.*(fix|code)|no.*code.*before/i);
    expect(content).toMatch(/explicit.*request.*code assistance|code assistance.*explicit/i);
  });

  test("defines read-only verifier-first fast-fail chain and permissions", () => {
    expect(content).toMatch(/verifier[- ]first/i);
    expect(content).toMatch(/read[- ]only/i);
    expect(content).toMatch(/fast[- ]fail/i);
    expect(content).toContain("slice-verifier");
    expect(content).toMatch(/must not edit|cannot edit/i);
    expect(content).toMatch(/failure.*return|return.*failure/i);
  });

  test("requires findings approval before separate landing and completion", () => {
    expect(content).toMatch(/present.*findings|findings.*present/i);
    expect(content).toMatch(/explicit.*approval.*landing|approval.*before.*landing/i);
    expect(content).toContain("land-worker");
    expect(content).toMatch(/next slice|task completion|complete/i);
  });
});

// ─── Human-mode integration contracts ────────────────────────────────

/**
 * These assertions intentionally observe resource boundaries and protocol
 * vocabulary, rather than matching the surrounding explanatory prose. This
 * keeps the workflow coverage stable when the orchestration text is revised.
 */
describe("human-mode integration coverage", () => {
  const modes = ["autonomous", "human"] as const;
  const taskKinds = ["feature", "bug"] as const;

  test.each(taskKinds)("%s router is the sole dispatch entry and discovers both modes", (kind) => {
    const router = readFile(`skills/engineering/implement-ticket/resources/${kind}.md`);
    expect(router).toContain(`resources/${kind}/autonomous.md`);
    expect(router).toContain(`resources/${kind}/human.md`);
    expect(router).toMatch(/no trailing mode prose|no prose/i);
    expect(router).toMatch(/ambiguous/i);
    expect(router).toContain("ask_user_question");

    const phase = readFile("skills/engineering/implement-ticket/SKILL.md");
    expect(phase).toContain(`resources/${kind}.md`);
    // The mode-specific pipelines are the routers' own discovery; the phase
    // never selects one directly.
    expect(phase).not.toContain(`resources/${kind}/human.md`);
    expect(phase).not.toContain(`resources/${kind}/autonomous.md`);
  });

  test.each(taskKinds.flatMap((kind) => modes.map((mode) => [kind, mode] as const)))
    ("%s %s resource exists and is non-empty", (kind, mode) => {
      const content = readFile(`skills/engineering/implement-ticket/resources/${kind}/${mode}.md`);
      expect(content.trim().length).toBeGreaterThan(100);
    });

  test("verification agent permissions are read-only while landing remains separate", () => {
    const verifier = parseFrontmatter(readFile("agents/slice-verifier.md"));
    const reviewer = parseFrontmatter(readFile("agents/code-reviewer.md"));
    expect(verifier.tools).toBe("read, bash, submit_feedback, tw_feedback");
    expect(reviewer.tools).not.toMatch(/edit|write|land-worker/);

    for (const kind of taskKinds) {
      const human = readFile(`skills/engineering/implement-ticket/resources/${kind}/human.md`);
      expect(human).toMatch(/read[- ]only/i);
      expect(human).toMatch(/must not edit|cannot edit/i);
      expect(human).toContain("land-worker");
      expect(human.indexOf("explicit human approval")).toBeLessThan(human.lastIndexOf("land-worker"));
    }
  });

  test.each(taskKinds)("%s human protocol covers verifier failure and approval rejection", (kind) => {
    const human = readFile(`skills/engineering/implement-ticket/resources/${kind}/human.md`);
    expect(human).toMatch(/verifier[- ]first/i);
    expect(human).toMatch(/fast[- ]fail/i);
    expect(human).toMatch(/failure.*return|return.*failure/i);
    expect(human).toMatch(/rejected|declined|not approved/i);
    expect(human).toMatch(/next ticket|ticket completion|declaring ticket completion/i);
  });

  test("feature human protocol preserves collaborative post-handoff assistance boundary", () => {
    const human = readFile("skills/engineering/implement-ticket/resources/feature/human.md");
    expect(human).toMatch(/after the per[- ]ticket handoff|after.*handoff/i);
    expect(human).toMatch(/explicit request.*code assistance|code assistance.*explicit/i);
    expect(human).toMatch(/multiple tickets|each ticket|every ticket/i);
    expect(human).toMatch(/whole-effort.*refactor|collaborative.*refactor/i);
  });
});

describe("skill cross-references", () => {
  test("overview references all core skills", () => {
    const content = readFile("skills/engineering/task-workflow-overview/SKILL.md");
    expect(content).toContain("wayfinder");
    expect(content).toContain("/skill:implement-ticket");
    expect(content).toContain("setup-workflow");
    // The retired routers are gone from the router table.
    expect(content).not.toContain("/skill:implement-task");
    expect(content).not.toContain("/skill:finalize-task");
  });

  test("implement-ticket never denies the grilling skill exists", () => {
    // The implementation phase routes planning work back to wayfinder
    // (grilling-delegation-fix): it never restates the method and never
    // claims grilling lacks a standalone skill.
    const content = readFile("skills/engineering/implement-ticket/SKILL.md");
    expect(content).toMatch(/Wayfinder's frontier/);
    expect(content).toMatch(/\/skill:wayfinder/);
    expect(content).not.toMatch(/grilling[^\n]*no standalone skill/i);
  });

  test("implement-ticket routes feature and bug tickets and hands planning back to wayfinder", () => {
    const content = readFile("skills/engineering/implement-ticket/SKILL.md");
    // The v5 routing fields: subtype names the ticket kind (feature or bug),
    // mode marks a human-owned ticket. Implementation work is always a
    // ticket; there is no type fallback and no planning dispatch here.
    expect(content).toMatch(/"subtype"/);
    expect(content).toContain("resources/feature.md");
    expect(content).toContain("resources/bug.md");
    expect(content).toMatch(/`type: ticket` with `subtype` `feature` or `bug`/);
    // The planning frontier is Wayfinder's; the phase never dispatches a
    // planning subtype and never restates the grilling method.
    expect(content).toMatch(/planning subtypes \(research, prototype, grilling, manual\) are/);
    expect(content).not.toContain("implement-task/resources/research.md");
    expect(content).not.toContain("implement-task/resources/prototype.md");
    expect(content).not.toContain("implement-task/resources/grilling.md");
    expect(content).not.toContain("implement-task/resources/manual.md");
  });

  test("wayfinder creates planning tasks only; to-tickets owns feature and bug creation", () => {
    const content = readFile("skills/engineering/wayfinder/SKILL.md");
    expect(content).toContain("to-tickets");
    expect(content).toMatch(/feature and bug/i);
    expect(content).toContain("blocked_by");
    expect(content).toMatch(/decisions, not deliverables|hand off, don't build/i);
    // The stale "replaces create-task, to-spec, and to-tickets" sentence is
    // gone: wayfinder hands off to to-spec and to-tickets (two-phase model).
    expect(content).not.toContain("create-task");
    expect(content).not.toContain("It replaces");
  });

  test("to-tickets owns implementation task creation", () => {
    const content = readFile("skills/engineering/to-tickets/SKILL.md");
    expect(content).toContain("feature");
    expect(content).toContain("bug");
    expect(content).toContain("blocked_by");
    expect(content).toMatch(/tw_dependency_levels|tw_frontier/);
  });

  test("wayfinder has one planning resource per planning subtype, no feature/bug resources", () => {
    for (const subtype of ["research", "prototype", "grilling", "manual"]) {
      const content = readFile(`skills/engineering/wayfinder/resources/${subtype}.md`);
      expect(content).toContain("Wayfinder Planning Resource");
      expect(content).toMatch(new RegExp(`^type: task$`, "m"));
      expect(content).toMatch(new RegExp(`^subtype: ${subtype}$`, "m"));
    }
    // Feature and bug planning resources are deleted: feature and bug
    // creation is to-tickets' job, aligned with its Boundary.
    expect(existsSync(join(PROJECT, "skills/engineering/wayfinder/resources/feature.md"))).toBe(false);
    expect(existsSync(join(PROJECT, "skills/engineering/wayfinder/resources/bug.md"))).toBe(false);
  });

  test("implement-ticket sends planning work back to wayfinder", () => {
    const content = readFile("skills/engineering/implement-ticket/SKILL.md");
    // Planning work discovered mid-implementation is Wayfinder's: the run
    // stops and tells the human, it never improvises a hidden plan.
    expect(content).toMatch(/tells? the human to run `\/skill:wayfinder`/);
    expect(content).toMatch(/do not improvise a hidden/);
  });

  test("implement-ticket feature resource references tw_dependency_levels", () => {
    const content = readFile("skills/engineering/implement-ticket/resources/feature/autonomous.md");
    expect(content).toContain("tw_dependency_levels");
  });

  test("implement-ticket feature resource references tdd-worker agent", () => {
    const content = readFile("skills/engineering/implement-ticket/resources/feature/autonomous.md");
    expect(content).toContain("tdd-worker");
  });

  test("implement-ticket feature resource references slice-verifier agent", () => {
    const content = readFile("skills/engineering/implement-ticket/resources/feature/autonomous.md");
    expect(content).toContain("slice-verifier");
  });

  test("implement-ticket feature resource references land-worker agent", () => {
    const content = readFile("skills/engineering/implement-ticket/resources/feature/autonomous.md");
    expect(content).toContain("land-worker");
  });

  test("implement-ticket feature resource references deviation-reporter agent", () => {
    const content = readFile("skills/engineering/implement-ticket/resources/feature/autonomous.md");
    expect(content).toContain("deviation-reporter");
  });

  test("implement-ticket feature resource references code-reviewer agent", () => {
    const content = readFile("skills/engineering/implement-ticket/resources/feature/autonomous.md");
    expect(content).toContain("code-reviewer");
  });

  for (const resource of ["research", "prototype", "grilling", "manual"]) {
    test(`the ${resource} planning resource lives under wayfinder and is non-coding`, () => {
      const content = readFile(`skills/engineering/wayfinder/resources/${resource}.md`);
      expect(content).toContain("Wayfinder Planning Resource");
      expect(content).toContain("Completion evidence");
    });
  }

  test("implement-ticket bug resource references tdd-worker agent", () => {
    const content = readFile("skills/engineering/implement-ticket/resources/bug/autonomous.md");
    expect(content).toContain("tdd-worker");
  });

  test("implement-ticket bug resource references slice-verifier agent", () => {
    const content = readFile("skills/engineering/implement-ticket/resources/bug/autonomous.md");
    expect(content).toContain("slice-verifier");
  });

  test("implement-ticket bug resource references land-worker agent", () => {
    const content = readFile("skills/engineering/implement-ticket/resources/bug/autonomous.md");
    expect(content).toContain("land-worker");
  });

  test("implement-ticket bug resource references code-reviewer agent", () => {
    const content = readFile("skills/engineering/implement-ticket/resources/bug/autonomous.md");
    expect(content).toContain("code-reviewer");
  });

  test("implement-ticket bug chain keeps the red-first regression test rule", () => {
    // The rule lives in the diagnosing-bugs skill the worker receives; the
    // task text never restates it.
    const diagnosing = readFile("skills/engineering/diagnosing-bugs/SKILL.md");
    expect(diagnosing).toMatch(/regression test .{0,40}before the fix/i);
    const chain = readFile("skills/engineering/implement-ticket/scripts/ticket-chain.js");
    expect(chain).not.toMatch(/regression test/i);
  });

  test("feature and bug resources include failure toolbelt in order", () => {
    const feature = readFile("skills/engineering/implement-ticket/resources/feature/autonomous.md");
    const bug = readFile("skills/engineering/implement-ticket/resources/bug/autonomous.md");
    for (const content of [feature, bug]) {
      const splitIdx = content.indexOf("split");
      const retryIdx = content.indexOf("retry");
      expect(splitIdx).toBeGreaterThan(-1);
      expect(retryIdx).toBeGreaterThan(-1);
      expect(splitIdx).toBeLessThan(retryIdx);
      expect(content).toContain("parent never implements");
    }
  });

  test("the close-out marks the ticket done through tw_mark_done, the one owner", () => {
    const content = readFile("skills/engineering/implement-ticket/SKILL.md");
    expect(content).toContain("tw_mark_done");
    expect(content).toMatch(/the one owner of the/i);
    // The chain never marks it: the close-out is the marking's only writer.
    expect(content).toMatch(/the chain never marks it/);
  });

  test("the close-out runs inline in the same run that lands the ticket", () => {
    const content = readFile("skills/engineering/implement-ticket/SKILL.md");
    expect(content).toMatch(/close-out runs inline, in the same autonomous run that lands the/i);
    expect(content).toMatch(/The human never waits to type a close-out skill/i);
  });

  test("the changelog entry lands before the done-marking, through the only writer", () => {
    const content = readFile("skills/engineering/implement-ticket/SKILL.md");
    expect(content).toMatch(/tw_write_changelog/);
    expect(content).toMatch(/the only\n   writer of `docs\/tasks\/CHANGELOG\.md`/);
    expect(content).toMatch(/changelog step must land first/i);
  });

  test("the CI gate runs before the merge; a red branch is never merged", () => {
    const content = readFile("skills/engineering/implement-ticket/SKILL.md");
    expect(content).toMatch(/CI gate/i);
    expect(content).toMatch(/Do not merge a red branch/i);
  });

  test("the close-out keeps Pi tool calls out of the set -e shell blocks", () => {
    const content = readFile("skills/engineering/implement-ticket/SKILL.md");
    const fence = /```[^\n]*\n([\s\S]*?)```/g;
    let m: RegExpExecArray | null;
    let shellBlocks = 0;
    while ((m = fence.exec(content)) !== null) {
      if (/git\s+merge\s+--no-ff/.test(m[1])) {
        shellBlocks++;
        // Wrapping a Pi tool call in a set -e shell block fails with
        // command not found and aborts the close-out mid-sequence (see
        // docs/bugs/finalize-task-set-e-tool-confusion.md).
        expect(m[1]).not.toMatch(/tw_state_set|tw_finalizable/);
      }
    }
    expect(shellBlocks).toBeGreaterThan(0);
    // The Pi tool calls must still appear, clearly marked as tool invocations
    // rather than shell commands.
    expect(content).toMatch(/Pi tool|tool call|tool invocation|not a shell command/i);
  });

  test("the done-marking verifies with tw_finalizable and clears the task pointer", () => {
    const content = readFile("skills/engineering/implement-ticket/SKILL.md");
    expect(content).toContain("tw_finalizable <ticket-slug>");
    expect(content).toMatch(/anomal/i);
    expect(content).toContain("tw_state_set task null");
    // The slice pointer is not called: the state setter has no slice field.
    expect(content).not.toMatch(/tw_state_set slice/);
  });

  test("no per-ticket git mv: the ticket stays in the live effort", () => {
    const content = readFile("skills/engineering/implement-ticket/SKILL.md");
    expect(content).toMatch(/no per-ticket move|the ticket stays in the live effort/i);
    expect(content).toMatch(/the effort archives as a unit/i);
    // Archiving is finalize-effort's; the close-out never moves the ticket.
    expect(content).not.toContain("docs/tasks/archive/<effort>");
  });

  test("the close-out has no bug-closure step: docs/bugs/ is a static archive", () => {
    // end-of-effort-reconciliation retired the substrate write: the defect's
    // record is the implementation ticket. (The former pins here asserted the
    // `status: fixed` / `fix_commit` / archive-move closure, which schema 5
    // retired.)
    const content = readFile("skills/engineering/implement-ticket/SKILL.md");
    expect(content).toMatch(/docs\/bugs\/` is a static archive/);
    expect(content).not.toContain("fix_commit");
    expect(content).not.toContain("status: fixed");
  });

  test("the bug branch takes the bug slug from the ticket body's reference", () => {
    const content = readFile("skills/engineering/implement-ticket/SKILL.md");
    expect(content).toMatch(/ticket body/i);
    // The bug frontmatter field is dead; the body reference is the convention.
    expect(content).not.toContain("bug: <slug>");
  });

  test("setup-workflow scaffolds no bug directory: an archive is left where it is", () => {
    const content = readFile("skills/engineering/setup-workflow/SKILL.md");
    expect(content).not.toMatch(/mkdir[^\n]*docs\/bugs/);
    expect(content).toMatch(/docs\/bugs\/` is a static archive/);
  });

  test("setup-workflow writes docs/dev-env.md template", () => {
    const content = readFile("skills/engineering/setup-workflow/SKILL.md");
    expect(content).toContain("docs/dev-env.md");
  });

  test("setup-workflow does not clobber existing docs/dev-env.md", () => {
    const content = readFile("skills/engineering/setup-workflow/SKILL.md");
    expect(content).toMatch(/do not clobber|already exists|skip.*docs\/dev-env\.md|preserve.*docs\/dev-env\.md/i);
  });

  test("task-overview routes planning to wayfinder", () => {
    const content = readFile("skills/engineering/task-workflow-overview/SKILL.md");
    expect(content).toContain("/skill:wayfinder");
    expect(content).toContain("tw_frontier");
  });

  test("task-workflow-doctor references setup-workflow", () => {
    const content = readFile("skills/engineering/task-workflow-doctor/SKILL.md");
    expect(content).toContain("setup-workflow");
  });

  test("task-workflow-doctor has not-a-fixer contract", () => {
    const content = readFile("skills/engineering/task-workflow-doctor/SKILL.md");
    expect(content).toContain("diagnoses");
    expect(content).toContain("routes");
  });

  test("implement-ticket bug chain references diagnosing-bugs skill", () => {
    // The discipline routing moved into the shipped chain script.
    const chain = readFile("skills/engineering/implement-ticket/scripts/ticket-chain.js");
    expect(chain).toContain("diagnosing-bugs");
  });

  test("tdd-worker agent references diagnosing-bugs skill", () => {
    const content = readFile("agents/tdd-worker.md");
    expect(content).toContain("diagnosing-bugs");
  });

  test("diagnosing-bugs skill names Phase 1 as non-skippable", () => {
    const content = readFile("skills/engineering/diagnosing-bugs/SKILL.md");
    expect(content).toContain("Phase 1");
    expect(content).toContain("non-skippable");
  });

  test("diagnosing-bugs skill documents skippable phases with recorded justification", () => {
    const content = readFile("skills/engineering/diagnosing-bugs/SKILL.md");
    expect(content).toContain("skippable");
    expect(content).toMatch(/justified|recorded/);
  });
});

// ─── setup-workflow / migration skill references ─────────────────────

describe("setup-workflow / migration skill references", () => {
  test("is registered as a promoted Pi skill", () => {
    const pkg = JSON.parse(readFile("package.json"));
    expect(pkg.pi.skills).toContain("./skills/engineering/setup-workflow");
  });

  test("SKILL.md references the upgrade-2-to-3 resource", () => {
    const content = readFile("skills/engineering/setup-workflow/SKILL.md");
    expect(content).toMatch(/upgrade-2-to-3/);
  });

  test("SKILL.md references the target-state spec", () => {
    const content = readFile("skills/engineering/setup-workflow/SKILL.md");
    expect(content).toMatch(/migration-target\.yaml/);
  });

  test("SKILL.md mentions schema_version detection", () => {
    const content = readFile("skills/engineering/setup-workflow/SKILL.md");
    expect(content).toMatch(/schema_version/);
  });

  test("SKILL.md mentions dry-run safety", () => {
    const content = readFile("skills/engineering/setup-workflow/SKILL.md");
    expect(content).toMatch(/dry-run/i);
  });

  test("SKILL.md mentions backup branch safety", () => {
    const content = readFile("skills/engineering/setup-workflow/SKILL.md");
    expect(content).toMatch(/backup/i);
  });

  test("SKILL.md mentions idempotence", () => {
    const content = readFile("skills/engineering/setup-workflow/SKILL.md");
    expect(content).toMatch(/idempoten/i);
  });

  test("upgrade-2-to-3 resource exists and lists 9 steps", () => {
    const content = readFile("skills/engineering/setup-workflow/resources/upgrade-2-to-3.md");
    for (let i = 1; i <= 9; i++) {
      expect(content).toMatch(new RegExp(`## Step ${i}`));
    }
  });
});

// ─── setup-workflow v5 (schema_version 5) ────────────────────────────

describe("setup-workflow v5", () => {
  const skill = readFile("skills/engineering/setup-workflow/SKILL.md");
  // The migrate branch is the section between its heading and the upgrade
  // resources list; the dry-run/idempotence/corruption subsections live in it.
  const migrateBranch = (text: string): string =>
    text.slice(text.indexOf("## Migrate (old repo)"), text.indexOf("## Available upgrade resources"));

  test("keys detection on schema_version 5 as current", () => {
    expect(skill).toMatch(/current schema version is \*\*5\*\*/);
  });

  test("routes a v4 repo to the upgrade-4-to-5 resource", () => {
    expect(skill).toMatch(/upgrade-4-to-5/);
  });

  test("the no-op message names schema_version 5", () => {
    expect(skill).toMatch(/already on schema_version 5, nothing to do/);
  });

  test("names the three branches: fresh, migrate, no-op", () => {
    expect(skill).toMatch(/onboard/i);
    expect(skill).toMatch(/migrate/i);
    expect(skill).toMatch(/no-op|already on schema_version/i);
  });

  test("the migrate branch opens the phase and calls the disclosed tool, never a shell command", () => {
    // The executor step opens the phase (the opener discloses the tool) and
    // calls the tool; the migration is never a shell command.
    const migrate = migrateBranch(skill);
    expect(migrate).toMatch(/tw_open/);
    expect(migrate).toMatch(/tw_migrate/);
    expect(skill).not.toMatch(/scripts\/migrate\.mjs/);
    expect(skill).not.toMatch(/node skills\/engineering\/setup-workflow\/scripts/);
  });

  test("the migrate branch carries the six-step branch choreography", () => {
    const migrate = migrateBranch(skill);
    // 1. Record the integration branch: the branch the run was invoked on.
    expect(migrate).toMatch(/record the integration branch/i);
    // 2. Create the migration branch from it.
    expect(migrate).toMatch(/migrate\/schema-\$\{from\}-to-5/);
    // 3. The tool, the test suite, and the commit run on the migration branch.
    expect(migrate).toMatch(/on the migration branch/i);
    // 4. Fast-forward the integration branch to the branch tip, asking for
    //    explicit user approval first when it is not main or master.
    expect(migrate).toMatch(/fast-forward/i);
    expect(migrate).toMatch(/approval/i);
    expect(migrate).toMatch(/not `?main`? or `?master`?/);
    // 5. Delete the migration branch after the fast-forward.
    expect(migrate).toMatch(/delete the migration branch/i);
    // 6. The run ends on the integration branch.
    expect(migrate).toMatch(/end the run on the integration branch/i);
  });

  test("the migrate branch mentions the MigrateReport", () => {
    expect(skill).toMatch(/MigrateReport/);
  });

  test("the dry-run section describes the tool parameter, not a CLI flag", () => {
    const start = skill.indexOf("### Dry-run mode");
    const end = skill.indexOf("###", start + 3);
    const dryRun = skill.slice(start, end === -1 ? undefined : end);
    expect(dryRun).toMatch(/tw_migrate/);
    expect(dryRun).toMatch(/dryRun/);
    expect(dryRun).not.toMatch(/--dry-run/);
    // The flag is gone from the skill everywhere: the parameter replaced it.
    expect(skill).not.toMatch(/--dry-run/);
  });

  test("the onboard branch writes the v5 scaffold", () => {
    expect(skill).toMatch(/schema_version: 5/);
    expect(skill).toMatch(/okf_version/);
  });

  test("the docs page matches the rerouted migrate branch", () => {
    const page = readFile("docs/engineering/setup-workflow.md");
    // Executor: the disclosed tool, never the shell command.
    expect(page).toMatch(/tw_migrate/);
    expect(page).not.toMatch(/scripts\/migrate\.mjs/);
    expect(page).not.toMatch(/migration CLI/);
    // Choreography: the migration branch, the fast-forward with the
    // approval gate, the deletion, and the run ends on the integration
    // branch.
    expect(page).toMatch(/migrate\/schema/);
    expect(page).toMatch(/integration branch/i);
    expect(page).toMatch(/fast-forward/i);
    expect(page).toMatch(/approval/i);
    expect(page).toMatch(/delet/i);
    // The dry run is the tool parameter.
    expect(page).toMatch(/dryRun/);
    expect(page).not.toMatch(/--dry-run/);
  });

  test("the onboard and no-op branches are untouched by the reroute", () => {
    // The reroute owns the migrate branch only. The onboard branch keeps its
    // scaffold steps and its direct-write bootstrap (the tree is unstamped,
    // so no named writer exists yet), and the no-op branch keeps its
    // detection and message. Regression pins: green on arrival by design.
    const onboard = skill.slice(
      skill.indexOf("## Onboard (fresh repo)"),
      skill.indexOf("## Migrate (old repo)"),
    );
    for (const marker of [
      "mkdir -p docs/tasks/archive",
      "schema_version: 5",
      "docs/tasks/index.md",
      "docs/testing.md",
      "docs/dev-env.md",
      "CONTEXT.md",
      "AGENTS.md",
      "docs/agents/README.md",
      "out-of-scope/index.md",
      "chore: initialize task-workflow (schema_version 5)",
      "/skill:task-workflow-overview",
    ]) {
      expect(onboard, marker).toContain(marker);
    }
    expect(onboard).not.toMatch(/tw_migrate/);
    const detection = skill.slice(0, skill.indexOf("## Onboard (fresh repo)"));
    expect(detection).toMatch(/schema_version` is less than 5/);
    expect(detection).toMatch(/schema_version` equals 5/);
  });

  test("references the upgrade-3-to-4 resource", () => {
    expect(skill).toMatch(/upgrade-3-to-4/);
  });

  test("the dead task-overview pointer is fixed", () => {
    expect(skill).toContain("/skill:task-workflow-overview");
    expect(skill).not.toContain("/skill:task-overview`");
  });

  test("upgrade-3-to-4 resource exists with the ordered step list", () => {
    const content = readFile("skills/engineering/setup-workflow/resources/upgrade-3-to-4.md");
    expect(content).toMatch(/Migration/);
    expect(content).toMatch(/tw_migrate/);
    for (let i = 1; i <= 9; i++) {
      expect(content).toMatch(new RegExp(`## Step ${i}`));
    }
  });

  test("upgrade-4-to-5 resource exists with the established shape", () => {
    const content = readFile("skills/engineering/setup-workflow/resources/upgrade-4-to-5.md");
    expect(content).toMatch(/tw_migrate/);
    expect(content).toMatch(/## Before you start/);
    expect(content).toMatch(/## After the run/);
    expect(content).toMatch(/## Step 1/);
    expect(content).toMatch(/## Step 2/);
  });

  test("upgrade-4-to-5 covers every v4-to-5 rewrite the migration performs", () => {
    const content = readFile("skills/engineering/setup-workflow/resources/upgrade-4-to-5.md");
    // The type and filename rename, live and archived.
    expect(content).toMatch(/arch-spec\.md/);
    expect(content).toMatch(/architecture\.md/);
    expect(content).toMatch(/arch spec/);
    // The multi-architecture-doc corner: renamed in place, not hoisted.
    expect(content).toMatch(/in place/);
    // The map body reshape.
    expect(content).toMatch(/## Out of scope/);
    expect(content).toMatch(/Non-goals/);
    expect(content).toMatch(/Non-negotiable facts/);
    // The state stamp and what the hop never touches.
    expect(content).toMatch(/schema_version: 5/);
    expect(content).toMatch(/docs\/bugs\//);
  });

  test("the upgrade resources name the tool as the executor, not the CLI", () => {
    // No living page instructs the shell command: the resources' executor
    // wording follows the skill's reroute.
    for (const name of ["upgrade-3-to-4.md", "upgrade-4-to-5.md"]) {
      const content = readFile(`skills/engineering/setup-workflow/resources/${name}`);
      expect(content, name).toMatch(/tw_migrate/);
      expect(content, name).not.toMatch(/scripts\/migrate\.mjs/);
      expect(content, name).not.toMatch(/node skills\/engineering\/setup-workflow\/scripts/);
      expect(content, name).not.toMatch(/migration CLI/);
    }
  });

  test("upgrade-4-to-5's transcript matches what the tool returns", () => {
    const content = readFile("skills/engineering/setup-workflow/resources/upgrade-4-to-5.md");
    expect(content).toMatch(/migrated from schema_version 4 to 5/);
    expect(content).toMatch(/already on schema_version 5, nothing to do\./);
    expect(content).toMatch(/rebuilt state\.yaml at schema_version 5/);
  });
});
// ─── Migration CLI removal (remove-migration-cli) ────────────────────

describe("migration CLI removal (remove-migration-cli)", () => {
  test("the three migration CLI files no longer exist", () => {
    // The package ships exactly one migration executor: the disclosed
    // `tw_migrate` tool. The argv wrapper, the shim script, and the shim's
    // resolve hook are gone.
    for (const gone of [
      "src/migrate-cli.ts",
      "skills/engineering/setup-workflow/scripts/migrate.mjs",
      "skills/engineering/setup-workflow/scripts/ts-resolve.mjs",
    ]) {
      expect(existsSync(join(PROJECT, gone)), gone).toBe(false);
    }
  });

  test("no living file references the removed migration CLI files", () => {
    // An import or an instruction to run the removed CLI must name one of
    // its files. The sweep mirrors the dead-surface corpus check: this file
    // is its own exemption (the guards above must name the removed files to
    // assert their absence), and the migration-tool effort's own record
    // keeps the names that were live when written, the same class as an
    // archived tree.
    const removed = /migrate-cli|ts-resolve|migrate\.mjs/;
    const self = "tests/skills.test.ts";
    const offenders: string[] = [];
    for (const file of corpusFiles(PROJECT)) {
      const rel = repoRel(file);
      if (rel === self) continue;
      if (rel.startsWith("docs/tasks/migration-tool/")) continue;
      if (removed.test(readFileSync(file, "utf-8"))) {
        offenders.push(rel);
      }
    }
    expect(offenders).toEqual([]);
  });

  test("no living skill, docs, or resource prose names the migration CLI", () => {
    // The reroute guards cover the setup-workflow pages and upgrade
    // resources; this sweep covers the remaining instructing surface: skill
    // prose, the promoted docs tree, and resources. A symptom that names a
    // CLI the package does not ship routes the reader to a tool that is not
    // there.
    const proseOffenders: string[] = [];
    for (const dir of ["skills", "docs/engineering", "docs/productivity"]) {
      for (const file of corpusFiles(join(PROJECT, dir))) {
        if (/migration CLI/i.test(readFileSync(file, "utf-8"))) {
          proseOffenders.push(repoRel(file));
        }
      }
    }
    expect(proseOffenders).toEqual([]);
  });
});

// ─── Skill-review wiring ─────────────────────────────────────────────

describe("skill-review wiring", () => {
  const skill = readFile("skills/engineering/skill-review/SKILL.md");
  const reviewer = readFile("agents/skill-reviewer.md");
  const creator = readFile("skills/engineering/skill-creator/SKILL.md");

  test("skill-review is registered and names axes with stage-0 triage", () => {
    const pkg = JSON.parse(readFile("package.json"));
    expect(pkg.pi.skills).toContain("./skills/engineering/skill-review");
    expect(skill).toMatch(/^name: skill-review/m);
    expect(skill).toMatch(/audience fit/i);
    expect(skill).toMatch(/trigger behavior/i);
    expect(skill).toMatch(/spec \/ portability|portability/i);
    expect(skill).toMatch(/triage/i);
  });

  test("skill-review fixes the plan up front with no mid-run escalation", () => {
    expect(skill).toMatch(/final once fixed|before any reviewer runs/);
    expect(skill).toMatch(/no reviewer consumes another axis|no reviewer.*another axis|request another axis later/);
    expect(skill).toMatch(/at most \*{0,2}5 axes\*{0,2}/);
    expect(skill).toMatch(/parallel sub-agent|parallel.*fresh context/);
  });

  test("skill-review defines core and optional axes with triggers", () => {
    expect(skill).toMatch(/progressive disclosure \/ token budget|progressive disclosure/i);
    expect(skill).toMatch(/accessibility.*UI|UI.*accessibility/i);
    expect(skill).toMatch(/safety.*destructive|destructive.*safety|consequential ops/i);
    expect(skill).toMatch(/reference integrity/i);
  });

  test("skill-reviewer agent mirrors code-reviewer conventions", () => {
    const fm = parseFrontmatter(reviewer);
    expect(fm.name).toBe("skill-reviewer");
    expect(fm.inheritProjectContext).toBe("true");
    expect(fm.defaultContext).toBe("fresh");
    expect(fm.tools).toBeDefined();
    expect(reviewer).toMatch(/fanout guard|do not invoke/);
  });

  test("skill-creator invokes the reviewer and teaches meta-noise pruning", () => {
    expect(creator).toMatch(/skill-reviewer|skill-review/);
    expect(creator).toMatch(/meta-level narrative/i);
    expect(creator).toMatch(/reader-agent/);
    expect(creator).toMatch(/author-facing rationale/i);
  });

  test("skill-reviewer agent does stage-0 triage before spawning", () => {
    expect(reviewer).toMatch(/triage the axis set before spawning/i);
    expect(reviewer).toMatch(/final once fixed/);
    expect(reviewer).toMatch(/at most \*{0,2}5 axes\*{0,2}/);
    expect(reviewer).toMatch(/Aggregate.*Include the review-plan|review-plan preamble/);
  });
});

// ─── Tool prefix rename (corpus check) ───────────────────────────────

// The old tool prefix and the tool suffixes are assembled from parts so this
// test file itself carries no old-prefix literal.
const OLD_PREFIX = "task" + "_";
const TOOL_SUFFIXES = [
  "show",
  "get",
  "set",
  "set_slices",
  "resolve",
  "assert_kind",
  "list",
  "slices",
  "finalizable",
  "dependency_levels",
  "frontier",
  "map_tasks",
  "map_tick",
  "map_finalizable",
  "state",
  "state_set",
  "context",
];
const OLD_TOOL_PATTERN = new RegExp(`\\b${OLD_PREFIX}(${TOOL_SUFFIXES.join("|")})\\b`);
// The wildcard family reference (`task_*`) is also an old-prefix reference;
// assembled from parts for the same reason as OLD_PREFIX.
const OLD_WILDCARD_PATTERN = new RegExp(`${OLD_PREFIX}\\*`);

// Mirrors the sweep verification: every file under the package root, minus
// node_modules/.git, any archive directory (archived docs are historical
// records and keep the names that were live when they ran), and
// prototype-bundle (gitignored vendored experiment trees whose third-party
// build output, e.g. Python deps under smoke-py/build, is not package
// surface and can coincidentally match old tool names like the anyio
// `task` + `_state` variable).
// Gitignored local working directories hold tooling output, not prose this
// repo ships: a subagent transcript or a `.work/` scratch file can carry any
// character and any retired identifier without anything of ours being wrong.
// `.agents` (a vendored skills checkout) and `dist` (build output) are the
// same class as prototype-bundle: local, gitignored, never shipped (the
// package `files` set ships neither).
const CORPUS_SKIP_DIRS = new Set(["node_modules", ".git", "archive", "prototype-bundle", ".pi-subagents", ".work", ".agents", "dist"]);
function corpusFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (CORPUS_SKIP_DIRS.has(entry.name)) continue;
      corpusFiles(join(dir, entry.name), out);
    } else if (entry.isFile()) {
      out.push(join(dir, entry.name));
    }
  }
  return out;
}

// Historical-record exemptions, same class as the archive: documents that
// record the old surface as it was keep the names that were live when
// written. Dated changelog entries, decision records, audit findings, and
// the rename task's own arch-spec (its old-to-new mapping table must keep
// the old names to stay meaningful).
const CORPUS_EXEMPTIONS = new Set([
  "docs/tasks/CHANGELOG.md",
  "docs/tasks/overhaul-tw-rename/arch-spec.md",
  "docs/tasks/maps/task-tools-overhaul/handoff.md",
  "docs/tasks/overhaul-synthesis-grilling/task.md",
  "docs/tasks/tool-surface-inventory/findings.md",
  "docs/tasks/tool-surface-inventory/task.md",
  "docs/tasks/workflow-tool-usage-audit/findings.md",
  "docs/tasks/workflow-tool-usage-audit/task.md",
  "docs/tasks/eval-stack-research/findings.md",
]);

// Wildcard (`task_*`) exemptions, a wider class: historical records that
// describe the old surface as it was (decision records, audit findings,
// ideas docs) keep the name that was live when written, including the
// ruling lines that must name the old prefix to stay meaningful (the map
// doc's rename ruling, this task's own docs, and this test file's
// comments).
const WILDCARD_EXEMPTIONS = new Set([
  "docs/tasks/CHANGELOG.md",
  "docs/tasks/overhaul-tw-rename/arch-spec.md",
  "docs/tasks/overhaul-tw-rename/task.md",
  "docs/tasks/maps/task-tools-overhaul/handoff.md",
  "docs/tasks/maps/task-tools-overhaul/map.md",
  "docs/tasks/overhaul-synthesis-grilling/task.md",
  "docs/tasks/tool-surface-inventory/findings.md",
  "docs/tasks/tool-surface-inventory/task.md",
  "docs/tasks/workflow-tool-usage-audit/findings.md",
  "docs/tasks/workflow-tool-usage-audit/task.md",
  "docs/tasks/eval-stack-research/findings.md",
  "docs/adr/0001-largely-adopt-mp-skills.md",
  "docs/ideas/bug-workflow.md",
  "docs/ideas/gate-skills-by-repo.md",
  "tests/skills.test.ts",
]);

describe("tool prefix rename", () => {
  test("no old-prefix tool reference remains outside archive", () => {
    const offenders: string[] = [];
    for (const file of corpusFiles(PROJECT)) {
      const rel = repoRel(file);
      if (CORPUS_EXEMPTIONS.has(rel)) continue;
      const content = readFileSync(file, "utf-8");
      if (OLD_TOOL_PATTERN.test(content)) {
        offenders.push(rel);
      }
    }
    expect(offenders).toEqual([]);
  });

  test("no old-prefix wildcard reference remains in living docs", () => {
    const offenders: string[] = [];
    for (const file of corpusFiles(PROJECT)) {
      const rel = repoRel(file);
      if (WILDCARD_EXEMPTIONS.has(rel)) continue;
      const content = readFileSync(file, "utf-8");
      if (OLD_WILDCARD_PATTERN.test(content)) {
        offenders.push(rel);
      }
    }
    expect(offenders).toEqual([]);
  });
});
// ─── Dead-surface deletion (corpus check) ────────────────────────────

// The eight tools the overhaul deleted plus the guidelines machinery
// identifiers. Unlike the rename sweep above, the names are written
// literally: this sweep has no old-to-new mapping to collapse, and this
// file is its own exemption (the sweep must not eat itself).
const DELETED_SURFACE_NAMES = [
  "tw_resolve",
  "tw_assert_kind",
  "tw_map_tasks",
  "tw_map_tick",
  "tw_slices",
  "tw_set_slices",
  "get_guidelines",
  "list_guidelines",
  "discoverGuidelines",
  "guidelinesCache",
  "shouldInjectGuidelines",
  "guidelineDisplayPath",
  "EXT_TO_LANG",
  "SMELL_BASELINE",
];
const DELETED_SURFACE_PATTERN = new RegExp(`\\b(${DELETED_SURFACE_NAMES.join("|")})\\b`);

// Historical-record exemptions (the arch spec's zero-references contract):
// documents that record the deleted surface as it was keep the names that
// were live when written. Archived task trees are already skipped wholesale
// by the corpus walk's archive rule; pending changeset entries are release
// notes for the removal and name the removed tools by necessity.
const DEAD_SURFACE_EXEMPT_FILES = new Set([
  "docs/tasks/CHANGELOG.md",
  "docs/tasks/maps/task-tools-overhaul/map.md",
  "docs/tasks/task-tools-overhaul/spec.md",
  "docs/tasks/overhaul-synthesis-grilling/task.md",
  "docs/migration-target.yaml",
  "rewrite-plan.md",
  "tests/skills.test.ts",
]);
const DEAD_SURFACE_EXEMPT_PREFIXES = [
  "docs/ideas/",
  ".changeset/",
  "docs/tasks/overhaul-dead-surface/",
  "docs/tasks/overhaul-execution-skills/",
  "docs/tasks/tool-surface-inventory/",
  "docs/tasks/workflow-tool-usage-audit/",
  // The effort that retires the v4 surface keeps the retired names in its own
  // record: a finding, a ticket, or an amendment that names a deleted tool to
  // retire it is a historical record, the same class as an archived tree.
  "docs/tasks/enforced-workflow-v5/",
];

describe("workflow feedback routes through tw_feedback", () => {
  // `tw_feedback` is the one place the workflow label is applied: it reads the
  // installed `submit_feedback` schema and passes either a `workflow` source or
  // a `workflow.` kind. A file that still sends the model to `submit_feedback`
  // for workflow feedback bypasses that, and a file that gives `kind` guidance
  // without naming `tw_feedback` documents a call the phase does not make. This
  // file names the banned forms on purpose, the same exemption the dead-surface
  // check takes.
  const ROUTING_EXEMPT = new Set(["tests/skills.test.ts"]);
  // Pending release notes and the migration target describe the surface they
  // replace, the same historical record class the dead-surface check exempts.
  const ROUTING_EXEMPT_PREFIXES = [".changeset/"];
  const BYPASS = /submit_feedback\(\{\s*kind:|`submit_feedback\(\{ kind/;

  const corpus = (): { rel: string; text: string }[] =>
    corpusFiles(PROJECT)
      .map((file) => repoRel(file))
      .filter((rel) => !ROUTING_EXEMPT.has(rel))
      .filter((rel) => !ROUTING_EXEMPT_PREFIXES.some((p) => rel.startsWith(p)))
      .map((rel) => {
        try {
          return { rel, text: readFileSync(join(PROJECT, rel), "utf-8") };
        } catch {
          return { rel, text: "" }; // a binary file cannot carry prose
        }
      });

  test("no file sends the model to submit_feedback for workflow feedback", () => {
    const offenders = corpus()
      .filter(({ text }) => BYPASS.test(text))
      .map(({ rel }) => rel);
    expect(offenders).toEqual([]);
  });

  test("every file that gives kind guidance names tw_feedback", () => {
    const offenders = corpus()
      .filter(({ text }) => text.includes("`kind` is") && !text.includes("tw_feedback"))
      .map(({ rel }) => rel);
    expect(offenders).toEqual([]);
  });
});

describe("dead surface deletion (corpus check)", () => {
  test("no deleted tool or guidelines machinery identifier remains outside the historical exemptions", () => {
    const offenders: string[] = [];
    for (const file of corpusFiles(PROJECT)) {
      const rel = repoRel(file);
      if (DEAD_SURFACE_EXEMPT_FILES.has(rel)) continue;
      if (DEAD_SURFACE_EXEMPT_PREFIXES.some((p) => rel.startsWith(p))) continue;
      if (DELETED_SURFACE_PATTERN.test(readFileSync(file, "utf-8"))) {
        offenders.push(rel);
      }
    }
    expect(offenders).toEqual([]);
  });

  test("the guidelines discovery skip-list identifier is gone from the extension source", () => {
    // SKIP_DIRS is a generic identifier (vendored tooling carries its own);
    // guidelines discovery was its sole user in src/, so the check is
    // scoped to the extension source.
    const offenders: string[] = [];
    for (const file of corpusFiles(join(PROJECT, "src"))) {
      if (/\bSKIP_DIRS\b/.test(readFileSync(file, "utf-8"))) {
        offenders.push(repoRel(file));
      }
    }
    expect(offenders).toEqual([]);
  });
});

// ─── Planning skills v4 (overhaul-planning-skills) ──────────────────

// The tool names the new planning prose may reference: the surviving surface
// after the overhaul rename.
const SURVIVING_TOOLS = new Set([
  // v4 surface.
  "tw_show",
  "tw_get",
  "tw_mark_done",
  "tw_write_section",
  "tw_finalize_map",
  "tw_list",
  "tw_frontier",
  "tw_dependency_levels",
  "tw_finalizable",
  "tw_map_finalizable",
  "tw_resolve_uncertainty",
  "tw_state",
  "tw_state_set",
  "tw_context",
  // The v5 named-transition and disclosure tools as they landed:
  // disclosure-open-close-core (tw_open, tw_close, tw_next),
  // implementation-transition-tools (tw_mark_blocked,
  // tw_record_out_of_scope, tw_add_ticket, tw_split_ticket,
  // tw_write_spec, tw_finalize_map, tw_write_section), and
  // to-tickets-architecture (tw_write_architecture), and
  // implementation-transition-tools (tw_write_changelog, tw_archive_effort).
  "tw_open",
  "tw_close",
  "tw_next",
  "tw_mark_blocked",
  "tw_record_out_of_scope",
  "tw_add_ticket",
  "tw_split_ticket",
  "tw_write_spec",
  "tw_finalize_map",
  "tw_write_section",
  "tw_write_architecture",
  "tw_write_changelog",
  "tw_archive_effort",
  // finalize-effort-skill: the review writer and the origin_effort
  // argument of the effort creator.
  "tw_write_review",
  "tw_create_effort",
  // end-of-effort-reconciliation: the ticket doc's implementation-notes
  // writer, the named replacement for the built-in edit on a ticket.
  "tw_write_ticket_note",
  // intake-skill: task creation is the front door's and the planning phase's
  // shared tool, and the planning prose names it for the fog promotion.
  "tw_add_task",
  // lifecycle-hardening: the planning task's record writer, the named
  // replacement for the shell append the grilling resource needed.
  "tw_write_task_note",
  // migration-tool (tw-migrate-tool): the migration executor the
  // setup-workflow phase discloses; the skill prose and its docs page name
  // it from reroute-migrate-branch on.
  "tw_migrate",
  // tw-feedback: the labelled route into the telemetry store, disclosed by
  // every phase, so the feedback prose names it rather than submit_feedback.
  "tw_feedback",
  // request-tool-approval: the sanctioned route to a tool a phase does not
  // disclose. Always declared, so phase prose names it where it states the rule.
  "tw_request_tool",
]);

function toolNamesIn(content: string): string[] {
  return [...content.matchAll(/\btw_[a-z_]+\b/g)].map((m) => m[0]);
}

/** Assert every tw_* tool named in a prose text is in the surviving set. */
function expectOnlySurvivingTools(content: string): void {
  for (const name of toolNamesIn(content)) {
    expect(SURVIVING_TOOLS.has(name), name).toBe(true);
  }
}

// The YAML frontmatter templates a skill's prose carries: fenced blocks whose
// first line is the opening `---` fence.
function extractFrontmatterTemplates(content: string): string[] {
  const out: string[] = [];
  const fence = /```[^\n]*\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = fence.exec(content)) !== null) {
    if (m[1].startsWith("---")) out.push(m[1]);
  }
  return out;
}

// The killed v3 fields: no producer template may carry them.
const KILLED_KEYS = new Set(["kind", "slug", "map", "slices"]);

function frontmatterKeys(template: string): string[] {
  const keys: string[] = [];
  for (const line of template.split("\n").slice(1)) {
    const trimmed = line.trim();
    if (trimmed === "---") break;
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;
    keys.push(trimmed.slice(0, colonIdx).trim());
  }
  return keys;
}

/** Substitute the prose placeholders so a template parses as real frontmatter. */
function substituteTemplate(template: string): string {
  return template
    .replace(/\[[^\]]*<[^>]*>[^\]]*\]/g, "[]")
    .replace(/<[^>]+>/g, "example");
}

/** Assert one substituted template passes the repo's conformance chain. */
function assertTemplateConforms(template: string): void {
  const doc = parse(substituteTemplate(template));
  const art = fromFrontmatter(doc.data, "fixture");
  const anomalies = [...validateArtifact(art), ...findAnomalies([art])];
  expect(anomalies).toEqual([]);
}

function wayfinderFile(rel: string): string {
  return readFile(join("skills/engineering/wayfinder", rel));
}

describe("wayfinder v4 (overhaul-planning-skills)", () => {
  const content = readFile("skills/engineering/wayfinder/SKILL.md");
  const templates = extractFrontmatterTemplates(content);
  const mapTemplate = templates.find((t) => /^type: map$/m.test(t))!;
  const taskTemplate = templates.find((t) => /^type: task$/m.test(t))!;

  test("map template carries the v4 fields and no killed keys", () => {
    expect(mapTemplate).toBeDefined();
    const keys = frontmatterKeys(mapTemplate);
    expect(keys).toContain("type");
    expect(keys).toContain("title");
    expect(keys).toContain("status");
    for (const killed of KILLED_KEYS) expect(keys).not.toContain(killed);
  });

  test("decision-task template carries the v4 fields and no killed keys", () => {
    expect(taskTemplate).toBeDefined();
    const keys = frontmatterKeys(taskTemplate);
    expect(keys).toContain("type");
    expect(keys).toContain("subtype");
    expect(keys).toContain("title");
    expect(keys).toContain("status");
    expect(keys).toContain("workflow_state");
    expect(keys).toContain("blocked_by");
    for (const killed of KILLED_KEYS) expect(keys).not.toContain(killed);
  });

  test("map sits at the effort root and tasks under the effort's tasks/ subtree", () => {
    expect(content).toMatch(/docs\/tasks\/<effort>\/map\.md/);
    expect(content).toMatch(/docs\/tasks\/<effort>\/tasks\/<task-slug>\/task\.md/);
    // The maps/ subtree is gone from the target layout.
    expect(content).not.toMatch(/docs\/tasks\/maps/);
  });

  test("sets the state pointers on map creation", () => {
    expect(content).toContain("tw_state_set map <effort-slug>");
    expect(content).toMatch(/tw_state_set task null/);
  });

  test("sets the state pointers on resume", () => {
    expect(content).toContain("tw_state_set task <task-slug>");
  });

  test("names intake as the owner of the effort and the root index", () => {
    // The front door creates the map and registers the effort; the planning
    // phase fills the map. Prose that tells wayfinder to create or register an
    // effort sends it to a tool it does not hold (and should not hold).
    expect(content).toContain("`intake` creates the");
    expect(content).not.toMatch(/Register the effort in the root index/);
    expect(content).not.toMatch(/Create the map at/);
  });

  test("frontier prose runs tw_frontier over the effort", () => {
    expect(content).toContain("tw_frontier <effort-slug>");
    expect(content).toMatch(/ready when every task in its .blocked_by. list is done/);
  });

  test("telemetry names the effort directory, not the maps subtree", () => {
    expect(content).toMatch(/effort slug/);
    expect(content).not.toContain("docs/tasks/maps/");
  });

  test("references only surviving tools", () => {
    expectOnlySurvivingTools(content);
  });

  test("every frontmatter template conforms by construction", () => {
    for (const template of templates) {
      assertTemplateConforms(template);
    }
  });
});

describe("wayfinder planning resources v4", () => {
  test("each planning resource's task template carries its v4 subtype", () => {
    for (const subtype of ["research", "prototype", "grilling", "manual"]) {
      const content = wayfinderFile(join("resources", `${subtype}.md`));
      const templates = extractFrontmatterTemplates(content);
      expect(templates.length).toBeGreaterThan(0);
      // The merged resources may carry other templates (findings); the task
      // template is the one pinned to the subtype.
      const taskTemplate = templates.find((t) => /^type: task$/m.test(t));
      expect(taskTemplate, `${subtype} resource carries a type: task template`).toBeDefined();
      expect(frontmatterKeys(taskTemplate!)).toContain("subtype");
      expect(taskTemplate).toMatch(new RegExp(`^subtype: ${subtype}$`, "m"));
      assertTemplateConforms(taskTemplate!);
    }
  });
});

// ─── wayfinder v5: the absorbed planning phase (wayfinder-reconcile-and-passes) ──

describe("wayfinder v5 (wayfinder-reconcile-and-passes)", () => {
  const content = readFile("skills/engineering/wayfinder/SKILL.md");

  test("wayfinder is user-invoked with the correct frontmatter", () => {
    const fm = parseFrontmatter(content);
    expect(fm["name"]).toBe("wayfinder");
    expect(fm["disable-model-invocation"]).toBe("true");
  });

  test("the skill opens through tw_open and releases the pass through tw_close", () => {
    expect(content).toMatch(/tw_open/);
    expect(content).toMatch(/tw_close wayfinder/);
  });

  test("a pass is bounded to one frontier snapshot and at most one grilling", () => {
    expect(content).toMatch(/one frontier snapshot/i);
    expect(content).toMatch(/at most one grilling/i);
  });

  test("a pass works the non-grilling ready tasks, then runs exactly one grilling", () => {
    expect(content).toMatch(/non-grilling ready tasks/i);
    expect(content).toMatch(/exactly one grilling/i);
  });

  test("planning work is serialized per kind", () => {
    expect(content).toMatch(/never two grillings at once/i);
    expect(content).toMatch(/research and prototype\s+may run concurrently/i);
  });

  test("a pass releases and never rolls into the next frontier", () => {
    expect(content).toMatch(/never rolls into the next frontier/i);
    expect(content).toMatch(/releases?/i);
  });

  test("an empty ready frontier triggers the reconcile step", () => {
    expect(content).toMatch(/when the snapshot's ready frontier is empty/i);
    expect(content).toMatch(/the pass runs the reconcile step/i);
  });

  test("the reconcile sets the ready flag only through tw_finalize_map", () => {
    expect(content).toMatch(/tw_finalize_map/);
    expect(content).toMatch(/only setter of/i);
    expect(content).toMatch(/Never set the flag any other way/i);
  });

  test("tw_finalize_map refuses naming every missing item", () => {
    expect(content).toMatch(/naming\s+every\s+missing\s+item/i);
  });

  test("every planning task writes its results back before marking itself done", () => {
    expect(content).toMatch(/writes its own results back to the map through\s+`tw_write_section` as its final step/i);
    expect(content).toMatch(/before it marks itself done with\s+`tw_mark_done`/i);
  });

  test("the write-back pointer convention: the map must reference the task slug", () => {
    expect(content).toMatch(/referencing the task's slug as a stand-alone token/i);
    expect(content).toMatch(/`tw_mark_done` refuses the\s+done-marking while the map does not reference the task/i);
  });

  test("wayfinder never re-synthesizes decisions from task bodies", () => {
    expect(content).toMatch(/never re-synthesizes decisions from task bodies/i);
  });

  test("a done-marking clears the flag, so post-reconcile plan changes force one more pass", () => {
    expect(content).toMatch(/A done-marking clears\s+a set ready flag/i);
    expect(content).toMatch(/forces one more\s+pass/i);
  });

  test("planning resources consolidate under wayfinder/resources; the implementation router carries none", () => {
    for (const subtype of ["research", "prototype", "grilling", "manual"]) {
      expect(existsSync(join(PROJECT, `skills/engineering/wayfinder/resources/${subtype}.md`))).toBe(true);
      expect(existsSync(join(PROJECT, `skills/engineering/implement-ticket/resources/${subtype}.md`))).toBe(false);
    }
  });

  test("each planning resource carries the write-back pointer convention and the done-marking order", () => {
    for (const subtype of ["research", "prototype", "grilling", "manual"]) {
      const content = readFile(`skills/engineering/wayfinder/resources/${subtype}.md`);
      expect(content).toMatch(/tw_write_section/);
      expect(content).toMatch(/tw_mark_done\b/);
      expect(content).toMatch(/stand-alone token/i);
    }
  });

  test("the grilling resource creates the task document and delegates the method to the grilling skill", () => {
    const content = readFile("skills/engineering/wayfinder/resources/grilling.md");
    expect(content).toMatch(/`grilling` skill/);
    expect(content).not.toMatch(/one question at a time/i);
    expect(content).not.toMatch(/answer on[\s\S]*behalf/i);
  });
});

// ─── Conformance seam: fixture efforts built from the prose templates ──

const WAYFINDER_DIR = "skills/engineering/wayfinder";

function writeFm(base: string, rel: string, frontmatter: string, body = "body text\n"): string {
  const p = join(base, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, `${frontmatter.trimEnd()}\n${body}`, "utf-8");
  return p;
}

/** The wayfinder map template extracted from the skill's prose. */
function wayfinderMapTemplate(): string {
  return extractFrontmatterTemplates(readFile(join(WAYFINDER_DIR, "SKILL.md")))
    .find((tpl) => /^type: map$/m.test(tpl))!;
}

/** Assemble a v4 effort on a temp tree from the extracted prose templates. */
function buildFixtureEffort(t: string): string {
  const taskTemplate = extractFrontmatterTemplates(
    wayfinderFile(join("resources", "research.md")),
  )[0]!;
  writeFm(t, "docs/tasks/demo/map.md", substituteTemplate(wayfinderMapTemplate()));
  writeFm(t, "docs/tasks/demo/tasks/first-question/task.md", substituteTemplate(taskTemplate));
  return "demo";
}

/** Scan a fixture tree's artifact files the way the scan layer does. */
function fixtureArtifacts(t: string, rels: string[]): Artifact[] {
  return rels.map((rel) => {
    const doc = parse(readFileSync(join(t, rel), "utf-8"));
    const dirName = rel.split("/").at(-2)!;
    const art = fromFrontmatter(doc.data, dirName);
    art.path = join(t, rel);
    return art;
  });
}

/** The doctor's bash sweep as a predicate: frontmatter presence + non-empty type. */
function sweepIssues(text: string): string[] {
  const lines = text.split("\n");
  if (lines[0]?.trim() !== "---") return ["no frontmatter"];
  const issues: string[] = [];
  let sawType = false;
  for (const line of lines.slice(1)) {
    if (line.trim() === "---") break;
    if (/^type:[ \t]*$/.test(line)) issues.push("empty type");
    if (/^type:\s*\S/.test(line)) sawType = true;
  }
  if (!sawType) issues.push("no type");
  return issues;
}

describe("conformance seam: fixture efforts from the prose templates", () => {
  test("wayfinder's map plus task tree produces zero anomalies", () => {
    const t = mkdtempSync(join(tmpdir(), "okf-fixture-"));
    try {
      const effort = buildFixtureEffort(t);
      const rels = [`docs/tasks/${effort}/map.md`, `docs/tasks/${effort}/tasks/first-question/task.md`];
      for (const rel of rels) expect(existsSync(join(t, rel))).toBe(true);
      const anomalies = findAnomalies(fixtureArtifacts(t, rels));
      expect(anomalies).toEqual([]);
    } finally {
      rmSync(t, { recursive: true, force: true });
    }
  });

  test("resume: state pointers set from an existing effort read back", async () => {
    const t = mkdtempSync(join(tmpdir(), "okf-fixture-"));
    try {
      buildFixtureEffort(t);
      const tools = createTools();
      const ctx = { directory: t } as any;
      await tools.tw_state_set.execute({ field: "map", value: "demo" }, ctx);
      await tools.tw_state_set.execute({ field: "task", value: "first-question" }, ctx);
      const out = await tools.tw_state.execute({}, ctx);
      expect(out).toMatch(/map:\s+demo/);
      expect(out).toMatch(/task:\s+first-question/);
      // Clearing the task pointer is the create-time counterpart.
      await tools.tw_state_set.execute({ field: "task", value: "null" }, ctx);
      const cleared = await tools.tw_state.execute({}, ctx);
      expect(cleared).toMatch(/task:\s+\(none\)/);
    } finally {
      rmSync(t, { recursive: true, force: true });
    }
  });

  test("a planted invalid pair is reported by findAnomalies", () => {
    const t = mkdtempSync(join(tmpdir(), "okf-fixture-"));
    try {
      const effort = buildFixtureEffort(t);
      const taskTemplate = extractFrontmatterTemplates(
        wayfinderFile(join("resources", "research.md")),
      )[0]!;
      // status: draft pairs only with workflow_state: todo; this fixture
      // pairs draft with done, the exact combination rule the doctor reads.
      const planted = substituteTemplate(taskTemplate)
        .replace(/^status: stable$/m, "status: draft")
        .replace(/^workflow_state: ready$/m, "workflow_state: done");
      writeFm(t, `docs/tasks/${effort}/tasks/planted/task.md`, planted);
      const anomalies = findAnomalies(fixtureArtifacts(t, [
        `docs/tasks/${effort}/map.md`,
        `docs/tasks/${effort}/tasks/first-question/task.md`,
        `docs/tasks/${effort}/tasks/planted/task.md`,
      ]));
      expect(anomalies.map((a) => a.kind)).toContain("invalid-combination");
      expect(anomalies.some((a) => a.detail.includes("draft") && a.detail.includes("done"))).toBe(true);
    } finally {
      rmSync(t, { recursive: true, force: true });
    }
  });

  test("a planted type-less file is flagged by the sweep predicate", () => {
    const t = mkdtempSync(join(tmpdir(), "okf-fixture-"));
    try {
      const effort = buildFixtureEffort(t);
      // Frontmatter present but no type: fromFrontmatter throws, the scan
      // skips the file silently, and the doctor's bash sweep is what finds it.
      writeFm(t, `docs/tasks/${effort}/tasks/typeless/task.md`, "---\ntitle: Typeless\n---\n");
      const issues = sweepIssues(readFileSync(join(t, `docs/tasks/${effort}/tasks/typeless/task.md`), "utf-8"));
      expect(issues).toContain("no type");
      expect(() => fromFrontmatter(parse(readFileSync(join(t, `docs/tasks/${effort}/tasks/typeless/task.md`), "utf-8")).data, "typeless")).toThrow();
    } finally {
      rmSync(t, { recursive: true, force: true });
    }
  });
});

// ─── to-spec v4 (overhaul-planning-skills) ───────────────────────────

describe("to-spec v4 (overhaul-planning-skills)", () => {
  const content = readFile("skills/engineering/to-spec/SKILL.md");
  const templates = extractFrontmatterTemplates(content);
  const specTemplate = templates.find((t) => /^type: spec$/m.test(t))!;

  test("spec template carries type, title, status and no killed keys", () => {
    expect(specTemplate).toBeDefined();
    const keys = frontmatterKeys(specTemplate);
    expect(keys).toContain("type");
    expect(keys).toContain("title");
    expect(keys).toContain("status");
    expect(keys).not.toContain("workflow_state");
    for (const killed of KILLED_KEYS) expect(keys).not.toContain(killed);
  });

  test("saves at the effort root", () => {
    expect(content).toMatch(/docs\/tasks\/<effort>\/spec\.md/);
    // The bare pre-v4 path is gone from the prose and the description.
    expect(content).not.toMatch(/docs\/tasks\/spec\.md/);
  });

  test("the description frontmatter names the effort-root path", () => {
    const fm = parseFrontmatter(content);
    expect(String(fm["description"])).toContain("docs/tasks/<effort>/spec.md");
  });

  test("draft while synthesizing, stable once the user approves", () => {
    expect(specTemplate).toMatch(/# stable once the user approves the spec/);
    expect(content).toMatch(/approves the spec|user approves/i);
  });

  test("every frontmatter template conforms by construction", () => {
    for (const template of templates) assertTemplateConforms(template);
  });

  test("a spec-only effort at planning time produces zero anomalies", () => {
    const t = mkdtempSync(join(tmpdir(), "okf-spec-only-"));
    try {
      writeFm(t, "docs/tasks/spec-only/spec.md", substituteTemplate(specTemplate));
      const anomalies = findAnomalies(fixtureArtifacts(t, ["docs/tasks/spec-only/spec.md"]));
      expect(anomalies).toEqual([]);
    } finally {
      rmSync(t, { recursive: true, force: true });
    }
  });
});

// ─── to-tickets v4 (overhaul-planning-skills) ────────────────────────

describe("to-tickets v4 (overhaul-planning-skills)", () => {
  const content = readFile("skills/engineering/to-tickets/SKILL.md");
  const templates = extractFrontmatterTemplates(content);
  const ticketTemplate = templates.find((t) => /^type: ticket$/m.test(t))!;

  test("ticket template carries the v4 fields and no killed keys", () => {
    expect(ticketTemplate).toBeDefined();
    const keys = frontmatterKeys(ticketTemplate);
    for (const key of ["type", "subtype", "title", "status", "workflow_state", "blocked_by"]) {
      expect(keys).toContain(key);
    }
    expect(keys).toContain("size");
    expect(keys).toContain("mode");
    for (const killed of KILLED_KEYS) expect(keys).not.toContain(killed);
  });

  test("no slice-list field anywhere in the prose", () => {
    expect(content).not.toContain("slices:");
  });

  test("tickets live under the effort's tickets/ subtree", () => {
    expect(content).toMatch(/docs\/tasks\/<effort>\/tickets\/<ticket-slug>\/ticket\.md/);
  });

  test("no map-array registration language", () => {
    expect(content).not.toMatch(/tasks array/i);
    expect(content).not.toMatch(/Register each ticket/i);
    expect(content).not.toMatch(/entry to the map frontmatter/i);
  });

  test("the honest contract: the tools write the tickets and the graph", () => {
    // The v5 transition tools own every write: tw_add_ticket creates the
    // tickets, tw_write_architecture writes the living architecture. The
    // v4 by-hand contract is retired (the write guard refuses hand edits).
    expect(content).toMatch(/tw_add_ticket/);
    expect(content).toMatch(/tw_write_architecture/);
    expect(content).not.toMatch(/written by hand/i);
    expect(content).not.toMatch(/No tw_\* tool (writes|creates)/i);
  });

  test("queries the graph via the surviving tools", () => {
    expect(content).toContain("tw_dependency_levels <effort-slug>");
    expect(content).toContain("tw_frontier <effort-slug>");
    expectOnlySurvivingTools(content);
  });

  test("one-ticket efforts are fine", () => {
    expect(content).toMatch(/one ticket/i);
  });

  test("every frontmatter template conforms by construction", () => {
    for (const template of templates) assertTemplateConforms(template);
  });

  test("a one-off effort (map with exactly one ticket, empty tasks/) produces zero anomalies", () => {
    const t = mkdtempSync(join(tmpdir(), "okf-one-off-"));
    try {
      writeFm(t, "docs/tasks/one-off/map.md", substituteTemplate(wayfinderMapTemplate()));
      writeFm(t, "docs/tasks/one-off/tickets/the-thing/ticket.md", substituteTemplate(ticketTemplate));
      const anomalies = findAnomalies(fixtureArtifacts(t, [
        "docs/tasks/one-off/map.md",
        "docs/tasks/one-off/tickets/the-thing/ticket.md",
      ]));
      expect(anomalies).toEqual([]);
    } finally {
      rmSync(t, { recursive: true, force: true });
    }
  });
});

// ─── to-tickets v5 (to-tickets-architecture) ─────────────────────

describe("to-tickets v5 (to-tickets-architecture)", () => {
  const content = readFile("skills/engineering/to-tickets/SKILL.md");
  const docsPage = readFile("docs/engineering/to-tickets.md");

  test("to-tickets is user-invoked with the correct frontmatter", () => {
    const fm = parseFrontmatter(content);
    expect(fm["name"]).toBe("to-tickets");
    expect(fm["disable-model-invocation"]).toBe("true");
  });

  test("the skill opens through tw_open and releases the phase through tw_close", () => {
    expect(content).toMatch(/tw_open/);
    expect(content).toMatch(/tw_close to-tickets/);
  });

  test("produces the architecture document plus the ticket graph from a spec", () => {
    expect(content).toMatch(/architecture document/i);
    expect(content).toMatch(/ticket graph/i);
    expect(content).toMatch(/from the spec|from a spec|produced from the spec/i);
  });

  test("the architecture inlines the spec's architecture content in full", () => {
    expect(content).toMatch(/inlines? the spec's architecture content in full/i);
  });

  test("the architecture adds exports, existing abstractions, do-not-reimplement, seams, and per-ticket interface contracts", () => {
    expect(content).toMatch(/per-ticket exports/i);
    expect(content).toMatch(/existing abstractions/i);
    expect(content).toMatch(/do-not-reimplement/i);
    expect(content).toMatch(/seams/i);
    expect(content).toMatch(/interface contracts/i);
  });

  test("the architecture is the living document and the spec's architecture content becomes archival", () => {
    expect(content).toMatch(/living architecture/i);
    expect(content).toMatch(/archival/i);
  });

  test("the writer is tw_write_architecture, the only writer of the architecture document", () => {
    expect(content).toMatch(/tw_write_architecture/);
    expect(content).toMatch(/only writer of the architecture document/i);
  });

  test("a note pointing at the architecture is added to spec.md, and nothing is deleted", () => {
    expect(content).toMatch(/note to `spec\.md` pointing at the architecture/);
    expect(content).toMatch(/nothing is deleted|deletes nothing/i);
  });

  test("a bug-only effort produces tickets with no architecture document", () => {
    expect(content).toMatch(/bug-only/i);
    expect(content).toMatch(/no architecture document/i);
    expect(content).toMatch(/skip the architecture/i);
  });

  test("tickets are created through tw_add_ticket in dependency order: creation-order wiring", () => {
    expect(content).toMatch(/tw_add_ticket/);
    expect(content).toMatch(/validates `blocked_by` at creation/i);
    expect(content).toMatch(/dependency order/i);
    // The retired second wiring pass has no mechanism: the write guard
    // refuses hand edits, so the prose must not teach one.
    expect(content).not.toMatch(/second pass/);
    expect(content).not.toMatch(/editing the frontmatter/i);
  });

  test("splits go through tw_split_ticket, not hand edits", () => {
    expect(content).toMatch(/tw_split_ticket/);
  });

  test("the phase ends with a publish write, so the document is stable for implementation", () => {
    expect(content).toMatch(/publish write \(`publish: true`\)/);
    expect(content).toMatch(/stable/);
  });

  test("the prose does not restate the opener preconditions", () => {
    expect(content).not.toMatch(/ready_for_spec/);
  });

  test("references only surviving tools", () => {
    expectOnlySurvivingTools(content);
    expectOnlySurvivingTools(docsPage);
  });

  test("the docs page describes the architecture output and the tool-written tickets", () => {
    expect(docsPage).toMatch(/tw_write_architecture/);
    expect(docsPage).toMatch(/tw_add_ticket/);
    expect(docsPage).toMatch(/architecture document/i);
    expect(docsPage).toMatch(/no architecture document|bug-only/i);
  });

  test("every frontmatter template conforms by construction", () => {
    const templates = extractFrontmatterTemplates(content);
    expect(templates.length).toBeGreaterThan(0);
    for (const template of templates) assertTemplateConforms(template);
  });
});

// ─── to-spec v5 (to-spec-rescope) ─────────────────────────────────────

describe("to-spec v5 (to-spec-rescope)", () => {
  const content = readFile("skills/engineering/to-spec/SKILL.md");
  const docsPage = readFile("docs/engineering/to-spec.md");

  test("the skill opens through tw_open and releases the phase through tw_close", () => {
    expect(content).toMatch(/tw_open/);
    expect(content).toMatch(/tw_close to-spec/);
  });

  test("no seam or architecture interview remains in the prose", () => {
    // The seam interview is gone: the architecture is to-tickets' output and
    // the spec's architecture content is what planning already settled.
    expect(content).not.toMatch(/seam/i);
    expect(content).not.toMatch(/interview/i);
    expect(content).not.toMatch(/Check with the user/i);
    // The docs page carries the same rescope.
    expect(docsPage).not.toMatch(/seams were confirmed/i);
  });

  test("the spec is written through tw_write_spec, the only writer of the spec", () => {
    expect(content).toMatch(/tw_write_spec/);
    expect(content).toMatch(/only writer of the spec/i);
  });

  test("the spec keeps its full section set", () => {
    for (const section of [
      "## Problem Statement",
      "## Solution",
      "## User Stories",
      "## Implementation Decisions",
      "## Testing Decisions",
      "## Out of Scope",
      "## Further Notes",
    ]) {
      expect(content).toContain(section);
    }
  });

  test("the prose does not restate the opener preconditions or the literal ready_for_spec token", () => {
    expect(content).not.toMatch(/ready_for_spec/);
  });

  test("the spec's architecture content is what planning settled, and the archival note comes from the architecture writer", () => {
    expect(content).toMatch(/what planning already settled|the settled record/i);
    expect(content).toMatch(/to-tickets/);
  });

  test("references only surviving tools", () => {
    expectOnlySurvivingTools(content);
    expectOnlySurvivingTools(docsPage);
  });

  test("every frontmatter template conforms by construction", () => {
    const templates = extractFrontmatterTemplates(content);
    expect(templates.length).toBeGreaterThan(0);
    for (const template of templates) assertTemplateConforms(template);
  });
});

// ─── task-workflow-doctor v4 (overhaul-planning-skills) ──────────────

describe("task-workflow-doctor v4 (overhaul-planning-skills)", () => {
  const content = readFile("skills/engineering/task-workflow-doctor/SKILL.md");
  const resourcePath = "skills/engineering/task-workflow-doctor/resources/okf-conformance-failure.md";

  test("gains the OKF conformance symptom row", () => {
    expect(content).toMatch(/OKF conformance/);
    expect(content).toContain("okf-conformance-failure.md");
  });

  test("the conformance resource routes to the migration and the producers", () => {
    const resource = readFile(resourcePath);
    expect(resource).toContain("/skill:setup-workflow");
    expect(resource).toMatch(/migrate/i);
    expect(resource).toContain("/skill:wayfinder");
    expect(resource).toContain("/skill:to-tickets");
    expect(resource).toContain("/skill:to-spec");
    expect(resource).toContain("/skill:finalize-effort");
    for (const file of ["map.md", "task.md", "ticket.md", "spec.md"]) {
      expect(resource).toContain(file);
    }
  });

  test("the conformance resource detects a pre-v4 tree, anomalies, and frontmatter gaps", () => {
    const resource = readFile(resourcePath);
    expect(resource).toMatch(/schema_version/);
    expect(resource).toContain("tw_frontier");
    expect(resource).toMatch(/Anomalies/);
    expect(resource).toMatch(/index\.md/);
    expect(resource).toMatch(/log\.md/);
  });

  test("doctor prose references only surviving tools", () => {
    for (const text of [content, readFile(resourcePath)]) expectOnlySurvivingTools(text);
  });

  test("the missing-scaffolding scope names exactly its two scopes", () => {
    // end-of-effort-reconciliation: the doctor owns what the tools cannot
    // self-diagnose. The scaffold section named the manifest, docs/dev-env.md,
    // docs/testing.md, and docs/adr/ too, and one row said to edit the
    // manifest while the same page says never to edit the tree.
    const section = content.slice(content.indexOf("## Missing scaffolding"), content.indexOf("\n## ", content.indexOf("## Missing scaffolding") + 1));
    expect(section).toMatch(/`CONTEXT\.md`/);
    expect(section).toMatch(/`docs\/tasks\/`/);
    for (const out of ["docs\/dev-env\.md", "docs\/testing\.md", "docs\/adr\/", "package\.json", "pi\.skills", "state\.yaml"]) {
      expect(section, `the scaffold scope still owns ${out}`).not.toMatch(new RegExp(out));
    }
    expect(section).not.toMatch(/edit the manifest/i);
    // The out-of-scope resources are gone, not orphaned.
    for (const gone of [
      "missing-dev-env.md",
      "missing-testing-md.md",
      "missing-adr-dir.md",
      "manifest-misconfigured.md",
      "missing-state-yaml.md",
    ]) {
      expect(existsSync(join(PROJECT, "skills/engineering/task-workflow-doctor/resources", gone)), gone).toBe(false);
    }
  });

  test("missing-tasks-tree resource describes the v4 tree shape", () => {
    const resource = readFile("skills/engineering/task-workflow-doctor/resources/missing-tasks-tree.md");
    expect(resource).toMatch(/map\.md/);
    expect(resource).toMatch(/tasks\//);
    expect(resource).toMatch(/tickets\//);
    expect(resource).toMatch(/state\.yaml/);
    expect(resource).toMatch(/index\.md/);
    // The maps/ subtree is gone from the target layout.
    expect(resource).not.toMatch(/maps\//);
  });
});

// ─── task-workflow-overview v4 (overhaul-planning-skills) ────────────

describe("task-workflow-overview v4 (overhaul-planning-skills)", () => {
  const content = readFile("skills/engineering/task-workflow-overview/SKILL.md");

  test("describes the effort-grouped OKF bundle", () => {
    expect(content).toMatch(/OKF bundle/i);
    expect(content).toMatch(/map\.md/);
    expect(content).toMatch(/spec\.md/);
    expect(content).toMatch(/tasks\//);
    expect(content).toMatch(/tickets\//);
    // end-of-effort-reconciliation retired the interim vocabulary: the two
    // graph kinds are planning tasks and implementation tickets.
    expect(content).toMatch(/planning tasks/i);
    expect(content).not.toMatch(/decision tasks/i);
    expect(content).toMatch(/implementation tickets/i);
  });

  test("carries the wayfinder to to-spec to to-tickets handoff", () => {
    expect(content).toContain("/skill:wayfinder");
    expect(content).toContain("/skill:to-spec");
    expect(content).toContain("/skill:to-tickets");
  });

  test("the tw_slices row is gone; effort-level queries use the graph tools", () => {
    expect(content).not.toContain("tw_slices");
    expect(content).toContain("tw_dependency_levels");
    expect(content).toContain("tw_frontier");
  });

  test("tw_list lists efforts, tasks, and tickets", () => {
    expect(content).toMatch(/List efforts, planning tasks, tickets/);
  });

  test("actions include the doctor row", () => {
    expect(content).toMatch(/Diagnose a broken workflow/i);
    expect(content).toContain("/skill:task-workflow-doctor");
  });

  test("references only surviving tools", () => {
    expectOnlySurvivingTools(content);
  });
});

// ─── Structure facts: registration + full template conformance ───────

describe("planning skills structure facts (overhaul-planning-skills)", () => {
  const FIVE_SKILLS = [
    "skills/engineering/wayfinder/SKILL.md",
    "skills/engineering/to-spec/SKILL.md",
    "skills/engineering/to-tickets/SKILL.md",
    "skills/engineering/task-workflow-doctor/SKILL.md",
    "skills/engineering/task-workflow-overview/SKILL.md",
  ];

  test("the five planning skills are registered in package.json", () => {
    const pkg = JSON.parse(readFile("package.json"));
    for (const dir of ["wayfinder", "to-spec", "to-tickets", "task-workflow-doctor", "task-workflow-overview"]) {
      expect(pkg.pi.skills).toContain(`./skills/engineering/${dir}`);
    }
  });

  test("every frontmatter template across the five skills' prose conforms, no killed keys", () => {
    const files = [
      ...FIVE_SKILLS,
      "skills/engineering/wayfinder/resources/research.md",
      "skills/engineering/wayfinder/resources/prototype.md",
      "skills/engineering/wayfinder/resources/grilling.md",
      "skills/engineering/wayfinder/resources/manual.md",
    ];
    let templateCount = 0;
    for (const file of files) {
      for (const template of extractFrontmatterTemplates(readFile(file))) {
        templateCount++;
        const keys = frontmatterKeys(template);
        for (const killed of KILLED_KEYS) {
          expect(keys, `${file} carries the killed key '${killed}'`).not.toContain(killed);
        }
        assertTemplateConforms(template);
      }
    }
    // The three producers still carry their templates; the doctor and the
    // router produce no artifacts and carry none.
    expect(templateCount).toBeGreaterThanOrEqual(6);
  });
});

describe("mode: human refusal (overhaul-execution-skills)", () => {
  test("the phase hard-refuses autonomous dispatch for a mode: human ticket", () => {
    const content = readFile("skills/engineering/implement-ticket/SKILL.md");
    expect(content).toMatch(/mode: human/);
    expect(content).toMatch(/hard-refuses autonomous dispatch/i);
    // It never dispatches chains for a marked ticket, and it does not fall
    // through to the subtype resource's autonomous pipeline.
    expect(content).toMatch(/never launches subagent chains|never dispatches chains/i);
    expect(content).toMatch(/does not fall through/i);
    // The handoff names the skill invocation for the human to run.
    expect(content).toContain("/skill:implement-ticket <slug>");
    // The refusal is a router rule: it fires before any resource is selected.
    expect(content).toMatch(/before any resource is selected/);
  });

  test.each(["feature", "bug"])("the %s router repeats the refusal rule", (kind) => {
    const content = readFile(`skills/engineering/implement-ticket/resources/${kind}.md`);
    expect(content).toMatch(/mode: human/);
    expect(content).toMatch(/hard-refus|refuse/i);
    expect(content).toContain("/skill:implement-ticket");
  });
});

// ─── Per-ticket chains v4 (overhaul-execution-skills) ────────────────

describe("feature chain v4 (overhaul-execution-skills)", () => {
  const content = readFile("skills/engineering/implement-ticket/resources/feature/autonomous.md");

  test("step 0 reads the ticket (subtype, mode, size) and works the effort frontier", () => {
    expect(content).toContain("tw_frontier <effort-slug>");
    expect(content).toMatch(/docs\/tasks\/<effort>\/tickets\/<ticket-slug>\/ticket\.md/);
    expect(content).toMatch(/subtype, mode, size/i);
  });

  test("the architecture document lives at the effort root and is read, never drafted", () => {
    // v5: the architecture is to-tickets' output; the opener gates on it
    // (stable, architecture.md; the legacy arch-spec.md is tolerated input)
    // and implementation only reads it.
    expect(content).toMatch(/docs\/tasks\/<effort>\/architecture\.md/);
    expect(content).toMatch(/the legacy\n`arch-spec\.md` is a tolerated input/i);
    expect(content).toMatch(/`to-tickets`' output/i);
    expect(content).toMatch(/never a draft step here|never drafted here/i);
    expect(content).toMatch(/the opener has checked/i);
  });

  test("budgets key off the ticket's size with the m default, expressed as timeoutMs", () => {
    expect(content).toMatch(/\|\|\s*"m"/);
    expect(content).toMatch(/s:\s*15/);
    expect(content).toMatch(/m:\s*30/);
    expect(content).toMatch(/l:\s*45/);
    expect(content).toMatch(/xl:\s*60/);
    expect(content).toMatch(/\+50 percent|by 50 percent/i);
    // The retired chain API's turnBudget has no current equivalent; the
    // timeout is the honest lever.
    expect(content).not.toMatch(/turnBudget/);
    expect(content).toMatch(/timeoutMs/);
  });

  test("tickets run one at a time in level order; the levels stay strict barriers", () => {
    expect(content).toContain("tw_dependency_levels <effort-slug>");
    // The loop is serial: the levels are still barriers, and level concurrency
    // is documented behaviour that nothing implements (no worktree mechanism
    // exists; every chain shares the repo working directory).
    expect(content).toMatch(/one at a time/i);
    expect(content).toMatch(/strict barriers/i);
    expect(content).toMatch(/level N\+1 starts only after every ticket in level N has\s+landed/i);
    expect(content, "the concurrency claim is retired: nothing implements it").not.toMatch(/concurrent/i);
    // The gap is named, not silent: worktree isolation is the follow-up seed.
    expect(content).toMatch(/worktree/i);
  });

  test("the chain dispatches tdd, then verify plus deviation gated, then land", () => {
    expect(content).toContain("tdd-worker");
    expect(content).toContain("slice-verifier");
    expect(content).toContain("deviation-reporter");
    expect(content).toContain("land-worker");
    // The chain ships as a pre-canned workflow script; the step order,
    // ok-gates, and keyed calls live there and are pinned by the
    // chain call shapes tests below.
    expect(content).toMatch(/scripts\/ticket-chain\.js/);
    expect(content).toMatch(/ok-gate|ok gate/i);
  });

  test("the chain never marks the ticket done; the inlined close-out owns the marking", () => {
    // The dispatch loop, before the close-out section: no chain step sets the
    // field, the marking has one owner (the close-out).
    const beforeCloseout = content.split("## Step 2b -- The inlined per-ticket close-out")[0];
    expect(beforeCloseout).not.toMatch(/tw_mark_done|tw_set[^)]*workflow_state/);
    expect(beforeCloseout).not.toMatch(/workflow_state.{0,20}done/);
    // The close-out itself marks done (the one-owner rule) and the report
    // hands the effort close to finalize-effort.
    expect(content).toMatch(/tw_mark_done/);
    expect(content).toMatch(/one-owner rule holds|one owner/i);
  });

  test("dispatch points the state file at the ticket", () => {
    expect(content).toContain("tw_state_set task <ticket-slug>");
  });

  test("the end-of-effort wrap-up is a shipped workflow, not parent work", () => {
    expect(content).toMatch(/scripts\/end-of-effort\.js/);
    expect(content).toMatch(/spec-reconciler/);
    expect(content).toMatch(/coherence-refactorer/);
    expect(content).toMatch(/test-runner/);
    // The parent never refactors, never edits the spec, never runs the suite.
    expect(content).not.toMatch(/done directly by you/i);
    expect(content).toMatch(/never\s+refactors/);
  });

  test("uncertainty lives in the ticket directory", () => {
    expect(content).toMatch(/docs\/tasks\/<effort>\/tickets\/<ticket-slug>\/\.work\/uncertainty\.md/);
  });

  test("the uncertainty resolution goes through the scoped tool", () => {
    expect(content).toMatch(/tw_resolve_uncertainty/);
  });

  test("no slice machinery, no ui-noter, no guidelines tool remains", () => {
    expect(content).not.toContain("tw_slices");
    expect(content).not.toMatch(/slices\//);
    expect(content).not.toContain("get_guidelines");
    expect(content).not.toMatch(/ui-noter/);
    expect(content).not.toMatch(/impeccable/i);
  });

  test("references only surviving tools", () => {
    expectOnlySurvivingTools(content);
  });
});

describe("bug chain v4 (overhaul-execution-skills)", () => {
  const content = readFile("skills/engineering/implement-ticket/resources/bug/autonomous.md");

  test("the lean per-ticket chain: tdd, verify, land, gated; no deviation-reporter", () => {
    expect(content).toContain("tdd-worker");
    expect(content).toContain("slice-verifier");
    expect(content).toContain("land-worker");
    expect(content).not.toContain("deviation-reporter");
    expect(content).toMatch(/scripts\/ticket-chain\.js/);
  });

  test("the bug doc and reproduction are referenced from the ticket body", () => {
    expect(content).toMatch(/ticket body/);
    expect(content).toMatch(/docs\/bugs/);
    // The bug frontmatter field is dead: no tool reads it, no prose reads it.
    expect(content).not.toMatch(/tw_get\([^)]*,\s*"bug"\)/);
    expect(content).not.toMatch(/bug: <slug>/);
  });

  test("budgets key off the ticket's size with the m default", () => {
    expect(content).toMatch(/\|\|\s*"m"/);
    expect(content).toMatch(/s:\s*15/);
    expect(content).toMatch(/m:\s*30/);
    expect(content).toMatch(/l:\s*45/);
    expect(content).toMatch(/xl:\s*60/);
    expect(content).not.toMatch(/turnBudget/);
  });

  test("keeps the red-first regression rule and the diagnosing-bugs discipline", () => {
    // The rule lives in the diagnosing-bugs skill; the script only routes the
    // discipline via the skill field and never restates it.
    const diagnosing = readFile("skills/engineering/diagnosing-bugs/SKILL.md");
    expect(diagnosing).toMatch(/regression test .{0,40}before the fix/i);
    const chain = readFile("skills/engineering/implement-ticket/scripts/ticket-chain.js");
    expect(chain).toMatch(/skill: subtype === "bug" \? "diagnosing-bugs" : "tdd"/);
    expect(chain).not.toMatch(/regression test/i);
  });

  test("no slice machinery, no ui-noter, no guidelines tool remains", () => {
    expect(content).not.toContain("tw_slices");
    expect(content).not.toMatch(/slices\//);
    expect(content).not.toMatch(/ui-noter/);
    expect(content).not.toContain("get_guidelines");
    expectOnlySurvivingTools(content);
  });
});

describe("chain call shapes (shipped ticket-chain.js)", () => {
  const resources = [
    "skills/engineering/implement-ticket/resources/feature/autonomous.md",
    "skills/engineering/implement-ticket/resources/bug/autonomous.md",
  ];
  const chain = readFile("skills/engineering/implement-ticket/scripts/ticket-chain.js");

  test.each(resources)("%s launches the shipped chain script, no retired chain API", (file) => {
    const content = readFile(file);
    // The chain is real code now, not inline pseudocode: the resources must
    // launch the shipped script with args instead of composing the chain.
    expect(content).toMatch(/scripts\/ticket-chain\.js/);
    expect(content).toMatch(/async: true/);
    expect(content).toMatch(/args:/);
    expect(content).not.toMatch(/workflowScript/);  // retired field name
    expect(content).not.toMatch(/\bas:\s*"/);      // retired chain-API labels
    expect(content).not.toMatch(/\{outputs\./);     // retired interpolation
    expect(content).not.toMatch(/\(runs\)\s*=>/);   // retired function-wrapper form
    expect(content).toMatch(/implement-preconditions/);
  });

  test("the chain gates preconditions before any worker launches", () => {
    expect(chain).toMatch(/await runs\.run\("gate"/);
    expect(chain).toMatch(/agent: "implement-preconditions"/);
    expect(chain).toMatch(/failed: "gate"/);
    // The gate step precedes the tdd step in the script.
    expect(chain.indexOf('runs.run("gate"')).toBeLessThan(chain.indexOf('runs.run("tdd"'));
  });

  test("refusals are enforced, not trusted: verdicts fail closed and deliverables are host-gated", () => {
    // A child ending its turn with a refusal is a successful run completion,
    // so ok alone can never express refusal (found by probe: the gate child
    // refused a nonexistent ticket and the chain landed it anyway).
    expect(chain).toMatch(/function verdict\(receipt, marker\)/);
    expect(chain).toMatch(/verdict\(gate, "VERDICT: PASS"\)/);
    // Host-run gates verify the deliverables model-independently.
    expect(chain).toMatch(/gate: "test -f " \+ args\.ticketPath/);
    expect(chain).toMatch(/test ! -f " \+ args\.ticketPath\.replace/);
    expect(chain).toMatch(/git rev-parse --verify refs\/heads\/ticket\//);
    expect(chain).toMatch(/git rev-parse --verify refs\/heads\/task\//);
    expect(chain).toMatch(/deviation-reports\/" \+ args\.ticket/);
  });

  test("re-runs pass pointers, never authored instructions", () => {
    // extra is a labeled context-pointer slot, and the resources only ever
    // fill it with paths: the recorded resolution, prior-attempt outputs.
    expect(chain).toMatch(/Additional context, read before starting: /);
    for (const file of resources) {
      const content = readFile(file);
      expect(content).toMatch(/args\.extra/);
      expect(content).not.toMatch(/diagnosis\/fix instructions/);
    }
    // The uncertainty resolution is recorded in the ticket's .work/ and
    // passed as a pointer.
    expect(readFile(resources[0])).toMatch(/\.work\/resolution\.md/);
  });

  test("the chain script uses keyed awaited runs.run, no retired chain API", () => {
    expect(chain).toMatch(/await runs\.run\("tdd"/);
    expect(chain).toMatch(/await runs\.run\("verify"/);
    expect(chain).toMatch(/await runs\.run\("land"/);
    expect(chain).not.toMatch(/\bas:\s*"/);
    expect(chain).not.toMatch(/\{outputs\./);
    expect(chain).not.toMatch(/\(runs\)\s*=>/);
  });

  test("the feature chain fans out with runs.all; the bug chain stays sequential", () => {
    // One script, two shapes: the fan-out sits inside the feature branch,
    // the bug branch verifies through a plain awaited runs.run.
    const [beforeElse, afterElse] = chain.split("} else {");
    expect(chain).toMatch(/subtype === "bug"/);
    expect(beforeElse).toMatch(/runs\.all\(/);
    expect(afterElse).not.toMatch(/runs\.all/);
  });

  test("the chain gates landing and reports failures structurally", () => {
    expect(chain).toMatch(/if \(!pair\[0\]\.ok\)/);
    expect(chain).toMatch(/if \(!pair\[1\]\.ok\)/);
    expect(chain).toMatch(/if \(!verify\.ok\)/);
    expect(chain).toMatch(/failed: "args"/);
    expect(chain).toMatch(/landed: true/);
  });
});

describe("end-of-effort agents", () => {
  test("coherence-refactorer fixes the listed inconsistencies and stops at boundaries", () => {
    const content = readFile("agents/coherence-refactorer.md");
    const fm = parseFrontmatter(content);
    expect(String(fm.tools)).toBe("read, write, edit, bash, submit_feedback, tw_feedback");
    expect(content).toMatch(/listed inconsistencies/i);
    expect(content).toMatch(/Do NOT change API surfaces/i);
    expect(content).toMatch(/REFACTORED/);
    expect(content).toMatch(/STOPPED/);
    expect(content).toMatch(/refactor\(coherence\)/);
  });

  test("test-runner runs the docs/testing.md protocol and never fixes", () => {
    const content = readFile("agents/test-runner.md");
    const fm = parseFrontmatter(content);
    expect(String(fm.tools)).toBe("read, bash, submit_feedback, tw_feedback");
    expect(content).toMatch(/run these always/i);
    expect(content).toMatch(/run if asked/i);
    expect(content).toMatch(/SUITE: GREEN/);
    expect(content).toMatch(/SUITE: RED/);
    expect(content).toMatch(/never invent or guess/i);
    expect(content).toMatch(/never edit/i);
  });

  test("spec-reconciler edits exactly one file: the architecture document", () => {
    const content = readFile("agents/spec-reconciler.md");
    const fm = parseFrontmatter(content);
    expect(String(fm.tools)).toBe("read, edit, submit_feedback, tw_feedback");
    expect(content).toMatch(/architecture\.md/);
    expect(content).toMatch(/exactly one file/i);
    expect(content).toMatch(/Pending update/i);
    expect(content).toMatch(/Final reconcile/i);
    expect(content).toMatch(/RECONCILED/);
    expect(content).toMatch(/FLAGGED/);
  });
});

describe("end-of-effort workflow (shipped end-of-effort.js)", () => {
  const script = readFile("skills/engineering/implement-ticket/scripts/end-of-effort.js");

  test("runs review, spec, coherence, and the suite gate with keyed awaited runs.run", () => {
    expect(script).toMatch(/await runs\.run\("review"/);
    expect(script).toMatch(/await runs\.run\("spec"/);
    expect(script).toMatch(/await runs\.run\("coherence"/);
    expect(script).toMatch(/await runs\.run\("suite"/);
  });

  test("steps are toggleable or input-driven; the suite gate runs last", () => {
    expect(script).toMatch(/args\.review !== false/);
    expect(script).toMatch(/args\.reconcile !== false/);
    expect(script).toMatch(/inconsistencies\.length > 0/);
    expect(script.indexOf('runs.run("suite"')).toBeGreaterThan(script.indexOf('runs.run("coherence"'));
  });

  test("optional tests pass to the test-runner task as numbers", () => {
    expect(script).toMatch(/optionalTests/);
    expect(script).toMatch(/Run if asked/);
  });

  test("the review stays advisory: a failed reviewer never fails the workflow", () => {
    expect(script).toMatch(/reviewOk = review\.ok/);
    expect(script).not.toMatch(/failed: "review"/);
  });

  test("the suite gate and its siblings gate on verdicts, not run completion", () => {
    expect(script).toMatch(/verdict\(spec, "RECONCILED"\)/);
    expect(script).toMatch(/verdict\(coherence, "REFACTORED"\)/);
    expect(script).toMatch(/verdict\(suite, "SUITE: GREEN"\)/);
  });

  test("docs/testing.md carries the test protocol the test-runner reads", () => {
    const content = readFile("docs/testing.md");
    expect(content).toMatch(/## Test protocol/);
    expect(content).toMatch(/Run these always/);
    expect(content).toMatch(/Run if asked/);
  });
});

describe("chain agents v4 (overhaul-execution-skills)", () => {
  test("tdd-worker implements one ticket on a ticket/<slug> working branch", () => {
    const content = readFile("agents/tdd-worker.md");
    expect(content).toMatch(/ticket\/<slug>/);
    expect(content).not.toMatch(/slice\//);
    expect(content).toMatch(/docs\/tasks\/<effort>\/architecture\.md/);
    expect(content).toMatch(/ticket doc/i);
    expect(content).toMatch(/tickets\/<ticket-slug>\/\.work\/uncertainty\.md/);
  });

  test("slice-verifier verifies the ticket from its test plan or the architecture seams", () => {
    const content = readFile("agents/slice-verifier.md");
    expect(content).toMatch(/ticket doc/i);
    expect(content).toMatch(/architecture document's seams|test plan/i);
    expect(content).not.toMatch(/slice doc/i);
  });

  test("land-worker merges the working branch into the landing branch, no archive duty", () => {
    const content = readFile("agents/land-worker.md");
    expect(content).toMatch(/ticket\/<ticket-slug>|ticket\/<slug>/);
    expect(content).toMatch(/task\/<ticket-slug>|task\/<slug>/);
    expect(content).not.toMatch(/slices\/archive|archive the slice/i);
    expect(content).not.toMatch(/state\.yaml/);
    expect(content).toMatch(/finalize/i);
  });

  test("finalize triage keeps planning-artifact and documentary findings informational", () => {
    const content = readFile("skills/engineering/finalize-effort/SKILL.md");
    // D21: a fix under docs/tasks/ cannot be an implementation ticket.
    expect(content).toMatch(/fix lives under `docs\/tasks\/`/);
    expect(content).toMatch(/no writer for them/);
    // D22: a doc finding whose subject already holds does not reopen the effort.
    expect(content).toMatch(/already true in code and tests/);
    expect(content).toMatch(/never converges/);
  });

  test("implement-preconditions gates the chain read-only before any worker", () => {
    const content = readFile("agents/implement-preconditions.md");
    const fm = parseFrontmatter(content);
    // Strict read-only ceiling: file reads plus workflow telemetry only.
    expect(String(fm.tools)).toBe("read, submit_feedback, tw_feedback");
    expect(content).toMatch(/read-only/i);
    expect(content).toMatch(/VERDICT: PASS/);
    expect(content).toMatch(/VERDICT: REFUSE/);
    expect(content).toMatch(/fails closed/i);
    expect(content).toMatch(/type: ticket/);
    expect(content).toMatch(/mode: human/);
    expect(content).toMatch(/subtype/);
    // Schema 5 keeps the defect record in the bug ticket body: the gate must
    // accept a self-contained body and treat separate evidence paths as
    // optional (see lifecycle finding: bug tickets refused at the gate).
    expect(content).toMatch(/defect record/i);
    expect(content).toMatch(/self-contained/i);
    expect(content).toMatch(/optional/i);
    // The refusal is the gate's job; submit_feedback is for workflow
    // friction, not the refusal itself.
    expect(content).toMatch(/not.*for the refusal itself|NOT use it for the refusal itself/i);
  });

  test("deviation-reporter writes frontmattered reports to the ticket directory", () => {
    const content = readFile("agents/deviation-reporter.md");
    // A forked context is the caller's (the orchestrator's), not the
    // tdd-worker's, so this agent must run fresh and read the implementation
    // from the ticket, the architecture, and the diff.
    const fm = parseFrontmatter(content);
    expect(String(fm.defaultContext)).toBe("fresh");
    expect(content).not.toMatch(/Fork from the tdd-worker/);
    expect(content).toMatch(/deviation-reports/);
    expect(content).toMatch(/task\/<ticket-slug>\.\.ticket\/<ticket-slug>/);
    const templates = extractFrontmatterTemplates(content);
    const report = templates.find((t) => /^type: deviation report$/m.test(t));
    expect(report).toBeDefined();
    const keys = frontmatterKeys(report!);
    expect(keys).toContain("type");
    expect(keys).toContain("title");
    expect(keys).toContain("status");
    for (const killed of KILLED_KEYS) expect(keys).not.toContain(killed);
    assertTemplateConforms(report!);
  });
});

describe("failure splits v4 (overhaul-execution-skills)", () => {
  const feature = readFile("skills/engineering/implement-ticket/resources/feature/autonomous.md");
  const bug = readFile("skills/engineering/implement-ticket/resources/bug/autonomous.md");

  test.each([[feature, "feature"], [bug, "bug"]] as const)(
    "the %s toolbelt splits into sub-tickets registered in the effort",
    (content, kind) => {
      expect(content).toMatch(/sub-tickets registered in the effort/i);
      expect(content).toMatch(/docs\/tasks\/<effort>\/tickets\/<sub-ticket-slug>\/ticket\.md/);
      // No ad-hoc slice docs: the split never writes a slices/ file or a
      // split status mark.
      expect(content).not.toMatch(/slices\/\d|status: split/);
    },
  );

  test("the split protocol specifies the sub-ticket frontmatter and wiring", () => {
    expect(feature).toMatch(/inherited subtype|inherits the original's subtype/i);
    expect(feature).toMatch(/size from the diagnosis/i);
    expect(feature).toMatch(/blocked_by[^.]*inherit|inherit[^.]*blocked_by/i);
    expect(feature).toMatch(/chain(s|ing)? between the subs|chained between the subs/i);
  });

  test("the superseded original leaves the graph as deprecated plus done", () => {
    expect(feature).toMatch(/status: deprecated/);
    expect(feature).toMatch(/workflow_state: done/);
    expect(feature).toMatch(/note naming its sub-tickets/i);
  });
});

// ─── Standards direct reads (overhaul-execution-skills) ─────────────

const STANDARDS_FILES = ["AGENTS.md", "CONTEXT.md", "docs/standards.md", "docs/testing.md"];

describe("standards direct reads (overhaul-execution-skills)", () => {
  test("the code-review skill reads standards files directly, no guidelines tool", () => {
    const content = readFile("skills/engineering/code-review/SKILL.md");
    expect(content).not.toContain("get_guidelines");
    for (const file of STANDARDS_FILES) expect(content).toContain(file);
    // The smell baseline stays, named for the sub-agent prompt.
    expect(content).toMatch(/smells\.md/);
  });

  test("the code-review spec sources go v5", () => {
    const content = readFile("skills/engineering/code-review/SKILL.md");
    expect(content).toMatch(/docs\/tasks\/<effort>\/tickets\/<ticket-slug>\/ticket\.md/);
    expect(content).toMatch(/docs\/tasks\/<effort>\/architecture\.md/);
    expect(content).toMatch(/bug doc/i);
    // The old per-task paths are gone.
    expect(content).not.toMatch(/docs\/tasks\/\$\{taskSlug\}|docs\/tasks\/<taskSlug>/);
  });

  test("the code-reviewer agent drops the guidelines tool and reads files directly", () => {
    const content = readFile("agents/code-reviewer.md");
    const fm = parseFrontmatter(content);
    expect(String(fm.tools)).not.toContain("get_guidelines");
    expect(content).not.toContain("get_guidelines");
    for (const file of STANDARDS_FILES) expect(content).toContain(file);
    // The standards reviewer's inner allowlist drops the tool too.
    expect(content).not.toMatch(/tools:\s*read,\s*bash,\s*get_guidelines/);
  });

  test("the tdd-worker reads standards files directly", () => {
    const content = readFile("agents/tdd-worker.md");
    const fm = parseFrontmatter(content);
    expect(String(fm.tools)).not.toContain("get_guidelines");
    expect(content).not.toContain("get_guidelines");
    for (const file of STANDARDS_FILES) expect(content).toContain(file);
  });

  test("the chain tasks carry pointers, not procedure", () => {
    // Procedure lives in the agent definitions and skills (pinned by the
    // agent tests); the composed tasks carry identity, pointers, and the
    // tdd uncertainty anchor only.
    const chain = readFile("skills/engineering/implement-ticket/scripts/ticket-chain.js");
    expect(chain).toMatch(/Ticket doc: /);
    expect(chain).toMatch(/Architecture: docs\/tasks\//);
    expect(chain).toMatch(/uncertainty\.md and stop/);
    expect(chain).not.toMatch(/Before writing code/);
    expect(chain).not.toMatch(/Commit after each GREEN/);
    expect(chain).not.toMatch(/standards files/i);
    expect(chain).not.toMatch(/Run lint and tests/);
    expect(chain).not.toContain("get_guidelines");
    for (const kind of ["feature", "bug"]) {
      const content = readFile(`skills/engineering/implement-ticket/resources/${kind}/autonomous.md`);
      expect(content).not.toContain("get_guidelines");
    }
  });
});

// ─── Planning-type resources v4 touch (overhaul-execution-skills) ────

describe("planning resources v4 touch (overhaul-execution-skills)", () => {
  test.each(["research", "prototype", "grilling", "manual"])(
    "%s marks the task done via the named done tool after the map write-back",
    (subtype) => {
      const content = readFile(`skills/engineering/wayfinder/resources/${subtype}.md`);
      expect(content).toMatch(/tw_write_section/);
      expect(content).toMatch(/tw_mark_done\b/);
      expect(content).not.toContain("tw_set");
      expectOnlySurvivingTools(content);
    },
  );

  test("research captures findings in the task directory with frontmatter", () => {
    const content = readFile("skills/engineering/wayfinder/resources/research.md");
    expect(content).toMatch(/docs\/tasks\/<effort>\/tasks\/<task-slug>\/findings\.md/);
    const templates = extractFrontmatterTemplates(content);
    const findings = templates.find((t) => /^type: findings$/m.test(t));
    expect(findings).toBeDefined();
    const keys = frontmatterKeys(findings!);
    expect(keys).toContain("type");
    expect(keys).toContain("title");
    expect(keys).toContain("status");
    for (const killed of KILLED_KEYS) expect(keys).not.toContain(killed);
    assertTemplateConforms(findings!);
  });
});

// ─── The inlined per-ticket close-out (implement-ticket-skill) ───────

// The retired finalize-task's per-ticket close-out runs inline in
// implement-ticket, in the same autonomous run that lands the ticket. The
// close-out tests above pin the SKILL.md sequence; these pin the resources'
// close-out sections and the one-owner rule across the surface.
describe("the inlined per-ticket close-out (implement-ticket-skill)", () => {
  // One close-out, one home: the sequence lives in SKILL.md's Step 2 and the
  // two resources point at it (end-of-effort-reconciliation collapsed the
  // three copies, which had already drifted).
  const skill = readFile("skills/engineering/implement-ticket/SKILL.md");

  test("the canonical close-out carries every step, including the dropped details", () => {
    expect(skill).not.toContain("tw_set");
    expect(skill).toMatch(/tw_mark_done/);
    expect(skill).toMatch(/one owner/i);
    expect(skill).toContain("tw_finalizable <ticket-slug>");
    expect(skill).toMatch(/anomal/i);
    expect(skill).toMatch(/tw_state_set task null/);
    expect(skill).not.toMatch(/tw_state_set slice/);
    expect(skill).toMatch(/tw_write_changelog/);
    expect(skill).toMatch(/writer of `docs\/tasks\/CHANGELOG\.md`/);
    expect(skill).toMatch(/CI gate/i);
    expect(skill).toMatch(/red branch/i);
    expect(skill).toMatch(/git merge --no-ff task\/<ticket-slug>/);
    // The source of the harvest notes: the feature copy had dropped it.
    expect(skill).toMatch(/all deviation reports/);
    expect(skill).toMatch(/combined diff/);
  });

  for (const kind of ["feature", "bug"]) {
    const content = readFile(`skills/engineering/implement-ticket/resources/${kind}/autonomous.md`);

    test(`the ${kind} resource points at the one close-out instead of copying it`, () => {
      expect(content).toMatch(/close-out sequence has one home/i);
      expect(content).toMatch(/SKILL\.md/);
      // It still names the steps so a reader knows what it is delegating, but
      // it does not re-teach them with their own numbered sequence.
      expect(content).not.toMatch(/\*\*CI gate/);
      expect(content).not.toMatch(/git merge --no-ff task\/<ticket-slug>/);
      expect(content).not.toMatch(/git add -A && git commit -m "docs\(ticket\): harvest/);
    });
  }

  test("neither resource carries a bug-closure step: the bug doc is the spec source", () => {
    const feature = readFile("skills/engineering/implement-ticket/resources/feature/autonomous.md");
    const bug = readFile("skills/engineering/implement-ticket/resources/bug/autonomous.md");
    for (const [label, text] of [
      ["feature", feature],
      ["bug", bug],
    ] as const) {
      expect(text, `${label} still closes a bug doc`).not.toMatch(/status: fixed|fix_commit|docs\/bugs\/archive/);
      expect(text, `${label} never names docs/bugs as a static archive`).toMatch(/docs\/bugs\/` is a static archive/);
    }
    // The bug doc is still the chain's spec source, read from the ticket body.
    expect(bug).toMatch(/ticket body/i);
    expect(bug).not.toContain("bug: <slug>");
  });

  test("only this phase sets a ticket's workflow_state: done (the one-owner rule)", () => {
    const skill = readFile("skills/engineering/implement-ticket/SKILL.md");
    const feature = readFile("skills/engineering/implement-ticket/resources/feature/autonomous.md");
    const bug = readFile("skills/engineering/implement-ticket/resources/bug/autonomous.md");
    for (const text of [skill, feature, bug]) {
      expect(text).toMatch(/one owner|only owner|the one owner of the marking/i);
    }
    // The chain never marks it.
    const chain = readFile("skills/engineering/implement-ticket/scripts/ticket-chain.js");
    expect(chain).toMatch(/is NOT marked done/);
  });
});

// ─── Human-facing docs pages (backfill-skill-docs-pages) ────────────

// The four H2 sections every finished page carries, in order (the AGENTS.md
// docs-page mandate). The two pre-existing pages (eval-review, handoff)
// already conform; the seam pins the whole promoted set.
const DOC_PAGE_SECTIONS = [
  "## What it does",
  "## When to reach for it",
  "## Common questions",
  "## It's working if",
];

/** "./skills/<bucket>/<name>" -> { bucket, name }; pi.skills is the promoted-set single source of truth. */
function promotedSkill(entry: string): { bucket: string; name: string } {
  const parts = entry.split("/");
  return { bucket: parts[2], name: parts[3] };
}

describe("human-facing docs pages (backfill-skill-docs-pages)", () => {
  const pkg = JSON.parse(readFile("package.json"));
  const promoted = (pkg.pi.skills as string[]).map(promotedSkill);

  test("every promoted skill has a docs page", () => {
    const missing: string[] = [];
    for (const { bucket, name } of promoted) {
      const rel = join("docs", bucket, `${name}.md`);
      if (!existsSync(join(PROJECT, rel))) missing.push(rel);
    }
    expect(missing).toEqual([]);
  });

  test("every docs page carries the four sections in order", () => {
    for (const { bucket, name } of promoted) {
      const content = readFile(join("docs", bucket, `${name}.md`));
      const positions = DOC_PAGE_SECTIONS.map((s) => content.indexOf(s));
      expect(
        positions.every((p) => p >= 0),
        `docs/${bucket}/${name}.md is missing one of: ${DOC_PAGE_SECTIONS.join(", ")}`,
      ).toBe(true);
      expect(positions, `docs/${bucket}/${name}.md sections out of order`).toEqual(
        [...positions].sort((a, b) => a - b),
      );
    }
  });

  test("non-promoted buckets have no docs pages", () => {
    // The docs tree mirrors only the two promoted buckets; misc/,
    // in-progress/, and deprecated/ skills get no page.
    for (const bucket of ["misc", "in-progress", "deprecated"]) {
      const dir = join(PROJECT, "skills", bucket);
      if (!existsSync(dir)) continue;
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const mirrored = join(PROJECT, "docs", bucket, `${entry.name}.md`);
        expect(
          existsSync(mirrored),
          `docs page exists for non-promoted skill ${bucket}/${entry.name}`,
        ).toBe(false);
      }
    }
  });

  test("every tw_* tool named in a docs page is a surviving tool", () => {
    for (const { bucket, name } of promoted) {
      expectOnlySurvivingTools(readFile(join("docs", bucket, `${name}.md`)));
    }
  });

  test("the flow pages describe the effort-grouped tree", () => {
    // The effort-grouped path is what distinguishes v4 prose from the v3
    // maps/ subtree: each flow page must name the effort directory shape.
    const flowPages = [
      "wayfinder",
      "to-spec",
      "to-tickets",
      "task-workflow-overview",
      "task-workflow-doctor",
      "implement-ticket",
      "intake",
    ];
    for (const name of flowPages) {
      const content = readFile(join("docs", "engineering", `${name}.md`));
      expect(content, `docs/engineering/${name}.md`).toMatch(/docs\/tasks\/<effort>\//);
    }
  });
});

// ─── overview-doctor-rescope (enforced workflow v5) ──────────────────

// Arch spec entry 19: the overview is the layered explainer with a `tw_next`
// fast track, and the doctor is narrowed to what the tools cannot
// self-diagnose (a legacy tree, missing scaffolding, a failed migration,
// opener-refusal routing). Both stay model-invoked.

// The user-reachable v5 surface: the seven names the ticket pins. The
// overview is the router, so a missing name is a router that lies.
const USER_REACHABLE_V5 = [
  "intake",
  "wayfinder",
  "to-spec",
  "to-tickets",
  "implement-ticket",
  "finalize-effort",
  "setup-workflow",
];

describe("task-workflow-overview v5 (overview-doctor-rescope)", () => {
  const content = readFile("skills/engineering/task-workflow-overview/SKILL.md");
  const page = readFile("docs/engineering/task-workflow-overview.md");

  test("names every user-reachable v5 skill by its invocation", () => {
    for (const name of USER_REACHABLE_V5) {
      expect(content, name).toContain(`/skill:${name}`);
    }
    // The retired routers never reappear in the map.
    for (const retired of ["triage", "implement-task", "finalize-task"]) {
      expect(content).not.toContain(`/skill:${retired}`);
    }
  });

  test("keeps the review on-ramps in the action table", () => {
    // The rescope narrowed the router to the seven phase skills. The review
    // skills are still user-reachable on-ramps, and they must not fall out of
    // the table silently (deviation report, overview-doctor-rescope).
    for (const name of ["eval-review", "skill-review"]) {
      expect(content, name).toContain(`/skill:${name}`);
      expect(page, name).toContain(`/skill:${name}`);
    }
  });

  test("the fast track is the first layer and points at tw_next for the live answer", () => {
    // The fast track answers "what do I run now?" with the live tool, not a
    // restatement of the flow.
    const fastTrack = content.match(/fast track[\s\S]*?(?=\n## )/i)?.[0] ?? "";
    expect(fastTrack).toMatch(/tw_next/);
    expect(fastTrack).toMatch(/live answer/i);
    // It is the first layer, above the story.
    expect(content.indexOf("tw_next")).toBeLessThan(content.indexOf("## The short version"));
  });

  test("the explainer stays layered and progressively disclosed", () => {
    // Layer 1: the fast track. Layer 2: the short story, a stop-anywhere
    // paragraph. Layer 3: the main flow. Deeper still: the linked
    // phase-boundaries reference, never inlined.
    const fast = content.search(/fast track/i);
    const short = content.indexOf("## The short version");
    const main = content.indexOf("## The main flow");
    const deeper = content.indexOf("PHASE-BOUNDARIES.md");
    expect(fast).toBeGreaterThan(-1);
    expect(short).toBeGreaterThan(fast);
    expect(main).toBeGreaterThan(short);
    expect(deeper).toBeGreaterThan(main);
    // The short version is a stopping point, not the whole main flow again.
    expect(main - short).toBeLessThan(1200);
    // The deepest layer stays in the resource: the five context-management
    // options are not restated here.
    expect(content).not.toMatch(/### The five options/i);
    expect(content).toMatch(/resources\/report\.md/);
  });

  test("the docs page carries the same fast track and names the v5 surface", () => {
    expect(page).toContain("tw_next");
    for (const name of USER_REACHABLE_V5) {
      expect(page, name).toContain(`/skill:${name}`);
    }
    // The retired bug substrate is not part of the live surface.
    expect(page).not.toMatch(/docs\/bugs/);
  });
});

describe("task-workflow-doctor v5 (overview-doctor-rescope)", () => {
  const DOCTOR_DIR = "skills/engineering/task-workflow-doctor";
  const RESOURCES_DIR = `${DOCTOR_DIR}/resources`;
  const content = readFile(`${DOCTOR_DIR}/SKILL.md`);
  const page = readFile("docs/engineering/task-workflow-doctor.md");

  test("covers exactly the four scopes the tools cannot self-diagnose", () => {
    // The symptom table groups the diagnosis into the four scopes: a legacy
    // or unversioned tree, missing scaffolding, a failed migration, and an
    // opener refusal.
    expect(content).toMatch(/legacy or unversioned/i);
    expect(content).toMatch(/missing scaffolding/i);
    expect(content).toMatch(/failed migration/i);
    expect(content).toMatch(/opener refus/i);
    for (const resource of [
      "okf-conformance-failure.md",
      "missing-tasks-tree.md",
      "missing-context-md.md",
      "failed-migration.md",
      "opener-refusal.md",
    ]) {
      expect(content, resource).toContain(`resources/${resource}`);
    }
  });

  test("routes legacy trees and failed migrations to the migrate branch", () => {
    const legacy = readFile(`${RESOURCES_DIR}/okf-conformance-failure.md`);
    expect(legacy).toMatch(/schema_version/);
    expect(legacy).toMatch(/less than 5|below 5|pre-v5|not 5/);
    expect(legacy).toContain("/skill:setup-workflow");
    expect(legacy).not.toMatch(/below 4|pre-v4/i);

    const failed = readFile(`${RESOURCES_DIR}/failed-migration.md`);
    expect(failed).toMatch(/migrat/i);
    expect(failed).toMatch(/backup branch/);
    expect(failed).toContain("/skill:setup-workflow");
  });

  test("routes an opener refusal to its legal next call, never fixes it", () => {
    const refusal = readFile(`${RESOURCES_DIR}/opener-refusal.md`);
    // The opener's refusal carries a reason and the legal next calls; the
    // doctor's job is to route to them.
    expect(refusal).toContain("tw_open");
    expect(refusal).toContain("tw_next");
    expect(refusal).toContain("legal_next");
    for (const route of ["intake", "to-tickets", "finalize-effort"]) {
      expect(refusal, route).toContain(route);
    }
    // The refusals the opener returns: unknown effort, missing target,
    // blocked, done, not-ready, and the missing architecture document.
    for (const shape of ["unknown effort", "missing target", "blocked", "done", "architecture"]) {
      expect(refusal.toLowerCase(), shape).toContain(shape);
    }
    // The archive precondition is a thrown error from tw_archive_effort, not
    // an opener refusal: it carries neither `opened: false` nor `legal_next`,
    // so it does not belong in this resource's shapes.
    expect(refusal).not.toContain("undispositioned");
  });

  test("no resource for a retired substrate remains", () => {
    // `docs/bugs/` retires as a live substrate (it survives only as an
    // archive), and the retired routers and slice vocabulary are not part of
    // the v5 language. A resource that named them is removed or repointed.
    expect(existsSync(join(PROJECT, `${RESOURCES_DIR}/missing-bugs-dirs.md`))).toBe(false);
    for (const entry of readdirSync(join(PROJECT, RESOURCES_DIR))) {
      const text = readFile(`${RESOURCES_DIR}/${entry}`);
      for (const retired of [
        "/skill:triage",
        "/skill:implement-task",
        "/skill:finalize-task",
        "docs/bugs",
        "tw_slices",
        "slices/",
        "mode: hitl",
      ]) {
        expect(text, `${entry} names the retired '${retired}'`).not.toContain(retired);
      }
      expect(text, `${entry} uses the retired 'slice' vocabulary`).not.toMatch(/\bslices?\b/i);
    }
    // The skill and its docs page carry the same retirement.
    for (const text of [content, page]) {
      expect(text).not.toMatch(/docs\/bugs/);
      expect(text).not.toMatch(/cannot create.*bugs|bugs cannot be created/i);
    }
  });
});

// ─── workflow-failure: the escalation ladder (create-workflow-failure-skill) ──

// The internals reference (workflow-internals-reference) and the surfaces
// that must point at it. Shared by the workflow-failure block below and the
// reference-coverage-suite further down: one constant names the resource, so
// a rename or a deleted reference fails with the file named.
const INTERNALS_RESOURCE = "skills/engineering/task-workflow-overview/WORKFLOW-INTERNALS.md";
const INTERNALS_RESOURCE_NAME = "WORKFLOW-INTERNALS.md";

// The one place that owns the workflow escalation ladder. The rung order is
// the behavior contract the architecture document fixes: the refusal's own
// answer first, reorientation or doctor routing second, the tw_feedback note
// third, the escalation report last. The canonical-sentence coverage is the
// reference-coverage-suite's seam; this block pins the ladder itself.
describe("workflow-failure skill (create-workflow-failure-skill)", () => {
  const content = readFile("skills/engineering/workflow-failure/SKILL.md");
  const fm = parseFrontmatter(content);
  const report = readFile("skills/engineering/workflow-failure/resources/report.md");

  test("is model-invoked with a trigger-tuned description", () => {
    expect(fm["name"]).toBe("workflow-failure");
    // Model-invoked: a stuck agent auto-invokes it mid-run.
    expect(fm["disable-model-invocation"]).toBeUndefined();
    const description = String(fm["description"]);
    expect(description).toMatch(/workflow/);
    expect(description).toMatch(/refus/i);
    expect(description).toMatch(/stuck/i);
    expect(description).toMatch(/escalat/i);
  });

  test("the ladder walks the four rungs in the fixed order", () => {
    const ladderStart = content.indexOf("## The ladder");
    const ladderEnd = content.indexOf("## Forbidden", ladderStart);
    expect(ladderStart).toBeGreaterThan(-1);
    expect(ladderEnd).toBeGreaterThan(ladderStart);
    const ladder = content.slice(ladderStart, ladderEnd);
    // Rung markers in order, each rung carrying its own contract.
    const rungs = [
      { marker: "1. ", words: ["reason", "legal_next"] },
      { marker: "2. ", words: [INTERNALS_RESOURCE_NAME, "task-workflow-doctor"] },
      { marker: "3. ", words: ["tw_feedback"] },
      { marker: "4. ", words: ["resources/report.md", "ends the run"] },
    ];
    const ats = rungs.map((r) => ladder.indexOf(r.marker));
    for (const at of ats) expect(at).toBeGreaterThan(-1);
    expect(ats).toEqual([...ats].sort((a, b) => a - b));
    for (const [i, rung] of rungs.entries()) {
      // Prose wraps: squeeze whitespace before matching.
      const body = ladder.slice(ats[i], i + 1 < rungs.length ? ats[i + 1] : undefined).replace(/\s+/g, " ");
      for (const word of rung.words) {
        expect(body, `rung ${i + 1} never says '${word}'`).toContain(word);
      }
    }
  });

  test("escalation ends the run; it never blocks mid-run on a question", () => {
    expect(content).toMatch(/never blocks mid-run/i);
    expect(content).not.toMatch(/ask_user_question/);
  });

  test("the forbidden moves are stated", () => {
    const start = content.indexOf("## Forbidden");
    expect(start).toBeGreaterThan(-1);
    const forbidden = content.slice(start).toLowerCase();
    expect(forbidden).toContain("hand-editing");
    expect(forbidden).toContain("skipping a gate");
    expect(forbidden).toContain("workaround");
  });

  test("routes to the internals reference and the doctor, and records the snag with tw_feedback", () => {
    expect(content).toContain(INTERNALS_RESOURCE_NAME);
    expect(content).toContain("task-workflow-doctor");
    expect(content).toContain("tw_feedback");
    // The wrapper is the one workflow-feedback route; the store's own name
    // stays out of the prose.
    expect(content).not.toContain("submit_feedback");
  });

  // The sentence exemption is pinned once, by the reference-coverage-suite
  // below, which asserts both directions against the shared
  // CANONICAL_REFERENCE_SENTENCE constant; this block pins the ladder itself.

  test("is registered in the promoted set", () => {
    const pkg = JSON.parse(readFile("package.json"));
    expect(pkg.pi.skills).toContain("./skills/engineering/workflow-failure");
  });

  test("ships the five-part report resource", () => {
    const parts = [
      "1. What is now true",
      "2. What needs the human",
      "3. What to run next",
      "4. What is broken or blocked",
      "5. One pointer to the detail",
    ];
    const positions = parts.map((part) => report.indexOf(`## ${part}`));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  test("CONTEXT.md gains the ladder vocabulary, each entry with an Avoid line", () => {
    const context = readFile("CONTEXT.md");
    for (const term of ["Ladder", "Escalation rung"]) {
      const at = context.indexOf(`**${term}**:`);
      expect(at, `CONTEXT.md is missing '${term}'`).toBeGreaterThan(-1);
      const next = context.indexOf("\n## ", at);
      const entry = context.slice(at, next === -1 ? context.length : next);
      expect(entry, `CONTEXT.md entry '${term}' has no _Avoid_ line`).toContain("_Avoid_:");
    }
  });
});

// ─── Reference coverage (reference-coverage-suite) ───────────────────

// The reference contract is load-bearing: every promoted SKILL.md and every
// subagent profile carries the one standardized sentence that routes workflow
// trouble to the ladder skill. This constant is the single source of truth
// for the sentence; every check below holds covered text against it verbatim,
// never through a relaxed or paraphrase-tolerant pattern. The sentence
// belongs to the architecture document; the test only mirrors it.
const CANONICAL_REFERENCE_SENTENCE =
  "If a `tw_*` tool or the workflow misbehaves, refuses you, or otherwise surprises you, invoke the `workflow-failure` skill before improvising.";

// Placement is position-heterogeneous by design (the architecture fixes the
// sentence, not its slot): after the operator-communication preamble where
// one exists, else at the top of the body. The suite pins verbatim presence,
// never position, so do not "normalize" placements across files.

describe("canonical reference coverage (reference-coverage-suite)", () => {
  // The manifest is the promoted set (promoted-set seam): a newly promoted
  // skill enters this loop the moment it ships, so shipping without the
  // sentence fails here by construction.
  const promoted = (JSON.parse(readFile("package.json")).pi.skills as string[]).map(promotedSkill);

  test("every promoted SKILL.md except workflow-failure carries the canonical sentence verbatim", () => {
    const offenders: string[] = [];
    for (const { bucket, name } of promoted) {
      if (name === "workflow-failure") continue; // the one exemption: the ladder never references itself
      const rel = join("skills", bucket, name, "SKILL.md");
      if (!readFile(rel).includes(CANONICAL_REFERENCE_SENTENCE)) offenders.push(rel);
    }
    expect(offenders, "these promoted SKILL.md files lost or paraphrased the canonical reference sentence").toEqual([]);
  });

  test("the one exemption holds: workflow-failure does not carry the sentence", () => {
    // The ladder never references itself; the presence loop above skips it,
    // so the absence is asserted here rather than left implicit.
    expect(
      readFile("skills/engineering/workflow-failure/SKILL.md"),
      "the ladder skill must not reference itself through the canonical sentence",
    ).not.toContain(CANONICAL_REFERENCE_SENTENCE);
  });

  test("every subagent profile carries the canonical sentence verbatim", () => {
    const offenders: string[] = [];
    for (const entry of readdirSync(join(PROJECT, "agents"), { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      const rel = join("agents", entry.name);
      if (!readFile(rel).includes(CANONICAL_REFERENCE_SENTENCE)) offenders.push(rel);
    }
    expect(offenders, "these agent profiles lost or paraphrased the canonical reference sentence").toEqual([]);
  });

  test("the internals resource exists under the task-workflow-overview skill", () => {
    expect(
      existsSync(join(PROJECT, INTERNALS_RESOURCE)),
      `${INTERNALS_RESOURCE} is missing: the internals reference was removed or renamed`,
    ).toBe(true);
  });

  test("the overview and the ladder reference the internals resource by name", () => {
    for (const rel of ["skills/engineering/task-workflow-overview/SKILL.md", "skills/engineering/workflow-failure/SKILL.md"]) {
      expect(
        readFile(rel),
        `${rel} no longer references ${INTERNALS_RESOURCE_NAME} by name`,
      ).toContain(INTERNALS_RESOURCE_NAME);
    }
  });
});

// ─── finalize-effort: the effort close (finalize-effort-skill) ──────

// The effort close is a model-invoked phase skill: it opens through tw_open,
// runs one read-only holistic review, triages every finding, creates a
// follow-up only after a human yes (linked by origin_effort), moves the
// findings into it, and archives through the named tool.
describe("finalize-effort skill (finalize-effort-skill)", () => {
  const content = readFile("skills/engineering/finalize-effort/SKILL.md");
  const fm = parseFrontmatter(content);
  const page = readFile("docs/engineering/finalize-effort.md");
  const report = readFile("skills/engineering/finalize-effort/resources/report.md");
  const pkg = JSON.parse(readFile("package.json"));

  test("is a model-invoked skill registered in pi.skills and both READMEs", () => {
    expect(pkg.pi.skills).toContain("./skills/engineering/finalize-effort");
    expect(fm["name"]).toBe("finalize-effort");
    // Model-invoked: the frontmatter carries no disable-model-invocation.
    expect(fm["disable-model-invocation"]).toBeUndefined();
    expect(readFile("skills/engineering/README.md")).toContain(
      "[finalize-effort](./finalize-effort/SKILL.md)",
    );
    expect(readFile("README.md")).toContain(
      "[finalize-effort](./skills/engineering/finalize-effort/SKILL.md)",
    );
  });

  test("opens through tw_open with the effort and closes through tw_close", () => {
    expect(content).toMatch(/skill: "finalize-effort", effort: "<effort-slug>"/);
    expect(content).toContain("tw_close finalize-effort");
  });

  test("runs one holistic review pass and is read-only toward the code", () => {
    expect(content).toMatch(/one holistic review/i);
    expect(content).toMatch(/read-only/i);
    expect(content).toMatch(/never\s+edits, refactors, or lands/i);
    expect(content).toMatch(/does not implement/i);
  });

  test("triages every finding into a ticket, an accepted follow-up, or an informational acceptance", () => {
    expect(content).toMatch(/every finding gets exactly one disposition/i);
    expect(content).toMatch(/in scope/i);
    expect(content).toMatch(/out of scope or too large/i);
    expect(content).toMatch(/informational/i);
    expect(content).toContain("tw_write_review");
    expect(content).toContain("tw_add_ticket");
  });

  test("a follow-up exists only after a human yes, linked by origin_effort, with the review moved", () => {
    expect(content).toMatch(/only after an explicit yes|after the human says yes/i);
    expect(content).toContain("tw_create_effort");
    expect(content).toContain("origin_effort");
    expect(content).toContain("follow_up");
    expect(content).toMatch(/one copy, not two|moved, not copied/i);
  });

  test("archives through the named tool, never the shell", () => {
    expect(content).toContain("tw_archive_effort");
    // The only mention of git mv is the prohibition itself.
    expect(content).toMatch(/never use[\s\S]{0,20}git mv/);
    expect(content).not.toMatch(/^\s*git mv/m);
  });

  test("ships its report resource and a docs page with the four sections", () => {
    expect(report).toContain("## 1. What is now true");
    for (const section of DOC_PAGE_SECTIONS) {
      expect(page, `docs/engineering/finalize-effort.md is missing ${section}`).toContain(section);
    }
  });

  test("references only surviving tools", () => {
    expectOnlySurvivingTools(content);
    expectOnlySurvivingTools(page);
  });

  test("no em-dash in the new prose", () => {
    for (const text of [content, page, report]) {
      expect(text).not.toContain("\u2014");
    }
  });
});

// ─── docs-resync (enforced workflow v5) ──────────────────────────────

// Arch spec entry 20: shipped prose matches shipped v5. Every pin below
// derives the truth from `package.json` `pi.skills` plus each `SKILL.md`'s
// `disable-model-invocation`, or from the migration target's promoted set, so
// a hand-kept list that drifts from the manifest fails here instead of going
// stale in silence.

type PromotedSkill = { bucket: string; name: string; userInvoked: boolean };

/** The promoted set with its invocation model, read from the manifest and the frontmatter. */
function promotedWithInvocation(): PromotedSkill[] {
  const pkg = JSON.parse(readFile("package.json"));
  return (pkg.pi.skills as string[]).map((entry: string) => {
    const { bucket, name } = promotedSkill(entry);
    const fm = parseFrontmatter(readFile(join("skills", bucket, name, "SKILL.md")));
    return { bucket, name, userInvoked: fm["disable-model-invocation"] === "true" };
  });
}

/** The body under one heading, up to the next heading of level 1 to 3. */
function sectionBody(content: string, heading: string): string {
  const at = content.indexOf(heading);
  if (at === -1) throw new Error(`missing heading: ${heading}`);
  const rest = content.slice(at + heading.length);
  const next = rest.search(/\n#{1,3} /);
  return next === -1 ? rest : rest.slice(0, next);
}

/**
 * The skills one section's bullets link to, as `<bucket>/<name>`.
 *
 * The top-level README links `./skills/<bucket>/<name>/SKILL.md`; a bucket
 * README links `./<name>/SKILL.md`, so it passes its own bucket.
 */
function linkedSkills(body: string, bucket?: string): string[] {
  const out: string[] = [];
  for (const m of body.matchAll(/\[[^\]]+\]\(\.\/(?:skills\/)?([^)]+?)\/SKILL\.md\)/g)) {
    out.push(m[1].includes("/") ? m[1] : `${bucket}/${m[1]}`);
  }
  return out;
}

/** One `**Term**:` entry of CONTEXT.md's `## Language` section. */
function languageEntries(content: string): { term: string; body: string }[] {
  return sectionBody(content, "## Language")
    .split(/^(?=\*\*[^*]+\*\*:)/m)
    .filter((block) => /^\*\*[^*]+\*\*:/.test(block))
    .map((block) => ({ term: block.match(/^\*\*([^*]+)\*\*/)![1], body: block }));
}

describe("documentation re-sync (docs-resync)", () => {
  const promoted = promotedWithInvocation();
  const expected = (bucket: string | null, userInvoked: boolean): string[] =>
    promoted
      .filter((s) => s.userInvoked === userInvoked && (bucket === null || s.bucket === bucket))
      .map((s) => `${s.bucket}/${s.name}`)
      .sort();

  test("the top-level README lists exactly the promoted set, grouped by invocation", () => {
    const readme = readFile("README.md");
    expect(linkedSkills(sectionBody(readme, "### User-invoked")).sort()).toEqual(expected(null, true));
    expect(linkedSkills(sectionBody(readme, "### Model-invoked")).sort()).toEqual(expected(null, false));
  });

  for (const bucket of ["engineering", "productivity"]) {
    test(`skills/${bucket}/README.md lists exactly that bucket's promoted set, grouped by invocation`, () => {
      const readme = readFile(`skills/${bucket}/README.md`);
      expect(linkedSkills(sectionBody(readme, "## User-invoked"), bucket).sort()).toEqual(
        expected(bucket, true),
      );
      expect(linkedSkills(sectionBody(readme, "## Model-invoked"), bucket).sort()).toEqual(
        expected(bucket, false),
      );
    });
  }

  test("package.json pi.skills is exactly the promoted set the migration target names", () => {
    // docs/migration-target.yaml is the shipped schema-5 target; the manifest
    // and the target agree, or one of them is lying about what ships.
    const target = parseYaml(readFile("docs/migration-target.yaml")) as {
      promoted_skills: Record<string, string[]>;
    };
    const declared: string[] = [];
    for (const [bucket, names] of Object.entries(target.promoted_skills)) {
      for (const name of names) declared.push(`${bucket}/${name}`);
    }
    expect(declared.sort()).toEqual(promoted.map((s) => `${s.bucket}/${s.name}`).sort());
  });

  const context = readFile("CONTEXT.md");

  // The terms the v5 spec pins: the effort model and its phases, the two graph
  // kinds and their edges, the artifacts each phase writes, and the schema and
  // invocation vocabulary that carries them.
  const CONTEXT_TERMS = [
    "Effort",
    "Front door",
    "Map",
    "Planning task",
    "Implementation ticket",
    "Graph kind",
    "Blocked_by",
    "Frontier",
    "Dependency level",
    "Specification",
    "Architecture",
    "Ready for spec",
    "Review artifact",
    "Disposition",
    "Report",
    "Origin effort",
    "Archive",
    "State pointers",
    "schema_version",
    "Migration",
    "Invocation model",
  ];

  test("CONTEXT.md keeps the glossary shape: one entry per term, each with an _Avoid_ line", () => {
    for (const heading of ["## Language", "## Relationships", "## Flagged ambiguities"]) {
      expect(context, `CONTEXT.md is missing ${heading}`).toContain(heading);
    }
    const entries = languageEntries(context);
    expect(entries.length).toBeGreaterThan(10);
    for (const entry of entries) {
      expect(entry.body, `CONTEXT.md entry '${entry.term}' has no _Avoid_ line`).toContain("_Avoid_:");
    }
  });

  test("CONTEXT.md defines the v5 vocabulary the spec pins", () => {
    const terms = languageEntries(context).map((e) => e.term);
    for (const required of CONTEXT_TERMS) {
      expect(terms, `CONTEXT.md is missing the term '${required}'`).toContain(required);
    }
    expect(context).toContain("schema_version: 5");
  });

  // A retired word may appear only in the compatibility layer: the upgrade
  // resources, the migration prose, the migration module and its legacy
  // tables, and any tool that reads an old shape. CONTEXT.md is the live
  // glossary, so its one exemption is the Migration entry, which records what
  // the reshape renames.
  const RETIRED_WORDS: [string, RegExp][] = [
    ["slice", /\bslices?\b/i],
    ["triage", /\btriage\b/i],
    ["implement-task", /implement-task/],
    ["finalize-task", /finalize-task/],
    ["docs/tasks/maps/", /docs\/tasks\/maps\//],
    ["mode: hitl/afk", /mode:\s*(hitl|afk)\b/i],
    ["arch spec", /arch[-\s]spec(?:\.md)?\b/i],
    [
      "the legacy type value set",
      /\btype:\s*(research|prototype|grilling|manual|feature|bug|arch[-\s]spec)\b/i,
    ],
  ];

  test("CONTEXT.md keeps the retired vocabulary out of the live language", () => {
    const live = [
      sectionBody(context, "## Language")
        .split(/^(?=\*\*[^*]+\*\*:)/m)
        .filter((block) => /^\*\*[^*]+\*\*:/.test(block) && !/^\*\*Migration\*\*:/.test(block))
        .join("\n"),
      sectionBody(context, "## Relationships"),
      sectionBody(context, "## Flagged ambiguities"),
    ].join("\n");
    for (const [label, pattern] of RETIRED_WORDS) {
      expect(live, `'${label}' is still live vocabulary in CONTEXT.md`).not.toMatch(pattern);
    }
  });

  test("no file in the corpus carries an em-dash", () => {
    // AGENTS.md bans em-dashes in this repo's prose, and the check used to name
    // four files, so a new one could never be caught. It runs over the corpus
    // with the same skip rules as the other corpus checks (archived trees,
    // vendored experiment trees, node_modules/.git) and the same historical
    // record exemptions those checks carry, so a planning document or a dated
    // record is skipped rather than repunctuated.
    const offenders: string[] = [];
    for (const file of corpusFiles(PROJECT)) {
      const rel = repoRel(file);
      if (CORPUS_EXEMPTIONS.has(rel) || DEAD_SURFACE_EXEMPT_FILES.has(rel)) continue;
      let text = "";
      try {
        text = readFileSync(file, "utf-8");
      } catch {
        continue; // a binary file cannot carry prose punctuation
      }
      if (text.includes("\u2014")) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });

  test("the top-level README describes the v5 arc", () => {
    const readme = readFile("README.md");
    for (const name of [
      "intake",
      "wayfinder",
      "to-spec",
      "to-tickets",
      "implement-ticket",
      "finalize-effort",
      "setup-workflow",
    ]) {
      expect(readme, `the README never names /skill:${name}`).toContain(`/skill:${name}`);
    }
    // The pre-v5 framing is gone: no v2 title, no retired unit name.
    expect(readme).not.toMatch(/task-workflow v2/i);
    expect(readme).not.toMatch(/\bslices?\b/i);
  });

  test("task-workflow-overview names every user-reachable skill", () => {
    // AGENTS.md: a user-reachable skill is one the model reaches by
    // auto-invocation or the human reaches by typing it, so the router has to
    // name the promoted set, not only the front doors the human must type. It
    // never names itself. Derived, so a newly promoted or re-scoped skill
    // fails here until the router mentions it.
    const overview = readFile("skills/engineering/task-workflow-overview/SKILL.md");
    for (const skill of promoted.filter((s) => s.name !== "task-workflow-overview")) {
      expect(overview, `the overview never names /skill:${skill.name}`).toContain(`/skill:${skill.name}`);
    }
  });
});

// ─── End-of-effort reconciliation (end-of-effort-reconciliation) ─────────────
//
// The end-of-effort review found claims the shipped code does not support. The
// effort documents are the record, so they are amended surgically: the claims
// that are now false change, and the reconciliation itself is recorded as
// arch-spec entry 21. These pins hold the amendments in place.
//
// The effort is closed, so its documents live under docs/tasks/archive/. A pin
// that reads a live effort path breaks the gate the moment that effort
// archives, which is what happened when this effort closed.

describe("end-of-effort reconciliation: the effort documents match the shipped code", () => {
  const archSpec = readFile("docs/tasks/archive/enforced-workflow-v5/architecture.md");
  const spec = readFile("docs/tasks/archive/enforced-workflow-v5/spec.md");
  const implement = readFile("skills/engineering/implement-ticket/SKILL.md");
  const featureResource = readFile("skills/engineering/implement-ticket/resources/feature/autonomous.md");
  const bugResource = readFile("skills/engineering/implement-ticket/resources/bug/autonomous.md");

  test("the ticket loop is documented as serial in the skill and both resources", () => {
    for (const [label, content] of [
      ["implement-ticket SKILL.md", implement],
      ["the feature resource", featureResource],
      ["the bug resource", bugResource],
    ] as const) {
      expect(content, `${label} never says tickets run one at a time`).toMatch(/one at a time/i);
      expect(content, `${label} still claims ticket concurrency`).not.toMatch(/concurrent/i);
    }
  });

  test("the arch spec records the serial loop and the worktree gap as a follow-up seed", () => {
    // The settled "Ticket concurrency" bullet is amended, not restated.
    expect(archSpec).not.toMatch(/Tickets within one dependency level may run\s+concurrently/);
    expect(archSpec).toMatch(/tickets run one at a time|Tickets run one at a time/i);
    // The reconciliation is entry 21, and it carries the follow-up seed.
    expect(archSpec).toMatch(/^21\. \*\*`end-of-effort-reconciliation`\*\*/m);
    const entry = archSpec.slice(archSpec.indexOf("21. **`end-of-effort-reconciliation`**"));
    expect(entry).toMatch(/worktree/i);
    expect(entry.slice(0, 4000)).toMatch(/follow-up/i);
  });

  test("the spec's concurrency story no longer promises an uncorrupted working directory", () => {
    expect(spec).not.toMatch(/shared repo working\s+directory is never corrupted/);
    expect(spec).toMatch(/one ticket at a time/i);
  });

  test("the ready_for_spec auto-clear claims only the writers that exist", () => {
    // No writer can reopen or un-done anything (tw_mark_done and
    // tw_mark_blocked refuse done items, tw_state_set takes pointers only), and
    // blocked_by edges cannot be repaired after creation.
    expect(spec).not.toMatch(/auto-clears\*\* when a planning task is added, reopened/);
    expect(archSpec).not.toMatch(/auto-clear surface is fully landed/);
    expect(spec).toMatch(/reopen[\s\S]{0,200}follow-up|follow-up[\s\S]{0,200}reopen/i);
    expect(archSpec).toMatch(/reopen and edge repair|edge repair/);
    // The amend names the writers that do clear it.
    expect(spec).toMatch(/adding a\s+planning task/i);
    expect(spec).toMatch(/tw_write_section/);
    expect(spec).toMatch(/planning\s+half\s+of `tw_mark_done`|planning `tw_mark_done`|planning done-marking/i);
  });

  test("the one-owner rule names its two sanctioned exceptions", () => {
    // wayfinder's planning-task half of tw_mark_done, and tw_split_ticket's
    // supersede of the original, which the arch spec itself sanctions.
    const rule = implement.slice(implement.indexOf("**Mark the ticket done through `tw_mark_done`**"));
    expect(rule.slice(0, 1200)).toMatch(/wayfinder/i);
    expect(rule.slice(0, 1200)).toMatch(/tw_split_ticket/);
    const archRule = archSpec.slice(archSpec.indexOf("one-owner rule holds with two sanctioned exceptions"));
    expect(archRule.slice(0, 900)).toMatch(/wayfinder/i);
    expect(archRule.slice(0, 900)).toMatch(/tw_split_ticket/);
  });

  test("the report-template claim names the nine run-ending skills instead of claiming all", () => {
    const runEnding = [
      "intake",
      "wayfinder",
      "to-spec",
      "to-tickets",
      "implement-ticket",
      "finalize-effort",
      "setup-workflow",
      "task-workflow-overview",
      "task-workflow-doctor",
    ];
    expect(spec).not.toMatch(/Every workflow skill ends its run with one shared completion report/);
    expect(archSpec).not.toMatch(/\*\*Every workflow skill ends its run with one shared completion report/);
    for (const skill of runEnding) {
      expect(spec, `the spec never names ${skill} in the report coverage`).toMatch(
        new RegExp(`\\b${skill}\\b`),
      );
    }
    expect(spec).toMatch(/nine/i);
    expect(archSpec).toMatch(/nine/i);
  });
});

describe("the overview's read-only table routes to owning phases (end-of-effort-reconciliation)", () => {
  const overview = readFile("skills/engineering/task-workflow-overview/SKILL.md");
  const page = readFile("docs/engineering/task-workflow-overview.md");

  /** The rows of the read-only query table, as [label, cell] pairs. */
  function tableRows(content: string): string[][] {
    const start = content.indexOf("## Read-only queries");
    expect(start, "the overview carries the read-only query section").toBeGreaterThan(-1);
    const section = content.slice(start, content.indexOf("\n## ", start + 1));
    return section
      .split("\n")
      .filter((line) => line.startsWith("|") && !/^\|\s*-+/.test(line) && !/\| Question \|/.test(line))
      .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
      .filter((cells) => cells.length >= 2);
  }

  test("every row names the phase that declares its tool, and tw_next stays directly callable", () => {
    for (const [question, route] of tableRows(overview)) {
      const tools = [...route.matchAll(/`(tw_[a-z_]+)/g)].map((m) => m[1]);
      expect(tools.length, `row '${question}' names no tool`).toBeGreaterThan(0);
      if (tools.every((tool) => tool === "tw_next")) continue;
      for (const tool of tools) {
        if (tool === "tw_next") continue;
        expect(route, `row '${question}' names ${tool} with no phase to open it`).toMatch(/\/skill:[\w-]+/);
      }
    }
    // The fast track stays the one directly callable answer.
    expect(tableRows(overview).some(([, route]) => /`tw_next`/.test(route) && !/\/skill:/.test(route))).toBe(true);
  });

  test("the table names no tool the reader cannot reach: every named tool is disclosed by a phase", () => {
    const disclosed = new Set(SKILL_REGISTRY.flatMap((e) => e.toolset));
    for (const [question, route] of tableRows(overview)) {
      for (const [, tool] of route.matchAll(/`(tw_[a-z_]+)/g)) {
        if (tool === "tw_next" || tool === "tw_open" || tool === "tw_close") continue;
        expect(disclosed.has(tool), `row '${question}' names ${tool}, which no phase discloses`).toBe(true);
      }
    }
  });

  test("the docs page carries the same routed table", () => {
    // The human-facing page names the phases too, so the two surfaces agree.
    expect(page).toMatch(/tw_show[\s\S]{0,80}\/skill:wayfinder/);
    expect(page).toMatch(/Read-only queries|read-only questions/);
  });
});

// ─── The retired bug substrate stays out of the live instructions ────────────
//
// end-of-effort-reconciliation: `docs/bugs/` is a static archive in schema 5,
// and the implementation ticket is the defect's record. No live skill or docs
// prose may instruct a write under it; a `docs/bugs/` mention is a read (the
// bug doc as the ticket's spec source) or an archive reference.

describe("the retired bug substrate (end-of-effort-reconciliation)", () => {
  // The write shapes the retired bug-closure step used: a frontmatter fix
  // stamp, the fix commit field, the archive move, and the scaffold mkdir.
  const BUG_WRITE_PATTERNS: [string, RegExp][] = [
    ["status: fixed", /\bstatus:\s*fixed\b/],
    ["fix_commit", /\bfix_commit\b/],
    ["the archive move", /git mv docs\/bugs\//],
    ["the scaffold mkdir", /mkdir[^\n]*docs\/bugs/],
    ["the archive directory", /docs\/bugs\/archive/],
    ["a write to a bug doc", /write\s+`?docs\/bugs\//],
  ];

  /** Live prose files: the two promoted buckets' skills and the docs pages. */
  function liveProseFiles(): string[] {
    const out: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) walk(path);
        else if (entry.isFile() && entry.name.endsWith(".md")) out.push(repoRel(path));
      }
    };
    walk(join(PROJECT, "skills", "engineering"));
    walk(join(PROJECT, "skills", "productivity"));
    walk(join(PROJECT, "docs", "engineering"));
    out.push("CONTEXT.md", "README.md");
    return out;
  }

  test("no live prose instructs a write under docs/bugs", () => {
    const offenders: string[] = [];
    for (const rel of liveProseFiles()) {
      // The upgrade resources are the compatibility layer: they record what the
      // v4 substrate was, and the migration prose owns it.
      if (rel.startsWith("skills/engineering/setup-workflow/resources/upgrade-")) continue;
      const content = readFile(rel);
      for (const [label, pattern] of BUG_WRITE_PATTERNS) {
        if (pattern.test(content)) offenders.push(`${rel}: ${label}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  test("code-review reads a docs/bugs path only as an archive reference", () => {
    const content = readFile("skills/engineering/code-review/SKILL.md");
    expect(content).toMatch(/docs\/bugs\//);
    expect(content).toMatch(/archive/i);
    for (const [, pattern] of BUG_WRITE_PATTERNS) expect(content).not.toMatch(pattern);
  });

  test("the bug doc is the ticket's spec source, not a substrate to close", () => {
    const bug = readFile("skills/engineering/implement-ticket/resources/bug/autonomous.md");
    // The bug doc still feeds the chain: it is the spec source.
    expect(bug).toMatch(/bug doc/i);
    expect(bug).toMatch(/spec/i);
    for (const [, pattern] of BUG_WRITE_PATTERNS) expect(bug).not.toMatch(pattern);
  });
});

// ─── The mechanical single homes (end-of-effort-reconciliation) ──────────────
//
// The review found three duplications that had already drifted: the two
// effort-root writers, the two root-index rewrites, and the triplicated
// per-ticket close-out. Each now has one implementation, and these pins keep
// the copies from coming back.

describe("mechanical single homes (end-of-effort-reconciliation)", () => {
  const source = readFile("src/pi.ts");
  const skill = readFile("skills/engineering/implement-ticket/SKILL.md");
  const feature = readFile("skills/engineering/implement-ticket/resources/feature/autonomous.md");
  const bug = readFile("skills/engineering/implement-ticket/resources/bug/autonomous.md");

  /** How many times a pattern occurs in a text. */
  function count(text: string, pattern: RegExp): number {
    return [...text.matchAll(new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`))]
      .length;
  }

  test("one effort-root writer: the create path's title fallback exists once", () => {
    // tw_write_spec and tw_write_architecture shared the empty-body guard, the
    // create-or-refuse message, and this fallback before the extraction.
    expect(count(source, /readArtifactTitle\(join\(effortDir, "map\.md"\)\) \?\? basename\(effortDir\)/)).toBe(1);
    expect(count(source, /no live effort '\$\{o\.selector\}': create the effort/)).toBe(1);
    expect(count(source, /function writeEffortRootArtifact/)).toBe(1);
    // Both writers go through it.
    expect(count(source, /writeEffortRootArtifact\(/)).toBeGreaterThanOrEqual(3);
  });

  test("one root-index writer: the Live/Archived rewrite exists once", () => {
    expect(count(source, /function writeTasksIndex/)).toBe(1);
    // The section rewrite itself lives only inside the helper: no caller
    // builds the index body by hand.
    expect(count(source, /writeMapSection\([^)]*, "Archived"/)).toBe(1);
    expect(count(source, /writeMapSection\([^)]*, "Live"/)).toBe(1);
  });

  test("one close-out: the numbered sequence appears once, the resources point at it", () => {
    // The canonical sequence is implement-ticket's Step 2; the two resources
    // carry a pointer, not a copy.
    expect(count(skill, /\*\*CI gate/)).toBe(1);
    for (const [label, resource] of [
      ["feature", feature],
      ["bug", bug],
    ] as const) {
      expect(resource, `${label} duplicates the close-out`).not.toMatch(/\*\*CI gate/);
      expect(resource, `${label} never points at the canonical close-out`).toMatch(/close-out[\s\S]{0,120}SKILL\.md/);
    }
    // The details the feature copy had dropped live in the canonical sequence.
    expect(skill).toMatch(/all deviation reports/);
    expect(skill).toMatch(/combined diff/);
  });
});

// ─── Retired vocabulary across the live language (end-of-effort-reconciliation) ──
//
// The docs-resync pin checked CONTEXT.md only, so the retired terms survived in
// skill prose and in a tool description. The check now runs over the live
// language with targeted patterns: the tool names and path shapes that were
// retired, never the ordinary English word ("a vertical slice" is craft
// language, and the `slice-verifier` agent keeps its name).
describe("retired vocabulary across the live language (end-of-effort-reconciliation)", () => {
  const RETIRED_VOCABULARY: [string, RegExp][] = [
    ["the retired slices/ directory", /(^|[^-\w])slices\//],
    ["per-slice", /per-slice/i],
    ["the tw_slices tool", /tw_slices/],
    ["a slice in the artifact sense", /\bslice (doc|field|directory|substrate)s?\b/i],
    ["mode: hitl/afk", /mode:\s*(hitl|afk)\b/i],
    ["the retired triage skill", /\/skill:triage\b|skills\/engineering\/triage\b/],
    ["the retired implement-task skill", /\/skill:implement-task\b|skills\/engineering\/implement-task\b/],
    ["the retired finalize-task skill", /\/skill:finalize-task\b|skills\/engineering\/finalize-task\b/],
    ["the retired docs/tasks/maps/ tree", /docs\/tasks\/maps\//],
  ];

  /** The live prose: promoted skills, docs pages, and the repo-level docs. */
  function liveLanguage(): string[] {
    const out: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) walk(path);
        else if (entry.isFile() && entry.name.endsWith(".md")) out.push(repoRel(path));
      }
    };
    walk(join(PROJECT, "skills", "engineering"));
    walk(join(PROJECT, "skills", "productivity"));
    walk(join(PROJECT, "docs", "engineering"));
    out.push("CONTEXT.md", "README.md", "skills/engineering/README.md", "skills/productivity/README.md");
    // The compatibility layer keeps the old words by design: the upgrade
    // resources and the migration prose record what the reshape renames.
    return out.filter((rel) => !/^skills\/engineering\/setup-workflow\/resources\/upgrade-/.test(rel));
  }

  test("no live prose carries a retired term", () => {
    const offenders: string[] = [];
    for (const rel of liveLanguage()) {
      const content = readFile(rel);
      for (const [label, pattern] of RETIRED_VOCABULARY) {
        if (pattern.test(content)) offenders.push(`${rel}: ${label}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  test("no registered tool description offers the retired vocabulary", () => {
    // A tool description has no craft language to protect, so the bare word is
    // retired there too: `tw_show` once offered "map, task, or slice".
    const tools = createTools();
    const offenders: string[] = [];
    for (const [name, tool] of Object.entries(tools)) {
      if (/\bslices?\b/i.test(tool.description)) offenders.push(`${name}: the retired word 'slice'`);
      for (const [label, pattern] of RETIRED_VOCABULARY) {
        if (pattern.test(tool.description)) offenders.push(`${name}: ${label}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

// ─── The gates and hygiene (end-of-effort-reconciliation) ────────────────────

describe("the gates and hygiene (end-of-effort-reconciliation)", () => {
  const pkg = JSON.parse(readFile("package.json"));
  const testing = readFile("docs/testing.md");

  test("the tests are typechecked: tsconfig.test.json and a recorded script", () => {
    // The recorded `tsc --noEmit` never saw a changed test line, because the
    // base config includes src/** only.
    const config = JSON.parse(readFile("tsconfig.test.json"));
    expect(config.include).toContain("tests/**/*.ts");
    expect(config.include).toContain("src/**/*.ts");
    expect(config.extends).toBe("./tsconfig.json");
    expect(pkg.scripts["typecheck:tests"]).toBe("tsc -p tsconfig.test.json");
    // It is part of the CI protocol the test-runner reads.
    const always = testing.slice(testing.indexOf("Run these always"), testing.indexOf("Run if asked"));
    expect(always).toContain("npm run typecheck:tests");
  });

  test("the release note landed in the changelog and no retired entry is pending", () => {
    // Pending changesets are the normal state between releases, so this test
    // does not require the folder to be empty: it requires that no entry the
    // v5 release consumed is still sitting there unconsumed.
    for (const name of ["end-of-effort-workflow", "quiet-chain-dispatch", "scoped-uncertainty-tool", "shipped-ticket-chain"]) {
      expect(existsSync(join(PROJECT, ".changeset", `${name}.md`)), name).toBe(false);
    }
    // Every pending entry names this package, so a release consumes it.
    const entries = readdirSync(join(PROJECT, ".changeset")).filter((name) => name.endsWith(".md") && name !== "README.md");
    for (const name of entries) {
      expect(readFile(`.changeset/${name}`), name).toContain(`"${pkg.name}"`);
    }
    // The release note landed in the changelog, and the version is the major
    // the changeset declared.
    const changelog = readFile("CHANGELOG.md");
    // The changelog carries the released version's own section, whatever it is.
    expect(changelog).toContain(`## ${pkg.version}`);
    expect(changelog).toMatch(/### (Major|Minor|Patch) Changes/);
    // The migration target spec tracks the package version it belongs to.
    const target = readFile("docs/migration-target.yaml");
    expect(target).toContain(`package_version: "${pkg.version}"`);
  });

  test("the orphaned flow map and the stale handoff are gone", () => {
    expect(existsSync(join(PROJECT, "docs/workflow-flows.md"))).toBe(false);
    expect(existsSync(join(PROJECT, "handoff-enforced-workflow-v5.md"))).toBe(false);
    // No live prose links either one; the historical records under docs/tasks/
    // may still name them.
    const offenders = corpusFiles(PROJECT)
      .map((file) => repoRel(file))
      .filter(
        (rel) =>
          !rel.startsWith("docs/tasks/") &&
          !rel.startsWith(".git/") &&
          // This file names both paths to pin their absence.
          rel !== "tests/skills.test.ts",
      );
    for (const rel of offenders) {
      let text = "";
      try {
        text = readFileSync(join(PROJECT, rel), "utf-8");
      } catch {
        continue;
      }
      expect(text, `${rel} links the deleted flow map`).not.toContain("docs/workflow-flows.md");
      expect(text, `${rel} links the deleted handoff`).not.toContain("handoff-enforced-workflow-v5.md");
    }
  });
});

describe("the verdict retry does not re-dispatch a stated refusal", () => {
  test("the chain retries the gate only when no verdict line was stated", () => {
    const chain = readFile("skills/engineering/implement-ticket/scripts/ticket-chain.js");
    expect(chain).toMatch(/"VERDICT: PASS"\)\s*&&\s*!verdict\(gate, "VERDICT: REFUSE"\)/);
    const end = readFile("skills/engineering/implement-ticket/scripts/end-of-effort.js");
    expect(end).toMatch(/"SUITE: GREEN"\)\s*&&\s*!verdict\(suite, "SUITE: RED"\)/);
  });
});
