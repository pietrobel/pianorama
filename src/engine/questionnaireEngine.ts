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
  area: 'Contesto' | 'Area cognitiva' | 'Metodo e autonomia' | 'Comportamento e clima' | 'Interventi';
  title: string;
  prompt: string;
  options: QuestionnaireOption[];
}

export const QUESTIONNAIRE_INDICATORS: QuestionnaireIndicatorSpec[] = [
  {
    key: 'composizioneContinuita',
    area: 'Contesto',
    title: '1. Composizione e continuità del gruppo',
    prompt: 'Composizione, stabilità o continuità didattica rispetto all’anno precedente:',
    options: [
      {
        label: 'Gruppo nuovo in formazione (classe prima / nuovi inserimenti)',
        syntheticPhrase: 'il gruppo classe è di nuova formazione con alcuni nuovi inserimenti',
        completePhrase:
          'Il gruppo classe si presenta di nuova formazione, con alunni provenienti da percorsi o sezioni differenti in fase di reciproca conoscenza.',
      },
      {
        label: 'Gruppo sostanzialmente stabile e continuo',
        syntheticPhrase: 'il gruppo classe mostra una composizione stabile e continua',
        completePhrase:
          'La composizione del gruppo classe risulta sostanzialmente stabile e continua rispetto al percorso scolastico precedente.',
      },
      {
        label: 'Gruppo con variazioni o inserimenti in corso di percorso',
        syntheticPhrase: 'il gruppo ha registrato alcune variazioni nella composizione',
        completePhrase:
          'Il gruppo classe ha registrato alcune variazioni e nuovi inserimenti rispetto alla composizione originaria, richiedendo attenzione all’integrazione.',
      },
    ],
  },
  {
    key: 'livelliDistribuzione',
    area: 'Contesto',
    title: '2. Livelli di partenza e distribuzione delle fasce di apprendimento',
    prompt: 'Distribuzione delle fasce di preparazione iniziale rilevate nella disciplina:',
    options: [
      {
        label: 'Prevalenza di livelli medio-alti e alti',
        syntheticPhrase: 'i livelli di partenza si attestano prevalentemente su fasce medio-alte',
        completePhrase:
          'Dalle rilevazioni iniziali emerge una preparazione di base complessivamente solida, con una prevalenza di alunni collocati nelle fasce media e alta.',
      },
      {
        label: 'Distribuzione equilibrata intorno al livello medio',
        syntheticPhrase: 'i livelli di partenza si distribuiscono intorno alla fascia media',
        completePhrase:
          'I livelli di partenza si distribuiscono in modo equilibrato intorno alla fascia intermedia, con un nucleo ristretto di alunni più fragili e un gruppo con buone potenzialità.',
      },
      {
        label: 'Distribuzione fortemente eterogenea tra fasce basse e alte',
        syntheticPhrase: 'i livelli iniziali risultano eterogenei tra le diverse fasce',
        completePhrase:
          'La distribuzione delle fasce di apprendimento risulta marcatamente eterogenea, richiedendo una modulazione differenziata delle proposte didattiche.',
      },
      {
        label: 'Prevalenza di livelli medio-bassi o fragili',
        syntheticPhrase: 'i livelli di partenza evidenziano diffuse fragilità di base',
        completePhrase:
          'Le rilevazioni iniziali evidenziano diffuse fragilità nei prerequisiti disciplinari, con un numero significativo di alunni collocati nelle fasce medio-bassa e bassa.',
      },
    ],
  },
  {
    key: 'comprensione',
    area: 'Area cognitiva',
    title: '3. Comprensione delle consegne e dei concetti',
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
    title: '4. Memorizzazione di informazioni, regole e procedure',
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
    title: '5. Capacità di apprendimento e acquisizione di nuove conoscenze',
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
    title: '6. Applicazione delle conoscenze in situazioni note e nuove',
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
    title: '7. Capacità di collegamento, analisi e sintesi',
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
    title: '8. Esposizione orale e produzione scritta',
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
    title: '9. Risoluzione dei problemi',
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
    title: '10. Attenzione e concentrazione',
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
    title: '11. Interesse e motivazione',
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
    title: '12. Partecipazione e interventi',
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
    title: '13. Impegno e costanza',
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
    title: '14. Svolgimento dei compiti domestici',
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
    title: '15. Autonomia operativa',
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
    title: '16. Organizzazione del lavoro e del materiale',
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
    title: '17. Metodo di studio',
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
    title: '18. Relazioni interpersonali e collaborazione',
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
    title: '19. Rispetto delle regole e clima della classe',
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
  {
    key: 'strategiePersonalizzazione',
    area: 'Interventi',
    title: '20. Strategie di recupero, consolidamento, potenziamento e personalizzazione',
    prompt: 'Orientamento operativo generale per la differenziazione didattica:',
    options: [
      {
        label: 'Potenziamento delle eccellenze e consolidamento diffuso',
        syntheticPhrase: 'si privilegiano azioni di potenziamento e consolidamento',
        completePhrase:
          'L’azione didattica si orienterà verso il potenziamento delle capacità critiche e di ricerca per la fascia alta, affiancato dal consolidamento metodologico per la fascia intermedia.',
      },
      {
        label: 'Equilibrio tra recupero dei prerequisiti, consolidamento e potenziamento',
        syntheticPhrase: 'si prevede un’azione equilibrata di recupero, consolidamento e potenziamento',
        completePhrase:
          'La progettazione prevederà percorsi flessibili per gruppi di livello, alternando recupero dei prerequisiti essenziali, consolidamento guidato e compiti di approfondimento.',
      },
      {
        label: 'Priorità a recupero, semplificazione e didattica inclusiva personalizzata',
        syntheticPhrase: 'si dà priorità al recupero guidato e alla personalizzazione inclusiva',
        completePhrase:
          'Verrà data priorità ad attività di recupero in itinere, didattica laboratoriale, uso di mediatori visivi e personalizzazione degli obiettivi in coerenza con PDP/PEI.',
      },
    ],
  },
  {
    key: 'puntiForzaCriticita',
    area: 'Interventi',
    title: '21. Punti di forza e criticità',
    prompt: 'Sintesi bilanciata delle risorse prevalenti e degli aspetti da presidiare:',
    options: [
      {
        label: 'Punti di forza: curiosità e collaborazione · Criticità: discontinuità nello studio',
        syntheticPhrase: 'tra i punti di forza emergono curiosità e collaborazione, a fronte di una lieve discontinuità nello studio',
        completePhrase:
          'Tra i principali punti di forza si segnalano la disponibilità al dialogo e la curiosità operativa; le criticità prioritarie riguardano la continuità dello studio domestico e la precisione formale.',
      },
      {
        label: 'Punti di forza: buon clima relazionale · Criticità: fragilità nei prerequisiti e nel metodo',
        syntheticPhrase: 'il clima relazionale positivo rappresenta una risorsa su cui innestare il recupero metodologico',
        completePhrase:
          'Il principale punto di forza risiede nella disponibilità relazionale del gruppo; le criticità su cui intervenire riguardano il possesso dei prerequisiti disciplinari e l’acquisizione di un metodo di lavoro autonomo.',
      },
      {
        label: 'Punti di forza: nucleo motivato e autonomo · Criticità: eterogeneità dei ritmi e tenuta attentiva',
        syntheticPhrase: 'un nucleo motivato traina la classe, mentre occorre gestire l’eterogeneità dei ritmi',
        completePhrase:
          'La presenza di un nucleo di alunni autonomi e partecipi costituisce una risorsa positiva; le criticità principali attengono alla gestione dell’eterogeneità dei ritmi di apprendimento e alla tenuta attentiva.',
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

export function buildClassCompositionIntro(plan: Programmazione): string {
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
  const suffix = extraParts.length > 0 ? `, con ${extraParts.join(' e ')}` : '';
  return `La classe ${classeLabel || ''} è composta complessivamente da ${alunni} alunni (${maschi} maschi e ${femmine} femmine)${suffix}.`.replace(
    /\s+/g,
    ' '
  );
}

export function generateClassDescription(
  plan: Programmazione,
  mode: 'sintetica' | 'completa'
): string {
  const q = plan.analisiPartenza.questionario;
  const compositionIntro = buildClassCompositionIntro(plan);
  if (!q) return compositionIntro;

  const headerPrefix = `${compositionIntro} Classe ${plan.datiGenerali.classe} ${plan.datiGenerali.sezione} · ${plan.datiGenerali.disciplina}`;

  if (mode === 'sintetica') {
    const clauses: string[] = [];
    for (const spec of QUESTIONNAIRE_INDICATORS) {
      const ans = q.risposte[spec.key];
      if (!ans) continue;
      const opt = spec.options.find((o) => o.label === ans.selectedOption);
      const customNote = ans.notaEterogenea.trim();
      if (!opt && !customNote) continue;

      let piece = opt ? opt.syntheticPhrase : '';
      if (ans.eterogenea) {
        piece = piece
          ? `${piece} (con situazioni eterogenee${customNote ? `: ${customNote}` : ''})`
          : `situazione eterogenea riguardo a ${spec.title.replace(/^\d+\.\s*/, '').toLowerCase()}${customNote ? `: ${customNote}` : ''}`;
      } else if (customNote) {
        piece = piece ? `${piece} (${customNote})` : customNote;
      }
      if (piece) clauses.push(piece);
    }
    if (clauses.length === 0) return compositionIntro;
    const joined = clauses
      .map((c, idx) => (idx === 0 ? c.charAt(0).toUpperCase() + c.slice(1) : c))
      .join('; ');
    return `${headerPrefix}: ${joined}.`;
  }

  // Modalità completa: raggruppata per area, escludendo rigorosamente le risposte non compilate
  const areasOrder: QuestionnaireIndicatorSpec['area'][] = [
    'Contesto',
    'Area cognitiva',
    'Metodo e autonomia',
    'Comportamento e clima',
    'Interventi',
  ];

  const areaParagraphs: string[] = [];
  for (const area of areasOrder) {
    const specs = QUESTIONNAIRE_INDICATORS.filter((s) => s.area === area);
    const sentences: string[] = [];

    for (const spec of specs) {
      const ans = q.risposte[spec.key];
      if (!ans) continue;
      const opt = spec.options.find((o) => o.label === ans.selectedOption);
      const customNote = ans.notaEterogenea.trim();
      if (!opt && !customNote) continue;

      let sentence = opt ? opt.completePhrase : '';
      if (ans.eterogenea) {
        const eterText = customNote
          ? `Si segnala tuttavia una situazione eterogenea nel gruppo: ${customNote}.`
          : 'Si evidenzia inoltre una distribuzione eterogenea all’interno del gruppo classe.';
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
