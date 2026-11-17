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
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ClassCharacteristicsPanel } from '../components/ClassCharacteristicsPanel';
import { ClassQuestionnairePanel } from '../components/ClassQuestionnairePanel';
import { CurricoloCatalogSelector } from '../components/CurricoloCatalogSelector';
import { DocumentSheetPreview } from '../components/DocumentSheetPreview';
import { FasceLivelloBoard } from '../components/FasceLivelloBoard';
import { PlessoSelect } from '../components/PlessoSelect';
import { PrivacyNoticeBanner } from '../components/PrivacyNoticeBanner';
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
  getDefaultMetodiStrumentiForDisciplina,
} from '../domain/defaults';
import type {
  AnonymousStudentBandEntry,
  ClassQuestionnaire,
  CurricoloCatalogEntry,
  CurricoloVoiceType,
  DocenteGenere,
  DocumentLayoutStyle,
  DocxMappingSchema,
  ImportedCurricoloVoice,
  LibraryItem,
  PlanStatus,
  Programmazione,
  SchoolSettings,
  SuggestionProposal,
  SuggestionRule,
} from '../domain/types';
import { reconcileDimensionsWithTotalStudents } from '../engine/classCharacteristicsEngine';
import {
  CURRICOLO_TYPE_LABELS,
  CURRICOLO_TYPE_ORDER,
  buildProgramRowsFromCatalogVoices,
  importCatalogEntriesToVoices,
  isVoiceRestorable,
  reorderImportedVoices,
  restoreVoiceFromCatalog,
} from '../engine/curricoloCatalogEngine';
import { importProgrammazioneFromFile } from '../engine/documentPlanImporter';
import {
  computeLivelliFromStudents,
  createManualStudentEntry,
  parseGradebookBuffer,
} from '../engine/gradebookImporter';
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
  { key: 'composizione', label: '2. Composizione e situazione', shortLabel: 'Classe' },
  { key: 'analisi', label: '3. Analisi e questionario', shortLabel: 'Analisi' },
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
  const programDocFileRef = useRef<HTMLInputElement>(null);
  const [importingProgramDoc, setImportingProgramDoc] = useState<boolean>(false);
  const [catalogImportError, setCatalogImportError] = useState<string | null>(null);

  const isFirstRender = useRef(true);
  const latestPlanId = useRef(initialPlan.id);

  useEffect(() => {
    if (initialPlan.id !== latestPlanId.current) {
      latestPlanId.current = initialPlan.id;
      setDraft(initialPlan);
      isFirstRender.current = true;
    }
  }, [initialPlan]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setSaveState('saving');
    setSaveErrorMsg(null);
    const timer = setTimeout(async () => {
      try {
        await onSavePlan(draft);
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
    }, 450);

    return () => clearTimeout(timer);
  }, [draft, onSavePlan]);

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

  const handleImportCatalogEntries = (selectedEntries: CurricoloCatalogEntry[]) => {
    const newVoices = importCatalogEntriesToVoices(selectedEntries);
    const crossClassCount = newVoices.filter(
      (v) => v.classeOrigine !== draft.datiGenerali.classe
    ).length;
    setDraft((prev) => {
      const nextRows = buildProgramRowsFromCatalogVoices(
        newVoices,
        prev.curricolo.righeAbilitaConoscenze
      );
      return {
        ...prev,
        curricolo: {
          ...prev.curricolo,
          vociCatalogoImportate: [...(prev.curricolo.vociCatalogoImportate ?? []), ...newVoices],
          righeAbilitaConoscenze: nextRows,
        },
        cronologiaModifiche: [
          {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            evento: 'Importazione da Curricolo Verticale',
            dettaglio: `Importate ${newVoices.length} voci dal catalogo locale (${
              crossClassCount > 0 ? `${crossClassCount} da altra classe` : `Classe ${draft.datiGenerali.classe}`
            }) e aggiornata la tabella Competenze / Abilità / Conoscenze.`,
          },
          ...(prev.cronologiaModifiche ?? []),
        ],
      };
    });
    setCatalogImportError(null);
    setCatalogImportFeedback(
      `Importate ${newVoices.length} voci dal catalogo curricolare e inserite nella tabella a 3 colonne (Competenze, Abilità/Obiettivi, Conoscenze).`
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

  const sumSex = draft.composizione.maschi + draft.composizione.femmine;
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
            onClick={onBack}
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
            onClick={onOpenExport}
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
                        const prevDefaults = getDefaultMetodiStrumentiForDisciplina(
                          prev.datiGenerali.disciplina
                        );
                        const sameSet = (a: string[], b: string[]) =>
                          a.length === b.length && a.every((v) => b.includes(v));
                        const shouldSyncMetodi =
                          sameSet(prev.metodiStrumenti.metodi, prevDefaults.metodi) &&
                          sameSet(
                            prev.metodiStrumenti.mezziEStrumenti,
                            prevDefaults.mezziEStrumenti
                          );
                        const nextDefaults = getDefaultMetodiStrumentiForDisciplina(nextDisc);
                        return {
                          ...prev,
                          datiGenerali: {
                            ...prev.datiGenerali,
                            disciplina: nextDisc,
                            titoloDisciplina: nextDisc,
                          },
                          ...(shouldSyncMetodi
                            ? {
                                metodiStrumenti: {
                                  ...prev.metodiStrumenti,
                                  metodi: nextDefaults.metodi,
                                  mezziEStrumenti: nextDefaults.mezziEStrumenti,
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
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        datiGenerali: {
                          ...prev.datiGenerali,
                          annoScolastico: e.target.value,
                        },
                      }))
                    }
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
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          datiGenerali: {
                            ...prev.datiGenerali,
                            classe: e.target.value as 'Prima' | 'Seconda' | 'Terza',
                          },
                        }))
                      }
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

          {/* SEZIONE 2: COMPOSIZIONE E SITUAZIONE DELLA CLASSE */}
          {activeSection === 'composizione' && (
            <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-base font-bold text-[#1F3864] dark:text-blue-300">
                2. Composizione e situazione della classe
              </h2>

              <PrivacyNoticeBanner compact />

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {(
                  [
                    ['alunni', 'Alunni totali'],
                    ['maschi', 'Maschi'],
                    ['femmine', 'Femmine'],
                    ['ripetenti', 'Ripetenti'],
                    ['bes', 'Con BES'],
                  ] as const
                ).map(([field, label]) => (
                  <label key={field} className="block">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {label}
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={40}
                      value={draft.composizione[field]}
                      onChange={(e) => {
                        const nextValue = Math.max(0, Number(e.target.value) || 0);
                        setDraft((prev) => ({
                          ...prev,
                          composizione: {
                            ...prev.composizione,
                            [field]: nextValue,
                          },
                          ...(field === 'alunni'
                            ? {
                                situazione: {
                                  ...prev.situazione,
                                  caratteristicheDimensioni: reconcileDimensionsWithTotalStudents(
                                    prev.situazione.caratteristicheDimensioni,
                                    prev.composizione.alunni,
                                    nextValue
                                  ),
                                },
                              }
                            : {}),
                        }));
                      }}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono-num text-sm dark:border-slate-700 dark:bg-slate-950"
                    />
                  </label>
                ))}
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Alunni totali, maschi e femmine vengono inclusi automaticamente nella presentazione della classe. Modificando <strong>Alunni totali</strong>, la barra delle caratteristiche aggiorna prima lo spazio <em>non definito</em> e poi gli indicatori a destra.
              </p>

              {sumSex !== draft.composizione.alunni && (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Nota di controllo: Maschi + Femmine ({sumSex}) differisce dal totale Alunni (
                  {draft.composizione.alunni}).
                </p>
              )}

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

              <div className="border-t border-slate-200 pt-5 dark:border-slate-800">
                <ClassCharacteristicsPanel
                  dimensions={draft.situazione.caratteristicheDimensioni}
                  alunniTotali={draft.composizione.alunni}
                  soglieQuote={settings.soglieQuoteCaratteristiche}
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
            </section>
          )}

          {/* SEZIONE 3: ANALISI DELLA SITUAZIONE DI PARTENZA & QUESTIONARIO */}
          {activeSection === 'analisi' && (
            <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-base font-bold text-[#1F3864] dark:text-blue-300">
                3. Analisi della situazione di partenza e questionario avanzato
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
                onApplyGeneratedDescription={(text, mode) =>
                  setDraft((prev) => ({
                    ...prev,
                    analisiPartenza: {
                      ...prev.analisiPartenza,
                      descrizioneDisciplinare: text,
                      questionario: {
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
                      Compila i conteggi o inserisci gli alunni direttamente nelle 5 colonne sottostanti (import .xlsx o inserimento manuale). I file DOCX/PDF ufficiali esportano solo i totali per fascia.
                    </p>
                    <label className="mt-1.5 flex cursor-pointer items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={keepNamesOffline}
                        onChange={(e) => setKeepNamesOffline(e.target.checked)}
                        className="h-3.5 w-3.5 accent-[#1F3864]"
                      />
                      <span>Conserva solo il cognome in locale durante import .xlsx</span>
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
                          const nextLivelli = computeLivelliFromStudents(parsed.entries);
                          setDraft((prev) => ({
                            ...prev,
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
                          }));
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
                        const current = draft.analisiPartenza.alunniAnonimiFasce ?? [];
                        const added = createManualStudentEntry(
                          current,
                          { nominativo: '', media: null },
                          settings.soglieFasce
                        );
                        const next = [...current, added];
                        setDraft((prev) => ({
                          ...prev,
                          analisiPartenza: {
                            ...prev.analisiPartenza,
                            alunniAnonimiFasce: next,
                            livelli: computeLivelliFromStudents(next),
                          },
                        }));
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
                {sumLevels !== draft.composizione.alunni && (
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
                    onChangeEntries={(nextEntries: AnonymousStudentBandEntry[]) => {
                      const nextLivelli = computeLivelliFromStudents(nextEntries);
                      setDraft((prev) => ({
                        ...prev,
                        analisiPartenza: {
                          ...prev.analisiPartenza,
                          alunniAnonimiFasce: nextEntries,
                          livelli: nextLivelli,
                        },
                      }));
                    }}
                    onSyncComposizione={(totaleAlunni, totaleBes) => {
                      setDraft((prev) => ({
                        ...prev,
                        composizione: {
                          ...prev.composizione,
                          alunni: totaleAlunni,
                          bes: totaleBes,
                        },
                        situazione: {
                          ...prev.situazione,
                          caratteristicheDimensioni: reconcileDimensionsWithTotalStudents(
                            prev.situazione.caratteristicheDimensioni,
                            prev.composizione.alunni,
                            totaleAlunni
                          ),
                        },
                      }));
                      setGradebookStatus(
                        `Composizione aggiornata: ${totaleAlunni} alunni totali, ${totaleBes} con BES/DSA/PEI.`
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
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Alunni con BES e interventi programmati (PDP, misure dispensative e strumenti compensativi)
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        interventi: {
                          ...prev.interventi,
                          besInterventiProgrammati: DEFAULT_BES_INTERVENTI_TEXT,
                        },
                      }))
                    }
                    className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Ripristina testo standard BES / PDP
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
                        setDraft(result.plan);
                        setCatalogImportFeedback(
                          `Programma importato da "${result.summary.fileName}" (${result.summary.tableRowsExtracted} righe di programma aggiunte alla tabella).`
                        );
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
                      Tabella Programma disciplinare (3 colonne: Competenze · Abilità / Obiettivi · Conoscenze / Contenuti)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Questa tabella costituisce il programma vero e proprio stampato in anteprima, DOCX e PDF.
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
                              righeAbilitaConoscenze: buildProgramRowsFromCatalogVoices(
                                prev.curricolo.vociCatalogoImportate ?? [],
                                prev.curricolo.righeAbilitaConoscenze
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
                    {draft.curricolo.righeAbilitaConoscenze.map((row) => (
                      <div
                        key={row.id}
                        className="grid gap-3 rounded-lg border border-slate-200 p-3 lg:grid-cols-[1fr_1fr_1fr_auto] dark:border-slate-800"
                      >
                        <label className="block">
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                            Competenze
                          </span>
                          <textarea
                            rows={4}
                            value={row.competenze ?? row.traguardo ?? ''}
                            onChange={(e) =>
                              setDraft((prev) => ({
                                ...prev,
                                curricolo: {
                                  ...prev.curricolo,
                                  righeAbilitaConoscenze: prev.curricolo.righeAbilitaConoscenze.map(
                                    (r) => (r.id === row.id ? { ...r, competenze: e.target.value } : r)
                                  ),
                                },
                              }))
                            }
                            placeholder="Competenze / nucleo tematico..."
                            className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                            Abilità / Obiettivi
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
                            placeholder="Abilità o obiettivi di apprendimento..."
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
                            placeholder="Conoscenze / contenuti disciplinari..."
                            className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-950"
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
                          className="self-start rounded-lg p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
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
                        metodi: defaults.metodi,
                        mezziEStrumenti: defaults.mezziEStrumenti,
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
              <h2 className="text-base font-bold text-[#1F3864] dark:text-blue-300">
                7. Verifiche in itinere, valutazione e firma
              </h2>

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

              <label className="block">
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  Firma in calce (Il/La Docente)
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
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
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
        planDisciplina={draft.datiGenerali.disciplina}
        onImport={handleImportCatalogEntries}
        onClose={() => setShowCatalogSelector(false)}
      />
    </div>
  );
}
