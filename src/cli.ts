/**
 * `prd-tool` — query & mutate the YAML frontmatter of a repo's docs/prd tree.
 *
 * A faithful TypeScript port of the Python click CLI: same subcommands, stdout
 * shapes, and exit codes (0 ok / 1 generic / 2 kind-mismatch / 65 unknown key).
 * The forced-context emitters (reference/profile/forge/workflow-gate/...) are
 * what the prd-workflow command headers inject; the rest are agent operations.
 */

import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { join, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";

import { CliError, ForgejoError, FrontmatterError, ResolutionError, TrackerError } from "./core/errors";
import { Artifact, discoverAll, findRoot, relPath, resolveArtifact } from "./core/model";
import { profileText, referenceText } from "./core/index";
import { pyJsonCompact, pyJsonIndent, pyRepr, pyStr } from "./core/pyfmt";
import * as forge from "./core/forge";
import { Client } from "./core/forgejo";
import * as tracker from "./core/tracker";
import * as validate from "./core/validate";
import * as workflow from "./core/workflow";

// Output sinks — mutable so the operations can be invoked in-process (e.g. from
// the opencode plugin) with their stdout/stderr captured instead of written.
let writeOut: (s: string) => void = (s) => {
  process.stdout.write(s);
};
let writeErr: (s: string) => void = (s) => {
  process.stderr.write(s);
};
const out = (s = ""): void => writeOut(s + "\n");
const outRaw = (s: string): void => writeOut(s);

function fail(msg: string, code = 1): CliError {
  return new CliError(msg, code);
}

function pad(s: string, width: number): string {
  return s.length >= width ? s : s + " ".repeat(width - s.length);
}

function coerce(value: string): unknown {
  const low = value.toLowerCase();
  if (low === "null" || low === "none" || low === "~") return null;
  if (low === "true" || low === "false") return low === "true";
  const s = value.replace(/^#+/, "");
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  return value;
}

function num(value: string): number {
  const s = value.replace(/^#+/, "");
  if (!/^[+-]?\d+$/.test(s)) throw fail(`'${value}': not an issue number`);
  return parseInt(s, 10);
}

// ---------------------------------------------------------------- option parser

type OptType = "bool" | "value" | "list";
interface OptDef {
  type: OptType;
  dest: string;
}
type OptSpec = Record<string, OptDef>;

interface Parsed {
  opts: Record<string, unknown>;
  positionals: string[];
}

function parseOpts(tokens: string[], spec: OptSpec): Parsed {
  const opts: Record<string, unknown> = {};
  const positionals: string[] = [];
  for (const def of Object.values(spec)) {
    if (def.type === "bool") opts[def.dest] = false;
    else if (def.type === "list") opts[def.dest] = [];
    else if (!(def.dest in opts)) opts[def.dest] = null;
  }
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (tok.startsWith("--")) {
      let name = tok.slice(2);
      let inlineVal: string | null = null;
      const eq = name.indexOf("=");
      if (eq !== -1) {
        inlineVal = name.slice(eq + 1);
        name = name.slice(0, eq);
      }
      const def = spec[name];
      if (!def) throw fail(`no such option: --${name}`);
      if (def.type === "bool") {
        opts[def.dest] = true;
      } else {
        const val = inlineVal !== null ? inlineVal : tokens[++i];
        if (val === undefined) throw fail(`--${name} requires a value`);
        if (def.type === "list") (opts[def.dest] as string[]).push(val);
        else opts[def.dest] = val;
      }
    } else {
      positionals.push(tok);
    }
  }
  return { opts, positionals };
}

function need(positionals: string[], i: number, label: string): string {
  if (i >= positionals.length) throw fail(`missing argument: ${label}`);
  return positionals[i];
}

function readBodyFile(p: unknown): string | null {
  if (p == null) return null;
  return readFileSync(p as string, "utf-8");
}

// ---------------------------------------------------------------- read / query

function cmdList(root: string, tokens: string[]): void {
  const { opts } = parseOpts(tokens, {
    kind: { type: "value", dest: "kind" },
    status: { type: "value", dest: "status" },
    epic: { type: "value", dest: "epic" },
    json: { type: "bool", dest: "json" },
  });
  const arts = discoverAll(root);
  const rows: Array<Record<string, unknown>> = [];
  for (const a of arts) {
    if (opts.kind && a.kind !== opts.kind) continue;
    if (opts.status && a.status !== opts.status) continue;
    if (opts.epic && a.doc.data["epic"] !== opts.epic) continue;
    rows.push({
      kind: a.kind,
      slug: a.slug,
      status: a.status,
      issue: a.issue,
      epic: a.doc.data["epic"] ?? null,
      path: relPath(root, a.path),
    });
  }
  if (opts.json) {
    out(pyJsonIndent(rows));
    return;
  }
  if (rows.length === 0) {
    out("(no matching artifacts)");
    return;
  }
  const width = Math.max(...rows.map((r) => (r.kind as string).length));
  for (const r of rows) {
    const issue = r.issue ? `#${r.issue}` : "-";
    const status = pyStr((r.status as string) || "-");
    out(
      `${pad(r.kind as string, width)}  ${pad(r.slug as string, 28)} ${pad(status, 14)} ${pad(issue, 6)} ${r.path}`,
    );
  }
}

function cmdResolve(root: string, tokens: string[]): void {
  const { opts, positionals } = parseOpts(tokens, { kind: { type: "value", dest: "kind" } });
  const selector = need(positionals, 0, "selector");
  const a = resolveArtifact(root, selector, opts.kind as "epic" | "prd" | undefined);
  out(a.path);
}

function cmdGet(root: string, tokens: string[]): void {
  const { positionals } = parseOpts(tokens, {});
  const selector = need(positionals, 0, "selector");
  const field = need(positionals, 1, "field");
  const a = resolveArtifact(root, selector);
  if (!(field in a.doc.data)) throw fail(`${a.path}: no frontmatter field '${field}'`);
  const val = a.doc.data[field];
  out(typeof val === "object" && val !== null ? pyJsonCompact(val) : pyStr(val));
}

function cmdShow(root: string, tokens: string[]): void {
  const { opts, positionals } = parseOpts(tokens, { json: { type: "bool", dest: "json" } });
  const selector = need(positionals, 0, "selector");
  const a = resolveArtifact(root, selector);
  if (opts.json) {
    out(pyJsonIndent(a.doc.data));
  } else {
    for (const [k, v] of Object.entries(a.doc.data)) {
      out(`${k}: ${typeof v === "object" && v !== null ? pyJsonCompact(v) : pyStr(v)}`);
    }
  }
}

function cmdAssertKind(root: string, tokens: string[]): void {
  const { positionals } = parseOpts(tokens, {});
  const selector = need(positionals, 0, "selector");
  const kind = need(positionals, 1, "kind");
  const a = resolveArtifact(root, selector);
  const actual = a.doc.data["kind"];
  if (actual !== kind) {
    const hint: Record<string, string> = {
      epic: "epic-to-prds",
      feature: "feature-prd-to-issues",
      capability: "capability-prd-to-issues",
    };
    const h = hint[actual as string] ?? "the matching skill";
    throw fail(`${a.path}: kind is ${pyRepr(actual)}, expected '${kind}' — use ${h} instead.`, 2);
  }
  out(`ok: ${a.slug} is kind:${kind}`);
}

// ----------------------------------------------------------------- lint

function violationRows(root: string, reports: validate.Report[]): Array<Record<string, unknown>> {
  return reports
    .filter((r) => !validate.reportOk(r))
    .map((r) => ({ path: relPath(root, r.path), family: r.family, violations: r.violations }));
}

function cmdListBadFiles(root: string, tokens: string[]): void {
  const { opts } = parseOpts(tokens, {
    json: { type: "bool", dest: "json" },
    strict: { type: "bool", dest: "strict" },
  });
  const bad = validate.scan(root).filter((r) => !validate.reportOk(r));
  if (opts.json) {
    out(pyJsonIndent(violationRows(root, bad)));
  } else if (bad.length === 0) {
    out("(no frontmatter violations)");
  } else {
    for (const r of bad) out(relPath(root, r.path));
  }
  if (opts.strict && bad.length) throw fail(`${bad.length} artifact(s) with frontmatter violations`);
}

function cmdShowViolations(root: string, tokens: string[]): void {
  const { opts, positionals } = parseOpts(tokens, {
    json: { type: "bool", dest: "json" },
    strict: { type: "bool", dest: "strict" },
  });
  const selector = positionals[0];
  let reports: validate.Report[];
  if (selector) {
    let target = selector;
    if (existsSync(selector) && statSync(selector).isDirectory()) {
      target = existsSync(join(selector, "epic.md"))
        ? join(selector, "epic.md")
        : join(selector, "prd.md");
    }
    if (!existsSync(target)) throw fail(`'${selector}': no such file`);
    target = resolvePath(target);
    reports = [validate.validateFile(target, validate.familyFor(target))];
  } else {
    reports = validate.scan(root);
  }
  const bad = reports.filter((r) => !validate.reportOk(r));
  if (opts.json) {
    out(pyJsonIndent(violationRows(root, bad)));
  } else if (bad.length === 0) {
    out("(no frontmatter violations)");
  } else {
    for (const r of bad) {
      out(`${relPath(root, r.path)}  [${r.family}]`);
      for (const v of r.violations) out(`  - ${v}`);
    }
  }
  if (opts.strict && bad.length) throw fail(`${bad.length} artifact(s) with frontmatter violations`);
}

// ----------------------------------------------------------------- mutate

function cmdSet(root: string, tokens: string[]): void {
  const { positionals } = parseOpts(tokens, {});
  const selector = need(positionals, 0, "selector");
  const field = need(positionals, 1, "field");
  const value = need(positionals, 2, "value");
  const a = resolveArtifact(root, selector);
  a.doc.data[field] = coerce(value);
  a.doc.save();
  out(`${a.path}: set ${field} = ${pyRepr(a.doc.data[field])}`);
}

function cmdSetSlices(root: string, tokens: string[]): void {
  const { positionals } = parseOpts(tokens, {});
  const selector = need(positionals, 0, "selector");
  const numbers = positionals.slice(1);
  if (numbers.length === 0) throw fail("missing argument: numbers");
  const a = resolveArtifact(root, selector, "prd");
  a.doc.data["slices"] = numbers.map((n) => parseInt(n.replace(/^#+/, ""), 10));
  a.doc.save();
  out(`${a.path}: slices = [${(a.doc.data["slices"] as number[]).join(", ")}]`);
}

// ----------------------------------------------------------------- slices / gate

function cmdSlices(root: string, tokens: string[]): void {
  const { opts, positionals } = parseOpts(tokens, { json: { type: "bool", dest: "json" } });
  const selector = need(positionals, 0, "selector");
  const a = resolveArtifact(root, selector, "prd");
  const rows = a.sliceFiles().map((s) => ({ number: s.number, slug: s.slug, path: relPath(root, s.path) }));
  if (opts.json) {
    out(pyJsonIndent(rows));
    return;
  }
  if (rows.length === 0) {
    out("(no open slices — slices/ is empty or gone)");
    return;
  }
  for (const r of rows) out(`#${pad(String(r.number), 5)} ${pad(r.slug, 28)} ${r.path}`);
}

function cmdPrdFinalizable(root: string, tokens: string[]): void {
  const { positionals } = parseOpts(tokens, {});
  const selector = need(positionals, 0, "selector");
  const a = resolveArtifact(root, selector, "prd");
  const open = a.sliceFiles();
  if (open.length) {
    const nums = open.map((s) => `#${s.number}`).join(", ");
    throw fail(`${a.slug}: ${open.length} slice(s) still open: ${nums}`);
  }
  out(`ok: ${a.slug} has no open slices — ready to finalize`);
}

// ----------------------------------------------------------------- epic subgroup

function epicPrds(a: Artifact): Array<Record<string, unknown>> {
  const prds = a.doc.data["prds"];
  if (!Array.isArray(prds)) throw fail(`${a.path}: no prds: list (run epic-to-prds first)`);
  return prds as Array<Record<string, unknown>>;
}

function cmdEpic(root: string, tokens: string[]): void {
  const sub = tokens[0];
  const rest = tokens.slice(1);
  if (sub === "prds") {
    const { opts, positionals } = parseOpts(rest, { json: { type: "bool", dest: "json" } });
    const a = resolveArtifact(root, need(positionals, 0, "selector"), "epic");
    const prds = epicPrds(a);
    if (opts.json) {
      out(pyJsonIndent(prds));
      return;
    }
    for (const p of prds) {
      const issue = p.issue ? `#${p.issue}` : "-";
      const done = p.done ? "done" : "";
      const blocked = ((p.blocked_by as string[]) ?? []).join(",") || "-";
      out(
        `${pad((p.slug as string) ?? "?", 28)} ${pad((p.kind as string) ?? "?", 12)} ${pad(issue, 6)} blocked_by:${pad(blocked, 20)} ${done}`,
      );
    }
  } else if (sub === "set-prd-issue") {
    const { positionals } = parseOpts(rest, {});
    const a = resolveArtifact(root, need(positionals, 0, "selector"), "epic");
    const prdSlug = need(positionals, 1, "prd_slug");
    const issue = need(positionals, 2, "issue");
    for (const p of epicPrds(a)) {
      if (p.slug === prdSlug) {
        p.issue = parseInt(issue.replace(/^#+/, ""), 10);
        a.doc.save();
        out(`${a.slug}: ${prdSlug} → issue #${p.issue}`);
        return;
      }
    }
    throw fail(`${a.slug}: no child PRD '${prdSlug}' in prds:`);
  } else if (sub === "prd-issue") {
    const { positionals } = parseOpts(rest, {});
    const a = resolveArtifact(root, need(positionals, 0, "selector"), "epic");
    const prdSlug = need(positionals, 1, "prd_slug");
    for (const p of epicPrds(a)) {
      if (p.slug === prdSlug) {
        if (!p.issue) throw fail(`${a.slug}: child PRD '${prdSlug}' has no issue yet`);
        out(String(p.issue));
        return;
      }
    }
    throw fail(`${a.slug}: no child PRD '${prdSlug}' in prds:`);
  } else if (sub === "tick") {
    const { positionals } = parseOpts(rest, {});
    const a = resolveArtifact(root, need(positionals, 0, "selector"), "epic");
    const prdSlug = need(positionals, 1, "prd_slug");
    for (const p of epicPrds(a)) {
      if (p.slug === prdSlug) {
        p.done = true;
        a.doc.save();
        out(`${a.slug}: ticked ${prdSlug} done`);
        return;
      }
    }
    throw fail(`${a.slug}: no child PRD '${prdSlug}' in prds:`);
  } else if (sub === "finalizable") {
    const { positionals } = parseOpts(rest, {});
    const a = resolveArtifact(root, need(positionals, 0, "selector"), "epic");
    const pending = epicPrds(a)
      .filter((p) => !p.done)
      .map((p) => (p.slug as string) ?? "?");
    if (pending.length) throw fail(`${a.slug}: child PRD(s) not finalized: ${pending.join(", ")}`);
    out(`ok: every child PRD of ${a.slug} is finalized — ready to finalize epic`);
  } else {
    throw fail(`unknown epic subcommand: ${sub ?? "(none)"}`);
  }
}

// ----------------------------------------------------------------- tracker subgroup

function cmdTracker(root: string, tokens: string[]): void {
  const sub = tokens[0];
  const rest = tokens.slice(1);
  switch (sub) {
    case "ensure-labels": {
      const p = tracker.ensure(root);
      out(`ok: local tracker ready at ${relPath(root, p)}`);
      return;
    }
    case "create": {
      const { opts } = parseOpts(rest, {
        title: { type: "value", dest: "title" },
        body: { type: "value", dest: "body" },
        "body-file": { type: "value", dest: "bodyFile" },
        label: { type: "list", dest: "labels" },
        milestone: { type: "value", dest: "milestone" },
      });
      if (opts.title == null) throw fail("Missing option '--title'.");
      let body = opts.body as string | null;
      const bf = readBodyFile(opts.bodyFile);
      if (bf !== null) body = bf;
      const n = tracker.create(root, opts.title as string, body ?? "", opts.labels as string[], (opts.milestone as string | null) ?? null);
      out(`#${n}`);
      return;
    }
    case "view": {
      const { opts, positionals } = parseOpts(rest, { json: { type: "bool", dest: "json" } });
      const issue = tracker.view(root, num(need(positionals, 0, "number")));
      if (opts.json) {
        out(
          pyJsonIndent({
            number: issue.number,
            title: issue.title,
            body: issue.body,
            state: issue.state.toUpperCase(),
            labels: issue.labels.map((l) => ({ name: l })),
          }),
        );
        return;
      }
      out(`#${issue.number} ${issue.title}  [${issue.state}]`);
      out(`labels: ${issue.labels.join(", ") || "-"}`);
      if (issue.blocked_by.length) out("blocked_by: " + issue.blocked_by.map((b) => `#${b}`).join(", "));
      if (issue.milestone) out(`milestone: #${issue.milestone}`);
      out("");
      out(issue.body);
      for (const c of issue.comments) out(`\n--- comment ---\n${c}`);
      return;
    }
    case "list": {
      const { opts } = parseOpts(rest, {
        label: { type: "value", dest: "label" },
        state: { type: "value", dest: "state" },
        json: { type: "bool", dest: "json" },
      });
      const issues = tracker.listIssues(root, (opts.label as string | null) ?? null, (opts.state as string | null) ?? null);
      if (opts.json) {
        out(pyJsonIndent(issues.map((i) => ({ number: i.number, title: i.title, state: i.state.toUpperCase() }))));
        return;
      }
      if (issues.length === 0) {
        out("(no matching issues)");
        return;
      }
      for (const i of issues) out(`#${pad(String(i.number), 5)} ${pad(i.state, 7)} ${i.title}`);
      return;
    }
    case "comment": {
      const { opts, positionals } = parseOpts(rest, { body: { type: "value", dest: "body" } });
      const n = num(need(positionals, 0, "number"));
      if (opts.body == null) throw fail("Missing option '--body'.");
      tracker.comment(root, n, opts.body as string);
      out(`#${n}: commented`);
      return;
    }
    case "close": {
      const { opts, positionals } = parseOpts(rest, { comment: { type: "value", dest: "comment" } });
      const n = num(need(positionals, 0, "number"));
      tracker.close(root, n, (opts.comment as string | null) ?? null);
      out(`#${n}: closed`);
      return;
    }
    case "edit": {
      const { opts, positionals } = parseOpts(rest, {
        title: { type: "value", dest: "title" },
        body: { type: "value", dest: "body" },
        "body-file": { type: "value", dest: "bodyFile" },
        "add-label": { type: "list", dest: "add" },
        "remove-label": { type: "list", dest: "remove" },
      });
      const n = num(need(positionals, 0, "number"));
      let body = opts.body as string | null;
      const bf = readBodyFile(opts.bodyFile);
      if (bf !== null) body = bf;
      if (opts.title != null || body !== null) {
        tracker.edit(root, n, (opts.title as string | null) ?? null, body);
      }
      if ((opts.add as string[]).length || (opts.remove as string[]).length) {
        tracker.editLabels(root, n, opts.add as string[], opts.remove as string[]);
      }
      out(`#${n}: updated`);
      return;
    }
    case "dep": {
      const { opts, positionals } = parseOpts(rest, { "blocked-by": { type: "value", dest: "blocker" } });
      const n = num(need(positionals, 0, "number"));
      if (opts.blocker == null) throw fail("Missing option '--blocked-by'.");
      const b = num(opts.blocker as string);
      tracker.addDependency(root, n, b);
      out(`#${n}: blocked_by #${b}`);
      return;
    }
    case "set-milestone": {
      const { positionals } = parseOpts(rest, {});
      const n = num(need(positionals, 0, "number"));
      const title = need(positionals, 1, "title");
      const ms = tracker.setMilestone(root, n, title);
      out(`#${n}: milestone = #${ms} (${title})`);
      return;
    }
    case "milestone": {
      const msSub = rest[0];
      const msRest = rest.slice(1);
      if (msSub === "create") {
        const { positionals } = parseOpts(msRest, {});
        out(String(tracker.createMilestone(root, need(positionals, 0, "title"))));
      } else if (msSub === "close") {
        const { positionals } = parseOpts(msRest, {});
        const n = num(need(positionals, 0, "number"));
        tracker.closeMilestone(root, n);
        out(`milestone #${n}: closed`);
      } else if (msSub === "list") {
        const { opts } = parseOpts(msRest, { json: { type: "bool", dest: "json" } });
        const ms = tracker.listMilestones(root);
        if (opts.json) {
          out(pyJsonIndent(ms));
          return;
        }
        if (ms.length === 0) {
          out("(no milestones)");
          return;
        }
        for (const m of ms) out(`#${pad(String(m.number), 5)} ${pad(m.state, 7)} ${m.title}`);
      } else {
        throw fail(`unknown tracker milestone subcommand: ${msSub ?? "(none)"}`);
      }
      return;
    }
    default:
      throw fail(`unknown tracker subcommand: ${sub ?? "(none)"}`);
  }
}

// ----------------------------------------------------------------- forgejo subgroup

async function cmdForgejo(tokens: string[]): Promise<void> {
  const sub = tokens[0];
  const rest = tokens.slice(1);
  switch (sub) {
    case "auth-check": {
      const c = Client.fromRepo();
      c.token();
      out(`ok: authenticated to ${c.host} as ${c.owner}/${c.repo}`);
      return;
    }
    case "ensure-labels": {
      const created = await Client.fromRepo().ensureLabels(forge.LABELS);
      out(created.length ? `ok: labels ready (${created.length} created)` : "ok: labels already present");
      return;
    }
    case "labels": {
      const table = await Client.fromRepo().listLabels();
      for (const [name, lid] of Object.entries(table)) out(`${lid}\t${name}`);
      return;
    }
    case "create": {
      const { opts } = parseOpts(rest, {
        title: { type: "value", dest: "title" },
        body: { type: "value", dest: "body" },
        "body-file": { type: "value", dest: "bodyFile" },
        label: { type: "list", dest: "labels" },
        milestone: { type: "value", dest: "milestone" },
      });
      if (opts.title == null) throw fail("Missing option '--title'.");
      let body = opts.body as string | null;
      const bf = readBodyFile(opts.bodyFile);
      if (bf !== null) body = bf;
      const issue = await Client.fromRepo().createIssue(
        opts.title as string,
        body ?? "",
        opts.labels as string[],
        (opts.milestone as string | null) ?? null,
      );
      out(`#${issue.number}`);
      return;
    }
    case "view": {
      const { opts, positionals } = parseOpts(rest, { json: { type: "bool", dest: "json" } });
      const issue = await Client.fromRepo().getIssue(num(need(positionals, 0, "number")));
      if (opts.json) {
        out(
          pyJsonIndent({
            number: issue.number,
            title: issue.title,
            body: issue.body || "",
            state: String(issue.state ?? "").toUpperCase(),
            labels: (issue.labels ?? []).map((l: any) => ({ name: l.name })),
          }),
        );
        return;
      }
      out(`#${issue.number} ${issue.title}  [${issue.state}]`);
      out(`labels: ${(issue.labels ?? []).map((l: any) => l.name).join(", ") || "-"}`);
      out("");
      out(issue.body || "");
      return;
    }
    case "list": {
      const { opts } = parseOpts(rest, {
        label: { type: "value", dest: "label" },
        state: { type: "value", dest: "state" },
        json: { type: "bool", dest: "json" },
      });
      const issues = await Client.fromRepo().listIssues((opts.label as string | null) ?? null, (opts.state as string | null) ?? null);
      if (opts.json) {
        out(pyJsonIndent(issues.map((i: any) => ({ number: i.number, title: i.title, state: String(i.state ?? "").toUpperCase() }))));
        return;
      }
      if (issues.length === 0) {
        out("(no matching issues)");
        return;
      }
      for (const i of issues) out(`#${pad(String(i.number), 5)} ${pad(String(i.state ?? ""), 7)} ${i.title}`);
      return;
    }
    case "comment": {
      const { opts, positionals } = parseOpts(rest, { body: { type: "value", dest: "body" } });
      const n = num(need(positionals, 0, "number"));
      if (opts.body == null) throw fail("Missing option '--body'.");
      await Client.fromRepo().comment(n, opts.body as string);
      out(`#${n}: commented`);
      return;
    }
    case "close": {
      const { opts, positionals } = parseOpts(rest, { comment: { type: "value", dest: "comment" } });
      const n = num(need(positionals, 0, "number"));
      await Client.fromRepo().close(n, (opts.comment as string | null) ?? null);
      out(`#${n}: closed`);
      return;
    }
    case "edit": {
      const { opts, positionals } = parseOpts(rest, {
        title: { type: "value", dest: "title" },
        body: { type: "value", dest: "body" },
        "body-file": { type: "value", dest: "bodyFile" },
        "add-label": { type: "list", dest: "add" },
        "remove-label": { type: "list", dest: "remove" },
        milestone: { type: "value", dest: "milestone" },
      });
      const n = num(need(positionals, 0, "number"));
      let body = opts.body as string | null;
      const bf = readBodyFile(opts.bodyFile);
      if (bf !== null) body = bf;
      const c = Client.fromRepo();
      if (opts.title != null || body !== null) await c.updateIssue(n, (opts.title as string | null) ?? null, body);
      if ((opts.add as string[]).length || (opts.remove as string[]).length) await c.editLabels(n, opts.add as string[], opts.remove as string[]);
      if (opts.milestone) await c.setMilestone(n, opts.milestone as string);
      out(`#${n}: updated`);
      return;
    }
    case "dep": {
      const { opts, positionals } = parseOpts(rest, { "blocked-by": { type: "value", dest: "blocker" } });
      const n = num(need(positionals, 0, "number"));
      if (opts.blocker == null) throw fail("Missing option '--blocked-by'.");
      const b = num(opts.blocker as string);
      await Client.fromRepo().addDependency(n, b);
      out(`#${n}: blocked_by #${b}`);
      return;
    }
    case "set-milestone": {
      const { positionals } = parseOpts(rest, {});
      const n = num(need(positionals, 0, "number"));
      const title = need(positionals, 1, "title");
      const mid = await Client.fromRepo().setMilestone(n, title);
      out(`#${n}: milestone = ${title} (id ${mid})`);
      return;
    }
    case "milestone": {
      const msSub = rest[0];
      const msRest = rest.slice(1);
      if (msSub === "create") {
        const { positionals } = parseOpts(msRest, {});
        out(String(await Client.fromRepo().ensureMilestone(need(positionals, 0, "title"))));
      } else if (msSub === "close") {
        const { positionals } = parseOpts(msRest, {});
        const mid = num(need(positionals, 0, "mid"));
        await Client.fromRepo().closeMilestone(mid);
        out(`milestone ${mid}: closed`);
      } else if (msSub === "list") {
        const { opts } = parseOpts(msRest, { json: { type: "bool", dest: "json" } });
        const ms = await Client.fromRepo().listMilestones();
        if (opts.json) {
          out(pyJsonIndent(ms.map((m: any) => ({ id: m.id, title: m.title, state: m.state ?? null }))));
          return;
        }
        for (const m of ms) out(`${m.id}\t${pad(String(m.state ?? ""), 7)} ${m.title}`);
      } else {
        throw fail(`unknown forgejo milestone subcommand: ${msSub ?? "(none)"}`);
      }
      return;
    }
    case "create-pr": {
      const { opts } = parseOpts(rest, {
        head: { type: "value", dest: "head" },
        base: { type: "value", dest: "base" },
        title: { type: "value", dest: "title" },
        body: { type: "value", dest: "body" },
        "body-file": { type: "value", dest: "bodyFile" },
      });
      if (opts.head == null) throw fail("Missing option '--head'.");
      if (opts.title == null) throw fail("Missing option '--title'.");
      let body = opts.body as string | null;
      const bf = readBodyFile(opts.bodyFile);
      if (bf !== null) body = bf;
      const pr = await Client.fromRepo().createPr(
        opts.head as string,
        (opts.base as string | null) ?? "main",
        opts.title as string,
        body ?? "",
      );
      out(`#${pr.number}`);
      return;
    }
    default:
      throw fail(`unknown forgejo subcommand: ${sub ?? "(none)"}`);
  }
}

// ----------------------------------------------------------------- dispatch

async function dispatch(argv: string[]): Promise<void> {
  // Extract the global --root option (it precedes the subcommand).
  let rootOpt: string | null = null;
  const tokens: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--root") {
      rootOpt = argv[++i] ?? null;
    } else if (t.startsWith("--root=")) {
      rootOpt = t.slice("--root=".length);
    } else {
      tokens.push(t);
    }
  }
  const root = findRoot(rootOpt ?? process.cwd());

  const cmd = tokens[0];
  const rest = tokens.slice(1);
  if (!cmd) throw fail("usage: prd-tool <command> [...]");

  switch (cmd) {
    case "reference":
      outRaw(referenceText());
      return;
    case "profile": {
      const text = profileText(root);
      if (text) outRaw(text);
      return;
    }
    case "forge": {
      const key = need(rest, 0, "key");
      const [text, code] = forge.render(key);
      if (code) throw fail(text, code);
      out(text);
      return;
    }
    case "toolpath":
      out(forge.PRD_TOOL);
      return;
    case "list":
      cmdList(root, rest);
      return;
    case "resolve":
      cmdResolve(root, rest);
      return;
    case "get":
      cmdGet(root, rest);
      return;
    case "show":
      cmdShow(root, rest);
      return;
    case "assert-kind":
      cmdAssertKind(root, rest);
      return;
    case "list-bad-files":
      cmdListBadFiles(root, rest);
      return;
    case "show-violations":
      cmdShowViolations(root, rest);
      return;
    case "set":
      cmdSet(root, rest);
      return;
    case "set-slices":
      cmdSetSlices(root, rest);
      return;
    case "slices":
      cmdSlices(root, rest);
      return;
    case "prd-finalizable":
      cmdPrdFinalizable(root, rest);
      return;
    case "epic":
      cmdEpic(root, rest);
      return;
    case "tracker":
      cmdTracker(root, rest);
      return;
    case "forgejo":
      await cmdForgejo(rest);
      return;
    case "workflow-version":
      if (rest[0] === "set") {
        const n = parseInt(need(rest, 1, "number"), 10);
        const p = workflow.writeVersion(root, n);
        out(`${p}: workflow version = ${n}`);
      } else {
        out(String(workflow.readVersion(root)));
      }
      return;
    case "workflow-gate": {
      const text = workflow.gate(root);
      if (text) out(text);
      return;
    }
    case "workflow-init-instructions":
      out(workflow.initInstructions(root));
      return;
    case "workflow-migrate-instructions": {
      let provider: string;
      try {
        provider = forge.detect().provider;
      } catch (e) {
        if (e instanceof forge.NotAGitRepo || e instanceof forge.UnknownForge) provider = "local";
        else throw e;
      }
      out(workflow.migrateInstructions(root, provider));
      return;
    }
    default:
      throw fail(`unknown command: ${cmd}`);
  }
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  try {
    await dispatch(argv);
    return 0;
  } catch (e) {
    if (e instanceof CliError) {
      writeErr(`Error: ${e.message}\n`);
      return e.exitCode;
    }
    if (
      e instanceof ResolutionError ||
      e instanceof FrontmatterError ||
      e instanceof TrackerError ||
      e instanceof ForgejoError
    ) {
      writeErr(`error: ${e.message}\n`);
      return 1;
    }
    writeErr(`error: ${(e as Error).message}\n`);
    return 1;
  }
}

/** Run a CLI invocation in-process, capturing stdout/stderr. */
export async function runCapture(argv: string[]): Promise<{ code: number; out: string; err: string }> {
  const prevOut = writeOut;
  const prevErr = writeErr;
  let outBuf = "";
  let errBuf = "";
  writeOut = (s) => {
    outBuf += s;
  };
  writeErr = (s) => {
    errBuf += s;
  };
  try {
    const code = await main(argv);
    return { code, out: outBuf, err: errBuf };
  } finally {
    writeOut = prevOut;
    writeErr = prevErr;
  }
}

// Auto-run only when executed directly as the bundled script (not when this
// module is imported, e.g. by the opencode plugin bundle).
function isEntrypoint(): boolean {
  try {
    const argv1 = process.argv[1];
    if (!argv1) return false;
    return fileURLToPath(import.meta.url) === realpathSync(argv1);
  } catch {
    return false;
  }
}

if (isEntrypoint()) {
  main().then((code) => process.exit(code));
}
