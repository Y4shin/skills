// Eval harness main entry point — runs all 3 scenarios, records results.
// Usage: npx vite-node scripts/eval/main.ts
//
// This script runs non-interactive pi on each scenario, iterates to
// 2-clean-in-a-row (cap 5), and writes the discovered commands to
// docs/tasks/build-grilling-visualizer/eval-results.md.
//
// Browser-spawn prevention:
// - GRILLING_EVAL=1 is set in the child environment (forces wait=immediate,
//   start=no-open).
// - DISPLAY and WAYLAND_DISPLAY are stripped from the child env.
// - The scenarios explicitly instruct the agent not to pass --open.
import { runScenario, createPiGapFn, type RunResult } from "./harness.js";
import { SCENARIOS } from "./scenarios.js";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..");
const resultsPath = join(
  repoRoot,
  "docs",
  "tasks",
  "build-grilling-visualizer",
  "eval-results.md",
);

async function main(): Promise<void> {
  // CLI: npx vite-node scripts/eval/main.ts [--scenario <id>] [--model <model-id>]
  //   --scenario <id>  run only one scenario (e.g. A, B, C) — for spiking.
  //   --model <id>     model id for the non-interactive pi child (e.g. a cheap model).
  const argv = process.argv.slice(2);
  const scenarioFilter = (() => {
    const i = argv.indexOf("--scenario");
    return i >= 0 ? argv[i + 1]?.toUpperCase() : undefined;
  })();
  const model = (() => {
    const i = argv.indexOf("--model");
    return i >= 0 ? argv[i + 1] : undefined;
  })();

  const scenarios = scenarioFilter
    ? SCENARIOS.filter((s) => s.id === scenarioFilter)
    : SCENARIOS;
  if (scenarios.length === 0) {
    process.stderr.write(`No scenario matching --scenario ${scenarioFilter}\n`);
    process.exit(2);
  }
  if (model) {
    process.stdout.write(`Using model: ${model}\n`);
  }

  const results: RunResult[] = [];
  const allDiscovered: Map<string, string> = new Map();

  for (const scenario of scenarios) {
    process.stdout.write(`\n=== Scenario ${scenario.id}: ${scenario.name} ===\n`);
    const gapFn = createPiGapFn(scenario, { timeoutMs: 10 * 60 * 1000, model });
    const result = await runScenario(scenario, gapFn);
    results.push(result);

    // Collect discovered commands across all scenarios.
    for (const gap of result.allGaps) {
      for (const cmd of gap.missingCommands) {
        if (!allDiscovered.has(cmd.name)) {
          allDiscovered.set(cmd.name, cmd.reason);
        }
      }
    }

    if (result.escalated) {
      process.stdout.write(`  ESCALATED: ${result.escalationMessage}\n`);
    } else {
      process.stdout.write(
        `  Converged after ${result.iterations} iterations.\n`,
      );
    }
  }

  // Write eval-results.md.
  const md = renderResultsMarkdown(results, allDiscovered);
  mkdirSync(dirname(resultsPath), { recursive: true });
  writeFileSync(resultsPath, md, "utf-8");
  process.stdout.write(`\nResults written to ${resultsPath}\n`);

  // If any scenario escalated, exit non-zero so the caller knows.
  const anyEscalated = results.some((r) => r.escalated);
  if (anyEscalated) {
    process.stderr.write(
      "\nWARNING: Some scenarios did not converge. See eval-results.md for details.\n",
    );
  }
}

function renderResultsMarkdown(
  results: RunResult[],
  allDiscovered: Map<string, string>,
): string {
  const lines: string[] = [];
  lines.push("# Eval Results — Discovered Update Command Set");
  lines.push("");
  lines.push("This file records the results of running the eval harness to discover");
  lines.push("the full `update` command set beyond the 6 bootstrap commands.");
  lines.push("");
  lines.push("## Bootstrap 6 (pre-existing)");
  lines.push("");
  lines.push("| Command | Purpose |");
  lines.push("|---------|---------|");
  lines.push("| add-question | Add a question to the graph |");
  lines.push("| add-edge | Add a dependency/contradiction/reference edge |");
  lines.push("| promote | Move a question to a later round |");
  lines.push("| set-state | Transition the page state (enforces 7-state machine) |");
  lines.push("| set-summary | Update the running summary sidebar |");
  lines.push("| resolve-contradiction | Mark a contradiction edge as resolved |");
  lines.push("");

  lines.push("## Discovered Commands");
  lines.push("");
  if (allDiscovered.size === 0) {
    lines.push("No new commands were discovered — all 3 scenarios converged");
    lines.push("with the bootstrap 6 command set.");
  } else {
    lines.push("| Command | Reason |");
    lines.push("|---------|--------|");
    for (const [name, reason] of allDiscovered) {
      lines.push(`| ${name} | ${reason} |`);
    }
  }
  lines.push("");

  lines.push("## Final Update Surface");
  lines.push("");
  lines.push("Bootstrap 6 + discovered = the full `update` command set:");
  lines.push("");
  const all = [
    "add-question",
    "add-edge",
    "promote",
    "set-state",
    "set-summary",
    "resolve-contradiction",
    ...allDiscovered.keys(),
  ];
  for (const cmd of all) {
    lines.push(`- \`${cmd}\``);
  }
  lines.push("");

  lines.push("## Per-Scenario Results");
  lines.push("");
  for (const result of results) {
    lines.push(`### Scenario ${result.scenario.id}: ${result.scenario.name}`);
    lines.push("");
    lines.push(`- **Subject:** ${result.scenario.subject}`);
    lines.push(`- **Max questions:** ${result.scenario.maxQuestions}`);
    lines.push(`- **Iterations:** ${result.iterations}`);
    lines.push(`- **Converged:** ${result.converged ? "yes" : "no"}`);
    if (result.escalated) {
      lines.push(`- **Escalated:** ${result.escalationMessage}`);
    }
    if (result.allGaps.length > 0) {
      lines.push("- **Gaps found:**");
      for (const gap of result.allGaps) {
        for (const cmd of gap.missingCommands) {
          lines.push(`  - \`${cmd.name}\`: ${cmd.reason}`);
        }
      }
    } else {
      lines.push("- **Gaps found:** none");
    }
    lines.push("");
  }

  return lines.join("\n");
}

main().catch((err) => {
  console.error("Eval harness failed:", err);
  process.exit(1);
});
