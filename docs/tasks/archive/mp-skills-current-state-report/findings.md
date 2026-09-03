# mp-skills-current-state-report — findings

> The canonical, self-contained report for the `adopt-mp-skills-way` map.
> Source: a fresh clone of `https://github.com/mattpocock/skills` at pinned
> commit `6654f6b` (short `6654f6b60cd9d5be8b54c6fafe44346dabeb3b76`),
> cloned 2026-09-03, kept at `docs/tasks/mp-skills-current-state-report/matt-skills/`
> (gitignored, see `.gitignore`). Comparison target: this repo at
> `github.com/Y4shin/skills`, HEAD `a3165f9`, `task-workflow` v2.10.0.
>
> Starting reference (not source of truth): the archived
> `compare-to-mp-skills` map and its `compare-to-mp-skills.md` doc, which
> compared against an old Matt commit (origin/main at `4a9139e`, our v2.5.3
> era). This report re-derives current state and flags what is new/changed
> since then.

---

## 1. Clone provenance

- **Clone command:**
  ```bash
  git clone --depth=1 https://github.com/mattpocock/skills.git \
    docs/tasks/mp-skills-current-state-report/matt-skills
  ```
- **Pinned commit:** `6654f6b60cd9d5be8b54c6fafe44346dabeb3b76` (short `6654f6b`)
- **Clone date:** 2026-09-03T16:43:27Z
- **Branch:** `main`
- **Repo version:** `mattpocock-skills@1.2.3` (`package.json`)
- **Gitignore entry added** to this repo's `.gitignore`:
  ```
  docs/tasks/mp-skills-current-state-report/matt-skills/
  ```
  The clone persists (gitignored) so grilling #1 and #2 can re-open source
  files at the pinned commit. To reproduce on another machine, run the clone
  command above and `git -C <clone> checkout 6654f6b` (a shallow clone pins to
  the tip at clone time; the full hash above is the exact tree).

---

## 2. Inventory — every skill in Matt's repo (at `6654f6b`)

37 skills total across 5 bucket folders. Bucket layout and promotion rules
(see §4) decide which ship. **Promoted** = `engineering/` (18) + `productivity/`
(7) = 25 skills that ship in the plugin and get docs pages. **Not promoted** =
`misc/` (4) + `in-progress/` (8) + `deprecated/` (0) = 12 skills that do not.

Every promoted skill has an `agents/openai.yaml` (Codex UI metadata +
invocation policy) beside its `SKILL.md`.

### engineering/ (18) — daily code work, promoted

| Skill | Invocation | One-line purpose | Companion docs |
|---|---|---|---|
| ask-matt | user | Router over the user-invoked skills; maps intent to flows | `PHASE-BOUNDARIES.md` |
| grill-with-docs | user | Grilling session that also builds domain model (CONTEXT.md + ADRs) inline | — |
| triage | user | Move issues/PRs through a triage-role state machine; write agent briefs | `AGENT-BRIEF.md`, `OUT-OF-SCOPE.md` |
| improve-codebase-architecture | user | Scan codebase for deepening opportunities → visual HTML report → grill picked one | `HTML-REPORT.md` |
| setup-matt-pocock-skills | user | One-time per-repo config: issue tracker, triage labels, domain doc layout | `domain.md`, `issue-tracker-{github,gitlab,local}.md`, `triage-labels.md` |
| to-spec | user | Synthesize current conversation into a spec; publish to tracker; no interview | — |
| to-tickets | user | Break plan/spec/convo into tracer-bullet tickets with blocking edges; publish | — |
| implement | user | Build work from a spec/tickets; drives `/tdd` at seams; closes with `/code-review` | — |
| wayfinder | user | Plan huge/foggy work as a shared map of **decision tickets**; produce decisions not deliverables | — |
| prototype | model | Throwaway code answering one design question (logic HTML or toggleable UI variants) | `LOGIC.md`, `UI.md` |
| diagnosing-bugs | model | 6-phase disciplined diagnosis loop; red-capable feedback loop is the core | `scripts/hitl-loop.template.sh` |
| research | model | Background agent investigates a question against primary sources → cited Markdown | — |
| tdd | model | Red→green reference: good tests, seams, anti-patterns, loop rules | `tests.md`, `mocking.md` |
| domain-modeling | model | Actively build/sharpen domain model: challenge terms, edge-case scenarios, write CONTEXT.md/ADRs | `CONTEXT-FORMAT.md`, `ADR-FORMAT.md` |
| codebase-design | model | Deep-module vocabulary (module, interface, depth, seam, adapter, leverage, locality) + principles | `DEEPENING.md`, `DESIGN-IT-TWICE.md` |
| code-review | model | Two-axis review (Standards + Spec) of diff since a fixed point; parallel sub-agents | — |
| resolving-merge-conflicts | model | Resolve an in-progress merge/rebase hunk-by-hunk by intent; never `--abort` | — |
| wizard | model | Generate interactive bash wizard for steps only a human can perform | `template.sh` |

