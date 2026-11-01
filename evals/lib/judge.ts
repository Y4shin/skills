/**
 * The judge: model resolution, the grading prompt, and response parsing.
 *
 * The rubrics are the shipped guide's own rules, read from the skill at run
 * time, so the benchmark measures what ships rather than a copy of it.
 */

import { existsSync, readFileSync } from "node:fs";
import { AUTH_FILE, GUIDE_PATH, MODELS_STORE, flagString } from "./config.ts";
import { classifyMessage, renderWindowEntry, type MessageClass, type WindowEntry } from "./sessions.ts";
import { readUsage, type Usage } from "./spend.ts";

export interface JudgeConfig {
  provider: string;
  model: string;
  baseUrl: string;
  apiKey: string;
  /** How the model was chosen, printed so a run is reproducible. */
  source: string;
}

interface StoreModel {
  id: string;
  api?: string;
  baseUrl?: string;
  provider?: string;
}

type Store = Record<string, { models?: StoreModel[] }>;

/**
 * providers keyed by name. pi writes them at the top level; some versions
 * wrap them in a `providers` object, so both shapes are accepted.
 */
function readStore(): Store {
  const raw = readJson(MODELS_STORE);
  const wrapped = raw.providers as Store | undefined;
  if (wrapped && typeof wrapped === "object") return wrapped;
  const store: Store = {};
  for (const [name, value] of Object.entries(raw)) {
    if (value && typeof value === "object" && "models" in (value as object)) {
      store[name] = value as { models?: StoreModel[] };
    }
  }
  return store;
}

export function loadGuide(): string {
  const raw = readFileSync(GUIDE_PATH, "utf-8");
  return raw.replace(/^---\n[\s\S]*?\n---\n/, "").trim();
}

function readJson(path: string): Record<string, unknown> {
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as Record<string, unknown>;
  } catch {
    return {};
  }
}

interface Candidate {
  provider: string;
  model: StoreModel;
  apiKey: string;
}

function candidates(): Candidate[] {
  const store = readStore();
  const auth = readJson(AUTH_FILE) as Record<string, { key?: string }>;
  const out: Candidate[] = [];
  for (const [provider, block] of Object.entries(store)) {
    const apiKey = auth[provider]?.key;
    if (!apiKey) continue;
    for (const model of block.models ?? []) {
      // Only the OpenAI chat-completions shape can be called with a plain POST.
      if (model.api !== "openai-completions") continue;
      out.push({ provider, model, apiKey });
    }
  }
  return out;
}

/**
 * Pick the judge model.
 *
 * Order: `--model`, then `EVAL_MODEL`, then the models pi already has a key
 * for. When more than one is usable the run stops and prints the choice
 * instead of guessing, because the judge's family is a real variable.
 */
export function resolveJudge(flags: Map<string, string | true>): JudgeConfig {
  const requested = flagString(flags, "model") ?? process.env.EVAL_MODEL;

  if (requested) {
    const [maybeProvider, ...rest] = requested.split(/[/:]/);
    const modelId = rest.length > 0 ? rest.join("/") : requested;
    const provider = rest.length > 0 ? maybeProvider : (process.env.EVAL_PROVIDER ?? maybeProvider);

    const store = readStore();
    const auth = readJson(AUTH_FILE) as Record<string, { key?: string }>;
    const model = (store[provider]?.models ?? []).find((entry) => entry.id === modelId);
    const apiKey = auth[provider]?.key ?? process.env.OPENAI_API_KEY;

    if (model && apiKey) {
      if (model.api !== "openai-completions") {
        console.error(
          `judge ${provider}/${modelId} speaks ${model.api}; this harness only POSTs chat-completions.`,
        );
        process.exit(2);
      }
      return {
        provider,
        model: modelId,
        baseUrl: model.baseUrl ?? "https://api.openai.com/v1",
        apiKey,
        source: `--model / EVAL_MODEL (${provider})`,
      };
    }

    const baseUrl = process.env.OPENAI_BASE_URL ?? model?.baseUrl;
    if (!baseUrl || !apiKey) {
      console.error(
        `cannot resolve judge "${requested}". Pass --model <provider>/<id> for a model pi has a key for, ` +
          `or set EVAL_MODEL with OPENAI_BASE_URL and OPENAI_API_KEY.`,
      );
      process.exit(2);
    }
    return { provider, model: modelId, baseUrl, apiKey, source: "EVAL_MODEL + OPENAI_* env" };
  }

  const usable = candidates();
  if (usable.length === 0) {
    console.error(
      "no judge model available: no provider in models-store.json has a key in auth.json with an " +
        "openai-completions model. Pass --model or set EVAL_MODEL with OPENAI_BASE_URL and OPENAI_API_KEY.",
    );
    process.exit(2);
  }
  if (usable.length > 1) {
    console.error("more than one usable judge model; pick one with --model <provider>/<id>:");
    for (const entry of usable) console.error(`  ${entry.provider}/${entry.model.id}`);
    process.exit(2);
  }
  const only = usable[0];
  return {
    provider: only.provider,
    model: only.model.id,
    baseUrl: only.model.baseUrl ?? "https://api.openai.com/v1",
    apiKey: only.apiKey,
    source: "auto-detected from models-store.json + auth.json",
  };
}

