/**
 * Spend accounting for the eval harness.
 *
 * These calls go straight to the provider over fetch, so they never reach
 * pi-telemetry's `llm_requests` table and would otherwise be invisible. Every
 * billed response is appended to `evals/out/spend.jsonl` as it happens, so an
 * interrupted run still leaves an accurate record.
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { MODELS_STORE, OUT_DIR, median } from "./config.ts";

export interface Usage {
  prompt: number;
  completion: number;
  cached: number;
}

export interface Pricing {
  input: number;
  output: number;
  cacheRead: number;
}

export interface SpendEntry {
  ts: number;
  script: string;
  phase: string;
  provider: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  cached_tokens: number;
  cost_usd: number;
  /** False when the model had no pricing entry, so the cost is a lower bound. */
  priced: boolean;
  item?: string;
}

/** Prices are per million tokens, the unit pi stores them in. */
export function priceFor(provider: string, model: string): Pricing | null {
  if (!existsSync(MODELS_STORE)) return null;
  let store: Record<string, { models?: { id: string; cost?: Pricing }[] }>;
  try {
    store = JSON.parse(readFileSync(MODELS_STORE, "utf-8")) as typeof store;
  } catch {
    return null;
  }
  const block = (store as Record<string, unknown>).providers ?? store;
  const models = (block as Record<string, { models?: { id: string; cost?: Pricing }[] }>)[provider]?.models;
  const entry = (models ?? []).find((candidate) => candidate.id === model);
  const cost = entry?.cost;
  if (!cost) return null;
  return {
    input: Number(cost.input ?? 0),
    output: Number(cost.output ?? 0),
    cacheRead: Number(cost.cacheRead ?? cost.input ?? 0),
  };
}

export function costOf(pricing: Pricing | null, usage: Usage): { usd: number; priced: boolean } {
  if (!pricing) return { usd: 0, priced: false };
  const cached = Math.min(usage.cached, usage.prompt);
  const fresh = Math.max(0, usage.prompt - cached);
  const usd =
    (fresh * pricing.input + cached * pricing.cacheRead + usage.completion * pricing.output) / 1_000_000;
  return { usd, priced: true };
}

/** Pull a token count out of either the OpenAI or the DeepSeek usage shape. */
export function readUsage(responseUsage: unknown): Usage {
  const usage = (responseUsage ?? {}) as Record<string, unknown>;
  const details = (usage.prompt_tokens_details ?? {}) as Record<string, unknown>;
  const cached = Number(details.cached_tokens ?? usage.prompt_cache_hit_tokens ?? 0) || 0;
  return {
    prompt: Number(usage.prompt_tokens ?? 0) || 0,
    completion: Number(usage.completion_tokens ?? 0) || 0,
    cached,
  };
}

export class Ledger {
  readonly path: string;
  private readonly script: string;
  private readonly phase: string;
  private readonly provider: string;
  private readonly model: string;
  private readonly pricing: Pricing | null;
  totalUsd = 0;
  calls = 0;
  unpriced = 0;

  constructor(options: {
    script: string;
    phase: string;
    provider: string;
    model: string;
    path?: string;
  }) {
    this.path = options.path ?? join(OUT_DIR, "spend.jsonl");
    this.script = options.script;
    this.phase = options.phase;
    this.provider = options.provider;
    this.model = options.model;
    this.pricing = priceFor(options.provider, options.model);
    mkdirSync(dirname(this.path), { recursive: true });
  }

  record(usage: Usage, item?: string): number {
    const { usd, priced } = costOf(this.pricing, usage);
    this.totalUsd += usd;
    this.calls++;
    if (!priced) this.unpriced++;
    const entry: SpendEntry = {
      ts: Date.now(),
      script: this.script,
      phase: this.phase,
      provider: this.provider,
      model: this.model,
      prompt_tokens: usage.prompt,
      completion_tokens: usage.completion,
      cached_tokens: usage.cached,
      cost_usd: Math.round(usd * 1_000_000) / 1_000_000,
      priced,
      item,
    };
    appendFileSync(this.path, `${JSON.stringify(entry)}\n`);
    return usd;
  }

  /** One line for the end of a run, with the ledger's running total. */
  summary(): string {
    const all = readLedger(this.path);
    const parts = [
      `spent $${this.totalUsd.toFixed(4)} this run over ${this.calls} calls`,
      `ledger total $${all.reduce((sum, entry) => sum + entry.cost_usd, 0).toFixed(3)}`,
    ];
    if (this.unpriced > 0) parts.push(`${this.unpriced} calls had no pricing entry`);
    return parts.join(", ");
  }
}

export function readLedger(path = join(OUT_DIR, "spend.jsonl")): SpendEntry[] {
  if (!existsSync(path)) return [];
  const entries: SpendEntry[] = [];
  for (const line of readFileSync(path, "utf-8").split("\n")) {
    if (!line.trim()) continue;
    try {
      entries.push(JSON.parse(line) as SpendEntry);
    } catch {
      continue;
    }
  }
  return entries;
}

export interface SpendGroup {
  key: string;
  calls: number;
  prompt: number;
  completion: number;
  usd: number;
  medianUsd: number;
}

export function groupSpend(entries: SpendEntry[], keyOf: (entry: SpendEntry) => string): SpendGroup[] {
  const groups = new Map<string, SpendEntry[]>();
  for (const entry of entries) {
    const key = keyOf(entry);
    const list = groups.get(key) ?? [];
    list.push(entry);
    groups.set(key, list);
  }
  return [...groups.entries()]
    .map(([key, list]) => ({
      key,
      calls: list.length,
      prompt: list.reduce((sum, entry) => sum + entry.prompt_tokens, 0),
      completion: list.reduce((sum, entry) => sum + entry.completion_tokens, 0),
      usd: list.reduce((sum, entry) => sum + entry.cost_usd, 0),
      medianUsd: median(list.map((entry) => entry.cost_usd)),
    }))
    .sort((a, b) => b.usd - a.usd);
}
