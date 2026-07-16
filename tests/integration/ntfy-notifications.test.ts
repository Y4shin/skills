/**
 * Integration coverage for task-workflow ntfy notifications.
 *
 * Uses a real AgentSession plus a local HTTP server standing in for ntfy.sh.
 * The extension is wired to the mock server through TASK_WORKFLOW_NTFY_CONFIG,
 * then the test asserts that each expected notification reaches the server.
 */
import { createServer, type IncomingMessage, type Server } from "node:http";
import { writeFileSync } from "node:fs";
import { AddressInfo } from "node:net";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import taskWorkflow from "../../src/pi/index";
import { readNtfyConfig } from "../../src/pi/ntfy";
import { call, createTaskSession, reply, type TaskSession, toolResultTexts } from "./harness";
import { mkTmp } from "../util";

interface NtfyRequest {
	method: string;
	url: string;
	headers: IncomingMessage["headers"];
	body: string;
}

async function startMockNtfy(): Promise<{
	server: Server;
	url: string;
	requests: NtfyRequest[];
}> {
	const requests: NtfyRequest[] = [];
	const server = createServer((req, res) => {
		const chunks: Buffer[] = [];
		req.on("data", (chunk: Buffer) => chunks.push(chunk));
		req.on("end", () => {
			requests.push({
				method: req.method ?? "",
				url: req.url ?? "",
				headers: req.headers,
				body: Buffer.concat(chunks).toString("utf-8"),
			});
			res.writeHead(200, { "content-type": "application/json" });
			res.end(JSON.stringify({ ok: true }));
		});
	});

	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	const address = server.address() as AddressInfo;
	return { server, url: `http://127.0.0.1:${address.port}`, requests };
}

async function closeServer(server: Server): Promise<void> {
	await new Promise<void>((resolve, reject) => {
		server.close((err) => (err ? reject(err) : resolve()));
	});
}

async function waitForRequests(requests: NtfyRequest[], expected: number): Promise<void> {
	const deadline = Date.now() + 1_000;
	while (requests.length < expected && Date.now() < deadline) {
		await new Promise((resolve) => setTimeout(resolve, 10));
	}
}

async function settleNotifications(): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, 50));
}

function decodeRfc2047(value: string | string[] | undefined): string | undefined {
	const text = Array.isArray(value) ? value.join(",") : value;
	const match = /^=\?UTF-8\?B\?(.+)\?=$/i.exec(text ?? "");
	return match ? Buffer.from(match[1]!, "base64").toString("utf-8") : text;
}

function writeNtfyConfig(serverUrl: string): string {
	const dir = mkTmp();
	const path = join(dir, "ntfy-config.json");
	writeFileSync(
		path,
		JSON.stringify({
			ntfy: {
				enabled: true,
				serverUrl,
				topic: "test-topic",
				token: "test-token",
				priority: 3,
			},
		}),
		"utf-8",
	);
	return path;
}

const sessions: TaskSession[] = [];
let previousConfigEnv: string | undefined;

beforeEach(() => {
	previousConfigEnv = process.env.TASK_WORKFLOW_NTFY_CONFIG;
});

afterEach(() => {
	while (sessions.length) sessions.pop()?.dispose();
	if (previousConfigEnv === undefined) delete process.env.TASK_WORKFLOW_NTFY_CONFIG;
	else process.env.TASK_WORKFLOW_NTFY_CONFIG = previousConfigEnv;
});

