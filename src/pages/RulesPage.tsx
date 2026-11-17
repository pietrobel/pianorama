import { Code2, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ConfirmModal } from '../components/ConfirmModal';
import type { SuggestionRule } from '../domain/types';

interface RulesPageProps {
  rules: SuggestionRule[];
  onSaveRule: (rule: SuggestionRule) => Promise<void>;
  onDeleteRule: (id: string) => Promise<void>;
  onResetDefaults: () => Promise<void>;
}

export function RulesPage({
  rules,
  onSaveRule,
  onDeleteRule,
  onResetDefaults,
}: RulesPageProps) {
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [jsonText, setJsonText] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const openJsonEditor = (rule: SuggestionRule) => {
    setEditingRuleId(rule.id);
    setJsonText(JSON.stringify(rule, null, 2));
    setJsonError(null);
  };

  const createNewRule = () => {
    const template: SuggestionRule = {
      id: `rule-${Date.now()}`,
      nome: 'Nuova regola personalizzata',
      descrizione: 'Descrivi quando deve attivarsi la regola e quale proposta suggerire.',
      attiva: true,
      priorita: 3,
      matchMode: 'all',
      condizioni: [
        {
          field: 'situazione.livello',
          operator: 'equals',
          value: 'medio',
        },
      ],
      azioni: [
        {
          id: `act-${Date.now()}`,
          targetSection: 'metodiStrumenti.metodi',
          actionType: 'check_option',
          label: 'Proponi Cooperative learning',
          valueText: 'Cooperative learning',
        },
      ],
    };
    setEditingRuleId(template.id);
    setJsonText(JSON.stringify(template, null, 2));
    setJsonError(null);
  };

  const handleSaveJson = async () => {
    setJsonError(null);
    try {
      const parsed = JSON.parse(jsonText) as SuggestionRule;
      if (!parsed.id || !parsed.nome || !Array.isArray(parsed.condizioni) || !Array.isArray(parsed.azioni)) {
        throw new Error('Struttura JSON incompleta: servono id, nome, condizioni e azioni.');
      }
      await onSaveRule(parsed);
      setEditingRuleId(null);
      setStatusMsg(`Regola "${parsed.nome}" salvata localmente.`);
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : 'JSON non valido.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Regole di suggerimento (senza AI)
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Regole deterministiche locali in formato JSON: nessuna API esterna, nessun modello generativo
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Ripristina predefinite
          </button>
          <button
            type="button"
            onClick={createNewRule}
            className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg bg-[#1F3864] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#172b4d]"
          >
            <Plus className="h-3.5 w-3.5" />
            Nuova regola JSON
          </button>
        </div>
      </div>

      {statusMsg && (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
        >
          {statusMsg}
        </div>
      )}

      {editingRuleId && (
        <div className="space-y-3 rounded-xl border border-[#1F3864]/40 bg-white p-5 dark:border-blue-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Editor JSON regola locale
            </h2>
            <button
              type="button"
              onClick={() => setEditingRuleId(null)}
              className="text-xs font-medium text-slate-500 hover:underline"
            >
              Chiudi editor
            </button>
          </div>
          <textarea
            rows={16}
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            spellCheck={false}
            className="font-mono-num w-full rounded-lg border border-slate-300 bg-slate-50 p-3 text-xs leading-relaxed text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
          {jsonError && <p className="text-xs font-medium text-red-600">{jsonError}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleSaveJson}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1F3864] px-4 py-2 text-xs font-semibold text-white hover:bg-[#172b4d]"
            >
              <Save className="h-3.5 w-3.5" />
              Salva regola
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold">
                    <input
                      type="checkbox"
                      checked={rule.attiva}
                      onChange={() => onSaveRule({ ...rule, attiva: !rule.attiva })}
                      className="h-4 w-4 accent-[#1F3864]"
                    />
                    <span
                      className={
                        rule.attiva
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-slate-500'
                      }
                    >
                      {rule.attiva ? 'Attiva' : 'Disattivata'}
                    </span>
                  </label>
                  <span className="text-slate-300 dark:text-slate-700">·</span>
                  <span className="font-mono-num text-xs text-slate-500">
                    Priorità {rule.priorita}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {rule.nome}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{rule.descrizione}</p>

                <div className="pt-1 text-xs text-slate-500 dark:text-slate-400">
                  <strong>Condizioni ({rule.matchMode === 'all' ? 'tutte' : 'almeno una'}):</strong>{' '}
                  {rule.condizioni
                    .map((c) => `${c.field} ${c.operator} ${String(c.value)}`)
                    .join(' · ')}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  <strong>Azioni proposte:</strong> {rule.azioni.map((a) => a.label).join(' · ')}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => openJsonEditor(rule)}
                  className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Code2 className="h-3.5 w-3.5" />
                  Modifica JSON
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteRule(rule.id)}
                  aria-label={`Elimina regola ${rule.nome}`}
                  className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <ConfirmModal
        open={confirmReset}
        title="Ripristinare le regole predefinite?"
        description="Tutte le regole personalizzate saranno sostituite con il set predefinito di PIANORAMA."
        confirmLabel="Ripristina regole"
        onCancel={() => setConfirmReset(false)}
        onConfirm={async () => {
          await onResetDefaults();
          setConfirmReset(false);
          setStatusMsg('Regole predefinite ripristinate.');
        }}
      />
    </div>
  );
}
