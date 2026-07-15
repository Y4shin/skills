/**
 * Pi extension for the task-workflow.
 *
 * Registers task_* tools for artifact operations on the docs/tasks/ planning tree,
 * plus a /init-task-workflow command.
 *
 * Renamed from prd_*:
 *   prd_show → task_show, prd_get → task_get, etc.
 * Dropped:
 *   prd_forge, prd_epic_prd_issue, prd_epic_set_prd_issue
 *
 * The tools call core functions directly. The agent uses them when following the
 * SKILL.md workflow instructions.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import {
	type Artifact,
	discoverAll,
	discoverArchivedEpics,
	discoverEpics,
	discoverTasks,
	findRoot,
	isInitialized,
	taskRoot,
	resolveArtifact,
} from "../core/model.js";
import { profileText } from "../core/index.js";
import * as state from "../core/state.js";
import { readNtfyConfig, sendNtfyNotification } from "./ntfy.js";
import { existsSync, readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// ─── helpers ────────────────────────────────────────────────────────────────────

function artToRecord(a: Artifact): Record<string, unknown> {
	const data: Record<string, unknown> = {
		path: a.path,
		kind: a.kind,
		slug: a.slug,
		status: a.status,
	};
	return data;
}

function getRoot(cwd: string): string {
	try {
		return findRoot(cwd);
	} catch {
		return cwd;
	}
}

function formatArtifact(a: Artifact): string {
	return Object.entries(a.doc.data)
		.map(([k, v]) => {
			if (Array.isArray(v)) return `${k}: ${JSON.stringify(v)}`;
			return `${k}: ${String(v)}`;
		})
		.join("\n");
}

// ─── tool definitions (exported for testing) ─────────────────────────────────────

export interface ToolDef {
	description: string;
	args: Record<string, unknown>;
	execute(
		args: Record<string, any>,
		ctx: { directory: string },
	): Promise<string>;
}

function def(
	description: string,
	args: Record<string, unknown>,
	exec: (args: any, ctx: any) => Promise<string>,
): ToolDef {
	return { description, args, execute: exec };
}

const Str = (d: string) => ({ type: "string" as const, description: d });
const OptBool = { type: "boolean" as const, optional: true as const };

export function createTools(): Record<string, ToolDef> {
	return {
		task_show: def(
			"Show artifact frontmatter (epic, task, or slice), resolved by slug or path.",
			{ selector: Str("Slug or path"), json: OptBool },
			async (p, ctx) => {
				const a = resolveArtifact(getRoot(ctx.directory), p.selector);
				return p.json
					? JSON.stringify(artToRecord(a), null, 2)
					: formatArtifact(a);
			},
		),

		task_get: def(
			"Print a single frontmatter field of an artifact.",
			{ selector: Str("Slug or path"), field: Str("Field name") },
			async (p, ctx) => {
				const a = resolveArtifact(getRoot(ctx.directory), p.selector);
				return a.doc.data[p.field] === undefined
					? ""
					: String(a.doc.data[p.field]);
			},
		),

		task_set: def(
			"Set a scalar frontmatter field (auto-typed: int, bool, null, string).",
			{
				selector: Str("Slug or path"),
				field: Str("Field name"),
				value: Str("New value"),
			},
			async (p, ctx) => {
				const a = resolveArtifact(getRoot(ctx.directory), p.selector);
				let v: unknown = p.value;
				const lc = p.value.toLowerCase();
				if (lc === "true") v = true;
				else if (lc === "false") v = false;
				else if (lc === "null") v = null;
				else if (/^-?\d+$/.test(p.value)) v = parseInt(p.value, 10);
				else if (/^-?\d+\.\d+$/.test(p.value)) v = parseFloat(p.value);
				a.doc.data[p.field] = v;
				a.doc.save();
				return `${p.field} = ${p.value}`;
			},
		),

		task_set_slices: def(
			"Set a task's `slices:` list to the given slice slugs.",
			{
				selector: Str("Task slug or path"),
				slugs: { type: "array" as const, items: Str("Slice slug") },
			},
			async (p, ctx) => {
				const a = resolveArtifact(getRoot(ctx.directory), p.selector, "task");
				a.doc.data["slices"] = p.slugs as string[];
				a.doc.save();
				return `slices: [${(a.doc.data["slices"] as string[]).join(", ")}]`;
			},
		),

		task_resolve: def(
			"Resolve a slug or path to the artifact's file path.",
			{
				selector: Str("Slug or path"),
				kind: {
					type: "string" as const,
					optional: true,
					enum: ["epic", "task", "slice"],
				},
			},
			async (p, ctx) =>
				resolveArtifact(getRoot(ctx.directory), p.selector, p.kind).path,
		),

		task_assert_kind: def(
			"Assert an artifact's `kind` (epic/task/slice). Fails with a useful message if it differs.",
			{
				selector: Str("Slug or path"),
				kind: { type: "string" as const, enum: ["epic", "task", "slice"] },
			},
			async (p, ctx) => {
				const a = resolveArtifact(getRoot(ctx.directory), p.selector);
				if (a.kind !== p.kind)
					throw new Error(
						`'${p.selector}' has kind '${a.kind}', not '${p.kind}'.`,
					);
				return `kind: ${p.kind} — OK`;
			},
		),

		task_list: def(
			"List artifacts in the docs/tasks tree, with optional filters. Excludes archived artifacts by default.",
			{
				kind: {
					type: "string" as const,
					optional: true,
					enum: ["epic", "task"],
				},
				status: { ...Str("Status filter"), optional: true },
				epic: { ...Str("Epic slug filter"), optional: true },
				json: OptBool,
			},
			async (p, ctx) => {
				const root = getRoot(ctx.directory);
				let arts =
					p.kind === "epic"
						? discoverEpics(root)
						: p.kind === "task"
							? discoverTasks(root)
							: discoverAll(root);
				if (p.status)
					arts = arts.filter((a: Artifact) => a.status === p.status);
				if (p.epic)
					arts = arts.filter((a: Artifact) => a.doc.data["epic"] === p.epic);
				if (p.json) return JSON.stringify(arts.map(artToRecord), null, 2);
				return (
					arts
						.map(
							(a: Artifact) =>
								`${a.slug} (${a.kind})${a.status ? ` [${a.status}]` : ""}`,
						)
						.join("\n") || "(empty)"
				);
			},
		),

		task_slices: def(
			"List a task's active slice docs (excludes archived).",
			{ selector: Str("Task slug or path"), json: OptBool },
			async (p, ctx) => {
				const a = resolveArtifact(getRoot(ctx.directory), p.selector, "task");
				const slices = a.activeSliceFiles();
				if (p.json) return JSON.stringify(slices, null, 2);
				return slices.length === 0
					? "(no open slices)"
					: slices.map((s) => `${s.number} — ${s.slug}`).join("\n");
			},
		),

		task_finalizable: def(
			"Check a task is ready to finalize (no active slice docs). Fails listing open slices otherwise.",
			{ selector: Str("Task slug or path") },
			async (p, ctx) => {
				const a = resolveArtifact(getRoot(ctx.directory), p.selector, "task");
				const slices = a.activeSliceFiles();
				if (slices.length === 0) return "ready to finalize";
				throw new Error(
					`task '${a.slug}' has ${slices.length} open slice(s): ${slices.map((s) => `${s.number}`).join(", ")}`,
				);
			},
		),

		task_lint: def(
			"Show frontmatter violations across the docs/tasks tree.",
			{
				selector: { ...Str("Optional path; omit to scan all"), optional: true },
				json: OptBool,
			},
			async (p, ctx) => {
				const root = getRoot(ctx.directory);
				if (!existsSync(taskRoot(root))) return "(no docs/tasks directory)";
				const violations: string[] = [];
				for (const a of discoverAll(root)) {
					for (const f of ["kind", "title", "slug", "status"]) {
						if (a.doc.data[f] === undefined || a.doc.data[f] === null)
							violations.push(`${a.path}: missing '${f}'`);
					}
				}
				// Also scan archived
				for (const a of [...discoverArchivedEpics(root)]) {
					for (const f of ["kind", "title", "slug", "status"]) {
						if (a.doc.data[f] === undefined || a.doc.data[f] === null)
							violations.push(`${a.path} (archived): missing '${f}'`);
					}
				}
				return violations.length
					? p.json
						? JSON.stringify(violations, null, 2)
						: violations.join("\n")
					: "(no violations)";
			},
		),

		task_epic_tasks: def(
			"List an epic's planned child tasks with their done state.",
			{ selector: Str("Epic slug or path"), json: OptBool },
			async (p, ctx) => {
				const a = resolveArtifact(getRoot(ctx.directory), p.selector, "epic");
				const tasks = a.doc.data["tasks"];
				if (!Array.isArray(tasks)) return "(no child tasks planned yet)";
				return tasks
					.map(
						(t: any) =>
							`${t.slug}${t.done ? " ✓" : ""}${t.blocked_by?.length ? ` blocked_by: ${t.blocked_by.join(", ")}` : ""}`,
					)
					.join("\n");
			},
		),

		task_epic_tick: def(
			"Mark an epic's child task as finalized (done: true).",
			{ selector: Str("Epic slug or path"), task_slug: Str("Child task slug") },
			async (p, ctx) => {
				const a = resolveArtifact(getRoot(ctx.directory), p.selector, "epic");
				const tasks = Array.isArray(a.doc.data["tasks"])
					? [...a.doc.data["tasks"]]
					: [];
				for (const c of tasks) {
					if ((c as any).slug === p.task_slug) {
						(c as any).done = true;
						a.doc.data["tasks"] = tasks;
						a.doc.save();
						return `${p.task_slug} → done`;
					}
				}
				throw new Error(`no task '${p.task_slug}' in epic '${a.slug}'`);
			},
		),

		task_epic_finalizable: def(
			"Check every child task of an epic is finalized. Fails with list of unfinished children.",
			{ selector: Str("Epic slug or path") },
			async (p, ctx) => {
				const a = resolveArtifact(getRoot(ctx.directory), p.selector, "epic");
				const tasks = Array.isArray(a.doc.data["tasks"])
					? a.doc.data["tasks"]
					: [];
				const undone = tasks
					.filter((t: any) => !t.done)
					.map((t: any) => t.slug || "?");
				if (undone.length === 0) return "ready to finalize — all children done";
				throw new Error(`unfinished children: ${undone.join(", ")}`);
			},
		),

		task_state: def(
			"Show the current workflow state from docs/tasks/state.yaml.",
			{},
			async (_p, ctx) => {
				const root = getRoot(ctx.directory);
				const s = state.load(root);
				return [
					`active task:  ${s.active.task ?? "(none)"}`,
					`active slice: ${s.active.slice ?? "(none)"}`,
					`active epic:  ${s.active.epic ?? "(none)"}`,
					`last action:  ${s.last_action}`,
					`next action:  ${s.next_action}`,
				].join("\n");
			},
		),

		task_state_set: def(
			"Set a workflow state field. Fields: active.task, active.slice, active.epic, last_action, next_action.",
			{
				field: Str("Field path (e.g. 'active.task' or 'next_action')"),
				value: Str("New value (use 'null' to clear)"),
			},
			async (p, ctx) => {
				const root = getRoot(ctx.directory);
				const s = state.load(root);
				const v = p.value === "null" ? null : p.value;
				if (p.field === "active.task") s.active.task = v;
				else if (p.field === "active.slice") s.active.slice = v;
				else if (p.field === "active.epic") s.active.epic = v;
				else if (p.field === "last_action") s.last_action = v ?? "";
				else if (p.field === "next_action") s.next_action = v ?? "";
				else throw new Error(`unknown field '${p.field}'`);
				state.save(root, s);
				return `${p.field} = ${v ?? "null"}`;
			},
		),

		task_reference: def(
			"Print the task-workflow artifact schema reference.",
			{},
			async (_p, ctx) => {
				const p = join(getRoot(ctx.directory), "docs", "artifacts.md");
				return existsSync(p)
					? readFileSync(p, "utf-8")
					: "(reference not found)";
			},
		),

		task_profile: def(
			"Print the project's docs/tasks/profile.md (optional project-specific context).",
			{},
			async (_p, ctx) => profileText(getRoot(ctx.directory)) || "(no profile)",
		),

		task_workflow_gate: def(
			"Check if the task-workflow is initialized (docs/tasks/ exists). Returns empty string if ready.",
			{},
			async (_p, ctx) => {
				if (isInitialized(getRoot(ctx.directory))) return "";
				return "> [!STOP] task-workflow not initialized.\n> Run `/skill:onboard-workflow` first.";
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
					? Type.Union(
							(vv.enum as string[]).map((e: string) => Type.Literal(e)),
						)
					: Type.String({ description: vv.description ?? "" });
			} else if (vv.type === "boolean") {
				params[k] = Type.Boolean({ description: vv.description ?? "" });
			} else if (vv.type === "array") {
				params[k] = Type.Array(
					Type.String({ description: vv.items?.description ?? "" }),
				);
			}
			if (vv.optional && params[k]) {
				params[k] = Type.Optional(params[k]);
			}
		}

		pi.registerTool({
			name,
			label: name
				.replace(/^task_/, "")
				.replace(/_/g, " ")
				.replace(/\b\w/g, (c) => c.toUpperCase()),
			description: def.description,
			parameters: Type.Object(params),
			async execute(_id: string, args: any, _sig: any, _upd: any, ctx: any) {
				const result = await def.execute(args, { directory: ctx.cwd });
				return { content: [{ type: "text", text: result }], details: {} };
			},
		});
	}

	pi.registerCommand("init-task-workflow", {
		description:
			"Initialize the task-workflow by creating the docs/tasks/ directory.",
		handler: async (_args, ctx) => {
			const root = getRoot(ctx.cwd);
			if (isInitialized(root)) {
				ctx.ui.notify("Already initialized", "info");
				return;
			}
			mkdirSync(taskRoot(root), { recursive: true });
			ctx.ui.notify(`Created ${taskRoot(root)}`, "info");
		},
	});

	// ── notify_user tool ────────────────────────────────────────────────
	// Reads @pi-unipi/notify ntfy config and sends phone notifications.
	// Available to agents in chains via inheritProjectContext.

	pi.registerTool({
		name: "notify_user",
		label: "Notify User",
		description:
			"Send a notification to the user's configured native/ntfy platforms. " +
			"Use for critical errors or when the user explicitly asked to be notified.",
		parameters: Type.Object({
			title: Type.Optional(Type.String({ description: "Notification title" })),
			message: Type.String({ description: "Notification message body" }),
			priority: Type.Optional(
				Type.Union([
					Type.Literal("low"),
					Type.Literal("normal"),
					Type.Literal("high"),
				]),
			),
		}),
		async execute(
			_toolCallId: string,
			params: { title?: string; message: string; priority?: string },
		) {
			const cfg = readNtfyConfig();
			if (!cfg) {
				return {
					content: [
						{
							type: "text",
							text: "No ntfy config found at ~/.unipi/config/notify/config.json.",
						},
					],
					details: { sent: false },
				};
			}

			const priorityMap: Record<string, number> = {
				low: 2,
				normal: 3,
				high: 5,
			};
			const ntfyPriority = params.priority
				? (priorityMap[params.priority] ?? 3)
				: 3;

			const sent = await fetch(
				`${cfg.serverUrl.replace(/\/+$/, "")}/${cfg.topic}`,
				{
					method: "POST",
					headers: {
						"Content-Type": "text/plain",
						...(cfg.token ? { Authorization: `Bearer ${cfg.token}` } : {}),
						...(params.title ? { Title: params.title } : {}),
						Priority: String(ntfyPriority),
					},
					body: params.message,
				},
			).then((r) => r.ok);

			return {
				content: [
					{
						type: "text",
						text: sent
							? `Notification sent to ${cfg.serverUrl}/${cfg.topic}`
							: "Failed to send notification.",
					},
				],
				details: { sent },
			};
		},
	});

	// ── pi-subagents lifecycle hooks ────────────────────────────────────
	// Auto-fire ntfy notifications when pi-subagents events need attention.

	pi.on("message_end", async (event, _ctx) => {
		const msg = event.message as unknown as Record<string, unknown>;

		// Supervisor request: subagent called contact_supervisor
		if (
			msg.type === "custom" &&
			msg.customType === "subagent_supervisor_request"
		) {
			const details = msg.details as Record<string, unknown> | undefined;
			const agent = (details?.agent as string) ?? "unknown";
			const text =
				typeof msg.content === "string"
					? msg.content.slice(0, 200)
					: "Subagent needs your attention.";

			await sendNtfyNotification({
				title: `🤖 ${agent} needs attention`,
				message: text,
				tags: ["bell", "rotating_light"],
				priority: 4,
			});
			return;
		}

		// Subagent notify: async completion/failure
		if (msg.type === "custom" && msg.customType === "subagent-notify") {
			const details = msg.details as Record<string, unknown> | undefined;
			const agent = (details?.agent as string) ?? "unknown";
			const status = (details?.status as string) ?? "unknown";

			if (status === "failed" || status === "paused") {
				await sendNtfyNotification({
					title: `❌ ${agent} ${status}`,
					message:
						typeof msg.content === "string"
							? msg.content.slice(0, 300)
							: `${agent} ${status}.`,
					tags: ["x", "warning"],
					priority: 5,
				});
			}
			return;
		}

		// Control notice: needs_attention signal
		if (msg.type === "custom" && msg.customType === "subagent_control_notice") {
			const details = msg.details as Record<string, unknown> | undefined;
			const agent = (details?.agent as string) ?? "unknown";
			const reason = (details?.reason as string) ?? "unknown";

			await sendNtfyNotification({
				title: `⚠️ ${agent} needs attention`,
				message: `Reason: ${reason}\n${typeof msg.content === "string" ? msg.content.slice(0, 200) : ""}`,
				tags: ["warning", "rotating_light"],
				priority: 4,
			});
			return;
		}
	});
}
