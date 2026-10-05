/**
 * Integration tests for the disclosure core: the three-way flip, telemetry
 * absorption, nested opens, and transcript persistence.
 *
 * Spins up a real AgentSession on the faux provider with the real extension,
 * drives tw_open/tw_close/tw_next through canned model turns, and inspects
 * the declared tool set, tool_search reachability, and the transcript.
 *
 * The prototype's O1-O3 is the model here: before open the gated tools are
 * absent, inactive, and unsearchable; after open they are declared and
 * callable; after close they are absent and unsearchable again.
 */

import { afterEach, describe, expect, test } from "vitest";
import { Type } from "typebox";

import { createToolSearchExtension } from "@earendil-works/pi-coding-agent";

import taskWorkflow from "../../src/pi.js";
import {
  call,
  createTaskSession,
  latestToolResultText,
  reply,
  toolCallNames,
  toolResultTexts,
  type TaskSession,
} from "./harness.js";

const sessions: TaskSession[] = [];
afterEach(() => { while (sessions.length) sessions.pop()?.dispose(); });

/** The workflow tools that stay closed until an opener activates them. */
const GATED_WORKFLOW_TOOLS = [
  "tw_close",
  "tw_show",
  "tw_get",
  "tw_set",
  "tw_list",
  "tw_finalizable",
  "tw_dependency_levels",
  "tw_frontier",
  "tw_map_finalizable",
  "tw_resolve_uncertainty",
  "tw_state",
  "tw_state_set",
  "tw_context",
];

/** The declared set idle: exactly the dispatcher pair on the workflow surface. */
const IDLE_WORKFLOW = ["tw_open", "tw_next"];

function disclosureSession(): Promise<TaskSession> {
  return createTaskSession({ extensions: [taskWorkflow, createToolSearchExtension()] });
}

describe("disclosure core: the three-way flip", () => {
  test("before open the gated tools are absent, inactive, and unsearchable", async () => {
    const s = await disclosureSession();
    sessions.push(s);

    const active = s.session.getActiveToolNames();
    for (const name of IDLE_WORKFLOW) {
      expect(active, `${name} is declared idle`).toContain(name);
    }
    for (const name of GATED_WORKFLOW_TOOLS) {
      expect(active, `${name} must be inactive before open`).not.toContain(name);
      expect(s.session.systemPrompt, `${name} must not be declared before open`).not.toContain(name);
    }
  });

  test("after open the gated tools are declared and callable; after close they are gone and unsearchable again", async () => {
    const s = await disclosureSession();
    sessions.push(s);

    s.setResponses([reply([call("tw_open", { skill: "wayfinder", effort: "some-effort" })])]);
    await s.session.prompt("Open wayfinder.");

    const opened = s.session.getActiveToolNames();
    for (const name of ["tw_close", "tw_frontier", "tw_list", "tw_dependency_levels", "tw_get"]) {
      expect(opened, `${name} must be declared once wayfinder is open`).toContain(name);
    }
    for (const name of ["tw_show", "tw_state", "tw_set", "tw_finalizable"]) {
      expect(opened, `${name} belongs to no open skill`).not.toContain(name);
    }

    // Callable: a gated tool really executes once it is declared.
    s.setResponses([reply([call("tw_frontier", { selector: "whatever-effort" })])]);
    await s.session.prompt("Show the frontier.");
    expect(toolCallNames(s.events)).toContain("tw_frontier");
    expect(toolResultTexts(s.session, "tw_frontier").length).toBeGreaterThan(0);

    // Unsearchable while closed: tool_search cannot reach a direct gated
    // tool, before open and after close alike.
    s.setResponses([reply([call("tool_search", { query: "show artifact frontmatter selector" })])]);
    await s.session.prompt("Search for the show tool.");
    const searchResult = latestToolResultText(s.session, "tool_search") ?? "";
    expect(searchResult).not.toContain("tw_show");
    expect(s.session.getActiveToolNames()).not.toContain("tw_show");

    s.setResponses([reply([call("tw_close", { skill: "wayfinder" })])]);
    await s.session.prompt("Close wayfinder.");

    const closed = s.session.getActiveToolNames();
    for (const name of GATED_WORKFLOW_TOOLS) {
      expect(closed, `${name} must be absent after close`).not.toContain(name);
    }
    for (const name of IDLE_WORKFLOW) {
      expect(closed, `${name} is declared idle again`).toContain(name);
    }

    s.setResponses([reply([call("tool_search", { query: "show artifact frontmatter selector" })])]);
    await s.session.prompt("Search again after closing.");
    const searchAfterClose = latestToolResultText(s.session, "tool_search") ?? "";
    expect(searchAfterClose).not.toContain("tw_show");
    expect(s.session.getActiveToolNames()).not.toContain("tw_show");
  });
});

