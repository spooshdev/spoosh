import type { DevToolTheme } from "../../types";

export function getThemeVarsCSS(theme: DevToolTheme): string {
  return `
    :host {
      --spoosh-bg: ${theme.colors.background};
      --spoosh-surface: ${theme.colors.surface};
      --spoosh-text: ${theme.colors.text};
      --spoosh-text-muted: ${theme.colors.textMuted};
      --spoosh-border: ${theme.colors.border};
      --spoosh-primary: ${theme.colors.primary};
      --spoosh-success: ${theme.colors.success};
      --spoosh-warning: ${theme.colors.warning};
      --spoosh-error: ${theme.colors.error};
      --spoosh-font: ${theme.fonts.mono};
    }
  `;
}

export function getSyntaxHighlightCSS(theme: DevToolTheme): string {
  return `
    .spoosh-syn-key { color: ${theme.colors.primary}; }
    .spoosh-syn-str { color: ${theme.colors.success}; }
    .spoosh-syn-num { color: ${theme.colors.warning}; }
    .spoosh-syn-bool { color: ${theme.colors.error}; }
    .spoosh-syn-null { color: var(--spoosh-text-muted); }

    .spoosh-diff-line-added {
      background: rgba(63, 185, 80, 0.15);
      color: ${theme.colors.success};
      padding: 0 6px;
    }

    .spoosh-diff-line-removed {
      background: rgba(248, 81, 73, 0.15);
      color: ${theme.colors.error};
      padding: 0 6px;
    }

    .spoosh-diff-line-unchanged {
      color: var(--spoosh-text-muted);
      padding: 0 6px;
    }
  `;
}
