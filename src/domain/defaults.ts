import type {
  ClassCharacteristicDimension,
  ClassLivello,
  ClassTipologia,
  DocenteGenere,
  DocumentLayoutStyle,
  FonteRilevazione,
  IndicazioniVersion,
  MetodoStudioStato,
  MezzoIndividuazione,
  Programmazione,
  SchoolSettings,
  SoglieQuoteCaratteristiche,
} from './types';
import { getDefaultIndicazioniForClasseAndYear } from '../engine/curricoloCatalogEngine';

export const TIPOLOGIE_CLASSE_OPTIONS: ClassTipologia[] = [
  'tranquilla',
  'vivace',
  'collaborativa',
  'poco collaborativa',
  'motivata',
  'poco motivata',
  'problematica',
];

export const LIVELLI_CLASSE_OPTIONS: { value: ClassLivello; label: string }[] = [
  { value: 'medio-alto', label: 'medio-alto' },
  { value: 'medio', label: 'medio' },
  { value: 'medio-basso', label: 'medio-basso' },
  { value: 'basso', label: 'basso' },
];

export const MEZZI_INDIVIDUAZIONE_OPTIONS: MezzoIndividuazione[] = [
  'Curriculum scolastico fornito dalla scuola precedente',
  'Informazioni fornite dai precedenti docenti e/o dai genitori',
  'Prove di ingresso',
  'Osservazioni sistematiche scritte ed orali appositamente predisposte',
];

export const FONTI_RILEVAZIONE_OPTIONS: FonteRilevazione[] = [
  'griglie, questionari conoscitivi, test socio-metrici',
  'tecniche di osservazione',
  "test d'ingresso",
  'colloqui con gli alunni',
  'colloqui con le famiglie',
  "colloqui con i docenti della scuola dell'infanzia/primaria",
];

export const STRATEGIE_POTENZIAMENTO_OPTIONS: string[] = [
  'lettura ed analisi approfondita di testi specifici',
  'approfondimento e rielaborazione dei contenuti disciplinari',
  'ricerche e attività laboratoriali',
  'valorizzazione di interessi extrascolastici positivi',
];

export const STRATEGIE_CONSOLIDAMENTO_OPTIONS: string[] = [
  'individuazione dei concetti chiave e successiva schematizzazione',
  'esercitazioni guidate finalizzate ad un controllo autonomo del lavoro svolto',
  'controllo sistematico del lavoro svolto',
  'rielaborazione di contenuti disciplinari',
  'esercitazioni per l’uso corretto delle regole e dei concetti',
];

export const STRATEGIE_RECUPERO_OPTIONS: string[] = [
  'lavori differenziati per singoli alunni e/o gruppi',
  'esercizi di lettura e tecnica di comprensione',
  'esposizione guidata di semplici contenuti disciplinari',
  'coinvolgimento in attività individualizzate',
  "attribuzione di compiti di difficoltà crescente in vista dell'acquisizione dei contenuti adeguati",
];

export const METODI_OPTIONS: string[] = [
  'Metodo induttivo',
  'Metodo deduttivo',
  'Metodo scientifico',
  'Didattica laboratoriale',
  'Lezione frontale',
  'Lezione interattiva',
  'Ricerca individuale e/o di gruppo',
  'Lavoro per gruppi di livello',
  'Cooperative learning',
];

export const MEZZI_STRUMENTI_OPTIONS: string[] = [
  'Libri di testo',
  'Schede predisposte dall’insegnante',
  'Testi didattici di supporto',
  'Riviste e giornali',
  'Cartelloni',
  'Computer, software didattici e multimediali, Internet',
  'Giochi didattici',
  'Osservazioni sistematiche',
  'Compiti di realtà',
  'Autobiografia cognitiva',
  'Presentazioni multimediali',
  'filmati e documentari',
];

export const VERIFICHE_SCRITTE_OPTIONS: string[] = [
  'Componimenti, relazioni, sintesi',
  'Grafici e tabelle',
  'Prove a domanda aperta e risposta aperta',
  'Prove a domanda aperta e risposta chiusa',
  'Questionari a scelta multipla',
  'Testi di completamento',
  'Prove strutturate',
  'Esercitazioni grafico pittoriche',
  'Libere espressioni di creatività',
  'Elaborati, saggi, componimenti',
];

export const VERIFICHE_ORALI_OPTIONS: string[] = [
  'Relazione su attività svolte',
  'Interrogazioni',
  'Interventi in discussioni',
  'Dialogo',
  'Conversazioni spontanee e guidate su argomenti di studio e non',
];

export const DISCIPLINE_SECONDARIA: string[] = [
  'Italiano',
  'Storia',
  'Geografia',
  'Inglese',
  'Francese',
  'Matematica',
  'Scienze',
  'Tecnologia',
  'Arte e Immagine',
  'Musica',
  'Educazione Fisica',
  'Religione',
  'Educazione Civica',
  'Latino (LEL)',
  'Strumento Musicale',
];

interface DisciplineRichProfile {
  metodi: string[];
  mezziEStrumenti: string[];
  altreMetodologie: string;
  altriSussidi: string;
  ausiliDidattici: string;
  premessaSpecifica: string;
  ddiSpecifica: string;
  competenzeDigitali: string[];
  attivitaProgrammate: string;
  verificheScritte: string[];
  verificheOrali: string[];
  altriTipiProve: string;
  criteriSpecificiDisciplina: string;
  mezziIndividuazione: MezzoIndividuazione[];
  fontiRilevazione: FonteRilevazione[];
}

