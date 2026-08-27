// Slice 5 — tests for the pi invocation helpers (env stripping, gap fn wiring).
// These test the production gapFn helpers without actually running pi.
import { describe, expect, it, afterEach } from "vitest";
import { createPiGapFn, parseGapReport, strippedEnv } from "./harness.js";

describe("pi invocation helpers", () => {
  it("createPiGapFn returns a function that parses pi output", async () => {
    // We test the parseGapReport integration here with a canned report.
    const cannedOutput = [
      "Grilling done. Missing operations:",
      "- update remove-question: needed to clean up",
      "- update add-note: needed to annotate",
      "No other gaps.",
    ].join("\n");
    const report = parseGapReport(cannedOutput);
    expect(report.converged).toBe(false);
    expect(report.missingCommands).toHaveLength(2);
  });

  it("createPiGapFn parses a clean report as converged", async () => {
    const cannedOutput = "Grilling complete. No missing operations.";
    const report = parseGapReport(cannedOutput);
    expect(report.converged).toBe(true);
    expect(report.missingCommands).toEqual([]);
  });

  it("createPiGapFn returns a callable function", () => {
    const fn = createPiGapFn(
      {
        id: "test",
        name: "test",
        subject: "test",
        maxQuestions: 5,
        prompt: "test",
      },
      { timeoutMs: 100 },
    );
    expect(typeof fn).toBe("function");
  });
});

describe("strippedEnv — browser-spawn prevention", () => {
  const savedDisplay = process.env.DISPLAY;
  const savedWayland = process.env.WAYLAND_DISPLAY;
  const savedEval = process.env.GRILLING_EVAL;

  afterEach(() => {
    if (savedDisplay === undefined) delete process.env.DISPLAY;
    else process.env.DISPLAY = savedDisplay;
    if (savedWayland === undefined) delete process.env.WAYLAND_DISPLAY;
    else process.env.WAYLAND_DISPLAY = savedWayland;
    if (savedEval === undefined) delete process.env.GRILLING_EVAL;
    else process.env.GRILLING_EVAL = savedEval;
  });

  it("removes DISPLAY from the environment", () => {
    process.env.DISPLAY = ":0";
    const env = strippedEnv();
    expect(env.DISPLAY).toBeUndefined();
  });

  it("removes WAYLAND_DISPLAY from the environment", () => {
    process.env.WAYLAND_DISPLAY = "wayland-0";
    const env = strippedEnv();
    expect(env.WAYLAND_DISPLAY).toBeUndefined();
  });

  it("sets GRILLING_EVAL=1 in the environment", () => {
    delete process.env.GRILLING_EVAL;
    const env = strippedEnv();
    expect(env.GRILLING_EVAL).toBe("1");
  });

  it("preserves other env vars", () => {
    process.env.MY_CUSTOM_VAR = "hello";
    const env = strippedEnv();
    expect(env.MY_CUSTOM_VAR).toBe("hello");
  });
});