### productivity/ (7) — non-code workflow, promoted

| Skill | Invocation | One-line purpose | Companion docs |
|---|---|---|---|
| grill-me | user | Stateless relentless interview (no repo needed) | — |
| handoff | user | Compact current conversation into a handoff doc for another agent | — |
| teach | user | Teach a concept over multiple sessions; stateful workspace | `GLOSSARY-FORMAT.md`, `LEARNING-RECORD-FORMAT.md`, `MISSION-FORMAT.md`, `RESOURCES-FORMAT.md` |
| to-questionnaire | user | Turn a decision into a questionnaire for someone else to fill in | — |
| wait-what | user | Re-pitch a message that didn't land, in plain English using CONTEXT.md | — |
| grilling | model | The reusable interview primitive: rounds, frontier, facts=agent's job, decisions=user's | — |
| writing-for-agents | model | Reference for writing docs agents consume: skills, AGENTS.md, pointed docs | `SKILL-MECHANICS.md` |

### misc/ (4) — kept but rarely used, NOT promoted (no plugin, no docs)

| Skill | Invocation | One-line purpose |
|---|---|---|
| git-guardrails-claude-code | model | Claude Code hooks to block dangerous git commands |
| migrate-to-shoehorn | model | Migrate test files from `as` assertions to shoehorn |
| scaffold-exercises | model | Create exercise directory structures (sections/problems/solutions) |
| setup-pre-commit | model | Set up Husky + lint-staged pre-commit hooks |

### in-progress/ (8) — beta, public on purpose, NOT promoted

| Skill | Invocation | One-line purpose |
|---|---|---|
| loop-me | user | Grill yourself into implementable workflow specs; stateful workspace |
| writing-beats | user | Shape an article as a journey of beats (choose-your-own-adventure) |
| writing-fragments | user | Mine raw fragments of writing into a document |
| writing-shape | user | Shape raw material into an article paragraph by paragraph |
| claude-handoff | user | Handoff to a fresh background Claude agent via `claude --bg` |
| setup-ts-deep-modules | user | Wire dependency-cruiser so each TS package is a deep module |
| implement-spec | user | Implement a whole spec on one branch as a **task graph**; concurrent implementer subagents across the frontier; single PR |
| retro | user (stub) | Suggest improvements to the agent's environment after a session (design notes only) |

### deprecated/ (0) — empty; a retired skill is deleted, the changeset names its replacement

---

## 3. Concepts catalog — the reusable ideas Matt's skills encode

Each concept with the skill that owns it and a 2-3 line summary.

- **Grilling (rounds/frontier design tree)** — owned by `grilling` (model).
  Map a subject as a design tree; work in rounds where the *frontier* is every
  decision whose prerequisites are settled; ask the whole frontier per round
  with a recommended answer; facts are the agent's job, decisions are the
  user's; done when the frontier is empty. The primitive behind `grill-me`,
  `grill-with-docs`, `triage`, `wayfinder`, `improve-codebase-architecture`.

- **Domain modeling (active glossary + ADR discipline)** — owned by
  `domain-modeling` (model). Actively challenge terms against `CONTEXT.md`,
  sharpen fuzzy language, stress-test with edge-case scenarios, write the
  glossary and ADRs the moment they crystallize. `CONTEXT.md` is a glossary,
  never a spec. ADRs only when hard-to-reverse AND surprising AND a real
  trade-off.

- **Deep-module design vocabulary** — owned by `codebase-design` (model).
  Terms: module, interface, depth, seam, adapter, leverage, locality.
  Principles: the deletion test, "the interface is the test surface," "one
  adapter = hypothetical seam, two = real." A reference other skills
  (`tdd`, `improve-codebase-architecture`) pull in by calling the Skill tool.

- **Two-axis code review (Standards + Spec)** — owned by `code-review` (model).
  Standards (repo coding standards + a fixed 12-smell Fowler baseline) and
  Spec (faithfully implements the originating issue) run as **parallel
  sub-agents** so neither pollutes the other; reported side by side, never
  merged/reranked. A change can pass one axis and fail the other.

