---
"@y4shin/pi-task-workflow": minor
---

Quote the `intake` and `wayfinder` descriptions so pi can load their frontmatter.

Both descriptions carried an unquoted `": "`, which is not legal inside a YAML
plain scalar. Pi reported `Nested mappings are not allowed in compact mappings`
and skipped the two skills entirely.

- `intake` and `wayfinder` now use double-quoted `description` values, matching the other long descriptions in this package.
- `tests/skills.test.ts` parses every shipped `SKILL.md` and agent file with the real frontmatter parser from `src/core/frontmatter.ts`. The previous hand-rolled line scanner accepted invalid YAML, which is why CI never caught this.
