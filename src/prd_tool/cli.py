"""``prd-tool`` — query & mutate the YAML frontmatter of a repo's docs/prd tree.

The commands mirror the operations the prd-workflow skills perform on artifact
frontmatter: resolving a slug/issue to a file, asserting an artifact's ``kind``
before slicing it, filling in issue numbers and slice lists, ticking an epic's
child PRDs, and checking the lifecycle gates that drive the self-cleaning
``finalize-*`` steps.
"""

from __future__ import annotations

import importlib.resources
import json
import sys
from pathlib import Path

import click

from . import forge as forge_mod
from . import forgejo_api, model, tracker as tracker_mod, validate, workflow as workflow_mod
from .forgejo_api import ForgejoError
from .frontmatter import FrontmatterError
from .model import ResolutionError
from .tracker import TrackerError


def _fail(msg: str, code: int = 1) -> "click.ClickException":
    err = click.ClickException(msg)
    err.exit_code = code
    return err


def _coerce(value: str):
    """Turn a CLI string into a YAML-native scalar: int, bool, null, or str."""
    low = value.lower()
    if low in ("null", "none", "~"):
        return None
    if low in ("true", "false"):
        return low == "true"
    s = value.lstrip("#")
    if s.isdigit():
        return int(s)
    return value


pass_root = click.make_pass_decorator(Path)


@click.group(context_settings={"help_option_names": ["-h", "--help"]})
@click.option(
    "--root",
    type=click.Path(file_okay=False, path_type=Path),
    default=None,
    help="Repo root (defaults to auto-detecting the dir containing docs/prd or .git).",
)
@click.pass_context
def cli(ctx: click.Context, root: Path | None) -> None:
    """Query & mutate prd-workflow artifact frontmatter under docs/prd/."""
    ctx.obj = model.find_root(root or Path.cwd())


def _reference_text() -> str:
    """The bundled PRD/artifact frontmatter reference (references/artifacts.md).

    Read from the packaged copy when running as the zipapp; fall back to the
    canonical file under the plugin tree when running from a source checkout.
    """
    res = importlib.resources.files(__package__).joinpath("artifacts.md")
    if res.is_file():
        return res.read_text(encoding="utf-8")
    src = Path(__file__).resolve().parents[2] / "plugins" / "prd-workflow" / "references" / "artifacts.md"
    return src.read_text(encoding="utf-8")


def _profile_text(root: Path) -> str:
    """Read `docs/prd/profile.md` from the repo root. Returns empty string if missing."""
    p = root / "docs" / "prd" / "profile.md"
    if p.is_file():
        return p.read_text(encoding="utf-8")
    return ""


# ---------------------------------------------------------------- read / query

@cli.command()
def reference() -> None:
    """Print the bundled PRD/artifact frontmatter reference (the schema + layout
    + lifecycle the skills inject as context). Replaces a plain `cat` of the
    file, which the host blocks for paths outside the working directory."""
    click.echo(_reference_text(), nl=False)


@cli.command()
@pass_root
def profile(root: Path) -> None:
    """Print the project profile (docs/prd/profile.md) if it exists.

    The profile provides project-specific context (architecture layers, test
    infrastructure, code conventions, knowledge destinations) that the skills
    use to tailor their behaviour. If the file is absent, prints nothing —
    skills degrade gracefully.
    """
    text = _profile_text(root)
    if text:
        click.echo(text, nl=False)


@cli.command(name="forge")
@click.argument("key")
def forge_cmd(key: str) -> None:
    """Emit the provider-correct git-host command snippet for KEY.

    Detects GitHub (gh) vs Forgejo/Codeberg/Gitea (fgj) from the `origin`
    remote and prints the one snippet the calling skill needs. Run
    `forge keys` for the full list. (Folds in the old forge_detect.sh.)
    """
    text, code = forge_mod.render(key)
    if code:
        raise _fail(text, code=code)
    click.echo(text)


@cli.command(name="toolpath")
def toolpath_cmd() -> None:
    """Print the absolute command to invoke this tool: python3 "<path-to-pyz>".

    Skills inject this once (their `prd_tool` shorthand) so the commands the model
    runs in the Bash tool carry a real absolute path — ${CLAUDE_SKILL_DIR} /
    ${CLAUDE_PLUGIN_ROOT} are not present in the Bash tool's runtime environment.
    """
    click.echo(forge_mod.PRD_TOOL)


