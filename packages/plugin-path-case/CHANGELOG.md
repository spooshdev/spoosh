# @spoosh/plugin-path-case

## 0.1.0

### Features

- Initial release
- Transform API paths from camelCase to target case format (kebab-case, snake_case, PascalCase)
- `exclude` option to skip specific path segments (e.g., `v1`, `api`)
- Per-request override via `pathCase` option
- Automatic skipping of param placeholders (`:id`) and numeric segments
