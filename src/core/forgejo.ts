/**
 * Native Forgejo/Codeberg/Gitea REST client (`/api/v1`).
 *
 * Replaces the `fgj` CLI for every prd-workflow operation. The only external
 * `fgj` touch left is fetching the auth token (`fgj auth token`); everything
 * else is a direct HTTPS call.
 */

import { spawnSync } from "node:child_process";
import { ForgejoError } from "./errors.js";
import * as forge from "./forge.js";

export { ForgejoError };

const TOKEN_ENV_VARS = ["FORGEJO_TOKEN", "CODEBERG_TOKEN"] as const;

export const tokenIo = {
  fgjAuthToken(host: string): string {
    const r = spawnSync("fgj", ["auth", "token", "--hostname", host], { encoding: "utf-8" });
    return r.error || r.status !== 0 || r.stdout == null ? "" : r.stdout.trim();
  },
};

export function hostFromRemote(remote: string): string {
  const r = remote.trim();
  if (!r) throw new ForgejoError("no origin remote — cannot reach a Forgejo instance");
  let m = /^[a-zA-Z]+:\/\/(?:[^@/]+@)?([^:/]+)/.exec(r);
  if (m) return m[1];
  m = /^[^@]+@([^:]+):/.exec(r);
  if (m) return m[1];
  throw new ForgejoError(`cannot parse host from remote '${remote}'`);
}

type Json = any;

export class Client {
  owner: string;
  repo: string;
  host: string;
  private _token: string | null = null;
  private _labels: Record<string, number> | null = null;

  constructor(owner: string, repo: string, host: string, token?: string | null) {
    this.owner = owner;
    this.repo = repo;
    this.host = host;
    if (token !== undefined) this._token = token;
  }

  static fromRepo(): Client {
    const f = forge.detect();
    if (f.provider !== "fgj") {
      throw new ForgejoError(`forgejo client only handles Forgejo repos (detected: ${f.provider})`);
    }
    const host = hostFromRemote(forge.io.remoteUrl());
    return new Client(f.owner, f.repo, host);
  }

  get base(): string {
    return `https://${this.host}/api/v1`;
  }

  token(): string {
    if (this._token) return this._token;
    let tok = tokenIo.fgjAuthToken(this.host);
    if (!tok) {
      for (const v of TOKEN_ENV_VARS) {
        const env = process.env[v];
        if (env) { tok = env.trim(); break; }
      }
    }
    if (!tok) {
      throw new ForgejoError(
        `no API token for ${this.host}: run \`fgj auth login --hostname ${this.host}\` ` +
        `(or set one of ${TOKEN_ENV_VARS.join(", ")})`,
      );
    }
    this._token = tok;
    return tok;
  }

