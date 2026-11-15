// The Bottom sheet of the language (contract: ir/contracts/bottom-sheet.json). Base UI Dialog gives the behavior and the
// accessibility of the modal sheet: the dialog role, the focus trap, Escape, the press on the scrim, the scroll lock of
// the page, and the focus return. The Base UI Drawer has a different velocity and a release with a fixed curve, thus
// the drag of the language is in bottom-sheet.drag.ts. The persistent sheet is a region with a name.
// The tokens and the geometry of the contract give the look (bottom-sheet.variants.ts, components.css).
import { Dialog } from '@base-ui/react/dialog'
import {
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type WheelEvent,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { IconButton } from '../icon-button/icon-button'
import { SheetDrag, type SheetHost } from './bottom-sheet.drag'
import { useBackEntry } from './bottom-sheet.history'
import { SheetCloseIcon } from './bottom-sheet.icons'
import { type BottomSheetSnap, type SheetMeasure, snapPoints, stepFrom } from './bottom-sheet.snap'
import { SheetSurface } from './bottom-sheet.surface'
import { sheetBottom, sheetLow, sheetScrim, sheetSide, sheetTitle } from './bottom-sheet.variants'
import { cx } from '@monorithm/react/lib/cx'
import { useMoment } from '@monorithm/react/hooks/use-moment'

export type { BottomSheetSnap } from './bottom-sheet.snap'

/**
 * The container. auto: a window less than 768 px wide shows a bottom sheet; from 768 px, a side sheet (bottom-sheet/web).
 * The value 768 is the geometry --mono-bottom-sheet-web-side-sheet-from.
 */
export type BottomSheetLayout = 'auto' | 'bottom' | 'side'

interface CommonProps {
  /** The name of the sheet, in the header. "Comments" (bottom-sheet/name). */
  title: ReactNode
  /** The number of items, after the title, in the muted text color. */
  count?: ReactNode
  /** The content: a list or a form. It scrolls only at Full (bottom-sheet/scroll-at-full). */
  children?: ReactNode
  /** An input or one primary button at the bottom edge of the screen (bottom-sheet/footer). */
  footer?: ReactNode
  /** The snap point of a controlled sheet. With no value, the sheet opens at Half (bottom-sheet/snap-only). */
  snap?: BottomSheetSnap
  /** Called when a release, a key, the wheel, or an input selects a different snap point. */
  onSnapChange?: (snap: BottomSheetSnap) => void
  layout?: BottomSheetLayout
  /** The name of the handle. The default is "Resize the sheet" (bottom-sheet/handle-role). */
  handleLabel?: string
  id?: string
  className?: string
}

export interface BottomSheetModalProps extends CommonProps {
  /** A short task on top of the screen: comments, filters, or the options of a product (bottom-sheet/use). */
  variant?: 'modal'
  open?: boolean
  defaultOpen?: boolean
  /** Called when the sheet opens or closes. The moments open and close come first (bottom-sheet/moment-open-close). */
  onOpenChange?: (open: boolean) => void
  /**
   * The control that opens the sheet: a button element that accepts the props of the trigger. It tells assistive
   * technology if the sheet is open (bottom-sheet/trigger-state).
   */
  trigger?: ReactElement
  /** The name of the close button. The default is "Close". */
  closeLabel?: string
  /** false: the sheet adds no history entry, thus the Back button does not close it (bottom-sheet/web-back). */
  history?: boolean
  /** The element of the portal. The default is the body. */
  container?: HTMLElement | null
}

export interface BottomSheetPersistentProps extends CommonProps {
  /** A sheet on top of a map or a list of results. It never closes and has no scrim (bottom-sheet/use). */
  variant: 'persistent'
  open?: never
  defaultOpen?: never
  onOpenChange?: never
  trigger?: never
  closeLabel?: never
  history?: never
  container?: never
}

export type BottomSheetProps = BottomSheetModalProps | BottomSheetPersistentProps

/** The value of a geometry property of the contract, from a probe element with the attribute of the component. */
function geometry(name: string): number {
  if (typeof document === 'undefined') return Number.NaN
  const probe = document.createElement('div')
  probe.setAttribute('data-mono', 'bottom-sheet')
  probe.hidden = true
  document.body.append(probe)
  const value = Number.parseFloat(getComputedStyle(probe).getPropertyValue(name))
  probe.remove()
  return value
}

/** bottom-sheet/web: the side layout from the width of the geometry. */
function useSide(layout: BottomSheetLayout): boolean {
  const [wide, setWide] = useState(false)
  useLayoutEffect(() => {
    if (layout !== 'auto' || typeof window.matchMedia !== 'function') return
    const from = geometry('--mono-bottom-sheet-web-side-sheet-from')
    if (!Number.isFinite(from)) return
    const query = window.matchMedia(`(min-width: ${from}px)`)
    const update = () => setWide(query.matches)
    update()
    query.addEventListener?.('change', update)
    return () => query.removeEventListener?.('change', update)
  }, [layout])
  return layout === 'side' || (layout === 'auto' && wide)
}

/** The height of the virtual keyboard: the part of the window that the visual viewport does not show. */
function keyboardInset(): number {
  const vv = typeof window === 'undefined' ? undefined : window.visualViewport
  if (!vv) return 0
  return Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop))
}

