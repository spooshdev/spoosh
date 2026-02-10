let styleElement: HTMLStyleElement | null = null;
let targetRoot: ShadowRoot | null = null;

export function injectStyles(css: string, shadowRoot?: ShadowRoot): void {
  if (typeof document === "undefined") return;

  if (shadowRoot && shadowRoot !== targetRoot) {
    styleElement?.remove();
    styleElement = null;
    targetRoot = shadowRoot;
  }

  if (!styleElement) {
    styleElement = document.createElement("style");
    styleElement.id = "spoosh-devtool-styles";

    if (targetRoot) {
      targetRoot.appendChild(styleElement);
    } else {
      document.head.appendChild(styleElement);
    }
  }

  styleElement.textContent = css;
}

export function removeStyles(): void {
  if (styleElement) {
    styleElement.remove();
    styleElement = null;
  }

  targetRoot = null;
}
