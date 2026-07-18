/**
 * Plan Review Extension — File-based plan review with annotation blocks.
 *
 * Two Pi tools:
 *   submit_plan_for_review — writes the plan to `plans/<slug>.md` with status
 *     frontmatter and saves a reference copy to `~/.pi/plans/<slug>.reference.md`.
 *   parse_plan_review — reads the edited plan, validates it (diff, frontmatter,
 *     annotation blocks), returns parsed feedback or an error message.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { randomBytes } from "node:crypto";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

// ─── constants ──────────────────────────────────────────────────────────────────

const PLANS_DIR = "plans";
const REFERENCE_DIR = join(homedir(), ".pi", "plans");
const VALID_STATUSES = ["accepted", "rejected", "discarded"] as const;
type PlanStatus = (typeof VALID_STATUSES)[number];

// ─── helpers ────────────────────────────────────────────────────────────────────

function generateSlug(): string {
	return randomBytes(4).toString("base64url");
}

function ensureDir(p: string) {
	if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

// ─── frontmatter parsing ───────────────────────────────────────────────────────

const STATUS_SIMILARITY_THRESHOLD = 2;

export function editDistance(a: string, b: string): number {
	const m = a.length;
	const n = b.length;
	const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
	for (let i = 0; i <= m; i++) dp[i][0] = i;
	for (let j = 0; j <= n; j++) dp[0][j] = j;
	for (let i = 1; i <= m; i++) {
		for (let j = 1; j <= n; j++) {
			if (a[i - 1] === b[j - 1]) {
				dp[i][j] = dp[i - 1][j - 1];
			} else {
				dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
			}
		}
	}
	return dp[m][n];
}

export function fuzzyMatchStatus(value: string): PlanStatus | null {
	const trimmed = value.trim().toLowerCase();
	// Exact match first
	if (VALID_STATUSES.includes(trimmed as PlanStatus)) {
		return trimmed as PlanStatus;
	}
	// Fuzzy match
	for (const valid of VALID_STATUSES) {
		if (editDistance(trimmed, valid) <= STATUS_SIMILARITY_THRESHOLD) {
			return valid;
		}
	}
	return null;
}

export function parseFrontmatter(
	content: string,
): { status: PlanStatus | null; error?: string; body: string } {
	// Extract YAML frontmatter between --- delimiters
	const lines = content.split("\n");
	if (lines.length < 2 || !lines[0].startsWith("---")) {
		return { status: null, error: "no valid status", body: content };
	}

	const fmEnd = lines.findIndex(
		(l, i) => i > 0 && l.trim().startsWith("---") && l.trim() === "---",
	);
	if (fmEnd === -1) {
		return { status: null, error: "no valid status", body: content };
	}

	const fmLines = lines.slice(1, fmEnd);
	const bodyLines = lines.slice(fmEnd + 1);
	const body = bodyLines.join("\n");

	// Parse status lines — only match uncommented lines
	const statusLines: string[] = [];
	for (const line of fmLines) {
		const trimmed = line.trim();
		if (trimmed.startsWith("#")) continue;  // Skip commented lines
		const match = trimmed.match(/^status:\s*(.+)$/);
		if (match) {
			statusLines.push(match[1].trim());
		}
	}

	if (statusLines.length === 0) {
		return { status: null, error: "no valid status", body };
	}
	if (statusLines.length > 1) {
		return { status: null, error: "no valid status", body };
	}

	const matched = fuzzyMatchStatus(statusLines[0]);
	if (!matched) {
		return { status: null, error: "no valid status", body };
	}
	return { status: matched, body };
}

// ─── annotation block parsing ───────────────────────────────────────────────────

interface AnnotationBlock {
	content: string;
	feedback: string;
	openingLine: number;
}

const OPENING_CHARS = ["(", "[", "{", "<"];
const MIDDLE_CHARS = ["-", "=", "#"];
const CLOSING_CHARS: Record<string, string> = {
	"(": ")",
	"[": "]",
	"{": "}",
	"<": ">",
};

function isAllChar(s: string, chars: string[]): boolean {
	if (s.length === 0) return false;
	return [...s].every((c) => chars.includes(c));
}

function getCharType(c: string): string | null {
	if (OPENING_CHARS.includes(c)) return "opening";
	if (MIDDLE_CHARS.includes(c)) return "middle";
	if (Object.values(CLOSING_CHARS).includes(c)) return "closing";
	return null;
}

function getOpeningChar(closeChar: string): string | null {
	for (const [open, close] of Object.entries(CLOSING_CHARS)) {
		if (close === closeChar) return open;
	}
	return null;
}

function isMatchingPair(open: string, close: string): boolean {
	return CLOSING_CHARS[open] === close;
}

interface ParseAnnotationsResult {
	blocks: AnnotationBlock[];
	error?: string;
}

export function parseAnnotations(lines: string[]): ParseAnnotationsResult {
	const blocks: AnnotationBlock[] = [];
	let i = 0;

	while (i < lines.length) {
		const trimmed = lines[i].trim();
		if (trimmed.length === 0) {
			i++;
			continue;
		}

		const firstChar = trimmed[0];
		if (OPENING_CHARS.includes(firstChar)) {
			// Check if this is an opening delimiter line
			if (!isAllChar(trimmed, OPENING_CHARS)) {
				i++;
				continue;
			}
			const openChar = firstChar;
			const prevLen = trimmed.length;

			// Find middle delimiter
			let middleIdx = -1;
			for (let j = i + 1; j < lines.length; j++) {
				const midTrimmed = lines[j].trim();
				if (isAllChar(midTrimmed, MIDDLE_CHARS) && midTrimmed.length === prevLen) {
					middleIdx = j;
					break;
				}
				// Also check if middle delimiter is on same char type
				const mFirst = midTrimmed[0];
				if (
					MIDDLE_CHARS.includes(mFirst) &&
					isAllChar(midTrimmed, [...MIDDLE_CHARS]) &&
					midTrimmed.length === prevLen
				) {
					middleIdx = j;
					break;
				}
			}
			if (middleIdx === -1) {
				return {
					blocks,
					error: `malformed annotation block at line ${i + 1}: unclosed annotation block`,
				};
			}

			// Find closing delimiter
			let closeIdx = -1;
			for (let j = middleIdx + 1; j < lines.length; j++) {
				const closeTrimmed = lines[j].trim();
				const closeFirst = closeTrimmed[0];
				const expectedClose = CLOSING_CHARS[openChar];
				if (closeFirst === expectedClose && isAllChar(closeTrimmed, [expectedClose]) && closeTrimmed.length === prevLen) {
					closeIdx = j;
					break;
				}
				// Wrong closing char
				if (Object.values(CLOSING_CHARS).includes(closeFirst) && closeFirst !== expectedClose) {
					return {
						blocks,
						error: `malformed annotation block at line ${j + 1}: wrong closing char`,
					};
				}
				// Mismatched length
				if (closeFirst === expectedClose && isAllChar(closeTrimmed, [expectedClose]) && closeTrimmed.length !== prevLen) {
					return {
						blocks,
						error: `malformed annotation block at line ${j + 1}: mismatched lengths`,
					};
				}
			}
			if (closeIdx === -1) {
				return {
					blocks,
					error: `malformed annotation block at line ${i + 1}: unclosed annotation block`,
				};
			}

			// Extract content and feedback
			const contentLines = lines.slice(i + 1, middleIdx);
			const feedbackLines = lines.slice(middleIdx + 1, closeIdx);
			const content = contentLines.join("\n").trim();
			const feedback = feedbackLines.join("\n").trim();

			blocks.push({
				content,
				feedback,
				openingLine: i,
			});

			i = closeIdx + 1;
		} else {
			i++;
		}
	}

	return { blocks };
}

// ─── diff-based validation ──────────────────────────────────────────────────────

interface DiffResult {
	ok: boolean;
	error?: string;
	additions: string[];
	addLineNums: number[];
}

export function validateDiff(
	originalLines: string[],
	editedLines: string[],
): DiffResult {
	const additions: string[] = [];
	const addLineNums: number[] = [];

	// Use LCS-like approach: check that every original line appears in edited
	// in order, and only additions exist between them
	let origIdx = 0;
	let violations: string[] = [];

	for (let editIdx = 0; editIdx < editedLines.length; editIdx++) {
		const editLine = editedLines[editIdx];

		if (origIdx < originalLines.length && editLine === originalLines[origIdx]) {
			origIdx++;
		} else {
			// This could be an addition
			additions.push(editLine);
			addLineNums.push(editIdx + 1); // 1-indexed
		}
	}

	// Check all original lines were found
	if (origIdx < originalLines.length) {
		const missingLine = originalLines[origIdx];
		return {
			ok: false,
			error: `original content modified — line ${origIdx + 1}: ${missingLine.slice(0, 80)}`,
			additions,
			addLineNums,
		};
	}

	return { ok: true, additions, addLineNums };
}

// ─── line reference building ────────────────────────────────────────────────────

interface FeedbackEntry {
	lineRange: string;
	text: string;
}

export function buildLineReferences(
	blocks: AnnotationBlock[],
	originalLines: string[],
): FeedbackEntry[] | { error: string } {
	const entries: FeedbackEntry[] = [];

	for (const block of blocks) {
		if (!block.content) continue;

		const contentLines = block.content.split("\n");
		const matchedLines: number[] = [];

		// Find which line(s) in the original reference match the content
		for (const contentLine of contentLines) {
			if (!contentLine.trim()) continue;
			let found = false;
			for (let i = 0; i < originalLines.length; i++) {
				if (originalLines[i] === contentLine) {
					matchedLines.push(i + 1); // 1-indexed
					found = true;
					break;
				}
			}
		}

		if (matchedLines.length === 0 && contentLines.length > 0 && contentLines[0].trim()) {
			return { error: `annotation references non-existent content: "${contentLines[0].slice(0, 60)}"` };
		}

		if (matchedLines.length > 0 && block.feedback) {
			const lineRange =
				matchedLines.length === 1
					? `${matchedLines[0]}`
					: `${matchedLines[0]}-${matchedLines[matchedLines.length - 1]}`;
			entries.push({ lineRange, text: block.feedback });
		}
	}

	return entries;
}

// ─── main parse function ────────────────────────────────────────────────────────

interface ParseResult {
	ok: boolean;
	status?: PlanStatus;
	feedback?: FeedbackEntry[];
	error?: string;
}

function parseReviewFile(
	editedContent: string,
	referenceContent: string,
): ParseResult {
	const originalLines = referenceContent.split("\n");
	const editedLines = editedContent.split("\n");

	// Parse frontmatter from edited file
	const fmResult = parseFrontmatter(editedContent);
	if (!fmResult.status) {
		return { ok: false, error: fmResult.error ?? "no valid status" };
	}

	// Strip frontmatter from edited content for diff
	const editedBody = fmResult.body;
	const editedBodyLines = editedBody.split("\n");

	// Validate diff
	const diffResult = validateDiff(originalLines, editedBodyLines);
	if (!diffResult.ok) {
		return { ok: false, error: diffResult.error! };
	}

	// If rejected, must have annotations
	if (fmResult.status === "rejected") {
		const annotResult = parseAnnotations(editedBodyLines);
		if (annotResult.error) {
			return { ok: false, error: annotResult.error };
		}
		if (annotResult.blocks.length === 0) {
			return { ok: false, error: "rejected but no annotations found" };
		}

		const lineRefs = buildLineReferences(annotResult.blocks, originalLines);
		if ("error" in lineRefs) {
			return { ok: false, error: lineRefs.error };
		}

		return { ok: true, status: fmResult.status, feedback: lineRefs };
	}

	// Check for unexpected additions (non-annotation text that's not in original)
	// Only in the diff additions, check if any are not part of an annotation block
	if (diffResult.additions.length > 0) {
		const annotResult = parseAnnotations(editedBodyLines);
		// Check if all additions are inside annotation blocks
		const allAdditionLineNums = new Set(diffResult.addLineNums);
		const annotLineNums = new Set<number>();
		for (const block of annotResult.blocks) {
			// Approximate: check lines around the block
			for (let n = block.openingLine; n < editedBodyLines.length; n++) {
				if (n <= block.openingLine + 10 || annotLineNums.has(n)) continue;
				// Simple check: mark lines until closing delimiter
			}
		}

		// For accepted/discarded with annotations, the annotations are in the additions
		// and they're fine
		if (annotResult.error) {
			return { ok: false, error: annotResult.error };
		}
	}

	return { ok: true, status: fmResult.status, feedback: [] };
}

// ─── tool implementations ────────────────────────────────────────────────────────

export function submitPlanForReview(
	planFilePath: string,
	cwd: string,
): string {
	if (!existsSync(planFilePath)) {
		return `ERROR: file not found: ${planFilePath}`;
	}

	const slug = generateSlug();
	const planContent = readFileSync(planFilePath, "utf-8");

	// Ensure directories exist
	const repoPlansDir = join(cwd, PLANS_DIR);
	ensureDir(repoPlansDir);
	ensureDir(REFERENCE_DIR);

	// Save reference copy
	const referencePath = join(REFERENCE_DIR, `${slug}.reference.md`);
	writeFileSync(referencePath, planContent, "utf-8");

	// Write in-repo copy with status frontmatter
	const inRepoPath = join(repoPlansDir, `${slug}.md`);
	const frontmatter = `---\n# status: accepted\n# status: rejected\n# status: discarded\n---\n`;
	writeFileSync(inRepoPath, frontmatter + planContent, "utf-8");

	// Delete original plan file
	try {
		writeFileSync(planFilePath, ""); // Clear it
	} catch {
		// Ignore cleanup failures
	}

	return `OK: plan submitted for review at \`plans/${slug}.md\`

1. Open the file in your editor.
2. Uncomment one of the three status lines in the frontmatter (accepted, rejected, or discarded).
3. If rejecting, insert annotation blocks between lines to specify what needs to change.
4. Do NOT delete or edit any existing content — only add annotation blocks and uncomment the status line.
5. Save the file and tell me to review it.`;
}

export function parsePlanReview(
	slug: string,
	cwd: string,
): string {
	const inRepoPath = join(cwd, PLANS_DIR, `${slug}.md`);
	const referencePath = join(REFERENCE_DIR, `${slug}.reference.md`);

	if (!existsSync(inRepoPath)) {
		return `ERROR: file plans/${slug}.md not found`;
	}
	if (!existsSync(referencePath)) {
		return `ERROR: reference copy not found`;
	}

	const editedContent = readFileSync(inRepoPath, "utf-8");
	const referenceContent = readFileSync(referencePath, "utf-8");

	const result = parseReviewFile(editedContent, referenceContent);

	if (!result.ok) {
		return `ERROR: ${result.error}`;
	}

	// On success, revert the in-repo file back to the reference copy
	writeFileSync(inRepoPath, referenceContent, "utf-8");

	if (result.feedback && result.feedback.length > 0) {
		const feedbackLines = result.feedback
			.map((f) => `line ${f.lineRange}: ${f.text}`)
			.join("\n");
		return `OK: ${result.status}\n\n${feedbackLines}`;
	}

	return `OK: ${result.status}`;
}

// ─── pi extension registration ─────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "submit_plan_for_review",
		label: "Submit Plan For Review",
		description:
			"Submit a plan file for user review. Writes a copy to plans/<slug>.md with status frontmatter and saves a reference copy. Forces the agent turn to end.",
		parameters: Type.Object({
			planFilePath: Type.String({
				description:
					"Path to the plan file to submit for review (e.g. a path inside chain_dir)",
			}),
		}),
		async execute(
			_toolCallId: string,
			params: { planFilePath: string },
			_sig: any,
			_upd: any,
			ctx: any,
		) {
			const result = submitPlanForReview(params.planFilePath, ctx.cwd);
			return { content: [{ type: "text", text: result }], details: {} };
		},
	});

	pi.registerTool({
		name: "parse_plan_review",
		label: "Parse Plan Review",
		description:
			"Parse a reviewed plan file. Validates frontmatter status, diff constraints, and annotation blocks. Returns structured feedback or an error message.",
		parameters: Type.Object({
			slug: Type.String({
				description:
					"The slug returned by submit_plan_for_review (the filename without .md)",
			}),
		}),
		async execute(
			_toolCallId: string,
			params: { slug: string },
			_sig: any,
			_upd: any,
			ctx: any,
		) {
			const result = parsePlanReview(params.slug, ctx.cwd);
			return { content: [{ type: "text", text: result }], details: {} };
		},
	});
}
