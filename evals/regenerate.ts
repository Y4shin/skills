/**
 * Counterfactual regeneration: hold the run fixed, vary only the guide.
 *
 * Takes a real session, rebuilds the exact prompt state just before the agent
 * wrote its closing message, and asks the same model for that message again
 * under several guide variants. Grading the outputs blind is the only way to
 * tell the guide's effect from the run's content, because the historical
 * corpus barely varies the guide.
 *
 *   node evals/regenerate.ts --from-scores --pick 3 --samples 3
 *   node evals/regenerate.ts --session <path>.jsonl --line 812 --samples 2
 *   node evals/regenerate.ts --session <path> --line 812 --candidate evals/guide-candidate.md --dry-run
 *
 * The replay is approximate. The system prompt is reassembled from the stored
 * sections, tool traffic is preserved, and reasoning is sent back when the
 * transcript still has it. Treat a variant comparison as valid and an absolute
 * comparison against the original message as indicative.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import {
  OUT_DIR,
  flagBool,
  flagNumber,
  flagString,
  mapLimit,
  parseArgs,
  readJsonl,
  requirePath,
  shortHash,
} from "./lib/config.ts";
import { chat, describeJudge, loadGuide, resolveJudge } from "./lib/judge.ts";
import { Ledger } from "./lib/spend.ts";
import {
  buildWindow,
  classifyMessage,
  measureMessage,
  parseSession,
  type Item,
  type SessionRecord,
  type WindowEntry,
} from "./lib/sessions.ts";

interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
  reasoning_content?: string;
}

interface Variant {
  name: string;
  addendum: string | null;
}

function buildSystem(sections: Record<string, string>, addendum: string | null): string {
  const parts: string[] = [];
  for (const [name, value] of Object.entries(sections)) {
    if (name === "addendum") {
      if (addendum !== null) parts.push(`<addendum>\n${addendum}\n</addendum>`);
      continue;
    }
    // The transcript stores each section already wrapped in its own tag.
    if (value.trimStart().startsWith(`<${name}>`)) {
      parts.push(value);
      continue;
    }
    parts.push(name === "preamble" ? value : `<${name}>\n${value}\n</${name}>`);
  }
  if (addendum !== null && sections.addendum === undefined) {
    parts.push(`<addendum>\n${addendum}\n</addendum>`);
  }
  return parts.join("\n\n");
}

function toChatMessages(items: Item[], uptoLine: number, budgetChars: number): ChatMessage[] {
  const usable: ChatMessage[] = [];
  for (const item of items) {
    if (item.line >= uptoLine) break;
    if (item.kind === "user") {
      if (!item.text.trim()) continue;
      usable.push({ role: "user", content: item.text });
      continue;
    }
    if (item.kind === "assistant") {
      const calls = item.toolCalls ?? [];
      if (!item.text.trim() && calls.length === 0) continue;
      const message: ChatMessage = {
        role: "assistant",
        content: item.text.trim() ? item.text : null,
      };
      if (calls.length > 0) {
        message.tool_calls = calls.map((call) => ({
          id: call.id,
          type: "function" as const,
          function: { name: call.name, arguments: call.args },
        }));
      }
      if (item.reasoning) message.reasoning_content = item.reasoning;
      usable.push(message);
      continue;
    }
    if (item.kind === "toolResult" && item.toolCallId) {
      usable.push({ role: "tool", tool_call_id: item.toolCallId, content: item.text });
    }
  }

  // Keep the opening user messages and the tail, so the replay fits the
  // budget without moving the state the model is asked to report on.
  const sizeOf = (message: ChatMessage): number => (message.content ?? "").length;
  let total = usable.reduce((sum, message) => sum + sizeOf(message), 0);
  if (total <= budgetChars) return usable;

  const head: ChatMessage[] = [];
  const tail: ChatMessage[] = [];
  let headIndex = 0;
  while (headIndex < usable.length && usable[headIndex].role === "user" && head.length < 2) {
    head.push(usable[headIndex]);
    total -= sizeOf(usable[headIndex]);
    headIndex++;
  }
  for (let index = usable.length - 1; index >= headIndex; index--) {
    if (total <= budgetChars) break;
    tail.unshift(usable[index]);
    total -= sizeOf(usable[index]);
  }
  return [...head, { role: "user", content: "[earlier conversation truncated]" }, ...tail];
}

function variantsFor(session: SessionRecord, flags: Map<string, string | true>): Variant[] {
  const guide = loadGuide();
  const stored = session.prompt.addendum;
  const variants: Variant[] = [
    { name: "none", addendum: null },
    { name: "current", addendum: guide },
  ];
  if (stored && stored.trim() !== guide.trim()) {
    variants.push({ name: "stored", addendum: stored });
  }
  const candidate = flagString(flags, "candidate");
  if (candidate) {
    const text = readFileSync(requirePath(candidate, "candidate guide"), "utf-8").trim();
    variants.push({ name: "candidate", addendum: text });
  }
  return variants;
}

interface Target {
  sessionPath: string;
  line: number;
}

function pickTargets(flags: Map<string, string | true>): Target[] {
  const fromScores = flagBool(flags, "from-scores");
  const sessionPath = flagString(flags, "session");
  const line = flagNumber(flags, "line", 0);

  if (sessionPath && line > 0) return [{ sessionPath, line }];

  if (fromScores) {
    const scoresPath = flagString(flags, "input") ?? join(OUT_DIR, "scores.jsonl");
    const pick = flagNumber(flags, "pick", 3);
    const rows = readJsonl<{ sessionPath?: string; line?: number; mean: number; hasAddendum: boolean }>(scoresPath);
    const worst = rows
      .filter((row) => row.hasAddendum && typeof row.sessionPath === "string" && typeof row.line === "number")
      .sort((a, b) => a.mean - b.mean)
      .slice(0, pick);
    if (worst.length === 0) {
      console.error("no scored rows carrying a sessionPath and line; re-run score.ts with the current version");
      process.exit(2);
    }
    return worst.map((row) => ({ sessionPath: row.sessionPath as string, line: row.line as number }));
  }

  console.error("pass --session <path> --line <n>, or --from-scores [--pick N]");
  process.exit(2);
}

async function main(): Promise<void> {
  const { flags } = parseArgs(process.argv.slice(2));
  const samples = flagNumber(flags, "samples", 2);
  const temperature = flagNumber(flags, "temperature", 0.7);
  const maxChars = flagNumber(flags, "max-chars", 200000);
  const maxWindow = flagNumber(flags, "window", 3);
  const maxMinutes = flagNumber(flags, "minutes", 20);
  const dryRun = flagBool(flags, "dry-run");
  const outPath = flagString(flags, "out") ?? join(OUT_DIR, "variants.jsonl");

  const judge = resolveJudge(flags);
  const targets = pickTargets(flags);
  const ledger = new Ledger({
    script: "regenerate",
    phase: "generate",
    provider: judge.provider,
    model: judge.model,
  });
  console.log(`generator: ${describeJudge(judge)}`);

  const rows: Record<string, unknown>[] = [];

  for (const target of targets) {
    const session = parseSession(requirePath(target.sessionPath, "session"));
    if (!session) {
      console.error(`could not parse ${target.sessionPath}`);
      continue;
    }
    if (!session.rawSections) {
      console.error(`${basename(target.sessionPath)} stored no system prompt; its treatment cannot be varied`);
      continue;
    }
    const finalIndex = session.items.findIndex((item) => item.line === target.line && item.isFinal);
    if (finalIndex === -1) {
      console.error(`line ${target.line} in ${basename(target.sessionPath)} is not a turn-ending message`);
      continue;
    }
    const finalItem = session.items[finalIndex];
    const history = toChatMessages(session.items, target.line, maxChars);
    const variants = variantsFor(session, flags);

    console.log(
      `\n${basename(target.sessionPath)} line ${target.line}: ${finalItem.text.length} chars, ` +
        `${history.length} replay messages, ${variants.length} variants x ${samples} samples`,
    );

    for (const variant of variants) {
      const system = buildSystem(session.rawSections, variant.addendum);
      if (dryRun) {
        console.log(`  [dry-run] ${variant.name}: system ${system.length} chars, history ${history.length}`);
        continue;
      }
      const generated = await mapLimit(Array.from({ length: samples }, (_, i) => i), 1, async (sample) => {
        const itemId = `${session.sessionId}:${target.line}:${variant.name}:${sample}`;
        const result = await chat(
          judge,
          [{ role: "system", content: system }, ...history],
          { temperature, maxTokens: flagNumber(flags, "max-tokens", 3000), json: false },
          (usage) => ledger.record(usage, itemId),
        );
        const text = result.content;
        const window: WindowEntry[] = buildWindow(session.items, finalIndex, maxWindow, maxMinutes);
        rows.push({
          id: `${session.sessionId}:${target.line}:${variant.name}:${sample}`,
          sessionId: session.sessionId,
          sessionPath: target.sessionPath,
          project: basename(session.cwd || "unknown"),
          model: session.model,
          hasAddendum: variant.addendum !== null,
          addendumChars: variant.addendum?.length ?? null,
          addendumSha: variant.addendum ? shortHash(variant.addendum) : null,
          cls: classifyMessage(text),
          metrics: measureMessage(text),
          window,
          text,
          variant: variant.name,
          sample,
        });
        process.stdout.write(".");
        return text;
      });
      void generated;
    }
    process.stdout.write("\n");
  }

  if (dryRun) return;
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(outPath, rows.map((row) => JSON.stringify(row)).join("\n") + (rows.length ? "\n" : ""));
  console.log(`\nwrote ${rows.length} variant messages to ${outPath}`);
  console.log(`  ${ledger.summary()}`);
  console.log(`grade them with: node evals/score.ts --input ${outPath} --out evals/out/variant-scores.jsonl`);
}

await main();
