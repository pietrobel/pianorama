import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookmarkCheck,
  BookMarked,
  BookOpen,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileUp,
  History,
  Lightbulb,
  Plus,
  RotateCcw,
  Tag,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ClassCharacteristicsPanel } from '../components/ClassCharacteristicsPanel';
import { ClassQuestionnairePanel } from '../components/ClassQuestionnairePanel';
import { CurricoloCatalogSelector } from '../components/CurricoloCatalogSelector';
import { DocumentImportReviewModal } from '../components/DocumentImportReviewModal';
import { DocumentSheetPreview } from '../components/DocumentSheetPreview';
import { FasceLivelloBoard } from '../components/FasceLivelloBoard';
import { PlessoSelect } from '../components/PlessoSelect';
import { PrivacyNoticeBanner } from '../components/PrivacyNoticeBanner';
import { SimpleClassDescriptionBuilder } from '../components/SimpleClassDescriptionBuilder';
import {
  DEFAULT_BES_INTERVENTI_TEXT,
  DISCIPLINE_SECONDARIA,
  FONTI_RILEVAZIONE_OPTIONS,
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
  buildBesInterventiText,
  formatDocenteConTitolo,
  formatFirmaDocente,
  getDefaultCurricoloForDisciplina,
  getDefaultMetodiStrumentiForDisciplina,
  getDefaultRilevazioneForDisciplina,
  getDefaultVerificheValutazioneForDisciplina,
  resolveBesBreakdown,
} from '../domain/defaults';
import type {
  AnonymousStudentBandEntry,
  CategoriaBisognoAlunno,
  ClassQuestionnaire,
  CurricoloCatalogEntry,
  CurricoloVoiceType,
  DocenteGenere,
  DocumentLayoutStyle,
  DocxMappingSchema,
  ImportedCurricoloVoice,
  IndicazioniVersion,
  LibraryItem,
  PlanStatus,
  Programmazione,
  SchoolSettings,
  SessoIpotizzato,
  SuggestionProposal,
  SuggestionRule,
} from '../domain/types';
import { reconcileDimensionsWithTotalStudents } from '../engine/classCharacteristicsEngine';
import {
  CURRICOLO_TYPE_LABELS,
  CURRICOLO_TYPE_ORDER,
  INDICAZIONI_LABELS,
  buildProgramRowsFromCatalogVoices,
  extractCompetenzeFromCatalogVoices,
  getDefaultIndicazioniForClasseAndYear,
  importCatalogEntriesToVoices,
  isVoiceRestorable,
  reorderImportedVoices,
  restoreVoiceFromCatalog,
} from '../engine/curricoloCatalogEngine';
import {
  importProgrammazioneFromFile,
  type DocumentImportResult,
} from '../engine/documentPlanImporter';
import {
  computeGenderCountsFromStudents,
  computeInclusionCountsFromStudents,
  computeLivelliFromStudents,
  createManualStudentEntry,
  getUnifiedPianoForCategoria,
  parseGradebookBuffer,
  parseStudentListText,
  resolveStudentGender,
  updateStudentDetails,
} from '../engine/gradebookImporter';
import {
  DEFAULT_QUICK_CLASS_SELECTION,
  deriveSuggestedSituazioneFromQuick,
  normalizeQuickClassSelection,
} from '../engine/quickClassDescriptionEngine';
import { applySuggestionAction, evaluateSuggestionRules } from '../engine/suggestionEngine';

interface PlanEditorPageProps {
  plan: Programmazione;
  library: LibraryItem[];
  curricoloCatalog: CurricoloCatalogEntry[];
  rules: SuggestionRule[];
  settings: SchoolSettings;
  mapping: DocxMappingSchema;
  onSavePlan: (plan: Programmazione) => Promise<void>;
  onSaveAsTemplateCopy: (source: Programmazione, templateNome: string) => Promise<void>;
  onBack: () => void;
  onOpenExport: () => void;
}

type SectionKey =
  | 'dati'
  | 'composizione'
  | 'analisi'
  | 'interventi'
  | 'curricolo'
  | 'metodi'
  | 'verifiche';

const SECTIONS: { key: SectionKey; label: string; shortLabel: string }[] = [
  { key: 'dati', label: '1. Dati generali', shortLabel: 'Dati' },
  { key: 'composizione', label: '2. Fasce, composizione e descrizione', shortLabel: 'Classe' },
  { key: 'analisi', label: '3. Analisi e fasce di livello', shortLabel: 'Analisi' },
  { key: 'interventi', label: '4. Strategie e BES', shortLabel: 'Strategie' },
  { key: 'curricolo', label: '5. Curricolo e abilità', shortLabel: 'Curricolo' },
  { key: 'metodi', label: '6. Metodi, strumenti e DDI', shortLabel: 'Metodi' },
  { key: 'verifiche', label: '7. Verifiche e valutazione', shortLabel: 'Verifiche' },
];

