import { useMemo, useRef, useState } from 'react';
import type { ВидСообщения, ВидТоплива, ВходныеДанные, Водитель, Заправка, РезультатРасчёта, ТипТС } from './types';
import { impossibleFuelBalanceMessage, parseISODate, toISODate } from './calc';
import { calculateSmart } from './api';
import { DecimalInput } from './DecimalInput';
import { downloadSheetsPdf } from './pdfExport';
import { формаПоТипуТС, названиеФормы } from './formPl';
import { PdfFormPages } from './pdfForms';
import { DatePickerField } from './DatePickerField';
import { MonthCalendar } from './MonthCalendar';
import { firstOfMonthISO, formatRuDate, jsDayToMonFirst } from './dateCalendar';

const МАРКИ_ПОДСКАЗКИ = [
  'ГАЗ', 'КамАЗ', 'УАЗ', 'ВАЗ (Lada)', 'Урал', 'МАЗ', 'ЗИЛ', 'ПАЗ', 'ЛиАЗ',
  'Volvo', 'Scania', 'MAN', 'DAF', 'Mercedes-Benz', 'Iveco', 'Renault',
  'Hyundai', 'Isuzu', 'Ford', 'ГАЗель NEXT',
];

/** Десятичная запятая без группировки тысяч: 10.5 → «10,5», 50 → «50». */
function formatRuNumber(n: number, maxDigits = 2): string {
  if (!Number.isFinite(n)) return '';
  const factor = 10 ** maxDigits;
  const rounded = Math.round(n * factor) / factor;
  return rounded.toFixed(maxDigits).replace(/\.?0+$/, '').replace('.', ',');
}

function todayISO(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return toISODate(d);
}

function dropRefuelsOutsideWorkDays(водители: ДемоВодитель[], заправки: Заправка[]): Заправка[] {
  const days = new Set<string>();
  водители.forEach((v) => v.дни.forEach((d) => days.add(d)));
  return заправки.filter((r) => days.has(r.дата));
}

interface ДемоВодитель {
  фио: string;
  дни: Set<string>;
  viewMonth: string; // YYYY-MM — какой месяц открыт в календаре этого водителя
}

function emptyDriver(периодС: string): ДемоВодитель {
  return { фио: '', дни: new Set<string>(), viewMonth: firstOfMonthISO(периодС || todayISO()) };
}

/** Убирает из календаря водителей даты вне выбранного периода. */
function trimDriverDaysToPeriod(водители: ДемоВодитель[], периодС: string, периодПо: string): ДемоВодитель[] {
  const periodDays = datesInPeriod(периодС, периодПо);
  return водители.map((v) => ({
    ...v,
    дни: new Set([...v.дни].filter((d) => periodDays.has(d))),
    viewMonth: firstOfMonthISO(периодС || v.viewMonth),
  }));
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
    марка: '',
    модель: '',
    типТС: 'грузовой',
    видТоплива: 'Аи-92',
    объёмБака: '',
    периодС,
    периодПо,
    водители: [emptyDriver(периодС)],
    одометрНаНачало: '',
    одометрНаКонец: '',
    остатокНаНачало: '',
    остатокНаКонец: '',
    заправки: [],

    старше10лет: false,
    прицепГруз: false,
    спецтехника: false,
    среднийРасход: '',
    видСообщения: 'городское',
    срокРейсаДней: '',
  };
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
    формаПЛ: формаПоТипуТС(state.типТС),
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

