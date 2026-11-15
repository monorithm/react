// One toast (contract: ir/contracts/toast.json): the container, the disc with the icon, the title, the text, the action,
// and the close button. Base UI gives the parts and their behavior. The Button gives the action and the Icon button gives
// the close button: they bring their behavior, their accessibility, and their moment press (toast/button-moment).
import { Toast as Base, type ToastObject } from '@base-ui/react/toast'
import { useCallback, useId, useLayoutEffect, useRef } from 'react'
import { Button } from '../button/button'
import { IconButton } from '../icon-button/icon-button'
import { ToastCloseIcon, ToastSpinner, toneIcons } from './toast.icons'
import type { ToastQueue } from './toast.queue'
import type { ToastData, ToastKind, ToastTone } from './toast.types'
import {
  toastClose,
  toastContainer,
  toastContent,
  toastDisc,
  toastDiscTones,
  toastText,
  toastTextLine,
  toastTitle,
} from './toast.variants'
import { cx } from '@monorithm/react/lib/cx'
import { useMoment } from '@monorithm/react/hooks/use-moment'
import type { Moment } from '@monorithm/react/lib/moments'

/** toast/moment: the moment of each tone. */
const MOMENTS: Record<ToastTone, Moment> = { info: 'notify', success: 'success', warning: 'warning', danger: 'error' }

interface ToastItemProps {
  toast: ToastObject<ToastData>
  queue: ToastQueue
  closeLabel: string
}

export function ToastItem({ toast, queue, closeLabel }: ToastItemProps) {
  const kind = (toast.type ?? 'info') as ToastKind
  const action = toast.data?.action
  const danger = kind === 'danger'
  const emit = useMoment('toast')
  const textId = useId()

  // toast/moment, toast/moment-loading, toast/moment-queue: the moment of the tone comes at the first frame of the
  // entrance, or of the change from loading to a result. A loading toast emits no moment. The toast emits no open moment
  // and no close moment (toast/no-open-close). The ref keeps the last kind, thus a second run of the effect emits nothing.
  const last = useRef<ToastKind | undefined>(undefined)
  useLayoutEffect(() => {
    const before = last.current
    last.current = kind
    if (kind !== 'loading' && (before === undefined || before === 'loading')) emit(MOMENTS[kind])
  }, [kind, emit])

  const register = useCallback((element: HTMLDivElement | null) => queue.setElement(toast.id, element), [queue, toast.id])
  const Icon = kind === 'loading' ? ToastSpinner : toneIcons[kind]
  // toast/close: a toast that stays until the user closes it has a close button. A loading toast also has one.
  const closable = danger || kind === 'loading' || action !== undefined

  return (
    <Base.Root
      toast={toast}
      ref={register}
      data-mono="toast"
      data-part="container"
      // toast/role: each toast is a status message, and a danger toast is an alert. The announcer of the provider speaks
      // the status message, thus the container is not a live region (toast/announce). The alert is assertive: it speaks
      // immediately (toast/announce-danger).
      role={danger ? 'alert' : 'status'}
      aria-live={danger ? undefined : 'off'}
      aria-modal={undefined}
      // toast/keyboard: only the action and the close button are in the focus order.
      tabIndex={-1}
      // The contract has no swipe. A toast closes at the end of its timer or at a press on its buttons.
      swipeDirection={[]}
      className={toastContainer}
    >
      <Base.Content className={toastContent}>
        <span aria-hidden="true" data-part="disc" className={cx(toastDisc, toastDiscTones[kind])}>
          <Icon />
        </span>
        <div className={toastText}>
          <Base.Title render={<div />} data-part="title" className={toastTitle} />
          {toast.description ? <Base.Description render={<div />} id={textId} data-part="text" className={toastTextLine} /> : null}
        </div>
        {action ? (
          <Base.Action
            // toast/action-press: a press starts the action and closes the toast. The Button emits press first.
            onClick={() => {
              action.onPress()
              queue.close(toast.id)
            }}
            render={(props) => (
              <Button
                ref={props.ref}
                variant="outline"
                size="sm"
                onClick={props.onClick}
                disabled={action.disabled}
                // toast/disabled: the text of the toast tells why the action is not possible.
                aria-describedby={action.disabled && toast.description ? textId : undefined}
              >
                {props.children}
              </Button>
            )}
          >
            {action.label}
          </Base.Action>
        ) : null}
        {closable ? (
          <Base.Close
            // toast/close-press: a press closes the toast. On a loading toast, the task continues.
            render={(props) => (
              <IconButton
                ref={props.ref}
                variant="ghost"
                size="sm"
                // toast/close-name: the name tells the action. The icon is not the name.
                label={closeLabel}
                icon={<ToastCloseIcon />}
                onClick={props.onClick}
                className={toastClose}
              />
            )}
          />
        ) : null}
      </Base.Content>
    </Base.Root>
  )
}