export function describeJudge(config: JudgeConfig): string {
  return `${config.provider}/${config.model} at ${config.baseUrl} (${config.source})`;
}

interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: unknown[];
  tool_call_id?: string;
  reasoning_content?: string;
}

export interface ChatOptions {
  temperature: number;
  maxTokens: number;
  json: boolean;
}

export interface ChatResult {
  content: string;
  usage: Usage;
  /** Billed responses consumed, including retried truncations. */
  billedCalls: number;
}

/**
 * One chat-completions call against an OpenAI-compatible endpoint, with
 * bounded retries on rate limits and truncation. `json` asks for a JSON object
 * and falls back once if the endpoint rejects the parameter.
 *
 * `onUsage` fires for every response the provider billed, including one that
 * is retried for truncation, so the ledger cannot under-count.
 */
export async function chat(
  config: JudgeConfig,
  messages: ChatMessage[],
  initialOptions: ChatOptions,
  onUsage?: (usage: Usage) => void,
): Promise<ChatResult> {
  let options = initialOptions;
  let jsonMode = options.json;
  let billedCalls = 0;
  const total: Usage = { prompt: 0, completion: 0, cached: 0 };
  const url = `${config.baseUrl.replace(/\/$/, "")}/chat/completions`;

  for (let attempt = 0; attempt < 6; attempt++) {
    const body: Record<string, unknown> = {
      model: config.model,
      messages,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
    };
    if (jsonMode) body.response_format = { type: "json_object" };

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(body),
      });
    } catch (error) {
      if (attempt === 5) throw error;
      await sleep(1000 * (attempt + 1));
      continue;
    }

    if (response.status === 400 && jsonMode) {
      jsonMode = false;
      continue;
    }
    if (response.status === 429 || response.status >= 500) {
      if (attempt === 5) {
        throw new Error(`judge call failed after retries: HTTP ${response.status} ${await response.text()}`);
      }
      const retryAfter = Number(response.headers.get("retry-after") ?? "0");
      await sleep(retryAfter > 0 ? retryAfter * 1000 : 1000 * 2 ** attempt);
      continue;
    }
    if (!response.ok) {
      throw new Error(`judge call failed: HTTP ${response.status} ${await response.text()}`);
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string }; finish_reason?: string }[];
      usage?: unknown;
    };
    const usage = readUsage(payload.usage);
    billedCalls++;
    total.prompt += usage.prompt;
    total.completion += usage.completion;
    total.cached += usage.cached;
    onUsage?.(usage);

    const choice = payload.choices?.[0];
    const content = choice?.message?.content;
    if (choice?.finish_reason === "length") {
      // A reasoning model can spend the whole budget thinking, or stop inside
      // the JSON. Either way the message is unusable: give it more room.
      if (options.maxTokens < 8000) {
        options = { ...options, maxTokens: Math.min(8000, options.maxTokens * 2) };
        continue;
      }
      throw new Error(`judge output hit max_tokens=${options.maxTokens} and was truncated`);
    }
    if (typeof content !== "string" || content.trim() === "") {
      throw new Error(`judge call returned no message content (finish_reason=${choice?.finish_reason ?? "unknown"})`);
    }
    return { content, usage: total, billedCalls };
  }
  throw new Error("judge call exhausted retries");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface Judgement {
  class: MessageClass;
  terms_defined: number;
  outcome_first: number;
  labels_explained: number;
  selection: number;
  structure: number;
  needs_followup: boolean;
  reason: string;
}

