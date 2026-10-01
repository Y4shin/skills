---
"task-workflow": patch
---

Migration fix: the schema 3 to 4 migration collapsed every ticket of a live `maps/<map>/tickets/<slug>/` subtree onto one `tickets/null/ticket.md` destination (a downstream repo lost 11 of 12 tickets, recovered from git). Map-subtree slugs are now derived from the directory after the `tickets/`/`tasks/` container (live and archived map subtrees alike), a slugless task or ticket is reported as a `no-slug` needs-human item and left in place instead of interpolated, and every staging site claims its destination first so a second source becomes a `destination-collision` needs-human item rather than a silent overwrite. Red-first regressions cover the two-ticket fixture, aux anchoring, the archived-map subtree, the slugless ticket, the deliberate two-source collision, and re-run idempotence.
