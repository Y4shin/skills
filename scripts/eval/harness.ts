// Eval harness — discovers the full update command set beyond the 6 bootstrap.
// runScenario(scenario, cliPath) -> gap report; iterates per scenario until
// 2-clean-in-a-row (cap 5), escalates near cap.
import { spawnSync } from "node:child_process";

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
    /no other gaps/.test(lower) && missing.length === 0;
  const hasMissingStatement =
    /missing operations|missing operations|needed.*but did not exist|gaps/i.test(report);

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