@cli.command(name="list")
@click.option("--kind", type=click.Choice(("epic", "feature", "capability")), default=None)
@click.option("--status", default=None, help="Filter by frontmatter status:.")
@click.option("--epic", "epic_slug", default=None, help="Only PRDs belonging to this epic slug.")
@click.option("--json", "as_json", is_flag=True, help="Emit JSON instead of a table.")
@pass_root
def list_cmd(root: Path, kind, status, epic_slug, as_json) -> None:
    """List epics and PRDs in the tree, with optional filters."""
    arts = model.discover_all(root)
    rows = []
    for a in arts:
        if kind and a.kind != kind:
            continue
        if status and a.status != status:
            continue
        if epic_slug and a.doc.data.get("epic") != epic_slug:
            continue
        rows.append(
            {
                "kind": a.kind,
                "slug": a.slug,
                "status": a.status,
                "issue": a.issue,
                "epic": a.doc.data.get("epic"),
                "path": str(a.path.relative_to(root)),
            }
        )
    if as_json:
        click.echo(json.dumps(rows, indent=2))
        return
    if not rows:
        click.echo("(no matching artifacts)")
        return
    width = max(len(r["kind"]) for r in rows)
    for r in rows:
        issue = f"#{r['issue']}" if r["issue"] else "-"
        click.echo(f"{r['kind']:<{width}}  {r['slug']:<28} {str(r['status'] or '-'):<14} {issue:<6} {r['path']}")


@cli.command()
@click.argument("selector")
@click.option("--kind", type=click.Choice(("epic", "prd")), default=None, help="Constrain the resolution.")
@pass_root
def resolve(root: Path, selector: str, kind) -> None:
    """Print the file path for a slug, issue number, or path SELECTOR."""
    a = model.resolve(root, selector, want=kind)
    click.echo(a.path)


@cli.command()
@click.argument("selector")
@click.argument("field")
@pass_root
def get(root: Path, selector: str, field: str) -> None:
    """Print a single frontmatter FIELD of the artifact SELECTOR."""
    a = model.resolve(root, selector)
    if field not in a.doc.data:
        raise _fail(f"{a.path}: no frontmatter field {field!r}")
    val = a.doc.data[field]
    click.echo(json.dumps(val) if isinstance(val, (list, dict)) else val)


@cli.command()
@click.argument("selector")
@click.option("--json", "as_json", is_flag=True)
@pass_root
def show(root: Path, selector: str, as_json) -> None:
    """Print the full frontmatter of the artifact SELECTOR."""
    a = model.resolve(root, selector)
    if as_json:
        click.echo(json.dumps(a.doc.data, indent=2))
    else:
        for k, v in a.doc.data.items():
            click.echo(f"{k}: {json.dumps(v) if isinstance(v, (list, dict)) else v}")


@cli.command(name="assert-kind")
@click.argument("selector")
@click.argument("kind", type=click.Choice(("epic", "feature", "capability")))
@pass_root
def assert_kind(root: Path, selector: str, kind: str) -> None:
    """Exit non-zero unless SELECTOR's frontmatter kind is KIND.

    Used by the *-prd-to-issues / epic-to-prds skills to refuse a mismatched
    artifact before slicing it.
    """
    a = model.resolve(root, selector)
    actual = a.doc.data.get("kind")
    if actual != kind:
        hint = {
            "epic": "epic-to-prds",
            "feature": "feature-prd-to-issues",
            "capability": "capability-prd-to-issues",
        }.get(actual, "the matching skill")
        raise _fail(f"{a.path}: kind is {actual!r}, expected {kind!r} — use {hint} instead.", code=2)
    click.echo(f"ok: {a.slug} is kind:{kind}")


# ----------------------------------------------------------------- lint

@cli.command(name="list-bad-files")
@click.option("--json", "as_json", is_flag=True, help="Emit JSON instead of bare paths.")
@click.option("--strict", is_flag=True, help="Exit 1 if any artifact has violations.")
@pass_root
def list_bad_files(root: Path, as_json, strict) -> None:
    """List the artifact files whose frontmatter violates the schema (one path per line).

    Surfaces legacy/hand-written epic.md and prd.md docs that are missing the
    fence or required fields — the fix-up worklist for the adopt-prd skill.
    """
    bad = [r for r in validate.scan(root) if not r.ok]
    if as_json:
        rows = [
            {"path": str(r.path.relative_to(root)), "family": r.family, "violations": r.violations}
            for r in bad
        ]
        click.echo(json.dumps(rows, indent=2))
    elif not bad:
        click.echo("(no frontmatter violations)")
    else:
        for r in bad:
            click.echo(r.path.relative_to(root))
    if strict and bad:
        raise _fail(f"{len(bad)} artifact(s) with frontmatter violations", code=1)


