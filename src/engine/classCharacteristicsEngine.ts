import {
  createDefaultClassDimensions,
  DEFAULT_SOGLIE_QUOTE_CARATTERISTICHE,
} from '../domain/defaults';
import type {
  AnonymousStudentBandEntry,
  ClassCharacteristicDimension,
  ClassCharacteristicSegment,
  FasciaLivelloKey,
  Programmazione,
  SchoolSettings,
  SoglieQuoteCaratteristiche,
} from '../domain/types';
import {
  extractCognomeOnly,
  extractRegisterOrderAndCleanName,
  formatStudentNameTitleCase,
} from './gradebookImporter';

export { extractRegisterOrderAndCleanName, formatStudentNameTitleCase };

export interface DocumentCharacteristicParagraph {
  id: string;
  nome: string;
  testo: string;
}

export const NON_DEFINITO_LABEL = 'non definito';

const ADJECTIVE_INFLECTIONS: Record<string, { singularMasc: string; plural: string }> = {
  tranquilla: { singularMasc: 'tranquillo', plural: 'tranquilli' },
  vivace: { singularMasc: 'vivace', plural: 'vivaci' },
  motivata: { singularMasc: 'motivato', plural: 'motivati' },
  'poco motivata': { singularMasc: 'poco motivato', plural: 'poco motivati' },
  'attenta e interessata': { singularMasc: 'attento e interessato', plural: 'attenti e interessati' },
  'discontinua nell’impegno': {
    singularMasc: 'discontinuo nell’impegno',
    plural: 'discontinui nell’impegno',
  },
  "discontinua nell'impegno": {
    singularMasc: "discontinuo nell'impegno",
    plural: "discontinui nell'impegno",
  },
  collaborativa: { singularMasc: 'collaborativo', plural: 'collaborativi' },
  'poco collaborativa': { singularMasc: 'poco collaborativo', plural: 'poco collaborativi' },
  'rispettosa delle regole': {
    singularMasc: 'rispettoso delle regole',
    plural: 'rispettosi delle regole',
  },
  'solidale e inclusiva': {
    singularMasc: 'solidale e inclusivo',
    plural: 'solidali e inclusivi',
  },
  'tendente a isolarsi': {
    singularMasc: 'tendente a isolarsi',
    plural: 'tendenti a isolarsi',
  },
  'conflittuale nelle dinamiche di gruppo': {
    singularMasc: 'conflittuale nelle dinamiche di gruppo',
    plural: 'conflittuali nelle dinamiche di gruppo',
  },
  problematica: { singularMasc: 'problematico', plural: 'problematici' },
  autonoma: { singularMasc: 'autonomo', plural: 'autonomi' },
  'pienamente autonoma': { singularMasc: 'pienamente autonomo', plural: 'pienamente autonomi' },
  'autonoma nello svolgimento delle consegne': {
    singularMasc: 'autonomo nello svolgimento delle consegne',
    plural: 'autonomi nello svolgimento delle consegne',
  },
  'bisognosa di guida costante': {
    singularMasc: 'bisognoso di guida costante',
    plural: 'bisognosi di guida costante',
  },
  'non ancora autonoma': {
    singularMasc: 'non ancora autonomo',
    plural: 'non ancora autonomi',
  },
  partecipativa: { singularMasc: 'partecipativo', plural: 'partecipativi' },
  'attiva e costruttiva': {
    singularMasc: 'attivo e costruttivo',
    plural: 'attivi e costruttivi',
  },
  'partecipativa se sollecitata': {
    singularMasc: 'partecipativo se sollecitato',
    plural: 'partecipativi se sollecitati',
  },
  'passiva o silenziosa': {
    singularMasc: 'passivo o silenzioso',
    plural: 'passivi o silenziosi',
  },
  'dispersiva o poco partecipativa': {
    singularMasc: 'dispersivo o poco partecipativo',
    plural: 'dispersivi o poco partecipativi',
  },
  attenta: { singularMasc: 'attento', plural: 'attenti' },
};

function makeId(prefix: string): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function isNonDefinitoSegment(seg: ClassCharacteristicSegment): boolean {
  const lower = seg.etichetta.trim().toLowerCase();
  return Boolean(seg.isNessuno) || lower === 'nessuno' || lower === NON_DEFINITO_LABEL;
}

function adaptAdjectiveForSubject(
  etichetta: string,
  subjectKind: 'singular_fem' | 'singular_masc' | 'plural'
): { isKnownAdjective: boolean; value: string } {
  const trimmed = etichetta.trim();
  const key = trimmed.toLowerCase();
  const match = ADJECTIVE_INFLECTIONS[key];
  if (!match) {
    return { isKnownAdjective: false, value: trimmed };
  }
  if (subjectKind === 'singular_fem') {
    return { isKnownAdjective: true, value: trimmed };
  }
  return {
    isKnownAdjective: true,
    value: subjectKind === 'singular_masc' ? match.singularMasc : match.plural,
  };
}

/**
 * Garantisce che ogni dimensione abbia sempre il segmento "non definito" all'indice 0 (a sinistra)
 * e che la somma delle percentuali sia esattamente 100% (valori interi 0..100).
 */
export function normalizeDimensionSegments(
  rawSegments: ClassCharacteristicSegment[] | undefined
): ClassCharacteristicSegment[] {
  const input = (rawSegments ?? []).map((s) => ({
    ...s,
    quotaPercentuale: Math.max(0, Math.min(100, Math.round(Number(s.quotaPercentuale) || 0))),
  }));

  const definedSegments = input
    .filter((s) => !isNonDefinitoSegment(s))
    .map((s) => ({ ...s, isNessuno: false }));
  const existingNonDefinito = input.find(isNonDefinitoSegment);

  const nonDefinitoSeg: ClassCharacteristicSegment = existingNonDefinito
    ? { ...existingNonDefinito, etichetta: NON_DEFINITO_LABEL, isNessuno: true }
    : {
        id: makeId('seg-nondefinito'),
        etichetta: NON_DEFINITO_LABEL,
        quotaPercentuale: definedSegments.length === 0 ? 100 : 0,
        isNessuno: true,
      };

  const result = [nonDefinitoSeg, ...definedSegments];
  const sum = result.reduce((acc, s) => acc + s.quotaPercentuale, 0);

  if (sum < 100) {
    // Completa su "non definito" (indice 0) così la somma è esattamente 100
    result[0] = {
      ...result[0],
      quotaPercentuale: result[0].quotaPercentuale + (100 - sum),
    };
  } else if (sum > 100) {
    // Riduce prima da "non definito" (indice 0), poi dai segmenti a destra (1..n-1)
    let excess = sum - 100;
    const takeFromNonDef = Math.min(result[0].quotaPercentuale, excess);
    result[0] = {
      ...result[0],
      quotaPercentuale: result[0].quotaPercentuale - takeFromNonDef,
    };
    excess -= takeFromNonDef;

    for (let idx = 1; idx < result.length && excess > 0; idx++) {
      const take = Math.min(result[idx].quotaPercentuale, excess);
      result[idx] = {
        ...result[idx],
        quotaPercentuale: result[idx].quotaPercentuale - take,
      };
      excess -= take;
    }
  }

  return result;
}

export function ensureClassDimensions(
  existing: ClassCharacteristicDimension[] | undefined
): ClassCharacteristicDimension[] {
  if (!existing || existing.length === 0) {
    return createDefaultClassDimensions();
  }
  return existing.map((dim) => {
    const anyDim = dim as ClassCharacteristicDimension & { righe?: unknown };
    if (!Array.isArray(dim.segmenti) || dim.segmenti.length === 0) {
      const fallbackDefault = createDefaultClassDimensions().find((d) => d.id === dim.id);
      return {
        id: dim.id,
        nome: dim.nome,
        kind: dim.kind ?? (dim.id === 'dim-metodo' ? 'metodo_studio' : 'generale'),
        isCustom: dim.isCustom,
        segmenti: normalizeDimensionSegments(fallbackDefault?.segmenti),
        testoManuale: dim.testoManuale,
        isTestoManuale: dim.isTestoManuale,
      };
    }
    return {
      ...anyDim,
      kind: dim.kind ?? (dim.id === 'dim-metodo' ? 'metodo_studio' : 'generale'),
      segmenti: normalizeDimensionSegments(dim.segmenti),
    };
  });
}

/**
 * Sposta la leva `handleIndex` (tra `segmenti[handleIndex]` e `segmenti[handleIndex + 1]`)
 * verso `targetCumulativePct` (0..100). La somma della riga rimane sempre esattamente 100%.
 */
export function moveDimensionHandle(
  segmenti: ClassCharacteristicSegment[],
  handleIndex: number,
  targetCumulativePct: number
): ClassCharacteristicSegment[] {
  const normalized = normalizeDimensionSegments(segmenti);
  if (handleIndex < 0 || handleIndex >= normalized.length - 1) {
    return normalized;
  }

  const clampedTarget = Math.max(0, Math.min(100, Math.round(targetCumulativePct)));
  let currentCumulative = 0;
  for (let i = 0; i <= handleIndex; i++) {
    currentCumulative += normalized[i].quotaPercentuale;
  }

  const delta = clampedTarget - currentCumulative;
  if (delta === 0) return normalized;

  const next = normalized.map((s) => ({ ...s }));

  if (delta > 0) {
    let availableRight = 0;
    for (let j = handleIndex + 1; j < next.length; j++) {
      availableRight += next[j].quotaPercentuale;
    }
    const move = Math.min(delta, availableRight);
    if (move <= 0) return next;

    next[handleIndex].quotaPercentuale += move;
    let remaining = move;
    for (let j = handleIndex + 1; j < next.length && remaining > 0; j++) {
      const take = Math.min(next[j].quotaPercentuale, remaining);
      next[j].quotaPercentuale -= take;
      remaining -= take;
    }
  } else {
    const need = -delta;
    let availableLeft = 0;
    for (let j = handleIndex; j >= 0; j--) {
      availableLeft += next[j].quotaPercentuale;
    }
    const move = Math.min(need, availableLeft);
    if (move <= 0) return next;

    next[handleIndex + 1].quotaPercentuale += move;
    let remaining = move;
    for (let j = handleIndex; j >= 0 && remaining > 0; j--) {
      const take = Math.min(next[j].quotaPercentuale, remaining);
      next[j].quotaPercentuale -= take;
      remaining -= take;
    }
  }

  return next;
}

