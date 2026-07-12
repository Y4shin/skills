# Go coding conventions

> Language-specific coding guidelines for Go projects using this workflow.
> The `get_guidelines` and `list_guidelines` tools make this available to the
> agent when implementing or testing Go code.
>
> **These are guidelines, not hard rules.** Every rule below can be broken when
> there is a strong reason. If you break one, you MUST:
>
> 1. Add a `// rule: <name> — <explanation>` comment at the point of deviation.
> 2. Include a note in the slice's implementation notes explaining why the
>    rule was broken and what trade-off was made.
>
> This ensures deviations are intentional, reviewed, and not buried in tool
> call output.

## Tooling

- **Formatter:** `gofmt` (or `go fmt`). Code must be gofmt-compliant. No exceptions.
- **Linter:** `golangci-lint` with a standard config. Run before every commit.
- **Vet:** `go vet ./...` — run as part of CI.
- **Race detector:** `go test -race ./...` — mandatory in CI. Catches data races
  that unit tests alone cannot surface.
- **Staticcheck:** Optional but recommended for deeper analysis.

## Naming

### General

- **Use short names.** Go favours brevity. `i` for loop indices, `r` for a
  `*http.Request`, `w` for a `http.ResponseWriter`. A longer name adds
  information; a shorter name does not subtract it.
- **Use MixedCaps / mixedCaps.** No underscores (with one exception:
  test helper names like `TestFoo_WithBar` are sometimes used in test files).
- **Acronyms:** Keep them uppercase: `HTTP`, `URL`, `ID`, `API`, `JSON`, `DB`.
  Not `Http`, `Url`, `Id`, `apiHelper`.

### Packages

- **Lowercase, one word.** No underscores, no mixedCaps.
- **Short and importable.** `user`, `order`, `payment` — not
  `user_management`, `UserHandler`.
- **No plural names.** Package `page`, not `pages`. Package `order`, not `orders`.
- **The package name is the identifier.** If your package is `user`, callers
  write `user.New(...)` not `user.NewUser(...)`.
- **Bad:** `package httphandler` (stutter). **Good:** `package handler`.

### Types, functions, methods

- **Exported** → PascalCase: `type User struct`, `func NewUser()`
- **Unexported** → camelCase: `func parseToken()`, `type userRepo struct`
- **Interface names:** One-method interfaces get the method name + `-er` suffix:
  `Reader`, `Writer`, `Stringer`, `Validator`. Multi-method interfaces should
  describe what they do: `StorageBackend`, `PaymentGateway`.

## Project structure

```
project-root/
├── cmd/              # Main entry points (one subdir per binary)
│   ├── server/       #   → cmd/server/main.go   (package main)
│   └── cli/          #   → cmd/cli/main.go       (package main)
├── internal/         # Private packages (not importable outside this module)
│   ├── handler/
│   ├── repository/
│   └── service/
├── pkg/              # Public packages (optional, importable by others)
├── migrations/       # Database migrations
├── docs/             # Documentation, guideline files
└── go.mod
```

- `cmd/` binaries should be thin — parse flags, wire dependencies, start the
  server. No business logic.
- Business logic lives in `internal/` or `pkg/`. Not in `cmd/`.
- Tests live next to the source file they test: `handler.go` → `handler_test.go`
  in the same package. Integration tests use `package handler_test` (external
  test package) to enforce black-box testing.

## Error handling

### Return errors, don't panic

- Panic is for truly unrecoverable states: programmer bugs, failed assertions
  that should never happen. Not for validation errors, not for I/O failures.
- Return `error` from functions that can fail. Let the caller decide.

### Error wrapping

- Wrap errors with context when adding information:

  ```go
  if err := doSomething(); err != nil {
      return fmt.Errorf("do something with %q: %w", input, err)
  }
  ```

- Use `%w` (not `%v`) when the caller needs `errors.Is()` or `errors.As()` to
  inspect the error chain. Use `%v` when the error is terminal and only the
  message matters.
- Prefer `errors.New("message")` over `fmt.Errorf("message")` for simple,
  parameterless sentinel errors.

