---
name: skill-creator
description: Create, make, build, or scaffold a new Agent Skill from a workflow, capability, or set of instructions. Turn a runbook, checklist, or repeated workflow into a skill. Improve, refactor, or fix a skill that isn't triggering reliably or whose SKILL.md needs tightening. Review a skill for unnecessary context usage and trim it. Decide whether to update an existing skill or create a new one. Make a harness-specific or Claude-oriented skill portable across agents. Do NOT use for writing a plain README, general documentation, or ordinary coding tasks that are not about authoring an Agent Skill.
---

# /skill-creator — Agent Skill Authoring Helper

Create, review, update, and improve other Agent Skills. Produces small,
spec-conformant, well-triggered skills that load wherever the Agent Skills
format is supported.

## Capability ceiling and conditional rules

**Default:** a produced skill assumes only that the agent can read the
`SKILL.md` body and, optionally, call MCP tools. Ship `SKILL.md` reachable
by name + description, with by-hand fallbacks for anything that needs more.
This minimal ceiling guarantees the skill works on any Agent-Skills client.

When the target agent's capabilities are known, activate the matching
conditional rules. Each is "if the target supports X, you may/should …":

- **Filesystem access** — the agent can read and write local files. You
  *should* reference local files (not inline their contents), read repo
  conventions before authoring, and inspect existing skills before creating
  a new one (update-over-create, phase 2). The skill can point the agent to
  repo-relative paths it can open on demand.
- **Bash / tool execution** — the agent can run shell commands or scripts.
  Bundle a script in `scripts/` for fragile, exact, or repeated operations
  and have the skill *run* it rather than asking the agent to reproduce the
  logic from prose. The script's language follows the "Choose a script
  language" rule below.
- **Network / a specific MCP server** — the agent can call MCP tools or
  fetch remote resources. Express the exact operation as an MCP tool call
  or a documented dependency, not an in-head derivation the agent might get
  wrong from stale training data. If the skill needs a specific MCP server,
  name it and the tool in the body.
- **A harness with its own skill conventions / frontmatter** — the target
  harness supports non-spec frontmatter (e.g. a vendor
  `disable-model-invocation` field) or its own skill-registration mechanism.
  Keep the portable spec core intact and add the harness-specific bit as an
  explicit extension (see "Portable vs harness-specific extension" below).

**If you can't determine the target's capabilities, author to the minimal
ceiling and document by-hand fallbacks.** The skill still works — every
conditional rule is an enhancement, not a requirement.

## Portable vs harness-specific extension

