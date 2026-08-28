// Eval scenarios — 3 synthetic grilling subjects, each trivial-to-moderate,
// ≤12 questions. The harness runs non-interactive pi on each, asking the
// agent to grill the subject using the grilling skill + modified CLI, and
// report any CLI operations it needed but did not exist.
import type { Scenario } from "./harness.js";

export const SCENARIOS: Scenario[] = [
  {
    id: "A",
    name: "Simple either/or with one dependency",
    subject:
      "A simple either/or decision: should the project use a monorepo or a polyrepo? " +
      "One dependent question: given that choice, what package manager should we use?",
    maxQuestions: 5,
    prompt: `\
You are grilling a synthetic subject. The subject is:

"A simple either/or decision: should the project use a monorepo or a polyrepo?
One dependent question: given that choice, what package manager should we use?"

Use the grilling skill (skills/grilling/SKILL.md) and the grilling CLI
(skills/grilling/grilling-cli.mjs) to drive the grilling end-to-end. The CLI
is running in eval mode (GRILLING_EVAL=1) — the wait command returns
immediately, so do NOT block waiting for a human; just proceed as if the user
has submitted their answers.

Keep this grilling SHORT (≤5 questions). Build the graph, run through the
round loop, and reach final-review.

At the END of your run, report any CLI operations you needed but did not
exist. Format:
- update <command-name>: <reason you needed it>

If you had no missing operations, state: "No missing operations."

Do NOT open a browser. Do NOT pass --open to start.`,
  },
  {
    id: "B",
    name: "Moderate: 2-3 rounds, a contradiction, a reference edge",
    subject:
      "A moderate decision: choosing a deployment strategy for a web app. " +
      "2-3 rounds of questions. One contradiction (two answers that conflict). " +
      "One reference edge (a question that references another without depending on it).",
    maxQuestions: 9,
    prompt: `\
You are grilling a synthetic subject. The subject is:

"A moderate decision: choosing a deployment strategy for a web app.
2-3 rounds of questions. One contradiction (two answers that conflict).
One reference edge (a question that references another without depending on it)."

Use the grilling skill (skills/grilling/SKILL.md) and the grilling CLI
(skills/grilling/grilling-cli.mjs) to drive the grilling end-to-end. The CLI
is running in eval mode (GRILLING_EVAL=1) — the wait command returns
immediately, so do NOT block waiting for a human; just proceed as if the user
has submitted their answers.

Keep this grilling moderate (≤9 questions). Build the graph, run through 2-3
rounds, add a contradiction edge and a reference edge, resolve the
contradiction, and reach final-review.

At the END of your run, report any CLI operations you needed but did not
exist. Format:
- update <command-name>: <reason you needed it>

If you had no missing operations, state: "No missing operations."

Do NOT open a browser. Do NOT pass --open to start.`,
  },
  {
    id: "C",
    name: "Moderate: multiple deps, contradiction resolved, rejected final-review resumes in-round",
    subject:
      "A moderate decision: designing the data layer for a SaaS app. " +
      "Multiple dependencies between questions. A contradiction that must be resolved. " +
      "A final-review that is rejected, causing a resume in-round to address the gap, " +
      "then re-reach final-review.",
    maxQuestions: 12,
    prompt: `\
You are grilling a synthetic subject. The subject is:

"A moderate decision: designing the data layer for a SaaS app.
Multiple dependencies between questions. A contradiction that must be resolved.
A final-review that is rejected, causing a resume in-round to address the gap,
then re-reach final-review."

Use the grilling skill (skills/grilling/SKILL.md) and the grilling CLI
(skills/grilling/grilling-cli.mjs) to drive the grilling end-to-end. The CLI
is running in eval mode (GRILLING_EVAL=1) — the wait command returns
immediately, so do NOT block waiting for a human; just proceed as if the user
has submitted their answers. When you reach final-review, simulate a
rejection (the user rejects the shared understanding), then resume in-round
to address the gap, and re-reach final-review with acceptance.

Keep this grilling moderate (≤12 questions). Build the graph, run through
multiple rounds with dependencies, add and resolve a contradiction, reach
final-review, get rejected, resume in-round, and reach final-review again
with acceptance.

At the END of your run, report any CLI operations you needed but did not
exist. Format:
- update <command-name>: <reason you needed it>

If you had no missing operations, state: "No missing operations."

Do NOT open a browser. Do NOT pass --open to start.`,
  },
];
