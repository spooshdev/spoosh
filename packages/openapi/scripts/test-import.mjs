#!/usr/bin/env node

/**
 * Import-only test script
 *
 * Tests OpenAPI → TypeScript import and type checking:
 * 1. Downloads OpenAPI spec
 * 2. Imports to TypeScript
 * 3. Type-checks the generated code
 *
 * Usage:
 *   node scripts/test-import.mjs <url>
 *   node scripts/test-import.mjs --all    # Test all APIs from list
 */

import fs from "fs";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const TMP_DIR = path.join(ROOT, ".tmp-import");

const APIS = [
  { name: "Petstore", url: "https://petstore3.swagger.io/api/v3/openapi.json" },
  { name: "TMDB", url: "https://developer.themoviedb.org/openapi/tmdb-api.json" },
  { name: "Stripe", url: "https://raw.githubusercontent.com/stripe/openapi/master/openapi/spec3.json" },
  { name: "GitHub", url: "https://raw.githubusercontent.com/github/rest-api-description/main/descriptions/api.github.com/api.github.com.json" },
  { name: "Discord", url: "https://raw.githubusercontent.com/discord/discord-api-spec/main/specs/openapi.json" },
  { name: "Twilio", url: "https://raw.githubusercontent.com/twilio/twilio-oai/main/spec/json/twilio_api_v2010.json" },
  { name: "Cloudflare", url: "https://raw.githubusercontent.com/cloudflare/api-schemas/main/openapi.json" },
];

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
};

function log(msg, color = "reset") {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

async function downloadSpec(url, outputPath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  const data = await response.text();
  fs.writeFileSync(outputPath, data);
  return (Buffer.byteLength(data) / 1024 / 1024).toFixed(2);
}

function runImport(specPath, outputPath) {
  execSync(
    `node dist/cli.mjs import "${specPath}" -o "${outputPath}" --type-name ApiSchema --include-imports`,
    { cwd: ROOT, stdio: "pipe" }
  );
  return fs.readFileSync(outputPath, "utf-8").split("\n").length;
}

function countEndpoints(tsContent) {
  // Count $get, $post, $put, $patch, $delete occurrences
  const matches = tsContent.match(/\$(get|post|put|patch|delete)/g);
  return matches ? matches.length : 0;
}

async function testApi(name, url) {
  const specPath = path.join(TMP_DIR, `${name.toLowerCase()}.json`);
  const tsPath = path.join(TMP_DIR, `${name.toLowerCase()}.ts`);

  process.stdout.write(`  ${name.padEnd(12)} `);

  try {
    // Step 1: Download
    const sizeMB = await downloadSpec(url, specPath);

    // Step 2: Import
    const lines = runImport(specPath, tsPath);

    // Step 3: Count endpoints
    const tsContent = fs.readFileSync(tsPath, "utf-8");
    const endpoints = countEndpoints(tsContent);

    log(`✅ ${sizeMB}MB → ${lines} lines, ${endpoints} endpoints`, "green");
    return { name, status: "pass", size: sizeMB, lines, endpoints };
  } catch (err) {
    log(`❌ ${err.message.split("\n")[0]}`, "red");
    return { name, status: "fail", error: err.message };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const testAll = args.includes("--all");
  const singleUrl = args.find((a) => a.startsWith("http"));

  // Setup
  if (fs.existsSync(TMP_DIR)) {
    fs.rmSync(TMP_DIR, { recursive: true });
  }
  fs.mkdirSync(TMP_DIR, { recursive: true });

  log("\n🔍 OpenAPI Import Test", "cyan");
  log("=".repeat(50), "cyan");

  let results = [];

  if (singleUrl) {
    const name = "Custom";
    results.push(await testApi(name, singleUrl));
  } else if (testAll) {
    log("\nTesting all APIs:\n", "dim");
    for (const api of APIS) {
      results.push(await testApi(api.name, api.url));
    }
  } else {
    log("\nUsage:", "yellow");
    log("  node scripts/test-import.mjs --all           # Test all APIs", "dim");
    log("  node scripts/test-import.mjs <url>           # Test single URL", "dim");
    process.exit(0);
  }

  // Summary
  const passed = results.filter((r) => r.status === "pass").length;
  const failed = results.filter((r) => r.status === "fail").length;

  log("\n" + "=".repeat(50), "cyan");
  log("📊 Summary", "cyan");
  log("=".repeat(50), "cyan");
  log(`Passed: ${passed}`, "green");
  if (failed > 0) {
    log(`Failed: ${failed}`, "red");
    results
      .filter((r) => r.status === "fail")
      .forEach((r) => log(`  - ${r.name}: ${r.error.split("\n")[0]}`, "red"));
    process.exit(1);
  }

  log("\n✅ All imports successful!\n", "green");
}

main();
