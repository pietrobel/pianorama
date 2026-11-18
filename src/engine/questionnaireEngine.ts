import type {
  ClassQuestionnaire,
  Programmazione,
  QuestionnaireIndicatorKey,
} from '../domain/types';

export interface QuestionnaireOption {
  label: string;
  syntheticPhrase: string;
  completePhrase: string;
}

export interface QuestionnaireIndicatorSpec {
  key: QuestionnaireIndicatorKey;
  area: 'Area cognitiva' | 'Metodo e autonomia' | 'Comportamento e clima';
  title: string;
  prompt: string;
  options: QuestionnaireOption[];
}

export const QUESTIONNAIRE_INDICATORS: QuestionnaireIndicatorSpec[] = [
  {
    key: 'comprensione',
    area: 'Area cognitiva',
    title: '1. Comprensione delle consegne e dei concetti',
    prompt: 'Indicatore distinto — capacità di decodificare consegne scritte/orali e concetti:',
    options: [
      {
        label: 'Immediata e sicura anche su consegne articolate',
        syntheticPhrase: 'la comprensione di consegne e concetti è pronta e sicura',
        completePhrase:
          'Per quanto riguarda la comprensione, la classe decodifica con prontezza e sicurezza sia le consegne operative sia i concetti disciplinari fondamentali.',
      },
      {
        label: 'Adeguata per consegne semplici, guidata per testi complessi',
        syntheticPhrase: 'la comprensione è adeguata sulle consegne semplici e guidata su quelle complesse',
        completePhrase:
          'La comprensione delle consegne e dei concetti risulta adeguata di fronte a richieste essenziali, mentre richiede la mediazione del docente davanti a testi o consegne più articolati.',
      },
      {
        label: 'Faticosa / necessita di semplificazione e spiegazioni ripetute',
        syntheticPhrase: 'la comprensione necessita di semplificazione e chiarimenti guidati',
        completePhrase:
          'Sul piano della comprensione, una parte del gruppo incontra difficoltà nell’interpretare autonomamente le consegne e i concetti chiave, rendendo necessario l’uso di riformulazioni ed esempi guidati.',
      },
    ],
  },
  {
    key: 'memorizzazione',
    area: 'Area cognitiva',
    title: '2. Memorizzazione di informazioni, regole e procedure',
    prompt: 'Indicatore distinto — tenuta mnemonica di termini, regole e sequenze operative:',
    options: [
      {
        label: 'Stabile e duratura nel tempo',
        syntheticPhrase: 'la memorizzazione di regole e procedure è stabile',
        completePhrase:
          'La memorizzazione di informazioni, regole e procedure appare complessivamente stabile e ben consolidata nel medio periodo.',
      },
      {
        label: 'Discontinua, sostenuta da schemi e ripassi frequenti',
        syntheticPhrase: 'la memorizzazione è discontinua e si giova di schemi e ripassi',
        completePhrase:
          'La memorizzazione di regole, lessico specifico e procedure risulta selettiva o discontinua, migliorando sensibilmente quando supportata da schemi visivi e richiami periodici.',
      },
      {
        label: 'Labile o meccanica senza adeguata rielaborazione',
        syntheticPhrase: 'la memorizzazione appare fragile e necessita di rinforzo costante',
        completePhrase:
          'La tenuta mnemonica delle informazioni e delle procedure disciplinari si presenta fragile e talvolta meccanica, richiedendo esercitazioni ricorsive e strumenti compensativi.',
      },
    ],
  },
  {
    key: 'capacitaApprendimento',
    area: 'Area cognitiva',
    title: '3. Capacità di apprendimento e acquisizione di nuove conoscenze',
    prompt: 'Indicatore distinto — ritmo e flessibilità nell’acquisire nuovi contenuti:',
    options: [
      {
        label: 'Rapida, flessibile e recettiva verso nuovi argomenti',
        syntheticPhrase: 'la capacità di apprendimento di nuovi contenuti è rapida e recettiva',
        completePhrase:
          'La capacità di apprendimento e di acquisizione di nuove conoscenze si manifesta vivace, rapida e recettiva rispetto alle sollecitazioni proposte in classe.',
      },
      {
        label: 'Regolare con tempi di assimilazione adeguati alla media',
        syntheticPhrase: 'la capacità di apprendimento segue ritmi regolari',
        completePhrase:
          'L’acquisizione di nuove conoscenze avviene con ritmi regolari, purché i nuovi contenuti siano introdotti in modo graduale e collegati a quanto già noto.',
      },
      {
        label: 'Lenta o bisognosa di tempi distesi e scomposizione dei passaggi',
        syntheticPhrase: 'l’acquisizione di nuove conoscenze richiede tempi distesi e gradualità',
        completePhrase:
          'La capacità di acquisire nuove conoscenze richiede tempi più distesi, una scomposizione dei passaggi didattici in unità brevi e frequenti verifiche formative.',
      },
    ],
  },
  {
    key: 'applicazioneConoscenze',
    area: 'Area cognitiva',
    title: '4. Applicazione delle conoscenze in situazioni note e nuove',
    prompt: 'Capacità di trasferire regole e concetti negli esercizi e in contesti inediti:',
    options: [
      {
        label: 'Efficace sia in compiti noti sia in situazioni nuove',
        syntheticPhrase: 'applica le conoscenze anche in contesti nuovi',
        completePhrase:
          'Gli alunni sanno applicare le conoscenze acquisite con sicurezza negli esercizi noti e riescono a trasferirle anche in situazioni nuove.',
      },
      {
        label: 'Corretta in compiti noti, incerta in situazioni nuove',
        syntheticPhrase: 'applica correttamente le conoscenze in esercizi noti, con incertezze nei compiti nuovi',
        completePhrase:
          'L’applicazione delle conoscenze risulta sufficientemente corretta in contesti già sperimentati, mentre emergono incertezze quando occorre adattare le procedure a situazioni nuove.',
      },
      {
        label: 'Possibile solo con guida costante e modelli esemplificati',
        syntheticPhrase: 'necessita di guida nell’applicazione delle conoscenze',
        completePhrase:
          'L’applicazione pratica delle regole e dei contenuti appresi richiede ancora modelli esemplificati e la guida diretta dell’insegnante.',
      },
    ],
  },
  {
    key: 'collegamentoAnalisiSintesi',
    area: 'Area cognitiva',
    title: '5. Capacità di collegamento, analisi e sintesi',
    prompt: 'Rielaborazione personale, nessi logici e individuazione dei nuclei essenziali:',
    options: [
      {
        label: 'Buona padronanza di analisi, sintesi e collegamenti interdisciplinari',
        syntheticPhrase: 'mostra buone capacità di analisi, sintesi e collegamento',
        completePhrase:
          'Una buona parte del gruppo evidenzia capacità di analizzare informazioni, sintetizzare i concetti principali e operare collegamenti pertinenti.',
      },
      {
        label: 'Capacità di analisi essenziali, sintesi ancora guidata',
        syntheticPhrase: 'sviluppa analisi essenziali e sintesi guidate',
        completePhrase:
          'Le capacità di collegamento, analisi e sintesi risultano in via di maturazione e necessitano di domande-guida o mappe strutturate per individuare i nessi logici.',
      },
      {
        label: 'Difficoltà nel selezionare informazioni rilevanti e sintetizzare',
        syntheticPhrase: 'incontra difficoltà nell’analisi e nella sintesi autonoma',
        completePhrase:
          'Si riscontrano difficoltà nella selezione delle informazioni essenziali, nella sintesi personale e nell’individuazione dei collegamenti tra argomenti diversi.',
      },
    ],
  },
  {
    key: 'esposizioneProduzione',
    area: 'Area cognitiva',
    title: '6. Esposizione orale e produzione scritta',
    prompt: 'Padronanza espressiva, lessico disciplinare e organizzazione del discorso:',
    options: [
      {
        label: 'Chiara, corretta e dotata di lessico disciplinare adeguato',
        syntheticPhrase: 'l’esposizione orale e scritta è chiara e appropriata',
        completePhrase:
          'L’esposizione orale e la produzione scritta risultano complessivamente chiare, corrette e progressivamente arricchite dal lessico specifico della disciplina.',
      },
      {
        label: 'Comprensibile ma essenziale, con lessico ancora semplice',
        syntheticPhrase: 'l’esposizione è comprensibile ma essenziale nel lessico',
        completePhrase:
          'La produzione scritta e l’esposizione orale appaiono comprensibili nei contenuti essenziali, ma presentano ancora un lessico generico e incertezze formali.',
      },
      {
        label: 'Frammentaria o bisognosa di tracce e sollecitazioni',
        syntheticPhrase: 'l’espressione orale e scritta richiede tracce e supporto guidato',
        completePhrase:
          'Sia l’esposizione orale sia la produzione scritta risultano spesso frammentarie o scarne, rendendo opportuno l’uso di scalette e domande stimolo.',
      },
    ],
  },
  {
    key: 'risoluzioneProblemi',
    area: 'Area cognitiva',
    title: '7. Risoluzione dei problemi',
    prompt: 'Approccio a situazioni problematiche, formulazione di ipotesi e verifica:',
    options: [
      {
        label: 'Imposta strategie risolutive autonome e verifica i risultati',
        syntheticPhrase: 'affronta i problemi con strategie autonome',
        completePhrase:
          'Nella risoluzione dei problemi la classe mostra buone capacità di analizzare i dati, individuare strategie coerenti e controllare l’attendibilità del risultato.',
      },
      {
        label: 'Risolve problemi standard se guidata nell’impostazione iniziale',
        syntheticPhrase: 'risolve problemi standard con avvio guidato',
        completePhrase:
          'Di fronte a situazioni problematiche, molti alunni riescono a procedere correttamente in compiti standard una volta supportati nell’impostazione iniziale.',
      },
      {
        label: 'Tende a procedere per tentativi casuali senza pianificazione',
        syntheticPhrase: 'necessita di forte guida nella pianificazione dei problemi',
        completePhrase:
          'Nella risoluzione dei problemi prevale talvolta un approccio impulsivo o per tentativi non pianificati, che richiede l’insegnamento esplicito di procedure per fasi.',
      },
    ],
  },
  {
    key: 'attenzioneConcentrazione',
    area: 'Metodo e autonomia',
    title: '8. Attenzione e concentrazione',
    prompt: 'Tenuta attentiva durante spiegazioni e attività individuali:',
    options: [
      {
        label: 'Costante e sostenuta per l’intera lezione',
        syntheticPhrase: 'mantiene attenzione e concentrazione costanti',
        completePhrase:
          'I tempi di attenzione e concentrazione durante le spiegazioni e le attività in aula si mantengono generalmente costanti e adeguati all’età.',
      },
      {
        label: 'Adeguata se stimolata con attività varie e brevi',
        syntheticPhrase: 'mantiene l’attenzione se sostenuta da attività variate',
        completePhrase:
          'L’attenzione risulta adeguata nelle fasi operative e interattive, mentre tende a calare nelle spiegazioni frontali prolungate.',
      },
      {
        label: 'Discontinua e facilmente soggetta a distrazioni',
        syntheticPhrase: 'presenta tempi di attenzione brevi e discontinui',
        completePhrase:
          'La tenuta attentiva e la concentrazione appaiono spesso brevi e discontinue, con frequenti cadute che richiedono richiami frequenti e alternanza di attività.',
      },
    ],
  },
  {
    key: 'interesseMotivazione',
    area: 'Metodo e autonomia',
    title: '9. Interesse e motivazione',
    prompt: 'Coinvolgimento e curiosità verso la disciplina:',
    options: [
      {
        label: 'Spiccati e curiosi verso le proposte disciplinari',
        syntheticPhrase: 'mostra vivo interesse e motivazione',
        completePhrase:
          'La classe dimostra buon interesse e motivazione verso la disciplina, accogliendo con curiosità gli approfondimenti e le attività laboratoriali.',
      },
      {
        label: 'Selettivi, legati soprattutto ad attività pratiche o concrete',
        syntheticPhrase: 'mostra interesse selettivo, soprattutto per attività concrete',
        completePhrase:
          'L’interesse e la motivazione allo studio si attivano soprattutto in presenza di compiti pratici, esempi vicini all’esperienza e strumenti multimediali.',
      },
      {
        label: 'Deboli o bisognosi di continue sollecitazioni esterne',
        syntheticPhrase: 'manifesta motivazione ancora debole verso lo studio',
        completePhrase:
          'La motivazione intrinseca verso la disciplina risulta ancora fragile in una fascia significativa di alunni e richiede stimoli costanti e obiettivi accessibili.',
      },
    ],
  },
  {
    key: 'partecipazioneInterventi',
    area: 'Metodo e autonomia',
    title: '10. Partecipazione e interventi',
    prompt: 'Modalità di intervento nel dialogo educativo:',
    options: [
      {
        label: 'Attiva, pertinente e rispettosa dei turni di parola',
        syntheticPhrase: 'partecipa in modo attivo e pertinente',
        completePhrase:
          'La partecipazione alle lezioni è attiva e costruttiva, con interventi generalmente pertinenti e rispettosi dei turni di parola.',
      },
      {
        label: 'Partecipazione vivace ma talvolta disordinata',
        syntheticPhrase: 'partecipa con vivacità ma in modo talvolta disordinato',
        completePhrase:
          'Diversi alunni partecipano con vivacità e slancio, ma è necessario regolare con costanza i turni di parola e la pertinenza degli interventi.',
      },
      {
        label: 'Passiva o concentrata solo su pochi alunni',
        syntheticPhrase: 'la partecipazione spontanea è limitata a un gruppo ristretto',
        completePhrase:
          'La partecipazione spontanea resta concentrata su pochi alunni, mentre la maggioranza del gruppo tende a intervenire solo se direttamente sollecitata.',
      },
    ],
  },
  {
    key: 'impegnoCostanza',
    area: 'Metodo e autonomia',
    title: '11. Impegno e costanza',
    prompt: 'Continuità nello sforzo scolastico durante il lavoro quotidiano:',
    options: [
      {
        label: 'Regolare e responsabile nella maggior parte del gruppo',
        syntheticPhrase: 'l’impegno è regolare e costante',
        completePhrase:
          'L’impegno e la costanza nello svolgimento delle attività proposte risultano regolari e responsabili per gran parte del gruppo classe.',
      },
      {
        label: 'Discontinuo, legato alla vicinanza delle verifiche',
        syntheticPhrase: 'l’impegno risulta altalenante nel tempo',
        completePhrase:
          'L’impegno appare nel complesso sufficiente ma discontinuo, con una maggiore attivazione soprattutto in prossimità delle verifiche.',
      },
      {
        label: 'Superficiale o carente in una parte consistente della classe',
        syntheticPhrase: 'l’impegno quotidiano necessita di monitoraggio frequente',
        completePhrase:
          'Una quota non trascurabile della classe fatica a mantenere un impegno costante nel lavoro quotidiano, rendendo utile un monitoraggio sistematico.',
      },
    ],
  },
  {
    key: 'compitiDomestici',
    area: 'Metodo e autonomia',
    title: '12. Svolgimento dei compiti domestici',
    prompt: 'Puntualità e accuratezza nelle consegne assegnate per casa:',
    options: [
      {
        label: 'Puntuale e accurato',
        syntheticPhrase: 'svolge con puntualità i compiti domestici',
        completePhrase:
          'Lo svolgimento dei compiti assegnati per casa risulta generalmente puntuale, ordinato e completo.',
      },
      {
        label: 'Abbastanza regolare ma talvolta frettoloso',
        syntheticPhrase: 'svolge i compiti domestici in modo abbastanza regolare ma talvolta frettoloso',
        completePhrase:
          'I compiti domestici vengono svolti con discreta regolarità dalla maggioranza degli alunni, sebbene in diversi casi in forma affrettata o poco approfondita.',
      },
      {
        label: 'Saltuario o frequentemente incompleto',
        syntheticPhrase: 'presenta irregolarità nello svolgimento dei compiti domestici',
        completePhrase:
          'Si osservano frequenti dimenticanze o svolgimenti parziali dei compiti domestici, con conseguente necessità di coinvolgimento delle famiglie e controllo sistematico.',
      },
    ],
  },
  {
    key: 'autonomiaOperativa',
    area: 'Metodo e autonomia',
    title: '13. Autonomia operativa',
    prompt: 'Capacità di avviare e portare a termine una consegna senza aiuto continuo:',
    options: [
      {
        label: 'Buona autonomia nell’avvio e nella gestione delle consegne',
        syntheticPhrase: 'opera con buona autonomia nelle attività assegnate',
        completePhrase:
          'La maggior parte degli alunni affronta le consegne in classe con buona autonomia operativa e capacità di autocorrezione.',
      },
      {
        label: 'Autonomia parziale, necessita di conferme frequenti',
        syntheticPhrase: 'mostra autonomia operativa parziale',
        completePhrase:
          'L’autonomia operativa è in fase di consolidamento: diversi alunni necessitano di rassicurazioni e indicazioni passo-passo prima di avviare il lavoro.',
      },
      {
        label: 'Dipendenza marcata dalla guida dell’adulto o dei pari',
        syntheticPhrase: 'richiede supporto costante per l’autonomia operativa',
        completePhrase:
          'L’autonomia operativa risulta ancora ridotta e richiede la presenza strutturata del docente o attività di tutoraggio tra pari.',
      },
    ],
  },
  {
    key: 'organizzazioneLavoro',
    area: 'Metodo e autonomia',
    title: '14. Organizzazione del lavoro e del materiale',
    prompt: 'Cura di quaderni, libri, strumenti, diario e rispetto dei tempi:',
    options: [
      {
        label: 'Ordinata e provvista del materiale necessario',
        syntheticPhrase: 'cura in modo ordinato materiale e tempi di lavoro',
        completePhrase:
          'Gli alunni si presentano generalmente provvisti del materiale occorrente e gestiscono con ordine quaderni, appunti e tempi di consegna.',
      },
      {
        label: 'Discreta ma da richiamare sull’ordine e sulla puntualità',
        syntheticPhrase: 'mostra un’organizzazione discreta ma migliorabile',
        completePhrase:
          'L’organizzazione del lavoro e del materiale è nel complesso accettabile, pur richiedendo periodici richiami alla cura degli appunti e al corredo scolastico.',
      },
      {
        label: 'Disorganizzata, con frequenti dimenticanze di materiale',
        syntheticPhrase: 'evidenzia carenze nell’organizzazione del materiale e dei tempi',
        completePhrase:
          'Si rilevano ricorrenti difficoltà nell’organizzazione del materiale scolastico, nella tenuta ordinata dei quaderni e nella gestione dei tempi di lavoro.',
      },
    ],
  },
  {
    key: 'metodoStudio',
    area: 'Metodo e autonomia',
    title: '15. Metodo di studio',
    prompt: 'Strategie di studio autonomo, schemi, parole chiave e rielaborazione:',
    options: [
      {
        label: 'Efficace e personale nella rielaborazione dei contenuti',
        syntheticPhrase: 'possiede un metodo di studio efficace',
        completePhrase:
          'La classe dimostra di aver già avviato un metodo di studio efficace, basato su individuazione dei concetti chiave e rielaborazione personale.',
      },
      {
        label: 'In via di costruzione, spesso ancora mnemonico o passivo',
        syntheticPhrase: 'il metodo di studio è in via di costruzione',
        completePhrase:
          'Il metodo di studio è ancora in fase di strutturazione e tende spesso a basarsi sulla lettura ripetuta piuttosto che sulla schematizzazione attiva.',
      },
      {
        label: 'Carente / assenza di strategie di organizzazione dello studio',
        syntheticPhrase: 'necessita di acquisire un metodo di studio strutturato',
        completePhrase:
          'Un numero consistente di alunni non possiede ancora un metodo di studio organico e necessita di interventi mirati su sottolineatura, mappe e pianificazione.',
      },
    ],
  },
  {
    key: 'relazioniCollaborazione',
    area: 'Comportamento e clima',
    title: '16. Relazioni interpersonali e collaborazione',
    prompt: 'Dinamiche relazionali tra pari e disponibilità al lavoro cooperativo:',
    options: [
      {
        label: 'Positive, inclusive e collaborative',
        syntheticPhrase: 'le relazioni tra pari sono positive e collaborative',
        completePhrase:
          'Le relazioni interpersonali all’interno del gruppo sono serene, rispettose e favorevoli alla collaborazione e all’aiuto reciproco.',
      },
      {
        label: 'Corrette nel complesso, ma con piccoli sottogruppi chiusi',
        syntheticPhrase: 'le relazioni sono corrette ma articolate in sottogruppi',
        completePhrase:
          'Il clima relazionale è nel complesso corretto, sebbene si notino piccoli sottogruppi che richiedono attività cooperative a composizione variabile.',
      },
      {
        label: 'Conflittuali o competitive, da guidare nel lavoro di gruppo',
        syntheticPhrase: 'le dinamiche relazionali richiedono mediazione educativa',
        completePhrase:
          'Tra alcuni alunni emergono tensioni o difficoltà di cooperazione, rendendo necessari momenti strutturati di educazione al dialogo e regole condivise nei lavori di gruppo.',
      },
    ],
  },
  {
    key: 'rispettoRegoleClima',
    area: 'Comportamento e clima',
    title: '17. Rispetto delle regole e clima della classe',
    prompt: 'Osservanza delle norme di convivenza e serenità dell’ambiente di apprendimento:',
    options: [
      {
        label: 'Clima sereno e rispetto costante delle regole scolastiche',
        syntheticPhrase: 'il clima di classe è sereno e rispettoso delle regole',
        completePhrase:
          'Il rispetto delle regole di convivenza scolastica è costante e garantisce un clima di lavoro ordinato e costruttivo.',
      },
      {
        label: 'Clima vivace ma generalmente rispettoso dopo richiamo',
        syntheticPhrase: 'il clima è vivace ma gestibile attraverso richiami costruttivi',
        completePhrase:
          'Il clima della classe è vivace e talora esuberante, ma gli alunni rispondono positivamente alle indicazioni educative e al patto di corresponsabilità.',
      },
      {
        label: 'Frequenti infrazioni delle regole che disturbano il lavoro comune',
        syntheticPhrase: 'il rispetto delle regole richiede un presidio educativo costante',
        completePhrase:
          'Si registrano frequenti episodi di inosservanza delle regole di comportamento che rallentano lo svolgimento delle lezioni e richiedono un presidio educativo fermo e coerente.',
      },
    ],
  },
];

