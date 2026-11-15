// @vitest-environment node
// The browser test of the Chip: the real CSS in a real Chrome. It measures the clauses that jsdom cannot compute: the
// sizes of the densities, the shape, the target, the colors of the states in each theme, the icons, the direction, the
// focus ring, the press, and the motion. Each test name starts with the id of a clause of ir/contracts/chip.json.
import type { Browser, BrowserContext, Page } from 'playwright-core'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Chip } from '@monorithm/react/components/chip/chip'
import { ChipGroup } from '@monorithm/react/components/chip/chip.group'
import { box, cell, openPage, style } from './harness'

let browser: Browser
let page: Page
/** A context with touch and no hover: the media of a phone. */
let phoneContext: BrowserContext
let phone: Page

const html = (node: ReactNode) => renderToStaticMarkup(<>{node}</>)
const states = (
  <>
    <Chip className="off">Shoes</Chip>
    <Chip className="on" defaultPressed>
      On sale
    </Chip>
    <Chip className="menu-off" variant="menu">
      Size
    </Chip>
    <Chip className="menu-on" variant="menu" value="Red">
      Color
    </Chip>
  </>
)
const set = (
  <ChipGroup label="Filters" clearLabel="Clear filters">
    <Chip className="a" defaultPressed>
      A
    </Chip>
    <Chip className="b">B</Chip>
  </ChipGroup>
)

beforeAll(async () => {
  const body = [
    // The first cell has the first focusable element: the focus test presses Tab one time.
    cell('focus', 'data-density="pointer"', html(<Chip className="first">First</Chip>)),
    ...(['pointer', 'touch'] as const).map((d) => cell(`states-${d}`, `data-density="${d}"`, html(states))),
    ...(['dark', 'light'] as const).map((t) => cell(`theme-${t}`, `data-theme="${t}" data-density="pointer"`, html(states))),
    cell('target-touch', 'data-density="touch"', html(<Chip>S</Chip>)),
    cell('target-pointer', 'data-density="pointer"', html(<Chip>S</Chip>)),
    ...(['ltr', 'rtl'] as const).map((dir) =>
      cell(`dir-${dir}`, `data-density="pointer" dir="${dir}"`, html(<>{states}{set}</>)),
    ),
    cell('disabled', 'data-density="pointer"', html(<Chip disabled>Discount</Chip>)),
    cell('reduced', 'data-density="pointer" data-motion="reduced"', html(states)),
  ].join('')
  ;({ browser, page } = await openPage(body))
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  phoneContext = await browser.newContext({ hasTouch: true })
  phone = await phoneContext.newPage()
  await phone.setContent(await page.content())
}, 60_000)

afterAll(async () => {
  await browser?.close()
})

/** Scrolls the element into view, puts the pointer down at its center, and waits for the end of the transitions. */
async function pressAt(p: Page, selector: string): Promise<{ x: number; y: number; width: number; height: number }> {
  await p.locator(selector).first().scrollIntoViewIfNeeded()
  const rest = await box(p, selector)
  await p.mouse.move(rest.x + rest.width / 2, rest.y + rest.height / 2)
  await p.mouse.down()
  await p.waitForTimeout(250)
  return rest
}

/** Moves the pointer away and releases it: no click, thus the state of the chip does not change. */
async function release(p: Page) {
  await p.mouse.move(0, 0)
  await p.mouse.up()
  await p.waitForTimeout(250)
}

const part = (selector: string, name: string) => `${selector} [data-part="${name}"]`

