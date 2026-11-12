/**
 * The ticket family: the ticket creator and splitter, the done and blocked markers,
 * the uncertainty resolver, the changelog writer, the two note writers, the
 * out-of-scope recorder, and the two planning-state tools.
 */

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve as resolvePath } from "node:path";
import { Type } from "typebox";
import { parse, dump, type Document, type FrontmatterData } from "../core/frontmatter.js";
import { slugRejection } from "../core/slug.js";
import { readMapSection, writeMapSection, effortDirOf, TICKET_SUBTYPES, type Artifact } from "../core/art.js";
import { effortGraphs } from "../core/graph.js";
import { isPointerName, POINTER_NAMES } from "../core/state.js";
import { OptBool, OptStr, ScanHit, Str, Tool, clearReadyForSpec, def, defStructured, directoryLeaf, findRoot, graphForPath, isDir, isFile, isInitialized, isInside, liveEffortDir, loadState, normalizedBody, outcome, parseArtifactFile, readText, relPosix, requireV4Shape, resolveArt, saveState, scanMemo, taskRoot } from "./support.js";


/**
 * The ticket half of the done-marking: the changelog entry lands before the
 * done-marking (the per-ticket close-out order), so the changelog must
 * reference the ticket as a stand-alone token, the same pointer convention
 * the planning half enforces against the map. A ticket done-marking is not a
 * plan change: ready_for_spec stays untouched.
 */
function markTicketDone(root: string, path: string, art: Artifact, doc: Document): string {
  const changelogPath = join(taskRoot(root), "CHANGELOG.md");
  if (!isFile(changelogPath)) {
    throw new Error(
      `'${art.slug}' cannot be marked done: the changelog (${relPosix(root, changelogPath)}) does not exist; ` +
        `write the ticket's changelog entry with tw_write_changelog first`,
    );
  }
  const changelogDoc = parse(readText(changelogPath));
  if (!referencesSlug(changelogDoc.body, art.slug)) {
    throw new Error(
      `'${art.slug}' cannot be marked done: the changelog has no entry for it yet; the changelog entry lands ` +
        `before the done-marking, so write it with tw_write_changelog (the entry must reference '${art.slug}') ` +
        `and mark the ticket done after`,
    );
  }
  doc.data.workflow_state = "done";
  writeFileSync(path, dump(doc), "utf-8");
  return `marked '${art.slug}' done (workflow_state: done)`;
}


/**
 * True when a body references the slug as a stand-alone token: the write-back
 * pointer convention (a short statement plus the task slug). A longer
 * hyphenated slug that merely contains this one is not a reference.
 */