export function createEmptyQuestionnaire(): ClassQuestionnaire {
  return {
    risposte: {},
    modalitaGenerazione: 'completa',
    ultimoAggiornamento: null,
  };
}

function hashPlanSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const COMPOSITION_INTRO_VARIANTS: ((
  classeLabel: string,
  alunni: number,
  maschi: number,
  femmine: number,
  suffix: string
) => string)[] = [
  (c, a, m, f, s) =>
    `La classe ${c} è composta complessivamente da ${a} alunni (${m} maschi e ${f} femmine)${s}.`,
  (c, a, m, f, s) =>
    `Il gruppo classe della ${c} conta ${a} alunni (${m} maschi e ${f} femmine)${s}.`,
  (c, a, m, f, s) =>
    `La sezione ${c} risulta formata da ${a} alunni (${m} maschi e ${f} femmine)${s}.`,
  (c, a, m, f, s) =>
    `Nella classe ${c} sono iscritti ${a} alunni (${m} maschi e ${f} femmine)${s}.`,
  (c, a, m, f, s) =>
    `La ${c} si compone di ${a} alunni (${m} maschi e ${f} femmine)${s}.`,
  (c, a, m, f, s) =>
    `L’assetto della classe ${c} comprende ${a} alunni (${m} maschi e ${f} femmine)${s}.`,
  (c, a, m, f, s) =>
    `Il gruppo della ${c} è costituito da ${a} alunni (${m} maschi e ${f} femmine)${s}.`,
  (c, a, m, f, s) =>
    `La classe ${c} accoglie ${a} alunni (${m} maschi e ${f} femmine)${s}.`,
  (c, a, m, f, s) =>
    `Fanno parte della classe ${c} ${a} alunni (${m} maschi e ${f} femmine)${s}.`,
  (c, a, m, f, s) =>
    `Il percorso didattico della ${c} coinvolge ${a} alunni (${m} maschi e ${f} femmine)${s}.`,
];

