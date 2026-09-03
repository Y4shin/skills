Skills are organized into bucket folders under `skills/`:

- `engineering/`: daily code work
- `productivity/`: daily non-code workflow tools
- `misc/`: kept around but rarely used, not promoted
- `in-progress/`: beta, public on purpose, feedback wanted, not shipped
- `deprecated/`: no longer used

Every skill in `engineering/` or `productivity/` (the **promoted** buckets)
must have a reference in the top-level `README.md` and an entry in
`package.json`'s `pi.skills` array (the package ships exactly the promoted
set). Skills in `misc/`, `in-progress/`, and `deprecated/` must not appear
in either. This package is a Pi package: install with `pi install`, no
Claude Code plugin manifest, no skills.sh.

Each skill entry in the top-level `README.md` must link the skill name to
its `SKILL.md`.

Each bucket folder has a `README.md` that lists every skill in the bucket
with a one-line description, with the skill name linked to its `SKILL.md`.
The promoted buckets' `README.md`s and the top-level `README.md` group
entries into **User-invoked** and **Model-invoked**; non-promoted bucket
`README.md`s (`misc/`, `in-progress/`, `deprecated/`) use a flat list.

Skills in `engineering/` and `productivity/` also have a human-facing docs
page at `docs/<bucket>/<skill-name>.md` (the docs tree mirrors those two
bucket folders under `skills/`). When you add, rename, or change the
behaviour of a skill in `engineering/` or `productivity/`, create or
re-sync its docs page. A finished page carries four sections: **What it
does**, **When to reach for it**, **Common questions**, and **It's working
if**. Skills in the non-promoted buckets (`misc/`, `in-progress/`,
`deprecated/`) get **no** docs page.

Every `SKILL.md` is either user-invoked (`disable-model-invocation: true` in
frontmatter, reachable only by the human typing the name) or model-invoked
(omit `disable-model-invocation`; model- or user-reachable). Pi uses
frontmatter only: there is no `agents/openai.yaml` (that is a Codex-specific
file; we are Pi-native). The two representations stay in sync: a skill is
user-invoked or model-invoked, not both. A user-invoked skill may invoke
model-invoked skills, but never another user-invoked one.

Dependencies between skills are expressed as an operative instruction to
invoke the named skill, not as deep file cross-references. In Pi, a
model-invoked skill is reached by the model auto-invoking it or by
`/skill:<name>`; a user-invoked skill is reached only by the human typing
`/skill:<name>`. When a skill step needs another skill, say so explicitly
("delegate to the `research` skill" or "call `/skill:grilling`"). One skill
per instruction. A step that needs two skills is two instructions, not one
with two names. User-invoked skills cannot be reached this way; phrase them
as instructions for the human ("tell the user to run
`/skill:setup-matt-pocock-skills`").

[`task-overview`](./skills/engineering/task-workflow-overview/SKILL.md) is the router
that maps every user-reachable skill and how they relate. Whenever you add,
rename, remove, or change how a user-reachable skill fits the flows, re-read
`task-overview`'s `SKILL.md` and update it so the map stays accurate: a new
skill it never mentions, or a stale one it still routes to, is a router that
lies.

No em-dashes anywhere in this repo's prose (`SKILL.md` files, docs,
`README.md`, `CHANGELOG.md`, ADRs, code comments). Where a sentence reaches
for one, rewrite it instead with a comma, colon, period, parentheses, or a
conjunction, whichever the sentence actually wants; never do a blind
character substitution.
