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
  stripDocenteTitoli,
  TIPOLOGIE_CLASSE_OPTIONS,
  VERIFICHE_ORALI_OPTIONS,
  VERIFICHE_SCRITTE_OPTIONS,
} from '../domain/defaults';
import type {
  AbilitaConoscenzaRow,
  AnonymousStudentBandEntry,
  ClasseSecondaria,
  DocenteGenere,
  FasciaLivelloKey,
  IndicazioniVersion,
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

export interface RecognizedImportField {
  id: string;
  label: string;
  section: string;
  valuePreview: string;
  confidence: 'alta' | 'media';
}

export interface UnrecognizedImportBlock {
  id: string;
  text: string;
  reason: string;
}

export type ImportBlockTargetField =
  | 'ignore'
  | 'analisiPartenza.descrizioneDisciplinare'
  | 'interventi.besInterventiProgrammati'
  | 'curricolo.competenzeAttese'
  | 'curricolo.righeAbilitaConoscenze'
  | 'curricolo.mergeLastRowAbilita'
  | 'curricolo.mergeLastRowConoscenze'
  | 'curricolo.attivitaProgrammate'
  | 'metodiStrumenti.premessaMetodologica'
  | 'metodiStrumenti.ausiliDidattici'
  | 'metodiStrumenti.didatticaDigitaleIntegrata'
  | 'verificheValutazione.altriTipiProve'
  | 'verificheValutazione.criteriValutazione'
  | 'notePersonaliDocente';

export interface DocumentImportResult {
  plan: Programmazione;
  summary: ImportedDocumentSummary;
  recognizedFields: RecognizedImportField[];
  unrecognizedBlocks: UnrecognizedImportBlock[];
  warnings: string[];
  rawText: string;
}

interface ExtractedDocumentContent {
  lines: string[];
  tables: string[][][];
  fullText: string;
  emphasizedLines?: string[];
}

function makeId(prefix: string): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function cleanText(raw: string): string {
  return raw
    .replace(/\u00A0/g, ' ')
    .replace(/[\uF0FE\uF0FD\uF052\uF0FC\uF078\u2611]/g, '☒')
    .replace(/[\uF0A8\uF06F\uF0A3\u25A1]/g, '☐')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function isPlaceholderValue(val: string): boolean {
  const trimmed = val.trim();
  if (!trimmed) return true;
  if (/^[_\.\-…\s]+$/.test(trimmed)) return true;
  if (/^non ancora compilat/i.test(trimmed)) return true;
  if (/^nessuna riga|^nessuna abilit|^nessuna conoscenz|^nessun intervento/i.test(trimmed)) {
    return true;
  }
  return false;
}

function stripLeadingUnderscores(val: string): string {
  return val
    .replace(/^[_\.\-:\s]+/, '')
    .replace(/[_\s]+$/, '')
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

function normalizeOoxmlControls(pXml: string): string {
  // 1. Word 2010+ <w14:checkbox> SDT controls inside paragraph or wrapping runs
  let normalized = pXml
    .replace(
      /<w14:checkbox\b[\s\S]*?<w14:checked\b[^>]*w14:val="(1|true)"[^>]*\/?>[\s\S]*?<\/w14:checkbox>/gi,
      '<w:t>☒ </w:t>'
    )
    .replace(/<w14:checkbox\b[\s\S]*?<\/w14:checkbox>/gi, '<w:t>☐ </w:t>');

  // 2. Legacy Word form fields <w:ffData><w:checkBox>...</w:checkBox></w:ffData>
  normalized = normalized.replace(/<w:checkBox\b[\s\S]*?<\/w:checkBox>/gi, (block) => {
    const isChecked =
      /<w:checked(?:\s+w:val="(?:1|true)")?\s*\/>/i.test(block) ||
      /<w:default\b[^>]*w:val="(?:1|true)"/i.test(block);
    return `<w:t>${isChecked ? '☒' : '☐'} </w:t>`;
  });

  // 3. Wingdings / Symbol glyphs (<w:sym .../>), tabulazioni (<w:tab/>) e interruzioni di riga (<w:br/>)
  normalized = normalized
    .replace(
      /<w:sym[^>]*w:char="(?:F0FE|F0FD|F052|F0FC|F078|00FE|2611|2612)"[^>]*\/?>/gi,
      '<w:t>☒</w:t>'
    )
    .replace(/<w:sym[^>]*w:char="(?:F0A8|F06F|F0A3|00A8|2610|25A1)"[^>]*\/?>/gi, '<w:t>☐</w:t>')
    .replace(/<w:tab(?:\s*\/|><\/w:tab)>/gi, '<w:t> </w:t>')
    .replace(/<w:br(?:\s+[^>]*)?(?:\/>|><\/w:br>)/gi, '<w:t>\n</w:t>');

  return normalized;
}

function extractEmphasizedRunsFromParagraph(pXml: string): string[] {
  const results: string[] = [];
  const runRegex = /<w:r\b[\s\S]*?<\/w:r>/gi;
  let m: RegExpExecArray | null;
  while ((m = runRegex.exec(pXml)) !== null) {
    const runXml = m[0];
    const rPrMatch = runXml.match(/<w:rPr\b[\s\S]*?<\/w:rPr>/i);
    if (!rPrMatch) continue;
    const rPr = rPrMatch[0];
    if (
      /<w:(?:d)?strike(?:\s+w:val="(?:1|true)")?\s*\/?>/i.test(rPr) &&
      !/<w:(?:d)?strike\s+w:val="(?:0|false)"/i.test(rPr)
    ) {
      continue;
    }
    const isBold =
      /<w:b(?:\s+w:val="(?:1|true)")?\s*\/?>/i.test(rPr) &&
      !/<w:b\s+w:val="(?:0|false)"/i.test(rPr);
    const isHighlight =
      /<w:highlight\b[^>]*w:val="(?!none)[^"]+"/i.test(rPr) ||
      /<w:shd\b[^>]*w:fill="(?!auto|FFFFFF|ffffff|000000)[^"]+"/i.test(rPr);
    const isUnderlined =
      /<w:u\b[^>]*w:val="(?!none)[^"]+"/i.test(rPr);
    if (!isBold && !isHighlight && !isUnderlined) continue;

    const textParts: string[] = [];
    const tRegex = /<w:t(?:\s+[^>]*)?>([\s\S]*?)<\/w:t>/g;
    let tM: RegExpExecArray | null;
    while ((tM = tRegex.exec(runXml)) !== null) {
      textParts.push(decodeXmlEntities(tM[1]));
    }
    const combined = cleanText(textParts.join(''));
    if (combined && combined.length >= 3) {
      results.push(combined);
    }
  }
  return results;
}

function stripXmlParagraphToText(pXml: string): string {
  // Rimuovi eventuali run barrati (<w:strike/> o <w:dstrike/> attivi) usati nei moduli Word per escludere opzioni
  const withoutStruckRuns = pXml.replace(/<w:r\b[\s\S]*?<\/w:r>/gi, (runXml) => {
    const rPrMatch = runXml.match(/<w:rPr\b[\s\S]*?<\/w:rPr>/i);
    if (
      rPrMatch &&
      /<w:(?:d)?strike(?:\s+w:val="(?:1|true)")?\s*\/?>/i.test(rPrMatch[0]) &&
      !/<w:(?:d)?strike\s+w:val="(?:0|false)"/i.test(rPrMatch[0])
    ) {
      return '';
    }
    return runXml;
  });

  const normalized = normalizeOoxmlControls(withoutStruckRuns);
  const textRuns: string[] = [];
  const tRegex = /<w:t(?:\s+[^>]*)?>([\s\S]*?)<\/w:t>/g;
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
  const emphasizedLines: string[] = [];

  // Includi eventuali righe da header*.xml (es. intestazione scuola o anno scolastico nell'header di Word)
  const headerNames = Object.keys(zip.files)
    .filter((name) => /^word\/header\d*\.xml$/i.test(name))
    .sort();
  for (const hName of headerNames) {
    const hXml = await zip.file(hName)?.async('string');
    if (!hXml) continue;
    const hPRegex = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
    let hMatch: RegExpExecArray | null;
    while ((hMatch = hPRegex.exec(hXml)) !== null) {
      const t = stripXmlParagraphToText(hMatch[1]);
      if (t) allLines.push(t);
    }
  }

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

  const allPRegex = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
  let pMatch: RegExpExecArray | null;
  while ((pMatch = allPRegex.exec(xml)) !== null) {
    const line = stripXmlParagraphToText(pMatch[1]);
    if (line) allLines.push(line);
    const em = extractEmphasizedRunsFromParagraph(pMatch[1]);
    if (em.length > 0) {
      emphasizedLines.push(...em);
    }
  }

  return {
    lines: allLines,
    tables,
    fullText: allLines.join('\n'),
    emphasizedLines,
  };
}

interface PdfTextToken {
  str: string;
  x: number;
  y: number;
  width: number;
}

interface PdfTokenCluster {
  text: string;
  startX: number;
  endX: number;
  centerX: number;
}

function buildRowClusters(row: PdfTextToken[]): PdfTokenCluster[] {
  const sorted = [...row].sort((a, b) => a.x - b.x);
  const clusters: PdfTokenCluster[] = [];
  for (const tok of sorted) {
    const last = clusters[clusters.length - 1];
    if (last && tok.x - last.endX <= 14) {
      const sep = tok.x - last.endX > 1.8 && !last.text.endsWith(' ') && !tok.str.startsWith(' ') ? ' ' : '';
      last.text = `${last.text}${sep}${tok.str}`.trim();
      last.endX = Math.max(last.endX, tok.x + tok.width);
      last.centerX = (last.startX + last.endX) / 2;
    } else {
      const startX = tok.x;
      const endX = tok.x + tok.width;
      clusters.push({
        text: tok.str.trim(),
        startX,
        endX,
        centerX: (startX + endX) / 2,
      });
    }
  }
  return clusters.filter((c) => c.text.length > 0);
}

function computePdfColumnCutoffs(clusters: PdfTokenCluster[]): number[] {
  const cutoffs: number[] = [];
  const leftAligned = clusters[0].startX < 95 && clusters.length >= 2 && clusters[1].startX > 165;
  for (let i = 0; i < clusters.length - 1; i++) {
    if (leftAligned) {
      cutoffs.push(clusters[i + 1].startX - 12);
    } else {
      cutoffs.push((clusters[i].centerX + clusters[i + 1].centerX) / 2);
    }
  }
  return cutoffs;
}

function assignRowTokensToColumns(row: PdfTextToken[], cutoffs: number[]): string[] {
  const numCols = cutoffs.length + 1;
  const colTokens: PdfTextToken[][] = Array.from({ length: numCols }, () => []);
  for (const tok of row) {
    let colIdx = 0;
    while (colIdx < cutoffs.length && tok.x >= cutoffs[colIdx]) {
      colIdx += 1;
    }
    colTokens[colIdx].push(tok);
  }
  return colTokens.map((toks) => {
    if (toks.length === 0) return '';
    toks.sort((a, b) => a.x - b.x);
    let s = '';
    let prevEnd = toks[0].x;
    for (let i = 0; i < toks.length; i++) {
      const t = toks[i];
      if (i > 0 && t.x - prevEnd > 1.8 && !s.endsWith(' ') && !t.str.startsWith(' ')) {
        s += ' ';
      }
      s += t.str;
      prevEnd = t.x + t.width;
    }
    return s.trim();
  });
}

