// The Dialog of the language (contract: ir/contracts/dialog.json). It stops the task to confirm an action that the user
// cannot undo. Base UI (the alert dialog) gives the behavior and the accessibility: the modal state, the focus trap, the
// inert page, the scroll lock, and Escape. The tokens and the geometry of the contract give the look (dialog.variants.ts,
// components.css). In a window less than 768 px wide, the same component is a modal bottom sheet, with no drag.
import { AlertDialog } from '@base-ui/react/alert-dialog'
import { type MouseEvent, type ReactElement, type ReactNode, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { DialogContent } from './dialog.content'
import { focusTarget, type Origin, placeOf, returnTarget } from './dialog.focus'
import { dialogContainer, dialogScrim, dialogViewport, type DialogVariant } from './dialog.variants'
import { cx } from '@monorithm/react/lib/cx'
import { useMoment } from '@monorithm/react/hooks/use-moment'

export interface DialogProps {
  /** confirm: the confirm action is a primary button. destructive: an action that removes data (dialog/variant). */
  variant?: DialogVariant
  /** The name of the dialog: the action and the item, for example "Delete this product?" (dialog/title). */
  title: ReactNode
  /** The result of the action, for example "The file goes to the trash." (dialog/description). */
  description: ReactNode
  /** The label of the confirm action: the verb of the title, for example "Delete product". Never "OK" or "Yes" (dialog/action-name). */
  confirmLabel: ReactNode
  /** The label of the safe action: its result, for example "Cancel" or "Keep file" (dialog/safe-action). */
  cancelLabel: ReactNode
  /** Called at the confirm action, before the dialog closes (dialog/confirm-action). */
  onConfirm?: () => void
  /** The control that opens the dialog, for example a Button. With no trigger, use open and onOpenChange. */
  trigger?: ReactElement
  open?: boolean
  defaultOpen?: boolean
  /** Called at the open and at the close, with the new state. */
  onOpenChange?: (open: boolean) => void
  /** Disables the confirm action. Give the cause in confirmDisabledReason (dialog/disabled). */
  confirmDisabled?: boolean
  /** The cause of the disabled confirm action. The dialog shows it below the text. */
  confirmDisabledReason?: ReactNode
  /** Classes for the container. */
  className?: string
}

/** The axes of the place that opened the dialog. The portal is in the body, thus it copies them (theme, density, motion, direction). */
type Axes = { 'data-theme'?: string; 'data-density'?: string; 'data-motion'?: string; dir?: string }

function axesOf(el: Element | null): Axes {
  if (!el) return {}
  const dir = el.closest('[dir]')?.getAttribute('dir')
  return {
    'data-theme': el.closest('[data-theme]')?.getAttribute('data-theme') ?? undefined,
    'data-density': el.closest('[data-density]')?.getAttribute('data-density') ?? undefined,
    'data-motion': el.closest('[data-motion]')?.getAttribute('data-motion') ?? undefined,
    dir: dir === 'rtl' || dir === 'ltr' ? dir : undefined,
  }
}

/**
 * True when the dialog is a bottom sheet: the window is less wide than --mono-dialog-phone-below-width (dialog/phone).
 * The value comes from the geometry on the container.
 */
function isSheet(container: HTMLElement | null): boolean {
  if (!container || typeof window.matchMedia !== 'function') return false
  const below = getComputedStyle(container).getPropertyValue('--mono-dialog-phone-below-width').trim()
  return below !== '' && window.matchMedia(`(width < ${below})`).matches
}

/** The CloseWatcher of the browser: Back on a phone, and Escape (dialog/phone-close). */
interface Watcher {
  onclose: (() => void) | null
  destroy(): void
}
const closeWatcher = (): (new () => Watcher) | undefined => (globalThis as { CloseWatcher?: new () => Watcher }).CloseWatcher

export function Dialog(props: DialogProps) {
  const { variant = 'confirm', title, description, confirmLabel, cancelLabel, onConfirm, trigger, onOpenChange, className } = props
  const emit = useMoment('dialog')
  const [inner, setInner] = useState(props.defaultOpen ?? false)
  const controlled = props.open !== undefined
  const open = props.open ?? inner
  const titleId = useId()
  const descriptionId = useId()
  const [axes, setAxes] = useState<Axes>({})
  const triggerRef = useRef<HTMLButtonElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const safeRef = useRef<HTMLButtonElement>(null)
  const origin = useRef<Origin | null>(null)
  const openRef = useRef(open)
  const unmounted = useRef(false)

  // dialog/moment: the moment open at the first frame of the entrance, the moment close at the first frame of the exit.
  const shown = useRef(false)
  const announce = useCallback(
    (next: boolean) => {
      if (shown.current === next) return
      shown.current = next
      emit(next ? 'open' : 'close')
    },
    [emit],
  )

  const setOpen = useCallback(
    (next: boolean) => {
      if (openRef.current === next) return
      openRef.current = next
      // The moment close comes before the change: the app can remove the dialog in the same render.
      if (!next) announce(false)
      if (!controlled) setInner(next)
      onOpenChange?.(next)
    },
    [announce, controlled, onOpenChange],
  )
  const setOpenRef = useRef(setOpen)

  useLayoutEffect(() => {
    openRef.current = open
    setOpenRef.current = setOpen
    announce(open)
  })

  useLayoutEffect(() => {
    if (!open) return
    // dialog/return-focus and dialog/lost-origin: keep the place of the control that opened the dialog. A press on a
    // button does not focus it in each browser, thus the trigger is the fallback.
    const active = document.activeElement
    const control =
      active instanceof HTMLElement && active !== document.body && !viewportRef.current?.contains(active) ? active : triggerRef.current
    origin.current = control ? placeOf(control, viewportRef.current) : null
    setAxes(axesOf(control))
  }, [open])

  // The flag is a layout effect: React clears it in the commit that removes the dialog, before the focus moves.
  useLayoutEffect(() => {
    unmounted.current = false
    return () => {
      unmounted.current = true
    }
  }, [])

  // dialog/phone-close: Back closes the dialog with no change. The CloseWatcher of the browser gets Back.
  useEffect(() => {
    const Closer = closeWatcher()
    if (!open || !Closer) return
    const watcher = new Closer()
    watcher.onclose = () => setOpenRef.current(false)
    return () => watcher.destroy()
  }, [open])

  // dialog/return-focus and dialog/lost-origin: Base UI calls this function when the dialog leaves the DOM. The focus
  // moves after the commit of React: then the page shows if the control is still there.
  const finalFocus = useCallback((closeType: string) => {
    const place = origin.current
    if (!place) return true
    queueMicrotask(() => {
      if (openRef.current && !unmounted.current) return
      focusTarget(returnTarget(place), closeType === 'keyboard')
    })
    return false
  }, [])

  return (
    <AlertDialog.Root open={open} onOpenChange={(next) => setOpen(next)}>
      {trigger ? <AlertDialog.Trigger ref={triggerRef} render={trigger} /> : null}
      <AlertDialog.Portal {...axes}>
        <AlertDialog.Backdrop data-part="scrim" className={dialogScrim} />
        <AlertDialog.Viewport
          ref={viewportRef}
          data-part="viewport"
          className={dialogViewport}
          onClick={(event: MouseEvent<HTMLDivElement>) => {
            // dialog/phone-close: on the phone form, a tap on the scrim closes the dialog with no change.
            if (event.target === event.currentTarget && isSheet(containerRef.current)) setOpen(false)
          }}
        >
          <AlertDialog.Popup
            ref={containerRef}
            data-mono="dialog"
            data-variant={variant}
            // dialog/role: a modal alert dialog. The title is its name, and the text is its description.
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            // dialog/initial-focus: the focus moves to the safe action, also after a touch.
            initialFocus={safeRef}
            finalFocus={finalFocus}
            className={cx(dialogContainer, className)}
          >
            <DialogContent
              variant={variant}
              title={title}
              description={description}
              confirmLabel={confirmLabel}
              cancelLabel={cancelLabel}
              confirmDisabled={props.confirmDisabled}
              confirmDisabledReason={props.confirmDisabledReason}
              titleId={titleId}
              descriptionId={descriptionId}
              safeRef={safeRef}
              onCancel={() => setOpen(false)}
              onConfirm={() => {
                onConfirm?.()
                setOpen(false)
              }}
            />
          </AlertDialog.Popup>
        </AlertDialog.Viewport>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
