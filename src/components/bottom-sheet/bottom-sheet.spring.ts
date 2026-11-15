// The release spring of the sheet: spring-sheet from the values of the language (src/tokens/values.ts), with the
// velocity of the finger as the start velocity (bottom-sheet/release). The functions are pure, thus the tests need no
// browser. The times are in ms, the distances in px, and the velocities in px/ms.
import { tokens } from '@monorithm/react/tokens/values'

export interface Spring {
  stiffness: number
  damping: number
  mass: number
}

/** bottom-sheet/release: spring-sheet, stiffness 400, damping 40, mass 1, and no bounce. */
export const SHEET_SPRING: Spring = tokens['spring.sheet'].extensions['dev.monorithm'].spring

/** bottom-sheet/moment-snap: the contact is the first time that the sheet is 1 px or less from its snap point. */
export const CONTACT = 1
/** The settle time: after it, the sheet stays 0.5 px or less from its snap point. */
export const REST = 0.5

/** The longest motion that the scan examines, in ms. */
const LIMIT = 10_000
/** The step of the scan, in ms. */
const STEP = 0.5

/**
 * The state of the spring at the time t: the distance to the target e and the velocity v. The start is the distance e0
 * and the velocity v0. The closed form covers the three cases of the damping ratio.
 */
export function springAt(t: number, e0: number, v0: number, spring: Spring = SHEET_SPRING): { e: number; v: number } {
  const { stiffness: k, damping: c, mass: m } = spring
  // The natural frequency in rad/ms, and the damping ratio.
  const w = Math.sqrt(k / m) / 1000
  const z = c / (2 * Math.sqrt(k * m))
  if (Math.abs(z - 1) < 1e-6) {
    // Critical damping: e = (e0 + (v0 + w e0) t) e^(-w t).
    const b = v0 + w * e0
    const decay = Math.exp(-w * t)
    return { e: (e0 + b * t) * decay, v: (v0 - w * b * t) * decay }
  }
  if (z < 1) {
    const wd = w * Math.sqrt(1 - z * z)
    const a = e0
    const b = (v0 + z * w * e0) / wd
    const decay = Math.exp(-z * w * t)
    const cos = Math.cos(wd * t)
    const sin = Math.sin(wd * t)
    return {
      e: decay * (a * cos + b * sin),
      v: decay * ((wd * b - z * w * a) * cos - (z * w * b + wd * a) * sin),
    }
  }
  const root = Math.sqrt(z * z - 1)
  const r1 = -w * (z - root)
  const r2 = -w * (z + root)
  const c2 = (v0 - r1 * e0) / (r2 - r1)
  const c1 = e0 - c2
  return { e: c1 * Math.exp(r1 * t) + c2 * Math.exp(r2 * t), v: r1 * c1 * Math.exp(r1 * t) + r2 * c2 * Math.exp(r2 * t) }
}

/** bottom-sheet/moment-snap: the time of the contact. For a move of 100 px with no start velocity, it is near 332 ms. */
export function contactTime(e0: number, v0: number, spring: Spring = SHEET_SPRING): number {
  for (let t = 0; t <= LIMIT; t += STEP) if (Math.abs(springAt(t, e0, v0, spring).e) <= CONTACT) return t
  return LIMIT
}

/** The settle time: the spring stops. For a move of 100 px with no start velocity, it is 372 ms. */
export function settleTime(e0: number, v0: number, spring: Spring = SHEET_SPRING): number {
  let last = -STEP
  for (let t = 0; t <= LIMIT; t += STEP) if (Math.abs(springAt(t, e0, v0, spring).e) > REST) last = t
  return Math.max(0, last + STEP)
}

/** One motion of the sheet to a snap point. */
export interface Motion {
  from: number
  to: number
  /** The time of the contact, in ms after the start (bottom-sheet/moment-snap). */
  contact: number
  /** The time at which the motion stops, in ms after the start. */
  settle: number
  /** The position at the time t. */
  at: (t: number) => number
}

/**
 * The motion of a release from the position `from` to the snap point `to`, with the start velocity v0
 * (bottom-sheet/release). With reduced motion, the sheet has no spring: it goes to its snap point immediately, and
 * the contact is at the release (bottom-sheet/release-reduced, bottom-sheet/moment-snap-other).
 */
export function releaseMotion(from: number, to: number, v0: number, reduced: boolean, spring: Spring = SHEET_SPRING): Motion {
  const e0 = from - to
  if (reduced) return { from, to, contact: 0, settle: 0, at: () => to }
  const contact = contactTime(e0, v0, spring)
  const settle = Math.max(contact, settleTime(e0, v0, spring))
  return { from, to, contact, settle, at: (t) => (t >= settle ? to : to + springAt(t, e0, v0, spring).e) }
}
