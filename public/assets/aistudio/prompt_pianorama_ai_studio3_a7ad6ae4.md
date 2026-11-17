# PROMPT PER GOOGLE AI STUDIO – BUILD MODE
## PIANORAMA – Il laboratorio dei piani di lavoro

Sei un Senior Software Architect, UX/UI Designer e sviluppatore esperto di applicazioni didattiche per la scuola italiana. Conosci React, TypeScript, le applicazioni offline-first, la generazione di documenti DOCX e PDF nel browser e i principi di protezione dei dati personali (GDPR).

Devi realizzare **PIANORAMA**, un'applicazione destinata principalmente ai docenti della scuola secondaria di primo grado italiana. L'app serve a creare, compilare, modificare, salvare e riutilizzare programmazioni didattiche disciplinari partendo dal modello DOCX ufficiale della scuola. In una fase iniziale sarà usata da un solo docente; in futuro potrà essere distribuita ad altri insegnanti, previa autorizzazione dell'istituto.

Lingua dell'interfaccia: **italiano**. Tono sobrio, professionale, adatto al contesto scolastico.

---

### 1. Vincoli assoluti

- Funzionamento **completamente offline** dopo il primo caricamento.
- **Nessuna** chiamata a Gemini API o ad altre API di intelligenza artificiale, a pagamento o gratuite.
- **Nessuna** dipendenza da servizi cloud, nessun account obbligatorio, nessuna telemetria, nessun analytics.
- **Nessuna** libreria caricata da CDN durante l'uso: tutte le dipendenze sono incluse nel bundle.
- **Nessuna** trasmissione online di documenti o di dati sulle classi.
- Archiviazione esclusivamente locale.
- Generazione di DOCX e PDF interamente locale, senza connessione.
- I testi proposti automaticamente devono derivare da archivi locali, relazioni predefinite, modelli testuali e regole modificabili dal docente. Non usare modelli generativi per produrre testo.

---

### 2. Privacy e dati degli alunni

Le informazioni su alunni con BES, DSA e disabilità sono sensibili. Implementare queste regole:

- Non chiedere mai nome, cognome, codice fiscale, indirizzo o altri dati identificativi degli alunni.
- Il modulo "Composizione della classe" registra solo conteggi aggregati (numero di alunni, maschi, femmine, ripetenti, alunni con BES).
- Non registrare diagnosi né informazioni sanitarie. Per la situazione di partenza usare solo categorie aggregate (livello basso, medio/basso, medio, alto) e conteggi, non elenchi nominativi.
- Mostrare un avviso in-app sulla natura sensibile dei dati e sul fatto che l'app non li trasmette.
- Il backup deve poter essere cifrato con una password scelta dal docente, tramite Web Crypto API.

---

### 3. Piattaforme e architettura

**Stack:** React, TypeScript, Vite, componenti responsive. Nessun framework server.

**Persistenza:** IndexedDB, con un livello di astrazione (ad esempio con la libreria Dexie, inclusa nel bundle) che permetta in futuro di sostituire lo storage.

**Backup:**
- Esportazione di tutti i dati in un file `.pianorama` (JSON cifrato o in chiaro, a scelta del docente).
- Importazione con anteprima e conferma prima di sovrascrivere.
- Promemoria periodico per fare un backup.

**Distribuzione:**
- Versione PWA installabile con service worker per il funzionamento offline.
- Nel documento finale, indica la soluzione consigliata per un pacchetto Windows autonomo (Tauri preferito rispetto a Electron per dimensioni e sicurezza) e spiega perché una PWA da sola non garantisce tutte le funzioni offline in modo affidabile su Windows.

**Piattaforme future:** Android, iPadOS, macOS, Linux. Il codice deve essere separato in moduli, così la logica dominio non dipende dalla UI.

---

### 4. Generazione DOCX e PDF

