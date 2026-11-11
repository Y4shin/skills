/**
 * Prose guards for the profile-driven branch model (workflow-prose).
 *
 * The workflow's prose stops stating a branch model and starts stating each
 * phase's brief-and-gate sentence: the branch a phase must be on, the step
 * that creates it, and the gate that refuses the phase when the step was
 * skipped all come from the git profile through `tw_phase_brief`, so no phase
 * file, no worker agent, and no chain script may name a branch or a merge flag
 * as a fixed rule.
 *
 * The seam is the prose itself, the same one the rest of the suite pins: a
 * documentation contract is only as good as the sentences that carry it.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const PROJECT = process.cwd();

function readFile(relativePath: string): string {
  return readFileSync(join(PROJECT, relativePath), "utf-8");
}

/** The prose a phase, its resources, and its chain carry for this contract. */
const PHASE_FILES = [
  "skills/engineering/implement-ticket/SKILL.md",
  "skills/engineering/implement-ticket/resources/feature.md",
  "skills/engineering/implement-ticket/resources/bug.md",
  "skills/engineering/implement-ticket/resources/feature/autonomous.md",
  "skills/engineering/implement-ticket/resources/feature/human.md",
  "skills/engineering/implement-ticket/resources/bug/autonomous.md",
  "skills/engineering/implement-ticket/resources/bug/human.md",
  "skills/engineering/implement-ticket/resources/report.md",
  "skills/engineering/implement-ticket/scripts/ticket-chain.js",
  "skills/engineering/implement-ticket/scripts/end-of-effort.js",
  "skills/engineering/finalize-effort/SKILL.md",
  "skills/engineering/finalize-effort/resources/report.md",
];

/** The five implementation sub-agents the profile gates on the ticket branch. */
const WORKER_AGENTS = [
  "agents/implement-preconditions.md",
  "agents/tdd-worker.md",
  "agents/slice-verifier.md",
  "agents/deviation-reporter.md",
  "agents/land-worker.md",
];

