// The content of the Dialog (contract: ir/contracts/dialog.json): the handle, the title, the text, and the footer with
// the two actions. The content is the same in each form and on each device class (dialog/surfaces). Only the container,
// the place, and the input change (dialog.variants.ts).
import { type ReactNode, type Ref, useId } from 'react'
import { Button } from '../button/button'
import {
  confirmVariants,
  dialogActionPhone,
  dialogDescription,
  dialogFooter,
  dialogHandle,
  dialogText,
  dialogTitle,
  type DialogVariant,
} from './dialog.variants'

export interface DialogContentProps {
  variant: DialogVariant
  title: ReactNode
  description: ReactNode
  confirmLabel: ReactNode
  cancelLabel: ReactNode
  confirmDisabled?: boolean
  confirmDisabledReason?: ReactNode
  /** The id of the title: the name of the dialog (dialog/role). */
  titleId: string
  /** The id of the text: the description of the dialog (dialog/description). */
  descriptionId: string
  /** The safe action closes the dialog with no change (dialog/safe-action). */
  onCancel: () => void
  /** The confirm action starts the action and closes the dialog (dialog/confirm-action). */
  onConfirm: () => void
  /** The safe action: it gets the focus at the open (dialog/initial-focus). */
  safeRef?: Ref<HTMLButtonElement>
}

export function DialogContent(props: DialogContentProps) {
  const { variant, title, description, confirmLabel, cancelLabel, confirmDisabled, confirmDisabledReason } = props
  const reasonId = useId()
  const reason = confirmDisabled && confirmDisabledReason ? reasonId : undefined
  return (
    <>
      {/* dialog/phone: the handle of the sheet. It is a sign only, thus assistive technology does not read it. */}
      <div data-part="handle" aria-hidden="true" className={dialogHandle} />
      <div data-part="text" className={dialogText}>
        {/* dialog/title: the title names the action and the item. */}
        <h2 id={props.titleId} data-part="title" className={dialogTitle}>
          {title}
        </h2>
        {/* dialog/description: the text tells the result of the action. */}
        <p id={props.descriptionId} data-part="description" className={dialogDescription}>
          {description}
        </p>
        {/* dialog/disabled: the dialog tells why the confirm action is not possible. */}
        {reason ? (
          <p id={reasonId} data-part="reason" className={dialogDescription}>
            {confirmDisabledReason}
          </p>
        ) : null}
      </div>
      {/* dialog/footer and dialog/footer-phone: the safe action, then the confirm action, in the DOM. */}
      <div data-part="footer" className={dialogFooter}>
        {/* dialog/variant: the safe action is a ghost button. */}
        <Button ref={props.safeRef} variant="ghost" className={dialogActionPhone} onClick={props.onCancel}>
          {cancelLabel}
        </Button>
        {/* dialog/variant: the confirm action is a primary button, or a destructive button for an action that removes data. */}
        <Button
          variant={confirmVariants[variant]}
          className={dialogActionPhone}
          disabled={confirmDisabled}
          aria-describedby={reason}
          onClick={props.onConfirm}
        >
          {confirmLabel}
        </Button>
      </div>
    </>
  )
}
