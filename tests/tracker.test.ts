/** Tests for the local tracker's milestone support (an epic is a milestone). */

import { describe, expect, test } from "vitest";

import * as tracker from "../src/core/tracker";
import { mkTmp } from "./util";

describe("tracker", () => {
  test("create issue with milestone creates and links", () => {
    const t = mkTmp();
    const ms = tracker.createMilestone(t, "Auth epic");
    const n = tracker.create(t, "PRD: login", "body", ["prd"], "Auth epic");
    expect(tracker.view(t, n).milestone).toBe(ms);
  });

  test("milestone is idempotent by title", () => {
    const t = mkTmp();
    const a = tracker.createMilestone(t, "Auth epic");
    const b = tracker.createMilestone(t, "Auth epic");
    expect(a).toBe(b);
    expect(tracker.listMilestones(t).length).toBe(1);
  });

  test("create issue milestone autocreates", () => {
    const t = mkTmp();
    const n = tracker.create(t, "PRD", "b", [], "New epic");
    const ms = tracker.listMilestones(t);
    expect(ms.length).toBe(1);
    expect(ms[0].title).toBe("New epic");
    expect(tracker.view(t, n).milestone).toBe(ms[0].number);
  });

  test("set milestone on existing issue", () => {
    const t = mkTmp();
    const n = tracker.create(t, "PRD", "b", []);
    expect(tracker.view(t, n).milestone).toBeNull();
    const ms = tracker.setMilestone(t, n, "Auth epic");
    expect(tracker.view(t, n).milestone).toBe(ms);
  });

  test("close milestone", () => {
    const t = mkTmp();
    const ms = tracker.createMilestone(t, "Auth epic");
    tracker.closeMilestone(t, ms);
    expect(tracker.listMilestones(t)[0].state).toBe("closed");
  });

  test("no milestone when unset", () => {
    const t = mkTmp();
    const n = tracker.create(t, "Standalone PRD", "b", ["prd"]);
    expect(tracker.view(t, n).milestone).toBeNull();
  });

  test("edit title and body fills placeholder", () => {
    const t = mkTmp();
    const n = tracker.create(t, "PRD: foo", "placeholder", ["prd"], "Auth epic");
    tracker.edit(t, n, "Real login PRD", "the real summary");
    const issue = tracker.view(t, n);
    expect(issue.title).toBe("Real login PRD");
    expect(issue.body).toBe("the real summary");
    expect(issue.milestone).not.toBeNull();
  });
});