describe("no phase file, worker agent, or chain script states a fixed branch rule", () => {
  const shapes: Array<[string, RegExp]> = [
    ["a branch literal", /\b(?:task|ticket|effort)\/</],
    ["a named working branch", /\b(?:task|ticket|effort)\/\$\{/],
    ["a merge flag", /--no-ff|--ff-only/],
  ];

  test.each([...PHASE_FILES, ...WORKER_AGENTS])("%s carries no hardcoded branch model", (file) => {
    const content = readFile(file);
    for (const [label, shape] of shapes) {
      expect(content, `${file} still states ${label}`).not.toMatch(shape);
    }
  });
});

describe("the implementation phase states its branch step and the gate that follows it", () => {
  const skill = readFile("skills/engineering/implement-ticket/SKILL.md");

  test("asks for the phase brief before it opens, and performs the step it reports", () => {
    expect(skill).toMatch(/tw_phase_brief/);
    expect(skill).toMatch(/first action/i);
    // The step is the brief's, so the phase creates whatever the profile names.
    expect(skill).toMatch(/step it reports|the brief.*step/i);
    expect(skill).toMatch(/before .{0,20}open|then open/i);
  });

  test("names the gate that refuses a checkout off the brief's branch", () => {
    expect(skill).toMatch(/refuses?/);
    expect(skill).toMatch(/required branch/i);
    // Nothing latches: performing the step and retrying passes.
    expect(skill).toMatch(/retry|retrying/i);
  });

  test("creates each ticket's branch from the agent brief before dispatching the chain", () => {
    // The phase, never a worker, creates the ticket branch: the workers'
    // brief reports the step, and the spawn guard refuses an off-branch spawn.
    expect(skill).toMatch(/the phase, not a worker|this phase creates/i);
    expect(skill).toMatch(/ticket's branch|ticket branch/i);
    // And there is no landing branch any more.
    expect(skill).toMatch(/no landing branch|there is no landing/i);
    // The chain's host gates take the resolved names from the dispatch args.
    expect(skill).toMatch(/branch:/);
    expect(skill).toMatch(/effortBranch:/);
  });
});

describe("the five worker agents expect their branch to be checked out", () => {
  test.each(WORKER_AGENTS)("%s states the branch is already checked out", (file) => {
    const content = readFile(file);
    expect(content).toMatch(/already checked out/i);
  });

  test("the tdd-worker does not create a branch and stops instead of switching one", () => {
    const content = readFile("agents/tdd-worker.md");
    expect(content).not.toMatch(/git checkout -b/);
    expect(content).toMatch(/do not create|never creates?/i);
  });

  test("the land-worker merges into the merge target its task names and deletes the ticket branch", () => {
    const content = readFile("agents/land-worker.md");
    expect(content).toMatch(/merge target/i);
    expect(content).toMatch(/delete/i);
  });
});

describe("the chain merges a ticket branch into the effort branch and deletes it", () => {
  const chain = readFile("skills/engineering/implement-ticket/scripts/ticket-chain.js");

  test("takes both branch names from its args", () => {
    // A workflow script has no filesystem and no tools, so the phase resolves
    // the profile's templates and passes the names in.
    expect(chain).toMatch(/args\.branch\b/);
    expect(chain).toMatch(/args\.effortBranch\b/);
  });

  test("its host gates assert the resolved names", () => {
    expect(chain).toMatch(/refs\/heads\/" \+ ticketBranch/);
    expect(chain).toMatch(/refs\/heads\/" \+ effortBranch/);
  });

  test("the land step names the merge target and the branch it deletes", () => {
    expect(chain).toMatch(/Merge target/i);
    expect(chain).toMatch(/Delete/i);
    expect(chain).toMatch(/landTask/);
  });

  test("a profile that requires no branch passes no names, and the gates assert none", () => {
    expect(chain).toMatch(/ticketBranch === ""|effortBranch === ""/);
  });
});

describe("the effort close lands the effort branch per the profile", () => {
  const skill = readFile("skills/engineering/finalize-effort/SKILL.md");

  test("opens on the branch the brief reports, and asks for the brief first", () => {
    expect(skill).toMatch(/tw_phase_brief/);
    expect(skill).toMatch(/Required branch|required branch/);
    expect(skill).toMatch(/trunk/i);
  });

  test("merges into the trunk with the profile's merge flag and pushes per its policy", () => {
    expect(skill).toMatch(/merge flag/i);
    expect(skill).toMatch(/push policy|pushes?/i);
  });

  test("handoff mode skips the merge and prints the pull-request instruction", () => {
    expect(skill).toMatch(/handoff/i);
    expect(skill).toMatch(/pull request|pull-request/i);
    // The instruction carries the branch and the trunk, both named by the brief.
    expect(skill).toMatch(/trunk[- ]merge mode|trunkMerge/);
  });
});

describe("the docs page describes the profiles, the keys, and the refusal behaviour", () => {
  const PAGE = "docs/git-workflows.md";

  test("the page exists", () => {
    expect(existsSync(join(PROJECT, PAGE))).toBe(true);
  });

  test("it covers both bundled profiles and the three settings keys", () => {
    const page = readFile(PAGE);
    expect(page).toContain("default");
    expect(page).toContain("flat");
    for (const key of ["taskWorkflow.git.profile", "taskWorkflow.git.trunk", "taskWorkflow.git.trunkMerge"]) {
      expect(page).toContain(key);
    }
    // The two trunk-merge modes are part of the contract, with what each does.
    expect(page).toContain("local");
    expect(page).toContain("handoff");
  });

  test("it states what is refused and what a malformed value falls back to", () => {
    const page = readFile(PAGE);
    expect(page).toMatch(/refus/i);
    expect(page).toMatch(/falls back|fall back/i);
    expect(page).toMatch(/diagnostic/i);
  });

  test("it ships with the package and is linked from the README", () => {
    const pkg = JSON.parse(readFile("package.json"));
    expect(pkg.files).toContain(PAGE);
    expect(readFile("README.md")).toContain(PAGE);
  });
});
