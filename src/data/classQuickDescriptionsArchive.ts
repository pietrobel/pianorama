import type {
  QuickClassModeKey,
  QuickEterogeneitaLevel,
  QuickLivelloGeneraleLevel,
  QuickMotivazioneLevel,
  QuickRegoleVivacitaLevel,
  QuickSocializzazioneLevel,
} from '../domain/types';

/**
 * Libreria offline completa delle descrizioni della classe per la Modalità Semplice.
 * Copre tutte le 243 combinazioni delle 5 domande chiuse:
 *   1. Livello di eterogeneità: omogenea | moderata | elevata
 *   2. Livello generale della classe: buono | medio | fragile
 *   3. Socializzazione: positiva | selettiva | difficile
 *   4. Rispetto delle regole / vivacità: ordinata | vivace | irrequieta
 *   5. Motivazione: attiva | selettiva | debole
 *
 * Ogni combinazione dispone di 3 descrizioni complete e stilisticamente distinte
 * (243 × 3 = 729 testi completi), pronte per integrare automaticamente i dati
 * su alunni con BES (PDP) e con disabilità (PEI).
 */

type CogKey = `${QuickEterogeneitaLevel}|${QuickLivelloGeneraleLevel}`;
type RelKey = `${QuickSocializzazioneLevel}|${QuickRegoleVivacitaLevel}`;
type MotKey = `${QuickLivelloGeneraleLevel}|${QuickMotivazioneLevel}`;

