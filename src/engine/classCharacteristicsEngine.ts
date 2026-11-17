import {
  createDefaultClassDimensions,
  DEFAULT_SOGLIE_QUOTE_CARATTERISTICHE,
} from '../domain/defaults';
import type {
  ClassCharacteristicDimension,
  ClassCharacteristicSegment,
  SoglieQuoteCaratteristiche,
} from '../domain/types';

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
  soglie: SoglieQuoteCaratteristiche
): { phrase: string; kind: 'singular_fem' | 'singular_masc' | 'plural' } | null {
  if (isNonDefinitoSegment(seg) || seg.quotaPercentuale <= 0) return null;

  if (seg.quotaNumerica !== undefined && Number.isFinite(seg.quotaNumerica) && seg.quotaNumerica > 0) {
    const n = Math.round(seg.quotaNumerica);
    if (n === 1) {
      return { phrase: '1 alunno', kind: 'singular_masc' };
    }
    return { phrase: `${n} alunni`, kind: 'plural' };
  }

  const expr = quotaPercentualeToExpression(seg.quotaPercentuale, soglie);
  if (!expr) return null;

  switch (expr) {
    case 'tutta la classe':
      return { phrase: 'tutta la classe', kind: 'singular_fem' };
    case 'quasi tutta la classe':
      return { phrase: 'quasi tutta la classe', kind: 'singular_fem' };
    case 'la maggior parte':
      return { phrase: 'la maggior parte della classe', kind: 'singular_fem' };
    case 'circa metà':
      return { phrase: 'circa metà della classe', kind: 'singular_fem' };
    case 'una parte':
      return { phrase: 'una parte della classe', kind: 'singular_fem' };
    case 'pochi':
      return { phrase: 'pochi alunni', kind: 'plural' };
    default:
      return null;
  }
}

function buildClause(
  seg: ClassCharacteristicSegment,
  dimension: ClassCharacteristicDimension,
  soglie: SoglieQuoteCaratteristiche,
  isFirstClause: boolean
): string | null {
  const subject = resolveSegmentSubject(seg, soglie);
  if (!subject) return null;

  const isPlural = subject.kind === 'plural';
  const rawLabel = seg.etichetta.trim();
  const lower = rawLabel.toLowerCase();

  if (dimension.kind === 'metodo_studio' || dimension.id === 'dim-metodo') {
    if (lower === 'acquisito') {
      return `${subject.phrase} ${isPlural ? 'hanno' : 'ha'} acquisito un metodo di studio autonomo`;
    }
    if (lower === 'in consolidamento') {
      return `${subject.phrase} ${isPlural ? 'stanno' : 'sta'} consolidando il metodo di studio`;
    }
    if (lower === 'in via di maturazione') {
      return isFirstClause
        ? `${subject.phrase} ${isPlural ? 'sono' : 'è'} in via di maturazione nel metodo di studio`
        : `${subject.phrase} ${isPlural ? 'sono' : 'è'} in via di maturazione`;
    }
    if (lower === 'non ancora avviato') {
      return `${subject.phrase} ${isPlural ? 'non hanno' : 'non ha'} ancora avviato un metodo di studio autonomo`;
    }
    return `${subject.phrase} ${isPlural ? 'presentano' : 'presenta'} ${rawLabel}`;
  }

  const adapted = adaptAdjectiveForSubject(rawLabel, subject.kind);
  if (adapted.isKnownAdjective) {
    if (lower.includes('autonoma') || lower.includes('bisognosa')) {
      return `${subject.phrase} ${isPlural ? 'risultano' : 'risulta'} ${adapted.value}`;
    }
    if (lower.includes('partecip') || lower.includes('silenziosa')) {
      return `${subject.phrase} ${isPlural ? 'si dimostrano' : 'si dimostra'} ${adapted.value}`;
    }
    return `${subject.phrase} ${isPlural ? 'si mostrano' : 'si mostra'} ${adapted.value}`;
  }
  return `${subject.phrase} ${isPlural ? 'presentano' : 'presenta'} ${adapted.value}`;
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
  soglie: SoglieQuoteCaratteristiche = DEFAULT_SOGLIE_QUOTE_CARATTERISTICHE
): string {
  const segments = normalizeDimensionSegments(dimension.segmenti);
  const clauses: string[] = [];

  for (const seg of segments) {
    if (isNonDefinitoSegment(seg) || seg.quotaPercentuale <= 0) continue;
    const clause = buildClause(seg, dimension, soglie, clauses.length === 0);
    if (clause) clauses.push(clause);
  }

  if (clauses.length === 0) return '';
  return `${capitalizeFirst(clauses.join('; '))}.`;
}

export function getEffectiveDimensionText(
  dimension: ClassCharacteristicDimension,
  soglie: SoglieQuoteCaratteristiche = DEFAULT_SOGLIE_QUOTE_CARATTERISTICHE
): string {
  if (isDimensionAllNessuno(dimension)) {
    return '';
  }
  if (dimension.isTestoManuale) {
    return (dimension.testoManuale ?? '').trim();
  }
  return generateDimensionSentence(dimension, soglie);
}

export function getActiveDimensionsForDocument(
  dimensions: ClassCharacteristicDimension[] | undefined,
  soglie: SoglieQuoteCaratteristiche = DEFAULT_SOGLIE_QUOTE_CARATTERISTICHE
): DocumentCharacteristicParagraph[] {
  const list = dimensions ?? [];
  const output: DocumentCharacteristicParagraph[] = [];

  for (const dim of list) {
    if (!Array.isArray(dim.segmenti) || dim.segmenti.length === 0) continue;
    const text = getEffectiveDimensionText(dim, soglie).trim();
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
