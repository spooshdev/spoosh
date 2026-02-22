import type { SpooshPlugin } from "../plugins/types";
import type { SubscriptionAdapter } from "./subscription";

export function composeAdapter(
  baseAdapter: SubscriptionAdapter,
  plugins: readonly SpooshPlugin[]
): SubscriptionAdapter {
  return plugins.reduce((adapter, plugin) => {
    if (plugin.wrapAdapter) {
      return plugin.wrapAdapter(adapter);
    }
    return adapter;
  }, baseAdapter);
}
