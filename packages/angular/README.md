# @spoosh/angular

Angular signals integration for Spoosh - `injectRead`, `injectWrite`, and `injectInfiniteRead`.

**[Documentation](https://spoosh.dev/docs/integrations/angular)** · **Requirements:** TypeScript >= 5.0, Angular >= 16.0

## Installation

```bash
npm install @spoosh/core @spoosh/angular
```

## Usage

### Setup

```typescript
import { Spoosh } from "@spoosh/core";
import { createAngularSpoosh } from "@spoosh/angular";
import { cachePlugin } from "@spoosh/plugin-cache";

const spoosh = new Spoosh<ApiSchema, Error>("/api").use([
  cachePlugin({ staleTime: 5000 }),
]);

export const { injectRead, injectWrite, injectInfiniteRead } = createAngularSpoosh(spoosh);
```

### injectRead

Fetch data with automatic caching and refetching using Angular signals.

```typescript
@Component({
  template: `
    @if (users.loading()) {
      <div>Loading...</div>
    } @else if (users.error()) {
      <div>Error: {{ users.error()?.message }}</div>
    } @else {
      <ul>
        @for (user of users.data(); track user.id) {
          <li>{{ user.name }}</li>
        }
      </ul>
    }
  `,
})
export class UserListComponent {
  users = injectRead((api) => api.users.$get());
}

// With options
@Component({ ... })
export class UserListComponent {
  isReady = signal(false);

  // Recommended: Pass signal directly (shorter syntax)
  users = injectRead(
    (api) => api.users.$get({ query: { page: 1 } }),
    {
      staleTime: 10000,
      enabled: this.isReady,
    }
  );

  // Also works: Arrow function wrapper
  // enabled: () => this.isReady(),
}
```

### injectWrite

Trigger mutations with loading and error states.

```typescript
@Component({
  template: `
    <form (ngSubmit)="handleSubmit()">
      <input [(ngModel)]="title" />
      <button [disabled]="createUser.loading()">
        {{ createUser.loading() ? 'Creating...' : 'Create User' }}
      </button>
    </form>
  `,
})
export class CreateUserComponent {
  title = signal('');

  createUser = injectWrite((api) => api.users.$post);

  async handleSubmit() {
    const result = await this.createUser.trigger({
      body: { name: this.title() },
    });

    if (result.data) {
      // Success
    }
  }
}
```

### injectInfiniteRead

Bidirectional paginated data fetching with infinite scroll support.

```typescript
@Component({
  template: `
    @if (posts.canFetchPrev()) {
      <button (click)="posts.fetchPrev()" [disabled]="posts.fetchingPrev()">
        {{ posts.fetchingPrev() ? 'Loading...' : 'Load Previous' }}
      </button>
    }

    @for (post of posts.data(); track post.id) {
      <app-post-card [post]="post" />
    }

    @if (posts.canFetchNext()) {
      <button (click)="posts.fetchNext()" [disabled]="posts.fetchingNext()">
        {{ posts.fetchingNext() ? 'Loading...' : 'Load More' }}
      </button>
    }
  `,
})
export class PostListComponent {
  posts = injectInfiniteRead(
    (api) => api.posts.$get({ query: { page: 1 } }),
    {
      // Required: Check if next page exists
      canFetchNext: ({ response }) => response?.meta.hasMore ?? false,

      // Required: Build request for next page
      nextPageRequest: ({ response, request }) => ({
        query: { ...request.query, page: (response?.meta.page ?? 0) + 1 },
      }),

      // Required: Merge all responses into items
      merger: (allResponses) => allResponses.flatMap((r) => r.items),

      // Optional: Check if previous page exists
      canFetchPrev: ({ response }) => (response?.meta.page ?? 1) > 1,

      // Optional: Build request for previous page
      prevPageRequest: ({ response, request }) => ({
        query: { ...request.query, page: (response?.meta.page ?? 2) - 1 },
      }),
    }
  );
}
```

## API Reference

### injectRead(readFn, options?)

| Option           | Type                                    | Default | Description                          |
| ---------------- | --------------------------------------- | ------- | ------------------------------------ |
| `enabled`        | `boolean \| Signal<boolean> \| () => boolean` | `true`  | Whether to fetch automatically       |
| `staleTime`      | `number`               | -       | Cache stale time (from plugin-cache) |
| `retries`        | `number`               | -       | Retry attempts (from plugin-retry)   |
| + plugin options | -                      | -       | Options from installed plugins       |

**Returns:**

| Property   | Type                        | Description              |
| ---------- | --------------------------- | ------------------------ |
| `data`     | `Signal<TData \| undefined>`  | Response data            |
| `error`    | `Signal<TError \| undefined>` | Error if request failed  |
| `loading`  | `Signal<boolean>`             | True during initial load |
| `fetching` | `Signal<boolean>`             | True during any fetch    |
| `meta`     | `Signal<PluginResults>`       | Plugin metadata (e.g., `transformedData`) |
| `refetch`  | `() => Promise`             | Manually trigger refetch |
| `abort`    | `() => void`                | Abort current request    |

### injectWrite(writeFn)

**Returns:**

| Property  | Type                        | Description                        |
| --------- | --------------------------- | ---------------------------------- |
| `trigger` | `(options) => Promise`      | Execute the mutation               |
| `data`    | `Signal<TData \| undefined>`  | Response data                      |
| `error`   | `Signal<TError \| undefined>` | Error if request failed            |
| `loading` | `Signal<boolean>`             | True while mutation is in progress |
| `meta`    | `Signal<PluginResults>`       | Plugin metadata                    |
| `input`   | `TriggerOptions \| undefined` | Last trigger input                 |
| `reset`   | `() => void`                | Reset state                        |
| `abort`   | `() => void`                | Abort current request              |

### injectInfiniteRead(readFn, options)

| Option            | Type                         | Required | Description                     |
| ----------------- | ---------------------------- | -------- | ------------------------------- |
| `canFetchNext`    | `(ctx) => boolean`           | Yes      | Check if next page exists       |
| `nextPageRequest` | `(ctx) => Partial<TRequest>` | Yes      | Build request for next page     |
| `merger`          | `(allResponses) => TItem[]`  | Yes      | Merge all responses into items  |
| `canFetchPrev`    | `(ctx) => boolean`           | No       | Check if previous page exists   |
| `prevPageRequest` | `(ctx) => Partial<TRequest>` | No       | Build request for previous page |
| `enabled`         | `boolean \| Signal<boolean> \| () => boolean` | No       | Whether to fetch automatically  |

**Context object passed to callbacks:**

```typescript
type Context<TData, TRequest> = {
  response: TData | undefined; // Latest response
  allResponses: TData[]; // All fetched responses
  request: TRequest; // Current request options
};
```

**Returns:**

| Property       | Type                        | Description                     |
| -------------- | --------------------------- | ------------------------------- |
| `data`         | `Signal<TItem[] \| undefined>` | Merged items from all responses |
| `allResponses` | `Signal<TData[] \| undefined>` | Array of all raw responses      |
| `loading`      | `Signal<boolean>`             | True during initial load        |
| `fetching`     | `Signal<boolean>`             | True during any fetch           |
| `fetchingNext` | `Signal<boolean>`             | True while fetching next page   |
| `fetchingPrev` | `Signal<boolean>`             | True while fetching previous    |
| `canFetchNext` | `Signal<boolean>`             | Whether next page exists        |
| `canFetchPrev` | `Signal<boolean>`             | Whether previous page exists    |
| `meta`         | `Signal<PluginResults>`       | Plugin metadata                 |
| `fetchNext`    | `() => Promise<void>`       | Fetch the next page             |
| `fetchPrev`    | `() => Promise<void>`       | Fetch the previous page         |
| `refetch`      | `() => Promise<void>`       | Refetch all pages               |
| `abort`        | `() => void`                | Abort current request           |
| `error`        | `Signal<TError \| undefined>` | Error if request failed         |
