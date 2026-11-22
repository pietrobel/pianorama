import {
  CheckCircle2,
  Download,
  FolderOpen,
  GitMerge,
  Lock,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { ConfirmModal } from '../components/ConfirmModal';
import {
  analyzeBackupMerge,
  createBackupEnvelope,
  decryptBackupEnvelope,
  parseBackupEnvelope,
  summarizeBackupData,
  type BackupDuplicatePolicy,
  type BackupMergeOptions,
  type BackupPreviewSummary,
  type BackupRestoreMode,
  type BackupRestoreResult,
} from '../crypto/backupCrypto';
import type {
  BackupPlainData,
  PianoramaBackupEnvelope,
  Programmazione,
  SchoolSettings,
} from '../domain/types';
import { saveBlobToFileSystem, type SaveTargetMode } from '../storage/saveDirectoryService';

interface BackupPageProps {
  settings: SchoolSettings;
  existingPlans: Programmazione[];
  onExportAll: () => Promise<BackupPlainData>;
  onRestoreAll: (
    data: BackupPlainData,
    options: BackupMergeOptions
  ) => Promise<BackupRestoreResult>;
  onMarkBackupDone: () => Promise<void>;
  onGoToPlans?: () => void;
}

export function BackupPage({
  settings,
  existingPlans,
  onExportAll,
  onRestoreAll,
  onMarkBackupDone,
  onGoToPlans,
}: BackupPageProps) {
  const [encryptEnabled, setEncryptEnabled] = useState(true);
  const [exportPassword, setExportPassword] = useState('');
  const [exportPasswordConfirm, setExportPasswordConfirm] = useState('');
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [busyExport, setBusyExport] = useState(false);
  const [saveMode, setSaveMode] = useState<SaveTargetMode>('auto');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingEnvelope, setPendingEnvelope] = useState<PianoramaBackupEnvelope | null>(null);
  const [importPassword, setImportPassword] = useState('');
  const [previewData, setPreviewData] = useState<BackupPlainData | null>(null);
  const [previewSummary, setPreviewSummary] = useState<BackupPreviewSummary | null>(null);
  const [restoreMode, setRestoreMode] = useState<BackupRestoreMode>('merge');
  const [duplicatePolicy, setDuplicatePolicy] = useState<BackupDuplicatePolicy>('skip');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);

  const mergeAnalysis = useMemo(() => {
    if (!previewData) return null;
    return analyzeBackupMerge(existingPlans, previewData.programmazioni);
  }, [existingPlans, previewData]);

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    setExportError(null);
    setExportSuccess(null);

    if (encryptEnabled) {
      if (exportPassword.length < 8) {
        setExportError('La password di cifratura deve contenere almeno 8 caratteri.');
        return;
      }
      if (exportPassword !== exportPasswordConfirm) {
        setExportError('Le due password inserite non coincidono.');
        return;
      }
    }

    setBusyExport(true);
    try {
      const plain = await onExportAll();
      const envelope = await createBackupEnvelope(
        plain,
        encryptEnabled ? exportPassword : undefined
      );
      const blob = new Blob([JSON.stringify(envelope, null, 2)], {
        type: 'application/json',
      });
      const filename = `pianorama_backup_${new Date().toISOString().slice(0, 10)}.pianorama`;
      const result = await saveBlobToFileSystem(blob, filename, saveMode, settings);
      if (result.cancelled) {
        setExportSuccess('Salvataggio del backup annullato.');
        return;
      }

      await onMarkBackupDone();
      setExportPassword('');
      setExportPasswordConfirm('');
      const where = result.folderName
        ? `nella cartella «${result.folderName}»`
        : 'sul dispositivo';
      setExportSuccess(
        `Backup salvato ${where} (${result.filename})${
          encryptEnabled ? ' con cifratura AES-GCM 256-bit.' : ' in formato JSON in chiaro.'
        }${result.warning ? ` ${result.warning}` : ''}`
      );
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Errore durante l’esportazione.');
    } finally {
      setBusyExport(false);
    }
  };

  const handleSelectImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setImportSuccess(null);
    setPreviewData(null);
    setPreviewSummary(null);
    setImportPassword('');
    setRestoreMode('merge');

    try {
      const text = await file.text();
      const envelope = parseBackupEnvelope(text);
      setPendingEnvelope(envelope);
      if (!envelope.encrypted) {
        const plain = await decryptBackupEnvelope(envelope);
        setPreviewData(plain);
        setPreviewSummary(summarizeBackupData(plain));
      }
    } catch (err) {
      setPendingEnvelope(null);
      setImportError(err instanceof Error ? err.message : 'File .pianorama non valido.');
    } finally {
      e.target.value = '';
    }
  };

  const handleDecryptPreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingEnvelope) return;
    setImportError(null);
    try {
      const plain = await decryptBackupEnvelope(pendingEnvelope, importPassword);
      setPreviewData(plain);
      setPreviewSummary(summarizeBackupData(plain));
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Impossibile decifrare il backup.');
    }
  };

  const handleConfirmRestore = async () => {
    if (!previewData) return;
    setConfirmOverwrite(false);
    setImportError(null);
    try {
      const result = await onRestoreAll(previewData, {
        mode: restoreMode,
        duplicatePolicy,
      });
      if (result.mode === 'merge') {
        setImportSuccess(
          `Unione completata senza perdere le nuove programmazioni: ${result.addedPlans} aggiunte, ${result.overwrittenPlans} uguali sovrascritte, ${result.skippedPlans} uguali mantenute, ${result.keptLocalPlans} recenti conservate.`
        );
      } else {
        setImportSuccess(
          `Ripristino completo eseguito: caricate ${previewData.programmazioni.length} programmazioni, ${previewData.library.length} voci di libreria e ${previewData.rules.length} regole.`
        );
      }
      setPendingEnvelope(null);
      setPreviewData(null);
      setPreviewSummary(null);
      setImportPassword('');
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Errore durante il ripristino.');
    }
  };

  const buildConfirmDescription = () => {
    if (!previewSummary || !mergeAnalysis) return '';
    if (restoreMode === 'replace') {
      return `ATTENZIONE: l’operazione cancellerà tutte le ${existingPlans.length} programmazioni attuali (comprese le ${mergeAnalysis.onlyLocalPlans.length} create dopo il backup) e sostituirà l’archivio con le ${previewSummary.programmazioniCount} del backup del ${new Date(
        previewSummary.exportedAt
      ).toLocaleDateString('it-IT')}.`;
    }
    const overwrite = duplicatePolicy === 'overwrite';
    return overwrite
      ? `Verranno aggiunte ${mergeAnalysis.newPlans.length} nuove programmazioni, sovrascritte ${mergeAnalysis.matchingPlans.length} programmazioni uguali con quelle del backup e mantenute intatte le ${mergeAnalysis.onlyLocalPlans.length} programmazioni create nel frattempo.`
      : `Verranno aggiunte ${mergeAnalysis.newPlans.length} nuove programmazioni, mantenute invariate le ${mergeAnalysis.matchingPlans.length} programmazioni uguali già presenti e conservate tutte le ${mergeAnalysis.onlyLocalPlans.length} programmazioni create nel frattempo.`;
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Backup locale e ripristino (.pianorama)
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Esporta tutti i dati in un archivio locale cifrato con Web Crypto API (AES-GCM + PBKDF2) o in JSON in chiaro.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ESPORTAZIONE */}
        <form
          onSubmit={handleExport}
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center gap-2.5">
            <Download className="h-5 w-5 text-[#1F3864] dark:text-blue-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Esporta archivio .pianorama
            </h2>
          </div>

          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            Ultimo backup registrato:{' '}
            <strong className="font-mono-num">
              {settings.lastBackupAt
                ? new Date(settings.lastBackupAt).toLocaleString('it-IT')
                : 'Mai eseguito'}
            </strong>
          </p>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
            <input
              type="checkbox"
              checked={encryptEnabled}
              onChange={(e) => setEncryptEnabled(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#1F3864]"
            />
            <div>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                Cifra il backup con password (consigliato)
              </span>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Utilizza PBKDF2 (250.000 iterazioni) e AES-GCM 256-bit direttamente nel browser.
              </p>
            </div>
          </label>

          {encryptEnabled && (
            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
              <label className="block">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Password di protezione (minimo 8 caratteri)
                </span>
                <input
                  type="password"
                  value={exportPassword}
                  onChange={(e) => setExportPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Conferma password
                </span>
                <input
                  type="password"
                  value={exportPasswordConfirm}
                  onChange={(e) => setExportPasswordConfirm(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
            </div>
          )}

          {exportError && (
            <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
              {exportError}
            </p>
          )}
          {exportSuccess && (
            <p
              role="status"
              className="flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-xs font-medium text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{exportSuccess}</span>
            </p>
          )}

          <label className="block">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <FolderOpen className="h-3.5 w-3.5 text-[#1F3864] dark:text-blue-400" />
              Cartella di salvataggio
            </span>
            <select
              value={saveMode}
              onChange={(e) => setSaveMode(e.target.value as SaveTargetMode)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="auto">
                {settings.defaultSaveFolderName
                  ? `Cartella predefinita: ${settings.defaultSaveFolderName}`
                  : settings.saveBehavior === 'ask_each_time'
                  ? 'Chiedi la cartella al salvataggio'
                  : 'Impostazione predefinita (Download / Cartella)'}
              </option>
              <option value="pick_folder">Scegli cartella ora...</option>
              <option value="browser_download">Download standard del browser</option>
            </select>
          </label>

          <button
            type="submit"
            disabled={busyExport}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#1F3864] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#172b4d] disabled:opacity-60"
          >
            {encryptEnabled ? <Lock className="h-4 w-4" /> : <Download className="h-4 w-4" />}
            {busyExport ? 'Generazione archivio...' : 'Salva file .pianorama'}
          </button>
        </form>

        {/* IMPORTAZIONE CON ANTEPRIMA E UNIONE SICURA */}
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2.5">
            <Upload className="h-5 w-5 text-[#1F3864] dark:text-blue-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Importa da file .pianorama
            </h2>
          </div>
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            In modalità predefinita, PIANORAMA <strong>unisce</strong> il backup all’archivio attuale mantenendo le nuove programmazioni create nel frattempo e consentendo di scegliere se sovrascrivere eventuali file uguali.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pianorama,application/json"
            onChange={handleSelectImportFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Upload className="h-4 w-4" />
            Seleziona file .pianorama
          </button>

          {pendingEnvelope && pendingEnvelope.encrypted && !previewSummary && (
            <form
              onSubmit={handleDecryptPreview}
              className="space-y-3 rounded-lg border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900 dark:bg-blue-950/30"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-[#1F3864] dark:text-blue-300">
                <ShieldCheck className="h-4 w-4" />
                <span>Archivio cifrato rilevato: inserisci la password per l’anteprima</span>
              </div>
              <input
                type="password"
                required
                value={importPassword}
                onChange={(e) => setImportPassword(e.target.value)}
                placeholder="Password del backup..."
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
              <button
                type="submit"
                className="w-full rounded-lg bg-[#1F3864] px-4 py-2 text-xs font-semibold text-white hover:bg-[#172b4d]"
              >
                Decifra e mostra anteprima
              </button>
            </form>
          )}

          {previewSummary && mergeAnalysis && (
            <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Anteprima contenuto del backup
              </h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                <dt className="text-slate-500">Data esportazione:</dt>
                <dd className="font-mono-num font-medium">
                  {new Date(previewSummary.exportedAt).toLocaleString('it-IT')}
                </dd>
                <dt className="text-slate-500">Nel backup:</dt>
                <dd className="font-mono-num font-semibold">
                  {previewSummary.programmazioniCount} programmazioni ({previewSummary.bozzeCount} bozze ·{' '}
                  {previewSummary.completateCount} completate · {previewSummary.archiviateCount}{' '}
                  archiviate)
                </dd>
                <dt className="text-slate-500">Voci libreria / Regole:</dt>
                <dd className="font-mono-num font-medium">
                  {previewSummary.libraryCount} / {previewSummary.rulesCount}
                </dd>
                <dt className="text-slate-500">Nuove da aggiungere:</dt>
                <dd className="font-mono-num font-semibold text-emerald-700 dark:text-emerald-400">
                  {mergeAnalysis.newPlans.length}
                </dd>
                <dt className="text-slate-500">Uguali già presenti:</dt>
                <dd className="font-mono-num font-semibold text-amber-700 dark:text-amber-300">
                  {mergeAnalysis.matchingPlans.length}
                </dd>
                <dt className="text-slate-500">Create nel frattempo:</dt>
                <dd className="font-mono-num font-semibold text-[#1F3864] dark:text-blue-300">
                  {mergeAnalysis.onlyLocalPlans.length}
                </dd>
              </dl>

              {mergeAnalysis.matchingPlans.length > 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50/70 p-2.5 text-[11px] text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
                  <p className="font-semibold">
                    Programmazioni uguali trovate ({mergeAnalysis.matchingPlans.length}):
                  </p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4">
                    {mergeAnalysis.matchingPlans.slice(0, 6).map(({ backupPlan }) => (
                      <li key={backupPlan.id}>
                        {backupPlan.datiGenerali.disciplina || 'Disciplina'} ·{' '}
                        {backupPlan.datiGenerali.classe} {backupPlan.datiGenerali.sezione} (
                        {backupPlan.datiGenerali.annoScolastico})
                      </li>
                    ))}
                    {mergeAnalysis.matchingPlans.length > 6 && (
                      <li>…e altre {mergeAnalysis.matchingPlans.length - 6}</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Scelta modalità ripristino */}
              <div className="space-y-2 border-t border-slate-200 pt-3 dark:border-slate-700">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Modalità di importazione
                </p>

                <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-300 bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-900">
                  <input
                    type="radio"
                    name="restoreMode"
                    checked={restoreMode === 'merge'}
                    onChange={() => setRestoreMode('merge')}
                    className="mt-0.5 h-3.5 w-3.5 accent-[#1F3864]"
                  />
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                      <GitMerge className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
                      <span>Unisci all’archivio attuale (consigliata — mantieni le nuove)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Conserva le {mergeAnalysis.onlyLocalPlans.length} programmazioni create nel frattempo e importa quelle del backup.
                    </p>
                  </div>
                </label>

                {restoreMode === 'merge' && (
                  <div className="ml-5 space-y-1.5 rounded-lg border border-slate-200 bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-900">
                    <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      In caso di file / programmazioni uguali:
                    </p>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="duplicatePolicy"
                        checked={duplicatePolicy === 'skip'}
                        onChange={() => setDuplicatePolicy('skip')}
                        className="h-3.5 w-3.5 accent-[#1F3864]"
                      />
                      <span>Mantieni i file attuali già presenti (importa solo i nuovi)</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="duplicatePolicy"
                        checked={duplicatePolicy === 'overwrite'}
                        onChange={() => setDuplicatePolicy('overwrite')}
                        className="h-3.5 w-3.5 accent-[#1F3864]"
                      />
                      <span>Sovrascrivi i file uguali con la versione del backup</span>
                    </label>
                  </div>
                )}

                <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-900">
                  <input
                    type="radio"
                    name="restoreMode"
                    checked={restoreMode === 'replace'}
                    onChange={() => setRestoreMode('replace')}
                    className="mt-0.5 h-3.5 w-3.5 accent-amber-700"
                  />
                  <div>
                    <span className="font-semibold text-amber-800 dark:text-amber-300">
                      Sostituisci tutto l’archivio (cancella le nuove programmazioni)
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Elimina i dati attuali e ripristina esattamente la fotografia del backup.
                    </p>
                  </div>
                </label>
              </div>

              <button
                type="button"
                onClick={() => setConfirmOverwrite(true)}
                className={`mt-2 w-full rounded-lg px-4 py-2 text-xs font-semibold text-white ${
                  restoreMode === 'replace'
                    ? 'bg-amber-700 hover:bg-amber-800'
                    : 'bg-[#1F3864] hover:bg-[#172b4d]'
                }`}
              >
                {restoreMode === 'replace'
                  ? 'Sostituisci completamente archivio locale'
                  : duplicatePolicy === 'overwrite'
                  ? 'Unisci al database e sovrascrivi uguali'
                  : 'Unisci al database mantenendo gli attuali'}
              </button>
            </div>
          )}

          {importError && (
            <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
              {importError}
            </p>
          )}
          {importSuccess && (
            <div
              role="status"
              className="space-y-2 rounded-lg bg-emerald-50 p-3 text-xs font-medium text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
            >
              <p>{importSuccess}</p>
              {onGoToPlans && (
                <button
                  type="button"
                  onClick={onGoToPlans}
                  className="inline-flex items-center rounded-md bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-900"
                >
                  Vai alle programmazioni
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={confirmOverwrite}
        title={
          restoreMode === 'replace'
            ? 'Sovrascrivere tutto l’archivio locale?'
            : 'Confermare l’unione del backup?'
        }
        description={buildConfirmDescription()}
        confirmLabel={
          restoreMode === 'replace' ? 'Sì, sostituisci tutto' : 'Sì, procedi con l’unione'
        }
        destructive={restoreMode === 'replace'}
        onCancel={() => setConfirmOverwrite(false)}
        onConfirm={handleConfirmRestore}
      />
    </div>
  );
}
