/**
 * Tests for the ntfy.sh notification helper.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { mkTmp } from "./util";
import { readNtfyConfig, sendNtfyNotification } from "../src/pi/ntfy";

describe("ntfy config reader", () => {
	test("returns null when config file does not exist", () => {
		expect(readNtfyConfig("/nonexistent/path.json")).toBeNull();
	});

	test("returns null when ntfy is disabled", () => {
		const dir = mkTmp();
		const p = join(dir, "config.json");
		writeFileSync(
			p,
			JSON.stringify({
				ntfy: { enabled: false, serverUrl: "https://ntfy.sh", topic: "test" },
			}),
		);
		expect(readNtfyConfig(p)).toBeNull();
	});

	test("returns null when no topic", () => {
		const dir = mkTmp();
		const p = join(dir, "config.json");
		writeFileSync(
			p,
			JSON.stringify({ ntfy: { enabled: true, serverUrl: "https://ntfy.sh" } }),
		);
		expect(readNtfyConfig(p)).toBeNull();
	});

	test("parses valid ntfy config", () => {
		const dir = mkTmp();
		const p = join(dir, "config.json");
		writeFileSync(
			p,
			JSON.stringify({
				ntfy: {
					enabled: true,
					serverUrl: "https://ntfy.example.com",
					topic: "my-topic",
					token: "tk_12345",
					priority: 4,
				},
			}),
		);
		const cfg = readNtfyConfig(p);
		expect(cfg).not.toBeNull();
		expect(cfg!.serverUrl).toBe("https://ntfy.example.com");
		expect(cfg!.topic).toBe("my-topic");
		expect(cfg!.token).toBe("tk_12345");
		expect(cfg!.priority).toBe(4);
	});
});

describe("sendNtfyNotification", () => {
	test("returns false when config has no topic", async () => {
		const result = await sendNtfyNotification(
			{ message: "test" },
			{ enabled: true, serverUrl: "https://ntfy.sh", topic: "" },
		);
		expect(result).toBe(false);
	});

	test("returns false when config server is unreachable", async () => {
		const result = await sendNtfyNotification(
			{ message: "test" },
			{ enabled: true, serverUrl: "http://127.0.0.1:1", topic: "test" },
		);
		expect(result).toBe(false);
	});
});
