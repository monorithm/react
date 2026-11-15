// The tests of the Bottom sheet. Each name starts with the id of a clause of ir/contracts/bottom-sheet.json. The math
// of the drag has its own tests (bottom-sheet.velocity.test.ts, bottom-sheet.snap.test.ts, bottom-sheet.spring.test.ts).
// The browser test (test/browser/bottom-sheet.browser.test.tsx) measures the clauses that jsdom cannot compute.
//
// The document gets the tokens and the geometry of the language (tokens.css, components.css), thus the sheet reads the
// slop, Half, Peek, and the top gap as in a browser. jsdom has no layout: the window is 768 px high, thus Full is
// 768 - 16 = 752 px and Half is 384 px. The close line is at 288 px.
import fs from 'node:fs'
import path from 'node:path'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { violations } from '@monorithm/react/test/axe'
import { contract as loadContract } from '@monorithm/react/test/contract'
import { MomentProvider } from '@monorithm/react/contexts/moment-context'
import { type MomentEvent } from '@monorithm/react/lib/moments'
import { Button } from '../button/button'
import { BottomSheet, type BottomSheetModalProps, type BottomSheetSnap } from './bottom-sheet'
import { contactTime } from './bottom-sheet.spring'

const contract = loadContract('bottom-sheet')
const clause = (id: string) => contract.clauses.find((c) => c.id === id) as (typeof contract.clauses)[number] & { classes?: string[] }

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..')
const FULL = 752
const HALF = 384

beforeAll(() => {
  const style = document.createElement('style')
  style.textContent = ['src/tokens/tokens.css', 'src/tokens/components.css'].map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n')
  document.head.append(style)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

/** The fake clock of the motion: performance.now() and the frames. */
const fakeClock = () => vi.useFakeTimers({ toFake: ['performance', 'requestAnimationFrame', 'cancelAnimationFrame'] })
const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms)
  })

/** A pointer event on the window: the sheet follows a gesture on the window after the pointer down. */
const send = (type: 'pointermove' | 'pointerup' | 'pointercancel', init: PointerEventInit) =>
  act(() => {
    window.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, isPrimary: true, pointerId: 1, pointerType: 'touch', ...init }))
  })
const down = (el: Element, y: number, x = 100) =>
  fireEvent.pointerDown(el, { pointerId: 1, clientX: x, clientY: y, isPrimary: true, button: 0, pointerType: 'touch' })

/** A gesture: the pointer down at y, a move to each value of ys (one each step ms), a pause, and the pointer up. */
function drag(el: Element, y: number, ys: number[], { step = 8, pause = 0, end = 'pointerup' as 'pointerup' | 'pointercancel', x = 100, xs = [] as number[] } = {}) {
  down(el, y, x)
  ys.forEach((yy, i) => {
    advance(step)
    send('pointermove', { clientX: xs[i] ?? x, clientY: yy })
  })
  if (pause) advance(pause)
  const last = ys.at(-1) ?? y
  send(end, { clientX: xs.at(-1) ?? x, clientY: last })
}

/** Moves of `n` steps from y by `dy` px each. */
const steps = (y: number, dy: number, n: number) => Array.from({ length: n }, (_, i) => y + dy * (i + 1))

const Comments = ({ onMoment, ...rest }: Partial<BottomSheetModalProps> & { onMoment?: (e: MomentEvent) => void }) => (
  <MomentProvider onMoment={onMoment ?? (() => {})}>
    <button type="button">Outside</button>
    <BottomSheet
      title="Comments"
      count={3}
      trigger={<button type="button">Show comments</button>}
      footer={<input aria-label="Add a comment" />}
      {...rest}
    >
      <ul>
        <li>The color is good.</li>
        <li>
          <button type="button">Reply</button>
        </li>
      </ul>
      <div data-testid="carousel" style={{ overflowX: 'auto' }}>
        <span>Photo 1</span>
      </div>
    </BottomSheet>
  </MomentProvider>
)

const dialog = () => screen.getByRole('dialog')
const part = (name: string, root: Element = dialog()) => root.querySelector(`[data-part="${name}"]`) as HTMLElement
/** The position that the engine writes during a drag or a spring, in px. NaN at rest. */
const pos = (el: HTMLElement = dialog()) => Number.parseFloat(el.style.getPropertyValue('--sheet-drag'))
const restOf = (el: HTMLElement = dialog()) => el.style.getPropertyValue('--sheet-rest')
/** The moments of the sheet. The close button is an icon button: it emits its own moment press. */
const moments = (fn: ReturnType<typeof vi.fn>) =>
  fn.mock.calls.map(([e]) => e as MomentEvent).filter((e) => e.source === 'bottom-sheet').map((e) => e.moment)

/** A scrollable content: the getters of the layout that jsdom does not compute. */
function scrollable(content: HTMLElement, height = 2000, client = 600) {
  let top = 0
  Object.defineProperty(content, 'scrollTop', { configurable: true, get: () => top, set: (v: number) => (top = Math.max(0, Math.min(height - client, v))) })
  Object.defineProperty(content, 'scrollHeight', { configurable: true, get: () => height })
  Object.defineProperty(content, 'clientHeight', { configurable: true, get: () => client })
  return { get top() { return top }, set top(v: number) { top = v } }
}

