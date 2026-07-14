const NAMED_KEYS = new Set([
  'enter',
  'tab',
  'esc',
  'escape',
  'space',
  'backspace',
  'delete',
  'del',
  'up',
  'arrowup',
  'down',
  'arrowdown',
  'left',
  'arrowleft',
  'right',
  'arrowright',
  'home',
  'end',
  'pageup',
  'pagedown',
  'insert',
  'control',
  'ctrl',
  'alt',
  'shift',
  'meta',
  'command',
  'cmd',
  ...Array.from({ length: 12 }, (_, index) => `f${index + 1}`),
]);

const MODIFIER_KEYS = new Set(['control', 'ctrl', 'alt', 'shift', 'meta', 'command', 'cmd']);

function isNamedKey(value: string): boolean {
  return NAMED_KEYS.has(value.trim().toLowerCase());
}

function isKeyChord(value: string): boolean {
  const parts = value.split('+').map((part) => part.trim());
  if (parts.length < 2) {
    return false;
  }

  const mainKey = parts.at(-1);
  return (
    parts.slice(0, -1).every((part) => MODIFIER_KEYS.has(part.toLowerCase())) &&
    mainKey !== undefined &&
    (Array.from(mainKey).length === 1 || isNamedKey(mainKey))
  );
}

function isAtomicKeyboardInput(value: string): boolean {
  return Array.from(value).length === 1 || isNamedKey(value) || isKeyChord(value);
}

/**
 * Convert one MCP keyboard argument into the individual extension operations that
 * must run in order. Natural text is emitted character-by-character, while named
 * keys, shortcuts, and the legacy comma-separated shortcut syntax stay atomic.
 */
export function planKeyboardInput(keys: string): string[] {
  if (isAtomicKeyboardInput(keys)) {
    return [keys];
  }

  const legacySequence = keys.split(',').map((part) => part.trim());
  if (legacySequence.length > 1 && legacySequence.every(isAtomicKeyboardInput)) {
    return legacySequence;
  }

  return Array.from(keys.replaceAll('\r\n', '\n')).map((character) => {
    if (character === '\n' || character === '\r') {
      return 'Enter';
    }
    if (character === '\t') {
      return 'Tab';
    }
    return character;
  });
}
