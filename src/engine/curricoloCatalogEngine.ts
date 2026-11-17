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
