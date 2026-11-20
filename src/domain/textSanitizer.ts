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
    // Rimuovi eventuale "#" residuo di encoding PDF attaccato a parole accentate
    .replace(/([àèéìîòù])#(?=\s|[,.;:!?)\]]|$)/gi, '$1');

  return text;
}

const LEADING_BULLET_STRIP_RX =
  /^\s*(?:[•●○▪▫◦☐☑☒□■▢\uF0B7\uF0A7\uF0FE\uF0A8*]+|[-–—](?=\s+))\s*/;

const INLINE_MARKER_SPLIT_RX =
  /([^\n])\s*([☐☑☒□■▢●○▪▫◦\uF0B7\uF0A7\uF0FE\uF0A8•])\s*/g;

const LINE_MARKER_NORMALIZE_RX =
  /^\s*(?:[☐☑☒□■▢●○▪▫◦\uF0B7\uF0A7\uF0FE\uF0A8•]+|\*(?=\s*)|[-–—](?=\s+))\s*/gm;

const PLACEHOLDER_ONLY_RX =
  /^(?:[-—_]+|nessuna\s+(?:voce|conoscenza)\s+inserita\.?)$/i;

export function stripLeadingBullet(raw: string): string {
  return normalizeDocumentText(raw ?? '')
    .replace(LEADING_BULLET_STRIP_RX, '')
    .trim();
}

export function extractNormalizedBulletEntries(raw: string): string[] {
  const normalized = normalizeDocumentText(raw ?? '')
    .replace(INLINE_MARKER_SPLIT_RX, '$1\n$2 ')
    .replace(/\r?\n/g, '\n');
  return normalized
    .split('\n')
    .map((line) => stripLeadingBullet(line))
    .filter((line) => line.length > 0);
}

export interface CurricoloFormattedLine {
  text: string;
  isNucleoTitle: boolean;
  isPlaceholder?: boolean;
}

/**
 * Normalizza il contenuto di una cella Obiettivi/Abilità o Conoscenze per la pubblicazione
 * (anteprima, DOCX, PDF), garantendo che l'eventuale intestazione del nucleo resti in grassetto
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
  const rawFirstLine = clean.split('\n')[0]?.trim() ?? '';
  const hasHintOnFirstLine =
    hint.length > 0 && rawFirstLine.toLowerCase() === hint.toLowerCase();

  const effective =
    hint && !hasHintOnFirstLine ? `${hint}\n${clean}` : clean;

  const lines = effective
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return [];

  const hasFollowerWithMarker = lines
    .slice(1)
    .some((l) => /^(?:[•\-*▪▫◦●○☐☑☒]|\d+[.)]\s)/.test(l));

  return lines.map((trimmed, idx) => {
    const startsWithBullet = trimmed.startsWith('•');
    const startsWithNumbering = /^\d+[.)]\s/.test(trimmed);
    const looksLikeInfinitiveObjectiveClause =
      /^[A-Za-zÀ-ÿ]+(?:are|ere|ire|rre)\s+\S+/i.test(trimmed);

    const isNucleoTitle =
      idx === 0 &&
      !startsWithBullet &&
      !startsWithNumbering &&
      ((hint.length > 0 && trimmed.toLowerCase() === hint.toLowerCase()) ||
        (lines.length > 1 &&
          hasFollowerWithMarker &&
          trimmed.length <= 35 &&
          !/[.!?;:]$/.test(trimmed) &&
          !looksLikeInfinitiveObjectiveClause));

    if (isNucleoTitle) {
      return { text: trimmed, isNucleoTitle: true };
    }

    if (PLACEHOLDER_ONLY_RX.test(trimmed)) {
      return { text: trimmed, isNucleoTitle: false, isPlaceholder: true };
    }

    if (startsWithBullet) {
      return { text: trimmed.replace(/^•\s*/, '• '), isNucleoTitle: false };
    }

    if (startsWithNumbering) {
      return { text: trimmed, isNucleoTitle: false };
    }

    return { text: `• ${trimmed}`, isNucleoTitle: false };
  });
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
