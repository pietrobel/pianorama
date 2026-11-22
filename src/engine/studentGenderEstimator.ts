export type SessoIpotizzato = 'M' | 'F' | 'INDETERMINATO';
export type ColoreGenereAlunno = 'BLU' | 'ROSA' | 'GRIGIO';
export type ConfidenzaGenereAlunno = 'ALTA' | 'MEDIA' | 'BASSA';

export interface StudentGenderDictionaryEntry {
  genere: 'M' | 'F' | 'U';
  percentuale: number;
}

export interface StudentGenderEstimation {
  nomeOriginale: string;
  cognome: string;
  nomi: string;
  sesso: SessoIpotizzato;
  colore: ColoreGenereAlunno;
  confidenza: ConfidenzaGenereAlunno;
  nota: string;
}

const PARTICLES = new Set([
  'DI',
  'DE',
  'DEL',
  'DELLO',
  'DELLA',
  'DEGLI',
  'DA',
  'DAL',
  'DALLA',
  'LO',
  'LA',
  'D',
]);

const COMPOUND_PREFIXES = new Set(['GIAN', 'PIER']);

// Dizionario completo estratto da public/assets/aistudio/elenco_nomi_genere_1fd930a7.pdf (821 voci)
const M_98 = [
  'ABDALLAH', 'ABDEL', 'ABDELAZIZ', 'ABDELGHANI', 'ABDELHAK', 'ABDELILAH',
  'ABDELRAHMAN', 'ABDERRAHMANE', 'ABDESSAMAD', 'ABDOU', 'ABDUL', 'ABDULLAH',
  'ACHRAF', 'ADAM', 'ADIL', 'ADNAN', 'ADRIAN', 'AHMAD', 'AHMED', 'AHMID',
  'ALASSANE', 'ALBERTO', 'ALDO', 'ALESSANDRO', 'ALESSIO', 'ALEXANDRU', 'ALFIO',
  'ALI', 'AMAN', 'AMBROGIO', 'AMEDEO', 'AMIR', 'ANAS', 'ANDREI', 'ANDRIY',
  'ANGELO', 'ANTONINO', 'ANTONIO', 'ANWAR', 'ARBEN', 'ARIF', 'ARJUN', 'ARTAN',
  'ASHRAF', 'ATTILIO', 'AURELIO', 'AYMAN', 'AYMEN', 'AYOUB', 'AZIZ', 'BADR',
  'BAKARY', 'BARTOLO', 'BARTOLOMEO', 'BASEL', 'BASSAM', 'BECHIR', 'BENEDETTO',
  'BIAGIO', 'BILAL', 'BIN', 'BOHDAN', 'BRAHIM', 'BRAYAN', 'BRUNO',
  'CALOGERINO', 'CALOGERO', 'CARLOS', 'CARMELO', 'CARMINE', 'CATALDO', 'CATENO',
  'CESARE', 'CHEIKH', 'CHEN', 'CHOKRI', 'CHRISTIAN', 'CIRO', 'CLAUDIO',
  'CORRADO', 'COSIMO', 'COSTANTINO', 'CRISPINO', 'CRISTIAN', 'CRISTOFORO',
  'CROCIFISSO', 'DANIELE', 'DANTE', 'DAOUDA', 'DARIO', 'DAVIDE', 'DIEGO',
  'DIONISIO', 'DMYTRO', 'DOMENICO', 'DORIAN', 'DRITAN', 'DYLAN', 'EDOARDO',
  'ELIA', 'ELISEO', 'ELVIS', 'EMANUELE', 'EMILIO', 'ENRICO', 'ENZO', 'EPIFANIO',
  'ERASMO', 'ERNESTO', 'ETHAN', 'ETTORE', 'EZIO', 'FABIO', 'FADI', 'FAISAL',
  'FARES', 'FARID', 'FAUSTO', 'FEDERICO', 'FERDINAND', 'FERDINANDO',
  'FILADELFO', 'FILIPPO', 'FLAVIO', 'FLORIN', 'FORTUNATO', 'FRANCESCO',
  'FRANCO', 'GABRIEL', 'GABRIELE', 'GAEL', 'GAETANINO', 'GAETANO', 'GAMAL',
  'GANDOLFO', 'GASPARE', 'GENNARO', 'GENTI', 'GERARDO', 'GERLANDO', 'GHASSAN',
  'GHEORGHE', 'GIACOMO', 'GIANFRANCO', 'GIANLUCA', 'GIANMARCO', 'GIANNI',
  'GIANPAOLO', 'GINO', 'GIOACCHINO', 'GIORGIO', 'GIOVANNI', 'GIROLAMO',
  'GIULIO', 'GIUSEPPE', 'GIUSTO', 'GREGORIO', 'HAITHAM', 'HAKIM', 'HAMDI',
  'HAMID', 'HAMZA', 'HANI', 'HAO', 'HASSAN', 'HATEM', 'HEDI', 'HICHAM',
  'HOCINE', 'HOSAM', 'HOSNI', 'HUGO', 'HUSSAM', 'HUSSEIN', 'IAN', 'IBRAHIM',
  'IBRAHIMA', 'IDRISS', 'IGNAZIO', 'ILIR', 'ILYAS', 'IMRAN', 'ION', 'IONUT',
  'ISLAM', 'ISMAIL', 'IVAN', 'IVO', 'JAAFAR', 'JACOPO', 'JAIME', 'JALAL',
  'JAMAL', 'JAWAD', 'JAYSON', 'JEROME', 'JHON', 'JOEL', 'JONATHAN', 'JORGE',
  'JOSE', 'JUAN', 'JULES', 'JUN', 'KADER', 'KAMAL', 'KAMEL', 'KARIM', 'KEVIN',
  'KHALED', 'KHALIL', 'KLEDI', 'LAHCEN', 'LAMINE', 'LASSAAD', 'LEI', 'LELLO',
  'LEONARDO', 'LIAM', 'LIBORIO', 'LILLO', 'LINO', 'LORENZINO', 'LORENZO',
  'LORIN', 'LOTFI', 'LUCA', 'LUCIANO', 'LUCIO', 'LUDOVICO', 'LUIGI', 'LUIS',
  'MAHER', 'MAHMOUD', 'MAMADOU', 'MANUEL', 'MARCANTONIO', 'MARCELLO', 'MARCO',
  'MARIAN', 'MARIANO', 'MARIO', 'MARWAN', 'MASSIMO', 'MATEO', 'MATIAS',
  'MATTEO', 'MATTIA', 'MAURO', 'MAZEN', 'MD', 'MEHDI', 'MICHELE', 'MICO',
  'MIGUEL', 'MIMMO', 'MIRKO', 'MODESTO', 'MODOU', 'MOEZ', 'MOHAMAD',
  'MOHAMED', 'MOHAMMED', 'MOHSEN', 'MOKHTAR', 'MOSTAFA', 'MOUAD', 'MOUNIR',
  'MOUNSIF', 'MOURAD', 'MOUSSA', 'MUHAMMAD', 'MUNIR', 'MUSTAFA', 'MUSTAPHA',
  'MYKOLA', 'NABIL', 'NAIM', 'NASSER', 'NASSIM', 'NELLO', 'NICO', 'NICOLA',
  'NICOLAE', 'NICOLO', 'NINNI', 'NINO', 'NIZAR', 'NOAH', 'NUCCIO', 'NUNZIO',
  'OLEH', 'OLEKSANDR', 'OMAR', 'ONOFRIO', 'ORAZIO', 'OSAMA', 'OSCAR',
  'OSVALDO', 'OTHMANE', 'OTTAVIO', 'OUSMANE', 'OUSSAMA', 'PANCRAZIO', 'PAOLO',
  'PAPE', 'PASQUALE', 'PEPPE', 'PIERLUIGI', 'PIERO', 'PIERPAOLO', 'PIETRO',
  'PINO', 'PIO', 'PLACIDO', 'RACHID', 'RADWAN', 'RAED', 'RAFFAELE', 'RAFIK',
  'RAHIM', 'RAKIB', 'RAMZI', 'RASHID', 'REDA', 'REDOUANE', 'RENATO', 'RIAD',
  'RICARDO', 'RICCARDO', 'ROBERTO', 'ROCCO', 'ROHAN', 'ROLANDO', 'RONY',
  'ROSALINO', 'ROSARIO', 'ROSOLINO', 'RUBEN', 'RUGGERO', 'SAAD', 'SABRI',
  'SAFWAN', 'SAID', 'SAIF', 'SAKIB', 'SALAH', 'SALIM', 'SALVATORE', 'SAMBA',
  'SAMI', 'SAMIR', 'SAMUEL', 'SAMUELE', 'SANJAY', 'SANTIAGO', 'SANTO', 'SARO',
  'SASA', 'SAVERIO', 'SEBASTIAN', 'SEBASTIANO', 'SEKOU', 'SERGIO', 'SERHIY',
  'SHAHID', 'SHERIF', 'SIMONE', 'SOFIANE', 'SOHEL', 'SOUFIANE', 'STEFAN',
  'STEFANO', 'SUFYAN', 'TAHA', 'TAHER', 'TAHIR', 'TAMER', 'TANO', 'TARAS',
  'TAREK', 'TAYEB', 'THOMAS', 'TINDARO', 'TIZIANO', 'TOMMASO', 'TOTO', 'TURI',
  'UGO', 'UMBERTO', 'VALERIO', 'VASILE', 'VENERANDO', 'VIKRAM', 'VINCENZINO',
  'VINCENZO', 'VIRGILIO', 'VITALII', 'VITO', 'VITTORIO', 'WAEL', 'WALID',
  'WALTER', 'WANG', 'WISSEM', 'XIAO', 'YACINE', 'YAHIA', 'YAHYA', 'YAROSLAV',
  'YASSER', 'YASSINE', 'YOUNES', 'YOUSSEF', 'YUSUF', 'ZAID', 'ZAKARIA', 'ZAYD',
  'ZHANG', 'ZIAD', 'ZIED',
];