const DISCIPLINE_PROFILES: Record<string, DisciplineRichProfile> = {
  Italiano: {
    metodi: [
      'Metodo induttivo',
      'Metodo deduttivo',
      'Didattica laboratoriale',
      'Lezione frontale',
      'Lezione interattiva',
      'Ricerca individuale e/o di gruppo',
      'Cooperative learning',
    ],
    mezziEStrumenti: [
      'Libri di testo',
      'Schede predisposte dall’insegnante',
      'Testi didattici di supporto',
      'Riviste e giornali',
      'Computer, software didattici e multimediali, Internet',
      'Osservazioni sistematiche',
      'Compiti di realtà',
      'Autobiografia cognitiva',
      'Presentazioni multimediali',
    ],
    altreMetodologie: 'Brainstorming, lettura espressiva ad alta voce, scrittura guidata e laboratori di lettura',
    altriSussidi: 'Monitor interattivo/LIM, dizionario cartaceo e digitale, mappe concettuali',
    ausiliDidattici: 'Antologia e grammatica in adozione, testi di narrativa, dizionario della lingua italiana',
    premessaSpecifica:
      'In Italiano si privilegiano la centralità del testo, la riflessione linguistica contestualizzata, l’ascolto attivo e i laboratori di lettura e scrittura collaborativa.',
    ddiSpecifica:
      'Utilizzo di antologie digitali, dizionari online, documenti condivisi per la revisione guidata dei testi e mappe concettuali interattive.',
    competenzeDigitali: [
      'Ricercare, selezionare e verificare l’attendibilità di fonti informative digitali in lingua italiana',
      'Produrre, rivedere e condividere elaborati scritti e presentazioni multimediali rispettando le regole della comunicazione efficace',
    ],
    attivitaProgrammate:
      'Laboratori di lettura espressiva e analisi testuale; percorsi di scrittura guidata (narrativa, descrittiva, espositiva, argomentativa); officina grammaticale e arricchimento lessicale.',
    verificheScritte: [
      'Componimenti, relazioni, sintesi',
      'Prove a domanda aperta e risposta aperta',
      'Prove a domanda aperta e risposta chiusa',
      'Questionari a scelta multipla',
      'Testi di completamento',
      'Prove strutturate',
      'Elaborati, saggi, componimenti',
    ],
    verificheOrali: [
      'Relazione su attività svolte',
      'Interrogazioni',
      'Interventi in discussioni',
      'Dialogo',
      'Conversazioni spontanee e guidate su argomenti di studio e non',
    ],
    altriTipiProve:
      'Analisi grammaticale, logica e del periodo; comprensione e riassunto di testi narrativi, espositivi e poetici; compiti di realtà e prove di scrittura funzionale.',
    criteriSpecificiDisciplina:
      'In Italiano saranno valutate la comprensione e l’analisi del testo, la correttezza ortografica e morfosintattica, la proprietà lessicale, la coerenza espositiva e la rielaborazione personale.',
    mezziIndividuazione: [
      'Curriculum scolastico fornito dalla scuola precedente',
      'Informazioni fornite dai precedenti docenti e/o dai genitori',
      'Prove di ingresso',
      'Osservazioni sistematiche scritte ed orali appositamente predisposte',
    ],
    fontiRilevazione: [
      'griglie, questionari conoscitivi, test socio-metrici',
      'tecniche di osservazione',
      "test d'ingresso",
      'colloqui con gli alunni',
      'colloqui con le famiglie',
    ],
  },
  Storia: {
    metodi: [
      'Metodo induttivo',
      'Lezione frontale',
      'Lezione interattiva',
      'Ricerca individuale e/o di gruppo',
      'Lavoro per gruppi di livello',
      'Cooperative learning',
    ],
    mezziEStrumenti: [
      'Libri di testo',
      'Schede predisposte dall’insegnante',
      'Testi didattici di supporto',
      'Riviste e giornali',
      'Cartelloni',
      'Computer, software didattici e multimediali, Internet',
      'Osservazioni sistematiche',
      'Presentazioni multimediali',
      'filmati e documentari',
    ],
    altreMetodologie: 'Analisi guidata di fonti storiche, didattica per problemi e debate',
    altriSussidi: 'Monitor interattivo/LIM, atlanti geostorici, linee del tempo, archivi digitali',
    ausiliDidattici: 'Manuale di Storia in adozione con atlante storico e risorse digitali integrate',
    premessaSpecifica:
      'In Storia l’impostazione metodologica promuove la lettura critica delle fonti, la ricostruzione dei nessi causa-effetto e il collegamento tra passato e presente.',
    ddiSpecifica:
      'Impiego di archivi storici digitali (Rai Storia, musei virtuali), linee del tempo interattive e documentari a supporto della ricerca storica.',
    competenzeDigitali: [
      'Consultare archivi storici digitali, carte geostoriche interattive e musei virtuali valutando l’affidabilità delle fonti',
      'Organizzare quadri cronologici e presentazioni multimediali per esporre processi storici',
    ],
    attivitaProgrammate:
      'Costruzione di linee del tempo e quadri di civiltà; laboratori di analisi di fonti documentarie e iconografiche; uscite didattiche e ricerche guidate su memoria locale e patrimonio.',
    verificheScritte: [
      'Componimenti, relazioni, sintesi',
      'Grafici e tabelle',
      'Prove a domanda aperta e risposta aperta',
      'Prove a domanda aperta e risposta chiusa',
      'Questionari a scelta multipla',
      'Prove strutturate',
    ],
    verificheOrali: [
      'Relazione su attività svolte',
      'Interrogazioni',
      'Interventi in discussioni',
      'Dialogo',
      'Conversazioni spontanee e guidate su argomenti di studio e non',
    ],
    altriTipiProve:
      'Lettura e analisi di fonti iconografiche e documentarie, costruzione di linee del tempo, mappe concettuali e relazioni multimediali su quadri storici.',
    criteriSpecificiDisciplina:
      'In Storia saranno valutati l’orientamento cronologico e spaziale, l’individuazione dei rapporti causa-effetto, l’uso del lessico storiografico e la capacità di lettura delle fonti.',
    mezziIndividuazione: [
      'Curriculum scolastico fornito dalla scuola precedente',
      'Informazioni fornite dai precedenti docenti e/o dai genitori',
      'Prove di ingresso',
      'Osservazioni sistematiche scritte ed orali appositamente predisposte',
    ],
    fontiRilevazione: [
      'griglie, questionari conoscitivi, test socio-metrici',
      'tecniche di osservazione',
      "test d'ingresso",
      'colloqui con gli alunni',
      'colloqui con le famiglie',
    ],
  },
  Geografia: {
    metodi: [
      'Metodo induttivo',
      'Didattica laboratoriale',
      'Lezione frontale',
      'Lezione interattiva',
      'Ricerca individuale e/o di gruppo',
      'Lavoro per gruppi di livello',
      'Cooperative learning',
    ],
    mezziEStrumenti: [
      'Libri di testo',
      'Schede predisposte dall’insegnante',
      'Testi didattici di supporto',
      'Cartelloni',
      'Computer, software didattici e multimediali, Internet',
      'Osservazioni sistematiche',
      'Compiti di realtà',
      'Presentazioni multimediali',
      'filmati e documentari',
    ],
    altreMetodologie: 'Lettura cartografica comparata, studi di caso territoriali e flipped classroom',
    altriSussidi: 'Atlante geografico, carte murali, strumenti digitali di geolocalizzazione (es. carte interattive)',
    ausiliDidattici: 'Libro di testo di Geografia in adozione con atlante e fascicoli operativi',
    premessaSpecifica:
      'In Geografia l’apprendimento muove dall’osservazione diretta e indiretta dei paesaggi, dalla lettura cartografica e dall’analisi dei sistemi territoriali e ambientali.',
    ddiSpecifica:
      'Uso di carte digitali interattive, immagini satellitari, banche dati geografiche e infografiche territoriali.',
    competenzeDigitali: [
      'Utilizzare strumenti di geolocalizzazione e cartografia digitale per leggere il territorio',
      'Analizzare dati statistici, grafici e carte tematiche da fonti istituzionali (ISTAT, portali geografici)',
    ],
    attivitaProgrammate:
      'Lettura di carte fisiche, politiche e tematiche; analisi di dati demografici e ambientali; itinerari di scoperta dei paesaggi italiani, europei ed extraeuropei e compiti di realtà sul territorio.',
    verificheScritte: [
      'Componimenti, relazioni, sintesi',
      'Grafici e tabelle',
      'Prove a domanda aperta e risposta aperta',
      'Prove a domanda aperta e risposta chiusa',
      'Questionari a scelta multipla',
      'Prove strutturate',
    ],
    verificheOrali: [
      'Relazione su attività svolte',
      'Interrogazioni',
      'Interventi in discussioni',
      'Dialogo',
      'Conversazioni spontanee e guidate su argomenti di studio e non',
    ],
    altriTipiProve:
      'Lettura e interpretazione di carte fisiche, politiche e tematiche; analisi di dati demografici ed economici; ricerche su territori e compiti di realtà.',
    criteriSpecificiDisciplina:
      'In Geografia saranno valutati l’orientamento sulle carte, l’interpretazione di grafici e dati territoriali, la comprensione delle relazioni uomo-ambiente e la padronanza del lessico geografico.',
    mezziIndividuazione: [
      'Curriculum scolastico fornito dalla scuola precedente',
      'Informazioni fornite dai precedenti docenti e/o dai genitori',
      'Prove di ingresso',
      'Osservazioni sistematiche scritte ed orali appositamente predisposte',
    ],
    fontiRilevazione: [
      'griglie, questionari conoscitivi, test socio-metrici',
      'tecniche di osservazione',
      "test d'ingresso",
      'colloqui con gli alunni',
      'colloqui con le famiglie',
    ],
  },
  Inglese: {
    metodi: [
      'Metodo induttivo',
      'Didattica laboratoriale',
      'Lezione interattiva',
      'Ricerca individuale e/o di gruppo',
      'Lavoro per gruppi di livello',
      'Cooperative learning',
    ],
    mezziEStrumenti: [
      'Libri di testo',
      'Schede predisposte dall’insegnante',
      'Testi didattici di supporto',
      'Computer, software didattici e multimediali, Internet',
      'Giochi didattici',
      'Osservazioni sistematiche',
      'Compiti di realtà',
      'Presentazioni multimediali',
      'filmati e documentari',
    ],
    altreMetodologie: 'Approccio comunicativo, role-play, pair-work, listening guidato e peer tutoring',
    altriSussidi: 'Tracce audio/video in lingua originale, flashcards, dizionario bilingue, piattaforme digitali',
    ausiliDidattici: 'Corso di lingua inglese in adozione (Student’s Book, Workbook e risorse audio/video digitali)',
    premessaSpecifica:
      'In Inglese si adotta un approccio comunicativo integrato (listening, speaking, reading, writing) basato su situazioni reali, uso graduale della L2 in classe e apprendimento cooperativo.',
    ddiSpecifica:
      'Fruizione di materiali audio/video autentici in lingua inglese, esercizi interattivi di pronuncia e comprensione orale e dizionari digitali multimediali.',
    competenzeDigitali: [
      'Utilizzare dizionari digitali bilingui e risorse audio/video autentiche per il potenziamento linguistico in L2',
      'Interagire e collaborare attraverso brevi messaggi digitali, presentazioni ed esercitazioni interattive in lingua inglese',
    ],
    attivitaProgrammate:
      'Sessioni di ascolto e comprensione (listening), dialoghi a coppie e role-play situazionali, laboratori lessicali e percorsi su civiltà e cultura anglofona.',
    verificheScritte: [
      'Componimenti, relazioni, sintesi',
      'Prove a domanda aperta e risposta aperta',
      'Prove a domanda aperta e risposta chiusa',
      'Questionari a scelta multipla',
      'Testi di completamento',
      'Prove strutturate',
    ],
    verificheOrali: [
      'Relazione su attività svolte',
      'Interrogazioni',
      'Interventi in discussioni',
      'Dialogo',
      'Conversazioni spontanee e guidate su argomenti di studio e non',
    ],
    altriTipiProve:
      'Prove di ascolto (listening comprehension), comprensione del testo (reading), brevi produzioni scritte guidate (writing), interazioni orali e role-play in lingua inglese.',
    criteriSpecificiDisciplina:
      'In Inglese la valutazione accerterà lo sviluppo delle quattro abilità linguistiche (ascolto, lettura, interazione/produzione orale e produzione scritta) e la padronanza delle funzioni comunicative e lessicali.',
    mezziIndividuazione: [
      'Curriculum scolastico fornito dalla scuola precedente',
      'Informazioni fornite dai precedenti docenti e/o dai genitori',
      'Prove di ingresso',
      'Osservazioni sistematiche scritte ed orali appositamente predisposte',
    ],
    fontiRilevazione: [
      'griglie, questionari conoscitivi, test socio-metrici',
      'tecniche di osservazione',
      "test d'ingresso",
      'colloqui con gli alunni',
      'colloqui con le famiglie',
    ],
  },
  Francese: {
    metodi: [
      'Metodo induttivo',
      'Didattica laboratoriale',
      'Lezione interattiva',
      'Ricerca individuale e/o di gruppo',
      'Lavoro per gruppi di livello',
      'Cooperative learning',
    ],
    mezziEStrumenti: [
      'Libri di testo',
      'Schede predisposte dall’insegnante',
      'Testi didattici di supporto',
      'Computer, software didattici e multimediali, Internet',
      'Giochi didattici',
      'Osservazioni sistematiche',
      'Compiti di realtà',
      'Presentazioni multimediali',
      'filmati e documentari',
    ],
    altreMetodologie: 'Approccio comunicativo situazionale, role-play, drammatizzazione e lavoro a coppie',
    altriSussidi: 'Tracce audio/video in lingua francese, dizionario bilingue, schemi grammaticali essenziali',
    ausiliDidattici: 'Libro di testo di lingua francese in adozione con eserciziario e tracce audio digitali',
    premessaSpecifica:
      'In Francese il percorso didattico valorizza la dimensione comunicativa e fonetica della lingua, favorendo l’interazione quotidiana e la scoperta della cultura francofona.',
    ddiSpecifica:
      'Utilizzo di tracce audio/video in lingua francese, attività interattive di ascolto e rinforzo grammaticale, dizionari online con sintesi vocale.',
    competenzeDigitali: [
      'Consultare risorse audio e dizionari digitali in lingua francese per verificare pronuncia e ortografia',
      'Realizzare brevi elaborati digitali e presentazioni multimediali sulla cultura francofona',
    ],
    attivitaProgrammate:
      'Esercitazioni di fonetica e ascolto (écoute), simulazioni di dialoghi quotidiani, laboratori di lettura/scrittura guidata e schede di civiltà francofona.',
    verificheScritte: [
      'Componimenti, relazioni, sintesi',
      'Prove a domanda aperta e risposta aperta',
      'Prove a domanda aperta e risposta chiusa',
      'Questionari a scelta multipla',
      'Testi di completamento',
      'Prove strutturate',
    ],
    verificheOrali: [
      'Relazione su attività svolte',
      'Interrogazioni',
      'Interventi in discussioni',
      'Dialogo',
      'Conversazioni spontanee e guidate su argomenti di studio e non',
    ],
    altriTipiProve:
      'Prove di comprensione orale (écoute), comprensione scritta, completamento lessicale e grammaticale, brevi lettere/messaggi e simulazioni di dialogo in contesto quotidiano.',
    criteriSpecificiDisciplina:
      'In Francese saranno valutate la comprensione orale e scritta, l’efficacia comunicativa nell’interazione orale, la correttezza ortografica di base e la pronuncia.',
    mezziIndividuazione: [
      'Curriculum scolastico fornito dalla scuola precedente',
      'Informazioni fornite dai precedenti docenti e/o dai genitori',
      'Prove di ingresso',
      'Osservazioni sistematiche scritte ed orali appositamente predisposte',
    ],
    fontiRilevazione: [
      'griglie, questionari conoscitivi, test socio-metrici',
      'tecniche di osservazione',
      "test d'ingresso",
      'colloqui con gli alunni',
      'colloqui con le famiglie',
    ],
  },
  Matematica: {
    metodi: [
      'Metodo induttivo',
      'Metodo deduttivo',
      'Didattica laboratoriale',
      'Lezione frontale',
      'Lezione interattiva',
      'Lavoro per gruppi di livello',
      'Cooperative learning',
    ],
    mezziEStrumenti: [
      'Libri di testo',
      'Schede predisposte dall’insegnante',
      'Testi didattici di supporto',
      'Computer, software didattici e multimediali, Internet',
      'Giochi didattici',
      'Osservazioni sistematiche',
      'Compiti di realtà',
      'Presentazioni multimediali',
    ],
    altreMetodologie: 'Problem solving, apprendimento per scoperta guidata, peer tutoring ed esercitazione graduale',
    altriSussidi: 'Strumenti per il disegno geometrico, software di geometria dinamica, fogli di calcolo, formulari',
    ausiliDidattici: 'Testi di Aritmetica/Algebra e Geometria in adozione, quaderno operativo e tabelle numeriche',
    premessaSpecifica:
      'In Matematica l’azione didattica unisce rigore procedurale e approccio laboratoriale per problemi, guidando dall’esplorazione concreta alla formalizzazione logica.',
    ddiSpecifica:
      'Utilizzo di software di geometria dinamica (es. GeoGebra), fogli di calcolo, piattaforme di esercitazione adattiva e formulari digitali.',
    competenzeDigitali: [
      'Utilizzare fogli di calcolo per rappresentare dati, calcolare percentuali e costruire grafici statistici',
      'Esplorare proprietà e costruzioni delle figure piane e solide tramite software di geometria dinamica',
    ],
    attivitaProgrammate:
      'Laboratori di problem solving aritmetico e geometrico; esercitazioni con strumenti da disegno e geometria dinamica; raccolta e rappresentazione grafica di dati reali.',
    verificheScritte: [
      'Grafici e tabelle',
      'Prove a domanda aperta e risposta aperta',
      'Prove a domanda aperta e risposta chiusa',
      'Questionari a scelta multipla',
      'Prove strutturate',
      'Esercitazioni grafico pittoriche',
    ],
    verificheOrali: [
      'Relazione su attività svolte',
      'Interrogazioni',
      'Interventi in discussioni',
      'Dialogo',
    ],
    altriTipiProve:
      'Risoluzione di espressioni, equazioni e problemi aritmetici, algebrici e geometrici; costruzioni geometriche con riga, squadra e compasso; analisi di dati e grafici; compiti di realtà.',
    criteriSpecificiDisciplina:
      'In Matematica si valuteranno la conoscenza di concetti, regole e proprietà, la correttezza dei procedimenti di calcolo, l’impostazione logica dei problemi e l’uso del linguaggio simbolico.',
    mezziIndividuazione: [
      'Curriculum scolastico fornito dalla scuola precedente',
      'Informazioni fornite dai precedenti docenti e/o dai genitori',
      'Prove di ingresso',
      'Osservazioni sistematiche scritte ed orali appositamente predisposte',
    ],
    fontiRilevazione: [
      'griglie, questionari conoscitivi, test socio-metrici',
      'tecniche di osservazione',
      "test d'ingresso",
      'colloqui con gli alunni',
      'colloqui con le famiglie',
    ],
  },
  Scienze: {
    metodi: [
      'Metodo induttivo',
      'Metodo deduttivo',
      'Metodo scientifico',
      'Didattica laboratoriale',
      'Lezione interattiva',
      'Ricerca individuale e/o di gruppo',
      'Cooperative learning',
    ],
    mezziEStrumenti: [
      'Libri di testo',
      'Schede predisposte dall’insegnante',
      'Testi didattici di supporto',
      'Cartelloni',
      'Computer, software didattici e multimediali, Internet',
      'Osservazioni sistematiche',
      'Compiti di realtà',
      'Presentazioni multimediali',
      'filmati e documentari',
    ],
    altreMetodologie: 'Didattica esperienziale, osservazione di fenomeni reali, inquiry-based learning',
    altriSussidi: 'Attrezzature di laboratorio scientifico, modelli anatomici e molecolari, simulazioni interattive',
    ausiliDidattici: 'Manuale di Scienze in adozione, schede di laboratorio e atlante scientifico digitale',
    premessaSpecifica:
      'In Scienze la metodologia si fonda sul metodo sperimentale galileiano: osservazione dei fenomeni, formulazione di ipotesi, verifica laboratoriale e modellizzazione.',
    ddiSpecifica:
      'Impiego di simulazioni interattive scientifiche, video-esperimenti guidati, atlanti anatomici/astronomici digitali e schede di laboratorio condivise.',
    competenzeDigitali: [
      'Utilizzare simulazioni virtuali e risorse scientifiche istituzionali per osservare fenomeni fisici, chimici e biologici',
      'Raccogliere, tabulare e documentare dati sperimentali in semplici relazioni digitali',
    ],
    attivitaProgrammate:
      'Esperimenti pratici in aula e laboratorio con relazione scientifica; osservazione di campioni e modelli; percorsi interdisciplinari di educazione ambientale e alla salute.',
    verificheScritte: [
      'Componimenti, relazioni, sintesi',
      'Grafici e tabelle',
      'Prove a domanda aperta e risposta aperta',
      'Prove a domanda aperta e risposta chiusa',
      'Questionari a scelta multipla',
      'Prove strutturate',
    ],
    verificheOrali: [
      'Relazione su attività svolte',
      'Interrogazioni',
      'Interventi in discussioni',
      'Dialogo',
      'Conversazioni spontanee e guidate su argomenti di studio e non',
    ],
    altriTipiProve:
      'Relazioni su esperimenti e attività di laboratorio, osservazione di fenomeni naturali, lettura di tabelle e grafici scientifici, costruzione di modelli e compiti di realtà.',
    criteriSpecificiDisciplina:
      'In Scienze saranno valutate l’acquisizione dei concetti scientifici fondamentali, l’applicazione del metodo sperimentale, la capacità di osservazione e collegamento e la proprietà del lessico scientifico.',
    mezziIndividuazione: [
      'Curriculum scolastico fornito dalla scuola precedente',
      'Informazioni fornite dai precedenti docenti e/o dai genitori',
      'Prove di ingresso',
      'Osservazioni sistematiche scritte ed orali appositamente predisposte',
    ],
    fontiRilevazione: [
      'griglie, questionari conoscitivi, test socio-metrici',
      'tecniche di osservazione',
      "test d'ingresso",
      'colloqui con gli alunni',
      'colloqui con le famiglie',
    ],
  },
  Tecnologia: {
    metodi: [
      'Metodo induttivo',
      'Metodo scientifico',
      'Didattica laboratoriale',
      'Lezione interattiva',
      'Ricerca individuale e/o di gruppo',
      'Lavoro per gruppi di livello',
      'Cooperative learning',
    ],
    mezziEStrumenti: [
      'Libri di testo',
      'Schede predisposte dall’insegnante',
      'Cartelloni',
      'Computer, software didattici e multimediali, Internet',
      'Osservazioni sistematiche',
      'Compiti di realtà',
      'Presentazioni multimediali',
      'filmati e documentari',
    ],
    altreMetodologie: 'Learning by doing, progettazione per problemi (problem solving) e laboratorio grafico-digitale',
    altriSussidi: 'Squadre, righe, compasso, album da disegno tecnico, software CAD/didattici e strumenti di misura',
    ausiliDidattici: 'Libro di testo di Tecnologia e Disegno tecnico in adozione con tavole ed espansioni digitali',
    premessaSpecifica:
      'In Tecnologia si integrano sapienza grafica, analisi dei sistemi produttivi ed energetici e progettazione operativa, sviluppando precisione tecnica e consapevolezza ambientale.',
    ddiSpecifica:
      'Utilizzo di software di disegno tecnico 2D/3D, ambienti di programmazione a blocchi/coding, video tutorial di costruzioni geometriche e simulazioni energetiche.',
    competenzeDigitali: [
      'Progettare e produrre elaborati grafici o semplici artefatti mediante strumenti di disegno digitale e coding',
      'Valutare l’impatto ambientale ed energetico delle tecnologie digitali e dei processi produttivi',
    ],
    attivitaProgrammate:
      'Esercitazioni settimanali di disegno geometrico e proiezioni; laboratori su materiali, energia, strutture e tecnologia alimentare; compiti di realtà di progettazione tecnica.',
    verificheScritte: [
      'Componimenti, relazioni, sintesi',
      'Grafici e tabelle',
      'Prove a domanda aperta e risposta aperta',
      'Questionari a scelta multipla',
      'Prove strutturate',
      'Esercitazioni grafico pittoriche',
    ],
    verificheOrali: [
      'Relazione su attività svolte',
      'Interrogazioni',
      'Interventi in discussioni',
      'Dialogo',
    ],
    altriTipiProve:
      'Tavole di disegno geometrico e proiezioni ortogonali/assonometriche; progettazione e realizzazione di elaborati tecnici, manufatti e artefatti digitali; compiti di realtà.',
    criteriSpecificiDisciplina:
      'In Tecnologia saranno valutate la precisione e la pulizia nell’esecuzione delle tavole grafiche, la comprensione dei processi tecnologici ed energetici e l’organizzazione progettuale.',
    mezziIndividuazione: [
      'Curriculum scolastico fornito dalla scuola precedente',
      'Informazioni fornite dai precedenti docenti e/o dai genitori',
      'Prove di ingresso',
      'Osservazioni sistematiche scritte ed orali appositamente predisposte',
    ],
    fontiRilevazione: [
      'griglie, questionari conoscitivi, test socio-metrici',
      'tecniche di osservazione',
      "test d'ingresso",
      'colloqui con gli alunni',
      'colloqui con le famiglie',
    ],
  },
  'Arte e Immagine': {
    metodi: [
      'Metodo induttivo',
      'Didattica laboratoriale',
      'Lezione interattiva',
      'Ricerca individuale e/o di gruppo',
      'Lavoro per gruppi di livello',
      'Cooperative learning',
    ],
    mezziEStrumenti: [
      'Libri di testo',
      'Schede predisposte dall’insegnante',
      'Testi didattici di supporto',
      'Cartelloni',
      'Computer, software didattici e multimediali, Internet',
      'Osservazioni sistematiche',
      'Compiti di realtà',
      'Presentazioni multimediali',
      'filmati e documentari',
    ],
    altreMetodologie: 'Atelier espressivo, lettura guidata dell’immagine e valorizzazione della creatività personale',
    altriSussidi: 'Album da disegno, tempere, pastelli, acquerelli, materiali plastici, riproduzioni di opere d’arte',
    ausiliDidattici: 'Manuale di Storia dell’Arte e linguaggio visivo in adozione, portfolio grafico-espressivo',
    premessaSpecifica:
      'In Arte e Immagine l’intervento didattico bilancia l’educazione allo sguardo critico (lettura del patrimonio artistico) e la sperimentazione espressiva di tecniche grafico-pittoriche.',
    ddiSpecifica:
      'Esplorazione di pinacoteche e musei virtuali ad alta risoluzione, analisi digitale della composizione delle opere ed elaborazione di portfolio visivi.',
    competenzeDigitali: [
      'Esplorare musei virtuali e archivi iconografici digitali per analizzare opere d’arte e patrimonio culturale',
      'Creare o rielaborare immagini e presentazioni visive nel rispetto del diritto d’autore',
    ],
    attivitaProgrammate:
      'Atelier grafico-pittorici e plastici con varie tecniche; laboratori di analisi formale ed espressiva di opere d’arte; percorsi di tutela e valorizzazione del patrimonio locale.',
    verificheScritte: [
      'Componimenti, relazioni, sintesi',
      'Prove a domanda aperta e risposta aperta',
      'Questionari a scelta multipla',
      'Prove strutturate',
      'Esercitazioni grafico pittoriche',
      'Libere espressioni di creatività',
    ],
    verificheOrali: [
      'Relazione su attività svolte',
      'Interrogazioni',
      'Interventi in discussioni',
      'Dialogo',
    ],
    altriTipiProve:
      'Elaborati grafico-pittorici e plastici con varie tecniche espressive, schede di lettura iconografica di opere d’arte, progetti visivi e compiti di realtà.',
    criteriSpecificiDisciplina:
      'In Arte e Immagine saranno valutati l’uso consapevole dei codici visivi e delle tecniche grafico-pittoriche, l’originalità espressiva, la capacità di leggere l’opera d’arte e la cura esecutiva.',
    mezziIndividuazione: [
      'Informazioni fornite dai precedenti docenti e/o dai genitori',
      'Prove di ingresso',
      'Osservazioni sistematiche scritte ed orali appositamente predisposte',
    ],
    fontiRilevazione: [
      'griglie, questionari conoscitivi, test socio-metrici',
      'tecniche di osservazione',
      "test d'ingresso",
      'colloqui con gli alunni',
      'colloqui con le famiglie',
    ],
  },
  Musica: {
    metodi: [
      'Metodo induttivo',
      'Didattica laboratoriale',
      'Lezione interattiva',
      'Ricerca individuale e/o di gruppo',
      'Lavoro per gruppi di livello',
      'Cooperative learning',
    ],
    mezziEStrumenti: [
      'Libri di testo',
      'Schede predisposte dall’insegnante',
      'Testi didattici di supporto',
      'Computer, software didattici e multimediali, Internet',
      'Giochi didattici',
      'Osservazioni sistematiche',
      'Compiti di realtà',
      'Presentazioni multimediali',
    ],
    altreMetodologie: 'Ascolto attivo guidato, pratica vocale e strumentale d’insieme, body percussion',
    altriSussidi: 'Strumenti didattici melodici e ritmici, spartiti semplificati, basi audio e software di notazione',
    ausiliDidattici: 'Libro di testo di Educazione Musicale in adozione con antologia di brani e tracce audio',
    premessaSpecifica:
      'In Musica l’approccio integra pratica vocale e strumentale collettiva, alfabetizzazione ritmico-melodica ed educazione all’ascolto consapevole dei diversi linguaggi musicali.',
    ddiSpecifica:
      'Uso di basi musicali digitali, spartiti interattivi, software di notazione/audio-editing di base e ascolti guidati da archivi concertistici.',
    competenzeDigitali: [
      'Utilizzare basi audio digitali e software di notazione musicale elementare per esercitazioni ritmiche e melodiche',
      'Selezionare e analizzare brani musicali e fonti audiovisive rispettando le licenze d’uso',
    ],
    attivitaProgrammate:
      'Pratica vocale e strumentale d’insieme; esercizi di lettura ritmica e solfeggio parlato; ascolto attivo e analisi di brani di epoche e generi diversi; saggi didattici.',
    verificheScritte: [
      'Componimenti, relazioni, sintesi',
      'Prove a domanda aperta e risposta aperta',
      'Prove a domanda aperta e risposta chiusa',
      'Questionari a scelta multipla',
      'Prove strutturate',
      'Libere espressioni di creatività',
    ],
    verificheOrali: [
      'Relazione su attività svolte',
      'Interrogazioni',
      'Interventi in discussioni',
      'Dialogo',
    ],
    altriTipiProve:
      'Prove pratiche di lettura ritmica e intonazione, esecuzioni vocali e strumentali individuali e di gruppo, ascolto guidato e riconoscimento di generi, timbri e forme musicali.',
    criteriSpecificiDisciplina:
      'In Musica saranno valutate l’acquisizione della notazione e del linguaggio musicale, la precisione ritmico-esecutiva nella pratica vocale/strumentale e la comprensione critica all’ascolto.',
    mezziIndividuazione: [
      'Informazioni fornite dai precedenti docenti e/o dai genitori',
      'Prove di ingresso',
      'Osservazioni sistematiche scritte ed orali appositamente predisposte',
    ],
    fontiRilevazione: [
      'griglie, questionari conoscitivi, test socio-metrici',
      'tecniche di osservazione',
      "test d'ingresso",
      'colloqui con gli alunni',
      'colloqui con le famiglie',
    ],
  },
  'Educazione Fisica': {
    metodi: [
      'Didattica laboratoriale',
      'Lezione interattiva',
      'Ricerca individuale e/o di gruppo',
      'Lavoro per gruppi di livello',
      'Cooperative learning',
    ],
    mezziEStrumenti: [
      'Schede predisposte dall’insegnante',
      'Testi didattici di supporto',
      'Giochi didattici',
      'Osservazioni sistematiche',
      'Compiti di realtà',
      'Presentazioni multimediali',
      'filmati e documentari',
    ],
    altreMetodologie: 'Gioco-sport, lavoro a stazioni e circuiti, peer tutoring motorio ed educazione al fair play',
    altriSussidi: 'Grandi e piccoli attrezzi sportivi, spazi palestra, cronometri, tracciati per giochi sportivi',
    ausiliDidattici: 'Manuale di Educazione Fisica e schede operative di educazione alla salute e regolamento sportivo',
    premessaSpecifica:
      'In Educazione Fisica la didattica valorizza la corporeità come esperienza educativa inclusiva, promuovendo coordinazione, salute, collaborazione di squadra e cultura del fair play.',
    ddiSpecifica:
      'Utilizzo di video dimostrativi di gesti tecnici e posture corrette, regolamenti sportivi interattivi e percorsi digitali di educazione alla salute.',
    competenzeDigitali: [
      'Consultare regolamenti sportivi e risorse multimediali per analizzare gesti motori e stili di vita sani',
      'Documentare percorsi motori ed educativi attraverso schede o diari di attività in formato digitale',
    ],
    attivitaProgrammate:
      'Percorsi motori coordinativi e condizionali; avviamento alle discipline sportive individuali e di squadra; giochi sportivi studenteschi e moduli di educazione alla salute e primo soccorso.',
    verificheScritte: [
      'Componimenti, relazioni, sintesi',
      'Prove a domanda aperta e risposta aperta',
      'Questionari a scelta multipla',
      'Prove strutturate',
    ],
    verificheOrali: [
      'Relazione su attività svolte',
      'Interventi in discussioni',
      'Dialogo',
      'Conversazioni spontanee e guidate su argomenti di studio e non',
    ],
    altriTipiProve:
      'Prove pratiche motorie, percorsi coordinativi e condizionali, osservazione sistematica nelle attività sportive individuali e di squadra, applicazione delle regole di gioco e fair play.',
    criteriSpecificiDisciplina:
      'In Educazione Fisica si valuteranno i progressi nelle capacità coordinative e motorie rispetto al livello iniziale, la conoscenza delle regole sportive, la sicurezza e il comportamento leale e collaborativo.',
    mezziIndividuazione: [
      'Informazioni fornite dai precedenti docenti e/o dai genitori',
      'Prove di ingresso',
      'Osservazioni sistematiche scritte ed orali appositamente predisposte',
    ],
    fontiRilevazione: [
      'griglie, questionari conoscitivi, test socio-metrici',
      'tecniche di osservazione',
      "test d'ingresso",
      'colloqui con gli alunni',
      'colloqui con le famiglie',
    ],
  },
  Religione: {
    metodi: [
      'Metodo induttivo',
      'Didattica laboratoriale',
      'Lezione interattiva',
      'Ricerca individuale e/o di gruppo',
      'Cooperative learning',
    ],
    mezziEStrumenti: [
      'Libri di testo',
      'Schede predisposte dall’insegnante',
      'Testi didattici di supporto',
      'Riviste e giornali',
      'Computer, software didattici e multimediali, Internet',
      'Osservazioni sistematiche',
      'Compiti di realtà',
      'Autobiografia cognitiva',
      'filmati e documentari',
    ],
    altreMetodologie: 'Circle time, confronto dialogico interculturale, lettura guidata di fonti bibliche e storiche',
    altriSussidi: 'Testi sacri e fonti documentarie, opere d’arte a soggetto religioso, risorse multimediali',
    ausiliDidattici: 'Libro di testo di IRC in adozione, dossier tematici e materiali audiovisivi',
    premessaSpecifica:
      'In Religione Cattolica si adotta una metodologia dialogica, storico-culturale ed ermeneutica orientata al rispetto delle identità, al confronto aperto e alla lettura delle fonti.',
    ddiSpecifica:
      'Impiego di testi multimediali, analisi digitale di opere d’arte sacra, documentari e bacheche collaborative per riflessioni tematiche.',
    competenzeDigitali: [
      'Ricercare e confrontare informazioni storico-culturali su fonti attendibili con spirito critico',
      'Partecipare in modo rispettoso e costruttivo a spazi digitali di confronto educativo',
    ],
    attivitaProgrammate:
      'Laboratori dialogici sulle grandi domande esistenziali ed etiche; lettura storico-letteraria di fonti bibliche; percorsi su dialogo interreligioso, arte e solidarietà.',
    verificheScritte: [
      'Componimenti, relazioni, sintesi',
      'Prove a domanda aperta e risposta aperta',
      'Questionari a scelta multipla',
      'Testi di completamento',
      'Prove strutturate',
      'Libere espressioni di creatività',
    ],
    verificheOrali: [
      'Relazione su attività svolte',
      'Interrogazioni',
      'Interventi in discussioni',
      'Dialogo',
      'Conversazioni spontanee e guidate su argomenti di studio e non',
    ],
    altriTipiProve:
      'Osservazione sistematica della partecipazione al dialogo educativo, lettura e commento di testi e opere iconografiche, elaborati personali e compiti di realtà.',
    criteriSpecificiDisciplina:
      'In Religione saranno valutati l’interesse e la partecipazione costruttiva al dialogo educativo, la comprensione dei contenuti storico-culturali e il rispetto delle diverse tradizioni.',
    mezziIndividuazione: [
      'Informazioni fornite dai precedenti docenti e/o dai genitori',
      'Osservazioni sistematiche scritte ed orali appositamente predisposte',
    ],
    fontiRilevazione: [
      'griglie, questionari conoscitivi, test socio-metrici',
      'tecniche di osservazione',
      'colloqui con gli alunni',
      'colloqui con le famiglie',
    ],
  },
  'Educazione Civica': {
    metodi: [
      'Metodo induttivo',
      'Didattica laboratoriale',
      'Lezione interattiva',
      'Ricerca individuale e/o di gruppo',
      'Lavoro per gruppi di livello',
      'Cooperative learning',
    ],
    mezziEStrumenti: [
      'Libri di testo',
      'Schede predisposte dall’insegnante',
      'Riviste e giornali',
      'Cartelloni',
      'Computer, software didattici e multimediali, Internet',
      'Osservazioni sistematiche',
      'Compiti di realtà',
      'Presentazioni multimediali',
      'filmati e documentari',
    ],
    altreMetodologie: 'Debate civico, service learning, studi di caso su cittadinanza attiva e sicurezza digitale',
    altriSussidi: 'Testo della Costituzione italiana, documenti dell’Agenda 2030, portali istituzionali',
    ausiliDidattici: 'Dossier interdisciplinari di Educazione Civica su Costituzione, sostenibilità e cittadinanza digitale',
    premessaSpecifica:
      'In Educazione Civica l’azione didattica integra i tre assi trasversali (Costituzione, Sviluppo sostenibile, Cittadinanza digitale) attraverso compiti autentici, dibattiti e partecipazione attiva.',
    ddiSpecifica:
      'Percorsi di educazione alla cittadinanza digitale, netiquette, tutela della privacy online, fact-checking e uso consapevole delle piattaforme istituzionali.',
    competenzeDigitali: [
      'Esercitare la cittadinanza digitale in modo sicuro, responsabile e rispettoso della privacy e dei diritti altrui',
      'Riconoscere notizie false, rischi della rete e comportamenti di cyberbullismo adottando strategie di prevenzione',
    ],
    attivitaProgrammate:
      'Unità interdisciplinari su Costituzione e diritti/doveri; laboratori su Agenda 2030 e sostenibilità; percorsi di educazione stradale, alla legalità e cittadinanza digitale.',
    verificheScritte: [
      'Componimenti, relazioni, sintesi',
      'Grafici e tabelle',
      'Prove a domanda aperta e risposta aperta',
      'Questionari a scelta multipla',
      'Prove strutturate',
      'Elaborati, saggi, componimenti',
    ],
    verificheOrali: [
      'Relazione su attività svolte',
      'Interrogazioni',
      'Interventi in discussioni',
      'Dialogo',
      'Conversazioni spontanee e guidate su argomenti di studio e non',
    ],
    altriTipiProve:
      'Compiti di realtà e progetti interdisciplinari sui tre nuclei (Costituzione, Sviluppo sostenibile, Cittadinanza digitale); dibattiti argomentati e osservazione dei comportamenti civici.',
    criteriSpecificiDisciplina:
      'In Educazione Civica saranno valutati la conoscenza dei principi costituzionali e civici, l’uso responsabile del digitale, il rispetto delle regole comuni e la partecipazione attiva ai progetti.',
    mezziIndividuazione: [
      'Curriculum scolastico fornito dalla scuola precedente',
      'Informazioni fornite dai precedenti docenti e/o dai genitori',
      'Prove di ingresso',
      'Osservazioni sistematiche scritte ed orali appositamente predisposte',
    ],
    fontiRilevazione: [
      'griglie, questionari conoscitivi, test socio-metrici',
      'tecniche di osservazione',
      "test d'ingresso",
      'colloqui con gli alunni',
      'colloqui con le famiglie',
    ],
  },
  'Latino (LEL)': {
    metodi: [
      'Metodo induttivo',
      'Metodo deduttivo',
      'Lezione frontale',
      'Lezione interattiva',
      'Lavoro per gruppi di livello',
      'Cooperative learning',
    ],
    mezziEStrumenti: [
      'Libri di testo',
      'Schede predisposte dall’insegnante',
      'Testi didattici di supporto',
      'Computer, software didattici e multimediali, Internet',
      'Giochi didattici',
      'Osservazioni sistematiche',
      'Presentazioni multimediali',
    ],
    altreMetodologie: 'Metodo contrastivo latino-italiano, giochi etimologici e analisi guidata del periodo',
    altriSussidi: 'Glossari etimologici, schemi morfologici delle declinazioni e coniugazioni',
    ausiliDidattici: 'Eserciziario e schede di Latino LEL predisposte per il potenziamento linguistico ed espressivo',
    premessaSpecifica:
      'In Latino (LEL) si privilegia la riflessione linguistica comparata tra latino, italiano e lingue europee, utilizzando un metodo graduale, ludico-attivo ed etimologico.',
    ddiSpecifica:
      'Impiego di glossari etimologici digitali, mappe morfosintattiche interattive ed esercizi online di potenziamento lessicale.',
    competenzeDigitali: [
      'Consultare vocabolari ed enciclopedie etimologiche digitali per ricostruire l’evoluzione delle parole dal latino all’italiano',
      'Costruire schemi e mappe digitali comparative sulle strutture morfologiche di base',
    ],
    attivitaProgrammate:
      'Giochi etimologici e alberi genealogici delle parole; lettura contrastiva di brevi motti, favole e testi semplificati; confronto delle strutture sintattiche latino-italiano.',
    verificheScritte: [
      'Componimenti, relazioni, sintesi',
      'Prove a domanda aperta e risposta aperta',
      'Prove a domanda aperta e risposta chiusa',
      'Questionari a scelta multipla',
      'Testi di completamento',
      'Prove strutturate',
    ],
    verificheOrali: [
      'Relazione su attività svolte',
      'Interrogazioni',
      'Interventi in discussioni',
      'Dialogo',
    ],
    altriTipiProve:
      'Esercizi di analisi morfologica e sintattica contrastiva, traduzione guidata di brevi enunciati e percorsi etimologici tra lessico latino, italiano e lingue europee.',
    criteriSpecificiDisciplina:
      'In Latino (LEL) saranno valutate la capacità di riconoscere le strutture morfologiche di base, la riflessione linguistica comparata e l’arricchimento del patrimonio lessicale ed etimologico.',
    mezziIndividuazione: [
      'Informazioni fornite dai precedenti docenti e/o dai genitori',
      'Prove di ingresso',
      'Osservazioni sistematiche scritte ed orali appositamente predisposte',
    ],
    fontiRilevazione: [
      'griglie, questionari conoscitivi, test socio-metrici',
      'tecniche di osservazione',
      "test d'ingresso",
      'colloqui con gli alunni',
    ],
  },
  'Strumento Musicale': {
    metodi: [
      'Metodo induttivo',
      'Didattica laboratoriale',
      'Lezione interattiva',
      'Lavoro per gruppi di livello',
      'Cooperative learning',
    ],
    mezziEStrumenti: [
      'Libri di testo',
      'Schede predisposte dall’insegnante',
      'Testi didattici di supporto',
      'Computer, software didattici e multimediali, Internet',
      'Osservazioni sistematiche',
      'Compiti di realtà',
      'Autobiografia cognitiva',
    ],
    altreMetodologie: 'Lezione individuale e di musica d’insieme, imitazione guidata, ascolto critico e autocorrezione',
    altriSussidi: 'Strumento musicale, leggio, metronomo, accordatore, partiture progressive e basi di accompagnamento',
    ausiliDidattici: 'Metodi strumentali progressivi e raccolte di repertorio solistico e per ensemble',
    premessaSpecifica:
      'In Strumento Musicale il percorso unisce la cura posturale e tecnica della lezione individuale alla pratica orchestrale e di musica d’insieme, educando all’ascolto reciproco.',
    ddiSpecifica:
      'Utilizzo di accordatori/metronomi digitali, basi di studio a velocità modulabile, partiture in formato PDF annotabili e registrazione per l’autoascolto critico.',
    competenzeDigitali: [
      'Utilizzare strumenti digitali di supporto allo studio musicale (metronomo, accordatore, lettori di basi audio a tempo variabile)',
      'Registrare e riascoltare le proprie esecuzioni per migliorare intonazione, ritmo ed espressività',
    ],
    attivitaProgrammate:
      'Studio progressivo di tecnica strumentale, scale e lettura ritmico-melodica; prove d’orchestra e musica da camera; partecipazione a saggi, concerti e rassegne scolastiche.',
    verificheScritte: [
      'Componimenti, relazioni, sintesi',
      'Prove a domanda aperta e risposta aperta',
      'Prove a domanda aperta e risposta chiusa',
      'Prove strutturate',
      'Libere espressioni di creatività',
    ],
    verificheOrali: [
      'Relazione su attività svolte',
      'Interrogazioni',
      'Interventi in discussioni',
      'Dialogo',
    ],
    altriTipiProve:
      'Prove pratiche individuali e di musica d’insieme sullo strumento, lettura a prima vista, controllo di postura, intonazione e precisione ritmico-dinamica; saggi ed esibizioni.',
    criteriSpecificiDisciplina:
      'In Strumento Musicale saranno valutate la padronanza tecnica e posturale, la fedeltà ritmica e d’intonazione nella lettura dello spartito, l’espressività e l’ascolto nella musica d’insieme.',
    mezziIndividuazione: [
      'Informazioni fornite dai precedenti docenti e/o dai genitori',
      'Prove di ingresso',
      'Osservazioni sistematiche scritte ed orali appositamente predisposte',
    ],
    fontiRilevazione: [
      'griglie, questionari conoscitivi, test socio-metrici',
      'tecniche di osservazione',
      "test d'ingresso",
      'colloqui con gli alunni',
      'colloqui con le famiglie',
    ],
  },
};

