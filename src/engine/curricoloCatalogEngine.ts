import type {
  AbilitaConoscenzaRow,
  ClasseSecondaria,
  CurricoloCatalogEntry,
  CurricoloVoiceType,
  ImportedCurricoloVoice,
  IndicazioniVersion,
} from '../domain/types';

export const INDICAZIONI_LABELS: Record<IndicazioniVersion, string> = {
  nuove: 'Nuove Indicazioni',
  vecchie: 'Vecchie Indicazioni (A.S. 2025/2026)',
};

export function parseStartYearFromAnnoScolastico(annoScolastico: string | undefined): number | null {
  const raw = (annoScolastico ?? '').trim();
  if (!raw) return null;
  const fourDigitMatch = raw.match(/\b(20\d{2})\b/);
  if (fourDigitMatch) {
    return Number(fourDigitMatch[1]);
  }
  const twoDigitMatch = raw.match(/(?:^|\D)(\d{2})\s*[\/\-]\s*\d{2,4}(?:\D|$)/);
  if (twoDigitMatch) {
    return 2000 + Number(twoDigitMatch[1]);
  }
  return null;
}

/**
 * Regola predefinita per le Indicazioni Nazionali:
 * - fino al 2026/27: Nuove Indicazioni per la Prima, Vecchie per Seconda e Terza;
 * - A.S. 2027/28: Nuove Indicazioni per Prima e Seconda, Vecchie per Terza;
 * - A.S. >= 2028/29: Nuove Indicazioni per tutte le classi (Prima, Seconda, Terza).
 */
export function getDefaultIndicazioniForClasseAndYear(
  classe: ClasseSecondaria,
  annoScolastico?: string
): IndicazioniVersion {
  const startYear = parseStartYearFromAnnoScolastico(annoScolastico);
  if (startYear !== null && startYear >= 2028) {
    return 'nuove';
  }
  if (startYear !== null && startYear >= 2027) {
    return classe === 'Terza' ? 'vecchie' : 'nuove';
  }
  return classe === 'Prima' ? 'nuove' : 'vecchie';
}

