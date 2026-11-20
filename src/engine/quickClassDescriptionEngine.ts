import { CLASS_QUICK_DESCRIPTIONS_ARCHIVE } from '../data/classQuickDescriptionsArchive';
import type {
  ClassLivello,
  ClassTipologia,
  Programmazione,
  QuickClassModeKey,
  QuickClassModeSelection,
  QuickEterogeneitaLevel,
  QuickLivelloGeneraleLevel,
  QuickMotivazioneLevel,
  QuickRegoleVivacitaLevel,
  QuickSocializzazioneLevel,
} from '../domain/types';

export interface QuickQuestionOption<T extends string> {
  value: T;
  label: string;
  hint: string;
}

export type QuickQuestionKey =
  | 'eterogeneita'
  | 'livelloGenerale'
  | 'socializzazione'
  | 'regoleVivacita'
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
  QuickQuestionSpec<QuickLivelloGeneraleLevel>,
  QuickQuestionSpec<QuickSocializzazioneLevel>,
  QuickQuestionSpec<QuickRegoleVivacitaLevel>,
  QuickQuestionSpec<QuickMotivazioneLevel>,
] = [
  {
    key: 'eterogeneita',
    number: 1,
    title: 'Livello di eterogeneità',
    prompt: 'Quanto sono differenziati i ritmi, gli stili cognitivi e i livelli di partenza?',
    options: [
      {
        value: 'omogenea',
        label: 'Bassa (classe sostanzialmente omogenea)',
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
    key: 'livelloGenerale',
    number: 2,
    title: 'Livello generale della classe',
    prompt: 'Qual è la preparazione didattica media e la tenuta dei prerequisiti disciplinari?',
    options: [
      {
        value: 'buono',
        label: 'Medio-alto / Buono',
        hint: 'Prerequisiti disciplinari mediamente solidi e buona padronanza strumentale',
      },
      {
        value: 'medio',
        label: 'Medio / Discreto',
        hint: 'Conoscenze essenziali presenti ma da consolidare nel metodo di studio',
      },
      {
        value: 'fragile',
        label: 'Medio-basso / Fragile',
        hint: 'Lacune diffuse nei saperi fondamentali e necessità di recupero mirato',
      },
    ],
  },
  {
    key: 'socializzazione',
    number: 3,
    title: 'Socializzazione',
    prompt: 'Come risultano i legami interpersonali, la collaborazione e l’inclusione tra pari?',
    options: [
      {
        value: 'positiva',
        label: 'Positiva e inclusiva',
        hint: 'Relazioni serene, collaborative e solidali tra i componenti della classe',
      },
      {
        value: 'selettiva',
        label: 'Selettiva / a sottogruppi',
        hint: 'Rapporti nel complesso corretti ma articolati in piccoli gruppi chiusi',
      },
      {
        value: 'difficile',
        label: 'Difficile o conflittuale',
        hint: 'Tensioni interpersonali, rivalità o fatica nella cooperazione tra pari',
      },
    ],
  },
  {
    key: 'regoleVivacita',
    number: 4,
    title: 'Rispetto delle regole / vivacità',
    prompt: 'Come si presenta il contegno in aula rispetto a regole, ascolto e autocontrollo?',
    options: [
      {
        value: 'ordinata',
        label: 'Ordinata e rispettosa delle regole',
        hint: 'Contegno calmo, ascolto regolare e rispetto dei tempi di lavoro',
      },
      {
        value: 'vivace',
        label: 'Vivace ma gestibile',
        hint: 'Esuberanza comunicativa che richiede richiami costruttivi e guida chiara',
      },
      {
        value: 'irrequieta',
        label: 'Irrequieta / poco rispettosa delle regole',
        hint: 'Frequenti interruzioni o inosservanze che richiedono presidio costante',
      },
    ],
  },
  {
    key: 'motivazione',
    number: 5,
    title: 'Motivazione',
    prompt: 'Qual è l’atteggiamento prevalente verso le attività scolastiche e la partecipazione?',
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
  livelloGenerale: 'medio',
  socializzazione: 'positiva',
  regoleVivacita: 'ordinata',
  motivazione: 'selettiva',
  varianteSelezionata: 0,
};

/**
 * Normalizza eventuali salvataggi precedenti (anche nel vecchio formato a 4 domande).
 */
export function normalizeQuickClassSelection(
  raw?: Partial<QuickClassModeSelection> | null
): QuickClassModeSelection {
  if (!raw) return DEFAULT_QUICK_CLASS_SELECTION;

  const eterogeneita: QuickEterogeneitaLevel =
    raw.eterogeneita === 'omogenea' ||
    raw.eterogeneita === 'moderata' ||
    raw.eterogeneita === 'elevata'
      ? raw.eterogeneita
      : DEFAULT_QUICK_CLASS_SELECTION.eterogeneita;

  const rawPrep = raw.livelloGenerale ?? raw.preparazione;
  const livelloGenerale: QuickLivelloGeneraleLevel =
    rawPrep === 'buono' || rawPrep === 'medio' || rawPrep === 'fragile'
      ? rawPrep
      : DEFAULT_QUICK_CLASS_SELECTION.livelloGenerale;

  const socializzazione: QuickSocializzazioneLevel =
    raw.socializzazione === 'positiva' ||
    raw.socializzazione === 'selettiva' ||
    raw.socializzazione === 'difficile'
      ? raw.socializzazione
      : raw.clima === 'complesso'
      ? 'difficile'
      : raw.clima === 'vivace'
      ? 'selettiva'
      : DEFAULT_QUICK_CLASS_SELECTION.socializzazione;

  const regoleVivacita: QuickRegoleVivacitaLevel =
    raw.regoleVivacita === 'ordinata' ||
    raw.regoleVivacita === 'vivace' ||
    raw.regoleVivacita === 'irrequieta'
      ? raw.regoleVivacita
      : raw.clima === 'complesso'
      ? 'irrequieta'
      : raw.clima === 'vivace'
      ? 'vivace'
      : DEFAULT_QUICK_CLASS_SELECTION.regoleVivacita;

  const motivazione: QuickMotivazioneLevel =
    raw.motivazione === 'attiva' ||
    raw.motivazione === 'selettiva' ||
    raw.motivazione === 'debole'
      ? raw.motivazione
      : DEFAULT_QUICK_CLASS_SELECTION.motivazione;

  const rawVar = Number(raw.varianteSelezionata ?? 0);
  const varianteSelezionata = ((((Number.isFinite(rawVar) ? rawVar : 0) % 3) + 3) % 3) as
    | 0
    | 1
    | 2;

  return {
    eterogeneita,
    livelloGenerale,
    socializzazione,
    regoleVivacita,
    motivazione,
    varianteSelezionata,
  };
}

export function buildQuickClassKey(
  selection: Pick<
    QuickClassModeSelection,
    'eterogeneita' | 'livelloGenerale' | 'socializzazione' | 'regoleVivacita' | 'motivazione'
  >
): QuickClassModeKey {
  return `${selection.eterogeneita}|${selection.livelloGenerale}|${selection.socializzazione}|${selection.regoleVivacita}|${selection.motivazione}`;
}

export function getQuickArchiveCombinationCount(): number {
  return Object.keys(CLASS_QUICK_DESCRIPTIONS_ARCHIVE).length;
}

export function getQuickArchiveVariants(
  selection: Pick<
    QuickClassModeSelection,
    'eterogeneita' | 'livelloGenerale' | 'socializzazione' | 'regoleVivacita' | 'motivazione'
  >
): readonly [string, string, string] {
  const key = buildQuickClassKey(selection);
  return (
    CLASS_QUICK_DESCRIPTIONS_ARCHIVE[key] ??
    CLASS_QUICK_DESCRIPTIONS_ARCHIVE['moderata|medio|positiva|ordinata|selettiva']
  );
}

/**
 * Ricava una proposta coerente per la griglia ministeriale ("Tipologia" e "Livello")
 * a partire dalle 5 risposte della Modalità Semplice.
 */
export function deriveSuggestedSituazioneFromQuick(
  selection: QuickClassModeSelection
): { tipologie: ClassTipologia[]; livello: ClassLivello } {
  const tipologie: ClassTipologia[] = [];
  if (selection.regoleVivacita === 'ordinata') tipologie.push('tranquilla');
  if (selection.regoleVivacita === 'vivace') tipologie.push('vivace');
  if (selection.regoleVivacita === 'irrequieta' || selection.socializzazione === 'difficile') {
    tipologie.push('problematica');
  }
  if (selection.socializzazione === 'positiva') {
    tipologie.push('collaborativa');
  } else if (selection.socializzazione === 'difficile') {
    tipologie.push('poco collaborativa');
  }
  if (selection.motivazione === 'attiva') {
    tipologie.push('motivata');
  } else if (selection.motivazione === 'debole') {
    tipologie.push('poco motivata');
  }

  const livello: ClassLivello =
    selection.livelloGenerale === 'buono'
      ? 'medio-alto'
      : selection.livelloGenerale === 'fragile'
      ? 'medio-basso'
      : 'medio';

  return {
    tipologie: Array.from(new Set(tipologie)),
    livello,
  };
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
      return `Nel gruppo classe sono inoltre presenti ${besPhrase} e ${disPhrase}, per i quali si farà riferimento rispettivamente al Piano Didattico Personalizzato (PDP) e al Piano Educativo Individualizzato (PEI), attivando strumenti compensativi, misure dispensative e strategie inclusive calibrate.`;
    }
    if (variantIdx === 1) {
      return `Si segnala altresì la presenza di ${disPhrase} e di ${besPhrase}: per garantire il pieno successo formativo si farà riferimento ai rispettivi PEI e PDP predisposti e condivisi dal Consiglio di Classe.`;
    }
    return `All’interno della classe figurano infine ${besPhrase} e ${disPhrase}; per il loro percorso scolastico si farà espresso riferimento alle misure personalizzate e individualizzate definite nei rispettivi PDP e PEI.`;
  }

  if (bes > 0) {
    const besPhrase = `${formatAlunniNoun(bes)} con Bisogni Educativi Speciali (BES)`;
    const refPdp = bes === 1 ? 'al rispettivo Piano Didattico Personalizzato (PDP)' : 'ai rispettivi Piani Didattici Personalizzati (PDP)';
    if (variantIdx === 0) {
      return `Nel gruppo classe è inoltre registrata la presenza di ${besPhrase}, per ${bes === 1 ? 'il quale' : 'i quali'} si farà riferimento ${refPdp} attraverso idonei strumenti compensativi e misure dispensative.`;
    }
    if (variantIdx === 1) {
      return `All’interno della classe figurano anche ${besPhrase}: per la personalizzazione del loro apprendimento si farà riferimento ${refPdp}.`;
    }
    return `Si rileva inoltre la presenza di ${besPhrase}, il cui percorso sarà opportunamente calibrato facendo riferimento ${refPdp} approvato dal Consiglio di Classe.`;
  }

  if (disabilita > 0) {
    const disPhrase = `${formatAlunniNoun(disabilita)} con disabilità certificata (L. 104/1992)`;
    const refPei = disabilita === 1 ? 'al Piano Educativo Individualizzato (PEI)' : 'ai rispettivi Piani Educativi Individualizzati (PEI)';
    if (variantIdx === 0) {
      return `Nella classe è inoltre presente ${disPhrase}, per ${disabilita === 1 ? 'il quale' : 'i quali'} si farà costante riferimento ${refPei} e alle azioni inclusive concordate dal Consiglio di Classe.`;
    }
    if (variantIdx === 1) {
      return `Il gruppo accoglie altresì ${disPhrase}: per obiettivi, adattamenti e verifiche si farà diretto riferimento ${refPei}.`;
    }
    return `All’interno del contesto classe è inserito anche ${disPhrase}; l’azione didattica si svolgerà in pieno raccordo con quanto stabilito facendo riferimento ${refPei}.`;
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

  const hasTotal = typeof alunni === 'number' && alunni > 0;
  const hasSexCounts = typeof maschi === 'number' && typeof femmine === 'number';
  const sexParen = hasSexCounts ? ` (${maschi} maschi e ${femmine} femmine)` : '';
  const sexParenAlt = hasSexCounts ? ` (${maschi} ragazzi e ${femmine} ragazze)` : '';

  let baseSentence = '';
  if (hasTotal) {
    if (variantIndex === 0) {
      baseSentence = `In riferimento alla disciplina ${disciplina}, la classe ${classeLabel} è composta da ${alunni} alunni${sexParen}${repClause}.`;
    } else if (variantIndex === 1) {
      baseSentence = `Il gruppo classe della ${classeLabel}, osservato nell’ambito di ${disciplina}, conta complessivamente ${alunni} studenti${sexParenAlt}${repClause}.`;
    } else {
      baseSentence = `Per quanto concerne ${disciplina}, nella classe ${classeLabel} risultano iscritti ${alunni} alunni${sexParen}${repClause}.`;
    }
  } else {
    const fallbackRep =
      ripetenti > 0
        ? `, con la presenza di ${ripetenti} ${ripetenti === 1 ? 'alunno ripetente' : 'alunni ripetenti'}`
        : '';
    if (variantIndex === 0) {
      baseSentence = `In riferimento alla disciplina ${disciplina}, si delinea il quadro iniziale della classe ${classeLabel}${fallbackRep}.`;
    } else if (variantIndex === 1) {
      baseSentence = `Il gruppo classe della ${classeLabel}, osservato nell’ambito di ${disciplina}, presenta il seguente profilo iniziale${fallbackRep}.`;
    } else {
      baseSentence = `Per quanto concerne ${disciplina}, l’analisi della classe ${classeLabel} considera l’andamento complessivo degli studenti${fallbackRep}.`;
    }
  }

  const inclusionSentence = buildInclusionSentence(bes, disabilita, variantIndex);
  return [baseSentence, inclusionSentence].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

export function generateQuickClassDescription(
  plan: Programmazione,
  rawSelection: Partial<QuickClassModeSelection> | QuickClassModeSelection,
  variantOverride?: 0 | 1 | 2
): string {
  const selection = normalizeQuickClassSelection(rawSelection);
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
