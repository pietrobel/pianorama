import {
  BookOpen,
  Download,
  FilePlus2,
  FileSpreadsheet,
  FolderKanban,
  HardDriveDownload,
  Lock,
  RefreshCw,
  Settings,
  Sliders,
  WifiOff,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
  PasswordGate,
  isAccessUnlocked,
  setAccessUnlocked,
} from './components/PasswordGate';
import type {
  BackupMergeOptions,
  BackupRestoreResult,
} from './crypto/backupCrypto';
import { DEFAULT_SCHOOL_SETTINGS } from './domain/defaults';
import type {
  AnonymousStudentBandEntry,
  BackupPlainData,
  CurricoloCatalogEntry,
  DocenteGenere,
  DocxMappingSchema,
  LibraryItem,
  PlanStatus,
  Programmazione,
  SchoolSettings,
  SuggestionRule,
} from './domain/types';
import { computeLivelliFromStudents } from './engine/gradebookImporter';
import { cloneProgrammazioneWithOptions, getSectionOptionsForPreset } from './engine/planCloning';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { usePWAInstall } from './hooks/usePWAInstall';
import { usePWAUpdate } from './hooks/usePWAUpdate';
import { BackupPage } from './pages/BackupPage';
import { DashboardPage } from './pages/DashboardPage';
import { GradebookImportPage } from './pages/GradebookImportPage';
import { LibraryPage } from './pages/LibraryPage';
import { NewPlanPage } from './pages/NewPlanPage';
import { PlanEditorPage } from './pages/PlanEditorPage';
import { PreviewExportPage } from './pages/PreviewExportPage';
import { RulesPage } from './pages/RulesPage';
import { SettingsPage } from './pages/SettingsPage';
import { WelcomePrivacyModal } from './pages/WelcomePrivacyModal';
import { repository } from './storage/dexieRepository';

type AppRoute =
  | { page: 'dashboard' }
  | { page: 'new'; sourceId?: string | null }
  | { page: 'editor'; planId: string }
  | { page: 'preview'; planId: string }
  | { page: 'gradebook'; planId?: string | null }
  | { page: 'library' }
  | { page: 'rules' }
  | { page: 'backup' }
  | { page: 'settings' };

