/**
 * opencode plugin: register the prd-workflow's agent-driven operations as native
 * tools (the `prd_*` family). Each tool reuses the exact CLI implementation via
 * `runCapture`, so output is identical to `node prd-tool.js <subcommand>`.
 *
 * The forced-context emitters (reference/profile/forge snippets/workflow-gate)
 * stay CLI-injected in the command headers — they are not exposed as tools.
 */

import { type Plugin, tool } from "@opencode-ai/plugin";

import { runCapture } from "./cli";

const z = tool.schema;

/** Run a prd-tool subcommand in-process, rooted at the project directory. */
async function runTool(directory: string, argv: string[]): Promise<string> {
  const prev = process.cwd();
  try {
    process.chdir(directory);
  } catch {
    /* directory may be unavailable; --root still scopes filesystem ops */
  }
  try {
    const { code, out, err } = await runCapture(["--root", directory, ...argv]);
    if (code !== 0) {
      const msg = (err || out).trim().replace(/^[Ee]rror:\s*/, "");
      throw new Error(msg || `prd-tool exited with code ${code}`);
    }
    return out.replace(/\n$/, "");
  } finally {
    try {
      process.chdir(prev);
    } catch {
      /* ignore */
    }
  }
}

const flag = (v: boolean | undefined, name: string): string[] => (v ? [name] : []);

