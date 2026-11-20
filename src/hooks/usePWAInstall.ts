import { useEffect, useState } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

declare global {
  interface Window {
    __pianoramaDeferredInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

function checkIsStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function checkIsInIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    if (typeof window === 'undefined') return null;
    return window.__pianoramaDeferredInstallPrompt ?? null;
  });
  const [isInstalled, setIsInstalled] = useState<boolean>(() => checkIsStandalone());

  const [isIOS] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  });

  const [isInIframe] = useState<boolean>(() => checkIsInIframe());

  useEffect(() => {
    if (window.__pianoramaDeferredInstallPrompt) {
      setDeferredPrompt(window.__pianoramaDeferredInstallPrompt);
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      window.__pianoramaDeferredInstallPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
    };

    const onEarlyCapture = () => {
      if (window.__pianoramaDeferredInstallPrompt) {
        setDeferredPrompt(window.__pianoramaDeferredInstallPrompt);
      }
    };

    const onInstalled = () => {
      window.__pianoramaDeferredInstallPrompt = null;
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const onDisplayModeChange = () => {
      setIsInstalled(checkIsStandalone());
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('pianorama:install-available', onEarlyCapture);
    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener('pianorama:app-installed', onInstalled);
    mediaQuery.addEventListener('change', onDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('pianorama:install-available', onEarlyCapture);
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('pianorama:app-installed', onInstalled);
      mediaQuery.removeEventListener('change', onDisplayModeChange);
    };
  }, []);

  const triggerInstall = async (): Promise<boolean> => {
    const promptToUse = deferredPrompt ?? window.__pianoramaDeferredInstallPrompt ?? null;
    if (!promptToUse) return false;
    await promptToUse.prompt();
    const { outcome } = await promptToUse.userChoice;
    if (outcome === 'accepted') {
      window.__pianoramaDeferredInstallPrompt = null;
      setDeferredPrompt(null);
      setIsInstalled(true);
      return true;
    }
    return false;
  };

  return {
    canInstall: Boolean(deferredPrompt) && !isInstalled,
    isInstalled,
    isIOS,
    isInIframe,
    triggerInstall,
  };
}
