/**
 * Workflow state model for state.yaml.
 *
 * Pure data — no file I/O. Serializes to/from a plain YAML-compatible object.
 */

export interface WorkflowState {
  task: string | null;
  slice: string | null;
}

export const DEFAULT_STATE: WorkflowState = {
  task: null,
  slice: null,
};

/** Serialize to a plain object for YAML. */
export function toObject(state: WorkflowState): Record<string, unknown> {
  return {
    task: state.task,
    slice: state.slice,
  };
}

/** Parse from a plain object read from YAML. */
export function fromObject(raw: unknown): WorkflowState {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_STATE };
  const o = raw as Record<string, unknown>;
  return {
    task: typeof o.task === "string" ? o.task : null,
    slice: typeof o.slice === "string" ? o.slice : null,
  };
}