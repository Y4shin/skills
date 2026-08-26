/**
 * Integration-test harness for the task-workflow package.
 *
 * Spins up a real `AgentSession` backed by the `faux` LLM provider — no
 * network, no API keys. Canned responses drive the model; tests assert on
 * tool calls, filesystem state, and extension behaviour.
 *
 * Ported from v1's harness, simplified.
 */

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  type AssistantMessage,
  type Context,
  type FauxContentBlock,
  type FauxResponseStep,
  fauxAssistantMessage,
  fauxText,
  fauxToolCall,
  registerFauxProvider,
} from "../../node_modules/@earendil-works/pi-coding-agent/node_modules/@earendil-works/pi-ai/dist/compat.js";

import {
  type AgentSession,
  type AgentSessionEvent,
  createAgentSession,
  type ExtensionFactory,
  type ExtensionUIContext,
  DefaultResourceLoader,
  type Model,
  ModelRuntime,
  SessionManager,
  SettingsManager,
} from "@earendil-works/pi-coding-agent";
import { InMemoryCredentialStore } from "../../node_modules/@earendil-works/pi-coding-agent/node_modules/@earendil-works/pi-ai/dist/index.js";

export type { AssistantMessage, Context, FauxContentBlock };

export type FauxReply = string | FauxContentBlock | FauxContentBlock[] | AssistantMessage;

export type FauxStep = FauxResponder | FauxReply;

export type FauxResponder = (context: Context, state: { callCount: number }) => FauxReply | Promise<FauxReply>;

export function reply(content: FauxReply): AssistantMessage {
  if (typeof content === "object" && content !== null && "role" in content) return content;
  const blocks: FauxContentBlock[] =
    typeof content === "string" ? [fauxText(content)] : Array.isArray(content) ? content : [content];
  const hasToolCall = blocks.some((b) => (b as { type?: string }).type === "toolCall");
  return fauxAssistantMessage(blocks, { stopReason: hasToolCall ? "toolUse" : "stop" });
}

function toStep(step: FauxStep): FauxResponseStep {
  if (typeof step === "function") {
    const fn = step as FauxResponder;
    return async (context, _options, state) => reply(await fn(context, state));
  }
  return reply(step);
}

export const call = (name: string, args: Record<string, unknown> = {}, id?: string) =>
  fauxToolCall(name, args, id ? { id } : undefined);

export interface NotifyRecord { message: string; type?: string }

export interface RecordingUi { ui: ExtensionUIContext; notifies: NotifyRecord[] }

export function createRecordingUi(): RecordingUi {
  const notifies: NotifyRecord[] = [];
  const ui = new Proxy({}, {
    get(_t, prop) {
      if (prop === "notify") return (message: string, type?: string) => { notifies.push({ message, type }); };
      if (prop === "theme") return {};
      return () => {};
    },
  }) as unknown as ExtensionUIContext;
  return { ui, notifies };
}

export interface TaskSessionOptions {
  extensions?: ExtensionFactory[];
  systemPrompt?: string;
  customTools?: Parameters<typeof createAgentSession>[0] extends infer O
    ? O extends { customTools?: infer C } ? C : never
    : never;
  projectFiles?: Record<string, string>;
}

export interface TaskSession {
  session: AgentSession;
  cwd: string;
  faux: ReturnType<typeof registerFauxProvider>;
  model: Model<string>;
  events: AgentSessionEvent[];
  notifies: NotifyRecord[];
  dispose: () => void;
  setResponses: (steps: FauxStep[]) => void;
}

