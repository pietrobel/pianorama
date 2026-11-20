export const OFFICIAL_PWA_URL = 'https://pianorama.vercel.app';

export type UpdateCheckStatus =
  | 'idle'
  | 'checking'
  | 'up_to_date'
  | 'update_available'
  | 'updating'
  | 'offline'
  | 'error';

export interface PWAUpdateState {
  needRefresh: boolean;
  offlineReady: boolean;
  status: UpdateCheckStatus;
  statusMessage: string | null;
  lastCheckedAt: string | null;
  currentBuildId: string;
  currentBuiltAt: string;
  remoteBuildId: string | null;
  bannerDismissed: boolean;
}

export interface RegisterSWOptionsLike {
  immediate?: boolean;
  onNeedRefresh?: () => void;
  onOfflineReady?: () => void;
  onRegisteredSW?: (swUrl: string, registration?: ServiceWorkerRegistration) => void;
  onRegisterError?: (error: unknown) => void;
}

export type RegisterSWFn = (
  options?: RegisterSWOptionsLike
) => (reloadPage?: boolean) => Promise<void>;

interface VersionPayload {
  buildId?: string;
  builtAt?: string;
}

function getEmbeddedBuildId(): string {
  return typeof __APP_BUILD_ID__ !== 'undefined' && __APP_BUILD_ID__
    ? __APP_BUILD_ID__
    : 'dev-local';
}

function getEmbeddedBuiltAt(): string {
  return typeof __APP_BUILT_AT__ !== 'undefined' && __APP_BUILT_AT__
    ? __APP_BUILT_AT__
    : '';
}

function createInitialState(): PWAUpdateState {
  return {
    needRefresh: false,
    offlineReady: false,
    status: 'idle',
    statusMessage: null,
    lastCheckedAt: null,
    currentBuildId: getEmbeddedBuildId(),
    currentBuiltAt: getEmbeddedBuiltAt(),
    remoteBuildId: null,
    bannerDismissed: false,
  };
}

let state: PWAUpdateState = createInitialState();
const listeners = new Set<() => void>();
let swRegistration: ServiceWorkerRegistration | undefined;
let updateSWFn: ((reloadPage?: boolean) => Promise<void>) | undefined;
let initialized = false;
let lastVisibilityCheckTs = 0;

function emit() {
  listeners.forEach((listener) => listener());
}

function setState(patch: Partial<PWAUpdateState>) {
  state = { ...state, ...patch };
  emit();
}

export function subscribePWAUpdate(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getPWAUpdateSnapshot(): PWAUpdateState {
  return state;
}

function waitForInstallingWorker(
  registration: ServiceWorkerRegistration,
  timeoutMs = 2000
): Promise<boolean> {
  if (registration.waiting) return Promise.resolve(true);
  const installing = registration.installing;
  if (!installing) return Promise.resolve(false);

  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (foundWaiting: boolean) => {
      if (settled) return;
      settled = true;
      installing.removeEventListener('statechange', onStateChange);
      clearTimeout(timer);
      resolve(foundWaiting);
    };

    const onStateChange = () => {
      if (registration.waiting || installing.state === 'installed') {
        finish(Boolean(registration.waiting));
      } else if (installing.state === 'redundant') {
        finish(false);
      }
    };

    const timer = setTimeout(() => finish(Boolean(registration.waiting)), timeoutMs);
    installing.addEventListener('statechange', onStateChange);
  });
}

export function initPWAUpdates(options: { registerSW?: RegisterSWFn }): void {
  if (initialized || typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }
  initialized = true;

  if (options.registerSW) {
    updateSWFn = options.registerSW({
      immediate: true,
      onNeedRefresh() {
        setState({
          needRefresh: true,
          status: 'update_available',
          bannerDismissed: false,
          statusMessage:
            'È disponibile una nuova versione di PIANORAMA: premi "Aggiorna" per applicarla mantenendo intatti i curricoli e i piani salvati.',
        });
      },
      onOfflineReady() {
        setState({ offlineReady: true });
      },
      onRegisteredSW(_swUrl, registration) {
        swRegistration = registration;
        if (registration?.waiting) {
          setState({
            needRefresh: true,
            status: 'update_available',
            bannerDismissed: false,
            statusMessage:
              'È disponibile una nuova versione di PIANORAMA: premi "Aggiorna" per installarla mantenendo i tuoi dati locali.',
          });
        }
      },
      onRegisterError() {
        // Fallback silenzioso in ambienti privi di Service Worker (es. anteprima dev)
      },
    });
  }

  window.addEventListener('online', () => {
    void checkForAppUpdates({ silent: true });
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      const now = Date.now();
      if (now - lastVisibilityCheckTs > 5 * 60 * 1000) {
        lastVisibilityCheckTs = now;
        void checkForAppUpdates({ silent: true });
      }
    }
  });
}

