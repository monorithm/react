// The amount of a Text field of the type "amount" (contract: ir/contracts/text-field.json). The field shows the currency
// of the price. The locale sets the position of the symbol and the decimal sign (text-field/amount). The system stores
// the amount as an integer of the minor unit, with its ISO 4217 currency code (text-field/amount-store).

export interface CurrencyAffix {
  /** The symbol of the currency in the locale, for example "GH₵" or "€". */
  symbol: string
  /** The side of the symbol: before the number (start) or after it (end). */
  side: 'start' | 'end'
  /** The amount zero in the number format of the locale, with no symbol, for example "0.00" or "0,00". */
  sample: string
}

/** The symbol of the currency of the price, its side, and a sample in the number format of the locale. */
export function currencyAffix(currency: string, locale?: string): CurrencyAffix {
  const parts = new Intl.NumberFormat(locale, { style: 'currency', currency }).formatToParts(0)
  const at = (type: Intl.NumberFormatPartTypes) => parts.findIndex((p) => p.type === type)
  return {
    symbol: parts[at('currency')]?.value ?? currency,
    side: at('currency') < at('integer') ? 'start' : 'end',
    sample: parts
      .filter((p) => p.type === 'integer' || p.type === 'decimal' || p.type === 'fraction')
      .map((p) => p.value)
      .join(''),
  }
}

/** The value of a digit of each script, for example 5 for "5", "٥", and "५" (text-field/digits). */
function digitValue(ch: string): number | undefined {
  if (!/\p{Nd}/u.test(ch)) return undefined
  // The digits of a script are a run of ten code points, from zero to nine.
  let start = ch.codePointAt(0) as number
  while (/\p{Nd}/u.test(String.fromCodePoint(start - 1))) start -= 1
  return ((ch.codePointAt(0) as number) - start) % 10
}

export interface StoredAmount {
  /** The integer of the minor unit, for example 2550 for 25.50. */
  minor: number
  /** The ISO 4217 currency code. */
  currency: string
}

/**
 * Converts the text of an amount field to the stored value: the integer of the minor unit and the currency code
 * (text-field/amount-store). It accepts the Latin digits and the digits of the locale (text-field/digits), the group
 * sign, and the decimal sign of the locale. It returns null for a text that is not an amount.
 */
export function parseAmount(text: string, currency: string, locale?: string): StoredAmount | null {
  const format = new Intl.NumberFormat(locale, { style: 'currency', currency })
  const parts = format.formatToParts(1234.5)
  const decimal = parts.find((p) => p.type === 'decimal')?.value ?? '.'
  const group = parts.find((p) => p.type === 'group')?.value
  const digits = format.resolvedOptions().maximumFractionDigits ?? 2
  let plain = ''
  for (const ch of text.trim()) {
    const d = digitValue(ch)
    if (d !== undefined) plain += String(d)
    else if (ch === decimal) plain += '.'
    else if (ch === group || /\s/u.test(ch)) continue
    else return null
  }
  const match = /^(\d+)(?:\.(\d*))?$/.exec(plain)
  if (!match) return null
  const fraction = match[2] ?? ''
  if (fraction.length > digits) return null
  return { minor: Number(match[1]) * 10 ** digits + Number(fraction.padEnd(digits, '0') || '0'), currency }
}
