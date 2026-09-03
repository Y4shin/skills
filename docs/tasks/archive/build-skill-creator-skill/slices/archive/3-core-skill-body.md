---
kind: slice
slug: core-skill-body
title: Write the synthesized core SKILL.md body (workflow + principles + capability-conditional model + references index)
task: ../task.md
mode: afk
status: done
size: l
blocked_by:
- support-scripts-node
---

# Slice 3: The core SKILL.md body

## End-to-end behavior

`skills/skill-creator/SKILL.md` carries the complete, lean core authoring
guidance: the synthesized 8-phase workflow, the core principles, the
**capability-ceiling + capability-conditional rules** model, produced-skill
frontmatter guidance, the "choose a script language" decision rule (pointing
to the slice-5 references), and a one-level-deep references index. After this
slice the body is the authoritative core; references (slices 4–5) are linked
but not yet written, and the self-review (slice 6) is pending.

## Deliverables

`skills/skill-creator/SKILL.md` body (replace the slice-1 skeleton), written
to the current Agent Skills spec and the agentskills.io best-practices /
optimizing-descriptions guidance, synthesized from DeepAgents + sentient-agi
under one coherent voice:

- **Capability ceiling + conditional rules (the central model).** State the
  default: a produced skill assumes only that the agent can read the `SKILL.md`
  body and, optionally, call MCP tools — so ship `SKILL.md` reachable by name
  + description, with by-hand fallbacks for anything that needs more. Then the
  conditional rules, each "if the target agent supports X, you may/should …":
  - **filesystem access** → reference local files, read repo conventions,
    inspect existing skills before creating (update-over-create).
  - **bash / tool execution** → bundle a script in `scripts/` for fragile /
    exact / repeated operations and have the skill *run* it; the produced
    script's language follows the "choose a script language" rule below.
  - **network / a specific MCP server** → express the exact operation as an
    MCP tool call or a documented dependency, not an in-head derivation.
  - **a harness with its own skill conventions / frontmatter** → keep the
    portable spec core intact and add the harness-specific bit as an explicit
    extension (see the "Portable vs harness-specific" distinction).
  End with: if you can't determine the target's capabilities, author to the
  minimal ceiling and document the by-hand fallbacks — the skill still works.
