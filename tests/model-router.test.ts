/**
 * Unit tests for the model-router extension's pure logic — no pi runtime.
 *
 * Covers: command-token parsing, frontmatter model field, spec parsing,
 * model resolution, and the LIFO injection stack (ascending ids + nesting).
 */

import { describe, expect, test } from "vitest";

import {
	ModelRouterStack,
	STATE_CUSTOM_TYPE,
	buildStandingReminder,
	buildSwitchNote,
	firstCommandToken,
	latestSnapshot,
	parseModelSpec,
	parseSnapshot,
	readModelSpecs,
	resolveModel,
	selectModel,
	type ModelLike,
} from "../src/pi/model-router";

const MODELS: ModelLike[] = [
	{ provider: "anthropic", id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5" },
	{
		provider: "anthropic",
		id: "claude-sonnet-4-5-20250929",
		name: "Claude Sonnet 4.5 (2025-09-29)",
	},
	{ provider: "anthropic", id: "claude-opus-4-5", name: "Claude Opus 4.5" },
	{ provider: "openai", id: "gpt-5.2-codex", name: "GPT-5.2 Codex" },
	{ provider: "openai", id: "gpt-4o", name: "GPT-4o" },
];

describe("firstCommandToken", () => {
	test("extracts skill token with args", () => {
		expect(firstCommandToken("/skill:heavy-refactor do the thing")).toBe(
			"skill:heavy-refactor",
		);
	});

	test("extracts template token", () => {
		expect(firstCommandToken("/review")).toBe("review");
	});

	test("tolerates leading whitespace", () => {
		expect(firstCommandToken("   /plan now")).toBe("plan");
	});

	test("returns undefined for non-commands", () => {
		expect(firstCommandToken("hello there")).toBeUndefined();
		expect(firstCommandToken("/")).toBeUndefined();
		expect(firstCommandToken("")).toBeUndefined();
	});
});

describe("readModelSpecs", () => {
	test("reads a `models` array in order", () => {
		expect(readModelSpecs({ models: ["opus", "sonnet", "gpt-4o"] })).toEqual([
			"opus",
			"sonnet",
			"gpt-4o",
		]);
	});

	test("reads a scalar `model` for backwards compat", () => {
		expect(readModelSpecs({ model: "sonnet" })).toEqual(["sonnet"]);
	});

	test("reads `pi-model` and `pi_model` aliases", () => {
		expect(readModelSpecs({ "pi-model": "opus" })).toEqual(["opus"]);
		expect(readModelSpecs({ pi_model: "gpt-4o" })).toEqual(["gpt-4o"]);
	});

	test("merges `models` then `model`, de-duplicating and trimming", () => {
		expect(
			readModelSpecs({ models: ["opus", " sonnet "], model: "opus" }),
		).toEqual(["opus", "sonnet"]);
	});

	test("ignores non-string entries and empty values", () => {
		expect(
			readModelSpecs({ models: ["opus", 42, "", null, "sonnet"] as unknown[] }),
		).toEqual(["opus", "sonnet"]);
	});

	test("returns [] when no preference declared", () => {
		expect(readModelSpecs({})).toEqual([]);
		expect(readModelSpecs({ model: "" })).toEqual([]);
	});
});

describe("selectModel", () => {
	test("returns the first spec that resolves to an available model", () => {
		const sel = selectModel(["opus", "gpt-4o"], MODELS);
		expect(sel?.model.id).toBe("claude-opus-4-5");
	});

	test("skips unavailable specs and picks the next available one", () => {
		const available = MODELS.filter((m) => m.provider === "openai");
		const sel = selectModel(["opus", "claude-sonnet-4-5", "gpt-4o"], available);
		expect(sel?.model.id).toBe("gpt-4o"); // both anthropic specs skipped
	});

	test("carries the thinking level parsed from the winning spec", () => {
		const sel = selectModel(["anthropic/claude-opus-4-5:high"], MODELS);
		expect(sel?.model.id).toBe("claude-opus-4-5");
		expect(sel?.thinkingLevel).toBe("high");
	});

	test("returns undefined when none of the specs are available", () => {
		expect(selectModel(["opus", "sonnet"], [])).toBeUndefined();
		expect(selectModel(["nope", "also-nope"], MODELS)).toBeUndefined();
	});
});

describe("parseModelSpec", () => {
	test("splits a trailing thinking level", () => {
		expect(parseModelSpec("anthropic/claude-opus-4-5:high")).toEqual({
			pattern: "anthropic/claude-opus-4-5",
			thinkingLevel: "high",
		});
	});

	test("bare pattern has no thinking level", () => {
		expect(parseModelSpec("sonnet")).toEqual({ pattern: "sonnet" });
	});

	test("does not strip a non-thinking suffix (ids with colons survive)", () => {
		expect(parseModelSpec("openrouter/some-model:exacto")).toEqual({
			pattern: "openrouter/some-model:exacto",
		});
	});

	test("accepts every known level", () => {
		expect(parseModelSpec("m:off").thinkingLevel).toBe("off");
		expect(parseModelSpec("m:minimal").thinkingLevel).toBe("minimal");
		expect(parseModelSpec("m:xhigh").thinkingLevel).toBe("xhigh");
	});
});

describe("resolveModel", () => {
	test("resolves provider/id exactly", () => {
		expect(resolveModel("anthropic/claude-opus-4-5", MODELS)?.id).toBe(
			"claude-opus-4-5",
		);
	});

	test("prefers the alias over a dated snapshot", () => {
		expect(resolveModel("claude-sonnet-4-5", MODELS)?.id).toBe(
			"claude-sonnet-4-5",
		);
	});

	test("resolves by case-insensitive substring of id", () => {
		expect(resolveModel("codex", MODELS)?.id).toBe("gpt-5.2-codex");
	});

	test("resolves by name", () => {
		expect(resolveModel("GPT-4o", MODELS)?.id).toBe("gpt-4o");
	});

	test("substring prefers alias (sonnet → non-dated)", () => {
		expect(resolveModel("sonnet", MODELS)?.id).toBe("claude-sonnet-4-5");
	});

	test("returns undefined when nothing matches", () => {
		expect(resolveModel("does-not-exist", MODELS)).toBeUndefined();
		expect(resolveModel("", MODELS)).toBeUndefined();
	});
});

describe("ModelRouterStack", () => {
	function frameArgs(label: string, toId: string, fromId = "base") {
		return {
			label,
			restoreProvider: "anthropic",
			restoreId: fromId,
			restoreThinking: "medium" as const,
			switchedToProvider: "anthropic",
			switchedToId: toId,
		};
	}

	test("assigns ascending ids", () => {
		const s = new ModelRouterStack();
		const a = s.push(frameArgs("skill:a", "opus"));
		const b = s.push(frameArgs("skill:b", "sonnet"));
		expect(a.id).toBe(1);
		expect(b.id).toBe(2);
		expect(s.size).toBe(2);
	});

	test("reset succeeds for the top id (LIFO)", () => {
		const s = new ModelRouterStack();
		s.push(frameArgs("skill:a", "opus"));
		const b = s.push(frameArgs("skill:b", "sonnet"));
		const res = s.reset(b.id);
		expect(res.ok).toBe(true);
		if (res.ok) expect(res.frame.id).toBe(b.id);
		expect(s.size).toBe(1);
	});

	test("reset rejects an out-of-order id and names the expected one", () => {
		const s = new ModelRouterStack();
		const a = s.push(frameArgs("skill:a", "opus"));
		const b = s.push(frameArgs("skill:b", "sonnet"));
		const res = s.reset(a.id);
		expect(res.ok).toBe(false);
		if (!res.ok) {
			expect(res.expectedId).toBe(b.id);
			expect(res.error).toContain(`reset_model(${b.id})`);
			// The message names the most-recent skill that must be closed first.
			expect(res.error).toContain(`"skill:b"`);
		}
		expect(s.size).toBe(2); // nothing popped
	});

	test("reset on an empty stack fails cleanly", () => {
		const s = new ModelRouterStack();
		const res = s.reset(1);
		expect(res.ok).toBe(false);
		if (!res.ok) expect(res.error).toContain("nothing to undo");
	});

	test("ids keep ascending even after resets", () => {
		const s = new ModelRouterStack();
		const a = s.push(frameArgs("skill:a", "opus"));
		s.reset(a.id);
		const b = s.push(frameArgs("skill:b", "sonnet"));
		expect(b.id).toBe(2); // not reused
	});

	test("full nested lifecycle restores in reverse order", () => {
		const s = new ModelRouterStack();
		const a = s.push(frameArgs("skill:a", "opus", "base"));
		const b = s.push(frameArgs("skill:b", "codex", "opus"));
		// inner first
		const r1 = s.reset(b.id);
		expect(r1.ok && r1.frame.restoreId).toBe("opus");
		// then outer
		const r2 = s.reset(a.id);
		expect(r2.ok && r2.frame.restoreId).toBe("base");
		expect(s.size).toBe(0);
	});
});

describe("persistence", () => {
	function frameArgs(label: string, toId: string, fromId = "base") {
		return {
			label,
			restoreProvider: "anthropic",
			restoreId: fromId,
			restoreThinking: "medium" as const,
			switchedToProvider: "anthropic",
			switchedToId: toId,
		};
	}

	test("snapshot/restore round-trips ids and frames", () => {
		const s = new ModelRouterStack();
		s.push(frameArgs("skill:a", "opus"));
		s.push(frameArgs("skill:b", "codex", "opus"));
		const snap = s.snapshot();

		const restored = new ModelRouterStack();
		restored.restore(snap);
		expect(restored.size).toBe(2);
		expect(restored.open().map((f) => f.id)).toEqual([1, 2]);
		// Counter is preserved: the next push continues from where it left off.
		expect(restored.push(frameArgs("skill:c", "gpt-4o")).id).toBe(3);
	});

	test("counter is preserved even when no frames remain open", () => {
		const s = new ModelRouterStack();
		const a = s.push(frameArgs("skill:a", "opus"));
		s.reset(a.id);
		const snap = s.snapshot();
		expect(snap.frames).toHaveLength(0);
		expect(snap.counter).toBe(1);

		const restored = new ModelRouterStack();
		restored.restore(snap);
		expect(restored.push(frameArgs("skill:b", "codex")).id).toBe(2); // no id reuse
	});

	test("parseSnapshot accepts a valid shape", () => {
		const snap = new ModelRouterStack();
		snap.push(frameArgs("skill:a", "opus"));
		const parsed = parseSnapshot(structuredClone(snap.snapshot()));
		expect(parsed).toBeDefined();
		expect(parsed?.counter).toBe(1);
		expect(parsed?.frames[0].label).toBe("skill:a");
	});

	test("parseSnapshot rejects malformed data", () => {
		expect(parseSnapshot(undefined)).toBeUndefined();
		expect(parseSnapshot({})).toBeUndefined();
		expect(parseSnapshot({ counter: "x", frames: [] })).toBeUndefined();
		expect(parseSnapshot({ counter: 1, frames: "nope" })).toBeUndefined();
		expect(parseSnapshot({ counter: 1, frames: [{ id: 1 }] })).toBeUndefined(); // frame missing required fields
	});

	test("latestSnapshot picks the most recent matching custom entry", () => {
		const entries = [
			{ type: "message" },
			{
				type: "custom",
				customType: STATE_CUSTOM_TYPE,
				data: { counter: 1, frames: [] },
			},
			{
				type: "custom",
				customType: "something-else",
				data: { counter: 99, frames: [] },
			},
			{
				type: "custom",
				customType: STATE_CUSTOM_TYPE,
				data: {
					counter: 5,
					frames: [
						{
							id: 5,
							label: "skill:z",
							restoreProvider: "anthropic",
							restoreId: "base",
							restoreThinking: "low",
							switchedToProvider: "anthropic",
							switchedToId: "opus",
						},
					],
				},
			},
		];
		const snap = latestSnapshot(entries);
		expect(snap?.counter).toBe(5);
		expect(snap?.frames[0].id).toBe(5);
	});

	test("latestSnapshot returns undefined when none present", () => {
		expect(
			latestSnapshot([
				{ type: "message" },
				{ type: "custom", customType: "x" },
			]),
		).toBeUndefined();
		expect(latestSnapshot([])).toBeUndefined();
	});
});

describe("message builders", () => {
	const frame = {
		id: 3,
		label: "skill:heavy-refactor",
		restoreProvider: "anthropic",
		restoreId: "claude-sonnet-4-5",
		restoreThinking: "medium" as const,
		switchedToProvider: "anthropic",
		switchedToId: "claude-opus-4-5",
		switchedToThinking: "high" as const,
	};

	test("switch note mentions the id and reset call", () => {
		const note = buildSwitchNote(
			frame,
			"anthropic/claude-sonnet-4-5",
			"anthropic/claude-opus-4-5",
		);
		expect(note).toContain("injection #3");
		expect(note).toContain("reset_model(3)");
		expect(note).toContain("thinking: high");
	});

	test("standing reminder lists open frames and the highest id", () => {
		const reminder = buildStandingReminder([frame]);
		expect(reminder).toContain("#3");
		expect(reminder).toContain("reset_model(3)");
		expect(reminder).toContain("claude-opus-4-5");
	});
});