const FALLBACK_PROFILE: DisciplineRichProfile = DISCIPLINE_PROFILES.Italiano;

export function getDefaultMetodiStrumentiForDisciplina(disciplina: string): {
  metodi: string[];
  mezziEStrumenti: string[];
  altreMetodologie: string;
  altriSussidi: string;
  ausiliDidattici: string;
  premessaMetodologica: string;
  didatticaDigitaleIntegrata: string;
} {
  const match = DISCIPLINE_PROFILES[disciplina] ?? FALLBACK_PROFILE;
  return {
    metodi: [...match.metodi],
    mezziEStrumenti: [...match.mezziEStrumenti],
    altreMetodologie: match.altreMetodologie,
    altriSussidi: match.altriSussidi,
    ausiliDidattici: match.ausiliDidattici,
    premessaMetodologica: `${DEFAULT_PREMESSA_METODOLOGICA} ${match.premessaSpecifica}`.trim(),
    didatticaDigitaleIntegrata: `${DEFAULT_DDI_TEXT} ${match.ddiSpecifica}`.trim(),
  };
}

export function getDefaultCurricoloForDisciplina(disciplina: string): {
  competenzeDigitali: string[];
  attivitaProgrammate: string;
} {
  const match = DISCIPLINE_PROFILES[disciplina] ?? FALLBACK_PROFILE;
  return {
    competenzeDigitali: [...match.competenzeDigitali],
    attivitaProgrammate: match.attivitaProgrammate,
  };
}

