export function mergeConfig<T>(
  defaultConfig: T | undefined,
  requestConfig: T | undefined
): T | undefined {
  if (!defaultConfig) return requestConfig;
  if (!requestConfig) return defaultConfig;

  if (
    typeof defaultConfig === "object" &&
    typeof requestConfig === "object" &&
    !Array.isArray(defaultConfig) &&
    !Array.isArray(requestConfig)
  ) {
    return { ...defaultConfig, ...requestConfig };
  }

  return requestConfig;
}
