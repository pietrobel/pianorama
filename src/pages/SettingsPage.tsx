import {
  CheckCircle2,
  Download,
  Monitor,
  Moon,
  RotateCcw,
  Save,
  ShieldCheck,
  Smartphone,
  Sun,
} from 'lucide-react';
import { useState } from 'react';
import { ConfirmModal } from '../components/ConfirmModal';
import { PlessoSelect } from '../components/PlessoSelect';
import {
  DEFAULT_SOGLIE_FASCE,
  DEFAULT_SOGLIE_QUOTE_CARATTERISTICHE,
  DISCIPLINE_SECONDARIA,
} from '../domain/defaults';
import type {
  DocenteGenere,
  DocumentLayoutStyle,
  DocxMappingSchema,
  SchoolSettings,
  SoglieFasce,
  SoglieQuoteCaratteristiche,
  TextScalePreference,
  ThemePreference,
} from '../domain/types';

interface SettingsPageProps {
  settings: SchoolSettings;
  mapping: DocxMappingSchema;
  canInstallPWA: boolean;
  isPWAInstalled: boolean;
  existingPlansCount?: number;
  onInstallPWA: () => Promise<boolean>;
  onSaveSettings: (next: SchoolSettings) => Promise<void>;
  onApplyDocenteGenereToAllPlans?: (genere: DocenteGenere) => Promise<number>;
  onSaveMapping: (next: DocxMappingSchema) => Promise<void>;
  onResetMapping: () => Promise<void>;
  onOpenPrivacyModal: () => void;
}

