import { type PathTemplateCallback, type RequestOptions } from '../../types.ts';

export interface BuildEndpointOptions extends Omit<RequestOptions, 'headers'> {
  optionalPathTemplateRegExp: RegExp;
  pathTemplateCallback: PathTemplateCallback;
  pathTemplateRegExp: RegExp;
}
