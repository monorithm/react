// @vitest-environment node
// The browser test of the Segmented control: the real CSS in a real Chrome. It measures the clauses that jsdom cannot
// compute: the sizes of the densities, the target, the pill, the colors of the themes and the states, the direction,
// the focus ring, and the motion. Each test name starts with the id of a clause of ir/contracts/segmented-control.json.
import type { Browser, Page } from 'playwright-core'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { SegmentedControl } from '@monorithm/react/components/segmented-control/segmented-control'
import { box, cell, openPage, style } from './harness'

let browser: Browser
let page: Page

const html = (node: ReactNode) => renderToStaticMarkup(<>{node}</>)
const Square = () => (
  <svg viewBox="0 0 16 16">
    <path d="M3 3h10v10H3z" />
  </svg>
)
const period = (props: { block?: boolean; size?: 'md' | 'lg'; disabled?: boolean } = {}) => (
  <SegmentedControl
    label="Period"
    defaultValue="30d"
    segments={[
      { value: '7d', label: '7d' },
      { value: '30d', label: '30d' },
      { value: '90d', label: '90d', disabled: true, disabledReason: 'Not possible in this view' },
      { value: '1y', label: '1 year' },
    ]}
    {...props}
  />
)
const layout = (
  <SegmentedControl
    label="Layout"
    segments={[
      { value: 'grid', label: 'Grid', icon: <Square /> },
      { value: 'list', label: 'List', icon: <Square />, iconOnly: true },
    ]}
  />
)

beforeAll(async () => {
  const body = [
    cell('focus', 'data-density="pointer"', html(period())),
    ...(['pointer', 'touch'] as const).map((d) => cell(`period-${d}`, `data-density="${d}"`, html(period()))),
    ...(['pointer', 'touch'] as const).map((d) => cell(`layout-${d}`, `data-density="${d}"`, html(layout))),
    ...(['pointer', 'touch'] as const).map((d) => cell(`tv-${d}`, `data-density="${d}"`, html(period({ size: 'lg' })))),
    cell('light', 'data-density="pointer" data-theme="light"', html(period())),
    cell('block', 'data-density="pointer"', html(period({ block: true }))),
    cell('rtl', 'data-density="pointer" dir="rtl"', html(period())),
    cell('layout-rtl', 'data-density="pointer" dir="rtl"', html(layout)),
    cell('off', 'data-density="pointer"', html(period({ disabled: true }))),
    cell('move', 'data-density="pointer"', html(period())),
    cell('reduced', 'data-density="pointer" data-motion="reduced"', html(period())),
  ].join('')
  ;({ browser, page } = await openPage(body))
  await page.emulateMedia({ reducedMotion: 'no-preference' })
}, 60_000)

afterAll(async () => {
  await browser?.close()
})

const group = (cellId: string) => `#${cellId} [role="radiogroup"]`
const seg = (cellId: string, name: string) => `#${cellId} [role="radio"]:has-text("${name}")`
const segAt = (cellId: string, i: number) => `#${cellId} [role="radio"] >> nth=${i}`
const pill = (cellId: string) => `#${cellId} [data-part="pill"]`
const label = (cellId: string, name: string) => `${seg(cellId, name)} [data-part="label"]`
const icon = (cellId: string, i: number) => `${segAt(cellId, i)} >> [data-part="icon"]`

/** Sets the index of the selected segment, as the component does at a change. The static page has no React events. */
const select = (cellId: string, index: number) =>
  page.evaluate(([s, i]) => (document.querySelector(s as string) as HTMLElement).style.setProperty('--seg-index', String(i)), [group(cellId), index] as const)