export function SettingsPage({
  settings,
  mapping,
  canInstallPWA,
  isPWAInstalled,
  existingPlansCount = 0,
  onInstallPWA,
  onSaveSettings,
  onApplyDocenteGenereToAllPlans,
  onSaveMapping,
  onResetMapping,
  onOpenPrivacyModal,
}: SettingsPageProps) {
  const [form, setForm] = useState<SchoolSettings>({
    ...settings,
    defaultDocenteGenere: settings.defaultDocenteGenere ?? 'F',
    defaultLayoutDocumento: settings.defaultLayoutDocumento ?? 'originale',
  });
  const [mappingText, setMappingText] = useState<string>(() => JSON.stringify(mapping, null, 2));
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [mappingError, setMappingError] = useState<string | null>(null);
  const [confirmResetMap, setConfirmResetMap] = useState(false);
  const [showCustomInstitution, setShowCustomInstitution] = useState(false);

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsError(null);
    const s = form.soglieFasce;
    if (
      !(
        s.sogliaMinimaValida >= 0 &&
        s.sogliaMinimaValida < s.sogliaMedioBasso &&
        s.sogliaMedioBasso < s.sogliaMedio &&
        s.sogliaMedio < s.sogliaAlto &&
        s.sogliaAlto <= 10
      )
    ) {
      setSettingsError(
        'Le soglie delle fasce devono essere strettamente crescenti (es. 4 < 5,5 < 6,5 < 8,5 ≤ 10).'
      );
      return;
    }
    const sq = form.soglieQuoteCaratteristiche ?? DEFAULT_SOGLIE_QUOTE_CARATTERISTICHE;
    if (
      !(
        sq.pochiMin >= 1 &&
        sq.pochiMin < sq.unaParteMin &&
        sq.unaParteMin < sq.circaMetaMin &&
        sq.circaMetaMin < sq.laMaggiorParteMin &&
        sq.laMaggiorParteMin < sq.quasiTuttaLaClasseMin &&
        sq.quasiTuttaLaClasseMin < sq.tuttaLaClasse &&
        sq.tuttaLaClasse <= 100
      )
    ) {
      setSettingsError(
        'Le soglie delle espressioni verbali (Pochi < Una parte < Circa metà < La maggior parte < Quasi tutta < Tutta la classe) devono essere strettamente crescenti tra 1 e 100.'
      );
      return;
    }
    await onSaveSettings({ ...form, soglieQuoteCaratteristiche: sq });
    setStatusMsg('Impostazioni, soglie fasce e soglie caratteristiche classe salvate localmente.');
  };

  const updateSoglia = (key: keyof SoglieFasce, rawValue: string) => {
    const parsed = Number(rawValue.replace(',', '.'));
    setForm((prev) => ({
      ...prev,
      soglieFasce: {
        ...prev.soglieFasce,
        [key]: Number.isFinite(parsed) ? parsed : prev.soglieFasce[key],
      },
    }));
  };

  const updateSogliaQuota = (key: keyof SoglieQuoteCaratteristiche, rawValue: string) => {
    const parsed = Math.round(Number(rawValue));
    const current = form.soglieQuoteCaratteristiche ?? DEFAULT_SOGLIE_QUOTE_CARATTERISTICHE;
    setForm((prev) => ({
      ...prev,
      soglieQuoteCaratteristiche: {
        ...current,
        [key]: Number.isFinite(parsed) ? Math.min(100, Math.max(1, parsed)) : current[key],
      },
    }));
  };

  const handleSaveMappingJson = async () => {
    setMappingError(null);
    try {
      const parsed = JSON.parse(mappingText) as DocxMappingSchema;
      if (!parsed.schemaVersion || !parsed.typography || !Array.isArray(parsed.sections)) {
        throw new Error(
          'Lo schema di mappatura deve contenere schemaVersion, typography e sections.'
        );
      }
      await onSaveMapping(parsed);
      setStatusMsg('Schema di mappatura DOCX salvato localmente.');
    } catch (err) {
      setMappingError(err instanceof Error ? err.message : 'JSON non valido.');
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Impostazioni e schema DOCX
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Valori predefiniti di lavoro, accessibilità visiva, installazione PWA e mappatura del modello DOCX
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenPrivacyModal}
          className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          <ShieldCheck className="h-4 w-4 text-[#1F3864] dark:text-blue-400" />
          Rileggi informativa privacy
        </button>
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

      {/* Installazione offline PWA */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-[#1F3864] dark:text-blue-400" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                App installabile e funzionamento offline (PWA)
              </h2>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                {isPWAInstalled
                  ? 'PIANORAMA è già installata come applicazione autonoma su questo dispositivo.'
                  : canInstallPWA
                  ? 'Puoi installare PIANORAMA sul desktop o sul tablet per aprirla anche senza connessione Internet.'
                  : 'Il service worker è attivo: dopo il primo caricamento tutti i moduli e i font restano memorizzati offline nel browser.'}
              </p>
            </div>
          </div>
          {canInstallPWA && !isPWAInstalled && (
            <button
              type="button"
              onClick={onInstallPWA}
              className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg bg-[#1F3864] px-4 py-2 text-xs font-semibold text-white hover:bg-[#172b4d]"
            >
              <Download className="h-3.5 w-3.5" />
              Installa PIANORAMA
            </button>
          )}
        </div>
      </section>

      {/* Dati scuola & docente + Tema */}
      <form
        onSubmit={handleSaveGeneral}
        className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
      >
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
          Valori predefiniti di lavoro e docente
        </h2>

        <div className="sm:col-span-2">
          <button
            type="button"
            onClick={() => setShowCustomInstitution((v) => !v)}
            className="text-xs font-semibold text-[#1F3864] hover:underline dark:text-blue-400"
          >
            {showCustomInstitution
              ? 'Nascondi intestazione testuale personalizzata (solo per esportazione)'
              : 'Personalizza intestazione testuale per l’esportazione (opzionale — il banner grafico è già incluso nel documento)'}
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {showCustomInstitution && (
            <>
              <label className="block sm:col-span-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Ministero
                </span>
                <input
                  type="text"
                  value={form.ministryHeader}
                  onChange={(e) => setForm({ ...form, ministryHeader: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Denominazione Istituto (usata solo nello stile moderno o fallback)
                </span>
                <input
                  type="text"
                  value={form.schoolName}
                  onChange={(e) => setForm({ ...form, schoolName: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Indirizzo, distretto e codice fiscale
                </span>
                <input
                  type="text"
                  value={form.schoolAddressLine}
                  onChange={(e) => setForm({ ...form, schoolAddressLine: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Contatti e sito web istituzionale
                </span>
                <input
                  type="text"
                  value={form.schoolContactsLine}
                  onChange={(e) => setForm({ ...form, schoolContactsLine: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
            </>
          )}

          <div className="space-y-1.5">
            <label className="block">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Genere / Titolo docente predefinito
              </span>
              <select
                value={form.defaultDocenteGenere ?? 'F'}
                onChange={(e) => {
                  const nextGenere = e.target.value as DocenteGenere;
                  const next = { ...form, defaultDocenteGenere: nextGenere };
                  setForm(next);
                  void onSaveSettings(next);
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="F">Professoressa (Prof.ssa · La docente)</option>
                <option value="M">Professore (Prof. · Il docente)</option>
              </select>
            </label>
            {onApplyDocenteGenereToAllPlans && existingPlansCount > 0 && (
              <button
                type="button"
                onClick={async () => {
                  const genere = form.defaultDocenteGenere ?? 'F';
                  const updatedCount = await onApplyDocenteGenereToAllPlans(genere);
                  setStatusMsg(
                    `Titolo "${genere === 'M' ? 'Prof. · Il docente' : 'Prof.ssa · La docente'}" applicato a ${updatedCount} programmazioni esistenti.`
                  );
                }}
                className="text-xs font-semibold text-[#1F3864] hover:underline dark:text-blue-400"
              >
                Applica questo titolo anche alle {existingPlansCount} programmazioni esistenti
              </button>
            )}
          </div>

          <label className="block">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Docente predefinito (Nome e Cognome)
            </span>
            <input
              type="text"
              value={form.defaultDocente}
              onChange={(e) => setForm({ ...form, defaultDocente: e.target.value })}
              placeholder="Nome Cognome (senza Prof./Prof.ssa)"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Disciplina predefinita
            </span>
            <select
              value={form.defaultDisciplina}
              onChange={(e) => setForm({ ...form, defaultDisciplina: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            >
              {DISCIPLINE_SECONDARIA.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <PlessoSelect
            label="Plesso predefinito"
            value={form.defaultPlesso}
            onChange={(nextPlesso) => setForm({ ...form, defaultPlesso: nextPlesso })}
            labelClassName="text-xs font-semibold text-slate-700 dark:text-slate-300"
          />
          <label className="block">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Anno scolastico predefinito
            </span>
            <input
              type="text"
              value={form.defaultAnnoScolastico}
              onChange={(e) => setForm({ ...form, defaultAnnoScolastico: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Layout documento predefinito (anteprima, DOCX e PDF)
            </span>
            <select
              value={form.defaultLayoutDocumento ?? 'originale'}
              onChange={(e) =>
                setForm({
                  ...form,
                  defaultLayoutDocumento: e.target.value as DocumentLayoutStyle,
                })
              }
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="originale">Modello originale (banner grafico e struttura 4 pagine)</option>
              <option value="moderno">Stile moderno PIANORAMA (blu istituzionale)</option>
            </select>
          </label>
        </div>

        {/* Aspetto e accessibilità */}
        <div className="grid gap-4 border-t border-slate-200 pt-4 sm:grid-cols-3 dark:border-slate-800">
          <div>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tema</span>
            <div className="mt-1.5 grid grid-cols-3 gap-1.5">
              {(
                [
                  ['chiaro', 'Chiaro', Sun],
                  ['scuro', 'Scuro', Moon],
                  ['sistema', 'Sistema', Monitor],
                ] as const
              ).map(([val, lbl, Icon]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    const next = { ...form, theme: val as ThemePreference };
                    setForm(next);
                    void onSaveSettings(next);
                  }}
                  className={`flex items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs font-medium ${
                    form.theme === val
                      ? 'border-[#1F3864] bg-[#1F3864] text-white'
                      : 'border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Dimensione testo
            </span>
            <select
              value={form.textScale}
              onChange={(e) => {
                const next = { ...form, textScale: e.target.value as TextScalePreference };
                setForm(next);
                void onSaveSettings(next);
              }}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="normale">Normale (16px)</option>
              <option value="grande">Grande (18px)</option>
              <option value="molto_grande">Molto grande (20px)</option>
            </select>
          </div>

          <label className="block">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Promemoria backup (giorni)
            </span>
            <input
              type="number"
              min={1}
              max={90}
              value={form.backupReminderDays}
              onChange={(e) =>
                setForm({
                  ...form,
                  backupReminderDays: Math.max(1, Number(e.target.value) || 14),
                })
              }
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-1.5 font-mono-num text-sm dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
        </div>

        {/* Soglie delle fasce di livello */}
        <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Soglie automatiche per le fasce di livello (import registro .xlsx)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                La media esatta viene confrontata con queste soglie senza arrotondamento preventivo. Sotto la soglia minima l’alunno va in “Da verificare”.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setForm((prev) => ({ ...prev, soglieFasce: { ...DEFAULT_SOGLIE_FASCE } }))
              }
              className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RotateCcw className="h-3 w-3" />
              Valori predefiniti
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <label className="block">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Minima valida (&lt; → Da verificare)
              </span>
              <input
                type="number"
                step="0.1"
                min={0}
                max={9.5}
                value={form.soglieFasce.sogliaMinimaValida}
                onChange={(e) => updateSoglia('sogliaMinimaValida', e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 font-mono-num text-sm dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Inizio Fascia 6 (Medio/basso)
              </span>
              <input
                type="number"
                step="0.05"
                min={1}
                max={9.5}
                value={form.soglieFasce.sogliaMedioBasso}
                onChange={(e) => updateSoglia('sogliaMedioBasso', e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 font-mono-num text-sm dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Inizio Fascia 7-8 (Medio)
              </span>
              <input
                type="number"
                step="0.05"
                min={1}
                max={9.8}
                value={form.soglieFasce.sogliaMedio}
                onChange={(e) => updateSoglia('sogliaMedio', e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 font-mono-num text-sm dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Inizio Fascia 9-10 (Alto)
              </span>
              <input
                type="number"
                step="0.05"
                min={1}
                max={10}
                value={form.soglieFasce.sogliaAlto}
                onChange={(e) => updateSoglia('sogliaAlto', e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 font-mono-num text-sm dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
          </div>
          {/* Soglie delle espressioni verbali per le caratteristiche della classe (5.8) */}
          <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Soglie percentuali per le frasi sulle caratteristiche della classe
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Conversione automatica della quota del segmento in espressione verbale (predefiniti: 1% pochi, 10% una parte, 40% circa metà, 51% la maggior parte, 85% quasi tutta, 100% tutta la classe).
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    soglieQuoteCaratteristiche: { ...DEFAULT_SOGLIE_QUOTE_CARATTERISTICHE },
                  }))
                }
                className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <RotateCcw className="h-3 w-3" />
                Valori predefiniti
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {(
                [
                  ['pochiMin', 'Pochi (da %)'],
                  ['unaParteMin', 'Una parte (da %)'],
                  ['circaMetaMin', 'Circa metà (da %)'],
                  ['laMaggiorParteMin', 'La maggior parte (da %)'],
                  ['quasiTuttaLaClasseMin', 'Quasi tutta (da %)'],
                  ['tuttaLaClasse', 'Tutta la classe (%)'],
                ] as const
              ).map(([key, label]) => {
                const soglieQ =
                  form.soglieQuoteCaratteristiche ?? DEFAULT_SOGLIE_QUOTE_CARATTERISTICHE;
                return (
                  <label key={key} className="block">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {label}
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={soglieQ[key]}
                      onChange={(e) => updateSogliaQuota(key, e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 font-mono-num text-sm dark:border-slate-700 dark:bg-slate-950"
                    />
                  </label>
                );
              })}
            </div>
          </div>

          {settingsError && (
            <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
              {settingsError}
            </p>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1F3864] px-4 py-2 text-sm font-semibold text-white hover:bg-[#172b4d]"
          >
            <Save className="h-4 w-4" />
            Salva impostazioni
          </button>
        </div>
      </form>

      {/* Schema di mappatura DOCX */}
      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Schema di mappatura modello DOCX (modificabile)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Collega ogni campo dell’app alle sezioni, al carattere (Garamond), al colore (#1F3864) e alle opzioni di {mapping.templateFileName}.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setConfirmResetMap(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Ripristina schema predefinito
          </button>
        </div>

        <textarea
          rows={12}
          value={mappingText}
          onChange={(e) => setMappingText(e.target.value)}
          spellCheck={false}
          className="font-mono-num w-full rounded-lg border border-slate-300 bg-slate-50 p-3 text-xs leading-relaxed text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />
        {mappingError && <p className="text-xs font-medium text-red-600">{mappingError}</p>}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSaveMappingJson}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1F3864] px-4 py-2 text-xs font-semibold text-white hover:bg-[#172b4d]"
          >
            <Save className="h-3.5 w-3.5" />
            Salva schema DOCX
          </button>
        </div>
      </section>

      {/* Nota tecnica Windows PWA vs Tauri vs Electron */}
      <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-6 text-xs leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
          Come trasformare PIANORAMA in app installabile o eseguibile Windows (.exe / .msi)
        </h2>
        <p>
          <strong>1. App desktop installabile subito (PWA):</strong> da Chrome o Edge premere l’icona di installazione nella barra indirizzi (o <em>Installa</em> qui sopra). Su Windows, tuttavia, una PWA resta legata alla cache del browser (una pulizia può svuotare IndexedDB) e i criteri di rete scolastici possono limitare i service worker.
        </p>
        <p>
          <strong>2. Eseguibile autonomo Windows con Tauri (raccomandato rispetto a Electron):</strong> Tauri utilizza il componente nativo WebView2 di Windows 10/11 generando un programma d’installazione <code>.exe</code> / <code>.msi</code> di circa 5–10 MB (contro 120+ MB di Electron), con permessi file-system granulari e possibilità di sostituire <code>DexiePianoramaRepository</code> con SQLite locale grazie all’interfaccia <code>PianoramaRepository</code>. I comandi completi sono riportati nel file <code>README.md</code> del progetto.
        </p>
      </section>

      <ConfirmModal
        open={confirmResetMap}
        title="Ripristinare lo schema di mappatura DOCX predefinito?"
        description="Eventuali modifiche manuali allo schema JSON locale verranno sostituite dalla mappatura ufficiale predefinita."
        confirmLabel="Ripristina schema"
        onCancel={() => setConfirmResetMap(false)}
        onConfirm={async () => {
          await onResetMapping();
          setConfirmResetMap(false);
          setStatusMsg('Schema DOCX ripristinato.');
        }}
      />
    </div>
  );
}
