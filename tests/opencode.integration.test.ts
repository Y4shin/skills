/**
 * Layer 2: boot a real headless `opencode serve` against a scratch project that
 * has the generated `.opencode/` overlay installed, and assert — over the HTTP
 * API, with no model — that opencode actually loads our 14 commands and registers
 * our 15 native tools. Validates dir names, command frontmatter parsing, plugin
 * import resolution, and tool registration end-to-end.
 *
 * Skipped automatically when the `opencode` binary isn't on PATH, so the suite
 * stays green in environments without it.
 */

import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { cpSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { mkTmp } from "./util";

const hasOpencode = (() => {
  try {
    return spawnSync("opencode", ["--version"], { encoding: "utf-8" }).status === 0;
  } catch {
    return false;
  }
})();

const OVERLAY = join(process.cwd(), "plugins", "prd-workflow-opencode");

const EXPECTED_COMMANDS = [
  "init-prd-workflow",
  "update-prd-workflow",
  "create-epic",
  "epic-to-prds",
  "create-feature-prd",
  "create-capability-prd",
  "feature-prd-to-issues",
  "capability-prd-to-issues",
  "adopt-prd",
  "analyse-issue",
  "implement-issue",
  "finalize-prd",
  "finalize-epic",
  "grill-me",
];

describe.skipIf(!hasOpencode)("opencode loads the generated overlay", () => {
  let proc: ChildProcess | undefined;
  let url = "";

  beforeAll(async () => {
    const proj = mkTmp();
    mkdirSync(join(proj, ".opencode"), { recursive: true });
    for (const d of ["command", "plugin", "scripts", "skill"]) {
      cpSync(join(OVERLAY, d), join(proj, ".opencode", d), { recursive: true });
    }
    mkdirSync(join(proj, "docs", "prd"), { recursive: true });

    proc = spawn("opencode", ["serve", "--port", "0", "--hostname", "127.0.0.1"], {
      cwd: proj,
      stdio: ["ignore", "pipe", "pipe"],
    });

    url = await new Promise<string>((resolve, reject) => {
      let buf = "";
      const timer = setTimeout(() => reject(new Error(`server did not start:\n${buf}`)), 30000);
      const onData = (c: Buffer) => {
        buf += c.toString();
        const m = /listening on (http:\/\/\S+)/.exec(buf);
        if (m) {
          clearTimeout(timer);
          resolve(m[1].replace(/\/$/, ""));
        }
      };
      proc!.stdout?.on("data", onData);
      proc!.stderr?.on("data", onData);
      proc!.on("exit", (code) => {
        clearTimeout(timer);
        reject(new Error(`opencode exited (${code}) before listening:\n${buf}`));
      });
    });

    // Wait until the API is responsive.
    for (let i = 0; i < 40; i++) {
      try {
        if ((await fetch(`${url}/config`)).ok) break;
      } catch {
        /* not ready */
      }
      await new Promise((r) => setTimeout(r, 250));
    }
  }, 45000);

  afterAll(() => {
    proc?.kill("SIGTERM");
  });

  test("registers all 14 prd-workflow commands", async () => {
    const j: any = await (await fetch(`${url}/command`)).json();
    const names: string[] = (Array.isArray(j) ? j : Object.values(j)).map(
      (c: any) => c?.name ?? c?.id ?? c,
    );
    for (const name of EXPECTED_COMMANDS) expect(names).toContain(name);
  });

  test("loads prd-workflow-overview as a skill (not a command)", async () => {
    const j: any = await (await fetch(`${url}/command`)).json();
    const entries = Array.isArray(j) ? j : Object.values(j);
    const overview: any = entries.find((c: any) => (c?.name ?? c?.id) === "prd-workflow-overview");
    // It is auto-discovered from .opencode/skill/ — opencode tags its source as "skill",
    // so the model can invoke it via the `skill` tool (not just as a typed command).
    expect(overview).toBeTruthy();
    expect(overview.source).toBe("skill");
  });

  test("registers all 15 native prd_* tools", async () => {
    const j: any = await (await fetch(`${url}/experimental/tool/ids`)).json();
    const ids: string[] = Array.isArray(j) ? j : Object.keys(j);
    const ours = ids.filter((n) => n.startsWith("prd_")).sort();
    expect(ours.length).toBe(15);
    expect(ours).toContain("prd_show");
    expect(ours).toContain("prd_finalizable");
    expect(ours).toContain("prd_epic_set_prd_issue");
  });
});
