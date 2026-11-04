/**
 * Slug rules.
 *
 * A slug becomes a directory name under `docs/tasks/`, so it has to be legal
 * on every desktop operating system, not only on the one the caller happens
 * to use. Two rules exist for Windows specifically:
 *
 * - Device names. Windows reserves `con`, `prn`, `aux`, `nul`, `com1`-`com9`,
 *   and `lpt1`-`lpt9` in every directory, with or without an extension. A
 *   directory with one of those names cannot be created at all, so a slug that
 *   would create one is refused everywhere; a Linux-only refusal would let a
 *   tree be authored that a Windows checkout cannot open.
 * - Length. A ticket's deviation report is written to
 *   `deviation-reports/<slug>.md` inside a directory already named for the
 *   slug, so the slug is repeated at depth. Capping it keeps that budget
 *   workable under the 260-character `MAX_PATH` limit Windows enforces by
 *   default.
 */

/** Lowercase letters, digits, and hyphens, starting with a letter or digit. */
const SAFE_SLUG = /^[a-z0-9][a-z0-9-]*$/;

/** The maximum slug length. Generated artifact paths repeat the slug at depth. */
export const MAX_SLUG_LENGTH = 64;

/**
 * Names Windows reserves in every directory, whatever the extension.
 * Built from the documented sets so the rule is readable, not a magic list.
 */
export const WINDOWS_RESERVED_SLUGS: ReadonlySet<string> = new Set([
  "con",
  "prn",
  "aux",
  "nul",
  ...Array.from({ length: 9 }, (_, i) => `com${i + 1}`),
  ...Array.from({ length: 9 }, (_, i) => `lpt${i + 1}`),
]);

/** Why `slug` cannot be a directory name, or null when it can. */
export function slugRejection(slug: string): string | null {
  if (!SAFE_SLUG.test(slug)) {
    return "use lowercase letters, digits, and hyphens (a slug becomes a directory name)";
  }
  if (slug.length > MAX_SLUG_LENGTH) {
    return (
      `it is ${slug.length} characters; the cap is ${MAX_SLUG_LENGTH} ` +
      "(a slug becomes a directory name and is repeated in artifact paths)"
    );
  }
  if (WINDOWS_RESERVED_SLUGS.has(slug)) {
    return `'${slug}' is a device name Windows reserves and cannot be a directory name`;
  }
  return null;
}
