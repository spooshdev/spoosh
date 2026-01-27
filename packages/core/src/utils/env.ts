declare const process: { env?: Record<string, string | undefined> } | undefined;

export function __DEV__(): boolean {
  return (
    typeof process !== "undefined" && process?.env?.NODE_ENV !== "production"
  );
}
