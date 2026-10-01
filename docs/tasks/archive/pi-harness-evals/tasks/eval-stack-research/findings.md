---
title: Eval stack facts (Inspect AI, pi harness, prior art) with verified citations
date: 2026-09-11
type: findings
status: stable
---

# Eval stack findings

Verified baseline for the eval-creator skill. Three primary sources were
used: the installed Inspect AI package (`inspect-ai==0.3.263`, pip venv at
`/tmp/inspect-research-venv`), the installed pi binary (`pi --version`
-> `0.84.4`), and the completed isolation spike
(`docs/tasks/pi-headless-isolation-spike/findings.md`), whose empirical
results are the authoritative citation for the hermetic-run flag
semantics; this file references them rather than re-deriving them.
Inspect docs were read from a depth-1 clone of
`github.com/UKGovernmentBEIS/inspect_ai` (HEAD `03befb4`, 2026-09-11) at
`/tmp/inspect-ai-docs`; every doc claim below was additionally verified
against the installed package source or an empirical run, and the text says
which. pi claims cite the on-disk docs at
`/nix/store/lvys4szjr1mqpqnrbkqhl7qkcl23mswc-pi-coding-agent-0.84.4/lib/node_modules/pi-monorepo/`
(henceforth `PIPKG/`), `pi --help` output, or an empirical probe executed
with the real binary on this host (probe details inline). All prose
follows the repo rule: no em-dashes.

## Summary: the verified runner recipe facts

1. An Inspect eval is a `@task`-decorated function returning
   `Task(dataset, solver, scorer, sandbox=...)`; the full loop (task,
   solver, custom scorer, `sandbox="local"`, `eval()`, `eval_set()`,
   `read_eval_log`, `samples_df`) was executed end to end against
   `inspect-ai==0.3.263` in a throwaway venv and produces `.eval` logs
   with per-sample scores. Verified empirically; scripts in section 1.
2. Custom scorers in 0.3.263 are factories: `@scorer(metrics=[...])`
   decorates a function returning an async `Scorer`. Passing the raw
   async function to `Task(scorer=...)` fails with
   `ValueError: Object does not have registry info` (verified
   empirically). This is a drift point against older doc examples.
3. The hermetic-run recipe is committed by the isolation spike
   (r2 in `docs/tasks/pi-headless-isolation-spike/findings.md`):
   `PI_CODING_AGENT_DIR=<temp agent dir>` (seeded with exactly
   `auth.json`, `models.json`, and a stripped `settings.json` with
   `packages: []`) plus
   `pi -p --mode json --no-session --no-extensions --no-skills
   --no-context-files --no-prompt-templates --no-themes --no-approve
   -e <canary+under-test-ext> --skill <under-test-skill>`.
   `--no-skills` kills all skill discovery (user, package, and even
   trusted project-local; it overrides `--approve`) while explicit
   `--skill` paths still load; same structure for `--no-extensions`
   vs `-e`. Both verified by this research's probes and by the spike.
   `--session-id` chains multi-turn runs.
4. Model pinning without touching the user's real config: set
   `PI_CODING_AGENT_DIR` to a temp dir containing `models.json` and
   `auth.json`; pi then reads model config and credentials exclusively
   from there. Verified empirically (`--list-models` and
   `--model requesty/sference/glm-5.2` resolve against the temp
   `models.json`; an invalid key fails with exit 1). The spike adds:
   auth.json seeding is mandatory, a bare agent dir dies with "No API
   key found for the selected model" (exit 1).
5. Prior art's own-auth + local architecture ports cleanly: its runner
   invokes the harness CLI via `sandbox().exec()` from an Inspect solver,
   which is exactly the planned shape; two details need correction when
   porting: its `.pi/settings.json packages: []` isolation file does NOT
   disable global packages in pi 0.84.4 (verified empirically, section
   2.7; the spike's equivalent lives in the redirected agent dir), and
   its simulator's `PI_MODEL` env threading is inert (section 2.6).

## 1. Inspect AI (installed: inspect-ai==0.3.263)

Installed via `python3 -m venv /tmp/inspect-research-venv && pip install
inspect-ai`; version confirmed with `pip show inspect-ai` -> `0.3.263`.
Package source paths below are rooted at
`/tmp/inspect-research-venv/lib/python3.13/site-packages/inspect_ai/`
(henceforth `SP/`). Doc citations are `inspect.aisi.org.uk/<page>.html`
URLs; each was verified against the qmd sources in the clone at
`/tmp/inspect-ai-docs/docs/` and, where a signature is claimed, against
`inspect.signature(...)` on the installed package.

### 1.1 Task and @task

`Task.__init__` signature verified via `inspect.signature` on the
installed package; key parameters:

```
Task(dataset, setup=None, solver=<default generate>, cleanup=None,
     scorer=None, metrics=None, model=None, config=GenerateConfig(...),
     sandbox: SandboxEnvironmentType | None = None, epochs=None,
     fail_on_error=None, message_limit/token_limit/turn_limit/time_limit/
     cost_limit=None, name=None, version=0, metadata=None, ...)
```

- A task is minimally dataset + solver + scorer; solver defaults to
  `generate()` (verified: the default arg is `generate`'s inner solve
  function). Docs: https://inspect.aisi.org.uk/tasks.html (source:
  `/tmp/inspect-ai-docs/docs/tasks.qmd` "Task Basics").
- `@task` registers the function for `inspect eval` CLI discovery and,
  for non-package (local file) tasks, stamps the task file and run dir
  (`TASK_FILE_ATTR`/`TASK_RUN_DIR_ATTR` set from `module.__file__`).
  Source: `SP/_eval/registry.py`, `def task(...)` and
  `create_task_wrapper.tag_task`.
- `sandbox="local"` resolves through `resolve_sandbox_environment`
  (`SP/_eval/task/task.py` line 237). Per-sample sandbox binding
  precedence: `eval()` > `Task` > `Sample`; verified in doc
  https://inspect.aisi.org.uk/sandboxing.html (source: sandboxing.qmd
  "Environment Binding") and `Sample(sandbox=...)` param exists in the
  installed signature.

### 1.2 Dataset, Sample, FieldSpec, json_dataset, metadata flow

Verified signatures (installed package, `inspect.signature`):

```
Sample(input, choices=None, target='', id=None, metadata: dict | None = None,
       sandbox=None, files=None, setup=None, checkpoint=None)
FieldSpec(input='input', target='target', choices='choices', id='id',
          metadata: list[str] | Type[BaseModel] | None = None,
          sandbox='sandbox', files='files', setup='setup')
json_dataset(json_file, sample_fields: FieldSpec | RecordToSample | None = None,
             auto_id=False, shuffle=False, seed=None, limit=None, ...)
```

- `FieldSpec(metadata=[...])` collects extra JSON fields into
  `Sample.metadata`; a Pydantic `BaseModel` (frozen=True) gives typed
  metadata read via `state.metadata_as(Cls)`. Docs:
  https://inspect.aisi.org.uk/datasets.html (sources: datasets.qmd
  "Field Spec" section and `_metadata_typing.md` include). Verified by
  running `json_dataset` with `FieldSpec(metadata=["extra"])` and
  observing `{'extra': {'tag': 'a'}}` in the sample's metadata in the
  log.
