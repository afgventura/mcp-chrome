import { describe, expect, test } from '@jest/globals';
import { TOOL_SCHEMAS } from 'chrome-mcp-shared';
import { applyBackgroundPolicy, filterExposedTools, isToolDisabled } from './background-policy';
import { handleToolCall } from './register-tools';

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

  test('removes chrome_switch_tab from the advertised catalog', () => {
    const exposedNames = filterExposedTools(TOOL_SCHEMAS).map((tool) => tool.name);
    expect(exposedNames).not.toContain('chrome_switch_tab');
    expect(isToolDisabled('chrome_switch_tab')).toBe(true);
  });

  test('keeps non-focus tools enabled', () => {
    expect(isToolDisabled('chrome_read_page')).toBe(false);
  });

  test('rejects cached chrome_switch_tab calls without forwarding them', async () => {
    const result = await handleToolCall('chrome_switch_tab', { tabId: 123 });
    expect(result.isError).toBe(true);
    expect(result.content[0]).toMatchObject({
      type: 'text',
      text: expect.stringContaining('disabled because it steals browser focus'),
    });
  });
});
