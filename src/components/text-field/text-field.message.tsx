// The message of a field (contract: ir/contracts/text-field.json): the help text, the warning, or the error, below the
// box. Base UI makes each one the description of the input: assistive technology reads it as a part of the input
// (text-field/help, text-field/error-link). The Select and the Code entry can use these parts in a Base UI Field.
import { Field } from '@base-ui/react/field'
import type { ReactNode } from 'react'
import { fieldError, fieldHelp, fieldMessageIcon, fieldWarning } from './text-field.variants'

/** The icon of the error: a circle with an exclamation mark. Assistive technology does not read it. */
export function ErrorIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm-.75 3.5h1.5v5h-1.5v-5Zm0 6.25h1.5v1.5h-1.5v-1.5Z" />
    </svg>
  )
}

/** The icon of the warning: a triangle with an exclamation mark. Assistive technology does not read it. */
export function WarningIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M7.13 1.98a1 1 0 0 1 1.74 0l6.3 11.03a1 1 0 0 1-.87 1.49H1.7a1 1 0 0 1-.87-1.49l6.3-11.03ZM7.25 6v4h1.5V6h-1.5Zm0 5.25v1.5h1.5v-1.5h-1.5Z"
      />
    </svg>
  )
}

/** The help text: one line below the box, and the description of the input (text-field/help). */
export function FieldHelp({ children }: { children: ReactNode }) {
  return (
    <Field.Description data-part="help" className={fieldHelp}>
      {children}
    </Field.Description>
  )
}

/**
 * The warning: it replaces the help text, with the warning icon. It is the description of the input, and the value stays
 * valid (text-field/warning-sign).
 */
export function FieldWarning({ children }: { children: ReactNode }) {
  return (
    <Field.Description data-part="warning" className={fieldWarning}>
      <span data-part="warning-icon" className={fieldMessageIcon}>
        <WarningIcon />
      </span>
      <span>{children}</span>
    </Field.Description>
  )
}

/**
 * The error: it replaces the help text, with the error icon before the text (text-field/error-sign). It is the
 * description of the input. Render it only when the error shows: the component sets the time (text-field/error-timing).
 */
export function FieldError({ children }: { children: ReactNode }) {
  return (
    <Field.Error match data-part="error" className={fieldError}>
      <span data-part="error-icon" className={fieldMessageIcon}>
        <ErrorIcon />
      </span>
      <span>{children}</span>
    </Field.Error>
  )
}
