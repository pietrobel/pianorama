import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import type {
  AnonymousStudentBandEntry,
  DocumentLayoutStyle,
  LivelliPartenza,
} from '../domain/types';
import { sortAndCleanStudentNamesForBands } from '../engine/classCharacteristicsEngine';

export interface LivelliTableExportInput {
  livelli: LivelliPartenza;
  entries?: AnonymousStudentBandEntry[];
  layoutDocumento?: DocumentLayoutStyle;
  classeLabel?: string;
}

type FourBandKey = 'basso' | 'medio_basso' | 'medio' | 'alto';

interface BandColumnSpec {
  key: FourBandKey;
  title: string;
  subtitle: string;
  modernHeader: string;
  count: number;
  names: string[];
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Estrae esclusivamente i conteggi e i nominativi (se presenti) nelle 4 fasce ufficiali.
 * Medie voti, categorie BES/DSA/PEI e note sensibili vengono sempre esclusi.
 */
export function buildLivelliTableColumns(
  livelli: LivelliPartenza,
  entries?: AnonymousStudentBandEntry[]
): {
  columns: BandColumnSpec[];
  hasAnyNames: boolean;
  totalNamedExported: number;
} {
  const bands = sortAndCleanStudentNamesForBands(entries ?? []);
  const totalNamedExported =
    bands.basso.length +
    bands.medio_basso.length +
    bands.medio.length +
    bands.alto.length;
  const hasAnyNames = totalNamedExported > 0;

  const columns: BandColumnSpec[] = [
    {
      key: 'basso',
      title: 'Livello basso',
      subtitle: '(voti inferiori alla sufficienza)',
      modernHeader: 'Livello basso (voti < 6)',
      count: livelli.bassoAlunni,
      names: bands.basso,
    },
    {
      key: 'medio_basso',
      title: 'Livello medio/basso',
      subtitle: '(voto 6)',
      modernHeader: 'Livello medio/basso (voto 6)',
      count: livelli.medioBassoAlunni,
      names: bands.medio_basso,
    },
    {
      key: 'medio',
      title: 'Livello medio',
      subtitle: '(voti 7/8)',
      modernHeader: 'Livello medio (voti 7/8)',
      count: livelli.medioAlunni,
      names: bands.medio,
    },
    {
      key: 'alto',
      title: 'Livello alto',
      subtitle: '(voti 9/ 10)',
      modernHeader: 'Livello alto (voti 9/10)',
      count: livelli.altoAlunni,
      names: bands.alto,
    },
  ];

  return { columns, hasAnyNames, totalNamedExported };
}

export function buildLivelliTableClipboardContent(
  input: LivelliTableExportInput
): { html: string; plainText: string } {
  const { columns, hasAnyNames } = buildLivelliTableColumns(input.livelli, input.entries);
  const isOriginal = (input.layoutDocumento ?? 'originale') === 'originale';
  const cleanLabel = (input.classeLabel ?? '').trim();

  const headingHtml = cleanLabel
    ? `<p style="font-family:Arial,sans-serif;font-size:10pt;font-weight:bold;margin:0 0 6pt 0;">Livelli di partenza rilevati — ${escapeHtml(cleanLabel)}</p>`
    : '';

  const namesRowHtml = columns
    .map((col) => {
      const content =
        hasAnyNames && col.names.length > 0
          ? col.names.map((n) => escapeHtml(n)).join('<br />')
          : '&nbsp;';
      return `<td style="border:1px solid #000000;padding:6px 8px;vertical-align:top;width:25%;font-family:Arial,sans-serif;font-size:9pt;color:#000000;">${content}</td>`;
    })
    .join('');

  let html: string;
  if (isOriginal) {
    const headerRowHtml = columns
      .map(
        (col) =>
          `<td style="border:1px solid #000000;padding:6px 8px;vertical-align:top;width:25%;font-family:Arial,sans-serif;font-size:10pt;color:#000000;">` +
          `<div style="font-weight:bold;">${escapeHtml(col.title)}</div>` +
          `<div style="font-size:9pt;">${escapeHtml(col.subtitle)}</div>` +
          `<div style="font-weight:bold;margin-top:6px;">Alunni: ${col.count}</div>` +
          `</td>`
      )
      .join('');

    html =
      `${headingHtml}` +
      `<table style="border-collapse:collapse;width:100%;table-layout:fixed;font-family:Arial,sans-serif;font-size:10pt;color:#000000;">` +
      `<colgroup><col style="width:25%;" /><col style="width:25%;" /><col style="width:25%;" /><col style="width:25%;" /></colgroup>` +
      `<tbody><tr>${headerRowHtml}</tr><tr>${namesRowHtml}</tr></tbody>` +
      `</table>`;
  } else {
    const modernHeaders = columns
      .map(
        (col) =>
          `<th style="border:1px solid #B8C4D4;background-color:#1F3864;color:#FFFFFF;padding:6px 8px;width:25%;text-align:center;font-family:Garamond,Georgia,serif;font-size:10pt;font-weight:bold;">${escapeHtml(col.modernHeader)}</th>`
      )
      .join('');
    const countsRow = columns
      .map(
        (col) =>
          `<td style="border:1px solid #B8C4D4;padding:6px 8px;width:25%;text-align:center;font-family:Garamond,Georgia,serif;font-size:10pt;">Alunni: ${col.count}</td>`
      )
      .join('');
    const modernNamesRow = columns
      .map((col) => {
        const content =
          hasAnyNames && col.names.length > 0
            ? col.names.map((n) => escapeHtml(n)).join('<br />')
            : '&nbsp;';
        return `<td style="border:1px solid #B8C4D4;padding:6px 8px;vertical-align:top;width:25%;font-family:Garamond,Georgia,serif;font-size:9.5pt;">${content}</td>`;
      })
      .join('');

    html =
      `${headingHtml}` +
      `<table style="border-collapse:collapse;width:100%;table-layout:fixed;color:#1E293B;">` +
      `<colgroup><col style="width:25%;" /><col style="width:25%;" /><col style="width:25%;" /><col style="width:25%;" /></colgroup>` +
      `<thead><tr>${modernHeaders}</tr></thead>` +
      `<tbody><tr>${countsRow}</tr><tr>${modernNamesRow}</tr></tbody>` +
      `</table>`;
  }

  const maxNames = Math.max(0, ...columns.map((c) => c.names.length));
  const plainLines: string[] = [];
  if (cleanLabel) {
    plainLines.push(`Livelli di partenza rilevati - ${cleanLabel}`);
  }
  plainLines.push(columns.map((c) => `${c.title} ${c.subtitle}`).join('\t'));
  plainLines.push(columns.map((c) => `Alunni: ${c.count}`).join('\t'));
  for (let i = 0; i < maxNames; i++) {
    plainLines.push(columns.map((c) => c.names[i] ?? '').join('\t'));
  }

  return {
    html,
    plainText: plainLines.join('\n'),
  };
}

export async function copyLivelliTableToClipboard(
  input: LivelliTableExportInput
): Promise<'rich' | 'plain'> {
  const { html, plainText } = buildLivelliTableClipboardContent(input);

  // 1. Clipboard API moderna con text/html + text/plain per incollare tabelle formattate in Word / LibreOffice Writer
  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.write === 'function' &&
    typeof ClipboardItem !== 'undefined'
  ) {
    try {
      const htmlBlob = new Blob([html], { type: 'text/html' });
      const textBlob = new Blob([plainText], { type: 'text/plain' });
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': htmlBlob,
          'text/plain': textBlob,
        }),
      ]);
      return 'rich';
    } catch {
      // Prosegue con fallback DOM se l'iframe blocca ClipboardItem
    }
  }

  // 2. Fallback DOM rich-HTML copy compatibile con iframe e Word/Writer
  if (typeof document !== 'undefined' && typeof window !== 'undefined') {
    const container = document.createElement('div');
    container.setAttribute('contenteditable', 'true');
    container.setAttribute('aria-hidden', 'true');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.opacity = '0';
    container.style.pointerEvents = 'none';
    container.innerHTML = html;
    document.body.appendChild(container);

    const selection = window.getSelection();
    const range = document.createRange();
    try {
      range.selectNodeContents(container);
      selection?.removeAllRanges();
      selection?.addRange(range);
      const ok = document.execCommand('copy');
      selection?.removeAllRanges();
      container.remove();
      if (ok) {
        return 'rich';
      }
    } catch {
      selection?.removeAllRanges();
      container.remove();
    }
  }

  // 3. Fallback solo testo tabulato
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(plainText);
    return 'plain';
  }

  throw new Error('Impossibile accedere agli appunti in questo browser.');
}