function referencesSlug(body: string, slug: string): boolean {
  const escaped = slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^\\w-])${escaped}(?![\\w-])`).test(body);
}


/** The ticket-doc section the implementation-notes writer owns. */
const IMPLEMENTATION_NOTES_SECTION = "Implementation notes";


/** The planning-task section the task-notes writer owns. */
const PLANNING_NOTES_SECTION = "Notes";


const TICKET_SIZES = ["s", "m", "l", "xl"] as const;


/**
 * The ticket frontmatter the v5 ticket writers agree on: stable and ready,
 * so a created or split ticket sits on the frontier its blockers allow.
 * Edges are kind-scoped and effort-scoped: only existing tickets of the same
 * effort are legal targets.
 */
interface TicketSeed {
  slug: string;
  title: string;
  subtype: string;
  size?: string;
  mode?: string;
  blocked_by: string[];
  content?: string;
}


function ticketDocument(seed: TicketSeed): Document {
  const data: FrontmatterData = {
    type: "ticket",
    subtype: seed.subtype,
    title: seed.title,
    status: "stable",
    workflow_state: "ready",
    blocked_by: [...seed.blocked_by],
  };
  if (seed.size !== undefined) data.size = seed.size;
  if (seed.mode !== undefined) data.mode = seed.mode;
  return { data, body: seed.content !== undefined ? normalizedBody(seed.content) : "\n" };
}


/**
 * Validate one created ticket's shape: slug, title, subtype, size, and mode.
 * Throws with the offending field named. blocked_by is validated against the
 * effort's scanned tickets by the caller (it needs the scan).
 */
function validateTicketSeed(seed: TicketSeed): void {
  const rejection = slugRejection(seed.slug);
  if (rejection !== null) {
    throw new Error(`invalid slug '${seed.slug}': ${rejection}`);
  }
  if (typeof seed.title !== "string" || seed.title.trim() === "") {
    throw new Error(`ticket '${seed.slug}' has no title`);
  }
  if (!(TICKET_SUBTYPES as readonly string[]).includes(seed.subtype)) {
    throw new Error(`invalid subtype '${seed.subtype}': a ticket is '${TICKET_SUBTYPES.join("' or '")}'`);
  }
  if (seed.size !== undefined && !(TICKET_SIZES as readonly string[]).includes(seed.size)) {
    throw new Error(`invalid size '${seed.size}': use ${TICKET_SIZES.join(" | ")} (absent means m)`);
  }
  if (seed.mode !== undefined && seed.mode !== "human") {
    throw new Error(`invalid mode '${seed.mode}': the only mode value is 'human'; omit it otherwise`);
  }
}


export const tw_add_ticket: Tool = def(
  "Create an implementation ticket at docs/tasks/<effort>/tickets/<slug>/ticket.md: the only ticket " +
    "creator, writing through the frontmatter seam. Writes type: ticket with the given subtype (feature " +
    "or bug), status: stable, workflow_state: ready, and validates blocked_by at creation (kind-scoped: " +
    "only existing tickets of the same effort; create in dependency order, no second wiring pass). " +
    "Refuses an unsafe or duplicate slug, a size or mode outside the schema, a blocked_by edge that " +
    "dangles or crosses the kind, and an effort with no map or spec anchor.",
  {
    effort: Str("The effort slug the ticket lands in"),
    slug: Str("The ticket slug (lowercase letters, digits, hyphens)"),
    title: Str("The ticket title"),
    subtype: { type: "string" as const, enum: [...TICKET_SUBTYPES], description: "feature or bug" },
    size: { type: "string" as const, optional: true, enum: [...TICKET_SIZES], description: "s | m | l | xl; absent means m" },
    mode: OptStr("'human' when the human must implement it; omit otherwise"),
    blocked_by: { type: "array" as const, items: { type: "string" as const }, optional: true, description: "Ticket slugs in the same effort that must be done first" },
    content: OptStr("The ticket body (what to build)"),
  },
  async (p, ctx) => {
    const root = findRoot(ctx.directory);
    const seed: TicketSeed = {
      slug: String(p.slug ?? ""),
      title: typeof p.title === "string" ? p.title : "",
      subtype: String(p.subtype ?? ""),
      size: typeof p.size === "string" ? p.size : undefined,
      mode: typeof p.mode === "string" ? p.mode : undefined,
      blocked_by: Array.isArray(p.blocked_by) ? p.blocked_by.map(String) : [],
      content: typeof p.content === "string" ? p.content : undefined,
    };
    validateTicketSeed(seed);

    const effortDir = liveEffortDir(root, p.effort);
    if (effortDir === null) {
      throw new Error(`no live effort '${p.effort}': create the effort (a map at docs/tasks/<effort>/map.md) before adding tickets`);
    }
    const anchor = directoryLeaf(effortDir, "map") ?? directoryLeaf(effortDir, "spec");
    if (anchor === null) {
      throw new Error(
        `effort '${p.effort}' has neither a map nor a spec: adding a ticket there would orphan it in the graph`,
      );
    }
    requireV4Shape(parseArtifactFile(anchor).art);

    const index = scanMemo(root)();
    const inEffort = (path: string): boolean => isInside(effortDir, path);
    const clash = index.hits.find((h) => h.art.slug === seed.slug && inEffort(h.path));
    if (clash !== undefined) {
      throw new Error(`'${seed.slug}' already exists in '${p.effort}' (${clash.art.type} at ${relPosix(root, clash.path)})`);
    }
    if (isDir(join(effortDir, "tickets", seed.slug))) {
      throw new Error(`'${seed.slug}' already exists in '${p.effort}' (its ticket directory is there)`);
    }

    for (const target of seed.blocked_by) {
      if (target === seed.slug) {
        throw new Error(`ticket '${seed.slug}' cannot block on itself`);
      }
      const known = index.hits.find(
        (h) => h.art.type === "ticket" && h.art.slug === target && inEffort(h.path),
      );
      if (known === undefined) {
        throw new Error(
          `blocked_by target '${target}' is not an existing ticket in '${p.effort}': create the tickets in ` +
            `dependency order (edges are kind-scoped: tickets block tickets)`,
        );
      }
    }

    const ticketDir = join(effortDir, "tickets", seed.slug);
    const ticketPath = join(ticketDir, "ticket.md");
    mkdirSync(ticketDir, { recursive: true });
    writeFileSync(ticketPath, dump(ticketDocument(seed)), "utf-8");
    const sizeNote = seed.size !== undefined ? `, size: ${seed.size}` : "";
    return `created ${relPosix(root, ticketPath)} (${seed.subtype}${sizeNote})`;
  },
);


export const tw_split_ticket: Tool = defStructured(
  "Split a ticket into sub-tickets: the escape hatch that decomposes a failed or oversized ticket " +
    "instead of ad-hoc files. Creates each sub-ticket (inheriting the original's subtype and blocked_by " +
    "edges, chaining between subs through per-sub blocked_by) and supersedes the original as deprecated " +
    "plus done with a body note naming its sub-tickets, so the graph absorbs the split and the history " +
    "reads. Refuses an original that is already done or deprecated, duplicate or unsafe sub slugs, sub " +
    "edges that dangle or name the superseded original, and v3-shape artifacts.",
  Type.Object({
    selector: Type.String({ description: "The original ticket slug or path" }),
    subtickets: Type.Array(
      Type.Object({
        slug: Type.String({ description: "The sub-ticket slug (lowercase letters, digits, hyphens)" }),
        title: Type.String({ description: "The sub-ticket title" }),
        size: Type.Optional(
          Type.Union(TICKET_SIZES.map((s) => Type.Literal(s)), { description: "s | m | l | xl; absent means m" }),
        ),
        blocked_by: Type.Optional(
          Type.Array(
            Type.String({ description: "Extra edges: sibling sub slugs (sequential work) or other tickets of the effort" }),
          ),
        ),
        content: Type.Optional(Type.String({ description: "The sub-ticket body (what to build)" })),
      }),
      { description: "The sub-tickets that replace the original" },
    ),
  }),
  async (p, ctx) => {
    const root = findRoot(ctx.directory);
    const subs: TicketSeed[] = (Array.isArray(p.subtickets) ? p.subtickets : []).map((raw: any) => ({
      slug: String(raw?.slug ?? ""),
      title: typeof raw?.title === "string" ? raw.title : "",
      subtype: "",
      size: typeof raw?.size === "string" ? raw.size : undefined,
      blocked_by: Array.isArray(raw?.blocked_by) ? raw.blocked_by.map(String) : [],
      content: typeof raw?.content === "string" ? raw.content : undefined,
    }));
    if (subs.length === 0) {
      throw new Error("a split needs at least one sub-ticket");
    }

    const original = resolveArt(root, p.selector, "ticket");
    requireV4Shape(original.art);
    if (original.art.status === "deprecated") {
      throw new Error(`'${original.art.slug}' is deprecated; deprecated counts as done`);
    }
    if (original.art.workflow_state === "done") {
      throw new Error(`'${original.art.slug}' is already done; there is no work left to split`);
    }
    const effortKey = effortDirOf(original.path ?? "");
    if (effortKey === null || effortKey.split(/[\\/]/)[0] === "archive") {
      throw new Error(`'${original.art.slug}' sits in no live effort; splits happen in a live effort`);
    }
    const effortDir = dirname(dirname(dirname(resolvePath(original.path!))));
    const inheritedSubtype = original.art.subtype ?? "feature";
    for (const sub of subs) {
      validateTicketSeed({ ...sub, subtype: inheritedSubtype });
    }

    const index = scanMemo(root)();
    const inEffort = (path: string): boolean => isInside(effortDir, path);
    const siblingSlugs = new Set<string>();
    for (const sub of subs) {
      if (siblingSlugs.has(sub.slug)) {
        throw new Error(`duplicate sub-ticket slug '${sub.slug}' in the split`);
      }
      siblingSlugs.add(sub.slug);
      if (sub.slug === original.art.slug) {
        throw new Error(`'${sub.slug}' is the superseded original; a sub-ticket needs a new slug`);
      }
      const clash = index.hits.find((h) => h.art.slug === sub.slug && inEffort(h.path));
      if (clash !== undefined) {
        throw new Error(`'${sub.slug}' already exists in the effort (${clash.art.type} at ${relPosix(root, clash.path)})`);
      }
    }
    for (const sub of subs) {
      for (const target of sub.blocked_by) {
        if (siblingSlugs.has(target)) continue;
        if (target === original.art.slug) {
          throw new Error(
            `'${target}' is superseded by this split; its slug cannot be an edge target`,
          );
        }
        const known = index.hits.find(
          (h) => h.art.type === "ticket" && h.art.slug === target && inEffort(h.path),
        );
        if (known === undefined) {
          throw new Error(
            `blocked_by target '${target}' is not an existing ticket in the effort: edges are kind-scoped, tickets block tickets`,
          );
        }
      }
    }

    const created: string[] = [];
    for (const sub of subs) {
      const seed: TicketSeed = {
        ...sub,
        subtype: inheritedSubtype,
        // The sub-tickets inherit the original's edges and chain between
        // themselves through the caller's per-sub blocked_by.
        blocked_by: [...new Set([...original.art.blocked_by, ...sub.blocked_by])],
      };
      const ticketDir = join(effortDir, "tickets", sub.slug);
      const ticketPath = join(ticketDir, "ticket.md");
      mkdirSync(ticketDir, { recursive: true });
      writeFileSync(ticketPath, dump(ticketDocument(seed)), "utf-8");
      created.push(relPosix(root, ticketPath));
    }

    original.doc.data.status = "deprecated";
    original.doc.data.workflow_state = "done";
    original.doc.body = `${original.doc.body.replace(/\n+$/, "")}\n\nSuperseded by ${subs.map((s) => s.slug).join(", ")}.\n`;
    writeFileSync(original.path!, dump(original.doc), "utf-8");

    return outcome(
      `split '${original.art.slug}': created ${created.join(", ")}; original superseded (status: deprecated, workflow_state: done).`,
      { original: original.art.slug, created, supersededBy: subs.map((s) => s.slug) },
    );
  },
);


export const tw_mark_done: Tool = def(
  "Mark a planning task or an implementation ticket done (workflow_state: done). Both refuse items that " +
    "are already done or deprecated (deprecated counts as done). A planning task refuses when its recorded " +
    "results were not written back to its effort's map first: the map must reference the task, which a " +
    "tw_write_section write-back does; the planning done-marking clears ready_for_spec, so the next " +
    "Wayfinder pass re-runs the reconcile. An implementation ticket refuses when the changelog has no entry " +
    "referencing it yet: the changelog entry lands before the done-marking (write it with tw_write_changelog), " +
    "and a ticket done-marking is not a plan change, so it leaves ready_for_spec alone.",
  { selector: Str("Planning task or ticket slug or path") },
  async (p, ctx) => {
    const root = findRoot(ctx.directory);
    // Tasks take precedence when a slug could name either kind, so the
    // planning half's resolution behavior is unchanged.
    let hit: ScanHit;
    try {
      hit = resolveArt(root, p.selector, "task");
    } catch (taskError) {
      try {
        hit = resolveArt(root, p.selector, "ticket");
      } catch {
        throw taskError;
      }
    }
    const { path, art, doc } = hit;
    requireV4Shape(art);
    if (art.status === "deprecated") {
      throw new Error(`'${art.slug}' is deprecated; deprecated counts as done`);
    }
    if (art.workflow_state === "done") {
      throw new Error(`'${art.slug}' is already done`);
    }
    if (art.type === "ticket") {
      return markTicketDone(root, path, art, doc);
    }
    const mapArt = graphForPath(effortGraphs(scanMemo(root)()), path)?.map ?? null;
    if (mapArt === null || !mapArt.path) {
      throw new Error(
        `'${art.slug}' sits in an effort with no map; there is no map its recorded results could have been written back to`,
      );
    }
    const mapDoc = parseArtifactFile(mapArt.path).doc;
    if (!referencesSlug(mapDoc.body, art.slug)) {
      throw new Error(
        `'${art.slug}' cannot be marked done: its recorded results were not written back to the map first; ` +
          `write them with tw_write_section (the map must reference '${art.slug}') before marking done`,
      );
    }
    doc.data.workflow_state = "done";
    const cleared = clearReadyForSpec(mapDoc);
    if (cleared) writeFileSync(mapArt.path, dump(mapDoc), "utf-8");
    writeFileSync(path, dump(doc), "utf-8");
    return `marked '${art.slug}' done (workflow_state: done)${cleared ? "; ready_for_spec cleared" : ""}`;
  },
);


export const tw_mark_blocked: Tool = def(
  "Mark a planning task blocked (workflow_state: blocked) and record the reason in the task body: the " +
    "named write for a task that cannot complete yet (missing evidence, a pending human or environment " +
    "prerequisite). Re-blocking replaces the recorded reason. Refuses an empty reason, a task that is " +
    "already done or deprecated (blocking must not resurrect finished work), tickets (this marks planning " +
    "tasks), and v3-shape artifacts.",
  {
    selector: Str("Planning task slug or path"),
    reason: Str("Why the task is blocked and what would unblock it"),
  },
  async (p, ctx) => {
    const root = findRoot(ctx.directory);
    const reason = typeof p.reason === "string" ? p.reason.trim() : "";
    if (reason === "") {
      throw new Error("reason is empty: a blocked marking states what would unblock the task");
    }
    const { path, art, doc } = resolveArt(root, p.selector, "task");
    requireV4Shape(art);
    if (art.status === "deprecated") {
      throw new Error(`'${art.slug}' is deprecated; deprecated counts as done`);
    }
    if (art.workflow_state === "done") {
      throw new Error(`'${art.slug}' is already done; a done task cannot be marked blocked`);
    }
    doc.data.workflow_state = "blocked";
    // The reason is tool-owned: replace any previous Blocked line so a
    // re-blocking updates the record instead of accumulating lines.
    const kept = doc.body.split("\n").filter((line) => !/^Blocked: /.test(line));
    while (kept.length > 0 && kept[kept.length - 1].trim() === "") kept.pop();
    doc.body = `${kept.join("\n")}\n\nBlocked: ${reason}\n`;
    writeFileSync(path, dump(doc), "utf-8");
    return `marked '${art.slug}' blocked (workflow_state: blocked)`;
  },
);


export const tw_resolve_uncertainty: Tool = def(
  "Record a ticket's uncertainty resolution: writes the resolution next to the ticket's .work/uncertainty.md, deletes the uncertainty file, and returns the resolution path for the re-run pointer. Refuses when the ticket has no uncertainty file, so it can never serve as a generic writer.",
  { selector: Str("Ticket slug or path"), resolution: Str("The resolution text to record") },
  async (p, ctx) => {
    const root = findRoot(ctx.directory);
    if (!p.resolution.trim()) throw new Error("resolution text is empty");
    const { path, art } = resolveArt(root, p.selector, "ticket");
    const workDir = join(dirname(path), ".work");
    const uncertaintyPath = join(workDir, "uncertainty.md");
    if (!isFile(uncertaintyPath)) {
      throw new Error(`no uncertainty to resolve for ticket '${art.slug}': ${relPosix(root, uncertaintyPath)} does not exist`);
    }
    const resolutionPath = join(workDir, "resolution.md");
    writeFileSync(resolutionPath, `${p.resolution.trim()}\n`, "utf-8");
    rmSync(uncertaintyPath);
    return relPosix(root, resolutionPath);
  },
);


export const tw_write_changelog: Tool = def(
  "Append a changelog entry to docs/tasks/CHANGELOG.md: the only writer of the changelog. The entry " +
    "heading is '## <date>, <title> (<slug>)' and it lands on top of the dated-entry region (below any " +
    "release block), so the newest entry reads first; the entry must reference its ticket slug, which is " +
    "what the ticket done-marking checks. Creates the changelog with conformant frontmatter when missing. " +
    "Refuses a duplicate entry for the same slug, an empty slug, title, or content, and a date outside " +
    "YYYY-MM-DD.",
  {
    slug: Str("The ticket slug the entry records"),
    title: Str("The entry title (usually the ticket title)"),
    content: Str("The entry body: the key changes and decisions, and the outcome"),
    date: OptStr("The entry date (YYYY-MM-DD); today when absent"),
  },
  async (p, ctx) => {
    const root = findRoot(ctx.directory);
    const slug = String(p.slug ?? "").trim();
    const rejection = slugRejection(slug);
    if (rejection !== null) {
      throw new Error(`invalid slug '${slug}': ${rejection}`);
    }
    const title = typeof p.title === "string" ? p.title.trim() : "";
    if (title === "") throw new Error("title is empty: an entry names what landed");
    const content = typeof p.content === "string" ? p.content.trim() : "";
    if (content === "") throw new Error("content is empty: an entry states the changes and the outcome");
    const date =
      typeof p.date === "string" && p.date.trim() !== "" ? p.date.trim() : new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error(`invalid date '${date}': use YYYY-MM-DD`);
    }
    const heading = `## ${date}, ${title} (${slug})`;
    const entryLines = [heading, "", ...content.split("\n")];

    const changelogPath = join(taskRoot(root), "CHANGELOG.md");
    const doc: Document = isFile(changelogPath)
      ? parse(readText(changelogPath))
      : { data: { type: "changelog", title: "Task Changelog" }, body: "\n# Task Changelog\n" };

    const escaped = slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`^## .*\\(${escaped}\\)\\s*$`, "m").test(doc.body)) {
      throw new Error(`the changelog already has an entry for '${slug}': one entry per landed ticket`);
    }

    const lines = doc.body.split("\n");
    const firstDated = lines.findIndex((line) => /^## \d{4}-\d{2}-\d{2},/.test(line));
    if (firstDated === -1) {
      while (lines.length > 0 && lines[lines.length - 1].trim() === "") lines.pop();
      doc.body = [...lines, "", ...entryLines, ""].join("\n");
    } else {
      lines.splice(firstDated, 0, "", ...entryLines, "");
      doc.body = lines.join("\n");
    }
    writeFileSync(changelogPath, dump(doc), "utf-8");
    return `wrote ${relPosix(root, changelogPath)}: ${heading}`;
  },
);


