export type PlanStatus = 'bozza' | 'completata' | 'archiviata';

export type ClasseSecondaria = 'Prima' | 'Seconda' | 'Terza';

export type ClassTipologia =
  | 'tranquilla'
  | 'vivace'
  | 'collaborativa'
  | 'poco collaborativa'
  | 'motivata'
  | 'poco motivata'
  | 'problematica';

export type ClassLivello = 'medio-alto' | 'medio' | 'medio-basso' | 'basso';

export type MezzoIndividuazione =
  | 'Curriculum scolastico fornito dalla scuola precedente'
  | 'Informazioni fornite dai precedenti docenti e/o dai genitori'
  | 'Prove di ingresso'
  | 'Osservazioni sistematiche scritte ed orali appositamente predisposte';

export type FonteRilevazione =
  | 'griglie, questionari conoscitivi, test socio-metrici'
  | 'tecniche di osservazione'
  | "test d'ingresso"
  | 'colloqui con gli alunni'
  | 'colloqui con le famiglie'
  | "colloqui con i docenti della scuola dell'infanzia/primaria";

export interface ComposizioneClasse {
  alunni?: number;
  maschi?: number;
  femmine?: number;
  ripetenti: number;
  bes: number;
  disabilita?: number;
}

export type MetodoStudioStato =
  | 'acquisito'
  | 'in consolidamento'
  | 'in via di maturazione'
  | 'non ancora avviato';

export interface ClassCharacteristicSegment {
  id: string;
  etichetta: string;
  quotaPercentuale: number;
  quotaNumerica?: number;
  isNessuno?: boolean;
}

export interface ClassCharacteristicDimension {
  id: string;
  nome: string;
  kind?: 'metodo_studio' | 'generale';
  isCustom?: boolean;
  segmenti: ClassCharacteristicSegment[];
  testoManuale?: string;
  isTestoManuale?: boolean;
  varianteStile?: number;
}

export interface SoglieQuoteCaratteristiche {
  tuttaLaClasse: number;
  quasiTuttaLaClasseMin: number;
  laMaggiorParteMin: number;
  circaMetaMin: number;
  unaParteMin: number;
  pochiMin: number;
}

export interface SituazioneClasse {
  tipologie: ClassTipologia[];
  livello: ClassLivello;
  mezziIndividuazione: MezzoIndividuazione[];
  caratteristicheDimensioni?: ClassCharacteristicDimension[];
  variantePresentazione?: number;
}

export interface LivelliPartenza {
  bassoAlunni: number;
  medioBassoAlunni: number;
  medioAlunni: number;
  altoAlunni: number;
}

export type FasciaLivelloKey = 'basso' | 'medio_basso' | 'medio' | 'alto' | 'da_verificare';

export interface SoglieFasce {
  sogliaMinimaValida: number;
  sogliaMedioBasso: number;
  sogliaMedio: number;
  sogliaAlto: number;
}

export type CategoriaBisognoAlunno =
  | 'nessuno'
  | 'bes'
  | 'dsa'
  | 'disabilita_pei'
  | 'svantaggio_altro';

export type RiferimentoPianoAlunno = '' | 'PDP' | 'PEI' | 'Osservazione';

export interface AnonymousStudentBandEntry {
  id: string;
  ordine: number;
  ordineRegistro?: number;
  labelAnonimo: string;
  nominativo?: string;
  media: number | null;
  fasciaAutomatica: FasciaLivelloKey;
  fasciaCorrente: FasciaLivelloKey;
  spostatoDalDocente: boolean;
  categoriaInclusione?: CategoriaBisognoAlunno;
  riferimentoPiano?: RiferimentoPianoAlunno;
  notaSensibileDocente?: string;
}

export type QuestionnaireIndicatorKey =
  | 'comprensione'
  | 'memorizzazione'
  | 'capacitaApprendimento'
  | 'applicazioneConoscenze'
  | 'collegamentoAnalisiSintesi'
  | 'esposizioneProduzione'
  | 'risoluzioneProblemi'
  | 'attenzioneConcentrazione'
  | 'interesseMotivazione'
  | 'partecipazioneInterventi'
  | 'impegnoCostanza'
  | 'compitiDomestici'
  | 'autonomiaOperativa'
  | 'organizzazioneLavoro'
  | 'metodoStudio'
  | 'relazioniCollaborazione'
  | 'rispettoRegoleClima'
  // Chiavi legacy mantenute solo per retrocompatibilità con eventuali piani/backup precedenti
  | 'composizioneContinuita'
  | 'livelliDistribuzione'
  | 'strategiePersonalizzazione'
  | 'puntiForzaCriticita';

