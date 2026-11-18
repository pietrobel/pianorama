import { jsPDF } from 'jspdf';
import {
  FONTI_RILEVAZIONE_OPTIONS,
  formatDocenteConTitolo,
  formatFirmaDocente,
  LIVELLI_CLASSE_OPTIONS,
  METODI_OPTIONS,
  MEZZI_INDIVIDUAZIONE_OPTIONS,
  MEZZI_STRUMENTI_OPTIONS,
  STRATEGIE_CONSOLIDAMENTO_OPTIONS,
  STRATEGIE_POTENZIAMENTO_OPTIONS,
  STRATEGIE_RECUPERO_OPTIONS,
  TIPOLOGIE_CLASSE_OPTIONS,
  VERIFICHE_ORALI_OPTIONS,
  VERIFICHE_SCRITTE_OPTIONS,
} from '../domain/defaults';
import {
  sanitizePlanForOfficialExport,
  type ClassTipologia,
  type DocxMappingSchema,
  type Programmazione,
  type SchoolSettings,
} from '../domain/types';
import { getActiveDimensionsForDocument } from '../engine/classCharacteristicsEngine';
import {
  CURRICOLO_TYPE_LABELS,
  CURRICOLO_TYPE_ORDER,
} from '../engine/curricoloCatalogEngine';
import { buildClassCompositionIntro } from '../engine/questionnaireEngine';
import { buildDocxFilename } from './docxGenerator';
import {
  getSchoolBannerDataUrl,
  SCHOOL_BANNER_HEIGHT,
  SCHOOL_BANNER_WIDTH,
} from './schoolBannerAsset';

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) || 31;
  const g = parseInt(clean.slice(2, 4), 16) || 56;
  const b = parseInt(clean.slice(4, 6), 16) || 100;
  return [r, g, b];
}

function pdfSafeText(text: string): string {
  return text
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/•/g, '-')
    .replace(/…/g, '...')
    .replace(/[☒☑]/g, '[X]')
    .replace(/☐/g, '[ ]');
}