const COGNITIVE_PROFILES: Record<CogKey, readonly [string, string, string]> = {
  'omogenea|buono': [
    'Dal punto di vista cognitivo e didattico, la classe presenta un profilo sostanzialmente omogeneo e un livello generale buono: i prerequisiti di base risultano ben consolidati nella quasi totalità degli alunni, che dimostrano sicurezza nella comprensione delle consegne, adeguata padronanza espressiva e tempi di apprendimento regolari.',
    'Sotto il profilo degli apprendimenti, l’osservazione iniziale restituisce l’immagine di un gruppo uniforme e complessivamente ben preparato. La maggior parte degli studenti padroneggia i saperi fondamentali della disciplina, rielabora i contenuti con buona autonomia operativa e mantiene ritmi di lavoro piuttosto allineati.',
    'Le rilevazioni d’ingresso evidenziano una classe equilibrata e sorretta da basi cognitive solide e ben distribuite. Le abilità strumentali appaiono sicure e l’assimilazione di nuovi argomenti procede con regolarità, offrendo un terreno favorevole per consolidare il metodo di studio e avviare percorsi di approfondimento.',
  ],
  'omogenea|medio': [
    'Sul piano cognitivo, il gruppo evidenzia una bassa eterogeneità e un livello generale medio-discreto. I prerequisiti disciplinari essenziali sono presenti in quasi tutti gli alunni, pur richiedendo un lavoro sistematico di consolidamento nel lessico specifico, nella precisione applicativa e nell’organizzazione dello studio.',
    'L’analisi iniziale descrive una classe piuttosto allineata nei ritmi di lavoro e collocata su una preparazione generale intermedia. Gli studenti comprendono con sufficiente chiarezza le consegne di base e affrontano correttamente i compiti noti, ma mostrano ancora qualche incertezza quando occorre trasferire le procedure in situazioni nuove.',
    'Dal punto di vista didattico la sezione mostra competenze di partenza omogenee e di livello medio. Non emergono divari marcati tra fasce di apprendimento: la maggioranza del gruppo possiede conoscenze essenziali da strutturare con maggiore sicurezza attraverso esercitazioni guidate e schemi di sintesi.',
  ],
  'omogenea|fragile': [
    'Sul versante cognitivo e strumentale, la classe si caratterizza per un profilo abbastanza omogeneo su un livello generale medio-basso e fragile. I prerequisiti essenziali risultano ancora incerti nella maggior parte del gruppo, con difficoltà diffuse nella decodifica autonoma delle consegne, nella tenuta mnemonica e nella rielaborazione dei concetti chiave.',
    'Le prove d’ingresso segnalano fragilità diffuse e sostanzialmente uniformi nei saperi fondamentali della disciplina. Gran parte degli alunni necessita di tempi distesi, spiegazioni graduali e frequenti ripassi guidati per consolidare le abilità di base prima di affrontare compiti più articolati.',
    'Il quadro cognitivo iniziale evidenzia una preparazione di base debole ma omogenea, priva di forti sbilanciamenti interni. Tale uniformità consente di impostare fin dall’inizio un intervento organico e collettivo di recupero dei prerequisiti, sostenendo il gruppo passo dopo passo nell’acquisizione di un metodo di lavoro più sicuro.',
  ],
  'moderata|buono': [
    'Sul piano cognitivo la classe evidenzia un livello generale buono, pur presentando una moderata eterogeneità nei ritmi di apprendimento e nella prontezza esecutiva. Accanto a un nucleo consistente di alunni già autonomi, sicuri nella comprensione e capaci di collegamenti pertinenti, vi è una fascia che raggiunge gli obiettivi con tempi leggermente più distesi e con il supporto di esempi guidati.',
    'Dall’analisi iniziale emerge una preparazione generale mediamente solida e ben strutturata, con fisiologiche differenze tra gli studenti sul piano dell’autonomia e della ricchezza espressiva. La maggioranza padroneggia con sicurezza i prerequisiti fondamentali, mentre una parte del gruppo trae giovamento da schemi organizzativi e indicazioni metodologiche mirate.',
    'Il profilo didattico del gruppo unisce un livello medio buono a una moderata articolazione interna delle competenze. Alcuni alunni mostrano già spiccata capacità di analisi e sintesi, altri lavorano con regolarità ma necessitano di un consolidamento graduale delle strategie di rielaborazione e applicazione.',
  ],
  'moderata|medio': [
    'Sotto il profilo degli apprendimenti, la classe si attesta su un livello generale medio e manifesta un’eterogeneità moderata nei ritmi e negli stili cognitivi. Una componente del gruppo opera con discreta sicurezza e ordine, mentre diversi compagni presentano conoscenze essenziali ma non ancora pienamente consolidate e richiedono esercitazioni graduate.',
    'Le rilevazioni d’ingresso delineano un quadro intermedio moderatamente diversificato: gli alunni dispongono nel complesso dei prerequisiti essenziali, ma si differenziano per velocità di comprensione, stabilità nella memorizzazione e maturità del metodo di studio. Tali fisiologiche differenze possono essere efficacemente gestite mediante attività calibrate per fasce di difficoltà.',
    'L’osservazione iniziale colloca la classe su una preparazione generale discreta, articolata in ritmi di lavoro moderatamente differenti. Se alcuni studenti applicano con sufficiente autonomia le conoscenze nei compiti noti, altri mostrano incertezze espositive e organizzative che rendono utile un accompagnamento didattico strutturato.',
  ],
  'moderata|fragile': [
    'Dal punto di vista didattico, la classe presenta un livello generale fragile accompagnato da una moderata eterogeneità interna. Pur accomunato dalla necessità di rafforzare le conoscenze di base e il metodo di studio, il gruppo distingue alunni che riescono a seguire le consegne semplici con adeguato sostegno e altri che manifestano lacune più marcate nella comprensione e nell’applicazione.',
    'Il bilancio delle rilevazioni iniziali mostra prerequisiti disciplinari complessivamente fragili ma articolati su ritmi moderatamente diversi: un piccolo nucleo possiede competenze essenziali sufficienti, mentre la parte prevalente del gruppo richiede percorsi semplificati, mappe concettuali e un recupero sistematico delle abilità strumentali.',
    'La situazione di partenza registra diffuse incertezze nei saperi fondamentali, inserite in una differenziazione moderata delle capacità di apprendimento. Sarà necessario intervenire con gradualità sui nuclei essenziali della disciplina, offrendo strumenti di supporto visivo e consegne suddivise per fasi.',
  ],
  'elevata|buono': [
    'Sul piano cognitivo la classe mostra un livello generale mediamente buono, ma caratterizzato da una spiccata eterogeneità nelle competenze di ingresso e nei ritmi di apprendimento. Convivono infatti un gruppo consistente di alunni dotati di solide basi, rapidità intuitiva e ottima autonomia operativa accanto a studenti che manifestano ancora incertezze strumentali e necessitano di guida costante.',
    'Le osservazioni iniziali mettono in luce una classe dal rendimento medio soddisfacente ma fortemente eterogenea. Un numero significativo di studenti eccelle per capacità di analisi, padronanza lessicale e spirito critico, mentre una fascia minoritaria fatica nei processi di comprensione autonoma e richiede attività di consolidamento e recupero mirato.',
    'Dal punto di vista didattico il gruppo evidenzia un profilo articolato e disomogeneo: a fronte di un livello medio buono sostenuto da diversi alunni autonomi e ricettivi, emergono ritmi cognitivi sensibilmente distanti che rendono indispensabile una progettazione modulare capace di valorizzare le eccellenze senza lasciare indietro chi procede più lentamente.',
  ],
  'elevata|medio': [
    'L’analisi iniziale restituisce il profilo di una classe di livello generale medio ma segnata da un’elevata eterogeneità nei prerequisiti, nei tempi attentivi e nell’autonomia di studio. All’interno del gruppo coesistono alunni sicuri e ben organizzati, una fascia intermedia incerta nelle consegne complesse e alcuni studenti con fragilità di base bisognosi di interventi di recupero mirati.',
    'Sotto il profilo cognitivo la classe presenta una preparazione media discreta distribuita in modo molto disomogeneo. Il divario tra gli studenti più pronti nella rielaborazione dei concetti e quelli che incontrano ostacoli nella decodifica dei testi e nell’applicazione delle regole rende centrale una didattica differenziata per livelli.',
    'Le prove di ingresso evidenziano una marcata eterogeneità all’interno di un quadro medio intermedio: alcuni alunni affrontano già con padronanza le attività proposte, molti lavorano in modo accettabile solo se guidati nei passaggi principali e una quota ristretta necessita di percorsi altamente strutturati e semplificati.',
  ],
  'elevata|fragile': [
    'Sul piano cognitivo la classe si presenta fortemente eterogenea e collocata su un livello generale fragile. A fronte di pochissimi alunni con prerequisiti discreti e sufficiente autonomia, la maggioranza del gruppo manifesta lacune rilevanti nelle conoscenze di base, difficoltà di comprensione autonoma e un metodo di studio ancora molto incerto.',
    'L’osservazione iniziale segnala un marcato divario interno su basi disciplinari complessivamente fragili. Mentre un piccolo nucleo riesce a lavorare con regolarità sulle consegne guidate, numerosi compagni presentano tempi di assimilazione molto lenti, scarsa tenuta mnemonica e bisogno di costante supporto individualizzato.',
    'Il quadro didattico d’avvio unisce una preparazione media fragile a un’elevata disomogeneità dei livelli di partenza. La distanza tra le risorse autonome di pochi alunni e le diffuse difficoltà strumentali di gran parte della classe impone di concentrare l’azione formativa sui nuclei irrinunciabili e su strategie di recupero capillari.',
  ],
};

