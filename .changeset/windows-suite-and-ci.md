---
"@y4shin/pi-task-workflow": patch
---

The suite runs and enforces on Windows, and CI now proves it. The corpus sweeps derive repo-relative paths in POSIX form, so the retired-vocabulary, old-tool-prefix, dead-surface, and em-dash guards stop reporting false positives on their own exemption files and start enforcing there again. The repo-gate fakes key on the resolved path, the two permission-dependent reproductions skip on a capability probe rather than by platform, and a third atomicity reproduction that needs no permissions keeps the restore guarantee running on Windows. Adds `tests/platform-compat.test.ts` (Linux, macOS, and Windows path flavours asserted from any host), `tests/lib/repo-paths.ts`, and `.github/workflows/ci.yml`, which runs the gate on `ubuntu-latest` and `windows-latest`.
