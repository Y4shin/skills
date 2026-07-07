/**
 * Pi extension for the prd-workflow.
 *
 * Registers custom tools (prd_show, prd_list, prd_set, etc.) for artifact
 * operations on the docs/prd/ planning tree, plus a /init-prd-workflow command.
 *
 * The tools call core functions directly (no CLI subprocess). The agent uses
 * these tools when following the SKILL.md workflow instructions.
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

// ─── install ────────────────────────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
  const t = (name: string, label: string, description: string, params: any, exec: Function) => {
    pi.registerTool({ name, label, description, parameters: params, async execute(...args: any[]) { return exec(...args); } });
  };

  const Str = Type.String;
  const OptBool = Type.Optional(Type.Boolean());
  const OptStr = Type.Optional(Str);

  // ── show ──────────────────────────────────────────────────────────────────────

  t("prd_show", "Show Artifact", "Show the full YAML frontmatter of a prd-workflow artifact (epic or PRD), resolved by slug, issue number, or path.",
    Type.Object({ selector: Str, json: OptBool }),
    async (_id: string, params: any, _sig: any, _upd: any, ctx: any) => {
      const root = getRoot(ctx.cwd);
      const a = resolveArtifact(root, params.selector);
      const text = params.json ? JSON.stringify(artToRecord(a), null, 2) : formatArtifact(a);
      return { content: [{ type: "text", text }], details: {} };
    });

  t("prd_get", "Get Field", "Print a single frontmatter field of a prd-workflow artifact.",
    Type.Object({ selector: Str, field: Str }),
    async (_id: string, params: any, _sig: any, _upd: any, ctx: any) => {
      const a = resolveArtifact(getRoot(ctx.cwd), params.selector);
      const val = a.doc.data[params.field];
      return { content: [{ type: "text", text: val === undefined ? "" : String(val) }], details: {} };
    });

  t("prd_set", "Set Field", "Set a scalar frontmatter field of an artifact. Value is auto-typed.",
    Type.Object({ selector: Str, field: Str, value: Str }),
    async (_id: string, params: any, _sig: any, _upd: any, ctx: any) => {
      const a = resolveArtifact(getRoot(ctx.cwd), params.selector);
      let parsed: unknown = params.value;
      const l = params.value.toLowerCase();
      if (l === "true") parsed = true; else if (l === "false") parsed = false; else if (l === "null") parsed = null;
      else if (/^-?\d+$/.test(params.value)) parsed = parseInt(params.value, 10);
      else if (/^-?\d+\.\d+$/.test(params.value)) parsed = parseFloat(params.value);
      a.doc.data[params.field] = parsed;
      a.doc.save();
      return { content: [{ type: "text", text: `${params.field} = ${params.value}` }], details: {} };
    });

  t("prd_set_slices", "Set Slices", "Set a PRD's `slices:` list to the given issue numbers.",
    Type.Object({ selector: Str, numbers: Type.Array(Str) }),
    async (_id: string, params: any, _sig: any, _upd: any, ctx: any) => {
      const a = resolveArtifact(getRoot(ctx.cwd), params.selector, "prd");
      a.doc.data["slices"] = params.numbers.map((n: string) => parseInt(n.replace(/^#+/, ""), 10));
      a.doc.save();
      return { content: [{ type: "text", text: `slices: [${(a.doc.data["slices"] as number[]).join(", ")}]` }], details: {} };
    });

  t("prd_resolve", "Resolve Artifact", "Resolve a slug / issue number / path to the artifact's file path.",
    Type.Object({ selector: Str, kind: Type.Optional(Type.Union([Type.Literal("epic"), Type.Literal("prd")])) }),
    async (_id: string, params: any, _sig: any, _upd: any, ctx: any) => {
      const a = resolveArtifact(getRoot(ctx.cwd), params.selector, params.kind);
      return { content: [{ type: "text", text: a.path }], details: {} };
    });

  t("prd_assert_kind", "Assert Kind", "Assert an artifact's `kind` (epic/prd). Fails with a useful message if it differs.",
    Type.Object({ selector: Str, kind: Type.Union([Type.Literal("epic"), Type.Literal("prd")]) }),
    async (_id: string, params: any, _sig: any, _upd: any, ctx: any) => {
      const a = resolveArtifact(getRoot(ctx.cwd), params.selector);
      if (a.kind !== params.kind) throw new Error(`'${params.selector}' has kind '${a.kind}', not '${params.kind}'.`);
      return { content: [{ type: "text", text: `kind: ${params.kind} — OK` }], details: {} };
    });

  t("prd_list", "List Artifacts", "List artifacts in the docs/prd tree, with optional filters.",
    Type.Object({ kind: Type.Optional(Type.Union([Type.Literal("epic"), Type.Literal("prd")])), status: OptStr, epic: OptStr, json: OptBool }),
    async (_id: string, params: any, _sig: any, _upd: any, ctx: any) => {
      const root = getRoot(ctx.cwd);
      let arts = params.kind === "epic" ? discoverEpics(root) : params.kind === "prd" ? discoverPrds(root) : discoverAll(root);
      if (params.status) arts = arts.filter((a: Artifact) => a.status === params.status);
      if (params.epic) arts = arts.filter((a: Artifact) => a.doc.data["epic"] === params.epic);
      if (params.json) return { content: [{ type: "text", text: JSON.stringify(arts.map(artToRecord), null, 2) }], details: {} };
      const lines = arts.map((a: Artifact) => {
        const s = a.status ? ` [${a.status}]` : "";
        return `${a.slug} (${a.kind})${s}${a.issue ? ` #${a.issue}` : ""}${a.milestone ? ` M${a.milestone}` : ""} — ${a.path}`;
      });
      return { content: [{ type: "text", text: lines.join("\n") || "(empty)" }], details: {} };
    });

  t("prd_slices", "List Slices", "List a PRD's surviving slice docs (presence == open work).",
    Type.Object({ selector: Str, json: OptBool }),
    async (_id: string, params: any, _sig: any, _upd: any, ctx: any) => {
      const a = resolveArtifact(getRoot(ctx.cwd), params.selector, "prd");
      const slices = a.sliceFiles();
      if (params.json) return { content: [{ type: "text", text: JSON.stringify(slices, null, 2) }], details: {} };
      const lines = slices.length === 0 ? ["(no open slices — ready to finalize)"] : slices.map(s => `#${s.number} — ${s.slug}`);
      return { content: [{ type: "text", text: lines.join("\n") }], details: {} };
    });

  t("prd_finalizable", "Check Finalizable", "Check a PRD is ready to finalize (no surviving slice docs). Fails with list of open slices otherwise.",
    Type.Object({ selector: Str }),
    async (_id: string, params: any, _sig: any, _upd: any, ctx: any) => {
      const a = resolveArtifact(getRoot(ctx.cwd), params.selector, "prd");
      const slices = a.sliceFiles();
      if (slices.length === 0) return { content: [{ type: "text", text: "ready to finalize" }], details: {} };
      throw new Error(`PRD '${a.slug}' has ${slices.length} open slice(s): ${slices.map(s => `#${s.number}`).join(", ")}`);
    });

  t("prd_lint", "Lint Artifacts", "Show frontmatter violations across the docs/prd tree — the adopt-prd worklist.",
    Type.Object({ selector: OptStr, json: OptBool }),
    async (_id: string, params: any, _sig: any, _upd: any, ctx: any) => {
      const root = getRoot(ctx.cwd);
      if (!existsSync(prdRoot(root))) return { content: [{ type: "text", text: "(no docs/prd directory)" }], details: {} };
      const violations: string[] = [];
      for (const a of discoverAll(root)) {
        for (const f of ["kind", "title", "slug", "status"]) {
          if (a.doc.data[f] === undefined || a.doc.data[f] === null) violations.push(`${a.path}: missing '${f}'`);
        }
      }
      const text = violations.length ? violations.join("\n") : "(no violations)";
      return { content: [{ type: params.json ? "text" : "text", text: params.json ? JSON.stringify(violations, null, 2) : text }], details: {} };
    });

  // ── epic tools ───────────────────────────────────────────────────────────────

  t("prd_epic_prds", "Epic PRDs", "List an epic's planned child PRDs with their issue/done state.",
    Type.Object({ selector: Str, json: OptBool }),
    async (_id: string, params: any, _sig: any, _upd: any, ctx: any) => {
      const a = resolveArtifact(getRoot(ctx.cwd), params.selector, "epic");
      const prds = a.doc.data["prds"];
      if (!Array.isArray(prds)) return { content: [{ type: "text", text: "(no child PRDs planned yet)" }], details: {} };
      const lines = prds.map((p: any) => `${p.slug}${p.issue ? ` #${p.issue}` : " (no issue)"}${p.done ? " ✓" : ""}${p.blocked_by?.length ? ` blocked_by: ${p.blocked_by.join(", ")}` : ""}`);
      return { content: [{ type: "text", text: lines.join("\n") }], details: {} };
    });

  t("prd_epic_set_prd_issue", "Set Epic PRD Issue", "Fill the issue number of an epic's child PRD entry.",
    Type.Object({ selector: Str, prd_slug: Str, issue: Str }),
    async (_id: string, params: any, _sig: any, _upd: any, ctx: any) => {
      const a = resolveArtifact(getRoot(ctx.cwd), params.selector, "epic");
      const prds = Array.isArray(a.doc.data["prds"]) ? [...a.doc.data["prds"]] : [];
      const n = parseInt(params.issue.replace(/^#+/, ""), 10);
      let found = false;
      for (const p of prds) { if ((p as any).slug === params.prd_slug) { (p as any).issue = n; found = true; break; } }
      if (!found) prds.push({ slug: params.prd_slug, issue: n });
      a.doc.data["prds"] = prds;
      a.doc.save();
      return { content: [{ type: "text", text: `${params.prd_slug} → #${n}` }], details: {} };
    });

  t("prd_epic_prd_issue", "Get Epic PRD Issue", "Print the issue number of an epic's child PRD entry.",
    Type.Object({ selector: Str, prd_slug: Str }),
    async (_id: string, params: any, _sig: any, _upd: any, ctx: any) => {
      const a = resolveArtifact(getRoot(ctx.cwd), params.selector, "epic");
      const prds = Array.isArray(a.doc.data["prds"]) ? a.doc.data["prds"] : [];
      for (const p of prds) { if ((p as any).slug === params.prd_slug) { const i = (p as any).issue; if (i) return { content: [{ type: "text", text: String(i) }], details: {} }; } }
      throw new Error(`no issue for PRD '${params.prd_slug}' in epic '${a.slug}'`);
    });

  t("prd_epic_tick", "Tick Epic PRD", "Mark an epic's child PRD as finalized (done: true).",
    Type.Object({ selector: Str, prd_slug: Str }),
    async (_id: string, params: any, _sig: any, _upd: any, ctx: any) => {
      const a = resolveArtifact(getRoot(ctx.cwd), params.selector, "epic");
      const prds = Array.isArray(a.doc.data["prds"]) ? [...a.doc.data["prds"]] : [];
      for (const p of prds) { if ((p as any).slug === params.prd_slug) { (p as any).done = true; a.doc.data["prds"] = prds; a.doc.save(); return { content: [{ type: "text", text: `${params.prd_slug} → done` }], details: {} }; } }
      throw new Error(`no PRD '${params.prd_slug}' in epic '${a.slug}'`);
    });

  t("prd_epic_finalizable", "Check Epic Finalizable", "Check every child PRD of an epic is finalized. Fails with list of unfinished children otherwise.",
    Type.Object({ selector: Str }),
    async (_id: string, params: any, _sig: any, _upd: any, ctx: any) => {
      const a = resolveArtifact(getRoot(ctx.cwd), params.selector, "epic");
      const prds = Array.isArray(a.doc.data["prds"]) ? a.doc.data["prds"] : [];
      const undone = prds.filter((p: any) => !p.done).map((p: any) => p.slug || "?");
      if (undone.length === 0) return { content: [{ type: "text", text: "ready to finalize — all children done" }], details: {} };
      throw new Error(`unfinished children: ${undone.join(", ")}`);
    });

  // ── forge / reference tools ──────────────────────────────────────────────────

  t("prd_forge", "Forge Snippet", "Get provider-specific command snippets for issue/PR operations.",
    Type.Object({ key: Str }),
    async (_id: string, params: any, _sig: any, _upd: any, ctx: any) => {
      if (params.key === "keys") {
        const keys = ["git_type","owner","repo","auth_check","ensure_labels","cmd_get_issue","cmd_create_issue","cmd_list_issues","cmd_comment","cmd_close_issue","cmd_edit_labels","cmd_edit_issue","cmd_create_pr","cmd_create_milestone","cmd_close_milestone","cmd_add_dependency","ownership_note"];
        return { content: [{ type: "text", text: keys.join("\n") }], details: {} };
      }
      try {
        const f = detectForge();
        return { content: [{ type: "text", text: forgeSnippet(f, params.key) }], details: { provider: f.provider, owner: f.owner, repo: f.repo } };
      } catch (e) {
        if (e instanceof NotAGitRepo) return { content: [{ type: "text", text: "NOT_A_GIT_REPO: run `git init` first." }], details: {} };
        if (e instanceof UnknownForge) return { content: [{ type: "text", text: `UNKNOWN_FORGE: remote '${(e as any).remote}' not recognised.` }], details: {} };
        throw e;
      }
    });

  t("prd_reference", "Reference", "Print the prd-workflow artifact schema reference.",
    Type.Object({}),
    async (_id: string, _p: any, _sig: any, _upd: any, ctx: any) => {
      const root = getRoot(ctx.cwd);
      for (const p of [join(root, "docs", "artifacts.md")]) {
        if (existsSync(p)) return { content: [{ type: "text", text: readFileSync(p, "utf-8") }], details: {} };
      }
      return { content: [{ type: "text", text: "(reference not found)" }], details: {} };
    });

  t("prd_profile", "Profile", "Print the project's docs/prd/profile.md (optional project-specific context).",
    Type.Object({}),
    async (_id: string, _p: any, _sig: any, _upd: any, ctx: any) => {
      const text = profileText(getRoot(ctx.cwd));
      return { content: [{ type: "text", text: text || "(no profile)" }], details: {} };
    });

  t("prd_workflow_gate", "Workflow Gate", "Check if the prd-workflow is initialized (docs/prd/ exists).",
    Type.Object({}),
    async (_id: string, _p: any, _sig: any, _upd: any, ctx: any) => {
      if (isInitialized(getRoot(ctx.cwd))) return { content: [{ type: "text", text: "" }], details: {} };
      return { content: [{ type: "text", text: "> [!STOP] prd-workflow not initialized.\n> Run `/init-prd-workflow` first." }], details: { needsInit: true } };
    });

  // ── command ──────────────────────────────────────────────────────────────────

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