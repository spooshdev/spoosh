# Angular Type Tests

Type-level tests for public API of Angular and its plugins, ensuring type safety and correct inference.

## Running Tests

```bash
pnpm test:types
```

## Writing Tests

Use tsd assertions to verify type behavior:

```typescript
import { expectType } from "tsd";

// Expect a specific type
expectType<{ name: string }>(result.data);

// @ts-expect-error: Expect a type error
result.data.invalidProperty;
```