export function stepDimensionHandle(
  segmenti: ClassCharacteristicSegment[],
  handleIndex: number,
  delta: number
): ClassCharacteristicSegment[] {
  const normalized = normalizeDimensionSegments(segmenti);
  if (handleIndex < 0 || handleIndex >= normalized.length - 1) return normalized;
  let currentCumulative = 0;
  for (let i = 0; i <= handleIndex; i++) {
    currentCumulative += normalized[i].quotaPercentuale;
  }
  return moveDimensionHandle(normalized, handleIndex, currentCumulative + delta);
}

/**
 * Regola la quota percentuale di uno specifico segmento definito (`deltaPct` positivo o negativo).
 * - Se aumenta (`deltaPct > 0`): attinge PRIMA dallo spazio "non definito" (indice 0), e solo
 *   successivamente dai segmenti alla sua destra (e in ultima istanza dagli altri definiti).
 * - Se diminuisce (`deltaPct < 0`): restituisce la quota allo spazio "non definito" (indice 0).
 */
export function adjustCharacteristicQuota(
  dimension: ClassCharacteristicDimension,
  segmentId: string,
  deltaPct: number
): ClassCharacteristicDimension {
  const normalized = normalizeDimensionSegments(dimension.segmenti);
  const targetIdx = normalized.findIndex((s) => s.id === segmentId);
  if (targetIdx <= 0 || isNonDefinitoSegment(normalized[targetIdx]) || deltaPct === 0) {
    return { ...dimension, segmenti: normalized };
  }

  const next = normalized.map((s) => ({ ...s, quotaNumerica: undefined }));
  if (deltaPct > 0) {
    let remaining = Math.min(deltaPct, 100 - next[targetIdx].quotaPercentuale);
    let gained = 0;

    // 1. Prima sottrai da "non definito" (indice 0)
    const fromNonDef = Math.min(next[0].quotaPercentuale, remaining);
    next[0].quotaPercentuale -= fromNonDef;
    remaining -= fromNonDef;
    gained += fromNonDef;

    // 2. Poi sottrai dai segmenti a destra di targetIdx
    for (let i = targetIdx + 1; i < next.length && remaining > 0; i++) {
      const take = Math.min(next[i].quotaPercentuale, remaining);
      next[i].quotaPercentuale -= take;
      remaining -= take;
      gained += take;
    }

    // 3. Infine, se ancora necessario, sottrai dai segmenti definiti a sinistra di targetIdx
    for (let i = 1; i < targetIdx && remaining > 0; i++) {
      const take = Math.min(next[i].quotaPercentuale, remaining);
      next[i].quotaPercentuale -= take;
      remaining -= take;
      gained += take;
    }

    next[targetIdx].quotaPercentuale += gained;
  } else {
    const freed = Math.min(-deltaPct, next[targetIdx].quotaPercentuale);
    next[targetIdx].quotaPercentuale -= freed;
    next[0].quotaPercentuale += freed;
  }

  return {
    ...dimension,
    segmenti: normalizeDimensionSegments(next),
  };
}

/**
 * Aggiunge una nuova caratteristica con quota iniziale 0% dopo le caratteristiche già presenti
 * (a destra di "non definito"), preservando integralmente tutte le altre quote della dimensione.
 */
export function addCharacteristicToDimension(
  dimension: ClassCharacteristicDimension,
  etichetta: string
): ClassCharacteristicDimension {
  const clean = etichetta.trim();
  const lower = clean.toLowerCase();
  if (!clean || lower === 'nessuno' || lower === NON_DEFINITO_LABEL) return dimension;

  const normalized = normalizeDimensionSegments(dimension.segmenti);
  const newSegment: ClassCharacteristicSegment = {
    id: makeId('seg'),
    etichetta: clean,
    quotaPercentuale: 0,
    isNessuno: false,
  };

  return {
    ...dimension,
    segmenti: [...normalized, newSegment],
  };
}

/**
 * Rimuove una caratteristica non-"non definito" trasferendone l'eventuale quota a "non definito",
 * senza modificare le quote delle altre caratteristiche presenti.
 */
export function removeCharacteristicFromDimension(
  dimension: ClassCharacteristicDimension,
  segmentId: string
): ClassCharacteristicDimension {
  const normalized = normalizeDimensionSegments(dimension.segmenti);
  const target = normalized.find((s) => s.id === segmentId);
  if (!target || isNonDefinitoSegment(target)) return dimension;

  const remaining = normalized.filter((s) => s.id !== segmentId);
  remaining[0] = {
    ...remaining[0],
    quotaPercentuale: remaining[0].quotaPercentuale + target.quotaPercentuale,
  };
  return {
    ...dimension,
    segmenti: normalizeDimensionSegments(remaining),
  };
}

/**
 * Imposta (o azzera con `undefined`) il numero esatto di alunni su un segmento,
 * adeguando la quota percentuale rispetto al totale della classe:
 * prima varia "non definito" (indice 0) e, se esaurito, i segmenti a destra.
 */
export function setSegmentExactCount(
  dimension: ClassCharacteristicDimension,
  segmentId: string,
  exactCount: number | undefined,
  alunniTotali: number
): ClassCharacteristicDimension {
  const normalized = normalizeDimensionSegments(dimension.segmenti);
  const targetIdx = normalized.findIndex((s) => s.id === segmentId);
  if (targetIdx === -1 || isNonDefinitoSegment(normalized[targetIdx])) return dimension;

  if (exactCount === undefined) {
    const next = normalized.map((s) =>
      s.id === segmentId ? { ...s, quotaNumerica: undefined } : s
    );
    return { ...dimension, segmenti: next };
  }

  const safeCount = Math.max(0, Math.round(exactCount));
  const next = normalized.map((s) =>
    s.id === segmentId ? { ...s, quotaNumerica: safeCount } : { ...s }
  );

  if (alunniTotali > 0) {
    const targetPct = Math.min(100, Math.max(0, Math.round((safeCount / alunniTotali) * 100)));
    const diff = targetPct - next[targetIdx].quotaPercentuale;

    if (diff > 0) {
      let remaining = diff;
      // Prima riduci "non definito" (indice 0)
      const fromNonDef = Math.min(next[0].quotaPercentuale, remaining);
      next[0].quotaPercentuale -= fromNonDef;
      remaining -= fromNonDef;

      // Poi riduci dai segmenti a destra di targetIdx
      for (let i = targetIdx + 1; i < next.length && remaining > 0; i++) {
        const take = Math.min(next[i].quotaPercentuale, remaining);
        next[i].quotaPercentuale -= take;
        remaining -= take;
      }

      // Infine dagli altri segmenti definiti a sinistra
      for (let i = 1; i < targetIdx && remaining > 0; i++) {
        const take = Math.min(next[i].quotaPercentuale, remaining);
        next[i].quotaPercentuale -= take;
        remaining -= take;
      }
      next[targetIdx].quotaPercentuale += diff - remaining;
    } else if (diff < 0) {
      const freed = -diff;
      next[targetIdx].quotaPercentuale -= freed;
      next[0].quotaPercentuale += freed;
    }
  }

  return {
    ...dimension,
    segmenti: normalizeDimensionSegments(next),
  };
}

/**
 * Quando viene modificato il numero totale degli alunni della classe:
 * - prima aumenta o diminuisce lo spazio "non definito" (indice 0);
 * - se "non definito" si azzera (totale diminuito oltre la disponibilità), ridimensiona
 *   successivamente i segmenti definiti a destra.
 */
export function reconcileDimensionsWithTotalStudents(
  dimensions: ClassCharacteristicDimension[] | undefined,
  oldTotal: number,
  newTotal: number
): ClassCharacteristicDimension[] {
  const normalized = ensureClassDimensions(dimensions);
  if (newTotal <= 0 || oldTotal === newTotal) return normalized;

  return normalized.map((dim) => {
    const next = normalizeDimensionSegments(dim.segmenti).map((s) => ({ ...s }));
    const hasExplicitCounts = next.some((s, i) => i > 0 && s.quotaNumerica !== undefined && s.quotaNumerica > 0);

    if (hasExplicitCounts) {
      let sumDefined = 0;
      for (let i = 1; i < next.length; i++) {
        const seg = next[i];
        if (seg.quotaNumerica !== undefined && seg.quotaNumerica > 0) {
          seg.quotaPercentuale = Math.min(
            100,
            Math.max(0, Math.round((seg.quotaNumerica / newTotal) * 100))
          );
        } else if (oldTotal > 0 && seg.quotaPercentuale > 0) {
          const prevCount = Math.round((seg.quotaPercentuale / 100) * oldTotal);
          seg.quotaPercentuale = Math.min(
            100,
            Math.max(0, Math.round((prevCount / newTotal) * 100))
          );
        }
        sumDefined += seg.quotaPercentuale;
      }

      if (sumDefined <= 100) {
        next[0].quotaPercentuale = 100 - sumDefined;
      } else {
        // "non definito" va a 0%, l'eccesso riduce successivamente i segmenti a destra
        next[0].quotaPercentuale = 0;
        let excess = sumDefined - 100;
        for (let i = next.length - 1; i >= 1 && excess > 0; i--) {
          const take = Math.min(next[i].quotaPercentuale, excess);
          next[i].quotaPercentuale -= take;
          excess -= take;
        }
      }
      return { ...dim, segmenti: normalizeDimensionSegments(next) };
    }

    // Anche senza numeri esatti: mantenendo il conteggio implicito dei segmenti definiti
    // rispetto a oldTotal, è "non definito" ad assorbire per primo aumento/diminuzione.
    if (oldTotal > 0 && !isDimensionAllNessuno(dim)) {
      let sumDefined = 0;
      for (let i = 1; i < next.length; i++) {
        if (next[i].quotaPercentuale <= 0) continue;
        const impliedCount = Math.round((next[i].quotaPercentuale / 100) * oldTotal);
        next[i].quotaPercentuale = Math.min(
          100,
          Math.max(0, Math.round((impliedCount / newTotal) * 100))
        );
        sumDefined += next[i].quotaPercentuale;
      }
      if (sumDefined <= 100) {
        next[0].quotaPercentuale = 100 - sumDefined;
      } else {
        next[0].quotaPercentuale = 0;
        let excess = sumDefined - 100;
        for (let i = next.length - 1; i >= 1 && excess > 0; i--) {
          const take = Math.min(next[i].quotaPercentuale, excess);
          next[i].quotaPercentuale -= take;
          excess -= take;
        }
      }
      return { ...dim, segmenti: normalizeDimensionSegments(next) };
    }

    return { ...dim, segmenti: next };
  });
}

