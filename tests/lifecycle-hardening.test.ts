/**
 * Lifecycle-hardening tests: the defects a full workflow rehearsal exposed.
 *
 * Each case pins one refusal or one write the rehearsal needed and did not
 * get: the opener's own refusals instead of provider validation errors, the
 * closer as a diagnosable tool, the to-tickets spec gate, the fog
 * precondition, the planning-task record writer, the advisory review's home,
 * the archive's pointer clear, and the onboarding guard exemption.
 */

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { dump, parse } from "../src/core/frontmatter.js";
import { createTools } from "../src/pi.js";
import { ALWAYS_DECLARED, buildOpenParameters } from "../src/disclosure.js";

let repo: string;

function writeEffort(
  slug: string,
  files: Record<string, { data: Record<string, unknown>; body?: string }>,
): void {
  for (const [name, doc] of Object.entries(files)) {
    const path = join(repo, "docs", "tasks", slug, name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, dump({ data: doc.data, body: doc.body ?? "\n" }), "utf-8");
  }
}

beforeAll(() => {
  repo = join(tmpdir(), `lifecycle-hardening-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
  mkdirSync(join(repo, "docs", "tasks"), { recursive: true });
  writeFileSync(join(repo, "docs", "tasks", "state.yaml"), "schema_version: 5\nmap: null\ntask: null\n");

  // A finalized map with no spec yet: to-tickets must refuse.
  writeEffort("no-spec", {
    "map.md": { data: { type: "map", title: "No spec", ready_for_spec: true } },
  });
  // A draft spec: to-tickets must refuse to consume it.
  writeEffort("draft-spec", {
    "map.md": { data: { type: "map", title: "Draft spec", ready_for_spec: true } },
    "spec.md": { data: { type: "spec", title: "Draft spec", status: "draft" } },
  });
  // A published spec: to-tickets opens.
  writeEffort("published", {
    "map.md": { data: { type: "map", title: "Published", ready_for_spec: true } },
    "spec.md": { data: { type: "spec", title: "Published spec", status: "stable" } },
  });
  // A ticket-ready effort: the missing-target refusal is what a targetless
  // ticket open must reach, not an earlier work-state or architecture check.
  writeEffort("ticketready", {
    "map.md": { data: { type: "map", title: "Ticket ready" } },
    "spec.md": { data: { type: "spec", title: "Ticket ready spec", status: "stable" } },
    "architecture.md": { data: { type: "architecture", title: "Ticket ready architecture", status: "stable" } },
    "tickets/one/ticket.md": {
      data: { type: "ticket", subtype: "feature", title: "One", status: "stable", workflow_state: "ready", blocked_by: [] },
    },
  });
  // A map whose reconcile would pass every old check but still carries fog.
  writeEffort("foggy", {
    "map.md": {
      data: { type: "map", title: "Foggy" },
      body:
        "\n## Non-goals\n\n- A config file.\n\n## Non-negotiable facts\n\n" +
        "**Success test:** one command prints the list.\n\n- It stays dependency free.\n\n" +
        "## Fog\n\n- Whether empty anchors get a fallback.\n",
    },
  });
  // A planning task and a ticket, for the record writers.
  writeEffort("records", {
    "map.md": { data: { type: "map", title: "Records" } },
    "tasks/grill/task.md": {
      data: { type: "task", subtype: "grilling", title: "Grill", status: "stable", workflow_state: "done", blocked_by: [] },
      body: "\n## Decision to settle\n\nSomething.\n",
    },
    "tickets/fix/ticket.md": {
      data: { type: "ticket", subtype: "bug", title: "Fix", status: "stable", workflow_state: "ready", blocked_by: [] },
    },
  });
  // A finalizable effort with an archived-ready review.
  writeEffort("closing", {
    "map.md": { data: { type: "map", title: "Closing" } },
    "spec.md": { data: { type: "spec", title: "Closing spec", status: "stable" } },
    "tickets/one/ticket.md": {
      data: { type: "ticket", subtype: "feature", title: "One", status: "stable", workflow_state: "done", blocked_by: [] },
    },
  });
  writeFileSync(join(repo, "docs", "tasks", "state.yaml"), "schema_version: 5\nmap: closing\ntask: null\n");
});

afterAll(() => {
  rmSync(repo, { recursive: true, force: true });
});

interface ToolResult {
  text: string;
  details: Record<string, unknown>;
}

function ctx(active: string[]) {
  return {
    directory: repo,
    getActiveTools: () => [...active],
    setActiveTools: (names: string[]) => {
      active.splice(0, active.length, ...names);
    },
  };
}

function tools() {
  return createTools() as unknown as Record<string, { execute: Function }>;
}

describe("opener refusals reach the model", () => {
  test("the parameter schema is a plain object, not a union the provider rejects", () => {
    const schema = buildOpenParameters() as { type?: string; anyOf?: unknown[] };
    expect(schema.type).toBe("object");
    expect(schema.anyOf).toBeUndefined();
  });

  test("an unknown skill is refused with the openable set named", async () => {
    const t = tools();
    await expect(
      t.tw_open.execute({ skill: "nonsense-skill", effort: "published" }, ctx([...ALWAYS_DECLARED])),
    ).rejects.toThrow(/unknown skill 'nonsense-skill': openable skills are/);
  });

  test("a ticket open without a target is the gate refusal, naming the legal next call", async () => {
    const t = tools();
    const result = (await t.tw_open.execute(
      { skill: "implement-ticket", effort: "ticketready" },
      ctx([...ALWAYS_DECLARED]),
    )) as ToolResult;
    expect(result.details.opened).toBe(false);
    // The handler ran (not the provider) and named the missing target plus a
    // legal next call.
    expect(String(result.details.reason)).toContain("requires a target");
    expect((result.details.legal_next as string[]).length).toBeGreaterThan(0);
  });

  test("closing with nothing open names the legal next call instead of vanishing", async () => {
    const t = tools();
    const result = (await t.tw_close.execute({ skill: "wayfinder" }, ctx([...ALWAYS_DECLARED]))) as ToolResult;
    expect(result.details.closed).toBe(false);
    expect(result.text).toContain("no workflow skill is open");
    expect(result.text).toContain("tw_open");
  });
});

describe("to-tickets consumes a published spec", () => {
  test("refuses an effort with no spec and points at to-spec", async () => {
    const t = tools();
    const result = (await t.tw_open.execute({ skill: "to-tickets", effort: "no-spec" }, ctx([...ALWAYS_DECLARED]))) as ToolResult;
    expect(result.details.opened).toBe(false);
    expect(String(result.details.reason)).toContain("no spec");
    expect(result.details.legal_next).toContain("run to-spec");
  });

  test("refuses a draft spec", async () => {
    const t = tools();
    const result = (await t.tw_open.execute({ skill: "to-tickets", effort: "draft-spec" }, ctx([...ALWAYS_DECLARED]))) as ToolResult;
    expect(result.details.opened).toBe(false);
    expect(String(result.details.reason)).toContain("not stable");
  });

  test("opens on a published spec", async () => {
    const t = tools();
    const result = (await t.tw_open.execute({ skill: "to-tickets", effort: "published" }, ctx([...ALWAYS_DECLARED]))) as ToolResult;
    expect(result.details.opened).toBe(true);
  });
});

describe("tw_finalize_map refuses with fog still open", () => {
  test("names the fog line and does not set the flag", async () => {
    const t = tools();
    await expect(
      t.tw_finalize_map.execute({ selector: "foggy" }, ctx([...ALWAYS_DECLARED])),
    ).rejects.toThrow(/Fog' still holds 1 open question/);
    const map = readFileSync(join(repo, "docs", "tasks", "foggy", "map.md"), "utf-8");
    expect(map).not.toContain("ready_for_spec: true");
  });
});

describe("the planning-task record writer", () => {
  test("writes the task's Notes section and refuses a ticket", async () => {
    const t = tools();
    const out = (await t.tw_write_task_note.execute(
      { selector: "grill", note: "Settled: markers are `<!-- toc -->`." },
      ctx([...ALWAYS_DECLARED]),
    )) as string;
    expect(out).toContain("Notes");
    const task = readFileSync(join(repo, "docs", "tasks", "records", "tasks", "grill", "task.md"), "utf-8");
    expect(task).toContain("## Notes");
    expect(task).toContain("markers are");

    await expect(
      t.tw_write_task_note.execute({ selector: "fix", note: "nope" }, ctx([...ALWAYS_DECLARED])),
    ).rejects.toThrow(/not a planning task/);
  });
});

describe("the advisory review has a home", () => {
  test("pass end-of-effort writes its own file and refuses dispositions", async () => {
    const t = tools();
    const result = (await t.tw_write_review.execute(
      {
        selector: "records",
        pass: "end-of-effort",
        content: "## Findings\n\n- One test landed green first.",
      },
      ctx([...ALWAYS_DECLARED]),
    )) as ToolResult;
    expect(result.details.pass).toBe("end-of-effort");
    const path = join(repo, "docs", "tasks", "records", "end-of-effort-review.md");
    expect(readFileSync(path, "utf-8")).toContain("One test landed green first");
    // The finalize triage dispositions the advisory findings in place, so the
    // record lands where the findings live; moving them stays refused.
    const disposed = (await t.tw_write_review.execute(
      {
        selector: "records",
        pass: "end-of-effort",
        content: "## Findings\n\n- One test landed green first.",
        findings: [{ finding: "One test landed green first.", disposition: "informational" }],
      },
      ctx([...ALWAYS_DECLARED]),
    )) as ToolResult;
    expect(disposed.details.dispositioned).toBe(true);
    expect(readFileSync(path, "utf-8")).toContain("## Dispositions");
    await expect(
      t.tw_write_review.execute(
        {
          selector: "records",
          pass: "end-of-effort",
          content: "## Findings\n\n- x",
          follow_up: "some-followup",
        },
        ctx([...ALWAYS_DECLARED]),
      ),
    ).rejects.toThrow(/advisory/);
  });
});

describe("the archive clears the state pointer", () => {
  test("archiving the pointed-at effort nulls the map pointer", async () => {
    const t = tools();
    const out = (await t.tw_archive_effort.execute({ selector: "closing" }, ctx([...ALWAYS_DECLARED]))) as string;
    expect(out).toContain("map pointer cleared");
    const state = readFileSync(join(repo, "docs", "tasks", "state.yaml"), "utf-8");
    expect(state).toContain("map: null");
    expect(state).not.toContain("map: closing");
  });
});

describe("the advisory review does not block the archive", () => {
  test("an effort with an end-of-effort review and a dispositioned finalize review archives", async () => {
    const t = tools();
    // The advisory pass writes its own file and cannot set dispositions.
    await t.tw_write_review.execute(
      { selector: "records", pass: "end-of-effort", content: "## Findings\n\n- A docs detail." },
      ctx([...ALWAYS_DECLARED]),
    );
    // The finalize pass dispositions its own findings; the advisory file is
    // an input, never a gate.
    await t.tw_write_review.execute(
      {
        selector: "records",
        content: "## Findings\n\n- A docs detail.",
        findings: [{ finding: "A docs detail.", disposition: "informational" }],
        reconcile: "none: no architecture document in the fixture",
      },
      ctx([...ALWAYS_DECLARED]),
    );
    // Mark the map finalizable so the archive gate is the only thing tested.
    const ticketPath = join(repo, "docs", "tasks", "records", "tickets", "fix", "ticket.md");
    const ticket = parse(readFileSync(ticketPath, "utf-8"));
    ticket.data.workflow_state = "done";
    writeFileSync(ticketPath, dump(ticket), "utf-8");
    const out = (await t.tw_archive_effort.execute({ selector: "records" }, ctx([...ALWAYS_DECLARED]))) as string;
    expect(out).toContain("archived 'records'");
  });
});

describe("advisory dispositions are validated like finalize ones", () => {
  test("an advisory ticket disposition naming a missing ticket is refused", async () => {
    const t = tools();
    await expect(
      t.tw_write_review.execute(
        {
          selector: "ticketready",
          pass: "end-of-effort",
          content: "## Findings\n\n- x",
          findings: [{ finding: "x", disposition: "ticket", target: "does-not-exist" }],
        },
        ctx([...ALWAYS_DECLARED]),
      ),
    ).rejects.toThrow(/not an existing ticket/);
  });
});

describe("the close reconcile is recorded and gated", () => {
  test("the archive refuses a finalize review with no reconcile record", async () => {
    const t = tools();
    await t.tw_write_review.execute(
      {
        selector: "ticketready",
        content: "## Findings\n\n- nothing",
        findings: [{ finding: "nothing", disposition: "informational" }],
      },
      ctx([...ALWAYS_DECLARED]),
    );
    // Finalizable: the one ticket is ready, so mark it done for the gate.
    const ticketPath = join(repo, "docs", "tasks", "ticketready", "tickets", "one", "ticket.md");
    const ticket = parse(readFileSync(ticketPath, "utf-8"));
    ticket.data.workflow_state = "done";
    writeFileSync(ticketPath, dump(ticket), "utf-8");
    await expect(
      t.tw_archive_effort.execute({ selector: "ticketready" }, ctx([...ALWAYS_DECLARED])),
    ).rejects.toThrow(/carries no reconcile record/);
  });

  test("each legal reconcile record is accepted, and an illegal one is refused", async () => {
    const t = tools();
    for (const record of ["done: rewrote the ticket loop section", "none: no architecture change", "unavailable: schema-4 legacy leaf"]) {
      const out = (await t.tw_write_review.execute(
        {
          selector: "published",
          content: "## Findings\n\n- nothing",
          findings: [{ finding: "nothing", disposition: "informational" }],
          reconcile: record,
        },
        ctx([...ALWAYS_DECLARED]),
      )) as ToolResult;
      expect(out.text).toContain("wrote");
      const written = readFileSync(join(repo, "docs", "tasks", "published", "review.md"), "utf-8");
      expect(written).toContain(`reconcile: "${record}"`);
    }
    await expect(
      t.tw_write_review.execute(
        {
          selector: "published",
          content: "## Findings\n\n- nothing",
          reconcile: "reconciled",
        },
        ctx([...ALWAYS_DECLARED]),
      ),
    ).rejects.toThrow(/invalid reconcile record/);
  });

  test("the reconcile record survives a triage rewrite that omits it", async () => {
    const t = tools();
    await t.tw_write_review.execute(
      {
        selector: "published",
        content: "## Findings\n\n- nothing",
        findings: [{ finding: "nothing", disposition: "informational" }],
        reconcile: "none: no architecture change",
      },
      ctx([...ALWAYS_DECLARED]),
    );
    await t.tw_write_review.execute(
      {
        selector: "published",
        content: "## Findings\n\n- nothing at all",
        findings: [{ finding: "nothing at all", disposition: "informational" }],
      },
      ctx([...ALWAYS_DECLARED]),
    );
    const written = readFileSync(join(repo, "docs", "tasks", "published", "review.md"), "utf-8");
    expect(written).toContain("reconcile: \"none: no architecture change\"");
  });
});

describe("the architecture section writer", () => {
  test("replaces one section and leaves the rest byte for byte", async () => {
    const t = tools();
    const path = join(repo, "docs", "tasks", "ticketready", "architecture.md");
    writeFileSync(
      path,
      dump({
        data: { type: "architecture", title: "Section fixture", status: "stable" },
        body: "\n## Contracts\n\nOld contract text.\n\n## Seams\n\nSeam text stays.\n",
      }),
      "utf-8",
    );
    const out = (await t.tw_write_architecture.execute(
      { selector: "ticketready", section: "Contracts", content: "New contract text." },
      ctx([...ALWAYS_DECLARED]),
    )) as string;
    expect(out).toContain("wrote '## Contracts'");
    const written = readFileSync(path, "utf-8");
    expect(written).toContain("New contract text.");
    expect(written).not.toContain("Old contract text.");
    expect(written).toContain("Seam text stays.");
    expect(written).toContain("## Seams");
  });

  test("appends a section that does not exist yet", async () => {
    const t = tools();
    await t.tw_write_architecture.execute(
      { selector: "ticketready", section: "Known gaps", content: "One gap." },
      ctx([...ALWAYS_DECLARED]),
    );
    const written = readFileSync(join(repo, "docs", "tasks", "ticketready", "architecture.md"), "utf-8");
    expect(written).toContain("## Known gaps");
    expect(written).toContain("One gap.");
    expect(written).toContain("Seam text stays.");
  });

  test("refuses a section write when there is no document to correct", async () => {
    const t = tools();
    await expect(
      t.tw_write_architecture.execute(
        { selector: "published", section: "Contracts", content: "x" },
        ctx([...ALWAYS_DECLARED]),
      ),
    ).rejects.toThrow(/a section write corrects an existing document/);
  });

  test("refuses an empty or multi-line section name", async () => {
    const t = tools();
    await expect(
      t.tw_write_architecture.execute(
        { selector: "ticketready", section: "  ", content: "x" },
        ctx([...ALWAYS_DECLARED]),
      ),
    ).rejects.toThrow(/section name is empty/);
    await expect(
      t.tw_write_architecture.execute(
        { selector: "ticketready", section: "A\nB", content: "x" },
        ctx([...ALWAYS_DECLARED]),
      ),
    ).rejects.toThrow(/single '##' heading name/);
  });
});
