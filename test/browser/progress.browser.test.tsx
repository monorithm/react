// @vitest-environment node
// The browser test of the bar, the spinner, and the skeleton: the real CSS in a real Chrome. It measures the clauses that
// jsdom cannot compute: the sizes of the densities, the colors of the themes, the label line, the direction, the focus
// ring, and the motion. Each test name starts with the id of a clause of ir/contracts/progress.json.
import type { Browser, Page } from 'playwright-core'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Button } from '@monorithm/react/components/button/button'
import { ProgressBar, Skeleton, SkeletonShape, Spinner } from '@monorithm/react/components/progress/progress'
import { box, cell, openPage, style } from './harness'

let browser: Browser
let page: Page

const html = (node: React.ReactNode) => renderToStaticMarkup(<>{node}</>)
const bars = (label: string) => (
  <>
    <ProgressBar label={label} value={64} className="determinate" />
    <ProgressBar label={label} className="indeterminate" />
  </>
)
const shapes = (
  <>
    <SkeletonShape className="text w-1/2" />
    <SkeletonShape kind="media" radius="full" className="avatar size-(--mono-size-avatar-md)" />
  </>
)

beforeAll(async () => {
  const body = [
    // The first cell: the parts have no focus stop, thus the first Tab goes to the loading button after them.
    cell(
      'focus',
      'data-density="pointer"',
      html(
        <>
          <ProgressBar label="Uploading 3 photos" value={64} />
          <Spinner label="Saving" />
          <Skeleton label="Loading products" loading shapes={shapes} />
          <Button loading loadingLabel="Saving" className="loading">
            Save
          </Button>
        </>,
      ),
    ),
    cell('density-pointer', 'data-density="pointer"', html(<>{bars('Uploading 3 photos')}<Spinner label="Saving" /></>)),
    cell('density-touch', 'data-density="touch"', html(<>{bars('Uploading 3 photos')}<Spinner label="Saving" /></>)),
    ...(['dark', 'light'] as const).map((theme) =>
      cell(`theme-${theme}`, `data-theme="${theme}" data-density="pointer"`, html(<>{bars('Uploading 3 photos')}{shapes}</>)),
    ),
    ...(['ltr', 'rtl'] as const).map((dir) =>
      cell(`dir-${dir}`, `data-density="pointer" dir="${dir}"`, html(<>{bars('Uploading 3 photos')}<Spinner label="Saving" />{shapes}</>)),
    ),
    // progress/spinner: the spinner has the color of the text next to it. The spinner of a loading button is the reference.
    cell(
      'spinner',
      'data-density="pointer" class="text-mono-fg-muted"',
      html(
        <>
          <Spinner label="Saving" />
          <Button loading loadingLabel="Saving" className="button">
            Save
          </Button>
        </>,
      ),
    ),
    // progress/size: a text shape and the line of text that it replaces, in the same text style.
    cell(
      'size',
      'data-density="pointer" class="text-mono-body"',
      html(
        <>
          <Skeleton label="Loading the name" loading shapes={<SkeletonShape className="w-1/2" />} className="loading" />
          <Skeleton label="Loading the name" loading={false} shapes={<SkeletonShape className="w-1/2" />} className="loaded">
            <p>Blue cotton shirt</p>
          </Skeleton>
        </>,
      ),
    ),
    cell('target', 'data-density="touch"', html(<Button size="sm" loading loadingLabel="Saving" className="loading">Save</Button>)),
    cell('reduced', 'data-density="pointer" data-motion="reduced"', html(<>{bars('Uploading 3 photos')}<Spinner label="Saving" />{shapes}</>)),
  ].join('')
  ;({ browser, page } = await openPage(body))
}, 60_000)

afterAll(async () => {
  await browser?.close()
})

const bar = (cellId: string, kind: 'determinate' | 'indeterminate', part: string) => `#${cellId} .${kind} [data-part="${part}"]`
const spinner = (cellId: string) => `#${cellId} [data-variant="spinner"] [data-part="spinner"]`

/** Pauses each animation of the element (or of its ::after) at a time, in ms. */
async function at(selector: string, ms: number, pseudo: '::after' | null = null): Promise<void> {
  await page
    .locator(selector)
    .first()
    .evaluate(
      (el, [t, ps]) => {
        for (const a of el.getAnimations({ subtree: true })) {
          if (((a.effect as KeyframeEffect).pseudoElement ?? null) !== ps) continue
          a.pause()
          a.currentTime = t as number
        }
      },
      [ms, pseudo] as const,
    )
}

