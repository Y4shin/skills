/**
 * task-workflow v2 -- the extension entry point.
 *
 * Registers tw_* tools for artifact operations on the docs/tasks/ planning tree,
 * plus lifecycle hooks for pi-subagents and pi-telemetry checks.
 *
 * Principles:
 * - One entry: the extension's wiring, its guards, and its composition. The tool
 *   definitions live in the family modules under src/tools/, one module per family.
 * - Core modules are pure data (no file I/O).
 * - File I/O lives in the tool modules that perform it, through the support module.
 */

import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI, BeforeAgentStartEvent, BeforeAgentStartEventResult, ExtensionContext, InputEvent, InputEventResult, ToolCallEvent, ToolCallEventResult } from "@earendil-works/pi-coding-agent";
import { getCurrentTools } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import { GATED_SKILL_NAMES } from "./disclosure.js";
import { resolveGate, type ResolveGateResult } from "./core/repo-gate.js";
import { isSpawnCall, spawnVerdict } from "./core/spawn-guard.js";
import { artifactTools } from "./tools/artifacts.js";
import { effortTools } from "./tools/effort.js";
import { tw_add_ticket, tw_split_ticket, tw_mark_done, tw_mark_blocked, tw_resolve_uncertainty, tw_write_changelog, tw_write_task_note, tw_write_ticket_note, tw_record_out_of_scope, tw_state, tw_state_set } from "./tools/tickets.js";
import { skill_validate, skill_scaffold, skill_discover } from "./tools/skill-creator.js";
import { tw_write_changesets, tw_release_plan, tw_release_apply } from "./tools/release.js";
import { tw_feedback } from "./tools/feedback.js";
import { gateTools } from "./tools/gates.js";
import { Tool, findRoot, readText, readYaml, relPosix, taskRoot } from "./tools/support.js";

// Thin re-exports: a tool definition is reachable from the entry path whatever module holds
// it, so no import path the suite or the package already uses had to move with the split. The
// composition below reads the same definitions.
export { tw_add_ticket, tw_split_ticket, tw_mark_done, tw_mark_blocked, tw_resolve_uncertainty, tw_write_changelog, tw_write_task_note, tw_write_ticket_note, tw_record_out_of_scope, tw_state, tw_state_set } from "./tools/tickets.js";
export { skill_validate, skill_scaffold, skill_discover } from "./tools/skill-creator.js";
export { tw_write_changesets, tw_release_plan, tw_release_apply } from "./tools/release.js";
export { tw_feedback } from "./tools/feedback.js";

// ─── The tool record ──────────────────────────────────────────────────────────

/**
 * The tool record the extension registers: every family's tools in one object.
 * tw_open's parameter schema depends on the gate state, so the gate family is
 * built here rather than exported as a constant; every other family contributes
 * a definition this file re-exports.
 */
export function createTools(gated: boolean = false): Record<string, Tool> {
  return {
    ...artifactTools(),
    ...effortTools(),
    tw_add_ticket,
    tw_split_ticket,
    tw_mark_done,
    tw_mark_blocked,
    tw_resolve_uncertainty,
    tw_write_changelog,
    tw_write_task_note,
    tw_write_ticket_note,
    tw_record_out_of_scope,
    tw_state,
    tw_state_set,
    skill_validate,
    skill_scaffold,
    skill_discover,
    tw_write_changesets,
    tw_release_plan,
    tw_release_apply,
    ...gateTools(gated),
    tw_feedback,
  };
}

// ─── Gated skill manifest sanity (session-start diagnostics) ──────────────────

/**
 * The gated names are the static manifest exported from src/disclosure.ts;
 * nothing is derived here. The one runtime read left is a sanity check: a
 * broken install (package.json unreadable, pi.skills missing or not an array
 * of strings) is worth one warning at session start. The strip and the
 * invocation block run on the manifest regardless; the manifest-to-package
 * consistency itself is pinned by the tests, not by this check.
 */
