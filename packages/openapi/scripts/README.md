# OpenAPI Package Scripts

This directory contains manual testing and utility scripts for the `@spoosh/openapi` package.

## Available Scripts

### `test-roundtrip.mjs`

**Purpose**: Tests the round-trip conversion reliability by verifying the conversion is lossless.

**What it does**:

1. Loads an OpenAPI specification (from URL or local file)
2. Converts OpenAPI → TypeScript
3. Converts TypeScript → OpenAPI
4. Converts OpenAPI → TypeScript (again)
5. Compares the first and second TypeScript outputs
6. Reports any differences

**Usage**:

```bash
# Default: Uses TMDB API (3MB, 150+ endpoints)
npm run test:roundtrip

# From a URL
npm run test:roundtrip https://petstore3.swagger.io/api/v3/openapi.json

# From a local file
npm run test:roundtrip ./my-openapi.json
npm run test:roundtrip ../path/to/spec.yaml
```

**Why manual?**

- Downloads a large external file (3MB)
- Takes 10-20 seconds to run
- Network-dependent
- Not suitable for CI/CD pipelines
- Should be run before major releases to verify conversion quality

**Expected outcome**:

- Perfect round-trip: Files are identical ✅
- Mostly successful: 1-5 lines differ (acceptable variations) ✅
- Failed: More than 5 lines differ ❌

**Note**: Some OpenAPI specs may not achieve perfect round-trip conversion due to:

- Unsupported OpenAPI features (e.g., `additionalProperties`, `discriminator`)
- Schema references that can't be fully preserved
- Complex nested structures

The TMDB API is known to work perfectly and is used as the default test case.

**Cleanup**:
The script automatically cleans up all temporary files after running.

## Adding New Scripts

When adding new manual test scripts:

1. Place them in this directory
2. Use `.mjs` extension for ESM scripts
3. Make them executable: `chmod +x script.mjs`
4. Add to `package.json` scripts with a descriptive name
5. Document them in this README
6. Ensure they don't run automatically with `npm test`
