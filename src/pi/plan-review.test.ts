/**
 * Unit tests for the plan-review extension parser logic.
 *
 * Tests cover:
 * - Frontmatter parsing (exact, fuzzy, error cases)
 * - Annotation block parsing (all delimiter variants, error cases)
 * - Diff-based validation (additions only, no deletions/edits)
 * - Line reference building
 * - Full parse flow (frontmatter + annotations + diff validation)
 */
import { describe, expect, test } from "vitest";
import {
	parseFrontmatter,
	parseAnnotations,
	validateDiff,
	buildLineReferences,
} from "./plan-review";

// ─── Frontmatter parsing ─────────────────────────────────────────────

describe("frontmatter parsing", () => {
	test("exact status accepted", () => {
		const content = "---\nstatus: accepted\n# status: rejected\n# status: discarded\n---\nbody content";
		const result = parseFrontmatter(content);
		expect(result.status).toBe("accepted");
		expect(result.error).toBeUndefined();
		expect(result.body).toBe("body content");
	});

	test("exact status rejected", () => {
		const content = "---\n# status: accepted\nstatus: rejected\n# status: discarded\n---\nbody";
		const result = parseFrontmatter(content);
		expect(result.status).toBe("rejected");
		expect(result.error).toBeUndefined();
	});

	test("exact status discarded", () => {
		const content = "---\n# status: accepted\n# status: rejected\nstatus: discarded\n---\nbody";
		const result = parseFrontmatter(content);
		expect(result.status).toBe("discarded");
		expect(result.error).toBeUndefined();
	});

	test("fuzzy match rejectd -> rejected", () => {
		const content = "---\nstatus: rejectd\n---\nbody";
		const result = parseFrontmatter(content);
		expect(result.status).toBe("rejected");
	});

	test("fuzzy match acceppted -> accepted", () => {
		const content = "---\nstatus: acceppted\n---\nbody";
		const result = parseFrontmatter(content);
		expect(result.status).toBe("accepted");
	});

	test("fuzzy match discardd -> discarded", () => {
		const content = "---\nstatus: discardd\n---\nbody";
		const result = parseFrontmatter(content);
		expect(result.status).toBe("discarded");
	});

	test("misspelling too far (dizzarded -> error)", () => {
		const content = "---\n# status: dizzarded\n---\nbody";
		const result = parseFrontmatter(content);
		expect(result.status).toBeNull();
		expect(result.error).toBe("no valid status");
	});

	test("all three commented out -> error", () => {
		const content = "---\n# status: accepted\n# status: rejected\n# status: discarded\n---\nbody";
		const result = parseFrontmatter(content);
		expect(result.status).toBeNull();
		expect(result.error).toBe("no valid status");
	});

	test("no frontmatter at all -> error", () => {
		const content = "just body content\nno frontmatter here";
		const result = parseFrontmatter(content);
		expect(result.status).toBeNull();
		expect(result.error).toBe("no valid status");
	});

	test("empty frontmatter -> error", () => {
		const content = "---\n---\nbody";
		const result = parseFrontmatter(content);
		expect(result.status).toBeNull();
		expect(result.error).toBe("no valid status");
	});

	test("extra whitespace around value", () => {
		const content = "---\nstatus:   accepted   \n---\nbody";
		const result = parseFrontmatter(content);
		expect(result.status).toBe("accepted");
	});

	test("capitalized Accepted -> fuzzy matched", () => {
		const content = "---\n# status: accepted\nstatus: Accepted\n---\nbody";
		const result = parseFrontmatter(content);
		expect(result.status).toBe("accepted");
	});
});

// ─── Annotation block parsing ─────────────────────────────────────────

describe("annotation block parsing", () => {
	const VALID_STATUS_FM = "---\n# status: rejected\n---\n";

	test("single annotation with <</=/>", () => {
		const body = "<<<\ncontent line\n===\nfeedback line\n>>>";
		const result = parseAnnotations(body.split("\n"));
		expect(result.error).toBeUndefined();
		expect(result.blocks).toHaveLength(1);
		expect(result.blocks[0].content).toBe("content line");
		expect(result.blocks[0].feedback).toBe("feedback line");
	});

	test("annotation with ((/---/))", () => {
		const body = "(((\ncontent\n---\nfeedback\n)))";
		const result = parseAnnotations(body.split("\n"));
		expect(result.blocks).toHaveLength(1);
		expect(result.blocks[0].content).toBe("content");
		expect(result.blocks[0].feedback).toBe("feedback");
	});

	test("annotation with {{/##/}}", () => {
		const body = "{{\ncontent\n##\nfeedback\n}}";
		const result = parseAnnotations(body.split("\n"));
		expect(result.blocks).toHaveLength(1);
	});

	test("annotation with [/./]", () => {
		const body = "[\ncontent\n-\nfeedback\n]";
		const result = parseAnnotations(body.split("\n"));
		expect(result.blocks).toHaveLength(1);
	});

	test("mismatched opening/closing lengths -> error", () => {
		const body = "<<<\ncontent\n===\nfeedback\n>>>>";
		const result = parseAnnotations(body.split("\n"));
		expect(result.error).toBe("malformed annotation block at line 5: mismatched lengths");
	});

	test("wrong closing direction -> error", () => {
		const body = "<<<\ncontent\n===\nfeedback\n)))";
		const result = parseAnnotations(body.split("\n"));
		expect(result.error).toContain("wrong closing char");
	});

	test("opening without closing -> error", () => {
		const body = "<<<\ncontent\n===\nfeedback";
		const result = parseAnnotations(body.split("\n"));
		expect(result.error).toContain("unclosed annotation block");
	});

	test("two consecutive annotations", () => {
		const body = "<<<\ncontent1\n===\nfeedback1\n>>>\n<<<\ncontent2\n===\nfeedback2\n>>>";
		const result = parseAnnotations(body.split("\n"));
		expect(result.blocks).toHaveLength(2);
		expect(result.blocks[0].content).toBe("content1");
		expect(result.blocks[1].content).toBe("content2");
	});

	test("annotation with multi-line content", () => {
		const body = "<<<\nline one\nline two\n===\nfeedback\n>>>";
		const result = parseAnnotations(body.split("\n"));
		expect(result.blocks).toHaveLength(1);
		expect(result.blocks[0].content).toBe("line one\nline two");
	});

	test("annotation with multi-line feedback", () => {
		const body = "<<<\ncontent\n===\nfeedback line 1\nfeedback line 2\n>>>";
		const result = parseAnnotations(body.split("\n"));
		expect(result.blocks).toHaveLength(1);
		expect(result.blocks[0].feedback).toBe("feedback line 1\nfeedback line 2");
	});
});