- Il modello DOCX di riferimento è `Modello_programmazione_scuola_SECONDARIA_DI_I_GRADO.docx`. Struttura da rispettare:
  - intestazione istituzionale (Ministero dell'Istruzione e del Merito, Istituto Comprensivo Villafrati, indirizzo, codice fiscale, contatti);
  - titolo "PROGRAMMAZIONE DISCIPLINARE di ___", con campi per scuola, plesso, anno scolastico, classe, disciplina, docente;
  - sezione "Composizione della classe" con tabella di conteggi;
  - sezione "Situazione della classe" con le caratteristiche della classe descritte nella sezione 5.8 e con i mezzi usati per individuare le risorse e i bisogni;
  - sezione "Analisi della situazione di partenza" con livelli rilevati (basso, medio/basso, medio, alto) e fonti di rilevazione;
  - sezione "Strategie ed interventi per potenziamento, consolidamento e recupero" organizzata per gruppi di livello, con strategie selezionabili da casella di spunta.
- Il modello DOCX non è ancora stato consegnato in forma definitiva. Finché non sarà disponibile, costruisci il generatore DOCX sulla base della struttura sopra descritta, con uno **schema di mappatura modificabile** (file JSON locale) che colleghi ogni campo dell'app a una sezione del modello. Quando il modello reale sarà fornito, dovrà bastare aggiornare la mappatura.
- Per il DOCX usa una libreria JavaScript che lavori nel browser (ad esempio `docx`). Per il PDF usa `jsPDF` oppure stampa del DOCX tramite il rendering del browser. Verifica che entrambe le strade funzionino offline.
- Le caselle di spunta devono apparire come ☒ / ☐ nel documento generato.
- Il documento generato deve rispettare il carattere Garamond e il colore intestazione 1F3864 del modello.

---

### 5. Moduli funzionali

**5.1 Gestione programmazioni**
- Creazione di una programmazione a partire dal modello vuoto o da una programmazione esistente (duplica e modifica).
- Elenco delle programmazioni con filtri per anno scolastico, classe e disciplina.
- Stati: bozza, completata, archiviata.

**5.2 Editor guidato**
- Un'interfaccia a sezioni, con navigazione laterale su desktop e a schede su tablet e telefono.
- Ogni sezione del modello è un form separato con salvataggio automatico.
- Anteprima in tempo reale del documento finale.

**5.3 Libreria di contenuti locale**
- Archivio di obiettivi, competenze, strategie, metodologie, criteri di valutazione e attività, organizzato per disciplina e classe.
- Il docente può aggiungere, modificare, duplicare e archiviare ogni voce.
- Ricerca testuale locale (senza servizi esterni).
- Importazione ed esportazione della libreria in formato JSON.

**5.4 Suggerimenti automatici senza AI**
- Suggerimenti basati su regole esplicite: ad esempio, se il livello della classe è "medio-basso", proponi strategie di recupero dalla libreria locale.
- Le regole sono in un file JSON modificabile dal docente, con una schermata per visualizzarle e modificarle.
- I suggerimenti sono sempre proposte: il docente li accetta, li modifica o li ignora.

**5.5 Impostazioni**
- Dati di istituto e del docente (memorizzati solo in locale).
- Scelta del tema (chiaro, scuro, sistema).
- Dimensione del testo.
- Gestione backup e ripristino.

---

**5.6 Import del registro voti e fasce di livello**

Il docente importa un registro voti in formato Excel (.xlsx), esportato dal registro della scuola. Non è possibile fornire un file di esempio in questa fase: il parser deve quindi riconoscere la struttura cercando le intestazioni, senza posizioni fisse di celle.

Struttura attesa del file (da trattare come indicativa):
- intestazione istituzionale nelle prime righe (nome dell'istituto, indirizzo, codice fiscale, codice meccanografico): da ignorare;
- titolo "RIEPILOGO VOTI" e nome della classe, ad esempio "1A ORDINARIO (SCIENZE)";
- riga delle intestazioni con le colonne "Alunno", "Media" e le colonne dei voti per tipologia (ad esempio ORALE, SCRITTO, PRATICO);
- riga "Valutazioni" con i conteggi dei voti: da ignorare;
- una riga per ciascun alunno, con cognome e nome nella colonna Alunno e la media o i singoli voti;
- righe di piè di pagina di stampa (ad esempio "Stampato il ..."): da ignorare;
- celle unite: leggerle come valore della cella in alto a sinistra.

Algoritmo di import:
1. Leggere il primo foglio in memoria con una libreria offline inclusa nel bundle (ad esempio SheetJS). Nessuna richiesta di rete.
2. Individuare la riga delle intestazioni come la prima che contiene "Alunno" e "Media", oppure "Alunno" e almeno una colonna di voti.
3. Per ogni riga sotto l'intestazione con un valore nella colonna Alunno, escluse le righe di riepilogo e di stampa, leggere la media. Se la colonna Media è vuota o non numerica, calcolarla come media aritmetica dei voti numerici compresi tra 1 e 10. Accettare sia la virgola sia il punto come separatore decimale (6,5 e 6.5).
4. Il nome e il cognome vengono letti solo per scartarli: non vengono salvati in nessuna forma, né nello stato dell'app né nel backup. A ogni alunno viene assegnato un identificativo progressivo anonimo ("Alunno 1", "Alunno 2", ...) in ordine di apparizione nel file.
5. Assegnare la fascia con queste soglie, modificabili nelle impostazioni:
   - media sotto 5,5 → fascia 4-5 (livello basso);
   - da 5,5 a meno di 6,5 → fascia 6 (livello medio/basso);
   - da 6,5 a meno di 8,5 → fascia 7-8 (livello medio);
   - da 8,5 in su → fascia 9-10 (livello alto).
   La media non viene arrotondata prima del confronto.
6. Gli alunni senza media calcolabile, o con media inferiore a 4, vanno in una sezione "Da verificare". Non sono conteggiati in nessuna fascia finché il docente non li sistema.

Spostamento manuale tra fasce:
- Nella schermata di import, e nella sezione Analisi della situazione di partenza, ogni alunno anonimo compare con il numero progressivo, la media e la fascia assegnata automaticamente.
- Il docente può spostare ogni alunno in un'altra fascia tramite menu a tendina, e in alternativa con trascinamento (drag and drop). Entrambe le modalità devono funzionare da tastiera.
- Ogni alunno spostato manualmente è segnalato con l'etichetta "spostato dal docente".
- I conteggi per fascia si aggiornano subito, e la tabella "Livelli di partenza rilevati" del DOCX riflette la situazione corrente.
- Il pulsante "Ripristina fasce automatiche" riporta ogni alunno alla fascia calcolata dalla media. Prima del ripristino è richiesta conferma.
- Lo spostamento manuale non modifica la media né le soglie.
- Il numero progressivo serve al docente per riconoscere l'alunno nel registro originale. Viene mostrato anche quando la media non è disponibile.

Privacy:
- Il file originale non viene conservato dopo l'import né incluso nel backup.
- Il DOCX e il PDF riportano solo conteggi per fascia, senza numeri progressivi né nomi.

**5.7 Curricolo verticale: catalogo, selezione e importazione (solo secondaria)**

L'app contiene un catalogo locale di obiettivi, abilità e conoscenze della scuola secondaria di primo grado, organizzato per classe e per disciplina. Il catalogo è incluso nel bundle e può essere sostituito o aggiornato dal docente tramite un file JSON importato.

Fonti del catalogo:
- classe prima: Curricolo verticale nuovo (Curricolo_verticale_nuovo.pdf);
- classi seconda e terza: Curricolo verticale vecchio, anno 2025/2026 (CURRICOLO_VERTICALE_vecchio.pdf).

Ogni voce del catalogo ha: identificativo, classe di riferimento, disciplina, tipo (obiettivo specifico, abilità, conoscenza, competenza), nucleo tematico se presente, testo, documento di provenienza.

Schermata di selezione:
- Il docente sceglie una classe e una disciplina.
- All'apertura tutte le voci della selezione sono già selezionate.
- Ogni voce ha una casella di spunta.
- Pulsanti "Seleziona tutti" e "Deseleziona tutti" per la selezione corrente.
- Un contatore mostra "X di Y selezionati".
- Le voci sono raggruppate per tipo (obiettivi, abilità, conoscenze) e per nucleo tematico, con intestazioni di gruppo che a loro volta si possono selezionare o deselezionare.

Importazione:
- Il pulsante "Importa selezionati" copia le voci selezionate nella programmazione corrente, come testo modificabile.
- Le voci importate sono copie: modificarle o eliminarle non altera il catalogo.
- Il docente può importare obiettivi da altre classi (precedenti o successive) della stessa disciplina. Il selettore di classe deve quindi mostrare tutte le classi della secondaria, e le voci di altre classi sono indicate con l'etichetta della classe di provenienza.
- Dopo l'importazione, ogni voce può essere modificata nel testo, eliminata, riordinata, oppure può esserne aggiunta una manuale.
- Un'eventuale voce ripristinabile dal catalogo è indicata e può essere riportata alla formulazione originale.

Aggiornamento del catalogo:
- Il docente può importare un file JSON con lo stesso formato del catalogo incluso. Prima della sostituzione l'app mostra un riepilogo di quante voci verranno aggiunte, modificate o rimosse, e chiede conferma.
- Il catalogo non contiene dati degli alunni.

Criteri di verifica:
- Alla scelta di una classe e disciplina, tutte le voci risultano selezionate.
- "Deseleziona tutti" e la selezione singola aggiornano il contatore.
- Le voci importate da una classe diversa sono etichettate con la classe di provenienza.
- Modificare una voce importata non altera il catalogo.

**5.8 Caratteristiche della classe (classi eterogenee)**

Le classi non sono considerate omogenee. Ogni dimensione può contenere più descrizioni, ciascuna con la propria quota di alunni. Esempio: "Metodo di studio": la maggior parte della classe lo ha acquisito, una parte è in via di maturazione.

Termini usati nell'app:
- **Dimensione**: un ambito di osservazione. Partono predefinite Atteggiamento e motivazione, Collaborazione e relazioni, Metodo di studio, Autonomia, Partecipazione. Il docente può aggiungerne altre.
- **Descrizione**: la caratteristica osservata. Può essere scelta dal catalogo predefinito (tranquilla, vivace, motivata, poco motivata, collaborativa, poco collaborativa, problematica) o scritta liberamente.
- **Stato**: per le dimensioni di acquisizione, una scala: acquisito, in consolidamento, in via di maturazione, non ancora avviato, nessuno. Il valore predefinito è "in consolidamento", modificabile dal docente per ogni riga.
- **Quota**: quanti alunni presentano la caratteristica, scelta fra tutta la classe, quasi tutta la classe, la maggior parte, circa metà, una parte, pochi, nessuno. Il valore predefinito è "la maggior parte", modificabile per ogni riga.
- **Nessuno**: sia nello stato sia nella quota, questa opzione indica che la caratteristica non è presente. In quel caso la frase non viene generata né inserita nel documento, e la riga resta visibile nell'editor, con l'indicazione "non inserita". Ogni quota corrisponde a una percentuale modificabile nelle impostazioni (ad esempio tutta la classe 100%, la maggior parte oltre il 50%, una parte tra il 25% e il 50%, pochi sotto il 25%).
- **Quota numerica** (facoltativa): il docente può indicare il numero esatto di alunni, a partire dal totale della composizione della classe. Se presente, sostituisce la quota verbale nel testo generato.

Regole:
- In una stessa dimensione si possono aggiungere più righe, anche con descrizioni opposte, perché rappresentano sottogruppi diversi (ad esempio alcuni alunni tranquilli e altri vivaci).
- Cambiare la quota di una riga non cancella le altre righe della dimensione.
- Il sistema segnala, senza bloccare, le quote incoerenti: più righe della stessa dimensione con lo stesso stato la cui somma supera il 100%.
- Non viene mai registrato un elenco di nomi o di numeri progressivi associato a una caratteristica.

Interfaccia:
- Per ogni dimensione, un elenco di righe. Ogni riga contiene descrizione, stato (se la dimensione lo prevede), quota e quota numerica facoltativa.
- Pulsante "Aggiungi descrizione" per ogni dimensione, e "Aggiungi dimensione" per crearne una nuova.
- Anteprima della frase generata accanto a ogni dimensione, ad esempio: "La maggior parte della classe ha acquisito un metodo di studio autonomo; una parte è ancora in via di maturazione."
- Le frasi sono costruite con modelli testuali locali, senza AI, e il docente può modificarle. Una frase modificata diventa testo manuale e non viene sovrascritta dai cambi successivi, salvo ripristino esplicito.

Documento:
- Nella sezione "Situazione della classe" del DOCX, ogni dimensione compare come paragrafo discorsivo con le sue frasi. Le dimensioni vuote o con tutte le righe impostate su "nessuno" non compaiono. Una riga con stato o quota "nessuno" non produce alcuna frase.
- La tabella "Livelli di partenza rilevati" si compila dai conteggi per fascia dell'import del registro (sezione 5.6), non da questa sezione.

Criteri di verifica:
- È possibile aggiungere più descrizioni alla stessa dimensione e mantenerle tutte.
- Le frasi generate sono corrette per ogni combinazione di quota e stato.
- Le quote incoerenti generano un avviso, senza bloccare il salvataggio.
- Nessun dato identificativo di alunni compare in questa sezione o nel documento.

### 6. Schermate richieste

1. Benvenuto e informativa privacy (al primo avvio).
2. Dashboard con elenco delle programmazioni e azioni rapide.
3. Nuova programmazione (scelta del modello o della duplicazione).
4. Editor a sezioni con salvataggio automatico.
5. Libreria contenuti con ricerca e filtri.
6. Gestione regole di suggerimento.
7. Anteprima e esportazione (DOCX, PDF, stampa).
8. Backup e ripristino.
9. Import del registro voti e fasce di livello, con spostamento manuale degli alunni tra fasce.
10. Impostazioni (incluse le soglie delle fasce).

---

### 7. Requisiti di qualità

- **Accessibilità:** contrasto WCAG AA, navigazione da tastiera, etichette ARIA, supporto allo screen reader.
- **Responsive:** utilizzabile da 360 px di larghezza fino ai monitor desktop.
- **Affidabilità dei dati:** nessuna perdita di dati alla chiusura del browser; salvataggio automatico con indicatore di stato; gestione degli errori di quota IndexedDB.
- **Prestazioni:** avvio in meno di 3 secondi su un PC di fascia media dopo la prima installazione.
- **Test:** unit test per la logica di mappatura DOCX e per le regole di suggerimento; test di generazione su un documento di esempio.

---

### 8. Cosa consegnare

1. Struttura completa del progetto con le cartelle e i file.
2. Codice funzionante di tutti i moduli.
3. Documento `README.md` con istruzioni di installazione e di uso offline.
4. Schema di mappatura DOCX e istruzioni per aggiornarlo quando arriverà il modello definitivo.
5. Elenco delle dipendenze, ciascuna con licenza e versione fissata.
6. Nota tecnica sulla scelta fra PWA, Tauri ed Electron per la distribuzione Windows.
7. Elenco dei criteri di verifica soddisfatti, con un checklist finale.

---

### 9. Criteri di verifica

- L'app si avvia e funziona con la rete disattivata.
- Nessuna richiesta di rete durante l'uso, verificabile dagli strumenti per sviluppatori.
- I dati restano dopo chiusura e riapertura del browser.
- Il backup esportato si reimporta senza perdite.
- Il DOCX generato apre correttamente in Microsoft Word e rispetta la struttura del modello.
- Il PDF generato è leggibile e stampabile in formato A4.
- Nessun dato identificativo di alunni compare nell'app o nei file esportati.
- Dopo l'import di un registro, il numero di alunni per fascia coincide con quello calcolato a mano sulle medie.
- Spostare un alunno da una fascia all'altra aggiorna subito i conteggi e il documento generato.
- Il ripristino delle fasce automatiche riporta ogni alunno alla fascia della sua media, e chiede conferma prima.
