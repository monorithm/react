// The tests of the release spring of the sheet. Each name starts with the id of a clause of
// ir/contracts/bottom-sheet.json. The spring is pure, thus the tests need no browser.
import { describe, expect, it } from 'vitest'
import { tokens } from '@monorithm/react/tokens/values'
import { CONTACT, contactTime, releaseMotion, REST, SHEET_SPRING, settleTime, springAt } from './bottom-sheet.spring'

/** One frame at 60 Hz, in ms. */
const FRAME = 1000 / 60

describe('Bottom sheet release spring', () => {
  it('bottom-sheet/release: the spring is spring-sheet from the values of the language: 400, 40, 1, and no bounce', () => {
    expect(SHEET_SPRING).toEqual({ stiffness: 400, damping: 40, mass: 1 })
    expect(SHEET_SPRING).toEqual(tokens['spring.sheet'].extensions['dev.monorithm'].spring)
    // No bounce: a move with no start velocity never passes the target.
    for (let t = 0; t <= 1000; t += 1) expect(springAt(t, 100, 0).e).toBeGreaterThanOrEqual(0)
  })

  it('bottom-sheet/release: the spring starts with the velocity of the finger', () => {
    expect(springAt(0, 100, -1.5)).toEqual({ e: 100, v: -1.5 })
    // A move toward the target with the start velocity is ahead of a move from rest.
    expect(springAt(80, 100, -1.5).e).toBeLessThan(springAt(80, 100, 0).e)
    const motion = releaseMotion(260, 560, 2, false)
    expect(motion.at(0)).toBe(260)
    // The velocity at the start: the position after 1 ms moves near 2 px.
    expect(motion.at(1) - 260).toBeCloseTo(2, 0)
    expect(motion.at(motion.settle)).toBe(560)
  })

  it('bottom-sheet/release: the velocity of the closed form agrees with the position', () => {
    for (const [e0, v0] of [
      [100, 0],
      [-300, 2],
      [40, -6],
    ] as const) {
      const h = 0.001
      const t = 120
      const slope = (springAt(t + h, e0, v0).e - springAt(t - h, e0, v0).e) / (2 * h)
      expect(springAt(t, e0, v0).v).toBeCloseTo(slope, 6)
    }
  })

  it('bottom-sheet/moment-snap: for a move of 100 px with no start velocity, the contact is at 333 ms and the settle at 372 ms', () => {
    const contact = contactTime(100, 0)
    // The contact is the first time at 1 px or less: 332 ms. The first frame at 60 Hz after it is at 333 ms.
    expect(contact).toBeCloseTo(332, 0)
    expect(Math.round(Math.ceil(contact / FRAME) * FRAME)).toBe(333)
    expect(Math.abs(springAt(contact, 100, 0).e)).toBeLessThanOrEqual(CONTACT)
    expect(Math.abs(springAt(contact - 1, 100, 0).e)).toBeGreaterThan(CONTACT)
    // The settle time is the transition value of spring-sheet: 372 ms.
    expect(settleTime(100, 0)).toBe(372)
    expect(settleTime(100, 0)).toBe(tokens['spring.sheet'].value.duration.value)
    expect(Math.abs(springAt(372, 100, 0).e)).toBeLessThanOrEqual(REST)
  })

  it('bottom-sheet/moment-snap: the contact comes before the settle time for each release', () => {
    for (const [from, to, v] of [
      [300, 560, 0],
      [300, 560, 3],
      [560, 300, -1],
      [650, 560, 0.4 / 3],
    ] as const) {
      const motion = releaseMotion(from, to, v, false)
      expect(motion.contact).toBeLessThan(motion.settle)
      expect(Math.abs(motion.at(motion.contact) - to)).toBeLessThanOrEqual(CONTACT)
    }
  })

  it('bottom-sheet/release-reduced: with reduced motion, the sheet goes to its snap point immediately', () => {
    const motion = releaseMotion(300, 560, 2, true)
    expect([motion.contact, motion.settle, motion.at(0)]).toEqual([0, 0, 560])
  })

  it('bottom-sheet/moment-snap-other: with reduced motion, the contact and thus the moment snap are at the release', () => {
    expect(releaseMotion(560, 300, 0, true).contact).toBe(0)
  })

  it('bottom-sheet/release: a spring with less damping (a review value) also has a contact and a settle time', () => {
    const softer = { stiffness: 400, damping: 36, mass: 1 }
    expect(contactTime(100, 0, softer)).toBeLessThan(settleTime(100, 0, softer))
    const stiff = { stiffness: 400, damping: 60, mass: 1 }
    expect(springAt(0, 100, 0, stiff).e).toBe(100)
    expect(contactTime(100, 0, stiff)).toBeLessThan(settleTime(100, 0, stiff))
  })
})
