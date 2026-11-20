import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  FileDown,
  GripVertical,
  Lock,
  Plus,
  RotateCcw,
  Trash2,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { ConfirmModal } from './ConfirmModal';
import type {
  AnonymousStudentBandEntry,
  CategoriaBisognoAlunno,
  DocumentLayoutStyle,
  FasciaLivelloKey,
  LivelliPartenza,
  RiferimentoPianoAlunno,
  SoglieFasce,
} from '../domain/types';
import {
  copyLivelliTableToClipboard,
  downloadLivelliTableDocx,
} from '../export/livelliTableExport';
import {
  computeLivelliFromStudents,
  createManualStudentEntry,
  extractRegisterOrderAndCleanName,
  moveStudentToFascia,
  parseItalianDecimal,
  removeStudentFromFasce,
  restoreAutomaticFasce,
  updateStudentDetails,
} from '../engine/gradebookImporter';

interface FasceLivelloBoardProps {
  entries: AnonymousStudentBandEntry[];
  soglie: SoglieFasce;
  classeRilevata?: string;
  tableExportContext?: {
    livelliOverride?: LivelliPartenza;
    classeLabel?: string;
    layoutDocumento?: DocumentLayoutStyle;
  };
  onChangeEntries: (next: AnonymousStudentBandEntry[]) => void;
  onSyncComposizione?: (
    totaleAlunni: number,
    totaleBes: number,
    totaleDisabilita?: number
  ) => void;
}

const BAND_ORDER: FasciaLivelloKey[] = [
  'basso',
  'medio_basso',
  'medio',
  'alto',
  'da_verificare',
];

const CATEGORIA_OPTIONS: { value: CategoriaBisognoAlunno; label: string; badge?: string }[] = [
  { value: 'nessuno', label: 'Nessuna segnalazione' },
  { value: 'bes', label: 'BES (Bisogni Educativi Speciali)', badge: 'BES' },
  { value: 'dsa', label: 'DSA (Disturbi Specifici Apprendimento)', badge: 'DSA' },
  { value: 'disabilita_pei', label: 'Disabilità / Sostegno', badge: 'PEI' },
  { value: 'svantaggio_altro', label: 'Svantaggio linguistico / altro', badge: 'BES' },
];

const PIANO_OPTIONS: { value: RiferimentoPianoAlunno; label: string }[] = [
  { value: '', label: 'Nessun piano specifico' },
  { value: 'PDP', label: 'PDP (Piano Didattico Personalizzato)' },
  { value: 'PEI', label: 'PEI (Piano Educativo Individualizzato)' },
  { value: 'Osservazione', label: 'Osservazione didattica interna' },
];

function getBandMeta(
  key: FasciaLivelloKey,
  soglie: SoglieFasce
): { title: string; subtitle: string; headerClass: string; borderClass: string } {
  const fmt = (n: number) => String(n).replace('.', ',');
  switch (key) {
    case 'basso':
      return {
        title: 'Fascia 4-5 · Basso',
        subtitle: `Media < ${fmt(soglie.sogliaMedioBasso)}`,
        headerClass: 'text-red-800 dark:text-red-300',
        borderClass: 'border-red-200 dark:border-red-900/60',
      };
    case 'medio_basso':
      return {
        title: 'Fascia 6 · Medio/basso',
        subtitle: `${fmt(soglie.sogliaMedioBasso)} – < ${fmt(soglie.sogliaMedio)}`,
        headerClass: 'text-amber-800 dark:text-amber-300',
        borderClass: 'border-amber-200 dark:border-amber-900/60',
      };
    case 'medio':
      return {
        title: 'Fascia 7-8 · Medio',
        subtitle: `${fmt(soglie.sogliaMedio)} – < ${fmt(soglie.sogliaAlto)}`,
        headerClass: 'text-[#1F3864] dark:text-blue-300',
        borderClass: 'border-blue-200 dark:border-blue-900/60',
      };
    case 'alto':
      return {
        title: 'Fascia 9-10 · Alto',
        subtitle: `Media ≥ ${fmt(soglie.sogliaAlto)}`,
        headerClass: 'text-emerald-800 dark:text-emerald-300',
        borderClass: 'border-emerald-200 dark:border-emerald-900/60',
      };
    case 'da_verificare':
      return {
        title: 'Da verificare',
        subtitle: `Media n.d. o < ${fmt(soglie.sogliaMinimaValida)}`,
        headerClass: 'text-slate-700 dark:text-slate-300',
        borderClass: 'border-slate-300 dark:border-slate-700',
      };
  }
}