export const tw_write_task_note: Tool = def(
  "Write the '## Notes' section of a planning task doc: the named writer for the record a planning " +
    "task leaves behind (a grilling's settled answers and rejected options, a research task's findings). " +
    "Appends the note to the existing section, or replaces it with 'replace: true'. Built-in write and " +
    "edit are refused under docs/tasks/, so this is the only legal path for a task body. Refuses an " +
    "empty note, a selector that is not a planning task, and a task in an archived effort.",
  {
    selector: Str("Task slug or path"),
    note: Str("The note text: the settled record the task leaves behind (markdown)"),
    replace: OptBool,
  },
  async (p, ctx) => {
    const root = findRoot(ctx.directory);
    const note = typeof p.note === "string" ? p.note.trim() : "";
    if (note === "") throw new Error("note is empty: a task note states the record it leaves behind");
    const { path, art, doc } = resolveArt(root, p.selector);
    if (art.type !== "task") {
      throw new Error(
        `'${p.selector}' is not a planning task (found type '${art.type}'): a ticket's notes go through ` +
          `tw_write_ticket_note, a map section through tw_write_section`,
      );
    }
    const treeRel = relPosix(taskRoot(root), path);
    if (treeRel.split(/[\\/]/)[0] === "archive") {
      throw new Error(
        `'${p.selector}' is an archived task: a planning record belongs to a live effort`,
      );
    }
    const existing = p.replace === true ? [] : readMapSection(doc.body, PLANNING_NOTES_SECTION) ?? [];
    const content = existing.length > 0 ? [...existing, "", ...note.split("\n")].join("\n") : note;
    doc.body = writeMapSection(doc.body, PLANNING_NOTES_SECTION, content);
    writeFileSync(path, dump(doc), "utf-8");
    return `wrote '## ${PLANNING_NOTES_SECTION}' in ${relPosix(root, path)}`;
  },
);