const COMPOSITION_SUFFIX_CONNECTORS = [
  ', tra cui ',
  ', con la presenza di ',
  ', includendo ',
  ', con ',
];

const SYNTHETIC_CLAUSE_CONNECTORS = [
  '; inoltre, ',
  ', mentre ',
  '; al contempo, ',
  '. Sul piano operativo, ',
  '; per quanto attiene al percorso, ',
  '; parallelamente, ',
  '. Nel complesso, ',
];

const DISCIPLINE_LEADS = [
  (d: string) => (d ? `In relazione a ${d}, ` : 'Sul piano disciplinare, '),
  (d: string) => (d ? `Per quanto riguarda ${d}, ` : 'Nell’ambito della disciplina, '),
  (d: string) => (d ? `Nell’insegnamento di ${d}, ` : 'Sul piano delle attività d’aula, '),
  (d: string) => (d ? `Sotto il profilo specifico di ${d}, ` : 'Sotto il profilo didattico, '),
  (d: string) => (d ? `Osservando l’andamento in ${d}, ` : 'Osservando il quadro iniziale, '),
  (d: string) => (d ? `Dalle rilevazioni svolte per ${d}, emerge che ` : 'Dalle rilevazioni iniziali emerge che '),
  (d: string) => (d ? `Nello studio di ${d}, ` : 'Nel lavoro scolastico quotidiano, '),
  (d: string) => (d ? `Con riferimento al percorso di ${d}, ` : 'Con riferimento al percorso formativo, '),
  (d: string) => (d ? `Sul versante di ${d}, ` : 'Sul versante metodologico e cognitivo, '),
  (d: string) => (d ? `Analizzando la situazione di partenza in ${d}, ` : 'Analizzando il profilo della classe, '),
];