type Measure = SheetMeasure & { kb: number }

/** The values that give the snap points, from the layout and from the custom properties of the language. */
function measureOf(sheet: HTMLElement, content: HTMLElement | null): Measure | null {
  const css = getComputedStyle(sheet)
  const num = (name: string) => Number.parseFloat(css.getPropertyValue(name))
  const ratio = num('--mono-ratio-sheet-half')
  const peek = num('--mono-size-sheet-peek')
  const gap = num('--mono-size-sheet-gap')
  if (![ratio, peek, gap].every(Number.isFinite)) return null
  const viewport = window.innerHeight
  const kb = keyboardInset()
  const height = sheet.offsetHeight
  // The sheet is as high as Full less the keyboard. With no layout (a test document), Full is the viewport less the gap.
  const full = height > 0 ? height + kb : viewport - gap
  // bottom-sheet/short-content: the height of the sheet with all its content.
  const natural = height > 0 && content && content.scrollHeight > 0 ? height - content.clientHeight + content.scrollHeight : 0
  return { viewport, full, ratio, peek, natural, kb }
}

const same = (a: Measure | null, b: Measure | null) =>
  a === b || (!!a && !!b && (Object.keys(a) as (keyof Measure)[]).every((k) => Math.abs(a[k] - b[k]) < 0.5))

/** The input types that do not open a keyboard. */
const NO_KEYBOARD = new Set(['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit'])

const opensKeyboard = (el: EventTarget | null): boolean =>
  el instanceof HTMLTextAreaElement ||
  (el instanceof HTMLInputElement && !NO_KEYBOARD.has(el.type)) ||
  (el instanceof HTMLElement && el.isContentEditable)

const reducedMotion = (el: Element | null): boolean =>
  !!el?.closest('[data-motion=reduced]') ||
  (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)

interface SheetOptions {
  variant: 'modal' | 'persistent'
  open: boolean
  layout: 'bottom' | 'side'
  snap?: BottomSheetSnap
  onSnapChange?: (snap: BottomSheetSnap) => void
  /** Closes a modal sheet: the down arrow at Half. */
  close: () => void
  /** A release closes the sheet: the moment close at the release. */
  dragClose: () => void
}