export function getDefaultVerificheValutazioneForDisciplina(disciplina: string): {
  verificheScritte: string[];
  verificheOrali: string[];
  altriTipiProve: string;
  criteriValutazione: string;
} {
  const match = DISCIPLINE_PROFILES[disciplina] ?? FALLBACK_PROFILE;
  return {
    verificheScritte: [...match.verificheScritte],
    verificheOrali: [...match.verificheOrali],
    altriTipiProve: match.altriTipiProve,
    criteriValutazione: `${DEFAULT_VALUTAZIONE_TEXT} ${match.criteriSpecificiDisciplina}`.trim(),
  };
}

export function getDefaultRilevazioneForDisciplina(disciplina: string): {
  mezziIndividuazione: MezzoIndividuazione[];
  fontiRilevazione: FonteRilevazione[];
} {
  const match = DISCIPLINE_PROFILES[disciplina] ?? FALLBACK_PROFILE;
  return {
    mezziIndividuazione: [...match.mezziIndividuazione],
    fontiRilevazione: [...match.fontiRilevazione],
  };
}

export const PLESSI_ISTITUTO: string[] = ['Villafrati', 'Mezzojuso', 'Godrano'];

export const DEFAULT_PREMESSA_METODOLOGICA =
  'In sede di progettazione disciplinare sono scelte metodologie, strategie e tecniche d’intervento didattico al fine di attivare i percorsi di apprendimento degli alunni e rispondere alle esigenze e ai tempi di apprendimento di ciascuno, anche nell’ambito della didattica digitale integrata (Piano scolastico per la DDI). Tra le risorse didattiche si utilizzano contenuti audio/video disponibili su piattaforme istituzionali (es. RAI Scuola, RAI Cultura), risorse educative aperte (OER), libri di testo digitali, mappe concettuali e schede predisposte dal docente.';

