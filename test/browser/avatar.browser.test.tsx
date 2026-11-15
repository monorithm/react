// @vitest-environment node
// The browser test of the Avatar, the Avatar group, and the Avatar button: the real CSS in a real Chrome. It measures the
// clauses that jsdom cannot compute: the sizes of the densities, the shapes, the rings, the colors of each theme, the
// overlap of a group, the seller line, the direction, the focus ring, the hover, the press, and the motion. Each test name
// starts with the id of a clause of ir/contracts/avatar.json.
import type { Browser, BrowserContext, Page } from 'playwright-core'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Avatar } from '@monorithm/react/components/avatar/avatar'
import { AvatarButton } from '@monorithm/react/components/avatar/avatar.button'
import { AvatarGroup } from '@monorithm/react/components/avatar/avatar.group'
import { box, cell, openPage, style } from './harness'

let browser: Browser
let page: Page
/** A context with touch and no hover: the media of a phone. */
let phoneContext: BrowserContext
let phone: Page

const html = (node: ReactNode) => renderToStaticMarkup(<>{node}</>)
const SIZES = ['xs', 'sm', 'md', 'lg'] as const
/** A photo of 200 x 100 px: the ratio 2 : 1. The avatar must crop it, not stretch it. */
const PHOTO = `data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='200' height='100'><rect width='100' height='100' fill='red'/><rect x='100' width='100' height='100' fill='blue'/></svg>",
)}`
const followers = [{ name: 'Kwame' }, { name: 'Efua' }, { name: 'Yaw' }, { name: 'Akosua' }]

const sizes = (
  <>
    {SIZES.map((s) => (
      <Avatar key={`p-${s}`} name="Ama Mensah" size={s} />
    ))}
    {SIZES.map((s) => (
      <Avatar key={`o-${s}`} name="Kente Shop" variant="organization" size={s} />
    ))}
    <AvatarButton name="Ama Mensah" />
  </>
)
const themed = (
  <>
    <Avatar name="Ama Mensah" />
    <AvatarButton name="Ama Mensah" className="btn" />
    <AvatarGroup items={followers} total={6} size="sm" />
    <Avatar name="Ama Mensah" handle="@amamensah" />
  </>
)
const directed = (
  <>
    <AvatarGroup items={followers} total={6} size="sm" />
    <div>
      <Avatar name="Ama Mensah" handle="@amamensah" />
    </div>
    <Avatar name="Ama Mensah" size="lg" className="latin" />
    <Avatar name="דוד לוי" size="lg" className="hebrew" />
  </>
)

