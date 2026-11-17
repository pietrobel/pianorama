import { useState } from 'react';
import { PLESSI_ISTITUTO } from '../domain/defaults';

interface PlessoSelectProps {
  label: string;
  value: string;
  onChange: (next: string) => void;
  labelClassName?: string;
  className?: string;
}

export function PlessoSelect({
  label,
  value,
  onChange,
  labelClassName = 'text-sm font-medium text-slate-800 dark:text-slate-200',
  className = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100',
}: PlessoSelectProps) {
  const isPreset = PLESSI_ISTITUTO.includes(value);
  const [customMode, setCustomMode] = useState<boolean>(() => !isPreset && value.trim().length > 0);

  const selectValue = customMode || (!isPreset && value.trim().length > 0) ? '__altro__' : value || PLESSI_ISTITUTO[0];

  return (
    <div className="block">
      <label className="block">
        <span className={labelClassName}>{label}</span>
        <select
          value={selectValue}
          onChange={(e) => {
            const v = e.target.value;
            if (v === '__altro__') {
              setCustomMode(true);
              if (PLESSI_ISTITUTO.includes(value)) {
                onChange('');
              }
            } else {
              setCustomMode(false);
              onChange(v);
            }
          }}
          className={className}
        >
          {PLESSI_ISTITUTO.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
          <option value="__altro__">Altro plesso...</option>
        </select>
      </label>

      {(customMode || (!isPreset && value.trim().length > 0)) && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Inserisci il nome del plesso..."
          className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />
      )}
    </div>
  );
}