describe('Chip in Chrome', () => {
  // The first test: a press in a later test moves the focus.
  it('chip/focus: Tab shows the ring: 2 px in the ring color, 2 px from the container, with the full radius', async () => {
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => document.activeElement?.textContent)).toBe('First')
    const s = '#focus .first'
    expect(await style(page, s, 'outline-style')).toBe('solid')
    expect(await style(page, s, 'outline-width')).toBe('2px')
    expect(await style(page, s, 'outline-offset')).toBe('2px')
    expect(await style(page, s, 'outline-color')).toBe('rgb(92, 163, 255)')
    // Chrome draws the outline along the border radius.
    expect(await style(page, s, 'border-top-left-radius')).toBe('999px')
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  })

  it('chip/density: pointer 32 px high, text 13 px, icons 16 px; touch 44 px, 14 px, and 20 px', async () => {
    for (const [d, h, text, icon] of [
      ['pointer', 32, '13px', 16],
      ['touch', 44, '14px', 20],
    ] as const) {
      for (const c of ['off', 'on', 'menu-off', 'menu-on']) expect((await box(page, `#states-${d} .${c}`)).height).toBe(h)
      expect(await style(page, `#states-${d} .off`, 'font-size')).toBe(text)
      const check = await box(page, part(`#states-${d} .on`, 'check'))
      const chevron = await box(page, part(`#states-${d} .menu-on`, 'chevron'))
      expect([check.width, check.height, chevron.width, chevron.height]).toEqual([icon, icon, icon, icon])
    }
  })

  it('chip/shape: the full radius, a border of 1 px, and 12 px of padding at the start side and at the end side', async () => {
    const s = '#dir-ltr .on'
    expect(await style(page, s, 'border-top-left-radius')).toBe('999px')
    expect(await style(page, s, 'border-bottom-right-radius')).toBe('999px')
    for (const side of ['top', 'right', 'bottom', 'left']) expect(await style(page, s, `border-${side}-width`)).toBe('1px')
    expect([await style(page, s, 'padding-inline-start'), await style(page, s, 'padding-inline-end')]).toEqual(['12px', '12px'])
    const chip = await box(page, s)
    expect((await box(page, part(s, 'check'))).x - (chip.x + 1)).toBe(12)
    const label = await box(page, part(s, 'label'))
    expect(chip.x + chip.width - 1 - (label.x + label.width)).toBe(12)
  })

  it('chip/target: a chip smaller than the target extends its target to 44 px; a point past its edge presses it', async () => {
    const s = '#target-touch button'
    expect(await style(page, s, 'width', '::after')).toBe('44px')
    expect(await style(page, s, 'height', '::after')).toBe('44px')
    const b = await box(page, s)
    expect(b.width).toBeLessThan(44)
    const hit = await page.evaluate(([x, y]) => document.elementFromPoint(x as number, y as number)?.closest('button')?.textContent, [b.x - 2, b.y + b.height / 2])
    expect(hit).toBe('S')
    // The pointer chip is 32 px high: more than the pointer target of 24 px. Thus its target is the chip.
    expect(await style(page, '#target-pointer button', 'min-height', '::after')).toBe('24px')
    expect((await box(page, '#target-pointer button')).height).toBe(32)
  })

  it('chip/off-sign: no fill, the line border, and the secondary label, in the two themes', async () => {
    for (const [t, line, label] of [
      ['dark', 'rgb(46, 46, 46)', 'rgb(176, 176, 176)'],
      ['light', 'rgb(224, 224, 224)', 'rgb(82, 82, 82)'],
    ] as const) {
      for (const c of ['off', 'menu-off']) {
        const s = `#theme-${t} .${c}`
        expect(await style(page, s, 'background-color')).toBe('rgba(0, 0, 0, 0)')
        expect(await style(page, s, 'border-top-color')).toBe(line)
        expect(await style(page, s, 'color')).toBe(label)
        expect(await style(page, s, 'font-weight')).toBe('400')
      }
    }
  })

  it('chip/on-sign: the accent tint fill, the accent text, the strong weight, and a check, in the two themes', async () => {
    for (const [t, fill, label] of [
      ['dark', 'rgba(92, 163, 255, 0.14)', 'rgb(92, 163, 255)'],
      ['light', 'rgba(31, 111, 224, 0.1)', 'rgb(26, 98, 204)'],
    ] as const) {
      for (const c of ['on', 'menu-on']) {
        const s = `#theme-${t} .${c}`
        expect(await style(page, s, 'background-color')).toBe(fill)
        expect(await style(page, s, 'color')).toBe(label)
        expect(await style(page, s, 'font-weight')).toBe('500')
      }
      expect(await page.locator(part(`#theme-${t} .on`, 'check')).count()).toBe(1)
    }
  })

  it('chip/on-border: the border of a chip that is on has no color; its width stays, thus the height does not change', async () => {
    const s = '#theme-dark .on'
    expect(await style(page, s, 'border-top-color')).toBe('rgba(0, 0, 0, 0)')
    expect(await style(page, s, 'border-top-width')).toBe('1px')
    expect((await box(page, s)).height).toBe((await box(page, '#theme-dark .off')).height)
  })

  it('chip/menu-value: a menu chip with a value has the on colors and the chevron, not a check', async () => {
    const s = '#theme-dark .menu-on'
    expect(await page.locator(part(s, 'chevron')).count()).toBe(1)
    expect(await page.locator(part(s, 'check')).count()).toBe(0)
    expect(await page.locator(part('#theme-dark .menu-off', 'chevron')).count()).toBe(1)
  })

  it('chip/icon: the check and the chevron are 6 px from the label, in the color of the label', async () => {
    const check = await box(page, part('#dir-ltr .on', 'check'))
    const onLabel = await box(page, part('#dir-ltr .on', 'label'))
    expect(onLabel.x - (check.x + check.width)).toBe(6)
    const menuLabel = await box(page, part('#dir-ltr .menu-on', 'label'))
    const chevron = await box(page, part('#dir-ltr .menu-on', 'chevron'))
    expect(chevron.x - (menuLabel.x + menuLabel.width)).toBe(6)
    expect(await style(page, `${part('#theme-dark .on', 'check')} path`, 'stroke')).toBe('rgb(92, 163, 255)')
    expect(await style(page, `${part('#theme-dark .menu-off', 'chevron')} path`, 'stroke')).toBe('rgb(176, 176, 176)')
  })

  it('chip/hover: a chip that is off gets the hover fill and the body text color; a chip that is on keeps its colors', async () => {
    const off = '#theme-dark .off'
    await page.locator(off).scrollIntoViewIfNeeded()
    await page.hover(off)
    await page.waitForTimeout(250)
    expect(await style(page, off, 'background-color')).toBe('rgb(30, 30, 30)')
    expect(await style(page, off, 'color')).toBe('rgb(224, 224, 224)')
    expect(await style(page, off, 'border-top-color')).toBe('rgb(46, 46, 46)')
    const on = '#theme-dark .on'
    await page.hover(on)
    await page.waitForTimeout(250)
    expect(await style(page, on, 'background-color')).toBe('rgba(92, 163, 255, 0.14)')
    expect(await style(page, on, 'color')).toBe('rgb(92, 163, 255)')
    await page.mouse.move(0, 0)
  })

  it('chip/hover: a device with no hover shows no hover state', async () => {
    expect(await phone.evaluate(() => matchMedia('(hover: none)').matches)).toBe(true)
    const off = '#theme-dark .off'
    await phone.locator(off).scrollIntoViewIfNeeded()
    await phone.hover(off)
    await phone.waitForTimeout(250)
    expect(await style(phone, off, 'background-color')).toBe('rgba(0, 0, 0, 0)')
    expect(await style(phone, off, 'color')).toBe('rgb(176, 176, 176)')
  })

  it('chip/press: at pointer down, the chip scales to 0.97 in 100 ms; the fill of the state stays', async () => {
    const s = '#theme-dark .off'
    expect(await style(page, s, 'transition-duration')).toBe('0.15s, 0.15s, 0.15s, 0.15s, 0.1s')
    const rest = await pressAt(page, s)
    expect((await box(page, s)).width / rest.width).toBeCloseTo(0.97, 3)
    expect(await style(page, s, 'background-color')).toBe('rgb(30, 30, 30)')
    await release(page)
    const on = '#theme-dark .on'
    const onRest = await pressAt(page, on)
    expect((await box(page, on)).width / onRest.width).toBeCloseTo(0.97, 3)
    expect(await style(page, on, 'background-color')).toBe('rgba(92, 163, 255, 0.14)')
    await release(page)
  })

  it('chip/press: on a phone, the chip shows only the pressed state: the scale, with no hover fill', async () => {
    const s = '#theme-dark .off'
    const rest = await pressAt(phone, s)
    expect((await box(phone, s)).width / rest.width).toBeCloseTo(0.97, 3)
    expect(await style(phone, s, 'background-color')).toBe('rgba(0, 0, 0, 0)')
    expect(await style(phone, s, 'color')).toBe('rgb(176, 176, 176)')
    await release(phone)
  })

  it('chip/focus: a pointer press shows no ring', async () => {
    const s = '#dir-ltr .b'
    await pressAt(page, s)
    await page.mouse.up()
    expect(await page.evaluate(() => document.activeElement?.textContent)).toBe('B')
    expect(await style(page, s, 'outline-style')).toBe('none')
  })

  it('chip/disabled: a disabled chip has the opacity 0.4; a press does not scale it or change its fill', async () => {
    const s = '#disabled button'
    expect(await style(page, s, 'opacity')).toBe('0.4')
    const before = await style(page, s, 'background-color')
    const rest = await pressAt(page, s)
    expect((await box(page, s)).width).toBe(rest.width)
    expect(await style(page, s, 'background-color')).toBe(before)
    await page.mouse.up()
    expect(await style(page, s, 'background-color')).toBe(before)
    expect(await page.locator(s).getAttribute('aria-pressed')).toBe('false')
  })

  it('chip/direction: in right-to-left, the check is at the right of the label and the chevron at the left', async () => {
    const chip = await box(page, '#dir-rtl .on')
    const check = await box(page, part('#dir-rtl .on', 'check'))
    const label = await box(page, part('#dir-rtl .on', 'label'))
    expect(check.x - (label.x + label.width)).toBe(6)
    expect(chip.x + chip.width - 1 - (check.x + check.width)).toBe(12)
    const menuLabel = await box(page, part('#dir-rtl .menu-on', 'label'))
    const chevron = await box(page, part('#dir-rtl .menu-on', 'chevron'))
    expect(menuLabel.x - (chevron.x + chevron.width)).toBe(6)
  })

  it('chip/direction: the chips of a set go from left to right, and from right to left in right-to-left', async () => {
    const [la, lb] = [await box(page, '#dir-ltr .a'), await box(page, '#dir-ltr .b')]
    const [ra, rb] = [await box(page, '#dir-rtl .a'), await box(page, '#dir-rtl .b')]
    expect(la.x).toBeLessThan(lb.x)
    expect(ra.x).toBeGreaterThan(rb.x)
  })

  it('chip/chevron-direction: the chevron points down, with no mirror, in the two directions', async () => {
    const d = (dir: string) => page.locator(part(`#dir-${dir} .menu-on`, 'chevron')).getAttribute('class')
    expect(await d('rtl')).toBe(await d('ltr'))
    for (const dir of ['ltr', 'rtl']) {
      const s = part(`#dir-${dir} .menu-on`, 'chevron')
      expect(await style(page, s, 'transform')).toBe('none')
      expect(await style(page, s, 'scale')).toBe('none')
      // The matrix from the drawing to the screen has no mirror: x and y keep their sign.
      const m = await page.locator(s).evaluate((el) => {
        const ctm = (el as SVGGraphicsElement).getScreenCTM()
        return ctm ? [ctm.a > 0, ctm.d > 0, ctm.b, ctm.c] : null
      })
      expect(m).toEqual([true, true, 0, 0])
    }
  })

  it('chip/motion: the fill, the border, and the label color change in 150 ms with ease', async () => {
    const s = '#theme-dark .menu-off'
    expect(await style(page, s, 'transition-property')).toBe('background-color, border-color, color, opacity, scale')
    expect(await style(page, s, 'transition-timing-function')).toBe('cubic-bezier(0.25, 0.1, 0.25, 1)')
    expect((await style(page, s, 'transition-duration')).split(', ').slice(0, 3)).toEqual(['0.15s', '0.15s', '0.15s'])
  })

  it('chip/motion: with reduced motion, the press has no scale, the colors have no transition, and the change of color stays', async () => {
    const s = '#reduced .off'
    expect(await style(page, s, 'transition-property')).toBe('none')
    expect(await style(page, '#reduced .on', 'background-color')).toBe('rgba(92, 163, 255, 0.14)')
    const rest = await pressAt(page, s)
    expect((await box(page, s)).width).toBe(rest.width)
    await release(page)
  })

  it('chip/motion: with the reduced motion of the system, the colors have no transition', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    expect(await style(page, '#theme-dark .off', 'transition-property')).toBe('none')
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    expect(await style(page, '#theme-dark .off', 'transition-property')).not.toBe('none')
  })

  it('chip/gap: the chips of a set have a gap of 8 px', async () => {
    const [a, b] = [await box(page, '#dir-ltr .a'), await box(page, '#dir-ltr .b')]
    expect(b.x - (a.x + a.width)).toBe(8)
    expect(await style(page, '#dir-ltr [data-part="set"]', 'column-gap')).toBe('8px')
  })

  it('chip/menu: the geometry gives the menu offset of 4 px from the chip', async () => {
    // The Menu comes later in the build order. It reads this offset.
    expect(await style(page, '#theme-dark .menu-on', '--mono-chip-menu-offset')).toBe('4px')
  })
})
