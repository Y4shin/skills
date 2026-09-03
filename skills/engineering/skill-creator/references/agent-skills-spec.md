# Agent Skills Format — Portable Specification

Read when authoring frontmatter or deciding structure.

This is a distilled reference for the portable Agent Skills format, the
subset every Agent-Skills client supports. It is single-sourced from the
live specification at
[agentskills.io/specification](https://agentskills.io/specification); recheck
that URL at authoring time in case the spec has evolved. Harness-specific
extensions (e.g. Pi's `disable-model-invocation`) are **not** covered here —
see `target-pi.md` for those.

## Directory structure

A skill is a directory containing, at minimum, a `SKILL.md` file:

```
skill-name/
├── SKILL.md          # Required: metadata + instructions
├── scripts/          # Optional: executable code
├── references/       # Optional: documentation loaded on demand
├── assets/           # Optional: templates, schemas, static resources
```

`SKILL.md` is the only required file. The three subdirectories are
conventions for organizing common content types; a skill may include any
additional files or directories beyond them.

## Frontmatter

`SKILL.md` must start with YAML frontmatter (delimited by `---`) followed
by Markdown content. The frontmatter carries all metadata; the body carries
instructions.

### Required fields

| Field | Constraints |
|---|---|
| `name` | 1–64 characters. Lowercase `a-z`, `0-9`, and hyphens only. No leading, trailing, or consecutive hyphens. **Must match the parent directory name.** |
| `description` | 1–1024 characters. Non-empty. Describes what the skill does and when to use it. Should include specific keywords that help agents identify relevant tasks. |

### Optional fields

| Field | Constraints |
|---|---|
| `license` | License name or reference to a bundled license file. |
| `compatibility` | 1–500 characters. Environment requirements (intended product, system packages, network access, etc.). Omit when the skill has no special deps. |
| `metadata` | A map from string keys to string values. Namespace your keys to avoid conflicts (e.g. `author`, `version`). |
| `allowed-tools` | Space-separated string of pre-approved tools. **Experimental** — support varies by client. Use sparingly. |

**No other frontmatter fields are spec-valid.** A skill carrying a field
outside this set will fail portable validators such as
[`skills-ref`](https://github.com/agentskills/agentskills/tree/main/skills-ref).

### `name` examples

Valid:

```yaml
name: pdf-processing
name: data-analysis
name: code-review
```

Invalid:

```yaml
name: PDF-Processing    # uppercase not allowed
name: -pdf              # cannot start with hyphen
name: pdf--processing   # consecutive hyphens not allowed
```

### `description` guidance

The description is the **only trigger mechanism** — the agent never sees
the body until the description matches. It should describe both *what* the
skill does and *when* to use it, using the literal phrases a user would
type.

Good:

```yaml
description: Extracts text and tables from PDF files, fills PDF forms, and merges multiple PDFs. Use when working with PDF documents or when the user mentions PDFs, forms, or document extraction.
```

Poor:

```yaml
description: Helps with PDFs.
```

## Body content

The Markdown body after the frontmatter contains the skill instructions.
There are no format restrictions — write whatever helps agents perform the
task effectively.

The agent loads the entire `SKILL.md` file once it decides to activate a
skill. Keep the body lean; move detailed material into `references/` files
and link them with a "when to read" note.

## Progressive disclosure

Agents load skills progressively, pulling in more detail only as a task
calls for it:

1. **Metadata** (~100 tokens): the `name` and `description` fields load at
   startup for all skills.
2. **Instructions** (<5000 tokens / <500 lines recommended): the full
   `SKILL.md` body loads when the skill is activated.
3. **Resources** (as needed): files in `scripts/`, `references/`, or
   `assets/` load only when the agent opens them.

Keep `SKILL.md` under 500 lines. Move detailed reference material to
separate files in `references/`.

## File references

When referencing other files in a skill, use relative paths from the skill
root:

```markdown
See [the reference guide](references/REFERENCE.md) for details.
Run the extraction script: scripts/extract.py
```

Keep file references **one level deep** from `SKILL.md`. Avoid deeply
nested reference chains (a reference that points to another reference that
points to another). Each reference should be directly reachable from the
body.

## Validation

Use the official
[`skills-ref`](https://github.com/agentskills/agentskills/tree/main/skills-ref)
reference library to validate skills:

```shell
skills-ref validate ./my-skill
```

This checks that `SKILL.md` frontmatter is valid and follows all naming
conventions. If `skills-ref` is not installed, validate by hand: confirm
the frontmatter opens with `---`, `name` matches the regex
`^[a-z0-9]+(-[a-z0-9]+)*$`, is ≤64 characters, and equals the parent
directory; `description` is non-empty and ≤1024 characters; no frontmatter
keys outside the allowed set.
