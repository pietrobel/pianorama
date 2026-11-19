import { BookMarked, CheckSquare, ChevronDown, ChevronRight, Info, Square, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DISCIPLINE_SECONDARIA } from '../domain/defaults';
import type { ClasseSecondaria, CurricoloCatalogEntry, IndicazioniVersion } from '../domain/types';
import {
  INDICAZIONI_LABELS,
  computePreselectedCatalogIds,
  filterCatalogEntries,
  getDefaultIndicazioniForClasseAndYear,
  groupCatalogEntries,
  type CurricoloTypeGroup,
} from '../engine/curricoloCatalogEngine';

interface CurricoloCatalogSelectorProps {
  open: boolean;
  catalog: CurricoloCatalogEntry[];
  planClasse: ClasseSecondaria;
  planAnnoScolastico?: string;
  planIndicazioni?: IndicazioniVersion;
  planDisciplina: string;
  planConoscenze?: string[];
  onChangePlanIndicazioni?: (next: IndicazioniVersion) => void;
  onImport: (selectedEntries: CurricoloCatalogEntry[]) => void;
  onClose: () => void;
}

interface IndeterminateCheckboxProps {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
  label: string;
}

function GroupCheckbox({ checked, indeterminate, onChange, label }: IndeterminateCheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = indeterminate && !checked;
    }
  }, [checked, indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      aria-label={label}
      className="h-4 w-4 shrink-0 cursor-pointer accent-[#1F3864]"
    />
  );
}

const CLASSI_SECONDARIA: ClasseSecondaria[] = ['Prima', 'Seconda', 'Terza'];

