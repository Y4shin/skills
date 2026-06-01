---
name: capability-prd-to-issues
description: Break a capability PRD (kind:capability) into independently-grabbable enabling slices (SDK/macro/host surface, each with a first consumer), wire the PRD issue + slices with native dependencies (and sub-issues under an epic), and write committed slice docs. Use after /prd-workflow:create-capability-prd. Don't use it on a feature PRD (use feature-prd-to-issues) or to author the PRD itself (use create-capability-prd). Provider-aware (gh/fgj).
allowed-tools: Bash(python3 ${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz:*)
---

# Capability PRD → Issues

Convert a `kind: capability` PRD into independently-grabbable issues using **enabling
slices**, wired with the flat native tracker model (see the injected reference): the PRD issue
is `blocked_by` its slices; under an epic, the PRD and every slice attach as native sub-issues
of that epic. Capabilities are foundational (no UI to demo), so acceptance is a **consumer
test**, not a demoable screen.

Detected forge: **!`"${CLAUDE_PLUGIN_ROOT}/scripts/forge_detect.sh" git_type`** — !`"${CLAUDE_PLUGIN_ROOT}/scripts/forge_detect.sh" ownership_note`

Per-provider commands come from `${CLAUDE_PLUGIN_ROOT}/scripts/forge_detect.sh <key>`, injected at the step that
uses them. The PRD/artifact reference (frontmatter + `docs/prd/<slug>/` layout + lifecycle)
is injected below.

!`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" reference`

`prd_tool.pyz` is the bundled helper that reads/writes this frontmatter — invoke it as
`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" <subcommand>` (`--help` for the full
surface). The current planning-tree inventory is injected here:

!`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" list`

## Step 0 — Provider + PRD

Verify auth, then locate the PRD at `docs/prd/<slug>/prd.md` and **assert `kind: capability`** —
the helper exits non-zero (and points at `/prd-workflow:feature-prd-to-issues`) on a mismatch:

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" assert-kind <slug> capability
```

!`"${CLAUDE_PLUGIN_ROOT}/scripts/forge_detect.sh" auth_check`

Ensure the label scheme exists (idempotent):

!`"${CLAUDE_PLUGIN_ROOT}/scripts/forge_detect.sh" ensure_labels`

## Step 1 — Explore (if needed)

Explore `crates/junius-sdk/` (+ `crates/junius-sdk-macros/` for macros), the host
`platform/`, and `docs/design/11-backend-plugin-interface.md` /
`12-frontend-plugin-interface.md`. Slice descriptions must respect the layering (host owns
auth/RBAC; plugins consume the SDK) and the `plugin.toml` manifest contract.

## Step 2 — Draft enabling slices

Break the PRD into **enabling slices**. Each slice is a thin unit of new API surface /
macro / host capability that **names its first real consumer**.

<enabling-slice-rules>
- Each slice ships a thin, coherent piece of the surface — prefer many thin slices.
- Each slice names a concrete first consumer (a plugin or host call site) so it isn't a
  speculative layer.
- Acceptance = a **consumer test**: a doctest / `#[cfg(test)]` unit in the crate **plus** a
  downstream consumer exercising it in an integration test; for macros, a
  `trybuild`/compile-fail test.
- A completed slice is independently mergeable.
</enabling-slice-rules>

Each slice is **HITL** (needs a human design decision) or **AFK** (autonomous). Prefer AFK.

## Step 3 — Quiz the user

Present the breakdown as a numbered list; per slice: **Title**, **Type (HITL/AFK)**,
**Blocked by**, **Surface + first consumer**. Ask: granularity right? dependencies correct?
does each slice name a real consumer? merge/split any? HITL vs AFK correct? Iterate until
approved.

## Step 4 — Publish (flat native model, dependency order, blockers first)

Read the injected reference for the tracker rule: **sub-issue = epic-only; dependencies =
everything else.** Check `prd.md` frontmatter for an `epic:` field — present ⇒ this PRD belongs
to an epic; absent ⇒ standalone.

Create-issue form for the detected provider:

!`"${CLAUDE_PLUGIN_ROOT}/scripts/forge_detect.sh" cmd_create_issue`

Add a native dependency (make `<issue#>` blocked-by `<blocker#>`):

!`"${CLAUDE_PLUGIN_ROOT}/scripts/forge_detect.sh" cmd_add_dependency`

Attach a child as a sub-issue of the **epic** (only used when `epic:` is set):

!`"${CLAUDE_PLUGIN_ROOT}/scripts/forge_detect.sh" cmd_attach_subissue`

1. **Create the PRD issue** (labels `prd`, `kind:capability`): body = PRD summary. It is a
   regular issue — it does **not** own the slices as sub-issues. Record its number as
   `prd_issue:`:
   ```bash
   python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" set <slug> prd_issue <prd#>
   ```
2. For each slice, in dependency order:
   - Create the issue with labels `kind:capability`, `mode:hitl|afk`, `status:todo` (+
     `milestone:M<NN>`). Body uses the template below (`Part of #<prd>` + blockers).
   - Add **PRD `blocked_by` this slice**.
   - For each blocker in the slice's `## Blocked by`, add **slice `blocked_by` blocker**.
   - Write `docs/prd/<slug>/slices/<n>-<slug>.md` from the template in `references/artifacts.md`.
3. **If `epic:` is set** (`prd_tool.pyz get <slug> epic`)**:** attach the PRD issue **and every
   slice issue** as native sub-issues of the epic (`epic_issue:` from
   `python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" get <epic-slug> epic_issue`). Add any
   **PRD `blocked_by` PRD** edges the epic's `prds[].blocked_by` calls for. Then record the link
   on the epic and set its status:
   ```bash
   python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" epic set-prd-issue <epic-slug> <slug> <prd#>
   python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" set <epic-slug> status in-progress
   ```
   (also tick its checklist item on the epic issue).
4. Record the slices + status on the PRD, then commit the `docs/prd/` changes (PRD dir, and the
   epic dir if touched):
   ```bash
   python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" set-slices <slug> <#a> <#b> ...
   python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz" set <slug> status issues-created
   ```

<issue-template>
## Part of
#<prd> (PRD: `docs/prd/<slug>/prd.md`)

## What to build
The API surface this slice adds (types / traits / fns / macro shape) **and its first
consumer**. Describe the surface precisely; inline a type/signature snippet when it encodes
the decision better than prose.

## Acceptance criteria
- [ ] surface compiles + doctest/unit passes
- [ ] first consumer (<plugin/host>) exercises it in a test
- [ ] (macros) trybuild/compile-fail cases pass

## Blocked by
- #<n> — <reason>   (or "None — can start immediately")
</issue-template>

After publishing, report: `#<n> · <title> · HITL|AFK · consumer: <x> · blocked-by: …` per
slice, the PRD issue number, and (if under an epic) the epic issue number with its updated
checklist.

## Error handling

- If `${CLAUDE_PLUGIN_ROOT}/scripts/forge_detect.sh` exits non-zero or emits no command, the
  repo has no recognised GitHub/Forgejo remote — surface its stderr and stop; don't invent CLI calls.
- If `auth_check` reports unauthenticated, tell the user to authenticate (`gh auth login` /
  `fgj login`) and stop before creating anything.
- If the injected `references/artifacts.md` is empty/missing, the repo isn't set up for this
  workflow — stop and say so rather than guessing the frontmatter schema or slice template.

## Constraints

- **kind:capability only** — abort on a feature PRD.
- **English**; **no speculative scope** — every surface names a consumer or it's deferred.
- **Tracker rule:** sub-issue parenting is epic-only; PRD↔slice and all ordering are native
  dependencies. The PRD issue never owns slices as sub-issues.
- Do not modify unrelated issues.
