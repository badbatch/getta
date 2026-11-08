export const renderMultipartBody = (): string => `
    const formData = new FormData();

    for (const [key, value] of Object.entries(options?.body ?? {})) {
      if (value === undefined || value === null) continue;

      const appendValue = (item: unknown) => {
        if (item === undefined || item === null) return;

        if (typeof Blob !== 'undefined' && item instanceof Blob) {
          formData.append(key, item);
        } else if (typeof item === 'object') {
          formData.append(key, JSON.stringify(item));
        } else {
          formData.append(key, String(item));
        }
      };

      if (Array.isArray(value)) {
        value.forEach(appendValue);
      } else {
        appendValue(value);
      }
    }
`;