export function createCustomDimension(nome: string): ClassCharacteristicDimension {
  return {
    id: makeId('dim'),
    nome: nome.trim() || 'Nuova dimensione',
    kind: 'generale',
    isCustom: true,
    segmenti: [
      {
        id: makeId('seg-nondefinito'),
        etichetta: NON_DEFINITO_LABEL,
        quotaPercentuale: 100,
        isNessuno: true,
      },
    ],
  };
}

export const STYLISTIC_VARIANTS_COUNT = 10;

type SubjectKind = 'singular_fem' | 'singular_masc' | 'plural';

interface SubjectSpec {
  np: string;
  kind: SubjectKind;
}

type PhraseBuilder = (subj: SubjectSpec) => string;

function subjVerb(subj: SubjectSpec, singular: string, plural: string): string {
  return subj.kind === 'plural' ? plural : singular;
}

function subjAdj(
  subj: SubjectSpec,
  femSing: string,
  mascSing: string,
  mascPlur: string
): string {
  if (subj.kind === 'plural') return mascPlur;
  return subj.kind === 'singular_masc' ? mascSing : femSing;
}

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function getDimensionVariantIndex(
  dimension: Pick<ClassCharacteristicDimension, 'id' | 'nome' | 'varianteStile'>,
  contextSeed = ''
): number {
  if (typeof dimension.varianteStile === 'number' && Number.isFinite(dimension.varianteStile)) {
    return ((Math.floor(dimension.varianteStile) % STYLISTIC_VARIANTS_COUNT) + STYLISTIC_VARIANTS_COUNT) %
      STYLISTIC_VARIANTS_COUNT;
  }
  const seedKey = `${contextSeed}|${dimension.id}|${dimension.nome.trim().toLowerCase()}`;
  return hashString(seedKey) % STYLISTIC_VARIANTS_COUNT;
}

const SUBJECT_EXPRESSIONS: Record<
  | 'tutta la classe'
  | 'quasi tutta la classe'
  | 'la maggior parte'
  | 'circa metà'
  | 'una parte'
  | 'pochi',
  SubjectSpec[]
> = {
  'tutta la classe': [
    { np: 'tutta la classe', kind: 'singular_fem' },
    { np: 'l’intero gruppo classe', kind: 'singular_masc' },
    { np: 'la classe nel suo insieme', kind: 'singular_fem' },
    { np: 'la totalità del gruppo', kind: 'singular_fem' },
    { np: 'tutto il gruppo degli alunni', kind: 'singular_masc' },
  ],
  'quasi tutta la classe': [
    { np: 'quasi tutta la classe', kind: 'singular_fem' },
    { np: 'quasi tutti gli alunni', kind: 'plural' },
    { np: 'la quasi totalità della classe', kind: 'singular_fem' },
    { np: 'la larga maggioranza del gruppo', kind: 'singular_fem' },
    { np: 'la quasi totalità degli alunni', kind: 'singular_fem' },
  ],
  'la maggior parte': [
    { np: 'la maggior parte della classe', kind: 'singular_fem' },
    { np: 'la maggior parte degli alunni', kind: 'plural' },
    { np: 'gran parte del gruppo classe', kind: 'singular_fem' },
    { np: 'la componente prevalente della classe', kind: 'singular_fem' },
    { np: 'una larga maggioranza di alunni', kind: 'singular_fem' },
  ],
  'circa metà': [
    { np: 'circa metà della classe', kind: 'singular_fem' },
    { np: 'all’incirca metà del gruppo classe', kind: 'singular_fem' },
    { np: 'una metà della classe', kind: 'singular_fem' },
    { np: 'circa metà degli alunni', kind: 'plural' },
    { np: 'quasi la metà del gruppo', kind: 'singular_fem' },
  ],
  'una parte': [
    { np: 'una parte della classe', kind: 'singular_fem' },
    { np: 'alcuni alunni', kind: 'plural' },
    { np: 'una componente del gruppo', kind: 'singular_fem' },
    { np: 'un nucleo di alunni', kind: 'singular_masc' },
    { np: 'diversi alunni', kind: 'plural' },
  ],
  pochi: [
    { np: 'pochi alunni', kind: 'plural' },
    { np: 'un ristretto numero di alunni', kind: 'singular_masc' },
    { np: 'qualche alunno', kind: 'singular_masc' },
    { np: 'un piccolo nucleo di alunni', kind: 'singular_masc' },
    { np: 'una esigua minoranza del gruppo', kind: 'singular_fem' },
  ],
};

/**
 * 10 frasi stilisticamente curate e tra loro differenti per ogni tipologia/indicatore.
 */
