# @spoosh/angular

Angular signals integration for Spoosh - `injectRead`, `injectWrite`, and `injectPages`.

**[Documentation](https://spoosh.dev/docs/angular)** · **Requirements:** TypeScript >= 5.0, Angular >= 16.0

## Installation

```bash
npm install @spoosh/core @spoosh/angular
```

## Usage

### Setup

```typescript
import { Spoosh } from "@spoosh/core";
import { create } from "@spoosh/angular";
import { cachePlugin } from "@spoosh/plugin-cache";

const spoosh = new Spoosh<ApiSchema, Error>("/api").use([
  cachePlugin({ staleTime: 5000 }),
]);

export const { injectRead, injectWrite, injectPages } = create(spoosh);
```

### injectRead

Fetch data with automatic caching and triggering using Angular signals.

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
  users = injectRead((api) => api("users").GET());
}

// With options
@Component({ ... })
export class UserListComponent {
  isReady = signal(false);

  // Recommended: Pass signal directly (shorter syntax)
  users = injectRead(
    (api) => api("users").GET({ query: { page: 1 } }),
    {
      staleTime: 10000,
      enabled: this.isReady,
    }
  );

  // With path parameters
  userId = signal(123);
  user = injectRead(
    (api) => api("users/:id").GET({ params: { id: this.userId() } }),
    { enabled: () => this.userId() !== null }
  );
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
        {{ createUser.loading() ? "Creating..." : "Create User" }}
      </button>
    </form>
  `,
})
export class CreateUserComponent {
  title = signal("");

  createUser = injectWrite((api) => api("users").POST());

  async handleSubmit() {
    const result = await this.createUser.trigger({
      body: { name: this.title() },
    });

    if (result.data) {
      // Success
    }
  }
}

// With path parameters
updateUser = injectWrite((api) => api("users/:id").PUT());

async updateUserName(userId: number, name: string) {
  await this.updateUser.trigger({
    params: { id: userId },
    body: { name },
  });
}
```

### injectPages

Bidirectional paginated data fetching with infinite scroll support.

```typescript
@Component({
  template: `
    @if (posts.canFetchPrev()) {
      <button (click)="posts.fetchPrev()" [disabled]="posts.fetchingPrev()">
        {{ posts.fetchingPrev() ? "Loading..." : "Load Previous" }}
      </button>
    }

    @for (post of posts.data(); track post.id) {
      <app-post-card [post]="post" />
    }

