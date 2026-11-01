/**
 * Read pi session transcripts into the shape the benchmark needs.
 *
 * The transcript is the only place that carries three things the telemetry
 * database does not: the rendered system prompt (so the guide version is
 * measurable), the tool arguments (so a `CONTEXT.md` read is visible), and the
 * message text itself.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { SESSIONS_DIR, shortHash } from "./config.ts";

export type MessageClass = "report" | "answer" | "question" | "refusal" | "ack";

export interface ToolCall {
  id: string;
  name: string;
  args: string;
}

export interface Item {
  kind: "user" | "assistant" | "toolResult" | "system";
  /** Milliseconds since epoch. */
  ts: number;
  text: string;
  /** True when this assistant message hands control back to the operator. */
  isFinal: boolean;
  /** Skill name when this user message is a pi skill injection. */
  skill?: string;
  skillArgs?: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
  toolName?: string;
  reasoning?: string;
  line: number;
}

export interface PromptSections {
  addendumChars: number | null;
  addendumSha: string | null;
  addendum: string | null;
  projectContextChars: number | null;
  projectContextMentionsContextMd: boolean;
  skillCount: number;
  sectionNames: string[];
  /** False when the transcript stored no system prompt at all (older formats). */
  captured: boolean;
}

export interface SessionRecord {
  path: string;
  sessionId: string;
  cwd: string;
  startedAt: number;
  model: string | null;
  provider: string | null;
  thinkingLevel: string | null;
  prompt: PromptSections;
  /** Raw rendered sections, kept for counterfactual replay. */
  rawSections: Record<string, string> | null;
  items: Item[];
}

const SKILL_TAG = /^<skill name="([^"]+)" location="[^"]*">/;

function blockText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  const parts: string[] = [];
  for (const block of content) {
    if (typeof block !== "object" || block === null) continue;
    const typed = block as { type?: string; text?: string; thinking?: string };
    if (typed.type === "text" && typeof typed.text === "string") parts.push(typed.text);
  }
  return parts.join("");
}

function blockThinking(content: unknown): string {
  if (!Array.isArray(content)) return "";
  const parts: string[] = [];
  for (const block of content) {
    if (typeof block !== "object" || block === null) continue;
    const typed = block as { type?: string; thinking?: string };
    if (typed.type === "thinking" && typeof typed.thinking === "string") parts.push(typed.thinking);
  }
  return parts.join("");
}

function blockToolCalls(content: unknown): ToolCall[] {
  if (!Array.isArray(content)) return [];
  const calls: ToolCall[] = [];
  for (const block of content) {
    if (typeof block !== "object" || block === null) continue;
    const typed = block as { type?: string; id?: string; name?: string; arguments?: unknown };
    if (typed.type !== "toolCall" || !typed.id || !typed.name) continue;
    calls.push({ id: typed.id, name: typed.name, args: JSON.stringify(typed.arguments ?? {}) });
  }
  return calls;
}

