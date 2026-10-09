import { describe, it, expect } from 'vitest';
import { parseDecimal } from './DecimalInput';

describe('parseDecimal', () => {
  it('accepts comma and dot as decimal separator', () => {
    expect(parseDecimal('12,5')).toBe(12.5);
    expect(parseDecimal('12.5')).toBe(12.5);
    expect(parseDecimal(' 1 250,75 ')).toBe(1250.75);
    expect(parseDecimal('70')).toBe(70);
  });
  it('returns empty for empty or partial input', () => {
    expect(parseDecimal('')).toBe('');
    expect(parseDecimal(',')).toBe('');
    expect(parseDecimal('12,')).toBe(12);
  });
});
