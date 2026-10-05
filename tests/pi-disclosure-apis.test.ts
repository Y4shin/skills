/**
 * Smoke test for the @earendil-works/pi-coding-agent APIs the
 * progressive-disclosure work depends on (effort enforced-workflow-v5,
 * ticket bump-dependencies):
 *
 *   - `exposure`      — registerTool option choosing the disclosure level
 *   - `defaultActive` — registerTool option keeping a direct tool off until
 *                       an opener activates it
 *   - `setActiveTools`— the activation lever (with getActiveTools)
 *   - `tool_search`   — the built-in deferred-tool discovery tool
 *
 * The repo must resolve pi-coding-agent 1.0.0 or later; 0.80.x has none of
 * these APIs, so every assertion below fails on the old toolchain.
 *
 * Seam: the installed package, exercised through the integration harness
 * (real AgentSession on the faux provider).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { Type } from "typebox";

import {
  type ExtensionFactory,
  createToolSearchExtension,
} from "@earendil-works/pi-coding-agent";

import {
  call,
  createTaskSession,
  latestToolResultText,
  reply,
  type TaskSession,
} from "./integration/harness.js";

const sessions: TaskSession[] = [];
afterEach(() => { while (sessions.length) sessions.pop()?.dispose(); });

/** Read the version of the actually-installed pi-coding-agent. */
function installedPiVersion(): string {
  const pkgPath = join(
    process.cwd(),
    "node_modules",
    "@earendil-works",
    "pi-coding-agent",
    "package.json",
  );
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { version: string };
  return pkg.version;
}

/**
 * A probe extension that registers one gated tool (direct exposure, off by
 * default) plus two always-active reporters around the active set.
 */
const disclosureProbe: ExtensionFactory = (pi) => {
  pi.registerTool({
    name: "probe_gated",
    label: "Probe Gated",
    description: "A gated probe tool: direct exposure, inactive by default.",
    parameters: Type.Object({}),
    exposure: "direct",
    defaultActive: false,
    async execute() {
      return { content: [{ type: "text", text: "gated-ok" }], details: {} };
    },
  });

  pi.registerTool({
    name: "probe_report",
    label: "Probe Report",
    description: "Reports the active tools and all registered tool names.",
    parameters: Type.Object({}),
    async execute() {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            active: pi.getActiveTools(),
            all: pi.getAllTools().map((t) => t.name),
          }),
        }],
        details: {},
      };
    },
  });

  pi.registerTool({
    name: "probe_activate",
    label: "Probe Activate",
    description: "Activates the gated probe via setActiveTools and reports the set.",
    parameters: Type.Object({}),
    async execute() {
      const before = pi.getActiveTools();
      pi.setActiveTools([...before, "probe_gated"]);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ before, after: pi.getActiveTools() }),
        }],
        details: {},
      };
    },
  });
};

async function probeSession(): Promise<TaskSession> {
  // The CLI loads tool_search as a built-in extension; SDK sessions add it
  // explicitly (docs on createToolSearchExtension). Adding it here asserts the
  // factory ships in the installed package and registers the tool.
  const s = await createTaskSession({
    extensions: [disclosureProbe, createToolSearchExtension()],
  });
  sessions.push(s);
  return s;
}

function jsonResult(s: TaskSession, toolName: string): {
  active?: string[];
  all?: string[];
  before?: string[];
  after?: string[];
} {
  const text = latestToolResultText(s.session, toolName) ?? "";
  return JSON.parse(text) as Record<string, string[]>;
}

describe("pi-coding-agent disclosure APIs (smoke)", () => {
  test("the installed package resolves to 1.0.0 or later", () => {
    const version = installedPiVersion();
    const [major = 0] = version.split(".").map((n) => Number.parseInt(n, 10));
    expect(major, `installed pi-coding-agent is ${version}`).toBeGreaterThanOrEqual(1);
  });

  test("defaultActive: false keeps a direct tool registered but inactive", async () => {
    const s = await probeSession();
    s.setResponses([reply([call("probe_report", {})])]);
    await s.session.prompt("Report the tool state.");
    const report = jsonResult(s, "probe_report");
    expect(report.all).toContain("probe_gated");
    expect(report.active).not.toContain("probe_gated");
  });

  test("setActiveTools activates a defaultActive: false tool", async () => {
    const s = await probeSession();
    s.setResponses([reply([call("probe_activate", {})])]);
    await s.session.prompt("Activate the gated probe.");
    const report = jsonResult(s, "probe_activate");
    expect(report.after).toContain("probe_gated");
  });

  test("tool_search is present on the installed package", async () => {
    const s = await probeSession();
    s.setResponses([reply([call("probe_report", {})])]);
    await s.session.prompt("Report the tool state.");
    const report = jsonResult(s, "probe_report");
    expect(report.all).toContain("tool_search");
    // Registered inactive, like every gated workflow tool will be.
    expect(report.active).not.toContain("tool_search");
  });
});
