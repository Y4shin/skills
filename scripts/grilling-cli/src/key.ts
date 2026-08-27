// Key module — .grilling.json map file (key → real dir) in CWD.
// The agent only ever holds the --state <key> string; the real dir is hidden.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const MAP_FILE = ".grilling.json";

type KeyMap = Record<string, string>;

export function writeKey(cwd: string, key: string, dir: string): void {
  const mapPath = join(cwd, MAP_FILE);
  let map: KeyMap = {};
  if (existsSync(mapPath)) {
    try {
      map = JSON.parse(readFileSync(mapPath, "utf-8")) as KeyMap;
    } catch {
      throw new Error(`Corrupt ${MAP_FILE} in ${cwd}: failed to parse JSON`);
    }
  }
  map[key] = dir;
  writeFileSync(mapPath, JSON.stringify(map, null, 2), "utf-8");
}

export function resolveKey(cwd: string, key: string): string {
  const mapPath = join(cwd, MAP_FILE);
  if (!existsSync(mapPath)) {
    throw new Error(
      `No .grilling.json found in ${cwd} — no keys registered. Run 'start' first.`,
    );
  }
  let map: KeyMap;
  try {
    map = JSON.parse(readFileSync(mapPath, "utf-8")) as KeyMap;
  } catch {
    throw new Error(`Corrupt ${MAP_FILE} in ${cwd}: failed to parse JSON`);
  }
  if (!(key in map)) {
    throw new Error(
      `Unknown key "${key}" in ${MAP_FILE}. Available: ${Object.keys(map).join(", ")}`,
    );
  }
  return map[key];
}
