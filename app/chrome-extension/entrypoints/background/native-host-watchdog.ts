export const NATIVE_HOST_WATCHDOG_ALARM = 'chrome-mcp-native-host-watchdog';

// Chrome alarms are persisted by the browser and wake an MV3 service worker.
// Thirty seconds is Chrome's documented minimum period.
export const NATIVE_HOST_WATCHDOG_PERIOD_MINUTES = 0.5;

type AlarmScheduler = Pick<typeof chrome.alarms, 'create' | 'get'>;

/** Ensure the native-host watchdog exists without resetting an existing alarm. */
export async function ensureNativeHostWatchdog(
  alarms: AlarmScheduler = chrome.alarms,
): Promise<void> {
  const existing = await alarms.get(NATIVE_HOST_WATCHDOG_ALARM);
  if (existing) return;

  alarms.create(NATIVE_HOST_WATCHDOG_ALARM, {
    delayInMinutes: NATIVE_HOST_WATCHDOG_PERIOD_MINUTES,
    periodInMinutes: NATIVE_HOST_WATCHDOG_PERIOD_MINUTES,
  });
}
