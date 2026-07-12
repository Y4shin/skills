/** Tests for the coding-guidelines extension — language detection, project scanning, snippet generation. */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { mkTmp } from "./util";

import {
  type GuidelineEntry,
  buildInjectionSnippet,
  collectSourceLanguages,
  detectLanguage,
  discoverGuidelines,
} from "../src/pi/guidelines";

// ─── detectLanguage ────────────────────────────────────────────────────────────

describe("detectLanguage", () => {
  test("TypeScript files", () => {
    expect(detectLanguage("src/index.ts")).toBe("typescript");
    expect(detectLanguage("src/Component.tsx")).toBe("typescript");
    expect(detectLanguage("src/types.d.ts")).toBe("typescript");
    expect(detectLanguage("src/util.mts")).toBe("typescript");
    expect(detectLanguage("src/util.cts")).toBe("typescript");
  });

  test("JavaScript files", () => {
    expect(detectLanguage("src/index.js")).toBe("javascript");
    expect(detectLanguage("src/Component.jsx")).toBe("javascript");
    expect(detectLanguage("src/index.mjs")).toBe("javascript");
    expect(detectLanguage("src/index.cjs")).toBe("javascript");
  });

  test("other languages", () => {
    expect(detectLanguage("src/main.py")).toBe("python");
    expect(detectLanguage("src/lib.rs")).toBe("rust");
    expect(detectLanguage("src/main.go")).toBe("go");
    expect(detectLanguage("src/main.rb")).toBe("ruby");
    expect(detectLanguage("src/Main.java")).toBe("java");
    expect(detectLanguage("src/Main.kt")).toBe("kotlin");
    expect(detectLanguage("src/main.swift")).toBe("swift");
    expect(detectLanguage("src/main.c")).toBe("c");
    expect(detectLanguage("src/main.h")).toBe("c");
    expect(detectLanguage("src/main.cpp")).toBe("cpp");
    expect(detectLanguage("src/main.hpp")).toBe("cpp");
    expect(detectLanguage("flake.nix")).toBe("nix");
    expect(detectLanguage("script.sh")).toBe("bash");
    expect(detectLanguage("script.bash")).toBe("bash");
    expect(detectLanguage("styles.css")).toBe("css");
    expect(detectLanguage("styles.scss")).toBe("scss");
    expect(detectLanguage("index.html")).toBe("html");
    expect(detectLanguage("package.json")).toBe("json");
    expect(detectLanguage("config.yaml")).toBe("yaml");
    expect(detectLanguage("config.yml")).toBe("yaml");
  });

  test("unknown extensions return null", () => {
    expect(detectLanguage("Makefile")).toBeNull();
    expect(detectLanguage("Dockerfile")).toBeNull();
    expect(detectLanguage("file.txt")).toBeNull();
    expect(detectLanguage("file")).toBeNull();
  });
});

// ─── buildInjectionSnippet ─────────────────────────────────────────────────────

describe("buildInjectionSnippet", () => {
  test("includes both languages and guidelines when present", () => {
    const cache = new Map<string, GuidelineEntry>([
      [
        "testing.md",
        { file: "docs/testing.md", content: "# Testing\n...", topics: ["testing"] },
      ],
      [
        "typescript-guidelines.md",
        { file: "docs/typescript-guidelines.md", content: "# TypeScript\n...", topics: ["typescript"] },
      ],
    ]);
    const snippet = buildInjectionSnippet(["typescript", "python"], cache);

    expect(snippet).toContain("## Project coding guidelines");
    expect(snippet).toContain("Source languages: python, typescript");
    expect(snippet).toContain("docs/testing.md");
    expect(snippet).toContain("docs/typescript-guidelines.md");
    expect(snippet).toContain("topics: testing");
    expect(snippet).toContain("topics: typescript");
    expect(snippet).toContain("get_guidelines");
    expect(snippet).toContain("list_guidelines()");
  });

  test("handles empty languages", () => {
    const snippet = buildInjectionSnippet([], new Map());
    expect(snippet).toContain("## Project coding guidelines");
    expect(snippet).not.toContain("Source languages");
    expect(snippet).not.toContain("Available documentation");
    expect(snippet).toContain("get_guidelines");
    expect(snippet).toContain("list_guidelines()");
  });

  test("handles languages but no guidelines", () => {
    const snippet = buildInjectionSnippet(["rust", "go"], new Map());
    expect(snippet).toContain("Source languages: go, rust");
    expect(snippet).not.toContain("Available documentation");
    expect(snippet).toContain("get_guidelines");
  });

  test("handles guidelines but no languages", () => {
    const cache = new Map<string, GuidelineEntry>([
      ["testing.md", { file: "docs/testing.md", content: "# Testing", topics: ["testing"] }],
    ]);
    const snippet = buildInjectionSnippet([], cache);
    expect(snippet).not.toContain("Source languages");
    expect(snippet).toContain("Available documentation");
    expect(snippet).toContain("docs/testing.md");
  });
});

// ─── collectSourceLanguages (file-system based) ────────────────────────────────

