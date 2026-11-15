// The focus of the Dialog at the close (dialog/return-focus, dialog/lost-origin). At the open, the dialog keeps the
// place of the control that opened it: the tabbable elements before and after the control, and its ancestors. At the
// close, the focus goes back to the control. If the control is not there, the focus goes to the next item. If no next
// item is there, it goes to the previous item, then to the container. The focus never goes to the top of the page.

const TABBABLE = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'summary',
  'iframe',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]',
].join(',')

/** The place of the control that opened the dialog. */
export interface Origin {
  control: HTMLElement
  /** The tabbable elements after the control, the nearest first. */
  after: HTMLElement[]
  /** The tabbable elements before the control, the nearest first. */
  before: HTMLElement[]
  /** The ancestors of the control, the nearest first. The body and the root are not containers. */
  containers: HTMLElement[]
}

/** True for an element that Tab can focus: not disabled, not hidden, not inert, and not a focus guard of Base UI. */
function tabbable(el: HTMLElement): boolean {
  if (!el.isConnected || el.tabIndex < 0 || el.matches(':disabled')) return false
  return !el.closest('[hidden], [inert], [data-base-ui-focus-guard]')
}

/** Keeps the place of the control. The elements in `skip` (the dialog) are not items of the page. */
export function placeOf(control: HTMLElement, skip?: Element | null): Origin {
  const items = [...control.ownerDocument.querySelectorAll<HTMLElement>(TABBABLE)].filter(
    (el) => el !== control && !control.contains(el) && !skip?.contains(el) && tabbable(el),
  )
  const containers: HTMLElement[] = []
  for (let el = control.parentElement; el && el !== el.ownerDocument.body && el !== el.ownerDocument.documentElement; el = el.parentElement) {
    containers.push(el)
  }
  return {
    control,
    after: items.filter((el) => control.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING),
    before: items.filter((el) => control.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING).reverse(),
    containers,
  }
}

/** The element that gets the focus at the close, or null if no element of the page is there. */
export function returnTarget(origin: Origin): HTMLElement | null {
  const { control } = origin
  if (control.isConnected && !control.matches(':disabled') && !control.closest('[hidden], [inert]')) return control
  const item = origin.after.find(tabbable) ?? origin.before.find(tabbable)
  if (item) return item
  const container = origin.containers.find((el) => el.isConnected) ?? null
  // A container that is not focusable gets tabindex -1: a script can focus it, and Tab does not stop on it.
  if (container && !container.hasAttribute('tabindex')) container.setAttribute('tabindex', '-1')
  return container
}

/** Moves the focus to the element. After a close with the keyboard, the element shows the focus ring. */
export function focusTarget(el: HTMLElement | null, keyboard: boolean): void {
  el?.focus({ preventScroll: true, focusVisible: keyboard })
}
