/**
 * Workflow feedback: the `tw_feedback` wrapper and the argument adaptation it
 * performs against the installed `submit_feedback` schema.
 *
 * Pure tests for `feedbackCall`, plus the tool driven through `createTools()`
 * with a stub tool context, so both telemetry shapes and every refusal are
 * pinned without pi-telemetry installed.
 */

import { describe, expect, test } from "vitest";

import { FEEDBACK_KINDS, WORKFLOW_SOURCE, declaresSource, feedbackCall, isFeedbackKind } from "../src/core/feedback.js";
import { SKILL_REGISTRY } from "../src/disclosure.js";
import { createTools } from "../src/pi.js";

/** The parameter schema pi-telemetry registers today: kind plus data. */
const WITHOUT_SOURCE = {
  type: "object",
  properties: {
    kind: { type: "string" },
    data: { anyOf: [{ type: "string" }, { type: "object" }] },
  },
  required: ["kind", "data"],
};

/** The shape once pi-telemetry takes a source of its own. */
const WITH_SOURCE = {
  type: "object",
  properties: {
    source: { type: "string" },
    kind: { type: "string" },
    data: { anyOf: [{ type: "string" }, { type: "object" }] },
  },
  required: ["kind", "data"],
};

describe("declaresSource", () => {
  test("reads the properties map of either schema shape", () => {
    expect(declaresSource(WITH_SOURCE)).toBe(true);
    expect(declaresSource(WITHOUT_SOURCE)).toBe(false);
  });

  test("reports false for anything it cannot read", () => {
    expect(declaresSource(undefined)).toBe(false);
    expect(declaresSource(null)).toBe(false);
    expect(declaresSource("source")).toBe(false);
    expect(declaresSource({})).toBe(false);
    expect(declaresSource({ properties: null })).toBe(false);
  });
});

describe("isFeedbackKind", () => {
  test("accepts the pre-approved signals only", () => {
    for (const kind of FEEDBACK_KINDS) expect(isFeedbackKind(kind)).toBe(true);
    for (const kind of ["friction ", "Good", "nope", "", undefined, 7]) {
      expect(isFeedbackKind(kind)).toBe(false);
    }
  });
});

describe("feedbackCall", () => {
  test("uses the source parameter when the installed tool declares one", () => {
    const call = feedbackCall("bad", "the frontier stalled twice", WITH_SOURCE);
    expect(call.args).toEqual({ source: "workflow", kind: "bad", data: "the frontier stalled twice" });
    expect(call.namespaced).toBe(false);
  });

  test("falls back to the kind prefix when the tool has no source parameter", () => {
    const call = feedbackCall("bad", "the frontier stalled twice", WITHOUT_SOURCE);
    expect(call.args).toEqual({ kind: "workflow.bad", data: "the frontier stalled twice" });
    expect(call.namespaced).toBe(true);
  });

  test("takes the prefix path when the schema is unknown", () => {
    // The namespaced kind is accepted by both shapes, so a harness that hides
    // the schema still records a correctly labelled row.
    const call = feedbackCall("friction", "note", undefined);
    expect(call.args).toEqual({ kind: "workflow.friction", data: "note" });
    expect(call.namespaced).toBe(true);
  });

  test("passes an object payload through untouched", () => {
    const data = { signal: "bad", note: "landing conflicted on an independent ticket" };
    expect(feedbackCall("bad", data, WITHOUT_SOURCE).args.data).toBe(data);
    expect(feedbackCall("bad", data, WITH_SOURCE).args.data).toBe(data);
  });

  test("names every approved kind in the refusal for an unknown one", () => {
    expect(() => feedbackCall("meh", "note", WITHOUT_SOURCE)).toThrow(/good, bad, friction, architecture, expected/);
  });

  test("refuses empty and unusable payloads", () => {
    expect(() => feedbackCall("bad", "", WITHOUT_SOURCE)).toThrow(/empty/);
    expect(() => feedbackCall("bad", "   ", WITHOUT_SOURCE)).toThrow(/empty/);
    expect(() => feedbackCall("bad", undefined, WITHOUT_SOURCE)).toThrow(/string or an object/);
    expect(() => feedbackCall("bad", 7, WITHOUT_SOURCE)).toThrow(/string or an object/);
  });
});

// ─── The tool, driven through createTools() ─────────────────────────────────

interface NestedCall {
  name: string;
  args: Record<string, unknown>;
}

interface ToolResult {
  text: string;
  details: { recorded?: boolean; kind?: string; namespaced?: boolean; args?: Record<string, unknown> };
}

function tools() {
  return createTools() as unknown as Record<string, { execute: Function; parameters?: unknown }>;
}

/** A tool context whose nested call is recorded instead of executed. */
function stubCtx(
  options: {
    tools?: Array<{ name: string; parameters?: unknown }>;
    noExecutor?: boolean;
    nestedError?: string;
  } = {},
) {
  const calls: NestedCall[] = [];
  const ctx = {
    directory: process.cwd(),
    ...(options.noExecutor
      ? {}
      : {
          executeTool: async (name: string, args: Record<string, unknown>) => {
            calls.push({ name, args });
            if (options.nestedError !== undefined) {
              return { isError: true, content: [{ type: "text", text: options.nestedError }] };
            }
            return { isError: false, content: [{ type: "text", text: "Feedback recorded." }] };
          },
        }),
    ...(options.tools === undefined ? {} : { tools: options.tools }),
  };
  return { ctx, calls };
}

