// Canary extension for the pi-headless-isolation-spike.
// Throwaway spike instrument: writes what pi actually loaded (skills,
// context files, active tools) to $CANARY_OUT so isolation recipes can be
// asserted instead of assumed.
import { writeFileSync } from "node:fs";

function nameOf(x: any): string {
  if (x === null || x === undefined) return String(x);
  if (typeof x === "string") return x;
  return x.name ?? x.path ?? JSON.stringify(x);
}

export default function (pi: any) {
  const write = (phase: string, event: any) => {
    const opts = event?.systemPromptOptions ?? {};
    const report = {
      phase,
      cwd: opts.cwd,
      skills: (opts.skills ?? []).map(nameOf),
      contextFiles: (opts.contextFiles ?? []).map(nameOf),
      selectedTools: (opts.selectedTools ?? []).map(nameOf),
      appendSystemPrompt: opts.appendSystemPrompt ?? null,
    };
    const out = process.env.CANARY_OUT;
    if (out) writeFileSync(out, JSON.stringify(report, null, 2));
  };
  pi.on("session_start", async (event: any) => write("session_start", event));
  pi.on("before_agent_start", async (event: any) => write("before_agent_start", event));
}
