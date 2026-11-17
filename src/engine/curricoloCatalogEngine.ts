import type {
  AbilitaConoscenzaRow,
  ClasseSecondaria,
  CurricoloCatalogEntry,
  CurricoloVoiceType,
  ImportedCurricoloVoice,
} from '../domain/types';

export const CURRICOLO_TYPE_LABELS: Record<CurricoloVoiceType, string> = {
  competenza: 'Competenze attese',
  obiettivo_specifico: 'Obiettivi specifici di apprendimento',
  abilita: 'Abilità',
  conoscenza: 'Conoscenze',
};

export const CURRICOLO_TYPE_ORDER: CurricoloVoiceType[] = [
  'competenza',
  'obiettivo_specifico',
  'abilita',
  'conoscenza',
];

export interface CurricoloNucleoGroup {
  nucleoTematico: string;
  entries: CurricoloCatalogEntry[];
}

export interface CurricoloTypeGroup {
  tipo: CurricoloVoiceType;
  label: string;
  nuclei: CurricoloNucleoGroup[];
  allIds: string[];
}

export interface CatalogDiffSummary {
  addedCount: number;
  modifiedCount: number;
  removedCount: number;
  unchangedCount: number;
}

export function filterCatalogEntries(
  catalog: CurricoloCatalogEntry[],
  classe: ClasseSecondaria,
  disciplina: string
): CurricoloCatalogEntry[] {
  return catalog.filter(
    (entry) =>
      entry.classe === classe &&
      entry.disciplina.toLowerCase() === disciplina.toLowerCase()
  );
}

export function groupCatalogEntries(
  entries: CurricoloCatalogEntry[]
): CurricoloTypeGroup[] {
  const result: CurricoloTypeGroup[] = [];

  for (const tipo of CURRICOLO_TYPE_ORDER) {
    const byType = entries.filter((e) => e.tipo === tipo);
    if (byType.length === 0) continue;

    const nucleoMap = new Map<string, CurricoloCatalogEntry[]>();
    for (const item of byType) {
      const nucleo = item.nucleoTematico.trim() || 'Generale';
      const list = nucleoMap.get(nucleo) ?? [];
      list.push(item);
      nucleoMap.set(nucleo, list);
    }

    const nuclei: CurricoloNucleoGroup[] = Array.from(nucleoMap.entries()).map(
      ([nucleoTematico, groupEntries]) => ({
        nucleoTematico,
        entries: groupEntries,
      })
    );

    result.push({
      tipo,
      label: CURRICOLO_TYPE_LABELS[tipo],
      nuclei,
      allIds: byType.map((e) => e.id),
    });
  }

  return result;
}

const ITALIAN_STOPWORDS = new Set([
  'della', 'dello', 'degli', 'delle', 'nella', 'nello', 'negli', 'nelle',
  'sulla', 'sullo', 'sugli', 'sulle', 'alla', 'allo', 'agli', 'alle',
  'dalla', 'dallo', 'dagli', 'dalle', 'verso', 'oltre', 'entro', 'come',
  'sono', 'essere', 'stato', 'stati', 'state', 'quale', 'quali', 'questo',
  'questa', 'questi', 'queste', 'quello', 'quella', 'altro', 'altra',
  'altri', 'altre', 'proprio', 'propria', 'propri', 'anche', 'ancora',
  'sempre', 'diverso', 'diversi', 'diverse', 'vario', 'varia', 'vari',
  'varie', 'nucleo', 'disciplinare', 'classe', 'terza', 'seconda', 'prima',
  'alunno', 'alunna', 'studenti', 'grado', 'base', 'modi', 'forme', 'parte',
  'parti', 'fino', 'dopo', 'attraverso', 'mediante', 'relazione', 'contesto',
  'contesti', 'situazioni', 'ambito', 'ambiti', 'conoscenza', 'conoscenze',
  'competenza', 'competenze', 'obiettivo', 'obiettivi', 'abilita', 'saper',
  'sapere', 'riconoscere', 'utilizzare', 'usare', 'comprendere', 'applicare',
  'individuare', 'eseguire', 'produrre', 'descrivere', 'analizzare',
  'interpretare', 'sviluppare', 'partecipare', 'realizzare', 'semplici',
  'principali', 'fondamentali', 'adeguato', 'adeguata', 'specifici',
  'specifiche', 'attraverso', 'tramite', 'elementi', 'modo', 'loro',
]);

