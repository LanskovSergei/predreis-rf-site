import type { ДанныеБланка } from '../pdfFormUtils';
import { Val } from './shared';

export function Form3Pages({ d }: { d: ДанныеБланка }) {
  return (
    <>
      <div className="pdf-sheet pdf-sheet--portrait pl-form" data-orientation="portrait">
        <div className="pl-form__codes">
          <div className="pl-form__codes-left">Место для штампа<br />организации</div>
          <div className="pl-form__codes-right">
            <div>Типовая межотраслевая форма № 3</div>
            <div>Утверждена постановлением Госкомстата России</div>
            <div>от 28.11.97 № 78</div>
            <table className="pl-mini">
              <tbody>
                <tr>
                  <td>Форма по ОКУД</td>
                  <td><strong>0345001</strong></td>
                </tr>
                <tr>
                  <td>по ОКПО</td>
                  <td>&nbsp;</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <h1 className="pl-form__title">ПУТЕВОЙ ЛИСТ ЛЕГКОВОГО АВТОМОБИЛЯ</h1>
        <div className="pl-form__serial">
          серия <Val /> № <Val>{d.номер}</Val> « <Val>{d.день}</Val> » <Val>{d.месяц}</Val> <Val>{d.год}</Val> г.
        </div>

        <table className="pl-grid pl-grid--form3">
          <tbody>
            <tr>
              <td colSpan={4} className="pl-label">Организация</td>
            </tr>
            <tr>
              <td colSpan={4} className="pl-hint">(наименование, адрес, номер телефона)</td>
            </tr>
            <tr>
              <td className="pl-label">Марка автомобиля</td>
              <td colSpan={3}><Val wide>{d.маркаМодель}</Val></td>
            </tr>
            <tr>
              <td className="pl-label">Государственный номерной знак</td>
              <td><Val /></td>
              <td className="pl-label pl-label--narrow">Гаражный номер</td>
              <td><Val /></td>
            </tr>
            <tr>
              <td className="pl-label">Водитель</td>
              <td colSpan={2}><Val wide>{d.водитель}</Val></td>
              <td className="pl-label pl-label--narrow">Табельный номер <Val /></td>
            </tr>
            <tr>
              <td colSpan={4} className="pl-hint">(фамилия, имя, отчество)</td>
            </tr>
            <tr>
              <td className="pl-label">Удостоверение №</td>
              <td><Val /></td>
              <td className="pl-label pl-label--narrow">Класс</td>
              <td><Val /></td>
            </tr>
            <tr>
              <td className="pl-label">Лицензионная карточка</td>
              <td colSpan={3}>стандартная, ограниченная (ненужное зачеркнуть)</td>
            </tr>
            <tr>
              <td className="pl-label">Регистрационный №</td>
              <td><Val /></td>
              <td className="pl-label pl-label--narrow">Серия <Val /> № <Val /></td>
              <td />
            </tr>
            <tr>
              <td className="pl-label">Задание водителю</td>
              <td colSpan={3}><Val wide>{d.адресСтоянки}</Val></td>
            </tr>
            <tr>
              <td className="pl-label">В распоряжение</td>
              <td colSpan={3} className="pl-hint">(наименование)</td>
            </tr>
          </tbody>
        </table>

        <div className="pl-form__split">
          <table className="pl-grid pl-grid--form3">
            <tbody>
              <tr>
                <td className="pl-label">Адрес подачи</td>
                <td><Val wide>{d.адресСтоянки}</Val></td>
              </tr>
              <tr>
                <td className="pl-label">Время выезда из гаража, ч. мин.</td>
                <td><Val>{d.выпускЧ}</Val> : <Val>{d.выпускМин}</Val></td>
              </tr>
              <tr>
                <td className="pl-label">Время возвращения в гараж, ч. мин.</td>
                <td><Val>{d.возвратЧ}</Val> : <Val>{d.возвратМин}</Val></td>
              </tr>
              <tr>
                <td className="pl-label">Горючее — марка</td>
                <td><Val>{d.топливо}</Val></td>
              </tr>
              <tr>
                <td className="pl-label">Остаток при выезде, л</td>
                <td><Val>{d.остатокВыезд}</Val></td>
              </tr>
              <tr>
                <td className="pl-label">Остаток при возвращении, л</td>
                <td><Val>{d.остатокВозврат}</Val></td>
              </tr>
              <tr>
                <td className="pl-label">Расход: по норме, л</td>
                <td><Val>{d.расходНорма}</Val></td>
              </tr>
              <tr>
                <td className="pl-label">Расход: фактически, л</td>
                <td><Val>{d.расходФакт}</Val></td>
              </tr>
            </tbody>
          </table>
          <table className="pl-grid pl-grid--form3">
            <tbody>
              <tr>
                <td className="pl-label">Автомобиль технически исправен</td>
                <td className="pl-sign">Механик / подпись</td>
              </tr>
              <tr>
                <td className="pl-label">Показания спидометра при выезде, км</td>
                <td><Val>{d.одометрВыезд}</Val></td>
              </tr>
              <tr>
                <td className="pl-label">Показания спидометра при возвращении, км</td>
                <td><Val>{d.одометрВозврат}</Val></td>
              </tr>
              <tr>
                <td className="pl-label">Выезд разрешен</td>
                <td className="pl-sign">подпись</td>
              </tr>
              <tr>
                <td className="pl-label">Водитель принял автомобиль</td>
                <td className="pl-sign">подпись</td>
              </tr>
              <tr>
                <td className="pl-label">Диспетчер-нарядчик</td>
                <td className="pl-sign">подпись</td>
              </tr>
              <tr>
                <td className="pl-label">Автомобиль сдал / принял</td>
                <td className="pl-sign">водитель / механик</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="pdf-sheet pdf-sheet--portrait pl-form" data-orientation="portrait">
        <div className="pl-form__back-title">Оборотная сторона формы № 3</div>
        <table className="pl-grid pl-grid--form3-back">
          <thead>
            <tr>
              <th rowSpan={2}>№</th>
              <th rowSpan={2}>Код заказчика</th>
              <th colSpan={2}>Место</th>
              <th colSpan={4}>Время</th>
              <th rowSpan={2}>Пройдено, км</th>
              <th rowSpan={2}>Подпись</th>
            </tr>
            <tr>
              <th>отправления</th>
              <th>назначения</th>
              <th>выезда ч.</th>
              <th>мин.</th>
              <th>возвращ. ч.</th>
              <th>мин.</th>
            </tr>
          </thead>
          <tbody>
            {d.пробегПоДням.map((km, idx) => (
              <tr key={idx}>
                <td>{idx + 1}</td>
                <td><Val /></td>
                <td><Val wide>{d.адресСтоянки}</Val></td>
                <td><Val wide>{d.адресСтоянки}</Val></td>
                <td>{idx === 0 ? <Val>{d.выпускЧ}</Val> : null}</td>
                <td>{idx === 0 ? <Val>{d.выпускМин}</Val> : null}</td>
                <td>{idx === d.пробегПоДням.length - 1 ? <Val>{d.возвратЧ}</Val> : null}</td>
                <td>{idx === d.пробегПоДням.length - 1 ? <Val>{d.возвратМин}</Val> : null}</td>
                <td><Val>{km}</Val></td>
                <td />
              </tr>
            ))}
            {Array.from({ length: Math.max(0, 6 - d.пробегПоДням.length) }, (_, i) => (
              <tr key={`empty-${i}`}>
                <td>{d.пробегПоДням.length + i + 1}</td>
                <td />
                <td />
                <td />
                <td />
                <td />
                <td />
                <td />
                <td />
                <td />
                <td />
              </tr>
            ))}
          </tbody>
        </table>
        <table className="pl-grid pl-grid--form3 pl-grid--summary">
          <tbody>
            <tr>
              <td className="pl-label">Результат работы автомобиля за смену: всего в наряде, ч. мин.</td>
              <td><Val>{d.времяНарядЧ}</Val> : <Val>{d.времяНарядМин}</Val></td>
            </tr>
            <tr>
              <td className="pl-label">пройдено, км</td>
              <td><Val>{d.пробег}</Val></td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