    @if (posts.canFetchNext()) {
      <button (click)="posts.fetchNext()" [disabled]="posts.fetchingNext()">
        {{ posts.fetchingNext() ? "Loading..." : "Load More" }}
      </button>
    }
  `,
})
export class PostListComponent {
  posts = injectPages((api) => api("posts").GET({ query: { page: 1 } }), {
    // Required: Check if next page exists
    canFetchNext: ({ lastPage }) => lastPage?.data?.meta.hasMore ?? false,

    // Required: Build request for next page
    nextPageRequest: ({ lastPage }) => ({
      query: { page: (lastPage?.data?.meta.page ?? 0) + 1 },
    }),

    // Required: Merge all pages into items
    merger: (pages) => pages.flatMap((p) => p.data?.items ?? []),

    // Optional: Check if previous page exists
    canFetchPrev: ({ firstPage }) => (firstPage?.data?.meta.page ?? 1) > 1,

    // Optional: Build request for previous page
    prevPageRequest: ({ firstPage }) => ({
      query: { page: (firstPage?.data?.meta.page ?? 2) - 1 },
    }),
  });
}
```

## API Reference

### injectRead(readFn, options?)

| Option           | Type                                          | Default | Description                          |
| ---------------- | --------------------------------------------- | ------- | ------------------------------------ |
| `enabled`        | `boolean \| Signal<boolean> \| () => boolean` | `true`  | Whether to fetch automatically       |
| `staleTime`      | `number`                                      | -       | Cache stale time (from plugin-cache) |
| `retries`        | `number`                                      | -       | Retry attempts (from plugin-retry)   |
| + plugin options | -                                             | -       | Options from installed plugins       |

**Returns:**

| Property   | Type                          | Description                               |
| ---------- | ----------------------------- | ----------------------------------------- |
| `data`     | `Signal<TData \| undefined>`  | Response data                             |
| `error`    | `Signal<TError \| undefined>` | Error if request failed                   |
| `loading`  | `Signal<boolean>`             | True during initial load                  |
| `fetching` | `Signal<boolean>`             | True during any fetch                     |
| `meta`     | `Signal<PluginResults>`       | Plugin metadata (e.g., `transformedData`) |
| `trigger`  | `() => Promise`               | Manually trigger fetch                    |
| `abort`    | `() => void`                  | Abort current request                     |

### injectWrite(writeFn)

**Returns:**

| Property  | Type                          | Description                        |
| --------- | ----------------------------- | ---------------------------------- |
| `trigger` | `(options) => Promise`        | Execute the mutation               |
| `data`    | `Signal<TData \| undefined>`  | Response data                      |
| `error`   | `Signal<TError \| undefined>` | Error if request failed            |
| `loading` | `Signal<boolean>`             | True while mutation is in progress |
| `meta`    | `Signal<PluginResults>`       | Plugin metadata                    |
| `input`   | `TriggerOptions \| undefined` | Last trigger input                 |
| `abort`   | `() => void`                  | Abort current request              |

### injectPages(readFn, options)

| Option            | Type                                          | Required | Description                                       |
| ----------------- | --------------------------------------------- | -------- | ------------------------------------------------- |
| `merger`          | `(pages) => TItem[]`                          | Yes      | Merge all pages into items                        |
| `canFetchNext`    | `(ctx) => boolean`                            | No       | Check if next page exists. Default: `() => false` |
| `nextPageRequest` | `(ctx) => Partial<TRequest>`                  | No       | Build request for next page                       |
| `canFetchPrev`    | `(ctx) => boolean`                            | No       | Check if previous page exists                     |
| `prevPageRequest` | `(ctx) => Partial<TRequest>`                  | No       | Build request for previous page                   |
| `enabled`         | `boolean \| Signal<boolean> \| () => boolean` | No       | Whether to fetch automatically                    |

**Context object passed to callbacks:**

```typescript
// For canFetchNext and nextPageRequest
type NextContext<TData, TRequest> = {
  lastPage: InfinitePage<TData> | undefined;
  pages: InfinitePage<TData>[];
  request: TRequest;
};

// For canFetchPrev and prevPageRequest
type PrevContext<TData, TRequest> = {
  firstPage: InfinitePage<TData> | undefined;
  pages: InfinitePage<TData>[];
  request: TRequest;
};

// Each page in the pages array
type InfinitePage<TData> = {
  status: "pending" | "loading" | "success" | "error" | "stale";
  data?: TData;
  error?: TError;
  meta?: TMeta;
  input?: { query?; params?; body? };
};
```

**Returns:**

| Property       | Type                            | Description                                     |
| -------------- | ------------------------------- | ----------------------------------------------- |
| `data`         | `Signal<TItem[] \| undefined>`  | Merged items from all pages                     |
| `pages`        | `Signal<InfinitePage<TData>[]>` | Array of all pages with status, data, and meta  |
| `loading`      | `Signal<boolean>`               | True during initial load                        |
| `fetching`     | `Signal<boolean>`               | True during any fetch                           |
| `fetchingNext` | `Signal<boolean>`               | True while fetching next page                   |
| `fetchingPrev` | `Signal<boolean>`               | True while fetching previous                    |
| `canFetchNext` | `Signal<boolean>`               | Whether next page exists                        |
| `canFetchPrev` | `Signal<boolean>`               | Whether previous page exists                    |
| `fetchNext`    | `() => Promise<void>`           | Fetch the next page                             |
| `fetchPrev`    | `() => Promise<void>`           | Fetch the previous page                         |
| `trigger`      | `(options?) => Promise<void>`   | Trigger fetch with optional new request options |
| `abort`        | `() => void`                    | Abort current request                           |
| `error`        | `Signal<TError \| undefined>`   | Error if request failed                         |