const M_72 = ['ANDREA'];

const M_51 = [
  'ADAMA', 'ALEX', 'ARIEL', 'CHARLIE', 'CRUZ', 'DANI', 'EDEN', 'HUI', 'JAMIE',
  'JORDAN', 'LI', 'LIANG', 'LIN', 'MIN', 'RAY', 'ROBIN', 'SAM', 'SASHA', 'XIN',
  'YAN', 'YARIN',
];

const F_99 = [
  'ADA', 'ADELA', 'ADELE', 'ADRIANA', 'AFAF', 'AGATA', 'AICHA', 'ALBA',
  'ALESSANDRA', 'ALESSIA', 'ALEXANDRA', 'ALICE', 'AMAL', 'AMALIA', 'AMBRA',
  'AMELIA', 'AMINA', 'AMINATA', 'ANASTASIA', 'ANDREEA', 'ANGELA', 'ANGELICA',
  'ANGELINA', 'ANILA', 'ANITA', 'ANJALI', 'ANNA', 'ANNALISA', 'ANTONELLA',
  'ANTONINA', 'ARDITA', 'ARIANNA', 'ARTA', 'ASIA', 'ASMA', 'ASMAA', 'ASSUNTA',
  'AURORA', 'AWA', 'AYA', 'AYESHA', 'AZIZA', 'BARBARA', 'BASMA', 'BEATRICE',
  'BENEDETTA', 'BIANCA', 'BINTA', 'BLERINA', 'BOUCHRA', 'CALOGERA',
  'CALOGERINA', 'CAMILLA', 'CARLA', 'CARMELA', 'CARMELINA', 'CAROLINA',
  'CATERINA', 'CECILIA', 'CETTINA', 'CHAIMAA', 'CHIARA', 'CHRISTINE', 'CINZIA',
  'CLARA', 'CLELIA', 'CONCETTA', 'CONCETTINA', 'CONSOLATA', 'CRISTINA',
  'CROCIFISSA', 'DALILA', 'DANIELA', 'DARIA', 'DENISA', 'DENISE', 'DESIREE',
  'DIANA', 'DINA', 'DOHA', 'DORA', 'DORIANA', 'DOROTEA', 'EDDA', 'EDLIRA',
  'EKATERINA', 'ELENA', 'ELEONORA', 'ELIANA', 'ELISA', 'ELONA', 'ELVIRA',
  'EMANUELA', 'EMMA', 'ERICA', 'ERIKA', 'ERMIRA', 'ERSILIA', 'ESTER', 'EVA',
  'FADWA', 'FATEMA', 'FATIMA', 'FATNA', 'FATOUMATA', 'FEDERICA', 'FILIPPA',
  'FILOMENA', 'FLORENTINA', 'FORTUNATA', 'FRANCA', 'FRANCESCA', 'GABRIELA',
  'GABRIELLA', 'GAETANA', 'GAIA', 'GASPARA', 'GHADA', 'GHOFRAN', 'GIADA',
  'GILDA', 'GINA', 'GINEVRA', 'GIOIA', 'GIORGIA', 'GIORGINA', 'GIOVANNA',
  'GISELLA', 'GIULIA', 'GIUSEPPA', 'GIUSEPPINA', 'GIUSI', 'GIUSY', 'GRAZIA',
  'GRETA', 'HAFSA', 'HAJAR', 'HALA', 'HANAN', 'HANANE', 'HASNA', 'HAYAT',
  'HIBA', 'HIND', 'HODA', 'HONG', 'HOUDA', 'IBTISAM', 'IKRAM', 'ILARIA',
  'ILENIA', 'ILHAM', 'IMAN', 'IMANE', 'IMMACOLATA', 'IMMACOLATINA', 'INES',
  'IOANA', 'IOLANDA', 'IRENE', 'IRINA', 'IRIS', 'IRMA', 'IRYNA', 'IVANA',
  'JAMILA', 'JENNIFER', 'JENNY', 'JESSICA', 'JIAQI', 'JIHANE', 'JING',
  'KADIATOU', 'KATERYNA', 'KAWTHAR', 'KETTY', 'KHADIJA', 'KHAWLA', 'KIMBERLY',
  'KLEDIA', 'LAILA', 'LAKSHMI', 'LAMIA', 'LAMYA', 'LARA', 'LATIFA', 'LAURA',
  'LAYLA', 'LEILA', 'LETIZIA', 'LIA', 'LIDIA', 'LILIANA', 'LINA', 'LINDA',
  'LING', 'LOREDANA', 'LORENA', 'LUBNA', 'LUCE', 'LUCIA', 'LUCREZIA',
  'LUDOVICA', 'MABROUKA', 'MADDALENA', 'MAE', 'MALAK', 'MALIKA', 'MANUELA',
  'MARGHERITA', 'MARIA', 'MARIAM', 'MARIAMA', 'MARIANGELA', 'MARIE',
  'MARIELLA', 'MARIIA', 'MARIKA', 'MARISA', 'MARTA', 'MARTINA', 'MARWA',
  'MARYAM', 'MATILDE', 'MEENA', 'MEI', 'MELANIA', 'MELISSA', 'MERIEM',
  'MICHELA', 'MIGENA', 'MIHAELA', 'MIMMA', 'MIRIAM', 'MONA', 'MONICA',
  'NABIHA', 'NABILA', 'NADA', 'NADIA', 'NADINE', 'NAIMA', 'NAJAT', 'NATALIA',
  'NAWAL', 'NAZIA', 'NELLA', 'NESRINE', 'NICOLE', 'NICOLETTA', 'NINA', 'NINFA',
  'NISRINE', 'NOEMI', 'NUNZIA', 'NUNZIATA', 'NUSRAT', 'OKSANA', 'OLENA',
  'OLGA', 'OLIVIA', 'ORIANA', 'ORNELLA', 'OTTAVIA', 'OUMOU', 'PAMELA', 'PAOLA',
  'PATRIZIA', 'PIA', 'PINA', 'POOJA', 'PRIYA', 'PROVVIDENZA', 'RACHELE',
  'RAHMA', 'RAJA', 'RALUCA', 'RANIA', 'RANIM', 'RAWAN', 'RAZAN', 'REBECCA',
  'RIM', 'RINA', 'RITA', 'ROBERTA', 'ROSA', 'ROSALIA', 'ROSARIA', 'ROSSANA',
  'RUBA', 'SABAH', 'SABINA', 'SABRINA', 'SADIA', 'SAFA', 'SAHAR', 'SALMA',
  'SALVATRICE', 'SALWA', 'SAMANTHA', 'SAMAR', 'SAMIA', 'SAMIRA', 'SANAA',
  'SANAE', 'SANTA', 'SARA', 'SARAH', 'SAVERIA', 'SAWSAN', 'SEBASTIANA',
  'SERAFINA', 'SERENA', 'SHABANA', 'SHAIMAA', 'SIHAM', 'SILVIA', 'SIMONA',
  'SNEHA', 'SOFIA', 'SOFIIA', 'SONIA', 'SOPHIE', 'SOUMAYA', 'STEFANIA',
  'STELLA', 'SUMAIYA', 'SUSANNA', 'SVEVA', 'SVITLANA', 'TAMARA', 'TANIA',
  'TAOUS', 'TEODORA', 'TERESA', 'TETIANA', 'TIZIANA', 'VALENTINA', 'VALERIA',
  'VANESSA', 'VERA', 'VERONICA', 'VIKTORIIA', 'VINCENZA', 'VIOLA', 'VIRGINIA',
  'VITA', 'VITTORIA', 'WAFA', 'WARDA', 'WIAM', 'XIAOYU', 'YAMINA', 'YARYNA',
  'YASMIN', 'YASMINE', 'YING', 'YLENIA', 'YOSRA', 'YULIA', 'ZAHRA', 'ZAINAB',
  'ZAKIA', 'ZINEB', 'ZOHRA',
];