describe('Segmented control in Chrome', () => {
  it('segmented-control/density: the track is 32 px for pointer and 44 px for touch; the label 14 px and 16 px', async () => {
    expect((await box(page, group('period-pointer'))).height).toBe(32)
    expect((await box(page, group('period-touch'))).height).toBe(44)
    expect(await style(page, seg('period-pointer', '7d'), 'font-size')).toBe('14px')
    expect(await style(page, seg('period-touch', '7d'), 'font-size')).toBe('16px')
  })

  it('segmented-control/density: an icon is 16 px for pointer and 20 px for touch', async () => {
    const p = await box(page, icon('layout-pointer', 0))
    const t = await box(page, icon('layout-touch', 0))
    expect([p.width, p.height, t.width, t.height]).toEqual([16, 16, 20, 20])
  })

  it('segmented-control/tv: the large size is 40 px for pointer and 52 px for touch', async () => {
    expect((await box(page, group('tv-pointer'))).height).toBe(40)
    expect((await box(page, group('tv-touch'))).height).toBe(52)
  })

  it('segmented-control/target: each segment has the full height of the track and the minimum target on each axis', async () => {
    for (const [d, min] of [['pointer', 24], ['touch', 44]] as const) {
      const t = await box(page, group(`period-${d}`))
      for (const name of ['7d', '30d', '1 year']) {
        const s = await box(page, seg(`period-${d}`, name))
        expect([s.y, s.height]).toEqual([t.y, t.height])
        expect(s.width).toBeGreaterThanOrEqual(min)
        expect(s.height).toBeGreaterThanOrEqual(min)
      }
      const i = await box(page, segAt(`layout-${d}`, 1))
      expect(Math.min(i.width, i.height)).toBeGreaterThanOrEqual(min)
    }
  })

  it('segmented-control/pill: the pill fills the selected segment, 2 px from the edges of the track; the gap is 2 px', async () => {
    for (const d of ['pointer', 'touch']) {
      const t = await box(page, group(`period-${d}`))
      const p = await box(page, pill(`period-${d}`))
      const selected = await box(page, seg(`period-${d}`, '30d'))
      const first = await box(page, segAt(`period-${d}`, 0))
      const last = await box(page, segAt(`period-${d}`, 3))
      expect([p.x, p.width]).toEqual([selected.x, selected.width])
      expect([p.y - t.y, t.y + t.height - (p.y + p.height)]).toEqual([2, 2])
      expect([first.x - t.x, t.x + t.width - (last.x + last.width)]).toEqual([2, 2])
      expect(selected.x - (first.x + first.width)).toBe(2)
    }
  })

  it('segmented-control/radius: the track radius is 8 px; the pill radius is 6 px', async () => {
    expect(await style(page, group('period-pointer'), 'border-top-left-radius')).toBe('8px')
    expect(await style(page, group('period-touch'), 'border-top-left-radius')).toBe('8px')
    expect(await style(page, pill('period-pointer'), 'border-top-left-radius')).toBe('6px')
    expect(await style(page, pill('period-touch'), 'border-top-left-radius')).toBe('6px')
  })

  it('segmented-control/selected-sign: the pill fill with the raised shadow; the strong text color and weight (dark)', async () => {
    expect(await style(page, group('period-pointer'), 'background-color')).toBe('rgb(30, 30, 30)')
    expect(await style(page, pill('period-pointer'), 'background-color')).toBe('rgb(37, 37, 37)')
    // Tailwind puts the shadow after four empty layers of the ring utilities.
    expect(await style(page, pill('period-pointer'), 'box-shadow')).toMatch(
      /, rgba\(255, 255, 255, 0\.06\) 0px 0px 0px 1px, rgba\(0, 0, 0, 0\.4\) 0px 1px 2px 0px$/,
    )
    expect(await style(page, seg('period-pointer', '30d'), 'color')).toBe('rgb(245, 245, 245)')
    expect(await style(page, seg('period-pointer', '30d'), 'font-weight')).toBe('500')
    expect(await style(page, seg('period-pointer', '7d'), 'color')).toBe('rgb(158, 158, 158)')
    expect(await style(page, seg('period-pointer', '7d'), 'font-weight')).toBe('400')
  })

  it('segmented-control/selected-sign: the light theme has its own track, pill, and text colors', async () => {
    expect(await style(page, group('light'), 'background-color')).toBe('rgb(240, 240, 240)')
    expect(await style(page, pill('light'), 'background-color')).toBe('rgb(255, 255, 255)')
    expect(await style(page, pill('light'), 'box-shadow')).toMatch(/, rgba\(0, 0, 0, 0\.06\) 0px 0px 0px 1px, rgba\(0, 0, 0, 0\.08\) 0px 1px 2px 0px$/)
    expect(await style(page, seg('light', '30d'), 'color')).toBe('rgb(10, 10, 10)')
    expect(await style(page, seg('light', '7d'), 'color')).toBe('rgb(107, 107, 107)')
  })

  it('segmented-control/segment: the content is at the center, with 10 px at each side; the icon gap is 6 px', async () => {
    expect(await style(page, seg('period-pointer', '7d'), 'padding-left')).toBe('10px')
    expect(await style(page, seg('period-pointer', '7d'), 'padding-right')).toBe('10px')
    const s = await box(page, seg('period-pointer', '7d'))
    const l = await box(page, label('period-pointer', '7d'))
    expect(Math.abs(l.x + l.width / 2 - (s.x + s.width / 2))).toBeLessThanOrEqual(0.5)
    const i = await box(page, icon('layout-pointer', 0))
    const g = await box(page, label('layout-pointer', 'Grid'))
    expect(g.x - (i.x + i.width)).toBe(6)
  })

  it('segmented-control/selected-sign: the change of weight does not change the width of a segment', async () => {
    const widths = await Promise.all([0, 1, 3].map(async (i) => (await box(page, segAt('period-pointer', i))).width))
    await page.evaluate(() => {
      const radios = document.querySelectorAll('#period-pointer [role="radio"]')
      radios[1]?.removeAttribute('data-checked')
      radios[3]?.setAttribute('data-checked', '')
    })
    const after = await Promise.all([0, 1, 3].map(async (i) => (await box(page, segAt('period-pointer', i))).width))
    expect(after).toEqual(widths)
    await page.evaluate(() => {
      const radios = document.querySelectorAll('#period-pointer [role="radio"]')
      radios[3]?.removeAttribute('data-checked')
      radios[1]?.setAttribute('data-checked', '')
    })
  })

  it('segmented-control/full-width: a block control fills its container; each segment has the same width', async () => {
    expect((await box(page, group('block'))).width).toBe(320 - 2 * 8)
    const widths = await Promise.all([0, 1, 2, 3].map(async (i) => (await box(page, segAt('block', i))).width))
    expect(new Set(widths).size).toBe(1)
    // The control that is not a block also has segments of the same width: the width of the widest label.
    const inline = await Promise.all([0, 1, 2, 3].map(async (i) => (await box(page, segAt('period-pointer', i))).width))
    expect(new Set(inline).size).toBe(1)
    expect((await box(page, group('period-pointer'))).width).toBeLessThan(320 - 2 * 8)
  })

  it('segmented-control/hover: at hover, the label of a segment that is not selected has the body text color', async () => {
    const s = seg('period-pointer', '7d')
    await page.locator(s).scrollIntoViewIfNeeded()
    await page.hover(s)
    await page.waitForTimeout(250)
    expect(await style(page, s, 'color')).toBe('rgb(224, 224, 224)')
    await page.hover(seg('period-pointer', '30d'))
    await page.waitForTimeout(250)
    expect(await style(page, seg('period-pointer', '30d'), 'color')).toBe('rgb(245, 245, 245)')
    await page.hover(seg('period-pointer', '90d'))
    await page.waitForTimeout(250)
    expect(await style(page, seg('period-pointer', '90d'), 'color')).toBe('rgb(158, 158, 158)')
    await page.mouse.move(0, 0)
  })

  it('segmented-control/focus: Tab shows the ring on the segment: 2 px in the ring color, 2 px from the segment', async () => {
    // The static page has no React effects: the test gives the selected segment the tab index that Base UI gives it.
    await page.evaluate(() => document.querySelector('#focus [role="radio"][data-checked]')?.setAttribute('tabindex', '0'))
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => document.activeElement?.textContent)).toContain('30d')
    expect(await style(page, seg('focus', '30d'), 'outline-style')).toBe('solid')
    expect(await style(page, seg('focus', '30d'), 'outline-width')).toBe('2px')
    expect(await style(page, seg('focus', '30d'), 'outline-offset')).toBe('2px')
    expect(await style(page, seg('focus', '30d'), 'outline-color')).toBe('rgb(92, 163, 255)')
  })

  it('segmented-control/focus: a pointer press shows no ring', async () => {
    await page.locator(seg('period-touch', '7d')).scrollIntoViewIfNeeded()
    await page.click(seg('period-touch', '7d'))
    expect(await page.evaluate(() => document.activeElement?.textContent)).toContain('7d')
    expect(await style(page, seg('period-touch', '7d'), 'outline-style')).toBe('none')
  })

  it('segmented-control/disabled: a disabled segment has the opacity 0.4; a disabled group also dims the pill', async () => {
    expect(await style(page, seg('period-pointer', '90d'), 'opacity')).toBe('0.4')
    expect(await style(page, seg('period-pointer', '7d'), 'opacity')).toBe('1')
    expect(await style(page, pill('period-pointer'), 'opacity')).toBe('1')
    expect(await style(page, seg('off', '7d'), 'opacity')).toBe('0.4')
    expect(await style(page, pill('off'), 'opacity')).toBe('0.4')
  })

  it('segmented-control/direction: in right-to-left, the first segment is at the right, and the pill is on the selected segment', async () => {
    const first = await box(page, segAt('rtl', 0))
    const second = await box(page, segAt('rtl', 1))
    const t = await box(page, group('rtl'))
    expect(first.x).toBeGreaterThan(second.x)
    expect(t.x + t.width - (first.x + first.width)).toBe(2)
    const p = await box(page, pill('rtl'))
    expect([p.x, p.width]).toEqual([second.x, second.width])
  })

  it('segmented-control/direction: in right-to-left, an icon is at the right of its label', async () => {
    const i = await box(page, icon('layout-rtl', 0))
    const l = await box(page, label('layout-rtl', 'Grid'))
    expect(i.x - (l.x + l.width)).toBe(6)
  })

  it('segmented-control/motion: the pill moves with spring-control in 248 ms; the label color changes in 200 ms', async () => {
    expect(await style(page, pill('move'), 'transition-property')).toBe('translate')
    expect(await style(page, pill('move'), 'transition-duration')).toBe('0.248s')
    expect(await style(page, pill('move'), 'transition-timing-function')).toMatch(/^linear\(0 0%, .*, 1 100%\)$/)
    expect(await style(page, seg('move', '7d'), 'transition-property')).toBe('color')
    expect(await style(page, seg('move', '7d'), 'transition-duration')).toBe('0.2s')
    await select('move', 3)
    expect(await page.locator(pill('move')).evaluate((el) => el.getAnimations().length)).toBe(1)
    await page.waitForTimeout(400)
    const p = await box(page, pill('move'))
    const s = await box(page, segAt('move', 3))
    expect([p.x, p.width]).toEqual([s.x, s.width])
  })

  it('segmented-control/motion: where no spring applies, the pill moves in 280 ms with ease-out', async () => {
    // Chrome has the linear() function. The test reads the rule for a browser with no linear() function.
    const rules = await page.evaluate(() =>
      [...document.styleSheets].flatMap((sheet) =>
        [...sheet.cssRules].flatMap((r) => (r instanceof CSSLayerBlockRule ? [...r.cssRules] : [r])),
      ).filter((r): r is CSSSupportsRule => r instanceof CSSSupportsRule && r.conditionText.includes('not') && r.conditionText.includes('linear'))
        .map((r) => r.cssText),
    )
    expect(rules.join('\n')).toContain('transition-duration: var(--mono-duration-slide)')
    expect(rules.join('\n')).toContain('transition-timing-function: var(--mono-easing-out)')
  })

  it('segmented-control/motion-keyboard: after a key, the pill moves with spring-quick in 186 ms', async () => {
    // The static page has no React events: the test sets the attribute that a key sets (the jsdom test covers the key).
    await page.evaluate(() => document.querySelector('#move [role="radiogroup"]')?.setAttribute('data-input', 'keyboard'))
    expect(await style(page, pill('move'), 'transition-duration')).toBe('0.186s')
    expect(await style(page, pill('move'), 'transition-timing-function')).toMatch(/^linear\(0 0%, .*, 1 100%\)$/)
  })

  it('segmented-control/reduced-motion: the pill goes to the segment with no movement; the change of color stays', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    expect(await style(page, pill('move'), 'transition-property')).toBe('none')
    expect(await style(page, pill('move'), 'scale')).toBe('none')
    expect(await style(page, seg('move', '7d'), 'transition-duration')).toBe('0.2s')
    await select('move', 0)
    expect(await page.locator(pill('move')).evaluate((el) => el.getAnimations().length)).toBe(0)
    const p = await box(page, pill('move'))
    const s = await box(page, segAt('move', 0))
    expect([p.x, p.width]).toEqual([s.x, s.width])
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    // data-motion="reduced" on an ancestor stops the motion as the system option does.
    expect(await style(page, pill('reduced'), 'transition-property')).toBe('none')
    expect(await style(page, seg('reduced', '7d'), 'transition-property')).toBe('color')
  })
})
