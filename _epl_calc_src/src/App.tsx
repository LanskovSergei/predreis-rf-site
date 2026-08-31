import { useMemo, useRef, useState } from 'react';
import type { ВидСообщения, ВидТоплива, ВходныеДанные, Водитель, Заправка, РезультатРасчёта, ТипТС } from './types';
import { parseISODate, toISODate } from './calc';
import { calculateSmart } from './api';
import { downloadSheetsPdf } from './pdfExport';

const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const jsDayToMonFirst = (jsDay: number) => (jsDay === 0 ? 6 : jsDay - 1);

const МАРКИ_ПОДСКАЗКИ = [
  'ГАЗ', 'КамАЗ', 'УАЗ', 'ВАЗ (Lada)', 'Урал', 'МАЗ', 'ЗИЛ', 'ПАЗ', 'ЛиАЗ',
  'Volvo', 'Scania', 'MAN', 'DAF', 'Mercedes-Benz', 'Iveco', 'Renault',
  'Hyundai', 'Isuzu', 'Ford', 'ГАЗель NEXT',
];

function todayISO(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return toISODate(d);
}

function emptyRefuel(): Заправка {
  return { дата: todayISO(), время: '08:00', объём: '' };
}

interface ДемоВодитель {
  фио: string;
  дни: Set<string>;
  viewMonth: string; // YYYY-MM — какой месяц открыт в календаре этого водителя
}

function firstOfMonthISO(iso: string): string {
  return iso.slice(0, 7) + '-01';
}

function emptyDriver(периодС: string): ДемоВодитель {
  return { фио: '', дни: new Set<string>(), viewMonth: firstOfMonthISO(периодС || todayISO()) };
}

interface DemoState {
  марка: string;
  модель: string;
  типТС: ТипТС;
  видТоплива: ВидТоплива;
  объёмБака: number | '';
  периодС: string;
  периодПо: string;
  водители: ДемоВодитель[];
  одометрНаНачало: number | '';
  одометрНаКонец: number | '';
  остатокНаНачало: number | '';
  остатокНаКонец: number | '';
  заправки: Заправка[];
  старше10лет: boolean;
  прицепГруз: boolean;
  спецтехника: boolean;
  среднийРасход: number | '';
  видСообщения: ВидСообщения;
  срокРейсаДней: number | '';
}

function initialState(): DemoState {
  const периодС = todayISO(-13);
  const периодПо = todayISO();
  return {
    марка: 'ГАЗ',
    модель: '3302',
    типТС: 'грузовой',
    видТоплива: 'Аи-92',
    объёмБака: 70,
    периодС,
    периодПо,
    водители: [emptyDriver(периодС)],
    одометрНаНачало: '',
    одометрНаКонец: '',
    остатокНаНачало: 15,
    остатокНаКонец: '',
    заправки: [
      { дата: todayISO(-12), время: '08:15', объём: 35 },
      { дата: todayISO(-7), время: '07:50', объём: 30 },
      { дата: todayISO(-2), время: '08:05', объём: 32 },
    ],
    старше10лет: false,
    прицепГруз: false,
    спецтехника: false,
    среднийРасход: '',
    видСообщения: 'городское',
    срокРейсаДней: '',
  };
}

function numField(value: string): number | '' {
  return value === '' ? '' : Number(value);
}

/** Все даты периода [с; по], которые приходятся на будние дни (Пн–Пт). */
function weekdaysInPeriod(периодС: string, периодПо: string): Set<string> {
  const дни = new Set<string>();
  if (!периодС || !периодПо) return дни;
  const from = parseISODate(периодС);
  const to = parseISODate(периодПо);
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    if (jsDayToMonFirst(d.getDay()) < 5) дни.add(toISODate(d));
  }
  return дни;
}