export const DEFAULT_DDI_TEXT =
  'In caso di attivazione della Didattica Digitale Integrata, le attività sincrone e asincrone saranno strutturate garantendo inclusione, consegna guidata dei materiali sulla piattaforma d’istituto, momenti di restituzione individuale e utilizzo di risorse multimediali accessibili.';

export const DEFAULT_VALUTAZIONE_TEXT =
  'La valutazione, intesa come strumento formativo e regolativo del processo di insegnamento-apprendimento, si articolerà in fase diagnostica, formativa in itinere e sommativa, in coerenza con i criteri deliberati dal Collegio dei Docenti nel PTOF e con il Regolamento DDI (Art. 10). Terrà conto della situazione di partenza, dei progressi conseguiti, dell’impegno, della partecipazione, dell’autonomia nel metodo di studio e del raggiungimento degli obiettivi essenziali, nonché di eventuali piani personalizzati (PDP/PEI) per alunni con Bisogni Educativi Speciali.';

export const DEFAULT_NOTA_CURRICOLO =
  'Tenuto conto della eterogeneità degli alunni relativamente ai livelli di partenza ed alle capacità/abilità di ciascuno, vengono specificate di seguito le Competenze, le Abilità (o Obiettivi specifici) e le Conoscenze (Contenuti) disciplinari da raggiungere in coerenza con il Curricolo Verticale di Istituto.';