const RELATIONAL_BEHAVIORAL_PROFILES: Record<RelKey, readonly [string, string, string]> = {
  'positiva|ordinata': [
    'Sul piano della socializzazione e della convivenza scolastica, le dinamiche tra pari risultano positive, inclusive e collaborative. Gli alunni rispettano con costanza le regole d’aula e i turni di parola, favorendo un clima sereno, ordinato e propizio tanto all’ascolto quanto al lavoro cooperativo.',
    'Per quanto riguarda gli aspetti relazionali e comportamentali, la classe mostra un ottimo grado di coesione e rispetto reciproco. Il contegno in aula è generalmente calmo, educato e attento alle indicazioni dei docenti, consentendo lo svolgimento regolare e costruttivo delle lezioni.',
    'Il tessuto relazionale appare armonioso e solidale: gli studenti collaborano volentieri senza formare barriere esclusive e mantengono un comportamento rispettoso delle norme di convivenza civile e dei tempi di lavoro comune.',
  ],
  'positiva|vivace': [
    'La socializzazione all’interno del gruppo è positiva, aperta e caratterizzata da un genuino spirito di collaborazione. La classe esprime al contempo una spiccata vivacità relazionale e comunicativa che talvolta rende rumorosi gli interventi spontanei, pur rimanendo pienamente gestibile attraverso richiami sereni e regole condivise.',
    'Dal punto di vista socio-relazionale si osservano rapporti amichevoli, inclusivi e solidali tra i compagni. L’ambiente d’aula risulta vivace ed espansivo: l’entusiasmo e la facilità di parola degli alunni richiedono un’attenta regolazione dei turni di intervento per trasformare questa energia vitale in risorsa didattica.',
    'Gli studenti hanno costruito legami positivi e accoglienti, dimostrando disponibilità all’aiuto reciproco. Sul versante comportamentale prevale un temperamento vivace ed esuberante, che risponde tuttavia con prontezza alle indicazioni educative quando l’attività è ben cadenzata.',
  ],
  'positiva|irrequieta': [
    'Sul piano interpersonale gli alunni evidenziano una socializzazione nel complesso positiva e solidale, ma faticano molto nell’autoregolazione comportamentale. La classe appare irrequieta e facilmente incline a interruzioni, brusii e inosservanza delle regole d’aula, richiedendo un presidio educativo fermo e costante per tutelare i tempi di lavoro.',
    'Nonostante i rapporti tra compagni siano affettuosi e privi di gravi chiusure, la gestione quotidiana dell’aula risente di una marcata irrequietezza diffusa. Gli studenti stentano a rispettare le consegne di silenzio e i turni di parola, rendendo indispensabile il richiamo sistematico al regolamento e al patto educativo.',
    'La buona intesa relazionale del gruppo non si traduce ancora in un adeguato autocontrollo comportamentale: frequenti scambi informali e difficoltà nel rispetto delle norme comuni rallentano il lavoro scolastico e sollecitano un’azione coerente e condivisa da parte dell’intero Consiglio di Classe.',
  ],
  'selettiva|ordinata': [
    'Sul piano della socializzazione si rilevano rapporti generalmente corretti ed educati, ma ancora articolati in piccoli sottogruppi amicali piuttosto selettivi. Il comportamento e il rispetto delle regole risultano tuttavia ordinati e regolari, garantendo un clima d’aula calmo e rispettoso delle consegne.',
    'Le dinamiche interpersonali appaiono formalmente corrette ma poco amalgamate sul piano cooperativo, con la presenza di gruppi ristretti e di alcuni alunni più riservati. Sul fronte disciplinare la classe si mostra invece tranquilla, composta e attenta all’osservanza delle norme scolastiche.',
    'Il clima comportamentale è sereno e caratterizzato da un regolare rispetto delle regole d’aula e degli spazi comuni. Sul versante della socializzazione emerge invece un’integrazione parziale, legata a legami selettivi che sarà opportuno ampliare mediante attività collaborative a coppie o a gruppi variabili.',
  ],
  'selettiva|vivace': [
    'La socializzazione si articola in sottogruppi amicali abbastanza definiti, tra i quali i rapporti restano nel complesso corretti ma non sempre spontaneamente inclusivi. Sul piano comportamentale la classe è vivace e loquace, con scambi frequenti tra compagni che richiedono una regia costante per mantenere attenzione e rispetto dei turni di parola.',
    'Nel gruppo classe convivono legami selettivi, talvolta poco aperti al confronto con tutti i compagni, e una vivacità espressiva che anima ma talora disperde il lavoro d’aula. Regole chiare di interazione e lavori cooperativi a composizione guidata aiuteranno sia a regolare l’esuberanza sia a rafforzare la coesione.',
    'Sotto il profilo relazionale gli alunni tendono a rapportarsi soprattutto entro cerchie ristrette, pur senza manifestare conflittualità aperta. Il comportamento in aula risulta vivace ed esuberante: la classe risponde bene a ritmi operativi chiari, ma necessita di richiami puntuali nelle fasi frontali.',
  ],
  'selettiva|irrequieta': [
    'Sul versante relazionale e comportamentale emergono fatiche significative: la socializzazione risulta frammentata in sottogruppi chiusi o poco comunicanti, mentre in aula prevale un’irrequietezza diffusa con ricorrenti infrazioni alle regole di convivenza e difficoltà nell’ascolto reciproco.',
    'La classe mostra legami interpersonali selettivi, poco inclini alla collaborazione allargata, uniti a un’evidente difficoltà nel rispetto delle regole comuni e dei turni di parola. Tale assetto rallenta frequentemente lo svolgimento delle attività e richiede fermezza educativa e routine ben scandite.',
    'Le dinamiche di gruppo appaiono ancora immature: alla chiusura di alcuni sottogruppi si sommano comportamenti irrequieti, interventi fuori luogo e scarsa tenuta attentiva, condizioni che impongono un intervento educativo coordinato sul rispetto delle regole e sull’inclusione di tutti.',
  ],
  'difficile|ordinata': [
    'Sul piano comportamentale la classe mantiene nel complesso un contegno ordinato e rispettoso delle regole formali dell’aula, ma evidenzia una socializzazione difficile, segnata da attriti latenti, competitività o tendenza all’isolamento di alcuni alunni. L’intervento educativo dovrà accompagnare la collaborazione tra pari in un contesto protetto.',
    'Nonostante l’osservanza generalmente corretta delle norme scolastiche garantisca lezioni ordinate, il tessuto relazionale mostra fragilità e tensioni tra alcuni studenti che faticano a cooperare serenamente. Sarà utile proporre lavori di gruppo fortemente strutturati e guidati per educare al dialogo e all’ascolto.',
    'Il rispetto delle regole di base consente una gestione ordinata delle attività frontali, mentre sul piano socio-relazionale emergono difficoltà di integrazione e piccole rivalità interpersonali. La progettazione curerà con particolare attenzione la dimensione inclusiva e la gestione costruttiva delle relazioni.',
  ],
  'difficile|vivace': [
    'Le dinamiche di socializzazione risultano complesse e talvolta segnate da tensioni o competitività tra pari, rese più evidenti da una vivacità relazionale che tende facilmente a degenerare in polemiche o distrazioni. È necessaria una conduzione educativa attenta e ferma, capace di contenere gli scambi impulsivi e guidare i rapporti verso il rispetto reciproco.',
    'Il gruppo presenta fragilità sul piano della socializzazione, con attriti tra sottogruppi e difficoltà nel lavoro condiviso, associate a un temperamento vivace ed esuberante. Regole condivise chiare e mediazione costante da parte dei docenti saranno essenziali per trasformare la vivacità in confronto ordinato.',
    'In aula si registrano relazioni interpersonali delicate, caratterizzate da fatica ad accettare il punto di vista altrui, unite a una spiccata vivacità comportamentale. Attraverso attività cooperative a ruoli assegnati e regole nette sui turni di parola si lavorerà per rafforzare il rispetto e la coesione.',
  ],
  'difficile|irrequieta': [
    'Il quadro socio-relazionale e comportamentale rappresenta l’aspetto più delicato della classe: la socializzazione è difficile e attraversata da conflitti tra compagni, mentre il rispetto delle regole risulta gravemente carente a causa di un’irrequietezza costante che disturba il lavoro comune. Si rende indispensabile un presidio educativo rigoroso e condiviso con le famiglie e il Consiglio di Classe.',
    'Tra diversi alunni emergono tensioni frequenti, reazioni impulsive e scarsa disponibilità alla cooperazione, aggravate da un contegno irrequieto e poco rispettoso delle norme scolastiche. L’azione didattica dovrà procedere parallelamente a un percorso sistematico di educazione alla convivenza civile, all’ascolto e al rispetto dei ruoli.',
    'La vita del gruppo risente di una conflittualità diffusa e di ricorrenti episodi di inosservanza delle regole d’aula, che ostacolano la continuità dell’attenzione e dell’apprendimento. La programmazione integrerà routine educative chiare, strategie di mediazione dei conflitti e attività altamente strutturate.',
  ],
};