export const tw_write_ticket_note: Tool = def(
  "Write the '## Implementation notes' section of a ticket doc: the only writer of that section, and " +
    "the named writer that replaces the built-in edit on a ticket path. Appends the note to the " +
    "existing section (a plain `- ` paragraph per landing), or replaces the section with 'replace: " +
    "true'. Refuses an empty note, a selector that is not a ticket, and a ticket in an archived " +
    "effort: the note is part of a live effort's record.",
  {
    selector: Str("Ticket slug or path"),
    note: Str("The note text: the implementation lesson the landing leaves behind"),
    replace: OptBool,
  },
  async (p, ctx) => {
    const root = findRoot(ctx.directory);
    const note = typeof p.note === "string" ? p.note.trim() : "";
    if (note === "") throw new Error("note is empty: a ticket note states the lesson it records");
    const { path, art, doc } = resolveArt(root, p.selector);
    if (art.type !== "ticket") {
      throw new Error(
        `'${p.selector}' is not a ticket (found type '${art.type}'): the implementation-notes writer ` +
          `writes ticket docs only`,
      );
    }
    const treeRel = relPosix(taskRoot(root), path);
    if (treeRel.split(/[\\/]/)[0] === "archive") {
      throw new Error(
        `'${p.selector}' is an archived ticket: implementation notes belong to a live effort's record`,
      );
    }
    const existing = p.replace === true ? [] : readMapSection(doc.body, IMPLEMENTATION_NOTES_SECTION) ?? [];
    const content = existing.length > 0 ? [...existing, "", ...note.split("\n")].join("\n") : note;
    doc.body = writeMapSection(doc.body, IMPLEMENTATION_NOTES_SECTION, content);
    writeFileSync(path, dump(doc), "utf-8");
    return `wrote '## ${IMPLEMENTATION_NOTES_SECTION}' in ${relPosix(root, path)}`;
  },
);