function parseTimestamp(value: unknown, fallback: number): number {
  if (typeof value !== "string") return fallback;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function parseSession(path: string): SessionRecord | null {  let lines: string[];
  try {
    lines = readFileSync(path, "utf-8").split("\n");
  } catch {
    return null;
  }

  const record: SessionRecord = {
    path,
    sessionId: basename(path).replace(/\.jsonl$/, ""),
    cwd: "",
    startedAt: 0,
    model: null,
    provider: null,
    thinkingLevel: null,
    prompt: {
      addendumChars: null,
      addendumSha: null,
      addendum: null,
      projectContextChars: null,
      projectContextMentionsContextMd: false,
      skillCount: 0,
      sectionNames: [],
      captured: false,
    },
    rawSections: null,
    items: [],
  };

  let lastTs = 0;
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (!line.trim()) continue;
    let entry: Record<string, unknown>;
    try {
      entry = JSON.parse(line) as Record<string, unknown>;
    } catch {
      continue;
    }

    const type = entry.type as string | undefined;
    const ts = parseTimestamp(entry.timestamp, lastTs);
    lastTs = ts;

    if (type === "session") {
      record.sessionId = (entry.id as string) ?? record.sessionId;
      record.cwd = (entry.cwd as string) ?? "";
      record.startedAt = ts;
      continue;
    }
    if (type === "model_change") {
      record.model = (entry.modelId as string) ?? record.model;
      record.provider = (entry.provider as string) ?? record.provider;
      continue;
    }
    if (type === "thinking_level_change") {
      record.thinkingLevel = (entry.thinkingLevel as string) ?? record.thinkingLevel;
      continue;
    }
    if (type !== "message") continue;

    const message = (entry.message ?? {}) as Record<string, unknown>;
    const role = message.role as string | undefined;

    if (role === "system") {
      const sections = message.sections as Record<string, string> | undefined;
      if (!sections) continue;
      // pi writes the full prompt once, then patches single sections on tool
      // changes. Keep the widest set, never the latest partial patch.
      if (record.prompt.sectionNames.length >= Object.keys(sections).length) continue;
      record.prompt.captured = true;
      record.prompt.sectionNames = Object.keys(sections);
      record.rawSections = sections;
      const addendum = sections.addendum;
      if (typeof addendum === "string") {
        // pi wraps the append-system file in <addendum> tags.
        const inner = addendum.replace(/^<addendum>\n?/, "").replace(/\n?<\/addendum>$/, "");
        record.prompt.addendum = inner;
        record.prompt.addendumChars = inner.length;
        record.prompt.addendumSha = shortHash(inner);
      }
      const projectContext = sections.project_context;
      if (typeof projectContext === "string") {
        record.prompt.projectContextChars = projectContext.length;
        record.prompt.projectContextMentionsContextMd = /CONTEXT\.md/.test(projectContext);
      }
      const skills = sections.skills;
      if (typeof skills === "string") {
        record.prompt.skillCount = (skills.match(/<name>/g) ?? []).length;
      }
      continue;
    }

    if (role === "user") {
      const text = blockText(message.content);
      if (!text.trim()) continue;
      const item: Item = { kind: "user", ts, text, isFinal: false, line: index };
      const skill = SKILL_TAG.exec(text.trim());
      if (skill) {
        item.skill = skill[1];
        item.skillArgs = text.trim().slice(skill[0].length).trim();
      }
      record.items.push(item);
      continue;
    }

    if (role === "assistant") {
      const text = blockText(message.content);
      const calls = blockToolCalls(message.content);
      const stopReason = message.stopReason as string | undefined;
      const isFinal = stopReason === "stop" && calls.length === 0 && text.trim().length > 0;
      record.items.push({
        kind: "assistant",
        ts,
        text,
        isFinal,
        toolCalls: calls,
        reasoning: blockThinking(message.content) || undefined,
        line: index,
      });
      continue;
    }

    if (role === "toolResult") {
      record.items.push({
        kind: "toolResult",
        ts,
        text: blockText(message.content).slice(0, 2000),
        isFinal: false,
        toolCallId: message.toolCallId as string | undefined,
        toolName: message.toolName as string | undefined,
        line: index,
      });
    }
  }

  if (!record.startedAt) record.startedAt = record.items[0]?.ts ?? 0;
  return record;
}

/**
 * Every `*.jsonl` under the sessions root, newest first.
 *
 * A top-level session lives at `<root>/<project>-<path>/<session>.jsonl`. Deeper
 * files are subagent runs stored beside their parent (`<session>/<agent>/run-N/`),
 * whose messages were written for another agent and never shown to the
 * operator, so they are excluded unless asked for.
 */
export function listSessionFiles(
  root = SESSIONS_DIR,
  includeSubagents = false,
): string[] {
  const found: { path: string; mtime: number; depth: number }[] = [];
  const walk = (dir: string, depth: number): void => {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      const path = join(dir, name);
      let info;
      try {
        info = statSync(path);
      } catch {
        continue;
      }
      if (info.isDirectory()) walk(path, depth + 1);
      else if (name.endsWith(".jsonl")) found.push({ path, mtime: info.mtimeMs, depth });
    }
  };
  walk(root, 0);
  const usable = includeSubagents ? found : found.filter((entry) => entry.depth === 1);
  return usable.sort((a, b) => b.mtime - a.mtime).map((entry) => entry.path);
}

export interface WindowEntry {
  kind: "operator" | "agent";
  text: string;
  minutesBefore: number;
  skill?: string;
  skillArgs?: string;
}

/**
 * The operator's view of the conversation just before `finalIndex`.
 *
 * Counts only the operator's messages and the agent's turn-ending messages,
 * stops at the first limit hit, and never looks further back than
 * `maxMinutes`. Tool traffic and reasoning are excluded on purpose: the
 * operator never saw them, and a judge holding them would score the run rather
 * than the message.
 */
