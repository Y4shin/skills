# wizard

## What it does

`wizard` generates an interactive bash script that walks a human, step by
step, through a manual procedure that is tedious by hand and tedious to
re-explain to an AI every time: provisioning infrastructure, setting up
credentials or CI secrets, walking an unfamiliar third-party dashboard, a
one-off migration or cutover. It is not invoked for steps the agent could
perform itself.

The tedious UX is already solved by a shared template: stage-by-stage
progress, confirmation gates, cross-platform URL opening (WSL included),
hidden secret entry, idempotent `.env` upserts, `gh secret` and `gh variable`
writes, and a closing summary. The skill's job is only to scope the
procedure and author its stages:

1. **Scope the procedure** by reading the repo first (`.env` files, README,
   compose files, workflow files: every `secrets.*` reference is a value to
   produce), then confirm the ordered stage list with you.
2. **Map each stage's journey**: which URL opens, what to click, which
   value lands where. Steps it does not actually know are checked with you
   or the docs, never invented.
3. **Author the wizard** from the template: one `stage` per step in
   dependency order, library helpers throughout, `ask_secret` for anything
   secret, `confirm` before anything irreversible.
4. **Verify and hand off**: `bash -n` (plus shellcheck when available),
   static trace of every captured value to its destination, then the run
   instructions. It does not run the wizard end-to-end itself: it opens
   browsers and blocks on human input.

A wizard is ephemeral by default: built for one run, deleted when done.
Commit it only when the procedure should be a repeatable setup path.

## When to reach for it

The model reaches for it when a procedure needs a human at the keyboard:
dashboard clicks, credentials, one-off cutovers. If the agent can do the
step itself, this is the wrong tool.

## Common questions

**Why a bash script instead of the agent just guiding me in chat?**
Because the guidance evaporates. The script shows the exact URL, says
exactly what to click, captures the value, writes it where it belongs, and
shows how many stages remain; the same run works for the next person too.

**Why must the agent not run the wizard itself?**
It opens browsers and waits for human input by design. The skill verifies it
statically instead: every value from the scoping step is captured and lands
where the scoping step said.

**What ends up in CI secrets versus `.env`?**
`set_secret` only for the values CI actually needs (matched against the
repo's `secrets.*` references); everything else persisted goes through
idempotent `.env` upserts.

**Is the script reusable?**
Ephemeral by default. Commit it only when it is a repeatable setup path, and
link it from the README so the next person runs it instead of asking an AI.

## It's working if

- The stage list was confirmed with you before authoring, and every stage
  traces to instructions a stranger could follow.
- Secrets were entered hidden, irreversible actions had a confirmation gate,
  and every persisted value landed in its destination.
- `bash -n` (and shellcheck, when present) passed before you ran it.
- The library above the `STAGES` marker was never hand-edited; only the
  stages differ between wizards.
