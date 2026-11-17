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
    .replace(/…/g, '...');
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
  const docenteConTitolo = formatDocenteConTitolo(plan.datiGenerali.docente, docenteGenere);
  const firmaDocente = formatFirmaDocente(
    plan.verificheValutazione.firmaDocente || plan.datiGenerali.docente,
    docenteGenere
  );

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const [accR, accG, accB] = isOriginal
    ? [0, 0, 0]
    : hexToRgb(mapping.typography.headingColorHex || '1F3864');
  const pageWidth = 210;
  const marginX = 16;
  const contentWidth = pageWidth - marginX * 2;
  const bottomLimit = 278;
  let y = 16;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > bottomLimit) {
      doc.addPage();
      y = 16;
    }
  };

  const drawSectionHeading = (title: string, opts?: { boxed?: boolean; underlined?: boolean }) => {
    ensureSpace(12);
    y += 3;
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(accR, accG, accB);
    const lines = doc.splitTextToSize(pdfSafeText(title), contentWidth - 4);
    const textH = lines.length * 4.8 + 2;

    if (opts?.boxed) {
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.35);
      doc.rect(marginX, y - 4, contentWidth, textH + 2);
      doc.text(lines, pageWidth / 2, y, { align: 'center' });
      y += textH + 1;
      return;
    }

    if (isOriginal) {
      doc.text(lines, pageWidth / 2, y, { align: 'center' });
      if (opts?.underlined) {
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.3);
        doc.line(marginX + 20, y + 1.2, pageWidth - marginX - 20, y + 1.2);
      }
      y += lines.length * 4.8 + 2;
    } else {
      doc.text(lines, marginX, y);
      y += lines.length * 4.8 + 1;
      doc.setDrawColor(accR, accG, accB);
      doc.setLineWidth(0.45);
      doc.line(marginX, y, pageWidth - marginX, y);
      y += 4;
    }
  };

  const drawParagraph = (
    text: string,
    opts?: { bold?: boolean; italic?: boolean; size?: number; color?: [number, number, number]; align?: 'left' | 'center' | 'right' }
  ) => {
    const size = opts?.size ?? 10.5;
    const style = opts?.bold ? 'bold' : opts?.italic ? 'italic' : 'normal';
    doc.setFont('times', style);
    doc.setFontSize(size);
    const [r, g, b] = opts?.color ?? (isOriginal ? [0, 0, 0] : [30, 41, 59]);
    doc.setTextColor(r, g, b);

    const safe = pdfSafeText(text);
    const lines = doc.splitTextToSize(safe, contentWidth);
    const lineHeight = size * 0.44;
    ensureSpace(lines.length * lineHeight + 2);

    const x =
      opts?.align === 'center'
        ? pageWidth / 2
        : opts?.align === 'right'
        ? pageWidth - marginX
        : marginX;

    doc.text(lines, x, y, { align: opts?.align ?? 'left' });
    y += lines.length * lineHeight + 2;
  };

  const drawCheckboxItem = (checked: boolean, label: string, xOffset = marginX, maxWidth = contentWidth) => {
    doc.setFont('times', checked ? 'bold' : 'normal');
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(pdfSafeText(label), maxWidth - 6);
    const blockH = lines.length * 4.2 + 1.4;
    ensureSpace(blockH);

    const boxY = y - 2.9;
    doc.setDrawColor(accR, accG, accB);
    doc.setLineWidth(0.32);
    doc.rect(xOffset, boxY, 3.1, 3.1);
    if (checked) {
      doc.setFillColor(accR, accG, accB);
      doc.rect(xOffset, boxY, 3.1, 3.1, 'F');
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.35);
      doc.line(xOffset + 0.6, boxY + 0.6, xOffset + 2.5, boxY + 2.5);
      doc.line(xOffset + 2.5, boxY + 0.6, xOffset + 0.6, boxY + 2.5);
      doc.setTextColor(accR, accG, accB);
    } else {
      doc.setTextColor(isOriginal ? 0 : 30, isOriginal ? 0 : 41, isOriginal ? 0 : 59);
    }

    doc.text(lines, xOffset + 4.8, y);
    y += blockH;
  };

  const drawThreeColRow = (
    c1: string,
    c2: string,
    c3: string,
    opts?: { isHeader?: boolean }
  ) => {
    const colW = contentWidth / 3;
    const pad = 2;
    doc.setFont('times', opts?.isHeader ? 'bold' : 'normal');
    doc.setFontSize(opts?.isHeader ? 9.5 : 9);

    const l1 = doc.splitTextToSize(pdfSafeText(c1 || '—'), colW - pad * 2);
    const l2 = doc.splitTextToSize(pdfSafeText(c2 || '—'), colW - pad * 2);
    const l3 = doc.splitTextToSize(pdfSafeText(c3 || '—'), colW - pad * 2);
    const maxLines = Math.max(l1.length, l2.length, l3.length, 1);
    const rowH = maxLines * 4.0 + 3.5;

    ensureSpace(rowH);

    const borderColor: [number, number, number] = isOriginal ? [0, 0, 0] : [180, 195, 210];
    if (opts?.isHeader && !isOriginal) {
      doc.setFillColor(accR, accG, accB);
      doc.rect(marginX, y, contentWidth, rowH, 'F');
      doc.setTextColor(255, 255, 255);
    } else {
      doc.setTextColor(0, 0, 0);
    }

    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.3);
    doc.rect(marginX, y, colW, rowH);
    doc.rect(marginX + colW, y, colW, rowH);
    doc.rect(marginX + colW * 2, y, colW, rowH);

    doc.text(l1, marginX + pad, y + 4.2);
    doc.text(l2, marginX + colW + pad, y + 4.2);
    doc.text(l3, marginX + colW * 2 + pad, y + 4.2);
    y += rowH;
  };

  // Intestazione istituzionale
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
    color: isOriginal ? [0, 0, 0] : [71, 85, 105],
    align: 'center',
  });
  drawParagraph(settings.schoolContactsLine, {
    size: 8.5,
    color: isOriginal ? [0, 0, 0] : [71, 85, 105],
    align: 'center',
  });
  if (isOriginal) {
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(marginX, y, pageWidth - marginX, y);
    doc.line(marginX, y + 0.9, pageWidth - marginX, y + 0.9);
  }
  y += 4;

  // Titolo
  drawParagraph(
    `PROGRAMMAZIONE DISCIPLINARE di ${plan.datiGenerali.titoloDisciplina || plan.datiGenerali.disciplina}`,
    {
      bold: true,
      size: 14,
      color: [accR, accG, accB],
      align: 'center',
    }
  );
  y += 1;

  // Dati generali
  if (isOriginal) {
    ensureSpace(22);
    drawParagraph(`SCUOLA ${plan.datiGenerali.scuola}`, { bold: true, size: 10.5 });
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(marginX, y - 1.5, pageWidth - marginX, y - 1.5);
    drawParagraph(`PLESSO DI ${plan.datiGenerali.plesso}`, { bold: true, size: 10.5 });
    doc.line(marginX, y - 1.5, pageWidth - marginX, y - 1.5);
    drawParagraph(
      `ANNO SCOLASTICO: ${plan.datiGenerali.annoScolastico}     CLASSE: ${plan.datiGenerali.classe} ${plan.datiGenerali.sezione}`,
      { bold: true, size: 10 }
    );
    drawParagraph(
      `DISCIPLINA: ${plan.datiGenerali.disciplina}     DOCENTE: ${docenteConTitolo}`,
      { bold: true, size: 10 }
    );
  } else {
    ensureSpace(18);
    doc.setDrawColor(accR, accG, accB);
    doc.setLineWidth(0.3);
    doc.rect(marginX, y, contentWidth, 16);
    doc.setFont('times', 'normal');
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

  // Composizione della classe
  drawSectionHeading('COMPOSIZIONE DELLA CLASSE');
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
    if (isOriginal) {
      doc.setDrawColor(0, 0, 0);
      doc.rect(cx, y, col.w, 6);
      doc.setFont('times', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(0, 0, 0);
      doc.text(col.label, cx + col.w / 2, y + 4.2, { align: 'center' });
    } else {
      doc.setFillColor(accR, accG, accB);
      doc.rect(cx, y, col.w, 6, 'F');
      doc.setFont('times', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(255, 255, 255);
      doc.text(col.label, cx + col.w / 2, y + 4.2, { align: 'center' });
    }

    doc.setDrawColor(isOriginal ? 0 : 180, isOriginal ? 0 : 195, isOriginal ? 0 : 210);
    doc.rect(cx, y + 6, col.w, 6.5);
    doc.setFont('times', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(col.val, cx + col.w / 2, y + 10.5, { align: 'center' });
    cx += col.w;
  }
  y += 16;

  // Situazione della classe
  drawSectionHeading('SITUAZIONE DELLA CLASSE');
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

  const compositionIntro = buildClassCompositionIntro(plan);
  const activeCharacteristics = getActiveDimensionsForDocument(
    plan.situazione.caratteristicheDimensioni,
    settings.soglieQuoteCaratteristiche,
    `${plan.id}|${plan.datiGenerali.classe}|${plan.datiGenerali.sezione}|${plan.datiGenerali.disciplina}`
  );
  drawParagraph('Presentazione e caratteristiche della classe:', {
    bold: true,
    size: 10,
    color: [accR, accG, accB],
  });
  drawParagraph(compositionIntro, { size: 10 });
  for (const item of activeCharacteristics) {
    drawParagraph(`${item.nome}: ${item.testo}`, { size: 10 });
  }

  // Analisi della situazione di partenza
  drawSectionHeading('ANALISI DELLA SITUAZIONE DI PARTENZA');
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
  drawParagraph('FONTI DI RILEVAZIONE DEI DATI:', { bold: true, size: 10, color: [accR, accG, accB] });
  for (const opt of FONTI_RILEVAZIONE_OPTIONS) {
    drawCheckboxItem(plan.analisiPartenza.fontiRilevazione.includes(opt), opt);
  }
  if (plan.analisiPartenza.altraFonte.trim()) {
    drawParagraph(`Altro: ${plan.analisiPartenza.altraFonte}`, { italic: true });
  }

  // Strategie e interventi
  drawSectionHeading(
    'STRATEGIE ED INTERVENTI PER IL POTENZIAMENTO, IL CONSOLIDAMENTO ED IL RECUPERO',
    { boxed: isOriginal }
  );
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

  // Curricolo (tabella a 3 colonne)
  drawSectionHeading(
    'TRAGUARDI PER LO SVILUPPO DELLE COMPETENZE IN RELAZIONE AL CURRICOLO VERTICALE DEL NOSTRO ISTITUTO',
    { boxed: isOriginal }
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
      drawThreeColRow(row.competenze || row.traguardo || '—', row.abilita, row.conoscenze);
    }
  } else {
    drawThreeColRow('—', 'Nessuna abilità inserita.', 'Nessuna conoscenza inserita.');
  }
  y += 2;

  if (plan.curricolo.attivitaProgrammate.trim()) {
    drawParagraph('Attività programmate:', { bold: true, size: 10, color: [accR, accG, accB] });
    drawParagraph(plan.curricolo.attivitaProgrammate);
  }

  // Metodi e strumenti
  drawSectionHeading('CRITERI METODOLOGICI, STRATEGIE, STRUMENTI:', { underlined: isOriginal });
  drawParagraph(plan.metodiStrumenti.premessaMetodologica);
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
  if (plan.metodiStrumenti.ausiliDidattici.trim()) {
    drawParagraph('AUSILI DIDATTICI:', { bold: true, size: 10, color: [accR, accG, accB] });
    drawParagraph(plan.metodiStrumenti.ausiliDidattici);
  }
  drawParagraph('DIDATTICA DIGITALE INTEGRATA:', { bold: true, size: 10, color: [accR, accG, accB] });
  drawParagraph(plan.metodiStrumenti.didatticaDigitaleIntegrata);

  // Verifiche
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

  // Valutazione e firma
  drawSectionHeading('VALUTAZIONE');
  drawParagraph(plan.verificheValutazione.criteriValutazione);
  y += 6;
  drawParagraph(firmaDocente, { bold: true, align: 'right', color: [accR, accG, accB] });

  // Page numbers footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('times', 'normal');
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
