import { CLASS_QUICK_DESCRIPTIONS_ARCHIVE } from '../data/classQuickDescriptionsArchive';
import type {
  Programmazione,
  QuickClassModeKey,
  QuickClassModeSelection,
  QuickClimaLevel,
  QuickEterogeneitaLevel,
  QuickMotivazioneLevel,
  QuickPreparazioneLevel,
} from '../domain/types';

export interface QuickQuestionOption<T extends string> {
  value: T;
  label: string;
  hint: string;
}

export type QuickQuestionKey =
  | 'eterogeneita'
  | 'preparazione'
  | 'clima'
  | 'motivazione';

export interface QuickQuestionSpec<T extends string = string> {
  key: QuickQuestionKey;
  number: number;
  title: string;
  prompt: string;
  options: QuickQuestionOption<T>[];
}

export const QUICK_CLASS_QUESTIONS: [
  QuickQuestionSpec<QuickEterogeneitaLevel>,
  QuickQuestionSpec<QuickPreparazioneLevel>,
  QuickQuestionSpec<QuickClimaLevel>,
  QuickQuestionSpec<QuickMotivazioneLevel>,
] = [
  {
    key: 'eterogeneita',
    number: 1,
    title: 'Eterogeneità della classe',
    prompt: 'Quanto sono differenziati i ritmi, gli stili cognitivi e i livelli di partenza?',
    options: [
      {
        value: 'omogenea',
        label: 'Bassa (classe piuttosto omogenea)',
        hint: 'Livelli di partenza e ritmi di apprendimento generalmente affini',
      },
      {
        value: 'moderata',
        label: 'Media (eterogeneità moderata)',
        hint: 'Fisiologiche differenze tra fasce gestibili con attività graduate',
      },
      {
        value: 'elevata',
        label: 'Elevata (classe fortemente eterogenea)',
        hint: 'Ampio divario tra alunni autonomi e studenti bisognosi di guida costante',
      },
    ],
  },
  {
    key: 'preparazione',
    number: 2,
    title: 'Livello medio di preparazione didattica',
    prompt: 'Qual è la tenuta media dei prerequisiti disciplinari all’avvio dell’anno?',
    options: [
      {
        value: 'buono',
        label: 'Buono / Avanzato',
        hint: 'Prerequisiti disciplinari mediamente solidi e ben strutturati',
      },
      {
        value: 'medio',
        label: 'Medio / Discreto',
        hint: 'Conoscenze essenziali presenti ma da consolidare nel metodo',
      },
      {
        value: 'fragile',
        label: 'Medio-basso / Fragile',
        hint: 'Lacune diffuse nei saperi fondamentali e necessità di recupero di base',
      },
    ],
  },
  {
    key: 'clima',
    number: 3,
    title: 'Clima relazionale',
    prompt: 'Come si presentano le dinamiche interpersonali e il rispetto delle regole d’aula?',
    options: [
      {
        value: 'sereno',
        label: 'Sereno e collaborativo',
        hint: 'Relazioni positive tra pari, ascolto e clima ordinato',
      },
      {
        value: 'vivace',
        label: 'Vivace o articolato',
        hint: 'Esuberanza relazionale o sottogruppi che richiedono regole chiare',
      },
      {
        value: 'complesso',
        label: 'Complesso o conflittuale',
        hint: 'Attriti o fragilità relazionali bisognosi di mediazione educativa costante',
      },
    ],
  },
  {
    key: 'motivazione',
    number: 4,
    title: 'Motivazione e partecipazione media',
    prompt: 'Qual è l’atteggiamento prevalente verso le attività e l’impegno scolastico?',
    options: [
      {
        value: 'attiva',
        label: 'Attiva e costante',
        hint: 'Interesse vivo, curiosità e partecipazione regolare al dialogo educativo',
      },
      {
        value: 'selettiva',
        label: 'Selettiva o discontinua',
        hint: 'Coinvolgimento legato soprattutto ad attività pratiche o stimoli mirati',
      },
      {
        value: 'debole',
        label: 'Debole o da sollecitare',
        hint: 'Atteggiamento passivo o incostante che richiede frequenti rinforzi positivi',
      },
    ],
  },
];

export const DEFAULT_QUICK_CLASS_SELECTION: QuickClassModeSelection = {
  eterogeneita: 'moderata',
  preparazione: 'medio',
  clima: 'sereno',
  motivazione: 'selettiva',
  varianteSelezionata: 0,
};

export function buildQuickClassKey(
  selection: Pick<
    QuickClassModeSelection,
    'eterogeneita' | 'preparazione' | 'clima' | 'motivazione'
  >
): QuickClassModeKey {
  return `${selection.eterogeneita}|${selection.preparazione}|${selection.clima}|${selection.motivazione}`;
}

export function getQuickArchiveCombinationCount(): number {
  return Object.keys(CLASS_QUICK_DESCRIPTIONS_ARCHIVE).length;
}

export function getQuickArchiveVariants(
  selection: Pick<
    QuickClassModeSelection,
    'eterogeneita' | 'preparazione' | 'clima' | 'motivazione'
  >
): readonly [string, string, string] {
  const key = buildQuickClassKey(selection);
  return (
    CLASS_QUICK_DESCRIPTIONS_ARCHIVE[key] ??
    CLASS_QUICK_DESCRIPTIONS_ARCHIVE['moderata|medio|sereno|selettiva']
  );
}

