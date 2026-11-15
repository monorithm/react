// @vitest-environment node
// The browser test of the Button and the Icon button: the real CSS in a real Chrome. It measures the clauses that jsdom
// cannot compute: the sizes of the densities, the target, the colors of the variants, the states, the direction, and the
// motion. Each test name starts with the id of a clause of ir/contracts/button.json or ir/contracts/icon-button.json.
import type { Browser, Page } from 'playwright-core'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Button } from '@monorithm/react/components/button/button'
import { IconButton } from '@monorithm/react/components/icon-button/icon-button'
import { box, cell, openPage, style } from './harness'

let browser: Browser
let page: Page

const Plus = () => (
  <svg viewBox="0 0 16 16">
    <path d="M8 3v10M3 8h10" />
  </svg>
)
const html = (node: React.ReactNode) => renderToStaticMarkup(<>{node}</>)
const sizes = (density: string) =>
  cell(
    `sizes-${density}`,
    `data-density="${density}"`,
    html(
      <>
        <Button size="sm">Small</Button>
        <Button>Medium</Button>
        <Button size="lg">Large</Button>
        <IconButton size="sm" label="Search small" icon={<Plus />} />
        <IconButton label="Search medium" icon={<Plus />} />
        <IconButton size="lg" label="Search large" icon={<Plus />} />
      </>,
    ),
  )
const variants = (theme: string) =>
  cell(
    `variants-${theme}`,
    `data-theme="${theme}" data-density="pointer"`,
    html(
      <>
        {(['primary', 'secondary', 'outline', 'ghost', 'destructive', 'link'] as const).map((v) => (
          <Button key={v} variant={v} className={`v-${v}`}>
            {v}
          </Button>
        ))}
        <IconButton variant="round" label="Search" icon={<Plus />} className="v-round" />
      </>,
    ),
  )

beforeAll(async () => {
  const body = [
    // The first cell has the first focusable element: the focus test presses Tab one time.
    cell('focus', 'data-density="pointer"', html(<Button className="first">First</Button>)),
    sizes('pointer'),
    sizes('touch'),
    variants('dark'),
    variants('light'),
    cell('block', 'data-density="pointer"', html(<Button block>Pay</Button>)),
    cell(
      'loading',
      'data-density="pointer"',
      html(
        <>
          <Button className="rest" loading={false} loadingLabel="Saving the order">
            Save
          </Button>
          <Button className="busy" loading loadingLabel="Saving the order">
            Save
          </Button>
        </>,
      ),
    ),
    ...(['ltr', 'rtl'] as const).map((dir) =>
      cell(
        `icons-${dir}`,
        `data-density="pointer" dir="${dir}"`,
        html(
          <>
            <Button startIcon={<Plus />}>Add</Button>
            <IconButton label="Notifications" badge="New items" icon={<Plus />} />
          </>,
        ),
      ),
    ),
    cell('icons-touch', 'data-density="touch"', html(<Button startIcon={<Plus />}>Add</Button>)),
    cell('disabled', 'data-density="pointer"', html(<Button disabled>Publish</Button>)),
    cell('reduced', 'data-density="pointer" data-motion="reduced"', html(<Button className="reduced">Save</Button>)),
  ].join('')
  ;({ browser, page } = await openPage(body))
}, 60_000)

afterAll(async () => {
  await browser?.close()
})

