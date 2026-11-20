import { Lock } from 'lucide-react';

interface PrivacyNoticeBannerProps {
  compact?: boolean;
}

export function PrivacyNoticeBanner({ compact = false }: PrivacyNoticeBannerProps) {
  if (compact) {
    return (
      <div
        role="note"
        className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50/80 px-3.5 py-2.5 text-xs text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100"
      >
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
        <p className="leading-relaxed">
          <strong>Archivio 100% offline protetto:</strong> medie voti, categorie BES/DSA/PEI e note riservate restano solo sul dispositivo e non vengono mai esportate. Lavorando offline, i soli nominativi degli alunni possono comparire nella tabella <em>Livelli di partenza</em> (oppure soli conteggi aggregati scegliendo la modalità anonima).
        </p>
      </div>
    );
  }

  return (
    <div
      role="note"
      className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100"
    >
      <div className="flex items-start gap-3">
        <Lock className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" />
        <div className="space-y-1">
          <p className="font-semibold">
            Spazio di lavoro 100% offline per elenchi alunni e dati sensibili
          </p>
          <p className="text-xs leading-relaxed text-amber-900/90 dark:text-amber-100/90">
            PIANORAMA elabora tutto localmente sul tuo dispositivo senza trasmettere nulla online: nel registro offline puoi gestire voti, fasce di livello e annotazioni BES/DSA/PDP/PEI. Nei documenti DOCX e PDF esportati, medie dei voti, categorie BES/DSA/PEI e note sensibili non vengono mai esposte; se scegli di mantenere i nominativi, questi compaiono esclusivamente nelle colonne delle fasce di livello (altrimenti vengono esportati solo conteggi numerici aggregati).
          </p>
        </div>
      </div>
    </div>
  );
}