export function getCatalogEntryIndicazioniVersion(
  entry: Pick<CurricoloCatalogEntry, 'documentoProvenienza'>
): IndicazioniVersion {
  return (entry.documentoProvenienza || '').toLowerCase().includes('vecchio')
    ? 'vecchie'
    : 'nuove';
}

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
  disciplina: string,
  indicazioniVersion?: IndicazioniVersion | 'tutte'
): CurricoloCatalogEntry[] {
  return catalog.filter((entry) => {
    if (entry.classe !== classe) return false;
    if (entry.disciplina.toLowerCase() !== disciplina.toLowerCase()) return false;
    if (!indicazioniVersion || indicazioniVersion === 'tutte') return true;
    return getCatalogEntryIndicazioniVersion(entry) === indicazioniVersion;
  });
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

    const nuclei: CurricoloNucleoGroup[] = Array.from(nucleoMap.entries())
      .map(([nucleoTematico, groupEntries]) => ({
        nucleoTematico,
        entries: groupEntries,
      }))
      .sort((a, b) => {
        const disc = a.entries[0]?.disciplina ?? b.entries[0]?.disciplina ?? '';
        return getNucleoSortRank(disc, a.nucleoTematico) - getNucleoSortRank(disc, b.nucleoTematico);
      });

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
 * Estrae le competenze attese (senza duplicati) dalle voci di catalogo selezionate,
 * così da inserirle sotto "TRAGUARDI PER LO SVILUPPO DELLE COMPETENZE" prima delle competenze digitali.
 */
export function extractCompetenzeFromCatalogVoices(
  voices: ImportedCurricoloVoice[],
  existingCompetenze: string[] = []
): string[] {
  const seen = new Set(existingCompetenze.map((c) => c.trim().toLowerCase()).filter(Boolean));
  const next = [...existingCompetenze];
  for (const v of voices) {
    if (v.tipo !== 'competenza') continue;
    const text = v.testo.trim();
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(text);
  }
  return next;
}

const CANONICAL_NUCLEO_ORDER: Record<string, string[]> = {
  matematica: [
    'numeri',
    'spazio e figure',
    'relazioni e funzioni',
    'dati e previsioni',
    'ragionamento',
    'digitale',
  ],
  scienze: [
    'biologia',
    'fisica',
    'chimica',
    'astronomia',
    'studio del territorio',
    'scienze sperimentali',
    'metodo scientifico',
    'digitale',
  ],
  italiano: [
    'oralità',
    'ascolto',
    'ascoltar',
    'lettura',
    'leggere',
    'scrittura',
    'scrivere',
    'comprensione, produzione',
    'lessico',
    'la frase',
    'analisi logica',
    'riflessione sulla lingua',
    'letteratura',
    'studiare',
    'discernere',
    'rete',
    'digitale',
  ],
  storia: [
    'strumenti concettuali',
    'uso delle fonti',
    'organizzazione delle informazioni',
    'riconoscere le tracce',
    'esporre i fatti',
    'produzione scritta',
    'feudalesimo',
    'motore del cambiamento',
    'tre italie',
    'tre rivoluzioni',
    'regno d’italia',
    'il primo novecento',
    'l’età dei totalitarismi',
    'la seconda guerra mondiale',
    'il mondo contemporaneo',
    'digitale',
  ],
  geografia: [
    'orientamento',
    'paesaggio',
    'regioni',
    'approfondimento dell’italia',
    'approfondimento dell’europa',
    'approfondimento degli altri continenti',
    'grandi sfide',
    'digitale',
  ],
  inglese: [
    'ascolto',
    'parlato',
    'lettura',
    'scrittura',
    'funzioni comunicative',
    'riflessione sulla lingua',
    'digitale',
  ],
  francese: [
    'ascolto',
    'parlato',
    'lettura',
    'scrittura',
    'descrivere',
    'riflessione sulla lingua',
    'digitale',
  ],
  'arte e immagine': [
    'osserva',
    'analizzare',
    'comprendere',
    'esprimersi',
    'espressivit',
    'comunicazione',
    'tecniche artistiche',
    'superficie',
    'digitale',
  ],
  tecnologia: [
    'vedere, osservare',
    'materiali',
    'disegno tecnico',
    'progettazione',
    'sistema operativo',
    'informatica',
  ],
  'educazione fisica': [
    'il corpo',
    'linguaggio del corpo',
    'gioco, lo sport',
    'salute, benessere',
    'digitale',
  ],
  'latino (lel)': [
    'alfabeto',
    'morfologia',
    'cultura latina',
    'digitale',
  ],
  religione: [
    'dio e l’uomo',
    'dio di gesù',
    'bibbia',
    'linguaggio religioso',
    'valori etici',
  ],
  musica: [
    'ascolto',
    'analizzare',
    'teoria e notazione',
    'leggere la notazione',
    'pratica vocale',
    'eseguire',
    'interpretare',
    'improvvisare',
    'partecipare ad ensemble',
    'storia e cultura',
    'conoscere la storia',
    'medioevo',
    'rinascimento',
    'barocco',
    'classicismo',
    'romanticismo',
    'novecento',
    'digitale',
  ],
  'educazione civica': [
    'costituzione',
    'cultura',
    'partecipazione',
    'legalità',
    'etica',
    'società',
    'innovazione sociale',
    'sviluppo sostenibile',
    'ecologia',
    'territorio',
    'salute',
    'cittadinanza digitale',
  ],
  'strumento musicale': [
    'percezione',
    'teoria e lettura',
    'tecnica e prassi',
    'respirazione',
    'prassi esecutiva',
    'interpretazione',
    'digitale',
  ],
};

function isDigitalNucleoName(nucleo: string): boolean {
  const nLower = nucleo.trim().toLowerCase();
  return (
    nLower.includes('digital') ||
    nLower.includes('steam') ||
    nLower.includes('usare bene la rete') ||
    nLower.includes('altro')
  );
}

function getNucleoSortRank(disciplina: string, nucleo: string): number {
  const nLower = nucleo.trim().toLowerCase();
  // Contenuti digitali o STEAM sempre in fondo alla tabella dopo i nuclei disciplinari
  if (isDigitalNucleoName(nLower)) {
    return 900;
  }
  const order = CANONICAL_NUCLEO_ORDER[disciplina.trim().toLowerCase()];
  if (!order) return 100;
  const idx = order.findIndex((prefix) => nLower.includes(prefix));
  return idx === -1 ? 200 : idx;
}

function extractNucleoBullets(cellText: string, nucleo: string): string[] {
  const lines = (cellText || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];
  const normNucleo = nucleo.trim().toLowerCase();
  return lines
    .filter((l, idx) => !(idx === 0 && l.toLowerCase() === normNucleo))
    .map((l) => l.replace(/^[•\-\*]\s*/, '').trim())
    .filter(Boolean);
}

function formatNucleoCell(nucleo: string, items: string[]): string {
  if (items.length === 0) return '';
  return `${nucleo}\n${items.map((t) => `• ${t}`).join('\n')}`;
}

/**
 * Converte e raggruppa le voci importate dal curricolo verticale in righe a 2 colonne
 * (Abilità / Obiettivi a sinistra · Conoscenze / Contenuti a destra), raggruppate per
 * nucleo tematico (es. Numeri, Spazio e figure, Biologia, Fisica...) con i contenuti digitali in coda.
 * Le competenze vengono gestite separatamente dopo i Traguardi per lo sviluppo delle competenze.
 */
export function buildProgramRowsFromCatalogVoices(
  voices: ImportedCurricoloVoice[],
  existingRows: AbilitaConoscenzaRow[] = [],
  options?: { indicazioniVersione?: IndicazioniVersion }
): AbilitaConoscenzaRow[] {
  if (!voices.length) return existingRows;

  type GroupBucket = {
    nucleo: string;
    classe: ClasseSecondaria;
    disciplina: string;
    abilita: string[];
    conoscenze: string[];
  };

  const buckets = new Map<string, GroupBucket>();
  const targetVersion = options?.indicazioniVersione;

  for (const v of voices) {
    if (v.tipo === 'competenza') continue;
    const cleanText = v.testo.trim();
    if (!cleanText) continue;

    // Se in catalogo sono presenti entrambi i tipi, privilegia quelli coerenti con la versione selezionata
    if (
      targetVersion === 'nuove' &&
      v.tipo === 'abilita' &&
      voices.some((other) => other.tipo === 'obiettivo_specifico')
    ) {
      continue;
    }
    if (
      targetVersion === 'vecchie' &&
      v.tipo === 'obiettivo_specifico' &&
      voices.some((other) => other.tipo === 'abilita')
    ) {
      continue;
    }

    const nucleo = v.nucleoTematico.trim() || 'Contenuti disciplinari';
    const key = nucleo.toLowerCase();
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        nucleo,
        classe: v.classeOrigine,
        disciplina: v.disciplina,
        abilita: [],
        conoscenze: [],
      };
      buckets.set(key, bucket);
    }
    if (v.tipo === 'abilita' || v.tipo === 'obiettivo_specifico') {
      if (!bucket.abilita.includes(cleanText)) bucket.abilita.push(cleanText);
    } else if (v.tipo === 'conoscenza') {
      if (!bucket.conoscenze.includes(cleanText)) bucket.conoscenze.push(cleanText);
    }
  }

  const orderedBuckets = Array.from(buckets.values()).sort(
    (a, b) =>
      getNucleoSortRank(a.disciplina, a.nucleo) - getNucleoSortRank(b.disciplina, b.nucleo)
  );

  const primaryDisciplina =
    orderedBuckets.find((b) => b.disciplina)?.disciplina ?? voices[0]?.disciplina ?? '';

  const nextRows: AbilitaConoscenzaRow[] = existingRows.map((r) => ({ ...r }));
  const byNucleoKey = new Map<string, number>();
  nextRows.forEach((row, idx) => {
    const key = (row.traguardo ?? '').trim().toLowerCase();
    if (key && !byNucleoKey.has(key)) {
      byNucleoKey.set(key, idx);
    }
  });

  for (const bucket of orderedBuckets) {
    const key = bucket.nucleo.toLowerCase();
    const existingIdx = byNucleoKey.get(key);

    if (existingIdx !== undefined) {
      const current = nextRows[existingIdx];
      const mergedAb = extractNucleoBullets(current.abilita, bucket.nucleo);
      for (const item of bucket.abilita) {
        if (!mergedAb.some((x) => x.toLowerCase() === item.toLowerCase())) {
          mergedAb.push(item);
        }
      }
      const mergedCon = extractNucleoBullets(current.conoscenze, bucket.nucleo);
      for (const item of bucket.conoscenze) {
        if (!mergedCon.some((x) => x.toLowerCase() === item.toLowerCase())) {
          mergedCon.push(item);
        }
      }
      nextRows[existingIdx] = {
        ...current,
        competenze: '',
        traguardo: bucket.nucleo,
        abilita: mergedAb.length ? formatNucleoCell(bucket.nucleo, mergedAb) : current.abilita,
        conoscenze: mergedCon.length
          ? formatNucleoCell(bucket.nucleo, mergedCon)
          : current.conoscenze,
      };
      continue;
    }

    const abText = formatNucleoCell(bucket.nucleo, bucket.abilita);
    const conText = formatNucleoCell(bucket.nucleo, bucket.conoscenze);
    if (!abText && !conText) continue;

    byNucleoKey.set(key, nextRows.length);
    nextRows.push({
      id:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      competenze: '',
      traguardo: bucket.nucleo,
      abilita: abText,
      conoscenze: conText,
    });
  }

  // Mantiene l'ordine canonico dei nuclei con gli eventuali contenuti digitali sempre in coda
  return nextRows.sort((a, b) => {
    const rankA = a.traguardo
      ? getNucleoSortRank(primaryDisciplina, a.traguardo)
      : isDigitalNucleoName(a.conoscenze)
      ? 900
      : 500;
    const rankB = b.traguardo
      ? getNucleoSortRank(primaryDisciplina, b.traguardo)
      : isDigitalNucleoName(b.conoscenze)
      ? 900
      : 500;
    return rankA - rankB;
  });
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