function loadSkillNameDiagnostics(): string[] {
  try {
    const pkgPath = resolvePath(
      dirname(fileURLToPath(import.meta.url)),
      "..",
      "package.json",
    );
    const pkg = JSON.parse(readText(pkgPath)) as Record<string, unknown>;
    const piSection = pkg.pi as Record<string, unknown> | undefined;
    const skills = piSection?.skills;
    if (Array.isArray(skills) && skills.every((s) => typeof s === "string")) {
      return [];
    }
    return [
      "package.json pi.skills is missing or not an array of strings; the static manifest is in effect",
    ];
  } catch (e) {
    return [
      `failed to read package.json pi.skills: ${(e as Error).message}; the static manifest is in effect`,
    ];
  }
}

const SKILL_NAME_DIAGNOSTICS = loadSkillNameDiagnostics();

/**
 * Block explicit `/skill:<gated-name>` invocations in a work repo. The input
 * event fires before `_expandSkillCommand`, so returning `{ action: "handled" }`
 * prevents the skill from being loaded. Non-gated `/skill:` inputs and all
 * other input pass through unchanged.
 */
async function gateSkillInvocation(
  event: InputEvent,
  ctx: ExtensionContext,
): Promise<InputEventResult> {
  const text = event.text;
  if (!text.startsWith("/skill:")) {
    return { action: "continue" };
  }
  const spaceIndex = text.indexOf(" ");
  const name = text.slice(7, spaceIndex === -1 ? undefined : spaceIndex);
  if (!name) {
    return { action: "continue" };
  }
  if (GATED_SKILL_NAMES.includes(name)) {
    ctx.ui.notify(
      `task-workflow is gated in this work repo; not loading ${name}`,
      "warning",
    );
    return { action: "handled" };
  }
  return { action: "continue" };
}

/**
 * Strip the gated workflow skills from the system prompt's `<available_skills>`
 * block when running in a work repo. If the block becomes empty, drop the whole
 * block including its preamble. If the prompt lacks an `<available_skills>`
 * block, log a diagnostic and return the prompt unchanged.
 */
async function stripSkills(
  event: BeforeAgentStartEvent,
  ctx: ExtensionContext,
): Promise<BeforeAgentStartEventResult> {
  const prompt = event.systemPrompt;
  const blockOpen = "<available_skills>";
  const blockClose = "</available_skills>";
  const blockStart = prompt.indexOf(blockOpen);
  if (blockStart === -1) {
    ctx.ui.notify(
      "skill-strip: expected an <available_skills> block, found none; format may have changed",
      "warning",
    );
    return { systemPrompt: prompt };
  }
  const blockEnd = prompt.indexOf(blockClose, blockStart);
  if (blockEnd === -1) {
    ctx.ui.notify(
      "skill-strip: expected a closing </available_skills> tag; format may have changed",
      "warning",
    );
    return { systemPrompt: prompt };
  }
  const blockEndAfter = blockEnd + blockClose.length;
  const beforeBlock = prompt.slice(0, blockStart);
  const inner = prompt.slice(blockStart + blockOpen.length, blockEnd);
  const afterBlock = prompt.slice(blockEndAfter);

  const gatedSet = new Set(GATED_SKILL_NAMES);
  let remainingSkillCount = 0;
  const strippedInner = inner.replace(/<skill>([\s\S]*?)<\/skill>/g, (match, content) => {
    const nameMatch = content.match(/<name>([\s\S]*?)<\/name>/);
    const name = nameMatch ? nameMatch[1].trim() : "";
    if (gatedSet.has(name)) {
      return "";
    }
    remainingSkillCount++;
    return match;
  });

  if (remainingSkillCount === 0) {
    // Drop the whole block plus its preamble.
    const lines = beforeBlock.split("\n");
    let preambleLineIndex = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].includes("The following skills")) {
        preambleLineIndex = i;
        break;
      }
    }
    if (preambleLineIndex === -1) {
      return { systemPrompt: beforeBlock + afterBlock };
    }
    const preambleLineStart =
      preambleLineIndex === 0
        ? 0
        : lines.slice(0, preambleLineIndex).join("\n").length + 1;
    let blankRunLength = 0;
    for (let i = preambleLineStart - 1; i >= 0 && prompt[i] === "\n"; i--) {
      blankRunLength++;
    }
    const sectionStart = preambleLineStart - blankRunLength;
    return { systemPrompt: prompt.slice(0, sectionStart) + afterBlock };
  }

  return {
    systemPrompt: beforeBlock + blockOpen + strippedInner + blockClose + afterBlock,
  };
}