export function generateProgrammazionePdfBytes(
  rawPlan: Programmazione,
  settings: SchoolSettings,
  mapping: DocxMappingSchema
): Uint8Array {
  const plan = sanitizePlanForOfficialExport(rawPlan);

  const layoutStyle =
    plan.datiGenerali.layoutDocumento ?? settings.defaultLayoutDocumento ?? 'originale';
  const isOriginal = layoutStyle === 'originale';
  const docenteGenere =
    plan.datiGenerali.docenteGenere ?? settings.defaultDocenteGenere ?? 'F';
  const hasDocenteName = Boolean(plan.datiGenerali.docente.trim());
  const docenteConTitolo = hasDocenteName
    ? formatDocenteConTitolo(plan.datiGenerali.docente, docenteGenere)
    : '___________________________';
  const firmaRaw = (plan.verificheValutazione.firmaDocente || plan.datiGenerali.docente).trim();
  const firmaDocente = firmaRaw
    ? formatFirmaDocente(firmaRaw, docenteGenere)
    : isOriginal
    ? 'Il/La Docente'
    : formatFirmaDocente('', docenteGenere);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const fontFamily = isOriginal ? 'helvetica' : 'times';
  const [accR, accG, accB] = isOriginal
    ? [0, 0, 0]
    : hexToRgb(mapping.typography.headingColorHex || '1F3864');
  const pageWidth = 210;
  const marginX = isOriginal ? 15.9 : 16;
  const marginRight = isOriginal ? 20 : 16;
  const contentWidth = pageWidth - marginX - marginRight;
  const bottomLimit = 278;
  let y = isOriginal ? 14 : 16;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > bottomLimit) {
      doc.addPage();
      y = isOriginal ? 15 : 16;
    }
  };

  const drawHighlightBadge = (
    text: string,
    opts?: { bold?: boolean; underlined?: boolean; center?: boolean; size?: number }
  ) => {
    ensureSpace(10);
    y += 2;
    const size = opts?.size ?? 10;
    doc.setFont(fontFamily, opts?.bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    const safe = pdfSafeText(text);
    const lines = doc.splitTextToSize(safe, contentWidth - 2);
    const lh = size * 0.43;

    if (opts?.center) {
      for (const line of lines) {
        const tw = doc.getTextWidth(line) + 3;
        const rx = marginX + (contentWidth - tw) / 2;
        doc.setFillColor(230, 230, 230);
        doc.rect(rx, y - 3.3, tw, lh + 0.5, 'F');
        doc.setTextColor(0, 0, 0);
        doc.text(line, marginX + contentWidth / 2, y, { align: 'center' });
        if (opts?.underlined) {
          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(0.28);
          doc.line(rx + 1.5, y + 0.8, rx + tw - 1.5, y + 0.8);
        }
        y += lh;
      }
    } else {
      for (const line of lines) {
        const tw = doc.getTextWidth(line) + 2;
        doc.setFillColor(230, 230, 230);
        doc.rect(marginX, y - 3.3, tw, lh + 0.4, 'F');
        doc.setTextColor(0, 0, 0);
        doc.text(line, marginX + 0.6, y);
        y += lh;
      }
      if (opts?.underlined) {
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.35);
        doc.line(marginX, y - 2.3, marginX + contentWidth, y - 2.3);
      }
    }
    y += 2;
  };

  const drawSectionHeading = (
    title: string,
    opts?: { boxed?: boolean; underlined?: boolean; highlightE6?: boolean; center?: boolean }
  ) => {
    if (isOriginal && opts?.highlightE6) {
      drawHighlightBadge(title, {
        bold: true,
        underlined: opts?.underlined,
        center: opts?.center,
        size: 10,
      });
      return;
    }

    ensureSpace(12);
    y += 2.5;
    doc.setFont(fontFamily, opts?.boxed && isOriginal ? 'normal' : 'bold');
    doc.setFontSize(isOriginal ? 10 : 11);
    doc.setTextColor(accR, accG, accB);
    const lines = doc.splitTextToSize(pdfSafeText(title), contentWidth - 4);
    const textH = lines.length * 4.5 + 2;

    if (opts?.boxed) {
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.rect(marginX, y - 3.8, contentWidth, textH + 1.5);
      doc.text(lines, marginX + contentWidth / 2, y, { align: 'center' });
      y += textH - 1.5;
      return;
    }

    if (isOriginal) {
      const align = opts?.center ? 'center' : 'left';
      const x = align === 'center' ? marginX + contentWidth / 2 : marginX;
      doc.text(lines, x, y, { align });
      if (opts?.underlined) {
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.3);
        doc.line(marginX, y + 1.1, marginX + contentWidth, y + 1.1);
      }
      y += lines.length * 4.5 + 1.5;
    } else {
      doc.text(lines, marginX, y);
      y += lines.length * 4.8 + 1;
      doc.setDrawColor(accR, accG, accB);
      doc.setLineWidth(0.45);
      doc.line(marginX, y, pageWidth - marginRight, y);
      y += 4;
    }
  };

  const drawParagraph = (
    text: string,
    opts?: {
      bold?: boolean;
      italic?: boolean;
      size?: number;
      color?: [number, number, number];
      align?: 'left' | 'center' | 'right' | 'justify';
      lineFactor?: number;
      spaceAfter?: number;
    }
  ) => {
    const size = opts?.size ?? (isOriginal ? 10 : 10.5);
    const style = opts?.bold ? 'bold' : opts?.italic ? 'italic' : 'normal';
    doc.setFont(fontFamily, style);
    doc.setFontSize(size);
    const [r, g, b] = opts?.color ?? (isOriginal ? [0, 0, 0] : [30, 41, 59]);
    doc.setTextColor(r, g, b);

    const safe = pdfSafeText(text);
    const lines = doc.splitTextToSize(safe, contentWidth);
    const lineHeight = size * (opts?.lineFactor ?? 0.43);

    let idx = 0;
    while (idx < lines.length) {
      const available = bottomLimit - y;
      const canFit = Math.max(1, Math.floor(available / lineHeight));
      const slice = lines.slice(idx, idx + canFit);
      if (available < lineHeight + 1) {
        doc.addPage();
        y = isOriginal ? 15 : 16;
        continue;
      }
      const x =
        opts?.align === 'center'
          ? marginX + contentWidth / 2
          : opts?.align === 'right'
          ? marginX + contentWidth
          : marginX;
      const jAlign = opts?.align === 'justify' ? 'left' : opts?.align ?? 'left';
      doc.text(slice, x, y, { align: jAlign });
      y += slice.length * lineHeight;
      idx += slice.length;
      if (idx < lines.length) {
        doc.addPage();
        y = isOriginal ? 15 : 16;
      }
    }
    y += opts?.spaceAfter ?? 1.8;
  };

  const drawBlankRules = (count: number, spaceAfter = 2.5) => {
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.25);
    for (let i = 0; i < count; i++) {
      ensureSpace(5);
      doc.line(marginX, y + 1.5, marginX + contentWidth, y + 1.5);
      y += 4.5;
    }
    y += spaceAfter;
  };

  const drawCheckboxAt = (
    checked: boolean,
    label: string,
    x: number,
    currY: number,
    maxWidth: number
  ): number => {
    doc.setFont(fontFamily, checked && !isOriginal ? 'bold' : 'normal');
    doc.setFontSize(isOriginal ? 9.5 : 10);
    const lines = doc.splitTextToSize(pdfSafeText(label), maxWidth - 5.5);
    const blockH = lines.length * 4.0 + 1.2;

    const boxY = currY - 2.7;
    doc.setDrawColor(accR, accG, accB);
    doc.setLineWidth(0.3);
    doc.rect(x, boxY, 3.0, 3.0);
    if (checked) {
      if (isOriginal) {
        doc.setLineWidth(0.35);
        doc.line(x + 0.4, boxY + 0.4, x + 2.6, boxY + 2.6);
        doc.line(x + 2.6, boxY + 0.4, x + 0.4, boxY + 2.6);
      } else {
        doc.setFillColor(accR, accG, accB);
        doc.rect(x, boxY, 3.0, 3.0, 'F');
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.35);
        doc.line(x + 0.5, boxY + 0.5, x + 2.5, boxY + 2.5);
        doc.line(x + 2.5, boxY + 0.5, x + 0.5, boxY + 2.5);
      }
      doc.setTextColor(accR, accG, accB);
    } else {
      doc.setTextColor(isOriginal ? 0 : 30, isOriginal ? 0 : 41, isOriginal ? 0 : 59);
    }
    doc.text(lines, x + 4.4, currY);
    return blockH;
  };

  const drawCheckboxItem = (
    checked: boolean,
    label: string,
    xOffset = marginX,
    maxWidth = contentWidth
  ) => {
    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(isOriginal ? 9.5 : 10);
    const lines = doc.splitTextToSize(pdfSafeText(label), maxWidth - 5.5);
    const blockH = lines.length * 4.0 + 1.2;
    ensureSpace(blockH);
    y += drawCheckboxAt(checked, label, xOffset, y, maxWidth);
  };

  const drawThreeColRow = (
    c1: string,
    c2: string,
    c3: string,
    opts?: { isHeader?: boolean; repeatHeaderOnBreak?: boolean }
  ) => {
    const widths = isOriginal
      ? [contentWidth * 0.3, contentWidth * 0.36, contentWidth * 0.34]
      : [contentWidth / 3, contentWidth / 3, contentWidth / 3];
    const pad = 2;
    doc.setFont(fontFamily, opts?.isHeader ? 'bold' : 'normal');
    doc.setFontSize(opts?.isHeader ? 9.5 : 9);

    const raw1 = opts?.isHeader ? c1 : c1 || '-';
    const raw2 = opts?.isHeader ? c2 : c2 || '-';
    const raw3 = opts?.isHeader ? c3 : c3 || '-';

    const l1 = doc.splitTextToSize(pdfSafeText(raw1), widths[0] - pad * 2);
    const l2 = doc.splitTextToSize(pdfSafeText(raw2), widths[1] - pad * 2);
    const l3 = doc.splitTextToSize(pdfSafeText(raw3), widths[2] - pad * 2);

    const lineH = 3.85;
    let startLine = 0;
    const totalLines = Math.max(l1.length, l2.length, l3.length, 1);

    while (startLine < totalLines) {
      const remainingLines = totalLines - startLine;
      const neededFull = remainingLines * lineH + 3.5;

      if (y + Math.min(neededFull, 14) > bottomLimit) {
        doc.addPage();
        y = isOriginal ? 15 : 16;
        if (opts?.repeatHeaderOnBreak) {
          drawThreeColRow('COMPETENZE', 'ABILITA / OBIETTIVI', 'CONOSCENZE', {
            isHeader: true,
          });
        }
      }

      const maxFitLines = Math.max(1, Math.floor((bottomLimit - y - 3.5) / lineH));
      const sliceCount = Math.min(remainingLines, maxFitLines);
      const rowH = sliceCount * lineH + 3.5;

      const s1 = l1.slice(startLine, startLine + sliceCount);
      const s2 = l2.slice(startLine, startLine + sliceCount);
      const s3 = l3.slice(startLine, startLine + sliceCount);

      const borderColor: [number, number, number] = isOriginal ? [0, 0, 0] : [180, 195, 210];
      if (opts?.isHeader) {
        if (isOriginal) {
          doc.setFillColor(230, 230, 230);
          doc.rect(marginX, y, contentWidth, rowH, 'F');
          doc.setTextColor(0, 0, 0);
        } else {
          doc.setFillColor(accR, accG, accB);
          doc.rect(marginX, y, contentWidth, rowH, 'F');
          doc.setTextColor(255, 255, 255);
        }
      } else {
        doc.setTextColor(0, 0, 0);
      }

      doc.setFont(fontFamily, opts?.isHeader ? 'bold' : 'normal');
      doc.setFontSize(opts?.isHeader ? 9.5 : 9);
      doc.setDrawColor(...borderColor);
      doc.setLineWidth(0.3);
      doc.rect(marginX, y, widths[0], rowH);
      doc.rect(marginX + widths[0], y, widths[1], rowH);
      doc.rect(marginX + widths[0] + widths[1], y, widths[2], rowH);

      if (opts?.isHeader && isOriginal) {
        doc.text(s1, marginX + widths[0] / 2, y + 4.2, { align: 'center' });
        doc.text(s2, marginX + widths[0] + widths[1] / 2, y + 4.2, { align: 'center' });
        doc.text(s3, marginX + widths[0] + widths[1] + widths[2] / 2, y + 4.2, {
          align: 'center',
        });
      } else {
        if (s1.length) doc.text(s1, marginX + pad, y + 4.2);
        if (s2.length) doc.text(s2, marginX + widths[0] + pad, y + 4.2);
        if (s3.length) doc.text(s3, marginX + widths[0] + widths[1] + pad, y + 4.2);
      }

      y += rowH;
      startLine += sliceCount;
    }
  };

  // =========================================================================
  // INTESTAZIONE ISTITUZIONALE
  // =========================================================================
  if (isOriginal) {
    const bannerW = Math.min(contentWidth - 8, 162);
    const bannerH = (bannerW * SCHOOL_BANNER_HEIGHT) / SCHOOL_BANNER_WIDTH;
    const bannerX = marginX + (contentWidth - bannerW) / 2;
    doc.addImage(getSchoolBannerDataUrl(), 'PNG', bannerX, y, bannerW, bannerH);
    y += bannerH + 3.5;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.45);
    doc.line(marginX, y, marginX + contentWidth, y);
    doc.line(marginX, y + 1.0, marginX + contentWidth, y + 1.0);
    y += 11;
  } else {
    drawParagraph(settings.ministryHeader.toUpperCase(), {
      bold: true,
      size: 9.5,
      color: [accR, accG, accB],
      align: 'center',
    });
    drawParagraph(settings.schoolName, {
      bold: true,
      size: 12.5,
      color: [accR, accG, accB],
      align: 'center',
    });
    drawParagraph(settings.schoolAddressLine, {
      size: 8.5,
      color: [71, 85, 105],
      align: 'center',
    });
    drawParagraph(settings.schoolContactsLine, {
      size: 8.5,
      color: [71, 85, 105],
      align: 'center',
    });
    y += 3;
  }

  // =========================================================================
  // TITOLO E DATI GENERALI
  // =========================================================================
  if (isOriginal) {
    const drawCenteredUnderlineField = (prefix: string, val: string, boldVal = false) => {
      ensureSpace(7);
      doc.setFontSize(11.5);
      doc.setTextColor(0, 0, 0);
      doc.setFont(fontFamily, 'normal');
      const pSafe = pdfSafeText(prefix);
      const vSafe = pdfSafeText(val);
      const pw = doc.getTextWidth(pSafe);
      doc.setFont(fontFamily, boldVal ? 'bold' : 'normal');
      const vw = doc.getTextWidth(vSafe);
      const startX = marginX + (contentWidth - (pw + vw)) / 2;
      doc.setFont(fontFamily, 'normal');
      doc.text(pSafe, startX, y);
      doc.setFont(fontFamily, boldVal ? 'bold' : 'normal');
      doc.text(vSafe, startX + pw, y);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.28);
      doc.line(startX + pw, y + 0.9, startX + pw + vw, y + 0.9);
      y += 6.2;
    };

    const discTitle =
      plan.datiGenerali.titoloDisciplina ||
      plan.datiGenerali.disciplina ||
      '___________________';
    drawCenteredUnderlineField(
      'PROGRAMMAZIONE DISCIPLINARE di ',
      discTitle,
      Boolean(plan.datiGenerali.titoloDisciplina || plan.datiGenerali.disciplina)
    );
    drawCenteredUnderlineField(
      'SCUOLA ',
      plan.datiGenerali.scuola || '_____________________________________________'
    );
    drawCenteredUnderlineField(
      'PLESSO DI ',
      plan.datiGenerali.plesso || '_____________________________________________'
    );
    y += 2;

    const metaRows: [string, string][] = [
      ['ANNO SCOLASTICO', plan.datiGenerali.annoScolastico || '________'],
      [
        'CLASSE',
        plan.datiGenerali.classe
          ? `${plan.datiGenerali.classe} ${plan.datiGenerali.sezione}`.trim()
          : '________',
      ],
      ['DISCIPLINA', plan.datiGenerali.disciplina || '___________________________'],
      ['DOCENTE', docenteConTitolo],
    ];
    for (const [label, value] of metaRows) {
      ensureSpace(5);
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.setFont(fontFamily, 'normal');
      doc.text(label, marginX, y);
      doc.setFont(fontFamily, value.startsWith('___') ? 'normal' : 'bold');
      doc.text(pdfSafeText(value), marginX + 52, y);
      y += 4.8;
    }
    y += 2;
  } else {
    drawParagraph(
      `PROGRAMMAZIONE DISCIPLINARE di ${
        plan.datiGenerali.titoloDisciplina || plan.datiGenerali.disciplina
      }`,
      {
        bold: true,
        size: 14,
        color: [accR, accG, accB],
        align: 'center',
      }
    );
    y += 1;
    ensureSpace(18);
    doc.setDrawColor(accR, accG, accB);
    doc.setLineWidth(0.3);
    doc.rect(marginX, y, contentWidth, 16);
    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(pdfSafeText(`SCUOLA: ${plan.datiGenerali.scuola}`), marginX + 3, y + 5);
    doc.text(pdfSafeText(`PLESSO DI: ${plan.datiGenerali.plesso}`), marginX + 95, y + 5);
    doc.text(pdfSafeText(`A.S.: ${plan.datiGenerali.annoScolastico}`), marginX + 3, y + 10);
    doc.text(
      pdfSafeText(`CLASSE: ${plan.datiGenerali.classe} ${plan.datiGenerali.sezione}`),
      marginX + 55,
      y + 10
    );
    doc.text(pdfSafeText(`DISCIPLINA: ${plan.datiGenerali.disciplina}`), marginX + 105, y + 10);
    doc.text(pdfSafeText(`DOCENTE: ${docenteConTitolo}`), marginX + 3, y + 14.5);
    y += 20;
  }

  // =========================================================================
  // COMPOSIZIONE DELLA CLASSE
  // =========================================================================
  drawSectionHeading('COMPOSIZIONE DELLA CLASSE', { highlightE6: isOriginal });
  if (isOriginal) {
    ensureSpace(12);
    const wArr = [
      contentWidth * 0.16,
      contentWidth * 0.16,
      contentWidth * 0.16,
      contentWidth * 0.17,
      contentWidth * 0.35,
    ];
    const labels = [
      `Alunni: ${plan.composizione.alunni}`,
      `Maschi: ${plan.composizione.maschi}`,
      `Femmine: ${plan.composizione.femmine}`,
      `Ripetenti: ${plan.composizione.ripetenti}`,
      `Con Bisogni Educativi Speciali (BES): ${plan.composizione.bes}`,
    ];
    const boxH = 9.5;
    let cx = marginX;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(0, 0, 0);
    for (let i = 0; i < wArr.length; i++) {
      doc.rect(cx, y, wArr[i], boxH);
      const wrapped = doc.splitTextToSize(labels[i], wArr[i] - 3);
      doc.text(wrapped, cx + 1.5, y + 4.3);
      cx += wArr[i];
    }
    y += boxH + 3.5;
  } else {
    ensureSpace(14);
    const compCols = [
      { label: 'Alunni', val: String(plan.composizione.alunni), w: 30 },
      { label: 'Maschi', val: String(plan.composizione.maschi), w: 30 },
      { label: 'Femmine', val: String(plan.composizione.femmine), w: 30 },
      { label: 'Ripetenti', val: String(plan.composizione.ripetenti), w: 30 },
      { label: 'Con BES', val: String(plan.composizione.bes), w: contentWidth - 120 },
    ];
    let cx = marginX;
    for (const col of compCols) {
      doc.setFillColor(accR, accG, accB);
      doc.rect(cx, y, col.w, 6, 'F');
      doc.setFont(fontFamily, 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(255, 255, 255);
      doc.text(col.label, cx + col.w / 2, y + 4.2, { align: 'center' });

      doc.setDrawColor(180, 195, 210);
      doc.rect(cx, y + 6, col.w, 6.5);
      doc.setFont(fontFamily, 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(col.val, cx + col.w / 2, y + 10.5, { align: 'center' });
      cx += col.w;
    }
    y += 16;
  }

  // =========================================================================
  // SITUAZIONE DELLA CLASSE
  // =========================================================================
  drawSectionHeading('SITUAZIONE DELLA CLASSE', { highlightE6: isOriginal });
  if (isOriginal) {
    ensureSpace(64);
    const col1W = contentWidth * 0.3;
    const col2W = contentWidth * 0.28;
    const col3W = contentWidth - col1W - col2W;
    const leftGroupW = col1W + col2W;

    // Row 1: header #F3F3F3
    const r1H = 6.5;
    doc.setFillColor(243, 243, 243);
    doc.rect(marginX, y, leftGroupW, r1H, 'FD');
    doc.rect(marginX + leftGroupW, y, col3W, r1H, 'FD');
    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(0, 0, 0);
    doc.text('TIPOLOGIA', marginX + leftGroupW / 2, y + 4.5, { align: 'center' });
    doc.text('LIVELLO', marginX + leftGroupW + col3W / 2, y + 4.5, { align: 'center' });
    y += r1H;

    // Row 2: 2-col [X]/[  ] Tipologie + vertical checkboxes Livello
    const pairs: [ClassTipologia, ClassTipologia | null][] = [
      ['tranquilla', 'motivata'],
      ['vivace', 'poco motivata'],
      ['collaborativa', 'problematica'],
      ['poco collaborativa', null],
    ];
    const r2H = Math.max(pairs.length * 5.2 + 3, LIVELLI_CLASSE_OPTIONS.length * 5.2 + 3);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.rect(marginX, y, leftGroupW, r2H);
    doc.rect(marginX + leftGroupW, y, col3W, r2H);

    let ty = y + 4.8;
    for (const [lOpt, rOpt] of pairs) {
      const lChk = plan.situazione.tipologie.includes(lOpt);
      doc.setFont(fontFamily, lChk ? 'bold' : 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(0, 0, 0);
      doc.text(lOpt, marginX + 2, ty);
      doc.text(lChk ? '[X]' : '[  ]', marginX + 35, ty);
      if (rOpt) {
        const rChk = plan.situazione.tipologie.includes(rOpt);
        doc.setFont(fontFamily, rChk ? 'bold' : 'normal');
        doc.text(rOpt, marginX + 46, ty);
        doc.text(rChk ? '[X]' : '[  ]', marginX + leftGroupW - 9, ty);
      }
      ty += 5.2;
    }

    let ly = y + 4.8;
    for (const opt of LIVELLI_CLASSE_OPTIONS) {
      ly += drawCheckboxAt(
        plan.situazione.livello === opt.value,
        opt.label,
        marginX + leftGroupW + 2.5,
        ly,
        col3W - 4
      );
    }
    y += r2H;

    // Row 3: Left #E6E6E6 label + Right mezzi checkboxes
    const mezziH = MEZZI_INDIVIDUAZIONE_OPTIONS.length * 5.8 + 4;
    doc.setFillColor(230, 230, 230);
    doc.rect(marginX, y, col1W, mezziH, 'FD');
    doc.rect(marginX + col1W, y, col2W + col3W, mezziH);

    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(9.2);
    doc.setTextColor(0, 0, 0);
    const mezziLabelLines = doc.splitTextToSize(
      'MEZZI UTILIZZATI PER INDIVIDUARE LE RISORSE ED I BISOGNI DEGLI ALUNNI:',
      col1W - 4
    );
    const labelStartY = y + (mezziH - mezziLabelLines.length * 4.0) / 2 + 3;
    doc.text(mezziLabelLines, marginX + col1W / 2, labelStartY, { align: 'center' });

    let my = y + 4.8;
    for (const opt of MEZZI_INDIVIDUAZIONE_OPTIONS) {
      my += drawCheckboxAt(
        plan.situazione.mezziIndividuazione.includes(opt),
        opt,
        marginX + col1W + 2.5,
        my,
        col2W + col3W - 5
      );
    }
    y += Math.max(mezziH, my - y + 1.5) + 3;
  } else {
    drawParagraph('TIPOLOGIA:', { bold: true, size: 10, color: [accR, accG, accB] });
    for (const opt of TIPOLOGIE_CLASSE_OPTIONS) {
      drawCheckboxItem(plan.situazione.tipologie.includes(opt), opt);
    }
    drawParagraph('LIVELLO:', { bold: true, size: 10, color: [accR, accG, accB] });
    for (const opt of LIVELLI_CLASSE_OPTIONS) {
      drawCheckboxItem(plan.situazione.livello === opt.value, opt.label);
    }
    drawParagraph('MEZZI UTILIZZATI PER INDIVIDUARE LE RISORSE ED I BISOGNI DEGLI ALUNNI:', {
      bold: true,
      size: 10,
      color: [accR, accG, accB],
    });
    for (const opt of MEZZI_INDIVIDUAZIONE_OPTIONS) {
      drawCheckboxItem(plan.situazione.mezziIndividuazione.includes(opt), opt);
    }
  }

  const compositionIntro = buildClassCompositionIntro(plan);
  const activeCharacteristics = getActiveDimensionsForDocument(
    plan.situazione.caratteristicheDimensioni,
    settings.soglieQuoteCaratteristiche,
    `${plan.id}|${plan.datiGenerali.classe}|${plan.datiGenerali.sezione}|${plan.datiGenerali.disciplina}`
  );
  if (activeCharacteristics.length > 0 || !isOriginal) {
    drawParagraph('Presentazione e caratteristiche della classe:', {
      bold: true,
      size: 10,
      color: [accR, accG, accB],
    });
    drawParagraph(compositionIntro, { size: 10 });
    for (const item of activeCharacteristics) {
      drawParagraph(`${item.nome}: ${item.testo}`, { size: 10 });
    }
  }

  // =========================================================================
  // ANALISI DELLA SITUAZIONE DI PARTENZA
  // =========================================================================
  drawSectionHeading('ANALISI DELLA SITUAZIONE DI PARTENZA');
  if (isOriginal) {
    drawHighlightBadge('SITUAZIONE DI PARTENZA DEGLI ALUNNI IN RELAZIONE ALLA DISCIPLINA:', {
      bold: false,
      underlined: true,
      size: 9.8,
    });
    if (plan.analisiPartenza.descrizioneDisciplinare.trim()) {
      drawParagraph(`1. ${plan.analisiPartenza.descrizioneDisciplinare.trim()}`, {
        size: 10,
        align: 'justify',
      });
    } else {
      drawBlankRules(5, 2);
    }
    drawParagraph('2. Livelli di partenza rilevati', { bold: true, size: 10, spaceAfter: 2 });

    ensureSpace(32);
    const boxW = (contentWidth * 0.92) / 4;
    const boxH = 26;
    const livelliBoxes = [
      {
        title: 'Livello basso',
        sub: '(voti inferiori alla sufficienza)',
        val: plan.analisiPartenza.livelli.bassoAlunni,
      },
      {
        title: 'Livello medio/basso',
        sub: '(voto 6)',
        val: plan.analisiPartenza.livelli.medioBassoAlunni,
      },
      {
        title: 'Livello medio',
        sub: '(voti 7/8)',
        val: plan.analisiPartenza.livelli.medioAlunni,
      },
      {
        title: 'Livello alto',
        sub: '(voti 9/ 10)',
        val: plan.analisiPartenza.livelli.altoAlunni,
      },
    ];
    let lx = marginX;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    for (const lb of livelliBoxes) {
      doc.rect(lx, y, boxW, boxH);
      doc.setFont(fontFamily, 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(0, 0, 0);
      doc.text(lb.title, lx + 2, y + 4.5);
      doc.setFont(fontFamily, 'normal');
      doc.setFontSize(8.5);
      const subLines = doc.splitTextToSize(lb.sub, boxW - 4);
      doc.text(subLines, lx + 2, y + 8.5);
      doc.setFont(fontFamily, 'bold');
      doc.setFontSize(9.5);
      doc.text(`Alunni: ${lb.val}`, lx + 2, y + 17.5);
      lx += boxW;
    }
    y += boxH + 4;
  } else {
    drawParagraph('SITUAZIONE DI PARTENZA DEGLI ALUNNI IN RELAZIONE ALLA DISCIPLINA:', {
      bold: true,
      size: 10,
      color: [accR, accG, accB],
    });
    drawParagraph(
      plan.analisiPartenza.descrizioneDisciplinare.trim() ||
        `${compositionIntro} Descrizione sintetica non ancora compilata.`
    );
    drawParagraph(
      `Livelli rilevati - Basso: ${plan.analisiPartenza.livelli.bassoAlunni} alunni | Medio/basso: ${plan.analisiPartenza.livelli.medioBassoAlunni} alunni | Medio: ${plan.analisiPartenza.livelli.medioAlunni} alunni | Alto: ${plan.analisiPartenza.livelli.altoAlunni} alunni`,
      { bold: true, size: 10, color: [accR, accG, accB] }
    );
  }

  drawParagraph('FONTI DI RILEVAZIONE DEI DATI', {
    bold: true,
    size: 10,
    color: [accR, accG, accB],
    spaceAfter: 1.5,
  });
  for (const opt of FONTI_RILEVAZIONE_OPTIONS) {
    drawCheckboxItem(plan.analisiPartenza.fontiRilevazione.includes(opt), opt);
  }
  drawCheckboxItem(
    Boolean(plan.analisiPartenza.altraFonte.trim()),
    `altro: ${
      plan.analisiPartenza.altraFonte.trim() || '____________________________________________'
    }`
  );
  y += 2;

  // =========================================================================
  // STRATEGIE ED INTERVENTI
  // =========================================================================
  drawSectionHeading(
    'STRATEGIE ED INTERVENTI PER IL POTENZIAMENTO, IL CONSOLIDAMENTO ED IL RECUPERO',
    { boxed: isOriginal }
  );

  if (isOriginal) {
    const colLW = contentWidth * 0.24;
    const colRW = contentWidth - colLW;

    ensureSpace(12);
    doc.setFillColor(243, 243, 243);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.rect(marginX, y, colLW, 7.5, 'FD');
    doc.rect(marginX + colLW, y, colRW, 7.5, 'FD');
    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(0, 0, 0);
    doc.text('Gruppi di livello', marginX + colLW / 2, y + 5, { align: 'center' });
    doc.text(
      'STRATEGIE DA UTILIZZARE (segnare con la x)',
      marginX + colLW + colRW / 2,
      y + 5,
      { align: 'center' }
    );
    y += 7.5;

    const stratRows: [string, string[], string[], string][] = [
      [
        'POTENZIAMENTO',
        STRATEGIE_POTENZIAMENTO_OPTIONS,
        plan.interventi.potenziamento,
        plan.interventi.potenziamentoAltro,
      ],
      [
        'CONSOLIDAMENTO',
        STRATEGIE_CONSOLIDAMENTO_OPTIONS,
        plan.interventi.consolidamento,
        plan.interventi.consolidamentoAltro,
      ],
      [
        'RECUPERO',
        STRATEGIE_RECUPERO_OPTIONS,
        plan.interventi.recupero,
        plan.interventi.recuperoAltro,
      ],
    ];

    for (const [label, opts, selected, altro] of stratRows) {
      let neededH = 4.5;
      doc.setFont(fontFamily, 'normal');
      doc.setFontSize(9.5);
      for (const opt of opts) {
        const l = doc.splitTextToSize(pdfSafeText(opt), colRW - 8);
        neededH += l.length * 4.0 + 1.2;
      }
      const altroLabel = `Altro: ${altro.trim() || '________________________________________________'}`;
      neededH += doc.splitTextToSize(pdfSafeText(altroLabel), colRW - 8).length * 4.0 + 2.5;

      ensureSpace(neededH);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.rect(marginX, y, colLW, neededH);
      doc.rect(marginX + colLW, y, colRW, neededH);
      doc.setFont(fontFamily, 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(0, 0, 0);
      doc.text(label, marginX + 2.5, y + neededH / 2 + 1);

      let sy = y + 4.8;
      for (const opt of opts) {
        sy += drawCheckboxAt(selected.includes(opt), opt, marginX + colLW + 2.5, sy, colRW - 4);
      }
      drawCheckboxAt(Boolean(altro.trim()), altroLabel, marginX + colLW + 2.5, sy, colRW - 4);
      y += neededH;
    }

    y += 3;
    drawParagraph('Alunni con BES e interventi programmati', { bold: true, size: 10 });
    if (plan.interventi.besInterventiProgrammati.trim()) {
      drawParagraph(plan.interventi.besInterventiProgrammati.trim(), {
        size: 10,
        align: 'justify',
      });
    } else {
      drawBlankRules(4, 2.5);
    }
  } else {
    drawParagraph('POTENZIAMENTO:', { bold: true, size: 10, color: [accR, accG, accB] });
    for (const opt of STRATEGIE_POTENZIAMENTO_OPTIONS) {
      drawCheckboxItem(plan.interventi.potenziamento.includes(opt), opt);
    }
    if (plan.interventi.potenziamentoAltro.trim()) {
      drawParagraph(`Altro potenziamento: ${plan.interventi.potenziamentoAltro}`, { italic: true });
    }

    drawParagraph('CONSOLIDAMENTO:', { bold: true, size: 10, color: [accR, accG, accB] });
    for (const opt of STRATEGIE_CONSOLIDAMENTO_OPTIONS) {
      drawCheckboxItem(plan.interventi.consolidamento.includes(opt), opt);
    }
    if (plan.interventi.consolidamentoAltro.trim()) {
      drawParagraph(`Altro consolidamento: ${plan.interventi.consolidamentoAltro}`, { italic: true });
    }

    drawParagraph('RECUPERO:', { bold: true, size: 10, color: [accR, accG, accB] });
    for (const opt of STRATEGIE_RECUPERO_OPTIONS) {
      drawCheckboxItem(plan.interventi.recupero.includes(opt), opt);
    }
    if (plan.interventi.recuperoAltro.trim()) {
      drawParagraph(`Altro recupero: ${plan.interventi.recuperoAltro}`, { italic: true });
    }

    drawParagraph('Alunni con BES e interventi programmati:', {
      bold: true,
      size: 10,
      color: [accR, accG, accB],
    });
    drawParagraph(
      plan.interventi.besInterventiProgrammati.trim() ||
        'Riferimento esclusivo ai piani personalizzati (PDP/PEI) senza dati identificativi.'
    );
  }

  // =========================================================================
  // TRAGUARDI / CURRICOLO / COMPETENZE / ABILITÀ / CONOSCENZE
  // =========================================================================
  if (isOriginal) {
    ensureSpace(28);
    // Cella introduttiva unificata del blocco Curricolo
    const headerBoxTitle =
      'TRAGUARDI PER LO SVILUPPO DELLE COMPETENZE IN RELAZIONE AL CURRICOLO VERTICALE DEL NOSTRO ISTITUTO';
    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(9.8);
    const titleLines = doc.splitTextToSize(headerBoxTitle, contentWidth - 4);
    const topCellH = titleLines.length * 4.4 + 4;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.rect(marginX, y, contentWidth, topCellH);
    doc.setFillColor(230, 230, 230);
    doc.rect(marginX + 1.5, y + 1.5, contentWidth - 3, 4.4, 'F');
    doc.setTextColor(0, 0, 0);
    doc.text(titleLines, marginX + 2, y + 5);
    y += topCellH;

    doc.setFont(fontFamily, 'italic');
    doc.setFontSize(9.5);
    const notaLines = doc.splitTextToSize(pdfSafeText(plan.curricolo.notaIntroduttiva), contentWidth - 4);
    const notaH = notaLines.length * 4.1 + 4;
    ensureSpace(notaH);
    doc.rect(marginX, y, contentWidth, notaH);
    doc.text(notaLines, marginX + 2, y + 4.5);
    y += notaH;

    if (plan.curricolo.competenzeAttese.length) {
      drawParagraph('Traguardi e competenze attese:', { bold: true, size: 10 });
      for (const c of plan.curricolo.competenzeAttese) {
        drawParagraph(`- ${c}`, { size: 9.5, spaceAfter: 1 });
      }
    }
    if (plan.curricolo.competenzeDigitali.length) {
      drawParagraph('Competenze digitali (DigComp 2.2):', { bold: true, size: 10 });
      for (const c of plan.curricolo.competenzeDigitali) {
        drawParagraph(`- ${c}`, { size: 9.5, spaceAfter: 1 });
      }
    }
    if (plan.curricolo.vociCatalogoImportate?.some((v) => v.testo.trim())) {
      drawParagraph('Voci dal Curricolo Verticale:', { bold: true, size: 10 });
      for (const tipo of CURRICOLO_TYPE_ORDER) {
        const list = (plan.curricolo.vociCatalogoImportate ?? []).filter(
          (v) => v.tipo === tipo && v.testo.trim()
        );
        if (!list.length) continue;
        drawParagraph(CURRICOLO_TYPE_LABELS[tipo], { bold: true, size: 9.2, spaceAfter: 0.8 });
        for (const v of list) {
          const nucleo = v.nucleoTematico ? `[${v.nucleoTematico}] ` : '';
          const origin =
            v.classeOrigine !== plan.datiGenerali.classe
              ? ` (Provenienza: Classe ${v.classeOrigine})`
              : '';
          drawParagraph(`- ${nucleo}${v.testo}${origin}`, { size: 9.2, spaceAfter: 0.8 });
        }
      }
    }

    drawThreeColRow('COMPETENZE', 'ABILITA / OBIETTIVI', 'CONOSCENZE', { isHeader: true });
    if (plan.curricolo.righeAbilitaConoscenze.length) {
      for (const row of plan.curricolo.righeAbilitaConoscenze) {
        drawThreeColRow(row.competenze || row.traguardo || '-', row.abilita, row.conoscenze, {
          repeatHeaderOnBreak: true,
        });
      }
    } else {
      drawThreeColRow(' ', ' ', ' ');
    }
    y += 3;
  } else {
    drawSectionHeading(
      'TRAGUARDI PER LO SVILUPPO DELLE COMPETENZE IN RELAZIONE AL CURRICOLO VERTICALE DEL NOSTRO ISTITUTO',
      { boxed: false }
    );
    drawParagraph(plan.curricolo.notaIntroduttiva, { italic: true });
    if (plan.curricolo.competenzeAttese.length) {
      drawParagraph('Traguardi e competenze attese:', { bold: true, size: 10, color: [accR, accG, accB] });
      for (const c of plan.curricolo.competenzeAttese) {
        drawParagraph(`- ${c}`);
      }
    }
    if (plan.curricolo.competenzeDigitali.length) {
      drawParagraph('Competenze digitali (DigComp 2.2):', { bold: true, size: 10, color: [accR, accG, accB] });
      for (const c of plan.curricolo.competenzeDigitali) {
        drawParagraph(`- ${c}`);
      }
    }
    if (plan.curricolo.vociCatalogoImportate?.some((v) => v.testo.trim())) {
      drawParagraph('Voci importate dal Curricolo Verticale:', {
        bold: true,
        size: 10,
        color: [accR, accG, accB],
      });
      for (const tipo of CURRICOLO_TYPE_ORDER) {
        const list = (plan.curricolo.vociCatalogoImportate ?? []).filter(
          (v) => v.tipo === tipo && v.testo.trim()
        );
        if (!list.length) continue;
        drawParagraph(CURRICOLO_TYPE_LABELS[tipo], { bold: true, size: 9.5 });
        for (const v of list) {
          const nucleo = v.nucleoTematico ? `[${v.nucleoTematico}] ` : '';
          const origin =
            v.classeOrigine !== plan.datiGenerali.classe
              ? ` (Provenienza: Classe ${v.classeOrigine})`
              : '';
          drawParagraph(`- ${nucleo}${v.testo}${origin}`);
        }
      }
    }
    y += 1.5;
    drawThreeColRow('COMPETENZE', 'ABILITA / OBIETTIVI', 'CONOSCENZE (CONTENUTI)', { isHeader: true });
    if (plan.curricolo.righeAbilitaConoscenze.length) {
      for (const row of plan.curricolo.righeAbilitaConoscenze) {
        drawThreeColRow(row.competenze || row.traguardo || '-', row.abilita, row.conoscenze, {
          repeatHeaderOnBreak: true,
        });
      }
    } else {
      drawThreeColRow('-', 'Nessuna abilità inserita.', 'Nessuna conoscenza inserita.');
    }
    y += 2;
  }

  if (plan.curricolo.attivitaProgrammate.trim()) {
    drawParagraph('Attività programmate:', { bold: true, size: 10, color: [accR, accG, accB] });
    drawParagraph(plan.curricolo.attivitaProgrammate);
  }

  // =========================================================================
  // CRITERI METODOLOGICI, STRATEGIE, STRUMENTI
  // =========================================================================
  drawSectionHeading('CRITERI METODOLOGICI, STRATEGIE, STRUMENTI:', {
    underlined: isOriginal,
    highlightE6: isOriginal,
    center: isOriginal,
  });
  drawParagraph(plan.metodiStrumenti.premessaMetodologica, {
    align: isOriginal ? 'justify' : 'left',
  });

  if (isOriginal) {
    const colMW = contentWidth * 0.52;
    const colSW = contentWidth - colMW;

    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(9.5);
    const altreText = `ALTRE METODOLOGIE (Brainstorming; Problem solving; Ricerca-azione; Discussione; Role play): ${
      plan.metodiStrumenti.altreMetodologie.trim() || '_______________________________'
    }`;
    const altriSussidiText = `ALTRI SUSSIDI: ${
      plan.metodiStrumenti.altriSussidi.trim() || '__________________________'
    }`;

    let leftBodyH = 5;
    for (const opt of METODI_OPTIONS) {
      leftBodyH += doc.splitTextToSize(pdfSafeText(opt), colMW - 8).length * 4.0 + 1.2;
    }
    leftBodyH += doc.splitTextToSize(pdfSafeText(altreText), colMW - 5).length * 4.0 + 3;

    let rightBodyH = 5;
    for (const opt of MEZZI_STRUMENTI_OPTIONS) {
      rightBodyH += doc.splitTextToSize(pdfSafeText(opt), colSW - 8).length * 4.0 + 1.2;
    }
    rightBodyH += doc.splitTextToSize(pdfSafeText(altriSussidiText), colSW - 5).length * 4.0 + 3;

    const tableBodyH = Math.max(leftBodyH, rightBodyH);
    ensureSpace(tableBodyH + 10);

    doc.setFillColor(230, 230, 230);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.rect(marginX, y, colMW, 7, 'FD');
    doc.rect(marginX + colMW, y, colSW, 7, 'FD');
    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(0, 0, 0);
    doc.text('METODI', marginX + colMW / 2, y + 4.7, { align: 'center' });
    doc.text('MEZZI E STRUMENTI', marginX + colMW + colSW / 2, y + 4.7, { align: 'center' });
    y += 7;

    doc.rect(marginX, y, colMW, tableBodyH);
    doc.rect(marginX + colMW, y, colSW, tableBodyH);

    let ym = y + 4.8;
    for (const opt of METODI_OPTIONS) {
      ym += drawCheckboxAt(plan.metodiStrumenti.metodi.includes(opt), opt, marginX + 2.5, ym, colMW - 4);
    }
    doc.setFont(fontFamily, plan.metodiStrumenti.altreMetodologie.trim() ? 'italic' : 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(doc.splitTextToSize(pdfSafeText(altreText), colMW - 5), marginX + 2.5, ym + 1.5);

    let ys = y + 4.8;
    for (const opt of MEZZI_STRUMENTI_OPTIONS) {
      ys += drawCheckboxAt(
        plan.metodiStrumenti.mezziEStrumenti.includes(opt),
        opt,
        marginX + colMW + 2.5,
        ys,
        colSW - 4
      );
    }
    doc.setFont(fontFamily, plan.metodiStrumenti.altriSussidi.trim() ? 'italic' : 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(
      doc.splitTextToSize(pdfSafeText(altriSussidiText), colSW - 5),
      marginX + colMW + 2.5,
      ys + 1.5
    );
    y += tableBodyH + 4;
  } else {
    drawParagraph('METODI:', { bold: true, size: 10, color: [accR, accG, accB] });
    for (const opt of METODI_OPTIONS) {
      drawCheckboxItem(plan.metodiStrumenti.metodi.includes(opt), opt);
    }
    if (plan.metodiStrumenti.altreMetodologie.trim()) {
      drawParagraph(`Altre metodologie: ${plan.metodiStrumenti.altreMetodologie}`, { italic: true });
    }
    drawParagraph('MEZZI E STRUMENTI:', { bold: true, size: 10, color: [accR, accG, accB] });
    for (const opt of MEZZI_STRUMENTI_OPTIONS) {
      drawCheckboxItem(plan.metodiStrumenti.mezziEStrumenti.includes(opt), opt);
    }
    if (plan.metodiStrumenti.altriSussidi.trim()) {
      drawParagraph(`Altri sussidi: ${plan.metodiStrumenti.altriSussidi}`, { italic: true });
    }
  }

  drawParagraph('AUSILI DIDATTICI', {
    bold: true,
    size: 10,
    color: [accR, accG, accB],
    spaceAfter: isOriginal ? 0.5 : 1.5,
  });
  if (isOriginal) {
    drawParagraph('(Libri di testo, eventuali sussidi o testi di approfondimento, strumenti vari...)', {
      size: 9.2,
      spaceAfter: 1.5,
    });
  }
  if (plan.metodiStrumenti.ausiliDidattici.trim()) {
    drawParagraph(plan.metodiStrumenti.ausiliDidattici);
  } else if (isOriginal) {
    drawBlankRules(3, 2);
  }

  drawParagraph('DIDATTICA DIGITALE INTEGRATA', {
    bold: true,
    size: 10,
    color: [accR, accG, accB],
    spaceAfter: 1.5,
  });
  drawParagraph(plan.metodiStrumenti.didatticaDigitaleIntegrata, {
    align: isOriginal ? 'justify' : 'left',
  });

  // =========================================================================
  // VERIFICHE IN ITINERE: MODALITÀ + VALUTAZIONE + FIRMA (Pagina 4 in originale)
  // =========================================================================
  if (isOriginal) {
    doc.addPage();
    y = 15;
    const halfW = contentWidth / 2;

    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(9.5);
    let leftVH = 5;
    for (const opt of VERIFICHE_SCRITTE_OPTIONS) {
      leftVH += doc.splitTextToSize(pdfSafeText(opt), halfW - 8).length * 4.0 + 1.2;
    }
    let rightVH = 5;
    for (const opt of VERIFICHE_ORALI_OPTIONS) {
      rightVH += doc.splitTextToSize(pdfSafeText(opt), halfW - 8).length * 4.0 + 1.2;
    }
    const altriProveText =
      plan.verificheValutazione.altriTipiProve.trim() || '_______________________________';
    const altriProveLines = doc.splitTextToSize(pdfSafeText(altriProveText), halfW - 6);
    rightVH += 7 + altriProveLines.length * 4.0;
    const bodyVH = Math.max(leftVH, rightVH);

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.rect(marginX, y, contentWidth, 7.5);
    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(9.8);
    doc.setTextColor(0, 0, 0);
    doc.text('VERIFICHE IN ITINERE: MODALITA', marginX + contentWidth / 2, y + 5, {
      align: 'center',
    });
    y += 7.5;

    doc.rect(marginX, y, halfW, 7);
    doc.rect(marginX + halfW, y, halfW, 7);
    doc.text('SCRITTA', marginX + halfW / 2, y + 4.7, { align: 'center' });
    doc.text('ORALE', marginX + halfW + halfW / 2, y + 4.7, { align: 'center' });
    y += 7;

    doc.rect(marginX, y, halfW, bodyVH);
    doc.rect(marginX + halfW, y, halfW, bodyVH);

    let yw = y + 4.8;
    for (const opt of VERIFICHE_SCRITTE_OPTIONS) {
      yw += drawCheckboxAt(
        plan.verificheValutazione.verificheScritte.includes(opt),
        opt,
        marginX + 2.5,
        yw,
        halfW - 4
      );
    }

    let yo = y + 4.8;
    for (const opt of VERIFICHE_ORALI_OPTIONS) {
      yo += drawCheckboxAt(
        plan.verificheValutazione.verificheOrali.includes(opt),
        opt,
        marginX + halfW + 2.5,
        yo,
        halfW - 4
      );
    }
    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(0, 0, 0);
    doc.text('ALTRI TIPI DI PROVE:', marginX + halfW + 2.5, yo + 3);
    doc.setFont(fontFamily, plan.verificheValutazione.altriTipiProve.trim() ? 'italic' : 'normal');
    doc.text(altriProveLines, marginX + halfW + 2.5, yo + 7.5);

    y += bodyVH + 7;
  } else {
    drawSectionHeading('VERIFICHE IN ITINERE: MODALITA');
    drawParagraph('SCRITTA:', { bold: true, size: 10, color: [accR, accG, accB] });
    for (const opt of VERIFICHE_SCRITTE_OPTIONS) {
      drawCheckboxItem(plan.verificheValutazione.verificheScritte.includes(opt), opt);
    }
    drawParagraph('ORALE:', { bold: true, size: 10, color: [accR, accG, accB] });
    for (const opt of VERIFICHE_ORALI_OPTIONS) {
      drawCheckboxItem(plan.verificheValutazione.verificheOrali.includes(opt), opt);
    }
    if (plan.verificheValutazione.altriTipiProve.trim()) {
      drawParagraph(`ALTRI TIPI DI PROVE: ${plan.verificheValutazione.altriTipiProve}`, { italic: true });
    }
  }

  // =========================================================================
  // VALUTAZIONE & FIRMA
  // =========================================================================
  drawParagraph('VALUTAZIONE', {
    bold: true,
    size: 10,
    color: [accR, accG, accB],
    spaceAfter: 2.5,
  });
  drawParagraph(plan.verificheValutazione.criteriValutazione, {
    size: 10,
    align: isOriginal ? 'justify' : 'left',
    lineFactor: isOriginal ? 0.56 : 0.44,
  });
  y += 6;
  drawParagraph(firmaDocente, {
    bold: !isOriginal,
    size: 10.5,
    align: 'right',
    color: [accR, accG, accB],
  });

  // Piè di pagina discreto solo in stile moderno (nel modello originale resta pulito)
  if (!isOriginal) {
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont(fontFamily, 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `PIANORAMA - ${pdfSafeText(plan.datiGenerali.disciplina)} ${pdfSafeText(
          plan.datiGenerali.classe + plan.datiGenerali.sezione
        )} - Pagina ${i} di ${totalPages}`,
        pageWidth / 2,
        289,
        { align: 'center' }
      );
    }
  }

  const buffer = doc.output('arraybuffer');
  return new Uint8Array(buffer);
}

export function downloadProgrammazionePdf(
  plan: Programmazione,
  settings: SchoolSettings,
  mapping: DocxMappingSchema
): string {
  const bytes = generateProgrammazionePdfBytes(plan, settings, mapping);
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const filename = buildDocxFilename(plan, 'pdf');
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return filename;
}