/** The state, the measure, and the drag of one sheet. */
function useSheet(o: SheetOptions) {
  const emit = useMoment('bottom-sheet')
  const sheetRef = useRef<HTMLElement | null>(null)
  const [sheetEl, setSheetEl] = useState<HTMLElement | null>(null)
  const setSheet = useCallback((el: HTMLElement | null) => {
    sheetRef.current = el
    setSheetEl(el)
  }, [])
  const contentRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const scrimRef = useRef<HTMLDivElement>(null)
  const [snapState, setSnapState] = useState<BottomSheetSnap>('half')
  const snap = o.snap ?? snapState
  const [measure, setMeasure] = useState<Measure | null>(null)
  const bottom = o.layout === 'bottom'
  const points = useMemo(() => (measure && bottom ? snapPoints(o.variant, measure) : []), [measure, bottom, o.variant])
  const point = points.find((p) => p.name === snap) ?? points[0]
  const current = point?.name ?? snap
  const kb = bottom ? (measure?.kb ?? 0) : 0

  // The measure: at the mount, at a resize of the window or of the visual viewport (the keyboard), and at a change of
  // the height of the content.
  const atBottom = useRef(false)
  useLayoutEffect(() => {
    if (!sheetEl || !bottom) return
    const read = () => {
      const content = contentRef.current
      if (content) atBottom.current = content.scrollHeight > content.clientHeight && content.scrollTop + content.clientHeight >= content.scrollHeight - 1
      const next = measureOf(sheetEl, content)
      setMeasure((prev) => (same(prev, next) ? prev : next))
    }
    read()
    window.addEventListener('resize', read)
    window.visualViewport?.addEventListener('resize', read)
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(read) : null
    if (innerRef.current) observer?.observe(innerRef.current)
    return () => {
      window.removeEventListener('resize', read)
      window.visualViewport?.removeEventListener('resize', read)
      observer?.disconnect()
    }
  }, [sheetEl, bottom])

  // bottom-sheet/keyboard-order: the content becomes shorter and keeps the latest item in view.
  useLayoutEffect(() => {
    const content = contentRef.current
    if (!content || !kb) return
    const focused = document.activeElement
    if (focused instanceof HTMLElement && content.contains(focused)) focused.scrollIntoView?.({ block: 'nearest' })
    else if (atBottom.current) content.scrollTop = content.scrollHeight
  }, [kb])

  // bottom-sheet/snap-only: the sheet opens at Half.
  const wasOpen = useRef(false)
  useLayoutEffect(() => {
    if (o.open && !wasOpen.current && o.snap === undefined) setSnapState('half')
    wasOpen.current = o.open
  }, [o.open, o.snap])

  // The snap point that the engine or the prop selected last.
  const target = useRef<BottomSheetSnap>(snap)
  const select = (name: BottomSheetSnap) => {
    target.current = name
    if (o.snap === undefined) setSnapState(name)
    if (name !== current) o.onSnapChange?.(name)
  }

  const host: SheetHost = {
    sheet: () => sheetRef.current,
    content: () => contentRef.current,
    points: () => points,
    snap: () => current,
    closable: () => o.variant === 'modal',
    enabled: () => o.open && bottom && points.length > 0,
    reduced: () => reducedMotion(sheetRef.current),
    slop: () => {
      const el = sheetRef.current
      return (el && Number.parseFloat(getComputedStyle(el).getPropertyValue('--mono-bottom-sheet-drag-slop'))) || 0
    },
    paint: (x) => {
      const el = sheetRef.current
      const scrim = scrimRef.current
      if (x === null) {
        el?.style.removeProperty('--sheet-drag')
        el?.removeAttribute('data-moving')
        scrim?.style.removeProperty('opacity')
        scrim?.removeAttribute('data-moving')
        return
      }
      el?.style.setProperty('--sheet-drag', `${x}px`)
      el?.setAttribute('data-moving', '')
      // bottom-sheet/scrim: the opacity follows the position: 0 when closed, the full scrim color at Half and at Full.
      const low = points[0]?.x
      if (scrim && low) {
        scrim.style.opacity = String(Math.min(1, Math.max(0, x / low)))
        scrim.setAttribute('data-moving', '')
      }
    },
    dragStart: () => emit('drag-start'),
    select,
    contact: () => emit('snap'),
    closeStart: o.dragClose,
    closeEnd: o.close,
  }
  const hostRef = useRef(host)
  hostRef.current = host
  const engineRef = useRef<SheetDrag | null>(null)
  if (!engineRef.current) engineRef.current = new SheetDrag(() => hostRef.current)
  const engine = engineRef.current
  useEffect(() => () => engine.reset(), [engine])
  useEffect(() => {
    if (!o.open) engine.reset()
  }, [o.open, engine])

  // A controlled sheet: a new value of the prop moves the sheet from the position of the last render.
  const lastRest = useRef<number | undefined>(undefined)
  useLayoutEffect(() => {
    if (o.snap !== undefined && target.current !== o.snap) {
      target.current = o.snap
      engine.goTo(o.snap, { notify: false, from: lastRest.current })
    }
    lastRest.current = point?.x
  })

  const style = {
    '--sheet-rest': point ? `${point.x}px` : undefined,
    '--sheet-low': points[0] ? `${points[0].x}px` : undefined,
    '--sheet-kb': kb ? `${kb}px` : undefined,
  } as CSSProperties

  return {
    setSheet,
    scrimRef,
    current,
    keyboard: kb > 0,
    style,
    /** bottom-sheet/wheel: at Half, a scroll with a mouse wheel or a trackpad moves the sheet to Full. */
    onWheel: (event: WheelEvent<HTMLElement>) => {
      if (!bottom || event.deltaY <= 0 || current === 'full' || engine.busy || !point) return
      const next = stepFrom(points, point.x, 1)
      if (next) engine.goTo(next.name)
    },
    /** bottom-sheet/input-focus: when an input gets the focus, the sheet goes to Full. */
    onFocus: (event: FocusEvent<HTMLElement>) => {
      if (!bottom || current === 'full' || !opensKeyboard(event.target)) return
      if (points.some((p) => p.name === 'full')) engine.goTo('full')
    },
    surface: {
      contentRef,
      innerRef,
      onPointerDown: engine.pointerDown,
      onClickCapture: engine.clickCapture,
      /** bottom-sheet/handle-keys: Enter (and a press) changes the sheet between Half and Full. */
      onHandleClick: () => {
        const to: BottomSheetSnap = current === 'full' ? 'half' : 'full'
        if (points.some((p) => p.name === to)) engine.goTo(to)
      },
      /** bottom-sheet/handle-keys: the arrows move to the next snap point. At Half, the down arrow closes a modal sheet. */
      onHandleKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
        event.preventDefault()
        if (!point) return
        // The step starts at the snap point of the state, also during a motion to it.
        const next = stepFrom(points, point.x, event.key === 'ArrowUp' ? 1 : -1)
        if (next) engine.goTo(next.name)
        else if (event.key === 'ArrowDown' && o.variant === 'modal') o.close()
      },
    },
  }
}