const TIPOLOGIA_PHRASE_VARIANTS: Record<string, PhraseBuilder[]> = {
  motivata: [
    (s) => `${s.np} ${subjVerb(s, 'mostra', 'mostrano')} un buon livello di motivazione verso il lavoro scolastico`,
    (s) => `${s.np} ${subjVerb(s, 'affronta', 'affrontano')} le attività proposte con interesse e coinvolgimento`,
    (s) => `${s.np} ${subjVerb(s, 'manifesta', 'manifestano')} un atteggiamento propositivo e desiderio di apprendere`,
    (s) => `${s.np} ${subjVerb(s, 'risponde', 'rispondono')} con partecipazione e curiosità alle sollecitazioni didattiche`,
    (s) => `${s.np} ${subjVerb(s, 'rivela', 'rivelano')} una motivazione solida e costante nello studio`,
    (s) => `${s.np} ${subjVerb(s, 'si dimostra', 'si dimostrano')} ${subjAdj(s, 'motivata e disponibile', 'motivato e disponibile', 'motivati e disponibili')} all’impegno quotidiano`,
    (s) => `${s.np} ${subjVerb(s, 'evidenzia', 'evidenziano')} entusiasmo e apertura verso i nuovi argomenti`,
    (s) => `${s.np} ${subjVerb(s, 'partecipa', 'partecipano')} con slancio costruttivo al dialogo educativo`,
    (s) => `${s.np} ${subjVerb(s, 'mantiene', 'mantengono')} un approccio positivo e orientato al miglioramento personale`,
    (s) => `${s.np} ${subjVerb(s, 'dimostra', 'dimostrano')} apprezzabile interesse e continuità nella risposta alle consegne`,
  ],
  'attenta e interessata': [
    (s) => `${s.np} ${subjVerb(s, 'segue', 'seguono')} le spiegazioni con attenzione costante e vivo interesse`,
    (s) => `${s.np} ${subjVerb(s, 'ascolta', 'ascoltano')} con cura gli interventi, cogliendo prontamente i concetti chiave`,
    (s) => `${s.np} ${subjVerb(s, 'si dimostra', 'si dimostrano')} ${subjAdj(s, 'attenta e ricettiva', 'attento e ricettivo', 'attenti e ricettivi')} durante le lezioni`,
    (s) => `${s.np} ${subjVerb(s, 'mantiene', 'mantengono')} buoni tempi di concentrazione e partecipazione attenta`,
    (s) => `${s.np} ${subjVerb(s, 'evidenzia', 'evidenziano')} ascolto attivo e curiosità per i contenuti disciplinari`,
    (s) => `${s.np} ${subjVerb(s, 'presta', 'prestano')} attenzione puntuale alle consegne orali e operative`,
    (s) => `${s.np} ${subjVerb(s, 'risponde', 'rispondono')} con prontezza e sguardo attento alle proposte del docente`,
    (s) => `${s.np} ${subjVerb(s, 'mostra', 'mostrano')} interesse sincero e capacità di rimanere ${subjAdj(s, 'concentrata', 'concentrato', 'concentrati')} sul compito`,
    (s) => `${s.np} ${subjVerb(s, 'prende', 'prendono')} parte alle attività con vigile attenzione e buona ricettività`,
    (s) => `${s.np} ${subjVerb(s, 'opera', 'operano')} in aula con ascolto ordinato e coinvolgimento costante`,
  ],
  tranquilla: [
    (s) => `${s.np} ${subjVerb(s, 'mantiene', 'mantengono')} un contegno sereno e ordinato durante le ore di lezione`,
    (s) => `${s.np} ${subjVerb(s, 'lavora', 'lavorano')} in un clima disteso e rispettoso dei tempi della classe`,
    (s) => `${s.np} ${subjVerb(s, 'adotta', 'adottano')} un comportamento equilibrato e composto nelle attività quotidiane`,
    (s) => `${s.np} ${subjVerb(s, 'si distingue', 'si distinguono')} per un atteggiamento calmo e pacato in aula`,
    (s) => `${s.np} ${subjVerb(s, 'rispetta', 'rispettano')} con regolarità le pause e i momenti di lavoro individuale`,
    (s) => `${s.np} ${subjVerb(s, 'favorisce', 'favoriscono')} un ambiente scolastico tranquillo e propizio all’apprendimento`,
    (s) => `${s.np} ${subjVerb(s, 'evidenzia', 'evidenziano')} compostezza e misura negli scambi con compagni e docenti`,
    (s) => `${s.np} ${subjVerb(s, 'affronta', 'affrontano')} il percorso scolastico con serenità e senso dell’ordine`,
    (s) => `${s.np} ${subjVerb(s, 'garantisce', 'garantiscono')} una presenza ordinata, composta e rispettosa del contesto`,
    (s) => `${s.np} ${subjVerb(s, 'si presenta', 'si presentano')} ${subjAdj(s, 'tranquilla e ben disposta', 'tranquillo e ben disposto', 'tranquilli e ben disposti')} nella routine scolastica`,
  ],
  vivace: [
    (s) => `${s.np} ${subjVerb(s, 'presenta', 'presentano')} un temperamento vivace ed esuberante, talvolta bisognoso di richiami all’ordine`,
    (s) => `${s.np} ${subjVerb(s, 'manifesta', 'manifestano')} grande energia espressiva che richiede una guida ferma ma serena`,
    (s) => `${s.np} ${subjVerb(s, 'tende', 'tendono')} a intervenire con spontaneità, mostrando una vivacità da canalizzare positivamente`,
    (s) => `${s.np} ${subjVerb(s, 'si mostra', 'si mostrano')} ${subjAdj(s, 'dinamica e intraprendente', 'dinamico e intraprendente', 'dinamici e intraprendenti')}, pur necessitando di regole condivise`,
    (s) => `${s.np} ${subjVerb(s, 'esprime', 'esprimono')} una naturale vivacità relazionale che anima i momenti di confronto`,
    (s) => `${s.np} ${subjVerb(s, 'alterna', 'alternano')} slancio e curiosità a momenti di lieve irrequietezza comunicativa`,
    (s) => `${s.np} ${subjVerb(s, 'mostra', 'mostrano')} un profilo estroverso e vivace, più produttivo in attività pratiche e guidate`,
    (s) => `${s.np} ${subjVerb(s, 'rivela', 'rivelano')} vivacità di carattere e bisogno di ritmi didattici coinvolgenti`,
    (s) => `${s.np} ${subjVerb(s, 'reagisce', 'reagiscono')} con immediatezza agli stimoli, rendendo utile un costante raccordo educativo`,
    (s) => `${s.np} ${subjVerb(s, 'si caratterizza', 'si caratterizzano')} per esuberanza e spontaneità nel clima d’aula`,
  ],
  'poco motivata': [
    (s) => `${s.np} ${subjVerb(s, 'fatica', 'faticano')} a trovare una spinta motivazionale autonoma verso lo studio`,
    (s) => `${s.np} ${subjVerb(s, 'mostra', 'mostrano')} un coinvolgimento iniziale modesto e ${subjVerb(s, 'necessita', 'necessitano')} di stimoli frequenti`,
    (s) => `${s.np} ${subjVerb(s, 'tende', 'tendono')} a svolgere le attività scolastiche in modo essenziale e poco convinto`,
    (s) => `${s.np} ${subjVerb(s, 'richiede', 'richiedono')} sollecitazioni mirate per attivare interesse e partecipazione`,
    (s) => `${s.np} ${subjVerb(s, 'evidenzia', 'evidenziano')} un atteggiamento tiepido verso le proposte disciplinari`,
    (s) => `${s.np} ${subjVerb(s, 'necessita', 'necessitano')} di strategie coinvolgenti per superare una fragile motivazione di base`,
    (s) => `${s.np} ${subjVerb(s, 'affronta', 'affrontano')} i compiti assegnati senza particolare slancio né curiosità personale`,
    (s) => `${s.np} ${subjVerb(s, 'manifesta', 'manifestano')} debolezza nell’impegno personale e scarsa iniziativa spontanea`,
    (s) => `${s.np} ${subjVerb(s, 'risponde', 'rispondono')} solo in parte alle proposte educative, richiedendo un accompagnamento motivazionale`,
    (s) => `${s.np} ${subjVerb(s, 'si accosta', 'si accostano')} al lavoro scolastico con interesse contenuto e bisogno di rinforzo positivo`,
  ],
  'discontinua nell’impegno': [
    (s) => `${s.np} ${subjVerb(s, 'alterna', 'alternano')} fasi di lavoro produttivo a momenti di calo nell’impegno`,
    (s) => `${s.np} ${subjVerb(s, 'evidenzia', 'evidenziano')} un’applicazione discontinua sia in classe sia nello studio domestico`,
    (s) => `${s.np} ${subjVerb(s, 'fatica', 'faticano')} a mantenere una costanza regolare lungo l’intero arco delle attività`,
    (s) => `${s.np} ${subjVerb(s, 'presenta', 'presentano')} un andamento altalenante nell’assolvimento delle consegne`,
    (s) => `${s.np} ${subjVerb(s, 'mostra', 'mostrano')} buona disponibilità in alcune occasioni, ma scarsa regolarità nel tempo`,
    (s) => `${s.np} ${subjVerb(s, 'necessita', 'necessitano')} di monitoraggio periodico per rendere stabile la propria applicazione`,
    (s) => `${s.np} ${subjVerb(s, 'tende', 'tendono')} a concentrare lo sforzo soprattutto in prossimità delle verifiche`,
    (s) => `${s.np} ${subjVerb(s, 'rivela', 'rivelano')} un impegno non sempre lineare, sensibile al grado di interesse per l’argomento`,
    (s) => `${s.np} ${subjVerb(s, 'richiede', 'richiedono')} un richiamo costante alla puntualità e alla continuità del lavoro`,
    (s) => `${s.np} ${subjVerb(s, 'manifesta', 'manifestano')} ritmi di applicazione disomogenei che giovano di verifiche formative frequenti`,
  ],
  problematica: [
    (s) => `${s.np} ${subjVerb(s, 'manifesta', 'manifestano')} criticità comportamentali e di autocontrollo che richiedono attenzione educativa costante`,
    (s) => `${s.np} ${subjVerb(s, 'fatica', 'faticano')} a rispettare con regolarità le norme condivise della vita scolastica`,
    (s) => `${s.np} ${subjVerb(s, 'richiede', 'richiedono')} un presidio educativo fermo e un dialogo stretto con le famiglie`,
    (s) => `${s.np} ${subjVerb(s, 'presenta', 'presentano')} difficoltà nella gestione delle regole d’aula e dei tempi di lavoro`,
    (s) => `${s.np} ${subjVerb(s, 'tende', 'tendono')} a disturbare lo svolgimento ordinario delle lezioni, necessitando di interventi mirati`,
    (s) => `${s.np} ${subjVerb(s, 'evidenzia', 'evidenziano')} fragilità sul piano relazionale e disciplinare da accompagnare con strategie condivise`,
    (s) => `${s.np} ${subjVerb(s, 'incontra', 'incontrano')} ostacoli nell’autoregolazione emotiva e nel rispetto dei ruoli scolastici`,
    (s) => `${s.np} ${subjVerb(s, 'rende', 'rendono')} necessario un patto educativo chiaro e un monitoraggio comportamentale continuo`,
    (s) => `${s.np} ${subjVerb(s, 'mostra', 'mostrano')} resistenze al rispetto delle consegne e alle regole di convivenza`,
    (s) => `${s.np} ${subjVerb(s, 'necessita', 'necessitano')} di percorsi strutturati di educazione alla responsabilità e al rispetto reciproco`,
  ],
  collaborativa: [
    (s) => `${s.np} ${subjVerb(s, 'coopera', 'cooperano')} volentieri nelle attività di gruppo e nel lavoro condiviso`,
    (s) => `${s.np} ${subjVerb(s, 'mostra', 'mostrano')} disponibilità all’aiuto reciproco e spirito di squadra`,
    (s) => `${s.np} ${subjVerb(s, 'partecipa', 'partecipano')} con atteggiamento collaborativo al lavoro tra pari`,
    (s) => `${s.np} ${subjVerb(s, 'favorisce', 'favoriscono')} un clima costruttivo basato sullo scambio e sul sostegno vicendevole`,
    (s) => `${s.np} ${subjVerb(s, 'sa', 'sanno')} lavorare in sinergia, valorizzando i contributi dei compagni`,
    (s) => `${s.np} ${subjVerb(s, 'evidenzia', 'evidenziano')} apertura al confronto e buona capacità di cooperazione`,
    (s) => `${s.np} ${subjVerb(s, 'si impegna', 'si impegnano')} volentieri nei compiti comuni, sostenendo il lavoro d’insieme`,
    (s) => `${s.np} ${subjVerb(s, 'instaura', 'instaurano')} rapporti distesi e collaborativi tanto con i pari quanto con i docenti`,
    (s) => `${s.np} ${subjVerb(s, 'aderisce', 'aderiscono')} con prontezza alle proposte di apprendimento cooperativo`,
    (s) => `${s.np} ${subjVerb(s, 'contribuisce', 'contribuiscono')} positivamente alla riuscita delle attività collettive`,
  ],
  'rispettosa delle regole': [
    (s) => `${s.np} ${subjVerb(s, 'osserva', 'osservano')} con correttezza le norme di convivenza e le indicazioni dei docenti`,
    (s) => `${s.np} ${subjVerb(s, 'rispetta', 'rispettano')} i turni di parola, gli spazi comuni e gli impegni assunti`,
    (s) => `${s.np} ${subjVerb(s, 'mostra', 'mostrano')} senso di responsabilità e aderenza alle regole dell’istituto`,
    (s) => `${s.np} ${subjVerb(s, 'mantiene', 'mantengono')} un contegno educato e rispettoso verso compagni e adulti`,
    (s) => `${s.np} ${subjVerb(s, 'riconosce', 'riconoscono')} e ${subjVerb(s, 'rispetta', 'rispettano')} con maturità le regole organizzative della classe`,
    (s) => `${s.np} ${subjVerb(s, 'garantisce', 'garantiscono')} un comportamento corretto e ordinato in ogni fase della giornata scolastica`,
    (s) => `${s.np} ${subjVerb(s, 'adotta', 'adottano')} abitudini rispettose delle consegne e dei regolamenti condivisi`,
    (s) => `${s.np} ${subjVerb(s, 'si attiene', 'si attengono')} puntualmente alle disposizioni scolastiche senza bisogno di richiami`,
    (s) => `${s.np} ${subjVerb(s, 'evidenzia', 'evidenziano')} rispetto per le persone, gli arredi e il lavoro altrui`,
    (s) => `${s.np} ${subjVerb(s, 'opera', 'operano')} con disciplina interiore e attenzione al regolamento d’aula`,
  ],
  'solidale e inclusiva': [
    (s) => `${s.np} ${subjVerb(s, 'accoglie', 'accolgono')} con sensibilità i bisogni dei compagni, favorendo un clima inclusivo`,
    (s) => `${s.np} ${subjVerb(s, 'manifesta', 'manifestano')} spirito solidale e attenzione verso chi incontra maggiori difficoltà`,
    (s) => `${s.np} ${subjVerb(s, 'promuove', 'promuovono')} relazioni aperte, rispettose delle differenze individuali`,
    (s) => `${s.np} ${subjVerb(s, 'sostiene', 'sostengono')} i compagni in difficoltà con gesti concreti di aiuto e vicinanza`,
    (s) => `${s.np} ${subjVerb(s, 'contribuisce', 'contribuiscono')} a creare un ambiente accogliente in cui ciascuno si sente valorizzato`,
    (s) => `${s.np} ${subjVerb(s, 'dimostra', 'dimostrano')} empatia e disponibilità all’ascolto nelle dinamiche quotidiane`,
    (s) => `${s.np} ${subjVerb(s, 'si adopera', 'si adoperano')} spontaneamente per includere tutti i membri del gruppo nelle attività`,
    (s) => `${s.np} ${subjVerb(s, 'evidenzia', 'evidenziano')} sensibilità sociale e rispetto autentico per le diversità`,
    (s) => `${s.np} ${subjVerb(s, 'favorisce', 'favoriscono')} la coesione del gruppo evitando dinamiche di esclusione`,
    (s) => `${s.np} ${subjVerb(s, 'esprime', 'esprimono')} un forte senso di comunità e mutuo supporto tra pari`,
  ],
  'poco collaborativa': [
    (s) => `${s.np} ${subjVerb(s, 'fatica', 'faticano')} a lavorare in modo sinergico all’interno del gruppo`,
    (s) => `${s.np} ${subjVerb(s, 'mostra', 'mostrano')} resistenze nel condividere obiettivi comuni e responsabilità tra pari`,
    (s) => `${s.np} ${subjVerb(s, 'tende', 'tendono')} a privilegiare il lavoro individuale rispetto alla cooperazione`,
    (s) => `${s.np} ${subjVerb(s, 'necessita', 'necessitano')} di mediazione adulta per collaborare in modo ordinato nei gruppi`,
    (s) => `${s.np} ${subjVerb(s, 'manifesta', 'manifestano')} scarsa disponibilità all’ascolto reciproco durante i compiti condivisi`,
    (s) => `${s.np} ${subjVerb(s, 'incontra', 'incontrano')} difficoltà nel coordinarsi con i compagni e rispettare ruoli comuni`,
    (s) => `${s.np} ${subjVerb(s, 'partecipa', 'partecipano')} in modo marginale alle attività di tipo cooperativo`,
    (s) => `${s.np} ${subjVerb(s, 'evidenzia', 'evidenziano')} un atteggiamento poco incline alla condivisione delle risorse`,
    (s) => `${s.np} ${subjVerb(s, 'richiede', 'richiedono')} consegne strutturate per sviluppare abitudini collaborative efficaci`,
    (s) => `${s.np} ${subjVerb(s, 'rivela', 'rivelano')} una limitata propensione al confronto costruttivo con i compagni`,
  ],
  'tendente a isolarsi': [
    (s) => `${s.np} ${subjVerb(s, 'tende', 'tendono')} a rimanere in disparte rispetto alle iniziative relazionali del gruppo`,
    (s) => `${s.np} ${subjVerb(s, 'mostra', 'mostrano')} ritrosia nei rapporti interpersonali e ${subjVerb(s, 'preferisce', 'preferiscono')} dinamiche individuali`,
    (s) => `${s.np} ${subjVerb(s, 'fatica', 'faticano')} a integrarsi spontaneamente nei momenti di socializzazione e lavoro di gruppo`,
    (s) => `${s.np} ${subjVerb(s, 'mantiene', 'mantengono')} un atteggiamento chiuso e riservato nei confronti dei compagni`,
    (s) => `${s.np} ${subjVerb(s, 'necessita', 'necessitano')} di incoraggiamento discreto per aprirsi alla relazione con i pari`,
    (s) => `${s.np} ${subjVerb(s, 'si colloca', 'si collocano')} spesso ai margini degli scambi informali, pur senza conflittualità`,
    (s) => `${s.np} ${subjVerb(s, 'evidenzia', 'evidenziano')} timidezza e cautela nell’inserirsi nelle attività collettive`,
    (s) => `${s.np} ${subjVerb(s, 'richiede', 'richiedono')} attività a piccolo gruppo guidato per rafforzare il senso di appartenenza`,
    (s) => `${s.np} ${subjVerb(s, 'manifesta', 'manifestano')} scarsa iniziativa nel ricercare il confronto e l’aiuto dei compagni`,
    (s) => `${s.np} ${subjVerb(s, 'vive', 'vivono')} in modo appartato la dimensione sociale dell’aula, giovandosi di un clima rassicurante`,
  ],
  'conflittuale nelle dinamiche di gruppo': [
    (s) => `${s.np} ${subjVerb(s, 'genera', 'generano')} occasionali tensioni relazionali che richiedono la mediazione del docente`,
    (s) => `${s.np} ${subjVerb(s, 'fatica', 'faticano')} a gestire il disaccordo in modo sereno e costruttivo con i compagni`,
    (s) => `${s.np} ${subjVerb(s, 'tende', 'tendono')} a reagire con impulsività nelle interazioni tra pari`,
    (s) => `${s.np} ${subjVerb(s, 'manifesta', 'manifestano')} attriti e rivalità che incidono sulla serenità del lavoro collettivo`,
    (s) => `${s.np} ${subjVerb(s, 'necessita', 'necessitano')} di regole chiare e percorsi di educazione alla gestione dei conflitti`,
    (s) => `${s.np} ${subjVerb(s, 'evidenzia', 'evidenziano')} difficoltà nell’accettare il punto di vista altrui durante i confronti`,
    (s) => `${s.np} ${subjVerb(s, 'presenta', 'presentano')} dinamiche relazionali competitive o polemiche nel gruppo`,
    (s) => `${s.np} ${subjVerb(s, 'richiede', 'richiedono')} una costante regia educativa per prevenire contrasti tra sottogruppi`,
    (s) => `${s.np} ${subjVerb(s, 'mostra', 'mostrano')} fragilità nella comunicazione assertiva e nel rispetto dei turni di dialogo`,
    (s) => `${s.np} ${subjVerb(s, 'sconta', 'scontano')} tensioni interpersonali che rallentano la fluidità delle attività condivise`,
  ],
  acquisito: [
    (s) => `${s.np} ${subjVerb(s, 'ha', 'hanno')} acquisito un metodo di studio autonomo ed efficace`,
    (s) => `${s.np} ${subjVerb(s, 'padroneggia', 'padroneggiano')} con sicurezza strategie organizzative funzionali allo studio`,
    (s) => `${s.np} ${subjVerb(s, 'organizza', 'organizzano')} tempi, materiali e appunti in modo ordinato e produttivo`,
    (s) => `${s.np} ${subjVerb(s, 'sa', 'sanno')} selezionare le informazioni principali e rielaborare i contenuti con autonomia`,
    (s) => `${s.np} ${subjVerb(s, 'dimostra', 'dimostrano')} un metodo di lavoro consolidato, sostenuto da schemi e sintesi personali`,
    (s) => `${s.np} ${subjVerb(s, 'applica', 'applicano')} con regolarità tecniche efficaci di comprensione, memorizzazione e ripasso`,
    (s) => `${s.np} ${subjVerb(s, 'gestisce', 'gestiscono')} lo studio individuale con metodo strutturato e senso di responsabilità`,
    (s) => `${s.np} ${subjVerb(s, 'evidenzia', 'evidenziano')} piena padronanza degli strumenti utili ad apprendere in autonomia`,
    (s) => `${s.np} ${subjVerb(s, 'affronta', 'affrontano')} la preparazione delle verifiche secondo un metodo organico e collaudato`,
    (s) => `${s.np} ${subjVerb(s, 'utilizza', 'utilizzano')} con naturalezza strategie cognitive idonee a consolidare gli apprendimenti`,
  ],
  'in consolidamento': [
    (s) => `${s.np} ${subjVerb(s, 'sta', 'stanno')} progressivamente consolidando un proprio metodo di lavoro e organizzazione`,
    (s) => `${s.np} ${subjVerb(s, 'mostra', 'mostrano')} abitudini di studio in via di rafforzamento, pur con qualche incertezza procedurale`,
    (s) => `${s.np} ${subjVerb(s, 'applica', 'applicano')} le principali tecniche di studio, necessitando ancora di occasionali conferme`,
    (s) => `${s.np} ${subjVerb(s, 'lavora', 'lavorano')} per rendere più sistematiche la pianificazione dei tempi e la sintesi dei contenuti`,
    (s) => `${s.np} ${subjVerb(s, 'evidenzia', 'evidenziano')} un metodo in evoluzione positiva, che si giova di schemi e mappe guida`,
    (s) => `${s.np} ${subjVerb(s, 'possiede', 'possiedono')} le basi dell’organizzazione scolastica e ${subjVerb(s, 'sta', 'stanno')} rendendo il metodo più sicuro`,
    (s) => `${s.np} ${subjVerb(s, 'rafforza', 'rafforzano')} gradualmente la capacità di schematizzare e rielaborare gli argomenti`,
    (s) => `${s.np} ${subjVerb(s, 'procede', 'procedono')} verso una maggiore regolarità metodologica attraverso l’esercizio guidato`,
    (s) => `${s.np} ${subjVerb(s, 'sa', 'sanno')} orientarsi nello studio quotidiano, ma ${subjVerb(s, 'richiede', 'richiedono')} ancora indicazioni nei compiti complessi`,
    (s) => `${s.np} ${subjVerb(s, 'consolida', 'consolidano')} di settimana in settimana l’uso ordinato di quaderni, appunti e strumenti di ripasso`,
  ],
  'in via di maturazione': [
    (s) => `${s.np} ${subjVerb(s, 'presenta', 'presentano')} un metodo di studio ancora in via di maturazione e bisognoso di guida`,
    (s) => `${s.np} ${subjVerb(s, 'sta', 'stanno')} costruendo le prime abitudini di organizzazione personale del lavoro`,
    (s) => `${s.np} ${subjVerb(s, 'necessita', 'necessitano')} di indicazioni operative per selezionare i concetti essenziali dai testi`,
    (s) => `${s.np} ${subjVerb(s, 'tende', 'tendono')} a studiare in modo frammentario, migliorando sensibilmente se ${subjAdj(s, 'affiancata', 'affiancato', 'affiancati')} da modelli`,
    (s) => `${s.np} ${subjVerb(s, 'richiede', 'richiedono')} supporto metodologico per pianificare con ordine i compiti e il ripasso`,
    (s) => `${s.np} ${subjVerb(s, 'mostra', 'mostrano')} un approccio allo studio ancora incerto, ma aperto all’apprendimento di nuove strategie`,
    (s) => `${s.np} ${subjVerb(s, 'fatica', 'faticano')} a individuare in autonomia le parole chiave e i nessi logici degli argomenti`,
    (s) => `${s.np} ${subjVerb(s, 'trae', 'traggono')} beneficio da mappe strutturate e scalette guidate per maturare un metodo stabile`,
    (s) => `${s.np} ${subjVerb(s, 'esplora', 'esplorano')} gradualmente modalità più efficaci di lettura, comprensione e rielaborazione`,
    (s) => `${s.np} ${subjVerb(s, 'sviluppa', 'sviluppano')} lentamente le proprie competenze organizzative con l’accompagnamento del docente`,
  ],
  'non ancora avviato': [
    (s) => `${s.np} ${subjVerb(s, 'non ha', 'non hanno')} ancora avviato un metodo di studio strutturato e ${subjVerb(s, 'necessita', 'necessitano')} di guida costante`,
    (s) => `${s.np} ${subjVerb(s, 'affronta', 'affrontano')} i contenuti in modo meccanico o mnemonico, senza strategie organizzative definite`,
    (s) => `${s.np} ${subjVerb(s, 'incontra', 'incontrano')} marcate difficoltà nel gestire tempi, materiali e fasi dello studio individuale`,
    (s) => `${s.np} ${subjVerb(s, 'richiede', 'richiedono')} un accompagnamento passo passo per impostare le abitudini scolastiche di base`,
    (s) => `${s.np} ${subjVerb(s, 'fatica', 'faticano')} a distinguere le informazioni principali da quelle accessorie senza aiuto diretto`,
    (s) => `${s.np} ${subjVerb(s, 'mostra', 'mostrano')} assenza di pianificazione e dipendenza dalle indicazioni puntuali dell’insegnante`,
    (s) => `${s.np} ${subjVerb(s, 'tende', 'tendono')} a trascurare la rielaborazione personale, limitandosi a una lettura superficiale`,
    (s) => `${s.np} ${subjVerb(s, 'necessita', 'necessitano')} di percorsi mirati di educazione al metodo, basati su schemi semplici e guidati`,
    (s) => `${s.np} ${subjVerb(s, 'manifesta', 'manifestano')} forte insicurezza davanti allo studio autonomo e alla preparazione delle prove`,
    (s) => `${s.np} ${subjVerb(s, 'deve', 'devono')} ancora costruire gli strumenti minimi per lavorare con ordine fuori dall’aula`,
  ],
  'pienamente autonoma': [
    (s) => `${s.np} ${subjVerb(s, 'lavora', 'lavorano')} con piena autonomia operativa sia in classe sia a casa`,
    (s) => `${s.np} ${subjVerb(s, 'gestisce', 'gestiscono')} in modo indipendente e responsabile ogni fase delle attività assegnate`,
    (s) => `${s.np} ${subjVerb(s, 'porta', 'portano')} a termine le consegne con sicurezza, precisione e spirito d’iniziativa`,
    (s) => `${s.np} ${subjVerb(s, 'sa', 'sanno')} organizzarsi autonomamente anche davanti a compiti complessi o inediti`,
    (s) => `${s.np} ${subjVerb(s, 'evidenzia', 'evidenziano')} spiccata autonomia decisionale e capacità di autocontrollo del proprio elaborato`,
    (s) => `${s.np} ${subjVerb(s, 'affronta', 'affrontano')} il lavoro scolastico senza necessità di sollecitazioni esterne`,
    (s) => `${s.np} ${subjVerb(s, 'mostra', 'mostrano')} maturità organizzativa e piena padronanza nella gestione degli strumenti`,
    (s) => `${s.np} ${subjVerb(s, 'procede', 'procedono')} in autonomia rispettando tempi, criteri e consegne richieste`,
    (s) => `${s.np} ${subjVerb(s, 'dimostra', 'dimostrano')} sicurezza nell’individuare soluzioni e verificare la correttezza del proprio lavoro`,
    (s) => `${s.np} ${subjVerb(s, 'si muove', 'si muovono')} con disinvoltura e responsabilità nelle attività individuali e di gruppo`,
  ],
  'autonoma nello svolgimento delle consegne': [
    (s) => `${s.np} ${subjVerb(s, 'svolge', 'svolgono')} le consegne assegnate in autonomia, una volta chiariti gli obiettivi`,
    (s) => `${s.np} ${subjVerb(s, 'riesce', 'riescono')} a completare regolarmente i compiti senza bisogno di continue conferme`,
    (s) => `${s.np} ${subjVerb(s, 'lavora', 'lavorano')} in modo ordinato e indipendente nelle esercitazioni ordinarie`,
    (s) => `${s.np} ${subjVerb(s, 'gestisce', 'gestiscono')} con buona sicurezza le attività proposte in classe e domestiche`,
    (s) => `${s.np} ${subjVerb(s, 'comprende', 'comprendono')} le richieste operative e ${subjVerb(s, 'procede', 'procedono')} autonomamente all’esecuzione`,
    (s) => `${s.np} ${subjVerb(s, 'mantiene', 'mantengono')} un ritmo di lavoro autonomo e regolare nello svolgimento degli esercizi`,
    (s) => `${s.np} ${subjVerb(s, 'affronta', 'affrontano')} con responsabilità le consegne quotidiane, chiedendo aiuto solo se necessario`,
    (s) => `${s.np} ${subjVerb(s, 'evidenzia', 'evidenziano')} adeguate capacità operative individuali nelle attività consolidate`,
    (s) => `${s.np} ${subjVerb(s, 'sa', 'sanno')} portare avanti i compiti assegnati con ordine e buona tenuta personale`,
    (s) => `${s.np} ${subjVerb(s, 'mostra', 'mostrano')} un livello soddisfacente di autonomia esecutiva nel lavoro scolastico`,
  ],
  'bisognosa di guida costante': [
    (s) => `${s.np} ${subjVerb(s, 'necessita', 'necessitano')} della guida costante del docente per avviare e completare il lavoro`,
    (s) => `${s.np} ${subjVerb(s, 'richiede', 'richiedono')} rassicurazioni frequenti e indicazioni scandite passo dopo passo`,
    (s) => `${s.np} ${subjVerb(s, 'fatica', 'faticano')} a procedere in modo indipendente senza la presenza attiva dell’insegnante`,
    (s) => `${s.np} ${subjVerb(s, 'manifesta', 'manifestano')} insicurezza operativa e tendenza a interrompersi di fronte alle difficoltà`,
    (s) => `${s.np} ${subjVerb(s, 'si affida', 'si affidano')} costantemente a esempi guidati per orientarsi nell’esecuzione delle consegne`,
    (s) => `${s.np} ${subjVerb(s, 'presenta', 'presentano')} un’autonomia ancora fragile che necessita di affiancamento continuo`,
    (s) => `${s.np} ${subjVerb(s, 'trae', 'traggono')} vantaggio da consegne brevi, scomposte in passaggi chiari e verificati in itinere`,
    (s) => `${s.np} ${subjVerb(s, 'tende', 'tendono')} a bloccarsi davanti a richieste articolate, richiedendo sollecitazioni mirate`,
    (s) => `${s.np} ${subjVerb(s, 'mostra', 'mostrano')} bisogno di accompagnamento diretto sia nella comprensione sia nell’esecuzione`,
    (s) => `${s.np} ${subjVerb(s, 'opera', 'operano')} con maggiore serenità quando ${subjAdj(s, 'guidata', 'guidato', 'guidati')} con domande stimolo e schede strutturate`,
  ],
  'non ancora autonoma': [
    (s) => `${s.np} ${subjVerb(s, 'non ha', 'non hanno')} ancora sviluppato un’autonomia operativa sufficiente e ${subjVerb(s, 'richiede', 'richiedono')} supporto diretto`,
    (s) => `${s.np} ${subjVerb(s, 'dipende', 'dipendono')} dall’intervento dell’adulto per organizzare materiale, tempi e sequenze di lavoro`,
    (s) => `${s.np} ${subjVerb(s, 'incontra', 'incontrano')} difficoltà nell’avviare un compito senza spiegazioni personalizzate`,
    (s) => `${s.np} ${subjVerb(s, 'necessita', 'necessitano')} di attività altamente strutturate e assistenza ravvicinata`,
    (s) => `${s.np} ${subjVerb(s, 'mostra', 'mostrano')} ritmi lenti e incertezze ricorrenti nella gestione autonoma delle consegne`,
    (s) => `${s.np} ${subjVerb(s, 'fatica', 'faticano')} a orientarsi tra le richieste scolastiche, rendendo utile un tutoring costante`,
    (s) => `${s.np} ${subjVerb(s, 'presenta', 'presentano')} fragilità organizzative che limitano il lavoro indipendente a casa e in aula`,
    (s) => `${s.np} ${subjVerb(s, 'tende', 'tendono')} a lasciare incompleti gli esercizi se non ${subjAdj(s, 'seguita', 'seguito', 'seguiti')} nell’esecuzione`,
    (s) => `${s.np} ${subjVerb(s, 'richiede', 'richiedono')} strategie graduali di rinforzo per acquisire fiducia nelle proprie capacità`,
    (s) => `${s.np} ${subjVerb(s, 'evidenzia', 'evidenziano')} un’autonomia in fase iniziale da sostenere con strumenti compensativi e guida`,
  ],
  'attiva e costruttiva': [
    (s) => `${s.np} ${subjVerb(s, 'partecipa', 'partecipano')} al dialogo educativo con interventi pertinenti, attivi e costruttivi`,
    (s) => `${s.np} ${subjVerb(s, 'arricchisce', 'arricchiscono')} le lezioni ponendo domande mirate e offrendo contributi personali`,
    (s) => `${s.np} ${subjVerb(s, 'interviene', 'intervengono')} con prontezza e spirito critico nelle discussioni guidate`,
    (s) => `${s.np} ${subjVerb(s, 'mostra', 'mostrano')} una partecipazione viva e propositiva che stimola il confronto in aula`,
    (s) => `${s.np} ${subjVerb(s, 'si coinvolge', 'si coinvolgono')} con entusiasmo nelle attività collettive, rispettando i turni di parola`,
    (s) => `${s.np} ${subjVerb(s, 'contribuisce', 'contribuiscono')} attivamente allo sviluppo dei percorsi didattici con osservazioni opportune`,
    (s) => `${s.np} ${subjVerb(s, 'manifesta', 'manifestano')} curiosità intellettuale e desiderio di condividere riflessioni pertinenti`,
    (s) => `${s.np} ${subjVerb(s, 'sostiene', 'sostengono')} il lavoro d’aula con una presenza partecipe, collaborativa e stimolante`,
    (s) => `${s.np} ${subjVerb(s, 'prende', 'prendono')} parte alle iniziative scolastiche con atteggiamento aperto e propositivo`,
    (s) => `${s.np} ${subjVerb(s, 'dimostra', 'dimostrano')} vivace interesse, trasformando la lezione in un momento di scambio efficace`,
  ],
  'partecipativa se sollecitata': [
    (s) => `${s.np} ${subjVerb(s, 'partecipa', 'partecipano')} in modo adeguato quando opportunamente ${subjAdj(s, 'sollecitata', 'sollecitato', 'sollecitati')} dal docente`,
    (s) => `${s.np} ${subjVerb(s, 'interviene', 'intervengono')} con pertinenza dietro invito diretto, pur prendendo raramente l’iniziativa`,
    (s) => `${s.np} ${subjVerb(s, 'mostra', 'mostrano')} una partecipazione discreta, che emerge positivamente grazie a domande mirate`,
    (s) => `${s.np} ${subjVerb(s, 'tende', 'tendono')} a rimanere in ascolto, rispondendo però con correttezza quando ${subjAdj(s, 'interpellata', 'interpellato', 'interpellati')}`,
    (s) => `${s.np} ${subjVerb(s, 'necessita', 'necessitano')} di incoraggiamento verbale per esporsi davanti ai compagni`,
    (s) => `${s.np} ${subjVerb(s, 'si inserisce', 'si inseriscono')} nel dialogo educativo soprattutto in contesti rassicuranti e guidati`,
    (s) => `${s.np} ${subjVerb(s, 'evidenzia', 'evidenziano')} un coinvolgimento contenuto ma affidabile su richiesta dell’insegnante`,
    (s) => `${s.np} ${subjVerb(s, 'esprime', 'esprimono')} le proprie conoscenze più volentieri su sollecitazione diretta che spontaneamente`,
    (s) => `${s.np} ${subjVerb(s, 'richiede', 'richiedono')} domande stimolo e un clima incoraggiante per valorizzare il proprio apporto`,
    (s) => `${s.np} ${subjVerb(s, 'mantiene', 'mantengono')} un profilo riservato, attivandosi in modo costruttivo se ${subjAdj(s, 'coinvolta', 'coinvolto', 'coinvolti')} in prima persona`,
  ],
  'passiva o silenziosa': [
    (s) => `${s.np} ${subjVerb(s, 'assume', 'assumono')} un atteggiamento per lo più passivo e silenzioso durante le lezioni`,
    (s) => `${s.np} ${subjVerb(s, 'evita', 'evitano')} di intervenire spontaneamente, mantenendo una presenza defilata nel dialogo d’aula`,
    (s) => `${s.np} ${subjVerb(s, 'mostra', 'mostrano')} scarsa iniziativa comunicativa e difficoltà a esporsi nelle discussioni`,
    (s) => `${s.np} ${subjVerb(s, 'segue', 'seguono')} le attività in silenzio, offrendo riscontri minimi anche dietro sollecitazione`,
    (s) => `${s.np} ${subjVerb(s, 'necessita', 'necessitano')} di strategie didattiche inclusive per superare timidezza o chiusura espressiva`,
    (s) => `${s.np} ${subjVerb(s, 'tende', 'tendono')} ad assistere alle proposte senza coinvolgimento visibile né interventi personali`,
    (s) => `${s.np} ${subjVerb(s, 'manifesta', 'manifestano')} ritrosia nel prendere parola, preferendo modalità operative scritte o riservate`,
    (s) => `${s.np} ${subjVerb(s, 'richiede', 'richiedono')} un costante lavoro di attivazione relazionale e coinvolgimento graduale`,
    (s) => `${s.np} ${subjVerb(s, 'presenta', 'presentano')} una partecipazione esigua che rende difficile cogliere nell’immediato la comprensione`,
    (s) => `${s.np} ${subjVerb(s, 'fatica', 'faticano')} a inserirsi attivamente negli scambi collettivi, giovandosi di lavori a coppie`,
  ],
  'dispersiva o poco partecipativa': [
    (s) => `${s.np} ${subjVerb(s, 'mostra', 'mostrano')} un’attenzione labile e una partecipazione spesso dispersiva`,
    (s) => `${s.np} ${subjVerb(s, 'fatica', 'faticano')} a seguire con continuità il filo del discorso collettivo, distraendosi facilmente`,
    (s) => `${s.np} ${subjVerb(s, 'tende', 'tendono')} a intervenire in modo poco pertinente o a estraniarsi dal compito comune`,
    (s) => `${s.np} ${subjVerb(s, 'richiede', 'richiedono')} frequenti richiami all’ascolto e attività dinamiche per mantenere il coinvolgimento`,
    (s) => `${s.np} ${subjVerb(s, 'evidenzia', 'evidenziano')} cali ricorrenti di concentrazione che indeboliscono la partecipazione efficace`,
    (s) => `${s.np} ${subjVerb(s, 'manifesta', 'manifestano')} irrequietezza o scarso interesse, disperdendo l’attenzione propria e altrui`,
    (s) => `${s.np} ${subjVerb(s, 'necessita', 'necessitano')} di consegne brevi e coinvolgenti per contenere i tempi di distrazione`,
    (s) => `${s.np} ${subjVerb(s, 'partecipa', 'partecipano')} in maniera discontinua e poco focalizzata sugli obiettivi della lezione`,
    (s) => `${s.np} ${subjVerb(s, 'presenta', 'presentano')} difficoltà nel sostenere l’attenzione per tempi prolungati durante le spiegazioni`,
    (s) => `${s.np} ${subjVerb(s, 'trae', 'traggono')} beneficio da compiti operativi immediati che limitino la dispersione in aula`,
  ],
};

