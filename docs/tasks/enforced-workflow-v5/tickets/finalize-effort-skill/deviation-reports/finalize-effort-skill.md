---
type: deviation report
title: Deviation report for finalize-effort-skill
status: stable
---

## Deviation report: finalize-effort-skill

Diff range: `stricter-workflow..ticket/finalize-effort-skill` (the landing
branch does not exist yet, so the template's `task/<slug>..ticket/<slug>`
range is empty). 13 files, 1110 insertions.

### API surface changes

- **Planned:** arch spec entry 18 says the `review.md` writer "is deliberately
  absent from the landed transition tools; this ticket owns it", and that "the
  review writer this ticket lands must set that flag". It pins the artifact
  shape (`type: review`), the `dispositioned: true` frontmatter flag the
  archive gate reads, the archive move through `tw_archive_effort`, and an
  effort-kind opener. It does not name the writer or its argument surface.
- **Actual:** a new tool, `tw_write_review` (`src/pi.ts:1772`), the only
  writer of `docs/tasks/<effort>/review.md`. Structured args:
  `selector`, `content`, `title`, `findings`, `follow_up`. It sets
  `dispositioned: true` only when the findings list is supplied and every
  entry carries a disposition; an absent list leaves the flag closed, an empty
  list closes it with "(no findings)". The cross-effort move is a mode of the
  same tool (`follow_up`) rather than a second writer: the findings body lands
  in the child's `review.md` and the origin's artifact is rewritten as the
  disposition record naming the follow-up slug.
- **Impact:** `finalize-effort`'s toolset gained `tw_write_review`
  (`src/disclosure.ts:168`), and the tool is disclosed by that phase only.
  `docs-resync` (entry 20) must document it. No landed ticket's contract
  depends on the tool's name or its argument surface.

- **Planned:** the spec requires an additive `origin_effort` field on the
  child map, a field "not a graph edge, so it never enters frontier or
  `blocked_by` semantics". It names no writer for that field, and the
  `docs/tasks/` write lockdown refuses the built-in `write`/`edit`, so a named
  writer was required for the field to be reachable at all.
- **Actual:** `tw_create_effort` gained an optional `origin_effort` argument
  (`src/pi.ts:2017`), validated as a live effort, written only when supplied,
  and the refusal message names the tool. `origin_effort` stays a map field
  only: `src/core/art.ts:65` models it, `art.ts:133` reads it, and
  `src/core/graph.ts` has no reference to it.
- **Impact:** `intake`'s toolset already carries `tw_create_effort`, so no
  other toolset changes. The argument is optional, so existing callers are
  unaffected. The frontier and `blocked_by` semantics are untouched, as the
  spec requires.

- **Planned:** the `finalize-effort` registry comment already claimed
  `tw_archive_effort` is its private signature tool, the value the open-set
  derivation keys on.
- **Actual:** the derived signature was `tw_finalizable`, the first
  private-to-this-skill tool in array order. The toolset was reordered so
  `signatureToolOf` returns `tw_archive_effort`, and a new test pins it
  (`tests/opener-gate.test.ts`, "finalize-effort's private signature tool
  stays the archive move").
- **Impact:** the derivation's behaviour is unchanged, because both tools are
  private to this one toolset, so an active `tw_finalizable` still implied the
  same phase. The documented contract and the computed value now agree. Future
  tools added to this toolset must not be inserted ahead of
  `tw_archive_effort`, or the new pin fails. No other ticket keyed on the old
  derived value.

### Abstraction usage

- Used/was specified: yes. The writer goes through the landed seams rather
  than around them: the frontmatter seam (`parse`/`dump`), the scan memo
  (`scanMemo`), `resolveArt`/`liveEffortDir` for selectors,
  `writeMapSection` for the tool-owned `Dispositions` section, and
  `defStructured` like the sibling structured writers. The archive gate's
  existing read of `dispositioned` was consumed unchanged rather than
  re-shaped, so entry 18's escape clause ("if the landed review artifact
  shapes that flag differently, the coherence pass adjusts the gate's read")
  was not needed. No shell, no `git mv`.

### Out-of-scope changes

- `README.md:41-80` gained a `## Skills` inventory of all 29 promoted skills,
  grouped User-invoked and Model-invoked, each name linked to its `SKILL.md`.
  The dispatch assumed that inventory already existed; it did not. The
  grouping is correct (checked against `package.json` `pi.skills` and each
  `SKILL.md`'s `disable-model-invocation`), and `AGENTS.md` requires the
  references, but the inventory belongs to `docs-resync` (entry 20: "the
  top-level `README.md`: the skill inventory and the phase flow"). It is now a
  second surface that can drift from `pi.skills`.
- `tests/skills.test.ts` `SURVIVING_TOOLS` gained `tw_create_effort` as well
  as `tw_write_review`, because the new prose names both.
  `tests/skill-rewire.test.ts` `WORKFLOW_SKILLS` gained `finalize-effort` so
  the per-skill report seam covers the new resource. Both are required by
  existing contracts; neither was in the dispatch.
- The child's review artifact is written with `dispositioned: false` and with
  the origin's title. The spec pins neither. Two consequences: an accepted
  follow-up cannot archive until it re-triages the inherited findings through
  `tw_write_review` (defensible, since findings must be dispositioned in the
  effort being archived, but a new obligation on the follow-up), and a reader
  in the child sees an artifact titled for the origin effort.
- Pre-existing drift in a file this ticket edited and left alone:
  `skills/engineering/README.md:31` links `./report-bug/SKILL.md`, but
  `report-bug` lives under `skills/deprecated/`. That is `docs-resync`'s to
  fix, not this ticket's.

### Ticket doc update needed?

Yes. Append to `## Implementation notes`:

The review writer is `tw_write_review` (`selector`, `content`, `title`,
`findings`, `follow_up`), the only writer of `review.md`. `dispositioned`
turns true only when `findings` is supplied and every entry carries a
disposition. The move is the tool's `follow_up` mode: the child receives the
findings body with `dispositioned: false`, and the origin keeps the
disposition record with `dispositioned: true`, so the origin archives and the
trail reads in both directions. `origin_effort` is an optional
`tw_create_effort` argument, validated against a live effort and omitted by
default. The `finalize-effort` toolset lists `tw_archive_effort` first so the
derived signature stays the archive move.

### User attention needed?

Yes, one item. The README skill inventory is new out-of-scope surface that
`docs-resync` owns. Keep it and let ticket 20 audit it, or revert it before
landing to keep ticket 20 the single owner of the README. No built API surface
contradicts the arch spec, so the deviation is additive only.