export const DEFAULT_BES_INTERVENTI_TEXT =
  'Per gli alunni con Bisogni Educativi Speciali (BES/DSA), in coerenza con i Piani Didattici Personalizzati (PDP) e con gli eventuali Piani Educativi Individualizzati (PEI) predisposti dal Consiglio di Classe, vengono adottati strumenti compensativi (mappe concettuali, schemi guida, formulari, sintesi vocali, audiolibri, calcolatrice, tabelle di supporto, dizionari digitali e risorse multimediali accessibili) e misure dispensative (dispensa dalla lettura ad alta voce in classe, dalla copiatura rapida alla lavagna e dal carico eccessivo di compiti domestici; previsione di tempi aggiuntivi o riduzione quantitativa delle prove mantenendo inalterati gli obiettivi essenziali).';

export const DEFAULT_SOGLIE_FASCE = {
  sogliaMinimaValida: 4,
  sogliaMedioBasso: 5.5,
  sogliaMedio: 6.5,
  sogliaAlto: 8.5,
};

export const DEFAULT_SOGLIE_QUOTE_CARATTERISTICHE: SoglieQuoteCaratteristiche = {
  tuttaLaClasse: 100,
  quasiTuttaLaClasseMin: 85,
  laMaggiorParteMin: 51,
  circaMetaMin: 40,
  unaParteMin: 10,
  pochiMin: 1,
};

