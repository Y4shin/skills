/**
 * The effort family: effort creation and archiving, planning-task creation, the map
 * section writer and the map finalizer, and the specification, architecture, and
 * review writers.
 *
 * The two shared writers travel with their callers: the effort-root writer sits beside
 * the spec and architecture writers that call it, and the root-index writer sits beside
 * effort creation and archiving, which is where the suite pins them.
 */

import { existsSync, mkdirSync, renameSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, resolve as resolvePath } from "node:path";
import { Type } from "typebox";
import { parse, dump, type Document, type FrontmatterData } from "../core/frontmatter.js";
import { slugRejection } from "../core/slug.js";
import { TYPE_LEAF, readMapSection, writeMapSection, effortDirOf, MAP_SECTION_NON_GOALS, MAP_SECTION_NON_NEGOTIABLE_FACTS, TASK_SUBTYPES, type Artifact } from "../core/art.js";
import { effortGraphs, effortFrontier, effortFinalizable } from "../core/graph.js";
import { OKF_VERSION } from "../core/migrate.js";
import { OptBool, OptStr, ScanHit, ScanIndex, Str, Tool, clearReadyForSpec, def, defStructured, findRoot, graphForPath, isDir, isFile, isInside, liveEffortDir, loadState, normalizedBody, outcome, parseArtifactFile, readArtifactTitle, readText, relPosix, requireV4Shape, resolveArt, saveState, scanMemo, taskRoot } from "./support.js";

/**
 * The archival note the architecture writer leaves in the effort's spec: the
 * specification's architecture content is archival once the living
 * architecture document exists, so the spec carries a pointer to it. The
 * note is appended once (idempotent) and nothing is deleted from the spec.
 * Returns whether the spec was written.
 */
const ARCHIVAL_NOTE_MARKER = "The architecture content in this specification is archival";

function ensureArchivalNote(specPath: string): boolean {
  const doc = parseArtifactFile(specPath).doc;
  if (doc.body.includes(ARCHIVAL_NOTE_MARKER)) return false;
  const note =
    "> The architecture content in this specification is archival: the living architecture " +
    "document is [architecture.md](architecture.md); update it there, not here.";
  doc.body = `${doc.body.replace(/\n+$/, "")}\n\n${note}\n`;
  writeFileSync(specPath, dump(doc), "utf-8");
  return true;
}

/**
 * The one effort-root artifact writer behind `tw_write_spec` and
 * `tw_write_architecture`. The empty-body guard, the create-or-refuse message,
 * and the title fallback (the argument, else the effort's map title, else the
 * effort slug) live here once; the only per-kind part is the validation a
 * creation runs and the note a write leaves behind, both passed in.
 */
interface EffortRootWriteOptions {
  root: string;
  selector: string;
  content: unknown;
  title: unknown;
  publish: boolean;
  /** The artifact type (`spec` or `architecture`) and so its leaf filename. */
  kind: "spec" | "architecture";
  /** The per-kind tail of the empty-body refusal. */
  emptyBody: string;
  /** Per-kind check on an artifact found in place; may throw its refusal. */
  validateExisting?: (art: Artifact) => void;
  /** Per-kind checks run before a creation; may throw its own refusal. */
  validateCreation?: (effortDir: string, effortName: string) => void;
  /** Per-kind side effect after the write; returns a suffix for the result. */
  afterWrite?: (path: string, effortDir: string) => string;
  /**
   * Write one `##` section instead of the whole body. The name is validated by
   * the caller; the write replaces that section in place (or appends it) and
   * leaves every other byte of the document alone. Refused when the document
   * does not exist: a partial write cannot invent the sections it is not told
   * about.
   */
  section?: string;
}

function writeEffortRootArtifact(o: EffortRootWriteOptions): string {
  const { root, kind } = o;
  if (typeof o.content !== "string" || o.content.trim() === "") {
    throw new Error(`content is empty: ${o.emptyBody}`);
  }
  const body = normalizedBody(o.content);
  const publish = o.publish;

  let hit: ScanHit | null = null;
  try {
    hit = resolveArt(root, o.selector, kind);
  } catch { /* the effort may exist without the artifact yet: create it */ }

  if (hit !== null) {
    refuseArchivedArtifact(root, hit.path);
    o.validateExisting?.(hit.art);
    if (o.section !== undefined) {
      hit.doc.body = writeMapSection(hit.doc.body, o.section, body);
    } else {
      hit.doc.body = body;
    }
    if (publish) hit.doc.data.status = "stable";
    writeFileSync(hit.path, dump(hit.doc), "utf-8");
    const suffix = o.afterWrite ? o.afterWrite(hit.path, dirname(hit.path)) : "";
    const where = o.section !== undefined ? `wrote '## ${o.section}' in ${relPosix(root, hit.path)}` : `wrote ${relPosix(root, hit.path)}`;
    return `${where}${publish ? " (status: stable)" : ""}${suffix}`;
  }

  if (o.section !== undefined) {
    throw new Error(
      `no ${kind} document for '${o.selector}': a section write corrects an existing document; ` +
        `write the whole body once to create it`,
    );
  }
  const effortDir = liveEffortDir(root, o.selector);
  if (effortDir === null) {
    throw new Error(
      `no live effort '${o.selector}': create the effort (a map at docs/tasks/<effort>/map.md) before writing its ${kind}`,
    );
  }
  const effortName = basename(effortDir);
  o.validateCreation?.(effortDir, effortName);
  const title =
    typeof o.title === "string" && o.title.trim() !== ""
      ? o.title.trim()
      : readArtifactTitle(join(effortDir, "map.md")) ?? basename(effortDir);
  const path = join(effortDir, TYPE_LEAF[kind]);
  writeFileSync(path, dump({ data: { type: kind, title, status: publish ? "stable" : "draft" }, body }), "utf-8");
  const suffix = o.afterWrite ? o.afterWrite(path, effortDir) : "";
  return `wrote ${relPosix(root, path)} (created, status: ${publish ? "stable" : "draft"})${suffix}`;
}

/**
 * The two review passes and the file each writes. The finalize pass owns
 * review.md and the archive flag; the end-of-effort pass is advisory and
 * writes its own file, so the work that produces whole-effort findings and
 * the phase that dispositions them both have a named artifact.
 */
