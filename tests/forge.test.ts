/** Tests for core/forge — .prdrc override of forge detection, and URL detection. */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";

import * as forge from "../src/core/forge";
import { mkTmp } from "./util";

const origIo = { ...forge.io };

afterEach(() => {
  forge.io.isGitRepo = origIo.isGitRepo;
  forge.io.remoteUrl = origIo.remoteUrl;
  forge.io.repoRoot = origIo.repoRoot;
});

function stubGit(root: string, remote = ""): void {
  forge.io.isGitRepo = () => true;
  forge.io.remoteUrl = () => remote;
  forge.io.repoRoot = () => root;
}

function withPrdrc(root: string, content: string): void {
  writeFileSync(join(root, ".prdrc"), content);
}

describe("prdrc override", () => {
  test("prdrc overrides provider", () => {
    const t = mkTmp();
    withPrdrc(t, '[forge]\nprovider = "gh"\n');
    stubGit(t, "https://codeberg.org/Org/repo.git");
    const f = forge.detect();
    expect(f.provider).toBe("gh");
    expect(f.owner).toBe("Org");
    expect(f.repo).toBe("repo");
  });

  test("prdrc overrides owner and repo", () => {
    const t = mkTmp();
    withPrdrc(t, '[forge]\nprovider = "fgj"\nowner = "X"\nrepo = "Y"\n');
    stubGit(t, "https://github.com/Real/Name.git");
    const f = forge.detect();
    expect(f.provider).toBe("fgj");
    expect(f.owner).toBe("X");
    expect(f.repo).toBe("Y");
  });

  test("prdrc provider only infers owner/repo from remote", () => {
    const t = mkTmp();
    withPrdrc(t, '[forge]\nprovider = "gh"\n');
    stubGit(t, "https://codeberg.org/MyOrg/MyRepo.git");
    const f = forge.detect();
    expect(f.provider).toBe("gh");
    expect(f.owner).toBe("MyOrg");
    expect(f.repo).toBe("MyRepo");
  });

  test("prdrc local provider", () => {
    const t = mkTmp();
    withPrdrc(t, '[forge]\nprovider = "local"\n');
    stubGit(t, "https://github.com/Org/repo.git");
    const f = forge.detect();
    expect(f.provider).toBe("local");
    expect(f.owner).toBe("Org");
    expect(f.repo).toBe("repo");
  });

  test("prdrc local provider no remote", () => {
    const t = mkTmp();
    withPrdrc(t, '[forge]\nprovider = "local"\n');
    stubGit(t, "");
    const f = forge.detect();
    expect(f.provider).toBe("local");
    expect(f.owner).toBe("-");
    expect(f.repo).toBe("-");
  });

  test("prdrc invalid provider ignored", () => {
    const t = mkTmp();
    withPrdrc(t, '[forge]\nprovider = "gitlab"\n');
    stubGit(t, "https://github.com/Org/repo.git");
    expect(forge.detect().provider).toBe("gh");
  });

  test("prdrc missing provider ignored", () => {
    const t = mkTmp();
    withPrdrc(t, '[forge]\nowner = "X"\n');
    stubGit(t, "https://github.com/Org/repo.git");
    const f = forge.detect();
    expect(f.provider).toBe("gh");
    expect(f.owner).toBe("Org");
  });

  test("prdrc malformed toml ignored", () => {
    const t = mkTmp();
    withPrdrc(t, "not valid toml [[[");
    stubGit(t, "https://github.com/Org/repo.git");
    expect(forge.detect().provider).toBe("gh");
  });

  test("no prdrc falls through", () => {
    const t = mkTmp();
    stubGit(t, "https://github.com/Org/repo.git");
    expect(forge.detect().provider).toBe("gh");
  });

  test("prdrc skipped when remote arg passed", () => {
    const t = mkTmp();
    withPrdrc(t, '[forge]\nprovider = "local"\n');
    stubGit(t, "");
    expect(forge.detect("https://github.com/Org/repo.git").provider).toBe("gh");
  });

  test("prdrc unknown remote no longer raises", () => {
    const t = mkTmp();
    withPrdrc(t, '[forge]\nprovider = "fgj"\n');
    stubGit(t, "https://gitlab.com/Org/repo.git");
    const f = forge.detect();
    expect(f.provider).toBe("fgj");
    expect(f.owner).toBe("Org");
    expect(f.repo).toBe("repo");
  });
});

describe("detect without prdrc", () => {
  test("github", () => {
    const f = forge.detect("https://github.com/octocat/Hello-World.git");
    expect(f.provider).toBe("gh");
    expect(f.owner).toBe("octocat");
    expect(f.repo).toBe("Hello-World");
  });

  test("codeberg", () => {
    const f = forge.detect("https://codeberg.org/Org/repo.git");
    expect(f.provider).toBe("fgj");
    expect(f.owner).toBe("Org");
    expect(f.repo).toBe("repo");
  });

  test("unknown raises", () => {
    expect(() => forge.detect("https://gitlab.com/Org/repo")).toThrow(forge.UnknownForge);
  });

  test("empty remote is local", () => {
    const f = forge.detect("");
    expect(f.provider).toBe("local");
    expect(f.owner).toBe("-");
    expect(f.repo).toBe("-");
  });

  test("ssh github", () => {
    const f = forge.detect("git@github.com:octocat/Hello-World.git");
    expect(f.provider).toBe("gh");
    expect(f.owner).toBe("octocat");
    expect(f.repo).toBe("Hello-World");
  });
});
