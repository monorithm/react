// The tests of the snap rule of the sheet. Each name starts with the id of a clause of ir/contracts/bottom-sheet.json.
// The position x is the height of the sheet in view (0 is closed), and the velocity is in px/ms, positive upward.
import { describe, expect, it } from 'vitest'
import {
  band,
  closeLine,
  FLING,
  glide,
  glideVelocity,
  PROJECTION,
  project,
  releaseTarget,
  snapPoints,
  stepFrom,
} from './bottom-sheet.snap'

// The sheet of the language page: Half 300 px and Full 560 px, on a screen of 600 px with a top gap of 40 px.
const screen = { viewport: 600, full: 560, ratio: 0.5, peek: 140, natural: 0 }
const modal = snapPoints('modal', screen).map((p) => p.x)
const persistent = snapPoints('persistent', screen).map((p) => p.x)

describe('Bottom sheet snap rule', () => {
  it('bottom-sheet/snap-values: Half is 50 % of the screen height; Full is the screen less the top gap; Peek is 140 px', () => {
    expect(snapPoints('persistent', { viewport: 800, full: 800 - 47 - 16, ratio: 0.5, peek: 140, natural: 0 })).toEqual([
      { name: 'peek', x: 140 },
      { name: 'half', x: 400 },
      { name: 'full', x: 737 },
    ])
  })

  it('bottom-sheet/modal-snaps: a modal sheet has the snap points Half and Full', () => {
    expect(snapPoints('modal', screen)).toEqual([
      { name: 'half', x: 300 },
      { name: 'full', x: 560 },
    ])
  })

  it('bottom-sheet/persistent-snaps: a persistent sheet has the snap points Peek, Half, and Full', () => {
    expect(snapPoints('persistent', screen).map((p) => p.name)).toEqual(['peek', 'half', 'full'])
  })

  it('bottom-sheet/short-content: content shorter than Half gives one snap point at the height of the content', () => {
    expect(snapPoints('modal', { ...screen, natural: 220 })).toEqual([{ name: 'half', x: 220 }])
    expect(snapPoints('persistent', { ...screen, natural: 220 })).toEqual([{ name: 'half', x: 220 }])
    // Content as high as Half or more keeps the snap points. A height that is not known (0) keeps them too.
    expect(snapPoints('modal', { ...screen, natural: 300 })).toHaveLength(2)
    expect(snapPoints('modal', { ...screen, natural: 0 })).toHaveLength(2)
  })

  it('bottom-sheet/projection: P = x + v × 0.4995 s, and the snap point nearest to P wins', () => {
    expect(PROJECTION).toBe(499.5)
    expect(project(300, 0.2)).toBeCloseTo(399.9, 9)
    // Slow releases (not a fling): the nearest point to P.
    expect(releaseTarget({ x: 400, v: 0.2, points: modal, closable: true })).toBe(560) // P = 499.9
    expect(releaseTarget({ x: 400, v: -0.2, points: modal, closable: true })).toBe(300) // P = 300.1
    expect(releaseTarget({ x: 420, v: 0, points: modal, closable: true })).toBe(300) // P = 420: Half is nearer
    expect(releaseTarget({ x: 440, v: 0, points: modal, closable: true })).toBe(560) // P = 440: Full is nearer
  })

  it('bottom-sheet/fling: a release faster than 0.5 px/ms goes to the next snap point in its direction', () => {
    // A tall screen: Half 600 px and Full 1150 px. At Half, v = 0.51 gives P = 854.7: Half is nearer, but a fling goes on.
    const tall = snapPoints('modal', { viewport: 1200, full: 1150, ratio: 0.5, peek: 140, natural: 0 }).map((p) => p.x)
    expect(releaseTarget({ x: 600, v: 0.51, points: tall, closable: true })).toBe(1150)
    // v = 0.45 is not a fling: P = 824.8, and Half is nearer.
    expect(releaseTarget({ x: 600, v: 0.45, points: tall, closable: true })).toBe(600)
    expect(FLING).toBe(0.5)
  })

  it('bottom-sheet/fling: a fling goes farther than the next snap point when P is farther', () => {
    // Persistent, from Peek: a strong fling up projects past Full, thus it goes to Full, not to Half.
    expect(releaseTarget({ x: 140, v: 1.2, points: persistent, closable: false })).toBe(560)
    // A small fling up from Peek goes to the next point: Half.
    expect(releaseTarget({ x: 140, v: 0.55, points: persistent, closable: false })).toBe(300)
    // A strong fling down from Full projects below the close line: the modal sheet closes.
    expect(releaseTarget({ x: 560, v: -1.5, points: modal, closable: true })).toBe(0)
  })

  it('bottom-sheet/close-line: the close line is 25 % below Half; with Half at 300 px it is at 225 px', () => {
    expect(closeLine(300)).toBe(225)
    // P below the close line closes a modal sheet; P above it goes back to Half.
    expect(releaseTarget({ x: 224, v: 0, points: modal, closable: true })).toBe(0)
    expect(releaseTarget({ x: 226, v: 0, points: modal, closable: true })).toBe(300)
    // A persistent sheet never closes: the lowest point wins.
    expect(releaseTarget({ x: 60, v: -0.4, points: persistent, closable: false })).toBe(140)
  })

  it('bottom-sheet/gestures: a drag up from Half goes to Full; a drag down from Full goes to Half; down from Half closes', () => {
    // Each drag moves 100 px and ends with the finger at 0.4 px/ms.
    expect(releaseTarget({ x: 400, v: 0.4, points: modal, closable: true })).toBe(560)
    expect(releaseTarget({ x: 460, v: -0.4, points: modal, closable: true })).toBe(300)
    expect(releaseTarget({ x: 200, v: -0.4, points: modal, closable: true })).toBe(0)
    // Each fling at 1 px/ms after a move of 20 px.
    expect(releaseTarget({ x: 320, v: 1, points: modal, closable: true })).toBe(560)
    expect(releaseTarget({ x: 540, v: -0.6, points: modal, closable: true })).toBe(300)
    expect(releaseTarget({ x: 280, v: -1, points: modal, closable: true })).toBe(0)
  })

  it('bottom-sheet/rubber-band: past Full, the sheet moves one third of the finger distance', () => {
    expect(band(560 + 90, 560)).toBe(590)
    expect(band(500, 560)).toBe(500)
    // The lowest point of a persistent sheet has the same band. Below 0, the sheet does not move.
    expect(band(140 - 60, 560, 140)).toBe(120)
    expect(band(-50, 560)).toBe(0)
    // After the release past Full, the sheet goes back to Full.
    expect(releaseTarget({ x: band(650, 560), v: 0.3, points: modal, closable: true })).toBe(560)
  })

  it('bottom-sheet/handle-keys: the step above and below a position gives the next snap point in each direction', () => {
    const points = snapPoints('persistent', screen)
    expect(stepFrom(points, 300, 1)?.name).toBe('full')
    expect(stepFrom(points, 300, -1)?.name).toBe('peek')
    expect(stepFrom(points, 560, 1)).toBeUndefined()
    expect(stepFrom(points, 140, -1)).toBeUndefined()
  })

  it('bottom-sheet/content-fling: the free scroll of the content decays to P and stops', () => {
    expect(glide(0, 2)).toBe(0)
    expect(glide(100_000, 2)).toBeCloseTo(2 * PROJECTION, 6)
    expect(glideVelocity(0, 2)).toBe(2)
    expect(glideVelocity(PROJECTION, 2)).toBeCloseTo(2 / Math.E, 9)
  })
})