const CONCEPT_GROUPS: string[][] = [
  ['numer', 'aritmet', 'calcol', 'operaz', 'addiz', 'sottraz', 'moltiplic', 'divis', 'potenz', 'multipl', 'fattor', 'prim', 'espression', 'matematic', 'ragionament', 'problem'],
  ['retta', 'ordin', 'confront', 'decimal', 'posizional', 'grandez', 'misur'],
  ['geometr', 'figur', 'triangol', 'angol', 'poligon', 'punt', 'rette', 'segment', 'perimetr', 'area', 'righell', 'squadr'],
  ['cellul', 'vivent', 'piant', 'animal', 'fungh', 'fotosint', 'respiraz', 'organism', 'ecosistem', 'produttor', 'consumat', 'carbon', 'scientif', 'biolog', 'speriment'],
  ['materi', 'massa', 'peso', 'stati', 'passagg', 'aggregaz', 'temperatur', 'calor', 'atmosfer', 'idrosfer', 'suol', 'ambient', 'climat', 'inquinam', 'acqua', 'terrest', 'geolog'],
  ['oral', 'ascolt', 'parl', 'espor', 'raccont', 'dialog', 'turn', 'voce', 'comunic'],
  ['lettur', 'legg', 'test', 'comprens', 'narrat', 'descritt', 'poet', 'letterat', 'diar', 'autobiograf', 'regolat'],
  ['scritt', 'scriv', 'ortograf', 'puntegg', 'sillab', 'accent', 'pianific', 'stesur', 'revision', 'lessic', 'vocabol', 'parol'],
  ['digit', 'rete', 'motor', 'ricerc', 'fonti', 'attendib', 'videoscritt', 'presentaz', 'multimedi', 'informat', 'software', 'tastier', 'cloud', 'classroom', 'archivi'],
  ['stori', 'medieval', 'medioev', 'feudal', 'comun', 'signor', 'vassall', 'marinar', 'crociat', 'umanes', 'rinascim', 'riform', 'scoperte', 'america', 'carte'],
  ['geograf', 'ital', 'local', 'territor', 'paesagg', 'mont', 'fium', 'mar', 'lagh', 'region', 'citta', 'morfolog', 'idrograf', 'econom', 'popolaz', 'sostenib', 'cardinal'],
  ['suon', 'altezz', 'timbr', 'durat', 'intens', 'ritm', 'melod', 'pentagram', 'chiav', 'note', 'paus', 'strument', 'voci', 'vocal', 'coro', 'ensembl', 'orchestr', 'notazion', 'music', 'esecuz'],
  ['color', 'disegn', 'pittur', 'grafic', 'line', 'superfic', 'textur', 'architett', 'monument', 'preistor', 'antich', 'iconolog', 'fotograf', 'muse', 'visiv', 'art'],
  ['costituz', 'diritt', 'dover', 'legalit', 'bullis', 'diversit', 'inclus', 'ugual', 'rispett', 'ecolog', 'sicurezz', 'patrimon', 'pubblic', 'cooperaz', 'cooperat', 'collabor'],
  ['latin', 'alfabet', 'etimolog', 'fras', 'declinaz', 'casi', 'morfolog', 'flession'],
  ['corp', 'motor', 'moviment', 'attrezz', 'gioch', 'sport', 'coordinaz', 'regol', 'squadr', 'sicurezz', 'alimentaz', 'benesser', 'salut', 'non verbal', 'attivi', 'sani'],
  ['relig', 'bibb', 'creazion', 'veterotest', 'salvezz', 'trinit', 'fede', 'verita', 'senso', 'umano', 'cattolic', 'etic'],
  ['salut', 'present', 'famigl', 'scuol', 'gust', 'quoti', 'mes', 'giorn', 'fonolog', 'email', 'messagg', 'dizion', 'interag', 'biograf'],
];