export function buildWindow(
  items: Item[],
  finalIndex: number,
  maxItems: number,
  maxMinutes: number,
): WindowEntry[] {
  const final = items[finalIndex];
  const collected: WindowEntry[] = [];
  for (let index = finalIndex - 1; index >= 0; index--) {
    const item = items[index];
    if (item.kind !== "user" && !item.isFinal) continue;
    if (!item.text.trim()) continue;
    const minutesBefore = (final.ts - item.ts) / 60000;
    if (minutesBefore > maxMinutes) break;
    collected.push({
      kind: item.kind === "user" ? "operator" : "agent",
      text: item.text,
      minutesBefore: Math.round(minutesBefore * 10) / 10,
      skill: item.skill,
      skillArgs: item.skillArgs,
    });
    if (collected.length >= maxItems) break;
  }
  return collected.reverse();
}

/** How the operator saw a message: an injected skill body is not operator speech. */
export function renderWindowEntry(entry: WindowEntry, maxChars = 1200): string {
  const header =
    entry.kind === "operator"
      ? `OPERATOR (${entry.minutesBefore} min before)`
      : `AGENT (${entry.minutesBefore} min before)`;
  if (entry.skill) {
    const args = entry.skillArgs ? ` ${entry.skillArgs}` : "";
    return `${header}: [invoked /skill:${entry.skill}${args}]`;
  }
  const body = entry.text.length > maxChars ? `${entry.text.slice(0, maxChars)}\n[...truncated]` : entry.text;
  return `${header}:\n${body}`;
}

const REFUSAL = /^(I can't|I cannot|I won't|I will not|I'm not able|Blocked|Refused)\b|^Nope\b/i;
const REFUSAL_SOFT = /\b(cannot proceed|cannot continue|unable to proceed|refuse to|blocked by)\b/i;

function countMatches(text: string, pattern: RegExp): number {
  return (text.match(pattern) ?? []).length;
}

/**
 * A coarse class for the message, because a 40-line close-out and a one-word
 * acknowledgement are not the same measurement. Not a judgement of quality.
 */
export function classifyMessage(text: string): MessageClass {
  const trimmed = text.trim();
  const chars = trimmed.length;
  const headings = countMatches(trimmed, /^#{1,6} .+$/gm);
  const bullets = countMatches(trimmed, /^\s*(?:[-*]|\d+\.) .+$/gm);
  const boldLeads = countMatches(trimmed, /^\s*\*\*[^*]+\*\*/gm);

  if (headings >= 2 || bullets >= 3 || chars >= 1200 || (bullets >= 2 && boldLeads >= 2)) return "report";
  if (chars < 1200 && (REFUSAL.test(trimmed) || REFUSAL_SOFT.test(trimmed))) return "refusal";
  if (/\?\s*$/.test(trimmed) && chars < 800) return "question";
  if (chars < 200) return "ack";
  return "answer";
}

export interface MessageMetrics {
  chars: number;
  lines: number;
  headings: number;
  bullets: number;
  boldLeads: number;
  codeSpans: number;
  questionMarks: number;
}

export function measureMessage(text: string): MessageMetrics {
  return {
    chars: text.length,
    lines: text.split("\n").length,
    headings: countMatches(text, /^#{1,6} .+$/gm),
    bullets: countMatches(text, /^\s*(?:[-*]|\d+\.) .+$/gm),
    boldLeads: countMatches(text, /^\s*\*\*[^*]+\*\*/gm),
    codeSpans: countMatches(text, /`[^`]+`/g),
    questionMarks: countMatches(text, /\?/g),
  };
}

/** Minutes from the session start to `ts`. */
export function minutesInto(record: SessionRecord, ts: number): number {
  return Math.round(((ts - record.startedAt) / 60000) * 10) / 10;
}

/**
 * The most recent `CONTEXT.md` read before `ts`, in minutes, or null.
 *
 * Read from the transcript because tool arguments are not stored in the
 * telemetry database (`tool_executions.args_json` is null there).
 */
export function minutesSinceContextMdRead(record: SessionRecord, beforeLine: number): number | null {
  let best: number | null = null;
  for (const item of record.items) {
    if (item.line >= beforeLine) break;
    const calls = item.toolCalls;
    if (!calls) continue;
    for (const call of calls) {
      if (!call.args.includes("CONTEXT.md")) continue;
      best = item.ts;
    }
  }
  if (best === null) return null;
  const target = record.items.find((item) => item.line === beforeLine);
  if (!target) return null;
  return Math.round(((target.ts - best) / 60000) * 10) / 10;
}
