import JSZip from 'jszip';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  createEmptyProgrammazione,
  DISCIPLINE_SECONDARIA,
  FONTI_RILEVAZIONE_OPTIONS,
  LIVELLI_CLASSE_OPTIONS,
  METODI_OPTIONS,
  MEZZI_INDIVIDUAZIONE_OPTIONS,
  MEZZI_STRUMENTI_OPTIONS,
  PLESSI_ISTITUTO,
  STRATEGIE_CONSOLIDAMENTO_OPTIONS,
  STRATEGIE_POTENZIAMENTO_OPTIONS,
  STRATEGIE_RECUPERO_OPTIONS,
  TIPOLOGIE_CLASSE_OPTIONS,
  VERIFICHE_ORALI_OPTIONS,
  VERIFICHE_SCRITTE_OPTIONS,
} from '../domain/defaults';
import type {
  AbilitaConoscenzaRow,
  ClasseSecondaria,
  DocenteGenere,
  Programmazione,
  SchoolSettings,
} from '../domain/types';

export interface ImportedDocumentSummary {
  fileName: string;
  fileType: 'pdf' | 'docx' | 'doc';
  extractedChars: number;
  tableRowsExtracted: number;
  sectionsMatched: string[];
}

export interface DocumentImportResult {
  plan: Programmazione;
  summary: ImportedDocumentSummary;
  warnings: string[];
  rawText: string;
}

interface ExtractedDocumentContent {
  lines: string[];
  tables: string[][][];
  fullText: string;
}

