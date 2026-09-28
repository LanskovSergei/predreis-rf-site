import { useEffect, useId, useRef, useState } from 'react';
import { toISODate } from './calc';
import { MonthCalendar } from './MonthCalendar';
import { firstOfMonthISO, formatRuDate } from './dateCalendar';

function todayISO(): string {
  return toISODate(new Date());
}

export function DatePickerField({
  value,
  onChange,
  min,
  max,
  readOnly = false,
  compact = false,
  placeholder = 'дд.мм.гггг',
  'aria-label': ariaLabel,
}: {
  value: string;
  onChange?: (iso: string) => void;
  min?: string;
  max?: string;
  readOnly?: boolean;
  compact?: boolean;
  placeholder?: string;
  'aria-label'?: string;
}) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => firstOfMonthISO(value || todayISO()));

  useEffect(() => {
    if (value) setViewMonth(firstOfMonthISO(value));
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const display = value ? formatRuDate(value) : '';

  if (readOnly) {
    return (
      <input
        type="text"
        readOnly
        className="input-readonly"
        value={display}
        aria-label={ariaLabel}
      />
    );
  }

  const selected = new Set(value ? [value] : []);

  return (
    <div className={`date-picker${compact ? ' date-picker--compact' : ''}${open ? ' date-picker--open' : ''}`} ref={rootRef}>
      <button
        type="button"
        id={id}
        className="date-picker__trigger"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
      >
        {display || <span className="date-picker__placeholder">{placeholder}</span>}
      </button>
      {open && onChange && (
        <div className="date-picker__popover" role="dialog" aria-labelledby={id}>
          <MonthCalendar
            viewMonth={viewMonth}
            onViewMonthChange={setViewMonth}
            selected={selected}
            min={min}
            max={max}
            onToggle={(iso) => {
              onChange(iso);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