export interface QuestionnaireAnswer {
  selectedOption: string;
  eterogenea: boolean;
  notaEterogenea: string;
}

export type QuickEterogeneitaLevel = 'omogenea' | 'moderata' | 'elevata';
export type QuickLivelloGeneraleLevel = 'buono' | 'medio' | 'fragile';
/** @deprecated Usare QuickLivelloGeneraleLevel */
export type QuickPreparazioneLevel = QuickLivelloGeneraleLevel;
export type QuickSocializzazioneLevel = 'positiva' | 'selettiva' | 'difficile';
export type QuickRegoleVivacitaLevel = 'ordinata' | 'vivace' | 'irrequieta';
/** @deprecated Usare QuickSocializzazioneLevel e QuickRegoleVivacitaLevel */
export type QuickClimaLevel = 'sereno' | 'vivace' | 'complesso';
export type QuickMotivazioneLevel = 'attiva' | 'selettiva' | 'debole';

export type QuickClassModeKey =
  `${QuickEterogeneitaLevel}|${QuickLivelloGeneraleLevel}|${QuickSocializzazioneLevel}|${QuickRegoleVivacitaLevel}|${QuickMotivazioneLevel}`;

export interface QuickClassModeSelection {
  eterogeneita: QuickEterogeneitaLevel;
  livelloGenerale: QuickLivelloGeneraleLevel;
  socializzazione: QuickSocializzazioneLevel;
  regoleVivacita: QuickRegoleVivacitaLevel;
  motivazione: QuickMotivazioneLevel;
  varianteSelezionata: 0 | 1 | 2;
  /** Retrocompatibilità con piani salvati con versione precedente a 4 domande */
  preparazione?: QuickLivelloGeneraleLevel;
  clima?: QuickClimaLevel;
}

export interface ClassQuestionnaire {
  risposte: Partial<Record<QuestionnaireIndicatorKey, QuestionnaireAnswer>>;
  modalitaGenerazione: 'sintetica' | 'completa';
  ultimoAggiornamento: string | null;
  modalitaCompilazione?: 'rapida' | 'dettagliata';
  modalitaRapida?: QuickClassModeSelection;
}

export interface AnalisiPartenza {
  descrizioneDisciplinare: string;
  livelli: LivelliPartenza;
  fontiRilevazione: FonteRilevazione[];
  altraFonte: string;
  questionario?: ClassQuestionnaire;
  alunniAnonimiFasce?: AnonymousStudentBandEntry[];
  registroClasseRilevata?: string;
}

export interface InterventiLivello {
  potenziamento: string[];
  potenziamentoAltro: string;
  consolidamento: string[];
  consolidamentoAltro: string;
  recupero: string[];
  recuperoAltro: string;
  besInterventiProgrammati: string;
}

export interface AbilitaConoscenzaRow {
  id: string;
  competenze?: string;
  traguardo?: string;
  abilita: string;
  conoscenze: string;
}

export type IndicazioniVersion = 'nuove' | 'vecchie';

export type CurricoloVoiceType =
  | 'competenza'
  | 'obiettivo_specifico'
  | 'abilita'
  | 'conoscenza';

export interface CurricoloCatalogEntry {
  id: string;
  classe: ClasseSecondaria;
  disciplina: string;
  tipo: CurricoloVoiceType;
  nucleoTematico: string;
  testo: string;
  documentoProvenienza: string;
}

export interface ImportedCurricoloVoice {
  id: string;
  catalogId?: string;
  classeOrigine: ClasseSecondaria;
  disciplina: string;
  tipo: CurricoloVoiceType;
  nucleoTematico: string;
  testo: string;
  testoOriginale?: string;
  documentoProvenienza?: string;
}

