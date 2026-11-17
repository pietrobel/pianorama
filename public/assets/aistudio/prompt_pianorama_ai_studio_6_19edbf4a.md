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

### 4. Generazione DOCX e PDF (modello identico all'originale)

Il documento generato deve essere indistinguibile dal modello originale della scuola: stesso layout, stessi font, stesse dimensioni, stessi colori, stesse tabelle, stesse scritte, stesso banner. Il metodo richiesto è riempire il modello originale, non ricostruirlo.

**Il file di riferimento.** Il modello originale è `Modello_programmazione_scuola_SECONDARIA_DI_I_GRADO.docx`. Deve essere incluso nel progetto nella cartella `/assets/modello/modello_programmazione.docx`, così l'app lo carica in modo predefinito, senza che il docente debba caricarlo. Il banner della scuola fa parte del modello, nell'intestazione: viene conservato così com'è, senza essere ricreato.

**Metodo di generazione.**
1. Usare una libreria offline che riempia i segnaposto dei file DOCX senza alterare il resto del documento (ad esempio `docxtemplater` con `pizzip`, entrambe incluse nel bundle). Il file DOCX viene trattato come archivio: si modificano solo i testi dei campi, il resto del file resta byte per byte uguale.
2. Non ricreare mai stili, font, margini, tabelle, intestazioni o immagini con codice. Non cambiare dimensioni dei caratteri, colori, spaziature, bordi o sfondi.
3. Per ogni campo compilabile, sostituire il segnaposto con il valore del docente. I campi vuoti sono indicati nel modello da linee di sottolineatura ("___") o da caselle di spunta "[ ]".
4. Le caselle di spunta restano nel formato del modello: "[X]" se selezionate, "[ ]" se no.
5. Le liste ripetute (ad esempio le strategie, o i mezzi utilizzati) si generano clonando il paragrafo o la riga di tabella originale, mantenendo il suo stile.

**Configurazione dei campi (una volta sola).** Al primo avvio, l'app legge il modello e mostra l'elenco di tutti i campi vuoti individuati ("___", "[ ]", celle vuote). Il docente associa ogni campo a un dato dell'app, ad esempio scuola, plesso, anno scolastico, classe, disciplina, docente, composizione, situazione. Questa associazione è salvata e può essere modificata.

**Scritte da mantenere.** Tutte le scritte del modello devono restare identiche, parola per parola, con la stessa punteggiatura e la stessa maiuscola/minuscola. Non riscriverle a mano: restano quelle del file originale. In particolare:
- intestazione: "Ministero dell'Istruzione e del Merito", indirizzo dell'istituto, codice fiscale, telefoni, siti e indirizzi di posta;
- titolo: "PROGRAMMAZIONE DISCIPLINARE di", "SCUOLA", "PLESSO DI", "ANNO SCOLASTICO", "CLASSE", "DISCIPLINA", "DOCENTE";
- "COMPOSIZIONE DELLA CLASSE" con "Alunni", "Maschi", "Femmine", "Ripetenti", "Con Bisogni Educativi Speciali (BES)";
- "SITUAZIONE DELLA CLASSE" con "TIPOLOGIA", "LIVELLO", "MEZZI UTILIZZATI PER INDIVIDUARE LE RISORSE ED I BISOGNI DEGLI ALUNNI:" e le sue voci;
- "ANALISI DELLA SITUAZIONE DI PARTENZA", "Situazione di partenza degli alunni in relazione alla DISCIPLINA:", "Livelli di partenza rilevati" con le quattro colonne "Livello basso / (voti inferiori alla sufficienza)", "Livello medio/basso / (voto 6)", "Livello medio / (voti 7/8)", "Livello alto / (voti 9/ 10)";
- tutte le sezioni successive (strategie, interventi, firme), copiate dal file originale.

**Banner.** Il banner fa parte del file modello, quindi si conserva automaticamente. Solo se per qualche motivo il file modello non è disponibile, l'app mostra un campo per caricare il banner come file JPEG, da inserire nell'intestazione con le stesse dimensioni e la stessa posizione che ha nel modello originale. Questo caso è un fallback, non il comportamento normale.

**Tabella "Livelli di partenza rilevati".** Le celle dei livelli restano quelle del modello. Nella cella sotto ogni livello compare il numero di alunni della fascia calcolata dall'import del registro (sezione 5.6). Nessun nome e nessun numero progressivo compare nel documento.

