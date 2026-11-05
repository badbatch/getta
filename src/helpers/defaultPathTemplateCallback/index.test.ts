import { describe, expect, it } from '@jest/globals';
import { defaultPath, defaultPathTemplateData } from '#__testUtils__/helpers/index.ts';
import { DEFAULT_PATH_TEMPLATE_REGEX } from '#constants.ts';
import { defaultPathTemplateCallback } from './index.ts';

describe('Given a path template and template data', () => {
  it('When the default callback runs, then it fills each placeholder', () => {
    // Arrange
    const expectedPath = '/direct/rest/content/catalog/product/136-7317?format=standard';
    // Act
    const result = defaultPathTemplateCallback(defaultPath, defaultPathTemplateData, DEFAULT_PATH_TEMPLATE_REGEX);

    // Assert
    expect(result).toBe(expectedPath);
  });

  it('When a template value is zero, then the callback keeps it in the path', () => {
    // Arrange
    const pathTemplateData = { ...defaultPathTemplateData, 'id,+': 0 };
    // Act
    const result = defaultPathTemplateCallback(defaultPath, pathTemplateData, DEFAULT_PATH_TEMPLATE_REGEX);

    // Assert
    expect(result).toBe('/direct/rest/content/catalog/product/0?format=standard');
  });
});