export interface CurricoloSezione {
  indicazioniVersione?: IndicazioniVersion;
  notaIntroduttiva: string;
  competenzeAttese: string[];
  competenzeDigitali: string[];
  righeAbilitaConoscenze: AbilitaConoscenzaRow[];
  vociCatalogoImportate?: ImportedCurricoloVoice[];
  attivitaProgrammate: string;
}

export interface MetodiStrumenti {
  premessaMetodologica: string;
  metodi: string[];
  altreMetodologie: string;
  mezziEStrumenti: string[];
  altriSussidi: string;
  ausiliDidattici: string;
  didatticaDigitaleIntegrata: string;
}

export interface VerificheValutazione {
  verificheScritte: string[];
  verificheOrali: string[];
  altriTipiProve: string;
  criteriValutazione: string;
  firmaDocente: string;
}

export type DocenteGenere = 'F' | 'M';
export type DocumentLayoutStyle = 'originale' | 'moderno';

export interface DatiGenerali {
  titoloDisciplina: string;
  scuola: string;
  plesso: string;
  annoScolastico: string;
  classe: ClasseSecondaria;
  sezione: string;
  disciplina: string;
  docente: string;
  docenteGenere?: DocenteGenere;
  layoutDocumento?: DocumentLayoutStyle;
}

export interface PlanHistoryEntry {
  id: string;
  timestamp: string;
  evento: string;
  dettaglio: string;
}

export interface Programmazione {
  id: string;
  stato: PlanStatus;
  isTemplate?: boolean;
  templateNome?: string;
  clonedFromId?: string;
  cronologiaModifiche?: PlanHistoryEntry[];
  createdAt: string;
  updatedAt: string;
  datiGenerali: DatiGenerali;
  composizione: ComposizioneClasse;
  situazione: SituazioneClasse;
  analisiPartenza: AnalisiPartenza;
  interventi: InterventiLivello;
  curricolo: CurricoloSezione;
  metodiStrumenti: MetodiStrumenti;
  verificheValutazione: VerificheValutazione;
  notePersonaliDocente: string;
}

export interface SectionCopyOptions {
  datiGenerali: boolean;
  composizioneESituazione: boolean;
  analisiEQuestionario: boolean;
  interventi: boolean;
  curricolo: boolean;
  metodiStrumenti: boolean;
  verificheValutazione: boolean;
}

export type LibraryCategory =
  | 'traguardo'
  | 'obiettivo'
  | 'abilita'
  | 'conoscenza'
  | 'strategia_potenziamento'
  | 'strategia_consolidamento'
  | 'strategia_recupero'
  | 'metodologia'
  | 'strumento'
  | 'verifica_scritta'
  | 'verifica_orale'
  | 'criterio_valutazione'
  | 'attivita';

