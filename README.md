# PIANORAMA — Il laboratorio dei piani di lavoro

Applicazione web **100% offline-first** destinata ai docenti della scuola secondaria di primo grado italiana (preconfigurata per l’Istituto Comprensivo *"Beato Don Pino Puglisi"* di Villafrati-Mezzojuso) per creare, compilare, archiviare, riutilizzare ed esportare in **DOCX** e **PDF** le programmazioni didattiche disciplinari.

---

## 1. Garanzie di privacy, sicurezza e funzionamento offline

- **Zero AI e Zero Cloud**: nessuna chiamata a modelli linguistici esterni o API remote, nessun account obbligatorio, nessuna telemetria.
- **Nessuna risorsa da CDN**: font (`EB Garamond`, `Plus Jakarta Sans`, `JetBrains Mono`), icone e librerie di generazione documenti sono inclusi interamente nel bundle locale.
- **Protezione dati degli alunni (GDPR) e lavoro offline**:
  - proprio perché PIANORAMA lavora al **100% offline sul dispositivo** senza trasmettere nulla online, nella scheda *Registro* e nella *Sezione 3* dell’editor è possibile lavorare localmente con elenchi nominativi degli alunni, fasce di livello, categorie BES/DSA/PEI/PDP e annotazioni didattiche riservate (con pulsante di mascheramento rapido dei nomi a schermo);
  - nei documenti **DOCX e PDF ufficiali** esportati per la scuola (`sanitizePlanForOfficialExport`), vengono invece riportati esclusivamente conteggi numerici aggregati (*Composizione della classe*, *Livelli di partenza*) e misure didattiche generali, escludendo nominativi e note individuali;
  - esportazione di backup `.pianorama` cifrabili con password personale tramite **Web Crypto API** (`PBKDF2` SHA-256 + `AES-GCM` 256-bit).

---

## 2. Installazione e utilizzo offline

### Avvio in sviluppo o build locale
```bash
npm install
npm run test
npm run build
npm run preview
```

### Installazione come PWA offline
1. Aprire l’applicazione in Chrome, Edge o Safari su desktop/tablet almeno una volta con connessione attiva.
2. Il Service Worker (`vite-plugin-pwa` / Workbox) memorizza automaticamente nel dispositivo tutti gli asset statici, i fogli di stile e i font locali.
3. Usare il pulsante **Installa** nell’intestazione (o in *Impostazioni*) per installare PIANORAMA come app autonoma. Dopo il primo caricamento funziona integralmente anche in assenza totale di rete.

---

## 3. Architettura modulare e separazione dei livelli

La logica di dominio è completamente disaccoppiata dall’interfaccia React, così da poter riutilizzare il motore su piattaforme future (Windows desktop, macOS, Linux, iPadOS, Android):

- `src/domain/`: tipi, opzioni ufficiali del modello scolastico, factory vuote e controllo anti-PII.
- `src/storage/`: interfaccia astratta `PianoramaRepository` e implementazione `DexiePianoramaRepository` (IndexedDB con gestione `QuotaExceededError`).
- `src/engine/`:
  - `suggestionEngine.ts`: motore deterministico basato su regole JSON locali modificabili.
  - `questionnaireEngine.ts`: questionario avanzato a **21 indicatori** (con *Comprensione*, *Memorizzazione* e *Capacità di apprendimento* come indicatori distinti, supporto alle situazioni eterogenee ed esclusione rigorosa delle risposte non compilate).
  - `gradebookImporter.ts`: import locale di registri voti `.xlsx` (SheetJS), gestione celle unite, calcolo automatico media aritmetica, confronto senza arrotondamento con soglie configurabili (`Impostazioni`), anonimizzazione immediata (*Alunno 1, Alunno 2...*) e spostamento manuale tra fasce.
  - `curricoloCatalogEngine.ts`: catalogo locale del Curricolo Verticale Secondaria di I grado (Prima dal *Curricolo verticale nuovo*, Seconda e Terza dal *Curricolo verticale vecchio A.S. 2025/2026*), selezione per classe/disciplina con pre-selezione completa, importazione in copia autonoma con etichetta della classe di provenienza, ripristino formulazione originale e aggiornamento JSON con riepilogo diff.
  - `classCharacteristicsEngine.ts`: modello eterogeneo a barra orizzontale unica al 100% per ciascuna dimensione nella sezione *Situazione della classe* (segmenti colorati + «nessuno» finale sempre presente, leve trascinabili con somma sempre pari a 100%, *Metodo di studio* predefinito con «in consolidamento» al 100%, soglie verbali configurabili in *Impostazioni*, numero esatto di alunni e modifica manuale protetta).
  - `planCloning.ts`: duplicazione indipendente, creazione per classi parallele, riutilizzo da anni precedenti, copia selettiva per sezioni e cronologia delle modifiche.
