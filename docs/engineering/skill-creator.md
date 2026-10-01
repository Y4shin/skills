# skill-creator

## What it does

`skill-creator` creates, updates, and improves Agent Skills: turning a
runbook, checklist, or repeated workflow into a spec-conformant skill, and
tightening one that is not triggering reliably. It runs an eight-phase
workflow whose phases each prevent a specific failure mode: understand with
concrete examples, discover existing skills (update over create), plan
reusable contents, scaffold, write frontmatter and body, validate, run an
adversarial self-review (trigger test, execution dry-run, context review,
generalization, meta-noise pruning) and then invoke `/skill-review` for a
fresh-context multi-axis review, and finally iterate on real usage.

The load-bearing ideas:

- **The description is the only trigger mechanism.** The agent never sees
  the body until the description matches, so it enumerates the literal
  phrases users would type, bounds itself with a "Do NOT use for" line, and
  errs pushy (under 1024 characters).
- **Capability ceiling**: a produced skill assumes by default only that the
  agent can read the body and optionally call MCP tools; richer abilities
  (filesystem, bash, network) activate matching conditional rules when the
  target is known, with by-hand fallbacks otherwise.
- **Portable core, harness-specific extension**: `name` + `description` (and
  rare optional spec fields) work on any Agent Skills client; Pi-specific
  fields like `disable-model-invocation` are documented extensions, never
  mixed into the portable core.
- **Progressive disclosure and single-sourcing**: a lean body (under 500
  lines), detail pushed to `references/` one level deep with a "when to
  read" note each, and one authoritative home per fact.
- **Cut meta-level narrative**: the body is instructions for the
  reader-agent; version-change justifications and authoring backstory are
  noise. Reader-facing rationale stays; author-facing rationale goes.

## When to reach for it

The model reaches for it when you ask for a new skill, want a repeated
workflow packaged as one, need a skill made portable across agents, or want
a skill's triggering or body tightened. It is explicitly not for ordinary
documentation or coding tasks.

## Common questions

**Should we extend an existing skill or create a new one?**
Same capability: update in place and broaden the description so the merged
skill still triggers on everything its parts did. Merely adjacent: create a
new one. Duplicates fragment trigger coverage.

**Why does the produced skill need bundled scripts?**
Only for fragile, exact, repeated, or numeric operations where prose invites
mistakes; judgment steps stay as prose. Scripts default to Python (stdlib
only or bundled), match the target repo's language when it has one, and bash
is discouraged beyond tiny glue.

**What makes a skill's description fire reliably?**
Literal user phrases for every capability, a hard scope boundary, imperative
"Use when" phrasing, and pruning after real usage. The adversarial trigger
test (should-trigger plus near-miss requests) is where gaps surface.

**What is meta-noise?**
Narrative aimed at the author rather than the reader-agent: creation
backstory, "we changed this from a prior version because". It wastes the
reading agent's context and hides the actual instructions.

## It's working if

- The produced skill triggers on the requests you actually type and stays
  quiet on near-misses that mean something else.
- `validate_skill` passes (name equals the folder, description within
  limits, only allowed frontmatter keys), and the semantic pass finds
  description and body telling the same story.
- The body is lean, references resolve and stay one level deep, and every
  section earns its tokens.
- The fresh-context review (audience fit, trigger behavior, spec and
  portability) ran before you shipped it, and its findings were folded back
  in.
