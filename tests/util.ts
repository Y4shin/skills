import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Create a fresh temp directory (the analogue of pytest's tmp_path). */
export function mkTmp(): string {
  return mkdtempSync(join(tmpdir(), "prd-tool-test-"));
}

/** Create docs/prd under root and return it. */
export function prdDir(root: string): string {
  const d = join(root, "docs", "prd");
  mkdirSync(d, { recursive: true });
  return d;
}
