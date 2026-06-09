"""Tests for prd_tool.forge — .prdrc override of forge detection."""

from pathlib import Path
from unittest.mock import patch

import pytest

from prd_tool import forge


def _git_repo_with_prdrc(tmp_path: Path, prdrc_content: str, remote: str = "") -> None:
    """Set up mocks: tmp_path is a git repo root, optionally with a .prdrc."""
    (tmp_path / ".prdrc").write_text(prdrc_content)


def _patch_git(tmp_path: Path, remote: str = ""):
    """Return a stack of patches making forge see tmp_path as a git repo with the given remote."""
    return [
        patch.object(forge, "_is_git_repo", return_value=True),
        patch.object(forge, "_remote_url", return_value=remote),
        patch.object(forge, "_repo_root", return_value=tmp_path),
    ]


class TestPrdrcOverride:
    def test_prdrc_overrides_provider(self, tmp_path):
        _git_repo_with_prdrc(tmp_path, '[forge]\nprovider = "gh"\n')
        for p in _patch_git(tmp_path, remote="https://codeberg.org/Org/repo.git"):
            p.start()
        try:
            f = forge.detect()
            assert f.provider == "gh"
            assert f.owner == "Org"
            assert f.repo == "repo"
        finally:
            patch.stopall()

    def test_prdrc_overrides_owner_and_repo(self, tmp_path):
        _git_repo_with_prdrc(tmp_path, '[forge]\nprovider = "fgj"\nowner = "X"\nrepo = "Y"\n')
        for p in _patch_git(tmp_path, remote="https://github.com/Real/Name.git"):
            p.start()
        try:
            f = forge.detect()
            assert f.provider == "fgj"
            assert f.owner == "X"
            assert f.repo == "Y"
        finally:
            patch.stopall()

    def test_prdrc_provider_only_infers_owner_repo_from_remote(self, tmp_path):
        _git_repo_with_prdrc(tmp_path, '[forge]\nprovider = "gh"\n')
        for p in _patch_git(tmp_path, remote="https://codeberg.org/MyOrg/MyRepo.git"):
            p.start()
        try:
            f = forge.detect()
            assert f.provider == "gh"
            assert f.owner == "MyOrg"
            assert f.repo == "MyRepo"
        finally:
            patch.stopall()

    def test_prdrc_local_provider(self, tmp_path):
        _git_repo_with_prdrc(tmp_path, '[forge]\nprovider = "local"\n')
        for p in _patch_git(tmp_path, remote="https://github.com/Org/repo.git"):
            p.start()
        try:
            f = forge.detect()
            assert f.provider == "local"
            assert f.owner == "Org"
            assert f.repo == "repo"
        finally:
            patch.stopall()

    def test_prdrc_local_provider_no_remote(self, tmp_path):
        _git_repo_with_prdrc(tmp_path, '[forge]\nprovider = "local"\n')
        for p in _patch_git(tmp_path, remote=""):
            p.start()
        try:
            f = forge.detect()
            assert f.provider == "local"
            assert f.owner == "-"
            assert f.repo == "-"
        finally:
            patch.stopall()

    def test_prdrc_invalid_provider_ignored(self, tmp_path):
        _git_repo_with_prdrc(tmp_path, '[forge]\nprovider = "gitlab"\n')
        for p in _patch_git(tmp_path, remote="https://github.com/Org/repo.git"):
            p.start()
        try:
            f = forge.detect()
            assert f.provider == "gh"
        finally:
            patch.stopall()

    def test_prdrc_missing_provider_ignored(self, tmp_path):
        _git_repo_with_prdrc(tmp_path, '[forge]\nowner = "X"\n')
        for p in _patch_git(tmp_path, remote="https://github.com/Org/repo.git"):
            p.start()
        try:
            f = forge.detect()
            assert f.provider == "gh"
            assert f.owner == "Org"
        finally:
            patch.stopall()

    def test_prdrc_malformed_toml_ignored(self, tmp_path):
        _git_repo_with_prdrc(tmp_path, "not valid toml [[[")
        for p in _patch_git(tmp_path, remote="https://github.com/Org/repo.git"):
            p.start()
        try:
            f = forge.detect()
            assert f.provider == "gh"
        finally:
            patch.stopall()

    def test_no_prdrc_falls_through(self, tmp_path):
        for p in _patch_git(tmp_path, remote="https://github.com/Org/repo.git"):
            p.start()
        try:
            f = forge.detect()
            assert f.provider == "gh"
        finally:
            patch.stopall()

    def test_prdrc_skipped_when_remote_arg_passed(self, tmp_path):
        """When detect() is called with an explicit remote arg, .prdrc is not consulted."""
        _git_repo_with_prdrc(tmp_path, '[forge]\nprovider = "local"\n')
        for p in _patch_git(tmp_path, remote=""):
            p.start()
        try:
            f = forge.detect(remote="https://github.com/Org/repo.git")
            assert f.provider == "gh"
        finally:
            patch.stopall()

    def test_prdrc_unknown_remote_no_longer_raises(self, tmp_path):
        """.prdrc override rescues an otherwise-unknown remote."""
        _git_repo_with_prdrc(tmp_path, '[forge]\nprovider = "fgj"\n')
        for p in _patch_git(tmp_path, remote="https://gitlab.com/Org/repo.git"):
            p.start()
        try:
            f = forge.detect()
            assert f.provider == "fgj"
            assert f.owner == "Org"
            assert f.repo == "repo"
        finally:
            patch.stopall()


class TestDetectWithoutPrdrc:
    """Existing detection logic still works unchanged."""

    def test_github(self):
        f = forge.detect(remote="https://github.com/octocat/Hello-World.git")
        assert f.provider == "gh"
        assert f.owner == "octocat"
        assert f.repo == "Hello-World"

    def test_codeberg(self):
        f = forge.detect(remote="https://codeberg.org/Org/repo.git")
        assert f.provider == "fgj"
        assert f.owner == "Org"
        assert f.repo == "repo"

    def test_unknown_raises(self):
        with pytest.raises(forge.UnknownForge):
            forge.detect(remote="https://gitlab.com/Org/repo")

    def test_empty_remote_is_local(self):
        f = forge.detect(remote="")
        assert f.provider == "local"
        assert f.owner == "-"
        assert f.repo == "-"

    def test_ssh_github(self):
        f = forge.detect(remote="git@github.com:octocat/Hello-World.git")
        assert f.provider == "gh"
        assert f.owner == "octocat"
        assert f.repo == "Hello-World"
