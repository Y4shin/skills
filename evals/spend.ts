/**
 * Spend summary for the eval harness.
 *
 *   node evals/spend.ts                       # everything in the ledger
 *   node evals/spend.ts --by day
 *   node evals/spend.ts --by script --since 2d
 *
 * These calls never reach pi-telemetry, because the harness posts to the
 * provider directly. This ledger is the only record of what they cost.
 */

import { join } from "node:path";
import { OUT_DIR, flagString, parseArgs } from "./lib/config.ts";
import { groupSpend, readLedger, type SpendEntry } from "./lib/spend.ts";

function dayOf(entry: SpendEntry): string {
  return new Date(entry.ts).toISOString().slice(0, 10);
}

function keyFor(by: string): (entry: SpendEntry) => string {
  switch (by) {
    case "day":
      return dayOf;
    case "script":
      return (entry) => `${entry.script}/${entry.phase}`;
    case "model":
      return (entry) => `${entry.provider}/${entry.model}`;
    case "item":
      return (entry) => entry.item?.split(":")[0] ?? "(none)";
    default:
      return () => "all";
  }
}

function sinceMs(raw: string | undefined): number {
  if (!raw) return 0;
  const match = /^(\d+)([hd])$/.exec(raw);
  if (match) {
    const amount = Number(match[1]);
    return Date.now() - amount * (match[2] === "d" ? 86_400_000 : 3_600_000);
  }
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function main(): void {
  const { flags } = parseArgs(process.argv.slice(2));
  const path = flagString(flags, "input") ?? join(OUT_DIR, "spend.jsonl");
  const by = flagString(flags, "by") ?? "script";
  const all = readLedger(path);
  if (all.length === 0) {
    console.error(`no spend recorded in ${path}`);
    process.exit(2);
  }

  const cutoff = sinceMs(flagString(flags, "since"));
  const entries = all.filter((entry) => entry.ts >= cutoff);
  if (entries.length === 0) {
    console.error(`no spend recorded since the requested cutoff`);
    process.exit(2);
  }

  const total = entries.reduce((sum, entry) => sum + entry.cost_usd, 0);
  const unpriced = entries.filter((entry) => !entry.priced).length;
  console.log(`${entries.length} billed calls from ${path}`);
  console.log(`total $${total.toFixed(4)}`);
  if (unpriced > 0) {
    console.log(`${unpriced} calls had no pricing entry in models-store.json, so they count as $0`);
  }

  console.log(`\nby ${by}`);
  console.log(["group".padEnd(30), "calls".padStart(7), "prompt".padStart(10), "output".padStart(9), "usd".padStart(10)].join(" "));
  for (const group of groupSpend(entries, keyFor(by))) {
    console.log(
      [
        group.key.padEnd(30),
        String(group.calls).padStart(7),
        String(group.prompt).padStart(10),
        String(group.completion).padStart(9),
        `$${group.usd.toFixed(4)}`.padStart(10),
      ].join(" "),
    );
  }

  const last = entries[entries.length - 1];
  console.log(`\nlast call ${new Date(last.ts).toISOString()} (${last.script}/${last.phase}, ${last.model})`);
}

main();
