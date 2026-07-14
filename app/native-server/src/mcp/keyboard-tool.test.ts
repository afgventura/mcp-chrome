import { afterEach, describe, expect, jest, test } from '@jest/globals';
import nativeMessagingHostInstance from '../native-messaging-host';
import { handleToolCall } from './register-tools';

function extensionKeyboardResponse(key: string): {
  status: string;
  data: {
    content: Array<{ type: 'text'; text: string }>;
    isError: boolean;
  };
} {
  return {
    status: 'success',
    data: {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            targetElement: { tagName: 'INPUT' },
            results: [{ keyCombination: key, success: true }],
          }),
        },
      ],
      isError: false,
    },
  };
}

describe('chrome_keyboard native bridge pacing', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  test('expands complete text into ordered extension calls and aggregates the result', async () => {
    const sendRequest = jest
      .spyOn(nativeMessagingHostInstance, 'sendRequestToExtensionAndWait')
      .mockImplementation(async (request) => extensionKeyboardResponse(String(request.args?.keys)));

    const result = await handleToolCall('chrome_keyboard', { keys: 'Numbers', delay: 0 });

    expect(sendRequest).toHaveBeenCalledTimes(7);
    expect(sendRequest.mock.calls.map(([request]) => request.args.keys)).toEqual([
      'N',
      'u',
      'm',
      'b',
      'e',
      'r',
      's',
    ]);
    expect(result.isError).toBe(false);
    expect(result.content[0]).toMatchObject({
      type: 'text',
      text: expect.stringContaining('Keyboard events simulated successfully: Numbers'),
    });
  });

  test('waits for the configured interval before sending the next character', async () => {
    jest.useFakeTimers();
    const sendRequest = jest
      .spyOn(nativeMessagingHostInstance, 'sendRequestToExtensionAndWait')
      .mockImplementation(async (request) => extensionKeyboardResponse(String(request.args?.keys)));

    const resultPromise = handleToolCall('chrome_keyboard', { keys: 'ab', delay: 50 });
    await Promise.resolve();
    expect(sendRequest).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(49);
    expect(sendRequest).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(1);
    await resultPromise;
    expect(sendRequest).toHaveBeenCalledTimes(2);
  });
});