// Alias tipologie brevi verso i rispettivi 10 modelli completi
TIPOLOGIA_PHRASE_VARIANTS["discontinua nell'impegno"] =
  TIPOLOGIA_PHRASE_VARIANTS['discontinua nell’impegno'];
TIPOLOGIA_PHRASE_VARIANTS.autonoma = TIPOLOGIA_PHRASE_VARIANTS['pienamente autonoma'];
TIPOLOGIA_PHRASE_VARIANTS.partecipativa = TIPOLOGIA_PHRASE_VARIANTS['attiva e costruttiva'];
TIPOLOGIA_PHRASE_VARIANTS.attenta = TIPOLOGIA_PHRASE_VARIANTS['attenta e interessata'];

const GENERIC_PHRASE_TEMPLATES: ((subj: SubjectSpec, adaptedOrLabel: string, isAdj: boolean) => string)[] = [
  (s, v, isAdj) =>
    isAdj
      ? `${s.np} ${subjVerb(s, 'si mostra', 'si mostrano')} ${v} nel corso delle attività didattiche`
      : `${s.np} ${subjVerb(s, 'presenta', 'presentano')} un profilo caratterizzato da ${v}`,
  (s, v, isAdj) =>
    isAdj
      ? `${s.np} ${subjVerb(s, 'risulta', 'risultano')} complessivamente ${v} nel lavoro d’aula`
      : `${s.np} ${subjVerb(s, 'evidenzia', 'evidenziano')} ${v} durante le lezioni`,
  (s, v, isAdj) =>
    isAdj
      ? `${s.np} ${subjVerb(s, 'si dimostra', 'si dimostrano')} ${v} nelle diverse fasi del percorso`
      : `${s.np} ${subjVerb(s, 'manifesta', 'manifestano')} ${v} nelle attività quotidiane`,
  (s, v, isAdj) =>
    isAdj
      ? `${s.np} ${subjVerb(s, 'appare', 'appaiono')} ${v} rispetto alle sollecitazioni scolastiche`
      : `${s.np} ${subjVerb(s, 'mostra', 'mostrano')} ${v} nell’approccio alle consegne`,
  (s, v, isAdj) =>
    isAdj
      ? `${s.np} ${subjVerb(s, 'mantiene', 'mantengono')} un atteggiamento ${v} in classe`
      : `${s.np} ${subjVerb(s, 'rivela', 'rivelano')} ${v} nel lavoro scolastico`,
  (s, v, isAdj) =>
    isAdj
      ? `${s.np} ${subjVerb(s, 'si presenta', 'si presentano')} ${v} nell’impegno quotidiano`
      : `${s.np} ${subjVerb(s, 'denota', 'denotano')} ${v} nelle dinamiche educative`,
  (s, v, isAdj) =>
    isAdj
      ? `${s.np} ${subjVerb(s, 'evidenzia', 'evidenziano')} un comportamento ${v} nel contesto scolastico`
      : `${s.np} ${subjVerb(s, 'esprime', 'esprimono')} ${v} nel dialogo educativo`,
  (s, v, isAdj) =>
    isAdj
      ? `${s.np} ${subjVerb(s, 'lavora', 'lavorano')} in modo ${v} durante le attività proposte`
      : `${s.np} ${subjVerb(s, 'dimostra', 'dimostrano')} ${v} durante l’attività in aula`,
  (s, v, isAdj) =>
    isAdj
      ? `${s.np} ${subjVerb(s, 'risponde', 'rispondono')} con un profilo ${v} alle proposte formative`
      : `${s.np} ${subjVerb(s, 'fa registrare', 'fanno registrare')} ${v} nel lavoro di classe`,
  (s, v, isAdj) =>
    isAdj
      ? `${s.np} ${subjVerb(s, 'opera', 'operano')} con un atteggiamento ${v} nelle esercitazioni`
      : `${s.np} ${subjVerb(s, 'si caratterizza', 'si caratterizzano')} per ${v}`,
];

