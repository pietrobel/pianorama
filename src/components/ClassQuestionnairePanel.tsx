import {
  Check,
  ChevronDown,
  ChevronUp,
  Eraser,
  FileText,
  ListChecks,
  RefreshCw,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type {
  ClassQuestionnaire,
  Programmazione,
  QuestionnaireAnswer,
  QuestionnaireIndicatorKey,
  QuickClassModeSelection,
} from '../domain/types';
import {
  createEmptyQuestionnaire,
  generateClassDescription,
  QUESTIONNAIRE_INDICATORS,
  type QuestionnaireIndicatorSpec,
} from '../engine/questionnaireEngine';
import {
  DEFAULT_QUICK_CLASS_SELECTION,
  generateQuickClassDescription,
  getQuickArchiveCombinationCount,
  QUICK_CLASS_QUESTIONS,
} from '../engine/quickClassDescriptionEngine';

interface ClassQuestionnairePanelProps {
  plan: Programmazione;
  onUpdateQuestionnaire: (next: ClassQuestionnaire) => void;
  onApplyGeneratedDescription: (
    text: string,
    mode: 'sintetica' | 'completa',
    nextQuestionnaire?: ClassQuestionnaire
  ) => void;
}

const AREAS_ORDER: QuestionnaireIndicatorSpec['area'][] = [
  'Area cognitiva',
  'Metodo e autonomia',
  'Comportamento e clima',
];

export function ClassQuestionnairePanel({
  plan,
  onUpdateQuestionnaire,
  onApplyGeneratedDescription,
}: ClassQuestionnairePanelProps) {
  const questionnaire = plan.analisiPartenza.questionario ?? createEmptyQuestionnaire();

  const compiledCount = useMemo(() => {
    return QUESTIONNAIRE_INDICATORS.filter((ind) => {
      const a = questionnaire.risposte[ind.key];
      return Boolean(a && (a.selectedOption || a.notaEterogenea.trim()));
    }).length;
  }, [questionnaire.risposte]);

  const initialMode: 'rapida' | 'dettagliata' =
    questionnaire.modalitaCompilazione ?? (compiledCount > 0 ? 'dettagliata' : 'rapida');

  const [expanded, setExpanded] = useState<boolean>(true);
  const [panelMode, setPanelMode] = useState<'rapida' | 'dettagliata'>(initialMode);
  const [activeArea, setActiveArea] = useState<QuestionnaireIndicatorSpec['area'] | 'Tutte'>(
    'Tutte'
  );
  const [variantCursor, setVariantCursor] = useState<number>(0);
  const [quickAppliedFeedback, setQuickAppliedFeedback] = useState<boolean>(false);

  const quickSelection: QuickClassModeSelection =
    questionnaire.modalitaRapida ?? DEFAULT_QUICK_CLASS_SELECTION;

  const quickPreviewText = useMemo(
    () => generateQuickClassDescription(plan, quickSelection),
    [plan, quickSelection]
  );

  const switchPanelMode = (nextMode: 'rapida' | 'dettagliata') => {
    setPanelMode(nextMode);
    onUpdateQuestionnaire({
      ...questionnaire,
      modalitaCompilazione: nextMode,
      modalitaRapida: questionnaire.modalitaRapida ?? DEFAULT_QUICK_CLASS_SELECTION,
    });
  };

  const updateQuickSelection = (patch: Partial<QuickClassModeSelection>) => {
    const nextQuick: QuickClassModeSelection = {
      ...quickSelection,
      ...patch,
    };
    setQuickAppliedFeedback(false);
    onUpdateQuestionnaire({
      ...questionnaire,
      modalitaCompilazione: 'rapida',
      modalitaRapida: nextQuick,
      ultimoAggiornamento: new Date().toISOString(),
    });
  };

  const handleApplyQuickDescription = () => {
    const text = generateQuickClassDescription(plan, quickSelection);
    const nextQ: ClassQuestionnaire = {
      ...questionnaire,
      modalitaCompilazione: 'rapida',
      modalitaRapida: quickSelection,
      modalitaGenerazione: 'completa',
      ultimoAggiornamento: new Date().toISOString(),
    };
    setQuickAppliedFeedback(true);
    onApplyGeneratedDescription(text, 'completa', nextQ);
  };

  const updateAnswer = (
    key: QuestionnaireIndicatorKey,
    patch: Partial<QuestionnaireAnswer>
  ) => {
    const current: QuestionnaireAnswer = questionnaire.risposte[key] ?? {
      selectedOption: '',
      eterogenea: false,
      notaEterogenea: '',
    };
    const nextAnswer: QuestionnaireAnswer = { ...current, ...patch };
    onUpdateQuestionnaire({
      ...questionnaire,
      modalitaCompilazione: 'dettagliata',
      risposte: {
        ...questionnaire.risposte,
        [key]: nextAnswer,
      },
      ultimoAggiornamento: new Date().toISOString(),
    });
  };

  const clearAnswer = (key: QuestionnaireIndicatorKey) => {
    const nextMap = { ...questionnaire.risposte };
    delete nextMap[key];
    onUpdateQuestionnaire({
      ...questionnaire,
      risposte: nextMap,
      ultimoAggiornamento: new Date().toISOString(),
    });
  };

  const handleGenerate = (mode: 'sintetica' | 'completa') => {
    const text = generateClassDescription(plan, mode, variantCursor);
    if (!text) return;
    setVariantCursor((v) => (v + 1) % 10);
    onApplyGeneratedDescription(text, mode, {
      ...questionnaire,
      modalitaCompilazione: 'dettagliata',
      modalitaGenerazione: mode,
      ultimoAggiornamento: new Date().toISOString(),
    });
  };

  const visibleIndicators = useMemo(() => {
    if (activeArea === 'Tutte') return QUESTIONNAIRE_INDICATORS;
    return QUESTIONNAIRE_INDICATORS.filter((i) => i.area === activeArea);
  }, [activeArea]);

  const besCount = plan.composizione.bes ?? 0;
  const disabilitaCount = plan.composizione.disabilita ?? 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/30">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            {panelMode === 'rapida' ? (
              <Zap className="h-4 w-4 text-[#1F3864] dark:text-blue-400" />
            ) : (
              <ListChecks className="h-4 w-4 text-[#1F3864] dark:text-blue-400" />
            )}
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {panelMode === 'rapida'
                ? 'Descrizione rapida della classe (4 domande · archivio offline)'
                : `Questionario guidato descrizione classe (${QUESTIONNAIRE_INDICATORS.length} indicatori)`}
            </h3>
          </div>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
            <strong>{plan.datiGenerali.docente || 'Docente'}</strong> ·{' '}
            <strong>
              Classe {plan.datiGenerali.classe} {plan.datiGenerali.sezione}
            </strong>{' '}
            · <strong>{plan.datiGenerali.disciplina}</strong>
            {panelMode === 'rapida' ? (
              <>
                {' '}
                · Alunni: <strong className="font-mono-num">{plan.composizione.alunni}</strong> · BES:{' '}
                <strong className="font-mono-num">{besCount}</strong> · Disabilità:{' '}
                <strong className="font-mono-num">{disabilitaCount}</strong>
              </>
            ) : (
              <>
                {' '}
                · Compilati{' '}
                <span className="font-mono-num font-semibold">
                  {compiledCount}/{QUESTIONNAIRE_INDICATORS.length}
                </span>
              </>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              Comprimi
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              Apri compilazione guidata
            </>
          )}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 space-y-4">
          {/* Selettore Modalità rapida / Questionario dettagliato */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 dark:border-slate-700">
            <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => switchPanelMode('rapida')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  panelMode === 'rapida'
                    ? 'bg-[#1F3864] text-white'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <Zap className="h-3.5 w-3.5" />
                Modalità rapida (4 domande)
              </button>
              <button
                type="button"
                onClick={() => switchPanelMode('dettagliata')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  panelMode === 'dettagliata'
                    ? 'bg-[#1F3864] text-white'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <ListChecks className="h-3.5 w-3.5" />
                Questionario dettagliato ({compiledCount}/{QUESTIONNAIRE_INDICATORS.length})
              </button>
            </div>

            {panelMode === 'rapida' && (
              <span className="text-[11px] text-slate-600 dark:text-slate-400">
                Archivio locale: {getQuickArchiveCombinationCount()} profili × 3 formulazioni italiane
              </span>
            )}
          </div>

          {panelMode === 'rapida' ? (
            <div className="space-y-4">
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Rispondi alle 4 domande chiuse per selezionare dall’archivio precompilato una descrizione coerente della classe. L’eventuale presenza di alunni con BES ({besCount}) e con disabilità ({disabilitaCount}) impostata nella sezione 2 viene integrata automaticamente nel testo in modo anonimo (nessun nominativo).
              </p>

              {/* 4 Domande a risposta chiusa */}
              <div className="grid gap-3 md:grid-cols-2">
                {QUICK_CLASS_QUESTIONS.map((q) => {
                  const selectedVal = quickSelection[q.key];
                  return (
                    <fieldset
                      key={q.key}
                      className="rounded-lg border border-slate-200 bg-white p-3.5 dark:border-slate-700 dark:bg-slate-900"
                    >
                      <legend className="px-1 text-xs font-bold text-[#1F3864] dark:text-blue-300">
                        {q.number}. {q.title}
                      </legend>
                      <p className="mb-2.5 text-xs text-slate-500 dark:text-slate-400">
                        {q.prompt}
                      </p>
                      <div className="space-y-1.5">
                        {q.options.map((opt) => {
                          const checked = selectedVal === opt.value;
                          return (
                            <label
                              key={opt.value}
                              className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2 transition ${
                                checked
                                  ? 'border-[#1F3864] bg-blue-50/50 dark:border-blue-500 dark:bg-blue-950/30'
                                  : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`quick-${q.key}`}
                                checked={checked}
                                onChange={() =>
                                  updateQuickSelection({
                                    [q.key]: opt.value,
                                  } as Partial<QuickClassModeSelection>)
                                }
                                className="mt-0.5 h-4 w-4 shrink-0 accent-[#1F3864]"
                              />
                              <div className="min-w-0">
                                <span className="block text-xs font-semibold text-slate-900 dark:text-slate-100">
                                  {opt.label}
                                </span>
                                <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                                  {opt.hint}
                                </span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                  );
                })}
              </div>

              {/* Anteprima e scelta fra le 3 formulazioni dell'archivio */}
              <div className="rounded-lg border border-[#1F3864]/25 bg-white p-4 dark:border-blue-800/60 dark:bg-slate-900">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-[#1F3864] dark:text-blue-300">
                    Anteprima dall’archivio (3 formulazioni disponibili)
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {([0, 1, 2] as const).map((idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => updateQuickSelection({ varianteSelezionata: idx })}
                        className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition ${
                          quickSelection.varianteSelezionata === idx
                            ? 'border-[#1F3864] bg-[#1F3864] text-white'
                            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300'
                        }`}
                      >
                        Formulazione {idx + 1}/3
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        updateQuickSelection({
                          varianteSelezionata: ((quickSelection.varianteSelezionata + 1) % 3) as
                            | 0
                            | 1
                            | 2,
                        })
                      }
                      title="Passa alla formulazione alternativa successiva"
                      className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Cambia stile
                    </button>
                  </div>
                </div>

                <div className="mt-3 whitespace-pre-line rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-xs leading-relaxed text-slate-800 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200">
                  {quickPreviewText}
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => updateQuickSelection(DEFAULT_QUICK_CLASS_SELECTION)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
                  >
                    <Eraser className="h-3.5 w-3.5" />
                    Ripristina risposte predefinite
                  </button>

                  <div className="flex items-center gap-2.5">
                    {quickAppliedFeedback && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        <Check className="h-3.5 w-3.5" />
                        Descrizione inserita sotto
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleApplyQuickDescription}
                      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#1F3864] px-4 py-2 text-xs font-semibold text-white hover:bg-[#172b4d]"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Inserisci nella descrizione della classe
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Compila solo gli indicatori pertinenti: le risposte lasciate vuote vengono escluse automaticamente dal testo generato e nessuna caratteristica viene inventata. Comprensione, Memorizzazione e Capacità di apprendimento sono rilevati come indicatori distinti.
              </p>

              {/* Filtro per area */}
              <div className="flex flex-wrap gap-1.5">
                {(['Tutte', ...AREAS_ORDER] as const).map((area) => (
                  <button
                    key={area}
                    type="button"
                    onClick={() => setActiveArea(area)}
                    className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
                      activeArea === area
                        ? 'border-[#1F3864] bg-[#1F3864] text-white'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                    }`}
                  >
                    {area}
                  </button>
                ))}
              </div>

              {/* Indicatori */}
              <div className="max-h-[440px] space-y-3 overflow-y-auto pr-1">
                {visibleIndicators.map((spec) => {
                  const ans = questionnaire.risposte[spec.key];
                  const isFilled = Boolean(ans && (ans.selectedOption || ans.notaEterogenea.trim()));

                  return (
                    <div
                      key={spec.key}
                      className={`rounded-lg border p-3.5 transition ${
                        isFilled
                          ? 'border-[#1F3864]/40 bg-white dark:border-blue-800 dark:bg-slate-900'
                          : 'border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-[#1F3864] dark:text-blue-300">
                            {spec.area}
                          </p>
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {spec.title}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{spec.prompt}</p>
                        </div>
                        {isFilled && (
                          <button
                            type="button"
                            onClick={() => clearAnswer(spec.key)}
                            title="Escludi questo indicatore"
                            className="shrink-0 rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            Escludi
                          </button>
                        )}
                      </div>

                      <div className="mt-2.5 space-y-1.5">
                        {spec.options.map((opt) => (
                          <label
                            key={opt.label}
                            className="flex cursor-pointer items-start gap-2 text-xs sm:text-sm"
                          >
                            <input
                              type="radio"
                              name={`q-${spec.key}`}
                              checked={ans?.selectedOption === opt.label}
                              onChange={() =>
                                updateAnswer(spec.key, { selectedOption: opt.label })
                              }
                              className="mt-0.5 h-4 w-4 accent-[#1F3864]"
                            />
                            <span className="text-slate-800 dark:text-slate-200">{opt.label}</span>
                          </label>
                        ))}
                      </div>

                      <div className="mt-2.5 flex flex-col gap-2 border-t border-slate-100 pt-2.5 sm:flex-row sm:items-center dark:border-slate-800">
                        <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                          <input
                            type="checkbox"
                            checked={Boolean(ans?.eterogenea)}
                            onChange={(e) =>
                              updateAnswer(spec.key, { eterogenea: e.target.checked })
                            }
                            className="h-3.5 w-3.5 accent-[#1F3864]"
                          />
                          <span>Situazione eterogenea</span>
                        </label>

                        <input
                          type="text"
                          value={ans?.notaEterogenea || ''}
                          onChange={(e) =>
                            updateAnswer(spec.key, { notaEterogenea: e.target.value })
                          }
                          placeholder="Precisazione facoltativa su fasce/sottogruppi (senza nomi)..."
                          className="flex-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-950"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Azioni di generazione */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => onUpdateQuestionnaire(createEmptyQuestionnaire())}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  <Eraser className="h-3.5 w-3.5" />
                  Azzera questionario
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono-num text-[11px] text-slate-500 dark:text-slate-400">
                    Stile {(variantCursor % 10) + 1}/10
                  </span>
                  <button
                    type="button"
                    disabled={compiledCount === 0}
                    onClick={() => handleGenerate('sintetica')}
                    title="Genera descrizione sintetica ruotando tra le 10 varianti stilistiche"
                    className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#1F3864] bg-white px-3.5 py-2 text-xs font-semibold text-[#1F3864] hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-400 dark:bg-slate-900 dark:text-blue-300"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Genera descrizione sintetica
                  </button>
                  <button
                    type="button"
                    disabled={compiledCount === 0}
                    onClick={() => handleGenerate('completa')}
                    title="Genera descrizione completa ruotando tra le 10 varianti stilistiche"
                    className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#1F3864] px-4 py-2 text-xs font-semibold text-white hover:bg-[#172b4d] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Genera descrizione completa
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