/** Три шага: авто+топливо, водители+заправки, расход+остатки. */
const STEP_TITLES = ['Авто', 'Водители и заправки', 'Расход и остатки ГСМ'];

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
    if (state.заправки.length === 0) {
      errs.push('Отметьте в календаре хотя бы один день заправки.');
    }
    state.заправки.forEach((r) => {
      const when = formatRuDate(r.дата);
      if (!r.время) errs.push(`Укажите время заправки ${when}.`);
      if (r.объём === '' || Number(r.объём) <= 0) errs.push(`Укажите объём заправки ${when}.`);
    });
  }
  if (step === 3) {
    if (
      state.одометрНаКонец !== '' &&
      state.одометрНаНачало !== '' &&
      Number(state.одометрНаКонец) <= Number(state.одометрНаНачало)
    ) {
      errs.push('Одометр на конец периода должен быть больше одометра на начало.');
    }
    if (state.спецтехника && !(Number(state.среднийРасход) > 0)) {
      errs.push('Для спецтехники коэффициенты не применяются — укажите средний расход вручную.');
    }
    if (state.остатокНаНачало === '' || Number(state.остатокНаНачало) < 0) {
      errs.push('Укажите остаток топлива в баке на начало периода.');
    }
    if (state.остатокНаКонец === '' || Number(state.остатокНаКонец) < 0) {
      errs.push('Укажите остаток топлива в баке на конец периода.');
    }
    const balance = impossibleFuelBalanceMessage(
      state.остатокНаНачало,
      state.остатокНаКонец,
      state.заправки,
    );
    if (balance) errs.push(balance);
  }
  return errs;
}

function validateAll(state: DemoState): string[] {
  const errs: string[] = [];
  for (let s = 1; s <= 3; s++) errs.push(...validateStep(state, s));
  return errs;
}

/** Небольшой календарь на месяц с множественным выбором дат. */
/** Все ISO-даты в интервале [с; по] включительно. */
function datesInPeriod(periodС: string, periodПо: string): Set<string> {
  const дни = new Set<string>();
  if (!periodС || !periodПо) return дни;
  const from = parseISODate(periodС);
  const to = parseISODate(periodПо);
  if (to < from) return дни;
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    дни.add(toISODate(d));
  }
  return дни;
}


