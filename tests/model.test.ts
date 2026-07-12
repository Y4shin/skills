/** Tests for the task-workflow model — path resolution, artifact discovery. */

import { mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

import {
	discoverTasks,
	discoverEpics,
	discoverAll,
	discoverSlices,
	findRoot,
	isInitialized,
	resolveArtifact,
	taskRoot,
	tryGetActiveTaskSlug,
} from "../src/core/model";
import * as state from "../src/core/state";
import { mkTmp } from "./util";

function sampleTree(): string {
	const t = mkTmp();
	const root = join(t, "repo");
	mkdirSync(join(root, "docs/tasks/epics/auth"), { recursive: true });
	mkdirSync(join(root, "docs/tasks/login/slices"), { recursive: true });
	mkdirSync(join(root, "docs/tasks/config/slices"), { recursive: true });
	writeFileSync(
		join(root, "docs/tasks/epics/auth/epic.md"),
		"---\nkind: epic\ntitle: Auth epic\nslug: auth\nstatus: draft\ntasks: []\n---\n",
	);
	writeFileSync(
		join(root, "docs/tasks/login/task.md"),
		"---\nkind: task\ntitle: Login\nslug: login\nstatus: draft\nslices: []\n---\n",
	);
	writeFileSync(
		join(root, "docs/tasks/login/slices/1-login-form.md"),
		"---\nkind: slice\ntitle: Login form\nslug: login-form\ntask: ../task.md\nmode: afk\nstatus: todo\nsize: s\nblocked_by: []\n---\n",
	);
	writeFileSync(
		join(root, "docs/tasks/config/task.md"),
		"---\nkind: task\ntitle: Config\nslug: config\nstatus: draft\nslices: []\n---\n",
	);
	writeFileSync(
		join(root, "docs/tasks/config/slices/1-db-setup.md"),
		"---\nkind: slice\ntitle: DB setup\nslug: db-setup\ntask: ../task.md\nmode: afk\nstatus: todo\nsize: m\nblocked_by: []\n---\n",
	);
	// .git marker for findRoot
	mkdirSync(join(root, ".git"));
	return root;
}

describe("model", () => {
	test("findRoot resolves to repo root with .git", () => {
		const t = sampleTree();
		const root = findRoot(t);
		expect(root).toBe(t);
	});

	test("findRoot resolves via docs/tasks", () => {
		const t = sampleTree();
		// Remove .git marker
		rmSync(join(t, ".git"), { recursive: true, force: true });
		const root = findRoot(t);
		expect(root).toBe(t);
	});

	test("taskRoot returns docs/tasks path", () => {
		const t = sampleTree();
		expect(taskRoot(t)).toBe(join(t, "docs/tasks"));
	});

	test("isInitialized checks docs/tasks exists", () => {
		const t = sampleTree();
		expect(isInitialized(t)).toBe(true);
		const empty = mkTmp();
		expect(isInitialized(empty)).toBe(false);
	});

	test("discoverTasks finds task artifacts", () => {
		const t = sampleTree();
		const tasks = discoverTasks(t);
		expect(tasks.length).toBe(2);
		expect(tasks[0].slug).toBe("config");
		expect(tasks[1].slug).toBe("login");
		for (const t of tasks) expect(t.kind).toBe("task");
	});

	test("discoverEpics finds epic artifacts", () => {
		const t = sampleTree();
		const epics = discoverEpics(t);
		expect(epics.length).toBe(1);
		expect(epics[0].slug).toBe("auth");
		expect(epics[0].kind).toBe("epic");
	});

	test("discoverAll discovers both", () => {
		const t = sampleTree();
		const all = discoverAll(t);
		expect(all.length).toBe(3);
	});

	test("resolveArtifact by slug", () => {
		const t = sampleTree();
		const a = resolveArtifact(t, "login");
		expect(a.slug).toBe("login");
		expect(a.kind).toBe("task");
	});

	test("resolveArtifact by path", () => {
		const t = sampleTree();
		const a = resolveArtifact(t, join(t, "docs/tasks/login/task.md"));
		expect(a.slug).toBe("login");
	});

	test("sliceFiles returns slice info", () => {
		const t = sampleTree();
		const a = resolveArtifact(t, "login");
		const slices = a.sliceFiles();
		expect(slices.length).toBe(1);
		expect(slices[0].slug).toBe("login-form");
		expect(slices[0].number).toBe(1);
	});

	test("activeSliceFiles excludes archived", () => {
		const t = sampleTree();
		const a = resolveArtifact(t, "login");
		// Archive the slice
		mkdirSync(join(a.slicesDir, "archive"), { recursive: true });
		renameSync(
			join(a.slicesDir, "1-login-form.md"),
			join(a.slicesDir, "archive", "1-login-form.md"),
		);
		const active = a.activeSliceFiles();
		expect(active.length).toBe(0);
		// sliceFiles only looks at top-level slices/ — archived is no longer there
		expect(a.sliceFiles().length).toBe(0);
	});

	test("discoverSlices finds all slices across tasks", () => {
		const t = sampleTree();
		const slices = discoverSlices(t);
		expect(slices.length).toBe(2);
		const slugs = slices.map((s) => s.slug).sort();
		expect(slugs).toEqual(["db-setup", "login-form"]);
		for (const a of slices) expect(a.kind).toBe("slice");
	});

	test("discoverSlices scoped to one task", () => {
		const t = sampleTree();
		const slices = discoverSlices(t, "login");
		expect(slices.length).toBe(1);
		expect(slices[0].slug).toBe("login-form");
		expect(slices[0].path).toContain("login/slices");
	});

	test("resolveArtifact resolves slice by full path", () => {
		const t = sampleTree();
		const a = resolveArtifact(
			t,
			join(t, "docs/tasks/login/slices/1-login-form.md"),
		);
		expect(a.slug).toBe("login-form");
		expect(a.kind).toBe("slice");
		expect(a.status).toBe("todo");
	});

	test("resolveArtifact resolves slice by slug with active task context", () => {
		const t = sampleTree();
		// Write state.yaml with active task set to "login"
		state.save(t, {
			active: { task: "login", slice: null, epic: null },
			last_action: "started",
			next_action: "start-slice login-form",
		});
		const a = resolveArtifact(t, "login-form");
		expect(a.slug).toBe("login-form");
		expect(a.kind).toBe("slice");
	});

	test("resolveArtifact resolves slice when want=slice", () => {
		const t = sampleTree();
		// Even without state.yaml, want=slice searches all slices
		const a = resolveArtifact(t, "login-form", "slice");
		expect(a.slug).toBe("login-form");
		expect(a.kind).toBe("slice");
	});

	test("resolveArtifact by slice slug fails when ambiguous across tasks", () => {
		const t = sampleTree();
		// Add a slice with the same slug in the config task
		writeFileSync(
			join(t, "docs/tasks/config/slices/2-login-form.md"),
			"---\nkind: slice\ntitle: Other\nslug: login-form\ntask: ../task.md\nmode: afk\nstatus: todo\nsize: m\nblocked_by: []\n---\n",
		);
		// No state.yaml — full slice scan finds two
		expect(() => resolveArtifact(t, "login-form")).toThrow("ambiguous");
		// With active task context, disambiguates
		state.save(t, {
			active: { task: "login", slice: null, epic: null },
			last_action: "started",
			next_action: "start-slice login-form",
		});
		const a = resolveArtifact(t, "login-form");
		expect(a.slug).toBe("login-form");
		expect(a.path).toContain("login/slices");
	});

	test("resolveArtifact by slice path works even when want=task (falls back to direct parse)", () => {
		const t = sampleTree();
		const a = resolveArtifact(
			t,
			join(t, "docs/tasks/login/slices/1-login-form.md"),
			"slice",
		);
		expect(a.kind).toBe("slice");
		// Path to a slice but asking for task should fail the kind check
		expect(() =>
			resolveArtifact(
				t,
				join(t, "docs/tasks/login/slices/1-login-form.md"),
				"task",
			),
		).toThrow(/has kind 'slice', not 'task'/);
	});

	test("tryGetActiveTaskSlug returns active task from state.yaml", () => {
		const t = sampleTree();
		expect(tryGetActiveTaskSlug(t)).toBeNull(); // no state.yaml yet
		state.save(t, {
			active: { task: "login", slice: "login-form", epic: null },
			last_action: "started",
			next_action: "start-slice login-form",
		});
		expect(tryGetActiveTaskSlug(t)).toBe("login");
	});
});

describe("state", () => {
	test("load returns default when no state file", () => {
		const t = mkTmp();
		const s = state.load(t);
		expect(s.active.task).toBeNull();
		expect(s.active.slice).toBeNull();
		expect(s.active.epic).toBeNull();
		expect(s.last_action).toBe("");
		expect(s.next_action).toBe("");
	});

	test("save and load round-trips", () => {
		const t = sampleTree();
		state.save(t, {
			active: { task: "login", slice: "login-form", epic: null },
			last_action: "create-task wrote task.md for login",
			next_action: "slice-task login",
		});
		const s = state.load(t);
		expect(s.active.task).toBe("login");
		expect(s.active.slice).toBe("login-form");
		expect(s.last_action).toBe("create-task wrote task.md for login");
		expect(s.next_action).toBe("slice-task login");
	});

	test("update partial fields", () => {
		const t = sampleTree();
		state.update(t, { last_action: "started work" });
		const s = state.load(t);
		expect(s.last_action).toBe("started work");
		expect(s.next_action).toBe("");
		// further update
		state.update(t, {
			active: { task: "login", slice: null, epic: null },
			next_action: "slice-task login",
		});
		const s2 = state.load(t);
		expect(s2.active.task).toBe("login");
		expect(s2.next_action).toBe("slice-task login");
	});
});
