---
name: finalize-task
description: Autonomous. Run the CI gate, harvest knowledge, write the changelog, mark the ticket done via the set tool, close out per ticket, and merge to main. When the effort's scan tools report it finalizable, archive the effort as a unit.
metadata:
  telemetry.capture: "target"
---

# Finalize Task

> **Telemetry:** call the `telemetry_skill_context` tool with
> `{ skill_name: "finalize-task", map }`, `map` = the effort slug (the
> directory name under `docs/tasks/`; omit when there is none). The `target`
> (ticket slug) is already captured automatically from your invocation
> argument, so do NOT pass it here. Pass `skill_name` explicitly so the
> metadata correlates to this invocation even when multiple skills run in one
> turn.

## Step 0, Prerequisites

The ticket resolves through the resolver (a slug or a path, both tree shapes;
the ticket document lives at
`docs/tasks/<effort>/tickets/<ticket-slug>/ticket.md`), and implement-task
reported its chains landed for it.

## Step 1, CI gate

```
git checkout task/<ticket-slug>
git merge main 2>/dev/null || true
```

Run the project's CI command (from the `tw_context` profile or detected
from repo tooling: package.json scripts, Makefile, CI config; ask the user
when ambiguous). If it fails: STOP.
Fix forward on the landing branch. Do not merge a red branch.

Fix-forward is a designed-for adjustment, record that it fired so its
frequency can be correlated. Call `submit_feedback({ kind: "expected", data })`
with `data` e.g. `"finalize: CI gate red on <ticket-slug>, fixing forward"`.

## Step 2, Knowledge harvest

Read the ticket doc, all deviation reports from
`docs/tasks/<effort>/tickets/<ticket-slug>/deviation-reports/`, and the
combined diff.

Fold durable knowledge into project docs:
- Update `docs/testing.md` if new patterns/tools were discovered
- Update any other relevant docs under `docs/`
- Append architecture lessons to the ticket doc's `## Implementation notes`

Commit: `git add -A && git commit -m "docs(ticket): harvest knowledge for {ticketSlug}"`

## Step 3, Changelog

Write a 3-5 line entry to `docs/tasks/CHANGELOG.md`:
```
## <YYYY-MM-DD>, <title> (<ticket-slug>)
<key changes and decisions>. <outcome in one sentence>.
```

Commit: `git add docs/tasks/CHANGELOG.md && git commit -m "docs: changelog {ticketSlug}"`

## Step 4, Ticket deviation → effort

Read the ticket doc. Compare the ticket's original scope against what was
actually delivered:
- Check if the effort's map doc (`docs/tasks/<effort>/map.md`) needs updating
  (destination, decisions, scope notes). No child array exists to tick;
  done-ness is derived by scanning the tree.
- If deviations found: update the map doc. If significant: ask user.

## Step 5, Bug closure (subtype: bug only)

Read the ticket doc frontmatter.

- If `subtype:` is absent or `feature`, skip this step. Feature tickets are
  unchanged.
- If `subtype: bug`:
  1. The bug doc reference lives in the ticket body (the old bug frontmatter
     field is dead). Read the body for the bug slug it names.
     - If the body names no bug doc, **ask the user which bug doc to close**
       and do not proceed until answered.
  2. Read `docs/bugs/<slug>.md`.
  3. Update the bug doc:
     - Set `status: fixed`.
     - Fill `fix_commit` with the SHA of the final fix commit on the landing
       branch (`git rev-parse task/<ticket-slug>`).
     - Fill the **Root cause** and **Fix summary** sections from the ticket's
       `## Implementation notes` and deviation reports.
  4. Commit: `git add docs/bugs/<slug>.md && git commit -m "docs(bug): close <slug>"`
  5. Archive the bug doc: `git mv docs/bugs/<slug>.md docs/bugs/archive/<slug>.md`
  6. Commit: `git commit -m "chore(bug): archive <slug>"`

## Step 6, Per-ticket close-out

This step interleaves **Pi tool calls** with shell commands. The tw_* tools
are tools you invoke as functions, **not** shell binaries: wrapping them in a
`set -e` block makes them fail with `command not found` (exit 127) and abort
the sequence. Call them as tools, and run the shell steps in a separate bash
block.

1. **Call the Pi tool** to mark the ticket done (one owner of the marking:
   finalize):

   ```
   tw_set <ticket-path> workflow_state done   # Pi tool, not a shell command
   ```

2. **Call the Pi tool** to verify the ticket is finalizable; the check also
   surfaces the effort graph's anomalies, which you should report if any
   appear:

   ```
   tw_finalizable <ticket-slug>   # Pi tool, not a shell command
   ```

3. **Call the Pi tool** to clear the current item (the state setter has no
   slice field and it is not called):

   ```
   tw_state_set task null   # Pi tool, not a shell command
   ```

4. **Merge the landing branch into main** (shell, safe under `set -e`):

   ```bash
   set -e
   git checkout main
   git merge --no-ff task/<ticket-slug> -m "ticket: finalize {ticketSlug}"
   git branch -d task/<ticket-slug>
   ```

   If remote exists: `git push origin main`

There is **no per-ticket move**: the ticket stays in the live effort.
Moving one ticket out would split the effort's graph scope and trip the
spec-plus-zero-tickets rule; the effort archives as a unit.

## Step 7, Effort finalization (when the effort is done)

**Call the Pi tool** to check the effort:

```
tw_map_finalizable <effort-slug>   # Pi tool, not a shell command
```

If it does not return ready, stop here and report the effort's remaining work.
If it returns ready:

1. Mark the map and its done items to `status: deprecated` (the
   archived-effort convention; `workflow_state` stays `done`). For each done
   item and the map, **call the Pi tool**:

   ```
   tw_set <artifact-path> status deprecated   # Pi tool, not a shell command
   ```

2. **Archive the effort directory** (shell, safe under `set -e`; this runs
   on main, where the per-ticket close-outs left the landed work):

   ```bash
   set -e
   git mv docs/tasks/<effort>/ docs/tasks/archive/<effort>/
   git add docs/tasks/archive/<effort>/
   git commit -m "chore(effort): archive <effort>"
   ```

3. **Regenerate the root index**: edit `docs/tasks/index.md`, moving the
   effort from the `## Live` list to the `## Archived` list, both kept
   sorted.
4. **Call the Pi tool** to clear both pointers:

   ```
   tw_state_set task null   # Pi tool, not a shell command
   tw_state_set map null    # Pi tool, not a shell command
   ```

5. Commit and push (already on main, nothing to merge):

   ```bash
   set -e
   git add docs/tasks/index.md
   git commit -m "docs(index): archive <effort>"
   git push origin main
   ```

## Step 8, Report

"Ticket finalized, CHANGELOG updated, main branch updated. Map status:
<finalized / still open>."

> **Feedback:** if finalizing hits a snag, a CI gate that's misconfigured, a
> knowledge-harvest step with nowhere to fold findings, a bug-closure path
> that didn't line up, or something that worked notably well, call
> `submit_feedback({ kind, data })` autonomously to record it. `kind` is a
> short category (`good`, `bad`, `friction`, `architecture`); `data` is one or
> two specific, actionable sentences about the *workflow*, not the ticket.
> Requires the `pi-telemetry` extension (`submit_feedback` tool).