// ─── Write lockdown guard ──────────────────────────────────────────────────

/**
 * The reason a blocked write or edit carries: it names the lockdown, the two
 * exempt segments, and the legal alternative, so a model that hits it can
 * reroute to a named tool.
 */
function lockdownReason(toolName: string, path: string): string {
  return (
    `write lockdown: '${path}' is under docs/tasks/, which only the named tw_* tools may write; ` +
    `the built-in ${toolName} is refused on that tree. Scratch and evidence are exempt: ` +
    `**/.work/** (the uncertainty stop) and **/deviation-reports/** (the deviation report). ` +
    `Use the matching tw_* tool for this change: a ticket doc's implementation notes go through ` +
    `tw_write_ticket_note, a planning task's record through tw_write_task_note, a map section through ` +
    `tw_write_section, the changelog through tw_write_changelog. An onboarding run is not locked: ` +
    `the guard starts applying once state.yaml carries schema_version.`
  );
}

/**
 * The two path segments the lockdown exempts: `.work/` and
 * `deviation-reports/`. Both sit beside an artifact rather than being
 * artifacts (neither is in TYPE_LEAVES), and both are written by shipped
 * procedures: the uncertainty stop and the deviation report. A path is exempt
 * when any segment under the tree is one of them, so the escape hatch keeps
 * working wherever an artifact keeps its scratch.
 */
const LOCKDOWN_EXEMPT_SEGMENTS = new Set([".work", "deviation-reports"]);

/**
 * True when the target path sits inside the session repo's docs/tasks tree and
 * is not in an exempt segment. Relative paths resolve against the session
 * cwd, absolute paths are taken as given; both are normalized before the
 * containment check, so `..` traversal cannot slip past and a sibling directory
 * such as `docs/tasks-archive` does not match.
 */
/**
 * True when the tree carries the schema stamp. The guard protects an
 * initialized tree; before the stamp exists there is no schema to protect and
 * onboarding has no named writer for the tree it creates, so a bootstrap write
 * is legal by design (the setup-workflow onboard branch writes state.yaml
 * first, after which every writer below is locked).
 */
function stateIsStamped(root: string): boolean {
  try {
    const raw = readYaml(join(taskRoot(root), "state.yaml")) as Record<string, unknown> | null;
    return raw !== null && typeof raw === "object" && typeof raw.schema_version === "number";
  } catch {
    return false;
  }
}

function isTaskTreePath(path: string, cwd: string): boolean {
  const resolved = resolvePath(cwd, path);
  const root = findRoot(cwd);
  const tree = taskRoot(root);
  const rel = relPosix(tree, resolved);
  if (rel !== "" && (rel.startsWith("..") || isAbsolute(rel))) return false;
  const segments = rel.split(/[\\/]/).filter((s) => s !== "" && s !== ".");
  if (segments.some((segment) => LOCKDOWN_EXEMPT_SEGMENTS.has(segment))) return false;
  if (!stateIsStamped(root)) return false;
  return true;
}

/**
 * The tool_call guard: refuses the built-in write and edit on docs/tasks/**,
 * so the named tw_* tools are the only writers of the tree. It is a hook,
 * not a declared tool, so it is independent of the active tool set and
 * blocks in every phase, including while a skill toolset is open. Reading
 * the tree (read, bash) stays allowed, and no command-string scanning
 * exists: a shell command cannot be gated soundly, so the residual risk
 * that bash mutates the tree is accepted and documented in
 * docs/repo-gating.md.
 */
async function guardTaskTreeWrites(
  event: ToolCallEvent,
  ctx: ExtensionContext,
): Promise<ToolCallEventResult | undefined> {
  if (event.toolName !== "write" && event.toolName !== "edit") return undefined;
  const path = event.input.path;
  if (typeof path !== "string" || path.trim() === "") return undefined;
  if (!isTaskTreePath(path, ctx.cwd)) return undefined;
  return { block: true, reason: lockdownReason(event.toolName, path) };
}