/** The matrix of the transform of the element (or of its ::after): [a, b, c, d, e]. The browser parses it. */
const matrix = (selector: string, pseudo?: string): Promise<number[]> =>
  page
    .locator(selector)
    .first()
    .evaluate((el, ps) => {
      const m = new DOMMatrixReadOnly(getComputedStyle(el, ps ?? null).transform)
      return [m.a, m.b, m.c, m.d, m.e]
    }, pseudo)

/** The size of the element from its computed style: a turn of the spinner does not change it, as it changes the box. */
const size = async (selector: string): Promise<number[]> => [
  parseFloat(await style(page, selector, 'width')),
  parseFloat(await style(page, selector, 'height')),
]

/** easing.linear: the computed value of the token. Its curve is the curve of the keyword linear. */
const LINEAR = 'cubic-bezier(0, 0, 1, 1)'

describe('Progress and skeleton in Chrome', () => {
  it('progress/bar: the track is 6 px high, with the full radius and the selected color; the fill has the accent color', async () => {
    for (const [theme, track, fill] of [
      ['dark', 'rgb(37, 37, 37)', 'rgb(92, 163, 255)'],
      ['light', 'rgb(235, 235, 235)', 'rgb(31, 111, 224)'],
    ] as const) {
      expect((await box(page, bar(`theme-${theme}`, 'determinate', 'track'))).height).toBe(6)
      expect(await style(page, bar(`theme-${theme}`, 'determinate', 'track'), 'background-color')).toBe(track)
      expect(await style(page, bar(`theme-${theme}`, 'determinate', 'track'), 'border-top-left-radius')).toBe('999px')
      expect(await style(page, bar(`theme-${theme}`, 'determinate', 'fill'), 'background-color')).toBe(fill)
      expect(await style(page, bar(`theme-${theme}`, 'determinate', 'fill'), 'border-top-left-radius')).toBe('999px')
    }
  })

  it('progress/density: the track is 6 px high in the two densities; the text is 13 px for pointer and 14 px for touch', async () => {
    for (const [density, size] of [
      ['pointer', '13px'],
      ['touch', '14px'],
    ] as const) {
      expect((await box(page, bar(`density-${density}`, 'determinate', 'track'))).height).toBe(6)
      expect((await box(page, bar(`density-${density}`, 'indeterminate', 'track'))).height).toBe(6)
      expect(await style(page, bar(`density-${density}`, 'determinate', 'label'), 'font-size')).toBe(size)
      expect(await style(page, bar(`density-${density}`, 'determinate', 'value'), 'font-size')).toBe(size)
    }
  })

  it('progress/label: the label and the percentage are on one line, 8 px above the track, with tabular figures', async () => {
    const root = await box(page, '#dir-ltr .determinate')
    const label = await box(page, bar('dir-ltr', 'determinate', 'label'))
    const value = await box(page, bar('dir-ltr', 'determinate', 'value'))
    const track = await box(page, bar('dir-ltr', 'determinate', 'track'))
    expect(value.y).toBe(label.y)
    expect(value.height).toBe(label.height)
    expect(track.y - (label.y + label.height)).toBe(8)
    // The label is at the start side, and the percentage at the end side.
    expect(label.x).toBe(root.x)
    expect(value.x + value.width).toBe(root.x + root.width)
    expect(await page.locator(bar('dir-ltr', 'determinate', 'value')).first().textContent()).toBe('64%')
    expect(await style(page, bar('dir-ltr', 'determinate', 'value'), 'font-variant-numeric')).toBe('tabular-nums')
    expect(await style(page, bar('theme-dark', 'determinate', 'label'), 'color')).toBe('rgb(224, 224, 224)')
    expect(await style(page, bar('theme-dark', 'determinate', 'value'), 'color')).toBe('rgb(158, 158, 158)')
  })

  it('progress/value-sign: the length of the fill shows the value: 64 % of the track', async () => {
    const track = await box(page, bar('dir-ltr', 'determinate', 'track'))
    const fill = await box(page, bar('dir-ltr', 'determinate', 'fill'))
    expect(fill.x).toBe(track.x)
    expect(fill.width / track.width).toBeCloseTo(0.64, 3)
  })

  it('progress/direction: in right-to-left, the fill grows from the right; the label is at the right, the percentage at the left', async () => {
    const root = await box(page, '#dir-rtl .determinate')
    const label = await box(page, bar('dir-rtl', 'determinate', 'label'))
    const value = await box(page, bar('dir-rtl', 'determinate', 'value'))
    const track = await box(page, bar('dir-rtl', 'determinate', 'track'))
    const fill = await box(page, bar('dir-rtl', 'determinate', 'fill'))
    expect(label.x + label.width).toBe(root.x + root.width)
    expect(value.x).toBe(root.x)
    expect(fill.x + fill.width).toBeCloseTo(track.x + track.width, 3)
    expect(fill.width / track.width).toBeCloseTo(0.64, 3)
  })

  it('progress/bar-motion: the fill follows a value with spring-control over 248 ms, and changes its scale, not its width', async () => {
    const s = bar('dir-ltr', 'determinate', 'fill')
    expect(await style(page, s, 'transition-property')).toBe('scale')
    expect(await style(page, s, 'transition-duration')).toBe('0.248s')
    // Chrome writes the computed linear() with a stop for each sample: the first is 0 at 0 %, the last is 1 at 100 %.
    const curve = await style(page, s, 'transition-timing-function')
    expect(curve).toMatch(/^linear\(0 0%, /)
    expect(curve).toMatch(/, 1 100%\)$/)
    expect(await style(page, s, 'width')).toBe(`${(await box(page, bar('dir-ltr', 'determinate', 'track'))).width}px`)
    expect(await style(page, s, 'scale')).toBe('0.64 1')
  })

  it('progress/indeterminate-motion: the fill moves from the start edge to the end edge in a loop of 1,500 ms, linear', async () => {
    const s = bar('dir-ltr', 'indeterminate', 'fill')
    expect(await style(page, s, 'animation-name')).toBe('mono-progress-sweep')
    expect(await style(page, s, 'animation-duration')).toBe('1.5s')
    expect(await style(page, s, 'animation-timing-function')).toBe(LINEAR)
    expect(await style(page, s, 'animation-iteration-count')).toBe('infinite')
    const track = await box(page, bar('dir-ltr', 'indeterminate', 'track'))
    // At the start of the loop, the fill is out of the track at the start side; at one quarter, half of it is in the track.
    await at(s, 0)
    expect((await box(page, s)).x - track.x).toBeCloseTo(-track.width, 1)
    await at(s, 375)
    expect((await box(page, s)).x - track.x).toBeCloseTo(-track.width / 2, 1)
    await at(s, 1125)
    expect((await box(page, s)).x - track.x).toBeCloseTo(track.width / 2, 1)
  })

  it('progress/indeterminate-motion: in right-to-left, the fill moves from the right edge to the left edge', async () => {
    const s = bar('dir-rtl', 'indeterminate', 'fill')
    const track = await box(page, bar('dir-rtl', 'indeterminate', 'track'))
    await at(s, 375)
    expect((await box(page, s)).x - track.x).toBeCloseTo(track.width / 2, 1)
    await at(s, 1125)
    expect((await box(page, s)).x - track.x).toBeCloseTo(-track.width / 2, 1)
  })

  it('progress/size: the bar with a value and the indeterminate bar have one height; a text shape is one line of the text', async () => {
    for (const d of ['pointer', 'touch']) {
      expect((await box(page, `#density-${d} .indeterminate`)).height).toBe((await box(page, `#density-${d} .determinate`)).height)
    }
    const shape = await box(page, '#size .loading [data-part="shape"]')
    const line = await box(page, '#size .loaded p')
    expect(shape.height).toBe(line.height)
    expect((await box(page, '#size .loading')).height).toBe((await box(page, '#size .loaded')).height)
    // An avatar shape has the size of the real avatar.
    const avatar = await box(page, '#theme-dark .avatar')
    expect([avatar.width, avatar.height]).toEqual([40, 40])
  })

  it('progress/spinner-delay: before the delay, the spinner is invisible but keeps its box', async () => {
    expect(await style(page, spinner('density-pointer'), 'visibility')).toBe('hidden')
    expect(await size(spinner('density-pointer'))).toEqual([16, 16])
    expect((await box(page, '#density-pointer [data-variant="spinner"]')).width).toBe(16)
  })

  it('progress/spinner: the icon size of the density, the color of the text next to it, one turn in 1,000 ms, linear', async () => {
    expect(await size(spinner('density-pointer'))).toEqual([16, 16])
    expect(await size(spinner('density-touch'))).toEqual([20, 20])
    expect(await style(page, '#spinner [data-variant="spinner"] circle', 'stroke')).toBe('rgb(158, 158, 158)')
    expect(await style(page, spinner('spinner'), 'animation-name')).toBe('mono-progress-spin')
    expect(await style(page, spinner('spinner'), 'animation-duration')).toBe('1s')
    expect(await style(page, spinner('spinner'), 'animation-timing-function')).toBe(LINEAR)
    expect(await style(page, spinner('spinner'), 'animation-iteration-count')).toBe('infinite')
  })

  it('progress/spinner: the spinner and the spinner of a loading button have the same size and the same turn', async () => {
    const button = '#spinner .button [data-part="spinner"]'
    expect(await size(spinner('spinner'))).toEqual(await size(button))
    expect(await style(page, spinner('spinner'), 'animation-duration')).toBe(await style(page, button, 'animation-duration'))
    // The button writes the keyword linear; this spinner writes the token easing.linear. The two curves are the same.
    expect(await style(page, button, 'animation-timing-function')).toBe('linear')
    expect(await style(page, spinner('spinner'), 'animation-timing-function')).toBe(LINEAR)
  })

  it('progress/spinner-direction: the spinner turns clockwise in each language, with no mirror', async () => {
    for (const dir of ['ltr', 'rtl']) {
      await at(spinner(`dir-${dir}`), 250)
      // One quarter of a turn, clockwise on the screen: rotate(90deg).
      const m = await matrix(spinner(`dir-${dir}`))
      expect(m.slice(0, 4).map((v) => Math.round(v * 1000) / 1000 + 0)).toEqual([0, 1, -1, 0])
      expect(await style(page, spinner(`dir-${dir}`), 'scale')).toBe('none')
    }
  })

  it('progress/skeleton-shape: a shape has the selected color; a text shape has the 6 px radius, an avatar shape the full radius', async () => {
    expect(await style(page, '#theme-dark .text', 'background-color')).toBe('rgb(37, 37, 37)')
    expect(await style(page, '#theme-light .text', 'background-color')).toBe('rgb(235, 235, 235)')
    expect(await style(page, '#theme-dark .text', 'border-top-left-radius')).toBe('6px')
    expect(await style(page, '#theme-dark .avatar', 'border-top-left-radius')).toBe('999px')
  })

  it('progress/shimmer: the shimmer is white at 5 % in the dark theme and black at 4 % in the light theme, in loops of 1,500 ms', async () => {
    expect(await style(page, '#theme-dark .text', 'background-image', '::after')).toContain('rgba(255, 255, 255, 0.05)')
    expect(await style(page, '#theme-light .text', 'background-image', '::after')).toContain('rgba(0, 0, 0, 0.04)')
    expect(await style(page, '#theme-dark .text', 'animation-name', '::after')).toBe('mono-progress-sweep')
    expect(await style(page, '#theme-dark .text', 'animation-duration', '::after')).toBe('1.5s')
    expect(await style(page, '#theme-dark .text', 'animation-timing-function', '::after')).toBe(LINEAR)
  })

  it('progress/shimmer-stop: the loop of the shimmer stops after 5,000 ms', async () => {
    const timing = await page
      .locator('#theme-dark .text')
      .evaluate((el) => el.getAnimations({ subtree: true }).map((a) => a.effect?.getComputedTiming().activeDuration))
    expect(timing.map((t) => Math.round(Number(t)))).toEqual([5000])
  })

  it('progress/shimmer-direction: the shimmer moves from the start edge to the end edge; in right-to-left, from right to left', async () => {
    for (const [dir, sign] of [
      ['ltr', 1],
      ['rtl', -1],
    ] as const) {
      const s = `#dir-${dir} .text`
      await at(s, 375, '::after')
      const [a] = (await matrix(s, '::after')).slice(4)
      await at(s, 750, '::after')
      const [b] = (await matrix(s, '::after')).slice(4)
      expect(Math.sign((b as number) - (a as number))).toBe(sign)
    }
  })

  it('progress/animate: the motion of the bar, the spinner, and the shimmer changes only the opacity and the transform', async () => {
    const props = await page.evaluate(() => {
      const seen = new Set<string>()
      for (const a of document.getAnimations()) {
        for (const k of (a.effect as KeyframeEffect).getKeyframes()) {
          for (const p of Object.keys(k)) if (!['offset', 'computedOffset', 'easing', 'composite'].includes(p)) seen.add(p)
        }
      }
      return [...seen].sort()
    })
    // The pulse of reduced motion (the cell with data-motion="reduced") changes the opacity; the other loops the transform.
    expect(props).toEqual(['opacity', 'transform'])
    expect(await style(page, bar('dir-ltr', 'determinate', 'fill'), 'transition-property')).toBe('scale')
  })

  it('progress/motion: with data-motion="reduced", the spinner and the indeterminate fill pulse; no shimmer; the bar jumps', async () => {
    expect(await style(page, spinner('reduced'), 'animation-name')).toBe('mono-progress-pulse')
    expect(await style(page, spinner('reduced'), 'animation-duration')).toBe('2s')
    const s = bar('reduced', 'indeterminate', 'fill')
    expect(await style(page, s, 'animation-name')).toBe('mono-progress-pulse')
    // The indeterminate fill does not move: it fills the track.
    const track = await box(page, bar('reduced', 'indeterminate', 'track'))
    const fill = await box(page, s)
    expect([fill.x, fill.width]).toEqual([track.x, track.width])
    expect(await style(page, '#reduced .text', 'display', '::after')).toBe('none')
    expect(await style(page, bar('reduced', 'determinate', 'fill'), 'transition-property')).toBe('none')
    // The pulse: the opacity goes from 1 to 0.4 at the middle of the cycle, and back.
    await at(spinner('reduced'), 1000)
    expect(await style(page, spinner('reduced'), 'opacity')).toBe('0.4')
    await at(spinner('reduced'), 500)
    expect(Number(await style(page, spinner('reduced'), 'opacity'))).toBeCloseTo(0.7, 3)
  })

  it('progress/motion: with the reduced motion of the system, the spinner pulses and the skeleton has no shimmer', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    expect(await style(page, spinner('density-pointer'), 'animation-name')).toBe('mono-progress-pulse')
    expect(await style(page, bar('density-pointer', 'indeterminate', 'fill'), 'animation-name')).toBe('mono-progress-pulse')
    expect(await style(page, bar('density-pointer', 'determinate', 'fill'), 'transition-property')).toBe('none')
    expect(await style(page, '#theme-dark .text', 'display', '::after')).toBe('none')
    // The colors stay.
    expect(await style(page, bar('theme-dark', 'determinate', 'fill'), 'background-color')).toBe('rgb(92, 163, 255)')
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    expect(await style(page, spinner('density-pointer'), 'animation-name')).toBe('mono-progress-spin')
  })

  it('progress/focus: Tab does not stop on a part; a loading button keeps its ring: 2 px in the ring color, 2 px from it', async () => {
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => document.activeElement?.className.includes('loading') && document.activeElement.closest('#focus') !== null)).toBe(true)
    expect(await style(page, '#focus .loading', 'outline-width')).toBe('2px')
    expect(await style(page, '#focus .loading', 'outline-offset')).toBe('2px')
    expect(await style(page, '#focus .loading', 'outline-color')).toBe('rgb(92, 163, 255)')
    expect(await style(page, '#focus .loading', 'outline-style')).toBe('solid')
  })

  it('progress/target: no part is a target; a small loading button keeps a target of 44 px for touch', async () => {
    for (const s of ['#focus [role="progressbar"]', '#focus [data-variant="spinner"]', '#focus [data-part="shape"]']) {
      expect(await style(page, s, 'cursor')).toBe('auto')
    }
    expect(await style(page, '#target .loading', 'height', '::after')).toBe('44px')
    expect(parseFloat(await style(page, '#target .loading', 'width', '::after'))).toBeGreaterThanOrEqual(44)
  })

  it('progress/no-disabled: no part has the disabled opacity', async () => {
    for (const s of ['#focus [data-variant="bar"]', '#focus [data-variant="spinner"]', '#focus [data-variant="skeleton"]']) {
      expect(await style(page, s, 'opacity')).toBe('1')
    }
  })
})