describe("collectSourceLanguages", () => {
  test("detects languages from src/ directory", () => {
    const dir = mkTmp();
    mkdirSync(join(dir, "src"), { recursive: true });
    mkdirSync(join(dir, "src", "components"), { recursive: true });
    writeFileSync(join(dir, "src", "index.ts"), "");
    writeFileSync(join(dir, "src", "util.py"), "");
    writeFileSync(join(dir, "src", "components", "Button.tsx"), "");
    writeFileSync(join(dir, "src", "styles.css"), "");

    const langs = collectSourceLanguages(dir);
    expect(langs).toContain("typescript");
    expect(langs).toContain("python");
    expect(langs).toContain("css");
  });

  test("skips node_modules, .git, .venv, dist", () => {
    const dir = mkTmp();
    mkdirSync(join(dir, "src"), { recursive: true });
    writeFileSync(join(dir, "src", "index.ts"), "");
    // These should be ignored
    mkdirSync(join(dir, "node_modules"), { recursive: true });
    writeFileSync(join(dir, "node_modules", "lib.py"), "");
    mkdirSync(join(dir, ".git"), { recursive: true });
    writeFileSync(join(dir, ".git", "hooks.sh"), "");
    mkdirSync(join(dir, "dist"), { recursive: true });
    writeFileSync(join(dir, "dist", "bundle.js"), "");

    const langs = collectSourceLanguages(dir);
    expect(langs).toContain("typescript");
    expect(langs).not.toContain("python"); // from node_modules
    expect(langs).not.toContain("bash");   // from .git
    expect(langs).not.toContain("javascript"); // from dist
  });

  test("returns empty array when no source directories exist", () => {
    const dir = mkTmp();
    const langs = collectSourceLanguages(dir);
    expect(Array.isArray(langs)).toBe(true);
  });

  test("detects root-level source files", () => {
    const dir = mkTmp();
    writeFileSync(join(dir, "index.ts"), "");
    writeFileSync(join(dir, "main.py"), "");

    const langs = collectSourceLanguages(dir);
    expect(langs).toContain("typescript");
    expect(langs).toContain("python");
  });

  test("detects from tests/ directory", () => {
    const dir = mkTmp();
    mkdirSync(join(dir, "tests"), { recursive: true });
    writeFileSync(join(dir, "tests", "test_app.py"), "");
    writeFileSync(join(dir, "tests", "test_api.go"), "");

    const langs = collectSourceLanguages(dir);
    expect(langs).toContain("python");
    expect(langs).toContain("go");
  });
});

// ─── discoverGuidelines (file-system based) ────────────────────────────────────

describe("discoverGuidelines", () => {
  test("discovers testing.md", () => {
    const dir = mkTmp();
    mkdirSync(join(dir, "docs"), { recursive: true });
    writeFileSync(join(dir, "docs", "testing.md"), "# Testing conventions\n\nUse vitest.");

    const cache = discoverGuidelines(dir);
    expect(cache.size).toBe(1);
    const entry = cache.get("testing.md");
    expect(entry).toBeDefined();
    expect(entry!.topics).toEqual(["testing"]);
    expect(entry!.content).toContain("Use vitest.");
  });

  test("discovers language-guidelines.md files", () => {
    const dir = mkTmp();
    mkdirSync(join(dir, "docs"), { recursive: true });
    writeFileSync(join(dir, "docs", "typescript-guidelines.md"), "# TypeScript guidelines\n\nUse interfaces.");
    writeFileSync(join(dir, "docs", "python-conventions.md"), "# Python conventions\n\nUse snake_case.");

    const cache = discoverGuidelines(dir);
    expect(cache.size).toBe(2);

    const ts = cache.get("typescript-guidelines.md");
    expect(ts).toBeDefined();
    expect(ts!.topics).toEqual(["typescript"]);

    const py = cache.get("python-conventions.md");
    expect(py).toBeDefined();
    expect(py!.topics).toEqual(["python"]);
  });

  test("discovers topic-practices.md files", () => {
    const dir = mkTmp();
    mkdirSync(join(dir, "docs"), { recursive: true });
    writeFileSync(join(dir, "docs", "mocking-practices.md"), "# Mocking\n\nUse unittest.mock.");

    const cache = discoverGuidelines(dir);
    expect(cache.size).toBe(1);
    expect(cache.get("mocking-practices.md")!.topics).toEqual(["mocking"]);
  });

  test("ignores non-guideline files", () => {
    const dir = mkTmp();
    mkdirSync(join(dir, "docs"), { recursive: true });
    writeFileSync(join(dir, "docs", "README.md"), "# Readme");
    writeFileSync(join(dir, "docs", "architecture.md"), "# Architecture");
    writeFileSync(join(dir, "docs", "api-docs.md"), "# API");

    const cache = discoverGuidelines(dir);
    expect(cache.size).toBe(0);
  });

  test("returns empty map when docs/ doesn't exist", () => {
    const dir = mkTmp();
    const cache = discoverGuidelines(dir);
    expect(cache.size).toBe(0);
  });

  test("ignores directories inside docs/", () => {
    const dir = mkTmp();
    mkdirSync(join(dir, "docs", "tasks"), { recursive: true });
    writeFileSync(join(dir, "docs", "testing.md"), "# Testing");

    const cache = discoverGuidelines(dir);
    expect(cache.size).toBe(1);
    expect(cache.get("testing.md")).toBeDefined();
  });

  test("sets relative file path", () => {
    const dir = mkTmp();
    mkdirSync(join(dir, "docs"), { recursive: true });
    writeFileSync(join(dir, "docs", "testing.md"), "# Testing");

    const cache = discoverGuidelines(dir);
    const entry = cache.get("testing.md")!;
    // Path should be relative to cwd
    expect(entry.file).toBe("docs/testing.md");
  });
});