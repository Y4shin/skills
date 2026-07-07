/**
 * Pi extension for the prd-workflow.
 *
 * Registers prd_* tools for artifact operations on the docs/prd/ planning tree,
 * plus a /init-prd-workflow command.
 *
 * The tools call core functions directly. The agent uses them when following the
 * SKILL.md workflow instructions.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import {
  Artifact,
  discoverAll,
  discoverEpics,
  discoverPrds,
  findRoot,
  isInitialized,
  prdRoot,
  resolveArtifact,
} from "../core/model.js";
import { forgeSnippet, detect as detectForge, NotAGitRepo, UnknownForge } from "../core/forge.js";
import { profileText } from "../core/index.js";
import { existsSync, readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// ─── helpers ────────────────────────────────────────────────────────────────────

function artToRecord(a: Artifact): Record<string, unknown> {
  const data: Record<string, unknown> = { path: a.path, kind: a.kind, slug: a.slug, status: a.status };
  if (a.issue !== null) data.issue = a.issue;
  if (a.milestone !== null) data.milestone = a.milestone;
  return data;
}

function getRoot(cwd: string): string {
  try { return findRoot(cwd); } catch { return cwd; }
}

function formatArtifact(a: Artifact): string {
  return Object.entries(a.doc.data).map(([k, v]) => {
    if (Array.isArray(v)) return `${k}: ${JSON.stringify(v)}`;
    return `${k}: ${String(v)}`;
  }).join("\n");
}

// ─── tool definitions (exported for testing) ─────────────────────────────────────

export interface ToolDef {
  description: string;
  args: Record<string, unknown>;
  execute(args: Record<string, any>, ctx: { directory: string }): Promise<string>;
}

function def(description: string, args: Record<string, unknown>, exec: (args: any, ctx: any) => Promise<string>): ToolDef {
  return { description, args, execute: exec };
}

const Str = (d: string) => ({ type: "string" as const, description: d });
const OptBool = { type: "boolean" as const, optional: true as const };
const l = (v: string) => ({ type: "string" as const, literal: v } as any);

export function createTools(): Record<string, ToolDef> {
  return {
    prd_show: def(
      "Show artifact frontmatter (epic or PRD), resolved by slug, issue number, or path.",
      { selector: Str("Slug, issue number (#n), or path"), json: OptBool },
      async (p, ctx) => {
        const a = resolveArtifact(getRoot(ctx.directory), p.selector);
        return p.json ? JSON.stringify(artToRecord(a), null, 2) : formatArtifact(a);
      },
    ),

    prd_get: def(
      "Print a single frontmatter field of an artifact.",
      { selector: Str("Slug, issue number, or path"), field: Str("Field name") },
      async (p, ctx) => {
        const a = resolveArtifact(getRoot(ctx.directory), p.selector);
        return a.doc.data[p.field] === undefined ? "" : String(a.doc.data[p.field]);
      },
    ),

    prd_set: def(
      "Set a scalar frontmatter field (auto-typed: int, bool, null, string).",
      { selector: Str("Slug, issue number, or path"), field: Str("Field name"), value: Str("New value") },
      async (p, ctx) => {
        const a = resolveArtifact(getRoot(ctx.directory), p.selector);
        let v: unknown = p.value;
        const lc = p.value.toLowerCase();
        if (lc === "true") v = true; else if (lc === "false") v = false; else if (lc === "null") v = null;
        else if (/^-?\d+$/.test(p.value)) v = parseInt(p.value, 10);
        else if (/^-?\d+\.\d+$/.test(p.value)) v = parseFloat(p.value);
        a.doc.data[p.field] = v;
        a.doc.save();
        return `${p.field} = ${p.value}`;
      },
    ),

    prd_set_slices: def(
      "Set a PRD's `slices:` list to the given issue numbers.",
      { selector: Str("PRD slug, issue number, or path"), numbers: { type: "array" as const, items: Str("Issue number") } },
      async (p, ctx) => {
        const a = resolveArtifact(getRoot(ctx.directory), p.selector, "prd");
        a.doc.data["slices"] = p.numbers.map((n: string) => parseInt(n.replace(/^#+/, ""), 10));
        a.doc.save();
        return `slices: [${(a.doc.data["slices"] as number[]).join(", ")}]`;
      },
    ),

    prd_resolve: def(
      "Resolve a slug / issue number / path to the artifact's file path.",
      { selector: Str("Slug, issue number, or path"), kind: { type: "string" as const, optional: true, enum: ["epic", "prd"] } },
      async (p, ctx) => resolveArtifact(getRoot(ctx.directory), p.selector, p.kind).path,
    ),

    prd_assert_kind: def(
      "Assert an artifact's `kind` (epic/prd). Fails with a useful message if it differs.",
      { selector: Str("Slug, issue number, or path"), kind: { type: "string" as const, enum: ["epic", "prd"] } },
      async (p, ctx) => {
        const a = resolveArtifact(getRoot(ctx.directory), p.selector);
        if (a.kind !== p.kind) throw new Error(`'${p.selector}' has kind '${a.kind}', not '${p.kind}'.`);
        return `kind: ${p.kind} — OK`;
      },
    ),

    prd_list: def(
      "List artifacts in the docs/prd tree, with optional filters.",
      { kind: { type: "string" as const, optional: true, enum: ["epic", "prd"] }, status: { ...Str("Status filter"), optional: true }, epic: { ...Str("Epic slug filter"), optional: true }, json: OptBool },
      async (p, ctx) => {
        const root = getRoot(ctx.directory);
        let arts = p.kind === "epic" ? discoverEpics(root) : p.kind === "prd" ? discoverPrds(root) : discoverAll(root);
        if (p.status) arts = arts.filter((a: Artifact) => a.status === p.status);
        if (p.epic) arts = arts.filter((a: Artifact) => a.doc.data["epic"] === p.epic);
        if (p.json) return JSON.stringify(arts.map(artToRecord), null, 2);
        return arts.map((a: Artifact) => `${a.slug} (${a.kind})${a.status ? ` [${a.status}]` : ""}${a.issue ? ` #${a.issue}` : ""}${a.milestone ? ` M${a.milestone}` : ""}`).join("\n") || "(empty)";
      },
    ),

    prd_slices: def(
      "List a PRD's surviving slice docs (presence == open work).",
      { selector: Str("PRD slug, issue number, or path"), json: OptBool },
      async (p, ctx) => {
        const a = resolveArtifact(getRoot(ctx.directory), p.selector, "prd");
        const slices = a.sliceFiles();
        if (p.json) return JSON.stringify(slices, null, 2);
        return slices.length === 0 ? "(no open slices — ready to finalize)" : slices.map(s => `#${s.number} — ${s.slug}`).join("\n");
      },
    ),

    prd_finalizable: def(
      "Check a PRD is ready to finalize (no surviving slice docs). Fails listing open slices otherwise.",
      { selector: Str("PRD slug, issue number, or path") },
      async (p, ctx) => {
        const a = resolveArtifact(getRoot(ctx.directory), p.selector, "prd");
        const slices = a.sliceFiles();
        if (slices.length === 0) return "ready to finalize";
        throw new Error(`PRD '${a.slug}' has ${slices.length} open slice(s): ${slices.map(s => `#${s.number}`).join(", ")}`);
      },
    ),

    prd_lint: def(
      "Show frontmatter violations across the docs/prd tree — the adopt-prd worklist.",
      { selector: { ...Str("Optional path; omit to scan all"), optional: true }, json: OptBool },
      async (p, ctx) => {
        const root = getRoot(ctx.directory);
        if (!existsSync(prdRoot(root))) return "(no docs/prd directory)";
        const violations: string[] = [];
        for (const a of discoverAll(root)) {
          for (const f of ["kind", "title", "slug", "status"]) {
            if (a.doc.data[f] === undefined || a.doc.data[f] === null) violations.push(`${a.path}: missing '${f}'`);
          }
        }
        return violations.length ? (p.json ? JSON.stringify(violations, null, 2) : violations.join("\n")) : "(no violations)";
      },
    ),

    prd_epic_prds: def(
      "List an epic's planned child PRDs with their issue/done state.",
      { selector: Str("Epic slug, milestone number, or path"), json: OptBool },
      async (p, ctx) => {
        const a = resolveArtifact(getRoot(ctx.directory), p.selector, "epic");
        const prds = a.doc.data["prds"];
        if (!Array.isArray(prds)) return "(no child PRDs planned yet)";
        return prds.map((p: any) => `${p.slug}${p.issue ? ` #${p.issue}` : " (no issue)"}${p.done ? " ✓" : ""}${p.blocked_by?.length ? ` blocked_by: ${p.blocked_by.join(", ")}` : ""}`).join("\n");
      },
    ),

    prd_epic_set_prd_issue: def(
      "Fill the issue number of an epic's child PRD entry.",
      { selector: Str("Epic slug, milestone number, or path"), prd_slug: Str("Child PRD slug"), issue: Str("Issue number (#n or n)") },
      async (p, ctx) => {
        const a = resolveArtifact(getRoot(ctx.directory), p.selector, "epic");
        const prds = Array.isArray(a.doc.data["prds"]) ? [...a.doc.data["prds"]] : [];
        const n = parseInt(p.issue.replace(/^#+/, ""), 10);
        let found = false;
        for (const c of prds) { if ((c as any).slug === p.prd_slug) { (c as any).issue = n; found = true; break; } }
        if (!found) prds.push({ slug: p.prd_slug, issue: n });
        a.doc.data["prds"] = prds;
        a.doc.save();
        return `${p.prd_slug} → #${n}`;
      },
    ),

    prd_epic_prd_issue: def(
      "Print the issue number of an epic's child PRD entry.",
      { selector: Str("Epic slug, milestone number, or path"), prd_slug: Str("Child PRD slug") },
      async (p, ctx) => {
        const a = resolveArtifact(getRoot(ctx.directory), p.selector, "epic");
        const prds = Array.isArray(a.doc.data["prds"]) ? a.doc.data["prds"] : [];
        for (const c of prds) { if ((c as any).slug === p.prd_slug) { const i = (c as any).issue; if (i) return String(i); } }
        throw new Error(`no issue for PRD '${p.prd_slug}' in epic '${a.slug}'`);
      },
    ),

    prd_epic_tick: def(
      "Mark an epic's child PRD as finalized (done: true).",
      { selector: Str("Epic slug, milestone number, or path"), prd_slug: Str("Child PRD slug") },
      async (p, ctx) => {
        const a = resolveArtifact(getRoot(ctx.directory), p.selector, "epic");
        const prds = Array.isArray(a.doc.data["prds"]) ? [...a.doc.data["prds"]] : [];
        for (const c of prds) { if ((c as any).slug === p.prd_slug) { (c as any).done = true; a.doc.data["prds"] = prds; a.doc.save(); return `${p.prd_slug} → done`; } }
        throw new Error(`no PRD '${p.prd_slug}' in epic '${a.slug}'`);
      },
    ),

    prd_epic_finalizable: def(
      "Check every child PRD of an epic is finalized. Fails with list of unfinished children.",
      { selector: Str("Epic slug, milestone number, or path") },
      async (p, ctx) => {
        const a = resolveArtifact(getRoot(ctx.directory), p.selector, "epic");
        const prds = Array.isArray(a.doc.data["prds"]) ? a.doc.data["prds"] : [];
        const undone = prds.filter((p: any) => !p.done).map((p: any) => p.slug || "?");
        if (undone.length === 0) return "ready to finalize — all children done";
        throw new Error(`unfinished children: ${undone.join(", ")}`);
      },
    ),

    prd_forge: def(
      "Get provider-specific command snippets for issue/PR operations. Use key 'keys' to list, 'git_type' to detect provider.",
      { key: Str("Snippet key") },
      async (p, ctx) => {
        if (p.key === "keys") {
          return ["git_type","owner","repo","auth_check","ensure_labels","cmd_get_issue","cmd_create_issue","cmd_list_issues","cmd_comment","cmd_close_issue","cmd_edit_labels","cmd_edit_issue","cmd_create_pr","cmd_create_milestone","cmd_close_milestone","cmd_add_dependency","ownership_note"].join("\n");
        }
        try {
          const f = detectForge();
          return forgeSnippet(f, p.key);
        } catch (e) {
          if (e instanceof NotAGitRepo) return "NOT_A_GIT_REPO: run `git init` first.";
          if (e instanceof UnknownForge) return `UNKNOWN_FORGE: remote '${(e as any).remote}' not recognised.`;
          throw e;
        }
      },
    ),

    prd_reference: def(
      "Print the prd-workflow artifact schema reference.",
      {},
      async (_p, ctx) => {
        const p = join(getRoot(ctx.directory), "docs", "artifacts.md");
        return existsSync(p) ? readFileSync(p, "utf-8") : "(reference not found)";
      },
    ),

    prd_profile: def(
      "Print the project's docs/prd/profile.md (optional project-specific context).",
      {},
      async (_p, ctx) => profileText(getRoot(ctx.directory)) || "(no profile)",
    ),

    prd_workflow_gate: def(
      "Check if the prd-workflow is initialized (docs/prd/ exists). Returns empty string if ready.",
      {},
      async (_p, ctx) => {
        if (isInitialized(getRoot(ctx.directory))) return "";
        return "> [!STOP] prd-workflow not initialized.\n> Run `/init-prd-workflow` first.";
      },
    ),
  };
}

// ─── pi extension entry point ───────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
  const tools = createTools();

  for (const [name, def] of Object.entries(tools)) {
    const params: Record<string, any> = {};
    for (const [k, v] of Object.entries(def.args)) {
      const vv = v as any;
      if (vv.type === "string") {
        params[k] = vv.enum
          ? Type.Union((vv.enum as string[]).map((e: string) => Type.Literal(e)))
          : Type.String({ description: vv.description ?? "" });
      } else if (vv.type === "boolean") {
        params[k] = Type.Boolean({ description: vv.description ?? "" });
      } else if (vv.type === "array") {
        params[k] = Type.Array(Type.String({ description: vv.items?.description ?? "" }));
      }
      if (vv.optional && params[k]) {
        params[k] = Type.Optional(params[k]);
      }
    }

    pi.registerTool({
      name,
      label: name.replace(/^prd_/, "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      description: def.description,
      parameters: Type.Object(params),
      async execute(_id: string, args: any, _sig: any, _upd: any, ctx: any) {
        const result = await def.execute(args, { directory: ctx.cwd });
        return { content: [{ type: "text", text: result }], details: {} };
      },
    });
  }

  pi.registerCommand("init-prd-workflow", {
    description: "Initialize the prd-workflow by creating the docs/prd/ directory.",
    handler: async (_args, ctx) => {
      const root = getRoot(ctx.cwd);
      if (isInitialized(root)) { ctx.ui.notify("Already initialized", "info"); return; }
      mkdirSync(prdRoot(root), { recursive: true });
      ctx.ui.notify(`Created ${prdRoot(root)}`, "info");
    },
  });
}