const MOTIVATIONAL_DIDACTIC_PROFILES: Record<MotKey, readonly [string, string, string]> = {
  'buono|attiva': [
    'La motivazione allo studio è attiva e costante: la classe partecipa con curiosità al dialogo educativo e risponde con prontezza alle consegne. La progettazione didattica valorizzerà tali risorse attraverso attività laboratoriali, compiti di realtà, lavori cooperativi e percorsi di approfondimento orientati allo sviluppo delle competenze.',
    'Sostenuta da un vivo interesse e da un impegno regolare tanto in aula quanto nel lavoro domestico, la classe consente di proporre strategie didattiche stimolanti e partecipative. L’azione formativa mirerà a perfezionare l’autonomia critica e la padronanza lessicale, garantendo al contempo attenzione alle eventuali fasce più fragili.',
    'L’atteggiamento motivato e propositivo degli alunni costituisce un importante punto di forza. Alternando momenti di confronto guidato, approfondimenti interdisciplinari e strategie di tutoring tra pari, sarà possibile consolidare risultati già buoni e promuovere il massimo sviluppo delle potenzialità individuali.',
  ],
  'buono|selettiva': [
    'La motivazione verso la disciplina si manifesta in forma selettiva e talora discontinua, attivandosi soprattutto di fronte a proposte operative, multimediali o vicine all’esperienza quotidiana. Facendo leva sulle buone basi cognitive disponibili, la didattica utilizzerà metodologie variegate per trasformare l’interesse episodico in metodo di lavoro costante.',
    'Pur disponendo di buone capacità complessive, gli studenti mostrano un coinvolgimento oscillante che richiede stimoli mirati e consegne significative per mantenersi alto anche nelle fasi teoriche. Compiti sfidanti, verifiche formative frequenti e l’impiego di strumenti digitali sosterranno la continuità dell’impegno.',
    'L’impegno e la partecipazione non risultano sempre uniformi lungo tutte le attività proposte, concentrandosi sugli argomenti percepiti come più pratici o coinvolgenti. La progettazione punterà quindi sul raccordo tra teoria ed esperienza concreta per consolidare abitudini di studio regolari.',
  ],
  'buono|debole': [
    'A fronte di una buona dotazione cognitiva di partenza, la motivazione media appare tuttavia debole e bisognosa di frequenti sollecitazioni. Gli alunni tendono spesso a limitarsi all’esecuzione essenziale delle consegne senza slancio personale; saranno perciò adottate strategie attive e sfide cognitive graduali per risvegliarne l’iniziativa e la responsabilità.',
    'Nonostante prerequisiti mediamente soddisfacenti, una parte consistente del gruppo manifesta passività partecipativa e scarso investimento spontaneo nello studio. L’azione educativa privilegerà attività laboratoriali, riscontri incoraggianti e obiettivi chiari per valorizzare capacità attualmente inespresse.',
    'Il contrasto tra le buone potenzialità medie e una motivazione ancora fragile orienterà la scelta metodologica verso proposte capaci di coinvolgere direttamente gli studenti, favorendo la partecipazione guidata e la consapevolezza del proprio percorso di crescita.',
  ],
  'medio|attiva': [
    'La classe dimostra una motivazione attiva e un buon desiderio di partecipare alle proposte scolastiche, compensando con la disponibilità al lavoro le piccole incertezze nei prerequisiti. Su queste basi positive si procederà con esercitazioni sistematiche, mappe concettuali e laboratori guidati per rafforzare il metodo di studio e stabilizzare i risultati.',
    'L’interesse vivo e la partecipazione regolare costituiscono una leva decisiva per accompagnare questo gruppo intermedio verso competenze più sicure. La didattica alternerà consolidamento delle abilità essenziali, attività cooperative e graduali spunti di approfondimento.',
    'Gli alunni rispondono con slancio e fiducia alle sollecitazioni del docente, mostrando voglia di mettersi alla prova. Valorizzando tale atteggiamento positivo attraverso feedback puntuali e studio guidato dei concetti chiave, l’intero gruppo potrà compiere progressi significativi.',
  ],
  'medio|selettiva': [
    'La motivazione degli studenti risulta selettiva e altalenante, rispondendo con maggiore prontezza alle attività pratiche, visive o interattive rispetto allo studio teorico prolungato. La programmazione punterà su lezioni brevi e partecipate, uso di mediatori schematici e verifiche graduate per rendere più continuo l’impegno scolastico.',
    'Il coinvolgimento nel lavoro d’aula varia in funzione della tipologia di compito e della vicinanza delle verifiche. Per consolidare un livello di preparazione medio e prevenire cali di rendimento, si ricorrerà a strategie operative diversificate, chiarimento sistematico degli obiettivi e controllo regolare dei compiti.',
    'L’interesse verso la disciplina emerge soprattutto quando gli alunni vengono coinvolti in prima persona attraverso esempi concreti e attività strutturate. L’alternanza tra spiegazioni essenziali, lavoro di gruppo guidato e momenti di sintesi aiuterà a rafforzare autonomia e costanza.',
  ],
  'medio|debole': [
    'La motivazione media allo studio risulta piuttosto debole e richiede sollecitazioni costanti per evitare un atteggiamento rinunciatario o superficiale. In presenza di basi disciplinari solo discrete, l’azione didattica si concentrerà sulla costruzione guidata del metodo di studio, proponendo obiettivi accessibili, feedback frequenti e attività laboratoriali brevi.',
    'Gli alunni mostrano scarsa iniziativa spontanea e faticano a sostenere uno sforzo regolare nel lavoro domestico e in aula. Sarà quindi fondamentale scandire i passaggi di apprendimento, ricorrere a schemi orientativi e coinvolgere le famiglie in un monitoraggio costante dei progressi.',
    'La fragilità della spinta motivazionale ostacola il pieno consolidamento delle competenze intermedie. Attraverso rinforzi positivi, valorizzazione dei piccoli successi e consegne chiaramente strutturate, si lavorerà per accrescere l’autostima scolastica e il senso di responsabilità verso lo studio.',
  ],
  'fragile|attiva': [
    'Nonostante le fragilità nella preparazione di partenza, il gruppo manifesta una motivazione attiva e una lodevole disponibilità a lasciarsi coinvolgere quando le attività sono alla sua portata. Questa energia positiva consentirà di avviare un efficace percorso di recupero attraverso didattica laboratoriale, esercitazioni guidate passo passo e valorizzazione costante di ogni progresso.',
    'La partecipazione fiduciosa e la voglia di intervenire rappresentano un autentico punto di forza su cui far leva per colmare le lacune di base. La programmazione privilegerà i nuclei essenziali della disciplina, semplificando il linguaggio espositivo e sostenendo lo studio con mappe, schemi e apprendimento cooperativo.',
    'Pur partendo da competenze incerte, gli alunni si mostrano aperti al dialogo educativo e desiderosi di migliorare. Un accompagnamento incoraggiante, unito a frequenti momenti di lavoro assistito in aula e a criteri di valutazione trasparenti, favorirà un recupero graduale e duraturo.',
  ],
  'fragile|selettiva': [
    'La motivazione si attiva in maniera selettiva, soprattutto davanti a compiti brevi, pratici e accessibili che attenuino il timore dell’errore dovuto alle fragilità pregresse. L’impostazione metodologica procederà per piccole unità di apprendimento, ricorrendo a mediatori visivi, schemi semplificati e verifiche formative frequenti.',
    'In un quadro iniziale segnato da lacune di base, il coinvolgimento degli studenti cede facilmente di fronte a richieste astratte mentre si riaccende con attività concrete e guidate. La didattica mirerà innanzitutto a consolidare i saperi irrinunciabili e le prime strategie di organizzazione dello studio.',
    'L’interesse discontinuo riflette spesso l’insicurezza maturata nei confronti delle difficoltà scolastiche. Offrendo consegne graduali, esempi svolti in comune e un clima non giudicante, si punterà a rendere più stabile la partecipazione e a rafforzare la fiducia nelle proprie capacità.',
  ],
  'fragile|debole': [
    'La motivazione allo studio risulta debole e risente delle diffuse difficoltà pregresse, che generano talvolta passività o disaffezione scolastica. L’azione formativa concentrerà gli sforzi sui nuclei fondanti e irrinunciabili della disciplina, adottando una didattica fortemente inclusiva, ritmi distesi, lavoro assistito in aula e rinforzi positivi sistematici.',
    'A causa dell’abbinamento tra basi didattiche fragili e scarso investimento emotivo verso la scuola, gli alunni necessitano di una guida costante, paziente e altamente strutturata. Ogni percorso sarà scomposto in passaggi essenziali accompagnati da mappe, schede facilitate e verifiche calibrate sugli obiettivi minimi.',
    'L’iniziale fragilità degli apprendimenti e la debole spinta motivazionale impongono un intervento educativo improntato alla gradualità, alla chiarezza delle richieste e al dialogo continuo con le famiglie. Costruire esperienze di successo accessibili costituirà la condizione preliminare per riattivare interesse e autonomia.',
  ],
};