- **6-phase debugging discipline** — owned by `diagnosing-bugs` (model).
  (1) Build a **tight, red-capable feedback loop** (the core; refuse to
  theorize without it) → (2) reproduce + minimise → (3) hypothesise 3-5 ranked
  falsifiable → (4) instrument one variable at a time → (5) fix + regression
  test (if a correct seam exists) → (6) cleanup + post-mortem. Phases skippable
  with justification; Phase 1 non-skippable.

- **TDD reference discipline** — owned by `tdd` (model). Good tests verify
  behavior through public interfaces (seams); anti-patterns
  (implementation-coupled, tautological, horizontal slicing); red before green;
  one slice at a time; **refactoring is not part of the loop** — it belongs to
  the review stage. Test only at pre-agreed seams.

- **Tracer-bullet vertical slicing** — owned by `to-tickets` (user). Each
  ticket cuts a narrow but COMPLETE path through every layer, is demoable on
  its own, sized to one fresh context window. Exception: wide refactors
  sequence as expand–contract. Each ticket declares its blocking edges.

- **Issue-tracker-backed planning** — owned by `wayfinder` + `to-tickets` +
  `triage` + `setup-matt-pocock-skills`. Maps/tickets/specs/agent-briefs are
  **issues on a tracker** (GitHub/GitLab/local `.scratch/`), not files in
  `docs/tasks/`. Blocking uses the tracker's native dependency relationship.
  The tracker is configured once by `setup-matt-pocock-skills`.

- **Fog of war / Not-yet-specified** — owned by `wayfinder` (user). The map is
  deliberately incomplete; in-scope-but-not-sharp-enough questions live in a
  **Not yet specified** section and graduate into tickets as the frontier
  advances. Distinct from **Out of scope** (ruled out by the destination).

- **Decision tickets, not deliverables** — owned by `wayfinder` (user).
  Wayfinder produces **decisions**, not deliverables; the pull to "just do the
  work" is the signal you've reached the edge of the map and it's time to hand
  off. An effort can override this in Notes, but absent that, plan, don't do.

- **Phase boundaries (context hygiene)** — owned by `ask-matt` +
  `PHASE-BOUNDARIES.md`. At a phase boundary: Continue | `/clear` | `/handoff`
  | Subagent | `/compact`, in that ordered tree. `/compact` is the **default
  but not the first reach**. Continue costs nothing, so rule it out first.
  "Smart zone" (~150k tokens) guides when to act.

- **Leading words** — owned by `writing-for-agents` (model). A compact concept
  from the model's pretraining (_tight_, _red_, _fog of war_, _tracer bullet_,
  _seam_, _deep module_) repeated as a token anchors a region of behaviour in
  the fewest tokens by recruiting priors the model already holds. Negation is
  the adjacent failure mode (steer by the positive).

- **Progressive disclosure / information hierarchy** — owned by
  `writing-for-agents` (model). In-file step > in-file reference > disclosed
  reference (behind a context pointer). Push down to protect the hierarchy;
  inline what every branch needs, disclose what only some branches reach.

- **Throwaway prototype answering one question** — owned by `prototype`
  (model). Throwaway code that answers a question: logic (single shareable
  HTML) or UI (toggleable variants on one route). No persistence by default,
  no tests, skip polish. Capture the answer; keep the prototype as a primary
  source on a branch out of main.

- **Issue-tracker triage state machine** — owned by `triage` (user). Two
  category roles (bug/enhancement) × five state roles (needs-triage,
  needs-info, ready-for-agent, ready-for-human, wontfix). Every AI triage
  comment starts with a disclaimer. Redundancy + prior-rejection checks
  against `.out-of-scope/` before grilling.

- **Wizard (human-only steps)** — owned by `wizard` (model). Generate an
  interactive bash script for steps only a human can perform (provisioning,
  credentials, unfamiliar dashboards). Model-invoked so the agent reaches for
  it the moment it hits a wall only a human can pass.

- **Skill-tool invocation convention** — owned by `.agents/invocation.md`.
  Dependencies between skills are expressed as "Call the Skill tool with
  `<name>`" (operative instruction), not `/name` prose or deep `../` file
  cross-references. One skill per call. Only works for model-invoked skills;
  user-invoked skills are phrased as instructions for the human.

---

## 4. Format & conventions

### Directory layout

