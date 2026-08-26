---
name: domain-modeling
description: Model a problem domain's concepts, relationships, invariants, ownership, terminology, and lifecycle states before planning behavior.
---

# /domain-modeling — Domain modeling reference

Use this model-invoked, Pi-native reference when a feature or architecture plan
needs a shared description of the domain before implementation. It is a
portable reasoning method, not an autonomous implementation pipeline and not a
replacement for `/codebase-design`, architecture exploration, or grilling.
Do not assume a particular framework, persistence technology, or application
domain.

## Modeling procedure

1. **Set the boundary.** State the capability, actors, events, and outcomes
   under discussion. Separate observed facts and source terminology from
   hypotheses. Name what is explicitly out of scope.
2. **Discover concepts.** Extract nouns and meaningful values from requirements,
   examples, existing documentation, and code. For each concept, record its
   purpose, identity (if any), important attributes, and which capability owns
   its meaning. Distinguish entities with identity from value objects and
   domain events. Do not create types merely because a noun appears once.
3. **Map relationships.** Describe associations and their direction, cardinality,
   containment, and dependency. Say whether a relationship is ownership,
   reference, membership, or a temporal/event link. Identify which side may
   create, change, or delete the relationship and what must remain true when it
   changes.
4. **Name invariants.** Write rules as testable statements using an explicit
   subject and scope: “A ___ must ___,” “At most one ___ may ___,” or “___ is
   required when ___.” Include uniqueness, cardinality, authorization,
   consistency, and ordering constraints. Mark each rule as domain-invariant,
   policy/configuration, or an assumption; identify the owner and the failure
   outcome. Never hide an invariant in an implementation detail.
5. **Model lifecycle and state.** For every concept with meaningful change,
   list states, valid transitions, triggering command/event, actor, guard
   (invariant), side effects, and terminal states. Distinguish an unavailable
   or unknown state from a valid empty state. Record whether transitions are
   reversible, idempotent, or time-dependent, and what happens on rejected
   transitions.
6. **Clarify ownership and vocabulary.** Assign an owner for each concept,
   invariant, relationship, and transition. Capture canonical terms, aliases,
   overloaded words, units, identity rules, and boundaries where a term's
   meaning changes. Prefer the domain's established language; record proposed
   renames instead of silently translating it.
7. **Resolve uncertainty.** List open questions, competing interpretations,
   evidence, and consequences. Use `ask_user_question` when a product or domain
   decision is required; do not guess. Record settled decisions and downstream
   consequences in the task's decision record, following the repository's task
   workflow conventions. Keep assumptions visibly separate from confirmed
   invariants.

## Expected modeling output

Return a concise **domain model** containing:

- **Boundary and actors:** scope, exclusions, and relevant outcomes.
- **Concept catalog:** concept kind (entity, value, event, or policy), identity,
  purpose, owner, and key attributes.
- **Relationship map:** direction, cardinality, ownership/reference semantics,
  and mutation authority.
- **Invariant catalog:** numbered, testable rules with classification, owner,
  trigger, and failure outcome.
- **Lifecycle/state table:** state, allowed transition, trigger, guard, actor,
  side effect, and terminal-state notes.
- **Terminology:** canonical terms, aliases, definitions, units, and unresolved
  naming conflicts.
- **Uncertainty and decisions:** open questions, assumptions, evidence,
  settled decisions, and consequences.

Validate the model with concrete examples and counterexamples. Check that each
invariant has an owner, each transition has guards and outcomes, each
relationship has explicit cardinality, and every concept is used by the stated
boundary. Present unresolved uncertainty rather than inventing domain rules.

## Collaboration and boundaries

The model is an input to feature planning and architecture-oriented work. A
caller may use the output when writing a task or architecture spec, but this
skill does not prescribe a code structure, implement behavior, run an
architecture survey, or replace `/wayfinder`'s planning protocol. Keep the
model application-agnostic and cite the evidence used to make domain claims.
