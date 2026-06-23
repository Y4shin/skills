/**
 * Lint the YAML frontmatter of the planning artifacts under `docs/prd`.
 *
 * Scans the tree by **file location** (not by parsing first, so a file with no
 * fence is still reportable) and returns a clear list of what each artifact is
 * missing — the input the `adopt-prd` skill uses to fix up a directory at once.
 */

import { existsSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";

import { FrontmatterError, parse, type FrontmatterData } from "./frontmatter";
import { prdRoot } from "./model";

const EPIC_STATUS = ["draft", "prds-planned", "in-progress", "done"];
const PRD_STATUS = ["draft", "issues-created", "in-progress", "done"];
const PRD_KINDS = ["feature", "capability"];
const SLICE_MODES = ["hitl", "afk"];
const SLICE_RE = /^(\d+)-(.+)\.md$/; // <issue>-<slug>.md

export type Family = "epic" | "prd" | "slice";

export interface Report {
  path: string;
  family: Family; // inferred from location
  violations: string[];
}

export function reportOk(r: Report): boolean {
  return r.violations.length === 0;
}

function isDir(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function nonemptyStr(v: unknown): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

function pyRepr(v: unknown): string {
  // Mirror Python's !r for the value types frontmatter carries.
  if (typeof v === "string") return `'${v}'`;
  if (v === null || v === undefined) return "None";
  if (v === true) return "True";
  if (v === false) return "False";
  return String(v);
}

function checkStr(data: FrontmatterData, key: string, out: string[]): void {
  if (!(key in data)) {
    out.push(`missing required field '${key}'`);
  } else if (!nonemptyStr(data[key])) {
    out.push(`field '${key}' is empty — expected a non-empty string`);
  }
}

function checkChoice(
  data: FrontmatterData,
  key: string,
  choices: string[],
  out: string[],
): void {
  const allowed = choices.join(", ");
  if (!(key in data)) {
    out.push(`missing required field '${key}' (expected one of: ${allowed})`);
  } else if (!choices.includes(data[key] as string)) {
    out.push(`field '${key}' is ${pyRepr(data[key])} — must be one of: ${allowed}`);
  }
}

/** Classify an artifact file by its location in the docs/prd tree. */
export function familyFor(path: string): Family {
  if (basename(path) === "epic.md" || basename(dirname(dirname(path))) === "epics") {
    return "epic";
  }
  if (basename(dirname(path)) === "slices") {
    return "slice";
  }
  return "prd";
}

/**
 * Return the field-level frontmatter violations of *data* for *family*. Checks
 * required fields and value domains only; location checks live in validateFile.
 */
export function validateData(data: FrontmatterData, family: Family): string[] {
  const out: string[] = [];
  if (family === "epic") {
    checkChoice(data, "kind", ["epic"], out);
    checkStr(data, "title", out);
    checkStr(data, "slug", out);
    checkChoice(data, "status", EPIC_STATUS, out);
  } else if (family === "slice") {
    checkChoice(data, "kind", PRD_KINDS, out);
    checkStr(data, "title", out);
    checkStr(data, "slug", out);
    if (!("issue" in data)) {
      out.push("missing required field 'issue'");
    } else if (!Number.isInteger(data["issue"])) {
      out.push(`field 'issue' is ${pyRepr(data["issue"])} — expected an integer issue number`);
    }
    checkStr(data, "prd", out);
    checkChoice(data, "mode", SLICE_MODES, out);
  } else {
    checkChoice(data, "kind", PRD_KINDS, out);
    checkStr(data, "title", out);
    checkStr(data, "slug", out);
    checkChoice(data, "status", PRD_STATUS, out);
  }
  return out;
}

/** Parse and lint a single artifact file, including location consistency. */
export function validateFile(path: string, family: Family): Report {
  let data: FrontmatterData;
  try {
    data = parse(path).data;
  } catch (e) {
    if (e instanceof FrontmatterError) {
      const msg = e.message.split(": ").slice(1).join(": ") || e.message;
      return { path, family, violations: [`no/invalid frontmatter: ${msg}`] };
    }
    throw e;
  }

  const out = validateData(data, family);
  if (family === "slice") {
    const m = SLICE_RE.exec(basename(path));
    if (!m) {
      out.push(
        `filename '${basename(path)}' does not match the '<issue>-<slug>.md' convention`,
      );
    } else {
      const num = parseInt(m[1], 10);
      const fslug = m[2];
      if (nonemptyStr(data["slug"]) && data["slug"] !== fslug) {
        out.push(`slug ${pyRepr(data["slug"])} does not match the filename slug '${fslug}'`);
      }
      if (Number.isInteger(data["issue"]) && data["issue"] !== num) {
        out.push(`issue ${data["issue"]} does not match the filename number ${num}`);
      }
    }
  } else {
    const dirName = basename(dirname(path));
    if (nonemptyStr(data["slug"]) && data["slug"] !== dirName) {
      out.push(`slug ${pyRepr(data["slug"])} does not match directory name '${dirName}'`);
    }
  }
  return { path, family, violations: out };
}

/** Every frontmatter-bearing artifact path under docs/prd, with its family. */
export function candidateFiles(root: string): Array<[string, Family]> {
  const base = prdRoot(root);
  const out: Array<[string, Family]> = [];
  const epics = join(base, "epics");
  if (isDir(epics)) {
    for (const name of readdirSync(epics).sort()) {
      const f = join(epics, name, "epic.md");
      if (existsSync(f) && statSync(f).isFile()) out.push([f, "epic"]);
    }
  }
  if (isDir(base)) {
    for (const name of readdirSync(base).sort()) {
      const f = join(base, name, "prd.md");
      if (existsSync(f) && statSync(f).isFile()) {
        if (basename(dirname(dirname(f))) === "epics") continue;
        out.push([f, "prd"]);
      }
    }
    // slices: docs/prd/<slug>/slices/*.md
    for (const name of readdirSync(base).sort()) {
      const slicesDir = join(base, name, "slices");
      if (isDir(slicesDir)) {
        for (const sname of readdirSync(slicesDir).sort()) {
          const f = join(slicesDir, sname);
          if (sname.endsWith(".md") && statSync(f).isFile()) out.push([f, "slice"]);
        }
      }
    }
  }
  return out;
}

/** Lint every artifact under docs/prd; returns one Report per file. */
export function scan(root: string): Report[] {
  return candidateFiles(root).map(([path, family]) => validateFile(path, family));
}