export function createLivelliTableOnlyDocument(
  input: LivelliTableExportInput
): Document {
  const { columns, hasAnyNames } = buildLivelliTableColumns(input.livelli, input.entries);
  const isOriginal = (input.layoutDocumento ?? 'originale') === 'originale';
  const font = isOriginal ? 'Arial' : 'Garamond';
  const accentHex = isOriginal ? '000000' : '1F3864';
  const borderColor = isOriginal ? '000000' : 'B8C4D4';
  const borders = {
    top: { style: BorderStyle.SINGLE, size: 6, color: borderColor },
    bottom: { style: BorderStyle.SINGLE, size: 6, color: borderColor },
    left: { style: BorderStyle.SINGLE, size: 6, color: borderColor },
    right: { style: BorderStyle.SINGLE, size: 6, color: borderColor },
  };

  const pText = (
    text: string,
    opts?: {
      bold?: boolean;
      size?: number;
      color?: string;
      align?: (typeof AlignmentType)[keyof typeof AlignmentType];
      spaceBefore?: number;
      spaceAfter?: number;
    }
  ) =>
    new Paragraph({
      alignment: opts?.align ?? AlignmentType.LEFT,
      spacing: {
        before: opts?.spaceBefore ?? 20,
        after: opts?.spaceAfter ?? 30,
      },
      children: [
        new TextRun({
          text,
          font,
          size: opts?.size ?? 20,
          bold: opts?.bold,
          color: opts?.color ?? (isOriginal ? '000000' : '1E293B'),
        }),
      ],
    });

  const makeCell = (children: Paragraph[], header = false) =>
    new TableCell({
      width: { size: 25, type: WidthType.PERCENTAGE },
      borders: header && !isOriginal
        ? {
            top: { style: BorderStyle.SINGLE, size: 6, color: accentHex },
            bottom: { style: BorderStyle.SINGLE, size: 6, color: accentHex },
            left: { style: BorderStyle.SINGLE, size: 6, color: accentHex },
            right: { style: BorderStyle.SINGLE, size: 6, color: accentHex },
          }
        : borders,
      verticalAlign: VerticalAlign.TOP,
      margins: { top: 80, bottom: 80, left: 100, right: 100 },
      shading:
        header && !isOriginal
          ? { type: ShadingType.CLEAR, fill: accentHex, color: 'auto' }
          : undefined,
      children,
    });

  const buildNamesParagraphs = (names: string[]) => {
    if (!hasAnyNames) {
      return [pText(' ', { spaceAfter: 240 })];
    }
    if (names.length === 0) {
      return [pText(' ', { spaceAfter: 40 })];
    }
    return names.map((name) =>
      pText(name, { size: 18, spaceBefore: 10, spaceAfter: 15 })
    );
  };

  const table = isOriginal
    ? new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            cantSplit: true,
            children: columns.map((col) =>
              makeCell([
                pText(col.title, { bold: true, spaceBefore: 10, spaceAfter: 10 }),
                pText(col.subtitle, { size: 18, spaceBefore: 0, spaceAfter: 40 }),
                pText(`Alunni: ${col.count}`, {
                  bold: true,
                  spaceBefore: 20,
                  spaceAfter: 40,
                }),
              ])
            ),
          }),
          new TableRow({
            children: columns.map((col) => makeCell(buildNamesParagraphs(col.names))),
          }),
        ],
      })
    : new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            cantSplit: true,
            tableHeader: true,
            children: columns.map((col) =>
              makeCell(
                [
                  pText(col.modernHeader, {
                    bold: true,
                    color: 'FFFFFF',
                    align: AlignmentType.CENTER,
                  }),
                ],
                true
              )
            ),
          }),
          new TableRow({
            cantSplit: true,
            children: columns.map((col) =>
              makeCell([
                pText(`Alunni: ${col.count}`, { align: AlignmentType.CENTER }),
              ])
            ),
          }),
          new TableRow({
            children: columns.map((col) => makeCell(buildNamesParagraphs(col.names))),
          }),
        ],
      });

  const cleanLabel = (input.classeLabel ?? '').trim();
  const titleText = cleanLabel
    ? `Livelli di partenza rilevati — ${cleanLabel}`
    : 'Livelli di partenza rilevati';

  return new Document({
    creator: 'PIANORAMA',
    title: titleText,
    description: 'Tabella fasce di livello generata offline con PIANORAMA',
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 850, bottom: 900, left: 900, right: 900 },
          },
        },
        children: [
          pText(titleText, {
            bold: true,
            size: 22,
            color: accentHex,
            spaceBefore: 0,
            spaceAfter: 120,
          }),
          table,
        ],
      },
    ],
  });
}

export async function generateLivelliTableDocxBytes(
  input: LivelliTableExportInput
): Promise<Uint8Array> {
  const doc = createLivelliTableOnlyDocument(input);
  const arrayBuffer = await Packer.toArrayBuffer(doc);
  return new Uint8Array(arrayBuffer);
}

export function buildLivelliTableDocxFilename(classeLabel?: string): string {
  const clean = (classeLabel ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9àèéìòùÀÈÉÌÒÙ_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return clean ? `Livelli_partenza_${clean}.docx` : 'Livelli_partenza.docx';
}

export async function downloadLivelliTableDocx(
  input: LivelliTableExportInput
): Promise<string> {
  const bytes = await generateLivelliTableDocxBytes(input);
  const blob = new Blob([bytes.buffer as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  const url = URL.createObjectURL(blob);
  const filename = buildLivelliTableDocxFilename(input.classeLabel);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return filename;
}
