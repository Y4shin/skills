# Git workflows

The task workflow creates branches according to a **git profile**, a named
piece of data that says, for every phase and every implementation sub-agent,
which branch it must be on, and how an effort lands. A repository selects a
profile in settings; nothing in the skills hardcodes a branch name, so a
repository that names its branches differently is configured, not patched.

Three settings decide the behaviour, all under `taskWorkflow.git` in
`.pi/settings.json`, with `~/.pi/agent/settings.json` honoured as well. The
project file overrides the global file key by key, and the built-in defaults
come last.

## The three settings keys

```json
{
  "taskWorkflow": {
    "git": {
      "profile": "default",
      "trunk": { "develop": false, "main": "main" },
      "trunkMerge": "local"
    }
  }
}
```

- **`taskWorkflow.git.profile`** names the profile. The default is `default`.
- **`taskWorkflow.git.trunk`** names the trunk, the branch the effort branch is
  created off and landed into. `trunk.develop` is `false` when the repository
  has no develop branch, and then the trunk is `trunk.main`; a non-empty string
  instead names the develop branch, and then the trunk is that name. The
  defaults are `{ "develop": false, "main": "main" }`.
- **`taskWorkflow.git.trunkMerge`** is `local` or `handoff`, defaulting to
  `local`. `local` means the effort close merges into the trunk on your
  machine. `handoff` means it does not merge and does not delete the effort
  branch; it pushes the branch and prints the pull request for you to open.

An unknown value for any key is a **diagnostic**, not a crash. The value falls
back to its default, the diagnostics travel with the phase brief and appear in
the opener's result, and the workflow carries on with the documented behaviour.
The same holds for a profile file that is missing, not valid JSON, or shaped
wrongly: the resolver falls back to `default` and says so.

## The two bundled profiles

Two profiles ship as flat JSON files in the package, `src/profiles/default.json`
and `src/profiles/flat.json`. Each carries, per phase, an optional branch
template, optional opening and closing instructions, and an optional closing
branch gate, plus a merge flag and a push policy, and per implementation
sub-agent an optional branch template. Templates use `{effort}` and `{ticket}`.

**`default`** is the profile a repository that configures nothing gets.

| Phase or agent | Branch required |
| --- | --- |
| `implement-ticket` | `effort/{effort}` |
| `finalize-effort` | `effort/{effort}` |
| `implement-preconditions`, `tdd-worker`, `slice-verifier`, `deviation-reporter`, `land-worker` | `ticket/{ticket}` |
| `intake`, `wayfinder`, `to-spec`, `to-tickets` | none |

It carries the merge flag `--no-ff` and the push policy `always`, so the effort
close merges the effort branch into the trunk with a merge commit and pushes.
The flag is stored with its dashes, so the merge step the profile renders and
the land task the chain composes both name a flag `git merge` accepts as it
stands.

**`flat`** carries nothing anywhere: no branch requirement for any phase or
agent, no instructions, no gate, no merge flag, no push policy. Phases open on
whatever checkout they find, no spawn is blocked on a branch, and the effort
close lands nothing, because no landing step is configured. Choose it to keep
the branches and habits a repository already has, and to run the workflow in a
directory that is not a git checkout at all, where the guards can read no
branch.

There are three branch levels in a repository with a develop branch, and two
without one: the trunk, one **effort branch** per effort, and one **ticket
branch** per ticket. There is no ticket landing branch: a finished ticket's
branch is merged into the effort branch and deleted.

## What a branch step means

A phase learns its branch before it opens. `tw_phase_brief` takes a phase (or an
implementation sub-agent) and an effort, plus a ticket slug for ticket-shaped
work, and answers with the resolved branch, the step that creates it, and the
phase's instruction text. The phase performs the step and then opens; `tw_open`
reads the same resolution and refuses any other checkout. The implementation
phase asks it twice: once for itself (the effort branch), and once per ticket,
naming the worker that will run, to learn the ticket branch it creates and
checks out before dispatching the chain.

## What is refused

The guards block, they do not warn, and nothing latches: perform the step the
refusal names and retry the same call.

- **A phase the profile gives a branch refuses to open from anywhere else.**
  The refusal names the branch the checkout is on, the required branch, and the
  step that creates it. Under `default` that is the implementation phase and the
  effort close; under an operator profile it is whichever phases carry a branch,
  and under `flat` it is none of them.
- **An implementation spawn is blocked off the ticket branch.** Dispatching the
  chain, or launching one of the five implementation agents, from another
  branch fails that step before any worker starts, with a reason naming the
  branch to create and its base.
- **A checkout the session cannot read refuses the same way.** When no way to
  run git is available, or git fails, the phase does not open and a gated spawn
  is blocked, with a reason naming what could not be read, instead of passing
  with a warning. The recovery is making the read work again: the command the
  guard runs must answer the checked-out branch.
- **Raw `bash` git commands are not intercepted.** The phase gate and the spawn
  block are the enforcement points, so a hand-run `git checkout` moves the
  checkout and the next guarded call judges it like any other.

The trunk merge is the effort close's last step. `local` merges the effort
branch into the trunk with the profile's merge flag, deletes the effort branch,
and pushes the trunk when the push policy allows it. `handoff` skips the merge
and the deletion, pushes the effort branch when the policy allows it, and prints
the pull request from the effort branch into the trunk.
