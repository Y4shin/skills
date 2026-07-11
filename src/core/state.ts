/**
 * State.yaml management for the task-workflow.
 *
 * docs/tasks/state.yaml stores session resumption data only —
 * never duplicates artifact frontmatter.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import YAML from "yaml";

export interface WorkflowState {
  active: {
    task: string | null;
    slice: string | null;
    epic: string | null;
  };
  last_action: string;
  next_action: string;
}

const DEFAULT_STATE: WorkflowState = {
  active: { task: null, slice: null, epic: null },
  last_action: "",
  next_action: "",
};

export function statePath(root: string): string {
  return join(root, "docs", "tasks", "state.yaml");
}

export function load(root: string): WorkflowState {
  const p = statePath(root);
  if (!existsSync(p)) {
    return { ...DEFAULT_STATE, active: { ...DEFAULT_STATE.active } };
  }
  try {
    const raw = readFileSync(p, "utf-8");
    const parsed = YAML.parse(raw) ?? {};
    const active = (parsed.active as any) ?? {};
    return {
      active: {
        task: active.task ?? null,
        slice: active.slice ?? null,
        epic: active.epic ?? null,
      },
      last_action: (parsed.last_action as string) ?? "",
      next_action: (parsed.next_action as string) ?? "",
    };
  } catch {
    return { ...DEFAULT_STATE, active: { ...DEFAULT_STATE.active } };
  }
}

export function save(root: string, state: WorkflowState): void {
  const p = statePath(root);
  mkdirSync(dirname(p), { recursive: true });
  const yaml = YAML.stringify({
    active: {
      task: state.active.task,
      slice: state.active.slice,
      epic: state.active.epic,
    },
    last_action: state.last_action,
    next_action: state.next_action,
  }, {
    sortMapEntries: false,
    indentSeq: false,
    lineWidth: 0,
  });
  writeFileSync(p, yaml, "utf-8");
}

export function update(
  root: string,
  partial: Partial<WorkflowState>,
): WorkflowState {
  const current = load(root);
  if (partial.active) {
    if (partial.active.task !== undefined) current.active.task = partial.active.task;
    if (partial.active.slice !== undefined) current.active.slice = partial.active.slice;
    if (partial.active.epic !== undefined) current.active.epic = partial.active.epic;
  }
  if (partial.last_action !== undefined) current.last_action = partial.last_action;
  if (partial.next_action !== undefined) current.next_action = partial.next_action;
  save(root, current);
  return current;
}