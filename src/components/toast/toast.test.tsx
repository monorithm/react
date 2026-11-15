// The tests of the Toast. Each name starts with the id of a clause of ir/contracts/toast.json. The browser test
// (test/browser/toast.browser.test.tsx) measures the clauses that jsdom cannot compute.
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type ReactNode, StrictMode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { violations } from '@monorithm/react/test/axe'
import { contract as loadContract } from '@monorithm/react/test/contract'
import { MomentProvider } from '@monorithm/react/contexts/moment-context'
import type { MomentEvent } from '@monorithm/react/lib/moments'
import { ToastProvider, type ToastProviderProps } from './toast'
import { useToast } from './toast.hook'
import type { ToastApi, ToastOptions } from './toast.types'

const contract = loadContract('toast')
const clause = (id: string) => contract.clauses.find((c) => c.id === id) as { level: string; classes?: string[] } | undefined

let api: ToastApi
function Capture() {
  api = useToast()
  return null
}

function setup(props: Partial<ToastProviderProps> = {}, onMoment: (e: MomentEvent) => void = () => {}, extra?: ReactNode) {
  return render(
    <StrictMode>
      <MomentProvider onMoment={onMoment}>
        <ToastProvider {...props}>
          <main>
            <button type="button">Hide product</button>
            {extra}
          </main>
          <Capture />
        </ToastProvider>
      </MomentProvider>
    </StrictMode>,
  )
}

const add = (options: ToastOptions): string => {
  let id = ''
  act(() => {
    id = api.add(options)
  })
  return id
}
const update = (id: string, changes: Partial<ToastOptions>) => act(() => api.update(id, changes))
const close = (id?: string) => act(() => api.close(id))
const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms))

const region = () => screen.getByRole('region', { name: 'Notifications' })
const containers = () => [...document.querySelectorAll<HTMLElement>('[data-part="container"]')]
const titles = () => containers().map((c) => c.querySelector('[data-part="title"]')?.textContent)
const announcer = () => document.querySelector('[data-part="announcer"]') as HTMLElement
const icon = (c: HTMLElement | undefined) => c?.querySelector('[data-part="disc"] svg')?.getAttribute('data-icon')
const buttons = (c: HTMLElement | undefined) => within(c as HTMLElement).queryAllByRole('button')

const hidden: ToastOptions = { tone: 'success', title: 'Product hidden', text: 'Black shirt' }
const notSaved: ToastOptions = { tone: 'danger', title: 'Changes not saved', text: 'The connection was lost' }
const undo = (onPress = () => {}): ToastOptions => ({ ...hidden, action: { label: 'Undo', onPress } })
const danger = (n: number): ToastOptions => ({ tone: 'danger', title: `Order ${n} not sent` })
const timed = (n: number): ToastOptions => ({ tone: 'success', title: `Order ${n} sent` })

afterEach(() => {
  vi.useRealTimers()
})

