/**
 * Artifact model — represents epics, tasks, and slices in the docs/tasks/ tree.
 *
 * Pure data — no file I/O. The extension manages reading/writing files.
 */

import type { FrontmatterData } from "./frontmatter.js";

export type ArtifactKind = "epic" | "task" | "slice";

export interface SliceInfo {
  number: number;
  slug: string;
  status: string | null;
  size: string | null;
  blocked_by: string[];
}

export interface Artifact {
  kind: ArtifactKind;
  slug: string;
  status: string | null;
  title: string | null;
  data: FrontmatterData;
}

/** Parse an Artifact from frontmatter data. */
export function fromFrontmatter(data: FrontmatterData): Artifact {
  const kind = data.kind as string | undefined;
  if (kind !== "epic" && kind !== "task" && kind !== "slice") {
    throw new Error(`invalid or missing 'kind' in frontmatter: ${kind}`);
  }
  return {
    kind,
    slug: (data.slug as string) ?? "",
    status: (data.status as string) ?? null,
    title: (data.title as string) ?? null,
    data,
  };
}

/** Parse slice info from filename (<n>-<slug>.md) and frontmatter. */
export function sliceInfoFrom(
  filename: string,
  data: FrontmatterData,
): SliceInfo {
  const m = filename.match(/^(\d+)-(.+)\.md$/);
  if (!m) throw new Error(`invalid slice filename: ${filename}`);

  const blockedRaw = data.blocked_by;
  const blocked_by: string[] = Array.isArray(blockedRaw)
    ? blockedRaw.map(String)
    : [];

  return {
    number: parseInt(m[1], 10),
    slug: m[2],
    status: (data.status as string) ?? null,
    size: (data.size as string) ?? null,
    blocked_by,
  };
}

/** Extract dependency levels from a list of slices using BFS. */
export function dependencyLevels(slices: SliceInfo[]): string[][] {
  const bySlug = new Map(slices.map((s) => [s.slug, s]));
  const slugSet = new Set(slices.map((s) => s.slug));

  // Remaining slices to assign
  const remaining = new Set(slices.map((s) => s.slug));
  const levels: string[][] = [];

  while (remaining.size > 0) {
    const level: string[] = [];

    for (const slug of remaining) {
      const s = bySlug.get(slug)!;
      // A slice is ready if all its blockers are either not in the set
      // (already assigned to a previous level) or don't exist
      const blockers = s.blocked_by.filter((b) => slugSet.has(b));
      const ready = blockers.every((b) => !remaining.has(b));
      if (ready) level.push(slug);
    }

    if (level.length === 0) {
      // Circular dependency or orphaned blockers — assign the remaining
      // ones anyway so the process doesn't deadlock
      for (const slug of remaining) level.push(slug);
    }

    for (const slug of level) remaining.delete(slug);
    levels.push(level);
  }

  return levels;
}