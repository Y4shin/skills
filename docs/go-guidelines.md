# Go coding conventions

> Language-specific coding guidelines for Go projects using this workflow.
> The `get_guidelines` and `list_guidelines` tools make this available to the
> agent when implementing or testing Go code.

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

## What not to do

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