const UPPER_GRADE_MARKERS = [
  'percentual',
  'rapporto fra numeri',
  'rapporti fra numeri',
  'invarianza di rapporti',
  'radice come operatore',
  'stime di radici',
  'quadrato sia uguale a 2',
  'numeri irrazionali',
  'equazioni',
  'modelli algebrici',
  'calcolo algebrico',
  'piano cartesiano',
  'teorema di pitagora',
  'probabilita',
  'misure di variabilita',
  'monomi',
  'polinomi',
  'analisi logica',
  'frase complessa',
  'proposizioni',
  'moto del sole',
  'eclissi',
  'stagioni',
  'planetari',
  'fossili',
  'evoluzione degli organismi',
  'reazioni chimiche',
  'combustione',
  'acido base',
  'acidita di sostanze',
  'dipinto rinascimentale',
  'prospettiva centrale',
  'armonia e la polifonia',
  'evoluzione storica della scrittura musicale',
  'storia della chiesa',
  'vescovo di roma',
  'epoche generi e stili differenti',
  'comporre brevi brani musicali',
];

const HEADER_ONLY_PATTERNS = [
  /^al termine della (classe terza|scuola secondaria)/i,
  /^(espressivita\s*\/\s*produzione|ascolto\s*\(comprensione orale\))$/i,
];

