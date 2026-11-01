---
"@y4shin/pi-task-workflow": patch
---

Declare the pi-telemetry version this package is tested against.

The optional peer was `*`, which said nothing. It is now `^0.4.2`, the first
version published to npm, and the first that follows the pi 1.4 SDK event
shape this package runs against.

The requirement stays optional: a missing extension warns at session start and
starts nothing else, which is what the ticket chains need.