@cli.command(name="show-violations")
@click.argument("selector", required=False)
@click.option("--json", "as_json", is_flag=True)
@click.option("--strict", is_flag=True, help="Exit 1 if any artifact has violations.")
@pass_root
def show_violations(root: Path, selector, as_json, strict) -> None:
    """Show each artifact's frontmatter violations with a clear description.

    With no SELECTOR, scans the whole docs/prd tree; with a path SELECTOR (to a
    prd.md/epic.md or its directory), reports just that file. Only files with at
    least one violation are listed.
    """
    if selector:
        p = Path(selector)
        target = (p / ("epic.md" if (p / "epic.md").exists() else "prd.md")) if p.is_dir() else p
        if not target.exists():
            raise _fail(f"{selector!r}: no such file")
        target = target.resolve()
        reports = [validate.validate_file(target, validate.family_for(target))]
    else:
        reports = validate.scan(root)

    bad = [r for r in reports if not r.ok]
    if as_json:
        rows = [
            {"path": str(r.path.relative_to(root)), "family": r.family, "violations": r.violations}
            for r in bad
        ]
        click.echo(json.dumps(rows, indent=2))
    elif not bad:
        click.echo("(no frontmatter violations)")
    else:
        for r in bad:
            click.echo(f"{r.path.relative_to(root)}  [{r.family}]")
            for v in r.violations:
                click.echo(f"  - {v}")
    if strict and bad:
        raise _fail(f"{len(bad)} artifact(s) with frontmatter violations", code=1)


# ----------------------------------------------------------------- mutate

@cli.command(name="set")
@click.argument("selector")
@click.argument("field")
@click.argument("value")
@pass_root
def set_cmd(root: Path, selector: str, field: str, value: str) -> None:
    """Set a scalar frontmatter FIELD to VALUE (auto-typed: int/bool/null/str)."""
    a = model.resolve(root, selector)
    a.doc.data[field] = _coerce(value)
    a.doc.save()
    click.echo(f"{a.path}: set {field} = {a.doc.data[field]!r}")


@cli.command(name="set-slices")
@click.argument("selector")
@click.argument("numbers", nargs=-1, required=True)
@pass_root
def set_slices(root: Path, selector: str, numbers) -> None:
    """Set a PRD's slices: list to the given issue NUMBERS."""
    a = model.resolve(root, selector, want="prd")
    a.doc.data["slices"] = [int(n.lstrip("#")) for n in numbers]
    a.doc.save()
    click.echo(f"{a.path}: slices = {a.doc.data['slices']}")


# ----------------------------------------------------------------- slices / gate

@cli.command()
@click.argument("selector")
@click.option("--json", "as_json", is_flag=True)
@pass_root
def slices(root: Path, selector: str, as_json) -> None:
    """List the surviving slice docs of the PRD SELECTOR (presence == open work)."""
    a = model.resolve(root, selector, want="prd")
    rows = [{"number": s.number, "slug": s.slug, "path": str(s.path.relative_to(root))} for s in a.slice_files()]
    if as_json:
        click.echo(json.dumps(rows, indent=2))
        return
    if not rows:
        click.echo("(no open slices — slices/ is empty or gone)")
        return
    for r in rows:
        click.echo(f"#{r['number']:<5} {r['slug']:<28} {r['path']}")


@cli.command(name="prd-finalizable")
@click.argument("selector")
@pass_root
def prd_finalizable(root: Path, selector: str) -> None:
    """Exit 0 iff the PRD has no surviving slice docs (finalize-prd precondition)."""
    a = model.resolve(root, selector, want="prd")
    open_slices = a.slice_files()
    if open_slices:
        nums = ", ".join(f"#{s.number}" for s in open_slices)
        raise _fail(f"{a.slug}: {len(open_slices)} slice(s) still open: {nums}")
    click.echo(f"ok: {a.slug} has no open slices — ready to finalize")


# ----------------------------------------------------------------- epic subgroup

@cli.group()
def epic() -> None:
    """Operate on an epic's child-PRD plan (the prds: list)."""


