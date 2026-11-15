// @vitest-environment node
// The browser test of the Menu: the real CSS in a real Chrome. Base UI renders no popup in static markup: the menu and
// the action sheet are in a portal. Thus the page renders the static cells with renderToStaticMarkup, and then a client
// bundle of the menu (built with Vite) renders the menus into the cells with React. The tests press the triggers and
// measure the open menu: the sizes of the densities, the colors of the themes and the states, the position, the gaps,
// the focus, the direction, and the motion. Each test name starts with the id of a clause of ir/contracts/menu.json.
import path from 'node:path'
import type { Browser, Page } from 'playwright-core'
import { renderToStaticMarkup } from 'react-dom/server'
import { build, type Rolldown } from 'vite'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { Menu } from '@monorithm/react/components/menu/menu'
import { box, cell, openPage, style } from './harness'

let browser: Browser
let page: Page

const ROOT = path.resolve(import.meta.dirname, '../..')
const ENTRY = path.join(ROOT, 'test/browser/menu.entry.tsx')

// The client entry: it renders the same menus as the static markup, with React, into the cells. The ids of the cells
// are the keys of `menus`.
const entry = `
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { Menu } from '@monorithm/react/components/menu/menu'

const Icon = ({ d }: { d: string }) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor"><path d={d} /></svg>
const product = {
  label: 'Product actions',
  icon: <Icon d="M3 8h1M8 8h1M13 8h1" />,
  groups: [
    { label: 'Blue shirt', items: [
      { label: 'Edit', icon: <Icon d="M3 13l8-8" />, shortcut: 'E' },
      { label: 'Duplicate', icon: <Icon d="M4 4h8v8" />, shortcut: 'D' },
    ] },
    { items: [
      { label: 'Share link', icon: <Icon d="M5 8h6" /> },
      { label: 'Archive', icon: <Icon d="M4 6h8" />, disabled: true, disabledReason: 'Publish the product first' },
    ] },
  ],
  destructive: { label: 'Delete product', icon: <Icon d="M4 4l8 8" /> },
}
const long = 'Move the product to a different shop, keep all of its orders, its reviews, and its photos, and then send a message to each buyer of the product with the address of the new shop and the new delivery times'
const menus = {
  pointer: <Menu {...product} />,
  touch: <Menu {...product} />,
  light: <Menu {...product} />,
  rtl: <Menu {...product} />,
  text: <Menu label="Order actions" items={[{ label: 'Print' }, { label: 'Refund' }]} />,
  long: <Menu label="Long actions" items={[{ label: long }, { label: 'Edit' }]} />,
  disabled: <Menu {...product} label="Shop actions" disabled disabledReason="Open the shop first" />,
  sheet: <Menu {...product} label="Sheet actions" container="action-sheet" />,
  auto: <Menu {...product} label="Auto actions" />,
  reduced: <Menu {...product} label="Reduced actions" />,
  'reduced-sheet': <Menu {...product} label="Reduced sheet" container="action-sheet" />,
  'edge-end': <Menu {...product} label="End actions" />,
  'edge-bottom': <Menu {...product} label="Bottom actions" />,
}
// flushSync: the script renders each menu before it ends. Then the test can press the triggers.
for (const [id, node] of Object.entries(menus)) {
  const root = createRoot(document.getElementById('root-' + id)!)
  flushSync(() => root.render(node))
}
document.body.dataset.ready = ''
`

