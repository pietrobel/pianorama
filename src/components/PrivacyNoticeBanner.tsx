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
          <strong>Archivio offline protetto:</strong> puoi lavorare localmente con elenchi alunni, fasce di livello e note BES/DSA/PEI nella scheda <em>Registro / Fasce</em>. I documenti DOCX/PDF ufficiali esportano solo conteggi aggregati.
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
            Proprio perché PIANORAMA lavora interamente offline sul tuo dispositivo senza trasmettere nulla online, puoi gestire elenchi nominativi, fasce di livello e annotazioni BES/DSA/PDP/PEI nello spazio riservato del registro. Nell’esportazione ufficiale DOCX e PDF della programmazione vengono inclusi invece esclusivamente conteggi numerici aggregati e strategie inclusive generali.
          </p>
        </div>
      </div>
    </div>
  );
}
