---
type: task
title: Capture the eval-stack facts into a durable findings file
status: stable
blocked_by: []
subtype: research
---

## Decision to settle

Establish the verified factual baseline that the eval-creator skill and its
documentation will be written against, and capture it in a durable,
citable findings file instead of letting it live only in session memory.

## Context

The opening research pass (session of 2026-09-12) already established the
core facts against primary sources. They now need to be consolidated:

- **Inspect AI**: an eval is a `Task` (Dataset + Solver + Scorer, optional
  `sandbox=`); `@task` registers it for `inspect eval`; solvers transform
  `TaskState` (message history, tools, output) and can be pipelines;
  scorers are `@scorer(metrics=[...])` async functions
  `(TaskState, Target) -> Score` that can run commands and read files
  inside the sandbox, return `CORRECT`/`INCORRECT`/`unscored`; built-ins
  include `match()`, `includes()`, `model_graded_qa/fact()`;
  `eval_set()` runs task matrices with retry/resume; every run writes a
  log browsable in `inspect view` and convertible to Pandas dataframes;
  Scanners review transcripts post-hoc; agent bridges route external
  harnesses' model calls through Inspect (in-process or sandboxed via
  localhost proxy) but were deliberately rejected here as the runner
  architecture (own-auth + local chosen instead, subject to the spike).
- **pi harness**: four modes (interactive, `-p` print, `--mode json`,
  `--mode rpc`); resource-narrowing flags `--no-extensions`, `--no-skills`,
  `--no-context-files`, `-e <path>`, `--skill <dir>`; non-interactive
  project trust via `--approve` or `defaultProjectTrust` in settings;
  custom providers via `~/.pi/agent/models.json` (or project-local
  `.pi/models.json`?); sessions as JSONL trees; full Node SDK
  (`createAgentSession`) as an alternative control path.
- **Prior art** at `~/Projects/agent-plugins-evals/`: own-auth + local
  architecture (its `agents.py` documents rejecting the inspect-swe
  bridge), fixture prep (copy to temp dir, strip `.git`, reinit, isolation
  files like `.pi/settings.json` `packages: []`, commit for `git_no_diff`),
  deterministic scorer families (output/file/command/git/tree), heuristic
  terminated-vs-needs-input classifier, structured simulated-user specs
  (opinions not instructions; simulator never decides pass/fail), and the
  `eval-authoring` skill's discipline (contract first, grade the outcome
  not the path, both directions, substring directionality, 3-trial rule,
  scorer-bug/skill-defect/spec-mismatch triage, reference solutions,
  saturation policy).

## The precise question

What are the verified facts, with primary-source citations, about (1) the
Inspect AI building blocks needed to run a headless-pi eval (Task/Solver/
Scorer APIs, `sandbox="local"`, samples metadata, log analysis), (2) pi's
headless invocation surface (exact flag set for hermetic runs and custom
model config), and (3) the prior-art patterns to port? Captured in one
findings file that the skill's body and references cite.

## The decision or task it unblocks

`build-eval-creator-skill` (the to-tickets feature task): its arch spec,
the scaffold's Python lib, and the docs page all draw from this file. It
also unblocks the isolation spike's design (flag set to test).

## Trusted source boundaries

- Official Inspect AI docs at `inspect.aisi.org.uk` (pages already read:
  index, tutorial excerpt, agents, agent-bridge, scoring, custom-scorers;
  also consult tasks/solvers/standard-scorers/eval-logs/eval-sets/
  parallelism/running pages) and the GitHub source at
  `github.com/UKGovernmentBEIS/inspect_ai` for API signatures.
- pi's own docs at `/nix/store/lvys4szjr1mqpqnrbkqhl7qkcl23mswc-pi-coding-agent-0.84.4/lib/node_modules/pi-monorepo/README.md`
  and `docs/` (cli reference, models/custom-provider, json/rpc mode, skills,
  packages, settings), plus `pi --help` output on this machine.
`pi --help` output.
- The prior-art repo at `~/Projects/agent-plugins-evals/` (its
  `docs/eval-design.md`, `AGENTS.md`, `inspect_src/*.py`, and
  `.pi/skills/eval-authoring/`), read as source, not copied wholesale.

## Evidence required for completion

- `docs/tasks/eval-stack-research/findings.md` exists, structured in three
  sections (Inspect, pi, prior art), every claim cited to the specific
  doc page or file that owns it.
- Exact API signatures verified in the installed Inspect version (via pip
  inspection or GitHub source), not from memory of the docs prose.
- pi's headless flags verified against `pi --help` and the CLI reference
  doc page on this machine, including how `--skill <dir>` and `-e <path>`
  interact with `--no-skills`/`--no-extensions`, and how project-local vs
  global `models.json` works.
- A short "ported patterns" subsection mapping each prior-art pattern to
  its planned use in the eval-creator scaffold.

## Likely dependent tasks

- `build-eval-creator-skill` (feature; consumes the findings as its factual
  baseline).
- `pi-headless-isolation-spike` (prototype; uses the verified flag set and
  the `--skill`/`-e` semantics to design the isolation probe).
