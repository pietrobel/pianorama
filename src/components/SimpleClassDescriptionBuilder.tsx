import { Check, Eraser, RefreshCw, Sparkles } from 'lucide-react';
import { useMemo } from 'react';
import type { Programmazione, QuickClassModeSelection } from '../domain/types';
import {
  DEFAULT_QUICK_CLASS_SELECTION,
  QUICK_CLASS_QUESTIONS,
  generateQuickClassDescription,
  getQuickArchiveCombinationCount,
  normalizeQuickClassSelection,
} from '../engine/quickClassDescriptionEngine';

interface SimpleClassDescriptionBuilderProps {
  plan: Programmazione;
  selection: Partial<QuickClassModeSelection> | QuickClassModeSelection | undefined;
  onChangeSelection: (next: QuickClassModeSelection) => void;
  onApplyDescription?: (text: string, selection: QuickClassModeSelection) => void;
  appliedFeedback?: boolean;
  compact?: boolean;
  applyButtonLabel?: string;
}

export function SimpleClassDescriptionBuilder({
  plan,
  selection,
  onChangeSelection,
  onApplyDescription,
  appliedFeedback = false,
  compact = false,
  applyButtonLabel = 'Inserisci nella descrizione della classe',
}: SimpleClassDescriptionBuilderProps) {
  const normalized = useMemo(
    () => normalizeQuickClassSelection(selection),
    [selection]
  );

  const previewText = useMemo(
    () => generateQuickClassDescription(plan, normalized),
    [plan, normalized]
  );

  const besCount = plan.composizione.bes ?? 0;
  const disabilitaCount = plan.composizione.disabilita ?? 0;

  const updateField = (patch: Partial<QuickClassModeSelection>) => {
    const next = normalizeQuickClassSelection({
      ...normalized,
      ...patch,
    });
    onChangeSelection(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-200/80 bg-blue-50/50 px-3.5 py-2.5 text-xs text-slate-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-slate-300">
        <p className="leading-relaxed">
          Rispondi alle <strong>5 domande chiuse</strong> (eterogeneità, livello generale, socializzazione, rispetto delle regole/vivacità e motivazione) per ottenere una descrizione completa dalla libreria locale (<strong>{getQuickArchiveCombinationCount()} profili × 3 formulazioni</strong>).
          {' '}I dati inseriti in Composizione su <strong>BES ({besCount})</strong> e <strong>disabilità ({disabilitaCount})</strong> vengono integrati con il riferimento a <strong>PDP</strong> e <strong>PEI</strong>.
        </p>
      </div>

      {/* 5 Domande chiuse */}
      <div className={`grid gap-3 ${compact ? 'md:grid-cols-2' : 'md:grid-cols-2 xl:grid-cols-3'}`}>
        {QUICK_CLASS_QUESTIONS.map((q) => {
          const selectedVal = normalized[q.key];
          return (
            <fieldset
              key={q.key}
              className="rounded-lg border border-slate-200 bg-white p-3.5 dark:border-slate-700 dark:bg-slate-900"
            >
              <legend className="px-1 text-xs font-bold text-[#1F3864] dark:text-blue-300">
                {q.number}. {q.title}
              </legend>
              <p className="mb-2.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
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
                        name={`simple-${q.key}-${compact ? 'init' : 'ed'}`}
                        checked={checked}
                        onChange={() =>
                          updateField({
                            [q.key]: opt.value,
                          } as Partial<QuickClassModeSelection>)
                        }
                        className="mt-0.5 h-4 w-4 shrink-0 accent-[#1F3864]"
                      />
                      <div className="min-w-0">
                        <span className="block text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {opt.label}
                        </span>
                        <span className="block text-[11px] leading-snug text-slate-500 dark:text-slate-400">
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

      {/* Anteprima dalla libreria e scelta formulazione */}
      <div className="rounded-lg border border-[#1F3864]/25 bg-white p-4 dark:border-blue-800/60 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wide text-[#1F3864] dark:text-blue-300">
            Anteprima descrizione completa dalla libreria (3 formulazioni)
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {([0, 1, 2] as const).map((idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => updateField({ varianteSelezionata: idx })}
                className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition ${
                  normalized.varianteSelezionata === idx
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
                updateField({
                  varianteSelezionata: ((normalized.varianteSelezionata + 1) % 3) as 0 | 1 | 2,
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

        <div className="mt-3 max-h-64 overflow-y-auto whitespace-pre-line rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-xs leading-relaxed text-slate-800 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200">
          {previewText}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onChangeSelection(DEFAULT_QUICK_CLASS_SELECTION)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
          >
            <Eraser className="h-3.5 w-3.5" />
            Ripristina risposte predefinite
          </button>

          {onApplyDescription && (
            <div className="flex items-center gap-2.5">
              {appliedFeedback && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  <Check className="h-3.5 w-3.5" />
                  Descrizione aggiornata
                </span>
              )}
              <button
                type="button"
                onClick={() => onApplyDescription(previewText, normalized)}
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#1F3864] px-4 py-2 text-xs font-semibold text-white hover:bg-[#172b4d]"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {applyButtonLabel}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
