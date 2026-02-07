export function clone<T>(value: T, seen = new WeakMap()): T {
  if (value === undefined || value === null || typeof value !== "object") {
    return value;
  }

  if (seen.has(value as object)) {
    return seen.get(value as object);
  }

  if (Array.isArray(value)) {
    const arr: unknown[] = [];
    seen.set(value, arr);
    return value.map((v) => clone(v, seen)) as T;
  }

  if (value instanceof Date) {
    return new Date(value.getTime()) as T;
  }

  if (value instanceof RegExp) {
    return new RegExp(value.source, value.flags) as T;
  }

  if (value.constructor !== Object) {
    return value;
  }

  const obj: Record<string, unknown> = {};
  seen.set(value, obj);

  for (const key in value) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      obj[key] = clone((value as Record<string, unknown>)[key], seen);
    }
  }

  return obj as T;
}