describe('BottomSheet', () => {
  it('the tests cover each clause of the contract', () => {
    const tested = new Set([
      'bottom-sheet/role', 'bottom-sheet/name', 'bottom-sheet/closed-hidden', 'bottom-sheet/trigger-state',
      'bottom-sheet/alternatives', 'bottom-sheet/handle-role', 'bottom-sheet/handle-keys', 'bottom-sheet/handle-actions',
      'bottom-sheet/keyboard', 'bottom-sheet/focus-trap', 'bottom-sheet/focus-open', 'bottom-sheet/persistent-focus',
      'bottom-sheet/focus', 'bottom-sheet/target', 'bottom-sheet/surface', 'bottom-sheet/handle', 'bottom-sheet/header',
      'bottom-sheet/drag-area', 'bottom-sheet/top-gap', 'bottom-sheet/snap-only', 'bottom-sheet/snap-values',
      'bottom-sheet/modal-snaps', 'bottom-sheet/persistent-snaps', 'bottom-sheet/short-content', 'bottom-sheet/use',
      'bottom-sheet/slop', 'bottom-sheet/axis-lock', 'bottom-sheet/tracking', 'bottom-sheet/catch', 'bottom-sheet/velocity',
      'bottom-sheet/projection', 'bottom-sheet/fling', 'bottom-sheet/close-line', 'bottom-sheet/gestures',
      'bottom-sheet/rubber-band', 'bottom-sheet/release', 'bottom-sheet/cancel', 'bottom-sheet/close-ways',
      'bottom-sheet/motion', 'bottom-sheet/scrim', 'bottom-sheet/handoff', 'bottom-sheet/scroll-at-full',
      'bottom-sheet/handoff-top', 'bottom-sheet/handoff-scrolled', 'bottom-sheet/content-fling', 'bottom-sheet/carousel',
      'bottom-sheet/wheel', 'bottom-sheet/input-focus', 'bottom-sheet/footer', 'bottom-sheet/keyboard-order',
      'bottom-sheet/width', 'bottom-sheet/density', 'bottom-sheet/direction', 'bottom-sheet/motion-reduced',
      'bottom-sheet/release-reduced', 'bottom-sheet/moment-drag-start', 'bottom-sheet/moment-snap',
      'bottom-sheet/moment-snap-other', 'bottom-sheet/moment-open-close', 'bottom-sheet/no-direct-feedback',
      'bottom-sheet/disabled', 'bottom-sheet/surfaces', 'bottom-sheet/phone', 'bottom-sheet/tablet', 'bottom-sheet/desktop',
      'bottom-sheet/desktop-dialog', 'bottom-sheet/side-sheet', 'bottom-sheet/side-sheet-motion', 'bottom-sheet/web',
      'bottom-sheet/web-back', 'bottom-sheet/web-height', 'bottom-sheet/tv', 'bottom-sheet/tv-close', 'bottom-sheet/car',
      'bottom-sheet/watch', 'bottom-sheet/xr', 'bottom-sheet/xr-close',
    ])
    expect(contract.clauses.map((c: { id: string }) => c.id).filter((id: string) => !tested.has(id))).toEqual([])
  })

  // ---------------------------------------------------------------- the accessibility tree and the focus

  it('bottom-sheet/role: a modal sheet is a modal dialog with the title as its name', () => {
    render(<Comments defaultOpen />)
    const sheet = screen.getByRole('dialog', { name: 'Comments' })
    expect(sheet.getAttribute('aria-modal')).toBe('true')
    expect(sheet.dataset.mono).toBe('bottom-sheet')
  })

  it('bottom-sheet/role: a persistent sheet is a region with a name', () => {
    render(
      <BottomSheet variant="persistent" title="Results" count={24}>
        <p>Shop 1</p>
      </BottomSheet>,
    )
    expect(screen.getByRole('region', { name: 'Results' }).tagName).toBe('SECTION')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('bottom-sheet/role: axe finds no violation in the modal sheet at Half and at Full, and in the persistent sheet', async () => {
    const view = render(<Comments defaultOpen />)
    expect(await violations(document.body)).toEqual([])
    fireEvent.click(screen.getByRole('button', { name: 'Resize the sheet' }))
    expect(dialog().dataset.snap).toBe('full')
    expect(await violations(document.body)).toEqual([])
    view.unmount()
    const { container } = render(
      <main>
        <BottomSheet variant="persistent" title="Results" count={24} footer={<Button variant="primary">Show the list</Button>}>
          <p>Shop 1</p>
        </BottomSheet>
      </main>,
    )
    expect(await violations(container)).toEqual([])
  })

  it('bottom-sheet/role: axe finds no violation in the side sheet', async () => {
    render(<Comments defaultOpen layout="side" />)
    expect(await violations(document.body)).toEqual([])
  })

  it('bottom-sheet/name: the header has the title; the title is the name, and the count is not in the name', () => {
    render(<Comments defaultOpen />)
    const title = part('title')
    expect(part('header').contains(title)).toBe(true)
    expect(title.textContent).toBe('Comments')
    expect(part('count').textContent).toBe('3')
    expect(dialog().getAttribute('aria-labelledby')).toBe(title.id)
  })

  it('bottom-sheet/closed-hidden: a closed sheet is not in the accessibility tree, and it gets no focus', async () => {
    render(<Comments />)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByText('The color is good.')).toBeNull()
    const user = userEvent.setup()
    await user.tab()
    await user.tab()
    await user.tab()
    expect(document.activeElement?.closest('[data-mono="bottom-sheet"]')).toBeNull()
  })

  it('bottom-sheet/trigger-state: the trigger tells assistive technology if the sheet is open', async () => {
    render(<Comments />)
    const trigger = screen.getByRole('button', { name: 'Show comments' })
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog')
    await userEvent.setup().click(trigger)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(clause('bottom-sheet/trigger-state').level).toBe('SHOULD')
  })

  it('bottom-sheet/focus-open: the focus goes to the title at the open, and back to the trigger at the close', async () => {
    render(<Comments />)
    const user = userEvent.setup()
    const trigger = screen.getByRole('button', { name: 'Show comments' })
    await user.click(trigger)
    await waitFor(() => expect(document.activeElement).toBe(part('title')))
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.activeElement).toBe(trigger)
  })

  it('bottom-sheet/handle-role: the handle is a button named "Resize the sheet" in the focus order of the sheet', async () => {
    render(<Comments defaultOpen />)
    const handle = screen.getByRole('button', { name: 'Resize the sheet' })
    expect(handle.tagName).toBe('BUTTON')
    expect(handle.getAttribute('type')).toBe('button')
    await waitFor(() => expect(document.activeElement).toBe(part('title')))
    // The handle is before the title in the sheet, thus Shift+Tab from the title goes to it.
    await userEvent.setup().tab({ shift: true })
    expect(document.activeElement).toBe(handle)
  })

  it('bottom-sheet/keyboard: Tab moves through the handle and the controls of the sheet; Escape closes it', async () => {
    const onOpenChange = vi.fn()
    render(<Comments defaultOpen onOpenChange={onOpenChange} />)
    await waitFor(() => expect(document.activeElement).toBe(part('title')))
    const user = userEvent.setup()
    const order: (string | null)[] = []
    for (let i = 0; i < 4; i++) {
      await user.tab()
      await waitFor(() => expect(dialog().contains(document.activeElement)).toBe(true))
      order.push(document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent ?? null)
    }
    // From the title: the close button, the controls, the footer, then the handle at the top of the sheet.
    expect(order).toEqual(['Close', 'Reply', 'Add a comment', 'Resize the sheet'])
    await user.keyboard('{Escape}')
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('bottom-sheet/focus-trap: a modal sheet keeps the focus inside it; the screen behind it gets no focus', async () => {
    render(<Comments defaultOpen />)
    await waitFor(() => expect(document.activeElement).toBe(part('title')))
    const user = userEvent.setup()
    // Base UI puts focus guards at the two ends of the sheet: a guard gives the focus back to the other end.
    for (let i = 0; i < 8; i++) {
      await user.tab()
      await waitFor(() => expect(dialog().contains(document.activeElement)).toBe(true))
    }
    for (let i = 0; i < 8; i++) {
      await user.tab({ shift: true })
      await waitFor(() => expect(dialog().contains(document.activeElement)).toBe(true))
    }
    expect(screen.getByRole('button', { name: 'Outside', hidden: true }).closest('[inert], [aria-hidden="true"]')).toBeTruthy()
  })

  it('bottom-sheet/persistent-focus: a persistent sheet has no scrim and does not keep the focus', async () => {
    render(
      <div>
        <button type="button">Map</button>
        <BottomSheet variant="persistent" title="Results">
          <button type="button">Shop 1</button>
        </BottomSheet>
        <button type="button">After</button>
      </div>,
    )
    expect(document.querySelector('[data-part="scrim"]')).toBeNull()
    const user = userEvent.setup()
    await user.tab()
    await user.tab()
    await user.tab()
    expect(document.activeElement?.textContent).toBe('Shop 1')
    await user.tab()
    expect(document.activeElement?.textContent).toBe('After')
  })

  it('bottom-sheet/focus: the handle shows the focus ring for keyboard focus only (measured in Chrome)', () => {
    render(<Comments defaultOpen />)
    expect(part('handle').className).toContain('focus-visible:outline-solid')
    expect(part('handle').className).toContain('focus-visible:outline-offset-(--mono-focus-ring-offset)')
  })

  it('bottom-sheet/target: the target of the handle extends past the bar; the close button is an icon button (measured in Chrome)', () => {
    render(<Comments defaultOpen />)
    expect(part('handle').className).toContain('after:h-(--mono-size-target-min)')
    expect(screen.getByRole('button', { name: 'Close' }).dataset.mono).toBe('icon-button')
  })

  // ---------------------------------------------------------------- the look

  it('bottom-sheet/surface: the raised fill, the overlay shadow, and the radius on the top corners (measured in Chrome)', () => {
    render(<Comments defaultOpen />)
    expect(dialog().className).toContain('bg-mono-raised')
    expect(dialog().className).toContain('shadow-mono-overlay')
    expect(dialog().className).toContain('rounded-t-mono-xl')
  })

  it('bottom-sheet/handle: a bar in line-strong with round ends, 8 px from the top edge (measured in Chrome)', () => {
    render(<Comments defaultOpen />)
    expect(part('handle').className).toContain('bg-mono-line-strong')
    expect(part('handle').className).toContain('rounded-mono-full')
    expect(part('handle-row').className).toContain('pt-(--mono-bottom-sheet-handle-top)')
  })

  it('bottom-sheet/header: the title and the count at the start side, the close button at the end side', () => {
    render(<Comments defaultOpen />)
    const header = part('header')
    const order = [...header.querySelectorAll(':scope > div > [data-part], :scope > button')].map((e) => e.getAttribute('data-part') ?? e.getAttribute('aria-label'))
    expect(order).toEqual(['title', 'count', 'Close'])
    expect(part('title').className).toContain('text-mono-title-3')
    expect(part('title').className).toContain('font-mono-strong')
    expect(part('title').className).toContain('text-mono-fg-strong')
    expect(part('count').className).toContain('text-mono-fg-muted')
  })

  it('bottom-sheet/width: 640 px or less at the center; a side sheet is 400 px (measured in Chrome)', () => {
    const view = render(<Comments defaultOpen />)
    expect(dialog().className).toContain('max-w-(--mono-size-sheet-max-width)')
    expect(dialog().className).toContain('mx-auto')
    view.unmount()
    render(<Comments defaultOpen layout="side" />)
    expect(dialog().className).toContain('w-(--mono-size-sheet-side-width)')
  })

  it('bottom-sheet/density: the axes of the place go to the portal; the header follows the density (measured in Chrome)', () => {
    render(
      <div data-density="touch" data-theme="light" dir="rtl" data-motion="reduced">
        <Comments defaultOpen />
      </div>,
    )
    const portal = dialog().parentElement as HTMLElement
    expect([portal.dataset.density, portal.dataset.theme, portal.getAttribute('dir'), portal.dataset.motion]).toEqual(['touch', 'light', 'rtl', 'reduced'])
  })

  it('bottom-sheet/direction: the title comes first in the DOM, thus at the start side; the drag does not mirror', () => {
    fakeClock()
    render(
      <div dir="rtl">
        <Comments defaultOpen />
      </div>,
    )
    expect(part('header').firstElementChild?.contains(part('title'))).toBe(true)
    // The drag is vertical in each reading direction.
    down(part('header'), 500)
    send('pointermove', { clientX: 100, clientY: 470 })
    expect(pos()).toBe(HALF + 22)
    send('pointerup', { clientX: 100, clientY: 470 })
  })

  // ---------------------------------------------------------------- the snap points

  it('bottom-sheet/snap-only: the sheet opens at Half and stops only at its snap points', () => {
    fakeClock()
    render(<Comments defaultOpen />)
    expect(dialog().dataset.snap).toBe('half')
    expect(restOf()).toBe(`${HALF}px`)
    drag(part('header'), 500, steps(500, -15, 6), { pause: 50 })
    // A release with no velocity, 82 px above Half: Half is nearer than Full.
    advance(500)
    expect(dialog().dataset.snap).toBe('half')
    expect(Number.isNaN(pos())).toBe(true)
  })

  it('bottom-sheet/snap-values: Half is 50 % of the screen; Full is the screen less the top gap', async () => {
    render(<Comments defaultOpen />)
    expect(restOf()).toBe('384px')
    fireEvent.click(part('handle'))
    await waitFor(() => expect(restOf()).toBe(`${768 - 16}px`))
  })

  it('bottom-sheet/top-gap: at Full, 16 px of the screen (the gap token) stay above the sheet (measured in Chrome)', async () => {
    render(<Comments defaultOpen />)
    fireEvent.click(part('handle'))
    await waitFor(() => expect(Number.parseFloat(restOf())).toBe(window.innerHeight - 16))
    expect(dialog().className).toContain('var(--mono-size-sheet-gap)')
  })

  it('bottom-sheet/modal-snaps: a modal sheet has Half and Full; a drag down from Half closes it', () => {
    fakeClock()
    const onOpenChange = vi.fn()
    render(<Comments defaultOpen onOpenChange={onOpenChange} />)
    const handle = part('handle')
    fireEvent.keyDown(handle, { key: 'ArrowUp' })
    expect(dialog().dataset.snap).toBe('full')
    fireEvent.keyDown(handle, { key: 'ArrowUp' })
    expect(dialog().dataset.snap).toBe('full')
    advance(500)
    fireEvent.keyDown(handle, { key: 'ArrowDown' })
    expect(dialog().dataset.snap).toBe('half')
    advance(500)
    drag(part('header'), 300, steps(300, 20, 8))
    advance(500)
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
  })

  it('bottom-sheet/persistent-snaps: a persistent sheet has Peek, Half, and Full, and it never closes', () => {
    fakeClock()
    render(
      <BottomSheet variant="persistent" title="Results">
        <p>Shop 1</p>
      </BottomSheet>,
    )
    const region = screen.getByRole('region')
    const handle = part('handle', region)
    fireEvent.keyDown(handle, { key: 'ArrowDown' })
    expect(region.dataset.snap).toBe('peek')
    expect(restOf(region)).toBe('140px')
    advance(500)
    fireEvent.keyDown(handle, { key: 'ArrowDown' })
    expect(region.dataset.snap).toBe('peek')
    // A fling down from Peek stays at Peek: the sheet never closes.
    drag(part('header', region), 300, steps(300, 30, 6))
    advance(600)
    expect(screen.getByRole('region').dataset.snap).toBe('peek')
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()
  })

  it('bottom-sheet/short-content: content shorter than Half gives one snap point at the height of the content', () => {
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
      return this.dataset.mono === 'bottom-sheet' ? FULL : 0
    })
    vi.spyOn(Element.prototype, 'clientHeight', 'get').mockImplementation(function (this: Element) {
      return this.getAttribute('data-part') === 'content' ? 650 : 0
    })
    vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockImplementation(function (this: Element) {
      return this.getAttribute('data-part') === 'content' ? 100 : 0
    })
    render(<Comments defaultOpen />)
    // The natural height: 752 - 650 + 100 = 202 px, less than Half.
    expect(restOf()).toBe('202px')
    fireEvent.click(part('handle'))
    expect(dialog().dataset.snap).toBe('half')
  })

  it('bottom-sheet/use: the choice of the variant is a rule for the screen (review)', () => {
    expect(clause('bottom-sheet/use').level).toBe('SHOULD')
  })

  // ---------------------------------------------------------------- the drag

  it('bottom-sheet/drag-area: a drag on the handle or on the header moves the sheet', () => {
    fakeClock()
    render(<Comments defaultOpen />)
    down(part('handle'), 500)
    send('pointermove', { clientX: 100, clientY: 460 })
    expect(pos()).toBe(HALF + 32)
    send('pointercancel', { clientX: 100, clientY: 460 })
    advance(500)
    down(part('title'), 500)
    send('pointermove', { clientX: 100, clientY: 460 })
    expect(pos()).toBe(HALF + 32)
    send('pointerup', { clientX: 100, clientY: 460 })
  })

  it('bottom-sheet/slop: a move shorter than 8 px is a tap, and the buttons in the sheet operate', () => {
    fakeClock()
    const onMoment = vi.fn()
    const onClick = vi.fn()
    render(
      <MomentProvider onMoment={onMoment}>
        <BottomSheet title="Comments" defaultOpen>
          <button type="button" onClick={onClick}>
            Reply
          </button>
        </BottomSheet>
      </MomentProvider>,
    )
    const reply = screen.getByRole('button', { name: 'Reply' })
    down(reply, 500)
    send('pointermove', { clientX: 100, clientY: 493 })
    expect(Number.isNaN(pos())).toBe(true)
    send('pointerup', { clientX: 100, clientY: 493 })
    fireEvent.click(reply)
    expect(onClick).toHaveBeenCalledTimes(1)
    // A move of 8 px starts the drag.
    down(part('header'), 500)
    send('pointermove', { clientX: 100, clientY: 492 })
    expect(pos()).toBe(HALF)
    expect(moments(onMoment)).toContain('drag-start')
    send('pointerup', { clientX: 100, clientY: 492 })
  })

  it('bottom-sheet/axis-lock: a move that is more horizontal than vertical does not move the sheet', () => {
    fakeClock()
    render(<Comments defaultOpen />)
    down(part('header'), 500, 100)
    send('pointermove', { clientX: 130, clientY: 480 })
    send('pointermove', { clientX: 140, clientY: 400 })
    expect(Number.isNaN(pos())).toBe(true)
    send('pointerup', { clientX: 140, clientY: 400 })
    expect(dialog().dataset.snap).toBe('half')
  })

  it('bottom-sheet/tracking: the sheet moves 1 : 1 with the finger, from the slop, with no transition', () => {
    fakeClock()
    render(<Comments defaultOpen />)
    down(part('header'), 500)
    send('pointermove', { clientX: 100, clientY: 450 })
    // 50 px less the slop of 8 px.
    expect(pos()).toBe(HALF + 42)
    expect(dialog().hasAttribute('data-moving')).toBe(true)
    expect(dialog().className).toContain('data-[moving]:transition-none')
    for (const y of [440, 400, 420, 300]) {
      send('pointermove', { clientX: 100, clientY: y })
      expect(pos()).toBe(HALF + 500 - y - 8)
    }
    send('pointerup', { clientX: 100, clientY: 300 })
  })

  it('bottom-sheet/catch: a touch during a motion stops the sheet where it is; the user can drag it again', () => {
    fakeClock()
    render(<Comments defaultOpen />)
    fireEvent.click(part('handle'))
    advance(96)
    const mid = pos()
    expect(mid).toBeGreaterThan(HALF)
    expect(mid).toBeLessThan(FULL)
    down(part('header'), 500)
    advance(200)
    expect(pos()).toBe(mid)
    send('pointermove', { clientX: 100, clientY: 470 })
    expect(pos()).toBeCloseTo(mid + 22, 6)
    send('pointerup', { clientX: 100, clientY: 470 })
  })

  it('bottom-sheet/velocity: the release uses the velocity of the tracker (40 ms, 4 samples, 8 px/ms)', () => {
    fakeClock()
    render(<Comments defaultOpen />)
    // A fast fling up of 2.5 px/ms: the tracker sees the last 40 ms of the motion.
    drag(part('header'), 600, steps(600, -20, 8), { step: 8 })
    expect(dialog().dataset.snap).toBe('full')
  })

  it('bottom-sheet/velocity: a pause of 40 ms before the release gives a velocity of 0', () => {
    fakeClock()
    render(<Comments defaultOpen />)
    // The same fling, then a pause of 40 ms: P is the position, 152 px above Half, thus Half is nearer.
    drag(part('header'), 600, steps(600, -20, 8), { step: 8, pause: 40 })
    expect(dialog().dataset.snap).toBe('half')
  })

  it('bottom-sheet/projection: a slow drag goes to the snap point nearest to P', () => {
    fakeClock()
    render(<Comments defaultOpen />)
    // 0.375 px/ms for 192 ms up, from Half: x = 448, P = 448 + 187 = 635, thus Full.
    drag(part('header'), 600, steps(600, -3, 24), { step: 8 })
    expect(dialog().dataset.snap).toBe('full')
  })

  it('bottom-sheet/fling: a release faster than 0.5 px/ms goes to the next snap point in its direction', () => {
    fakeClock()
    render(<Comments defaultOpen />)
    // A short fling up: 24 px at 1 px/ms. x = 400, P = 900: Full.
    drag(part('header'), 600, steps(600, -8, 4), { step: 8 })
    expect(dialog().dataset.snap).toBe('full')
  })

  it('bottom-sheet/close-line: a release below the close line (288 px) closes the sheet; above it, Half', () => {
    fakeClock()
    const onOpenChange = vi.fn()
    render(<Comments defaultOpen onOpenChange={onOpenChange} />)
    // Down 98 px less the slop: x = 294, then a pause. P = 294 is above the close line.
    drag(part('header'), 300, steps(300, 14, 7), { pause: 50 })
    advance(500)
    expect(dialog().dataset.snap).toBe('half')
    expect(onOpenChange).not.toHaveBeenCalled()
    // Down 112 px less the slop: x = 280, below the close line.
    drag(part('header'), 300, steps(300, 14, 8), { pause: 50 })
    advance(500)
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
  })

  it('bottom-sheet/gestures: a drag up from Half goes to Full; a drag down from Full goes to Half', () => {
    fakeClock()
    render(<Comments defaultOpen />)
    drag(part('header'), 600, steps(600, -5, 20))
    expect(dialog().dataset.snap).toBe('full')
    advance(500)
    drag(part('header'), 100, steps(100, 5, 20))
    expect(dialog().dataset.snap).toBe('half')
  })

  it('bottom-sheet/rubber-band: past Full, a drag up on the header moves the sheet one third of the finger distance', () => {
    fakeClock()
    render(<Comments defaultOpen />)
    fireEvent.click(part('handle'))
    advance(500)
    down(part('header'), 500)
    send('pointermove', { clientX: 100, clientY: 410 })
    // 90 px less the slop: 82 px, thus the sheet moves 82 / 3 px.
    expect(pos()).toBeCloseTo(FULL + 82 / 3, 6)
    advance(50)
    send('pointerup', { clientX: 100, clientY: 410 })
    advance(500)
    expect(dialog().dataset.snap).toBe('full')
    expect(Number.isNaN(pos())).toBe(true)
  })

  it('bottom-sheet/release: after the release, the sheet goes to the snap point with spring-sheet and the finger velocity', () => {
    fakeClock()
    render(<Comments defaultOpen />)
    drag(part('header'), 600, steps(600, -10, 6))
    const start = pos()
    advance(16)
    const next = pos()
    // The spring starts with the velocity of the finger (1.25 px/ms): the first frame moves about 20 px up.
    expect(next - start).toBeGreaterThan(12)
    advance(100)
    expect(pos()).toBeGreaterThan(next)
    advance(400)
    expect(Number.isNaN(pos())).toBe(true)
    expect(restOf()).toBe(`${FULL}px`)
  })

  it('bottom-sheet/cancel: a cancel during a drag takes the sheet back to its snap point, with no moment snap', () => {
    fakeClock()
    const onMoment = vi.fn()
    render(<Comments defaultOpen onMoment={onMoment} />)
    drag(part('header'), 600, steps(600, -30, 8), { end: 'pointercancel' })
    expect(dialog().dataset.snap).toBe('half')
    advance(600)
    expect(Number.isNaN(pos())).toBe(true)
    expect(moments(onMoment)).toEqual(['open', 'drag-start'])
  })

  // ---------------------------------------------------------------- the close and the motion

  it('bottom-sheet/close-ways: the close button, the scrim, Escape, and a drag down from Half close a modal sheet', async () => {
    const ways: Record<string, () => Promise<void> | void> = {
      close: async () => userEvent.setup().click(screen.getByRole('button', { name: 'Close' })),
      scrim: async () => userEvent.setup().click(document.querySelector('[data-part="scrim"]') as HTMLElement),
      escape: async () => userEvent.setup().keyboard('{Escape}'),
    }
    for (const [name, act] of Object.entries(ways)) {
      const onOpenChange = vi.fn()
      const view = render(<Comments defaultOpen onOpenChange={onOpenChange} />)
      await waitFor(() => expect(document.activeElement).toBe(part('title')))
      await act()
      expect([name, onOpenChange.mock.calls.at(-1)]).toEqual([name, [false]])
      view.unmount()
    }
  })

  it('bottom-sheet/alternatives: each gesture has an alternative with no drag: the handle, the close button, Escape, Back', async () => {
    render(<Comments defaultOpen history />)
    const handle = screen.getByRole('button', { name: 'Resize the sheet' })
    fireEvent.click(handle)
    expect(dialog().dataset.snap).toBe('full')
    fireEvent.keyDown(handle, { key: 'ArrowDown' })
    expect(dialog().dataset.snap).toBe('half')
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy()
    act(() => window.history.back())
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('bottom-sheet/motion: the entrance is dur-sheet with ease-out, the exit dur-base with ease-in (measured in Chrome)', () => {
    render(<Comments defaultOpen />)
    const c = dialog().className
    expect(c).toContain('[--sheet-in:var(--mono-duration-sheet)]')
    expect(c).toContain('[--sheet-out:var(--mono-duration-base)]')
    expect(c).toContain('ease-(--mono-easing-out)')
    expect(c).toContain('data-[ending-style]:ease-(--mono-easing-in)')
    expect(c).toContain('data-[starting-style]:[--sheet-x:var(--sheet-from)]')
  })

  it('bottom-sheet/motion: after a drag, the sheet closes with spring-sheet, then it closes', () => {
    fakeClock()
    const onOpenChange = vi.fn()
    render(<Comments defaultOpen onOpenChange={onOpenChange} />)
    drag(part('header'), 300, steps(300, 15, 10))
    expect(dialog().hasAttribute('data-moving')).toBe(true)
    const a = pos()
    advance(48)
    expect(pos()).toBeLessThan(a)
    expect(onOpenChange).not.toHaveBeenCalled()
    advance(600)
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
  })

  it('bottom-sheet/scrim: only a modal sheet has a scrim; its opacity follows the position (colors measured in Chrome)', () => {
    fakeClock()
    render(<Comments defaultOpen />)
    const scrim = document.querySelector('[data-part="scrim"]') as HTMLElement
    expect(scrim.className).toContain('bg-mono-scrim')
    down(part('header'), 300)
    send('pointermove', { clientX: 100, clientY: 300 + 8 + HALF / 2 })
    expect(pos()).toBe(HALF / 2)
    expect(scrim.style.opacity).toBe('0.5')
    send('pointermove', { clientX: 100, clientY: 300 + 8 - 100 })
    expect(scrim.style.opacity).toBe('1')
    send('pointercancel', {})
  })

  it('bottom-sheet/motion-reduced: with reduced motion, the drag still follows the finger 1 : 1', () => {
    fakeClock()
    render(
      <div data-motion="reduced">
        <Comments defaultOpen />
      </div>,
    )
    down(part('header'), 500)
    send('pointermove', { clientX: 100, clientY: 440 })
    expect(pos()).toBe(HALF + 52)
    send('pointercancel', {})
    expect(dialog().className).toContain('[[data-motion=reduced]_&]:[--sheet-in:var(--mono-duration-fast)]')
    expect(dialog().className).toContain('[[data-motion=reduced]_&]:[--sheet-out:var(--mono-duration-press)]')
  })

  it('bottom-sheet/release-reduced: with reduced motion, the sheet goes to its snap point immediately', () => {
    fakeClock()
    render(
      <div data-motion="reduced">
        <Comments defaultOpen />
      </div>,
    )
    drag(part('header'), 600, steps(600, -20, 8))
    // At the release, the sheet is at Full with no spring. One frame later, the CSS holds the rest position.
    expect(dialog().dataset.snap).toBe('full')
    expect(pos()).toBe(FULL)
    advance(16)
    expect(Number.isNaN(pos())).toBe(true)
    expect(dialog().hasAttribute('data-moving')).toBe(false)
  })

  // ---------------------------------------------------------------- the content

  it('bottom-sheet/handoff: one vertical gesture moves the sheet or scrolls the content, not the two at one time', () => {
    fakeClock()
    render(<Comments defaultOpen />)
    const content = part('content')
    const scroll = scrollable(content)
    down(content, 600)
    // Up from Half: first the sheet goes to Full, then the content scrolls. The content does not scroll before the sheet
    // is at Full, and the sheet does not move after the content scrolls.
    for (const y of steps(600, -40, 14)) {
      const scrolledBefore = scroll.top > 0
      const before = pos()
      send('pointermove', { clientX: 100, clientY: y })
      if (scroll.top > 0) expect(pos()).toBe(FULL)
      if (scrolledBefore) expect(pos()).toBe(before)
    }
    // 560 px less the slop: 368 px move the sheet from Half to Full, and the rest (184 px) scrolls the content.
    expect([pos(), scroll.top]).toEqual([FULL, 14 * 40 - 8 - (FULL - HALF)])
    send('pointercancel', {})
  })

  it('bottom-sheet/scroll-at-full: below Full, a drag on the content moves the sheet, and the content does not scroll', () => {
    fakeClock()
    render(<Comments defaultOpen />)
    const content = part('content')
    const scroll = scrollable(content)
    expect(content.className).toContain('overflow-y-hidden')
    expect(content.className).toContain('[[data-snap=full]_&]:overflow-y-auto')
    down(content, 600)
    send('pointermove', { clientX: 100, clientY: 650 })
    expect(pos()).toBe(HALF - 42)
    expect(scroll.top).toBe(0)
    send('pointercancel', {})
  })

  it('bottom-sheet/handoff-top: at Full, a drag up scrolls the content; at its top, a drag down moves the sheet', () => {
    fakeClock()
    const onOpenChange = vi.fn()
    render(<Comments defaultOpen onOpenChange={onOpenChange} />)
    fireEvent.click(part('handle'))
    advance(500)
    const content = part('content')
    const scroll = scrollable(content)
    down(content, 400)
    send('pointermove', { clientX: 100, clientY: 300 })
    expect(scroll.top).toBe(92)
    expect(Number.isNaN(pos())).toBe(true)
    send('pointerup', { clientX: 100, clientY: 300 })
    advance(3000)
    scroll.top = 0
    // At the top: a drag down moves the sheet, and a long drag closes it.
    drag(content, 100, steps(100, 40, 14))
    advance(800)
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
  })

  it('bottom-sheet/handoff-scrolled: a drag down first scrolls the content to its top, then the sheet moves', () => {
    fakeClock()
    const onMoment = vi.fn()
    render(<Comments defaultOpen onMoment={onMoment} />)
    fireEvent.click(part('handle'))
    advance(500)
    const content = part('content')
    const scroll = scrollable(content)
    scroll.top = 50
    down(content, 100)
    send('pointermove', { clientX: 100, clientY: 140 })
    // 40 px less the slop: the content scrolls 32 px, and the sheet stays.
    expect(scroll.top).toBe(18)
    expect(Number.isNaN(pos())).toBe(true)
    expect(moments(onMoment)).not.toContain('drag-start')
    send('pointermove', { clientX: 100, clientY: 200 })
    // 60 px more: 18 px to the top of the content, then the sheet moves 42 px down.
    expect(scroll.top).toBe(0)
    expect(pos()).toBe(FULL - 42)
    expect(moments(onMoment).filter((m) => m === 'drag-start')).toHaveLength(1)
    send('pointercancel', {})
  })

  it('bottom-sheet/content-fling: a fling of the content stops at the top of the content and does not move the sheet', () => {
    fakeClock()
    render(<Comments defaultOpen />)
    fireEvent.click(part('handle'))
    advance(500)
    const content = part('content')
    const scroll = scrollable(content)
    scroll.top = 300
    // A fling down of 2 px/ms on the content: the content scrolls toward its top.
    drag(content, 100, steps(100, 16, 6), { step: 8 })
    const after = scroll.top
    expect(after).toBeLessThan(300)
    advance(100)
    expect(scroll.top).toBeLessThan(after)
    advance(3000)
    expect(scroll.top).toBe(0)
    expect(dialog().dataset.snap).toBe('full')
    expect(Number.isNaN(pos())).toBe(true)
  })

  it('bottom-sheet/carousel: a horizontal drag on a carousel in the content does not move the sheet', () => {
    fakeClock()
    render(<Comments defaultOpen />)
    drag(screen.getByTestId('carousel'), 600, [598, 596, 594], { xs: [80, 60, 40] })
    expect(Number.isNaN(pos())).toBe(true)
    expect(dialog().dataset.snap).toBe('half')
    expect(part('content').className).toContain('touch-pan-x')
  })

  it('bottom-sheet/wheel: at Half, a scroll with a mouse wheel or a trackpad moves the sheet to Full', () => {
    fakeClock()
    render(<Comments defaultOpen />)
    fireEvent.wheel(part('content'), { deltaY: 30 })
    expect(dialog().dataset.snap).toBe('full')
  })

  it('bottom-sheet/input-focus: an input that gets the focus moves the sheet to Full; it stays at Full after the blur', () => {
    render(<Comments defaultOpen />)
    const input = screen.getByRole('textbox', { name: 'Add a comment' })
    act(() => input.focus())
    expect(dialog().dataset.snap).toBe('full')
    act(() => input.blur())
    expect(dialog().dataset.snap).toBe('full')
  })

  it('bottom-sheet/footer: the footer stays at the bottom edge at each snap point, above the safe area (measured in Chrome)', () => {
    render(<Comments defaultOpen />)
    const footer = part('footer')
    expect(footer.className).toContain('translate-y-[calc(max(var(--sheet-x),var(--sheet-low))_-_var(--sheet-full))]')
    expect(footer.className).toContain('env(safe-area-inset-bottom,0px)')
    expect(dialog().style.getPropertyValue('--sheet-low')).toBe(`${HALF}px`)
  })

  it('bottom-sheet/keyboard-order: the keyboard pushes the sheet up; the content becomes shorter and keeps the latest item', () => {
    const listeners = new Set<() => void>()
    const viewport = { height: 768, offsetTop: 0, addEventListener: (_: string, f: () => void) => listeners.add(f), removeEventListener: (_: string, f: () => void) => listeners.delete(f) }
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport })
    try {
      render(<Comments defaultOpen />)
      const content = part('content')
      const scroll = scrollable(content)
      scroll.top = 1400
      act(() => screen.getByRole('textbox', { name: 'Add a comment' }).focus())
      viewport.height = 768 - 300
      act(() => listeners.forEach((f) => f()))
      expect(dialog().style.getPropertyValue('--sheet-kb')).toBe('300px')
      expect(dialog().hasAttribute('data-keyboard')).toBe(true)
      expect(dialog().className).toContain('bottom-(--sheet-kb,0px)')
      expect(part('footer').className).toContain('[[data-keyboard]_&]:pb-2')
      // The content was at its bottom: it stays at its bottom, thus the latest item stays in view.
      expect(scroll.top).toBe(1400)
      // bottom-sheet/input-focus: the keyboard closes and the sheet stays at Full.
      viewport.height = 768
      act(() => listeners.forEach((f) => f()))
      expect(dialog().hasAttribute('data-keyboard')).toBe(false)
      expect(dialog().dataset.snap).toBe('full')
    } finally {
      Object.defineProperty(window, 'visualViewport', { configurable: true, value: undefined })
    }
  })

  // ---------------------------------------------------------------- the moments

  it('bottom-sheet/moment-drag-start: drag-start comes at the first move past the slop; a tap emits none', () => {
    fakeClock()
    const onMoment = vi.fn()
    render(<Comments defaultOpen onMoment={onMoment} />)
    down(part('header'), 500)
    send('pointermove', { clientX: 100, clientY: 495 })
    send('pointerup', { clientX: 100, clientY: 495 })
    expect(moments(onMoment)).toEqual(['open'])
    down(part('header'), 500)
    send('pointermove', { clientX: 100, clientY: 495 })
    expect(moments(onMoment)).toEqual(['open'])
    send('pointermove', { clientX: 100, clientY: 490 })
    expect(moments(onMoment)).toEqual(['open', 'drag-start'])
    send('pointermove', { clientX: 100, clientY: 400 })
    expect(moments(onMoment)).toEqual(['open', 'drag-start'])
    send('pointercancel', {})
  })

  it('bottom-sheet/moment-snap: snap comes at the contact (near 333 ms for a move of 100 px), not at the settle time (372 ms)', () => {
    fakeClock()
    const times: [string, number][] = []
    render(<Comments defaultOpen onMoment={(e) => e.source === 'bottom-sheet' && times.push([e.moment, performance.now()])} />)
    // Up to 100 px below Full, a pause, and the release: the spring moves 100 px with no start velocity.
    drag(part('header'), 700, [700 - 8 - (FULL - 100 - HALF)], { pause: 50 })
    const release = performance.now()
    expect(dialog().dataset.snap).toBe('full')
    expect(pos()).toBe(FULL - 100)
    let settled = -1
    for (let t = 0; t <= 480 && settled < 0; t += 16) {
      advance(16)
      if (Number.isNaN(pos())) settled = performance.now() - release
    }
    const snaps = times.filter(([m]) => m === 'snap')
    expect(snaps).toHaveLength(1)
    const snapAt = (snaps[0]?.[1] ?? 0) - release
    // The first frame at or after the contact (332 ms). At 60 Hz, that frame is at 333 ms.
    expect(snapAt).toBeGreaterThanOrEqual(contactTime(100, 0))
    expect(snapAt).toBeLessThan(contactTime(100, 0) + 16)
    // The spring stops later: at the first frame after the settle time of 372 ms.
    expect(snapAt).toBeLessThan(372)
    expect(settled).toBeGreaterThanOrEqual(372)
  })

  it('bottom-sheet/moment-snap-other: a key emits snap at the contact; with reduced motion, snap comes at the release', () => {
    fakeClock()
    const onMoment = vi.fn()
    const view = render(<Comments defaultOpen onMoment={onMoment} />)
    fireEvent.keyDown(part('handle'), { key: 'ArrowUp' })
    // A move of 368 px from Half to Full with a velocity of 0: the contact is near 408 ms.
    const contact = contactTime(FULL - HALF, 0)
    expect(moments(onMoment)).toEqual(['open'])
    advance(contact - 20)
    expect(moments(onMoment)).toEqual(['open'])
    advance(40)
    expect(moments(onMoment)).toEqual(['open', 'snap'])
    view.unmount()
    onMoment.mockClear()
    render(
      <div data-motion="reduced">
        <Comments defaultOpen onMoment={onMoment} />
      </div>,
    )
    drag(part('header'), 600, steps(600, -20, 8))
    expect(moments(onMoment)).toEqual(['open', 'drag-start', 'snap'])
  })

  it('bottom-sheet/moment-open-close: open at the entrance, close at the exit; a release that closes emits close, not snap', async () => {
    const onMoment = vi.fn()
    const view = render(<Comments onMoment={onMoment} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Show comments' }))
    expect(moments(onMoment)).toEqual(['open'])
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(moments(onMoment)).toEqual(['open', 'close'])
    view.unmount()
    onMoment.mockClear()
    fakeClock()
    render(<Comments defaultOpen onMoment={onMoment} />)
    drag(part('header'), 300, steps(300, 15, 10))
    // close comes at the release, at the first frame of the exit.
    expect(moments(onMoment)).toEqual(['open', 'drag-start', 'close'])
    advance(800)
    expect(moments(onMoment)).toEqual(['open', 'drag-start', 'close'])
  })

  it('bottom-sheet/no-direct-feedback: a drag, a snap, and a close call no vibration API', () => {
    fakeClock()
    const vibrate = vi.fn()
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true })
    render(<Comments defaultOpen />)
    drag(part('header'), 600, steps(600, -20, 8))
    advance(500)
    drag(part('header'), 100, steps(100, 40, 14))
    advance(800)
    expect(vibrate).not.toHaveBeenCalled()
    expect(clause('bottom-sheet/no-direct-feedback').level).toBe('NEVER')
  })

  it('bottom-sheet/disabled: the sheet has no disabled state; a disabled control has the opacity and emits no moment', async () => {
    // @ts-expect-error bottom-sheet/disabled: a sheet has no disabled state.
    const sheet = <BottomSheet title="Filters" disabled />
    expect(sheet).toBeTruthy()
    const onMoment = vi.fn()
    render(
      <MomentProvider onMoment={onMoment}>
        <BottomSheet title="Filters" defaultOpen footer={<Button variant="primary" disabled disabledReason="Select a filter first">Apply</Button>}>
          <p>Select a filter first</p>
        </BottomSheet>
      </MomentProvider>,
    )
    const apply = screen.getByRole('button', { name: 'Apply', description: 'Select a filter first' })
    expect(apply.className).toContain('data-[disabled]:opacity-(--mono-opacity-disabled)')
    await userEvent.setup().click(apply)
    expect(moments(onMoment)).toEqual(['open'])
  })

  // ---------------------------------------------------------------- the device classes and the web

  it('bottom-sheet/web: a window less than 768 px wide shows a bottom sheet; from 768 px, a side sheet', () => {
    const queries: string[] = []
    const media = (wide: boolean) =>
      vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => {
        queries.push(query)
        return { matches: query.includes('min-width') ? wide : false, media: query, addEventListener: () => {}, removeEventListener: () => {} } as unknown as MediaQueryList
      })
    Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: () => ({}) })
    media(false)
    const view = render(<Comments defaultOpen />)
    expect(dialog().dataset.layout).toBe('bottom')
    expect(queries).toContain('(min-width: 768px)')
    view.unmount()
    media(true)
    render(<Comments defaultOpen />)
    expect(dialog().dataset.layout).toBe('side')
  })

  it('bottom-sheet/web-back: the sheet adds a history entry; Back closes it; a different close removes the entry', async () => {
    const entry = () => JSON.stringify(window.history.state ?? {}).includes('monoBottomSheet')
    // The entries of the earlier tests are gone.
    await waitFor(() => expect(entry()).toBe(false))
    const view = render(<Comments defaultOpen />)
    await waitFor(() => expect(entry()).toBe(true))
    expect(window.history.length).toBeGreaterThan(1)
    act(() => window.history.back())
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    view.unmount()
    render(<Comments defaultOpen />)
    await waitFor(() => expect(entry()).toBe(true))
    await userEvent.setup().click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(entry()).toBe(false))
  })

  it('bottom-sheet/web-height: Full uses the height of the screen area in view (dvh); the page behind does not scroll', async () => {
    render(<Comments defaultOpen />)
    expect(dialog().className).toContain('100dvh')
    await waitFor(() => expect(getComputedStyle(document.documentElement).overflow + getComputedStyle(document.body).overflow).toContain('hidden'))
  })

  it('bottom-sheet/surfaces: the content and the actions are the same in the bottom sheet and in the side sheet', () => {
    const read = () => ({
      title: part('title').textContent,
      count: part('count').textContent,
      content: part('content').textContent,
      buttons: within(dialog()).getAllByRole('button').map((b) => b.getAttribute('aria-label') ?? b.textContent).filter((n) => n !== 'Resize the sheet'),
      footer: !!part('footer').querySelector('input'),
    })
    const view = render(<Comments defaultOpen layout="bottom" />)
    const bottom = read()
    view.unmount()
    render(<Comments defaultOpen layout="side" />)
    expect(read()).toEqual(bottom)
  })

  it('bottom-sheet/phone: on a phone, the bottom sheet has the full width, the drag, and the snap points', () => {
    fakeClock()
    render(<Comments defaultOpen layout="bottom" />)
    expect(dialog().className).toContain('w-full')
    down(part('header'), 500)
    send('pointermove', { clientX: 100, clientY: 450 })
    expect(pos()).toBe(HALF + 42)
    send('pointercancel', {})
  })

  it('bottom-sheet/tablet: the side sheet of a tablet in landscape has no drag; with a keyboard, Escape closes it', async () => {
    const onOpenChange = vi.fn()
    render(<Comments defaultOpen layout="side" onOpenChange={onOpenChange} />)
    expect(part('handle')).toBeNull()
    await userEvent.setup().keyboard('{Escape}')
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
  })

  it('bottom-sheet/desktop: a side sheet of 400 px with no drag; the close button and Escape close it; it scrolls by itself', async () => {
    fakeClock()
    render(<Comments defaultOpen layout="side" />)
    down(part('header'), 500)
    send('pointermove', { clientX: 100, clientY: 400 })
    expect(Number.isNaN(pos())).toBe(true)
    send('pointerup', { clientX: 100, clientY: 400 })
    expect(part('content').className).toContain('overflow-y-auto')
    expect(dialog().className).toContain('inset-y-0')
    vi.useRealTimers()
    const onOpenChange = vi.fn()
    const other = render(<Comments defaultOpen layout="side" onOpenChange={onOpenChange} />)
    await userEvent.setup().click(other.getAllByRole('button', { name: 'Close' }).at(-1) as HTMLElement)
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
  })

  it('bottom-sheet/desktop-dialog: the choice of a dialog for a short task is a rule for the screen (review)', () => {
    expect(clause('bottom-sheet/desktop-dialog')).toMatchObject({ level: 'SHOULD', classes: ['laptop', 'desktop'] })
  })

  it('bottom-sheet/side-sheet: a side sheet has no scrim and no handle, and the page behind it operates', async () => {
    const onClick = vi.fn()
    render(
      <div>
        <button type="button" onClick={onClick}>
          Page action
        </button>
        <Comments defaultOpen layout="side" />
      </div>,
    )
    expect(document.querySelector('[data-part="scrim"]')).toBeNull()
    expect(part('handle')).toBeNull()
    expect(dialog().hasAttribute('aria-modal')).toBe(false)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Page action' }))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('bottom-sheet/side-sheet-motion: it comes in from its edge in dur-sheet and goes out in dur-base (measured in Chrome)', () => {
    render(<Comments defaultOpen layout="side" />)
    const c = dialog().className
    expect(c).toContain('data-[starting-style]:translate-x-(--sheet-from)')
    expect(c).toContain('rtl:[--sheet-side:-1]')
    expect(c).toContain('motion-reduce:[--sheet-from:0%]')
  })

  it('bottom-sheet/tv: a clause of the TV class; the web side panel has the full height and no drag (review on the platform)', () => {
    expect(clause('bottom-sheet/tv').classes).toEqual(['tv'])
    render(<Comments defaultOpen layout="side" />)
    expect(dialog().className).toContain('inset-y-0')
    expect(part('handle')).toBeNull()
  })

  it('bottom-sheet/tv-close: Back (Escape on the web) closes the panel, and the focus goes back to its cause', async () => {
    expect(clause('bottom-sheet/tv-close').classes).toEqual(['tv'])
    render(<Comments layout="side" />)
    const user = userEvent.setup()
    const trigger = screen.getByRole('button', { name: 'Show comments' })
    await user.click(trigger)
    await waitFor(() => expect(document.activeElement).toBe(part('title')))
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.activeElement).toBe(trigger)
  })

  it('bottom-sheet/car: a clause of the car class; the platform gives the list template (review on the platform)', () => {
    expect(clause('bottom-sheet/car').classes).toEqual(['car'])
  })

  it('bottom-sheet/watch: a clause of the watch class (review on the platform)', () => {
    expect(clause('bottom-sheet/watch')).toMatchObject({ level: 'SHOULD', classes: ['watch'] })
  })

  it('bottom-sheet/xr: a clause of the XR class; the web side panel has no snap points (review on the platform)', () => {
    expect(clause('bottom-sheet/xr').classes).toEqual(['xr'])
    render(<Comments defaultOpen layout="side" />)
    expect(dialog().style.getPropertyValue('--sheet-rest')).toBe('')
  })

  it('bottom-sheet/xr-close: the close button closes the panel, and the focus goes back to its cause', async () => {
    expect(clause('bottom-sheet/xr-close').classes).toEqual(['xr'])
    render(<Comments layout="side" />)
    const user = userEvent.setup()
    const trigger = screen.getByRole('button', { name: 'Show comments' })
    await user.click(trigger)
    await user.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.activeElement).toBe(trigger)
  })

  // ---------------------------------------------------------------- the handle

  it('bottom-sheet/handle-keys: Enter changes Half and Full; the arrows move one snap point; down at Half closes', async () => {
    const onOpenChange = vi.fn()
    render(<Comments defaultOpen onOpenChange={onOpenChange} />)
    const handle = part('handle')
    await waitFor(() => expect(document.activeElement).toBe(part('title')))
    const user = userEvent.setup()
    await user.tab({ shift: true })
    expect(document.activeElement).toBe(handle)
    await user.keyboard('{Enter}')
    expect(dialog().dataset.snap).toBe('full')
    await user.keyboard('{Enter}')
    expect(dialog().dataset.snap).toBe('half')
    await user.keyboard('{ArrowUp}')
    expect(dialog().dataset.snap).toBe('full')
    await user.keyboard('{ArrowDown}')
    expect(dialog().dataset.snap).toBe('half')
    await user.keyboard('{ArrowDown}')
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
  })

  it('bottom-sheet/handle-actions: on the web, the handle button and its keys give Expand and Collapse', () => {
    // The web has no custom actions of assistive technology. Expand is the up arrow, Collapse is the down arrow.
    render(
      <BottomSheet variant="persistent" title="Results">
        <p>Shop 1</p>
      </BottomSheet>,
    )
    const region = screen.getByRole('region')
    const handle = screen.getByRole('button', { name: 'Resize the sheet' })
    fireEvent.keyDown(handle, { key: 'ArrowDown' })
    expect(region.dataset.snap).toBe('peek')
    fireEvent.keyDown(handle, { key: 'ArrowUp' })
    expect(region.dataset.snap).toBe('half')
    fireEvent.keyDown(handle, { key: 'ArrowUp' })
    expect(region.dataset.snap).toBe('full')
  })

  it('bottom-sheet/snap-only: a controlled sheet moves to the snap point of its prop', () => {
    fakeClock()
    const onSnapChange = vi.fn()
    function Controlled() {
      const [snap, setSnap] = useState<BottomSheetSnap>('half')
      return (
        <>
          <button type="button" onClick={() => setSnap('full')}>
            Expand
          </button>
          <BottomSheet
            variant="persistent"
            title="Results"
            snap={snap}
            onSnapChange={(s) => {
              onSnapChange(s)
              setSnap(s)
            }}
          >
            <p>Shop 1</p>
          </BottomSheet>
        </>
      )
    }
    render(<Controlled />)
    const region = screen.getByRole('region')
    fireEvent.click(screen.getByRole('button', { name: 'Expand' }))
    expect(region.dataset.snap).toBe('full')
    advance(16)
    expect(pos(region)).toBeGreaterThan(HALF)
    advance(500)
    expect(Number.isNaN(pos(region))).toBe(true)
    fireEvent.keyDown(part('handle', region), { key: 'ArrowDown' })
    expect(onSnapChange).toHaveBeenLastCalledWith('half')
  })
})