/**
 * The spawn guard: refuses a dispatch of an implementation sub-agent when the
 * checkout is not the ticket branch that child commits on, so wrong-branch
 * work never starts. It rides the same `tool_call` hook as the write lockdown
 * (one handler, so no call is judged twice) and reads the checkout through the
 * session's own exec, the seam the openers already use.
 *
 * A block is returned, never thrown: the call becomes an error tool result, so
 * a blocked child fails its step and the session continues.
 */
async function guardSpawn(
  pi: ExtensionAPI,
  event: ToolCallEvent,
  ctx: ExtensionContext,
): Promise<ToolCallEventResult | undefined> {
  if (!isSpawnCall(event.toolName)) return undefined;
  const verdict = await spawnVerdict(
    ctx.cwd,
    event.toolName,
    event.input as Record<string, unknown>,
    {
      git: async (gitArgs: string[]) => {
        const ran = await pi.exec("git", gitArgs, { cwd: ctx.cwd });
        if (ran.code !== 0) {
          throw new Error(ran.stderr.trim() || `git ${gitArgs.join(" ")} exited ${ran.code}`);
        }
        return ran.stdout;
      },
    },
  );
  if (verdict.pass) {
    // A pass can still carry a diagnostic, but only one about the profile or
    // the settings it was resolved from, never about the checkout: a checkout
    // the seam cannot read blocks the spawn. The operator hears what the guard
    // had to report while it let the call through.
    for (const diagnostic of verdict.diagnostics) ctx.ui.notify(`task-workflow spawn guard: ${diagnostic}`, "info");
    return undefined;
  }
  return { block: true, reason: verdict.reason };
}

/**
 * The whole `tool_call` hook: the write lockdown first (it answers from the
 * path alone), then the spawn guard. One handler keeps the registered hook
 * count stable, and keeps every non-spawn call away from the spawn predicate.
 */
async function guardToolCall(
  pi: ExtensionAPI,
  event: ToolCallEvent,
  ctx: ExtensionContext,
): Promise<ToolCallEventResult | undefined> {
  return (await guardTaskTreeWrites(event, ctx)) ?? guardSpawn(pi, event, ctx);
}

/**
 * Re-assert the declared tool set the session transcript records, so the open
 * state survives resume and fork on the branch. The transcript is the
 * persistence source: pi restores it on /tree navigation; on resume and fork
 * the host rebuilds the loadout from registration defaults instead, so the
 * extension replays the transcript's current declarations here, before any
 * prompt can record a diff that would overwrite them.
 */
async function restoreDeclaredSetFromTranscript(
  pi: ExtensionAPI,
  ctx: ExtensionContext,
  reason: string,
): Promise<void> {
  if (reason !== "resume" && reason !== "fork") return;
  const names = getCurrentTools(ctx.sessionManager.buildSessionProjection().messages).map((t) => t.name);
  const live = new Set(pi.getActiveTools());
  if (names.length === live.size && names.every((name) => live.has(name))) return;
  pi.setActiveTools(names);
}

/**
 * The notify config path.
 *
 * Resolved from the OS home directory, never `process.env.HOME`: native
 * Windows sets `USERPROFILE` and leaves `HOME` unset, so an env lookup
 * silently resolves to the literal string `~` and the config is never found.
 * `home` is a parameter so the cross-platform shape is testable.
 */
export function notifyConfigPath(home: string = homedir()): string {
  return join(home, ".unipi", "config", "notify", "config.json");
}

// ─── Gate-state registration sets and the workflow-enabled condition ──────

/**
 * The tw_* tools a gated (work) repo registers: the passive set. The phase
 * skills are stripped and every writer stays unregistered there, but the
 * opener, the closer, and the feedback wrapper stay declared: tw_open is the
 * activation path for the one kept discipline (skill-creator, through the
 * gated restriction), tw_close releases it, and tw_feedback is claimed by the
 * shipped subagent allowlists (verified against pi-subagents 0.84.0: every
 * plain name in an agent's tools allowlist becomes a required child tool, and
 * a child whose allowlisted tool never registers fails its run at agent start
 * with "requested unavailable child tools", so a missing peer costs the
 * chain's runs, not just the feedback rows). The dispatcher companions
 * tw_next and tw_request_tool and every other tw_* tool stay unregistered in
 * a gated repo.
 */
const GATED_REGISTERED_TOOLS = ["tw_open", "tw_close", "tw_feedback"] as const;

