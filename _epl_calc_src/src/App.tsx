import { useMemo, useRef, useState } from 'react';
import type { ВидСообщения, ВидТоплива, ВходныеДанные, Заправка, РезультатРасчёта, ТипТС } from './types';
import { parseISODate } from './calc';
import { calculateSmart } from './api';
import { downloadSheetsPdf } from './pdfExport';

const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const jsDayToMonFirst = (jsDay: number) => (jsDay === 0 ? 6 : jsDay - 1);

function todayISO(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function emptyRefuel(): Заправка {
  return { дата: todayISO(), время: '08:00', объём: '' };
}

interface DemoState {
  марка: string;
  модель: string;
  типТС: ТипТС;
  видТоплива: ВидТоплива;
  объёмБака: number | '';
  периодС: string;
  периодПо: string;
  будниДни: Set<number>;
  одометрНаНачало: number | '';
  остатокНаНачало: number | '';
  заправки: Заправка[];
  старше10лет: boolean;
  прицепГруз: boolean;
  спецтехника: boolean;
  среднийРасход: number | '';
  видСообщения: ВидСообщения;
}

function initialState(): DemoState {
  return {
    марка: 'ГАЗ',
    модель: '3302',
    типТС: 'грузовой',
    видТоплива: 'бензин',
    объёмБака: 70,
    периодС: todayISO(-13),
    периодПо: todayISO(),
    будниДни: new Set([0, 1, 2, 3, 4]),
    одометрНаНачало: '',
    остатокНаНачало: 15,
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
  };
}

function numField(value: string): number | '' {
  return value === '' ? '' : Number(value);
}

function buildInput(state: DemoState): ВходныеДанные {
  const дни = new Set<string>();
  if (state.периодС && state.периодПо) {
    const from = parseISODate(state.периодС);
    const to = parseISODate(state.периодПо);
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      if (state.будниДни.has(jsDayToMonFirst(d.getDay()))) {
        дни.add(d.toISOString().slice(0, 10));
      }
    }
  }

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
    срокРейсаДней: '',
    одометрНаНачало: state.одометрНаНачало,
    остатокНаНачало: state.остатокНаНачало,
    водители: [{ фио: 'Водитель', дни }],
    заправки: state.заправки,
  };
}

function validate(state: DemoState): string[] {
  const errs: string[] = [];
  if (!state.периодС || !state.периодПо) errs.push('Укажите период — с и по.');
  if (state.периодС && state.периодПо && parseISODate(state.периодПо) < parseISODate(state.периодС)) {
    errs.push('Дата «по» не может быть раньше даты «с».');
  }
  if (!(Number(state.объёмБака) > 0)) errs.push('Укажите объём бака ТС.');
  if (state.остатокНаНачало === '' || Number(state.остатокНаНачало) < 0) {
    errs.push('Укажите остаток топлива в баке на начало периода.');
  }
  if (state.будниДни.size === 0) errs.push('Отметьте хотя бы один рабочий день недели.');
  if (state.заправки.filter((r) => r.дата && r.объём !== '').length === 0) {
    errs.push('Добавьте хотя бы одну заправку с чека.');
  }
  return errs;
}

function formatFuel(value: ВидТоплива): string {
  return value === 'бензин' ? 'Бензин' : 'Дизель';
}

function formatVehicleType(value: ТипТС): string {
  return value === 'легковой' ? 'Легковой' : 'Грузовой';
}

