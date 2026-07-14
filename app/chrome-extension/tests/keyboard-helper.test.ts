import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type KeyboardHelperListener = (
  request: { action: string; keys: string; selector?: string; delay?: number },
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void,
) => boolean;

async function loadKeyboardHelper(): Promise<KeyboardHelperListener> {
  delete (window as Window & { __KEYBOARD_HELPER_INITIALIZED__?: boolean })
    .__KEYBOARD_HELPER_INITIALIZED__;
  vi.resetModules();
  vi.mocked(chrome.runtime.onMessage.addListener).mockClear();

  await import('../inject-scripts/keyboard-helper.js');

  const listener = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls.at(-1)?.[0];
  if (!listener) {
    throw new Error('Keyboard helper did not register its message listener');
  }
  return listener as KeyboardHelperListener;
}

function simulateKey(listener: KeyboardHelperListener, keys: string): Promise<unknown> {
  return new Promise((resolve) => {
    listener(
      { action: 'simulateKeyboard', keys, selector: '#target', delay: 0 },
      {} as chrome.runtime.MessageSender,
      resolve,
    );
  });
}

describe('keyboard helper event dispatch', () => {
  beforeEach(() => {
    document.body.innerHTML = '<input id="target" />';
    const BrowserKeyboardEvent = window.KeyboardEvent;
    vi.stubGlobal(
      'KeyboardEvent',
      class TestKeyboardEvent extends BrowserKeyboardEvent {
        constructor(type: string, eventInit?: KeyboardEventInit) {
          const { view: _view, ...supportedInit } = eventInit ?? {};
          super(type, supportedInit);
        }
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('preserves text casing, punctuation, and Unicode characters', async () => {
    const listener = await loadKeyboardHelper();
    const input = document.querySelector('#target');
    const dispatchedKeys: string[] = [];
    input?.addEventListener('keydown', (event) =>
      dispatchedKeys.push((event as KeyboardEvent).key),
    );

    await simulateKey(listener, 'N');
    await simulateKey(listener, ',');
    await simulateKey(listener, '+');
    await simulateKey(listener, '👋');

    expect(dispatchedKeys).toEqual(['N', ',', '+', '👋']);
  });

  it('keeps shortcut key semantics browser-compatible', async () => {
    const listener = await loadKeyboardHelper();
    const input = document.querySelector('#target');
    const dispatchedEvents: Array<{ key: string; ctrlKey: boolean; shiftKey: boolean }> = [];
    input?.addEventListener('keydown', (event) => {
      const keyboardEvent = event as KeyboardEvent;
      dispatchedEvents.push({
        key: keyboardEvent.key,
        ctrlKey: keyboardEvent.ctrlKey,
        shiftKey: keyboardEvent.shiftKey,
      });
    });

    await simulateKey(listener, 'Ctrl+C');

    expect(dispatchedEvents).toEqual([{ key: 'c', ctrlKey: true, shiftKey: false }]);
  });
});
