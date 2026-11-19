import { CheckCircle2, FileSpreadsheet, Lock, Plus, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { FasceLivelloBoard } from '../components/FasceLivelloBoard';
import type {
  AnonymousStudentBandEntry,
  Programmazione,
  SchoolSettings,
} from '../domain/types';
import {
  computeLivelliFromStudents,
  createManualStudentEntry,
  parseGradebookBuffer,
} from '../engine/gradebookImporter';

interface GradebookImportPageProps {
  programmazioni: Programmazione[];
  settings: SchoolSettings;
  initialPlanId?: string | null;
  onApplyToPlan: (
    planId: string,
    entries: AnonymousStudentBandEntry[],
    classeRilevata: string
  ) => Promise<void>;
  onSyncComposizione?: (
    planId: string,
    totaleAlunni: number,
    totaleBes: number,
    totaleDisabilita?: number
  ) => Promise<void>;
  onOpenPlanEditor: (planId: string) => void;
  onOpenSettings: () => void;
}

export function GradebookImportPage({
  programmazioni,
  settings,
  initialPlanId,
  onApplyToPlan,
  onSyncComposizione,
  onOpenPlanEditor,
  onOpenSettings,
}: GradebookImportPageProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string>(
    initialPlanId || programmazioni[0]?.id || ''
  );
  const selectedPlan = programmazioni.find((p) => p.id === selectedPlanId);

  const [entries, setEntries] = useState<AnonymousStudentBandEntry[]>(
    () => selectedPlan?.analisiPartenza.alunniAnonimiFasce ?? []
  );
  const [classeRilevata, setClasseRilevata] = useState<string>(
    () => selectedPlan?.analisiPartenza.registroClasseRilevata ?? ''
  );
  const [keepNamesOffline, setKeepNamesOffline] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectTargetPlan = (nextId: string) => {
    setSelectedPlanId(nextId);
    const plan = programmazioni.find((p) => p.id === nextId);
    setEntries(plan?.analisiPartenza.alunniAnonimiFasce ?? []);
    setClasseRilevata(plan?.analisiPartenza.registroClasseRilevata ?? '');
    setStatusMsg(null);
    setErrorMsg(null);
  };

  const handleFileImport = async (file: File) => {
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const buffer = await file.arrayBuffer();
      const result = parseGradebookBuffer(buffer, settings.soglieFasce, {
        keepNames: keepNamesOffline,
      });
      setEntries(result.entries);
      setClasseRilevata(result.classeRilevata);

      if (selectedPlanId) {
        await onApplyToPlan(selectedPlanId, result.entries, result.classeRilevata);
        setStatusMsg(
          `Importati ${result.entries.length} alunni (${
            keepNamesOffline ? 'con nominativi salvati solo in locale' : 'in forma anonima'
          }) e aggiornati i conteggi nella programmazione selezionata.`
        );
      } else {
        setStatusMsg(
          `Importati ${result.entries.length} alunni (seleziona una programmazione per salvare i dati).`
        );
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Impossibile leggere il file Excel selezionato.'
      );
    }
  };

  const handleEntriesUpdate = async (next: AnonymousStudentBandEntry[]) => {
    setEntries(next);
    if (selectedPlanId) {
      await onApplyToPlan(selectedPlanId, next, classeRilevata);
      const counts = computeLivelliFromStudents(next);
      setStatusMsg(
        `Conteggi aggiornati: Basso ${counts.bassoAlunni} · Medio/basso ${counts.medioBassoAlunni} · Medio ${counts.medioAlunni} · Alto ${counts.altoAlunni}.`
      );
    }
  };

  const handleStartManualRoster = async () => {
    const first = createManualStudentEntry(
      entries,
      { nominativo: '', media: null },
      settings.soglieFasce
    );
    await handleEntriesUpdate([...entries, first]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Registro alunni, fasce di livello e dati sensibili offline
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Gestione 100% locale su questo dispositivo: importa file .xlsx o gestisci l’elenco nominativo e le annotazioni BES/DSA/PEI senza alcuna connessione
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenSettings}
          className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          Modifica soglie fasce ({String(settings.soglieFasce.sogliaMedioBasso).replace('.', ',')} /{' '}
          {String(settings.soglieFasce.sogliaMedio).replace('.', ',')} /{' '}
          {String(settings.soglieFasce.sogliaAlto).replace('.', ',')})
        </button>
      </div>

      <div
        role="note"
        className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-xs leading-relaxed text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100"
      >
        <Lock className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" />
        <p>
          <strong>Archivio riservato locale (zero cloud):</strong> l’app opera interamente offline; in questo spazio conservi le medie dei voti, la classificazione BES/DSA/PEI/PDP e le note riservate (mai esportate). Nei documenti <strong>DOCX e PDF ufficiali</strong> vengono inseriti i conteggi numerici per fascia e, se conservati, nome e cognome degli alunni nella riga dedicata della tabella <em>Livelli di partenza</em>.
        </p>
      </div>

      {/* Selezione programmazione e caricamento file */}
      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2 dark:border-slate-800 dark:bg-slate-900">
        <div className="space-y-3">
          <label className="block">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Programmazione di destinazione
            </span>
            <select
              value={selectedPlanId}
              onChange={(e) => handleSelectTargetPlan(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            >
              {programmazioni.length === 0 ? (
                <option value="">Nessuna programmazione ancora creata</option>
              ) : (
                programmazioni.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.datiGenerali.disciplina} · Classe {p.datiGenerali.classe}{' '}
                    {p.datiGenerali.sezione} ({p.datiGenerali.annoScolastico})
                  </option>
                ))
              )}
            </select>
          </label>

          <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={keepNamesOffline}
              onChange={(e) => setKeepNamesOffline(e.target.checked)}
              className="h-4 w-4 accent-[#1F3864]"
            />
            <span>
              Conserva <strong>nome e cognome</strong> degli alunni nell’archivio locale e nella riga alunni della tabella <em>Livelli di partenza</em> (deseleziona per usare <em>Alunno 1, Alunno 2...</em>)
            </span>
          </label>
        </div>

        <div className="flex flex-col justify-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.ods"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFileImport(file);
              e.target.value = '';
            }}
            className="hidden"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#1F3864] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#172b4d]"
            >
              <Upload className="h-4 w-4" />
              Importa registro Excel (.xlsx)
            </button>
            <button
              type="button"
              onClick={handleStartManualRoster}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#1F3864] px-3.5 py-2.5 text-xs font-semibold text-[#1F3864] hover:bg-blue-50 dark:border-blue-400 dark:text-blue-300 dark:hover:bg-slate-800"
            >
              <Plus className="h-3.5 w-3.5" />
              Aggiungi alunno
            </button>
            {selectedPlanId && (
              <button
                type="button"
                onClick={() => onOpenPlanEditor(selectedPlanId)}
                className="whitespace-nowrap rounded-lg border border-slate-300 px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Apri nell’editor
              </button>
            )}
          </div>
        </div>
      </div>

      {statusMsg && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
        >
          {errorMsg}
        </div>
      )}

      {entries.length === 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          <FileSpreadsheet className="h-5 w-5 shrink-0 text-slate-400" />
          <p>
            Le 5 colonne delle fasce di livello sono già pronte qui sotto: puoi importare il registro Excel (.xlsx) oppure cliccare <strong>+ Aggiungi qui</strong> direttamente dentro la fascia desiderata.
          </p>
        </div>
      )}

      <FasceLivelloBoard
        entries={entries}
        soglie={settings.soglieFasce}
        classeRilevata={classeRilevata}
        onChangeEntries={handleEntriesUpdate}
        onSyncComposizione={
          selectedPlanId && onSyncComposizione
            ? async (totale, bes, disabilita = 0) => {
                await onSyncComposizione(selectedPlanId, totale, bes, disabilita);
                setStatusMsg(
                  `Composizione della classe aggiornata: ${totale} alunni totali, ${bes} BES, ${disabilita} con disabilità.`
                );
              }
            : undefined
        }
      />
    </div>
  );
}
