/**
 * Workflow state model for state.yaml, version 4.
 *
 * Pure data, no file I/O. Serializes to/from a plain YAML-compatible object.
 *
 * The model is two pointers (`map`, `task`) plus `rest`: the lossless bag of
 * every key the module does not model (schema_version, a legacy v3 `slice`
 * key, v1's `active` / `last_action` / `next_action`). A read-modify-write
 * cycle reproduces every key verbatim; a state write never again destroys
 * keys it does not model.
 */

export interface WorkflowState {
  map: string | null;
  task: string | null;
  rest: Record<string, unknown>;
}

export const DEFAULT_STATE: WorkflowState = { map: null, task: null, rest: {} };

/** True when `v` is a plain object (not array, not null). */
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * A pointer is a real string; anything else (number, boolean, the string
 * "None" left over from the old encoding wart) is null.
 */
function pointer(v: unknown): string | null {
  if (typeof v !== "string") return null;
  return v === "None" ? null : v;
}

/**
 * Parse from a plain object read from YAML.
 *
 * Supports the flat format (v2, v3, v4: top-level `map` / `task`) and the v1
 * nested format (`active: { map, task }`). `rest` holds every original
 * top-level key the module does not model, verbatim, so serialize can put
 * them back. Never throws on shape.
 */
export function fromObject(raw: unknown): WorkflowState {
  if (!isPlainObject(raw)) return { ...DEFAULT_STATE, rest: {} };

  // v1 nested format: { active: { map, task }, last_action, next_action }
  // No top-level map/task keys; pointers read from the active block.
  if (isPlainObject(raw.active) && raw.map === undefined && raw.task === undefined) {
    const active = raw.active as Record<string, unknown>;
    return {
      map: pointer(active.map),
      task: pointer(active.task),
      rest: { ...raw },
    };
  }

  // Flat format (v2, v3, v4): { map, task, schema_version, slice, ... }
  const rest: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (k === "map" || k === "task") continue;
    rest[k] = v;
  }
  return {
    map: pointer(raw.map),
    task: pointer(raw.task),
    rest,
  };
}

/**
 * Serialize to a plain object for YAML.
 *
 * Unmodeled keys come back first in their original relative order; the
 * modeled pointers come last. Null pointers are real nulls, never the
 * string "None". Never stamps `schema_version` and never writes a `slice`
 * key of its own: a legacy `slice` survives only because fromObject kept
 * it in `rest`.
 */
export function toObject(state: WorkflowState): Record<string, unknown> {
  return { ...state.rest, map: state.map, task: state.task };
}
