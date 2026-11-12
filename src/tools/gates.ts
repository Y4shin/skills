/**
 * The gate family: the opener, the closer, the next-step router, the phase brief, the
 * schema migration tool, and the tool request. Every refusal is composed from the
 * git-profile exports and the refusal text builders in the support module.
 */

import { join } from "node:path";
import { Type } from "typebox";
import { type Artifact } from "../core/art.js";
import { ALWAYS_DECLARED, CLOSER, GATED_SKILL_NAMES, SKILL_REGISTRY, buildOpenParameters, conflictReason, duplicateReason, gatedReason, openSkillsIn, openableWhenGated, skillEntry, validateOpenArgs, type SkillEntry } from "../disclosure.js";
import { effortGraphs, effortFrontier, itemFinalizable, type EffortGraph, type ScanIndexLike } from "../core/graph.js";
import { migrate } from "../core/migrate.js";
import { FsPort } from "../core/fs-port.js";
import { renderMigrationReport } from "../migrate-report.js";
import { closeBrief, decideFromBrief, decideFromClose, phaseBrief, phaseText, readCheckout, unreadableCheckout, type CloseBrief, type PhaseBrief } from "../core/git-profile.js";
import { Tool, ToolContext, defStructured, directoryLeaf, findRoot, isDir, isFile, isInside, listSubdirs, liveEffortDir, outcome, parseArtifactFile, refusedOuttext, relPosix, resolveArt, scanMemo, sendWorkflowFeedback, taskRoot } from "./support.js";
import { createTools } from "../pi.js";


// ─── Open, close, next ────────────────────────────────────────────────────

/**
 * The open skills implied by the session's active tool set, or an empty set
 * when no active tool set is reachable (a tool execute without a bound
 * session). The derivation is the open/close engine's only state source.
 */
function currentOpenSkills(ctx: ToolContext): Set<string> {
  return openSkillsIn(ctx.getActiveTools?.() ?? []);
}


function requireActiveSet(ctx: ToolContext): { get: () => string[]; set: (names: string[]) => void } {
  if (!ctx.getActiveTools || !ctx.setActiveTools) {
    throw new Error("tw_open and tw_close need a session-bound active tool set");
  }
  return { get: () => ctx.getActiveTools!(), set: (names) => ctx.setActiveTools!(names) };
}


/**
 * Compute the active set after closing one open skill: every workflow tool
 * that no remaining open skill declares leaves the set, which covers the
 * closing skill's own tools and any tool the opener granted by request. A
 * grant lasts until the next close, then it goes with the phase that asked
 * for it. Tools from other extensions (feedback, telemetry, browser) are never
 * in a registry toolset, so they are left alone.
 */
function activeAfterClose(active: string[], closing: SkillEntry, remaining: Set<string>): string[] {
  const stillNeeded = new Set<string>();
  for (const name of remaining) {
    for (const tool of skillEntry(name)?.toolset ?? []) stillNeeded.add(tool);
  }
  const workflow = new Set(SKILL_REGISTRY.flatMap((entry) => entry.toolset));
  return active.filter((tool) => (workflow.has(tool) ? stillNeeded.has(tool) : true));
}


/**
 * Record the skill invocation telemetry the per-skill prose used to ask the
 * model for: the opener absorbs the explicit telemetry_skill_context call, so
 * the model never makes one. Best-effort and fail-open: when the telemetry
 * extension is absent (unknown tool) or errors, the open still succeeds.
 */
async function recordSkillTelemetry(
  ctx: ToolContext,
  skill: string,
  effort: string,
  target: string | undefined,
): Promise<void> {
  if (!ctx.executeTool) return;
  try {
    await ctx.executeTool("telemetry_skill_context", {
      skill_name: skill,
      target: target ?? effort,
    });
  } catch {
    // Telemetry is never load-bearing for the open.
  }
}


// ─── Opener gate: the phase preconditions ────────────────────────────────────────

/** Why an open is refused, and the calls that are legal next. */
interface GateRefusal {
  reason: string;
  legalNext: string[];
}


/**
 * The live effort slugs, for the refusal hint list: directories under the
 * task tree (non-effort scopes excluded) that hold a map or a spec, plus the
 * legacy maps scope. Best effort: the list only helps a caller that mistyped
 * a slug.
 */
function liveEffortSlugs(root: string): string[] {
  const base = taskRoot(root);
  const skip = new Set(["archive", "maps", "out-of-scope"]);
  const slugs = listSubdirs(base, skip).filter((n) =>
    ["map.md", "spec.md"].some((leaf) => isFile(join(base, n, leaf))),
  );
  if (isDir(join(base, "maps"))) {
    slugs.push(...listSubdirs(join(base, "maps")).map((n) => `maps/${n}`));
  }
  return slugs.sort();
}


/**
 * The phase precondition behind tw_open: the gate and the disclosure are the
 * same call, so a refused open activates nothing. Preconditions are computed
 * from the real artifact tree through the scan seam and the pure
 * art.ts/graph.ts layers; the registry's `gate` row decides which checks a
 * phase gets, and this is their only implementation. No phase precondition is
 * duplicated anywhere else, and none lives in skill prose.
 */