**Situazione della classe.** La tabella "TIPOLOGIA" e "LIVELLO" del modello viene compilata con le dimensioni e le frasi della sezione 5.8. Le frasi occupano le righe del modello. Se una dimensione non ha frasi, la sua riga resta con la scritta originale e la casella vuota, senza testo inventato.

**Verifica di identità.** Prima di dichiarare il documento pronto, l'app confronta il DOCX generato con il modello originale: stesse sezioni, stesse scritte invariate, stessi font e stesse dimensioni nel file XML. Ogni differenza di formattazione è un errore. Il PDF viene generato dal DOCX con la stampa del browser, in formato A4, con le impostazioni di margine del modello (superiore 1,5 cm, destro 2 cm, inferiore 2 cm, sinistro 1,6 cm).

**Font.** Il modello usa Garamond, Footlight MT Light, Gill Sans MT Condensed, Arial, Arial Narrow e Times New Roman, font di sistema di Windows. Il DOCX li conserva per nome, quindi Word li mostra correttamente. Per il PDF, l'app usa i font installati sul computer; se un font manca, la stampa lo sostituisce, e l'app lo segnala nella schermata di anteprima, senza scaricare font dalla rete.

**Criteri di verifica:**
- il DOCX generato apre in Word con lo stesso layout del modello originale;
- ogni scritta del modello è presente e invariata, e nessun campo compilato resta vuoto senza motivo;
- il banner compare nell'intestazione senza essere ricreato;
- il PDF ha le stesse pagine e la stessa impaginazione del DOCX;
- nessun dato identificativo di alunno compare nel documento.

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

**5.7 Curricolo verticale: catalogo precaricato, selezione e importazione (solo secondaria)**

L'app contiene già il catalogo di obiettivi, abilità, conoscenze e competenze della scuola secondaria di primo grado. Il docente non inserisce nulla a mano. Il catalogo è un file `curricolo_secondaria.json` incluso nel progetto e caricato all'avvio.

Fonti del catalogo:
- classe prima: Curricolo verticale nuovo;
- classi seconda e terza: Curricolo verticale vecchio, anno 2025/2026.

Ogni voce contiene: identificativo, classe di riferimento, disciplina, tipo (obiettivo, abilità, conoscenza, competenza), nucleo tematico se presente, testo, documento di provenienza.

Selezione:
- Il docente sceglie la disciplina e la classe di destinazione.
- Le voci della classe di destinazione compaiono già selezionate.
- Le voci delle altre classi (prima, seconda, terza, anche se diverse da quella di destinazione) compaiono in una sezione "Da altre classi", espandibile, con tutte le voci deselezionate di default. Ogni voce indica la classe di provenienza.
- Ogni voce ha una casella di spunta. Pulsanti "Seleziona tutti" e "Deseleziona tutti" per ogni gruppo (tipo, nucleo, classe) e per l'intero elenco.
- Un contatore mostra "X di Y selezionati".

Importazione:
- "Importa selezionati" copia le voci selezionate nella programmazione corrente, come testo modificabile.
- Le copie sono indipendenti dal catalogo: modificarle o eliminarle non altera il catalogo.
- Ogni voce importata può essere modificata nel testo, eliminata, riordinata. È possibile aggiungere voci manuali. Se la voce deriva dal catalogo, è disponibile il ripristino della formulazione originale.

Aggiornamento del catalogo:
- Il docente può importare un file JSON con lo stesso formato. Prima della sostituzione l'app mostra quante voci verranno aggiunte, modificate o rimosse, e chiede conferma.
- Il catalogo non contiene dati degli alunni.

Criteri di verifica:
- Alla scelta di disciplina e classe, le voci della classe di destinazione risultano tutte selezionate, quelle di altre classi tutte deselezionate.
- "Deseleziona tutti" e la selezione singola aggiornano il contatore.
- Le voci importate da altre classi sono etichettate con la classe di provenienza.
- Modificare una voce importata non altera il catalogo.

**5.8 Caratteristiche della classe (classi eterogenee)**

Le classi non sono considerate omogenee. Per ogni dimensione, il docente descrive come si distribuisce la classe fra le caratteristiche osservate, e i segmenti di quella dimensione devono sempre sommare a 100%.