/**
 * Risolve le voci di catalogo coerenti con classe, disciplina e curricolo selezionato
 * ('nuove' = Obiettivi specifici + Competenze + Conoscenze; 'vecchie' = Abilità + Competenze + Conoscenze).
 * Evita di mescolare obiettivi delle Nuove Indicazioni dentro le Vecchie e viceversa.
 */
export function resolveCatalogEntriesForCurriculum(
  catalog: CurricoloCatalogEntry[],
  classe: ClasseSecondaria,
  disciplina: string,
  indicazioniVersion: IndicazioniVersion
): CurricoloCatalogEntry[] {
  const byClassDisc = filterCatalogEntries(catalog, classe, disciplina);
  const versionMatched = filterCatalogEntries(catalog, classe, disciplina, indicazioniVersion);

  if (indicazioniVersion === 'nuove') {
    return versionMatched.filter(
      (e) =>
        e.tipo === 'competenza' ||
        e.tipo === 'obiettivo_specifico' ||
        e.tipo === 'conoscenza'
    );
  }

  // Vecchie Indicazioni: usa Abilità + Conoscenze vecchie; se nel seed mancano competenze o conoscenze
  // specificamente marcate "vecchio" per quella classe, integra quelle condivise della stessa classe/disciplina
  // escludendo sempre gli obiettivi specifici delle Nuove Indicazioni.
  const result: CurricoloCatalogEntry[] = [];
  const seenIds = new Set<string>();
  const pushUnique = (items: CurricoloCatalogEntry[]) => {
    for (const item of items) {
      if (item.tipo === 'obiettivo_specifico') continue;
      if (seenIds.has(item.id)) continue;
      seenIds.add(item.id);
      result.push(item);
    }
  };

  const hasVecchieCompetenze = versionMatched.some((e) => e.tipo === 'competenza');
  if (!hasVecchieCompetenze) {
    pushUnique(byClassDisc.filter((e) => e.tipo === 'competenza'));
  } else {
    pushUnique(versionMatched.filter((e) => e.tipo === 'competenza'));
  }

  pushUnique(versionMatched.filter((e) => e.tipo === 'abilita'));

  const vecchieConoscenze = versionMatched.filter((e) => e.tipo === 'conoscenza');
  if (vecchieConoscenze.length > 0) {
    pushUnique(vecchieConoscenze);
  } else {
    pushUnique(byClassDisc.filter((e) => e.tipo === 'conoscenza'));
  }

  return result;
}

