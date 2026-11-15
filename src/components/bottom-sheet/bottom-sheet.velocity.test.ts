// The tests of the velocity tracker of the sheet. Each name starts with the id of a clause of
// ir/contracts/bottom-sheet.json. The tracker is pure, thus the tests need no browser.
import { describe, expect, it } from 'vitest'
import { type Sample, TRACKER, VelocityTracker, velocityOf, windowOf } from './bottom-sheet.velocity'

/** Samples of a motion x(t), one for each frame of the rate in Hz, from t0 for the duration in ms. */
const trace = (x: (t: number) => number, hz: number, duration: number, t0 = 0): Sample[] => {
  const out: Sample[] = []
  for (let t = 0; t <= duration + 1e-9; t += 1000 / hz) out.push({ t: t0 + t, x: x(t) })
  return out
}

describe('Bottom sheet velocity tracker', () => {
  it('bottom-sheet/velocity: a constant motion of 1.2 px/ms gives 1.2 px/ms at 60 Hz, 120 Hz, and 240 Hz', () => {
    for (const hz of [60, 120, 240]) expect(velocityOf(trace((t) => 1.2 * t, hz, 200))).toBeCloseTo(1.2, 6)
  })

  it('bottom-sheet/velocity: the curve is quadratic, thus a constant deceleration gives the slope at the newest sample', () => {
    // x = 2 t - 0.004 t²: the velocity at t = 150 ms is 2 - 0.008 × 150 = 0.8 px/ms.
    const samples = trace((t) => 2 * t - 0.004 * t * t, 120, 150)
    expect(velocityOf(samples)).toBeCloseTo(0.8, 6)
  })

  it('bottom-sheet/velocity: the window is the last 40 ms when it has 4 samples or more', () => {
    const samples = trace((t) => t, 120, 200)
    const w = windowOf(samples)
    const newest = samples.at(-1)?.t ?? 0
    expect(w.length).toBeGreaterThanOrEqual(TRACKER.samples)
    expect(w.every((s) => newest - s.t <= TRACKER.window)).toBe(true)
    expect(w.length).toBe(samples.filter((s) => newest - s.t <= 40).length)
  })

  it('bottom-sheet/velocity: the window extends back to 4 samples, but not past 100 ms', () => {
    // 40 Hz: one sample each 25 ms. The last 40 ms have 2 samples, thus the window takes 4 samples (75 ms).
    const slow = trace((t) => 0.5 * t, 40, 300)
    expect(windowOf(slow).length).toBe(4)
    // 20 Hz: one sample each 50 ms. 4 samples cover 150 ms, thus the window stops at 100 ms: 3 samples.
    const slower = trace((t) => 0.5 * t, 20, 300)
    const w = windowOf(slower)
    expect(w.length).toBe(3)
    expect(velocityOf(slower)).toBeCloseTo(0.5, 6)
  })

  it('bottom-sheet/velocity: an old motion before the window does not change the velocity', () => {
    // A fast move, a stop, then a slow drag of 0.3 px/ms for 60 ms. Only the slow drag is in the window.
    const fast = trace((t) => 4 * t, 120, 100)
    const end = fast.at(-1) ?? { t: 0, x: 0 }
    const slow = trace((t) => end.x + 0.3 * t, 120, 60, end.t + 1000 / 120).map((s) => ({ ...s, x: s.x + 0.3 * (1000 / 120) }))
    expect(velocityOf([...fast, ...slow])).toBeCloseTo(0.3, 6)
  })

  it('bottom-sheet/velocity: a pause of 40 ms before the release gives a velocity of 0', () => {
    const samples = trace((t) => 2 * t, 120, 100)
    const last = samples.at(-1)?.t ?? 0
    expect(velocityOf(samples, last + 39)).toBeCloseTo(2, 6)
    expect(velocityOf(samples, last + 40)).toBe(0)
  })

  it('bottom-sheet/velocity: the limit is 8 px/ms in each direction', () => {
    expect(velocityOf(trace((t) => 20 * t, 120, 100))).toBe(8)
    expect(velocityOf(trace((t) => -20 * t, 120, 100))).toBe(-8)
  })

  it('bottom-sheet/velocity: no sample or one sample gives 0; two samples give their slope', () => {
    expect(velocityOf([])).toBe(0)
    expect(velocityOf([{ t: 0, x: 10 }])).toBe(0)
    expect(velocityOf([{ t: 0, x: 0 }, { t: 10, x: 5 }])).toBeCloseTo(0.5, 9)
  })

  it('bottom-sheet/velocity: a stop with samples at the same position gives 0, not a false fling', () => {
    const move = trace((t) => 3 * t, 120, 100)
    const end = move.at(-1) ?? { t: 0, x: 0 }
    const stop = trace(() => end.x, 120, 50, end.t + 1000 / 120)
    expect(Math.abs(velocityOf([...move, ...stop]))).toBeLessThan(0.05)
  })

  it('bottom-sheet/velocity: the tracker class keeps the samples of one gesture and starts again after reset', () => {
    const tracker = new VelocityTracker()
    for (const s of trace((t) => -1.5 * t, 120, 120)) tracker.add(s.t, s.x)
    expect(tracker.velocity()).toBeCloseTo(-1.5, 6)
    tracker.reset()
    expect(tracker.velocity()).toBe(0)
    // A sample with an earlier time starts a new trace.
    tracker.add(500, 0)
    tracker.add(510, 10)
    tracker.add(100, 0)
    expect(tracker.velocity()).toBe(0)
  })
})
