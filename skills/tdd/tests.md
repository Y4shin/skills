# Good and Bad Tests

Examples in TypeScript, flavored for this repo's toolchain.

## Good tests

### Integration-style

Test through real public interfaces, not mocks of internal parts.

```typescript
test("user can checkout with a valid cart", async () => {
  const cart = createCart();
  cart.add(product);
  const result = await checkout(cart, paymentMethod);
  expect(result.status).toBe("confirmed");
});
```

Characteristics:

- Tests behavior users and callers care about.
- Uses the public API only.
- Survives internal refactors.
- Describes **what**, not **how**.
- One logical assertion per test.

## Bad tests

### Implementation-coupled

Tests internal structure instead of observable behavior.

```typescript
// BAD: coupled to an internal collaborator
jest.mock("../services/paymentService");

test("checkout charges the cart total", async () => {
  await checkout(cart, paymentMethod);
  expect(paymentService.process).toHaveBeenCalledWith(cart.total);
});
```

Red flags:

- Mocks internal collaborators or private methods.
- Asserts on call counts, order, or internal messages.
- Verifies through an external side channel instead of the interface.
- The test name describes **how** the code works, not **what** it does.
- The test breaks during a pure refactor even though behavior is unchanged.

### Bypassing the interface

```typescript
// BAD: queries the database directly
const row = await db.query("SELECT * FROM users WHERE name = ?", ["Alice"]);
expect(row).toBeDefined();

// GOOD: verifies through the public interface
const retrieved = await getUser(user.id);
expect(retrieved.name).toBe("Alice");
```

### Tautological

The expected value is derived the same way the implementation computes it.

```typescript
// BAD: expected value recomputed by the same logic as the code under test
test("calculateTotal sums line items", () => {
  const items = [{ price: 10 }, { price: 5 }];
  const expected = items.reduce((sum, i) => sum + i.price, 0);
  expect(calculateTotal(items)).toBe(expected);
});

// GOOD: expected value is an independent known-good literal
test("calculateTotal sums line items", () => {
  expect(calculateTotal([{ price: 10 }, { price: 5 }])).toBe(15);
});
```