function getHeterogeneityBehavioralBridge(
  eterogeneita: QuickEterogeneitaLevel,
  socializzazione: QuickSocializzazioneLevel,
  regoleVivacita: QuickRegoleVivacitaLevel,
  variant: 0 | 1 | 2
): string {
  if (eterogeneita === 'elevata') {
    if (socializzazione === 'positiva') {
      return [
        'L’ampia eterogeneità interna potrà tuttavia trovare equilibrio grazie alla disponibilità solidale dei compagni più autonomi nelle attività di tutoraggio tra pari.',
        'La buona predisposizione relazionale del gruppo agevolerà il ricorso a lavori cooperativi per fasce eterogenee, trasformando le differenze di livello in occasione di crescita reciproca.',
        'Il clima accogliente tra studenti rappresenta una leva preziosa per gestire l’elevata eterogeneità attraverso forme guidate di aiuto vicendevole e apprendimento cooperativo.',
      ][variant];
    }
    if (regoleVivacita === 'irrequieta' || socializzazione === 'difficile') {
      return [
        'La gestione simultanea dell’elevata eterogeneità e delle criticità relazionali richiederà gruppi di lavoro accuratamente predefiniti e un attento bilanciamento dei carichi operativi.',
        'Poiché il divario nei ritmi di apprendimento può accentuare momenti di disturbo o frustrazione, sarà fondamentale predisporre attività parallele chiare e tempi d’aula rigorosamente scanditi.',
        'In presenza di forti dislivelli e dinamiche delicate, la differenziazione delle consegne dovrà accompagnarsi a una regia educativa ferma che garantisca serenità sia ai più veloci sia a chi necessita di recupero.',
      ][variant];
    }
    return [
      'Per rispondere alle notevoli differenze di ritmo senza alimentare dispersioni, verranno alternate brevi fasi comuni ad attività differenziate per livello.',
      'La spiccata eterogeneità interna suggerisce inoltre l’organizzazione di gruppi di lavoro flessibili, così da sostenere gli alunni più fragili e stimolare adeguatamente i più pronti.',
      'L’articolazione accentuata dei profili cognitivi richiede infine una calibrazione costante delle consegne e dei tempi esecutivi all’interno dell’orario scolastico.',
    ][variant];
  }

  if (eterogeneita === 'omogenea') {
    if (regoleVivacita === 'ordinata' && socializzazione === 'positiva') {
      return [
        'La combinazione tra omogeneità cognitiva e clima d’aula armonioso permette quindi di procedere con particolare linearità e coesione nella programmazione annuale.',
        'Questo equilibrio tra uniformità dei ritmi e correttezza relazionale rende particolarmente agevole l’avanzamento organico dell’intero gruppo classe.',
        'L’allineamento complessivo della classe consente infine di dedicare ampio spazio alla cura qualitativa del metodo e alla profondità delle competenze.',
      ][variant];
    }
    return [
      'La sostanziale omogeneità del gruppo facilita comunque la proposizione di interventi educativi e metodologici unitari calibrati sui bisogni prevalenti della classe.',
      'Potendo contare su ritmi di partenza piuttosto affini, l’azione del docente potrà rivolgersi in modo coerente all’intera sezione per rafforzarne tenuta e consapevolezza.',
      'L’uniformità dei prerequisiti consente di gestire con maggiore chiarezza la progressione degli obiettivi comuni, modulando con efficacia i tempi di consolidamento.',
    ][variant];
  }

  // moderata
  if (socializzazione === 'selettiva') {
    return [
      'L’impiego di attività a piccolo gruppo a composizione variabile favorirà sia il superamento delle chiusure tra sottogruppi sia il confronto produttivo tra fasce di livello affini.',
      'L’alternanza tra lavoro individuale e compiti cooperativi guidati contribuirà a rendere più fluidi gli scambi tra sottogruppi e a sostenere i ritmi leggermente differenziati.',
      'La costituzione guidata di coppie e piccoli gruppi aiuterà a integrare i diversi sottogruppi amicali valorizzando al contempo le moderate differenze di competenza.',
    ][variant];
  }
  return [
    'L’equilibrio complessivo tra le moderate differenze interne e l’andamento d’aula orienterà la didattica verso consegne graduali, flessibili e inclusive.',
    'La gestione equilibrata di ritmi moderatamente diversi consentirà infine di integrare con naturalezza attività di consolidamento comune e stimoli differenziati.',
    'All’interno della programmazione annuale, la moderata articolazione della classe sarà valorizzata attraverso percorsi graduali attenti ai tempi e agli stili di apprendimento di ciascuno.',
  ][variant];
}

