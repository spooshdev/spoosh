import type { DevToolTheme } from "../../types";
import { getFabCSS, componentsCSS } from "./components.css";
import { effectsCSS } from "./effects.css";
import { layoutCSS } from "./layout.css";
import { getThemeVarsCSS, getSyntaxHighlightCSS } from "./theme.css";
import { darkTheme, lightTheme, resolveTheme } from "./theme.tokens";

export { darkTheme, lightTheme, resolveTheme };

export function getThemeCSS(theme: DevToolTheme): string {
  return [
    getThemeVarsCSS(theme),
    getFabCSS(theme),
    getSyntaxHighlightCSS(theme),
    layoutCSS,
    componentsCSS,
    effectsCSS,
  ].join("\n");
}
