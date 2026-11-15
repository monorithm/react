// @vitest-environment node
// The browser test of the Toast: the real CSS in a real Chrome. It measures the clauses that jsdom cannot compute: the
// surface, the padding, the sizes of the densities, the colors and the contrast of each theme, the stack, the position
// of the region in each window width, the direction, the focus ring, the target, the hover and the pressed state, and the
// motion. Each test name starts with the id of a clause of ir/contracts/toast.json.
//
// Each frame has its own ToastProvider with default toasts. The frame has a transform, thus the fixed region is fixed to
// the frame and not to the window. A static page has no React: the script settle() does what Base UI does after the first render. It
// removes data-starting-style (the start of the entrance). It sets --toast-height (the height in full pixels) and
// --toast-offset-y (the height of the newer toasts).
import type { Browser, Page } from 'playwright-core'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ToastProvider } from '@monorithm/react/components/toast/toast'
import type { ToastOptions } from '@monorithm/react/components/toast/toast.types'
import { box, openPage, style } from './harness'

let browser: Browser
let page: Page

const press = { onPress: () => {} }
const info: ToastOptions = { tone: 'info', title: 'New order', text: 'Order 1042 from Ama' }
const hidden: ToastOptions = { tone: 'success', title: 'Product hidden', text: 'Black shirt', action: { label: 'Undo', ...press } }
const notSaved: ToastOptions = { tone: 'danger', title: 'Changes not saved', text: 'The connection was lost', action: { label: 'Retry', ...press } }
const low: ToastOptions = { tone: 'warning', title: 'Stock is low', text: 'Two black shirts are left' }
const uploading: ToastOptions = { tone: 'loading', title: 'Uploading 3 photos' }

const WIDTH = 360
const HEIGHT = 320
const frame = (id: string, attrs: string, toasts: ToastOptions[]) =>
  `<div id="${id}" ${attrs} style="position:relative;transform:translateZ(0);width:${WIDTH}px;height:${HEIGHT}px;margin-bottom:16px">${renderToStaticMarkup(
    <ToastProvider defaultToasts={toasts} />,
  )}</div>`

/** Does what Base UI does after the first render: the end of the entrance and the offsets of the stack. */
async function settle() {
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('[data-starting-style]')) el.removeAttribute('data-starting-style')
    for (const region of document.querySelectorAll('[data-part="region"]')) {
      let offset = 0
      for (const el of [...region.querySelectorAll<HTMLElement>(':scope > [data-part="container"]')].reverse()) {
        el.style.setProperty('--toast-offset-y', `${offset}px`)
        el.style.setProperty('--toast-height', `${el.offsetHeight}px`)
        offset += el.offsetHeight
      }
    }
  })
  await page.waitForTimeout(300)
}

beforeAll(async () => {
  const body = [
    // The first frame has the first focusable element: the focus test presses Tab one time.
    frame('stack-dark', 'data-theme="dark" data-density="pointer"', [info, hidden, notSaved]),
    frame('more-dark', 'data-theme="dark" data-density="pointer"', [low, uploading]),
    frame('stack-light', 'data-theme="light" data-density="pointer"', [info, hidden, notSaved]),
    frame('more-light', 'data-theme="light" data-density="pointer"', [low, uploading]),
    frame('touch', 'data-theme="dark" data-density="touch"', [hidden]),
    frame('rtl', 'data-theme="dark" data-density="pointer" dir="rtl"', [hidden]),
    frame('wrap', 'data-density="pointer"', [
      {
        tone: 'success',
        title: 'The photos of the product Black shirt with a long sleeve are now on the page of the shop',
        text: 'Supercalifragilisticexpialidocious-and-a-very-long-word-with-no-space-in-it',
      },
    ]),
    frame('reduced', 'data-density="pointer" data-motion="reduced"', [uploading]),
    frame('disabled', 'data-density="pointer"', [
      { tone: 'info', title: 'Draft saved', text: 'Add a photo to publish', action: { label: 'Publish', ...press, disabled: true } },
    ]),
  ].join('')
  ;({ browser, page } = await openPage(body))
  await settle()
}, 60_000)

afterAll(async () => {
  await browser?.close()
})

