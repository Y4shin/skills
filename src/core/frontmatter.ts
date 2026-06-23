/**
 * Read and write the YAML frontmatter block of a markdown file.
 *
 * A frontmatter file is `---\n<yaml>\n---\n<body>`. We parse the YAML into an
 * ordered object and keep the body verbatim, so a mutation rewrites only the
 * frontmatter and leaves the prose untouched. Comments *inside* the frontmatter
 * block are not preserved across a write — this is a programmatic editor, not a
 * round-tripping one.
 */

import { readFileSync, writeFileSync } from "node:fs";
import YAML from "yaml";

import { FrontmatterError } from "./errors";

export { FrontmatterError };

const FENCE = "---";

/** Split into lines keeping their trailing newline (Python splitlines(keepends=True)). */
function splitLinesKeepEnds(text: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < text.length) {
    const j = text.indexOf("\n", i);
    if (j === -1) {
      out.push(text.slice(i));
      break;
    }
    out.push(text.slice(i, j + 1));
    i = j + 1;
  }
  return out;
}

export type FrontmatterData = Record<string, unknown>;

export class Document {
  path: string;
  data: FrontmatterData; // parsed frontmatter (empty object if the block was empty)
  body: string; // everything after the closing fence, verbatim

  constructor(path: string, data: FrontmatterData, body: string) {
    this.path = path;
    this.data = data;
    this.body = body;
  }

  dump(): string {
    const block = YAML.stringify(this.data, {
      // Match PyYAML safe_dump(sort_keys=False, default_flow_style=False): block
      // sequences are not extra-indented (the `-` sits at the key's indent).
      sortMapEntries: false,
      indentSeq: false,
      defaultStringType: "PLAIN",
      defaultKeyType: "PLAIN",
      lineWidth: 0,
    }).replace(/\n+$/, "");
    return `${FENCE}\n${block}\n${FENCE}\n${this.body}`;
  }

  save(): void {
    writeFileSync(this.path, this.dump(), "utf-8");
  }
}

export function parse(path: string): Document {
  const text = readFileSync(path, "utf-8");
  const lines = splitLinesKeepEnds(text);
  if (lines.length === 0 || lines[0].trim() !== FENCE) {
    throw new FrontmatterError(`${path}: no opening '---' frontmatter fence`);
  }

  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === FENCE) {
      const raw = lines.slice(1, i).join("");
      const body = lines.slice(i + 1).join("");
      const parsed = YAML.parse(raw) ?? {};
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new FrontmatterError(`${path}: frontmatter is not a mapping`);
      }
      return new Document(path, parsed as FrontmatterData, body);
    }
  }

  throw new FrontmatterError(`${path}: unterminated frontmatter (no closing '---')`);
}