function phaseGate(
  root: string,
  entry: SkillEntry,
  args: { effort?: unknown; target?: unknown },
): GateRefusal | null {
  const effort = String(args.effort ?? "");
  switch (entry.gate) {
    case "none":
      return null;
    case "effort":
      return requireLiveEffort(root, effort);
    case "spec-ready": {
      const missing = requireLiveEffort(root, effort);
      if (missing !== null) return missing;
      // ready_for_spec is the only thing to-spec checks: the producer (the
      // Wayfinder reconcile, through tw_finalize_map) owns every other
      // precondition, the consumer owns only the flag.
      const mapPath = directoryLeaf(liveEffortDir(root, effort)!, "map");
      if (mapPath === null) {
        return {
          reason: `no map in '${effort}': the Wayfinder reconcile has not run`,
          legalNext: ["run wayfinder"],
        };
      }
      try {
        if (parseArtifactFile(mapPath).art.ready_for_spec !== true) {
          return {
            reason:
              `the map of '${effort}' has ready_for_spec false: the Wayfinder reconcile has not set it; ` +
              `a run that finished every planning task but skipped reconciliation is refused here`,
            legalNext: ["run wayfinder"],
          };
        }
      } catch {
        return {
          reason: `the map of '${effort}' is not a readable artifact; the Wayfinder reconcile has not run`,
          legalNext: ["run wayfinder"],
        };
      }
      return null;
    }
    case "tickets-ready": {
      // to-tickets consumes the settled spec: a live effort with a spec.md
      // that is published (stable). The spec phase's own gate owns the
      // ready_for_spec flag; this one owns the artifact the next phase reads.
      const missing = requireLiveEffort(root, effort);
      if (missing !== null) return missing;
      const specPath = directoryLeaf(liveEffortDir(root, effort)!, "spec");
      if (specPath === null) {
        return {
          reason: `no spec in '${effort}': to-tickets consumes the settled specification`,
          legalNext: ["run to-spec"],
        };
      }
      try {
        const status = parseArtifactFile(specPath).art.status;
        if (status !== null && status !== "stable") {
          return {
            reason: `'${relPosix(root, specPath)}' has status '${status}', not stable: to-tickets consumes the published spec`,
            legalNext: ["publish the spec through to-spec"],
          };
        }
      } catch {
        return {
          reason: `'${relPosix(root, specPath)}' is not a readable artifact: rewrite it through to-spec`,
          legalNext: ["run to-spec"],
        };
      }
      return null;
    }
    case "implementation": {
      const missing = requireLiveEffort(root, effort);
      if (missing !== null) return missing;
      const effortDir = liveEffortDir(root, effort)!;
      const index = scanMemo(root)();
      const graph = graphForEffortDir(effortGraphs(index), effortDir);
      // The work-state checks come first: they diagnose the effort itself,
      // whether or not a target was named.
      if (graph?.spec != null) {
        const ticketCount = graph.tickets.length + graph.deprecated.filter((a) => a.type === "ticket").length;
        if (ticketCount === 0) {
          return {
            reason: `effort '${graph.slug}' has a spec but no tickets: ticket generation has not run`,
            legalNext: ["run to-tickets"],
          };
        }
      }
      if (graph !== null) {
        const deprecatedTickets = graph.deprecated.filter((a) => a.type === "ticket").length;
        const hasTickets = graph.tickets.length + deprecatedTickets > 0;
        const unfinished = graph.tickets.filter((t) => t.workflow_state !== "done");
        if (hasTickets && unfinished.length === 0) {
          return {
            reason: `every ticket of '${graph.slug}' is done: there is no implementation work left`,
            legalNext: ["run finalize-effort"],
          };
        }
      }
      // The architecture document: missing or unstable is an opener refusal,
      // never a draft step. Bug-only efforts have none by design. The check
      // reads arch-spec.md today and names the schema-5 rename: the target
      // state's architecture.md is accepted before the migration runs.
      if (graph !== null && !isBugOnly(graph)) {
        const arch = architectureDocIn(index, effortDir);
        if (arch === null) {
          return {
            reason:
              `no architecture document in '${effort}': expected architecture.md (the schema-5 name), ` +
              `or the legacy arch-spec.md until the migration renames it; the architecture document is never drafted here`,
            legalNext: ["run to-tickets"],
          };
        }
        if (arch.art.status !== null && arch.art.status !== "stable") {
          return {
            reason:
              `'${relPosix(root, arch.path)}' has status '${arch.art.status}', not stable: ` +
              `the architecture document is never drafted here`,
            legalNext: ["run to-tickets"],
          };
        }
      }
      // A ticket open carries the effort and the target.
      if (typeof args.target !== "string" || args.target.trim() === "") {
        return {
          reason: `opening '${entry.name}' requires a target: the ticket to implement`,
          legalNext: ["retry tw_open with the target ticket slug"],
        };
      }
      return requireTicketTarget(root, effort, effortDir, graph, args.target);
    }
  }
}


/**
 * The branch gate behind tw_open: the profile gives some phases a branch, and
 * such a phase refuses to open unless the checkout is on it. The gate and the
 * brief resolve the same profile row, so the refusal's required branch and the
 * step that creates it cannot drift from what a brief reports.
 *
 * The checkout is read through the tool context's git seam, so a fake answers
 * it in tests. A checkout the seam cannot read refuses too: guards block and do
 * not warn, so a phase whose branch cannot be confirmed does not open, and the
 * diagnostic naming the cause rides the details.
 */
