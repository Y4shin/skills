---
type: deviation report
title: Deviation report for gated-tool-registration
status: stable
---

## Deviation report: gated-tool-registration

Reviewed against `docs/tasks/selective-repo-disable/architecture.md` (per-ticket
contract "gated-tool-registration exports") and the ticket doc's acceptance
criteria, comparing `main..ticket/gated-tool-registration` (commit e939886,
`src/pi.ts` + `tests/gate-factory.test.ts` only; no `task/` branch exists for
this ticket). The gate-factory suite was re-run for this report: 34/34 pass.

### API surface changes

- **Registered tool set (no deviation):**
  - **Planned:** gated repo registers exactly {tw_open, tw_close, tw_feedback,
    skill_validate, skill_scaffold, skill_discover, notify_user}; ungated repo
    keeps the full surface unchanged (AC 1, AC 2).
  - **Actual:** exactly that. `registeredNames` is a pure function of the gate
    result (the gated passive list plus the skill-creator trio vs
    `Object.keys(tools)`), driven by one shared `registerTool` loop;
    `notify_user` registers unconditionally. The exact-set factory tests pin
    both states, including registration shape (`defaultActive` true only for
    the opener and closer, `exposure: "direct"` for every gated name).
- **Write-lockdown condition (no deviation):**
  - **Planned:** the lockdown and the transcript declared-set replay key on an
    explicit "workflow enabled" predicate, not the raw gate boolean (AC 3,
    AC 4); refusal wording and the two exempt segments unchanged.
  - **Actual:** module-private `workflowEnabled(gate)` gates both
    `pi.on("tool_call", guardTaskTreeWrites)` and
    `restoreDeclaredSetFromTranscript`. `guardTaskTreeWrites`,
    `lockdownReason`, and `LOCKDOWN_EXEMPT_SEGMENTS` (`.work`,
    `deviation-reports`) are untouched; the diff only moves the registration
    site. Tests pin one `tool_call` handler ungated, none gated, and no
    `setActiveTools` call on gated resume.
- **Session-start peer-extension checks (deviation, ambiguity resolution):**
  - **Planned:** the architecture's session-start bullet says the
    pi-subagents / pi-telemetry checks "stay, since the package still depends
    on them for tw_feedback and the subagents in gated repos". The sentence
    does not say where they fire. The pre-existing code (and its pinning test
    "work repo skips session_start peer warnings") had them ungated-only,
    behind an early return in the gated branch. The ticket doc's What to
    build and acceptance criteria do not mention them at all.
  - **Actual:** the early return is gone; the checks now fire in both gate
    states, and the stale test was replaced by its inverse ("work repo (gate
    active) still emits the peer-extension warnings"). The implementer read
    "stay" as "keep firing in gated repos", which the justification clause
    supports: the peers are needed exactly there, now that `tw_feedback`
    registers in gated repos and the subagents launch there. Gate diagnostics
    notify in both states (unchanged behavior).
  - **Impact:** user-visible in gated repos only, at notify level: a work repo
    missing a peer now warns at session start instead of staying silent. No
    runtime or tool contract changes; no dependent-ticket impact beyond
    `repo-gating-docs-resync` needing to document the warnings firing in
    gated repos when it re-syncs `docs/repo-gating.md`.
- **No new public surface:** `GATED_REGISTERED_TOOLS`,
  `SKILL_CREATOR_TOOL_NAMES`, and `workflowEnabled` are module-private. The
  architecture's "Export to the next ticket" phrase is a handed-forward
  guarantee (a registered `tw_open` in both states for
  `tw-open-gated-restriction` to restrict), not a code export; `tw_open` is
  reachable through the normal `registerTool` surface, which is what the next
  ticket consumes.

### Abstraction usage

- Used/was specified: yes.
  - The gated manifest (`GATED_SKILL_NAMES` from `gated-skill-manifest`,
    `src/disclosure.ts`) is imported by the strip tests, replacing the stale
    local five-name fixture; exactly the blocked-by dependency the ticket
    declared.
  - The gate-factory stub seam was extended in place (dual-state exact-set,
    activation-shape, gated-resume-skip, lockdown-condition tests) rather than
    a second fixture style.
  - The existing refusal machinery (`lockdownReason`, exempt segments) moved
    behind the new condition verbatim; the opener, closer, feedback wrapper,
    and skill-creator tools register through the same shared loop as in
    ungated repos.

### Out-of-scope changes

- The peer checks firing in gated repos (detail above) is the only behavior
  outside the ticket's What to build list; everything else in the
  session-start restructure (removal of the early return, gate diagnostics in
  both states) is forced by it.
- Test-fixture surgery beyond the minimum, all inside the "stale fixture and
  its test are replaced" scope: `GATED_NAMES` renamed `FULL_TOOL_SURFACE` with
  its stale comment corrected, the strip fixture now includes a non-manifest
  package skill (`tdd`) next to `oracle`, and the "whole skills block
  removed" test was reworded from "the five" to "manifest skills".
- Nothing removed that the spec asked to keep. No changes outside `src/pi.ts`
  and `tests/gate-factory.test.ts`. `docs/repo-gating.md` is deliberately
  untouched (owned by `repo-gating-docs-resync`). The unstaged
  `docs/tasks/state.yaml` working-tree change (`task: gated-tool-registration`)
  is run-tracking noise, not part of the commit.

### Ticket doc update needed?

Yes. Create `## Implementation notes` in the ticket doc and append:

- The peer-checks reading: the session-start early return is gone, the
  pi-subagents and pi-telemetry warnings now fire in gated repos, and the old
  "work repo skips session_start peer warnings" test was inverted on purpose.
  If the orchestrator reads "stay" as "stay ungated-only", the revert is
  confined to the `session_start` handler and that one test.
- The new module-private names (`GATED_REGISTERED_TOOLS`,
  `SKILL_CREATOR_TOOL_NAMES`, `workflowEnabled`) carry no new exports; the
  next ticket consumes the registered `tw_open`, not an exported helper.
- `docs/repo-gating.md` still says work repos register no tools; stale until
  `repo-gating-docs-resync` lands, and no test pins that prose line.
- `tw_feedback` and the skill-creator tools register inactive in gated repos;
  whether pi-subagents' launch check accepts a registered-but-inactive
  allowlisted tool is verified against the pi-subagents source by
  `repo-gating-docs-resync`.

### User attention needed?

Yes, one narrow confirmation. The registered tool surface, the lockdown
condition, the replay skip, and the fixture replacement all match the spec
exactly, and `tw-open-gated-restriction`'s precondition (a `tw_open` registered
in both states) holds. The single item worth a human look: peer-extension
warnings now fire at session start in gated (work) repos, a deliberate inversion
of a previously pinned test based on an ambiguous architecture sentence. If the
reading is wrong, the revert is small (one handler, one test); if it is right,
the only follow-up is the doc re-sync.