export function PlanEditorPage({
  plan: initialPlan,
  library,
  curricoloCatalog,
  rules,
  settings,
  mapping,
  onSavePlan,
  onSaveAsTemplateCopy,
  onBack,
  onOpenExport,
}: PlanEditorPageProps) {
  const [draft, setDraft] = useState<Programmazione>(initialPlan);
  const [activeSection, setActiveSection] = useState<SectionKey>('dati');
  const [showLivePreview, setShowLivePreview] = useState<boolean>(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState<boolean>(false);
  const [showLibraryPicker, setShowLibraryPicker] = useState<boolean>(false);
  const [showCatalogSelector, setShowCatalogSelector] = useState<boolean>(false);
  const [catalogImportFeedback, setCatalogImportFeedback] = useState<string | null>(null);
  const [libraryFilterText, setLibraryFilterText] = useState<string>('');
  const [dismissedProposals, setDismissedProposals] = useState<Set<string>>(new Set());
  const [editingProposalId, setEditingProposalId] = useState<string | null>(null);
  const [editingProposalText, setEditingProposalText] = useState<string>('');
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved');
  const [saveTimeLabel, setSaveTimeLabel] = useState<string>(() =>
    new Date(initialPlan.updatedAt).toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  );
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);
  const [templatePromptOpen, setTemplatePromptOpen] = useState(false);
  const [templateNomeInput, setTemplateNomeInput] = useState(
    `${initialPlan.datiGenerali.disciplina} ${initialPlan.datiGenerali.classe}`
  );
  const [templateFeedback, setTemplateFeedback] = useState<string | null>(null);
  const [manualSnapshotNote, setManualSnapshotNote] = useState('');
  const [gradebookError, setGradebookError] = useState<string | null>(null);
  const [gradebookStatus, setGradebookStatus] = useState<string | null>(null);
  const [keepNamesOffline, setKeepNamesOffline] = useState<boolean>(true);
  const gradebookFileRef = useRef<HTMLInputElement>(null);
  const composizioneGradebookRef = useRef<HTMLInputElement>(null);
  const programDocFileRef = useRef<HTMLInputElement>(null);
  const [importingProgramDoc, setImportingProgramDoc] = useState<boolean>(false);
  const [pendingProgramDocImport, setPendingProgramDocImport] =
    useState<DocumentImportResult | null>(null);
  const [catalogImportError, setCatalogImportError] = useState<string | null>(null);
  const [simpleDescAppliedFeedback, setSimpleDescAppliedFeedback] = useState<boolean>(false);
  const [quickAddStudentName, setQuickAddStudentName] = useState<string>('');
  const [showPasteRosterBox, setShowPasteRosterBox] = useState<boolean>(false);
  const [pasteRosterText, setPasteRosterText] = useState<string>('');
  const [composizioneRosterMsg, setComposizioneRosterMsg] = useState<string | null>(null);

  const isFirstRender = useRef(true);
  const latestPlanId = useRef(initialPlan.id);
  const latestDraftRef = useRef(draft);
  latestDraftRef.current = draft;
  const onSavePlanRef = useRef(onSavePlan);
  onSavePlanRef.current = onSavePlan;
  const isDirtyRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (initialPlan.id !== latestPlanId.current) {
      latestPlanId.current = initialPlan.id;
      setDraft(initialPlan);
      isFirstRender.current = true;
      isDirtyRef.current = false;
    }
  }, [initialPlan]);

  const flushPendingSave = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (!isDirtyRef.current) return;
    isDirtyRef.current = false;
    try {
      await onSavePlanRef.current(latestDraftRef.current);
      setSaveState('saved');
      setSaveTimeLabel(
        new Date().toLocaleTimeString('it-IT', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    } catch (err) {
      setSaveState('error');
      setSaveErrorMsg(err instanceof Error ? err.message : 'Errore nel salvataggio locale.');
    }
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    isDirtyRef.current = true;
    setSaveState('saving');
    setSaveErrorMsg(null);
    debounceTimerRef.current = setTimeout(async () => {
      debounceTimerRef.current = null;
      await flushPendingSave();
    }, 450);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [draft, flushPendingSave]);

  useEffect(() => {
    return () => {
      if (isDirtyRef.current) {
        isDirtyRef.current = false;
        void onSavePlanRef.current(latestDraftRef.current);
      }
    };
  }, []);

  const handleBackClick = async () => {
    await flushPendingSave();
    onBack();
  };

  const handleOpenExportClick = async () => {
    await flushPendingSave();
    onOpenExport();
  };

  const proposals = useMemo(
    () => evaluateSuggestionRules(draft, rules, dismissedProposals),
    [draft, rules, dismissedProposals]
  );

  const toggleArrayValue = (list: string[], value: string): string[] =>
    list.includes(value) ? list.filter((x) => x !== value) : [...list, value];

  const appendHistory = (evento: string, dettaglio: string) => {
    setDraft((prev) => ({
      ...prev,
      cronologiaModifiche: [
        {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          evento,
          dettaglio,
        },
        ...(prev.cronologiaModifiche ?? []),
      ],
    }));
  };

  const handleAcceptProposal = (proposal: SuggestionProposal, customText?: string) => {
    setDraft((prev) => applySuggestionAction(prev, proposal.action, customText));
    setEditingProposalId(null);
  };

  const handleIgnoreProposal = (proposalId: string) => {
    setDismissedProposals((prev) => {
      const next = new Set(prev);
      next.add(proposalId);
      return next;
    });
  };

  const handleImportCatalogEntries = (
    selectedEntries: CurricoloCatalogEntry[],
    usedIndicazioni?: IndicazioniVersion
  ) => {
    const newVoices = importCatalogEntriesToVoices(selectedEntries);
    const crossClassCount = newVoices.filter(
      (v) => v.classeOrigine !== draft.datiGenerali.classe
    ).length;
    const resolvedIndicazioni =
      usedIndicazioni ??
      draft.curricolo.indicazioniVersione ??
      getDefaultIndicazioniForClasseAndYear(
        draft.datiGenerali.classe,
        draft.datiGenerali.annoScolastico
      );
    setDraft((prev) => {
      const nextCompetenze = extractCompetenzeFromCatalogVoices(
        newVoices,
        prev.curricolo.competenzeAttese
      );
      const nextRows = buildProgramRowsFromCatalogVoices(
        newVoices,
        prev.curricolo.righeAbilitaConoscenze,
        { indicazioniVersione: resolvedIndicazioni }
      );
      return {
        ...prev,
        curricolo: {
          ...prev.curricolo,
          indicazioniVersione: resolvedIndicazioni,
          competenzeAttese: nextCompetenze,
          vociCatalogoImportate: [...(prev.curricolo.vociCatalogoImportate ?? []), ...newVoices],
          righeAbilitaConoscenze: nextRows,
        },
        cronologiaModifiche: [
          {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            evento: 'Importazione da Curricolo Verticale',
            dettaglio: `Importate ${newVoices.length} voci dalla scheda curricolo (${
              crossClassCount > 0 ? `${crossClassCount} da altra classe` : `Classe ${draft.datiGenerali.classe}`
            }): competenze aggiunte dopo i Traguardi e programma raggruppato nella tabella a 2 colonne.`,
          },
          ...(prev.cronologiaModifiche ?? []),
        ],
      };
    });
    setCatalogImportError(null);
    setCatalogImportFeedback(
      `Importate ${newVoices.length} voci dalla scheda curricolare: competenze inserite dopo i Traguardi e contenuti raggruppati per nucleo nella tabella a 2 colonne (${
        resolvedIndicazioni === 'nuove' ? 'Obiettivi' : 'Abilità'
      }, Conoscenze).`
    );
  };

  const handleAddManualCurricoloVoice = () => {
    const manualVoice: ImportedCurricoloVoice = {
      id: crypto.randomUUID(),
      classeOrigine: draft.datiGenerali.classe,
      disciplina: draft.datiGenerali.disciplina,
      tipo: 'obiettivo_specifico',
      nucleoTematico: 'Obiettivo personalizzato',
      testo: '',
      documentoProvenienza: 'Inserimento manuale docente',
    };
    setDraft((prev) => ({
      ...prev,
      curricolo: {
        ...prev.curricolo,
        vociCatalogoImportate: [...(prev.curricolo.vociCatalogoImportate ?? []), manualVoice],
      },
    }));
  };

  const handleUpdateImportedVoice = (
    voiceId: string,
    patch: Partial<ImportedCurricoloVoice>
  ) => {
    setDraft((prev) => ({
      ...prev,
      curricolo: {
        ...prev.curricolo,
        vociCatalogoImportate: (prev.curricolo.vociCatalogoImportate ?? []).map((v) =>
          v.id === voiceId ? { ...v, ...patch } : v
        ),
      },
    }));
  };

  const handleMoveImportedVoice = (voiceId: string, direction: -1 | 1) => {
    setDraft((prev) => ({
      ...prev,
      curricolo: {
        ...prev.curricolo,
        vociCatalogoImportate: reorderImportedVoices(
          prev.curricolo.vociCatalogoImportate ?? [],
          voiceId,
          direction
        ),
      },
    }));
  };

  const handleDeleteImportedVoice = (voiceId: string) => {
    setDraft((prev) => ({
      ...prev,
      curricolo: {
        ...prev.curricolo,
        vociCatalogoImportate: (prev.curricolo.vociCatalogoImportate ?? []).filter(
          (v) => v.id !== voiceId
        ),
      },
    }));
  };

  const handleRestoreVoiceOriginal = (voiceId: string) => {
    setDraft((prev) => ({
      ...prev,
      curricolo: {
        ...prev.curricolo,
        vociCatalogoImportate: restoreVoiceFromCatalog(
          prev.curricolo.vociCatalogoImportate ?? [],
          voiceId,
          curricoloCatalog
        ),
      },
    }));
  };

  const matchingLibrary = useMemo(() => {
    const q = libraryFilterText.trim().toLowerCase();
    const disc = draft.datiGenerali.disciplina;
    const cls = draft.datiGenerali.classe;
    return library
      .filter((item) => !item.archiviato)
      .filter(
        (item) =>
          item.disciplina === disc ||
          item.disciplina === 'Tutte' ||
          item.classe === cls ||
          item.classe === 'Tutte'
      )
      .filter((item) => {
        if (!q) return true;
        return [item.titolo, item.testo, item.testoCollegato || '', item.disciplina, ...item.tag]
          .join(' ')
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => {
        const aExact = a.disciplina === disc ? 0 : 1;
        const bExact = b.disciplina === disc ? 0 : 1;
        return aExact - bExact || a.titolo.localeCompare(b.titolo, 'it');
      });
  }, [library, libraryFilterText, draft.datiGenerali.disciplina, draft.datiGenerali.classe]);

  const insertLibraryItemIntoPlan = (item: LibraryItem) => {
    setDraft((prev) => {
      if (item.categoria === 'traguardo' || item.categoria === 'obiettivo') {
        const list = item.tag.includes('digcomp')
          ? prev.curricolo.competenzeDigitali
          : prev.curricolo.competenzeAttese;
        if (list.includes(item.testo)) return prev;
        return {
          ...prev,
          curricolo: {
            ...prev.curricolo,
            competenzeDigitali: item.tag.includes('digcomp')
              ? [...prev.curricolo.competenzeDigitali, item.testo]
              : prev.curricolo.competenzeDigitali,
            competenzeAttese: !item.tag.includes('digcomp')
              ? [...prev.curricolo.competenzeAttese, item.testo]
              : prev.curricolo.competenzeAttese,
          },
        };
      }
      if (item.categoria === 'abilita' || item.categoria === 'conoscenza') {
        return {
          ...prev,
          curricolo: {
            ...prev.curricolo,
            righeAbilitaConoscenze: [
              ...prev.curricolo.righeAbilitaConoscenze,
              {
                id: crypto.randomUUID(),
                abilita: item.categoria === 'abilita' ? item.testo : item.testoCollegato || '',
                conoscenze:
                  item.categoria === 'abilita' ? item.testoCollegato || '' : item.testo,
              },
            ],
          },
        };
      }
      if (item.categoria === 'attivita') {
        const current = prev.curricolo.attivitaProgrammate.trim();
        const add = `${item.titolo}: ${item.testo}`;
        return {
          ...prev,
          curricolo: {
            ...prev.curricolo,
            attivitaProgrammate: current ? `${current}\n\n${add}` : add,
          },
        };
      }
      if (item.categoria === 'criterio_valutazione') {
        const current = prev.verificheValutazione.criteriValutazione.trim();
        return {
          ...prev,
          verificheValutazione: {
            ...prev.verificheValutazione,
            criteriValutazione: current ? `${current}\n\n${item.testo}` : item.testo,
          },
        };
      }
      return prev;
    });
  };

  const hasAllSexCounts =
    typeof draft.composizione.maschi === 'number' &&
    typeof draft.composizione.femmine === 'number';
  const sumSex = (draft.composizione.maschi ?? 0) + (draft.composizione.femmine ?? 0);
  const sumLevels =
    draft.analisiPartenza.livelli.bassoAlunni +
    draft.analisiPartenza.livelli.medioBassoAlunni +
    draft.analisiPartenza.livelli.medioAlunni +
    draft.analisiPartenza.livelli.altoAlunni;

  return (
    <div className="space-y-4">
      {/* Header contestuale dell'editor */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void handleBackClick()}
            className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Piani
          </button>
          <div>
            <h1 className="text-base font-bold text-slate-900 sm:text-lg dark:text-slate-100">
              {draft.isTemplate ? `Modello: ${draft.templateNome || draft.datiGenerali.disciplina}` : draft.datiGenerali.disciplina}{' '}
              · Classe {draft.datiGenerali.classe} {draft.datiGenerali.sezione}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              A.S. <span className="font-mono-num">{draft.datiGenerali.annoScolastico}</span> ·{' '}
              {saveState === 'saving' ? (
                <span>Salvataggio locale in corso...</span>
              ) : saveState === 'error' ? (
                <span className="text-red-600 dark:text-red-400">{saveErrorMsg}</span>
              ) : (
                <span className="font-mono-num">
                  Salvato automaticamente · {saveTimeLabel}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={draft.stato}
            onChange={(e) => {
              const nextStato = e.target.value as PlanStatus;
              setDraft((prev) => ({
                ...prev,
                stato: nextStato,
                cronologiaModifiche: [
                  {
                    id: crypto.randomUUID(),
                    timestamp: new Date().toISOString(),
                    evento: 'Cambio stato',
                    dettaglio: `Stato impostato su "${nextStato}".`,
                  },
                  ...(prev.cronologiaModifiche ?? []),
                ],
              }));
            }}
            aria-label="Stato della programmazione"
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="bozza">Stato: Bozza</option>
            <option value="completata">Stato: Completata</option>
            <option value="archiviata">Stato: Archiviata</option>
          </select>

          <button
            type="button"
            onClick={() => setTemplatePromptOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <BookmarkCheck className="h-3.5 w-3.5" />
            Salva come modello
          </button>

          <button
            type="button"
            onClick={() => setShowHistoryPanel((v) => !v)}
            className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <History className="h-3.5 w-3.5" />
            Cronologia ({draft.cronologiaModifiche?.length ?? 0})
          </button>

          <button
            type="button"
            onClick={() => setShowLivePreview((v) => !v)}
            className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {showLivePreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showLivePreview ? 'Nascondi anteprima' : 'Anteprima live'}
          </button>

          <button
            type="button"
            onClick={() => void handleOpenExportClick()}
            className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg bg-[#1F3864] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#172b4d]"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Esporta DOCX / PDF
          </button>
        </div>
      </div>

      {/* Salva come modello riutilizzabile */}
      {templatePromptOpen && (
        <div className="flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50/60 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-blue-900 dark:bg-blue-950/30">
          <div className="flex-1 space-y-1">
            <p className="text-xs font-semibold text-[#1F3864] dark:text-blue-300">
              Crea una copia indipendente contrassegnata come Modello riutilizzabile
            </p>
            <input
              type="text"
              value={templateNomeInput}
              onChange={(e) => setTemplateNomeInput(e.target.value)}
              placeholder="Nome del modello (es. Modello Italiano Classe Prima)..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTemplatePromptOpen(false)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              Chiudi
            </button>
            <button
              type="button"
              onClick={async () => {
                await onSaveAsTemplateCopy(
                  draft,
                  templateNomeInput.trim() || `${draft.datiGenerali.disciplina} ${draft.datiGenerali.classe}`
                );
                setTemplatePromptOpen(false);
                setTemplateFeedback('Copia salvata tra i modelli riutilizzabili.');
              }}
              className="rounded-lg bg-[#1F3864] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#172b4d]"
            >
              Salva modello indipendente
            </button>
          </div>
        </div>
      )}

      {templateFeedback && (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
        >
          {templateFeedback}
        </div>
      )}

      {/* Pannello Cronologia indipendente del progetto */}
      {showHistoryPanel && (
        <section
          aria-label="Cronologia delle modifiche del progetto"
          className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Cronologia delle modifiche (identità progetto: <span className="font-mono-num text-xs font-normal text-slate-500">{draft.id.slice(0, 8)}</span>)
            </h2>
            <button
              type="button"
              onClick={() => setShowHistoryPanel(false)}
              className="text-xs text-slate-500 hover:underline"
            >
              Chiudi
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={manualSnapshotNote}
              onChange={(e) => setManualSnapshotNote(e.target.value)}
              placeholder="Annota una tappa di revisione (es. Aggiornato dopo Consiglio di Classe di novembre)..."
              className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
            />
            <button
              type="button"
              disabled={!manualSnapshotNote.trim()}
              onClick={() => {
                appendHistory('Revisione docente', manualSnapshotNote.trim());
                setManualSnapshotNote('');
              }}
              className="whitespace-nowrap rounded-lg bg-[#1F3864] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              Registra nota
            </button>
          </div>

          <ul className="max-h-44 space-y-1.5 overflow-y-auto text-xs">
            {(draft.cronologiaModifiche ?? []).map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-baseline justify-between gap-2 rounded-md border border-slate-100 bg-slate-50 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-800/40"
              >
                <div>
                  <strong className="text-slate-900 dark:text-slate-100">{entry.evento}:</strong>{' '}
                  <span className="text-slate-600 dark:text-slate-300">{entry.dettaglio}</span>
                </div>
                <span className="font-mono-num text-[11px] text-slate-500">
                  {new Date(entry.timestamp).toLocaleString('it-IT')}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Navigazione a schede su tablet/mobile */}
      <nav
        aria-label="Sezioni programmazione (mobile)"
        className="flex gap-1.5 overflow-x-auto pb-1 lg:hidden"
      >
        {SECTIONS.map((sec) => (
          <button
            key={sec.key}
            type="button"
            onClick={() => setActiveSection(sec.key)}
            className={`whitespace-nowrap shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold ${
              activeSection === sec.key
                ? 'border-[#1F3864] bg-[#1F3864] text-white'
                : 'border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            {sec.shortLabel}
          </button>
        ))}
      </nav>

      {/* Layout principale */}
      <div
        className={`grid gap-5 ${
          showLivePreview ? 'lg:grid-cols-[220px_1fr_1fr]' : 'lg:grid-cols-[240px_1fr]'
        }`}
      >
        <aside className="hidden lg:block">
          <nav
            aria-label="Sezioni programmazione"
            className="sticky top-20 space-y-1 rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900"
          >
            {SECTIONS.map((sec) => (
              <button
                key={sec.key}
                type="button"
                onClick={() => setActiveSection(sec.key)}
                className={`w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
                  activeSection === sec.key
                    ? 'bg-[#1F3864] font-semibold text-white'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {sec.label}
              </button>
            ))}

            {proposals.length > 0 && (
              <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-800">
                <p className="px-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Suggerimenti locali ({proposals.length})
                </p>
                <p className="mt-1 px-2 text-xs text-slate-500 dark:text-slate-400">
                  Generati da regole locali attive in base a classe e livello.
                </p>
              </div>
            )}
          </nav>
        </aside>

        {/* Form della sezione attiva */}
        <div className="space-y-5">
          {proposals.length > 0 && (
            <section
              aria-label="Suggerimenti automatici basati su regole locali"
              className="rounded-xl border border-teal-200 bg-teal-50/60 p-4 dark:border-teal-900/60 dark:bg-teal-950/25"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-teal-950 dark:text-teal-200">
                <Lightbulb className="h-4 w-4 text-teal-700 dark:text-teal-400" />
                <span>
                  Suggerimenti da regole locali ({proposals.length}) — nessuna AI, 100% offline
                </span>
              </div>
              <div className="mt-3 space-y-2.5">
                {proposals.slice(0, 4).map((prop) => {
                  const isEditing = editingProposalId === prop.proposalId;
                  return (
                    <div
                      key={prop.proposalId}
                      className="rounded-lg border border-teal-200/80 bg-white p-3 dark:border-teal-900 dark:bg-slate-900"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-xs font-semibold text-teal-800 dark:text-teal-300">
                            {prop.ruleName}
                          </p>
                          <p className="mt-0.5 text-sm font-medium text-slate-900 dark:text-slate-100">
                            {prop.action.label}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            {prop.rationale}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleAcceptProposal(prop)}
                            className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-teal-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-800"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Accetta
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingProposalId(isEditing ? null : prop.proposalId);
                              setEditingProposalText(prop.action.valueText);
                            }}
                            className="whitespace-nowrap rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            Modifica
                          </button>
                          <button
                            type="button"
                            onClick={() => handleIgnoreProposal(prop.proposalId)}
                            className="whitespace-nowrap rounded-md px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                          >
                            Ignora
                          </button>
                        </div>
                      </div>
                      {isEditing && (
                        <div className="mt-2.5 flex flex-col gap-2 border-t border-slate-200 pt-2.5 sm:flex-row dark:border-slate-800">
                          <input
                            type="text"
                            value={editingProposalText}
                            onChange={(e) => setEditingProposalText(e.target.value)}
                            className="flex-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                          />
                          <button
                            type="button"
                            onClick={() => handleAcceptProposal(prop, editingProposalText)}
                            className="whitespace-nowrap rounded-md bg-[#1F3864] px-3 py-1.5 text-xs font-semibold text-white"
                          >
                            Applica testo modificato
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* SEZIONE 1: DATI GENERALI */}
          {activeSection === 'dati' && (
            <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-base font-bold text-[#1F3864] dark:text-blue-300">
                1. Intestazione e dati generali della programmazione
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    Scuola
                  </span>
                  <input
                    type="text"
                    value={draft.datiGenerali.scuola}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        datiGenerali: { ...prev.datiGenerali, scuola: e.target.value },
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  />
                </label>

                <PlessoSelect
                  label="Plesso di"
                  value={draft.datiGenerali.plesso}
                  onChange={(nextPlesso) =>
                    setDraft((prev) => ({
                      ...prev,
                      datiGenerali: { ...prev.datiGenerali, plesso: nextPlesso },
                    }))
                  }
                />

                <label className="block">
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    Disciplina
                  </span>
                  <select
                    value={draft.datiGenerali.disciplina}
                    onChange={(e) => {
                      const nextDisc = e.target.value;
                      setDraft((prev) => {
                        const prevDisc = prev.datiGenerali.disciplina;
                        const prevMetodiDef = getDefaultMetodiStrumentiForDisciplina(prevDisc);
                        const prevVerifDef = getDefaultVerificheValutazioneForDisciplina(prevDisc);
                        const prevRilevDef = getDefaultRilevazioneForDisciplina(prevDisc);
                        const prevCurricDef = getDefaultCurricoloForDisciplina(prevDisc);
                        const sameSet = (a: string[], b: string[]) =>
                          a.length === b.length && a.every((v) => b.includes(v));

                        const shouldSyncMetodi =
                          sameSet(prev.metodiStrumenti.metodi, prevMetodiDef.metodi) &&
                          sameSet(
                            prev.metodiStrumenti.mezziEStrumenti,
                            prevMetodiDef.mezziEStrumenti
                          );
                        const shouldSyncVerifiche =
                          sameSet(
                            prev.verificheValutazione.verificheScritte,
                            prevVerifDef.verificheScritte
                          ) &&
                          sameSet(
                            prev.verificheValutazione.verificheOrali,
                            prevVerifDef.verificheOrali
                          );
                        const shouldSyncMezziInd = sameSet(
                          prev.situazione.mezziIndividuazione,
                          prevRilevDef.mezziIndividuazione
                        );
                        const shouldSyncFonti = sameSet(
                          prev.analisiPartenza.fontiRilevazione,
                          prevRilevDef.fontiRilevazione
                        );
                        const shouldSyncCompDig =
                          prev.curricolo.competenzeDigitali.length === 0 ||
                          sameSet(
                            prev.curricolo.competenzeDigitali,
                            prevCurricDef.competenzeDigitali
                          );

                        const nextMetodiDef = getDefaultMetodiStrumentiForDisciplina(nextDisc);
                        const nextVerifDef = getDefaultVerificheValutazioneForDisciplina(nextDisc);
                        const nextRilevDef = getDefaultRilevazioneForDisciplina(nextDisc);
                        const nextCurricDef = getDefaultCurricoloForDisciplina(nextDisc);

                        return {
                          ...prev,
                          datiGenerali: {
                            ...prev.datiGenerali,
                            disciplina: nextDisc,
                            titoloDisciplina: nextDisc,
                          },
                          ...(shouldSyncMezziInd
                            ? {
                                situazione: {
                                  ...prev.situazione,
                                  mezziIndividuazione: nextRilevDef.mezziIndividuazione,
                                },
                              }
                            : {}),
                          ...(shouldSyncFonti
                            ? {
                                analisiPartenza: {
                                  ...prev.analisiPartenza,
                                  fontiRilevazione: nextRilevDef.fontiRilevazione,
                                },
                              }
                            : {}),
                          curricolo: {
                            ...prev.curricolo,
                            ...(shouldSyncCompDig
                              ? { competenzeDigitali: nextCurricDef.competenzeDigitali }
                              : {}),
                            ...(prev.curricolo.attivitaProgrammate ===
                              prevCurricDef.attivitaProgrammate ||
                            !prev.curricolo.attivitaProgrammate.trim()
                              ? { attivitaProgrammate: nextCurricDef.attivitaProgrammate }
                              : {}),
                          },
                          ...(shouldSyncMetodi
                            ? {
                                metodiStrumenti: {
                                  ...prev.metodiStrumenti,
                                  metodi: nextMetodiDef.metodi,
                                  mezziEStrumenti: nextMetodiDef.mezziEStrumenti,
                                  ...(prev.metodiStrumenti.altreMetodologie ===
                                    prevMetodiDef.altreMetodologie ||
                                  !prev.metodiStrumenti.altreMetodologie
                                    ? { altreMetodologie: nextMetodiDef.altreMetodologie }
                                    : {}),
                                  ...(prev.metodiStrumenti.altriSussidi ===
                                    prevMetodiDef.altriSussidi ||
                                  !prev.metodiStrumenti.altriSussidi
                                    ? { altriSussidi: nextMetodiDef.altriSussidi }
                                    : {}),
                                  ...(prev.metodiStrumenti.ausiliDidattici ===
                                    prevMetodiDef.ausiliDidattici ||
                                  !prev.metodiStrumenti.ausiliDidattici
                                    ? { ausiliDidattici: nextMetodiDef.ausiliDidattici }
                                    : {}),
                                },
                              }
                            : {}),
                          ...(shouldSyncVerifiche
                            ? {
                                verificheValutazione: {
                                  ...prev.verificheValutazione,
                                  verificheScritte: nextVerifDef.verificheScritte,
                                  verificheOrali: nextVerifDef.verificheOrali,
                                  ...(prev.verificheValutazione.altriTipiProve ===
                                    prevVerifDef.altriTipiProve ||
                                  !prev.verificheValutazione.altriTipiProve
                                    ? { altriTipiProve: nextVerifDef.altriTipiProve }
                                    : {}),
                                },
                              }
                            : {}),
                        };
                      });
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  >
                    {DISCIPLINE_SECONDARIA.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    Titolo esteso nel documento
                  </span>
                  <input
                    type="text"
                    value={draft.datiGenerali.titoloDisciplina}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        datiGenerali: {
                          ...prev.datiGenerali,
                          titoloDisciplina: e.target.value,
                        },
                      }))
                    }
                    placeholder="es. Italiano, Storia e Geografia"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    Anno scolastico
                  </span>
                  <input
                    type="text"
                    value={draft.datiGenerali.annoScolastico}
                    onChange={(e) => {
                      const nextAnno = e.target.value;
                      setDraft((prev) => ({
                        ...prev,
                        datiGenerali: {
                          ...prev.datiGenerali,
                          annoScolastico: nextAnno,
                        },
                        curricolo: {
                          ...prev.curricolo,
                          indicazioniVersione: getDefaultIndicazioniForClasseAndYear(
                            prev.datiGenerali.classe,
                            nextAnno
                          ),
                        },
                      }));
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      Classe
                    </span>
                    <select
                      value={draft.datiGenerali.classe}
                      onChange={(e) => {
                        const nextClasse = e.target.value as 'Prima' | 'Seconda' | 'Terza';
                        setDraft((prev) => ({
                          ...prev,
                          datiGenerali: {
                            ...prev.datiGenerali,
                            classe: nextClasse,
                          },
                          curricolo: {
                            ...prev.curricolo,
                            indicazioniVersione: getDefaultIndicazioniForClasseAndYear(
                              nextClasse,
                              prev.datiGenerali.annoScolastico
                            ),
                          },
                        }));
                      }}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                    >
                      <option value="Prima">Prima</option>
                      <option value="Seconda">Seconda</option>
                      <option value="Terza">Terza</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      Sezione
                    </span>
                    <input
                      type="text"
                      maxLength={8}
                      value={draft.datiGenerali.sezione}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          datiGenerali: {
                            ...prev.datiGenerali,
                            sezione: e.target.value.toUpperCase(),
                          },
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    Titolo docente
                  </span>
                  <select
                    value={draft.datiGenerali.docenteGenere ?? settings.defaultDocenteGenere ?? 'F'}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        datiGenerali: {
                          ...prev.datiGenerali,
                          docenteGenere: e.target.value as DocenteGenere,
                        },
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  >
                    <option value="F">Professoressa (Prof.ssa · La docente)</option>
                    <option value="M">Professore (Prof. · Il docente)</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    Stile grafico del documento
                  </span>
                  <select
                    value={
                      draft.datiGenerali.layoutDocumento ??
                      settings.defaultLayoutDocumento ??
                      'originale'
                    }
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        datiGenerali: {
                          ...prev.datiGenerali,
                          layoutDocumento: e.target.value as DocumentLayoutStyle,
                        },
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  >
                    <option value="originale">Modello originale (bordo nero tradizionale)</option>
                    <option value="moderno">Stile moderno PIANORAMA (blu istituzionale)</option>
                  </select>
                </label>

                <label className="block sm:col-span-2">
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    Docente (Nome e Cognome)
                  </span>
                  <input
                    type="text"
                    value={draft.datiGenerali.docente}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        datiGenerali: { ...prev.datiGenerali, docente: e.target.value },
                        verificheValutazione: {
                          ...prev.verificheValutazione,
                          firmaDocente: e.target.value,
                        },
                      }))
                    }
                    placeholder="Nome Cognome (il titolo Prof. / Prof.ssa viene applicato automaticamente)"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  />
                  <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                    Nel documento:{' '}
                    <strong className="text-slate-700 dark:text-slate-200">
                      {formatDocenteConTitolo(
                        draft.datiGenerali.docente,
                        draft.datiGenerali.docenteGenere ?? settings.defaultDocenteGenere ?? 'F'
                      )}
                    </strong>{' '}
                    · Firma in calce:{' '}
                    <strong className="text-slate-700 dark:text-slate-200">
                      {formatFirmaDocente(
                        draft.verificheValutazione.firmaDocente || draft.datiGenerali.docente,
                        draft.datiGenerali.docenteGenere ?? settings.defaultDocenteGenere ?? 'F'
                      ).replace(/\n/g, ' / ')}
                    </strong>
                  </span>
                </label>

                <div className="space-y-2 border-t border-slate-200 pt-3 sm:col-span-2 dark:border-slate-800">
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(draft.isTemplate)}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          isTemplate: e.target.checked,
                          templateNome:
                            prev.templateNome ||
                            `${prev.datiGenerali.disciplina} ${prev.datiGenerali.classe}`,
                        }))
                      }
                      className="h-4 w-4 accent-[#1F3864]"
                    />
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      Elenca questo progetto tra i modelli riutilizzabili
                    </span>
                  </label>
                  {draft.isTemplate && (
                    <input
                      type="text"
                      value={draft.templateNome || ''}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, templateNome: e.target.value }))
                      }
                      placeholder="Titolo del modello riutilizzabile..."
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950"
                    />
                  )}
                </div>
              </div>
            </section>
          )}

          {/* SEZIONE 2: FASCE DI LIVELLO, COMPOSIZIONE E SITUAZIONE DELLA CLASSE */}
          {activeSection === 'composizione' && (
            <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-base font-bold text-[#1F3864] dark:text-blue-300">
                2. Fasce di livello, composizione e situazione della classe
              </h2>

              <PrivacyNoticeBanner compact />

              {/* PASSO 1 (IN ALTO): Importazione Fasce di livello / elenco alunni + stima sesso + Bisogno/PEI-PDP */}
              {(() => {
                const rosterEntries = draft.analisiPartenza.alunniAnonimiFasce ?? [];
                const excludeDisabilita = draft.analisiPartenza.escludiDisabilitaDaFasce !== false;
                const inclusionSummary = computeInclusionCountsFromStudents(rosterEntries);
                const genderSummary = computeGenderCountsFromStudents(rosterEntries);

                const applyRosterAndSyncAll = (
                  nextEntries: AnonymousStudentBandEntry[],
                  classeRilevataOverride?: string
                ) => {
                  const counts = computeInclusionCountsFromStudents(nextEntries);
                  const genders = computeGenderCountsFromStudents(nextEntries);
                  const nextLivelli = computeLivelliFromStudents(nextEntries, {
                    excludeDisabilita,
                  });

                  setDraft((prev) => {
                    const prevComp = prev.composizione;
                    const isManualTotal = Boolean(prevComp.inserimentoManualeAlunni);
                    const nextMaschi = nextEntries.length > 0 ? genders.maschi : undefined;
                    const nextFemmine = nextEntries.length > 0 ? genders.femmine : undefined;
                    const nextAlunni = isManualTotal
                      ? prevComp.alunni
                      : nextEntries.length > 0
                      ? genders.maschi + genders.femmine
                      : undefined;

                    const nextComp = {
                      ...prevComp,
                      maschi: nextMaschi,
                      femmine: nextFemmine,
                      alunni: nextAlunni,
                      disabilita: counts.disabilita,
                      besConCertificazione: counts.besConCertificazione,
                      besSenzaCertificazione: counts.besSenzaCertificazione,
                      bes: counts.totaleBes,
                    };

                    const currentBesText = prev.interventi.besInterventiProgrammati.trim();
                    const prevAutoText = buildBesInterventiText(prevComp).trim();
                    const shouldAutoUpdateBesText =
                      !currentBesText ||
                      currentBesText === prevAutoText ||
                      currentBesText === DEFAULT_BES_INTERVENTI_TEXT.trim();

                    return {
                      ...prev,
                      composizione: nextComp,
                      situazione:
                        typeof nextAlunni === 'number'
                          ? {
                              ...prev.situazione,
                              caratteristicheDimensioni: reconcileDimensionsWithTotalStudents(
                                prev.situazione.caratteristicheDimensioni,
                                prevComp.alunni ?? 0,
                                nextAlunni
                              ),
                            }
                          : prev.situazione,
                      analisiPartenza: {
                        ...prev.analisiPartenza,
                        alunniAnonimiFasce: nextEntries,
                        livelli: nextLivelli,
                        registroClasseRilevata:
                          classeRilevataOverride !== undefined
                            ? classeRilevataOverride
                            : nextEntries.length === 0
                            ? undefined
                            : prev.analisiPartenza.registroClasseRilevata,
                      },
                      interventi: shouldAutoUpdateBesText
                        ? {
                            ...prev.interventi,
                            besInterventiProgrammati: buildBesInterventiText(nextComp),
                          }
                        : prev.interventi,
                    };
                  });
                };

                const assignUnifiedCategoryToStudent = (
                  studentId: string,
                  categoriaInclusione: CategoriaBisognoAlunno
                ) => {
                  const riferimentoPiano = getUnifiedPianoForCategoria(categoriaInclusione);
                  const nextEntries = updateStudentDetails(
                    rosterEntries,
                    studentId,
                    { categoriaInclusione, riferimentoPiano },
                    settings.soglieFasce
                  );
                  applyRosterAndSyncAll(nextEntries);
                };

                const handleCycleRosterGender = (entry: AnonymousStudentBandEntry) => {
                  const resolved = resolveStudentGender(entry);
                  const nextSesso: SessoIpotizzato =
                    resolved.sesso === 'M' ? 'F' : resolved.sesso === 'F' ? 'INDETERMINATO' : 'M';
                  const nextEntries = updateStudentDetails(
                    rosterEntries,
                    entry.id,
                    { sessoIpotizzato: nextSesso, sessoModificatoDalDocente: true },
                    settings.soglieFasce
                  );
                  applyRosterAndSyncAll(nextEntries);
                };

                const handleRemoveRosterStudent = (studentId: string) => {
                  const nextEntries = rosterEntries.filter((e) => e.id !== studentId);
                  applyRosterAndSyncAll(nextEntries);
                };

                return (
                  <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/40 p-4 dark:border-blue-900/60 dark:bg-blue-950/20">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <h3 className="flex items-center gap-2 text-sm font-bold text-[#1F3864] dark:text-blue-300">
                          <Users className="h-4 w-4" />
                          <span>
                            1. Caricamento fasce di livello, stima sesso e alunni con Disabilità / DSA / BES (solo in locale)
                          </span>
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          Importa il registro <code>.xlsx</code> delle fasce di livello oppure incolla l’elenco in formato <code>COGNOME NOME</code>: l’app stima automaticamente Maschi (<strong>BLU</strong>), Femmine (<strong>ROSA</strong>) o Indeterminati (<strong>GRIGIO</strong>, cliccabili per correggere), e ti permette di indicare subito <strong>Disabilità (PEI)</strong>, <strong>DSA (PDP)</strong> o <strong>Altri BES (PDP)</strong> sincronizzando la composizione della classe.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          ref={composizioneGradebookRef}
                          type="file"
                          accept=".xlsx,.xls,.ods"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            e.target.value = '';
                            if (!file) return;
                            try {
                              const buffer = await file.arrayBuffer();
                              const parsed = parseGradebookBuffer(buffer, settings.soglieFasce, {
                                keepNames: true,
                              });
                              applyRosterAndSyncAll(parsed.entries, parsed.classeRilevata);
                              const g = computeGenderCountsFromStudents(parsed.entries);
                              setComposizioneRosterMsg(
                                `Elenco importato (${parsed.entries.length} alunni: ${g.maschi} M, ${g.femmine} F${
                                  g.indeterminati > 0 ? `, ${g.indeterminati} da confermare` : ''
                                }). Seleziona qui sotto eventuali alunni con Disabilità (PEI), DSA (PDP) o Altri BES (PDP).`
                              );
                            } catch (err) {
                              setComposizioneRosterMsg(
                                err instanceof Error
                                  ? err.message
                                  : 'Impossibile leggere il file Excel selezionato.'
                              );
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => composizioneGradebookRef.current?.click()}
                          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#1F3864] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#172b4d]"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          Importa registro / fasce (.xlsx)
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowPasteRosterBox((v) => !v)}
                          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#1F3864] bg-white px-3 py-1.5 text-xs font-semibold text-[#1F3864] hover:bg-blue-50 dark:border-blue-400 dark:bg-slate-900 dark:text-blue-300"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Incolla elenco (COGNOME NOME)
                        </button>
                      </div>
                    </div>

                    {showPasteRosterBox && (
                      <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                        <label className="block">
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            Incolla un alunno per riga nel formato COGNOME NOME (es. DI FRANCESCO LUCA)
                          </span>
                          <textarea
                            rows={4}
                            value={pasteRosterText}
                            onChange={(e) => setPasteRosterText(e.target.value)}
                            placeholder={'ROSSI MARCO\nDI FRANCESCO ANNA MARIA\nLI ZHANG MIN\nBIANCHI ANDREA'}
                            className="mt-1 w-full rounded-lg border border-slate-300 p-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-950"
                          />
                        </label>
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setShowPasteRosterBox(false);
                              setPasteRosterText('');
                            }}
                            className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
                          >
                            Annulla
                          </button>
                          <button
                            type="button"
                            disabled={!pasteRosterText.trim()}
                            onClick={() => {
                              const parsedNew = parseStudentListText(
                                pasteRosterText,
                                settings.soglieFasce,
                                rosterEntries
                              );
                              const merged = [...rosterEntries, ...parsedNew];
                              applyRosterAndSyncAll(merged);
                              const g = computeGenderCountsFromStudents(merged);
                              setComposizioneRosterMsg(
                                `Aggiunti ${parsedNew.length} alunni all’elenco (${g.maschi} M, ${g.femmine} F${
                                  g.indeterminati > 0 ? `, ${g.indeterminati} da confermare` : ''
                                }).`
                              );
                              setPasteRosterText('');
                              setShowPasteRosterBox(false);
                            }}
                            className="rounded-lg bg-[#1F3864] px-3 py-1 text-xs font-semibold text-white hover:bg-[#172b4d] disabled:opacity-50"
                          >
                            Carica elenco e stima sesso
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={excludeDisabilita}
                          onChange={(e) => {
                            const nextExcl = e.target.checked;
                            setDraft((prev) => ({
                              ...prev,
                              analisiPartenza: {
                                ...prev.analisiPartenza,
                                escludiDisabilitaDaFasce: nextExcl,
                                livelli: computeLivelliFromStudents(
                                  prev.analisiPartenza.alunniAnonimiFasce ?? [],
                                  { excludeDisabilita: nextExcl }
                                ),
                              },
                            }));
                          }}
                          className="h-3.5 w-3.5 accent-[#1F3864]"
                        />
                        <span>Escludi alunni con disabilità dalle fasce di livello (predefinito)</span>
                      </label>

                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={quickAddStudentName}
                          onChange={(e) => setQuickAddStudentName(e.target.value)}
                          placeholder="COGNOME NOME (singolo)..."
                          className="w-52 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-950"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!quickAddStudentName.trim()) return;
                            const added = createManualStudentEntry(
                              rosterEntries,
                              { nominativo: quickAddStudentName.trim(), media: null },
                              settings.soglieFasce
                            );
                            const next = [...rosterEntries, added];
                            applyRosterAndSyncAll(next);
                            setQuickAddStudentName('');
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Aggiungi
                        </button>
                      </div>
                    </div>

                    {composizioneRosterMsg && (
                      <p className="text-xs font-medium text-[#1F3864] dark:text-blue-300">
                        {composizioneRosterMsg}
                      </p>
                    )}

                    {rosterEntries.length > 0 && (
                      <>
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900">
                          <div className="flex flex-wrap items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
                            <span>Alunni caricati: <strong>{rosterEntries.length}</strong></span>
                            <span className="rounded bg-blue-100 px-1.5 py-0.5 font-bold text-blue-900 dark:bg-blue-950/70 dark:text-blue-200">
                              M: {genderSummary.maschi}
                            </span>
                            <span className="rounded bg-pink-100 px-1.5 py-0.5 font-bold text-pink-900 dark:bg-pink-950/70 dark:text-pink-200">
                              F: {genderSummary.femmine}
                            </span>
                            {genderSummary.indeterminati > 0 && (
                              <span className="rounded bg-slate-200 px-1.5 py-0.5 font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                                ?: {genderSummary.indeterminati} da confermare
                              </span>
                            )}
                            <span className="text-slate-500 dark:text-slate-400">
                              · Disabilità: <strong>{inclusionSummary.disabilita}</strong> · DSA (cert.):{' '}
                              <strong>{inclusionSummary.besConCertificazione}</strong> · Altri BES:{' '}
                              <strong>{inclusionSummary.besSenzaCertificazione}</strong>
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            Fasce calcolate: B {draft.analisiPartenza.livelli.bassoAlunni} · M/B{' '}
                            {draft.analisiPartenza.livelli.medioBassoAlunni} · M{' '}
                            {draft.analisiPartenza.livelli.medioAlunni} · A{' '}
                            {draft.analisiPartenza.livelli.altoAlunni}
                          </span>
                        </div>

                        {genderSummary.indeterminati > 0 && (
                          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                            {genderSummary.indeterminati}{' '}
                            {genderSummary.indeterminati === 1
                              ? 'alunno ha sesso indeterminato'
                              : 'alunni hanno sesso indeterminato'}{' '}
                            (badge <strong>GRIGIO</strong>): clicca sul badge accanto al nome per scegliere <strong>M</strong> o <strong>F</strong> ed aggiornare il conteggio.
                          </p>
                        )}

                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {rosterEntries.map((entry) => {
                            const rawCat = entry.categoriaInclusione ?? 'nessuno';
                            const cat = rawCat === 'svantaggio_altro' ? 'bes' : rawCat;
                            const displayName = entry.nominativo?.trim() || entry.labelAnonimo;
                            const genderInfo = resolveStudentGender(entry);
                            const genderPillClass =
                              genderInfo.sesso === 'M'
                                ? 'border-blue-300 bg-blue-100 text-blue-900 hover:bg-blue-200 dark:border-blue-800 dark:bg-blue-950/70 dark:text-blue-200'
                                : genderInfo.sesso === 'F'
                                ? 'border-pink-300 bg-pink-100 text-pink-900 hover:bg-pink-200 dark:border-pink-800 dark:bg-pink-950/70 dark:text-pink-200'
                                : 'border-slate-300 bg-slate-200 text-slate-800 hover:bg-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200';
                            const genderShort =
                              genderInfo.sesso === 'M' ? 'M' : genderInfo.sesso === 'F' ? 'F' : '?';

                            return (
                              <div
                                key={entry.id}
                                className={`space-y-2 rounded-lg border p-2.5 text-xs ${
                                  cat === 'disabilita_pei'
                                    ? 'border-amber-300 bg-amber-50/40 dark:border-amber-800 dark:bg-amber-950/20'
                                    : cat === 'dsa'
                                    ? 'border-indigo-300 bg-indigo-50/40 dark:border-indigo-800 dark:bg-indigo-950/20'
                                    : cat === 'bes'
                                    ? 'border-sky-300 bg-sky-50/40 dark:border-sky-800 dark:bg-sky-950/20'
                                    : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex min-w-0 flex-1 items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleCycleRosterGender(entry)}
                                      title={`Sesso: ${genderInfo.sesso} · Confidenza: ${genderInfo.confidenza}${
                                        genderInfo.nota ? ` (${genderInfo.nota})` : ''
                                      } — Clicca per cambiare`}
                                      aria-label={`Sesso ipotizzato per ${displayName}: ${genderInfo.sesso}. Clicca per modificare`}
                                      className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold transition ${genderPillClass}`}
                                    >
                                      {genderShort}
                                    </button>
                                    <span
                                      className="truncate font-semibold text-slate-900 dark:text-slate-100"
                                      title={displayName}
                                    >
                                      {displayName}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveRosterStudent(entry.id)}
                                    title={`Rimuovi ${displayName}`}
                                    aria-label={`Rimuovi ${displayName}`}
                                    className="shrink-0 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>

                                {genderInfo.confidenza !== 'ALTA' && genderInfo.nota && (
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                    Stima {genderInfo.confidenza.toLowerCase()}: {genderInfo.nota}
                                  </p>
                                )}

                                {/* Menu a tendina UNICO ed evidente per tipologia bisogno + PEI/PDP */}
                                <label className="block">
                                  <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                                    <Tag className="h-3 w-3" />
                                    Tipologia bisogno e piano:
                                  </span>
                                  <select
                                    value={cat}
                                    onChange={(e) =>
                                      assignUnifiedCategoryToStudent(
                                        entry.id,
                                        e.target.value as CategoriaBisognoAlunno
                                      )
                                    }
                                    aria-label={`Tipologia bisogno e piano per ${displayName}`}
                                    className="mt-0.5 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                                  >
                                    <option value="nessuno">Nessun bisogno speciale</option>
                                    <option value="disabilita_pei">Con disabilità → PEI</option>
                                    <option value="dsa">Con DSA (certificato) → PDP</option>
                                    <option value="bes">Altri BES (senza cert.) → PDP</option>
                                  </select>
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}

              {/* PASSO 2: Conteggi composizione classe (Alunni totali = Maschi + Femmine salvo spunta manuale) */}
              {(() => {
                const isManualAlunni = Boolean(draft.composizione.inserimentoManualeAlunni);
                const computedTotalFromSex =
                  typeof draft.composizione.maschi === 'number' ||
                  typeof draft.composizione.femmine === 'number'
                    ? (draft.composizione.maschi ?? 0) + (draft.composizione.femmine ?? 0)
                    : undefined;
                const alunniDisplayValue = isManualAlunni
                  ? draft.composizione.alunni ?? ''
                  : computedTotalFromSex ?? '';

                return (
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        2. Numeri di composizione della classe
                      </h3>
                      <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={isManualAlunni}
                          onChange={(e) => {
                            const nextManual = e.target.checked;
                            setDraft((prev) => {
                              const prevComp = prev.composizione;
                              const autoSum =
                                typeof prevComp.maschi === 'number' ||
                                typeof prevComp.femmine === 'number'
                                  ? (prevComp.maschi ?? 0) + (prevComp.femmine ?? 0)
                                  : undefined;
                              const nextAlunni = nextManual ? prevComp.alunni : autoSum;
                              return {
                                ...prev,
                                composizione: {
                                  ...prevComp,
                                  inserimentoManualeAlunni: nextManual,
                                  alunni: nextAlunni,
                                },
                                ...(!nextManual &&
                                typeof autoSum === 'number' &&
                                autoSum !== prevComp.alunni
                                  ? {
                                      situazione: {
                                        ...prev.situazione,
                                        caratteristicheDimensioni: reconcileDimensionsWithTotalStudents(
                                          prev.situazione.caratteristicheDimensioni,
                                          prevComp.alunni ?? 0,
                                          autoSum
                                        ),
                                      },
                                    }
                                  : {}),
                              };
                            });
                          }}
                          className="h-3.5 w-3.5 accent-[#1F3864]"
                        />
                        <span>Inserisci manualmente Alunni totali</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
                      {(
                        [
                          ['alunni', 'Alunni totali', true],
                          ['maschi', 'Maschi', true],
                          ['femmine', 'Femmine', true],
                          ['ripetenti', 'Ripetenti', false],
                          ['bes', 'Con BES (totale)', false],
                          ['besConCertificazione', 'BES con cert. (DSA)', false],
                          ['besSenzaCertificazione', 'BES senza cert.', false],
                          ['disabilita', 'Con disabilità', false],
                        ] as const
                      ).map(([field, label, isOptional]) => {
                        const isLockedTotal = field === 'alunni' && !isManualAlunni;
                        return (
                          <label key={field} className="block">
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              {label}
                              {isLockedTotal ? ' (= M+F)' : ''}
                            </span>
                            <input
                              type="number"
                              min={0}
                              max={40}
                              readOnly={isLockedTotal}
                              disabled={isLockedTotal}
                              value={
                                field === 'alunni'
                                  ? alunniDisplayValue
                                  : isOptional
                                  ? draft.composizione[field] ?? ''
                                  : field === 'besConCertificazione' ||
                                    field === 'besSenzaCertificazione'
                                  ? draft.composizione[field] ?? ''
                                  : draft.composizione[field] ?? 0
                              }
                              placeholder={
                                isOptional ||
                                field === 'besConCertificazione' ||
                                field === 'besSenzaCertificazione'
                                  ? '—'
                                  : undefined
                              }
                              onChange={(e) => {
                                if (isLockedTotal) return;
                                const rawVal = e.target.value.trim();
                                const hasNumber = rawVal !== '';
                                const parsed = hasNumber ? Math.max(0, Number(rawVal) || 0) : undefined;
                                setDraft((prev) => {
                                  const prevComp = prev.composizione;
                                  let nextComp = { ...prevComp };

                                  if (
                                    field === 'besConCertificazione' ||
                                    field === 'besSenzaCertificazione'
                                  ) {
                                    nextComp[field] = parsed;
                                    const nextCert =
                                      field === 'besConCertificazione'
                                        ? parsed
                                        : prevComp.besConCertificazione;
                                    const nextSenza =
                                      field === 'besSenzaCertificazione'
                                        ? parsed
                                        : prevComp.besSenzaCertificazione;
                                    if (nextCert !== undefined || nextSenza !== undefined) {
                                      nextComp.bes = (nextCert ?? 0) + (nextSenza ?? 0);
                                    }
                                  } else if (field === 'bes') {
                                    const nextBesVal = parsed ?? 0;
                                    nextComp.bes = nextBesVal;
                                    const sumSplit =
                                      (prevComp.besConCertificazione ?? 0) +
                                      (prevComp.besSenzaCertificazione ?? 0);
                                    if (nextBesVal === 0 || sumSplit > nextBesVal) {
                                      nextComp = {
                                        ...nextComp,
                                        besConCertificazione: undefined,
                                        besSenzaCertificazione: undefined,
                                      };
                                    }
                                  } else if (field === 'maschi' || field === 'femmine') {
                                    nextComp[field] = parsed;
                                    if (!prevComp.inserimentoManualeAlunni) {
                                      const nextM =
                                        field === 'maschi' ? parsed : prevComp.maschi;
                                      const nextF =
                                        field === 'femmine' ? parsed : prevComp.femmine;
                                      nextComp.alunni =
                                        nextM !== undefined || nextF !== undefined
                                          ? (nextM ?? 0) + (nextF ?? 0)
                                          : undefined;
                                    }
                                  } else if (isOptional) {
                                    nextComp[field] = parsed;
                                  } else {
                                    nextComp[field] = parsed ?? 0;
                                  }

                                  const currentBesText =
                                    prev.interventi.besInterventiProgrammati.trim();
                                  const prevAutoText = buildBesInterventiText(prevComp).trim();
                                  const shouldAutoUpdateBesText =
                                    !currentBesText ||
                                    currentBesText === prevAutoText ||
                                    currentBesText === DEFAULT_BES_INTERVENTI_TEXT.trim();

                                  const nextTotalAlunni = nextComp.alunni ?? 0;
                                  const prevTotalAlunni = prevComp.alunni ?? 0;
                                  const totalChanged = nextTotalAlunni !== prevTotalAlunni;

                                  return {
                                    ...prev,
                                    composizione: nextComp,
                                    interventi: shouldAutoUpdateBesText
                                      ? {
                                          ...prev.interventi,
                                          besInterventiProgrammati: buildBesInterventiText(nextComp),
                                        }
                                      : prev.interventi,
                                    ...(totalChanged
                                      ? {
                                          situazione: {
                                            ...prev.situazione,
                                            caratteristicheDimensioni:
                                              reconcileDimensionsWithTotalStudents(
                                                prev.situazione.caratteristicheDimensioni,
                                                prevTotalAlunni,
                                                nextTotalAlunni
                                              ),
                                          },
                                        }
                                      : {}),
                                  };
                                });
                              }}
                              className={`mt-1 w-full rounded-lg border px-3 py-2 font-mono-num text-sm ${
                                isLockedTotal
                                  ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300'
                                  : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950'
                              }`}
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Inserendo <strong>Maschi</strong> e <strong>Femmine</strong> il totale <em>Alunni totali</em> si calcola automaticamente (spunta <em>Inserisci manualmente Alunni totali</em> solo se desideri impostare un totale diverso). Specificando <strong>BES con cert. (DSA)</strong> e <strong>BES senza cert.</strong> il totale <em>Con BES</em> si aggiorna e i testi generati concordano in genere e numero (PEI/PDP).
              </p>

              {typeof draft.composizione.alunni === 'number' &&
                hasAllSexCounts &&
                sumSex !== draft.composizione.alunni && (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Nota di controllo: Maschi + Femmine ({sumSex}) differisce dal totale Alunni (
                  {draft.composizione.alunni}).
                </p>
              )}

              {(() => {
                const qState = draft.analisiPartenza.questionario;
                const compiledAdvancedCount = Object.values(qState?.risposte ?? {}).filter(
                  (a) => Boolean(a && (a.selectedOption || a.notaEterogenea.trim()))
                ).length;
                const activeDescMode: 'rapida' | 'dettagliata' =
                  qState?.modalitaCompilazione ??
                  (compiledAdvancedCount > 0 ? 'dettagliata' : 'rapida');
                const currentQuickSelection = normalizeQuickClassSelection(
                  qState?.modalitaRapida ?? DEFAULT_QUICK_CLASS_SELECTION
                );

                const setClassDescriptionMode = (nextMode: 'rapida' | 'dettagliata') => {
                  setSimpleDescAppliedFeedback(false);
                  setDraft((prev) => ({
                    ...prev,
                    analisiPartenza: {
                      ...prev.analisiPartenza,
                      questionario: {
                        risposte: prev.analisiPartenza.questionario?.risposte ?? {},
                        modalitaGenerazione:
                          prev.analisiPartenza.questionario?.modalitaGenerazione ?? 'completa',
                        ultimoAggiornamento:
                          prev.analisiPartenza.questionario?.ultimoAggiornamento ?? null,
                        modalitaCompilazione: nextMode,
                        modalitaRapida: normalizeQuickClassSelection(
                          prev.analisiPartenza.questionario?.modalitaRapida ??
                            DEFAULT_QUICK_CLASS_SELECTION
                        ),
                      },
                    },
                  }));
                };

                const renderSituazioneGrids = () => (
                  <div className="space-y-4">
                    <fieldset className="space-y-2 border-t border-slate-200 pt-4 dark:border-slate-800">
                      <legend className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Tipologia della classe (selezione multipla)
                      </legend>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {TIPOLOGIE_CLASSE_OPTIONS.map((opt) => (
                          <label
                            key={opt}
                            className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                          >
                            <input
                              type="checkbox"
                              checked={draft.situazione.tipologie.includes(opt)}
                              onChange={() =>
                                setDraft((prev) => ({
                                  ...prev,
                                  situazione: {
                                    ...prev.situazione,
                                    tipologie: toggleArrayValue(
                                      prev.situazione.tipologie,
                                      opt
                                    ) as typeof prev.situazione.tipologie,
                                  },
                                }))
                              }
                              className="h-4 w-4 accent-[#1F3864]"
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>

                    <fieldset className="space-y-2 border-t border-slate-200 pt-4 dark:border-slate-800">
                      <legend className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Livello complessivo della classe
                      </legend>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {LIVELLI_CLASSE_OPTIONS.map((opt) => (
                          <label
                            key={opt.value}
                            className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                          >
                            <input
                              type="radio"
                              name="situazione-livello"
                              checked={draft.situazione.livello === opt.value}
                              onChange={() =>
                                setDraft((prev) => ({
                                  ...prev,
                                  situazione: { ...prev.situazione, livello: opt.value },
                                }))
                              }
                              className="h-4 w-4 accent-[#1F3864]"
                            />
                            <span>{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>

                    <fieldset className="space-y-2 border-t border-slate-200 pt-4 dark:border-slate-800">
                      <legend className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Mezzi utilizzati per individuare le risorse ed i bisogni degli alunni
                      </legend>
                      <div className="space-y-2">
                        {MEZZI_INDIVIDUAZIONE_OPTIONS.map((opt) => (
                          <label
                            key={opt}
                            className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                          >
                            <input
                              type="checkbox"
                              checked={draft.situazione.mezziIndividuazione.includes(opt)}
                              onChange={() =>
                                setDraft((prev) => ({
                                  ...prev,
                                  situazione: {
                                    ...prev.situazione,
                                    mezziIndividuazione: toggleArrayValue(
                                      prev.situazione.mezziIndividuazione,
                                      opt
                                    ) as typeof prev.situazione.mezziIndividuazione,
                                  },
                                }))
                              }
                              className="h-4 w-4 accent-[#1F3864]"
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  </div>
                );

                return (
                  <div className="space-y-5 border-t border-slate-200 pt-4 dark:border-slate-800">
                    {/* Selettore Modalità semplice (predefinita) vs Modalità avanzata */}
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/30">
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          Modalità di composizione della descrizione della classe
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          Scegli tra la <strong>Modalità semplice</strong> (5 domande chiuse con libreria descrizioni complete + BES/PEI/PDP) o la <strong>Modalità avanzata</strong> (percentuali per sottogruppi e 17 indicatori).
                        </p>
                      </div>
                      <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
                        <button
                          type="button"
                          onClick={() => setClassDescriptionMode('rapida')}
                          className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                            activeDescMode === 'rapida'
                              ? 'bg-[#1F3864] text-white'
                              : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                          }`}
                        >
                          Modalità semplice (predefinita)
                        </button>
                        <button
                          type="button"
                          onClick={() => setClassDescriptionMode('dettagliata')}
                          className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                            activeDescMode === 'dettagliata'
                              ? 'bg-[#1F3864] text-white'
                              : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                          }`}
                        >
                          Modalità avanzata
                        </button>
                      </div>
                    </div>

                    {activeDescMode === 'rapida' ? (
                      <div className="space-y-4">
                        <SimpleClassDescriptionBuilder
                          plan={draft}
                          selection={currentQuickSelection}
                          appliedFeedback={simpleDescAppliedFeedback}
                          applyButtonLabel="Applica nella descrizione della classe"
                          onChangeSelection={(nextQuick) => {
                            setSimpleDescAppliedFeedback(false);
                            setDraft((prev) => ({
                              ...prev,
                              analisiPartenza: {
                                ...prev.analisiPartenza,
                                questionario: {
                                  risposte: prev.analisiPartenza.questionario?.risposte ?? {},
                                  modalitaGenerazione:
                                    prev.analisiPartenza.questionario?.modalitaGenerazione ??
                                    'completa',
                                  ultimoAggiornamento: new Date().toISOString(),
                                  modalitaCompilazione: 'rapida',
                                  modalitaRapida: nextQuick,
                                },
                              },
                            }));
                          }}
                          onApplyDescription={(text, usedSelection) => {
                            const suggestedSit = deriveSuggestedSituazioneFromQuick(usedSelection);
                            setSimpleDescAppliedFeedback(true);
                            setDraft((prev) => ({
                              ...prev,
                              situazione: {
                                ...prev.situazione,
                                tipologie: suggestedSit.tipologie,
                                livello: suggestedSit.livello,
                              },
                              analisiPartenza: {
                                ...prev.analisiPartenza,
                                descrizioneDisciplinare: text,
                                questionario: {
                                  risposte: prev.analisiPartenza.questionario?.risposte ?? {},
                                  modalitaGenerazione: 'completa',
                                  ultimoAggiornamento: new Date().toISOString(),
                                  modalitaCompilazione: 'rapida',
                                  modalitaRapida: usedSelection,
                                },
                              },
                            }));
                          }}
                        />

                        <label className="block">
                          <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                            Descrizione della classe risultante (modificabile liberamente)
                          </span>
                          <textarea
                            rows={6}
                            value={draft.analisiPartenza.descrizioneDisciplinare}
                            onChange={(e) =>
                              setDraft((prev) => ({
                                ...prev,
                                analisiPartenza: {
                                  ...prev.analisiPartenza,
                                  descrizioneDisciplinare: e.target.value,
                                },
                              }))
                            }
                            placeholder="Rispondi alle 5 domande sopra e clicca «Applica nella descrizione della classe» oppure scrivi direttamente qui..."
                            className="mt-1.5 w-full rounded-lg border border-slate-300 p-3 text-sm leading-relaxed dark:border-slate-700 dark:bg-slate-950"
                          />
                        </label>

                        <details className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                          <summary className="cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Griglia ministeriale sintetica (Tipologia, Livello e Mezzi di individuazione — facoltativo)
                          </summary>
                          <div className="mt-3">{renderSituazioneGrids()}</div>
                        </details>
                      </div>
                    ) : (
                      <>
                        {renderSituazioneGrids()}

                        <div className="border-t border-slate-200 pt-5 dark:border-slate-800">
                          <ClassCharacteristicsPanel
                            dimensions={draft.situazione.caratteristicheDimensioni}
                            alunniTotali={draft.composizione.alunni ?? 0}
                            soglieQuote={settings.soglieQuoteCaratteristiche}
                            contextSeed={`${draft.id}|${draft.datiGenerali.classe}|${draft.datiGenerali.sezione}|${draft.datiGenerali.disciplina}`}
                            variantePresentazione={draft.situazione.variantePresentazione}
                            onChangeVariantePresentazione={(nextVal) =>
                              setDraft((prev) => ({
                                ...prev,
                                situazione: {
                                  ...prev.situazione,
                                  variantePresentazione: nextVal,
                                },
                              }))
                            }
                            onChange={(nextDimensions) =>
                              setDraft((prev) => ({
                                ...prev,
                                situazione: {
                                  ...prev.situazione,
                                  caratteristicheDimensioni: nextDimensions,
                                },
                              }))
                            }
                          />
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}
            </section>
          )}

          {/* SEZIONE 3: ANALISI DELLA SITUAZIONE DI PARTENZA & QUESTIONARIO */}
          {activeSection === 'analisi' && (
            <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-base font-bold text-[#1F3864] dark:text-blue-300">
                3. Analisi della situazione di partenza e fasce di livello
              </h2>

              <ClassQuestionnairePanel
                plan={draft}
                onUpdateQuestionnaire={(nextQ: ClassQuestionnaire) =>
                  setDraft((prev) => ({
                    ...prev,
                    analisiPartenza: {
                      ...prev.analisiPartenza,
                      questionario: nextQ,
                    },
                  }))
                }
                onApplyGeneratedDescription={(text, mode, nextQuestionnaire) =>
                  setDraft((prev) => ({
                    ...prev,
                    analisiPartenza: {
                      ...prev.analisiPartenza,
                      descrizioneDisciplinare: text,
                      questionario: nextQuestionnaire ?? {
                        ...(prev.analisiPartenza.questionario ?? {
                          risposte: {},
                          modalitaGenerazione: mode,
                          ultimoAggiornamento: null,
                        }),
                        modalitaGenerazione: mode,
                        ultimoAggiornamento: new Date().toISOString(),
                      },
                    },
                  }))
                }
              />

              <label className="block">
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  Situazione di partenza degli alunni in relazione alla disciplina (modificabile liberamente, nessun nome)
                </span>
                <textarea
                  rows={7}
                  value={draft.analisiPartenza.descrizioneDisciplinare}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      analisiPartenza: {
                        ...prev.analisiPartenza,
                        descrizioneDisciplinare: e.target.value,
                      },
                    }))
                  }
                  placeholder="Usa il questionario guidato sopra per generare la descrizione sintetica o completa, oppure scrivi e modifica liberamente il testo..."
                  className="mt-1.5 w-full rounded-lg border border-slate-300 p-3 text-sm leading-relaxed dark:border-slate-700 dark:bg-slate-950"
                />
              </label>

              <div className="space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Livelli di partenza rilevati e elenco alunni offline
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Compila i conteggi o inserisci gli alunni nelle 5 colonne sottostanti (import .xlsx o inserimento manuale). Nei file DOCX/PDF ufficiali vengono riportati i conteggi e i nominativi importati nella riga dedicata di Livelli di partenza (medie, BES/DSA/PEI e note restano privati).
                    </p>
                    <label className="mt-1.5 flex cursor-pointer items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={keepNamesOffline}
                        onChange={(e) => setKeepNamesOffline(e.target.checked)}
                        className="h-3.5 w-3.5 accent-[#1F3864]"
                      />
                      <span>Conserva nome e cognome in locale durante import .xlsx (riportati nella riga alunni di Livelli di partenza)</span>
                    </label>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={gradebookFileRef}
                      type="file"
                      accept=".xlsx,.xls,.ods"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (!file) return;
                        setGradebookError(null);
                        setGradebookStatus(null);
                        try {
                          const buffer = await file.arrayBuffer();
                          const parsed = parseGradebookBuffer(buffer, settings.soglieFasce, {
                            keepNames: keepNamesOffline,
                          });
                          setDraft((prev) => {
                            const excl = prev.analisiPartenza.escludiDisabilitaDaFasce !== false;
                            const nextLivelli = computeLivelliFromStudents(parsed.entries, {
                              excludeDisabilita: excl,
                            });
                            const genders = keepNamesOffline
                              ? computeGenderCountsFromStudents(parsed.entries)
                              : null;
                            const isManualAlunni = Boolean(
                              prev.composizione.inserimentoManualeAlunni
                            );
                            const nextAlunni = isManualAlunni
                              ? prev.composizione.alunni
                              : genders
                              ? genders.maschi + genders.femmine
                              : parsed.entries.length;
                            return {
                              ...prev,
                              composizione: {
                                ...prev.composizione,
                                ...(genders
                                  ? { maschi: genders.maschi, femmine: genders.femmine }
                                  : {}),
                                ...(typeof nextAlunni === 'number'
                                  ? { alunni: nextAlunni }
                                  : {}),
                              },
                              analisiPartenza: {
                                ...prev.analisiPartenza,
                                livelli: nextLivelli,
                                alunniAnonimiFasce: parsed.entries,
                                registroClasseRilevata: parsed.classeRilevata,
                              },
                              cronologiaModifiche: [
                                {
                                  id: crypto.randomUUID(),
                                  timestamp: new Date().toISOString(),
                                  evento: 'Import registro voti',
                                  dettaglio: `Importati ${parsed.entries.length} alunni (${parsed.classeRilevata || 'registro Excel'}).`,
                                },
                                ...(prev.cronologiaModifiche ?? []),
                              ],
                            };
                          });
                          setGradebookStatus(
                            `Registro importato in locale (${parsed.entries.length} alunni). I conteggi per fascia sono stati aggiornati.`
                          );
                        } catch (err) {
                          setGradebookError(
                            err instanceof Error
                              ? err.message
                              : 'Impossibile leggere il registro Excel selezionato.'
                          );
                        }
                      }}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => gradebookFileRef.current?.click()}
                      className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-[#1F3864] bg-white px-3 py-1.5 text-xs font-semibold text-[#1F3864] hover:bg-blue-50 dark:border-blue-400 dark:bg-slate-900 dark:text-blue-300 dark:hover:bg-slate-800"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Importa registro (.xlsx)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDraft((prev) => {
                          const current = prev.analisiPartenza.alunniAnonimiFasce ?? [];
                          const added = createManualStudentEntry(
                            current,
                            { nominativo: '', media: null },
                            settings.soglieFasce
                          );
                          const next = [...current, added];
                          const excl = prev.analisiPartenza.escludiDisabilitaDaFasce !== false;
                          return {
                            ...prev,
                            analisiPartenza: {
                              ...prev.analisiPartenza,
                              alunniAnonimiFasce: next,
                              livelli: computeLivelliFromStudents(next, { excludeDisabilita: excl }),
                            },
                          };
                        });
                      }}
                      className="inline-flex items-center gap-1 whitespace-nowrap shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Aggiungi alunno
                    </button>
                  </div>
                </div>

                {gradebookStatus && (
                  <div
                    role="status"
                    className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
                  >
                    <FileSpreadsheet className="h-4 w-4 shrink-0" />
                    <span>{gradebookStatus}</span>
                  </div>
                )}

                {gradebookError && (
                  <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
                  >
                    {gradebookError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {(
                    [
                      ['bassoAlunni', 'Basso (voti < 6)'],
                      ['medioBassoAlunni', 'Medio/basso (voto 6)'],
                      ['medioAlunni', 'Medio (voti 7/8)'],
                      ['altoAlunni', 'Alto (voti 9/10)'],
                    ] as const
                  ).map(([field, label]) => (
                    <label key={field} className="block">
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        {label}
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={40}
                        value={draft.analisiPartenza.livelli[field]}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            analisiPartenza: {
                              ...prev.analisiPartenza,
                              livelli: {
                                ...prev.analisiPartenza.livelli,
                                [field]: Math.max(0, Number(e.target.value) || 0),
                              },
                            },
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono-num text-sm dark:border-slate-700 dark:bg-slate-950"
                      />
                    </label>
                  ))}
                </div>
                {typeof draft.composizione.alunni === 'number' &&
                  sumLevels !== draft.composizione.alunni && (
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Nota: la somma delle fasce ({sumLevels}) differisce dal totale alunni (
                    {draft.composizione.alunni}).
                  </p>
                )}

                <div className="pt-2">
                  <FasceLivelloBoard
                    entries={draft.analisiPartenza.alunniAnonimiFasce ?? []}
                    soglie={settings.soglieFasce}
                    classeRilevata={draft.analisiPartenza.registroClasseRilevata}
                    excludeDisabilita={draft.analisiPartenza.escludiDisabilitaDaFasce !== false}
                    settings={settings}
                    onToggleExcludeDisabilita={(nextExclude) => {
                      setDraft((prev) => ({
                        ...prev,
                        analisiPartenza: {
                          ...prev.analisiPartenza,
                          escludiDisabilitaDaFasce: nextExclude,
                          livelli: computeLivelliFromStudents(
                            prev.analisiPartenza.alunniAnonimiFasce ?? [],
                            { excludeDisabilita: nextExclude }
                          ),
                        },
                      }));
                    }}
                    tableExportContext={{
                      livelliOverride: draft.analisiPartenza.livelli,
                      classeLabel: [
                        `${draft.datiGenerali.classe}${draft.datiGenerali.sezione}`.trim(),
                        draft.datiGenerali.disciplina,
                        draft.datiGenerali.annoScolastico,
                      ]
                        .filter(Boolean)
                        .join(' · '),
                      layoutDocumento:
                        draft.datiGenerali.layoutDocumento ??
                        settings.defaultLayoutDocumento ??
                        'originale',
                    }}
                    onChangeEntries={(nextEntries: AnonymousStudentBandEntry[]) => {
                      setDraft((prev) => {
                        const excl = prev.analisiPartenza.escludiDisabilitaDaFasce !== false;
                        const nextLivelli = computeLivelliFromStudents(nextEntries, {
                          excludeDisabilita: excl,
                        });
                        return {
                          ...prev,
                          analisiPartenza: {
                            ...prev.analisiPartenza,
                            alunniAnonimiFasce: nextEntries,
                            livelli: nextLivelli,
                            registroClasseRilevata:
                              nextEntries.length === 0
                                ? undefined
                                : prev.analisiPartenza.registroClasseRilevata,
                          },
                        };
                      });
                      if (nextEntries.length === 0) {
                        setGradebookStatus(null);
                        setGradebookError(null);
                      }
                    }}
                    onSyncComposizione={(
                      totaleAlunni,
                      totaleBes,
                      totaleDisabilita = 0,
                      besConCertificazione,
                      besSenzaCertificazione,
                      maschi,
                      femmine
                    ) => {
                      setDraft((prev) => {
                        const prevComp = prev.composizione;
                        const isManualAlunni = Boolean(prevComp.inserimentoManualeAlunni);
                        const nextAlunni =
                          !isManualAlunni &&
                          typeof maschi === 'number' &&
                          typeof femmine === 'number'
                            ? maschi + femmine
                            : isManualAlunni && typeof prevComp.alunni === 'number'
                            ? prevComp.alunni
                            : totaleAlunni;
                        const nextComp = {
                          ...prevComp,
                          ...(typeof maschi === 'number' ? { maschi } : {}),
                          ...(typeof femmine === 'number' ? { femmine } : {}),
                          alunni: nextAlunni,
                          bes: totaleBes,
                          besConCertificazione,
                          besSenzaCertificazione,
                          disabilita: totaleDisabilita,
                        };
                        const currentBesText = prev.interventi.besInterventiProgrammati.trim();
                        const prevAutoText = buildBesInterventiText(prevComp).trim();
                        const shouldAutoUpdate =
                          !currentBesText ||
                          currentBesText === prevAutoText ||
                          currentBesText === DEFAULT_BES_INTERVENTI_TEXT.trim();
                        return {
                          ...prev,
                          composizione: nextComp,
                          interventi: shouldAutoUpdate
                            ? {
                                ...prev.interventi,
                                besInterventiProgrammati: buildBesInterventiText(nextComp),
                              }
                            : prev.interventi,
                          situazione: {
                            ...prev.situazione,
                            caratteristicheDimensioni: reconcileDimensionsWithTotalStudents(
                              prev.situazione.caratteristicheDimensioni,
                              prevComp.alunni ?? 0,
                              nextAlunni ?? totaleAlunni
                            ),
                          },
                        };
                      });
                      setGradebookStatus(
                        `Composizione aggiornata: ${totaleAlunni} alunni totali${
                          typeof maschi === 'number' && typeof femmine === 'number'
                            ? ` (${maschi} M, ${femmine} F)`
                            : ''
                        }, ${totaleBes} BES${
                          besConCertificazione !== undefined || besSenzaCertificazione !== undefined
                            ? ` (${besConCertificazione ?? 0} con cert. DSA, ${
                                besSenzaCertificazione ?? 0
                              } senza cert.)`
                            : ''
                        }, ${totaleDisabilita} con disabilità.`
                      );
                    }}
                  />
                </div>
              </div>

              <fieldset className="space-y-2 border-t border-slate-200 pt-4 dark:border-slate-800">
                <legend className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Fonti di rilevazione dei dati
                </legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {FONTI_RILEVAZIONE_OPTIONS.map((opt) => (
                    <label
                      key={opt}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                    >
                      <input
                        type="checkbox"
                        checked={draft.analisiPartenza.fontiRilevazione.includes(opt)}
                        onChange={() =>
                          setDraft((prev) => ({
                            ...prev,
                            analisiPartenza: {
                              ...prev.analisiPartenza,
                              fontiRilevazione: toggleArrayValue(
                                prev.analisiPartenza.fontiRilevazione,
                                opt
                              ) as typeof prev.analisiPartenza.fontiRilevazione,
                            },
                          }))
                        }
                        className="h-4 w-4 accent-[#1F3864]"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
                <label className="mt-2 block">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Altra fonte (facoltativo)
                  </span>
                  <input
                    type="text"
                    value={draft.analisiPartenza.altraFonte}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        analisiPartenza: {
                          ...prev.analisiPartenza,
                          altraFonte: e.target.value,
                        },
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  />
                </label>
              </fieldset>
            </section>
          )}

          {/* SEZIONE 4: STRATEGIE ED INTERVENTI */}
          {activeSection === 'interventi' && (
            <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-base font-bold text-[#1F3864] dark:text-blue-300">
                4. Strategie ed interventi per potenziamento, consolidamento e recupero
              </h2>

              <div className="space-y-4">
                {(
                  [
                    {
                      title: 'POTENZIAMENTO',
                      field: 'potenziamento' as const,
                      altroField: 'potenziamentoAltro' as const,
                      options: STRATEGIE_POTENZIAMENTO_OPTIONS,
                    },
                    {
                      title: 'CONSOLIDAMENTO',
                      field: 'consolidamento' as const,
                      altroField: 'consolidamentoAltro' as const,
                      options: STRATEGIE_CONSOLIDAMENTO_OPTIONS,
                    },
                    {
                      title: 'RECUPERO',
                      field: 'recupero' as const,
                      altroField: 'recuperoAltro' as const,
                      options: STRATEGIE_RECUPERO_OPTIONS,
                    },
                  ] as const
                ).map((group) => (
                  <fieldset
                    key={group.field}
                    className="space-y-2 rounded-lg border border-slate-200 p-4 dark:border-slate-800"
                  >
                    <legend className="px-1 text-xs font-bold uppercase tracking-wide text-[#1F3864] dark:text-blue-300">
                      {group.title}
                    </legend>
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-1 text-xs">
                      <span className="text-slate-500 dark:text-slate-400">
                        Selezionate {draft.interventi[group.field].length} di {group.options.length}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setDraft((prev) => ({
                              ...prev,
                              interventi: {
                                ...prev.interventi,
                                [group.field]: [...group.options],
                              },
                            }))
                          }
                          className="font-semibold text-[#1F3864] hover:underline dark:text-blue-300"
                        >
                          Seleziona tutte
                        </button>
                        <span className="text-slate-300 dark:text-slate-700">·</span>
                        <button
                          type="button"
                          onClick={() =>
                            setDraft((prev) => ({
                              ...prev,
                              interventi: {
                                ...prev.interventi,
                                [group.field]: [],
                              },
                            }))
                          }
                          className="font-medium text-slate-600 hover:underline dark:text-slate-400"
                        >
                          Deseleziona tutte
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {group.options.map((opt) => (
                        <label key={opt} className="flex cursor-pointer items-start gap-2.5 text-sm">
                          <input
                            type="checkbox"
                            checked={draft.interventi[group.field].includes(opt)}
                            onChange={() =>
                              setDraft((prev) => ({
                                ...prev,
                                interventi: {
                                  ...prev.interventi,
                                  [group.field]: toggleArrayValue(
                                    prev.interventi[group.field],
                                    opt
                                  ),
                                },
                              }))
                            }
                            className="mt-1 h-4 w-4 accent-[#1F3864]"
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={draft.interventi[group.altroField]}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          interventi: {
                            ...prev.interventi,
                            [group.altroField]: e.target.value,
                          },
                        }))
                      }
                      placeholder="Altro (facoltativo)..."
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950"
                    />
                  </fieldset>
                ))}
              </div>

              <div className="space-y-2 border-t border-slate-200 pt-4 dark:border-slate-800">
                <PrivacyNoticeBanner compact />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Alunni con BES e interventi programmati (PDP, PEI, misure dispensative e strumenti compensativi)
                    </span>
                    {(() => {
                      const b = resolveBesBreakdown(draft.composizione);
                      if (b.bes === 0 && b.disabilita === 0) return null;
                      return (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Composizione rilevata: {b.bes} BES ({b.cert} con cert. DSA, {b.senza} senza cert.) · {b.disabilita} con disabilità
                        </p>
                      );
                    })()}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        interventi: {
                          ...prev.interventi,
                          besInterventiProgrammati: buildBesInterventiText(prev.composizione),
                        },
                      }))
                    }
                    className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Rigenera testo concordato BES / PDP / PEI
                  </button>
                </div>
                <textarea
                  rows={5}
                  value={draft.interventi.besInterventiProgrammati}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      interventi: {
                        ...prev.interventi,
                        besInterventiProgrammati: e.target.value,
                      },
                    }))
                  }
                  placeholder="Descrivere strumenti compensativi, misure dispensative, raccordo al PDP e strategie inclusive senza indicare nomi..."
                  className="mt-1.5 w-full rounded-lg border border-slate-300 p-3 text-sm leading-relaxed dark:border-slate-700 dark:bg-slate-950"
                />
              </div>
            </section>
          )}

          {/* SEZIONE 5: CURRICOLO */}
          {activeSection === 'curricolo' && (
            <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-bold text-[#1F3864] dark:text-blue-300">
                  5. Traguardi, Competenze, Abilità / Obiettivi e Conoscenze (Curricolo)
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={programDocFileRef}
                    type="file"
                    accept=".pdf,.docx,.doc"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (!file) return;
                      setImportingProgramDoc(true);
                      setCatalogImportError(null);
                      try {
                        const result = await importProgrammazioneFromFile(file, settings, draft);
                        setPendingProgramDocImport(result);
                      } catch (err) {
                        setCatalogImportError(
                          err instanceof Error
                            ? err.message
                            : 'Impossibile estrarre il programma dal file selezionato.'
                        );
                      } finally {
                        setImportingProgramDoc(false);
                      }
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={importingProgramDoc}
                    onClick={() => programDocFileRef.current?.click()}
                    className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <FileUp className="h-3.5 w-3.5" />
                    {importingProgramDoc ? 'Lettura file...' : 'Importa da vecchio PDF / Word'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCatalogSelector(true)}
                    className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg bg-[#1F3864] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#172b4d]"
                  >
                    <BookMarked className="h-3.5 w-3.5" />
                    Seleziona dal Curricolo Verticale
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLibraryPicker((v) => !v)}
                    className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-[#1F3864] px-3 py-1.5 text-xs font-semibold text-[#1F3864] hover:bg-blue-50 dark:border-blue-400 dark:text-blue-300 dark:hover:bg-slate-800"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    {showLibraryPicker ? 'Chiudi libreria locale' : 'Inserisci dalla libreria locale'}
                  </button>
                </div>
              </div>

              {(() => {
                const recommendedIndicazioni = getDefaultIndicazioniForClasseAndYear(
                  draft.datiGenerali.classe,
                  draft.datiGenerali.annoScolastico
                );
                const currentIndicazioni =
                  draft.curricolo.indicazioniVersione ?? recommendedIndicazioni;
                return (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 dark:border-slate-800 dark:bg-slate-950/40">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Riferimento curricolare: Classe {draft.datiGenerali.classe} · A.S.{' '}
                        {draft.datiGenerali.annoScolastico}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Predefinito automatico:{' '}
                        <strong className="font-semibold">
                          {INDICAZIONI_LABELS[recommendedIndicazioni]}
                        </strong>{' '}
                        (dal 2027/28 Nuove anche per Seconda; dal 2028/29 Nuove per tutte le classi)
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {currentIndicazioni !== recommendedIndicazioni && (
                        <button
                          type="button"
                          onClick={() =>
                            setDraft((prev) => ({
                              ...prev,
                              curricolo: {
                                ...prev.curricolo,
                                indicazioniVersione: recommendedIndicazioni,
                              },
                            }))
                          }
                          className="text-xs font-semibold text-[#1F3864] hover:underline dark:text-blue-400"
                        >
                          Ripristina predefinito
                        </button>
                      )}
                      <select
                        aria-label="Riferimento curricolare Indicazioni Nazionali"
                        value={currentIndicazioni}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            curricolo: {
                              ...prev.curricolo,
                              indicazioniVersione: e.target.value as IndicazioniVersion,
                            },
                          }))
                        }
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      >
                        <option value="nuove">
                          {INDICAZIONI_LABELS.nuove}
                          {recommendedIndicazioni === 'nuove' ? ' (predefinite)' : ''}
                        </option>
                        <option value="vecchie">
                          {INDICAZIONI_LABELS.vecchie}
                          {recommendedIndicazioni === 'vecchie' ? ' (predefinite)' : ''}
                        </option>
                      </select>
                    </div>
                  </div>
                );
              })()}

              {catalogImportError && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
                >
                  {catalogImportError}
                </div>
              )}

              {catalogImportFeedback && (
                <div
                  role="status"
                  className="flex items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
                >
                  <span>{catalogImportFeedback}</span>
                  <button
                    type="button"
                    onClick={() => setCatalogImportFeedback(null)}
                    aria-label="Chiudi avviso importazione"
                    className="rounded p-0.5 hover:bg-emerald-200/50 dark:hover:bg-emerald-900/50"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {showLibraryPicker && (
                <div className="rounded-lg border border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                      Voci disponibili per {draft.datiGenerali.disciplina} · Classe{' '}
                      {draft.datiGenerali.classe}
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowLibraryPicker(false)}
                      aria-label="Chiudi selettore libreria"
                      className="rounded p-1 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <input
                    type="search"
                    value={libraryFilterText}
                    onChange={(e) => setLibraryFilterText(e.target.value)}
                    placeholder="Filtra voci del curricolo locale..."
                    className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
                  />
                  <div className="mt-3 max-h-60 space-y-2 overflow-y-auto pr-1">
                    {matchingLibrary.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-900"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                            {item.titolo}{' '}
                            <span className="font-normal text-slate-500">
                              · {item.disciplina} · {item.categoria}
                            </span>
                          </p>
                          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                            {item.testo}
                          </p>
                          {item.testoCollegato && (
                            <p className="mt-0.5 text-xs italic text-slate-500 dark:text-slate-400">
                              Conoscenze: {item.testoCollegato}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => insertLibraryItemIntoPlan(item)}
                          className="inline-flex items-center gap-1 whitespace-nowrap shrink-0 rounded-md bg-[#1F3864] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#172b4d]"
                        >
                          <Plus className="h-3 w-3" />
                          Inserisci
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <label className="block">
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  Nota introduttiva sezione curricolo
                </span>
                <textarea
                  rows={2}
                  value={draft.curricolo.notaIntroduttiva}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      curricolo: { ...prev.curricolo, notaIntroduttiva: e.target.value },
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"
                />
              </label>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Traguardi e competenze attese
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        curricolo: {
                          ...prev.curricolo,
                          competenzeAttese: [...prev.curricolo.competenzeAttese, ''],
                        },
                      }))
                    }
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#1F3864] hover:underline dark:text-blue-400"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Aggiungi traguardo
                  </button>
                </div>
                {draft.curricolo.competenzeAttese.map((comp, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      value={comp}
                      onChange={(e) =>
                        setDraft((prev) => {
                          const next = [...prev.curricolo.competenzeAttese];
                          next[idx] = e.target.value;
                          return {
                            ...prev,
                            curricolo: { ...prev.curricolo, competenzeAttese: next },
                          };
                        })
                      }
                      placeholder="Descrizione traguardo per lo sviluppo delle competenze..."
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950"
                    />
                    <button
                      type="button"
                      aria-label="Rimuovi traguardo"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          curricolo: {
                            ...prev.curricolo,
                            competenzeAttese: prev.curricolo.competenzeAttese.filter(
                              (_, i) => i !== idx
                            ),
                          },
                        }))
                      }
                      className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="space-y-2 border-t border-slate-200 pt-4 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Competenze digitali (DigComp 2.2 — inserite dopo le competenze disciplinari)
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const defs = getDefaultCurricoloForDisciplina(
                          draft.datiGenerali.disciplina
                        );
                        setDraft((prev) => ({
                          ...prev,
                          curricolo: {
                            ...prev.curricolo,
                            competenzeDigitali: defs.competenzeDigitali,
                            attivitaProgrammate: defs.attivitaProgrammate,
                          },
                        }));
                      }}
                      className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Predefiniti per {draft.datiGenerali.disciplina}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          curricolo: {
                            ...prev.curricolo,
                            competenzeDigitali: [...prev.curricolo.competenzeDigitali, ''],
                          },
                        }))
                      }
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#1F3864] hover:underline dark:text-blue-400"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Aggiungi competenza digitale
                    </button>
                  </div>
                </div>
                {draft.curricolo.competenzeDigitali.map((compDig, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      value={compDig}
                      onChange={(e) =>
                        setDraft((prev) => {
                          const next = [...prev.curricolo.competenzeDigitali];
                          next[idx] = e.target.value;
                          return {
                            ...prev,
                            curricolo: { ...prev.curricolo, competenzeDigitali: next },
                          };
                        })
                      }
                      placeholder="Competenza digitale DigComp 2.2 collegata alla disciplina..."
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950"
                    />
                    <button
                      type="button"
                      aria-label="Rimuovi competenza digitale"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          curricolo: {
                            ...prev.curricolo,
                            competenzeDigitali: prev.curricolo.competenzeDigitali.filter(
                              (_, i) => i !== idx
                            ),
                          },
                        }))
                      }
                      className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Voci importate dal Catalogo Curricolo Verticale / manuali */}
              <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Voci selezionate dal Curricolo Verticale e obiettivi specifici (
                      {draft.curricolo.vociCatalogoImportate?.length ?? 0})
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Ogni voce è una copia autonoma: puoi modificarla, riordinarla, eliminarla o ripristinare la formulazione del catalogo.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddManualCurricoloVoice}
                    className="inline-flex items-center gap-1 whitespace-nowrap shrink-0 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Aggiungi voce manuale
                  </button>
                </div>

                {(draft.curricolo.vociCatalogoImportate?.length ?? 0) === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500 dark:border-slate-700">
                    Nessuna voce curricolare importata. Clicca “Seleziona dal Curricolo Verticale” per scegliere competenze, obiettivi, abilità e conoscenze dalla Prima, Seconda o Terza.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {(draft.curricolo.vociCatalogoImportate ?? []).map((voice, index, arr) => {
                      const isOtherClass = voice.classeOrigine !== draft.datiGenerali.classe;
                      const restorable = isVoiceRestorable(voice, curricoloCatalog);
                      return (
                        <div
                          key={voice.id}
                          className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <select
                                value={voice.tipo}
                                aria-label="Tipo voce curricolare"
                                onChange={(e) =>
                                  handleUpdateImportedVoice(voice.id, {
                                    tipo: e.target.value as CurricoloVoiceType,
                                  })
                                }
                                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                              >
                                {CURRICOLO_TYPE_ORDER.map((t) => (
                                  <option key={t} value={t}>
                                    {CURRICOLO_TYPE_LABELS[t]}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="text"
                                value={voice.nucleoTematico}
                                onChange={(e) =>
                                  handleUpdateImportedVoice(voice.id, {
                                    nucleoTematico: e.target.value,
                                  })
                                }
                                placeholder="Nucleo tematico..."
                                aria-label="Nucleo tematico"
                                className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                              />
                              {isOtherClass && (
                                <span className="rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                                  Provenienza: Classe {voice.classeOrigine}
                                </span>
                              )}
                              {restorable && (
                                <span className="rounded-md border border-blue-300 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
                                  Modificata (ripristinabile)
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              {restorable && (
                                <button
                                  type="button"
                                  onClick={() => handleRestoreVoiceOriginal(voice.id)}
                                  title="Ripristina formulazione originale dal catalogo"
                                  className="inline-flex items-center gap-1 whitespace-nowrap shrink-0 rounded-md border border-blue-300 bg-white px-2 py-1 text-[11px] font-semibold text-[#1F3864] hover:bg-blue-50 dark:border-blue-700 dark:bg-slate-900 dark:text-blue-300"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                  Ripristina originale
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => handleMoveImportedVoice(voice.id, -1)}
                                aria-label="Sposta voce su"
                                title="Sposta su"
                                className="rounded-md p-1.5 text-slate-600 hover:bg-slate-200 disabled:opacity-35 dark:text-slate-300 dark:hover:bg-slate-800"
                              >
                                <ArrowUp className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={index === arr.length - 1}
                                onClick={() => handleMoveImportedVoice(voice.id, 1)}
                                aria-label="Sposta voce giù"
                                title="Sposta giù"
                                className="rounded-md p-1.5 text-slate-600 hover:bg-slate-200 disabled:opacity-35 dark:text-slate-300 dark:hover:bg-slate-800"
                              >
                                <ArrowDown className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteImportedVoice(voice.id)}
                                aria-label="Elimina voce curricolare"
                                title="Elimina voce"
                                className="rounded-md p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          <textarea
                            rows={2}
                            value={voice.testo}
                            onChange={(e) =>
                              handleUpdateImportedVoice(voice.id, { testo: e.target.value })
                            }
                            placeholder="Testo dell’obiettivo, competenza, abilità o conoscenza..."
                            className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm dark:border-slate-700 dark:bg-slate-900"
                          />
                          {voice.documentoProvenienza && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              Origine: Classe {voice.classeOrigine} · {voice.documentoProvenienza}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Tabella Programma disciplinare (2 colonne:{' '}
                      {(draft.curricolo.indicazioniVersione ??
                        getDefaultIndicazioniForClasseAndYear(
                          draft.datiGenerali.classe,
                          draft.datiGenerali.annoScolastico
                        )) === 'nuove'
                        ? 'Obiettivi'
                        : 'Abilità'}{' '}
                      · Conoscenze)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Contenuti raggruppati per nucleo tematico (es. Numeri, Spazio e figure; Biologia, Fisica…), seguiti da eventuali contenuti digitali.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {(draft.curricolo.vociCatalogoImportate?.length ?? 0) > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            curricolo: {
                              ...prev.curricolo,
                              competenzeAttese: extractCompetenzeFromCatalogVoices(
                                prev.curricolo.vociCatalogoImportate ?? [],
                                prev.curricolo.competenzeAttese
                              ),
                              righeAbilitaConoscenze: buildProgramRowsFromCatalogVoices(
                                prev.curricolo.vociCatalogoImportate ?? [],
                                prev.curricolo.righeAbilitaConoscenze,
                                { indicazioniVersione: prev.curricolo.indicazioniVersione }
                              ),
                            },
                          }))
                        }
                        className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-[#1F3864] px-3 py-1.5 text-xs font-semibold text-[#1F3864] hover:bg-blue-50 dark:border-blue-400 dark:text-blue-300 dark:hover:bg-slate-800"
                      >
                        <BookMarked className="h-3.5 w-3.5" />
                        Popola dalle voci importate
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          curricolo: {
                            ...prev.curricolo,
                            righeAbilitaConoscenze: [
                              ...prev.curricolo.righeAbilitaConoscenze,
                              { id: crypto.randomUUID(), competenze: '', abilita: '', conoscenze: '' },
                            ],
                          },
                        }))
                      }
                      className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Nuova riga programma
                    </button>
                  </div>
                </div>

                {draft.curricolo.righeAbilitaConoscenze.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500 dark:border-slate-700">
                    Nessuna riga inserita nel programma. Usa “Seleziona dal Curricolo Verticale”, “Importa da vecchio PDF / Word” oppure “Nuova riga programma”.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {draft.curricolo.righeAbilitaConoscenze.map((row) => {
                      const isNuove =
                        (draft.curricolo.indicazioniVersione ??
                          getDefaultIndicazioniForClasseAndYear(
                            draft.datiGenerali.classe,
                            draft.datiGenerali.annoScolastico
                          )) === 'nuove';
                      return (
                        <div
                          key={row.id}
                          className="space-y-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800"
                        >
                          <div className="flex items-end gap-3">
                            <label className="block flex-1">
                              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                Nucleo tematico (opzionale, stampato in neretto nell’esportazione)
                              </span>
                              <input
                                type="text"
                                value={row.traguardo ?? ''}
                                onChange={(e) =>
                                  setDraft((prev) => ({
                                    ...prev,
                                    curricolo: {
                                      ...prev.curricolo,
                                      righeAbilitaConoscenze: prev.curricolo.righeAbilitaConoscenze.map(
                                        (r) =>
                                          r.id === row.id ? { ...r, traguardo: e.target.value } : r
                                      ),
                                    },
                                  }))
                                }
                                placeholder="Es. Il numero e le operazioni, Lettura, Comprensione e produzione..."
                                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold dark:border-slate-700 dark:bg-slate-950"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() =>
                                setDraft((prev) => ({
                                  ...prev,
                                  curricolo: {
                                    ...prev.curricolo,
                                    righeAbilitaConoscenze:
                                      prev.curricolo.righeAbilitaConoscenze.filter(
                                        (r) => r.id !== row.id
                                      ),
                                  },
                                }))
                              }
                              aria-label="Elimina riga programma"
                              className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="grid gap-3 lg:grid-cols-2">
                            <label className="block">
                              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                {isNuove ? 'Obiettivi' : 'Abilità'}
                              </span>
                              <textarea
                                rows={4}
                                value={row.abilita}
                                onChange={(e) =>
                                  setDraft((prev) => ({
                                    ...prev,
                                    curricolo: {
                                      ...prev.curricolo,
                                      righeAbilitaConoscenze: prev.curricolo.righeAbilitaConoscenze.map(
                                        (r) => (r.id === row.id ? { ...r, abilita: e.target.value } : r)
                                      ),
                                    },
                                  }))
                                }
                                placeholder={
                                  isNuove
                                    ? 'Obiettivi specifici di apprendimento...'
                                    : 'Abilità disciplinari...'
                                }
                                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                              />
                            </label>
                            <label className="block">
                              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                Conoscenze (Contenuti)
                              </span>
                              <textarea
                                rows={4}
                                value={row.conoscenze}
                                onChange={(e) =>
                                  setDraft((prev) => ({
                                    ...prev,
                                    curricolo: {
                                      ...prev.curricolo,
                                      righeAbilitaConoscenze: prev.curricolo.righeAbilitaConoscenze.map(
                                        (r) =>
                                          r.id === row.id ? { ...r, conoscenze: e.target.value } : r
                                      ),
                                    },
                                  }))
                                }
                                placeholder="Conoscenze / contenuti disciplinari raggruppati per nucleo..."
                                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                              />
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <label className="block border-t border-slate-200 pt-4 dark:border-slate-800">
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  Attività e nuclei operativi programmati
                </span>
                <textarea
                  rows={3}
                  value={draft.curricolo.attivitaProgrammate}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      curricolo: { ...prev.curricolo, attivitaProgrammate: e.target.value },
                    }))
                  }
                  placeholder="Unità di apprendimento, laboratori, compiti di realtà..."
                  className="mt-1.5 w-full rounded-lg border border-slate-300 p-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
            </section>
          )}

          {/* SEZIONE 6: METODI, STRUMENTI E DDI */}
          {activeSection === 'metodi' && (
            <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-bold text-[#1F3864] dark:text-blue-300">
                  6. Criteri metodologici, strategie, strumenti e DDI
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    const defaults = getDefaultMetodiStrumentiForDisciplina(
                      draft.datiGenerali.disciplina
                    );
                    setDraft((prev) => ({
                      ...prev,
                      metodiStrumenti: {
                        ...prev.metodiStrumenti,
                        premessaMetodologica: defaults.premessaMetodologica,
                        metodi: defaults.metodi,
                        mezziEStrumenti: defaults.mezziEStrumenti,
                        altreMetodologie: defaults.altreMetodologie,
                        altriSussidi: defaults.altriSussidi,
                        ausiliDidattici: defaults.ausiliDidattici,
                        didatticaDigitaleIntegrata: defaults.didatticaDigitaleIntegrata,
                      },
                    }));
                  }}
                  className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Applica predefiniti per {draft.datiGenerali.disciplina}
                </button>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Metodi e strumenti vengono preimpostati in base alla disciplina ({draft.datiGenerali.disciplina}); puoi selezionare o deselezionare liberamente qualsiasi voce.
              </p>

              <label className="block">
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  Premessa metodologica
                </span>
                <textarea
                  rows={4}
                  value={draft.metodiStrumenti.premessaMetodologica}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      metodiStrumenti: {
                        ...prev.metodiStrumenti,
                        premessaMetodologica: e.target.value,
                      },
                    }))
                  }
                  className="mt-1.5 w-full rounded-lg border border-slate-300 p-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                />
              </label>

              <div className="grid gap-5 sm:grid-cols-2">
                <fieldset className="space-y-2 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                  <legend className="px-1 text-xs font-bold uppercase text-[#1F3864] dark:text-blue-300">
                    Metodi
                  </legend>
                  {METODI_OPTIONS.map((opt) => (
                    <label key={opt} className="flex cursor-pointer items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={draft.metodiStrumenti.metodi.includes(opt)}
                        onChange={() =>
                          setDraft((prev) => ({
                            ...prev,
                            metodiStrumenti: {
                              ...prev.metodiStrumenti,
                              metodi: toggleArrayValue(prev.metodiStrumenti.metodi, opt),
                            },
                          }))
                        }
                        className="mt-1 h-4 w-4 accent-[#1F3864]"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                  <input
                    type="text"
                    value={draft.metodiStrumenti.altreMetodologie}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        metodiStrumenti: {
                          ...prev.metodiStrumenti,
                          altreMetodologie: e.target.value,
                        },
                      }))
                    }
                    placeholder="Altre metodologie (Brainstorming, Problem solving...)"
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950"
                  />
                </fieldset>

                <fieldset className="space-y-2 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                  <legend className="px-1 text-xs font-bold uppercase text-[#1F3864] dark:text-blue-300">
                    Mezzi e strumenti
                  </legend>
                  {MEZZI_STRUMENTI_OPTIONS.map((opt) => (
                    <label key={opt} className="flex cursor-pointer items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={draft.metodiStrumenti.mezziEStrumenti.includes(opt)}
                        onChange={() =>
                          setDraft((prev) => ({
                            ...prev,
                            metodiStrumenti: {
                              ...prev.metodiStrumenti,
                              mezziEStrumenti: toggleArrayValue(
                                prev.metodiStrumenti.mezziEStrumenti,
                                opt
                              ),
                            },
                          }))
                        }
                        className="mt-1 h-4 w-4 accent-[#1F3864]"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                  <input
                    type="text"
                    value={draft.metodiStrumenti.altriSussidi}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        metodiStrumenti: {
                          ...prev.metodiStrumenti,
                          altriSussidi: e.target.value,
                        },
                      }))
                    }
                    placeholder="Altri sussidi..."
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950"
                  />
                </fieldset>
              </div>

              <label className="block">
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  Ausili didattici (libri di testo in adozione, sussidi specifici)
                </span>
                <textarea
                  rows={2}
                  value={draft.metodiStrumenti.ausiliDidattici}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      metodiStrumenti: {
                        ...prev.metodiStrumenti,
                        ausiliDidattici: e.target.value,
                      },
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  Didattica Digitale Integrata
                </span>
                <textarea
                  rows={3}
                  value={draft.metodiStrumenti.didatticaDigitaleIntegrata}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      metodiStrumenti: {
                        ...prev.metodiStrumenti,
                        didatticaDigitaleIntegrata: e.target.value,
                      },
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
            </section>
          )}

          {/* SEZIONE 7: VERIFICHE E VALUTAZIONE */}
          {activeSection === 'verifiche' && (
            <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-bold text-[#1F3864] dark:text-blue-300">
                  7. Verifiche in itinere, valutazione e firma
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    const defaults = getDefaultVerificheValutazioneForDisciplina(
                      draft.datiGenerali.disciplina
                    );
                    setDraft((prev) => ({
                      ...prev,
                      verificheValutazione: {
                        ...prev.verificheValutazione,
                        verificheScritte: defaults.verificheScritte,
                        verificheOrali: defaults.verificheOrali,
                        altriTipiProve: defaults.altriTipiProve,
                        criteriValutazione: defaults.criteriValutazione,
                      },
                    }));
                  }}
                  className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Applica predefiniti per {draft.datiGenerali.disciplina}
                </button>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Verifiche scritte, orali, prove pratiche/autentiche e criteri di valutazione sono precompilati in base alla disciplina ({draft.datiGenerali.disciplina}); puoi personalizzare qualsiasi voce.
              </p>

              <div className="grid gap-5 sm:grid-cols-2">
                <fieldset className="space-y-2 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                  <legend className="px-1 text-xs font-bold uppercase text-[#1F3864] dark:text-blue-300">
                    Modalità di verifica scritta
                  </legend>
                  {VERIFICHE_SCRITTE_OPTIONS.map((opt) => (
                    <label key={opt} className="flex cursor-pointer items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={draft.verificheValutazione.verificheScritte.includes(opt)}
                        onChange={() =>
                          setDraft((prev) => ({
                            ...prev,
                            verificheValutazione: {
                              ...prev.verificheValutazione,
                              verificheScritte: toggleArrayValue(
                                prev.verificheValutazione.verificheScritte,
                                opt
                              ),
                            },
                          }))
                        }
                        className="mt-1 h-4 w-4 accent-[#1F3864]"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </fieldset>

                <fieldset className="space-y-2 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                  <legend className="px-1 text-xs font-bold uppercase text-[#1F3864] dark:text-blue-300">
                    Modalità di verifica orale
                  </legend>
                  {VERIFICHE_ORALI_OPTIONS.map((opt) => (
                    <label key={opt} className="flex cursor-pointer items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={draft.verificheValutazione.verificheOrali.includes(opt)}
                        onChange={() =>
                          setDraft((prev) => ({
                            ...prev,
                            verificheValutazione: {
                              ...prev.verificheValutazione,
                              verificheOrali: toggleArrayValue(
                                prev.verificheValutazione.verificheOrali,
                                opt
                              ),
                            },
                          }))
                        }
                        className="mt-1 h-4 w-4 accent-[#1F3864]"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                  <input
                    type="text"
                    value={draft.verificheValutazione.altriTipiProve}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        verificheValutazione: {
                          ...prev.verificheValutazione,
                          altriTipiProve: e.target.value,
                        },
                      }))
                    }
                    placeholder="Altri tipi di prove..."
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950"
                  />
                </fieldset>
              </div>

              <label className="block">
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  Criteri di valutazione
                </span>
                <textarea
                  rows={5}
                  value={draft.verificheValutazione.criteriValutazione}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      verificheValutazione: {
                        ...prev.verificheValutazione,
                        criteriValutazione: e.target.value,
                      },
                    }))
                  }
                  className="mt-1.5 w-full rounded-lg border border-slate-300 p-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    Titolo e declinazione docente
                  </span>
                  <select
                    value={draft.datiGenerali.docenteGenere ?? settings.defaultDocenteGenere ?? 'F'}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        datiGenerali: {
                          ...prev.datiGenerali,
                          docenteGenere: e.target.value as DocenteGenere,
                        },
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  >
                    <option value="F">Professoressa (Prof.ssa · La docente)</option>
                    <option value="M">Professore (Prof. · Il docente)</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    Firma in calce (Nome e Cognome)
                  </span>
                  <input
                    type="text"
                    value={draft.verificheValutazione.firmaDocente}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        verificheValutazione: {
                          ...prev.verificheValutazione,
                          firmaDocente: e.target.value,
                        },
                      }))
                    }
                    placeholder="Nome Cognome..."
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  />
                  <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                    Anteprima firma in calce:
                    <strong className="mt-0.5 block whitespace-pre-line text-right text-slate-700 dark:text-slate-200">
                      {formatFirmaDocente(
                        draft.verificheValutazione.firmaDocente || draft.datiGenerali.docente,
                        draft.datiGenerali.docenteGenere ?? settings.defaultDocenteGenere ?? 'F'
                      )}
                    </strong>
                  </span>
                </label>
              </div>
            </section>
          )}
        </div>

        {/* Anteprima live affiancata */}
        {showLivePreview && (
          <div className="max-h-[calc(100vh-140px)] overflow-y-auto rounded-xl border border-slate-200 bg-slate-100 p-3 dark:border-slate-800 dark:bg-slate-950">
            <DocumentSheetPreview plan={draft} settings={settings} mapping={mapping} />
          </div>
        )}
      </div>

      <CurricoloCatalogSelector
        open={showCatalogSelector}
        catalog={curricoloCatalog}
        planClasse={draft.datiGenerali.classe}
        planAnnoScolastico={draft.datiGenerali.annoScolastico}
        planIndicazioni={
          draft.curricolo.indicazioniVersione ??
          getDefaultIndicazioniForClasseAndYear(
            draft.datiGenerali.classe,
            draft.datiGenerali.annoScolastico
          )
        }
        planDisciplina={draft.datiGenerali.disciplina}
        planConoscenze={draft.curricolo.righeAbilitaConoscenze
          .map((r) => r.conoscenze)
          .filter((c) => Boolean(c && c.trim()))}
        onChangePlanIndicazioni={(nextIndicazioni) =>
          setDraft((prev) => ({
            ...prev,
            curricolo: {
              ...prev.curricolo,
              indicazioniVersione: nextIndicazioni,
            },
          }))
        }
        onImport={handleImportCatalogEntries}
        onClose={() => setShowCatalogSelector(false)}
      />

      <DocumentImportReviewModal
        open={Boolean(pendingProgramDocImport)}
        importResult={pendingProgramDocImport}
        onCancel={() => setPendingProgramDocImport(null)}
        onConfirm={(finalPlan, updatedResult) => {
          setDraft(finalPlan);
          setCatalogImportFeedback(
            `Contenuti importati da "${updatedResult.summary.fileName}" (${updatedResult.summary.tableRowsExtracted} righe di programma aggiunte alla tabella).`
          );
          setPendingProgramDocImport(null);
        }}
      />
    </div>
  );
}
