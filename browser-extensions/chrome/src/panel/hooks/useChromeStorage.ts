import { createSignal, onMount, type Accessor } from "solid-js";

type StorageSetter<T> = (value: T | ((prev: T) => T)) => void;

export function useChromeStorage<T>(
  key: string,
  defaultValue: T
): [Accessor<T>, StorageSetter<T>] {
  const [value, setValue] = createSignal<T>(defaultValue);

  onMount(async () => {
    try {
      const result = await chrome.storage.local.get(key);

      if (result[key] !== undefined) {
        setValue(() => result[key] as T);
      }
    } catch {
      // Ignore storage errors
    }
  });

  const setAndPersist: StorageSetter<T> = (newValue) => {
    const resolvedValue =
      typeof newValue === "function"
        ? (newValue as (prev: T) => T)(value())
        : newValue;

    setValue(() => resolvedValue as T);

    try {
      chrome.storage.local.set({ [key]: resolvedValue });
    } catch {
      // Ignore storage errors
    }
  };

  return [value, setAndPersist];
}
