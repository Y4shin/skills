import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

function readSkill(relativePath: string): string {
	return readFileSync(join(process.cwd(), relativePath), "utf-8");
}

describe("workflow skill orchestration docs", () => {
	test("create-task uses detached-foreground waiting and disabled planning acceptance gates", () => {
		const doc = readSkill("skills/create-task/SKILL.md");

		expect(doc).toContain('async: true');
		expect(doc).toContain('await wait({ id: chainRunId })');
		expect(doc).toContain('Do not run sleep');
		expect(doc).toContain('timers or polling loops just to wait for it');
		expect(doc).toContain('subagent_supervisor({ action: "pending" })');
		expect(doc).not.toContain('timeoutMs: 30000');
		expect(doc).not.toContain('bounded wait');
		expect(doc).toContain('level: "none"');
		expect(doc).toContain('grill-agent');
		expect(doc).toContain('worker');
	});

	test("start-slice uses detached-foreground waiting and disabled planning acceptance gates", () => {
		const doc = readSkill("skills/start-slice/SKILL.md");

		expect(doc).toContain('async: true');
		expect(doc).toContain('await wait({ id: chainRunId })');
		expect(doc).toContain('Do not run sleep');
		expect(doc).toContain('timers or polling loops just to wait for it');
		expect(doc).toContain('subagent_supervisor({ action: "pending" })');
		expect(doc).not.toContain('timeoutMs: 30000');
		expect(doc).not.toContain('bounded wait');
		expect(doc).toContain('level: "none"');
		expect(doc).toContain('approval-agent');
		expect(doc).toContain('need_decision');
	});
});
