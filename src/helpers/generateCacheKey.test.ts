import { describe, expect, it } from '@jest/globals';
import { generateCacheKey } from './generateCacheKey.ts';

describe('Given a URL and request headers', () => {
  it('When authorization casing varies, then it generates the same cache key', () => {
    // Arrange
    const endpoint = 'https://example.com/private';
    // Act
    const lowercaseKey = generateCacheKey(endpoint, { authorization: 'Bearer token' });
    const titleCaseKey = generateCacheKey(endpoint, { Authorization: 'Bearer token' });

    // Assert
    expect(titleCaseKey).toBe(lowercaseKey);
  });

  it('When authorization values differ, then it generates different cache keys', () => {
    // Arrange
    const endpoint = 'https://example.com/private';
    // Act
    const keyA = generateCacheKey(endpoint, { authorization: 'Bearer A' });
    const keyB = generateCacheKey(endpoint, { authorization: 'Bearer B' });

    // Assert
    expect(keyA).not.toBe(keyB);
  });
});