beforeAll(async () => {
  const body = [
    // The first cell has the first focusable element after an avatar: the focus test presses Tab one time.
    cell('focus', 'data-density="pointer"', html(<><Avatar name="Ama Mensah" /><AvatarButton name="Ama Mensah" className="first" /></>)),
    ...(['pointer', 'touch'] as const).map((d) => cell(`sizes-${d}`, `data-density="${d}"`, html(sizes))),
    ...(['dark', 'light'] as const).map((t) => cell(`theme-${t}`, `data-theme="${t}" data-density="pointer"`, html(themed))),
    cell('photo', 'data-density="pointer"', html(<Avatar name="Ama Mensah" src={PHOTO} />)),
    ...(['ltr', 'rtl'] as const).map((dir) => cell(`dir-${dir}`, `data-density="pointer" dir="${dir}"`, html(directed))),
    cell('disabled', 'data-density="pointer"', html(<AvatarButton name="Ama Mensah" disabled />)),
    cell('reduced', 'data-density="pointer" data-motion="reduced"', html(<AvatarButton name="Ama Mensah" />)),
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

/** Moves the pointer away, releases it, and waits for the end of the transitions. */
async function release(p: Page) {
  await p.mouse.move(0, 0)
  await p.mouse.up()
  await p.waitForTimeout(250)
}

/** Moves the pointer away and waits for the end of the transitions. */
async function leave(p: Page) {
  await p.mouse.move(0, 0)
  await p.waitForTimeout(250)
}

/** Scrolls the element into view, moves the pointer onto it, and waits for the end of the transitions. */
async function hoverOn(p: Page, selector: string) {
  await p.locator(selector).first().scrollIntoViewIfNeeded()
  await p.hover(selector)
  await p.waitForTimeout(250)
}

const avatar = (cellId: string, variant: 'person' | 'organization', size: string) =>
  `#${cellId} [role="img"][data-variant="${variant}"][data-size="${size}"]`
const button = (cellId: string) => `#${cellId} button[data-variant="button"]`
const group = (cellId: string) => `#${cellId} [data-part="group"]`
const line = (cellId: string) => `#${cellId} [data-part="line"]`

/** The x of the left edge of each character of the initials, in the sequence of the name. */
const letterX = (p: Page, selector: string) =>
  p.locator(`${selector} [data-part="initials"]`).evaluate((el) => {
    const text = el.firstChild as Text
    return [...Array(text.length).keys()].map((i) => {
      const range = document.createRange()
      range.setStart(text, i)
      range.setEnd(text, i + 1)
      return range.getBoundingClientRect().x
    })
  })

describe('Avatar in Chrome', () => {
  it('avatar/size: 24, 32, 40, and 56 px, with the width the same as the height, for each variant', async () => {
    for (const variant of ['person', 'organization'] as const) {
      const got = []
      for (const s of SIZES) {
        const b = await box(page, avatar('sizes-pointer', variant, s))
        got.push([b.width, b.height])
      }
      expect(got).toEqual([
        [24, 24],
        [32, 32],
        [40, 40],
        [56, 56],
      ])
    }
  })

  it('avatar/density: the touch density does not change an avatar or its initials; the avatar button changes', async () => {
    for (const s of SIZES) {
      const p = await box(page, avatar('sizes-pointer', 'person', s))
      const t = await box(page, avatar('sizes-touch', 'person', s))
      expect([t.width, t.height]).toEqual([p.width, p.height])
      const pi = await style(page, `${avatar('sizes-pointer', 'person', s)} [data-part="initials"]`, 'font-size')
      expect(await style(page, `${avatar('sizes-touch', 'person', s)} [data-part="initials"]`, 'font-size')).toBe(pi)
    }
    expect((await box(page, button('sizes-pointer'))).width).toBe(32)
    expect((await box(page, button('sizes-touch'))).width).toBe(44)
  })

  it('avatar/shape: a person is round; an organization has a radius of 28% of its size', async () => {
    const want = { xs: '6.72px', sm: '8.96px', md: '11.2px', lg: '15.68px' }
    for (const s of SIZES) {
      expect(await style(page, avatar('sizes-pointer', 'person', s), 'border-top-left-radius')).toBe('999px')
      expect(await style(page, avatar('sizes-pointer', 'organization', s), 'border-top-left-radius')).toBe(want[s])
    }
  })

  it('avatar/initials-style: 10, 12, 14, and 18 px, at the center, with the strong weight and no tracking', async () => {
    const got = []
    for (const s of SIZES) got.push(await style(page, `${avatar('sizes-pointer', 'person', s)} [data-part="initials"]`, 'font-size'))
    expect(got).toEqual(['10px', '12px', '14px', '18px'])
    const sel = avatar('sizes-pointer', 'person', 'lg')
    expect(await style(page, `${sel} [data-part="initials"]`, 'font-weight')).toBe('500')
    // Chrome gives "normal" for a letter spacing of 0 px. The geometry gives 0 px.
    expect(await style(page, `${sel} [data-part="initials"]`, '--mono-avatar-initials-tracking')).toBe('0px')
    expect(await style(page, `${sel} [data-part="initials"]`, 'letter-spacing')).toMatch(/^(normal|0px)$/)
    const c = await box(page, sel)
    const i = await box(page, `${sel} [data-part="initials"]`)
    expect(i.x + i.width / 2).toBeCloseTo(c.x + c.width / 2, 0)
    expect(i.y + i.height / 2).toBeCloseTo(c.y + c.height / 2, 0)
  })

  it('avatar/initials-style and avatar/fallback: the secondary text color on the selected fill, in each theme', async () => {
    const sel = (t: string) => avatar(`theme-${t}`, 'person', 'md')
    expect(await style(page, `${sel('dark')} [data-part="initials"]`, 'color')).toBe('rgb(176, 176, 176)')
    expect(await style(page, sel('dark'), 'background-color')).toBe('rgb(37, 37, 37)')
    expect(await style(page, `${sel('light')} [data-part="initials"]`, 'color')).toBe('rgb(82, 82, 82)')
    expect(await style(page, sel('light'), 'background-color')).toBe('rgb(235, 235, 235)')
  })

  it('avatar/ring: a ring of 1 px: white at 12% in the dark theme, black at 10% in the light theme', async () => {
    const sel = (t: string) => avatar(`theme-${t}`, 'person', 'md')
    expect(await style(page, sel('dark'), 'border-top-width', '::after')).toBe('1px')
    expect(await style(page, sel('dark'), 'border-top-color', '::after')).toBe('rgba(255, 255, 255, 0.12)')
    expect(await style(page, sel('light'), 'border-top-color', '::after')).toBe('rgba(0, 0, 0, 0.1)')
    // The ring is on the edge of the shape: the full box, with the radius of the shape.
    const c = await box(page, sel('dark'))
    expect(await style(page, sel('dark'), 'width', '::after')).toBe(`${c.width}px`)
    expect(await style(page, sel('dark'), 'border-top-left-radius', '::after')).toBe('999px')
  })

  it('avatar/photo: a photo of the ratio 2 : 1 fills the 1 : 1 shape with a crop, and it does not stretch', async () => {
    await page.waitForFunction(() => (document.querySelector('#photo img') as HTMLImageElement | null)?.complete === true)
    const natural = await page.locator('#photo img').evaluate((el) => [(el as HTMLImageElement).naturalWidth, (el as HTMLImageElement).naturalHeight])
    expect(natural).toEqual([200, 100])
    const c = await box(page, '#photo [role="img"]')
    const i = await box(page, '#photo img')
    expect([i.x, i.y, i.width, i.height]).toEqual([c.x, c.y, c.width, c.height])
    expect(await style(page, '#photo img', 'object-fit')).toBe('cover')
    // The ring is over the photo.
    expect(await style(page, '#photo [role="img"]', 'border-top-color', '::after')).toBe('rgba(255, 255, 255, 0.12)')
  })

  it('avatar/group and avatar/count: three avatars and the count, all with the same size', async () => {
    const items = page.locator(`${group('theme-dark')} > *`)
    expect(await items.count()).toBe(4)
    expect(await page.locator(`${group('theme-dark')} [data-part="count"]`).textContent()).toBe('+3')
    for (let i = 0; i < 4; i++) {
      const b = await items.nth(i).boundingBox()
      expect([b?.width, b?.height]).toEqual([32, 32])
    }
  })

  it('avatar/count: the shape and the initials style of an avatar, on the pressed fill', async () => {
    const count = `${group('theme-dark')} [data-part="count"]`
    const item = `${group('theme-dark')} [data-part="item"]`
    expect(await style(page, count, 'border-top-left-radius')).toBe('999px')
    expect(await style(page, count, 'font-size')).toBe(await style(page, `${item} [data-part="initials"]`, 'font-size'))
    expect(await style(page, count, 'font-size')).toBe('12px')
    expect(await style(page, count, 'font-weight')).toBe('500')
    expect(await style(page, count, 'color')).toBe('rgb(176, 176, 176)')
    expect(await style(page, count, 'background-color')).toBe('rgb(46, 46, 46)')
    expect(await style(page, `${group('theme-light')} [data-part="count"]`, 'background-color')).toBe('rgb(224, 224, 224)')
  })

  it('avatar/group-overlap: each item overlaps the item before it by 8 px; a ring of 2 px in the surface color replaces the avatar ring', async () => {
    const items = page.locator(`${group('dir-ltr')} > *`)
    for (let i = 1; i < 4; i++) {
      const before = await items.nth(i - 1).boundingBox()
      const after = await items.nth(i).boundingBox()
      expect((before?.x ?? 0) + (before?.width ?? 0) - (after?.x ?? 0)).toBe(8)
    }
    const item = `${group('theme-dark')} [data-part="item"]`
    // Tailwind puts its empty ring and inset shadows first. The ring of the group is the last shadow.
    expect(await style(page, item, 'box-shadow')).toMatch(/, rgb\(20, 20, 20\) 0px 0px 0px 2px$/)
    expect(await style(page, `${group('theme-light')} [data-part="count"]`, 'box-shadow')).toMatch(/, rgb\(255, 255, 255\) 0px 0px 0px 2px$/)
    expect(await style(page, item, 'content', '::after')).toBe('none')
  })

  it('avatar/seller-line: the avatar, the name, and the handle, with a gap of 8 px and the type styles of the contract', async () => {
    const l = line('theme-dark')
    const a = await box(page, `${l} > [data-mono="avatar"]`)
    const n = await box(page, `${l} [data-part="name"]`)
    const h = await box(page, `${l} [data-part="handle"]`)
    expect([a.width, a.height]).toEqual([24, 24])
    expect(n.x - (a.x + a.width)).toBeCloseTo(8, 1)
    expect(h.x - (n.x + n.width)).toBeCloseTo(8, 1)
    expect(await style(page, `${l} [data-part="name"]`, 'font-size')).toBe('13px')
    expect(await style(page, `${l} [data-part="name"]`, 'font-weight')).toBe('500')
    expect(await style(page, `${l} [data-part="name"]`, 'color')).toBe('rgb(224, 224, 224)')
    expect(await style(page, `${l} [data-part="handle"]`, 'font-size')).toBe('12px')
    expect(await style(page, `${l} [data-part="handle"]`, 'color')).toBe('rgb(158, 158, 158)')
    expect(await style(page, `${line('theme-light')} [data-part="handle"]`, 'color')).toBe('rgb(107, 107, 107)')
  })

  it('avatar/direction: in right-to-left, a group starts at the right and the count is at the left end', async () => {
    const items = page.locator(`${group('dir-rtl')} > *`)
    const xs = []
    for (let i = 0; i < 4; i++) xs.push((await items.nth(i).boundingBox())?.x ?? 0)
    expect(xs).toEqual([...xs].sort((p, q) => q - p))
    for (let i = 1; i < 4; i++) {
      const before = await items.nth(i - 1).boundingBox()
      const after = await items.nth(i).boundingBox()
      expect((after?.x ?? 0) + (after?.width ?? 0) - (before?.x ?? 0)).toBe(8)
    }
    expect(await items.nth(3).getAttribute('data-part')).toBe('count')
  })

  it('avatar/direction: in right-to-left, the avatar of a seller line is at the right of the name', async () => {
    const l = line('dir-rtl')
    const a = await box(page, `${l} > [data-mono="avatar"]`)
    const n = await box(page, `${l} [data-part="name"]`)
    const h = await box(page, `${l} [data-part="handle"]`)
    expect(a.x - (n.x + n.width)).toBeCloseTo(8, 1)
    expect(n.x - (h.x + h.width)).toBeCloseTo(8, 1)
  })

  it('avatar/initials-direction: Latin initials go from left to right also in right-to-left; Hebrew initials go from right to left also in left-to-right', async () => {
    const [a, m] = await letterX(page, '#dir-rtl .latin')
    expect(a as number).toBeLessThan(m as number)
    const [d, l] = await letterX(page, '#dir-ltr .hebrew')
    expect(d as number).toBeGreaterThan(l as number)
  })

  it('avatar/not-a-control: Tab does not stop on an avatar; at hover, an avatar does not change', async () => {
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))).toBe('Account')
    expect(await page.evaluate(() => document.activeElement?.closest('#focus') !== null)).toBe(true)
    const sel = avatar('theme-dark', 'person', 'md')
    const before = [await style(page, sel, 'background-color'), await style(page, sel, 'border-top-color', '::after')]
    await hoverOn(page, sel)
    expect([await style(page, sel, 'background-color'), await style(page, sel, 'border-top-color', '::after')]).toEqual(before)
    expect(await style(page, sel, 'cursor')).toBe('auto')
    await leave(page)
  })

  it('avatar/focus: Tab shows the ring: 2 px in the ring color, 2 px from the button', async () => {
    // The test before pressed Tab one time: the focus is on the avatar button of the first cell.
    expect(await page.evaluate(() => document.activeElement?.classList.contains('first'))).toBe(true)
    expect(await style(page, '#focus .first', 'outline-style')).toBe('solid')
    expect(await style(page, '#focus .first', 'outline-width')).toBe('2px')
    expect(await style(page, '#focus .first', 'outline-offset')).toBe('2px')
    expect(await style(page, '#focus .first', 'outline-color')).toBe('rgb(92, 163, 255)')
  })

  it('avatar/focus: a pointer press shows no ring', async () => {
    const s = button('theme-dark')
    await pressAt(page, s)
    await page.mouse.up()
    expect(await page.evaluate(() => document.activeElement?.classList.contains('btn'))).toBe(true)
    expect(await style(page, s, 'outline-style')).toBe('none')
    await leave(page)
  })

  it('avatar/button: round, 32 px for pointer and 44 px for touch, with the background fill and the avatar ring', async () => {
    const p = await box(page, button('sizes-pointer'))
    const t = await box(page, button('sizes-touch'))
    expect([p.width, p.height, t.width, t.height]).toEqual([32, 32, 44, 44])
    const d = button('theme-dark')
    expect(await style(page, d, 'border-top-left-radius')).toBe('999px')
    expect(await style(page, d, 'background-color')).toBe('rgb(24, 24, 24)')
    expect(await style(page, d, 'border-top-width')).toBe('1px')
    expect(await style(page, d, 'border-top-color')).toBe('rgba(255, 255, 255, 0.12)')
    expect(await style(page, button('theme-light'), 'background-color')).toBe('rgb(250, 250, 250)')
    expect(await style(page, button('theme-light'), 'border-top-color')).toBe('rgba(0, 0, 0, 0.1)')
  })

  it('avatar/button-initials: the initials of the button are 12 px for pointer and 13 px for touch', async () => {
    expect(await style(page, `${button('sizes-pointer')} [data-part="initials"]`, 'font-size')).toBe('12px')
    expect(await style(page, `${button('sizes-touch')} [data-part="initials"]`, 'font-size')).toBe('13px')
    expect(await style(page, `${button('theme-dark')} [data-part="initials"]`, 'color')).toBe('rgb(176, 176, 176)')
  })

  it('avatar/target: the target is 24 px or more for pointer and 44 px or more for touch, on each axis', async () => {
    for (const [d, min] of [
      ['pointer', 24],
      ['touch', 44],
    ] as const) {
      expect(parseFloat(await style(page, button(`sizes-${d}`), 'width', '::after'))).toBeGreaterThanOrEqual(min)
      expect(parseFloat(await style(page, button(`sizes-${d}`), 'height', '::after'))).toBeGreaterThanOrEqual(min)
    }
  })

  it('avatar/hover: at hover, the ring of the avatar button changes to the strong line color in 150 ms', async () => {
    const s = button('theme-dark')
    expect(await style(page, s, 'transition-property')).toContain('border-color')
    expect(await style(page, s, 'transition-duration')).toBe('0.15s, 0.15s, 0.15s, 0.15s, 0.1s')
    await hoverOn(page, s)
    expect(await style(page, s, 'border-top-color')).toBe('rgb(72, 72, 72)')
    expect(await style(page, s, 'background-color')).toBe('rgb(24, 24, 24)')
    await leave(page)
  })

  it('avatar/hover: a device with no hover shows no hover state', async () => {
    expect(await phone.evaluate(() => matchMedia('(hover: none)').matches)).toBe(true)
    const s = button('theme-dark')
    await hoverOn(phone, s)
    expect(await style(phone, s, 'border-top-color')).toBe('rgba(255, 255, 255, 0.12)')
  })

  it('avatar/press and avatar/state-sign: at pointer down, the avatar button scales to 0.96 in 100 ms', async () => {
    const s = button('sizes-pointer')
    const rest = await pressAt(page, s)
    expect((await box(page, s)).width / rest.width).toBeCloseTo(0.96, 3)
    expect(await style(page, s, 'background-color')).toBe('rgb(24, 24, 24)')
    await release(page)
  })

  it('avatar/disabled and avatar/state-sign: a disabled button has the opacity 0.4, and a press does not scale it', async () => {
    const s = button('disabled')
    expect(await style(page, s, 'opacity')).toBe('0.4')
    const rest = await pressAt(page, s)
    expect((await box(page, s)).width).toBe(rest.width)
    await release(page)
  })

  it('avatar/motion: with reduced motion, the button does not scale at pointer down; the ring color still changes', async () => {
    const s = button('reduced')
    const rest = await pressAt(page, s)
    expect((await box(page, s)).width).toBe(rest.width)
    expect(await style(page, s, 'border-top-color')).toBe('rgb(72, 72, 72)')
    await release(page)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const p = button('sizes-pointer')
    const prest = await pressAt(page, p)
    expect((await box(page, p)).width).toBe(prest.width)
    expect(await style(page, p, 'transition-duration')).toBe('0.15s, 0.15s, 0.15s, 0.15s, 0.1s')
    await release(page)
    await page.emulateMedia({ reducedMotion: 'no-preference' })
  })
})
