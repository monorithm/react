// The queue of the toasts (contract: ir/contracts/toast.json). Base UI shows the toasts and runs their timers. The queue
// decides which toasts show: a maximum of three at the same time, in the sequence in which they come (toast/queue-max,
// toast/queue-full, toast/queue-order). It also sends the focus back to the cause of a toast (toast/focus-return).
import type { ToastManagerAddOptions, ToastManagerUpdateOptions } from '@base-ui/react/toast'
import type { ToastData, ToastOptions } from './toast.types'

/** toast/queue-max: a maximum of three toasts show at the same time. */
export const LIMIT = 3

/** The functions of the Base UI toast manager that the queue uses. */
export interface ToastManagerLike {
  add: (options: ToastManagerAddOptions<ToastData>) => string
  update: (id: string, options: ToastManagerUpdateOptions<ToastData>) => void
  close: (id?: string) => void
}

interface Entry {
  id: string
  options: ToastOptions
  /** The control that had the focus when the toast came: the cause of the toast (toast/focus-return). */
  cause: HTMLElement | null
}

/** A toast that stays until the user closes it: a danger toast, a toast with an action, or a loading toast. */
export const stays = (o: ToastOptions): boolean => o.tone === 'loading' || o.tone === 'danger' || o.action !== undefined

/** Two toasts are the same when they have the same tone, title, and text (toast/no-repeat). */
const same = (a: ToastOptions, b: ToastOptions): boolean => a.tone === b.tone && a.title === b.title && a.text === b.text

export class ToastQueue {
  private manager: ToastManagerLike | null = null
  /** The toasts on the screen, the oldest first. A toast that goes out is not in the list. */
  private shown: Entry[] = []
  /** The toasts that wait, the first that came first (toast/queue-order). */
  private waiting: Entry[] = []
  private elements = new Map<string, HTMLElement>()
  private count = 0
  /** True after the provider added its default toasts. */
  seeded = false

  constructor(private readonly prefix: string) {}

  /** Connects the queue to the Base UI toast manager of the provider. */
  connect(manager: ToastManagerLike): void {
    this.manager = manager
  }

  /** Keeps the container element of a toast. Thus the queue knows if the focus is in the toast. */
  setElement = (id: string, element: HTMLElement | null): void => {
    if (element) this.elements.set(id, element)
    else this.elements.delete(id)
  }

  add = (options: ToastOptions): string => {
    // toast/no-repeat: a toast that is the same as a toast on the screen or in the queue does not show again. Two loading
    // toasts can be the same: each one has its task, and the task changes its toast to its result.
    if (options.tone !== 'loading') {
      const twin = [...this.shown, ...this.waiting].find((e) => same(e.options, options))
      if (twin) return twin.id
    }
    this.count += 1
    const entry: Entry = { id: `${this.prefix}toast-${this.count}`, options, cause: this.causeOf() }
    this.waiting.push(entry)
    if (this.shown.length >= LIMIT) {
      // toast/queue-full: the oldest toast that closes after a time goes out. If no toast closes after a time, the new
      // toast waits. The close of the old toast shows the first toast of the queue.
      const old = this.shown.find((e) => !stays(e.options))
      if (old) this.manager?.close(old.id)
    }
    this.pump()
    return entry.id
  }

  update = (id: string, changes: Partial<ToastOptions>): void => {
    const entry = this.shown.find((e) => e.id === id) ?? this.waiting.find((e) => e.id === id)
    // toast/close-press: after the user closes a loading toast, the result of its task does not show.
    if (!entry) return
    entry.options = { ...entry.options, ...changes }
    // toast/loading-result: the toast changes in its position. Base UI starts the timer of the result.
    if (this.shown.includes(entry)) this.manager?.update(id, this.toBase(entry))
  }

  close = (id?: string): void => {
    if (id === undefined) {
      this.waiting = []
      for (const e of [...this.shown]) this.manager?.close(e.id)
      return
    }
    const index = this.waiting.findIndex((e) => e.id === id)
    if (index >= 0) {
      this.waiting.splice(index, 1)
      return
    }
    if (this.shown.some((e) => e.id === id)) this.manager?.close(id)
  }

  /** Base UI calls it when a toast closes: at the end of its timer, at a press on its buttons, or at Escape. */
  private handleClose(id: string): void {
    const index = this.shown.findIndex((e) => e.id === id)
    if (index < 0) return
    const [entry] = this.shown.splice(index, 1)
    if (entry) this.returnFocus(entry)
    // toast/queue-order: the first toast of the queue shows when a different toast closes.
    this.pump()
  }

  private pump(): void {
    while (this.shown.length < LIMIT) {
      const next = this.waiting.shift()
      if (!next) return
      this.shown.push(next)
      // toast/moment-queue: the toast goes to Base UI only now. Thus its moment and its message come when it shows.
      this.manager?.add({ id: next.id, ...this.toBase(next), onClose: () => this.handleClose(next.id) })
    }
  }

  private toBase(entry: Entry): ToastManagerUpdateOptions<ToastData> {
    const o = entry.options
    return {
      type: o.tone,
      title: o.title,
      description: o.text,
      // toast/time and toast/time-danger: a toast that stays has no timer. The others get the timer of the provider
      // (duration.toast). Base UI gives no timer to a loading toast (toast/loading). On the server, no toast has a timer.
      timeout: stays(o) || typeof document === 'undefined' ? 0 : undefined,
      data: { action: o.action },
    }
  }

  /** The control that has the focus. A toast that comes from a button in a different toast takes the cause of that toast. */
  private causeOf(): HTMLElement | null {
    if (typeof document === 'undefined') return null
    const active = document.activeElement as HTMLElement | null
    if (!active || active === document.body) return null
    for (const [id, element] of this.elements) {
      if (element.contains(active)) return this.shown.find((e) => e.id === id)?.cause ?? null
    }
    return active
  }

  /**
   * toast/focus-return: when a toast closes while it has the focus, the focus goes back to its cause. If the cause is not
   * on the screen, the focus goes to the start of the page content: the main element.
   */
  private returnFocus(entry: Entry): void {
    const element = this.elements.get(entry.id)
    const doc = element?.ownerDocument
    if (!element || !doc || !element.contains(doc.activeElement)) return
    const cause = entry.cause
    if (cause?.isConnected && !cause.closest('[hidden],[inert]')) {
      cause.focus()
      if (doc.activeElement === cause) return
    }
    const main = doc.querySelector<HTMLElement>('main')
    if (main) {
      if (!main.hasAttribute('tabindex')) main.tabIndex = -1
      main.focus()
      return
    }
    ;(doc.activeElement as HTMLElement | null)?.blur()
  }
}
