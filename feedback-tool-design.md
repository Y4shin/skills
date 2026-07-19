# Workflow Feedback — Tool & Skill Design

## What We're Building

Two things:

1. **A tool** (`submit_workflow_feedback`) that sends a structured log entry
   to the OTLP endpoint with `kind=workflow-feedback`, so it lands in
   VictoriaLogs alongside all other ObservMe telemetry.
2. **A skill** (`review-workflow-feedback`) that queries VictoriaLogs for
   those feedback entries and presents them back to the user.

Everything lives in the extension (`src/pi.ts`). No new files.

---

## Why OTLP instead of direct VictoriaLogs ingestion

The ObservMe pipeline is already running: OTLP endpoint → OpenTelemetry
Collector → VictoriaLogs. Sending feedback logs through this same pipeline
means they automatically:
- Share the same authentication, TLS, and routing as all other telemetry
- Appear alongside the traces and metrics from the same session
- Don't require a second credentials/config for the feedback tool

The tool POSTs to the same `otlp.signalEndpoints.logs` URL that ObservMe
uses, with the same `otlp.headers` auth.

---

## Tool: `submit_workflow_feedback`

### What it does

Reads the ObservMe config from `.pi/observme.yaml`, resolves the OTLP logs
endpoint and auth headers, and POSTs one or more log records with the label
`kind=workflow-feedback` plus context labels.

### Parameters

```
submit_workflow_feedback
  message: string          # The feedback text (required)
  tags: string[]           # Optional: ["good", "bad", "architecture",
                           #   "test-quality", "ux", "performance", ...]
  details: string          # Optional structured details (markdown)
```

`kind` is hardcoded to `"workflow-feedback"` in the tool. The caller
only provides the message, optional tags, and optional details.

### What it sends

```json
POST /v1/logs
Content-Type: application/json

{
  "resourceLogs": [{
    "resource": {
      "attributes": [
        {"key": "service.name", "value": {"stringValue": "task-workflow"}}
      ]
    },
    "scopeLogs": [{
      "scope": {"name": "workflow-feedback"},
      "logRecords": [{
        "timeUnixNano": "<current time in ns>",
        "severityNumber": 9,
        "severityText": "INFO",
        "body": {"stringValue": "<message>"},
        "attributes": [
          {"key": "kind", "value": {"stringValue": "workflow-feedback"}},  // hardcoded
          {"key": "session_id", "value": {"stringValue": "<session-id>"}},
          {"key": "cwd", "value": {"stringValue": "<cwd>"}},
          {"key": "git_commit", "value": {"stringValue": "<sha>"}},
          {"key": "message", "value": {"stringValue": "<message>"}},
          {"key": "details", "value": {"stringValue": "<details>"}},
          {"key": "tags", "value": {"stringValue": "<comma-separated>"}}
        ]
      }]
    }]
  }]
}
```

### Config resolution

The tool reads ObservMe's config to find the OTLP endpoint. It uses the
same resolution order as ObservMe itself:

1. Check `OBSERVME_OTLP_ENDPOINT` env var
2. Check `OBSERVME_LOGS_ENDPOINT` env var (for signal-specific)
3. Read `.pi/observme.yaml` → `otlp.signalEndpoints.logs` field
4. Fall back to `.pi/observme.yaml` → `otlp.endpoint` + `/v1/logs`

Auth headers are read from `.pi/observme.yaml` → `otlp.headers`.

### Session ID resolution

The session ID is read from the ObservMe environment (if available):
`OBSERVME_SESSION_ID` or `PI_SESSION_ID`, or generated as "unknown" if
neither is set.

### How it's registered

