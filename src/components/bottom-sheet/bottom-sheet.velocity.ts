// The velocity tracker of the language (bottom-sheet/velocity). All surfaces use one tracker, thus the same release gives
// the same result. The tracker fits a quadratic least-squares curve through the samples of the last 40 ms. If the window
// has fewer than 4 samples, it extends back to 4 samples, but not past 100 ms. The velocity is the slope of the curve at
// the newest sample. A gap of 40 ms before the release gives 0. The limit is 8 px/ms.
// The language has no token for these values: they come from the text of the clause bottom-sheet/velocity.

/** The values of the tracker, in ms and px/ms (bottom-sheet/velocity). */
export const TRACKER = {
  /** The window of the fit. */
  window: 40,
  /** The window extends back to this number of samples. */
  samples: 4,
  /** The window never extends past this age. */
  maxAge: 100,
  /** A gap of this length before the release gives a velocity of 0. */
  gap: 40,
  /** The limit of the velocity, in px/ms. */
  limit: 8,
} as const

/** One sample: the time in ms and the position in px. */
export interface Sample {
  t: number
  x: number
}

/** The samples that the fit uses: the last 40 ms, or the last 4 samples, but not past 100 ms. */
export function windowOf(samples: readonly Sample[]): Sample[] {
  const newest = samples.at(-1)
  if (!newest) return []
  const recent = samples.filter((s) => newest.t - s.t <= TRACKER.window)
  if (recent.length >= TRACKER.samples) return recent
  return samples.slice(-TRACKER.samples).filter((s) => newest.t - s.t <= TRACKER.maxAge)
}

/** The slope of the least-squares line, for two samples or a set that a curve cannot fit. */
function lineSlope(points: readonly Sample[], t0: number): number {
  let n = 0
  let st = 0
  let sx = 0
  let stt = 0
  let stx = 0
  for (const p of points) {
    const t = p.t - t0
    n += 1
    st += t
    sx += p.x
    stt += t * t
    stx += t * p.x
  }
  const det = n * stt - st * st
  return Math.abs(det) < 1e-9 ? 0 : (n * stx - st * sx) / det
}

/**
 * The velocity in px/ms at the time `now` (the release). The times are relative to the newest sample, thus the slope of
 * the curve at t = 0 is the coefficient b of x = a + b t + c t².
 */
export function velocityOf(samples: readonly Sample[], now?: number): number {
  const newest = samples.at(-1)
  if (!newest) return 0
  // bottom-sheet/velocity: a pause of 40 ms before the release gives a velocity of 0.
  if (now !== undefined && now - newest.t >= TRACKER.gap) return 0
  const points = windowOf(samples)
  if (points.length < 2) return 0
  let v = 0
  if (points.length === 2) v = lineSlope(points, newest.t)
  else {
    // The normal equations of the quadratic fit: [s0 s1 s2; s1 s2 s3; s2 s3 s4] [a b c] = [y0 y1 y2].
    let s0 = 0
    let s1 = 0
    let s2 = 0
    let s3 = 0
    let s4 = 0
    let y0 = 0
    let y1 = 0
    let y2 = 0
    for (const p of points) {
      const t = p.t - newest.t
      const tt = t * t
      s0 += 1
      s1 += t
      s2 += tt
      s3 += tt * t
      s4 += tt * tt
      y0 += p.x
      y1 += p.x * t
      y2 += p.x * tt
    }
    const det = s0 * (s2 * s4 - s3 * s3) - s1 * (s1 * s4 - s3 * s2) + s2 * (s1 * s3 - s2 * s2)
    // Samples at the same time, or on a degenerate set: the line gives the slope.
    v = Math.abs(det) < 1e-6 ? lineSlope(points, newest.t) : (s0 * (y1 * s4 - s3 * y2) - y0 * (s1 * s4 - s3 * s2) + s2 * (s1 * y2 - y1 * s2)) / det
  }
  if (!Number.isFinite(v)) return 0
  return Math.max(-TRACKER.limit, Math.min(TRACKER.limit, v))
}

/** The tracker of one gesture: it keeps the samples of the last 100 ms. */
export class VelocityTracker {
  private samples: Sample[] = []

  /** Adds a sample. A sample with an earlier time than the newest sample starts a new trace. */
  add(t: number, x: number): void {
    const newest = this.samples.at(-1)
    if (newest && t < newest.t) this.samples = []
    this.samples.push({ t, x })
    while (this.samples.length > TRACKER.samples && t - (this.samples[0]?.t ?? t) > TRACKER.maxAge) this.samples.shift()
  }

  reset(): void {
    this.samples = []
  }

  /** The velocity in px/ms at the time `now` (bottom-sheet/velocity). */
  velocity(now?: number): number {
    return velocityOf(this.samples, now)
  }
}