function buildDescriptionVariants(
  eterogeneita: QuickEterogeneitaLevel,
  livelloGenerale: QuickLivelloGeneraleLevel,
  socializzazione: QuickSocializzazioneLevel,
  regoleVivacita: QuickRegoleVivacitaLevel,
  motivazione: QuickMotivazioneLevel
): readonly [string, string, string] {
  const cogKey: CogKey = `${eterogeneita}|${livelloGenerale}`;
  const relKey: RelKey = `${socializzazione}|${regoleVivacita}`;
  const motKey: MotKey = `${livelloGenerale}|${motivazione}`;

  const cogArr = COGNITIVE_PROFILES[cogKey];
  const relArr = RELATIONAL_BEHAVIORAL_PROFILES[relKey];
  const motArr = MOTIVATIONAL_DIDACTIC_PROFILES[motKey];

  // Rotazione controllata per garantire 3 varianti stilisticamente ricche e non ripetitive
  const makeVariant = (v: 0 | 1 | 2): string => {
    const cIdx = v;
    const rIdx = ((v + (motivazione === 'selettiva' ? 1 : motivazione === 'debole' ? 2 : 0)) %
      3) as 0 | 1 | 2;
    const mIdx = ((v + (socializzazione === 'selettiva' ? 1 : socializzazione === 'difficile' ? 2 : 0)) %
      3) as 0 | 1 | 2;
    const bridgeIdx = ((v + (regoleVivacita === 'vivace' ? 1 : regoleVivacita === 'irrequieta' ? 2 : 0)) %
      3) as 0 | 1 | 2;

    const p1 = cogArr[cIdx];
    const p2 = `${relArr[rIdx]} ${getHeterogeneityBehavioralBridge(
      eterogeneita,
      socializzazione,
      regoleVivacita,
      bridgeIdx
    )}`.trim();
    const p3 = motArr[mIdx];

    if (v === 1) {
      return `${p1}\n\n${p2}\n\n${p3}`;
    }
    if (v === 2) {
      return `${p2}\n\n${p1}\n\n${p3}`;
    }
    return `${p1}\n\n${p2}\n\n${p3}`;
  };

  return [makeVariant(0), makeVariant(1), makeVariant(2)] as const;
}