Termini usati nell'app:
- **Dimensione**: un ambito di osservazione, ad esempio Atteggiamento e motivazione, Collaborazione e relazioni, Metodo di studio, Autonomia, Partecipazione. Il docente può aggiungerne altre.
- **Caratteristica**: una descrizione generale della classe nella dimensione, scelta dal catalogo (tranquilla, vivace, motivata, poco motivata, collaborativa, poco collaborativa, problematica, oppure scritta a mano). Per il metodo di studio, le caratteristiche sono gli stati: acquisito, in consolidamento, in via di maturazione, non ancora avviato.
- **Quota**: la percentuale di alunni che presenta quella caratteristica, data dalla lunghezza del segmento corrispondente.
- **Nessuno**: un segmento speciale della riga, che rappresenta gli alunni per cui la dimensione non si applica o non è stata osservata. Non produce frase.

Interfaccia:
- Ogni dimensione è una sola riga orizzontale, divisa in segmenti colorati: uno per ogni caratteristica selezionata, più il segmento "nessuno" sempre presente come ultimo.
- I segmenti sono separati da leve trascinabili. Ogni segmento mostra il nome della caratteristica, la percentuale e il numero di alunni sul totale della composizione della classe, ad esempio "motivata 60% · 12 di 20".
- Il docente seleziona le caratteristiche che si applicano alla classe. Ogni caratteristica selezionata entra nella riga come nuovo segmento.
- Spostare una leva in avanti (verso destra) sottrae la differenza al segmento successivo e la somma al segmento precedente.
- Spostare una leva indietro (verso sinistra) sottrae la differenza al segmento precedente e la somma al segmento successivo.
- In entrambi i casi la somma della riga resta 100%. Se una leva arriva a un segmento già a 0%, il movimento prosegue sul segmento vicino nella stessa direzione, senza mai superare 100% in totale.
- Il pulsante "Aggiungi caratteristica" aggiunge una caratteristica alla dimensione. Il pulsante "Aggiungi dimensione" crea una nuova dimensione.
- Accanto a ogni dimensione compare la frase generata, ad esempio "La maggior parte della classe ha acquisito un metodo di studio autonomo; una parte è in via di maturazione."

Valori predefiniti:
- Quando una dimensione viene creata, il segmento "nessuno" occupa il 100%.
- Quando una caratteristica viene selezionata, entra con 0% e si porta al valore voluto spostando le leve. Le altre quote si adeguano.
- Per il metodo di studio, lo stato "in consolidamento" occupa il 100% e "nessuno" 0%.
- I valori predefiniti sono modificabili.

Frasi generate:
- La quota viene convertita in un'espressione verbale con soglie modificabili nelle impostazioni: 100% tutta la classe; da 85% quasi tutta la classe; da 51% la maggior parte; da 40% a 50% circa metà; da 10% a 39% una parte; da 1% a 9% pochi.
- Le caratteristiche con quota 0% e il segmento "nessuno" non producono frase.
- Se il docente ha indicato il numero esatto di alunni, la frase usa il numero invece dell'espressione verbale.
- Le frasi sono costruite con modelli testuali locali, senza AI. Il docente può modificarle: una frase modificata diventa testo manuale e non viene sovrascritta dai cambi successivi, salvo ripristino esplicito.

Documento:
- Nella sezione "Situazione della classe" del DOCX ogni dimensione compare come paragrafo discorsivo. Una dimensione con solo "nessuno" al 100% non compare.
- La tabella "Livelli di partenza rilevati" si compila dai conteggi per fascia dell'import del registro (sezione 5.6), non da questa sezione.

Privacy:
- Nessun nome o numero progressivo di alunno è associato a una caratteristica o a una quota.

Criteri di verifica:
- Nella riga di una dimensione la somma dei segmenti è sempre 100%, in ogni combinazione di spostamenti.
- Leva in avanti: la differenza va al segmento successivo. Leva indietro: va al segmento precedente.
- Una caratteristica può essere aggiunta o rimossa senza perdere le altre quote.
- Quota 0% o "nessuno" non produce frase, in nessun caso.
- Le frasi generate corrispondono alle soglie configurate, e con il numero esatto usano il numero.
- Nessun dato identificativo compare nella sezione o nel documento.

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
