import {
  WEEKDAY_LABELS,
  buildMonthCells,
  isDateInRange,
  monthLabel,
  shiftViewMonth,
} from './dateCalendar';

export function MonthCalendar({
  viewMonth,
  onViewMonthChange,
  selected,
  onToggle,
  highlightDays,
  markedDays,
  enabledDays,
  variant = 'work',
  min,
  max,
}: {
  viewMonth: string;
  onViewMonthChange: (monthStartISO: string) => void;
  selected: Set<string>;
  onToggle: (iso: string) => void;
  /** Бледный слой: выбранный период расчёта. */
  highlightDays?: Set<string>;
  /** Второй слой: рабочие дни (на календаре заправок). */
  markedDays?: Set<string>;
  /** Если задан — кликабельны только эти даты (внутри min/max). */
  enabledDays?: Set<string>;
  variant?: 'work' | 'refuel';
  min?: string;
  max?: string;
}) {
  const cells = buildMonthCells(viewMonth);
  const label = monthLabel(viewMonth);

  return (
    <div className={`mini-calendar${variant === 'refuel' ? ' mini-calendar--refuel' : ''}`}>
      <div className="mini-calendar__head">
        <button type="button" className="icon-btn mini-calendar__nav" onClick={() => onViewMonthChange(shiftViewMonth(viewMonth, -1))} aria-label="Предыдущий месяц">
          <span className="mini-calendar__chevron mini-calendar__chevron--prev" aria-hidden="true" />
        </button>
        <span className="mini-calendar__label">{label}</span>
        <button type="button" className="icon-btn mini-calendar__nav" onClick={() => onViewMonthChange(shiftViewMonth(viewMonth, 1))} aria-label="Следующий месяц">
          <span className="mini-calendar__chevron mini-calendar__chevron--next" aria-hidden="true" />
        </button>
      </div>
      <div className="mini-calendar__weekdays">
        {WEEKDAY_LABELS.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
      <div className="mini-calendar__grid">
        {cells.map((iso, i) => {
          if (!iso) {
            return <span key={`empty-${i}`} className="mini-calendar__cell mini-calendar__cell--empty" />;
          }
          const inRange = isDateInRange(iso, min, max);
          const allowed = inRange && (!enabledDays || enabledDays.has(iso));
          const classes = [
            'mini-calendar__cell',
            selected.has(iso) ? 'active' : '',
            markedDays?.has(iso) ? 'working' : '',
            highlightDays?.has(iso) ? 'in-period' : '',
            !allowed ? 'mini-calendar__cell--disabled' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <button
              type="button"
              key={iso}
              className={classes}
              disabled={!allowed}
              onClick={() => allowed && onToggle(iso)}
            >
              {Number(iso.slice(8, 10))}
            </button>
          );
        })}
      </div>
    </div>
  );
}