function normalizeForAlignment(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function lightItalianStem(word: string): string {
  if (word.length <= 4) return word;
  return word
    .replace(
      /(zioni|zione|menti|mento|tivo|tiva|tivi|tive|iche|ici|ica|ico|abili|abile|ibili|anti|ente|enti|anno|ono|are|ere|ire)$/,
      ''
    )
    .slice(0, 7);
}

function extractAlignmentStems(text: string): string[] {
  return normalizeForAlignment(text)
    .split(' ')
    .filter((w) => w.length >= 3 && !ITALIAN_STOPWORDS.has(w))
    .map(lightItalianStem)
    .filter((w) => w.length >= 3);
}

function isEntryAlignedWithPrimaContents(
  entry: CurricoloCatalogEntry,
  contentCorpusNorm: string,
  contentStems: Set<string>,
  contentStemArray: string[]
): boolean {
  const txtNorm = normalizeForAlignment(entry.testo);
  const fullNorm = normalizeForAlignment(`${entry.nucleoTematico} ${entry.testo}`);

  // Escludi intestazioni prive di contenuto operativo
  if (entry.testo.trim().length < 28 && !/[a-zà-ÿ]{4,}\s+[a-zà-ÿ]{4,}\s+[a-zà-ÿ]{4,}/i.test(entry.testo)) {
    return false;
  }
  if (HEADER_ONLY_PATTERNS.some((rx) => rx.test(txtNorm) && txtNorm.length < 95)) {
    return false;
  }

  // Escludi competenze/obiettivi chiaramente propri di Seconda/Terza, salvo presenza esplicita nei contenuti della classe
  for (const marker of UPPER_GRADE_MARKERS) {
    if (fullNorm.includes(marker) && !contentCorpusNorm.includes(marker)) {
      return false;
    }
  }

  const itemStems = extractAlignmentStems(fullNorm);
  if (itemStems.length === 0) return false;

  let directHits = 0;
  let conceptHits = 0;
  for (const stem of itemStems) {
    if (contentStems.has(stem)) {
      directHits += 1;
      continue;
    }
    const matchingGroup = CONCEPT_GROUPS.find(
      (grp) =>
        grp.some((prefix) => stem.startsWith(prefix)) &&
        grp.some((prefix) => contentStemArray.some((cs) => cs.startsWith(prefix)))
    );
    if (matchingGroup) {
      conceptHits += 0.65;
    }
  }

  const score = directHits + conceptHits;
  // Le competenze sono formulazioni più ampie: basta una solida coerenza tematica (>= 0.8) in assenza di marker di classe successiva
  const threshold = entry.tipo === 'competenza' ? 0.8 : 1.0;
  return score >= threshold;
}

export interface PrimaContentPreselectionResult {
  selectedIds: Set<string>;
  alignedCompetenceIds: Set<string>;
  alignedObjectiveIds: Set<string>;
  usedPlanContents: boolean;
}

/**
 * Determina gli ID da preselezionare nel selettore del Curricolo Verticale.
 * Poiché competenze e obiettivi specifici sono formulati "al termine della terza",
 * per la Classe Prima preseleziona soltanto competenze e obiettivi coerenti con i contenuti
 * (conoscenze) della classe Prima (del piano se già presenti, altrimenti del catalogo Prima).
 */
export function computePreselectedCatalogIds(
  targetEntries: CurricoloCatalogEntry[],
  classe: ClasseSecondaria,
  planConoscenze: string[] = []
): PrimaContentPreselectionResult {
  if (classe !== 'Prima') {
    return {
      selectedIds: new Set(targetEntries.map((e) => e.id)),
      alignedCompetenceIds: new Set(
        targetEntries.filter((e) => e.tipo === 'competenza').map((e) => e.id)
      ),
      alignedObjectiveIds: new Set(
        targetEntries.filter((e) => e.tipo === 'obiettivo_specifico').map((e) => e.id)
      ),
      usedPlanContents: false,
    };
  }

  const cleanedPlanContents = planConoscenze.map((c) => c.trim()).filter((c) => c.length > 0);
  const catalogContents = targetEntries
    .filter((e) => e.tipo === 'conoscenza')
    .map((e) => `${e.nucleoTematico} ${e.testo}`);

  const usedPlanContents = cleanedPlanContents.length > 0;
  const activeContentTexts = usedPlanContents ? cleanedPlanContents : catalogContents;
  const contentCorpusNorm = normalizeForAlignment(activeContentTexts.join(' '));
  const contentStems = new Set(extractAlignmentStems(activeContentTexts.join(' ')));
  const contentStemArray = Array.from(contentStems);

  const selectedIds = new Set<string>();
  const alignedCompetenceIds = new Set<string>();
  const alignedObjectiveIds = new Set<string>();

  for (const entry of targetEntries) {
    if (entry.tipo === 'conoscenza' || entry.tipo === 'abilita') {
      selectedIds.add(entry.id);
      continue;
    }

    if (
      activeContentTexts.length > 0 &&
      isEntryAlignedWithPrimaContents(entry, contentCorpusNorm, contentStems, contentStemArray)
    ) {
      selectedIds.add(entry.id);
      if (entry.tipo === 'competenza') alignedCompetenceIds.add(entry.id);
      if (entry.tipo === 'obiettivo_specifico') alignedObjectiveIds.add(entry.id);
    }
  }

  return {
    selectedIds,
    alignedCompetenceIds,
    alignedObjectiveIds,
    usedPlanContents,
  };
}

export function importCatalogEntriesToVoices(
  selectedEntries: CurricoloCatalogEntry[]
): ImportedCurricoloVoice[] {
  return selectedEntries.map((entry) => ({
    id:
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `imp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    catalogId: entry.id,
    classeOrigine: entry.classe,
    disciplina: entry.disciplina,
    tipo: entry.tipo,
    nucleoTematico: entry.nucleoTematico,
    testo: entry.testo,
    testoOriginale: entry.testo,
    documentoProvenienza: entry.documentoProvenienza,
  }));
}

/**
 * Converte e raggruppa le voci importate dal curricolo verticale in righe a 3 colonne
 * (Competenze | Abilità / Obiettivi | Conoscenze / Contenuti), raggruppate per nucleo tematico e classe.
 */
export function buildProgramRowsFromCatalogVoices(
  voices: ImportedCurricoloVoice[],
  existingRows: AbilitaConoscenzaRow[] = []
): AbilitaConoscenzaRow[] {
  if (!voices.length) return existingRows;

  type GroupBucket = {
    nucleo: string;
    classe: ClasseSecondaria;
    competenze: string[];
    abilita: string[];
    conoscenze: string[];
  };

  const buckets = new Map<string, GroupBucket>();
  for (const v of voices) {
    const cleanText = v.testo.trim();
    if (!cleanText) continue;
    const nucleo = v.nucleoTematico.trim() || 'Generale';
    const key = `${v.classeOrigine}::${nucleo.toLowerCase()}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        nucleo,
        classe: v.classeOrigine,
        competenze: [],
        abilita: [],
        conoscenze: [],
      };
      buckets.set(key, bucket);
    }
    if (v.tipo === 'competenza') {
      if (!bucket.competenze.includes(cleanText)) bucket.competenze.push(cleanText);
    } else if (v.tipo === 'abilita' || v.tipo === 'obiettivo_specifico') {
      if (!bucket.abilita.includes(cleanText)) bucket.abilita.push(cleanText);
    } else if (v.tipo === 'conoscenza') {
      if (!bucket.conoscenze.includes(cleanText)) bucket.conoscenze.push(cleanText);
    }
  }

  const normalizeKey = (c: string, a: string, k: string) =>
    `${c.trim().toLowerCase()}||${a.trim().toLowerCase()}||${k.trim().toLowerCase()}`;

  const existingKeys = new Set(
    existingRows.map((r) =>
      normalizeKey(r.competenze || r.traguardo || '', r.abilita, r.conoscenze)
    )
  );

  const nextRows: AbilitaConoscenzaRow[] = [...existingRows];
  for (const bucket of buckets.values()) {
    const compText =
      bucket.competenze.length > 0
        ? bucket.competenze.join('\n• ').replace(/^/, '• ')
        : `[${bucket.nucleo}]`;
    const abText = bucket.abilita.length > 0 ? bucket.abilita.map((t) => `• ${t}`).join('\n') : '';
    const conText =
      bucket.conoscenze.length > 0 ? bucket.conoscenze.map((t) => `• ${t}`).join('\n') : '';

    if (!compText && !abText && !conText) continue;
    const sig = normalizeKey(compText, abText, conText);
    if (existingKeys.has(sig)) continue;
    existingKeys.add(sig);

    nextRows.push({
      id:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      competenze: compText,
      traguardo: bucket.nucleo,
      abilita: abText,
      conoscenze: conText,
    });
  }

  return nextRows;
}

export function getOriginalTextForVoice(
  voice: ImportedCurricoloVoice,
  catalog: CurricoloCatalogEntry[]
): string | null {
  if (voice.catalogId) {
    const match = catalog.find((c) => c.id === voice.catalogId);
    if (match) return match.testo;
  }
  return voice.testoOriginale ?? null;
}

export function isVoiceRestorable(
  voice: ImportedCurricoloVoice,
  catalog: CurricoloCatalogEntry[]
): boolean {
  const original = getOriginalTextForVoice(voice, catalog);
  if (!original) return false;
  return voice.testo.trim() !== original.trim();
}

export function restoreVoiceFromCatalog(
  voices: ImportedCurricoloVoice[],
  voiceId: string,
  catalog: CurricoloCatalogEntry[]
): ImportedCurricoloVoice[] {
  return voices.map((v) => {
    if (v.id !== voiceId) return v;
    const original = getOriginalTextForVoice(v, catalog);
    if (!original) return v;
    return {
      ...v,
      testo: original,
      testoOriginale: original,
    };
  });
}

export function reorderImportedVoices(
  voices: ImportedCurricoloVoice[],
  voiceId: string,
  direction: -1 | 1
): ImportedCurricoloVoice[] {
  const idx = voices.findIndex((v) => v.id === voiceId);
  if (idx === -1) return voices;
  const targetIdx = idx + direction;
  if (targetIdx < 0 || targetIdx >= voices.length) return voices;
  const next = [...voices];
  const [moved] = next.splice(idx, 1);
  next.splice(targetIdx, 0, moved);
  return next;
}

export function validateCatalogJsonPayload(rawJson: string): CurricoloCatalogEntry[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error('Il file selezionato non contiene un JSON valido.');
  }
  if (!Array.isArray(parsed)) {
    throw new Error('Il file JSON del catalogo deve contenere un array di voci.');
  }
  const validClasses = new Set(['Prima', 'Seconda', 'Terza']);
  const validTypes = new Set(['competenza', 'obiettivo_specifico', 'abilita', 'conoscenza']);

  return parsed.map((raw, index) => {
    if (!raw || typeof raw !== 'object') {
      throw new Error(`Voce #${index + 1} non valida nel catalogo JSON.`);
    }
    const r = raw as Record<string, unknown>;
    const classe = String(r.classe ?? '');
    const tipo = String(r.tipo ?? '');
    const testo = String(r.testo ?? '').trim();
    const disciplina = String(r.disciplina ?? '').trim();

    if (!validClasses.has(classe)) {
      throw new Error(
        `Voce #${index + 1}: "classe" deve essere Prima, Seconda o Terza (trovato "${classe}").`
      );
    }
    if (!validTypes.has(tipo)) {
      throw new Error(
        `Voce #${index + 1}: "tipo" deve essere competenza, obiettivo_specifico, abilita o conoscenza.`
      );
    }
    if (!disciplina || !testo) {
      throw new Error(`Voce #${index + 1}: "disciplina" e "testo" sono obbligatori.`);
    }

    return {
      id: String(r.id || `cat-${classe.toLowerCase()}-${index + 1}`),
      classe: classe as ClasseSecondaria,
      disciplina,
      tipo: tipo as CurricoloVoiceType,
      nucleoTematico: String(r.nucleoTematico ?? '').trim(),
      testo,
      documentoProvenienza:
        String(r.documentoProvenienza ?? '').trim() ||
        (classe === 'Prima'
          ? 'Curricolo verticale nuovo'
          : 'Curricolo verticale vecchio (A.S. 2025/2026)'),
    };
  });
}

