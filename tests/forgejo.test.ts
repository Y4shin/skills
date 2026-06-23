/** Tests for core/forgejo — host parsing, id resolution, request shaping. */

import { afterEach, describe, expect, test } from "vitest";

import { Client, ForgejoError, hostFromRemote, tokenIo } from "../src/core/forgejo";

type Router = (method: string, path: string, body?: any, query?: any) => any;

interface Call {
  method: string;
  path: string;
  body?: any;
  query?: any;
}

function clientWithRouter(router: Router): { c: Client; calls: Call[] } {
  const c = new Client("o", "r", "h", "tok");
  const calls: Call[] = [];
  c.request = async (method: string, path: string, body?: any, query?: any) => {
    calls.push({ method, path, body, query });
    return router(method, path, body, query);
  };
  return { c, calls };
}

describe("hostFromRemote", () => {
  test.each([
    ["git@codeberg.org:Yashin/skills.git", "codeberg.org"],
    ["https://codeberg.org/o/r.git", "codeberg.org"],
    ["https://codeberg.org/o/r", "codeberg.org"],
    ["ssh://git@fj.example.com:2222/o/r.git", "fj.example.com"],
    ["https://user@gitea.io/o/r", "gitea.io"],
  ])("%s -> %s", (remote, host) => {
    expect(hostFromRemote(remote)).toBe(host);
  });

  test("empty raises", () => {
    expect(() => hostFromRemote("   ")).toThrow(ForgejoError);
  });
});

describe("client", () => {
  test("create_issue resolves label and milestone ids", async () => {
    const router: Router = (method, path) => {
      if (method === "GET" && path.endsWith("/labels"))
        return [
          { name: "kind:feature", id: 5 },
          { name: "prd", id: 9 },
        ];
      if (method === "GET" && path.endsWith("/milestones")) return [{ title: "M07", id: 3 }];
      if (method === "POST" && path.endsWith("/issues")) return { number: 42 };
      throw new Error(`unexpected ${method} ${path}`);
    };
    const { c, calls } = clientWithRouter(router);
    const issue = await c.createIssue("t", "b", ["kind:feature", "prd"], "M07");
    expect(issue.number).toBe(42);
    const post = calls.find((x) => x.method === "POST" && x.path.endsWith("/issues"))!;
    expect(post.body.labels).toEqual([5, 9]);
    expect(post.body.milestone).toBe(3);
  });

  test("unknown label raises", async () => {
    const router: Router = (_m, path) => {
      if (path.endsWith("/labels")) return [{ name: "prd", id: 9 }];
      throw new Error("should not reach create");
    };
    const { c } = clientWithRouter(router);
    await expect(c.createIssue("t", "b", ["does-not-exist"])).rejects.toThrow(ForgejoError);
  });

  test("ensure_milestone creates when absent", async () => {
    const created: any = {};
    const router: Router = (method, path, body) => {
      if (method === "GET" && path.endsWith("/milestones")) return [];
      if (method === "POST" && path.endsWith("/milestones")) {
        Object.assign(created, body);
        return { id: 11 };
      }
      throw new Error(`unexpected ${method} ${path}`);
    };
    const { c } = clientWithRouter(router);
    expect(await c.ensureMilestone("M09")).toBe(11);
    expect(created.title).toBe("M09");
  });

  test("edit_labels add and remove", async () => {
    const router: Router = (method, path) => {
      if (method === "GET" && path.endsWith("/labels"))
        return [
          { name: "status:todo", id: 1 },
          { name: "status:done", id: 2 },
        ];
      return null;
    };
    const { c, calls } = clientWithRouter(router);
    await c.editLabels(7, ["status:done"], ["status:todo"]);
    expect(
      calls.some(
        (x) =>
          x.method === "POST" &&
          x.path === "/repos/o/r/issues/7/labels" &&
          JSON.stringify(x.body) === JSON.stringify({ labels: [2] }),
      ),
    ).toBe(true);
    expect(calls.some((x) => x.method === "DELETE" && x.path === "/repos/o/r/issues/7/labels/1")).toBe(true);
  });

  test("add_dependency body shape", async () => {
    const { c, calls } = clientWithRouter(() => null);
    await c.addDependency(7, 3);
    const dep = calls[calls.length - 1];
    expect(dep.method).toBe("POST");
    expect(dep.path).toBe("/repos/o/r/issues/7/dependencies");
    expect(dep.body).toEqual({ index: 3, owner: "o", repo: "r" });
  });

  test("ensure_milestone returns existing without post", async () => {
    const router: Router = (method, path) => {
      if (method === "GET" && path.endsWith("/milestones")) return [{ title: "Auth epic", id: 7 }];
      throw new Error(`unexpected ${method} ${path}`);
    };
    const { c, calls } = clientWithRouter(router);
    expect(await c.ensureMilestone("Auth epic")).toBe(7);
    expect(calls.some((x) => x.method === "POST")).toBe(false);
  });

  test("update_issue patches title and body", async () => {
    const { c, calls } = clientWithRouter(() => null);
    await c.updateIssue(5, "Real PRD", "real");
    const patch = calls[calls.length - 1];
    expect(patch.method).toBe("PATCH");
    expect(patch.path).toBe("/repos/o/r/issues/5");
    expect(patch.body).toEqual({ title: "Real PRD", body: "real" });
  });

  test("update_issue noop when nothing given", async () => {
    const { c, calls } = clientWithRouter(() => null);
    await c.updateIssue(5);
    expect(calls.length).toBe(0);
  });

  test("close_milestone patches state", async () => {
    const { c, calls } = clientWithRouter(() => null);
    await c.closeMilestone(7);
    const patch = calls[calls.length - 1];
    expect(patch.method).toBe("PATCH");
    expect(patch.path).toBe("/repos/o/r/milestones/7");
    expect(patch.body).toEqual({ state: "closed" });
  });

  test("set_milestone resolves then assigns", async () => {
    const router: Router = (method, path) => {
      if (method === "GET" && path.endsWith("/milestones")) return [{ title: "Auth epic", id: 7 }];
      return null;
    };
    const { c, calls } = clientWithRouter(router);
    expect(await c.setMilestone(42, "Auth epic")).toBe(7);
    const patch = calls.find((x) => x.method === "PATCH" && x.path === "/repos/o/r/issues/42")!;
    expect(patch.body).toEqual({ milestone: 7 });
  });
});

describe("token", () => {
  const orig = tokenIo.fgjAuthToken;
  afterEach(() => {
    tokenIo.fgjAuthToken = orig;
    delete process.env.FORGEJO_TOKEN;
    delete process.env.CODEBERG_TOKEN;
  });

  test("env fallback", () => {
    tokenIo.fgjAuthToken = () => ""; // fgj CLI absent
    delete process.env.CODEBERG_TOKEN;
    process.env.FORGEJO_TOKEN = "envtoken";
    const c = new Client("o", "r", "h");
    expect(c.token()).toBe("envtoken");
  });

  test("missing raises", () => {
    tokenIo.fgjAuthToken = () => "";
    delete process.env.FORGEJO_TOKEN;
    delete process.env.CODEBERG_TOKEN;
    const c = new Client("o", "r", "h");
    expect(() => c.token()).toThrow(ForgejoError);
  });
});