- `src/crypto/`: cifratura/decifratura locale dei backup `.pianorama`.
- `src/export/`: generatori `docxGenerator.ts` (Garamond, accento `#1F3864`, caselle `☒`/`☐`) e `pdfGenerator.ts` (formato A4 con caselle vettoriali).

---

## 4. Schema di mappatura DOCX e aggiornamento al modello definitivo

Lo schema di collegamento tra i campi dell’applicazione e le sezioni del documento `Modello_programmazione_scuola_SECONDARIA_DI_I_GRADO.docx` risiede in `src/data/defaultDocxMapping.json` ed è modificabile anche direttamente in-app nella sezione **Impostazioni → Schema di mappatura modello DOCX**.

Per aggiornare lo schema quando sarà disponibile una nuova versione del modello DOCX della scuola:
1. Aprire **Impostazioni** e individuare il riquadro *Schema di mappatura modello DOCX*.
2. Aggiornare `institutionHeader`, `typography` (`fontFamily: "Garamond"`, `headingColorHex: "1F3864"`, `checkedGlyph: "☒"`, `uncheckedGlyph: "☐"`) oppure le voci in `sections` (`sectionTitle`, `appPath`, `options`).
3. Premere **Salva schema DOCX**: l’anteprima A4, il generatore `.docx` e il generatore `.pdf` utilizzeranno subito la mappatura aggiornata.

---

## 5. Elenco dipendenze, versioni e licenze

| Pacchetto | Versione (`package.json`) | Licenza | Ruolo |
| :--- | :--- | :--- | :--- |
| `react` / `react-dom` | `^19.0.1` | MIT | Interfaccia utente |
| `dexie` | `^4.4.7` | Apache-2.0 | Persistenza locale IndexedDB |
| `docx` | `^9.15.4` | MIT | Generazione file `.docx` nel browser |
| `jspdf` | `^4.2.1` | MIT | Generazione file `.pdf` A4 offline |
| `xlsx` | `^0.18.5` | Apache-2.0 | Importazione locale registri voti `.xlsx` |
| `lucide-react` | `^0.546.0` | ISC | Icone SVG incluse nel bundle |
| `vite-plugin-pwa` | `^2.0.0` | MIT | Service Worker e Web App Manifest offline |
| `@fontsource/eb-garamond` | `^5.3.0` | OFL-1.1 | Carattere Garamond locale |
| `@fontsource/plus-jakarta-sans` | `^5.3.0` | OFL-1.1 | Carattere interfaccia locale |
| `@fontsource/jetbrains-mono` | `^5.3.0` | OFL-1.1 | Carattere tabellare numerico locale |
| `tailwindcss` / `@tailwindcss/vite` | `^4.3.3` | MIT | Stili responsivi e temi chiaro/scuro |
| `vitest` | `^5.1.0` | MIT | Test automatici di unità |

*(Nota: la dipendenza `@google/genai` presente nel template di ambiente non è importata né utilizzata in nessun file di PIANORAMA.)*

---

