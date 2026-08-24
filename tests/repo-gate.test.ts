/**
 * Unit tests for repo-gate — pure gate-detection logic.
 *
 * These tests cover normalizeRemote, readOriginRemote, and isWorkRepo in
 * isolation. No pi runtime, no real git repo required.
 */

import { describe, expect, test } from "vitest";
import {
  normalizeRemote,
  readOriginRemote,
  isWorkRepo,
  walkToGitRoot,
} from "../src/core/repo-gate.js";

describe("normalizeRemote", () => {
  test("normalizes SSH github URL", () => {
    expect(normalizeRemote("git@github.com:QNCGmbH/openai.git")).toBe(
      "github.com/QNCGmbH/openai",
    );
  });

  test("normalizes HTTPS github URL", () => {
    expect(normalizeRemote("https://github.com/QNCGmbH/openai.git")).toBe(
      "github.com/QNCGmbH/openai",
    );
  });

  test("normalizes SSH bitbucket URL", () => {
    expect(normalizeRemote("git@bitbucket.org:anwaltde/plai-api.git")).toBe(
      "bitbucket.org/anwaltde/plai-api",
    );
  });

  test("normalizes HTTPS bitbucket URL", () => {
    expect(normalizeRemote("https://bitbucket.org/anwaltde/plai-api")).toBe(
      "bitbucket.org/anwaltde/plai-api",
    );
  });

  test("strips trailing slash", () => {
    expect(normalizeRemote("https://github.com/QNCGmbH/openai/")).toBe(
      "github.com/QNCGmbH/openai",
    );
  });

  test("handles URL with a port", () => {
    expect(normalizeRemote("ssh://git@github.com:22/QNCGmbH/x.git")).toBe(
      "github.com/QNCGmbH/x",
    );
  });

  test("lowercases host", () => {
    expect(normalizeRemote("GIT@GitHub.com:QNCGmbH/x.git")).toBe(
      "github.com/QNCGmbH/x",
    );
  });

  test("handles .git-less URL", () => {
    expect(normalizeRemote("https://github.com/QNCGmbH/openai")).toBe(
      "github.com/QNCGmbH/openai",
    );
  });

  test("handles empty origin", () => {
    expect(normalizeRemote("")).toBe("");
  });
});

describe("walkToGitRoot", () => {
  test("returns null when no .git exists", () => {
    const existsSync = () => false;
    expect(walkToGitRoot("/tmp/nowhere", { existsSync })).toBeNull();
  });

  test("finds .git in the starting directory", () => {
    const existsSync = (p: string) => p === "/repo/.git";
    expect(walkToGitRoot("/repo", { existsSync })).toBe("/repo");
  });

  test("walks up to find .git in a parent directory", () => {
    const existsSync = (p: string) => p === "/repo/.git";
    expect(walkToGitRoot("/repo/src/core", { existsSync })).toBe("/repo");
  });
});

describe("readOriginRemote", () => {
  test("returns null when no .git directory exists", () => {
    const existsSync = () => false;
    expect(readOriginRemote("/tmp/nowhere", { existsSync })).toBeNull();
  });

  test("reads origin URL from synthetic .git/config", () => {
    const existsSync = (p: string) => p === "/repo/.git";
    const isDir = () => true;
    const readFileSync = (p: string) => {
      if (p === "/repo/.git/config") {
        return '[remote "origin"]\n\turl = git@github.com:QNCGmbH/openai.git\n';
      }
      throw new Error(`unexpected read: ${p}`);
    };
    expect(
      readOriginRemote("/repo", { existsSync, isDir, readFileSync }),
    ).toBe("git@github.com:QNCGmbH/openai.git");
  });

  test("returns null when .git directory has no origin remote", () => {
    const existsSync = (p: string) => p === "/repo/.git";
    const isDir = () => true;
    const readFileSync = (p: string) => {
      if (p === "/repo/.git/config") {
        return '[remote "upstream"]\n\turl = git@github.com:QNCGmbH/openai.git\n';
      }
      throw new Error(`unexpected read: ${p}`);
    };
    expect(
      readOriginRemote("/repo", { existsSync, isDir, readFileSync }),
    ).toBeNull();
  });

  test("returns null for gitfile-style .git", () => {
    const existsSync = (p: string) => p === "/repo/.git";
    const isDir = () => false;
    expect(
      readOriginRemote("/repo", { existsSync, isDir }),
    ).toBeNull();
  });
});

describe("isWorkRepo", () => {
  test("empty patterns disable the gate", () => {
    const result = isWorkRepo("github.com/QNCGmbH/openai", [], true);
    expect(result.active).toBe(false);
    expect(result.reason).toBe("no disableOnRepo patterns");
  });

  test("no match + enable true/absent -> personal (active=false)", () => {
    const result = isWorkRepo("github.com/other/org", ["github.com/QNCGmbH"], true);
    expect(result.active).toBe(false);
  });

  test("no match + enable false -> active=true (escape hatch)", () => {
    const result = isWorkRepo("github.com/other/org", ["github.com/QNCGmbH"], false);
    expect(result.active).toBe(true);
  });

  test("match + enable true -> active=true (work repo)", () => {
    const result = isWorkRepo("github.com/QNCGmbH/openai", ["github.com/QNCGmbH"], true);
    expect(result.active).toBe(true);
  });

  test("match + enable false -> active=false (re-enabled locally)", () => {
    const result = isWorkRepo("github.com/QNCGmbH/openai", ["github.com/QNCGmbH"], false);
    expect(result.active).toBe(false);
  });

  test("no origin -> personal", () => {
    const result = isWorkRepo(null, ["github.com/QNCGmbH"], true);
    expect(result.active).toBe(false);
    expect(result.reason).toContain("personal");
  });

  test("invalid regex is skipped and produces a diagnostic", () => {
    const result = isWorkRepo("github.com/QNCGmbH/openai", ["[", "github.com/QNCGmbH"], true);
    expect(result.active).toBe(true);
    expect(result.diagnostics).toBeDefined();
    expect(result.diagnostics!.length).toBeGreaterThan(0);
    expect(result.diagnostics![0]).toContain("invalid regex");
  });

  test("prefix pattern matches", () => {
    const result = isWorkRepo("github.com/QNCGmbH/openai", ["^github\\.com/QNCGmbH"], true);
    expect(result.active).toBe(true);
  });

  test("full normalized string must match the pattern", () => {
    const result = isWorkRepo("github.com/QNCGmbH/openai", ["^github\\.com/QNCGmbH$"], true);
    expect(result.active).toBe(false);
    expect(result.reason).toContain("personal");
  });

  test("origin with trailing slash normalizes before matching", () => {
    const result = isWorkRepo("https://github.com/QNCGmbH/openai/", ["github.com/QNCGmbH"], true);
    expect(result.active).toBe(true);
  });
});
