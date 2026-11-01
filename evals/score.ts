/**
 * Grade corpus rows with a judge model and write one score row per judged
 * message.
 *
 *   node evals/score.ts --limit 20 --classes report,answer
 *   node evals/score.ts --model deepseek/deepseek-flash --concurrency 2
 *   node evals/score.ts --input evals/out/variants.jsonl --out evals/out/variant-scores.jsonl
 *
 * The judge's model is resolved from pi's own configuration; see
 * `resolveJudge` in lib/judge.ts for the order and the override variables.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  OUT_DIR,
  flagBool,
  flagNumber,
  flagString,
  mapLimit,
  median,
  parseArgs,
  readJsonl,
} from "./lib/config.ts";
import {
  chat,
  describeJudge,
  judgeSystemPrompt,
  judgeUserPrompt,
  loadGuide,
  meanScore,
  parseJudgement,
  resolveJudge,
  type Judgement,
} from "./lib/judge.ts";
import type { CorpusRow } from "./corpus.ts";
import { Ledger } from "./lib/spend.ts";
import type { MessageClass, WindowEntry } from "./lib/sessions.ts";

export interface ScoreRow {
  id: string;
  sessionId: string;
  sessionPath: string;
  line: number;
  project: string;
  model: string | null;
  hasAddendum: boolean;
  addendumChars: number | null;
  addendumSha: string | null;
  cls: MessageClass;
  /** Present when scoring regenerated variants rather than real messages. */
  variant?: string;
  sample?: number;
  judge: string;
  judgement: Judgement;
  mean: number;
  windowSize: number;
  metrics: CorpusRow["metrics"];
}

export interface InputRow extends Partial<CorpusRow> {
  id: string;
  text: string;
  window: WindowEntry[];
  cls: MessageClass;
  variant?: string;
  sample?: number;
}

function filterRows(rows: InputRow[], flags: Map<string, string | true>): InputRow[] {
  const classes = flagString(flags, "classes");
  const wanted = classes ? new Set(classes.split(",").map((value) => value.trim())) : null;
  let selected = wanted ? rows.filter((row) => wanted.has(row.cls)) : rows;

  const project = flagString(flags, "project");
  if (project) selected = selected.filter((row) => row.project === project);

  const ids = flagString(flags, "ids");
  if (ids) {
    const wanted = ids.split(",").map((value) => value.trim());
    selected = selected.filter((row) => wanted.some((want) => row.id.startsWith(want)));
  }

  const treated = flagString(flags, "guide");
  if (treated === "yes") selected = selected.filter((row) => row.hasAddendum === true);
  if (treated === "no") selected = selected.filter((row) => row.hasAddendum !== true);

  const limit = flagNumber(flags, "limit", 0);
  if (limit > 0 && selected.length > limit) {
    const stride = Math.max(1, Math.floor(selected.length / limit));
    const thinned: InputRow[] = [];
    for (let i = 0; i < selected.length && thinned.length < limit; i += stride) thinned.push(selected[i]);
    selected = thinned;
  }
  return selected;
}

async function main(): Promise<void> {
  const { flags } = parseArgs(process.argv.slice(2));
  const inputPath = flagString(flags, "input") ?? join(OUT_DIR, "corpus.jsonl");
  const outPath = flagString(flags, "out") ?? join(OUT_DIR, "scores.jsonl");
  const concurrency = flagNumber(flags, "concurrency", 2);
  const temperature = flagNumber(flags, "temperature", 0);
  const dryRun = flagBool(flags, "dry-run");

  const judge = resolveJudge(flags);
  const guide = loadGuide();
  const system = judgeSystemPrompt(guide);
  const ledger = new Ledger({
    script: "score",
    phase: "judge",
    provider: judge.provider,
    model: judge.model,
  });

  const rows = filterRows(readJsonl<InputRow>(inputPath), flags);
  if (rows.length === 0) {
    console.error(`no rows selected from ${inputPath}`);
    process.exit(2);
  }

  console.log(`judge: ${describeJudge(judge)}`);
  console.log(`scoring ${rows.length} messages from ${inputPath}`);
  if (dryRun) {
    console.log("\n--- system prompt ---\n" + system);
    console.log("\n--- first user prompt ---\n" + judgeUserPrompt(rows[0].text, rows[0].window ?? []));
    return;
  }

  let failures = 0;
  const scored = await mapLimit(rows, concurrency, async (row) => {
    const user = judgeUserPrompt(row.text, row.window ?? []);
    let judgement: Judgement;
    try {
      const result = await chat(
        judge,
        [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        { temperature, maxTokens: flagNumber(flags, "max-tokens", 3000), json: true },
        (usage) => ledger.record(usage, row.id),
      );
      judgement = parseJudgement(result.content);
    } catch (error) {
      failures++;
      console.error(`  failed ${row.id}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
    const result: ScoreRow = {
      id: row.id,
      sessionId: row.sessionId ?? "",
      sessionPath: row.sessionPath ?? "",
      line: row.line ?? 0,
      project: row.project ?? "",
      model: row.model ?? null,
      hasAddendum: row.hasAddendum === true,
      addendumChars: row.addendumChars ?? null,
      addendumSha: row.addendumSha ?? null,
      cls: judgement.class,
      judge: `${judge.provider}/${judge.model}`,
      judgement,
      mean: meanScore(judgement),
      windowSize: (row.window ?? []).length,
      metrics: row.metrics ?? {
        chars: row.text.length,
        lines: row.text.split("\n").length,
        headings: 0,
        bullets: 0,
        boldLeads: 0,
        codeSpans: 0,
        questionMarks: 0,
      },
    };
    if (row.variant !== undefined) result.variant = row.variant;
    if (row.sample !== undefined) result.sample = row.sample;
    process.stdout.write(".");
    return result;
  });

  const kept = scored.filter((row): row is ScoreRow => row !== null);
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(outPath, kept.map((row) => JSON.stringify(row)).join("\n") + (kept.length ? "\n" : ""));
  process.stdout.write("\n");

  const means = kept.map((row) => row.mean);
  const followups = kept.filter((row) => row.judgement.needs_followup).length;
  console.log(`wrote ${kept.length} scores to ${outPath} (${failures} failures)`);
  if (kept.length > 0) {
    console.log(
      `  mean score ${median(means).toFixed(2)} (median), needs_followup ${followups}/${kept.length}`,
    );
  }
  console.log(`  ${ledger.summary()}`);
}

await main();