export async function createTaskSession(options: TaskSessionOptions = {}): Promise<TaskSession> {
  const cwd = join(tmpdir(), `pi-int-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(cwd, { recursive: true });

  for (const [relativePath, content] of Object.entries(options.projectFiles ?? {})) {
    const target = join(cwd, relativePath);
    mkdirSync(join(target, ".."), { recursive: true });
    writeFileSync(target, content, "utf-8");
  }

  const faux = registerFauxProvider({
    provider: `faux-${Math.random().toString(36).slice(2, 8)}`,
    models: [{ id: "test-model", contextWindow: 200_000 }],
  });
  faux.setResponses([]);
  const model = faux.getModel() as Model<string>;

  const settingsManager = SettingsManager.inMemory({ compaction: { enabled: false }, retry: { enabled: false } });

  const recording = createRecordingUi();
  const loader = new DefaultResourceLoader({
    cwd,
    agentDir: cwd,
    settingsManager,
    extensionFactories: options.extensions,
    noSkills: true,
    noPromptTemplates: true,
    noThemes: true,
    noContextFiles: true,
    systemPrompt: options.systemPrompt ?? "You are a test assistant. Use the available tools.",
  });
  await loader.reload();

  // Use the installed runtime API with in-memory auth and model storage.
  const modelRuntime = await ModelRuntime.create({
    credentials: new InMemoryCredentialStore(),
    modelsPath: null,
    allowModelNetwork: false,
  });

  // Register the faux provider on the registry so auth checks pass
  const providerId = (model as any).provider;
  modelRuntime.registerProvider(providerId, {
    name: providerId,
    baseUrl: "http://faux.local",
    api: "faux" as any,
    apiKey: "faux-key",
    models: [{
      id: "test-model",
      name: "Test Model",
      contextWindow: 200_000,
      reasoning: false,
      input: ["text"],
      maxTokens: 4096,
      cost: { prompt: 0, completion: 0 },
    }],
  });

  const { session } = await createAgentSession({
    cwd,
    agentDir: cwd,
    model,
    modelRuntime,
    resourceLoader: loader,
    sessionManager: SessionManager.inMemory(cwd),
    settingsManager,
    customTools: options.customTools,
    noTools: "builtin",
  });

  const events: AgentSessionEvent[] = [];
  session.subscribe((event) => { events.push(event); });
  await session.bindExtensions({ uiContext: recording.ui });

  return {
    session, cwd, faux, model, events, notifies: recording.notifies,
    dispose: () => {
      try { session.dispose(); } catch { /* ignore */ }
      faux.unregister();
      rmSync(cwd, { recursive: true, force: true });
    },
    setResponses: (steps) => faux.setResponses(steps.map(toStep)),
  };
}


export function seedTaskTree(cwd: string): void {
  mkdirSync(join(cwd, "docs/tasks/login/slices"), { recursive: true });
  writeFileSync(
    join(cwd, "docs/tasks/login/task.md"),
    "---\nkind: task\ntitle: Login\nslug: login\nstatus: draft\nslices:\n  - do-thing\n  - other-thing\nmap: auth\n---\n",
  );
  mkdirSync(join(cwd, "docs/tasks/maps/auth"), { recursive: true });
  writeFileSync(
    join(cwd, "docs/tasks/maps/auth/map.md"),
    "---\nkind: map\ntitle: Auth map\nslug: auth\nstatus: draft\n" +
      "tasks:\n  - slug: login\n    blocked_by: []\n    done: false\n" +
      "  - slug: sso\n    blocked_by: [login]\n    done: false\n---\n",
  );
  writeFileSync(
    join(cwd, "docs/tasks/login/slices/1-do-thing.md"),
    "---\nkind: slice\ntitle: Do thing\nslug: do-thing\ntask: ../task.md\nmode: hitl\nstatus: todo\nsize: m\nblocked_by: []\n---\n",
  );
  writeFileSync(
    join(cwd, "docs/tasks/login/slices/2-other-thing.md"),
    "---\nkind: slice\ntitle: Other thing\nslug: other-thing\ntask: ../task.md\nmode: afk\nstatus: todo\nsize: s\nblocked_by: [do-thing]\n---\n",
  );
}

// ─── inspection helpers ────────────────────────────────────────────────

export function toolCallNames(events: readonly AgentSessionEvent[]): string[] {
  return events
    .filter((e): e is Extract<AgentSessionEvent, { type: "tool_execution_start" }> => e.type === "tool_execution_start")
    .map((e) => e.toolName);
}

export function assistantTexts(session: AgentSession): string[] {
  return session.messages
    .filter((m): m is { role: string; content?: unknown } => (m as { role?: string }).role === "assistant")
    .map((m) => {
      const c = (m as { content?: unknown }).content;
      if (typeof c === "string") return c;
      if (Array.isArray(c)) return c.filter((p: any) => p?.type === "text").map((p: any) => p.text).join("");
      return "";
    });
}

export function lastAssistantText(session: AgentSession): string {
  const texts = assistantTexts(session);
  return texts.length ? texts[texts.length - 1]! : "";
}

export function toolResultTexts(session: AgentSession, toolName?: string): string[] {
  return session.messages
    .filter((m): m is { role: string; toolName?: string; content?: unknown } => {
      const mm = m as { role?: string; toolName?: string };
      return mm.role === "toolResult" && (toolName === undefined || mm.toolName === toolName);
    })
    .map((m) => {
      const c = (m as { content?: unknown }).content;
      if (typeof c === "string") return c;
      if (Array.isArray(c)) return c.filter((p: any) => p?.type === "text").map((p: any) => p.text).join("");
      return "";
    });
}

export function latestToolResultText(context: Context, toolName: string): string | undefined {
  for (let i = context.messages.length - 1; i >= 0; i--) {
    const m = context.messages[i]! as { role?: string; toolName?: string; content?: unknown };
    if (m.role === "toolResult" && m.toolName === toolName) {
      const c = m.content;
      if (typeof c === "string") return c;
      if (Array.isArray(c)) return c.filter((p: any) => p?.type === "text").map((p: any) => p.text).join("");
      return "";
    }
  }
  return undefined;
}