export interface LibraryItem {
  id: string;
  categoria: LibraryCategory;
  disciplina: string;
  classe: ClasseSecondaria | 'Tutte';
  titolo: string;
  testo: string;
  testoCollegato?: string;
  tag: string[];
  archiviato: boolean;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type RuleOperator = 'equals' | 'not_equals' | 'includes' | 'gt' | 'gte' | 'lt';

export interface RuleCondition {
  field:
    | 'situazione.livello'
    | 'situazione.tipologie'
    | 'composizione.bes'
    | 'composizione.ripetenti'
    | 'analisiPartenza.livelli.bassoAlunni'
    | 'analisiPartenza.livelli.medioBassoAlunni'
    | 'analisiPartenza.livelli.altoAlunni'
    | 'datiGenerali.classe'
    | 'datiGenerali.disciplina';
  operator: RuleOperator;
  value: string | number;
}

export type SuggestionTargetSection =
  | 'interventi.potenziamento'
  | 'interventi.consolidamento'
  | 'interventi.recupero'
  | 'interventi.besInterventiProgrammati'
  | 'metodiStrumenti.metodi'
  | 'metodiStrumenti.mezziEStrumenti'
  | 'verificheValutazione.verificheScritte'
  | 'verificheValutazione.verificheOrali'
  | 'verificheValutazione.criteriValutazione'
  | 'curricolo.competenzeDigitali'
  | 'curricolo.attivitaProgrammate';

export interface RuleAction {
  id: string;
  targetSection: SuggestionTargetSection;
  actionType: 'check_option' | 'append_text' | 'suggest_library_category';
  label: string;
  valueText: string;
  libraryCategory?: LibraryCategory;
}

export interface SuggestionRule {
  id: string;
  nome: string;
  descrizione: string;
  attiva: boolean;
  priorita: number;
  matchMode: 'all' | 'any';
  condizioni: RuleCondition[];
  azioni: RuleAction[];
}

export interface SuggestionProposal {
  proposalId: string;
  ruleId: string;
  ruleName: string;
  rationale: string;
  action: RuleAction;
}

export interface DocxFieldMapping {
  id: string;
  sectionTitle: string;
  appPath: string;
  templateTarget: string;
  renderType: 'text' | 'checkbox_list' | 'table_row' | 'table_2col' | 'narrative';
  options?: string[];
}

export interface DocxMappingSchema {
  schemaVersion: string;
  templateFileName: string;
  typography: {
    fontFamily: string;
    headingColorHex: string;
    bodySizePt: number;
    headingSizePt: number;
    checkedGlyph: string;
    uncheckedGlyph: string;
  };
  institutionHeader: {
    ministry: string;
    schoolName: string;
    addressLine: string;
    contactsLine: string;
  };
  sections: DocxFieldMapping[];
}

export type ThemePreference = 'chiaro' | 'scuro' | 'sistema';
export type TextScalePreference = 'normale' | 'grande' | 'molto_grande';

export interface SchoolSettings {
  id: 'default';
  ministryHeader: string;
  schoolName: string;
  schoolAddressLine: string;
  schoolContactsLine: string;
  defaultScuola: string;
  defaultPlesso: string;
  defaultAnnoScolastico: string;
  defaultDocente: string;
  defaultDocenteGenere?: DocenteGenere;
  defaultLayoutDocumento?: DocumentLayoutStyle;
  defaultDisciplina: string;
  theme: ThemePreference;
  textScale: TextScalePreference;
  backupReminderDays: number;
  lastBackupAt: string | null;
  privacyAcknowledgedAt: string | null;
  soglieFasce: SoglieFasce;
  soglieQuoteCaratteristiche?: SoglieQuoteCaratteristiche;
}

export interface BackupPlainData {
  app: 'PIANORAMA';
  schemaVersion: number;
  exportedAt: string;
  programmazioni: Programmazione[];
  library: LibraryItem[];
  rules: SuggestionRule[];
  settings: SchoolSettings;
  docxMapping: DocxMappingSchema;
  curricoloCatalog?: CurricoloCatalogEntry[];
}

export interface PianoramaBackupEnvelope {
  format: 'pianorama-backup';
  version: number;
  encrypted: boolean;
  exportedAt: string;
  crypto?: {
    algorithm: 'AES-GCM';
    kdf: 'PBKDF2';
    hash: 'SHA-256';
    iterations: number;
    saltBase64: string;
    ivBase64: string;
  };
  ciphertextBase64?: string;
  payload?: BackupPlainData;
}

/**
 * Restituisce una copia della programmazione priva di medie, categorie BES/DSA/PEI
 * e note sensibili individuali degli alunni, conservando solo i nominativi per la
 * tabella delle fasce di livello quando importati.
 */
export function sanitizePlanForOfficialExport(plan: Programmazione): Programmazione {
  const bandEntries = (plan.analisiPartenza.alunniAnonimiFasce ?? [])
    .filter((entry) => Boolean(entry.nominativo?.trim()))
    .map((entry) => ({
      id: entry.id,
      ordine: entry.ordine,
      ordineRegistro: entry.ordineRegistro,
      labelAnonimo: entry.labelAnonimo,
      nominativo: entry.nominativo?.trim(),
      media: null,
      fasciaAutomatica: entry.fasciaAutomatica,
      fasciaCorrente: entry.fasciaCorrente,
      spostatoDalDocente: entry.spostatoDalDocente,
    }));

  return {
    ...plan,
    analisiPartenza: {
      ...plan.analisiPartenza,
      alunniAnonimiFasce: bandEntries.length > 0 ? bandEntries : undefined,
      registroClasseRilevata: undefined,
    },
  };
}

