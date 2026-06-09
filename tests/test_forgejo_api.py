"""Tests for prd_tool.forgejo_api — host parsing, id resolution, request shaping.

No network: Client._request is replaced with a recorder that serves canned
responses and captures the (method, path, body) of every call.
"""

import pytest

from prd_tool import forgejo_api
from prd_tool.forgejo_api import Client, ForgejoError


@pytest.mark.parametrize("remote,host", [
    ("git@codeberg.org:Yashin/skills.git", "codeberg.org"),
    ("https://codeberg.org/o/r.git", "codeberg.org"),
    ("https://codeberg.org/o/r", "codeberg.org"),
    ("ssh://git@fj.example.com:2222/o/r.git", "fj.example.com"),
    ("https://user@gitea.io/o/r", "gitea.io"),
])
def test_host_from_remote(remote, host):
    assert forgejo_api._host_from_remote(remote) == host


def test_host_from_remote_empty_raises():
    with pytest.raises(ForgejoError):
        forgejo_api._host_from_remote("   ")


def _client_with_router(router):
    """A Client whose _request is `router` and whose token is pre-seeded."""
    c = Client(owner="o", repo="r", host="h", _token="tok")
    calls = []

    def _req(method, path, body=None, query=None):
        calls.append({"method": method, "path": path, "body": body, "query": query})
        return router(method, path, body, query)

    c._request = _req
    return c, calls


def test_create_issue_resolves_label_and_milestone_ids():
    def router(method, path, body, query):
        if method == "GET" and path.endswith("/labels"):
            return [{"name": "kind:feature", "id": 5}, {"name": "prd", "id": 9}]
        if method == "GET" and path.endswith("/milestones"):
            return [{"title": "M07", "id": 3}]
        if method == "POST" and path.endswith("/issues"):
            return {"number": 42}
        raise AssertionError(f"unexpected {method} {path}")

    c, calls = _client_with_router(router)
    issue = c.create_issue("t", "b", labels=["kind:feature", "prd"], milestone="M07")
    assert issue["number"] == 42
    post = next(x for x in calls if x["method"] == "POST" and x["path"].endswith("/issues"))
    assert post["body"]["labels"] == [5, 9]
    assert post["body"]["milestone"] == 3


def test_unknown_label_raises():
    def router(method, path, body, query):
        if path.endswith("/labels"):
            return [{"name": "prd", "id": 9}]
        raise AssertionError("should not reach create")

    c, _ = _client_with_router(router)
    with pytest.raises(ForgejoError):
        c.create_issue("t", "b", labels=["does-not-exist"])


def test_ensure_milestone_creates_when_absent():
    created = {}

    def router(method, path, body, query):
        if method == "GET" and path.endswith("/milestones"):
            return []
        if method == "POST" and path.endswith("/milestones"):
            created.update(body)
            return {"id": 11}
        raise AssertionError(f"unexpected {method} {path}")

    c, _ = _client_with_router(router)
    assert c.ensure_milestone("M09") == 11
    assert created["title"] == "M09"


def test_edit_labels_add_and_remove():
    def router(method, path, body, query):
        if method == "GET" and path.endswith("/labels"):
            return [{"name": "status:todo", "id": 1}, {"name": "status:done", "id": 2}]
        return None

    c, calls = _client_with_router(router)
    c.edit_labels(7, add=["status:done"], remove=["status:todo"])
    assert any(x["method"] == "POST" and x["path"] == "/repos/o/r/issues/7/labels"
               and x["body"] == {"labels": [2]} for x in calls)
    assert any(x["method"] == "DELETE" and x["path"] == "/repos/o/r/issues/7/labels/1"
               for x in calls)


def test_add_dependency_body_shape():
    c, calls = _client_with_router(lambda *a: None)
    c.add_dependency(7, 3)
    dep = calls[-1]
    assert dep["method"] == "POST" and dep["path"] == "/repos/o/r/issues/7/dependencies"
    assert dep["body"] == {"index": 3, "owner": "o", "repo": "r"}


def test_ensure_milestone_returns_existing_without_post():
    def router(method, path, body, query):
        if method == "GET" and path.endswith("/milestones"):
            return [{"title": "Auth epic", "id": 7}]
        raise AssertionError(f"unexpected {method} {path}")

    c, calls = _client_with_router(router)
    assert c.ensure_milestone("Auth epic") == 7
    assert not any(x["method"] == "POST" for x in calls)


def test_update_issue_patches_title_and_body():
    c, calls = _client_with_router(lambda *a: None)
    c.update_issue(5, title="Real PRD", body="real")
    patch = calls[-1]
    assert patch["method"] == "PATCH" and patch["path"] == "/repos/o/r/issues/5"
    assert patch["body"] == {"title": "Real PRD", "body": "real"}


def test_update_issue_noop_when_nothing_given():
    c, calls = _client_with_router(lambda *a: None)
    c.update_issue(5)
    assert not calls


def test_close_milestone_patches_state():
    c, calls = _client_with_router(lambda *a: None)
    c.close_milestone(7)
    patch = calls[-1]
    assert patch["method"] == "PATCH" and patch["path"] == "/repos/o/r/milestones/7"
    assert patch["body"] == {"state": "closed"}


def test_set_milestone_resolves_then_assigns():
    def router(method, path, body, query):
        if method == "GET" and path.endswith("/milestones"):
            return [{"title": "Auth epic", "id": 7}]
        return None

    c, calls = _client_with_router(router)
    assert c.set_milestone(42, "Auth epic") == 7
    patch = next(x for x in calls if x["method"] == "PATCH" and x["path"] == "/repos/o/r/issues/42")
    assert patch["body"] == {"milestone": 7}


def test_token_env_fallback(monkeypatch):
    # fgj CLI absent → fall back to env var.
    def boom(*a, **k):
        raise FileNotFoundError()

    monkeypatch.setattr(forgejo_api.subprocess, "run", boom)
    monkeypatch.delenv("CODEBERG_TOKEN", raising=False)
    monkeypatch.setenv("FORGEJO_TOKEN", "envtoken")
    c = Client(owner="o", repo="r", host="h")
    assert c.token() == "envtoken"


def test_token_missing_raises(monkeypatch):
    def boom(*a, **k):
        raise FileNotFoundError()

    monkeypatch.setattr(forgejo_api.subprocess, "run", boom)
    monkeypatch.delenv("FORGEJO_TOKEN", raising=False)
    monkeypatch.delenv("CODEBERG_TOKEN", raising=False)
    c = Client(owner="o", repo="r", host="h")
    with pytest.raises(ForgejoError):
        c.token()
