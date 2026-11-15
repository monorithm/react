// The text parts of the field of the Select (contract: ir/contracts/select.json): the label text, and the help text or
// the error. The list mode and the native mode show the same parts (select/surfaces).
import type { ReactNode } from 'react'
import { SelectErrorIcon } from './select.icons'
import { selectError, selectErrorIcon, selectHelp, selectLabelName, selectOptional } from './select.variants'

/** The text of the label. The label of an optional select ends with the word optional (select/name). */
export function SelectLabelText({ label, optional, optionalLabel }: { label: ReactNode; optional?: boolean; optionalLabel: ReactNode }) {
  return (
    <>
      <span className={selectLabelName}>{label}</span>
      {optional ? (
        <>
          {' '}
          <span data-part="optional" className={selectOptional}>
            {optionalLabel}
          </span>
        </>
      ) : null}
    </>
  )
}

/** The help text, or the error in its place (select/help, select/error). */
export function SelectMessage({ help, error, id }: { help?: ReactNode; error?: ReactNode; id: string }) {
  if (error) {
    return (
      <span id={id} data-part="error" className={selectError}>
        <span aria-hidden="true" className={selectErrorIcon}>
          <SelectErrorIcon />
        </span>
        <span>{error}</span>
      </span>
    )
  }
  if (help) {
    return (
      <span id={id} data-part="help" className={selectHelp}>
        {help}
      </span>
    )
  }
  return null
}
