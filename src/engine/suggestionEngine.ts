import type {
  Programmazione,
  RuleAction,
  RuleCondition,
  SuggestionProposal,
  SuggestionRule,
} from '../domain/types';

function readFieldValue(plan: Programmazione, fieldPath: RuleCondition['field']): unknown {
  switch (fieldPath) {
    case 'situazione.livello':
      return plan.situazione.livello;
    case 'situazione.tipologie':
      return plan.situazione.tipologie;
    case 'composizione.bes':
      return plan.composizione.bes;
    case 'composizione.ripetenti':
      return plan.composizione.ripetenti;
    case 'analisiPartenza.livelli.bassoAlunni':
      return plan.analisiPartenza.livelli.bassoAlunni;
    case 'analisiPartenza.livelli.medioBassoAlunni':
      return plan.analisiPartenza.livelli.medioBassoAlunni;
    case 'analisiPartenza.livelli.altoAlunni':
      return plan.analisiPartenza.livelli.altoAlunni;
    case 'datiGenerali.classe':
      return plan.datiGenerali.classe;
    case 'datiGenerali.disciplina':
      return plan.datiGenerali.disciplina;
    default:
      return undefined;
  }
}

export function evaluateCondition(plan: Programmazione, cond: RuleCondition): boolean {
  const actual = readFieldValue(plan, cond.field);
  switch (cond.operator) {
    case 'equals':
      return actual === cond.value;
    case 'not_equals':
      return actual !== cond.value;
    case 'includes':
      if (Array.isArray(actual)) {
        return actual.includes(cond.value);
      }
      if (typeof actual === 'string') {
        return actual.toLowerCase().includes(String(cond.value).toLowerCase());
      }
      return false;
    case 'gt':
      return typeof actual === 'number' && actual > Number(cond.value);
    case 'gte':
      return typeof actual === 'number' && actual >= Number(cond.value);
    case 'lt':
      return typeof actual === 'number' && actual < Number(cond.value);
    default:
      return false;
  }
}

export function isActionAlreadyApplied(plan: Programmazione, action: RuleAction): boolean {
  const val = action.valueText.trim();
  switch (action.targetSection) {
    case 'interventi.potenziamento':
      return plan.interventi.potenziamento.includes(val);
    case 'interventi.consolidamento':
      return plan.interventi.consolidamento.includes(val);
    case 'interventi.recupero':
      return plan.interventi.recupero.includes(val);
    case 'interventi.besInterventiProgrammati':
      return plan.interventi.besInterventiProgrammati.includes(val);
    case 'metodiStrumenti.metodi':
      return plan.metodiStrumenti.metodi.includes(val);
    case 'metodiStrumenti.mezziEStrumenti':
      return plan.metodiStrumenti.mezziEStrumenti.includes(val);
    case 'verificheValutazione.verificheScritte':
      return plan.verificheValutazione.verificheScritte.includes(val);
    case 'verificheValutazione.verificheOrali':
      return plan.verificheValutazione.verificheOrali.includes(val);
    case 'verificheValutazione.criteriValutazione':
      return plan.verificheValutazione.criteriValutazione.includes(val);
    case 'curricolo.competenzeDigitali':
      return plan.curricolo.competenzeDigitali.includes(val);
    case 'curricolo.attivitaProgrammate':
      return plan.curricolo.attivitaProgrammate.includes(val);
    default:
      return false;
  }
}

export function evaluateSuggestionRules(
  plan: Programmazione,
  rules: SuggestionRule[],
  dismissedIds: Set<string> = new Set()
): SuggestionProposal[] {
  const proposals: SuggestionProposal[] = [];

  const activeRules = [...rules]
    .filter((r) => r.attiva)
    .sort((a, b) => a.priorita - b.priorita);

  for (const rule of activeRules) {
    if (!rule.condizioni.length) continue;

    const matched =
      rule.matchMode === 'all'
        ? rule.condizioni.every((c) => evaluateCondition(plan, c))
        : rule.condizioni.some((c) => evaluateCondition(plan, c));

    if (!matched) continue;

    for (const action of rule.azioni) {
      const proposalId = `${rule.id}::${action.id}`;
      if (dismissedIds.has(proposalId)) continue;
      if (isActionAlreadyApplied(plan, action)) continue;

      proposals.push({
        proposalId,
        ruleId: rule.id,
        ruleName: rule.nome,
        rationale: rule.descrizione,
        action,
      });
    }
  }

  return proposals;
}

function appendUnique(list: string[], value: string): string[] {
  return list.includes(value) ? list : [...list, value];
}

function appendParagraph(existing: string, addition: string): string {
  const cleanExisting = existing.trim();
  if (!cleanExisting) return addition;
  if (cleanExisting.includes(addition)) return existing;
  return `${cleanExisting}\n\n${addition}`;
}

export function applySuggestionAction(
  plan: Programmazione,
  action: RuleAction,
  overrideText?: string
): Programmazione {
  const value = (overrideText ?? action.valueText).trim();
  if (!value) return plan;

  switch (action.targetSection) {
    case 'interventi.potenziamento':
      return {
        ...plan,
        interventi: {
          ...plan.interventi,
          potenziamento: appendUnique(plan.interventi.potenziamento, value),
        },
      };
    case 'interventi.consolidamento':
      return {
        ...plan,
        interventi: {
          ...plan.interventi,
          consolidamento: appendUnique(plan.interventi.consolidamento, value),
        },
      };
    case 'interventi.recupero':
      return {
        ...plan,
        interventi: {
          ...plan.interventi,
          recupero: appendUnique(plan.interventi.recupero, value),
        },
      };
    case 'interventi.besInterventiProgrammati':
      return {
        ...plan,
        interventi: {
          ...plan.interventi,
          besInterventiProgrammati: appendParagraph(plan.interventi.besInterventiProgrammati, value),
        },
      };
    case 'metodiStrumenti.metodi':
      return {
        ...plan,
        metodiStrumenti: {
          ...plan.metodiStrumenti,
          metodi: appendUnique(plan.metodiStrumenti.metodi, value),
        },
      };
    case 'metodiStrumenti.mezziEStrumenti':
      return {
        ...plan,
        metodiStrumenti: {
          ...plan.metodiStrumenti,
          mezziEStrumenti: appendUnique(plan.metodiStrumenti.mezziEStrumenti, value),
        },
      };
    case 'verificheValutazione.verificheScritte':
      return {
        ...plan,
        verificheValutazione: {
          ...plan.verificheValutazione,
          verificheScritte: appendUnique(plan.verificheValutazione.verificheScritte, value),
        },
      };
    case 'verificheValutazione.verificheOrali':
      return {
        ...plan,
        verificheValutazione: {
          ...plan.verificheValutazione,
          verificheOrali: appendUnique(plan.verificheValutazione.verificheOrali, value),
        },
      };
    case 'verificheValutazione.criteriValutazione':
      return {
        ...plan,
        verificheValutazione: {
          ...plan.verificheValutazione,
          criteriValutazione: appendParagraph(plan.verificheValutazione.criteriValutazione, value),
        },
      };
    case 'curricolo.competenzeDigitali':
      return {
        ...plan,
        curricolo: {
          ...plan.curricolo,
          competenzeDigitali: appendUnique(plan.curricolo.competenzeDigitali, value),
        },
      };
    case 'curricolo.attivitaProgrammate':
      return {
        ...plan,
        curricolo: {
          ...plan.curricolo,
          attivitaProgrammate: appendParagraph(plan.curricolo.attivitaProgrammate, value),
        },
      };
    default:
      return plan;
  }
}
