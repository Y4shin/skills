// Eval harness — discovers the full update command set beyond the 6 bootstrap.
// runScenario(scenario, gapFn) iterates per scenario until 2-clean-in-a-row
// (cap 5), escalates near cap.
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

// --- Scenario type ---

export interface Scenario {
  id: string;
  name: string;
  subject: string;
  maxQuestions: number;
  prompt: string;
}

// --- Gap report parsing (seam 1) ---

export interface MissingCommand {
  name: string;
  reason: string;
}

export interface GapReport {
  converged: boolean;
  missingCommands: MissingCommand[];
}

/**
 * Parse the agent's end-of-run gap report to extract missing CLI operations.
 *
 * The agent is prompted to report "any CLI operations you needed but did not
 * exist." A report with no missing operations = convergence. A silent report
 * (no mention of missing ops) = non-convergence (counts toward the cap).
 *
 * Supported formats:
 * - Lines starting with "- update <name>: <reason>" or "- <name>: <reason>"
 * - Numbered lines "1. update <name>: <reason>"
 * - Explicit "no missing operations" / "missing operations: none" = converged
 */
export function parseGapReport(report: string): GapReport {
  const lines = report.split("\n");

  // Extract missing-operation lines: "- update foo: reason" or "1. update foo: reason"
  const cmdRegex = /^\s*(?:[-*]|\d+\.)\s+(?:update\s+)?([a-z][-a-z0-9]*):\s*(.+)$/i;
  const missing: MissingCommand[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const m = line.match(cmdRegex);
    if (m) {
      const name = m[1].trim();
      const reason = m[2].trim();
      if (!seen.has(name)) {
        seen.add(name);
        missing.push({ name, reason });
      }
    }
  }

  // Determine convergence:
  // - Explicit clean statement ("no missing operations", "missing operations: none")
  //   OR an explicit statement that all operations were available
  // - If there are extracted missing commands, it's not converged
  // - If the report mentions missing operations but lists none → not converged
  // - A silent report (no mention at all) → not converged
  const lower = report.toLowerCase();
  const hasCleanStatement =
    /no missing operations/.test(lower) ||
    /missing operations:\s*none/.test(lower) ||
    /did not need any cli operations/.test(lower) ||
    /all required commands were available/.test(lower) ||
    (/no other gaps/.test(lower) && missing.length === 0);
  const hasMissingStatement =
    /missing operations|needed.*but did not exist|gaps/i.test(report);

  if (missing.length > 0) {
    return { converged: false, missingCommands: missing };
  }

  if (hasCleanStatement) {
    return { converged: true, missingCommands: [] };
  }

  // No missing commands extracted and no explicit clean statement →
  // non-convergence (silent or vague report).
  return { converged: false, missingCommands: [] };
}

// --- Iteration (seam 2) ---

/** A function that runs one iteration and returns a gap report. */
export type GapReportFn = () => Promise<GapReport>;

export interface RunResult {
  scenario: Scenario;
  converged: boolean;
  iterations: number;
  allGaps: GapReport[];
  lastGaps?: GapReport;
  escalated: boolean;
  escalationMessage: string;
}

const MAX_ITERATIONS = 5;
const CLEAN_STREAK_REQUIRED = 2;

/**
 * Run a scenario to convergence or cap.
 *
 * Iterates: run → collect gaps → (add missing commands) → re-run, until the
 * agent reports no missing commands 2 times in a row (convergence), capped at
 * 5 iterations. If the cap is reached without convergence, escalates.
 *
 * The gapFn abstraction lets us test the iteration logic with a mock.
 * In production, gapFn shells out to non-interactive pi.
 */
export async function runScenario(scenario: Scenario, gapFn: GapReportFn): Promise<RunResult> {
  const allGaps: GapReport[] = [];
  let cleanStreak = 0;
  let iterations = 0;
  let lastGaps: GapReport | undefined;
  let converged = false;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    iterations++;
    const report = await gapFn();
    lastGaps = report;

    if (report.converged && report.missingCommands.length === 0) {
      cleanStreak++;
      if (cleanStreak >= CLEAN_STREAK_REQUIRED) {
        converged = true;
        break;
      }
    } else {
      cleanStreak = 0;
      // Only track runs that had actual gaps (missing commands).
      allGaps.push(report);
    }
  }

  const escalated = !converged;
  let escalationMessage = "";
  if (escalated) {
    const lastGapNames =
      lastGaps?.missingCommands.map((g) => g.name).join(", ") ||
      "(silent — no gaps reported)";
    escalationMessage =
      `Scenario "${scenario.id}" did not converge after ${iterations} iterations. ` +
      `Last gaps: ${lastGapNames}. Manual triage required.`;
  }

  return {
    scenario,
    converged,
    iterations,
    allGaps,
    lastGaps,
    escalated,
    escalationMessage,
  };
}

// --- Pi invocation (production gapFn) ---

/**
 * Strip the environment of display variables so a stray xdg-open cannot
 * find a browser. Belt-and-suspenders backstop against browser-spawn leaks.
 * Exported for testing.
 */
export function strippedEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value === undefined) continue;
    // Remove display-related variables so xdg-open cannot find a browser.
    if (key === "DISPLAY" || key === "WAYLAND_DISPLAY" || key === "XDG_SESSION_TYPE") {
      continue;
    }
    env[key] = value;
  }
  // Force eval mode so the CLI's wait returns immediately and start forces no-open.
  env.GRILLING_EVAL = "1";
  return env;
}

/**
 * Run non-interactive pi on a grilling scenario. Shells out to `pi --print`
 * (non-interactive mode) with a prompt that tells the agent to grill the
 * scenario subject using the grilling skill + modified CLI, and report any
 * CLI operations it needed but did not exist.
 *
 * Returns the agent's stdout (the gap report).
 */
export function runPiGrilling(scenario: Scenario, opts?: { timeoutMs?: number }): string {
  const repoRoot = process.cwd();
  const timeoutMs = opts?.timeoutMs ?? 10 * 60 * 1000; // 10 min default

  const result = spawnSync("pi", ["--print", "-p", scenario.prompt], {
    cwd: repoRoot,
    encoding: "utf-8",
    timeout: timeoutMs,
    env: strippedEnv(),
  });

  if (result.error) {
    return `Error running pi: ${result.error.message}`;
  }

  return (result.stdout ?? "") + (result.stderr ?? "");
}

/**
 * Create a production GapReportFn for a scenario: runs pi, parses the output.
 */
export function createPiGapFn(scenario: Scenario, opts?: { timeoutMs?: number }): GapReportFn {
  return async () => {
    const output = runPiGrilling(scenario, opts);
    return parseGapReport(output);
  };
}