The Agent Skills spec defines a portable core: `name`, `description`, and
four optional fields (`license`, `compatibility`, `allowed-tools`,
`metadata`). Anything a harness adds beyond the spec (e.g. Pi's
`disable-model-invocation`, a vendor's telemetry field) is a
**harness-specific extension** — it goes in the skill as a clearly labelled,
opt-in addition, never replacing or shadowing the portable core.

When authoring for a harness that uses extensions, structure the skill so the
portable part works on any client and the extension is a thin layer on top:
the frontmatter carries the spec fields; the harness-specific field sits
alongside them, documented as "only used by harness X." If the target is Pi,
read `references/target-pi.md` for the Pi-specific conventions.

## Core workflow (8 phases)

Adapt the phases to the task at hand. Skip a phase only with a stated
reason — each exists to prevent a specific failure mode.

1. **Understand with concrete examples.** Gather or propose-and-confirm
   real trigger requests and expected outputs before writing anything. Ask
   the most important questions first; don't interrogate when the repo or
   existing examples already answer it. *Why:* a skill written from a vague
   description will be vague; concrete examples anchor the scope and the
   description's trigger phrases.

2. **Discover existing skills — update over create.** Run
   `discover_skill` (or skim the skills directory by hand) before creating
   a new skill. If an existing skill covers the same capability, **update it
   in place** and broaden its description so the merged skill still triggers
   on everything its parts did. If the capability is merely adjacent (not
   the same), create a new skill. *Why:* duplicate skills fragment trigger
   coverage and waste context; updating keeps related knowledge in one home.

3. **Plan reusable contents.** For each concrete example, decide what goes
   where: `scripts/` for fragile/exact/repeated operations; `references/`
   for exact specs or conventions the agent should read on demand;
   `assets/` for output-embedded files (templates, schemas); conventions
   the skill must follow should be parameters, catalogued in references.
   *Why:* planning the content shape before writing prevents a bloated body
   and ensures progressive disclosure.

4. **Scaffold (new skills only).** Run `scaffold_skill` or create the folder
   + `SKILL.md` by hand. *Why:* a normalized name and standard directory
   layout from the start avoids rename churn and validation failures.

5. **Write frontmatter + body.** Write the frontmatter per the spec (see
   "Produced-skill frontmatter" below). Build and test the resources
   (scripts, references, assets) first, then write the body that ties them
   together — the body tells the agent *when* and *how* to use each
   resource. *Why:* resources built first can be tested independently; the
   body then references tested, working components.

6. **Validate.** Run `validate_skill` (or `skills-ref` if available)
   against the skill directory; fix every error. Then do a manual semantic
   pass: does the description actually match what the body teaches? Are
   references resolvable? *Why:* structural validation catches format
   errors; the semantic pass catches description/body mismatch — a common
   cause of false triggers.

7. **Adversarial self-review.** Run four checks and revise:
   - **Trigger test** — gather ≥3 should-trigger and ≥2 near-miss requests
     (queries that share keywords but need something different). Run them
     against the description; revise if a should-trigger doesn't fire or a
     near-miss does.
   - **Execution dry-run** — mentally (or actually) walk through the skill's
     instructions on a real example end to end; fix stalls, missing steps,
     or dead-ends.
   - **Context review** — ask "would a capable agent do *worse* if this
     section were removed?" If not, cut it. Every section must earn its
     tokens.
   - **Generalization review** — does the skill teach a *method* (reusable
     across inputs) or a *one-off answer* (useful only for a specific
     instance)? Favor the method.
   *Why:* this is the highest-leverage pass — it catches trigger gaps,
   execution holes, and bloat that the author is blind to after writing.

8. **Iterate on real usage.** Bundle what makes the agent reinvent the same
   helper or take the same detour; cut what false-triggers or wastes context.
   *Why:* a skill improves fastest when refined against real runs, not
   thought experiments. See `references/agent-skills-spec.md` for the
   evaluating-skills and optimizing-descriptions guidance.

## Produced-skill frontmatter

The frontmatter is the only thing the agent sees at startup — it carries
the entire trigger burden. Read `references/agent-skills-spec.md` for the
full format spec; the essential rules:

### `name` (required)

- Lowercase letters, digits, and hyphens only (`a-z0-9-`); ≤64 characters.
- No leading, trailing, or consecutive hyphens.
- **Must equal the parent directory name.**
- Verb-led when it reads naturally (e.g. `review-api-changes`); namespace by
  tool when it sharpens triggering (e.g. `git-rebase-helper`).

### `description` (required, ≤1024 characters)

This is the **only trigger mechanism.** The agent never sees the body until
the description matches, so get it right:

- **Enumerate literal phrases** for every capability the skill covers — use
  the words a user would actually type. "Create, make, build, or scaffold a
  skill" beats "skill authoring assistance."
- **Add a "Do NOT use for …" line** to bound the scope and prevent
  near-miss false triggers.
- **Err on the side of being pushy** — explicitly list contexts where the
  skill applies, including cases where the user doesn't name the domain
  directly ("even if they don't mention 'skill'").
- **Stay ≤1024 characters.** Descriptions grow during optimization; check
  the limit after each revision. Don't keyword-stuff past the limit or into
  an unnatural list — the optimizing-descriptions guide warns this degrades
  triggering.
- **Use imperative phrasing** ("Use when …") not declarative ("This skill
  does …").

### Optional spec fields

Add these only when justified — most skills need none:

- **`license`** — state one when the skill is shared or published. The
  author's or project's choice (MIT, Apache-2.0, proprietary, etc.).
- **`compatibility`** (≤500 chars) — only for a meaningful environment
  requirement the agent can't infer (e.g. "Requires Python 3.10+ and git").
  Omit it for skills with no special deps.
- **`allowed-tools`** — experimental; pre-approves specific tools so the
  agent doesn't prompt. Use sparingly; support varies by client.
- **`metadata`** — a string→string map for extra properties. Namespace your
  keys to avoid conflicts (e.g. `author`, `version`).

### Keep the portable core clean

The portable core is `name` + `description` (+ optional spec fields). Do
**not** add harness-specific fields (e.g. `disable-model-invocation`) to the
portable core. If a harness needs one, it is an explicit
"harness-specific extension" — documented as such, not presented as a
spec field. A skill carrying a non-spec field will fail portable validators
like `skills-ref`.

## Core principles

Concise guidance for what to put in a produced skill's body:

- **Assume the agent is already capable.** Add only what it lacks —
  project-specific conventions, domain-specific procedures, non-obvious
  edge cases. Don't explain what the agent already knows. Ask of each
  section: "would the agent get this wrong without this instruction?" If
  not, cut it.
- **Match instruction rigidity to task fragility.** High fragility (a
  sequence that breaks if a step is wrong) → prescribe exactly, including
  the command. Medium fragility (a method with valid variations) → teach
  the approach, explain *why*, let the agent adapt. Low fragility (many
  valid paths) → give freedom, describe the goal.
- **Progressive disclosure.** Metadata (~100 tokens: `name` +
  `description`) loads at startup; the body (<500 lines, ≲5000 tokens)
  loads on activation; resources load on demand. Keep the body lean — move
  detail to `references/`. References are one level deep (no chains). Tell
  the agent *when* to read each reference: "Read `references/api-errors.md`
  if the API returns a non-200 status" beats "see references/ for details."
- **Single-source each fact.** Each piece of knowledge has one home. Don't
  paraphrase the spec into the body — link `references/agent-skills-spec.md`.
  Don't list Pi specifics inline — link `references/target-pi.md`. Don't
  duplicate the support-script policy — link `references/support-scripts.md`.
- **Explain the *why*, not caps-rules-without-reason.** An agent that
  understands the purpose makes better context-dependent decisions than one
  following a rule it doesn't understand. "Use parameterized queries to
  prevent SQL injection" teaches; "always use parameterized queries" just
  orders.
- **Favor procedures over one-off answers.** Teach the agent *how to
  approach* a class of problems, not *what to produce* for one instance.
  A method generalizes; a one-off answer doesn't.
- **Provide defaults, not menus.** When multiple tools could work, pick a
  default and mention alternatives briefly — don't present equal options
  and make the agent choose. "Use pdfplumber; fall back to pdf2image for
  scanned docs" beats "you can use pypdf, pdfplumber, PyMuPDF, or
  pdf2image."
- **Gotchas are the highest-value content.** Environment-specific facts
  that defy reasonable assumptions — the things the agent will get wrong
  without being told. Keep gotchas in the body where the agent reads them
  *before* encountering the situation. When an agent makes a mistake you
  correct, add the correction to the gotchas.

## Choose a script language

For a *produced* skill's own bundled script (not this skill's helpers):

**When to bundle a script:** only for an operation that is fragile, exact,
repeated, or numeric — where prose would let the agent get it wrong. Keep
judgment steps as prose; script the deterministic steps.

**Language choice:**

- Match the target repo/project's canonical language. A Go repo → Go script;
  a JS/TS project → JS/TS; a Python codebase → Python.
- Default to **Python** when unconstrained — it has the broadest
  cross-platform reach with a rich stdlib.
- **Bash is supported but discouraged.** It is not reliably cross-platform
  (Windows agents may have no POSIX shell). Use it only for tiny pure-shell
  glue; prefer Python for anything that must run on Windows.

**Self-contained at the end-user's runtime:** the script must not require the
end user to install libraries or have extra CLI tools present. Two ways:

1. **Stdlib-only** — the lightest option; no dependencies.
2. **Bundle libraries into one committed file** via a build step (Python
   `zipapp` / JS bundler) and commit the built artifact to the git tree. The
   end user runs the artifact, not the source. Network calls (HTTP/API) are
   an acceptable runtime dependency — what we avoid is requiring local
   library installs or extra CLI tools.

**By-hand fallback — a considered, safety-first choice, not a default:**

- Provide a by-hand fallback only when the path is safe, deterministic, and
  within the agent's reliable capability.
- **Omit it for dangerous, irreversible, or non-obvious ops** — e.g. an API
  mutation the agent might fumble from outdated docs. For those, have the
  skill *stop and require the script* (or a human) rather than hand the
  agent a recipe to execute badly.

**Test** the script on a worked example with a known answer. When bundling,
test the committed artifact (the `.pyz`/`.mjs` the end user runs), not just
the source.

For the full policy (when to ship, language details, bundling mechanism,
Bash Windows/POSIX caveats, shape, testing), read
`references/support-scripts.md` first, then the per-language file for the
chosen language: `references/support-scripts-python.md`,
`references/support-scripts-js-ts.md`, or
`references/support-scripts-bash.md`.

## What not to include / principle of no surprise

- No `README`, `CHANGELOG`, install guide, or dev diary in the skill
  directory — the spec forbids extraneous docs, and they waste context.
- No malware, exfiltration, or persistence mechanisms.
- **Make consequential behavior explicit in the description.** If the skill
  runs destructive commands, sends network requests, or mutates state, say
  so in the `description` so the agent and the user know before activation.

## Helper scripts

Three Node scripts in `scripts/` automate the repetitive parts of skill
authoring. Each has a by-hand fallback if you can't run Node.

- **`validate_skill.mjs`** — `node scripts/validate_skill.mjs <skill-dir>`.
  Run it **before finishing** a skill. Checks frontmatter (`name` hyphen-case
  ≤64 == folder, `description` ≤1024 no angle brackets, only allowed keys:
  `name`, `description`, `license`, `compatibility`, `allowed-tools`,
  `metadata`). Exits 0 + `OK` on pass, 1 + first-error on fail.
  *By-hand fallback:* open `SKILL.md` and confirm the frontmatter opens with
  `---`, has a `name` in hyphen-case ≤64 == folder, a `description` ≤1024
  with no angle brackets, and no keys outside the allowed set.

- **`scaffold_skill.mjs`** — `node scripts/scaffold_skill.mjs <name>
  [--path <dir>] [--resources scripts,references,assets]`. Run it **for new
  skills only**. Normalizes the name, creates the folder + `SKILL.md`
  template. Refuses to overwrite — to UPDATE, edit in place.
  *By-hand fallback:* create the directory, write a `SKILL.md` with
  `name: <normalized-name>` and `description: TODO`, then add resource dirs.

- **`discover_skill.mjs`** — `node scripts/discover_skill.mjs "<intent>"
  --skills-dir <dir> [--threshold 0.4] [--json]`. Run it **before creating**
  a new skill to avoid near-duplicates. Ranks existing skills by name +
  description token overlap; candidates ≥ threshold get an "UPDATE over
  create" hint.
  *By-hand fallback:* list the skills directory, read each `SKILL.md`
  frontmatter, and judge by name + description relevance to your intent.
  Prefer updating over creating a duplicate.

## References

Read these on demand — each has a specific trigger. References are one
level deep; don't create chains.

- **`references/agent-skills-spec.md`** — the portable Agent Skills format
  (directory structure, frontmatter rules with the 64/1024/500 limits, body
  guidance, progressive disclosure, file refs one level deep, validation via
  `skills-ref`). Read when authoring frontmatter or deciding structure.

- **`references/target-pi.md`** — authoring for a Pi package
  (`skills/<name>/` + `package.json` `pi.skills` registration +
  `tests/skills.test.ts` coverage, the repo gate, companion-doc precedent,
  Pi-only frontmatter as explicit harness extensions). Read when the target
  is Pi.

- **`references/support-scripts.md`** — the **shared** support-script
  backbone: when to ship a script, language choice (incl. Bash/Windows), the
  self-contained dependency + build policy, the safety-first by-hand-fallback
  decision, shape, and testing. Read first when bundling a produced-skill
  script.

- **`references/support-scripts-python.md`** — Python specifics: bundling
  (`zipapp`), shebang/invocation, testing, stdlib-only vs. bundled. Read when
  the chosen language is Python.

- **`references/support-scripts-js-ts.md`** — JS/TS specifics: bundler
  heuristic, source-vs-committed-artifact shape, shebang/invocation, testing.
  Read when the chosen language is JS or TS.

- **`references/support-scripts-bash.md`** — Bash specifics: `set -euo
  pipefail` vs POSIX `sh`, Windows/POSIX caveats, when Bash is genuinely the
  right tool. Read when the chosen language is Bash.

- **`references/trigger-design.md`** *(optional)* — only if trigger detail
  outgrows the body. Default: keep the trigger method in the body above and
  the optimizing-descriptions guidance in `references/agent-skills-spec.md`.
