import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

function readSkill(relativePath: string): string {
	return readFileSync(join(process.cwd(), relativePath), "utf-8");
}

describe("workflow skill orchestration docs", () => {
	test("create-task uses inline interview and test-strategist subagent", () => {
		const doc = readSkill("skills/create-task/SKILL.md");

		// Uses inline interview with ask_user_question
		expect(doc).toContain("ask_user_question");
		// Dispatches test-strategist for formal test plans
		expect(doc).toContain("skills.test-strategist");
		// Writes artifacts directly
		expect(doc).toContain("write(`docs/tasks/");
		expect(doc).toContain("task_set_slices");
		// No supervisor/intercom patterns
		expect(doc).not.toContain("subagent_supervisor");
		expect(doc).not.toContain("contact_supervisor");
	});

	test("implement-slice uses async chain with extracted JSON", () => {
		const doc = readSkill("skills/implement-slice/SKILL.md");

		expect(doc).toContain("async: true");
		expect(doc).toContain("implement-slice.chain.json");
		expect(doc).toContain("skills.");
	});

	test("finalize-task uses async chain with extracted JSON", () => {
		const doc = readSkill("skills/finalize-task/SKILL.md");

		expect(doc).toContain("async: true");
		expect(doc).toContain("finalize-task.chain.json");
		expect(doc).toContain("chainDef");
	});

	test("agents use dotted names (package: skills)", () => {
		for (const agent of [
			"adhoc-refiner", "slice-verifier", "task-summarizer",
			"tdd-worker", "test-strategist",
		]) {
			const content = readSkill("agents/" + agent + ".md");
			expect(content).toContain("package: skills");
		}
		// Deprecated agents still exist but are no longer used in skill orchestrations
		for (const agent of ["approval-agent", "grill-agent"]) {
			const content = readSkill("agents/" + agent + ".md");
			expect(content).toContain("package: skills");
			expect(content).toContain("deprecated");
		}
	});

	test("chain files parse with required fields", () => {
		for (const chain of ["create-task", "implement-slice", "finalize-task"]) {
			const content = readFileSync(
				join(process.cwd(), "chains/" + chain + ".chain.json"),
				"utf-8",
			);
			const parsed = JSON.parse(content);
			expect(parsed.chain.length).toBeGreaterThan(0);
			expect(parsed.chain[0]).toHaveProperty("agent");
			expect(parsed.chain[0]).toHaveProperty("as");
			expect(parsed.chain[0]).toHaveProperty("phase");
			expect(parsed.chain[0]).toHaveProperty("label");
			expect(parsed.chain[0].agent).toMatch(/^skills\./);
		}
	});
});