async function branchGate(
  ctx: ToolContext,
  entry: SkillEntry,
  args: { effort?: unknown; target?: unknown },
): Promise<{ brief: PhaseBrief; refusal: GateRefusal | null }> {
  const request = {
    name: entry.name,
    effort: String(args.effort ?? ""),
    ticket: typeof args.target === "string" && args.target.trim() !== "" ? args.target.trim() : undefined,
  };
  const deps = ctx.profilesDir === undefined ? {} : { profilesDir: ctx.profilesDir };
  const brief = phaseBrief(ctx.directory, request, deps);
  if (brief.branch === null) return { brief, refusal: null };
  const checkout = await readCheckout(ctx.git);
  if (checkout.diagnostic !== null) {
    // The checkout was never read, so the branch was never confirmed: the open
    // is refused, in the same shape as a wrong branch, and the cause reports.
    const unreadable = unreadableCheckout(entry.name, brief.branch, checkout.diagnostic);
    return {
      brief: { ...brief, diagnostics: [...brief.diagnostics, checkout.diagnostic] },
      refusal: { reason: unreadable.reason, legalNext: [`${unreadable.recovery}, then open ${entry.name}`] },
    };
  }
  const decision = decideFromBrief(brief, entry.name, checkout.branch);
  if (decision.pass) return { brief, refusal: null };
  // The legal next call is the step that produces the branch, so a model that
  // performs it and retries lands on the same open.
  return { brief, refusal: { reason: decision.reason, legalNext: decision.step === null ? [] : [decision.step] } };
}


/**
 * The closing gate behind tw_close: a profile row may carry the branch its
 * phase's close gates on, so a run that drifted off that branch after the open
 * cannot release the phase from there. The close resolves the row first and
 * reads the checkout only when a gate resolved, so a phase the profile does not
 * gate reads nothing at all.
 *
 * A gate this call cannot resolve refuses rather than passing: the template
 * needs an effort (or a ticket) the close did not receive, and a guard that
 * cannot evaluate its condition does not clear it. A checkout the seam cannot
 * read refuses the same way, with the cause in the details.
 */
async function closeBranchGate(
  ctx: ToolContext,
  entry: SkillEntry,
  args: { effort?: unknown; ticket?: unknown },
): Promise<{ gate: CloseBrief; refusal: GateRefusal | null }> {
  const request = {
    name: entry.name,
    effort: String(args.effort ?? ""),
    ticket: typeof args.ticket === "string" && args.ticket.trim() !== "" ? args.ticket.trim() : undefined,
  };
  const deps = ctx.profilesDir === undefined ? {} : { profilesDir: ctx.profilesDir };
  const gate = closeBrief(ctx.directory, request, deps);
  if (gate.template === null) return { gate, refusal: null };
  if (gate.branch === null) {
    // The row gates the close and the template needs a value this call did not
    // receive. A guard that cannot evaluate its condition does not clear it, so
    // the close refuses and names the value the caller has to pass.
    const needs = gate.template.includes("{ticket}") ? "ticket" : "effort";
    return {
      gate,
      refusal: {
        reason:
          `'${entry.name}' closes on a branch this close could not resolve ('${gate.template}'): ` +
          `name the ${needs} the phase works ${needs === "ticket" ? "on" : "in"}`,
        legalNext: [`retry tw_close ${entry.name} with the ${needs}`],
      },
    };
  }
  const checkout = await readCheckout(ctx.git);
  if (checkout.diagnostic !== null) {
    const unreadable = unreadableCheckout(entry.name, gate.branch, checkout.diagnostic);
    return {
      gate: { ...gate, diagnostics: [...gate.diagnostics, checkout.diagnostic] },
      refusal: { reason: unreadable.reason, legalNext: [`${unreadable.recovery}, then close ${entry.name}`] },
    };
  }
  const decision = decideFromClose(gate, entry.name, checkout.branch);
  if (decision.pass) return { gate, refusal: null };
  return { gate, refusal: { reason: decision.reason, legalNext: decision.step === null ? [] : [decision.step] } };
}


/**
 * The push step a profile's push policy renders: the command for the branch the
 * phase is on when the policy allows a push, and no command at all when it does
 * not. A profile that names no policy pushes nothing, which reads as 'never',
 * the same word the merge line uses.
 *
 * The policy reaches the phase as data, so no phase file carries a push command
 * and none can contradict the policy: the brief either renders one or renders
 * none.
 */
function pushStepLine(brief: PhaseBrief, skill: string): string {
  if (brief.push !== "always") {
    return `Push step: none; the profile's push policy is '${brief.push ?? "never"}', so nothing is pushed.`;
  }
  if (brief.branch === null) {
    return `Push step: none; '${skill}' requires no branch, so there is nothing to push.`;
  }
  return `Push step: git push origin ${brief.branch}.`;
}


