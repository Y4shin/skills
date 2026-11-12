/**
 * The feedback family: the one tool that routes workflow feedback into the
 * pi-telemetry store, labelled as workflow feedback.
 */

import { Type } from "typebox";
import { FEEDBACK_KINDS, WORKFLOW_SOURCE } from "../core/feedback.js";
import { Tool, defStructured, outcome, sendWorkflowFeedback } from "./support.js";

// ── workflow feedback: the labelled route into the telemetry store ──

/** The feedback family's tool record: the one feedback recorder. */
export function feedbackTools(): Record<string, Tool> {
  return {
    tw_feedback: defStructured(
      "Record feedback about *this workflow*: friction in a phase, a step that fought back, or " +
        "something that worked notably well. Not for project findings. The row reaches the pi-telemetry " +
        "`submit_feedback` tool labelled as workflow feedback: as source 'workflow' when the installed " +
        "tool takes a source, else as a 'workflow.' kind prefix. Requires the pi-telemetry extension.",
      Type.Object({
        kind: Type.Union(FEEDBACK_KINDS.map((kind) => Type.Literal(kind))),
        data: Type.Union([Type.String(), Type.Record(Type.String(), Type.Unknown())]),
      }),
      async (p, ctx) => {
        const call = await sendWorkflowFeedback(ctx, p.kind, p.data);
        const label = call.namespaced
          ? `kind '${String(call.args.kind)}'`
          : `source '${WORKFLOW_SOURCE}' with kind '${p.kind}'`;
        return outcome(`Recorded workflow feedback as ${label}.`, {
          recorded: true,
          kind: p.kind,
          namespaced: call.namespaced,
          args: call.args,
        });
      },
    ),
  };
}