```
mattpocock/skills/
├── skills/
│   ├── engineering/   (18, promoted)
│   ├── productivity/  (7,  promoted)
│   ├── misc/          (4,  not promoted)
│   ├── in-progress/   (8,  not promoted, beta)
│   └── deprecated/   (0,  not promoted)
├── docs/
│   ├── engineering/   (mirrors skills/engineering, one .md per skill)
│   └── productivity/ (mirrors skills/productivity)
├── .agents/
│   ├── adr/           (repo-level ADRs)
│   ├── invocation.md
│   ├── writing-docs.md
│   └── install-block.md
├── .out-of-scope/      (rejected-requests KB read by triage)
├── .claude-plugin/     (plugin.json + marketplace.json)
├── .changeset/         (changesets versioning)
├── scripts/            (link-skills.sh, list-skills.sh, sync-plugin-version.mjs)
├── CONTEXT.md          (this repo's own domain glossary)
├── CLAUDE.md           (repo conventions for the agent; AGENTS.md → symlink)
├── AGENTS.md -> CLAUDE.md
├── README.md           (the reference: skills grouped user/model-invoked)
├── CHANGELOG.md
└── package.json        (mattpocock-skills@1.2.3)
```

### Promotion rules (from `CLAUDE.md`)

- **Promoted** = `engineering/` + `productivity/`. A promoted skill MUST have:
  (a) an entry in top-level `README.md`, (b) an entry in
  `.claude-plugin/plugin.json`'s `skills` array, (c) a docs page at
  `docs/<bucket>/<name>.md`, (d) an `agents/openai.yaml`.
- **Not promoted** = `misc/`, `in-progress/`, `deprecated/`. Must NOT appear
  in `README.md` or `plugin.json`. Get no docs page. `in-progress/` is
  installable via skills.sh one-skill form but excluded from the plugin.
- `deprecated/` is empty by policy: a retired skill is deleted, and the
  changeset that removes it names the replacement.

### SKILL.md frontmatter fields

```yaml
---
name: <skill-name>
description: <one line — model-facing with trigger phrasing for model-invoked; human-facing summary for user-invoked (trigger lists stripped)>
disable-model-invocation: true   # present ONLY for user-invoked
argument-hint: "<hint>"            # optional, for skills taking an arg
---
```

That's it. No `metadata:`, no `type:`, no `map:`, no `slug:`, no `status:`.
Matt's skills are **not** tasks; they have no task-type system. (Contrast:
this repo's `task.md` files carry `kind/type/slug/map/status/blocked_by`.)

### Invocation model split (the one axis)

From `.agents/invocation.md`:

- **User-invoked:** `disable-model-invocation: true` in frontmatter **AND**
  `policy.allow_implicit_invocation: false` in `agents/openai.yaml`. Reachable
  only by the human typing the name. Description is human-facing (no trigger
  lists). A user-invoked skill may invoke model-invoked skills but NEVER
  another user-invoked one.
- **Model-invoked:** omit `disable-model-invocation` and the `policy` block.
  Reachable by model or user. Description keeps rich trigger phrasing ("Use
  when the user wants…") so auto-invocation fires.
- The two harness representations stay in sync (user-invoked in both or
  neither).

### `agents/openai.yaml` (every promoted skill has one)

```yaml
interface:
  display_name: "TDD"
  short_description: "Test-driven red-green-refactor"
# for user-invoked only:
policy:
  allow_implicit_invocation: false
```

This is **Codex UI metadata** — the skill picker display name + short
description, and the invocation policy. No harness-neutral equivalent exists
in this repo today.

### Dependency convention between skills

From `.agents/invocation.md`: dependencies are expressed as an explicit
instruction to **call the Skill tool** with the named skill
("Call the Skill tool with `grilling`"), not deep `../other/FILE.md`
cross-references and not bare `/name` prose. One skill per call. This only
works for **model-invoked** skills; a user-invoked skill is phrased as an
instruction for the human ("tell the user to run `/setup-matt-pocock-skills`").

### Repo-root docs

- `CONTEXT.md` — this repo's own domain glossary (issue tracker, issue,
  decision ticket, triage role; relationships; flagged ambiguities). The
  **template** for per-repo `CONTEXT.md` that `domain-modeling` writes.
- `CLAUDE.md` — repo conventions for the agent (bucket layout, promotion
  rules, docs-page rules, invocation split, `ask-matt` re-sync trigger,
  `scripts/link-skills.sh`, no-em-dashes rule). `AGENTS.md` is a symlink to
  it.
- `.agents/adr/` — repo-level ADRs (2 today: explicit-setup-pointer split;
  ship-as-Claude-plugin).
