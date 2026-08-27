// CLI entry — real subcommand dispatch (slice 2).
// The HTML is embedded at build time via a Vite ?raw import so the
// committed .mjs is a self-contained single artifact.
import spaHtml from "../../grilling-ui/dist/index.html?raw";

import { parseArgs } from "node:util";
import { resolveKey } from "./key.js";
import { start } from "./commands/start.js";
import { get } from "./commands/get.js";
import { refresh } from "./commands/refresh.js";
import { wait } from "./commands/wait.js";
import { finalize } from "./commands/finalize.js";
import {
  addQuestion,
  addEdge,
  promote,
  setState,
  setSummary,
  resolveContradiction,
} from "./commands/update.js";

const USAGE = `\
Usage: grilling-cli.mjs <subcommand> [flags]

Subcommands:
  start                              Start a grilling session
  update <sub>                       Mutate grilling state
  get [subset]                       Read grilling state
  refresh                            Signal the server to re-render (stub)
  wait <state>                       Block until page-state matches
  finalize                           Check coast-clear, emit summary

Update subcommands:
  add-question --id <5-word> --title --body --rec --round <n> --deps <ids>
  add-edge --from <id> --to <id> --type dep|contra|ref --id <id>
  promote --id <id> --to-round <n>
  set-state --state <one of 7>
  set-summary --text "running summary"
  resolve-contradiction --edge <id>

Options:
  --help, -h                        Show this help message
  --state <key>                     State key (required for all subcommands except start)
  --timeout <ms>                     Timeout for wait (default: 30 min)
  --no-open                          Do not auto-open the browser (used with start)

The inlined SPA HTML is embedded in this bundle (${spaHtml.length} bytes).
`;

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    process.stdout.write(USAGE);
    process.exit(args.length === 0 ? 1 : 0);
  }

  const subcommand = args[0];
  const rest = args.slice(1);

  try {
    switch (subcommand) {
      case "start":
        await cmdStart(rest);
        break;
      case "update":
        await cmdUpdate(rest);
        break;
      case "get":
        await cmdGet(rest);
        break;
      case "refresh":
        await cmdRefresh(rest);
        break;
      case "wait":
        await cmdWait(rest);
        break;
      case "finalize":
        await cmdFinalize(rest);
        break;
      default:
        process.stderr.write(`Unknown subcommand: ${subcommand}\n`);
        process.stderr.write(USAGE);
        process.exit(1);
    }
  } catch (e) {
    process.stderr.write(`${(e as Error).message}\n`);
    process.exit(1);
  }
}

function requireStateKey(rest: string[]): string {
  const { values } = parseArgs({
    args: rest,
    options: {
      state: { type: "string" },
    },
    allowPositionals: true,
  });
  const key = values.state;
  if (!key) {
    throw new Error("Missing required --state <key>. Run 'start' to get a key.");
  }
  const dir = resolveKey(process.cwd(), key);
  return dir;
}

async function cmdStart(rest: string[]): Promise<void> {
  // start doesn't need --state; it creates one.
  const result = await start({ cwd: process.cwd() });
  // start() already prints the real dir to stdout.
  // Store key for potential future use.
  void result;
}

async function cmdUpdate(rest: string[]): Promise<void> {
  const sub = rest[0];
  if (!sub) {
    throw new Error("Missing update subcommand. See --help for usage.");
  }
  const subArgs = rest.slice(1);

  switch (sub) {
    case "add-question":
      await cmdAddQuestion(subArgs);
      break;
    case "add-edge":
      await cmdAddEdge(subArgs);
      break;
    case "promote":
      await cmdPromote(subArgs);
      break;
    case "set-state":
      await cmdSetState(subArgs);
      break;
    case "set-summary":
      await cmdSetSummary(subArgs);
      break;
    case "resolve-contradiction":
      await cmdResolveContradiction(subArgs);
      break;
    default:
      throw new Error(`Unknown update subcommand: ${sub}. See --help.`);
  }
}