/** Scrolls the element into view, puts the pointer down at its center, and waits for the end of the transitions. */
async function pressAt(selector: string): Promise<{ x: number; y: number; width: number; height: number }> {
  await page.locator(selector).first().scrollIntoViewIfNeeded()
  const rest = await box(page, selector)
  await page.mouse.move(rest.x + rest.width / 2, rest.y + rest.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(250)
  return rest
}

const sel = (cellId: string, name: string) => `#${cellId} button:has-text("${name}")`
const icon = (cellId: string, name: string) => `#${cellId} button[aria-label="${name}"]`

describe('Button and Icon button in Chrome', () => {
  it('button/size: pointer 28, 32, 40 px; touch 36, 44, 52 px', async () => {
    for (const [density, want] of [
      ['pointer', [28, 32, 40]],
      ['touch', [36, 44, 52]],
    ] as const) {
      const got = []
      for (const n of ['Small', 'Medium', 'Large']) got.push((await box(page, sel(`sizes-${density}`, n))).height)
      expect(got).toEqual(want)
    }
  })

  it('icon-button/square: the width is the height, in each size and each density', async () => {
    for (const [density, want] of [
      ['pointer', [28, 32, 40]],
      ['touch', [36, 44, 52]],
    ] as const) {
      for (const [i, n] of ['small', 'medium', 'large'].entries()) {
        const b = await box(page, icon(`sizes-${density}`, `Search ${n}`))
        expect([b.width, b.height]).toEqual([want[i], want[i]])
      }
    }
  })

  it('button/block: a block button has the full width of its container', async () => {
    expect((await box(page, '#block button')).width).toBe(320 - 16)
    expect((await box(page, '#block button')).height).toBe(32)
  })

  it('button/target: a small button in the touch density has a target of 44 px; a point above its edge presses it', async () => {
    expect(await style(page, sel('sizes-touch', 'Small'), 'height', '::after')).toBe('44px')
    expect(await style(page, icon('sizes-touch', 'Search small'), 'width', '::after')).toBe('44px')
    const b = await box(page, sel('sizes-touch', 'Small'))
    const hit = await page.evaluate(([x, y]) => document.elementFromPoint(x as number, y as number)?.closest('button')?.textContent, [b.x + b.width / 2, b.y - 3])
    expect(hit).toBe('Small')
  })

  it('button/variant: the fills, the borders, and the labels of the dark theme', async () => {
    const v = (n: string) => `#variants-dark .v-${n}`
    expect(await style(page, v('primary'), 'background-color')).toBe('rgb(245, 245, 245)')
    expect(await style(page, v('primary'), 'color')).toBe('rgb(20, 20, 20)')
    expect(await style(page, v('primary'), 'font-weight')).toBe('500')
    expect(await style(page, v('secondary'), 'background-color')).toBe('rgb(37, 37, 37)')
    expect(await style(page, v('secondary'), 'border-top-color')).toBe('rgb(46, 46, 46)')
    expect(await style(page, v('secondary'), 'border-top-width')).toBe('1px')
    expect(await style(page, v('outline'), 'background-color')).toBe('rgba(0, 0, 0, 0)')
    expect(await style(page, v('outline'), 'border-top-color')).toBe('rgb(46, 46, 46)')
    expect(await style(page, v('ghost'), 'border-top-color')).toBe('rgba(0, 0, 0, 0)')
    expect(await style(page, v('ghost'), 'color')).toBe('rgb(224, 224, 224)')
    expect(await style(page, v('destructive'), 'background-color')).toBe('rgba(242, 85, 90, 0.14)')
    expect(await style(page, v('destructive'), 'color')).toBe('rgb(255, 123, 127)')
    expect(await style(page, v('destructive'), 'font-weight')).toBe('500')
    expect(await style(page, v('link'), 'color')).toBe('rgb(92, 163, 255)')
    expect(await style(page, v('secondary'), 'border-top-left-radius')).toBe('8px')
  })

  it('button/variant: the fills and the labels of the light theme', async () => {
    const v = (n: string) => `#variants-light .v-${n}`
    expect(await style(page, v('primary'), 'background-color')).toBe('rgb(20, 20, 20)')
    expect(await style(page, v('primary'), 'color')).toBe('rgb(250, 250, 250)')
    expect(await style(page, v('destructive'), 'background-color')).toBe('rgba(217, 58, 64, 0.1)')
    expect(await style(page, v('link'), 'color')).toBe('rgb(26, 98, 204)')
  })

  it('icon-button/round: the round variant is round, with the raised fill and the second text color', async () => {
    expect(await style(page, '#variants-dark .v-round', 'border-top-left-radius')).toBe('999px')
    expect(await style(page, '#variants-dark .v-round', 'background-color')).toBe('rgb(30, 30, 30)')
    expect(await style(page, '#variants-dark .v-round', 'color')).toBe('rgb(176, 176, 176)')
  })

  it('button/focus: Tab shows the ring: 2 px in the ring color, 2 px from the button', async () => {
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => document.activeElement?.textContent)).toBe('First')
    expect(await style(page, '#focus .first', 'outline-width')).toBe('2px')
    expect(await style(page, '#focus .first', 'outline-offset')).toBe('2px')
    expect(await style(page, '#focus .first', 'outline-color')).toBe('rgb(92, 163, 255)')
    expect(await style(page, '#focus .first', 'outline-style')).toBe('solid')
  })

  it('button/hover: a device with hover shows the hover fill of the variant', async () => {
    const s = '#variants-dark .v-secondary'
    await page.hover(s)
    await page.waitForTimeout(250)
    expect(await style(page, s, 'background-color')).toBe('rgb(46, 46, 46)')
    expect(await style(page, s, 'border-top-color')).toBe('rgb(72, 72, 72)')
    await page.mouse.move(0, 0)
  })

  it('button/press: at pointer down, the button scales to 0.97 in 100 ms, with the pressed fill', async () => {
    const s = '#variants-dark .v-ghost'
    expect(await style(page, s, 'transition-duration')).toBe('0.15s, 0.15s, 0.15s, 0.15s, 0.1s')
    const rest = await pressAt(s)
    const down = await box(page, s)
    expect(down.width / rest.width).toBeCloseTo(0.97, 3)
    expect(await style(page, s, 'background-color')).toBe('rgb(46, 46, 46)')
    await page.mouse.up()
  })

  it('button/press: a link button does not scale; its opacity goes to 0.8', async () => {
    const s = '#variants-dark .v-link'
    const rest = await pressAt(s)
    expect((await box(page, s)).width).toBe(rest.width)
    expect(await style(page, s, 'opacity')).toBe('0.8')
    await page.mouse.up()
  })

  it('icon-button/press: at pointer down, the icon button scales to 0.96', async () => {
    const s = icon('sizes-pointer', 'Search medium')
    const rest = await pressAt(s)
    expect((await box(page, s)).width / rest.width).toBeCloseTo(0.96, 3)
    await page.mouse.up()
  })

  it('button/motion: with reduced motion, the press has no scale and the pressed fill stays', async () => {
    const s = '#reduced .reduced'
    const rest = await pressAt(s)
    expect((await box(page, s)).width).toBe(rest.width)
    expect(await style(page, s, 'background-color')).toBe('rgb(46, 46, 46)')
    await page.mouse.up()
  })

  it('button/disabled: a disabled button has the opacity 0.4, and a press does not change its fill', async () => {
    const s = '#disabled button'
    expect(await style(page, s, 'opacity')).toBe('0.4')
    const before = await style(page, s, 'background-color')
    await page.hover(s)
    await page.mouse.down()
    expect(await style(page, s, 'background-color')).toBe(before)
    await page.mouse.up()
  })

  it('button/loading: the button keeps its width, and the spinner turns in 800 ms', async () => {
    expect((await box(page, '#loading .busy')).width).toBe((await box(page, '#loading .rest')).width)
    expect(await style(page, '#loading .busy [data-part="spinner"]', 'animation-duration')).toBe('0.8s')
    expect(await style(page, '#loading .busy [data-part="spinner"]', 'animation-name')).toBe('spin')
  })

  it('button/motion: with the reduced motion of the system, the spinner does not turn', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    expect(await style(page, '#loading .busy [data-part="spinner"]', 'animation-name')).toBe('none')
    await page.emulateMedia({ reducedMotion: 'no-preference' })
  })

  it('button/icon: the icon is 16 px for pointer and 20 px for touch, 6 px from the label', async () => {
    const ip = await box(page, '#icons-ltr [data-part="start-icon"]')
    const lp = await box(page, '#icons-ltr [data-part="label"]')
    expect([ip.width, ip.height]).toEqual([16, 16])
    expect(lp.x - (ip.x + ip.width)).toBe(6)
    const it = await box(page, '#icons-touch [data-part="start-icon"]')
    expect([it.width, it.height]).toEqual([20, 20])
  })

  it('button/direction: in right-to-left, the start icon is at the right of the label', async () => {
    const i = await box(page, '#icons-rtl [data-part="start-icon"]')
    const l = await box(page, '#icons-rtl [data-part="label"]')
    expect(i.x - (l.x + l.width)).toBe(6)
  })

  // The inset is from the inner edge of the border (1 px): the edge of the padding box, as for each absolute position.
  it('icon-button/badge: an 8 px dot, 6 px from the top edge and the end edge, with a ring in the background color', async () => {
    const b = await box(page, '#icons-ltr button[aria-label^="Notifications"]')
    const d = await box(page, '#icons-ltr [data-part="badge"]')
    expect([d.width, d.height]).toEqual([8, 8])
    expect(d.y - (b.y + 1)).toBe(6)
    expect(b.x + b.width - 1 - (d.x + d.width)).toBe(6)
    expect(await style(page, '#icons-ltr [data-part="badge"]', 'background-color')).toBe('rgb(92, 163, 255)')
    // Tailwind puts its empty ring and inset shadows first. The ring of the badge is the last shadow.
    expect(await style(page, '#icons-ltr [data-part="badge"]', 'box-shadow')).toMatch(/, rgb\(24, 24, 24\) 0px 0px 0px 2px$/)
  })

  it('icon-button/direction: in right-to-left, the badge is at the top left corner', async () => {
    const b = await box(page, '#icons-rtl button[aria-label^="Notifications"]')
    const d = await box(page, '#icons-rtl [data-part="badge"]')
    expect(d.x - (b.x + 1)).toBe(6)
    expect(d.y - (b.y + 1)).toBe(6)
  })
})