- Metadata flows to scorers: the runtime copies `sample.metadata` into
  `TaskState(..., metadata=sample.metadata ...)` at sample creation
  (`SP/_eval/task/run.py`, `create_sample_state`, lines ~1454-1464).
  Verified end to end: a custom scorer read
  `state.metadata["expect_pass"]` and the value from the dataset JSON
  was present.

### 1.3 Solvers

Verified signatures:

```
solver(name)                        # decorator; plain or with args
generate(tool_calls: 'loop'|'single'|'none' = 'loop', **GenerateConfigArgs)
system_message(template, **params)  # template is a file path or literal
```

- Solvers transform `TaskState` (messages, output, tools, store,
  completed). Docs: https://inspect.aisi.org.uk/solvers.html (source:
  solvers.qmd; `TaskState` fields verified in installed signature:
  `model, sample_id, epoch, input, messages, target, choices, output,
  message_limit, token_limit, cost_limit, completed, metadata, store,
  scores, sample_uuid`).
- Pipelines: pass a list to `Task(solver=[...])` or compose with
  `chain()`; verified in solvers.qmd "Example" and the
  `resolve_plan`/`chain` code path (`SP/_eval/task/task.py` line ~598).
- `state.messages.append(ChatMessageAssistant(...))` and
  `state.output = ModelOutput(...)` are legal ways for a fully custom
  solver to record the harness transcript as the model output (this is
  the prior-art pattern; see section 4). `state.input_text` and
  `state.output.completion` are the scorer-facing conveniences
  (verified attributes on installed `TaskState`).

### 1.4 Scorers, metrics, and the factory drift

Verified signatures:

```
scorer(metrics: Sequence[Metric] | Mapping[...], name=None, **metadata)
Score(*, value: Value, answer=None, explanation=None, reason=None,
      metadata=None, history=[])
Target(target: str | Sequence[str])          # .text joins the list
CORRECT = "C"; INCORRECT = "I"               # also PARTIAL="P", NOANSWER="N"
accuracy(); stderr()
match(location: 'begin'|'end'|'any'|'exact' = 'end', *,
      ignore_case=True, numeric=False)
includes(ignore_case=True)
model_graded_qa(template=None, instructions=None, grade_pattern=None,
                include_history=False, partial_credit=False, model=None,
                model_role='grader', reducer='majority')
```

Scorer protocol: `Scorer(state: TaskState, target: Target) -> Score |
None` (`SP/scorer/_scorer.py` type, verified via
`inspect.signature(Scorer.__call__)`).

**Drift found and verified empirically.** In 0.3.263, `@scorer` is a
factory decorator: it wraps a function that *returns* an async scorer.
Two failure modes were reproduced live:

- Decorating the raw async `score(state, target)` function and passing
  it to `Task(scorer=...)` raises `ValueError: Object does not have
  registry info` at eval start (`SP/scorer/_scorer.py` line ~216
  `as_scorer_spec` -> `registry_params`). The current docs example
  (custom-scorers.qmd "Example") uses the factory form correctly.
- Bare `@scorer` (no `metrics=`) applied to a factory function
  misbinds: the function lands in the `metrics` slot and
  `scorer.<locals>.wrapper() missing 1 required positional argument`
  fires on instantiation. `@scorer(metrics=[])` is the safe minimal form
  (verified: `is_registry_object(s2())` -> True).

Correct minimal form (this is the form the eval-creator scaffold must
emit):

```python
@scorer(metrics=[accuracy(), stderr()])
def my_check(...) -> Scorer:
    async def score(state: TaskState, target: Target) -> Score:
        return Score(value=CORRECT)
    return score
```

- `Score.unscored(reason=...)` returns a NaN-valued score excluded by
  metrics; returning `None` from the scorer marks a sample out of scope
  without counting as unscored. Docs:
  https://inspect.aisi.org.uk/custom-scorers.html (source:
  custom-scorers.qmd "Unscored Samples"). Verified in installed
  `SP/scorer/_scorer.py` docstring.
- `state.metadata_as(PydanticCls)` for typed metadata
  (`SP/solver/_task_state.py` lines 436-448).
- Model-graded: `model_graded_qa` precedence is explicit `model` arg >
  `model_role="grader"` binding > evaluated model; `{criterion}` comes
  from `Sample.target`; sample metadata keys are available as template
  variables. Docs: https://inspect.aisi.org.uk/model-graded.html (source:
  model-graded.qmd, verified signature matches installed exactly).
- Scorers may use models via `get_model(role="grader")` (same page,
  "Models in Scorers").
- `match()`/`includes()` defaults verified above; the doc page
  https://inspect.aisi.org.uk/standard-scorers.html shows
  `match(location="end")` as the default.

### 1.5 Sandbox: what `sandbox="local"` actually does on this Linux host

Read from installed source `SP/util/_sandbox/local.py` (class
`LocalSandboxEnvironment`, `@sandboxenv(name="local")`) and verified by
an executed eval whose scorer ran commands inside it:

- Per sample it creates `tempfile.TemporaryDirectory()
  (ignore_cleanup_errors=True)`; the sandbox root is that temp dir.
- `exec(cmd, input, cwd, env, user=None, timeout, ...)` runs the command
  with `subprocess` on the host as the current user; `cwd` is resolved
  relative to the temp dir when relative; the `user` parameter is
  ignored with a warning ("Commands will run as the current user").
- `write_file`/`read_file` resolve relative paths against the temp dir;
  absolute paths are used as-is (an important property: a scorer given
  an absolute fixture path outside the temp dir can still operate on
  it, which is exactly how the prior art runs commands in the fixture
  repo from scorers).
- Docs: https://inspect.aisi.org.uk/sandboxing.html "Environment
  Binding" table lists `local` as "Built-in, Local file system (no
  sandbox)" (source: sandboxing.qmd line ~107).
- Empirical verification: a scorer calling
  `sandbox().exec(["sh", "-c", "echo hello > probe.txt && cat probe.txt && pwd"])`
  returned `stdout='hello\n/tmp/tmpXXXX\n' rc=0` and the sample scored
  `C` with that explanation recorded in the log.

This means: with `sandbox="local"`, the eval's process environment (the
pi session) is the host; isolation must come from the runner's own
fixture prep (temp dir, flags), not from Inspect. This is exactly the
architecture the map decided (own-auth + local).

### 1.6 eval, eval_set, logs, dataframes

Verified signatures (installed package):

