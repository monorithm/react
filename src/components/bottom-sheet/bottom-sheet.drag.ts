// The drag of the sheet: the slop, the axis lock, the 1 : 1 tracking, the rubber band, the scroll handoff, the catch,
// the release with spring-sheet, and the cancel. The engine holds the position outside of React, thus a frame of the
// drag does not render. It writes the position to the sheet through the paint function of the host.
// The math is in bottom-sheet.velocity.ts, bottom-sheet.snap.ts, and bottom-sheet.spring.ts.
import type { PointerEvent as ReactPointerEvent } from 'react'
import { BAND, type BottomSheetSnap, band, glide, glideVelocity, releaseTarget, type SnapPoint } from './bottom-sheet.snap'
import { type Motion, releaseMotion } from './bottom-sheet.spring'
import { VelocityTracker } from './bottom-sheet.velocity'

/** The element where a gesture starts: the handle and the header, or the content (bottom-sheet/drag-area). */
export type DragSource = 'drag-area' | 'content'

/** The host of the engine: the component gives the elements, the state, and the callbacks. */
export interface SheetHost {
  sheet: () => HTMLElement | null
  content: () => HTMLElement | null
  /** The snap points from low to high. An empty list stops the drag. */
  points: () => readonly SnapPoint[]
  /** The snap point of the state. */
  snap: () => BottomSheetSnap
  /** A modal sheet closes. A persistent sheet never closes. */
  closable: () => boolean
  /** The drag operates only in the bottom layout of an open sheet. */
  enabled: () => boolean
  reduced: () => boolean
  /** The slop of the geometry: --mono-bottom-sheet-drag-slop. */
  slop: () => number
  /** Writes the position x to the sheet and the scrim. null gives the rest position of the state to the CSS. */
  paint: (x: number | null) => void
  /** The moment drag-start. */
  dragStart: () => void
  /** The selected snap point: the state changes at the release. */
  select: (snap: BottomSheetSnap) => void
  /** The moment snap, at the contact. */
  contact: (snap: BottomSheetSnap) => void
  /** A release closes the sheet: the moment close, at the first frame of the exit. */
  closeStart: () => void
  /** The exit motion of a release ends: the sheet closes. */
  closeEnd: () => void
}

interface Gesture {
  id: number
  source: DragSource
  element: Element
  /** The pointer at the start, in client px. */
  cx: number
  cy: number
  /** The snap point of the state at the start (bottom-sheet/cancel). */
  startSnap: BottomSheetSnap
  /** The touch stopped a motion (bottom-sheet/catch). */
  caught: boolean
  /** The locked axis, after the slop (bottom-sheet/axis-lock). */
  axis: 'x' | 'y' | null
  /** The finger travel of the last move, in px upward. */
  prev: number
  /** The position of the sheet with no rubber band: it follows the finger 1 : 1. */
  raw: number
  /** The sheet moved: drag-start is sent. */
  moved: boolean
  /** The content scrolled in the gesture. */
  scrolled: boolean
  /** The part that the last move changed. */
  last: 'sheet' | 'content' | null
  tracker: VelocityTracker
}

/** A drag on these elements of the content does not move the sheet: the user selects text in them. */
const TEXT_ENTRY = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]'

/**
 * The time of a pointer event, in the time base of performance.now(). A browser gives the time of the input in this
 * base. An environment with a different base (for example a test document) gives the time of the handler.
 */
function timeOf(event: { timeStamp: number }): number {
  const now = performance.now()
  const t = event.timeStamp
  return t > 0 && t <= now + 1 && now - t < 1000 ? t : now
}

/** The samples of one move: the coalesced events of the browser, or the event. */
function samplesOf(event: PointerEvent): PointerEvent[] {
  const list = typeof event.getCoalescedEvents === 'function' ? event.getCoalescedEvents() : []
  return list.length > 0 ? list : [event]
}

export class SheetDrag {
  /** The position of the sheet: its height in view, in px. */
  x = 0
  private frame = 0
  private glideFrame = 0
  private gesture: Gesture | null = null
  /** The next click comes from the pointer up of a drag. */
  private suppress = false
  private readonly host: () => SheetHost

  constructor(host: () => SheetHost) {
    this.host = host
  }

  /** A motion of the engine is in progress. */
  get busy(): boolean {
    return this.frame !== 0 || this.gesture?.axis === 'y'
  }

