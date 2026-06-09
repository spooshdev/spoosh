import type { SpooshPlugin } from "@spoosh/core";

const PLUGIN_NAME = "msw-recovery";

let overlayShown = false;

function createStyledElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  styles: Partial<CSSStyleDeclaration>,
  textContent?: string
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  Object.assign(el.style, styles);

  if (textContent) {
    el.textContent = textContent;
  }

  return el;
}

function showRecoveryOverlay(): void {
  if (overlayShown) return;
  overlayShown = true;

  const overlay = createStyledElement("div", {
    position: "fixed",
    inset: "0",
    background: "rgba(0, 0, 0, 0.8)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: "99999",
    fontFamily: "system-ui, sans-serif",
  });
  overlay.id = "msw-recovery-overlay";

  const card = createStyledElement("div", {
    background: "#1a1a2e",
    border: "1px solid #e94560",
    borderRadius: "12px",
    padding: "32px",
    maxWidth: "400px",
    textAlign: "center",
    color: "#fff",
  });

  const icon = createStyledElement(
    "div",
    { fontSize: "48px", marginBottom: "16px" },
    "⚠️"
  );

  const heading = createStyledElement(
    "h2",
    { margin: "0 0 12px", color: "#e94560" },
    "Mock Server Disconnected"
  );

  const message = createStyledElement(
    "p",
    { margin: "0 0 24px", color: "#a0a0a0", lineHeight: "1.5" },
    "The Mock Service Worker (MSW) has been disconnected due to browser inactivity. Please reload the page to restore the mock API."
  );

  const button = createStyledElement("button", {
    background: "#e94560",
    color: "white",
    border: "none",
    padding: "12px 32px",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
  });
  button.textContent = "Reload Page";
  button.addEventListener("click", () => window.location.reload());
  button.addEventListener(
    "mouseover",
    () => (button.style.background = "#ff6b6b")
  );
  button.addEventListener(
    "mouseout",
    () => (button.style.background = "#e94560")
  );

  card.appendChild(icon);
  card.appendChild(heading);
  card.appendChild(message);
  card.appendChild(button);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

function isHtmlResponse(data: unknown): boolean {
  if (typeof data !== "string") return false;
  const trimmed = data.trim().toLowerCase();
  return trimmed.startsWith("<!doctype html") || trimmed.startsWith("<html");
}

export function mswRecoveryPlugin(): SpooshPlugin {
  return {
    name: PLUGIN_NAME,
    operations: ["read", "write", "pages"],

    async middleware(context, next) {
      const response = await next();

      if (isHtmlResponse(response.data)) {
        showRecoveryOverlay();

        return {
          ...response,
          ok: false,
          error: new Error("MSW disconnected - received HTML instead of JSON"),
        };
      }

      return response;
    },
  };
}
