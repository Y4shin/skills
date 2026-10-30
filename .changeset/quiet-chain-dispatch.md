---
"task-workflow": patch
---

implement-task: pass `control: { notifyOn: ["active_long_running"] }` on the shipped async launches (the feature pipeline's per-ticket chain dispatch, the bug chain dispatch, and the end-of-effort workflow). A chain or wrap-up workflow holds quiet while its workers run, so the run watchdog's 60-second idle `needs_attention` pings are pure noise for these launches; the `active_long_running` notice, native completion and failure notifications, and supervisor-channel questions are unchanged.
