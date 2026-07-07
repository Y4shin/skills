/**
 * opencode plugin: register the prd-workflow's agent-driven operations as native
 * `prd_*` tools. Each tool reuses the core functions directly (no CLI subprocess).
 *
 * The context injections (reference, list, profile, forge snippets, workflow-gate)
 * are handled by the bundled CLI in command headers — they are not exposed as tools.
 */

import { type Plugin, tool } from "@opencode-ai/plugin";
import {
  Artifact,
  discoverAll,
  discoverEpics,
  discoverPrds,
  findRoot,
  isInitialized,
  resolveArtifact,
} from "../core/model.js";
import { forgeSnippet, detect as detectForge, NotAGitRepo, UnknownForge } from "../core/forge.js";
import { profileText } from "../core/index.js";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const z = tool.schema;

function getRoot(cwd: string): string {
  try { return findRoot(cwd); } catch { return cwd; }
}

function artToRecord(a: Artifact): Record<string, unknown> {
  const data: Record<string, unknown> = { path: a.path, kind: a.kind, slug: a.slug, status: a.status };
  if (a.issue !== null) data.issue = a.issue;
  if (a.milestone !== null) data.milestone = a.milestone;
  return data;
}

function formatArtifact(a: Artifact): string {
  const lines: string[] = [];
  for (const [k, v] of Object.entries(a.doc.data)) {
    if (typeof v === "boolean") lines.push(`${k}: ${v}`);
    else if (typeof v === "number") lines.push(`${k}: ${v}`);
    else if (v === null) lines.push(`${k}: null`);
    else if (Array.isArray(v)) lines.push(`${k}: ${JSON.stringify(v)}`);
    else lines.push(`${k}: ${String(v)}`);
  }
  return lines.join("\n");
}

