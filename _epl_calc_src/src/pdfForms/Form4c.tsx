import type { ДанныеБланка } from '../pdfFormUtils';
import { Val } from './shared';

export function Form4cPages({ d }: { d: ДанныеБланка }) {
  return (
    <>
      <div className="pdf-sheet pdf-sheet--landscape pl-form pl-form--4c" data-orientation="landscape">
        <div className="pl-form__codes pl-form__codes--4c">
          <div className="pl-form__codes-left">Место для штампа организации</div>
          <div className="pl-form__codes-right">
            <div className="pl-form__title-inline">ПУТЕВОЙ ЛИСТ грузового автомобиля</div>
            <div>
              серия <Val /> № <Val>{d.номер}</Val> « <Val>{d.день}</Val> » <Val>{d.месяц}</Val> <Val>{d.год}</Val> г.
            </div>
            <div className="pl-form__meta-right">
              <div>Типовая межотраслевая форма № 4-С</div>
              <div>Утверждена постановлением Госкомстата России от 28.11.97 № 78</div>
              <table className="pl-mini">
                <tbody>
                  <tr>
                    <td>Форма по ОКУД</td>
                    <td><strong>0345004</strong></td>
                  </tr>
                  <tr>
                    <td>по ОКПО</td>
                    <td>&nbsp;</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <table className="pl-grid pl-grid--4c-info">
          <colgroup>
            <col className="pl-col-label" />
            <col className="pl-col-value" />
            <col className="pl-col-value" />
            <col className="pl-col-value" />
            <col className="pl-col-value" />
            <col className="pl-col-value" />
            <col className="pl-col-label" />
            <col className="pl-col-field" />
            <col className="pl-col-label" />
            <col className="pl-col-field" />
          </colgroup>
          <tbody>
            <tr>
              <td className="pl-label">Организация</td>
              <td colSpan={5}><Val wide /></td>
              <td className="pl-label">Колонна</td>
              <td><Val /></td>
              <td className="pl-label">Бригада</td>
              <td><Val /></td>
            </tr>
            <tr>
              <td className="pl-label">Марка автомобиля</td>
              <td colSpan={3}><Val wide>{d.маркаМодель}</Val></td>
              <td className="pl-label">Гос.&nbsp;номерной&nbsp;знак</td>
              <td><Val /></td>
              <td className="pl-label">Гаражный №</td>
              <td><Val /></td>
              <td className="pl-label">Табельный №</td>
              <td><Val /></td>
            </tr>
            <tr>
              <td className="pl-label">Водитель</td>
              <td colSpan={5}><Val wide>{d.водитель}</Val></td>
              <td className="pl-label">Удостоверение №</td>
              <td><Val /></td>
              <td className="pl-label">Класс</td>
              <td><Val /></td>
            </tr>
          </tbody>
        </table>

        <div className="pl-form__section-title">Работа водителя и автомобиля</div>
        <table className="pl-grid pl-grid--4c-work">
          <thead>
            <tr>
              <th>операция</th>
              <th>число</th>
              <th>месяц</th>
              <th>ч.</th>
              <th>мин.</th>
              <th>нулевой пробег, км</th>
              <th>показание спидометра, км</th>
              <th>время фактическое</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>выезд из гаража</td>
              <td><Val>{d.день}</Val></td>
              <td><Val>{d.месяц}</Val></td>
              <td><Val>{d.выпускЧ}</Val></td>
              <td><Val>{d.выпускМин}</Val></td>
              <td />
              <td><Val>{d.одометрВыезд}</Val></td>
              <td><Val>{d.выпускЧ}</Val>:<Val>{d.выпускМин}</Val></td>
            </tr>
            <tr>
              <td>возвращение в гараж</td>
              <td><Val>{d.день}</Val></td>
              <td><Val>{d.месяц}</Val></td>
              <td><Val>{d.возвратЧ}</Val></td>
              <td><Val>{d.возвратМин}</Val></td>
              <td />
              <td><Val>{d.одометрВозврат}</Val></td>
              <td><Val>{d.возвратЧ}</Val>:<Val>{d.возвратМин}</Val></td>
            </tr>
          </tbody>
        </table>

        <div className="pl-form__section-title">Движение горючего</div>
        <table className="pl-grid pl-grid--4c-fuel">
          <thead>
            <tr>
              <th>горючее</th>
              <th>выдано, л</th>
              <th>остаток при выезде, л</th>
              <th>остаток при возвращении, л</th>
              <th>сдано, л</th>
              <th>коэфф. изменения нормы</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><Val>{d.топливо}</Val></td>
              <td><Val /></td>
              <td><Val>{d.остатокВыезд}</Val></td>
              <td><Val>{d.остатокВозврат}</Val></td>
              <td />
              <td />
            </tr>
          </tbody>
        </table>

        <table className="pl-grid pl-grid--4c-trailers">
          <tbody>
            <tr>
              <td className="pl-label">Прицеп 1</td>
              <td><Val>{d.прицеп ? 'да' : 'нет'}</Val></td>
              <td className="pl-label">Прицеп 2–4</td>
              <td colSpan={3} />
            </tr>
          </tbody>
        </table>

        <div className="pl-form__section-title">Задание водителю (сдельная перевозка)</div>
        <table className="pl-grid pl-grid--4c-task">
          <thead>
            <tr>
              <th>в чьём распоряжении</th>
              <th>адрес погрузки</th>
              <th>адрес разгрузки</th>
              <th>расстояние, км</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><Val wide>{d.адресСтоянки}</Val></td>
              <td><Val wide>{d.адресСтоянки}</Val></td>
              <td><Val wide>{d.адресСтоянки}</Val></td>
              <td><Val>{d.пробег}</Val></td>
            </tr>
          </tbody>
        </table>

        <div className="pl-form__sign-row">
          <span>Механик: выезд разрешён</span>
          <span>Водитель: автомобиль принял</span>
          <span>Диспетчер</span>
          <span>М.П.</span>
        </div>
      </div>

      <div className="pdf-sheet pdf-sheet--landscape pl-form pl-form--4c" data-orientation="landscape">
        <div className="pl-form__back-title">Оборотная сторона формы № 4-С</div>
        <table className="pl-grid pl-grid--4c-back">
          <thead>
            <tr>
              <th rowSpan={2}>№ ездки</th>
              <th colSpan={2}>пункт погрузки / разгрузки</th>
              <th colSpan={4}>время</th>
              <th rowSpan={2}>пробег, км</th>
            </tr>
            <tr>
              <th>отправления</th>
              <th>назначения</th>
              <th>прибытие ч.</th>
              <th>мин.</th>
              <th>убытие ч.</th>
              <th>мин.</th>
            </tr>
          </thead>
          <tbody>
            {d.пробегПоДням.map((km, idx) => (
              <tr key={idx}>
                <td>{idx + 1}</td>
                <td><Val wide>{d.адресСтоянки}</Val></td>
                <td><Val wide>{d.адресСтоянки}</Val></td>
                <td>{idx === 0 ? <Val>{d.выпускЧ}</Val> : null}</td>
                <td>{idx === 0 ? <Val>{d.выпускМин}</Val> : null}</td>
                <td>{idx === d.пробегПоДням.length - 1 ? <Val>{d.возвратЧ}</Val> : null}</td>
                <td>{idx === d.пробегПоДням.length - 1 ? <Val>{d.возвратМин}</Val> : null}</td>
                <td><Val>{km}</Val></td>
              </tr>
            ))}
            {Array.from({ length: Math.max(0, 5 - d.пробегПоДням.length) }, (_, i) => (
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
              </tr>
            ))}
          </tbody>
        </table>

        <div className="pl-form__section-title">Результаты работы автомобиля и прицепов</div>
        <table className="pl-grid pl-grid--4c-results">
          <thead>
            <tr>
              <th colSpan={2}>расход горючего, л</th>
              <th colSpan={2}>время в наряде, ч. мин.</th>
              <th colSpan={2}>пробег, км</th>
            </tr>
            <tr>
              <th>по норме</th>
              <th>фактически</th>
              <th>всего</th>
              <th>автомобиля</th>
              <th>общий</th>
              <th>с грузом</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><Val>{d.расходНорма}</Val></td>
              <td><Val>{d.расходФакт}</Val></td>
              <td><Val>{d.времяНарядЧ}</Val>:<Val>{d.времяНарядМин}</Val></td>
              <td><Val>{d.времяНарядЧ}</Val>:<Val>{d.времяНарядМин}</Val></td>
              <td><Val>{d.пробег}</Val></td>
              <td><Val>{d.прицеп ? d.пробег : ''}</Val></td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
