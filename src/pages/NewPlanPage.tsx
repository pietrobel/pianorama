import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Copy,
  FilePlus2,
  FileUp,
  Layers,
  SlidersHorizontal,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { DocumentImportReviewModal } from '../components/DocumentImportReviewModal';
import { PlessoSelect } from '../components/PlessoSelect';
import { SimpleClassDescriptionBuilder } from '../components/SimpleClassDescriptionBuilder';
import { DISCIPLINE_SECONDARIA, createEmptyProgrammazione } from '../domain/defaults';
import type {
  ClasseSecondaria,
  ComposizioneClasse,
  DocenteGenere,
  DocumentLayoutStyle,
  IndicazioniVersion,
  Programmazione,
  QuickClassModeSelection,
  SchoolSettings,
  SectionCopyOptions,
} from '../domain/types';
import {
  INDICAZIONI_LABELS,
  getDefaultIndicazioniForClasseAndYear,
} from '../engine/curricoloCatalogEngine';
import {
  importProgrammazioneFromFile,
  type DocumentImportResult,
} from '../engine/documentPlanImporter';
import {
  cloneProgrammazioneWithOptions,
  getSectionOptionsForPreset,
  type ClonePreset,
} from '../engine/planCloning';
import {
  DEFAULT_QUICK_CLASS_SELECTION,
  deriveSuggestedSituazioneFromQuick,
  generateQuickClassDescription,
  normalizeQuickClassSelection,
} from '../engine/quickClassDescriptionEngine';

interface NewPlanPageProps {
  existingPlans: Programmazione[];
  settings: SchoolSettings;
  initialSourceId?: string | null;
  initialPreset?: ClonePreset;
  onCreatePlan: (plan: Programmazione) => Promise<void>;
  onCancel: () => void;
}

const SECTION_LABELS: { key: keyof SectionCopyOptions; label: string; hint: string }[] = [
  {
    key: 'curricolo',
    label: 'Traguardi, Abilità e Conoscenze',
    hint: 'Competenze attese, DigComp 2.2, tabella abilità/conoscenze e attività',
  },
  {
    key: 'metodiStrumenti',
    label: 'Metodi, strumenti e DDI',
    hint: 'Premessa metodologica, metodi, mezzi, ausili e DDI',
  },
  {
    key: 'interventi',
    label: 'Strategie di potenziamento, consolidamento e recupero',
    hint: 'Misure per fasce di livello e indicazioni inclusive generali',
  },
  {
    key: 'verificheValutazione',
    label: 'Verifiche e criteri di valutazione',
    hint: 'Modalità scritte/orali e testo valutazione',
  },
  {
    key: 'composizioneESituazione',
    label: 'Composizione e situazione della classe',
    hint: 'Conteggi alunni, tipologia e livello (deselezionato per classe parallela)',
  },
  {
    key: 'analisiEQuestionario',
    label: 'Analisi di partenza e questionario classe',
    hint: 'Descrizione situazione, livelli iniziali e risposte questionario',
  },
];

