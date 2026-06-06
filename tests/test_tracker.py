"""Tests for the local tracker's milestone support (an epic is a milestone)."""

from prd_tool import tracker


def test_create_issue_with_milestone_creates_and_links(tmp_path):
    ms = tracker.create_milestone(tmp_path, "Auth epic")
    n = tracker.create(tmp_path, "PRD: login", "body", ["prd"], milestone="Auth epic")
    issue = tracker.view(tmp_path, n)
    assert issue["milestone"] == ms


def test_milestone_is_idempotent_by_title(tmp_path):
    a = tracker.create_milestone(tmp_path, "Auth epic")
    b = tracker.create_milestone(tmp_path, "Auth epic")
    assert a == b
    assert len(tracker.list_milestones(tmp_path)) == 1


def test_create_issue_milestone_autocreates(tmp_path):
    # Passing a milestone title that doesn't exist yet creates it.
    n = tracker.create(tmp_path, "PRD", "b", [], milestone="New epic")
    ms = tracker.list_milestones(tmp_path)
    assert len(ms) == 1 and ms[0]["title"] == "New epic"
    assert tracker.view(tmp_path, n)["milestone"] == ms[0]["number"]


def test_set_milestone_on_existing_issue(tmp_path):
    n = tracker.create(tmp_path, "PRD", "b", [])
    assert tracker.view(tmp_path, n)["milestone"] is None
    ms = tracker.set_milestone(tmp_path, n, "Auth epic")
    assert tracker.view(tmp_path, n)["milestone"] == ms


def test_close_milestone(tmp_path):
    ms = tracker.create_milestone(tmp_path, "Auth epic")
    tracker.close_milestone(tmp_path, ms)
    assert tracker.list_milestones(tmp_path)[0]["state"] == "closed"


def test_no_milestone_when_unset(tmp_path):
    n = tracker.create(tmp_path, "Standalone PRD", "b", ["prd"])
    assert tracker.view(tmp_path, n)["milestone"] is None