const AREA_TRANSITION_PREFIXES: Record<QuestionnaireIndicatorSpec['area'], string[]> = {
  'Area cognitiva': [
    '',
    'Sul piano cognitivo, ',
    'Per quanto attiene ai processi di apprendimento, ',
    'Sotto il profilo delle competenze cognitive, ',
    'Analizzando le modalità di elaborazione dei contenuti, ',
    'Nel dettaglio degli indicatori cognitivi, ',
    'Passando alla sfera cognitiva ed espressiva, ',
    'Sul versante dell’apprendimento disciplinare, ',
    'Osservando le capacità logiche, mnestiche ed espressive, ',
    'Riguardo alla risposta cognitiva del gruppo, ',
  ],
  'Metodo e autonomia': [
    '',
    'Sul fronte del metodo di studio e dell’autonomia, ',
    'Per quanto riguarda l’organizzazione del lavoro, ',
    'Osservando l’atteggiamento e la continuità nell’impegno, ',
    'Relativamente all’autonomia operativa e alla partecipazione, ',
    'Nel lavoro d’aula e domestico, ',
    'Sul piano delle abitudini scolastiche e metodologiche, ',
    'Considerando motivazione, attenzione e metodo di lavoro, ',
    'Sotto il profilo dell’autonomia e della partecipazione, ',
    'In merito alle strategie organizzative personali, ',
  ],
  'Comportamento e clima': [
    '',
    'Sul piano relazionale e comportamentale, ',
    'Per ciò che concerne il clima d’aula, ',
    'Guardando alle dinamiche interpersonali, ',
    'Sotto il profilo della convivenza scolastica, ',
    'Nel contesto delle relazioni tra pari e con i docenti, ',
    'Analizzando comportamento e spirito collaborativo, ',
    'Quanto all’osservanza delle regole e al clima del gruppo, ',
    'Sul versante socio-relazionale, ',
    'In riferimento all’ambiente educativo di classe, ',
  ],
};