- `.out-of-scope/` — rejected-requests KB (3 files); `triage` checks it for
  prior rejection.
- `.agents/{invocation,writing-docs,install-block}.md` — convention docs.

### Docs-page convention (`.agents/writing-docs.md`)

Promoted skills get a human-facing page at `docs/<bucket>/<name>.md`,
published at `https://aihero.dev/skills-<name>`. Fixed frame: **What it does**
(lead with the defining constraint), **When to reach for it** (invocation
mode + trigger boundary), **Where it fits** (role + neighbours + link to
`ask-matt`). Optional: **Prerequisites**, free-form middle, **Common
questions** (hunted from a personal wiki + repo issues + changelog, sized to
evidence), **It's working if** (checkable without opening SKILL.md). No H1;
no author attribution; all links absolute; branches in tables/lists not
paragraphs.

### Prose rule

No em-dashes anywhere in repo prose (SKILL.md, docs, README, CHANGELOG, ADRs,
changesets, comments). Rewrite with comma/colon/period/parens/conjunction.

---

## 5. Diff vs the prior snapshot — what's new or changed since the old comparison

The archived `compare-to-mp-skills.md` (against Matt @ old commit) is the
baseline. At `6654f6b` the repo is **substantially larger and more
structured**. Material deltas:

### 5a. New skills / structures not in the old comparison

- **`agents/openai.yaml` beside every promoted SKILL.md.** The old comparison
  noted "no explicit agent definitions" and harness targets as "Claude Code
  plugin + skills.sh." Now every promoted skill carries Codex UI metadata +
  invocation policy in `openai.yaml`. This is a **second harness
  representation** that must stay in sync with `disable-model-invocation`.
  **New convention this repo has no equivalent of.**
- **`misc/` bucket (4 skills):** `git-guardrails-claude-code`,
  `migrate-to-shoehorn`, `scaffold-exercises`, `setup-pre-commit`. The old
  comparison's structure table listed only engineering/productivity/misc/
  in-progress/deprecated but did not enumerate `misc/`. These are real,
  promoted-adjacent, model-invoked, not-in-plugin skills.
- **`writing-for-agents` (productivity, model)** + companion
  `SKILL-MECHANICS.md`. This is the **reference for writing skills/docs
  themselves** — context pointers, information hierarchy, leading words,
  progressive disclosure, pruning, no-ops, negation. The old comparison did
  not list it. It is the meta-skill that governs how all other skills are
  written. **Highly relevant to "largely adopt Matt's way."**
- **`teach` (productivity, user)** with 4 companion format docs
  (GLOSSARY/LEARNING-RECORD/MISSION/RESOURCES). Multi-session teaching skill.
  The old comparison listed `/teach` as an edge-case utility; it now has a
  rich companion-doc structure.
- **`implement-spec` (in-progress, user).** A **graph-based concurrent
  implementer**: reads a spec + tickets as a **task graph with blocking
  relationships**, runs implementer subagents across the ready frontier for
  **maximum concurrency** in separate worktrees/branches, merges via merger
  subagents, ends with `/code-review` on the PR. **This is Matt's closest
  analogue to our `implement-task`** and was not in the old comparison. It is
  in-progress (not promoted), but it is the design that most directly
  overlaps our pipeline.
- **`setup-ts-deep-modules` (in-progress, user):** dependency-cruiser config so
  each TS package is a deep module (implementation hidden, reachable only via
  entry points). Enforces the `codebase-design` vocabulary in tooling.
- **`loop-me`, `writing-beats`, `writing-fragments`, `writing-shape`,
  `claude-handoff`, `retro` (in-progress):** writing-flow and handoff
  experiments; `retro` is a stub.
- **`.out-of-scope/` directory** (3 files) as a rejected-requests KB that
  `triage` checks. The old comparison did not mention it.
- **`.changeset/` versioning** (changesets CLI) + `scripts/sync-plugin-version.mjs`
  keeping `.claude-plugin/plugin.json`'s `version` in sync with `package.json`.
  The old comparison listed "no release automation"; Matt now has changesets.
- **`CONTEXT.md` at Matt's repo root** (his own glossary) + `CLAUDE.md` +
  `AGENTS.md` symlink. The old comparison noted "internal ADRs in `.agents/adr`"
  but not a root `CONTEXT.md`/`CLAUDE.md`.

### 5b. Changed concepts / sharpened conventions