### Sentinel errors

- Declare as `var ErrNotFound = errors.New("user not found")`.
- Sentinels should start with `Err` (unexported) or `Err` + name (exported).
- Callers check with `errors.Is(err, ErrNotFound)`, never `==`.

### Error types

- Use custom error types when callers need to extract structured data:

  ```go
  type ValidationError struct {
      Field string
      Err   error
  }
  func (e *ValidationError) Error() string { return fmt.Sprintf("%s: %v", e.Field, e.Err) }
  func (e *ValidationError) Unwrap() error { return e.Err }
  ```

- Check with `errors.As(err, &valErr)`.

### Indent the happy path

- Return early on error. Keep the success path unindented.

  ```go
  // Good
  user, err := repo.Find(id)
  if err != nil {
      return nil, fmt.Errorf("find user: %w", err)
  }
  return user, nil

  // Bad — success path deeply nested
  user, err := repo.Find(id)
  if err == nil {
      return user, nil
  }
  return nil, fmt.Errorf("find user: %w", err)
  ```

## Negative space programming

Go does not have a built-in `assert` statement. The idiomatic way to enforce
preconditions, postconditions, and invariants is through **guard clauses** that
return errors, complemented by **type-level enforcement** that makes illegal
states unrepresentable at compile time.

The goal (inspired by ThePrimeagen, TigerBeetle's TigerStyle, and NASA's
Rule #5 — "use a minimum of two runtime assertions per function") is to
**constrain the space of possible program states**, cutting off invalid paths
so only correct ones remain.

### Preconditions (guard clauses)

Check every assumption about inputs at the top of the function. Fail fast and
early. Do not let invalid data propagate.

```go
// Good — preconditions documented and enforced at the boundary
func CreateUser(ctx context.Context, name string, age int) (*User, error) {
    if name == "" {
        return nil, errors.New("name must not be empty")
    }
    if age < 0 || age > 150 {
        return nil, fmt.Errorf("age %d out of range [0, 150]", age)
    }
    // … body is safe from here on
}
```

Think of each guard clause as a **Hoare triple**:
> Given `{name != "" && age in [0,150]}`, When `CreateUser`, Then `{user != nil || err != nil}`

### Postconditions (result validation)

After computation, verify that the result satisfies the contract before
returning it. This catches invariant violations close to their source.

```go
func Divide(a, b int) (int, error) {
    if b == 0 {
        return 0, errors.New("division by zero")
    }
    result := a / b
    // Postcondition: a == result * b + remainder
    // (trivially true for integer division, but illustrates the pattern)
    if result*b > a {
        return 0, fmt.Errorf("internal: division invariant violated: %d / %d", a, b)
    }
    return result, nil
}
```

Postconditions are especially useful when:

- Working with caches (did the value get stored?)
- Database writes (did the row count match expectations?)
- Complex transforms (does the output structure hold?)

### Invariants (must-never-happen checks)

For conditions that should be **impossible** — programmer bugs, not runtime
inputs — panic with a message that explains what went wrong. This is the
closest Go has to a traditional `assert`.

```go
func (s *Server) handleRequest(req *Request) {
    if req == nil {
        panic("handleRequest: req is nil — programmer bug")
    }
    if s.db == nil {
        panic("handleRequest: server has no db — forgot Init()?")
    }
    // …
}
```

Panic for invariants only when:

1. The condition represents a **programmer mistake**, not user input.
2. Continuing would produce silent corruption or data loss.
3. Recovery is impossible at this level (let the caller `recover` if it can).

### Exhaustive switches (compile-time negative space)

Use exhaustive `switch` statements to make the compiler enforce that every
possible case is handled. This moves negative space from runtime to compile
time.

```go
type Status string

const (
    StatusPending   Status = "pending"
    StatusActive    Status = "active"
    StatusSuspended Status = "suspended"
)

func (s Status) IsValid() bool {
    switch s {
    case StatusPending, StatusActive, StatusSuspended:
        return true
    default:
        return false
    }
}

// For enums that must NEVER see an unknown value:
func (s Status) assertValid() {
    switch s {
    case StatusPending, StatusActive, StatusSuspended:
        // ok
    default:
        panic(fmt.Sprintf("Status.assertValid: unknown value %q", s))
    }
}
```

### Type-level enforcement ("Parse, don't validate")

Push the boundary from runtime checks to compile-time types. Make illegal
states unrepresentable.

```go
// Bad — every function must check sign
func CalculateArea(width, height int) (int, error) {
    if width <= 0 || height <= 0 { /* … */ }
}

// Better — type encodes the invariant
type PositiveInt struct {
    val int
}

func NewPositiveInt(n int) (PositiveInt, error) {
    if n <= 0 {
        return PositiveInt{}, fmt.Errorf("%d is not positive", n)
    }
    return PositiveInt{val: n}, nil
}

func (p PositiveInt) Value() int { return p.val }

// Now the function signature documents the constraint
func CalculateArea(width, height PositiveInt) int {
    return width.Value() * height.Value()
}
```

Apply "Parse, don't validate" at module boundaries (HTTP handlers, CLI flags,
message deserialisation). Once a value is parsed into your typed domain, the
compiler enforces correctness — no more runtime checks needed downstream.

### Testing the negative space

Your tests should explicitly verify:

1. **Precondition violations** — call the function with invalid inputs and
   assert that the expected error is returned, not a panic, not nil.
2. **Postcondition violations** — if your code has invariants, write a test
   that would trigger the invariant check and verify the error.
3. **Boundaries** — values just below, at, and just above each threshold
   (e.g. `-1`, `0`, `1` for a positive-only parameter).
4. **Missing values** — nil, empty string, zero-value struct, nil map/slice.

```go
func TestCreateUser_Preconditions(t *testing.T) {
    tests := []struct {
        name string
        age  int
        want string // substring of expected error message
    }{
        {name: "",  age: 30, want: "name must not be empty"},
        {name: "a", age: -1, want: "out of range"},
        {name: "a", age: 151, want: "out of range"},
    }

    for _, tt := range tests {
        t.Run(tt.name+"/"+strconv.Itoa(tt.age), func(t *testing.T) {
            _, err := CreateUser(context.Background(), tt.name, tt.age)
            if err == nil {
                t.Fatal("expected error, got nil")
            }
            if !strings.Contains(err.Error(), tt.want) {
                t.Errorf("error = %q, want substring %q", err.Error(), tt.want)
            }
        })
    }
}
```

### Summary of Go's negative space toolkit

| What | Go mechanism | When to use |
| --- | --- | --- |
| Input validation | Guard clause returning `error` | Every public function with untrusted inputs |
| Invariant enforcement | `panic` with descriptive message | Programmer bugs, impossible states |
| Exhaustiveness | `switch` with `default: panic()` | Enums, sealed unions, closed sets |
| Type enforcement | Wrapper types with constructors | Domain primitives (IDs, emails, positive ints) |
| Result guarantees | Postcondition check before return | Caches, DB writes, complex transforms |
| Test negative paths | Table-driven error tables | Every function with preconditions |

## Testing

### Table-driven tests

Default pattern for any function tested against multiple inputs:

```go
func TestValidateEmail(t *testing.T) {
    tests := []struct {
        name  string
        email string
        want  bool
    }{
        {name: "valid",         email: "alice@example.com", want: true},
        {name: "missing @",     email: "aliceexample.com",  want: false},
        {name: "empty string",  email: "",                  want: false},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got := ValidateEmail(tt.email)
            if got != tt.want {
                t.Errorf("ValidateEmail(%q) = %v, want %v", tt.email, got, tt.want)
            }
        })
    }
}
```

- Each row is one `t.Run` subtest.
- Failure messages identify the function, the input, and the expected output
  (see "got vs want" below).

### Error cases: separate table

When a function has both success and error paths, write two table-driven test
functions — one for success cases, one for error cases. Mixing conditional
logic inside a single table makes tests harder to read.

```go
func TestParseToken_Success(t *testing.T) { /* table of valid tokens */ }
func TestParseToken_Error(t *testing.T)   { /* table of malformed tokens */ }
```

### "got before want" format

Failure messages should put the actual value first:

```go
t.Errorf("DoSomething(%v) = %v, want %v", input, got, want)
```

Always name the function under test in the failure message.

### Use `t.Error`, not `t.Fatal` (unless setup fails)

- `t.Error` records a failure and continues — you see all failures in one run.
- `t.Fatal` stops the current test/subtest. Use only for setup failures where
  the test cannot continue (e.g. database connection, testdata read failure).
- Inside a `t.Run` subtest, `t.Fatal` is safe — it only stops that subtest.

### Mark test helpers with `t.Helper()`

```go
func assertResponse(t *testing.T, w *httptest.ResponseRecorder, wantCode int, wantBody string) {
    t.Helper()
    if w.Code != wantCode {
        t.Errorf("status: got %d, want %d", w.Code, wantCode)
    }
}
```

Without `t.Helper()`, failure lines point _inside_ the helper, not the test
that called it.

### Compare full structures, not field-by-field

```go
want := User{Name: "Alice", Email: "alice@example.com"}
if diff := cmp.Diff(want, got); diff != "" {
    t.Errorf("CreateUser() mismatch (-want +got):\n%s", diff)
}
```

- Use [`github.com/google/go-cmp/cmp`](https://pkg.go.dev/github.com/google/go-cmp/cmp)
  (maintained by the Go team). Prefer it over `reflect.DeepEqual`.
- `cmp.Diff` prints a readable diff. Always label the direction in your
  message: `"mismatch (-want +got):\n%s"`.
- Use `cmpopts` to ignore unstable fields: `cmpopts.IgnoreFields(User{}, "ID", "CreatedAt")`.
- Use `cmpopts.SortSlices` when order is non-deterministic.

### No assert libraries

Do not import external assertion libraries (`testify/assert`, `testify/require`,
etc.). Go's `testing` package combined with `cmp.Diff` is sufficient. Assert
libraries create a mini-language inside Go, stop tests early, and obscure what
went right. Write explicit checks in Go.

### HTTP handler testing

Use `httptest.NewRecorder()` for handler unit tests:

```go
func TestGetUserHandler(t *testing.T) {
    w := httptest.NewRecorder()
    r := httptest.NewRequest("GET", "/users/1", nil)
    GetUserHandler(w, r)

    if w.Code != http.StatusOK {
        t.Errorf("status = %d, want %d", w.Code, http.StatusOK)
    }
}
```

Use `httptest.NewServer()` when testing server behaviour (shutdown, timeouts,
middleware stacks).

### Interface-based mocking

- Define interfaces at the consumer boundary (the package that _uses_ the
  dependency), not the producer.
- Inject mocks through constructors: `NewService(gateway PaymentGateway)`.
- Write mock implementations as simple structs with function fields:

  ```go
  type mockGateway struct {
      chargeFunc func(ctx context.Context, cents int) error
  }
  func (m *mockGateway) Charge(ctx context.Context, cents int) error {
      return m.chargeFunc(ctx, cents)
  }
  ```

- No mock frameworks, no code generation for simple cases.

### Race detection

Always run `go test -race ./...` in CI. The race detector instruments all
memory accesses and catches concurrent reads/writes to the same variable
without synchronisation.

### Goroutine leak detection

Use `go.uber.org/goleak` in packages that spawn goroutines:

```go
func TestMain(m *testing.M) {
    goleak.VerifyTestMain(m)
}
```

### Build tags for integration tests

Guard integration tests (database, external services) with a build tag:

```go
//go:build integration
package repository_test
```

Run unit tests with `go test ./...`, integration tests with
`go test -tags=integration ./...`.

### Fuzz tests for parsers and validators

```go
func FuzzValidateEmail(f *testing.F) {
    f.Add("alice@example.com")
    f.Fuzz(func(t *testing.T, email string) {
        // Property: if valid, it must contain '@'
        if ValidateEmail(email) && !strings.Contains(email, "@") {
            t.Errorf("ValidateEmail(%q) = true but no @", email)
        }
    })
}
```

Run with `go test -fuzz=FuzzValidateEmail ./...`.

## Concurrency

- **Use `sync` or channels, not shared memory.** Don't communicate by sharing
  memory; share memory by communicating.
- **Own the goroutine lifecycle.** Every goroutine you spawn must have a
  known exit path. Use `context.Context` for cancellation. Leaked goroutines
  are production outages waiting to happen.
- **Prefer `errgroup`** for a bounded set of goroutines that all run or fail
  together: `golang.org/x/sync/errgroup`.
- **Mutex or channel?** Use mutex for protecting a single piece of state.
  Use channels for passing data between goroutines.
- **`sync.Map` is rarely the answer.** Start with `sync.RWMutex` + a plain
  `map`. Only use `sync.Map` after profiling shows contention.
- **Always `defer mu.Unlock()`** right after `mu.Lock()`. Never unlock
  manually later.

## Code style preferences

- **Prefer clarity over cleverness.** Go code is read more often than it is
  written. Direct control flow, obvious names, simple data models.
- **Zero-value initialisation.** Prefer `var user User` over `user := User{}`.
  Use `user := &User{}` when you need a pointer to a zero-value struct, or
  `new(User)`.
- **Composite literals with field names** for structs with more than 2 fields:

  ```go
  u := User{Name: "Alice", Email: "alice@example.com"}
  // Not: User{"Alice", "alice@example.com"}
  ```

- **Avoid named results in short functions** (they obscure the signature in
  longer functions, named results are okay — but avoid naked returns).
- **Prefer `range` over C-style `for`.** Go has no `while`; use `for condition {}`.
- **Keep files small.** One file, one responsibility. ~200–500 lines is a
  warning threshold.
- **Keep packages small.** A package that needs more than 5–6 source files is
  probably doing too much. Split it.

## NASA Power of 10 (Go edition)

Adapted from JPL's "The Power of 10: Rules for Developing Safety-Critical Code"
(Gerard J. Holzmann). These rules are designed for high-reliability systems,
and several apply naturally to production Go code.

### Rule 1 — Simple control flow

Avoid `goto`. Prefer iteration over recursion. If you must recurse, document
the maximum depth and guard against stack overflow.

```go
// Good — iterative
func walkDir(root string) ([]string, error) {
    var files []string
    err := filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
        if err != nil {
            return err
        }
        if !d.IsDir() {
            files = append(files, path)
        }
        return nil
    })
    return files, err
}

// Avoid deep recursion without a bound
```

### Rule 2 — Loops must have a bound (with channel exception)

Every loop should have a determinable upper bound. Guard potentially unbounded
loops (retry loops, watchers) with a max count or context deadline.

**Exception: channel consumption.** Receiving from a channel is inherently
unbounded — you don't know how many messages will arrive. This is acceptable
as long as the channel consumer is bounded by one of:

- The channel being closed (`for msg := range ch`)
- Context cancellation
- A sentinel / termination message

```go
// Good — channel consumption bounded by context + close
for {
    select {
    case msg, ok := <-ch:
        if !ok {
            return nil  // channel closed
        }
        process(msg)
    case <-ctx.Done():
        return ctx.Err()  // bounded by context
    }
}

// Good — bounded retry
const maxRetries = 3
for i := 0; i < maxRetries; i++ {
    err := tryOperation(ctx)
    if err == nil {
        return nil
    }
}
```

### Rule 4 — Function length ≤ 100 lines

If a function doesn't fit on one or two screens, it's doing too much.
Extract helpers and smaller functions. Table-driven tests are exempt from
this rule (their length is data, not logic).

The 100-line threshold accounts for Go's explicitness (explicit error
handling, type declarations, etc.). Functions under 60 lines are still
preferred where possible.

### Rule 5 — At least two guard clauses per function

Every function that accepts external input must have at least two precondition
checks. See the [Negative space programming](#negative-space-programming)
section above for the full treatment.

```go
func UpdateUser(ctx context.Context, id string, req *UpdateRequest) (*User, error) {
    if id == "" {                          // guard 1
        return nil, errors.New("id required")
    }
    if req == nil {                         // guard 2
        return nil, errors.New("request body required")
    }
    // … body safe from here
}
```

### Rule 6 — Minimum scope

Declare variables as close to their use as possible. Prefer block-scoped
(`{}`) declarations over function-scoped. This reduces the window for
accidental misuse.

```go
// Good — scoped close to use
if err := process(data); err != nil {
    return err
}

// Good — minimal scope for intermediate result
{
    stats := computeStats(items)
    if stats.P99 > threshold {
        log.Warn().Float64("p99", stats.P99).Msg("latency spike")
    }
}
// stats is not accessible here
```

### Rule 7 — Check every return value

An unchecked error in Go will silently produce a zero-value — no crash, no
log line, just wrong behaviour. Every non-void function call whose result is
not explicitly discarded must be checked.

```go
// Good
if err := db.Save(&user).Error; err != nil {
    return fmt.Errorf("save user: %w", err)
}

// Acceptable when intentionally discarding
_, _ = io.Copy(ioutil.Discard, resp.Body)  // explicit discard
resp.Body.Close()                           // but this one should be checked
```

Use `//nolint:errcheck` sparingly and only with a justification comment.

### Rule 8 — Zero warnings, static analysis

Compile with all vet checks, run `golangci-lint`, and treat every warning as
an error.

```bash
go vet ./...
golangci-lint run ./...
```

Maintain a static-analysis baseline. New warnings on existing code are
blockers, not noise.

### Rules intentionally omitted

| Rule | Reason not applicable to Go |
| --- | --- |
| **3** — No dynamic memory after init | Go is garbage-collected; slices, maps, and goroutine stacks allocate dynamically. This rule is for bare-metal / embedded C. |
| **8** — No preprocessor | Code generation (`go generate`, `stringer`, `mockgen`) is encouraged — it's not a preprocessor, it's compile-time code generation. |
| **9** — Restrict pointers, no function pointers | Go IS pointers, and function values / interface dispatch are the language's primary abstraction mechanism. |

## Design: low coupling, high cohesion

### Define interfaces at the consumer

**The pattern:** the package that _needs_ a behaviour defines the interface.
The package that _provides_ the behaviour never imports the consumer — it
just happens to satisfy the interface.

**Why this matters:** if the producer owns the interface, every consumer must
import the producer. That creates a dependency graph that radiates out from
each library and makes it impossible to swap implementations without changing
imports.

**Common mistake (producer-owned interface):**

```go
// package stripe
type StripeClient struct{}
func (s *StripeClient) Charge(amount int) error { /* … */ }

// package order — forced to import stripe
type OrderService struct {
    gateway *stripe.StripeClient  // coupled to concrete type
}
```

Problem: `order` cannot exist without `stripe`. Tests must import `stripe`.
Switching to Adyen means changing `order`.

**Go way (consumer-owned interface):**

```go
// package order — consumer defines what it needs
type PaymentCharger interface {
    Charge(ctx context.Context, cents int) error
}

type Service struct {
    charger PaymentCharger  // depends only on 3 words
}

func NewService(charger PaymentCharger) *Service {
    return &Service{charger: charger}
}

// package stripe — no imports from order, just happens to match
func (c *Client) Charge(ctx context.Context, cents int) error { /* … */ }

// package adyen — also matches, also no imports from order
func (c *Client) Charge(ctx context.Context, cents int) error { /* … */ }
```

Now `order` imports nothing but its own types. Tests inject a one-line mock.
Swapping stripe → adyen → mock is a one-line change in `main()`.

### Constructor injection

Wire dependencies through constructors where practical. This makes coupling
**visible** — every dependency is in the signature. You cannot accidentally
create a service without its database.

```go
// Preferred — explicit dependencies
func NewService(
    db *sql.DB,
    gateway PaymentGateway,
    logger *slog.Logger,
) *Service {
    return &Service{db: db, gateway: gateway, logger: logger}
}

// Tolerable when pragmatically necessary
func NewService(db *sql.DB, gateway PaymentGateway) *Service {
    logger := slog.Default()  // acceptable default
    return &Service{db: db, gateway: gateway, logger: logger}
}

// Avoid where possible — hidden coupling
func NewService() *Service {
    return &Service{
        db:      openGlobalDB(),    // hidden coupling
        gateway: getGlobalStripe(),  // hidden coupling
    }
}
```

**`init()` is not forbidden.** It is occasionally necessary for:

- Registering database drivers (`database/sql`)
- Registering crypto algorithms
- Compile-time lookups (templates, embed.FS)

Just avoid using `init()` for wiring business dependencies. That belongs in
`main()` or a composition helper.

### Strategy pattern

When a function or type has a behaviour that varies, extract it into an
interface and inject different strategies.

```go
type Pricer interface {
    Price(ctx context.Context, items []LineItem) (cents int, err error)
}

// Strategies
type FlatRatePricer struct{ Rate int }
func (p *FlatRatePricer) Price(_ context.Context, items []LineItem) (int, error) {
    return p.Rate * len(items), nil
}

type ItemBasedPricer struct{ /* catalogue */ }
func (p *ItemBasedPricer) Price(ctx context.Context, items []LineItem) (int, error) {
    total := 0
    for _, item := range items {
        total += item.CentsEach
    }
    return total, nil
}

// Inject strategy at construction
type OrderService struct {
    pricer  Pricer
    gateway PaymentGateway
}

func NewOrderService(pricer Pricer, gateway PaymentGateway) *OrderService {
    return &OrderService{pricer: pricer, gateway: gateway}
}
```

The strategy pattern gives you:

- **Open/closed principle** — add new pricers without touching existing code.
- **Testability** — inject a `Pricer` that returns known values.
- **Zero coupling to concrete implementations** — the service only knows
  `Pricer` (three words, one method).

### Wire at the top

Prefer to wire most dependencies in `main()` (or a dedicated `wire.go`).
Packages should not know about each other's concrete types except through
interfaces.

```go
func main() {
    db := openDB(cfg)
    pricer := &pricing.FlatRatePricer{Rate: cfg.FlatRate}
    gateway := stripe.NewClient(cfg.StripeKey)
    svc := order.NewService(pricer, gateway)

    handler := handler.NewOrderHandler(svc)

    log.Info("listening", "addr", srv.Listener.Addr())
}
```

Composition helpers are fine — extracting wiring into `newServer(cfg) *Server`
keeps `main()` concise while preserving the single composition point. The
key constraint: **no package outside `main()` should call another package's
constructor with concrete application types.**

### Summary of coupling & cohesion rules

| Principle | Go mechanism | Benefit |
| --- | --- | --- |
| Define interfaces at consumer | Interface in the importing package | No import cycles, swappable implementations |
| Constructor injection | `NewX(dep1, dep2, …) *X` | Visible coupling, cannot create invalid instances |
| Strategy pattern | Interface + multiple implementations | OCP, testability, zero coupling to concrete types |
| Composition root | Wiring in `main()` or helpers | Single place to change, packages stay decoupled |
| High cohesion | One clear responsibility per type | Understandable, testable, replaceable |

- Don't use `panic` for regular error handling.
- Don't use `init()` unless you absolutely must (e.g. `crypto` package
  registration). Dependencies should be wired explicitly in `main()`.
- Don't use `_` imports (side-effect imports) except for `database/sql`
  drivers, `image` formats, and `testing` main helpers.
- Don't export functions or types just because you might need them later.
  Export only what consumers actually call.
- Don't use `context.Background()` in library code — accept a `ctx` parameter
  from the caller.
- Don't use `interface{}` in new code — use `any`.
- Don't write getters and setters for struct fields unless they need logic.
  Direct field access is idiomatic Go.