def _epic_prds(a) -> list:
    prds = a.doc.data.get("prds")
    if not isinstance(prds, list):
        raise _fail(f"{a.path}: no prds: list (run epic-to-prds first)")
    return prds


@epic.command(name="prds")
@click.argument("selector")
@click.option("--json", "as_json", is_flag=True)
@pass_root
def epic_prds(root: Path, selector: str, as_json) -> None:
    """List an epic's planned child PRDs with their issue/done state."""
    a = model.resolve(root, selector, want="epic")
    prds = _epic_prds(a)
    if as_json:
        click.echo(json.dumps(prds, indent=2))
        return
    for p in prds:
        issue = f"#{p['issue']}" if p.get("issue") else "-"
        done = "done" if p.get("done") else ""
        blocked = ",".join(p.get("blocked_by") or []) or "-"
        click.echo(f"{p.get('slug', '?'):<28} {p.get('kind', '?'):<12} {issue:<6} blocked_by:{blocked:<20} {done}")


@epic.command(name="set-prd-issue")
@click.argument("selector")
@click.argument("prd_slug")
@click.argument("issue")
@pass_root
def epic_set_prd_issue(root: Path, selector: str, prd_slug: str, issue: str) -> None:
    """Fill the issue: number of an epic's child PRD entry."""
    a = model.resolve(root, selector, want="epic")
    for p in _epic_prds(a):
        if p.get("slug") == prd_slug:
            p["issue"] = int(issue.lstrip("#"))
            a.doc.save()
            click.echo(f"{a.slug}: {prd_slug} → issue #{p['issue']}")
            return
    raise _fail(f"{a.slug}: no child PRD {prd_slug!r} in prds:")


@epic.command(name="prd-issue")
@click.argument("selector")
@click.argument("prd_slug")
@pass_root
def epic_prd_issue(root: Path, selector: str, prd_slug: str) -> None:
    """Print the (placeholder) issue number of an epic's child PRD entry.

    Used by *-prd-to-issues to find the pre-created placeholder issue to edit
    instead of creating a new one.
    """
    a = model.resolve(root, selector, want="epic")
    for p in _epic_prds(a):
        if p.get("slug") == prd_slug:
            if not p.get("issue"):
                raise _fail(f"{a.slug}: child PRD {prd_slug!r} has no issue yet")
            click.echo(p["issue"])
            return
    raise _fail(f"{a.slug}: no child PRD {prd_slug!r} in prds:")


@epic.command(name="tick")
@click.argument("selector")
@click.argument("prd_slug")
@pass_root
def epic_tick(root: Path, selector: str, prd_slug: str) -> None:
    """Mark an epic's child PRD as finalized (done: true), per finalize-prd."""
    a = model.resolve(root, selector, want="epic")
    for p in _epic_prds(a):
        if p.get("slug") == prd_slug:
            p["done"] = True
            a.doc.save()
            click.echo(f"{a.slug}: ticked {prd_slug} done")
            return
    raise _fail(f"{a.slug}: no child PRD {prd_slug!r} in prds:")


@epic.command(name="finalizable")
@click.argument("selector")
@pass_root
def epic_finalizable(root: Path, selector: str) -> None:
    """Exit 0 iff every child PRD of the epic is ticked done (finalize-epic gate)."""
    a = model.resolve(root, selector, want="epic")
    pending = [p.get("slug", "?") for p in _epic_prds(a) if not p.get("done")]
    if pending:
        raise _fail(f"{a.slug}: child PRD(s) not finalized: {', '.join(pending)}")
    click.echo(f"ok: every child PRD of {a.slug} is finalized — ready to finalize epic")


# ----------------------------------------------------------------- tracker subgroup
#
# The built-in local issue tracker for repos without a remote. When `forge`
# resolves the `local` provider (no origin remote), its command snippets call
# these subcommands in place of `gh`/`fgj`, so the PRD→issues→implement→finalize
# workflow runs without a git host. Issues live in docs/prd/tracker.json.


def _num(value: str) -> int:
    """Parse an issue selector like ``42`` or ``#42`` into an int."""
    try:
        return int(value.lstrip("#"))
    except ValueError:
        raise _fail(f"{value!r}: not an issue number")