function extractTablesFromPdfRowGroups(pageRowGroups: PdfTextToken[][][]): string[][][] {
  const tables: string[][][] = [];

  // Flat list con indice pagina e Y medio della riga
  const flatRows: { page: number; y: number; tokens: PdfTextToken[]; clusters: PdfTokenCluster[]; joined: string }[] = [];
  pageRowGroups.forEach((rows, pageIdx) => {
    for (const row of rows) {
      const clusters = buildRowClusters(row);
      const joined = clusters.map((c) => c.text).join(' | ');
      if (!joined) continue;
      flatRows.push({
        page: pageIdx,
        y: row[0].y,
        tokens: row,
        clusters,
        joined,
      });
    }
  });

  // 1. Ricostruisci tabella Livelli di partenza (4 colonne: counts + eventuali nomi alunni)
  for (let i = 0; i < flatRows.length; i++) {
    const r = flatRows[i];
    const isOrigHeader =
      r.clusters.length >= 4 &&
      r.clusters.some((c) => /livello basso/i.test(c.text)) &&
      r.clusters.some((c) => /livello alto/i.test(c.text));
    const isModernHeader =
      r.clusters.length >= 4 &&
      r.clusters.some((c) => /\bbasso\s*:\s*\d+/i.test(c.text)) &&
      r.clusters.some((c) => /\balto\s*:\s*\d+/i.test(c.text));

    if (!isOrigHeader && !isModernHeader) continue;

    const headerClusters = r.clusters.slice(0, 4);
    const cutoffs = computePdfColumnCutoffs(headerClusters);
    const headerRow = assignRowTokensToColumns(r.tokens, cutoffs);
    const countsBuf: string[][] = [[headerRow[0]], [headerRow[1]], [headerRow[2]], [headerRow[3]]];
    const namesBuf: string[][] = [[], [], [], []];
    let seenCounts = isModernHeader;

    let j = i + 1;
    while (j < flatRows.length && flatRows[j].page === r.page) {
      const cur = flatRows[j];
      const lowerJoined = cur.joined.toLowerCase();
      if (
        /^fonti di rilevazione\b/.test(lowerJoined) ||
        /^strategie ed interventi\b/.test(lowerJoined) ||
        /^alunni con bes\b/.test(lowerJoined) ||
        /^traguardi per lo sviluppo\b/.test(lowerJoined)
      ) {
        break;
      }
      const cols = assignRowTokensToColumns(cur.tokens, cutoffs);
      if (cols.some((c) => /\balunni\s*[:\-]?\s*\d+/i.test(c))) {
        seenCounts = true;
        for (let k = 0; k < 4; k++) {
          if (cols[k]) countsBuf[k].push(cols[k]);
        }
      } else if (!seenCounts) {
        for (let k = 0; k < 4; k++) {
          if (cols[k]) countsBuf[k].push(cols[k]);
        }
      } else {
        // Nomi alunni sotto i conteggi (fermati se l'ultima riga aveva gap ampio verso il basso e sembra una nuova sezione)
        for (let k = 0; k < 4; k++) {
          if (cols[k]) namesBuf[k].push(cols[k]);
        }
      }
      j += 1;
    }

    const combinedCountsRow = countsBuf.map((col) => col.join('\n').trim());
    const livelliTbl: string[][] = [combinedCountsRow];
    if (namesBuf.some((col) => col.length > 0)) {
      livelliTbl.push(namesBuf.map((col) => col.join('\n').trim()));
    }
    tables.push(livelliTbl);
    break;
  }

  // 2. Ricostruisci tabella Curricolo (2 o 3 colonne) seguendo le coordinate X delle colonne
  for (let i = 0; i < flatRows.length; i++) {
    const r = flatRows[i];
    if (r.clusters.length < 2 || r.clusters.length > 4) continue;
    const clsLower = r.clusters.map((c) => c.text.toLowerCase());
    const hasAb = clsLower.some((t) => /^(?:abilit(?:à|a['’]?)|obiettivi(?:\s+specifici)?)$/.test(t));
    const hasCon = clsLower.some((t) => /^(?:conoscenze(?:\s*\(contenuti\))?|contenuti|argomenti)$/.test(t));
    if (!hasAb || !hasCon) continue;

    const cutoffs = computePdfColumnCutoffs(r.clusters);
    const numCols = cutoffs.length + 1;
    const headerCells = assignRowTokensToColumns(r.tokens, cutoffs);
    const currRows: string[][] = [headerCells];
    let colBuffers: string[][] = Array.from({ length: numCols }, () => []);
    let prevY = r.y;
    let prevPage = r.page;
    const yDiffs: number[] = [];

    const flushRow = () => {
      if (colBuffers.some((b) => b.length > 0)) {
        currRows.push(colBuffers.map((b) => b.join('\n').trim()));
        colBuffers = Array.from({ length: numCols }, () => []);
      }
    };

    let j = i + 1;
    while (j < flatRows.length) {
      const cur = flatRows[j];
      const lowerJoined = cur.joined.toLowerCase();
      if (
        /^attivit[àa]['’]?\s+programmate\b/.test(lowerJoined) ||
        /^criteri metodologici\b/.test(lowerJoined) ||
        /^metodi\s*\|/.test(lowerJoined) ||
        /^ausili didattici\b/.test(lowerJoined) ||
        /^didattica digitale\b/.test(lowerJoined) ||
        /^verifiche in itinere\b/.test(lowerJoined) ||
        /^valutazione\b/.test(lowerJoined) ||
        /^(?:il|la|il\/la)\s+docente\b/.test(lowerJoined)
      ) {
        break;
      }

      const cells = assignRowTokensToColumns(cur.tokens, cutoffs);
      // Salta eventuale intestazione ripetuta al cambio pagina
      const isRepeatedHdr =
        cells.length >= 2 &&
        cells.some((c) => /^(?:abilit(?:à|a['’]?)|obiettivi(?:\s+specifici)?)$/i.test(c.trim())) &&
        cells.some((c) => /^(?:conoscenze(?:\s*\(contenuti\))?|contenuti|argomenti)$/i.test(c.trim()));
      if (isRepeatedHdr) {
        // Se la riga precedente aveva concluso un blocco o un periodo, chiudila prima del nuovo blocco di pagina
        const lastCol0 = colBuffers[0][colBuffers[0].length - 1] ?? '';
        if (colBuffers.some((b) => b.length > 0) && /[.!?;:]$/.test(lastCol0)) {
          flushRow();
        }
        prevY = cur.y;
        prevPage = cur.page;
        j += 1;
        continue;
      }

      const gap = cur.page === prevPage ? prevY - cur.y : 0;
      if (gap > 4 && gap < 22) {
        yDiffs.push(gap);
      }
      const sortedGaps = [...yDiffs].sort((a, b) => a - b);
      const typicalGap = sortedGaps.length > 0 ? sortedGaps[Math.floor(sortedGaps.length / 2)] : 10.5;

      const hasExistingContent = colBuffers.some((b) => b.length > 0);
      const nonEmptyColsCount = cells.filter((c) => c.length > 0).length;
      const col0EndsSentence =
        colBuffers[0].length > 0 &&
        /[.!?;:]$/.test(colBuffers[0][colBuffers[0].length - 1]);
      const startsNewItem =
        cells[0].length > 0 && /^[A-ZÀ-Ö0-9•\-]/.test(cells[0]);
      const startsNewNucleoGroup =
        numCols >= 2 &&
        colBuffers[0].some((line) => line.startsWith('•')) &&
        cells[0].length > 2 &&
        cells[1].length > 2 &&
        cells[0].length < 55 &&
        !cells[0].startsWith('•') &&
        cells[0].toLowerCase() === cells[1].toLowerCase();

      const shouldSplitRow =
        hasExistingContent &&
        (startsNewNucleoGroup ||
          (cur.page !== prevPage && col0EndsSentence && startsNewItem) ||
          (cur.page === prevPage &&
            (gap > typicalGap * 1.45 ||
              (nonEmptyColsCount >= 2 && col0EndsSentence && startsNewItem))));

      if (shouldSplitRow) {
        flushRow();
      }

      for (let k = 0; k < numCols; k++) {
        if (cells[k]) {
          colBuffers[k].push(cells[k]);
        }
      }

      prevY = cur.y;
      prevPage = cur.page;
      j += 1;
    }

    flushRow();
    if (currRows.length > 1) {
      tables.push(currRows);
    }
    break;
  }

  return tables;
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
  const allPageRowGroups: PdfTextToken[][][] = [];

  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const tokens: PdfTextToken[] = [];

    for (const item of textContent.items) {
      if (!('str' in item) || !item.str) continue;
      const typedItem = item as { transform?: number[]; width?: number; str: string };
      const transform = typedItem.transform;
      const x = Array.isArray(transform) ? Number(transform[4] ?? 0) : 0;
      const y = Array.isArray(transform) ? Number(transform[5] ?? 0) : 0;
      const width =
        typeof typedItem.width === 'number' && typedItem.width > 0
          ? typedItem.width
          : typedItem.str.length * 4.2;
      tokens.push({ str: cleanText(typedItem.str) || typedItem.str, x, y, width });
    }

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

    allPageRowGroups.push(rowGroups);

    for (const row of rowGroups) {
      row.sort((a, b) => a.x - b.x);
      let rowStr = '';
      let prevEnd = row[0].x;
      for (let i = 0; i < row.length; i++) {
        const tok = row[i];
        if (i > 0) {
          const gap = tok.x - prevEnd;
          if (gap > 14) {
            rowStr += ' | ';
          } else if (gap > 1.8 && !rowStr.endsWith(' ') && !tok.str.startsWith(' ')) {
            rowStr += ' ';
          }
        }
        rowStr += tok.str;
        prevEnd = tok.x + tok.width;
      }
      const cleaned = rowStr.replace(/\s+\|\s+/g, ' | ').trim();
      if (cleaned) lines.push(cleaned);
    }
  }

  const tables = extractTablesFromPdfRowGroups(allPageRowGroups);

  return {
    lines,
    tables,
    fullText: lines.join('\n'),
  };
}

function stripRtfFormatting(rtf: string): string {
  const withHex = rtf.replace(/\\'([0-9a-fA-F]{2})/g, (_, hex) => {
    const code = parseInt(hex, 16);
    return String.fromCharCode(code);
  });
  return cleanText(
    withHex
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
  );
}

function extractHtmlTablesAndText(html: string): ExtractedDocumentContent {
  const cleanedHtml = html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<(s|del|strike)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(
      /<input\b[^>]*type=["']?checkbox["']?[^>]*\bchecked\b[^>]*>/gi,
      ' ☒ '
    )
    .replace(/<input\b[^>]*type=["']?checkbox["']?[^>]*>/gi, ' ☐ ');

  const emphasizedLines: string[] = [];
  const emphTagRegex = /<(b|strong|mark|u)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let emphM: RegExpExecArray | null;
  while ((emphM = emphTagRegex.exec(cleanedHtml)) !== null) {
    const innerText = cleanText(decodeXmlEntities(emphM[2].replace(/<[^>]+>/g, ' ')));
    if (innerText && innerText.length >= 3 && innerText.length < 120) {
      emphasizedLines.push(innerText);
    }
  }
  const styledSpanRegex =
    /<(?:span|font|p)\b[^>]*style=["'][^"']*(?:font-weight\s*:\s*(?:bold|[6-9]00)|background(?:-color)?\s*:\s*(?!transparent|none|#fff(?:fff)?\b|white\b)[^;"']+|text-decoration\s*:\s*underline)[^"']*["'][^>]*>([\s\S]*?)<\/(?:span|font|p)>/gi;
  let stM: RegExpExecArray | null;
  while ((stM = styledSpanRegex.exec(cleanedHtml)) !== null) {
    const innerText = cleanText(decodeXmlEntities(stM[1].replace(/<[^>]+>/g, ' ')));
    if (innerText && innerText.length >= 3 && innerText.length < 120) {
      emphasizedLines.push(innerText);
    }
  }

  const stripCellHtml = (fragment: string): string =>
    cleanText(
      decodeXmlEntities(
        fragment
          .replace(/<(?:p|div|li|br|h[1-6])\b[^>]*>/gi, '\n')
          .replace(/<\/(?:p|div|li|h[1-6])>/gi, '\n')
          .replace(/<[^>]+>/g, ' ')
      )
    )
      .split('\n')
      .map((l) => l.replace(/[ \t]+/g, ' ').trim())
      .filter(Boolean)
      .join('\n');

  const tables: string[][][] = [];
  const tblRegex = /<table\b[^>]*>([\s\S]*?)<\/table>/gi;
  let tblMatch: RegExpExecArray | null;
  while ((tblMatch = tblRegex.exec(cleanedHtml)) !== null) {
    const rows: string[][] = [];
    const trRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
    let trMatch: RegExpExecArray | null;
    while ((trMatch = trRegex.exec(tblMatch[1])) !== null) {
      const cells: string[] = [];
      const tdRegex = /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi;
      let tdMatch: RegExpExecArray | null;
      while ((tdMatch = tdRegex.exec(trMatch[1])) !== null) {
        cells.push(stripCellHtml(tdMatch[1]));
      }
      if (cells.some((c) => c.length > 0)) {
        rows.push(cells);
      }
    }
    if (rows.length > 0) {
      tables.push(rows);
    }
  }

  const fullStr = cleanText(
    decodeXmlEntities(
      cleanedHtml
        .replace(/<(tr|p|div|li|h[1-6]|br)\b[^>]*>/gi, '\n')
        .replace(/<t[dh]\b[^>]*>/gi, ' | ')
        .replace(/<[^>]+>/g, ' ')
    )
  );
  const lines = fullStr
    .split('\n')
    .map((l) => l.replace(/[ \t]+/g, ' ').trim())
    .filter((l) => l.length > 0);

  return {
    lines,
    tables,
    fullText: lines.join('\n'),
    emphasizedLines,
  };
}

function extractReadableRunsFromLegacyBinaryDoc(bytes: Uint8Array): string {
  const chunks: string[] = [];

  const decoderLatin = new TextDecoder('windows-1252', { fatal: false });
  const latinText = decoderLatin.decode(bytes);
  const latinRuns = latinText.match(/[A-Za-zÀ-ÖØ-öø-ÿ0-9.,;:!?'"()/\-–—%°\[\]☒☐ \t]{10,}/g) ?? [];
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

  const decoderUtf16 = new TextDecoder('utf-16le', { fatal: false });
  const utf16Text = decoderUtf16.decode(bytes);
  const utf16Runs = utf16Text.match(/[A-Za-zÀ-ÖØ-öø-ÿ0-9.,;:!?'"()/\-–—%°\[\]☒☐ \t]{10,}/g) ?? [];
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

  if (bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b) {
    return extractFromDocx(buffer);
  }

  const headText = new TextDecoder('latin1').decode(bytes.slice(0, Math.min(bytes.length, 4096)));

  if (headText.trimStart().startsWith('{\\rtf')) {
    const rawText = stripRtfFormatting(new TextDecoder('windows-1252', { fatal: false }).decode(bytes));
    const lines = rawText
      .split('\n')
      .map((l) => l.replace(/\s+/g, ' ').trim())
      .filter((l) => l.length > 0);
    return { lines, tables: [], fullText: lines.join('\n') };
  }

  if (/<html|<body|<table|<!doctype html/i.test(headText)) {
    return extractHtmlTablesAndText(new TextDecoder('utf-8', { fatal: false }).decode(bytes));
  }

  const rawText = extractReadableRunsFromLegacyBinaryDoc(bytes);
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

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchCheckedOption(scopeText: string, option: string): boolean {
  if (!scopeText) return false;
  const escaped = escapeRegex(option);
  const boundaryBefore = '(?<![A-Za-zÀ-ÿ\\-])(?<!\\bpoco[ \\t]+)';
  const boundaryAfter = '(?![A-Za-zÀ-ÿ\\-])';
  const checkedMarker = `(?:☒|☑|✔|✓|✕|✖|✗|✘|■|●|\\[\\s*[xX]\\s*\\]|\\([xX]\\))`;
  const uncheckedMarker = `(?:☐|\\[\\s*\\]|\\(\\s*\\))`;

  // 1. Marker subito DOPO l'opzione sulla stessa riga ("opzione [X]", "opzione ☒", "opzione - x")
  const rxAfterChecked = new RegExp(
    `(?:^|[\\s|☒☑✔✓✕✖✗✘■●☐\\[\\]()•\\-])${boundaryBefore}${escaped}${boundaryAfter}[ \\t:_-]{0,40}(?:${checkedMarker}|(?<=[ \\t\\-:])[xX](?=[ \\t]*(?:$|\\||,|;|☐|☒|☑|\\[|\\(|\\w)))`,
    'im'
  );
  if (rxAfterChecked.test(scopeText)) return true;

  // Se l'opzione ha esplicitamente la propria casella VUOTA subito dopo sulla stessa riga,
  // non può essere considerata selezionata da una casella di un'altra opzione sulla stessa riga.
  const rxAfterUnchecked = new RegExp(
    `${boundaryBefore}${escaped}${boundaryAfter}[ \\t:_-]{0,40}${uncheckedMarker}`,
    'im'
  );
  if (rxAfterUnchecked.test(scopeText)) return false;

  // 2. Marker subito PRIMA dell'opzione sulla stessa riga ("☒ opzione", "[X] opzione", "x opzione")
  const checkedMarkerBefore = `(?:☒|☑|✔|✓|✕|✖|✗|✘|■|●|\\[\\s*[xX]\\s*\\]|\\([xX]\\)|(?<=^|[\\s|•\\-])[xX](?=[ \\t]+))`;
  const rxBeforeOnLine = new RegExp(
    `(${checkedMarkerBefore})[ \\t]*${escaped}${boundaryAfter}`,
    'ig'
  );

  for (const line of scopeText.split('\n')) {
    rxBeforeOnLine.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = rxBeforeOnLine.exec(line)) !== null) {
      const beforeText = line.slice(0, m.index).trim();
      const isStartOrAfterSeparator =
        beforeText.length === 0 ||
        /(?:[|:•\-]|☐|☒|☑|✔|✓|✕|✖|✗|✘|■|●|\[\s*[xX]?\s*\]|\(\s*[xX]?\s*\))$/.test(beforeText);
      const isInlinePrefixList = /(?:^|\s)(?:☒|☑|✔|✓|✕|✖|✗|✘|■|●|☐|\[\s*[xX]?\s*\]|\(\s*[xX]?\s*\))\s+[A-Za-zÀ-ÿ]/.test(
        beforeText
      );
      if (isStartOrAfterSeparator || isInlinePrefixList) {
        return true;
      }
    }
  }

  // 3. Pattern "etichetta x" o "etichetta   x" su riga di tabella / elenco
  const rxSingleLineX = new RegExp(
    `(?:^|\\n|\\|)[ \\t•\\-]*${boundaryBefore}${escaped}${boundaryAfter}[ \\t:_-]+[xX](?:[ \\t]*\\||[ \\t]*$)`,
    'im'
  );
  return rxSingleLineX.test(scopeText);
}

function hasAnyCheckboxGlyph(scopeText: string): boolean {
  return /[☒☑✔✓✕✖✗✘■●☐]|\[\s*[xX]?\s*\]|\(\s*[xX]?\s*\)/.test(scopeText);
}

function resolveMultiSelectWithFallbacks<T extends string>(
  actualSlice: string,
  fallbackScope: string,
  options: readonly T[],
  emphasizedLines: string[]
): T[] {
  const scope = actualSlice || fallbackScope;
  const direct = options.filter((o) => matchCheckedOption(scope, o));
  if (direct.length > 0) return direct;

  if (!actualSlice || hasAnyCheckboxGlyph(actualSlice)) {
    return [];
  }

  // Se l'opzione è stata evidenziata in grassetto/sottolineato/sfondo nel modello senza caselle
  if (emphasizedLines.length > 0) {
    const emMatches = options.filter((o) => {
      const rx = new RegExp(`(?<![A-Za-zÀ-ÿ\\-])${escapeRegex(o)}(?![A-Za-zÀ-ÿ\\-])`, 'i');
      return emphasizedLines.some((em) => rx.test(em) && rx.test(actualSlice));
    });
    if (emMatches.length > 0 && emMatches.length < options.length) {
      return emMatches;
    }
  }

  // Se il docente ha mantenuto solo le voci scelte (rimuovendo o barrando le altre) in una sezione senza caselle
  const presentSubset = options.filter((o) =>
    new RegExp(`(?<![A-Za-zÀ-ÿ\\-])${escapeRegex(o)}(?![A-Za-zÀ-ÿ\\-])`, 'i').test(actualSlice)
  );
  if (presentSubset.length > 0 && presentSubset.length < options.length) {
    return presentSubset;
  }

  return [];
}

function extractSectionSlice(
  fullText: string,
  startRegex: RegExp,
  endRegexList: RegExp[]
): string {
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
  const titleMatch = fullText.match(
    /(?:PROGRAMMAZIONE\s+(?:DISCIPLINARE|DIDATTICA)|PIANO\s+DI\s+LAVORO)\s+(?:di|per)\s+([^\n|]+)/i
  );
  const discFieldMatch = fullText.match(/(?:^|\n|\|)\s*DISCIPLINA\s*[:\-]?\s+([^\n|]+)/im);
  const candidates = [discFieldMatch?.[1], titleMatch?.[1]].filter(Boolean) as string[];
  for (const raw of candidates) {
    const cleaned = stripLeadingUnderscores(raw);
    if (isPlaceholderValue(cleaned)) continue;
    const exactKnown = DISCIPLINE_SECONDARIA.find(
      (d) => cleaned.toLowerCase().includes(d.toLowerCase())
    );
    if (exactKnown) return exactKnown;
    return cleaned;
  }
  for (const disc of DISCIPLINE_SECONDARIA) {
    if (new RegExp(`\\b${escapeRegex(disc)}\\b`, 'i').test(fullText)) {
      return disc;
    }
  }
  return fallback;
}

function detectClasseAndSezione(fullText: string): {
  classe?: ClasseSecondaria;
  sezione?: string;
} {
  const m = fullText.match(
    /(?:^|\n|\|)\s*CLASSE\s*[:\-]?\s+(Prima|Seconda|Terza|I{1,3}[°ª^a]?|1\s*[°ª^a]?|2\s*[°ª^a]?|3\s*[°ª^a]?)(?:[\s\-–\/]*(?:SEZ(?:IONE)?\.?\s*[:\-]?\s*)?([A-Za-z])\b)?/im
  );
  if (!m) return {};
  const token = m[1].trim().replace(/[°ª^\s]/g, '').toUpperCase();
  let classe: ClasseSecondaria | undefined;
  if (token === 'PRIMA' || token === 'PRIM' || token === 'I' || token === '1' || token === '1A') {
    classe = 'Prima';
  } else if (
    token === 'SECONDA' ||
    token === 'SECOND' ||
    token === 'II' ||
    token === '2' ||
    token === '2A'
  ) {
    classe = 'Seconda';
  } else if (
    token === 'TERZA' ||
    token === 'TERZ' ||
    token === 'III' ||
    token === '3' ||
    token === '3A'
  ) {
    classe = 'Terza';
  }
  let sezione = m[2] ? m[2].toUpperCase() : undefined;
  if (!sezione) {
    const headArea = fullText.slice(0, 1200);
    const sezM = headArea.match(/(?:^|\n|\||\s)SEZ(?:IONE)?\.?\s*[:\-]?\s*([A-Za-z])\b/im);
    if (sezM?.[1]) sezione = sezM[1].toUpperCase();
  }
  return { classe, sezione };
}

function isNonCurriculumTable(table: string[][]): boolean {
  // Controlla solo celle brevi di intestazione nelle prime righe per evitare falsi positivi
  // quando la cella superiore TRAGUARDI contiene parole come "scritta", "orale" o "tipologia"
  const shortCells = table
    .slice(0, 2)
    .flat()
    .map((c) => c.trim().toLowerCase())
    .filter((c) => c.length > 0 && c.length < 70);

  if (shortCells.length === 0) return false;
  const joined = shortCells.join(' | ');
  if (shortCells.some((c) => /\bmetodi\b/.test(c)) && shortCells.some((c) => /\bmezzi e strumenti\b/.test(c))) {
    return true;
  }
  if (shortCells.some((c) => /\bscritta\b/.test(c)) && shortCells.some((c) => /\borale\b/.test(c))) {
    return true;
  }
  if (shortCells.some((c) => /\btipologia\b/.test(c)) && shortCells.some((c) => /\blivello\b/.test(c))) {
    return true;
  }
  if (
    shortCells.some((c) => /\blivello basso\b/.test(c)) &&
    shortCells.some((c) => /\blivello alto\b/.test(c))
  ) {
    return true;
  }
  if (shortCells.some((c) => /\balunni\b/.test(c)) && shortCells.some((c) => /\bmaschi\b/.test(c))) {
    return true;
  }
  if (/\bgruppi di livello\b/.test(joined) || (/\bpotenziamento\b/.test(joined) && /\brecupero\b/.test(joined))) {
    return true;
  }
  return false;
}

function isRepeatedCurriculumHeaderRow(cells: string[]): boolean {
  if (cells.length < 2 || cells.some((c) => c.length > 65)) return false;
  const lower = cells.map((c) => c.toLowerCase().trim());
  const hasLeft = lower.some((h) => /^(?:competenze|nucle[oi]|abilit(?:à|a['’]?)|obiettivi(?:\s+specifici)?)$/.test(h));
  const hasRight = lower.some((h) => /^(?:abilit(?:à|a['’]?)|obiettivi(?:\s+specifici)?|conoscenze(?:\s*\(contenuti\))?|contenuti|argomenti)$/.test(h));
  return hasLeft && hasRight;
}

function detectCurriculumRowsFromTables(tables: string[][][]): {
  rows: AbilitaConoscenzaRow[];
  matchedTableIndexes: Set<number>;
  detectedIndicazioni?: IndicazioniVersion;
} {
  const rows: AbilitaConoscenzaRow[] = [];
  const matchedTableIndexes = new Set<number>();
  let detectedIndicazioni: IndicazioniVersion | undefined;
  let lastMatchedColShape: {
    len: number;
    nucleoCol: number;
    compCol: number;
    abCol: number;
    conCol: number;
  } | null = null;

  tables.forEach((table, tblIdx) => {
    if (table.length === 0 || isNonCurriculumTable(table)) return;

    let headerRowIdx = -1;
    let nucleoCol = -1;
    let compCol = -1;
    let abCol = -1;
    let conCol = -1;

    for (let i = 0; i < Math.min(table.length, 20); i++) {
      const cellsLower = table[i].map((c) => c.toLowerCase().trim());
      if (cellsLower.length < 2) continue;
      const nIdx = cellsLower.findIndex((h) =>
        /\bnucle[oi]\b|\bambito|\bu\.?d\.?a\.?\b|\bunit[àa]\s+did|\bmodulo/.test(h)
      );
      const cIdx = cellsLower.findIndex((h) => /competen|traguard|asse culturale/.test(h));
      const aIdx = cellsLower.findIndex((h) => /abilit|obiettiv|saper fare/.test(h));
      const kIdx = cellsLower.findIndex((h) =>
        /conoscenz|contenut|argoment|temi\b|saperi/.test(h)
      );

      const distinctCols = new Set(
        [nIdx, cIdx, aIdx, kIdx].filter((idx) => idx !== -1)
      ).size;

      if (distinctCols >= 2 && (aIdx !== -1 || kIdx !== -1)) {
        headerRowIdx = i;
        nucleoCol = nIdx !== cIdx && nIdx !== aIdx && nIdx !== kIdx ? nIdx : -1;
        compCol = cIdx;
        abCol = aIdx;
        conCol = kIdx;
        if (aIdx !== -1 && !detectedIndicazioni) {
          const abHeader = cellsLower[aIdx];
          if (/obiettiv/.test(abHeader) && !/abilit/.test(abHeader)) {
            detectedIndicazioni = 'nuove';
          } else if (/abilit/.test(abHeader) && !/obiettiv/.test(abHeader)) {
            detectedIndicazioni = 'vecchie';
          }
        }
        break;
      }
    }

    // Tabella di prosecuzione senza intestazione ripetuta subito dopo una tabella curricolo
    let startDataIdx = headerRowIdx + 1;
    if (headerRowIdx === -1) {
      const prevWasCurricolo = lastMatchedColShape !== null && matchedTableIndexes.has(tblIdx - 1);
      const colLensMatch =
        lastMatchedColShape &&
        table.some((r) => r.length === lastMatchedColShape!.len);
      if (prevWasCurricolo && colLensMatch && lastMatchedColShape) {
        matchedTableIndexes.add(tblIdx);
        nucleoCol = lastMatchedColShape.nucleoCol;
        compCol = lastMatchedColShape.compCol;
        abCol = lastMatchedColShape.abCol;
        conCol = lastMatchedColShape.conCol;
        startDataIdx = 0;
      } else {
        return;
      }
    } else {
      matchedTableIndexes.add(tblIdx);
      lastMatchedColShape = {
        len: table[headerRowIdx].length,
        nucleoCol,
        compCol,
        abCol,
        conCol,
      };
    }

    let pendingNucleo = '';
    for (let r = startDataIdx; r < table.length; r++) {
      const cells = table[r];
      if (cells.length === 0) continue;
      if (isRepeatedCurriculumHeaderRow(cells)) continue;

      let rawNucleo = nucleoCol !== -1 ? (cells[nucleoCol] ?? '').trim() : '';
      let rawComp = compCol !== -1 ? (cells[compCol] ?? '').trim() : '';
      let rawAb = abCol !== -1 ? (cells[abCol] ?? '').trim() : '';
      let rawCon = conCol !== -1 ? (cells[conCol] ?? '').trim() : '';

      // Gestione celle ridotte/fuse su riga dati (es. tabella 3 col ma riga con 2 celle, o riga banner Nucleo)
      if (cells.length === 2 && abCol >= 1 && conCol >= 2) {
        rawAb = (cells[0] ?? '').trim();
        rawCon = (cells[1] ?? '').trim();
        rawComp = '';
      } else if (cells.length === 1 && !isPlaceholderValue(cells[0])) {
        const single = cells[0].trim();
        if (
          /^tenuto conto della/i.test(single) ||
          /^traguardi per lo sviluppo/i.test(single) ||
          /^\(clicca sul link/i.test(single)
        ) {
          continue;
        }
        if (single.length < 70 && !/[.!?]$/.test(single)) {
          pendingNucleo = single;
          continue;
        }
        if (rows.length > 0) {
          const prev = rows[rows.length - 1];
          prev.conoscenze = prev.conoscenze ? `${prev.conoscenze}\n${single}` : single;
        }
        continue;
      }

      if (!rawNucleo && pendingNucleo) {
        rawNucleo = pendingNucleo;
        pendingNucleo = '';
      }

      if (rawNucleo && !isPlaceholderValue(rawNucleo)) {
        rawComp = rawComp && !isPlaceholderValue(rawComp) ? `[${rawNucleo}] ${rawComp}` : rawNucleo;
      }

      const competenze = isPlaceholderValue(rawComp) ? '' : rawComp;
      const abilita = isPlaceholderValue(rawAb) ? '' : rawAb;
      const conoscenze = isPlaceholderValue(rawCon) ? '' : rawCon;

      if (!competenze && !abilita && !conoscenze) continue;
      rows.push({
        id: makeId('imp-row'),
        competenze: competenze || undefined,
        traguardo: rawNucleo && !isPlaceholderValue(rawNucleo) ? rawNucleo : undefined,
        abilita,
        conoscenze,
      });
    }
  });

  return { rows, matchedTableIndexes, detectedIndicazioni };
}

function shouldMergeWithPreviousRow(
  prevRow: AbilitaConoscenzaRow,
  parts: string[],
  expectedCols: 2 | 3
): boolean {
  const firstNonEmpty = parts.find((p) => p.length > 0) ?? '';
  if (/^[a-zàèéìòù,;:\)\]]/.test(firstNonEmpty)) return true;
  if (parts.length === 1 && !/^(?:•|\-|\d+[.)])/.test(firstNonEmpty)) return true;

  const prevLastText =
    (prevRow.conoscenze || prevRow.abilita || prevRow.competenze || '').trim();
  const prevEndsSentence = /[.!?;:]$/.test(prevLastText);
  if (
    expectedCols === 3 &&
    parts.length === 2 &&
    !prevEndsSentence &&
    !/^(?:•|\-|\d+[.)])/.test(firstNonEmpty)
  ) {
    return true;
  }
  return false;
}

function detectCurriculumRowsFromLines(
  lines: string[],
  fullText: string
): { rows: AbilitaConoscenzaRow[]; detectedIndicazioni?: IndicazioniVersion } {
  const sectionText = extractSectionSlice(
    fullText,
    /(?:TRAGUARDI PER LO SVILUPPO DELLE COMPETENZE|OBIETTIVI DI APPRENDIMENTO|PROGRAMMAZIONE DIDATTICA|CONTENUTI E ABILIT[ÀA'])/i,
    [
      /(?:^|\n)\s*CRITERI METODOLOGICI/i,
      /(?:^|\n)\s*METODI\s*\|?\s*MEZZI/i,
      /(?:^|\n)\s*VERIFICHE IN ITINERE/i,
    ]
  );

  const sourceLines = (sectionText ? sectionText.split('\n') : lines)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const rows: AbilitaConoscenzaRow[] = [];
  let inCurricoloHeader = false;
  let expectedCols: 2 | 3 = 2;
  let detectedIndicazioni: IndicazioniVersion | undefined;

  for (const line of sourceLines) {
    const lower = line.toLowerCase();
    const isHeaderCandidate =
      (/abilit|obiettiv/.test(lower) && /conoscenz|contenut|argoment|temi/.test(lower)) ||
      (/competen|traguard/.test(lower) && /abilit|obiettiv|conoscenz|contenut/.test(lower));

    if (isHeaderCandidate && (line.includes('|') || line.length < 90)) {
      inCurricoloHeader = true;
      expectedCols = /competen|traguard/.test(lower) && line.split('|').length >= 3 ? 3 : 2;
      if (!detectedIndicazioni) {
        if (/obiettiv/.test(lower) && !/abilit/.test(lower)) detectedIndicazioni = 'nuove';
        else if (/abilit/.test(lower) && !/obiettiv/.test(lower)) detectedIndicazioni = 'vecchie';
      }
      continue;
    }
    if (/^attivit[àa]['’]?\s+programmate\s*:?/i.test(lower) || /^criteri metodologici/i.test(lower)) {
      inCurricoloHeader = false;
      continue;
    }
    if (!inCurricoloHeader) continue;
    if (/^tenuto conto della/i.test(lower) || /^\(clicca sul link/i.test(lower)) continue;

    const parts = line
      .split(' | ')
      .map((p) => p.trim())
      .filter((p) => p.length > 0 && !isPlaceholderValue(p));

    if (parts.length === 0) continue;

    // Continua riga precedente se il PDF ha spezzato celle multi-linea
    const prevRow = rows[rows.length - 1];
    if (prevRow && shouldMergeWithPreviousRow(prevRow, parts, expectedCols)) {
      const joinCol = (existing: string | undefined, add: string) => {
        if (!add) return existing ?? '';
        if (!existing) return add;
        return /[.!?;:]$/.test(existing.trim()) ? `${existing}\n${add}` : `${existing} ${add}`;
      };
      if (expectedCols === 3 && parts.length >= 3) {
        prevRow.competenze = joinCol(prevRow.competenze, parts[0]);
        prevRow.abilita = joinCol(prevRow.abilita, parts[1]);
        prevRow.conoscenze = joinCol(prevRow.conoscenze, parts.slice(2).join(' '));
      } else if (parts.length === 2) {
        prevRow.abilita = joinCol(prevRow.abilita, parts[0]);
        prevRow.conoscenze = joinCol(prevRow.conoscenze, parts[1]);
      } else {
        // 1 parte orfana: se conoscenze non è conclusa, continua conoscenze;
        // altrimenti se abilità non è conclusa, continua abilità; altrimenti conoscenze.
        if (prevRow.conoscenze && !/[.!?;:]$/.test(prevRow.conoscenze.trim())) {
          prevRow.conoscenze = joinCol(prevRow.conoscenze, parts[0]);
        } else if (prevRow.abilita && !/[.!?;:]$/.test(prevRow.abilita.trim())) {
          prevRow.abilita = joinCol(prevRow.abilita, parts[0]);
        } else if (
          prevRow.competenze &&
          !/[.!?;:]$/.test(prevRow.competenze.trim()) &&
          parts[0].length < 55
        ) {
          prevRow.competenze = joinCol(prevRow.competenze, parts[0]);
        } else {
          prevRow.conoscenze = joinCol(prevRow.conoscenze, parts[0]);
        }
      }
      continue;
    }

    if (parts.length >= 3) {
      rows.push({
        id: makeId('imp-row'),
        competenze: parts[0],
        abilita: parts[1],
        conoscenze: parts.slice(2).join(' '),
      });
    } else if (parts.length === 2) {
      rows.push({
        id: makeId('imp-row'),
        competenze: '',
        abilita: parts[0],
        conoscenze: parts[1],
      });
    } else if (parts.length === 1 && rows.length === 0) {
      rows.push({
        id: makeId('imp-row'),
        competenze: '',
        abilita: parts[0],
        conoscenze: '',
      });
    }
  }

  if (rows.length > 0) return { rows, detectedIndicazioni };

  const competenzeBuf: string[] = [];
  const abilitaBuf: string[] = [];
  const conoscenzeBuf: string[] = [];

  let activeCol: 'comp' | 'ab' | 'con' | null = null;
  for (const line of sourceLines) {
    const lower = line.toLowerCase();
    if (/^(?:competenze|traguardi\b)/.test(lower) && !/sviluppo delle competenze/i.test(lower)) {
      activeCol = 'comp';
      const rest = line
        .replace(/^(?:competenze(?:\s+attese)?|traguardi[^:]*)\s*[:\-]?\s*/i, '')
        .trim();
      if (rest && !isPlaceholderValue(rest)) competenzeBuf.push(rest);
      continue;
    }
    if (/^(?:abilit(?:à|a['’]?)|obiettivi(?:\s+specifici)?)/.test(lower)) {
      activeCol = 'ab';
      if (!detectedIndicazioni) {
        if (/^obiettivi/.test(lower)) detectedIndicazioni = 'nuove';
        else if (/^abilit/.test(lower)) detectedIndicazioni = 'vecchie';
      }
      const rest = line
        .replace(/^(?:abilit(?:à|a['’]?)|obiettivi(?:\s+specifici)?)\s*[:\-]?\s*/i, '')
        .trim();
      if (rest && !isPlaceholderValue(rest)) abilitaBuf.push(rest);
      continue;
    }
    if (/^(?:conoscenze|contenuti(?:\s+disciplinari)?|argomenti)/.test(lower)) {
      activeCol = 'con';
      const rest = line
        .replace(/^(?:conoscenze|contenuti(?:\s+disciplinari)?|argomenti)\s*[:\-]?\s*/i, '')
        .trim();
      if (rest && !isPlaceholderValue(rest)) conoscenzeBuf.push(rest);
      continue;
    }
    if (
      activeCol &&
      !/^tenuto conto della/i.test(lower) &&
      !/^\(clicca sul link/i.test(lower) &&
      !isPlaceholderValue(line) &&
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
  }

  return { rows, detectedIndicazioni };
}

function cleanExtractedAltroValue(raw: string): string {
  const withoutUnderline = raw.replace(/_{3,}/g, '').trim();
  if (isPlaceholderValue(withoutUnderline)) return '';
  return withoutUnderline;
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

  const { fullText, lines, tables, emphasizedLines = [] } = extracted;
  const warnings: string[] = [];
  const recognizedFields: RecognizedImportField[] = [];
  const unrecognizedBlocks: UnrecognizedImportBlock[] = [];
  const consumedSubstrings: string[] = [];

  const recordRecognized = (
    id: string,
    label: string,
    section: string,
    value: string,
    confidence: 'alta' | 'media' = 'alta'
  ) => {
    const cleanVal = value.trim();
    if (!cleanVal) return;
    recognizedFields.push({
      id,
      label,
      section,
      valuePreview: cleanVal.length > 140 ? `${cleanVal.slice(0, 140)}…` : cleanVal,
      confidence,
    });
    consumedSubstrings.push(cleanVal);
  };

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

  // 1. Dati Generali (supporta sia "ETICHETTA: valore" che "ETICHETTA\tvalore" senza ":", anche con separatore "|")
  const disciplina = detectDisciplina(fullText, basePlan.datiGenerali.disciplina);
  const { classe, sezione } = detectClasseAndSezione(fullText);
  const asMatch = fullText.match(
    /(?:ANNO\s+SCOLASTICO|A\.?\s*S\.?)(?:\s*[:\-]\s*|\s+)(\d{2,4}\s*[\/\-]\s*\d{2,4})/i
  );
  const plessoMatch = fullText.match(
    /PLESSO(?:\s+DI\s*[:\-]?)?(?:\s*[:\-]\s*|\s+)([A-Za-zÀ-ÿ' ]{3,35}?)(?=\s*(?:\n|\||ANNO\b|CLASSE\b|DISCIPLINA\b|DOCENTE\b|$))/im
  );
  const scuolaMatch = fullText.match(/(?:^|\n|\|)\s*SCUOLA\s*[:\-]?\s+([^\n|]+)/im);
  const docenteFieldMatch = fullText.match(/(?:^|\n|\|)\s*DOCENTE\s*[:\-]?\s+([^\n|]+)/im);
  const signatureMatch = fullText.match(
    /(?:^|\n)\s*(La\s+docente|Il\s+docente|Il\/La\s+Docente)\s*((?:Prof\.?\s*ssa|Prof\.?)?\s*[A-Za-zÀ-ÿ' ]{0,55})/im
  );

  let docenteName = basePlan.datiGenerali.docente;
  let docenteGenere: DocenteGenere =
    basePlan.datiGenerali.docenteGenere ?? settings.defaultDocenteGenere ?? 'F';

  const applyDocenteCandidate = (rawField: string, hintText: string) => {
    const cleaned = stripLeadingUnderscores(rawField.replace(/[_\n|].*$/, '').trim());
    if (!/il\s*\/\s*la\s+docente/i.test(hintText)) {
      if (/\bprof\.?\s*ssa\b|\bla\s+docente\b/i.test(hintText)) docenteGenere = 'F';
      else if (/\bprof\.?(?=\s|$)|\bil\s+docente\b/i.test(hintText)) docenteGenere = 'M';
    }
    if (!isPlaceholderValue(cleaned)) {
      const stripped = stripDocenteTitoli(cleaned);
      if (stripped && stripped.length > 2) docenteName = stripped;
    }
  };

  if (docenteFieldMatch?.[1]) {
    applyDocenteCandidate(docenteFieldMatch[1], docenteFieldMatch[0]);
  }
  if (signatureMatch) {
    applyDocenteCandidate(signatureMatch[2] || '', signatureMatch[0]);
  }

  if (disciplina) {
    basePlan.datiGenerali.disciplina = disciplina;
    basePlan.datiGenerali.titoloDisciplina = disciplina;
    sectionsMatched.push('Dati generali');
    recordRecognized('disciplina', 'Disciplina', 'Dati generali', disciplina);
  }
  if (scuolaMatch?.[1] && !isPlaceholderValue(stripLeadingUnderscores(scuolaMatch[1]))) {
    const sc = stripLeadingUnderscores(scuolaMatch[1]);
    basePlan.datiGenerali.scuola = sc;
    recordRecognized('scuola', 'Scuola', 'Dati generali', sc);
  }
  if (classe) {
    basePlan.datiGenerali.classe = classe;
    recordRecognized('classe', 'Classe e Sezione', 'Dati generali', `${classe} ${sezione ?? ''}`.trim());
  }
  if (sezione) basePlan.datiGenerali.sezione = sezione;
  if (asMatch?.[1]) {
    const rawAs = asMatch[1].replace(/\s+/g, '');
    const mAs = rawAs.match(/^(\d{2,4})[\/\-](\d{2,4})$/);
    if (mAs) {
      const startYr = mAs[1].length === 2 ? `20${mAs[1]}` : mAs[1];
      const endYr = mAs[2].length === 4 ? mAs[2].slice(2) : mAs[2];
      basePlan.datiGenerali.annoScolastico = `${startYr}/${endYr}`;
    } else {
      basePlan.datiGenerali.annoScolastico = rawAs;
    }
    recordRecognized(
      'annoScolastico',
      'Anno scolastico',
      'Dati generali',
      basePlan.datiGenerali.annoScolastico
    );
  }
  if (plessoMatch?.[1]) {
    const cleanPlesso = stripLeadingUnderscores(plessoMatch[1]);
    if (!isPlaceholderValue(cleanPlesso)) {
      const matchedPlesso = PLESSI_ISTITUTO.find((p) =>
        cleanPlesso.toLowerCase().includes(p.toLowerCase())
      );
      basePlan.datiGenerali.plesso = matchedPlesso ?? cleanPlesso;
      recordRecognized('plesso', 'Plesso', 'Dati generali', basePlan.datiGenerali.plesso);
    }
  }
  basePlan.datiGenerali.docente = docenteName;
  basePlan.datiGenerali.docenteGenere = docenteGenere;
  basePlan.verificheValutazione.firmaDocente = docenteName;
  if (docenteName) {
    recordRecognized(
      'docente',
      'Docente',
      'Dati generali',
      `${docenteGenere === 'M' ? 'Prof.' : 'Prof.ssa'} ${docenteName}`
    );
  }

  // 2. Composizione della classe (supporta sia 1 riga x 5/6 celle che 2 righe x 5/6 celle e testo in linea, incluso "Con disabilità" / "H")
  const compTable = tables.find(
    (t) =>
      t[0]?.some((c) => /alunni/i.test(c)) &&
      t[0]?.some((c) => /maschi/i.test(c))
  );
  if (compTable) {
    const firstRowHasNums = compTable[0].filter((c) => /\d+/.test(c)).length >= 3;
    const headerRow = compTable[0];
    const targetRow = firstRowHasNums ? compTable[0] : compTable[1];
    if (targetRow && targetRow.length >= 4) {
      const extractInt = (cell: string) => {
        const m = cell.match(/\d+/);
        return m ? parseInt(m[0], 10) : NaN;
      };
      const matchCellByLabel = (rx: RegExp, fallbackIdx: number): number => {
        for (let idx = 0; idx < targetRow.length; idx++) {
          const labelSource = firstRowHasNums ? targetRow[idx] : headerRow[idx] ?? '';
          if (rx.test(labelSource)) {
            const val = extractInt(targetRow[idx]);
            if (!Number.isNaN(val)) return val;
          }
        }
        return fallbackIdx < targetRow.length ? extractInt(targetRow[fallbackIdx]) : NaN;
      };

      const vAlunni = matchCellByLabel(/\balunni\b/i, 0);
      const vMaschi = matchCellByLabel(/\bmaschi\b/i, 1);
      const vFemmine = matchCellByLabel(/\bfemmine\b/i, 2);
      const vRip = matchCellByLabel(/\bripetent/i, 3);
      const vBes = matchCellByLabel(/\bbes\b|bisogni educativi/i, 4);
      const vDis = matchCellByLabel(/disabilit|^h\b|alunni\s+h/i, 5);

      if (!Number.isNaN(vAlunni)) basePlan.composizione.alunni = vAlunni;
      if (!Number.isNaN(vMaschi)) basePlan.composizione.maschi = vMaschi;
      if (!Number.isNaN(vFemmine)) basePlan.composizione.femmine = vFemmine;
      if (!Number.isNaN(vRip)) basePlan.composizione.ripetenti = vRip;
      if (!Number.isNaN(vBes)) basePlan.composizione.bes = vBes;
      if (!Number.isNaN(vDis)) {
        basePlan.composizione.disabilita = vDis;
      } else {
        basePlan.composizione.disabilita = basePlan.composizione.disabilita ?? 0;
      }
      sectionsMatched.push('Composizione');
      recordRecognized(
        'composizione',
        'Composizione classe',
        'Composizione',
        `Alunni ${basePlan.composizione.alunni}, M ${basePlan.composizione.maschi}, F ${basePlan.composizione.femmine}, Rip. ${basePlan.composizione.ripetenti}, BES ${basePlan.composizione.bes}, Disabilità ${basePlan.composizione.disabilita ?? 0}`
      );
    }
  } else {
    const compPipeLine = lines.find((l) =>
      /^\d+\s*\|\s*\d+\s*\|\s*\d+\s*\|\s*\d+\s*\|\s*\d+(?:\s*\|\s*\d+)?/.test(l)
    );
    if (compPipeLine) {
      const nums = compPipeLine.split('|').map((p) => parseInt(p.trim(), 10));
      if (nums.length >= 5 && nums.every((n) => !Number.isNaN(n))) {
        basePlan.composizione = {
          alunni: nums[0],
          maschi: nums[1],
          femmine: nums[2],
          ripetenti: nums[3],
          bes: nums[4],
          disabilita: nums[5] ?? 0,
        };
        sectionsMatched.push('Composizione');
        recordRecognized(
          'composizione',
          'Composizione classe',
          'Composizione',
          `Alunni ${nums[0]}, M ${nums[1]}, F ${nums[2]}, Rip. ${nums[3]}, BES ${nums[4]}, Disabilità ${nums[5] ?? 0}`
        );
      }
    } else {
      const alunniM = fullText.match(/\bAlunni(?:\s+totali)?\s*[:\-]\s*(\d{1,2})\b/i);
      const maschiM = fullText.match(/\bMaschi\s*[:\-]\s*(\d{1,2})\b/i);
      const femmineM = fullText.match(/\bFemmine\s*[:\-]\s*(\d{1,2})\b/i);
      const ripM = fullText.match(/\bRipetenti\s*[:\-]\s*(\d{1,2})\b/i);
      const besM = fullText.match(
        /(?:Con Bisogni Educativi Speciali\s*\(BES\)|BES)\s*[:\-]\s*(\d{1,2})\b/i
      );
      const disM = fullText.match(
        /(?:^|\n|\||\s)(?:Con\s+disabilit[àa]|Alunni(?:\s+con)?\s+H|H)\s*[:\-]\s*(\d{1,2})\b/im
      );
      if (alunniM || maschiM || femmineM || besM || disM) {
        if (alunniM) basePlan.composizione.alunni = Number(alunniM[1]);
        if (maschiM) basePlan.composizione.maschi = Number(maschiM[1]);
        if (femmineM) basePlan.composizione.femmine = Number(femmineM[1]);
        if (ripM) basePlan.composizione.ripetenti = Number(ripM[1]);
        if (besM) basePlan.composizione.bes = Number(besM[1]);
        if (disM) basePlan.composizione.disabilita = Number(disM[1]);
        sectionsMatched.push('Composizione');
        recordRecognized(
          'composizione',
          'Composizione classe',
          'Composizione',
          `Alunni ${basePlan.composizione.alunni}, M ${basePlan.composizione.maschi}, F ${basePlan.composizione.femmine}, Rip. ${basePlan.composizione.ripetenti}, BES ${basePlan.composizione.bes}, Disabilità ${basePlan.composizione.disabilita ?? 0}`
        );
      }
    }
  }

  // 3. Checkbox / elenchi per sezione (scoped per evitare falsi positivi tra sezioni diverse)
  const rawSituazioneSlice = extractSectionSlice(fullText, /SITUAZIONE DELLA CLASSE[^\n]*/i, [
    /(?:^|\n)\s*ANALISI DELLA SITUAZIONE DI PARTENZA/i,
  ]);
  const rawFontiSlice = extractSectionSlice(fullText, /FONTI DI RILEVAZIONE DEI\s+DATI[^\n]*/i, [
    /(?:^|\n)\s*STRATEGIE ED INTERVENTI/i,
  ]);
  const rawInterventiSlice = extractSectionSlice(fullText, /STRATEGIE ED INTERVENTI[^\n]*/i, [
    /Alunni con BES/i,
    /TRAGUARDI PER LO SVILUPPO/i,
  ]);
  const rawPotSlice = extractSectionSlice(rawInterventiSlice, /(?:^|\n)\s*POTENZIAMENTO\b/i, [
    /(?:^|\n)\s*CONSOLIDAMENTO\b/i,
    /(?:^|\n)\s*RECUPERO\b/i,
  ]);
  const rawConsSlice = extractSectionSlice(rawInterventiSlice, /(?:^|\n)\s*CONSOLIDAMENTO\b/i, [
    /(?:^|\n)\s*RECUPERO\b/i,
  ]);
  const rawRecSlice = extractSectionSlice(rawInterventiSlice, /(?:^|\n)\s*RECUPERO\b/i, [
    /Alunni con BES/i,
  ]);
  const rawMetodiSlice = extractSectionSlice(fullText, /(?:^|\n)\s*CRITERI METODOLOGICI[^\n]*/i, [
    /(?:^|\n)\s*AUSILI DIDATTICI\b/i,
    /(?:^|\n)\s*DIDATTICA DIGITALE INTEGRATA\b/i,
    /(?:^|\n)\s*VERIFICHE IN ITINERE\b/i,
  ]);
  const rawVerificheSlice = extractSectionSlice(fullText, /(?:^|\n)\s*VERIFICHE IN ITINERE[^\n]*/i, [
    /\n\s*(?:CRITERI\s+DI\s+)?VALUTAZIONE(?:\s+DEGLI\s+APPRENDIMENTI)?\s*:?\s*(?:\n|$)/i,
  ]);

  const situazioneSlice = rawSituazioneSlice || fullText;
  const fontiSlice = rawFontiSlice || fullText;
  const potSlice = rawPotSlice || rawInterventiSlice || fullText;
  const consSlice = rawConsSlice || rawInterventiSlice || fullText;
  const recSlice = rawRecSlice || rawInterventiSlice || fullText;
  const metodiSlice = rawMetodiSlice || fullText;
  const verificheSlice = rawVerificheSlice || fullText;

  const checkedTipologie = TIPOLOGIE_CLASSE_OPTIONS.filter((o) =>
    matchCheckedOption(situazioneSlice, o)
  );
  if (checkedTipologie.length > 0) {
    basePlan.situazione.tipologie = checkedTipologie;
    recordRecognized('tipologia', 'Tipologia classe', 'Situazione', checkedTipologie.join(', '));
  }

  let checkedLivello = LIVELLI_CLASSE_OPTIONS.find((o) =>
    matchCheckedOption(situazioneSlice, o.label)
  );
  if (!checkedLivello && rawSituazioneSlice && !hasAnyCheckboxGlyph(rawSituazioneSlice)) {
    if (emphasizedLines.length > 0) {
      const emLevels = LIVELLI_CLASSE_OPTIONS.filter((o) => {
        const rx = new RegExp(`(?<![A-Za-zÀ-ÿ\\-])${escapeRegex(o.label)}(?![A-Za-zÀ-ÿ\\-])`, 'i');
        return emphasizedLines.some((em) => rx.test(em) && rx.test(rawSituazioneSlice));
      });
      if (emLevels.length === 1) checkedLivello = emLevels[0];
    }
    if (!checkedLivello) {
      const presentLevels = LIVELLI_CLASSE_OPTIONS.filter((o) =>
        new RegExp(`(?<![A-Za-zÀ-ÿ\\-])${escapeRegex(o.label)}(?![A-Za-zÀ-ÿ\\-])`, 'i').test(
          rawSituazioneSlice
        )
      );
      if (presentLevels.length === 1) {
        checkedLivello = presentLevels[0];
      }
    }
  }
  if (checkedLivello) {
    basePlan.situazione.livello = checkedLivello.value;
    recordRecognized('livello', 'Livello classe', 'Situazione', checkedLivello.label);
  }

  const checkedMezzi = resolveMultiSelectWithFallbacks(
    rawSituazioneSlice,
    situazioneSlice,
    MEZZI_INDIVIDUAZIONE_OPTIONS,
    emphasizedLines
  );
  if (checkedMezzi.length > 0) {
    basePlan.situazione.mezziIndividuazione = checkedMezzi;
    recordRecognized(
      'mezziIndividuazione',
      'Mezzi di individuazione',
      'Situazione',
      checkedMezzi.join('; ')
    );
  }

  const checkedFonti = resolveMultiSelectWithFallbacks(
    rawFontiSlice,
    fontiSlice,
    FONTI_RILEVAZIONE_OPTIONS,
    emphasizedLines
  );
  if (checkedFonti.length > 0) {
    basePlan.analisiPartenza.fontiRilevazione = checkedFonti;
    recordRecognized('fonti', 'Fonti di rilevazione', 'Analisi', checkedFonti.join('; '));
  }
  const altraFonteMatch = fontiSlice.match(/(?:☒|☑|✔|\[[xX]\])?\s*\baltro\s*:\s*([^\n]+)/i);
  if (altraFonteMatch?.[1]) {
    const cleanAltra = cleanExtractedAltroValue(altraFonteMatch[1]);
    if (cleanAltra) {
      basePlan.analisiPartenza.altraFonte = cleanAltra;
      recordRecognized('altraFonte', 'Altra fonte', 'Analisi', cleanAltra);
    }
  }

  const checkedPot = resolveMultiSelectWithFallbacks(
    rawPotSlice,
    potSlice,
    STRATEGIE_POTENZIAMENTO_OPTIONS,
    emphasizedLines
  );
  if (checkedPot.length > 0) {
    basePlan.interventi.potenziamento = checkedPot;
    recordRecognized('potenziamento', 'Strategie potenziamento', 'Interventi', checkedPot.join('; '));
  }
  const potAltroM = potSlice.match(/\bAltro\s*[:\s]\s*([^\n]+)/i);
  if (potAltroM?.[1]) {
    const val = cleanExtractedAltroValue(potAltroM[1]);
    if (val) {
      basePlan.interventi.potenziamentoAltro = val;
      recordRecognized('potAltro', 'Altro potenziamento', 'Interventi', val);
    }
  }

  const checkedCons = resolveMultiSelectWithFallbacks(
    rawConsSlice,
    consSlice,
    STRATEGIE_CONSOLIDAMENTO_OPTIONS,
    emphasizedLines
  );
  if (checkedCons.length > 0) {
    basePlan.interventi.consolidamento = checkedCons;
    recordRecognized('consolidamento', 'Strategie consolidamento', 'Interventi', checkedCons.join('; '));
  }
  const consAltroM = consSlice.match(/\bAltro\s*[:\s]\s*([^\n]+)/i);
  if (consAltroM?.[1]) {
    const val = cleanExtractedAltroValue(consAltroM[1]);
    if (val) {
      basePlan.interventi.consolidamentoAltro = val;
      recordRecognized('consAltro', 'Altro consolidamento', 'Interventi', val);
    }
  }

  const checkedRec = resolveMultiSelectWithFallbacks(
    rawRecSlice,
    recSlice,
    STRATEGIE_RECUPERO_OPTIONS,
    emphasizedLines
  );
  if (checkedRec.length > 0) {
    basePlan.interventi.recupero = checkedRec;
    recordRecognized('recupero', 'Strategie recupero', 'Interventi', checkedRec.join('; '));
  }
  const recAltroM = recSlice.match(/\bAltro\s*[:\s]\s*([^\n]+)/i);
  if (recAltroM?.[1]) {
    const val = cleanExtractedAltroValue(recAltroM[1]);
    if (val) {
      basePlan.interventi.recuperoAltro = val;
      recordRecognized('recAltro', 'Altro recupero', 'Interventi', val);
    }
  }

  const checkedMetodi = resolveMultiSelectWithFallbacks(
    rawMetodiSlice,
    metodiSlice,
    METODI_OPTIONS,
    emphasizedLines
  );
  if (checkedMetodi.length > 0) {
    basePlan.metodiStrumenti.metodi = checkedMetodi;
    recordRecognized('metodi', 'Metodi didattici', 'Metodi e strumenti', checkedMetodi.join('; '));
  }
  const altreMetM = metodiSlice.match(/ALTRE METODOLOGIE(?:\s*\([^)]*\))?\s*:\s*([^\n]+)/i);
  if (altreMetM?.[1]) {
    const val = cleanExtractedAltroValue(altreMetM[1]);
    if (val) {
      basePlan.metodiStrumenti.altreMetodologie = val;
      recordRecognized('altreMet', 'Altre metodologie', 'Metodi e strumenti', val);
    }
  }

  const checkedStrumenti = resolveMultiSelectWithFallbacks(
    rawMetodiSlice,
    metodiSlice,
    MEZZI_STRUMENTI_OPTIONS,
    emphasizedLines
  );
  if (checkedStrumenti.length > 0) {
    basePlan.metodiStrumenti.mezziEStrumenti = checkedStrumenti;
    recordRecognized(
      'mezziEStrumenti',
      'Mezzi e strumenti',
      'Metodi e strumenti',
      checkedStrumenti.join('; ')
    );
  }
  const altriSusM = metodiSlice.match(/ALTRI SUSSIDI\s*:\s*([^\n]+)/i);
  if (altriSusM?.[1]) {
    const val = cleanExtractedAltroValue(altriSusM[1]);
    if (val) {
      basePlan.metodiStrumenti.altriSussidi = val;
      recordRecognized('altriSus', 'Altri sussidi', 'Metodi e strumenti', val);
    }
  }

  const checkedScritte = resolveMultiSelectWithFallbacks(
    rawVerificheSlice,
    verificheSlice,
    VERIFICHE_SCRITTE_OPTIONS,
    emphasizedLines
  );
  if (checkedScritte.length > 0) {
    basePlan.verificheValutazione.verificheScritte = checkedScritte;
    recordRecognized('verScritte', 'Verifiche scritte', 'Verifiche', checkedScritte.join('; '));
  }

  const checkedOrali = resolveMultiSelectWithFallbacks(
    rawVerificheSlice,
    verificheSlice,
    VERIFICHE_ORALI_OPTIONS,
    emphasizedLines
  );
  if (checkedOrali.length > 0) {
    basePlan.verificheValutazione.verificheOrali = checkedOrali;
    recordRecognized('verOrali', 'Verifiche orali', 'Verifiche', checkedOrali.join('; '));
  }

  const altriProveM = verificheSlice.match(/ALTRI TIPI DI PROVE\s*:\s*([^\n]+)/i);
  if (altriProveM?.[1]) {
    const val = cleanExtractedAltroValue(altriProveM[1]);
    if (val) {
      basePlan.verificheValutazione.altriTipiProve = val;
      recordRecognized('altriProve', 'Altri tipi di prove', 'Verifiche', val);
    }
  }

  // 4. Analisi disciplinare, 4 box livelli di partenza, BES
  const analisiSlice =
    extractSectionSlice(
      fullText,
      /SITUAZIONE DI PARTENZA DEGLI ALUNNI IN RELAZIONE ALLA DISCIPLINA\s*:?/i,
      [
        /(?:^|\n)\s*2\.\s*Livelli di partenza/i,
        /(?:^|\n)\s*Livello basso/i,
        /(?:^|\n)\s*Livelli rilevati/i,
        /(?:^|\n)\s*FONTI DI RILEVAZIONE/i,
      ]
    ) ||
    extractSectionSlice(fullText, /(?:^|\n)\s*ANALISI DELLA SITUAZIONE DI PARTENZA[^\n]*/i, [
      /(?:^|\n)\s*2\.\s*Livelli di partenza/i,
      /(?:^|\n)\s*Livello basso/i,
      /(?:^|\n)\s*Livelli rilevati/i,
      /(?:^|\n)\s*FONTI DI RILEVAZIONE/i,
    ]);
  if (analisiSlice) {
    const normalizedAnalisi = stripLeadingUnderscores(
      analisiSlice
        .replace(/^SITU[A-Z\s']+DISCIPLINA\s*:?\s*/i, '')
        .replace(/^1\.\s*/, '')
    )
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !/^[_\.\-…\s]+$/.test(l))
      .join('\n')
      .trim();
    if (!isPlaceholderValue(normalizedAnalisi)) {
      basePlan.analisiPartenza.descrizioneDisciplinare = normalizedAnalisi;
      sectionsMatched.push('Analisi di partenza');
      recordRecognized('analisiDesc', 'Analisi situazione di partenza', 'Analisi', normalizedAnalisi);
    }
  }

  // 4a. Livelli di partenza rilevati (tabella a 4 colonne, eventuale riga nomi sotto, o riga riassuntiva)
  const livelliTable = tables.find(
    (t) =>
      t[0]?.some((c) => /livello basso|\bbasso\s*:\s*\d+/i.test(c)) &&
      t[0]?.some((c) => /livello alto|\balto\s*:\s*\d+/i.test(c))
  );
  if (livelliTable) {
    const row0 = livelliTable[0];
    const hasInlineCounts = (row: string[]) =>
      row.filter((c) => /\b(?:alunni|basso|medio\/basso|medio|alto)\s*[:\-]?\s*\d+/i.test(c)).length >= 3;
    const rowDataIdx =
      livelliTable.length >= 2 && !hasInlineCounts(row0) ? 1 : 0;
    const rowData = livelliTable[rowDataIdx];
    const extractAlunni = (cell: string) => {
      const m = cell.match(/\b(?:alunni|basso|medio\/basso|medio|alto)\s*[:\-]?\s*(\d+)/i);
      return m ? parseInt(m[1], 10) : NaN;
    };
    if (rowData.length >= 4) {
      const b = extractAlunni(rowData[0]);
      const mb = extractAlunni(rowData[1]);
      const m = extractAlunni(rowData[2]);
      const a = extractAlunni(rowData[3]);
      if (!Number.isNaN(b)) basePlan.analisiPartenza.livelli.bassoAlunni = b;
      if (!Number.isNaN(mb)) basePlan.analisiPartenza.livelli.medioBassoAlunni = mb;
      if (!Number.isNaN(m)) basePlan.analisiPartenza.livelli.medioAlunni = m;
      if (!Number.isNaN(a)) basePlan.analisiPartenza.livelli.altoAlunni = a;
      if ([b, mb, m, a].some((n) => !Number.isNaN(n))) {
        sectionsMatched.push('Livelli di partenza');
        recordRecognized(
          'livelli',
          'Livelli di partenza rilevati',
          'Analisi',
          `Basso: ${basePlan.analisiPartenza.livelli.bassoAlunni}, Medio/basso: ${basePlan.analisiPartenza.livelli.medioBassoAlunni}, Medio: ${basePlan.analisiPartenza.livelli.medioAlunni}, Alto: ${basePlan.analisiPartenza.livelli.altoAlunni}`
        );
      }
    }
    // Riga sottostante con i nominativi degli alunni per fascia (se presente e non vuota)
    const namesRow = livelliTable[rowDataIdx + 1];
    if (namesRow && namesRow.length >= 4) {
      const bandOrder: FasciaLivelloKey[] = ['basso', 'medio_basso', 'medio', 'alto'];
      const importedStudents: AnonymousStudentBandEntry[] = [];
      let order = 1;
      for (let i = 0; i < 4; i++) {
        const cell = (namesRow[i] ?? '').trim();
        if (!cell || isPlaceholderValue(cell)) continue;
        consumedSubstrings.push(cell);
        const names = cell
          .split(/[\n,;]+/)
          .map((n) => n.trim())
          .filter((n) => n.length > 1 && !isPlaceholderValue(n));
        for (const nom of names) {
          consumedSubstrings.push(nom);
          importedStudents.push({
            id: makeId('imp-stud'),
            ordine: order,
            labelAnonimo: `Alunno ${order}`,
            nominativo: nom,
            media: null,
            fasciaAutomatica: bandOrder[i],
            fasciaCorrente: bandOrder[i],
            spostatoDalDocente: false,
          });
          order += 1;
        }
      }
      if (importedStudents.length > 0 && !(basePlan.analisiPartenza.alunniAnonimiFasce?.length)) {
        basePlan.analisiPartenza.alunniAnonimiFasce = importedStudents;
      }
    }
  } else {
    const sumMatch = fullText.match(
      /Livelli rilevati\s*-\s*Basso:\s*(\d+)\s*alunni\s*\|\s*Medio\/basso:\s*(\d+)\s*alunni\s*\|\s*Medio:\s*(\d+)\s*alunni\s*\|\s*Alto:\s*(\d+)\s*alunni/i
    );
    if (sumMatch) {
      basePlan.analisiPartenza.livelli = {
        bassoAlunni: Number(sumMatch[1]),
        medioBassoAlunni: Number(sumMatch[2]),
        medioAlunni: Number(sumMatch[3]),
        altoAlunni: Number(sumMatch[4]),
      };
      sectionsMatched.push('Livelli di partenza');
      recordRecognized(
        'livelli',
        'Livelli di partenza rilevati',
        'Analisi',
        `Basso: ${sumMatch[1]}, Medio/basso: ${sumMatch[2]}, Medio: ${sumMatch[3]}, Alto: ${sumMatch[4]}`
      );
    }
  }

  const besSlice = extractSectionSlice(
    fullText,
    /Alunni con BES e interventi programmati\s*:?/i,
    [/TRAGUARDI PER LO SVILUPPO/i]
  );
  if (besSlice && !isPlaceholderValue(besSlice) && besSlice.length > 10) {
    basePlan.interventi.besInterventiProgrammati = besSlice;
    sectionsMatched.push('BES e interventi');
    recordRecognized('besInterventi', 'Alunni con BES e interventi', 'Interventi', besSlice);
  }

  // 5. Traguardi, Competenze attese/digitali & Tabella / Programma Curricolo
  const traguardiBlock = extractSectionSlice(
    fullText,
    /TRAGUARDI PER LO SVILUPPO DELLE COMPETENZE(?:\s+IN\s+RELAZIONE[^\n]*)?(?:\s*\(clicca sul link[^)]*\))?/i,
    [
      /Voci dal Curricolo Verticale/i,
      /Tenuto conto della eterogeneit/i,
      /Tenuto conto delle Indicazioni/i,
      /^\s*(?:COMPETENZE\b|ABILIT[ÀA']\b|OBIETTIVI\b)\s*(?:\||$)/im,
      /^\s*Attivit[àa]\s+programmate\s*:/im,
    ]
  );

  const compAttSlice =
    extractSectionSlice(traguardiBlock, /(?:Traguardi e competenze attese|Competenze)\s*:/i, [
      /Competenze digitali/i,
      /Voci dal Curricolo Verticale/i,
      /Tenuto conto/i,
    ]) ||
    extractSectionSlice(fullText, /Traguardi e competenze attese\s*:/i, [
      /Competenze digitali/i,
      /Voci dal Curricolo Verticale/i,
      /Tenuto conto della eterogeneit/i,
      /(?:^|\n)\s*(?:COMPETENZE\b|ABILIT[ÀA']\b|OBIETTIVI\b)/i,
    ]);
  const compLinesSource = compAttSlice
    ? compAttSlice
    : traguardiBlock
    ? extractSectionSlice(`__START__\n${traguardiBlock}`, /^__START__\s*/i, [
        /Competenze digitali/i,
      ])
    : '';
  if (compLinesSource) {
    const extractedComp = compLinesSource
      .split('\n')
      .map((l) => l.replace(/^[•\-\*]\s*/, '').trim())
      .filter(
        (l) =>
          l.length > 3 &&
          !isPlaceholderValue(l) &&
          !/^nessuna competenza/i.test(l) &&
          !/^(?:in relazione al|curricolo verticale del nostro istituto|\(clicca sul link)/i.test(l)
      );
    if (extractedComp.length > 0) {
      basePlan.curricolo.competenzeAttese = extractedComp;
      recordRecognized(
        'competenzeAttese',
        'Traguardi e competenze attese',
        'Curricolo',
        extractedComp.join(' | ')
      );
    }
  }

  const compDigSlice = extractSectionSlice(
    traguardiBlock || fullText,
    /Competenze digitali\s*(?:\([^)]*\))?[^:\n]*:/i,
    [
      /Voci dal Curricolo Verticale/i,
      /Tenuto conto della eterogeneit/i,
      /Tenuto conto delle Indicazioni/i,
      /(?:^|\n)\s*(?:COMPETENZE\b|ABILIT[ÀA']\b|OBIETTIVI\b)/i,
    ]
  );
  if (compDigSlice) {
    const extractedDig = compDigSlice
      .split('\n')
      .map((l) => l.replace(/^[•\-\*]\s*/, '').trim())
      .filter(
        (l) =>
          l.length > 3 &&
          !isPlaceholderValue(l) &&
          !/^nessuna competenza/i.test(l)
      );
    if (extractedDig.length > 0) {
      basePlan.curricolo.competenzeDigitali = extractedDig;
      recordRecognized(
        'competenzeDigitali',
        'Competenze digitali',
        'Curricolo',
        extractedDig.join(' | ')
      );
    }
  }

  const presSinteticaSlice = extractSectionSlice(
    fullText,
    /(?:Presentazione sintetica della classe|Presentazione e caratteristiche della classe)\s*:/i,
    [
      /(?:^|\n)\s*ANALISI DELLA SITUAZIONE DI PARTENZA/i,
      /(?:^|\n)\s*SITU[A-Z\s']+DISCIPLINA/i,
    ]
  );
  if (presSinteticaSlice) {
    consumedSubstrings.push(presSinteticaSlice);
    if (!basePlan.analisiPartenza.descrizioneDisciplinare.trim() && !isPlaceholderValue(presSinteticaSlice)) {
      basePlan.analisiPartenza.descrizioneDisciplinare = presSinteticaSlice;
      recordRecognized('analisiDesc', 'Analisi situazione di partenza', 'Analisi', presSinteticaSlice);
    }
  }

  const {
    rows: tableRows,
    matchedTableIndexes,
    detectedIndicazioni: tblIndicazioni,
  } = detectCurriculumRowsFromTables(tables);
  const lineRes =
    tableRows.length > 0 ? { rows: [], detectedIndicazioni: undefined } : detectCurriculumRowsFromLines(lines, fullText);
  const extractedRows = tableRows.length > 0 ? tableRows : lineRes.rows;
  const detectedIndicazioni = tblIndicazioni ?? lineRes.detectedIndicazioni;
  if (detectedIndicazioni && !existingPlan) {
    basePlan.curricolo.indicazioniVersione = detectedIndicazioni;
  }

  if (extractedRows.length > 0) {
    basePlan.curricolo.righeAbilitaConoscenze = existingPlan
      ? [...existingPlan.curricolo.righeAbilitaConoscenze, ...extractedRows]
      : extractedRows;

    // Se una tabella importata a 3 colonne conteneva competenze vere e proprie (non semplici etichette di nucleo),
    // le rende disponibili in competenzeAttese subito dopo i Traguardi per l'esportazione a 1 colonna + 2 colonne.
    const existingCompSet = new Set(
      basePlan.curricolo.competenzeAttese.map((c) => c.trim().toLowerCase()).filter(Boolean)
    );
    const promotedCompetenze: string[] = [];
    for (const r of extractedRows) {
      const rawComp = (r.competenze ?? '').replace(/^\[[^\]]+\]\s*/, '').trim();
      const rawTrag = (r.traguardo ?? '').trim();
      if (
        rawComp &&
        rawComp.toLowerCase() !== rawTrag.toLowerCase() &&
        rawComp.length > 24 &&
        !existingCompSet.has(rawComp.toLowerCase())
      ) {
        existingCompSet.add(rawComp.toLowerCase());
        promotedCompetenze.push(rawComp);
      }
    }
    if (promotedCompetenze.length > 0) {
      basePlan.curricolo.competenzeAttese = [
        ...basePlan.curricolo.competenzeAttese,
        ...promotedCompetenze,
      ];
    }

    sectionsMatched.push(`Programma (${extractedRows.length} righe)`);
    recordRecognized(
      'curricoloRighe',
      detectedIndicazioni === 'nuove'
        ? 'Tabella Obiettivi / Conoscenze'
        : 'Tabella Abilità / Conoscenze',
      'Curricolo',
      `${extractedRows.length} righe estratte`
    );
  } else {
    warnings.push(
      'Non è stata individuata una tabella compilata di Abilità/Obiettivi e Conoscenze: verifica la Sezione 5 o assegna eventuali blocchi non riconosciuti.'
    );
  }

  const attSlice = extractSectionSlice(fullText, /Attivit[àa]\s+programmate\s*:/i, [
    /(?:^|\n)\s*CRITERI METODOLOGICI/i,
  ]);
  if (attSlice && !isPlaceholderValue(attSlice)) {
    basePlan.curricolo.attivitaProgrammate = attSlice;
    recordRecognized('attivitaProgrammate', 'Attività programmate', 'Curricolo', attSlice);
  }

  // 6. Testi liberi Metodi, Ausili, DDI e Valutazione (senza riscrittura o riassunto)
  const premessaSlice = extractSectionSlice(
    fullText,
    /CRITERI METODOLOGICI(?:,\s*STRATEGIE[,\s]+(?:E\s+)?STRUMENTI)?\s*:?/i,
    [/\n\s*(?:METODI|MEZZI E STRUMENTI|AUSILI DIDATTICI)(?:\s*\||\n|$)/i]
  );
  if (premessaSlice && !isPlaceholderValue(premessaSlice) && premessaSlice.length > 20) {
    basePlan.metodiStrumenti.premessaMetodologica = premessaSlice;
    sectionsMatched.push('Metodologia');
    recordRecognized(
      'premessaMet',
      'Premessa metodologica',
      'Metodi e strumenti',
      premessaSlice
    );
  }

  const ausiliSlice = extractSectionSlice(fullText, /(?:^|\n)\s*AUSILI DIDATTICI\s*:?/i, [
    /(?:^|\n)\s*DIDATTICA DIGITALE INTEGRATA\b/i,
  ])
    .replace(/^\(Libri di testo[^)]*\)\s*/i, '')
    .trim();
  if (ausiliSlice && !isPlaceholderValue(ausiliSlice)) {
    basePlan.metodiStrumenti.ausiliDidattici = ausiliSlice;
    recordRecognized('ausili', 'Ausili didattici', 'Metodi e strumenti', ausiliSlice);
  }

  const ddiSlice = extractSectionSlice(
    fullText,
    /(?:^|\n)\s*DIDATTICA DIGITALE INTEGRATA\s*:?/i,
    [/(?:^|\n)\s*VERIFICHE IN ITINERE\b/i]
  );
  if (ddiSlice && !isPlaceholderValue(ddiSlice) && ddiSlice.length > 20) {
    basePlan.metodiStrumenti.didatticaDigitaleIntegrata = ddiSlice;
    recordRecognized('ddi', 'Didattica digitale integrata', 'Metodi e strumenti', ddiSlice);
  }

  const valSlice = extractSectionSlice(
    fullText,
    /(?:^|\n)\s*(?:CRITERI\s+DI\s+)?VALUTAZIONE(?:\s+DEGLI\s+APPRENDIMENTI)?\s*:?\s*(?:\n|$)/i,
    [/(?:^|\n)\s*(?:Il\s+docente|La\s+docente|Il\/La\s+Docente)\b/i]
  );
  if (valSlice && !isPlaceholderValue(valSlice) && valSlice.length > 20) {
    basePlan.verificheValutazione.criteriValutazione = valSlice;
    sectionsMatched.push('Valutazione');
    recordRecognized('valutazione', 'Criteri di valutazione', 'Verifiche e valutazione', valSlice);
  }

  // 7. Rileva eventuali blocchi sostanziali non riconosciuti con certezza per verifica manuale
  const knownBoilerplatePatterns: RegExp[] = [
    /^ministero dell['’]istruzione/i,
    /^istituto comprensivo/i,
    /^corso san marco/i,
    /^tel\.|pec\.|distretto \d|codice fiscale/i,
    /^programmazione disciplinare\b|^programmazione didattica\b/i,
    /^scuola\b|^plesso\b|^anno scolastico\b|^classe\b|^disciplina\b|^docente\b/i,
    /^composizione della classe/i,
    /^alunni\b|^maschi\b|^femmine\b|^ripetenti\b|^con bisogni|^con disabilit/i,
    /^situazione della classe/i,
    /^presentazione e caratteristiche/i,
    /^tipologia\b|^livello\b|^mezzi utilizzati|^ed i bisogni degli alunni/i,
    /^analisi della situazione/i,
    /^situazione di partenza degli alunni|^relazione alla disciplina/i,
    /^livelli di partenza|^livello basso|^livello medio|^livello alto|^alunni:\s*\d+/i,
    /^\(voti inferiori|^(\(voto 6\)|\(voti 7\/8\)|\(voti 9)/i,
    /^fonti di rilevazione/i,
    /^strategie ed interventi|^strategie da utilizzare/i,
    /^gruppi di livello|^potenziamento|^consolidamento|^recupero/i,
    /^alunni con bes/i,
    /^traguardi per lo sviluppo|^in relazione al curricolo verticale|^curricolo verticale del nostro istituto|^tenuto conto|^nessuna competenza|^\(clicca sul link/i,
    /^competenze(?:\s+digitali)?\s*:?$|^abilit(?:à|a['’]?)\b|^obiettivi\b|^conoscenze\b|^attivit(?:à|a['’]?)\s+programmate/i,
    /^criteri metodologici|^metodi\b|^mezzi e strumenti|^ausili didattici|^\(libri di testo|^didattica digitale|^altre metodologie|^altri sussidi/i,
    /^verifiche in itinere|^scritta\b|^orale\b|^altri tipi di prove/i,
    /^(?:criteri di\s+)?valutazione(?:\s+degli apprendimenti)?\s*:?$|^il\/la docente$|^il docente\b|^la docente\b/i,
  ];
  const allOptionStrings = [
    ...TIPOLOGIE_CLASSE_OPTIONS,
    ...LIVELLI_CLASSE_OPTIONS.map((l) => l.label),
    ...MEZZI_INDIVIDUAZIONE_OPTIONS,
    ...FONTI_RILEVAZIONE_OPTIONS,
    ...STRATEGIE_POTENZIAMENTO_OPTIONS,
    ...STRATEGIE_CONSOLIDAMENTO_OPTIONS,
    ...STRATEGIE_RECUPERO_OPTIONS,
    ...METODI_OPTIONS,
    ...MEZZI_STRUMENTI_OPTIONS,
    ...VERIFICHE_SCRITTE_OPTIONS,
    ...VERIFICHE_ORALI_OPTIONS,
  ].map((s) => s.toLowerCase());

  const normCmp = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  const consumedLower = consumedSubstrings.map(normCmp);
  const seenUnrecognized = new Set<string>();

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.length < 18 || isPlaceholderValue(line)) continue;
    const lower = normCmp(line);

    if (knownBoilerplatePatterns.some((rx) => rx.test(line))) continue;
    if (allOptionStrings.some((opt) => lower.includes(opt))) continue;
    if (
      consumedLower.some(
        (c) => c.includes(lower) || lower.includes(c)
      )
    ) {
      continue;
    }
    if (
      extractedRows.some((r) =>
        [r.competenze, r.traguardo, r.abilita, r.conoscenze]
          .filter(Boolean)
          .some((cell) => {
            const nc = normCmp(cell!);
            return nc.includes(lower) || lower.includes(nc);
          })
      )
    ) {
      continue;
    }

    // Anche tabelle non curricolo già gestite non vanno nei blocchi non riconosciuti
    const inUnmatchedTable = tables.some(
      (t, idx) =>
        !matchedTableIndexes.has(idx) &&
        idx > 2 &&
        t.some((row) => row.some((c) => c.toLowerCase().includes(lower)))
    );

    if (!seenUnrecognized.has(lower)) {
      seenUnrecognized.add(lower);
      unrecognizedBlocks.push({
        id: makeId('unrec'),
        text: line,
        reason: inUnmatchedTable
          ? 'Contenuto di tabella non associato automaticamente ad alcuna sezione.'
          : 'Paragrafo non collocato con certezza in un campo specifico.',
      });
    }
  }

  if (fileType === 'doc') {
    warnings.push(
      'File legacy .doc importato offline: controlla l’anteprima dei campi prima di confermare.'
    );
  }
  if (unrecognizedBlocks.length > 0) {
    warnings.push(
      `${unrecognizedBlocks.length} blocchi di testo non sono stati assegnati automaticamente con certezza: puoi associarli manualmente nell'anteprima.`
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
    recognizedFields,
    unrecognizedBlocks,
    warnings,
    rawText: fullText,
  };
}

export function applyUnrecognizedBlockAssignments(
  plan: Programmazione,
  blocks: UnrecognizedImportBlock[],
  assignments: Record<string, ImportBlockTargetField>
): Programmazione {
  const next = structuredClone(plan);
  const appendText = (current: string, addition: string) =>
    current.trim() ? `${current.trim()}\n${addition.trim()}` : addition.trim();

  for (const block of blocks) {
    const target = assignments[block.id] ?? 'ignore';
    const text = block.text.trim();
    if (!text || target === 'ignore') continue;

    switch (target) {
      case 'analisiPartenza.descrizioneDisciplinare':
        next.analisiPartenza.descrizioneDisciplinare = appendText(
          next.analisiPartenza.descrizioneDisciplinare,
          text
        );
        break;
      case 'interventi.besInterventiProgrammati':
        next.interventi.besInterventiProgrammati = appendText(
          next.interventi.besInterventiProgrammati,
          text
        );
        break;
      case 'curricolo.competenzeAttese':
        next.curricolo.competenzeAttese = [...next.curricolo.competenzeAttese, text];
        break;
      case 'curricolo.righeAbilitaConoscenze': {
        const parts = text.split(' | ').map((p) => p.trim()).filter(Boolean);
        next.curricolo.righeAbilitaConoscenze = [
          ...next.curricolo.righeAbilitaConoscenze,
          parts.length >= 3
            ? {
                id: makeId('manual-row'),
                competenze: parts[0],
                abilita: parts[1],
                conoscenze: parts.slice(2).join(' '),
              }
            : parts.length === 2
            ? {
                id: makeId('manual-row'),
                competenze: '',
                abilita: parts[0],
                conoscenze: parts[1],
              }
            : {
                id: makeId('manual-row'),
                competenze: '',
                abilita: '',
                conoscenze: text,
              },
        ];
        break;
      }
      case 'curricolo.mergeLastRowAbilita': {
        const list = [...next.curricolo.righeAbilitaConoscenze];
        if (list.length === 0) {
          list.push({ id: makeId('manual-row'), competenze: '', abilita: text, conoscenze: '' });
        } else {
          const last = { ...list[list.length - 1] };
          last.abilita = appendText(last.abilita, text);
          list[list.length - 1] = last;
        }
        next.curricolo.righeAbilitaConoscenze = list;
        break;
      }
      case 'curricolo.mergeLastRowConoscenze': {
        const list = [...next.curricolo.righeAbilitaConoscenze];
        if (list.length === 0) {
          list.push({ id: makeId('manual-row'), competenze: '', abilita: '', conoscenze: text });
        } else {
          const last = { ...list[list.length - 1] };
          last.conoscenze = appendText(last.conoscenze, text);
          list[list.length - 1] = last;
        }
        next.curricolo.righeAbilitaConoscenze = list;
        break;
      }
      case 'curricolo.attivitaProgrammate':
        next.curricolo.attivitaProgrammate = appendText(
          next.curricolo.attivitaProgrammate,
          text
        );
        break;
      case 'metodiStrumenti.premessaMetodologica':
        next.metodiStrumenti.premessaMetodologica = appendText(
          next.metodiStrumenti.premessaMetodologica,
          text
        );
        break;
      case 'metodiStrumenti.ausiliDidattici':
        next.metodiStrumenti.ausiliDidattici = appendText(
          next.metodiStrumenti.ausiliDidattici,
          text
        );
        break;
      case 'metodiStrumenti.didatticaDigitaleIntegrata':
        next.metodiStrumenti.didatticaDigitaleIntegrata = appendText(
          next.metodiStrumenti.didatticaDigitaleIntegrata,
          text
        );
        break;
      case 'verificheValutazione.altriTipiProve':
        next.verificheValutazione.altriTipiProve = appendText(
          next.verificheValutazione.altriTipiProve,
          text
        );
        break;
      case 'verificheValutazione.criteriValutazione':
        next.verificheValutazione.criteriValutazione = appendText(
          next.verificheValutazione.criteriValutazione,
          text
        );
        break;
      case 'notePersonaliDocente':
        next.notePersonaliDocente = appendText(next.notePersonaliDocente ?? '', text);
        break;
    }
  }
  return next;
}

export async function importProgrammazioneFromFile(
  file: File,
  settings: SchoolSettings,
  existingPlan?: Programmazione
): Promise<DocumentImportResult> {
  const buffer = await file.arrayBuffer();
  return importProgrammazioneFromBuffer(buffer, file.name, settings, existingPlan);
}
