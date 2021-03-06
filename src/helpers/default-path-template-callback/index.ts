import { StringObject } from "@repodog/types";

export default function defaultPathTemplateCallback(
  pathTemplate: string,
  data: StringObject,
  pathTemplateRegExp: RegExp,
) {
  const dataKeys = Object.keys(data);

  return pathTemplate.replace(pathTemplateRegExp, match => {
    return dataKeys.reduce((value, key) => {
      if (match.includes(key)) return data[key];
      return value;
    }, "");
  });
}
