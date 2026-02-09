import type { DevToolTheme } from "../../types";

export const darkColors = {
  background: "#0d1117",
  surface: "#161b22",
  text: "#e6edf3",
  textMuted: "#8b949e",
  border: "#30363d",
  primary: "#58a6ff",
  success: "#3fb950",
  warning: "#d29922",
  error: "#f85149",
};

export const lightColors = {
  background: "#ffffff",
  surface: "#f6f8fa",
  text: "#1f2328",
  textMuted: "#656d76",
  border: "#d0d7de",
  primary: "#0969da",
  success: "#1a7f37",
  warning: "#9a6700",
  error: "#cf222e",
};

export const fonts = {
  mono: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
};

export const darkTheme: DevToolTheme = {
  colors: darkColors,
  fonts,
};

export const lightTheme: DevToolTheme = {
  colors: lightColors,
  fonts,
};

export function resolveTheme(
  theme: "light" | "dark" | DevToolTheme
): DevToolTheme {
  if (theme === "light") return lightTheme;
  if (theme === "dark") return darkTheme;
  return theme;
}
