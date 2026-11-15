// The initials of a name (avatar/initials): the first letter of the first word and of the last word, as capitals.

/** The graphemes of a word. A letter with its marks, for example "É", is one grapheme. */
const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
/** A letter or a digit. The first one of a word is its initial. */
const LETTER = /[\p{L}\p{N}]/u

/** The first letter of a word, as a capital. A word with no letter and no digit gives an empty string. */
function initial(word: string): string {
  for (const { segment } of graphemes.segment(word)) if (LETTER.test(segment)) return segment.toLocaleUpperCase()
  return ''
}

/**
 * The initials of a name: one or two capital letters (avatar/initials). "Ama Mensah" gives "AM", "Kwame Nkrumah Mensah"
 * gives "KM", and "Ama" gives "A". The initials keep the sequence of the letters in the name. Thus a script from right to
 * left keeps its direction (avatar/initials-direction).
 */
export function initials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/u)
    .map(initial)
    .filter((letter) => letter !== '')
  if (letters.length === 0) return ''
  return letters.length === 1 ? (letters[0] as string) : `${letters[0]}${letters[letters.length - 1]}`
}