export const DESCRIZIONI_CARATTERISTICHE_CATALOGO: string[] = [
  'motivata',
  'attenta e interessata',
  'tranquilla',
  'vivace',
  'poco motivata',
  'collaborativa',
  'poco collaborativa',
  'problematica',
];

export const DIMENSION_CHARACTERISTICS_OPTIONS: Record<string, string[]> = {
  'dim-atteggiamento': [
    'motivata',
    'attenta e interessata',
    'tranquilla',
    'vivace',
    'poco motivata',
    'discontinua nell’impegno',
    'problematica',
  ],
  'dim-collaborazione': [
    'collaborativa',
    'rispettosa delle regole',
    'solidale e inclusiva',
    'poco collaborativa',
    'tendente a isolarsi',
    'conflittuale nelle dinamiche di gruppo',
  ],
  'dim-metodo': [
    'acquisito',
    'in consolidamento',
    'in via di maturazione',
    'non ancora avviato',
  ],
  'dim-autonomia': [
    'pienamente autonoma',
    'autonoma nello svolgimento delle consegne',
    'bisognosa di guida costante',
    'non ancora autonoma',
  ],
  'dim-partecipazione': [
    'attiva e costruttiva',
    'partecipativa se sollecitata',
    'passiva o silenziosa',
    'dispersiva o poco partecipativa',
  ],
};

export const METODO_STUDIO_STATI_OPTIONS: MetodoStudioStato[] = [
  'acquisito',
  'in consolidamento',
  'in via di maturazione',
  'non ancora avviato',
];

export function getCharacteristicsCatalogForDimension(
  dim: Pick<ClassCharacteristicDimension, 'id' | 'nome' | 'kind'>
): string[] {
  if (dim.kind === 'metodo_studio' || dim.id === 'dim-metodo') {
    return METODO_STUDIO_STATI_OPTIONS;
  }
  if (DIMENSION_CHARACTERISTICS_OPTIONS[dim.id]) {
    return DIMENSION_CHARACTERISTICS_OPTIONS[dim.id];
  }
  const lowerName = dim.nome.trim().toLowerCase();
  if (lowerName.includes('metodo') || lowerName.includes('studio')) {
    return METODO_STUDIO_STATI_OPTIONS;
  }
  if (
    lowerName.includes('regol') ||
    lowerName.includes('rispett') ||
    lowerName.includes('comportament') ||
    lowerName.includes('condott')
  ) {
    return ['rispettosa delle regole', 'tranquilla', 'vivace', 'problematica'];
  }
  if (lowerName.includes('impegn')) {
    return ['motivata', 'discontinua nell’impegno', 'poco motivata'];
  }
  if (lowerName.includes('attenzion')) {
    return ['attenta e interessata', 'tranquilla', 'dispersiva o poco partecipativa'];
  }
  if (lowerName.includes('atteggiamento') || lowerName.includes('motivazione')) {
    return DIMENSION_CHARACTERISTICS_OPTIONS['dim-atteggiamento'];
  }
  if (lowerName.includes('collaboraz') || lowerName.includes('relazion')) {
    return DIMENSION_CHARACTERISTICS_OPTIONS['dim-collaborazione'];
  }
  if (lowerName.includes('autonom')) {
    return DIMENSION_CHARACTERISTICS_OPTIONS['dim-autonomia'];
  }
  if (lowerName.includes('partecipaz')) {
    return DIMENSION_CHARACTERISTICS_OPTIONS['dim-partecipazione'];
  }
  return [];
}

export function stripDocenteTitoli(raw: string | undefined): string {
  let clean = (raw ?? '').trim();
  let prev = '';
  while (clean && clean !== prev) {
    prev = clean;
    clean = clean
      .replace(/^(?:il\s*\/\s*la\s+docente|la\s+docente|il\s+docente)\b[\s:.\-]*/i, '')
      .replace(/^(?:prof\.?\s*ssa(?:\.|\b)|prof\.(?=\s|$)|prof(?=\s|$))[\s:.\-]*/i, '')
      .trim();
  }
  if (/^_+$/.test(clean)) return '';
  return clean;
}

