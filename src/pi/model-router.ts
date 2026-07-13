/**
 * Model-router extension for the task-workflow.
 *
 * Lets skills and prompt templates declare a preferred model in their
 * frontmatter. When such a skill/command is invoked (`/skill:name` or
 * `/template`), this extension automatically switches the active model for the
 * duration of that work — the agent does NOT need to call a tool to trigger it.
 *
 * Frontmatter (SKILL.md / template `.md`):
 *
 *   ---
 *   name: heavy-refactor
 *   description: ...
 *   models:                                 # ordered preference list
 *     - anthropic/claude-opus-4-5:high      # provider/id or bare pattern, optional :thinking
 *     - openai/gpt-5.2-codex
 *     - sonnet
 *   ---
 *
 * The first candidate that resolves to a model actually available on the system
 * (has auth) is used. A single scalar `model:` (or `pi-model`) is also accepted
 * for backwards compatibility. If a skill/command declares no model at all,
 * nothing happens — no switch, no context injection. If it declares models but
 * NONE are available, the current model is kept and a single warning is shown.
 *
 * When a switch happens the extension:
 *   1. Snapshots the current model + thinking level and pushes a frame with an
 *      ascending numeric injection id onto a LIFO stack.
 *   2. Switches to the requested model (and thinking level, if given).
 *   3. Injects a short instruction telling the agent to call `reset_model(id)`
 *      once it has finished the skill/command's work.
 *
 * The `reset_model(id)` tool restores the snapshotted model/thinking. The id
 * must match the top of the stack, so improper nesting (resetting an outer
 * injection before an inner one) is rejected with a clear error.
 *
 * The pure helpers and the ModelRouterStack are exported for unit testing.
 */

