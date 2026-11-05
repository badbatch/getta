export const generateCacheKey = (endpoint: string, headers: Record<string, string>): string => {
  const authorization = Object.entries(headers).find(([name]) => name.toLowerCase() === 'authorization')?.[1];
  return JSON.stringify({ auth: authorization, endpoint });
};
