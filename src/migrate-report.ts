/**
 * The migration report rendering.
 *
 * One rendering, frozen (the parity decision): the `tw_migrate` tool in
 * src/pi.ts returns it, and its text is pinned so the report cannot drift
 * from the shape the migration has always printed.
 */

import type { MigrateReport } from "./core/migrate.js";

export function renderMigrationReport(report: MigrateReport, dryRun: boolean): string {
  const lines: string[] = [];
  if (report.noop) {
    lines.push("already on schema_version 5, nothing to do.");
    return lines.join("\n");
  }
  lines.push(
    `${dryRun ? "dry run: would migrate" : "migrated"} from schema_version ${report.from} to ${report.to}`,
  );
  lines.push("");
  lines.push(`${report.changes.length} change(s):`);
  for (const c of report.changes) {
    lines.push(`  ${c.action} ${c.path}: ${c.detail}`);
  }
  if (report.needsHuman.length > 0) {
    lines.push("");
    lines.push(`${report.needsHuman.length} item(s) needing human eyes:`);
    for (const h of report.needsHuman) {
      lines.push(`  ${h.kind} ${h.path}: ${h.detail}`);
    }
  }
  return lines.join("\n");
}
