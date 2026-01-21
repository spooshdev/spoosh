# @spoosh/plugin-qs

Query string serialization plugin for Spoosh with nested object support.

**[Documentation](https://spoosh.dev/docs/plugins/qs)** · **Requirements:** TypeScript >= 5.0 · **Peer Dependencies:** `@spoosh/core`

## Installation

```bash
npm install @spoosh/plugin-qs
```

## Usage

```typescript
import { Spoosh } from "@spoosh/core";
import { qsPlugin } from "@spoosh/plugin-qs";

const client = new Spoosh<ApiSchema, Error>("/api").use([
  qsPlugin({ arrayFormat: "brackets" }),
]);

const query = {
  pagination: { limit: 10, offset: 0 },
  filters: { status: "active", tags: ["a", "b"] },
};

useRead((api) => api.items.$get({ query }));
// Result: pagination[limit]=10&pagination[offset]=0&filters[status]=active&filters[tags][]=a&filters[tags][]=b
```

## Features

- ✅ Nested object serialization with bracket notation
- ✅ Multiple array formats (brackets, indices, repeat, comma)
- ✅ Dot notation support for nested objects
- ✅ Automatic null value skipping
- ✅ Per-request configuration override
- ✅ Powered by battle-tested `qs` package

## Plugin Config

| Option        | Type                                             | Default      | Description                          |
| ------------- | ------------------------------------------------ | ------------ | ------------------------------------ |
| `arrayFormat` | `"brackets" \| "indices" \| "repeat" \| "comma"` | `"brackets"` | How to serialize arrays              |
| `allowDots`   | `boolean`                                        | `false`      | Use dot notation instead of brackets |
| `skipNulls`   | `boolean`                                        | `true`       | Skip null values in serialization    |
| `options`     | `IStringifyOptions`                              | `{}`         | Additional qs stringify options      |

## Per-Request Options

Override plugin defaults for specific requests:

```typescript
// Use comma-separated arrays for this request
useRead((api) => api.items.$get({ query }), { arrayFormat: "comma" });

// Use dot notation for nested objects
useRead((api) => api.search.$get({ query }), { allowDots: true });

// Include null values for this request
useRead((api) => api.data.$get({ query }), { skipNulls: false });
```

## Array Formats

### brackets (default)

```typescript
{
  tags: ["a", "b"];
}
// tags[]=a&tags[]=b
```

### indices

```typescript
{
  tags: ["a", "b"];
}
// tags[0]=a&tags[1]=b
```

### repeat

```typescript
{
  tags: ["a", "b"];
}
// tags=a&tags=b
```

### comma

```typescript
{
  tags: ["a", "b"];
}
// tags=a,b
```

## Dot Notation

```typescript
// allowDots: false (default)
{
  filters: {
    status: "active";
  }
}
// filters[status]=active

// allowDots: true
{
  filters: {
    status: "active";
  }
}
// filters.status=active
```