const HETEROGENEA_COMPLETE_VARIANTS = [
  (note: string) =>
    note
      ? `Si segnala tuttavia una situazione eterogenea nel gruppo: ${note}.`
      : 'Si evidenzia inoltre una distribuzione eterogenea all’interno del gruppo classe.',
  (note: string) =>
    note
      ? `Non mancano tuttavia marcate differenze tra sottogruppi: ${note}.`
      : 'All’interno della classe coesistono peraltro ritmi e livelli differenti.',
  (note: string) =>
    note
      ? `Il quadro interno risulta comunque differenziato, in quanto ${note}.`
      : 'Va tuttavia rilevata una certa disomogeneità tra gli alunni.',
  (note: string) =>
    note
      ? `Accanto al dato prevalente si osservano profili diversificati: ${note}.`
      : 'Sono comunque presenti profili diversificati che richiedono attenzione mirata.',
  (note: string) =>
    note
      ? `Permane tuttavia una sensibile eterogeneità interna (${note}).`
      : 'Si rileva inoltre un andamento non uniforme tra le diverse fasce della classe.',
];

const HETEROGENEA_SYNTHETIC_TAGS = [
  'con situazioni eterogenee',
  'pur con differenze interne tra sottogruppi',
  'con andamenti diversificati nella classe',
  'in un quadro comunque non uniforme',
  'con una sensibile eterogeneità interna',
];

