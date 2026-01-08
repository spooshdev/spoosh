export function sortObjectKeys(
  obj: unknown,
  seen: WeakSet<object> = new WeakSet()
): unknown {
  if (obj === null || typeof obj !== "object") return obj;

  if (seen.has(obj)) {
    return "[Circular]";
  }

  seen.add(obj);

  if (Array.isArray(obj)) {
    return obj.map((item) => sortObjectKeys(item, seen));
  }

  return Object.keys(obj as Record<string, unknown>)
    .sort()
    .reduce(
      (sorted, key) => {
        sorted[key] = sortObjectKeys(
          (obj as Record<string, unknown>)[key],
          seen
        );
        return sorted;
      },
      {} as Record<string, unknown>
    );
}