function formatAlunniNoun(count: number): string {
  return `${count} ${count === 1 ? 'alunno' : 'alunni'}`;
}

function buildInclusionSentence(
  bes: number,
  disabilita: number,
  variantIdx: 0 | 1 | 2
): string {
  if (bes > 0 && disabilita > 0) {
    const besPhrase = `${formatAlunniNoun(bes)} con Bisogni Educativi Speciali (BES)`;
    const disPhrase = `${formatAlunniNoun(disabilita)} con disabilità certificata ai sensi della L. 104/1992`;
    if (variantIdx === 0) {
      return `Nel gruppo classe sono inoltre presenti ${besPhrase} e ${disPhrase}, per i quali la progettazione prevede l’attuazione dei rispettivi PDP e PEI con strumenti compensativi, misure dispensative e attività inclusive calibrate.`;
    }
    if (variantIdx === 1) {
      return `Si segnala altresì la presenza di ${disPhrase} e di ${besPhrase}: per garantire pari opportunità formative saranno attivati percorsi personalizzati e individualizzati in coerenza con i relativi PEI e PDP.`;
    }
    return `All’interno della classe risultano infine seguiti ${besPhrase} e ${disPhrase}, accompagnati attraverso strategie didattiche inclusive, mediatori facilitanti e pieno raccordo con i documenti PEI e PDP adottati dal Consiglio di Classe.`;
  }

  if (bes > 0) {
    const besPhrase = `${formatAlunniNoun(bes)} con Bisogni Educativi Speciali (BES)`;
    if (variantIdx === 0) {
      return `Nel gruppo classe è inoltre registrata la presenza di ${besPhrase}, per i quali si fa riferimento ai rispettivi Piani Didattici Personalizzati (PDP) mediante idonei strumenti compensativi e misure dispensative.`;
    }
    if (variantIdx === 1) {
      return `All’interno della classe figurano anche ${besPhrase}, supportati con percorsi didattici personalizzati e strategie inclusive coerenti con i relativi PDP.`;
    }
    return `Si rileva inoltre la presenza di ${besPhrase}, il cui percorso sarà opportunamente personalizzato attraverso l’impiego flessibile di misure dispensative e strumenti compensativi previsti dal PDP.`;
  }

  if (disabilita > 0) {
    const disPhrase = `${formatAlunniNoun(disabilita)} con disabilità certificata (L. 104/1992)`;
    if (variantIdx === 0) {
      return `Nella classe è inoltre presente ${disPhrase}, per il cui percorso formativo si opera in costante raccordo con il Piano Educativo Individualizzato (PEI) e con le attività inclusive del Consiglio di Classe.`;
    }
    if (variantIdx === 1) {
      return `Il gruppo accoglie altresì ${disPhrase}, seguito secondo gli obiettivi individualizzati e le strategie di inclusione definiti nel rispettivo PEI.`;
    }
    return `All’interno del contesto classe è inserito anche ${disPhrase}, accompagnato mediante interventi didattici inclusivi e calibrati in piena coerenza con il PEI.`;
  }

  return '';
}

export function buildQuickCompositionAndInclusionIntro(
  plan: Programmazione,
  variantIndex: 0 | 1 | 2
): string {
  const { alunni, maschi, femmine, ripetenti, bes, disabilita = 0 } = plan.composizione;
  const classeLabel = [plan.datiGenerali.classe, plan.datiGenerali.sezione]
    .filter(Boolean)
    .join(' ')
    .trim();
  const disciplina = (plan.datiGenerali.disciplina || 'la disciplina').trim();

  const repClause =
    ripetenti > 0
      ? `, tra cui ${ripetenti} ${ripetenti === 1 ? 'alunno ripetente' : 'alunni ripetenti'}`
      : '';

  let baseSentence = '';
  if (variantIndex === 0) {
    baseSentence = `In riferimento alla disciplina ${disciplina}, la classe ${classeLabel} è composta da ${alunni} alunni (${maschi} maschi e ${femmine} femmine)${repClause}.`;
  } else if (variantIndex === 1) {
    baseSentence = `Il gruppo classe della ${classeLabel}, osservato nell’ambito di ${disciplina}, conta complessivamente ${alunni} studenti (${maschi} ragazzi e ${femmine} ragazze)${repClause}.`;
  } else {
    baseSentence = `Per quanto concerne ${disciplina}, nella classe ${classeLabel} risultano iscritti ${alunni} alunni (${maschi} maschi e ${femmine} femmine)${repClause}.`;
  }

  const inclusionSentence = buildInclusionSentence(bes, disabilita, variantIndex);
  return [baseSentence, inclusionSentence].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

export function generateQuickClassDescription(
  plan: Programmazione,
  selection: QuickClassModeSelection,
  variantOverride?: 0 | 1 | 2
): string {
  const rawVariant =
    typeof variantOverride === 'number'
      ? variantOverride
      : selection.varianteSelezionata ?? 0;
  const variantIdx = ((((rawVariant % 3) + 3) % 3) as 0 | 1 | 2);

  const intro = buildQuickCompositionAndInclusionIntro(plan, variantIdx);
  const variants = getQuickArchiveVariants(selection);
  const archiveBody = variants[variantIdx] ?? variants[0];

  return `${intro}\n\n${archiveBody}`.trim();
}