const SENTENCE_OPENING_VARIATIONS: [RegExp, string[]][] = [
  [
    /^La comprensione\b/,
    [
      'La comprensione',
      'La decodifica e comprensione',
      'La capacità di comprensione',
      'L’interpretazione e comprensione',
      'Sul piano della comprensione, la padronanza',
    ],
  ],
  [
    /^La memorizzazione\b/,
    [
      'La memorizzazione',
      'La capacità di memorizzazione',
      'Il consolidamento e la memorizzazione',
      'La tenuta nella memorizzazione',
      'La memorizzazione stabile',
    ],
  ],
  [
    /^La capacità di apprendimento\b/,
    [
      'La capacità di apprendimento',
      'L’attitudine all’apprendimento',
      'La prontezza di apprendimento',
      'La capacità di apprendimento progressivo',
    ],
  ],
  [
    /^Gli alunni\b/,
    [
      'Gli alunni',
      'I componenti del gruppo classe',
      'Gli studenti della classe',
      'In maggioranza gli alunni',
      'Complessivamente gli alunni',
    ],
  ],
  [
    /^La classe\b/,
    [
      'La classe',
      'Il gruppo classe',
      'L’insieme della classe',
      'La sezione',
      'Il collettivo della classe',
    ],
  ],
  [
    /^Il gruppo classe\b/,
    [
      'Il gruppo classe',
      'La classe nel suo complesso',
      'L’insieme degli alunni',
      'La sezione',
    ],
  ],
  [
    /^L’impegno\b/,
    [
      'L’impegno',
      'La dedizione allo studio',
      'L’applicazione quotidiana',
      'La continuità dell’impegno',
    ],
  ],
  [
    /^La partecipazione\b/,
    [
      'La partecipazione',
      'Il coinvolgimento nel dialogo educativo',
      'La presenza attiva e la partecipazione',
      'L’apporto partecipativo',
    ],
  ],
];

