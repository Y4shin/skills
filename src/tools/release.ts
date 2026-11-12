/**
 * The release family: the changeset writer and the release plan and apply pair, with
 * the text builders their results are reported through.
 */

import { Type } from "typebox";
import { applyRelease, planRelease, proposeEntries, writeEntries, type ChangeLevel, type ChangesetEntry, type ChangesetsRefusalCode, type ReleaseRead, type ReleaseRefusalCode, type ReleaseWrite } from "../core/changesets.js";
import { Tool, defStructured, outcome, refusedOuttext } from "./support.js";

/**
 * The one legal next call for a refused changeset write, per named outcome.
 * Each refusal says what to do so the caller can perform it and retry: create
 * the missing config, name a real package, use a real level.
 */
function changesetLegalNext(code: ChangesetsRefusalCode): string {
  switch (code) {
    case "no-workspace":
      return "retry tw_write_changesets from the repository root";
    case "no-config":
      return "run 'npx changeset init' in the repository, then retry tw_write_changesets";
    case "invalid-config":
      return "fix .changeset/config.json, then retry tw_write_changesets";
    case "unreadable-staged":
      return "fix or remove the unreadable changeset file in .changeset, then retry tw_write_changesets";
    case "unknown-package":
      return "retry tw_write_changesets with a package name from the workspace list in the refusal";
    case "invalid-level":
      return "retry tw_write_changesets with patch, minor, or major";
    case "no-root-package":
      return "retry tw_write_changesets naming a workspace package explicitly";
  }
}

/**
 * The one legal next call for a refused release, per named outcome. Each
 * refusal says what to do so the caller can do it and retry, and the empty
 * plan says what it is: nothing to release, which is reported, not worked
 * around.
 */
function releaseLegalNext(code: ReleaseRefusalCode): string {
  switch (code) {
    case "no-workspace":
      return "retry tw_release_plan from a repository root whose package.json names the package";
    case "no-version":
      return "add a version to the package.json the refusal names, then retry tw_release_plan";
    case "no-config":
      return "run 'npx changeset init' in the repository, then retry tw_release_plan";
    case "invalid-config":
      return "fix .changeset/config.json, then retry tw_release_plan";
    case "unreadable-staged":
      return "fix or remove the unreadable changeset file in .changeset, then retry tw_release_plan";
    case "unknown-package":
      return "fix the changeset frontmatter to name a package from the workspace list in the refusal, then retry tw_release_plan";
    case "empty-plan":
      return "report that there is nothing to release and stop; tw_write_changesets stages an entry when there is one";
    case "plan-failed":
      return "fix what the refusal names in .changeset/config.json, then retry tw_release_plan";
  }
}

/** The structured half of a release result: the plan, and what a write touched. */
function releaseDetails(
  release: ReleaseRead,
  files: { written: string[]; removed: string[] } = { written: [], removed: [] },
): Record<string, unknown> {
  return {
    refusal: release.refusal,
    entries: release.entries,
    versions: release.versions,
    changelog: release.changelog,
    written: files.written,
    removed: files.removed,
    diagnostics: release.diagnostics,
  };
}

/** The versions, then each section, in the shape both release tools report. */
function releaseVersionLines(release: ReleaseRead): string[] {
  const lines = release.versions.map(
    (version) => `- ${version.name} ${version.oldVersion} -> ${version.newVersion} (${version.level})`,
  );
  return lines.length > 0 ? lines : ["- nothing: no package would move"];
}

/** The plan's text: what would be versioned, and the sections it would write. */
function releasePlanText(plan: ReleaseRead): string {
  const lines: string[] = ["Release plan:", "Pending changesets:"];
  for (const entry of plan.entries) {
    const releases = entry.releases.map((release) => `${release.package} ${release.level}`).join(", ");
    lines.push(`- ${entry.id}: ${entry.summary} (${releases})`);
  }
  lines.push("Versions:", ...releaseVersionLines(plan));
  for (const section of plan.changelog) {
    lines.push(`Changelog section for ${section.file}:`, section.text);
  }
  lines.push("Nothing has been written: call tw_release_apply once the operator confirms this release.");
  if (plan.diagnostics.length > 0) lines.push(`Diagnostics: ${plan.diagnostics.join("; ")}`);
  return lines.join("\n");
}

/** The apply's text: what moved, what it wrote, what it consumed. */
function releaseApplyText(applied: ReleaseWrite): string {
  const lines: string[] = ["Released:", ...releaseVersionLines(applied)];
  for (const file of applied.written) lines.push(`Wrote ${file}`);
  for (const file of applied.removed) lines.push(`Removed ${file}`);
  for (const section of applied.changelog) {
    lines.push(`Changelog section in ${section.file}:`, section.text);
  }
  if (applied.diagnostics.length > 0) lines.push(`Diagnostics: ${applied.diagnostics.join("; ")}`);
  return lines.join("\n");
}

// ── the changeset writer: the effort close's named writer ──