function buildInput(state: DemoState): ВходныеДанные {
  const водители: Водитель[] = state.водители.map((v, i) => ({
    фио: v.фио.trim() || `Водитель ${i + 1}`,
    дни: v.дни,
  }));

  return {
    марка: state.марка,
    модель: state.модель,
    типТС: state.типТС,
    видТоплива: state.видТоплива,
    объёмБака: state.объёмБака,
    среднийРасход: state.среднийРасход,
    старше10лет: state.старше10лет,
    прицепГруз: state.прицепГруз,
    спецтехника: state.спецтехника,
    периодС: state.периодС,
    периодПо: state.периодПо,
    видСообщения: state.видСообщения,
    срокРейсаДней: state.срокРейсаДней,
    одометрНаНачало: state.одометрНаНачало,
    одометрНаКонец: state.одометрНаКонец,
    остатокНаНачало: state.остатокНаНачало,
    остатокНаКонец: state.остатокНаКонец,
    водители,
    заправки: state.заправки,
  };
}

/** Список полей по каждому из 6 шагов — для валидации и подписи ошибок. */
const STEP_TITLES = ['Авто', 'Водители', 'Топливо', 'Заправки', 'Расход', 'Остатки'];

function validateStep(state: DemoState, step: number): string[] {
  const errs: string[] = [];
  if (step === 1) {
    if (!state.марка.trim()) errs.push('Укажите марку ТС.');
    if (!state.модель.trim()) errs.push('Укажите модель ТС.');
  }
  if (step === 2) {
    if (!state.периодС || !state.периодПо) errs.push('Укажите период для расчёта.');
    if (state.периодС && state.периодПо && parseISODate(state.периодПо) < parseISODate(state.периодС)) {
      errs.push('Дата «по» не может быть раньше даты «с».');
    }
    if (state.водители.length === 0) errs.push('Добавьте хотя бы одного водителя.');
    state.водители.forEach((v, i) => {
      if (!v.фио.trim()) errs.push(`Укажите ФИО водителя №${i + 1}.`);
      if (v.дни.size === 0) errs.push(`Отметьте в календаре хотя бы один рабочий день водителя №${i + 1}.`);
    });
  }
  if (step === 3) {
    if (!(Number(state.объёмБака) > 0)) errs.push('Укажите объём бака ТС.');
  }
  if (step === 4) {
    if (state.заправки.filter((r) => r.дата && r.объём !== '').length === 0) {
      errs.push('Добавьте хотя бы одну заправку с чека.');
    }
  }
  if (step === 5) {
    if (state.спецтехника && !(Number(state.среднийРасход) > 0)) {
      errs.push('Для спецтехники коэффициенты не применяются — укажите средний расход вручную.');
    }
  }
  if (step === 6) {
    if (state.остатокНаНачало === '' || Number(state.остатокНаНачало) < 0) {
      errs.push('Укажите остаток топлива в баке на начало периода.');
    }
  }
  return errs;
}

function validateAll(state: DemoState): string[] {
  const errs: string[] = [];
  for (let s = 1; s <= 6; s++) errs.push(...validateStep(state, s));
  return errs;
}

function formatFuel(value: ВидТоплива): string {
  return value;
}

function formatVehicleType(value: ТипТС): string {
  return value === 'легковой' ? 'Легковой' : 'Грузовой';
}

/** Небольшой календарь на месяц с множественным выбором дат. */
function MiniCalendar({
  viewMonth,
  selected,
  onToggle,
  onViewMonthChange,
}: {
  viewMonth: string; // YYYY-MM-01
  selected: Set<string>;
  onToggle: (iso: string) => void;
  onViewMonthChange: (iso: string) => void;
}) {
  const base = parseISODate(viewMonth);
  const year = base.getFullYear();
  const month = base.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = jsDayToMonFirst(firstDay.getDay());
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(toISODate(new Date(year, month, d)));

  const monthLabel = base.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

  const shiftMonth = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    onViewMonthChange(toISODate(d));
  };

  return (
    <div className="mini-calendar">
      <div className="mini-calendar__head">
        <button type="button" className="icon-btn" onClick={() => shiftMonth(-1)} aria-label="Предыдущий месяц">
          ‹
        </button>
        <span className="mini-calendar__label">{monthLabel}</span>
        <button type="button" className="icon-btn" onClick={() => shiftMonth(1)} aria-label="Следующий месяц">
          ›
        </button>
      </div>
      <div className="mini-calendar__weekdays">
        {WEEKDAY_LABELS.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
      <div className="mini-calendar__grid">
        {cells.map((iso, i) =>
          iso ? (
            <button
              type="button"
              key={iso}
              className={`mini-calendar__cell${selected.has(iso) ? ' active' : ''}`}
              onClick={() => onToggle(iso)}
            >
              {Number(iso.slice(8, 10))}
            </button>
          ) : (
            <span key={`empty-${i}`} className="mini-calendar__cell mini-calendar__cell--empty" />
          ),
        )}
      </div>
    </div>
  );
}