const toast = (frameId: string, type: string) => `#${frameId} [data-part="container"][data-type="${type}"]`
const part = (frameId: string, type: string, name: string) => `${toast(frameId, type)} [data-part="${name}"]`
const frameBox = (id: string) => box(page, `#${id}`)

type Rgba = [number, number, number, number]
const rgba = (c: string): Rgba => {
  const n = (c.match(/rgba?\(([^)]+)\)/)?.[1] ?? '').split(/[\s,/]+/).filter(Boolean).map(Number)
  return [n[0] ?? 0, n[1] ?? 0, n[2] ?? 0, n[3] ?? 1]
}
const over = (fg: Rgba, bg: Rgba): Rgba => [0, 1, 2].map((i) => (fg[i] ?? 0) * fg[3] + (bg[i] ?? 0) * (1 - fg[3])).concat(1) as Rgba
const luminance = (c: Rgba) => {
  const f = (v: number) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2])
}
const contrast = (a: Rgba, b: Rgba) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

/** Scrolls the element into view, puts the pointer down at its center, and waits for the end of the transitions. */
async function pressAt(selector: string) {
  await page.locator(selector).first().scrollIntoViewIfNeeded()
  const rest = await box(page, selector)
  await page.mouse.move(rest.x + rest.width / 2, rest.y + rest.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(250)
  return rest
}

describe('Toast in Chrome', () => {
  it('toast/focus: Tab shows the ring on the action and on the close button: 2 px in the ring color, 2 px from the button', async () => {
    for (const name of ['Undo', 'Close']) {
      await page.keyboard.press('Tab')
      const label = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent)
      expect(label).toBe(name)
      const s = ':focus'
      expect(await style(page, s, 'outline-style')).toBe('solid')
      expect(await style(page, s, 'outline-width')).toBe('2px')
      expect(await style(page, s, 'outline-offset')).toBe('2px')
      expect(await style(page, s, 'outline-color')).toBe('rgb(92, 163, 255)')
    }
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  })

  it('toast/surface: the raised fill, the overlay shadow, and the large radius: 12 px for pointer, 14 px for touch', async () => {
    const s = toast('stack-dark', 'success')
    expect(await style(page, s, 'background-color')).toBe('rgb(30, 30, 30)')
    expect(await style(page, s, 'border-top-left-radius')).toBe('12px')
    // Tailwind puts its empty ring and inset shadows first. The overlay shadow is last.
    expect(await style(page, s, 'box-shadow')).toMatch(
      /rgba\(255, 255, 255, 0\.08\) 0px 0px 0px 1px, rgba\(0, 0, 0, 0\.35\) 0px 2px 4px 0px, rgba\(0, 0, 0, 0\.45\) 0px 12px 32px 0px$/,
    )
    expect(await style(page, toast('stack-light', 'success'), 'background-color')).toBe('rgb(255, 255, 255)')
    expect(await style(page, toast('touch', 'success'), 'border-top-left-radius')).toBe('14px')
  })

  it('toast/padding: 12 px at the top, the bottom, and the end; 14 px at the start; gaps of 12 px; the text 1 px below the title', async () => {
    const s = toast('stack-dark', 'success')
    expect(await style(page, s, 'padding-top')).toBe('12px')
    expect(await style(page, s, 'padding-bottom')).toBe('12px')
    expect(await style(page, s, 'padding-left')).toBe('14px')
    expect(await style(page, s, 'padding-right')).toBe('12px')
    const c = await box(page, s)
    const disc = await box(page, part('stack-dark', 'success', 'disc'))
    const title = await box(page, part('stack-dark', 'success', 'title'))
    const text = await box(page, part('stack-dark', 'success', 'text'))
    const action = await box(page, `${s} [data-mono="button"]`)
    const close = await box(page, `${s} [data-mono="icon-button"]`)
    expect(disc.x - c.x).toBe(14)
    expect(title.x - (disc.x + disc.width)).toBe(12)
    expect(action.x - (title.x + title.width)).toBe(12)
    expect(close.x - (action.x + action.width)).toBe(12)
    expect(c.x + c.width - (close.x + close.width)).toBe(12)
    expect(text.y - (title.y + title.height)).toBe(1)
  })

  it('toast/density: the title is 13 px for pointer and 14 px for touch, strong; the text is 12 px and 13 px', async () => {
    expect(await style(page, part('stack-dark', 'success', 'title'), 'font-size')).toBe('13px')
    expect(await style(page, part('stack-dark', 'success', 'title'), 'font-weight')).toBe('500')
    expect(await style(page, part('stack-dark', 'success', 'text'), 'font-size')).toBe('12px')
    expect(await style(page, part('touch', 'success', 'title'), 'font-size')).toBe('14px')
    expect(await style(page, part('touch', 'success', 'text'), 'font-size')).toBe('13px')
  })

  it('toast/text-color: the title has the strong text color and the text the secondary text color, in the two themes', async () => {
    expect(await style(page, part('stack-dark', 'success', 'title'), 'color')).toBe('rgb(245, 245, 245)')
    expect(await style(page, part('stack-dark', 'success', 'text'), 'color')).toBe('rgb(176, 176, 176)')
    expect(await style(page, part('stack-light', 'success', 'title'), 'color')).toBe('rgb(10, 10, 10)')
    expect(await style(page, part('stack-light', 'success', 'text'), 'color')).toBe('rgb(82, 82, 82)')
  })

  it('toast/icon-style: the icon is 16 px at the center of a round disc of 28 px, with the colors of the tone', async () => {
    for (const id of ['stack-dark', 'touch']) {
      const disc = await box(page, part(id, 'success', 'disc'))
      const icon = await box(page, `${part(id, 'success', 'disc')} svg`)
      expect([disc.width, disc.height]).toEqual([28, 28])
      expect([icon.width, icon.height]).toEqual([16, 16])
      expect([icon.x - disc.x, icon.y - disc.y]).toEqual([6, 6])
    }
    expect(await style(page, part('stack-dark', 'success', 'disc'), 'border-top-left-radius')).toBe('999px')
    const tones: [string, string, string, string][] = [
      ['stack-dark', 'info', 'rgba(92, 163, 255, 0.14)', 'rgb(92, 163, 255)'],
      ['stack-dark', 'success', 'rgba(3, 169, 126, 0.14)', 'rgb(47, 199, 156)'],
      ['more-dark', 'warning', 'rgba(251, 184, 75, 0.14)', 'rgb(251, 184, 75)'],
      ['stack-dark', 'danger', 'rgba(242, 85, 90, 0.14)', 'rgb(255, 123, 127)'],
      ['more-dark', 'loading', 'rgb(37, 37, 37)', 'rgb(176, 176, 176)'],
      ['stack-light', 'danger', 'rgba(217, 58, 64, 0.1)', 'rgb(196, 47, 53)'],
    ]
    for (const [id, type, fill, color] of tones) {
      expect(await style(page, part(id, type, 'disc'), 'background-color')).toBe(fill)
      expect(await style(page, part(id, type, 'disc'), 'color')).toBe(color)
    }
  })

  it('toast/contrast: in the two themes, the title and the text are 4.5 : 1 or more; the icon is 3 : 1 or more on its disc', async () => {
    for (const [id, types] of [
      ['stack-dark', ['info', 'success', 'danger']],
      ['more-dark', ['warning', 'loading']],
      ['stack-light', ['info', 'success', 'danger']],
      ['more-light', ['warning', 'loading']],
    ] as const) {
      for (const type of types) {
        const fill = rgba(await style(page, toast(id, type), 'background-color'))
        const title = rgba(await style(page, part(id, type, 'title'), 'color'))
        expect(contrast(title, fill)).toBeGreaterThanOrEqual(4.5)
        if (type !== 'loading') expect(contrast(rgba(await style(page, part(id, type, 'text'), 'color')), fill)).toBeGreaterThanOrEqual(4.5)
        const disc = over(rgba(await style(page, part(id, type, 'disc'), 'background-color')), fill)
        expect(contrast(rgba(await style(page, part(id, type, 'disc'), 'color')), disc)).toBeGreaterThanOrEqual(3)
      }
    }
  })

  it('toast/width and toast/position: on the web, a toast is 340 px wide, 16 px from the bottom edge and the right edge', async () => {
    const f = await frameBox('stack-dark')
    const region = await box(page, '#stack-dark [data-part="region"]')
    const newest = await box(page, toast('stack-dark', 'danger'))
    expect(region.width).toBe(340)
    expect(newest.width).toBe(340)
    expect(f.x + f.width - (region.x + region.width)).toBe(16)
    expect(f.y + f.height - (newest.y + newest.height)).toBe(16)
  })

  it('toast/queue-max: the newest toast is at the bottom; the older toasts are above it, with a gap of 10 px', async () => {
    const [oldest, middle, newest] = await Promise.all(['info', 'success', 'danger'].map((t) => box(page, toast('stack-dark', t))))
    if (!oldest || !middle || !newest) throw new Error('No stack')
    expect(middle.y - (oldest.y + oldest.height)).toBe(10)
    expect(newest.y - (middle.y + middle.height)).toBe(10)
  })

  it('toast/wrap: a long title and a long text go onto more lines; they are never cut', async () => {
    const title = part('wrap', 'success', 'title')
    const text = part('wrap', 'success', 'text')
    expect((await box(page, toast('wrap', 'success'))).width).toBe(340)
    expect((await box(page, title)).height).toBeGreaterThan(2 * 13)
    expect((await box(page, text)).height).toBeGreaterThan(2 * 12)
    for (const s of [title, text]) {
      expect(await page.locator(s).evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
      expect(await style(page, s, 'text-overflow')).toBe('clip')
      expect(await style(page, s, 'white-space')).toBe('normal')
    }
  })

  it('toast/direction: in right-to-left, the toasts are at the bottom left; the disc is at the right; the buttons at the left', async () => {
    const f = await frameBox('rtl')
    const region = await box(page, '#rtl [data-part="region"]')
    expect(region.x - f.x).toBe(16)
    const c = await box(page, toast('rtl', 'success'))
    const disc = await box(page, part('rtl', 'success', 'disc'))
    const title = await box(page, part('rtl', 'success', 'title'))
    const action = await box(page, '#rtl [data-mono="button"]')
    const close = await box(page, '#rtl [data-mono="icon-button"]')
    expect(c.x + c.width - (disc.x + disc.width)).toBe(14)
    expect(disc.x - (title.x + title.width)).toBe(12)
    expect(close.x - c.x).toBe(12)
    expect(action.x).toBeGreaterThan(close.x)
    expect(title.x).toBeGreaterThan(action.x)
  })

  it('toast/target: the target of the action and of the close button is 24 px or more for pointer, 44 px for touch', async () => {
    for (const [id, min] of [
      ['stack-dark', 24],
      ['touch', 44],
    ] as const) {
      for (const b of ['[data-mono="button"]', '[data-mono="icon-button"]']) {
        const s = `${toast(id, 'success')} ${b}`
        expect(Number.parseFloat(await style(page, s, 'height', '::after'))).toBeGreaterThanOrEqual(min)
        expect(Number.parseFloat(await style(page, s, 'width', '::after'))).toBeGreaterThanOrEqual(min)
      }
    }
    expect((await box(page, `${toast('stack-dark', 'success')} [data-mono="button"]`)).height).toBe(28)
    expect((await box(page, `${toast('touch', 'success')} [data-mono="icon-button"]`)).height).toBe(36)
  })

  it('toast/hover: the action gets the selected fill and the strong line; the close button gets the selected fill', async () => {
    const action = `${toast('stack-dark', 'success')} [data-mono="button"]`
    const close = `${toast('stack-dark', 'success')} [data-mono="icon-button"]`
    expect(await style(page, action, 'border-top-color')).toBe('rgb(46, 46, 46)')
    await page.locator(action).scrollIntoViewIfNeeded()
    await page.hover(action)
    await page.waitForTimeout(250)
    expect(await style(page, action, 'background-color')).toBe('rgb(37, 37, 37)')
    expect(await style(page, action, 'border-top-color')).toBe('rgb(72, 72, 72)')
    await page.hover(close)
    await page.waitForTimeout(250)
    expect(await style(page, close, 'background-color')).toBe('rgb(37, 37, 37)')
    await page.mouse.move(0, 0)
  })

  it('toast/press: at pointer down, the action scales to 0.97 and the close button to 0.96, in 100 ms', async () => {
    for (const [b, scale] of [
      ['[data-mono="button"]', 0.97],
      ['[data-mono="icon-button"]', 0.96],
    ] as const) {
      const s = `${toast('stack-dark', 'success')} ${b}`
      expect((await style(page, s, 'transition-duration')).split(', ').at(-1)).toBe('0.1s')
      const rest = await pressAt(s)
      expect((await box(page, s)).width / rest.width).toBeCloseTo(scale, 3)
      await page.mouse.up()
      await page.mouse.move(0, 0)
    }
  })

  it('toast/disabled: a disabled action has the disabled opacity', async () => {
    expect(await style(page, '#disabled [data-mono="button"]', 'opacity')).toBe('0.4')
  })

  it('toast/motion: the toast moves 16 px up and fades in for 200 ms with ease-out; it fades out for 150 ms with ease-in', async () => {
    const s = toast('more-dark', 'warning')
    expect(await style(page, s, 'transition-property')).toBe('opacity, translate, transform')
    expect(await style(page, s, 'transition-duration')).toBe('0.2s, 0.2s, 0.2s')
    expect(await style(page, s, 'transition-timing-function')).toBe(
      'cubic-bezier(0.3, 0.7, 0.2, 1), cubic-bezier(0.3, 0.7, 0.2, 1), cubic-bezier(0.65, 0, 0.35, 1)',
    )
    // The start of the entrance.
    await page.locator(s).evaluate((el) => el.setAttribute('data-starting-style', ''))
    await page.waitForTimeout(300)
    expect(await style(page, s, 'opacity')).toBe('0')
    expect(await style(page, s, 'translate')).toBe('0px 16px')
    await page.locator(s).evaluate((el) => el.removeAttribute('data-starting-style'))
    await page.waitForTimeout(300)
    expect(await style(page, s, 'opacity')).toBe('1')
    expect(await style(page, s, 'translate')).toBe('none')
    // The exit.
    await page.locator(s).evaluate((el) => el.setAttribute('data-ending-style', ''))
    expect((await style(page, s, 'transition-duration')).split(', ')[0]).toBe('0.15s')
    expect((await style(page, s, 'transition-timing-function')).startsWith('cubic-bezier(0.4, 0, 1, 1),')).toBe(true)
    await page.waitForTimeout(250)
    expect(await style(page, s, 'opacity')).toBe('0')
    expect(await style(page, s, 'translate')).toBe('none')
    await page.locator(s).evaluate((el) => el.removeAttribute('data-ending-style'))
    await page.waitForTimeout(300)
  })

  it('toast/motion-stack: the other toasts move to their new positions with ease-in-out; the parts do not move', async () => {
    const s = toast('more-dark', 'warning')
    const before = await box(page, s)
    // The newer toast goes out: Base UI gives it the height 0, and the older toast takes its index.
    await page.locator(s).evaluate((el) => {
      el.style.setProperty('--toast-offset-y', '0px')
      el.style.setProperty('--toast-index', '0')
    })
    await page.waitForTimeout(300)
    const after = await box(page, s)
    expect(after.y).toBeGreaterThan(before.y)
    expect((await style(page, s, 'transition-timing-function')).endsWith(', cubic-bezier(0.65, 0, 0.35, 1)')).toBe(true)
    expect(await style(page, `${s} > div`, 'transition-duration')).toBe('0s')
    expect(await style(page, part('more-dark', 'warning', 'disc'), 'transition-duration')).toBe('0s')
  })

  it('toast/reduced-motion: the spinner turns with no reduced motion; with reduced motion it pulses its opacity', async () => {
    const spinner = `${toast('more-dark', 'loading')} svg`
    expect(await style(page, spinner, 'animation-name')).toBe('mono-toast-spin')
    expect(await style(page, spinner, 'animation-duration')).toBe('1s')
    expect(await style(page, spinner, 'animation-iteration-count')).toBe('infinite')
    // data-motion="reduced" on an ancestor.
    expect(await style(page, `${toast('reduced', 'loading')} svg`, 'animation-name')).toBe('mono-toast-pulse')
    expect(await style(page, `${toast('reduced', 'loading')} svg`, 'animation-duration')).toBe('2s')
    expect(await style(page, toast('reduced', 'loading'), 'transition-duration')).toBe('0.15s, 0.2s, 0s')
  })

  it('toast/reduced-motion: with the reduced motion of the system, no move; a fade of 150 ms in and 100 ms out', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    try {
      const s = toast('more-light', 'warning')
      expect(await style(page, s, 'transition-duration')).toBe('0.15s, 0.2s, 0s')
      expect(await style(page, `${toast('more-light', 'loading')} svg`, 'animation-name')).toBe('mono-toast-pulse')
      await page.locator(s).evaluate((el) => el.setAttribute('data-starting-style', ''))
      await page.waitForTimeout(300)
      expect(await style(page, s, 'opacity')).toBe('0')
      expect(await style(page, s, 'translate')).toBe('0px')
      await page.locator(s).evaluate((el) => {
        el.removeAttribute('data-starting-style')
        el.setAttribute('data-ending-style', '')
      })
      expect((await style(page, s, 'transition-duration')).split(', ')[0]).toBe('0.1s')
      await page.locator(s).evaluate((el) => el.removeAttribute('data-ending-style'))
      await page.waitForTimeout(300)
    } finally {
      await page.emulateMedia({ reducedMotion: 'no-preference' })
    }
  })

  it('toast/position-keyboard and toast/not-obscured: the toasts go 16 px above the keyboard, or above a covered control', async () => {
    const f = await frameBox('touch')
    for (const prop of ['--toast-keyboard', '--toast-lift']) {
      await page.locator('#touch [data-part="region"]').evaluate((el, p) => (el as HTMLElement).style.setProperty(p, '300px'), prop)
      const region = await box(page, '#touch [data-part="region"]')
      expect(f.y + f.height - (region.y + region.height)).toBe(316)
      await page.locator('#touch [data-part="region"]').evaluate((el, p) => (el as HTMLElement).style.removeProperty(p), prop)
    }
  })

  it('toast/position-phone and toast/width: in a window less than 768 px wide, 16 px from each side; above the tab bar', async () => {
    const size = page.viewportSize()
    await page.setViewportSize({ width: 375, height: 720 })
    try {
      const f = await frameBox('touch')
      const region = () => box(page, '#touch [data-part="region"]')
      const r = await region()
      expect(r.x - f.x).toBe(16)
      expect(f.x + f.width - (r.x + r.width)).toBe(16)
      // toast/position-phone: with no tab bar, 16 px above the bottom safe area (0 px in this Chrome).
      expect(f.y + f.height - (r.y + r.height)).toBe(16)
      // toast/position: with a tab bar, 16 px above it.
      await page.evaluate(() => document.body.insertAdjacentHTML('beforeend', '<nav data-mono="tab-bar" id="bar"></nav>'))
      const above = await region()
      expect(f.y + f.height - (above.y + above.height)).toBe(56 + 16)
    } finally {
      await page.evaluate(() => document.getElementById('bar')?.remove())
      if (size) await page.setViewportSize(size)
    }
  })

  it('toast/position: in a window of 768 px or more, the tab bar does not move the toasts', async () => {
    await page.evaluate(() => document.body.insertAdjacentHTML('beforeend', '<nav data-mono="tab-bar" id="bar"></nav>'))
    try {
      const f = await frameBox('touch')
      const r = await box(page, '#touch [data-part="region"]')
      expect(f.y + f.height - (r.y + r.height)).toBe(16)
    } finally {
      await page.evaluate(() => document.getElementById('bar')?.remove())
    }
  })

  it('toast/position-tablet: on a tablet, the toasts are at the bottom right corner, as on the web', async () => {
    const size = page.viewportSize()
    await page.setViewportSize({ width: 820, height: 1180 })
    try {
      const f = await frameBox('touch')
      const r = await box(page, '#touch [data-part="region"]')
      expect(r.width).toBe(340)
      expect(f.x + f.width - (r.x + r.width)).toBe(16)
      expect(f.y + f.height - (r.y + r.height)).toBe(16)
    } finally {
      if (size) await page.setViewportSize(size)
    }
  })
})
