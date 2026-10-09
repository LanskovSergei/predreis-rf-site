import { useEffect, useRef, useState } from 'react';
import type { InputHTMLAttributes } from 'react';

/** «12,5» и «12.5» → 12.5; пусто или некорректно → ''. */
export function parseDecimal(raw: string): number | '' {
  const s = raw.trim().replace(/\s+/g, '').replace(',', '.');
  if (s === '' || s === '.' || s === '-') return '';
  const n = Number(s);
  return Number.isFinite(n) ? n : '';
}

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  value: number | '';
  onChange: (value: number | '') => void;
};

/**
 * Поле для дробных чисел. Нативный <input type="number"> в русской локали
 * ломает ввод с запятой: Chrome превращает «12,5» в «125», другие браузеры —
 * в пустое значение. Здесь принимаем и запятую, и точку, а набранный текст
 * держим локально, чтобы промежуточное «12,» не схлопывалось в «12».
 */
export function DecimalInput({ value, onChange, ...rest }: Props) {
  const [raw, setRaw] = useState(value === '' ? '' : String(value).replace('.', ','));
  const lastEmitted = useRef<number | ''>(value);

  useEffect(() => {
    if (value !== lastEmitted.current) {
      lastEmitted.current = value;
      setRaw(value === '' ? '' : String(value).replace('.', ','));
    }
  }, [value]);

  return (
    <input
      {...rest}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={raw}
      onChange={(e) => {
        const text = e.target.value.replace(/[^\d.,\s]/g, '');
        setRaw(text);
        const parsed = parseDecimal(text);
        lastEmitted.current = parsed;
        onChange(parsed);
      }}
    />
  );
}
