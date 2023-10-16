import { type Cacheability } from 'cacheability';

export const isCacheabilityValid = (cacheability: Cacheability) => {
  const noCache = cacheability.metadata.cacheControl.noCache ?? false;
  return !noCache && cacheability.checkTTL();
};
