/**
 * Integration test: `contact_supervisor` tool collision
 * pi-subagents (filesystem) vs pi-intercom (broker).
 *
 * Self-contained — no external dependencies beyond Node.js stdlib.
 *
 * Run:  npx tsx test/contact-supervisor-collision.test.ts
 *   or: node --experimental-strip-types test/contact-supervisor-collision.test.ts
 */

import { randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { EventEmitter } from "node:events";

// ---------------------------------------------------------------------------
// Types — minimal shapes matching the real extension APIs
// ---------------------------------------------------------------------------

interface ToolDefinition {
  name: string;
  label: string;
  description: string;
  parameters: unknown;
  execute(id: string, params: Record<string, unknown>, signal: AbortSignal): Promise<ToolResult>;
}

interface ToolResult {
  content: Array<{ type: string; text: string }>;
  details?: Record<string, unknown>;
}

interface PiAPI {
  getSessionName(): string;
  events: EventEmitter;
  getAllTools(): Array<{ name: string }>;
  registerTool(tool: ToolDefinition): void;
  sendMessage(msg: { customType?: string; content?: string; details?: unknown }): void;
  appendEntry(type: string, data: unknown): void;
  on(event: string, handler: (payload: unknown, ctx: unknown) => unknown): void;
  registerMessageRenderer(): void;
  registerShortcut(): void;
  registerCommand(): void;
}

interface ExtensionContext {
  cwd: string;
  hasUI: boolean;
  model: { id: string };
  sessionManager: { getSessionId(): string; getEntries(): Array<unknown> };
  isIdle(): boolean;
}

// ---------------------------------------------------------------------------
// Simplified pi-subagents registerNativeSupervisorClient
// (extracted from native-supervisor-channel.ts, lines 282-320)
// ---------------------------------------------------------------------------

const CHILD_ENV = {
  TARGET: "PI_SUBAGENT_ORCHESTRATOR_TARGET",
  SESSION_ID: "PI_SUBAGENT_ORCHESTRATOR_SESSION_ID",
  RUN_ID: "PI_SUBAGENT_RUN_ID",
  AGENT: "PI_SUBAGENT_CHILD_AGENT",
  INDEX: "PI_SUBAGENT_CHILD_INDEX",
  CHANNEL_DIR: "PI_SUBAGENT_SUPERVISOR_CHANNEL_DIR",
  INTERCOM_NAME: "PI_SUBAGENT_INTERCOM_SESSION_NAME",
};

function readChildMetadata() {
  const channelDir = process.env[CHILD_ENV.CHANNEL_DIR]?.trim();
  const runId = process.env[CHILD_ENV.RUN_ID]?.trim();
  const agent = process.env[CHILD_ENV.AGENT]?.trim();
  const index = process.env[CHILD_ENV.INDEX]?.trim();
  const sessionId = process.env[CHILD_ENV.SESSION_ID]?.trim();
  if (!channelDir || !runId || !agent || !sessionId || !index || !/^\d+$/.test(index))
    return undefined;
  return {
    channelDir, runId, agent, childIndex: Number(index),
    orchestratorTarget: process.env[CHILD_ENV.TARGET]?.trim(),
    orchestratorSessionId: sessionId,
    childTarget: process.env[CHILD_ENV.INTERCOM_NAME]?.trim(),
  };
}

function filesystemContactSupervisor(): ToolDefinition {
  return {
    name: "contact_supervisor",
    label: "Contact Supervisor",
    description: "[pi-subagents] Filesystem-based contact_supervisor.",
    parameters: {},
    async execute(_id, params, signal) {
      const meta = readChildMetadata();
      if (!meta) throw new Error("Not a subagent child");

      // Write request to filesystem channel
      const requestId = randomUUID();
      const requestDir = path.join(meta.channelDir, "requests");
      fs.mkdirSync(requestDir, { recursive: true });
      const requestFile = path.join(requestDir, `${requestId}.json`);
      fs.writeFileSync(requestFile, JSON.stringify({
        type: "subagent_supervisor_request",
        id: requestId,
        reason: params.reason ?? "need_decision",
        message: params.message ?? "",
        orchestratorSessionId: meta.orchestratorSessionId,
        runId: meta.runId,
        agent: meta.agent,
        childIndex: meta.childIndex,
      }));

      // Poll for reply
      const replyDir = path.join(meta.channelDir, "replies");
      fs.mkdirSync(replyDir, { recursive: true });
      const replyFile = path.join(replyDir, `${requestId}.json`);
      const deadline = Date.now() + 10000;
      while (Date.now() < deadline) {
        if (signal?.aborted) throw new Error("Cancelled");
        if (fs.existsSync(replyFile)) {
          const reply = JSON.parse(fs.readFileSync(replyFile, "utf-8")) as { message?: string };
          fs.rmSync(requestFile, { force: true });
          return { content: [{ type: "text", text: `[filesystem] ${reply.message ?? "ok"}` }] };
        }
        await new Promise((r) => setTimeout(r, 50));
      }
      throw new Error("Timed out waiting for supervisor reply (filesystem channel)");
    },
  };
}

function piSubagentsRegisterClient(pi: PiAPI) {
  if (!readChildMetadata()) return; // only in child processes
  if (!pi.getAllTools().some((t) => t.name === "contact_supervisor")) {
    pi.registerTool(filesystemContactSupervisor());
  }
}

// ---------------------------------------------------------------------------
// Simplified pi-intercom's contact_supervisor registration
// (extracted from index.ts, lines 1163-1166 — no hasTool guard)
// ---------------------------------------------------------------------------

function brokerContactSupervisor(): ToolDefinition {
  return {
    name: "contact_supervisor",
    label: "Contact Supervisor",
    description: "[pi-intercom] Broker-based contact_supervisor.",
    parameters: {},
    async execute(_id, params, _signal) {
      // In the real extension, this connects to the intercom broker.
      // We simulate the broker path by throwing a distinctive error.
      throw new Error("INTERCOM_BROKER: message sent to supervisor via broker");
    },
  };
}

function piIntercomRegister(pi: PiAPI) {
  // pi-intercom ALWAYS registers contact_supervisor when child metadata
  // is present — no hasTool() guard.
  if (readChildMetadata()) {
    pi.registerTool(brokerContactSupervisor());
  }
  // Also register the regular intercom tool
  if (!pi.getAllTools().some((t) => t.name === "intercom")) {
    pi.registerTool({
      name: "intercom",
      label: "Intercom",
      description: "Inter-session messaging.",
      parameters: {},
      async execute() {
        return { content: [{ type: "text", text: "intercom" }] };
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

function makeHarness(sessionName: string, sessionId: string) {
  const events = new EventEmitter();
  const tools: ToolDefinition[] = [];
  const lifecycle = new Map<string, Array<(p: unknown, c: unknown) => unknown>>();
  const sent: Array<{ type?: string }> = [];

  const pi: PiAPI = {
    getSessionName: () => sessionName,
    events,
    getAllTools: () => tools.map((t) => ({ name: t.name })),
    registerTool: (t) => { tools.push(t); },
    sendMessage: (msg) => { sent.push({ type: (msg as { customType?: string }).customType }); },
    appendEntry: () => {},
    on: (event, handler) => {
      const list = lifecycle.get(event) ?? [];
      list.push(handler);
      lifecycle.set(event, list);
    },
    registerMessageRenderer: () => {},
    registerShortcut: () => {},
    registerCommand: () => {},
  };

  const ctx: ExtensionContext = {
    cwd: process.cwd(), hasUI: false, model: { id: "test" },
    sessionManager: { getSessionId: () => sessionId, getEntries: () => [] },
    isIdle: () => true,
  };

  return {
    pi, ctx, tools, sent,
    async emitLifecycle(event: string, payload: unknown = {}, c = ctx) {
      for (const h of lifecycle.get(event) ?? []) await h(payload, c);
    },
  };
}

// ---------------------------------------------------------------------------
// Env helpers
// ---------------------------------------------------------------------------

const ALL_KEYS = Object.values(CHILD_ENV);

function saveEnv(): Record<string, string | undefined> {
  const s: Record<string, string | undefined> = {};
  for (const k of ALL_KEYS) s[k] = process.env[k];
  return s;
}
function restoreEnv(s: Record<string, string | undefined>) {
  for (const k of ALL_KEYS) {
    if (s[k] === undefined) delete process.env[k];
    else process.env[k] = s[k];
  }
}

async function withChildEnv(meta: {
  orchestratorTarget: string; orchestratorSessionId: string;
  runId: string; agent: string; index: string; channelDir: string;
}, fn: () => void | Promise<void>) {
  const saved = saveEnv();
  for (const k of ALL_KEYS) delete process.env[k];
  process.env[CHILD_ENV.TARGET] = meta.orchestratorTarget;
  process.env[CHILD_ENV.SESSION_ID] = meta.orchestratorSessionId;
  process.env[CHILD_ENV.RUN_ID] = meta.runId;
  process.env[CHILD_ENV.AGENT] = meta.agent;
  process.env[CHILD_ENV.INDEX] = meta.index;
  process.env[CHILD_ENV.CHANNEL_DIR] = meta.channelDir;
  try { await fn(); } finally { restoreEnv(saved); }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

let pass = 0, fail = 0;
function assert(cond: boolean, label: string) {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else      { fail++; console.log(`  ✗ ${label}`); }
}

const parentSessionId = `session-${randomUUID()}`;
const runId = `run-${randomUUID()}`;
const baseDir = path.join(os.tmpdir(), `pi-supervisor-collision-${randomUUID()}`);
const channelDir = path.join(baseDir, "supervisor-channels", `${runId}-grill-agent-0`);
fs.mkdirSync(path.join(channelDir, "requests"), { recursive: true });
fs.mkdirSync(path.join(channelDir, "replies"), { recursive: true });

// --- Test 1: pi-subagents alone -----------------------------------------
console.log("\n1. pi-subagents alone — filesystem contact_supervisor only");

withChildEnv({
  orchestratorTarget: "parent-chat", orchestratorSessionId: parentSessionId,
  runId, agent: "grill-agent", index: "0", channelDir,
}, () => {
  const h = makeHarness("child-1", "child-session-1");
  piSubagentsRegisterClient(h.pi);
  const names = h.tools.map((t) => t.name);
  assert(
    names.includes("contact_supervisor") && !names.includes("intercom"),
    `tools: ${JSON.stringify(names)} — contact_supervisor only (no intercom)`
  );
});

// --- Test 2: pi-intercom alone ------------------------------------------
console.log("\n2. pi-intercom alone — broker contact_supervisor + intercom");

withChildEnv({
  orchestratorTarget: "parent-chat", orchestratorSessionId: parentSessionId,
  runId, agent: "grill-agent", index: "0", channelDir,
}, () => {
  const h = makeHarness("child-2", "child-session-2");
  piIntercomRegister(h.pi);
  const names = h.tools.map((t) => t.name);
  assert(
    names.includes("contact_supervisor") && names.includes("intercom"),
    `tools: ${JSON.stringify(names)} — both contact_supervisor and intercom`
  );
});

// --- Test 3: BOTH — pi-subagents first, pi-intercom second -----------
console.log("\n3. BOTH loaded (pi-subagents → pi-intercom)");
console.log("   This is the real-world order from settings.json.");

withChildEnv({
  orchestratorTarget: "parent-chat", orchestratorSessionId: parentSessionId,
  runId, agent: "grill-agent", index: "0", channelDir,
}, () => {
  const h = makeHarness("child-3", "child-session-3");

  // Step A: pi-subagents registers filesystem-based
  piSubagentsRegisterClient(h.pi);
  const afterA = h.tools.length;
  assert(afterA === 1, `after pi-subagents: ${afterA} tool(s)`);

  // Step B: pi-intercom registers — NO hasTool guard, so it adds another
  piIntercomRegister(h.pi);
  const afterB = h.tools.length;

  const contactCount = h.tools.filter((t) => t.name === "contact_supervisor").length;
  const intercomCount = h.tools.filter((t) => t.name === "intercom").length;

  console.log(`   contact_supervisor registrations: ${contactCount}`);
  console.log(`   intercom registrations: ${intercomCount}`);
  console.log(`   total tools registered: ${afterB}`);

  // KEY: pi-intercom adds a SECOND contact_supervisor — it doesn't check
  assert(contactCount >= 2,
    `contact_supervisor registered ${contactCount} times (≥2 → collision)`);
  assert(intercomCount === 1,
    `intercom registered ${intercomCount} time(s)`);

  // The active tool (last registered) is pi-intercom's broker version.
  // The filesystem version is shadowed.
});

// --- Test 4: Behaviour verification ------------------------------------
console.log("\n4. Active tool behaviour — broker version shadows filesystem version");

await withChildEnv({
  orchestratorTarget: "parent-chat", orchestratorSessionId: parentSessionId,
  runId, agent: "grill-agent", index: "0", channelDir,
}, async () => {
  const h = makeHarness("child-4", "child-session-4");

  piSubagentsRegisterClient(h.pi);   // filesystem
  piIntercomRegister(h.pi);          // broker (shadows)

  const active = h.tools.filter((t) => t.name === "contact_supervisor").at(-1)!;

  // The last-registered tool is pi-intercom's broker version.
  // When executed, it will throw "INTERCOM_BROKER" — proving it's
  // trying the broker, not the filesystem channel.
  try {
    await active.execute("test", { reason: "need_decision", message: "Which API?" }, new AbortController().signal);
    assert(false, "should have thrown (broker not running)");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    assert(
      msg.includes("INTERCOM_BROKER"),
      `active tool is broker-based: "${msg}"`
    );
  }

  // Verify: no file was written to the filesystem channel
  const requestFiles = fs.readdirSync(path.join(channelDir, "requests"));
  assert(
    requestFiles.length === 0,
    `filesystem channel untouched: ${requestFiles.length} request files`
  );
});

// --- Test 5: What pi-subagents SHOULD do to prevent this ---------------
console.log("\n5. How pi-intercom SHOULD register (with hasTool guard)");

withChildEnv({
  orchestratorTarget: "parent-chat", orchestratorSessionId: parentSessionId,
  runId, agent: "grill-agent", index: "0", channelDir,
}, () => {
  const h = makeHarness("child-5", "child-session-5");

  // Simulate the FIXED version: check before registering
  piSubagentsRegisterClient(h.pi);  // filesystem-based

  // Fixed pi-intercom: guard with hasTool check
  if (readChildMetadata()) {
    const alreadyRegistered = h.pi.getAllTools().some((t) => t.name === "contact_supervisor");
    if (!alreadyRegistered) {
      h.pi.registerTool(brokerContactSupervisor());
    }
  }

  const contactCount = h.tools.filter((t) => t.name === "contact_supervisor").length;
  assert(
    contactCount === 1,
    `with guard: contact_supervisor registered ${contactCount} time(s) (1 = no collision)`
  );
});

// -----------------------------------------------------------------------
console.log(`\n${"─".repeat(60)}`);
console.log(`Results: ${pass} passed, ${fail} failed`);

if (fail > 0) {
  console.log(`
ROOT CAUSE: pi-intercom registers contact_supervisor unconditionally
when child orchestrator metadata is present.  It does NOT check whether
pi-subagents already registered one.  The second registration shadows
the first.

IMPACT: The parent's subagent_supervisor({ action: "pending" }) polls
the filesystem channel that pi-intercom never writes to → always empty.
Messages arrive through intercom({ action: "pending" }) instead.
`);
}

fs.rmSync(baseDir, { recursive: true, force: true });
process.exit(fail > 0 ? 1 : 0);