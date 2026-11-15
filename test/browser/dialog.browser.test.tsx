// @vitest-environment node
// The browser test of the Dialog: the real CSS in a real Chrome. It measures the clauses that jsdom cannot compute: the
// width and the place of the two forms, the sizes of the densities, the colors of the themes, the gaps, the focus ring,
// the direction, the layer, the overflow, the fold, and the motion. Base UI renders no dialog in static markup (the
// portal opens after the first render). Thus each page has the open layers of the component: the scrim, the viewport,
// and the container, with the classes and the content of the component. The jsdom test examines the behavior.
// Each test name starts with the id of a clause of ir/contracts/dialog.json.
import type { Browser, Page } from 'playwright-core'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Dialog } from '@monorithm/react/components/dialog/dialog'
import { DialogContent } from '@monorithm/react/components/dialog/dialog.content'
import { dialogContainer, dialogScrim, dialogViewport, type DialogVariant } from '@monorithm/react/components/dialog/dialog.variants'
import { box, buildCss, openPage, style } from './harness'

let browser: Browser
let page: Page
let css: string

const TITLE = 'Delete this product?'
const TEXT = 'The product goes to the trash. You can restore it for 30 days.'
const noop = () => {}

interface Layers {
  variant?: DialogVariant
  /** The axes on the portal, for example data-density="touch" dir="rtl". */
  axes?: Record<string, string>
  /** A state attribute of the motion on the scrim and the container: data-starting-style or data-ending-style. */
  motion?: 'data-starting-style' | 'data-ending-style'
  description?: string
  disabled?: boolean
  id?: string
}

/** The open layers of the Dialog, as the portal of Base UI has them. */
const layers = ({ variant = 'destructive', axes = {}, motion, description = TEXT, disabled, id = 'dlg' }: Layers) => {
  const state = { 'data-open': '', ...(motion ? { [motion]: '' } : {}) }
  return renderToStaticMarkup(
    <div id={id} data-base-ui-portal="" {...axes}>
      <div data-part="scrim" role="presentation" className={dialogScrim} {...state} />
      <div data-part="viewport" role="presentation" className={dialogViewport} {...state}>
        <div
          data-mono="dialog"
          data-variant={variant}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={`${id}-t`}
          aria-describedby={`${id}-d`}
          tabIndex={-1}
          className={dialogContainer}
          {...state}
        >
          <DialogContent
            variant={variant}
            title={TITLE}
            description={description}
            confirmLabel="Delete product"
            cancelLabel="Keep product"
            confirmDisabled={disabled}
            confirmDisabledReason={disabled ? 'The product is in an open order.' : undefined}
            titleId={`${id}-t`}
            descriptionId={`${id}-d`}
            onCancel={noop}
            onConfirm={noop}
          />
        </div>
      </div>
    </div>,
  )
}

/** Opens a page with the body, in a window of the size, with the theme on the root. */
async function show(body: string, width: number, height: number, root = 'data-theme="dark"') {
  await page.setViewportSize({ width, height })
  await page.setContent(`<!doctype html><html ${root}><head><style>${css}</style></head><body>${body}</body></html>`)
}

const part = (name: string, id = 'dlg') => `#${id} [data-part="${name}"]`
const container = (id = 'dlg') => `#${id} [data-mono="dialog"]`
const action = (name: string, id = 'dlg') => `#${id} [data-part="footer"] button:has-text("${name}")`

beforeAll(async () => {
  ;({ browser, page } = await openPage(layers({})))
  css = buildCss()
}, 60_000)

afterAll(async () => {
  await browser?.close()
})

