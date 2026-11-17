import type { BackupPlainData, PianoramaBackupEnvelope } from '../domain/types';

const PBKDF2_ITERATIONS = 250_000;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveAesKey(
  password: string,
  salt: Uint8Array,
  usage: KeyUsage[]
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    usage
  );
}

export async function createBackupEnvelope(
  data: BackupPlainData,
  password?: string
): Promise<PianoramaBackupEnvelope> {
  const exportedAt = new Date().toISOString();

  if (!password || !password.trim()) {
    return {
      format: 'pianorama-backup',
      version: 1,
      encrypted: false,
      exportedAt,
      payload: data,
    };
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(password, salt, ['encrypt']);

  const plaintextBytes = new TextEncoder().encode(JSON.stringify(data));
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    plaintextBytes
  );

  return {
    format: 'pianorama-backup',
    version: 1,
    encrypted: true,
    exportedAt,
    crypto: {
      algorithm: 'AES-GCM',
      kdf: 'PBKDF2',
      hash: 'SHA-256',
      iterations: PBKDF2_ITERATIONS,
      saltBase64: bytesToBase64(salt),
      ivBase64: bytesToBase64(iv),
    },
    ciphertextBase64: bytesToBase64(new Uint8Array(cipherBuffer)),
  };
}

export function parseBackupEnvelope(rawJson: string): PianoramaBackupEnvelope {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error('Il file selezionato non contiene un JSON valido.');
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Formato backup non riconosciuto.');
  }
  const env = parsed as Partial<PianoramaBackupEnvelope>;
  if (env.format !== 'pianorama-backup') {
    throw new Error('Il file non è un archivio PIANORAMA (.pianorama) valido.');
  }
  return env as PianoramaBackupEnvelope;
}

export async function decryptBackupEnvelope(
  envelope: PianoramaBackupEnvelope,
  password?: string
): Promise<BackupPlainData> {
  let data: BackupPlainData;

  if (!envelope.encrypted) {
    if (!envelope.payload) {
      throw new Error('Il backup in chiaro non contiene dati validi.');
    }
    data = envelope.payload;
  } else {
    if (!password || !password.trim()) {
      throw new Error('Questo backup è cifrato: inserisci la password per decifrarlo.');
    }
    if (!envelope.crypto || !envelope.ciphertextBase64) {
      throw new Error('Intestazione crittografica del backup incompleta o corrotta.');
    }
    const salt = base64ToBytes(envelope.crypto.saltBase64);
    const iv = base64ToBytes(envelope.crypto.ivBase64);
    const cipherBytes = base64ToBytes(envelope.ciphertextBase64);

    try {
      const key = await deriveAesKey(password, salt, ['decrypt']);
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
        key,
        cipherBytes.buffer as ArrayBuffer
      );
      const decodedText = new TextDecoder().decode(decryptedBuffer);
      data = JSON.parse(decodedText) as BackupPlainData;
    } catch {
      throw new Error('Password errata oppure file di backup danneggiato.');
    }
  }

  if (data.app !== 'PIANORAMA' || !Array.isArray(data.programmazioni)) {
    throw new Error('I dati contenuti nel backup non corrispondono alla struttura PIANORAMA.');
  }
  return data;
}

export interface BackupPreviewSummary {
  exportedAt: string;
  programmazioniCount: number;
  bozzeCount: number;
  completateCount: number;
  archiviateCount: number;
  libraryCount: number;
  rulesCount: number;
  schoolName: string;
}

export function summarizeBackupData(data: BackupPlainData): BackupPreviewSummary {
  return {
    exportedAt: data.exportedAt,
    programmazioniCount: data.programmazioni.length,
    bozzeCount: data.programmazioni.filter((p) => p.stato === 'bozza').length,
    completateCount: data.programmazioni.filter((p) => p.stato === 'completata').length,
    archiviateCount: data.programmazioni.filter((p) => p.stato === 'archiviata').length,
    libraryCount: data.library?.length ?? 0,
    rulesCount: data.rules?.length ?? 0,
    schoolName: data.settings?.schoolName || 'Istituto non specificato',
  };
}
