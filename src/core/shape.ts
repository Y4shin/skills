/**
 * The two shape guards: what a string is, and what an object is.
 *
 * A shape guard answers a question about a value's runtime type and nothing
 * else, so this module imports nothing. Anything that needs to ask the question
 * can depend on it without inheriting a dependency, and two modules that ask it
 * cannot answer differently.
 *
 * Both guards were first defined in the git resolver, because the resolver
 * needed them first. They live here because the resolver, the spawn guard, and
 * the tool families all read a value the same way, and because a module about
 * branches is the wrong place to look for a generic type guard.
 */

/** The trimmed string a value carries, or "" when the value is not a string. */
export function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Whether a value is a plain object: not null, and not an array. */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
