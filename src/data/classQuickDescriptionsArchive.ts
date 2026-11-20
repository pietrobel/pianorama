import type { QuickClassModeKey } from '../domain/types';

/**
 * Archivio precompilato offline delle descrizioni della classe per la Modalità Rapida.
 * Copre tutte le 81 combinazioni delle 4 domande chiuse:
 *   1. Eterogeneità: omogenea | moderata | elevata
 *   2. Livello medio di preparazione didattica: buono | medio | fragile
 *   3. Clima relazionale: sereno | vivace | complesso
 *   4. Motivazione e partecipazione media: attiva | selettiva | debole
 *
 * Ogni combinazione dispone di 3 formulazioni italiane stilisticamente distinte,
 * redatte per l'inserimento diretto nella Programmazione disciplinare.
 */
export const CLASS_QUICK_DESCRIPTIONS_ARCHIVE: Record<
  QuickClassModeKey,
  readonly [string, string, string]
> = {
  // =========================================================================
  // 1. ETEROGENEITÀ: OMAGENEA (27 combinazioni)
  // =========================================================================

  'omogenea|buono|sereno|attiva': [
    'La classe si presenta sostanzialmente omogenea nei ritmi di apprendimento e sorretta da una preparazione di base solida e ben strutturata. Il clima relazionale risulta sereno e cooperativo, favorendo uno svolgimento ordinato e proficuo delle attività didattiche. Gli alunni manifestano un interesse vivo e una partecipazione costante, elementi che consentono di programmare percorsi di approfondimento e consolidamento delle competenze con buona autonomia operativa.',
    'Sotto il profilo didattico-educativo il gruppo classe evidenzia un livello di partenza uniforme e generalmente soddisfacente, con prerequisiti disciplinari ben acquisiti. Le relazioni tra pari si sviluppano in un clima disteso e rispettoso delle regole condivise. L’atteggiamento positivo verso lo studio e la partecipazione attiva durante le lezioni permettono di proporre attività stimolanti e compiti di realtà mirati alla valorizzazione delle potenzialità di ciascuno.',
    'L’osservazione iniziale restituisce l’immagine di una classe equilibrata, caratterizzata da competenze di ingresso buone e piuttosto omogenee. L’ambiente educativo appare armonioso e collaborativo, sorretto da un dialogo costante con i docenti. La motivazione diffusa e la regolare disponibilità all’ascolto e al confronto costituiscono un punto di forza significativo su cui innestare una progettazione didattica ampia e articolata.',
  ],

  'omogenea|buono|sereno|selettiva': [
    'Il gruppo evidenzia un’omogeneità di fondo nei livelli di partenza e una preparazione didattica complessivamente buona. Le dinamiche interpersonali si mantengono serene e collaborative, assicurando un contesto di lavoro ordinato. La partecipazione e l’interesse risultano tuttavia selettivi e legati soprattutto alle proposte più operative o coinvolgenti, rendendo utile l’impiego di metodologie variegate per sostenere la continuità dell’impegno.',
    'La classe possiede prerequisiti disciplinari solidi e ben distribuiti tra gli alunni, all’interno di un clima relazionale tranquillo e rispettoso. Sul piano motivazionale l’adesione alle attività oscilla in base all’argomento affrontato e agli stimoli proposti in aula. La progettazione didattica punterà pertanto a diversificare i linguaggi e le strategie di lavoro per trasformare un interesse discontinuo in partecipazione stabile.',
    'Le rilevazioni iniziali mostrano una classe omogenea e ben preparata nei contenuti fondamentali della disciplina, inserita in un ambiente sereno e incline alla collaborazione. L’impegno e il coinvolgimento non sempre mantengono la medesima intensità lungo tutte le fasi del lavoro scolastico, attivandosi con maggiore prontezza davanti a compiti pratici e interattivi; sarà dunque opportuno curare il raccordo tra studio teorico ed esperienze significative.',
  ],

  'omogenea|buono|sereno|debole': [
    'Nonostante un’adeguata omogeneità dei prerequisiti e una preparazione di base buona, la classe mostra una motivazione allo studio contenuta e una partecipazione piuttosto passiva. Il clima relazionale è calmo e corretto, ma il gruppo tende ad attendere lo stimolo del docente prima di intervenire. L’azione educativa dovrà sollecitare un coinvolgimento più diretto e personale, facendo leva sulle buone capacità già possedute dagli studenti.',
    'Dal punto di vista cognitivo gli alunni presentano competenze iniziali uniformi e apprezzabili, accompagnate da un comportamento educato e da relazioni serene tra compagni. Tuttavia si rileva una certa fatica nel mantenere viva la spinta motivazionale e una partecipazione spontanea alle discussioni guidate. L’impostazione metodologica priviligerà attività laboratoriali e sfide cognitive graduali per risvegliare l’iniziativa individuale.',
    'La situazione di ingresso si caratterizza per un profilo didattico omogeneo e solido e per un clima d’aula disteso, privo di particolari criticità relazionali. A fronte di tali risorse, l’interesse e la partecipazione attiva risultano deboli e bisognosi di frequenti rinforzi positivi. Il percorso didattico mirerà a valorizzare le sicurezze già maturate dalla classe per promuovere un atteggiamento più intraprendente e partecipe.',
  ],

  'omogenea|buono|vivace|attiva': [
    'La classe mostra una preparazione iniziale buona e sostanzialmente omogenea, associata a una spiccata vivacità relazionale. Gli studenti partecipano con entusiasmo e prontezza al dialogo educativo, manifestando curiosità e desiderio di esprimersi. La naturale esuberanza del gruppo, talvolta articolata in sottogruppi, richiede una guida attenta nella gestione dei turni di parola per incanalare positivamente l’elevata energia partecipativa.',
    'Sul piano degli apprendimenti il gruppo parte da basi sicure e uniformi, sostenute da una motivazione viva e da un’adesione attiva alle proposte scolastiche. Le relazioni tra pari risultano dinamiche ed espansive, rendendo l’ambiente vivace ma pienamente gestibile attraverso regole chiare e tempi scanditi. Tale vitalità costituisce una risorsa preziosa per attività cooperative, dibattiti e lavori per gruppi.',
    'L’analisi iniziale evidenzia alunni ben preparati e con ritmi di lavoro piuttosto allineati, inseriti in un tessuto relazionale vivace e comunicativo. La partecipazione è frequente e stimolata da una genuina curiosità verso le attività proposte. Con un’opportuna regia educativa volta a regolare l’impulsività degli interventi, la classe è in grado di conseguire risultati di buon rilievo.',
  ],

  'omogenea|buono|vivace|selettiva': [
    'Gli alunni condividono un buon livello medio di preparazione e un profilo di ingresso abbastanza omogeneo. Il clima in aula è vivace e movimentato, con dinamiche amicali intense che talvolta distraggono dal compito. La motivazione emerge in modo selettivo: il gruppo risponde con prontezza quando è coinvolto in attività sfidanti, mentre tende a disperdere l’attenzione nelle fasi più ripetitive o trasmissive.',
    'La classe dispone di conoscenze preliminari solide e ben allineate, ma presenta un clima relazionale esuberante che richiede richiami puntuali al rispetto dei tempi di lavoro. L’interesse verso la disciplina si manifesta a tratti, concentrandosi soprattutto sui nuclei percepiti come più vicini all’esperienza quotidiana. L’alternanza di lezioni brevi ed esercitazioni attive consentirà di stabilizzare attenzione e rendimento.',
    'Dal quadro iniziale emerge una classe omogenea sul piano cognitivo e dotata di buone capacità di base, caratterizzata però da un’esuberanza relazionale che incide sulla continuità della concentrazione. La partecipazione risulta discontinua, alternando momenti di vivo coinvolgimento ad altri di distrazione. Una didattica dinamica e strutturata permetterà di orientare proficuamente le potenzialità del gruppo.',
  ],

  'omogenea|buono|vivace|debole': [
    'Pur partendo da una preparazione iniziale buona e uniforme, la classe manifesta una vivacità diffusa che non sempre si traduce in partecipazione produttiva. L’attenzione tende a orientarsi verso le interazioni tra pari piuttosto che verso le consegne scolastiche, evidenziando una motivazione allo studio piuttosto debole. Sarà necessario coniugare regole chiare di convivenza con proposte didattiche capaci di riattivare l’interesse.',
    'Il gruppo classe dispone di prerequisiti adeguati e omogenei, ma vive le dinamiche relazionali in modo esuberante e talora dispersivo rispetto agli impegni scolastici. La disponibilità allo sforzo individuale appare limitata e bisognosa di sollecitazioni costanti da parte del docente. L’intervento educativo punterà a responsabilizzare gli alunni e a canalizzare la loro vivacità verso obiettivi di apprendimento condivisi.',
    'Sul versante delle competenze iniziali gli studenti mostrano un livello soddisfacente e piuttosto livellato, mentre sul piano comportamentale prevalgono irrequietezza relazionale e scarso slancio motivazionale. La classe fatica a investire con continuità nel lavoro proposto, pur avendone le capacità. Percorsi operativi con riscontri immediati aiuteranno a rafforzare il senso di responsabilità e il coinvolgimento.',
  ],

  'omogenea|buono|complesso|attiva': [
    'La classe presenta una preparazione iniziale buona e omogenea e una partecipazione pronta alle attività disciplinari, ma risente di un clima relazionale complesso, segnato da tensioni o difficoltà nella gestione dei rapporti tra pari. L’interesse verso la materia rappresenta un valido aggancio educativo su cui fare leva per consolidare il rispetto reciproco e costruire abitudini di lavoro collaborativo.',
    'Sotto il profilo strettamente didattico il gruppo evidenzia basi solide, ritmi affini e una motivazione complessivamente attiva. Tuttavia le relazioni interne mostrano fragilità che richiedono una mediazione costante da parte dei docenti per prevenire dinamiche oppositive o competitive. L’impiego di attività strutturate in coppia o piccolo gruppo guidato favorirà il miglioramento della convivenza scolastica.',
    'Nonostante la buona tenuta cognitiva e l’uniformità dei prerequisiti, l’andamento d’aula risente di equilibri relazionali delicati e bisognosi di ferma guida educativa. Gli studenti rispondono con discreta partecipazione agli stimoli culturali proposti, offrendo un terreno favorevole per lavorare contestualmente sull’educazione civica, sull’ascolto dell’altro e sulla gestione costruttiva dei conflitti.',
  ],

  'omogenea|buono|complesso|selettiva': [
    'Il profilo della classe abbina un livello medio di preparazione buono e abbastanza uniforme a un clima relazionale complesso, nel quale emergono fatiche nell’accettazione delle regole condivise. La partecipazione didattica risulta selettiva e condizionata sia dall’andamento delle dinamiche interne sia dal taglio più o meno pratico delle attività. Occorrerà mantenere un presidio educativo fermo e sereno, alternando momenti di ascolto guidato a compiti chiari e ben delimitati.',
    'Le competenze disciplinari di partenza appaiono soddisfacenti e ben distribuite, ma la vita di gruppo è attraversata da attriti relazionali che rallentano il lavoro quotidiano. Gli alunni si impegnano in maniera discontinua, attivandosi soprattutto su proposte mirate e fortemente strutturate. La programmazione integrerà obiettivi cognitivi ambiziosi con azioni costanti di regolazione comportamentale.',
    'La classe dispone di risorse cognitive omogenee e adeguate al percorso, tuttavia la qualità della convivenza tra compagni richiede attenzioni continue e interventi di mediazione. In questo contesto la motivazione oscilla in funzione degli argomenti e della tenuta del clima d’aula. Strutturare routine di lavoro chiare consentirà di tutelare l’apprendimento e favorire relazioni più distese.',
  ],

  'omogenea|buono|complesso|debole': [
    'Pur evidenziando una preparazione pregressa buona e relativamente omogenea, la classe affronta difficoltà sul versante relazionale e mostra una motivazione piuttosto debole nei confronti delle attività scolastiche. Le tensioni interne assorbono parte dell’energia del gruppo, riducendo la disponibilità all’ascolto e all’impegno. L’azione didattica dovrà procedere con gradualità, ristabilendo un clima fiducioso e proponendo obiettivi raggiungibili capaci di riaccendere la partecipazione.',
    'Il gruppo possiede prerequisiti cognitivi adeguati e livellati, ma il contesto educativo è reso impegnativo da relazioni complesse e da una scarsa adesione spontanea al lavoro in classe. La presenza di atteggiamenti oppositivi o di chiusura richiede una linea educativa coerente, paziente e incoraggiante, volta a ricostruire il patto formativo e il piacere dell’apprendimento.',
    'L’osservazione iniziale segnala un divario tra le buone basi didattiche, sostanzialmente uniformi nella classe, e la fragile disposizione emotivo-relazionale del gruppo. La demotivazione diffusa e le dinamiche conflittuali ostacolano l’espressione piena delle potenzialità degli alunni. Saranno pertanto privilegiate strategie inclusive, chiarezza nelle consegne e un dialogo educativo costante.',
  ],

  'omogenea|medio|sereno|attiva': [
    'La classe risulta complessivamente omogenea e dotata di una preparazione media discreta, con conoscenze essenziali generalmente acquisite. Il clima relazionale si distingue per serenità e spirito di collaborazione, mentre la partecipazione attiva e motivata della maggioranza degli alunni crea condizioni favorevoli al progressivo consolidamento del metodo di studio e all’ampliamento delle competenze.',
    'Dal quadro di partenza emerge un gruppo equilibrato nei livelli cognitivi, collocati su una fascia intermedia, e caratterizzato da rapporti interpersonali positivi. La classe partecipa con buona continuità e risponde volentieri alle sollecitazioni didattiche. Su queste basi sarà agevole rafforzare l’autonomia operativa e guidare gradualmente gli studenti verso traguardi più sicuri.',
    'Gli alunni mostrano prerequisiti medi piuttosto uniformi, accompagnati da un atteggiamento aperto, curioso e rispettoso delle regole della vita scolastica. L’interesse dimostrato durante le attività consente di lavorare con regolarità sul consolidamento dei concetti chiave e sull’affinamento delle abilità espressive e logiche.',
  ],

  'omogenea|medio|sereno|selettiva': [
    'Il gruppo classe si presenta omogeneo, con un livello medio di preparazione discreto e relazioni interpersonali serene e ordinate. L’impegno e la partecipazione tendono tuttavia a essere selettivi, intensificandosi in corrispondenza di attività pratiche, multimediali o di gruppo. La programmazione valorizzerà tali canali per rendere più costante la motivazione anche nello studio sistematico.',
    'Le competenze di ingresso si attestano su un livello intermedio e uniforme, all’interno di un ambiente collaborativo e tranquillo. Gli studenti mostrano interesse soprattutto per gli argomenti più vicini alla propria esperienza, mentre faticano maggiormente a sostenere ritmi prolungati su consegne astratte. L’uso di mediatori visivi e didattica laboratoriale sosterrà la continuità partecipativa.',
    'Sotto il profilo didattico la classe evidenzia basi medie e omogenee, inserite in un clima d’aula disteso e privo di criticità relazionali. La partecipazione non è sempre uniforme nel tempo, ma reagisce positivamente quando gli alunni vengono coinvolti in prima persona. Sarà quindi curata la varietà delle proposte operative per mantenere vivo il coinvolgimento.',
  ],

  'omogenea|medio|sereno|debole': [
    'La classe possiede una preparazione di base media e sostanzialmente uniforme, abbinata a un clima relazionale sereno e corretto. Si osserva però una certa passività nella partecipazione e una motivazione allo studio contenuta, che portano il gruppo a limitarsi all’esecuzione essenziale delle consegne. Saranno introdotti percorsi guidati e momenti di lavoro cooperativo per stimolare iniziativa e fiducia.',
    'Gli alunni mantengono un comportamento rispettoso e un livello cognitivo iniziale discreto e omogeneo, ma mostrano scarso entusiasmo e limitata propensione all’intervento spontaneo. Per superare tale atteggiamento attendista, l’intervento didattico punterà su obiettivi brevi, riscontri incoraggianti e strategie di coinvolgimento attivo.',
    'L’analisi iniziale descrive un gruppo tranquillo e livellato su prerequisiti intermedi, nel quale tuttavia l’interesse e la partecipazione risultano fragili. L’assenza di conflitti facilita l’azione educativa, permettendo al docente di dedicare energie mirate al potenziamento della motivazione intrinseca e del metodo di lavoro.',
  ],

  'omogenea|medio|vivace|attiva': [
    'Il gruppo mostra una preparazione media discreta e piuttosto omogenea, unita a un clima relazionale vivace e a una partecipazione attiva alle proposte didattiche. Gli alunni intervengono volentieri e dimostrano curiosità, sebbene la loro esuberanza richieda una conduzione ferma nel rispetto dei turni di parola e dei tempi di ascolto.',
    'Sotto il profilo di partenza la classe si colloca su un livello intermedio uniforme, sostenuto da interesse e coinvolgimento costanti. Le interazioni tra compagni risultano dinamiche e talora rumorose, ma orientabili positivamente attraverso attività strutturate e cooperative che trasformino la vivacità in partecipazione costruttiva.',
    'La classe presenta prerequisiti medi omogenei, buona motivazione verso l’apprendimento e un tessuto relazionale espressivo e vivace. Regolando con chiarezza i momenti di lavoro individuale e quelli di confronto collettivo, sarà possibile consolidare le conoscenze e migliorare sensibilmente la qualità dei risultati.',
  ],

  'omogenea|medio|vivace|selettiva': [
    'La classe evidenzia un livello di partenza medio e omogeneo, ma un clima relazionale vivace che tende a distrarre quando l’interesse cala. La partecipazione è selettiva e discontinua: gli alunni si attivano con prontezza di fronte a compiti operativi, mentre manifestano irrequietezza nelle fasi puramente espositive. Una scansione serrata delle lezioni favorirà attenzione e rendimento.',
    'I prerequisiti disciplinari appaiono discreti e ben allineati nel gruppo, caratterizzato tuttavia da dinamiche vivaci tra sottogruppi amicali. L’impegno scolastico risente dell’oscillazione motivazionale, legata alla percezione immediata dell’utilità o attrattività dell’argomento. Metodologie attive e verifiche brevi e frequenti aiuteranno a mantenere alta la concentrazione.',
    'L’osservazione iniziale fotografa un gruppo omogeneo con preparazione intermedia, clima esuberante e motivazione intermittente. Per evitare dispersioni sarà opportuno alternare brevi spiegazioni partecipate ad attività pratiche mirate, chiarendo fin da subito aspettative e criteri di lavoro.',
  ],

  'omogenea|medio|vivace|debole': [
    'Il gruppo parte da competenze medie e abbastanza uniformi, ma presenta un clima relazionale esuberante accompagnato da scarsa motivazione allo studio. La vivacità degli scambi tra compagni prevale spesso sull’attenzione alle consegne didattiche, rendendo necessaria una chiara definizione delle regole di lavoro e proposte operative brevi, concrete e fortemente guidate.',
    'Sotto il profilo cognitivo gli alunni dispongono di basi intermedie omogenee, non ancora supportate però da un interesse adeguato né da un’efficace autoregolazione comportamentale. L’impegno appare fragile e dispersivo; l’azione didattica si concentrerà sul recupero della motivazione attraverso attività pratiche e un monitoraggio costante del lavoro in aula.',
    'La classe manifesta un equilibrio di partenza su livelli discreti ma poco sostenuti da spinta partecipativa e da autocontrollo relazionale. La gestione quotidiana richiede fermezza educativa unita a strategie didattiche coinvolgenti, finalizzate a orientare l’energia del gruppo verso compiti scolastici significativi.',
  ],

  'omogenea|medio|complesso|attiva': [
    'Nonostante un clima relazionale complesso che richiede interventi frequenti di mediazione educativa, la classe mostra una preparazione media omogenea e una discreta motivazione partecipativa alle attività proposte. Valorizzare l’interesse degli alunni attraverso lavori guidati e regole condivise costituirà la leva principale per migliorare la convivenza e consolidare gli apprendimenti.',
    'Gli alunni condividono prerequisiti intermedi abbastanza uniformi e rispondono con partecipazione attiva agli stimoli disciplinari, pur trovandosi spesso coinvolti in tensioni relazionali tra pari. L’integrazione di attività cooperative ben strutturate consentirà di canalizzare il desiderio di partecipare verso relazioni più rispettose e collaborative.',
    'La situazione iniziale accosta competenze disciplinari medie e omogenee e buona reattività didattica a fragilità sul piano relazionale. Il docente dovrà garantire una regia attenta del clima d’aula, trasformando i momenti di lavoro comune in occasioni di crescita sociale oltre che cognitiva.',
  ],

  'omogenea|medio|complesso|selettiva': [
    'La classe presenta un livello medio discreto e sostanzialmente omogeneo, ma risente di dinamiche relazionali complesse e di una motivazione altalenante. L’adesione alle proposte scolastiche dipende molto dal clima del momento e dal carattere più o meno operativo del compito. Sarà indispensabile stabilire routine chiare e percorsi graduali che favoriscano sia il consolidamento didattico sia la distensione dei rapporti.',
    'I prerequisiti iniziali si collocano su una fascia media uniforme, mentre sul fronte educativo si registrano fatiche relazionali e un interesse discontinuo verso lo studio. La progettazione punterà a contenere gli attriti attraverso attività ben cadenzate e a intercettare la motivazione degli alunni mediante collegamenti concreti con la realtà.',
    'Il profilo del gruppo mostra un equilibrio cognitivo intermedio associato però a un clima poco disteso e a una partecipazione selettiva. Occorrerà accompagnare con costanza la regolazione dei comportamenti, sostenendo al contempo l’impegno degli studenti con compiti chiari e riscontri puntuali.',
  ],

  'omogenea|medio|complesso|debole': [
    'La situazione di partenza combina una preparazione media omogenea con un clima relazionale complesso e una motivazione allo studio debole. Le difficoltà nei rapporti interpersonali e la scarsa disponibilità all’impegno rendono prioritario ricostruire un ambiente di fiducia e contenimento, introducendo traguardi accessibili e strategie didattiche fortemente inclusive.',
    'Pur non evidenziando gravi divari interni nei prerequisiti di base, che risultano discreti, la classe manifesta resistenze sul piano relazionale e un coinvolgimento molto fragile. Il lavoro quotidiano dovrà coniugare fermezza nelle regole, ascolto educativo e proposte didattiche graduate per evitare fenomeni di disaffezione scolastica.',
    'L’analisi iniziale rileva un gruppo classe sostanzialmente livellato su basi medie, ma frenato da tensioni relazionali e da una spiccata passività verso le richieste scolastiche. L’intervento integrato di consolidamento disciplinare ed educazione alla convivenza civile guiderà l’intera programmazione annuale.',
  ],

  'omogenea|fragile|sereno|attiva': [
    'La classe mostra una preparazione di base generalmente fragile ma omogenea, caratteristica che consente di impostare un intervento di recupero collettivo ben calibrato. Il clima relazionale sereno e la partecipazione attiva e fiduciosa degli alunni costituiscono un prezioso punto di forza per colmare gradualmente le lacune iniziali e consolidare il metodo di studio.',
    'Pur partendo da prerequisiti essenziali ancora incerti e uniformemente deboli, il gruppo affronta il percorso scolastico con atteggiamento collaborativo, rispetto delle regole e buona volontà partecipativa. Questo contesto positivo agevolerà l’avvio di azioni mirate di ripasso, guida passo passo e potenziamento delle abilità fondamentali.',
    'Dalle rilevazioni iniziali emerge una classe tranquilla, unita e desiderosa di partecipare, nonostante una preparazione pregressa fragile e diffusa. La disponibilità all’impegno e l’armonia relazionale rappresentano risorse decisive su cui costruire un recupero progressivo e duraturo delle competenze di base.',
  ],

  'omogenea|fragile|sereno|selettiva': [
    'Il gruppo evidenzia lacune diffuse e abbastanza omogenee nei prerequisiti disciplinari, inserite però in un clima relazionale sereno e accogliente. La motivazione degli alunni risulta selettiva e legata soprattutto ad attività pratiche, visive o guidate, che riducano il timore dell’errore. La didattica procederà per piccoli passi valorizzando ogni progresso individuale.',
    'La classe si colloca su un livello di partenza medio-basso e uniforme, pur mantenendo rapporti interpersonali corretti e distesi. Il coinvolgimento emerge in modo discontinuo, attivandosi quando le consegne appaiono accessibili e concrete. Sarà pertanto centrale semplificare i passaggi concettuali e adottare strumenti compensativi e mappe condivise per tutto il gruppo.',
    'Nonostante un clima d’aula calmo e rispettoso, gli studenti condividono fragilità cognitive omogenee e una partecipazione che necessita di stimoli mirati per restare viva. Una programmazione flessibile e ricca di esercitazioni guidate aiuterà a trasformare l’impegno occasionale in sicurezza operativa.',
  ],

  'omogenea|fragile|sereno|debole': [
    'La classe presenta un livello medio di preparazione fragile e uniforme, associato a un clima relazionale tranquillo ma a una partecipazione debole e spesso rinunciataria. Le difficoltà pregresse sembrano alimentare poca fiducia nelle proprie capacità. L’intervento educativo punterà innanzi tutto sul recupero dell’autostima scolastica mediante attività essenziali, graduate e fortemente incoraggianti.',
    'Dal punto di vista cognitivo gli alunni mostrano incertezze diffuse nei saperi di base, pur conservando un comportamento corretto e privo di conflittualità. La scarsa motivazione e l’atteggiamento passivo richiedono una didattica molto guidata, con verifiche formative frequenti che rendano visibili i progressi compiuti.',
    'L’osservazione iniziale segnala un gruppo sereno ma bisognoso di costante sostegno sia sul piano delle conoscenze fondamentali, omogeneamente fragili, sia su quello della spinta motivazionale. Compiti calibrati sui bisogni reali e frequenti momenti di lavoro assistito in aula sosterranno l’avvio del recupero.',
  ],

  'omogenea|fragile|vivace|attiva': [
    'Gli alunni condividono una preparazione iniziale fragile e piuttosto omogenea, ma si relazionano con vivacità e partecipano con slancio alle attività proposte, soprattutto quando coinvolti direttamente. Canalizzare questa buona disponibilità all’ascolto e all’azione entro regole chiare permetterà di organizzare un efficace recupero dei prerequisiti di base.',
    'Pur evidenziando carenze diffuse nelle competenze fondamentali, il gruppo dimostra vitalità relazionale e un apprezzabile desiderio di partecipare al dialogo in classe. Con una guida strutturata che contenga l’esuberanza e ordini i tempi del lavoro, la motivazione degli studenti diventerà il motore per colmare le fragilità di ingresso.',
    'La situazione di ingresso mostra basi didattiche fragili ma uniformi, accompagnate da un clima espressivo e da un buon coinvolgimento medio. Sarà opportuno sfruttare la disponibilità partecipativa con laboratori guidati e attività collaborative ben scandite, utili sia al consolidamento dei contenuti sia all’autoregolazione.',
  ],

  'omogenea|fragile|vivace|selettiva': [
    'La classe presenta una preparazione iniziale fragile e uniforme, inserita in un clima vivace e talora dispersivo che frena la continuità dell’attenzione. La partecipazione si manifesta in forma selettiva, concentrandosi sulle proposte più intuitive o pratiche mentre cede di fronte alle difficoltà teoriche. Occorreranno attività brevi, concrete e fortemente strutturate.',
    'Dalle osservazioni emerge un gruppo con bisogni diffusi di recupero nei saperi essenziali, dinamiche relazionali esuberanti e interesse altalenante. La gestione d’aula richiederà regole semplici ma costanti, affiancate da una didattica operativa capace di rendere accessibili i nuclei fondamentali della disciplina.',
    'L’analisi iniziale evidenzia lacune omogenee nella preparazione, unite a vivacità comportamentale e a un coinvolgimento discontinuo. Interventi didattici graduali, accompagnati da frequenti cambi di attività e da un costante feedback positivo, sosterranno sia l’ordine in aula sia il recupero delle abilità di base.',
  ],

  'omogenea|fragile|vivace|debole': [
    'La classe abbina una preparazione pregressa fragile e abbastanza omogenea a un clima vivace e poco orientato al compito, con motivazione debole verso il lavoro scolastico. L’attenzione tende a spostarsi facilmente sulle interazioni tra compagni. La progettazione dovrà fissare confini comportamentali chiari e proporre traguardi essenziali, accessibili e monitorati passo dopo passo.',
    'Sotto il profilo iniziale il gruppo manifesta diffuse fragilità nei prerequisiti, esuberanza relazionale e scarsa propensione all’impegno continuativo. Sarà prioritario impostare un lavoro molto guidato in aula, riducendo il carico espositivo e puntando su esercitazioni brevi che garantiscano esperienze di successo.',
    'Le difficoltà di base risultano omogenee nella classe, ma risultano accentuate da una vivacità diffusa e da un debole investimento motivazionale. Un’azione educativa paziente e coerente accompagnerà gli studenti verso il rispetto delle consegne e il graduale recupero delle competenze minime.',
  ],

  'omogenea|fragile|complesso|attiva': [
    'Nonostante prerequisiti di partenza omogeneamente fragili e un clima relazionale complesso che richiede mediazione costante, gli alunni mantengono una partecipazione attiva e una discreta apertura quando si sentono ascoltati e coinvolti. Questa disponibilità costituirà la base per avviare con serenità il recupero dei contenuti essenziali e migliorare le dinamiche del gruppo.',
    'La classe presenta bisogni formativi diffusi e fragilità relazionali evidenti, ma risponde con buona partecipazione alle proposte didattiche inclusive e concrete. L’integrazione tra obiettivi minimi ben calibrati e attività cooperative guidate aiuterà sia sul piano degli apprendimenti sia su quello della convivenza.',
    'Il quadro iniziale mostra un gruppo con lacune di base uniformi e relazioni delicate, ma animato da una sorprendente voglia di partecipare quando le attività risultano alla propria portata. La cura del clima educativo procederà di pari passo con un recupero sistematico dei saperi fondamentali.',
  ],

  'omogenea|fragile|complesso|selettiva': [
    'La classe evidenzia una preparazione di partenza fragile e uniforme, unita a un clima relazionale complesso e a una partecipazione selettiva. Gli studenti faticano ad affrontare lo studio sistematico e mostrano interesse solo in occasioni isolate, spesso frenati da tensioni interne. Sarà necessario un approccio fortemente inclusivo, graduale e supportato da regole chiare.',
    'I dati iniziali delineano un gruppo con diffuse carenze nei prerequisiti essenziali, equilibrio relazionale delicato e motivazione discontinua. La programmazione punterà a ristabilire un clima sicuro e a proporre attività essenziali, concrete e ben scandite, evitando sovraccarichi che accentuino frustrazione o oppositività.',
    'Sotto il profilo didattico-educativo la classe richiede un sostegno costante sia per colmare le fragilità di base omogenee sia per regolare i rapporti tra pari. L’adesione alle proposte è legata alla capacità del docente di dosare difficoltà e stimoli pratici entro una cornice educativa autorevole e accogliente.',
  ],

  'omogenea|fragile|complesso|debole': [
    'Il profilo iniziale della classe presenta complessità significative su più piani: preparazione di base omogeneamente fragile, clima relazionale teso e motivazione allo studio debole. L’azione educativa dovrà anzitutto costruire un contesto accogliente e strutturato, puntando su obiettivi essenziali, ritmi distesi e rinforzi positivi costanti per favorire il recupero e la serenità del gruppo.',
    'Gli alunni manifestano difficoltà diffuse nei saperi fondamentali, accompagnate da fragilità nelle relazioni interpersonali e da scarsa disponibilità all’impegno scolastico. La programmazione privilegerà i nuclei irrinunciabili della disciplina, ricorrendo a schemi essenziali, attività laboratoriali assistite e strategie quotidiane di inclusione e ascolto.',
    'L’analisi di partenza restituisce una situazione delicata, segnata da prerequisiti deboli in tutto il gruppo, conflittualità latente e demotivazione. Saranno fondamentali la collaborazione del Consiglio di Classe, la chiarezza delle regole condivise e una didattica personalizzata per piccoli traguardi raggiungibili.',
  ],

  // =========================================================================
  // 2. ETEROGENEITÀ: MODERATA (27 combinazioni)
  // =========================================================================

  'moderata|buono|sereno|attiva': [
    'La classe evidenzia un livello medio di preparazione buono, pur presentando una moderata eterogeneità nei ritmi di apprendimento e nella padronanza di alcune abilità. Il clima relazionale è sereno e collaborativo, e la partecipazione attiva della maggioranza consente sia di valorizzare gli alunni più sicuri sia di sostenere con naturalezza chi necessita di consolidamento.',
    'Dal profilo iniziale emerge un gruppo ben predisposto verso la disciplina, con basi mediamente solide e fisiologiche differenze tra fasce di livello. I rapporti improntati a rispetto e disponibilità reciproca, uniti a un’attiva partecipazione al dialogo educativo, favoriscono una didattica flessibile capace di integrare approfondimenti e attività di consolidamento.',
    'Sotto il profilo cognitivo gli alunni mostrano complessivamente una buona preparazione, pur articolandosi in ritmi di lavoro moderatamente differenziati. L’ambiente sereno e la vivace motivazione alle attività proposte offrono le condizioni ideali per promuovere forme di tutoring tra pari e percorsi progressivamente personalizzati.',
  ],

  'moderata|buono|sereno|selettiva': [
    'La classe possiede un livello medio di preparazione buono e un’eterogeneità moderata nei livelli di autonomia. Le relazioni risultano serene e ordinate, mentre la motivazione appare selettiva, attivandosi con decisione soprattutto nelle proposte operative o più vicine agli interessi dei ragazzi. La progettazione alternerà stimoli differenziati per sostenere la continuità dell’impegno di tutte le fasce.',
    'Gli studenti partono da basi mediamente solide, con fisiologiche diversità di ritmo e approfondimento, all’interno di un clima collaborativo. La partecipazione non mantiene sempre la stessa costanza nei compiti più teorici; saranno quindi valorizzate metodologie attive e attività calibrate per consolidare il metodo di lavoro in modo uniforme.',
    'L’osservazione iniziale delinea un gruppo tranquillo e ben preparato nella media, benché caratterizzato da una moderata articolazione interna e da interesse discontinuo. Proponendo compiti graduali e percorsi di lavoro diversificati per difficoltà, sarà possibile stimolare anche gli alunni meno coinvolti senza frenare i più autonomi.',
  ],

  'moderata|buono|sereno|debole': [
    'Il gruppo presenta una preparazione media buona e una moderata eterogeneità nei profili di apprendimento, inserite in un clima relazionale sereno ma segnato da partecipazione debole. Nonostante le buone risorse disponibili, la classe tende a un atteggiamento poco intraprendente. Occorrerà stimolare l’autonomia e la motivazione attraverso sfide didattiche mirate e lavori cooperativi a piccoli gruppi.',
    'Sul piano cognitivo gli alunni dispongono di basi apprezzabili, pur con alcune differenze nei tempi di esecuzione, e mantengono relazioni tranquille e rispettose. Tuttavia l’iniziativa personale e la partecipazione attiva risultano contenute. La didattica cercherà di coinvolgere direttamente gli studenti valorizzando i diversi stili cognitivi presenti.',
    'La classe si presenta ordinata e mediamente ben dotata di prerequisiti, con un’articolazione interna contenuta. L’elemento da potenziare riguarda la motivazione allo studio, attualmente debole e bisognosa di stimoli frequenti e significativi che aiutino ogni alunno a mettersi in gioco con maggiore sicurezza.',
  ],

  'moderata|buono|vivace|attiva': [
    'La classe mostra una preparazione media buona, accompagnata da una moderata eterogeneità di livelli e da un clima relazionale vivace. La partecipazione attiva e curiosa del gruppo costituisce una risorsa rilevante, purché venga guidata attraverso regole di interazione chiare che permettano anche agli alunni più riflessivi di trovare spazio e tempi adeguati.',
    'Gli alunni si collocano su buone basi disciplinari con normali scarti interni di autonomia e velocità esecutiva. L’ambiente d’aula è dinamico, comunicativo e molto partecipe alle proposte scolastiche. L’alternanza tra lavori di gruppo eterogenei e momenti di sintesi ordinata valorizzerà sia l’entusiasmo sia le diverse potenzialità presenti.',
    'Il quadro di partenza evidenzia buone capacità medie, una moderata differenziazione nei ritmi di studio e una spiccata vivacità partecipativa. Regolando l’esuberanza relazionale con consegne ben definite, il gruppo risponderà con efficacia a percorsi di approfondimento e consolidamento mirati.',
  ],

  'moderata|buono|vivace|selettiva': [
    'Il gruppo possiede un livello medio di preparazione buono e un’eterogeneità moderata tra chi procede con sicurezza e chi richiede qualche guida in più. Il clima è vivace e talora dispersivo, mentre la partecipazione varia sensibilmente in base al taglio delle attività. Strategie didattiche dinamiche e compiti a difficoltà graduata permetteranno di coinvolgere l’intera classe.',
    'Sotto il profilo cognitivo si riscontrano basi medie solide ma non del tutto uniformi, inserite in un tessuto relazionale esuberante e in una motivazione selettiva. Gli alunni più vivaci tendono a condizionare i tempi dell’aula quando l’interesse cala; per questo saranno privilegiate lezioni partecipate ma ben cadenzate.',
    'Dall’analisi iniziale emerge una classe con buone potenzialità complessive e differenze contenute nei livelli di partenza, caratterizzata però da attenzione discontinua ed esuberanza nei rapporti tra pari. La diversificazione delle proposte operative contribuirà a stabilizzare impegno e concentrazione.',
  ],

  'moderata|buono|vivace|debole': [
    'Pur disponendo di una preparazione media buona e di una moderata articolazione interna dei livelli, la classe manifesta una vivacità relazionale eccessiva rispetto a una motivazione allo studio piuttosto debole. Le energie degli studenti si disperdono spesso in dinamiche non pertinenti al lavoro scolastico. L’azione educativa punterà su regole chiare, consegne brevi e stimoli capaci di risvegliare l’interesse.',
    'Gli alunni evidenziano complessivamente prerequisiti discreti o buoni, con qualche fisiologica differenza nei ritmi, ma faticano a mantenere un’attenzione ordinata e un impegno costante. Il recupero della spinta partecipativa passerà attraverso attività pratiche e un monitoraggio attento della conduzione della classe.',
    'Il contesto iniziale unisce buone basi didattiche medie e moderata eterogeneità a un clima rumoroso e poco motivato. Sarà opportuno affiancare a una ferma gestione dei tempi d’aula strategie coinvolgenti e differenziate, così da riattivare il senso di responsabilità verso lo studio.',
  ],

  'moderata|buono|complesso|attiva': [
    'La classe presenta una preparazione media buona con moderata eterogeneità nei livelli di padronanza, e risponde con partecipazione attiva alle proposte disciplinari. Tuttavia il clima relazionale risulta complesso e attraversato da attriti che richiedono una mediazione educativa costante. Il lavoro scolastico sfrutterà il buon interesse verso la materia per consolidare cooperazione e rispetto reciproco.',
    'Nonostante dinamiche relazionali delicate tra sottogruppi, la classe mostra buone capacità medie, normali differenze nei ritmi di apprendimento e una positiva disponibilità a intervenire. Attività strutturate a ruoli definiti favoriranno l’inclusione e la serenità dei rapporti.',
    'L’osservazione iniziale mette in luce risorse cognitive soddisfacenti e una partecipazione viva, affiancate però da tensioni interpersonali che incidono sulla fluidità delle lezioni. La progettazione integrerà l’approfondimento dei contenuti con percorsi costanti di educazione alla collaborazione.',
  ],

  'moderata|buono|complesso|selettiva': [
    'Il gruppo evidenzia un livello medio buono con moderata differenziazione interna, ma risente di un clima relazionale complesso e di una motivazione selettiva. L’interesse degli studenti tende a calare di fronte a conflitti irrisolti o attività percepite come ripetitive. Una gestione educativa equilibrata e proposte didattiche calibrate sui diversi livelli aiuteranno a stabilizzare clima e impegno.',
    'Pur disponendo di prerequisiti mediamente validi, la classe fatica a lavorare in armonia e aderisce alle consegne in maniera discontinua. Sarà necessario curare con attenzione la formazione dei gruppi di lavoro, alternando attività guidate e compiti pratici di sicuro coinvolgimento.',
    'La situazione iniziale combina discrete risorse didattiche di base e moderata eterogeneità con fragilità relazionali e interesse altalenante. L’intervento educativo unirà chiarezza organizzativa e differenziazione delle proposte per prevenire dispersioni e tensioni.',
  ],

  'moderata|buono|complesso|debole': [
    'A fronte di una preparazione media buona e moderatamente eterogenea, la classe presenta un clima relazionale complesso e una motivazione allo studio debole. Le fatiche nella convivenza quotidiana si riflettono in un coinvolgimento ridotto e poco continuo. Sarà prioritario ristabilire un ambiente sereno e fiducioso, valorizzando i punti di forza di ciascuno con traguardi chiari e condivisi.',
    'Gli alunni possiedono potenzialità e conoscenze medie adeguate, ma stentano a tradurle in risultati costanti a causa di tensioni interne e scarso investimento emotivo verso la scuola. Un’azione educativa ferma ma accogliente accompagnerà la classe verso abitudini di collaborazione e partecipazione più mature.',
    'Il quadro di partenza evidenzia una discrepanza tra le buone premesse cognitive medie e le criticità sul piano relazionale e motivazionale. Percorsi didattici ben strutturati e attenzione costante alle dinamiche affettive costituiranno gli assi portanti del lavoro annuale.',
  ],

  'moderata|medio|sereno|attiva': [
    'La classe presenta una preparazione media discreta, con una moderata eterogeneità tra alunni già autonomi e altri che necessitano di rinforzo metodologico. Il clima relazionale sereno e la partecipazione attiva della maggioranza consentono di lavorare proficuamente, affiancando attività di consolidamento comune a esercitazioni differenziate per livello.',
    'Dalle rilevazioni iniziali emerge un gruppo ordinato, collaborativo e disponibile al dialogo educativo, con prerequisiti medi discreti e physiological differenze nei ritmi di apprendimento. Tali condizioni favoriscono una crescita graduale e armonica dell’intera classe.',
    'Gli studenti mostrano basi intermedie moderatamente diversificate, inserite in un contesto relazionale positivo e sorretto da buona motivazione. L’impostazione didattica valorizzerà lo spirito di collaborazione per rafforzare il metodo di studio e accompagnare ciascuno verso traguardi più solidi.',
  ],

  'moderata|medio|sereno|selettiva': [
    'Il gruppo evidenzia un livello medio discreto e una moderata eterogeneità nelle competenze di base, all’interno di un clima sereno e rispettoso. La motivazione e la partecipazione appaiono tuttavia selettive, manifestandosi soprattutto davanti a proposte operative o interattive. La programmazione utilizzerà linguaggi e compiti variati per sostenere con equilibrio sia i ritmi più rapidi sia quelli più lenti.',
    'La classe lavora in un’atmosfera tranquilla e collaborativa, partendo da conoscenze intermedie moderatamente differenziate. L’impegno tende a essere discontinuo in relazione alla tipologia di compito; attività laboratoriali e verifiche graduali aiuteranno a rendere più stabile la partecipazione.',
    'L’analisi di ingresso descrive una classe equilibrata sul piano relazionale, dotata di prerequisiti medi e fisiologiche differenze di autonomia, ma bisognosa di stimoli diversificati per superare un coinvolgimento altalenante. Strumenti visivi e percorsi graduati favoriranno progressi diffusi.',
  ],

  'moderata|medio|sereno|debole': [
    'La classe mostra una preparazione media discreta, moderatamente eterogenea, accompagnata da un clima relazionale sereno ma da una motivazione debole. Gli studenti tendono a mantenere un atteggiamento passivo e poco propositivo pur rispettando le regole dell’aula. L’intervento didattico introdurrà attività guidate e obiettivi a breve termine per incoraggiare l’iniziativa e la fiducia in sé.',
    'Nonostante la buona tenuta comportamentale e prerequisiti medi complessivamente accettabili, il gruppo fatica ad attivarsi con entusiasmo nelle proposte scolastiche e mostra alcune disomogeneità nel ritmo di lavoro. Strategie di didattica attiva e lavoro cooperativo mireranno a risvegliare l’interesse.',
    'Il profilo iniziale unisce rapporti interpersonali pacifici e competenze medie moderatamente differenziate a un impegno fragile e attendista. Il docente accompagnerà la classe con stimoli graduali e valorizzazione dei progressi individuali per rafforzare partecipazione e autonomia.',
  ],

  'moderata|medio|vivace|attiva': [
    'Il gruppo classe si colloca su un livello medio di preparazione discreto con moderata eterogeneità interna, animato da un clima relazionale vivace e da una partecipazione attiva. Gli studenti intervengono con entusiasmo alle attività, richiedendo tuttavia una guida attenta nell’organizzazione dei tempi di parola e nella tenuta della concentrazione durante il lavoro individuale.',
    'Le basi cognitive risultano intermedie e moderatamente diversificate, sostenute da curiosità e desiderio di partecipare. La naturale vivacità della classe, se ben indirizzata mediante lavori di gruppo e routine chiare, rappresenta un valido fattore di stimolo per il consolidamento delle abilità disciplinari.',
    'Dall’osservazione emerge una classe comunicativa, partecipe e complessivamente adeguata nei saperi essenziali, pur con fisiologiche differenze nei tempi di apprendimento. Un’impostazione ordinata ma dinamica consentirà di trasformare l’energia del gruppo in risultati progressivamente più sicuri.',
  ],

  'moderata|medio|vivace|selettiva': [
    'La classe presenta una preparazione media discreta e moderatamente eterogenea, in un contesto relazionale vivace e con partecipazione selettiva. L’attenzione si mantiene alta davanti ad attività pratiche o sfidanti, mentre cede facilmente alla chiacchiera nelle fasi meno coinvolgenti. La scansione flessibile delle lezioni e consegne graduate sosterranno l’impegno delle diverse fasce.',
    'Il quadro di partenza evidenzia conoscenze medie non del tutto uniformi, abbinate a esuberanza relazionale e a un interesse discontinuo verso lo studio. Alternare spiegazioni brevi, esercitazioni guidate e momenti di confronto regolato permetterà di migliorare concentrazione e continuità.',
    'Gli alunni mostrano livelli intermedi abbastanza differenziati, dinamiche di gruppo vivaci e una disponibilità all’impegno legata alla tipologia delle proposte. Una regia didattica chiara e variata favorirà l’autoregolazione e il consolidamento dei saperi fondamentali.',
  ],

  'moderata|medio|vivace|debole': [
    'Sotto il profilo iniziale la classe associa una preparazione media discreta e moderatamente eterogenea a un clima vivace e a una motivazione allo studio piuttosto debole. La tendenza alla distrazione e alla socializzazione spontanea ostacola l’impegno sistematico. Occorreranno regole chiare, attività brevi e fortemente guidate, nonché momenti di recupero mirato per le fasce più incerte.',
    'Il gruppo possiede competenze essenziali medie, differenziate nei ritmi di esecuzione, ma appare frenato da irrequietezza comportamentale e scarso investimento nello studio personale. Percorsi concreti con riscontri ravvicinati aiuteranno a riattivare attenzione e senso di responsabilità.',
    'L’analisi iniziale rileva un equilibrio fragile tra risorse cognitive intermedie e tenuta educativo-motivazionale, resa faticosa dalla vivacità dispersiva e dal debole interesse. La progettazione integrerà fermezza organizzativa e strategie didattiche altamente coinvolgenti.',
  ],

  'moderata|medio|complesso|attiva': [
    'La classe presenta un livello medio discreto e moderatamente eterogeneo, mostrando comunque una buona reattività partecipativa alle proposte disciplinari nonostante un clima relazionale complesso. Le tensioni presenti tra alcuni alunni richiedono mediazione costante; il lavoro didattico userà il coinvolgimento verso la materia per costruire modalità di confronto più serene.',
    'Pur attraversato da fragilità nei rapporti interpersonali, il gruppo risponde con partecipazione attiva alle lezioni e dispone di prerequisiti medi, seppur distribuiti su ritmi differenti. Attività cooperative ben regolate contribuiranno al miglioramento simultaneo di apprendimento e convivenza.',
    'Il quadro iniziale segnala competenze intermedie moderatamente variegate e una disponibilità apprezzabile al dialogo educativo, all’interno di un clima che necessita di guida ferma e accogliente. La personalizzazione dei compiti andrà di pari passo con l’educazione al rispetto reciproco.',
  ],

  'moderata|medio|complesso|selettiva': [
    'Il gruppo evidenzia una preparazione media discreta con moderata eterogeneità interna, ma risente di un clima relazionale complesso e di una partecipazione selettiva. Gli attriti tra compagni e la discontinuità dell’interesse richiedono una conduzione didattica strutturata, capace di alternare attività individuali tranquille a compiti operativi mirati.',
    'Le competenze di partenza si attestano su un livello medio moderatamente articolato, mentre sul piano relazionale emergono dinamiche faticose e un coinvolgimento altalenante. Percorsi chiari, differenziati nei livelli di difficoltà e sostenuti da regole condivise favoriranno una maggiore stabilità.',
    'L’osservazione iniziale fotografa una classe dall’impegno discontinuo e dalle relazioni delicate, sostenuta però da prerequisiti intermedi complessivamente recuperabili e consolidabili. L’azione educativa unirà attenzione alle dinamiche di gruppo e flessibilità metodologica.',
  ],

  'moderata|medio|complesso|debole': [
    'La situazione di partenza associa una preparazione media moderatamente eterogenea a un clima relazionale complesso e a una motivazione allo studio debole. Le difficoltà interpersonali e la scarsa adesione alle proposte scolastiche impongono un’azione educativa paziente e ben strutturata, orientata a ristabilire fiducia, regole chiare e percorsi graduali di consolidamento.',
    'Gli alunni mostrano basi intermedie ma poco valorizzate a causa di tensioni relazionali diffuse e di un atteggiamento passivo o oppositivo verso l’impegno didattico. La programmazione darà priorità ai nuclei essenziali, all’ascolto educativo e a strategie inclusive che prevengano l’abbandono dell’impegno.',
    'Il quadro complessivo segnala la necessità di affiancare al consolidamento dei contenuti disciplinari un lavoro sistematico sul clima di classe e sulla motivazione, attualmente fragile. Obiettivi accessibili e verifiche frequenti sosterranno la ripresa del gruppo.',
  ],

  'moderata|fragile|sereno|attiva': [
    'Pur presentando un livello medio di preparazione fragile con moderata eterogeneità nei ritmi e nelle lacune pregresse, la classe si distingue per un clima sereno e una partecipazione attiva. La disponibilità degli alunni a lasciarsi guidare e il rispetto reciproco creano le premesse migliori per un recupero efficace e graduale delle competenze di base.',
    'Il gruppo parte da prerequisiti mediamente incerti, differenziati tra chi necessita di maggiore supporto e chi mostra una discreta tenuta essenziale, ma compensa tali fragilità con interesse e comportamento collaborativo. La didattica procederà con chiarezza, utilizzando schemi e attività guidate per consolidare le basi.',
    'L’analisi iniziale rileva un contesto educativo sereno e partecipe, benché segnato da lacune diffuse nei saperi fondamentali. Valorizzando la motivazione degli studenti e calibrando gli esercizi sulle diverse esigenze, sarà possibile ottenere miglioramenti costanti nel corso dell’anno.',
  ],

  'moderata|fragile|sereno|selettiva': [
    'La classe evidenzia una preparazione media fragile e moderatamente eterogenea, inserita in un clima relazionale sereno e ordinato. La partecipazione emerge soprattutto quando le attività sono concrete, visive e alla portata di tutti, mentre tende a calare davanti a compiti più astratti. Una didattica per piccoli passi e strumenti di supporto visivo sosterranno l’intero gruppo.',
    'Sotto il profilo cognitivo si riscontrano incertezze diffuse con normali differenze individuali, all’interno di un ambiente tranquillo ma caratterizzato da interesse selettivo. Proposte operative graduate permetteranno di coinvolgere gli studenti più esitanti e di consolidare gradualmente il metodo di studio.',
    'Il quadro di ingresso mostra relazioni positive abbinate a prerequisiti medio-bassi e a una motivazione discontinua. La programmazione priviligerà i nuclei fondanti della disciplina, facendo leva sulle attività laboratoriali per trasformare l’interesse saltuario in impegno più regolare.',
  ],

  'moderata|fragile|sereno|debole': [
    'Il gruppo presenta una preparazione iniziale fragile e moderatamente articolata, unita a un clima relazionale sereno ma a una motivazione debole. Le difficoltà pregresse incidono sulla sicurezza personale degli alunni, generando un atteggiamento passivo verso le richieste scolastiche. L’azione didattica punterà sul recupero graduale dei prerequisiti e su frequenti rinforzi positivi.',
    'Pur in assenza di problematiche comportamentali o conflitti relazionali, la classe fatica ad attivarsi nello studio e mostra lacune diffuse, seppur di diversa entità tra gli studenti. Saranno adottati percorsi semplificati, attività guidate in aula e obiettivi minimi chiari per favorire la ripresa.',
    'L’osservazione iniziale restituisce una classe calma ma bisognosa di forte accompagnamento motivazionale e metodologico per colmare le fragilità di ingresso. Un clima incoraggiante e verifiche calibrate consentiranno di costruire progressivamente maggiore fiducia e autonomia.',
  ],

  'moderata|fragile|vivace|attiva': [
    'La classe evidenzia un livello medio di preparazione fragile con moderata eterogeneità interna, ma mostra un clima vivace e una partecipazione attiva alle attività proposte. Se guidata con regole chiare che aiutino a gestire l’impulsività, questa buona predisposizione al coinvolgimento renderà più agevole il recupero delle abilità di base.',
    'Nonostante diffuse lacune nei saperi preliminari, gli alunni reagiscono con vivacità e slancio agli stimoli didattici, partecipando volentieri soprattutto nei momenti di confronto e laboratorio. L’organizzazione ordinata dei tempi di lavoro consentirà di consolidare conoscenze e metodo.',
    'Il profilo iniziale unisce bisogni formativi significativi nei prerequisiti essenziali a un gruppo vitale, espressivo e disposto a mettersi in gioco. Attività cooperative e strutturate canalizzeranno positivamente l’energia verso il recupero e la crescita comune.',
  ],

  'moderata|fragile|vivace|selettiva': [
    'Il gruppo parte da una preparazione fragile e moderatamente eterogenea, in un clima vivace che spesso riduce la tenuta attentiva. La partecipazione risulta selettiva e legata alla concretezza immediata delle proposte. Sarà pertanto necessario alternare consegne brevi e molto strutturate con momenti operativi, sostenendo al contempo la regolazione dei comportamenti.',
    'Dall’analisi iniziale emergono carenze nei prerequisiti essenziali, dinamiche relazionali esuberanti e una motivazione discontinua. Interventi di recupero guidati in classe e una chiara scansione delle routine scolastiche favoriranno attenzione, ordine e apprendimento progressivo.',
    'La classe presenta fragilità cognitive medio-basse differenziate per ritmo e un’esuberanza che rende saltuario il coinvolgimento didattico. La progettazione adotterà mediatori concreti, mappe e attività pratiche per ancorare l’interesse e consolidare i contenuti minimi.',
  ],

  'moderata|fragile|vivace|debole': [
    'La situazione di partenza vede una preparazione fragile e moderatamente eterogenea associata a un clima vivace ma dispersivo e a una motivazione debole. Gli alunni incontrano difficoltà sia nella tenuta dell’attenzione sia nell’esecuzione autonoma dei compiti. Occorreranno una conduzione ferma e rassicurante e un recupero sistematico basato su obiettivi essenziali.',
    'Sotto il profilo educativo-didattico il gruppo richiede interventi costanti per contenere l’irrequietezza relazionale e compensare le lacune di base con strategie molto guidate. L’assenza di una spinta motivazionale autonoma verrà affrontata con attività brevi, concrete e frequenti riscontri positivi.',
    'L’osservazione iniziale segnala fragilità pregresse diffuse, scarso interesse per lo studio e vivacità non sempre costruttiva. La programmazione si concentrerà sulle competenze irrinunciabili, curando contestualmente l’acquisizione delle regole fondamentali del lavoro scolastico.',
  ],

  'moderata|fragile|complesso|attiva': [
    'La classe mostra una preparazione media fragile e moderatamente diversificata, inserita in un clima relazionale complesso; nonostante ciò, la partecipazione alle attività proposte si mantiene complessivamente attiva. Questo spiraglio positivo permetterà di impostare un percorso di recupero delle conoscenze essenziali parallelamente a un costante lavoro educativo sulle relazioni.',
    'Pur presentando lacune di base e dinamiche interpersonali delicate che richiedono attenzione quotidiana, gli alunni dimostrano disponibilità a partecipare quando vengono accolti e guidati con chiarezza. La combinazione tra attività inclusive e mediazione relazionale sosterrà il cammino del gruppo.',
    'Il quadro di ingresso contrappone fragilità cognitive e attriti relazionali a una discreta vitalità partecipativa verso le proposte didattiche. Sfruttando tale disponibilità con lavori guidati a piccoli gruppi, si lavorerà sia sul recupero dei prerequisiti sia sulla coesione della classe.',
  ],

  'moderata|fragile|complesso|selettiva': [
    'Il gruppo evidenzia un livello di preparazione fragile e moderatamente eterogeneo, accompagnato da un clima relazionale complesso e da una partecipazione selettiva. Le difficoltà pregresse e le tensioni tra pari rendono discontinua l’adesione alle proposte scolastiche. Sarà fondamentale creare un contesto sicuro, prevedibile e inclusivo, articolato su compiti essenziali e graduali.',
    'Dalle rilevazioni emergono bisogni formativi importanti, relazioni faticose da gestire e un interesse che si accende solo davanti a stimoli pratici e ben calibrati. La didattica ridurrà i fattori di stress cognitivo mediante schemi guidati e lavorerà con costanza sul rispetto delle regole.',
    'La classe richiede un accompagnamento educativo attento su tutti i fronti: consolidamento dei saperi minimi, regolazione di un clima complesso e stabilizzazione di una motivazione oggi incerta. Percorsi essenziali e chiarezza nelle aspettative guideranno l’intero anno.',
  ],

  'moderata|fragile|complesso|debole': [
    'La situazione di ingresso risulta particolarmente delicata, poiché combina una preparazione fragile e moderatamente eterogenea con un clima relazionale complesso e una motivazione allo studio debole. La programmazione priviligerà i traguardi essenziali della disciplina, puntando prima di tutto su ascolto, contenimento educativo, attività guidate in classe e piccoli passi capaci di restituire fiducia.',
    'Gli alunni mostrano diffuse carenze nei prerequisiti, fatiche nella convivenza quotidiana e un coinvolgimento molto fragile nei compiti scolastici. Sarà indispensabile un’azione coordinata tra i docenti, fondata su regole chiare, didattica laboratoriale semplificata e valorizzazione di ogni minimo progresso.',
    'L’analisi iniziale mette in luce criticità integrate sul piano cognitivo, relazionale e motivazionale. Per contrastare disaffezione e conflittualità si adotteranno strategie fortemente inclusive, mediatori facilitanti e un’organizzazione stabile delle attività d’aula.',
  ],

  // =========================================================================
  // 3. ETEROGENEITÀ: ELEVATA (27 combinazioni)
  // =========================================================================

  'elevata|buono|sereno|attiva': [
    'La classe presenta una preparazione media complessivamente buona, ma caratterizzata da una spiccata eterogeneità interna che vede convivere alunni molto sicuri e altri bisognosi di consolidamento guidato. Il clima relazionale sereno e la partecipazione attiva consentono di attivare con successo metodologie di tutoring tra pari e percorsi differenziati per fasce di livello.',
    'Sotto il profilo didattico il gruppo dispone di buone risorse medie pur mostrando ampie differenze nei ritmi di apprendimento e nell’autonomia di studio. L’ambiente collaborativo e il vivo interesse verso la disciplina facilitano la personalizzazione dell’insegnamento, permettendo di proporre approfondimenti ai più rapidi senza lasciare indietro chi procede con passo più graduale.',
    'L’osservazione iniziale fotografa una classe fortemente variegata nei livelli di partenza, pur su una media generale buona, sorretta da relazioni distese e partecipazione costante. La progettualità punterà sulla didattica modulare e sul lavoro per gruppi di livello o cooperativi per valorizzare tutte le potenzialità presenti.',
  ],

  'elevata|buono|sereno|selettiva': [
    'Il gruppo evidenzia un livello medio di preparazione buono, accompagnato però da un’elevata eterogeneità tra eccellenze autonome e studenti con bisogni di supporto più marcati. Il clima è sereno e rispettoso, mentre la motivazione risulta selettiva e sensibile al tipo di proposta. La differenziazione delle attività e l’alternanza di compiti pratici e guidati favoriranno un coinvolgimento equilibrato di tutte le fasce.',
    'Pur partendo da una media didattica soddisfacente, la classe richiede attenzione alla forte varietà dei ritmi cognitivi presenti. Le buone relazioni in aula favoriscono la serenità del lavoro, mentre l’impegno discontinuo verrà sostenuto attraverso consegne graduali e attività interattive capaci di stimolare sia i più brillanti sia chi necessita di guida.',
    'L’analisi iniziale rileva un gruppo ordinato e mediamente ben preparato, ma molto differenziato al proprio interno e con partecipazione legata alla natura degli stimoli. La programmazione integrerà strategie inclusive e sfide cognitive differenziate per mantenere viva l’attenzione lungo tutto il percorso.',
  ],

  'elevata|buono|sereno|debole': [
    'La classe mostra una preparazione media buona, ma molto disomogenea tra alunni già sicuri e altri con prerequisiti più incerti. A fronte di un clima relazionale tranquillo e corretto, la motivazione e la partecipazione medie risultano deboli, rendendo necessario sollecitare l’iniziativa personale sia attraverso stimoli di approfondimento sia mediante attività assistite per le fasce più fragili.',
    'Nonostante il buon potenziale medio complessivo e la serenità dei rapporti interpersonali, il gruppo soffre una forte eterogeneità interna e una scarsa propensione alla partecipazione attiva. Una didattica diversificata, ricca di compiti concreti e riscontri incoraggianti, mirerà a riattivare interesse e autonomia a tutti i livelli.',
    'Il quadro di partenza evidenzia una classe pacifica ma poco coinvolta sul piano motivazionale, con divari accentuati nei ritmi e nelle abilità di studio pur su una media soddisfacente. L’intervento educativo valorizzerà la collaborazione serena per stimolare protagonismo e senso di autoefficacia.',
  ],

  'elevata|buono|vivace|attiva': [
    'Pur collocandosi su una preparazione media buona, la classe presenta un’elevata eterogeneità di competenze e stili cognitivi, abbinata a un clima relazionale vivace e a una partecipazione attiva. La gestione richiede particolare equilibrio per offrire sfide adeguate ai più veloci, garantire sostegno ai più lenti e regolare con chiarezza l’esuberanza degli interventi in aula.',
    'Il gruppo risulta molto dinamico, curioso e partecipe, con una base media solida ma distribuita in modo fortemente differenziato tra gli studenti. Canalizzare la vivacità in attività cooperative strutturate permetterà di trasformare le diversità interne in risorsa di crescita reciproca.',
    'L’analisi iniziale descrive una classe ricca di stimoli, vivace nelle relazioni e mediamente ben preparata, ma segnata da ritmi di apprendimento molto distanti tra loro. Con una regia attenta all’inclusione e al rispetto dei tempi comuni, l’entusiasmo partecipativo sosterrà ottimi progressi.',
  ],

  'elevata|buono|vivace|selettiva': [
    'La classe evidenzia un livello medio buono ma fortemente eterogeneo al proprio interno, inserito in un clima vivace e con motivazione selettiva. Gli alunni più rapidi tendono a perdere attenzione se non adeguatamente stimolati, mentre chi ha bisogno di consolidamento può faticare nel contesto rumoroso. La didattica organizzerà attività scaglionate per difficoltà e tempi definiti di lavoro.',
    'Sotto il profilo iniziale coesistono competenze molto avanzate e situazioni più incerte su una media complessivamente positiva, in un’aula esuberante e dal coinvolgimento discontinuo. Lavori per gruppi flessibili e proposte operative variegate consentiranno di coinvolgere in modo mirato tutte le componenti del gruppo.',
    'Il profilo iniziale unisce buone potenzialità medie a marcate differenze individuali, vivacità relazionale e partecipazione a tratti. Una programmazione modulata su più livelli e accompagnata da regole comunicative chiare aiuterà a valorizzare ogni studente evitando dispersioni.',
  ],

  'elevata|buono|vivace|debole': [
    'Nonostante una preparazione media buona, la classe presenta un’eterogeneità elevata nei livelli di partenza, unita a un clima vivace e a una motivazione allo studio debole. La coesistenza di ritmi molto diversi in un ambiente esuberante e poco propenso all’impegno rischia di rallentare i più sicuri e scoraggiare i più fragili; occorreranno pertanto forte strutturazione delle lezioni e percorsi differenziati.',
    'Gli alunni mostrano capacità medie apprezzabili ma distribuite in modo disomogeneo, accompagnate da irrequietezza relazionale e scarsa partecipazione produttiva. L’azione educativa punterà su regole ferme di convivenza e su attività brevi, differenziate e motivanti.',
    'L’osservazione iniziale segnala un contrasto tra le risorse medie disponibili e la fragilità motivazionale del gruppo, aggravata da esuberanza e divari interni notevoli. Sarà centrale costruire routine ordinate e proporre traguardi personalizzati capaci di coinvolgere ogni fascia.',
  ],

  'elevata|buono|complesso|attiva': [
    'La classe abbina una preparazione media buona ma altamente eterogenea a una partecipazione attiva alle attività, all’interno però di un clima relazionale complesso. La presenza di competenze così diverse richiede un’attenta mediazione educativa affinché la vivacità del confronto non generi competizione o esclusione, ma evolva verso forme guidate di aiuto reciproco.',
    'Pur disponendo di buone risorse medie e di interesse verso le proposte didattiche, il gruppo risente di forti divari interni e di tensioni relazionali tra sottogruppi. La progettazione utilizzerà l’energia partecipativa per favorire percorsi cooperativi protetti e rispettosi delle differenze.',
    'Il profilo iniziale mette in luce un contesto stimolante sul piano partecipativo e positivo nei livelli medi, reso però impegnativo dalla notevole eterogeneità e dalla complessità dei rapporti interpersonali. Regole condivise e attività calibrate per livello tuteleranno clima e apprendimenti.',
  ],

  'elevata|buono|complesso|selettiva': [
    'Il gruppo presenta una preparazione media buona ma molto eterogenea, un clima relazionale complesso e una motivazione selettiva. Gli attriti interni e la grande distanza tra le diverse fasce di apprendimento rendono difficile mantenere un ritmo unitario senza una chiara personalizzazione. L’insegnamento alternerà lavori strutturati per livelli a interventi costanti sul clima di classe.',
    'Sotto il profilo iniziale si osservano potenzialità medie valide ma distribuite in maniera molto diseguale, in un contesto emotivo-relazionale delicato e dal coinvolgimento altalenante. Percorsi ben graduati e un’attenta gestione delle dinamiche di gruppo limiteranno frustrazioni e conflitti.',
    'L’analisi iniziale rivela una classe articolata su livelli molto distanti, con relazioni tese e interesse discontinuo. Una guida educativa equilibrata, capace di combinare chiarezza delle norme e stimoli differenziati, permetterà a ciascuno di trovare il proprio spazio di crescita.',
  ],

  'elevata|buono|complesso|debole': [
    'Pur potendo contare su una preparazione media buona, la classe soffre di un’elevata eterogeneità interna, di un clima relazionale complesso e di una motivazione allo studio debole. Le tensioni tra compagni e la distanza nei livelli di autonomia frenano il coinvolgimento generale. L’intervento didattico dovrà ristabilire un patto educativo chiaro, sostenendo i più fragili e stimolando chi possiede maggiori risorse.',
    'Il quadro di partenza evidenzia forti divari cognitivi accanto a fragilità relazionali e disimpegno diffuso, nonostante una media di base soddisfacente. Sarà prioritario costruire un clima sereno e sicuro attraverso consegne calibrate, regole ferme ma accoglienti e valorizzazione dei singoli contributi.',
    'L’osservazione segnala una classe complessa da equilibrare, nella quale risorse medie positive restano parzialmente inespresse a causa di conflitti relazionali e scarsa motivazione. Una didattica fortemente personalizzata e attenta agli aspetti socio-affettivi guiderà l’azione annuale.',
  ],

  'elevata|medio|sereno|attiva': [
    'La classe presenta una preparazione media discreta caratterizzata da una marcata eterogeneità tra studenti con buone abilità e altri con lacune da colmare. Il clima relazionale sereno e la partecipazione attiva rappresentano un’ottima base per attuare didattica personalizzata, lavoro cooperativo in gruppi eterogenei e percorsi graduali di consolidamento e potenziamento.',
    'Dall’analisi iniziale emerge un gruppo fortemente variegato nei ritmi di apprendimento, pur su una fascia media discreta, sorretto però da relazioni positive e vivo interesse scolastico. Questa disponibilità rende agevole differenziare i materiali di lavoro mantenendo un clima coeso e rispettoso.',
    'Gli alunni si collocano complessivamente su un livello medio discreto ma con ampie oscillazioni individuali, manifestando al contempo serenità nei rapporti e partecipazione costante. La progettazione valorizzerà il mutuo aiuto e l’articolazione per livelli per garantire progressi a tutti.',
  ],

  'elevata|medio|sereno|selettiva': [
    'Il gruppo evidenzia un livello medio di preparazione discreto accompagnato da un’elevata eterogeneità nelle competenze di ingresso. Il clima è sereno e collaborativo, mentre la partecipazione risulta selettiva, attivandosi soprattutto davanti a compiti pratici e differenziati per grado di difficoltà. Saranno impiegati materiali graduati e metodologie variegate per sostenere l’impegno di tutte le fasce.',
    'Nonostante la tranquillità del contesto relazionale e basi medie recuperabili, la classe presenta distanze significative nei livelli di autonomia e un interesse discontinuo. Alternando proposte operative accessibili ad approfondimenti mirati, sarà possibile mantenere viva l’attenzione sia dei più sicuri sia dei più incerti.',
    'L’osservazione iniziale fotografa una classe pacifica ma molto diversificata al suo interno e dal coinvolgimento altalenante. Una didattica flessibile, attenta ai diversi stili cognitivi, aiuterà a rendere più costante la partecipazione e a ridurre i divari iniziali.',
  ],

  'elevata|medio|sereno|debole': [
    'La classe mostra una preparazione media discreta ma fortemente eterogenea, inserita in un clima sereno e ordinato nel quale tuttavia prevale una motivazione allo studio debole. Le differenze nei ritmi di lavoro richiedono un’attenta personalizzazione, mentre l’atteggiamento passivo verrà contrastato con attività cooperative, traguardi accessibili e valorizzazione dei progressi individuali.',
    'Pur caratterizzato da relazioni corrette e da prerequisiti medi accettabili, il gruppo presenta marcate disparità interne e scarso slancio partecipativo. L’azione didattica punterà su proposte concrete e differenziate, accompagnate da un incoraggiamento costante per stimolare l’autonomia di ciascuno.',
    'Il profilo iniziale unisce tranquillità comportamentale e livelli cognitivi molto vari, su una media intermedia, a un debole investimento emotivo nelle attività scolastiche. Interventi graduati e riscontri puntuali favoriranno una partecipazione più attiva e consapevole.',
  ],

  'elevata|medio|vivace|attiva': [
    'Il gruppo classe si colloca su una preparazione media discreta, ma con un’elevata eterogeneità interna che si accompagna a un clima vivace e a una partecipazione attiva. La varietà dei livelli e l’esuberanza comunicativa degli studenti richiedono una regia attenta, capace di strutturare compiti differenziati entro tempi di lavoro ben regolati.',
    'Gli alunni dimostrano curiosità e buona volontà partecipativa su basi medie molto differenziate tra chi necessita di recupero guidato e chi procede con speditezza. Canalizzare la vivacità relazionale in attività di gruppo ben organizzate consentirà di sostenere sia la coesione sia il consolidamento disciplinare.',
    'L’analisi iniziale restituisce una classe vitale e partecipe, con competenze medie discrete ma fortemente disomogenee. Una didattica attiva ma rigorosa nei tempi d’aula permetterà di rispondere efficacemente ai bisogni di potenziamento e recupero presenti.',
  ],

  'elevata|medio|vivace|selettiva': [
    'La classe presenta un livello medio discreto ma fortemente eterogeneo, un clima vivace e una partecipazione selettiva. La coesistenza di esigenze cognitive molto distanti, in un contesto esuberante e dall’interesse discontinuo, richiede lezioni dinamiche, consegne chiare e differenziate, nonché frequenti verifiche formative per evitare dispersioni.',
    'Dalle rilevazioni emergono divari evidenti nelle abilità di base, relazioni movimentate e un’attenzione che si accende soprattutto in attività pratiche e visive. Strutturare i gruppi di lavoro con ruoli definiti favorirà sia la tenuta comportamentale sia il coinvolgimento delle diverse fasce.',
    'Il quadro di ingresso combina basi medie disomogenee con vivacità relazionale e motivazione altalenante. La programmazione adotterà strategie flessibili e mediatori molteplici per raggiungere contemporaneamente gli studenti più fragili e quelli più autonomi.',
  ],

  'elevata|medio|vivace|debole': [
    'Il gruppo evidenzia una preparazione media discreta ma altamente eterogenea, affiancata da un clima relazionale vivace e da una motivazione allo studio debole. L’esuberanza comportamentale e l’ampio scarto tra i livelli rendono complesso il lavoro frontale tradizionale; si privilegeranno pertanto attività brevi, strutturate e personalizzate, con regole d’aula chiare e condivise.',
    'Sotto il profilo iniziale la classe fatica a mantenere concentrazione e continuità nell’impegno, mostrando forte disomogeneità nei prerequisiti e vivacità spesso dispersiva. Un intervento educativo fermo ma incoraggiante accompagnerà gli studenti verso una maggiore responsabilità nello studio.',
    'L’osservazione mette in luce l’esigenza di conciliare bisogni cognitivi molto distanti in un clima vivace e poco motivato. Percorsi graduati sui nuclei essenziali e un monitoraggio ravvicinato in aula sosterranno il miglioramento dell’attenzione e dei risultati.',
  ],

  'elevata|medio|complesso|attiva': [
    'La classe presenta una preparazione media discreta ma segnata da elevata eterogeneità, all’interno di un clima relazionale complesso che richiede mediazione costante; tuttavia, la partecipazione alle attività proposte rimane buona e attiva. L’azione didattica farà leva su questa disponibilità per costruire dinamiche di collaborazione più serene e ridurre progressivamente i divari di partenza.',
    'Nonostante tensioni interne tra sottogruppi e forti differenze nei livelli di apprendimento, gli alunni rispondono con partecipazione quando sono coinvolti in compiti chiari e significativi. Attività inclusive a ruoli guidati aiuteranno a coniugare crescita cognitiva ed educazione alla convivenza.',
    'Il profilo iniziale affianca competenze medie molto differenziate e relazioni delicate a un discreto slancio partecipativo. La gestione equilibrata del clima d’aula e la personalizzazione dei percorsi costituiranno i cardini dell’intervento educativo.',
  ],

  'elevata|medio|complesso|selettiva': [
    'Il gruppo mostra una preparazione media discreta ma altamente eterogenea, abbinata a un clima relazionale complesso e a una motivazione selettiva. I divari nei ritmi cognitivi rischiano di accentuare tensioni o disinteresse se non gestiti con proposte calibrate. Sarà necessario un impianto didattico ben strutturato, ricco di compiti graduali e attenzione alle dinamiche emotive della classe.',
    'Le rilevazioni iniziali delineano una classe complessa sia per la distanza tra le fasce di livello sia per la fragilità dei rapporti interni e la discontinuità dell’impegno. Routine didattiche stabili e attività pratiche differenziate sosterranno sia l’ordine sia l’apprendimento.',
    'La classe richiede un’azione educativa costante volta a contenere gli attriti relazionali, stabilizzare la partecipazione attraverso stimoli concreti e rispondere con flessibilità alla forte eterogeneità cognitiva presente.',
  ],

  'elevata|medio|complesso|debole': [
    'La situazione di partenza combina una preparazione media discreta ma fortemente disomogenea con un clima relazionale complesso e una motivazione allo studio debole. Le difficoltà nei rapporti tra pari e il divario tra le fasce richiedono una guida educativa ferma e accogliente, unita a una personalizzazione attenta per evitare che gli alunni più fragili si sentano esclusi o rinunciatari.',
    'Gli alunni manifestano scarso investimento nello studio, dinamiche interpersonali conflittuali e livelli di partenza molto distanti tra loro. La programmazione punterà su obiettivi essenziali ben graduati, regole condivise e strategie inclusive capaci di ricostruire fiducia e collaborazione.',
    'L’analisi iniziale restituisce un quadro educativo articolato e impegnativo, in cui la disomogeneità cognitiva si somma a fragilità relazionali e demotivazione. Un lavoro coordinato su clima d’aula, recupero mirato e consolidamento metodologico guiderà l’intero anno scolastico.',
  ],

  'elevata|fragile|sereno|attiva': [
    'La classe presenta un livello medio di preparazione fragile e caratterizzato da elevata eterogeneità, con alunni bisognosi di un intenso recupero di base accanto ad altri più autonomi. Il clima relazionale sereno e la partecipazione attiva offrono tuttavia condizioni molto favorevoli per attuare percorsi di recupero mirato, tutoring tra pari e didattica laboratoriale inclusiva.',
    'Pur partendo da prerequisiti mediamente deboli e molto differenziati, il gruppo affronta il lavoro scolastico con rispetto reciproco e buona disponibilità al dialogo educativo. Valorizzando questa attitudine positiva e graduando con cura le consegne, sarà possibile colmare molte lacune iniziali.',
    'L’osservazione evidenzia un contesto accogliente e partecipe nel quale convivono fragilità cognitive accentuate e livelli più solidi. L’organizzazione di attività per gruppi flessibili e il sostegno metodologico costante aiuteranno ciascun alunno a progredire dal proprio livello di partenza.',
  ],

  'elevata|fragile|sereno|selettiva': [
    'Il gruppo mostra una preparazione media fragile e fortemente eterogenea, inserita in un clima relazionale sereno ma segnato da partecipazione selettiva. Gli studenti rispondono meglio alle proposte concrete e accessibili, mentre faticano davanti a compiti complessi o non graduati. Sarà centrale affiancare schemi facilitanti e attività pratiche a esercitazioni differenziate per fascia di livello.',
    'Nonostante la serenità dei rapporti in aula, la classe evidenzia lacune diffuse molto articolate per gravità e un interesse che si attiva solo su stimoli mirati. Una didattica per piccoli passi, attenta ai diversi stili cognitivi, sosterrà la ripresa della motivazione e dei saperi essenziali.',
    'L’analisi di ingresso descrive un gruppo tranquillo ma bisognoso di forte personalizzazione per far fronte sia alle fragilità di base eterogenee sia all’impegno discontinuo. Lavori guidati in classe e mediatori visivi accompagneranno l’intero percorso.',
  ],

  'elevata|fragile|sereno|debole': [
    'La classe evidenzia un livello medio di preparazione fragile ed elevata eterogeneità interna, abbinati a un clima sereno ma a una motivazione allo studio debole. Le difficoltà pregresse, pur distribuite in modo diverso tra gli alunni, generano spesso insicurezza e passività. L’intervento educativo punterà su obiettivi essenziali personalizzati, lavoro assistito e costante incoraggiamento.',
    'Pur senza tensioni relazionali rilevanti, il gruppo richiede un accompagnamento didattico intenso per colmare lacune molto differenziate e risvegliare una partecipazione oggi fragile. Proposte chiare, accessibili e monitorate in aula favoriranno gradualmente autonomia e autostima.',
    'Il profilo iniziale mette in luce un contesto calmo ma segnato da fragilità cognitive diffuse e scarso slancio verso lo studio. Una programmazione molto attenta all’inclusione, articolata su traguardi minimi condivisi e stimoli graduati, sosterrà il recupero del gruppo.',
  ],

  'elevata|fragile|vivace|attiva': [
    'Pur partendo da una preparazione media fragile e altamente eterogenea, la classe mostra un clima vivace e una partecipazione attiva alle attività scolastiche. Se opportunamente guidata nella gestione dei tempi e dei turni di intervento, questa energia partecipativa faciliterà la realizzazione di laboratori inclusivi e percorsi differenziati di recupero e consolidamento.',
    'Gli alunni presentano livelli iniziali molto disomogenei su una fascia media fragile, compensati però da curiosità, slancio espressivo e volontà di partecipare. Attività cooperative ben strutturate permetteranno di canalizzare la vivacità in apprendimenti concreti e condivisi.',
    'L’osservazione iniziale fotografa un gruppo bisognoso di consolidamento nei saperi fondamentali ma reattivo e coinvolto nel dialogo educativo. Regole chiare e materiali graduati consentiranno di valorizzare la partecipazione sostenendo in particolare chi incontra maggiori difficoltà.',
  ],

  'elevata|fragile|vivace|selettiva': [
    'La classe presenta una preparazione media fragile ed elevata eterogeneità, accompagnate da un clima vivace e da partecipazione selettiva. L’esuberanza relazionale e la forte distanza tra i livelli attentivi e cognitivi rendono indispensabili attività brevi, concrete e fortemente differenziate, integrate da una guida d’aula chiara e costante.',
    'Dalle rilevazioni emergono bisogni di recupero molto diversificati, dinamiche comportamentali vivaci e un coinvolgimento legato all’attrattività immediata delle consegne. L’alternanza tra lavori guidati e momenti operativi aiuterà a contenere la dispersione e a consolidare i contenuti essenziali.',
    'Il quadro di partenza associa fragilità di base eterogenee a vivacità diffusa e impegno intermittente. La progettazione privilegerà i nuclei fondanti della disciplina, adottando strategie attive, mappe di sintesi e gruppi di lavoro calibrati.',
  ],

  'elevata|fragile|vivace|debole': [
    'Il gruppo evidenzia un livello medio fragile e fortemente eterogeneo, un clima vivace spesso dispersivo e una motivazione allo studio debole. La gestione richiede particolare cura nel fissare regole di lavoro ordinate e nel proporre compiti essenziali, brevi e personalizzati, così da contenere l’irrequietezza e sostenere chi manifesta maggiori difficoltà nei prerequisiti.',
    'Sotto il profilo iniziale si riscontrano ampie lacune disciplinari differenziate per gravità, esuberanza relazionale e scarso investimento nelle attività scolastiche. L’azione didattica punterà su interventi molto guidati in classe e sul rinforzo sistematico dei comportamenti positivi.',
    'L’analisi iniziale rivela fragilità integrate sul piano delle conoscenze, dell’autoregolazione e della spinta motivazionale, in un gruppo molto eterogeneo. Obiettivi essenziali chiari e verifiche graduali accompagneranno il percorso di recupero.',
  ],

  'elevata|fragile|complesso|attiva': [
    'La classe presenta una preparazione media fragile e altamente eterogenea all’interno di un clima relazionale complesso, pur conservando una partecipazione attiva quando stimolata con proposte adeguate. Questa apertura al dialogo educativo costituisce un’importante risorsa per impostare percorsi differenziati di recupero e migliorare gradualmente la tenuta delle relazioni tra compagni.',
    'Pur affrontando lacune di base accentuate e dinamiche interpersonali delicate, il gruppo dimostra una discreta disponibilità a partecipare alle attività inclusive e pratiche. La progettazione affiancherà al lavoro sui nuclei essenziali azioni continue di mediazione e cooperazione guidata.',
    'Il quadro di partenza segnala ampie diversità cognitive su basi fragili e rapporti complessi tra pari, temperati tuttavia da una reattività partecipativa positiva. L’impiego di strategie differenziate e lavori a piccoli gruppi strutturati sosterrà sia l’apprendimento sia la convivenza.',
  ],

  'elevata|fragile|complesso|selettiva': [
    'Il gruppo evidenzia una preparazione media fragile ed elevata eterogeneità, inserite in un clima relazionale complesso e con motivazione selettiva. La combinazione di difficoltà di base molto diverse e tensioni tra compagni rende prioritario stabilire un ambiente educativo prevedibile e inclusivo, articolato su compiti essenziali, pratici e graduati per livello.',
    'Le rilevazioni iniziali mostrano marcate carenze nei saperi fondamentali, relazioni delicate e adesione discontinua alle proposte scolastiche. Una didattica essenziale, ricca di supporti visivi e accompagnata da fermezza relazionale, mirerà a ridurre frustrazione e disimpegno.',
    'L’osservazione restituisce una classe che necessita di forte personalizzazione didattica e costante cura educativa, così da contenere le criticità del clima d’aula e agganciare la motivazione attraverso traguardi concreti e raggiungibili.',
  ],

  'elevata|fragile|complesso|debole': [
    'La classe si presenta in una situazione iniziale complessa, caratterizzata da preparazione media fragile ed elevata eterogeneità nei bisogni formativi, da un clima relazionale teso e da una motivazione allo studio debole. L’azione educativa darà priorità assoluta alla costruzione di un contesto accogliente e strutturato, al recupero dei saperi essenziali mediante percorsi fortemente personalizzati e al sostegno continuo della fiducia degli alunni.',
    'Dall’analisi iniziale emergono criticità rilevanti su tutti gli assi: ampi divari con lacune diffuse nei prerequisiti, fatiche nella gestione delle relazioni e scarsa adesione alle proposte scolastiche. La programmazione procederà con estrema gradualità sui nuclei irrinunciabili, puntando su didattica assistita in classe, strumenti inclusivi e coordinamento costante del Consiglio di Classe.',
    'Il profilo di partenza richiede un intervento educativo paziente, coerente e altamente inclusivo per affrontare contestualmente le fragilità cognitive eterogenee, la complessità delle dinamiche di gruppo e la demotivazione. Piccoli obiettivi chiari, routine rassicuranti e valorizzazione di ogni segnale positivo guideranno il lavoro annuale.',
  ],
};
