import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

const worker = setupWorker(...handlers);

const INIT_HINT =
  "Run `pnpm --filter @spoosh/example-angular-ecommerce msw:init` once, then restart the dev server.";

export async function startMocking() {
  if (typeof window === "undefined") {
    return;
  }

  const workerUrl = "/mockServiceWorker.js";
  try {
    const response = await fetch(workerUrl, { cache: "no-store" });
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.includes("javascript")) {
      console.warn(
        `[MSW] Skipping worker start because /mockServiceWorker.js is missing or invalid. ${INIT_HINT}`
      );
      return;
    }
  } catch {
    console.warn(
      `[MSW] Skipping worker start because /mockServiceWorker.js is unavailable. ${INIT_HINT}`
    );
    return;
  }

  try {
    await worker.start({ onUnhandledRequest: "bypass", quiet: true });
  } catch (error) {
    console.error(`[MSW] Worker registration failed. ${INIT_HINT}`, error);
  }
}
