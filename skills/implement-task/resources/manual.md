# Implement Task — Manual Resource

Resolves a `type: manual` task when a decision or implementation is blocked on
human or environment work.

## Process

1. Read the task and identify the exact prerequisite, owner, and evidence
   required to unblock dependents.
2. If the work is safe and automatable, perform it with explicit confirmation
   where it changes external state.
3. Otherwise give the user a precise checklist and stop. Do not claim success
   on the user's behalf.
4. Record URLs, identifiers, configuration locations, row counts, or other
   facts needed by dependent tasks. Never record secrets.
5. Mark the task `done` only when the evidence in its acceptance criteria is
   present. If the prerequisite cannot be completed, leave it `blocked` with a
   reason.

## Completion evidence

The task must contain:

- what was done;
- who or what performed it;
- resulting facts and artifact links;
- remaining risks or follow-up tasks.

This resource does not implement application behavior unless the task is
explicitly reclassified as a feature or bug by Wayfinder.