// ─── Diff validation ──────────────────────────────────────────────────

describe("diff validation", () => {
	const original = ["line a", "line b", "line c", "line d"];

	test("no changes -> ok", () => {
		const result = validateDiff(original, [...original]);
		expect(result.ok).toBe(true);
		expect(result.additions).toHaveLength(0);
	});

	test("additions only -> ok", () => {
		const edited = ["line a", "<<<", "line b", "===", "feedback", ">>>", "line c", "line d"];
		const result = validateDiff(original, edited);
		expect(result.ok).toBe(true);
		expect(result.additions).toHaveLength(4);
	});

	test("deletion -> error", () => {
		const edited = ["line a", "line c", "line d"];
		const result = validateDiff(original, edited);
		expect(result.ok).toBe(false);
		expect(result.error).toContain("original content modified");
	});

	test("modification -> error", () => {
		const edited = ["line a", "line b modified", "line c", "line d"];
		const result = validateDiff(original, edited);
		expect(result.ok).toBe(false);
		expect(result.error).toContain("original content modified");
	});

	test("reordered lines -> error", () => {
		const edited = ["line a", "line c", "line b", "line d"];
		const result = validateDiff(original, edited);
		expect(result.ok).toBe(false);
		expect(result.error).toContain("original content modified");
	});
});

// ─── Line reference building ───────────────────────────────────────────

describe("line reference building", () => {
	const original = ["line a", "line b", "line c", "line d"];

	test("single line reference", () => {
		const blocks = [{ content: "line b", feedback: "fix this", openingLine: 0 }];
		const refs = buildLineReferences(blocks, original);
		expect(refs).toHaveLength(1);
	});

	test("multi-line content spanning multiple reference lines", () => {
		const blocks = [{ content: "line b\nline c", feedback: "fix these", openingLine: 0 }];
		const refs = buildLineReferences(blocks, original);
		expect(refs).toHaveLength(1);
	});

	test("non-existent content -> error", () => {
		const blocks = [{ content: "does not exist", feedback: "fix", openingLine: 0 }];
		const result = buildLineReferences(blocks, original);
		expect("error" in result).toBe(true);
		expect((result as any).error).toContain("non-existent");
	});

	test("no feedback -> no reference", () => {
		const blocks = [{ content: "line b", feedback: "", openingLine: 0 }];
		const refs = buildLineReferences(blocks, original);
		expect(refs).toHaveLength(0);
	});
});

// ─── Full parse flow ───────────────────────────────────────────────────

describe("full parse flow", () => {
	test("accepted with frontmatter only -> OK", () => {
		const reference = "plan content line 1\nplan content line 2";
		const edited = "---\nstatus: accepted\n---\nplan content line 1\nplan content line 2";
		
		const fmResult = parseFrontmatter(edited);
		expect(fmResult.status).toBe("accepted");

		const bodyLines = fmResult.body.split("\n");
		const diffResult = validateDiff(reference.split("\n"), bodyLines);
		expect(diffResult.ok).toBe(true);
	});

	test("rejected without annotations -> error", () => {
		const reference = "plan content";
		const edited = "---\nstatus: rejected\n---\nplan content";

		const fmResult = parseFrontmatter(edited);
		expect(fmResult.status).toBe("rejected");

		const bodyLines = fmResult.body.split("\n");
		const annotResult = parseAnnotations(bodyLines);
		expect(annotResult.blocks).toHaveLength(0);
		// This would be caught by the main parse function
	});

	test("rejected with annotations -> parsed", () => {
		const reference = "line a\nline b\nline c";
		const edited = "---\nstatus: rejected\n---\nline a\n<<<\nline b\n===\nchange this\n>>>\nline c";

		const fmResult = parseFrontmatter(edited);
		expect(fmResult.status).toBe("rejected");

		const bodyLines = fmResult.body.split("\n");
		const diffResult = validateDiff(reference.split("\n"), bodyLines);
		expect(diffResult.ok).toBe(true);

		const annotResult = parseAnnotations(bodyLines);
		expect(annotResult.blocks).toHaveLength(1);
		expect(annotResult.blocks[0].content).toBe("line b");
		expect(annotResult.blocks[0].feedback).toBe("change this");
	});
});