const REVIEW_PASSES = ["finalize", "end-of-effort"] as const;

type ReviewPass = (typeof REVIEW_PASSES)[number];

function reviewPathFor(effortDir: string, pass: ReviewPass): string {
  return join(effortDir, pass === "end-of-effort" ? "end-of-effort-review.md" : "review.md");
}

// ─── Review artifact helpers (finalize-effort) ─────────────────────────────

/** The tool-owned body section the review writer replaces on every pass. */
const REVIEW_DISPOSITIONS_SECTION = "Dispositions";

/** The three dispositions a finding can carry; absent means untriaged. */
const REVIEW_DISPOSITIONS = ["ticket", "follow-up", "informational"] as const;

type ReviewDisposition = (typeof REVIEW_DISPOSITIONS)[number];

/**
 * The close reconcile record's legal shapes. The reconcile step is prose
 * discipline; this makes it a tool-owned statement the archive can refuse
 * without. `unavailable` is the narrow escape for a tree whose architecture
 * the v5 writer cannot touch (the schema-4 legacy leaf).
 */
const RECONCILE_PREFIXES = ["done", "none", "unavailable"] as const;

function normalizeReconcile(raw: unknown): string | undefined {
  if (typeof raw !== "string" || raw.trim() === "") return undefined;
  const value = raw.trim().replace(/\s+/g, " ");
  const head = value.split(":")[0].trim().toLowerCase();
  if (!(RECONCILE_PREFIXES as readonly string[]).includes(head)) {
    throw new Error(
      `invalid reconcile record '${value}': start it with one of ` +
        `${RECONCILE_PREFIXES.map((p) => `'${p}: <reason>'`).join(", ")}`,
    );
  }
  if (value === head || value === `${head}:`) {
    throw new Error(`reconcile record '${head}:' needs a reason after the colon`);
  }
  return value;
}

interface ReviewFinding {
  finding: string;
  disposition?: ReviewDisposition;
  target?: string;
}

/**
 * Validate the writer's structured finding list. Runtime validation backs the
 * tool schema up, because a provider that flattens the parameters can hand a
 * call here that never passed through TypeBox.
 */
function parseReviewFindings(raw: unknown): ReviewFinding[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) {
    throw new Error("findings must be a list of { finding, disposition, target } entries");
  }
  return raw.map((entry, i) => {
    const e = (entry ?? {}) as Record<string, unknown>;
    const finding = typeof e.finding === "string" ? e.finding.trim() : "";
    if (finding === "") {
      throw new Error(`finding ${i + 1} is empty: every finding needs a one-line description`);
    }
    const disposition = e.disposition === undefined ? undefined : String(e.disposition);
    if (disposition !== undefined && !(REVIEW_DISPOSITIONS as readonly string[]).includes(disposition)) {
      throw new Error(
        `invalid disposition '${disposition}' for '${finding}': use ${REVIEW_DISPOSITIONS.join(", ")}, ` +
          `or omit it while the finding is untriaged`,
      );
    }
    const target = typeof e.target === "string" && e.target.trim() !== "" ? e.target.trim() : undefined;
    if ((disposition === "ticket" || disposition === "follow-up") && target === undefined) {
      throw new Error(`disposition '${disposition}' for '${finding}' needs a target slug`);
    }
    return { finding, disposition: disposition as ReviewDisposition | undefined, target };
  });
}

/**
 * Validate every disposition target a review write supplies against the tree.
 * A `ticket` disposition names a ticket this effort already has; a
 * `follow-up` names a live effort linked back by origin_effort. Both review
 * passes share it: an advisory disposition with a typo would otherwise record
 * "ticketed to X" for a ticket that does not exist, and the archive skips
 * advisory artifacts, so nothing would ever catch it.
 */
function validateReviewTargets(
  root: string,
  index: ScanIndex,
  effortDir: string,
  effortName: string,
  findings: ReviewFinding[],
): void {
  for (const finding of findings) {
    if (finding.disposition === "ticket") {
      const known = index.hits.find(
        (h) => h.art.type === "ticket" && h.art.slug === finding.target && isInside(effortDir, h.path),
      );
      if (known === undefined) {
        throw new Error(
          `ticket disposition for '${finding.finding}' names '${finding.target}', which is not an ` +
            `existing ticket in '${effortName}'`,
        );
      }
      continue;
    }
    if (finding.disposition === "follow-up") {
      requireLinkedFollowUp(
        root,
        effortName,
        finding.target!,
        `finding '${finding.finding}'`,
      );
    }
  }
}

/** One finding's line in the tool-owned `## Dispositions` record. */
function reviewDispositionLine(finding: ReviewFinding): string {
  switch (finding.disposition) {
    case "ticket":
      return `- ${finding.finding}: ticket \`${finding.target}\``;
    case "follow-up":
      return `- ${finding.finding}: follow-up effort \`${finding.target}\``;
    case "informational":
      return `- ${finding.finding}: informational (accepted)`;
    default:
      return `- ${finding.finding}: not yet triaged`;
  }
}

/**
 * The live effort directory a selector names, accepting the effort's existing
 * artifact path as well as its slug. `liveEffortDir` handles the slug and a
 * map path; the review writer also promises the review's own path, which only
 * exists after the first write.
 */
function liveEffortDirOfArtifact(root: string, selector: string, want: string): string | null {
  const direct = liveEffortDir(root, selector);
  if (direct !== null) return direct;
  let hit: ScanHit;
  try {
    hit = resolveArt(root, selector, want);
  } catch {
    return null;
  }
  const candidate = dirname(hit.path);
  const rel = relPosix(taskRoot(root), candidate);
  if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) return null;
  if (rel.split(/[\\/]/)[0] === "archive") return null;
  return isDir(candidate) ? candidate : null;
}

/**
 * Require that a named follow-up effort exists and is linked to the origin by
 * `origin_effort` on its own map. The link is what makes the trail read in both
 * directions: the origin records the child's slug, the child records the
 * origin.
 */
