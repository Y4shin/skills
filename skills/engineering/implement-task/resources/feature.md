# Implement Task (feature router)

This stable router selects the feature pipeline's mode. The frontmatter marker
fires first, then the invocation prose that follows the ticket reference.

1. **`mode: human` hard-refuses autonomous dispatch.** A ticket marked
   `mode: human` is human-owned: the router never dispatches subagent chains
   for it and does not fall through to the autonomous pipeline. It hands back
   the re-invocation for the human to run: `/skill:implement-task <slug>`,
   saying the human will implement it (the human-mode protocol).
2. If the prose clearly says to implement the ticket yourself, work in human
   mode, or use manual implementation, follow `resources/feature/human.md`.
3. Treat equivalent wording variants such as "I'll implement it", "let me do
   the coding", or "human-owned implementation" as clear human intent.
4. If wording is ambiguous and could mean either collaboration or autonomous
   implementation, do not guess: use `ask_user_question` to confirm whether
   human/manual mode is intended, then follow the selected resource.
5. With no trailing mode prose, or when autonomous mode is confirmed, follow
   `resources/feature/autonomous.md`. This is the autonomous feature pipeline.

Only this top-level file is referenced by `skills/engineering/implement-task/SKILL.md`.
The mode-specific resources own their respective pipelines; this router must
not duplicate them.