describe("ntfy notifications in a real session", () => {
	test("notify_user posts to the configured ntfy server", async () => {
		const ntfy = await startMockNtfy();
		try {
			process.env.TASK_WORKFLOW_NTFY_CONFIG = writeNtfyConfig(ntfy.url);
			const s = await createTaskSession({ extensions: [taskWorkflow] });
			sessions.push(s);

			s.setResponses([
				reply([call("notify_user", { title: "Manual ping", message: "hello phone", priority: "high" })]),
				reply("done"),
			]);

			await s.session.prompt("Send a phone notification.");
			await waitForRequests(ntfy.requests, 1);

			expect(toolResultTexts(s.session, "notify_user")[0]).toContain("Notification sent");
			expect(ntfy.requests).toHaveLength(1);
			expect(ntfy.requests[0]).toMatchObject({ method: "POST", url: "/test-topic", body: "hello phone" });
			expect(ntfy.requests[0]!.headers.authorization).toBe("Bearer test-token");
			expect(ntfy.requests[0]!.headers.title).toBe("Manual ping");
			expect(ntfy.requests[0]!.headers.priority).toBe("5");
		} finally {
			await closeServer(ntfy.server);
		}
	});

	test("subagent lifecycle custom messages emit supervisor, completion, failure, and control notifications", async () => {
		const ntfy = await startMockNtfy();
		try {
			process.env.TASK_WORKFLOW_NTFY_CONFIG = writeNtfyConfig(ntfy.url);
			const s = await createTaskSession({ extensions: [taskWorkflow] });
			sessions.push(s);
			expect(readNtfyConfig()?.serverUrl).toBe(ntfy.url);
			s.setResponses([reply("ack"), reply("ack"), reply("ack"), reply("ack")]);

			await s.session.sendCustomMessage(
				{
					customType: "subagent_supervisor_request",
					content: "The interview agent needs an answer.",
					display: false,
					details: { agent: "grill-agent" },
				},
				{ triggerTurn: true },
			);
			await s.session.sendCustomMessage(
				{
					customType: "subagent-notify",
					content: "Background task completed: **start-slice**\n\nSlice analysed — test plan written.",
					display: false,
				},
				{ triggerTurn: true },
			);
			await s.session.sendCustomMessage(
				{
					customType: "subagent-notify",
					content: "Background task failed: **create-task**\n\nThe chain failed before writing task artifacts.",
					display: false,
				},
				{ triggerTurn: true },
			);
			await s.session.sendCustomMessage(
				{
					customType: "subagent_control_notice",
					content: "No observed activity for 60s.",
					display: false,
					details: { agent: "grill-agent", reason: "needs_attention" },
				},
				{ triggerTurn: true },
			);

			await waitForRequests(ntfy.requests, 4);

			expect(ntfy.requests).toHaveLength(4);
			expect(ntfy.requests.map((r) => r.url)).toEqual(["/test-topic", "/test-topic", "/test-topic", "/test-topic"]);
			expect(ntfy.requests.map((r) => r.body)).toEqual([
				"The interview agent needs an answer.",
				"Background task completed: **start-slice**\n\nSlice analysed — test plan written.",
				"Background task failed: **create-task**\n\nThe chain failed before writing task artifacts.",
				"Reason: needs_attention\nNo observed activity for 60s.",
			]);
			expect(ntfy.requests.map((r) => decodeRfc2047(r.headers.title))).toEqual([
				"🤖 grill-agent needs attention",
				"✅ start-slice completed",
				"❌ create-task failed",
				"⚠️ grill-agent needs attention",
			]);
			expect(ntfy.requests.map((r) => r.headers.priority)).toEqual(["4", "2", "5", "4"]);
			expect(ntfy.requests.every((r) => r.headers.authorization === "Bearer test-token")).toBe(true);
		} finally {
			await closeServer(ntfy.server);
		}
	});

	test("subagent-notify covers paused, grouped completed, details-only, and unknown-status cases", async () => {
		const ntfy = await startMockNtfy();
		try {
			process.env.TASK_WORKFLOW_NTFY_CONFIG = writeNtfyConfig(ntfy.url);
			const s = await createTaskSession({ extensions: [taskWorkflow] });
			sessions.push(s);
			s.setResponses([reply("ack"), reply("ack"), reply("ack"), reply("ack")]);

			await s.session.sendCustomMessage(
				{
					customType: "subagent-notify",
					content: "Background task paused: **implement-slice**\n\nPaused after interrupt. Waiting for explicit next action.",
					display: false,
				},
				{ triggerTurn: true },
			);
			await s.session.sendCustomMessage(
				{
					customType: "subagent-notify",
					content:
						"Background tasks completed (2): **scout**, **reviewer**\n\n" +
						"1. scout\nFound the relevant files.\n\n" +
						"2. reviewer\nNo blockers found.",
					display: false,
				},
				{ triggerTurn: true },
			);
			await s.session.sendCustomMessage(
				{
					customType: "subagent-notify",
					content: "Details-only completion payload.",
					display: false,
					details: { agent: "worker", status: "completed" },
				},
				{ triggerTurn: true },
			);
			await s.session.sendCustomMessage(
				{
					customType: "subagent-notify",
					content: "Progress-only update; should not notify.",
					display: false,
					details: { agent: "worker", status: "running" },
				},
				{ triggerTurn: true },
			);

			await waitForRequests(ntfy.requests, 3);
			await settleNotifications();

			expect(ntfy.requests).toHaveLength(3);
			expect(ntfy.requests.map((r) => r.body)).toEqual([
				"Background task paused: **implement-slice**\n\nPaused after interrupt. Waiting for explicit next action.",
				"Background tasks completed (2): **scout**, **reviewer**\n\n" +
					"1. scout\nFound the relevant files.\n\n" +
					"2. reviewer\nNo blockers found.",
				"Details-only completion payload.",
			]);
			expect(ntfy.requests.map((r) => decodeRfc2047(r.headers.title))).toEqual([
				"❌ implement-slice paused",
				"✅ subagents completed",
				"✅ worker completed",
			]);
			expect(ntfy.requests.map((r) => r.headers.priority)).toEqual(["5", "2", "2"]);
		} finally {
			await closeServer(ntfy.server);
		}
	});
});