export interface OtherClassCatalogBucket {
  classe: ClasseSecondaria;
  entries: CurricoloCatalogEntry[];
}

/**
 * Restituisce le voci delle altre classi della stessa disciplina facendo SEMPRE riferimento
 * allo stesso curricolo selezionato (Nuove vs Vecchie Indicazioni).
 */
export function resolveOtherClassesEntriesForCurriculum(
  catalog: CurricoloCatalogEntry[],
  currentClasse: ClasseSecondaria,
  disciplina: string,
  indicazioniVersion: IndicazioniVersion
): OtherClassCatalogBucket[] {
  const allClasses: ClasseSecondaria[] = ['Prima', 'Seconda', 'Terza'];
  return allClasses
    .filter((cls) => cls !== currentClasse)
    .map((cls) => ({
      classe: cls,
      entries: resolveCatalogEntriesForCurriculum(catalog, cls, disciplina, indicazioniVersion),
    }))
    .filter((bucket) => bucket.entries.length > 0);
}

export interface CurriculumSheetNucleoRow {
  nucleoKey: string;
  nucleoTematico: string;
  leftItems: CurricoloCatalogEntry[];
  rightItems: CurricoloCatalogEntry[];
}

export interface CurriculumSheetModel {
  competenze: CurricoloCatalogEntry[];
  rows: CurriculumSheetNucleoRow[];
  leftColumnLabel: string;
  rightColumnLabel: string;
}