function requireLinkedFollowUp(root: string, origin: string, target: string, subject: string): void {
  const childDir = liveEffortDir(root, target);
  if (childDir === null) {
    throw new Error(
      `no live effort '${target}' for ${subject}: a follow-up is another existing effort, created only after a human yes`,
    );
  }
  const childName = basename(childDir);
  const mapPath = join(childDir, "map.md");
  if (!isFile(mapPath)) {
    throw new Error(
      `follow-up effort '${childName}' has no map: a follow-up is linked by origin_effort on its map`,
    );
  }
  if (parseArtifactFile(mapPath).art.origin_effort !== origin) {
    throw new Error(
      `'${childName}' is not linked to '${origin}' by origin_effort on its map: create the follow-up with ` +
        `tw_create_effort and origin_effort '${origin}'`,
    );
  }
}

/**
 * The intake creation helpers: the front door needs the same safe-slug and
 * effort-anchoring checks the other creators carry. A created map seeds the
 * two canonical sections as empty placeholders, so a later gate refusal
 * names missing content rather than a missing section.
 */

/**
 * The map document intake creates: v4 shape, stable, with the two canonical
 * sections present as empty placeholders and the standard body skeleton.
 * `originEffort`, when present, is the additive schema-5 link a follow-up
 * effort carries on its own map: a field on the child, never a graph edge.
 */
function createEffortDocument(title: string, originEffort?: string): Document {
  let body = `# ${title}\n\n## Destination\n\n<what done looks like>\n\n## Constraints\n\n- (none yet)\n`;
  body = writeMapSection(body, MAP_SECTION_NON_GOALS, "");
  body = writeMapSection(body, MAP_SECTION_NON_NEGOTIABLE_FACTS, "");
  const data: FrontmatterData = { type: "map", title, status: "stable" };
  if (originEffort !== undefined) data.origin_effort = originEffort;
  return { data, body };
}

/**
 * Register an effort in the root index's `## Live` list, sorted, creating
 * the index with the landed index shape when the tree has none yet.
 */
function registerLiveEffort(root: string, effort: string): void {
  const indexPath = join(taskRoot(root), "index.md");
  const body = isFile(indexPath) ? parse(readText(indexPath)).body : "";
  writeTasksIndex(root, {
    live: [...indexNames(body, "Live"), effort],
    archived: indexNames(body, "Archived"),
  });
}

/** True when a path sits strictly inside a directory. */
/**
 * An artifact under `docs/tasks/archive/` is the record of a finished effort:
 * history, not a document to amend. The writers refuse it explicitly so the
 * error says that, instead of the gate's misleading "no live effort" (no phase
 * opens for an archived effort, so no writer is reachable there anyway).
 */
function refuseArchivedArtifact(root: string, path: string): void {
  const rel = relPosix(taskRoot(root), path);
  const segments = rel.split(/[\\/]/).filter((s) => s !== "" && s !== ".");
  if (segments[0] !== "archive") return;
  throw new Error(
    `'${relPosix(root, path)}' belongs to an archived effort: the archive is the record of what was ` +
      `settled, not a document to amend. A correction to what was built belongs to a new effort`,
  );
}

/**
 * Render one root-index section the way the migration renders it: one bullet
 * per effort, or the '(none)' placeholder when the list is empty.
 */
function indexSection(names: string[]): string {
  return names.length === 0 ? "(none)" : names.map((n) => `- ${n}`).join("\n");
}

/** The effort names one root-index section lists (bullets only). */
function indexNames(body: string, section: string): string[] {
  return (readMapSection(body, section) ?? [])
    .filter((line) => /^- /.test(line.trim()))
    .map((line) => line.trim().replace(/^- /, ""));
}

/**
 * The one writer of `docs/tasks/index.md`: both lists are rewritten from the
 * given names, both sorted, and the index is created with the landed shape
 * when the tree has none. Effort creation and the archive move are its two
 * callers, so the two paths cannot drift on sorting again (the creation path
 * once sorted Live only while the archive path sorted both).
 */
function writeTasksIndex(root: string, lists: { live: string[]; archived: string[] }): string {
  const indexPath = join(taskRoot(root), "index.md");
  const doc: Document = isFile(indexPath)
    ? parse(readText(indexPath))
    : { data: { type: "index", okf_version: OKF_VERSION, title: "docs/tasks" }, body: "\n# docs/tasks\n" };
  const sorted = (names: string[]): string[] => [...new Set(names)].sort((a, b) => a.localeCompare(b));
  let body = writeMapSection(doc.body, "Live", indexSection(sorted(lists.live)));
  body = writeMapSection(body, "Archived", indexSection(sorted(lists.archived)));
  doc.body = body;
  writeFileSync(indexPath, dump(doc), "utf-8");
  return indexPath;
}

export const tw_write_section: Tool = def(
  "Write a '##' body section of an effort map: the only writer of the map body. " +
    "Carries '## Non-goals' and '## Non-negotiable facts', whose first line is the bolded effort-level " +
    "success test. Every write clears ready_for_spec, so a post-reconcile map change forces one more " +
    "Wayfinder pass.",
  {
    selector: Str("Map slug or path"),
    section: Str("The '##' heading name, without the marks"),
    content: Str("The section body; an empty string seeds an empty placeholder"),
  },
  async (p, ctx) => {
    const root = findRoot(ctx.directory);
    const { path, art, doc } = resolveArt(root, p.selector, "map");
    refuseArchivedArtifact(root, path);
    requireV4Shape(art);
    const section = typeof p.section === "string" ? p.section.trim() : "";
    if (section === "") throw new Error("section name is empty");
    if (/\n/.test(section)) {
      throw new Error(`section name '${section.replace(/\n.*/s, "")}' must be a single '##' heading name`);
    }
    doc.body = writeMapSection(doc.body, section, typeof p.content === "string" ? p.content : "");
    const cleared = clearReadyForSpec(doc);
    writeFileSync(path, dump(doc), "utf-8");
    return `wrote '## ${section}' in ${relPosix(root, path)}${cleared ? "; ready_for_spec cleared" : ""}`;
  },
);

