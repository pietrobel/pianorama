import type {
  ClassCharacteristicDimension,
  ClassLivello,
  ClassTipologia,
  DocenteGenere,
  DocumentLayoutStyle,
  FonteRilevazione,
  MetodoStudioStato,
  MezzoIndividuazione,
  Programmazione,
  SchoolSettings,
  SoglieQuoteCaratteristiche,
} from './types';

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

const METODI_STRUMENTI_PER_DISCIPLINA: Record<
  string,
  { metodi: string[]; mezziEStrumenti: string[] }
> = {
  Italiano: {
    metodi: [
      'Metodo induttivo',
      'Lezione interattiva',
      'Didattica laboratoriale',
      'Cooperative learning',
    ],
    mezziEStrumenti: [
      'Libri di testo',
      'Schede predisposte dall’insegnante',
      'Testi didattici di supporto',
      'Riviste e giornali',
      'Compiti di realtà',
    ],
  },
  Storia: {
    metodi: [
      'Metodo induttivo',
      'Lezione interattiva',
      'Ricerca individuale e/o di gruppo',
      'Cooperative learning',
    ],
    mezziEStrumenti: [
      'Libri di testo',
      'Schede predisposte dall’insegnante',
      'Cartelloni',
      'Presentazioni multimediali',
      'filmati e documentari',
    ],
  },
  Geografia: {
    metodi: [
      'Metodo induttivo',
      'Lezione interattiva',
      'Ricerca individuale e/o di gruppo',
      'Didattica laboratoriale',
    ],
    mezziEStrumenti: [
      'Libri di testo',
      'Schede predisposte dall’insegnante',
      'Computer, software didattici e multimediali, Internet',
      'Presentazioni multimediali',
      'filmati e documentari',
    ],
  },
  Inglese: {
    metodi: [
      'Lezione interattiva',
      'Didattica laboratoriale',
      'Cooperative learning',
      'Lavoro per gruppi di livello',
    ],
    mezziEStrumenti: [
      'Libri di testo',
      'Schede predisposte dall’insegnante',
      'Computer, software didattici e multimediali, Internet',
      'Giochi didattici',
      'Compiti di realtà',
    ],
  },
  Francese: {
    metodi: [
      'Lezione interattiva',
      'Didattica laboratoriale',
      'Cooperative learning',
      'Lavoro per gruppi di livello',
    ],
    mezziEStrumenti: [
      'Libri di testo',
      'Schede predisposte dall’insegnante',
      'Computer, software didattici e multimediali, Internet',
      'Giochi didattici',
      'Compiti di realtà',
    ],
  },
  Matematica: {
    metodi: [
      'Metodo induttivo',
      'Metodo deduttivo',
      'Didattica laboratoriale',
      'Lavoro per gruppi di livello',
    ],
    mezziEStrumenti: [
      'Libri di testo',
      'Schede predisposte dall’insegnante',
      'Testi didattici di supporto',
      'Computer, software didattici e multimediali, Internet',
      'Giochi didattici',
    ],
  },
  Scienze: {
    metodi: [
      'Metodo scientifico',
      'Metodo induttivo',
      'Didattica laboratoriale',
      'Ricerca individuale e/o di gruppo',
    ],
    mezziEStrumenti: [
      'Libri di testo',
      'Schede predisposte dall’insegnante',
      'Computer, software didattici e multimediali, Internet',
      'Presentazioni multimediali',
      'filmati e documentari',
    ],
  },
  Tecnologia: {
    metodi: [
      'Metodo scientifico',
      'Didattica laboratoriale',
      'Cooperative learning',
      'Ricerca individuale e/o di gruppo',
    ],
    mezziEStrumenti: [
      'Libri di testo',
      'Schede predisposte dall’insegnante',
      'Computer, software didattici e multimediali, Internet',
      'Compiti di realtà',
      'Presentazioni multimediali',
    ],
  },
  'Arte e Immagine': {
    metodi: [
      'Didattica laboratoriale',
      'Lezione interattiva',
      'Ricerca individuale e/o di gruppo',
    ],
    mezziEStrumenti: [
      'Libri di testo',
      'Cartelloni',
      'Presentazioni multimediali',
      'filmati e documentari',
      'Compiti di realtà',
    ],
  },
  Musica: {
    metodi: [
      'Didattica laboratoriale',
      'Lezione interattiva',
      'Cooperative learning',
    ],
    mezziEStrumenti: [
      'Libri di testo',
      'Schede predisposte dall’insegnante',
      'Computer, software didattici e multimediali, Internet',
      'Osservazioni sistematiche',
    ],
  },
  'Educazione Fisica': {
    metodi: [
      'Didattica laboratoriale',
      'Cooperative learning',
      'Lavoro per gruppi di livello',
    ],
    mezziEStrumenti: [
      'Schede predisposte dall’insegnante',
      'Giochi didattici',
      'Osservazioni sistematiche',
      'Compiti di realtà',
    ],
  },
  Religione: {
    metodi: [
      'Lezione interattiva',
      'Cooperative learning',
      'Ricerca individuale e/o di gruppo',
    ],
    mezziEStrumenti: [
      'Libri di testo',
      'Schede predisposte dall’insegnante',
      'filmati e documentari',
      'Autobiografia cognitiva',
    ],
  },
  'Educazione Civica': {
    metodi: [
      'Lezione interattiva',
      'Cooperative learning',
      'Ricerca individuale e/o di gruppo',
    ],
    mezziEStrumenti: [
      'Schede predisposte dall’insegnante',
      'Riviste e giornali',
      'Computer, software didattici e multimediali, Internet',
      'Compiti di realtà',
      'filmati e documentari',
    ],
  },
  'Latino (LEL)': {
    metodi: [
      'Metodo induttivo',
      'Metodo deduttivo',
      'Lezione interattiva',
      'Lavoro per gruppi di livello',
    ],
    mezziEStrumenti: [
      'Libri di testo',
      'Schede predisposte dall’insegnante',
      'Testi didattici di supporto',
      'Giochi didattici',
    ],
  },
  'Strumento Musicale': {
    metodi: [
      'Didattica laboratoriale',
      'Lezione interattiva',
      'Lavoro per gruppi di livello',
    ],
    mezziEStrumenti: [
      'Libri di testo',
      'Schede predisposte dall’insegnante',
      'Osservazioni sistematiche',
      'Computer, software didattici e multimediali, Internet',
    ],
  },
};