describe("tw_feedback", () => {
  test("registers a kind enum of the pre-approved signals and a data payload", () => {
    const schema = tools().tw_feedback.parameters as any;
    expect(schema.type).toBe("object");
    expect(Object.keys(schema.properties).sort()).toEqual(["data", "kind"]);
    const kindSchema = JSON.stringify(schema.properties.kind);
    for (const kind of FEEDBACK_KINDS) expect(kindSchema).toContain(`"${kind}"`);
    expect(schema.required?.sort() ?? []).toEqual(["data", "kind"]);
  });

  test("routes a bare kind with the workflow source when the sibling declares source", async () => {
    const t = tools();
    const { ctx, calls } = stubCtx({ tools: [{ name: "submit_feedback", parameters: WITH_SOURCE }] });
    const result = (await t.tw_feedback.execute({ kind: "bad", data: "frontier stalled" }, ctx)) as ToolResult;
    expect(calls).toEqual([{ name: "submit_feedback", args: { source: "workflow", kind: "bad", data: "frontier stalled" } }]);
    expect(result.details).toMatchObject({ recorded: true, kind: "bad", namespaced: false });
    expect(result.text).toContain(WORKFLOW_SOURCE);
  });

  test("prefixes the kind when the sibling has no source parameter", async () => {
    const t = tools();
    const { ctx, calls } = stubCtx({ tools: [{ name: "submit_feedback", parameters: WITHOUT_SOURCE }] });
    const result = (await t.tw_feedback.execute({ kind: "friction", data: "note" }, ctx)) as ToolResult;
    expect(calls).toEqual([{ name: "submit_feedback", args: { kind: "workflow.friction", data: "note" } }]);
    expect(result.details).toMatchObject({ recorded: true, namespaced: true });
    expect(result.text).toContain("workflow.friction");
  });

  test("prefers the source shape over the prefix once the sibling declares source", async () => {
    const t = tools();
    const { ctx, calls } = stubCtx({ tools: [{ name: "submit_feedback", parameters: WITH_SOURCE }] });
    await t.tw_feedback.execute({ kind: "expected", data: "split fired" }, ctx);
    expect(calls[0].args).not.toHaveProperty("kind", "workflow.expected");
    expect(calls[0].args.kind).toBe("expected");
  });

  test("names the install when the store is not there at all", async () => {
    const t = tools();
    const { ctx } = stubCtx({
      tools: [{ name: "read" }, { name: "bash" }],
      nestedError: "Tool submit_feedback not found",
    });
    await expect(t.tw_feedback.execute({ kind: "bad", data: "note" }, ctx)).rejects.toThrow(
      /Tool submit_feedback not found[\s\S]*pi install npm:@y4shin\/pi-telemetry/,
    );
  });

  test("does not name the install when the store is registered", async () => {
    const t = tools();
    const { ctx } = stubCtx({
      tools: [{ name: "submit_feedback", parameters: WITHOUT_SOURCE }],
      nestedError: "no active session",
    });
    await expect(t.tw_feedback.execute({ kind: "bad", data: "note" }, ctx)).rejects.toThrow(
      /^the workflow feedback was not recorded: no active session$/,
    );
  });

  test("refuses without a tool executor", async () => {
    const t = tools();
    const { ctx } = stubCtx({ noExecutor: true, tools: [{ name: "submit_feedback", parameters: WITHOUT_SOURCE }] });
    await expect(t.tw_feedback.execute({ kind: "bad", data: "note" }, ctx)).rejects.toThrow(/session-bound tool executor/);
  });

  test("surfaces a refused nested call with its reason", async () => {
    const t = tools();
    const { ctx } = stubCtx({
      tools: [{ name: "submit_feedback", parameters: WITHOUT_SOURCE }],
      nestedError: "payload too large",
    });
    await expect(t.tw_feedback.execute({ kind: "bad", data: "note" }, ctx)).rejects.toThrow(/payload too large/);
  });

  test("validates the kind on the direct path too", async () => {
    // A direct execute() bypasses pi's schema validation, so the tool checks
    // the enum itself rather than trusting the caller.
    const t = tools();
    const { ctx, calls } = stubCtx({ tools: [{ name: "submit_feedback", parameters: WITHOUT_SOURCE }] });
    await expect(t.tw_feedback.execute({ kind: "whatever", data: "note" }, ctx)).rejects.toThrow(/not a workflow feedback kind/);
    expect(calls).toEqual([]);
  });

  test("is gated: every phase discloses it, so no open phase is left unable to report", () => {
    // The registration policy test in gate-factory pins defaultActive false for
    // every gated tool; this pins the disclosure side of the same rule.
    for (const entry of SKILL_REGISTRY) {
      expect(entry.toolset, `${entry.name} cannot report friction`).toContain("tw_feedback");
    }
  });
});
