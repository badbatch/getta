import { type Cacheability } from 'cacheability';

export const isCacheabilityValid = (cacheability: Cacheability): boolean => {
  const isNoCache = cacheability.metadata.cacheControl.noCache ?? false;
  return !isNoCache && cacheability.checkTTL();
};
