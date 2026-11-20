import { useSyncExternalStore } from 'react';
import {
  applyAppUpdate,
  checkForAppUpdates,
  clearUpdateStatusMessage,
  dismissUpdateBanner,
  getPWAUpdateSnapshot,
  subscribePWAUpdate,
} from '../pwa/pwaUpdateManager';

export function usePWAUpdate() {
  const snapshot = useSyncExternalStore(
    subscribePWAUpdate,
    getPWAUpdateSnapshot,
    getPWAUpdateSnapshot
  );

  return {
    ...snapshot,
    checkForUpdates: () => checkForAppUpdates({ silent: false }),
    applyUpdate: () => applyAppUpdate(),
    dismissBanner: dismissUpdateBanner,
    clearStatusMessage: clearUpdateStatusMessage,
  };
}