const CLAUSE_JOINERS: { sep: string; capitalizeNext: boolean }[] = [
  { sep: ', mentre ', capitalizeNext: false },
  { sep: ', laddove ', capitalizeNext: false },
  { sep: '; al contempo, ', capitalizeNext: false },
  { sep: '. Parallelamente, ', capitalizeNext: false },
  { sep: '. Per contro, ', capitalizeNext: false },
  { sep: '; dal canto suo, ', capitalizeNext: false },
];

export function getPhraseVariantsCount(etichetta: string): number {
  const key = etichetta.trim().toLowerCase();
  const specific = TIPOLOGIA_PHRASE_VARIANTS[key];
  return specific ? specific.length : GENERIC_PHRASE_TEMPLATES.length;
}

export function quotaPercentualeToExpression(
  pct: number,
  soglie: SoglieQuoteCaratteristiche = DEFAULT_SOGLIE_QUOTE_CARATTERISTICHE
): string | null {
  const rounded = Math.round(pct);
  if (rounded <= 0) return null;
  if (rounded >= soglie.tuttaLaClasse) return 'tutta la classe';
  if (rounded >= soglie.quasiTuttaLaClasseMin) return 'quasi tutta la classe';
  if (rounded >= soglie.laMaggiorParteMin) return 'la maggior parte';
  if (rounded >= soglie.circaMetaMin) return 'circa metà';
  if (rounded >= soglie.unaParteMin) return 'una parte';
  if (rounded >= soglie.pochiMin) return 'pochi';
  return null;
}