```
eval(tasks, model=None, ..., sandbox=None, log_dir=None, log_format='eval'|'json',
     limit=None, epochs=None, fail_on_error=None, retry_on_error=None,
     message_limit/token_limit/turn_limit/time_limit/cost_limit=None,
     max_samples=None, max_tasks=None, max_subprocesses=None, max_sandboxes=None,
     ...) -> list[EvalLog]
eval_set(tasks, log_dir=None, retry_attempts=None, retry_wait=None,
         retry_connections=None, retry_cleanup=None, retry_immediate=None,
         incomplete_action='retry', ..., max_tasks=None, ...) ->
        tuple[bool, list[EvalLog]]
read_eval_log(log_file, header_only=False, resolve_attachments=False,
              format='auto', exclude_fields=None) -> EvalLog
samples_df(logs=None, columns=SampleSummary, full=False, strict=True,
           parallel=False, quiet=None, exclude_fields=None) -> pd.DataFrame | ...
evals_df(logs=None, columns=..., strict=True, quiet=None) -> ...
```

- `samples_df`/`evals_df` live in `inspect_ai.analysis`
  (`SP/analysis/__init__.py`), not `inspect_ai.log` (drift from older
  docs). They additionally require `pip install pandas pyarrow`
  (verified: `PrerequisiteError` raised without them; page:
  https://inspect.aisi.org.uk/dataframe.html, source: analysis includes
  in dataframe.qmd).
- Verified end to end: `eval_set([t1], model="mockllm/model",
  log_dir=...)` returned `(True, [log])`; `read_eval_log` on the
  produced `.eval` file gave `log.status == "success"`,
  `log.results.scores[0].scorer == "check"` with
  `metrics["accuracy"].value == 0.5`; `samples_df(log_dir)` returned a
  dataframe with columns including `sample_id, eval_id, id, epoch,
  input, target, metadata_extra, score_check, model_usage,
  total_tokens, total_time, working_time, message_count, turn_count,
  error, retries`. Note `mockllm/model` is a built-in provider useful
  for smoke tests (used in the prior art's plumbing evals and here).
- `eval_set` semantics: runs a matrix with automatic retry
  (`retry_attempts`, default 10 via CLI `--retry-attempts`), reuses
  completed samples from failed tasks in the log dir, cleans failed
  logs after success, and resumes where a previous invocation left
  off. Docs: https://inspect.aisi.org.uk/eval-sets.html (source:
  eval-sets.qmd overview; retry table verified lines 112-132).
- Log format: `.eval` (binary, ~1/8 size, incremental sample access)
  vs `.json` (text). `log_dir` defaults to `INSPECT_LOG_DIR` or
  `./logs`. Docs: https://inspect.aisi.org.uk/eval-logs.html (source:
  eval-logs.qmd "Log Format").
- Parallelism knobs relevant to the runner: `max_samples` (default
  `max_connections + 1`, i.e. 11 with default connections),
  `max_subprocesses` (default = processor count), `max_sandboxes`
  (provider default), `max_tasks` (default 1 task at a time;
  `eval_set` defaults to `max(10, number of models)`). Docs:
  https://inspect.aisi.org.uk/parallelism.html (sources:
  parallelism.qmd, `_max_samples.md`, `_container_limits.md`; the
  `eval()` signature's default `max_tasks` for eval_set verified in
  eval-sets.qmd line 67).
- Agent bridges exist (in-process `agent_bridge()` and sandboxed
  `sandbox_agent_bridge()` via localhost:13131 proxy) but were
  rejected as the runner architecture per the map decision; documented
  as the future strict-A/B alternative. Docs:
  https://inspect.aisi.org.uk/agent-bridge.html (source:
  agent-bridge.qmd, "Agent Bridge" and "Sandbox Bridge" sections,
  verified against installed `inspect_ai.agent` exports).

### 1.7 @tool decorator requirements

Verified from the installed package:

- Signature: `tool(func=None, *, name=None, viewer=None,
  model_input=None, parallel=None, max_output=None,
  prompt=None)`; the decorated function returns the `Tool` (an async
  `execute(**params)` closure). `SP/tool/_tool.py`, docstring printed
  above includes the canonical example.
