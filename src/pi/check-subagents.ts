/**
 * Checks that pi-subagents is installed at startup.
 *
 * If missing, shows a warning notification with install instructions.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
	pi.on("session_start", async (_event, ctx) => {
		const tools = pi.getAllTools();
		const hasSubagent = tools.some((t) => t.name === "subagent");

		if (!hasSubagent) {
			ctx.ui.notify(
				"pi-subagents is not installed. Install it with: pi install npm:pi-subagents",
				"warning",
			);
		}
	});
}
