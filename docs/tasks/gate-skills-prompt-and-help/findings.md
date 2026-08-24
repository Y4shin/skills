# gate-skills-prompt-and-help — research findings (return-to-Wayfinder)

> Research triggered while preparing the arch spec for
> `gate-skills-prompt-and-help`. `gate-config-mechanics` explicitly left
> these sub-questions open ("unresolved, handed to other tasks"). Resolving
> them now, before slicing, because two slice docs assumed facts that turn
> out to be wrong.
>
> Primary source: pi 0.80.10
> `/nix/store/46l2syffzlyylqhs4mlzaxxyj5ivglry-pi-coding-agent-0.80.10/lib/node_modules/pi-monorepo/`
> (cited as `PI/...`).

## Three sub-questions, three verdicts

### V1 — Skills-XML format in the system prompt (slice 1 depends on this)

**Slice 1 / the idea assumed:** `<skill name="…">…</skill>` blocks.

**Actual (`PI/dist/core/skills.js:257-283` `formatSkillsForPrompt`):**

```
<available_skills>
  <skill>
    <name>wayfinder</name>
    <description>…</description>
    <location>/path/to/SKILL.md</location>
  </skill>
  …
</available_skills>
```

The skills are wrapped in a single `<available_skills>` block; each skill is a
`<skill>` element with **child** `<name>`/`<description>`/`<location>`
elements. There is **no** `<skill name="…">` attribute form in the system
prompt. (That attribute form *is* emitted by `_expandSkillCommand` —
`PI/dist/core/agent-session.js:967` — but only for the *expanded* block
after an explicit `/skill:` invocation, not in the system prompt.)

**Implication:** the strip handler's regex must remove the whole
`<available_skills>…</available_skills>` block **when every skill it
contains is one of the gated six** (the common case for this package — the
six are the only skills `task-workflow` ships), OR remove individual
`<skill>` blocks by matching their `<name>` child against the gated names
(general case — needed if other packages' skills share the block). The
latter is safer and works whether or not other skills are present. Pin to
the six names; log a diagnostic if zero matches (format drift).

### V2 — Can an extension suppress the six from `/help` / skill-list? (D3)

**Verdict: NO.** pi 0.80.10 exposes no subtractive hook for the loaded
skill set.

- `/help` / skill-list read from the **loaded skill set**
  (`resourceLoader.getSkills().skills`), not from the system prompt. In
  `interactive-mode.js`: `formatCompactList(n.map((skill) => skill.name))`
  iterates the loaded skills directly.
- `resources_discover` (`PI/dist/core/extensions/types.d.ts:393-407`) is
  **additive-only**: its result can *add* `skillPaths`, `promptPaths`,
  `themePaths` — it cannot remove paths the manifest already loaded.
- `package.json` `pi.skills` is always read; an extension cannot subtract
  from it (the idea already confirmed this).
- `disableModelInvocation: true` (which `formatSkillsForPrompt` filters
  on, `skills.js:258`) is a **static** frontmatter flag — it would hide
  the skill in personal repos too. Not viable for a conditional gate.

**Implication for D3:** the gate can hide the six from the **system prompt**
(V1's strip handler) but **cannot** hide them from `/help` / skill-list in a
work repo. This is a **documented limitation**, exactly as the slice 2
acceptance criteria already allowed ("if no mechanism exists, document the
residual"). Slice 2 collapses to: write the limitation note + a test
asserting the note exists. No suppression code is possible.

### V3 — Can an extension prevent/warn on explicit `/skill:<name>`? (D4)

**Verdict: YES — fully enforceable via the `input` event.**

`PI/dist/core/agent-session.js:817-830`: the `input` event fires **before**
`_expandSkillCommand`. `InputEventResult`
(`PI/dist/core/extensions/types.d.ts:629-636`) has three variants:

```ts
{ action: "continue" }                      // pass through unchanged
{ action: "transform"; text; images? }      // rewrite the text
{ action: "handled" }                       // consume/drop — do NOT expand
```

So in a work repo, an `input` handler registered **only when gated**
(`if (gate.active) pi.on("input", …)`) can:

- detect `text.startsWith("/skill:")`, parse the skill name,
- if the name is one of the gated six: return `{ action: "handled" }` after
  `ctx.ui.notify("task-workflow is gated in this work repo; not loading
  <name>", "warning")` → **prevents** the expansion (D4 preferred path).
- non-gated `/skill:other` or non-`/skill:` input → `{ action: "continue" }`.

This is clean, uses a public event, and needs no private-API patch. D4's
"prevent if possible" is **possible**.

## Impact on the slices (revised plan)

- **Slice 1 (`gate-strip-skills-from-prompt`):** change the regex target
  from `<skill name="…">…</skill>` to the real `<available_skills>` /
  `<skill><name>…</name>…</skill>` format. Strip the six by `<name>` child
  match; if that empties `<available_skills>`, drop the whole block. Keep
  the fail-loud diagnostic. This is a **slice-doc correction**, not a scope
  change.
- **Slice 2 (`gate-suppress-help-and-skill-list`):** collapse to the
  documented-limitation path. Write
  `docs/tasks/gate-skills-prompt-and-help/limitations.md` recording V2
  (no subtractive hook; `/help` will still list the six in a work repo), add
  a test asserting the note exists, and hand the note to
  `gate-config-docs-and-defaults` for the README. **No suppression code.**
  This matches the slice's own "if no mechanism exists" branch.
- **Slice 3 (`gate-explicit-invocation-policy`):** implement the **prevent**
  path via `pi.on("input", …)` registered only when gated. Return
  `{action:"handled"}` for `/skill:<gated-name>` after a `ctx.ui.notify`
  warning. Non-gated skills and non-`/skill:` input pass through. This is
  the D4 preferred path, now confirmed mechanically possible.

## No return-to-Wayfinder escalation needed

These are slice-doc corrections within the existing task scope (the slice
docs already anticipated both the "format might differ" and "no mechanism
exists" branches). The destination, constraints, and scope are unchanged.
Updating the task body + slice docs in-place and proceeding (not a map-level
revision).