  /** The position of the rest point of the state. */
  private restX(): number {
    const h = this.host()
    const points = h.points()
    return (points.find((p) => p.name === h.snap()) ?? points[0])?.x ?? 0
  }

  /** A CSS transition (the entrance) moves the sheet. */
  private transitionRuns(): boolean {
    const sheet = this.host().sheet()
    return typeof sheet?.getAnimations === 'function' && sheet.getAnimations().some((a) => a.playState === 'running')
  }

  /** The position now: from the motion, from the transition in progress, or the rest point. */
  position(): number {
    if (this.frame) return this.x
    const h = this.host()
    const sheet = h.sheet()
    const full = h.points().at(-1)?.x
    if (sheet && full !== undefined && this.transitionRuns()) {
      // The sheet is translated down by Full less its position.
      const ty = Number.parseFloat(getComputedStyle(sheet).translate.split(' ')[1] ?? '')
      if (Number.isFinite(ty)) return full - ty
    }
    return this.restX()
  }

  /** Stops the spring and the free scroll of the content. */
  private stopMotion(): void {
    if (this.frame) cancelAnimationFrame(this.frame)
    if (this.glideFrame) cancelAnimationFrame(this.glideFrame)
    this.frame = 0
    this.glideFrame = 0
  }

  /**
   * Runs one motion. The contact callback comes at the first frame at or after the contact time, not at the settle
   * time (bottom-sheet/moment-snap). A motion with no duration (reduced motion) ends immediately.
   */
  private run(motion: Motion, onContact?: () => void, onDone?: () => void): void {
    this.stopMotion()
    const h = this.host()
    // The end: the sheet stays one frame at the target, then the CSS takes the rest position. Thus the change of the
    // rest position gives no transition.
    const end = () => {
      this.x = motion.to
      this.host().paint(motion.to)
      this.frame = requestAnimationFrame(() => {
        this.frame = 0
        onDone?.()
      })
    }
    if (motion.settle <= 0) {
      onContact?.()
      end()
      return
    }
    this.x = motion.from
    h.paint(motion.from)
    const start = performance.now()
    let contacted = false
    const step = () => {
      const t = performance.now() - start
      if (!contacted && t >= motion.contact) {
        contacted = true
        onContact?.()
      }
      if (t >= motion.settle) return end()
      this.x = motion.at(t)
      this.host().paint(this.x)
      this.frame = requestAnimationFrame(step)
    }
    this.frame = requestAnimationFrame(step)
  }

  /** The motion to a snap point, then the rest position of the CSS. */
  private toPoint(point: SnapPoint, v0: number, moment: boolean): void {
    const h = this.host()
    this.run(
      releaseMotion(this.x, point.x, v0, h.reduced()),
      moment ? () => this.host().contact(point.name) : undefined,
      () => this.host().paint(null),
    )
  }

  /**
   * Moves the sheet to a snap point with a velocity of 0: the handle keys, the wheel, an input, or a change of the
   * prop. The moment snap comes at the contact (bottom-sheet/moment-snap-other). notify: false does not call select.
   * from: the start position, when the state already changed.
   */
  goTo(name: BottomSheetSnap, { notify = true, from }: { notify?: boolean; from?: number } = {}): void {
    const h = this.host()
    const point = h.points().find((p) => p.name === name)
    // The position before the state changes: the prop of a controlled sheet gives the position of the last render.
    const x = from ?? this.position()
    if (notify) h.select(name)
    if (!point || !h.enabled()) return
    this.stopMotion()
    this.x = x
    this.toPoint(point, 0, true)
  }

  /** The release: the projection selects the snap point, and spring-sheet starts with the velocity of the finger. */
  private release(g: Gesture, v: number): void {
    const h = this.host()
    const points = h.points()
    const full = points.at(-1)?.x ?? 0
    const low = points[0]?.x ?? 0
    const closable = h.closable()
    // bottom-sheet/rubber-band: past the limit, the spring starts with one third of the velocity of the finger.
    const inBand = g.raw > full || (!closable && g.raw < low)
    const v0 = inBand ? v * BAND : v
    const to = releaseTarget({ x: this.x, v, points: points.map((p) => p.x), closable })
    if (closable && to === 0) {
      // bottom-sheet/moment-open-close: a release that closes the sheet emits close, not snap. After a drag, the sheet
      // closes with spring-sheet (bottom-sheet/motion).
      h.closeStart()
      this.run(releaseMotion(this.x, 0, v0, h.reduced()), undefined, () => this.host().closeEnd())
      return
    }
    const point = points.find((p) => p.x === to) ?? points[0]
    if (!point) return
    h.select(point.name)
    this.toPoint(point, v0, true)
  }

