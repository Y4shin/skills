// End-of-effort workflow for the implement-task skill.
//
// One launch runs the wrap-up after every ticket of an effort has landed,
// in order:
//   step 1: advisory whole-effort review (code-reviewer)   -- skipped when args.review === false
//   step 2: final arch-spec reconcile (spec-reconciler)    -- skipped when args.reconcile === false
//   step 3: coherence refactor (coherence-refactorer)      -- skipped when args.inconsistencies is empty
//   step 4: suite gate (test-runner)                        -- always; the final ok-gate
//
// The caller (the model running implement-task) launches it as:
//
//   subagent({
//     async: true,
//     workflow: "<this skill's dir>/scripts/end-of-effort.js",
//     args: { ... }                                // see below
//   })
//   wait({ id })                                   // then read the result
//
// args (plain JSON, frozen; persisted as workflow evidence, so no secrets):
//   effort          required   effort slug
//   startingBranch  required   the fixed point for diffs (the effort's
//                              starting branch)
//   inconsistencies optional   concrete coherence fixes, one string each;
//                              empty or omitted skips the coherence step
//   optionalTests   optional   integers naming "run if asked" commands in
//                              the repo's docs/testing.md; the always-run
//                              commands run regardless
//   review          optional   set false to skip the advisory review (for
//                              relaunches after a suite failure)
//   reconcile       optional   set false to skip the spec reconcile
//
// Returns (plain JSON):
//   ok        true when every step that ran succeeded
//   failed    "args" | "spec" | "coherence" | "suite" on failure
//   step      the failed step's receipt, for diagnosis
//   reviewOk  false when the (advisory, non-gating) review child failed
//   refs      durable output references: review?, spec?, coherence?, suite
//
// Task composition follows ticket-chain.js: identity and pointers only;
// procedure lives in the agent definitions and skills. The caller composes
// the inconsistency list from the deviation reports; it never refactors.

// Task composition follows ticket-chain.js: identity and pointers only;
// procedure lives in the agent definitions and skills. Gating is enforced,
// not trusted: spec, coherence, and suite are verdict-gated (their final
// output must open with an exact first-line marker, checked fail-closed),
// because a child that merely ends its turn reporting a failure is a
// successful run completion and ok alone can never express it.

const missing = [];
if (!args.effort) missing.push("effort");
if (!args.startingBranch) missing.push("startingBranch");
if (missing.length > 0) {
  return {
    ok: false,
    failed: "args",
    error: "end-of-effort.js missing required args: " + missing.join(", ")
  };
}

const inconsistencies = Array.isArray(args.inconsistencies) ? args.inconsistencies : [];
const optionalTests = Array.isArray(args.optionalTests) ? args.optionalTests : [];

function verdict(receipt, marker) {
  return receipt.ok && typeof receipt.output === "string" && receipt.output.trimStart().startsWith(marker);
}

function reviewTask() {
  return [
    'Review the whole-effort diff for effort "' + args.effort + '".',
    "Fixed point: " + args.startingBranch,
    "Spec source: the ticket docs plus docs/tasks/" + args.effort + "/arch-spec.md"
  ].join("\n");
}

function specTask() {
  return [
    'Final reconcile of the arch spec for effort "' + args.effort + '": make it read as what was built.',
    "",
    "Arch spec: docs/tasks/" + args.effort + "/arch-spec.md",
    "Deviation reports: docs/tasks/" + args.effort + "/tickets/*/deviation-reports/*.md"
  ].join("\n");
}

function coherenceTask(reviewRef) {
  const lines = [
    'Apply the coherence refactor for effort "' + args.effort + '": fix the listed inconsistencies.',
    "",
    "Combined diff: git diff " + args.startingBranch + "...HEAD (HEAD is the last landing branch)",
    "Arch spec: docs/tasks/" + args.effort + "/arch-spec.md"
  ];
  if (reviewRef) lines.push("Review findings: " + reviewRef);
  lines.push("", "Inconsistencies to fix:");
  for (const item of inconsistencies) lines.push("- " + item);
  return lines.join("\n");
}

function suiteTask() {
  const lines = [
    'Run the test protocol for effort "' + args.effort + '" (final suite gate).',
    "",
    "Always-run commands run regardless."
  ];
  if (optionalTests.length > 0) {
    lines.push("Run if asked: " + optionalTests.join(", ") + " (numbers per docs/testing.md).");
  } else {
    lines.push("Run if asked: none.");
  }
  return lines.join("\n");
}

const refs = {};
let reviewOk = true;

// Step 1: advisory review. It does not gate: a failed reviewer is recorded
// (reviewOk false) and the workflow continues; the parent surfaces findings.
if (args.review !== false) {
  const review = await runs.run("review", {
    agent: "code-reviewer",
    skill: "code-review",
    label: "Review " + args.effort + " diff",
    output: "review-" + args.effort + "/result.md",
    task: reviewTask()
  });
  refs.review = review.outputReference || review.output;
  reviewOk = review.ok;
}

// Step 2: final spec reconcile. Gated: the reconciler must open with
// RECONCILED; a FLAGGED verdict (planning problem) or any run failure
// fails the workflow and the caller takes the reason to the user.
if (args.reconcile !== false) {
  const spec = await runs.run("spec", {
    agent: "spec-reconciler",
    label: "Reconcile " + args.effort + " arch spec",
    task: specTask()
  });
  refs.spec = spec.outputReference || spec.output;
  if (!verdict(spec, "RECONCILED")) {
    return { ok: false, effort: args.effort, failed: "spec", step: spec, reviewOk, refs };
  }
}

// Step 3: coherence refactor, only when there are inconsistencies to fix.
// The refactorer must open with REFACTORED; a STOPPED verdict (scope or
// API-surface boundary) fails the workflow and the reason goes to the user.
if (inconsistencies.length > 0) {
  const coherence = await runs.run("coherence", {
    agent: "coherence-refactorer",
    label: "Refactor " + args.effort + " coherence",
    task: coherenceTask(refs.review)
  });
  refs.coherence = coherence.outputReference || coherence.output;
  if (!verdict(coherence, "REFACTORED")) {
    return { ok: false, effort: args.effort, failed: "coherence", step: coherence, reviewOk, refs };
  }
}

// Step 4: suite gate. Always runs; the final ok-gate. The runner must open
// with SUITE: GREEN; anything else, including a completed run reporting
// failures, fails the workflow. The caller then adds the failures to the
// inconsistency list and relaunches with review: false, or takes large or
// API-surface failures to the user.
const suite = await runs.run("suite", {
  agent: "test-runner",
  label: "Run " + args.effort + " suite gate",
  task: suiteTask()
});
refs.suite = suite.outputReference || suite.output;
if (!verdict(suite, "SUITE: GREEN")) {
  return { ok: false, effort: args.effort, failed: "suite", step: suite, reviewOk, refs };
}

return { ok: true, effort: args.effort, reviewOk, refs };