- **Wayfinder is now strictly "decisions, not deliverables" and explicit about
  the handoff.** The old comparison captured "Produce decisions, not
  deliverables." At `6654f6b` this is sharper: the map is an **index, not a
  store**; tickets are child issues; blocking uses the tracker's **native**
  dependency relationship; "Refer by name" (never bare ids); explicit **Fog of
  war** vs **Out of scope** sections; **never resolve more than one ticket per
  session** (except research); chart-the-map vs work-through-the-map modes.
- **`grill-with-docs` is now a one-liner** ("Call the Skill tool twice, for
  `grilling` and `domain-modeling`"). The old comparison described it as a
  rich skill. At `6654f6b` it is a **thin user-invoked wrapper** that composes
  two model-invoked primitives. This is the "user-invoked skill invokes
  model-invoked skills, never another user-invoked one" rule made concrete.
- **TDD now explicitly excludes refactoring from the loop** ("Refactoring is
  not part of the loop. It belongs to the review stage"). The old comparison
  noted red-green-refactor; Matt has moved refactor OUT of tdd into
  code-review. (Our `compare-to-mp-skills` grilling already decided to move
  refactor to implement-task Step 3 — so **we already diverged in the same
  direction Matt later went**, but our `/tdd` skill text may still say
  red-green-refactor. See §7.)
- **`to-tickets` adds the wide-refactor expand–contract exception** to
  vertical slicing. Not in the old comparison.
- **`code-review` now carries an explicit 12-smell Fowler baseline** as a
  fixed floor, with "the repo overrides" and "always a judgement call" rules.
  The old comparison noted "12-smell Fowler baseline" loosely; it is now
  spelled out in the skill.
- **`setup-matt-pocock-skills` is now the explicit precondition** for the
  hard-dependency skills (`to-tickets`, `to-spec`, `triage`), with a
  soft-dependency split (ADR 0001) for `diagnosing-bugs`, `tdd`,
  `improve-codebase-architecture`. The old comparison listed setup as a
  config skill but not the hard/soft split.

### 5c. The biggest structural delta: tracker-backed, not docs/tasks/-backed

The single largest difference the old comparison *under*-weighted: Matt's
planning artifacts (maps, tickets, specs, agent-briefs) are **issues on an
issue tracker** (GitHub/GitLab/local `.scratch/`), configured once by
`setup-matt-pocock-skills`. Our artifacts are **files under `docs/tasks/`**
managed by the `task_*` tools. This is not a skill difference; it is a
**substrate difference**. "Largely adopt Matt's way" does not force a
substrate change (the `task_*` tools have no Matt equivalent and are
foundational — see map constraints), but it *does* force a decision about
whether the skills should speak tracker-language or docs/tasks-language, and
whether repos using this workflow need a `docs/agents/` config dir.

---

## 6. What Matt has that we do not (refreshed) / What we have that Matt does not (refreshed)

### Matt has, we lack

| Feature | Matt's mechanism | Notes |
|---|---|---|
| Issue-tracker-backed planning | `wayfinder`/`to-tickets`/`triage` write issues to a tracker | Substrate difference; we use `docs/tasks/` files |
| `setup-matt-pocock-skills` per-repo config | Configures issue tracker + triage labels + domain doc layout → `docs/agents/*.md` | Our `onboard-workflow` creates `docs/tasks/` scaffold instead |
| `to-spec` + `to-tickets` two-phase handoff | Explicit spec then tracer-bullet tickets with blocking edges | We eliminated this ("map+tasks ARE the spec") |
| `ask-matt` intent router | User-invoked router mapping intent to flows + phase boundaries | We have `task-workflow-overview` (routes to task_* tools) |
| Human-facing docs pages | `docs/<bucket>/<name>.md` published at aihero.dev, 4-section template | We ship none |
| `agents/openai.yaml` per skill | Codex UI metadata + invocation policy | We have no equivalent (Pi-native) |
| `writing-for-agents` meta-skill | Reference for writing skills/docs: pointers, hierarchy, leading words, pruning | We have `skill-creator` (scaffolding) but not this writing-discipline reference |
| Bucket/promotion layout | engineering/productivity/misc/in-progress/deprecated + promotion rules | We have a flat `skills/` list in `package.json` |
| `.out-of-scope/` rejected-requests KB | `triage` checks it for prior rejection | We have `docs/bugs/` but no rejected-requests KB |
| Changesets versioning | `.changeset/` + sync-plugin-version | We have `scripts/release.sh` |
| No-em-dashes prose rule | Repo-wide convention in `CLAUDE.md` | We have no such rule |
| `prototype` (logic HTML / UI variants) | Throwaway code answering one design question, 2 branches | We have a `prototype` *task type* but no `prototype` skill |
| `research` as background agent | Model-invoked, runs as a background agent, cited Markdown | We have a `research` *task type* (orchestrator does it) |
| `wizard` human-steps bash generator | Model-invoked, interactive bash for human-only steps | We lack this entirely |
| `resolving-merge-conflicts` | Model-invoked, hunk-by-hunk by intent, never `--abort` | We lack this |
| `triage` state machine | Issue/PR triage roles + agent briefs | We have `report-bug` (intake) only |
| `grill-me` stateless interview | User-invoked, no repo needed | We have `grilling` + `grilling-with-ui` but no stateless wrapper |
| `handoff` / `to-questionnaire` / `teach` | Productivity utilities | We deferred/ lack these (`wait-what` we have) |
| `PHASE-BOUNDARIES.md` context hygiene | Continue/clear/handoff/subagent/compact ordered tree | We do not address context management |
| `implement-spec` concurrent graph implementer (in-progress) | Task graph + concurrent implementer subagents + merger subagents | Our `implement-task` is the closest analogue (we already do this) |

### We have, Matt lacks

| Feature | Our mechanism | Notes |
|---|---|---|
| First-class task type system (6 types) | `type:` frontmatter + per-type planning/execution resources | Matt has wayfinder ticket types (research/prototype/grilling/task) only |
| Dependency-aware work graph via tools | `task_dependency_levels`, `task_frontier` tools (BFS) | Matt uses tracker native blocking; no tooling |
| Map finalization (auto-archive last child) | `finalize-task` Step 8 | Matt has no finalization step |
| Bug closure pipeline | `finalize-task` Step 6 | Matt has no bug closure |
| Knowledge harvest into project docs | `finalize-task` Step 3 | Matt has no harvest |
| Automated changelog entry | `finalize-task` Step 4 | Matt's changelog is changesets-driven, not per-task |
| CI gate before merge (fix-forward) | `finalize-task` Step 1 | Matt's `implement` commits to current branch; no gate |
| Size-based turn budgets (S/M/L/XL) | task frontmatter `size:` | Matt sizes to "one fresh context window" informally |
| Checkpoint commits per GREEN | `tdd-worker` agent | Matt's tdd is a reference, no checkpoint commits |
| Defined sub-agents with YAML frontmatter | 6 agent definitions (tdd-worker, slice-verifier, etc.) | Matt references sub-agents but no formal definitions |
| Failure toolbelt (diagnose→split→retry→escalate) | feature/bug resources | Matt has no structured failure recovery |
| Verifier retry path | slice-verifier → re-dispatch | Matt has no verifier |
| Deviation reporter (spec vs implementation) | `deviation-reporter` agent | Matt has no equivalent |
| Pi extension with custom tools | `src/pi.ts` + `src/core/` | Matt uses Claude Code built-ins only |
| Repo-gate (auto-disable in work repos) | `src/core/repo-gate.ts` | Matt has no equivalent |
| Telemetry instrumentation | `telemetry_skill_context` + `submit_feedback` everywhere | Matt has none |
| `skill-creator` (scaffolding + validating skills) | `skills/skill-creator` + helper scripts | Matt has no scaffolding skill (he writes by hand per `writing-for-agents`) |
| `grilling-with-ui` (browser-visualized grilling) | `skills/grilling-with-ui` + CLI | Matt's grilling is plain text |
| `task-workflow-doctor` (diagnose broken workflow) | `skills/task-workflow-doctor` | Matt has no doctor |
| `improve-codebase-architecture` (shipped, ours) | `skills/improve-codebase-architecture` | Matt has the same-named skill; ours was built from his pattern |
| Release automation | `scripts/release.sh` | Matt uses changesets (different, not absent) |

---

## 7. Already-adopted check — our shipped versions vs Matt's current

The prior `compare-to-mp-skills` map adopted these from Matt. For each, does
our shipped version still match Matt's current (`6654f6b`) version, or has it
diverged?

| Adopted item | Our shipped version | Matt's current | Status |
|---|---|---|---|
| `grilling` | `skills/grilling/SKILL.md` — credits Matt's canonical URL, has rounds/frontier/`ask_user_question` format, "facts are agent's job" | Same primitive, same URL, now ~25 lines (terser); uses `❓ Q1` format, `Call the Skill tool` convention | **Aligned in spirit; ours is longer and Pi-native (uses `ask_user_question`)**. Matt's is harness-neutral. Re-open: should ours adopt Matt's terser form + "Call the Skill tool" wording? |
| `domain-modeling` | `skills/domain-modeling/SKILL.md` | Matt's has `CONTEXT-FORMAT.md`/`ADR-FORMAT.md` companions, multi-context `CONTEXT-MAP.md` support, explicit "offer ADRs sparingly" 3-criteria | **Likely diverged** — verify ours has the companion formats + the 3 ADR criteria. Re-open. |
| `codebase-design` | `skills/codebase-design/SKILL.md` | Matt's has glossary, deep/shallow diagrams, `DEEPENING.md`, `DESIGN-IT-TWICE.md` | **Likely aligned** — verify companion docs present. Re-open. |
| `code-review` | `skills/code-review/SKILL.md` (two-axis) | Matt's now has explicit 12-smell baseline + "repo overrides" + "always judgement call" rules + parallel sub-agent prompts | **Likely diverged** — verify ours has the 12-smell baseline spelled out. Re-open. |
| `diagnosing-bugs` | `skills/diagnosing-bugs/SKILL.md` | Matt's 6 phases unchanged; now has `scripts/hitl-loop.template.sh` companion + Redact section | **Likely aligned** — verify hitl-loop template + redact. Re-open. |
| `tdd` (reference skill) | `skills/tdd/SKILL.md` + `tests.md`/`mocking.md` | Matt's now **excludes refactor from the loop** ("belongs to review") | **Possibly diverged** — our prior grilling decided to move refactor to implement-task Step 3, same direction; verify our `/tdd` text says red→green (not red-green-refactor). Re-open. |
| `improve-codebase-architecture` | `skills/improve-codebase-architecture/SKILL.md` + architecture-scout agent + HTML report | Matt's uses Tailwind+Mermaid CDN, OS-temp-dir report, grilling loop | **Likely aligned** (we vendored CDN per prior grilling). Verify. |
| `task-workflow-doctor` | `skills/task-workflow-doctor/SKILL.md` | Matt has no equivalent | **Ours only** — keep. |
| `report-bug` | `skills/report-bug/SKILL.md` | Matt has `triage` (different: issue state machine, not bug intake) | **Different function** — re-open whether to adopt `triage`. |

**Summary:** most adopted items are aligned in spirit but may have diverged in
text/companion-docs since the old comparison. Grilling #1 should re-decide
each "re-open" row: re-align to Matt's current text, keep our divergence with a
stated reason, or merge. The highest-leverage re-opens are `grilling` (terser
form + Skill-tool wording), `code-review` (12-smell baseline), and `tdd`
(refactor-out-of-loop wording).

---

## 8. Confidence and unresolved questions

- **High confidence:** the inventory (§2), concepts (§3), format/conventions
  (§4), and diff (§5) are read directly from the pinned clone. The
  already-adopted check (§7) is **medium confidence** — it is based on the
  prior comparison's claims about what we shipped, not a fresh diff of our
  current skill files against Matt's. Grilling #1 should re-verify §7 against
  our actual `skills/*/SKILL.md` before deciding.
- **Unresolved for grilling #1:**
  - The substrate question (tracker-backed vs `docs/tasks/`-backed) is the
    largest unblocked decision and shapes everything downstream. The map's
    constraints already say the `task_*` tools are foundational and stay, so
    the question is narrower: do the *skills* speak tracker-language or
    docs/tasks-language, and do repos need a `docs/agents/` config dir?
  - Whether `writing-for-agents` (Matt's meta-skill for writing skills) should
    replace or extend our `skill-creator`. Both write skills; they differ in
    approach (Matt: writing discipline/vocabulary; ours: scaffolding +
    validation scripts).
  - Whether to adopt Matt's bucket/promotion layout
    (engineering/productivity/misc/in-progress/deprecated) over our flat
    `skills/` list. This reshapes the repo and the migration.
  - Whether the no-em-dashes prose rule and `agents/openai.yaml` convention
    apply (the latter is Codex-specific; we are Pi-native — likely out of
    scope as a convention, but the invocation-policy *concept* may map to
    Pi's `disable-model-invocation`).
- **Unresolved for grilling #2:** the create-vs-reuse split for the migration
  skill (extend `onboard-workflow` vs new `migrate-workflow`), and how the
  migration consumes grilling #1's decision table as its target-state spec.

This research records discoveries only; it creates no tasks. Newly-sharp
items graduate from the map's Fog during grilling #1.