  /** bottom-sheet/content-fling: the free scroll of the content. It stops at the top and does not move the sheet. */
  private glide(v: number): void {
    const content = this.host().content()
    if (!content || Math.abs(v) < 0.05) return
    const start = performance.now()
    const s0 = content.scrollTop
    const step = () => {
      const t = performance.now() - start
      const want = s0 + glide(t, v)
      const max = Math.max(0, content.scrollHeight - content.clientHeight)
      const next = Math.min(max, Math.max(0, want))
      content.scrollTop = next
      if (next !== want || Math.abs(glideVelocity(t, v)) < 0.01) {
        this.glideFrame = 0
        return
      }
      this.glideFrame = requestAnimationFrame(step)
    }
    this.glideFrame = requestAnimationFrame(step)
  }

  /** The pointer down on the handle, the header, or the content. */
  readonly pointerDown = (event: ReactPointerEvent<HTMLElement>, source: DragSource): void => {
    const h = this.host()
    if (!h.enabled() || this.gesture || event.button !== 0 || !event.isPrimary) return
    if (h.points().length === 0) return
    this.suppress = false
    if (source === 'content' && (event.target as Element).closest(TEXT_ENTRY)) return
    // bottom-sheet/catch: a touch during a motion stops the sheet where it is.
    const caught = this.frame !== 0 || this.transitionRuns()
    this.x = this.position()
    this.stopMotion()
    if (caught) h.paint(this.x)
    this.gesture = {
      id: event.pointerId,
      source,
      element: event.currentTarget,
      cx: event.clientX,
      cy: event.clientY,
      startSnap: h.snap(),
      caught,
      axis: null,
      prev: 0,
      raw: this.x,
      moved: false,
      scrolled: false,
      last: null,
      tracker: new VelocityTracker(),
    }
    window.addEventListener('pointermove', this.move)
    window.addEventListener('pointerup', this.up)
    window.addEventListener('pointercancel', this.cancel)
  }

  private endListeners(): void {
    window.removeEventListener('pointermove', this.move)
    window.removeEventListener('pointerup', this.up)
    window.removeEventListener('pointercancel', this.cancel)
    const g = this.gesture
    this.gesture = null
    if (g?.axis === 'y' && typeof g.element.releasePointerCapture === 'function') {
      try {
        g.element.releasePointerCapture(g.id)
      } catch {
        // The capture is already gone.
      }
    }
  }

  /**
   * Moves the sheet by d px upward, with the rubber band past the limits. start: the first frame of the tracking, also
   * with no distance (a move of exactly the slop).
   */
  private moveSheet(g: Gesture, d: number, start = false): void {
    if (d === 0 && (!start || g.moved)) return
    const h = this.host()
    const points = h.points()
    const full = points.at(-1)?.x ?? 0
    g.raw += d
    // bottom-sheet/tracking: 1 : 1 with no easing. bottom-sheet/rubber-band: one third past Full.
    this.x = band(g.raw, full, h.closable() ? undefined : points[0]?.x)
    if (!g.moved) {
      // bottom-sheet/moment-drag-start: the first frame of the tracking. After a scroll of the content in the same
      // gesture, drag-start comes when the sheet starts to move.
      g.moved = true
      h.dragStart()
    }
    g.last = 'sheet'
    h.paint(this.x)
  }

  /** Scrolls the content by d px (positive: the content goes up). It returns the distance that the content used. */
  private scrollContent(g: Gesture, d: number): number {
    const content = this.host().content()
    if (!content) return 0
    const before = content.scrollTop
    const max = Math.max(0, content.scrollHeight - content.clientHeight)
    content.scrollTop = Math.min(max, Math.max(0, before + d))
    const used = content.scrollTop - before
    if (used !== 0) {
      g.scrolled = true
      g.last = 'content'
    }
    return used
  }

