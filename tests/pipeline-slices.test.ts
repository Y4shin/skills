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
		expect(doc).toContain("wait({ id: chainRunId })");
		expect(doc).toContain("wait({ id: lastImplId })");
	});

	test("has parent loop relay pattern", () => {
		expect(doc).toContain("subagent_supervisor({ action: \"pending\" })");
		expect(doc).toContain("interview_request");
		expect(doc).toContain("need_decision");
	});

	test("refers to start-slice parent loop for the relay pattern", () => {
		expect(doc).toContain("identical to the one in");
		expect(doc).toContain("start-slice");
	});

	test("disables planning acceptance gates", () => {
		expect(doc).toContain("level: \"none\"");
	});

	test("references all required agents", () => {
		expect(doc).toContain("grill-agent");
		expect(doc).toContain("approval-agent");
		expect(doc).toContain("test-strategist");
		expect(doc).toContain("tdd-worker");
		expect(doc).toContain("slice-verifier");
	});

	test("separates state management from chain workers", () => {
		// Chain worker steps must NOT call task_state_set
		const workerSections = doc.split("### implement-slice chain (no state writes)");
		expect(workerSections.length).toBeGreaterThanOrEqual(2);

		const implSection = workerSections[1] ?? "";
		// The worker land step should NOT contain task_state_set
		const linesAfterDoNotCall = implSection.split("do NOT call task_state_set");
		expect(linesAfterDoNotCall.length).toBeGreaterThanOrEqual(2);

		// Parent code blocks SHOULD contain task_state_set
		expect(doc).toContain("task_state_set");
	});

	test("handles all three slice states", () => {
		expect(doc).toContain("status: done");
		expect(doc).toContain("analysed: true");
		expect(doc).toContain("analysed: false");
	});

	test("has pre-analysed slice support", () => {
		expect(doc).toContain("preAnalyzed");
		expect(doc).toContain("pre-analysed");
	});

	test("has partial recovery instructions", () => {
		expect(doc).toContain("Recovery");
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

	test("explicitly forbids task_state_set in chain workers", () => {
		// Should have explicit note in both chain templates
		expect(doc).toContain("do NOT call task_state_set");
		// Should appear at least twice (start and implement chain)
		const matches = doc.match(/do NOT call task_state_set/g);
		expect(matches?.length).toBeGreaterThanOrEqual(2);
	});

	test("parent loop CRITICAL warning is present", () => {
		expect(doc).toContain("Parent is a relay, not a decision-maker");
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
		expect(doc).toContain("nothing to do");
		expect(doc).toContain("stop");
	});

	test("handles pre-analysed only (all starts done, waiting for implements)", () => {
		const doc = readSkill("skills/pipeline-slices/SKILL.md");
		expect(doc).toContain("pre-analysed");
		// The phrase spans two lines, check each part
		expect(doc).toContain("all slices");
		expect(doc).toContain("already started");
	});

	test("has error recovery for failed start-slice", () => {
		const doc = readSkill("skills/pipeline-slices/SKILL.md");
		expect(doc).toContain("FAILED at start-slice");
		expect(doc).toContain("re-run");
		expect(doc).toContain("skips already-analysed");
	});

	test("has error recovery for failed implement-slice", () => {
		const doc = readSkill("skills/pipeline-slices/SKILL.md");
		expect(doc).toContain("failed");
		expect(doc).toContain("checkImplSuccess");
	});

	test("has state recovery after partial run", () => {
		const doc = readSkill("skills/pipeline-slices/SKILL.md");
		expect(doc).toContain("State recovery");
		expect(doc).toContain("Re-run");
	});
});