export function CurricoloCatalogSelector({
  open,
  catalog,
  planClasse,
  planAnnoScolastico,
  planIndicazioni,
  planDisciplina,
  planConoscenze = [],
  onChangePlanIndicazioni,
  onImport,
  onClose,
}: CurricoloCatalogSelectorProps) {
  const [selectedClasse, setSelectedClasse] = useState<ClasseSecondaria>(planClasse);
  const [selectedDisciplina, setSelectedDisciplina] = useState<string>(
    planDisciplina || 'Italiano'
  );
  const [selectedIndicazioni, setSelectedIndicazioni] = useState<IndicazioniVersion>(
    () => planIndicazioni ?? getDefaultIndicazioniForClasseAndYear(planClasse, planAnnoScolastico)
  );
  const [manualIndicazioniOverride, setManualIndicazioniOverride] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [otherClassesExpanded, setOtherClassesExpanded] = useState<boolean>(false);
  const [contentSourceMode, setContentSourceMode] = useState<'piano' | 'catalogo'>('piano');

  const recommendedIndicazioni = useMemo(
    () => getDefaultIndicazioniForClasseAndYear(selectedClasse, planAnnoScolastico),
    [selectedClasse, planAnnoScolastico]
  );

  const disciplineOptions = useMemo(() => {
    const base = [...DISCIPLINE_SECONDARIA];
    for (const entry of catalog) {
      if (!base.includes(entry.disciplina)) base.push(entry.disciplina);
    }
    if (planDisciplina && !base.includes(planDisciplina)) {
      base.unshift(planDisciplina);
    }
    return base;
  }, [catalog, planDisciplina]);

  const targetEntries = useMemo(() => {
    const filtered = filterCatalogEntries(
      catalog,
      selectedClasse,
      selectedDisciplina,
      selectedIndicazioni
    );
    if (selectedIndicazioni === 'vecchie') {
      const allClassDisc = filterCatalogEntries(catalog, selectedClasse, selectedDisciplina);
      const additions: CurricoloCatalogEntry[] = [];
      if (!filtered.some((e) => e.tipo === 'competenza')) {
        additions.push(...allClassDisc.filter((e) => e.tipo === 'competenza'));
      }
      if (!filtered.some((e) => e.tipo === 'conoscenza')) {
        additions.push(...allClassDisc.filter((e) => e.tipo === 'conoscenza'));
      }
      if (!filtered.some((e) => e.tipo === 'abilita')) {
        additions.push(...allClassDisc.filter((e) => e.tipo === 'abilita'));
      }
      return [...additions, ...filtered];
    }
    return filtered;
  }, [catalog, selectedClasse, selectedDisciplina, selectedIndicazioni]);

  const alternateIndicazioni: IndicazioniVersion =
    selectedIndicazioni === 'nuove' ? 'vecchie' : 'nuove';

  const alternateTargetCount = useMemo(
    () =>
      filterCatalogEntries(catalog, selectedClasse, selectedDisciplina, alternateIndicazioni).length,
    [catalog, selectedClasse, selectedDisciplina, alternateIndicazioni]
  );

  const otherClassesData = useMemo(() => {
    const otherClasses = CLASSI_SECONDARIA.filter((c) => c !== selectedClasse);
    return otherClasses
      .map((cls) => {
        const entries = filterCatalogEntries(
          catalog,
          cls,
          selectedDisciplina,
          selectedIndicazioni
        );
        return {
          classe: cls,
          entries,
          ids: entries.map((e) => e.id),
          grouped: groupCatalogEntries(entries),
        };
      })
      .filter((bucket) => bucket.entries.length > 0);
  }, [catalog, selectedClasse, selectedDisciplina, selectedIndicazioni]);

  const allDisciplineEntries = useMemo(
    () => [...targetEntries, ...otherClassesData.flatMap((b) => b.entries)],
    [targetEntries, otherClassesData]
  );

  const targetGrouped = useMemo(() => groupCatalogEntries(targetEntries), [targetEntries]);

  const hasCompetenzeOrObiettivi = useMemo(
    () => targetEntries.some((e) => e.tipo === 'competenza' || e.tipo === 'obiettivo_specifico'),
    [targetEntries]
  );

  const hasPlanContentsForCurrentSelection =
    selectedClasse === planClasse &&
    selectedDisciplina.toLowerCase() === planDisciplina.toLowerCase() &&
    planConoscenze.some((c) => c.trim().length > 0);

  const preselectionResult = useMemo(
    () =>
      computePreselectedCatalogIds(
        targetEntries,
        selectedClasse,
        hasPlanContentsForCurrentSelection && contentSourceMode === 'piano'
          ? planConoscenze
          : []
      ),
    [
      targetEntries,
      selectedClasse,
      hasPlanContentsForCurrentSelection,
      contentSourceMode,
      planConoscenze,
    ]
  );

  // All'apertura sincronizza classe/disciplina/indicazioni della programmazione corrente e chiude "Da altre classi"
  useEffect(() => {
    if (!open) return;
    setSelectedClasse(planClasse);
    setSelectedDisciplina(planDisciplina || 'Italiano');
    setSelectedIndicazioni(
      planIndicazioni ?? getDefaultIndicazioniForClasseAndYear(planClasse, planAnnoScolastico)
    );
    setManualIndicazioniOverride(false);
    setOtherClassesExpanded(false);
    setContentSourceMode('piano');
  }, [open, planClasse, planDisciplina, planIndicazioni, planAnnoScolastico]);

  // Alla scelta di disciplina, classe e versione Indicazioni: preseleziona coerentemente le voci della classe
  useEffect(() => {
    if (!open) return;
    setSelectedIds(new Set(preselectionResult.selectedIds));
  }, [open, preselectionResult]);

  const handleSelectClasse = (nextClasse: ClasseSecondaria) => {
    setSelectedClasse(nextClasse);
    if (!manualIndicazioniOverride) {
      setSelectedIndicazioni(
        nextClasse === planClasse && planIndicazioni
          ? planIndicazioni
          : getDefaultIndicazioniForClasseAndYear(nextClasse, planAnnoScolastico)
      );
    }
  };

  const handleSelectIndicazioni = (nextVersion: IndicazioniVersion) => {
    setSelectedIndicazioni(nextVersion);
    setManualIndicazioniOverride(true);
    if (selectedClasse === planClasse && onChangePlanIndicazioni) {
      onChangePlanIndicazioni(nextVersion);
    }
  };

  const handleResetDefaultIndicazioni = () => {
    setManualIndicazioniOverride(false);
    setSelectedIndicazioni(recommendedIndicazioni);
    if (selectedClasse === planClasse && onChangePlanIndicazioni) {
      onChangePlanIndicazioni(recommendedIndicazioni);
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const totalCount = allDisciplineEntries.length;
  const selectedCount = allDisciplineEntries.filter((e) => selectedIds.has(e.id)).length;
  const targetSelectedCount = targetEntries.filter((e) => selectedIds.has(e.id)).length;
  const otherSelectedCount = otherClassesData
    .flatMap((b) => b.entries)
    .filter((e) => selectedIds.has(e.id)).length;

  const sourcesPresent = Array.from(
    new Set(targetEntries.map((e) => e.documentoProvenienza).filter(Boolean))
  );

  const selectAllIds = (ids: string[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      return next;
    });
  };

  const deselectAllIds = (ids: string[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
  };

  const selectEntireList = () => {
    setSelectedIds(new Set(allDisciplineEntries.map((e) => e.id)));
  };

  const deselectEntireList = () => {
    setSelectedIds(new Set());
  };

  const toggleItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleGroupIds = (ids: string[]) => {
    const allSelected = ids.every((id) => selectedIds.has(id));
    if (allSelected) {
      deselectAllIds(ids);
    } else {
      selectAllIds(ids);
    }
  };

  const handleConfirmImport = () => {
    const chosen = allDisciplineEntries.filter((e) => selectedIds.has(e.id));
    if (chosen.length === 0) return;
    onImport(chosen);
    onClose();
  };

  const renderGroupedSections = (
    grouped: CurricoloTypeGroup[],
    isCrossClass: boolean,
    keyPrefix: string
  ) =>
    grouped.map((typeGroup) => {
      const typeSelectedCount = typeGroup.allIds.filter((id) => selectedIds.has(id)).length;
      const typeAllSelected =
        typeGroup.allIds.length > 0 && typeSelectedCount === typeGroup.allIds.length;
      const typeIndeterminate =
        typeSelectedCount > 0 && typeSelectedCount < typeGroup.allIds.length;

      return (
        <section
          key={`${keyPrefix}-${typeGroup.tipo}`}
          className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
        >
          {/* Intestazione gruppo Tipo con controlli Seleziona tutti / Deseleziona tutti */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-[#1F3864]/5 px-4 py-2.5 dark:border-slate-800 dark:bg-blue-950/25">
            <label className="flex cursor-pointer items-center gap-2.5">
              <GroupCheckbox
                checked={typeAllSelected}
                indeterminate={typeIndeterminate}
                onChange={() => toggleGroupIds(typeGroup.allIds)}
                label={`Seleziona o deseleziona tutto il gruppo ${typeGroup.label}`}
              />
              <span className="text-xs font-bold uppercase tracking-wide text-[#1F3864] dark:text-blue-300">
                {typeGroup.label}
              </span>
            </label>
            <div className="flex items-center gap-3 text-xs">
              <span className="font-medium tabular-nums text-slate-600 dark:text-slate-400">
                {typeSelectedCount}/{typeGroup.allIds.length}
              </span>
              <button
                type="button"
                onClick={() => selectAllIds(typeGroup.allIds)}
                className="font-semibold text-[#1F3864] hover:underline dark:text-blue-300"
              >
                Seleziona tutti
              </button>
              <button
                type="button"
                onClick={() => deselectAllIds(typeGroup.allIds)}
                className="font-medium text-slate-600 hover:underline dark:text-slate-400"
              >
                Deseleziona tutti
              </button>
            </div>
          </div>

          {/* Sottogruppi per Nucleo Tematico */}
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {typeGroup.nuclei.map((nucleoGroup) => {
              const nucleoIds = nucleoGroup.entries.map((e) => e.id);
              const nucleoSelectedCount = nucleoIds.filter((id) => selectedIds.has(id)).length;
              const nucleoAllSelected =
                nucleoIds.length > 0 && nucleoSelectedCount === nucleoIds.length;
              const nucleoIndeterminate =
                nucleoSelectedCount > 0 && nucleoSelectedCount < nucleoIds.length;

              return (
                <div key={`${keyPrefix}-${typeGroup.tipo}-${nucleoGroup.nucleoTematico}`} className="p-3.5">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-md bg-slate-50 px-2.5 py-1.5 dark:bg-slate-800/60">
                    <label className="flex cursor-pointer items-center gap-2">
                      <GroupCheckbox
                        checked={nucleoAllSelected}
                        indeterminate={nucleoIndeterminate}
                        onChange={() => toggleGroupIds(nucleoIds)}
                        label={`Seleziona o deseleziona nucleo ${nucleoGroup.nucleoTematico}`}
                      />
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Nucleo: {nucleoGroup.nucleoTematico}
                      </span>
                    </label>
                    <div className="flex items-center gap-2.5 text-[11px]">
                      <span className="tabular-nums text-slate-500 dark:text-slate-400">
                        {nucleoSelectedCount}/{nucleoIds.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => selectAllIds(nucleoIds)}
                        className="font-semibold text-[#1F3864] hover:underline dark:text-blue-300"
                      >
                        Seleziona tutti
                      </button>
                      <button
                        type="button"
                        onClick={() => deselectAllIds(nucleoIds)}
                        className="font-medium text-slate-600 hover:underline dark:text-slate-400"
                      >
                        Deseleziona tutti
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 pl-2 sm:pl-6">
                    {nucleoGroup.entries.map((entry) => {
                      const checked = selectedIds.has(entry.id);
                      return (
                        <label
                          key={entry.id}
                          className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition ${
                            checked
                              ? 'border-[#1F3864]/40 bg-blue-50/40 dark:border-blue-700/60 dark:bg-blue-950/20'
                              : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleItem(entry.id)}
                            className="mt-0.5 h-4 w-4 shrink-0 accent-[#1F3864]"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm leading-snug text-slate-800 dark:text-slate-100">
                              {entry.testo}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                              {isCrossClass
                                ? `Provenienza: Classe ${entry.classe}`
                                : `Classe ${entry.classe}`}{' '}
                              · {entry.documentoProvenienza}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      );
    });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-xs sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="curricolo-selector-title"
    >
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex items-start gap-2.5">
            <BookMarked className="mt-0.5 h-5 w-5 shrink-0 text-[#1F3864] dark:text-blue-400" />
            <div>
              <h2
                id="curricolo-selector-title"
                className="text-base font-bold text-slate-900 dark:text-slate-100"
              >
                Catalogo Curricolo Verticale — Scuola Secondaria di I Grado
              </h2>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                Catalogo precaricato da <code>curricolo_secondaria.json</code>.{' '}
                {selectedClasse === 'Prima' && hasCompetenzeOrObiettivi
                  ? 'Per la Classe Prima competenze e obiettivi (formulati al termine della Terza) sono preselezionati in funzione dei contenuti della classe.'
                  : 'Le voci della classe e della versione di Indicazioni selezionate sono già spuntate; quelle delle altre classi sono disponibili in «Da altre classi».'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi catalogo curricolo"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Selettori Disciplina / Classe / Indicazioni Nazionali e Barra Selezione globale */}
        <div className="space-y-3 border-b border-slate-200 bg-slate-50 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Disciplina
              </span>
              <select
                value={selectedDisciplina}
                onChange={(e) => setSelectedDisciplina(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                {disciplineOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Classe di destinazione
              </span>
              <select
                value={selectedClasse}
                onChange={(e) => handleSelectClasse(e.target.value as ClasseSecondaria)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                {CLASSI_SECONDARIA.map((c) => (
                  <option key={c} value={c}>
                    Classe {c}
                    {c === planClasse ? ' (classe corrente del piano)' : ''}
                  </option>
                ))}
              </select>
            </label>

            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Indicazioni Nazionali
                </span>
                {selectedIndicazioni !== recommendedIndicazioni && (
                  <button
                    type="button"
                    onClick={handleResetDefaultIndicazioni}
                    className="text-[11px] font-semibold text-[#1F3864] hover:underline dark:text-blue-300"
                  >
                    Ripristina predefinito
                  </button>
                )}
              </div>
              <select
                aria-label="Indicazioni Nazionali"
                value={selectedIndicazioni}
                onChange={(e) => handleSelectIndicazioni(e.target.value as IndicazioniVersion)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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

          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span
                aria-live="polite"
                className="rounded-md border border-slate-300 bg-white px-2.5 py-1 font-semibold tabular-nums text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                {selectedCount} di {totalCount} selezionati
              </span>
              {otherSelectedCount > 0 && (
                <span className="font-medium text-amber-800 dark:text-amber-300">
                  ({targetSelectedCount} classe {selectedClasse} · {otherSelectedCount} da altre classi)
                </span>
              )}
              {sourcesPresent.length > 0 && (
                <span className="text-slate-600 dark:text-slate-400">
                  Fonte: <strong className="font-semibold">{sourcesPresent.join(' · ')}</strong>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectEntireList}
                disabled={totalCount === 0 || selectedCount === totalCount}
                className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <CheckSquare className="h-3.5 w-3.5" />
                Seleziona tutti
              </button>
              <button
                type="button"
                onClick={deselectEntireList}
                disabled={selectedCount === 0}
                className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Square className="h-3.5 w-3.5" />
                Deseleziona tutti
              </button>
            </div>
          </div>
        </div>

        {/* Lista classe di destinazione + sezione espandibile "Da altre classi" */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {/* Classe di destinazione */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-[#1F3864] dark:text-blue-300">
                Classe di destinazione: Classe {selectedClasse} ({targetSelectedCount} di{' '}
                {targetEntries.length} selezionati)
              </h3>
              {targetEntries.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  {selectedClasse === 'Prima' && hasCompetenzeOrObiettivi && (
                    <button
                      type="button"
                      onClick={() => setSelectedIds(new Set(preselectionResult.selectedIds))}
                      className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
                    >
                      Preseleziona per contenuti Prima ({preselectionResult.selectedIds.size})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => selectAllIds(targetEntries.map((e) => e.id))}
                    className="font-semibold text-[#1F3864] hover:underline dark:text-blue-300"
                  >
                    Seleziona tutti ({selectedClasse})
                  </button>
                  <button
                    type="button"
                    onClick={() => deselectAllIds(targetEntries.map((e) => e.id))}
                    className="font-medium text-slate-600 hover:underline dark:text-slate-400"
                  >
                    Deseleziona tutti ({selectedClasse})
                  </button>
                </div>
              )}
            </div>

            {selectedClasse === 'Prima' && targetEntries.length > 0 && hasCompetenzeOrObiettivi && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-2 text-xs text-slate-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-slate-200">
                <div className="flex items-start gap-2">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1F3864] dark:text-blue-300" />
                  <span>
                    Competenze e obiettivi specifici del curricolo sono espressi <strong>al termine della terza</strong>: per la <strong>Prima</strong> sono preselezionati automaticamente quelli coerenti con{' '}
                    {preselectionResult.usedPlanContents
                      ? 'i contenuti già presenti nel piano della classe'
                      : 'i contenuti (conoscenze) previsti per la Prima'}
                    {' '}({preselectionResult.alignedCompetenceIds.size} competenze e {preselectionResult.alignedObjectiveIds.size} obiettivi).
                  </span>
                </div>
                {hasPlanContentsForCurrentSelection && (
                  <div className="inline-flex rounded-md border border-slate-300 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
                    <button
                      type="button"
                      onClick={() => setContentSourceMode('piano')}
                      className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                        contentSourceMode === 'piano'
                          ? 'bg-[#1F3864] text-white'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      Contenuti del piano
                    </button>
                    <button
                      type="button"
                      onClick={() => setContentSourceMode('catalogo')}
                      className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                        contentSourceMode === 'catalogo'
                          ? 'bg-[#1F3864] text-white'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      Contenuti catalogo Prima
                    </button>
                  </div>
                )}
              </div>
            )}

            {targetGrouped.length === 0 ? (
              <div className="space-y-3 rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
                <p>
                  Nessuna voce presente nel catalogo per <strong>{selectedDisciplina}</strong> —{' '}
                  <strong>Classe {selectedClasse}</strong> in{' '}
                  <strong>{INDICAZIONI_LABELS[selectedIndicazioni]}</strong>.
                </p>
                {alternateTargetCount > 0 && (
                  <button
                    type="button"
                    onClick={() => handleSelectIndicazioni(alternateIndicazioni)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#1F3864] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#172b4d]"
                  >
                    Passa a {INDICAZIONI_LABELS[alternateIndicazioni]} ({alternateTargetCount} voci)
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {renderGroupedSections(targetGrouped, false, `target-${selectedClasse}`)}
              </div>
            )}
          </div>

          {/* Sezione espandibile "Da altre classi" */}
          {otherClassesData.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-slate-300 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-950/40">
              <button
                type="button"
                aria-expanded={otherClassesExpanded}
                onClick={() => setOtherClassesExpanded((v) => !v)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-100/80 dark:hover:bg-slate-800/40"
              >
                <div className="flex items-center gap-2">
                  {otherClassesExpanded ? (
                    <ChevronDown className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                  )}
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Da altre classi
                  </span>
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    ({otherClassesData.map((b) => `Classe ${b.classe}`).join(' · ')} — deselezionate di default)
                  </span>
                </div>
                <span className="font-mono-num text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {otherSelectedCount} selezionati
                </span>
              </button>

              {otherClassesExpanded && (
                <div className="space-y-5 border-t border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                    <Info className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      Le voci importate da altre classi mantengono sempre l’etichetta della classe di provenienza sia nell’editor sia nei documenti DOCX/PDF.
                    </span>
                  </div>

                  {otherClassesData.map((bucket) => {
                    const clsSelectedCount = bucket.ids.filter((id) => selectedIds.has(id)).length;
                    return (
                      <div key={bucket.classe} className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="text-xs font-bold uppercase tracking-wide text-slate-800 dark:text-slate-200">
                            Classe {bucket.classe} ({clsSelectedCount} di {bucket.entries.length}{' '}
                            selezionati)
                          </h4>
                          <div className="flex items-center gap-3 text-xs">
                            <button
                              type="button"
                              onClick={() => selectAllIds(bucket.ids)}
                              className="font-semibold text-[#1F3864] hover:underline dark:text-blue-300"
                            >
                              Seleziona tutti
                            </button>
                            <button
                              type="button"
                              onClick={() => deselectAllIds(bucket.ids)}
                              className="font-medium text-slate-600 hover:underline dark:text-slate-400"
                            >
                              Deseleziona tutti
                            </button>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {renderGroupedSections(bucket.grouped, true, `other-${bucket.classe}`)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-950/60">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Le voci importate sono copie autonome: modificarle o eliminarle non altera il catalogo.
          </p>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="whitespace-nowrap shrink-0 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={selectedCount === 0}
              className="whitespace-nowrap shrink-0 rounded-lg bg-[#1F3864] px-4 py-2 text-xs font-semibold text-white hover:bg-[#172b4d] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Importa selezionati ({selectedCount})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
