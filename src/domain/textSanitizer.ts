import type { Programmazione } from './types';

const SPLIT_E_GRAVE_PREFIXES =
  '(?:cio|perch|poich|bench|affinch|sicch|finch|giacch|purch|talch|cosicch|checch|alcunch|fuorch|macch)';

const SPLIT_A_GRAVE_PREFIXES =
  '(?:[A-Za-zÀ-ÿ’\']*it|[A-Za-zÀ-ÿ’\']*lt|[A-Za-zÀ-ÿ’\']*et|citt|et|l’et|all’et|dell’et|sull’et|nell’et|l|di\\s+l|al\\s+di\\s+l|gi|qu|societ|realt|piet|met|libert|povert|onest|bont|volont|sanit|umilt|facolt|difficolt|verit|autorit|comunit|antichit|umanit|maest|tempest|podest|novit|eredit|crudelt|lealt|fedelt|ostilit|utilit|elettricit|scomponibilit|plausibilit|propriet|abilit|capacit|attivit|qualit|quantit|modalit|necessit|velocit|agilit|sensibilit|identit|responsabilit|diversit|legalit|solidariet|tonalit|molteplicit|profondit|tridimensionalit|espressivit|rapidit|mobilit|gestualit|civilt|mondialit|seriet|problematicit|santit|sessualit|attualit|regolarit|familiarit|funzionalit|transcalarit)';

/**
 * Normalizza testo proveniente da PDF, DOCX o database legacy:
 * - converte spazi unificatori e rimuove soft hyphen / caratteri zero-width / ligature;
 * - unisce accenti combinanti separati da spazio (es. "cos i\u0300" -> "così", "citt a\u0300" -> "città");
 * - converte Unicode NFD in NFC (es. "i\u0300" -> "ì", "a\u0300" -> "à", "e\u0301" -> "é");
 * - ricompone vocali accentate staccate da spazio in estrazioni PDF (es. "attivit à" -> "attività", "pi ù" -> "più", "Ges ù" -> "Gesù");
 * - rimuove eventuali residui "#" attaccati a fine parola da PDF (es. "così#" -> "così", "dì#" -> "dì").
 */
