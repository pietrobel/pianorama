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
 * Normalizza Nome e Cognome completi letti dal registro elettronico
 * ("ROSSI, Mario" -> "ROSSI Mario", "  Rossi   Mario " -> "Rossi Mario").
 */
export function formatFullStudentName(rawName: string): string {
  const cleaned = rawName.trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';
  if (cleaned.includes(',')) {
    return cleaned
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .join(' ');
  }
  return cleaned;
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
  const cleanName = data.nominativo?.trim();
  return {
    id:
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `alunno-${Date.now()}-${nextOrdine}`,
    ordine: nextOrdine,
    labelAnonimo: `Alunno ${nextOrdine}`,
    nominativo: cleanName || undefined,
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
    return {
      ...entry,
      nominativo:
        patch.nominativo !== undefined
          ? patch.nominativo.trim() || undefined
          : entry.nominativo,
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
    .toLowerCase();
}

export function parseGradebookBuffer(
  buffer: ArrayBuffer,
  soglie: SoglieFasce = DEFAULT_SOGLIE_FASCE,
  options: GradebookImportOptions = {}
): GradebookImportResult {
  const keepNames = options.keepNames ?? true;
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('Il file Excel non contiene alcun foglio di lavoro.');
  }
  const sheet = workbook.Sheets[firstSheetName];
  const ref = sheet['!ref'];
  if (!ref) {
    throw new Error('Il primo foglio del file Excel è vuoto.');
  }

  const range = XLSX.utils.decode_range(ref);

  let headerRowIndex = -1;
  let alunnoCol = -1;
  let mediaCol = -1;
  let gradeCols: number[] = [];

  for (let r = range.s.r; r <= range.e.r; r++) {
    let foundAlunno = -1;
    let foundMedia = -1;
    const candidateGradeCols: number[] = [];

    for (let c = range.s.c; c <= range.e.c; c++) {
      const { value, isHorizontalContinuation } = resolveSheetCell(sheet, r, c);
      if (isHorizontalContinuation) continue;
      const text = normStr(value);
      if (!text) continue;

      if (foundAlunno === -1 && (text === 'alunno' || text.startsWith('alunno') || text === 'studente')) {
        foundAlunno = c;
      } else if (foundMedia === -1 && (text === 'media' || text.startsWith('media '))) {
        foundMedia = c;
      } else if (
        KNOWN_GRADE_HEADER_KEYWORDS.some((kw) => text.includes(kw))
      ) {
        candidateGradeCols.push(c);
      }
    }

    if (foundAlunno !== -1 && (foundMedia !== -1 || candidateGradeCols.length > 0)) {
      headerRowIndex = r;
      alunnoCol = foundAlunno;
      mediaCol = foundMedia;

      // Tutte le colonne non-Alunno, non-Media, non note/conteggi dopo alunnoCol possono contenere voti
      for (let c = range.s.c; c <= range.e.c; c++) {
        if (c === alunnoCol || c === mediaCol) continue;
        const { value, isHorizontalContinuation } = resolveSheetCell(sheet, r, c);
        if (isHorizontalContinuation) continue;
        const text = normStr(value);
        if (!text) continue;
        if (
          text.includes('assenze') ||
          text.includes('note') ||
          text.includes('giudizio') ||
          text.includes('n.') ||
          text === 'nr'
        ) {
          continue;
        }
        if (c > alunnoCol) {
          gradeCols.push(c);
        }
      }
      if (gradeCols.length === 0) {
        gradeCols = candidateGradeCols;
      }
      break;
    }
  }

  if (headerRowIndex === -1 || alunnoCol === -1) {
    throw new Error(
      'Intestazione del registro non riconosciuta: assicurarsi che il foglio contenga la colonna "Alunno" e la colonna "Media" (o colonne dei voti).'
    );
  }

  // Rileva eventuale titolo classe sopra la riga di intestazione (solo testo generico classe/disciplina, mai nomi)
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
    const alunnoCell = resolveSheetCell(sheet, r, alunnoCol);
    const alunnoRaw = String(alunnoCell.value ?? '').trim();
    if (!alunnoRaw) continue;

    const alunnoLower = alunnoRaw.toLowerCase();
    // Ignora righe di riepilogo e piè di pagina di stampa
    if (IGNORED_ROW_PREFIXES.some((prefix) => alunnoLower.startsWith(prefix) || alunnoLower.includes('stampato il'))) {
      continue;
    }

    // Il nome/cognome letto in alunnoRaw viene immediatamente scartato e sostituito da "Alunno N"
    counter += 1;

    let media: number | null = null;
    if (mediaCol !== -1) {
      const mediaCell = resolveSheetCell(sheet, r, mediaCol);
      const parsedMedia = parseItalianDecimal(mediaCell.value);
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
        const parsedVote = parseItalianDecimal(voteCell.value);
        if (parsedVote !== null && parsedVote >= 1 && parsedVote <= 10) {
          validVotes.push(parsedVote);
        }
      }
      if (validVotes.length > 0) {
        const sum = validVotes.reduce((acc, v) => acc + v, 0);
        media = sum / validVotes.length;
      }
    }

    const fullName = formatFullStudentName(alunnoRaw);
    const fascia = classifyMediaToFascia(media, soglie);
    entries.push({
      id: `alunno-${counter}`,
      ordine: counter,
      labelAnonimo: `Alunno ${counter}`,
      nominativo: keepNames ? fullName || undefined : undefined,
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
    throw new Error('Nessuna riga alunno valida trovata sotto la riga delle intestazioni.');
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
