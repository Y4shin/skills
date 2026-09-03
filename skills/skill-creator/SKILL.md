---
name: skill-creator
description: Create, make, build, or scaffold a new Agent Skill from a workflow, capability, or set of instructions. Turn a runbook, checklist, or repeated workflow into a skill. Improve, refactor, or fix a skill that isn't triggering reliably or whose SKILL.md needs tightening. Review a skill for unnecessary context usage and trim it. Decide whether to update an existing skill or create a new one. Make a harness-specific or Claude-oriented skill portable across agents. Do NOT use for writing a plain README, general documentation, or ordinary coding tasks that are not about authoring an Agent Skill.
---

# /skill-creator — Agent Skill Authoring Helper

Create, review, update, and improve other Agent Skills. Produces small,
spec-conformant, well-triggered skills that load wherever the Agent Skills
format is supported.

## Capability ceiling

**Default:** author a generic skill assuming only that the agent can read
this body and optionally call MCP tools. Conditional rules below activate
when the target's capabilities are known.

- **Filesystem** — the agent can read and write files; produce skills that
  scaffold directories and reference files.
- **Bash / exec** — the agent can run shell commands; produce skills that
  bundle helper scripts.
- **Network / MCP** — the agent can call MCP tools or fetch remote
  resources; produce skills that reference live endpoints.
- **Harness extensions** — the target harness supports non-spec frontmatter
  fields (e.g. `disable-model-invocation`); keep these out of the portable
  core and document them as explicit opt-in extensions.

## Core workflow (8 phases)

1. **Understand** — read the request, the target agent's capabilities, and
   any existing skill to update.
2. **Discover or update-over-create** — check for an existing skill that
   already covers the intent; prefer updating over creating a duplicate.
3. **Plan** — decide the skill's name, description, scope, and which
   capability rules apply.
4. **Scaffold** — create the folder, `SKILL.md`, and `scripts/`/`references/`
   dirs as needed.
5. **Write frontmatter + body** — spec-pure `name` + `description`; lean body
   with progressive disclosure.
6. **Validate** — run the validator against the new skill; fix any errors.
7. **Adversarial self-review** — trigger test, context review, generalization
   review.
8. **Iterate** — apply review findings; re-validate; register if Pi is the
   target.

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

<!-- Slice 3 populates this section with a one-level-deep index:
     agent-skills-spec.md, target-pi.md, support-scripts.md, and per-language
     script guides. -->
