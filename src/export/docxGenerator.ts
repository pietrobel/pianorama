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
  WidthType,
} from 'docx';
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
  if (bracket) return checked ? '[X]' : '[ ]';
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
  const docenteConTitolo = formatDocenteConTitolo(plan.datiGenerali.docente, docenteGenere);
  const firmaDocente = formatFirmaDocente(
    plan.verificheValutazione.firmaDocente || plan.datiGenerali.docente,
    docenteGenere
  );

  const font = isOriginal ? 'Times New Roman' : mapping.typography.fontFamily || 'Garamond';
  const accentHex = isOriginal
    ? '000000'
    : cleanColorHex(mapping.typography.headingColorHex || '1F3864');
  const bodySize = (mapping.typography.bodySizePt || 11) * 2;
  const headingSize = (mapping.typography.headingSizePt || 13) * 2;
  const borders = isOriginal ? makeBorder('000000', 8) : makeBorder('B8C4D4', 6);
  const headerBorders = isOriginal ? makeBorder('000000', 8) : makeBorder(accentHex, 6);

  const pText = (
    text: string,
    opts?: {
      bold?: boolean;
      italic?: boolean;
      underline?: boolean;
      size?: number;
      color?: string;
      align?: (typeof AlignmentType)[keyof typeof AlignmentType];
      spaceAfter?: number;
      spaceBefore?: number;
    }
  ) =>
    new Paragraph({
      alignment: opts?.align ?? AlignmentType.LEFT,
      spacing: {
        before: opts?.spaceBefore ?? 40,
        after: opts?.spaceAfter ?? 80,
      },
      children: [
        new TextRun({
          text,
          font,
          size: opts?.size ?? bodySize,
          bold: opts?.bold,
          italics: opts?.italic,
          underline: opts?.underline ? {} : undefined,
          color: opts?.color ?? (isOriginal ? '000000' : '1E293B'),
        }),
      ],
    });

  const sectionBanner = (title: string, opts?: { boxed?: boolean; underlined?: boolean }) =>
    new Paragraph({
      alignment: isOriginal ? AlignmentType.CENTER : AlignmentType.LEFT,
      spacing: { before: 220, after: 100 },
      border: opts?.boxed
        ? {
            top: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
            bottom: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
            left: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
            right: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
          }
        : isOriginal
        ? undefined
        : {
            bottom: { style: BorderStyle.SINGLE, size: 12, color: accentHex },
          },
      children: [
        new TextRun({
          text: title,
          font,
          size: headingSize,
          bold: true,
          underline: opts?.underlined ? {} : undefined,
          color: accentHex,
        }),
      ],
    });

  const cell = (
    children: Paragraph[],
    opts?: { widthPct?: number; header?: boolean; columnSpan?: number }
  ) =>
    new TableCell({
      columnSpan: opts?.columnSpan,
      width: opts?.widthPct
        ? { size: opts.widthPct, type: WidthType.PERCENTAGE }
        : undefined,
      shading:
        opts?.header && !isOriginal
          ? { type: ShadingType.CLEAR, fill: accentHex, color: 'auto' }
          : undefined,
      margins: { top: 80, bottom: 80, left: 110, right: 110 },
      borders: opts?.header ? headerBorders : borders,
      children,
    });

  const headerCellText = (label: string, center = true) =>
    pText(label, {
      bold: true,
      color: isOriginal ? '000000' : 'FFFFFF',
      align: center ? AlignmentType.CENTER : AlignmentType.LEFT,
      spaceBefore: 0,
      spaceAfter: 0,
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
          spacing: { before: 40, after: 60 },
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
        spacing: { before: 20, after: 40 },
        children: [
          new TextRun({
            text: `${checkboxPrefix(isChecked, mapping, bracket)} ${opt}`,
            font,
            size: bodySize,
            bold: isChecked,
            color: isChecked ? accentHex : isOriginal ? '000000' : '1E293B',
          }),
        ],
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
  const activeCharacteristics = getActiveDimensionsForDocument(
    plan.situazione.caratteristicheDimensioni,
    settings.soglieQuoteCaratteristiche
  );
  const compositionIntro = buildClassCompositionIntro(plan);

  const generalDataBlocks: (Paragraph | Table)[] = isOriginal
    ? [
        new Paragraph({
          spacing: { before: 40, after: 40 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' } },
          children: [
            new TextRun({
              text: `SCUOLA ${plan.datiGenerali.scuola}`,
              font,
              size: bodySize,
              bold: true,
              color: '000000',
            }),
          ],
        }),
        new Paragraph({
          spacing: { before: 40, after: 80 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' } },
          children: [
            new TextRun({
              text: `PLESSO DI ${plan.datiGenerali.plesso}`,
              font,
              size: bodySize,
              bold: true,
              color: '000000',
            }),
          ],
        }),
        pText(
          `ANNO SCOLASTICO: ${plan.datiGenerali.annoScolastico}      CLASSE: ${plan.datiGenerali.classe} ${plan.datiGenerali.sezione}`,
          { bold: true, spaceAfter: 40 }
        ),
        pText(
          `DISCIPLINA: ${plan.datiGenerali.disciplina}      DOCENTE: ${docenteConTitolo}`,
          { bold: true, spaceAfter: 80 }
        ),
      ]
    : [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
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

  const situazioneTable = isOriginal
    ? new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              cell(
                [
                  pText('TIPOLOGIA', { bold: true, align: AlignmentType.CENTER, spaceAfter: 40 }),
                  ...checkboxListParagraphs(tipologieOpts, plan.situazione.tipologie, false, true),
                ],
                { widthPct: 50 }
              ),
              cell(
                [
                  pText('LIVELLO', { bold: true, align: AlignmentType.CENTER, spaceAfter: 40 }),
                  ...checkboxListParagraphs(livelloOpts, [plan.situazione.livello], false, false),
                ],
                { widthPct: 50 }
              ),
            ],
          }),
          new TableRow({
            children: [
              cell(
                [
                  pText('MEZZI UTILIZZATI PER INDIVIDUARE LE RISORSE ED I BISOGNI DEGLI ALUNNI:', {
                    bold: true,
                    spaceAfter: 40,
                  }),
                  ...checkboxListParagraphs(mezziOpts, plan.situazione.mezziIndividuazione, false),
                ],
                { columnSpan: 2, widthPct: 100 }
              ),
            ],
          }),
        ],
      })
    : new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              cell([pText('TIPOLOGIA', { bold: true, color: accentHex })], { widthPct: 26 }),
              cell(checkboxListParagraphs(tipologieOpts, plan.situazione.tipologie, true), {
                widthPct: 74,
              }),
            ],
          }),
          new TableRow({
            children: [
              cell([pText('LIVELLO', { bold: true, color: accentHex })], { widthPct: 26 }),
              cell(checkboxListParagraphs(livelloOpts, [plan.situazione.livello], true), {
                widthPct: 74,
              }),
            ],
          }),
          new TableRow({
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

  const docChildren: (Paragraph | Table)[] = [
    // Intestazione istituzionale
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
      color: isOriginal ? '000000' : '475569',
      align: AlignmentType.CENTER,
      spaceAfter: 20,
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 20, after: 180 },
      border: isOriginal
        ? { bottom: { style: BorderStyle.DOUBLE, size: 8, color: '000000' } }
        : { bottom: { style: BorderStyle.SINGLE, size: 12, color: accentHex } },
      children: [
        new TextRun({
          text: contactsText,
          font,
          size: 18,
          color: isOriginal ? '000000' : '475569',
        }),
      ],
    }),

    // Titolo documento
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

    ...generalDataBlocks,

    // COMPOSIZIONE DELLA CLASSE
    sectionBanner('COMPOSIZIONE DELLA CLASSE'),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            cell([headerCellText('Alunni')], { header: true, widthPct: 18 }),
            cell([headerCellText('Maschi')], { header: true, widthPct: 18 }),
            cell([headerCellText('Femmine')], { header: true, widthPct: 18 }),
            cell([headerCellText('Ripetenti')], { header: true, widthPct: 18 }),
            cell([headerCellText('Con Bisogni Educativi Speciali (BES)')], {
              header: true,
              widthPct: 28,
            }),
          ],
        }),
        new TableRow({
          children: [
            cell([pText(String(plan.composizione.alunni), { align: AlignmentType.CENTER, bold: true })]),
            cell([pText(String(plan.composizione.maschi), { align: AlignmentType.CENTER })]),
            cell([pText(String(plan.composizione.femmine), { align: AlignmentType.CENTER })]),
            cell([pText(String(plan.composizione.ripetenti), { align: AlignmentType.CENTER })]),
            cell([pText(String(plan.composizione.bes), { align: AlignmentType.CENTER, bold: true })]),
          ],
        }),
      ],
    }),

    // SITUAZIONE DELLA CLASSE
    sectionBanner('SITUAZIONE DELLA CLASSE'),
    situazioneTable,
    pText('Presentazione e caratteristiche della classe:', {
      bold: true,
      color: accentHex,
      spaceBefore: 100,
      spaceAfter: 40,
    }),
    pText(compositionIntro, { spaceAfter: 60 }),
    ...activeCharacteristics.map(
      (item) =>
        new Paragraph({
          spacing: { before: 20, after: 60 },
          children: [
            new TextRun({
              text: `${item.nome}: `,
              font,
              size: bodySize,
              bold: true,
              color: accentHex,
            }),
            new TextRun({
              text: item.testo,
              font,
              size: bodySize,
              color: isOriginal ? '000000' : '1E293B',
            }),
          ],
        })
    ),

    // ANALISI DELLA SITUAZIONE DI PARTENZA
    sectionBanner('ANALISI DELLA SITUAZIONE DI PARTENZA'),
    pText('SITUAZIONE DI PARTENZA DEGLI ALUNNI IN RELAZIONE ALLA DISCIPLINA:', {
      bold: true,
      color: accentHex,
    }),
    pText(
      plan.analisiPartenza.descrizioneDisciplinare.trim() ||
        `${compositionIntro} Descrizione sintetica non ancora compilata.`,
      { spaceAfter: 100 }
    ),
    pText('Livelli di partenza rilevati (conteggi aggregati):', { bold: true, color: accentHex }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            cell([headerCellText('Livello basso (voti < 6)')], { header: true, widthPct: 25 }),
            cell([headerCellText('Livello medio/basso (voto 6)')], { header: true, widthPct: 25 }),
            cell([headerCellText('Livello medio (voti 7/8)')], { header: true, widthPct: 25 }),
            cell([headerCellText('Livello alto (voti 9/10)')], { header: true, widthPct: 25 }),
          ],
        }),
        new TableRow({
          children: [
            cell([pText(`Alunni: ${plan.analisiPartenza.livelli.bassoAlunni}`, { align: AlignmentType.CENTER })]),
            cell([pText(`Alunni: ${plan.analisiPartenza.livelli.medioBassoAlunni}`, { align: AlignmentType.CENTER })]),
            cell([pText(`Alunni: ${plan.analisiPartenza.livelli.medioAlunni}`, { align: AlignmentType.CENTER })]),
            cell([pText(`Alunni: ${plan.analisiPartenza.livelli.altoAlunni}`, { align: AlignmentType.CENTER })]),
          ],
        }),
      ],
    }),
    pText('FONTI DI RILEVAZIONE DEI DATI:', { bold: true, color: accentHex, spaceBefore: 120 }),
    ...checkboxListParagraphs(fontiOpts, plan.analisiPartenza.fontiRilevazione, false),
    ...(plan.analisiPartenza.altraFonte.trim()
      ? [pText(`Altro: ${plan.analisiPartenza.altraFonte}`, { italic: true })]
      : []),

    // STRATEGIE ED INTERVENTI
    sectionBanner(
      'STRATEGIE ED INTERVENTI PER IL POTENZIAMENTO, IL CONSOLIDAMENTO ED IL RECUPERO',
      { boxed: isOriginal }
    ),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            cell([headerCellText(isOriginal ? 'Gruppi di livello' : 'Gruppo di livello', false)], {
              header: true,
              widthPct: 25,
            }),
            cell(
              [
                headerCellText(
                  isOriginal ? 'STRATEGIE DA UTILIZZARE' : 'Strategie e interventi selezionati',
                  false
                ),
              ],
              { header: true, widthPct: 75 }
            ),
          ],
        }),
        new TableRow({
          children: [
            cell([pText('POTENZIAMENTO', { bold: true, color: accentHex })]),
            cell([
              ...checkboxListParagraphs(
                STRATEGIE_POTENZIAMENTO_OPTIONS,
                plan.interventi.potenziamento,
                false
              ),
              ...(plan.interventi.potenziamentoAltro.trim()
                ? [pText(`Altro: ${plan.interventi.potenziamentoAltro}`, { italic: true })]
                : []),
            ]),
          ],
        }),
        new TableRow({
          children: [
            cell([pText('CONSOLIDAMENTO', { bold: true, color: accentHex })]),
            cell([
              ...checkboxListParagraphs(
                STRATEGIE_CONSOLIDAMENTO_OPTIONS,
                plan.interventi.consolidamento,
                false
              ),
              ...(plan.interventi.consolidamentoAltro.trim()
                ? [pText(`Altro: ${plan.interventi.consolidamentoAltro}`, { italic: true })]
                : []),
            ]),
          ],
        }),
        new TableRow({
          children: [
            cell([pText('RECUPERO', { bold: true, color: accentHex })]),
            cell([
              ...checkboxListParagraphs(
                STRATEGIE_RECUPERO_OPTIONS,
                plan.interventi.recupero,
                false
              ),
              ...(plan.interventi.recuperoAltro.trim()
                ? [pText(`Altro: ${plan.interventi.recuperoAltro}`, { italic: true })]
                : []),
            ]),
          ],
        }),
        new TableRow({
          children: [
            cell([pText('Alunni con BES e interventi programmati', { bold: true, color: accentHex })]),
            cell([
              pText(
                plan.interventi.besInterventiProgrammati.trim() ||
                  'Nessun intervento aggiuntivo specificato (riferimento esclusivo a PDP/PEI in forma anonima).',
                { spaceAfter: 40 }
              ),
            ]),
          ],
        }),
      ],
    }),

    // TRAGUARDI / COMPETENZE / ABILITÀ / CONOSCENZE (3 COLONNE)
    sectionBanner(
      'TRAGUARDI PER LO SVILUPPO DELLE COMPETENZE IN RELAZIONE AL CURRICOLO VERTICALE DEL NOSTRO ISTITUTO',
      { boxed: isOriginal }
    ),
    pText(plan.curricolo.notaIntroduttiva, { italic: true }),
    ...(plan.curricolo.competenzeAttese.length
      ? [
          pText('Traguardi e competenze attese:', { bold: true, color: accentHex }),
          ...plan.curricolo.competenzeAttese.map((c) => pText(`• ${c}`, { spaceAfter: 30 })),
        ]
      : []),
    ...(plan.curricolo.competenzeDigitali.length
      ? [
          pText('Competenze digitali (DigComp 2.2) e trasversali:', {
            bold: true,
            color: accentHex,
          }),
          ...plan.curricolo.competenzeDigitali.map((c) => pText(`• ${c}`, { spaceAfter: 30 })),
        ]
      : []),
    ...(plan.curricolo.vociCatalogoImportate?.some((v) => v.testo.trim())
      ? [
          pText('Voci importate dal Curricolo Verticale:', {
            bold: true,
            color: accentHex,
            spaceBefore: 80,
          }),
          ...CURRICOLO_TYPE_ORDER.flatMap((tipo) => {
            const list = (plan.curricolo.vociCatalogoImportate ?? []).filter(
              (v) => v.tipo === tipo && v.testo.trim()
            );
            if (!list.length) return [];
            return [
              pText(CURRICOLO_TYPE_LABELS[tipo], { bold: true, spaceAfter: 20 }),
              ...list.map((v) => {
                const nucleo = v.nucleoTematico ? `[${v.nucleoTematico}] ` : '';
                const origin =
                  v.classeOrigine !== plan.datiGenerali.classe
                    ? ` (Provenienza: Classe ${v.classeOrigine})`
                    : '';
                return pText(`• ${nucleo}${v.testo}${origin}`, { spaceAfter: 30 });
              }),
            ];
          }),
        ]
      : []),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            cell([headerCellText('COMPETENZE', false)], { header: true, widthPct: 34 }),
            cell([headerCellText('ABILITÀ / OBIETTIVI', false)], { header: true, widthPct: 33 }),
            cell([headerCellText('CONOSCENZE (CONTENUTI)', false)], { header: true, widthPct: 33 }),
          ],
        }),
        ...(plan.curricolo.righeAbilitaConoscenze.length
          ? plan.curricolo.righeAbilitaConoscenze.map(
              (row) =>
                new TableRow({
                  children: [
                    cell([pText(row.competenze || row.traguardo || '—')]),
                    cell([pText(row.abilita || '—')]),
                    cell([pText(row.conoscenze || '—')]),
                  ],
                })
            )
          : [
              new TableRow({
                children: [
                  cell([pText('Nessuna competenza inserita.', { italic: true })]),
                  cell([pText('Nessuna abilità inserita.', { italic: true })]),
                  cell([pText('Nessuna conoscenza inserita.', { italic: true })]),
                ],
              }),
            ]),
      ],
    }),
    ...(plan.curricolo.attivitaProgrammate.trim()
      ? [
          pText('Attività programmate:', { bold: true, color: accentHex, spaceBefore: 100 }),
          pText(plan.curricolo.attivitaProgrammate),
        ]
      : []),

    // CRITERI METODOLOGICI
    sectionBanner('CRITERI METODOLOGICI, STRATEGIE, STRUMENTI:', { underlined: isOriginal }),
    pText(plan.metodiStrumenti.premessaMetodologica),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            cell([headerCellText('METODI', false)], { header: true, widthPct: 48 }),
            cell([headerCellText('MEZZI E STRUMENTI', false)], { header: true, widthPct: 52 }),
          ],
        }),
        new TableRow({
          children: [
            cell([
              ...checkboxListParagraphs(METODI_OPTIONS, plan.metodiStrumenti.metodi, false),
              ...(plan.metodiStrumenti.altreMetodologie.trim()
                ? [pText(`Altre metodologie: ${plan.metodiStrumenti.altreMetodologie}`, { italic: true })]
                : []),
            ]),
            cell([
              ...checkboxListParagraphs(
                MEZZI_STRUMENTI_OPTIONS,
                plan.metodiStrumenti.mezziEStrumenti,
                false
              ),
              ...(plan.metodiStrumenti.altriSussidi.trim()
                ? [pText(`Altri sussidi: ${plan.metodiStrumenti.altriSussidi}`, { italic: true })]
                : []),
            ]),
          ],
        }),
      ],
    }),
    ...(plan.metodiStrumenti.ausiliDidattici.trim()
      ? [
          pText('AUSILI DIDATTICI:', { bold: true, color: accentHex, spaceBefore: 100 }),
          pText(plan.metodiStrumenti.ausiliDidattici),
        ]
      : []),
    pText('DIDATTICA DIGITALE INTEGRATA:', { bold: true, color: accentHex, spaceBefore: 100 }),
    pText(plan.metodiStrumenti.didatticaDigitaleIntegrata),

    // VERIFICHE IN ITINERE
    ...(isOriginal ? [] : [sectionBanner('VERIFICHE IN ITINERE: MODALITÀ')]),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        ...(isOriginal
          ? [
              new TableRow({
                children: [
                  cell([headerCellText('VERIFICHE IN ITINERE: MODALITÀ')], {
                    header: true,
                    columnSpan: 2,
                    widthPct: 100,
                  }),
                ],
              }),
            ]
          : []),
        new TableRow({
          children: [
            cell([headerCellText('SCRITTA', false)], { header: true, widthPct: 50 }),
            cell([headerCellText('ORALE', false)], { header: true, widthPct: 50 }),
          ],
        }),
        new TableRow({
          children: [
            cell(
              checkboxListParagraphs(
                VERIFICHE_SCRITTE_OPTIONS,
                plan.verificheValutazione.verificheScritte,
                false
              )
            ),
            cell([
              ...checkboxListParagraphs(
                VERIFICHE_ORALI_OPTIONS,
                plan.verificheValutazione.verificheOrali,
                false
              ),
              ...(!isOriginal && plan.verificheValutazione.altriTipiProve.trim()
                ? [pText(`Altri tipi di prove: ${plan.verificheValutazione.altriTipiProve}`, { italic: true })]
                : []),
            ]),
          ],
        }),
        ...(isOriginal && plan.verificheValutazione.altriTipiProve.trim()
          ? [
              new TableRow({
                children: [
                  cell(
                    [
                      pText(
                        `ALTRI TIPI DI PROVE: ${plan.verificheValutazione.altriTipiProve}`,
                        { bold: false }
                      ),
                    ],
                    { columnSpan: 2, widthPct: 100 }
                  ),
                ],
              }),
            ]
          : []),
      ],
    }),

    // VALUTAZIONE & FIRMA
    sectionBanner('VALUTAZIONE'),
    pText(plan.verificheValutazione.criteriValutazione),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 280, after: 60 },
      children: [
        new TextRun({
          text: firmaDocente,
          font,
          size: bodySize,
          bold: true,
          color: accentHex,
        }),
      ],
    }),
  ];

  return new Document({
    creator: 'PIANORAMA',
    title: `Programmazione Disciplinare - ${plan.datiGenerali.disciplina} ${plan.datiGenerali.classe}${plan.datiGenerali.sezione}`,
    description: 'Documento generato localmente e offline con PIANORAMA',
    sections: [
      {
        properties: {
          page: {
            margin: {
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