interface Axes {
  'data-theme'?: string
  'data-density'?: string
  'data-motion'?: string
  dir?: string
}

/** The axes of the place of the sheet, for the portal: the portal is not inside the elements of that place. */
function axesOf(el: Element | null): Axes {
  const axis = (name: string) => el?.closest(`[${name}]`)?.getAttribute(name) ?? undefined
  return { 'data-theme': axis('data-theme'), 'data-density': axis('data-density'), 'data-motion': axis('data-motion'), dir: axis('dir') }
}

/** The number of modal sheets on the page, for the token of the history entry. */
let entries = 0

function ModalSheet(props: BottomSheetModalProps) {
  const { title, count, children, footer, trigger, closeLabel = 'Close', handleLabel = 'Resize the sheet', container } = props
  const emit = useMoment('bottom-sheet')
  const [openState, setOpenState] = useState(props.defaultOpen ?? false)
  const controlled = props.open !== undefined
  const open = props.open ?? openState
  const onOpenChange = props.onOpenChange
  const setOpen = useCallback(
    (next: boolean) => {
      if (!controlled) setOpenState(next)
      onOpenChange?.(next)
    },
    [controlled, onOpenChange],
  )

  // bottom-sheet/moment-open-close: open at the first frame of the entrance, close at the first frame of the exit. A
  // release that closes the sheet emitted close at the release.
  const dragClosed = useRef(false)
  const wasOpen = useRef(false)
  useLayoutEffect(() => {
    if (open && !wasOpen.current) emit('open')
    if (!open && wasOpen.current && !dragClosed.current) emit('close')
    if (!open) dragClosed.current = false
    wasOpen.current = open
  }, [open, emit])

  const anchor = useRef<HTMLSpanElement>(null)
  const [axes, setAxes] = useState<Axes>({})
  useLayoutEffect(() => {
    if (open) setAxes(axesOf(anchor.current))
  }, [open])

  const side = useSide(props.layout ?? 'auto')
  const layout = side ? 'side' : 'bottom'
  // The token of the history entry: unique on the page, also with more than one React root.
  const [token] = useState(() => `sheet-${(entries += 1)}`)
  useBackEntry(open && props.history !== false, token, () => setOpen(false))
  const sheet = useSheet({
    variant: 'modal',
    open,
    layout,
    snap: props.snap,
    onSnapChange: props.onSnapChange,
    close: () => setOpen(false),
    dragClose: () => {
      dragClosed.current = true
      emit('close')
    },
  })
  const titleRef = useRef<HTMLHeadingElement>(null)

  return (
    // bottom-sheet/side-sheet: a side sheet has no scrim, and the page behind it continues to operate.
    <Dialog.Root open={open} onOpenChange={(next) => setOpen(next)} modal={!side} disablePointerDismissal={side}>
      {trigger ? <Dialog.Trigger render={trigger} /> : null}
      <span ref={anchor} hidden />
      <Dialog.Portal container={container ?? undefined} {...axes}>
        {side ? null : <Dialog.Backdrop ref={sheet.scrimRef} data-part="scrim" className={sheetScrim} />}
        <Dialog.Popup
          ref={sheet.setSheet}
          id={props.id}
          data-mono="bottom-sheet"
          data-variant="modal"
          data-layout={layout}
          data-snap={sheet.current}
          data-keyboard={sheet.keyboard ? '' : undefined}
          // bottom-sheet/role: a modal dialog with the title as its name.
          aria-modal={side ? undefined : true}
          // bottom-sheet/focus-open: the focus goes to the title. Base UI gives it back to the trigger at the close.
          initialFocus={titleRef}
          className={cx(side ? sheetSide : cx(sheetBottom, sheetLow.modal), props.className)}
          style={sheet.style}
          onWheel={sheet.onWheel}
          onFocus={sheet.onFocus}
        >
          <SheetSurface
            layout={layout}
            title={
              <Dialog.Title ref={titleRef} tabIndex={-1} data-part="title" className={sheetTitle}>
                {title}
              </Dialog.Title>
            }
            count={count}
            // bottom-sheet/close-ways: the close button at the end side of the header.
            close={<IconButton label={closeLabel} icon={<SheetCloseIcon />} onClick={() => setOpen(false)} className="shrink-0" />}
            footer={footer}
            handleLabel={handleLabel}
            {...sheet.surface}
          >
            {children}
          </SheetSurface>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function PersistentSheet(props: BottomSheetPersistentProps) {
  const { title, count, children, footer, handleLabel = 'Resize the sheet' } = props
  const titleId = useId()
  const side = useSide(props.layout ?? 'auto')
  const layout = side ? 'side' : 'bottom'
  // bottom-sheet/persistent-snaps: the sheet never closes.
  const sheet = useSheet({
    variant: 'persistent',
    open: true,
    layout,
    snap: props.snap,
    onSnapChange: props.onSnapChange,
    close: () => {},
    dragClose: () => {},
  })
  return (
    // bottom-sheet/role: a region with a name. bottom-sheet/persistent-focus: no scrim, and no focus trap.
    <section
      ref={sheet.setSheet}
      id={props.id}
      aria-labelledby={titleId}
      data-mono="bottom-sheet"
      data-variant="persistent"
      data-layout={layout}
      data-snap={sheet.current}
      data-keyboard={sheet.keyboard ? '' : undefined}
      className={cx(side ? sheetSide : cx(sheetBottom, sheetLow.persistent), props.className)}
      style={sheet.style}
      onWheel={sheet.onWheel}
      onFocus={sheet.onFocus}
    >
      <SheetSurface
        layout={layout}
        title={
          <h2 id={titleId} data-part="title" className={sheetTitle}>
            {title}
          </h2>
        }
        count={count}
        footer={footer}
        handleLabel={handleLabel}
        {...sheet.surface}
      >
        {children}
      </SheetSurface>
    </section>
  )
}

/**
 * The Bottom sheet: a surface that the user drags between snap points on a phone. From 768 px it is a side sheet with
 * the same content and the same actions (bottom-sheet/surfaces).
 */
export function BottomSheet(props: BottomSheetProps) {
  return props.variant === 'persistent' ? <PersistentSheet {...props} /> : <ModalSheet {...props} />
}
