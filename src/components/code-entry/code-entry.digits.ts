// The digits of the Code entry (contract: ir/contracts/code-entry.json). A box accepts a Latin digit or a digit of the
// locale, for example 4 or ٤. It does not accept a letter or a sign. The app gets the code in Latin digits (code-entry/digits).

/** A decimal digit of a script: the Unicode category Nd. */
const DIGIT = /^\p{Nd}$/u

/** The Latin digit of one character, for example "4" for "٤" or "４". A letter or a sign gives an empty string. */
export function latinDigit(char: string): string {
  if (!DIGIT.test(char)) return ''
  const code = char.codePointAt(0) as number
  // Unicode puts the ten digits of each script in a row, from 0 to 9. Find the zero of the row.
  let zero = code
  while (DIGIT.test(String.fromCodePoint(zero - 1))) zero -= 1
  return String((code - zero) % 10)
}

/** The Latin digits of a text. The characters that are not digits go away, for example a space or a hyphen. */
export const latinDigits = (text: string): string => Array.from(text, latinDigit).join('')
