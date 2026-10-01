// Ticket chain workflow for the implement-task skill.
//
// One launch runs ONE ticket's chain over the shared repo cwd:
//   step 0: implement-preconditions gate (read-only; refuses to launch any
//           worker when the ticket doc does not exist or does not match
//           the dispatched args)
//   feature: tdd-worker, then slice-verifier and deviation-reporter in
//            parallel, then land-worker, with an ok-gate on verify plus
//            deviation before landing
//   bug:     tdd-worker, then slice-verifier, then land-worker, with an
//            ok-gate on verify before landing
//
// The caller (the model running implement-task) launches it as:
//
//   subagent({
//     async: true,
//     timeoutMs,                                   // from the ticket's size
//     workflow: "<this skill's dir>/scripts/ticket-chain.js",
//     args: { ... }                                // see below
//   })
//   wait({ id })                                   // then read the result
//
// args (plain JSON, frozen; persisted as workflow evidence, so no secrets):
//   effort      required   effort slug
//   ticket      required   ticket slug
//   ticketPath  required   path to the ticket's ticket.md
//   subtype     optional   "feature" (default) or "bug"
//   bugPath     bug only   path to the bug doc, read from the ticket body
//   reproPath   bug only   path to the reproduction, read from the ticket body
//   extra       optional   pointers to runtime context for the tdd step
//                          (the recorded resolution, prior-attempt outputs);
//                          appended as "Additional context, read before
//                          starting". Not free-form instructions.
//
// Task composition: every child task carries identity (which ticket, which
// effort), pointers (docs and prior-step outputs), and, on the feature tdd
// step, the uncertainty stop anchor. Procedure lives in the agent
// definitions (agents/*.md) and the tdd / diagnosing-bugs skills, never
// restated here: the caller fills slots (args) only and cannot author
// worker prompts.
//
// Returns (plain JSON):
//   ok        true when the ticket landed
//   failed    "args" | "gate" | "tdd" | "verify" | "deviation" | "land" on failure
//   error     args-validation message (failed: "args" only)
//   step      the failed step's receipt, for diagnosis (ok, output,
//             outputReference, error, and friends)
//   refs      durable output references gathered before the failure or, on
//             success: tdd, verify, deviation (feature only), land
//
// The caller keeps everything this sandbox cannot do: routing and mode
// refusal, the frontier and dependency-level loops, tw_state_set, the
// uncertainty check, the failure toolbelt (diagnose, split, retry,
// escalate), and the advisory reviews.

const subtype = args.subtype === "bug" ? "bug" : "feature";

const missing = [];
if (!args.effort) missing.push("effort");
if (!args.ticket) missing.push("ticket");
if (!args.ticketPath) missing.push("ticketPath");
if (subtype === "bug" && !args.bugPath) missing.push("bugPath");
if (subtype === "bug" && !args.reproPath) missing.push("reproPath");
if (missing.length > 0) {
  return {
    ok: false,
    failed: "args",
    error: "ticket-chain.js missing required args: " + missing.join(", ")
  };
}

function gateTask() {
  const lines = [
    'Verify the preconditions for ticket "' + args.ticket + '" of effort "' + args.effort + '" (subtype ' + subtype + ").",
    "",
    "Ticket doc: " + args.ticketPath
  ];
  if (subtype === "bug") {
    lines.push("Bug doc: " + args.bugPath, "Reproduction: " + args.reproPath);
  }
  return lines.join("\n");
}

function featureTddTask() {
  const lines = [
    'Implement ticket "' + args.ticket + '" for effort "' + args.effort + '".',
    "",
    "Ticket doc: " + args.ticketPath,
    "Arch spec: docs/tasks/" + args.effort + "/arch-spec.md",
    "",
    "If uncertain, write docs/tasks/" + args.effort + "/tickets/" + args.ticket + "/.work/uncertainty.md and stop."
  ];
  if (args.extra) lines.push("", "Additional context, read before starting: " + args.extra);
  return lines.join("\n");
}

function bugTddTask() {
  const lines = [
    'Implement ticket "' + args.ticket + '" for bug effort "' + args.effort + '".',
    "",
    "Ticket doc: " + args.ticketPath,
    "Bug doc: " + args.bugPath,
    "Reproduction: " + args.reproPath
  ];
  if (args.extra) lines.push("", "Additional context, read before starting: " + args.extra);
  return lines.join("\n");
}

