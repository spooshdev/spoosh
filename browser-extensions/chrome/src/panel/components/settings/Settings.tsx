import { For, type Component } from "solid-js";
import type { ThemeMode } from "../../types";

interface SettingsProps {
  theme: ThemeMode;
  showPassedPlugins: boolean;
  autoSelectIncoming: boolean;
  maxHistory: number;
  onThemeChange: (theme: ThemeMode) => void;
  onShowPassedPluginsChange: (value: boolean) => void;
  onAutoSelectIncomingChange: (value: boolean) => void;
  onMaxHistoryChange: (value: number) => void;
}

const maxHistoryOptions = [25, 50, 100, 200];

export const Settings: Component<SettingsProps> = (props) => {
  return (
    <div class="flex flex-col h-full">
      <div class="px-4 py-3 border-b border-spoosh-border">
        <h2 class="text-sm font-semibold text-spoosh-text">Settings</h2>
      </div>

      <div class="flex-1 overflow-y-auto p-4 space-y-6">
        <section>
          <h3 class="text-xs font-medium text-spoosh-text-muted mb-3">
            Appearance
          </h3>

          <div class="flex items-center justify-between py-2">
            <span class="text-sm text-spoosh-text">Theme</span>
            <select
              class="bg-spoosh-surface text-spoosh-text text-sm rounded px-2 py-1 border border-spoosh-border focus:outline-none focus:ring-1 focus:ring-spoosh-primary"
              value={props.theme}
              onChange={(e) =>
                props.onThemeChange(e.currentTarget.value as ThemeMode)
              }
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>
        </section>

        <section>
          <h3 class="text-xs font-medium text-spoosh-text-muted mb-3">
            Display
          </h3>

          <label class="flex items-center justify-between py-2 cursor-pointer">
            <span class="text-sm text-spoosh-text">
              Show passed plugins in timeline
            </span>
            <div class="relative">
              <input
                type="checkbox"
                class="sr-only peer"
                checked={props.showPassedPlugins}
                onChange={(e) =>
                  props.onShowPassedPluginsChange(e.currentTarget.checked)
                }
              />
              <div class="w-9 h-5 bg-spoosh-border rounded-full peer peer-checked:bg-spoosh-primary transition-colors" />
              <div class="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
            </div>
          </label>

          <label class="flex items-center justify-between py-2 cursor-pointer">
            <span class="text-sm text-spoosh-text">
              Auto-follow new requests
            </span>
            <div class="relative">
              <input
                type="checkbox"
                class="sr-only peer"
                checked={props.autoSelectIncoming}
                onChange={(e) =>
                  props.onAutoSelectIncomingChange(e.currentTarget.checked)
                }
              />
              <div class="w-9 h-5 bg-spoosh-border rounded-full peer peer-checked:bg-spoosh-primary transition-colors" />
              <div class="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
            </div>
          </label>
        </section>

        <section>
          <h3 class="text-xs font-medium text-spoosh-text-muted mb-3">
            History
          </h3>

          <div class="flex items-center justify-between py-2">
            <span class="text-sm text-spoosh-text">Max requests to keep</span>
            <select
              class="bg-spoosh-surface text-spoosh-text text-sm rounded px-2 py-1 border border-spoosh-border focus:outline-none focus:ring-1 focus:ring-spoosh-primary"
              value={props.maxHistory}
              onChange={(e) =>
                props.onMaxHistoryChange(Number(e.currentTarget.value))
              }
            >
              <For each={maxHistoryOptions}>
                {(option) => <option value={option}>{option}</option>}
              </For>
            </select>
          </div>
        </section>
      </div>
    </div>
  );
};