const F_51 = [
  'DANA', 'JOLLY', 'JOY', 'KIM', 'LOU', 'NICOL', 'NIKITA', 'NOA', 'NOUR',
  'YUKI', 'ZIYI',
];

const U_51 = ['YUXIN'];

export const STUDENT_GENDER_DICTIONARY: ReadonlyMap<string, StudentGenderDictionaryEntry> = (() => {
  const map = new Map<string, StudentGenderDictionaryEntry>();
  for (const name of M_98) map.set(name, { genere: 'M', percentuale: 98 });
  for (const name of M_72) map.set(name, { genere: 'M', percentuale: 72 });
  for (const name of M_51) map.set(name, { genere: 'M', percentuale: 51 });
  for (const name of F_99) map.set(name, { genere: 'F', percentuale: 99 });
  for (const name of F_51) map.set(name, { genere: 'F', percentuale: 51 });
  for (const name of U_51) map.set(name, { genere: 'U', percentuale: 51 });
  return map;
})();

export function getColoreForSesso(sesso: SessoIpotizzato): ColoreGenereAlunno {
  if (sesso === 'M') return 'BLU';
  if (sesso === 'F') return 'ROSA';
  return 'GRIGIO';
}

function normalizeWords(raw: string): string[] {
  const stripped = (raw ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    // Preserva D' come particella separata da unire alla parola successiva
    .replace(/\bD['’`]\s*/g, 'D ')
    // Rimuove altri apostrofi interni (es. DELL'ORO -> DELLORO)
    .replace(/['’`]/g, '')
    // Sostituisce trattini e altri separatori non alfabetici con spazi
    .replace(/[^A-Z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!stripped) return [];
  return stripped.split(' ').filter(Boolean);
}

interface NormalizedUnit {
  text: string;
  isParticleJoined: boolean;
}

function joinParticles(words: string[]): NormalizedUnit[] {
  const units: NormalizedUnit[] = [];
  let i = 0;
  while (i < words.length) {
    const current = words[i];
    if (PARTICLES.has(current) && i + 1 < words.length) {
      const group: string[] = [current];
      let j = i + 1;
      while (PARTICLES.has(words[j]) && j + 1 < words.length) {
        group.push(words[j]);
        j += 1;
      }
      group.push(words[j]);
      units.push({
        text: group.join(' '),
        isParticleJoined: true,
      });
      i = j + 1;
    } else {
      units.push({
        text: current,
        isParticleJoined: false,
      });
      i += 1;
    }
  }
  return units;
}

function mergeCompoundPrefixes(nameUnits: string[]): string[] {
  const merged: string[] = [];
  let i = 0;
  while (i < nameUnits.length) {
    const token = nameUnits[i];
    if (COMPOUND_PREFIXES.has(token) && i + 1 < nameUnits.length) {
      merged.push(`${token}${nameUnits[i + 1]}`);
      i += 2;
    } else {
      merged.push(token);
      i += 1;
    }
  }
  return merged;
}

function capitalizeWord(word: string): string {
  if (!word) return '';
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function invalidLineResult(nomeOriginale: string): StudentGenderEstimation {
  return {
    nomeOriginale,
    cognome: '',
    nomi: '',
    sesso: 'INDETERMINATO',
    colore: 'GRIGIO',
    confidenza: 'BASSA',
    nota: 'riga non valida',
  };
}

/**
 * Classifica il sesso ipotizzato di un alunno a partire da una riga nel formato
 * "COGNOME NOME", "COGNOME COGNOME NOME" o "COGNOME NOME NOME2" usando esclusivamente
 * il dizionario locale di `elenco_nomi_genere.pdf` e le regole deterministiche di procedura.
 */
export function estimateStudentGender(rawLine: string): StudentGenderEstimation {
  const nomeOriginale = (rawLine ?? '').trim();
  if (!nomeOriginale) {
    return invalidLineResult('');
  }

  const words = normalizeWords(nomeOriginale);
  if (words.length < 2) {
    return invalidLineResult(nomeOriginale);
  }

  const units = joinParticles(words);
  if (units.length < 2) {
    return invalidLineResult(nomeOriginale);
  }

  // Step 3: Determina il cognome
  // - la prima parola è sempre cognome;
  // - se la prima parola ha due sole lettere (es. LI, MA) e non è già composta da particella,
  //   anche la seconda fa parte del cognome (se rimane almeno un nome).
  let surnameUnitCount = 1;
  if (!units[0].isParticleJoined && units[0].text.length === 2 && units.length >= 3) {
    surnameUnitCount = 2;
  }

  const cognome = units
    .slice(0, surnameUnitCount)
    .map((u) => u.text)
    .join(' ');
  const rawNameUnits = units.slice(surnameUnitCount).map((u) => u.text);
  if (rawNameUnits.length === 0) {
    return invalidLineResult(nomeOriginale);
  }

  const mergedNames = mergeCompoundPrefixes(rawNameUnits);
  const nomi = mergedNames.join(' ');

  const last = mergedNames[mergedNames.length - 1];
  const penultimate = mergedNames.length >= 2 ? mergedNames[mergedNames.length - 2] : null;
  const penultimateEntry = penultimate
    ? STUDENT_GENDER_DICTIONARY.get(penultimate)
    : undefined;

  // Caso speciale MARIA come ultimo nome: controlla il nome precedente
  if (last === 'MARIA' && penultimate) {
    if (penultimateEntry && penultimateEntry.genere === 'M') {
      const confidenza: ConfidenzaGenereAlunno =
        penultimateEntry.percentuale < 70 ? 'BASSA' : 'MEDIA';
      return {
        nomeOriginale,
        cognome,
        nomi,
        sesso: 'M',
        colore: 'BLU',
        confidenza,
        nota: `Maria preceduto da ${capitalizeWord(penultimate)}, secondo nome maschile`,
      };
    }
    return {
      nomeOriginale,
      cognome,
      nomi,
      sesso: 'F',
      colore: 'ROSA',
      confidenza: 'ALTA',
      nota: '',
    };
  }

  const dictEntry = STUDENT_GENDER_DICTIONARY.get(last);
  if (dictEntry) {
    if (dictEntry.genere === 'U') {
      return {
        nomeOriginale,
        cognome,
        nomi,
        sesso: 'INDETERMINATO',
        colore: 'GRIGIO',
        confidenza: 'BASSA',
        nota: 'nome ambiguo senza prevalenza di genere',
      };
    }

    const sesso: SessoIpotizzato = dictEntry.genere;
    const colore = getColoreForSesso(sesso);

    // Conflitto con il penultimo nome (se presente in elenco con genere opposto M/F)
    const hasPenultimateConflict =
      Boolean(penultimateEntry) &&
      (penultimateEntry!.genere === 'M' || penultimateEntry!.genere === 'F') &&
      penultimateEntry!.genere !== sesso;

    if (dictEntry.percentuale < 70) {
      return {
        nomeOriginale,
        cognome,
        nomi,
        sesso,
        colore,
        confidenza: 'BASSA',
        nota: 'nome ambiguo, genere più diffuso',
      };
    }

    if (dictEntry.percentuale <= 95) {
      return {
        nomeOriginale,
        cognome,
        nomi,
        sesso,
        colore,
        confidenza: 'MEDIA',
        nota: hasPenultimateConflict && penultimate
          ? `nome con confidenza media e conflitto con ${capitalizeWord(penultimate)}`
          : `nome con confidenza media (${dictEntry.percentuale}%)`,
      };
    }

    if (hasPenultimateConflict && penultimate) {
      return {
        nomeOriginale,
        cognome,
        nomi,
        sesso,
        colore,
        confidenza: 'MEDIA',
        nota: `penultimo nome ${capitalizeWord(penultimate)} in conflitto`,
      };
    }

    return {
      nomeOriginale,
      cognome,
      nomi,
      sesso,
      colore,
      confidenza: 'ALTA',
      nota: '',
    };
  }

  // Step 6: Nome decisivo NON in elenco -> regola della desinenza
  if (last.endsWith('A')) {
    return {
      nomeOriginale,
      cognome,
      nomi,
      sesso: 'F',
      colore: 'ROSA',
      confidenza: 'BASSA',
      nota: 'nome non in elenco, desinenza -A',
    };
  }

  if (last.endsWith('O')) {
    return {
      nomeOriginale,
      cognome,
      nomi,
      sesso: 'M',
      colore: 'BLU',
      confidenza: 'BASSA',
      nota: 'nome non in elenco, desinenza -O',
    };
  }

  // Step 7: Nessuna parola riconoscibile / desinenza ambigua
  return {
    nomeOriginale,
    cognome,
    nomi,
    sesso: 'INDETERMINATO',
    colore: 'GRIGIO',
    confidenza: 'BASSA',
    nota: 'nome non in elenco, desinenza ambigua',
  };
}

export function estimateStudentGendersBatch(lines: string[]): StudentGenderEstimation[] {
  return lines.map((line) => estimateStudentGender(line));
}

export function formatGenderEstimationLine(res: StudentGenderEstimation): string {
  return `${res.nomeOriginale} | ${res.cognome} | ${res.nomi} | ${res.sesso} | ${res.colore} | ${res.confidenza} | ${res.nota}`;
}
