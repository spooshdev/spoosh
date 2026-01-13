# @spoosh/docs

Documentation site for Spoosh - a type-safe API client with a powerful plugin system.

**Live:** [spoosh.dev](https://spoosh.dev)

## Development

```bash
pnpm dev
```

Open http://localhost:3000

## Build

```bash
pnpm build
```

Static files are generated in the `out` directory.

## Structure

| Path                | Description                 |
| ------------------- | --------------------------- |
| `content/docs`      | Documentation MDX files     |
| `src/app/(home)`    | Landing page                |
| `src/app/docs`      | Documentation pages         |
| `src/app/og`        | Open Graph image generation |
| `src/app/llms`      | LLM-friendly docs index     |
| `src/app/llms-full` | Full LLM docs               |
