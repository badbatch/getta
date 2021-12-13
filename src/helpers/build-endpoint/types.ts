import { PathTemplateCallback, RequestOptions } from "../../types";

export interface BuildEndpointOptions extends Omit<RequestOptions, "headers"> {
  optionalPathTemplateRegExp: RegExp;
  pathTemplateCallback: PathTemplateCallback;
  pathTemplateRegExp: RegExp;
}
