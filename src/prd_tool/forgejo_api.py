"""Native Forgejo/Codeberg/Gitea REST client (``/api/v1``), stdlib only.

Replaces the ``fgj`` CLI for every prd-workflow operation. The **only** external
``fgj`` touch left is fetching the auth token (``fgj auth token``); everything
else is a direct HTTPS call from here, so the workflow no longer depends on the
``fgj`` CLI version (0.4.0 has no ``api`` passthrough and no ``--milestone``).

Provider/owner/repo come from :func:`forge.detect`; the instance host is parsed
from the ``origin`` remote. Two Forgejo API quirks shape this module:

* **Labels and milestones are referenced by numeric id**, not name, on issue
  create/edit — so we resolve (and, for milestones, auto-create) names → ids.
* **There is no sub-issue / parent endpoint** in the REST API (verified against
  the live Codeberg spec — only ``/dependencies`` exists). The epic→child
  relationship is therefore realised by the *task-list convention*: a
  ``- [ ] #<child>`` line in the epic body plus a ``Part of #<epic>`` line in the
  child — both written through the available PATCH-issue-body call.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass

from . import forge as forge_mod

_TOKEN_ENV_VARS = ("FORGEJO_TOKEN", "CODEBERG_TOKEN")


class ForgejoError(Exception):
    """A Forgejo API call failed, or the client could not be configured."""


def _host_from_remote(remote: str) -> str:
    """Parse the instance hostname from an origin remote URL.

    Handles ``https://host/owner/repo(.git)``, ``git@host:owner/repo.git`` and
    ``ssh://git@host[:port]/owner/repo.git``.
    """
    r = remote.strip()
    if not r:
        raise ForgejoError("no origin remote — cannot reach a Forgejo instance")
    m = re.match(r"^[a-zA-Z]+://(?:[^@/]+@)?([^:/]+)", r)  # scheme://[user@]host...
    if m:
        return m.group(1)
    m = re.match(r"^[^@]+@([^:]+):", r)  # scp-like git@host:owner/repo.git
    if m:
        return m.group(1)
    raise ForgejoError(f"cannot parse host from remote {remote!r}")


@dataclass
class Client:
    owner: str
    repo: str
    host: str
    _token: str | None = None
    _labels: dict | None = None  # name -> id cache

    # ---------------------------------------------------------------- construction

    @classmethod
    def from_repo(cls) -> "Client":
        f = forge_mod.detect()
        if f.provider != "fgj":
            raise ForgejoError(
                f"the forgejo client only handles Forgejo/Codeberg repos "
                f"(detected provider: {f.provider})"
            )
        host = _host_from_remote(forge_mod._remote_url())
        return cls(owner=f.owner, repo=f.repo, host=host)

    @property
    def base(self) -> str:
        return f"https://{self.host}/api/v1"

    def token(self) -> str:
        if self._token:
            return self._token
        # Primary source: the fgj CLI's stored token for this host.
        try:
            out = subprocess.run(
                ["fgj", "auth", "token", "--hostname", self.host],
                capture_output=True, text=True,
            )
            tok = out.stdout.strip() if out.returncode == 0 else ""
        except FileNotFoundError:
            tok = ""
        # Fallback: environment (useful in CI or where fgj isn't configured).
        if not tok:
            for var in _TOKEN_ENV_VARS:
                if os.environ.get(var):
                    tok = os.environ[var].strip()
                    break
        if not tok:
            raise ForgejoError(
                f"no API token for {self.host}: run `fgj auth login --hostname {self.host}` "
                f"(or set one of {', '.join(_TOKEN_ENV_VARS)})"
            )
        self._token = tok
        return tok

    # ---------------------------------------------------------------- transport

    def _request(self, method: str, path: str, body: dict | None = None, query: dict | None = None):
        url = f"{self.base}{path}"
        if query:
            clean = {k: v for k, v in query.items() if v is not None}
            if clean:
                url = f"{url}?{urllib.parse.urlencode(clean)}"
        data = json.dumps(body).encode("utf-8") if body is not None else None
        req = urllib.request.Request(url, data=data, method=method)
        req.add_header("Authorization", f"token {self.token()}")
        req.add_header("Accept", "application/json")
        if data is not None:
            req.add_header("Content-Type", "application/json")
        try:
            with urllib.request.urlopen(req) as resp:  # noqa: S310 (https only)
                raw = resp.read()
        except urllib.error.HTTPError as e:
            detail = e.read().decode("utf-8", "replace")[:500]
            raise ForgejoError(f"{method} {path} → HTTP {e.code}: {detail}") from None
        except urllib.error.URLError as e:
            raise ForgejoError(f"{method} {path} → connection error: {e.reason}") from None
        if not raw:
            return None
        return json.loads(raw)

    def _repo_path(self, suffix: str) -> str:
        return f"/repos/{self.owner}/{self.repo}{suffix}"

    # ---------------------------------------------------------------- labels

    def list_labels(self) -> dict:
        """Return a name → id map of the repo's labels (cached)."""
        if self._labels is None:
            rows = self._request("GET", self._repo_path("/labels"), query={"limit": 100}) or []
            self._labels = {r["name"]: r["id"] for r in rows}
        return self._labels

    def ensure_labels(self, labels) -> list[str]:
        """Create any missing (name, hexcolor) labels. Returns the names created."""
        existing = self.list_labels()
        created = []
        for name, color in labels:
            if name in existing:
                continue
            row = self._request("POST", self._repo_path("/labels"), body={
                "name": name, "color": f"#{color.lstrip('#')}",
            })
            existing[name] = row["id"]
            created.append(name)
        return created

    def _label_ids(self, names) -> list[int]:
        table = self.list_labels()
        ids = []
        for n in names:
            if n not in table:
                raise ForgejoError(f"label {n!r} does not exist — run `ensure-labels` first")
            ids.append(table[n])
        return ids

    # ---------------------------------------------------------------- milestones

    def find_milestone(self, title: str) -> int | None:
        rows = self._request("GET", self._repo_path("/milestones"),
                             query={"state": "all", "limit": 100}) or []
        for r in rows:
            if r["title"] == title:
                return r["id"]
        return None

    def ensure_milestone(self, title: str) -> int:
        """Resolve a milestone title to its id, creating it if absent.

        A milestone is how an **epic** is represented; child PRD issues join it.
        """
        mid = self.find_milestone(title)
        if mid is not None:
            return mid
        row = self._request("POST", self._repo_path("/milestones"), body={"title": title})
        return row["id"]

    def close_milestone(self, mid: int) -> None:
        self._request("PATCH", self._repo_path(f"/milestones/{mid}"), body={"state": "closed"})

    def list_milestones(self) -> list:
        return self._request("GET", self._repo_path("/milestones"),
                             query={"state": "all", "limit": 100}) or []

    # ---------------------------------------------------------------- issues

    def create_issue(self, title: str, body: str, labels=(), milestone: str | None = None) -> dict:
        payload: dict = {"title": title, "body": body}
        if labels:
            payload["labels"] = self._label_ids(labels)
        if milestone:
            payload["milestone"] = self.ensure_milestone(milestone)
        return self._request("POST", self._repo_path("/issues"), body=payload)

    def get_issue(self, index: int) -> dict:
        return self._request("GET", self._repo_path(f"/issues/{index}"))

    def list_issues(self, label: str | None = None, state: str | None = None) -> list:
        rows = self._request("GET", self._repo_path("/issues"), query={
            "labels": label, "state": state, "type": "issues", "limit": 50,
        }) or []
        return rows

    def comment(self, index: int, body: str) -> None:
        self._request("POST", self._repo_path(f"/issues/{index}/comments"), body={"body": body})

    def close(self, index: int, comment: str | None = None) -> None:
        if comment:
            self.comment(index, comment)
        self._request("PATCH", self._repo_path(f"/issues/{index}"), body={"state": "closed"})

    def set_milestone(self, index: int, milestone: str) -> int:
        mid = self.ensure_milestone(milestone)
        self._request("PATCH", self._repo_path(f"/issues/{index}"), body={"milestone": mid})
        return mid

    def update_issue(self, index: int, title: str | None = None, body: str | None = None) -> None:
        """Edit an issue's title and/or body (used to fill a placeholder PRD issue)."""
        payload = {}
        if title is not None:
            payload["title"] = title
        if body is not None:
            payload["body"] = body
        if payload:
            self._request("PATCH", self._repo_path(f"/issues/{index}"), body=payload)

    def edit_labels(self, index: int, add=(), remove=()) -> None:
        if add:
            self._request("POST", self._repo_path(f"/issues/{index}/labels"),
                         body={"labels": self._label_ids(add)})
        for name in remove:
            table = self.list_labels()
            if name in table:
                self._request("DELETE", self._repo_path(f"/issues/{index}/labels/{table[name]}"))

    # ---------------------------------------------------------------- relationships

    def add_dependency(self, index: int, blocker: int) -> None:
        """Make issue *index* blocked-by *blocker* (native dependency).

        This is the only relationship primitive: slices block their PRD issue, and
        PRDs can be ordered within an epic. Epic membership is the milestone, not a
        dependency.
        """
        self._request("POST", self._repo_path(f"/issues/{index}/dependencies"),
                     body={"index": blocker, "owner": self.owner, "repo": self.repo})

    # ---------------------------------------------------------------- pulls

    def create_pr(self, head: str, base: str, title: str, body: str) -> dict:
        return self._request("POST", self._repo_path("/pulls"),
                            body={"head": head, "base": base, "title": title, "body": body})
