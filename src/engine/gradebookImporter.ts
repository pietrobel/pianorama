import * as XLSX from 'xlsx';
import { DEFAULT_SOGLIE_FASCE } from '../domain/defaults';
import type {
  AnonymousStudentBandEntry,
  CategoriaBisognoAlunno,
  FasciaLivelloKey,
  LivelliPartenza,
  RiferimentoPianoAlunno,
  SoglieFasce,
} from '../domain/types';

export interface GradebookImportOptions {
  keepNames?: boolean;
}

export interface GradebookImportResult {
  classeRilevata: string;
  entries: AnonymousStudentBandEntry[];
  livelli: LivelliPartenza;
  daVerificareCount: number;
  headerRowIndex: number;
}

const KNOWN_GRADE_HEADER_KEYWORDS = [
  'orale',
  'scritto',
  'pratico',
  'voto',
  'voti',
  'prova',
  'prove',
  'verifica',
  'test',
  'compito',
  'grafica',
];

const IGNORED_ROW_PREFIXES = [
  'valutazioni',
  'totale',
  'media classe',
  'stampato il',
  'pagina ',
  'pag.',
  'docente',
  'dirigente',
  'firma',
  'legenda',
  'riepilogo',
];

const SURNAME_PARTICLES = new Set([
  'd',
  'da',
  'dal',
  'dalla',
  'dalle',
  'dallo',
  'de',
  'degli',
  'dei',
  'del',
  'della',
  'delle',
  'dello',
  'di',
  'la',
  'le',
  'li',
  'lo',
  'san',
  'santa',
  'santo',
  'mc',
  'mac',
  'van',
  'von',
]);

/**
 * Formatta nome e cognome con la prima lettera di ciascuna parola in maiuscolo
 * e le successive in minuscolo (es. "ROSSI MARIO" -> "Rossi Mario", "D'ANGELO LUCA" -> "D'Angelo Luca").
 */
export function formatStudentNameTitleCase(name: string): string {
  const trimmed = (name ?? '').trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';
  return trimmed
    .toLocaleLowerCase('it-IT')
    .replace(/(^|[\s\-’'])(\p{L})/giu, (_, sep: string, ch: string) => {
      return `${sep}${ch.toLocaleUpperCase('it-IT')}`;
    });
}

/**
 * Estrae eventuale numero di registro tra parentesi o prefisso numerico (es. "(1) ROSSI MARIO",
 * "Rossi Mario (12)", "(n. 3) D'ANGELO LUCA", "4. BIANCHI ANNA") e restituisce il nominativo
 * pulito senza numeri e formattato in Title Case.
 */
export function extractRegisterOrderAndCleanName(rawName: string): {
  cleanName: string;
  registerOrder: number | null;
} {
  const trimmed = (rawName ?? '').trim().replace(/\s+/g, ' ');
  if (!trimmed) return { cleanName: '', registerOrder: null };

  let registerOrder: number | null = null;
  const bracketMatches = [
    ...trimmed.matchAll(/[(（[]\s*(?:n[°º.]?\s*|nr\.?\s*)?(\d{1,4})[°º.]?\s*[)）\]]/gi),
  ];
  if (bracketMatches.length > 0) {
    const parsed = Number(bracketMatches[0][1]);
    if (Number.isFinite(parsed)) {
      registerOrder = parsed;
    }
  } else {
    const leadingMatch = trimmed.match(/^\s*(?:n[°º.]?\s*)?(\d{1,4})\s*[°º.):\-]\s+/i);
    if (leadingMatch) {
      const parsed = Number(leadingMatch[1]);
      if (Number.isFinite(parsed)) {
        registerOrder = parsed;
      }
    }
  }

  const withoutNumbers = trimmed
    .replace(/[(（[]\s*(?:n[°º.]?\s*|nr\.?\s*)?\d{1,4}[°º.]?\s*[)）\]]/gi, ' ')
    .replace(/^\s*(?:n[°º.]?\s*)?\d{1,4}\s*[°º.):\-]\s+/i, '')
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const cleanName = formatStudentNameTitleCase(withoutNumbers);
  return { cleanName, registerOrder };
}

/**
 * Normalizza Nome e Cognome completi letti dal registro elettronico,
 * rimuovendo eventuali numeri tra parentesi e formattando solo le iniziali in maiuscolo.
 */
