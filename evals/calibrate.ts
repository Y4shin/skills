/**
 * Calibrate the scorer against hand-written cases with known answers.
 *
 * Run this before scoring real messages. A rubric you have not tested against a
 * known answer is a number generator, not a measuring instrument.
 *
 *   node evals/calibrate.ts --model deepseek/deepseek-flash
 *   node evals/calibrate.ts --model deepseek/deepseek-flash --samples 3 --verbose
 *
 * Exits 1 when any case misses its expectation, so it can gate a larger run.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  OUT_DIR,
  flagBool,
  flagNumber,
  flagString,
  mapLimit,
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
import { Ledger } from "./lib/spend.ts";
import type { MessageClass, WindowEntry } from "./lib/sessions.ts";

type Bound = { min?: number; max?: number };

interface Expectation {
  class?: MessageClass | MessageClass[];
  needs_followup?: boolean;
  terms_defined?: Bound;
  outcome_first?: Bound;
  labels_explained?: Bound;
  selection?: Bound;
  structure?: Bound;
}

interface CalibrationCase {
  id: string;
  note: string;
  window: WindowEntry[];
  text: string;
  expect: Expectation;
}

const DIMENSIONS = [
  "terms_defined",
  "outcome_first",
  "labels_explained",
  "selection",
  "structure",
] as const;

interface CaseResult {
  id: string;
  note: string;
  samples: Judgement[];
  failures: string[];
  passed: boolean;
}

function checkCase(testCase: CalibrationCase, sample: Judgement): string[] {
  const failures: string[] = [];
  const expected = testCase.expect;

  if (expected.class !== undefined) {
    const allowed = Array.isArray(expected.class) ? expected.class : [expected.class];
    if (!allowed.includes(sample.class)) {
      failures.push(`class ${sample.class}, expected ${allowed.join(" or ")}`);
    }
  }
  if (expected.needs_followup !== undefined && sample.needs_followup !== expected.needs_followup) {
    failures.push(`needs_followup ${sample.needs_followup}, expected ${expected.needs_followup}`);
  }
  for (const dimension of DIMENSIONS) {
    const bound = expected[dimension];
    if (!bound) continue;
    if (bound.min !== undefined && sample[dimension] < bound.min) {
      failures.push(`${dimension} ${sample[dimension]}, expected at least ${bound.min}`);
    }
    if (bound.max !== undefined && sample[dimension] > bound.max) {
      failures.push(`${dimension} ${sample[dimension]}, expected at most ${bound.max}`);
    }
  }
  return failures;
}

function majority(samples: Judgement[]): Judgement {
  // The median per dimension and the majority vote for the two discrete fields.
  const pick = <K extends (typeof DIMENSIONS)[number]>(key: K): number => {
    const values = samples.map((sample) => sample[key]).sort((a, b) => a - b);
    return values[Math.floor(values.length / 2)];
  };
  const followups = samples.filter((sample) => sample.needs_followup).length;
  const classes = new Map<MessageClass, number>();
  for (const sample of samples) classes.set(sample.class, (classes.get(sample.class) ?? 0) + 1);
  const topClass = [...classes.entries()].sort((a, b) => b[1] - a[1])[0];
  return {
    class: topClass[0],
    terms_defined: pick("terms_defined"),
    outcome_first: pick("outcome_first"),
    labels_explained: pick("labels_explained"),
    selection: pick("selection"),
    structure: pick("structure"),
    needs_followup: followups * 2 > samples.length,
    reason: samples[0]?.reason ?? "",
  };
}

async function main(): Promise<void> {
  const { flags } = parseArgs(process.argv.slice(2));
  const inputPath = flagString(flags, "input") ?? join(import.meta.dirname, "fixtures", "calibration.jsonl");
  const outPath = flagString(flags, "out") ?? join(OUT_DIR, "calibration.jsonl");
  const samples = flagNumber(flags, "samples", 2);
  const concurrency = flagNumber(flags, "concurrency", 2);
  const verbose = flagBool(flags, "verbose");
  const temperature = flagNumber(flags, "temperature", 0);

  const cases = readJsonl<CalibrationCase>(inputPath);
  if (cases.length === 0) {
    console.error(`no cases in ${inputPath}`);
    process.exit(2);
  }

  const judge = resolveJudge(flags);
  const system = judgeSystemPrompt(loadGuide());
  const ledger = new Ledger({
    script: "calibrate",
    phase: "judge",
    provider: judge.provider,
    model: judge.model,
  });

  console.log(`judge: ${describeJudge(judge)}`);
  console.log(`${cases.length} cases from ${inputPath}, ${samples} samples each\n`);

  const jobs = cases.flatMap((testCase) =>
    Array.from({ length: samples }, (_, sample) => ({ testCase, sample })),
  );

  const judgements = await mapLimit(jobs, concurrency, async ({ testCase, sample }) => {
    try {
      const result = await chat(
        judge,
        [
          { role: "system", content: system },
          { role: "user", content: judgeUserPrompt(testCase.text, testCase.window) },
        ],
        { temperature, maxTokens: flagNumber(flags, "max-tokens", 3000), json: true },
        (usage) => ledger.record(usage, testCase.id),
      );
      return { testCase, sample, judgement: parseJudgement(result.content) };
    } catch (error) {
      console.error(`  failed ${testCase.id}#${sample}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  });

  const byCase = new Map<string, Judgement[]>();
  for (const row of judgements) {
    if (!row) continue;
    const list = byCase.get(row.testCase.id) ?? [];
    list.push(row.judgement);
    byCase.set(row.testCase.id, list);
  }

  const results: CaseResult[] = [];
  for (const testCase of cases) {
    const got = byCase.get(testCase.id) ?? [];
    if (got.length === 0) {
      results.push({ id: testCase.id, note: testCase.note, samples: [], failures: ["no judgement returned"], passed: false });
      continue;
    }
    const aggregate = majority(got);
    const failures = checkCase(testCase, aggregate);
    results.push({
      id: testCase.id,
      note: testCase.note,
      samples: got,
      failures,
      passed: failures.length === 0,
    });
  }

  const passed = results.filter((result) => result.passed).length;
  console.log(["case".padEnd(26), "result".padEnd(7), "mean", "follow", ...DIMENSIONS.map((d) => d.slice(0, 6))].join(" "));
  for (const result of results) {
    const aggregate = result.samples.length > 0 ? majority(result.samples) : null;
    const cells = [
      result.id.padEnd(26),
      (result.passed ? "pass" : "FAIL").padEnd(7),
      aggregate ? meanScore(aggregate).toFixed(2) : "-",
      aggregate ? String(aggregate.needs_followup).padEnd(6) : "-".padEnd(6),
      ...DIMENSIONS.map((dimension) =>
        aggregate ? String(aggregate[dimension]).padStart(6) : "-".padStart(6),
      ),
    ];
    console.log(cells.join(" "));
  }

  const failing = results.filter((result) => !result.passed);
  if (failing.length > 0) {
    console.log("\nwhat the judge missed:");
    for (const result of failing) {
      console.log(`  ${result.id}`);
      for (const failure of result.failures) console.log(`    ${failure}`);
      if (verbose && result.samples[0]?.reason) console.log(`    reason given: ${result.samples[0].reason}`);
    }
  }

  const spreadInconsistencies = results.filter((result) => {
    if (result.samples.length < 2) return false;
    const reasons = new Set(result.samples.map((sample) => checkCase(cases.find((c) => c.id === result.id)!, sample).join("|")));
    return reasons.size > 1;
  });

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(
    outPath,
    results
      .flatMap((result) =>
        result.samples.map((sample, index) =>
          JSON.stringify({ id: result.id, note: result.note, sample: index, judgement: sample }),
        ),
      )
      .join("\n") + "\n",
  );

  console.log(`\n${passed}/${results.length} cases passed`);
  if (spreadInconsistencies.length > 0) {
    console.log(`${spreadInconsistencies.length} cases disagreed with themselves across samples:`);
    for (const result of spreadInconsistencies) console.log(`  ${result.id}`);
  }
  console.log(`  ${ledger.summary()}`);
  console.log(`  detail written to ${outPath}`);

  if (passed < results.length) {
    console.log("\nthe scorer is not calibrated yet: fix the rubric or the anchors before scoring real messages");
    process.exit(1);
  }
}

await main();
