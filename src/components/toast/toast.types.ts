// The types of the Toast (contract: ir/contracts/toast.json): the tones, the options of one toast, and the functions of
// useToast().

/** The tone of a toast: the variants of the contract. Each tone has its icon and its moment (toast/icon, toast/moment). */
export type ToastTone = 'info' | 'success' | 'warning' | 'danger'

/** A tone, or loading: a task that continues. Change a loading toast to its result with update (toast/loading-result). */
export type ToastKind = ToastTone | 'loading'

/** The one action of a toast: a small outline button at the end side (toast/action). */
export interface ToastAction {
  /** The label: a verb, for example "Undo" or "Retry" (toast/action). */
  label: string
  /** Called at the press. Then the toast closes (toast/action-press). */
  onPress: () => void
  /** A disabled action has the disabled opacity. Tell the cause in the text of the toast (toast/disabled). */
  disabled?: boolean
}

export interface ToastOptions {
  /**
   * The tone of the result. info: new content, for example a new order. success: the result of an action of the user.
   * warning: a condition that the user must see. danger: an action that did not complete. loading: a task that continues.
   */
  tone: ToastKind
  /**
   * The result, for example "Product hidden" or "Changes not saved". It is never only the word Error (toast/title). For a
   * loading toast: the activity, for example "Uploading 3 photos" (toast/loading).
   */
  title: string
  /** One line of detail below the title, for example the name of the product. */
  text?: string
  /** One action or no action. A toast with an action stays until the user does the action or closes it (toast/time). */
  action?: ToastAction
}

/** The functions of useToast(). */
export interface ToastApi {
  /**
   * Shows a toast, or puts it in the queue when three toasts show (toast/queue-full). Returns the id of the toast. If the
   * same toast shows or waits, it returns the id of that toast and adds no toast (toast/no-repeat).
   */
  add: (options: ToastOptions) => string
  /** Changes a toast in its position, for example a loading toast to its result (toast/loading-result). */
  update: (id: string, changes: Partial<ToastOptions>) => void
  /** Closes the toast, or removes it from the queue. With no id, it closes all the toasts and empties the queue. */
  close: (id?: string) => void
}

/** The data of a toast in the Base UI toast manager. */
export interface ToastData {
  action?: ToastAction | undefined
}
