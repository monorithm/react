// The field types of the Text field (contract: ir/contracts/text-field.json). A type tells the platform the type of the
// value (text-field/input-type): the keyboard (inputMode), the action of the enter key (enterKeyHint), the autofill value
// (autoComplete), and the capitals (autoCapitalize). The type changes only the keyboard: the HTML type is text, tel,
// search, or password, and it adds no check of the value. The system examines the value (text-field/server-check).
import type { HTMLAttributes, InputHTMLAttributes } from 'react'

/** The types of the contract. "text" is the default. */
export type FieldType =
  | 'text'
  | 'email'
  | 'phone'
  | 'code'
  | 'password'
  | 'new-password'
  | 'username'
  | 'amount'
  | 'search'
  | 'message'

export type InputMode = HTMLAttributes<HTMLInputElement>['inputMode']
export type EnterKeyHint = HTMLAttributes<HTMLInputElement>['enterKeyHint']
export type AutoComplete = InputHTMLAttributes<HTMLInputElement>['autoComplete']
export type AutoCapitalize = 'none' | 'sentences' | 'words' | 'characters'

export interface FieldTypeSpec {
  /** The HTML type of the input. It adds no check of the value. */
  html: 'text' | 'tel' | 'search' | 'password'
  /** The keys of the on-screen keyboard. */
  inputMode?: InputMode
  /** The action on the enter key of the on-screen keyboard. */
  enterKeyHint?: EnterKeyHint
  /** The autofill value. A field of user data never stops autofill (text-field/paste). */
  autoComplete?: AutoComplete
  autoCapitalize?: AutoCapitalize
  /** No spelling check and no autocorrect: an address, a name of an account, a password, a number, or a code. */
  plain?: boolean
  /** The value keeps the left-to-right order in a right-to-left layout: digits, numbers, and codes (text-field/direction-end). */
  ltr?: boolean
}

/** The table of the types (text-field/keyboards, text-field/keyboards-2, text-field/autofill). */
export const fieldTypes: Record<FieldType, FieldTypeSpec> = {
  // A name, a description, or a different text: the keyboard and the enter key of the platform.
  text: { html: 'text' },
  // Email: letters with the at sign and the period, and Next.
  email: { html: 'text', inputMode: 'email', enterKeyHint: 'next', autoComplete: 'email', autoCapitalize: 'none', plain: true },
  // Phone number: a number pad with a plus key, and Next. The autofill gives the national number.
  phone: { html: 'tel', inputMode: 'tel', enterKeyHint: 'next', autoComplete: 'tel-national', plain: true, ltr: true },
  // Code: a number pad, and Done. The autofill gives the one-time code.
  code: { html: 'text', inputMode: 'numeric', enterKeyHint: 'done', autoComplete: 'one-time-code', plain: true, ltr: true },
  // Password: letters, and Go. The autofill gives the password of the sign-in.
  password: { html: 'password', inputMode: 'text', enterKeyHint: 'go', autoComplete: 'current-password', autoCapitalize: 'none', plain: true },
  // A new password: letters, and Go. The autofill gives a new password.
  'new-password': { html: 'password', inputMode: 'text', enterKeyHint: 'go', autoComplete: 'new-password', autoCapitalize: 'none', plain: true },
  // The user name on a sign-in form: letters, and Next.
  username: { html: 'text', inputMode: 'text', enterKeyHint: 'next', autoComplete: 'username', autoCapitalize: 'none', plain: true },
  // Amount: a number pad with a decimal key, and Done.
  amount: { html: 'text', inputMode: 'decimal', enterKeyHint: 'done', autoComplete: 'transaction-amount', plain: true, ltr: true },
  // Search: letters, and Search.
  search: { html: 'search', inputMode: 'search', enterKeyHint: 'search' },
  // Message: letters with a capital at the start of a sentence, and Send.
  message: { html: 'text', inputMode: 'text', enterKeyHint: 'send', autoCapitalize: 'sentences' },
}
