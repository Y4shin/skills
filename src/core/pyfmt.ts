/** Small helpers to reproduce Python's str()/repr()/json.dumps output shapes. */

/** Python repr() for the scalar types frontmatter carries. */
export function pyRepr(v: unknown): string {
  if (typeof v === "string") return `'${v}'`;
  if (v === null || v === undefined) return "None";
  if (v === true) return "True";
  if (v === false) return "False";
  return String(v);
}

/** Python str() / f-string interpolation of a scalar. */
export function pyStr(v: unknown): string {
  if (v === null || v === undefined) return "None";
  if (v === true) return "True";
  if (v === false) return "False";
  return String(v);
}

/** Python json.dumps(v) with default separators (", " / ": "), no indent. */
export function pyJsonCompact(v: unknown): string {
  if (v === null || v === undefined) return "null";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(pyJsonCompact).join(", ") + "]";
  if (typeof v === "object") {
    const parts = Object.entries(v as Record<string, unknown>).map(
      ([k, val]) => `${JSON.stringify(k)}: ${pyJsonCompact(val)}`,
    );
    return "{" + parts.join(", ") + "}";
  }
  return JSON.stringify(v);
}

/** Python json.dumps(v, indent=2). */
export function pyJsonIndent(v: unknown): string {
  return JSON.stringify(v, null, 2);
}