/** The shared unknown-effort refusal every effort-taking phase starts with. */
function requireLiveEffort(root: string, effort: string): GateRefusal | null {
  if (liveEffortDir(root, effort) !== null) return null;
  const live = liveEffortSlugs(root);
  const hint = live.length > 0 ? `; live efforts: ${live.join(", ")}` : "; no efforts exist yet";
  return {
    reason: `no live effort '${effort}'${hint}`,
    legalNext: ["run intake"],
  };
}


/** The effort graph a live effort directory belongs to, or null. */
function graphForEffortDir(graphs: Map<string, EffortGraph>, dir: string): EffortGraph | null {
  for (const g of graphs.values()) {
    for (const a of [g.map, g.spec, ...g.tasks, ...g.tickets, ...g.deprecated]) {
      if (a?.path && isInside(dir, a.path)) return g;
    }
  }
  return null;
}


/**
 * The effort's architecture document, preferring the schema-5 name
 * (architecture.md) over the legacy arch-spec.md the migration renames.
 */
function architectureDocIn(
  index: ScanIndexLike,
  effortDir: string,
): { path: string; art: Artifact } | null {
  const hits = index.hits.filter(
    (h) => isInside(effortDir, h.path) && (h.art.type === "architecture" || h.art.type === "arch spec"),
  );
  return hits.find((h) => h.art.type === "architecture") ?? hits[0] ?? null;
}


/** Bug-only efforts have no architecture document by design. */
function isBugOnly(graph: EffortGraph): boolean {
  return graph.tickets.length > 0 && graph.tickets.every((t) => t.subtype === "bug");
}


/**
 * The target ticket's unfinished same-kind blockers, by slug. Done-ness is
 * itemFinalizable's: workflow_state done, deprecated counting as done.
 */
function unfinishedBlockers(graph: EffortGraph, target: Artifact): string[] {
  const items = [...graph.tasks, ...graph.tickets, ...graph.deprecated];
  return target.blocked_by
    .map((slug) => items.find((a) => a.slug === slug))
    .filter((a): a is Artifact => a !== undefined && itemFinalizable(a) !== null)
    .map((a) => a.slug);
}


/**
 * Resolve the target as a ticket OF THIS EFFORT. Slugs are effort-scoped (the
 * same ticket slug may exist in several efforts), so the effort's own tickets
 * directory resolves first; a path selector falls back to the global
 * resolver, and the containment check keeps a foreign ticket out.
 */
function resolveTicketInEffort(
  root: string,
  effortDir: string,
  selector: string,
): Artifact | null {
  const local = join(effortDir, "tickets", selector, "ticket.md");
  if (isFile(local)) {
    try {
      return parseArtifactFile(local).art;
    } catch {
      return null;
    }
  }
  try {
    const hit = resolveArt(root, selector, "ticket");
    return hit.path && isInside(effortDir, hit.path) ? hit.art : null;
  } catch {
    return null;
  }
}


/** The ready frontier of the graph's ticket kind, by slug. */
function readyTicketSlugs(graph: EffortGraph): string[] {
  return effortFrontier(graph)
    .filter((a) => a.type === "ticket")
    .map((a) => a.slug);
}


/**
 * The target-ticket half of the implementation gate: the target must be a
 * ticket of the effort, not done, not blocked, and on the ready frontier (an
 * in-progress ticket is legal: a resumed run). Every refusal names the legal
 * next call: the tickets that can be implemented instead, or the blockers
 * that must land first.
 */
function requireTicketTarget(
  root: string,
  effort: string,
  effortDir: string,
  graph: EffortGraph | null,
  target: string,
): GateRefusal | null {
  const resolved = resolveTicketInEffort(root, effortDir, target);
  if (resolved === null) {
    return {
      reason: `no ticket '${target}' in '${effort}'`,
      legalNext: readyTicketsOrRetry(graph),
    };
  }
  const slug = resolved.slug;
  // Done-ness gates on itemFinalizable: workflow_state done, deprecated
  // counting as done.
  if (itemFinalizable(resolved) === null) {
    return {
      reason: `ticket '${slug}' is done: there is nothing left to implement there`,
      legalNext: readyTicketsOrRetry(graph),
    };
  }
  if (resolved.workflow_state === "blocked") {
    const blockers = graph === null ? [] : unfinishedBlockers(graph, resolved);
    return {
      reason:
        blockers.length > 0
          ? `ticket '${slug}' is blocked by ${blockers.join(", ")}`
          : `ticket '${slug}' is marked blocked`,
      legalNext:
        blockers.length > 0
          ? blockers.map((b) => `implement-ticket: ${b}`)
          : [`retry tw_open once '${slug}' is unblocked`],
    };
  }
  if (graph !== null && !readyTicketSlugs(graph).includes(slug)) {
    const blockers = unfinishedBlockers(graph, resolved);
    return {
      reason: `ticket '${slug}' is not ready: blocked by ${blockers.join(", ")}`,
      legalNext: blockers.map((b) => `implement-ticket: ${b}`),
    };
  }
  return null;
}


/**
 * The legal next for a target that cannot be worked: the ready tickets of the
 * effort, or the retry hint when the frontier is empty.
 */
function readyTicketsOrRetry(graph: EffortGraph | null): string[] {
  if (graph === null) return ["retry tw_open with the target ticket slug"];
  const ready = readyTicketSlugs(graph);
  return ready.length > 0 ? ready.map((slug) => `implement-ticket: ${slug}`) : ["retry tw_open with the target ticket slug"];
}