const HETEROGENEITA_VALUES: QuickEterogeneitaLevel[] = ['omogenea', 'moderata', 'elevata'];
const LIVELLO_VALUES: QuickLivelloGeneraleLevel[] = ['buono', 'medio', 'fragile'];
const SOCIALIZZAZIONE_VALUES: QuickSocializzazioneLevel[] = ['positiva', 'selettiva', 'difficile'];
const REGOLE_VALUES: QuickRegoleVivacitaLevel[] = ['ordinata', 'vivace', 'irrequieta'];
const MOTIVAZIONE_VALUES: QuickMotivazioneLevel[] = ['attiva', 'selettiva', 'debole'];

const BUILT_ARCHIVE: Record<string, readonly [string, string, string]> = {};

for (const e of HETEROGENEITA_VALUES) {
  for (const l of LIVELLO_VALUES) {
    for (const s of SOCIALIZZAZIONE_VALUES) {
      for (const r of REGOLE_VALUES) {
        for (const m of MOTIVAZIONE_VALUES) {
          const key: QuickClassModeKey = `${e}|${l}|${s}|${r}|${m}`;
          BUILT_ARCHIVE[key] = buildDescriptionVariants(e, l, s, r, m);
        }
      }
    }
  }
}

export const CLASS_QUICK_DESCRIPTIONS_ARCHIVE = BUILT_ARCHIVE as Record<
  QuickClassModeKey,
  readonly [string, string, string]
>;