- The `execute` closure's parameters REQUIRE type annotations in the
  signature; JSON Schema is built from `get_type_hints` with docstring
  `Args:` descriptions layered in, falling back to docstring types
  only for backwards compatibility (`SP/tool/_tool_info.py`
  `_parse_tool_info_shared`: `json_schema(type_hints[param_name])`,
  docstring fallback via `docstring_type`). Docs:
  https://inspect.aisi.org.uk/tools-custom.html (source:
  tools-custom.qmd line ~345: "type annotations must be provided in
  the function signature") and `_tools-annotations-required.md`
  include ("Type annotations and descriptions are required for tool
  declarations"), both verified against the installed parsing code.
- The tool's top-level docstring becomes the tool description; the
  `prompt` decorator param is deprecated (installed docstring: "provide
  all descriptive information about the tool within the tool
  function's doc comment").
- Module is `inspect_ai.tool` (drift note: older docs/examples import
  from `inspect_ai.tools`, which does not exist in 0.3.263;
  `from inspect_ai.tools import tool` fails, `from inspect_ai.tool
  import tool` works, verified).

### 1.8 Host-environment note for the devenv

`stderr()` imports numpy at call time (`SP/scorer/_metrics/std.py`
line 147); in a bare pip venv on this NixOS host, numpy's C extensions
fail with `libstdc++.so.6: cannot open shared object file` unless
`LD_LIBRARY_PATH` points at a gcc lib dir (e.g.
`/nix/store/22nxhmsfcv2q2rpkmfvzwg2w5z1l231z-gcc-13.3.0-lib/lib`). One
eval run failed at results computation purely from this; the devenv
must provide a numpy with working C extensions (the repo's planned
Python environment via devenv should, but this must be rechecked in
the spike).

## 2. pi harness (v0.84.4, binary on PATH)

`pi --version` -> `0.84.4`. Docs read from `PIPKG/docs/` and
`PIPKG/README.md`; every flag claim below was checked against
`pi --help` output and, for the load-bearing ones, an empirical probe
on this host (live model configured; probes ran real completions).

### 2.1 Modes and completion/error detection

- Four modes: interactive (default), `-p`/`--print` (text, process and
  exit), `--mode json` (JSON event lines on stdout), `--mode rpc`
  (JSONL protocol on stdin/stdout). `pi --help` "Options" block;
  `PIPKG/README.md` "Modes" table.
- `--mode json` in print mode emits: a `session` header line
  (`{"type":"session","version":3,"id":...,"cwd":...}`), then
  `agent_start`, `turn_start`, `message_start`, delta-only
  `message_update` (with cumulative `usage`), `message_end`,
  `turn_end`, `agent_end` (carrying all messages), and `agent_settled`.
  Verified empirically (full streams captured). `PIPKG/docs/json.md`
  documents the event types and the delta-only `message_update`
  contract.
- Completion detection for a parent process: the `agent_end` line is
  the turn-completion marker; the run ends when the process exits
  after writing `agent_settled` (verified: stream terminates there).
  Error detection: in JSON mode a model error surfaces as an assistant
  message with `stopReason:"error"` and `errorMessage` inside
  `turn_end`/`agent_end`, and the process still exits 0 (verified
  empirically with an invalid API key: stdout carried the error
  fields, `EXIT: 0`). In text `-p` mode the same error prints to
  stderr and the process exits 1 (verified: `EXIT: 1`, stderr
  `OpenAI API error (401)`). Source for the exit-code logic:
  `PIPKG/dist/modes/print-mode.js` (`stopReason === "error" ||
  "aborted"` -> `exitCode = 1`; `main.js` sets `process.exitCode`).
  So: a JSON-mode parent must inspect the `stopReason` of the final
  assistant message; it cannot rely on a non-zero exit code. The prior
  art's parser does exactly this (section 4).
- `--mode rpc` exists for full programmatic control (JSONL commands:
  prompt, steer, follow_up, abort, new_session; strict LF framing).
  `PIPKG/docs/rpc.md`. Node callers can instead use the SDK
  (`createAgentSession`), `PIPKG/README.md` "Programmatic Usage".

### 2.2 Skill discovery: locations and order

`PIPKG/docs/skills.md` "Locations" is authoritative and matches the
installed source (`PIPKG/dist/core/package-manager.js`
`resolve()` and `addAutoDiscoveredResources`, plus
`PIPKG/dist/core/skills.js` `loadSkills`):

1. Packages first: project-scope `packages` (from `.pi/settings.json`),
   then global `packages` (`~/.pi/agent/settings.json`), deduped with
   project identity winning (`resolve()` lines ~698-712:
   "project first so cwd resources win collisions").
2. Settings `skills`/`extensions`/`prompts`/`themes` arrays: project
   entries, then global entries.
3. Auto-discovered directories, in this order (source:
   `addAutoDiscoveredResources`, lines ~1960-2025): project `.pi/`
   extensions and skills (trusted projects only), then project
   `.agents/skills` walking up from cwd to git repo root (or filesystem
   root outside a repo; excluded if it resolves to the user
   `~/.agents/skills`), then user `~/.pi/agent/` extensions and
   skills, then user `~/.agents/skills`, then user prompts/themes.
4. CLI paths are merged in front: final order is
   `[...cliEnabledSkills, ...enabledSkills]` then
   `additionalSkillPaths` (`resource-loader.js` lines ~330-332,
   verified).
5. Name collisions warn and keep the first skill found
   (`skills.js` `addSkills`: `skillMap.get(skill.name)` check;
   docs/skills.md "Validation": "keep the first skill found").

Discovery rules per directory (docs/skills.md "Locations"):
`~/.pi/agent/skills/` and `.pi/skills/` load root `.md` files as
individual skills (with valid frontmatter + description); all
locations load `SKILL.md` directories recursively; `~/.agents/skills`
and project `.agents/skills` ignore root `.md` but discover nested
`.md` in grouping folders. Project locations load only after the
project is trusted (see 2.5).

### 2.3 --no-skills vs --skill; --no-extensions vs -e

- Help lines (verified in `pi --help`): `--skill <path>  Load a skill
  file or directory (can be used multiple times)`; `--no-skills, -ns
  Disable skills discovery and loading`; `-e/--extension <path>  Load
  an extension file (repeatable)`; `--no-extensions, -ne  Disable
  extension discovery (explicit -e paths still work)`.
- Docs: `PIPKG/docs/skills.md` line 34: "CLI: `--skill <path>`
  (repeatable, additive even with `--no-skills`)" and line 42:
  "Disable discovery with `--no-skills` (explicit `--skill` paths
  still load)". `PIPKG/README.md` line 604: "Combine `--no-*` with
  explicit flags to load exactly what you need, ignoring settings.json".
- Source confirmation: with `noSkills`, the skill path list becomes
  `mergePaths(cliEnabledSkills, additionalSkillPaths)`, dropping
  every settings/packages/auto-discovered skill
  (`resource-loader.js` line ~330). Same shape for extensions (line
  ~316) and prompt templates. `cliEnabledSkills`/`cliEnabledExtensions`
  come only from the CLI `-e`/`--skill` args
  (`main.js` `resolveCliPaths(cwd, parsed.skills)` ->
  `additionalSkillPaths`; `package-manager.js
  resolveExtensionSources(..., {temporary: true})`).
- Empirically verified on this host (live probes with a fixture in
  /tmp containing `.pi/skills/fixture-skill` and an external
  user-skill dir):
  - `--no-skills`: no skills in the system prompt (model answered
    NONE for skills; residual mentions of skills in tool descriptions
    appear but the dedicated skills section is empty).
  - `--no-skills --skill /path/user-skill`: `user-skill` loads, model
    confirmed; and `fixture-skill` (project discovery) confirmed
    absent.
  - `--no-skills` also drops settings-declared skills: with
    `.pi/settings.json {"skills": ["/path/user-skill"]}`, the skill
    loads without `--no-skills` and disappears with it (probe).
  - `--no-extensions -e /path/ext.ts`: the extension loads; verified
    by an extension that prints a marker on `session_start` to
    stderr; marker present (probe).
- Consequence for the eval runner: the isolation flag set is
  `--no-skills --no-extensions --no-context-files
  --no-prompt-templates --no-themes` plus explicit `--skill`/`-e`
  for exactly the resources under test. The isolation spike tested
  this set and committed the full recipe (r2), including the
  redirected agent dir and `--no-approve`; see
  `docs/tasks/pi-headless-isolation-spike/findings.md` "The proven
  isolation recipe".

### 2.4 --no-context-files, --no-session, --offline, print-mode stdin

- `--no-context-files, -nc  Disable AGENTS.md and CLAUDE.md discovery
  and loading` (help line; verified empirically: a fixture AGENTS.md
  content was visible to the model without the flag, invisible with
  `-nc`). Context files load from `~/.pi/agent/AGENTS.md`, parent
  directories walking up from cwd, and cwd, all concatenated;
  `AGENTS.override.md` replaces per directory
  (`PIPKG/README.md` "Context Files"; source
  `resource-loader.js` `loadProjectContextFiles`).
- `--no-session  Don't save session (ephemeral)` (help). Verified:
  with `--session-dir <dir> --no-session` no file is written; without
  `--no-session` one `<timestamp>_<uuid>.jsonl` appears. Source:
  `main.js` `createSessionManager` uses `SessionManager.inMemory` when
  `parsed.noSession`.
- `--offline  Disable startup network operations (same as
  PI_OFFLINE=1)` (help). Covers version check, package update checks,
  install/update telemetry (`PIPKG/docs/settings.md` "Telemetry and
  update checks"). Verified: a run starts and completes with
  `--offline` (probe). Does not block model API calls themselves.
- Print mode merges piped stdin into the initial prompt
  (`cat f | pi -p "..."`), and `@file` arguments attach files
  (`PIPKG/README.md` "Modes", "File Arguments").

### 2.5 Project trust: --approve / --no-approve / defaultProjectTrust

- `PIPKG/docs/settings.md` "Project Trust" (lines 14-19) and
  `PIPKG/README.md` "Project Trust": interactive startup prompts for
  projects containing project-local settings/resources; non-interactive
  modes (`-p`, `--mode json`, `--mode rpc`) never prompt and fall back
  to `defaultProjectTrust` in global settings: `"ask"` (default) and
  `"never"` ignore project resources, `"always"` trusts them;
  `--approve/-a` trusts for one run, `--no-approve/-na` ignores for
  one run. Saved decisions live in `~/.pi/agent/trust.json`
  (interactive `/trust`).
- Empirically verified: in a non-interactive run without `-a`, a
  project `.pi/skills/fixture-skill` was NOT loaded; with `-a` it WAS.
  So a runner that wants project-local fixture resources to load via
  discovery must pass `-a`/`--approve` (or set
  `defaultProjectTrust: "always"` in the isolated agent dir's
  settings.json). But the committed hermetic recipe does the
  opposite: it passes `--no-approve` and loads every skill explicitly
  via `--skill`, because the spike's probe A showed `--approve`
  pulls in everything project-local including ancestor `.agents/skills`
  from any enclosing repo (uncontrollable leakage). With
  `--no-skills` set, `--approve` is irrelevant for skills (spike r3
  confirms `--no-skills` overrides it).
- `pi config` and package commands use the same trust flow
  (`--approve`/`--no-approve` accepted; `pi update` never prompts);
  `PIPKG/README.md` "Package Commands" note, verified in
  `PIPKG/dist/package-manager-cli.js` `handleConfigCommand`.

### 2.6 Custom models: models.json paths and precedence

- The only models.json path pi reads is
  `<agentDir>/models.json`, where `agentDir = $PI_CODING_AGENT_DIR` or
  `~/.pi/agent` (`PIPKG/dist/config.js` `getModelsPath()`:
  `join(getAgentDir(), "models.json")`; `getAgentDir()` honors
  `PI_CODING_AGENT_DIR`). `ModelRuntime.create` defaults
  `modelsPath` to the same (`dist/core/model-runtime.js` line 76).
  There is NO project-local `.pi/models.json` support in 0.84.4 (the
  task doc's "(or project-local .pi/models.json?)" is answered: no;
  verified by source search across `dist/` finding no other reader,
  and `docs/models.md` line 3 names only `~/.pi/agent/models.json`).
- Precedence within models.json: `modelOverrides` are "the topmost
  user-config layer" applied over built-in and extension-registered
  models; custom `models` entries are upserted by `id` into the
  provider (`docs/models.md` "Overriding Built-in Providers" merge
  semantics). Composition order overall: built-in providers, then
  extension-registered native providers, then models.json overrides
  (`docs/custom-provider.md` line 33: "Pi composes models.json
  overrides above registered native providers").
- Pinning a model for evals without touching the user config:
  set `PI_CODING_AGENT_DIR=<temp>`; write
  `<temp>/models.json` (providers block) and `<temp>/auth.json` there.
  Verified empirically: with a temp agent dir containing a requesty
  provider definition (apiKey via `$REQUESTY_API_KEY` interpolation),
  `--list-models` showed exactly the defined model, `--model
  requesty/sference/glm-5.2` selected it, and a wrong key failed with
  `403` + exit 1 in text mode. A fresh agent dir auto-creates
  `auth.json` and `models-store.json` on first run (probe). The spike
  adds the hard requirement: a bare redirected dir (no `auth.json`)
  fails immediately with "No API key found for the selected model"
  and exit 1, so the runner must seed `auth.json` (or rely on API-key
  env vars) and a `models.json` catalog; its recipe also seeds a
  stripped `settings.json` with `packages: []` and
  `defaultProvider`/`defaultModel` for model pinning
  (`docs/tasks/pi-headless-isolation-spike/findings.md` "What each
  lever actually does" and "Key findings" item 4).
- `apiKey`/`headers` value resolution: `!command` executes a shell
  command, `$VAR`/`${VAR}` interpolates env, `$$`/`$!` escape, plain
  strings are literals; commands resolve at request time with no
  built-in caching (`docs/models.md` "Value Resolution").
- Drift note: the prior art's `SIMULATOR_CONFIG` passes `PI_MODEL` as
  an env var to the pi subprocess; pi does not read `PI_MODEL` as
  input (verified empirically: `PI_MODEL=requesty/nonexistent` had no
  effect; `PIPKG/docs/environment-variables.md` lists `PI_MODEL` only
  as a variable pi exports to shell commands). The correct mechanism
  is `--model`/`--provider`, a settings `defaultModel`, or the
  isolated agent dir's models.json.

### 2.7 pi config and settings-level resource disabling

- `pi config` opens a TUI (Tab switches global `~/.pi/agent/settings.json`
  vs project `.pi/settings.json`; `-l` starts in project mode).
  Toggling a resource writes a `+pattern`/`-pattern` entry into the
  `skills`/`extensions`/`prompts`/`themes` array of the corresponding
  settings file (verified in
  `PIPKG/dist/modes/interactive/components/config-selector.js`
  `toggleResource`: pushes `-${pattern}` for disable, `+${pattern}`
  for enable). `docs/settings.md` "Resources": arrays support globs
  and exclusions (`!pattern`, `+path`, `-path`).
- Package-level disabling: `packages` object form filters what a
  package loads (`"skills": ["brave-search"], "extensions": []`
  etc., `docs/packages.md` "Package Filtering"). Scope and
  deduplication: "If the same package appears in both, the project
  entry wins unless the project entry has autoload: false, in which
  case it is applied as a delta over the global entry"
  (`docs/packages.md` "Scope and Deduplication"). Verified in source:
  `dedupePackages` (`package-manager.js` lines 1390-1410) and
  `applyPackageDeltaFilter` (line 1872).
- Empirically verified on this host, correcting the prior art:
  - Project `.pi/settings.json {"packages": []}` does NOT disable
    global packages: the global `Y4shin/skills` package's
    `code-review` skill remained visible. An empty project list only
    contributes no project packages; global packages resolve
    independently (`resolve()` builds `allPackages` from project then
    global settings).
  - Project entry `{"source": "git:github.com/Y4shin/skills",
    "skills": []}` (project wins dedup, filters that package's skills
    to none) DID hide `code-review` and `implement-task` while other
    global packages' skills (`aura`) stayed visible.
  - Delta form `{"source": ..., "autoload": false, "skills":
    ["-./skills/engineering/code-review"]}` hid just `code-review`
    while `implement-task` stayed visible (pattern must match the
    manifest entry path form, `./skills/...`).
  - Implication: the reliable isolation is `PI_CODING_AGENT_DIR`
    (fresh agent dir has no packages, skills, or extensions at all)
    plus the `--no-*` flags; fixture `.pi/settings.json
    packages: []` is not an isolation mechanism. Note the spike's
    recipe DOES use `packages: []`, but in the redirected agent
    dir's own (global-scope) `settings.json`, where it means "no
    packages at all", which is the correct use of this form; the
    ineffective position is the fixture's project-scope
    `.pi/settings.json`.

### 2.8 Sessions and multi-turn

- Sessions are JSONL files under the session dir
  (`--session-dir <dir>`, `sessionDir` setting, or
  `PI_CODING_AGENT_SESSION_DIR`; precedence `--session-dir` > env >
  settings, `docs/settings.md` "Sessions").
- `--session-id <id>  Use exact project session ID, creating it if
  missing` (help). Empirically verified multi-turn chaining: turn 1
  with `--session-id test-mt --no-session`-less setup remembered a
  word; turn 2 with the same `--session-id` recalled it. This is the
  mechanism the prior art uses for multi-turn evals
  (`agents.py build_harness_command` threads `session_id`).
- `--fork <path|id>` forks a session file into a new session (help).
  `--fork` cannot combine with `--session`/`--continue`/`--resume`/
  `--no-session` (verified in `main.js` `validateForkFlags`).

### 2.9 Resource-narrowing flag inventory (for the spike)

From `pi --help`, the complete relevant set:

```
--no-extensions, -ne        disable extension discovery (-e still works)
--no-skills, -ns            disable skills discovery (--skill still works)
--no-prompt-templates, -np  disable prompt template discovery/loading
--no-themes                 disable theme discovery
--no-context-files, -nc     disable AGENTS.md/CLAUDE.md discovery
--no-tools, -nt             disable ALL tools by default
--no-builtin-tools, -nbt    disable built-in tools, keep extension/custom
--tools, -t <list>           allowlist specific tools
--exclude-tools, -xt <list>  denylist specific tools
--approve, -a / --no-approve, -na   project trust override
--no-session                ephemeral, nothing persisted
--offline                   no startup network ops
--session-dir <dir>         where sessions live
--session-id <id>           stable id for multi-turn chaining
```

## 3. Prior-art patterns (~/Projects/agent-plugins-evals/)

Read as source. Key files: `docs/eval-design.md`, `AGENTS.md`,
`inspect_src/harness.py`, `inspect_src/agents.py`,
`inspect_src/scorers.py`, `inspect_src/evals/e1_skill_discovery.py`,
`inspect_src/evals/e5_ai_setup.py`,
`.pi/skills/eval-authoring/SKILL.md` and its
`references/repo-capabilities.md`.

### 3.1 Architecture and own-auth decision

- `inspect_src/agents.py` module docstring: the agents "run the
  harness CLIs ... directly on the host using the `local` sandbox,
  WITHOUT model bridging. The harness uses its own authentication and
  model configuration. ... This is fundamentally different from
  inspect-swe's built-in `claude_code()` adapter, which proxies all
  model API calls through Inspect's model provider and runs inside a
  Docker sandbox. We need the harness to use its own auth and run on
  the host." This is the documented rejection of the bridge; our map's
  decision cites it.
- Inspect orchestrates (tasks/samples/scorers/logs); the solver shells
  out to the harness CLI via `sandbox().exec(cmd, cwd=fixture,
  timeout=600)` (`harness.py` `eval_solver`), accumulates stdout as
  the transcript, and stuffs it into `state.messages` +
  `state.output` so scorers can read `state.output.completion`
  (`harness.py` lines ~150-165). Scoring then happens on the real
  repo state via absolute paths.

### 3.2 Fixture prep (port directly)

`agents.py prepare_fixture`:

1. `shutil.copytree(source, tmp, ignore=shutil.ignore_patterns(".git",
   ".direnv"))` to a temp dir named `eval-fixture-<run_id>`.
2. `git init` + `commit.gpgsign false` + eval user identity.
3. Isolation files: `.pi/settings.json {"packages": []}` (see the
   correction in 2.7), `.mcp.json` (per-run token), harness-specific
   Claude settings/plugin copies, `.gitignore` entries for all
   isolation files.
4. `git add -A && git commit` everything "so git_no_diff can detect
   real mutations" (the `git_no_diff` scorer then runs
   `git diff --exit-code` in the fixture cwd).

Fixture patches for lifecycle chaining: `fixture_setup_solver(...,
fixture_patch="patches/e6a.patch")` applies and commits a patch so a
later phase starts where the previous one ended
(`harness.py` `fixture_setup_solver`).

### 3.3 Isolation flags actually used by the prior art

`agents.py build_harness_command` for pi:

```
pi -p --session-id <id> --no-extensions --no-skills --no-context-files
   --no-prompt-templates --no-themes -e <ext-under-test>
   --skill <skill-dir-under-test> --approve <prompt>
```

Its simulator runs with `pi -p --no-session --no-extensions
--no-skills --no-context-files` (`harness.py` `SIMULATOR_CONFIG`).
The `--no-*` + explicit `-e`/`--skill` core matches the verified pi
0.84.4 semantics (2.3) and the spike's committed recipe; two
prior-art details are superseded by the spike: `--approve` is
replaced by `--no-approve` (probe A: `--approve` leaks ancestor
`.agents/skills` from enclosing repos when discovery is on, and the
hermetic recipe loads everything via `--skill` anyway), and the
runner should add `PI_CODING_AGENT_DIR` + seeded agent-dir files,
which the prior art got for free from its container's fresh `$HOME`.

### 3.4 Scorer families (the deterministic inventory)

`scorers.py` implements, all read-only, all `@scorer(metrics=[accuracy(),
stderr()])` factories returning async scorers:

- Output: `output_contains`, `output_not_contains`,
  `output_contains_exact_line`, `output_matches`,
  `output_not_contains_placeholder`.
- File (resolved against `state.metadata["fixture_path"]`):
  `file_exists`, `file_not_exists`, `file_contains`,
  `file_exists_glob`, `file_contains_glob`, `file_modified`,
  `file_not_modified` (the last two via `git diff --exit-code --
  <path>` in the fixture cwd).
- Command: `command_succeeds`, `command_output_valid_json`,
  `command_output_json_has_key`.
- Git: `git_no_diff` (whole-worktree mutation check).
- Tree (static, against `AGENT_PLUGINS_ROOT`): `tree_contains`,
  `tree_not_contains`.
- Table analysis: the `decisions_*` family parses a markdown table
  into row dicts and checks per-playbook completeness, real-question
  recording, answer presence, gap-slot coverage, premature
  implemented_at stamps, row count.
- Service API: `aura_task_exists`, `aura_task_has_artifact`,
  `aura_artifact_has_version`, `aura_artifact_version_contains`,
  `aura_artifact_version_not_contains`, `aura_task_status`,
  `aura_artifact_has_comment` (REST queries using
  `state.metadata["aura_token"]`; ours will analogously hit whatever
  external state an extension owns, if any).

AGENTS.md rule: "Deterministic scorers: all scorers in
inspect_src/scorers.py are read-only (they return Score, never write
state). Keep them that way."

### 3.5 Classifier and simulator (copy-paste resources)

- `classify_harness_output` + `_classify_text` (`agents.py`): pure
  heuristics deciding terminated vs needs-user-response: last line
  ends with `?`, 2+ question lines anywhere, waiting phrases in the
  tail ("let me know", "your call", ...), last line starting with a
  question word. For pi specifically: "pi -p exits after each turn;
  we always treat as terminated and handle multi-turn via session
  resume in the caller".
- `simulate_user` + `build_user_spec_text` + `SIMULATOR_SYSTEM_PROMPT`
  (`agents.py`): a structured `USER_SPEC` dict (`role`, `known_facts`,
  `behaviour`, `rules`) rendered into a prompt for a separate
  `pi -p` subprocess. Rules: the simulator never decides pass/fail;
  no `TASK_COMPLETE`; no blanket confirmations; answers only what was
  asked. The design doc and skill both stress "the spec holds
  opinions, not instructions" (e.g. E6c's pushback persona causes
  partial adoption instead of scripting it).
- The map already decided these ship as copy-paste resource files in
  our scaffold, not built-in machinery; the prior-art code is small
  enough to lift almost verbatim (`_classify_text` ~40 lines,
  simulator ~50 lines, spec renderer ~15 lines).

### 3.6 Authoring discipline (the eval-authoring skill)

`.pi/skills/eval-authoring/SKILL.md`:

- Contract first: "what capability is being measured, and what
  outcome proves it?"; "two domain experts would independently reach
  the same pass/fail verdict from the transcript".
- "Grade the outcome ... never the path."
- "Substring scorers are directional, not semantic"; "read the
  transcript and check why it passed or failed; a pass for the wrong
  reason is a silent failure".
- "Check both directions" (positive + nearby-negative cases).
- "Run at least 3 trials before drawing any conclusion".
- Failure triage table: scorer bug vs skill/harness defect vs spec
  mismatch ("this is a product decision, ask the user").
- "Widening a substring until the agent passes is not tuning; it is
  overfitting to one run."
- Record a reference solution; "0% pass across several trials
  usually means a broken task spec".
- Saturation: 100% evals are regression guards; retire or harden.

`references/repo-capabilities.md` adds the uniform task template
(contract docstring, PROMPT constant, USER_SPEC dict, `@task`
function; `setup=fixture_setup_solver(...)` + `solver=eval_solver(...)`
+ scorer list + `sandbox="local"`), the auto-discovery convention
(CLI discovers `@task` functions in `inspect_src/evals/`, alias =
`name.split("_", 1)[0]`), and gotchas (task titles vary, so title
scorers must use a term certain to appear; substring passes can be
rejections; rebuild-before-run).

### 3.7 Task file shape (uniform template, E1 and E5)

`evals/e1_skill_discovery.py` shows the minimal single-turn plumbing
eval: `Sample(id=..., input=PROMPT, target=...)`,
`setup=fixture_setup_solver(...)`,
`solver=eval_solver(harness=..., prompt=PROMPT, max_turns=1)`,
scorer list of four deterministic checks, `sandbox="local"`.
`evals/e5_ai_setup.py` shows the multi-turn form with
`max_turns=15, user_spec=USER_SPEC` and 22 scorers composed from the
families above.

## 4. Ported patterns (prior art -> eval-creator scaffold)

Each row maps a verified prior-art pattern to its planned use in the
`eval-creator` scaffold (self-contained `evals/` tree in the target
repo; constraints from `docs/tasks/maps/pi-harness-evals/map.md`).

| Prior-art pattern (source) | Port to the eval-creator scaffold |
|---|---|
| Fixture prep: copytree minus `.git`/`.direnv`, git reinit with GPG off and eval identity, commit everything (`agents.py prepare_fixture`) | The scaffold's `evals/lib/fixture.py`: same steps, parameterized by fixture source; the initial commit is what makes `git_no_diff` and `file_not_modified` meaningful. Keep `.gitignore` append for isolation files. |
| Isolation via flags, not config: `--no-extensions --no-skills --no-context-files --no-prompt-templates --no-themes -e <ext> --skill <dir> --approve` (`agents.py build_harness_command`) | The runner's invocation, updated to the spike's committed recipe (r2): same `--no-*` core plus `PI_CODING_AGENT_DIR=<temp seeded dir>` and `--no-approve` instead of `--approve` (spike probe A showed `--approve` leaks enclosing-repo `.agents/skills`; `--skill` explicit loading makes trust grants unnecessary). The scaffold's runner takes `extension_paths` and `skill_dirs` lists and emits exactly this (`docs/tasks/pi-headless-isolation-spike/findings.md`). |
| `.pi/settings.json {"packages": []}` isolation file (`agents.py` lines 62-66) | Do NOT port in the fixture-project position: verified ineffective against global packages in 0.84.4 (2.7). The mechanism the spike actually needs is the redirected agent dir: `PI_CODING_AGENT_DIR=<temp>` with a seeded `settings.json {"packages": []}` (global scope, meaning no packages at all), `auth.json`, and `models.json` (spike "The proven isolation recipe"). Document the per-package project override forms (`{"source": ..., "skills": []}` or `autoload:false` deltas, 2.7) only for repos that must suppress a specific global package while keeping the real agent dir. |
| Own-auth runner: solver shells out to the CLI, transcript becomes `state.output`, no model bridging (`agents.py` docstring, `harness.py eval_solver`) | Identical shape: a `headless_pi_solver(prompt, flags, session_id)` in `evals/lib/runner.py` using `sandbox().exec` with `cwd=fixture`, 600s-style timeout, accumulating turns. Parse the JSON stream (2.1) for session id, final assistant text, usage/cost (`parse_harness_output` is a direct port: it reads the `session` header for the id and the last assistant message of `agent_end`). |
| Multi-turn via `--session-id` chaining, heuristic terminated-vs-needs-input classifier, structured simulator (`agents.py classify_harness_output`, `_classify_text`, `simulate_user`, USER_SPEC) | Ships as copy-paste resource files (`evals/resources/classifier.py`, `simulator.py`, spec templates). Single-shot scenarios need none of it (map decision). The pi classifier note ("pi -p exits after each turn") stays true in 0.84.4. |
| Deterministic scorer families: output/file/command/git/tree (+ service API) (`scorers.py`; inventory in `references/repo-capabilities.md`) | The scaffold's `evals/lib/scorers.py` ships the same families minus the Aura-specific set (out of scope: no Aura/Postgres per map). Keep: output_contains/not_contains/exact_line/matches, file_exists/not_exists/contains/modified/not_modified (+glob variants), command_succeeds/command_output_valid_json, git_no_diff. All read-only, all factory-form `@scorer(metrics=[accuracy(), stderr()])` (mind the 1.4 drift). |
| Per-sample metadata threading (`state.metadata["fixture_path"]`, `aura_token`) | Same mechanism, verified end to end in Inspect 0.3.263 (1.2): `fixture_setup_solver` writes `state.metadata["fixture_path"]`; every file/command scorer resolves against it. Add `PI_CODING_AGENT_DIR` value and the flag set used to metadata so logs record the experimental configuration. |
| LLM judge only for semantic properties, via Inspect's model_graded, never a widened grep (SKILL.md "Scorer selection", repo-capabilities.md "no LLM-judge scorer yet") | The scaffold documents `model_graded_qa(...)` (verified signature, 1.4) as the escape hatch; v1 ships no judge helper (map fog: default document-only until a real contract needs one). |
| Authoring discipline: contract first, outcome not path, both directions, substring directionality, 3-trial rule, triage (scorer bug vs skill defect vs spec mismatch), reference solution, saturation policy (SKILL.md) | Becomes the eval-creator skill's teaching section, nearly verbatim (the map's round-2 Q0 decision lists the same items). The scaffold's docs page and skill body cite this findings file rather than the prior-art repo. |
| Uniform task template + auto-discovery (`references/repo-capabilities.md`; `evals/e1_*.py`, `e5_*.py`) | `evals/<target>/` with one `@task` file per scenario family following the template (contract docstring, PROMPT, USER_SPEC when multi-turn, task function composing setup/solver/scorers, `sandbox="local"`). CLI alias convention not needed if we run via `inspect eval <file>@<task>` directly; keep file-per-task uniformity. |
| Progress JSONL append-only per sample (`progress.py`, AGENTS.md rule) | Optional for v1; the map puts log location/gitignore in fog. Inspect's own `.eval` logs plus `samples_df` (1.6) cover post-run analysis; a progress sidecar is only needed for long detached runs. |

## 5. Impact on dependents

### Isolation spike (pi-headless-isolation-spike, done)

The spike completed while this research was in flight and committed the
architecture: own-auth + local, recipe r2, with the canary extension as
the assertion instrument (`docs/tasks/pi-headless-isolation-spike/
findings.md`). This file defers to it on the flag semantics (2.3), the
trust/`--approve` interplay (2.5), and the seeded-agent-dir recipe
(2.6). What this research adds on top, for the scaffold:

- The canary assert should also subtract tool-description residue: my
  probe A (real agent dir, discovery on, empty skills section) showed
  extension-registered tools still mention skill names in their own
  descriptions; with `--no-extensions` in the recipe those tools vanish,
  but the canary's `event.systemPromptOptions.selectedTools` (spike
  finding 5) can assert the tool set explicitly.
