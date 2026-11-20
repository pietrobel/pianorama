import {
  Archive,
  Copy,
  Download,
  Edit3,
  Eye,
  FilePlus2,
  FileUp,
  FolderOpen,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { ConfirmModal } from '../components/ConfirmModal';
import { DocumentImportReviewModal } from '../components/DocumentImportReviewModal';
import { PrivacyNoticeBanner } from '../components/PrivacyNoticeBanner';
import { formatDocenteConTitolo } from '../domain/defaults';
import type {
  ClasseSecondaria,
  PlanStatus,
  Programmazione,
  SchoolSettings,
} from '../domain/types';
import {
  importProgrammazioneFromFile,
  type DocumentImportResult,
} from '../engine/documentPlanImporter';

import type { UpdateCheckStatus } from '../pwa/pwaUpdateManager';

interface DashboardPageProps {
  programmazioni: Programmazione[];
  settings: SchoolSettings;
  pwaUpdateStatus?: UpdateCheckStatus;
  pwaUpdateMessage?: string | null;
  pwaNeedRefresh?: boolean;
  pwaBuildId?: string;
  onCheckPWAUpdates?: () => Promise<unknown>;
  onApplyPWAUpdate?: () => Promise<unknown>;
  onCreateNew: () => void;
  onImportDocument: (plan: Programmazione) => Promise<void>;
  onReusePlan: (sourceId: string) => void;
  onOpenEditor: (id: string) => void;
  onOpenPreview: (id: string) => void;
  onDuplicate: (plan: Programmazione) => void;
  onChangeStatus: (id: string, stato: PlanStatus) => void;
  onDelete: (id: string) => void;
  onGoToBackup: () => void;
}

const STATUS_LABELS: Record<PlanStatus, string> = {
  bozza: 'Bozza',
  completata: 'Completata',
  archiviata: 'Archiviata',
};

const STATUS_STYLES: Record<PlanStatus, string> = {
  bozza:
    'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-800',
  completata:
    'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800',
  archiviata:
    'text-slate-600 bg-slate-100 border-slate-200 dark:text-slate-400 dark:bg-slate-800 dark:border-slate-700',
};

export function DashboardPage({
  programmazioni,
  settings,
  pwaUpdateStatus = 'idle',
  pwaUpdateMessage,
  pwaNeedRefresh = false,
  pwaBuildId,
  onCheckPWAUpdates,
  onApplyPWAUpdate,
  onCreateNew,
  onImportDocument,
  onReusePlan,
  onOpenEditor,
  onOpenPreview,
  onDuplicate,
  onChangeStatus,
  onDelete,
  onGoToBackup,
}: DashboardPageProps) {
  const [viewTab, setViewTab] = useState<'attive' | 'modelli' | 'archivio'>('attive');
  const [searchText, setSearchText] = useState('');
  const [filterAnno, setFilterAnno] = useState<string>('tutti');
  const [filterDocente, setFilterDocente] = useState<string>('tutti');
  const [filterClasse, setFilterClasse] = useState<ClasseSecondaria | 'tutte'>('tutte');
  const [filterDisciplina, setFilterDisciplina] = useState<string>('tutte');
  const [filterStato, setFilterStato] = useState<PlanStatus | 'tutti'>('tutti');
  const [deleteTarget, setDeleteTarget] = useState<Programmazione | null>(null);
  const [importingDoc, setImportingDoc] = useState(false);
  const [importDocError, setImportDocError] = useState<string | null>(null);
  const [pendingImportResult, setPendingImportResult] = useState<DocumentImportResult | null>(null);
  const importDocInputRef = useRef<HTMLInputElement>(null);

  const anniDisponibili = useMemo(() => {
    const set = new Set(programmazioni.map((p) => p.datiGenerali.annoScolastico).filter(Boolean));
    return Array.from(set).sort().reverse();
  }, [programmazioni]);

  const docentiDisponibili = useMemo(() => {
    const set = new Set(programmazioni.map((p) => p.datiGenerali.docente.trim()).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'it'));
  }, [programmazioni]);

  const disciplineDisponibili = useMemo(() => {
    const set = new Set(programmazioni.map((p) => p.datiGenerali.disciplina).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'it'));
  }, [programmazioni]);

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return programmazioni.filter((p) => {
      if (viewTab === 'modelli' && !p.isTemplate) return false;
      if (viewTab === 'archivio' && p.stato !== 'archiviata') return false;
      if (viewTab === 'attive' && p.stato === 'archiviata' && filterStato === 'tutti') return false;

      if (filterAnno !== 'tutti' && p.datiGenerali.annoScolastico !== filterAnno) return false;
      if (filterDocente !== 'tutti' && p.datiGenerali.docente.trim() !== filterDocente) return false;
      if (filterClasse !== 'tutte' && p.datiGenerali.classe !== filterClasse) return false;
      if (filterDisciplina !== 'tutte' && p.datiGenerali.disciplina !== filterDisciplina)
        return false;
      if (filterStato !== 'tutti' && p.stato !== filterStato) return false;
      if (q) {
        const hay = [
          p.templateNome || '',
          p.datiGenerali.disciplina,
          p.datiGenerali.classe,
          p.datiGenerali.sezione,
          p.datiGenerali.docente,
          p.datiGenerali.plesso,
          p.datiGenerali.annoScolastico,
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    programmazioni,
    viewTab,
    filterAnno,
    filterDocente,
    filterClasse,
    filterDisciplina,
    filterStato,
    searchText,
  ]);

  const counts = useMemo(() => {
    return {
      total: programmazioni.length,
      bozze: programmazioni.filter((p) => p.stato === 'bozza').length,
      completate: programmazioni.filter((p) => p.stato === 'completata').length,
      modelli: programmazioni.filter((p) => p.isTemplate).length,
      archiviate: programmazioni.filter((p) => p.stato === 'archiviata').length,
    };
  }, [programmazioni]);

  const backupDue = useMemo(() => {
    if (programmazioni.length === 0) return false;
    if (!settings.lastBackupAt) return true;
    const elapsedDays =
      (Date.now() - new Date(settings.lastBackupAt).getTime()) / (1000 * 60 * 60 * 24);
    return elapsedDays >= (settings.backupReminderDays || 14);
  }, [programmazioni.length, settings.lastBackupAt, settings.backupReminderDays]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Archivio programmazioni disciplinari
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Uso personale · Anno scolastico predefinito {settings.defaultAnnoScolastico}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={importDocInputRef}
            type="file"
            accept=".pdf,.docx,.doc"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              setImportingDoc(true);
              setImportDocError(null);
              try {
                const res = await importProgrammazioneFromFile(file, settings);
                setPendingImportResult(res);
              } catch (err) {
                setImportDocError(
                  err instanceof Error
                    ? err.message
                    : 'Impossibile leggere il file selezionato (.pdf, .docx, .doc).'
                );
              } finally {
                setImportingDoc(false);
              }
            }}
            className="hidden"
          />
          <button
            type="button"
            disabled={importingDoc}
            onClick={() => importDocInputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 rounded-lg border border-[#1F3864] bg-white px-4 py-2.5 text-sm font-semibold text-[#1F3864] hover:bg-blue-50 disabled:opacity-60 dark:border-blue-400 dark:bg-slate-900 dark:text-blue-300 dark:hover:bg-slate-800"
          >
            <FileUp className="h-4 w-4" />
            {importingDoc ? 'Importazione...' : 'Importa PDF / Word'}
          </button>
          <button
            type="button"
            onClick={onCreateNew}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 rounded-lg bg-[#1F3864] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#172b4d]"
          >
            <FilePlus2 className="h-4 w-4" />
            Nuova programmazione
          </button>
        </div>
      </div>

      {importDocError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
        >
          {importDocError}
        </div>
      )}

      {backupDue && (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50/70 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-blue-900/60 dark:bg-blue-950/30"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#1F3864] dark:text-blue-400" />
            <div className="text-sm">
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                Promemoria backup locale
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {settings.lastBackupAt
                  ? `Ultimo backup esportato il ${new Date(settings.lastBackupAt).toLocaleDateString('it-IT')}.`
                  : 'Non hai ancora esportato un file .pianorama di sicurezza.'}{' '}
                Poiché i dati risiedono solo in questo browser, esporta regolarmente un archivio cifrato.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onGoToBackup}
            className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-[#1F3864] px-3.5 py-2 text-xs font-semibold text-[#1F3864] hover:bg-white dark:border-blue-400 dark:text-blue-300 dark:hover:bg-slate-800"
          >
            <Download className="h-3.5 w-3.5" />
            Esporta backup
          </button>
        </div>
      )}

      {/* Controllo e aggiornamento app PWA */}
      {(onCheckPWAUpdates || onApplyPWAUpdate) && (
        <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
          <div className="min-w-0 text-xs">
            <p className="font-semibold text-slate-900 dark:text-slate-100">
              Aggiornamento app da pianorama.vercel.app
              {pwaBuildId ? (
                <span className="ml-2 font-mono-num font-normal text-slate-500 dark:text-slate-400">
                  (v. {pwaBuildId})
                </span>
              ) : null}
            </p>
            <p className="mt-0.5 text-slate-600 dark:text-slate-400">
              {pwaUpdateMessage ||
                'Aggiornando o reinstallando da pianorama.vercel.app i curricoli e le programmazioni salvate restano intatti.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onCheckPWAUpdates && (
              <button
                type="button"
                disabled={pwaUpdateStatus === 'checking' || pwaUpdateStatus === 'updating'}
                onClick={() => void onCheckPWAUpdates()}
                className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${pwaUpdateStatus === 'checking' ? 'animate-spin' : ''}`}
                />
                {pwaUpdateStatus === 'checking' ? 'Controllo...' : 'Controlla aggiornamenti'}
              </button>
            )}
            {onApplyPWAUpdate && (
              <button
                type="button"
                disabled={pwaUpdateStatus === 'checking' || pwaUpdateStatus === 'updating'}
                onClick={() => void onApplyPWAUpdate()}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60 ${
                  pwaNeedRefresh
                    ? 'bg-emerald-700 hover:bg-emerald-800'
                    : 'bg-[#1F3864] hover:bg-[#172b4d]'
                }`}
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${pwaUpdateStatus === 'updating' ? 'animate-spin' : ''}`}
                />
                {pwaUpdateStatus === 'updating'
                  ? 'Aggiornamento...'
                  : pwaNeedRefresh
                  ? 'Aggiorna ora'
                  : 'Aggiorna app'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Statistiche compatte */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Totale progetti</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {counts.total}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">In bozza</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-400">
            {counts.bozze}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Completate</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
            {counts.completate}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Modelli · Archivio
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-700 dark:text-slate-300">
            {counts.modelli} · {counts.archiviate}
          </p>
        </div>
      </div>

      {/* Schede viste: Progetti correnti, Modelli riutilizzabili, Archivio storico */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2 dark:border-slate-800">
        {(
          [
            ['attive', 'Programmazioni correnti'],
            ['modelli', `Modelli riutilizzabili (${counts.modelli})`],
            ['archivio', `Archivio storico (${counts.archiviate})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setViewTab(key)}
            className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
              viewTab === key
                ? 'bg-[#1F3864] text-white'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filtri per anno, docente, disciplina, classe, stato */}
      <section
        aria-label="Filtri elenco programmazioni"
        className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <label className="block lg:col-span-2">
            <span className="sr-only">Cerca programmazione</span>
            <div className="relative">
              <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
              <input
                type="search"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Cerca per titolo, docente, disciplina, plesso..."
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1F3864] focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
          </label>

          <select
            value={filterAnno}
            onChange={(e) => setFilterAnno(e.target.value)}
            aria-label="Filtra per anno scolastico"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#1F3864] focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="tutti">Tutti gli anni</option>
            {anniDisponibili.map((anno) => (
              <option key={anno} value={anno}>
                A.S. {anno}
              </option>
            ))}
          </select>

          <select
            value={filterDocente}
            onChange={(e) => setFilterDocente(e.target.value)}
            aria-label="Filtra per docente"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#1F3864] focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="tutti">Tutti i docenti</option>
            {docentiDisponibili.map((doc) => (
              <option key={doc} value={doc}>
                {doc}
              </option>
            ))}
          </select>

          <select
            value={filterDisciplina}
            onChange={(e) => setFilterDisciplina(e.target.value)}
            aria-label="Filtra per disciplina"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#1F3864] focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="tutte">Discipline</option>
            {disciplineDisponibili.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-2">
            <select
              value={filterClasse}
              onChange={(e) => setFilterClasse(e.target.value as ClasseSecondaria | 'tutte')}
              aria-label="Filtra per classe"
              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 focus:border-[#1F3864] focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="tutte">Classi</option>
              <option value="Prima">Prima</option>
              <option value="Seconda">Seconda</option>
              <option value="Terza">Terza</option>
            </select>

            <select
              value={filterStato}
              onChange={(e) => setFilterStato(e.target.value as PlanStatus | 'tutti')}
              aria-label="Filtra per stato"
              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 focus:border-[#1F3864] focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="tutti">Stati</option>
              <option value="bozza">Bozza</option>
              <option value="completata">Completata</option>
              <option value="archiviata">Archiviata</option>
            </select>
          </div>
        </div>
      </section>

      {/* Elenco o Empty State */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
          <FolderOpen className="mx-auto h-10 w-10 text-slate-400" />
          <h2 className="mt-3 text-base font-semibold text-slate-900 dark:text-slate-100">
            {programmazioni.length === 0
              ? 'Nessuna programmazione ancora creata'
              : 'Nessun elemento trovato in questa vista'}
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-600 dark:text-slate-400">
            {programmazioni.length === 0
              ? 'Crea il tuo primo piano di lavoro disciplinare partendo dal modello ufficiale della scuola secondaria di primo grado.'
              : 'Modifica i filtri o la scheda attiva per visualizzare altri progetti o modelli.'}
          </p>
          <button
            type="button"
            onClick={onCreateNew}
            className="mt-5 inline-flex items-center gap-2 whitespace-nowrap shrink-0 rounded-lg bg-[#1F3864] px-4 py-2 text-sm font-semibold text-white hover:bg-[#172b4d]"
          >
            <FilePlus2 className="h-4 w-4" />
            Crea programmazione
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
                  <th className="px-4 py-3">Disciplina e classe</th>
                  <th className="px-4 py-3">Anno / Plesso</th>
                  <th className="px-4 py-3 text-right">Composizione</th>
                  <th className="px-4 py-3">Stato</th>
                  <th className="px-4 py-3">Aggiornata</th>
                  <th className="px-4 py-3 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filtered.map((plan) => (
                  <tr
                    key={plan.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-3.5">
                      <button
                        type="button"
                        onClick={() => onOpenEditor(plan.id)}
                        className="text-left font-semibold text-slate-900 hover:text-[#1F3864] hover:underline dark:text-slate-100 dark:hover:text-blue-400"
                      >
                        {plan.isTemplate && (
                          <span className="mr-1.5 text-xs font-bold text-[#1F3864] dark:text-blue-300">
                            [Modello]
                          </span>
                        )}
                        {plan.datiGenerali.disciplina} · Classe {plan.datiGenerali.classe}{' '}
                        {plan.datiGenerali.sezione}
                      </button>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        Docente:{' '}
                        {plan.datiGenerali.docente.trim()
                          ? formatDocenteConTitolo(
                              plan.datiGenerali.docente,
                              plan.datiGenerali.docenteGenere ?? settings.defaultDocenteGenere ?? 'F'
                            )
                          : 'Non indicato'}
                        {plan.templateNome ? ` · ${plan.templateNome}` : ''}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300">
                      <span className="font-mono-num font-medium">
                        {plan.datiGenerali.annoScolastico}
                      </span>
                      <span className="mx-1.5 text-slate-400">·</span>
                      <span>{plan.datiGenerali.plesso || 'Sede'}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono-num text-xs text-slate-700 dark:text-slate-300">
                      {typeof plan.composizione.alunni === 'number'
                        ? `${plan.composizione.alunni} alunni`
                        : 'Alunni n.d.'}{' '}
                      · {plan.composizione.bes} BES
                      {(plan.composizione.disabilita ?? 0) > 0
                        ? ` · ${plan.composizione.disabilita} disab.`
                        : ''}
                    </td>
                    <td className="px-4 py-3.5">
                      <select
                        value={plan.stato}
                        onChange={(e) => onChangeStatus(plan.id, e.target.value as PlanStatus)}
                        aria-label={`Stato programmazione ${plan.datiGenerali.disciplina}`}
                        className={`rounded-md border px-2 py-1 text-xs font-medium ${STATUS_STYLES[plan.stato]}`}
                      >
                        <option value="bozza">{STATUS_LABELS.bozza}</option>
                        <option value="completata">{STATUS_LABELS.completata}</option>
                        <option value="archiviata">{STATUS_LABELS.archiviata}</option>
                      </select>
                    </td>
                    <td className="px-4 py-3.5 font-mono-num text-xs text-slate-500 dark:text-slate-400">
                      {new Date(plan.updatedAt).toLocaleDateString('it-IT', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onOpenEditor(plan.id)}
                          title="Modifica nell'editor guidato"
                          className="inline-flex items-center gap-1 whitespace-nowrap shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Apri
                        </button>
                        <button
                          type="button"
                          onClick={() => onReusePlan(plan.id)}
                          title="Riutilizza per classe parallela, nuovo anno o copia selettiva"
                          className="inline-flex items-center gap-1 whitespace-nowrap shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium text-teal-800 hover:bg-teal-50 dark:text-teal-300 dark:hover:bg-slate-800"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Riutilizza
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenPreview(plan.id)}
                          title="Anteprima e esportazione DOCX/PDF"
                          className="inline-flex items-center gap-1 whitespace-nowrap shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium text-[#1F3864] hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-slate-800"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Esporta
                        </button>
                        <button
                          type="button"
                          onClick={() => onDuplicate(plan)}
                          title="Duplicazione rapida completa"
                          aria-label={`Duplica ${plan.datiGenerali.disciplina}`}
                          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        {plan.stato !== 'archiviata' && (
                          <button
                            type="button"
                            onClick={() => onChangeStatus(plan.id, 'archiviata')}
                            title="Sposta in archivio storico"
                            aria-label={`Archivia ${plan.datiGenerali.disciplina}`}
                            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                          >
                            <Archive className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(plan)}
                          title="Elimina definitivamente"
                          aria-label={`Elimina ${plan.datiGenerali.disciplina}`}
                          className="rounded-md p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <PrivacyNoticeBanner compact />

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Eliminare questa programmazione?"
        description={
          deleteTarget
            ? `Stai per eliminare definitivamente "${deleteTarget.datiGenerali.disciplina} — Classe ${deleteTarget.datiGenerali.classe} ${deleteTarget.datiGenerali.sezione}" (${deleteTarget.datiGenerali.annoScolastico}). Questa operazione non può essere annullata.`
            : ''
        }
        confirmLabel="Elimina definitivamente"
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) onDelete(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />

      <DocumentImportReviewModal
        open={Boolean(pendingImportResult)}
        importResult={pendingImportResult}
        onCancel={() => setPendingImportResult(null)}
        onConfirm={async (finalPlan) => {
          setPendingImportResult(null);
          await onImportDocument(finalPlan);
        }}
      />
    </div>
  );
}
