/**
 * ObservMe subagent-bridge extension.
 *
 * Hooks into the pi-subagents `subagent` tool via the `tool_call` lifecycle
 * event (which fires BEFORE the tool executes, same event-loop tick) and
 * injects ObservMe propagation environment variables into `process.env`.
 *
 * The subagent tool handler reads `process.env` at spawn time
 * (`{ ...process.env, ... }`), so the ObservMe variables are picked up by
 * every child Pi process without modifying pi-subagents source.
 *
 * The ObservMe integration API is resolved eagerly at factory time (via
 * dynamic import) so it's available synchronously when tool calls arrive.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// ─── Type alias for the ObservMe API (no hard import) ───────────────────────

interface ObservMeStartedSubagent {
	ok: true;
	spawnId: string;
	childAgentId: string;
	env: Record<string, string | undefined>;
	traceContextPropagated: boolean;
}

interface ObservMeApi {
	startSubagent(options?: {
		spawnId?: string;
		childAgentId?: string;
		command?: string;
		args?: readonly string[];
		spawnType?: string;
		spawnReason?: string;
		toolCallId?: string;
		env?: Record<string, string | undefined>;
	}): ObservMeStartedSubagent | { ok: false; reason: string };
	completeSubagent(
		spawnId: string,
		options?: { childAgentId?: string; childStatus?: string; outcome?: string },
	): { ok: true } | { ok: false; reason: string };
	failSubagent(spawnId: string, options?: { childAgentId?: string; errorClass?: string }): { ok: true } | { ok: false; reason: string };
}

// ─── ObservMe env vars we inject and clean up ──────────────────────────────

const OBSERVME_ENV_KEYS: readonly string[] = [
	"OBSERVME_WORKFLOW_ID",
	"OBSERVME_PARENT_AGENT_ID",
	"OBSERVME_ROOT_AGENT_ID",
	"OBSERVME_PARENT_SESSION_ID",
	"OBSERVME_PARENT_TRACE_ID",
	"OBSERVME_PARENT_SPAN_ID",
	"OBSERVME_AGENT_DEPTH",
	"OBSERVME_SPAWN_ID",
	"OBSERVME_AGENT_CAPABILITY",
	"traceparent",
	"tracestate",
];

// These are set by pi-subagents and identify a child subagent spawn.
// They also tell ObservMe what capability/role the child has.
const PI_SUBAGENT_ENV_PREFIX = "PI_SUBAGENT_";

// ─── Active spawn registry ─────────────────────────────────────────────────

interface SpawnRecord {
	spawnId: string;
	childAgentId: string;
	envKeys: string[]; // which keys we injected, for cleanup
}

const activeSpawns = new Map<string, SpawnRecord>();

// ─── Eagerly resolve ObservMe API at factory time ─────────────────────────

/**
 * The ObservMe integration API is resolved once at factory time via dynamic
 * import. This is safe because:
 * 1. Extensions load at Pi startup (seconds before any tool call)
 * 2. The dynamic import resolves from local file cache (milliseconds)
 * 3. If ObservMe isn't installed, the import fails silently
 */
let observmeApi: ObservMeApi | undefined;
let apiReady: Promise<void>;

async function resolveApi(pi: ExtensionAPI): Promise<void> {
	try {
		const mod: { requestObservMeIntegration: (host: unknown) => unknown } = await import("@senad-d/observme/integration");
		const raw = mod.requestObservMeIntegration(pi);
		if (raw && typeof raw === "object" && "startSubagent" in raw) {
			observmeApi = raw as ObservMeApi;
		}
	} catch {
		// ObservMe not installed — fail open
	}
}

// ─── Env injection helpers ──────────────────────────────────────────────────

function getObservmeEnvKeys(env: Record<string, string | undefined>): string[] {
	return Object.keys(env).filter((k) => OBSERVME_ENV_KEYS.includes(k));
}

function injectEnv(env: Record<string, string | undefined>): string[] {
	const injected: string[] = [];
	for (const [key, value] of Object.entries(env)) {
		if (value !== undefined && !(key in process.env)) {
			(process.env as Record<string, string>)[key] = value;
			injected.push(key);
		}
	}
	return injected;
}

function removeInjectedEnv(keys: string[]): void {
	for (const key of keys) {
		delete process.env[key];
	}
}

// ─── Extension factory ──────────────────────────────────────────────────────

export default function (pi: ExtensionAPI): void {
	// Start resolving the ObservMe API eagerly
	apiReady = resolveApi(pi);

	// ── Intercept subagent tool calls ──────────────────────────────────
	//
	// `tool_call` fires synchronously BEFORE the tool executes, in the
	// same event-loop tick. We inject ObservMe env vars into process.env
	// here; the tool handler reads them when constructing spawnEnv.
	//
	pi.on("tool_call", (event) => {
		if (event.type !== "tool_call") return;
		if (event.toolName !== "subagent") return;
		if (!observmeApi) return;

		const started = observmeApi.startSubagent({
			spawnType: "extension",
			spawnReason: "delegated_task",
			toolCallId: event.toolCallId,
			env: process.env as Record<string, string | undefined>,
		});

		if (!started.ok) return;

		// Inject env vars into process.env
		const injectedKeys = injectEnv(started.env);

		activeSpawns.set(event.toolCallId, {
			spawnId: started.spawnId,
			childAgentId: started.childAgentId,
			envKeys: injectedKeys,
		});
	});

	// ── Clean up after tool execution ──────────────────────────────────
	//
	// `tool_execution_end` fires AFTER the tool completes. For sync runs
	// the child has already finished; for async runs the child continues.
	//
	pi.on("tool_execution_end", (event) => {
		if (event.type !== "tool_execution_end") return;
		if (event.toolName !== "subagent") return;

		const record = activeSpawns.get(event.toolCallId);
		if (!record) return;

		// Remove env vars we injected (always)
		removeInjectedEnv(record.envKeys);

		if (!observmeApi) return;

		// For sync runs, complete the subagent lifecycle now.
		// For async runs, defer to SUBAGENT_ASYNC_COMPLETE_EVENT.
		const result = event.result as Record<string, unknown> | undefined;
		const isAsync = result?.async === true || typeof result?.asyncDir === "string";

		if (!isAsync) {
			observmeApi.completeSubagent(record.spawnId, {
				childAgentId: record.childAgentId,
				childStatus: event.isError ? "failed" : "completed",
				outcome: event.isError ? "failed" : "completed",
			});
			activeSpawns.delete(event.toolCallId);
		}
	});

	// ── Listen for pi-subagents async completion events ────────────────
	//
	// pi-subagents emits this on pi.events when an async run finishes.
	//
	try {
		pi.events.on("subagent:async:complete", (payload: unknown) => {
			const detail = payload as { toolCallId?: string; status?: string } | undefined;
			if (!detail?.toolCallId) return;

			const record = activeSpawns.get(detail.toolCallId);
			if (!record || !observmeApi) return;

			observmeApi.completeSubagent(record.spawnId, {
				childAgentId: record.childAgentId,
				childStatus: detail.status === "failed" ? "failed" : "completed",
				outcome: detail.status === "failed" ? "failed" : "completed",
			});
			activeSpawns.delete(detail.toolCallId);
		});
	} catch {
		// pi.events not available — async completion won't be tracked
	}
}
