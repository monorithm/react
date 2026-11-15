// The Toast of the language (contract: ir/contracts/toast.json). The ToastProvider holds the queue, the region of the
// toasts, and the announcer. useToast() (toast.hook.ts) gives the functions that add, update, and close a toast. Base UI
// gives the behavior and the accessibility: the timers, the pause, and the parts. The tokens and the geometry of the
// contract give the look (toast.variants.ts, components.css).
import { Toast as Base } from '@base-ui/react/toast'
import { type ReactNode, useId, useMemo, useState } from 'react'
import { ToastContext } from './toast.context'
import { LIMIT, ToastQueue } from './toast.queue'
import type { ToastApi, ToastData, ToastOptions } from './toast.types'
import { ToastViewport } from './toast.viewport'
import { tokens } from '@monorithm/react/tokens/values'

/** toast/time: a toast with no action closes after duration.toast. */
const TIME = tokens['duration.toast'].value.value

const actionAvailable = (label: string) => `${label} is available`

export interface ToastProviderProps {
  children?: ReactNode
  /** The accessible name of the area of the toasts. The default is "Notifications" (toast/role). */
  label?: string
  /** The accessible name of the close button. The default is "Close" (toast/close-name). */
  closeLabel?: string
  /**
   * The sentence that tells the action in the message for the screen reader. The default gives "Undo is available"
   * (toast/announce-action). Give a different sentence for a different language.
   */
  describeAction?: (label: string) => string
  /** The toasts that show at the first render, for example a result that the server sends with the page. */
  defaultToasts?: ToastOptions[]
  /** Classes for the region of the toasts. */
  className?: string
}

/**
 * Holds the toasts of the app. Put it at the root of the app, so that the region is fixed to the window: at the bottom
 * right corner on the web, and above the tab bar in a narrow window (toast/position).
 */
export function ToastProvider({ children, label = 'Notifications', closeLabel = 'Close', describeAction = actionAvailable, defaultToasts, className }: ToastProviderProps) {
  return (
    <Base.Provider timeout={TIME} limit={LIMIT}>
      <ToastHost label={label} closeLabel={closeLabel} describeAction={describeAction} defaultToasts={defaultToasts} className={className}>
        {children}
      </ToastHost>
    </Base.Provider>
  )
}

interface ToastHostProps extends Required<Pick<ToastProviderProps, 'label' | 'closeLabel' | 'describeAction'>> {
  children?: ReactNode
  defaultToasts?: ToastOptions[] | undefined
  className?: string | undefined
}

function ToastHost({ children, label, closeLabel, describeAction, defaultToasts, className }: ToastHostProps) {
  const manager = Base.useToastManager<ToastData>()
  const prefix = useId()
  const [queue] = useState(() => new ToastQueue(prefix))
  // The functions of the Base UI manager stay the same between renders.
  queue.connect(manager)
  // The default toasts go into the queue before the region renders. Thus the first render, also on the server, has them.
  if (!queue.seeded) {
    queue.seeded = true
    for (const options of defaultToasts ?? []) queue.add(options)
  }
  const api = useMemo<ToastApi>(() => ({ add: queue.add, update: queue.update, close: queue.close }), [queue])
  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport queue={queue} label={label} closeLabel={closeLabel} describeAction={describeAction} className={className} />
    </ToastContext.Provider>
  )
}
