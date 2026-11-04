/**
 * Cross-platform guarantees: what the package promises on Linux, macOS, and
 * Windows.
 *
 * The suite runs on whichever host executes it, so every expectation is stated
 * as a host-independent fact. Path assertions are exercised against all three
 * desktop path flavours (`path.posix` for Linux and macOS, `path.win32` for
 * Windows) and file fixtures are built from explicit bytes, so a rule that
 * only holds on the CI runner's Linux cannot pass silently and then break on
 * a Windows checkout.
 */

import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, posix, win32 } from "node:path";
import { randomBytes } from "node:crypto";
import { afterEach, describe, expect, test } from "vitest";

import { createTools, notifyConfigPath } from "../src/pi.js";
import { decodeText, normalizeNewlines, stripBom } from "../src/core/encoding.js";
import { FsPort } from "../src/core/fs-port.js";
import { migrate } from "../src/core/migrate.js";
import { parse } from "../src/core/frontmatter.js";
import { MAX_SLUG_LENGTH, WINDOWS_RESERVED_SLUGS, slugRejection } from "../src/core/slug.js";

const REPO_ROOT = process.cwd();

const created: string[] = [];

function mkTmp(prefix: string): string {
  const dir = join(tmpdir(), `${prefix}-${randomBytes(4).toString("hex")}`);
  mkdirSync(dir, { recursive: true });
  created.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of created.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** The non-empty segments of a path, whichever separator it uses. */
function segments(p: string): string[] {
  return p.split(/[\\/]/).filter((s) => s !== "");
}

interface Desktop {
  name: string;
  path: typeof posix;
  home: string;
}

/** The three desktop operating systems, each with the path module it uses. */
const DESKTOPS: Desktop[] = [
  { name: "linux", path: posix, home: "/home/patric" },
  { name: "macos", path: posix, home: "/Users/patric" },
  { name: "windows", path: win32, home: "C:\\Users\\Patric" },
];

const CONFIG_TAIL = [".unipi", "config", "notify", "config.json"];

/** The path module of the host running the suite. */
const HOST_PATH = process.platform === "win32" ? win32 : posix;

// ─── Notify config path ───────────────────────────────────────────────────────

describe("notify config path", () => {
  test("does not fall back to the literal '~' when HOME is unset (the Windows condition)", () => {
    const previous = process.env.HOME;
    delete process.env.HOME;
    try {
      const resolved = notifyConfigPath();
      // Native Windows sets USERPROFILE and leaves HOME unset. An env lookup
      // resolves to the literal "~" there, so the config is never found.
      expect(segments(resolved)).not.toContain("~");
      expect(resolved).toBe(join(homedir(), ...CONFIG_TAIL));
    } finally {
      if (previous === undefined) delete process.env.HOME;
      else process.env.HOME = previous;
    }
  });

  for (const desktop of DESKTOPS) {
    test(`${desktop.name}: joins the home directory and the fixed tail`, () => {
      const resolved = notifyConfigPath(desktop.home);
      // notifyConfigPath joins with the host's path module, so the expected
      // string is the host's join of a home shaped like the desktop's. The
      // absolute-path and basename assertions only mean something for the
      // flavour that matches the running host.
      expect(resolved).toBe(join(desktop.home, ...CONFIG_TAIL));
      expect(segments(resolved).slice(-CONFIG_TAIL.length)).toEqual(CONFIG_TAIL);
      expect(segments(resolved)).not.toContain("~");
      if (HOST_PATH === desktop.path) {
        expect(desktop.path.isAbsolute(resolved)).toBe(true);
        expect(desktop.path.basename(resolved)).toBe("config.json");
      }
    });
  }
});

// ─── Decoding each OS's default writer ────────────────────────────────────────

function withBom(prefix: number[], body: Buffer): Buffer {
  return Buffer.concat([Buffer.from(prefix), body]);
}

function utf8WithBom(text: string): Buffer {
  return withBom([0xef, 0xbb, 0xbf], Buffer.from(text, "utf8"));
}

function utf16leWithBom(text: string): Buffer {
  return withBom([0xff, 0xfe], Buffer.from(text, "utf16le"));
}

function utf16beWithBom(text: string): Buffer {
  const le = Buffer.from(text, "utf16le");
  const swapped = Buffer.allocUnsafe(le.length);
  for (let i = 0; i < le.length; i += 2) {
    swapped[i] = le[i + 1];
    swapped[i + 1] = le[i];
  }
  return withBom([0xfe, 0xff], swapped);
}

/**
 * How each OS writes a fresh markdown file. Linux and macOS write UTF-8 with
 * no mark; Notepad can write UTF-8 with a BOM; PowerShell 5.1 writes UTF-16LE.
 */
const OS_DEFAULT_WRITERS: Array<{ os: string; write: (text: string) => Buffer }> = [
  { os: "linux", write: (text) => Buffer.from(text, "utf8") },
  { os: "macos", write: (text) => Buffer.from(text, "utf8") },
  { os: "windows (Notepad)", write: (text) => utf8WithBom(text) },
  { os: "windows (Notepad, CRLF)", write: (text) => Buffer.from(text.replace(/\n/g, "\r\n"), "utf8") },
  { os: "windows (PowerShell 5.1)", write: (text) => utf16leWithBom(text) },
  { os: "windows (UTF-16BE editor)", write: (text) => utf16beWithBom(text) },
];

describe("decoding a file each OS writes by default", () => {
  const SAMPLE = "---\ntype: map\ntitle: Entwurf\n---\n\n# Grüße, Übersicht ✓\n";

  for (const { os, write } of OS_DEFAULT_WRITERS) {
    test(`${os}: decodes to exactly the authored text`, () => {
      const text = decodeText(write(SAMPLE));
      // Decoding is lossless up to the newline policy: CRLF is normalised
      // later, at the frontmatter seam, never confused for content now.
      expect(normalizeNewlines(text)).toBe(SAMPLE);
      expect(text).not.toContain("\uFFFD");
      expect(text.charCodeAt(0)).not.toBe(0xfeff);
    });
  }

  test("an empty file decodes to an empty string", () => {
    expect(decodeText(Buffer.alloc(0))).toBe("");
  });

  test("stripBom removes a mark a string port already decoded", () => {
    expect(stripBom("\uFEFF---\ntype: map\n---\n")).toBe("---\ntype: map\n---\n");
    expect(stripBom("---\ntype: map\n---\n")).toBe("---\ntype: map\n---\n");
  });

  test("CRLF frontmatter parses with no stray carriage return in any value", () => {
    const doc = parse("---\r\ntype: map\r\ntitle: Entwurf\r\nstatus: stable\r\n---\r\n\r\nBody.\r\n");
    // The last frontmatter line has no newline after it, so a naive split on
    // "\n" leaves the carriage return inside the value.
    expect(doc.data.status).toBe("stable");
    expect(doc.data.title).toBe("Entwurf");
    expect(doc.body).not.toContain("\r");
  });

  test("normalizeNewlines collapses CRLF and a lone CR to LF", () => {
    expect(normalizeNewlines("a\r\nb\rc\nd")).toBe("a\nb\nc\nd");
    expect(normalizeNewlines("a\nb")).toBe("a\nb");
  });

  test("frontmatter parses from a string that still carries a mark", () => {
    const doc = parse("\uFEFF---\ntype: map\ntitle: Entwurf\n---\nbody\n");
    expect(doc.data.type).toBe("map");
    expect(doc.body).toBe("body\n");
  });
});

// ─── Windows-authored artifacts through the real port and the migration ───────

const V3_MAP =
  "---\nkind: map\nslug: effort\ntitle: Entwurf\nstatus: active\ntasks:\n- slug: my-task\n  blocked_by: []\n  done: false\n---\n\n## Destination\n\nGrüße.\n";
// PowerShell writes CRLF, so the UTF-16LE fixture carries CRLF too.
const V3_TASK =
  "---\r\nkind: task\r\ntype: feature\r\nslug: my-task\r\ntitle: My task\r\nmap: effort\r\nstatus: ready\r\nblocked_by: []\r\nslices: [my-task]\r\n---\r\n\r\nThe body survives the migration: ✓.\r\n";

/** A v3 tree whose two artifacts are written the way Windows writes them. */
function seedWindowsAuthoredV3(root: string): void {
  mkdirSync(join(root, "docs/tasks/maps/effort"), { recursive: true });
  mkdirSync(join(root, "docs/tasks/my-task"), { recursive: true });
  writeFileSync(join(root, "docs/tasks/maps/effort/map.md"), utf8WithBom(V3_MAP));
  writeFileSync(join(root, "docs/tasks/my-task/task.md"), utf16leWithBom(V3_TASK));
  writeFileSync(join(root, "docs/tasks/state.yaml"), "task: null\nslice: null\nschema_version: 3\n");
}

describe("Windows-authored artifacts survive read and migration", () => {
  test("the real port decodes a UTF-8 BOM and a UTF-16LE document", () => {
    const dir = mkTmp("decode-port");
    seedWindowsAuthoredV3(dir);
    const port = new FsPort(dir);

    const map = port.read("docs/tasks/maps/effort/map.md");
    const task = port.read("docs/tasks/my-task/task.md");

    expect(map).toBe(V3_MAP);
    expect(task).toBe(V3_TASK);
    expect(parse(map).data.title).toBe("Entwurf");
    expect(parse(task).data.title).toBe("My task");
  });

  test("the migration keeps the text instead of persisting replacement characters", () => {
    const dir = mkTmp("decode-migrate");
    seedWindowsAuthoredV3(dir);

    const report = migrate(new FsPort(dir));
    expect(report.needsHuman.filter((item) => item.kind === "unparseable")).toEqual([]);

    const port = new FsPort(dir);
    const markdown = port.list().filter((p) => p.endsWith(".md"));
    expect(markdown.length).toBeGreaterThan(0);

    const types = new Set<string>();
    let text = "";
    for (const path of markdown) {
      const content = port.read(path);
      // The corruption this guards against: decoded as plain UTF-8, a UTF-16
      // document becomes replacement characters, and the rewrite persists them.
      expect(content, `${path} was decoded lossily`).not.toContain("\uFFFD");
      expect(content.charCodeAt(0), `${path} still starts with a byte-order mark`).not.toBe(0xfeff);
      const doc = parse(content);
      types.add(String(doc.data.type));
      for (const [key, value] of Object.entries(doc.data)) {
        // A CRLF document would leave the carriage return inside its last value.
        if (typeof value === "string") expect(value, `${path} ${key}`).not.toContain("\r");
      }
      expect(doc.body, `${path} body`).not.toContain("\r");
      text += content;
    }

    expect(types).toContain("map");
    expect(types).toContain("ticket");
    expect(text).toContain("Entwurf");
    expect(text).toContain("My task");
    expect(text).toContain("Grüße");
    expect(text).toContain("✓");
  });

  test("a failed commit restores a UTF-16 document byte for byte", () => {
    const dir = mkTmp("decode-rollback");
    seedWindowsAuthoredV3(dir);
    const taskPath = join(dir, "docs/tasks/my-task/task.md");
    const before = readFileSync(taskPath);
    expect(before.equals(utf16leWithBom(V3_TASK)), "fixture starts as UTF-16LE").toBe(true);

    // Fail after the first applied change, so the journal has to restore.
    expect(() => migrate(new FsPort(dir), { failAfterWrites: 1 })).toThrow(/injected failure/);
    expect(readFileSync(taskPath).equals(before), "the rollback re-encoded the file").toBe(true);
  });

  test("a byte-order mark never hides an artifact from the scan or the tools", async () => {
    const dir = mkTmp("decode-scan");
    const base = join(dir, "docs/tasks/bom");
    mkdirSync(join(base, "tickets/bom-ticket"), { recursive: true });
    writeFileSync(
      join(base, "map.md"),
      utf8WithBom("---\ntype: map\ntitle: Bom effort\nstatus: stable\n---\n\n## Destination\n\nShip.\n"),
    );
    writeFileSync(
      join(base, "tickets/bom-ticket/ticket.md"),
      utf16leWithBom(
        "---\ntype: ticket\nsubtype: feature\ntitle: Bom ticket\nstatus: stable\nworkflow_state: todo\nblocked_by: []\n---\n\nBody.\n",
      ),
    );

    const tools: Record<string, { description: string; execute: Function }> = createTools();
    const ctx = { directory: dir } as any;

    const frontier = JSON.parse(await tools.tw_frontier.execute({ selector: "bom", json: true }, ctx));
    expect(frontier.frontier.map((item: any) => item.slug)).toContain("bom-ticket");

    const shown = await tools.tw_show.execute({ selector: "bom-ticket", json: true }, ctx);
    expect(shown).toContain("Bom ticket");
  });
});

// ─── Slug rules, the Windows-specific half ────────────────────────────────────

const RESERVED = ["con", "prn", "aux", "nul"];
for (let i = 1; i <= 9; i++) RESERVED.push(`com${i}`, `lpt${i}`);

describe("slug rules are legal directory names on every desktop OS", () => {
  const ACCEPTED = ["a", "effort-1", "ticket-0a", "a".repeat(MAX_SLUG_LENGTH)];

  test("the cap is the documented length, and the boundary is exact", () => {
    expect(MAX_SLUG_LENGTH).toBe(64);
    expect(slugRejection("a".repeat(MAX_SLUG_LENGTH))).toBeNull();
    expect(slugRejection("a".repeat(MAX_SLUG_LENGTH + 1))).toMatch(/cap is 64/);
  });

  test("Windows reserves exactly the documented device names", () => {
    expect([...WINDOWS_RESERVED_SLUGS].sort()).toEqual([...RESERVED].sort());
    for (const name of RESERVED) {
      expect(slugRejection(name), name).toMatch(/reserves/);
    }
    // Near-misses stay legal, so the rule does not creep past the device list.
    for (const name of ["console", "auxiliary", "com10", "com0", "lpt10", "null", "con-1"]) {
      expect(slugRejection(name), name).toBeNull();
    }
  });

  test("shape refusals are unchanged and name the reason", () => {
    for (const slug of ["Land It", "land/it", "../escape", "-lead", "", "Upper"]) {
      expect(slugRejection(slug), slug).toMatch(/lowercase letters, digits, and hyphens/);
    }
  });

  for (const desktop of DESKTOPS) {
    test(`${desktop.name}: every accepted slug is exactly one directory name`, () => {
      const base = desktop.path.join("docs", "tasks");
      for (const slug of ACCEPTED) {
        const p = desktop.path.join(base, slug);
        expect(segments(p), slug).toHaveLength(segments(base).length + 1);
        expect(desktop.path.basename(p)).toBe(slug);
        expect(desktop.path.normalize(p)).toBe(p);
      }
    });
  }

  test("the creators refuse a reserved name and an over-long slug, and keep the boundary usable", async () => {
    const dir = mkTmp("slug-rules");
    mkdirSync(join(dir, "docs/tasks/rules"), { recursive: true });
    writeFileSync(
      join(dir, "docs/tasks/rules/map.md"),
      "---\ntype: map\ntitle: Rules\nstatus: stable\n---\n\n## Destination\n\nShip.\n\n## Non-goals\n\n## Non-negotiable facts\n",
    );

    const tools: Record<string, { description: string; execute: Function }> = createTools();
    const ctx = { directory: dir } as any;

    await expect(
      tools.tw_add_ticket.execute({ effort: "rules", slug: "con", title: "T", subtype: "feature" }, ctx),
    ).rejects.toThrow(/invalid slug 'con': .*reserves/);
    expect(existsSync(join(dir, "docs/tasks/rules/tickets/con"))).toBe(false);

    await expect(tools.tw_create_effort.execute({ effort: "aux", title: "T" }, ctx)).rejects.toThrow(
      /invalid effort slug 'aux': .*reserves/,
    );
    expect(existsSync(join(dir, "docs/tasks/aux"))).toBe(false);

    await expect(
      tools.tw_add_ticket.execute(
        { effort: "rules", slug: "a".repeat(MAX_SLUG_LENGTH + 1), title: "T", subtype: "feature" },
        ctx,
      ),
    ).rejects.toThrow(/cap is 64/);

    // The boundary itself is usable, so the cap refuses only what it must.
    await expect(
      tools.tw_add_ticket.execute(
        { effort: "rules", slug: "a".repeat(MAX_SLUG_LENGTH), title: "T", subtype: "feature" },
        ctx,
      ),
    ).resolves.toContain("created");
  });
});

// ─── .gitattributes: one line-ending contract for every checkout ──────────────

const HAS_GIT = existsSync(join(REPO_ROOT, ".git"));

/** The paths git tracks, as repo-relative POSIX strings. */
function trackedFiles(): string[] {
  const result = spawnSync("git", ["ls-files", "-z"], { cwd: REPO_ROOT, encoding: "buffer" });
  if (result.error !== undefined || result.status !== 0) return [];
  return (result.stdout as Buffer).toString("utf-8").split("\0").filter((p) => p !== "");
}

describe(".gitattributes keeps every checkout on LF", () => {
  test("declares LF for all text and for the file kinds the package ships", () => {
    const text = readFileSync(join(REPO_ROOT, ".gitattributes"), "utf-8");
    expect(text).toMatch(/^\* text=auto eol=lf$/m);
    for (const pattern of ["*.md", "*.sh", "*.ts", "*.mjs", "*.js", "*.json", "*.yaml"]) {
      expect(text, pattern).toContain(`${pattern} text eol=lf`);
    }
  });

  test.skipIf(!HAS_GIT)("every tracked file is LF, whatever the checkout did", () => {
    const files = trackedFiles();
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      // Declared `-text` in .gitattributes: the rule does not apply to them.
      if (file.endsWith(".min.js")) continue;
      // A tracked symlink has no bytes of its own.
      if (lstatSync(join(REPO_ROOT, file)).isSymbolicLink()) continue;
      const bytes = readFileSync(join(REPO_ROOT, file));
      expect(bytes.indexOf("\r\n"), `${file} carries CRLF`).toBe(-1);
    }
  });

  test.skipIf(!HAS_GIT)("git resolves eol=lf for the files an agent reads", () => {
    const files = [
      "README.md",
      "scripts/release.sh",
      "skills/engineering/wizard/template.sh",
      "src/pi.ts",
      "package.json",
    ];
    for (const file of files) {
      const result = spawnSync("git", ["check-attr", "eol", "--", file], { cwd: REPO_ROOT, encoding: "utf-8" });
      expect(result.error, `git check-attr failed for ${file}`).toBeUndefined();
      expect(result.stdout, file).toContain("eol: lf");
    }
  });
});
