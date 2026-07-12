import { describe, expect, test } from '@jest/globals';
import { applyBackgroundPolicy } from './background-policy';

describe('applyBackgroundPolicy', () => {
  test.each([
    'chrome_computer',
    'chrome_navigate',
    'chrome_screenshot',
    'chrome_get_web_content',
    'chrome_console',
  ])('forces background execution for %s', (toolName) => {
    expect(applyBackgroundPolicy(toolName, { background: false, tabId: 123 })).toEqual({
      background: true,
      tabId: 123,
    });
  });

  test('does not add unsupported arguments to other tools', () => {
    const args = { tabId: 123 };
    expect(applyBackgroundPolicy('chrome_click_element', args)).toBe(args);
  });
});