export const tw_finalize_map: Tool = def(
  "Check an effort map is ready for the spec phase and set ready_for_spec: true: the only setter of the " +
    "flag, and it sets it last. Refuses, naming every missing item, when the planning frontier is not empty, " +
    "'## Non-goals' is missing or empty, or '## Non-negotiable facts' is missing, empty, or does not open " +
    "with the bolded success-test line.",
  { selector: Str("Map slug or path") },
  async (p, ctx) => {
    const root = findRoot(ctx.directory);
    const { path, art, doc } = resolveArt(root, p.selector, "map");
    requireV4Shape(art);
    const graph = graphForPath(effortGraphs(scanMemo(root)()), path);
    const missing: string[] = [];
    // The planning frontier is the ready edge of the task kind: the
    // vocabulary splits planning tasks from implementation tickets, and
    // only the planning kind gates the hand-off to the spec phase.
    const frontier = (graph === null ? [] : effortFrontier(graph)).filter((a) => a.type === "task");
    if (frontier.length > 0) {
      missing.push(`the planning frontier is not empty: ${frontier.map((a) => a.slug).join(", ")}`);
    }
    const nonGoals = readMapSection(doc.body, MAP_SECTION_NON_GOALS);
    if (nonGoals === null) missing.push(`the map has no '## ${MAP_SECTION_NON_GOALS}' section`);
    else if (nonGoals.length === 0) missing.push(`'## ${MAP_SECTION_NON_GOALS}' is empty`);
    const facts = readMapSection(doc.body, MAP_SECTION_NON_NEGOTIABLE_FACTS);
    if (facts === null) missing.push(`the map has no '## ${MAP_SECTION_NON_NEGOTIABLE_FACTS}' section`);
    else if (facts.length === 0) missing.push(`'## ${MAP_SECTION_NON_NEGOTIABLE_FACTS}' is empty`);
    else if (!/^\*\*.*\*\*/.test(facts[0].trim())) {
      missing.push(
        `'## ${MAP_SECTION_NON_NEGOTIABLE_FACTS}' does not open with the bolded effort-level success-test line`,
      );
    }
    // The map is done when the way is clear. A non-empty '## Fog' means
    // decisions are still open, so handing off to the spec would push
    // them into a phase whose boundary forbids settling them. Every fog
    // line must be promoted to a task, folded into a canonical section,
    // or recorded out of scope before the flag is set.
    const fog = readMapSection(doc.body, "Fog");
    const fogLines = (fog ?? []).map((line) => line.trim()).filter((line) => line !== "");
    if (fogLines.length > 0) {
      const preview = fogLines.slice(0, 3).join(" | ");
      // A placeholder sentence is the common case and reads as a bug in
      // the refusal unless it is named: the section is empty when it has
      // no lines, and "Nothing open." is a line.
      const placeholder =
        fogLines.length === 1 && /^(nothing|none|n\/a|tbd)\b[^a-z]*$/i.test(fogLines[0])
          ? ` (the section holds only the placeholder '${fogLines[0]}': leave '## Fog' literally empty)`
          : "";
      missing.push(
        `'## Fog' still holds ${fogLines.length} open question(s): ${preview}${placeholder}` +
          `; promote each to a planning task, fold it into a canonical section, or record it out of scope`,
      );
    }
    if (missing.length > 0) {
      throw new Error(
        `cannot finalize the map '${art.slug}'; ${missing.length} check(s) failed:\n- ${missing.join("\n- ")}`,
      );
    }
    // Every check passed: the flag is set last, in the single write.
    doc.data.ready_for_spec = true;
    writeFileSync(path, dump(doc), "utf-8");
    return `map finalized: ready_for_spec = true in ${relPosix(root, path)}`;
  },
);

export const tw_write_spec: Tool = def(
  "Write an effort's specification (spec.md): the only writer of the spec body, through the " +
    "frontmatter seam. Creates the spec when the effort has none (title from the argument, else the " +
    "effort's map, else the effort slug), with status draft while writing. 'publish: true' sets " +
    "status: stable, the named spec-stable write; a plain write leaves the status untouched. Refuses " +
    "an empty body, a selector naming no live effort, and v3-shape artifacts.",
  {
    selector: Str("Effort slug, or the effort's spec or map path"),
    content: Str("The specification body (markdown after the frontmatter)"),
    title: OptStr("Title used only when the write creates the spec"),
    publish: OptBool,
  },
  async (p, ctx) =>
    writeEffortRootArtifact({
      root: findRoot(ctx.directory),
      selector: p.selector,
      content: p.content,
      title: p.title,
      publish: p.publish === true,
      kind: "spec",
      emptyBody: "a spec write needs a body",
      // A v3-shape spec is a migration job: refused wherever it is found.
      validateExisting: requireV4Shape,
    }),
);