  /**
   * One move of d px upward in the direction dir: the drag area moves the sheet; the content hands off
   * (bottom-sheet/handoff). start: the first move past the slop.
   */
  private consume(g: Gesture, d: number, dir: number, start: boolean): void {
    if (g.source === 'drag-area') return this.moveSheet(g, d, start)
    const full = this.host().points().at(-1)?.x ?? 0
    const atFull = g.raw >= full - 0.5
    if (dir < 0) {
      // bottom-sheet/handoff-scrolled: a drag down first scrolls the content to its top, then moves the sheet.
      const top = (this.host().content()?.scrollTop ?? 0) <= 0
      const used = atFull ? this.scrollContent(g, d) : 0
      this.moveSheet(g, d - used, start && (!atFull || top))
    } else if (dir > 0) {
      // bottom-sheet/scroll-at-full: below Full the sheet moves up. bottom-sheet/handoff-top: at Full the content scrolls.
      const up = atFull ? 0 : Math.min(full - g.raw, d)
      this.moveSheet(g, up, start && !atFull)
      if (d - up > 0) this.scrollContent(g, d - up)
    }
  }

  private readonly move = (event: PointerEvent): void => {
    const g = this.gesture
    if (!g || event.pointerId !== g.id) return
    const fy = g.cy - event.clientY
    const fx = event.clientX - g.cx
    let start = false
    if (!g.axis) {
      // bottom-sheet/slop: a move shorter than the slop is a tap.
      const slop = this.host().slop()
      if (Math.max(Math.abs(fx), Math.abs(fy)) < slop) return
      // bottom-sheet/axis-lock and bottom-sheet/carousel: a move that is more horizontal than vertical does not move
      // the sheet.
      if (Math.abs(fx) > Math.abs(fy)) {
        g.axis = 'x'
        this.endListeners()
        if (g.caught) this.release(g, 0)
        return
      }
      g.axis = 'y'
      // bottom-sheet/tracking: the tracking starts at the slop, thus the sheet does not move by the slop.
      g.prev = Math.sign(fy) * slop
      start = true
      if (typeof g.element.setPointerCapture === 'function') {
        try {
          g.element.setPointerCapture(g.id)
        } catch {
          // A pointer of a test document has no capture.
        }
      }
    }
    if (event.cancelable) event.preventDefault()
    for (const s of samplesOf(event)) g.tracker.add(timeOf(s), g.cy - s.clientY)
    const d = fy - g.prev
    g.prev = fy
    this.consume(g, d, d !== 0 ? Math.sign(d) : Math.sign(fy), start)
  }

  /** After a drag, the click of the pointer up does not operate the button under it. */
  private stopNextClick(): void {
    this.suppress = true
    setTimeout(() => {
      this.suppress = false
    }, 0)
  }

  /** The click handler of the capture phase on the handle, the header, and the content (bottom-sheet/slop). */
  readonly clickCapture = (event: { stopPropagation: () => void; preventDefault: () => void }): void => {
    if (!this.suppress) return
    this.suppress = false
    event.stopPropagation()
    event.preventDefault()
  }

  private readonly up = (event: PointerEvent): void => {
    const g = this.gesture
    if (!g || event.pointerId !== g.id) return
    this.endListeners()
    if (g.axis !== 'y') {
      // A tap: the buttons operate (bottom-sheet/slop). After a catch, the sheet goes to a snap point
      // (bottom-sheet/snap-only).
      if (g.caught) this.release(g, 0)
      return
    }
    this.stopNextClick()
    const v = g.tracker.velocity(timeOf(event))
    if (g.moved && g.last === 'sheet') return this.release(g, v)
    if (g.moved) {
      // The sheet went to Full, then the content scrolled: the sheet is at Full.
      const full = this.host().points().at(-1)
      if (full) {
        this.host().select(full.name)
        this.toPoint(full, 0, true)
      }
    } else if (g.caught) this.release(g, 0)
    if (g.scrolled) this.glide(v)
  }

  private readonly cancel = (event: PointerEvent): void => {
    const g = this.gesture
    if (!g || event.pointerId !== g.id) return
    this.endListeners()
    if (!g.moved && !g.caught) return
    // bottom-sheet/cancel: back to the snap point of the start of the drag, with no moment snap.
    const h = this.host()
    const points = h.points()
    const point = points.find((p) => p.name === g.startSnap) ?? points[0]
    if (!point) return
    h.select(point.name)
    this.toPoint(point, 0, false)
  }

  /** Stops each gesture and motion, with no callback. For a sheet that closes or unmounts. */
  reset(): void {
    this.stopMotion()
    if (this.gesture) this.endListeners()
  }
}
