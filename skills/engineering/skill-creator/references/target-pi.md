# Targeting Pi, Authoring a Skill for a Pi Package

Read when the target is Pi.

This reference covers Pi-specific conventions for authoring an Agent Skill
that ships inside a Pi package. The portable format rules (frontmatter,
directory structure, progressive disclosure) live in
`agent-skills-spec.md`, this file covers only what differs when the
target is Pi.

## Where Pi skills live

A Pi skill is a directory under `skills/`:

```
skills/<name>/
└── SKILL.md
```

The directory name must match the `name` field in the frontmatter (same
rule as the portable spec). The skill is registered in `package.json` under
`pi.skills`:

```json
{
  "pi": {
    "skills": [
      "./skills/<name>"
    ]
  }
}
```

Each entry is a path string (e.g. `"./skills/my-skill"`). Pi discovers and
loads skills from this list at startup.

## Structure test coverage

Conventionally, every skill in the package is covered by
`tests/skills.test.ts`. Two assertions are kept in sync with the manifest:

1. **`SKILL_FILES` array**, lists every `skills/<name>/SKILL.md` path.
   When you add a skill, append its path to this array.

2. **`pi.skills.length` assertion**, the test asserts that the
   `package.json` `pi.skills` array length equals the expected count.
   When you add a skill, bump this number.

For example, if the manifest is at 17 skills and you add one:

```typescript
const SKILL_FILES = [
  // ...existing entries...
  "skills/my-new-skill/SKILL.md",
];

// In the package.json test block:
test("has skills list", () => {
  expect(pkg.pi.skills.length).toBe(18);
  expect(pkg.pi.skills).toContain("./skills/my-new-skill");
});
```

## The repo gate

`task-workflow` (this package) has a **repo gate**: it auto-disables in
work repositories. The gate reads `settings.json` for
`taskWorkflow.disableOnRepo` patterns and matches them against the git
remote origin. When the gate is active, the package's skills are stripped
from the system prompt and explicit `/skill:<name>` invocations are
blocked.

Because `skill-creator` ships inside `task-workflow`, it inherits this
gating. A skill you **produce** for this package also inherits the gate:
it will not load in work repos. State this so the author isn't surprised:
the skill works in personal repos and anywhere `task-workflow` is
installed and not gated, but it is invisible in work repos.

This is a feature, not a bug, the gate keeps workflow skills out of
unrelated work contexts.

## Companion reference files

Companion reference files alongside `SKILL.md` are an established
precedent in this repo. The `tdd` skill ships `tests.md` and `mocking.md`
alongside its `SKILL.md`, keeping the main file lean while providing
focused reference material the agent loads on demand.

Use companion references when they keep the main `SKILL.md` lean, move
detailed specs, conventions, or per-language guidance into `references/`.
Keep references **one level deep**: `SKILL.md` links directly to a
reference file, not to a chain of references pointing to more references.

## Pi-specific frontmatter (harness extensions, not the portable core)

This repo's own skills use two frontmatter fields that are **Pi-specific
and not in the Agent Skills spec**:

### `disable-model-invocation: true`

```yaml
disable-model-invocation: true
```

Prevents the model from auto-invoking the skill. The skill is reachable
only via an explicit `/skill:<name>` invocation. Used by skills that
should not auto-trigger (e.g. `wayfinder`, `wait-what`,
`improve-codebase-architecture`).

### `metadata.telemetry.capture: "target"`

```yaml
metadata:
  telemetry.capture: "target"
```

Tags the skill for Pi's telemetry instrumentation. The
`telemetry_skill_context` tool uses this to correlate skill invocations
with their target artifact.

### Both are harness-specific extensions

These fields **fail external validators** like `skills-ref` because they
are not in the Agent Skills spec. If a produced Pi skill uses either, it is
a deliberate harness-specific extension, not part of the portable core:

- The **portable core** stays spec-pure: only `name` + `description` (and
  the optional spec fields `license`, `compatibility`, `metadata`,
  `allowed-tools`).
- The **Pi extension** is opt-in and documented. Add it only when there is
  a real reason, and note in the skill that the field is Pi-specific.

**Recommendations:**

- Only add `disable-model-invocation` when the skill genuinely shouldn't
  auto-trigger. A skill that should fire on natural-language requests
  (like `skill-creator` itself) must **not** carry it.
- Only add `metadata.telemetry.capture` when the package's
  instrumentation expects it. Most skills don't need it.

## Worked example: scaffolding a tiny Pi skill

Suppose you want a skill named `lint-fixer` that runs a linter and fixes
issues. The package manifest is currently at 17 skills.

### 1. Create the directory and `SKILL.md`

```
skills/lint-fixer/
└── SKILL.md
```

```yaml
---
name: lint-fixer
description: Run the project linter and auto-fix issues. Use when the user asks to fix lint errors, clean up warnings, or run a formatter.
---
```

### 2. Register in `package.json`

Add `"./skills/lint-fixer"` to `pi.skills`:

```json
"pi": {
  "skills": [
    // ...existing 17 entries...
    "./skills/lint-fixer"
  ]
}
```

The list length goes from 17 → 18.

### 3. Add a structure-test row

In `tests/skills.test.ts`:

- Append `"skills/lint-fixer/SKILL.md"` to the `SKILL_FILES` array.
- Bump the length assertion: `expect(pkg.pi.skills.length).toBe(18)`.
- Optionally add `expect(pkg.pi.skills).toContain("./skills/lint-fixer")`.

### 4. Run the tests

```shell
npm test
```

All structure tests pass, including the new `lint-fixer` row and the
bumped manifest length.
