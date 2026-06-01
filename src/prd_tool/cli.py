"""``prd-tool`` — query & mutate the YAML frontmatter of a repo's docs/prd tree.

The commands mirror the operations the prd-workflow skills perform on artifact
frontmatter: resolving a slug/issue to a file, asserting an artifact's ``kind``
before slicing it, filling in issue numbers and slice lists, ticking an epic's
child PRDs, and checking the lifecycle gates that drive the self-cleaning
``finalize-*`` steps.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import click

from . import model, validate
from .frontmatter import FrontmatterError
from .model import ResolutionError


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


# ---------------------------------------------------------------- read / query

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
        family = "epic" if target.name == "epic.md" or target.parent.parent.name == "epics" else "prd"
        reports = [validate.validate_file(target.resolve(), family)]
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


def main(argv: list[str] | None = None) -> int:
    try:
        cli.main(args=argv, standalone_mode=False)
        return 0
    except (ResolutionError, FrontmatterError) as e:
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
