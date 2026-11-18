import { Eye, EyeOff, Lock } from 'lucide-react';
import { useState, type ReactNode } from 'react';

export const PASSWORD_STORAGE_KEY = 'pianorama_access_unlocked_v1';

export function isValidAccessPassword(input: string): boolean {
  return input.trim().toLowerCase() === 'canepastore';
}

export function isAccessUnlocked(): boolean {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem(PASSWORD_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setAccessUnlocked(unlocked: boolean): void {
  try {
    if (typeof window === 'undefined') return;
    if (unlocked) {
      window.localStorage.setItem(PASSWORD_STORAGE_KEY, '1');
    } else {
      window.localStorage.removeItem(PASSWORD_STORAGE_KEY);
    }
  } catch {
    // ignore storage quota errors
  }
}

interface PasswordGateProps {
  unlocked: boolean;
  onUnlock: () => void;
  children: ReactNode;
}

export function PasswordGate({ unlocked, onUnlock, children }: PasswordGateProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (unlocked) {
    return <>{children}</>;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValidAccessPassword(password)) {
      setError(null);
      setAccessUnlocked(true);
      setPassword('');
      onUnlock();
    } else {
      setError('Password non corretta. Riprova.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-lg dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <img
            src="/icon.svg"
            alt=""
            className="h-10 w-10 rounded-xl"
            width={40}
            height={40}
          />
          <div>
            <h1 className="text-lg font-bold tracking-tight text-[#1F3864] dark:text-white">
              PIANORAMA
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Laboratorio personale piani di lavoro · Accesso protetto
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Lock className="h-3.5 w-3.5 text-[#1F3864] dark:text-blue-400" />
              Password di accesso
            </span>
            <div className="relative mt-1.5">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                autoFocus
                autoComplete="current-password"
                placeholder="Inserisci la password..."
                className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pr-10 pl-3.5 text-sm text-slate-900 focus:border-[#1F3864] focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-lg bg-[#1F3864] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#172b4d]"
          >
            Sblocca PIANORAMA
          </button>

          <p className="text-center text-[11px] text-slate-500 dark:text-slate-400">
            Elaborazione 100% locale e offline nel browser.
          </p>
        </form>
      </div>
    </div>
  );
}
