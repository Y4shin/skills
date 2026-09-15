# Isolation checklist for headless pi eval runners

The recipe a hermetic eval runner must follow, verified empirically against
pi 0.84.4 by the isolation spike (full evidence in that task's findings).
The isolation reviewer checks each item; during triage, a violation of any
item is a candidate root cause for polluted or irreproducible results.

## The recipe

1. **Redirected agent dir.** The run sets `PI_CODING_AGENT_DIR` to a temp
   directory, so user-global skills, extensions, packages, settings, and
   trust decisions are invisible.
2. **Auth seeding.** The temp agent dir contains exactly three files from
   the real one: the credentials file, the provider catalog (custom
   providers live there), and a stripped settings file with an empty
   packages list. A bare agent dir dies with "No API key found for the
   selected model" (exit 1).
3. **Discovery fully disabled.** The command passes all five disable flags:
   extensions, skills, context files, prompt templates, themes. Each flag
   kills its resource type's discovery, including trusted project-local
   resources.
4. **Under-test resources re-added explicitly.** The skill under test is
   passed via the additive `--skill` flag (it still loads under
   `--no-skills`), extensions via `-e`. Fixture skills ride along as
   explicit `--skill` paths too.
5. **Fixture placement.** The fixture repo is a temp-dir copy, reinitialized
   as a git repo, placed **outside any enclosing repo root**. Inside a
   repo, ancestor `.agents/skills` directories and root AGENTS.md context
   files leak into the run whenever discovery is on.
6. **Project-local files ignored.** The run passes the ignore flag for
   project trust, so fixture `.pi/settings.json` and `.pi/skills/` do not
   load. Trust flags cannot be used for selective loading: granting trust
   pulls in *all* project-local resources.
7. **Canary assertion.** A canary extension rides in both arms and writes
   what pi actually loaded (skills, context files, active tools, from the
   session-start system-prompt options). The eval asserts the loaded set
   equals the intended set, with the canary itself subtracted. A planted
   leak must be detectable: the positive-control property.
8. **Completion and error detection.** The runner parses the JSON event
   stream: completion is the agent-end event; model errors surface as an
   error stop reason inside the stream while the process still exits 0;
   configuration failures exit 1 with stderr. Never trust the exit code
   alone. Single-shot runs pass the no-session flag; multi-turn scenarios
   chain runs via the session-id flag.
9. **Model pinning.** The model is fixed by the seeded agent dir (settings
   default plus provider catalog) or an explicit model flag. The model
   never comes from ambient user configuration, and baseline and treatment
   arms pin it identically.

## Baseline vs treatment

The two arms must differ by exactly the treatment: same fixture, same
seeded agent dir, same model, same prompts. The baseline is the same
command minus the under-test `--skill`/`-e` resources. The canary rides in
both arms. Any other difference invalidates the comparison.