- `defaultProjectTrust: "always"` in the temp agent dir's settings.json
  remains an unprobed alternative to `--approve` for non-hermetic
  baseline runs; the committed recipe does not need it.
- My package-position probes (2.7) explain *why* the spike's seeded
  `settings.json` uses `packages: []` in the agent dir (global scope,
  no packages) rather than in the fixture (project scope, ineffective).

### build-eval-creator-skill (feature)

- The scaffold's Python lib must emit factory-form scorers
  (`@scorer(metrics=[accuracy(), stderr()])` over a function returning
  an async scorer); the bare/decorate-the-async-fn form fails at eval
  start on 0.3.263 (1.4). The lib should include a smoke test task
  run against `mockllm/model` (as the prior art does for plumbing
  evals and as verified here) so suites are runnable without API
  spend.
- The runner implements the spike's committed recipe (r2): redirected
  agent dir with seeded `auth.json`/`models.json`/`settings.json
  {"packages": []}`, `pi -p --mode json --no-session --no-extensions
  --no-skills --no-context-files --no-prompt-templates --no-themes
  --no-approve -e <canary+under-test> --skill <under-test>`, parsed per
  2.1: session id from the `session` header, final text and
  `stopReason` from the last assistant message in `agent_end`, usage
  and cost from that message's `usage` field. JSON mode exits 0 even
  on model errors, so error detection must read `stopReason ===
  "error"` and `errorMessage`; config-level failures (missing auth)
  do exit 1 with stderr (spike finding on `--mode json`).
