# teach

## What it does

`teach` teaches you a new skill or concept over multiple sessions, treating
the current directory as a stateful **teaching workspace**. State lives in
files: `MISSION.md` (the reason you care, grounding everything), `lessons/`
(one self-contained HTML file per lesson, numbered in order),
`reference/` (compressed cheat sheets and glossaries designed to print
well), `learning-records/` (what you have learned, the equivalent of ADRs
for your learning), `RESOURCES.md` (high-trust sources), `assets/`
(reusable components shared across lessons), `GLOSSARY.md`, and `NOTES.md`
(your preferences and working notes).

The philosophy, in three words: **knowledge** (gathered from high-quality,
high-trust resources, never trusted from the model's parametric memory),
**skills** (acquired through interactive lessons with tight feedback loops:
quizzes, in-browser tasks, real-world steps), and **wisdom** (which comes
from communities, not from the agent; the skill finds you high-reputation
communities and delegates there).

The teaching levers:

- **The mission**: every lesson ties back to why you are learning; an empty
  `MISSION.md` means the first job is asking you why.
- **Zone of proximal development**: each lesson challenges "just enough",
  computed from your learning records and mission.
- **Fluency versus storage strength**: in-the-moment retrieval feels like
  mastery; long-term retention is the real goal, built by retrieval
  practice, spacing, and interleaving.
- **Small wins**: a lesson is short, completable quickly, and gives one
  tangible win, with citations to primary sources and a reminder that the
  agent is your teacher for follow-ups.

## When to reach for it

Type `/skill:teach <topic>` in a directory you are happy to turn into your
learning workspace. It is user-invoked and stateful: it expects you back
next session.

## Common questions

**Why does it create files in my directory?**
The workspace is the memory. Lessons, references, and learning records let
the next session pick up exactly where you left off, and the reference
documents outlive the lessons.

**Why does it keep asking about my mission?**
Lessons grounded in the real reason stick; lessons grounded in nothing feel
abstract. The mission also decides what "next" means.

**Why so much quizzing?**
Effortful retrieval builds storage strength. Fluency (recognizing an answer)
is not retention (producing it later), and the quizzes, spacing, and
interleaving are what move knowledge from one to the other.

**Where do the facts come from?**
`RESOURCES.md` tracks high-trust sources, and lessons cite them. The model's
own recall is treated as untrusted until a source backs it.

**What about practice outside the lessons?**
That is the wisdom layer: the skill points you at communities (forums,
classes, groups) where real practitioners test your skills, and respects it
if you prefer not to join one.

## It's working if

- The workspace holds a mission you recognize, lessons in your zone of
  proximal development, and references you actually return to.
- Each lesson was short, gave one tangible win, and cited its primary
  sources.
- You can retrieve old material without the lesson open: the quizzes and
  spacing did their job.
- Learning records accumulated, so the next session started from your real
  level instead of from scratch.
- Lessons reuse shared components, and the course reads like one course,
  not a pile of one-offs.