export const PrdWorkflowPlugin: Plugin = async () => {
  return {
    tool: {
      prd_show: tool({
        description:
          "Show the full YAML frontmatter of a prd-workflow artifact (epic/PRD) resolved by slug, issue number, or path.",
        args: {
          selector: z.string().describe("Slug, issue number (#n or n), or path to the artifact."),
          json: z.boolean().optional().describe("Emit JSON instead of key: value lines."),
        },
        async execute(args, ctx) {
          return runTool(ctx.directory, ["show", args.selector, ...flag(args.json, "--json")]);
        },
      }),

      prd_get: tool({
        description: "Print a single frontmatter field of a prd-workflow artifact.",
        args: {
          selector: z.string().describe("Slug, issue number, or path."),
          field: z.string().describe("Frontmatter field name."),
        },
        async execute(args, ctx) {
          return runTool(ctx.directory, ["get", args.selector, args.field]);
        },
      }),

      prd_set: tool({
        description:
          "Set a scalar frontmatter field of an artifact (auto-typed: int/bool/null/string).",
        args: {
          selector: z.string().describe("Slug, issue number, or path."),
          field: z.string().describe("Frontmatter field to set."),
          value: z.string().describe("New value (coerced to int/bool/null/string)."),
        },
        async execute(args, ctx) {
          return runTool(ctx.directory, ["set", args.selector, args.field, args.value]);
        },
      }),

      prd_set_slices: tool({
        description: "Set a PRD's `slices:` list to the given issue numbers.",
        args: {
          selector: z.string().describe("PRD slug, issue number, or path."),
          numbers: z.array(z.string()).describe("Slice issue numbers (e.g. ['3','4','5'])."),
        },
        async execute(args, ctx) {
          return runTool(ctx.directory, ["set-slices", args.selector, ...args.numbers]);
        },
      }),

      prd_resolve: tool({
        description: "Resolve a slug / issue number / path to the artifact's file path.",
        args: {
          selector: z.string().describe("Slug, issue number, or path."),
          kind: z.enum(["epic", "prd"]).optional().describe("Constrain the resolution."),
        },
        async execute(args, ctx) {
          return runTool(ctx.directory, ["resolve", args.selector, ...(args.kind ? ["--kind", args.kind] : [])]);
        },
      }),

      prd_assert_kind: tool({
        description:
          "Assert an artifact's `kind` (epic/feature/capability) before slicing it; fails if it differs.",
        args: {
          selector: z.string().describe("Slug, issue number, or path."),
          kind: z.enum(["epic", "feature", "capability"]).describe("Expected kind."),
        },
        async execute(args, ctx) {
          return runTool(ctx.directory, ["assert-kind", args.selector, args.kind]);
        },
      }),

      prd_list: tool({
        description: "List epics and PRDs in the docs/prd tree, with optional filters.",
        args: {
          kind: z.enum(["epic", "feature", "capability"]).optional(),
          status: z.string().optional().describe("Filter by frontmatter status."),
          epic: z.string().optional().describe("Only PRDs belonging to this epic slug."),
          json: z.boolean().optional(),
        },
        async execute(args, ctx) {
          const argv = ["list"];
          if (args.kind) argv.push("--kind", args.kind);
          if (args.status) argv.push("--status", args.status);
          if (args.epic) argv.push("--epic", args.epic);
          argv.push(...flag(args.json, "--json"));
          return runTool(ctx.directory, argv);
        },
      }),

      prd_slices: tool({
        description: "List a PRD's surviving slice docs (presence == open work).",
        args: {
          selector: z.string().describe("PRD slug, issue number, or path."),
          json: z.boolean().optional(),
        },
        async execute(args, ctx) {
          return runTool(ctx.directory, ["slices", args.selector, ...flag(args.json, "--json")]);
        },
      }),

      prd_finalizable: tool({
        description: "Check a PRD is ready to finalize (no surviving slice docs); fails otherwise.",
        args: { selector: z.string().describe("PRD slug, issue number, or path.") },
        async execute(args, ctx) {
          return runTool(ctx.directory, ["prd-finalizable", args.selector]);
        },
      }),

      prd_lint: tool({
        description:
          "Show frontmatter violations across the docs/prd tree (or a single artifact) — the adopt-prd worklist.",
        args: {
          selector: z.string().optional().describe("Optional path to a single artifact; omit to scan all."),
          json: z.boolean().optional(),
        },
        async execute(args, ctx) {
          const argv = ["show-violations"];
          if (args.selector) argv.push(args.selector);
          argv.push(...flag(args.json, "--json"));
          return runTool(ctx.directory, argv);
        },
      }),

      prd_epic_prds: tool({
        description: "List an epic's planned child PRDs with their issue/done state.",
        args: {
          selector: z.string().describe("Epic slug, milestone number, or path."),
          json: z.boolean().optional(),
        },
        async execute(args, ctx) {
          return runTool(ctx.directory, ["epic", "prds", args.selector, ...flag(args.json, "--json")]);
        },
      }),

      prd_epic_set_prd_issue: tool({
        description: "Fill the issue number of an epic's child PRD entry.",
        args: {
          selector: z.string().describe("Epic slug, milestone number, or path."),
          prd_slug: z.string().describe("Child PRD slug."),
          issue: z.string().describe("Issue number (#n or n)."),
        },
        async execute(args, ctx) {
          return runTool(ctx.directory, ["epic", "set-prd-issue", args.selector, args.prd_slug, args.issue]);
        },
      }),

      prd_epic_prd_issue: tool({
        description: "Print the issue number of an epic's child PRD entry.",
        args: {
          selector: z.string().describe("Epic slug, milestone number, or path."),
          prd_slug: z.string().describe("Child PRD slug."),
        },
        async execute(args, ctx) {
          return runTool(ctx.directory, ["epic", "prd-issue", args.selector, args.prd_slug]);
        },
      }),

      prd_epic_tick: tool({
        description: "Mark an epic's child PRD as finalized (done: true).",
        args: {
          selector: z.string().describe("Epic slug, milestone number, or path."),
          prd_slug: z.string().describe("Child PRD slug."),
        },
        async execute(args, ctx) {
          return runTool(ctx.directory, ["epic", "tick", args.selector, args.prd_slug]);
        },
      }),

      prd_epic_finalizable: tool({
        description: "Check every child PRD of an epic is finalized (finalize-epic gate); fails otherwise.",
        args: { selector: z.string().describe("Epic slug, milestone number, or path.") },
        async execute(args, ctx) {
          return runTool(ctx.directory, ["epic", "finalizable", args.selector]);
        },
      }),
    },
  };
};
