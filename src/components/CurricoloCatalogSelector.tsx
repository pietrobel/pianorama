import {
  BookMarked,
  CalendarPlus,
  Check,
  CheckSquare,
  Plus,
  Square,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DISCIPLINE_SECONDARIA } from '../domain/defaults';
import type {
  ClasseSecondaria,
  CurricoloCatalogEntry,
  CurricoloVoiceType,
  IndicazioniVersion,
} from '../domain/types';
import {
  buildCurriculumSheetModel,
  getDefaultIndicazioniForClasseAndYear,
  INDICAZIONI_LABELS,
  resolveCatalogEntriesForCurriculum,
  resolveOtherClassesEntriesForCurriculum,
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
  onImport: (
    selectedEntries: CurricoloCatalogEntry[],
    usedIndicazioni?: IndicazioniVersion
  ) => void;
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

  // Voci selezionate nella scheda (di default TUTTE selezionate)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Voci aggiunte manualmente dentro la scheda ("Aggiungi") o importate da altri anni
  const [customEntries, setCustomEntries] = useState<CurricoloCatalogEntry[]>([]);
  const [extraYearEntries, setExtraYearEntries] = useState<CurricoloCatalogEntry[]>([]);

  // Controllo apertura cassetto "Aggiungi da altri anni"
  const [showOtherYearsDrawer, setShowOtherYearsDrawer] = useState<boolean>(false);
  const [activeOtherClasse, setActiveOtherClasse] = useState<ClasseSecondaria | null>(null);

  // Form inline per il tasto "Aggiungi"
  const [addingCompOpen, setAddingCompOpen] = useState<boolean>(false);
  const [newCompText, setNewCompText] = useState<string>('');

  const [addingCellTarget, setAddingCellTarget] = useState<{
    nucleoKey: string;
    nucleoTematico: string;
    side: 'left' | 'right';
  } | null>(null);
  const [newCellItemText, setNewCellItemText] = useState<string>('');

  const [addingNucleoOpen, setAddingNucleoOpen] = useState<boolean>(false);
  const [newNucleoName, setNewNucleoName] = useState<string>('');
  const [newNucleoLeftText, setNewNucleoLeftText] = useState<string>('');
  const [newNucleoRightText, setNewNucleoRightText] = useState<string>('');

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

  // Voci base del catalogo per classe, disciplina e curricolo selezionato
  const baseEntries = useMemo(
    () =>
      resolveCatalogEntriesForCurriculum(
        catalog,
        selectedClasse,
        selectedDisciplina,
        selectedIndicazioni
      ),
    [catalog, selectedClasse, selectedDisciplina, selectedIndicazioni]
  );

  // Voci delle altre classi riferite SEMPRE allo stesso curricolo selezionato (selectedIndicazioni)
  const otherYearsBuckets = useMemo(
    () =>
      resolveOtherClassesEntriesForCurriculum(
        catalog,
        selectedClasse,
        selectedDisciplina,
        selectedIndicazioni
      ),
    [catalog, selectedClasse, selectedDisciplina, selectedIndicazioni]
  );

  const alternateIndicazioni: IndicazioniVersion =
    selectedIndicazioni === 'nuove' ? 'vecchie' : 'nuove';

  const alternateTargetCount = useMemo(
    () =>
      resolveCatalogEntriesForCurriculum(
        catalog,
        selectedClasse,
        selectedDisciplina,
        alternateIndicazioni
      ).length,
    [catalog, selectedClasse, selectedDisciplina, alternateIndicazioni]
  );

  // Sincronizzazione all'apertura della scheda
  useEffect(() => {
    if (!open) return;
    setSelectedClasse(planClasse);
    setSelectedDisciplina(planDisciplina || 'Italiano');
    setSelectedIndicazioni(
      planIndicazioni ?? getDefaultIndicazioniForClasseAndYear(planClasse, planAnnoScolastico)
    );
    setManualIndicazioniOverride(false);
    setShowOtherYearsDrawer(false);
    setAddingCompOpen(false);
    setAddingCellTarget(null);
    setAddingNucleoOpen(false);
  }, [open, planClasse, planDisciplina, planIndicazioni, planAnnoScolastico]);

  // Al cambio di classe, disciplina o curricolo: carica tutte le voci già preselezionate e azzera aggiunte temporanee incompatibili
  useEffect(() => {
    if (!open) return;
    setCustomEntries([]);
    setExtraYearEntries([]);
    setSelectedIds(new Set(baseEntries.map((e) => e.id)));
    setAddingCellTarget(null);
    setAddingCompOpen(false);
    setAddingNucleoOpen(false);
  }, [open, baseEntries]);

  // Aggiorna tab attiva di "altri anni" se cambia la classe principale
  useEffect(() => {
    if (otherYearsBuckets.length === 0) {
      setActiveOtherClasse(null);
      return;
    }
    if (!activeOtherClasse || !otherYearsBuckets.some((b) => b.classe === activeOtherClasse)) {
      setActiveOtherClasse(otherYearsBuckets[0].classe);
    }
  }, [otherYearsBuckets, activeOtherClasse]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const sheetEntries = useMemo(() => {
    const byId = new Map<string, CurricoloCatalogEntry>();
    for (const item of [...baseEntries, ...extraYearEntries, ...customEntries]) {
      byId.set(item.id, item);
    }
    return Array.from(byId.values());
  }, [baseEntries, extraYearEntries, customEntries]);

  const sheetModel = useMemo(
    () => buildCurriculumSheetModel(sheetEntries, selectedDisciplina, selectedIndicazioni),
    [sheetEntries, selectedDisciplina, selectedIndicazioni]
  );

  const otherActiveBucket = useMemo(
    () => otherYearsBuckets.find((b) => b.classe === activeOtherClasse) ?? otherYearsBuckets[0] ?? null,
    [otherYearsBuckets, activeOtherClasse]
  );

  const otherBucketModel = useMemo(() => {
    if (!otherActiveBucket) return null;
    return buildCurriculumSheetModel(
      otherActiveBucket.entries,
      selectedDisciplina,
      selectedIndicazioni
    );
  }, [otherActiveBucket, selectedDisciplina, selectedIndicazioni]);

  if (!open) return null;

  const leftVoiceType: CurricoloVoiceType =
    selectedIndicazioni === 'nuove' ? 'obiettivo_specifico' : 'abilita';

  const sheetIdsSet = new Set(sheetEntries.map((e) => e.id));
  const selectedCount = sheetEntries.filter((e) => selectedIds.has(e.id)).length;
  const totalCount = sheetEntries.length;

  const compIds = sheetModel.competenze.map((c) => c.id);
  const compSelectedCount = compIds.filter((id) => selectedIds.has(id)).length;
  const compAllSelected = compIds.length > 0 && compSelectedCount === compIds.length;
  const compIndeterminate = compSelectedCount > 0 && compSelectedCount < compIds.length;

  const extraYearsAddedIds = new Set(extraYearEntries.map((e) => e.id));

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

  const toggleItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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

  const toggleGroupIds = (ids: string[]) => {
    const allSelected = ids.length > 0 && ids.every((id) => selectedIds.has(id));
    if (allSelected) deselectAllIds(ids);
    else selectAllIds(ids);
  };

  const handleAddCustomCompetenza = () => {
    const text = newCompText.trim();
    if (!text) return;
    const entry: CurricoloCatalogEntry = {
      id: `custom-comp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      classe: selectedClasse,
      disciplina: selectedDisciplina,
      tipo: 'competenza',
      nucleoTematico: 'Competenze disciplinari',
      testo: text,
      documentoProvenienza:
        selectedIndicazioni === 'nuove'
          ? 'Aggiunta docente (Nuove Indicazioni)'
          : 'Aggiunta docente (Vecchie Indicazioni)',
    };
    setCustomEntries((prev) => [...prev, entry]);
    setSelectedIds((prev) => new Set(prev).add(entry.id));
    setNewCompText('');
    setAddingCompOpen(false);
  };

  const handleAddCustomCellItem = () => {
    if (!addingCellTarget) return;
    const text = newCellItemText.trim();
    if (!text) return;
    const tipo: CurricoloVoiceType =
      addingCellTarget.side === 'left' ? leftVoiceType : 'conoscenza';
    const entry: CurricoloCatalogEntry = {
      id: `custom-cell-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      classe: selectedClasse,
      disciplina: selectedDisciplina,
      tipo,
      nucleoTematico: addingCellTarget.nucleoTematico,
      testo: text,
      documentoProvenienza:
        selectedIndicazioni === 'nuove'
          ? 'Aggiunta docente (Nuove Indicazioni)'
          : 'Aggiunta docente (Vecchie Indicazioni)',
    };
    setCustomEntries((prev) => [...prev, entry]);
    setSelectedIds((prev) => new Set(prev).add(entry.id));
    setNewCellItemText('');
    setAddingCellTarget(null);
  };

  const handleAddCustomNucleo = () => {
    const nucleo = newNucleoName.trim();
    const leftTxt = newNucleoLeftText.trim();
    const rightTxt = newNucleoRightText.trim();
    if (!nucleo || (!leftTxt && !rightTxt)) return;

    const created: CurricoloCatalogEntry[] = [];
    const docSource =
      selectedIndicazioni === 'nuove'
        ? 'Aggiunta docente (Nuove Indicazioni)'
        : 'Aggiunta docente (Vecchie Indicazioni)';

    if (leftTxt) {
      created.push({
        id: `custom-nuc-l-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        classe: selectedClasse,
        disciplina: selectedDisciplina,
        tipo: leftVoiceType,
        nucleoTematico: nucleo,
        testo: leftTxt,
        documentoProvenienza: docSource,
      });
    }
    if (rightTxt) {
      created.push({
        id: `custom-nuc-r-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        classe: selectedClasse,
        disciplina: selectedDisciplina,
        tipo: 'conoscenza',
        nucleoTematico: nucleo,
        testo: rightTxt,
        documentoProvenienza: docSource,
      });
    }

    setCustomEntries((prev) => [...prev, ...created]);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const c of created) next.add(c.id);
      return next;
    });
    setNewNucleoName('');
    setNewNucleoLeftText('');
    setNewNucleoRightText('');
    setAddingNucleoOpen(false);
  };

  const handleIncludeFromOtherYear = (items: CurricoloCatalogEntry[]) => {
    if (items.length === 0) return;
    setExtraYearEntries((prev) => {
      const existing = new Set(prev.map((p) => p.id));
      const additions = items.filter((it) => !existing.has(it.id) && !sheetIdsSet.has(it.id));
      return [...prev, ...additions];
    });
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const it of items) next.add(it.id);
      return next;
    });
  };

  const handleConfirmImport = () => {
    const chosen = sheetEntries.filter((e) => selectedIds.has(e.id));
    if (chosen.length === 0) return;
    onImport(chosen, selectedIndicazioni);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-2 backdrop-blur-xs sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="curricolo-selector-title"
    >
      <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Intestazione Scheda */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-3.5 dark:border-slate-800">
          <div className="flex items-start gap-2.5">
            <BookMarked className="mt-0.5 h-5 w-5 shrink-0 text-[#1F3864] dark:text-blue-400" />
            <div>
              <h2
                id="curricolo-selector-title"
                className="text-base font-bold text-slate-900 dark:text-slate-100"
              >
                Scheda importazione curricolo — Anteprima tabella di output
              </h2>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                Tutte le competenze,{' '}
                {selectedIndicazioni === 'nuove' ? 'gli obiettivi specifici' : 'le abilità'} e le
                conoscenze del curricolo selezionato sono già inserite e spuntate: deseleziona ciò
                che non serve, aggiungi nuove voci o integra da altri anni.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi scheda importazione curricolo"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Barra Selettori & Controlli */}
        <div className="space-y-3 border-b border-slate-200 bg-slate-50 px-5 py-3 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Disciplina
              </span>
              <select
                value={selectedDisciplina}
                onChange={(e) => setSelectedDisciplina(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
                Classe (anno curricolare)
              </span>
              <select
                value={selectedClasse}
                onChange={(e) => handleSelectClasse(e.target.value as ClasseSecondaria)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                {CLASSI_SECONDARIA.map((c) => (
                  <option key={c} value={c}>
                    Classe {c}
                    {c === planClasse ? ' (classe del piano)' : ''}
                  </option>
                ))}
              </select>
            </label>

            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Curricolo di riferimento
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
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="nuove">
                  {INDICAZIONI_LABELS.nuove} (Obiettivi)
                </option>
                <option value="vecchie">
                  {INDICAZIONI_LABELS.vecchie} (Abilità)
                </option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span
                aria-live="polite"
                className="rounded-md border border-slate-300 bg-white px-2.5 py-1 font-semibold tabular-nums text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                {selectedCount} di {totalCount} voci selezionate
              </span>
              {extraYearEntries.length > 0 && (
                <span className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                  +{extraYearEntries.length} da altri anni ({INDICAZIONI_LABELS[selectedIndicazioni]})
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {otherYearsBuckets.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowOtherYearsDrawer((v) => !v)}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                    showOtherYearsDrawer
                      ? 'border-[#1F3864] bg-[#1F3864] text-white'
                      : 'border-[#1F3864] bg-white text-[#1F3864] hover:bg-blue-50 dark:border-blue-400 dark:bg-slate-900 dark:text-blue-300 dark:hover:bg-slate-800'
                  }`}
                >
                  <CalendarPlus className="h-3.5 w-3.5" />
                  {showOtherYearsDrawer
                    ? 'Chiudi aggiunta da altri anni'
                    : `Aggiungi da altri anni (${INDICAZIONI_LABELS[selectedIndicazioni]})`}
                </button>
              )}

              <button
                type="button"
                onClick={() => selectAllIds(sheetEntries.map((e) => e.id))}
                disabled={totalCount === 0 || selectedCount === totalCount}
                className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <CheckSquare className="h-3.5 w-3.5" />
                Seleziona tutto
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                disabled={selectedCount === 0}
                className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <Square className="h-3.5 w-3.5" />
                Deseleziona tutto
              </button>
            </div>
          </div>
        </div>

        {/* Corpo Scheda */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {/* Cassetto opzionale: Aggiungi da altri anni (sempre nello stesso curricolo selezionato!) */}
          {showOtherYearsDrawer && otherYearsBuckets.length > 0 && otherActiveBucket && otherBucketModel && (
            <div className="rounded-xl border-2 border-[#1F3864]/35 bg-blue-50/40 p-4 dark:border-blue-800 dark:bg-blue-950/20">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-[#1F3864] dark:text-blue-300">
                    Aggiungi voci da altri anni · {selectedDisciplina}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Riferimento rigoroso al curricolo selezionato:{' '}
                    <strong>{INDICAZIONI_LABELS[selectedIndicazioni]}</strong> (
                    {selectedIndicazioni === 'nuove' ? 'Obiettivi e Conoscenze' : 'Abilità e Conoscenze'}).
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
                    {otherYearsBuckets.map((bucket) => (
                      <button
                        key={bucket.classe}
                        type="button"
                        onClick={() => setActiveOtherClasse(bucket.classe)}
                        className={`rounded-md px-3 py-1 text-xs font-semibold ${
                          otherActiveBucket.classe === bucket.classe
                            ? 'bg-[#1F3864] text-white'
                            : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300'
                        }`}
                      >
                        Classe {bucket.classe} ({bucket.entries.length})
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowOtherYearsDrawer(false)}
                    className="rounded-lg p-1 text-slate-500 hover:bg-white dark:hover:bg-slate-800"
                    aria-label="Chiudi pannello altri anni"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-3 max-h-72 space-y-3 overflow-y-auto pr-1">
                {otherBucketModel.competenze.length > 0 && (
                  <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase text-[#1F3864] dark:text-blue-300">
                        Competenze attese — Classe {otherActiveBucket.classe}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleIncludeFromOtherYear(otherBucketModel.competenze)}
                        className="text-xs font-semibold text-[#1F3864] hover:underline dark:text-blue-300"
                      >
                        + Aggiungi tutte ({otherBucketModel.competenze.length})
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {otherBucketModel.competenze.map((comp) => {
                        const alreadyAdded = extraYearsAddedIds.has(comp.id) || sheetIdsSet.has(comp.id);
                        return (
                          <div
                            key={comp.id}
                            className="flex items-start justify-between gap-2 rounded border border-slate-100 px-2.5 py-1.5 text-xs dark:border-slate-800"
                          >
                            <span className="text-slate-800 dark:text-slate-200">{comp.testo}</span>
                            <button
                              type="button"
                              disabled={alreadyAdded}
                              onClick={() => handleIncludeFromOtherYear([comp])}
                              className={`shrink-0 rounded px-2 py-0.5 text-[11px] font-semibold ${
                                alreadyAdded
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                  : 'bg-[#1F3864] text-white hover:bg-[#172b4d]'
                              }`}
                            >
                              {alreadyAdded ? 'Aggiunta ✓' : '+ Aggiungi'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {otherBucketModel.rows.map((row) => {
                  const rowAll = [...row.leftItems, ...row.rightItems];
                  return (
                    <div
                      key={`${otherActiveBucket.classe}-${row.nucleoKey}`}
                      className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {row.nucleoTematico} · Classe {otherActiveBucket.classe}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleIncludeFromOtherYear(rowAll)}
                          className="text-xs font-semibold text-[#1F3864] hover:underline dark:text-blue-300"
                        >
                          + Aggiungi tutto il nucleo ({rowAll.length})
                        </button>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        {[
                          { label: otherBucketModel.leftColumnLabel, items: row.leftItems },
                          { label: otherBucketModel.rightColumnLabel, items: row.rightItems },
                        ].map((col) => (
                          <div key={col.label} className="space-y-1.5">
                            <p className="text-[11px] font-bold uppercase text-slate-500">
                              {col.label}
                            </p>
                            {col.items.length === 0 ? (
                              <p className="text-[11px] italic text-slate-400">Nessuna voce</p>
                            ) : (
                              col.items.map((item) => {
                                const alreadyAdded =
                                  extraYearsAddedIds.has(item.id) || sheetIdsSet.has(item.id);
                                return (
                                  <div
                                    key={item.id}
                                    className="flex items-start justify-between gap-2 rounded border border-slate-100 px-2 py-1 text-xs dark:border-slate-800"
                                  >
                                    <span className="text-slate-800 dark:text-slate-200">
                                      {item.testo}
                                    </span>
                                    <button
                                      type="button"
                                      disabled={alreadyAdded}
                                      onClick={() => handleIncludeFromOtherYear([item])}
                                      className={`shrink-0 rounded px-2 py-0.5 text-[11px] font-semibold ${
                                        alreadyAdded
                                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                          : 'bg-[#1F3864] text-white hover:bg-[#172b4d]'
                                      }`}
                                    >
                                      {alreadyAdded ? 'Aggiunta ✓' : '+ Aggiungi'}
                                    </button>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stato vuoto */}
          {sheetEntries.length === 0 ? (
            <div className="space-y-3 rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
              <p>
                Nessuna voce trovata per <strong>{selectedDisciplina}</strong> —{' '}
                <strong>Classe {selectedClasse}</strong> ({INDICAZIONI_LABELS[selectedIndicazioni]}).
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {alternateTargetCount > 0 && (
                  <button
                    type="button"
                    onClick={() => handleSelectIndicazioni(alternateIndicazioni)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#1F3864] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#172b4d]"
                  >
                    Passa a {INDICAZIONI_LABELS[alternateIndicazioni]} ({alternateTargetCount} voci)
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setAddingNucleoOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Aggiungi riga manualmente
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* 1. SEZIONE COMPETENZE ATTESE (in testa come nel documento finale) */}
              <div className="overflow-hidden rounded-xl border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-[#1F3864] px-4 py-2.5 text-white">
                  <label className="flex cursor-pointer items-center gap-2.5">
                    <GroupCheckbox
                      checked={compAllSelected}
                      indeterminate={compIndeterminate}
                      onChange={() => toggleGroupIds(compIds)}
                      label="Seleziona o deseleziona tutte le competenze"
                    />
                    <span className="text-xs font-bold uppercase tracking-wide">
                      Competenze attese (dopo i Traguardi)
                    </span>
                    <span className="font-mono-num text-xs opacity-90">
                      ({compSelectedCount}/{compIds.length})
                    </span>
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAddingCompOpen((v) => !v)}
                      className="inline-flex items-center gap-1 rounded-md bg-white/15 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/25"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Aggiungi competenza
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 p-3 dark:divide-slate-800">
                  {sheetModel.competenze.length === 0 && !addingCompOpen && (
                    <p className="py-2 text-xs italic text-slate-500 dark:text-slate-400">
                      Nessuna competenza specifica presente per questa selezione. Usa «Aggiungi competenza» per inserirne una nuova.
                    </p>
                  )}

                  {sheetModel.competenze.map((comp) => {
                    const checked = selectedIds.has(comp.id);
                    const isOtherClass = comp.classe !== selectedClasse;
                    return (
                      <label
                        key={comp.id}
                        className={`flex cursor-pointer items-start gap-2.5 rounded-md px-2.5 py-2 transition ${
                          checked
                            ? 'hover:bg-blue-50/40 dark:hover:bg-blue-950/20'
                            : 'opacity-55 hover:bg-slate-50 dark:hover:bg-slate-800/30'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleItem(comp.id)}
                          className="mt-0.5 h-4 w-4 shrink-0 accent-[#1F3864]"
                        />
                        <span
                          className={`flex-1 text-sm leading-snug ${
                            checked
                              ? 'text-slate-900 dark:text-slate-100'
                              : 'line-through text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {comp.testo}
                        </span>
                        {isOtherClass && (
                          <span className="shrink-0 rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                            Da {comp.classe}
                          </span>
                        )}
                      </label>
                    );
                  })}

                  {addingCompOpen && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 pt-2">
                      <input
                        type="text"
                        value={newCompText}
                        onChange={(e) => setNewCompText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomCompetenza();
                          }
                        }}
                        placeholder="Scrivi una nuova competenza attesa..."
                        autoFocus
                        className="min-w-[240px] flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomCompetenza}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#1F3864] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#172b4d]"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Aggiungi
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAddingCompOpen(false);
                          setNewCompText('');
                        }}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                      >
                        Annulla
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. TABELLA A 2 COLONNE IDENTICA A QUELLA DI OUTPUT */}
              <div className="overflow-hidden rounded-xl border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="bg-[#1F3864] text-white">
                      <th className="w-1/2 border-b border-r border-white/20 px-4 py-2.5 text-xs font-bold uppercase tracking-wide">
                        {sheetModel.leftColumnLabel}
                      </th>
                      <th className="w-1/2 border-b border-white/20 px-4 py-2.5 text-xs font-bold uppercase tracking-wide">
                        {sheetModel.rightColumnLabel}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sheetModel.rows.map((row) => {
                      const rowIds = [
                        ...row.leftItems.map((i) => i.id),
                        ...row.rightItems.map((i) => i.id),
                      ];
                      const rowSelected = rowIds.filter((id) => selectedIds.has(id)).length;
                      const rowAllSelected = rowIds.length > 0 && rowSelected === rowIds.length;
                      const rowIndeterminate = rowSelected > 0 && rowSelected < rowIds.length;

                      return (
                        <FragmentRow
                          key={row.nucleoKey}
                          row={row}
                          selectedIds={selectedIds}
                          selectedClasse={selectedClasse}
                          rowAllSelected={rowAllSelected}
                          rowIndeterminate={rowIndeterminate}
                          rowSelectedCount={rowSelected}
                          rowTotalCount={rowIds.length}
                          leftLabel={
                            selectedIndicazioni === 'nuove' ? 'obiettivo' : 'abilità'
                          }
                          onToggleGroup={() => toggleGroupIds(rowIds)}
                          onToggleItem={toggleItem}
                          addingCellTarget={addingCellTarget}
                          newCellItemText={newCellItemText}
                          onStartAddCell={(side) => {
                            setAddingCellTarget({
                              nucleoKey: row.nucleoKey,
                              nucleoTematico: row.nucleoTematico,
                              side,
                            });
                            setNewCellItemText('');
                          }}
                          onChangeNewCellText={setNewCellItemText}
                          onConfirmAddCell={handleAddCustomCellItem}
                          onCancelAddCell={() => {
                            setAddingCellTarget(null);
                            setNewCellItemText('');
                          }}
                        />
                      );
                    })}
                  </tbody>
                </table>

                {/* Aggiunta nuovo nucleo nella tabella */}
                <div className="border-t border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/50">
                  {!addingNucleoOpen ? (
                    <button
                      type="button"
                      onClick={() => setAddingNucleoOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#1F3864] bg-white px-3 py-1.5 text-xs font-semibold text-[#1F3864] hover:bg-blue-50 dark:border-blue-400 dark:bg-slate-900 dark:text-blue-300"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Aggiungi nuovo nucleo / argomento alla tabella
                    </button>
                  ) : (
                    <div className="space-y-2.5 rounded-lg border border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                      <p className="text-xs font-bold text-[#1F3864] dark:text-blue-300">
                        Nuovo nucleo tematico nella tabella di programma
                      </p>
                      <div className="grid gap-2 md:grid-cols-3">
                        <input
                          type="text"
                          value={newNucleoName}
                          onChange={(e) => setNewNucleoName(e.target.value)}
                          placeholder="Nome nucleo tematico (es. Numeri, Lettura...)"
                          className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
                        />
                        <input
                          type="text"
                          value={newNucleoLeftText}
                          onChange={(e) => setNewNucleoLeftText(e.target.value)}
                          placeholder={
                            selectedIndicazioni === 'nuove'
                              ? 'Primo obiettivo specifico...'
                              : 'Prima abilità...'
                          }
                          className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
                        />
                        <input
                          type="text"
                          value={newNucleoRightText}
                          onChange={(e) => setNewNucleoRightText(e.target.value)}
                          placeholder="Prima conoscenza / contenuto..."
                          className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleAddCustomNucleo}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#1F3864] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#172b4d]"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Aggiungi alla scheda
                        </button>
                        <button
                          type="button"
                          onClick={() => setAddingNucleoOpen(false)}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                        >
                          Annulla
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-950/60">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Le voci importate vengono inserite direttamente nelle competenze e nella tabella a 2 colonne della programmazione.
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
              Conferma e importa nella programmazione ({selectedCount})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface FragmentRowProps {
  row: {
    nucleoKey: string;
    nucleoTematico: string;
    leftItems: CurricoloCatalogEntry[];
    rightItems: CurricoloCatalogEntry[];
  };
  selectedIds: Set<string>;
  selectedClasse: ClasseSecondaria;
  rowAllSelected: boolean;
  rowIndeterminate: boolean;
  rowSelectedCount: number;
  rowTotalCount: number;
  leftLabel: string;
  onToggleGroup: () => void;
  onToggleItem: (id: string) => void;
  addingCellTarget: {
    nucleoKey: string;
    nucleoTematico: string;
    side: 'left' | 'right';
  } | null;
  newCellItemText: string;
  onStartAddCell: (side: 'left' | 'right') => void;
  onChangeNewCellText: (val: string) => void;
  onConfirmAddCell: () => void;
  onCancelAddCell: () => void;
}

function FragmentRow({
  row,
  selectedIds,
  selectedClasse,
  rowAllSelected,
  rowIndeterminate,
  rowSelectedCount,
  rowTotalCount,
  leftLabel,
  onToggleGroup,
  onToggleItem,
  addingCellTarget,
  newCellItemText,
  onStartAddCell,
  onChangeNewCellText,
  onConfirmAddCell,
  onCancelAddCell,
}: FragmentRowProps) {
  const isAddingLeft =
    addingCellTarget?.nucleoKey === row.nucleoKey && addingCellTarget.side === 'left';
  const isAddingRight =
    addingCellTarget?.nucleoKey === row.nucleoKey && addingCellTarget.side === 'right';

  return (
    <>
      <tr className="border-t border-slate-300 bg-slate-100/90 dark:border-slate-700 dark:bg-slate-800/70">
        <td colSpan={2} className="px-4 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex cursor-pointer items-center gap-2">
              <GroupCheckbox
                checked={rowAllSelected}
                indeterminate={rowIndeterminate}
                onChange={onToggleGroup}
                label={`Seleziona o deseleziona nucleo ${row.nucleoTematico}`}
              />
              <span className="text-xs font-bold text-[#1F3864] dark:text-blue-300">
                Nucleo: {row.nucleoTematico}
              </span>
            </label>
            <span className="font-mono-num text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              {rowSelectedCount}/{rowTotalCount} selezionati
            </span>
          </div>
        </td>
      </tr>
      <tr className="border-t border-slate-200 dark:border-slate-800">
        {/* Colonna Sinistra: Obiettivi oppure Abilità */}
        <td className="w-1/2 border-r border-slate-200 p-3 align-top dark:border-slate-800">
          <div className="space-y-1.5">
            {row.leftItems.map((item) => {
              const checked = selectedIds.has(item.id);
              const isOtherClass = item.classe !== selectedClasse;
              return (
                <label
                  key={item.id}
                  className={`flex cursor-pointer items-start gap-2 rounded-md p-1.5 transition ${
                    checked
                      ? 'hover:bg-blue-50/40 dark:hover:bg-blue-950/20'
                      : 'opacity-55 hover:bg-slate-50 dark:hover:bg-slate-800/30'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleItem(item.id)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[#1F3864]"
                  />
                  <span
                    className={`flex-1 text-xs leading-relaxed sm:text-[13px] ${
                      checked
                        ? 'text-slate-900 dark:text-slate-100'
                        : 'line-through text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {item.testo}
                  </span>
                  {isOtherClass && (
                    <span className="shrink-0 rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                      Da {item.classe}
                    </span>
                  )}
                </label>
              );
            })}

            {isAddingLeft ? (
              <div className="mt-2 space-y-1.5 rounded-md border border-slate-300 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-950">
                <input
                  type="text"
                  value={newCellItemText}
                  onChange={(e) => onChangeNewCellText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      onConfirmAddCell();
                    }
                  }}
                  placeholder={`Nuovo ${leftLabel} in ${row.nucleoTematico}...`}
                  autoFocus
                  className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
                />
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={onConfirmAddCell}
                    className="rounded bg-[#1F3864] px-2.5 py-1 text-[11px] font-semibold text-white"
                  >
                    Aggiungi
                  </button>
                  <button
                    type="button"
                    onClick={onCancelAddCell}
                    className="rounded border border-slate-300 px-2 py-1 text-[11px] text-slate-600 dark:border-slate-700 dark:text-slate-300"
                  >
                    Annulla
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onStartAddCell('left')}
                className="mt-1 inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold text-[#1F3864] hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-slate-800"
              >
                <Plus className="h-3 w-3" />
                Aggiungi {leftLabel}
              </button>
            )}
          </div>
        </td>

        {/* Colonna Destra: Conoscenze / Contenuti */}
        <td className="w-1/2 p-3 align-top">
          <div className="space-y-1.5">
            {row.rightItems.map((item) => {
              const checked = selectedIds.has(item.id);
              const isOtherClass = item.classe !== selectedClasse;
              return (
                <label
                  key={item.id}
                  className={`flex cursor-pointer items-start gap-2 rounded-md p-1.5 transition ${
                    checked
                      ? 'hover:bg-blue-50/40 dark:hover:bg-blue-950/20'
                      : 'opacity-55 hover:bg-slate-50 dark:hover:bg-slate-800/30'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleItem(item.id)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[#1F3864]"
                  />
                  <span
                    className={`flex-1 text-xs leading-relaxed sm:text-[13px] ${
                      checked
                        ? 'text-slate-900 dark:text-slate-100'
                        : 'line-through text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {item.testo}
                  </span>
                  {isOtherClass && (
                    <span className="shrink-0 rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                      Da {item.classe}
                    </span>
                  )}
                </label>
              );
            })}

            {isAddingRight ? (
              <div className="mt-2 space-y-1.5 rounded-md border border-slate-300 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-950">
                <input
                  type="text"
                  value={newCellItemText}
                  onChange={(e) => onChangeNewCellText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      onConfirmAddCell();
                    }
                  }}
                  placeholder={`Nuova conoscenza in ${row.nucleoTematico}...`}
                  autoFocus
                  className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
                />
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={onConfirmAddCell}
                    className="rounded bg-[#1F3864] px-2.5 py-1 text-[11px] font-semibold text-white"
                  >
                    Aggiungi
                  </button>
                  <button
                    type="button"
                    onClick={onCancelAddCell}
                    className="rounded border border-slate-300 px-2 py-1 text-[11px] text-slate-600 dark:border-slate-700 dark:text-slate-300"
                  >
                    Annulla
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onStartAddCell('right')}
                className="mt-1 inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold text-[#1F3864] hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-slate-800"
              >
                <Plus className="h-3 w-3" />
                Aggiungi conoscenza
              </button>
            )}
          </div>
        </td>
      </tr>
    </>
  );
}