```typescript
pi.registerTool({
  name: "submit_workflow_feedback",
  label: "Submit Workflow Feedback",
  description: "Send structured feedback about the workflow to the
    observability backend. The feedback appears in VictoriaLogs alongside
    other telemetry. Use this to report what's working and what isn't.",
  parameters: Type.Object({
    message: Type.String({ description: "The feedback message" }),
    // kind is hardcoded to "workflow-feedback"
    tags: Type.Optional(Type.Array(Type.String(), {
      description: "Tags for categorisation: good, bad, architecture, etc."
    })),
    details: Type.Optional(Type.String({
      description: "Optional structured details in markdown"
    }))
  }),
  async execute(_id, params, _sig, _upd, _ctx) {
    // Read ObservMe config
    // Send OTLP log
    // Return success/failure
  }
})
```

---

## Skill: `review-workflow-feedback` (in-repo, not shipped)

This is a skill that lives in the repo's `.pi/skills/` directory, NOT in
the package's `skills/` directory. It's a developer tool for the people
building this package, not a workflow skill for end users.

### Location

```
.pi/skills/review-workflow-feedback/SKILL.md
```

### What it does

Queries VictoriaLogs for logs with `kind=workflow-feedback` and presents
them in a readable format. Supports filtering by time range, tags, session.

### How it queries

VictoriaLogs exposes a LogsQL HTTP API at `http://localhost:9428/select/logsql/query`.
The skill runs a `bash` curl command:

```bash
curl -s -X POST 'http://localhost:9428/select/logsql/query' \
  --data-urlencode 'query=kind:"workflow-feedback"'
```

The query supports LogsQL filters:
- `kind:"workflow-feedback"` — all feedback
- `kind:"workflow-feedback" AND tags:"architecture"` — by tag
- `kind:"workflow-feedback" AND session_id:"<id>"` — by session
- `kind:"workflow-feedback" AND _time:"5m"` — last 5 minutes

### What it presents

```
## Workflow Feedback

### Last 5 entries

| Time | Session | Tags | Message |
|------|---------|------|---------|
| 12:51 | abc123 | good, architecture | The arch spec step caught a coupling issue early |
| 12:45 | abc123 | bad, test-quality | Verifier didn't catch the mock assertion |
| 12:30 | def456 | good, ux | Deviation report was clear and actionable |

### Summary
- 3 feedback entries total
- 2 good, 1 bad
- Tags: architecture, test-quality, ux
```

### Suggested usage in the workflow

The parent agent calls `submit_workflow_feedback` when something notable
happens that we want to improve about the workflow itself:

- **Agent died during TDD** → `tags=bad, message="tdd-worker for env-loading died unexpectedly with no error — slice had to be restarted from scratch"`
- **Unexpected deviation** → `tags=bad, message="LoadEnv unexpectedly deviated from arch spec: added embed.FS param that dependent slice 3 didn't expect. Deviation report caught it but rework was needed."`
- **Arch spec approval caught an issue** → `tags=good, message="User caught that the planned interface between slice 3 and 4 was inverted during arch spec review — fixed before implementation started."`
- **Verifier false positive** → `tags=bad, message="Slice-verifier flagged a lint warning that turned out to be a project-wide convention. Took 3 retry cycles to override."`
- **Verifier missed something** → `tags=bad, message="Slice-verifier passed but integration test in later slice broke because of an API mismatch. Need cross-slice verification."`
- **Uncertainty resolution was smooth** → `tags=good, message="tdd-worker correctly identified ambiguous error handling pattern and wrote a clear uncertainty artifact. One question resolved it."`
- **Timeout lost work** → `tags=bad, message="Finalize-task timed out mid-harvest. Had to manually salvage. No checkpoint commits in this phase."`
- **Context bloat** → `tags=bad, message="After 5 slices, parent context grew to 1200 messages. Next task felt sluggish. Consider archiving old observations."`

This gives us a queryable log of what actually breaks or surprises during
pipeline runs, which we can use to improve the workflow over time.

---

## What gets added to the extension

One new tool (`submit_workflow_feedback`) in `src/pi.ts`. The config reading
is a small helper function (~30 lines), the OTLP POST is another ~40 lines.

Total: ~70 lines of TypeScript, one tool registration.

## What gets added to the repo

One new skill file at `.pi/skills/review-workflow-feedback/SKILL.md`.

Total: 1 file, ~60 lines of markdown.