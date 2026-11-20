import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';
import { isValidAccessPassword } from '../components/PasswordGate';
import defaultMappingRaw from '../data/defaultDocxMapping.json';
import defaultRulesRaw from '../data/defaultRules.json';
import { CLASS_QUICK_DESCRIPTIONS_ARCHIVE } from '../data/classQuickDescriptionsArchive';
import { CURRICOLO_VERTICALE_SEED } from '../data/curricoloCatalogSeed';
import {
  DEFAULT_QUICK_CLASS_SELECTION,
  QUICK_CLASS_QUESTIONS,
  generateQuickClassDescription,
  getQuickArchiveCombinationCount,
  getQuickArchiveVariants,
} from '../engine/quickClassDescriptionEngine';
import {
  DEFAULT_BES_INTERVENTI_TEXT,
  DEFAULT_DDI_TEXT,
  DEFAULT_PREMESSA_METODOLOGICA,
  DEFAULT_SCHOOL_SETTINGS,
  DEFAULT_SOGLIE_FASCE,
  DEFAULT_SOGLIE_QUOTE_CARATTERISTICHE,
  DEFAULT_VALUTAZIONE_TEXT,
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
  analyzeBackupMerge,
  computeMergedProgrammazioni,
  createBackupEnvelope,
  decryptBackupEnvelope,
  mergeItemsById,
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
  buildCurriculumSheetModel,
  buildProgramRowsFromCatalogVoices,
  computeCatalogDiff,
  computePreselectedCatalogIds,
  extractCompetenzeFromCatalogVoices,
  filterCatalogEntries,
  getCatalogEntryIndicazioniVersion,
  getDefaultIndicazioniForClasseAndYear,
  groupCatalogEntries,
  importCatalogEntriesToVoices,
  isVoiceRestorable,
  parseStartYearFromAnnoScolastico,
  reorderImportedVoices,
  resolveCatalogEntriesForCurriculum,
  resolveOtherClassesEntriesForCurriculum,
  restoreVoiceFromCatalog,
  validateCatalogJsonPayload,
} from '../engine/curricoloCatalogEngine';
import {
  applyUnrecognizedBlockAssignments,
  importProgrammazioneFromBuffer,
} from '../engine/documentPlanImporter';
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
import {
  buildLivelliTableClipboardContent,
  generateLivelliTableDocxBytes,
} from '../export/livelliTableExport';
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
    expect(sanitized.analisiPartenza.alunniAnonimiFasce).toHaveLength(1);
    expect(sanitized.analisiPartenza.alunniAnonimiFasce?.[0].nominativo).toBe('Mario Rossi');
    expect(sanitized.analisiPartenza.alunniAnonimiFasce?.[0].media).toBeNull();
    expect(sanitized.analisiPartenza.alunniAnonimiFasce?.[0].categoriaInclusione).toBeUndefined();
    expect(sanitized.analisiPartenza.alunniAnonimiFasce?.[0].riferimentoPiano).toBeUndefined();
    expect(sanitized.analisiPartenza.alunniAnonimiFasce?.[0].notaSensibileDocente).toBeUndefined();
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

  it('questionario classe contiene 17 indicatori coerenti con le caratteristiche della classe, esclude indicatori estranei e risposte vuote', () => {
    const keys = QUESTIONNAIRE_INDICATORS.map((i) => i.key);
    expect(keys).toHaveLength(17);
    expect(keys).toContain('comprensione');
    expect(keys).toContain('memorizzazione');
    expect(keys).toContain('capacitaApprendimento');
    // Indicatori non attinenti alle caratteristiche della classe (contesto, livelli iniziali, interventi) rimossi
    expect(keys).not.toContain('composizioneContinuita');
    expect(keys).not.toContain('livelliDistribuzione');
    expect(keys).not.toContain('strategiePersonalizzazione');
    expect(keys).not.toContain('puntiForzaCriticita');
    expect(QUESTIONNAIRE_INDICATORS.every((i) => (i.area as string) !== 'Interventi')).toBe(true);
    expect(QUESTIONNAIRE_INDICATORS.every((i) => (i.area as string) !== 'Contesto')).toBe(true);

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
    // Eventuali chiavi legacy in vecchi piani vengono ignorate nella generazione
    q.risposte.strategiePersonalizzazione = {
      selectedOption: 'Potenziamento delle eccellenze e consolidamento diffuso',
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
    expect(complete.toLowerCase()).not.toContain('eccellenze');

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
    expect(resultKeepNames.entries[0].nominativo).toBe('ROSSI MARIO');

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

    // Con elenco nominativo e note sensibili salvati offline: i nominativi compaiono nella riga dedicata di Livelli di partenza, mentre medie, BES/DSA/PEI e note restano rigorosamente privati
    const plan = createEmptyProgrammazione(DEFAULT_SCHOOL_SETTINGS);
    plan.analisiPartenza.alunniAnonimiFasce = withNotes;
    plan.analisiPartenza.livelli = computeLivelliFromStudents(withNotes);
    const docxBytes = await generateProgrammazioneDocxBytes(plan, DEFAULT_SCHOOL_SETTINGS, mapping);
    const docxZip = await JSZip.loadAsync(docxBytes.buffer as ArrayBuffer);
    const docxXml = await docxZip.file('word/document.xml')!.async('string');
    expect(docxXml).toContain('Rossi Mario');
    expect(docxXml).not.toContain('Nota riservata locale');
    expect(docxXml).not.toContain('5.49');
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
    const rulesCustom = createCustomDimension('Rispetto delle regole');
    expect(getCharacteristicsCatalogForDimension(rulesCustom)).toContain('rispettosa delle regole');
    expect(getCharacteristicsCatalogForDimension(rulesCustom)).not.toContain('pienamente autonoma');
    const expressiveCustom = createCustomDimension('Capacità espressive');
    expect(getCharacteristicsCatalogForDimension(expressiveCustom)).toEqual([]);

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
    const docxZipSci = await JSZip.loadAsync(docxBytes.buffer as ArrayBuffer);
    const docxXmlSci = await docxZipSci.file('word/document.xml')!.async('string');
    expect(docxBytes.byteLength).toBeGreaterThan(2000);
    expect(pdfBytes.byteLength).toBeGreaterThan(1500);
    expect(docxXmlSci).toContain('Alunno Segreto Test');
    expect(docxXmlSci).not.toContain('Presentazione e caratteristiche della classe:');
    expect(docxXmlSci).not.toContain('Autonomia digitale');
    expect(CURRICOLO_VERTICALE_SEED.length).toBeGreaterThanOrEqual(200);
  });

  it('titolo docente Prof./Prof.ssa, testo standard BES/PDP, presentazione alunni M/F, tabella 3 colonne, layout originale/moderno e import PDF/DOCX/DOC', async () => {
    // 1. Titolo e firma docente in base al sesso
    expect(formatDocenteConTitolo('Maria Rossi', 'F')).toBe('Prof.ssa Maria Rossi');
    expect(formatDocenteConTitolo('Marco Verdi', 'M')).toBe('Prof. Marco Verdi');
    expect(formatFirmaDocente('Maria Rossi', 'F')).toBe('La docente\nProf.ssa Maria Rossi');
    expect(formatFirmaDocente('Marco Verdi', 'M')).toBe('Il docente\nProf. Marco Verdi');

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
    plan.composizione = { alunni: 22, maschi: 12, femmine: 10, ripetenti: 1, bes: 3, disabilita: 0 };
    const introText = generateClassDescription(plan, 'sintetica');
    expect(introText).toContain('22 alunni (12 maschi e 10 femmine)');
    const distinctIntros = new Set<string>();
    for (let v = 0; v < 10; v++) {
      distinctIntros.add(buildClassCompositionIntro(plan, v));
    }
    expect(distinctIntros.size).toBe(10);

    // 3. Popolamento competenze dopo i Traguardi e tabella a 2 colonne dalle voci del catalogo
    const itaPrima = filterCatalogEntries(CURRICOLO_VERTICALE_SEED, 'Prima', 'Italiano');
    const voices = importCatalogEntriesToVoices(itaPrima);
    const competenzeList = extractCompetenzeFromCatalogVoices(voices);
    const programRows = buildProgramRowsFromCatalogVoices(voices, [], { indicazioniVersione: 'nuove' });
    expect(competenzeList.length).toBeGreaterThan(0);
    expect(programRows.length).toBeGreaterThan(0);
    expect(programRows[0].competenze ?? '').toBe('');
    plan.curricolo.competenzeAttese = competenzeList;
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
      expect(plan.metodiStrumenti.premessaMetodologica).toBe(DEFAULT_PREMESSA_METODOLOGICA);
      expect(plan.metodiStrumenti.didatticaDigitaleIntegrata).toBe(DEFAULT_DDI_TEXT);
      expect(plan.verificheValutazione.criteriValutazione).toBe(DEFAULT_VALUTAZIONE_TEXT);

      expect(cur.competenzeDigitali.length).toBeGreaterThanOrEqual(2);
      expect(plan.curricolo.competenzeDigitali).toEqual(cur.competenzeDigitali);
      expect(plan.curricolo.attivitaProgrammate.trim().length).toBeGreaterThan(30);

      expect(ril.mezziIndividuazione.length).toBeGreaterThanOrEqual(2);
      expect(ril.fontiRilevazione.length).toBeGreaterThanOrEqual(4);

      premessaSet.add(plan.metodiStrumenti.premessaMetodologica);
      attivitaSet.add(plan.curricolo.attivitaProgrammate);
    }

    // Premessa metodologica, DDI e Valutazione restano identiche al modello originale
    expect(premessaSet.size).toBe(1);
    expect(attivitaSet.size).toBe(15);
  });

  it('normalizza sempre titolo e firma al maschile (Prof. / Il docente) anche in presenza di prefissi Prof.ssa / La docente e genera DOCX/PDF coerenti', async () => {
    expect(formatDocenteConTitolo('Prof.ssa Mario Rossi', 'M')).toBe('Prof. Mario Rossi');
    expect(formatFirmaDocente('La docente Prof.ssa Mario Rossi', 'M')).toBe(
      'Il docente\nProf. Mario Rossi'
    );
    expect(formatDocenteConTitolo('Il docente Prof. Luca Profeta', 'M')).toBe(
      'Prof. Luca Profeta'
    );
    expect(formatFirmaDocente('Prof. Anna Bianchi', 'F')).toBe('La docente\nProf.ssa Anna Bianchi');

    const plan = createEmptyProgrammazione(DEFAULT_SCHOOL_SETTINGS, {
      disciplina: 'Storia',
      classe: 'Prima',
      sezione: 'A',
      docente: 'Prof.ssa Mario Rossi',
      docenteGenere: 'M',
    });
    plan.verificheValutazione.firmaDocente = 'La docente Prof.ssa Mario Rossi';

    const docxBytes = await generateProgrammazioneDocxBytes(plan, DEFAULT_SCHOOL_SETTINGS, mapping);
    const docxZip = await JSZip.loadAsync(docxBytes);
    const docXml = (await docxZip.file('word/document.xml')?.async('string')) ?? '';
    expect(docXml).toMatch(/Il docente[\s\S]*?<\/w:p>[\s\S]*?<w:p[\s\S]*?Prof\. Mario Rossi/);
    const importedBack = await importProgrammazioneFromBuffer(
      docxBytes.buffer as ArrayBuffer,
      'verifica_genere.docx',
      DEFAULT_SCHOOL_SETTINGS
    );
    expect(importedBack.plan.datiGenerali.docenteGenere).toBe('M');

    const pdfBytes = generateProgrammazionePdfBytes(plan, DEFAULT_SCHOOL_SETTINGS, mapping);
    const pdfText = new TextDecoder('latin1').decode(pdfBytes);
    expect(pdfText).toContain('Prof. Mario Rossi');
    expect(pdfText).toContain('Il docente');
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

  it('seleziona Nuove o Vecchie Indicazioni predefinite in base a classe e anno scolastico e filtra il catalogo', () => {
    expect(parseStartYearFromAnnoScolastico('2026/27')).toBe(2026);
    expect(parseStartYearFromAnnoScolastico('2027/28')).toBe(2027);
    expect(parseStartYearFromAnnoScolastico('2028/2029')).toBe(2028);

    // Fino al 2026/27: Nuove per Prima, Vecchie per Seconda e Terza
    expect(getDefaultIndicazioniForClasseAndYear('Prima', '2026/27')).toBe('nuove');
    expect(getDefaultIndicazioniForClasseAndYear('Seconda', '2026/27')).toBe('vecchie');
    expect(getDefaultIndicazioniForClasseAndYear('Terza', '2026/27')).toBe('vecchie');

    // Anno 2027/28: Nuove per Prima e Seconda, Vecchie per Terza
    expect(getDefaultIndicazioniForClasseAndYear('Prima', '2027/28')).toBe('nuove');
    expect(getDefaultIndicazioniForClasseAndYear('Seconda', '2027/28')).toBe('nuove');
    expect(getDefaultIndicazioniForClasseAndYear('Terza', '2027/28')).toBe('vecchie');

    // Anno >= 2028/29: Nuove per tutte le classi
    expect(getDefaultIndicazioniForClasseAndYear('Prima', '2028/29')).toBe('nuove');
    expect(getDefaultIndicazioniForClasseAndYear('Seconda', '2028/29')).toBe('nuove');
    expect(getDefaultIndicazioniForClasseAndYear('Terza', '2028/29')).toBe('nuove');
    expect(getDefaultIndicazioniForClasseAndYear('Terza', '2029/30')).toBe('nuove');

    // Filtro esplicito su Nuove vs Vecchie Indicazioni
    const itaSecNuove = filterCatalogEntries(
      CURRICOLO_VERTICALE_SEED,
      'Seconda',
      'Italiano',
      'nuove'
    );
    const itaSecVecchie = filterCatalogEntries(
      CURRICOLO_VERTICALE_SEED,
      'Seconda',
      'Italiano',
      'vecchie'
    );
    expect(itaSecNuove.length).toBeGreaterThan(0);
    expect(itaSecVecchie.length).toBeGreaterThan(0);
    expect(itaSecNuove.every((e) => getCatalogEntryIndicazioniVersion(e) === 'nuove')).toBe(true);
    expect(itaSecVecchie.every((e) => getCatalogEntryIndicazioniVersion(e) === 'vecchie')).toBe(true);

    // Creazione e clonazione impostano il riferimento predefinito coerente
    const sec2026 = createEmptyProgrammazione(DEFAULT_SCHOOL_SETTINGS, {
      classe: 'Seconda',
      annoScolastico: '2026/27',
    });
    expect(sec2026.curricolo.indicazioniVersione).toBe('vecchie');

    const sec2027 = createEmptyProgrammazione(DEFAULT_SCHOOL_SETTINGS, {
      classe: 'Seconda',
      annoScolastico: '2027/28',
    });
    expect(sec2027.curricolo.indicazioniVersione).toBe('nuove');

    const clonedTerza2028 = cloneProgrammazioneWithOptions({
      source: sec2026,
      settings: DEFAULT_SCHOOL_SETTINGS,
      preset: 'anno_precedente',
      sections: getSectionOptionsForPreset('anno_precedente'),
      overrides: {
        disciplina: sec2026.datiGenerali.disciplina,
        classe: 'Terza',
        sezione: sec2026.datiGenerali.sezione,
        annoScolastico: '2028/29',
        plesso: sec2026.datiGenerali.plesso,
        docente: sec2026.datiGenerali.docente,
      },
    });
    expect(clonedTerza2028.curricolo.indicazioniVersione).toBe('nuove');
  });

  it('password gate accetta "canepastore" in modo case-insensitive e rifiuta altre chiavi', () => {
    expect(isValidAccessPassword('canepastore')).toBe(true);
    expect(isValidAccessPassword('CANEPASTORE')).toBe(true);
    expect(isValidAccessPassword('  CanePastore  ')).toBe(true);
    expect(isValidAccessPassword('sbagliata')).toBe(false);
    expect(isValidAccessPassword('')).toBe(false);
  });

  it('modello originale 4 pagine: esporta piano vuoto, completo e testi lunghi con banner PNG, font Arial, interruzione pagina 4 e round-trip importazione fedele', async () => {
    // 1. Programmazione vuota: conserva tutte le sezioni, inserisce il banner PNG, Arial, cantSplit e pageBreakBefore
    const emptyPlan = createEmptyProgrammazione(DEFAULT_SCHOOL_SETTINGS, {
      disciplina: 'Tecnologia',
      classe: 'Prima',
      sezione: 'A',
      layoutDocumento: 'originale',
    });
    emptyPlan.datiGenerali.docente = '';
    emptyPlan.verificheValutazione.firmaDocente = '';
    emptyPlan.analisiPartenza.descrizioneDisciplinare = '';
    emptyPlan.interventi.besInterventiProgrammati = '';
    emptyPlan.metodiStrumenti.ausiliDidattici = '';
    emptyPlan.curricolo.righeAbilitaConoscenze = [];

    const emptyDocxBytes = await generateProgrammazioneDocxBytes(
      emptyPlan,
      DEFAULT_SCHOOL_SETTINGS,
      mapping
    );
    const emptyZip = await JSZip.loadAsync(emptyDocxBytes.buffer as ArrayBuffer);
    const mediaFiles = Object.keys(emptyZip.files).filter((k) => k.startsWith('word/media/'));
    expect(mediaFiles.length).toBeGreaterThanOrEqual(1);
    const documentXml = await emptyZip.file('word/document.xml')!.async('string');
    expect(documentXml).toContain('Arial');
    expect(documentXml).toContain('w:cantSplit');
    expect(documentXml).toContain('w:pageBreakBefore');
    expect(documentXml).toContain('AUSILI DIDATTICI');
    expect(documentXml).toContain('VERIFICHE IN ITINERE: MODALIT');
    expect(documentXml).toContain('VALUTAZIONE');
    expect(documentXml).toContain('Il/La Docente');

    const emptyPdfBytes = generateProgrammazionePdfBytes(
      emptyPlan,
      DEFAULT_SCHOOL_SETTINGS,
      mapping
    );
    expect(String.fromCharCode(emptyPdfBytes[0], emptyPdfBytes[1], emptyPdfBytes[2], emptyPdfBytes[3])).toBe(
      '%PDF'
    );

    // 2. Programmazione completamente compilata con testi lunghi multi-linea
    const fullPlan = createEmptyProgrammazione(DEFAULT_SCHOOL_SETTINGS, {
      disciplina: 'Italiano',
      classe: 'Seconda',
      sezione: 'B',
      annoScolastico: '2026/27',
      plesso: 'Villafrati',
      docente: 'Elena Greco',
      docenteGenere: 'F',
      layoutDocumento: 'originale',
    });
    fullPlan.composizione = { alunni: 24, maschi: 11, femmine: 13, ripetenti: 1, bes: 3, disabilita: 2 };
    fullPlan.situazione.tipologie = ['tranquilla', 'collaborativa', 'motivata'];
    fullPlan.situazione.livello = 'medio-alto';
    fullPlan.situazione.mezziIndividuazione = [
      'Prove di ingresso',
      'Osservazioni sistematiche scritte ed orali appositamente predisposte',
    ];
    fullPlan.analisiPartenza.descrizioneDisciplinare = Array.from({ length: 8 }, (_, idx) =>
      `Paragrafo ${idx + 1} di analisi dettagliata della situazione iniziale della classe con osservazioni puntuali sulle abilità di lettura, comprensione e produzione scritta.`
    ).join('\n');
    fullPlan.analisiPartenza.livelli = {
      bassoAlunni: 2,
      medioBassoAlunni: 5,
      medioAlunni: 11,
      altoAlunni: 6,
    };
    fullPlan.analisiPartenza.altraFonte = 'Colloqui con referente BES';
    fullPlan.interventi.potenziamentoAltro = 'Laboratorio di scrittura creativa';
    fullPlan.interventi.consolidamentoAltro = 'Tutoraggio tra pari';
    fullPlan.interventi.recuperoAltro = 'Sportello pomeridiano settimanale';
    fullPlan.interventi.besInterventiProgrammati =
      'Misure compensative e dispensative coerenti con i rispettivi PDP e PEI approvati dal Consiglio di Classe.';
    fullPlan.curricolo.righeAbilitaConoscenze = [
      {
        id: 'r-full-1',
        competenze: 'Padroneggiare gli strumenti espressivi ed argomentativi.',
        abilita:
          'Leggere e comprendere testi espositivi e narrativi complessi.\nIndividuare informazioni esplicite e implicite.',
        conoscenze:
          'Struttura del testo narrativo ed espositivo.\nElementi di analisi logica del periodo.',
      },
      {
        id: 'r-full-2',
        competenze: 'Produrre testi scritti coerenti e corretti.',
        abilita: 'Pianificare e revisionare elaborati di diversa tipologia.',
        conoscenze: 'Ortografia, punteggiatura, connettivi testuali.',
      },
    ];
    fullPlan.curricolo.attivitaProgrammate = 'Letture animate e progetto biblioteca scolastica.';
    fullPlan.metodiStrumenti.altreMetodologie = 'Brainstorming e Circle time';
    fullPlan.metodiStrumenti.altriSussidi = 'Dizionario digitale e mappe cartacee';
    fullPlan.metodiStrumenti.ausiliDidattici = 'Antologia in adozione e quaderno operativo.';
    fullPlan.verificheValutazione.altriTipiProve = 'Compiti autentici semestrali';

    const fullDocxBytes = await generateProgrammazioneDocxBytes(
      fullPlan,
      DEFAULT_SCHOOL_SETTINGS,
      mapping
    );
    const fullPdfBytes = generateProgrammazionePdfBytes(
      fullPlan,
      DEFAULT_SCHOOL_SETTINGS,
      mapping
    );
    expect(fullDocxBytes.byteLength).toBeGreaterThan(emptyDocxBytes.byteLength);
    expect(fullPdfBytes.byteLength).toBeGreaterThan(emptyPdfBytes.byteLength);

    // 3. Round-trip importazione del DOCX originale compilato
    const rt = await importProgrammazioneFromBuffer(
      fullDocxBytes.buffer as ArrayBuffer,
      'programmazione_italiano_2B.docx',
      DEFAULT_SCHOOL_SETTINGS
    );
    expect(rt.plan.datiGenerali.disciplina).toBe('Italiano');
    expect(rt.plan.datiGenerali.classe).toBe('Seconda');
    expect(rt.plan.datiGenerali.sezione).toBe('B');
    expect(rt.plan.datiGenerali.annoScolastico).toBe('2026/27');
    expect(rt.plan.datiGenerali.plesso).toBe('Villafrati');
    expect(rt.plan.datiGenerali.docente).toBe('Elena Greco');
    expect(rt.plan.datiGenerali.docenteGenere).toBe('F');
    expect(rt.plan.composizione).toEqual(fullPlan.composizione);
    expect(rt.plan.situazione.tipologie).toEqual(['tranquilla', 'collaborativa', 'motivata']);
    expect(rt.plan.situazione.livello).toBe('medio-alto');
    expect(rt.plan.analisiPartenza.livelli).toEqual(fullPlan.analisiPartenza.livelli);
    expect(rt.plan.analisiPartenza.descrizioneDisciplinare).toContain('Paragrafo 8');
    expect(rt.plan.analisiPartenza.altraFonte).toBe('Colloqui con referente BES');
    expect(rt.plan.interventi.potenziamentoAltro).toBe('Laboratorio di scrittura creativa');
    expect(rt.plan.interventi.consolidamentoAltro).toBe('Tutoraggio tra pari');
    expect(rt.plan.interventi.recuperoAltro).toBe('Sportello pomeridiano settimanale');
    expect(rt.plan.interventi.besInterventiProgrammati).toContain('PDP e PEI');
    expect(rt.plan.curricolo.righeAbilitaConoscenze).toHaveLength(2);
    expect(rt.plan.curricolo.attivitaProgrammate).toBe(
      'Letture animate e progetto biblioteca scolastica.'
    );
    expect(rt.plan.metodiStrumenti.altreMetodologie).toBe('Brainstorming e Circle time');
    expect(rt.plan.metodiStrumenti.altriSussidi).toBe('Dizionario digitale e mappe cartacee');
    expect(rt.plan.metodiStrumenti.ausiliDidattici).toBe(
      'Antologia in adozione e quaderno operativo.'
    );
    expect(rt.plan.verificheValutazione.altriTipiProve).toBe('Compiti autentici semestrali');
    expect(rt.recognizedFields.length).toBeGreaterThanOrEqual(10);

    // 4. Importazione modello .doc HTML-like (tipologie con [X] a destra, composizione 1-riga, tabella 2 colonne ABILITÀ/CONOSCENZE e blocco ambiguo)
    const htmlLegacyDoc = `<!DOCTYPE html><html><body>
      <p>PROGRAMMAZIONE DISCIPLINARE di Storia</p>
      <p>PLESSO DI Mezzojuso</p>
      <p>ANNO SCOLASTICO 2025/26</p>
      <p>CLASSE Terza C</p>
      <p>DISCIPLINA Storia</p>
      <p>DOCENTE Prof. Luca Ferri</p>
      <p>COMPOSIZIONE DELLA CLASSE</p>
      <table><tr>
        <td>Alunni: 19</td><td>Maschi: 10</td><td>Femmine: 9</td><td>Ripetenti: 0</td><td>Con Bisogni Educativi Speciali (BES): 2</td>
      </tr></table>
      <p>SITUAZIONE DELLA CLASSE</p>
      <table>
        <tr><td colspan="2">TIPOLOGIA</td><td>LIVELLO</td></tr>
        <tr><td colspan="2">tranquilla [X] motivata [X] vivace [ ]</td><td>☒ medio</td></tr>
      </table>
      <table>
        <tr><td>ABILITA'</td><td>CONOSCENZE</td></tr>
        <tr><td>Collocare eventi storici sulla linea del tempo.</td><td>Le due guerre mondiali e la Costituzione italiana.</td></tr>
      </table>
      <p>Nota libera fuori sezione sul progetto memoria storica e visite guidate ai musei cittadini.</p>
      <p>Il docente Prof. Luca Ferri</p>
    </body></html>`;

    const htmlBuf = new TextEncoder().encode(htmlLegacyDoc).buffer;
    const htmlImport = await importProgrammazioneFromBuffer(
      htmlBuf,
      'vecchio_storia_3C.doc',
      DEFAULT_SCHOOL_SETTINGS
    );
    expect(htmlImport.plan.datiGenerali.disciplina).toBe('Storia');
    expect(htmlImport.plan.datiGenerali.classe).toBe('Terza');
    expect(htmlImport.plan.datiGenerali.sezione).toBe('C');
    expect(htmlImport.plan.datiGenerali.docenteGenere).toBe('M');
    expect(htmlImport.plan.composizione).toEqual({
      alunni: 19,
      maschi: 10,
      femmine: 9,
      ripetenti: 0,
      bes: 2,
      disabilita: 0,
    });
    expect(htmlImport.plan.situazione.tipologie).toEqual(['tranquilla', 'motivata']);
    expect(htmlImport.plan.situazione.livello).toBe('medio');
    expect(htmlImport.plan.curricolo.righeAbilitaConoscenze).toHaveLength(1);
    expect(htmlImport.plan.curricolo.righeAbilitaConoscenze[0].abilita).toContain(
      'Collocare eventi storici'
    );
    expect(
      htmlImport.unrecognizedBlocks.some((b) => b.text.includes('progetto memoria storica'))
    ).toBe(true);

    // Assegnazione manuale del blocco non riconosciuto ad Attività programmate
    const targetBlk = htmlImport.unrecognizedBlocks.find((b) =>
      b.text.includes('progetto memoria storica')
    )!;
    const assignedPlan = applyUnrecognizedBlockAssignments(
      htmlImport.plan,
      htmlImport.unrecognizedBlocks,
      { [targetBlk.id]: 'curricolo.attivitaProgrammate' }
    );
    expect(assignedPlan.curricolo.attivitaProgrammate).toContain('progetto memoria storica');
  });

  it('ricostruisce righe curricolo multi-linea, tabelle spezzate senza intestazione ripetuta, Wingdings e merge ultima riga', async () => {
    const complexHtml = `<!DOCTYPE html><html><body>
      <p>PLESSO DI Villafrati | ANNO SCOLASTICO 2025-2026</p>
      <p>CLASSE 1^ B | DISCIPLINA Matematica</p>
      <p>DOCENTE Prof.ssa Anna Conti</p>
      <p>SITUAZIONE DELLA CLASSE</p>
      <p>TIPOLOGIA: vivace - x | collaborativa \uF0FE | problematica \uF0A8</p>
      <p>LIVELLO: medio ✓</p>
      <table>
        <tr><td>NUCLEO TEMATICO</td><td>OBIETTIVI SPECIFICI</td><td>ARGOMENTI</td></tr>
        <tr><td>Numeri</td><td>Eseguire le quattro operazioni con i numeri naturali e decimali.</td><td>Il sistema di numerazione decimale, proprietà delle operazioni.</td></tr>
      </table>
      <table>
        <tr><td>Geometria</td><td>Riconoscere e classificare le principali figure piane.</td><td>Enti geometrici fondamentali, angoli e poligoni.</td></tr>
      </table>
      <p>ATTIVITA' PROGRAMMATE: Giochi matematici d'autunno.</p>
      <p>Approfondimento sulle frazioni equivalenti e problemi geometrici.</p>
    </body></html>`;

    const res = await importProgrammazioneFromBuffer(
      new TextEncoder().encode(complexHtml).buffer,
      'matematica_1B.doc',
      DEFAULT_SCHOOL_SETTINGS
    );

    expect(res.plan.datiGenerali.annoScolastico).toBe('2025/26');
    expect(res.plan.datiGenerali.classe).toBe('Prima');
    expect(res.plan.datiGenerali.sezione).toBe('B');
    expect(res.plan.datiGenerali.disciplina).toBe('Matematica');
    expect(res.plan.datiGenerali.docenteGenere).toBe('F');
    expect(res.plan.situazione.tipologie).toEqual(['vivace', 'collaborativa']);
    expect(res.plan.situazione.livello).toBe('medio');
    expect(res.plan.curricolo.righeAbilitaConoscenze).toHaveLength(2);
    expect(res.plan.curricolo.righeAbilitaConoscenze[0].competenze).toContain('Numeri');
    expect(res.plan.curricolo.righeAbilitaConoscenze[1].competenze).toContain('Geometria');
    expect(res.plan.curricolo.righeAbilitaConoscenze[1].conoscenze).toContain('angoli e poligoni');

    // Simula riga spezzata da PDF (senza <table> HTML, solo righe pipe '|' + riga a capo di continuazione)
    const wrappedLinesHtml = `<!DOCTYPE html><html><body>
      <p>DISCIPLINA Geografia</p>
      <p>CLASSE 2^ A | ANNO SCOLASTICO 2025/26</p>
      <p>COMPETENZE | ABILITA' | CONOSCENZE</p>
      <p>Orientarsi nello spazio | Leggere carte fisiche e politiche | L'Italia e le sue regioni</p>
      <p>utilizzando coordinate geografiche e ridurre in scala le distanze reali.</p>
      <p>ATTIVITA' PROGRAMMATE: Uscita sul territorio.</p>
    </body></html>`;

    const wrappedRes = await importProgrammazioneFromBuffer(
      new TextEncoder().encode(wrappedLinesHtml).buffer,
      'geografia_2A_pdf_like.doc',
      DEFAULT_SCHOOL_SETTINGS
    );
    expect(wrappedRes.plan.curricolo.righeAbilitaConoscenze).toHaveLength(1);
    expect(wrappedRes.plan.curricolo.righeAbilitaConoscenze[0].conoscenze).toContain(
      'ridurre in scala le distanze reali'
    );

    // Verifica merge su ultima riga via applyUnrecognizedBlockAssignments
    const extraBlk = res.unrecognizedBlocks.find((b) =>
      b.text.includes('frazioni equivalenti')
    );
    expect(extraBlk).toBeDefined();
    const mergedPlan = applyUnrecognizedBlockAssignments(
      res.plan,
      res.unrecognizedBlocks,
      { [extraBlk!.id]: 'curricolo.mergeLastRowConoscenze' }
    );
    expect(mergedPlan.curricolo.righeAbilitaConoscenze[1].conoscenze).toContain(
      'frazioni equivalenti'
    );
  });

  it('rispetta il modello fedele: descrizione unica dopo Analisi, Con disabilità, riga alunni nei Livelli, raggruppamento nuclei Matematica/Scienze con digitale in coda e import PDF/HTML avanzato', async () => {
    // 1. Matematica e Scienze raggruppano i contenuti per nuclei autentici e mettono il digitale in coda
    const matTerza = filterCatalogEntries(CURRICOLO_VERTICALE_SEED, 'Terza', 'Matematica', 'nuove');
    const matVoices = [
      ...importCatalogEntriesToVoices(matTerza),
      {
        id: 'dig-mat-test',
        classeOrigine: 'Terza' as const,
        disciplina: 'Matematica',
        tipo: 'conoscenza' as const,
        nucleoTematico: 'Digitale e STEAM',
        testo: 'Foglio di calcolo per analisi dati e grafici.',
        testoOriginale: 'Foglio di calcolo per analisi dati e grafici.',
        documentoProvenienza: 'Curricolo verticale nuovo',
      },
    ];
    const matRows = buildProgramRowsFromCatalogVoices(matVoices, [], {
      indicazioniVersione: 'nuove',
    });
    const matNuclei = matRows.map((r) => r.traguardo);
    expect(matNuclei[0]).toBe('Numeri');
    expect(matNuclei).toContain('Spazio e figure');
    expect(matNuclei).toContain('Relazioni e funzioni');
    const lastMatRow = matRows[matRows.length - 1];
    expect((lastMatRow.traguardo ?? '').toLowerCase()).toMatch(/digitale|steam|cittadinanza/);

    const sciPrima = filterCatalogEntries(CURRICOLO_VERTICALE_SEED, 'Prima', 'Scienze', 'nuove');
    const sciRows = buildProgramRowsFromCatalogVoices(importCatalogEntriesToVoices(sciPrima), [], {
      indicazioniVersione: 'nuove',
    });
    expect(sciRows.some((r) => (r.traguardo ?? '').includes('Biologia'))).toBe(true);
    expect(sciRows.some((r) => (r.traguardo ?? '').includes('Fisica'))).toBe(true);
    expect((sciRows[sciRows.length - 1].traguardo ?? '').toLowerCase()).toMatch(/digitale|steam/);

    // 2. Export DOCX/PDF con alunni nelle fasce di livello, Con disabilità e header OBIETTIVI vs ABILITÀ
    const planNuove = createEmptyProgrammazione(DEFAULT_SCHOOL_SETTINGS, {
      disciplina: 'Scienze',
      classe: 'Prima',
      sezione: 'A',
      layoutDocumento: 'originale',
    });
    planNuove.composizione = { alunni: 20, maschi: 10, femmine: 10, ripetenti: 0, bes: 2, disabilita: 1 };
    planNuove.analisiPartenza.descrizioneDisciplinare =
      'Classe partecipe e collaborativa nelle attività laboratoriali.';
    planNuove.analisiPartenza.alunniAnonimiFasce = [
      createManualStudentEntry([], { nominativo: 'Bianchi Luca', media: 5.0 }, DEFAULT_SOGLIE_FASCE),
      createManualStudentEntry([], { nominativo: 'Verdi Anna', media: 9.2 }, DEFAULT_SOGLIE_FASCE),
    ];
    planNuove.analisiPartenza.livelli = computeLivelliFromStudents(
      planNuove.analisiPartenza.alunniAnonimiFasce
    );
    planNuove.curricolo.competenzeAttese = extractCompetenzeFromCatalogVoices(
      importCatalogEntriesToVoices(sciPrima)
    );
    planNuove.curricolo.righeAbilitaConoscenze = sciRows;

    const docxNuove = await generateProgrammazioneDocxBytes(planNuove, DEFAULT_SCHOOL_SETTINGS, mapping);
    const zipNuove = await JSZip.loadAsync(docxNuove.buffer as ArrayBuffer);
    const xmlNuove = await zipNuove.file('word/document.xml')!.async('string');
    expect(xmlNuove).toContain('Con disabilit');
    expect(xmlNuove).toContain('OBIETTIVI');
    expect(xmlNuove).toContain('Competenze digitali:');
    expect(xmlNuove).toContain('Bianchi Luca');
    expect(xmlNuove).toContain('Verdi Anna');
    expect(xmlNuove).not.toContain('Presentazione e caratteristiche della classe:');

    // Round-trip PDF completo (inclusa ricostruzione tabella curricolo 2 colonne + 4 box livelli con nomi!)
    const pdfNuove = generateProgrammazionePdfBytes(planNuove, DEFAULT_SCHOOL_SETTINGS, mapping);
    const rtPdf = await importProgrammazioneFromBuffer(
      pdfNuove.buffer as ArrayBuffer,
      'scienze_1A_nuove.pdf',
      DEFAULT_SCHOOL_SETTINGS
    );
    expect(rtPdf.plan.curricolo.indicazioniVersione).toBe('nuove');
    expect(rtPdf.plan.composizione.disabilita).toBe(1);
    expect(rtPdf.plan.analisiPartenza.livelli.bassoAlunni).toBe(1);
    expect(rtPdf.plan.analisiPartenza.livelli.altoAlunni).toBe(1);
    expect(rtPdf.plan.analisiPartenza.alunniAnonimiFasce?.map((s) => s.nominativo)).toEqual(
      expect.arrayContaining(['Bianchi Luca', 'Verdi Anna'])
    );
    expect(rtPdf.plan.curricolo.righeAbilitaConoscenze.length).toBeGreaterThanOrEqual(2);

    // 3. Import HTML modello con "H: 2", opzioni barrate <s>, "SEZ. D", grassetto/subset senza caselle, A.S. 25/26, righe nucleo e intestazione ABILITÀ ripetuta
    const legacyModelHtml = `<!DOCTYPE html><html><body>
      <p>PROGRAMMAZIONE DISCIPLINARE di Scienze</p>
      <p>CLASSE Terza - Sez. D | A.S. 25/26 | PLESSO DI Villafrati</p>
      <p>DOCENTE Prof.ssa Chiara Longo</p>
      <p>COMPOSIZIONE DELLA CLASSE</p>
      <table><tr>
        <td>Alunni: 21</td><td>Maschi: 11</td><td>Femmine: 10</td><td>Ripetenti: 1</td><td>Con Bisogni Educativi Speciali (BES): 3</td><td>H: 2</td>
      </tr></table>
      <p>SITUAZIONE DELLA CLASSE</p>
      <table>
        <tr><td>TIPOLOGIA</td><td>LIVELLO</td></tr>
        <tr><td><s>problematica</s> collaborativa</td><td>medio</td></tr>
      </table>
      <table>
        <tr><td>ABILITA'</td><td>CONOSCENZE</td></tr>
        <tr><td colspan="2">Biologia</td></tr>
        <tr><td>Osservare fenomeni naturali.</td><td>La cellula e gli esseri viventi.</td></tr>
        <tr><td>ABILITA'</td><td>CONOSCENZE</td></tr>
        <tr><td>Classificare le rocce.</td><td>Litosfera e vulcani.</td></tr>
      </table>
      <p>CRITERI METODOLOGICI, STRATEGIE, STRUMENTI</p>
      <p>Lavoro laboratoriale e didattica attiva centrata sull'esperienza diretta.</p>
      <table>
        <tr><td>METODI</td><td>MEZZI E STRUMENTI</td></tr>
        <tr>
          <td><ul><li><b>Metodo induttivo</b></li><li>Metodo deduttivo</li><li>Lezione frontale</li><li>Cooperative learning</li></ul></td>
          <td><ul><li>Libri di testo</li><li><s>Cartelloni</s></li><li>Presentazioni multimediali</li></ul></td>
        </tr>
      </table>
      <p>VERIFICHE IN ITINERE: MODALITÀ</p>
      <table>
        <tr><td>SCRITTA</td><td>ORALE</td></tr>
        <tr><td><ul><li>Prove strutturate</li></ul></td><td><ul><li>Interrogazioni</li></ul></td></tr>
      </table>
      <p>CRITERI DI VALUTAZIONE:</p>
      <p>La valutazione terrà conto del percorso formativo, dell'impegno e dei progressi individuali.</p>
      <p>La docente Prof.ssa Chiara Longo</p>
    </body></html>`;
    const legacyImp = await importProgrammazioneFromBuffer(
      new TextEncoder().encode(legacyModelHtml).buffer,
      'scienze_3D.doc',
      DEFAULT_SCHOOL_SETTINGS
    );
    expect(legacyImp.plan.datiGenerali.annoScolastico).toBe('2025/26');
    expect(legacyImp.plan.datiGenerali.classe).toBe('Terza');
    expect(legacyImp.plan.datiGenerali.sezione).toBe('D');
    expect(legacyImp.plan.datiGenerali.plesso).toBe('Villafrati');
    expect(legacyImp.plan.composizione.disabilita).toBe(2);
    expect(legacyImp.plan.situazione.livello).toBe('medio');
    expect(legacyImp.plan.curricolo.indicazioniVersione).toBe('vecchie');
    expect(legacyImp.plan.curricolo.righeAbilitaConoscenze).toHaveLength(2);
    expect(legacyImp.plan.curricolo.righeAbilitaConoscenze[0].traguardo).toBe('Biologia');
    expect(legacyImp.plan.metodiStrumenti.metodi).toEqual(['Metodo induttivo']);
    expect(legacyImp.plan.verificheValutazione.verificheScritte).toEqual(['Prove strutturate']);
    expect(legacyImp.plan.verificheValutazione.verificheOrali).toEqual(['Interrogazioni']);
    expect(legacyImp.plan.verificheValutazione.criteriValutazione).toContain('progressi individuali');
  });

  it('mantiene testi fissi di Metodologia/DDI/Valutazione, fonde nuclei con digitale in coda e normalizza tabelle a 3 colonne in 1+2 colonne', async () => {
    // 1. Tutte le 15 discipline mantengono invariati i 3 testi istituzionali del modello
    for (const disc of DISCIPLINE_SECONDARIA) {
      const mDef = getDefaultMetodiStrumentiForDisciplina(disc);
      const vDef = getDefaultVerificheValutazioneForDisciplina(disc);
      expect(mDef.premessaMetodologica).toBe(DEFAULT_PREMESSA_METODOLOGICA);
      expect(mDef.didatticaDigitaleIntegrata).toBe(DEFAULT_DDI_TEXT);
      expect(vDef.criteriValutazione).toBe(DEFAULT_VALUTAZIONE_TEXT);
    }

    // 2. Importazione incrementale da catalogo fonde per nucleo e lascia sempre i contenuti digitali in coda
    const itaSeconda = filterCatalogEntries(CURRICOLO_VERTICALE_SEED, 'Seconda', 'Italiano', 'nuove');
    const firstBatch = buildProgramRowsFromCatalogVoices(
      importCatalogEntriesToVoices(itaSeconda.filter((e) => e.nucleoTematico.includes('Digitale'))),
      [],
      { indicazioniVersione: 'nuove' }
    );
    const mergedIta = buildProgramRowsFromCatalogVoices(
      importCatalogEntriesToVoices(itaSeconda.filter((e) => !e.nucleoTematico.includes('Digitale'))),
      firstBatch,
      { indicazioniVersione: 'nuove' }
    );
    expect(mergedIta[mergedIta.length - 1].traguardo?.toLowerCase()).toMatch(/digitale|rete/);

    // 3. Importazione di una tabella esterna a 3 colonne promuove le competenze in competenzeAttese (dopo i Traguardi)
    const legacyThreeColHtml = `<!DOCTYPE html><html><body>
      <p>PROGRAMMAZIONE DISCIPLINARE di Scienze</p>
      <p>CLASSE 2^ B | A.S. 2025/26</p>
      <table>
        <tr><td>COMPETENZE</td><td>ABILITA'</td><td>CONOSCENZE</td></tr>
        <tr>
          <td>Osserva, analizza e descrive fenomeni appartenenti alla realtà naturale</td>
          <td>Descrivere la struttura della cellula e i principali tessuti</td>
          <td>La cellula eucariote e procariote, i tessuti vegetali e animali</td>
        </tr>
      </table>
    </body></html>`;
    const imported3Col = await importProgrammazioneFromBuffer(
      new TextEncoder().encode(legacyThreeColHtml).buffer,
      'scienze_2B_3col.doc',
      DEFAULT_SCHOOL_SETTINGS
    );
    expect(imported3Col.plan.curricolo.competenzeAttese.some((c) =>
      c.includes('fenomeni appartenenti alla realtà naturale')
    )).toBe(true);

    // 4. Verifica PDF e DOCX: struttura a 1 colonna (Competenze + Competenze digitali) sopra tabella a 2 colonne
    const planExport = createEmptyProgrammazione(DEFAULT_SCHOOL_SETTINGS, {
      disciplina: 'Matematica',
      classe: 'Seconda',
      sezione: 'C',
      annoScolastico: '2026/27',
      indicazioniVersione: 'vecchie',
    });
    planExport.curricolo.competenzeAttese = [
      'Utilizza con sicurezza le procedure di calcolo aritmetico e algebrico.',
    ];
    planExport.curricolo.competenzeDigitali = [
      'Utilizza fogli di calcolo per rappresentare dati e formule.',
    ];
    planExport.curricolo.righeAbilitaConoscenze = buildProgramRowsFromCatalogVoices(
      importCatalogEntriesToVoices(
        filterCatalogEntries(CURRICOLO_VERTICALE_SEED, 'Seconda', 'Matematica')
      ),
      [],
      { indicazioniVersione: 'vecchie' }
    );

    const docxVecchie = await generateProgrammazioneDocxBytes(
      planExport,
      DEFAULT_SCHOOL_SETTINGS,
      mapping
    );
    const zipVecchie = await JSZip.loadAsync(docxVecchie.buffer as ArrayBuffer);
    const xmlVecchie = await zipVecchie.file('word/document.xml')!.async('string');
    const idxComp = xmlVecchie.indexOf('Competenze:');
    const idxDig = xmlVecchie.indexOf('Competenze digitali:');
    const idxNota = xmlVecchie.indexOf('Tenuto conto');
    const idxAbil = xmlVecchie.indexOf('ABILITÀ');
    const idxCon = xmlVecchie.indexOf('CONOSCENZE');
    expect(idxComp).toBeGreaterThan(-1);
    expect(idxDig).toBeGreaterThan(idxComp);
    expect(idxNota).toBeGreaterThan(idxDig);
    expect(idxAbil).toBeGreaterThan(idxNota);
    expect(idxCon).toBeGreaterThan(idxAbil);

    const pdfVecchie = generateProgrammazionePdfBytes(
      planExport,
      DEFAULT_SCHOOL_SETTINGS,
      mapping
    );
    const pdfRt = await importProgrammazioneFromBuffer(
      pdfVecchie.buffer as ArrayBuffer,
      'matematica_2C_vecchie.pdf',
      DEFAULT_SCHOOL_SETTINGS
    );
    expect(pdfRt.plan.curricolo.indicazioniVersione).toBe('vecchie');
    expect(pdfRt.plan.curricolo.competenzeAttese.some((c) => c.includes('calcolo aritmetico'))).toBe(
      true
    );
    expect(pdfRt.plan.curricolo.competenzeDigitali.some((c) => c.includes('fogli di calcolo'))).toBe(
      true
    );
  });

  it('importa registri .xls/.xlsx con intestazioni Cognome+Nome, Alunni, date, HTML .xls, esporta nominativi nel documento e genera solo tabella DOCX/Word-Writer', async () => {
    // 1. Workbook multi-foglio con Cognome + Nome separati e sole colonne date
    const wb = XLSX.utils.book_new();
    const coverSheet = XLSX.utils.aoa_to_sheet([['Copertina Registro'], ['Anno 2025/2026']]);
    const dataSheet = XLSX.utils.aoa_to_sheet([
      ['1B ORDINARIO (ITALIANO)'],
      ['N.', 'Cognome', 'Nome', '15/09', '22/09', 'Media'],
      ['1', 'Esposito', 'Chiara', '9', '9+', ''],
      ['2', 'De Luca', 'Matteo', '7½', '7', ''],
      ['3', 'Conti', 'Elena', '6', '6-', ''],
      ['4', 'Moretti', 'Luca', '5', '5-', ''],
      ['Totale alunni', '4', '', '', '', ''],
    ]);
    XLSX.utils.book_append_sheet(wb, coverSheet, 'Copertina');
    XLSX.utils.book_append_sheet(wb, dataSheet, 'Voti');
    const xlsxBuf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;

    const parsed = parseGradebookBuffer(xlsxBuf, DEFAULT_SOGLIE_FASCE, { keepNames: true });
    expect(parsed.classeRilevata).toBe('1B ORDINARIO (ITALIANO)');
    expect(parsed.entries).toHaveLength(4);
    expect(parsed.entries.map((e) => e.nominativo)).toEqual([
      'Esposito Chiara',
      'De Luca Matteo',
      'Conti Elena',
      'Moretti Luca',
    ]);
    expect(parsed.livelli).toEqual({
      bassoAlunni: 1,
      medioBassoAlunni: 1,
      medioAlunni: 1,
      altoAlunni: 1,
    });

    // 2. HTML-disguised .xls con intestazione "Alunni" e accenti italiani
    const htmlXls = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>
      <table>
        <tr><th>Alunni</th><th>Media voti</th></tr>
        <tr><td>Niccolò Brambilla</td><td>8,5</td></tr>
        <tr><td>Giulia Lòpez</td><td>6,0</td></tr>
      </table>
    </body></html>`;
    const htmlBuf = new TextEncoder().encode(htmlXls).buffer;
    const parsedHtml = parseGradebookBuffer(htmlBuf, DEFAULT_SOGLIE_FASCE, { keepNames: true });
    expect(parsedHtml.entries.map((e) => e.nominativo)).toEqual([
      'Niccolò Brambilla',
      'Giulia Lòpez',
    ]);
    expect(parsedHtml.livelli.altoAlunni).toBe(1);
    expect(parsedHtml.livelli.medioBassoAlunni).toBe(1);

    // 3. Verifica che tutti i nominativi importati compaiano nel documento finale (originale + moderno + PDF)
    const entriesWithSensitive = updateStudentDetails(
      parsed.entries,
      parsed.entries[3].id,
      {
        categoriaInclusione: 'bes',
        riferimentoPiano: 'PDP',
        notaSensibileDocente: 'OSSERVAZIONE_RISERVATA_DA_NON_ESPORTARE',
      },
      DEFAULT_SOGLIE_FASCE
    );

    const planOrig = createEmptyProgrammazione(DEFAULT_SCHOOL_SETTINGS, {
      classe: 'Prima',
      sezione: 'B',
      disciplina: 'Italiano',
      annoScolastico: '2025/2026',
      layoutDocumento: 'originale',
    });
    planOrig.analisiPartenza.alunniAnonimiFasce = entriesWithSensitive;
    planOrig.analisiPartenza.livelli = computeLivelliFromStudents(entriesWithSensitive);

    const docxOrigBytes = await generateProgrammazioneDocxBytes(
      planOrig,
      DEFAULT_SCHOOL_SETTINGS,
      mapping
    );
    const docxOrigZip = await JSZip.loadAsync(docxOrigBytes.buffer as ArrayBuffer);
    const docxOrigXml = await docxOrigZip.file('word/document.xml')!.async('string');
    for (const fullName of ['Esposito Chiara', 'De Luca Matteo', 'Conti Elena', 'Moretti Luca']) {
      expect(docxOrigXml).toContain(fullName);
    }
    expect(docxOrigXml).not.toContain('OSSERVAZIONE_RISERVATA_DA_NON_ESPORTARE');

    const planMod = {
      ...planOrig,
      datiGenerali: { ...planOrig.datiGenerali, layoutDocumento: 'moderno' as const },
    };
    const docxModBytes = await generateProgrammazioneDocxBytes(
      planMod,
      DEFAULT_SCHOOL_SETTINGS,
      mapping
    );
    const docxModZip = await JSZip.loadAsync(docxModBytes.buffer as ArrayBuffer);
    const docxModXml = await docxModZip.file('word/document.xml')!.async('string');
    expect(docxModXml).toContain('Esposito Chiara');
    expect(docxModXml).toContain('Moretti Luca');

    // 4. Verifica esportazione standalone solo tabella (.docx)
    const tableOnlyDocx = await generateLivelliTableDocxBytes({
      livelli: planOrig.analisiPartenza.livelli,
      entries: entriesWithSensitive,
      classeLabel: 'Prima B · Italiano · 2025/2026',
    });
    const tableOnlyZip = await JSZip.loadAsync(tableOnlyDocx.buffer as ArrayBuffer);
    const tableOnlyXml = await tableOnlyZip.file('word/document.xml')!.async('string');
    expect(tableOnlyXml).toContain('Livelli di partenza rilevati');
    expect(tableOnlyXml).toContain('Esposito Chiara');
    expect(tableOnlyXml).toContain('De Luca Matteo');
    expect(tableOnlyXml).toContain('Conti Elena');
    expect(tableOnlyXml).toContain('Moretti Luca');
    expect(tableOnlyXml).not.toContain('PROGRAMMAZIONE DIDATTICA DISCIPLINARE');
    expect(tableOnlyXml).not.toContain('OSSERVAZIONE_RISERVATA_DA_NON_ESPORTARE');

    // 5. Verifica copia appunti HTML + TSV per Word / LibreOffice Writer
    const clip = buildLivelliTableClipboardContent({
      livelli: planOrig.analisiPartenza.livelli,
      entries: entriesWithSensitive,
      classeLabel: 'Prima B · Italiano',
    });
    expect(clip.html).toContain('<table');
    expect(clip.html).toContain('Esposito Chiara');
    expect(clip.html).toContain('Moretti Luca');
    expect(clip.html).toContain('Alunni: 1');
    expect(clip.html).not.toContain('OSSERVAZIONE_RISERVATA_DA_NON_ESPORTARE');
    expect(clip.plainText).toContain('Esposito Chiara');
    expect(clip.plainText).toContain('Alunni: 1\tAlunni: 1\tAlunni: 1\tAlunni: 1');
  });

  it('unisce un backup .pianorama conservando le nuove programmazioni e gestendo skip o sovrascrittura dei file uguali', () => {
    const localMatchingById = createEmptyProgrammazione(DEFAULT_SCHOOL_SETTINGS, {
      classe: 'Prima',
      sezione: 'A',
      disciplina: 'Italiano',
      annoScolastico: '2026/27',
    });
    localMatchingById.analisiPartenza.descrizioneDisciplinare = 'VERSIONE_LOCALE_ID';

    const localMatchingByIdentity = createEmptyProgrammazione(DEFAULT_SCHOOL_SETTINGS, {
      classe: 'Seconda',
      sezione: 'B',
      disciplina: 'Storia',
      annoScolastico: '2026/27',
    });
    localMatchingByIdentity.analisiPartenza.descrizioneDisciplinare = 'VERSIONE_LOCALE_STESSA_CLASSE';

    const localNewer = createEmptyProgrammazione(DEFAULT_SCHOOL_SETTINGS, {
      classe: 'Terza',
      sezione: 'C',
      disciplina: 'Geografia',
      annoScolastico: '2026/27',
    });
    localNewer.analisiPartenza.descrizioneDisciplinare = 'NUOVA_LOCALE_DA_MANTENERE';

    const backupSameId = {
      ...localMatchingById,
      analisiPartenza: {
        ...localMatchingById.analisiPartenza,
        descrizioneDisciplinare: 'VERSIONE_BACKUP_ID',
      },
    };
    const backupSameIdentityDifferentId = createEmptyProgrammazione(DEFAULT_SCHOOL_SETTINGS, {
      classe: 'Seconda',
      sezione: 'B',
      disciplina: 'Storia',
      annoScolastico: '2026/27',
    });
    backupSameIdentityDifferentId.analisiPartenza.descrizioneDisciplinare =
      'VERSIONE_BACKUP_STESSA_CLASSE';

    const backupMissingLocally = createEmptyProgrammazione(DEFAULT_SCHOOL_SETTINGS, {
      classe: 'Prima',
      sezione: 'D',
      disciplina: 'Matematica',
      annoScolastico: '2026/27',
    });
    backupMissingLocally.analisiPartenza.descrizioneDisciplinare = 'NUOVA_DAL_BACKUP';

    const localList = [localMatchingById, localMatchingByIdentity, localNewer];
    const backupList = [backupSameId, backupSameIdentityDifferentId, backupMissingLocally];

    const analysis = analyzeBackupMerge(localList, backupList);
    expect(analysis.newPlans).toHaveLength(1);
    expect(analysis.newPlans[0].id).toBe(backupMissingLocally.id);
    expect(analysis.matchingPlans).toHaveLength(2);
    expect(analysis.matchingPlans.map((m) => m.matchedBy)).toEqual(['id', 'identity']);
    expect(analysis.onlyLocalPlans).toHaveLength(1);
    expect(analysis.onlyLocalPlans[0].id).toBe(localNewer.id);

    // 1) Unione mantenendo i file uguali attuali (skip)
    const mergedSkip = computeMergedProgrammazioni(localList, backupList, false);
    expect(mergedSkip.addedPlans).toBe(1);
    expect(mergedSkip.overwrittenPlans).toBe(0);
    expect(mergedSkip.skippedPlans).toBe(2);
    expect(mergedSkip.keptLocalPlans).toBe(1);
    expect(mergedSkip.mergedAll).toHaveLength(4);
    expect(
      mergedSkip.mergedAll.find((p) => p.id === localMatchingById.id)?.analisiPartenza
        .descrizioneDisciplinare
    ).toBe('VERSIONE_LOCALE_ID');
    expect(
      mergedSkip.mergedAll.find((p) => p.id === localNewer.id)?.analisiPartenza
        .descrizioneDisciplinare
    ).toBe('NUOVA_LOCALE_DA_MANTENERE');

    // 2) Unione con sovrascrittura dei file uguali (overwrite) e nessun duplicato
    const mergedOverwrite = computeMergedProgrammazioni(localList, backupList, true);
    expect(mergedOverwrite.addedPlans).toBe(1);
    expect(mergedOverwrite.overwrittenPlans).toBe(2);
    expect(mergedOverwrite.keptLocalPlans).toBe(1);
    expect(mergedOverwrite.idsToDelete).toEqual([localMatchingByIdentity.id]);
    expect(mergedOverwrite.mergedAll).toHaveLength(4);
    expect(
      mergedOverwrite.mergedAll.find((p) => p.id === backupSameId.id)?.analisiPartenza
        .descrizioneDisciplinare
    ).toBe('VERSIONE_BACKUP_ID');
    expect(
      mergedOverwrite.mergedAll.find((p) => p.id === backupSameIdentityDifferentId.id)
        ?.analisiPartenza.descrizioneDisciplinare
    ).toBe('VERSIONE_BACKUP_STESSA_CLASSE');
    expect(
      mergedOverwrite.mergedAll.some((p) => p.id === localMatchingByIdentity.id)
    ).toBe(false);
    expect(
      mergedOverwrite.mergedAll.find((p) => p.id === localNewer.id)?.analisiPartenza
        .descrizioneDisciplinare
    ).toBe('NUOVA_LOCALE_DA_MANTENERE');

    // 3) Verifica merge generico per libreria/regole
    const mergedIdsSkip = mergeItemsById(
      [{ id: 'a', val: 'local' }, { id: 'localOnly', val: 'new' }],
      [{ id: 'a', val: 'backup' }, { id: 'b', val: 'backupNew' }],
      false
    );
    expect(mergedIdsSkip).toEqual([
      { id: 'a', val: 'local' },
      { id: 'localOnly', val: 'new' },
      { id: 'b', val: 'backupNew' },
    ]);

    const mergedIdsOverwrite = mergeItemsById(
      [{ id: 'a', val: 'local' }, { id: 'localOnly', val: 'new' }],
      [{ id: 'a', val: 'backup' }, { id: 'b', val: 'backupNew' }],
      true
    );
    expect(mergedIdsOverwrite).toEqual([
      { id: 'a', val: 'backup' },
      { id: 'localOnly', val: 'new' },
      { id: 'b', val: 'backupNew' },
    ]);
  });

  it('ordina alunni per numero tra parentesi (ordine alfabetico cognomi), rimuove i numeri e formatta nomi/cognomi in Title Case in tutte le esportazioni', async () => {
    const unorderedEntries = [
      createManualStudentEntry(
        [],
        { nominativo: 'ROSSI MARIO (18)', media: 7.5 },
        DEFAULT_SOGLIE_FASCE
      ),
      createManualStudentEntry(
        [],
        { nominativo: "(2) D'ANGELO LUCA", media: 7.2 },
        DEFAULT_SOGLIE_FASCE
      ),
      createManualStudentEntry(
        [],
        { nominativo: 'BIANCHI ANNA (5)', media: 7.8 },
        DEFAULT_SOGLIE_FASCE
      ),
      createManualStudentEntry(
        [],
        { nominativo: 'DE LUCA CHIARA (9)', media: 9.2 },
        DEFAULT_SOGLIE_FASCE
      ),
    ];

    const plan = createEmptyProgrammazione(DEFAULT_SCHOOL_SETTINGS, {
      classe: 'Seconda',
      sezione: 'A',
      disciplina: 'Matematica',
      annoScolastico: '2026/27',
    });
    plan.analisiPartenza.alunniAnonimiFasce = unorderedEntries;
    plan.analisiPartenza.livelli = computeLivelliFromStudents(unorderedEntries);

    // 1. Verifica ordine nella tabella clipboard HTML + testo per Word/Writer
    const clip = buildLivelliTableClipboardContent({
      livelli: plan.analisiPartenza.livelli,
      entries: unorderedEntries,
      classeLabel: 'Seconda A',
    });
    const idxDAngelo = clip.html.indexOf("D&#39;Angelo Luca");
    const idxBianchi = clip.html.indexOf('Bianchi Anna');
    const idxRossi = clip.html.indexOf('Rossi Mario');
    expect(idxDAngelo).toBeGreaterThan(-1);
    expect(idxBianchi).toBeGreaterThan(idxDAngelo);
    expect(idxRossi).toBeGreaterThan(idxBianchi);
    expect(clip.html).toContain('De Luca Chiara');
    expect(clip.html).not.toContain('(18)');
    expect(clip.html).not.toContain('(2)');
    expect(clip.html).not.toContain('(5)');
    expect(clip.html).not.toContain('(9)');
    expect(clip.html).not.toContain('ROSSI MARIO');

    // 2. Verifica esportazione standalone solo tabella (.docx)
    const tableDocx = await generateLivelliTableDocxBytes({
      livelli: plan.analisiPartenza.livelli,
      entries: unorderedEntries,
      classeLabel: 'Seconda A',
    });
    const tableZip = await JSZip.loadAsync(tableDocx.buffer as ArrayBuffer);
    const tableXmlRaw = await tableZip.file('word/document.xml')!.async('string');
    const tableXml = tableXmlRaw.replace(/&apos;|&#39;/g, "'");
    const xD = tableXml.indexOf("D'Angelo Luca");
    const xB = tableXml.indexOf('Bianchi Anna');
    const xR = tableXml.indexOf('Rossi Mario');
    expect(xD).toBeGreaterThan(-1);
    expect(xB).toBeGreaterThan(xD);
    expect(xR).toBeGreaterThan(xB);
    expect(tableXml).toContain('De Luca Chiara');
    expect(tableXml).not.toContain('(18)');
    expect(tableXml).not.toContain('(2)');
    expect(tableXml).not.toContain('ROSSI MARIO');

    // 3. Verifica documento completo DOCX e PDF
    const fullDocx = await generateProgrammazioneDocxBytes(plan, DEFAULT_SCHOOL_SETTINGS, mapping);
    const fullZip = await JSZip.loadAsync(fullDocx.buffer as ArrayBuffer);
    const fullXmlRaw = await fullZip.file('word/document.xml')!.async('string');
    const fullXml = fullXmlRaw.replace(/&apos;|&#39;/g, "'");
    const fxD = fullXml.indexOf("D'Angelo Luca");
    const fxB = fullXml.indexOf('Bianchi Anna');
    const fxR = fullXml.indexOf('Rossi Mario');
    expect(fxD).toBeGreaterThan(-1);
    expect(fxB).toBeGreaterThan(fxD);
    expect(fxR).toBeGreaterThan(fxB);
    expect(fullXml).not.toContain('(18)');
    expect(fullXml).not.toContain('(2)');

    const pdfBytes = generateProgrammazionePdfBytes(plan, DEFAULT_SCHOOL_SETTINGS, mapping);
    const pdfReimport = await importProgrammazioneFromBuffer(
      pdfBytes.buffer as ArrayBuffer,
      'verifica_ordine_fasce.pdf',
      DEFAULT_SCHOOL_SETTINGS
    );
    const medioNames =
      pdfReimport.plan.analisiPartenza.alunniAnonimiFasce?.filter(
        (s) => s.fasciaCorrente === 'medio'
      ).map((s) => s.nominativo) ?? [];
    expect(medioNames).toEqual(["D'Angelo Luca", 'Bianchi Anna', 'Rossi Mario']);
  });

  it('importa documenti evitando falso docente da Google Classroom, ripulendo intestazione curricolo, unendo frasi spezzate e convertendo caselle in elenchi puntati a capo', async () => {
    const realisticHtmlDoc = `<!DOCTYPE html><html><body>
      <p>PROGRAMMAZIONE DISCIPLINARE di Scienze</p>
      <p>CLASSE Prima Sez. C | A.S. 2026/27</p>
      <p>DOCENTE Prof.ssa Laura Ferri</p>
      <p>TRAGUARDI PER LO SVILUPPO DELLE COMPETENZE IN RELAZIONE AL CURRICOLO</p>
      <p>VERTICALE DEL NOSTRO ISTITUTO (clicca sul link per visualizzarlo)</p>
      <p>Competenze:</p>
      <p>• Esplora e sperimenta, in laboratorio e all’aperto,</p>
      <p>lo svolgersi dei più comuni fenomeni naturali.</p>
      <p>• Sviluppa semplici schematizzazioni e modellizzazioni</p>
      <p>di fatti e fenomeni ricorrendo a misure e grandezze.</p>
      <table>
        <tr><td>OBIETTIVI</td><td>CONOSCENZE</td></tr>
        <tr>
          <td>
            <p>Biologia</p>
            <p>☐ Osservare e descrivere le caratteristiche</p>
            <p>principali degli esseri viventi. ☑ Classificare organismi semplici.</p>
          </td>
          <td>
            <p>Biologia</p>
            <p>☐ La cellula animale e vegetale ☐ I cinque regni dei viventi</p>
          </td>
        </tr>
      </table>
      <p>DIDATTICA DIGITALE INTEGRATA</p>
      <p>In caso di attivazione della DDI</p>
      <p>il Docente si riserva di utilizzare le funzionalità di Google Classroom per materiali e verifiche.</p>
      <p>VALUTAZIONE DEGLI APPRENDIMENTI</p>
      <p>La valutazione terrà conto dei progressi registrati in itinere.</p>
      <p>La docente</p>
      <p>si riserva di valutare eventuali prove integrative.</p>
    </body></html>`;

    const imported = await importProgrammazioneFromBuffer(
      new TextEncoder().encode(realisticHtmlDoc).buffer,
      'scienze_1C_realistico.doc',
      DEFAULT_SCHOOL_SETTINGS
    );

    // 1. Il docente reale resta "Laura Ferri" (mai sovrascritto da "si riserva di utilizzare le funzionalità di Google Clas")
    expect(imported.plan.datiGenerali.docente).toBe('Laura Ferri');
    expect(imported.plan.datiGenerali.docenteGenere).toBe('F');
    expect(imported.plan.datiGenerali.docente.toLowerCase()).not.toContain('google');
    expect(imported.plan.datiGenerali.docente.toLowerCase()).not.toContain('si riserva');

    // 2. "VERTICALE DEL NOSTRO ISTITUTO (clicca sul link per visualizzarlo)" escluso e frasi ricomposte senza interruzioni
    expect(
      imported.plan.curricolo.competenzeAttese.some((c) =>
        /verticale del nostro istituto|clicca sul link/i.test(c)
      )
    ).toBe(false);
    expect(imported.plan.curricolo.competenzeAttese).toEqual([
      'Esplora e sperimenta, in laboratorio e all’aperto, lo svolgersi dei più comuni fenomeni naturali.',
      'Sviluppa semplici schematizzazioni e modellizzazioni di fatti e fenomeni ricorrendo a misure e grandezze.',
    ]);

    // 3. Abilità/Obiettivi e Conoscenze: nessuna casella di spunta residua, ogni voce con punto elenco e a capo
    expect(imported.plan.curricolo.indicazioniVersione).toBe('nuove');
    expect(imported.plan.curricolo.righeAbilitaConoscenze).toHaveLength(1);
    const row0 = imported.plan.curricolo.righeAbilitaConoscenze[0];
    expect(row0.abilita).not.toMatch(/[☐☑☒]/);
    expect(row0.conoscenze).not.toMatch(/[☐☑☒]/);
    expect(row0.abilita).toBe(
      'Biologia\n• Osservare e descrivere le caratteristiche principali degli esseri viventi.\n• Classificare organismi semplici.'
    );
    expect(row0.conoscenze).toBe(
      'Biologia\n• La cellula animale e vegetale\n• I cinque regni dei viventi'
    );
  });

  it('modalità rapida classe: 4 domande chiuse, archivio completo (81 combinazioni x 3 varianti italiane distinte) e menzione BES/disabilità', () => {
    // 1. Verifica delle 4 domande a risposta chiusa richieste
    expect(QUICK_CLASS_QUESTIONS.map((q) => q.key)).toEqual([
      'eterogeneita',
      'preparazione',
      'clima',
      'motivazione',
    ]);
    expect(QUICK_CLASS_QUESTIONS.every((q) => q.options.length === 3)).toBe(true);

    // 2. Verifica completezza archivio (3^4 = 81 combinazioni) e almeno 3 formulazioni italiane distinte per ciascuna
    expect(getQuickArchiveCombinationCount()).toBe(81);
    const hetLevels = ['omogenea', 'moderata', 'elevata'] as const;
    const prepLevels = ['buono', 'medio', 'fragile'] as const;
    const climaLevels = ['sereno', 'vivace', 'complesso'] as const;
    const motivLevels = ['attiva', 'selettiva', 'debole'] as const;

    for (const eterogeneita of hetLevels) {
      for (const preparazione of prepLevels) {
        for (const clima of climaLevels) {
          for (const motivazione of motivLevels) {
            const variants = getQuickArchiveVariants({
              eterogeneita,
              preparazione,
              clima,
              motivazione,
            });
            expect(variants.length).toBeGreaterThanOrEqual(3);
            expect(variants.every((v) => v.trim().length > 80)).toBe(true);
            expect(new Set(variants).size).toBe(variants.length);
            expect(CLASS_QUICK_DESCRIPTIONS_ARCHIVE[`${eterogeneita}|${preparazione}|${clima}|${motivazione}`]).toBeDefined();
          }
        }
      }
    }

    // 3. Verifica integrazione automatica e anonima di alunni con BES e con disabilità in tutte e 3 le varianti
    const plan = createEmptyProgrammazione(DEFAULT_SCHOOL_SETTINGS, {
      disciplina: 'Matematica',
      classe: 'Seconda',
      sezione: 'A',
    });
    plan.composizione = { alunni: 23, maschi: 12, femmine: 11, ripetenti: 1, bes: 2, disabilita: 1 };

    const texts = ([0, 1, 2] as const).map((v) =>
      generateQuickClassDescription(plan, DEFAULT_QUICK_CLASS_SELECTION, v)
    );
    expect(new Set(texts).size).toBe(3);
    for (const t of texts) {
      expect(t).toContain('23');
      expect(t).toContain('2 alunni con Bisogni Educativi Speciali (BES)');
      expect(t).toContain('1 alunno con disabilità certificata');
      expect(t).toContain('PDP');
      expect(t).toContain('PEI');
    }

    // Caso senza BES né disabilità: non inventa presenze inesistenti
    plan.composizione = { alunni: 20, maschi: 10, femmine: 10, ripetenti: 0, bes: 0, disabilita: 0 };
    const noBesText = generateQuickClassDescription(plan, DEFAULT_QUICK_CLASS_SELECTION, 0);
    expect(noBesText).toContain('20 alunni');
    expect(noBesText).not.toContain('Bisogni Educativi Speciali');
    expect(noBesText).not.toContain('disabilità certificata');
  });

  it('scheda importazione curricolo: modello identico alla tabella di output (Obiettivi/Abilità + Conoscenze) e altri anni sempre coerenti col curricolo selezionato', () => {
    // 1. Nuove Indicazioni: solo competenze, obiettivi specifici e conoscenze (mai abilità vecchie)
    const matPrimaNuove = resolveCatalogEntriesForCurriculum(
      CURRICOLO_VERTICALE_SEED,
      'Prima',
      'Matematica',
      'nuove'
    );
    expect(matPrimaNuove.length).toBeGreaterThan(0);
    expect(matPrimaNuove.some((e) => e.tipo === 'abilita')).toBe(false);

    const sheetNuove = buildCurriculumSheetModel(matPrimaNuove, 'Matematica', 'nuove');
    expect(sheetNuove.leftColumnLabel).toBe('Obiettivi specifici di apprendimento');
    expect(sheetNuove.rightColumnLabel).toBe('Conoscenze (Contenuti)');
    expect(sheetNuove.competenze.length).toBeGreaterThan(0);
    expect(sheetNuove.rows.length).toBeGreaterThan(0);

    // Altri anni sotto Nuove Indicazioni -> solo voci Nuove (obiettivi, non abilità)
    const otherNuove = resolveOtherClassesEntriesForCurriculum(
      CURRICOLO_VERTICALE_SEED,
      'Prima',
      'Matematica',
      'nuove'
    );
    expect(otherNuove.map((b) => b.classe)).toEqual(['Seconda', 'Terza']);
    for (const bucket of otherNuove) {
      expect(bucket.entries.some((e) => e.tipo === 'abilita')).toBe(false);
      expect(
        bucket.entries.every(
          (e) =>
            e.tipo === 'competenza' ||
            e.tipo === 'obiettivo_specifico' ||
            e.tipo === 'conoscenza'
        )
      ).toBe(true);
    }

    // 2. Vecchie Indicazioni: colonna sinistra "Abilità", mai obiettivi_specifici delle Nuove (nemmeno da altri anni!)
    const matSecondaVecchie = resolveCatalogEntriesForCurriculum(
      CURRICOLO_VERTICALE_SEED,
      'Seconda',
      'Matematica',
      'vecchie'
    );
    expect(matSecondaVecchie.some((e) => e.tipo === 'obiettivo_specifico')).toBe(false);
    expect(matSecondaVecchie.some((e) => e.tipo === 'abilita')).toBe(true);

    const sheetVecchie = buildCurriculumSheetModel(matSecondaVecchie, 'Matematica', 'vecchie');
    expect(sheetVecchie.leftColumnLabel).toBe('Abilità');
    expect(sheetVecchie.rows.length).toBeGreaterThan(0);

    const otherVecchie = resolveOtherClassesEntriesForCurriculum(
      CURRICOLO_VERTICALE_SEED,
      'Seconda',
      'Matematica',
      'vecchie'
    );
    expect(otherVecchie.map((b) => b.classe)).toEqual(['Prima', 'Terza']);
    for (const bucket of otherVecchie) {
      expect(bucket.entries.some((e) => e.tipo === 'obiettivo_specifico')).toBe(false);
      expect(bucket.entries.some((e) => e.tipo === 'abilita')).toBe(true);
    }

    // 3. Controllo completo su tutte le 15 discipline x 3 classi x entrambi i curricoli (nuove e vecchie)
    for (const disc of DISCIPLINE_SECONDARIA) {
      for (const cls of ['Prima', 'Seconda', 'Terza'] as const) {
        for (const ver of ['nuove', 'vecchie'] as const) {
          const entries = resolveCatalogEntriesForCurriculum(
            CURRICOLO_VERTICALE_SEED,
            cls,
            disc,
            ver
          );
          const model = buildCurriculumSheetModel(entries, disc, ver);
          expect(model.competenze.length).toBeGreaterThan(0);
          expect(model.rows.length).toBeGreaterThan(0);
          expect(model.rows.some((r) => r.leftItems.length > 0)).toBe(true);
          expect(model.rows.some((r) => r.rightItems.length > 0)).toBe(true);
          expect(model.rows.every((r) => !r.nucleoTematico.includes('(es'))).toBe(true);
        }
      }
    }

    // 4. Verifica specifica Matematica Prima (Nuove e Vecchie): presenti tutti i nuclei fondamentali
    for (const ver of ['nuove', 'vecchie'] as const) {
      const matPrimaAll = resolveCatalogEntriesForCurriculum(
        CURRICOLO_VERTICALE_SEED,
        'Prima',
        'Matematica',
        ver
      );
      const matPrimaSheet = buildCurriculumSheetModel(matPrimaAll, 'Matematica', ver);
      const nuclei = matPrimaSheet.rows.map((r) => r.nucleoTematico);
      expect(nuclei).toEqual(
        expect.arrayContaining([
          'Numeri',
          'Spazio e figure',
          'Relazioni e funzioni',
          'Dati e previsioni',
          'Digitale e STEAM',
        ])
      );
    }
  });

  it('consente di rimuovere singoli alunni o svuotare le fasce di livello azzerando i conteggi', async () => {
    const {
      createManualStudentEntry,
      removeStudentFromFasce,
      computeLivelliFromStudents,
    } = await import('../engine/gradebookImporter');

    const s1 = createManualStudentEntry([], { nominativo: 'Rossi Mario', media: 5.2 });
    const s2 = createManualStudentEntry([s1], { nominativo: 'Bianchi Giulia', media: 7.8 });
    const list = [s1, s2];

    expect(computeLivelliFromStudents(list)).toEqual({
      bassoAlunni: 1,
      medioBassoAlunni: 0,
      medioAlunni: 1,
      altoAlunni: 0,
    });

    const afterSingleRemove = removeStudentFromFasce(list, s1.id);
    expect(afterSingleRemove).toHaveLength(1);
    expect(computeLivelliFromStudents(afterSingleRemove)).toEqual({
      bassoAlunni: 0,
      medioBassoAlunni: 0,
      medioAlunni: 1,
      altoAlunni: 0,
    });

    const afterClearAll = removeStudentFromFasce(afterSingleRemove, s2.id);
    expect(afterClearAll).toHaveLength(0);
    expect(computeLivelliFromStudents(afterClearAll)).toEqual({
      bassoAlunni: 0,
      medioBassoAlunni: 0,
      medioAlunni: 0,
      altoAlunni: 0,
    });
  });

  it('gestisce controllo aggiornamenti PWA (offline, aggiornata, nuova versione) e applica aggiornamento senza perdere dati locali', async () => {
    const {
      OFFICIAL_PWA_URL,
      applyAppUpdate,
      checkForAppUpdates,
      getPWAUpdateSnapshot,
      resetPWAUpdateManagerForTests,
    } = await import('../pwa/pwaUpdateManager');

    expect(OFFICIAL_PWA_URL).toBe('https://pianorama.vercel.app');

    // 1. Offline -> stato offline esplicito
    resetPWAUpdateManagerForTests({ currentBuildId: 'build-100' });
    const offlineStatus = await checkForAppUpdates({ isOnline: false });
    expect(offlineStatus).toBe('offline');
    expect(getPWAUpdateSnapshot().status).toBe('offline');

    // 2. Versione già aggiornata su server -> up_to_date
    resetPWAUpdateManagerForTests({ currentBuildId: 'build-100' });
    const sameRes = new Response(JSON.stringify({ buildId: 'build-100', builtAt: '2026-11-20T10:00:00Z' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    const upToDateStatus = await checkForAppUpdates({
      isOnline: true,
      origin: OFFICIAL_PWA_URL,
      fetchImpl: async () => sameRes,
    });
    expect(upToDateStatus).toBe('up_to_date');
    expect(getPWAUpdateSnapshot().needRefresh).toBe(false);

    // 3. Nuova versione disponibile su pianorama.vercel.app -> needRefresh = true
    const newerRes = new Response(JSON.stringify({ buildId: 'build-101', builtAt: '2026-11-20T11:00:00Z' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    const foundStatus = await checkForAppUpdates({
      isOnline: true,
      origin: OFFICIAL_PWA_URL,
      fetchImpl: async () => newerRes,
    });
    expect(foundStatus).toBe('update_available');
    expect(getPWAUpdateSnapshot().needRefresh).toBe(true);
    expect(getPWAUpdateSnapshot().remoteBuildId).toBe('build-101');

    // 4. Service Worker waiting -> applyAppUpdate invoca updateSW(true)
    let swActivated = false;
    let swUpdateCalled = false;
    const fakeRegistration = {
      waiting: { state: 'installed' } as ServiceWorker,
      installing: null,
      update: async () => {
        swUpdateCalled = true;
      },
    } as unknown as ServiceWorkerRegistration;

    resetPWAUpdateManagerForTests({
      currentBuildId: 'build-100',
      registration: fakeRegistration,
      updateSW: async (reload) => {
        swActivated = Boolean(reload);
      },
    });

    const swCheck = await checkForAppUpdates({ isOnline: true });
    expect(swUpdateCalled).toBe(true);
    expect(swCheck).toBe('update_available');
    expect(getPWAUpdateSnapshot().needRefresh).toBe(true);

    let reloaded = false;
    const applyRes = await applyAppUpdate({ reloadPage: () => { reloaded = true; } });
    expect(applyRes).toBe('updating');
    expect(swActivated).toBe(true);
    expect(reloaded).toBe(false);
  });
});




