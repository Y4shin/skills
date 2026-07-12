/**
 * Guidelines extension for the task-workflow.
 *
 * Tracks which programming languages are active in the project/session and
 * auto-injects a reference to project coding guidelines at strategic points:
 * - First turn of a session (after startup, resume, or fork)
 * - After state.yaml changes (new workflow step)
 * - After compaction (context summary may have removed earlier guidelines)
 *
 * Also registers `get_guidelines(language, topic?)` and `list_guidelines()`
 * tools so the agent can fetch detailed guidelines on demand.
 *
 * Guideline files are auto-discovered from the project's docs/ directory:
 *   - docs/testing.md              → topic: testing
 *   - docs/<lang>-guidelines.md    → topic: <lang>
 *   - docs/<lang>-conventions.md   → topic: <lang>
 *   - docs/<topic>-practices.md    → topic: <topic>
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

// ─── Helpers ────────────────────────────────────────────────────────────────────

const EXT_TO_LANG: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "typescript",
  ".mts": "typescript",
  ".cts": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".py": "python",
  ".rs": "rust",
  ".rb": "ruby",
  ".go": "go",
  ".java": "java",
  ".kt": "kotlin",
  ".kts": "kotlin",
  ".swift": "swift",
  ".c": "c",
  ".h": "c",
  ".cpp": "cpp",
  ".hpp": "cpp",
  ".nix": "nix",
  ".sh": "bash",
  ".bash": "bash",
  ".css": "css",
  ".scss": "scss",
  ".html": "html",
  ".json": "json",
  ".yaml": "yaml",
  ".yml": "yaml",
  ".md": "markdown",
  ".zig": "zig",
  ".lua": "lua",
  ".ex": "elixir",
  ".exs": "elixir",
};

// Directories to skip when scanning for source files
const SKIP_DIRS = new Set(["node_modules", ".git", ".venv", "dist", "build", "coverage", ".pytest_cache", "__pycache__", ".git", ".svn"]);

function detectLanguage(filePath: string): string | null {
  const ext = extname(filePath).toLowerCase();
  return EXT_TO_LANG[ext] ?? null;
}

interface GuidelineEntry {
  file: string;
  content: string;
  topics: string[];
}

function collectSourceLanguages(cwd: string): string[] {
  const langs = new Set<string>();

  function walk(dir: string): void {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith(".")) {
            walk(join(dir, entry.name));
          }
        } else if (entry.isFile()) {
          const lang = detectLanguage(entry.name);
          if (lang) langs.add(lang);
        }
      }
    } catch {
      // skip unreadable
    }
  }

  const candidates = ["src", "lib", "app", "tests", "test", "scripts"];
  const seen = new Set<string>();

  for (const dir of candidates) {
    const full = join(cwd, dir);
    const real = existsSync(full) ? full : null;
    if (real && !seen.has(real)) {
      seen.add(real);
      walk(real);
    }
  }

  // Also check root-level source files
  if (!seen.has(cwd)) {
    seen.add(cwd);
    try {
      for (const entry of readdirSync(cwd, { withFileTypes: true })) {
        if (entry.isFile()) {
          const lang = detectLanguage(entry.name);
          if (lang) langs.add(lang);
        }
      }
    } catch {
      // skip
    }
  }

  return [...langs];
}

function discoverGuidelines(cwd: string): Map<string, GuidelineEntry> {
  const docsDir = join(cwd, "docs");
  const cache = new Map<string, GuidelineEntry>();

  if (!existsSync(docsDir)) return cache;

  try {
    for (const entry of readdirSync(docsDir)) {
      const fullPath = join(docsDir, entry);
      try {
        const st = statSync(fullPath);
        if (!st.isFile()) continue;

        const lower = entry.toLowerCase();
        const topics: string[] = [];

        // Recognised naming patterns
        if (lower === "testing.md") {
          topics.push("testing");
        } else if (lower.endsWith("-guidelines.md")) {
          topics.push(lower.replace("-guidelines.md", ""));
        } else if (lower.endsWith("-conventions.md")) {
          topics.push(lower.replace("-conventions.md", ""));
        } else if (lower.endsWith("-practices.md")) {
          topics.push(lower.replace("-practices.md", ""));
        } else {
          continue; // not a recognised guideline file
        }

        const content = readFileSync(fullPath, "utf-8");
        cache.set(entry, { file: relative(cwd, fullPath), content, topics });
      } catch {
        // skip unreadable
      }
    }
  } catch {
    // docs/ missing or unreadable
  }

  return cache;
}

function buildInjectionSnippet(
  activeLanguages: string[],
  guidelineCache: Map<string, GuidelineEntry>,
): string {
  const lines: string[] = [
    "## Project coding guidelines",
    "",
  ];

  if (activeLanguages.length > 0) {
    lines.push(`Source languages: ${activeLanguages.sort().join(", ")}`);
    lines.push("");
  }

  if (guidelineCache.size > 0) {
    lines.push("Available documentation:");
    for (const [, g] of guidelineCache) {
      lines.push(`- \`${g.file}\` — topics: ${g.topics.join(", ")}`);
    }
    lines.push("");
  }

  lines.push(
    "Use `get_guidelines(language, topic?)` to fetch detailed coding guidelines",
    "for a specific language or topic (e.g. mocking, naming, error-handling).",
    "Use `list_guidelines()` to see all available sources.",
    "",
    "Abide by any conventions defined in these project files when writing code.",
  );

  return lines.join("\n");
}

// ─── Extension entry ────────────────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
  // ── In-memory state ──────────────────────────────────────────

  let activeLanguages: string[] = [];
  let guidelineCache: Map<string, GuidelineEntry> = new Map();
  let shouldInject = true;
  let stateChangedSinceLastInject = false;

  // ── Session start: scan project ──────────────────────────────

  pi.on("session_start", async (_event, ctx) => {
    activeLanguages = collectSourceLanguages(ctx.cwd);
    guidelineCache = discoverGuidelines(ctx.cwd);
    shouldInject = true;
    stateChangedSinceLastInject = false;
  });

  // ── Tool call: track languages & state.yaml changes ──────────

  const fileTools = new Set(["read", "write", "edit"]);
  const stateTools = new Set(["task_state_set", "task_set", "task_set_slices"]);

  pi.on("tool_call", async (event, _ctx) => {
    // Track languages from file operations
    if (fileTools.has(event.toolName)) {
      const input = event.input as Record<string, unknown>;
      if (typeof input.path === "string") {
        const lang = detectLanguage(input.path);
        if (lang && !activeLanguages.includes(lang)) {
          activeLanguages = [...activeLanguages, lang];
        }
        if (input.path.includes("state.yaml")) {
          stateChangedSinceLastInject = true;
        }
      }
    }

    // Track state changes via custom tools
    if (stateTools.has(event.toolName)) {
      stateChangedSinceLastInject = true;
    }
  });

  // ── Tool result: detect state.yaml mutations via bash ────────

  pi.on("tool_result", async (event, _ctx) => {
    if (event.toolName === "bash") {
      const input = event.input as Record<string, unknown>;
      if (typeof input.command === "string" && input.command.includes("state.yaml")) {
        stateChangedSinceLastInject = true;
      }
    }
  });

  // ── After compaction: re-inject on next turn ─────────────────

  pi.on("session_compact", async () => {
    shouldInject = true;
  });

  // ── Before agent: conditionally inject guidelines ────────────

  pi.on("before_agent_start", async (event, _ctx) => {
    if (shouldInject || stateChangedSinceLastInject) {
      const snippet = buildInjectionSnippet(activeLanguages, guidelineCache);
      shouldInject = false;
      stateChangedSinceLastInject = false;
      return {
        systemPrompt: event.systemPrompt + "\n\n" + snippet,
      };
    }
  });

  // ── Tool: get_guidelines ─────────────────────────────────────

  pi.registerTool({
    name: "get_guidelines",
    label: "Get Guidelines",
    description:
      "Fetch coding guidelines for a language or topic. Returns project-specific " +
      "conventions from docs/*.md files.",
    promptSnippet: "fetch coding guidelines for a language or topic",
    promptGuidelines: [
      "Use get_guidelines when you need language-specific coding conventions, testing patterns, mock strategies, naming rules, or other best practices.",
      "Call list_guidelines first to discover available guideline sources.",
    ],
    parameters: Type.Object({
      language: Type.Optional(
        Type.String({
          description:
            "Filter by programming language (e.g. typescript, python, rust, go)",
        }),
      ),
      topic: Type.Optional(
        Type.String({
          description:
            "Filter by topic (e.g. mocking, naming, error-handling, testing)",
        }),
      ),
    }),

    async execute(_id, params, _sig, _upd, _ctx) {
      const results: Array<{ file: string; topics: string[]; content: string }> =
        [];

      for (const [, g] of guidelineCache) {
        // Filter by language (check filename + topics)
        if (params.language) {
          const lang = params.language.toLowerCase();
          const matchesFile = g.file.toLowerCase().includes(lang);
          const matchesTopic = g.topics.some((t) => t.toLowerCase() === lang);
          if (!matchesFile && !matchesTopic) continue;
        }

        // Filter by topic
        if (params.topic) {
          const topic = params.topic.toLowerCase();
          if (!g.topics.some((t) => t.toLowerCase().includes(topic))) continue;
        }

        results.push({
          file: g.file,
          topics: g.topics,
          content: g.content,
        });
      }

      if (results.length === 0) {
        const parts: string[] = ["No guidelines found"];
        if (params.language) parts.push(`for '${params.language}'`);
        if (params.topic) parts.push(`on topic '${params.topic}'`);
        parts.push(
          ". Create a docs/<lang>-guidelines.md file or check available files with list_guidelines().",
        );
        return {
          content: [{ type: "text", text: parts.join(" ") }],
          details: {},
        };
      }

      const output = results
        .map((r) => `### ${r.file}\n${r.content}`)
        .join("\n\n---\n\n");
      return {
          content: [{ type: "text", text: output }],
          details: {},
        };
    },
  });

  // ── Tool: list_guidelines ────────────────────────────────────

  pi.registerTool({
    name: "list_guidelines",
    label: "List Guidelines",
    description:
      "List all available coding guideline sources in this project.",
    promptSnippet: "list available coding guidelines",
    parameters: Type.Object({}),

    async execute() {
      if (guidelineCache.size === 0) {
        return {
          content: [
            {
              type: "text",
              text:
                "No guideline files found in `docs/`. Create `docs/<language>-guidelines.md` " +
                "files to define project-specific conventions. The `docs/testing.md` file " +
                "is automatically recognised if it exists.",
            },
          ],
          details: {},
        };
      }

      const lines: string[] = ["### Available coding guideline sources", ""];
      for (const [, g] of guidelineCache) {
        lines.push(`- \`${g.file}\``);
        lines.push(`  Topics: ${g.topics.join(", ")}`);
        lines.push(
          `  Fetch with: \`get_guidelines(language: "${g.topics[0]}")\``,
        );
        lines.push("");
      }

      if (activeLanguages.length > 0) {
        lines.push("### Source languages detected in project");
        for (const l of [...activeLanguages].sort()) {
          lines.push(`- ${l}`);
        }
        lines.push(
          "",
          "Languages not listed? The agent will detect them as you work on source files.",
        );
      }

      return {
        content: [{ type: "text", text: lines.join("\n") }],
        details: {},
      };
    },
  });
}