describe('Toast', () => {
  it('the tests cover each clause of the contract', () => {
    const tested = new Set([
      'toast/role', 'toast/announce', 'toast/announce-danger', 'toast/announce-action', 'toast/use', 'toast/use-other',
      'toast/near-cause', 'toast/title', 'toast/wrap', 'toast/tone-sign', 'toast/icon', 'toast/icon-style', 'toast/contrast',
      'toast/surface', 'toast/padding', 'toast/density', 'toast/text-color', 'toast/width', 'toast/position',
      'toast/position-phone', 'toast/position-keyboard', 'toast/position-tablet', 'toast/not-obscured', 'toast/queue-max',
      'toast/queue-full', 'toast/queue-order', 'toast/no-repeat', 'toast/time', 'toast/time-danger', 'toast/pause',
      'toast/loading', 'toast/loading-result', 'toast/action', 'toast/action-press', 'toast/close', 'toast/close-press',
      'toast/close-name', 'toast/no-focus-move', 'toast/keyboard', 'toast/focus', 'toast/focus-return', 'toast/target',
      'toast/hover', 'toast/press', 'toast/disabled', 'toast/direction', 'toast/motion', 'toast/motion-stack',
      'toast/reduced-motion', 'toast/moment', 'toast/moment-queue', 'toast/moment-loading', 'toast/no-open-close',
      'toast/button-moment', 'toast/no-direct-feedback', 'toast/tv', 'toast/car', 'toast/watch', 'toast/xr',
    ])
    expect(contract.clauses.map((c: { id: string }) => c.id).filter((id: string) => !tested.has(id))).toEqual([])
  })

  it('toast/role: the area is a region with a name; each toast is a status message; a danger toast is an alert', () => {
    setup()
    add(hidden)
    add(notSaved)
    const status = screen.getByRole('status', { name: 'Product hidden' })
    expect(region().contains(status)).toBe(true)
    expect(status.getAttribute('aria-describedby')).toBe(status.querySelector('[data-part="text"]')?.id)
    const alert = screen.getByRole('alert', { name: 'Changes not saved' })
    expect(region().contains(alert)).toBe(true)
  })

  it('toast/role: the label prop gives a different name to the region', () => {
    setup({ label: 'Alerts' })
    expect(screen.getByRole('region', { name: 'Alerts' }).dataset.part).toBe('region')
  })

  it('toast/role: axe finds no violation for info, success with an action, and danger with an action', async () => {
    const { container } = setup()
    add({ tone: 'info', title: 'New order', text: 'Order 1042 from Ama' })
    add(undo())
    add({ ...notSaved, action: { label: 'Retry', onPress: () => {} } })
    expect(containers()).toHaveLength(3)
    expect(await violations(container)).toEqual([])
  })

  it('toast/role: axe finds no violation for warning, loading, and a disabled action', async () => {
    const { container } = setup()
    add({ tone: 'warning', title: 'Stock is low', text: 'Two black shirts are left' })
    add({ tone: 'loading', title: 'Uploading 3 photos' })
    add({ tone: 'info', title: 'Draft saved', text: 'Add a photo to publish', action: { label: 'Publish', onPress: () => {}, disabled: true } })
    expect(containers()).toHaveLength(3)
    expect(await violations(container)).toEqual([])
  })

  it('toast/announce: the polite announcer has the title and the text one time; the region and the toast are not live', () => {
    setup()
    add(hidden)
    expect(announcer().getAttribute('aria-live')).toBe('polite')
    expect(announcer().textContent).toBe('Product hidden. Black shirt.')
    expect(region().getAttribute('aria-live')).toBe('off')
    expect(containers()[0]?.getAttribute('aria-live')).toBe('off')
    const live = [...document.querySelectorAll('[aria-live]:not([aria-live="off"]), [role="alert"], [role="status"]:not([aria-live="off"])')]
    expect(live.filter((el) => el.textContent?.includes('Product hidden'))).toEqual([announcer()])
  })

  it('toast/announce: a new toast adds a line; the line of a toast stays the same node, thus it is not spoken again', () => {
    setup()
    add(hidden)
    const first = announcer().firstElementChild
    add({ tone: 'loading', title: 'Uploading 3 photos' })
    expect(announcer().firstElementChild).toBe(first)
    // A loading toast is polite.
    expect([...announcer().children].map((p) => p.textContent)).toEqual(['Product hidden. Black shirt.', 'Uploading 3 photos.'])
  })

  it('toast/announce: a toast of the first render (defaultToasts) also goes to the announcer after the first render', () => {
    setup({ defaultToasts: [hidden] })
    expect(titles()).toEqual(['Product hidden'])
    expect(announcer().textContent).toBe('Product hidden. Black shirt.')
  })

  it('toast/announce-danger: a danger toast is an assertive alert; a second alert does not replace the first', () => {
    setup()
    add(notSaved)
    const first = screen.getByRole('alert')
    // The role alert is assertive. No attribute changes it.
    expect(first.hasAttribute('aria-live')).toBe(false)
    expect(announcer().textContent).toBe('')
    add({ tone: 'danger', title: 'Photo not uploaded' })
    const alerts = screen.getAllByRole('alert')
    expect(alerts).toHaveLength(2)
    expect(alerts[0]).toBe(first)
    expect(first.textContent).toContain('Changes not saved')
  })

  it('toast/announce-action: the message of a toast with an action tells the action', () => {
    setup()
    add(undo())
    expect(announcer().textContent).toBe('Product hidden. Black shirt. Undo is available.')
  })

  it('toast/announce-action: describeAction gives the sentence in a different language', () => {
    setup({ describeAction: (label) => `${label} est disponible` })
    add(undo())
    expect(announcer().textContent).toBe('Product hidden. Black shirt. Undo est disponible.')
  })

  it('toast/use, toast/use-other, toast/near-cause: rules for the screen and the product, not for one component (review)', () => {
    // A component cannot see if the screen shows the result, or where the cause is. The review of a screen examines them.
    expect(clause('toast/use')?.level).toBe('SHOULD')
    expect(clause('toast/use-other')?.level).toBe('SHOULD')
    expect(clause('toast/near-cause')?.level).toBe('SHOULD')
  })

  it('toast/title: the title is the name of the toast; the type makes the title necessary', () => {
    setup()
    add(notSaved)
    expect(screen.getByRole('alert', { name: 'Changes not saved' })).toBeTruthy()
    // @ts-expect-error toast/title: a toast has a title.
    const untitled: ToastOptions = { tone: 'success' }
    expect(untitled).toBeTruthy()
  })

  it('toast/wrap: the text column can shrink, and a long word breaks onto a new line (measured in Chrome)', () => {
    setup()
    add(hidden)
    const text = containers()[0]?.querySelector('[data-part="title"]')?.parentElement
    expect(text?.className).toContain('min-w-0')
    expect(text?.className).toContain('break-words')
    expect(text?.className).not.toContain('truncate')
  })

  it('toast/tone-sign and toast/icon: each tone has its icon, and loading has the spinner', () => {
    setup()
    add({ tone: 'info', title: 'New order' })
    add({ tone: 'success', title: 'Product hidden' })
    add({ tone: 'warning', title: 'Stock is low' })
    expect(containers().map(icon)).toEqual(['info', 'success', 'warning'])
    close()
    add({ tone: 'danger', title: 'Changes not saved' })
    add({ tone: 'loading', title: 'Uploading 3 photos' })
    expect(containers().map(icon)).toEqual(['error', 'spinner'])
  })

  it('toast/icon-style: the disc and the icon are hidden from assistive technology; the disc has the tone colors', () => {
    setup()
    add({ tone: 'warning', title: 'Stock is low' })
    const disc = containers()[0]?.querySelector('[data-part="disc"]') as HTMLElement
    expect(disc.getAttribute('aria-hidden')).toBe('true')
    expect(disc.className).toContain('size-(--mono-toast-disc-size)')
    expect(disc.className).toContain('[&>svg]:size-(--mono-toast-icon-size)')
    expect(disc.className).toContain('bg-mono-warning-soft text-mono-warning-text')
  })

  it('toast/contrast and toast/text-color: the title is fg-strong and the text is fg-2 on the raised fill (measured in Chrome)', () => {
    setup()
    add(hidden)
    const c = containers()[0] as HTMLElement
    expect(c.className).toContain('bg-mono-raised')
    expect(c.querySelector('[data-part="title"]')?.className).toContain('text-mono-fg-strong')
    expect(c.querySelector('[data-part="text"]')?.className).toContain('text-mono-fg-2')
  })

  it('toast/surface, toast/padding, toast/density: the tokens and the geometry of the contract (measured in Chrome)', () => {
    setup()
    add(hidden)
    const c = containers()[0] as HTMLElement
    expect(c.dataset.mono).toBe('toast')
    for (const k of ['rounded-mono-lg', 'shadow-mono-overlay', 'py-(--mono-toast-container-padding-block)', 'ps-(--mono-toast-container-padding-start)', 'pe-(--mono-toast-container-padding-end)']) {
      expect(c.className).toContain(k)
    }
    expect(c.querySelector('[data-part="title"]')?.className).toContain('text-mono-small font-mono-strong')
    expect(c.querySelector('[data-part="text"]')?.className).toContain('text-mono-caption')
  })

  it('toast/width, toast/position, toast/position-phone, toast/position-tablet: the region is fixed at the bottom end corner (measured in Chrome)', () => {
    setup()
    const r = region()
    expect(r.dataset.mono).toBe('toast')
    expect(r.className).toContain('fixed')
    expect(r.className).toContain('mono-tablet:end-(--mono-space-4) mono-tablet:w-(--mono-toast-container-width)')
    expect(r.className).toContain('env(safe-area-inset-bottom,0px)')
    expect(r.className).toContain('max-mono-tablet:[:root:has([data-mono=tab-bar])_&]:[--toast-tab-bar:var(--mono-size-tab-bar)]')
    expect(clause('toast/position-tablet')?.level).toBe('SHOULD')
  })

  it('toast/position-keyboard: the height of the on-screen keyboard goes into --toast-keyboard', () => {
    const vv = Object.assign(new EventTarget(), { height: 400, offsetTop: 0 })
    Object.defineProperty(window, 'visualViewport', { value: vv, configurable: true })
    try {
      setup()
      expect(region().style.getPropertyValue('--toast-keyboard')).toBe(`${window.innerHeight - 400}px`)
      act(() => {
        vv.height = window.innerHeight
        vv.dispatchEvent(new Event('resize'))
      })
      expect(region().style.getPropertyValue('--toast-keyboard')).toBe('')
    } finally {
      Reflect.deleteProperty(window, 'visualViewport')
    }
  })

  it('toast/not-obscured: when the focus goes to a control that a toast fully covers, the toasts go up above it', () => {
    setup({}, undefined, <button type="button">Save</button>)
    add(hidden)
    const box = (left: number, top: number, width: number, height: number) => () =>
      ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}) }) as DOMRect
    ;(containers()[0] as HTMLElement).getBoundingClientRect = box(0, 600, 340, 60)
    const save = screen.getByRole('button', { name: 'Save' })
    save.getBoundingClientRect = box(10, 610, 90, 30)
    act(() => save.focus())
    expect(region().style.getPropertyValue('--toast-lift')).toBe(`${window.innerHeight - 610}px`)
    act(() => screen.getByRole('button', { name: 'Hide product' }).focus())
    expect(region().style.getPropertyValue('--toast-lift')).toBe('')
  })

  it('toast/queue-max: a maximum of three toasts show; the newest is the last, at the bottom (gap measured in Chrome)', () => {
    setup()
    for (const n of [1, 2, 3, 4]) add(danger(n))
    expect(titles()).toEqual(['Order 1 not sent', 'Order 2 not sent', 'Order 3 not sent'])
    expect(containers()[0]?.className).toContain('var(--mono-toast-stack-gap)')
  })

  it('toast/queue-full: with three toasts on the screen, the oldest toast that closes after a time goes out', () => {
    vi.useFakeTimers()
    setup()
    add(danger(1))
    add(timed(2))
    add(timed(3))
    add(timed(4))
    expect(titles()).toEqual(['Order 1 not sent', 'Order 3 sent', 'Order 4 sent'])
  })

  it('toast/queue-full: if no toast on the screen closes after a time, the new toast waits in the queue', () => {
    setup()
    for (const n of [1, 2, 3]) add(danger(n))
    add({ tone: 'info', title: 'New order' })
    expect(titles()).toEqual(['Order 1 not sent', 'Order 2 not sent', 'Order 3 not sent'])
    expect(announcer().textContent).not.toContain('New order')
  })

  it('toast/queue-order: the queue keeps the sequence; the first toast of the queue shows when a different toast closes', () => {
    setup()
    const ids = [1, 2, 3].map((n) => add(danger(n)))
    add(timed(4))
    add(timed(5))
    close(ids[0])
    expect(titles()).toEqual(['Order 2 not sent', 'Order 3 not sent', 'Order 4 sent'])
    close(ids[2])
    expect(titles()).toEqual(['Order 2 not sent', 'Order 4 sent', 'Order 5 sent'])
  })

  it('toast/queue-order: close removes a toast from the queue; close with no id closes all the toasts and the queue', () => {
    setup()
    const ids = [1, 2, 3].map((n) => add(danger(n)))
    const waiting = add(timed(4))
    close(waiting)
    close(ids[0])
    expect(titles()).toEqual(['Order 2 not sent', 'Order 3 not sent'])
    add(timed(5))
    add(danger(6))
    close()
    expect(titles()).toEqual([])
  })

  it('toast/no-repeat: a toast that is the same as a toast on the screen or in the queue does not show again', () => {
    setup()
    const first = add(hidden)
    expect(add({ ...hidden })).toBe(first)
    expect(titles()).toEqual(['Product hidden'])
    close(first)
    const ids = [1, 2, 3].map((n) => add(danger(n)))
    const waiting = add(timed(4))
    expect(add(timed(4))).toBe(waiting)
    close(ids[0])
    close(ids[1])
    expect(titles()).toEqual(['Order 3 not sent', 'Order 4 sent'])
  })

  it('toast/time: a toast with no action closes after 5 s; a toast with an action stays', () => {
    vi.useFakeTimers()
    setup()
    add(hidden)
    add({ tone: 'info', title: 'Draft saved', action: { label: 'Publish', onPress: () => {} } })
    wait(4999)
    expect(titles()).toEqual(['Product hidden', 'Draft saved'])
    wait(1)
    expect(titles()).toEqual(['Draft saved'])
    wait(60_000)
    expect(titles()).toEqual(['Draft saved'])
  })

  it('toast/time-danger: a danger toast stays until the user closes it, also with no action', () => {
    vi.useFakeTimers()
    setup()
    add(notSaved)
    wait(60_000)
    expect(titles()).toEqual(['Changes not saved'])
  })

  it('toast/pause: the timer stops while the pointer is on the toasts and continues when it goes away', () => {
    vi.useFakeTimers()
    setup()
    add(hidden)
    wait(3000)
    fireEvent.mouseEnter(region())
    wait(10_000)
    expect(titles()).toEqual(['Product hidden'])
    fireEvent.mouseLeave(region())
    wait(1999)
    expect(titles()).toEqual(['Product hidden'])
    wait(1)
    expect(titles()).toEqual([])
  })

  it('toast/pause: the timer stops while the focus is in a toast and continues when the focus goes away', () => {
    vi.useFakeTimers()
    setup()
    add(hidden)
    wait(3000)
    act(() => containers()[0]?.focus())
    wait(10_000)
    expect(titles()).toEqual(['Product hidden'])
    act(() => screen.getByRole('button', { name: 'Hide product' }).focus())
    wait(1999)
    expect(titles()).toEqual(['Product hidden'])
    wait(1)
    expect(titles()).toEqual([])
  })

  it('toast/loading: the spinner in the neutral disc; the toast does not close after a time; it has a close button', () => {
    vi.useFakeTimers()
    setup()
    add({ tone: 'loading', title: 'Uploading 3 photos' })
    const c = containers()[0]
    expect(icon(c)).toBe('spinner')
    expect(c?.querySelector('[data-part="disc"]')?.className).toContain('bg-mono-selected text-mono-fg-2')
    wait(60_000)
    expect(titles()).toEqual(['Uploading 3 photos'])
    expect(buttons(c).map((b) => b.getAttribute('aria-label'))).toEqual(['Close'])
  })

  it('toast/loading-result: the loading toast changes to its result in the same position; then the timer starts', () => {
    vi.useFakeTimers()
    setup()
    add(danger(1))
    const id = add({ tone: 'loading', title: 'Uploading 3 photos' })
    wait(10_000)
    const c = containers()[1]
    update(id, { tone: 'success', title: '3 photos uploaded' })
    expect(containers()[1]).toBe(c)
    expect(icon(c)).toBe('success')
    expect(titles()).toEqual(['Order 1 not sent', '3 photos uploaded'])
    wait(4999)
    expect(titles()).toEqual(['Order 1 not sent', '3 photos uploaded'])
    wait(1)
    expect(titles()).toEqual(['Order 1 not sent'])
  })

  it('toast/action: one small outline button after the text, at the end side, before the close button', () => {
    setup()
    add(undo())
    const c = containers()[0]
    const [action, closer] = buttons(c)
    expect(action?.textContent).toBe('Undo')
    expect(action?.dataset.variant).toBe('outline')
    expect(action?.dataset.size).toBe('sm')
    expect(closer?.getAttribute('aria-label')).toBe('Close')
    const parts = [...(c?.querySelectorAll('[data-part="disc"], [data-part="title"], [data-mono="button"], [data-mono="icon-button"]') ?? [])]
    expect(parts.map((p) => p.getAttribute('data-part') ?? p.getAttribute('data-mono'))).toEqual(['disc', 'title', 'button', 'icon-button'])
  })

  it('toast/action-press: a press on the action starts the action and closes the toast', async () => {
    const onPress = vi.fn()
    setup()
    add(undo(onPress))
    await userEvent.setup().click(screen.getByRole('button', { name: 'Undo' }))
    expect(onPress).toHaveBeenCalledTimes(1)
    expect(titles()).toEqual([])
  })

  it('toast/close: a toast that stays has a small ghost close button; a toast that closes after a time has none', () => {
    setup()
    add(hidden)
    add(notSaved)
    add({ tone: 'loading', title: 'Uploading 3 photos' })
    const [timedOne, dangerOne, loadingOne] = containers()
    expect(buttons(timedOne)).toEqual([])
    const closer = buttons(dangerOne)[0]
    expect(closer?.dataset.mono).toBe('icon-button')
    expect(closer?.dataset.variant).toBe('ghost')
    expect(closer?.dataset.size).toBe('sm')
    expect(buttons(loadingOne)).toHaveLength(1)
  })

  it('toast/close-press: a press on the close button closes the toast', async () => {
    setup()
    add(notSaved)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Close' }))
    expect(titles()).toEqual([])
  })

  it('toast/close-press: on a loading toast, the close does not stop the task; the result of the task does not show', async () => {
    setup()
    const id = add({ tone: 'loading', title: 'Uploading 3 photos' })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Close' }))
    expect(titles()).toEqual([])
    update(id, { tone: 'success', title: '3 photos uploaded' })
    expect(titles()).toEqual([])
  })

  it('toast/close-name: the close button has a name that tells the action; the icon is not the name', () => {
    setup({ closeLabel: 'Dismiss' })
    add(notSaved)
    const closer = screen.getByRole('button', { name: 'Dismiss' })
    expect(closer.querySelector('svg')?.closest('[aria-hidden="true"]')).toBeTruthy()
  })

  it('toast/no-focus-move: a new toast does not move the focus', () => {
    setup()
    const trigger = screen.getByRole('button', { name: 'Hide product' })
    act(() => trigger.focus())
    add(undo())
    add(notSaved)
    expect(document.activeElement).toBe(trigger)
  })

  it('toast/keyboard: Tab moves the focus to the action and the close button; Enter and Space press them', async () => {
    const onPress = vi.fn()
    setup()
    const trigger = screen.getByRole('button', { name: 'Hide product' })
    act(() => trigger.focus())
    add(undo(onPress))
    add(notSaved)
    const user = userEvent.setup()
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Undo' }))
    await user.tab()
    expect(document.activeElement).toBe(within(containers()[0] as HTMLElement).getByRole('button', { name: 'Close' }))
    await user.tab()
    await user.keyboard(' ')
    expect(titles()).toEqual(['Product hidden'])
    act(() => screen.getByRole('button', { name: 'Undo' }).focus())
    await user.keyboard('{Enter}')
    expect(onPress).toHaveBeenCalledTimes(1)
    expect(titles()).toEqual([])
  })

  it('toast/focus and toast/target: the buttons have the focus ring and the minimum target (measured in Chrome)', () => {
    setup()
    add(undo())
    for (const b of buttons(containers()[0])) {
      expect(b.className).toContain('focus-visible:outline-solid')
      expect(b.className).toContain('after:min-h-(--mono-size-target-min)')
    }
  })

  it('toast/focus-return: when a toast closes while it has the focus, the focus goes back to its cause', async () => {
    setup()
    const trigger = screen.getByRole('button', { name: 'Hide product' })
    act(() => trigger.focus())
    add(undo())
    const user = userEvent.setup()
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Undo' }))
    await user.keyboard('{Enter}')
    expect(titles()).toEqual([])
    expect(document.activeElement).toBe(trigger)
  })

  it('toast/focus-return: if the cause is not on the screen, the focus goes to the start of the page content', async () => {
    setup()
    const cause = document.createElement('button')
    cause.textContent = 'Delete'
    document.body.append(cause)
    act(() => cause.focus())
    add(notSaved)
    cause.remove()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(document.activeElement).toBe(screen.getByRole('main'))
  })

  it('toast/focus-return: a toast from a button in a toast takes the cause of that toast', async () => {
    setup()
    const trigger = screen.getByRole('button', { name: 'Hide product' })
    act(() => trigger.focus())
    add({ ...notSaved, action: { label: 'Retry', onPress: () => api.add({ tone: 'danger', title: 'Changes not saved again' }) } })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(titles()).toEqual(['Changes not saved again'])
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(document.activeElement).toBe(trigger)
  })

  it('toast/hover and toast/press: the close button has the selected fill at hover (measured in Chrome)', () => {
    setup()
    add(notSaved)
    expect(screen.getByRole('button', { name: 'Close' }).className).toContain('[[data-part=container]_&]:[--btn-fill-hover:var(--mono-color-role-selected)]')
  })

  it('toast/disabled: a disabled action stays in the focus order, does not act, and the text tells why', async () => {
    const onPress = vi.fn()
    setup()
    add({ tone: 'info', title: 'Draft saved', text: 'Add a photo to publish', action: { label: 'Publish', onPress, disabled: true } })
    const action = screen.getByRole('button', { name: 'Publish' })
    expect(action.getAttribute('aria-disabled')).toBe('true')
    expect(screen.getByRole('button', { description: 'Add a photo to publish' })).toBe(action)
    await userEvent.setup().click(action)
    expect(onPress).not.toHaveBeenCalled()
    expect(titles()).toEqual(['Draft saved'])
  })

  it('toast/direction: the DOM order is the disc, the text, the action, and the close button; the corner is logical (measured in Chrome)', () => {
    setup()
    add(undo())
    expect(region().className).toContain('mono-tablet:end-(--mono-space-4)')
    expect(containers()[0]?.className).toContain('ps-(--mono-toast-container-padding-start)')
  })

  it('toast/motion, toast/motion-stack, toast/reduced-motion: the transitions of the opacity and the transform (measured in Chrome)', () => {
    setup()
    add({ tone: 'loading', title: 'Uploading 3 photos' })
    const c = containers()[0] as HTMLElement
    expect(c.className).toContain('[transition-property:opacity,translate,transform]')
    expect(c.className).toContain('data-[starting-style]:translate-y-[var(--toast-still,var(--mono-toast-enter-distance))]')
    expect(c.className).toContain('motion-reduce:[--toast-still:0px] motion-reduce:[--toast-stack:0s]')
    expect(c.querySelector('[data-icon="spinner"]')?.getAttribute('class')).toContain('motion-reduce:[--toast-spin:mono-toast-pulse')
  })

  it('toast/moment: a toast emits the moment of its tone one time when it shows', () => {
    const onMoment = vi.fn<(e: MomentEvent) => void>()
    setup({}, onMoment)
    add({ tone: 'info', title: 'New order' })
    add({ tone: 'success', title: 'Product hidden' })
    add({ tone: 'warning', title: 'Stock is low' })
    close()
    add(notSaved)
    expect(onMoment.mock.calls.map(([e]) => e)).toEqual(
      ['notify', 'success', 'warning', 'error'].map((moment) => ({ moment, variant: undefined, source: 'toast' })),
    )
  })

  it('toast/moment-queue: a toast that waits emits its moment when it shows; its message goes to the announcer then', () => {
    const seen: string[] = []
    setup({}, (e) => {
      if (e.moment === 'notify') seen.push(announcer().textContent ?? '')
    })
    const ids = [1, 2, 3].map((n) => add(danger(n)))
    add({ tone: 'info', title: 'New order' })
    expect(seen).toEqual([])
    close(ids[0])
    expect(seen).toEqual(['New order.'])
  })

  it('toast/moment-loading: a loading toast emits no moment; the change to the result emits the moment of the result', () => {
    const onMoment = vi.fn<(e: MomentEvent) => void>()
    setup({}, onMoment)
    const a = add({ tone: 'loading', title: 'Uploading 3 photos' })
    const b = add({ tone: 'loading', title: 'Uploading 2 photos' })
    expect(onMoment).not.toHaveBeenCalled()
    update(a, { tone: 'success', title: '3 photos uploaded' })
    update(a, { text: 'Black shirt' })
    update(b, { tone: 'danger', title: '2 photos not uploaded' })
    expect(onMoment.mock.calls.map(([e]) => e.moment)).toEqual(['success', 'error'])
  })

  it('toast/no-open-close: a toast emits no open moment and no close moment', async () => {
    vi.useFakeTimers()
    const onMoment = vi.fn<(e: MomentEvent) => void>()
    setup({}, onMoment)
    add(hidden)
    wait(5000)
    add(notSaved)
    close()
    expect(onMoment.mock.calls.map(([e]) => e.moment)).toEqual(['success', 'error'])
  })

  it('toast/button-moment: the action and the close button emit press, as each button does', async () => {
    const onMoment = vi.fn<(e: MomentEvent) => void>()
    setup({}, onMoment)
    add(undo())
    add(notSaved)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onMoment.mock.calls.map(([e]) => e).slice(2)).toEqual([
      { moment: 'press', variant: undefined, source: 'button' },
      { moment: 'press', variant: undefined, source: 'icon-button' },
    ])
  })

  it('toast/no-direct-feedback: a toast and its buttons call no vibration API', async () => {
    const vibrate = vi.fn()
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true })
    setup()
    add(undo())
    add(notSaved)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Undo' }))
    expect(vibrate).not.toHaveBeenCalled()
  })

  it('toast/tv, toast/car, toast/watch, toast/xr: rules for the platform of the class, not for the web (review)', () => {
    expect(clause('toast/tv')?.classes).toEqual(['tv'])
    expect(clause('toast/car')?.classes).toEqual(['car'])
    expect(clause('toast/watch')?.classes).toEqual(['watch'])
    expect(clause('toast/watch')?.level).toBe('SHOULD')
    expect(clause('toast/xr')?.classes).toEqual(['xr'])
  })
})
