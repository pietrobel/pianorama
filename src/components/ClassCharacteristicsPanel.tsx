import {
  EyeOff,
  GripVertical,
  Lock,
  Minus,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { useRef, useState } from 'react';
import {
  DEFAULT_SOGLIE_QUOTE_CARATTERISTICHE,
  getCharacteristicsCatalogForDimension,
} from '../domain/defaults';
import type {
  ClassCharacteristicDimension,
  ClassCharacteristicSegment,
  SoglieQuoteCaratteristiche,
} from '../domain/types';
import {
  addCharacteristicToDimension,
  adjustCharacteristicQuota,
  computeStudentCountFromPct,
  createCustomDimension,
  ensureClassDimensions,
  generateDimensionSentence,
  getDimensionVariantIndex,
  isDimensionAllNessuno,
  isNonDefinitoSegment,
  moveDimensionHandle,
  removeCharacteristicFromDimension,
  setSegmentExactCount,
  stepDimensionHandle,
  STYLISTIC_VARIANTS_COUNT,
} from '../engine/classCharacteristicsEngine';

interface ClassCharacteristicsPanelProps {
  dimensions: ClassCharacteristicDimension[] | undefined;
  alunniTotali: number;
  soglieQuote?: SoglieQuoteCaratteristiche;
  contextSeed?: string;
  variantePresentazione?: number;
  onChangeVariantePresentazione?: (next: number) => void;
  onChange: (nextDimensions: ClassCharacteristicDimension[]) => void;
}

const SEGMENT_COLORS = [
  'bg-[#1F3864] text-white',
  'bg-teal-700 text-white',
  'bg-indigo-600 text-white',
  'bg-amber-600 text-white',
  'bg-rose-700 text-white',
  'bg-emerald-700 text-white',
];

const SEGMENT_DOT_COLORS = [
  'bg-[#1F3864]',
  'bg-teal-700',
  'bg-indigo-600',
  'bg-amber-600',
  'bg-rose-700',
  'bg-emerald-700',
];

function getSegmentColorClass(seg: ClassCharacteristicSegment, idx: number): string {
  if (isNonDefinitoSegment(seg)) {
    return 'bg-slate-300 text-slate-800 dark:bg-slate-700 dark:text-slate-100';
  }
  return SEGMENT_COLORS[(Math.max(0, idx - 1)) % SEGMENT_COLORS.length];
}

function getDotColorClass(seg: ClassCharacteristicSegment, idx: number): string {
  if (isNonDefinitoSegment(seg)) return 'bg-slate-400 dark:bg-slate-600';
  return SEGMENT_DOT_COLORS[(Math.max(0, idx - 1)) % SEGMENT_DOT_COLORS.length];
}

export function ClassCharacteristicsPanel({
  dimensions,
  alunniTotali,
  soglieQuote = DEFAULT_SOGLIE_QUOTE_CARATTERISTICHE,
  contextSeed = '',
  variantePresentazione,
  onChangeVariantePresentazione,
  onChange,
}: ClassCharacteristicsPanelProps) {
  const normalizedDimensions = ensureClassDimensions(dimensions);
  const [newDimName, setNewDimName] = useState('');
  const [catalogChoices, setCatalogChoices] = useState<Record<string, string>>({});
  const [customCharacteristicInputs, setCustomCharacteristicInputs] = useState<
    Record<string, string>
  >({});
  const [activeHandleKey, setActiveHandleKey] = useState<string | null>(null);
  const barRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const updateDimension = (
    dimId: string,
    updater: (dim: ClassCharacteristicDimension) => ClassCharacteristicDimension
  ) => {
    onChange(normalizedDimensions.map((d) => (d.id === dimId ? updater(d) : d)));
  };

  const handleAddDimension = () => {
    const trimmed = newDimName.trim();
    if (!trimmed) return;
    onChange([...normalizedDimensions, createCustomDimension(trimmed)]);
    setNewDimName('');
  };

  const handleRemoveDimension = (dimId: string) => {
    onChange(normalizedDimensions.filter((d) => d.id !== dimId));
  };

  const handleAddCharacteristic = (dim: ClassCharacteristicDimension) => {
    const presetChoice = catalogChoices[dim.id] ?? '';
    const manualText = (customCharacteristicInputs[dim.id] ?? '').trim();
    const label = manualText || presetChoice;
    if (!label) return;

    updateDimension(dim.id, (prev) => addCharacteristicToDimension(prev, label));
    setCustomCharacteristicInputs((prev) => ({ ...prev, [dim.id]: '' }));
    setCatalogChoices((prev) => ({ ...prev, [dim.id]: '' }));
  };

  const startHandleDrag = (
    e: React.PointerEvent<HTMLButtonElement>,
    dim: ClassCharacteristicDimension,
    handleIndex: number
  ) => {
    e.preventDefault();
    const barEl = barRefs.current[dim.id];
    if (!barEl) return;
    setActiveHandleKey(`${dim.id}:${handleIndex}`);

    const computeAndApply = (clientX: number) => {
      const rect = barEl.getBoundingClientRect();
      if (rect.width <= 0) return;
      const pct = ((clientX - rect.left) / rect.width) * 100;
      updateDimension(dim.id, (prev) => ({
        ...prev,
        segmenti: moveDimensionHandle(prev.segmenti, handleIndex, pct),
      }));
    };

    const onMove = (moveEvt: PointerEvent) => {
      computeAndApply(moveEvt.clientX);
    };

    const onUp = () => {
      setActiveHandleKey(null);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  const handleCycleAllVariants = () => {
    if (onChangeVariantePresentazione) {
      const nextPres = ((variantePresentazione ?? 0) + 1) % STYLISTIC_VARIANTS_COUNT;
      onChangeVariantePresentazione(nextPres);
    }
    onChange(
      normalizedDimensions.map((d) => {
        if (d.isTestoManuale || isDimensionAllNessuno(d)) return d;
        const current = getDimensionVariantIndex(d, contextSeed);
        return {
          ...d,
          varianteStile: (current + 1) % STYLISTIC_VARIANTS_COUNT,
        };
      })
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="max-w-2xl">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Caratteristiche della classe (distribuzione percentuale per sottogruppi)
          </h3>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
            Ogni dimensione è una riga unica al 100% che parte a sinistra dallo spazio «non definito» e prosegue a destra con gli indicatori specifici selezionati. Per ogni tipologia sono disponibili 10 formulazioni stilistiche diverse per evitare testi ripetitivi tra classi.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCycleAllVariants}
          title="Rigenera le frasi scegliendo nuove varianti stilistiche tra le 10 disponibili per ciascuna tipologia"
          className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-[#1F3864] bg-white px-3 py-1.5 text-xs font-semibold text-[#1F3864] hover:bg-blue-50 dark:border-blue-400 dark:bg-slate-900 dark:text-blue-300 dark:hover:bg-slate-800"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Varia tutte le formulazioni
        </button>
      </div>

      <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-slate-50/50 dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-950/30">
        {normalizedDimensions.map((dim) => {
          const catalogOptions = getCharacteristicsCatalogForDimension(dim);
          const allNonDefinito = isDimensionAllNessuno(dim);
          const currentVariant = getDimensionVariantIndex(dim, contextSeed);
          const autoSentence = generateDimensionSentence(dim, soglieQuote, contextSeed);
          const displayedSentence = dim.isTestoManuale
            ? dim.testoManuale ?? ''
            : autoSentence;

          const totalPct = dim.segmenti.reduce((acc, s) => acc + s.quotaPercentuale, 0);

          const cumulativePositions: number[] = [];
          let running = 0;
          for (let i = 0; i < dim.segmenti.length - 1; i++) {
            running += dim.segmenti[i].quotaPercentuale;
            cumulativePositions.push(running);
          }

          return (
            <div key={dim.id} className="space-y-3 p-4">
              {/* Intestazione dimensione */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  {dim.isCustom ? (
                    <input
                      type="text"
                      value={dim.nome}
                      aria-label="Nome dimensione personalizzata"
                      onChange={(e) =>
                        updateDimension(dim.id, (prev) => ({
                          ...prev,
                          nome: e.target.value,
                        }))
                      }
                      className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-sm font-bold text-[#1F3864] dark:border-slate-700 dark:bg-slate-900 dark:text-blue-300"
                    />
                  ) : (
                    <h4 className="text-sm font-bold text-[#1F3864] dark:text-blue-300">
                      {dim.nome}
                    </h4>
                  )}

                  <span className="font-mono-num text-xs font-medium text-slate-500 dark:text-slate-400">
                    Totale: {totalPct}%
                  </span>

                  {allNonDefinito && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                      <EyeOff className="h-3.5 w-3.5" />
                      Non definito 100% — esclusa dal documento
                    </span>
                  )}
                </div>

                {dim.isCustom && (
                  <button
                    type="button"
                    onClick={() => handleRemoveDimension(dim.id)}
                    aria-label={`Elimina dimensione ${dim.nome}`}
                    className="inline-flex items-center gap-1 whitespace-nowrap shrink-0 rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/30"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Elimina dimensione
                  </button>
                )}
              </div>

              {/* Barra orizzontale unica divisa in segmenti al 100% con leve trascinabili */}
              <div className="space-y-1.5">
                <div
                  ref={(el) => {
                    barRefs.current[dim.id] = el;
                  }}
                  aria-label={`Distribuzione segmenti per ${dim.nome}`}
                  className="relative flex h-12 w-full select-none items-stretch overflow-visible rounded-lg border border-slate-300 bg-slate-200 dark:border-slate-700 dark:bg-slate-800"
                >
                  {dim.segmenti.map((seg, idx) => {
                    const countLabel =
                      seg.quotaNumerica !== undefined && seg.quotaNumerica > 0
                        ? seg.quotaNumerica
                        : computeStudentCountFromPct(seg.quotaPercentuale, alunniTotali);
                    const isFirst = idx === 0;
                    const isLast = idx === dim.segmenti.length - 1;
                    return (
                      <div
                        key={seg.id}
                        style={{ width: `${seg.quotaPercentuale}%` }}
                        title={`${seg.etichetta} ${seg.quotaPercentuale}% · ${countLabel} di ${alunniTotali}`}
                        className={`flex items-center justify-center overflow-hidden px-1.5 text-center transition-[width] duration-75 ${getSegmentColorClass(
                          seg,
                          idx
                        )} ${isFirst ? 'rounded-l-[7px]' : ''} ${isLast ? 'rounded-r-[7px]' : ''}`}
                      >
                        {seg.quotaPercentuale >= 10 && (
                          <span className="truncate font-mono-num text-[11px] font-semibold leading-tight">
                            {seg.etichetta} {seg.quotaPercentuale}% · {countLabel} di {alunniTotali}
                          </span>
                        )}
                      </div>
                    );
                  })}

                  {/* Leve trascinabili tra segmenti adiacenti */}
                  {cumulativePositions.map((cumPct, handleIdx) => {
                    const leftSeg = dim.segmenti[handleIdx];
                    const rightSeg = dim.segmenti[handleIdx + 1];
                    const key = `${dim.id}:${handleIdx}`;
                    const isDragging = activeHandleKey === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        role="slider"
                        aria-label={`Leva tra ${leftSeg.etichetta} e ${rightSeg.etichetta}`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={cumPct}
                        title={`Trascina o usa ← / → per regolare "${leftSeg.etichetta}" ↔ "${rightSeg.etichetta}" (${cumPct}%)`}
                        style={{ left: `${cumPct}%` }}
                        onPointerDown={(e) => startHandleDrag(e, dim, handleIdx)}
                        onKeyDown={(e) => {
                          const step = e.shiftKey ? 1 : 5;
                          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                            e.preventDefault();
                            updateDimension(dim.id, (prev) => ({
                              ...prev,
                              segmenti: stepDimensionHandle(prev.segmenti, handleIdx, step),
                            }));
                          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                            e.preventDefault();
                            updateDimension(dim.id, (prev) => ({
                              ...prev,
                              segmenti: stepDimensionHandle(prev.segmenti, handleIdx, -step),
                            }));
                          }
                        }}
                        className={`group absolute top-[-3px] bottom-[-3px] z-20 -ml-2.5 flex w-5 cursor-ew-resize touch-none items-center justify-center rounded-md border shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDragging
                            ? 'z-30 border-[#1F3864] bg-white text-[#1F3864] scale-105'
                            : 'border-slate-400 bg-white/95 text-slate-700 hover:z-30 hover:border-[#1F3864] hover:text-[#1F3864] dark:border-slate-500 dark:bg-slate-900 dark:text-slate-200'
                        }`}
                      >
                        <GripVertical className="h-3.5 w-3.5" />
                      </button>
                    );
                  })}
                </div>

                {/* Legenda e controlli precisi per ogni segmento */}
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {dim.segmenti.map((seg, idx) => {
                    const effectiveCount =
                      seg.quotaNumerica !== undefined && seg.quotaNumerica > 0
                        ? seg.quotaNumerica
                        : computeStudentCountFromPct(seg.quotaPercentuale, alunniTotali);
                    const isNonDef = isNonDefinitoSegment(seg);
                    const isExcludedInDoc = isNonDef || seg.quotaPercentuale === 0;

                    return (
                      <div
                        key={seg.id}
                        className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${
                          isExcludedInDoc
                            ? 'border-slate-200 bg-white/70 text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400'
                            : 'border-slate-300 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className={`h-2.5 w-2.5 shrink-0 rounded-sm ${getDotColorClass(
                              seg,
                              idx
                            )}`}
                          />
                          <div className="min-w-0">
                            <p className="truncate font-semibold">
                              {seg.etichetta}
                              {isNonDef && ' (non produce frase)'}
                            </p>
                            <p className="font-mono-num text-[11px] text-slate-500 dark:text-slate-400">
                              {seg.quotaPercentuale}% · {effectiveCount} di {alunniTotali}
                            </p>
                          </div>
                        </div>

                        {!isNonDef && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              aria-label={`Diminuisci quota di ${seg.etichetta}`}
                              onClick={() =>
                                updateDimension(dim.id, (prev) =>
                                  adjustCharacteristicQuota(prev, seg.id, -5)
                                )
                              }
                              className="rounded border border-slate-300 p-1 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Aumenta quota di ${seg.etichetta}`}
                              onClick={() =>
                                updateDimension(dim.id, (prev) =>
                                  adjustCharacteristicQuota(prev, seg.id, 5)
                                )
                              }
                              className="rounded border border-slate-300 p-1 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                              <Plus className="h-3 w-3" />
                            </button>

                            <input
                              type="number"
                              min={0}
                              max={Math.max(40, alunniTotali)}
                              aria-label={`Numero esatto alunni per ${seg.etichetta}`}
                              title="Numero esatto di alunni (facoltativo: sostituisce l'espressione verbale nella frase)"
                              placeholder="N°"
                              value={seg.quotaNumerica ?? ''}
                              onChange={(e) => {
                                const raw = e.target.value.trim();
                                const parsed =
                                  raw === '' ? undefined : Math.max(0, Math.round(Number(raw) || 0));
                                updateDimension(dim.id, (prev) =>
                                  setSegmentExactCount(prev, seg.id, parsed, alunniTotali)
                                );
                              }}
                              className="w-12 rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono-num text-[11px] dark:border-slate-700 dark:bg-slate-950"
                            />

                            <button
                              type="button"
                              aria-label={`Rimuovi caratteristica ${seg.etichetta}`}
                              title="Rimuovi caratteristica (trasferisce la quota a non definito)"
                              onClick={() =>
                                updateDimension(dim.id, (prev) =>
                                  removeCharacteristicFromDimension(prev, seg.id)
                                )
                              }
                              className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Aggiungi caratteristica (dal catalogo specifico della dimensione o scritta a mano) */}
              <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-2.5 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900">
                <select
                  aria-label={`Seleziona caratteristica dal catalogo per ${dim.nome}`}
                  value={catalogChoices[dim.id] ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCatalogChoices((prev) => ({ ...prev, [dim.id]: val }));
                    if (val) {
                      setCustomCharacteristicInputs((prev) => ({ ...prev, [dim.id]: '' }));
                    }
                  }}
                  className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
                >
                  <option value="">Scegli indicatore specifico...</option>
                  {catalogOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={customCharacteristicInputs[dim.id] ?? ''}
                  onChange={(e) =>
                    setCustomCharacteristicInputs((prev) => ({
                      ...prev,
                      [dim.id]: e.target.value,
                    }))
                  }
                  placeholder="Oppure scrivi una caratteristica a mano..."
                  className="flex-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
                />
                <button
                  type="button"
                  disabled={
                    !(catalogChoices[dim.id] || (customCharacteristicInputs[dim.id] ?? '').trim())
                  }
                  onClick={() => handleAddCharacteristic(dim)}
                  className="inline-flex items-center justify-center gap-1 whitespace-nowrap shrink-0 rounded-md bg-[#1F3864] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#172b4d] disabled:opacity-45"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Aggiungi caratteristica
                </button>
              </div>

              {/* Frase generata e modifica manuale protetta */}
              <div className="space-y-1.5 border-t border-slate-200/80 pt-2.5 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label
                    htmlFor={`dim-text-${dim.id}`}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    <span>Frase generata per il documento</span>
                    {dim.isTestoManuale && !allNonDefinito && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#1F3864] dark:text-blue-300">
                        <Lock className="h-3 w-3" />
                        Testo manuale (non sovrascritto)
                      </span>
                    )}
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {!allNonDefinito && !dim.isTestoManuale && (
                      <button
                        type="button"
                        onClick={() =>
                          updateDimension(dim.id, (prev) => ({
                            ...prev,
                            varianteStile: (currentVariant + 1) % STYLISTIC_VARIANTS_COUNT,
                          }))
                        }
                        title="Scegli un'altra formulazione tra le 10 disponibili per questa tipologia"
                        className="inline-flex items-center gap-1 whitespace-nowrap shrink-0 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Cambia frase ({currentVariant + 1}/{STYLISTIC_VARIANTS_COUNT})
                      </button>
                    )}
                    {dim.isTestoManuale && (
                      <button
                        type="button"
                        onClick={() =>
                          updateDimension(dim.id, (prev) => ({
                            ...prev,
                            isTestoManuale: false,
                            testoManuale: undefined,
                          }))
                        }
                        className="inline-flex items-center gap-1 whitespace-nowrap shrink-0 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Ripristina testo automatico
                      </button>
                    )}
                  </div>
                </div>

                <textarea
                  id={`dim-text-${dim.id}`}
                  rows={2}
                  value={allNonDefinito ? '' : displayedSentence}
                  disabled={allNonDefinito}
                  onChange={(e) =>
                    updateDimension(dim.id, (prev) => ({
                      ...prev,
                      isTestoManuale: true,
                      testoManuale: e.target.value,
                    }))
                  }
                  placeholder={
                    allNonDefinito
                      ? 'Dimensione con "non definito" al 100%: non comparirà nel documento.'
                      : 'Frase generata automaticamente; puoi modificarla liberamente...'
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs leading-relaxed text-slate-900 disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-900/40"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Aggiunta nuova dimensione */}
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-950/30">
        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
          Aggiungi nuova dimensione di osservazione (parte con «non definito» al 100%)
        </p>
        <div className="mt-2 flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <input
            type="text"
            value={newDimName}
            onChange={(e) => setNewDimName(e.target.value)}
            placeholder="Es. Rispetto delle regole, Capacità espressive..."
            className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
          <button
            type="button"
            disabled={!newDimName.trim()}
            onClick={handleAddDimension}
            className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg bg-[#1F3864] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#172b4d] disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Aggiungi dimensione
          </button>
        </div>
      </div>
    </div>
  );
}