export function formatFullStudentName(rawName: string): string {
  return extractRegisterOrderAndCleanName(rawName).cleanName;
}

/**
 * Estrae esclusivamente il cognome dell'alunno dai formati comuni dei registri elettronici
 * ("ROSSI MARIO", "ROSSI, Mario", "DE LUCA Anna Maria", "D'ANGELO Luca").
 */
export function extractCognomeOnly(rawName: string): string {
  const cleaned = rawName.trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';

  if (cleaned.includes(',')) {
    return cleaned.split(',')[0].trim();
  }

  const tokens = cleaned.split(' ');
  if (tokens.length <= 1) return tokens[0];

  const firstLower = tokens[0].toLowerCase().replace(/['’]/g, '');
  if (SURNAME_PARTICLES.has(firstLower)) {
    if (tokens.length >= 3) {
      const secondLower = tokens[1].toLowerCase().replace(/['’]/g, '');
      if (SURNAME_PARTICLES.has(secondLower)) {
        return `${tokens[0]} ${tokens[1]} ${tokens[2]}`;
      }
    }
    return `${tokens[0]} ${tokens[1]}`;
  }

  return tokens[0];
}

export function parseItalianDecimal(raw: unknown): number | null {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : null;
  }
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Gestisce formati come "6,5", "6.5", "7,25"
  const normalized = trimmed.replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Converte voti espressi nei registri scolastici italiani, inclusi "+" / "-" / "½" / "1/2" o frazioni tipo "6/7".
 */
function parseRegisterVoteValue(raw: unknown): number | null {
  const plain = parseItalianDecimal(raw);
  if (plain !== null) return plain;
  if (typeof raw !== 'string') return null;
  const s = raw.trim().replace(/\s+/g, ' ');
  if (!s) return null;

  const halfMatch = s.match(/^(\d{1,2})\s*(?:½|1\/2)$/);
  if (halfMatch) {
    const base = Number(halfMatch[1]);
    return Number.isFinite(base) ? base + 0.5 : null;
  }

  const plusMinusMatch = s.match(/^(\d{1,2}(?:[.,]\d+)?)\s*([+-])$/);
  if (plusMinusMatch) {
    const base = Number(plusMinusMatch[1].replace(',', '.'));
    if (Number.isFinite(base)) {
      return plusMinusMatch[2] === '+' ? base + 0.25 : base - 0.25;
    }
  }

  const slashMatch = s.match(/^(\d{1,2})\s*\/\s*(\d{1,2})$/);
  if (slashMatch) {
    const a = Number(slashMatch[1]);
    const b = Number(slashMatch[2]);
    if (Number.isFinite(a) && Number.isFinite(b) && a >= 1 && a <= 10 && b >= 1 && b <= 10) {
      return (a + b) / 2;
    }
  }

  return null;
}

export function classifyMediaToFascia(
  media: number | null,
  soglie: SoglieFasce = DEFAULT_SOGLIE_FASCE
): FasciaLivelloKey {
  if (media === null || !Number.isFinite(media) || media < soglie.sogliaMinimaValida) {
    return 'da_verificare';
  }
  if (media < soglie.sogliaMedioBasso) return 'basso';
  if (media < soglie.sogliaMedio) return 'medio_basso';
  if (media < soglie.sogliaAlto) return 'medio';
  return 'alto';
}

export function computeLivelliFromStudents(
  entries: AnonymousStudentBandEntry[]
): LivelliPartenza {
  const livelli: LivelliPartenza = {
    bassoAlunni: 0,
    medioBassoAlunni: 0,
    medioAlunni: 0,
    altoAlunni: 0,
  };

  for (const entry of entries) {
    switch (entry.fasciaCorrente) {
      case 'basso':
        livelli.bassoAlunni += 1;
        break;
      case 'medio_basso':
        livelli.medioBassoAlunni += 1;
        break;
      case 'medio':
        livelli.medioAlunni += 1;
        break;
      case 'alto':
        livelli.altoAlunni += 1;
        break;
      case 'da_verificare':
        // Non conteggiato finché il docente non lo sistema
        break;
    }
  }

  return livelli;
}

export function moveStudentToFascia(
  entries: AnonymousStudentBandEntry[],
  studentId: string,
  targetFascia: FasciaLivelloKey
): AnonymousStudentBandEntry[] {
  return entries.map((entry) => {
    if (entry.id !== studentId) return entry;
    return {
      ...entry,
      fasciaCorrente: targetFascia,
      spostatoDalDocente: targetFascia !== entry.fasciaAutomatica,
    };
  });
}

export function restoreAutomaticFasce(
  entries: AnonymousStudentBandEntry[],
  soglie: SoglieFasce = DEFAULT_SOGLIE_FASCE
): AnonymousStudentBandEntry[] {
  return entries.map((entry) => {
    const auto = classifyMediaToFascia(entry.media, soglie);
    return {
      ...entry,
      fasciaAutomatica: auto,
      fasciaCorrente: auto,
      spostatoDalDocente: false,
    };
  });
}

export function removeStudentFromFasce(
  entries: AnonymousStudentBandEntry[],
  studentId: string
): AnonymousStudentBandEntry[] {
  return entries.filter((entry) => entry.id !== studentId);
}

export function createManualStudentEntry(
  existingEntries: AnonymousStudentBandEntry[],
  data: {
    nominativo?: string;
    media: number | null;
    categoriaInclusione?: CategoriaBisognoAlunno;
    riferimentoPiano?: RiferimentoPianoAlunno;
    notaSensibileDocente?: string;
    fasciaManuale?: FasciaLivelloKey;
  },
  soglie: SoglieFasce = DEFAULT_SOGLIE_FASCE
): AnonymousStudentBandEntry {
  const nextOrdine =
    existingEntries.reduce((max, e) => Math.max(max, e.ordine), 0) + 1;
  const auto = classifyMediaToFascia(data.media, soglie);
  const current = data.fasciaManuale ?? auto;
  const parsed = extractRegisterOrderAndCleanName(data.nominativo ?? '');
  return {
    id:
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `alunno-${Date.now()}-${nextOrdine}`,
    ordine: nextOrdine,
    ordineRegistro: parsed.registerOrder ?? undefined,
    labelAnonimo: `Alunno ${nextOrdine}`,
    nominativo: parsed.cleanName || undefined,
    media: data.media,
    fasciaAutomatica: auto,
    fasciaCorrente: current,
    spostatoDalDocente: current !== auto,
    categoriaInclusione: data.categoriaInclusione ?? 'nessuno',
    riferimentoPiano: data.riferimentoPiano ?? '',
    notaSensibileDocente: data.notaSensibileDocente?.trim() ?? '',
  };
}

export function updateStudentDetails(
  entries: AnonymousStudentBandEntry[],
  studentId: string,
  patch: {
    nominativo?: string;
    media?: number | null;
    categoriaInclusione?: CategoriaBisognoAlunno;
    riferimentoPiano?: RiferimentoPianoAlunno;
    notaSensibileDocente?: string;
  },
  soglie: SoglieFasce = DEFAULT_SOGLIE_FASCE
): AnonymousStudentBandEntry[] {
  return entries.map((entry) => {
    if (entry.id !== studentId) return entry;
    const nextMedia = patch.media !== undefined ? patch.media : entry.media;
    const nextAuto = classifyMediaToFascia(nextMedia, soglie);
    const nextCurrent = entry.spostatoDalDocente ? entry.fasciaCorrente : nextAuto;
    const parsedName =
      patch.nominativo !== undefined
        ? extractRegisterOrderAndCleanName(patch.nominativo)
        : null;
    return {
      ...entry,
      ordineRegistro: parsedName
        ? (parsedName.registerOrder ?? entry.ordineRegistro)
        : entry.ordineRegistro,
      nominativo: parsedName ? parsedName.cleanName || undefined : entry.nominativo,
      media: nextMedia,
      fasciaAutomatica: nextAuto,
      fasciaCorrente: nextCurrent,
      spostatoDalDocente: nextCurrent !== nextAuto,
      categoriaInclusione:
        patch.categoriaInclusione !== undefined
          ? patch.categoriaInclusione
          : entry.categoriaInclusione,
      riferimentoPiano:
        patch.riferimentoPiano !== undefined
          ? patch.riferimentoPiano
          : entry.riferimentoPiano,
      notaSensibileDocente:
        patch.notaSensibileDocente !== undefined
          ? patch.notaSensibileDocente
          : entry.notaSensibileDocente,
    };
  });
}

function resolveSheetCell(
  sheet: XLSX.WorkSheet,
  r: number,
  c: number
): { value: unknown; isHorizontalContinuation: boolean } {
  const merges = sheet['!merges'] ?? [];
  for (const merge of merges) {
    if (r >= merge.s.r && r <= merge.e.r && c >= merge.s.c && c <= merge.e.c) {
      const topLeftAddr = XLSX.utils.encode_cell({ r: merge.s.r, c: merge.s.c });
      const topLeftCell = sheet[topLeftAddr];
      return {
        value: topLeftCell ? topLeftCell.v : undefined,
        isHorizontalContinuation: c > merge.s.c,
      };
    }
  }
  const addr = XLSX.utils.encode_cell({ r, c });
  const cell = sheet[addr];
  return {
    value: cell ? cell.v : undefined,
    isHorizontalContinuation: false,
  };
}

function normStr(val: unknown): string {
  return String(val ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function isFullNameHeader(text: string): boolean {
  if (!text) return false;
  if (
    text === 'alunno' ||
    text === 'alunni' ||
    text === 'alunno/a' ||
    text === 'studente' ||
    text === 'studenti' ||
    text === 'allievo' ||
    text === 'allievi' ||
    text === 'nominativo' ||
    text === 'nominativi' ||
    text === 'elenco alunni' ||
    text === 'cognome e nome' ||
    text === 'nome e cognome' ||
    text === 'cognome/nome' ||
    text === 'cognome nome' ||
    text === 'nome cognome'
  ) {
    return true;
  }
  return (
    text.startsWith('alunno') ||
    text.startsWith('alunni') ||
    text.startsWith('studente') ||
    text.startsWith('nominativo')
  );
}

function isMediaHeader(text: string): 'priority' | 'secondary' | false {
  if (!text) return false;
  if (
    text === 'media' ||
    text === 'media voti' ||
    text === 'media_voti' ||
    text === 'media finale' ||
    text === 'media generale' ||
    text === 'media aritmetica' ||
    text === 'media totale' ||
    text === 'voto medio'
  ) {
    return 'priority';
  }
  if (text.startsWith('media ') || text.startsWith('media_') || text.includes('voto medio')) {
    return 'secondary';
  }
  return false;
}

function isNonGradeColumnHeader(text: string): boolean {
  return (
    text.includes('assenze') ||
    text.includes('note') ||
    text.includes('giudizio') ||
    text.includes('n.') ||
    text === 'nr' ||
    text === 'n' ||
    text === 'prog' ||
    text === 'progressivo' ||
    text === 'classe' ||
    text === 'sezione' ||
    text.includes('data di nascita')
  );
}

function readWorkbookSmart(buffer: ArrayBuffer): XLSX.WorkBook {
  const bytes = new Uint8Array(buffer);
  const headText = new TextDecoder('utf-8', { fatal: false })
    .decode(bytes.slice(0, Math.min(bytes.length, 512)))
    .replace(/^\uFEFF/, '')
    .trimStart()
    .toLowerCase();

  // Alcuni registri elettronici (es. Argo/Axios) esportano tabelle HTML con estensione .xls
  if (
    headText.startsWith('<html') ||
    headText.startsWith('<!doctype') ||
    headText.startsWith('<table') ||
    headText.startsWith('<meta') ||
    (headText.startsWith('<?xml') && headText.includes('<html'))
  ) {
    let decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    if (/charset=(?:windows-1252|iso-8859-1|latin1)/i.test(headText) || decoded.includes('\uFFFD')) {
      try {
        decoded = new TextDecoder('windows-1252').decode(bytes);
      } catch {
        // mantieni decodifica UTF-8
      }
    }
    return XLSX.read(decoded, { type: 'string', raw: true });
  }

  return XLSX.read(buffer, { type: 'array', codepage: 65001 });
}

function parseSingleWorksheet(
  sheet: XLSX.WorkSheet,
  soglie: SoglieFasce,
  keepNames: boolean
): GradebookImportResult | null {
  const ref = sheet['!ref'];
  if (!ref) return null;

  const range = XLSX.utils.decode_range(ref);

  let headerRowIndex = -1;
  let alunnoCol = -1;
  let cognomeCol = -1;
  let nomeCol = -1;
  let mediaCol = -1;
  let gradeCols: number[] = [];

  for (let r = range.s.r; r <= range.e.r; r++) {
    let foundAlunno = -1;
    let foundCognome = -1;
    let foundNome = -1;
    let foundMedia = -1;
    let foundMediaPriority = false;
    const candidateGradeCols: number[] = [];

    for (let c = range.s.c; c <= range.e.c; c++) {
      const { value, isHorizontalContinuation } = resolveSheetCell(sheet, r, c);
      if (isHorizontalContinuation) continue;
      const text = normStr(value);
      if (!text) continue;

      if (foundAlunno === -1 && isFullNameHeader(text)) {
        foundAlunno = c;
      } else if (foundCognome === -1 && (text === 'cognome' || text.startsWith('cognome '))) {
        foundCognome = c;
      } else if (foundNome === -1 && (text === 'nome' || text.startsWith('nome '))) {
        foundNome = c;
      } else {
        const mediaMatch = isMediaHeader(text);
        if (mediaMatch === 'priority' && !foundMediaPriority) {
          foundMedia = c;
          foundMediaPriority = true;
        } else if (mediaMatch === 'secondary' && foundMedia === -1) {
          foundMedia = c;
        } else if (KNOWN_GRADE_HEADER_KEYWORDS.some((kw) => text.includes(kw))) {
          candidateGradeCols.push(c);
        }
      }
    }

    const primaryStudentCol = foundAlunno !== -1 ? foundAlunno : foundCognome;
    if (primaryStudentCol === -1) continue;

    // Se non ci sono colonne esplicite Media o keyword voti, verifica se le righe sotto contengono voti numerici
    let hasNumericGradesBelow = false;
    if (foundMedia === -1 && candidateGradeCols.length === 0) {
      const maxStudentCol = Math.max(primaryStudentCol, foundNome);
      const sampleLimit = Math.min(range.e.r, r + 8);
      for (let sr = r + 1; sr <= sampleLimit && !hasNumericGradesBelow; sr++) {
        for (let sc = maxStudentCol + 1; sc <= range.e.c; sc++) {
          const { value, isHorizontalContinuation } = resolveSheetCell(sheet, sr, sc);
          if (isHorizontalContinuation) continue;
          const v = parseRegisterVoteValue(value);
          if (v !== null && v >= 1 && v <= 10) {
            hasNumericGradesBelow = true;
            break;
          }
        }
      }
    }

    if (foundMedia !== -1 || candidateGradeCols.length > 0 || hasNumericGradesBelow) {
      headerRowIndex = r;
      alunnoCol = foundAlunno !== -1 ? foundAlunno : foundCognome;
      cognomeCol = foundCognome;
      nomeCol = foundNome;
      mediaCol = foundMedia;

      const excludedCols = new Set(
        [alunnoCol, cognomeCol, nomeCol, mediaCol].filter((idx) => idx !== -1)
      );
      const minGradeStartCol = Math.max(alunnoCol, cognomeCol, nomeCol);

      // Tutte le colonne non-studente, non-Media e non note/conteggi dopo la colonna nominativo possono contenere voti
      for (let c = range.s.c; c <= range.e.c; c++) {
        if (excludedCols.has(c)) continue;
        const { value, isHorizontalContinuation } = resolveSheetCell(sheet, r, c);
        if (isHorizontalContinuation) continue;
        const text = normStr(value);
        if (!text || isNonGradeColumnHeader(text)) continue;
        if (c > minGradeStartCol) {
          gradeCols.push(c);
        }
      }
      if (gradeCols.length === 0) {
        gradeCols = candidateGradeCols.filter((c) => !excludedCols.has(c));
      }
      break;
    }
  }

  if (headerRowIndex === -1 || alunnoCol === -1) {
    return null;
  }

  // Rileva eventuale titolo classe sopra la riga di intestazione
  let classeRilevata = '';
  for (let r = range.s.r; r < headerRowIndex; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const { value, isHorizontalContinuation } = resolveSheetCell(sheet, r, c);
      if (isHorizontalContinuation) continue;
      const raw = String(value ?? '').trim();
      if (!raw) continue;
      if (/^\d+[A-Za-z]\b/.test(raw) || raw.toUpperCase().includes('ORDINARIO')) {
        classeRilevata = raw;
        break;
      }
    }
    if (classeRilevata) break;
  }

  const entries: AnonymousStudentBandEntry[] = [];
  let counter = 0;

  for (let r = headerRowIndex + 1; r <= range.e.r; r++) {
    const primaryRaw = String(resolveSheetCell(sheet, r, alunnoCol).value ?? '').trim();
    const extraNomeRaw =
      cognomeCol !== -1 && nomeCol !== -1 && alunnoCol === cognomeCol
        ? String(resolveSheetCell(sheet, r, nomeCol).value ?? '').trim()
        : '';
    const alunnoRaw = [primaryRaw, extraNomeRaw].filter(Boolean).join(' ').trim();
    if (!alunnoRaw) continue;
    if (/^\d+(?:[.,]\d+)?$/.test(alunnoRaw)) continue;

    // Ignora righe di riepilogo e piè di pagina di stampa (controlla anche le colonne precedenti a alunnoCol)
    let isIgnoredRow = false;
    for (let checkCol = range.s.c; checkCol <= alunnoCol; checkCol++) {
      const checkVal = String(resolveSheetCell(sheet, r, checkCol).value ?? '')
        .trim()
        .toLowerCase();
      if (
        checkVal &&
        IGNORED_ROW_PREFIXES.some(
          (prefix) => checkVal.startsWith(prefix) || checkVal.includes('stampato il')
        )
      ) {
        isIgnoredRow = true;
        break;
      }
    }
    if (isIgnoredRow) {
      continue;
    }

    counter += 1;

    let media: number | null = null;
    if (mediaCol !== -1) {
      const mediaCell = resolveSheetCell(sheet, r, mediaCol);
      const parsedMedia = parseRegisterVoteValue(mediaCell.value);
      if (parsedMedia !== null && parsedMedia >= 0 && parsedMedia <= 10) {
        media = parsedMedia;
      }
    }

    // Se la colonna Media è vuota o non numerica, calcola la media aritmetica dei voti numerici tra 1 e 10
    if (media === null) {
      const validVotes: number[] = [];
      for (const gc of gradeCols) {
        const voteCell = resolveSheetCell(sheet, r, gc);
        if (voteCell.isHorizontalContinuation) continue;
        const parsedVote = parseRegisterVoteValue(voteCell.value);
        if (parsedVote !== null && parsedVote >= 1 && parsedVote <= 10) {
          validVotes.push(parsedVote);
        }
      }
      if (validVotes.length > 0) {
        const sum = validVotes.reduce((acc, v) => acc + v, 0);
        media = sum / validVotes.length;
      }
    }

    const { cleanName, registerOrder } = extractRegisterOrderAndCleanName(alunnoRaw);
    const fascia = classifyMediaToFascia(media, soglie);
    entries.push({
      id: `alunno-${counter}`,
      ordine: counter,
      ordineRegistro: keepNames && registerOrder !== null ? registerOrder : undefined,
      labelAnonimo: `Alunno ${counter}`,
      nominativo: keepNames ? cleanName || undefined : undefined,
      media,
      fasciaAutomatica: fascia,
      fasciaCorrente: fascia,
      spostatoDalDocente: false,
      categoriaInclusione: 'nessuno',
      riferimentoPiano: '',
      notaSensibileDocente: '',
    });
  }

  if (entries.length === 0) {
    return null;
  }

  const livelli = computeLivelliFromStudents(entries);
  const daVerificareCount = entries.filter((e) => e.fasciaCorrente === 'da_verificare').length;

  return {
    classeRilevata,
    entries,
    livelli,
    daVerificareCount,
    headerRowIndex,
  };
}

export function parseGradebookBuffer(
  buffer: ArrayBuffer,
  soglie: SoglieFasce = DEFAULT_SOGLIE_FASCE,
  options: GradebookImportOptions = {}
): GradebookImportResult {
  const keepNames = options.keepNames ?? true;
  const workbook = readWorkbookSmart(buffer);
  if (workbook.SheetNames.length === 0) {
    throw new Error('Il file Excel non contiene alcun foglio di lavoro.');
  }

  let hasAnyNonEmptySheet = false;
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet || !sheet['!ref']) continue;
    hasAnyNonEmptySheet = true;
    const parsed = parseSingleWorksheet(sheet, soglie, keepNames);
    if (parsed) {
      return parsed;
    }
  }

  if (!hasAnyNonEmptySheet) {
    throw new Error('Il file Excel è vuoto.');
  }

  throw new Error(
    'Intestazione del registro non riconosciuta: assicurarsi che il foglio contenga la colonna "Alunno" / "Alunni" / "Cognome" (e "Nome") e la colonna "Media" o le colonne dei voti.'
  );
}