function stylizeCompleteSentence(base: string, variantSeed: number, itemIndex: number): string {
  const trimmed = base.trim();
  if (!trimmed) return '';
  const rot = (variantSeed + itemIndex) % 10;
  for (const [pattern, replacements] of SENTENCE_OPENING_VARIATIONS) {
    if (pattern.test(trimmed)) {
      const replacement = replacements[rot % replacements.length];
      return trimmed.replace(pattern, replacement);
    }
  }
  return trimmed;
}

function stylizeSyntheticClause(base: string, variantSeed: number, itemIndex: number): string {
  const trimmed = base.trim();
  if (!trimmed) return '';
  const rot = (variantSeed + itemIndex) % 5;
  if (rot === 1 && trimmed.startsWith('la ')) return `si osserva che ${trimmed}`;
  if (rot === 2 && trimmed.startsWith('il ')) return `si rileva che ${trimmed}`;
  if (rot === 3 && trimmed.startsWith('i ')) return `emerge che ${trimmed}`;
  if (rot === 4 && !trimmed.startsWith('si ')) return `il gruppo ${trimmed.replace(/^mostra\b/, 'evidenzia')}`;
  return trimmed;
}

function applyAreaLead(
  sentence: string,
  area: QuestionnaireIndicatorSpec['area'],
  variantSeed: number,
  areaIdx: number
): string {
  const leads = AREA_TRANSITION_PREFIXES[area];
  const lead = leads[(variantSeed + areaIdx * 2) % leads.length];
  if (!lead) return sentence;
  const endsWithChe = /\bche\s*$/.test(lead);
  const lowerFirst = sentence.charAt(0).toLowerCase() + sentence.slice(1);
  if (endsWithChe) {
    return `${lead}${lowerFirst}`;
  }
  return `${lead}${lowerFirst}`;
}

export function buildClassCompositionIntro(
  plan: Programmazione,
  variantOverride?: number
): string {
  const { alunni, maschi, femmine, ripetenti, bes } = plan.composizione;
  const classeLabel = [plan.datiGenerali.classe, plan.datiGenerali.sezione]
    .filter(Boolean)
    .join(' ')
    .trim();
  const extraParts: string[] = [];
  if (ripetenti > 0) {
    extraParts.push(`${ripetenti} alunn${ripetenti === 1 ? 'o' : 'i'} ripetent${ripetenti === 1 ? 'e' : 'i'}`);
  }
  if (bes > 0) {
    extraParts.push(
      `${bes} alunn${bes === 1 ? 'o' : 'i'} con Bisogni Educativi Speciali (BES)`
    );
  }

  const rawVariant =
    typeof variantOverride === 'number'
      ? variantOverride
      : typeof plan.situazione.variantePresentazione === 'number'
      ? plan.situazione.variantePresentazione
      : hashPlanSeed(
          `${plan.id}|${plan.datiGenerali.classe}|${plan.datiGenerali.sezione}|${plan.datiGenerali.disciplina}`
        );
  const idx = ((Math.floor(rawVariant) % COMPOSITION_INTRO_VARIANTS.length) + COMPOSITION_INTRO_VARIANTS.length) %
    COMPOSITION_INTRO_VARIANTS.length;

  const suffixConn = COMPOSITION_SUFFIX_CONNECTORS[idx % COMPOSITION_SUFFIX_CONNECTORS.length];
  const suffix = extraParts.length > 0 ? `${suffixConn}${extraParts.join(' e ')}` : '';
  return COMPOSITION_INTRO_VARIANTS[idx](classeLabel, alunni, maschi, femmine, suffix).replace(
    /\s+/g,
    ' '
  );
}

