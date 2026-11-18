import { CheckCircle2, FileText, HardDrive, Lock, ShieldCheck } from 'lucide-react';

interface WelcomePrivacyModalProps {
  open: boolean;
  alreadyAcknowledged: boolean;
  onAcknowledge: () => void;
}

export function WelcomePrivacyModal({
  open,
  alreadyAcknowledged,
  onAcknowledge,
}: WelcomePrivacyModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-privacy-title"
    >
      <div className="my-8 w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1F3864] text-white">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2
              id="welcome-privacy-title"
              className="text-lg font-bold text-slate-900 sm:text-xl dark:text-slate-100"
            >
              Benvenuti in PIANORAMA — Il laboratorio dei piani di lavoro
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Scuola Secondaria di Primo Grado · Funzionamento 100% locale e offline
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <p>
            PIANORAMA consente di redigere, riutilizzare ed esportare in <strong>DOCX</strong> e{' '}
            <strong>PDF</strong> le programmazioni disciplinari secondo il modello ufficiale della scuola secondaria di primo grado, lavorando esclusivamente in locale senza server esterni o servizi di intelligenza artificiale.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/50">
              <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                <HardDrive className="h-4 w-4 text-[#1F3864] dark:text-blue-400" />
                <span>Archiviazione solo locale</span>
              </div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Tutti i piani, gli elenchi della classe, le note riservate, la libreria e le regole restano salvati nel database locale IndexedDB di questo dispositivo. Nessun dato esce mai in rete.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/50">
              <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                <Lock className="h-4 w-4 text-[#1F3864] dark:text-blue-400" />
                <span>Backup cifrati .pianorama</span>
              </div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Puoi esportare copie di sicurezza protette da password con cifratura locale Web Crypto (AES-GCM 256-bit) da conservare su chiavetta o archivio personale.
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
            <p className="font-semibold">
              Gestione dei dati degli alunni tra lavoro offline ed esportazione ufficiale (GDPR)
            </p>
            <ul className="mt-1.5 list-disc space-y-1 pl-4">
              <li>
                <strong>Nel workspace locale offline:</strong> puoi lavorare liberamente con gli elenchi nominativi degli alunni (importati da registro <code>.xlsx</code> o inseriti a mano), assegnare le fasce di livello e registrare annotazioni sensibili riservate (BES, DSA, PDP/PEI).
              </li>
              <li>
                <strong>Mascheramento rapido a schermo:</strong> nella scheda fasce puoi attivare in qualsiasi momento la vista anonima (<em>Alunno 1, Alunno 2...</em>).
              </li>
              <li>
                <strong>Nei documenti ufficiali DOCX e PDF:</strong> l’esportazione per la scuola include esclusivamente conteggi numerici aggregati (<em>Composizione della classe</em> e <em>Livelli di partenza</em>) e misure didattiche generali, senza mai esporre nominativi né note sensibili individuali.
              </li>
            </ul>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <FileText className="h-4 w-4 shrink-0" />
            <span>
              Generazione DOCX e PDF eseguita interamente nel browser senza connessione.
            </span>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
          <button
            type="button"
            onClick={onAcknowledge}
            className="inline-flex items-center gap-2 whitespace-nowrap shrink-0 rounded-lg bg-[#1F3864] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#172b4d]"
          >
            <CheckCircle2 className="h-4 w-4" />
            {alreadyAcknowledged ? 'Chiudi informativa' : 'Ho compreso, inizia a lavorare'}
          </button>
        </div>
      </div>
    </div>
  );
}
