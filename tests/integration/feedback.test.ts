/**
 * `tw_feedback` against the real runtime.
 *
 * The unit tests stub the tool context. These two run inside a real
 * `AgentSession`, with pi-telemetry replaced by a custom tool that records what
 * it receives, so the contract `tw_feedback` depends on is the one pi actually
 * provides: `ctx.tools` exposes each callable tool's parameter schema, and
 * `ctx.executeTool` runs the sibling tool as a nested call.
 */

import { Type, type TSchema } from "typebox";
import { afterEach, describe, expect, test } from "vitest";

import taskWorkflow from "../../src/pi.js";
import { call, createTaskSession, reply, type TaskSession } from "./harness.js";

let sessions: TaskSession[] = [];
afterEach(() => {
  for (const session of sessions) session.dispose();
  sessions = [];
});

/** A stand-in for pi-telemetry's `submit_feedback`, as a real extension. */
function fakeTelemetry(withSource: boolean) {
  const calls: Array<Record<string, unknown>> = [];
  const payload = Type.Union([Type.String(), Type.Record(Type.String(), Type.Unknown())]);
  const parameters: TSchema = withSource
    ? Type.Object({ source: Type.Optional(Type.String()), kind: Type.String(), data: payload })
    : Type.Object({ kind: Type.String(), data: payload });
  // Registered as an extension, not a custom tool: pi's `ctx.tools` lists
  // extension-registered tools, and the schema it reports is the whole point of
  // the adaptation.
  const extension = (pi: any) => {
    pi.registerTool({
      name: "submit_feedback",
      label: "Submit Feedback",
      description: "Feedback store stand-in.",
      parameters,
      execute: async (_id: string, args: Record<string, unknown>) => {
        calls.push(args);
        return { content: [{ type: "text" as const, text: "Feedback recorded." }], details: {} };
      },
    });
  };
  return { calls, extension };
}

describe("tw_feedback: the labelled route into the telemetry store", () => {
  test("prefixes the kind when the installed store has no source parameter", async () => {
    const telemetry = fakeTelemetry(false);
    const s = await createTaskSession({
      extensions: [taskWorkflow, telemetry.extension],
      // Both, because a nested call only reaches an active tool: the allowlist
      // is the whole active set, so the store has to be named beside the
      // wrapper that calls it.
      tools: ["tw_feedback", "submit_feedback"],
    });
    sessions.push(s);

    s.setResponses([reply([call("tw_feedback", { kind: "friction", data: "the frontier stalled twice" })])]);
    await s.session.prompt("Record that the frontier stalled twice.");

    expect(telemetry.calls).toEqual([{ kind: "workflow.friction", data: "the frontier stalled twice" }]);
    // The store call is the wrapper's nested call, not a model-issued one.
    const starts = s.events.filter(
      (e): e is Extract<typeof e, { type: "tool_execution_start" }> =>
        e.type === "tool_execution_start" && e.toolName === "submit_feedback",
    );
    expect(starts).toHaveLength(1);
    expect(starts[0]!.parentToolCallId).toBeTruthy();
  });

  test("passes the source and a bare kind once the store declares one", async () => {
    const telemetry = fakeTelemetry(true);
    const s = await createTaskSession({
      extensions: [taskWorkflow, telemetry.extension],
      // Both, because a nested call only reaches an active tool: the allowlist
      // is the whole active set, so the store has to be named beside the
      // wrapper that calls it.
      tools: ["tw_feedback", "submit_feedback"],
    });
    sessions.push(s);

    s.setResponses([reply([call("tw_feedback", { kind: "expected", data: "the split fired" })])]);
    await s.session.prompt("Record that the split fired.");

    // The shipped contract: source says workflow, and the kind stays a signal.
    expect(telemetry.calls).toEqual([{ source: "workflow", kind: "expected", data: "the split fired" }]);
  });

  test("the schema refuses a kind outside the pre-approved list", async () => {
    const telemetry = fakeTelemetry(false);
    const s = await createTaskSession({
      extensions: [taskWorkflow, telemetry.extension],
      // Both, because a nested call only reaches an active tool: the allowlist
      // is the whole active set, so the store has to be named beside the
      // wrapper that calls it.
      tools: ["tw_feedback", "submit_feedback"],
    });
    sessions.push(s);

    s.setResponses([reply([call("tw_feedback", { kind: "whatever", data: "note" })])]);
    await s.session.prompt("Record something vague.");

    expect(telemetry.calls).toEqual([]);
    const result = s.events.find(
      (e): e is Extract<typeof e, { type: "tool_execution_end" }> =>
        e.type === "tool_execution_end" && e.toolName === "tw_feedback",
    );
    expect(result?.isError).toBe(true);
  });
});
