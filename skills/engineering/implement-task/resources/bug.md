# Implement Task (bug router)

This stable router preserves the existing bug dispatch while selecting the
mode from the invocation prose that follows the task reference.

1. If the prose clearly says to implement the fix yourself, work in human
   mode, or use manual implementation, follow
   `resources/bug/human.md`.
2. Treat equivalent wording variants such as “I’ll fix it”, “let me do the
   coding”, or “human-owned fix” as clear human intent.
3. If wording is ambiguous and could mean either collaboration or autonomous
   implementation,
   do not guess: use `ask_user_question` to confirm whether human/manual mode
   is intended, then follow the selected resource.
4. With no trailing mode prose, or when autonomous mode is confirmed, follow
   `resources/bug/autonomous.md`. This is the unchanged autonomous bug
   pipeline.

Only this top-level file is referenced by `skills/engineering/implement-task/SKILL.md`.
The mode-specific resources own their respective pipelines; this router must
not duplicate them.