export function formatDocenteConTitolo(
  docente: string | undefined,
  genere: DocenteGenere = 'F'
): string {
  const titolo = genere === 'M' ? 'Prof.' : 'Prof.ssa';
  const bare = stripDocenteTitoli(docente);
  if (!bare) return `${titolo} ___________________`;
  return `${titolo} ${bare}`;
}

export function formatFirmaDocente(
  docente: string | undefined,
  genere: DocenteGenere = 'F'
): string {
  const prefisso = genere === 'M' ? 'Il docente' : 'La docente';
  return `${prefisso} ${formatDocenteConTitolo(docente, genere)}`;
}

export function createDefaultClassDimensions(): ClassCharacteristicDimension[] {
  return [
    {
      id: 'dim-atteggiamento',
      nome: 'Atteggiamento e motivazione',
      kind: 'generale',
      segmenti: [
        {
          id: 'seg-att-nondefinito',
          etichetta: 'non definito',
          quotaPercentuale: 100,
          isNessuno: true,
        },
      ],
    },
    {
      id: 'dim-collaborazione',
      nome: 'Collaborazione e relazioni',
      kind: 'generale',
      segmenti: [
        {
          id: 'seg-coll-nondefinito',
          etichetta: 'non definito',
          quotaPercentuale: 100,
          isNessuno: true,
        },
      ],
    },
    {
      id: 'dim-metodo',
      nome: 'Metodo di studio',
      kind: 'metodo_studio',
      segmenti: [
        {
          id: 'seg-met-nondefinito',
          etichetta: 'non definito',
          quotaPercentuale: 0,
          isNessuno: true,
        },
        {
          id: 'seg-met-acquisito',
          etichetta: 'acquisito',
          quotaPercentuale: 0,
        },
        {
          id: 'seg-met-consolidamento',
          etichetta: 'in consolidamento',
          quotaPercentuale: 100,
        },
        {
          id: 'seg-met-maturazione',
          etichetta: 'in via di maturazione',
          quotaPercentuale: 0,
        },
        {
          id: 'seg-met-non-avviato',
          etichetta: 'non ancora avviato',
          quotaPercentuale: 0,
        },
      ],
    },
    {
      id: 'dim-autonomia',
      nome: 'Autonomia',
      kind: 'generale',
      segmenti: [
        {
          id: 'seg-aut-nondefinito',
          etichetta: 'non definito',
          quotaPercentuale: 100,
          isNessuno: true,
        },
      ],
    },
    {
      id: 'dim-partecipazione',
      nome: 'Partecipazione',
      kind: 'generale',
      segmenti: [
        {
          id: 'seg-part-nondefinito',
          etichetta: 'non definito',
          quotaPercentuale: 100,
          isNessuno: true,
        },
      ],
    },
  ];
}

export const DEFAULT_SCHOOL_SETTINGS: SchoolSettings = {
  id: 'default',
  ministryHeader: "Ministero dell'Istruzione e del Merito",
  schoolName: 'Istituto Comprensivo "Beato Don Pino Puglisi" — Villafrati-Mezzojuso',
  schoolAddressLine: 'Corso San Marco n° 59 - 90030 Villafrati (PA) - Distretto 12/50 - C.F. 97168730824',
  schoolContactsLine:
    'Tel. 0916172589 – 0916851027 · www.icvillafratimezzojuso.edu.it · paic817007@istruzione.it · paic817007@pec.istruzione.it',
  defaultScuola: 'Scuola Secondaria di Primo Grado',
  defaultPlesso: 'Villafrati',
  defaultAnnoScolastico: '2026/27',
  defaultDocente: '',
  defaultDocenteGenere: 'F',
  defaultLayoutDocumento: 'originale',
  defaultDisciplina: 'Italiano',
  theme: 'sistema',
  textScale: 'normale',
  backupReminderDays: 14,
  lastBackupAt: null,
  privacyAcknowledgedAt: null,
  soglieFasce: DEFAULT_SOGLIE_FASCE,
  soglieQuoteCaratteristiche: DEFAULT_SOGLIE_QUOTE_CARATTERISTICHE,
};

export function createEmptyProgrammazione(
  settings: SchoolSettings = DEFAULT_SCHOOL_SETTINGS,
  overrides?: Partial<{
    disciplina: string;
    classe: 'Prima' | 'Seconda' | 'Terza';
    sezione: string;
    annoScolastico: string;
    docente: string;
    docenteGenere: DocenteGenere;
    layoutDocumento: DocumentLayoutStyle;
    indicazioniVersione: IndicazioniVersion;
    plesso: string;
    isTemplate: boolean;
    templateNome: string;
  }>
): Programmazione {
  const now = new Date().toISOString();
  const disciplina = overrides?.disciplina || settings.defaultDisciplina || 'Italiano';
  const classe = overrides?.classe ?? 'Prima';
  const annoScolastico = overrides?.annoScolastico ?? settings.defaultAnnoScolastico ?? '2026/27';
  const indicazioniVersione =
    overrides?.indicazioniVersione ??
    getDefaultIndicazioniForClasseAndYear(classe, annoScolastico);
  const docenteGenere = overrides?.docenteGenere ?? settings.defaultDocenteGenere ?? 'F';
  const layoutDocumento = overrides?.layoutDocumento ?? settings.defaultLayoutDocumento ?? 'originale';
  const rilevazioneDefaults = getDefaultRilevazioneForDisciplina(disciplina);
  const metodiDefaults = getDefaultMetodiStrumentiForDisciplina(disciplina);
  const verificheDefaults = getDefaultVerificheValutazioneForDisciplina(disciplina);
  const curricoloDefaults = getDefaultCurricoloForDisciplina(disciplina);
  return {
    id: crypto.randomUUID(),
    stato: 'bozza',
    isTemplate: overrides?.isTemplate ?? false,
    templateNome: overrides?.templateNome,
    cronologiaModifiche: [
      {
        id: crypto.randomUUID(),
        timestamp: now,
        evento: 'Creazione progetto',
        dettaglio: 'Nuova programmazione inizializzata dal modello ufficiale.',
      },
    ],
    createdAt: now,
    updatedAt: now,
    datiGenerali: {
      titoloDisciplina: disciplina,
      scuola: settings.defaultScuola || 'Scuola Secondaria di Primo Grado',
      plesso: overrides?.plesso ?? settings.defaultPlesso ?? 'Villafrati',
      annoScolastico,
      classe,
      sezione: overrides?.sezione ?? 'A',
      disciplina,
      docente: overrides?.docente ?? settings.defaultDocente ?? '',
      docenteGenere,
      layoutDocumento,
    },
    composizione: {
      alunni: 20,
      maschi: 10,
      femmine: 10,
      ripetenti: 0,
      bes: 0,
    },
    situazione: {
      tipologie: ['collaborativa', 'motivata'],
      livello: 'medio',
      mezziIndividuazione: rilevazioneDefaults.mezziIndividuazione,
      caratteristicheDimensioni: createDefaultClassDimensions(),
    },
    analisiPartenza: {
      descrizioneDisciplinare: '',
      livelli: {
        bassoAlunni: 0,
        medioBassoAlunni: 0,
        medioAlunni: 0,
        altoAlunni: 0,
      },
      fontiRilevazione: rilevazioneDefaults.fontiRilevazione,
      altraFonte: '',
      questionario: {
        risposte: {},
        modalitaGenerazione: 'completa',
        ultimoAggiornamento: null,
      },
    },
    interventi: {
      potenziamento: [...STRATEGIE_POTENZIAMENTO_OPTIONS],
      potenziamentoAltro: '',
      consolidamento: [...STRATEGIE_CONSOLIDAMENTO_OPTIONS],
      consolidamentoAltro: '',
      recupero: [...STRATEGIE_RECUPERO_OPTIONS],
      recuperoAltro: '',
      besInterventiProgrammati: DEFAULT_BES_INTERVENTI_TEXT,
    },
    curricolo: {
      indicazioniVersione,
      notaIntroduttiva: DEFAULT_NOTA_CURRICOLO,
      competenzeAttese: [],
      competenzeDigitali: curricoloDefaults.competenzeDigitali,
      righeAbilitaConoscenze: [],
      attivitaProgrammate: curricoloDefaults.attivitaProgrammate,
    },
    metodiStrumenti: {
      premessaMetodologica: metodiDefaults.premessaMetodologica,
      metodi: metodiDefaults.metodi,
      mezziEStrumenti: metodiDefaults.mezziEStrumenti,
      altreMetodologie: metodiDefaults.altreMetodologie,
      altriSussidi: metodiDefaults.altriSussidi,
      ausiliDidattici: metodiDefaults.ausiliDidattici,
      didatticaDigitaleIntegrata: metodiDefaults.didatticaDigitaleIntegrata,
    },
    verificheValutazione: {
      verificheScritte: verificheDefaults.verificheScritte,
      verificheOrali: verificheDefaults.verificheOrali,
      altriTipiProve: verificheDefaults.altriTipiProve,
      criteriValutazione: verificheDefaults.criteriValutazione,
      firmaDocente: overrides?.docente ?? settings.defaultDocente ?? '',
    },
    notePersonaliDocente: '',
  };
}