export function generateClassDescription(
  plan: Programmazione,
  mode: 'sintetica' | 'completa',
  variantOverride?: number
): string {
  const q = plan.analisiPartenza.questionario;
  const compositionIntro = buildClassCompositionIntro(plan, variantOverride);
  if (!q) return compositionIntro;

  const rawSeed =
    typeof variantOverride === 'number'
      ? variantOverride
      : typeof plan.situazione.variantePresentazione === 'number'
      ? plan.situazione.variantePresentazione
      : hashPlanSeed(
          `${plan.id}|${plan.datiGenerali.classe}|${plan.datiGenerali.sezione}|${plan.datiGenerali.disciplina}`
        );
  const variantSeed = ((Math.floor(rawSeed) % 10) + 10) % 10;

  if (mode === 'sintetica') {
    const clauses: string[] = [];
    for (const [idx, spec] of QUESTIONNAIRE_INDICATORS.entries()) {
      const ans = q.risposte[spec.key];
      if (!ans) continue;
      const opt = spec.options.find((o) => o.label === ans.selectedOption);
      const customNote = ans.notaEterogenea.trim();
      if (!opt && !customNote) continue;

      let piece = opt ? stylizeSyntheticClause(opt.syntheticPhrase, variantSeed, idx) : '';
      if (ans.eterogenea) {
        const hetTag = HETEROGENEA_SYNTHETIC_TAGS[(variantSeed + idx) % HETEROGENEA_SYNTHETIC_TAGS.length];
        piece = piece
          ? `${piece} (${hetTag}${customNote ? `: ${customNote}` : ''})`
          : `situazione eterogenea riguardo a ${spec.title.replace(/^\d+\.\s*/, '').toLowerCase()}${customNote ? `: ${customNote}` : ''}`;
      } else if (customNote) {
        piece = piece ? `${piece} (${customNote})` : customNote;
      }
      if (piece) clauses.push(piece);
    }
    if (clauses.length === 0) return compositionIntro;

    let body = clauses[0].charAt(0).toLowerCase() + clauses[0].slice(1);
    for (let i = 1; i < clauses.length; i++) {
      const sep = SYNTHETIC_CLAUSE_CONNECTORS[(variantSeed + i - 1) % SYNTHETIC_CLAUSE_CONNECTORS.length];
      body += `${sep}${clauses[i]}`;
    }

    const disciplineLead = DISCIPLINE_LEADS[variantSeed % DISCIPLINE_LEADS.length](
      plan.datiGenerali.disciplina
    );
    return `${compositionIntro} ${disciplineLead}${body}.`;
  }

  // Modalità completa: raggruppata per area, escludendo rigorosamente le risposte non compilate
  const areasOrder: QuestionnaireIndicatorSpec['area'][] = [
    'Area cognitiva',
    'Metodo e autonomia',
    'Comportamento e clima',
  ];

  const areaParagraphs: string[] = [];
  for (const [areaIdx, area] of areasOrder.entries()) {
    const specs = QUESTIONNAIRE_INDICATORS.filter((s) => s.area === area);
    const sentences: string[] = [];

    for (const [itemIdx, spec] of specs.entries()) {
      const ans = q.risposte[spec.key];
      if (!ans) continue;
      const opt = spec.options.find((o) => o.label === ans.selectedOption);
      const customNote = ans.notaEterogenea.trim();
      if (!opt && !customNote) continue;

      let sentence = opt ? stylizeCompleteSentence(opt.completePhrase, variantSeed, itemIdx) : '';
      if (sentences.length === 0 && sentence) {
        sentence = applyAreaLead(sentence, area, variantSeed, areaIdx);
      }
      if (ans.eterogenea) {
        const hetBuilder =
          HETEROGENEA_COMPLETE_VARIANTS[(variantSeed + itemIdx) % HETEROGENEA_COMPLETE_VARIANTS.length];
        const eterText = hetBuilder(customNote);
        sentence = sentence ? `${sentence} ${eterText}` : eterText;
      } else if (customNote) {
        sentence = sentence ? `${sentence} Precisazione: ${customNote}.` : `${customNote}.`;
      }
      if (sentence) sentences.push(sentence);
    }

    if (sentences.length > 0) {
      areaParagraphs.push(sentences.join(' '));
    }
  }

  if (areaParagraphs.length === 0) return compositionIntro;
  return [compositionIntro, ...areaParagraphs].join('\n\n');
}