export const tw_record_out_of_scope: Tool = def(
  "Record a consciously ruled-out request in the global out-of-scope knowledge base " +
    "(docs/tasks/out-of-scope/<slug>.md) and update its index: the escape hatch that keeps a rejected ask " +
    "from being re-debated. The note carries the request and the reason it was ruled out; the index lists " +
    "one bullet per note, sorted by slug, and is created with the bundle's index frontmatter when missing. " +
    "Refuses a duplicate slug, an empty request or reason (a rejection without a reason is not a record), " +
    "and an unsafe slug.",
  {
    slug: Str("The note slug (the filename without .md)"),
    title: Str("The note title (the request in a few words)"),
    request: Str("The request that was ruled out"),
    reason: Str("Why it was ruled out"),
  },
  async (p, ctx) => {
    const root = findRoot(ctx.directory);
    const slug = String(p.slug ?? "").trim();
    const rejection = slugRejection(slug);
    if (rejection !== null) {
      throw new Error(`invalid slug '${slug}': ${rejection}`);
    }
    const title = typeof p.title === "string" ? p.title.trim() : "";
    if (title === "") throw new Error("title is empty: a note names the request");
    const request = typeof p.request === "string" ? p.request.trim() : "";
    if (request === "") throw new Error("request is empty: a note states the request it records");
    const reason = typeof p.reason === "string" ? p.reason.trim() : "";
    if (reason === "") throw new Error("reason is empty: a rejection without a reason is not a record");

    const kbDir = join(taskRoot(root), "out-of-scope");
    const notePath = join(kbDir, `${slug}.md`);
    if (isFile(notePath)) {
      throw new Error(`'${slug}' is already recorded in the out-of-scope KB: the same no is not recorded twice`);
    }
    const note: Document = {
      data: { type: "out-of-scope note", title, status: "stable" },
      body: `\n## Request\n\n${request}\n\n## Reason\n\n${reason}\n`,
    };
    mkdirSync(kbDir, { recursive: true });
    writeFileSync(notePath, dump(note), "utf-8");

    const indexPath = join(kbDir, "index.md");
    const indexDoc: Document = isFile(indexPath)
      ? parse(readText(indexPath))
      : { data: { type: "out-of-scope note", title: "out-of-scope", status: "stable" }, body: "\n# out-of-scope\n" };
    const existing = (readMapSection(indexDoc.body, "Notes") ?? []).filter((l) => l.trim() !== "");
    const bullets = [...existing, `- [${title}](${slug}.md)`];
    const slugOf = (line: string): string => /\]\((.+)\.md\)\s*$/.exec(line)?.[1] ?? line;
    bullets.sort((a, b) => slugOf(a).localeCompare(slugOf(b)));
    indexDoc.body = writeMapSection(indexDoc.body, "Notes", bullets.join("\n"));
    writeFileSync(indexPath, dump(indexDoc), "utf-8");
    return `recorded ${relPosix(root, notePath)} and updated ${relPosix(root, indexPath)}`;
  },
);


