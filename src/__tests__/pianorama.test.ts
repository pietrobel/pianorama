import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';
import defaultMappingRaw from '../data/defaultDocxMapping.json';
import defaultRulesRaw from '../data/defaultRules.json';
import { CURRICOLO_VERTICALE_SEED } from '../data/curricoloCatalogSeed';
import {
  DEFAULT_BES_INTERVENTI_TEXT,
  DEFAULT_SCHOOL_SETTINGS,
  DEFAULT_SOGLIE_FASCE,
  DEFAULT_SOGLIE_QUOTE_CARATTERISTICHE,
  DISCIPLINE_SECONDARIA,
  STRATEGIE_CONSOLIDAMENTO_OPTIONS,
  STRATEGIE_POTENZIAMENTO_OPTIONS,
  STRATEGIE_RECUPERO_OPTIONS,
  createDefaultClassDimensions,
  createEmptyProgrammazione,
  formatDocenteConTitolo,
  formatFirmaDocente,
  getCharacteristicsCatalogForDimension,
  getDefaultCurricoloForDisciplina,
  getDefaultMetodiStrumentiForDisciplina,
  getDefaultRilevazioneForDisciplina,
  getDefaultVerificheValutazioneForDisciplina,
} from '../domain/defaults';
import {
  sanitizePlanForOfficialExport,
  type ClassCharacteristicDimension,
  type DocxMappingSchema,
  type SuggestionRule,
} from '../domain/types';
import {
  createBackupEnvelope,
  decryptBackupEnvelope,
  parseBackupEnvelope,
} from '../crypto/backupCrypto';
import {
  STYLISTIC_VARIANTS_COUNT,
  addCharacteristicToDimension,
  adjustCharacteristicQuota,
  createCustomDimension,
  generateDimensionSentence,
  getActiveDimensionsForDocument,
  getEffectiveDimensionText,
  getPhraseVariantsCount,
  isDimensionAllNessuno,
  moveDimensionHandle,
  quotaPercentualeToExpression,
  reconcileDimensionsWithTotalStudents,
  removeCharacteristicFromDimension,
  setSegmentExactCount,
} from '../engine/classCharacteristicsEngine';
import {
  buildProgramRowsFromCatalogVoices,
  computeCatalogDiff,
  computePreselectedCatalogIds,
  filterCatalogEntries,
  groupCatalogEntries,
  importCatalogEntriesToVoices,
  isVoiceRestorable,
  reorderImportedVoices,
  restoreVoiceFromCatalog,
  validateCatalogJsonPayload,
} from '../engine/curricoloCatalogEngine';
import { importProgrammazioneFromBuffer } from '../engine/documentPlanImporter';
import {
  classifyMediaToFascia,
  computeLivelliFromStudents,
  createManualStudentEntry,
  extractCognomeOnly,
  moveStudentToFascia,
  parseGradebookBuffer,
  parseItalianDecimal,
  restoreAutomaticFasce,
  updateStudentDetails,
} from '../engine/gradebookImporter';
import {
  cloneProgrammazioneWithOptions,
  getSectionOptionsForPreset,
} from '../engine/planCloning';
import {
  QUESTIONNAIRE_INDICATORS,
  buildClassCompositionIntro,
  createEmptyQuestionnaire,
  generateClassDescription,
} from '../engine/questionnaireEngine';
import { applySuggestionAction, evaluateSuggestionRules } from '../engine/suggestionEngine';
import { generateProgrammazioneDocxBytes } from '../export/docxGenerator';
import { generateProgrammazionePdfBytes } from '../export/pdfGenerator';

const mapping = defaultMappingRaw as DocxMappingSchema;
const rules = defaultRulesRaw as SuggestionRule[];

