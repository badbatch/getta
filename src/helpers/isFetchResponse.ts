import { type FetchResponse } from '#types.ts';

export const isFetchResponse = (res: Response | FetchResponse): res is FetchResponse => 'data' in res;
