---
name: review-workflow-feedback
description: Query VictoriaLogs for workflow-feedback logs from the current session or a specified time range. Presents results as a readable table.
---

# Review Workflow Feedback

Queries VictoriaLogs (localhost:9428) for logs with `kind="workflow-feedback"`.

## Usage

```
/skill:review-workflow-feedback
```

Optional filters:

```
/skill:review-workflow-feedback tags=bad               # only bad feedback
/skill:review-workflow-feedback since=2h               # last 2 hours
/skill:review-workflow-feedback session=<session-id>   # specific session
/skill:review-workflow-feedback tags=good since=1d     # combined
```

## Implementation

```bash
# Build the LogsQL query
QUERY='kind:"workflow-feedback"'

# Add time filter
if [ -n "$SINCE" ]; then
  QUERY="$QUERY AND _time:\"$SINCE\""
fi

# Add tags filter
if [ -n "$TAGS" ]; then
  for tag in $(echo "$TAGS" | tr ',' ' '); do
    QUERY="$QUERY AND tags:\"$tag\""
  done
fi

# Add session filter
if [ -n "$SESSION" ]; then
  QUERY="$QUERY AND session_id:\"$SESSION\""
fi

# Query VictoriaLogs
curl -s -X POST 'http://localhost:9428/select/logsql/query' \
  --data-urlencode "query=$QUERY" \
  --data-urlencode 'limit=50' \
  | python3 -c "
import sys, json
rows = [json.loads(l) for l in sys.stdin]
print(f'## Workflow Feedback ({len(rows)} entries)\\n')
print(f'| Time | Session | Tags | Message |')
print(f'|------|---------|------|---------|')
for r in rows:
  t = r.get('_time','')[:19]
  s = r.get('session_id','?')[:8]
  tg = r.get('tags','')
  m = r.get('_msg','')[:80]
  print(f'| {t} | {s} | {tg} | {m} |')
"
```