export const tw_state: Tool = def(
  "Show the current workflow state (map and task pointers) from state.yaml.",
  {},
  async (_p, ctx) => {
    const root = findRoot(ctx.directory);
    const s = loadState(root);
    return [
      `map:  ${s.map ?? "(none)"}`,
      `task: ${s.task ?? "(none)"}`,
    ].join("\n");
  },
);


export const tw_state_set: Tool = def(
  `Set a workflow state field (${POINTER_NAMES.join(" or ")}). Use 'null' to clear.`,
  { field: Str(`Field: ${POINTER_NAMES.map((n) => `'${n}'`).join(" or ")}`), value: Str("New value (or 'null')") },
  async (p, ctx) => {
    const root = findRoot(ctx.directory);
    const allowed = POINTER_NAMES.map((n) => `'${n}'`).join(" or ");
    if (!isPointerName(p.field)) {
      throw new Error(`unknown field '${p.field}': use ${allowed}`);
    }
    if (p.value === "None") {
      throw new Error(`invalid pointer value 'None': use 'null' to clear '${p.field}'`);
    }
    if (!isInitialized(root)) mkdirSync(taskRoot(root), { recursive: true });
    const s = loadState(root);
    const v = p.value === "null" ? null : p.value;
    if (p.field === "map") s.map = v;
    else s.task = v;
    saveState(root, s);
    return `${p.field} = ${v ?? "null"}`;
  },
);