export function DemoApp() {
  const [state, setState] = useState<DemoState>(initialState);
  const [step, setStep] = useState(1);
  const [result, setResult] = useState<РезультатРасчёта | null>(null);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const pdfHostRef = useRef<HTMLDivElement>(null);

  const upd = <K extends keyof DemoState>(key: K, value: DemoState[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  const updDriverName = (driverIdx: number, фио: string) =>
    setState((s) => ({
      ...s,
      водители: s.водители.map((v, i) => (i === driverIdx ? { ...v, фио } : v)),
    }));

  const toggleDriverDay = (driverIdx: number, iso: string) =>
    setState((s) => ({
      ...s,
      водители: s.водители.map((v, i) => {
        if (i !== driverIdx) return v;
        const next = new Set(v.дни);
        if (next.has(iso)) next.delete(iso);
        else next.add(iso);
        return { ...v, дни: next };
      }),
    }));

  const setDriverViewMonth = (driverIdx: number, iso: string) =>
    setState((s) => ({
      ...s,
      водители: s.водители.map((v, i) => (i === driverIdx ? { ...v, viewMonth: iso } : v)),
    }));

  const selectAllWorkingDays = (driverIdx: number) =>
    setState((s) => ({
      ...s,
      водители: s.водители.map((v, i) =>
        i === driverIdx ? { ...v, дни: weekdaysInPeriod(s.периодС, s.периодПо) } : v,
      ),
    }));

  const setDriverCount = (count: number) =>
    setState((s) => {
      const next = [...s.водители];
      while (next.length < count) next.push(emptyDriver(s.периодС));
      while (next.length > count) next.pop();
      return { ...s, водители: next };
    });

  const addDriver = () =>
    setState((s) => (s.водители.length >= 4 ? s : { ...s, водители: [...s.водители, emptyDriver(s.периодС)] }));

  const removeDriver = (driverIdx: number) =>
    setState((s) => ({ ...s, водители: s.водители.filter((_, i) => i !== driverIdx) }));

  const updRefuel = (idx: number, patch: Partial<Заправка>) =>
    setState((s) => ({
      ...s,
      заправки: s.заправки.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    }));

  const addRefuel = () => setState((s) => ({ ...s, заправки: [...s.заправки, emptyRefuel()] }));
  const removeRefuel = (idx: number) =>
    setState((s) => ({ ...s, заправки: s.заправки.filter((_, i) => i !== idx) }));

  const isMultiDayTrip = state.видСообщения === 'междугородное' || state.видСообщения === 'международное';

  const todayStamp = useMemo(
    () => new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    [],
  );

  const goNext = () => {
    const errs = validateStep(state, step);
    setErrors(errs);
    if (errs.length) return;
    setErrors([]);
    setStep((s) => Math.min(6, s + 1));
    window.scrollTo({ top: document.querySelector('.ticket')?.getBoundingClientRect().top ?? 0, behavior: 'smooth' });
  };

  const goBack = () => {
    setErrors([]);
    setStep((s) => Math.max(1, s - 1));
  };

  const onCalc = async () => {
    const errs = validateAll(state);
    setErrors(errs);
    if (errs.length) {
      setResult(null);
      setTimeout(() => document.getElementById('demo-result')?.scrollIntoView({ behavior: 'smooth' }), 0);
      return;
    }
    setLoading(true);
    try {
      const r = await calculateSmart(buildInput(state));
      setResult(r);
    } finally {
      setLoading(false);
      setTimeout(() => document.getElementById('demo-result')?.scrollIntoView({ behavior: 'smooth' }), 0);
    }
  };

  const onDownloadPdf = async () => {
    if (!result?.листы.length || !pdfHostRef.current) return;
    setPdfLoading(true);
    try {
      const stamp = new Date().toISOString().slice(0, 10);
      await downloadSheetsPdf(pdfHostRef.current, `putevye-listy-${stamp}.pdf`);
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="gsm-layout">
      <div className="gsm-intro">
        <p>
          <strong>Восстановите путевой лист по чекам с АЗС.</strong> Выберите основные параметры и введите данные с
          чеков в поля ниже, чтобы посчитать, как может распределяться автопробег по дням выездов.
        </p>
        <p className="tos-note">
          Сервис предоставляется пользователям исключительно в ознакомительных целях и не гарантирует
          соответствия фактически совершённым поездкам. Использование данного сервиса автоматически
          означает согласие пользователя с условиями Пользовательского соглашения.
        </p>
      </div>

      <div className="ticket" role="form" aria-label="Калькулятор ГСМ">
        <div className="ticket-head">
          <span className="ticket-title">Данные для расчёта</span>
          <span className="ticket-num">
            от <span className="mono">{todayStamp}</span>
          </span>
        </div>

        <div className="wizard-progress">
          {STEP_TITLES.map((title, i) => {
            const n = i + 1;
            return (
              <div key={title} className={`wizard-progress__step${n === step ? ' active' : ''}${n < step ? ' done' : ''}`}>
                <span className="wizard-progress__num">{n}</span>
                <span className="wizard-progress__title">{title}</span>
              </div>
            );
          })}
        </div>
        <p className="wizard-step-label">
          Шаг {step} из 6 — {STEP_TITLES[step - 1]}
        </p>

        <div className="perforation" aria-hidden="true" />

        {errors.length > 0 && (
          <div className="alert">
            {errors.map((e, i) => (
              <p key={i}>{e}</p>
            ))}
          </div>
        )}

        {step === 1 && (
          <section className="ticket-section">
            <h2>
              <span className="section-label">Авто</span>
            </h2>
            <div className="grid">
              <div className="field">
                <label>Марка ТС</label>
                <input
                  list="marki-list"
                  value={state.марка}
                  onChange={(e) => upd('марка', e.target.value)}
                  placeholder="Напр., ГАЗ"
                />
                <datalist id="marki-list">
                  {МАРКИ_ПОДСКАЗКИ.map((m) => (
                    <option value={m} key={m} />
                  ))}
                </datalist>
              </div>
              <div className="field">
                <label>Модель ТС</label>
                <input value={state.модель} onChange={(e) => upd('модель', e.target.value)} placeholder="Напр., 3302" />
              </div>
              <div className="field">
                <label>Тип ТС</label>
                <select value={state.типТС} onChange={(e) => upd('типТС', e.target.value as ТипТС)}>
                  <option value="легковой">Легковой</option>
                  <option value="грузовой">Грузовой</option>
                </select>
              </div>
            </div>
            <div className="checks">
              <label className="checkbox-row">
                <input type="checkbox" checked={state.старше10лет} onChange={(e) => upd('старше10лет', e.target.checked)} />
                Авто старше 10 лет
              </label>
              <label className="checkbox-row">
                <input type="checkbox" checked={state.прицепГруз} onChange={(e) => upd('прицепГруз', e.target.checked)} />
                Прицеп или груз
              </label>
              <label className="checkbox-row">
                <input type="checkbox" checked={state.спецтехника} onChange={(e) => upd('спецтехника', e.target.checked)} />
                Спецтехника <span className="hint">(коэффициенты не применяются, потребуется указать средний расход вручную)</span>
              </label>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="ticket-section">
            <h2>
              <span className="section-label">Водители</span>
            </h2>
            <div className="grid grid-dates">
              <div className="field">
                <label>Период: с</label>
                <input type="date" value={state.периодС} onChange={(e) => upd('периодС', e.target.value)} />
              </div>
              <div className="field">
                <label>Период: по</label>
                <input type="date" value={state.периодПо} onChange={(e) => upd('периодПо', e.target.value)} />
              </div>
              <div className="field">
                <label>Количество водителей</label>
                <select value={state.водители.length} onChange={(e) => setDriverCount(Number(e.target.value))}>
                  {[1, 2, 3, 4].map((n) => (
                    <option value={n} key={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {state.водители.map((driver, driverIdx) => (
              <div className="driver-row" key={driverIdx}>
                <div className="driver-row__head">
                  <div className="field">
                    <label>ФИО водителя</label>
                    <input
                      value={driver.фио}
                      onChange={(e) => updDriverName(driverIdx, e.target.value)}
                      placeholder="Напр., Иванов И. И."
                    />
                  </div>
                  {state.водители.length > 1 && (
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => removeDriver(driverIdx)}
                      aria-label="Удалить водителя"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <MiniCalendar
                  viewMonth={driver.viewMonth}
                  selected={driver.дни}
                  onToggle={(iso) => toggleDriverDay(driverIdx, iso)}
                  onViewMonthChange={(iso) => setDriverViewMonth(driverIdx, iso)}
                />
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={
                      state.периодС !== '' &&
                      state.периодПо !== '' &&
                      weekdaysInPeriod(state.периодС, state.периодПо).size === driver.дни.size &&
                      [...weekdaysInPeriod(state.периодС, state.периодПо)].every((d) => driver.дни.has(d))
                    }
                    onChange={() => selectAllWorkingDays(driverIdx)}
                  />
                  Выбрать все рабочие дни периода (Пн–Пт)
                </label>
              </div>
            ))}
            {state.водители.length < 4 && (
              <button type="button" className="link-btn" onClick={addDriver}>
                + Добавить водителя
              </button>
            )}
          </section>
        )}

        {step === 3 && (
          <section className="ticket-section">
            <h2>
              <span className="section-label">Топливо</span>
            </h2>
            <div className="grid">
              <div className="field">
                <label>Вид топлива</label>
                <select value={state.видТоплива} onChange={(e) => upd('видТоплива', e.target.value as ВидТоплива)}>
                  <option value="ДТ">ДТ</option>
                  <option value="Аи-92">Аи-92</option>
                  <option value="Аи-95">Аи-95</option>
                  <option value="Аи-100">Аи-100</option>
                </select>
              </div>
              <div className="field">
                <label>Объём бака ТС, л</label>
                <input
                  type="number"
                  min={0}
                  value={state.объёмБака}
                  onChange={(e) => upd('объёмБака', numField(e.target.value))}
                  placeholder="Напр., 70"
                />
              </div>
            </div>
          </section>
        )}

        {step === 4 && (
          <section className="ticket-section">
            <h2>
              <span className="section-label">Заправки</span>
            </h2>
            <p className="step-hint">Чеки с автозаправок — введите данные с каждого чека отдельной строкой.</p>
            <div className="refuels">
              <div className="refuel-row refuel-row-head">
                <span>Дата</span>
                <span>Время</span>
                <span>Литров</span>
                <span />
              </div>
              {state.заправки.map((r, idx) => (
                <div className="refuel-row" key={idx}>
                  <input type="date" value={r.дата} onChange={(e) => updRefuel(idx, { дата: e.target.value })} />
                  <input type="time" value={r.время} onChange={(e) => updRefuel(idx, { время: e.target.value })} />
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={r.объём}
                    onChange={(e) => updRefuel(idx, { объём: numField(e.target.value) })}
                    placeholder="л"
                  />
                  <button type="button" className="icon-btn" onClick={() => removeRefuel(idx)} aria-label="Удалить заправку">
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button type="button" className="link-btn" onClick={addRefuel}>
              + Добавить ещё чек
            </button>
          </section>
        )}

        {step === 5 && (
          <section className="ticket-section">
            <h2>
              <span className="section-label">Расход</span>
            </h2>
            <div className="grid">
              <div className="field">
                <label>Одометр на начало периода, км</label>
                <input
                  type="number"
                  min={0}
                  value={state.одометрНаНачало}
                  onChange={(e) => upd('одометрНаНачало', numField(e.target.value))}
                />
              </div>
              <div className="field">
                <label>Одометр на конец периода, км <span className="hint">(если известно)</span></label>
                <input
                  type="number"
                  min={0}
                  value={state.одометрНаКонец}
                  onChange={(e) => upd('одометрНаКонец', numField(e.target.value))}
                />
              </div>
              <div className="field">
                <label>
                  Либо средний расход, л/100км{' '}
                  <span
                    className="tooltip-icon"
                    tabIndex={0}
                    title="Если вы не знаете средний расход, укажите одометр на конец периода — мы вычислим расход сами по фактическому пробегу и объёму заправок за период."
                  >
                    ?
                  </span>
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={state.среднийРасход}
                  onChange={(e) => upd('среднийРасход', numField(e.target.value))}
                  placeholder="Если знаете точно"
                />
              </div>
              <div className="field">
                <label>Вид сообщения</label>
                <select value={state.видСообщения} onChange={(e) => upd('видСообщения', e.target.value as ВидСообщения)}>
                  <option value="городское">Городское</option>
                  <option value="пригородное">Пригородное</option>
                  <option value="междугородное">Междугородное</option>
                  <option value="международное">Международное</option>
                </select>
              </div>
              {isMultiDayTrip && (
                <div className="field">
                  <label>
                    Срок рейса, дней <span className="hint">(на весь рейс, а не по дням)</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={state.срокРейсаДней}
                    onChange={(e) => upd('срокРейсаДней', numField(e.target.value))}
                    placeholder="Напр., 3"
                  />
                </div>
              )}
            </div>
          </section>
        )}

        {step === 6 && (
          <section className="ticket-section">
            <h2>
              <span className="section-label">Остатки</span>
            </h2>
            <div className="grid grid-dates">
              <div className="field">
                <label>Период для расчёта: с</label>
                <input type="date" value={state.периодС} onChange={(e) => upd('периодС', e.target.value)} />
              </div>
              <div className="field">
                <label>Период для расчёта: по</label>
                <input type="date" value={state.периодПо} onChange={(e) => upd('периодПо', e.target.value)} />
              </div>
            </div>
            <div className="grid">
              <div className="field">
                <label>Остаток топлива в баке на начало периода, л</label>
                <input
                  type="number"
                  min={0}
                  value={state.остатокНаНачало}
                  onChange={(e) => upd('остатокНаНачало', numField(e.target.value))}
                />
              </div>
              <div className="field">
                <label>Остаток топлива в баке на конец периода, л</label>
                <input
                  type="number"
                  min={0}
                  value={state.остатокНаКонец}
                  onChange={(e) => upd('остатокНаКонец', numField(e.target.value))}
                />
              </div>
            </div>
          </section>
        )}

        <div className="ticket-actions wizard-actions">
          {step > 1 && (
            <button type="button" className="btn-secondary" onClick={goBack}>
              ← Назад
            </button>
          )}
          {step < 6 && (
            <button type="button" className="btn-calc" onClick={goNext}>
              Вперёд →
            </button>
          )}
          {step === 6 && (
            <button type="button" className="btn-calc" onClick={onCalc} disabled={loading}>
              {loading ? 'Считаю…' : 'Посчитать'}
            </button>
          )}
        </div>
      </div>

      <div id="demo-result" className="result-zone">
        {result && result.предупреждения.length > 0 && (
          <div className="alert alert-warn">
            {result.предупреждения.map((w, i) => (
              <p key={i}>{w}</p>
            ))}
          </div>
        )}

        {result && result.листы.length > 0 && (
          <>
            <p className="disclaimer disclaimer--top">
              Ниже представлены сформированные путевые листы для ознакомления.
            </p>

            <div className="result-toolbar">
              <h2 className="result-heading">Результат: {result.листы.length} путевых листа(ов)</h2>
              <button type="button" className="btn-pdf" onClick={onDownloadPdf} disabled={pdfLoading}>
                {pdfLoading ? 'Готовлю PDF…' : 'Скачать PDF'}
              </button>
            </div>

            <div className="stub-grid">
              {result.листы.map((л) => (
                <div className="stub" key={л.номер}>
                  <div className="stub-head">
                    <span>ПЛ № {л.номер}</span>
                    <span className="mono">{л.водитель}</span>
                  </div>
                  <div className="stub-row">
                    <span>Выпуск / возврат</span>
                    <span className="mono">
                      {л.выпуск} → {л.возвращение}
                    </span>
                  </div>
                  <div className="stub-row">
                    <span>Одометр</span>
                    <span className="mono">
                      {л.одометрВыдача} → {л.одометрЗакрытие} км
                    </span>
                  </div>
                  <div className="stub-row highlight">
                    <span>Пробег</span>
                    <span className="mono">{л.пробег} км</span>
                  </div>
                  <div className="stub-row">
                    <span>ГСМ в баке</span>
                    <span className="mono">
                      {л.остатокВыдача} → {л.остатокЗакрытие} л
                    </span>
                  </div>
                  <div className="stub-row highlight">
                    <span>Расход</span>
                    <span className="mono">{л.расходФакт} л</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pro-teaser">
              <img src="../img/logo-predreis-online.png" alt="ПРЕДРЕЙС ONLINE" className="pro-teaser__logo pro-teaser__logo--online" />
              <p>
                Маршрут построен. Больше возможностей в <strong>PRO-версии</strong> Калькулятора ГСМ для транспортной
                бухгалтерии и диспетчерских служб.
              </p>
              <p>У нашей клиентской службы уже есть ответы на ваши вопросы. Свяжитесь с нами:</p>
              <p className="pro-teaser__contacts">
                <a href="tel:+79250288755">+7 925 028-87-55</a>
                <a href="mailto:predreis@predreis.online">predreis@predreis.online</a>
              </p>
            </div>

            <p className="disclaimer">
              Внимание! Путевой лист без отметок о прохождении медицинского осмотра водителя и технического контроля
              транспортного средства недействителен.
            </p>

            <div className="pro-teaser">
              <img src="../img/logo-predreis-footer.png" alt="ПРЕДРЕЙС" className="pro-teaser__logo" />
              <p>
                Правильно организовать выпуск автомобилей на линию и вести путевую документацию вам всегда помогут в{' '}
                <strong>ПРЕДРЕЙС</strong>.
              </p>
              <p>Свяжитесь с нами:</p>
              <p className="pro-teaser__contacts">
                <a href="tel:+79250288755">+7 925 028-87-55</a>
                <a href="mailto:predreis@predreis.info">predreis@predreis.info</a>
              </p>
              <p>
                <a href="../contact.html" style={{ color: '#8285bf', fontWeight: 700 }}>
                  Связаться с ПРЕДРЕЙС →
                </a>
              </p>
            </div>
          </>
        )}
      </div>

      {result && result.листы.length > 0 && (
        <div className="pdf-print-host" ref={pdfHostRef} aria-hidden="true">
          {result.листы.map((л) => (
            <div className="pdf-sheet" key={`pdf-${л.номер}`}>
              <div className="pdf-sheet__brand">ПРЕДРЕЙС · Калькулятор ГСМ</div>
              <h1 className="pdf-sheet__title">Путевой лист № {л.номер}</h1>
              <p className="pdf-sheet__subtitle">
                {state.марка} {state.модель} · {formatVehicleType(state.типТС)} · {formatFuel(state.видТоплива)}
              </p>
              <div className="pdf-sheet__meta">
                <div>
                  <span>Водитель: </span>
                  <strong>{л.водитель}</strong>
                </div>
                <div>
                  <span>Дата расчёта: </span>
                  <strong>{todayStamp}</strong>
                </div>
                <div>
                  <span>Выпуск: </span>
                  <strong>{л.выпуск}</strong>
                </div>
                <div>
                  <span>Возвращение: </span>
                  <strong>{л.возвращение}</strong>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Показатель</th>
                    <th>Значение</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Одометр при выдаче, км</td>
                    <td>{л.одометрВыдача}</td>
                  </tr>
                  <tr>
                    <td>Одометр при возврате, км</td>
                    <td>{л.одометрЗакрытие}</td>
                  </tr>
                  <tr>
                    <td>Пробег, км</td>
                    <td>{л.пробег}</td>
                  </tr>
                  <tr>
                    <td>Остаток ГСМ при выдаче, л</td>
                    <td>{л.остатокВыдача}</td>
                  </tr>
                  <tr>
                    <td>Остаток ГСМ при возврате, л</td>
                    <td>{л.остатокЗакрытие}</td>
                  </tr>
                  <tr>
                    <td>Расход по норме, л</td>
                    <td>{л.расходНорма}</td>
                  </tr>
                  <tr>
                    <td>Расход фактический, л</td>
                    <td>{л.расходФакт}</td>
                  </tr>
                  <tr>
                    <td>Вид сообщения</td>
                    <td>{л.видСообщения}</td>
                  </tr>
                </tbody>
              </table>
              <p className="pdf-sheet__note">
                Документ сформирован калькулятором ГСМ ПРЕДРЕЙС. Не является официальным бланком путевого листа.
                Требуются отметки медицинского осмотра и технического контроля.
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