function resolveSegmentSubject(
  seg: ClassCharacteristicSegment,
  soglie: SoglieQuoteCaratteristiche,
  variantIndex: number,
  clauseIdx: number
): SubjectSpec | null {
  if (isNonDefinitoSegment(seg) || seg.quotaPercentuale <= 0) return null;

  if (seg.quotaNumerica !== undefined && Number.isFinite(seg.quotaNumerica) && seg.quotaNumerica > 0) {
    const n = Math.round(seg.quotaNumerica);
    if (n === 1) {
      return { np: '1 alunno', kind: 'singular_masc' };
    }
    return { np: `${n} alunni`, kind: 'plural' };
  }

  const expr = quotaPercentualeToExpression(seg.quotaPercentuale, soglie);
  if (!expr) return null;

  const pool = SUBJECT_EXPRESSIONS[expr as keyof typeof SUBJECT_EXPRESSIONS];
  if (!pool || pool.length === 0) return null;
  const idx = (variantIndex + clauseIdx * 2) % pool.length;
  return pool[idx];
}

function buildClause(
  seg: ClassCharacteristicSegment,
  _dimension: ClassCharacteristicDimension,
  soglie: SoglieQuoteCaratteristiche,
  clauseIdx: number,
  variantIndex: number
): string | null {
  const subject = resolveSegmentSubject(seg, soglie, variantIndex, clauseIdx);
  if (!subject) return null;

  const rawLabel = seg.etichetta.trim();
  const lower = rawLabel.toLowerCase();
  const specificList = TIPOLOGIA_PHRASE_VARIANTS[lower];
  const phraseIdx = (variantIndex + clauseIdx * 3) % STYLISTIC_VARIANTS_COUNT;

  if (specificList && specificList.length > 0) {
    return specificList[phraseIdx % specificList.length](subject);
  }

  const adapted = adaptAdjectiveForSubject(rawLabel, subject.kind);
  const template = GENERIC_PHRASE_TEMPLATES[phraseIdx % GENERIC_PHRASE_TEMPLATES.length];
  return template(subject, adapted.value, adapted.isKnownAdjective);
}