describe("disclosure core: nested opens", () => {
  test("a phase open nests skill-creator, closes it, and the phase stays open with its tools intact", async () => {
    const s = await disclosureSession();
    sessions.push(s);

    // Open a phase.
    s.setResponses([reply([call("tw_open", { skill: "wayfinder", effort: "some-effort" })])]);
    await s.session.prompt("Open wayfinder.");
    const phaseSet = new Set(s.session.getActiveToolNames());

    // Nest skill-creator inside the phase.
    s.setResponses([reply([call("tw_open", { skill: "skill-creator", effort: "some-effort" })])]);
    await s.session.prompt("Nest skill-creator.");

    // The declared set is the union of both toolsets plus the dispatcher trio.
    const nested = new Set(s.session.getActiveToolNames());
    for (const tool of phaseSet) {
      expect(nested.has(tool), `${tool} must survive the nested open`).toBe(true);
    }
    expect(nested.has("tw_show"), "the nested skill's own tool is declared").toBe(true);
    for (const tool of ["tw_open", "tw_next", "tw_close"]) {
      expect(nested.has(tool), `${tool} is declared while skills are open`).toBe(true);
    }

    // Close the nested skill: the phase is still open with its own tools.
    s.setResponses([reply([call("tw_close", { skill: "skill-creator" })])]);
    await s.session.prompt("Close skill-creator.");

    const afterClose = new Set(s.session.getActiveToolNames());
    expect(afterClose.has("tw_show"), "the closed skill's tool is gone").toBe(false);
    for (const tool of phaseSet) {
      expect(afterClose.has(tool), `${tool} keeps the phase open with its own tools intact`).toBe(true);
    }
  });

  test("the opener refuses a duplicate and a conflicting skill without disturbing the set", async () => {
    const s = await disclosureSession();
    sessions.push(s);

    s.setResponses([reply([call("tw_open", { skill: "wayfinder", effort: "some-effort" })])]);
    await s.session.prompt("Open wayfinder.");
    const opened = [...s.session.getActiveToolNames()];

    // Duplicate.
    s.setResponses([reply([call("tw_open", { skill: "wayfinder", effort: "some-effort" })])]);
    await s.session.prompt("Open wayfinder again.");
    const duplicateResult = latestToolResultText(s.session, "tw_open") ?? "";
    expect(duplicateResult).toContain("already open");
    expect(s.session.getActiveToolNames()).toEqual(opened);

    // Conflicting phase.
    s.setResponses([reply([call("tw_open", { skill: "to-spec", effort: "some-effort" })])]);
    await s.session.prompt("Try to open to-spec.");
    const conflictResult = latestToolResultText(s.session, "tw_open") ?? "";
    expect(conflictResult).toContain("conflicts");
    expect(s.session.getActiveToolNames()).toEqual(opened);
  });
});

describe("disclosure core: telemetry absorption", () => {
  test("the opener records telemetry; the model never calls telemetry_skill_context", async () => {
    const telemetryCalls: Array<Record<string, unknown>> = [];
    const fakeTelemetry = {
      name: "telemetry_skill_context",
      label: "Telemetry Skill Context",
      description: "Fake telemetry capture for the absorption test.",
      parameters: Type.Object({ skill_name: Type.String(), target: Type.Optional(Type.String()) }),
      execute: async (_id: string, args: Record<string, unknown>) => {
        telemetryCalls.push(args);
        return { content: [{ type: "text", text: "recorded" }], details: {} };
      },
    };
    const s = await createTaskSession({
      extensions: [taskWorkflow],
      customTools: [fakeTelemetry],
    });
    sessions.push(s);

    s.setResponses([
      reply([call("tw_open", { skill: "implement-ticket", effort: "some-effort", target: "a-ticket" })]),
    ]);
    await s.session.prompt("Open the ticket phase.");

    // The opener recorded the skill, effort, and target through the nested
    // call, so the model never had to call the telemetry tool itself.
    expect(telemetryCalls).toEqual([{ skill_name: "implement-ticket", target: "a-ticket" }]);
    // Every telemetry execution is the opener's nested call, none is a
    // model-initiated one (nested calls carry a parentToolCallId).
    const telemetryStarts = s.events.filter(
      (e): e is Extract<typeof e, { type: "tool_execution_start" }> =>
        e.type === "tool_execution_start" && e.toolName === "telemetry_skill_context",
    );
    expect(telemetryStarts.length).toBe(1);
    expect(telemetryStarts[0]!.parentToolCallId).toBeTruthy();
  });

  test("a phase open without a target records the effort as the target", async () => {
    const telemetryCalls: Array<Record<string, unknown>> = [];
    const fakeTelemetry = {
      name: "telemetry_skill_context",
      label: "Telemetry Skill Context",
      description: "Fake telemetry capture for the absorption test.",
      parameters: Type.Object({ skill_name: Type.String(), target: Type.Optional(Type.String()) }),
      execute: async (_id: string, args: Record<string, unknown>) => {
        telemetryCalls.push(args);
        return { content: [{ type: "text", text: "recorded" }], details: {} };
      },
    };
    const s = await createTaskSession({ extensions: [taskWorkflow], customTools: [fakeTelemetry] });
    sessions.push(s);

    s.setResponses([reply([call("tw_open", { skill: "wayfinder", effort: "some-effort" })])]);
    await s.session.prompt("Open wayfinder.");

    expect(telemetryCalls).toEqual([{ skill_name: "wayfinder", target: "some-effort" }]);
  });

  test("an absent telemetry tool fails open: the open still succeeds", async () => {
    const s = await disclosureSession();
    sessions.push(s);

    s.setResponses([reply([call("tw_open", { skill: "wayfinder", effort: "some-effort" })])]);
    await s.session.prompt("Open wayfinder.");

    expect(s.session.getActiveToolNames()).toContain("tw_frontier");
  });
});