export const tw_write_architecture: Tool = def(
  "Write an effort's architecture document (architecture.md): the only writer of the living " +
    "architecture, through the frontmatter seam. Creates the document when the effort has none " +
    "(title from the argument, else the effort's map, else the effort slug), with status draft while " +
    "writing; 'publish: true' sets status: stable, the named architecture-stable write. The write also " +
    "adds the archival note to the effort's spec.md pointing at the architecture (idempotent; nothing " +
    "is deleted from the spec): the specification's architecture content is archival once the living " +
    "document exists. Refuses an empty body, a selector naming no live effort, an effort with no spec " +
    "(the architecture is produced from the spec's architecture content), a v3-shape spec, and a " +
    "legacy arch-spec.md in the effort (the schema-5 migration renames it; new output is never the " +
    "legacy shape).",
  {
    selector: Str("Effort slug, or the effort's architecture or map path"),
    content: Str("The architecture body (markdown after the frontmatter), or one section's body"),
    title: OptStr("Title used only when the write creates the document"),
    publish: OptBool,
    section: OptStr(
      "Write only this '##' section (name without the marks): the rest of the document is left " +
        "byte for byte, so a correction does not resend the whole body. Requires an existing document",
    ),
  },
  async (p, ctx) => {
    const root = findRoot(ctx.directory);
    const section = typeof p.section === "string" ? p.section.trim() : undefined;
    if (section !== undefined) {
      if (section === "") throw new Error("section name is empty");
      if (/\n/.test(section)) {
        throw new Error(`section name '${section.replace(/\n.*/s, "")}' must be a single '##' heading name`);
      }
    }
    return writeEffortRootArtifact({
      root,
      selector: p.selector,
      content: p.content,
      title: p.title,
      publish: p.publish === true,
      kind: "architecture",
      emptyBody: "an architecture write needs a body",
      // A v3-shape architecture is a migration job, like the spec: the
      // whole-body path rewrote one before this guard existed.
      validateExisting: requireV4Shape,
      ...(section !== undefined ? { section } : {}),
      // The architecture consumes the architecture content already
      // recorded in the spec: no spec, nothing to produce it from.
      validateCreation: (effortDir, effortName) => {
        const specPath = join(effortDir, "spec.md");
        if (!isFile(specPath)) {
          throw new Error(
            `effort '${effortName}' has no spec: the architecture is produced from the spec's architecture content; ` +
              `write the spec with tw_write_spec first`,
          );
        }
        requireV4Shape(parseArtifactFile(specPath).art);
        const index = scanMemo(root)();
        // Legacy tolerance is input-only: a legacy arch-spec.md in the
        // effort means the tree has not been migrated, and creating the v5
        // document beside it would leave two architecture documents.
        const legacy = index.hits.filter((h) => isInside(effortDir, h.path) && h.art.type === "arch spec");
        if (legacy.length > 0) {
          throw new Error(
            `effort '${effortName}' still holds the legacy architecture shape ` +
              `(${legacy.map((h) => relPosix(root, h.path)).join(", ")}): run the schema-5 migration ` +
              `(it renames arch-spec.md to architecture.md) before using the v5 architecture writer`,
          );
        }
        // One living document per effort: a v5 architecture document the
        // effort already holds elsewhere (the migration's multi-document
        // rename corner) is a duplication to resolve, not to add to.
        const archPath = join(effortDir, TYPE_LEAF.architecture);
        const duplicates = index.hits.filter(
          (h) =>
            isInside(effortDir, h.path) &&
            h.art.type === "architecture" &&
            resolvePath(h.path) !== resolvePath(archPath),
        );
        if (duplicates.length > 0) {
          throw new Error(
            `effort '${effortName}' already holds architecture document(s) elsewhere ` +
              `(${duplicates.map((h) => relPosix(root, h.path)).join(", ")}): resolve the duplication before creating another one`,
          );
        }
      },
      // The living document makes the spec's architecture content
      // archival: the spec gains a pointer (idempotent, nothing deleted).
      afterWrite: (_path, effortDir) => {
        const specPath = join(effortDir, "spec.md");
        const noted = isFile(specPath) ? ensureArchivalNote(specPath) : false;
        return noted ? "; the spec now points at the architecture" : "";
      },
    });
  },
);