## 6. Come trasformare PIANORAMA in un file scaricabile o eseguibile

Esistono tre modalità pratiche per distribuire e usare PIANORAMA come programma locale:

### Opzione A — App installabile subito senza strumenti di sviluppo (PWA)
1. Aprire l’app in **Google Chrome** o **Microsoft Edge**.
2. Cliccare sul pulsante **Installa** nell’intestazione di PIANORAMA (oppure sull’icona *Installa app* nella barra degli indirizzi del browser).
3. L’app viene aggiunta al menu Start / Desktop come finestra autonoma e funziona offline tramite Service Worker.

### Opzione B — Eseguibile autonomo Windows `.exe` / `.msi` con Tauri (consigliato)
Su Windows, una PWA da sola resta legata alla cache del browser (una pulizia della cronologia può svuotare IndexedDB, le reti scolastiche possono limitare i Service Worker e il salvataggio diretto su cartelle di sistema è limitato). Per un vero programma installabile `.exe` / `.msi` si raccomanda **Tauri** rispetto a Electron (5–10 MB contro 120+ MB, sicurezza basata su WebView2 nativo di Windows 10/11 e possibilità di collegare SQLite locale tramite `PianoramaRepository`):

1. Scaricare il codice sorgente del progetto sul proprio PC Windows (con Node.js ≥ 20 e Rust/Cargo + Visual Studio C++ Build Tools installati).
2. Compilare il bundle statico:
   ```bash
   npm install
   npm run build
   ```
3. Inizializzare Tauri puntando alla cartella `dist`:
   ```bash
   npm install -D @tauri-apps/cli
   npx tauri init
   ```
   *(Alla richiesta della cartella web distribuita indicare `../dist`, URL dev `http://localhost:3000`, comando dev `npm run dev`, comando build `npm run build`.)*
4. Generare l’eseguibile e il pacchetto d’installazione Windows:
   ```bash
   npx tauri build
   ```
   Al termine si ottengono i file pronti in `src-tauri/target/release/bundle/msi/*.msi` e `src-tauri/target/release/bundle/nsis/*-setup.exe`, oltre all’eseguibile `src-tauri/target/release/pianorama.exe`.

### Opzione C — Pacchetto web portatile (`dist/`)
1. Eseguire `npm run build` per produrre la cartella autonoma `dist/` (con tutti i font, icone, script e Service Worker già inclusi).
2. Comprimere `dist/` in un file `.zip` scaricabile. Su qualsiasi computer con Node.js (o qualsiasi micro-server locale statico) si può avviare in locale con `npx vite preview --port 3000` o `npx serve dist`.

---

## 7. Checklist di verifica offline e conformità

- [x] Nessuna richiesta di rete verso CDN, font esterni o API AI durante l’uso (verificabile nella scheda *Network* degli strumenti sviluppatore impostando modalità *Offline*).
- [x] Gestione locale offline di elenchi nominativi alunni, fasce di livello e note BES/DSA/PEI con sanitizzazione automatica prima dell’esportazione ufficiale DOCX/PDF (solo conteggi aggregati).
- [x] Salvataggio automatico su IndexedDB e indicatore orario visibile nell’editor.
- [x] Esportazione e ripristino `.pianorama` con cifratura AES-GCM verificata da test.
- [x] Catalogo locale Curricolo Verticale (1ª, 2ª, 3ª × 15 discipline) con pre-selezione completa, importazione autonoma cross-classe, ripristino formulazione originale e aggiornamento JSON con conferma diff.
- [x] Caratteristiche eterogenee della classe (5.8) a barra segmentata 100% con leve trascinabili, segmento «nessuno» escluso dal documento, soglie verbali configurabili, strategie pre-selezionate e metodi/strumenti predefiniti per disciplina.
- [x] Generazione locale di file `.docx` (Garamond, `#1F3864`, `☒`/`☐`) e `.pdf` A4 funzionanti senza connessione.
