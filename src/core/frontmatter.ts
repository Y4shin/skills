/**
 * YAML frontmatter parsing and serialization.
 *
 * Pure functions — no file I/O. The caller manages reading/writing files.
 */

import YAML from "yaml";
import { FrontmatterError } from "./err.js";

const FENCE = "---";

export type FrontmatterData = Record<string, unknown>;

export interface Document {
  data: FrontmatterData;
  body: string;
}

/** Parse a markdown string with YAML frontmatter. */
export function parse(text: string): Document {
  const lines = text.split("\n");
  if (lines.length === 0 || lines[0].trim() !== FENCE) {
    throw new FrontmatterError("no opening '---' frontmatter fence");
  }

  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === FENCE) {
      const raw = lines.slice(1, i).join("\n");
      const body = lines.slice(i + 1).join("\n");
      const parsed = YAML.parse(raw) ?? {};
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new FrontmatterError("frontmatter is not a mapping");
      }
      return { data: parsed as FrontmatterData, body };
    }
  }

  throw new FrontmatterError("unterminated frontmatter (no closing '---')");
}

/** Serialize a document back to a markdown string with frontmatter. */
export function dump(doc: Document): string {
  const block = YAML.stringify(doc.data, {
    sortMapEntries: false,
    indentSeq: false,
    defaultStringType: "PLAIN",
    defaultKeyType: "PLAIN",
    lineWidth: 0,
  }).replace(/\n+$/, "");

  return `${FENCE}\n${block}\n${FENCE}\n${doc.body}`;
}