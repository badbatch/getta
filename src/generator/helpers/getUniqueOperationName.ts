export const getUniqueOperationName = (baseName: string, usedNames: Set<string>): string => {
  let name = baseName;
  let suffix = 2;

  while (usedNames.has(name)) {
    name = `${baseName}${String(suffix++)}`;
  }

  usedNames.add(name);

  return name;
};
