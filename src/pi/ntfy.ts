/**
 * ntfy.sh notification helper for the task-workflow extension.
 *
 * Reads the @pi-unipi/notify config from ~/.unipi/config/notify/config.json
 * and sends HTTP POST requests to the configured ntfy server.
 *
 * This lets the task-workflow extension send phone notifications when:
 * - A chain completes (success or failure)
 * - A subagent needs user attention (contact_supervisor)
 * - A long-running step finishes
 */

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// ─── Config ──────────────────────────────────────────────────────────────────

export interface NtfyConfig {
	enabled: boolean;
	serverUrl: string;
	topic: string;
	token?: string;
	priority?: number;
}

interface NotifyConfig {
	ntfy?: NtfyConfig;
}

const DEFAULT_CONFIG_PATH = join(
	homedir(),
	".unipi",
	"config",
	"notify",
	"config.json",
);

const CONFIG_PATH_ENV = "TASK_WORKFLOW_NTFY_CONFIG";

function defaultConfigPath(): string {
	return process.env[CONFIG_PATH_ENV] || DEFAULT_CONFIG_PATH;
}

export function readNtfyConfig(configPath = defaultConfigPath()): NtfyConfig | null {
	try {
		if (!existsSync(configPath)) return null;
		const raw = readFileSync(configPath, "utf-8");
		const config = JSON.parse(raw) as NotifyConfig;
		if (!config.ntfy?.enabled || !config.ntfy?.topic) return null;
		return config.ntfy;
	} catch {
		return null;
	}
}

// ─── Sending ──────────────────────────────────────────────────────────────────

export interface NtfyPayload {
	title?: string;
	message: string;
	priority?: number;
	tags?: string[];
}

function encodeHeaderValue(value: string): string {
	// WHATWG fetch requires header values to be ByteString/Latin-1. ntfy accepts
	// RFC 2047 encoded UTF-8 headers, which lets our emoji titles survive Node's
	// header validation instead of making the notification silently fail.
	return /^[\u0000-\u00ff]*$/.test(value)
		? value
		: `=?UTF-8?B?${Buffer.from(value, "utf-8").toString("base64")}?=`;
}

/**
 * Send a notification via ntfy.sh using the configured server, topic, and token.
 * Returns true if the notification was sent successfully.
 */
export async function sendNtfyNotification(
	payload: NtfyPayload,
	config?: NtfyConfig,
): Promise<boolean> {
	const cfg = config ?? readNtfyConfig();
	if (!cfg?.enabled || !cfg.serverUrl || !cfg.topic) return false;

	const url = `${cfg.serverUrl.replace(/\/+$/, "")}/${encodeURIComponent(cfg.topic)}`;
	const headers: Record<string, string> = {
		"Content-Type": "text/plain",
	};

	if (cfg.token) {
		headers["Authorization"] = `Bearer ${cfg.token}`;
	}
	if (payload.title) {
		headers["Title"] = encodeHeaderValue(payload.title);
	}
	if (payload.tags?.length) {
		headers["Tags"] = payload.tags.join(",");
	}

	// ntfy uses a header-based priority: 1=min, 2=low, 3=default, 4=high, 5=max
	const priority = payload.priority ?? cfg.priority ?? 3;
	headers["Priority"] = String(priority);

	try {
		const response = await fetch(url, {
			method: "POST",
			headers,
			body: payload.message,
		});
		return response.ok;
	} catch {
		return false;
	}
}

// ─── Convenience wrappers ────────────────────────────────────────────────────

/** Send a notification that a subagent needs user attention. */
export async function notifyNeedsAttention(
	agent: string,
	reason: string,
): Promise<boolean> {
	return sendNtfyNotification({
		title: "🤖 Subagent needs attention",
		message: `Agent "${agent}" needs you:\n${reason}`,
		tags: ["bell", "rotating_light"],
		priority: 4,
	});
}

/** Send a notification that a chain completed successfully. */
export async function notifyChainComplete(
	chain: string,
	result: string,
): Promise<boolean> {
	return sendNtfyNotification({
		title: "✅ Chain completed",
		message: `Chain "${chain}" finished.\n${result}`,
		tags: ["white_check_mark"],
		priority: 2,
	});
}

/** Send a notification that a chain failed. */
export async function notifyChainFailed(
	chain: string,
	error: string,
): Promise<boolean> {
	return sendNtfyNotification({
		title: "❌ Chain failed",
		message: `Chain "${chain}" failed:\n${error}`,
		tags: ["x", "warning"],
		priority: 5,
	});
}