export const tw_write_review: Tool = defStructured(
  "Write an effort's review artifact (review.md at the effort root): the only writer of the whole-effort " +
    "review. Writes type: review and a tool-owned '## Dispositions' section, and sets the dispositioned flag " +
    "the archive gate reads: true when the findings list is supplied and every finding carries a " +
    "disposition (in-scope: an implementation ticket already in the effort; out-of-scope: a follow-up " +
    "effort after a human yes; informational: explicitly accepted), false while any finding is untriaged. " +
    "With follow_up, the accepted follow-up receives the findings body in its own review.md (one copy, " +
    "moved, not copied) and the origin keeps the disposition record naming the follow-up slug, so the " +
    "trail reads in both directions. Refuses an empty body, a selector naming no live effort, an unknown " +
    "disposition, a ticket target that is not an existing ticket in the effort, a follow-up target that " +
    "is not a live effort stamped origin_effort, a move while a finding is untriaged, and a review that " +
    "names more than one follow-up effort.",
  Type.Object({
    selector: Type.String({ description: "Effort slug, or the effort's review or map path" }),
    content: Type.String({ description: "The review body: the holistic review findings (markdown)" }),
    title: Type.Optional(
      Type.String({ description: "The review title; the existing title, else 'Review of <effort>'" }),
    ),
    findings: Type.Optional(
      Type.Array(
        Type.Object({
          finding: Type.String({ description: "One finding, in one line" }),
          disposition: Type.Optional(
            Type.Union(
              [Type.Literal("ticket"), Type.Literal("follow-up"), Type.Literal("informational")],
              { description: "How the finding was dispositioned; omit while it is untriaged" },
            ),
          ),
          target: Type.Optional(
            Type.String({ description: "The ticket slug (ticket) or follow-up effort slug (follow-up)" }),
          ),
        }),
      ),
    ),
    follow_up: Type.Optional(
      Type.String({ description: "The accepted follow-up effort the findings move into" }),
    ),
    reconcile: Type.Optional(
      Type.String({
        description:
          "The close reconcile record, finalize pass only: 'done: <what changed>', " +
          "'none: <why nothing needed reconciling>', or 'unavailable: <reason>'. The archive " +
          "refuses a finalize review without it.",
      }),
    ),
    pass: Type.Optional(
      Type.Union([Type.Literal("finalize"), Type.Literal("end-of-effort")], {
        description:
          "Which review pass writes: 'finalize' (default) writes review.md and owns the archive flag; " +
          "'end-of-effort' writes end-of-effort-review.md, the advisory review implement-ticket records",
      }),
    ),
  }),
  async (p, ctx) => {
    const root = findRoot(ctx.directory);
    const content = typeof p.content === "string" ? p.content.trim() : "";
    if (content === "") {
      throw new Error("content is empty: a review write needs the findings body");
    }
    const pass: ReviewPass = p.pass === "end-of-effort" ? "end-of-effort" : "finalize";
    const effortDir = liveEffortDirOfArtifact(root, String(p.selector ?? ""), "review");
    if (effortDir === null) {
      throw new Error(
        `no live effort '${p.selector}': run finalize-effort on an existing effort's review`,
      );
    }
    // The end-of-effort pass is advisory: it records findings and never
    // dispositions them or moves them. Its file is a separate artifact so
    // the finalize pass can read it and disposition every finding.
    if (pass === "end-of-effort") {
      // The advisory pass records findings and, later, the finalize
      // triage's dispositions of them. It never moves findings to a
      // follow-up and it never sets the archive flag: the finalize
      // review owns that.
      if (p.reconcile !== undefined) {
        throw new Error("the reconcile record belongs to the finalize review, not the advisory pass");
      }
      if (p.follow_up !== undefined) {
        throw new Error(
          "the end-of-effort review pass is advisory: its findings are dispositioned here but moved " +
            "only by the finalize review",
        );
      }
      const path = reviewPathFor(effortDir, pass);
      const existing = isFile(path) ? parseArtifactFile(path).doc : undefined;
      const givenTitle = typeof p.title === "string" && p.title.trim() !== "" ? p.title.trim() : undefined;
      const title = givenTitle ?? `End-of-effort review of ${basename(effortDir)}`;
      const advisoryFindings = parseReviewFindings(p.findings);
      if (advisoryFindings !== undefined) {
        validateReviewTargets(root, scanMemo(root)(), effortDir, basename(effortDir), advisoryFindings);
      }
      const body =
        advisoryFindings === undefined
          ? `\n${content}\n`
          : writeMapSection(
              `\n${content}\n`,
              REVIEW_DISPOSITIONS_SECTION,
              advisoryFindings.length === 0
                ? "(no findings)"
                : advisoryFindings.map(reviewDispositionLine).join("\n"),
            );
      const data: Record<string, unknown> = { ...(existing?.data ?? {}), type: "review", title, pass };
      if (advisoryFindings !== undefined) {
        data.dispositioned = advisoryFindings.every((f) => f.disposition !== undefined);
      }
      writeFileSync(path, dump({ data, body }), "utf-8");
      return outcome(
        `wrote ${relPosix(root, path)} (advisory end-of-effort pass${
          advisoryFindings === undefined ? "" : `, dispositioned: ${String(data.dispositioned)}`
        })`,
        { path: relPosix(root, path), pass, dispositioned: data.dispositioned },
      );
    }
    {
    const effortName = basename(effortDir);
    const findings = parseReviewFindings(p.findings);
    const followUp =
      typeof p.follow_up === "string" && p.follow_up.trim() !== "" ? p.follow_up.trim() : undefined;

    // Every disposition's target is validated against the tree, in both
    // passes: a ticket disposition names a ticket this effort already has,
    // a follow-up names an effort linked back by origin_effort.
    const index = scanMemo(root)();
    if (findings !== undefined) validateReviewTargets(root, index, effortDir, effortName, findings);

    const dispositioned = findings !== undefined && findings.every((f) => f.disposition !== undefined);
    const followUpFindings = (findings ?? []).filter((f) => f.disposition === "follow-up");
    if (followUp !== undefined) {
      if (followUpFindings.length === 0) {
        throw new Error(
          `follow_up '${followUp}' was named but no finding is dispositioned into a follow-up effort`,
        );
      }
      if (!dispositioned) {
        throw new Error(
          `cannot move the review to '${followUp}': every finding must be dispositioned first`,
        );
      }
      const other = followUpFindings.find((f) => f.target !== followUp);
      if (other !== undefined) {
        throw new Error(
          `the review moves to one follow-up effort: '${other.finding}' names '${other.target}', ` +
            `not '${followUp}'`,
        );
      }
      requireLinkedFollowUp(root, effortName, followUp, "the follow-up effort");
    } else if (followUpFindings.length > 0) {
      throw new Error(
        `finding '${followUpFindings[0].finding}' is dispositioned into follow-up effort ` +
          `'${followUpFindings[0].target}': name it with follow_up so the findings move with the accepted effort`,
      );
    }

    const reviewPath = reviewPathFor(effortDir, "finalize");
    const existing = isFile(reviewPath) ? parseArtifactFile(reviewPath).doc : undefined;
    const givenTitle = typeof p.title === "string" && p.title.trim() !== "" ? p.title.trim() : undefined;
    const existingTitle = typeof existing?.data.title === "string" ? existing.data.title : undefined;
    const title = givenTitle ?? existingTitle ?? `Review of ${effortName}`;
    const record =
      findings === undefined
        ? "(not yet triaged)"
        : findings.length === 0
          ? "(no findings)"
          : findings.map(reviewDispositionLine).join("\n");

    // The origin keeps the disposition record. When the findings move, the
    // origin's body is that record plus the pointer to the child; the full
    // findings body lives only in the child (moved, not copied).
    let originBody: string;
    if (followUp !== undefined) {
      const moved =
        `The findings in this review moved to the follow-up effort \`${followUp}\`: the review ` +
        `artifact is at \`docs/tasks/${followUp}/review.md\`.`;
      originBody = writeMapSection(`\n${moved}\n`, REVIEW_DISPOSITIONS_SECTION, record);
    } else {
      originBody = writeMapSection(`\n${content}\n`, REVIEW_DISPOSITIONS_SECTION, record);
    }

    if (followUp !== undefined) {
      const childPath = join(taskRoot(root), followUp, "review.md");
      const childDoc: Document = {
        data: { type: "review", title, dispositioned: false },
        body:
          `\n> Moved from the effort \`${effortName}\`: these findings are the follow-up's work.\n\n` +
          `${content}\n`,
      };
      writeFileSync(childPath, dump(childDoc), "utf-8");
    }

    // The reconcile record survives a triage rewrite that omits it: the
    // reconcile happened before the findings were dispositioned.
    const reconcile =
      normalizeReconcile(p.reconcile) ??
      (typeof existing?.data.reconcile === "string" ? existing.data.reconcile : undefined);
    const docData: Record<string, unknown> = {
      ...(existing?.data ?? {}),
      type: "review",
      title,
      dispositioned,
    };
    if (reconcile !== undefined) docData.reconcile = reconcile;
    const doc: Document = { data: docData, body: originBody };
    writeFileSync(reviewPath, dump(doc), "utf-8");
    const movedNote = followUp !== undefined ? `; findings moved to ${followUp}` : "";
    return outcome(
      `wrote ${relPosix(root, reviewPath)} (dispositioned: ${dispositioned}${movedNote})`,
      { path: relPosix(root, reviewPath), dispositioned, movedTo: followUp },
    );
    }
  },
);

