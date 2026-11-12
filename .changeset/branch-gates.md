---
"@y4shin/pi-task-workflow": minor
---

The phase openers refuse the wrong branch, and the closing gate closes that half
of the loop. Under the `default` profile `tw_open` refuses `implement-ticket`
unless the checkout is on `effort/{effort}`, and it refuses `finalize-effort` on
the trunk, because the effort close is the phase that lands the effort branch.
The refusal names the branch the checkout is on, the branch the profile
requires, and the step that creates it, and a retry after that step opens
normally. Nothing latches.

The closing gate is the second half. A phase the profile gates on closing
refuses to close from anywhere else, so a run that drifted off its branch after
the open (a worker's checkout, a hand-run `git checkout`) cannot release the
phase from there. Pass the effort to `tw_close` so the gate can resolve its row;
a close that names no effort refuses rather than skipping the gate. Under
`default` only `implement-ticket` carries a closing gate, the planning phases
carry none, and every phase under `flat` opens and closes wherever it finds
itself.

The effort close follows the profile's push policy rather than pushing
unconditionally, and the four bundled branch steps render from the same
resolution, so the instruction a phase reads and the refusal it meets name the
same branch.