export function DemoApp() {
  const [state, setState] = useState<DemoState>(initialState);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [result, setResult] = useState<РезультатРасчёта | null>(null);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const pdfHostRef = useRef<HTMLDivElement>(null);

  const upd = <K extends keyof DemoState>(key: K, value: DemoState[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  const toggleWeekday = (idx: number) =>
    setState((s) => {
      const next = new Set(s.будниДни);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return { ...s, будниДни: next };
    });

  const setAllWeekdays = () => setState((s) => ({ ...s, будниДни: new Set([0, 1, 2, 3, 4]) }));

  const updRefuel = (idx: number, patch: Partial<Заправка>) =>
    setState((s) => ({
      ...s,
      заправки: s.заправки.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    }));

  const addRefuel = () => setState((s) => ({ ...s, заправки: [...s.заправки, emptyRefuel()] }));
  const removeRefuel = (idx: number) =>
    setState((s) => ({ ...s, заправки: s.заправки.filter((_, i) => i !== idx) }));

  const todayStamp = useMemo(
    () =>
      new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    [],
  );

  const onCalc = async () => {
    const errs = validate(state);
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
          <strong>Восстановите путевой лист по чекам с АЗС.</strong> Введите данные о заправках —
          калькулятор восстановит пробег, расход топлива и показания одометра по дням.
        </p>
      </div>

      <div className="ticket" role="form" aria-label="Калькулятор ГСМ">
        <div className="ticket-head">
          <span className="ticket-title">Данные для расчёта</span>
          <span className="ticket-num">
            от <span className="mono">{todayStamp}</span>
          </span>
        </div>

        <div className="perforation" aria-hidden="true" />

        <section className="ticket-section">
          <h2>
            <span className="section-label">Транспорт</span>
          </h2>
          <div className="grid">
            <div className="field">
              <label>Марка</label>
              <input value={state.марка} onChange={(e) => upd('марка', e.target.value)} placeholder="Напр., ГАЗ" />
            </div>
            <div className="field">
              <label>Модель</label>
              <input value={state.модель} onChange={(e) => upd('модель', e.target.value)} placeholder="Напр., 3302" />
            </div>
            <div className="field">
              <label>Тип ТС</label>
              <select value={state.типТС} onChange={(e) => upd('типТС', e.target.value as ТипТС)}>
                <option value="легковой">Легковой</option>
                <option value="грузовой">Грузовой</option>
              </select>
            </div>
            <div className="field">
              <label>Топливо</label>
              <select value={state.видТоплива} onChange={(e) => upd('видТоплива', e.target.value as ВидТоплива)}>
                <option value="бензин">Бензин</option>
                <option value="дизель">Дизель</option>
              </select>
            </div>
            <div className="field">
              <label>Объём бака, л</label>
              <input
                type="number"
                min={0}
                value={state.объёмБака}
                onChange={(e) => upd('объёмБака', numField(e.target.value))}
                placeholder="Напр., 70"
              />
            </div>
            <div className="field">
              <label>Остаток ГСМ на старте, л</label>
              <input
                type="number"
                min={0}
                value={state.остатокНаНачало}
                onChange={(e) => upd('остатокНаНачало', numField(e.target.value))}
              />
            </div>
          </div>
        </section>

        <div className="perforation" aria-hidden="true" />

        <section className="ticket-section">
          <h2>
            <span className="section-label">Период и рабочие дни</span>
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
          </div>
          <div className="weekdays">
            <div className="weekday-row">
              {WEEKDAY_LABELS.map((label, idx) => (
                <button
                  type="button"
                  key={label}
                  className={`weekday-btn${state.будниДни.has(idx) ? ' active' : ''}`}
                  onClick={() => toggleWeekday(idx)}
                >
                  {label}
                </button>
              ))}
            </div>
            <button type="button" className="link-btn" onClick={setAllWeekdays}>
              Все будние дни
            </button>
          </div>
        </section>

        <div className="perforation" aria-hidden="true" />

        <section className="ticket-section">
          <h2>
            <span className="section-label">Заправки с чеков</span>
          </h2>
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
            + Добавить заправку
          </button>
        </section>

        <div className="perforation" aria-hidden="true" />

        <section className="ticket-section">
          <button type="button" className="advanced-toggle" onClick={() => setAdvancedOpen((v) => !v)}>
            {advancedOpen ? '▾' : '▸'} Дополнительные параметры
          </button>
          {advancedOpen && (
            <div className="advanced-body">
              <div className="grid">
                <div className="field">
                  <label>
                    Средний расход, л/100км <span className="hint">(если не знаете — посчитаем по нормативу)</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={state.среднийРасход}
                    onChange={(e) => upd('среднийРасход', numField(e.target.value))}
                    placeholder="Авто"
                  />
                </div>
                <div className="field">
                  <label>
                    Показания одометра на старте, км <span className="hint">(если не знаете — от 2500 км)</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={state.одометрНаНачало}
                    onChange={(e) => upd('одометрНаНачало', numField(e.target.value))}
                  />
                </div>
                <div className="field">
                  <label>Вид сообщения</label>
                  <select value={state.видСообщения} onChange={(e) => upd('видСообщения', e.target.value as ВидСообщения)}>
                    <option value="городское">Городское</option>
                    <option value="пригородное">Пригородное</option>
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
                  Спецтехника
                </label>
              </div>
            </div>
          )}
        </section>

        <div className="ticket-actions">
          <button type="button" className="btn-calc" onClick={onCalc} disabled={loading}>
            {loading ? 'Считаю…' : 'Посчитать'}
          </button>
        </div>
      </div>

      <div id="demo-result" className="result-zone">
        {errors.length > 0 && (
          <div className="alert">
            {errors.map((e, i) => (
              <p key={i}>{e}</p>
            ))}
          </div>
        )}

        {result && result.предупреждения.length > 0 && (
          <div className="alert alert-warn">
            {result.предупреждения.map((w, i) => (
              <p key={i}>{w}</p>
            ))}
          </div>
        )}

        {result && result.листы.length > 0 && (
          <>
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
              <p>
                Нужна полная версия с маршрутами, печатью форм и интеграцией? Свяжитесь с нами — поможем восстановить
                путевую документацию под ключ.
              </p>
              <p>
                <a href="../contact.html" style={{ color: '#8285bf', fontWeight: 700 }}>
                  Связаться с ПРЕДРЕЙС →
                </a>
              </p>
            </div>

            <p className="disclaimer">
              Внимание! Путевой лист без отметок о прохождении медицинского осмотра водителя и технического контроля
              транспортного средства недействителен. Сервис предоставляется в ознакомительных целях и не гарантирует
              соответствия фактически совершённым поездкам.
            </p>
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