describe('Dialog in Chrome', () => {
  it('dialog/role: Base UI renders no dialog in static markup; thus the page has the open layers of the component', () => {
    const markup = renderToStaticMarkup(<Dialog defaultOpen title={TITLE} description={TEXT} confirmLabel="Delete product" cancelLabel="Keep product" />)
    expect(markup).not.toContain('alertdialog')
  })

  it('dialog/width: from a window of 768 px wide, the dialog is 440 px wide, in the center of the window', async () => {
    for (const [w, h] of [
      [1280, 800],
      [768, 1024],
    ] as const) {
      await show(layers({ axes: { 'data-density': 'pointer' } }), w, h)
      const b = await box(page, container())
      expect(b.width).toBe(440)
      expect(b.x).toBe((w - 440) / 2)
      expect(Math.abs(b.y + b.height / 2 - h / 2)).toBeLessThanOrEqual(1)
    }
  })

  it('dialog/tablet: on a tablet (768 and 1024 px wide), the dialog is in the center with the web footer', async () => {
    for (const w of [768, 1024]) {
      await show(layers({ axes: { 'data-density': 'touch' } }), w, 1024)
      const b = await box(page, container())
      expect(b.x).toBe((w - 440) / 2)
      const keep = await box(page, action('Keep product'))
      const del = await box(page, action('Delete product'))
      expect(keep.y).toBe(del.y)
      expect(del.x).toBeGreaterThan(keep.x)
    }
  })

  it('dialog/container: the raised fill, the overlay shadow, and the large radius: 12 px pointer, 14 px touch', async () => {
    await show(layers({ axes: { 'data-density': 'pointer' } }) + layers({ id: 'touch', axes: { 'data-density': 'touch', 'data-theme': 'light' } }), 1024, 768)
    expect(await style(page, container(), 'background-color')).toBe('rgb(30, 30, 30)')
    // Tailwind puts four empty layers (the rings) before the shadow of the token.
    expect(await style(page, container(), 'box-shadow')).toMatch(
      /, rgba\(255, 255, 255, 0\.08\) 0px 0px 0px 1px, rgba\(0, 0, 0, 0\.35\) 0px 2px 4px 0px, rgba\(0, 0, 0, 0\.45\) 0px 12px 32px 0px$/,
    )
    for (const corner of ['top-left', 'top-right', 'bottom-left', 'bottom-right']) {
      expect(await style(page, container(), `border-${corner}-radius`)).toBe('12px')
      expect(await style(page, container('touch'), `border-${corner}-radius`)).toBe('14px')
    }
    expect(await style(page, container('touch'), 'background-color')).toBe('rgb(255, 255, 255)')
    expect(await style(page, container('touch'), 'box-shadow')).toContain('rgba(0, 0, 0, 0.06) 0px 0px 0px 1px')
  })

  it('dialog/scrim: the scrim covers the window: black at 60% in the dark theme, #0a0a0a at 40% in the light theme', async () => {
    await show(layers({}) + layers({ id: 'light', axes: { 'data-theme': 'light' } }), 1024, 768)
    expect(await style(page, part('scrim'), 'background-color')).toBe('rgba(0, 0, 0, 0.6)')
    expect(await style(page, part('scrim', 'light'), 'background-color')).toBe('rgba(10, 10, 10, 0.4)')
    expect(await box(page, part('scrim'))).toEqual({ x: 0, y: 0, width: 1024, height: 768 })
  })

  it('dialog/inert and dialog/layer: the dialog is above the page and a popover; a pointer cannot press the page', async () => {
    const popover = '<div id="popover" style="position:fixed;inset:0;z-index:50">Popover</div>'
    await show(`<button id="page" style="position:fixed;left:0;top:0;width:1024px;height:768px">Page</button>${popover}${layers({})}`, 1024, 768)
    expect(await style(page, part('scrim'), 'z-index')).toBe('60')
    expect(await style(page, part('viewport'), 'z-index')).toBe('60')
    const at = (x: number, y: number) =>
      page.evaluate(([px, py]) => {
        const el = document.elementFromPoint(px as number, py as number)
        if (el?.closest('[data-mono="dialog"]')) return 'dialog'
        return el?.closest('[data-part], #page, #popover')?.getAttribute('data-part') ?? el?.id
      }, [x, y])
    // A point out of the dialog is the viewport above the scrim; a point in the dialog is the dialog.
    expect(await at(10, 10)).toBe('viewport')
    const b = await box(page, container())
    expect(await at(b.x + 4, b.y + 4)).toBe('dialog')
  })

  it('dialog/spacing: a padding of 20 px; 6 px between the title and the text; 16 px between the text and the footer', async () => {
    for (const density of ['pointer', 'touch']) {
      await show(layers({ axes: { 'data-density': density } }), 1024, 768)
      for (const side of ['top', 'right', 'bottom', 'left']) expect(await style(page, container(), `padding-${side}`)).toBe('20px')
      const c = await box(page, container())
      const title = await box(page, part('title'))
      const text = await box(page, part('description'))
      const footer = await box(page, part('footer'))
      expect(title.y - c.y).toBe(20)
      expect(text.y - (title.y + title.height)).toBe(6)
      expect(footer.y - (text.y + text.height)).toBe(16)
      expect(c.y + c.height - (footer.y + footer.height)).toBe(20)
    }
  })

  it('dialog/type and dialog/density: pointer title 16 px, text 13 px, buttons 32 px; touch 17, 14, and 44 px', async () => {
    for (const [density, titleSize, textSize, height] of [
      ['pointer', '16px', '13px', 32],
      ['touch', '17px', '14px', 44],
    ] as const) {
      await show(layers({ axes: { 'data-density': density } }), 1024, 768)
      expect(await style(page, part('title'), 'font-size')).toBe(titleSize)
      expect(await style(page, part('title'), 'font-weight')).toBe('500')
      expect(await style(page, part('title'), 'color')).toBe('rgb(245, 245, 245)')
      expect(await style(page, part('description'), 'font-size')).toBe(textSize)
      expect(await style(page, part('description'), 'color')).toBe('rgb(176, 176, 176)')
      expect((await box(page, action('Keep product'))).height).toBe(height)
      expect((await box(page, action('Delete product'))).height).toBe(height)
    }
    await show(layers({ axes: { 'data-theme': 'light' } }), 1024, 768)
    expect(await style(page, part('title'), 'color')).toBe('rgb(10, 10, 10)')
    expect(await style(page, part('description'), 'color')).toBe('rgb(82, 82, 82)')
  })

  it('dialog/variant: the safe action is a ghost button; the confirm action is destructive, or primary for confirm', async () => {
    await show(layers({}) + layers({ id: 'confirm', variant: 'confirm' }), 1024, 768)
    expect(await style(page, action('Keep product'), 'background-color')).toBe('rgba(0, 0, 0, 0)')
    expect(await style(page, action('Delete product'), 'background-color')).toBe('rgba(242, 85, 90, 0.14)')
    expect(await style(page, action('Delete product'), 'color')).toBe('rgb(255, 123, 127)')
    expect(await style(page, action('Delete product', 'confirm'), 'background-color')).toBe('rgb(245, 245, 245)')
  })

  it('dialog/footer: the actions are at the end side, the confirm action last, with a gap of 8 px', async () => {
    await show(layers({ axes: { 'data-density': 'pointer' } }), 1024, 768)
    const c = await box(page, container())
    const keep = await box(page, action('Keep product'))
    const del = await box(page, action('Delete product'))
    expect(del.x + del.width).toBe(c.x + c.width - 20)
    expect(del.x - (keep.x + keep.width)).toBe(8)
    expect(keep.y).toBe(del.y)
  })

  it('dialog/target: each action has a target of the minimum target of the density or more: 24 px pointer, 44 px touch', async () => {
    for (const [density, min] of [
      ['pointer', 24],
      ['touch', 44],
    ] as const) {
      await show(layers({ axes: { 'data-density': density } }), 1024, 768)
      for (const name of ['Keep product', 'Delete product']) {
        const b = await box(page, action(name))
        expect(Math.min(b.width, b.height)).toBeGreaterThanOrEqual(min)
        expect(parseFloat(await style(page, action(name), 'min-height', '::after'))).toBe(min)
      }
    }
  })

  it('dialog/focus: Tab shows the ring on the focused action: 2 px in the ring color, 2 px from the button', async () => {
    await show(layers({ axes: { 'data-density': 'pointer' } }), 1024, 768)
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => document.activeElement?.textContent)).toBe('Keep product')
    const keep = action('Keep product')
    expect(await style(page, keep, 'outline-style')).toBe('solid')
    expect(await style(page, keep, 'outline-width')).toBe('2px')
    expect(await style(page, keep, 'outline-offset')).toBe('2px')
    expect(await style(page, keep, 'outline-color')).toBe('rgb(92, 163, 255)')
  })

  it('dialog/disabled: a disabled action has the disabled opacity, and the dialog shows why', async () => {
    await show(layers({ disabled: true }), 1024, 768)
    expect(await style(page, action('Delete product'), 'opacity')).toBe('0.4')
    expect(await page.locator(part('reason')).textContent()).toBe('The product is in an open order.')
  })

  it('dialog/direction: in right-to-left, the text starts at the right; the actions are at the left end, the confirm action last', async () => {
    await show(layers({ axes: { 'data-density': 'pointer', dir: 'rtl' } }), 1024, 768)
    const c = await box(page, container())
    expect(await style(page, part('title'), 'direction')).toBe('rtl')
    expect(await style(page, part('title'), 'text-align')).toBe('start')
    // The right edge of the text of the title is at the start side: the right padding edge.
    const right = await page.locator(part('title')).evaluate((el) => {
      const range = document.createRange()
      range.selectNodeContents(el)
      return Math.max(...[...range.getClientRects()].map((r) => r.right))
    })
    expect(Math.round(right)).toBe(c.x + c.width - 20)
    const keep = await box(page, action('Keep product'))
    const del = await box(page, action('Delete product'))
    expect(del.x).toBe(c.x + 20)
    expect(keep.x - (del.x + del.width)).toBe(8)
  })

  it('dialog/overflow: in a low window, the dialog stays inside the window and the content scrolls; no text is cut', async () => {
    const long = Array.from({ length: 30 }, () => TEXT).join(' ')
    await show(layers({ description: long, axes: { 'data-density': 'touch' } }), 1024, 400)
    const c = await box(page, container())
    expect(c.y).toBeGreaterThanOrEqual(0)
    expect(c.y + c.height).toBeLessThanOrEqual(400)
    expect(await style(page, container(), 'overflow-y')).toBe('auto')
    const scroll = await page.locator(container()).evaluate((el) => ({ client: el.clientHeight, all: el.scrollHeight }))
    expect(scroll.all).toBeGreaterThan(scroll.client)
    // The text wraps: no line is wider than the container.
    expect(await page.locator(part('description')).evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
    // A scroll to the end shows the footer in the window.
    await page.locator(container()).evaluate((el) => el.scrollTo(0, el.scrollHeight))
    const footer = await box(page, part('footer'))
    expect(footer.y + footer.height).toBeLessThanOrEqual(400)
  })

  it('dialog/phone: below 768 px wide, a bottom sheet with the handle, a top radius of 16 px, and a padding of 16 px', async () => {
    for (const w of [390, 767]) {
      await show(layers({ axes: { 'data-density': 'touch' } }), w, 844)
      const c = await box(page, container())
      expect(c).toMatchObject({ x: 0, width: w })
      expect(c.y + c.height).toBe(844)
      expect(await style(page, container(), 'border-top-left-radius')).toBe('16px')
      expect(await style(page, container(), 'border-top-right-radius')).toBe('16px')
      expect(await style(page, container(), 'border-bottom-left-radius')).toBe('0px')
      for (const side of ['top', 'right', 'left']) expect(await style(page, container(), `padding-${side}`)).toBe('16px')
      // The bottom padding adds the bottom safe area (0 px in this window).
      expect(await style(page, container(), 'padding-bottom')).toBe('16px')
      const handle = await box(page, part('handle'))
      expect(handle).toMatchObject({ width: 36, height: 4, y: c.y + 8 })
      expect(handle.x + handle.width / 2).toBe(w / 2)
      expect(await style(page, part('handle'), 'background-color')).toBe('rgb(72, 72, 72)')
    }
    await show(layers({}), 1024, 768)
    expect(await style(page, part('handle'), 'display')).toBe('none')
  })

  it('dialog/footer-phone: below 768 px wide, large buttons stacked at full width, the confirm action first, a gap of 12 px', async () => {
    for (const [density, height] of [
      ['touch', 52],
      ['pointer', 40],
    ] as const) {
      await show(layers({ axes: { 'data-density': density } }), 390, 844)
      const keep = await box(page, action('Keep product'))
      const del = await box(page, action('Delete product'))
      expect([keep.width, del.width]).toEqual([390 - 32, 390 - 32])
      expect([keep.height, del.height]).toEqual([height, height])
      expect(keep.y - (del.y + del.height)).toBe(12)
    }
  })

  it('dialog/surfaces: the title, the text, and the actions are the same in the web form and the phone form', async () => {
    const content = async (w: number) => {
      await show(layers({}), w, 844)
      return page.locator(container()).evaluate((el) => (el as HTMLElement).innerText)
    }
    expect(await content(390)).toBe(await content(1024))
  })

  it('dialog/motion: the dialog scales from 0.96 and fades in for 200 ms ease-out; it scales back and fades out for 150 ms ease-in', async () => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await show(layers({ id: 'rest' }) + layers({ id: 'in', motion: 'data-starting-style' }) + layers({ id: 'out', motion: 'data-ending-style' }), 1024, 768)
    expect(await style(page, container('rest'), 'scale')).toBe('none')
    expect(await style(page, container('rest'), 'opacity')).toBe('1')
    for (const id of ['in', 'out']) {
      expect(await style(page, container(id), 'scale')).toBe('0.96')
      expect(await style(page, container(id), 'opacity')).toBe('0')
      expect(await style(page, part('scrim', id), 'opacity')).toBe('0')
    }
    expect(await style(page, container('in'), 'transition-property')).toBe('opacity, scale, translate')
    expect(await style(page, container('rest'), 'transition-duration')).toBe('0.2s')
    expect(await style(page, container('rest'), 'transition-timing-function')).toBe('cubic-bezier(0.3, 0.7, 0.2, 1)')
    expect(await style(page, container('out'), 'transition-duration')).toBe('0.15s')
    expect(await style(page, container('out'), 'transition-timing-function')).toBe('cubic-bezier(0.4, 0, 1, 1)')
    // dialog/motion: the scrim fades with the dialog.
    expect(await style(page, part('scrim', 'rest'), 'transition-duration')).toBe('0.2s')
    expect(await style(page, part('scrim', 'out'), 'transition-duration')).toBe('0.15s')
  })

  it('dialog/motion-phone: the sheet comes up from the bottom edge for 320 ms ease-out and goes down for 200 ms ease-in', async () => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await show(layers({ id: 'rest' }) + layers({ id: 'in', motion: 'data-starting-style' }) + layers({ id: 'out', motion: 'data-ending-style' }), 390, 844)
    for (const id of ['in', 'out']) {
      // The move is the full height of the sheet: the sheet is just below the bottom edge of the window.
      expect(await style(page, container(id), 'translate')).toBe('0px 100%')
      expect((await box(page, container(id))).y).toBe(844)
      expect(await style(page, container(id), 'scale')).toBe('1')
      expect(await style(page, container(id), 'opacity')).toBe('1')
      expect(await style(page, part('scrim', id), 'opacity')).toBe('0')
    }
    expect(await style(page, container('rest'), 'transition-duration')).toBe('0.32s')
    expect(await style(page, container('rest'), 'transition-timing-function')).toBe('cubic-bezier(0.3, 0.7, 0.2, 1)')
    expect(await style(page, container('out'), 'transition-duration')).toBe('0.2s')
    expect(await style(page, container('out'), 'transition-timing-function')).toBe('cubic-bezier(0.4, 0, 1, 1)')
    // dialog/motion-phone: the scrim follows the sheet.
    expect(await style(page, part('scrim', 'rest'), 'transition-duration')).toBe('0.32s')
    expect(await style(page, part('scrim', 'out'), 'transition-duration')).toBe('0.2s')
  })

  it('dialog/motion-reduced: no scale and no move; a fade in of 150 ms and a fade out of 100 ms, also for the sheet', async () => {
    const check = async () => {
      for (const id of ['in', 'out']) {
        expect(await style(page, container(id), 'scale')).toBe('1')
        expect(await style(page, container(id), 'translate')).toBe('0px')
        expect(await style(page, container(id), 'opacity')).toBe('0')
        expect(await style(page, part('scrim', id), 'opacity')).toBe('0')
      }
      expect(await style(page, container('rest'), 'transition-duration')).toBe('0.15s')
      expect(await style(page, container('out'), 'transition-duration')).toBe('0.1s')
      expect(await style(page, part('scrim', 'rest'), 'transition-duration')).toBe('0.15s')
      expect(await style(page, part('scrim', 'out'), 'transition-duration')).toBe('0.1s')
    }
    const body = layers({ id: 'rest' }) + layers({ id: 'in', motion: 'data-starting-style' }) + layers({ id: 'out', motion: 'data-ending-style' })
    // The system option, in the web form and in the phone form.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    for (const w of [1024, 390]) {
      await show(body, w, 844)
      await check()
    }
    // data-motion="reduced" on an ancestor, with full motion in the system.
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    for (const w of [1024, 390]) {
      await show(body, w, 844, 'data-theme="dark" data-motion="reduced"')
      await check()
    }
  })

  it('dialog/direction-motion: the motion does not mirror; the scale starts at the center; the sheet comes up from the bottom edge', async () => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    for (const w of [1024, 390]) {
      await show(layers({ id: 'ltr', motion: 'data-starting-style' }) + layers({ id: 'rtl', motion: 'data-starting-style', axes: { dir: 'rtl' } }), w, 844)
      for (const prop of ['scale', 'translate', 'transform-origin']) {
        expect(await style(page, container('rtl'), prop)).toBe(await style(page, container('ltr'), prop))
      }
      // The origin is the center of the layout box (the box before the scale and the move).
      const size = await Promise.all(['width', 'height'].map(async (p) => parseFloat(await style(page, container('ltr'), p))))
      const origin = (await style(page, container('ltr'), 'transform-origin')).split(' ').map(parseFloat)
      expect(origin).toEqual(size.map((n) => n / 2))
    }
  })

  it('dialog/foldable: on a foldable, the dialog stays on one side of the fold', async () => {
    const cdp = await page.context().newCDPSession(page)
    // A vertical fold at 500 px: two segments side by side. A horizontal fold at 400 px: two segments, one above the other.
    for (const feature of [
      { orientation: 'vertical', offset: 500, maskLength: 24 },
      { orientation: 'horizontal', offset: 400, maskLength: 24 },
    ] as const) {
      await show(layers({}), 1024, 824)
      await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 824, deviceScaleFactor: 1, mobile: false, displayFeature: feature })
      await page.waitForTimeout(100)
      const c = await box(page, container())
      if (feature.orientation === 'vertical') {
        expect(c.x + c.width).toBeLessThanOrEqual(feature.offset)
        expect(c.x).toBe((feature.offset - 440) / 2)
      } else {
        expect(c.y + c.height).toBeLessThanOrEqual(feature.offset)
      }
    }
    await cdp.send('Emulation.clearDeviceMetricsOverride')
    await cdp.detach()
  })
})