export const tw_create_effort: Tool = def(
  "Create an effort: the named effort/map creation tool. Writes docs/tasks/<effort>/map.md through " +
    "the frontmatter seam (type: map, status: stable) with '## Non-goals' and '## Non-negotiable facts' " +
    "seeded as empty placeholders, so a later gate refusal names missing content rather than a missing " +
    "section, and registers the effort in the root index's Live list (sorted; creating docs/tasks/index.md " +
    "when the tree has none). 'origin_effort' links a follow-up effort to the effort it spun out of: an " +
    "additive field on the child map, never a graph edge, so it never enters the frontier or blocked_by. " +
    "Refuses an unsafe slug, an effort that already exists, a missing title, and an origin that is not a " +
    "live effort.",
  {
    effort: Str("The effort slug (lowercase letters, digits, hyphens)"),
    title: Str("The effort title"),
    origin_effort: OptStr(
      "The live effort this one is a follow-up of; written as origin_effort on the child map",
    ),
  },
  async (p, ctx) => {
    const root = findRoot(ctx.directory);
    const effort = String(p.effort ?? "");
    const title = typeof p.title === "string" ? p.title.trim() : "";
    const effortRejection = slugRejection(effort);
    if (effortRejection !== null) {
      throw new Error(`invalid effort slug '${effort}': ${effortRejection}`);
    }
    if (title === "") throw new Error("title is empty: an effort needs a title");
    const originEffort =
      typeof p.origin_effort === "string" && p.origin_effort.trim() !== "" ? p.origin_effort.trim() : undefined;
    if (originEffort !== undefined) {
      const originRejection = slugRejection(originEffort);
      if (originRejection !== null) {
        throw new Error(`invalid origin effort slug '${originEffort}': ${originRejection}`);
      }
      if (liveEffortDir(root, originEffort) === null) {
        throw new Error(
          `origin effort '${originEffort}' is not a live effort: a follow-up links only to an existing effort`,
        );
      }
    }
    const effortDir = join(taskRoot(root), effort);
    if (liveEffortDir(root, effort) !== null) {
      throw new Error(
        `effort '${effort}' already exists: intake creates an effort once; fold new work into it instead`,
      );
    }
    if (existsSync(effortDir)) {
      throw new Error(
        `a directory for '${effort}' already exists under docs/tasks/ but holds no map: resolve it before creating the effort`,
      );
    }
    mkdirSync(effortDir, { recursive: true });
    const mapPath = join(effortDir, "map.md");
    writeFileSync(mapPath, dump(createEffortDocument(title, originEffort)), "utf-8");
    registerLiveEffort(root, effort);
    const linkNote = originEffort !== undefined ? `; linked to origin effort '${originEffort}'` : "";
    return `created ${relPosix(root, mapPath)} (both canonical sections seeded empty); registered '${effort}' in the root index${linkNote}`;
  },
);

export const tw_add_task: Tool = def(
  "Create a planning task at docs/tasks/<effort>/tasks/<slug>/task.md: the named task creator, writing " +
    "through the frontmatter seam. Writes type: task with the given planning subtype (research, prototype, " +
    "grilling, or manual), status: stable, workflow_state: ready, and validates blocked_by at creation " +
    "(kind-scoped: only existing planning tasks of the same effort; create in dependency order, no second " +
    "wiring pass). An added task clears the map's ready flag, so a post-reconcile addition forces one more " +
    "Wayfinder pass. Refuses an unsafe or duplicate slug (a slug that collides with any artifact of the " +
    "effort, including tickets), a subtype outside the planning set, a blocked_by edge that dangles or " +
    "crosses the kind, and an effort with no map.",
  {
    effort: Str("The effort slug the task lands in"),
    slug: Str("The task slug (lowercase letters, digits, hyphens)"),
    subtype: {
      type: "string" as const,
      enum: [...TASK_SUBTYPES],
      description: "research | prototype | grilling | manual",
    },
    title: Str("The task title"),
    mode: OptStr("'human' when the human must perform it; omit otherwise"),
    blocked_by: { type: "array" as const, items: { type: "string" as const }, optional: true, description: "Planning task slugs in the same effort that must be done first" },
    content: OptStr("The task body (the decision to settle, the known choices, the recommended answer)"),
  },
  async (p, ctx) => {
    const root = findRoot(ctx.directory);
    const slug = String(p.slug ?? "");
    const title = typeof p.title === "string" ? p.title.trim() : "";
    const rejection = slugRejection(slug);
    if (rejection !== null) {
      throw new Error(`invalid slug '${slug}': ${rejection}`);
    }
    if (title === "") throw new Error(`task '${slug}' has no title`);
    const subtype = String(p.subtype ?? "");
    if (!(TASK_SUBTYPES as readonly string[]).includes(subtype)) {
      throw new Error(`invalid subtype '${subtype}': a task is '${TASK_SUBTYPES.join("' or '")}'`);
    }
    if (p.mode !== undefined && p.mode !== "human") {
      throw new Error(`invalid mode '${p.mode}': the only mode value is 'human'; omit it otherwise`);
    }
    const effortDir = liveEffortDir(root, p.effort);
    if (effortDir === null) {
      throw new Error(
        `no live effort '${p.effort}': create the effort (a map at docs/tasks/<effort>/map.md) before adding tasks`,
      );
    }
    const mapHit = parseArtifactFile(join(effortDir, "map.md"));
    requireV4Shape(mapHit.art);
    const index = scanMemo(root)();
    const clash = index.hits.find((h) => h.art.slug === slug && isInside(effortDir, h.path));
    if (clash !== undefined) {
      throw new Error(
        `'${slug}' already exists in '${p.effort}' (${clash.art.type} at ${relPosix(root, clash.path)})`,
      );
    }
    if (isDir(join(effortDir, "tasks", slug)) || isDir(join(effortDir, "tickets", slug))) {
      throw new Error(`'${slug}' already exists in '${p.effort}' (its directory is there)`);
    }
    const blockedBy = Array.isArray(p.blocked_by) ? p.blocked_by.map(String) : [];
    for (const target of blockedBy) {
      if (target === slug) {
        throw new Error(`task '${slug}' cannot block on itself`);
      }
      const known = index.hits.find(
        (h) => h.art.type === "task" && h.art.slug === target && isInside(effortDir, h.path),
      );
      if (known === undefined) {
        throw new Error(
          `blocked_by target '${target}' is not an existing planning task in '${p.effort}': create the tasks ` +
            `in dependency order (edges are kind-scoped: tasks block tasks)`,
        );
      }
    }
    const data: FrontmatterData = {
      type: "task",
      subtype,
      title,
      status: "stable",
      workflow_state: "ready",
      blocked_by: blockedBy,
    };
    if (p.mode === "human") data.mode = "human";
    const taskDir = join(effortDir, "tasks", slug);
    const taskPath = join(taskDir, "task.md");
    mkdirSync(taskDir, { recursive: true });
    writeFileSync(
      taskPath,
      dump({
        data,
        body: typeof p.content === "string" && p.content.trim() !== "" ? normalizedBody(p.content) : "\n",
      }),
      "utf-8",
    );
    // A planning addition is a plan change: the ready flag clears, so any
    // post-reconcile task addition forces one more Wayfinder pass. Only a
    // present `true` is rewritten (absent stays absent).
    const cleared = clearReadyForSpec(mapHit.doc);
    if (cleared) writeFileSync(join(effortDir, "map.md"), dump(mapHit.doc), "utf-8");
    return `created ${relPosix(root, taskPath)} (${subtype})${cleared ? "; ready_for_spec cleared" : ""}`;
  },
);

