# When to Mock

Mock only at **system boundaries**. Everything else should use the real code.

## Mock at system boundaries

- External APIs (payment gateways, email providers, third-party services).
- Databases — sometimes; prefer a real test database when it is cheap to spin up.
- Time, randomness, UUID generation, and other non-deterministic dependencies.
- The filesystem — sometimes, when the real filesystem is slow or unreliable in tests.

## Do not mock

- Your own modules or classes.
- Internal collaborators you control.
- Anything whose implementation is a private detail of the code under test.

Mocking your own code hides real integration failures and produces tests that are brittle to internal renames.

## Designing for mockability

At system boundaries, prefer interfaces that are easy to substitute in tests.

### 1. Use dependency injection

Pass external dependencies in rather than constructing them inside the function.

```typescript
// Easy to mock
type PaymentClient = { charge: (amount: number) => Promise<ChargeResult> };

async function processPayment(order: Order, paymentClient: PaymentClient) {
  return paymentClient.charge(order.total);
}

// Hard to mock — creates its own dependency
async function processPayment(order: Order) {
  const client = new StripeClient(process.env.STRIPE_KEY);
  return client.charge(order.total);
}
```

### 2. Prefer SDK-style interfaces over generic fetchers

Create a specific function for each external operation instead of one generic fetcher with conditional paths.

```typescript
// GOOD: each function is independently mockable
const api = {
  getUser: (id: string) => fetch(`/users/${id}`),
  getOrders: (userId: string) => fetch(`/users/${userId}/orders`),
  createOrder: (data: OrderData) => fetch("/orders", { method: "POST", body: JSON.stringify(data) }),
};

// BAD: mocking requires conditional logic inside the mock
const api = {
  fetch: (endpoint: string, options?: RequestInit) => fetch(endpoint, options),
};
```

The SDK style means:

- Each mock returns one specific shape.
- No conditional routing logic inside test setup.
- It is obvious which endpoints a test exercises.
- Each boundary function can have its own type contract.
