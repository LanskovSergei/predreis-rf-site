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
  min,
  max,
}: {
  viewMonth: string;
  onViewMonthChange: (monthStartISO: string) => void;
  selected: Set<string>;
  onToggle: (iso: string) => void;
  highlightDays?: Set<string>;
  min?: string;
  max?: string;
}) {
  const cells = buildMonthCells(viewMonth);
  const label = monthLabel(viewMonth);

  return (
    <div className="mini-calendar">
      <div className="mini-calendar__head">
        <button type="button" className="icon-btn" onClick={() => onViewMonthChange(shiftViewMonth(viewMonth, -1))} aria-label="Предыдущий месяц">
          ‹
        </button>
        <span className="mini-calendar__label">{label}</span>
        <button type="button" className="icon-btn" onClick={() => onViewMonthChange(shiftViewMonth(viewMonth, 1))} aria-label="Следующий месяц">
          ›
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
          const classes = [
            'mini-calendar__cell',
            selected.has(iso) ? 'active' : '',
            highlightDays?.has(iso) ? 'in-period' : '',
            !inRange ? 'mini-calendar__cell--disabled' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <button
              type="button"
              key={iso}
              className={classes}
              disabled={!inRange}
              onClick={() => inRange && onToggle(iso)}
            >
              {Number(iso.slice(8, 10))}
            </button>
          );
        })}
      </div>
    </div>
  );
}
