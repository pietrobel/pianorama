import { CheckCircle2, Download, Lock, ShieldCheck, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { ConfirmModal } from '../components/ConfirmModal';
import {
  createBackupEnvelope,
  decryptBackupEnvelope,
  parseBackupEnvelope,
  summarizeBackupData,
  type BackupPreviewSummary,
} from '../crypto/backupCrypto';
import type { BackupPlainData, PianoramaBackupEnvelope, SchoolSettings } from '../domain/types';

interface BackupPageProps {
  settings: SchoolSettings;
  onExportAll: () => Promise<BackupPlainData>;
  onRestoreAll: (data: BackupPlainData) => Promise<void>;
  onMarkBackupDone: () => Promise<void>;
}

export function BackupPage({
  settings,
  onExportAll,
  onRestoreAll,
  onMarkBackupDone,
}: BackupPageProps) {
  const [encryptEnabled, setEncryptEnabled] = useState(true);
  const [exportPassword, setExportPassword] = useState('');
  const [exportPasswordConfirm, setExportPasswordConfirm] = useState('');
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [busyExport, setBusyExport] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingEnvelope, setPendingEnvelope] = useState<PianoramaBackupEnvelope | null>(null);
  const [importPassword, setImportPassword] = useState('');
  const [previewData, setPreviewData] = useState<BackupPlainData | null>(null);
  const [previewSummary, setPreviewSummary] = useState<BackupPreviewSummary | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);

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
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      await onMarkBackupDone();
      setExportPassword('');
      setExportPasswordConfirm('');
      setExportSuccess(
        `Backup salvato sul dispositivo (${filename})${
          encryptEnabled ? ' con cifratura AES-GCM 256-bit.' : ' in formato JSON in chiaro.'
        }`
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
      await onRestoreAll(previewData);
      setImportSuccess(
        `Ripristino completato: caricate ${previewData.programmazioni.length} programmazioni, ${previewData.library.length} voci di libreria e ${previewData.rules.length} regole.`
      );
      setPendingEnvelope(null);
      setPreviewData(null);
      setPreviewSummary(null);
      setImportPassword('');
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Errore durante il ripristino.');
    }
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

          <button
            type="submit"
            disabled={busyExport}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#1F3864] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#172b4d] disabled:opacity-60"
          >
            {encryptEnabled ? <Lock className="h-4 w-4" /> : <Download className="h-4 w-4" />}
            {busyExport ? 'Generazione archivio...' : 'Scarica file .pianorama'}
          </button>
        </form>

        {/* IMPORTAZIONE CON ANTEPRIMA */}
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2.5">
            <Upload className="h-5 w-5 text-[#1F3864] dark:text-blue-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Importa da file .pianorama
            </h2>
          </div>
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            Prima di sovrascrivere l’archivio attuale, PIANORAMA mostra il riepilogo completo dei contenuti e richiede una conferma esplicita.
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

          {previewSummary && (
            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Anteprima contenuto del backup
              </h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                <dt className="text-slate-500">Data esportazione:</dt>
                <dd className="font-mono-num font-medium">
                  {new Date(previewSummary.exportedAt).toLocaleString('it-IT')}
                </dd>
                <dt className="text-slate-500">Programmazioni:</dt>
                <dd className="font-mono-num font-semibold">
                  {previewSummary.programmazioniCount} ({previewSummary.bozzeCount} bozze ·{' '}
                  {previewSummary.completateCount} completate · {previewSummary.archiviateCount}{' '}
                  archiviate)
                </dd>
                <dt className="text-slate-500">Voci libreria:</dt>
                <dd className="font-mono-num font-medium">{previewSummary.libraryCount}</dd>
                <dt className="text-slate-500">Regole locali:</dt>
                <dd className="font-mono-num font-medium">{previewSummary.rulesCount}</dd>
              </dl>

              <button
                type="button"
                onClick={() => setConfirmOverwrite(true)}
                className="mt-2 w-full rounded-lg bg-amber-700 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-800"
              >
                Conferma ripristino e sovrascrittura archivio locale
              </button>
            </div>
          )}

          {importError && (
            <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
              {importError}
            </p>
          )}
          {importSuccess && (
            <p
              role="status"
              className="rounded-lg bg-emerald-50 p-3 text-xs font-medium text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
            >
              {importSuccess}
            </p>
          )}
        </div>
      </div>

      <ConfirmModal
        open={confirmOverwrite}
        title="Sovrascrivere tutti i dati locali con il backup?"
        description={
          previewSummary
            ? `L’operazione sostituirà l’archivio attuale con ${previewSummary.programmazioniCount} programmazioni, ${previewSummary.libraryCount} voci di libreria e ${previewSummary.rulesCount} regole esportate il ${new Date(
                previewSummary.exportedAt
              ).toLocaleDateString('it-IT')}.`
            : ''
        }
        confirmLabel="Sì, ripristina il backup"
        destructive
        onCancel={() => setConfirmOverwrite(false)}
        onConfirm={handleConfirmRestore}
      />
    </div>
  );
}