export default function App() {
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [route, setRoute] = useState<AppRoute>({ page: 'dashboard' });

  const [programmazioni, setProgrammazioni] = useState<Programmazione[]>([]);
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [curricoloCatalog, setCurricoloCatalog] = useState<CurricoloCatalogEntry[]>([]);
  const [rules, setRules] = useState<SuggestionRule[]>([]);
  const [settings, setSettings] = useState<SchoolSettings>(DEFAULT_SCHOOL_SETTINGS);
  const [mapping, setMapping] = useState<DocxMappingSchema | null>(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [unlocked, setUnlocked] = useState<boolean>(() => isAccessUnlocked());

  const isOnline = useOnlineStatus();
  const { canInstall, isInstalled, isIOS, triggerInstall } = usePWAInstall();
  const pwaUpdate = usePWAUpdate();
  const [showHeaderCheckBanner, setShowHeaderCheckBanner] = useState(false);
  const [showIOSInstallGuide, setShowIOSInstallGuide] = useState(false);

  const handleHeaderCheckUpdates = async () => {
    setShowHeaderCheckBanner(true);
    await pwaUpdate.checkForUpdates();
  };

  const loadAllFromStorage = useCallback(async () => {
    try {
      await repository.init();
      const [plans, lib, catalog, rls, cfg, map] = await Promise.all([
        repository.listProgrammazioni(),
        repository.listLibraryItems(),
        repository.getCurricoloCatalog(),
        repository.listRules(),
        repository.getSettings(),
        repository.getDocxMapping(),
      ]);
      setProgrammazioni(plans);
      setLibrary(lib);
      setCurricoloCatalog(catalog);
      setRules(rls);
      setSettings(cfg);
      setMapping(map);
      if (!cfg.privacyAcknowledgedAt) {
        setShowWelcomeModal(true);
      }
      setInitError(null);
    } catch (err) {
      setInitError(
        err instanceof Error ? err.message : 'Impossibile aprire lo storage locale IndexedDB.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAllFromStorage();
  }, [loadAllFromStorage]);

  // Applica tema (chiaro / scuro / sistema) e dimensione testo
  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const darkActive =
        settings.theme === 'scuro' || (settings.theme === 'sistema' && media.matches);
      root.classList.toggle('dark', darkActive);
    };

    applyTheme();
    media.addEventListener('change', applyTheme);

    root.classList.remove('text-scale-normal', 'text-scale-large', 'text-scale-xlarge');
    if (settings.textScale === 'grande') root.classList.add('text-scale-large');
    else if (settings.textScale === 'molto_grande') root.classList.add('text-scale-xlarge');
    else root.classList.add('text-scale-normal');

    return () => media.removeEventListener('change', applyTheme);
  }, [settings.theme, settings.textScale]);

  const handleAcknowledgePrivacy = async () => {
    const updated: SchoolSettings = {
      ...settings,
      privacyAcknowledgedAt: new Date().toISOString(),
    };
    setSettings(updated);
    setShowWelcomeModal(false);
    await repository.saveSettings(updated);
  };

  const handleCreatePlan = async (plan: Programmazione) => {
    await repository.saveProgrammazione(plan);
    setProgrammazioni((prev) => [plan, ...prev]);
    setRoute({ page: 'editor', planId: plan.id });
  };

  const handleSavePlan = useCallback(async (plan: Programmazione) => {
    await repository.saveProgrammazione(plan);
    setProgrammazioni((prev) => {
      const exists = prev.some((p) => p.id === plan.id);
      if (!exists) return [plan, ...prev];
      return prev.map((p) => (p.id === plan.id ? { ...plan, updatedAt: new Date().toISOString() } : p));
    });
  }, []);

  const handleSaveAsTemplateCopy = async (source: Programmazione, templateNome: string) => {
    const templateCopy = cloneProgrammazioneWithOptions({
      source,
      settings,
      preset: 'completa',
      sections: getSectionOptionsForPreset('completa'),
      overrides: {
        disciplina: source.datiGenerali.disciplina,
        classe: source.datiGenerali.classe,
        sezione: source.datiGenerali.sezione,
        annoScolastico: source.datiGenerali.annoScolastico,
        plesso: source.datiGenerali.plesso,
        docente: source.datiGenerali.docente,
        isTemplate: true,
        templateNome,
      },
    });
    await repository.saveProgrammazione(templateCopy);
    setProgrammazioni((prev) => [templateCopy, ...prev]);
  };

  const handleDuplicatePlan = async (source: Programmazione) => {
    const copy = cloneProgrammazioneWithOptions({
      source,
      settings,
      preset: 'completa',
      sections: getSectionOptionsForPreset('completa'),
      overrides: {
        disciplina: source.datiGenerali.disciplina,
        classe: source.datiGenerali.classe,
        sezione: `${source.datiGenerali.sezione}2`,
        annoScolastico: source.datiGenerali.annoScolastico,
        plesso: source.datiGenerali.plesso,
        docente: source.datiGenerali.docente,
      },
    });
    await repository.saveProgrammazione(copy);
    setProgrammazioni((prev) => [copy, ...prev]);
    setRoute({ page: 'editor', planId: copy.id });
  };

  const handleChangeStatus = async (id: string, stato: PlanStatus) => {
    const target = programmazioni.find((p) => p.id === id);
    if (!target) return;
    const updated: Programmazione = {
      ...target,
      stato,
      cronologiaModifiche: [
        {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          evento: 'Cambio stato',
          dettaglio: `Stato aggiornato a "${stato}".`,
        },
        ...(target.cronologiaModifiche ?? []),
      ],
    };
    await repository.saveProgrammazione(updated);
    setProgrammazioni((prev) => prev.map((p) => (p.id === id ? updated : p)));
  };

  const handleDeletePlan = async (id: string) => {
    await repository.deleteProgrammazione(id);
    setProgrammazioni((prev) => prev.filter((p) => p.id !== id));
    if (
      (route.page === 'editor' || route.page === 'preview') &&
      route.planId === id
    ) {
      setRoute({ page: 'dashboard' });
    }
  };

  const handleSaveLibraryItem = async (item: LibraryItem) => {
    await repository.saveLibraryItem(item);
    const all = await repository.listLibraryItems();
    setLibrary(all);
  };

  const handleBulkImportLibrary = async (items: LibraryItem[]) => {
    await repository.bulkImportLibraryItems(items);
    const all = await repository.listLibraryItems();
    setLibrary(all);
  };

  const handleReplaceCurricoloCatalog = async (items: CurricoloCatalogEntry[]) => {
    await repository.saveCurricoloCatalog(items);
    setCurricoloCatalog(items);
  };

  const handleResetCurricoloCatalog = async () => {
    const fresh = await repository.resetDefaultCurricoloCatalog();
    setCurricoloCatalog(fresh);
  };

  const handleSaveRule = async (rule: SuggestionRule) => {
    await repository.saveRule(rule);
    const all = await repository.listRules();
    setRules(all);
  };

  const handleDeleteRule = async (id: string) => {
    await repository.deleteRule(id);
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const handleResetRules = async () => {
    const fresh = await repository.resetDefaultRules();
    setRules(fresh);
  };

  const handleSaveSettings = async (next: SchoolSettings) => {
    await repository.saveSettings(next);
    setSettings(next);
  };

  const handleApplyDocenteGenereToAllPlans = async (genere: DocenteGenere): Promise<number> => {
    const updatedPlans = programmazioni.map((plan) => ({
      ...plan,
      updatedAt: new Date().toISOString(),
      datiGenerali: {
        ...plan.datiGenerali,
        docenteGenere: genere,
      },
    }));
    await Promise.all(updatedPlans.map((p) => repository.saveProgrammazione(p)));
    setProgrammazioni(updatedPlans);
    return updatedPlans.length;
  };

  const handleSaveMapping = async (next: DocxMappingSchema) => {
    await repository.saveDocxMapping(next);
    setMapping(next);
  };

  const handleResetMapping = async () => {
    const fresh = await repository.resetDefaultDocxMapping();
    setMapping(fresh);
  };

  const handleRestoreAll = async (
    data: BackupPlainData,
    options: BackupMergeOptions
  ): Promise<BackupRestoreResult> => {
    const result = await repository.restoreAllData(data, options);
    await loadAllFromStorage();
    return result;
  };

  const handleMarkBackupDone = async () => {
    const next: SchoolSettings = { ...settings, lastBackupAt: new Date().toISOString() };
    await repository.saveSettings(next);
    setSettings(next);
  };

  const handleApplyGradebookToPlan = async (
    planId: string,
    entries: AnonymousStudentBandEntry[],
    classeRilevata: string
  ) => {
    const target = programmazioni.find((p) => p.id === planId);
    if (!target) return;
    const livelli = computeLivelliFromStudents(entries);
    const updated: Programmazione = {
      ...target,
      analisiPartenza: {
        ...target.analisiPartenza,
        livelli,
        alunniAnonimiFasce: entries,
        registroClasseRilevata: classeRilevata,
      },
      cronologiaModifiche: [
        {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          evento: 'Registro voti e fasce di livello',
          dettaglio: `Aggiornate fasce anonime (${entries.length} alunni${classeRilevata ? `, ${classeRilevata}` : ''}).`,
        },
        ...(target.cronologiaModifiche ?? []),
      ],
    };
    await repository.saveProgrammazione(updated);
    setProgrammazioni((prev) => prev.map((p) => (p.id === planId ? updated : p)));
  };

  const handleSyncComposizioneFromRoster = async (
    planId: string,
    totaleAlunni: number,
    totaleBes: number,
    totaleDisabilita = 0
  ) => {
    const target = programmazioni.find((p) => p.id === planId);
    if (!target) return;
    const updated: Programmazione = {
      ...target,
      composizione: {
        ...target.composizione,
        alunni: totaleAlunni,
        bes: totaleBes,
        disabilita: totaleDisabilita,
      },
    };
    await repository.saveProgrammazione(updated);
    setProgrammazioni((prev) => prev.map((p) => (p.id === planId ? updated : p)));
  };

  const activePlan =
    route.page === 'editor' || route.page === 'preview'
      ? programmazioni.find((p) => p.id === route.planId)
      : undefined;

  const navItems: {
    page: AppRoute['page'];
    label: string;
    icon: typeof FolderKanban;
  }[] = [
    { page: 'dashboard', label: 'Piani', icon: FolderKanban },
    { page: 'gradebook', label: 'Registro', icon: FileSpreadsheet },
    { page: 'library', label: 'Libreria', icon: BookOpen },
    { page: 'rules', label: 'Regole', icon: Sliders },
    { page: 'backup', label: 'Backup', icon: HardDriveDownload },
    { page: 'settings', label: 'Impostazioni', icon: Settings },
  ];

  return (
    <PasswordGate unlocked={unlocked} onUnlock={() => setUnlocked(true)}>
      <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        {/* Top Bar 3-zone contract */}
      <header className="no-print sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xs dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
          {/* Left: Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setRoute({ page: 'dashboard' })}
              className="flex items-center gap-2.5 text-left"
            >
              <img
                src="/icon.svg"
                alt=""
                className="h-8 w-8 rounded-lg"
                width={32}
                height={32}
              />
              <div>
                <span className="block text-sm font-bold tracking-tight text-[#1F3864] dark:text-white">
                  PIANORAMA
                </span>
                <span className="hidden text-[11px] text-slate-500 sm:block dark:text-slate-400">
                  Laboratorio piani di lavoro
                </span>
              </div>
            </button>

            {!isOnline && (
              <span
                title="Connessione assente: lavoro locale attivo"
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <WifiOff className="h-3 w-3" />
                Offline
              </span>
            )}
          </div>

          {/* Center: Navigation */}
          <nav aria-label="Navigazione principale" className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                route.page === item.page ||
                (item.page === 'dashboard' &&
                  (route.page === 'editor' || route.page === 'preview' || route.page === 'new'));
              return (
                <button
                  key={item.page}
                  type="button"
                  onClick={() => setRoute({ page: item.page } as AppRoute)}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    isActive
                      ? 'bg-[#1F3864] text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right: Primary CTA */}
          <div className="flex items-center gap-2 shrink-0">
            {pwaUpdate.needRefresh ? (
              <button
                type="button"
                onClick={() => void pwaUpdate.applyUpdate()}
                disabled={pwaUpdate.status === 'updating'}
                title="Nuova versione disponibile: clicca per aggiornare senza perdere i dati salvati"
                className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${pwaUpdate.status === 'updating' ? 'animate-spin' : ''}`}
                />
                <span>{pwaUpdate.status === 'updating' ? 'Aggiornamento...' : 'Aggiorna'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleHeaderCheckUpdates()}
                disabled={pwaUpdate.status === 'checking'}
                title="Controlla aggiornamenti da pianorama.vercel.app"
                aria-label="Controlla aggiornamenti"
                className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${pwaUpdate.status === 'checking' ? 'animate-spin' : ''}`}
                />
                <span className="hidden lg:inline">
                  {pwaUpdate.status === 'checking' ? 'Controllo...' : 'Aggiornamenti'}
                </span>
              </button>
            )}
            {canInstall && !isInstalled && (
              <button
                type="button"
                onClick={triggerInstall}
                className="hidden items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:inline-flex dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Download className="h-3.5 w-3.5" />
                Installa
              </button>
            )}
            {!canInstall && !isInstalled && isIOS && (
              <button
                type="button"
                onClick={() => setShowIOSInstallGuide(true)}
                className="hidden items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:inline-flex dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Download className="h-3.5 w-3.5" />
                Installa
              </button>
            )}
            <button
              type="button"
              onClick={() => setRoute({ page: 'new' })}
              className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg bg-[#1F3864] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#172b4d]"
            >
              <FilePlus2 className="h-3.5 w-3.5" />
              Nuova
            </button>
            <button
              type="button"
              onClick={() => {
                setAccessUnlocked(false);
                setUnlocked(false);
              }}
              title="Blocca l'accesso con password"
              aria-label="Blocca accesso"
              className="inline-flex items-center gap-1 whitespace-nowrap shrink-0 rounded-lg border border-slate-300 px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Lock className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Blocca</span>
            </button>
          </div>
        </div>

        {/* Navigazione compatta mobile */}
        <nav
          aria-label="Navigazione mobile"
          className="flex gap-1 overflow-x-auto border-t border-slate-200 px-3 py-1.5 md:hidden dark:border-slate-800"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = route.page === item.page;
            return (
              <button
                key={item.page}
                type="button"
                onClick={() => setRoute({ page: item.page } as AppRoute)}
                className={`inline-flex items-center gap-1 whitespace-nowrap shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium ${
                  isActive
                    ? 'bg-[#1F3864] text-white'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Banner aggiornamenti app PWA */}
      {((pwaUpdate.needRefresh && !pwaUpdate.bannerDismissed) ||
        (showHeaderCheckBanner && Boolean(pwaUpdate.statusMessage))) && (
        <div
          role="status"
          className={`no-print border-b px-4 py-2 text-xs ${
            pwaUpdate.needRefresh
              ? 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100'
              : pwaUpdate.status === 'offline' || pwaUpdate.status === 'error'
              ? 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100'
              : 'border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
          }`}
        >
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 sm:px-2">
            <span className="font-medium">
              {pwaUpdate.statusMessage ||
                'È disponibile una nuova versione di PIANORAMA: aggiorna mantenendo i curricoli e i piani salvati.'}
            </span>
            <div className="flex items-center gap-2">
              {pwaUpdate.needRefresh && (
                <button
                  type="button"
                  onClick={() => void pwaUpdate.applyUpdate()}
                  disabled={pwaUpdate.status === 'updating'}
                  className="inline-flex items-center gap-1 rounded-md bg-emerald-700 px-3 py-1 font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                >
                  <RefreshCw
                    className={`h-3 w-3 ${pwaUpdate.status === 'updating' ? 'animate-spin' : ''}`}
                  />
                  {pwaUpdate.status === 'updating' ? 'Aggiornamento...' : 'Aggiorna ora'}
                </button>
              )}
              <button
                type="button"
                aria-label="Chiudi avviso aggiornamento"
                onClick={() => {
                  setShowHeaderCheckBanner(false);
                  if (pwaUpdate.needRefresh) {
                    pwaUpdate.dismissBanner();
                  } else {
                    pwaUpdate.clearStatusMessage();
                  }
                }}
                className="rounded p-1 hover:bg-black/5 dark:hover:bg-white/10"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {loading ? (
          <div className="space-y-4">
            <div className="h-8 w-72 rounded-lg bg-slate-200 dark:bg-slate-800" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[1, 2, 3, 4].map((k) => (
                <div
                  key={k}
                  className="h-20 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                />
              ))}
            </div>
            <div className="h-64 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
          </div>
        ) : initError ? (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
          >
            <p className="font-bold">Errore nell’inizializzazione dell’archivio locale</p>
            <p className="mt-1">{initError}</p>
          </div>
        ) : (
          <>
            {route.page === 'dashboard' && (
              <DashboardPage
                programmazioni={programmazioni}
                settings={settings}
                onCreateNew={() => setRoute({ page: 'new' })}
                onImportDocument={handleCreatePlan}
                onReusePlan={(sourceId) => setRoute({ page: 'new', sourceId })}
                onOpenEditor={(planId) => setRoute({ page: 'editor', planId })}
                onOpenPreview={(planId) => setRoute({ page: 'preview', planId })}
                onDuplicate={handleDuplicatePlan}
                onChangeStatus={handleChangeStatus}
                onDelete={handleDeletePlan}
                onGoToBackup={() => setRoute({ page: 'backup' })}
              />
            )}

            {route.page === 'new' && (
              <NewPlanPage
                existingPlans={programmazioni}
                settings={settings}
                initialSourceId={route.sourceId}
                onCreatePlan={handleCreatePlan}
                onCancel={() => setRoute({ page: 'dashboard' })}
              />
            )}

            {route.page === 'editor' && activePlan && mapping && (
              <PlanEditorPage
                plan={activePlan}
                library={library}
                curricoloCatalog={curricoloCatalog}
                rules={rules}
                settings={settings}
                mapping={mapping}
                onSavePlan={handleSavePlan}
                onSaveAsTemplateCopy={handleSaveAsTemplateCopy}
                onBack={() => setRoute({ page: 'dashboard' })}
                onOpenExport={() => setRoute({ page: 'preview', planId: activePlan.id })}
              />
            )}

            {route.page === 'preview' && activePlan && mapping && (
              <PreviewExportPage
                plan={activePlan}
                settings={settings}
                mapping={mapping}
                onChangeLayout={async (layoutDocumento) => {
                  const updated: Programmazione = {
                    ...activePlan,
                    datiGenerali: {
                      ...activePlan.datiGenerali,
                      layoutDocumento,
                    },
                  };
                  await handleSavePlan(updated);
                }}
                onChangeDocenteGenere={async (docenteGenere) => {
                  const updated: Programmazione = {
                    ...activePlan,
                    datiGenerali: {
                      ...activePlan.datiGenerali,
                      docenteGenere,
                    },
                  };
                  await handleSavePlan(updated);
                }}
                onBackToEditor={() => setRoute({ page: 'editor', planId: activePlan.id })}
                onOpenMappingSettings={() => setRoute({ page: 'settings' })}
              />
            )}

            {route.page === 'gradebook' && (
              <GradebookImportPage
                programmazioni={programmazioni}
                settings={settings}
                initialPlanId={route.planId}
                onApplyToPlan={handleApplyGradebookToPlan}
                onSyncComposizione={handleSyncComposizioneFromRoster}
                onOpenPlanEditor={(planId) => setRoute({ page: 'editor', planId })}
                onOpenSettings={() => setRoute({ page: 'settings' })}
              />
            )}

            {route.page === 'library' && (
              <LibraryPage
                items={library}
                curricoloCatalog={curricoloCatalog}
                onSaveItem={handleSaveLibraryItem}
                onBulkImport={handleBulkImportLibrary}
                onReplaceCurricoloCatalog={handleReplaceCurricoloCatalog}
                onResetCurricoloCatalog={handleResetCurricoloCatalog}
              />
            )}

            {route.page === 'rules' && (
              <RulesPage
                rules={rules}
                onSaveRule={handleSaveRule}
                onDeleteRule={handleDeleteRule}
                onResetDefaults={handleResetRules}
              />
            )}

            {route.page === 'backup' && (
              <BackupPage
                settings={settings}
                existingPlans={programmazioni}
                onExportAll={() => repository.exportAllData()}
                onRestoreAll={handleRestoreAll}
                onMarkBackupDone={handleMarkBackupDone}
                onGoToPlans={() => setRoute({ page: 'dashboard' })}
              />
            )}

            {route.page === 'settings' && mapping && (
              <SettingsPage
                settings={settings}
                mapping={mapping}
                canInstallPWA={canInstall}
                isPWAInstalled={isInstalled}
                isIOS={isIOS}
                pwaUpdateStatus={pwaUpdate.status}
                pwaUpdateMessage={pwaUpdate.statusMessage}
                pwaNeedRefresh={pwaUpdate.needRefresh}
                pwaBuildId={pwaUpdate.currentBuildId}
                pwaBuiltAt={pwaUpdate.currentBuiltAt}
                pwaLastCheckedAt={pwaUpdate.lastCheckedAt}
                existingPlansCount={programmazioni.length}
                onInstallPWA={triggerInstall}
                onCheckPWAUpdates={pwaUpdate.checkForUpdates}
                onApplyPWAUpdate={pwaUpdate.applyUpdate}
                onSaveSettings={handleSaveSettings}
                onApplyDocenteGenereToAllPlans={handleApplyDocenteGenereToAllPlans}
                onSaveMapping={handleSaveMapping}
                onResetMapping={handleResetMapping}
                onOpenPrivacyModal={() => setShowWelcomeModal(true)}
              />
            )}
          </>
        )}
      </main>

      <WelcomePrivacyModal
        open={showWelcomeModal}
        alreadyAcknowledged={Boolean(settings.privacyAcknowledgedAt)}
        onAcknowledge={handleAcknowledgePrivacy}
      />

      {showIOSInstallGuide && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ios-install-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h3 id="ios-install-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
              Installa PIANORAMA su iPhone / iPad
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              1. Apri <strong>pianorama.vercel.app</strong> in Safari e tocca l’icona <strong>Condividi</strong>.<br />
              2. Scorri e seleziona <strong>Aggiungi alla schermata Home</strong>.<br />
              I curricoli e i piani salvati restano conservati in locale sul dispositivo.
            </p>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowIOSInstallGuide(false)}
                className="rounded-lg bg-[#1F3864] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#172b4d]"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </PasswordGate>
  );
}
