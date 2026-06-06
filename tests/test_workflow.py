"""Tests for prd_tool.workflow — version dotfile, gate, init/migrate instructions."""

from pathlib import Path

import pytest

from prd_tool import workflow


def _prd(root: Path) -> Path:
    d = root / "docs" / "prd"
    d.mkdir(parents=True, exist_ok=True)
    return d


def test_read_version_absent_is_zero(tmp_path):
    assert workflow.read_version(tmp_path) == 0
    assert not workflow.has_version_file(tmp_path)


def test_write_then_read_roundtrip(tmp_path):
    _prd(tmp_path)
    workflow.write_version(tmp_path, 1)
    assert workflow.has_version_file(tmp_path)
    assert workflow.read_version(tmp_path) == 1
    assert workflow.version_file(tmp_path).read_text() == "1\n"


def test_read_version_garbage_is_zero(tmp_path):
    _prd(tmp_path)
    workflow.version_file(tmp_path).write_text("not-a-number\n")
    assert workflow.read_version(tmp_path) == 0


def test_gate_empty_when_current(tmp_path):
    _prd(tmp_path)
    workflow.write_version(tmp_path, workflow.CURRENT_VERSION)
    assert workflow.gate(tmp_path) == ""


def test_gate_refuses_when_uninitialized(tmp_path):
    out = workflow.gate(tmp_path)
    assert "STOP" in out and "init-prd-workflow" in out


def test_gate_refuses_when_stale(tmp_path):
    _prd(tmp_path)
    workflow.write_version(tmp_path, workflow.CURRENT_VERSION - 1)
    out = workflow.gate(tmp_path)
    assert "STOP" in out and "update-prd-workflow" in out


def test_gate_refuses_when_ahead(tmp_path):
    _prd(tmp_path)
    workflow.write_version(tmp_path, workflow.CURRENT_VERSION + 1)
    out = workflow.gate(tmp_path)
    assert "STOP" in out and "out of date" in out


def test_init_fresh_stamps_current(tmp_path):
    _prd(tmp_path)
    out = workflow.init_instructions(tmp_path)
    assert f"workflow-version set {workflow.CURRENT_VERSION}" in out
    assert "update-prd-workflow" not in out


def test_init_stamps_current_even_with_existing_artifacts(tmp_path):
    # Init assumes a never-used repo: it stamps the current version regardless of
    # any pre-existing artifacts (the user picks update if they have prior data).
    prd = _prd(tmp_path)
    (prd / "foo").mkdir()
    (prd / "foo" / "prd.md").write_text("---\nkind: feature\n---\n")
    out = workflow.init_instructions(tmp_path)
    assert f"workflow-version set {workflow.CURRENT_VERSION}" in out
    assert "update-prd-workflow" not in out


def test_init_existing_file_points_to_update(tmp_path):
    _prd(tmp_path)
    workflow.write_version(tmp_path, workflow.CURRENT_VERSION - 1)
    out = workflow.init_instructions(tmp_path)
    assert "update-prd-workflow" in out


def test_init_noop_when_current(tmp_path):
    _prd(tmp_path)
    workflow.write_version(tmp_path, workflow.CURRENT_VERSION)
    out = workflow.init_instructions(tmp_path)
    assert "no-op" in out.lower()


def test_migrate_noop_at_current(tmp_path):
    _prd(tmp_path)
    workflow.write_version(tmp_path, workflow.CURRENT_VERSION)
    out = workflow.migrate_instructions(tmp_path, "fgj")
    assert "no-op" in out.lower()


def test_migrate_without_file_assumes_v0(tmp_path):
    # No version file ⇒ treat as v0 and migrate forward (not a redirect to init).
    out = workflow.migrate_instructions(tmp_path, "fgj")
    assert "v0 → v1" in out
    assert "init-prd-workflow" not in out
    assert f"workflow-version set {workflow.CURRENT_VERSION}" in out


def test_migrate_v0_to_v1_fgj_converts_epics_to_milestones(tmp_path):
    _prd(tmp_path)
    workflow.write_version(tmp_path, 0)
    out = workflow.migrate_instructions(tmp_path, "fgj")
    assert "milestone" in out.lower()
    assert "forgejo set-milestone" in out
    assert "epic_milestone" in out
    assert f"workflow-version set {workflow.CURRENT_VERSION}" in out


def test_migrate_v0_to_v1_local_uses_tracker_commands(tmp_path):
    _prd(tmp_path)
    workflow.write_version(tmp_path, 0)
    out = workflow.migrate_instructions(tmp_path, "local")
    assert "tracker milestone create" in out
    assert "tracker set-milestone" in out
    assert f"workflow-version set {workflow.CURRENT_VERSION}" in out
