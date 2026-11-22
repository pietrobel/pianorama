import type { SchoolSettings } from '../domain/types';

export type SaveTargetMode =
  | 'auto'
  | 'default_folder'
  | 'pick_folder'
  | 'browser_download';

export interface SaveFileResult {
  savedVia: 'directory_handle' | 'file_picker' | 'browser_download';
  filename: string;
  folderName?: string;
  cancelled?: boolean;
  warning?: string;
}

interface FsWindow {
  showDirectoryPicker?: (options?: {
    id?: string;
    mode?: 'read' | 'readwrite';
    startIn?: 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos';
  }) => Promise<FileSystemDirectoryHandle>;
  showSaveFilePicker?: (options?: {
    suggestedName?: string;
  }) => Promise<FileSystemFileHandle>;
}

interface PermissionAwareDirectoryHandle extends FileSystemDirectoryHandle {
  queryPermission?: (descriptor?: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>;
  requestPermission?: (descriptor?: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>;
}

const HANDLE_DB_NAME = 'PianoramaSaveDirectoryDB';
const HANDLE_STORE_NAME = 'handles';
const DEFAULT_DIR_KEY = 'defaultSaveDir';

function hasIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openHandleDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!hasIndexedDb()) {
      reject(new Error('IndexedDB non disponibile.'));
      return;
    }
    const req = indexedDB.open(HANDLE_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(HANDLE_STORE_NAME)) {
        db.createObjectStore(HANDLE_STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Impossibile aprire archivio cartelle.'));
  });
}

