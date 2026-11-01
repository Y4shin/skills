/**
 * Build the corpus: one row per assistant message that hands control back to
 * the operator, with the short-term window the operator remembers and the
 * features that describe the treatment and the agent's context.
 *
 * Deterministic. No model calls.
 *
 *   node evals/corpus.ts                       # every session under ~/.pi/agent/sessions
 *   node evals/corpus.ts --project homelab-nix # one project
 *   node evals/corpus.ts --window 1            # sensitivity: 1 remembered message
 */

import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { basename, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  OUT_DIR,
  flagBool,
  flagNumber,
  flagString,
  parseArgs,
  TELEMETRY_DB,
  SESSIONS_DIR,
} from "./lib/config.ts";
import {
  buildWindow,
  classifyMessage,
  listSessionFiles,
  measureMessage,
  minutesInto,
  minutesSinceContextMdRead,
  parseSession,
  type MessageClass,
  type MessageMetrics,
  type WindowEntry,
} from "./lib/sessions.ts";

export interface CorpusRow {
  id: string;
  sessionId: string;
  sessionPath: string;
  line: number;
  ts: number;
  cwd: string;
  project: string;
  model: string | null;
  provider: string | null;
  thinkingLevel: string | null;
  /** Treatment: the shipped guide version that was in the prompt, if any. */
  hasAddendum: boolean;
  addendumChars: number | null;
  addendumSha: string | null;
  hasProjectContext: boolean;
  projectContextChars: number | null;
  promptMentionsContextMd: boolean;
  skillCount: number;
  /** The agent's context, recorded separately from the operator's window. */
  contextTokensAtStart: number | null;
  contextMdReadMinutesAgo: number | null;
  minutesInto: number;
  cls: MessageClass;
  metrics: MessageMetrics;
  window: WindowEntry[];
  text: string;
}

function dbSessionId(sessionId: string): string {
  const tail = sessionId.split("_").pop();
  return tail ?? sessionId;
}

interface TurnRow {
  start: number;
  tokens: number;
}

function loadTurns(path: string): Map<string, TurnRow[]> {
  const map = new Map<string, TurnRow[]>();
  if (!existsSync(path)) {
    console.error(`no telemetry database at ${path}; context token counts will be null`);
    return map;
  }
  let db: DatabaseSync;
  try {
    db = new DatabaseSync(path, { readOnly: true });
  } catch {
    console.error(`could not open ${path}; continuing without context token counts`);
    return map;
  }
  const query = db.prepare(
    "SELECT session_id, started_unix_ms, context_tokens_at_start FROM turns " +
      "WHERE context_tokens_at_start IS NOT NULL ORDER BY started_unix_ms",
  );
  for (const row of query.iterate() as Iterable<Record<string, number | string>>) {
    const sessionId = String(row.session_id);
    const list = map.get(sessionId) ?? [];
    list.push({ start: Number(row.started_unix_ms), tokens: Number(row.context_tokens_at_start) });
    map.set(sessionId, list);
  }
  db.close();
  return map;
}

function contextTokensAt(turns: TurnRow[] | undefined, ts: number): number | null {
  if (!turns || turns.length === 0) return null;
  let low = 0;
  let high = turns.length - 1;
  let found: TurnRow | null = null;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (turns[mid].start <= ts) {
      found = turns[mid];
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return found ? found.tokens : null;
}

async function main(): Promise<void> {
  const { flags } = parseArgs(process.argv.slice(2));
  const maxWindow = flagNumber(flags, "window", 3);
  const maxMinutes = flagNumber(flags, "minutes", 20);
  const projectFilter = flagString(flags, "project");
  const since = flagString(flags, "since");
  const outPath = flagString(flags, "out") ?? join(OUT_DIR, "corpus.jsonl");
  const sessionsRoot = flagString(flags, "sessions") ?? SESSIONS_DIR;
  const withAck = flagBool(flags, "keep-acks");

  const sinceMs = since === undefined ? 0 : Date.parse(since);
  const files = listSessionFiles(sessionsRoot, flagBool(flags, "include-subagents"));
  const turns = loadTurns(flagString(flags, "db") ?? TELEMETRY_DB);

  const rows: CorpusRow[] = [];
  let skippedNoPrompt = 0;
  let sessions = 0;

  for (const path of files) {
    const record = parseSession(path);
    if (!record) continue;
    const project = basename(record.cwd || "unknown");
    if (projectFilter && project !== projectFilter) continue;
    if (record.startedAt < sinceMs) continue;

    sessions++;
    if (!record.prompt.captured) skippedNoPrompt++;

    const turnsForSession = turns.get(dbSessionId(record.sessionId));
    for (let index = 0; index < record.items.length; index++) {
      const item = record.items[index];
      if (!item.isFinal) continue;
      const cls = classifyMessage(item.text);
      if (cls === "ack" && !withAck) continue;

      rows.push({
        id: `${record.sessionId}:${item.line}`,
        sessionId: record.sessionId,
        sessionPath: record.path,
        line: item.line,
        ts: item.ts,
        cwd: record.cwd,
        project,
        model: record.model,
        provider: record.provider,
        thinkingLevel: record.thinkingLevel,
        hasAddendum: record.prompt.addendum !== null,
        addendumChars: record.prompt.addendumChars,
        addendumSha: record.prompt.addendumSha,
        hasProjectContext: record.prompt.projectContextChars !== null,
        projectContextChars: record.prompt.projectContextChars,
        promptMentionsContextMd: record.prompt.projectContextMentionsContextMd,
        skillCount: record.prompt.skillCount,
        contextTokensAtStart: contextTokensAt(turnsForSession, item.ts),
        contextMdReadMinutesAgo: minutesSinceContextMdRead(record, item.line),
        minutesInto: minutesInto(record, item.ts),
        cls,
        metrics: measureMessage(item.text),
        window: buildWindow(record.items, index, maxWindow, maxMinutes),
        text: item.text,
      });
    }
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const body = rows.map((row) => JSON.stringify(row)).join("\n");
  writeFileSync(outPath, body.length > 0 ? `${body}\n` : "");

  const treated = rows.filter((row) => row.hasAddendum).length;
  const byClass = new Map<string, number>();
  for (const row of rows) byClass.set(row.cls, (byClass.get(row.cls) ?? 0) + 1);
  const byGuide = new Map<string, number>();
  for (const row of rows) {
    if (!row.hasAddendum) continue;
    const key = `${row.addendumChars} chars (${row.addendumSha})`;
    byGuide.set(key, (byGuide.get(key) ?? 0) + 1);
  }

  console.log(`wrote ${rows.length} rows from ${sessions} sessions to ${outPath}`);
  console.log(`  window: last ${maxWindow} messages, at most ${maxMinutes} minutes back`);
  console.log(`  with the guide in the prompt: ${treated} rows`);
  for (const [key, count] of [...byGuide.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${key}: ${count}`);
  }
  console.log(`  classes: ${[...byClass.entries()].map(([k, v]) => `${k}=${v}`).join(" ")}`);
  if (skippedNoPrompt > 0) {
    console.log(`  ${skippedNoPrompt} sessions stored no system prompt, so their treatment is unknown`);
  }
}

await main();
