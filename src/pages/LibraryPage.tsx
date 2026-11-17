import {
  Archive,
  BookMarked,
  BookOpen,
  Copy,
  Download,
  Edit3,
  Plus,
  RotateCcw,
  Search,
  Upload,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { ConfirmModal } from '../components/ConfirmModal';
import { DISCIPLINE_SECONDARIA } from '../domain/defaults';
import type {
  ClasseSecondaria,
  CurricoloCatalogEntry,
  CurricoloVoiceType,
  LibraryCategory,
  LibraryItem,
} from '../domain/types';
import {
  computeCatalogDiff,
  CURRICOLO_TYPE_LABELS,
  CURRICOLO_TYPE_ORDER,
  validateCatalogJsonPayload,
  type CatalogDiffSummary,
} from '../engine/curricoloCatalogEngine';

interface LibraryPageProps {
  items: LibraryItem[];
  curricoloCatalog: CurricoloCatalogEntry[];
  onSaveItem: (item: LibraryItem) => Promise<void>;
  onBulkImport: (items: LibraryItem[]) => Promise<void>;
  onReplaceCurricoloCatalog: (items: CurricoloCatalogEntry[]) => Promise<void>;
  onResetCurricoloCatalog: () => Promise<void>;
}

const CATEGORY_LABELS: Record<LibraryCategory, string> = {
  traguardo: 'Traguardo di competenza',
  obiettivo: 'Obiettivo / DigComp 2.2',
  abilita: 'Abilità (con conoscenza)',
  conoscenza: 'Conoscenza disciplinare',
  strategia_potenziamento: 'Strategia di potenziamento',
  strategia_consolidamento: 'Strategia di consolidamento',
  strategia_recupero: 'Strategia di recupero',
  metodologia: 'Metodologia didattica',
  strumento: 'Strumento / Sussidio',
  verifica_scritta: 'Verifica scritta',
  verifica_orale: 'Verifica orale',
  criterio_valutazione: 'Criterio di valutazione',
  attivita: 'Attività / Compito di realtà',
};

export function LibraryPage({
  items,
  curricoloCatalog,
  onSaveItem,
  onBulkImport,
  onReplaceCurricoloCatalog,
  onResetCurricoloCatalog,
}: LibraryPageProps) {
  const [activeTab, setActiveTab] = useState<'libreria' | 'catalogo'>('libreria');

  // Stato Libreria contenuti
  const [search, setSearch] = useState('');
  const [filterDisc, setFilterDisc] = useState('tutte');
  const [filterCat, setFilterCat] = useState<string>('tutte');
  const [showArchived, setShowArchived] = useState(false);

  const [editing, setEditing] = useState<LibraryItem | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stato Catalogo Curricolo Verticale
  const [catSearch, setCatSearch] = useState('');
  const [catFilterClasse, setCatFilterClasse] = useState<'tutte' | ClasseSecondaria>('tutte');
  const [catFilterDisc, setCatFilterDisc] = useState('tutte');
  const [catFilterTipo, setCatFilterTipo] = useState<'tutti' | CurricoloVoiceType>('tutti');
  const catalogFileInputRef = useRef<HTMLInputElement>(null);

  const [pendingCatalogImport, setPendingCatalogImport] = useState<{
    entries: CurricoloCatalogEntry[];
    diff: CatalogDiffSummary;
    filename: string;
  } | null>(null);
  const [confirmResetCatalogOpen, setConfirmResetCatalogOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (!showArchived && it.archiviato) return false;
      if (showArchived && !it.archiviato) return false;
      if (filterDisc !== 'tutte' && it.disciplina !== filterDisc) return false;
      if (filterCat !== 'tutte' && it.categoria !== filterCat) return false;
      if (q) {
        const hay = [it.titolo, it.testo, it.testoCollegato || '', it.disciplina, ...it.tag]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, search, filterDisc, filterCat, showArchived]);

  const filteredCatalog = useMemo(() => {
    const q = catSearch.trim().toLowerCase();
    return curricoloCatalog.filter((entry) => {
      if (catFilterClasse !== 'tutte' && entry.classe !== catFilterClasse) return false;
      if (catFilterDisc !== 'tutte' && entry.disciplina !== catFilterDisc) return false;
      if (catFilterTipo !== 'tutti' && entry.tipo !== catFilterTipo) return false;
      if (q) {
        const hay = [
          entry.disciplina,
          entry.classe,
          entry.nucleoTematico,
          entry.testo,
          entry.documentoProvenienza,
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [curricoloCatalog, catSearch, catFilterClasse, catFilterDisc, catFilterTipo]);

  const startNewItem = () => {
    const now = new Date().toISOString();
    setEditing({
      id: crypto.randomUUID(),
      categoria: 'abilita',
      disciplina: 'Italiano',
      classe: 'Prima',
      titolo: '',
      testo: '',
      testoCollegato: '',
      tag: [],
      archiviato: false,
      createdAt: now,
      updatedAt: now,
    });
  };

  const handleSaveEditing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setErrorMessage(null);
    try {
      await onSaveItem(editing);
      setEditing(null);
      setStatusMessage('Voce salvata nella libreria locale.');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Errore nel salvataggio.');
    }
  };

  const handleDuplicate = async (item: LibraryItem) => {
    const now = new Date().toISOString();
    await onSaveItem({
      ...item,
      id: crypto.randomUUID(),
      titolo: `${item.titolo} (copia)`,
      isDefault: false,
      archiviato: false,
      createdAt: now,
      updatedAt: now,
    });
    setStatusMessage('Voce duplicata.');
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pianorama_libreria_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatusMessage('Libreria esportata in formato JSON.');
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        throw new Error('Il file JSON deve contenere un array di voci della libreria.');
      }
      const validItems: LibraryItem[] = parsed.map((raw) => ({
        id: String(raw.id || crypto.randomUUID()),
        categoria: raw.categoria || 'obiettivo',
        disciplina: String(raw.disciplina || 'Tutte'),
        classe: raw.classe || 'Tutte',
        titolo: String(raw.titolo || 'Voce importata'),
        testo: String(raw.testo || ''),
        testoCollegato: raw.testoCollegato ? String(raw.testoCollegato) : '',
        tag: Array.isArray(raw.tag) ? raw.tag.map(String) : [],
        archiviato: Boolean(raw.archiviato),
        createdAt: raw.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      await onBulkImport(validItems);
      setStatusMessage(`Importate ${validItems.length} voci nella libreria locale.`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'File JSON non valido.');
    } finally {
      e.target.value = '';
    }
  };

  const handleExportCatalogJson = () => {
    const blob = new Blob([JSON.stringify(curricoloCatalog, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pianorama_catalogo_curricolo_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatusMessage('Catalogo Curricolo Verticale esportato in JSON (zero dati alunni).');
  };

  const handleSelectCatalogJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const text = await file.text();
      const nextEntries = validateCatalogJsonPayload(text);
      const diff = computeCatalogDiff(curricoloCatalog, nextEntries);
      setPendingCatalogImport({
        entries: nextEntries,
        diff,
        filename: file.name,
      });
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'File JSON del catalogo curricolo non valido.'
      );
    } finally {
      e.target.value = '';
    }
  };

  const handleConfirmReplaceCatalog = async () => {
    if (!pendingCatalogImport) return;
    try {
      await onReplaceCurricoloCatalog(pendingCatalogImport.entries);
      setStatusMessage(
        `Catalogo Curricolo Verticale aggiornato (${pendingCatalogImport.entries.length} voci totali: +${pendingCatalogImport.diff.addedCount} aggiunte, ${pendingCatalogImport.diff.modifiedCount} modificate, -${pendingCatalogImport.diff.removedCount} rimosse).`
      );
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Errore durante la sostituzione del catalogo.');
    } finally {
      setPendingCatalogImport(null);
    }
  };

  const handleConfirmResetCatalog = async () => {
    try {
      await onResetCurricoloCatalog();
      setStatusMessage('Ripristinato il catalogo Curricolo Verticale predefinito d’istituto.');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Errore nel ripristino del catalogo.');
    } finally {
      setConfirmResetCatalogOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Libreria e Catalogo Curricolo Verticale
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Archivio offline di contenuti didattici e catalogo ufficiale strutturato della Scuola Secondaria di I Grado
          </p>
        </div>

        {/* Schede principali */}
        <div
          role="tablist"
          aria-label="Sezioni libreria e catalogo"
          className="inline-flex rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'libreria'}
            onClick={() => setActiveTab('libreria')}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === 'libreria'
                ? 'bg-[#1F3864] text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Libreria contenuti ({items.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'catalogo'}
            onClick={() => setActiveTab('catalogo')}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === 'catalogo'
                ? 'bg-[#1F3864] text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            <BookMarked className="h-3.5 w-3.5" />
            Catalogo Curricolo ({curricoloCatalog.length})
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
        >
          {statusMessage}
        </div>
      )}
      {errorMessage && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
        >
          {errorMessage}
        </div>
      )}

      {activeTab === 'libreria' ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleImportJson}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <Upload className="h-3.5 w-3.5" />
              Importa JSON
            </button>
            <button
              type="button"
              onClick={handleExportJson}
              className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <Download className="h-3.5 w-3.5" />
              Esporta JSON
            </button>
            <button
              type="button"
              onClick={startNewItem}
              className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg bg-[#1F3864] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#172b4d]"
            >
              <Plus className="h-3.5 w-3.5" />
              Nuova voce
            </button>
          </div>

          {/* Editor inline di voce */}
          {editing && (
            <form
              onSubmit={handleSaveEditing}
              className="space-y-4 rounded-xl border border-[#1F3864]/40 bg-white p-5 dark:border-blue-800 dark:bg-slate-900"
            >
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {editing.titolo ? `Modifica: ${editing.titolo}` : 'Nuova voce in libreria'}
              </h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Categoria
                  </span>
                  <select
                    value={editing.categoria}
                    onChange={(e) =>
                      setEditing({ ...editing, categoria: e.target.value as LibraryCategory })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([k, lbl]) => (
                      <option key={k} value={k}>
                        {lbl}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Disciplina
                  </span>
                  <select
                    value={editing.disciplina}
                    onChange={(e) => setEditing({ ...editing, disciplina: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  >
                    <option value="Tutte">Tutte le discipline</option>
                    {DISCIPLINE_SECONDARIA.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Classe
                  </span>
                  <select
                    value={editing.classe}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        classe: e.target.value as ClasseSecondaria | 'Tutte',
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  >
                    <option value="Tutte">Tutte le classi</option>
                    <option value="Prima">Prima</option>
                    <option value="Seconda">Seconda</option>
                    <option value="Terza">Terza</option>
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Titolo
                </span>
                <input
                  type="text"
                  required
                  value={editing.titolo}
                  onChange={(e) => setEditing({ ...editing, titolo: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Testo principale (abilità, obiettivo, strategia o attività)
                </span>
                <textarea
                  required
                  rows={3}
                  value={editing.testo}
                  onChange={(e) => setEditing({ ...editing, testo: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Conoscenze collegate (facoltativo, usato per la tabella Abilità / Conoscenze)
                </span>
                <textarea
                  rows={2}
                  value={editing.testoCollegato || ''}
                  onChange={(e) => setEditing({ ...editing, testoCollegato: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"
                />
              </label>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#1F3864] px-4 py-2 text-xs font-semibold text-white hover:bg-[#172b4d]"
                >
                  Salva nella libreria
                </button>
              </div>
            </form>
          )}

          {/* Filtri libreria */}
          <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="relative sm:col-span-2">
              <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ricerca locale per parola chiave o tag..."
                className="w-full rounded-lg border border-slate-300 py-2 pr-3 pl-9 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
            </div>
            <select
              value={filterDisc}
              onChange={(e) => setFilterDisc(e.target.value)}
              aria-label="Filtra per disciplina"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="tutte">Tutte le discipline</option>
              <option value="Tutte">Trasversali (Tutte)</option>
              {DISCIPLINE_SECONDARIA.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <select
                value={filterCat}
                onChange={(e) => setFilterCat(e.target.value)}
                aria-label="Filtra per categoria"
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="tutte">Tutte le categorie</option>
                {Object.entries(CATEGORY_LABELS).map(([k, lbl]) => (
                  <option key={k} value={k}>
                    {lbl}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowArchived((v) => !v)}
                className={`whitespace-nowrap shrink-0 rounded-lg border px-2.5 py-2 text-xs font-medium ${
                  showArchived
                    ? 'border-[#1F3864] bg-[#1F3864] text-white'
                    : 'border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300'
                }`}
              >
                {showArchived ? 'Archiviate' : 'Attive'}
              </button>
            </div>
          </div>

          {/* Elenco voci libreria */}
          <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
            {filtered.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">
                Nessuna voce trovata con i filtri attuali.
              </p>
            ) : (
              filtered.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-[#1F3864] dark:text-blue-300">
                        {item.disciplina}
                      </span>
                      <span>·</span>
                      <span>Classe {item.classe}</span>
                      <span>·</span>
                      <span>{CATEGORY_LABELS[item.categoria]}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {item.titolo}
                    </h3>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{item.testo}</p>
                    {item.testoCollegato && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        <strong>Conoscenze:</strong> {item.testoCollegato}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditing(item)}
                      title="Modifica voce"
                      className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicate(item)}
                      title="Duplica voce"
                      className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onSaveItem({ ...item, archiviato: !item.archiviato })}
                      title={item.archiviato ? 'Ripristina voce' : 'Archivia voce'}
                      className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      {item.archiviato ? (
                        <RotateCcw className="h-4 w-4" />
                      ) : (
                        <Archive className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Barra informativa e azioni catalogo */}
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
            <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                Fonti ufficiali integrate per la Scuola Secondaria di I Grado (zero dati alunni)
              </p>
              <p>
                <strong>Classe Prima:</strong> Curricolo verticale nuovo ·{' '}
                <strong>Classi Seconda e Terza:</strong> Curricolo verticale vecchio (A.S. 2025/2026) e nuclei aggiornati di Educazione Civica / Latino (LEL).
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <input
                ref={catalogFileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleSelectCatalogJsonFile}
                className="hidden"
              />
              <button
                type="button"
                onClick={handleExportCatalogJson}
                className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <Download className="h-3.5 w-3.5" />
                Esporta catalogo JSON
              </button>
              <button
                type="button"
                onClick={() => catalogFileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg bg-[#1F3864] px-3 py-2 text-xs font-semibold text-white hover:bg-[#172b4d]"
              >
                <Upload className="h-3.5 w-3.5" />
                Importa catalogo JSON
              </button>
              <button
                type="button"
                onClick={() => setConfirmResetCatalogOpen(true)}
                className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Ripristina predefinito
              </button>
            </div>
          </div>

          {/* Filtri catalogo */}
          <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="relative">
              <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
              <input
                type="search"
                value={catSearch}
                onChange={(e) => setCatSearch(e.target.value)}
                placeholder="Cerca nel catalogo..."
                className="w-full rounded-lg border border-slate-300 py-2 pr-3 pl-9 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
            </div>

            <select
              value={catFilterClasse}
              onChange={(e) => setCatFilterClasse(e.target.value as 'tutte' | ClasseSecondaria)}
              aria-label="Filtra catalogo per classe"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="tutte">Tutte le classi (1ª, 2ª, 3ª)</option>
              <option value="Prima">Classe Prima</option>
              <option value="Seconda">Classe Seconda</option>
              <option value="Terza">Classe Terza</option>
            </select>

            <select
              value={catFilterDisc}
              onChange={(e) => setCatFilterDisc(e.target.value)}
              aria-label="Filtra catalogo per disciplina"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="tutte">Tutte le discipline</option>
              {DISCIPLINE_SECONDARIA.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <select
              value={catFilterTipo}
              onChange={(e) => setCatFilterTipo(e.target.value as 'tutti' | CurricoloVoiceType)}
              aria-label="Filtra catalogo per tipologia"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="tutti">Tutte le tipologie</option>
              {CURRICOLO_TYPE_ORDER.map((t) => (
                <option key={t} value={t}>
                  {CURRICOLO_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          {/* Lista voci catalogo */}
          <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
            {filteredCatalog.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">
                Nessuna voce del catalogo corrisponde ai filtri selezionati.
              </p>
            ) : (
              filteredCatalog.map((entry) => (
                <div key={entry.id} className="space-y-1 p-4">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-[#1F3864] dark:text-blue-300">
                      {entry.disciplina}
                    </span>
                    <span>·</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      Classe {entry.classe}
                    </span>
                    <span>·</span>
                    <span>{CURRICOLO_TYPE_LABELS[entry.tipo]}</span>
                    {entry.nucleoTematico && (
                      <>
                        <span>·</span>
                        <span>Nucleo: {entry.nucleoTematico}</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm leading-snug text-slate-800 dark:text-slate-100">
                    {entry.testo}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    ID: {entry.id} · Fonte: {entry.documentoProvenienza}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Conferma sostituzione catalogo JSON con riepilogo diff */}
      <ConfirmModal
        open={pendingCatalogImport !== null}
        title="Conferma aggiornamento Catalogo Curricolo Verticale"
        description={
          pendingCatalogImport
            ? `File: "${pendingCatalogImport.filename}" (${pendingCatalogImport.entries.length} voci totali, nessun dato alunni). Riepilogo rispetto al catalogo attuale — Aggiunte: ${pendingCatalogImport.diff.addedCount} · Modificate: ${pendingCatalogImport.diff.modifiedCount} · Rimosse: ${pendingCatalogImport.diff.removedCount} · Invariate: ${pendingCatalogImport.diff.unchangedCount}. Le voci già importate nelle programmazioni esistenti restano copie autonome.`
            : ''
        }
        confirmLabel="Sostituisci catalogo"
        onConfirm={handleConfirmReplaceCatalog}
        onCancel={() => setPendingCatalogImport(null)}
      />

      {/* Conferma ripristino catalogo predefinito */}
      <ConfirmModal
        open={confirmResetCatalogOpen}
        title="Ripristinare il catalogo predefinito d’istituto?"
        description="Verrà ripristinato il catalogo originale incluso nell’app (Prima: Curricolo verticale nuovo; Seconda/Terza: Curricolo verticale vecchio A.S. 2025/2026). Le voci già importate nelle programmazioni non verranno toccate."
        confirmLabel="Ripristina predefinito"
        onConfirm={handleConfirmResetCatalog}
        onCancel={() => setConfirmResetCatalogOpen(false)}
      />
    </div>
  );
}
