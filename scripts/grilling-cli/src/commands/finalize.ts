// Finalize command — checks coast-clear (empty frontier, all answered, no
// unresolved contradictions); if clear, emits markdown, stops the server,
// removes the temp dir + .grilling.json entry.
import { loadState, type GrillingState } from "../state.js";
import { computeFrontier } from "./get.js";
import { writeFile, rm } from "node:fs/promises";
import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface FinalizeInput {
  cwd: string;
}

export interface FinalizeResult {
  exitCode: number;
  markdownPath: string;
}

export async function finalize(dir: string, cwd: string, key?: string): Promise<FinalizeResult> {
  const state = loadState(dir);

  // Check 1: empty grilling = not clear.
  if (state.questions.length === 0) {
    throw new Error("Cannot finalize: no questions resolved (empty grilling).");
  }

  // Check 2: non-empty frontier (unanswered questions with met deps).
  const frontier = computeFrontier(state);
  if (frontier.length > 0) {
    const ids = frontier.map((q) => q.id).join(", ");
    throw new Error(
      `Cannot finalize: frontier is non-empty — ${frontier.length} unanswered question(s): ${ids}`,
    );
  }

  // Check 3: any unanswered questions (even blocked ones).
  const unanswered = state.questions.filter((q) => !q.answered);
  if (unanswered.length > 0) {
    const ids = unanswered.map((q) => q.id).join(", ");
    throw new Error(
      `Cannot finalize: ${unanswered.length} unanswered question(s): ${ids}`,
    );
  }

  // Check 4: unresolved contradictions.
  const unresolvedContras = state.edges.filter(
    (e) => e.type === "contra" && !e.resolved,
  );
  if (unresolvedContras.length > 0) {
    const ids = unresolvedContras.map((e) => e.id).join(", ");
    throw new Error(
      `Cannot finalize: ${unresolvedContras.length} unresolved contradiction(s): ${ids}`,
    );
  }

  // Coast is clear — emit markdown (before cleanup, so we can still read state).
  const markdown = renderMarkdown(state);
  const slug = "grilling";
  const mdPath = join(cwd, `${slug}-grilling-summary.md`);
  await writeFile(mdPath, markdown, "utf-8");

  // Stop the server process if a real pid exists.
  const pidFile = join(dir, "grilling.pid");
  if (existsSync(pidFile)) {
    const pidStr = readFileSync(pidFile, "utf-8").trim();
    const pid = parseInt(pidStr, 10);
    if (pid > 0) {
      try {
        process.kill(pid, "SIGTERM");
      } catch {
        // Process may already be dead — ignore.
      }
    }
  }

  // Remove the .grilling.json key entry if a key was provided.
  if (key) {
    const mapPath = join(cwd, ".grilling.json");
    if (existsSync(mapPath)) {
      try {
        const map = JSON.parse(readFileSync(mapPath, "utf-8")) as Record<string, string>;
        delete map[key];
        writeFileSync(mapPath, JSON.stringify(map, null, 2), "utf-8");
      } catch {
        // Corrupt map file — best effort, don't block finalize.
      }
    }
  }

  // Remove the temp dir.
  try {
    await rm(dir, { recursive: true, force: true });
  } catch {
    // Best effort — don't block finalize if cleanup fails.
  }

  return { exitCode: 0, markdownPath: mdPath };
}

function renderMarkdown(state: GrillingState): string {
  const lines: string[] = [];

  lines.push("# Grilling Summary");
  lines.push("");

  // Summary sidebar.
  lines.push("## Summary");
  lines.push("");
  lines.push(state.summary || "(no summary provided)");
  lines.push("");

  // Questions & answers, grouped by round.
  const rounds = [...state.rounds].sort((a, b) => a.number - b.number);
  if (rounds.length === 0 && state.questions.length > 0) {
    // If no rounds tracked, just list all questions.
    lines.push("## Questions & Answers");
    lines.push("");
    for (const q of state.questions) {
      renderQuestion(lines, state, q);
    }
  } else {
    for (const round of rounds) {
      lines.push(`## Round ${round.number}`);
      lines.push("");
      const roundQuestions = state.questions
        .filter((q) => q.round === round.number)
        .sort((a, b) => a.id.localeCompare(b.id));
      for (const q of roundQuestions) {
        renderQuestion(lines, state, q);
      }
    }
  }

  // Edges (if any).
  if (state.edges.length > 0) {
    lines.push("## Edges");
    lines.push("");
    for (const e of state.edges) {
      const status = e.type === "contra" && e.resolved ? " (resolved)" : "";
      lines.push(`- ${e.from} →${e.type}→ ${e.to}${status}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function renderQuestion(
  lines: string[],
  state: GrillingState,
  q: GrillingState["questions"][number],
): void {
  lines.push(`### ${q.title}`);
  lines.push("");
  lines.push(`- **ID:** ${q.id}`);
  lines.push(`- **Recommendation:** ${q.rec}`);
  if (q.deps.length > 0) {
    lines.push(`- **Dependencies:** ${q.deps.join(", ")}`);
  }
  lines.push("");
  lines.push(`**Body:** ${q.body}`);
  lines.push("");
  const answer = state.answers?.[q.id];
  lines.push(`**Answer:** ${answer ?? "(not answered)"}`);
  lines.push("");
}