function makeId(prefix: string): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function cleanText(raw: string): string {
  return raw
    .replace(/\u00A0/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function decodeXmlEntities(xml: string): string {
  return xml
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(Number(num)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function stripXmlParagraphToText(pXml: string): string {
  // Converte eventuali tag di checkbox Unicode o symbol Wingdings in testo leggibile
  let normalized = pXml
    .replace(/<w:sym[^>]*w:char="F0FE"[^>]*\/>/gi, '☒')
    .replace(/<w:sym[^>]*w:char="F0A8"[^>]*\/>/gi, '☐')
    .replace(/<w:sym[^>]*w:char="00FE"[^>]*\/>/gi, '☒')
    .replace(/<w:sym[^>]*w:char="00A8"[^>]*\/>/gi, '☐')
    .replace(/<w:tab\/>/gi, '\t')
    .replace(/<w:br[^>]*\/>/gi, '\n');

  const textRuns: string[] = [];
  const tRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
  let match: RegExpExecArray | null;
  while ((match = tRegex.exec(normalized)) !== null) {
    textRuns.push(decodeXmlEntities(match[1]));
  }
  return cleanText(textRuns.join(''));
}

async function extractFromDocx(buffer: ArrayBuffer): Promise<ExtractedDocumentContent> {
  const zip = await JSZip.loadAsync(buffer);
  const docFile = zip.file('word/document.xml');
  if (!docFile) {
    throw new Error('Archivio DOCX non valido: file word/document.xml mancante.');
  }
  const xml = await docFile.async('string');
  const tables: string[][][] = [];
  const allLines: string[] = [];

  // Estrai tabelle <w:tbl>...</w:tbl>
  const tblRegex = /<w:tbl\b[^>]*>([\s\S]*?)<\/w:tbl>/g;
  let tblMatch: RegExpExecArray | null;
  while ((tblMatch = tblRegex.exec(xml)) !== null) {
    const tableXml = tblMatch[1];
    const rows: string[][] = [];
    const trRegex = /<w:tr\b[^>]*>([\s\S]*?)<\/w:tr>/g;
    let trMatch: RegExpExecArray | null;
    while ((trMatch = trRegex.exec(tableXml)) !== null) {
      const cells: string[] = [];
      const tcRegex = /<w:tc\b[^>]*>([\s\S]*?)<\/w:tc>/g;
      let tcMatch: RegExpExecArray | null;
      while ((tcMatch = tcRegex.exec(trMatch[1])) !== null) {
        const cellParagraphs: string[] = [];
        const pRegex = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
        let pMatch: RegExpExecArray | null;
        while ((pMatch = pRegex.exec(tcMatch[1])) !== null) {
          const t = stripXmlParagraphToText(pMatch[1]);
          if (t) cellParagraphs.push(t);
        }
        cells.push(cellParagraphs.join('\n').trim());
      }
      if (cells.some((c) => c.length > 0)) {
        rows.push(cells);
      }
    }
    if (rows.length > 0) {
      tables.push(rows);
    }
  }

  // Estrai tutti i paragrafi in ordine di lettura
  const allPRegex = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
  let pMatch: RegExpExecArray | null;
  while ((pMatch = allPRegex.exec(xml)) !== null) {
    const line = stripXmlParagraphToText(pMatch[1]);
    if (line) allLines.push(line);
  }

  return {
    lines: allLines,
    tables,
    fullText: allLines.join('\n'),
  };
}

interface PdfTextToken {
  str: string;
  x: number;
  y: number;
}

async function extractFromPdf(buffer: ArrayBuffer): Promise<ExtractedDocumentContent> {
  let pdfjsModule: typeof import('pdfjs-dist');
  const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

  if (isBrowser) {
    pdfjsModule = await import('pdfjs-dist');
    pdfjsModule.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  } else {
    pdfjsModule = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as unknown as typeof import('pdfjs-dist');
  }

  const dataCopy = new Uint8Array(buffer.slice(0));
  const loadingTask = pdfjsModule.getDocument({
    data: dataCopy,
    verbosity: 0,
    useSystemFonts: true,
  });

  const pdfDoc = await loadingTask.promise;
  const lines: string[] = [];

  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const tokens: PdfTextToken[] = [];

    for (const item of textContent.items) {
      if (!('str' in item) || !item.str) continue;
      const transform = (item as { transform?: number[] }).transform;
      const x = Array.isArray(transform) ? Number(transform[4] ?? 0) : 0;
      const y = Array.isArray(transform) ? Number(transform[5] ?? 0) : 0;
      tokens.push({ str: item.str, x, y });
    }

    // Raggruppa i token per coordinata Y simile (entro 2.8pt) in ordine dall'alto al basso
    tokens.sort((a, b) => {
      if (Math.abs(b.y - a.y) > 2.8) return b.y - a.y;
      return a.x - b.x;
    });

    const rowGroups: PdfTextToken[][] = [];
    for (const tok of tokens) {
      const lastRow = rowGroups[rowGroups.length - 1];
      if (lastRow && Math.abs(lastRow[0].y - tok.y) <= 2.8) {
        lastRow.push(tok);
      } else {
        rowGroups.push([tok]);
      }
    }

    for (const row of rowGroups) {
      row.sort((a, b) => a.x - b.x);
      let rowStr = '';
      let prevEnd = row[0].x;
      for (let i = 0; i < row.length; i++) {
        const tok = row[i];
        if (i > 0) {
          const gap = tok.x - prevEnd;
          if (gap > 22) {
            rowStr += ' | ';
          } else if (gap > 2 && !rowStr.endsWith(' ') && !tok.str.startsWith(' ')) {
            rowStr += ' ';
          }
        }
        rowStr += tok.str;
        prevEnd = tok.x + tok.str.length * 4.2;
      }
      const cleaned = rowStr.replace(/\s+\|\s+/g, ' | ').trim();
      if (cleaned) lines.push(cleaned);
    }
  }

  return {
    lines,
    tables: [],
    fullText: lines.join('\n'),
  };
}

function stripRtfFormatting(rtf: string): string {
  // Gestisce sequenze escape esadecimali \'xx (CP1252) e gruppi comuni
  const withHex = rtf.replace(/\\'([0-9a-fA-F]{2})/g, (_, hex) => {
    const code = parseInt(hex, 16);
    return String.fromCharCode(code);
  });
  return withHex
    .replace(/\\par[d]?/g, '\n')
    .replace(/\\line\b/g, '\n')
    .replace(/\\tab\b/g, '\t')
    .replace(/\\u(-?\d+)\??/g, (_, u) => {
      const code = Number(u);
      return String.fromCharCode(code < 0 ? code + 65536 : code);
    })
    .replace(/\{\\\*\\[^}]+\}/g, '')
    .replace(/\\[a-zA-Z]+-?\d* ?/g, '')
    .replace(/[{}]/g, '')
    .replace(/\r\n/g, '\n');
}

function stripHtmlTags(html: string): string {
  return decodeXmlEntities(
    html
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<(tr|p|div|li|h[1-6]|br)\b[^>]*>/gi, '\n')
      .replace(/<td\b[^>]*>/gi, ' | ')
      .replace(/<[^>]+>/g, ' ')
  );
}

