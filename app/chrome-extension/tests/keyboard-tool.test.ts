import { describe, expect, it } from 'vitest';
import { TOOL_NAMES, TOOL_SCHEMAS } from 'chrome-mcp-shared';

import { planKeyboardInput } from '../entrypoints/background/tools/browser/keyboard';

describe('planKeyboardInput', () => {
  it('keeps named keys and shortcuts atomic', () => {
    expect(planKeyboardInput('Enter')).toEqual(['Enter']);
    expect(planKeyboardInput('Ctrl+C')).toEqual(['Ctrl+C']);
    expect(planKeyboardInput('Shift+Tab')).toEqual(['Shift+Tab']);
  });

  it('expands complete text into paced character operations', () => {
    expect(planKeyboardInput('Hello World')).toEqual([
      'H',
      'e',
      'l',
      'l',
      'o',
      ' ',
      'W',
      'o',
      'r',
      'l',
      'd',
    ]);
  });

  it('preserves punctuation in natural text', () => {
    expect(planKeyboardInput('Hello, world+')).toEqual([
      'H',
      'e',
      'l',
      'l',
      'o',
      ',',
      ' ',
      'w',
      'o',
      'r',
      'l',
      'd',
      '+',
    ]);
  });

  it('maps multiline text controls to named keys', () => {
    expect(planKeyboardInput('first\r\nsecond\tvalue')).toEqual([
      'f',
      'i',
      'r',
      's',
      't',
      'Enter',
      's',
      'e',
      'c',
      'o',
      'n',
      'd',
      'Tab',
      'v',
      'a',
      'l',
      'u',
      'e',
    ]);
  });

  it('preserves the legacy comma-separated key sequence syntax', () => {
    expect(planKeyboardInput('Ctrl+A, Backspace, Enter')).toEqual(['Ctrl+A', 'Backspace', 'Enter']);
  });

  it('does not split one Unicode code point into surrogate halves', () => {
    expect(planKeyboardInput('Hi 👋')).toEqual(['H', 'i', ' ', '👋']);
  });
});

describe('chrome_keyboard tool guidance', () => {
  it('explicitly directs models to send complete text in one call', () => {
    const keyboardTool = TOOL_SCHEMAS.find((tool) => tool.name === TOOL_NAMES.BROWSER.KEYBOARD);
    const keysProperty = keyboardTool?.inputSchema.properties?.keys;

    expect(keyboardTool?.description).toContain('send the entire text in one call');
    expect(keyboardTool?.description).toContain(
      'Never make separate chrome_keyboard calls for individual characters',
    );
    expect(keysProperty?.description).toContain('always pass the full string in a single call');
    expect(keysProperty?.description).toContain('keys: "Numbers"');
  });
});
