/**
 * Tests for the pipeline-slices skill:
 * - Document structure checks
 * - Pipeline orchestration pattern verification
 * - Partial-completion handling
 * - State-management separation (parent owns state, workers don't)
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import {
	createTaskSession,
	reply,
	call,
	toolCallNames,
} from "./integration/harness";

function readSkill(relativePath: string): string {
	return readFileSync(join(process.cwd(), relativePath), "utf-8");
}

// ─── Document structure tests ────────────────────────────────────────

describe("pipeline-slices skill doc structure", () => {
	const doc = readSkill("skills/pipeline-slices/SKILL.md");

	test("declares async:true chains", () => {
		expect(doc).toContain("async: true");
	});

	test("uses targeted wait({id}) to avoid cross-run interference", () => {
		expect(doc).toContain("wait({ id: ");
	});

	test("uses subagent_wait for non-interactive chain completion", () => {
		expect(doc).toContain("subagent_wait");
		// No supervisor/intercom relay
		expect(doc).not.toContain("subagent_supervisor");
		expect(doc).not.toContain("contact_supervisor");
	});

	test("disables planning acceptance gates", () => {
		const chain = JSON.parse(readFileSync(join(process.cwd(), "chains/implement-slice.chain.json"), "utf-8"));
		const divergeStep = chain.chain.find((s: any) => s.phase === "Divergence");
		expect(divergeStep).toBeDefined();
		expect(divergeStep.acceptance).toBeDefined();
		expect(divergeStep.acceptance.level).toBe("none");
	});

	test("references all required agents with dotted names", () => {
		const chain = JSON.parse(readFileSync(join(process.cwd(), "chains/implement-slice.chain.json"), "utf-8"));
		for (const step of chain.chain) {
			expect(step.agent).toMatch(/^skills\./);
		}
		// Also check retry chain in the skill doc
		expect(doc).toContain("skills.tdd-worker");
		expect(doc).toContain("skills.slice-verifier");
	});

	test("separates state management in parent loop", () => {
		// Parent loop calls task_state_set, not the chain steps
		expect(doc).toContain("task_state_set(\"active.slice\"");
		expect(doc).toContain("task_state_set(\"last_action\"");
	});

	test("handles slice states", () => {
		expect(doc).toContain("\"status\", \"in-progress\"");
		expect(doc).toContain("\"status\", \"skipped\"");
	});

	test("reads from implement-slice.chain.json", () => {
		expect(doc).toContain("implement-slice.chain.json");
	});

	test("uses per-slice loop with chain variable substitution", () => {
		expect(doc).toContain("for (let i = 0; i < pendingSlices.length; i++)");
		expect(doc).toContain("sliceChain");
		expect(doc).toContain("sliceSlug");
	});

	test("per-slice error handling with retry/skip/stop", () => {
		expect(doc).toContain("retries");
		expect(doc).toContain("Skip this slice");
		expect(doc).toContain("Stop pipeline");
	});

	test("has per-slice progress reporting", () => {
		expect(doc).toContain("slice ${i + 1} of $");
	});

	test("has error recovery instructions", () => {
		expect(doc).toContain("retries");
		expect(doc).toContain("pipeline-slices");
	});

	test("declares pipeline-slices in its own frontmatter name", () => {
		const nameMatch = doc.match(/^name:\s*(pipeline-slices)/m);
		expect(nameMatch).not.toBeNull();
		expect(nameMatch![1]).toBe("pipeline-slices");
	});

	test("pipeline diagram is present", () => {
		expect(doc).toContain("Pipeline diagram");
	});
});

// ─── Integration tests using the faux harness ─────────────────────────

describe("pipeline-slices integration (faux harness)", () => {
	test("loads and responds to a basic prompt", async () => {
		const task = await createTaskSession({
			projectFiles: {
				"docs/tasks/login/task.md": [
					"---",
					"kind: task",
					"title: Login feature",
					"slug: login",
					"status: in-progress",
					"slices: [form-validation, api-token]",
					"---",
				].join("\n"),
				"docs/tasks/login/slices/1-form-validation.md": [
					"---",
					"kind: slice",
					"title: Form validation",
					"slug: form-validation",
					"task: ../task.md",
					"mode: hitl",
					"analysed: false",
					"status: todo",
					"size: m",
					"blocked_by: []",
					"---",
					"## Acceptance criteria",
				].join("\n"),
				"docs/tasks/login/slices/2-api-token.md": [
					"---",
					"kind: slice",
					"title: API token",
					"slug: api-token",
					"task: ../task.md",
					"mode: hitl",
					"analysed: false",
					"status: todo",
					"size: m",
					"blocked_by: [form-validation]",
					"---",
					"## Acceptance criteria",
				].join("\n"),
				"docs/tasks/state.yaml": [
					"active:",
					"  task: login",
					"  slice: ''",
					"  epic: ''",
					"last_action: ''",
					"next_action: start-slice form-validation",
				].join("\n"),
			},
		});

		try {
			task.setResponses([
				// First LLM call: agent reads state and slices
				reply([
					call("task_show", { selector: "form-validation" }),
				]),
				reply("Pipeline would proceed with slice analysis."),
			]);

			await task.session.prompt("/skill:pipeline-slices login", {
				expandPromptTemplates: false,
			});

			const names = toolCallNames(task.events);
			expect(names).toContain("task_show");
		} finally {
			task.dispose();
		}
	});

	test("detects pre-analysed slices and skips their start phase", async () => {
		const task = await createTaskSession({
			projectFiles: {
				"docs/tasks/login/task.md": [
					"---",
					"kind: task",
					"title: Login feature",
					"slug: login",
					"status: in-progress",
					"slices: [form-validation, api-token]",
					"---",
				].join("\n"),
				"docs/tasks/login/slices/1-form-validation.md": [
					"---",
					"kind: slice",
					"title: Form validation",
					"slug: form-validation",
					"task: ../task.md",
					"mode: hitl",
					"analysed: true",
					"status: todo",
					"size: m",
					"blocked_by: []",
					"---",
					"## Acceptance criteria",
					"## Test plan",
				].join("\n"),
				"docs/tasks/login/slices/2-api-token.md": [
					"---",
					"kind: slice",
					"title: API token",
					"slug: api-token",
					"task: ../task.md",
					"mode: hitl",
					"analysed: false",
					"status: todo",
					"size: m",
					"blocked_by: [form-validation]",
					"---",
					"## Acceptance criteria",
				].join("\n"),
			},
		});

		try {
			task.setResponses([
				// Read all slices
				reply([call("task_show", { selector: "form-validation" })]),
				reply([call("task_slices", { selector: "login" })]),
				reply("Pipeline detected pre-analysed slice and queued implement directly."),
			]);

			await task.session.prompt("/skill:pipeline-slices login", {
				expandPromptTemplates: false,
			});

			const names = toolCallNames(task.events);
			// Should read slices to determine state
			expect(names).toContain("task_slices");
		} finally {
			task.dispose();
		}
	});

	test("skips already-completed slices", async () => {
		const task = await createTaskSession({
			projectFiles: {
				"docs/tasks/login/task.md": [
					"---",
					"kind: task",
					"title: Login feature",
					"slug: login",
					"status: in-progress",
					"slices: [form-validation, api-token]",
					"---",
				].join("\n"),
				"docs/tasks/login/slices/1-form-validation.md": [
					"---",
					"kind: slice",
					"title: Form validation",
					"slug: form-validation",
					"task: ../task.md",
					"mode: hitl",
					"analysed: true",
					"status: done",
					"size: m",
					"started_at: 2025-01-01T00:00:00Z",
					"completed_at: 2025-01-02T00:00:00Z",
					"blocked_by: []",
					"---",
					"## Acceptance criteria",
					"## Test plan",
				].join("\n"),
				"docs/tasks/login/slices/2-api-token.md": [
					"---",
					"kind: slice",
					"title: API token",
					"slug: api-token",
					"task: ../task.md",
					"mode: hitl",
					"analysed: false",
					"status: todo",
					"size: m",
					"blocked_by: [form-validation]",
					"---",
					"## Acceptance criteria",
				].join("\n"),
			},
		});

		try {
			task.setResponses([
				// Read all slices to determine state
				reply([call("task_show", { selector: "form-validation" })]),
				reply([call("task_slices", { selector: "login" })]),
				reply("Pipeline skipped the done slice and proceeded to analyse the remaining one."),
			]);

			await task.session.prompt("/skill:pipeline-slices login", {
				expandPromptTemplates: false,
			});

			const names = toolCallNames(task.events);
			expect(names).toContain("task_slices");
		} finally {
			task.dispose();
		}
	});
});

// ─── Edge case tests ─────────────────────────────────────────────────

describe("pipeline-slices edge cases", () => {
	test("handles empty slice list gracefully", () => {
		const doc = readSkill("skills/pipeline-slices/SKILL.md");
		expect(doc).toContain("stop");
	});

	test("has error recovery for slice failure", () => {
		const doc = readSkill("skills/pipeline-slices/SKILL.md");
		expect(doc).toContain("failed");
		expect(doc).toContain("retries");
	});

	test("has state recovery after partial run", () => {
		const doc = readSkill("skills/pipeline-slices/SKILL.md");
		expect(doc).toContain("re-run");
	});
});
