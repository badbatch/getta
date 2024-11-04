export const defaultPathTemplateCallback = (
  pathTemplate: string,
  data: Record<string, string | number | boolean>,
  pathTemplateRegExp: RegExp,
) => {
  const dataKeys = Object.keys(data);

  return pathTemplate.replace(pathTemplateRegExp, match => {
    for (const key of dataKeys) {
      if (match.includes(key) && data[key] !== undefined) {
        return String(data[key]);
      }
    }

    return '';
  });
};