export function NewPlanPage({
  existingPlans,
  settings,
  initialSourceId,
  initialPreset,
  onCreatePlan,
  onCancel,
}: NewPlanPageProps) {
  const defaultSource =
    existingPlans.find((p) => p.id === initialSourceId) || existingPlans[0];

  const [baseType, setBaseType] = useState<'empty' | 'reuse' | 'import_doc'>(
    initialSourceId && defaultSource ? 'reuse' : 'empty'
  );
  const [preset, setPreset] = useState<ClonePreset>(initialPreset || 'classe_parallela');
  const [sourceId, setSourceId] = useState<string>(defaultSource?.id || '');
  const [sections, setSections] = useState<SectionCopyOptions>(() =>
    getSectionOptionsForPreset(initialPreset || 'classe_parallela')
  );

  const [disciplina, setDisciplina] = useState<string>(
    defaultSource?.datiGenerali.disciplina || settings.defaultDisciplina || 'Italiano'
  );
  const [classe, setClasse] = useState<ClasseSecondaria>(
    defaultSource?.datiGenerali.classe || 'Prima'
  );
  const [sezione, setSezione] = useState<string>(
    initialSourceId ? 'B' : 'A'
  );
  const [annoScolastico, setAnnoScolastico] = useState<string>(
    settings.defaultAnnoScolastico || '2026/27'
  );
  const [plesso, setPlesso] = useState<string>(
    defaultSource?.datiGenerali.plesso || settings.defaultPlesso || 'Villafrati'
  );
  const [docente, setDocente] = useState<string>(
    defaultSource?.datiGenerali.docente || settings.defaultDocente || ''
  );
  const [docenteGenere, setDocenteGenere] = useState<DocenteGenere>(
    defaultSource?.datiGenerali.docenteGenere ?? settings.defaultDocenteGenere ?? 'F'
  );
  const [layoutDocumento, setLayoutDocumento] = useState<DocumentLayoutStyle>(
    defaultSource?.datiGenerali.layoutDocumento ?? settings.defaultLayoutDocumento ?? 'originale'
  );
  const [indicazioniVersione, setIndicazioniVersione] = useState<IndicazioniVersion>(() =>
    getDefaultIndicazioniForClasseAndYear(
      defaultSource?.datiGenerali.classe || 'Prima',
      settings.defaultAnnoScolastico || '2026/27'
    )
  );
  const [saveAsTemplate, setSaveAsTemplate] = useState<boolean>(false);
  const [templateNome, setTemplateNome] = useState<string>('');
  const [alunniInput, setAlunniInput] = useState<string>('');
  const [maschiInput, setMaschiInput] = useState<string>('');
  const [femmineInput, setFemmineInput] = useState<string>('');
  const [ripetentiInput, setRipetentiInput] = useState<string>('0');
  const [besInput, setBesInput] = useState<string>('0');
  const [disabilitaInput, setDisabilitaInput] = useState<string>('0');
  const [descriptionMode, setDescriptionMode] = useState<'rapida' | 'dettagliata'>('rapida');
  const [quickSelection, setQuickSelection] = useState<QuickClassModeSelection>(
    DEFAULT_QUICK_CLASS_SELECTION
  );
  const [quickCustomized, setQuickCustomized] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);

  const recommendedIndicazioni = getDefaultIndicazioniForClasseAndYear(classe, annoScolastico);

  const handleAnnoScolasticoChange = (nextAnno: string) => {
    setAnnoScolastico(nextAnno);
    setIndicazioniVersione(getDefaultIndicazioniForClasseAndYear(classe, nextAnno));
  };

  const handleClasseChange = (nextClasse: ClasseSecondaria) => {
    setClasse(nextClasse);
    setIndicazioniVersione(getDefaultIndicazioniForClasseAndYear(nextClasse, annoScolastico));
  };

  const [importingDoc, setImportingDoc] = useState(false);
  const [importDocError, setImportDocError] = useState<string | null>(null);
  const [importedResult, setImportedResult] = useState<DocumentImportResult | null>(null);
  const [showImportReviewModal, setShowImportReviewModal] = useState(false);
  const docFileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectPreset = (nextPreset: ClonePreset) => {
    setPreset(nextPreset);
    setSections(getSectionOptionsForPreset(nextPreset));
  };

  const parseOptionalInt = (raw: string): number | undefined => {
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : undefined;
  };

  const buildComposizioneFromInputs = (): ComposizioneClasse => ({
    alunni: parseOptionalInt(alunniInput),
    maschi: parseOptionalInt(maschiInput),
    femmine: parseOptionalInt(femmineInput),
    ripetenti: parseOptionalInt(ripetentiInput) ?? 0,
    bes: parseOptionalInt(besInput) ?? 0,
    disabilita: parseOptionalInt(disabilitaInput) ?? 0,
  });

  const previewSimplePlan = useMemo(
    () =>
      createEmptyProgrammazione(settings, {
        disciplina,
        classe,
        sezione,
        annoScolastico,
        plesso,
        docente,
        docenteGenere,
        layoutDocumento,
        indicazioniVersione,
        composizione: {
          alunni: parseOptionalInt(alunniInput),
          maschi: parseOptionalInt(maschiInput),
          femmine: parseOptionalInt(femmineInput),
          ripetenti: parseOptionalInt(ripetentiInput) ?? 0,
          bes: parseOptionalInt(besInput) ?? 0,
          disabilita: parseOptionalInt(disabilitaInput) ?? 0,
        },
        modalitaCompilazione: descriptionMode,
        modalitaRapida: quickSelection,
      }),
    [
      settings,
      disciplina,
      classe,
      sezione,
      annoScolastico,
      plesso,
      docente,
      docenteGenere,
      layoutDocumento,
      indicazioniVersione,
      alunniInput,
      maschiInput,
      femmineInput,
      ripetentiInput,
      besInput,
      disabilitaInput,
      descriptionMode,
      quickSelection,
    ]
  );

  const syncFormFieldsFromPlan = (plan: Programmazione) => {
    setDisciplina(plan.datiGenerali.disciplina);
    setClasse(plan.datiGenerali.classe);
    setSezione(plan.datiGenerali.sezione);
    setAnnoScolastico(plan.datiGenerali.annoScolastico);
    setPlesso(plan.datiGenerali.plesso);
    setDocente(plan.datiGenerali.docente);
    setDocenteGenere(plan.datiGenerali.docenteGenere ?? settings.defaultDocenteGenere ?? 'F');
    setAlunniInput(
      typeof plan.composizione.alunni === 'number' ? String(plan.composizione.alunni) : ''
    );
    setMaschiInput(
      typeof plan.composizione.maschi === 'number' ? String(plan.composizione.maschi) : ''
    );
    setFemmineInput(
      typeof plan.composizione.femmine === 'number' ? String(plan.composizione.femmine) : ''
    );
    setRipetentiInput(String(plan.composizione.ripetenti ?? 0));
    setBesInput(String(plan.composizione.bes ?? 0));
    setDisabilitaInput(String(plan.composizione.disabilita ?? 0));
    setIndicazioniVersione(
      plan.curricolo.indicazioniVersione ??
        getDefaultIndicazioniForClasseAndYear(
          plan.datiGenerali.classe,
          plan.datiGenerali.annoScolastico
        )
    );
  };

  const handleDocumentUpload = async (file: File) => {
    setImportingDoc(true);
    setImportDocError(null);
    try {
      const result = await importProgrammazioneFromFile(file, settings);
      setImportedResult(result);
      syncFormFieldsFromPlan(result.plan);
      setShowImportReviewModal(true);
    } catch (err) {
      setImportedResult(null);
      setImportDocError(
        err instanceof Error
          ? err.message
          : 'Impossibile importare la programmazione dal file selezionato.'
      );
    } finally {
      setImportingDoc(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (baseType === 'import_doc' && !importedResult) {
      setImportDocError('Seleziona prima un file .pdf, .docx o .doc da importare.');
      return;
    }
    setSaving(true);
    try {
      let plan: Programmazione;
      const source = existingPlans.find((p) => p.id === sourceId);

      const userComposizione = buildComposizioneFromInputs();
      const normalizedQuick = normalizeQuickClassSelection(quickSelection);
      const suggestedSit = deriveSuggestedSituazioneFromQuick(normalizedQuick);
      const simpleGeneratedText =
        descriptionMode === 'rapida'
          ? generateQuickClassDescription(previewSimplePlan, normalizedQuick)
          : undefined;

      if (baseType === 'import_doc' && importedResult) {
        const cleanDocente = docente.trim();
        plan = {
          ...importedResult.plan,
          isTemplate: saveAsTemplate,
          templateNome: saveAsTemplate ? templateNome.trim() || `${disciplina} ${classe}` : undefined,
          composizione: userComposizione,
          datiGenerali: {
            ...importedResult.plan.datiGenerali,
            disciplina,
            titoloDisciplina:
              importedResult.plan.datiGenerali.disciplina === disciplina
                ? importedResult.plan.datiGenerali.titoloDisciplina
                : disciplina,
            classe,
            sezione,
            annoScolastico,
            plesso,
            docente: cleanDocente,
            docenteGenere,
            layoutDocumento,
          },
          analisiPartenza: {
            ...importedResult.plan.analisiPartenza,
            questionario: {
              risposte: importedResult.plan.analisiPartenza.questionario?.risposte ?? {},
              modalitaGenerazione:
                importedResult.plan.analisiPartenza.questionario?.modalitaGenerazione ?? 'completa',
              ultimoAggiornamento:
                importedResult.plan.analisiPartenza.questionario?.ultimoAggiornamento ?? null,
              modalitaCompilazione: descriptionMode,
              modalitaRapida: normalizedQuick,
            },
          },
          verificheValutazione: {
            ...importedResult.plan.verificheValutazione,
            firmaDocente: cleanDocente,
          },
          curricolo: {
            ...importedResult.plan.curricolo,
            indicazioniVersione,
          },
        };
      } else if (baseType === 'reuse' && source) {
        const hasManualComp =
          userComposizione.alunni !== undefined ||
          userComposizione.maschi !== undefined ||
          userComposizione.femmine !== undefined ||
          userComposizione.ripetenti > 0 ||
          userComposizione.bes > 0 ||
          (userComposizione.disabilita ?? 0) > 0;
        const shouldApplySimpleDesc =
          descriptionMode === 'rapida' && (!sections.analisiEQuestionario || quickCustomized);
        plan = cloneProgrammazioneWithOptions({
          source,
          settings,
          preset,
          sections,
          overrides: {
            disciplina,
            classe,
            sezione,
            annoScolastico,
            plesso,
            docente,
            docenteGenere,
            layoutDocumento,
            indicazioniVersione,
            isTemplate: saveAsTemplate,
            templateNome: saveAsTemplate ? templateNome.trim() || `${disciplina} ${classe}` : undefined,
            composizione:
              hasManualComp || !sections.composizioneESituazione ? userComposizione : undefined,
            modalitaCompilazione: descriptionMode,
            modalitaRapida: normalizedQuick,
            ...(shouldApplySimpleDesc && simpleGeneratedText
              ? {
                  descrizioneDisciplinare: simpleGeneratedText,
                  situazione: {
                    ...createEmptyProgrammazione(settings, { disciplina }).situazione,
                    tipologie: suggestedSit.tipologie,
                    livello: suggestedSit.livello,
                  },
                }
              : {}),
          },
        });
      } else {
        plan = createEmptyProgrammazione(settings, {
          disciplina,
          classe,
          sezione,
          annoScolastico,
          plesso,
          docente,
          docenteGenere,
          layoutDocumento,
          indicazioniVersione,
          isTemplate: saveAsTemplate,
          templateNome: saveAsTemplate ? templateNome.trim() || `${disciplina} ${classe}` : undefined,
          composizione: userComposizione,
          modalitaCompilazione: descriptionMode,
          modalitaRapida: normalizedQuick,
          ...(descriptionMode === 'rapida' && simpleGeneratedText
            ? {
                descrizioneDisciplinare: simpleGeneratedText,
                situazione: {
                  tipologie: suggestedSit.tipologie,
                  livello: suggestedSit.livello,
                },
              }
            : {}),
        });
      }
      await onCreatePlan(plan);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Indietro
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Nuova programmazione, importazione file o riutilizzo modello
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Crea da zero, riutilizza un progetto precedente oppure importa offline una vecchia programmazione in PDF / Word
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
      >
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Modalità di creazione
          </legend>
          <div className="grid gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => setBaseType('empty')}
              className={`flex items-start gap-3 rounded-lg border p-4 text-left transition ${
                baseType === 'empty'
                  ? 'border-[#1F3864] bg-blue-50/50 dark:border-blue-500 dark:bg-blue-950/30'
                  : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
              }`}
            >
              <FilePlus2 className="mt-0.5 h-5 w-5 shrink-0 text-[#1F3864] dark:text-blue-400" />
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Modello vuoto ufficiale
                </p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Inizia con intestazione e testi istituzionali precompilati.
                </p>
              </div>
            </button>

            <button
              type="button"
              disabled={existingPlans.length === 0}
              onClick={() => setBaseType('reuse')}
              className={`flex items-start gap-3 rounded-lg border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                baseType === 'reuse'
                  ? 'border-[#1F3864] bg-blue-50/50 dark:border-blue-500 dark:bg-blue-950/30'
                  : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
              }`}
            >
              <Copy className="mt-0.5 h-5 w-5 shrink-0 text-[#1F3864] dark:text-blue-400" />
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Riutilizza modello
                </p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {existingPlans.length > 0
                    ? 'Classe parallela, anno precedente o sezioni scelte.'
                    : 'Disponibile dopo aver salvato almeno una programmazione.'}
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setBaseType('import_doc')}
              className={`flex items-start gap-3 rounded-lg border p-4 text-left transition ${
                baseType === 'import_doc'
                  ? 'border-[#1F3864] bg-blue-50/50 dark:border-blue-500 dark:bg-blue-950/30'
                  : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
              }`}
            >
              <FileUp className="mt-0.5 h-5 w-5 shrink-0 text-[#1F3864] dark:text-blue-400" />
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Importa PDF / Word
                </p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Carica una vecchia programmazione (.pdf, .docx, .doc) 100% offline.
                </p>
              </div>
            </button>
          </div>
        </fieldset>

        {baseType === 'import_doc' && (
          <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/40 p-4 dark:border-blue-900 dark:bg-blue-950/20">
            <input
              ref={docFileInputRef}
              type="file"
              accept=".pdf,.docx,.doc"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) void handleDocumentUpload(file);
              }}
              className="hidden"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#1F3864] dark:text-blue-300">
                  Importazione offline da vecchie programmazioni (.pdf, .docx, .doc)
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Estrae automaticamente intestazione, composizione, caselle, interventi BES, competenze, abilità e contenuti.
                </p>
              </div>
              <button
                type="button"
                disabled={importingDoc}
                onClick={() => docFileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg bg-[#1F3864] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#172b4d] disabled:opacity-60"
              >
                <FileUp className="h-3.5 w-3.5" />
                {importingDoc ? 'Lettura in corso...' : 'Scegli file .pdf / .docx / .doc'}
              </button>
            </div>

            {importDocError && (
              <p role="alert" className="text-xs font-medium text-red-700 dark:text-red-400">
                {importDocError}
              </p>
            )}

            {importedResult && (
              <div className="space-y-2 rounded-lg border border-emerald-200 bg-white p-3 text-xs dark:border-emerald-900 dark:bg-slate-900">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 font-semibold text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    File importato: {importedResult.summary.fileName} (
                    {importedResult.plan.curricolo.righeAbilitaConoscenze.length} righe di
                    programma estratte)
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowImportReviewModal(true)}
                    className="rounded-md border border-[#1F3864] px-2.5 py-1 text-xs font-semibold text-[#1F3864] hover:bg-blue-50 dark:border-blue-400 dark:text-blue-300 dark:hover:bg-slate-800"
                  >
                    Verifica e correggi campi estratti
                  </button>
                </div>
                {importedResult.summary.sectionsMatched.length > 0 && (
                  <p className="text-slate-600 dark:text-slate-300">
                    Sezioni riconosciute: {importedResult.summary.sectionsMatched.join(' · ')}
                  </p>
                )}
                {importedResult.warnings.length > 0 && (
                  <ul className="list-disc pl-4 text-amber-800 dark:text-amber-300">
                    {importedResult.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {baseType === 'reuse' && existingPlans.length > 0 && (
          <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/30">
            <label className="block">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Progetto o modello di origine (rimarrà invariato)
              </span>
              <select
                value={sourceId}
                onChange={(e) => {
                  const chosen = existingPlans.find((p) => p.id === e.target.value);
                  setSourceId(e.target.value);
                  if (chosen) {
                    setDisciplina(chosen.datiGenerali.disciplina);
                    handleClasseChange(chosen.datiGenerali.classe);
                    setPlesso(chosen.datiGenerali.plesso);
                    setDocenteGenere(
                      chosen.datiGenerali.docenteGenere ?? settings.defaultDocenteGenere ?? 'F'
                    );
                    setLayoutDocumento(
                      chosen.datiGenerali.layoutDocumento ??
                        settings.defaultLayoutDocumento ??
                        'originale'
                    );
                  }
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                {existingPlans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.isTemplate ? `[MODELLO: ${p.templateNome || p.datiGenerali.disciplina}] ` : ''}
                    {p.datiGenerali.disciplina} · Classe {p.datiGenerali.classe}{' '}
                    {p.datiGenerali.sezione} · A.S. {p.datiGenerali.annoScolastico} ·{' '}
                    {p.datiGenerali.docente || 'Docente n.d.'}
                  </option>
                ))}
              </select>
            </label>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Scenario di riutilizzo
              </span>
              <div className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    {
                      id: 'classe_parallela',
                      label: 'Classe parallela (es. 1ª A → 1ª B)',
                      desc: 'Mantiene contenuti, abilità, metodi e verifiche; azzera i dati specifici della nuova classe.',
                      icon: Layers,
                    },
                    {
                      id: 'anno_precedente',
                      label: 'Da anno precedente',
                      desc: 'Mantiene l’impianto didattico comune aggiornando anno scolastico e gruppo classe.',
                      icon: CalendarClock,
                    },
                    {
                      id: 'completa',
                      label: 'Duplicazione completa',
                      desc: 'Copia tutte le sezioni in una nuova copia indipendente.',
                      icon: Copy,
                    },
                    {
                      id: 'personalizzata',
                      label: 'Copia selettiva di sezioni',
                      desc: 'Scegli manualmente quali sezioni ereditare.',
                      icon: SlidersHorizontal,
                    },
                  ] as const
                ).map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectPreset(item.id)}
                      className={`flex items-start gap-2.5 rounded-lg border p-3 text-left text-xs ${
                        preset === item.id
                          ? 'border-[#1F3864] bg-white dark:border-blue-500 dark:bg-slate-900'
                          : 'border-slate-200 bg-white/60 dark:border-slate-700 dark:bg-slate-900/50'
                      }`}
                    >
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#1F3864] dark:text-blue-400" />
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          {item.label}
                        </p>
                        <p className="mt-0.5 text-slate-500 dark:text-slate-400">{item.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-200 pt-3 dark:border-slate-700">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Sezioni da copiare nella nuova programmazione:
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {SECTION_LABELS.map((sec) => (
                  <label
                    key={sec.key}
                    className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-900"
                  >
                    <input
                      type="checkbox"
                      checked={sections[sec.key]}
                      onChange={(e) => {
                        setPreset('personalizzata');
                        setSections((prev) => ({ ...prev, [sec.key]: e.target.checked }));
                      }}
                      className="mt-0.5 h-4 w-4 accent-[#1F3864]"
                    />
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {sec.label}
                      </p>
                      <p className="text-slate-500 dark:text-slate-400">{sec.hint}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Disciplina
            </span>
            <select
              value={disciplina}
              onChange={(e) => setDisciplina(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              {DISCIPLINE_SECONDARIA.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Anno scolastico
            </span>
            <input
              type="text"
              required
              value={annoScolastico}
              onChange={(e) => handleAnnoScolasticoChange(e.target.value)}
              placeholder="es. 2026/27"
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Classe
            </span>
            <select
              value={classe}
              onChange={(e) => handleClasseChange(e.target.value as ClasseSecondaria)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="Prima">Prima</option>
              <option value="Seconda">Seconda</option>
              <option value="Terza">Terza</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Sezione
            </span>
            <input
              type="text"
              required
              maxLength={8}
              value={sezione}
              onChange={(e) => setSezione(e.target.value.toUpperCase())}
              placeholder="A, B, C..."
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>

          <PlessoSelect
            label="Plesso"
            value={plesso}
            onChange={setPlesso}
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />

          <label className="block">
            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Titolo docente
            </span>
            <select
              value={docenteGenere}
              onChange={(e) => setDocenteGenere(e.target.value as DocenteGenere)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="F">Professoressa (Prof.ssa · La docente)</option>
              <option value="M">Professore (Prof. · Il docente)</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Docente (Nome e Cognome)
            </span>
            <input
              type="text"
              value={docente}
              onChange={(e) => setDocente(e.target.value)}
              placeholder="Nome e Cognome del docente"
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Stile grafico documento
            </span>
            <select
              value={layoutDocumento}
              onChange={(e) => setLayoutDocumento(e.target.value as DocumentLayoutStyle)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="originale">Modello originale (bordo nero tradizionale)</option>
              <option value="moderno">Stile moderno PIANORAMA (blu istituzionale)</option>
            </select>
          </label>

          <div className="sm:col-span-2">
            <label className="block">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  Riferimento curricolare (Indicazioni Nazionali)
                </span>
                {indicazioniVersione !== recommendedIndicazioni && (
                  <button
                    type="button"
                    onClick={() => setIndicazioniVersione(recommendedIndicazioni)}
                    className="text-xs font-semibold text-[#1F3864] hover:underline dark:text-blue-400"
                  >
                    Ripristina predefinito ({INDICAZIONI_LABELS[recommendedIndicazioni]})
                  </button>
                )}
              </div>
              <select
                value={indicazioniVersione}
                onChange={(e) => setIndicazioniVersione(e.target.value as IndicazioniVersion)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="nuove">
                  {INDICAZIONI_LABELS.nuove}
                  {recommendedIndicazioni === 'nuove' ? ' (predefinito)' : ''}
                </option>
                <option value="vecchie">
                  {INDICAZIONI_LABELS.vecchie}
                  {recommendedIndicazioni === 'vecchie' ? ' (predefinito)' : ''}
                </option>
              </select>
            </label>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Regola automatica: fino al 2026/27 Nuove per la Prima e Vecchie per Seconda/Terza; nel 2027/28 Nuove per Prima e Seconda; dal 2028/29 Nuove per tutte le classi.
            </p>
          </div>
        </div>

        <div className="space-y-2.5 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Composizione della classe (opzionale ora, modificabile nell’editor)
            </h2>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Alunni, maschi e femmine partono vuoti senza valori predefiniti
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
            <label className="block">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Alunni totali
              </span>
              <input
                type="number"
                min={0}
                max={40}
                value={alunniInput}
                onChange={(e) => setAlunniInput(e.target.value)}
                placeholder="—"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono-num text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Maschi
              </span>
              <input
                type="number"
                min={0}
                max={40}
                value={maschiInput}
                onChange={(e) => setMaschiInput(e.target.value)}
                placeholder="—"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono-num text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Femmine
              </span>
              <input
                type="number"
                min={0}
                max={40}
                value={femmineInput}
                onChange={(e) => setFemmineInput(e.target.value)}
                placeholder="—"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono-num text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Ripetenti
              </span>
              <input
                type="number"
                min={0}
                max={40}
                value={ripetentiInput}
                onChange={(e) => setRipetentiInput(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono-num text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Con BES
              </span>
              <input
                type="number"
                min={0}
                max={40}
                value={besInput}
                onChange={(e) => setBesInput(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono-num text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Con disabilità
              </span>
              <input
                type="number"
                min={0}
                max={40}
                value={disabilitaInput}
                onChange={(e) => setDisabilitaInput(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono-num text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>
          </div>
        </div>

        {/* Scelta modalità composizione descrizione della classe nel menu iniziale */}
        <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/30">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Composizione e descrizione della classe: scegli la modalità
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              La <strong>Modalità semplice</strong> è predefinita: rispondi alle 5 domande chiuse e l’app genera una descrizione completa dalla libreria integrando i numeri di BES (PDP) e disabilità (PEI) inseriti sopra. Puoi sempre passare alla <strong>Modalità avanzata</strong>.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setDescriptionMode('rapida')}
              className={`rounded-lg border p-3.5 text-left transition ${
                descriptionMode === 'rapida'
                  ? 'border-[#1F3864] bg-white ring-1 ring-[#1F3864]/30 dark:border-blue-500 dark:bg-slate-900'
                  : 'border-slate-200 bg-white/70 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/50'
              }`}
            >
              <p className="text-xs font-bold text-[#1F3864] dark:text-blue-300">
                Modalità semplice (predefinita)
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                5 domande chiuse (eterogeneità, livello generale, socializzazione, rispetto regole/vivacità, motivazione) con descrizione completa dalla libreria + riferimento automatico a PEI/PDP.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setDescriptionMode('dettagliata')}
              className={`rounded-lg border p-3.5 text-left transition ${
                descriptionMode === 'dettagliata'
                  ? 'border-[#1F3864] bg-white ring-1 ring-[#1F3864]/30 dark:border-blue-500 dark:bg-slate-900'
                  : 'border-slate-200 bg-white/70 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/50'
              }`}
            >
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Modalità avanzata
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Configurazione dettagliata nell’editor tramite barre percentuali per sottogruppi e questionario analitico a 17 indicatori personalizzabili.
              </p>
            </button>
          </div>

          {descriptionMode === 'rapida' && baseType !== 'import_doc' && (
            <SimpleClassDescriptionBuilder
              plan={previewSimplePlan}
              selection={quickSelection}
              compact
              onChangeSelection={(next) => {
                setQuickSelection(next);
                setQuickCustomized(true);
              }}
            />
          )}

          {descriptionMode === 'dettagliata' && (
            <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              Alla creazione della programmazione si apriranno direttamente gli strumenti della <strong>Modalità avanzata</strong> (distribuzione percentuale per sottogruppi e questionario analitico a 17 indicatori).
            </p>
          )}
        </div>

        <div className="space-y-3 rounded-lg border border-slate-200 p-3.5 dark:border-slate-800">
          <label className="flex cursor-pointer items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={saveAsTemplate}
              onChange={(e) => setSaveAsTemplate(e.target.checked)}
              className="h-4 w-4 accent-[#1F3864]"
            />
            <span className="font-medium text-slate-900 dark:text-slate-100">
              Contrassegna anche come modello riutilizzabile
            </span>
          </label>
          {saveAsTemplate && (
            <input
              type="text"
              value={templateNome}
              onChange={(e) => setTemplateNome(e.target.value)}
              placeholder="Nome del modello (es. Modello base Matematica Prima)..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            className="whitespace-nowrap shrink-0 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Annulla
          </button>
          <button
            type="submit"
            disabled={saving || importingDoc}
            className="whitespace-nowrap shrink-0 rounded-lg bg-[#1F3864] px-5 py-2 text-sm font-semibold text-white hover:bg-[#172b4d] disabled:opacity-60"
          >
            {saving
              ? 'Creazione in corso...'
              : baseType === 'import_doc'
              ? 'Importa e apri editor'
              : 'Crea e apri editor'}
          </button>
        </div>
      </form>

      <DocumentImportReviewModal
        open={showImportReviewModal}
        importResult={importedResult}
        onCancel={() => setShowImportReviewModal(false)}
        onConfirm={(finalPlan, updatedResult) => {
          setImportedResult(updatedResult);
          syncFormFieldsFromPlan(finalPlan);
          setShowImportReviewModal(false);
        }}
      />
    </div>
  );
}