export const tw_write_changesets: Tool = defStructured(
  "Write the effort's pending changeset entries under .changeset/, in the changesets tool's own format " +
    "and with formatting disabled. Call it from the effort close after the operator confirms the proposed " +
    "entries: one entry per change a user of the package or product can observe, each naming a workspace " +
    "package, a level (patch, minor, major), and the summary that becomes the entry body. An effort with " +
    "nothing observable proposes the generic performance and stability patch instead, and an identical " +
    "entry already staged is not repeated. Refuses, writing nothing, when the repository has no " +
    "`.changeset/config.json`, when a package name is not in the workspace, and when a level is not one " +
    "of the three. Pass dry_run for the proposal: it answers with the entries it would write, the entries " +
    "already staged that it would not repeat, and whether the generic entry applies, and it writes " +
    "nothing, so the close can show the operator what it is about to write.",
  Type.Object({
    effort: Type.String({ description: "The effort the entries belong to" }),
    entries: Type.Optional(
      Type.Array(
        Type.Object({
          package: Type.String({ description: "The workspace package name the entry versions" }),
          level: Type.String({ description: "The bump level: patch, minor, or major" }),
          summary: Type.String({ description: "The entry body: what a user can observe" }),
        }),
      ),
    ),
    dry_run: Type.Optional(
      Type.Boolean({
        description: "Return the proposal without writing anything, for the operator to confirm first",
      }),
    ),
  }),
  async (p, ctx) => {
    const effort = typeof p.effort === "string" ? p.effort.trim() : "";
    if (effort === "") throw new Error("tw_write_changesets needs a non-empty effort");
    const dryRun = p.dry_run === true;
    const requested: ChangesetEntry[] = (Array.isArray(p.entries) ? p.entries : []).map((entry: any) => ({
      package: typeof entry?.package === "string" ? entry.package.trim() : "",
      level: (typeof entry?.level === "string" ? entry.level.trim() : "") as ChangeLevel,
      summary: typeof entry?.summary === "string" ? entry.summary.trim() : "",
    }));
    // One resolution answers both surfaces: the dry run is the same
    // workspace read, config read, validation, generic fallback, and
    // dedupe, stopped before the write, so the proposal cannot describe a
    // different set of entries than the write would land.
    const resolved = dryRun
      ? await proposeEntries(ctx.directory, { changes: requested })
      : await writeEntries(ctx.directory, { entries: requested });
    if (resolved.refusal !== null) {
      const { reason, code } = resolved.refusal;
      return outcome(refusedOuttext(reason, [changesetLegalNext(code)]), {
        effort,
        dry_run: dryRun,
        refusal: resolved.refusal,
        written: [],
        entries: [],
        skipped: [],
        generic: false,
        diagnostics: resolved.diagnostics,
      });
    }
    // The outcome names which one it is, so the write-only field is read
    // only after the discriminant narrows to the write outcome.
    const written = resolved.kind === "write" ? resolved.written : [];
    const lines: string[] = [];
    if (resolved.generic) {
      lines.push(
        `Nothing a user can observe in effort '${effort}': the generic performance and stability patch ` +
          (dryRun ? "is the proposed entry." : "is the entry."),
      );
    } else if (dryRun) {
      lines.push(`Proposed changesets for effort '${effort}', nothing written yet:`);
    } else {
      lines.push(`Changesets for effort '${effort}':`);
    }
    for (const entry of resolved.entries) lines.push(`- ${entry.package} ${entry.level}: ${entry.summary}`);
    for (const entry of resolved.skipped) {
      lines.push(`Already staged, not repeated: ${entry.package} ${entry.level}: ${entry.summary}`);
    }
    for (const file of written) lines.push(`Wrote ${file}`);
    if (dryRun) {
      lines.push(
        resolved.entries.length === 0
          ? "Nothing to write: every proposed entry is already staged."
          : "Call tw_write_changesets again, without dry_run, once the operator confirms these entries.",
      );
    } else if (written.length === 0) {
      lines.push(
        resolved.skipped.length > 0
          ? "Nothing to write: every proposed entry is already staged."
          : "Nothing to write.",
      );
    }
    if (resolved.diagnostics.length > 0) lines.push(`Diagnostics: ${resolved.diagnostics.join("; ")}`);
    return outcome(lines.join("\n"), {
      effort,
      dry_run: dryRun,
      refusal: null,
      written,
      entries: resolved.entries,
      skipped: resolved.skipped,
      generic: resolved.generic,
      diagnostics: resolved.diagnostics,
    });
  },
);

// ── the release: the plan, then the write ──

export const tw_release_plan: Tool = defStructured(
  "Compute the release plan for the repository in the session directory: the pending changesets, the " +
    "version each package moves to, and the changelog section each release adds. Writes nothing, so it " +
    "is the preview: report the plan, and call tw_release_apply once the operator confirms it. The " +
    "changelog renders through the standalone changelog package whatever specifier the repository's " +
    "config names, and no formatter runs, so the changesets command line tool need not be installed. " +
    "Refuses with a named reason when the repository has no readable manifest, when it has no " +
    "`.changeset/config.json`, when a pending changeset cannot be parsed or names a package outside the " +
    "workspace, and when the plan is empty: nothing pending, a manifest without a version, or a private " +
    "package this config does not version.",
  Type.Object({}),
  async (_p, ctx) => {
    const planned = await planRelease(ctx.directory);
    if (planned.refusal !== null) {
      return outcome(refusedOuttext(planned.refusal.reason, [releaseLegalNext(planned.refusal.code)]), {
        ...releaseDetails(planned),
      });
    }
    return outcome(releasePlanText(planned), releaseDetails(planned));
  },
  { activeByDefault: true },
);

export const tw_release_apply: Tool = defStructured(
  "Apply the release: bump every manifest the plan names, insert each changelog section, and remove the " +
    "consumed changesets. Call it once the operator confirms the plan tw_release_plan reported. The plan " +
    "is recomputed from the tree the apply writes, so an entry staged since the preview is part of the " +
    "same release. Refuses with the same named reasons as the plan, and a refused apply writes nothing " +
    "at all.",
  Type.Object({}),
  async (_p, ctx) => {
    const applied = await applyRelease(ctx.directory);
    if (applied.refusal !== null) {
      return outcome(refusedOuttext(applied.refusal.reason, [releaseLegalNext(applied.refusal.code)]), {
        ...releaseDetails(applied),
      });
    }
    return outcome(
      releaseApplyText(applied),
      releaseDetails(applied, { written: applied.written, removed: applied.removed }),
    );
  },
  { activeByDefault: true },
);