import type {
	ExtensionAPI,
	ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { existsSync } from "node:fs";

import { parse as parseFrontmatter } from "../core/frontmatter.js";

// ─── Types & constants ───────────────────────────────────────────────────────

export const THINKING_LEVELS = [
	"off",
	"minimal",
	"low",
	"medium",
	"high",
	"xhigh",
] as const;

export type ThinkingLevel = (typeof THINKING_LEVELS)[number];

/** Minimal shape of a model needed for pattern matching. */
export interface ModelLike {
	provider: string;
	id: string;
	name: string;
}

export interface ModelSpec {
	pattern: string;
	thinkingLevel?: ThinkingLevel;
}

// ─── Pure helpers ──────────────────────────────────────────────────────────────

/**
 * Extract the leading slash-command token from raw input text.
 * "  /skill:foo do it" → "skill:foo"; "/review" → "review"; "hi" → undefined.
 */
export function firstCommandToken(text: string): string | undefined {
	const t = text.replace(/^\s+/, "");
	if (!t.startsWith("/")) return undefined;
	const m = t.slice(1).match(/^\S+/);
	return m ? m[0] : undefined;
}

/**
 * Read the ordered list of preferred-model specs from frontmatter data.
 * Merges `models` (array) with scalar/array `model`/`pi-model`/`pi_model`,
 * in that order, de-duplicating while preserving order. Non-string entries are
 * ignored. Returns [] when no preference is declared.
 */
export function readModelSpecs(data: Record<string, unknown>): string[] {
	const out: string[] = [];
	const add = (v: unknown): void => {
		if (typeof v === "string") {
			const t = v.trim();
			if (t && !out.includes(t)) out.push(t);
		} else if (Array.isArray(v)) {
			for (const item of v) add(item);
		}
	};
	add(data.models);
	add(data.model);
	add(data["pi-model"]);
	add(data.pi_model);
	return out;
}

/**
 * Split a spec like "anthropic/claude-opus-4-5:high" into a model pattern and
 * an optional thinking level. Only strips a trailing ":level" when the suffix
 * is a recognised thinking level, so model ids containing colons are preserved.
 */
export function parseModelSpec(spec: string): ModelSpec {
	const s = spec.trim();
	const idx = s.lastIndexOf(":");
	if (idx > 0) {
		const suffix = s.slice(idx + 1).toLowerCase();
		if ((THINKING_LEVELS as readonly string[]).includes(suffix)) {
			return {
				pattern: s.slice(0, idx).trim(),
				thinkingLevel: suffix as ThinkingLevel,
			};
		}
	}
	return { pattern: s };
}

function isDated(id: string): boolean {
	return /-\d{6,8}$/.test(id) || /\d{4}-\d{2}-\d{2}/.test(id);
}

function pickBest<T extends ModelLike>(cands: readonly T[], p: string): T {
	return [...cands].sort((a, b) => {
		// Exact id match wins.
		const ax = a.id.toLowerCase() === p ? 0 : 1;
		const bx = b.id.toLowerCase() === p ? 0 : 1;
		if (ax !== bx) return ax - bx;
		// Prefer aliases over dated snapshots.
		const ad = isDated(a.id) ? 1 : 0;
		const bd = isDated(b.id) ? 1 : 0;
		if (ad !== bd) return ad - bd;
		// Otherwise prefer the shorter id (usually the canonical alias).
		return a.id.length - b.id.length;
	})[0];
}

/**
 * Resolve a model pattern against a list of models. Supports "provider/id",
 * bare exact id, exact name, or a case-insensitive substring of id/name.
 * Returns the best match, or undefined when nothing matches.
 */
export function resolveModel<T extends ModelLike>(
	pattern: string,
	models: readonly T[],
): T | undefined {
	const p = pattern.trim();
	if (!p) return undefined;
	const lower = p.toLowerCase();

	const slash = p.indexOf("/");
	if (slash > 0) {
		const prov = p.slice(0, slash).toLowerCase();
		const rest = p.slice(slash + 1).toLowerCase();
		const exact = models.find(
			(m) => m.provider.toLowerCase() === prov && m.id.toLowerCase() === rest,
		);
		if (exact) return exact;
		const partial = models.filter(
			(m) =>
				m.provider.toLowerCase() === prov &&
				(m.id.toLowerCase().includes(rest) ||
					m.name.toLowerCase().includes(rest)),
		);
		if (partial.length) return pickBest(partial, rest);
	}

	const byId = models.filter((m) => m.id.toLowerCase() === lower);
	if (byId.length) return pickBest(byId, lower);

	const byName = models.filter((m) => m.name.toLowerCase() === lower);
	if (byName.length) return pickBest(byName, lower);

	const sub = models.filter(
		(m) =>
			m.id.toLowerCase().includes(lower) ||
			m.name.toLowerCase().includes(lower),
	);
	if (sub.length) return pickBest(sub, lower);

	return undefined;
}

export interface ModelSelection<T extends ModelLike> {
	model: T;
	thinkingLevel?: ThinkingLevel;
}

/**
 * Walk an ordered list of specs and return the first that resolves to a model
 * in `available` (paired with any thinking level parsed from the spec).
 * Returns undefined when none of the specs match an available model.
 */
export function selectModel<T extends ModelLike>(
	specs: readonly string[],
	available: readonly T[],
): ModelSelection<T> | undefined {
	for (const spec of specs) {
		const { pattern, thinkingLevel } = parseModelSpec(spec);
		const model = resolveModel(pattern, available);
		if (model) return { model, thinkingLevel };
	}
	return undefined;
}

// ─── Injection stack (LIFO, ascending ids) ───────────────────────────────────

export interface ModelFrame {
	/** Ascending, monotonic per session. */
	id: number;
	/** Skill/command that triggered the switch, e.g. "skill:heavy-refactor". */
	label: string;
	/** Model + thinking to restore on reset. */
	restoreProvider: string;
	restoreId: string;
	restoreThinking: ThinkingLevel;
	/** Model switched to (for display/reminders). */
	switchedToProvider: string;
	switchedToId: string;
	switchedToThinking?: ThinkingLevel;
}

export type ResetResult =
	| { ok: true; frame: ModelFrame }
	| { ok: false; error: string; expectedId?: number };

/** Serialisable snapshot of a stack, persisted in the session. */
export interface StackSnapshot {
	counter: number;
	frames: ModelFrame[];
}

/** customType used for the persisted state entry. */
export const STATE_CUSTOM_TYPE = "model-router-state";

/**
 * A LIFO stack of active model switches. Each push gets a fresh ascending id;
 * reset only succeeds for the id currently on top, enforcing correct nesting.
 */
export class ModelRouterStack {
	private counter = 0;
	private frames: ModelFrame[] = [];

	push(frame: Omit<ModelFrame, "id">): ModelFrame {
		const f: ModelFrame = { ...frame, id: ++this.counter };
		this.frames.push(f);
		return f;
	}

	reset(id: number): ResetResult {
		if (this.frames.length === 0) {
			return {
				ok: false,
				error:
					`No model switch is currently active, so reset_model(${id}) has nothing to undo. ` +
					`Only call reset_model with an id you were given in a model-switch note.`,
			};
		}
		const top = this.frames.at(-1)!;
		if (top.id !== id) {
			return {
				ok: false,
				expectedId: top.id,
				error:
					`Out-of-order reset: reset_model(${id}) was refused. The most recent open ` +
					`model switch is #${top.id} ("${top.label}") and must be closed first — ` +
					`call reset_model(${top.id}) for "${top.label}" before #${id}.`,
			};
		}
		this.frames.pop();
		return { ok: true, frame: top };
	}

	/** Open frames, outermost first. */
	open(): ModelFrame[] {
		return [...this.frames];
	}

	get size(): number {
		return this.frames.length;
	}

	/** Capture the full state (id counter + open frames) for persistence. */
	snapshot(): StackSnapshot {
		return {
			counter: this.counter,
			frames: this.frames.map((f) => ({ ...f })),
		};
	}

	/** Replace state from a snapshot (used to rebuild after a reload/resume). */
	restore(snapshot: StackSnapshot): void {
		this.counter = snapshot.counter;
		this.frames = snapshot.frames.map((f) => ({ ...f }));
	}
}

/**
 * Validate untrusted (JSON-decoded) data into a StackSnapshot, or undefined if
 * it does not match the expected shape.
 */
export function parseSnapshot(data: unknown): StackSnapshot | undefined {
	if (!data || typeof data !== "object") return undefined;
	const d = data as { counter?: unknown; frames?: unknown };
	if (typeof d.counter !== "number" || !Array.isArray(d.frames))
		return undefined;

	const frames: ModelFrame[] = [];
	for (const raw of d.frames) {
		if (!raw || typeof raw !== "object") return undefined;
		const f = raw as Record<string, unknown>;
		if (
			typeof f.id !== "number" ||
			typeof f.label !== "string" ||
			typeof f.restoreProvider !== "string" ||
			typeof f.restoreId !== "string" ||
			typeof f.restoreThinking !== "string" ||
			typeof f.switchedToProvider !== "string" ||
			typeof f.switchedToId !== "string"
		) {
			return undefined;
		}
		frames.push({
			id: f.id,
			label: f.label,
			restoreProvider: f.restoreProvider,
			restoreId: f.restoreId,
			restoreThinking: f.restoreThinking as ThinkingLevel,
			switchedToProvider: f.switchedToProvider,
			switchedToId: f.switchedToId,
			switchedToThinking:
				typeof f.switchedToThinking === "string"
					? (f.switchedToThinking as ThinkingLevel)
					: undefined,
		});
	}
	return { counter: d.counter, frames };
}

/** Minimal session-entry shape needed to find the persisted snapshot. */
export interface StateEntryLike {
	type: string;
	customType?: string;
	data?: unknown;
}

/**
 * Find the most recent persisted stack snapshot in a list of session entries
 * (scan back-to-front). Returns undefined when none is present or valid.
 */
export function latestSnapshot(
	entries: readonly StateEntryLike[],
): StackSnapshot | undefined {
	for (let i = entries.length - 1; i >= 0; i--) {
		const e = entries[i];
		if (e.type === "custom" && e.customType === STATE_CUSTOM_TYPE) {
			return parseSnapshot(e.data);
		}
	}
	return undefined;
}

// ─── Message builders (pure) ─────────────────────────────────────────────────

export function buildSwitchNote(
	frame: ModelFrame,
	prevLabel: string,
	nextLabel: string,
): string {
	const thinking = frame.switchedToThinking
		? ` (thinking: ${frame.switchedToThinking})`
		: "";
	return (
		`[model-router] Invoking "${frame.label}" switched the active model from ` +
		`${prevLabel} to ${nextLabel}${thinking}. This is model-switch injection #${frame.id}.\n` +
		`When you have finished the work for "${frame.label}", call reset_model(${frame.id}) ` +
		`to restore the previous model. Switches are nested LIFO — always reset the most ` +
		`recent (highest) open id first.`
	);
}

export function buildStandingReminder(frames: readonly ModelFrame[]): string {
	const lines = ["## Active model switches (reset when done)"];
	for (const f of frames) {
		lines.push(
			`- #${f.id} "${f.label}": now on ${f.switchedToProvider}/${f.switchedToId}` +
				` → reset_model(${f.id}) restores ${f.restoreProvider}/${f.restoreId}` +
				` (thinking: ${f.restoreThinking})`,
		);
	}
	lines.push(
		`Reset the highest open id first (currently #${frames.at(-1)!.id}).`,
	);
	return lines.join("\n");
}

// ─── Extension entry point ───────────────────────────────────────────────────

interface Pending {
	frame: ModelFrame;
	prevLabel: string;
	nextLabel: string;
}

function modelLabel(m: { provider: string; id: string } | undefined): string {
	return m ? `${m.provider}/${m.id}` : "(none)";
}

export default function (pi: ExtensionAPI) {
	let stack = new ModelRouterStack();
	let pending: Pending | undefined;

	function updateStatus(ctx: ExtensionContext): void {
		const open = stack.open();
		ctx.ui.setStatus(
			"model-router",
			open.length ? `↻ model #${open.at(-1)!.id}` : undefined,
		);
	}

	// Persist the current stack (id counter + open frames) into the session so
	// it survives reloads/resumes. Written after every push and reset.
	function persist(): void {
		pi.appendEntry(STATE_CUSTOM_TYPE, stack.snapshot());
	}

	/**
	 * Resolve the preferred-model spec declared in the frontmatter of the
	 * skill/template addressed by a leading command token, or undefined when the
	 * token is not a skill/template or declares no model.
	 */
	function preferredModelSpecs(token: string): string[] {
		const cmd = pi
			.getCommands()
			.find(
				(c) =>
					c.name === token && (c.source === "skill" || c.source === "prompt"),
			);
		const path = cmd?.sourceInfo?.path;
		if (!path || !existsSync(path)) return [];
		try {
			return readModelSpecs(parseFrontmatter(path).data);
		} catch {
			return []; // no parseable frontmatter → nothing to do
		}
	}

	// Session-scoped state: start fresh, then rebuild from the last persisted
	// snapshot on the current branch (restores across reload/resume/fork).
	pi.on("session_start", async (_event, ctx) => {
		stack = new ModelRouterStack();
		pending = undefined;
		const snapshot = latestSnapshot(ctx.sessionManager.getBranch());
		if (snapshot) stack.restore(snapshot);
		updateStatus(ctx);
	});

	// Detect skill/template invocations before they are expanded, and switch.
	pi.on("input", async (event, ctx) => {
		if (event.source === "extension") return; // ignore our own injected messages

		const token = firstCommandToken(event.text);
		if (!token) return;

		const specs = preferredModelSpecs(token);
		if (specs.length === 0) return; // not a skill/template, or no preferred model

		const label = token;

		// Use the first declared model that is actually available on this system.
		const selection = selectModel(specs, ctx.modelRegistry.getAvailable());
		if (!selection) {
			// Fall back to the current model — this is the only case that warns.
			ctx.ui.notify(
				`model-router: none of the preferred models for ${label} are available ` +
					`[${specs.join(", ")}]; staying on ${modelLabel(ctx.model)}`,
				"warning",
			);
			return;
		}
		const target = selection.model;
		const thinkingLevel = selection.thinkingLevel;

		const current = ctx.model;
		const prevThinking = pi.getThinkingLevel() as ThinkingLevel;
		const sameModel =
			current !== undefined &&
			current.provider === target.provider &&
			current.id === target.id;
		const sameThinking = !thinkingLevel || thinkingLevel === prevThinking;
		if (sameModel && sameThinking) return; // already there — nothing to switch or reset

		const ok = await pi.setModel(target);
		if (!ok) {
			ctx.ui.notify(
				`model-router: failed to switch to ${modelLabel(target)} (${label})`,
				"warning",
			);
			return;
		}
		if (thinkingLevel) pi.setThinkingLevel(thinkingLevel);

		const frame = stack.push({
			label,
			restoreProvider: current?.provider ?? target.provider,
			restoreId: current?.id ?? target.id,
			restoreThinking: prevThinking,
			switchedToProvider: target.provider,
			switchedToId: target.id,
			switchedToThinking: thinkingLevel,
		});

		pending = {
			frame,
			prevLabel: modelLabel(current),
			nextLabel: modelLabel(target),
		};
		persist();
		updateStatus(ctx);
	});

	// Inject the switch note (once) and a standing reminder (while any frame open).
	pi.on("before_agent_start", async (event, _ctx) => {
		let note: string | undefined;
		if (pending) {
			note = buildSwitchNote(
				pending.frame,
				pending.prevLabel,
				pending.nextLabel,
			);
			pending = undefined;
		}

		const open = stack.open();
		let systemPrompt = event.systemPrompt;
		if (open.length) {
			systemPrompt = `${systemPrompt}\n\n${buildStandingReminder(open)}`;
		}

		if (note) {
			return {
				systemPrompt,
				message: {
					customType: "model-router",
					content: note,
					display: true,
				},
			};
		}
		if (open.length) return { systemPrompt };
	});

	// Tool the agent calls to restore the previous model when a skill finishes.
	pi.registerTool({
		name: "reset_model",
		label: "Reset Model",
		description:
			"Restore the model and thinking level that were active before a skill/command " +
			"switched them. Pass the numeric injection id from the model-switch note. " +
			"Switches are nested LIFO: the most recent (highest) open id must be reset first.",
		promptSnippet:
			"restore the previously active model after a skill/command that switched it finishes",
		promptGuidelines: [
			"Call reset_model with the injection id from a model-switch note once you finish the work that skill/command switched the model for. Reset the most recent (highest) open id first.",
		],
		parameters: Type.Object({
			id: Type.Integer({
				description:
					"The model-switch injection id to reset (from the [model-router] note).",
			}),
		}),
		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const res = stack.reset(params.id);
			if (!res.ok) throw new Error(res.error);

			const frame = res.frame;
			// The frame is popped; persist immediately so the stored snapshot
			// matches in-memory state even if the model restore below fails.
			persist();
			const model = ctx.modelRegistry.find(
				frame.restoreProvider,
				frame.restoreId,
			);
			if (model) {
				const ok = await pi.setModel(model);
				if (!ok) {
					throw new Error(
						`Closed injection #${frame.id}, but could not restore ` +
							`${frame.restoreProvider}/${frame.restoreId}: no API key available.`,
					);
				}
			}
			pi.setThinkingLevel(frame.restoreThinking);
			updateStatus(ctx);

			const open = stack.open();
			const tail = open.length
				? ` Still open: ${open.map((o) => `#${o.id}`).join(", ")}.`
				: "";
			return {
				content: [
					{
						type: "text",
						text:
							`Restored model to ${frame.restoreProvider}/${frame.restoreId} ` +
							`(thinking: ${frame.restoreThinking}). Closed model-switch injection ` +
							`#${frame.id}.${tail}`,
					},
				],
				details: {
					closedId: frame.id,
					restored: `${frame.restoreProvider}/${frame.restoreId}`,
					openIds: open.map((o) => o.id),
				},
			};
		},
	});
}