export function normalizeDocumentText(raw: string): string {
  if (!raw) return raw;

  let text = raw
    .replace(/\u00A0/g, ' ')
    .replace(/[\u00AD\u200B-\u200F\uFEFF\uFFFD]/g, '')
    .replace(/\uFB00/g, 'ff')
    .replace(/\uFB01/g, 'fi')
    .replace(/\uFB02/g, 'fl')
    .replace(/\uFB03/g, 'ffi')
    .replace(/\uFB04/g, 'ffl')
    .replace(/[\uFB05\uFB06]/g, 'st');

  // Unisci eventuali accenti combinanti staccati da spazio prima di normalizzare in NFC
  // Es. "cos i\u0300" -> "cosi\u0300", "s e\u0301" -> "se\u0301", "citt a\u0300" -> "citta\u0300"
  // Mantiene invece lo spazio prima di "e\u0300" (verbo "è"), tranne per congiunzioni ("cio è", "perch è", ...)
  text = text
    .replace(
      new RegExp(`\\b(${SPLIT_E_GRAVE_PREFIXES})\\s+(e\\u0300)(?![A-Za-zÀ-ÿ])`, 'gi'),
      '$1$2'
    )
    .replace(
      /([A-Za-zÀ-ÿ’']+)\s+([aAiIoOuU][\u0300-\u036f]|[eE][\u0301\u0302\u0308]|[iI][\u0302])(?![A-Za-zÀ-ÿ])/g,
      '$1$2'
    );

  // Converti NFD -> NFC (es. i + \u0300 -> ì)
  text = text.normalize('NFC');

  // Ricomponi vocali accentate NFC rimaste staccate da uno spazio
  text = text
    .replace(
      new RegExp(`\\b(${SPLIT_E_GRAVE_PREFIXES})\\s+è(?![A-Za-zÀ-ÿ])`, 'gi'),
      '$1è'
    )
    .replace(
      /([A-Za-zÀ-ÿ’']+)\s+([ìòùéî])(?![A-Za-zÀ-ÿ])/g,
      '$1$2'
    )
    .replace(
      new RegExp(`\\b(${SPLIT_A_GRAVE_PREFIXES})\\s+à(?![A-Za-zÀ-ÿ])`, 'gi'),
      '$1à'
    )
    // Ricomponi eventuali artefatti PDF "e2" / "EJ" / "EY" in parole accentate comuni e ripara separazioni "#"/legature residue
    .replace(/\b(cio|perch|poich|bench|affinch|sicch|finch|giacch|purch|talch|cosicch|checch|alcunch|fuorch|macch|nonch)\s*e2\b/gi, '$1é')
    .replace(/\bs\s*e2\b/gi, 'sé')
    .replace(/\bd\s*e2\s*pliant\b/gi, 'dépliant')
    .replace(/\bBelle\s+EY\s*poque\b/g, 'Belle Époque')
    .replace(/\bEJ(?=\s+(?:in grado|consapevole|capace|possibile|opportuno|necessario|utile)\b)/g, 'È')
    .replace(/\bABILIT\s+AJ\b/g, 'ABILITÀ')
    .replace(/\babilit\s+aj\b/g, 'abilità')
    // Rimuovi eventuale "#" residuo di encoding PDF attaccato a parole accentate o vocali finali (anche con spazio interposto)
    .replace(/([a-zà-ÿ])\s*a#(?=\s|[,.;:!?)\]]|$)/gi, '$1à')
    .replace(/([a-zà-ÿ])\s*o#(?=\s|[,.;:!?)\]]|$)/gi, '$1ò')
    .replace(/([a-zà-ÿ])\s*u#(?=\s|[,.;:!?)\]]|$)/gi, '$1ù')
    .replace(/([a-zà-ÿ])\s*i#(?=\s|[,.;:!?)\]]|$)/gi, '$1ì')
    .replace(/([àèéìîòù])#(?=\s|[,.;:!?)\]]|$)/gi, '$1');

  return text;
}

const LEADING_BULLET_STRIP_RX =
  /^\s*(?:[•●○▪▫◦☐☑☒□■▢\uF0B7\uF0A7\uF0FE\uF0A8*]+|[-–—](?=\s+|[A-ZÀ-Ö][a-zà-ÿ]))\s*/;

const INLINE_MARKER_SPLIT_RX =
  /([^\n])\s*([☐☑☒□■▢●○▪▫◦\uF0B7\uF0A7\uF0FE\uF0A8•])\s*/g;

const LINE_MARKER_NORMALIZE_RX =
  /^\s*(?:[☐☑☒□■▢●○▪▫◦\uF0B7\uF0A7\uF0FE\uF0A8•]+|\*(?=\s*)|[-–—](?=\s+|[A-ZÀ-Ö][a-zà-ÿ]))\s*/gm;

const PLACEHOLDER_ONLY_RX =
  /^(?:[-—_]+|nessuna\s+(?:voce|conoscenza)\s+inserita\.?)$/i;

const NON_SPLITTING_ABBREVIATIONS_RX =
  /(?:^|[\s(])(?:es|ecc|n|nr|pag|pagg|pp|cap|art|lett|prof|dott|sig|ing|arch|avv|ss|vv|cfr|min|max|approx|fig|tab|vs|all|oss|dir|cir|prot|ord|dec|tel|int|sec|mill|vol|op|cit|loc|ib|ibid|id|cf|a\.C|d\.C|S\.I|A\.S|D\.Lgs|D\.M|D\.P\.R|C\.M)$/i;

const SINGLE_UPPERCASE_INITIAL_RX = /(?:^|[\s(])[A-Z]$/;

const STANDALONE_SECOND_SENTENCE_STARTER_RX =
  /^(?:[A-ZÀ-Ö][a-zà-ÿ]+(?:(?:ar|er|ir|rr)(?:e|si|mi|ti|ci|vi|lo|la|li|le|ne))\b|(?:(?:Lo|La|Il|I|Gli|Le)\s+(?:studente|studentessa|alunno|alunna)|L[’'](?:alunn[oa]|alliev[oa]))\b|Saper(?:e|si)?\b|Esser(?:e|ci)?\b|In\s+casi\b|(?:Riconosc|Utilizz|Rappresent|Fornisc|Calcol|Individu|Cogli|Applic|Esegu|Esprim|Analizz|Produc|Mett|Gestisc|Controll|Partecip|Rispett|Stabilisc|Arbitr|Invent|Cre|Conduc|Realizz|Us|Vari|Risolv|Preved|Mantien|Giung|Assum|Comprend|Legg|Scriv|Interpret|Padroneggi|Disting|Formul|Sostien|Possied|Conosc|Descriv|Spieg|Costruisc|Ricav|Cerc|Selezion|Valut|Identific|Confront|Organizz|Elabor|Scegl|Svilupp|Progett|Adott|Cooper|Interagisc|Accett|Comunic|Espon|Rielabor|Capisc|Apprezz|Verific|Dimostr|Argoment|Document|Ricostruisc|Colloc|Orient|Muov|Esplor|Speriment|Matur)[a-zà-ÿ]*\b|Si\s+[a-zà-ÿ]+\b|Progettazione\b|Collaborazione\b|Protezione\b|Condivisione\b|Gestione\b|Comunicazione\b|Nozioni\b|Utilizzo\b|Cenni\b|Regole\b|Tecniche\b|Opere\b)/;

/**
 * Divide eventuali frasi autonome accorpate sulla stessa riga con ". " (es. obiettivi del curricolo
 * concatenati nello stesso punto elenco) preservando abbreviazioni ("es.", "ecc.", "L.") e
 * prefissi brevi "Titolo. Descrizione" (es. "Lessico. Riconoscere...", "La frase e la sua struttura. Riconoscere...").
 */
export function splitInlineMergedCurricoloSentences(rawLine: string): string[] {
  const trimmed = (rawLine ?? '').trim();
  if (!trimmed) return [];

  const breakOffsets: number[] = [];
  const candidateRx = /([a-zà-ÿ)\]»”’"])\.\s+(?=[A-ZÀ-Ö])/g;
  let match: RegExpExecArray | null;
  while ((match = candidateRx.exec(trimmed)) !== null) {
    const periodIdx = match.index + 1;
    const beforePeriod = trimmed.slice(0, periodIdx);
    if (
      NON_SPLITTING_ABBREVIATIONS_RX.test(beforePeriod) ||
      SINGLE_UPPERCASE_INITIAL_RX.test(beforePeriod)
    ) {
      continue;
    }
    breakOffsets.push(periodIdx);
  }

  if (breakOffsets.length === 0) return [trimmed];

  const segments: string[] = [];
  let cursor = 0;
  for (let i = 0; i < breakOffsets.length; i++) {
    const endIdx = breakOffsets[i] + 1; // include the period
    const leftChunk = trimmed.slice(cursor, endIdx).trim();
    const rightTail = trimmed.slice(endIdx).trim();
    const isAlreadyMultiChunkChain = segments.length > 0 || i < breakOffsets.length - 1;
    const wordCount = leftChunk.split(/\s+/).filter(Boolean).length;
    const hasClauseSeparator = /[;(]/.test(leftChunk);
    const isVerbListTitle =
      /^[A-ZÀ-Ö][a-zà-ÿ]+(?:ar|er|ir|rr)(?:e|si)(?:\s*,\s*[a-zà-ÿ]+(?:ar|er|ir|rr)(?:e|si))+(?:\s+e\s+[a-zà-ÿ]+(?:ar|er|ir|rr)(?:e|si))?\.$/.test(
        leftChunk
      );
    const hasOperationalVerb =
      /^(?:l[’'](?:alunn[oa]|alliev[oa])|l[oa]\s+student(?:e|essa)|i\s+ragazzi)\b/i.test(
        leftChunk
      ) ||
      /\b(?:[a-zà-ÿ]{3,}(?:ar|er|ir|rr)(?:e|si)|saper(?:e)?|esser(?:e)?|comprende|utilizza|riconosce|espone|esegue|interpreta|rappresenta|analizza|scrive|legge|produce|applica|conosce|descrive|individua|distingue|osserva|partecipa|interagisce|comunica|sostiene|coglie|calcola|formula|progetta|organizza|collabora|adotta|orienta|riflette|esplora|rispetta|ricerca|seleziona|elabora|valuta|usa|verifica|argomenta|colloca|muove|spiega|costruisce|ricava|sceglie|sviluppa|crea|gestisce|controlla|mantiene|risolve|prevede)\b/i.test(
        leftChunk
      );

    const looksLikeHeadingPrefix =
      !isAlreadyMultiChunkChain &&
      (isVerbListTitle ||
        (!hasOperationalVerb &&
          leftChunk.length <= 54 &&
          wordCount <= 8 &&
          !hasClauseSeparator &&
          !/,/.test(leftChunk)));

    const canSplitHere =
      leftChunk.length >= 24 &&
      wordCount >= 3 &&
      rightTail.length >= 18 &&
      !looksLikeHeadingPrefix &&
      (isAlreadyMultiChunkChain || STANDALONE_SECOND_SENTENCE_STARTER_RX.test(rightTail));

    if (canSplitHere) {
      segments.push(leftChunk);
      cursor = endIdx;
      while (cursor < trimmed.length && /\s/.test(trimmed[cursor])) cursor++;
    }
  }

  const tail = trimmed.slice(cursor).trim();
  if (tail) segments.push(tail);
  return segments.length ? segments : [trimmed];
}

export function stripLeadingBullet(raw: string): string {
  let prev = normalizeDocumentText(raw ?? '').trim();
  while (true) {
    const next = prev.replace(LEADING_BULLET_STRIP_RX, '').trim();
    if (next === prev) break;
    prev = next;
  }
  return prev;
}

export function extractNormalizedBulletEntries(raw: string): string[] {
  const normalized = normalizeDocumentText(raw ?? '')
    .replace(INLINE_MARKER_SPLIT_RX, '$1\n$2 ')
    .replace(/\r?\n/g, '\n');
  return normalized
    .split('\n')
    .map((line) => stripLeadingBullet(line))
    .filter((line) => line.length > 0)
    .flatMap((line) => splitInlineMergedCurricoloSentences(line))
    .map((line) => stripLeadingBullet(line))
    .filter((line) => line.length > 0);
}

export interface CurricoloFormattedLine {
  text: string;
  isNucleoTitle: boolean;
  isPlaceholder?: boolean;
}

export function looksLikeCurriculumSentenceNotHeading(trimmed: string): boolean {
  if (/^[a-zà-ÿ]/.test(trimmed)) return true;
  if (
    /^(?:[A-Za-zÀ-ÿ]+(?:(?:ar|er|ir|rr)(?:e|si|mi|ti|ci|vi))|Saper(?:e)?|Esser(?:e)?)\s+\S+/i.test(
      trimmed
    )
  ) {
    return true;
  }
  if (/^(?:l[’'](?:alunn[oa]|alliev[oa])|l[oa]\s+student(?:e|essa)|gli\s+alunni)\b/i.test(trimmed)) {
    return true;
  }
  if (
    /\b(?:comprende|utilizza|riconosce|espone|esegue|interpreta|rappresenta|analizza|scrive|legge|produce|applica|conosce|descrive|individua|distingue|osserva|partecipa|interagisce|comunica|sostiene|coglie|calcola|formula|progetta|organizza|collabora|adotta|orienta|riflette|esplora|rispetta|ricerca|seleziona|elabora|valuta|usa|verifica|argomenta|colloca|muove|spiega|costruisce|ricava|sceglie|sviluppa|crea|gestisce|controlla|mantiene|risolve|prevede)\b/i.test(
      trimmed
    )
  ) {
    return true;
  }
  return false;
}

/**
 * Normalizza il contenuto di una cella Obiettivi/Abilità o Conoscenze per la pubblicazione
 * (anteprima, DOCX, PDF), garantendo che ogni intestazione di nucleo resti in grassetto
 * senza punto elenco e ogni obiettivo/contenuto abbia sempre il proprio punto dell'elenco puntato.
 */
export function formatCurricoloCellLines(
  rawText: string,
  nucleoHint?: string
): CurricoloFormattedLine[] {
  const clean = normalizeDocumentText(rawText ?? '')
    .replace(INLINE_MARKER_SPLIT_RX, '$1\n$2 ')
    .replace(LINE_MARKER_NORMALIZE_RX, '• ')
    .replace(/\r?\n/g, '\n')
    .trim();

  if (!clean) return [];

  if (PLACEHOLDER_ONLY_RX.test(clean)) {
    return [{ text: clean, isNucleoTitle: false, isPlaceholder: true }];
  }

  const hint = normalizeDocumentText((nucleoHint ?? '').trim());
  const normalizedHintKey = hint.replace(/:$/, '').trim().toLowerCase();
  const rawFirstLine = clean.split('\n')[0]?.trim() ?? '';
  const hasHintOnFirstLine =
    normalizedHintKey.length > 0 &&
    rawFirstLine.replace(/^•\s*/, '').replace(/:$/, '').trim().toLowerCase() === normalizedHintKey;

  const effective =
    hint && !hasHintOnFirstLine ? `${hint}\n${clean}` : clean;

  const rawLines = effective
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (rawLines.length === 0) return [];

  const out: CurricoloFormattedLine[] = [];

  for (let idx = 0; idx < rawLines.length; idx++) {
    const trimmed = rawLines[idx];
    const startsWithBullet = trimmed.startsWith('•');
    const startsWithNumbering = /^\d+[.)]\s/.test(trimmed);
    const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
    const hasFollowerWithMarkerAfter = rawLines
      .slice(idx + 1)
      .some((l) => /^(?:[•\-*▪▫◦●○☐☑☒]|\d+[.)]\s)/.test(l));

    const cleanKey = trimmed.replace(/:$/, '').trim().toLowerCase();
    const isHintMatch =
      idx === 0 &&
      normalizedHintKey.length > 0 &&
      cleanKey === normalizedHintKey;

    const isUnHintedNucleoTitle =
      rawLines.length > idx + 1 &&
      hasFollowerWithMarkerAfter &&
      trimmed.length <= 78 &&
      wordCount <= 12 &&
      !/[.!?;]$/.test(trimmed) &&
      !looksLikeCurriculumSentenceNotHeading(trimmed);

    const isNucleoTitle =
      !startsWithBullet &&
      !startsWithNumbering &&
      !PLACEHOLDER_ONLY_RX.test(trimmed) &&
      (isHintMatch || isUnHintedNucleoTitle);

    if (isNucleoTitle) {
      const headingText = trimmed.replace(/:$/, '').trim();
      if (headingText) {
        out.push({ text: headingText, isNucleoTitle: true });
      }
      continue;
    }

    if (PLACEHOLDER_ONLY_RX.test(trimmed)) {
      out.push({ text: trimmed, isNucleoTitle: false, isPlaceholder: true });
      continue;
    }

    if (startsWithNumbering) {
      out.push({ text: trimmed, isNucleoTitle: false });
      continue;
    }

    const bodyText = stripLeadingBullet(trimmed);
    const splitSentences = splitInlineMergedCurricoloSentences(bodyText);
    for (const sentence of splitSentences) {
      const cleanSentence = stripLeadingBullet(sentence);
      if (cleanSentence) {
        out.push({ text: `• ${cleanSentence}`, isNucleoTitle: false });
      }
    }
  }

  return out;
}

/**
 * Unifica tutte le righe del programma in due sole colonne (Obiettivi/Abilità e Conoscenze)
 * pronte per essere pubblicate in un'unica riga di tabella con tutti i rispettivi nuclei tematici in neretto.
 */
export function formatUnifiedCurricoloColumns(
  rows: import('./types').AbilitaConoscenzaRow[]
): {
  leftLines: CurricoloFormattedLine[];
  rightLines: CurricoloFormattedLine[];
} {
  const appendRowSide = (
    acc: CurricoloFormattedLine[],
    lastNucleoRef: { key: string },
    rawText: string,
    nucleoHint?: string
  ) => {
    const rawTrimmed = normalizeDocumentText(rawText ?? '').trim();
    if (!rawTrimmed || PLACEHOLDER_ONLY_RX.test(rawTrimmed)) return;
    const lines = formatCurricoloCellLines(rawTrimmed, nucleoHint);
    const nonPlaceholder = lines.filter((l) => !l.isPlaceholder);
    if (nonPlaceholder.length === 0) return;

    for (const line of nonPlaceholder) {
      if (line.isNucleoTitle) {
        const nextKey = line.text.replace(/:$/, '').trim().toLowerCase();
        if (nextKey && nextKey === lastNucleoRef.key) {
          continue;
        }
        lastNucleoRef.key = nextKey;
      }
      acc.push(line);
    }
  };

  const leftLines: CurricoloFormattedLine[] = [];
  const rightLines: CurricoloFormattedLine[] = [];
  const lastLeftNucleo = { key: '' };
  const lastRightNucleo = { key: '' };

  for (const row of rows) {
    appendRowSide(leftLines, lastLeftNucleo, row.abilita, row.traguardo);
    appendRowSide(rightLines, lastRightNucleo, row.conoscenze, row.traguardo);
  }

  return { leftLines, rightLines };
}

export function normalizeProgrammazioneTexts(plan: Programmazione): Programmazione {
  const norm = normalizeDocumentText;
  return {
    ...plan,
    datiGenerali: {
      ...plan.datiGenerali,
      scuola: norm(plan.datiGenerali.scuola),
      plesso: norm(plan.datiGenerali.plesso),
      disciplina: norm(plan.datiGenerali.disciplina),
      docente: norm(plan.datiGenerali.docente),
    },
    analisiPartenza: {
      ...plan.analisiPartenza,
      descrizioneDisciplinare: norm(plan.analisiPartenza.descrizioneDisciplinare),
      altraFonte: norm(plan.analisiPartenza.altraFonte),
    },
    interventi: {
      ...plan.interventi,
      potenziamentoAltro: norm(plan.interventi.potenziamentoAltro),
      consolidamentoAltro: norm(plan.interventi.consolidamentoAltro),
      recuperoAltro: norm(plan.interventi.recuperoAltro),
      besInterventiProgrammati: norm(plan.interventi.besInterventiProgrammati),
    },
    curricolo: {
      ...plan.curricolo,
      competenzeAttese: (plan.curricolo.competenzeAttese ?? []).map(norm),
      competenzeDigitali: (plan.curricolo.competenzeDigitali ?? []).map(norm),
      notaIntroduttiva: norm(plan.curricolo.notaIntroduttiva),
      attivitaProgrammate: norm(plan.curricolo.attivitaProgrammate),
      righeAbilitaConoscenze: (plan.curricolo.righeAbilitaConoscenze ?? []).map((row) => ({
        ...row,
        competenze: row.competenze !== undefined ? norm(row.competenze) : undefined,
        traguardo: row.traguardo !== undefined ? norm(row.traguardo) : undefined,
        abilita: norm(row.abilita),
        conoscenze: norm(row.conoscenze),
      })),
      vociCatalogoImportate: (plan.curricolo.vociCatalogoImportate ?? []).map((voice) => ({
        ...voice,
        nucleoTematico: norm(voice.nucleoTematico),
        testo: norm(voice.testo),
        testoOriginale:
          voice.testoOriginale !== undefined ? norm(voice.testoOriginale) : undefined,
      })),
    },
    metodiStrumenti: {
      ...plan.metodiStrumenti,
      premessaMetodologica: norm(plan.metodiStrumenti.premessaMetodologica),
      altreMetodologie: norm(plan.metodiStrumenti.altreMetodologie),
      altriSussidi: norm(plan.metodiStrumenti.altriSussidi),
      ausiliDidattici: norm(plan.metodiStrumenti.ausiliDidattici),
      didatticaDigitaleIntegrata: norm(plan.metodiStrumenti.didatticaDigitaleIntegrata),
    },
    verificheValutazione: {
      ...plan.verificheValutazione,
      altriTipiProve: norm(plan.verificheValutazione.altriTipiProve),
      criteriValutazione: norm(plan.verificheValutazione.criteriValutazione),
      firmaDocente: norm(plan.verificheValutazione.firmaDocente),
    },
  };
}