/**
 * Every tool definition the factory owns, by name: the requestable surface,
 * built from the ungated full set. The only consumer is tw_request_tool's
 * unknown-tool refusal, and that tool registers only where the workflow
 * runs, so the ungated basis is exact wherever the cache is read.
 */
let workflowToolNamesCache: Set<string> | undefined;

function workflowToolNames(): Set<string> {
  workflowToolNamesCache ??= new Set(Object.keys(createTools()));
  return workflowToolNamesCache;
}


/**
 * Record a request outcome through `sendWorkflowFeedback` without ever
 * failing the request itself: a missing telemetry store must not undo a grant
 * the operator just approved. Returns the sentence to append to the result.
 */
async function recordRequestFeedback(ctx: ToolContext, data: Record<string, unknown>): Promise<string> {
  try {
    await sendWorkflowFeedback(ctx, "friction", data);
    return " Recorded as workflow feedback.";
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return ` ${detail}`;
  }
}

/**
 * The gate family's tool record, built per gate state: tw_open's parameter schema narrows
 * to the openable skills when the repository is gated, so the record cannot be a constant.
 */
export function gateTools(gated: boolean): Record<string, Tool> {
  return {

    // ── disclosure core: the opener, the closer, and the router ──

    tw_open: defStructured(
      "Open a workflow skill: the opener is the gate. It checks that phase's preconditions against the " +
        "artifact tree, refuses and names the legal next calls when they fail, and activates the phase's " +
        "toolset (plus tw_close) only when they pass; a refused open discloses nothing. " +
        "A wayfinder open carries only the effort; a ticket open carries the effort and the target. " +
        "Also refuses a skill that is already open or conflicts with an open skill.",
      buildOpenParameters(gated),
      async (p, ctx) => {
        // The gated restriction runs before every other check: in a work repo
        // the opener opens only the non-gated registry entries (the schema
        // already narrows to them), so a manifest name is refused in the
        // opener's own refusal language whatever the tree looks like, with a
        // notify in the spirit of the skill-invocation gate. Non-manifest
        // names keep every existing behavior, including validateOpenArgs's
        // unknown-skill error.
        if (gated && GATED_SKILL_NAMES.includes(String(p.skill))) {
          const skill = String(p.skill);
          ctx.notify?.(`task-workflow is gated in this work repo; not opening ${skill}`, "warning");
          const reason = gatedReason(skill);
          const legalNext = openableWhenGated().map((s) => `tw_open ${s.name}`);
          return outcome(refusedOuttext(reason, legalNext), {
            opened: false,
            reason,
            legal_next: legalNext,
          });
        }
        validateOpenArgs(p);
        const entry = skillEntry(p.skill as string)!;
        const activeSet = requireActiveSet(ctx);
        const active = activeSet.get();
        const open = currentOpenSkills(ctx);
        if (open.has(entry.name)) {
          const reason = duplicateReason(entry.name);
          // The work is already open: nothing further is legal through the
          // opener, so the legal-next list is empty.
          return outcome(refusedOuttext(reason, []), { opened: false, reason, legal_next: [] });
        }
        // Exclusivity is a symmetric data table, so the check is
        // order-independent; both directions are consulted for safety.
        const conflicting = [...open].find(
          (name) =>
            entry.conflicts.includes(name) || (skillEntry(name)?.conflicts.includes(entry.name) ?? false),
        );
        if (conflicting !== undefined) {
          const reason = conflictReason(entry.name, conflicting);
          return outcome(refusedOuttext(reason, [`tw_close ${conflicting}`]), {
            opened: false,
            reason,
            legal_next: [`tw_close ${conflicting}`],
            open: [...open],
          });
        }
        // The opener is the gate: the phase precondition runs before anything
        // is disclosed, so a refused open leaves the toolset closed. The tree
        // precondition comes first, then the branch gate: a phase the profile
        // gives a branch refuses unless the checkout is on it.
        const refusal = phaseGate(findRoot(ctx.directory), entry, p);
        if (refusal !== null) {
          return outcome(refusedOuttext(refusal.reason, refusal.legalNext), {
            opened: false,
            reason: refusal.reason,
            legal_next: refusal.legalNext,
          });
        }
        const gate = await branchGate(ctx, entry, p);
        if (gate.refusal !== null) {
          return outcome(refusedOuttext(gate.refusal.reason, gate.refusal.legalNext), {
            opened: false,
            reason: gate.refusal.reason,
            legal_next: gate.refusal.legalNext,
            required_branch: gate.brief.branch,
            profile: gate.brief.profile,
            diagnostics: gate.brief.diagnostics,
          });
        }
        const next = [...new Set([...active, ...entry.toolset, CLOSER])].sort();
        activeSet.set(next);
        const disclosed = next.filter((tool) => !active.includes(tool));
        await recordSkillTelemetry(ctx, entry.name, p.effort as string, p.target as string | undefined);
        const opened = [`Opened ${entry.name}: now active ${disclosed.join(", ")}.`];
        // The profile's opening instructions ride the open's result: the one
        // channel that reaches the model at the point the phase starts.
        if (gate.brief.openInstructions !== "") opened.push(gate.brief.openInstructions);
        if (gate.brief.diagnostics.length > 0) opened.push(`Diagnostics: ${gate.brief.diagnostics.join("; ")}`);
        return outcome(
          opened.join("\n"),
          {
            opened: true,
            skill: entry.name,
            effort: p.effort,
            target: p.target,
            disclosed,
            active: next,
            required_branch: gate.brief.branch,
            profile: gate.brief.profile,
            diagnostics: gate.brief.diagnostics,
          },
        );
      },
      { activeByDefault: true, executionMode: "sequential" },
    ),


    tw_close: defStructured(
      "Close a named open workflow skill, removing the tools no other open skill still needs. " +
        "Declared in every state, including idle: closing a skill that is not open is refused with the " +
        "legal next call instead of a missing-tool error. Other open skills stay open. A phase whose git " +
        "profile row carries a closing gate refuses to close unless the checkout is on the branch that row " +
        "names, so pass the effort the phase works in (and the ticket, for a row that gates on one); the " +
        "refusal names the branch to check out, and retrying after it closes.",
      Type.Object({
        skill: Type.String({ description: "The workflow skill to close" }),
        effort: Type.Optional(
          Type.String({ description: "The effort the closing phase works in, for a phase whose profile row gates the close on a branch" }),
        ),
        ticket: Type.Optional(
          Type.String({ description: "The ticket slug, for a phase whose profile row gates the close on one" }),
        ),
      }),
      async (p, ctx) => {
        const entry = typeof p.skill === "string" ? skillEntry(p.skill) : undefined;
        if (!entry) {
          return outcome(`Refused: '${String(p.skill)}' is not an openable skill.`, {
            closed: false,
            reason: `'${String(p.skill)}' is not an openable skill`,
          });
        }
        const activeSet = requireActiveSet(ctx);
        const active = activeSet.get();
        const open = currentOpenSkills(ctx);
        if (!open.has(entry.name)) {
          if (open.size === 0) {
            return outcome(
              `Refused: '${entry.name}' is not open; no workflow skill is open now, so close has nothing to ` +
                `release. Legal next: open a phase with tw_open.`,
              { closed: false, reason: `'${entry.name}' is not open`, open: [], legal_next: ["tw_open"] },
            );
          }
          const still = [...open].sort().join(", ");
          return outcome(
            `Refused: '${entry.name}' is not open; open skills: ${still}. Legal next: close one of those.`,
            { closed: false, reason: `'${entry.name}' is not open`, open: [...open] },
          );
        }
        // The closing gate: the row may carry the branch this phase closes on,
        // so a checkout that drifted off it cannot release the phase. A phase
        // whose row carries no gate reads no checkout and closes as before.
        const gate = await closeBranchGate(ctx, entry, { effort: p.effort, ticket: p.ticket });
        if (gate.refusal !== null) {
          return outcome(refusedOuttext(gate.refusal.reason, gate.refusal.legalNext), {
            closed: false,
            reason: gate.refusal.reason,
            legal_next: gate.refusal.legalNext,
            close_gate: gate.gate.branch,
            profile: gate.gate.profile,
            open: [...open],
            diagnostics: gate.gate.diagnostics,
          });
        }
        const remaining = new Set([...open].filter((name) => name !== entry.name));
        const next = activeAfterClose(active, entry, remaining);
        activeSet.set(next);
        const removed = active.filter((tool) => !next.includes(tool));
        // The profile's closing instructions ride the close's result, the
        // channel that reaches the model as the phase ends. They come from the
        // profile alone; the gate above is what reads the checkout, and only
        // when the row carries one.
        const text = phaseText(
          ctx.directory,
          entry.name,
          ctx.profilesDir === undefined ? {} : { profilesDir: ctx.profilesDir },
        );
        const lines = [`Closed ${entry.name}: removed ${removed.length > 0 ? removed.join(", ") : "nothing"}.`];
        if (text.close !== "") lines.push(text.close);
        if (text.diagnostics.length > 0) lines.push(`Diagnostics: ${text.diagnostics.join("; ")}`);
        return outcome(lines.join("\n"), {
          closed: true,
          skill: entry.name,
          removed,
          active: next,
          open: [...remaining],
          close_gate: gate.gate.branch,
          profile: gate.gate.profile,
          diagnostics: text.diagnostics,
        });
      },
      { activeByDefault: true, executionMode: "sequential" },
    ),


    tw_next: defStructured(
      "Ask what to do next in the task workflow. Always declared, never errors: outside a skill it " +
        "answers in short prose; inside a skill it says to finish the current work first.",
      Type.Object({}),
      async (_p, ctx) => {
        const open = currentOpenSkills(ctx);
        if (open.size === 0) {
          return outcome(
            "No workflow skill is open. Start the next phase by calling tw_open with the skill to run, " +
              "for example the wayfinder planning phase, or ask the task-workflow-overview skill for the story.",
            { open: [] },
          );
        }
        const names = [...open].sort().join(", ");
        return outcome(
          `You are inside ${names}. Finish the current work first, then call tw_next again from outside the skill.`,
          { open: [...open] },
        );
      },
      { activeByDefault: true },
    ),


    // ── the phase brief: what a phase needs before it opens ──

    tw_phase_brief: defStructured(
      "Ask what a phase needs before opening it: the branch it must be checked out on, the step that creates " +
        "that branch, and the phase's instruction text. Read-only: it opens nothing, writes nothing, and needs " +
        "no open phase, so it is the first call of any branch-bearing phase. The branch comes from the " +
        "repository's git profile (taskWorkflow.git in settings); a malformed key, a missing profile, or an " +
        "unknown profile name falls back to 'default' with a diagnostic rather than failing. A phase the " +
        "profile gives no branch reports no requirement. Pass the ticket slug when the phase works one ticket. " +
        "Ask it for an implementation agent (tdd-worker and its siblings) to learn the branch that agent's " +
        "phase must create and check out before dispatching it. The answer also carries the trunk, the " +
        "profile's merge flag and push policy, and the trunk-merge mode, which the effort close acts on.",
      Type.Object({
        skill: Type.String({
          description:
            `The workflow phase to ask about (${SKILL_REGISTRY.map((s) => s.name).join(", ")}), or an ` +
            `implementation agent the profile gives a branch`,
        }),
        effort: Type.String({ description: "The effort the phase works in" }),
        ticket: Type.Optional(
          Type.String({ description: "The ticket slug, for a phase that works one ticket" }),
        ),
      }),
      async (p, ctx) => {
        const phases = SKILL_REGISTRY.map((s) => s.name);
        const skill = typeof p.skill === "string" ? p.skill.trim() : "";
        if (skill === "") {
          const reason = `no name was given: pass a workflow phase or an implementation agent`;
          return outcome(refusedOuttext(reason, [`retry tw_phase_brief with one of the phases`]), {
            reason,
            legal_next: phases,
          });
        }
        const effort = typeof p.effort === "string" ? p.effort.trim() : "";
        if (effort === "") throw new Error("tw_phase_brief needs a non-empty effort");
        const ticket = typeof p.ticket === "string" && p.ticket.trim() !== "" ? p.ticket.trim() : undefined;
        const brief = phaseBrief(
          ctx.directory,
          { name: skill, effort, ticket },
          ctx.profilesDir === undefined ? {} : { profilesDir: ctx.profilesDir },
        );
        // A phase opens; an implementation agent is dispatched onto a branch
        // its phase created. Both answer from the profile, so the phase that
        // must create a worker's branch asks the worker's row. Any other name
        // is refused: nothing in the profile names it.
        if (brief.kind === "unknown") {
          const reason =
            `'${skill}' is neither a workflow phase nor an implementation agent the git profile names: ` +
            `the phases are ${phases.join(", ")}`;
          return outcome(refusedOuttext(reason, [`retry tw_phase_brief with one of the phases`]), {
            reason,
            legal_next: phases,
          });
        }

        const lines = [`Brief for ${skill} in effort '${effort}' (profile: ${brief.profile}).`];
        if (brief.branch === null) {
          lines.push(`Required branch: none; '${skill}' requires no branch.`);
        } else {
          lines.push(`Required branch: ${brief.branch}.`);
          if (brief.step !== null) lines.push(`Step: ${brief.step}.`);
        }
        lines.push(`Instructions: ${brief.openInstructions === "" ? "none" : brief.openInstructions}`);
        if (brief.closeInstructions !== "") lines.push(`Closing instructions: ${brief.closeInstructions}`);
        if (brief.merge !== null) {
          lines.push(
            `Merge step: '${brief.merge}' into the trunk (${brief.trunk}), ` +
              `trunk merge mode '${brief.trunkMerge}', push '${brief.push ?? "never"}'.`,
          );
        }
        // The push is a step, not a command the phase's prose fixes: the
        // policy renders it, so a profile that forbids a push renders none.
        if (brief.kind === "phase") lines.push(pushStepLine(brief, skill));
        if (brief.diagnostics.length > 0) lines.push(`Diagnostics: ${brief.diagnostics.join("; ")}`);

        return outcome(lines.join("\n"), {
          skill,
          effort,
          ticket,
          profile: brief.profile,
          kind: brief.kind,
          branch: brief.branch,
          branch_step: brief.step,
          instructions: brief.openInstructions,
          closing_instructions: brief.closeInstructions,
          close_gate: brief.closeGate,
          merge: brief.merge,
          push: brief.push,
          trunk: brief.trunk,
          trunk_merge: brief.trunkMerge,
          diagnostics: brief.diagnostics,
        });
      },
      { activeByDefault: true },
    ),


    tw_migrate: defStructured(
      "Migrate this repo's task-workflow bundle to schema 5, in-process: the whole any-vintage-to-5 " +
        "transformation (the effort-grouped layout reorganization, the frontmatter unification, the aux " +
        "backfill, the archive reshape, the state rebuild, the vendored-tree relocation, the schema-5 " +
        "renames, the map body reshape, and the root index write) over the target " +
        "tree, with every rewrite verified before it lands. Returns the migration report: the from and to " +
        "schema versions, every change, every item needing human attention, or the already-current no-op " +
        "answer. Read and surface the report; every rewrite is verified, a failure leaves the tree " +
        "untouched, and a re-run is a no-op.",
      Type.Object({
        dryRun: Type.Optional(Type.Boolean({ description: "Compute the report and write nothing" })),
      }),
      async (p, ctx) => {
        const root = findRoot(ctx.directory);
        const dryRun = p.dryRun === true;
        try {
          const report = migrate(new FsPort(root), { dryRun });
          return outcome(renderMigrationReport(report, dryRun), {
            from: report.from,
            to: report.to,
            noop: report.noop,
            dryRun,
            changes: report.changes.length,
            needsHuman: report.needsHuman.length,
          });
        } catch (e) {
          throw new Error(`migration failed: ${(e as Error).message}`);
        }
      },
    ),


    tw_request_tool: defStructured(
      "Ask the operator for access to one workflow tool the open phase does not disclose. The request is " +
        "put to the operator as an interactive confirmation naming the tool and your reason. Approval adds " +
        "the tool to this session and it stays available until the next tw_close, which revokes it. Only this " +
        "package's tw_* tools can be requested. Refused with the legal next call when no phase is open, when " +
        "the tool is unknown or already active, when granting it would make another skill look open, and when " +
        "the session has no interactive UI to ask. The outcome is recorded as workflow feedback.",
      Type.Object({
        tool: Type.String({ description: "The workflow tool to request, for example tw_add_ticket" }),
        reason: Type.String({ description: "One sentence on why this phase needs it, shown to the operator" }),
      }),
      async (p, ctx) => {
        const requested = typeof p.tool === "string" ? p.tool.trim() : "";
        const reason = typeof p.reason === "string" ? p.reason.trim() : "";
        const open = [...currentOpenSkills(ctx)].sort();
        const named = requested === "" ? "a tool" : requested;

        if (open.length === 0) {
          return outcome(
            `Refused: no workflow skill is open, so there is no phase to grant ${named} to. ` +
              `Legal next: open a phase with tw_open.`,
            { granted: false, reason: "no open skill", open: [], legal_next: ["tw_open"] },
          );
        }
        if (!workflowToolNames().has(requested)) {
          return outcome(
            `Refused: '${requested}' is not a tool this package registers, so it cannot be granted here. ` +
              `Request one of its tw_* tools instead.`,
            { granted: false, reason: "unknown tool", open, legal_next: ["tw_next"] },
          );
        }
        if ([...ALWAYS_DECLARED, CLOSER].includes(requested)) {
          return outcome(
            `Refused: ${requested} is declared in every state already, so it needs no grant.`,
            { granted: false, reason: "already declared", open },
          );
        }
        const activeSet = requireActiveSet(ctx);
        const active = activeSet.get();
        if (active.includes(requested)) {
          return outcome(`Refused: ${requested} is already active. Legal next: use it.`, {
            granted: false,
            reason: "already active",
            open,
            active,
          });
        }

        const phase = open.join(" and ");
        const asked = reason === "" ? "No reason given." : reason;

        // The open set is derived from whole toolsets, so a grant that completes
        // another skill's toolset would make that skill look open without an
        // opener. Refuse it and name the skill to open instead.
        const wouldOpen = [...openSkillsIn([...active, requested])].filter((name) => !open.includes(name));
        if (wouldOpen.length > 0) {
          const note = await recordRequestFeedback(ctx, {
            skill: open,
            tool: requested,
            decision: "blocked",
            reason,
            consequence: wouldOpen,
          });
          return outcome(
            `Refused: granting ${requested} to ${phase} would also make ${wouldOpen.join(" and ")} look open, ` +
              `because the opener derives the open set from whole toolsets. Legal next: open ${wouldOpen[0]} ` +
              `when it is the phase you need, or ask for a different tool.${note}`,
            { granted: false, reason: "would open another skill", open, consequence: wouldOpen },
          );
        }

        if (ctx.hasUI !== true || !ctx.confirm) {
          const note = await recordRequestFeedback(ctx, {
            skill: open,
            tool: requested,
            decision: "unavailable",
            reason,
          });
          return outcome(
            `Refused: ${phase} asked for ${requested}, but this session has no interactive UI to approve it, ` +
              `so the tool set is unchanged. Ask again from an interactive session.${note}`,
            { granted: false, reason: "no interactive UI", open },
          );
        }

        const approved = await ctx.confirm(
          `Allow ${requested}?`,
          `${phase} asked for ${requested}.\n\n${asked}\n\n` +
            `Approving adds it to this session until the next tw_close. Denying leaves the tool set unchanged.`,
        );
        if (!approved) {
          const note = await recordRequestFeedback(ctx, {
            skill: open,
            tool: requested,
            decision: "denied",
            reason,
          });
          return outcome(
            `Refused: the operator denied ${requested} for ${phase}. The tool set is unchanged.${note}`,
            { granted: false, reason: "operator denied", open },
          );
        }

        const next = [...active, requested];
        activeSet.set(next);
        const note = await recordRequestFeedback(ctx, {
          skill: open,
          tool: requested,
          decision: "granted",
          reason,
        });
        return outcome(
          `Granted ${requested} for ${phase}. It stays available until the next tw_close.${note}`,
          { granted: true, tool: requested, open, active: next },
        );
      },
      { activeByDefault: true },
    ),
  };
}
