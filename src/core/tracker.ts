/**
 * Local file-based issue tracker for git repos without a remote.
 *
 * Issues, labels, dependencies, and epic milestones live in a single JSON ledger
 * at `docs/prd/tracker.json`. An epic is a milestone.
 */

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { TrackerError } from "./errors.js";

export { TrackerError };

export interface Issue {
  number: number;
  title: string;
  body: string;
  labels: string[];
  state: string; // open | closed
  comments: string[];
  blocked_by: number[];
  milestone: number | null;
}

export interface Milestone {
  number: number;
  title: string;
  state: string; // open | closed
}

interface Store {
  next: number;
  issues: Issue[];
  next_milestone: number;
  milestones: Milestone[];
}

export function storePath(root: string): string {
  return join(root, "docs", "prd", "tracker.json");
}

function load(root: string): Store {
  const p = storePath(root);
  if (!existsSync(p) || !statSync(p).isFile()) {
    return { next: 1, issues: [], next_milestone: 1, milestones: [] };
  }
  const data = JSON.parse(readFileSync(p, "utf-8")) as Partial<Store>;
  return {
    next: data.next ?? 1,
    issues: data.issues ?? [],
    next_milestone: data.next_milestone ?? 1,
    milestones: data.milestones ?? [],
  };
}

function save(root: string, data: Store): void {
  const p = storePath(root);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

function find(data: Store, number: number): Issue {
  for (const issue of data.issues) if (issue.number === number) return issue;
  throw new TrackerError(`no issue #${number} in the local tracker (docs/prd/tracker.json)`);
}

function findMilestone(data: Store, number: number): Milestone {
  for (const m of data.milestones) if (m.number === number) return m;
  throw new TrackerError(`no milestone #${number} in the local tracker (docs/prd/tracker.json)`);
}

function ensureMilestoneIn(data: Store, title: string): number {
  for (const m of data.milestones) if (m.title === title) return m.number;
  const number = data.next_milestone;
  data.next_milestone = number + 1;
  data.milestones.push({ number, title, state: "open" });
  return number;
}

export function ensure(root: string): string {
  save(root, load(root));
  return storePath(root);
}

export function create(
  root: string,
  title: string,
  body: string,
  labels: Iterable<string>,
  milestone: string | null = null,
): number {
  const data = load(root);
  const number = data.next;
  data.next = number + 1;
  const msNumber = milestone ? ensureMilestoneIn(data, milestone) : null;
  data.issues.push({
    number, title, body, labels: [...labels], state: "open", comments: [],
    blocked_by: [], milestone: msNumber,
  });
  save(root, data);
  return number;
}

export function view(root: string, number: number): Issue {
  return find(load(root), number);
}

export function listIssues(root: string, label?: string | null, state?: string | null): Issue[] {
  let issues = load(root).issues;
  if (label) issues = issues.filter(i => i.labels.includes(label));
  if (state) issues = issues.filter(i => i.state === state);
  return issues;
}

export function comment(root: string, number: number, text: string): void {
  const data = load(root);
  find(data, number).comments.push(text);
  save(root, data);
}

export function close(root: string, number: number, commentText?: string | null): void {
  const data = load(root);
  find(data, number).state = "closed";
  if (commentText) find(data, number).comments.push(commentText);
  save(root, data);
}

export function edit(root: string, number: number, title?: string | null, body?: string | null): void {
  const data = load(root);
  const issue = find(data, number);
  if (title !== null && title !== undefined) issue.title = title;
  if (body !== null && body !== undefined) issue.body = body;
  save(root, data);
}

export function editLabels(root: string, number: number, add: Iterable<string> = [], remove: Iterable<string> = []): string[] {
  const data = load(root);
  const issue = find(data, number);
  const removeSet = new Set(remove);
  const labels = issue.labels.filter(l => !removeSet.has(l));
  for (const label of add) if (!labels.includes(label)) labels.push(label);
  issue.labels = labels;
  save(root, data);
  return labels;
}

export function addDependency(root: string, number: number, blocker: number): void {
  const data = load(root);
  const issue = find(data, number);
  find(data, blocker);
  if (blocker === number) throw new TrackerError(`issue #${number} cannot block itself`);
  if (!issue.blocked_by.includes(blocker)) issue.blocked_by.push(blocker);
  save(root, data);
}

export function createMilestone(root: string, title: string): number {
  const data = load(root);
  const number = ensureMilestoneIn(data, title);
  save(root, data);
  return number;
}

export function closeMilestone(root: string, number: number): void {
  const data = load(root);
  findMilestone(data, number).state = "closed";
  save(root, data);
}

export function listMilestones(root: string): Milestone[] {
  return load(root).milestones;
}

export function setMilestone(root: string, number: number, title: string): number {
  const data = load(root);
  const issue = find(data, number);
  const msNumber = ensureMilestoneIn(data, title);
  issue.milestone = msNumber;
  save(root, data);
  return msNumber;
}