@cli.group()
def tracker() -> None:
    """Local issue tracker for repos without a remote (docs/prd/tracker.json).

    Drives the same PRD→issues workflow as gh/fgj when a repo has no recognised
    git host; the `forge` local provider emits these as its command snippets.
    """


@tracker.command(name="ensure-labels")
@pass_root
def tracker_ensure_labels(root: Path) -> None:
    """Initialise the local store (labels are freeform — this is the no-op analogue
    of the git-host `ensure_labels`)."""
    p = tracker_mod.ensure(root)
    click.echo(f"ok: local tracker ready at {p.relative_to(root)}")


@tracker.command(name="create")
@click.option("--title", required=True, help="Issue title.")
@click.option("--body", default=None, help="Issue body text.")
@click.option("--body-file", type=click.Path(dir_okay=False, path_type=Path), default=None,
              help="Read the body from this file (mirrors gh --body-file).")
@click.option("--label", "labels", multiple=True, help="Label to add (repeatable).")
@click.option("--milestone", default=None, help="Milestone title (the epic; created if absent).")
@pass_root
def tracker_create(root: Path, title, body, body_file, labels, milestone) -> None:
    """Create an issue; prints the new #number (which the skill records)."""
    if body_file is not None:
        body = body_file.read_text(encoding="utf-8")
    number = tracker_mod.create(root, title, body or "", labels, milestone=milestone)
    click.echo(f"#{number}")


@tracker.command(name="view")
@click.argument("number")
@click.option("--json", "as_json", is_flag=True, help="Emit gh-shaped JSON.")
@pass_root
def tracker_view(root: Path, number: str, as_json) -> None:
    """Show one issue (with --json, the number/title/body/labels/state gh shape)."""
    issue = tracker_mod.view(root, _num(number))
    if as_json:
        click.echo(json.dumps(
            {
                "number": issue["number"],
                "title": issue["title"],
                "body": issue["body"],
                "state": issue["state"].upper(),
                "labels": [{"name": label} for label in issue["labels"]],
            },
            indent=2,
        ))
        return
    click.echo(f"#{issue['number']} {issue['title']}  [{issue['state']}]")
    click.echo(f"labels: {', '.join(issue['labels']) or '-'}")
    if issue["blocked_by"]:
        click.echo("blocked_by: " + ", ".join(f"#{b}" for b in issue["blocked_by"]))
    if issue.get("milestone"):
        click.echo(f"milestone: #{issue['milestone']}")
    click.echo("")
    click.echo(issue["body"])
    for c in issue["comments"]:
        click.echo(f"\n--- comment ---\n{c}")


@tracker.command(name="list")
@click.option("--label", default=None, help="Only issues carrying this label.")
@click.option("--state", type=click.Choice(("open", "closed")), default=None)
@click.option("--json", "as_json", is_flag=True)
@pass_root
def tracker_list(root: Path, label, state, as_json) -> None:
    """List issues, optionally filtered by label/state."""
    issues = tracker_mod.list_issues(root, label=label, state=state)
    if as_json:
        click.echo(json.dumps(
            [{"number": i["number"], "title": i["title"], "state": i["state"].upper()} for i in issues],
            indent=2,
        ))
        return
    if not issues:
        click.echo("(no matching issues)")
        return
    for i in issues:
        click.echo(f"#{i['number']:<5} {i['state']:<7} {i['title']}")


@tracker.command(name="comment")
@click.argument("number")
@click.option("--body", required=True, help="Comment text.")
@pass_root
def tracker_comment(root: Path, number: str, body: str) -> None:
    """Add a comment to an issue."""
    tracker_mod.comment(root, _num(number), body)
    click.echo(f"#{_num(number)}: commented")


@tracker.command(name="close")
@click.argument("number")
@click.option("--comment", "comment_text", default=None, help="Optional closing comment.")
@pass_root
def tracker_close(root: Path, number: str, comment_text) -> None:
    """Close an issue (optionally with a comment)."""
    tracker_mod.close(root, _num(number), comment_text)
    click.echo(f"#{_num(number)}: closed")


@tracker.command(name="edit")
@click.argument("number")
@click.option("--title", default=None, help="New title.")
@click.option("--body", default=None, help="New body text.")
@click.option("--body-file", type=click.Path(dir_okay=False, path_type=Path), default=None,
              help="Read the new body from this file.")