describe('PIANORAMA — Privacy, Regole, Questionario, Clonazione, Registro XLSX e Export Offline', () => {
  it('mappa DOCX usa Garamond, #1F3864 e caselle ☒/☐', () => {
    expect(mapping.typography.fontFamily).toBe('Garamond');
    expect(mapping.typography.headingColorHex).toBe('1F3864');
    expect(mapping.typography.checkedGlyph).toBe('☒');
    expect(mapping.typography.uncheckedGlyph).toBe('☐');
    expect(mapping.sections.length).toBeGreaterThanOrEqual(10);
  });

  it('consente elenchi nominativi e note sensibili in locale offline ma sanitizza export ufficiali DOCX/PDF', () => {
    const plan = createEmptyProgrammazione(DEFAULT_SCHOOL_SETTINGS);
    const manual = createManualStudentEntry(
      [],
      {
        nominativo: 'Mario Rossi',
        media: 5.2,
        categoriaInclusione: 'dsa',
        riferimentoPiano: 'PDP',
        notaSensibileDocente: 'Mappa concettuale riservata offline',
      },
      DEFAULT_SOGLIE_FASCE
    );
    plan.analisiPartenza.alunniAnonimiFasce = [manual];
    plan.analisiPartenza.livelli = computeLivelliFromStudents([manual]);

    expect(plan.analisiPartenza.alunniAnonimiFasce[0].nominativo).toBe('Mario Rossi');
    const sanitized = sanitizePlanForOfficialExport(plan);
    expect(sanitized.analisiPartenza.alunniAnonimiFasce).toBeUndefined();
    expect(sanitized.analisiPartenza.livelli.bassoAlunni).toBe(1);
  });

  it('motore regole deterministico propone recupero se livello medio-basso e misure BES se bes > 0', () => {
    const plan = createEmptyProgrammazione(DEFAULT_SCHOOL_SETTINGS);
    plan.situazione.livello = 'medio-basso';
    plan.composizione.bes = 2;
    plan.interventi.recupero = [];

    const proposals = evaluateSuggestionRules(plan, rules);
    expect(proposals.some((p) => p.action.targetSection === 'interventi.recupero')).toBe(true);
    expect(
      proposals.some((p) => p.action.targetSection === 'interventi.besInterventiProgrammati')
    ).toBe(true);

    const recProposal = proposals.find((p) => p.action.targetSection === 'interventi.recupero')!;
    const updated = applySuggestionAction(plan, recProposal.action);
    expect(updated.interventi.recupero).toContain(recProposal.action.valueText);
  });

  it('questionario classe contiene 21 indicatori con Comprensione, Memorizzazione e Capacità di apprendimento distinti ed esclude risposte vuote', () => {
    const keys = QUESTIONNAIRE_INDICATORS.map((i) => i.key);
    expect(keys.length).toBeGreaterThanOrEqual(21);
    expect(keys).toContain('comprensione');
    expect(keys).toContain('memorizzazione');
    expect(keys).toContain('capacitaApprendimento');

    const plan = createEmptyProgrammazione(DEFAULT_SCHOOL_SETTINGS, {
      disciplina: 'Matematica',
      classe: 'Prima',
      sezione: 'A',
    });
    const q = createEmptyQuestionnaire();
    q.risposte.comprensione = {
      selectedOption: QUESTIONNAIRE_INDICATORS.find((i) => i.key === 'comprensione')!.options[1]
        .label,
      eterogenea: true,
      notaEterogenea: 'alcuni alunni necessitano di guida visiva',
    };
    q.risposte.memorizzazione = {
      selectedOption: QUESTIONNAIRE_INDICATORS.find((i) => i.key === 'memorizzazione')!.options[0]
        .label,
      eterogenea: false,
      notaEterogenea: '',
    };
    plan.analisiPartenza.questionario = q;

    const synthetic = generateClassDescription(plan, 'sintetica');
    const complete = generateClassDescription(plan, 'completa');

    expect(synthetic).toContain('comprensione');
    expect(synthetic).toContain('alcuni alunni necessitano di guida visiva');
    expect(complete).toContain('memorizzazione');
    expect(complete.toLowerCase()).not.toContain('compiti domestici');

    const synthVariants = new Set<string>();
    const compVariants = new Set<string>();
    for (let v = 0; v < 10; v++) {
      synthVariants.add(generateClassDescription(plan, 'sintetica', v));
      compVariants.add(generateClassDescription(plan, 'completa', v));
    }
    expect(synthVariants.size).toBe(10);
    expect(compVariants.size).toBe(10);
  });

  it('clonazione per classe parallela mantiene contenuti comuni e resetta descrizione specifica senza alterare originale', () => {
    const source = createEmptyProgrammazione(DEFAULT_SCHOOL_SETTINGS, {
      disciplina: 'Matematica',
      classe: 'Prima',
      sezione: 'A',
    });
    source.curricolo.competenzeAttese = ['Risolvere problemi con frazioni'];
    source.analisiPartenza.descrizioneDisciplinare = 'Descrizione specifica 1A';

    const copy = cloneProgrammazioneWithOptions({
      source,
      settings: DEFAULT_SCHOOL_SETTINGS,
      preset: 'classe_parallela',
      sections: getSectionOptionsForPreset('classe_parallela'),
      overrides: {
        disciplina: 'Matematica',
        classe: 'Prima',
        sezione: 'B',
        annoScolastico: '2025/2026',
        plesso: 'Villafrati',
        docente: 'Prof. Verdi',
      },
    });

    expect(copy.id).not.toBe(source.id);
    expect(copy.curricolo.competenzeAttese).toEqual(['Risolvere problemi con frazioni']);
    expect(copy.analisiPartenza.descrizioneDisciplinare).toBe('');

    copy.curricolo.competenzeAttese.push('Nuova competenza 1B');
    expect(source.curricolo.competenzeAttese).toHaveLength(1);
    expect(copy.cronologiaModifiche?.length).toBeGreaterThanOrEqual(1);
  });

  it('import registro voti .xlsx: gestisce celle unite, decimali IT/EN, media fallback, nessuna arrotondatura e anonimizzazione rigorosa', async () => {
    expect(parseItalianDecimal('6,5')).toBe(6.5);
    expect(parseItalianDecimal('5.49')).toBe(5.49);
    expect(classifyMediaToFascia(5.49, DEFAULT_SOGLIE_FASCE)).toBe('basso');
    expect(classifyMediaToFascia(5.5, DEFAULT_SOGLIE_FASCE)).toBe('medio_basso');
    expect(classifyMediaToFascia(6.49, DEFAULT_SOGLIE_FASCE)).toBe('medio_basso');
    expect(classifyMediaToFascia(6.5, DEFAULT_SOGLIE_FASCE)).toBe('medio');
    expect(classifyMediaToFascia(8.49, DEFAULT_SOGLIE_FASCE)).toBe('medio');
    expect(classifyMediaToFascia(8.5, DEFAULT_SOGLIE_FASCE)).toBe('alto');
    expect(classifyMediaToFascia(3.9, DEFAULT_SOGLIE_FASCE)).toBe('da_verificare');

    // Costruisce un registro scolastico realistico in memoria con intestazioni, celle unite e piè di pagina
    const rows = [
      ['Istituto Comprensivo Beato Don Pino Puglisi', '', '', '', ''],
      ['RIEPILOGO VOTI', '', '', '', ''],
      ['1A ORDINARIO (SCIENZE)', '', '', '', ''],
      ['Alunno', 'Media', 'ORALE', 'SCRITTO', 'PRATICO'],
      ['ROSSI MARIO', '5,49', '5', '6', ''], // < 5.5 -> basso (non arrotondare a 5.5!)
      ['BIANCHI LUCIA', '6,49', '6', '7', ''], // < 6.5 -> medio_basso
      ['VERDI LUCA', '', '8', '9', ''], // Media vuota -> fallback (8+9)/2 = 8.5 -> alto (celle unite testate sotto)
      ['NERI ANNA', '7.2', '7', '', ''], // 6.5..8.5 -> medio
      ['GIALLI PAOLO', '3,5', '3,5', '', ''], // < 4 -> da_verificare
      ['BLU SARA', '', '', '', ''], // senza voti -> da_verificare
      ['Valutazioni', '6,1', '', '', ''],
      ['Stampato il 15/11/2026', '', '', '', ''],
    ];

    const sheet = XLSX.utils.aoa_to_sheet(rows);
    // Simula unione verticale su una riga intestazione e unione orizzontale su una colonna voto di VERDI LUCA (riga 6, col 3..4)
    sheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
      { s: { r: 6, c: 3 }, e: { r: 6, c: 4 } }, // il voto "9" copre col 3 e 4: non deve essere contato due volte!
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, 'Riepilogo');
    const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;

    expect(extractCognomeOnly('ROSSI MARIO')).toBe('ROSSI');
    expect(extractCognomeOnly('DE LUCA Anna Maria')).toBe('DE LUCA');
    expect(extractCognomeOnly('VERDI, Luca')).toBe('VERDI');

    const resultKeepNames = parseGradebookBuffer(out, DEFAULT_SOGLIE_FASCE, { keepNames: true });
    expect(resultKeepNames.entries[0].nominativo).toBe('ROSSI');

    const result = parseGradebookBuffer(out, DEFAULT_SOGLIE_FASCE, { keepNames: false });

    expect(result.classeRilevata).toBe('1A ORDINARIO (SCIENZE)');
    expect(result.entries).toHaveLength(6);
    expect(result.entries.map((e) => e.labelAnonimo)).toEqual([
      'Alunno 1',
      'Alunno 2',
      'Alunno 3',
      'Alunno 4',
      'Alunno 5',
      'Alunno 6',
    ]);

    // In modalità anonima nessun nominativo compare nei dati estratti
    const serialized = JSON.stringify(result);
    for (const forbidden of ['ROSSI', 'MARIO', 'BIANCHI', 'LUCIA', 'VERDI', 'NERI', 'GIALLI', 'BLU']) {
      expect(serialized).not.toContain(forbidden);
    }

    // Verifica fasce e non-arrotondamento
    expect(result.entries[0].fasciaAutomatica).toBe('basso');
    expect(result.entries[1].fasciaAutomatica).toBe('medio_basso');
    expect(result.entries[2].media).toBe(8.5); // (8+9)/2, non (8+9+9)/3!
    expect(result.entries[2].fasciaAutomatica).toBe('alto');
    expect(result.entries[3].fasciaAutomatica).toBe('medio');
    expect(result.entries[4].fasciaAutomatica).toBe('da_verificare');
    expect(result.entries[5].fasciaAutomatica).toBe('da_verificare');

    expect(result.livelli).toEqual({
      bassoAlunni: 1,
      medioBassoAlunni: 1,
      medioAlunni: 1,
      altoAlunni: 1,
    });
    expect(result.daVerificareCount).toBe(2);

    // Spostamento manuale del docente e annotazione sensibile su elenco con nomi
    const withNotes = updateStudentDetails(
      resultKeepNames.entries,
      resultKeepNames.entries[0].id,
      { categoriaInclusione: 'bes', riferimentoPiano: 'PDP', notaSensibileDocente: 'Nota riservata locale' },
      DEFAULT_SOGLIE_FASCE
    );
    expect(withNotes[0].categoriaInclusione).toBe('bes');
    expect(withNotes[0].notaSensibileDocente).toBe('Nota riservata locale');

    const moved = moveStudentToFascia(result.entries, result.entries[4].id, 'basso');
    expect(moved[4].spostatoDalDocente).toBe(true);
    expect(moved[4].fasciaCorrente).toBe('basso');
    expect(computeLivelliFromStudents(moved)).toEqual({
      bassoAlunni: 2,
      medioBassoAlunni: 1,
      medioAlunni: 1,
      altoAlunni: 1,
    });

    // Ripristino fasce automatiche
    const restored = restoreAutomaticFasce(moved, DEFAULT_SOGLIE_FASCE);
    expect(restored[4].spostatoDalDocente).toBe(false);
    expect(restored[4].fasciaCorrente).toBe('da_verificare');
    expect(computeLivelliFromStudents(restored)).toEqual(result.livelli);

    // Anche con elenco nominativo e note sensibili salvati offline, i DOCX/PDF ufficiali esportano solo i conteggi
    const plan = createEmptyProgrammazione(DEFAULT_SCHOOL_SETTINGS);
    plan.analisiPartenza.alunniAnonimiFasce = withNotes;
    plan.analisiPartenza.livelli = computeLivelliFromStudents(withNotes);
    const docxBytes = await generateProgrammazioneDocxBytes(plan, DEFAULT_SCHOOL_SETTINGS, mapping);
    const docxText = new TextDecoder().decode(docxBytes);
    expect(docxText).not.toContain('ROSSI');
    expect(docxText).not.toContain('Nota riservata locale');
  });

  it('backup .pianorama cifrato AES-GCM può essere esportato e decifrato localmente', async () => {
    const plan = createEmptyProgrammazione(DEFAULT_SCHOOL_SETTINGS);
    const plain = {
      app: 'PIANORAMA' as const,
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      programmazioni: [plan],
      library: [],
      rules,
      settings: DEFAULT_SCHOOL_SETTINGS,
      docxMapping: mapping,
    };

    const envelope = await createBackupEnvelope(plain, 'ScuolaSicura2026');
    expect(envelope.encrypted).toBe(true);

    const parsed = parseBackupEnvelope(JSON.stringify(envelope));
    const restored = await decryptBackupEnvelope(parsed, 'ScuolaSicura2026');
    expect(restored.programmazioni).toHaveLength(1);
    expect(restored.programmazioni[0].id).toBe(plan.id);

    await expect(decryptBackupEnvelope(parsed, 'PasswordSbagliata')).rejects.toThrow();
  });

  it('genera file DOCX e PDF validi interamente offline', async () => {
    const plan = createEmptyProgrammazione(DEFAULT_SCHOOL_SETTINGS, {
      disciplina: 'Italiano',
      classe: 'Seconda',
      sezione: 'A',
      docente: 'Prof.ssa Bianchi',
    });
    plan.analisiPartenza.descrizioneDisciplinare =
      'Gruppo classe collaborativo con buone potenzialità di lettura.';
    plan.curricolo.righeAbilitaConoscenze.push({
      id: 'row-1',
      abilita: 'Analizzare la struttura della frase semplice.',
      conoscenze: 'Predicato, soggetto e complementi diretti e indiretti.',
    });

    const docxBytes = await generateProgrammazioneDocxBytes(
      plan,
      DEFAULT_SCHOOL_SETTINGS,
      mapping
    );
    expect(docxBytes.byteLength).toBeGreaterThan(2000);
    // ZIP signature "PK"
    expect(docxBytes[0]).toBe(0x50);
    expect(docxBytes[1]).toBe(0x4b);

    const pdfBytes = generateProgrammazionePdfBytes(
      plan,
      DEFAULT_SCHOOL_SETTINGS,
      mapping
    );
    expect(pdfBytes.byteLength).toBeGreaterThan(1500);
    // PDF header "%PDF"
    expect(String.fromCharCode(pdfBytes[0], pdfBytes[1], pdfBytes[2], pdfBytes[3])).toBe('%PDF');
  });

  it('5.7 catalogo Curricolo Verticale: copre tutte le discipline 1ª/2ª/3ª con fonti corrette, import autonomo, etichetta altra classe, ripristino e diff JSON', async () => {
    // Tutte le 15 discipline secondarie hanno voci per Prima, Seconda e Terza
    for (const disc of DISCIPLINE_SECONDARIA) {
      const prima = filterCatalogEntries(CURRICOLO_VERTICALE_SEED, 'Prima', disc);
      const seconda = filterCatalogEntries(CURRICOLO_VERTICALE_SEED, 'Seconda', disc);
      const terza = filterCatalogEntries(CURRICOLO_VERTICALE_SEED, 'Terza', disc);
      expect(prima.length).toBeGreaterThan(0);
      expect(seconda.length).toBeGreaterThan(0);
      expect(terza.length).toBeGreaterThan(0);
      expect(prima.some((e) => e.documentoProvenienza === 'Curricolo verticale nuovo')).toBe(
        true
      );
      expect(
        [...prima, ...seconda, ...terza].every((e) =>
          e.documentoProvenienza.startsWith('Curricolo verticale')
        )
      ).toBe(true);
    }
    const itaSeconda = filterCatalogEntries(CURRICOLO_VERTICALE_SEED, 'Seconda', 'Italiano');
    expect(
      itaSeconda.some((e) => e.documentoProvenienza.includes('Curricolo verticale vecchio'))
    ).toBe(true);

    // Raggruppamento per tipo e nucleo tematico
    const matPrima = filterCatalogEntries(CURRICOLO_VERTICALE_SEED, 'Prima', 'Matematica');
    const grouped = groupCatalogEntries(matPrima);
    expect(grouped.length).toBeGreaterThanOrEqual(3);
    expect(grouped.some((g) => g.tipo === 'competenza')).toBe(true);
    expect(grouped.some((g) => g.tipo === 'abilita')).toBe(true);

    // Importazione come copie autonome (es. importando da Classe Prima in una programmazione di Seconda)
    const originalCatalogText = matPrima[0].testo;
    const importedVoices = importCatalogEntriesToVoices(matPrima.slice(0, 2));
    expect(importedVoices[0].classeOrigine).toBe('Prima');
    expect(isVoiceRestorable(importedVoices[0], CURRICOLO_VERTICALE_SEED)).toBe(false);

    // Modifica della copia importata non altera il catalogo originale e attiva il ripristino
    importedVoices[0].testo = 'Testo personalizzato dal docente per la classe Seconda.';
    expect(matPrima[0].testo).toBe(originalCatalogText);
    expect(isVoiceRestorable(importedVoices[0], CURRICOLO_VERTICALE_SEED)).toBe(true);

    // Riordino e ripristino formulazione originale
    const reordered = reorderImportedVoices(importedVoices, importedVoices[1].id, -1);
    expect(reordered[0].id).toBe(importedVoices[1].id);
    const restored = restoreVoiceFromCatalog(
      reordered,
      importedVoices[0].id,
      CURRICOLO_VERTICALE_SEED
    );
    const restoredItem = restored.find((v) => v.id === importedVoices[0].id)!;
    expect(restoredItem.testo).toBe(originalCatalogText);
    expect(isVoiceRestorable(restoredItem, CURRICOLO_VERTICALE_SEED)).toBe(false);

    // Export con voci importate da altra classe in DOCX e PDF
    const plan = createEmptyProgrammazione(DEFAULT_SCHOOL_SETTINGS, {
      disciplina: 'Matematica',
      classe: 'Seconda',
      sezione: 'B',
    });
    plan.curricolo.vociCatalogoImportate = importedVoices;
    const docxBytes = await generateProgrammazioneDocxBytes(
      plan,
      DEFAULT_SCHOOL_SETTINGS,
      mapping
    );
    expect(docxBytes.byteLength).toBeGreaterThan(2000);
    const pdfBytes = generateProgrammazionePdfBytes(
      plan,
      DEFAULT_SCHOOL_SETTINGS,
      mapping
    );
    expect(pdfBytes.byteLength).toBeGreaterThan(1500);

    // Validazione e calcolo diff aggiornamento JSON del catalogo
    const customJson = JSON.stringify([
      ...CURRICOLO_VERTICALE_SEED.slice(1).map((e, idx) =>
        idx === 0 ? { ...e, testo: `${e.testo} (aggiornato)` } : e
      ),
      {
        id: 'cv-custom-extra-1',
        classe: 'Terza',
        disciplina: 'Italiano',
        tipo: 'obiettivo_specifico',
        nucleoTematico: 'Lettura critica',
        testo: 'Nuovo obiettivo aggiunto da file JSON di istituto.',
        documentoProvenienza: 'Aggiornamento collegiale JSON',
      },
    ]);
    const parsedCatalog = validateCatalogJsonPayload(customJson);
    const diff = computeCatalogDiff(CURRICOLO_VERTICALE_SEED, parsedCatalog);
    expect(diff.addedCount).toBe(1);
    expect(diff.modifiedCount).toBe(1);
    expect(diff.removedCount).toBe(1);
  });

  it('5.8 caratteristiche classe a barra 100%: leve avanti/indietro, valori predefiniti, 0%/nessuno, numero esatto, testo manuale, strategie e metodi per disciplina', async () => {
    // 0. Strategie tutte selezionate di default e metodi/strumenti predefiniti per disciplina
    const planScienze = createEmptyProgrammazione(DEFAULT_SCHOOL_SETTINGS, {
      disciplina: 'Scienze',
      classe: 'Seconda',
      sezione: 'C',
    });
    expect(planScienze.interventi.potenziamento).toEqual(STRATEGIE_POTENZIAMENTO_OPTIONS);
    expect(planScienze.interventi.consolidamento).toEqual(STRATEGIE_CONSOLIDAMENTO_OPTIONS);
    expect(planScienze.interventi.recupero).toEqual(STRATEGIE_RECUPERO_OPTIONS);
    expect(planScienze.metodiStrumenti.metodi).toContain('Metodo scientifico');

    const matDefaults = getDefaultMetodiStrumentiForDisciplina('Matematica');
    expect(matDefaults.metodi).toContain('Metodo deduttivo');
    expect(matDefaults.metodi).not.toContain('Metodo scientifico');

    // 1. Valori predefiniti delle 5 dimensioni: "non definito" a sinistra (indice 0) al 100%,
    // tranne Metodo di studio ("non definito" 0%, "in consolidamento" 100%)
    const defaults = createDefaultClassDimensions();
    expect(defaults).toHaveLength(5);
    const att = defaults.find((d) => d.id === 'dim-atteggiamento')!;
    expect(isDimensionAllNessuno(att)).toBe(true);
    expect(att.segmenti[0].etichetta).toBe('non definito');
    expect(att.segmenti[0].quotaPercentuale).toBe(100);
    expect(generateDimensionSentence(att)).toBe('');

    const metodo = defaults.find((d) => d.id === 'dim-metodo')!;
    expect(isDimensionAllNessuno(metodo)).toBe(false);
    expect(metodo.segmenti[0].etichetta).toBe('non definito');
    expect(metodo.segmenti[0].quotaPercentuale).toBe(0);
    expect(metodo.segmenti.find((s) => s.etichetta === 'in consolidamento')?.quotaPercentuale).toBe(
      100
    );

    // 2. Aggiunta caratteristiche con quota iniziale 0% a destra di "non definito"
    let dimAtt = addCharacteristicToDimension(att, 'tranquilla');
    dimAtt = addCharacteristicToDimension(dimAtt, 'vivace');
    expect(dimAtt.segmenti.map((s) => [s.etichetta, s.quotaPercentuale])).toEqual([
      ['non definito', 100],
      ['tranquilla', 0],
      ['vivace', 0],
    ]);

    // Regola quota di "tranquilla" (+60%): sottrae prima da "non definito" (40%)
    dimAtt = adjustCharacteristicQuota(dimAtt, dimAtt.segmenti[1].id, 60);
    expect(dimAtt.segmenti.reduce((a, s) => a + s.quotaPercentuale, 0)).toBe(100);
    expect(dimAtt.segmenti.map((s) => s.quotaPercentuale)).toEqual([40, 60, 0]);

    // Regola quota di "vivace" (+30%): sottrae da "non definito" (10%)
    dimAtt = adjustCharacteristicQuota(dimAtt, dimAtt.segmenti[2].id, 30);
    expect(dimAtt.segmenti.map((s) => s.quotaPercentuale)).toEqual([10, 60, 30]);

    // Sposta leva 0 (tra non definito e tranquilla) da 10 a 25 -> non definito=25, tranquilla=45, vivace=30
    dimAtt = { ...dimAtt, segmenti: moveDimensionHandle(dimAtt.segmenti, 0, 25) };
    expect(dimAtt.segmenti.reduce((a, s) => a + s.quotaPercentuale, 0)).toBe(100);
    expect(dimAtt.segmenti.map((s) => s.quotaPercentuale)).toEqual([25, 45, 30]);

    // Rimozione di "vivace" trasferisce il suo 30% a "non definito" (55%) preservando tranquilla (45%)
    const afterRemove = removeCharacteristicFromDimension(dimAtt, dimAtt.segmenti[2].id);
    expect(afterRemove.segmenti.map((s) => [s.etichetta, s.quotaPercentuale])).toEqual([
      ['non definito', 55],
      ['tranquilla', 45],
    ]);

    // 2b. Modifica numero totale alunni: prima varia "non definito", poi i segmenti a destra
    const reconciledGrow = reconcileDimensionsWithTotalStudents([afterRemove], 20, 25);
    expect(reconciledGrow[0].segmenti[1].quotaPercentuale).toBe(36); // 9/25 alunni tranquilli
    expect(reconciledGrow[0].segmenti[0].quotaPercentuale).toBe(64); // aumento assorbito da non definito

    const fullDefined = adjustCharacteristicQuota(afterRemove, afterRemove.segmenti[1].id, 55); // [0, 100]
    const reconciledShrink = reconcileDimensionsWithTotalStudents([fullDefined], 20, 10);
    expect(reconciledShrink[0].segmenti[0].quotaPercentuale).toBe(0);
    expect(reconciledShrink[0].segmenti[1].quotaPercentuale).toBe(100);

    // Cataloghi indicatori specifici per ciascuna dimensione
    expect(getCharacteristicsCatalogForDimension(att)).toContain('vivace');
    const collDim = defaults.find((d) => d.id === 'dim-collaborazione')!;
    expect(getCharacteristicsCatalogForDimension(collDim)).toContain('rispettosa delle regole');
    expect(getCharacteristicsCatalogForDimension(collDim)).not.toContain('vivace');
    const autDim = defaults.find((d) => d.id === 'dim-autonomia')!;
    expect(getCharacteristicsCatalogForDimension(autDim)).toContain('pienamente autonoma');

    // 3. Conversione percentuale -> espressione verbale e numero esatto di alunni
    expect(quotaPercentualeToExpression(0)).toBeNull();
    expect(quotaPercentualeToExpression(9)).toBe('pochi');
    expect(quotaPercentualeToExpression(10)).toBe('una parte');
    expect(quotaPercentualeToExpression(40)).toBe('circa metà');
    expect(quotaPercentualeToExpression(51)).toBe('la maggior parte');
    expect(quotaPercentualeToExpression(85)).toBe('quasi tutta la classe');
    expect(quotaPercentualeToExpression(100)).toBe('tutta la classe');

    // Metodo di studio: azzera "in consolidamento" (-> non definito 100%), poi imposta acquisito 70% e in via di maturazione 30%
    // segmenti: [0: non definito, 1: acquisito, 2: in consolidamento, 3: in via di maturazione, 4: non ancora avviato]
    let dimMetodoTest = adjustCharacteristicQuota(metodo, metodo.segmenti[2].id, -100);
    dimMetodoTest = adjustCharacteristicQuota(dimMetodoTest, dimMetodoTest.segmenti[1].id, 70);
    dimMetodoTest = adjustCharacteristicQuota(dimMetodoTest, dimMetodoTest.segmenti[3].id, 30);
    const metodoSentence0 = generateDimensionSentence(
      { ...dimMetodoTest, varianteStile: 0 },
      DEFAULT_SOGLIE_QUOTE_CARATTERISTICHE
    );
    expect(metodoSentence0).toContain('acquisito un metodo di studio autonomo ed efficace');
    expect(metodoSentence0).toContain(', mentre ');

    // Verifica presenza di 10 varianti stilistiche distinte per ogni tipologia/indicatore
    expect(STYLISTIC_VARIANTS_COUNT).toBe(10);
    for (const indicator of [
      'motivata',
      'tranquilla',
      'vivace',
      'collaborativa',
      'acquisito',
      'pienamente autonoma',
      'attiva e costruttiva',
    ]) {
      expect(getPhraseVariantsCount(indicator)).toBe(10);
    }

    const attAllVariants = new Set<string>();
    const attWithMotivata = addCharacteristicToDimension(att, 'motivata');
    const attMotivata = adjustCharacteristicQuota(
      attWithMotivata,
      attWithMotivata.segmenti[1].id,
      100
    );
    for (let v = 0; v < STYLISTIC_VARIANTS_COUNT; v++) {
      attAllVariants.add(
        generateDimensionSentence(
          { ...attMotivata, varianteStile: v },
          DEFAULT_SOGLIE_QUOTE_CARATTERISTICHE
        )
      );
    }
    expect(attAllVariants.size).toBe(10);

    // Numero esatto di alunni sostituisce l'espressione verbale
    const segAcqId = dimMetodoTest.segmenti[1].id;
    const withExactCount = setSegmentExactCount(dimMetodoTest, segAcqId, 14, 20);
    expect(generateDimensionSentence({ ...withExactCount, varianteStile: 0 })).toContain(
      '14 alunni hanno acquisito'
    );

    // 4. Testo manuale non viene sovrascritto da modifiche alle quote finché non ripristinato
    const manualDim: ClassCharacteristicDimension = {
      ...withExactCount,
      isTestoManuale: true,
      testoManuale: 'Testo personalizzato sul metodo di studio della 2C.',
    };
    expect(getEffectiveDimensionText(manualDim)).toBe(
      'Testo personalizzato sul metodo di studio della 2C.'
    );

    // 5. Dimensione personalizzata vuota (non definito 100%) non compare nei documenti; nessuna PII esportata
    const emptyCustom = createCustomDimension('Autonomia digitale');
    expect(isDimensionAllNessuno(emptyCustom)).toBe(true);

    planScienze.situazione.caratteristicheDimensioni = [att, dimMetodoTest, emptyCustom];
    planScienze.analisiPartenza.alunniAnonimiFasce = [
      createManualStudentEntry(
        [],
        { nominativo: 'ALUNNO SEGRETO TEST', media: 7 },
        DEFAULT_SOGLIE_FASCE
      ),
    ];

    const activeParagraphs = getActiveDimensionsForDocument(
      planScienze.situazione.caratteristicheDimensioni,
      DEFAULT_SOGLIE_QUOTE_CARATTERISTICHE
    );
    expect(activeParagraphs).toHaveLength(1);
    expect(activeParagraphs[0].nome).toBe('Metodo di studio');

    const docxBytes = await generateProgrammazioneDocxBytes(
      planScienze,
      DEFAULT_SCHOOL_SETTINGS,
      mapping
    );
    const pdfBytes = generateProgrammazionePdfBytes(
      planScienze,
      DEFAULT_SCHOOL_SETTINGS,
      mapping
    );
    const docxStr = new TextDecoder().decode(docxBytes);
    expect(docxBytes.byteLength).toBeGreaterThan(2000);
    expect(pdfBytes.byteLength).toBeGreaterThan(1500);
    expect(docxStr).not.toContain('ALUNNO SEGRETO TEST');
    expect(docxStr).not.toContain('Autonomia digitale');
    expect(CURRICOLO_VERTICALE_SEED.length).toBeGreaterThanOrEqual(200);
  });

  it('titolo docente Prof./Prof.ssa, testo standard BES/PDP, presentazione alunni M/F, tabella 3 colonne, layout originale/moderno e import PDF/DOCX/DOC', async () => {
    // 1. Titolo e firma docente in base al sesso
    expect(formatDocenteConTitolo('Maria Rossi', 'F')).toBe('Prof.ssa Maria Rossi');
    expect(formatDocenteConTitolo('Marco Verdi', 'M')).toBe('Prof. Marco Verdi');
    expect(formatFirmaDocente('Maria Rossi', 'F')).toBe('La docente Prof.ssa Maria Rossi');
    expect(formatFirmaDocente('Marco Verdi', 'M')).toBe('Il docente Prof. Marco Verdi');

    // 2. Testo standard BES/PDP e presentazione alunni (totale, maschi, femmine)
    expect(DEFAULT_SCHOOL_SETTINGS.defaultAnnoScolastico).toBe('2026/27');
    expect(DEFAULT_SCHOOL_SETTINGS.defaultLayoutDocumento).toBe('originale');
    expect(DEFAULT_BES_INTERVENTI_TEXT.toUpperCase()).toContain('PDP');
    expect(DEFAULT_BES_INTERVENTI_TEXT.toLowerCase()).toContain('compensativ');
    expect(DEFAULT_BES_INTERVENTI_TEXT.toLowerCase()).toContain('dispensativ');

    const plan = createEmptyProgrammazione(DEFAULT_SCHOOL_SETTINGS, {
      disciplina: 'Italiano',
      classe: 'Prima',
      sezione: 'B',
      docente: 'Giulia Neri',
      docenteGenere: 'F',
      layoutDocumento: 'originale',
    });
    plan.composizione = { alunni: 22, maschi: 12, femmine: 10, ripetenti: 1, bes: 3 };
    const introText = generateClassDescription(plan, 'sintetica');
    expect(introText).toContain('22 alunni (12 maschi e 10 femmine)');
    const distinctIntros = new Set<string>();
    for (let v = 0; v < 10; v++) {
      distinctIntros.add(buildClassCompositionIntro(plan, v));
    }
    expect(distinctIntros.size).toBe(10);

    // 3. Popolamento tabella a 3 colonne dalle voci del catalogo
    const itaPrima = filterCatalogEntries(CURRICOLO_VERTICALE_SEED, 'Prima', 'Italiano').slice(0, 6);
    const voices = importCatalogEntriesToVoices(itaPrima);
    const programRows = buildProgramRowsFromCatalogVoices(voices);
    expect(programRows.length).toBeGreaterThan(0);
    expect(programRows[0].competenze || programRows[0].traguardo).toBeTruthy();
    plan.curricolo.righeAbilitaConoscenze = programRows;

    // 4. Generazione DOCX e PDF in entrambi gli stili (originale e moderno) e round-trip importazione offline
    const docxOriginal = await generateProgrammazioneDocxBytes(plan, DEFAULT_SCHOOL_SETTINGS, mapping);
    const planModern = {
      ...plan,
      datiGenerali: { ...plan.datiGenerali, layoutDocumento: 'moderno' as const },
    };
    const docxModern = await generateProgrammazioneDocxBytes(
      planModern,
      DEFAULT_SCHOOL_SETTINGS,
      mapping
    );
    const pdfOriginal = generateProgrammazionePdfBytes(plan, DEFAULT_SCHOOL_SETTINGS, mapping);
    const pdfModern = generateProgrammazionePdfBytes(planModern, DEFAULT_SCHOOL_SETTINGS, mapping);

    expect(docxOriginal.byteLength).toBeGreaterThan(2500);
    expect(docxModern.byteLength).toBeGreaterThan(2500);
    expect(pdfOriginal.byteLength).toBeGreaterThan(2000);
    expect(pdfModern.byteLength).toBeGreaterThan(2000);

    // Importazione offline da DOCX generato
    const importedDocx = await importProgrammazioneFromBuffer(
      docxOriginal.buffer as ArrayBuffer,
      'programmazione_vecchia.docx',
      DEFAULT_SCHOOL_SETTINGS
    );
    expect(importedDocx.plan.datiGenerali.disciplina).toBe('Italiano');
    expect(importedDocx.plan.datiGenerali.classe).toBe('Prima');
    expect(importedDocx.plan.datiGenerali.sezione).toBe('B');
    expect(importedDocx.plan.composizione.alunni).toBe(22);
    expect(importedDocx.plan.composizione.maschi).toBe(12);
    expect(importedDocx.plan.composizione.femmine).toBe(10);
    expect(importedDocx.plan.curricolo.righeAbilitaConoscenze.length).toBeGreaterThan(0);

    // Importazione offline da PDF generato
    const importedPdf = await importProgrammazioneFromBuffer(
      pdfOriginal.buffer as ArrayBuffer,
      'vecchia_programmazione.pdf',
      DEFAULT_SCHOOL_SETTINGS
    );
    expect(importedPdf.summary.fileType).toBe('pdf');
    expect(importedPdf.summary.extractedChars).toBeGreaterThan(200);
    expect(importedPdf.plan.datiGenerali.disciplina).toBe('Italiano');

    // Importazione offline da file .doc in formato RTF (tipico dei vecchi Word .doc)
    const rtfDoc = `{\\rtf1\\ansi
PROGRAMMAZIONE DISCIPLINARE: Matematica
Classe: Seconda Sezione: C Anno Scolastico: 2024/2025 Plesso: Mezzojuso
Docente: Prof. Marco Bianchi
Alunni: 18 Maschi: 9 Femmine: 9
COMPETENZE \\tab ABILITA' \\tab CONOSCENZE \\par
Utilizzare con sicurezza le tecniche di calcolo \\tab Eseguire espressioni con frazioni \\tab I numeri razionali e le frazioni \\par
}`;
    const docBuffer = new TextEncoder().encode(rtfDoc).buffer;
    const importedDoc = await importProgrammazioneFromBuffer(
      docBuffer,
      'programmazione_2024.doc',
      DEFAULT_SCHOOL_SETTINGS
    );
    expect(importedDoc.summary.fileType).toBe('doc');
    expect(importedDoc.plan.datiGenerali.disciplina).toBe('Matematica');
    expect(importedDoc.plan.datiGenerali.classe).toBe('Seconda');
    expect(importedDoc.plan.datiGenerali.sezione).toBe('C');
    expect(importedDoc.plan.datiGenerali.docenteGenere).toBe('M');
    expect(importedDoc.plan.composizione.alunni).toBe(18);
  });

  it('precompila per tutte le 15 discipline verifica, valutazione, metodi, strumenti, curricolo digitale e rilevazione con copertura ampia e coerente', () => {
    expect(DISCIPLINE_SECONDARIA).toHaveLength(15);

    const premessaSet = new Set<string>();
    const attivitaSet = new Set<string>();

    for (const disciplina of DISCIPLINE_SECONDARIA) {
      const plan = createEmptyProgrammazione(DEFAULT_SCHOOL_SETTINGS, { disciplina });
      const verif = getDefaultVerificheValutazioneForDisciplina(disciplina);
      const met = getDefaultMetodiStrumentiForDisciplina(disciplina);
      const ril = getDefaultRilevazioneForDisciplina(disciplina);
      const cur = getDefaultCurricoloForDisciplina(disciplina);

      expect(plan.situazione.tipologie.length).toBeGreaterThanOrEqual(2);
      expect(plan.verificheValutazione.verificheScritte.length).toBeGreaterThanOrEqual(4);
      expect(plan.verificheValutazione.verificheOrali.length).toBeGreaterThanOrEqual(4);
      expect(plan.verificheValutazione.altriTipiProve.trim().length).toBeGreaterThan(25);
      expect(plan.verificheValutazione.criteriValutazione.trim().length).toBeGreaterThan(100);
      expect(plan.verificheValutazione.verificheScritte).toEqual(verif.verificheScritte);

      expect(met.metodi.length).toBeGreaterThanOrEqual(5);
      expect(met.mezziEStrumenti.length).toBeGreaterThanOrEqual(7);
      expect(plan.metodiStrumenti.altreMetodologie.trim().length).toBeGreaterThan(10);
      expect(plan.metodiStrumenti.altriSussidi.trim().length).toBeGreaterThan(10);
      expect(plan.metodiStrumenti.ausiliDidattici.trim().length).toBeGreaterThan(10);
      expect(plan.metodiStrumenti.premessaMetodologica).toBe(met.premessaMetodologica);
      expect(plan.metodiStrumenti.didatticaDigitaleIntegrata).toBe(
        met.didatticaDigitaleIntegrata
      );

      expect(cur.competenzeDigitali.length).toBeGreaterThanOrEqual(2);
      expect(plan.curricolo.competenzeDigitali).toEqual(cur.competenzeDigitali);
      expect(plan.curricolo.attivitaProgrammate.trim().length).toBeGreaterThan(30);

      expect(ril.mezziIndividuazione.length).toBeGreaterThanOrEqual(2);
      expect(ril.fontiRilevazione.length).toBeGreaterThanOrEqual(4);

      premessaSet.add(plan.metodiStrumenti.premessaMetodologica);
      attivitaSet.add(plan.curricolo.attivitaProgrammate);
    }

    expect(premessaSet.size).toBe(15);
    expect(attivitaSet.size).toBe(15);
  });

  it('normalizza sempre titolo e firma al maschile (Prof. / Il docente) anche in presenza di prefissi Prof.ssa / La docente e genera DOCX/PDF coerenti', async () => {
    expect(formatDocenteConTitolo('Prof.ssa Mario Rossi', 'M')).toBe('Prof. Mario Rossi');
    expect(formatFirmaDocente('La docente Prof.ssa Mario Rossi', 'M')).toBe(
      'Il docente Prof. Mario Rossi'
    );
    expect(formatDocenteConTitolo('Il docente Prof. Luca Profeta', 'M')).toBe(
      'Prof. Luca Profeta'
    );
    expect(formatFirmaDocente('Prof. Anna Bianchi', 'F')).toBe('La docente Prof.ssa Anna Bianchi');

    const plan = createEmptyProgrammazione(DEFAULT_SCHOOL_SETTINGS, {
      disciplina: 'Storia',
      classe: 'Prima',
      sezione: 'A',
      docente: 'Prof.ssa Mario Rossi',
      docenteGenere: 'M',
    });
    plan.verificheValutazione.firmaDocente = 'La docente Prof.ssa Mario Rossi';

    const docxBytes = await generateProgrammazioneDocxBytes(plan, DEFAULT_SCHOOL_SETTINGS, mapping);
    const importedBack = await importProgrammazioneFromBuffer(
      docxBytes.buffer as ArrayBuffer,
      'verifica_genere.docx',
      DEFAULT_SCHOOL_SETTINGS
    );
    expect(importedBack.plan.datiGenerali.docenteGenere).toBe('M');

    const pdfBytes = generateProgrammazionePdfBytes(plan, DEFAULT_SCHOOL_SETTINGS, mapping);
    const pdfText = new TextDecoder('latin1').decode(pdfBytes);
    expect(pdfText).toContain('Prof. Mario Rossi');
    expect(pdfText).toContain('Il docente Prof. Mario Rossi');
    expect(pdfText).not.toContain('Prof.ssa');
    expect(pdfText).not.toContain('La docente');
  });

  it('per la Prima preseleziona competenze e obiettivi specifici in funzione dei contenuti della classe', () => {
    const matPrima = filterCatalogEntries(CURRICOLO_VERTICALE_SEED, 'Prima', 'Matematica');
    const matRes = computePreselectedCatalogIds(matPrima, 'Prima');
    // Tutte le conoscenze e abilità della Prima sono preselezionate
    const matPrimaCon = matPrima.filter((e) => e.tipo === 'conoscenza' || e.tipo === 'abilita');
    expect(matPrimaCon.every((e) => matRes.selectedIds.has(e.id))).toBe(true);
    // Competenze/obiettivi tipici di Seconda/Terza (radici, percentuali, irrazionali, rapporti) restano esclusi
    expect(matRes.selectedIds.has('cvn-matematica-prima-o13')).toBe(false);
    expect(matRes.selectedIds.has('cvn-matematica-prima-o15')).toBe(false);
    expect(matRes.selectedIds.has('cvn-matematica-prima-o17')).toBe(false);
    expect(matRes.selectedIds.has('cvn-matematica-prima-o18')).toBe(false);
    // Obiettivi coerenti con i contenuti della Prima (numeri naturali, potenze/fattori primi) restano preselezionati
    expect(matRes.selectedIds.has('cvn-matematica-prima-o10')).toBe(true);
    expect(matRes.selectedIds.has('cvn-matematica-prima-o16')).toBe(true);
    expect(matRes.alignedCompetenceIds.size).toBeGreaterThan(0);

    const sciPrima = filterCatalogEntries(CURRICOLO_VERTICALE_SEED, 'Prima', 'Scienze');
    const sciRes = computePreselectedCatalogIds(sciPrima, 'Prima');
    // Astronomia (Terza) e reazioni acido-base / fossili restano esclusi per i contenuti Prima
    expect(sciRes.selectedIds.has('cvn-scienze-prima-o12')).toBe(false);
    expect(sciRes.selectedIds.has('cvn-scienze-prima-o14')).toBe(false);
    expect(sciRes.selectedIds.has('cvn-scienze-prima-o15')).toBe(false);
    // Passaggi di stato e ciclo del carbonio (presenti nei contenuti Prima) sono preselezionati
    expect(sciRes.selectedIds.has('cvn-scienze-prima-o11')).toBe(true);
    expect(sciRes.selectedIds.has('cvn-scienze-prima-o17')).toBe(true);

    // Preselezione reattiva anche su contenuti personalizzati già presenti nel piano di Prima
    const customRes = computePreselectedCatalogIds(sciPrima, 'Prima', [
      'La cellula, la fotosintesi nelle piante e il ciclo del carbonio.',
    ]);
    expect(customRes.usedPlanContents).toBe(true);
    expect(customRes.selectedIds.has('cvn-scienze-prima-o11')).toBe(true);
    expect(customRes.selectedIds.has('cvn-scienze-prima-o17')).toBe(false);

    // Per la Terza tutte le voci della classe restano preselezionate
    const matTerza = filterCatalogEntries(CURRICOLO_VERTICALE_SEED, 'Terza', 'Matematica');
    const terzaRes = computePreselectedCatalogIds(matTerza, 'Terza');
    expect(terzaRes.selectedIds.size).toBe(matTerza.length);
  });
});
