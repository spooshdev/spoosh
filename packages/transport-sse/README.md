# @spoosh/transport-sse

Server-Sent Events (SSE) transport for Spoosh with connection pooling, automatic reconnection, and typed event streaming.

**[Documentation](https://spoosh.dev/docs/transports/sse)** · **Requirements:** TypeScript >= 5.0 · **Peer Dependencies:** `@spoosh/core`

## Installation

```bash
npm install @spoosh/transport-sse
```

## Usage

### Setup

```typescript
import { Spoosh } from "@spoosh/core";
import { create } from "@spoosh/react";
import { sse } from "@spoosh/transport-sse";

const spoosh = new Spoosh<ApiSchema, Error>("/api").withTransports([sse()]);

export const { useSSE } = create(spoosh);
```

### Schema Definition

Define your SSE endpoints with the `events` field:

```typescript
type ApiSchema = {
  "notifications": {
    GET: {
      query: { userId: string };
      events: {
        message: { data: { id: string; text: string } };
        alert: { data: { id: string; priority: "low" | "high"; message: string } };
      };
    };
  };
  "chat": {
    POST: {
      body: { conversationId: string; message: string };
      events: {
        chunk: { data: { chunk: string } };
        done: { data: { finished: boolean } };
      };
    };
  };
};
```

> **Note:** `message` is the default SSE event type. If your server sends data without an `event:` field, it will be received as `message`.

### Basic Usage

```typescript
function Notifications() {
  const { data, isConnected, loading } = useSSE(
    (api) => api("notifications").GET({ query: { userId: "user-123" } })
  );

  if (loading) return <div>Connecting...</div>;

  return (
    <div>
      <span>{isConnected ? "Connected" : "Disconnected"}</span>
      {data?.message && <p>{data.message.text}</p>}
      {data?.alert && <p>Alert: {data.alert.message}</p>}
    </div>
  );
}
```

### Subscribing to Specific Events

```typescript
const { data } = useSSE(
  (api) => api("notifications").GET({ query: { userId: "user-123" } }),
  { events: ["alert"] }  // Only subscribe to alert events
);

// data.alert is typed, data.message is not included
```

### AI Streaming (ChatGPT-style)

```typescript
const { data, trigger, isConnected, reset } = useSSE(
  (api) => api("chat").POST(),
  {
    events: ["chunk", "done"],
    parse: "json-done",  // Handles [DONE] signal
    accumulate: {
      chunk: (prev, curr) => ({
        ...curr,
        chunk: (prev?.chunk || "") + curr.chunk,
      }),
    },
    enabled: false,
  }
);

// Start streaming
const handleSend = (userInput: string) => {
  reset(); // Clear previous response
  trigger({ body: { conversationId: "conv-1", message: userInput } });
};

// Display accumulated response
return <div>{data?.chunk?.chunk}</div>;
```

## Parse Strategies

Control how raw SSE data is parsed:

| Strategy    | Description                                                |
| ----------- | ---------------------------------------------------------- |
| `"auto"`    | Auto-detect: JSON → number → boolean → string (default)    |
| `"json-done"` | Parse JSON, return `undefined` for `[DONE]` signal. Ideal for AI APIs |
| `"json"`    | Strict JSON parsing                                        |
| `"text"`    | Return raw string                                          |
| `"number"`  | Parse as number                                            |
| `"boolean"` | Parse as boolean                                           |

```typescript
// Global parse strategy
useSSE((api) => api("stream").GET(), { parse: "json" })

// Per-event parse strategy
useSSE((api) => api("stream").GET(), {
  parse: {
    chunk: "text",
    metadata: "json",
  }
})

// Custom parse function
useSSE((api) => api("stream").GET(), {
  parse: (data) => customParser(data)
})
```

## Accumulate Strategies

Control how events are combined over time:

| Strategy    | Description                      |
| ----------- | -------------------------------- |
| `"replace"` | Replace previous value (default) |
| `"merge"`   | Smart merge based on type        |

### Merge Behavior

The `"merge"` strategy automatically handles different types:

| prev     | next     | result        |
| -------- | -------- | ------------- |
| `string` | `string` | concat        |
| `number` | `number` | replace       |
| `string` | `number` | replace       |
| `number` | `string` | replace       |
| `object` | `object` | shallow merge |
| `array`  | `array`  | concat        |
| `object` | `array`  | replace       |
| `array`  | `object` | replace       |

```typescript
// Global accumulate strategy
useSSE((api) => api("stream").GET(), { accumulate: "merge" })

// Per-event accumulate strategy
useSSE((api) => api("stream").GET(), {
  accumulate: {
    chunk: "merge",
    status: "replace",
  }
})

// Field-specific config (merge only specific fields)
useSSE((api) => api("chat").POST(), {
  accumulate: {
    chunk: { text: "merge" },  // Concat text field, replace others
  },
})

// Example: Field-specific accumulation in action
// Schema: events: { chunk: { data: { id: string; text: string; tokens: number } } }
//
// Event 1: { id: "1", text: "Hello", tokens: 5 }
// Event 2: { id: "2", text: " World", tokens: 6 }
//
// With { chunk: "merge" }:           { id: "2", text: " World", tokens: 6 }  (shallow merge)
// With { chunk: { text: "merge" } }: { id: "2", text: "Hello World", tokens: 6 }  (concat text only)

// Custom function
useSSE((api) => api("chat").POST(), {
  accumulate: {
    chunk: (prev, curr) => ({
      ...curr,
      text: (prev?.text || "") + curr.text,
    }),
  },
})
```

## Transport Configuration

```typescript
const spoosh = new Spoosh<ApiSchema, Error>("/api").withTransports([sse({
  // Delay before disconnecting when no subscribers (helps with React Strict Mode)
  disconnectDelay: 100,

  // Throttle notifications to prevent UI flooding
  throttle: true,  // Uses requestAnimationFrame
  // throttle: 16,  // Or custom interval in ms

  // Keep connection alive when tab is hidden
  openWhenHidden: true,
})]);
```

## Hook Options

```typescript
useSSE(
  (api) => api("notifications").GET({
    query: { userId: "user-123" },
    headers: { Authorization: "Bearer token" },
    credentials: "include",
    openWhenHidden: true,
  }),
  {
    enabled: true,
    events: ["alert", "message"],
    parse: "auto",
    accumulate: "replace",
    maxRetries: 3,
    retryDelay: 1000,
  }
)
```

**Selector Options** (passed to api call):

| Option           | Type                 | Default | Description                                    |
| ---------------- | -------------------- | ------- | ---------------------------------------------- |
| `headers`        | `HeadersInit`        | -       | Request headers                                |
| `credentials`    | `RequestCredentials` | -       | Credentials mode (include, same-origin)        |
| `openWhenHidden` | `boolean`            | `true`  | Keep connection alive in background tabs       |

**Hook Options** (second argument):

| Option       | Type               | Default     | Description                        |
| ------------ | ------------------ | ----------- | ---------------------------------- |
| `enabled`    | `boolean`          | `true`      | Connect automatically on mount     |
| `events`     | `string[]`         | all events  | Events to listen for               |
| `parse`      | `ParseConfig`      | `"auto"`    | Parse strategy for raw data        |
| `accumulate` | `AccumulateConfig` | `"replace"` | How to combine events over time    |
| `maxRetries` | `number`           | `3`         | Max retry attempts on failure      |
| `retryDelay` | `number`           | `1000`      | Delay between retries in ms        |

## Features

- **Connection Pooling**: Multiple subscribers to the same URL share a single connection
- **Automatic Reconnection**: Configurable retry with exponential backoff
- **React Strict Mode Compatible**: Handles double-mount gracefully with disconnect delay
- **Type-Safe Events**: Full TypeScript inference for event data and callbacks
- **Throttling**: Prevent UI flooding from high-frequency events
- **Background Tab Support**: Keeps connection alive when tab is hidden