- **The 8-phase workflow** (adapt, skip only with a stated reason):
  1. Understand with concrete examples (gather / propose-and-confirm real
     trigger requests + expected outputs; ask the most important questions
     first; don't interrogate when the repo/examples already answer it).
  2. Discover existing skills — update over create (run `discover_skill` or
     skim by hand; same capability → update in place + *broaden* the
     description so the merged skill still triggers on everything its parts
     did; merely adjacent → new skill).
  3. Plan reusable contents (for each example: scripts/ for fragile/exact;
     references/ for exact specs/conventions; assets/ for output-embedded
     files; handle conventions as parameters, catalogued in references).
  4. Scaffold (new skills only) — run `scaffold_skill` or create the folder +
     `SKILL.md` by hand.
  5. Write frontmatter + body — frontmatter per the spec (below); build &
     test resources first, then the body that ties them together.
  6. Validate — run `validate_skill` (or `skills-ref` if available) + manual
     semantic validation.
  7. Adversarial self-review — trigger test (≥3 should-trigger + ≥2
     near-miss), execution dry-run, context review, generalization review;
     revise.
  8. Iterate on real usage — bundle what runs reinvent the same helper / take
     the same detour; cut what false-triggers or wastes context.
- **Produced-skill frontmatter guidance.** `name` (lowercase/digits/hyphens,
  ≤64, == folder, verb-led, namespaced by tool when it sharpens triggering) and
  `description` (≤1024, the *only* trigger — enumerate literal phrases for
  every capability, add a "Do NOT use for …" line, err pushy not abstract).
  Optional spec fields and *when* each is justified: `license` (state one when
  the skill is shared — the author's/project's choice), `compatibility` (only
  for a meaningful env requirement), `allowed-tools` (experimental; pre-approve
  tools), `metadata` (string→string, namespace keys). **Keep the portable core
  free of harness-specific fields** (e.g. a vendor `disable-model-invocation`);
  if a harness needs one, it is an explicit "Harness-specific extension", not
  the portable core.
- **Core principles** (concise, justified-tokens): assume the agent is already
  capable — add only what it lacks; match instruction rigidity to task
  fragility (high/medium/low freedom); progressive disclosure (metadata →
  body <500 lines ≲5k tokens → resources as needed; references one level deep;
  tell the agent *when* to read each); single-source each fact; explain the
  *why*, not caps-rules-without-reason; favor procedures over one-off answers;
  provide defaults not menus; gotchas are the highest-value content.
- **"Choose a script language" decision rule** (for a *produced* skill's own
  script): bundle a script only for an exact/fragile/repeated op; pick the
  language to match the target repo/project's canonical language; default
  **Python** when unconstrained; **Bash is supported but discouraged** — it isn't
  reliably cross-platform (Windows agents may have no POSIX shell), so use it
  only for tiny pure-shell glue and prefer Python for anything cross-platform.
  Keep the script **self-contained at the end-user's runtime** — stdlib-only,
  or libraries bundled into one **committed** file via a build step (Python
  `zipapp` / JS bundler); don't require the end user to install libs or have
  extra CLI tools present. Provide a **by-hand fallback only as a safe,
  considered choice** — omit it for dangerous/irreversible/non-obvious ops
  (e.g. an API mutation the agent might fumble from outdated docs); have the
  skill stop and require the script instead. Test on a worked example. See
  `references/support-scripts.md` (shared backbone) + the per-language
  `references/support-scripts-{python,js-ts,bash}.md`; until slice 5 lands,
  this rule is self-sufficient.
- **What not to include / principle of no surprise** — no `README`/
  `CHANGELOG`/install guides/dev diaries; no malware/exfil/persistence; make
  consequential behavior explicit in the description.
- **References index** — a one-level-deep list with a when-to-read note each:
  - `references/agent-skills-spec.md` — the portable format (read when
    authoring frontmatter or deciding structure).
  - `references/target-pi.md` — authoring for a Pi package (read when the
    target is Pi).
  - `references/support-scripts.md` — the **shared** support-script backbone
    (when to ship a script, language choice incl. Bash/Windows, the
    self-contained dependency+build policy, the safety-first by-hand-fallback
    decision, shape/testing). Read first when bundling a produced-skill script.
  - `references/support-scripts-python.md`, `references/support-scripts-js-ts.md`,
    `references/support-scripts-bash.md` — per-language specifics (bundling
    mechanism, shebang/invocation, testing, Bash Windows/POSIX caveats). Read
    the one for the chosen language.
  - (optional) `references/trigger-design.md` — only if trigger detail
    outgrows the body; else keep the trigger method in the body.

## Acceptance criteria

- `SKILL.md` body states the capability ceiling (minimal default) + the four
  capability-conditional rules + the "Portable vs harness-specific extension"
  distinction.
- The 8-phase workflow is present, in order, each with a concrete reason.
- Front matter guidance covers `name` + `description` rules and the four
  optional spec fields with a justification each, and forbids harness-specific
  fields in the portable core.
- The "choose a script language" rule is present and points to the two
  support-script references.
- The references index links each reference one level deep with a when-to-read
  note.
- `SKILL.md` is ≤500 lines and the body is ≲5000 tokens (run `wc -l`; eyeball
  tokens). Lean: a capable agent would do *worse* if any section were removed
  (apply that test, then cut).

## Test plan

- **Seams:** the `SKILL.md` text (no executable behavior this slice).
- **Failure modes:** (1) the body bloats past 500 lines / 5k tokens → move
  detail to references (slices 4–5); (2) the capability rules drift into
  brand-listing (Claude/ChatGPT) → re-key on capabilities, keep brands as
  examples only; (3) the description guidance contradicts the spec's 1024
  limit or naming rules → reconcile to the current spec.
- **Scenarios:** a read-through as a fresh agent confirms every section earns
  its tokens and each referenced file is named (presence is slices 4–5).
- **Edge cases:** the trigger-description rule must not encourage keyword
  stuffing that breaks the 1024 limit or reads unnaturally (the
  optimizing-descriptions guide's caution).

## Constraints

- Follow the **current** spec; do not reproduce the snapshot in the task
  proposal verbatim.
- Single-source: do not paraphrase the spec into the body — link
  `references/agent-skills-spec.md`. Do not list Pi specifics inline — link
  `references/target-pi.md`.
- Capability-conditional, not brand-conditional (per the map).
- No auxiliary docs. No `disable-model-invocation` or other non-spec
  frontmatter on `skill-creator` itself.
