import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TabStopType,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import {
  FONTI_RILEVAZIONE_OPTIONS,
  formatDocenteConTitolo,
  formatFirmaDocente,
  getCurricoloIntroNoteText,
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
import {
  extractNormalizedBulletEntries,
  formatCurricoloCellLines,
  normalizeDocumentText,
} from '../domain/textSanitizer';
import {
  buildUnifiedClassDescriptionText,
  getStudentNamesByLevelBand,
} from '../engine/classCharacteristicsEngine';
import { buildClassCompositionIntro } from '../engine/questionnaireEngine';
import {
  getSchoolBannerUint8Array,
  SCHOOL_BANNER_HEIGHT,
  SCHOOL_BANNER_WIDTH,
} from './schoolBannerAsset';

function resolveOptions(
  mapping: DocxMappingSchema,
  sectionId: string,
  fallback: string[]
): string[] {
  const found = mapping.sections.find((s) => s.id === sectionId);
  return found?.options?.length ? found.options : fallback;
}

function checkboxPrefix(
  checked: boolean,
  mapping: DocxMappingSchema,
  bracket = false
): string {
  if (bracket) return checked ? '[X]' : '[  ]';
  return checked ? mapping.typography.checkedGlyph : mapping.typography.uncheckedGlyph;
}

function cleanColorHex(hex: string): string {
  return hex.replace('#', '').toUpperCase() || '1F3864';
}

function makeBorder(colorHex: string, size = 6) {
  return {
    top: { style: BorderStyle.SINGLE, size, color: colorHex },
    bottom: { style: BorderStyle.SINGLE, size, color: colorHex },
    left: { style: BorderStyle.SINGLE, size, color: colorHex },
    right: { style: BorderStyle.SINGLE, size, color: colorHex },
  };
}

export function buildDocxFilename(plan: Programmazione, ext: 'docx' | 'pdf'): string {
  const sanitize = (v: string) =>
    v
      .trim()
      .replace(/[^a-zA-Z0-9àèéìòùÀÈÉÌÒÙ_-]+/g, '_')
      .replace(/^_+|_+$/g, '');
  const disc = sanitize(plan.datiGenerali.disciplina || 'Disciplina');
  const cls = sanitize(`${plan.datiGenerali.classe}${plan.datiGenerali.sezione}`);
  const anno = sanitize(plan.datiGenerali.annoScolastico);
  return `Programmazione_${disc}_${cls}_${anno}.${ext}`;
}

export function createProgrammazioneDocument(
  rawPlan: Programmazione,
  settings: SchoolSettings,
  mapping: DocxMappingSchema
): Document {
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

  const font = isOriginal ? 'Arial' : mapping.typography.fontFamily || 'Garamond';
  const accentHex = isOriginal
    ? '000000'
    : cleanColorHex(mapping.typography.headingColorHex || '1F3864');
  const bodySize = isOriginal ? 20 : (mapping.typography.bodySizePt || 11) * 2;
  const headingSize = isOriginal ? 20 : (mapping.typography.headingSizePt || 13) * 2;
  const borders = isOriginal ? makeBorder('000000', 6) : makeBorder('B8C4D4', 6);
  const headerBorders = isOriginal ? makeBorder('000000', 6) : makeBorder(accentHex, 6);

  const pText = (
    text: string,
    opts?: {
      bold?: boolean;
      italic?: boolean;
      underline?: boolean;
      size?: number;
      color?: string;
      highlightHex?: string;
      align?: (typeof AlignmentType)[keyof typeof AlignmentType];
      spaceAfter?: number;
      spaceBefore?: number;
      line?: number;
      keepNext?: boolean;
      pageBreakBefore?: boolean;
    }
  ) =>
    new Paragraph({
      alignment: opts?.align ?? AlignmentType.LEFT,
      keepNext: opts?.keepNext ? true : undefined,
      pageBreakBefore: opts?.pageBreakBefore ? true : undefined,
      spacing: {
        before: opts?.spaceBefore ?? (isOriginal ? 20 : 40),
        after: opts?.spaceAfter ?? (isOriginal ? 40 : 80),
        ...(opts?.line ? { line: opts.line } : {}),
      },
      children: [
        new TextRun({
          text: normalizeDocumentText(text),
          font,
          size: opts?.size ?? bodySize,
          bold: opts?.bold ? true : undefined,
          italics: opts?.italic ? true : undefined,
          underline: opts?.underline ? {} : undefined,
          color: opts?.color ?? (isOriginal ? '000000' : '1E293B'),
          shading: opts?.highlightHex
            ? { type: ShadingType.CLEAR, fill: opts.highlightHex, color: 'auto' }
            : undefined,
        }),
      ],
    });

  const pMultiLine = (
    text: string,
    opts?: Parameters<typeof pText>[1]
  ): Paragraph[] => {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trimEnd())
      .filter((l, idx, arr) => l.length > 0 || (arr.length === 1 && idx === 0));
    if (lines.length === 0) return [pText('', opts)];
    return lines.map((lineText, idx) =>
      pText(lineText, {
        ...opts,
        spaceBefore: idx === 0 ? opts?.spaceBefore : 15,
        spaceAfter: idx === lines.length - 1 ? opts?.spaceAfter : 30,
      })
    );
  };

  const blankRuleParagraphs = (count: number, spaceAfterLast = 60): Paragraph[] =>
    Array.from({ length: count }, (_, idx) =>
      pText('________________________________________________________________________________________', {
        size: 20,
        spaceBefore: 0,
        spaceAfter: idx === count - 1 ? spaceAfterLast : 20,
      })
    );

  const sectionBanner = (
    title: string,
    opts?: { boxed?: boolean; underlined?: boolean; highlightE6?: boolean; center?: boolean }
  ) => {
    if (isOriginal) {
      return new Paragraph({
        alignment: opts?.boxed || opts?.center ? AlignmentType.CENTER : AlignmentType.LEFT,
        keepNext: true,
        spacing: {
          before: opts?.boxed ? 180 : 160,
          after: opts?.boxed ? 0 : 70,
          ...(opts?.boxed ? { line: 300 } : {}),
        },
        border: opts?.boxed
          ? {
              top: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
              bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
              left: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
              right: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
            }
          : undefined,
        children: [
          new TextRun({
            text: normalizeDocumentText(title),
            font,
            size: headingSize,
            bold: opts?.boxed ? false : Boolean(opts?.underlined || !opts?.highlightE6),
            underline: opts?.underlined ? {} : undefined,
            color: '000000',
            shading: opts?.highlightE6
              ? { type: ShadingType.CLEAR, fill: 'E6E6E6', color: 'auto' }
              : undefined,
          }),
        ],
      });
    }

    return new Paragraph({
      alignment: AlignmentType.LEFT,
      keepNext: true,
      spacing: { before: 220, after: 100 },
      border: opts?.boxed
        ? {
            top: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
            bottom: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
            left: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
            right: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
          }
        : {
            bottom: { style: BorderStyle.SINGLE, size: 12, color: accentHex },
          },
      children: [
        new TextRun({
          text: normalizeDocumentText(title),
          font,
          size: headingSize,
          bold: true,
          underline: opts?.underlined ? {} : undefined,
          color: accentHex,
        }),
      ],
    });
  };

  const cell = (
    children: Paragraph[],
    opts?: {
      widthPct?: number;
      header?: boolean;
      fillHex?: string;
      columnSpan?: number;
      vAlign?: typeof VerticalAlign.TOP | typeof VerticalAlign.CENTER | typeof VerticalAlign.BOTTOM;
      margins?: { top?: number; bottom?: number; left?: number; right?: number };
    }
  ) =>
    new TableCell({
      columnSpan: opts?.columnSpan,
      verticalAlign: opts?.vAlign ?? VerticalAlign.TOP,
      width: opts?.widthPct
        ? { size: opts.widthPct, type: WidthType.PERCENTAGE }
        : undefined,
      shading: opts?.fillHex
        ? { type: ShadingType.CLEAR, fill: opts.fillHex, color: 'auto' }
        : opts?.header && !isOriginal
        ? { type: ShadingType.CLEAR, fill: accentHex, color: 'auto' }
        : undefined,
      margins: opts?.margins ?? { top: 65, bottom: 65, left: 100, right: 100 },
      borders: opts?.header ? headerBorders : borders,
      children,
    });

  const headerCellText = (
    label: string,
    center = true,
    highlightHex?: string,
    keepNext = false
  ) =>
    pText(label, {
      bold: true,
      color: isOriginal ? '000000' : 'FFFFFF',
      highlightHex: isOriginal ? highlightHex : undefined,
      align: center ? AlignmentType.CENTER : AlignmentType.LEFT,
      spaceBefore: 0,
      spaceAfter: 0,
      keepNext,
    });

  const checkboxListParagraphs = (
    options: string[],
    selected: string[],
    inline = false,
    bracket = false
  ): Paragraph[] => {
    if (inline) {
      return [
        new Paragraph({
          spacing: { before: 30, after: 40 },
          children: options.map((opt, idx) => {
            const isChecked = selected.includes(opt);
            return new TextRun({
              text: `${checkboxPrefix(isChecked, mapping, bracket)} ${opt}${
                idx < options.length - 1 ? '    ' : ''
              }`,
              font,
              size: bodySize,
              bold: isChecked,
              color: isChecked ? accentHex : isOriginal ? '000000' : '1E293B',
            });
          }),
        }),
      ];
    }

    return options.map((opt) => {
      const isChecked = selected.includes(opt);
      return new Paragraph({
        spacing: { before: 15, after: 25 },
        children: [
          new TextRun({
            text: `${checkboxPrefix(isChecked, mapping, bracket)} ${opt}`,
            font,
            size: bodySize,
            bold: isChecked && !isOriginal,
            color: isChecked ? accentHex : isOriginal ? '000000' : '1E293B',
          }),
        ],
      });
    });
  };

  // Griglia a 2 colonne interne con tab-stop per TIPOLOGIA del modello originale
  const originalTipologieParagraphs = (selected: string[]): Paragraph[] => {
    const pairs: [string, string | null][] = [
      ['tranquilla', 'motivata'],
      ['vivace', 'poco motivata'],
      ['collaborativa', 'problematica'],
      ['poco collaborativa', null],
    ];
    return pairs.map(([leftOpt, rightOpt]) => {
      const leftChecked = selected.includes(leftOpt);
      const children: TextRun[] = [
        new TextRun({
          text: `${leftOpt}\t${leftChecked ? '[X]' : '[   ]'}`,
          font,
          size: bodySize,
          bold: leftChecked,
          color: '000000',
        }),
      ];
      if (rightOpt) {
        const rightChecked = selected.includes(rightOpt);
        children.push(
          new TextRun({
            text: `\t${rightOpt}\t${rightChecked ? '[X]' : '[   ]'}`,
            font,
            size: bodySize,
            bold: rightChecked,
            color: '000000',
          })
        );
      }
      return new Paragraph({
        spacing: { before: 20, after: 30 },
        tabStops: [
          { type: TabStopType.LEFT, position: 2150 },
          { type: TabStopType.LEFT, position: 2900 },
          { type: TabStopType.LEFT, position: 4900 },
        ],
        children,
      });
    });
  };

  const tipologieOpts = resolveOptions(mapping, 'situazione_tipologia', TIPOLOGIE_CLASSE_OPTIONS);
  const livelloOpts = resolveOptions(
    mapping,
    'situazione_livello',
    LIVELLI_CLASSE_OPTIONS.map((l) => l.value)
  );
  const mezziOpts = resolveOptions(mapping, 'situazione_mezzi', MEZZI_INDIVIDUAZIONE_OPTIONS);
  const fontiOpts = resolveOptions(mapping, 'analisi_partenza_fonti', FONTI_RILEVAZIONE_OPTIONS);

  const ministryText = settings.ministryHeader || mapping.institutionHeader.ministry;
  const schoolNameText = settings.schoolName || mapping.institutionHeader.schoolName;
  const addressText = settings.schoolAddressLine || mapping.institutionHeader.addressLine;
  const contactsText = settings.schoolContactsLine || mapping.institutionHeader.contactsLine;
  const compositionIntro = buildClassCompositionIntro(plan);
  const unifiedClassDescription = buildUnifiedClassDescriptionText(
    plan,
    settings,
    compositionIntro
  );
  const bandStudents = getStudentNamesByLevelBand(plan);

  const bannerTargetWidth = 580;
  const bannerRatioHeight = Math.round(
    (bannerTargetWidth * SCHOOL_BANNER_HEIGHT) / SCHOOL_BANNER_WIDTH
  );
  const institutionHeaderBlocks: Paragraph[] = isOriginal
    ? [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 40, after: 100 },
          children: [
            new ImageRun({
              data: getSchoolBannerUint8Array(),
              transformation: { width: bannerTargetWidth, height: bannerRatioHeight },
              type: 'png',
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 360 },
          border: {
            bottom: { style: BorderStyle.DOUBLE, size: 12, color: '000000', space: 4 },
          },
          children: [],
        }),
      ]
    : [
        pText(ministryText.toUpperCase(), {
          bold: true,
          size: 20,
          color: accentHex,
          align: AlignmentType.CENTER,
          spaceAfter: 20,
        }),
        pText(schoolNameText, {
          bold: true,
          size: 26,
          color: accentHex,
          align: AlignmentType.CENTER,
          spaceAfter: 20,
        }),
        pText(addressText, {
          size: 18,
          color: '475569',
          align: AlignmentType.CENTER,
          spaceAfter: 20,
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 20, after: 180 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: accentHex } },
          children: [
            new TextRun({
              text: contactsText,
              font,
              size: 18,
              color: '475569',
            }),
          ],
        }),
      ];

  const titleAndMetadataBlocks: (Paragraph | Table)[] = isOriginal
    ? [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 60, after: 110 },
          children: [
            new TextRun({
              text: 'PROGRAMMAZIONE DISCIPLINARE di ',
              font,
              size: 24,
              color: '000000',
            }),
            new TextRun({
              text:
                plan.datiGenerali.titoloDisciplina ||
                plan.datiGenerali.disciplina ||
                '___________________',
              font,
              size: 24,
              bold: Boolean(plan.datiGenerali.titoloDisciplina || plan.datiGenerali.disciplina),
              underline: {},
              color: '000000',
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 20, after: 110 },
          children: [
            new TextRun({ text: 'SCUOLA ', font, size: 24, color: '000000' }),
            new TextRun({
              text: plan.datiGenerali.scuola || '_____________________________________________',
              font,
              size: 24,
              underline: {},
              color: '000000',
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 20, after: 180 },
          children: [
            new TextRun({ text: 'PLESSO DI ', font, size: 24, color: '000000' }),
            new TextRun({
              text: plan.datiGenerali.plesso || '_____________________________________________',
              font,
              size: 24,
              underline: {},
              color: '000000',
            }),
          ],
        }),
        ...(
          [
            ['ANNO SCOLASTICO', plan.datiGenerali.annoScolastico || '________'],
            [
              'CLASSE',
              plan.datiGenerali.classe
                ? `${plan.datiGenerali.classe} ${plan.datiGenerali.sezione}`.trim()
                : '________',
            ],
            ['DISCIPLINA', plan.datiGenerali.disciplina || '___________________________'],
            ['DOCENTE', docenteConTitolo],
          ] as const
        ).map(([lbl, val], idx, arr) =>
          new Paragraph({
            spacing: { before: 15, after: idx === arr.length - 1 ? 140 : 25 },
            tabStops: [{ type: TabStopType.LEFT, position: 3200 }],
            children: [
              new TextRun({ text: `${lbl}\t`, font, size: 20, color: '000000' }),
              new TextRun({
                text: val,
                font,
                size: 20,
                bold: !val.startsWith('___'),
                color: '000000',
              }),
            ],
          })
        ),
      ]
    : [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 80, after: 160 },
          children: [
            new TextRun({
              text: `PROGRAMMAZIONE DISCIPLINARE di ${
                plan.datiGenerali.titoloDisciplina || plan.datiGenerali.disciplina || '___________'
              }`,
              font,
              size: 30,
              bold: true,
              color: accentHex,
            }),
          ],
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              cantSplit: true,
              children: [
                cell([pText(`SCUOLA: ${plan.datiGenerali.scuola}`, { bold: true, spaceAfter: 20 })], {
                  widthPct: 50,
                }),
                cell([pText(`PLESSO DI: ${plan.datiGenerali.plesso}`, { bold: true, spaceAfter: 20 })], {
                  widthPct: 50,
                }),
              ],
            }),
            new TableRow({
              cantSplit: true,
              children: [
                cell(
                  [
                    pText(`ANNO SCOLASTICO: ${plan.datiGenerali.annoScolastico}`, { spaceAfter: 20 }),
                    pText(`CLASSE: ${plan.datiGenerali.classe} ${plan.datiGenerali.sezione}`, {
                      spaceAfter: 20,
                    }),
                  ],
                  { widthPct: 50 }
                ),
                cell(
                  [
                    pText(`DISCIPLINA: ${plan.datiGenerali.disciplina}`, { spaceAfter: 20 }),
                    pText(`DOCENTE: ${docenteConTitolo}`, { spaceAfter: 20 }),
                  ],
                  { widthPct: 50 }
                ),
              ],
            }),
          ],
        }),
      ];

  const disabilitaCount = plan.composizione.disabilita ?? 0;
  const alunniVal =
    typeof plan.composizione.alunni === 'number' ? String(plan.composizione.alunni) : '';
  const maschiVal =
    typeof plan.composizione.maschi === 'number' ? String(plan.composizione.maschi) : '';
  const femmineVal =
    typeof plan.composizione.femmine === 'number' ? String(plan.composizione.femmine) : '';

  const composizioneTable = isOriginal
    ? new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            cantSplit: true,
            children: [
              cell([pText(alunniVal ? `Alunni: ${alunniVal}` : 'Alunni:', { spaceBefore: 10, spaceAfter: 10 })], {
                widthPct: 14,
              }),
              cell([pText(maschiVal ? `Maschi: ${maschiVal}` : 'Maschi:', { spaceBefore: 10, spaceAfter: 10 })], {
                widthPct: 14,
              }),
              cell([pText(femmineVal ? `Femmine: ${femmineVal}` : 'Femmine:', { spaceBefore: 10, spaceAfter: 10 })], {
                widthPct: 14,
              }),
              cell([pText(`Ripetenti: ${plan.composizione.ripetenti}`, { spaceBefore: 10, spaceAfter: 10 })], {
                widthPct: 15,
              }),
              cell(
                [
                  pText(`Con Bisogni Educativi Speciali (BES): ${plan.composizione.bes}`, {
                    spaceBefore: 10,
                    spaceAfter: 10,
                  }),
                ],
                { widthPct: 27 }
              ),
              cell(
                [
                  pText(`Con disabilità: ${disabilitaCount}`, {
                    spaceBefore: 10,
                    spaceAfter: 10,
                  }),
                ],
                { widthPct: 16 }
              ),
            ],
          }),
        ],
      })
    : new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            cantSplit: true,
            tableHeader: true,
            children: [
              cell([headerCellText('Alunni')], { header: true, widthPct: 15 }),
              cell([headerCellText('Maschi')], { header: true, widthPct: 14 }),
              cell([headerCellText('Femmine')], { header: true, widthPct: 14 }),
              cell([headerCellText('Ripetenti')], { header: true, widthPct: 15 }),
              cell([headerCellText('Con Bisogni Educativi Speciali (BES)')], {
                header: true,
                widthPct: 24,
              }),
              cell([headerCellText('Con disabilità')], {
                header: true,
                widthPct: 18,
              }),
            ],
          }),
          new TableRow({
            cantSplit: true,
            children: [
              cell([pText(alunniVal || '—', { align: AlignmentType.CENTER, bold: true })]),
              cell([pText(maschiVal || '—', { align: AlignmentType.CENTER })]),
              cell([pText(femmineVal || '—', { align: AlignmentType.CENTER })]),
              cell([pText(String(plan.composizione.ripetenti), { align: AlignmentType.CENTER })]),
              cell([pText(String(plan.composizione.bes), { align: AlignmentType.CENTER, bold: true })]),
              cell([pText(String(disabilitaCount), { align: AlignmentType.CENTER, bold: true })]),
            ],
          }),
        ],
      });

  const situazioneTable = isOriginal
    ? new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            cantSplit: true,
            children: [
              cell(
                [
                  pText('TIPOLOGIA', {
                    bold: false,
                    align: AlignmentType.CENTER,
                    spaceBefore: 0,
                    spaceAfter: 0,
                  }),
                ],
                { columnSpan: 2, widthPct: 58, fillHex: 'F3F3F3' }
              ),
              cell(
                [
                  pText('LIVELLO', {
                    bold: false,
                    align: AlignmentType.CENTER,
                    spaceBefore: 0,
                    spaceAfter: 0,
                  }),
                ],
                { widthPct: 42, fillHex: 'F3F3F3' }
              ),
            ],
          }),
          new TableRow({
            cantSplit: true,
            children: [
              cell(originalTipologieParagraphs(plan.situazione.tipologie), {
                columnSpan: 2,
                widthPct: 58,
              }),
              cell(checkboxListParagraphs(livelloOpts, [plan.situazione.livello], false, false), {
                widthPct: 42,
              }),
            ],
          }),
          new TableRow({
            cantSplit: true,
            children: [
              cell(
                [
                  pText('MEZZI UTILIZZATI PER INDIVIDUARE LE RISORSE ED I BISOGNI DEGLI ALUNNI:', {
                    align: AlignmentType.CENTER,
                    spaceBefore: 20,
                    spaceAfter: 20,
                  }),
                ],
                { widthPct: 30, fillHex: 'E6E6E6', vAlign: VerticalAlign.CENTER }
              ),
              cell(checkboxListParagraphs(mezziOpts, plan.situazione.mezziIndividuazione, false), {
                columnSpan: 2,
                widthPct: 70,
              }),
            ],
          }),
        ],
      })
    : new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            cantSplit: true,
            children: [
              cell([pText('TIPOLOGIA', { bold: true, color: accentHex })], { widthPct: 26 }),
              cell(checkboxListParagraphs(tipologieOpts, plan.situazione.tipologie, true), {
                widthPct: 74,
              }),
            ],
          }),
          new TableRow({
            cantSplit: true,
            children: [
              cell([pText('LIVELLO', { bold: true, color: accentHex })], { widthPct: 26 }),
              cell(checkboxListParagraphs(livelloOpts, [plan.situazione.livello], true), {
                widthPct: 74,
              }),
            ],
          }),
          new TableRow({
            cantSplit: true,
            children: [
              cell(
                [
                  pText('MEZZI UTILIZZATI PER INDIVIDUARE LE RISORSE ED I BISOGNI DEGLI ALUNNI', {
                    bold: true,
                    color: accentHex,
                  }),
                ],
                { widthPct: 26 }
              ),
              cell(checkboxListParagraphs(mezziOpts, plan.situazione.mezziIndividuazione, false), {
                widthPct: 74,
              }),
            ],
          }),
        ],
      });

  const buildBandNamesCell = (names: string[]) => {
    if (!bandStudents.hasAnyImportedStudents) {
      return [pText(' ', { spaceAfter: 240 })];
    }
    if (names.length === 0) {
      return [pText(' ', { spaceAfter: 40 })];
    }
    return names.map((name) => pText(name, { size: 18, spaceBefore: 10, spaceAfter: 15 }));
  };

  const livelliTable = isOriginal
    ? new Table({
        width: { size: 92, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            cantSplit: true,
            children: [
              cell(
                [
                  pText('Livello basso', { bold: true, spaceBefore: 10, spaceAfter: 10 }),
                  pText('(voti inferiori alla sufficienza)', { size: 18, spaceBefore: 0, spaceAfter: 40 }),
                  pText(`Alunni: ${plan.analisiPartenza.livelli.bassoAlunni}`, {
                    bold: true,
                    spaceBefore: 20,
                    spaceAfter: 40,
                  }),
                ],
                { widthPct: 25 }
              ),
              cell(
                [
                  pText('Livello medio/basso', { bold: true, spaceBefore: 10, spaceAfter: 10 }),
                  pText('(voto 6)', { size: 18, spaceBefore: 0, spaceAfter: 40 }),
                  pText(`Alunni: ${plan.analisiPartenza.livelli.medioBassoAlunni}`, {
                    bold: true,
                    spaceBefore: 20,
                    spaceAfter: 40,
                  }),
                ],
                { widthPct: 25 }
              ),
              cell(
                [
                  pText('Livello medio', { bold: true, spaceBefore: 10, spaceAfter: 10 }),
                  pText('(voti 7/8)', { size: 18, spaceBefore: 0, spaceAfter: 40 }),
                  pText(`Alunni: ${plan.analisiPartenza.livelli.medioAlunni}`, {
                    bold: true,
                    spaceBefore: 20,
                    spaceAfter: 40,
                  }),
                ],
                { widthPct: 25 }
              ),
              cell(
                [
                  pText('Livello alto', { bold: true, spaceBefore: 10, spaceAfter: 10 }),
                  pText('(voti 9/ 10)', { size: 18, spaceBefore: 0, spaceAfter: 40 }),
                  pText(`Alunni: ${plan.analisiPartenza.livelli.altoAlunni}`, {
                    bold: true,
                    spaceBefore: 20,
                    spaceAfter: 40,
                  }),
                ],
                { widthPct: 25 }
              ),
            ],
          }),
          new TableRow({
            children: [
              cell(buildBandNamesCell(bandStudents.bands.basso), { widthPct: 25 }),
              cell(buildBandNamesCell(bandStudents.bands.medio_basso), { widthPct: 25 }),
              cell(buildBandNamesCell(bandStudents.bands.medio), { widthPct: 25 }),
              cell(buildBandNamesCell(bandStudents.bands.alto), { widthPct: 25 }),
            ],
          }),
        ],
      })
    : new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            cantSplit: true,
            tableHeader: true,
            children: [
              cell([headerCellText('Livello basso (voti < 6)')], { header: true, widthPct: 25 }),
              cell([headerCellText('Livello medio/basso (voto 6)')], { header: true, widthPct: 25 }),
              cell([headerCellText('Livello medio (voti 7/8)')], { header: true, widthPct: 25 }),
              cell([headerCellText('Livello alto (voti 9/10)')], { header: true, widthPct: 25 }),
            ],
          }),
          new TableRow({
            cantSplit: true,
            children: [
              cell([pText(`Alunni: ${plan.analisiPartenza.livelli.bassoAlunni}`, { align: AlignmentType.CENTER })]),
              cell([pText(`Alunni: ${plan.analisiPartenza.livelli.medioBassoAlunni}`, { align: AlignmentType.CENTER })]),
              cell([pText(`Alunni: ${plan.analisiPartenza.livelli.medioAlunni}`, { align: AlignmentType.CENTER })]),
              cell([pText(`Alunni: ${plan.analisiPartenza.livelli.altoAlunni}`, { align: AlignmentType.CENTER })]),
            ],
          }),
          new TableRow({
            children: [
              cell(buildBandNamesCell(bandStudents.bands.basso), { widthPct: 25 }),
              cell(buildBandNamesCell(bandStudents.bands.medio_basso), { widthPct: 25 }),
              cell(buildBandNamesCell(bandStudents.bands.medio), { widthPct: 25 }),
              cell(buildBandNamesCell(bandStudents.bands.alto), { widthPct: 25 }),
            ],
          }),
        ],
      });

  const resolvedCompetenze = plan.curricolo.competenzeAttese.length
    ? plan.curricolo.competenzeAttese
    : (plan.curricolo.vociCatalogoImportate ?? [])
        .filter((v) => v.tipo === 'competenza' && v.testo.trim())
        .map((v) => v.testo.trim());

  const normalizedCompetenzeItems = resolvedCompetenze.flatMap((c) =>
    extractNormalizedBulletEntries(c)
  );
  const normalizedCompetenzeDigitaliItems = plan.curricolo.competenzeDigitali.flatMap((c) =>
    extractNormalizedBulletEntries(c)
  );

  const curricoloCatalogParagraphs: Paragraph[] = [
    ...(normalizedCompetenzeItems.length
      ? [
          pText('Competenze:', { bold: true, color: accentHex, spaceBefore: 30, keepNext: true }),
          ...normalizedCompetenzeItems.map((c) => pText(`• ${c}`, { spaceAfter: 20 })),
        ]
      : []),
    ...(normalizedCompetenzeDigitaliItems.length
      ? [
          pText('Competenze digitali:', {
            bold: true,
            color: accentHex,
            spaceBefore: 30,
            keepNext: true,
          }),
          ...normalizedCompetenzeDigitaliItems.map((c) => pText(`• ${c}`, { spaceAfter: 20 })),
        ]
      : []),
  ];

  const leftCurricoloHeader =
    (plan.curricolo.indicazioniVersione ?? 'vecchie') === 'nuove' ? 'OBIETTIVI' : 'ABILITÀ';
  const notaIntroCurricolo = getCurricoloIntroNoteText(
    plan.curricolo.notaIntroduttiva,
    plan.curricolo.indicazioniVersione
  );

  const renderCurricoloCellParagraphs = (text: string, nucleoHint?: string) => {
    const formattedLines = formatCurricoloCellLines(text, nucleoHint);
    if (formattedLines.length === 0) return [pText('—')];
    return formattedLines.map((item) =>
      pText(item.text, {
        bold: item.isNucleoTitle,
        spaceAfter: item.isNucleoTitle ? 25 : 20,
      })
    );
  };

  const curricoloSectionBlocks: (Paragraph | Table)[] = isOriginal
    ? [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                cell(
                  [
                    new Paragraph({
                      alignment: AlignmentType.JUSTIFIED,
                      spacing: { before: 80, after: 80 },
                      children: [
                        new TextRun({
                          text: 'TRAGUARDI PER LO SVILUPPO DELLE COMPETENZE',
                          font,
                          size: 20,
                          bold: true,
                          shading: { type: ShadingType.CLEAR, fill: 'E6E6E6', color: 'auto' },
                          color: '000000',
                        }),
                        new TextRun({
                          text: ' IN RELAZIONE AL CURRICOLO VERTICALE DEL NOSTRO ISTITUTO',
                          font,
                          size: 20,
                          bold: true,
                          color: '000000',
                        }),
                      ],
                    }),
                    ...curricoloCatalogParagraphs,
                  ],
                  { columnSpan: 2, widthPct: 100 }
                ),
              ],
            }),
            new TableRow({
              children: [
                cell(
                  [
                    pText(notaIntroCurricolo, {
                      italic: true,
                      align: AlignmentType.JUSTIFIED,
                      spaceBefore: 40,
                      spaceAfter: 40,
                    }),
                  ],
                  { columnSpan: 2, widthPct: 100 }
                ),
              ],
            }),
            new TableRow({
              children: [
                cell([headerCellText(leftCurricoloHeader, true, 'E6E6E6', false)], {
                  header: true,
                  widthPct: 50,
                }),
                cell([headerCellText('CONOSCENZE', true, 'E6E6E6', false)], {
                  header: true,
                  widthPct: 50,
                }),
              ],
            }),
            ...(plan.curricolo.righeAbilitaConoscenze.length
              ? plan.curricolo.righeAbilitaConoscenze.map(
                  (row) =>
                    new TableRow({
                      children: [
                        cell(renderCurricoloCellParagraphs(row.abilita, row.traguardo), {
                          widthPct: 50,
                        }),
                        cell(renderCurricoloCellParagraphs(row.conoscenze, row.traguardo), {
                          widthPct: 50,
                        }),
                      ],
                    })
                )
              : [
                  new TableRow({
                    children: [
                      cell([pText(' ', { spaceAfter: 360 })], { widthPct: 50 }),
                      cell([pText(' ', { spaceAfter: 360 })], { widthPct: 50 }),
                    ],
                  }),
                ]),
          ],
        }),
        ...(plan.curricolo.attivitaProgrammate.trim()
          ? [
              pText('Attività programmate:', { bold: true, spaceBefore: 100, keepNext: true }),
              ...pMultiLine(plan.curricolo.attivitaProgrammate, { align: AlignmentType.JUSTIFIED }),
            ]
          : []),
      ]
    : [
        sectionBanner(
          'TRAGUARDI PER LO SVILUPPO DELLE COMPETENZE IN RELAZIONE AL CURRICOLO VERTICALE DEL NOSTRO ISTITUTO',
          { boxed: false }
        ),
        ...curricoloCatalogParagraphs,
        pText(notaIntroCurricolo, { italic: true, spaceBefore: 40 }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              tableHeader: true,
              children: [
                cell([headerCellText(leftCurricoloHeader, false, undefined, false)], {
                  header: true,
                  widthPct: 50,
                }),
                cell([headerCellText('CONOSCENZE', false, undefined, false)], {
                  header: true,
                  widthPct: 50,
                }),
              ],
            }),
            ...(plan.curricolo.righeAbilitaConoscenze.length
              ? plan.curricolo.righeAbilitaConoscenze.map(
                  (row) =>
                    new TableRow({
                      children: [
                        cell(renderCurricoloCellParagraphs(row.abilita, row.traguardo), {
                          widthPct: 50,
                        }),
                        cell(renderCurricoloCellParagraphs(row.conoscenze, row.traguardo), {
                          widthPct: 50,
                        }),
                      ],
                    })
                )
              : [
                  new TableRow({
                    children: [
                      cell([pText('Nessuna voce inserita.', { italic: true })]),
                      cell([pText('Nessuna conoscenza inserita.', { italic: true })]),
                    ],
                  }),
                ]),
          ],
        }),
        ...(plan.curricolo.attivitaProgrammate.trim()
          ? [
              pText('Attività programmate:', { bold: true, color: accentHex, spaceBefore: 100, keepNext: true }),
              ...pMultiLine(plan.curricolo.attivitaProgrammate),
            ]
          : []),
      ];

  const docChildren: (Paragraph | Table)[] = [
    ...institutionHeaderBlocks,
    ...titleAndMetadataBlocks,

    // COMPOSIZIONE DELLA CLASSE
    sectionBanner('COMPOSIZIONE DELLA CLASSE', { highlightE6: isOriginal }),
    composizioneTable,

    // SITUAZIONE DELLA CLASSE
    sectionBanner('SITUAZIONE DELLA CLASSE', { highlightE6: isOriginal }),
    situazioneTable,

    // ANALISI DELLA SITUAZIONE DI PARTENZA
    sectionBanner('ANALISI DELLA SITUAZIONE DI PARTENZA', { center: false }),
    ...(isOriginal
      ? [
          new Paragraph({
            keepNext: true,
            spacing: { before: 20, after: 70 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: '000000' } },
            children: [
              new TextRun({
                text: 'SITUAZIONE DI PARTENZA DEGLI ALUNNI IN RELAZIONE ALLA DISCIPLINA',
                font,
                size: bodySize,
                shading: { type: ShadingType.CLEAR, fill: 'E6E6E6', color: 'auto' },
                color: '000000',
              }),
              new TextRun({ text: ':', font, size: bodySize, color: '000000' }),
            ],
          }),
          ...(unifiedClassDescription
            ? pMultiLine(`1. ${unifiedClassDescription}`, {
                align: AlignmentType.JUSTIFIED,
                spaceAfter: 80,
              })
            : blankRuleParagraphs(5, 80)),
          pText('2. Livelli di partenza rilevati', { bold: true, spaceBefore: 60, spaceAfter: 60, keepNext: true }),
        ]
      : [
          pText('SITUAZIONE DI PARTENZA DEGLI ALUNNI IN RELAZIONE ALLA DISCIPLINA:', {
            bold: true,
            color: accentHex,
            keepNext: true,
          }),
          ...pMultiLine(
            unifiedClassDescription ||
              `${compositionIntro} Descrizione sintetica non ancora compilata.`,
            { spaceAfter: 100 }
          ),
          pText(
            bandStudents.hasAnyImportedStudents
              ? 'Livelli di partenza rilevati:'
              : 'Livelli di partenza rilevati (conteggi aggregati):',
            {
              bold: true,
              color: accentHex,
              keepNext: true,
            }
          ),
        ]),
    livelliTable,

    // FONTI DI RILEVAZIONE DEI DATI
    pText('FONTI DI RILEVAZIONE DEI DATI', {
      bold: true,
      color: accentHex,
      spaceBefore: 120,
      spaceAfter: 40,
      keepNext: true,
    }),
    ...checkboxListParagraphs(fontiOpts, plan.analisiPartenza.fontiRilevazione, false),
    pText(
      `${checkboxPrefix(Boolean(plan.analisiPartenza.altraFonte.trim()), mapping)} altro: ${
        plan.analisiPartenza.altraFonte.trim() || '____________________________________________'
      }`,
      { italic: Boolean(plan.analisiPartenza.altraFonte.trim()), spaceAfter: 100 }
    ),

    // STRATEGIE ED INTERVENTI
    sectionBanner(
      'STRATEGIE ED INTERVENTI PER IL POTENZIAMENTO, IL CONSOLIDAMENTO ED IL RECUPERO',
      { boxed: isOriginal }
    ),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          cantSplit: true,
          tableHeader: true,
          children: [
            cell([headerCellText(isOriginal ? 'Gruppi di livello' : 'Gruppo di livello', isOriginal)], {
              header: true,
              widthPct: 24,
              fillHex: isOriginal ? 'F3F3F3' : undefined,
            }),
            cell(
              [
                headerCellText(
                  isOriginal
                    ? 'STRATEGIE DA UTILIZZARE (segnare con la x)'
                    : 'Strategie e interventi selezionati',
                  isOriginal
                ),
              ],
              { header: true, widthPct: 76, fillHex: isOriginal ? 'F3F3F3' : undefined }
            ),
          ],
        }),
        new TableRow({
          cantSplit: true,
          children: [
            cell([pText('POTENZIAMENTO', { bold: !isOriginal, color: accentHex })], {
              vAlign: VerticalAlign.CENTER,
            }),
            cell([
              ...checkboxListParagraphs(
                STRATEGIE_POTENZIAMENTO_OPTIONS,
                plan.interventi.potenziamento,
                false
              ),
              pText(
                `${checkboxPrefix(Boolean(plan.interventi.potenziamentoAltro.trim()), mapping)} Altro: ${
                  plan.interventi.potenziamentoAltro.trim() ||
                  '________________________________________________'
                }`,
                { italic: Boolean(plan.interventi.potenziamentoAltro.trim()) }
              ),
            ]),
          ],
        }),
        new TableRow({
          cantSplit: true,
          children: [
            cell([pText('CONSOLIDAMENTO', { bold: !isOriginal, color: accentHex })], {
              vAlign: VerticalAlign.CENTER,
            }),
            cell([
              ...checkboxListParagraphs(
                STRATEGIE_CONSOLIDAMENTO_OPTIONS,
                plan.interventi.consolidamento,
                false
              ),
              pText(
                `${checkboxPrefix(Boolean(plan.interventi.consolidamentoAltro.trim()), mapping)} Altro: ${
                  plan.interventi.consolidamentoAltro.trim() ||
                  '________________________________________________'
                }`,
                { italic: Boolean(plan.interventi.consolidamentoAltro.trim()) }
              ),
            ]),
          ],
        }),
        new TableRow({
          cantSplit: true,
          children: [
            cell([pText('RECUPERO', { bold: !isOriginal, color: accentHex })], {
              vAlign: VerticalAlign.CENTER,
            }),
            cell([
              ...checkboxListParagraphs(
                STRATEGIE_RECUPERO_OPTIONS,
                plan.interventi.recupero,
                false
              ),
              pText(
                `${checkboxPrefix(Boolean(plan.interventi.recuperoAltro.trim()), mapping)} Altro: ${
                  plan.interventi.recuperoAltro.trim() ||
                  '________________________________________________'
                }`,
                { italic: Boolean(plan.interventi.recuperoAltro.trim()) }
              ),
            ]),
          ],
        }),
        ...(isOriginal
          ? []
          : [
              new TableRow({
                cantSplit: true,
                children: [
                  cell([pText('Alunni con BES e interventi programmati', { bold: true, color: accentHex })]),
                  cell(
                    pMultiLine(
                      plan.interventi.besInterventiProgrammati.trim() ||
                        'Nessun intervento aggiuntivo specificato (riferimento esclusivo a PDP/PEI in forma anonima).',
                      { spaceAfter: 40 }
                    )
                  ),
                ],
              }),
            ]),
      ],
    }),
    ...(isOriginal
      ? [
          pText('Alunni con BES e interventi programmati', {
            bold: true,
            spaceBefore: 140,
            spaceAfter: 50,
            keepNext: true,
          }),
          ...(plan.interventi.besInterventiProgrammati.trim()
            ? pMultiLine(plan.interventi.besInterventiProgrammati.trim(), {
                align: AlignmentType.JUSTIFIED,
                spaceAfter: 100,
              })
            : blankRuleParagraphs(4, 100)),
        ]
      : []),

    // TRAGUARDI / COMPETENZE / ABILITÀ / CONOSCENZE
    ...curricoloSectionBlocks,

    // CRITERI METODOLOGICI
    sectionBanner('CRITERI METODOLOGICI, STRATEGIE, STRUMENTI:', {
      underlined: isOriginal,
      highlightE6: isOriginal,
      center: isOriginal,
    }),
    ...pMultiLine(plan.metodiStrumenti.premessaMetodologica, {
      align: isOriginal ? AlignmentType.JUSTIFIED : AlignmentType.LEFT,
      spaceAfter: 80,
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          cantSplit: true,
          tableHeader: true,
          children: [
            cell([headerCellText('METODI', isOriginal)], {
              header: true,
              widthPct: 52,
              fillHex: isOriginal ? 'E6E6E6' : undefined,
            }),
            cell([headerCellText('MEZZI E STRUMENTI', isOriginal)], {
              header: true,
              widthPct: 48,
              fillHex: isOriginal ? 'E6E6E6' : undefined,
            }),
          ],
        }),
        new TableRow({
          cantSplit: true,
          children: [
            cell([
              ...checkboxListParagraphs(METODI_OPTIONS, plan.metodiStrumenti.metodi, false),
              pText(
                `ALTRE METODOLOGIE (Brainstorming; Problem solving; Ricerca-azione; Discussione; Role play): ${
                  plan.metodiStrumenti.altreMetodologie.trim() ||
                  '___________________________________________________'
                }`,
                {
                  italic: Boolean(plan.metodiStrumenti.altreMetodologie.trim()),
                  spaceBefore: 80,
                }
              ),
            ]),
            cell([
              ...checkboxListParagraphs(
                MEZZI_STRUMENTI_OPTIONS,
                plan.metodiStrumenti.mezziEStrumenti,
                false
              ),
              pText(
                `ALTRI SUSSIDI:\n${
                  plan.metodiStrumenti.altriSussidi.trim() || '__________________________'
                }`,
                {
                  italic: Boolean(plan.metodiStrumenti.altriSussidi.trim()),
                  spaceBefore: 80,
                }
              ),
            ]),
          ],
        }),
      ],
    }),

    pText('AUSILI DIDATTICI', {
      bold: true,
      color: accentHex,
      spaceBefore: 120,
      spaceAfter: 20,
      keepNext: true,
    }),
    ...(isOriginal
      ? [
          pText('(Libri di testo, eventuali sussidi o testi di approfondimento, strumenti vari…)', {
            size: 19,
            spaceBefore: 0,
            spaceAfter: 40,
            keepNext: true,
          }),
        ]
      : []),
    ...(plan.metodiStrumenti.ausiliDidattici.trim()
      ? pMultiLine(plan.metodiStrumenti.ausiliDidattici, {
          align: isOriginal ? AlignmentType.JUSTIFIED : AlignmentType.LEFT,
          spaceAfter: 80,
        })
      : blankRuleParagraphs(3, 80)),

    pText('DIDATTICA DIGITALE INTEGRATA', {
      bold: true,
      color: accentHex,
      spaceBefore: 80,
      spaceAfter: 30,
      keepNext: true,
    }),
    ...pMultiLine(plan.metodiStrumenti.didatticaDigitaleIntegrata, {
      align: isOriginal ? AlignmentType.JUSTIFIED : AlignmentType.LEFT,
      spaceAfter: 100,
    }),

    // PAGE 4: VERIFICHE IN ITINERE: MODALITÀ + VALUTAZIONE + FIRMA
    ...(isOriginal
      ? [
          new Paragraph({
            pageBreakBefore: true,
            spacing: { before: 0, after: 0 },
            children: [],
          }),
        ]
      : [sectionBanner('VERIFICHE IN ITINERE: MODALITÀ')]),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        ...(isOriginal
          ? [
              new TableRow({
                cantSplit: true,
                tableHeader: true,
                children: [
                  cell([headerCellText('VERIFICHE IN ITINERE: MODALITÀ', true)], {
                    header: true,
                    columnSpan: 2,
                    widthPct: 100,
                  }),
                ],
              }),
            ]
          : []),
        new TableRow({
          cantSplit: true,
          tableHeader: true,
          children: [
            cell([headerCellText('SCRITTA', isOriginal)], { header: true, widthPct: 50 }),
            cell([headerCellText('ORALE', isOriginal)], { header: true, widthPct: 50 }),
          ],
        }),
        new TableRow({
          cantSplit: true,
          children: [
            cell(
              checkboxListParagraphs(
                VERIFICHE_SCRITTE_OPTIONS,
                plan.verificheValutazione.verificheScritte,
                false
              ),
              { widthPct: 50 }
            ),
            cell(
              [
                ...checkboxListParagraphs(
                  VERIFICHE_ORALI_OPTIONS,
                  plan.verificheValutazione.verificheOrali,
                  false
                ),
                pText('ALTRI TIPI DI PROVE:', {
                  spaceBefore: 100,
                  spaceAfter: 20,
                }),
                ...pMultiLine(
                  plan.verificheValutazione.altriTipiProve.trim() || '_______________________________',
                  {
                    italic: Boolean(plan.verificheValutazione.altriTipiProve.trim()),
                    spaceAfter: 40,
                  }
                ),
              ],
              { widthPct: 50 }
            ),
          ],
        }),
      ],
    }),

    // VALUTAZIONE & FIRMA
    pText('VALUTAZIONE', {
      bold: true,
      color: accentHex,
      spaceBefore: 180,
      spaceAfter: 60,
      keepNext: true,
    }),
    ...pMultiLine(plan.verificheValutazione.criteriValutazione, {
      align: isOriginal ? AlignmentType.JUSTIFIED : AlignmentType.LEFT,
      line: isOriginal ? 360 : undefined,
      spaceAfter: 60,
    }),
    ...firmaDocente.split(/\r?\n/).map(
      (lineText, idx, arr) =>
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          keepNext: idx < arr.length - 1 ? true : undefined,
          spacing: {
            before: idx === 0 ? 280 : 0,
            after: idx === arr.length - 1 ? 60 : 20,
          },
          children: [
            new TextRun({
              text: lineText,
              font,
              size: bodySize,
              bold: !isOriginal ? true : undefined,
              color: accentHex,
            }),
          ],
        })
    ),
  ];

  return new Document({
    creator: 'PIANORAMA',
    title: `Programmazione Disciplinare - ${plan.datiGenerali.disciplina} ${plan.datiGenerali.classe}${plan.datiGenerali.sezione}`,
    description: 'Documento generato localmente e offline con PIANORAMA',
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11906,
              height: 16838,
            },
            margin: isOriginal
              ? {
                  top: 850,
                  bottom: 1134,
                  left: 900,
                  right: 1134,
                }
              : {
                  top: 900,
                  bottom: 900,
                  left: 950,
                  right: 950,
                },
          },
        },
        children: docChildren,
      },
    ],
  });
}

export async function generateProgrammazioneDocxBytes(
  plan: Programmazione,
  settings: SchoolSettings,
  mapping: DocxMappingSchema
): Promise<Uint8Array> {
  const doc = createProgrammazioneDocument(plan, settings, mapping);
  const arrayBuffer = await Packer.toArrayBuffer(doc);
  return new Uint8Array(arrayBuffer);
}

export async function downloadProgrammazioneDocx(
  plan: Programmazione,
  settings: SchoolSettings,
  mapping: DocxMappingSchema
): Promise<string> {
  const bytes = await generateProgrammazioneDocxBytes(plan, settings, mapping);
  const blob = new Blob([bytes.buffer as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  const url = URL.createObjectURL(blob);
  const filename = buildDocxFilename(plan, 'docx');
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return filename;
}