@click.option("--add-label", "add", multiple=True, help="Label to add (repeatable).")
@click.option("--remove-label", "remove", multiple=True, help="Label to remove (repeatable).")
@pass_root
def tracker_edit(root: Path, number: str, title, body, body_file, add, remove) -> None:
    """Edit an issue's title/body and/or labels (e.g. fill a placeholder PRD issue)."""
    if body_file is not None:
        body = body_file.read_text(encoding="utf-8")
    if title is not None or body is not None:
        tracker_mod.edit(root, _num(number), title=title, body=body)
    if add or remove:
        tracker_mod.edit_labels(root, _num(number), add=add, remove=remove)
    click.echo(f"#{_num(number)}: updated")


@tracker.command(name="dep")
@click.argument("number")
@click.option("--blocked-by", "blocker", required=True, help="The blocker issue number.")
@pass_root
def tracker_dep(root: Path, number: str, blocker: str) -> None:
    """Record that NUMBER is blocked by another issue (native dependency)."""
    tracker_mod.add_dependency(root, _num(number), _num(blocker))
    click.echo(f"#{_num(number)}: blocked_by #{_num(blocker)}")


@tracker.command(name="set-milestone")
@click.argument("number")
@click.argument("title")
@pass_root
def tracker_set_milestone(root: Path, number: str, title: str) -> None:
    """Assign issue NUMBER to the milestone TITLE (the epic; created if absent)."""
    ms = tracker_mod.set_milestone(root, _num(number), title)
    click.echo(f"#{_num(number)}: milestone = #{ms} ({title})")


@tracker.group(name="milestone")
def tracker_milestone() -> None:
    """Local-tracker milestones — an epic is a milestone."""


@tracker_milestone.command(name="create")
@click.argument("title")
@pass_root
def tracker_milestone_create(root: Path, title: str) -> None:
    """Create the epic milestone (idempotent); prints its number."""
    click.echo(tracker_mod.create_milestone(root, title))


@tracker_milestone.command(name="close")
@click.argument("number")
@pass_root
def tracker_milestone_close(root: Path, number: str) -> None:
    """Close the milestone NUMBER."""
    tracker_mod.close_milestone(root, _num(number))
    click.echo(f"milestone #{_num(number)}: closed")


@tracker_milestone.command(name="list")
@click.option("--json", "as_json", is_flag=True)
@pass_root
def tracker_milestone_list(root: Path, as_json) -> None:
    """List milestones."""
    ms = tracker_mod.list_milestones(root)
    if as_json:
        click.echo(json.dumps(ms, indent=2))
        return
    if not ms:
        click.echo("(no milestones)")
        return
    for m in ms:
        click.echo(f"#{m['number']:<5} {m['state']:<7} {m['title']}")


# ----------------------------------------------------------------- workflow versioning
#
# The prd-workflow's convention version lives in docs/prd/.workflow-version.
# `workflow-gate` is injected (via the SKILL `!` syntax) into every operational
# skill and prints nothing when current / a REFUSE block otherwise. The init and
# update skills are thin shells that inject `workflow-init-instructions` /
# `workflow-migrate-instructions`, so an up-to-date repo costs zero context.


@cli.group(name="workflow-version", invoke_without_command=True)
@click.pass_context
def workflow_version(ctx: click.Context) -> None:
    """Print the repo's stored workflow version (0 if uninitialized)."""
    if ctx.invoked_subcommand is None:
        click.echo(workflow_mod.read_version(ctx.obj))


@workflow_version.command(name="set")
@click.argument("number", type=int)
@pass_root
def workflow_version_set(root: Path, number: int) -> None:
    """Write the workflow version dotfile to NUMBER."""
    p = workflow_mod.write_version(root, number)
    click.echo(f"{p}: workflow version = {number}")


@cli.command(name="workflow-gate")
@pass_root
def workflow_gate(root: Path) -> None:
    """Emit a REFUSE block if the repo's workflow version isn't current (else nothing).

    Operational skills inject this; an empty result means "proceed".
    """
    text = workflow_mod.gate(root)
    if text:
        click.echo(text)


@cli.command(name="workflow-init-instructions")
@pass_root
def workflow_init_instructions(root: Path) -> None:
    """Emit the situation-specific instructions for the init-prd-workflow skill."""
    click.echo(workflow_mod.init_instructions(root))


@cli.command(name="workflow-migrate-instructions")
@pass_root
def workflow_migrate_instructions(root: Path) -> None:
    """Emit the ordered, provider-aware migration steps for update-prd-workflow."""
    try:
        provider = forge_mod.detect().provider
    except (forge_mod.NotAGitRepo, forge_mod.UnknownForge):
        provider = "local"
    click.echo(workflow_mod.migrate_instructions(root, provider))


