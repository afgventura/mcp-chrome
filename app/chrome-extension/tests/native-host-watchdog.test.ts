import { describe, expect, it, vi } from 'vitest';
import {
  ensureNativeHostWatchdog,
  NATIVE_HOST_WATCHDOG_ALARM,
  NATIVE_HOST_WATCHDOG_PERIOD_MINUTES,
} from '../entrypoints/background/native-host-watchdog';

describe('native host watchdog', () => {
  it('creates a persisted periodic alarm when one does not exist', async () => {
    const alarms = {
      get: vi.fn().mockResolvedValue(undefined),
      create: vi.fn(),
    };

    await ensureNativeHostWatchdog(alarms);

    expect(alarms.get).toHaveBeenCalledWith(NATIVE_HOST_WATCHDOG_ALARM);
    expect(alarms.create).toHaveBeenCalledWith(NATIVE_HOST_WATCHDOG_ALARM, {
      delayInMinutes: NATIVE_HOST_WATCHDOG_PERIOD_MINUTES,
      periodInMinutes: NATIVE_HOST_WATCHDOG_PERIOD_MINUTES,
    });
  });

  it('preserves an existing alarm', async () => {
    const alarms = {
      get: vi.fn().mockResolvedValue({ name: NATIVE_HOST_WATCHDOG_ALARM }),
      create: vi.fn(),
    };

    await ensureNativeHostWatchdog(alarms);

    expect(alarms.create).not.toHaveBeenCalled();
  });
});
