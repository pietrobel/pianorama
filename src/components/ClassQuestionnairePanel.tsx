import { ChevronDown, ChevronUp, Eraser, FileText, ListChecks, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import type {
  ClassQuestionnaire,
  Programmazione,
  QuestionnaireAnswer,
  QuestionnaireIndicatorKey,
} from '../domain/types';
import {
  createEmptyQuestionnaire,
  generateClassDescription,
  QUESTIONNAIRE_INDICATORS,
  type QuestionnaireIndicatorSpec,
} from '../engine/questionnaireEngine';

interface ClassQuestionnairePanelProps {
  plan: Programmazione;
  onUpdateQuestionnaire: (next: ClassQuestionnaire) => void;
  onApplyGeneratedDescription: (text: string, mode: 'sintetica' | 'completa') => void;
}

const AREAS_ORDER: QuestionnaireIndicatorSpec['area'][] = [
  'Contesto',
  'Area cognitiva',
  'Metodo e autonomia',
  'Comportamento e clima',
  'Interventi',
];

export function ClassQuestionnairePanel({
  plan,
  onUpdateQuestionnaire,
  onApplyGeneratedDescription,
}: ClassQuestionnairePanelProps) {
  const [expanded, setExpanded] = useState<boolean>(true);
  const [activeArea, setActiveArea] = useState<QuestionnaireIndicatorSpec['area'] | 'Tutte'>(
    'Tutte'
  );

  const questionnaire = plan.analisiPartenza.questionario ?? createEmptyQuestionnaire();

  const compiledCount = useMemo(() => {
    return QUESTIONNAIRE_INDICATORS.filter((ind) => {
      const a = questionnaire.risposte[ind.key];
      return Boolean(a && (a.selectedOption || a.notaEterogenea.trim()));
    }).length;
  }, [questionnaire.risposte]);

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
    const text = generateClassDescription(plan, mode);
    if (!text) return;
    onApplyGeneratedDescription(text, mode);
  };

  const visibleIndicators = useMemo(() => {
    if (activeArea === 'Tutte') return QUESTIONNAIRE_INDICATORS;
    return QUESTIONNAIRE_INDICATORS.filter((i) => i.area === activeArea);
  }, [activeArea]);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/30">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-[#1F3864] dark:text-blue-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Questionario guidato descrizione classe (21 indicatori)
            </h3>
          </div>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
            Associato localmente a: <strong>{plan.datiGenerali.docente || 'Docente'}</strong> ·{' '}
            <strong>
              Classe {plan.datiGenerali.classe} {plan.datiGenerali.sezione}
            </strong>{' '}
            · <strong>{plan.datiGenerali.disciplina}</strong> · Compilati{' '}
            <span className="font-mono-num font-semibold">
              {compiledCount}/{QUESTIONNAIRE_INDICATORS.length}
            </span>
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
              Comprimi questionario
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              Apri questionario ({compiledCount})
            </>
          )}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 space-y-4">
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
              <button
                type="button"
                disabled={compiledCount === 0}
                onClick={() => handleGenerate('sintetica')}
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#1F3864] bg-white px-3.5 py-2 text-xs font-semibold text-[#1F3864] hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-400 dark:bg-slate-900 dark:text-blue-300"
              >
                <FileText className="h-3.5 w-3.5" />
                Genera descrizione sintetica
              </button>
              <button
                type="button"
                disabled={compiledCount === 0}
                onClick={() => handleGenerate('completa')}
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
  );
}