const DIMENSIONS = [
  "terms_defined",
  "outcome_first",
  "labels_explained",
  "selection",
  "structure",
] as const;

const CLASSES: MessageClass[] = ["report", "answer", "question", "refusal", "ack"];

export function judgeSystemPrompt(guide: string): string {
  return `You grade one message: the last thing an AI coding agent said to a human operator before waiting for a reply.

You do not grade the work, and you cannot see it. Tool calls, tool output, and the agent's reasoning are hidden from you, exactly as they were hidden from the operator. You receive the whole of what the operator had: their own earlier messages and the agent's earlier replies.

Grade against the shipped rules below.

<rules>
${guide}
</rules>

Scoring rules for you:
- Judge readability and selection only. Never penalise a claim for being unverifiable; you cannot verify anything here.
- Do not reward length and do not punish it. A short reply carrying the decision is good. A long reply carrying no decision is not.
- Score from the operator's position, not from a reviewer's.
- Score each dimension on its own evidence. Good structure never raises terms_defined, and a clear opening sentence never raises selection. A message can be well organised and still unreadable, and that is exactly the case this rubric must catch.
- Use the whole 0-4 range. 4 means nothing about that dimension would change. 2 means readable but the operator would stumble. 0 means it fails at that job.

Dimensions, each 0-4:
- terms_defined: every term the agent coined or read during the run is defined where it first appears.
- outcome_first: the first sentence gives the state of the work now, not the history of the run.
- labels_explained: nothing is labelled before it is explained. Headings, bold lead-ins, and bullet labels name only things the operator already knows.
- selection: the message carries the detail that changes what the operator can rely on or decide, and leaves out the rest.
- structure: paragraphs and lists suit the content and the operator can navigate it. No template worn for its own sake.

Also decide needs_followup: true when the message does not contain what the operator needs, so their next turn must be a question. Judge presence, not difficulty: a message that is hard to read but does state the outcome and the next step is false. This field is the one that tracks a real event, so keep it independent of the five dimensions.

Return one JSON object and nothing else, with no code fence:
{"class":"report|answer|question|refusal|ack","terms_defined":0,"outcome_first":0,"labels_explained":0,"selection":0,"structure":0,"needs_followup":false,"reason":"one sentence"}`;
}

export function judgeUserPrompt(
  message: string,
  window: WindowEntry[],
  maxChars = 8000,
): string {
  const rendered = window.length
    ? window.map((entry) => renderWindowEntry(entry)).join("\n\n")
    : "(nothing earlier in the conversation)";
  const body = message.length > maxChars ? `${message.slice(0, maxChars)}\n[...truncated]` : message;
  return `<conversation_window>
${rendered}
</conversation_window>

<message_under_test>
${body}
</message_under_test>`;
}

function clampScore(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(4, Math.round(n)));
}

export function parseJudgement(content: string): Judgement {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error(`judge returned no JSON object: ${content.slice(0, 200)}`);
  const parsed = JSON.parse(content.slice(start, end + 1)) as Record<string, unknown>;

  const rawClass = typeof parsed.class === "string" ? parsed.class.toLowerCase().trim() : "";
  const cls = CLASSES.includes(rawClass as MessageClass) ? (rawClass as MessageClass) : "answer";

  return {
    class: cls,
    terms_defined: clampScore(parsed.terms_defined),
    outcome_first: clampScore(parsed.outcome_first),
    labels_explained: clampScore(parsed.labels_explained),
    selection: clampScore(parsed.selection),
    structure: clampScore(parsed.structure),
    needs_followup: parsed.needs_followup === true || parsed.needs_followup === "true",
    reason: typeof parsed.reason === "string" ? parsed.reason.slice(0, 400) : "",
  };
}

export function meanScore(judgement: Judgement): number {
  const total = DIMENSIONS.reduce((sum, key) => sum + judgement[key], 0);
  return Math.round((total / DIMENSIONS.length) * 100) / 100;
}

export function guideClass(text: string): MessageClass {
  return classifyMessage(text);
}