export function DemoApp() {
  const [state, setState] = useState<DemoState>(initialState);
  const [step, setStep] = useState(1);
  const [result, setResult] = useState<РезультатРасчёта | null>(null);
  const [formCollapsed, setFormCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState<'all' | number | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const pdfHostRef = useRef<HTMLDivElement>(null);

  const upd = <K extends keyof DemoState>(key: K, value: DemoState[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  const updPeriod = (key: 'периодС' | 'периодПо', value: string) =>
    setState((s) => {
      const периодС = key === 'периодС' ? value : s.периодС;
      const периодПо = key === 'периодПо' ? value : s.периодПо;
      const periodDays = datesInPeriod(периодС, периодПо);
      return {
        ...s,
        [key]: value,
        водители: trimDriverDaysToPeriod(s.водители, периодС, периодПо),
        заправки: s.заправки.filter((r) => periodDays.has(r.дата)),
      };
    });

  const updDriverName = (driverIdx: number, фио: string) =>
    setState((s) => ({
      ...s,
      водители: s.водители.map((v, i) => (i === driverIdx ? { ...v, фио } : v)),
    }));

  const toggleDriverDay = (driverIdx: number, iso: string) =>
    setState((s) => {
      const водители = s.водители.map((v, i) => {
        if (i !== driverIdx) return v;
        const next = new Set(v.дни);
        if (next.has(iso)) next.delete(iso);
        else next.add(iso);
        return { ...v, дни: next };
      });
      return { ...s, водители, заправки: dropRefuelsOutsideWorkDays(водители, s.заправки) };
    });

  const setDriverViewMonth = (driverIdx: number, iso: string) =>
    setState((s) => ({
      ...s,
      водители: s.водители.map((v, i) => (i === driverIdx ? { ...v, viewMonth: iso } : v)),
    }));

  const toggleAllWorkingDays = (driverIdx: number, checked: boolean) =>
    setState((s) => {
      const водители = s.водители.map((v, i) =>
        i === driverIdx
          ? { ...v, дни: checked ? weekdaysInPeriod(s.периодС, s.периодПо) : new Set<string>() }
          : v,
      );
      return { ...s, водители, заправки: dropRefuelsOutsideWorkDays(водители, s.заправки) };
    });

  const setDriverCount = (count: number) =>
    setState((s) => {
      const next = [...s.водители];
      while (next.length < count) next.push(emptyDriver(s.периодС));
      while (next.length > count) next.pop();
      return { ...s, водители: next, заправки: dropRefuelsOutsideWorkDays(next, s.заправки) };
    });

  const addDriver = () =>
    setState((s) =>
      s.водители.length >= 4 ? s : { ...s, водители: [...s.водители, emptyDriver(s.периодС)] },
    );

  const removeDriver = (driverIdx: number) =>
    setState((s) => {
      const водители = s.водители.filter((_, i) => i !== driverIdx);
      return { ...s, водители, заправки: dropRefuelsOutsideWorkDays(водители, s.заправки) };
    });

  const updRefuel = (idx: number, patch: Partial<Заправка>) =>
    setState((s) => ({
      ...s,
      заправки: s.заправки.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    }));

  const removeRefuel = (idx: number) =>
    setState((s) => ({ ...s, заправки: s.заправки.filter((_, i) => i !== idx) }));

  const toggleRefuelDay = (driverIdx: number, iso: string) =>
    setState((s) => {
      const driver = s.водители[driverIdx];
      if (!driver || !driver.дни.has(iso)) return s;
      if (s.заправки.some((r) => r.дата === iso)) {
        return { ...s, заправки: s.заправки.filter((r) => r.дата !== iso) };
      }
      const заправки = [...s.заправки, { дата: iso, время: '', объём: '' as const }];
      заправки.sort((a, b) => a.дата.localeCompare(b.дата));
      return { ...s, заправки };
    });

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
    setStep((s) => Math.min(3, s + 1));
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
      setFormCollapsed(false);
      setTimeout(() => document.getElementById('calc-errors')?.scrollIntoView({ behavior: 'smooth' }), 0);
      return;
    }
    setLoading(true);
    try {
      const r = await calculateSmart(buildInput(state));
      setResult(r);
      if (r.листы.length > 0) setFormCollapsed(true);
    } finally {
      setLoading(false);
      setTimeout(() => document.getElementById('demo-result')?.scrollIntoView({ behavior: 'smooth' }), 0);
    }
  };

  const onEditData = () => {
    setFormCollapsed(false);
    setResult(null);
    setTimeout(() => document.querySelector('.ticket')?.scrollIntoView({ behavior: 'smooth' }), 0);
  };

  const onDownloadPdf = async () => {
    if (!result?.листы.length || !pdfHostRef.current) return;
    setPdfLoading('all');
    try {
      const stamp = new Date().toISOString().slice(0, 10);
      await downloadSheetsPdf(pdfHostRef.current, `putevye-listy-${stamp}.pdf`);
    } finally {
      setPdfLoading(null);
    }
  };

  const onDownloadSheetPdf = async (номер: number) => {
    if (!pdfHostRef.current) return;
    const group = pdfHostRef.current.querySelector<HTMLElement>(`[data-sheet="${номер}"]`);
    if (!group) return;
    setPdfLoading(номер);
    try {
      const stamp = new Date().toISOString().slice(0, 10);
      await downloadSheetsPdf(group, `putevoi-list-${номер}-${stamp}.pdf`);
    } finally {
      setPdfLoading(null);
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
          соответствия фактически совершённым поездкам.
        </p>
      </div>

      {formCollapsed ? (
        <div className="ticket ticket--collapsed">
          <div className="ticket-head">
            <span className="ticket-title">
              Данные для расчёта: {state.марка} {state.модель} · {state.водители.length} вод. ·{' '}
              {state.периодС.split('-').reverse().join('.')}–{state.периодПо.split('-').reverse().join('.')}
            </span>
            <button type="button" className="link-btn" onClick={onEditData}>
              Изменить данные
            </button>
          </div>
        </div>
      ) : (
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
          Шаг {step} из 3 — {STEP_TITLES[step - 1]}
        </p>

        <div className="perforation" aria-hidden="true" />

        {errors.length > 0 && (
          <div className="alert" id="calc-errors">
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
                <p className="form-badge" aria-live="polite">
                  Форма путевого листа: <strong>{названиеФормы(формаПоТипуТС(state.типТС))}</strong>
                </p>
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
                <label>
                  Объём бака ТС, л <span className="hint">(необязательно)</span>
                </label>
                <DecimalInput
                  min={0}
                  value={state.объёмБака}
                  onChange={(v) => upd('объёмБака', v)}
                  placeholder="Напр., 70"
                />
              </div>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="ticket-section">
            <h2>
              <span className="section-label">Водители</span>
            </h2>
            <div className="grid grid-dates">
              <div className="field field--wide">
                <label>Период для расчёта путевых листов: с</label>
                <DatePickerField
                  value={state.периодС}
                  max={state.периодПо || undefined}
                  aria-label="Дата начала периода"
                  onChange={(iso) => updPeriod('периодС', iso)}
                />
              </div>
              <div className="field field--wide">
                <label>по</label>
                <DatePickerField
                  value={state.периодПо}
                  min={state.периодС || undefined}
                  aria-label="Дата окончания периода"
                  onChange={(iso) => updPeriod('периодПо', iso)}
                />
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
                <div className="driver-calendars">
                  <div>
                    <p className="calendar-hint">Укажите рабочие дни водителя</p>
                    <MonthCalendar
                      viewMonth={driver.viewMonth}
                      selected={driver.дни}
                      highlightDays={datesInPeriod(state.периодС, state.периодПо)}
                      min={state.периодС || undefined}
                      max={state.периодПо || undefined}
                      onToggle={(iso) => toggleDriverDay(driverIdx, iso)}
                      onViewMonthChange={(iso) => setDriverViewMonth(driverIdx, iso)}
                    />
                  </div>
                  <div>
                    <p className="calendar-hint">Укажите дни заправки этого водителя</p>
                    <MonthCalendar
                      variant="refuel"
                      viewMonth={driver.viewMonth}
                      selected={new Set(state.заправки.filter((r) => driver.дни.has(r.дата)).map((r) => r.дата))}
                      highlightDays={datesInPeriod(state.периодС, state.периодПо)}
                      markedDays={driver.дни}
                      enabledDays={driver.дни}
                      min={state.периодС || undefined}
                      max={state.периодПо || undefined}
                      onToggle={(iso) => toggleRefuelDay(driverIdx, iso)}
                      onViewMonthChange={(iso) => setDriverViewMonth(driverIdx, iso)}
                    />
                  </div>
                </div>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={
                      state.периодС !== '' &&
                      state.периодПо !== '' &&
                      weekdaysInPeriod(state.периодС, state.периодПо).size === driver.дни.size &&
                      [...weekdaysInPeriod(state.периодС, state.периодПо)].every((d) => driver.дни.has(d))
                    }
                    onChange={(e) => toggleAllWorkingDays(driverIdx, e.target.checked)}
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

            <h2>
              <span className="section-label">Заправки</span>
            </h2>
            <p className="step-hint">
              Чеки с автозаправок — введите данные с каждого чека отдельной строкой. Дата появляется, когда
              день отмечен в календаре заправок.
            </p>
            <div className="refuels">
              <div className="refuel-row refuel-row-head">
                <span>Дата</span>
                <span>Время</span>
                <span>Литров</span>
                <span />
              </div>
              {state.заправки.map((r, idx) => (
                <div className="refuel-row" key={r.дата}>
                  <span className="refuel-date mono">{formatRuDate(r.дата)}</span>
                  <input
                    type="time"
                    value={r.время}
                    aria-label={`Время заправки ${formatRuDate(r.дата)}`}
                    onChange={(e) => updRefuel(idx, { время: e.target.value })}
                  />
                  <DecimalInput
                    min={0}
                    value={r.объём}
                    onChange={(v) => updRefuel(idx, { объём: v })}
                    placeholder="л"
                  />
                  <button type="button" className="icon-btn" onClick={() => removeRefuel(idx)} aria-label="Удалить заправку">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="ticket-section">
            <div className="grid grid-dates">
              <div className="field field--wide">
                <label>Период для расчёта: с</label>
                <DatePickerField value={state.периодС} readOnly aria-label="Дата начала периода" />
              </div>
              <div className="field field--wide">
                <label>по</label>
                <DatePickerField value={state.периодПо} readOnly aria-label="Дата окончания периода" />
              </div>
            </div>
            <h2>
              <span className="section-label">Расход</span>
            </h2>
            <div className="field field--full">
              <label>Одометр на начало периода, км</label>
              <DecimalInput
                min={0}
                value={state.одометрНаНачало}
                onChange={(v) => upd('одометрНаНачало', v)}
              />
            </div>
            <div className="grid-or">
              <div className="field">
                <label>Одометр на конец периода, км</label>
                <DecimalInput
                  min={state.одометрНаНачало !== '' ? Number(state.одометрНаНачало) + 1 : 0}
                  value={state.одометрНаКонец}
                  onChange={(v) => upd('одометрНаКонец', v)}
                  placeholder="Если известно"
                />
              </div>
              <div className="grid-or__sep" aria-hidden="true">
                или
              </div>
              <div className="field">
                <label>
                  Средний расход, л/100&nbsp;км{' '}
                  <span className="tooltip-wrap">
                    <span className="tooltip-icon" tabIndex={0} aria-describedby="consumption-tip">
                      ?
                    </span>
                    <span className="tooltip-bubble" id="consumption-tip" role="tooltip">
                      Если вы не знаете средний расход, укажите одометр на конец периода — мы вычислим расход сами
                      по фактическому пробегу и объёму заправок за период.
                    </span>
                  </span>
                </label>
                <DecimalInput
                  min={0}
                  value={state.среднийРасход}
                  onChange={(v) => upd('среднийРасход', v)}
                  placeholder="Если знаете точно"
                />
              </div>
            </div>
            <div className="field field--full">
              <label>Вид сообщения</label>
                <select value={state.видСообщения} onChange={(e) => upd('видСообщения', e.target.value as ВидСообщения)}>
                  <option value="городское">Городское</option>
                  <option value="пригородное">Пригородное</option>
                  <option value="междугородное">Междугородное</option>
                  <option value="международное">Международное</option>
                </select>
            </div>
            {isMultiDayTrip && (
              <div className="field field--full">
                  <label>
                    Срок рейса, дней <span className="hint">(на весь рейс, а не по дням)</span>
                  </label>
                  <DecimalInput
                    min={1}
                    value={state.срокРейсаДней}
                    onChange={(v) => upd('срокРейсаДней', v)}
                    placeholder="Напр., 3"
                  />
              </div>
            )}
            <h2>
              <span className="section-label">Остатки ГСМ</span>
            </h2>
            <div className="grid">
              <div className="field">
                <label>Остаток топлива в баке на начало периода, л</label>
                <DecimalInput
                  min={0}
                  value={state.остатокНаНачало}
                  onChange={(v) => upd('остатокНаНачало', v)}
                  placeholder="Напр., 15"
                />
              </div>
              <div className="field">
                <label>Остаток топлива в баке на конец периода, л</label>
                <DecimalInput
                  min={0}
                  value={state.остатокНаКонец}
                  onChange={(v) => upd('остатокНаКонец', v)}
                  placeholder="Напр., 15"
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
          {step < 3 && (
            <button type="button" className="btn-calc" onClick={goNext}>
              Вперёд →
            </button>
          )}
          {step === 3 && (
            <button type="button" className="btn-calc" onClick={onCalc} disabled={loading}>
              {loading ? 'Считаю…' : 'Посчитать'}
            </button>
          )}
        </div>
      </div>
      )}

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
              <button type="button" className="btn-pdf" onClick={onDownloadPdf} disabled={pdfLoading !== null}>
                {pdfLoading === 'all' ? 'Готовлю PDF…' : 'Скачать PDF'}
              </button>
            </div>

            <div className="stub-grid">
              {result.листы.map((л) => (
                <div className="stub" key={л.номер}>
                  <div className="stub-head">
                    <span>
                      ПЛ № {л.номер} · {названиеФормы(л.формаПЛ ?? формаПоТипуТС(state.типТС))}
                    </span>
                    <span className="mono">{л.водитель}</span>
                  </div>
                  <div className="stub-row">
                    <span>Выпуск / возврат</span>
                    <span className="mono">
                      {л.выпуск} → {л.возвращение}
                    </span>
                  </div>
                  <div className="stub-row">
                    <span>Время в наряде</span>
                    <span className="mono">{formatRuNumber(л.общееВремя, 1)} ч</span>
                  </div>
                  <div className="stub-row">
                    <span>Заправки</span>
                    <span className="mono">
                      {л.заправки && л.заправки.length > 0
                        ? л.заправки.map((z) => `${z.время} — ${formatRuNumber(z.объём)} л`).join('; ')
                        : '—'}
                    </span>
                  </div>
                  <div className="stub-row highlight">
                    <span>Средний расход</span>
                    <span className="mono">
                      {result.расход ? `${formatRuNumber(result.расход.effective, 1)} л/100 км` : '—'}
                    </span>
                  </div>
                  <div className="stub-row stub-row--group">
                    <span>Одометр (выезд / возвращение)</span>
                    <span className="mono">
                      {formatRuNumber(л.одометрВыдача, 1)} → {formatRuNumber(л.одометрЗакрытие, 1)} км
                    </span>
                  </div>
                  <div className="stub-row highlight">
                    <span>Пробег за день</span>
                    <span className="mono">{formatRuNumber(л.пробег, 1)} км</span>
                  </div>
                  <div className="stub-row stub-row--group">
                    <span>ГСМ в баке (выезд / возвращение)</span>
                    <span className="mono">
                      {formatRuNumber(л.остатокВыдача)} → {formatRuNumber(л.остатокЗакрытие)} л
                    </span>
                  </div>
                  <div className="stub-row highlight">
                    <span>Израсходовано ГСМ за день</span>
                    <span className="mono">{formatRuNumber(л.расходФакт)} л</span>
                  </div>
                  <div className="stub-actions">
                    <button
                      type="button"
                      className="btn-pdf btn-pdf--stub"
                      onClick={() => onDownloadSheetPdf(л.номер)}
                      disabled={pdfLoading !== null}
                    >
                      {pdfLoading === л.номер ? 'Готовлю PDF…' : 'Скачать заполненный путевой лист'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pro-teaser pro-teaser--pro">
              <img src="../img/logo-predreis-online.png" alt="ПРЕДРЕЙС ONLINE" className="pro-teaser__logo pro-teaser__logo--online" />
              <p className="pro-teaser__eyebrow">Маршрут построен</p>
              <p className="pro-teaser__heading">
                Больше возможностей в <strong>PRO-версии</strong> Калькулятора ГСМ
              </p>
              <p className="pro-teaser__sub">
                Для транспортной бухгалтерии и диспетчерских служб. У нашей клиентской службы уже есть ответы на
                ваши вопросы.
              </p>
              <div className="pro-teaser__cta">
                <a href="tel:+79250288755" className="pro-teaser__btn">
                  +7 925 028-87-55
                </a>
                <a href="mailto:predreis@predreis.online" className="pro-teaser__btn pro-teaser__btn--ghost">
                  predreis@predreis.online
                </a>
              </div>
            </div>

            <p className="disclaimer">
              Внимание! Путевой лист без отметок о прохождении медицинского осмотра водителя и технического контроля
              транспортного средства недействителен.
            </p>

            <div className="pro-teaser pro-teaser--light">
              <img src="../img/logo-predreis.png" alt="ПРЕДРЕЙС" className="pro-teaser__logo" />
              <p>
                Правильно организовать выпуск автомобилей на линию и вести путевую документацию вам всегда помогут в{' '}
                <strong>ПРЕДРЕЙС</strong>.
              </p>
              <p>
                <a href="../contact.html" className="pro-teaser__link">
                  Связаться с ПРЕДРЕЙС →
                </a>
              </p>
            </div>
          </>
        )}
      </div>

      {result && result.листы.length > 0 && (
        <div className="pdf-print-host" ref={pdfHostRef} aria-hidden="true">
          {result.листы.map((л) => {
            const forma = л.формаПЛ ?? формаПоТипуТС(state.типТС);
            const input = buildInput(state);
            return (
              <div className="pdf-form-group" key={`pdf-${л.номер}`} data-sheet={л.номер}>
                <PdfFormPages forma={forma} input={input} лист={л} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
