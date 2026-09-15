# handoff

## What it does

`handoff` compacts the conversation you are in into one markdown file that a
fresh agent can read to pick the work up where you left off. It writes to the
OS temp directory by default and always confirms the destination before
writing; a path you pass overrides. A handoff is a **transit document**: it
exists to move work across a boundary the session itself cannot cross, not to
archive it.

It captures the **live thread** (what is in flight, why, and the immediate
next step) plus a **suggested skills** section naming what the next agent
should reach for. Anything already written down (specs, plans, ADRs, issues,
commits, diffs) is referenced by path or URL, never copied. Secrets are
redacted before the file is written.

## When to reach for it

You invoke it by typing `/skill:handoff`; the agent will not reach for it on
its own. Pass a note about what the next session is for and the document is
tailored to it.

A handoff file is the move only when something has to **travel** outside the
current session:

| Situation | Why a file |
| --- | --- |
| Swapping harness (Claude to Codex) | The new harness cannot see the old context |
| Moving to a different directory or repo | A prototype directory is the common case |
| Sending the work to a colleague | They need something they can read |
| Forking a side task found mid-phase | You keep working; a second agent takes the fork |

For anything else (same harness, same directory, end of a phase) `/compact`
is the move, not a handoff file.

## Common questions

**Handoff or compact?**
`/compact` unless something is travelling. Staying on the same task in the
same harness and directory is a compact. The handoff file's advantage is not
that it summarises better; it is that the result is a file you can carry
somewhere `/compact` cannot reach.

**Where does the file go?**
The OS temp directory by default, with a readable name. The skill always
confirms the path with you before writing and reports it back. Temp is
deliberate: a handoff is a transit document, not an artifact you maintain or
commit.

**My handoff vanished between sessions.**
Some environments clear temp between sessions, and `/private/tmp` goes on
reboot. If the next session is delayed or runs under a different harness, copy
the file somewhere durable yourself as soon as it is written.

**How do I hand it to the next agent?**
Open a fresh session and point it at the file path. Point at the file rather
than pasting the summary into a shell command: a summary containing backticks
or `$(...)` gets silently truncated when interpolated, and the new agent
starts with a quietly incomplete brief.

**It captures the what, not the why.**
A fair and repeated criticism. Pass the argument (tell it what the next
session is for) so the reasoning that bears on that is kept rather than
flattened. And watch for confident claims the session never verified: the next
agent treats the document as a contract and will not re-check it, so a belief
written as a fact becomes a false premise for everything that follows.

**Is there a live-agent option too?**
Yes, on Pi. The skill can dispatch a subagent seeded with the handoff summary
as its prompt, which picks up immediately but is harness-local. The file
travels across harnesses; the live subagent does not. When in doubt, write the
file and offer to seed a subagent as well.

**When does something belong in `CLAUDE.md` or `AGENTS.md` instead?**
Ask whether it is true next month. Standing context about the project belongs
in `CLAUDE.md` (or this repo's `AGENTS.md`); it loads into every session. A
handoff is about one piece of work in flight and is dead once that work lands.

## It's working if

- The document is a small fraction of the conversation, and the specs, issues
  and diffs appear in it as paths and URLs rather than copied text.
- You can read it cold, without the original session open, and know what to do
  next.
- The fresh agent starts working instead of asking you to re-explain the
  setup.
- In the fork case, your original session is still sitting there untouched
  when you come back to it.
- The suggested-skills section names only model-invoked skills; user-invoked
  ones are phrased as instructions for the human.
- Nothing in it is a key, a token, or a password.