  async request(method: string, path: string, body?: Json | null, query?: Record<string, unknown> | null): Promise<Json> {
    let url = `${this.base}${path}`;
    if (query) {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v !== null && v !== undefined) params.set(k, String(v));
      }
      const qs = params.toString();
      if (qs) url = `${url}?${qs}`;
    }
    const headers: Record<string, string> = {
      Authorization: `token ${this.token()}`,
      Accept: "application/json",
    };
    let data: string | undefined;
    if (body !== undefined && body !== null) {
      data = JSON.stringify(body);
      headers["Content-Type"] = "application/json";
    }
    let resp: Response;
    try {
      resp = await fetch(url, { method, headers, body: data });
    } catch (e) {
      throw new ForgejoError(`${method} ${path} → connection error: ${(e as Error).message}`);
    }
    if (!resp.ok) {
      const detail = (await resp.text()).slice(0, 500);
      throw new ForgejoError(`${method} ${path} → HTTP ${resp.status}: ${detail}`);
    }
    const raw = await resp.text();
    if (!raw) return null;
    return JSON.parse(raw);
  }

  private repoPath(suffix: string): string {
    return `/repos/${this.owner}/${this.repo}${suffix}`;
  }

  // Labels
  async listLabels(): Promise<Record<string, number>> {
    if (this._labels === null) {
      const rows = (await this.request("GET", this.repoPath("/labels"), null, { limit: 100 })) ?? [];
      this._labels = Object.fromEntries(rows.map((r: any) => [r.name, r.id]));
    }
    return this._labels;
  }

  async ensureLabels(labels: ReadonlyArray<readonly [string, string]>): Promise<string[]> {
    const existing = await this.listLabels();
    const created: string[] = [];
    for (const [name, color] of labels) {
      if (name in existing) continue;
      await this.request("POST", this.repoPath("/labels"), { name, color: `#${color.replace(/^#/, "")}` });
      created.push(name);
    }
    return created;
  }

  private async labelIds(names: Iterable<string>): Promise<number[]> {
    const table = await this.listLabels();
    const ids: number[] = [];
    for (const n of names) {
      if (!(n in table)) throw new ForgejoError(`label '${n}' does not exist — run ensure-labels first`);
      ids.push(table[n]);
    }
    return ids;
  }

  // Milestones
  async findMilestone(title: string): Promise<number | null> {
    const rows = (await this.request("GET", this.repoPath("/milestones"), null, { state: "all", limit: 100 })) ?? [];
    for (const r of rows) if (r.title === title) return r.id;
    return null;
  }

  async ensureMilestone(title: string): Promise<number> {
    const mid = await this.findMilestone(title);
    if (mid !== null) return mid;
    const row = await this.request("POST", this.repoPath("/milestones"), { title });
    return row.id;
  }

  async closeMilestone(mid: number): Promise<void> {
    await this.request("PATCH", this.repoPath(`/milestones/${mid}`), { state: "closed" });
  }

  async listMilestones(): Promise<Json[]> {
    return (await this.request("GET", this.repoPath("/milestones"), null, { state: "all", limit: 100 })) ?? [];
  }

  // Issues
  async createIssue(title: string, body: string, labels: ReadonlyArray<string> = [], milestone: string | null = null): Promise<Json> {
    const payload: Json = { title, body };
    if (labels.length) payload.labels = await this.labelIds(labels);
    if (milestone) payload.milestone = await this.ensureMilestone(milestone);
    return this.request("POST", this.repoPath("/issues"), payload);
  }

  async getIssue(index: number): Promise<Json> {
    return this.request("GET", this.repoPath(`/issues/${index}`));
  }

  async listIssues(label: string | null = null, state: string | null = null): Promise<Json[]> {
    return (await this.request("GET", this.repoPath("/issues"), null, { labels: label, state, type: "issues", limit: 50 })) ?? [];
  }

  async comment(index: number, body: string): Promise<void> {
    await this.request("POST", this.repoPath(`/issues/${index}/comments`), { body });
  }

  async close(index: number, comment: string | null = null): Promise<void> {
    if (comment) await this.comment(index, comment);
    await this.request("PATCH", this.repoPath(`/issues/${index}`), { state: "closed" });
  }

  async setMilestone(index: number, milestone: string): Promise<number> {
    const mid = await this.ensureMilestone(milestone);
    await this.request("PATCH", this.repoPath(`/issues/${index}`), { milestone: mid });
    return mid;
  }

  async updateIssue(index: number, title?: string | null, body?: string | null): Promise<void> {
    const payload: Json = {};
    if (title !== undefined && title !== null) payload.title = title;
    if (body !== undefined && body !== null) payload.body = body;
    if (Object.keys(payload).length) await this.request("PATCH", this.repoPath(`/issues/${index}`), payload);
  }

  async editLabels(index: number, add: ReadonlyArray<string> = [], remove: ReadonlyArray<string> = []): Promise<void> {
    if (add.length) await this.request("POST", this.repoPath(`/issues/${index}/labels`), { labels: await this.labelIds(add) });
    for (const name of remove) {
      const table = await this.listLabels();
      if (name in table) await this.request("DELETE", this.repoPath(`/issues/${index}/labels/${table[name]}`));
    }
  }

  async addDependency(index: number, blocker: number): Promise<void> {
    await this.request("POST", this.repoPath(`/issues/${index}/dependencies`), { index: blocker, owner: this.owner, repo: this.repo });
  }

  async createPr(head: string, base: string, title: string, body: string): Promise<Json> {
    return this.request("POST", this.repoPath("/pulls"), { head, base, title, body });
  }
}