export const PrdWorkflowPlugin: Plugin = async () => {
  return {
    tool: {
      prd_show: tool({
        description: "Show the full YAML frontmatter of a prd-workflow artifact (epic or PRD) resolved by slug, issue number, or path.",
        args: {
          selector: z.string().describe("Slug, issue number (#n or n), or path to the artifact."),
          json: z.boolean().optional().describe("Emit JSON instead of key: value lines."),
        },
        async execute(args, ctx) {
          const root = getRoot(ctx.directory);
          const a = resolveArtifact(root, args.selector);
          return args.json ? JSON.stringify(artToRecord(a), null, 2) : formatArtifact(a);
        },
      }),

      prd_get: tool({
        description: "Print a single frontmatter field of a prd-workflow artifact.",
        args: {
          selector: z.string().describe("Slug, issue number, or path."),
          field: z.string().describe("Frontmatter field name."),
        },
        async execute(args, ctx) {
          const root = getRoot(ctx.directory);
          const a = resolveArtifact(root, args.selector);
          const val = a.doc.data[args.field];
          return val === undefined ? "" : String(val);
        },
      }),

      prd_set: tool({
        description: "Set a scalar frontmatter field of an artifact (auto-typed: int/bool/null/string).",
        args: {
          selector: z.string().describe("Slug, issue number, or path."),
          field: z.string().describe("Frontmatter field to set."),
          value: z.string().describe("New value (coerced to int/bool/null/string)."),
        },
        async execute(args, ctx) {
          const root = getRoot(ctx.directory);
          const a = resolveArtifact(root, args.selector);
          let parsed: unknown = args.value;
          const lower = args.value.toLowerCase();
          if (lower === "true") parsed = true;
          else if (lower === "false") parsed = false;
          else if (lower === "null") parsed = null;
          else if (/^-?\d+$/.test(args.value)) parsed = parseInt(args.value, 10);
          else if (/^-?\d+\.\d+$/.test(args.value)) parsed = parseFloat(args.value);
          a.doc.data[args.field] = parsed;
          a.doc.save();
          return `${args.field} = ${args.value}`;
        },
      }),

      prd_set_slices: tool({
        description: "Set a PRD's `slices:` list to the given issue numbers.",
        args: {
          selector: z.string().describe("PRD slug, issue number, or path."),
          numbers: z.array(z.string()).describe("Slice issue numbers (e.g. ['3','4','5'])."),
        },
        async execute(args, ctx) {
          const root = getRoot(ctx.directory);
          const a = resolveArtifact(root, args.selector, "prd");
          a.doc.data["slices"] = args.numbers.map(n => parseInt(n.replace(/^#+/, ""), 10));
          a.doc.save();
          return `slices: [${(a.doc.data["slices"] as number[]).join(", ")}]`;
        },
      }),

      prd_resolve: tool({
        description: "Resolve a slug/issue number/path to the artifact's file path.",
        args: {
          selector: z.string().describe("Slug, issue number, or path."),
          kind: z.enum(["epic", "prd"]).optional().describe("Constrain the resolution."),
        },
        async execute(args, ctx) {
          const root = getRoot(ctx.directory);
          const a = resolveArtifact(root, args.selector, args.kind);
          return a.path;
        },
      }),

      prd_assert_kind: tool({
        description: "Assert an artifact's `kind` (epic/prd) before slicing it; fails if it differs.",
        args: {
          selector: z.string().describe("Slug, issue number, or path."),
          kind: z.enum(["epic", "prd"]).describe("Expected kind."),
        },
        async execute(args, ctx) {
          const root = getRoot(ctx.directory);
          const a = resolveArtifact(root, args.selector);
          if (a.kind !== args.kind) {
            throw new Error(`'${args.selector}' has kind '${a.kind}', not '${args.kind}'. Use the correct skill.`);
          }
          return `kind: ${args.kind} — OK`;
        },
      }),

      prd_list: tool({
        description: "List artifacts in the docs/prd tree, with optional filters.",
        args: {
          kind: z.enum(["epic", "prd"]).optional(),
          status: z.string().optional().describe("Filter by frontmatter status."),
          epic: z.string().optional().describe("Only PRDs belonging to this epic slug."),
          json: z.boolean().optional(),
        },
        async execute(args, ctx) {
          const root = getRoot(ctx.directory);
          let artifacts = args.kind === "epic" ? discoverEpics(root) : args.kind === "prd" ? discoverPrds(root) : discoverAll(root);
          if (args.status) artifacts = artifacts.filter(a => a.status === args.status);
          if (args.epic) artifacts = artifacts.filter(a => a.doc.data["epic"] === args.epic);
          if (args.json) return JSON.stringify(artifacts.map(artToRecord), null, 2);
          const lines = artifacts.map(a => {
            const status = a.status ? ` [${a.status}]` : "";
            const issue = a.issue !== null ? ` #${a.issue}` : "";
            const ms = a.milestone !== null ? ` M${a.milestone}` : "";
            return `${a.slug} (${a.kind})${status}${issue}${ms} — ${a.path}`;
          });
          return lines.join("\n") || "(empty)";
        },
      }),

      prd_slices: tool({
        description: "List a PRD's surviving slice docs (presence == open work).",
        args: {
          selector: z.string().describe("PRD slug, issue number, or path."),
          json: z.boolean().optional(),
        },
        async execute(args, ctx) {
          const root = getRoot(ctx.directory);
          const a = resolveArtifact(root, args.selector, "prd");
          const slices = a.sliceFiles();
          if (args.json) return JSON.stringify(slices, null, 2);
          return slices.length === 0
            ? "(no open slices — ready to finalize)"
            : slices.map(s => `#${s.number} — ${s.slug} (${s.path})`).join("\n");
        },
      }),

      prd_finalizable: tool({
        description: "Check a PRD is ready to finalize (no surviving slice docs); fails otherwise.",
        args: { selector: z.string().describe("PRD slug, issue number, or path.") },
        async execute(args, ctx) {
          const root = getRoot(ctx.directory);
          const a = resolveArtifact(root, args.selector, "prd");
          const slices = a.sliceFiles();
          if (slices.length === 0) return "ready to finalize";
          throw new Error(
            `PRD '${a.slug}' has ${slices.length} open slice(s): ${slices.map(s => `#${s.number}`).join(", ")}\n` +
            "Complete and implement all slices before finalizing."
          );
        },
      }),

      prd_lint: tool({
        description: "Show frontmatter violations across the docs/prd tree (adopt-prd worklist).",
        args: {
          selector: z.string().optional().describe("Optional path; omit to scan all."),
          json: z.boolean().optional(),
        },
        async execute(args, ctx) {
          const root = getRoot(ctx.directory);
          const prd = join(root, "docs", "prd");
          if (!existsSync(prd)) return "(no docs/prd directory)";
          const all = discoverAll(root);
          const violations: string[] = [];
          for (const a of all) {
            for (const field of ["kind", "title", "slug", "status"]) {
              if (a.doc.data[field] === undefined || a.doc.data[field] === null) {
                violations.push(`${a.path}: missing '${field}'`);
              }
            }
          }
          if (args.json) return JSON.stringify(violations, null, 2);
          return violations.length ? violations.join("\n") : "(no violations)";
        },
      }),

      prd_epic_prds: tool({
        description: "List an epic's planned child PRDs with their issue/done state.",
        args: { selector: z.string().describe("Epic slug, milestone number, or path."), json: z.boolean().optional() },
        async execute(args, ctx) {
          const root = getRoot(ctx.directory);
          const a = resolveArtifact(root, args.selector, "epic");
          const prds = a.doc.data["prds"];
          if (!Array.isArray(prds)) return "(no child PRDs planned yet)";
          const lines = prds.map((p: any) => {
            const s = p.slug ?? "?";
            const issue = p.issue ? ` #${p.issue}` : " (no issue)";
            const done = p.done ? " ✓" : "";
            const blocked = p.blocked_by?.length ? ` blocked_by: ${p.blocked_by.join(", ")}` : "";
            return `${s}${issue}${done}${blocked}`;
          });
          return lines.join("\n");
        },
      }),

      prd_epic_set_prd_issue: tool({
        description: "Fill the issue number of an epic's child PRD entry.",
        args: {
          selector: z.string().describe("Epic slug, milestone number, or path."),
          prd_slug: z.string().describe("Child PRD slug."),
          issue: z.string().describe("Issue number (#n or n)."),
        },
        async execute(args, ctx) {
          const root = getRoot(ctx.directory);
          const a = resolveArtifact(root, args.selector, "epic");
          const prds = Array.isArray(a.doc.data["prds"]) ? [...a.doc.data["prds"]] : [];
          const n = parseInt(args.issue.replace(/^#+/, ""), 10);
          let found = false;
          for (const p of prds) { if ((p as any).slug === args.prd_slug) { (p as any).issue = n; found = true; break; } }
          if (!found) prds.push({ slug: args.prd_slug, issue: n });
          a.doc.data["prds"] = prds;
          a.doc.save();
          return `${args.prd_slug} → #${n}`;
        },
      }),

      prd_epic_prd_issue: tool({
        description: "Print the issue number of an epic's child PRD entry.",
        args: { selector: z.string().describe("Epic slug, milestone number, or path."), prd_slug: z.string().describe("Child PRD slug.") },
        async execute(args, ctx) {
          const root = getRoot(ctx.directory);
          const a = resolveArtifact(root, args.selector, "epic");
          const prds = Array.isArray(a.doc.data["prds"]) ? a.doc.data["prds"] : [];
          for (const p of prds) { if ((p as any).slug === args.prd_slug) { const i = (p as any).issue; if (i) return String(i); } }
          throw new Error(`no issue for PRD '${args.prd_slug}' in epic '${a.slug}'`);
        },
      }),

      prd_epic_tick: tool({
        description: "Mark an epic's child PRD as finalized (done: true).",
        args: { selector: z.string().describe("Epic slug, milestone number, or path."), prd_slug: z.string().describe("Child PRD slug.") },
        async execute(args, ctx) {
          const root = getRoot(ctx.directory);
          const a = resolveArtifact(root, args.selector, "epic");
          const prds = Array.isArray(a.doc.data["prds"]) ? [...a.doc.data["prds"]] : [];
          for (const p of prds) { if ((p as any).slug === args.prd_slug) { (p as any).done = true; a.doc.data["prds"] = prds; a.doc.save(); return `${args.prd_slug} → done`; } }
          throw new Error(`no PRD '${args.prd_slug}' in epic '${a.slug}'`);
        },
      }),

      prd_epic_finalizable: tool({
        description: "Check every child PRD of an epic is finalized (finalize-epic gate); fails otherwise.",
        args: { selector: z.string().describe("Epic slug, milestone number, or path.") },
        async execute(args, ctx) {
          const root = getRoot(ctx.directory);
          const a = resolveArtifact(root, args.selector, "epic");
          const prds = Array.isArray(a.doc.data["prds"]) ? a.doc.data["prds"] : [];
          const undone = prds.filter((p: any) => !p.done).map((p: any) => p.slug || "?");
          if (undone.length === 0) return "ready to finalize — all children done";
          throw new Error(`unfinished children: ${undone.join(", ")}`);
        },
      }),
    },
  };
};