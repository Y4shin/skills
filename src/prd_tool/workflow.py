"""Workflow versioning for the prd-workflow.

The prd-workflow has a *convention version* — the set of layout/tracker/forge
rules the skills assume. It is recorded in the dotfile
``docs/prd/.workflow-version`` (a bare integer). **Absence means version 0**, the
implicit legacy baseline that predates versioning. The bundled tool targets
:data:`CURRENT_VERSION`.

Three pieces hang off this:

* ``gate`` — injected (via the SKILL ``!`` syntax) into every *operational*
  skill. It prints **nothing** when the repo is at the current version (so it
  costs no context) and a REFUSE block otherwise, directing the user to
  ``/init-prd-workflow`` (no file) or ``/update-prd-workflow`` (stale file).
* ``init_instructions`` — the body the (otherwise empty) ``init-prd-workflow``
  skill injects: create the version file, picking the right baseline.
* ``migrate_instructions`` — the body ``update-prd-workflow`` injects: the
  ordered, provider-aware steps to walk the stored version up to current.

Keeping the real instructions here (emitted on demand) rather than in the SKILL
bodies means an up-to-date repo pays zero context for any of it, and a noop is an
explicit "do nothing" rather than a blank the agent might fill with invention.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

# Bump this when a new set of conventions ships, and add a Migration below.
CURRENT_VERSION = 1

# How the skills invoke the bundled tool (matches forge.PRD_TOOL); used in the
# emitted instruction text so the agent can copy/paste the next command.
_TOOL = 'python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prd_tool.pyz"'


def version_file(root: Path) -> Path:
    return root / "docs" / "prd" / ".workflow-version"


def has_version_file(root: Path) -> bool:
    return version_file(root).is_file()


def read_version(root: Path) -> int:
    """The repo's stored workflow version; 0 if no (or unparsable) file."""
    p = version_file(root)
    if not p.is_file():
        return 0
    try:
        return int(p.read_text(encoding="utf-8").strip())
    except ValueError:
        return 0


def write_version(root: Path, n: int) -> Path:
    p = version_file(root)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(f"{n}\n", encoding="utf-8")
    return p


# --------------------------------------------------------------------- gate

def _refuse(reason: str, remedy: str) -> str:
    return (
        f"> [!STOP] prd-workflow version check failed — {reason}\n"
        f"> **Do not run any prd-workflow steps and take no other action.** {remedy}"
    )


def gate(root: Path) -> str:
    """Instruction injected into operational skills. Empty string == proceed."""
    if not has_version_file(root):
        return _refuse(
            "this repo has no docs/prd/.workflow-version file (uninitialized).",
            "If the prd-workflow has never been used here, tell the user to run "
            "`/prd-workflow:init-prd-workflow` (starts at the current version); if it has prior "
            "data to carry forward, `/prd-workflow:update-prd-workflow` (migrates from v0). "
            "Then retry.",
        )
    v = read_version(root)
    if v < CURRENT_VERSION:
        return _refuse(
            f"repo is at workflow v{v}; this tool expects v{CURRENT_VERSION}.",
            "Tell the user to run `/prd-workflow:update-prd-workflow` to migrate, then retry.",
        )
    if v > CURRENT_VERSION:
        return _refuse(
            f"repo is at workflow v{v}, newer than this tool (v{CURRENT_VERSION}).",
            "The plugin is out of date — tell the user to update the prd-workflow plugin.",
        )
    return ""  # current: print nothing, do not pollute context


# ------------------------------------------------------------------- noop text

def _noop(state: str) -> str:
    return (
        f"✓ prd-workflow {state} No migration or initialization is needed — "
        "**this is a no-op. Do not create or modify any files and take no action.** "
        "Just tell the user there is nothing to do."
    )


# --------------------------------------------------------------------- init

def init_instructions(root: Path) -> str:
    """Body injected by the init-prd-workflow skill.

    Init assumes the prd-workflow has never been used in this repo, so it stamps
    the **current** version directly. (A repo with prior data to carry forward
    should use update-prd-workflow, which assumes v0 when there's no file.)
    """
    if has_version_file(root):
        v = read_version(root)
        if v == CURRENT_VERSION:
            return _noop(f"is already initialized at v{v}.")
        return (
            f"This repo already has a version file (v{v}) — it has been used before, so init "
            f"does not apply. To move to v{CURRENT_VERSION}, tell the user to run "
            "`/prd-workflow:update-prd-workflow` instead. **Do nothing else here.**"
        )
    return (
        f"Initialize the prd-workflow at the current version — run exactly:\n\n"
        f"    {_TOOL} workflow-version set {CURRENT_VERSION}\n\n"
        f"Then confirm to the user that the prd-workflow is initialized at "
        f"v{CURRENT_VERSION}. Do nothing else."
    )


