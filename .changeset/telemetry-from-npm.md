---
"task-workflow": patch
---

The pi-telemetry install hint names the npm package.

- The missing-dependency warning, and the two tests that pin its wording, now read `pi install npm:@y4shin/pi-telemetry` instead of pointing at the git repository, which no longer needs a clone and follows the published versions.
- `package.json` declares `@y4shin/pi-telemetry` as an optional peer dependency. The requirement is now machine-visible, and optional keeps the install clean when the extension is absent, which is what the session warning is for.
