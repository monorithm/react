// The snap rule of the sheet: the snap points, the projected point, the fling, the close line, and the rubber band.
// The position x is the height of the sheet in view, from the bottom edge of the screen: 0 is closed, and x increases
// upward. The velocity v is in px/ms, positive upward. The functions are pure, thus the tests need no browser.
// The language has no token for these values: they come from the text of the clauses.

export type BottomSheetSnap = 'peek' | 'half' | 'full'

/** One snap point: its name and its height in view, in px. */
export interface SnapPoint {
  name: BottomSheetSnap
  x: number
}

/** bottom-sheet/projection: the projection time, 0.4995 s. It is also the time constant of a free scroll. */
export const PROJECTION = 499.5
/** bottom-sheet/fling: a release faster than 0.5 px/ms is a fling. */
export const FLING = 0.5
/** bottom-sheet/close-line: the close line is 25 % of the distance from Half to the bottom edge, below Half. */
export const CLOSE_LINE = 0.25
/** bottom-sheet/rubber-band: past the limit, the sheet moves one third of the finger distance. */
export const BAND = 1 / 3

/** The values of the screen that give the snap points (bottom-sheet/snap-values). */
export interface SheetMeasure {
  /** The height of the screen area in view (bottom-sheet/web-height). */
  viewport: number
  /** Full: the screen height less the top safe area and the top gap (bottom-sheet/top-gap). */
  full: number
  /** The ratio of Half: --mono-ratio-sheet-half. */
  ratio: number
  /** The height of Peek: --mono-size-sheet-peek. */
  peek: number
  /** The height of the sheet with all its content, or 0 when the height is not known. */
  natural: number
}

/**
 * The snap points of a variant, from low to high (bottom-sheet/snap-values, bottom-sheet/modal-snaps,
 * bottom-sheet/persistent-snaps). If the content is shorter than Half, the sheet has one snap point at the height of
 * the content (bottom-sheet/short-content).
 */
export function snapPoints(variant: 'modal' | 'persistent', m: SheetMeasure): SnapPoint[] {
  const full = Math.max(0, m.full)
  const half = Math.min(full, m.viewport * m.ratio)
  if (m.natural > 0 && m.natural < half) return [{ name: 'half', x: m.natural }]
  const points: SnapPoint[] =
    variant === 'persistent'
      ? [
          { name: 'peek', x: Math.min(m.peek, half) },
          { name: 'half', x: half },
          { name: 'full', x: full },
        ]
      : [
          { name: 'half', x: half },
          { name: 'full', x: full },
        ]
  return points
}

/** bottom-sheet/projection: the projected point P = x + v × 0.4995 s. */
export const project = (x: number, v: number): number => x + v * PROJECTION

/** bottom-sheet/close-line: the close line below the lowest snap point. With Half at 300 px, it is at 225 px. */
export const closeLine = (lowest: number): number => lowest * (1 - CLOSE_LINE)

/**
 * bottom-sheet/rubber-band: the shown position for a finger position. Past the upper limit, the sheet moves one third of
 * the finger distance. A lower limit (the lowest point of a persistent sheet, which never closes) has the same band.
 * Below 0 the sheet does not move.
 */
export function band(raw: number, upper: number, lower?: number): number {
  if (raw > upper) return upper + (raw - upper) * BAND
  if (lower !== undefined && raw < lower) return Math.max(0, lower - (lower - raw) * BAND)
  return Math.max(0, raw)
}

/** The point that is nearest to the position p. */
function nearest(points: readonly number[], p: number): number {
  let best = points[0] ?? 0
  for (const x of points) if (Math.abs(x - p) < Math.abs(best - p)) best = x
  return best
}

/** The target of a release, as a position. 0 is closed. */
export interface ReleaseInput {
  /** The position of the sheet at the release. */
  x: number
  /** The velocity of the finger at the release, from the tracker. */
  v: number
  /** The positions of the snap points, from low to high. */
  points: readonly number[]
  /** A modal sheet closes. A persistent sheet never closes. */
  closable: boolean
}

/**
 * The position that a release selects (bottom-sheet/projection, bottom-sheet/fling, bottom-sheet/close-line,
 * bottom-sheet/gestures). The snap point nearest to P wins. When P is below the close line, a modal sheet closes. A
 * fling goes to the next snap point in its direction, or farther when P is farther.
 */
export function releaseTarget({ x, v, points, closable }: ReleaseInput): number {
  const p = project(x, v)
  const lowest = points[0] ?? 0
  let target = closable && p < closeLine(lowest) ? 0 : nearest(points, p)
  if (Math.abs(v) > FLING) {
    const stops = closable ? [0, ...points] : [...points]
    // The next point in the direction of the fling, from the position of the release. A distance of less than 0.5 px is
    // at the point.
    const next = v > 0 ? stops.find((s) => s > x + 0.5) : [...stops].reverse().find((s) => s < x - 0.5)
    if (next !== undefined) target = v > 0 ? Math.max(target, next) : Math.min(target, next)
  }
  return target
}

/** The point above or below the position x, for the keys and the wheel (bottom-sheet/handle-keys, bottom-sheet/wheel). */
export function stepFrom(points: readonly SnapPoint[], x: number, direction: 1 | -1): SnapPoint | undefined {
  return direction > 0 ? points.find((s) => s.x > x + 0.5) : [...points].reverse().find((s) => s.x < x - 0.5)
}

/**
 * bottom-sheet/content-fling: the free scroll of the content after a fling. The velocity decays with the time constant
 * of the projection, thus the content stops at P. The result is the distance from the start, in px, at the time t in ms.
 */
export const glide = (t: number, v: number): number => v * PROJECTION * (1 - Math.exp(-t / PROJECTION))

/** The velocity of the free scroll at the time t, in px/ms. */
export const glideVelocity = (t: number, v: number): number => v * Math.exp(-t / PROJECTION)
