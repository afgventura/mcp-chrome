import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BaseBrowserToolExecutor } from '../entrypoints/background/tools/base-browser';

class TestBrowserTool extends BaseBrowserToolExecutor {
  name = 'test_browser_tool';

  async execute(): Promise<never> {
    throw new Error('not used');
  }

  inject(tabId: number): Promise<void> {
    return this.injectContentScript(tabId, ['inject-scripts/test-helper.js']);
  }
}

describe('BaseBrowserToolExecutor content-script injection', () => {
  const tool = new TestBrowserTool();

  beforeEach(() => {
    vi.restoreAllMocks();
    chrome.tabs.get = vi.fn().mockResolvedValue({ id: 42, url: 'https://example.com/' });
    chrome.tabs.sendMessage = vi.fn().mockRejectedValue(new Error('Receiving end does not exist'));
    chrome.scripting = {
      executeScript: vi.fn().mockResolvedValue([]),
    } as unknown as typeof chrome.scripting;
  });

  it('treats a missing ping receiver as the normal pre-injection state', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(tool.inject(42)).resolves.toBeUndefined();

    expect(chrome.scripting.executeScript).toHaveBeenCalledOnce();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('rejects protected Chrome pages before pinging or injecting', async () => {
    chrome.tabs.get = vi.fn().mockResolvedValue({ id: 42, url: 'chrome://extensions/' });

    await expect(tool.inject(42)).rejects.toThrow(
      'Chrome does not allow extensions to inject content scripts into chrome://extensions/',
    );

    expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
    expect(chrome.scripting.executeScript).not.toHaveBeenCalled();
  });
});
