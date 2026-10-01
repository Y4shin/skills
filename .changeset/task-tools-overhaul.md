---
"task-workflow": major
---

The v4 tool-surface overhaul: the tool family is renamed to the `tw_` prefix
(`tw_show`, `tw_get`, `tw_set`, `tw_list`, `tw_frontier`,
`tw_dependency_levels`, `tw_finalizable`, `tw_map_finalizable`, `tw_state`,
`tw_state_set`, `tw_context`) and the registered surface shrinks to exactly
those 11 tools plus `notify_user`. Removed: `tw_resolve`, `tw_assert_kind`,
`tw_map_tasks`, `tw_map_tick`, `tw_slices`, `tw_set_slices`, the guidelines
feature (`get_guidelines`/`list_guidelines` and the system-prompt injection;
standards are read directly from repo files), and the slice machinery (skills
read standards files directly; chains are per-ticket over the effort
frontier). The schema reference (`tw_context`) now tells the v4 truth: the
effort-grouped `docs/tasks/` tree with decision tasks and implementation
tickets, OKF frontmatter, `workflow_state` alongside `status`, and the
state file with lossless round-trips. `setup-workflow` migrates any vintage
to `schema_version: 4` in one idempotent, resumable hop. All 29 promoted
skills now have human-facing docs pages under `docs/<bucket>/`.