function verifyTask(tddRef) {
  return [
    'Verify ticket "' + args.ticket + '".',
    "Ticket doc: " + args.ticketPath,
    "Implementation: " + tddRef
  ].join("\n");
}

function deviationTask(tddRef) {
  return [
    'Report deviations for ticket "' + args.ticket + '" of effort "' + args.effort + '".',
    "",
    "Ticket doc: " + args.ticketPath,
    "Arch spec: docs/tasks/" + args.effort + "/arch-spec.md",
    "Implementation: " + tddRef
  ].join("\n");
}

function landTask(tddRef, verifyRef) {
  return [
    'Land ticket "' + args.ticket + '" for effort "' + args.effort + '".',
    "Ticket doc: " + args.ticketPath,
    "TDD output: " + tddRef,
    "Verify output: " + verifyRef
  ].join("\n");
}

// Step 0: preconditions gate. implement-preconditions is read-only
// (tools: read, submit_feedback); it fails when the ticket doc does not
// exist or does not match these args, so no worker launches on bad input.
// A gate refusal is not a worker failure: the caller re-resolves the ticket
// and rebuilds the args; the failure toolbelt never applies.
const gate = await runs.run("gate", {
  agent: "implement-preconditions",
  label: "Check " + args.ticket + " preconditions",
  output: "gate-" + args.ticket + "/result.md",
  task: gateTask()
});
if (!gate.ok) {
  return { ok: false, ticket: args.ticket, subtype, failed: "gate", step: gate, refs: {} };
}

// Step 1: tdd-worker implements the ticket on the working branch
// ticket/<ticket-slug>. The discipline differs by subtype: tdd for features,
// diagnosing-bugs for bugs.
const tdd = await runs.run("tdd", {
  agent: "tdd-worker",
  skill: subtype === "bug" ? "diagnosing-bugs" : "tdd",
  label: subtype === "bug" ? "Fix " + args.ticket : "Implement " + args.ticket,
  output: "tdd-" + args.ticket + "/result.md",
  task: subtype === "bug" ? bugTddTask() : featureTddTask()
});
const refs = { tdd: tdd.outputReference || tdd.output };
if (!tdd.ok) {
  return { ok: false, ticket: args.ticket, subtype, failed: "tdd", step: tdd, refs };
}

// Step 2: verification. Features verify and report deviations in parallel;
// bugs run the lean verify alone. The ok-gate blocks landing on the outcome.
if (subtype === "feature") {
  const pair = await runs.all([
    {
      key: "verify",
      agent: "slice-verifier",
      label: "Verify " + args.ticket,
      output: "verify-" + args.ticket + "/result.md",
      task: verifyTask(refs.tdd)
    },
    {
      key: "deviation",
      agent: "deviation-reporter",
      label: "Report " + args.ticket + " deviations",
      output: "deviation-" + args.ticket + "/result.md",
      task: deviationTask(refs.tdd)
    }
  ]);
  refs.verify = pair[0].outputReference || pair[0].output;
  refs.deviation = pair[1].outputReference || pair[1].output;
  if (!pair[0].ok) {
    return { ok: false, ticket: args.ticket, subtype, failed: "verify", step: pair[0], refs };
  }
  if (!pair[1].ok) {
    return { ok: false, ticket: args.ticket, subtype, failed: "deviation", step: pair[1], refs };
  }
} else {
  const verify = await runs.run("verify", {
    agent: "slice-verifier",
    label: "Verify " + args.ticket,
    output: "verify-" + args.ticket + "/result.md",
    task: verifyTask(refs.tdd)
  });
  refs.verify = verify.outputReference || verify.output;
  if (!verify.ok) {
    return { ok: false, ticket: args.ticket, subtype, failed: "verify", step: verify, refs };
  }
}

// Step 3: land-worker merges the working branch into the landing branch and
// appends the implementation note. The ticket is NOT marked done here:
// finalize-task owns that marking, one owner.
const land = await runs.run("land", {
  agent: "land-worker",
  label: "Land " + args.ticket,
  output: "land-" + args.ticket + "/result.md",
  task: landTask(refs.tdd, refs.verify)
});
refs.land = land.outputReference || land.output;
if (!land.ok) {
  return { ok: false, ticket: args.ticket, subtype, failed: "land", step: land, refs };
}

return { ok: true, ticket: args.ticket, subtype, landed: true, refs };