/**
 * Organizza le voci del curricolo in una struttura analoga al documento finale di output:
 * - Competenze attese in testa (1 colonna)
 * - Tabella a 2 colonne raggruppata per Nucleo Tematico:
 *   Obiettivi specifici (Nuove Indicazioni) oppure Abilità (Vecchie Indicazioni) a sinistra,
 *   Conoscenze / Contenuti a destra, con i nuclei digitali/STEAM sempre in coda.
 */
export function buildCurriculumSheetModel(
  entries: CurricoloCatalogEntry[],
  disciplina: string,
  indicazioniVersion: IndicazioniVersion
): CurriculumSheetModel {
  const competenze: CurricoloCatalogEntry[] = [];
  const seenComp = new Set<string>();

  type MutableRow = {
    nucleoKey: string;
    nucleoTematico: string;
    leftItems: CurricoloCatalogEntry[];
    rightItems: CurricoloCatalogEntry[];
  };
  const rowMap = new Map<string, MutableRow>();

  const expectedLeftType: CurricoloVoiceType =
    indicazioniVersion === 'nuove' ? 'obiettivo_specifico' : 'abilita';

  for (const entry of entries) {
    if (entry.tipo === 'competenza') {
      const textKey = `${entry.classe}|${entry.testo.trim().toLowerCase()}`;
      if (!seenComp.has(textKey)) {
        seenComp.add(textKey);
        competenze.push(entry);
      }
      continue;
    }

    if (entry.tipo !== expectedLeftType && entry.tipo !== 'conoscenza') {
      continue;
    }

    const nucleo = entry.nucleoTematico.trim() || 'Contenuti disciplinari';
    const nucleoKey = nucleo.toLowerCase();
    let row = rowMap.get(nucleoKey);
    if (!row) {
      row = {
        nucleoKey,
        nucleoTematico: nucleo,
        leftItems: [],
        rightItems: [],
      };
      rowMap.set(nucleoKey, row);
    }

    if (entry.tipo === expectedLeftType) {
      row.leftItems.push(entry);
    } else if (entry.tipo === 'conoscenza') {
      row.rightItems.push(entry);
    }
  }

  const rows = Array.from(rowMap.values()).sort(
    (a, b) =>
      getNucleoSortRank(disciplina, a.nucleoTematico) -
      getNucleoSortRank(disciplina, b.nucleoTematico)
  );

  return {
    competenze,
    rows,
    leftColumnLabel:
      indicazioniVersion === 'nuove'
        ? 'Obiettivi specifici di apprendimento'
        : 'Abilità',
    rightColumnLabel: 'Conoscenze (Contenuti)',
  };
}
