# @spoosh/plugin-progress

Upload and download progress tracking plugin for Spoosh via XHR transport.

**[Documentation](https://spoosh.dev/docs/react/plugins/progress)** · **Requirements:** TypeScript >= 5.0 · **Peer Dependencies:** `@spoosh/core`

## Installation

```bash
npm install @spoosh/plugin-progress
```

## Usage

```typescript
import { Spoosh } from "@spoosh/core";
import { progressPlugin } from "@spoosh/plugin-progress";

const spoosh = new Spoosh<ApiSchema, Error>("/api").use([progressPlugin()]);

// Enable per-request
useRead((api) => api("files/:id").GET(), { progress: true });

// File upload with progress
const { trigger, meta } = useWrite((api) => api("files").POST(), {
  progress: true,
});
trigger({ body: form({ file: selectedFile }) });
// Access progress via meta.progress
```

## Per-Request Options

| Option     | Type                         | Description                                                 |
| ---------- | ---------------------------- | ----------------------------------------------------------- |
| `progress` | `boolean \| ProgressOptions` | Enable progress tracking. Automatically uses XHR transport. |

### ProgressOptions

| Option        | Type     | Description                                                                  |
| ------------- | -------- | ---------------------------------------------------------------------------- |
| `totalHeader` | `string` | Response header to read total size from when `Content-Length` is unavailable |

## Result

| Field    | Type     | Description                |
| -------- | -------- | -------------------------- |
| `loaded` | `number` | Bytes transferred so far   |
| `total`  | `number` | Total bytes (0 if unknown) |
