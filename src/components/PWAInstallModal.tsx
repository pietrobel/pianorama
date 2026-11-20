import { Download, ExternalLink, Smartphone, X } from 'lucide-react';

interface PWAInstallModalProps {
  open: boolean;
  isIOS: boolean;
  isInIframe: boolean;
  canInstall: boolean;
  onTriggerInstall: () => Promise<boolean>;
  onClose: () => void;
}

export function PWAInstallModal({
  open,
  isIOS,
  isInIframe,
  canInstall,
  onTriggerInstall,
  onClose,
}: PWAInstallModalProps) {
  if (!open) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const currentHost =
    typeof window !== 'undefined' ? window.location.host : 'pianorama.vercel.app';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-install-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Smartphone className="h-5 w-5 shrink-0 text-[#1F3864] dark:text-blue-400" />
            <h3
              id="pwa-install-modal-title"
              className="text-base font-bold text-slate-900 dark:text-slate-100"
            >
              {isIOS
                ? 'Installa PIANORAMA su iPhone / iPad'
                : 'Installa PIANORAMA sul dispositivo'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi finestra installazione"
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          {canInstall ? (
            <div className="space-y-3">
              <p>
                Il browser è pronto per installare <strong>PIANORAMA</strong> come app autonoma
                sul tuo computer o tablet, utilizzabile anche senza connessione Internet.
              </p>
              <button
                type="button"
                onClick={async () => {
                  const ok = await onTriggerInstall();
                  if (ok) onClose();
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#1F3864] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#172b4d]"
              >
                <Download className="h-4 w-4" />
                Avvia installazione adesso
              </button>
            </div>
          ) : isInIframe ? (
            <div className="space-y-3">
              <p>
                L’app è aperta dentro un riquadro di anteprima incorporato: per sicurezza i browser
                consentono il download/installazione come app solo quando la pagina è aperta in una
                scheda autonoma.
              </p>
              <a
                href={currentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#1F3864] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#172b4d]"
              >
                <ExternalLink className="h-4 w-4" />
                Apri in nuova scheda per installare
              </a>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Una volta aperta nella nuova scheda, clicca su <strong>Installa</strong> nella
                barra in alto (o sull’icona di installazione nella barra indirizzi del browser).
              </p>
            </div>
          ) : isIOS ? (
            <div className="space-y-2">
              <p>
                1. Assicurati di avere aperto <strong>{currentHost}</strong> in{' '}
                <strong>Safari</strong>.
              </p>
              <p>
                2. Tocca l’icona <strong>Condividi</strong> nella barra di Safari.
              </p>
              <p>
                3. Scorri e seleziona <strong>Aggiungi alla schermata Home</strong>.
              </p>
              <p className="pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Tutti i curricoli, i piani e gli alunni salvati restano al sicuro in locale sul
                dispositivo.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p>
                Puoi installare <strong>PIANORAMA</strong> come app desktop o mobile funzionante
                anche offline:
              </p>
              <ul className="list-disc space-y-1 pl-4">
                <li>
                  <strong>Chrome / Edge (PC o Android):</strong> clicca sull’icona{' '}
                  <em>Installa app</em> nella barra degli indirizzi (in alto a destra) oppure apri
                  il menu del browser (⋮) e seleziona <strong>Installa PIANORAMA</strong> /{' '}
                  <strong>Aggiungi a schermata Home</strong>.
                </li>
                <li>
                  <strong>Safari (Mac):</strong> menu <em>File → Aggiungi al Dock…</em>
                </li>
              </ul>
              <p className="pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Il Service Worker memorizza automaticamente i file dell’app in locale dopo il primo
                caricamento per l’utilizzo senza rete.
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}