export function getDefaultMetodiStrumentiForDisciplina(disciplina: string): {
  metodi: string[];
  mezziEStrumenti: string[];
} {
  const match = METODI_STRUMENTI_PER_DISCIPLINA[disciplina];
  if (match) {
    return {
      metodi: [...match.metodi],
      mezziEStrumenti: [...match.mezziEStrumenti],
    };
  }
  return {
    metodi: ['Lezione interattiva', 'Didattica laboratoriale'],
    mezziEStrumenti: ['Libri di testo', 'Schede predisposte dall’insegnante'],
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
  return Array.from(
    new Set([
      ...DIMENSION_CHARACTERISTICS_OPTIONS['dim-atteggiamento'],
      ...DIMENSION_CHARACTERISTICS_OPTIONS['dim-collaborazione'],
      ...DIMENSION_CHARACTERISTICS_OPTIONS['dim-autonomia'],
      ...DIMENSION_CHARACTERISTICS_OPTIONS['dim-partecipazione'],
    ])
  );
}

export function formatDocenteConTitolo(
  docente: string | undefined,
  genere: DocenteGenere = 'F'
): string {
  const clean = (docente ?? '').trim();
  const titolo = genere === 'M' ? 'Prof.' : 'Prof.ssa';
  if (!clean) return `${titolo} ___________________`;
  if (/^(prof\.?\s*ssa|prof\.?)\b/i.test(clean)) {
    return clean;
  }
  return `${titolo} ${clean}`;
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
    plesso: string;
    isTemplate: boolean;
    templateNome: string;
  }>
): Programmazione {
  const now = new Date().toISOString();
  const disciplina = overrides?.disciplina || settings.defaultDisciplina || 'Italiano';
  const docenteGenere = overrides?.docenteGenere ?? settings.defaultDocenteGenere ?? 'F';
  const layoutDocumento = overrides?.layoutDocumento ?? settings.defaultLayoutDocumento ?? 'originale';
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
      annoScolastico: overrides?.annoScolastico ?? settings.defaultAnnoScolastico ?? '2026/27',
      classe: overrides?.classe ?? 'Prima',
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
      tipologie: ['collaborativa'],
      livello: 'medio',
      mezziIndividuazione: ['Prove di ingresso'],
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
      fontiRilevazione: ["test d'ingresso", 'tecniche di osservazione'],
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
      notaIntroduttiva: DEFAULT_NOTA_CURRICOLO,
      competenzeAttese: [],
      competenzeDigitali: [],
      righeAbilitaConoscenze: [],
      attivitaProgrammate: '',
    },
    metodiStrumenti: {
      premessaMetodologica: DEFAULT_PREMESSA_METODOLOGICA,
      ...getDefaultMetodiStrumentiForDisciplina(disciplina),
      altreMetodologie: '',
      altriSussidi: '',
      ausiliDidattici: '',
      didatticaDigitaleIntegrata: DEFAULT_DDI_TEXT,
    },
    verificheValutazione: {
      verificheScritte: ['Prove a domanda aperta e risposta aperta'],
      verificheOrali: ['Interrogazioni', 'Interventi in discussioni'],
      altriTipiProve: '',
      criteriValutazione: DEFAULT_VALUTAZIONE_TEXT,
      firmaDocente: overrides?.docente ?? settings.defaultDocente ?? '',
    },
    notePersonaliDocente: '',
  };
}