async function idbGetHandle(key: string): Promise<FileSystemDirectoryHandle | null> {
  if (!hasIndexedDb()) return null;
  try {
    const db = await openHandleDb();
    return await new Promise<FileSystemDirectoryHandle | null>((resolve, reject) => {
      const tx = db.transaction(HANDLE_STORE_NAME, 'readonly');
      const store = tx.objectStore(HANDLE_STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as FileSystemDirectoryHandle | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function idbSetHandle(key: string, handle: FileSystemDirectoryHandle | null): Promise<void> {
  if (!hasIndexedDb()) return;
  const db = await openHandleDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(HANDLE_STORE_NAME, 'readwrite');
    const store = tx.objectStore(HANDLE_STORE_NAME);
    const req = handle ? store.put(handle, key) : store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export function isDirectoryPickerSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return typeof (window as unknown as FsWindow).showDirectoryPicker === 'function';
}

export function isSaveFilePickerSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return typeof (window as unknown as FsWindow).showSaveFilePicker === 'function';
}

export async function getSavedDefaultDirectory(): Promise<{
  handle: FileSystemDirectoryHandle;
  name: string;
} | null> {
  const handle = await idbGetHandle(DEFAULT_DIR_KEY);
  if (!handle) return null;
  return { handle, name: handle.name || 'Cartella selezionata' };
}

export async function clearSavedDefaultDirectory(): Promise<void> {
  await idbSetHandle(DEFAULT_DIR_KEY, null);
}

async function ensureWritePermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  const permHandle = handle as PermissionAwareDirectoryHandle;
  if (typeof permHandle.queryPermission === 'function') {
    const current = await permHandle.queryPermission({ mode: 'readwrite' });
    if (current === 'granted') return true;
  }
  if (typeof permHandle.requestPermission === 'function') {
    const requested = await permHandle.requestPermission({ mode: 'readwrite' });
    return requested === 'granted';
  }
  return true;
}

export type PickDirectoryResult =
  | { status: 'selected'; name: string; handle: FileSystemDirectoryHandle }
  | { status: 'cancelled' }
  | { status: 'unsupported'; reason: string };

export async function pickAndSaveDefaultDirectory(): Promise<PickDirectoryResult> {
  const win = typeof window !== 'undefined' ? (window as unknown as FsWindow) : {};
  if (typeof win.showDirectoryPicker !== 'function') {
    return {
      status: 'unsupported',
      reason:
        'Questo browser non supporta la selezione diretta della cartella (funzionalità disponibile su Chrome, Edge e app desktop). Verrà usata la cartella Download del browser.',
    };
  }
  try {
    const handle = await win.showDirectoryPicker({
      id: 'pianorama-default-dir',
      mode: 'readwrite',
      startIn: 'documents',
    });
    const granted = await ensureWritePermission(handle);
    if (!granted) {
      return {
        status: 'unsupported',
        reason: 'Permesso di scrittura sulla cartella non concesso.',
      };
    }
    await idbSetHandle(DEFAULT_DIR_KEY, handle);
    return {
      status: 'selected',
      name: handle.name || 'Cartella selezionata',
      handle,
    };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { status: 'cancelled' };
    }
    if (err instanceof DOMException && err.name === 'SecurityError') {
      return {
        status: 'unsupported',
        reason:
          'La finestra integrata corrente blocca l’accesso diretto al file system: il salvataggio userà il download standard del browser.',
      };
    }
    return {
      status: 'unsupported',
      reason:
        err instanceof Error
          ? err.message
          : 'Impossibile selezionare la cartella di salvataggio.',
    };
  }
}

async function writeBlobInsideDirectory(
  dirHandle: FileSystemDirectoryHandle,
  filename: string,
  blob: Blob
): Promise<void> {
  const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}

export function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function saveBlobToFileSystem(
  blob: Blob,
  filename: string,
  mode: SaveTargetMode = 'auto',
  settings?: SchoolSettings
): Promise<SaveFileResult> {
  const win = typeof window !== 'undefined' ? (window as unknown as FsWindow) : {};

  let resolvedMode: Exclude<SaveTargetMode, 'auto'> =
    mode === 'auto'
      ? settings?.saveBehavior === 'ask_each_time'
        ? 'pick_folder'
        : settings?.saveBehavior === 'browser_download'
        ? 'browser_download'
        : 'default_folder'
      : mode;

  if (resolvedMode === 'default_folder') {
    const saved = await getSavedDefaultDirectory();
    if (saved) {
      try {
        const granted = await ensureWritePermission(saved.handle);
        if (granted) {
          await writeBlobInsideDirectory(saved.handle, filename, blob);
          return {
            savedVia: 'directory_handle',
            filename,
            folderName: saved.name,
          };
        }
      } catch {
        // Permesso negato o handle non più valido: passa al fallback
      }
    }
    if (settings?.saveBehavior === 'default_folder' && settings?.defaultSaveFolderName) {
      triggerBrowserDownload(blob, filename);
      return {
        savedVia: 'browser_download',
        filename,
        warning: `Impossibile accedere automaticamente alla cartella «${settings.defaultSaveFolderName}»: file scaricato nella cartella Download del browser.`,
      };
    }
    resolvedMode = 'browser_download';
  }

  if (resolvedMode === 'pick_folder') {
    if (typeof win.showDirectoryPicker === 'function') {
      try {
        const dirHandle = await win.showDirectoryPicker({
          id: 'pianorama-export-dir',
          mode: 'readwrite',
          startIn: 'documents',
        });
        const granted = await ensureWritePermission(dirHandle);
        if (granted) {
          await writeBlobInsideDirectory(dirHandle, filename, blob);
          return {
            savedVia: 'directory_handle',
            filename,
            folderName: dirHandle.name || 'Cartella selezionata',
          };
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return {
            savedVia: 'browser_download',
            filename,
            cancelled: true,
          };
        }
        // In ambiente iframe/bloccato tenta showSaveFilePicker o fallback download
      }
    }

    if (typeof win.showSaveFilePicker === 'function') {
      try {
        const fileHandle = await win.showSaveFilePicker({ suggestedName: filename });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        return {
          savedVia: 'file_picker',
          filename: fileHandle.name || filename,
        };
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return {
            savedVia: 'browser_download',
            filename,
            cancelled: true,
          };
        }
      }
    }

    triggerBrowserDownload(blob, filename);
    return {
      savedVia: 'browser_download',
      filename,
      warning:
        'La selezione della cartella non è disponibile in questo browser o riquadro: file scaricato nella cartella Download.',
    };
  }

  triggerBrowserDownload(blob, filename);
  return {
    savedVia: 'browser_download',
    filename,
  };
}
