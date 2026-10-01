# writing-for-agents

## What it does

`writing-for-agents` is the reference for writing any document an agent
consumes: a skill, an `AGENTS.md` or `CLAUDE.md`, a doc reached by a
pointer. The packaging differs; the levers do not, because the agent runs
the same process every time rather than producing the same output.

Its vocabulary is the shared language for document design across this repo's
skills:

- **Context pointers**: a reference in the agent's context that names
  out-of-context material and encodes the condition for reaching it. The
  pointer's wording, not its target, decides when the agent reaches the
  material. A must-have target behind a weakly worded pointer is a variance
  bug: sharpen the wording first, inline only if sharpening fails.
- **The two loads**: **context load** (always-loaded material costing
  tokens every turn) and **cognitive load** (the human's cost of knowing
  which documents exist; the human is the index, and that load is spent
  where human judgment matters, not minimized to zero).
- **Information hierarchy**: in-file steps, in-file reference, then
  disclosed reference behind a pointer. **Progressive disclosure** is the
  move down the ladder so the top stays legible; branching is the test for
  what belongs where. **Co-location** keeps a concept's definition, rules,
  and caveats under one heading; **sprawl** is the failure mode of a
  document too long even when every line is live.
- **Steps and completion criteria**: every step ends on a criterion that is
  clear (done is distinguishable from not-done, defending against premature
  completion) and demanding ("every modified model accounted for" beats
  "produce a change list").
- **Leading words**: compact pretrained concepts ("fog of war", "tracer
  bullets", "red") that anchor behavior in a token or two, hunted as
  restatements to collapse. **Negation** is the neighboring failure: prompt
  the positive behavior, because "don't think of an elephant" is an
  elephant.
- **Pruning**: one source of truth per meaning, the environment treated as
  a source of truth (never restate a lookup a config file already answers),
  every line checked for relevance, every no-op sentence (one the model
  already obeys by default) deleted whole.

## When to reach for it

The model reaches for it when creating or editing skills, `AGENTS.md`,
`CLAUDE.md`, or any document agents read by pointer. If the document is a
skill, it also reads its `SKILL-MECHANICS.md` for frontmatter, invocation
choice, and router skills.

## Common questions

**Is this only about skills?**
No. A line in `AGENTS.md` and a skill description are the same object (a
context pointer), and the same levers govern both. The skill-specific bits
(frontmatter, invocation) live in its `SKILL-MECHANICS.md` reference.

**Why is cognitive load not just something to minimize?**
The human is the index: knowing which document exists and when to reach for
it is the price of human agency. The skill spends that load where judgment
matters and removes it where it does not.

**Why do leading words work?**
They recruit priors the model already holds: a pretrained concept ("red"
for a failing gate) anchors a region of behavior in one token, where a
spelled-out triad costs a sentence and sticks less.

**Why is stating the positive preferred over prohibitions?**
Steering by prohibition drags the banned behavior into context and makes it
more available. State the target behavior so the forbidden one is never
spoken; reserve hard bans for guardrails that cannot be phrased positively.

## It's working if

- Documents an agent reads are predictably acted on: the agent takes the
  same process every run.
- Pointers fire when they should (front-loaded leading words, one trigger
  per branch) and the always-loaded layer stays thin.
- Steps end in completion criteria that are both checkable and demanding,
  and sequences that tempt rushing are split.
- The document carries no restatements of what the environment already
  answers, and no sentence survives that the model would obey anyway.
