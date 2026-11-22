import {
  ArrowLeft,
  Eye,
  EyeOff,
  FileDown,
  FileText,
  FolderOpen,
  Printer,
  Sliders,
} from 'lucide-react';
import { useState } from 'react';
import { DocumentSheetPreview } from '../components/DocumentSheetPreview';
import type {
  DocenteGenere,
  DocumentLayoutStyle,
  DocxMappingSchema,
  Programmazione,
  SchoolSettings,
} from '../domain/types';
import { downloadProgrammazioneDocx } from '../export/docxGenerator';
import { downloadProgrammazionePdf } from '../export/pdfGenerator';
import type { SaveFileResult, SaveTargetMode } from '../storage/saveDirectoryService';

interface PreviewExportPageProps {
  plan: Programmazione;
  settings: SchoolSettings;
  mapping: DocxMappingSchema;
  onChangeLayout?: (layout: DocumentLayoutStyle) => Promise<void> | void;
  onChangeDocenteGenere?: (genere: DocenteGenere) => Promise<void> | void;
  onBackToEditor: () => void;
  onOpenMappingSettings: () => void;
}

export function PreviewExportPage({
  plan,
  settings,
  mapping,
  onChangeLayout,
  onChangeDocenteGenere,
  onBackToEditor,
  onOpenMappingSettings,
}: PreviewExportPageProps) {
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'docx' | 'pdf' | null>(null);
  const [showInstitutionBanner, setShowInstitutionBanner] = useState(false);
  const [saveMode, setSaveMode] = useState<SaveTargetMode>('auto');

  const activeLayout: DocumentLayoutStyle =
    plan.datiGenerali.layoutDocumento ?? settings.defaultLayoutDocumento ?? 'originale';
  const activeGenere: DocenteGenere =
    plan.datiGenerali.docenteGenere ?? settings.defaultDocenteGenere ?? 'F';

  const formatSaveSuccess = (label: string, res: SaveFileResult): string => {
    if (res.cancelled) {
      return 'Salvataggio annullato.';
    }
    const base = res.folderName
      ? `${label} salvato nella cartella «${res.folderName}»: ${res.filename}`
      : `${label} esportato localmente: ${res.filename}`;
    return res.warning ? `${base} (${res.warning})` : base;
  };

  const handleExportDocx = async () => {
    setBusy('docx');
    setExportError(null);
    setExportMessage(null);
    try {
      const res = await downloadProgrammazioneDocx(plan, settings, mapping, saveMode);
      setExportMessage(formatSaveSuccess('Documento Word', res));
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : 'Errore durante la generazione del file DOCX.'
      );
    } finally {
      setBusy(null);
    }
  };

  const handleExportPdf = async () => {
    setBusy('pdf');
    setExportError(null);
    setExportMessage(null);
    try {
      const res = await downloadProgrammazionePdf(plan, settings, mapping, saveMode);
      setExportMessage(formatSaveSuccess('Documento PDF A4', res));
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : 'Errore durante la generazione del file PDF.'
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToEditor}
            className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Torna all’editor
          </button>
          <div>
            <h1 className="text-base font-bold text-slate-900 sm:text-lg dark:text-slate-100">
              Anteprima A4 ed esportazione locale
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Layout:{' '}
              <strong>
                {activeLayout === 'originale' ? 'Modello originale' : 'Stile moderno PIANORAMA'}
              </strong>{' '}
              · Mappatura <span className="font-mono-num">{mapping.templateFileName}</span> (v
              {mapping.schemaVersion})
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onChangeDocenteGenere && (
            <div
              role="group"
              aria-label="Titolo docente"
              className="inline-flex rounded-lg border border-slate-300 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-950"
            >
              <button
                type="button"
                onClick={() => void onChangeDocenteGenere('F')}
                className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
                  activeGenere === 'F'
                    ? 'bg-[#1F3864] text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
                }`}
              >
                Prof.ssa · La docente
              </button>
              <button
                type="button"
                onClick={() => void onChangeDocenteGenere('M')}
                className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
                  activeGenere === 'M'
                    ? 'bg-[#1F3864] text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
                }`}
              >
                Prof. · Il docente
              </button>
            </div>
          )}

          {onChangeLayout && (
            <div
              role="group"
              aria-label="Stile del documento"
              className="inline-flex rounded-lg border border-slate-300 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-950"
            >
              <button
                type="button"
                onClick={() => void onChangeLayout('originale')}
                className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
                  activeLayout === 'originale'
                    ? 'bg-[#1F3864] text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
                }`}
              >
                Modello originale
              </button>
              <button
                type="button"
                onClick={() => void onChangeLayout('moderno')}
                className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
                  activeLayout === 'moderno'
                    ? 'bg-[#1F3864] text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
                }`}
              >
                Stile moderno
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowInstitutionBanner((v) => !v)}
            className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {showInstitutionBanner ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
            {showInstitutionBanner ? 'Nascondi banner' : 'Mostra banner'}
          </button>
          <button
            type="button"
            onClick={onOpenMappingSettings}
            className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Sliders className="h-3.5 w-3.5" />
            Schema DOCX
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Printer className="h-3.5 w-3.5" />
            Stampa
          </button>

          <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
            <FolderOpen className="h-3.5 w-3.5 text-[#1F3864] dark:text-blue-400" />
            <span className="sr-only">Destinazione salvataggio</span>
            <select
              aria-label="Destinazione salvataggio"
              value={saveMode}
              onChange={(e) => setSaveMode(e.target.value as SaveTargetMode)}
              className="bg-transparent text-xs font-semibold focus:outline-none"
            >
              <option value="auto">
                {settings.defaultSaveFolderName
                  ? `Cartella: ${settings.defaultSaveFolderName}`
                  : settings.saveBehavior === 'ask_each_time'
                  ? 'Scegli cartella...'
                  : 'Salvataggio predefinito'}
              </option>
              <option value="pick_folder">Scegli cartella ora...</option>
              <option value="browser_download">Download standard browser</option>
            </select>
          </label>

          <button
            type="button"
            disabled={busy !== null}
            onClick={handleExportPdf}
            className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-[#1F3864] px-3.5 py-2 text-xs font-semibold text-[#1F3864] hover:bg-blue-50 disabled:opacity-60 dark:border-blue-400 dark:text-blue-300 dark:hover:bg-slate-800"
          >
            <FileText className="h-3.5 w-3.5" />
            {busy === 'pdf' ? 'Generazione PDF...' : 'Esporta PDF'}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={handleExportDocx}
            className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg bg-[#1F3864] px-4 py-2 text-xs font-semibold text-white hover:bg-[#172b4d] disabled:opacity-60"
          >
            <FileDown className="h-3.5 w-3.5" />
            {busy === 'docx' ? 'Generazione DOCX...' : 'Esporta DOCX'}
          </button>
        </div>
      </div>

      {exportMessage && (
        <div
          role="status"
          className="no-print rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
        >
          {exportMessage}
        </div>
      )}
      {exportError && (
        <div
          role="alert"
          className="no-print rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
        >
          {exportError}
        </div>
      )}

      <div className="rounded-xl bg-slate-200/70 p-3 sm:p-6 dark:bg-slate-950">
        <DocumentSheetPreview
          plan={plan}
          settings={settings}
          mapping={mapping}
          showInstitutionBanner={showInstitutionBanner}
        />
      </div>
    </div>
  );
}