export function computeCatalogDiff(
  currentCatalog: CurricoloCatalogEntry[],
  nextCatalog: CurricoloCatalogEntry[]
): CatalogDiffSummary {
  const currentMap = new Map(currentCatalog.map((e) => [e.id, e]));
  const nextMap = new Map(nextCatalog.map((e) => [e.id, e]));

  let addedCount = 0;
  let modifiedCount = 0;
  let unchangedCount = 0;
  let removedCount = 0;

  for (const [id, nextItem] of nextMap.entries()) {
    const existing = currentMap.get(id);
    if (!existing) {
      addedCount += 1;
    } else if (
      existing.classe !== nextItem.classe ||
      existing.disciplina !== nextItem.disciplina ||
      existing.tipo !== nextItem.tipo ||
      existing.nucleoTematico !== nextItem.nucleoTematico ||
      existing.testo !== nextItem.testo ||
      existing.documentoProvenienza !== nextItem.documentoProvenienza
    ) {
      modifiedCount += 1;
    } else {
      unchangedCount += 1;
    }
  }

  for (const id of currentMap.keys()) {
    if (!nextMap.has(id)) {
      removedCount += 1;
    }
  }

  return {
    addedCount,
    modifiedCount,
    removedCount,
    unchangedCount,
  };
}
