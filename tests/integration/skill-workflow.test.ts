import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

function readSkill(relativePath: string): string {
	return readFileSync(join(process.cwd(), relativePath), "utf-8");
}

describe("workflow skill orchestration docs", () => {
	test("create-task uses async chain and file-based review", () => {
		const doc = readSkill("skills/create-task/SKILL.md");

		expect(doc).toContain("async: true");
		expect(doc).toContain("await wait({ id: ");
		expect(doc).toContain("subagent_supervisor({ action: \"pending\" })");
		expect(doc).toContain("create-task.chain.json");
		// File-based plan review tools
		expect(doc).toContain("submit_plan_for_review");
		expect(doc).toContain("parse_plan_review");
		// Dotted agent names
		expect(doc).toContain("skills.");
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
			"adhoc-refiner", "approval-agent", "grill-agent",
			"slice-verifier", "task-summarizer", "tdd-worker", "test-strategist",
		]) {
			const content = readSkill("agents/" + agent + ".md");
			expect(content).toContain("package: skills");
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