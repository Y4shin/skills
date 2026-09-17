/**
 * Tests for the v4 state model, pure functions, no I/O.
 *
 * The contract: two pointers (map, task), a lossless `rest` bag, real
 * nulls. fromObject then toObject reproduces every key of an arbitrary
 * state.yaml object.
 */

import { describe, expect, test } from "vitest";
import { toObject, fromObject, DEFAULT_STATE } from "../src/core/state.js";

describe("fromObject", () => {
  test("parses the flat v4 format: map and task at top level", () => {
    const state = fromObject({ map: "auth", task: "login" });
    expect(state.map).toBe("auth");
    expect(state.task).toBe("login");
  });

  test("parses a v3 file with a legacy slice key into rest, verbatim", () => {
    const state = fromObject({ map: "auth", task: "login", slice: "login-form", schema_version: 3 });
    expect(state.map).toBe("auth");
    expect(state.task).toBe("login");
    expect(state.rest).toEqual({ slice: "login-form", schema_version: 3 });
  });

  test("v1 nested format: pointers from active, active preserved in rest", () => {
    const raw = { active: { map: "auth", task: "login" }, last_action: "x", next_action: "y" };
    const state = fromObject(raw);
    expect(state.map).toBe("auth");
    expect(state.task).toBe("login");
    expect(state.rest).toEqual(raw);
  });

  test("returns fresh defaults for null, undefined, and non-object input", () => {
    for (const bad of [null, undefined, "hello", 42, ["array"]]) {
      const state = fromObject(bad);
      expect(state).toEqual(DEFAULT_STATE);
      expect(state.rest).toEqual({});
      expect(state).not.toBe(DEFAULT_STATE);
      state.map = "mutated";
      expect(DEFAULT_STATE.map).toBeNull();
    }
  });

  test("coerces non-string pointer values to null", () => {
    const state = fromObject({ map: 42, task: true, schema_version: 3 });
    expect(state.map).toBeNull();
    expect(state.task).toBeNull();
    expect(state.rest).toEqual({ schema_version: 3 });
  });

  test("the string 'None' coerces to null, not a pointer", () => {
    const state = fromObject({ map: "None", task: "login" });
    expect(state.map).toBeNull();
    expect(state.task).toBe("login");
  });
});

describe("toObject", () => {
  test("serializes pointers and rest: rest keys first, pointers last", () => {
    const obj = toObject({ map: "auth", task: "login", rest: { schema_version: 3 } });
    expect(Object.keys(obj)).toEqual(["schema_version", "map", "task"]);
    expect(obj).toEqual({ schema_version: 3, map: "auth", task: "login" });
  });

  test("null pointers serialize as real null, never the string 'None'", () => {
    const obj = toObject(DEFAULT_STATE);
    expect(obj.map).toBeNull();
    expect(obj.task).toBeNull();
    expect(JSON.stringify(obj)).not.toContain("None");
  });

  test("does not stamp schema_version and does not write a slice key", () => {
    const obj = toObject({ map: null, task: "login", rest: {} });
    expect(obj).not.toHaveProperty("schema_version");
    expect(obj).not.toHaveProperty("slice");
    expect(obj).toEqual({ map: null, task: "login" });
  });
});

describe("round-trip fidelity", () => {
  test("fromObject then toObject reproduces every key of a v3 file", () => {
    const original = { map: "auth", task: "login", slice: "login-form", schema_version: 3 };
    const state = fromObject(original);
    const obj = toObject(state);
    // rest keys first, pointers last: same key set, same values.
    expect(obj).toEqual(original);
    expect(Object.keys(obj).sort()).toEqual(Object.keys(original).sort());
  });

  test("multiple unknown keys survive one write", () => {
    const original = { schema_version: 3, map: "auth", task: null, future_key: "keep me", another: { nested: true } };
    const obj = toObject(fromObject(original));
    expect(obj).toEqual(original);
  });

  test("preservation holds across two consecutive writes", () => {
    const original = { schema_version: 3, slice: "legacy", map: "auth", task: null };
    let state = fromObject(original);
    state.task = "login"; // first write
    let obj = toObject(state);
    expect(obj.schema_version).toBe(3);
    expect(obj.slice).toBe("legacy");
    state = fromObject(obj);
    state.task = null; // second write
    obj = toObject(state);
    expect(obj).toEqual({ schema_version: 3, slice: "legacy", map: "auth", task: null });
  });

  test("v1 nested file round-trips with active preserved", () => {
    const original = { active: { map: "auth", task: "login" }, last_action: "x", next_action: "y" };
    const state = fromObject(original);
    state.task = "logout";
    const obj = toObject(state);
    // The active block is preserved verbatim, not rewritten; the modeled
    // pointers are appended after the preserved keys.
    expect(obj.active).toEqual({ map: "auth", task: "login" });
    expect(obj.last_action).toBe("x");
    expect(obj.next_action).toBe("y");
    expect(obj.map).toBe("auth");
    expect(obj.task).toBe("logout");
    expect(Object.keys(obj)).toEqual(["active", "last_action", "next_action", "map", "task"]);
  });

  test("round-trip of a YAML parse-then-stringify cycle keeps nulls real", async () => {
    const YAML = (await import("yaml")).default;
    const state = fromObject(YAML.parse("map: null\ntask: login\nschema_version: 3\n"));
    const text = YAML.stringify(toObject(state), { sortMapEntries: false, indentSeq: false, lineWidth: 0 });
    expect(text).not.toContain("None");
    expect(YAML.parse(text)).toEqual({ map: null, task: "login", schema_version: 3 });
  });
});