function extractReadableRunsFromLegacyBinaryDoc(bytes: Uint8Array): string {
  const chunks: string[] = [];

  // 1. Prova estrazione testo ASCII/CP1252 esteso
  const decoderLatin = new TextDecoder('windows-1252', { fatal: false });
  const latinText = decoderLatin.decode(bytes);
  const latinRuns = latinText.match(/[A-Za-zÀ-ÖØ-öø-ÿ0-9.,;:!?'"()/\-–—%° \t]{10,}/g) ?? [];
  for (const run of latinRuns) {
    const cleaned = run.replace(/\s+/g, ' ').trim();
    if (
      cleaned.length >= 12 &&
      /[AEIOUaeiouàèéìòù]{2,}|PROGRAMMAZIONE|COMPETENZE|ABILIT|CONOSCENZ|CLASSE|DOCENTE/i.test(cleaned) &&
      !/Microsoft Word|Times New Roman|Calibri|Cambria|Normal\.dotm|Root Entry/i.test(cleaned)
    ) {
      chunks.push(cleaned);
    }
  }

  // 2. Prova estrazione UTF-16LE (Word 97-2003 spesso salva il testo Unicode in UTF-16LE)
  const decoderUtf16 = new TextDecoder('utf-16le', { fatal: false });
  const utf16Text = decoderUtf16.decode(bytes);
  const utf16Runs = utf16Text.match(/[A-Za-zÀ-ÖØ-öø-ÿ0-9.,;:!?'"()/\-–—%° \t]{10,}/g) ?? [];
  for (const run of utf16Runs) {
    const cleaned = run.replace(/\s+/g, ' ').trim();
    if (
      cleaned.length >= 12 &&
      /[AEIOUaeiouàèéìòù]/.test(cleaned) &&
      !/Microsoft Word|Times New Roman|Calibri|Root Entry/i.test(cleaned)
    ) {
      chunks.push(cleaned);
    }
  }

  // Deduplica mantenendo ordine
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const c of chunks) {
    if (!seen.has(c)) {
      seen.add(c);
      unique.push(c);
    }
  }
  return unique.join('\n');
}

async function extractFromLegacyDoc(buffer: ArrayBuffer): Promise<ExtractedDocumentContent> {
  const bytes = new Uint8Array(buffer);

  // Alcuni file .doc salvati da suite recenti sono in realtà ZIP/DOCX rinominati (magic PK)
  if (bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b) {
    return extractFromDocx(buffer);
  }

  const headText = new TextDecoder('latin1').decode(bytes.slice(0, Math.min(bytes.length, 4096)));

  let rawText = '';
  if (headText.trimStart().startsWith('{\\rtf')) {
    rawText = stripRtfFormatting(new TextDecoder('windows-1252', { fatal: false }).decode(bytes));
  } else if (/<html|<body|<table/i.test(headText)) {
    rawText = stripHtmlTags(new TextDecoder('utf-8', { fatal: false }).decode(bytes));
  } else {
    rawText = extractReadableRunsFromLegacyBinaryDoc(bytes);
  }

  const lines = rawText
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l.length > 0);

  return {
    lines,
    tables: [],
    fullText: lines.join('\n'),
  };
}

function matchCheckedOption(fullText: string, option: string): boolean {
  const escaped = option.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `(?:☒|☑|✔|●|\\[\\s*[xX]\\s*\\]|\\([xX]\\)|\\bx\\s+)\\s*${escaped}`,
    'i'
  );
  return pattern.test(fullText);
}

function extractSectionSlice(fullText: string, startRegex: RegExp, endRegexList: RegExp[]): string {
  const startMatch = startRegex.exec(fullText);
  if (!startMatch) return '';
  const startIdx = startMatch.index + startMatch[0].length;
  const rest = fullText.slice(startIdx);
  let minEnd = rest.length;
  for (const endRx of endRegexList) {
    const m = endRx.exec(rest);
    if (m && m.index < minEnd) {
      minEnd = m.index;
    }
  }
  return rest.slice(0, minEnd).trim();
}

function detectDisciplina(fullText: string, fallback: string): string {
  const titleMatch = fullText.match(/PROGRAMMAZIONE\s+DISCIPLINARE\s+di\s+([^\n|]+)/i);
  const discFieldMatch = fullText.match(/DISCIPLINA\s*[:\-]\s*([^\n|]+)/i);
  const candidate = (discFieldMatch?.[1] || titleMatch?.[1] || '').trim();
  if (candidate) {
    const exactKnown = DISCIPLINE_SECONDARIA.find(
      (d) => candidate.toLowerCase().includes(d.toLowerCase())
    );
    if (exactKnown) return exactKnown;
    return candidate.replace(/[._]{3,}/g, '').trim() || fallback;
  }
  for (const disc of DISCIPLINE_SECONDARIA) {
    if (new RegExp(`\\b${disc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(fullText)) {
      return disc;
    }
  }
  return fallback;
}

function detectClasseAndSezione(fullText: string): { classe?: ClasseSecondaria; sezione?: string } {
  const m = fullText.match(
    /CLASSE\s*[:\-]\s*(Prima|Seconda|Terza|I{1,3}|1\s*[°ª]?|2\s*[°ª]?|3\s*[°ª]?)(?:\s*(?:SEZ(?:IONE)?\.?\s*[:\-]?\s*)?([A-Z]))?/i
  );
  if (!m) return {};
  const rawClasse = m[1].toUpperCase().replace(/[°ª\s]/g, '');
  let classe: ClasseSecondaria | undefined;
  if (rawClasse === 'PRIMA' || rawClasse === 'I' || rawClasse === '1') classe = 'Prima';
  else if (rawClasse === 'SECONDA' || rawClasse === 'II' || rawClasse === '2') classe = 'Seconda';
  else if (rawClasse === 'TERZA' || rawClasse === 'III' || rawClasse === '3') classe = 'Terza';
  const sezione = m[2] ? m[2].toUpperCase() : undefined;
  return { classe, sezione };
}

function detectCurriculumRowsFromTables(tables: string[][][]): AbilitaConoscenzaRow[] {
  const rows: AbilitaConoscenzaRow[] = [];
  for (const table of tables) {
    if (table.length < 2) continue;
    const header = table[0].map((c) => c.toLowerCase());
    const hasCurriculumHeader = header.some(
      (h) =>
        h.includes('abilit') ||
        h.includes('obiettiv') ||
        h.includes('conoscenz') ||
        h.includes('contenut') ||
        h.includes('competen')
    );
    if (!hasCurriculumHeader) continue;

    const compCol = header.findIndex((h) => h.includes('competen') || h.includes('traguard'));
    const abCol = header.findIndex((h) => h.includes('abilit') || h.includes('obiettiv'));
    const conCol = header.findIndex((h) => h.includes('conoscenz') || h.includes('contenut'));

    for (let r = 1; r < table.length; r++) {
      const cells = table[r];
      const competenze = compCol !== -1 ? (cells[compCol] ?? '').trim() : '';
      const abilita = abCol !== -1 ? (cells[abCol] ?? '').trim() : cells.length === 2 ? (cells[0] ?? '').trim() : '';
      const conoscenze = conCol !== -1 ? (cells[conCol] ?? '').trim() : cells.length >= 2 ? (cells[cells.length - 1] ?? '').trim() : '';

      if (!competenze && !abilita && !conoscenze) continue;
      if (
        /nessuna riga abilità|nessuna conoscenza/i.test(`${abilita} ${conoscenze}`)
      ) {
        continue;
      }
      rows.push({
        id: makeId('imp-row'),
        competenze: competenze || undefined,
        abilita,
        conoscenze,
      });
    }
  }
  return rows;
}

function detectCurriculumRowsFromLines(lines: string[], fullText: string): AbilitaConoscenzaRow[] {
  // 1. Cerca blocchi nella sezione TRAGUARDI / CURRICOLO / PROGRAMMA
  const sectionText = extractSectionSlice(
    fullText,
    /(?:TRAGUARDI PER LO SVILUPPO DELLE COMPETENZE|OBIETTIVI DI APPRENDIMENTO|PROGRAMMAZIONE DIDATTICA|CONTENUTI E ABILIT[ÀA'])/i,
    [
      /CRITERI METODOLOGICI/i,
      /METODI\s*\|?\s*MEZZI/i,
      /VERIFICHE IN ITINERE/i,
    ]
  );

  const sourceLines = (sectionText ? sectionText.split('\n') : lines)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const rows: AbilitaConoscenzaRow[] = [];

  // Cerca righe con separatore di colonna " | " che contengono 2 o 3 colonne non banali
  let inCurricoloHeader = false;
  for (const line of sourceLines) {
    const lower = line.toLowerCase();
    if (
      (lower.includes('abilit') || lower.includes('obiettiv')) &&
      (lower.includes('conoscenz') || lower.includes('contenut'))
    ) {
      inCurricoloHeader = true;
      continue;
    }
    if (lower.startsWith('attività programmate:') || lower.startsWith('criteri metodologici')) {
      inCurricoloHeader = false;
    }

    if (inCurricoloHeader && line.includes(' | ')) {
      const parts = line
        .split(' | ')
        .map((p) => p.trim())
        .filter(Boolean);
      if (parts.length >= 3) {
        rows.push({
          id: makeId('imp-row'),
          competenze: parts[0],
          abilita: parts[1],
          conoscenze: parts.slice(2).join(' '),
        });
        continue;
      }
      if (parts.length === 2 && !/nessuna riga|nessuna conoscenza/i.test(line)) {
        rows.push({
          id: makeId('imp-row'),
          competenze: '',
          abilita: parts[0],
          conoscenze: parts[1],
        });
        continue;
      }
    }
  }

  if (rows.length > 0) return rows;

  // Fallback: cerca elenchi puntati o blocchi dopo "Abilità:" / "Conoscenze:" / "Contenuti:"
  const competenzeBuf: string[] = [];
  const abilitaBuf: string[] = [];
  const conoscenzeBuf: string[] = [];

  let activeCol: 'comp' | 'ab' | 'con' | null = null;
  for (const line of sourceLines) {
    const lower = line.toLowerCase();
    if (/^(?:competenze|traguardi\b)/.test(lower)) {
      activeCol = 'comp';
      const rest = line.replace(/^(?:competenze(?:\s+attese)?|traguardi[^:]*)\s*[:\-]?\s*/i, '').trim();
      if (rest) competenzeBuf.push(rest);
      continue;
    }
    if (/^(?:abilit[àa']|obiettivi(?:\s+specifici)?)/.test(lower)) {
      activeCol = 'ab';
      const rest = line.replace(/^(?:abilit[àa']|obiettivi(?:\s+specifici)?)\s*[:\-]?\s*/i, '').trim();
      if (rest) abilitaBuf.push(rest);
      continue;
    }
    if (/^(?:conoscenze|contenuti(?:\s+disciplinari)?|argomenti)/.test(lower)) {
      activeCol = 'con';
      const rest = line.replace(/^(?:conoscenze|contenuti(?:\s+disciplinari)?|argomenti)\s*[:\-]?\s*/i, '').trim();
      if (rest) conoscenzeBuf.push(rest);
      continue;
    }
    if (
      activeCol &&
      !/^tenuto conto della/i.test(lower) &&
      !/^nessuna riga/i.test(lower) &&
      line.length > 3
    ) {
      if (activeCol === 'comp') competenzeBuf.push(line);
      else if (activeCol === 'ab') abilitaBuf.push(line);
      else conoscenzeBuf.push(line);
    }
  }

  if (competenzeBuf.length || abilitaBuf.length || conoscenzeBuf.length) {
    rows.push({
      id: makeId('imp-row'),
      competenze: competenzeBuf.join('\n'),
      abilita: abilitaBuf.join('\n'),
      conoscenze: conoscenzeBuf.join('\n'),
    });
  } else if (sectionText) {
    // Ultimo fallback per vecchi PDF discorsivi: conserva i contenuti del programma nella riga curricolo
    const cleanedProgram = sourceLines
      .filter((l) => l.length > 8 && !/^tenuto conto/i.test(l))
      .slice(0, 40)
      .join('\n');
    if (cleanedProgram.length > 20) {
      rows.push({
        id: makeId('imp-row'),
        competenze: 'Competenze disciplinari importate dal documento',
        abilita: 'Obiettivi e abilità importati dal documento',
        conoscenze: cleanedProgram,
      });
    }
  }

  return rows;
}

export async function importProgrammazioneFromBuffer(
  buffer: ArrayBuffer,
  fileName: string,
  settings: SchoolSettings,
  existingPlan?: Programmazione
): Promise<DocumentImportResult> {
  const extLower = fileName.split('.').pop()?.toLowerCase() ?? '';
  const fileType: 'pdf' | 'docx' | 'doc' =
    extLower === 'pdf' ? 'pdf' : extLower === 'docx' ? 'docx' : 'doc';

  let extracted: ExtractedDocumentContent;
  if (fileType === 'pdf') {
    extracted = await extractFromPdf(buffer);
  } else if (fileType === 'docx') {
    extracted = await extractFromDocx(buffer);
  } else {
    extracted = await extractFromLegacyDoc(buffer);
  }

  const { fullText, lines, tables } = extracted;
  const warnings: string[] = [];

  if (!fullText.trim()) {
    throw new Error(
      fileType === 'pdf'
        ? 'Il PDF non contiene testo selezionabile (potrebbe essere una scansione immagine).'
        : 'Impossibile estrarre contenuto testuale leggibile dal file selezionato.'
    );
  }

  const basePlan: Programmazione = existingPlan
    ? structuredClone(existingPlan)
    : createEmptyProgrammazione(settings);

  const sectionsMatched: string[] = [];

  // 1. Dati Generali
  const disciplina = detectDisciplina(fullText, basePlan.datiGenerali.disciplina);
  const { classe, sezione } = detectClasseAndSezione(fullText);
  const asMatch = fullText.match(/(?:ANNO\s+SCOLASTICO|A\.?\s*S\.?)\s*[:\-]\s*(\d{4}\s*\/\s*\d{2,4})/i);
  const plessoMatch = fullText.match(/PLESSO\s+(?:DI\s*)?[:\-]\s*([A-Za-zÀ-ÿ' ]{3,30})/i);
  const docenteMatch = fullText.match(
    /(?:DOCENTE|La docente|Il docente)\s*[:\-]?\s*((?:Prof\.?\s*ssa|Prof\.?)?\s*[A-Za-zÀ-ÿ' ]{3,50})/i
  );

  let docenteName = basePlan.datiGenerali.docente;
  let docenteGenere: DocenteGenere = basePlan.datiGenerali.docenteGenere ?? settings.defaultDocenteGenere ?? 'F';
  if (docenteMatch?.[1]) {
    const rawDoc = docenteMatch[1].replace(/[_\n|].*$/, '').trim();
    if (/prof\.?\s*ssa|la\s+docente/i.test(docenteMatch[0])) docenteGenere = 'F';
    else if (/\bprof\.?\b|il\s+docente/i.test(docenteMatch[0])) docenteGenere = 'M';
    const stripped = rawDoc.replace(/^(?:Prof\.?\s*ssa|Prof\.?)\s+/i, '').trim();
    if (stripped && stripped.length > 2) docenteName = stripped;
  }

  if (disciplina) {
    basePlan.datiGenerali.disciplina = disciplina;
    basePlan.datiGenerali.titoloDisciplina = disciplina;
    sectionsMatched.push('Dati generali');
  }
  if (classe) basePlan.datiGenerali.classe = classe;
  if (sezione) basePlan.datiGenerali.sezione = sezione;
  if (asMatch?.[1]) basePlan.datiGenerali.annoScolastico = asMatch[1].replace(/\s+/g, '');
  if (plessoMatch?.[1]) {
    const cleanPlesso = plessoMatch[1].trim();
    const matchedPlesso = PLESSI_ISTITUTO.find((p) =>
      cleanPlesso.toLowerCase().includes(p.toLowerCase())
    );
    basePlan.datiGenerali.plesso = matchedPlesso ?? cleanPlesso;
  }
  basePlan.datiGenerali.docente = docenteName;
  basePlan.datiGenerali.docenteGenere = docenteGenere;
  basePlan.verificheValutazione.firmaDocente = docenteName;

  // 2. Composizione della classe
  const compTable = tables.find((t) =>
    t[0]?.some((c) => /alunni/i.test(c)) && t[0]?.some((c) => /maschi/i.test(c))
  );
  if (compTable && compTable[1]?.length >= 5) {
    const nums = compTable[1].map((c) => parseInt(c.replace(/\D/g, ''), 10));
    if (!Number.isNaN(nums[0])) basePlan.composizione.alunni = nums[0];
    if (!Number.isNaN(nums[1])) basePlan.composizione.maschi = nums[1];
    if (!Number.isNaN(nums[2])) basePlan.composizione.femmine = nums[2];
    if (!Number.isNaN(nums[3])) basePlan.composizione.ripetenti = nums[3];
    if (!Number.isNaN(nums[4])) basePlan.composizione.bes = nums[4];
    sectionsMatched.push('Composizione');
  } else {
    const compLine = lines.find((l) => /^\d+\s*\|\s*\d+\s*\|\s*\d+\s*\|\s*\d+\s*\|\s*\d+/.test(l));
    if (compLine) {
      const nums = compLine.split('|').map((p) => parseInt(p.trim(), 10));
      if (nums.length >= 5 && nums.every((n) => !Number.isNaN(n))) {
        basePlan.composizione = {
          alunni: nums[0],
          maschi: nums[1],
          femmine: nums[2],
          ripetenti: nums[3],
          bes: nums[4],
        };
        sectionsMatched.push('Composizione');
      }
    } else {
      const alunniM = fullText.match(/\bAlunni(?:\s+totali)?\s*[:\-]\s*(\d{1,2})\b/i);
      const maschiM = fullText.match(/\bMaschi\s*[:\-]\s*(\d{1,2})\b/i);
      const femmineM = fullText.match(/\bFemmine\s*[:\-]\s*(\d{1,2})\b/i);
      const ripM = fullText.match(/\bRipetenti\s*[:\-]\s*(\d{1,2})\b/i);
      const besM = fullText.match(/\bBES\s*[:\-]\s*(\d{1,2})\b/i);
      if (alunniM || maschiM || femmineM) {
        if (alunniM) basePlan.composizione.alunni = Number(alunniM[1]);
        if (maschiM) basePlan.composizione.maschi = Number(maschiM[1]);
        if (femmineM) basePlan.composizione.femmine = Number(femmineM[1]);
        if (ripM) basePlan.composizione.ripetenti = Number(ripM[1]);
        if (besM) basePlan.composizione.bes = Number(besM[1]);
        sectionsMatched.push('Composizione');
      }
    }
  }

  // 3. Checkbox della situazione, mezzi, fonti, strategie, metodi, verifiche
  const checkedTipologie = TIPOLOGIE_CLASSE_OPTIONS.filter((o) => matchCheckedOption(fullText, o));
  if (checkedTipologie.length > 0) basePlan.situazione.tipologie = checkedTipologie;

  const checkedLivello = LIVELLI_CLASSE_OPTIONS.find((o) => matchCheckedOption(fullText, o.label));
  if (checkedLivello) basePlan.situazione.livello = checkedLivello.value;

  const checkedMezzi = MEZZI_INDIVIDUAZIONE_OPTIONS.filter((o) => matchCheckedOption(fullText, o));
  if (checkedMezzi.length > 0) basePlan.situazione.mezziIndividuazione = checkedMezzi;

  const checkedFonti = FONTI_RILEVAZIONE_OPTIONS.filter((o) => matchCheckedOption(fullText, o));
  if (checkedFonti.length > 0) basePlan.analisiPartenza.fontiRilevazione = checkedFonti;

  const checkedPot = STRATEGIE_POTENZIAMENTO_OPTIONS.filter((o) => matchCheckedOption(fullText, o));
  if (checkedPot.length > 0) basePlan.interventi.potenziamento = checkedPot;

  const checkedCons = STRATEGIE_CONSOLIDAMENTO_OPTIONS.filter((o) => matchCheckedOption(fullText, o));
  if (checkedCons.length > 0) basePlan.interventi.consolidamento = checkedCons;

  const checkedRec = STRATEGIE_RECUPERO_OPTIONS.filter((o) => matchCheckedOption(fullText, o));
  if (checkedRec.length > 0) basePlan.interventi.recupero = checkedRec;

  const checkedMetodi = METODI_OPTIONS.filter((o) => matchCheckedOption(fullText, o));
  if (checkedMetodi.length > 0) basePlan.metodiStrumenti.metodi = checkedMetodi;

  const checkedStrumenti = MEZZI_STRUMENTI_OPTIONS.filter((o) => matchCheckedOption(fullText, o));
  if (checkedStrumenti.length > 0) basePlan.metodiStrumenti.mezziEStrumenti = checkedStrumenti;

  const checkedScritte = VERIFICHE_SCRITTE_OPTIONS.filter((o) => matchCheckedOption(fullText, o));
  if (checkedScritte.length > 0) basePlan.verificheValutazione.verificheScritte = checkedScritte;

  const checkedOrali = VERIFICHE_ORALI_OPTIONS.filter((o) => matchCheckedOption(fullText, o));
  if (checkedOrali.length > 0) basePlan.verificheValutazione.verificheOrali = checkedOrali;

  // 4. Testo analisi disciplinare & BES
  const analisiSlice = extractSectionSlice(
    fullText,
    /SITUAZIONE DI PARTENZA DEGLI ALUNNI IN RELAZIONE ALLA DISCIPLINA\s*:/i,
    [/Livello basso/i, /Livelli rilevati/i, /FONTI DI RILEVAZIONE/i]
  );
  if (analisiSlice && !/non ancora compilata/i.test(analisiSlice)) {
    basePlan.analisiPartenza.descrizioneDisciplinare = analisiSlice;
    sectionsMatched.push('Analisi di partenza');
  }

  const besSlice = extractSectionSlice(
    fullText,
    /Alunni con BES e interventi programmati\s*:?/i,
    [/TRAGUARDI PER LO SVILUPPO/i]
  );
  if (besSlice && besSlice.length > 15) {
    basePlan.interventi.besInterventiProgrammati = besSlice;
    sectionsMatched.push('BES e interventi');
  }

  // 5. Tabella / Programma Curricolo (il programma vero e proprio)
  const tableRows = detectCurriculumRowsFromTables(tables);
  const extractedRows =
    tableRows.length > 0 ? tableRows : detectCurriculumRowsFromLines(lines, fullText);

  if (extractedRows.length > 0) {
    basePlan.curricolo.righeAbilitaConoscenze = existingPlan
      ? [...existingPlan.curricolo.righeAbilitaConoscenze, ...extractedRows]
      : extractedRows;
    sectionsMatched.push(`Programma (${extractedRows.length} righe)`);
  } else {
    warnings.push(
      'Non è stata individuata una tabella strutturata di Competenze/Abilità/Conoscenze: verifica manualmente la Sezione 5.'
    );
  }

  const attSlice = extractSectionSlice(fullText, /Attivit[àa] programmate\s*:/i, [
    /CRITERI METODOLOGICI/i,
  ]);
  if (attSlice) {
    basePlan.curricolo.attivitaProgrammate = attSlice;
  }

  const valSlice = extractSectionSlice(fullText, /\nVALUTAZIONE\s*\n/i, [
    /(?:Il docente|La docente|Il\/La Docente)/i,
  ]);
  if (valSlice && valSlice.length > 25) {
    basePlan.verificheValutazione.criteriValutazione = valSlice;
    sectionsMatched.push('Valutazione');
  }

  if (fileType === 'doc') {
    warnings.push(
      'File legacy .doc importato con parser binario offline: controlla i contenuti estratti nelle sezioni.'
    );
  }

  return {
    plan: basePlan,
    summary: {
      fileName,
      fileType,
      extractedChars: fullText.length,
      tableRowsExtracted: extractedRows.length,
      sectionsMatched,
    },
    warnings,
    rawText: fullText,
  };
}

export async function importProgrammazioneFromFile(
  file: File,
  settings: SchoolSettings,
  existingPlan?: Programmazione
): Promise<DocumentImportResult> {
  const buffer = await file.arrayBuffer();
  return importProgrammazioneFromBuffer(buffer, file.name, settings, existingPlan);
}
