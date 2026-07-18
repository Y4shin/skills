/**
 * Structure tests for agent frontmatter files and chain JSON files.
 *
 * Verifies that all agent files have the expected frontmatter fields
 * added in Phases 1 and 6, and that chain JSON files parse correctly.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const PROJECT = process.cwd();

function readFile(relativePath: string): string {
	const p = join(PROJECT, relativePath);
	if (!existsSync(p)) throw new Error(`File not found: ${relativePath}`);
	return readFileSync(p, "utf-8");
}

function parseFrontmatter(content: string): Record<string, any> {
	const match = content.match(/^---\n([\s\S]*?)\n---/);
	if (!match) return {};
	const fm: Record<string, any> = {};
	for (const line of match[1].split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const colonIdx = trimmed.indexOf(":");
		if (colonIdx === -1) continue;
		const key = trimmed.slice(0, colonIdx).trim();
		const value = trimmed.slice(colonIdx + 1).trim();
		fm[key] = value;
	}
	return fm;
}

// ─── Agent frontmatter tests ─────────────────────────────────────────

const AGENT_FILES = [
	"agents/adhoc-refiner.md",
	"agents/approval-agent.md",
	"agents/grill-agent.md",
	"agents/slice-verifier.md",
	"agents/task-summarizer.md",
	"agents/tdd-worker.md",
	"agents/test-strategist.md",
] as const;

const AGENT_DEFAULTS: Record<string, { context: string; timeout?: number; turns?: number; grace?: number; fallback?: string }> = {
	"agents/adhoc-refiner.md": { context: "fork", timeout: 120000, turns: 10, grace: 2 },
	"agents/approval-agent.md": { context: "fresh", timeout: 120000, turns: 10, grace: 2 },
	"agents/grill-agent.md": { context: "fresh" },
	"agents/slice-verifier.md": { context: "fresh", timeout: 120000, turns: 8, grace: 2, fallback: "openrouter/deepseek/deepseek-v4-flash" },
	"agents/task-summarizer.md": { context: "fork", timeout: 120000, turns: 10, grace: 2 },
	"agents/tdd-worker.md": { context: "fork", timeout: 600000, turns: 40, grace: 6, fallback: "openrouter/deepseek/deepseek-v4-flash" },
	"agents/test-strategist.md": { context: "fresh", timeout: 120000, turns: 15, grace: 3 },
};

describe("agent frontmatter", () => {
	for (const file of AGENT_FILES) {
		const agentName = file.replace("agents/", "").replace(".md", "");
		describe(agentName, () => {
			const content = readFile(file);
			const fm = parseFrontmatter(content);
			const expected = AGENT_DEFAULTS[file];

			test("has frontmatter", () => {
				expect(fm["name"]).toBe(agentName);
			});

			test("has package: skills", () => {
				expect(fm["package"]).toBe("skills");
			});

			test("has inheritProjectContext: true", () => {
				expect(fm["inheritProjectContext"]).toBe("true");
			});

			test("has defaultContext", () => {
				expect(fm["defaultContext"]).toBe(expected.context);
			});

			if (expected.timeout !== undefined) {
				test("has timeoutMs", () => {
					expect(fm["timeoutMs"]).toBe(String(expected.timeout));
				});
			} else {
				test("has no timeoutMs (unlimited)", () => {
					expect(fm["timeoutMs"]).toBeUndefined();
				});
			}

			if (expected.turns !== undefined) {
				test("has turnBudget with correct maxTurns", () => {
					expect(content).toContain(`maxTurns: ${expected.turns}`);
				});
				test("has turnBudget with correct graceTurns", () => {
					expect(content).toContain(`graceTurns: ${expected.grace}`);
				});
			} else {
				test("has no turnBudget (unlimited)", () => {
					expect(content).not.toContain("turnBudget:");
				});
			}

			if (expected.fallback) {
				test("has fallbackModels", () => {
					expect(content).toContain(expected.fallback!);
				});
			}
		});
	}
});

// ─── Chain file structure tests ──────────────────────────────────────

const CHAIN_FILES = [
	"chains/create-task.chain.json",
	"chains/implement-slice.chain.json",
	"chains/finalize-task.chain.json",
] as const;

describe("chain JSON files", () => {
	for (const file of CHAIN_FILES) {
		const chainName = file.replace("chains/", "").replace(".chain.json", "");
		describe(chainName, () => {
			const content = readFile(file);
			const parsed = JSON.parse(content);

			test("is valid JSON", () => {
				expect(parsed).toBeTruthy();
			});

			test("has name field", () => {
				expect(typeof parsed.name).toBe("string");
				expect(parsed.name.length).toBeGreaterThan(0);
			});

			test("has steps array", () => {
				expect(Array.isArray(parsed.steps)).toBe(true);
				expect(parsed.steps.length).toBeGreaterThan(0);
			});

			test("has timeoutMs", () => {
				expect(typeof parsed.timeoutMs).toBe("number");
				expect(parsed.timeoutMs).toBeGreaterThan(0);
			});

			test("has turnBudget", () => {
				expect(parsed.turnBudget).toBeDefined();
				expect(typeof parsed.turnBudget.maxTurns).toBe("number");
				expect(typeof parsed.turnBudget.graceTurns).toBe("number");
			});

			test("each step has required fields", () => {
				for (const [i, step] of parsed.steps.entries()) {
					expect(step).toHaveProperty("agent");
					expect(step).toHaveProperty("as");
					expect(step).toHaveProperty("phase");
					expect(step).toHaveProperty("label");
					expect(step).toHaveProperty("task");
					expect(typeof step.agent).toBe("string");
					expect(typeof step.as).toBe("string");
					expect(typeof step.phase).toBe("string");
					expect(typeof step.label).toBe("string");
					expect(typeof step.task).toBe("string");
				}
			});

			test("agents use dotted names", () => {
				for (const step of parsed.steps) {
					expect(step.agent).toMatch(/^skills\./);
				}
			});

			if (parsed.variables) {
				test("variables array is defined", () => {
					expect(Array.isArray(parsed.variables)).toBe(true);
				});
			}
		});
	}
});

// ─── Skill SKILL.md structure tests ──────────────────────────────────

const SKILL_FILES = [
	"skills/create-task/SKILL.md",
	"skills/implement-slice/SKILL.md",
	"skills/finalize-task/SKILL.md",
	"skills/pipeline-slices/SKILL.md",
	"skills/revise-task/SKILL.md",
	"skills/adhoc-task/SKILL.md",
] as const;

describe("skill files", () => {
	for (const file of SKILL_FILES) {
		const skillName = file.split("/")[1];
		describe(skillName, () => {
			const content = readFile(file);
			const fm = parseFrontmatter(content);

			test("has frontmatter", () => {
				expect(fm["name"]).toBeDefined();
			});

			test("has need_decision (not need_discussion)", () => {
				expect(content).not.toContain("need_discussion");
			});

			test("uses skills.<name> agent references", () => {
				const agentRefs = content.match(/"agent":\s*"([^"]+)"/g) || [];
				for (const ref of agentRefs) {
					// Skip non-step agent references
					if (ref.includes("skills.")) continue;
					expect(ref).toMatch(
						/skills\.(worker|grill-agent|tdd-worker|slice-verifier|approval-agent|test-strategist|task-summarizer|adhoc-refiner)/,
					);
				}
			});
		});
	}
});

// ─── Phase 2 metadata tests ──────────────────────────────────────────

describe("chain step metadata (Phase 2)", () => {
	const createTaskChain = JSON.parse(readFile("chains/create-task.chain.json"));
	const implementSliceChain = JSON.parse(readFile("chains/implement-slice.chain.json"));
	const finalizeTaskChain = JSON.parse(readFile("chains/finalize-task.chain.json"));

	test("create-task chain steps have as/phase/label", () => {
		for (const step of createTaskChain.steps) {
			expect(step).toHaveProperty("as");
			expect(step).toHaveProperty("phase");
			expect(step).toHaveProperty("label");
		}
	});

	test("create-task has outputMode on non-interview steps", () => {
		for (const step of createTaskChain.steps) {
			if (step.label?.includes("Interview") || step.label?.includes("User approves")) {
				expect(step.outputMode).toBeUndefined();
			} else {
				expect(step).toHaveProperty("outputMode");
			}
		}
	});

	test("finalize-task chain steps have as/phase/label", () => {
		for (const step of finalizeTaskChain.steps) {
			expect(step).toHaveProperty("as");
			expect(step).toHaveProperty("phase");
			expect(step).toHaveProperty("label");
		}
	});

	test("all chain steps use valid phase values", () => {
		const validPhases = ["Preparation", "Planning", "Approval", "Implementation", "Verification", "Divergence", "Landing", "Changelog", "Cleanup"];
		for (const chain of [createTaskChain, implementSliceChain, finalizeTaskChain]) {
			for (const step of chain.steps) {
				expect(validPhases).toContain(step.phase);
			}
		}
	});
});