# ----------------------------------------------------------------- forgejo subgroup
#
# Native Forgejo/Codeberg API client (src/prd_tool/forgejo_api.py). The `forge`
# fgj provider emits these subcommands in place of the `fgj` CLI, so the only
# remaining `fgj` touch is `fgj auth token` (called inside the client).


@cli.group()
def forgejo() -> None:
    """Forgejo/Codeberg issue operations over the REST API (no fgj CLI needed)."""


@forgejo.command(name="auth-check")
def forgejo_auth_check() -> None:
    """Verify an API token can be obtained for the instance."""
    c = forgejo_api.Client.from_repo()
    c.token()  # raises ForgejoError if unavailable
    click.echo(f"ok: authenticated to {c.host} as {c.owner}/{c.repo}")


@forgejo.command(name="ensure-labels")
def forgejo_ensure_labels() -> None:
    """Create the prd-workflow label scheme (idempotent)."""
    created = forgejo_api.Client.from_repo().ensure_labels(forge_mod.LABELS)
    click.echo(f"ok: labels ready ({len(created)} created)" if created else "ok: labels already present")


@forgejo.command(name="labels")
def forgejo_labels() -> None:
    """List the repo's labels (name → id)."""
    for name, lid in forgejo_api.Client.from_repo().list_labels().items():
        click.echo(f"{lid}\t{name}")


@forgejo.command(name="create")
@click.option("--title", required=True)
@click.option("--body", default=None)
@click.option("--body-file", type=click.Path(dir_okay=False, path_type=Path), default=None,
              help="Read the body from this file.")
@click.option("--label", "labels", multiple=True, help="Label name to add (repeatable).")
@click.option("--milestone", default=None, help="Milestone title (native; auto-created if absent).")
def forgejo_create(title, body, body_file, labels, milestone) -> None:
    """Create an issue; prints the new #number."""
    if body_file is not None:
        body = body_file.read_text(encoding="utf-8")
    issue = forgejo_api.Client.from_repo().create_issue(title, body or "", labels, milestone)
    click.echo(f"#{issue['number']}")


@forgejo.command(name="view")
@click.argument("number")
@click.option("--json", "as_json", is_flag=True, help="Emit gh-shaped JSON.")
def forgejo_view(number: str, as_json) -> None:
    """Show one issue (with --json, the number/title/body/labels/state shape)."""
    issue = forgejo_api.Client.from_repo().get_issue(_num(number))
    if as_json:
        click.echo(json.dumps({
            "number": issue["number"],
            "title": issue["title"],
            "body": issue.get("body") or "",
            "state": str(issue.get("state", "")).upper(),
            "labels": [{"name": l["name"]} for l in issue.get("labels") or []],
        }, indent=2))
        return
    click.echo(f"#{issue['number']} {issue['title']}  [{issue.get('state')}]")
    click.echo(f"labels: {', '.join(l['name'] for l in issue.get('labels') or []) or '-'}")
    click.echo("")
    click.echo(issue.get("body") or "")


@forgejo.command(name="list")
@click.option("--label", default=None)
@click.option("--state", type=click.Choice(("open", "closed", "all")), default=None)
@click.option("--json", "as_json", is_flag=True)
def forgejo_list(label, state, as_json) -> None:
    """List issues, optionally filtered by label/state."""
    issues = forgejo_api.Client.from_repo().list_issues(label=label, state=state)
    if as_json:
        click.echo(json.dumps(
            [{"number": i["number"], "title": i["title"], "state": str(i.get("state", "")).upper()}
             for i in issues], indent=2))
        return
    if not issues:
        click.echo("(no matching issues)")
        return
    for i in issues:
        click.echo(f"#{i['number']:<5} {str(i.get('state', '')):<7} {i['title']}")


@forgejo.command(name="comment")
@click.argument("number")
@click.option("--body", required=True)
def forgejo_comment(number: str, body: str) -> None:
    """Add a comment to an issue."""
    forgejo_api.Client.from_repo().comment(_num(number), body)
    click.echo(f"#{_num(number)}: commented")


