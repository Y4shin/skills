# Smell baseline

Twelve Fowler code smells from _Refactoring_, chapter 3. The Standards axis of `/code-review` carries this list as a floor when the repo documents no overriding standard. Each smell is a labelled heuristic, "possible Feature Envy", never a hard violation.

## Mysterious Name

**What it is:** a function, variable, type, or module whose name does not reveal what it does or holds.

**How to fix:** rename it so the intent is honest and obvious. If no honest name comes to mind, the underlying design is probably still murky, clarify the responsibility first.

## Duplicated Code

**What it is:** the same logical shape appears in more than one hunk or file in the change.

**How to fix:** extract the shared shape into a single place and call it from both sites.

## Feature Envy

**What it is:** a function or method reaches into another object's data more than it uses its own.

**How to fix:** move the behaviour onto the object whose data it envies.

## Data Clumps

**What it is:** the same few fields or parameters keep travelling together, as if they want to become one type.

**How to fix:** bundle them into a single small type and pass that around instead of the loose fields.

## Primitive Obsession

**What it is:** a primitive or string is used to represent a domain concept that deserves its own type.

**How to fix:** give the concept its own small value type or enum so the domain meaning is explicit.

## Repeated Switches

**What it is:** the same `switch` or `if`-cascade on the same type recurs across the change.

**How to fix:** replace the repeated dispatch with polymorphism, or with one shared map/table both sites use.

## Shotgun Surgery

**What it is:** one logical change forces scattered edits across many files in the diff.

**How to fix:** gather the pieces that change together into one module so the next change has a single home.

## Divergent Change

**What it is:** one file or module is edited for several unrelated reasons.

**How to fix:** split responsibilities so each module changes for only one reason.

## Speculative Generality

**What it is:** abstractions, parameters, or hooks are added for needs the spec does not have.

**How to fix:** delete the unused generality and inline back to the concrete case. Reintroduce abstraction only when a real need appears.

## Message Chains

**What it is:** a caller walks a long chain such as `a.b().c().d()`, coupling itself to the intermediate structure.

**How to fix:** hide the walk behind a single method on the object the caller already knows.

## Middle Man

**What it is:** a class or function that mostly just delegates onward without adding value.

**How to fix:** remove the middleman and call the real target directly.

## Refused Bequest

**What it is:** a subclass or implementer ignores or overrides most of what it inherits.

**How to fix:** drop the inheritance and use composition instead.