export async function checkForAppUpdates(options?: {
  silent?: boolean;
  fetchImpl?: typeof fetch;
  origin?: string;
  isOnline?: boolean;
}): Promise<UpdateCheckStatus> {
  const silent = Boolean(options?.silent);
  const online =
    options?.isOnline ?? (typeof navigator !== 'undefined' ? navigator.onLine : true);

  if (!online) {
    if (!silent) {
      setState({
        status: 'offline',
        statusMessage:
          'Sei offline: collegati a Internet per controllare gli aggiornamenti da pianorama.vercel.app.',
      });
    }
    return 'offline';
  }

  if (!silent) {
    setState({
      status: 'checking',
      statusMessage: 'Controllo aggiornamenti in corso...',
    });
  }

  try {
    if (swRegistration) {
      await swRegistration.update().catch(() => undefined);
      await waitForInstallingWorker(swRegistration);
      if (swRegistration.waiting) {
        setState({
          needRefresh: true,
          status: 'update_available',
          bannerDismissed: false,
          lastCheckedAt: new Date().toISOString(),
          statusMessage:
            'È disponibile una nuova versione di PIANORAMA: premi "Aggiorna" per installarla mantenendo tutti i curricoli e i piani salvati.',
        });
        return 'update_available';
      }
    }

    const fetchFn = options?.fetchImpl ?? (typeof fetch !== 'undefined' ? fetch : undefined);
    const origin =
      options?.origin ??
      (typeof window !== 'undefined' ? window.location.origin : OFFICIAL_PWA_URL);

    if (fetchFn && origin) {
      const res = await fetchFn(`${origin}/version.json?ts=${Date.now()}`, {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const contentType = res.headers.get('content-type') ?? '';
        if (contentType.includes('application/json')) {
          const payload = (await res.json()) as VersionPayload;
          if (payload?.buildId && payload.buildId !== state.currentBuildId) {
            if (swRegistration) {
              await swRegistration.update().catch(() => undefined);
              await waitForInstallingWorker(swRegistration, 1200);
            }
            setState({
              needRefresh: true,
              remoteBuildId: payload.buildId,
              status: 'update_available',
              bannerDismissed: false,
              lastCheckedAt: new Date().toISOString(),
              statusMessage:
                'È disponibile una nuova versione pubblicata su pianorama.vercel.app: premi "Aggiorna" per applicarla senza perdere i dati salvati.',
            });
            return 'update_available';
          }
        }
      }
    }

    if (state.needRefresh) {
      setState({
        status: 'update_available',
        lastCheckedAt: new Date().toISOString(),
        statusMessage:
          'È disponibile una nuova versione di PIANORAMA: premi "Aggiorna" per completare l’installazione.',
      });
      return 'update_available';
    }

    setState({
      status: silent ? state.status : 'up_to_date',
      lastCheckedAt: new Date().toISOString(),
      statusMessage: silent
        ? state.statusMessage
        : 'PIANORAMA è già aggiornata all’ultima versione disponibile.',
    });
    return 'up_to_date';
  } catch {
    if (!silent) {
      setState({
        status: 'error',
        lastCheckedAt: new Date().toISOString(),
        statusMessage:
          'Impossibile verificare gli aggiornamenti in questo momento. Riprova quando la connessione è stabile.',
      });
    }
    return 'error';
  }
}

async function clearStaticCachesWithoutTouchingIndexedDB(): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) return;
  try {
    const keys = await window.caches.keys();
    await Promise.all(keys.map((key) => window.caches.delete(key)));
  } catch {
    // Ignora errori eventuali di accesso alla Cache API
  }
}

export async function applyAppUpdate(options?: {
  reloadPage?: () => void;
}): Promise<'updating' | 'up_to_date' | 'offline' | 'error'> {
  if (typeof navigator !== 'undefined' && !navigator.onLine && !swRegistration?.waiting) {
    setState({
      status: 'offline',
      statusMessage:
        'Sei offline e non c’è nessun aggiornamento già scaricato in attesa. Collegati a Internet e riprova.',
    });
    return 'offline';
  }

  if (!state.needRefresh && !swRegistration?.waiting) {
    const checkResult = await checkForAppUpdates({ silent: false });
    if (checkResult !== 'update_available') {
      return checkResult === 'offline' ? 'offline' : checkResult === 'error' ? 'error' : 'up_to_date';
    }
  }

  setState({
    status: 'updating',
    statusMessage:
      'Aggiornamento di PIANORAMA in corso... Curricoli, programmazioni e dati locali restano al sicuro.',
  });

  const reload =
    options?.reloadPage ??
    (() => {
      if (typeof window !== 'undefined') window.location.reload();
    });

  try {
    if (swRegistration?.waiting && updateSWFn) {
      await updateSWFn(true);
      if (typeof window !== 'undefined') {
        window.setTimeout(() => {
          reload();
        }, 2500);
      }
      return 'updating';
    }

    if (swRegistration) {
      await swRegistration.update().catch(() => undefined);
      await waitForInstallingWorker(swRegistration, 1500);
      if (swRegistration.waiting && updateSWFn) {
        await updateSWFn(true);
        return 'updating';
      }
    }

    // Pulisce SOLO la Cache Storage HTTP (non IndexedDB/Dexie) prima di ricaricare i nuovi file
    await clearStaticCachesWithoutTouchingIndexedDB();
    reload();
    return 'updating';
  } catch {
    setState({
      status: 'error',
      statusMessage:
        'Errore durante l’applicazione dell’aggiornamento. Riprova o ricarica l’applicazione.',
    });
    return 'error';
  }
}

export function dismissUpdateBanner(): void {
  setState({ bannerDismissed: true });
}

export function clearUpdateStatusMessage(): void {
  setState({
    status: state.needRefresh ? 'update_available' : 'idle',
    statusMessage: null,
  });
}

export function resetPWAUpdateManagerForTests(overrides?: Partial<PWAUpdateState> & {
  registration?: ServiceWorkerRegistration;
  updateSW?: (reloadPage?: boolean) => Promise<void>;
}): void {
  state = {
    ...createInitialState(),
    ...overrides,
  };
  swRegistration = overrides?.registration;
  updateSWFn = overrides?.updateSW;
  initialized = false;
  emit();
}
