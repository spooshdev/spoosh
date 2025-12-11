export function objectToFormData(obj: Record<string, unknown>): FormData {
  const formData = new FormData();

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      continue;
    }

    if (value instanceof Blob || value instanceof File) {
      formData.append(key, value);
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (item instanceof Blob || item instanceof File) {
          formData.append(key, item);
        } else if (typeof item === "object" && item !== null) {
          formData.append(key, JSON.stringify(item));
        } else {
          formData.append(key, String(item));
        }
      }
    } else if (typeof value === "object") {
      formData.append(key, JSON.stringify(value));
    } else {
      formData.append(key, String(value));
    }
  }

  return formData;
}
