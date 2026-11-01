/**
 * Workflow feedback: the argument shape `tw_feedback` sends to the
 * `submit_feedback` tool of the pi-telemetry extension.
 *
 * Pure functions, no I/O: the caller reads the sibling tool's parameter
 * schema and executes the nested call. The adaptation exists because
 * pi-telemetry gains a `source` parameter that the installed version may not
 * have yet, and both shapes have to be addressed correctly:
 *
 *   - with `source`: source "workflow" plus the bare signal kind
 *     (`{ source: "workflow", kind: "bad", data }`)
 *   - without: the namespaced kind, one namespace in the one field available
 *     (`{ kind: "workflow.bad", data }`)
 *
 * A store therefore holds every workflow-feedback row under either a
 * `workflow` source or a `workflow.` kind prefix, and never mixes the two
 * within one install.
 */

/** The source value that marks a row as feedback about this workflow. */
export const WORKFLOW_SOURCE = "workflow";

/**
 * The pre-approved signals. `expected` is not a complaint: it marks a
 * designed-for escape hatch firing, so its frequency can be correlated.
 */
export const FEEDBACK_KINDS = ["good", "bad", "friction", "architecture", "expected"] as const;

export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

export interface FeedbackCall {
  /** Arguments for the sibling `submit_feedback` tool. */
  args: Record<string, unknown>;
  /**
   * True when the row is namespaced through the kind prefix because the
   * installed tool has no `source` parameter.
   */
  namespaced: boolean;
}

export function isFeedbackKind(value: unknown): value is FeedbackKind {
  return typeof value === "string" && (FEEDBACK_KINDS as readonly string[]).includes(value);
}

/**
 * Whether a tool's parameter schema declares a `source` input.
 *
 * Reads the JSON-schema `properties` map, so it works for the TypeBox schema
 * pi registers and for a plain schema alike. An unreadable or absent schema
 * reports false: the caller then takes the namespaced shape, which every
 * version of the target accepts.
 */
export function declaresSource(parameters: unknown): boolean {
  if (parameters === null || typeof parameters !== "object") return false;
  const properties = (parameters as { properties?: unknown }).properties;
  if (properties === null || typeof properties !== "object") return false;
  return "source" in (properties as Record<string, unknown>);
}

/**
 * Build the `submit_feedback` arguments for one workflow-feedback row.
 *
 * `parameters` is the sibling tool's schema, or undefined when the session
 * cannot report it. Undefined follows the no-source path on purpose: the
 * namespaced kind is accepted by both shapes, so a harness that hides the
 * schema still records a correctly labelled row.
 */
export function feedbackCall(kind: unknown, data: unknown, parameters: unknown): FeedbackCall {
  if (!isFeedbackKind(kind)) {
    throw new Error(
      `'${String(kind)}' is not a workflow feedback kind; use one of ${FEEDBACK_KINDS.join(", ")}`,
    );
  }
  if (data === undefined || data === null || (typeof data !== "string" && typeof data !== "object")) {
    throw new Error("feedback data must be a string or an object");
  }
  if (typeof data === "string" && data.trim() === "") {
    throw new Error("feedback data is empty; say what happened in one or two sentences");
  }
  if (declaresSource(parameters)) {
    return { args: { source: WORKFLOW_SOURCE, kind, data }, namespaced: false };
  }
  return { args: { kind: `${WORKFLOW_SOURCE}.${kind}`, data }, namespaced: true };
}