@forgejo.command(name="close")
@click.argument("number")
@click.option("--comment", "comment_text", default=None)
def forgejo_close(number: str, comment_text) -> None:
    """Close an issue (optionally with a comment)."""
    forgejo_api.Client.from_repo().close(_num(number), comment_text)
    click.echo(f"#{_num(number)}: closed")


@forgejo.command(name="edit")
@click.argument("number")
@click.option("--title", default=None, help="New title.")
@click.option("--body", default=None, help="New body text.")
@click.option("--body-file", type=click.Path(dir_okay=False, path_type=Path), default=None,
              help="Read the new body from this file.")
@click.option("--add-label", "add", multiple=True)
@click.option("--remove-label", "remove", multiple=True)
@click.option("--milestone", default=None, help="Set the native milestone (title; auto-created).")
def forgejo_edit(number: str, title, body, body_file, add, remove, milestone) -> None:
    """Edit an issue's title/body, labels, and/or milestone (e.g. fill a placeholder PRD issue)."""
    if body_file is not None:
        body = body_file.read_text(encoding="utf-8")
    c = forgejo_api.Client.from_repo()
    if title is not None or body is not None:
        c.update_issue(_num(number), title=title, body=body)
    if add or remove:
        c.edit_labels(_num(number), add=add, remove=remove)
    if milestone:
        c.set_milestone(_num(number), milestone)
    click.echo(f"#{_num(number)}: updated")


@forgejo.command(name="dep")
@click.argument("number")
@click.option("--blocked-by", "blocker", required=True)
def forgejo_dep(number: str, blocker: str) -> None:
    """Record that NUMBER is blocked by another issue (native dependency)."""
    forgejo_api.Client.from_repo().add_dependency(_num(number), _num(blocker))
    click.echo(f"#{_num(number)}: blocked_by #{_num(blocker)}")


@forgejo.command(name="set-milestone")
@click.argument("number")
@click.argument("title")
def forgejo_set_milestone(number: str, title: str) -> None:
    """Assign issue NUMBER to milestone TITLE (the epic; created if absent)."""
    mid = forgejo_api.Client.from_repo().set_milestone(_num(number), title)
    click.echo(f"#{_num(number)}: milestone = {title} (id {mid})")


@forgejo.group(name="milestone")
def forgejo_milestone() -> None:
    """Forgejo milestones — an epic is a milestone."""


@forgejo_milestone.command(name="create")
@click.argument("title")
def forgejo_milestone_create(title: str) -> None:
    """Create the epic milestone (idempotent by title); prints its id."""
    click.echo(forgejo_api.Client.from_repo().ensure_milestone(title))


@forgejo_milestone.command(name="close")
@click.argument("mid")
def forgejo_milestone_close(mid: str) -> None:
    """Close the milestone with id MID."""
    forgejo_api.Client.from_repo().close_milestone(_num(mid))
    click.echo(f"milestone {_num(mid)}: closed")


@forgejo_milestone.command(name="list")
@click.option("--json", "as_json", is_flag=True)
def forgejo_milestone_list(as_json) -> None:
    """List milestones (title → id)."""
    ms = forgejo_api.Client.from_repo().list_milestones()
    if as_json:
        click.echo(json.dumps([{"id": m["id"], "title": m["title"],
                                "state": m.get("state")} for m in ms], indent=2))
        return
    for m in ms:
        click.echo(f"{m['id']}\t{m.get('state', ''):<7} {m['title']}")


@forgejo.command(name="create-pr")
@click.option("--head", required=True)
@click.option("--base", default="main")
@click.option("--title", required=True)
@click.option("--body", default=None)
@click.option("--body-file", type=click.Path(dir_okay=False, path_type=Path), default=None)
def forgejo_create_pr(head, base, title, body, body_file) -> None:
    """Open a pull request; prints the new PR number."""
    if body_file is not None:
        body = body_file.read_text(encoding="utf-8")
    pr = forgejo_api.Client.from_repo().create_pr(head, base, title, body or "")
    click.echo(f"#{pr['number']}")


def main(argv: list[str] | None = None) -> int:
    try:
        cli.main(args=argv, standalone_mode=False)
        return 0
    except (ResolutionError, FrontmatterError, TrackerError, ForgejoError) as e:
        click.echo(f"error: {e}", err=True)
        return 1
    except click.ClickException as e:
        e.show()
        return e.exit_code
    except click.exceptions.Abort:
        click.echo("aborted", err=True)
        return 130


if __name__ == "__main__":
    sys.exit(main())
