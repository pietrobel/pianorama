import { createEmptyProgrammazione } from '../domain/defaults';
import type {
  ClasseSecondaria,
  ComposizioneClasse,
  IndicazioniVersion,
  Programmazione,
  QuickClassModeSelection,
  SchoolSettings,
  SectionCopyOptions,
  SituazioneClasse,
} from '../domain/types';
import { getDefaultIndicazioniForClasseAndYear } from './curricoloCatalogEngine';

export type ClonePreset = 'completa' | 'classe_parallela' | 'anno_precedente' | 'personalizzata';

export function getSectionOptionsForPreset(preset: ClonePreset): SectionCopyOptions {
  switch (preset) {
    case 'completa':
      return {
        datiGenerali: true,
        composizioneESituazione: true,
        analisiEQuestionario: true,
        interventi: true,
        curricolo: true,
        metodiStrumenti: true,
        verificheValutazione: true,
      };
    case 'classe_parallela':
      return {
        datiGenerali: false,
        composizioneESituazione: false,
        analisiEQuestionario: false,
        interventi: true,
        curricolo: true,
        metodiStrumenti: true,
        verificheValutazione: true,
      };
    case 'anno_precedente':
      return {
        datiGenerali: false,
        composizioneESituazione: false,
        analisiEQuestionario: false,
        interventi: true,
        curricolo: true,
        metodiStrumenti: true,
        verificheValutazione: true,
      };
    case 'personalizzata':
      return {
        datiGenerali: false,
        composizioneESituazione: false,
        analisiEQuestionario: false,
        interventi: true,
        curricolo: true,
        metodiStrumenti: true,
        verificheValutazione: false,
      };
  }
}

export interface ClonePlanParams {
  source: Programmazione;
  settings: SchoolSettings;
  preset: ClonePreset;
  sections: SectionCopyOptions;
  overrides: {
    disciplina: string;
    classe: ClasseSecondaria;
    sezione: string;
    annoScolastico: string;
    plesso: string;
    docente: string;
    docenteGenere?: 'F' | 'M';
    layoutDocumento?: 'originale' | 'moderno';
    indicazioniVersione?: IndicazioniVersion;
    isTemplate?: boolean;
    templateNome?: string;
    composizione?: Partial<ComposizioneClasse>;
    situazione?: Partial<SituazioneClasse>;
    descrizioneDisciplinare?: string;
    modalitaCompilazione?: 'rapida' | 'dettagliata';
    modalitaRapida?: QuickClassModeSelection;
  };
}

export function cloneProgrammazioneWithOptions(params: ClonePlanParams): Programmazione {
  const { source, settings, preset, sections, overrides } = params;
  const now = new Date().toISOString();
  const base = createEmptyProgrammazione(settings, {
    disciplina: overrides.disciplina,
    classe: overrides.classe,
    sezione: overrides.sezione,
    annoScolastico: overrides.annoScolastico,
    plesso: overrides.plesso,
    docente: overrides.docente,
    docenteGenere:
      overrides.docenteGenere ??
      source.datiGenerali.docenteGenere ??
      settings.defaultDocenteGenere ??
      'F',
    layoutDocumento:
      overrides.layoutDocumento ??
      source.datiGenerali.layoutDocumento ??
      settings.defaultLayoutDocumento ??
      'originale',
    indicazioniVersione: overrides.indicazioniVersione,
    isTemplate: overrides.isTemplate ?? false,
    templateNome: overrides.templateNome,
  });

  const cloned = structuredClone(base);
  cloned.clonedFromId = source.id;

  if (sections.datiGenerali) {
    cloned.datiGenerali = {
      ...structuredClone(source.datiGenerali),
      disciplina: overrides.disciplina,
      titoloDisciplina: overrides.disciplina,
      classe: overrides.classe,
      sezione: overrides.sezione,
      annoScolastico: overrides.annoScolastico,
      plesso: overrides.plesso,
      docente: overrides.docente,
      docenteGenere:
        overrides.docenteGenere ??
        source.datiGenerali.docenteGenere ??
        settings.defaultDocenteGenere ??
        'F',
      layoutDocumento:
        overrides.layoutDocumento ??
        source.datiGenerali.layoutDocumento ??
        settings.defaultLayoutDocumento ??
        'originale',
    };
  }

  if (sections.composizioneESituazione) {
    cloned.composizione = structuredClone(source.composizione);
    cloned.situazione = structuredClone(source.situazione);
  }

  if (overrides.composizione) {
    cloned.composizione = {
      ...cloned.composizione,
      ...overrides.composizione,
    };
  }

  if (sections.analisiEQuestionario) {
    cloned.analisiPartenza = structuredClone(source.analisiPartenza);
  }

  if (overrides.situazione) {
    cloned.situazione = {
      ...cloned.situazione,
      ...overrides.situazione,
    };
  }

  if (overrides.modalitaCompilazione || overrides.modalitaRapida || overrides.descrizioneDisciplinare !== undefined) {
    cloned.analisiPartenza = {
      ...cloned.analisiPartenza,
      ...(overrides.descrizioneDisciplinare !== undefined
        ? { descrizioneDisciplinare: overrides.descrizioneDisciplinare }
        : {}),
      questionario: {
        risposte: cloned.analisiPartenza.questionario?.risposte ?? {},
        modalitaGenerazione: cloned.analisiPartenza.questionario?.modalitaGenerazione ?? 'completa',
        ultimoAggiornamento: cloned.analisiPartenza.questionario?.ultimoAggiornamento ?? now,
        modalitaCompilazione:
          overrides.modalitaCompilazione ??
          cloned.analisiPartenza.questionario?.modalitaCompilazione ??
          'rapida',
        modalitaRapida:
          overrides.modalitaRapida ?? cloned.analisiPartenza.questionario?.modalitaRapida,
      },
    };
  }

  if (sections.interventi) {
    cloned.interventi = structuredClone(source.interventi);
  }

  if (sections.curricolo) {
    const sameContext =
      overrides.classe === source.datiGenerali.classe &&
      overrides.annoScolastico === source.datiGenerali.annoScolastico;
    cloned.curricolo = {
      ...structuredClone(source.curricolo),
      indicazioniVersione:
        overrides.indicazioniVersione ??
        (sameContext && source.curricolo.indicazioniVersione
          ? source.curricolo.indicazioniVersione
          : getDefaultIndicazioniForClasseAndYear(overrides.classe, overrides.annoScolastico)),
    };
  }

  if (sections.metodiStrumenti) {
    cloned.metodiStrumenti = structuredClone(source.metodiStrumenti);
  }

  if (sections.verificheValutazione) {
    cloned.verificheValutazione = {
      ...structuredClone(source.verificheValutazione),
      firmaDocente: overrides.docente,
    };
  }

  const copiedLabels = Object.entries(sections)
    .filter(([, enabled]) => enabled)
    .map(([k]) => k)
    .join(', ');

  const presetLabel =
    preset === 'completa'
      ? 'Duplicazione completa'
      : preset === 'classe_parallela'
      ? 'Creazione per classe parallela'
      : preset === 'anno_precedente'
      ? 'Riutilizzo da anno precedente'
      : 'Copia selettiva di sezioni';

  cloned.cronologiaModifiche = [
    {
      id: crypto.randomUUID(),
      timestamp: now,
      evento: presetLabel,
      dettaglio: `Creato in modo indipendente da "${source.datiGenerali.disciplina} ${source.datiGenerali.classe}${source.datiGenerali.sezione} (${source.datiGenerali.annoScolastico})". Sezioni copiate: ${
        copiedLabels || 'nessuna'
      }.`,
    },
  ];

  return cloned;
}
