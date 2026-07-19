/**
 * End-to-end regression test for the supervisor wake-up failure mode.
 *
 * Spawns a REAL child `pi` subprocess (via the binary shim) whose faux model
 * calls `contact_supervisor`. The parent session (real, with pi-subagents +
 * task-workflow loaded) drives the create-task Step 3 parent loop:
 *
 *   subagent(async) → wait({id}) → subagent_supervisor(pending) →
 *   ask_user_question → subagent_supervisor(reply) → subagent(status)
 *
 * This is the exact round-trip that the two post-mortem notes
 * (CREATE_TASK_FAILURE.md, start-slice-test-baseline-issue.md) describe
 * breaking: a child blocked on the supervisor that the parent failed to wake
 * to and reply to. No unit test in this repo or upstream exercised it.
 */
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
	parentLoopResponder,
	runSupervisorRoundtrip,
	toolCallNames,
	toolResultTexts,
} from "./support/real-supervisor-session";

function launchAsyncDir(session: { messages: unknown[] }): string | undefined {
	for (const m of session.messages) {
		const msg = m as { role?: string; toolName?: string; details?: { asyncDir?: unknown } };
		if (msg.role === "toolResult" && msg.toolName === "subagent" && typeof msg.details?.asyncDir === "string") {
			return msg.details.asyncDir;
		}
	}
	return undefined;
}

describe("supervisor round-trip (pi-subagents native channel)", () => {
	// SKIPPED: The supervisor/intercom pattern has been replaced by fail-with-context.
	// Subagents no longer use contact_supervisor. They write uncertainty/divergence
	// artifacts and fail; the parent reads the artifact, resolves, and retries.
	// This test infrastructure is kept for reference.
	test.skip("parent wakes on the child's contact_supervisor, asks the user, replies, and the chain completes", async () => {
		const run = await runSupervisorRoundtrip({ respond: parentLoopResponder(), timeoutMs: 90_000 });

		try {
			const names = toolCallNames(run.events);

			// The parent drove the full create-task Step 3 sequence.
			expect(names).toContain("subagent");
			expect(names).toContain("wait");
			expect(names.filter((n) => n === "subagent_supervisor").length).toBeGreaterThanOrEqual(2);
			expect(names).toContain("ask_user_question");

			// wait() woke on ATTENTION and named the blocked run — the core
			// regression: a child blocked on contact_supervisor must wake the
			// parent promptly, not stall until a 60s inactivity watchdog.
			const waitResult = toolResultTexts(run.parentSession, "wait").at(-1) ?? "";
			expect(waitResult).toMatch(/attention/i);
			expect(waitResult).not.toMatch(/Waited \d+m(?!s)\b/);

			// The parent surfaced the child's interview_request before replying.
			const pendingResults = toolResultTexts(run.parentSession, "subagent_supervisor")
				.filter((t) => /replyTo:/.test(t));
			expect(pendingResults.length).toBeGreaterThanOrEqual(1);
			expect(pendingResults[0]).toContain("interview_request");

			// The parent replied to that exact request.
			const replyResults = toolResultTexts(run.parentSession, "subagent_supervisor")
				.filter((t) => /Replied to supervisor request/.test(t));
			expect(replyResults.length).toBe(1);

			// The chain reached `complete` (the child only completes if it
			// unblocked from contact_supervisor after the reply).
			const statusResult = toolResultTexts(run.parentSession, "subagent").at(-1) ?? "";
			expect(statusResult).toMatch(/State:\s*complete/i);

			// The child's own transcript proves the round-trip: it received the
			// supervisor's reply and then emitted the completion marker.
			const asyncDir = launchAsyncDir(run.parentSession);
			expect(typeof asyncDir).toBe("string");
			const childOutput = readFileSync(`${asyncDir}/output-0.log`, "utf-8");
			expect(childOutput).toContain("**Reply from supervisor:**");
			expect(childOutput).toContain("CHILD_DONE: shipped after supervisor approval");

			// The parent's final answer confirms the loop completed cleanly.
			expect(run.responseText).toContain("ROUNDTRIP_OK");
		} finally {
			await run.dispose();
		}
	}, 120_000);
});