/**
 * skill-creator's bundled script tools register in gated repos too, inactive
 * exactly as in an ungated repo: the restricted tw_open discloses them there,
 * and without registration the disclosure would activate nothing, which is
 * the "kept in name only" failure.
 */
const SKILL_CREATOR_TOOL_NAMES = ["skill_validate", "skill_scaffold", "skill_discover"] as const;

/**
 * True when the task workflow is enabled in this repo. Today this coincides
 * with the gate being inactive, but the two are separable concerns: the tool
 * registration branches on the gate state, while the write lockdown and the
 * transcript declared-set replay key on the workflow being enabled, with an
 * explicit predicate instead of the raw gate boolean. Refusal texts and
 * exemptions are unchanged either way.
 */
function workflowEnabled(gate: ResolveGateResult): boolean {
  return !gate.active;
}

// ─── Pi extension entry point ──────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
  let gate: ResolveGateResult;
  try {
    gate = resolveGate(process.cwd());
  } catch (e) {
    const message = (e as Error).message;
    gate = {
      active: false,
      reason: `gate detection failed: ${message}`,
      diagnostics: [message],
    };
  }
  const tools = createTools(gate.active);

  // ── Tool registration, split by gate state ─────────────────────────
  // The set of names each state contributes is a pure function of the gate
  // result: an ungated repo registers the full surface, a gated one the
  // passive set plus skill-creator's bundled tools. notify_user is generic
  // (it reads only the user's ntfy config) and registers in both states.
  const registeredNames = gate.active
    ? [...GATED_REGISTERED_TOOLS, ...SKILL_CREATOR_TOOL_NAMES]
    : Object.keys(tools);
  for (const name of registeredNames) {
    const def = tools[name];
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
      if (vv.optional && params[k]) params[k] = Type.Optional(params[k]);
    }

    pi.registerTool({
      name,
      label: name.replace(/^tw_/, "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      description: def.description,
      parameters: def.parameters ?? Type.Object(params),
      // The bypass-free gate: a phase tool is direct and inactive by default,
      // activated only by the opener, except the always-declared set
      // (`ALWAYS_DECLARED`), which needs no opener; a gated repo registers the
      // opener and the closer only, so a gated repo keeps the passive set it
      // had before the set grew.
      exposure: "direct",
      defaultActive: def.activeByDefault ?? false,
      ...(def.executionMode !== undefined ? { executionMode: def.executionMode } : {}),
      async execute(_id: string, args: any, _sig: any, _upd: any, ctx: any) {
        const result = await def.execute(args, {
          directory: ctx.cwd,
          getActiveTools: () => pi.getActiveTools(),
          setActiveTools: (toolNames: string[]) => pi.setActiveTools(toolNames),
          // The git seam the branch gates read the checkout through: the
          // session's own exec, so no gate grows its own process spawning.
          git: async (gitArgs: string[]) => {
            const ran = await pi.exec("git", gitArgs, { cwd: ctx.cwd });
            if (ran.code !== 0) {
              throw new Error(ran.stderr.trim() || `git ${gitArgs.join(" ")} exited ${ran.code}`);
            }
            return ran.stdout;
          },
          ...(ctx.executeTool ? { executeTool: (n: string, a: unknown) => ctx.executeTool(n, a) } : {}),
          ...(Array.isArray(ctx.tools) ? { tools: ctx.tools } : {}),
          ...(typeof ctx.hasUI === "boolean" ? { hasUI: ctx.hasUI } : {}),
          ...(ctx.ui?.confirm
            ? { confirm: (title: string, message: string) => ctx.ui.confirm(title, message) }
            : {}),
          ...(typeof ctx.ui?.notify === "function"
            ? { notify: (message: string, level: "info" | "warning" | "error") => ctx.ui.notify(message, level) }
            : {}),
        });
        if (typeof result === "string") {
          return { content: [{ type: "text", text: result }], details: {} };
        }
        return { content: [{ type: "text", text: result.text }], details: result.details };
      },
    });
  }

  // ── notify_user tool (both gate states) ─────────────────────────────
  pi.registerTool({
    name: "notify_user",
    label: "Notify User",
    description: "Send a notification to the user's configured ntfy platform.",
    parameters: Type.Object({
      title: Type.Optional(Type.String({ description: "Notification title" })),
      message: Type.String({ description: "Message body" }),
      priority: Type.Optional(Type.Union([Type.Literal("low"), Type.Literal("normal"), Type.Literal("high")])),
    }),
    async execute(_id: string, params: any) {
      const cfgPath = notifyConfigPath();
      if (!existsSync(cfgPath)) {
        return { content: [{ type: "text", text: "No ntfy config found." }], details: { sent: false } };
      }
      try {
        const cfg = JSON.parse(readText(cfgPath));
        const ntfy = cfg.ntfy;
        if (!ntfy?.enabled || !ntfy?.topic) {
          return { content: [{ type: "text", text: "ntfy not enabled or no topic configured." }], details: { sent: false } };
        }
        const url = `${(ntfy.serverUrl || "https://ntfy.sh").replace(/\/+$/, "")}/${encodeURIComponent(ntfy.topic)}`;
        const headers: Record<string, string> = { "Content-Type": "text/plain" };
        if (ntfy.token) headers["Authorization"] = `Bearer ${ntfy.token}`;
        if (params.title) headers["Title"] = params.title;
        const pMap: Record<string, number> = { low: 2, normal: 3, high: 5 };
        headers["Priority"] = String(pMap[params.priority] ?? 3);
        const resp = await fetch(url, { method: "POST", headers, body: params.message });
        return {
          content: [{ type: "text", text: resp.ok ? "Notification sent." : `Failed (HTTP ${resp.status}).` }],
          details: { sent: resp.ok },
        };
      } catch (e) {
        return { content: [{ type: "text", text: `Notification error: ${(e as Error).message}` }], details: { sent: false } };
      }
    },
  });

  // Write lockdown: the built-in write and edit are refused on docs/tasks/**
  // wherever the workflow is enabled; the named tw_* tools are the only
  // writers of the tree. It keys on the workflow-enabled condition, not on
  // the gate branch: the lockdown and the passive tool registration are
  // separable conditions. A tool_call hook, so it runs in every phase
  // regardless of the active tool set.
  if (workflowEnabled(gate)) {
    pi.on("tool_call", (event, ctx) => guardToolCall(pi, event, ctx));
  }

  pi.on("session_start", async (event, ctx) => {
    for (const diagnostic of gate.diagnostics) {
      ctx.ui.notify(`task-workflow gate: ${diagnostic}`, "info");
    }
    for (const diagnostic of SKILL_NAME_DIAGNOSTICS) {
      ctx.ui.notify(`task-workflow manifest: ${diagnostic}`, "warning");
    }
    if (gate.active) {
      ctx.ui.notify(`task-workflow gate active: ${gate.reason}`, "info");
    }
    // Persistence, workflow-bound: replay the transcript's declared tool set
    // on resume and fork, so the open state survives them. The declared set
    // is the open/close engine's state, which only exists where the workflow
    // runs, so a gated repo skips the replay.
    if (workflowEnabled(gate)) {
      await restoreDeclaredSetFromTranscript(pi, ctx, event.reason);
    }
    // Check required peer extensions: both matter in a gated repo too, since
    // tw_feedback registers there (claimed by the shipped subagent
    // allowlists) and the subagents launch there.
    const allTools = pi.getAllTools();
    if (!allTools.some((t) => t.name === "subagent")) {
      ctx.ui.notify("pi-subagents is not installed. Install it with: pi install npm:pi-subagents", "warning");
    }
    if (!allTools.some((t) => t.name === "submit_feedback")) {
      ctx.ui.notify(
        "pi-telemetry is not installed. The shipped subagents list submit_feedback in their tools allowlist, and " +
          "on pi-subagents 0.84.0 every plain name in that allowlist is a required child tool: a child whose " +
          'allowlisted tool never registers fails its run at agent start with the error "requested unavailable ' +
          'child tools". With pi-telemetry absent, the shipped chains do not run: every chain child fails at ' +
          "agent start instead of recording workflow feedback. " +
          "Install it with: pi install npm:@y4shin/pi-telemetry",
        "warning",
      );
    }
  });

  if (gate.active) {
    pi.on("before_agent_start", stripSkills);
    pi.on("input", gateSkillInvocation);
  }

}