export const tw_archive_effort: Tool = def(
  "Archive a finished effort: the named archive move, so no archive step needs git mv or the shell. " +
    "Checks the effort is finalizable (every task and ticket done; a spec implies at least one ticket), " +
    "marks the map and its done items status: deprecated (workflow_state stays done; the archived-effort " +
    "convention), moves docs/tasks/<effort>/ to docs/tasks/archive/<effort>/ as a unit, and updates the " +
    "root index (docs/tasks/index.md): the effort leaves ## Live and joins ## Archived, both sorted. " +
    "Refuses an effort that is not finalizable, an already-archived effort, a destination collision " +
    "(refused, never overwritten), and v3-shape artifacts.",
  { selector: Str("Effort slug, or the effort's map path") },
  async (p, ctx) => {
    const root = findRoot(ctx.directory);
    const { path, art } = resolveArt(root, p.selector, "map");
    requireV4Shape(art);
    const effortKey = effortDirOf(path);
    if (effortKey === null || effortKey.split(/[\\/]/)[0] === "archive") {
      throw new Error(`'${art.slug}' is not a live effort: it is archived or sits in no effort directory`);
    }
    const graph = graphForPath(effortGraphs(scanMemo(root)()), path);
    if (graph === null) {
      throw new Error(`'${art.slug}' sits in no effort graph; there is nothing coherent to archive`);
    }
    const reason = effortFinalizable(graph);
    if (reason !== null) {
      throw new Error(`cannot archive '${art.slug}': ${reason}`);
    }
    // The archive precondition: an effort does not archive while a finding
    // is undispositioned. The review artifact carries the findings and
    // their dispositions; its writer sets dispositioned: true when every
    // finding is resolved into a ticket, an accepted follow-up effort, or
    // an explicit informational acceptance (the same
    // producer-owns-the-check, consumer-owns-the-flag shape as
    // ready_for_spec). A superseded (deprecated) review no longer blocks.
    // The gate lives here, in the finalize-effort tooling, so the triage
    // can complete inside the open phase: a refused archive still has the
    // triage tools declared.
    const liveDir = join(taskRoot(root), effortKey);
    // The advisory end-of-effort review is an input to the finalize
    // review, not a gate: its writer is forbidden from dispositioning
    // findings, so counting it here would make every effort with an
    // advisory review unarchivable.
    const unDispositioned = scanMemo(root)().hits.filter(
      (h) =>
        isInside(liveDir, h.path) &&
        h.art.type === "review" &&
        h.art.status !== "deprecated" &&
        h.art.data.pass !== "end-of-effort" &&
        h.art.data.dispositioned !== true,
    );
    if (unDispositioned.length > 0) {
      throw new Error(
        `cannot archive '${effortKey}': ${unDispositioned.map((h) => relPosix(root, h.path)).join(", ")} ` +
          `carry undispositioned findings; disposition every finding (in-scope: an implementation ticket, ` +
          `out-of-scope: a follow-up effort after a human yes, informational: accepted) before archiving`,
      );
    }
    // The close reconcile is a prose step with no output of its own, so
    // the review artifact carries the tool-owned record of it. Without
    // this gate a close can archive a stale design record silently.
    const unreconciled = scanMemo(root)().hits.filter(
      (h) =>
        isInside(liveDir, h.path) &&
        h.art.type === "review" &&
        h.art.status !== "deprecated" &&
        h.art.data.pass !== "end-of-effort" &&
        typeof h.art.data.reconcile !== "string",
    );
    if (unreconciled.length > 0) {
      throw new Error(
        `cannot archive '${effortKey}': ${unreconciled.map((h) => relPosix(root, h.path)).join(", ")} ` +
          `carries no reconcile record; reconcile the living architecture against what landed, then record ` +
          `the outcome through tw_write_review with reconcile: 'done: <what changed>', 'none: <why>' or ` +
          `'unavailable: <reason>'`,
      );
    }
    const destDir = join(taskRoot(root), "archive", effortKey);
    if (existsSync(destDir)) {
      throw new Error(
        `archive destination '${relPosix(root, destDir)}' already exists: a collision is refused, never overwritten`,
      );
    }

    // 1. Deprecate the map and its done items (finalizability guarantees
    // every item is done). The spec keeps its status.
    const deprecate = (artifactPath: string): void => {
      const { doc } = parseArtifactFile(artifactPath);
      doc.data.status = "deprecated";
      writeFileSync(artifactPath, dump(doc), "utf-8");
    };
    deprecate(path);
    for (const item of [...graph.tasks, ...graph.tickets]) {
      if (item.path) deprecate(item.path);
    }

    // 2. The move, as a unit: non-artifact files (.work, findings) travel
    // with the effort.
    mkdirSync(dirname(destDir), { recursive: true });
    renameSync(liveDir, destDir);

    // 3. The root index: the effort leaves Live and joins Archived.
    const existingIndexPath = join(taskRoot(root), "index.md");
    const existing = isFile(existingIndexPath) ? parse(readText(existingIndexPath)).body : "";
    const indexPath = writeTasksIndex(root, {
      live: indexNames(existing, "Live").filter((n) => n !== effortKey),
      archived: [...indexNames(existing, "Archived"), effortKey],
    });

    // 4. The pointer: the archived effort is no longer the current map.
    // Without this the stale pointer survives the close and every later
    // read reports an archived effort as live.
    const state = loadState(root);
    const pointerNote =
      state.map === effortKey
        ? (() => {
            saveState(root, { ...state, map: null, task: null });
            return "; map pointer cleared";
          })()
        : "";

    return `archived '${effortKey}' to ${relPosix(root, destDir)}; index updated (${relPosix(root, indexPath)})${pointerNote}`;
  },
);