export function FasceLivelloBoard({
  entries,
  soglie,
  classeRilevata,
  tableExportContext,
  onChangeEntries,
  onSyncComposizione,
}: FasceLivelloBoardProps) {
  const hasAnyRealName = entries.some((e) => Boolean(e.nominativo?.trim()));
  const [showNames, setShowNames] = useState<boolean>(true);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [keyboardGrabbedId, setKeyboardGrabbedId] = useState<string | null>(null);
  const [dropTargetBand, setDropTargetBand] = useState<FasciaLivelloKey | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [tableActionStatus, setTableActionStatus] = useState<string | null>(null);
  const [tableActionError, setTableActionError] = useState<string | null>(null);
  const [copiedRecently, setCopiedRecently] = useState(false);
  const [exportingTableDocx, setExportingTableDocx] = useState(false);

  // Modulo aggiunta manuale alunno offline
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNome, setNewNome] = useState('');
  const [newMedia, setNewMedia] = useState('');
  const [newFasciaManuale, setNewFasciaManuale] = useState<FasciaLivelloKey | 'auto'>('auto');
  const [newCategoria, setNewCategoria] = useState<CategoriaBisognoAlunno>('nessuno');
  const [newPiano, setNewPiano] = useState<RiferimentoPianoAlunno>('');
  const [newNota, setNewNota] = useState('');

  const computedLivelli = computeLivelliFromStudents(entries);
  const exportLivelli =
    entries.length > 0
      ? computedLivelli
      : (tableExportContext?.livelliOverride ?? computedLivelli);
  const totalInFourBands =
    exportLivelli.bassoAlunni +
    exportLivelli.medioBassoAlunni +
    exportLivelli.medioAlunni +
    exportLivelli.altoAlunni;
  const livelli = computedLivelli;
  const daVerificareCount = entries.filter((e) => e.fasciaCorrente === 'da_verificare').length;
  const movedCount = entries.filter((e) => e.spostatoDalDocente).length;
  const disabilitaCount = entries.filter(
    (e) => e.categoriaInclusione === 'disabilita_pei'
  ).length;
  const besCount = entries.filter(
    (e) =>
      e.categoriaInclusione &&
      e.categoriaInclusione !== 'nessuno' &&
      e.categoriaInclusione !== 'disabilita_pei'
  ).length;

  const formatMedia = (m: number | null) =>
    m === null ? 'n.d.' : m.toFixed(2).replace('.', ',');

  const handleMove = (studentId: string, target: FasciaLivelloKey) => {
    onChangeEntries(moveStudentToFascia(entries, studentId, target));
  };

  const stepMove = (entry: AnonymousStudentBandEntry, direction: -1 | 1) => {
    const idx = BAND_ORDER.indexOf(entry.fasciaCorrente);
    const nextIdx = Math.max(0, Math.min(BAND_ORDER.length - 1, idx + direction));
    if (nextIdx !== idx) {
      handleMove(entry.id, BAND_ORDER[nextIdx]);
    }
  };

  const handleAddManualStudent = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedMedia = parseItalianDecimal(newMedia);
    const validMedia =
      parsedMedia !== null && parsedMedia >= 0 && parsedMedia <= 10 ? parsedMedia : null;
    const added = createManualStudentEntry(
      entries,
      {
        nominativo: newNome,
        media: validMedia,
        fasciaManuale: newFasciaManuale === 'auto' ? undefined : newFasciaManuale,
        categoriaInclusione: newCategoria,
        riferimentoPiano: newPiano,
        notaSensibileDocente: newNota,
      },
      soglie
    );
    onChangeEntries([...entries, added]);
    setNewNome('');
    setNewMedia('');
    setNewFasciaManuale('auto');
    setNewCategoria('nessuno');
    setNewPiano('');
    setNewNota('');
    setShowAddForm(false);
  };

  const handleRemoveStudent = (studentId: string) => {
    const next = removeStudentFromFasce(entries, studentId);
    onChangeEntries(next);
    if (expandedId === studentId) setExpandedId(null);
    if (keyboardGrabbedId === studentId) setKeyboardGrabbedId(null);
    setTableActionError(null);
    if (next.length === 0) {
      setTableActionStatus('Tutti gli alunni sono stati rimossi dall’elenco.');
    }
  };

  const resolvedClasseLabel = tableExportContext?.classeLabel || classeRilevata || '';

  const handleCopyTable = async () => {
    setTableActionError(null);
    setTableActionStatus(null);
    try {
      const mode = await copyLivelliTableToClipboard({
        livelli: exportLivelli,
        entries,
        classeLabel: resolvedClasseLabel,
        layoutDocumento: tableExportContext?.layoutDocumento,
      });
      setCopiedRecently(true);
      setTimeout(() => setCopiedRecently(false), 2500);
      setTableActionStatus(
        mode === 'rich'
          ? 'Tabella copiata negli appunti: puoi incollarla direttamente in Word o LibreOffice Writer.'
          : 'Tabella copiata in formato testo tabulato negli appunti.'
      );
    } catch (err) {
      setTableActionError(
        err instanceof Error ? err.message : 'Impossibile copiare la tabella negli appunti.'
      );
    }
  };

  const handleExportTableOnlyDocx = async () => {
    setTableActionError(null);
    setTableActionStatus(null);
    setExportingTableDocx(true);
    try {
      const filename = await downloadLivelliTableDocx({
        livelli: exportLivelli,
        entries,
        classeLabel: resolvedClasseLabel,
        layoutDocumento: tableExportContext?.layoutDocumento,
      });
      setTableActionStatus(`Tabella fasce di livello esportata in DOCX: ${filename}`);
    } catch (err) {
      setTableActionError(
        err instanceof Error ? err.message : 'Errore durante la generazione del file DOCX della tabella.'
      );
    } finally {
      setExportingTableDocx(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/40">
        <div className="space-y-0.5 text-xs">
          <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
            <Lock className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
            <span>
              Elenco locale offline ({entries.length} alunni
              {classeRilevata ? ` · ${classeRilevata}` : ''}
              {besCount > 0 ? ` · ${besCount} BES/DSA/PEI` : ''})
            </span>
          </div>
          <p className="text-slate-600 dark:text-slate-400 tabular-nums">
            Basso: <strong>{livelli.bassoAlunni}</strong> · Medio/basso:{' '}
            <strong>{livelli.medioBassoAlunni}</strong> · Medio:{' '}
            <strong>{livelli.medioAlunni}</strong> · Alto: <strong>{livelli.altoAlunni}</strong>
            {daVerificareCount > 0 ? ` · Da verificare: ${daVerificareCount}` : ''}
            {movedCount > 0 ? ` · Spostati manualmente: ${movedCount}` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(entries.length > 0 || totalInFourBands > 0) && (
            <>
              <button
                type="button"
                onClick={() => void handleCopyTable()}
                className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-emerald-700 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 dark:border-emerald-500 dark:bg-slate-900 dark:text-emerald-300 dark:hover:bg-slate-800"
              >
                {copiedRecently ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copiedRecently ? 'Tabella copiata!' : 'Copia tabella (Word / Writer)'}
              </button>

              <button
                type="button"
                disabled={exportingTableDocx}
                onClick={() => void handleExportTableOnlyDocx()}
                className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg bg-[#1F3864] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#172b4d] disabled:opacity-60"
              >
                <FileDown className="h-3.5 w-3.5" />
                {exportingTableDocx ? 'Esportazione...' : 'Esporta solo tabella (.docx)'}
              </button>
            </>
          )}

          {hasAnyRealName && (
            <button
              type="button"
              onClick={() => setShowNames((v) => !v)}
              className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              {showNames ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {showNames ? 'Maschera nomi (vista anonima)' : 'Mostra nominativi'}
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-[#1F3864] bg-white px-3 py-1.5 text-xs font-semibold text-[#1F3864] hover:bg-blue-50 dark:border-blue-400 dark:bg-slate-900 dark:text-blue-300 dark:hover:bg-slate-800"
          >
            <Plus className="h-3.5 w-3.5" />
            Aggiungi alunno
          </button>

          {onSyncComposizione && entries.length > 0 && (
            <button
              type="button"
              onClick={() => onSyncComposizione(entries.length, besCount, disabilitaCount)}
              className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <Users className="h-3.5 w-3.5" />
              Aggiorna Composizione ({entries.length} / {besCount} BES / {disabilitaCount} Dis.)
            </button>
          )}

          <button
            type="button"
            onClick={() => setConfirmRestore(true)}
            disabled={movedCount === 0}
            className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Ripristina fasce automatiche
          </button>

          {entries.length > 0 && (
            <button
              type="button"
              onClick={() => setConfirmClearAll(true)}
              className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 dark:border-red-900/60 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Rimuovi tutti ({entries.length})
            </button>
          )}
        </div>
      </div>

      {tableActionStatus && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
        >
          <Check className="h-4 w-4 shrink-0" />
          <span>{tableActionStatus}</span>
        </div>
      )}

      {tableActionError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
        >
          {tableActionError}
        </div>
      )}

      {daVerificareCount > 0 && (
        <div
          role="note"
          className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
          <span>
            <strong>{daVerificareCount} alunni</strong> sono nella colonna <em>Da verificare</em> (voto mancante o sotto soglia minima): spostali in una delle 4 fasce (<strong>Basso, Medio/basso, Medio, Alto</strong>) affinché i loro nominativi vengano inclusi nella tabella esportata o copiata.
          </span>
        </div>
      )}

      {showAddForm && (
        <form
          onSubmit={handleAddManualStudent}
          className="grid gap-3 rounded-xl border border-slate-300 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-700 dark:bg-slate-900"
        >
          <label className="block">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Nome e cognome (opzionale)
            </span>
            <input
              type="text"
              value={newNome}
              onChange={(e) => setNewNome(e.target.value)}
              placeholder="es. Rossi Mario"
              className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Media voti (es. 6,5) o Fascia
            </span>
            <div className="mt-1 flex gap-1.5">
              <input
                type="text"
                value={newMedia}
                onChange={(e) => setNewMedia(e.target.value)}
                placeholder="Voto (opz.)"
                className="w-24 rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono-num text-xs dark:border-slate-700 dark:bg-slate-950"
              />
              <select
                value={newFasciaManuale}
                onChange={(e) =>
                  setNewFasciaManuale(e.target.value as FasciaLivelloKey | 'auto')
                }
                aria-label="Fascia di destinazione"
                className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="auto">Auto da media</option>
                <option value="basso">Fascia 4-5 (Basso)</option>
                <option value="medio_basso">Fascia 6 (Medio/basso)</option>
                <option value="medio">Fascia 7-8 (Medio)</option>
                <option value="alto">Fascia 9-10 (Alto)</option>
                <option value="da_verificare">Da verificare</option>
              </select>
            </div>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Inclusione / bisogni
            </span>
            <select
              value={newCategoria}
              onChange={(e) => setNewCategoria(e.target.value as CategoriaBisognoAlunno)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
            >
              {CATEGORIA_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Piano personalizzato
            </span>
            <select
              value={newPiano}
              onChange={(e) => setNewPiano(e.target.value as RiferimentoPianoAlunno)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
            >
              {PIANO_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2 lg:col-span-3">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Nota sensibile o didattica riservata al docente (non inclusa nei DOCX/PDF ufficiali)
            </span>
            <input
              type="text"
              value={newNota}
              onChange={(e) => setNewNota(e.target.value)}
              placeholder="es. Strumenti compensativi, tempi aggiuntivi, osservazioni riservate..."
              className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <div className="flex items-end justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#1F3864] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#172b4d]"
            >
              Inserisci
            </button>
          </div>
        </form>
      )}

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Medie dei voti, classificazioni BES/DSA/PEI e note sensibili restano solo su questo dispositivo. Nei documenti DOCX e PDF ufficiali vengono riportati i conteggi aggregati e, se presenti, i nominativi nella riga dedicata della tabella Livelli di partenza. Puoi spostare ogni alunno con il menu, il trascinamento o da tastiera (Spazio/Invio + Frecce).
      </p>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {BAND_ORDER.map((bandKey) => {
          const meta = getBandMeta(bandKey, soglie);
          const bandItems = entries.filter((e) => e.fasciaCorrente === bandKey);
          const isDropTarget = dropTargetBand === bandKey;

          return (
            <section
              key={bandKey}
              aria-label={meta.title}
              onDragOver={(e) => {
                e.preventDefault();
                setDropTargetBand(bandKey);
              }}
              onDragLeave={() => setDropTargetBand(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDropTargetBand(null);
                const id = e.dataTransfer.getData('text/plain') || draggedId;
                if (id) handleMove(id, bandKey);
                setDraggedId(null);
              }}
              className={`flex min-h-[180px] flex-col rounded-xl border bg-white p-3 transition dark:bg-slate-900 ${
                meta.borderClass
              } ${isDropTarget ? 'ring-2 ring-[#1F3864]' : ''}`}
            >
              <header className="border-b border-slate-100 pb-2 dark:border-slate-800">
                <div className="flex items-baseline justify-between gap-2">
                  <h4 className={`text-xs font-bold uppercase tracking-wide ${meta.headerClass}`}>
                    {meta.title}
                  </h4>
                  <span className="font-mono-num text-sm font-bold text-slate-900 dark:text-slate-100">
                    {bandItems.length}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{meta.subtitle}</p>
              </header>

              <div className="mt-2.5 flex-1 space-y-2">
                {bandItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-4 text-center">
                    <p className="text-xs italic text-slate-400">
                      Nessun alunno in questa fascia
                    </p>
                  </div>
                ) : (
                  bandItems.map((entry) => {
                    const isGrabbed = keyboardGrabbedId === entry.id;
                    const bandIndex = BAND_ORDER.indexOf(entry.fasciaCorrente);
                    const cleanedDisplay = entry.nominativo?.trim()
                      ? extractRegisterOrderAndCleanName(entry.nominativo).cleanName
                      : '';
                    const displayName =
                      showNames && cleanedDisplay ? cleanedDisplay : entry.labelAnonimo;
                    const catMeta = CATEGORIA_OPTIONS.find(
                      (c) => c.value === entry.categoriaInclusione
                    );
                    const isExpanded = expandedId === entry.id;
                    const hasSensitiveInfo =
                      Boolean(catMeta?.badge) ||
                      Boolean(entry.riferimentoPiano) ||
                      Boolean(entry.notaSensibileDocente?.trim());

                    return (
                      <div
                        key={entry.id}
                        draggable={!isExpanded}
                        tabIndex={0}
                        aria-grabbed={isGrabbed}
                        aria-label={`${displayName}, media ${formatMedia(entry.media)}, fascia ${meta.title}${
                          entry.spostatoDalDocente ? ', spostato dal docente' : ''
                        }`}
                        onDragStart={(e) => {
                          setDraggedId(entry.id);
                          e.dataTransfer.setData('text/plain', entry.id);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragEnd={() => {
                          setDraggedId(null);
                          setDropTargetBand(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.target !== e.currentTarget) return;
                          if (e.key === ' ' || e.key === 'Enter') {
                            e.preventDefault();
                            setKeyboardGrabbedId((prev) =>
                              prev === entry.id ? null : entry.id
                            );
                          } else if (e.key === 'Escape') {
                            setKeyboardGrabbedId(null);
                          } else if (e.key === 'ArrowRight') {
                            e.preventDefault();
                            stepMove(entry, 1);
                          } else if (e.key === 'ArrowLeft') {
                            e.preventDefault();
                            stepMove(entry, -1);
                          }
                        }}
                        className={`rounded-lg border p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#1F3864] ${
                          isGrabbed
                            ? 'border-[#1F3864] bg-blue-50/70 dark:border-blue-400 dark:bg-blue-950/40'
                            : 'border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="flex min-w-0 items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                            <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-slate-400" />
                            <span className="truncate" title={displayName}>
                              {displayName}
                            </span>
                          </div>
                          <span className="shrink-0 font-mono-num font-semibold text-slate-700 dark:text-slate-200">
                            {formatMedia(entry.media)}
                          </span>
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                          {showNames && entry.nominativo?.trim() && (
                            <span>({entry.labelAnonimo})</span>
                          )}
                          {catMeta?.badge && (
                            <span className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                              {catMeta.badge}
                            </span>
                          )}
                          {entry.riferimentoPiano && (
                            <span className="rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-[#1F3864] dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
                              {entry.riferimentoPiano}
                            </span>
                          )}
                          {entry.spostatoDalDocente && (
                            <span className="font-semibold text-amber-700 dark:text-amber-300">
                              · spostato dal docente
                            </span>
                          )}
                        </div>

                        {entry.notaSensibileDocente && !isExpanded && (
                          <p className="mt-1 line-clamp-2 text-[11px] italic text-slate-600 dark:text-slate-300">
                            {entry.notaSensibileDocente}
                          </p>
                        )}

                        <div className="mt-2 flex items-center gap-1">
                          <button
                            type="button"
                            disabled={bandIndex === 0}
                            onClick={() => stepMove(entry, -1)}
                            aria-label={`Sposta ${displayName} alla fascia precedente`}
                            className="rounded border border-slate-300 bg-white p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-35 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                          >
                            <ArrowLeft className="h-3 w-3" />
                          </button>

                          <select
                            value={entry.fasciaCorrente}
                            onChange={(e) =>
                              handleMove(entry.id, e.target.value as FasciaLivelloKey)
                            }
                            aria-label={`Seleziona fascia per ${displayName}`}
                            className="min-w-0 flex-1 rounded border border-slate-300 bg-white px-1.5 py-1 text-[11px] font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                          >
                            <option value="basso">Fascia 4-5 (Basso)</option>
                            <option value="medio_basso">Fascia 6 (Medio/basso)</option>
                            <option value="medio">Fascia 7-8 (Medio)</option>
                            <option value="alto">Fascia 9-10 (Alto)</option>
                            <option value="da_verificare">Da verificare</option>
                          </select>

                          <button
                            type="button"
                            disabled={bandIndex === BAND_ORDER.length - 1}
                            onClick={() => stepMove(entry, 1)}
                            aria-label={`Sposta ${displayName} alla fascia successiva`}
                            className="rounded border border-slate-300 bg-white p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-35 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                          >
                            <ArrowRight className="h-3 w-3" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                            aria-expanded={isExpanded}
                            title="Dati inclusione e nota sensibile offline"
                            className={`rounded border p-1 ${
                              hasSensitiveInfo
                                ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
                                : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                            }`}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveStudent(entry.id)}
                            aria-label={`Rimuovi ${displayName}`}
                            title={`Rimuovi ${displayName} dall’elenco`}
                            className="rounded border border-slate-300 bg-white p-1 text-slate-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-red-900 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="mt-2 space-y-2 border-t border-slate-200 pt-2 dark:border-slate-700">
                            <label className="block">
                              <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                                Nominativo (solo locale)
                              </span>
                              <input
                                type="text"
                                value={entry.nominativo ?? ''}
                                onChange={(e) =>
                                  onChangeEntries(
                                    updateStudentDetails(
                                      entries,
                                      entry.id,
                                      { nominativo: e.target.value },
                                      soglie
                                    )
                                  )
                                }
                                placeholder={entry.labelAnonimo}
                                className="mt-0.5 w-full rounded border border-slate-300 bg-white px-2 py-1 text-[11px] dark:border-slate-700 dark:bg-slate-950"
                              />
                            </label>

                            <div className="grid grid-cols-2 gap-1.5">
                              <label className="block">
                                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                                  Inclusione
                                </span>
                                <select
                                  value={entry.categoriaInclusione ?? 'nessuno'}
                                  onChange={(e) =>
                                    onChangeEntries(
                                      updateStudentDetails(
                                        entries,
                                        entry.id,
                                        {
                                          categoriaInclusione: e.target
                                            .value as CategoriaBisognoAlunno,
                                        },
                                        soglie
                                      )
                                    )
                                  }
                                  className="mt-0.5 w-full rounded border border-slate-300 bg-white px-1.5 py-1 text-[11px] dark:border-slate-700 dark:bg-slate-950"
                                >
                                  {CATEGORIA_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.badge || 'Nessuno'}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <label className="block">
                                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                                  Piano
                                </span>
                                <select
                                  value={entry.riferimentoPiano ?? ''}
                                  onChange={(e) =>
                                    onChangeEntries(
                                      updateStudentDetails(
                                        entries,
                                        entry.id,
                                        {
                                          riferimentoPiano: e.target
                                            .value as RiferimentoPianoAlunno,
                                        },
                                        soglie
                                      )
                                    )
                                  }
                                  className="mt-0.5 w-full rounded border border-slate-300 bg-white px-1.5 py-1 text-[11px] dark:border-slate-700 dark:bg-slate-950"
                                >
                                  <option value="">Nessuno</option>
                                  <option value="PDP">PDP</option>
                                  <option value="PEI">PEI</option>
                                  <option value="Osservazione">Osservaz.</option>
                                </select>
                              </label>
                            </div>

                            <label className="block">
                              <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                                Nota sensibile riservata al docente
                              </span>
                              <textarea
                                rows={2}
                                value={entry.notaSensibileDocente ?? ''}
                                onChange={(e) =>
                                  onChangeEntries(
                                    updateStudentDetails(
                                      entries,
                                      entry.id,
                                      { notaSensibileDocente: e.target.value },
                                      soglie
                                    )
                                  )
                                }
                                placeholder="Annotazioni BES/DSA/PEI o osservazioni riservate (solo offline)..."
                                className="mt-0.5 w-full rounded border border-slate-300 bg-white p-1.5 text-[11px] dark:border-slate-700 dark:bg-slate-950"
                              />
                            </label>

                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => handleRemoveStudent(entry.id)}
                                className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                              >
                                <Trash2 className="h-3 w-3" />
                                Rimuovi
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setNewFasciaManuale(bandKey);
                  setShowAddForm(true);
                }}
                className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 px-2 py-1 text-[11px] font-medium text-slate-600 hover:border-[#1F3864] hover:text-[#1F3864] dark:border-slate-700 dark:text-slate-400 dark:hover:border-blue-400 dark:hover:text-blue-300"
              >
                <Plus className="h-3 w-3" />
                Aggiungi qui
              </button>
            </section>
          );
        })}
      </div>

      <ConfirmModal
        open={confirmRestore}
        title="Ripristinare le fasce automatiche?"
        description="Ogni alunno tornerà alla fascia calcolata automaticamente in base alla propria media e alle soglie attive. Gli spostamenti manuali saranno annullati."
        confirmLabel="Ripristina fasce automatiche"
        onCancel={() => setConfirmRestore(false)}
        onConfirm={() => {
          onChangeEntries(restoreAutomaticFasce(entries, soglie));
          setConfirmRestore(false);
        }}
      />

      <ConfirmModal
        open={confirmClearAll}
        title="Rimuovere tutti gli alunni importati?"
        description="Tutti gli alunni presenti nelle fasce di livello verranno rimossi e i relativi conteggi saranno azzerati (operazione utile se hai importato il file sbagliato)."
        confirmLabel="Rimuovi tutti gli alunni"
        destructive
        onCancel={() => setConfirmClearAll(false)}
        onConfirm={() => {
          onChangeEntries([]);
          setExpandedId(null);
          setKeyboardGrabbedId(null);
          setConfirmClearAll(false);
          setTableActionError(null);
          setTableActionStatus(
            'Elenco alunni svuotato: ora puoi importare un nuovo registro o inserire gli alunni manualmente.'
          );
        }}
      />
    </div>
  );
}
