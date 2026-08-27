import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, rmSync } from "node:fs";
import { rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

// vitest runs from the repo root; import.meta.url is unreliable under vitest's
// module transformation. Use process.cwd() to locate the repo root.
const repoRoot = process.cwd();
const cliMjs = join(repoRoot, "skills", "grilling", "grilling-cli.mjs");

/**
 * Run the build driver via vite-node so TS imports resolve at runtime without
 * a separate tsc emit step. This mirrors the maintainer-facing `scripts/build.ts`
 * invocation path.
 */
function runBuild(): { exitCode: number; stdout: string; stderr: string } {
  const result = spawnSync(
    process.execPath,
    [join(repoRoot, "node_modules", "vite-node", "vite-node.mjs"), "scripts/build.ts"],
    { cwd: repoRoot, encoding: "utf-8" },
  );
  return {
    exitCode: result.status ?? -1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

/**
 * Spawn the committed .mjs the same way an agent would from bash.
 */
function runCli(
  args: string[],
): { exitCode: number; stdout: string; stderr: string } {
  const result = spawnSync("node", [cliMjs, ...args], {
    cwd: repoRoot,
    encoding: "utf-8",
  });
  return {
    exitCode: result.status ?? -1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

/**
 * Seam 1: scripts/build.ts run → grilling-cli.mjs exists and is non-empty.
 */
describe("seam 1 — build emits grilling-cli.mjs", () => {
  it("produces a non-empty grilling-cli.mjs after running the build", async () => {
    // Ensure a clean slate (remove any prior artifact so the test proves the
    // build actually emits the file).
    if (existsSync(cliMjs)) {
      rmSync(cliMjs);
    }

    const result = runBuild();
    expect(result.exitCode, `${result.stderr}\n${result.stdout}`).toBe(0);

    expect(existsSync(cliMjs)).toBe(true);
    const contents = await readFile(cliMjs, "utf-8");
    expect(contents.length).toBeGreaterThan(0);
  });
});

/**
 * Seam 2: node skills/grilling/grilling-cli.mjs --help exits 0 and prints a
 * usage line.
 */
describe("seam 2 — --help exits 0 and prints usage", () => {
  it("prints a usage line and exits 0", () => {
    const result = runCli(["--help"]);
    expect(result.exitCode, result.stderr).toBe(0);
    expect(result.stdout).toMatch(/usage/i);
  });
});

/**
 * Seam 3: the produced .mjs contains the inlined SPA HTML (string match for
 * the placeholder text).
 */
describe("seam 3 — .mjs contains inlined SPA HTML", () => {
  it("contains the placeholder text 'grilling visualizer'", async () => {
    const contents = await readFile(cliMjs, "utf-8");
    expect(contents).toContain("grilling visualizer");
  });
});

/**
 * Seam 5: build output is a single index.html (no separate JS/CSS files
 * emitted alongside).
 */
describe("seam 5 — single inlined index.html", () => {
  it("emits only index.html in the SPA build output dir", async () => {
    const spaOutDir = join(repoRoot, "scripts", "grilling-ui", "dist");
    // Clean the dir so we can assert exactly what the build emits.
    if (existsSync(spaOutDir)) {
      await rm(spaOutDir, { recursive: true, force: true });
    }

    const result = runBuild();
    expect(result.exitCode, result.stderr).toBe(0);

    const files = readdirSync(spaOutDir);
    // The singlefile plugin should produce exactly one file: index.html.
    expect(files).toContain("index.html");
    // No separate .js or .css files — everything is inlined.
    const separateAssets = files.filter(
      (f) => f.endsWith(".js") || f.endsWith(".css"),
    );
    expect(separateAssets).toEqual([]);
  });
});

/**
 * Seam 4: root npm run typecheck passes and does NOT type-check scripts/.
 * We verify that the root tsconfig include is only src/**, and that running
 * tsc --noEmit from the repo root succeeds even if scripts/ has its own config.
 */
describe("seam 4 — root typecheck ignores scripts/", () => {
  it("root tsconfig.json include is only src/**", async () => {
    const { readFile } = await import("node:fs/promises");
    const tsconfigRaw = await readFile(join(repoRoot, "tsconfig.json"), "utf-8");
    const tsconfig = JSON.parse(tsconfigRaw);
    expect(tsconfig.include).toEqual(["src/**/*.ts"]);
  });

  it("scripts/tsconfig.json exists as a standalone config", () => {
    expect(existsSync(join(repoRoot, "scripts", "tsconfig.json"))).toBe(true);
  });

  it("root npm run typecheck passes", () => {
    const result = spawnSync(
      process.execPath,
      [join(repoRoot, "node_modules", "typescript", "bin", "tsc"), "--noEmit"],
      { cwd: repoRoot, encoding: "utf-8" },
    );
    expect(result.status, `${result.stderr}\n${result.stdout}`).toBe(0);
  });
});
