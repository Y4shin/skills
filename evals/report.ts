/**
 * Summarise a scores file.
 *
 *   node evals/report.ts                        # evals/out/scores.jsonl
 *   node evals/report.ts --input evals/out/variant-scores.jsonl --by variant
 *
 * Prints the distribution per group, the follow-up rate, and the spread within
 * a group. Spread matters: a judge that cannot separate two messages of the
 * same group is not a measuring instrument yet.
 */

import { join } from "node:path";
import { OUT_DIR, flagString, median, parseArgs, readJsonl } from "./lib/config.ts";
import type { ScoreRow } from "./score.ts";

const DIMENSIONS = [
  "terms_defined",
  "outcome_first",
  "labels_explained",
  "selection",
  "structure",
] as const;

function groupKey(row: ScoreRow, by: string): string {
  switch (by) {
    case "variant":
      return row.variant ?? "(real)";
    case "class":
      return row.cls;
    case "guide":
      return row.hasAddendum ? `guide ${row.addendumChars ?? "?"} chars` : "no guide";
    case "project":
      return row.project || "(unknown)";
    case "model":
      return row.model ?? "(unknown)";
    default:
      return "all";
  }
}

function pstdev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function main(): void {
  const { flags } = parseArgs(process.argv.slice(2));
  const inputPath = flagString(flags, "input") ?? join(OUT_DIR, "scores.jsonl");
  const by = flagString(flags, "by") ?? "class";
  const rows = readJsonl<ScoreRow>(inputPath);
  if (rows.length === 0) {
    console.error(`no rows in ${inputPath}`);
    process.exit(2);
  }

  const groups = new Map<string, ScoreRow[]>();
  for (const row of rows) {
    const key = groupKey(row, by);
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  console.log(`${rows.length} scored messages from ${inputPath}`);
  console.log(`grouped by ${by}\n`);
  const header = ["group", "n", "mean", "sd", "follow-up", ...DIMENSIONS].map((value, index) =>
    index === 0 ? value.padEnd(24) : value.padStart(11),
  );
  console.log(header.join(" "));

  for (const [key, list] of [...groups.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const means = list.map((row) => row.mean);
    const followups = list.filter((row) => row.judgement.needs_followup).length;
    const cells = [
      key.padEnd(24),
      String(list.length).padStart(11),
      median(means).toFixed(2).padStart(11),
      pstdev(means).toFixed(2).padStart(11),
      `${Math.round((100 * followups) / list.length)}%`.padStart(11),
      ...DIMENSIONS.map((dimension) =>
        median(list.map((row) => row.judgement[dimension])).toFixed(1).padStart(11),
      ),
    ];
    console.log(cells.join(" "));
  }

  const multiSample = rows.filter((row) => row.sample !== undefined);
  if (multiSample.length > 0) {
    const byId = new Map<string, number[]>();
    for (const row of multiSample) {
      const key = row.id.split(":").slice(0, 3).join(":");
      const list = byId.get(key) ?? [];
      list.push(row.mean);
      byId.set(key, list);
    }
    const spreads = [...byId.values()].filter((list) => list.length > 1).map(pstdev);
    if (spreads.length > 0) {
      console.log(`\nsample noise: median within-case sd ${median(spreads).toFixed(2)}`);
      console.log("a variant effect smaller than that is not a result");
    }
  }

  const worst = [...rows].sort((a, b) => a.mean - b.mean).slice(0, 5);
  console.log("\nlowest-scoring messages:");
  for (const row of worst) {
    console.log(`  ${row.mean.toFixed(2)}  ${row.cls.padEnd(9)} ${row.id}`);
    if (row.judgement.reason) console.log(`          ${row.judgement.reason}`);
  }
}

main();