- Baseline vs treatment is exactly the spike's formulation: same
  recipe minus `--skill <under-test>` / `-e <under-test-extension>`;
  the canary is loaded in both arms and subtracted from asserts.
- The fixture prep creates the temp agent dir and seeds the three
  files; fixtures live outside any git repo root (spike finding 3,
  ancestor `.agents/skills` leakage into enclosing repos).
- Multi-turn runs chain via `--session-id` (2.8, prior-art
  `build_harness_command`), one process per turn; single-turn
  scenarios need no session handling. Note the session dir defaults
  into the agent dir, so the redirected dir contains session state
  unless `--no-session` is passed (recipe includes it).
- Model pinning goes through the seeded agent dir (`models.json` +
  `settings.json` `defaultProvider`/`defaultModel`, or
  `--model provider/id` on the command line; spike finding 6), not
  through project-local models.json (unsupported, 2.6) and not
  through the `PI_MODEL` env var (write-only variable; the prior
  art's use of it is inert drift, 2.6).
- The devenv must provide a working numpy (for `stderr()`) and, for
  dataframe analysis, `pandas` + `pyarrow` (1.6, 1.8); on this NixOS
  host a bare pip venv needed `LD_LIBRARY_PATH` to a gcc lib, which
  the devenv-based environment should not, but the scaffold's setup
  instructions should verify this once.
- The docs page and skill body cite this file for: the Task/solver/
  scorer API facts, the log/dataframe analysis path, and the
  ported-patterns table; they cite the spike findings for the
  isolation recipe and the canary.

## 6. Unresolved questions (need empirical verification, not doc reading)

The isolation spike answered the former items on flag semantics,
`--skill`/`-e` additivity, trust gating, and fixture placement; the
remaining open items are:

1. `defaultProjectTrust: "always"` inside the seeded agent dir as an
   `--approve` replacement for non-hermetic baseline runs: docs support
   the setting (2.5) but the interaction with `PI_CODING_AGENT_DIR`
   scoped settings was not probed. The committed recipe does not need
   it; only relevant if a repo's `docs/evals.md` overrides demand
   project-local discovery.
2. Observable effect of `--no-prompt-templates` and `--no-themes` in
   headless runs (expected: none; the spike kept both as belt-and-braces
   and so does the recipe).
3. `--mode rpc` as the runner transport instead of repeated
   `--mode json` processes: viable per `PIPKG/docs/rpc.md`, but session
   lifecycle cost (process per sample vs one RPC process per
   sample-batch) is unmeasured. The prior art's one-process-per-turn
   with `--session-id` chaining is proven; keep it as the default and
   leave RPC as an option.
4. SDK path (`createAgentSession`) as an alternative control plane:
   documented (`PIPKG/README.md` "Programmatic Usage") but would make
   the runner Node-dependent; out of scope for v1 unless the JSON
   stream proves insufficient.
5. Whether `git_no_diff`-style whole-worktree checks remain reliable
   when the evaluated skill legitimately creates gitignored artifacts
   (prior art gitignores isolation files; our fixtures must do the
   same, and any skill-under-test that writes gitignored state needs
   `file_not_exists`-style checks instead).
6. Long-run ergonomics: `eval_set` retry/resume across interrupted
   suites was verified at API level (1.6) but not under a real
   multi-suite baseline-vs-treatment run with cost caps (the map
   leaves repetitions/epochs defaults and per-scenario cost caps in
   fog; `epochs`, `max_tasks`, `cost_limit` are the knobs, 1.6).