async function cmdAddQuestion(rest: string[]): Promise<void> {
  const { values } = parseArgs({
    args: rest,
    options: {
      state: { type: "string" },
      id: { type: "string" },
      title: { type: "string" },
      body: { type: "string" },
      rec: { type: "string" },
      round: { type: "string" },
      deps: { type: "string" },
    },
    allowPositionals: true,
  });
  const dir = resolveKey(process.cwd(), values.state!);
  const deps = values.deps
    ? values.deps.split(",").map((d) => d.trim()).filter(Boolean)
    : [];
  await addQuestion(dir, {
    id: values.id!,
    title: values.title ?? "",
    body: values.body ?? "",
    rec: values.rec ?? "",
    round: parseInt(values.round ?? "1", 10),
    deps,
  });
}

async function cmdAddEdge(rest: string[]): Promise<void> {
  const { values } = parseArgs({
    args: rest,
    options: {
      state: { type: "string" },
      id: { type: "string" },
      from: { type: "string" },
      to: { type: "string" },
      type: { type: "string" },
    },
    allowPositionals: true,
  });
  const dir = resolveKey(process.cwd(), values.state!);
  await addEdge(dir, {
    id: values.id!,
    from: values.from!,
    to: values.to!,
    type: values.type as "dep" | "contra" | "ref",
  });
}

async function cmdPromote(rest: string[]): Promise<void> {
  const { values } = parseArgs({
    args: rest,
    options: {
      state: { type: "string" },
      id: { type: "string" },
      "to-round": { type: "string" },
    },
    allowPositionals: true,
  });
  const dir = resolveKey(process.cwd(), values.state!);
  await promote(dir, {
    id: values.id!,
    toRound: parseInt(values["to-round"]!, 10),
  });
}

async function cmdSetState(rest: string[]): Promise<void> {
  // --state <key> resolves the dir; the target page-state is a positional arg.
  // Usage: update set-state --state <key> <target-state>
  const { values, positionals } = parseArgs({
    args: rest,
    options: {
      state: { type: "string" },
    },
    allowPositionals: true,
  });
  const dir = resolveKey(process.cwd(), values.state!);
  const target = positionals[0];
  if (!target) {
    throw new Error("Missing target state. Usage: update set-state --state <key> <target-state>");
  }
  await setState(dir, target as never);
}

async function cmdSetSummary(rest: string[]): Promise<void> {
  const { values } = parseArgs({
    args: rest,
    options: {
      state: { type: "string" },
      text: { type: "string" },
    },
    allowPositionals: true,
  });
  const dir = resolveKey(process.cwd(), values.state!);
  await setSummary(dir, values.text ?? "");
}

async function cmdResolveContradiction(rest: string[]): Promise<void> {
  const { values } = parseArgs({
    args: rest,
    options: {
      state: { type: "string" },
      edge: { type: "string" },
    },
    allowPositionals: true,
  });
  const dir = resolveKey(process.cwd(), values.state!);
  await resolveContradiction(dir, { edge: values.edge! });
}

async function cmdGet(rest: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args: rest,
    options: {
      state: { type: "string" },
    },
    allowPositionals: true,
  });
  const dir = resolveKey(process.cwd(), values.state!);
  const subset = positionals[0];
  const output = await get(dir, subset);
  process.stdout.write(output + "\n");
}

async function cmdRefresh(rest: string[]): Promise<void> {
  const { values } = parseArgs({
    args: rest,
    options: {
      state: { type: "string" },
    },
    allowPositionals: true,
  });
  const dir = resolveKey(process.cwd(), values.state!);
  await refresh(dir);
}

async function cmdWait(rest: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args: rest,
    options: {
      state: { type: "string" },
      timeout: { type: "string" },
    },
    allowPositionals: true,
  });
  const dir = resolveKey(process.cwd(), values.state!);
  const target = positionals[0];
  if (!target) {
    throw new Error("Missing target state. Usage: wait <state> --state <key>");
  }
  const timeoutMs = values.timeout ? parseInt(values.timeout, 10) : undefined;
  await wait(dir, target as never, timeoutMs);
}

async function cmdFinalize(rest: string[]): Promise<void> {
  const { values } = parseArgs({
    args: rest,
    options: {
      state: { type: "string" },
    },
    allowPositionals: true,
  });
  const dir = resolveKey(process.cwd(), values.state!);
  const result = await finalize(dir, process.cwd());
  process.stdout.write(`Finalized: ${result.markdownPath}\n`);
}

main().catch((e) => {
  process.stderr.write(`${(e as Error).message}\n`);
  process.exit(1);
});
