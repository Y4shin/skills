/**
 * Tests for the state model — pure functions, no I/O.
 */

import { describe, expect, test } from "vitest";
import { toObject, fromObject, DEFAULT_STATE } from "../src/core/state.js";

describe("toObject", () => {
  test("serializes to a plain object", () => {
    const obj = toObject({ task: "login", slice: "login-form" });
    expect(obj.task).toBe("login");
    expect(obj.slice).toBe("login-form");
  });
});

describe("fromObject", () => {
  test("parses v2 flat format", () => {
    const state = fromObject({ task: "login", slice: null });
    expect(state.task).toBe("login");
    expect(state.slice).toBeNull();
  });

  test("parses v1 nested format", () => {
    const state = fromObject({ active: { task: "login", slice: "login-form", epic: "auth" }, last_action: "x", next_action: "y" });
    expect(state.task).toBe("login");
    expect(state.slice).toBe("login-form");
  });

  test("returns defaults for null/undefined", () => {
    expect(fromObject(null)).toEqual(DEFAULT_STATE);
    expect(fromObject(undefined)).toEqual(DEFAULT_STATE);
  });

  test("returns defaults for non-object", () => {
    expect(fromObject("hello")).toEqual(DEFAULT_STATE);
  });

  test("coerces non-string values to null", () => {
    const state = fromObject({ task: 42, slice: true });
    expect(state.task).toBeNull();
    expect(state.slice).toBeNull();
  });
});

describe("round-trip", () => {
  test("toObject then fromObject preserves values", () => {
    const original = { task: "login", slice: "login-form" };
    const obj = toObject(original);
    const state = fromObject(obj);
    expect(state).toEqual(original);
  });
});