function capitalizeFirst(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function isDimensionAllNessuno(dimension: ClassCharacteristicDimension): boolean {
  const segments = normalizeDimensionSegments(dimension.segmenti);
  const nonDefinitoExcluded = segments.some((s) => !isNonDefinitoSegment(s) && s.quotaPercentuale > 0);
  return !nonDefinitoExcluded;
}

export function generateDimensionSentence(
  dimension: ClassCharacteristicDimension,
  soglie: SoglieQuoteCaratteristiche = DEFAULT_SOGLIE_QUOTE_CARATTERISTICHE,
  contextSeed = ''
): string {
  const segments = normalizeDimensionSegments(dimension.segmenti);
  const variantIndex = getDimensionVariantIndex(dimension, contextSeed);
  const clauses: string[] = [];

  for (const seg of segments) {
    if (isNonDefinitoSegment(seg) || seg.quotaPercentuale <= 0) continue;
    const clause = buildClause(seg, dimension, soglie, clauses.length, variantIndex);
    if (clause) clauses.push(clause);
  }

  if (clauses.length === 0) return '';
  if (clauses.length === 1) {
    return `${capitalizeFirst(clauses[0])}.`;
  }

  // Composizione stilistica scorrevole: evita catene ripetitive con "; " collegando coppie in modo naturale
  let text = capitalizeFirst(clauses[0]);
  for (let i = 1; i < clauses.length; i++) {
    const joiner =
      i % 2 === 0
        ? { sep: '. Inoltre, ', capitalizeNext: false }
        : CLAUSE_JOINERS[(variantIndex + i - 1) % CLAUSE_JOINERS.length];
    const nextClause = joiner.capitalizeNext ? capitalizeFirst(clauses[i]) : clauses[i];
    text += `${joiner.sep}${nextClause}`;
  }
  return `${text}.`;
}

export function getEffectiveDimensionText(
  dimension: ClassCharacteristicDimension,
  soglie: SoglieQuoteCaratteristiche = DEFAULT_SOGLIE_QUOTE_CARATTERISTICHE,
  contextSeed = ''
): string {
  if (isDimensionAllNessuno(dimension)) {
    return '';
  }
  if (dimension.isTestoManuale) {
    return (dimension.testoManuale ?? '').trim();
  }
  return generateDimensionSentence(dimension, soglie, contextSeed);
}

export function getActiveDimensionsForDocument(
  dimensions: ClassCharacteristicDimension[] | undefined,
  soglie: SoglieQuoteCaratteristiche = DEFAULT_SOGLIE_QUOTE_CARATTERISTICHE,
  contextSeed = ''
): DocumentCharacteristicParagraph[] {
  const list = dimensions ?? [];
  const output: DocumentCharacteristicParagraph[] = [];

  for (const dim of list) {
    if (!Array.isArray(dim.segmenti) || dim.segmenti.length === 0) continue;
    const text = getEffectiveDimensionText(dim, soglie, contextSeed).trim();
    if (!text) continue;
    output.push({
      id: dim.id,
      nome: dim.nome.trim() || 'Caratteristica della classe',
      testo: text,
    });
  }

  return output;
}

export function computeStudentCountFromPct(pct: number, alunniTotali: number): number {
  if (alunniTotali <= 0) return 0;
  return Math.round((pct / 100) * alunniTotali);
}

/**
 * Ordina i nominativi all'interno di ciascuna fascia utilizzando prioritariamente il numero di registro
 * (estratto dal testo o salvato in ordineRegistro) e restituisce nomi privi di numeri in Title Case.
 */
export function sortAndCleanStudentNamesForBands(
  entries: AnonymousStudentBandEntry[]
): Record<'basso' | 'medio_basso' | 'medio' | 'alto', string[]> {
  type Item = {
    cleanName: string;
    cognome: string;
    registerOrder: number | null;
    ordine: number;
  };

  const buckets: Record<'basso' | 'medio_basso' | 'medio' | 'alto', Item[]> = {
    basso: [],
    medio_basso: [],
    medio: [],
    alto: [],
  };

  for (const entry of entries) {
    const parsed = extractRegisterOrderAndCleanName(entry.nominativo ?? '');
    if (!parsed.cleanName) continue;
    const registerOrder = parsed.registerOrder ?? entry.ordineRegistro ?? null;
    const key: FasciaLivelloKey = entry.fasciaCorrente;
    if (key === 'basso' || key === 'medio_basso' || key === 'medio' || key === 'alto') {
      buckets[key].push({
        cleanName: parsed.cleanName,
        cognome: extractCognomeOnly(parsed.cleanName),
        registerOrder,
        ordine: entry.ordine ?? 0,
      });
    }
  }

  const compareItems = (a: Item, b: Item): number => {
    if (a.registerOrder !== null && b.registerOrder !== null) {
      if (a.registerOrder !== b.registerOrder) {
        return a.registerOrder - b.registerOrder;
      }
    } else {
      const surnameCmp = a.cognome.localeCompare(b.cognome, 'it', { sensitivity: 'base' });
      if (surnameCmp !== 0) return surnameCmp;
      if (a.registerOrder !== null && b.registerOrder === null) return -1;
      if (a.registerOrder === null && b.registerOrder !== null) return 1;
    }
    const fullCmp = a.cleanName.localeCompare(b.cleanName, 'it', { sensitivity: 'base' });
    if (fullCmp !== 0) return fullCmp;
    return a.ordine - b.ordine;
  };

  return {
    basso: [...buckets.basso].sort(compareItems).map((item) => item.cleanName),
    medio_basso: [...buckets.medio_basso].sort(compareItems).map((item) => item.cleanName),
    medio: [...buckets.medio].sort(compareItems).map((item) => item.cleanName),
    alto: [...buckets.alto].sort(compareItems).map((item) => item.cleanName),
  };
}

/**
 * Restituisce i nominativi completi degli alunni importati suddivisi nelle 4 fasce di livello,
 * ordinati per ordine alfabetico di cognome (numero di registro tra parentesi) e senza numeri tra parentesi.
 */
export function getStudentNamesByLevelBand(
  plan: Programmazione
): {
  hasAnyImportedStudents: boolean;
  bands: Record<'basso' | 'medio_basso' | 'medio' | 'alto', string[]>;
} {
  const list = plan.analisiPartenza.alunniAnonimiFasce ?? [];
  const bands = sortAndCleanStudentNamesForBands(list);
  const hasAnyImportedStudents =
    bands.basso.length > 0 ||
    bands.medio_basso.length > 0 ||
    bands.medio.length > 0 ||
    bands.alto.length > 0;
  return { hasAnyImportedStudents, bands };
}

/**
 * Compone un'unica descrizione coerente della classe da mostrare sotto
 * "ANALISI DELLA SITUAZIONE DI PARTENZA -> Situazione di partenza degli alunni in relazione alla disciplina",
 * evitando duplicazioni tra caratteristiche della classe e descrizione disciplinare.
 */
export function buildUnifiedClassDescriptionText(
  plan: Programmazione,
  settings: SchoolSettings,
  compositionIntro: string
): string {
  const desc = (plan.analisiPartenza.descrizioneDisciplinare ?? '').trim();
  const seed = `${plan.id}|${plan.datiGenerali.classe}|${plan.datiGenerali.sezione}|${plan.datiGenerali.disciplina}`;
  const activeChars = getActiveDimensionsForDocument(
    plan.situazione.caratteristicheDimensioni,
    settings.soglieQuoteCaratteristiche,
    seed
  );

  // Controlla se le caratteristiche differiscono dal solo valore predefinito di Metodo di studio
  const dims = plan.situazione.caratteristicheDimensioni ?? [];
  const metodoDim = dims.find((d) => d.id === 'dim-metodo');
  const isOnlyDefaultMetodo =
    activeChars.length === 1 &&
    activeChars[0].id === 'dim-metodo' &&
    Boolean(
      metodoDim &&
        !metodoDim.isTestoManuale &&
        metodoDim.segmenti.find((s) => s.etichetta === 'in consolidamento')?.quotaPercentuale === 100
    );

  if (desc) {
    const descLower = desc.toLowerCase();
    const extraChars = activeChars.filter(
      (item) => !descLower.includes(item.testo.toLowerCase())
    );
    if (extraChars.length === 0 || (extraChars.length === 1 && isOnlyDefaultMetodo && descLower.includes('metodo'))) {
      return desc;
    }
    const extraLines = extraChars.map((item) => `${item.nome}: ${item.testo}`);
    return `${desc}\n${extraLines.join('\n')}`;
  }

  if (activeChars.length > 0 && !isOnlyDefaultMetodo) {
    const charLines = activeChars.map((item) => `${item.nome}: ${item.testo}`);
    return [compositionIntro.trim(), ...charLines].filter(Boolean).join('\n');
  }

  return '';
}

