import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TOOL_NAMES, TOOL_SCHEMAS } from '../../../packages/shared/src/tools';
import {
  buildNavigationUrlPatterns,
  navigateTool,
} from '../entrypoints/background/tools/browser/common';

describe('chrome_navigate window policy', () => {
  beforeEach(() => {
    chrome.tabs.query = vi.fn().mockResolvedValue([]);
    chrome.tabs.create = vi.fn().mockResolvedValue({
      id: 12,
      windowId: 7,
      url: 'https://example.com/',
    });
    chrome.windows = {
      get: vi.fn(),
      getLastFocused: vi.fn().mockResolvedValue({ id: 7 }),
      update: vi.fn().mockResolvedValue({ id: 7 }),
      create: vi.fn(),
    } as unknown as typeof chrome.windows;
  });

  it('does not advertise any option that creates a browser window', () => {
    const schema = TOOL_SCHEMAS.find((tool) => tool.name === TOOL_NAMES.BROWSER.NAVIGATE);
    const properties = schema?.inputSchema.properties ?? {};

    expect(schema?.description).toContain('Never creates a new browser window');
    expect(schema?.inputSchema.additionalProperties).toBe(false);
    expect(properties).not.toHaveProperty('newWindow');
    expect(properties).not.toHaveProperty('width');
    expect(properties).not.toHaveProperty('height');
  });

  it('ignores legacy window-creation arguments and opens a tab in the existing window', async () => {
    const result = await navigateTool.execute({
      url: 'https://example.com/',
      newWindow: true,
      width: 1920,
      height: 1080,
    } as never);

    expect(result.isError).toBe(false);
    expect(chrome.tabs.create).toHaveBeenCalledWith({
      url: 'https://example.com/',
      windowId: 7,
      active: true,
    });
    expect(chrome.windows.create).not.toHaveBeenCalled();
  });
});

describe('buildNavigationUrlPatterns', () => {
  it('does not generate invalid www or port patterns for loopback URLs', () => {
    expect(buildNavigationUrlPatterns('http://127.0.0.1:3000/path')).toEqual([
      'http://127.0.0.1/*',
      'https://127.0.0.1/*',
    ]);
    expect(buildNavigationUrlPatterns('http://localhost:3000/path')).toEqual([
      'http://localhost/*',
      'https://localhost/*',
    ]);
  });

  it('keeps www and protocol variants for normal hostnames', () => {
    expect(buildNavigationUrlPatterns('https://example.com/path')).toEqual([
      'https://example.com/*',
      'https://www.example.com/*',
      'http://example.com/*',
      'http://www.example.com/*',
    ]);
  });
});
