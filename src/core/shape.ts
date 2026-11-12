/**
 * The two shape guards: what a string is, and what an object is.
 *
 * A shape guard answers a question about a value's runtime type and nothing
 * else, so this module imports nothing. Anything that needs to ask the question
 * can depend on it without inheriting a dependency, and two modules that ask it
 * cannot answer differently.
 *
 * Two modules ask it: the git resolver, which reads a profile from a config
 * file, and the spawn guard, which reads a tool call's arguments. Both guards
 * were first defined in the resolver, because the resolver needed them first,
 * and they live here rather than beside it because a module about branches is
 * the wrong place to look for a generic type guard.
 *
 * No tool family imports them. A family that reads an untrusted value from a
 * tool call trims it in place, with the `typeof value === "string" ?
 * value.trim() : ""` shape written out again at every handler that needs it.
 * That hand-rolled trim is a known gap: it is not this module's purpose, and
 * consolidating it is a change of its own with its own risk.
 */

/** The trimmed string a value carries, or "" when the value is not a string. */
export function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Whether a value is a plain object: not null, and not an array. */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
