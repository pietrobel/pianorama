import {
  AlertTriangle,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  HelpCircle,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { DISCIPLINE_SECONDARIA, formatDocenteConTitolo } from '../domain/defaults';
import type {
  AbilitaConoscenzaRow,
  ClasseSecondaria,
  DocenteGenere,
  Programmazione,
} from '../domain/types';
import {
  applyUnrecognizedBlockAssignments,
  type DocumentImportResult,
  type ImportBlockTargetField,
} from '../engine/documentPlanImporter';

interface DocumentImportReviewModalProps {
  open: boolean;
  importResult: DocumentImportResult | null;
  onCancel: () => void;
  onConfirm: (finalPlan: Programmazione, updatedResult: DocumentImportResult) => Promise<void> | void;
}

const TARGET_FIELD_OPTIONS: { value: ImportBlockTargetField; label: string }[] = [
  { value: 'ignore', label: 'Non importare (ignora questo blocco)' },
  {
    value: 'analisiPartenza.descrizioneDisciplinare',
    label: 'Analisi situazione di partenza (descrizione)',
  },
  {
    value: 'interventi.besInterventiProgrammati',
    label: 'Alunni con BES e interventi programmati',
  },
  {
    value: 'curricolo.competenzeAttese',
    label: 'Traguardi e competenze attese (elenco)',
  },
  {
    value: 'curricolo.righeAbilitaConoscenze',
    label: 'Tabella Abilità / Conoscenze (aggiungi nuova riga)',
  },
  {
    value: 'curricolo.mergeLastRowAbilita',
    label: 'Tabella Abilità / Conoscenze (unisci ad Abilità ultima riga)',
  },
  {
    value: 'curricolo.mergeLastRowConoscenze',
    label: 'Tabella Abilità / Conoscenze (unisci a Conoscenze ultima riga)',
  },
  {
    value: 'curricolo.attivitaProgrammate',
    label: 'Attività programmate',
  },
  {
    value: 'metodiStrumenti.premessaMetodologica',
    label: 'Premessa metodologica',
  },
  {
    value: 'metodiStrumenti.ausiliDidattici',
    label: 'Ausili didattici',
  },
  {
    value: 'metodiStrumenti.didatticaDigitaleIntegrata',
    label: 'Didattica digitale integrata (DDI)',
  },
  {
    value: 'verificheValutazione.altriTipiProve',
    label: 'Altri tipi di prove',
  },
  {
    value: 'verificheValutazione.criteriValutazione',
    label: 'Criteri di valutazione',
  },
  {
    value: 'notePersonaliDocente',
    label: 'Note personali del docente (non esportate)',
  },
];

export function DocumentImportReviewModal({
  open,
  importResult,
  onCancel,
  onConfirm,
}: DocumentImportReviewModalProps) {
  const [draftPlan, setDraftPlan] = useState<Programmazione | null>(null);
  const [assignments, setAssignments] = useState<Record<string, ImportBlockTargetField>>({});
  const [confirming, setConfirming] = useState(false);
  const [showRawText, setShowRawText] = useState(false);

  useEffect(() => {
    if (!importResult) {
      setDraftPlan(null);
      setAssignments({});
      setShowRawText(false);
      return;
    }
    setDraftPlan(structuredClone(importResult.plan));
    const initialMap: Record<string, ImportBlockTargetField> = {};
    for (const blk of importResult.unrecognizedBlocks) {
      initialMap[blk.id] = 'ignore';
    }
    setAssignments(initialMap);
    setShowRawText(false);
  }, [importResult]);

  if (!open || !importResult || !draftPlan) return null;

  const updateRowField = (
    rowIndex: number,
    field: keyof Pick<AbilitaConoscenzaRow, 'competenze' | 'abilita' | 'conoscenze'>,
    value: string
  ) => {
    setDraftPlan((prev) => {
      if (!prev) return prev;
      const nextRows = prev.curricolo.righeAbilitaConoscenze.map((r, idx) =>
        idx === rowIndex ? { ...r, [field]: value } : r
      );
      return {
        ...prev,
        curricolo: { ...prev.curricolo, righeAbilitaConoscenze: nextRows },
      };
    });
  };

  const mergeRowWithPrevious = (rowIndex: number) => {
    if (rowIndex <= 0) return;
    setDraftPlan((prev) => {
      if (!prev) return prev;
      const rows = prev.curricolo.righeAbilitaConoscenze;
      const current = rows[rowIndex];
      const previous = rows[rowIndex - 1];
      if (!current || !previous) return prev;
      const joinField = (a?: string, b?: string) =>
        [(a ?? '').trim(), (b ?? '').trim()].filter(Boolean).join('\n');
      const merged: AbilitaConoscenzaRow = {
        ...previous,
        competenze: joinField(previous.competenze, current.competenze),
        abilita: joinField(previous.abilita, current.abilita),
        conoscenze: joinField(previous.conoscenze, current.conoscenze),
      };
      const nextRows = rows
        .map((r, idx) => (idx === rowIndex - 1 ? merged : r))
        .filter((_, idx) => idx !== rowIndex);
      return {
        ...prev,
        curricolo: { ...prev.curricolo, righeAbilitaConoscenze: nextRows },
      };
    });
  };

  const swapRowAbilitaConoscenze = (rowIndex: number) => {
    setDraftPlan((prev) => {
      if (!prev) return prev;
      const nextRows = prev.curricolo.righeAbilitaConoscenze.map((r, idx) =>
        idx === rowIndex ? { ...r, abilita: r.conoscenze, conoscenze: r.abilita } : r
      );
      return {
        ...prev,
        curricolo: { ...prev.curricolo, righeAbilitaConoscenze: nextRows },
      };
    });
  };

  const deleteCurriculumRow = (rowIndex: number) => {
    setDraftPlan((prev) => {
      if (!prev) return prev;
      const nextRows = prev.curricolo.righeAbilitaConoscenze.filter((_, idx) => idx !== rowIndex);
      return {
        ...prev,
        curricolo: { ...prev.curricolo, righeAbilitaConoscenze: nextRows },
      };
    });
  };

  const addCurriculumRow = () => {
    const newId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setDraftPlan((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        curricolo: {
          ...prev.curricolo,
          righeAbilitaConoscenze: [
            ...prev.curricolo.righeAbilitaConoscenze,
            { id: newId, competenze: '', abilita: '', conoscenze: '' },
          ],
        },
      };
    });
  };

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const mergedPlan = applyUnrecognizedBlockAssignments(
        draftPlan,
        importResult.unrecognizedBlocks,
        assignments
      );
      mergedPlan.verificheValutazione.firmaDocente = mergedPlan.datiGenerali.docente;
      await onConfirm(mergedPlan, {
        ...importResult,
        plan: mergedPlan,
      });
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-review-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-xs sm:p-5"
    >
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-blue-50 p-2 text-[#1F3864] dark:bg-blue-950/60 dark:text-blue-300">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="import-review-title"
                className="text-base font-bold text-slate-900 dark:text-slate-100"
              >
                Verifica anteprima campi importati
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                File: <span className="font-semibold">{importResult.summary.fileName}</span> (
                {importResult.summary.fileType.toUpperCase()} ·{' '}
                {importResult.summary.extractedChars} caratteri ·{' '}
                {draftPlan.curricolo.righeAbilitaConoscenze.length} righe curricolo)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Chiudi anteprima importazione"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4 text-sm">
          {importResult.warnings.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <ul className="list-disc space-y-1 pl-3">
                  {importResult.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Dati identificativi modificabili */}
          <section className="space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
            <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#1F3864] dark:text-blue-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Dati identificativi e composizione riconosciuti
            </h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-xs">
                <span className="font-medium text-slate-700 dark:text-slate-300">Disciplina</span>
                <select
                  value={draftPlan.datiGenerali.disciplina}
                  onChange={(e) =>
                    setDraftPlan((prev) =>
                      prev
                        ? {
                            ...prev,
                            datiGenerali: {
                              ...prev.datiGenerali,
                              disciplina: e.target.value,
                              titoloDisciplina: e.target.value,
                            },
                          }
                        : prev
                    )
                  }
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
                >
                  {DISCIPLINE_SECONDARIA.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-xs">
                <span className="font-medium text-slate-700 dark:text-slate-300">Classe</span>
                <select
                  value={draftPlan.datiGenerali.classe}
                  onChange={(e) =>
                    setDraftPlan((prev) =>
                      prev
                        ? {
                            ...prev,
                            datiGenerali: {
                              ...prev.datiGenerali,
                              classe: e.target.value as ClasseSecondaria,
                            },
                          }
                        : prev
                    )
                  }
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
                >
                  <option value="Prima">Prima</option>
                  <option value="Seconda">Seconda</option>
                  <option value="Terza">Terza</option>
                </select>
              </label>

              <label className="block text-xs">
                <span className="font-medium text-slate-700 dark:text-slate-300">Sezione</span>
                <input
                  type="text"
                  value={draftPlan.datiGenerali.sezione}
                  maxLength={8}
                  onChange={(e) =>
                    setDraftPlan((prev) =>
                      prev
                        ? {
                            ...prev,
                            datiGenerali: {
                              ...prev.datiGenerali,
                              sezione: e.target.value.toUpperCase(),
                            },
                          }
                        : prev
                    )
                  }
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
                />
              </label>

              <label className="block text-xs">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Anno scolastico
                </span>
                <input
                  type="text"
                  value={draftPlan.datiGenerali.annoScolastico}
                  onChange={(e) =>
                    setDraftPlan((prev) =>
                      prev
                        ? {
                            ...prev,
                            datiGenerali: { ...prev.datiGenerali, annoScolastico: e.target.value },
                          }
                        : prev
                    )
                  }
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
                />
              </label>

              <label className="block text-xs">
                <span className="font-medium text-slate-700 dark:text-slate-300">Plesso</span>
                <input
                  type="text"
                  value={draftPlan.datiGenerali.plesso}
                  onChange={(e) =>
                    setDraftPlan((prev) =>
                      prev
                        ? {
                            ...prev,
                            datiGenerali: { ...prev.datiGenerali, plesso: e.target.value },
                          }
                        : prev
                    )
                  }
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
                />
              </label>

              <label className="block text-xs">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Docente ({formatDocenteConTitolo(draftPlan.datiGenerali.docente, draftPlan.datiGenerali.docenteGenere ?? 'F')})
                </span>
                <div className="mt-1 flex gap-1.5">
                  <select
                    value={draftPlan.datiGenerali.docenteGenere ?? 'F'}
                    aria-label="Titolo docente"
                    onChange={(e) =>
                      setDraftPlan((prev) =>
                        prev
                          ? {
                              ...prev,
                              datiGenerali: {
                                ...prev.datiGenerali,
                                docenteGenere: e.target.value as DocenteGenere,
                              },
                            }
                          : prev
                      )
                    }
                    className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
                  >
                    <option value="F">Prof.ssa</option>
                    <option value="M">Prof.</option>
                  </select>
                  <input
                    type="text"
                    value={draftPlan.datiGenerali.docente}
                    onChange={(e) =>
                      setDraftPlan((prev) =>
                        prev
                          ? {
                              ...prev,
                              datiGenerali: { ...prev.datiGenerali, docente: e.target.value },
                            }
                          : prev
                      )
                    }
                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
                  />
                </div>
              </label>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-xs sm:grid-cols-6">
              {(
                [
                  ['alunni', 'Alunni'],
                  ['maschi', 'Maschi'],
                  ['femmine', 'Femmine'],
                  ['ripetenti', 'Ripetenti'],
                  ['bes', 'BES'],
                  ['disabilita', 'Con disabilità'],
                ] as const
              ).map(([fieldKey, label]) => (
                <label key={fieldKey} className="block">
                  <span className="text-[11px] text-slate-600 dark:text-slate-400">{label}</span>
                  <input
                    type="number"
                    min={0}
                    value={draftPlan.composizione[fieldKey] ?? 0}
                    onChange={(e) => {
                      const val = Math.max(0, Number(e.target.value) || 0);
                      setDraftPlan((prev) =>
                        prev
                          ? {
                              ...prev,
                              composizione: { ...prev.composizione, [fieldKey]: val },
                            }
                          : prev
                      );
                    }}
                    className="mt-0.5 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs tabular-nums dark:border-slate-700 dark:bg-slate-950"
                  />
                </label>
              ))}
            </div>

            <div className="grid grid-cols-4 gap-2 text-xs">
              {(
                [
                  ['bassoAlunni', 'Liv. Basso'],
                  ['medioBassoAlunni', 'Liv. Medio/Basso'],
                  ['medioAlunni', 'Liv. Medio'],
                  ['altoAlunni', 'Liv. Alto'],
                ] as const
              ).map(([lvlKey, label]) => (
                <label key={lvlKey} className="block">
                  <span className="text-[11px] text-slate-600 dark:text-slate-400">{label}</span>
                  <input
                    type="number"
                    min={0}
                    value={draftPlan.analisiPartenza.livelli[lvlKey]}
                    onChange={(e) => {
                      const val = Math.max(0, Number(e.target.value) || 0);
                      setDraftPlan((prev) =>
                        prev
                          ? {
                              ...prev,
                              analisiPartenza: {
                                ...prev.analisiPartenza,
                                livelli: { ...prev.analisiPartenza.livelli, [lvlKey]: val },
                              },
                            }
                          : prev
                      );
                    }}
                    className="mt-0.5 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs tabular-nums dark:border-slate-700 dark:bg-slate-950"
                  />
                </label>
              ))}
            </div>
          </section>

          {/* Riepilogo caselle e campi estratti */}
          <section className="space-y-2 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">
              Caselle e sezioni estratte ({importResult.recognizedFields.length} campi)
            </h3>
            <div className="grid gap-2 text-xs sm:grid-cols-2">
              {importResult.recognizedFields.map((field) => (
                <div
                  key={field.id}
                  className="rounded-md border border-slate-100 bg-slate-50/70 p-2 dark:border-slate-800 dark:bg-slate-950/60"
                >
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {field.section} · {field.label}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-slate-600 dark:text-slate-400">
                    {field.valuePreview}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Tabella Curricolo estratta modificabile */}
          <section className="space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-[#1F3864] dark:text-blue-300">
                  Tabella Curricolo estratta ({draftPlan.curricolo.righeAbilitaConoscenze.length}{' '}
                  righe)
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Se una riga proveniente da PDF o tabella è stata spezzata o ha colonne invertite,
                  usa «Unisci sopra» o «Scambia Abilità/Conoscenze».
                </p>
              </div>
              <button
                type="button"
                onClick={addCurriculumRow}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Plus className="h-3.5 w-3.5" />
                Aggiungi riga
              </button>
            </div>

            {draftPlan.curricolo.righeAbilitaConoscenze.length === 0 ? (
              <div className="rounded-md border border-dashed border-slate-300 p-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                Nessuna riga curricolo riconosciuta automaticamente. Puoi aggiungerne una
                manualmente oppure assegnare i blocchi non riconosciuti in basso.
              </div>
            ) : (
              <div className="space-y-2.5">
                {draftPlan.curricolo.righeAbilitaConoscenze.map((row, idx) => (
                  <div
                    key={row.id || idx}
                    className="space-y-2 rounded-md border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-950/50"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                        Riga {idx + 1}
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {idx > 0 && (
                          <button
                            type="button"
                            onClick={() => mergeRowWithPrevious(idx)}
                            title="Unisci questa riga con la riga precedente"
                            className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            <ArrowUp className="h-3 w-3" />
                            Unisci sopra
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => swapRowAbilitaConoscenze(idx)}
                          title="Scambia il contenuto di Abilità e Conoscenze"
                          className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <ArrowUpDown className="h-3 w-3" />
                          Scambia Abilità ↔ Conoscenze
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteCurriculumRow(idx)}
                          title="Elimina riga"
                          className="inline-flex items-center gap-1 rounded border border-rose-200 bg-white px-2 py-0.5 text-[11px] font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:bg-slate-900 dark:text-rose-300 dark:hover:bg-rose-950/40"
                        >
                          <Trash2 className="h-3 w-3" />
                          Elimina
                        </button>
                      </div>
                    </div>
                    <div
                      className={`grid gap-2 ${
                        row.competenze?.trim() ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
                      }`}
                    >
                      {row.competenze?.trim() && (
                        <label className="block text-[11px]">
                          <span className="font-medium text-slate-600 dark:text-slate-400">
                            Competenze / Nucleo
                          </span>
                          <textarea
                            rows={2}
                            value={row.competenze ?? ''}
                            onChange={(e) => updateRowField(idx, 'competenze', e.target.value)}
                            className="mt-0.5 w-full rounded border border-slate-300 bg-white p-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
                          />
                        </label>
                      )}
                      <label className="block text-[11px]">
                        <span className="font-medium text-slate-600 dark:text-slate-400">
                          {draftPlan.curricolo.indicazioniVersione === 'nuove'
                            ? 'Obiettivi'
                            : 'Abilità / Obiettivi'}
                        </span>
                        <textarea
                          rows={2}
                          value={row.abilita}
                          onChange={(e) => updateRowField(idx, 'abilita', e.target.value)}
                          className="mt-0.5 w-full rounded border border-slate-300 bg-white p-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
                        />
                      </label>
                      <label className="block text-[11px]">
                        <span className="font-medium text-slate-600 dark:text-slate-400">
                          Conoscenze / Contenuti
                        </span>
                        <textarea
                          rows={2}
                          value={row.conoscenze}
                          onChange={(e) => updateRowField(idx, 'conoscenze', e.target.value)}
                          className="mt-0.5 w-full rounded border border-slate-300 bg-white p-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Modifica rapida testi estratti */}
          <section className="space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">
              Testi estratti (conservati integralmente — modificabili prima dell’importazione)
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Analisi situazione di partenza
                </span>
                <textarea
                  rows={3}
                  value={draftPlan.analisiPartenza.descrizioneDisciplinare}
                  onChange={(e) =>
                    setDraftPlan((prev) =>
                      prev
                        ? {
                            ...prev,
                            analisiPartenza: {
                              ...prev.analisiPartenza,
                              descrizioneDisciplinare: e.target.value,
                            },
                          }
                        : prev
                    )
                  }
                  className="mt-1 w-full rounded-md border border-slate-300 p-2 text-xs dark:border-slate-700 dark:bg-slate-950"
                />
              </label>

              <label className="block text-xs">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Alunni con BES e interventi programmati
                </span>
                <textarea
                  rows={3}
                  value={draftPlan.interventi.besInterventiProgrammati}
                  onChange={(e) =>
                    setDraftPlan((prev) =>
                      prev
                        ? {
                            ...prev,
                            interventi: {
                              ...prev.interventi,
                              besInterventiProgrammati: e.target.value,
                            },
                          }
                        : prev
                    )
                  }
                  className="mt-1 w-full rounded-md border border-slate-300 p-2 text-xs dark:border-slate-700 dark:bg-slate-950"
                />
              </label>

              <label className="block text-xs">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Attività programmate
                </span>
                <textarea
                  rows={2}
                  value={draftPlan.curricolo.attivitaProgrammate}
                  onChange={(e) =>
                    setDraftPlan((prev) =>
                      prev
                        ? {
                            ...prev,
                            curricolo: {
                              ...prev.curricolo,
                              attivitaProgrammate: e.target.value,
                            },
                          }
                        : prev
                    )
                  }
                  className="mt-1 w-full rounded-md border border-slate-300 p-2 text-xs dark:border-slate-700 dark:bg-slate-950"
                />
              </label>

              <label className="block text-xs">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Criteri di valutazione
                </span>
                <textarea
                  rows={2}
                  value={draftPlan.verificheValutazione.criteriValutazione}
                  onChange={(e) =>
                    setDraftPlan((prev) =>
                      prev
                        ? {
                            ...prev,
                            verificheValutazione: {
                              ...prev.verificheValutazione,
                              criteriValutazione: e.target.value,
                            },
                          }
                        : prev
                    )
                  }
                  className="mt-1 w-full rounded-md border border-slate-300 p-2 text-xs dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
            </div>
          </section>

          {/* Blocchi non riconosciuti con certezza */}
          {importResult.unrecognizedBlocks.length > 0 && (
            <section className="space-y-3 rounded-lg border border-amber-300 bg-amber-50/50 p-4 dark:border-amber-800 dark:bg-amber-950/20">
              <div className="flex items-start gap-2">
                <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-amber-900 dark:text-amber-300">
                    Contenuti non riconosciuti con certezza ({importResult.unrecognizedBlocks.length})
                  </h3>
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    Questi testi non sono stati inseriti automaticamente per evitare associazioni errate. Scegli dove collocarli o lasciali ignorati.
                  </p>
                </div>
              </div>
              <div className="space-y-2.5">
                {importResult.unrecognizedBlocks.map((blk) => (
                  <div
                    key={blk.id}
                    className="rounded-md border border-amber-200 bg-white p-3 text-xs dark:border-amber-900 dark:bg-slate-900"
                  >
                    <p className="whitespace-pre-wrap text-slate-800 dark:text-slate-200">
                      {blk.text}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">{blk.reason}</p>
                    <div className="mt-2">
                      <label className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          Assegna a:
                        </span>
                        <select
                          value={assignments[blk.id] ?? 'ignore'}
                          onChange={(e) =>
                            setAssignments((prev) => ({
                              ...prev,
                              [blk.id]: e.target.value as ImportBlockTargetField,
                            }))
                          }
                          className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-950"
                        >
                          {TARGET_FIELD_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Testo grezzo estratto dal file per verifica manuale */}
          {importResult.rawText && (
            <section className="rounded-lg border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowRawText((prev) => !prev)}
                className="flex w-full items-center justify-between px-4 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60"
              >
                <span>Testo grezzo estratto dal documento (per eventuale verifica manuale)</span>
                {showRawText ? (
                  <ChevronUp className="h-4 w-4 text-slate-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                )}
              </button>
              {showRawText && (
                <pre className="max-h-60 overflow-auto border-t border-slate-200 bg-slate-50 p-3 font-mono text-[11px] whitespace-pre-wrap text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                  {importResult.rawText}
                </pre>
              )}
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-5 py-3.5 dark:border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Annulla
          </button>
          <button
            type="button"
            disabled={confirming}
            onClick={handleConfirm}
            className="rounded-lg bg-[#1F3864] px-4 py-2 text-xs font-semibold text-white hover:bg-[#172b4d] disabled:opacity-60"
          >
            {confirming ? 'Importazione...' : 'Conferma e importa nella programmazione'}
          </button>
        </div>
      </div>
    </div>
  );
}
