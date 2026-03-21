export const generateCacheKey = (endpoint: string, headers: Record<string, string>) =>
  JSON.stringify({ auth: headers.authorization, endpoint });
