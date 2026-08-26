## Deviation report — improve-arch-skill-and-scout

### API surface changes
- **Planned:** Slice 1 exports the `/improve-codebase-architecture` skill, read-only `architecture-scout`, vendored report dependencies, package registration, and structure tests. The architecture spec assigns the HTML report scaffold and complete report/grilling wiring to slice 2.
- **Actual:** Implemented all planned slice-1 exports and also added `HTML-REPORT.md` in this slice, as required by the slice document's Deliverables section. The skill also documents the survey/no-grill/Wayfinder handoff flow, while the report-generation behavior remains prose rather than runtime code.
- **Impact:** No public runtime API changes. Slice 2 can consume the vendored assets and report scaffold, but its ownership boundary should be clarified before implementation.

### Abstraction usage
- Used/was specified: yes — Pi skill/subagent manifests, the `codebase-design` skill reference, Wayfinder handoff, existing grilling conventions, read-only scout tools, and structure-test assertions were used.

### Out-of-scope changes
- `HTML-REPORT.md` landed one slice earlier than the architecture spec's slice ownership, but it is explicitly listed in the slice document's required Deliverables, so this is a planning inconsistency rather than an implementation expansion.
- No application source code or unrelated configuration was changed.

### Task doc update needed?
Yes — append an Implementation note clarifying that `HTML-REPORT.md` and the initial survey/no-grill/handoff prose landed in slice 1 because the slice document listed them as Deliverables; update the architecture spec/slice boundary before slice 2.

### User attention needed?
Yes — the architecture spec and slice document disagree about whether the HTML report scaffold belongs to slice 1 or slice 2. No API change requires intervention, but the user should confirm the intended ownership before slice 2 proceeds.

## Review findings

- No functional blockers found.
- `agents/architecture-scout.md` has the required read-only tool allowlist (`read, bash, get_guidelines`) and explicitly forbids edits.
- Vendored assets exist at the expected paths: Tailwind 407,279 bytes and Mermaid 3,572,661 bytes.
- `npx vitest run tests/skills.test.ts` passed: 174/174.

## Residual risks

- The generated HTML report behavior is currently documented as skill prose; no runtime report generator exists in this slice.
- The report template uses absolute-path placeholders that a future generator must resolve correctly for offline viewing.
- The task's architecture spec and slice doc have contradictory ownership of `HTML-REPORT.md`; slice 2 should not proceed until this boundary is recorded consistently.
