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


def test_has_artifacts(tmp_path):
    prd = _prd(tmp_path)
    assert not workflow.has_artifacts(tmp_path)
    (prd / "foo").mkdir()
    (prd / "foo" / "prd.md").write_text("---\nkind: feature\n---\n")
    assert workflow.has_artifacts(tmp_path)


def test_init_fresh_stamps_current(tmp_path):
    _prd(tmp_path)
    out = workflow.init_instructions(tmp_path)
    assert f"workflow-version set {workflow.CURRENT_VERSION}" in out
    assert "update-prd-workflow" not in out


def test_init_legacy_stamps_baseline_then_update(tmp_path):
    prd = _prd(tmp_path)
    (prd / "foo").mkdir()
    (prd / "foo" / "prd.md").write_text("---\nkind: feature\n---\n")
    out = workflow.init_instructions(tmp_path)
    assert "workflow-version set 0" in out
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


def test_migrate_without_file_points_to_init(tmp_path):
    out = workflow.migrate_instructions(tmp_path, "fgj")
    assert "init-prd-workflow" in out


def test_migrate_v0_to_v1_fgj_has_milestone_steps(tmp_path):
    _prd(tmp_path)
    workflow.write_version(tmp_path, 0)
    out = workflow.migrate_instructions(tmp_path, "fgj")
    assert "milestone" in out.lower()
    assert "forgejo edit" in out
    assert f"workflow-version set {workflow.CURRENT_VERSION}" in out


def test_migrate_v0_to_v1_local_is_structural_noop(tmp_path):
    _prd(tmp_path)
    workflow.write_version(tmp_path, 0)
    out = workflow.migrate_instructions(tmp_path, "local")
    assert "no-op" in out.lower()
    # still records the new version
    assert f"workflow-version set {workflow.CURRENT_VERSION}" in out
