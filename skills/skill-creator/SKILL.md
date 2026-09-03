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

<!-- Slice 2 populates this section: validate_skill.mjs, scaffold_skill.mjs,
     discover_skill.mjs. -->

## References

<!-- Slice 3 populates this section with a one-level-deep index:
     agent-skills-spec.md, target-pi.md, support-scripts.md, and per-language
     script guides. -->