/** The client bundle of the entry: React, Base UI, and the menu, in one script. */
async function bundle(): Promise<string> {
  const out = await build({
    configFile: false,
    root: ROOT,
    logLevel: 'silent',
    // The tests run with NODE_ENV "test". The bundle is a production build: the JSX runtime and React agree.
    mode: 'production',
    oxc: { jsx: { development: false } },
    resolve: { alias: [{ find: /^@monorithm\/react\//, replacement: `${ROOT}/src/` }] },
    define: { 'process.env.NODE_ENV': '"production"' },
    plugins: [{ name: 'menu-entry', enforce: 'pre', resolveId: (id) => (id === ENTRY ? ENTRY : null), load: (id) => (id === ENTRY ? entry : null) }],
    build: { write: false, minify: false, rolldownOptions: { input: ENTRY, output: { format: 'iife' } } },
  })
  const output = (Array.isArray(out) ? out[0] : out) as Rolldown.RolldownOutput
  const chunk = output.output.find((o) => o.type === 'chunk')
  if (!chunk || chunk.type !== 'chunk') throw new Error('No chunk in the bundle')
  return chunk.code
}

/** A cell with the static trigger (the first paint), and the root for the client render. */
const menuCell = (id: string, attrs: string, label = 'Product actions') =>
  cell(id, attrs, `<div id="root-${id}">${renderToStaticMarkup(<Menu label={label} items={[]} />)}</div>`)
/** A cell that is fixed at an edge of the window, for the flip of the position. */
const fixedCell = (id: string, place: string) =>
  `<div id="${id}" data-density="pointer" style="position:fixed;${place}"><div id="root-${id}"></div></div>`

beforeAll(async () => {
  const body = [
    // The focus test focuses this button, then presses Tab one time: the next element is the first trigger.
    '<button id="start" type="button">Start</button>',
    menuCell('pointer', 'data-density="pointer"'),
    menuCell('touch', 'data-density="touch"'),
    menuCell('light', 'data-density="pointer" data-theme="light"'),
    menuCell('rtl', 'data-density="pointer" dir="rtl"'),
    menuCell('text', 'data-density="pointer"', 'Order actions'),
    menuCell('long', 'data-density="pointer"', 'Long actions'),
    menuCell('disabled', 'data-density="pointer"', 'Shop actions'),
    menuCell('sheet', 'data-density="pointer"', 'Sheet actions'),
    menuCell('auto', 'data-density="pointer"', 'Auto actions'),
    menuCell('reduced', 'data-density="pointer" data-motion="reduced"', 'Reduced actions'),
    menuCell('reduced-sheet', 'data-density="pointer" data-motion="reduced"', 'Reduced sheet'),
    fixedCell('edge-end', 'top:8px;right:8px'),
    fixedCell('edge-bottom', 'bottom:8px;left:400px'),
    // A probe for the values of the tokens that have no short form: the overlay shadow.
    '<div id="probe" style="box-shadow:var(--mono-shadow-overlay)"></div>',
  ].join('')
  ;({ browser, page } = await openPage(body))
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.addScriptTag({ content: await bundle() })
  expect(errors).toEqual([])
  await page.waitForSelector('body[data-ready]', { state: 'attached' })
  expect(await page.locator('[data-mono="menu"] [data-part="trigger"]').count()).toBe(13)
}, 60_000)

afterAll(async () => {
  await browser?.close()
})

afterEach(async () => {
  // Each test closes its menu. Thus the next test starts with no open menu.
  await page.keyboard.press('Escape')
  await page.mouse.up()
  await page.mouse.move(0, 0)
  await page.waitForFunction(() => !document.querySelector('[role="menu"], [role="dialog"]'))
})

const DARK = {
  raised: 'rgb(30, 30, 30)',
  fg: 'rgb(224, 224, 224)',
  fg2: 'rgb(176, 176, 176)',
  muted: 'rgb(158, 158, 158)',
  selected: 'rgb(37, 37, 37)',
  pressed: 'rgb(46, 46, 46)',
  hover: 'rgb(30, 30, 30)',
  lineStrong: 'rgb(72, 72, 72)',
  lineSubtle: 'rgb(37, 37, 37)',
  ring: 'rgb(92, 163, 255)',
  danger: 'rgb(255, 123, 127)',
  dangerSoft: 'rgba(242, 85, 90, 0.14)',
  scrim: 'rgba(0, 0, 0, 0.6)',
}

const trigger = (id: string) => `#${id} [data-part="trigger"]`
const MENU = '[data-part="menu"]'
const SHEET = '[data-part="action-sheet"]'
const item = (label: string) => `[role="menuitem"]:has(> [data-part="label"]:text-is("${label}"))`
const sheetItem = (label: string) => `${SHEET} button:has(> [data-part="label"]:text-is("${label}"))`
const inItem = (label: string, part: string) => `${item(label)} [data-part="${part}"]`

/** The shadow of an element with no empty layers: Tailwind adds transparent layers for the ring utilities. */
const shadow = async (selector: string) =>
  (await style(page, selector, 'box-shadow')).split(/,(?![^(]*\))/).map((l) => l.trim()).filter((l) => l !== 'rgba(0, 0, 0, 0) 0px 0px 0px 0px').join(', ')

/** Presses the trigger of a cell, then waits for the open menu and the end of its entrance. */
async function openMenu(id: string, popup = MENU) {
  await page.locator(trigger(id)).click()
  await page.locator(popup).waitFor()
  await page.waitForTimeout(400)
}

/** The computed values of the motion of an element in a state: the transition, and the values at the start. */
async function motion(selector: string, attribute: 'data-starting-style' | 'data-ending-style') {
  return page.locator(selector).evaluate((el, attr) => {
    el.setAttribute(attr, '')
    const s = getComputedStyle(el)
    const transition = { duration: s.transitionDuration, easing: s.transitionTimingFunction }
    // With no transition, the computed values are the values of the state, not a value of the transition.
    ;(el as HTMLElement).style.transition = 'none'
    const values = { opacity: s.opacity, scale: s.scale, translate: s.translate }
    el.removeAttribute(attr)
    ;(el as HTMLElement).style.transition = ''
    return { ...transition, ...values }
  }, attribute)
}

describe('Menu in Chrome', () => {
  it('menu/position: the menu opens 4 px below the trigger, at the start edge of the trigger', async () => {
    await openMenu('pointer')
    const t = await box(page, trigger('pointer'))
    const m = await box(page, MENU)
    expect(m.y - (t.y + t.height)).toBe(4)
    expect(m.x).toBe(t.x)
  })

  it('menu/position: if the menu does not fit below the trigger, it opens 4 px above it', async () => {
    await openMenu('edge-bottom')
    const t = await box(page, trigger('edge-bottom'))
    const m = await box(page, MENU)
    expect(t.y - (m.y + m.height)).toBe(4)
    expect(m.x).toBe(t.x)
  })

  it('menu/position-flip: if the menu does not fit at the start edge, its end edge aligns with the end edge of the trigger', async () => {
    await openMenu('edge-end')
    const t = await box(page, trigger('edge-end'))
    const m = await box(page, MENU)
    expect(m.x + m.width).toBe(t.x + t.width)
    expect(m.y - (t.y + t.height)).toBe(4)
    expect(m.x).toBeGreaterThanOrEqual(0)
  })

  it('menu/surface: the raised fill, the overlay shadow, the large radius, a padding of 4 px, 236 px or more; no scrim', async () => {
    await openMenu('pointer')
    expect(await style(page, MENU, 'background-color')).toBe(DARK.raised)
    expect(await shadow(MENU)).toBe(await style(page, '#probe', 'box-shadow'))
    expect(await style(page, MENU, 'border-top-left-radius')).toBe('12px')
    expect(await style(page, MENU, 'padding-top')).toBe('4px')
    expect(await style(page, MENU, 'padding-left')).toBe('4px')
    expect((await box(page, MENU)).width).toBeGreaterThanOrEqual(236)
    // The page behind the menu does not become darker: no element of the menu has the scrim color.
    expect(await page.evaluate(() => [...document.querySelectorAll('body *')].some((e) => getComputedStyle(e).backgroundColor === 'rgba(0, 0, 0, 0.6)'))).toBe(false)
  })

  it('menu/item: as wide as the menu, 8 px at the sides, the small radius; the icon at the start, 6 px from the label, muted', async () => {
    await openMenu('pointer')
    const m = await box(page, MENU)
    const edit = await box(page, item('Edit'))
    expect(edit.width).toBe(m.width - 8)
    expect(await style(page, item('Edit'), 'padding-left')).toBe('8px')
    expect(await style(page, item('Edit'), 'padding-right')).toBe('8px')
    expect(await style(page, item('Edit'), 'border-top-left-radius')).toBe('6px')
    const icon = await box(page, inItem('Edit', 'icon'))
    const label = await box(page, inItem('Edit', 'label'))
    expect(icon.x - edit.x).toBe(8)
    expect(label.x - (icon.x + icon.width)).toBe(6)
    expect(await style(page, inItem('Edit', 'icon'), 'color')).toBe(DARK.muted)
    expect(await style(page, inItem('Edit', 'label'), 'color')).toBe(DARK.fg)
  })

  it('menu/density: pointer 32 px items, 14 px label, 16 px icon, 12 px radius; touch 44, 16, 20, 14', async () => {
    for (const [id, height, text, icon, radius] of [
      ['pointer', 32, '14px', 16, '12px'],
      ['touch', 44, '16px', 20, '14px'],
    ] as const) {
      await openMenu(id)
      expect((await box(page, item('Share link'))).height).toBe(height)
      expect(await style(page, inItem('Share link', 'label'), 'font-size')).toBe(text)
      const i = await box(page, inItem('Share link', 'icon'))
      expect([i.width, i.height]).toEqual([icon, icon])
      expect(await style(page, MENU, 'border-top-left-radius')).toBe(radius)
      await page.keyboard.press('Escape')
      await page.locator(MENU).waitFor({ state: 'detached' })
    }
  })

  it('menu/target: the item is the target, 32 or 44 px high; the trigger target is 24 or 44 px or more', async () => {
    await openMenu('touch')
    expect((await box(page, item('Edit'))).height).toBe(44)
    await page.keyboard.press('Escape')
    expect(await style(page, trigger('touch'), 'height', '::after')).toBe('44px')
    expect(Number.parseFloat(await style(page, trigger('pointer'), 'min-height', '::after'))).toBe(24)
    expect((await box(page, trigger('pointer'))).height).toBeGreaterThanOrEqual(24)
    // The separator and the group label are not targets: a press on them does not close the menu.
    await openMenu('pointer')
    await page.locator('[data-part="group-label"]').click()
    await page.locator(`${MENU} [role="separator"]`).first().click({ force: true })
    await page.waitForTimeout(150)
    expect(await page.locator(MENU).count()).toBe(1)
  })

  it('menu/wrap and menu/no-truncate: a long label goes to a second line; the menu becomes wider until the window edge', async () => {
    await openMenu('long')
    const m = await box(page, MENU)
    expect(m.width).toBeGreaterThan(236)
    expect(m.x + m.width).toBeLessThanOrEqual(1280)
    const labels = `${MENU} [data-part="label"]`
    const first = await box(page, labels)
    const lineHeight = Number.parseFloat(await style(page, labels, 'line-height'))
    expect(first.height).toBeGreaterThanOrEqual(2 * lineHeight)
    expect((await page.locator('[role="menuitem"]').first().boundingBox())?.height).toBeGreaterThan(32)
    expect(await style(page, labels, 'text-overflow')).toBe('clip')
    expect(await style(page, labels, 'white-space')).toBe('normal')
    expect(await page.locator(labels).first().evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true)
  })

  it('menu/shortcut: the key cap at the end side, 8 px or more from the label; 18 px high and wide or more, padding and radius 4 px', async () => {
    await openMenu('pointer')
    const edit = await box(page, item('Edit'))
    const label = await box(page, inItem('Edit', 'label'))
    const key = await box(page, inItem('Edit', 'shortcut'))
    expect(key.x - (label.x + label.width)).toBeGreaterThanOrEqual(8)
    expect(edit.x + edit.width - 8).toBe(key.x + key.width)
    expect(key.height).toBe(18)
    expect(key.width).toBeGreaterThanOrEqual(18)
    expect(await style(page, inItem('Edit', 'shortcut'), 'padding-left')).toBe('4px')
    expect(await style(page, inItem('Edit', 'shortcut'), 'border-top-left-radius')).toBe('4px')
  })

  it('menu/shortcut-look: the selected fill, 1 px of the strong line at the bottom; the mono font at 10.5 px, secondary text', async () => {
    await openMenu('pointer')
    const key = inItem('Edit', 'shortcut')
    expect(await style(page, key, 'background-color')).toBe(DARK.selected)
    expect(await style(page, key, 'border-bottom-width')).toBe('1px')
    expect(await style(page, key, 'border-bottom-color')).toBe(DARK.lineStrong)
    expect(await style(page, key, 'border-top-width')).toBe('0px')
    expect(await style(page, key, 'font-size')).toBe('10.5px')
    expect(await style(page, key, 'font-family')).toContain('monospace')
    expect(await style(page, key, 'color')).toBe(DARK.fg2)
  })

  it('menu/shortcut-desktop: the shortcut shows at a width of 1024 px or more only; the action sheet shows no shortcut', async () => {
    await openMenu('pointer')
    expect(await page.locator(inItem('Edit', 'shortcut')).isVisible()).toBe(true)
    await page.setViewportSize({ width: 1000, height: 720 })
    expect(await style(page, inItem('Edit', 'shortcut'), 'display')).toBe('none')
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.keyboard.press('Escape')
    await page.locator(MENU).waitFor({ state: 'detached' })
    await openMenu('sheet', SHEET)
    expect(await page.locator(`${SHEET} [data-part="shortcut"]`).count()).toBe(0)
  })

  it('menu/group: the caption size and the muted text color; a padding of 6 px at the top, 8 px at the sides, 4 px at the bottom', async () => {
    await openMenu('pointer')
    const label = `${MENU} [data-part="group-label"]`
    expect(await style(page, label, 'font-size')).toBe('12px')
    expect(await style(page, label, 'color')).toBe(DARK.muted)
    expect(await style(page, label, 'padding-top')).toBe('6px')
    expect(await style(page, label, 'padding-left')).toBe('8px')
    expect(await style(page, label, 'padding-right')).toBe('8px')
    expect(await style(page, label, 'padding-bottom')).toBe('4px')
    // The label is above the items of its group.
    expect((await box(page, label)).y).toBeLessThan((await box(page, item('Edit'))).y)
  })

  it('menu/separator: 1 px in the subtle line color, 4 px above and below, across the full width of the menu', async () => {
    await openMenu('pointer')
    const sep = `${MENU} [role="separator"]`
    const s = await box(page, sep)
    const m = await box(page, MENU)
    expect(s.height).toBe(1)
    expect([s.x, s.width]).toEqual([m.x, m.width])
    expect(await style(page, sep, 'background-color')).toBe(DARK.lineSubtle)
    const above = await box(page, item('Duplicate'))
    const below = await box(page, item('Share link'))
    expect(s.y - (above.y + above.height)).toBe(4)
    expect(below.y - (s.y + s.height)).toBe(4)
  })

  it('menu/destructive: the label and the icon in the danger text color; at hover and with the focus, the danger soft fill', async () => {
    await openMenu('pointer')
    const del = item('Delete product')
    expect(await style(page, inItem('Delete product', 'label'), 'color')).toBe(DARK.danger)
    expect(await style(page, inItem('Delete product', 'icon'), 'color')).toBe(DARK.danger)
    await page.hover(del)
    await page.waitForTimeout(250)
    expect(await style(page, del, 'background-color')).toBe(DARK.dangerSoft)
  })

  it('menu/destructive-sign: the destructive item is the last item, below a separator', async () => {
    await openMenu('pointer')
    const items = await page.locator('[role="menuitem"]').all()
    const last = await items.at(-1)?.boundingBox()
    const seps = await page.locator(`${MENU} [role="separator"]`).all()
    const sep = await seps.at(-1)?.boundingBox()
    expect(await items.at(-1)?.getAttribute('data-part')).toBe('destructive-item')
    expect((last?.y ?? 0) - ((sep?.y ?? 0) + (sep?.height ?? 0))).toBe(4)
  })

  it('menu/focus: with the keyboard, the item with the focus has the selected fill and the ring: 2 px, 2 px from the item', async () => {
    await page.locator(trigger('pointer')).focus()
    await page.keyboard.press('Enter')
    await page.locator(MENU).waitFor()
    await page.waitForTimeout(250)
    const edit = item('Edit')
    expect(await page.locator(edit).evaluate((e) => e === document.activeElement)).toBe(true)
    expect(await style(page, edit, 'background-color')).toBe(DARK.selected)
    expect(await style(page, edit, 'outline-style')).toBe('solid')
    expect(await style(page, edit, 'outline-width')).toBe('2px')
    expect(await style(page, edit, 'outline-color')).toBe(DARK.ring)
    expect(await style(page, edit, 'outline-offset')).toBe('2px')
  })

  it('menu/trigger-focus: Tab gives the trigger the ring of a button; a pointer press shows no ring', async () => {
    await page.locator('#start').focus()
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))).toBe('Product actions')
    const t = trigger('pointer')
    expect(await style(page, t, 'outline-style')).toBe('solid')
    expect(await style(page, t, 'outline-width')).toBe('2px')
    expect(await style(page, t, 'outline-color')).toBe(DARK.ring)
    expect(await style(page, t, 'outline-offset')).toBe('2px')
    // The disabled trigger opens no menu, thus a press keeps the focus on it. Playwright waits for an enabled
    // element, and aria-disabled makes the element disabled for it: force the press.
    await page.locator(trigger('disabled')).click({ force: true })
    expect(await page.locator(trigger('disabled')).evaluate((e) => e === document.activeElement)).toBe(true)
    expect(await style(page, trigger('disabled'), 'outline-style')).toBe('none')
  })

  it('menu/trigger: while the menu is open, the trigger keeps its hover look', async () => {
    // The fill of the trigger changes in 150 ms: wait for the end of the change of the last test.
    await page.waitForTimeout(250)
    const before = await style(page, trigger('pointer'), 'background-color')
    await openMenu('pointer')
    await page.mouse.move(1200, 700)
    await page.waitForTimeout(250)
    expect(before).toBe('rgba(0, 0, 0, 0)')
    expect(await style(page, trigger('pointer'), 'background-color')).toBe(DARK.hover)
    await page.keyboard.press('Escape')
    await page.locator(MENU).waitFor({ state: 'detached' })
    await openMenu('text')
    await page.mouse.move(1200, 700)
    await page.waitForTimeout(250)
    expect(await style(page, trigger('text'), 'background-color')).toBe(DARK.pressed)
    expect(await style(page, trigger('text'), 'border-top-color')).toBe(DARK.lineStrong)
  })

  it('menu/hover: an item at hover gets the selected fill in 150 ms; at pointer down, the pressed fill', async () => {
    await openMenu('pointer')
    const share = item('Share link')
    expect(await style(page, share, 'transition-property')).toBe('background-color')
    expect(await style(page, share, 'transition-duration')).toBe('0.15s')
    await page.hover(share)
    await page.waitForTimeout(250)
    expect(await style(page, share, 'background-color')).toBe(DARK.selected)
    await page.mouse.down()
    await page.waitForTimeout(250)
    expect(await style(page, share, 'background-color')).toBe(DARK.pressed)
  })

  it('menu/disabled: a disabled item has the disabled opacity, and a press does not start its action or close the menu', async () => {
    await openMenu('pointer')
    const archive = item('Archive')
    expect(await style(page, inItem('Archive', 'label'), 'opacity')).toBe('0.4')
    expect(await style(page, inItem('Archive', 'icon'), 'opacity')).toBe('0.4')
    expect(await style(page, archive, 'opacity')).toBe('1')
    await page.locator(archive).click({ force: true })
    await page.waitForTimeout(150)
    expect(await page.locator(MENU).count()).toBe(1)
  })

  it('menu/disabled-trigger: the disabled opacity; a press opens no menu', async () => {
    expect(await style(page, trigger('disabled'), 'opacity')).toBe('0.4')
    expect(await style(page, trigger('disabled'), 'cursor')).toBe('not-allowed')
    await page.locator(trigger('disabled')).click({ force: true })
    await page.waitForTimeout(250)
    expect(await page.locator(MENU).count()).toBe(0)
  })

  it('menu/action-sheet and menu/tablet: below 768 px the menu opens as an action sheet; at 768 px or more, at the trigger', async () => {
    await page.setViewportSize({ width: 600, height: 720 })
    await page.waitForFunction(() => document.querySelector('#auto [data-part="trigger"]')?.getAttribute('aria-haspopup') === 'dialog')
    await openMenu('auto', SHEET)
    expect(await page.locator('[role="dialog"]').getAttribute('aria-label')).toBe('Auto actions')
    await page.keyboard.press('Escape')
    await page.locator(SHEET).waitFor({ state: 'detached' })
    await page.setViewportSize({ width: 800, height: 720 })
    await page.waitForFunction(() => document.querySelector('#auto [data-part="trigger"]')?.getAttribute('aria-haspopup') === 'menu')
    // menu/tablet: the touch density gives items of 44 px.
    await openMenu('touch')
    expect((await box(page, item('Edit'))).height).toBe(44)
    await page.setViewportSize({ width: 1280, height: 720 })
  })

  it('menu/action-sheet-look: the raised fill, the overlay shadow, 16 px at the top corners; the handle 36 by 4 px, 8 px from the top', async () => {
    await openMenu('sheet', SHEET)
    const s = await box(page, SHEET)
    expect([s.x, s.width, s.y + s.height]).toEqual([0, 1280, 720])
    expect(await style(page, SHEET, 'background-color')).toBe(DARK.raised)
    expect(await shadow(SHEET)).toBe(await style(page, '#probe', 'box-shadow'))
    expect(await style(page, SHEET, 'border-top-left-radius')).toBe('16px')
    expect(await style(page, SHEET, 'border-top-right-radius')).toBe('16px')
    expect(await style(page, SHEET, 'border-bottom-left-radius')).toBe('0px')
    const handle = `${SHEET} [data-part="handle"]`
    const h = await box(page, handle)
    expect([h.width, h.height, h.y - s.y]).toEqual([36, 4, 8])
    expect(h.x + h.width / 2).toBe(s.x + s.width / 2)
    expect(await style(page, handle, 'background-color')).toBe(DARK.lineStrong)
  })

  it('menu/action-sheet-rows: each item is 44 px high with a gap of 2 px; a padding of 8 px; the last item above the bottom', async () => {
    await openMenu('sheet', SHEET)
    const s = await box(page, SHEET)
    const edit = await box(page, sheetItem('Edit'))
    const duplicate = await box(page, sheetItem('Duplicate'))
    const last = await box(page, `${SHEET} [data-part="destructive-item"]`)
    expect([edit.height, duplicate.height, last.height]).toEqual([44, 44, 44])
    expect(duplicate.y - (edit.y + edit.height)).toBe(2)
    expect([edit.x - s.x, s.x + s.width - (edit.x + edit.width)]).toEqual([8, 8])
    // menu/separator: 4 px above and below the separator, across the full width of the sheet.
    const sep = await box(page, `${SHEET} [role="separator"]`)
    const share = await box(page, sheetItem('Share link'))
    expect([sep.y - (duplicate.y + duplicate.height), share.y - (sep.y + sep.height), sep.height]).toEqual([4, 4, 1])
    expect([sep.x, sep.width]).toEqual([s.x, s.width])
    // The bottom safe area of this window is 0 px: the padding of 8 px is below the last item.
    expect(s.y + s.height - (last.y + last.height)).toBe(8)
    expect(await style(page, SHEET, 'padding-bottom')).toBe('8px')
  })

  it('menu/action-sheet-close: the scrim is behind the sheet; a tap on the scrim closes the sheet', async () => {
    await openMenu('sheet', SHEET)
    const scrim = '[data-part="scrim"]'
    expect(await style(page, scrim, 'background-color')).toBe(DARK.scrim)
    const sc = await box(page, scrim)
    expect([sc.x, sc.y, sc.width, sc.height]).toEqual([0, 0, 1280, 720])
    await page.mouse.click(640, 100)
    await page.locator(SHEET).waitFor({ state: 'detached' })
  })

  it('menu/action-sheet-motion: up in 320 ms with ease-out from the bottom edge, down in 200 ms with ease-in', async () => {
    await openMenu('sheet', SHEET)
    const start = await motion(SHEET, 'data-starting-style')
    expect([start.duration, start.easing]).toEqual(['0.32s', 'cubic-bezier(0.3, 0.7, 0.2, 1)'])
    expect(start.translate).toBe('0px 100%')
    expect(start.opacity).toBe('1')
    const end = await motion(SHEET, 'data-ending-style')
    expect([end.duration, end.easing]).toEqual(['0.2s', 'cubic-bezier(0.4, 0, 1, 1)'])
    expect(end.translate).toBe('0px 100%')
  })

  it('menu/action-sheet-motion: with reduced motion, no slide; it fades in for 150 ms and out for 100 ms', async () => {
    await openMenu('reduced-sheet', SHEET)
    const start = await motion(SHEET, 'data-starting-style')
    expect([start.duration, start.opacity]).toEqual(['0.15s', '0'])
    expect(start.translate).toBe('0px')
    const end = await motion(SHEET, 'data-ending-style')
    expect([end.duration, end.opacity]).toEqual(['0.1s', '0'])
    expect(end.translate).toBe('0px')
  })

  it('menu/motion: from the corner of the trigger, 4 px nearer at scale 0.98; in 150 ms with ease-out, out 100 ms with ease-in', async () => {
    await openMenu('pointer')
    const m = await box(page, MENU)
    expect(await style(page, MENU, 'transform-origin')).toBe(`0px -4px`)
    const start = await motion(MENU, 'data-starting-style')
    expect([start.duration, start.easing]).toEqual(['0.15s', 'cubic-bezier(0.3, 0.7, 0.2, 1)'])
    expect([start.opacity, start.scale, start.translate]).toEqual(['0', '0.98', '0px -4px'])
    const end = await motion(MENU, 'data-ending-style')
    expect([end.duration, end.easing, end.opacity]).toEqual(['0.1s', 'cubic-bezier(0.4, 0, 1, 1)', '0'])
    expect(m.width).toBeGreaterThan(0)
  })

  it('menu/motion-reduced: no move and no scale; the fade stays; the change of color stays', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openMenu('pointer')
    const start = await motion(MENU, 'data-starting-style')
    expect([start.duration, start.opacity, start.scale, start.translate]).toEqual(['0.15s', '0', '1', '0px'])
    expect(await style(page, item('Share link'), 'transition-duration')).toBe('0.15s')
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.keyboard.press('Escape')
    await page.locator(MENU).waitFor({ state: 'detached' })
    // data-motion="reduced" on an ancestor is the same as the system option.
    await openMenu('reduced')
    const reduced = await motion(MENU, 'data-starting-style')
    expect([reduced.scale, reduced.translate]).toEqual(['1', '0px'])
  })

  it('menu/direction and menu/direction-motion: right-to-left; the icon at the right, the shortcut at the left; the move is vertical', async () => {
    await openMenu('rtl')
    const t = await box(page, trigger('rtl'))
    const m = await box(page, MENU)
    expect(m.x + m.width).toBe(t.x + t.width)
    const icon = await box(page, inItem('Edit', 'icon'))
    const label = await box(page, inItem('Edit', 'label'))
    const key = await box(page, inItem('Edit', 'shortcut'))
    expect(icon.x).toBeGreaterThan(label.x)
    expect(key.x + key.width).toBeLessThan(label.x)
    expect(label.x + label.width + 6).toBe(icon.x)
    // The menu opens from the right corner of the trigger, and the offset of the entrance stays vertical.
    expect(await style(page, MENU, 'transform-origin')).toBe(`${m.width}px -4px`)
    const start = await motion(MENU, 'data-starting-style')
    expect(start.translate).toBe('0px -4px')
  })

  it('menu/surface and menu/hover: the light theme gives the light raised fill, the light text, and the light fills', async () => {
    await openMenu('light')
    expect(await style(page, MENU, 'background-color')).toBe('rgb(255, 255, 255)')
    expect(await style(page, inItem('Edit', 'label'), 'color')).toBe('rgb(30, 30, 30)')
    await page.hover(item('Share link'))
    await page.waitForTimeout(250)
    expect(await style(page, item('Share link'), 'background-color')).toBe('rgb(235, 235, 235)')
  })
})