# ------------------------------------------------------------------ migrate

@dataclass
class Migration:
    target: int          # the version this migration produces
    summary: str         # one-line description
    body: str            # the concrete, provider-aware steps (no version-set)


def _migration_0_to_1(provider: str) -> str:
    if provider == "gh":
        list_epics = "gh issue list --label epic"
        make_ms = 'gh api --method POST "repos/<owner>/<repo>/milestones" -f title="<epic-title>"'
        assign = 'gh issue edit <prd#> --milestone "<epic-title>"'
        close_epic = 'gh issue close <epic#> --comment "Converted to milestone."'
    elif provider == "fgj":
        list_epics = f"{_TOOL} forgejo list --label epic"
        make_ms = f'{_TOOL} forgejo milestone create "<epic-title>"'
        assign = f'{_TOOL} forgejo set-milestone <prd#> "<epic-title>"'
        close_epic = f'{_TOOL} forgejo close <epic#> --comment "Converted to milestone."'
    else:  # local
        list_epics = f"{_TOOL} tracker list --label epic"
        make_ms = f'{_TOOL} tracker milestone create "<epic-title>"'
        assign = f'{_TOOL} tracker set-milestone <prd#> "<epic-title>"'
        close_epic = f'{_TOOL} tracker close <epic#> --comment "Converted to milestone."'
    return (
        "An epic is now a **milestone**, not an issue. If this repo has epic *issues* from the "
        "old model, convert each one (slices already block their PRD via dependencies — no change "
        "there):\n\n"
        f"1. Find epic issues:\n       {list_epics}\n"
        "   (No epics ⇒ nothing to do; this is a no-op.)\n"
        f"2. Create a milestone from the epic's title:\n       {make_ms}\n"
        "3. Reassign every child PRD issue of that epic to the milestone (read the children from "
        f"`prds[].issue` in epic.md):\n       {assign}\n"
        "4. In each `docs/prd/epics/<slug>/epic.md`, replace `epic_issue: <#n>` with "
        "`epic_milestone: <milestone-id>`.\n"
        f"5. Close the obsolete epic issue:\n       {close_epic}"
    )


# Keyed by target version. Append future versions here; migrate_instructions
# walks stored+1 .. CURRENT_VERSION in order.
def _migrations(provider: str) -> dict[int, Migration]:
    return {
        1: Migration(
            target=1,
            summary="an epic is a milestone (not an issue); PRD issues join it, slices block the PRD",
            body=_migration_0_to_1(provider),
        ),
    }


def migrate_instructions(root: Path, provider: str) -> str:
    """Body injected by the update-prd-workflow skill.

    A missing version file is treated as **v0** (the pre-versioning baseline), so
    update migrates forward from there rather than refusing — that's the path for
    a repo with prior prd-workflow data. (A genuinely fresh repo should use
    init-prd-workflow, which stamps the current version directly.)
    """
    v = read_version(root)  # 0 when no file exists
    if v == CURRENT_VERSION:
        return _noop(f"is already at v{v}.")
    if v > CURRENT_VERSION:
        return _noop(f"is at v{v}, newer than this tool (v{CURRENT_VERSION}).")

    migs = _migrations(provider)
    steps = []
    for target in range(v + 1, CURRENT_VERSION + 1):
        m = migs.get(target)
        if m is None:
            continue
        steps.append(f"### v{target - 1} → v{target} — {m.summary}\n\n{m.body}")
    body = "\n\n".join(steps)
    return (
        f"Migrate this repo's prd-workflow from v{v} to v{CURRENT_VERSION}. "
        f"Perform each step below in order, then record the new version.\n\n"
        f"{body}\n\n"
        f"### Finalize\n\nRecord the new version — run exactly:\n\n"
        f"    {_TOOL} workflow-version set {CURRENT_VERSION}\n\n"
        f"Then confirm to the user that the repo is now at v{CURRENT_VERSION}."
    )
