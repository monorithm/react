// The tests of the Alert and the banner. Each name starts with the id of a clause of ir/contracts/alert.json. The
// browser test (test/browser/alert.browser.test.tsx) measures the clauses that jsdom cannot compute.
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { violations } from '@monorithm/react/test/axe'
import { type Clause, contract as loadContract } from '@monorithm/react/test/contract'
import { MomentProvider } from '@monorithm/react/contexts/moment-context'
import { type MomentEvent } from '@monorithm/react/lib/moments'
import { Alert } from './alert'

const contract = loadContract('alert')
const clause = (id: string) => contract.clauses.find((c) => c.id === id) as (Clause & { classes?: string[] }) | undefined
const level = (id: string) => clause(id)?.level

const Offline = () => (
  <svg viewBox="0 0 24 24" data-icon="offline">
    <path d="M3 3l18 18" />
  </svg>
)
const root = (container: HTMLElement) => container.querySelector('[data-mono="alert"]') as HTMLElement
const part = (container: HTMLElement, name: string) => container.querySelector(`[data-part="${name}"]`) as HTMLElement

afterEach(() => {
  vi.useRealTimers()
})

describe('Alert', () => {
  it('the tests cover each clause of the contract', () => {
    const tested = new Set([
      'alert/role', 'alert/announce', 'alert/danger-use', 'alert/title', 'alert/tone-sign', 'alert/icon', 'alert/icon-style',
      'alert/fill', 'alert/contrast', 'alert/density', 'alert/density-values', 'alert/text-color', 'alert/shape',
      'alert/padding', 'alert/gaps', 'alert/direction', 'alert/no-focus-move', 'alert/keyboard', 'alert/focus',
      'alert/target', 'alert/action', 'alert/action-solves', 'alert/close', 'alert/close-name', 'alert/blocking',
      'alert/time', 'alert/hover', 'alert/press', 'alert/disabled', 'alert/in-flow', 'alert/no-cover',
      'alert/banner-position', 'alert/banner-max', 'alert/show-again', 'alert/use', 'alert/motion', 'alert/reduced-motion',
      'alert/moment', 'alert/button-moment', 'alert/no-direct-feedback', 'alert/phone', 'alert/car', 'alert/watch', 'alert/xr',
    ])
    expect(contract.clauses.map((c) => c.id).filter((id) => !tested.has(id))).toEqual([])
  })

  it('alert/role: a danger alert and a danger banner have the alert role; the other tones have the status role', () => {
    render(
      <div>
        <Alert tone="danger" title="Payment failed" text="The bank did not accept the card." />
        <Alert variant="banner" tone="danger" title="Payment did not complete" text="Pay the invoice to send orders." />
        {(['info', 'success', 'warning'] as const).map((t) => (
          <Alert key={t} tone={t} title={`Inline ${t}`} text="Text" />
        ))}
        {(['info', 'success', 'warning'] as const).map((t) => (
          <Alert key={t} variant="banner" tone={t} title={`Banner ${t}`} text="Text" />
        ))}
        <Alert variant="banner" tone="neutral" icon={<Offline />} title="You are offline" text="Changes save when you connect." />
      </div>,
    )
    expect(screen.getAllByRole('alert').map((e) => e.textContent)).toEqual([
      'Payment failedThe bank did not accept the card.',
      'Payment did not completePay the invoice to send orders.',
    ])
    expect(screen.getAllByRole('status')).toHaveLength(7)
  })

  it('alert/role: axe finds no violation in each variant and tone, with an action, a close button, and a disabled action', async () => {
    const { container } = render(
      <div>
        {(['info', 'success', 'warning', 'danger'] as const).map((t) => (
          <Alert key={t} tone={t} title={`Inline ${t}`} text="Text" action={{ label: `Fix ${t}` }} />
        ))}
        {(['info', 'success', 'warning', 'danger'] as const).map((t) => (
          <Alert
            key={t}
            variant="banner"
            tone={t}
            title={`Banner ${t}`}
            text="Text"
            secondLine="Second line"
            action={{ label: `Open ${t}` }}
            onDismiss={() => {}}
            dismissLabel={`Close ${t}`}
          />
        ))}
        <Alert variant="banner" tone="neutral" icon={<Offline />} title="You are offline" text="Text" onDismiss={() => {}} dismissLabel="Close" />
        <Alert variant="banner" tone="danger" blocking title="Account limited" text="Add an ID." action={{ label: 'Add ID' }} />
        <Alert tone="warning" title="Low stock" text="Add stock first." action={{ label: 'Update stock', disabled: true, disabledReason: 'No stock' }} />
        <Alert variant="banner" tone="warning" actionBelow title="Quote expired" text="Text" action={{ label: 'Get quote' }} onDismiss={() => {}} dismissLabel="Close quote" />
      </div>,
    )
    expect(await violations(container)).toEqual([])
  })

  it('alert/announce: the region has the title and the text, not the buttons; the roles are assertive for danger and polite for the others', () => {
    const { rerender } = render(
      <Alert variant="banner" tone="danger" title="Payment failed" text="Try a different card." action={{ label: 'Try again' }} onDismiss={() => {}} dismissLabel="Close" />,
    )
    const region = screen.getByRole('alert')
    // The alert role is assertive and atomic; the status role is polite and atomic (WAI-ARIA 1.2). No live attribute changes them.
    expect(region.hasAttribute('aria-live')).toBe(false)
    expect(region.hasAttribute('aria-atomic')).toBe(false)
    expect(within(region).queryAllByRole('button')).toEqual([])
    expect(region.textContent).toBe('Payment failedTry a different card.')
    // One time: a new render does not change the content of the region, thus the screen reader does not speak it again.
    rerender(
      <Alert variant="banner" tone="danger" title="Payment failed" text="Try a different card." action={{ label: 'Try again' }} onDismiss={() => {}} dismissLabel="Close" />,
    )
    expect(screen.getByRole('alert')).toBe(region)
    expect(region.textContent).toBe('Payment failedTry a different card.')
  })

  it('alert/danger-use: the use of the danger tone is a rule for the screen (review)', () => {
    // A component cannot know if the user must do an action. The review of a screen examines it.
    expect(level('alert/danger-use')).toBe('SHOULD')
  })

  it('alert/title: the title is necessary and comes first in the region; its words are a rule for the author (review)', () => {
    // @ts-expect-error alert/title: an alert has a title.
    const untitled = <Alert text="The bank did not accept the card." />
    expect(untitled).toBeTruthy()
    const { container } = render(<Alert tone="danger" title="Payment failed" text="The bank did not accept the card." />)
    const body = part(container, 'body')
    expect([...body.children].map((e) => e.getAttribute('data-part'))).toEqual(['title', 'text'])
    expect(part(container, 'title').textContent).toBe('Payment failed')
  })

  it('alert/tone-sign: each tone has a different icon, and the title shows the result', () => {
    const shapes = (['info', 'success', 'warning', 'danger'] as const).map((t) => {
      const { container, unmount } = render(<Alert tone={t} title={`Result ${t}`} text="Text" />)
      const shape = part(container, 'icon').innerHTML
      expect(part(container, 'title').textContent).toBe(`Result ${t}`)
      unmount()
      return shape
    })
    expect(new Set(shapes).size).toBe(4)
  })

  it('alert/icon: info has info, success has success, warning has warning, danger has error; a neutral banner has its own icon', () => {
    const icons = (['info', 'success', 'warning', 'danger'] as const).map((t) => {
      const { container, unmount } = render(<Alert tone={t} title="Title" text="Text" />)
      const name = part(container, 'icon').querySelector('svg')?.getAttribute('data-icon')
      unmount()
      return name
    })
    expect(icons).toEqual(['info', 'success', 'warning', 'error'])
    const { container } = render(<Alert variant="banner" tone="neutral" icon={<Offline />} title="You are offline" text="Text" />)
    expect(part(container, 'icon').querySelector('svg')?.getAttribute('data-icon')).toBe('offline')
    // @ts-expect-error alert/icon: a neutral banner needs the icon of its message.
    const noIcon = <Alert variant="banner" tone="neutral" title="You are offline" text="Text" />
    // @ts-expect-error alert/icon: only a neutral banner takes an icon. The other tones have the icon of the tone.
    const ownIcon = <Alert tone="info" icon={<Offline />} title="Next payout" text="Text" />
    expect([noIcon, ownIcon]).toHaveLength(2)
  })

  it('alert/icon-style: the icon is hidden from assistive technology, with the icon size and the text color of the tone (measured in Chrome)', () => {
    const { container } = render(<Alert tone="warning" title="Low stock" text="Text" />)
    const icon = part(container, 'icon')
    expect(icon.getAttribute('aria-hidden')).toBe('true')
    expect(icon.className).toContain('text-mono-warning-text')
    expect(icon.className).toContain('h-lh')
    expect(icon.firstElementChild?.className).toContain('size-(--mono-size-icon)')
  })

  it('alert/fill: the soft fill of the tone; a neutral banner has the selected fill (measured in Chrome)', () => {
    const fills = (['info', 'success', 'warning', 'danger'] as const).map((t) => {
      const { container, unmount } = render(<Alert tone={t} title="Title" text="Text" />)
      const c = part(container, 'container').className
      unmount()
      return c.split(' ').find((n) => n.startsWith('bg-'))
    })
    expect(fills).toEqual(['bg-mono-accent-soft', 'bg-mono-success-soft', 'bg-mono-warning-soft', 'bg-mono-danger-soft'])
    const { container } = render(<Alert variant="banner" tone="neutral" icon={<Offline />} title="Offline" text="Text" />)
    expect(part(container, 'container').className).toContain('bg-mono-selected')
    expect(part(container, 'container').className).not.toMatch(/shadow|ring|border/)
  })

  it('alert/contrast, alert/density, alert/density-values, alert/text-color: the type classes (measured in Chrome)', () => {
    const { container } = render(
      <div>
        <Alert title="Inline" text="Inline text" />
        <Alert variant="banner" title="Banner" text="Banner text" secondLine="Second line" />
      </div>,
    )
    const [inline, banner] = [...container.querySelectorAll('[data-mono="alert"]')] as HTMLElement[]
    const cls = (el: HTMLElement | undefined, name: string) => (el?.querySelector(`[data-part="${name}"]`) as HTMLElement).className
    expect(cls(inline, 'title')).toBe('text-mono-body font-mono-strong text-mono-fg-strong')
    expect(cls(inline, 'text')).toBe('text-mono-small text-mono-fg-2')
    expect(cls(banner, 'text')).toBe('text-mono-body text-mono-fg')
    expect(cls(banner, 'second-line')).toBe('text-mono-small text-mono-fg-2')
  })

  it('alert/shape, alert/padding, alert/gaps: the radius, the padding, and the gaps come from the geometry (measured in Chrome)', () => {
    const { container } = render(
      <div>
        <Alert title="Inline" text="Text" />
        <Alert variant="banner" title="Banner" text="Text" />
      </div>,
    )
    const [inline, banner] = [...container.querySelectorAll('[data-part="container"]')].map((e) => e.className)
    expect(inline).toContain('rounded-mono-lg')
    expect(inline).toContain('px-(--mono-alert-inline-padding-inline)')
    expect(banner).toContain('rounded-(--mono-alert-banner-radius)')
    expect(banner).toContain('ps-(--mono-alert-banner-padding-start)')
    expect(banner).toContain('pe-(--mono-alert-banner-padding-end)')
  })

  it('alert/direction: the icon comes first and the buttons come last in the DOM, on the logical sides (measured in Chrome)', () => {
    const { container } = render(
      <Alert variant="banner" title="Offline" text="Text" action={{ label: 'Retry' }} onDismiss={() => {}} dismissLabel="Close" />,
    )
    // The parts of the alert, not the parts in the buttons.
    const order = [...container.querySelectorAll('[data-part]')].filter((e) => !e.closest('button')).map((e) => e.getAttribute('data-part'))
    expect(order).toEqual(['container', 'message', 'icon', 'body', 'title', 'text', 'actions', 'action', 'close'])
  })

  it('alert/no-focus-move: when an alert shows, the focus stays on the current element', async () => {
    function Page() {
      const [shown, setShown] = useState(false)
      return (
        <div>
          <button type="button" onClick={() => setShown(true)}>
            Pay
          </button>
          {shown ? (
            <Alert variant="banner" tone="danger" title="Payment failed" text="Text" action={{ label: 'Try again' }} onDismiss={() => {}} dismissLabel="Close" />
          ) : null}
        </div>
      )
    }
    render(<Page />)
    const pay = screen.getByRole('button', { name: 'Pay' })
    const user = userEvent.setup()
    await user.click(pay)
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(document.activeElement).toBe(pay)
  })

  it('alert/keyboard: the action and the close button are in the focus order at the position of the alert; Enter and Space press them', async () => {
    const onAction = vi.fn()
    const onDismiss = vi.fn()
    render(
      <div>
        <button type="button">Before</button>
        <Alert variant="banner" tone="warning" title="Offline" text="Text" action={{ label: 'Retry', onClick: onAction }} onDismiss={onDismiss} dismissLabel="Close" />
        <button type="button">After</button>
      </div>,
    )
    const user = userEvent.setup()
    const names: (string | null)[] = []
    for (let i = 0; i < 4; i++) {
      await user.tab()
      names.push(document.activeElement?.textContent || document.activeElement?.getAttribute('aria-label') || null)
    }
    expect(names).toEqual(['Before', 'Retry', 'Close', 'After'])
    screen.getByRole('button', { name: 'Retry' }).focus()
    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    expect(onAction).toHaveBeenCalledTimes(2)
    screen.getByRole('button', { name: 'Close' }).focus()
    await user.keyboard(' ')
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('alert/focus: the action and the close button have the focus ring of the language for keyboard focus (measured in Chrome)', () => {
    render(<Alert variant="banner" title="Offline" text="Text" action={{ label: 'Retry' }} onDismiss={() => {}} dismissLabel="Close" />)
    for (const b of screen.getAllByRole('button')) expect(b.className).toContain('focus-visible:outline-solid')
  })

  it('alert/target: the action and the close button extend their target to the minimum target (measured in Chrome)', () => {
    render(<Alert variant="banner" title="Offline" text="Text" action={{ label: 'Retry' }} onDismiss={() => {}} dismissLabel="Close" />)
    for (const b of screen.getAllByRole('button')) expect(b.className).toContain('after:min-h-(--mono-size-target-min)')
  })

  it('alert/action: one action, a small outline button with the label of the step', async () => {
    const onClick = vi.fn()
    render(<Alert tone="danger" title="Payment failed" text="Text" action={{ label: 'Try again', onClick }} />)
    const button = screen.getByRole('button', { name: 'Try again' })
    expect(button.getAttribute('data-mono')).toBe('button')
    expect(button.getAttribute('data-size')).toBe('sm')
    expect(button.getAttribute('data-variant')).toBe('outline')
    expect(button.getAttribute('type')).toBe('button')
    await userEvent.setup().click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
    // @ts-expect-error alert/action: an alert has one action or no action, not a list.
    const two = <Alert title="Payment failed" text="Text" action={[{ label: 'Try again' }, { label: 'Help' }]} />
    expect(two).toBeTruthy()
  })

  it('alert/action-solves: the choice of the action is a rule for the screen (review)', () => {
    expect(level('alert/action-solves')).toBe('SHOULD')
  })

  it('alert/close: the close button of a banner is a small ghost icon button at the end side; a press closes the banner', async () => {
    const onDismiss = vi.fn()
    const { container } = render(
      <Alert variant="banner" tone="warning" title="Offline" text="Text" action={{ label: 'Retry' }} onDismiss={onDismiss} dismissLabel="Close" />,
    )
    const close = screen.getByRole('button', { name: 'Close' })
    expect(close.getAttribute('data-mono')).toBe('icon-button')
    expect(close.getAttribute('data-variant')).toBe('ghost')
    expect(close.getAttribute('data-size')).toBe('sm')
    expect(part(container, 'actions').lastElementChild).toBe(part(container, 'close'))
    await userEvent.setup().click(close)
    expect(onDismiss).toHaveBeenCalledTimes(1)
    expect(container.querySelector('[data-mono="alert"]')).toBeNull()
  })

  it('alert/close: the banner closes after its exit transition (data-ending-style), then calls onDismiss', async () => {
    let finish = () => {}
    const finished = new Promise<void>((resolve) => {
      finish = resolve
    })
    const getAnimations = vi.fn(() => [{ finished } as unknown as Animation])
    Object.defineProperty(HTMLElement.prototype, 'getAnimations', { value: getAnimations, configurable: true })
    try {
      const onDismiss = vi.fn()
      const { container } = render(<Alert variant="banner" title="Offline" text="Text" onDismiss={onDismiss} dismissLabel="Close" />)
      await userEvent.setup().click(screen.getByRole('button', { name: 'Close' }))
      expect(root(container).hasAttribute('data-ending-style')).toBe(true)
      expect(onDismiss).not.toHaveBeenCalled()
      await act(async () => finish())
      expect(container.querySelector('[data-mono="alert"]')).toBeNull()
      expect(onDismiss).toHaveBeenCalledTimes(1)
    } finally {
      delete (HTMLElement.prototype as { getAnimations?: unknown }).getAnimations
    }
  })

  it('alert/close-name: the close button has the dismiss label as its name; the icon adds nothing to it', () => {
    render(<Alert variant="banner" title="Offline" text="Text" onDismiss={() => {}} dismissLabel="Close" />)
    const close = screen.getByRole('button', { name: 'Close' })
    expect(close.getAttribute('aria-label')).toBe('Close')
    expect(close.textContent).toBe('')
    // @ts-expect-error alert/close-name: a banner that the user can close needs the name of the close button.
    const unnamed = <Alert variant="banner" title="Offline" text="Text" onDismiss={() => {}} />
    expect(unnamed).toBeTruthy()
  })

  it('alert/blocking: a banner about a blocking problem has no close button', () => {
    // @ts-expect-error alert/blocking: a blocking banner takes no close button.
    const closable = <Alert variant="banner" blocking onDismiss={() => {}} dismissLabel="Close" title="Account limited" text="Text" />
    render(closable)
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()
    expect(screen.getByRole('status').textContent).toBe('Account limitedText')
  })

  it('alert/time: an alert does not close after a time; an inline alert has no close button', () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    render(
      <div>
        <Alert tone="warning" title="Quote expired" text="Get a new quote." />
        <Alert variant="banner" tone="success" title="Payout sent" text="Text" onDismiss={onDismiss} dismissLabel="Close" />
      </div>,
    )
    act(() => {
      vi.advanceTimersByTime(10 * 60 * 1000)
    })
    expect(screen.getAllByRole('status')).toHaveLength(2)
    expect(onDismiss).not.toHaveBeenCalled()
    // @ts-expect-error alert/time: an inline alert has no close button.
    const inline = <Alert title="Quote expired" text="Text" onDismiss={() => {}} dismissLabel="Close" />
    expect(inline).toBeTruthy()
  })

  it('alert/hover: the close button gets the hover fill on a fill and the strong icon color, only with hover (measured in Chrome)', () => {
    const { container } = render(<Alert variant="banner" title="Offline" text="Text" onDismiss={() => {}} dismissLabel="Close" />)
    const close = part(container, 'close').className
    expect(close).toContain('[--btn-label:var(--mono-color-role-fg-2)]')
    expect(close).toContain('hover:[--btn-label:var(--mono-color-role-fg-strong)]')
    expect(close).toContain('[&>button]:[--btn-fill-hover:var(--mono-color-role-hover-on-fill)]')
  })

  it('alert/press: the close button scales with press-icon and the action with press (measured in Chrome)', () => {
    render(<Alert variant="banner" title="Offline" text="Text" action={{ label: 'Retry' }} onDismiss={() => {}} dismissLabel="Close" />)
    expect(screen.getByRole('button', { name: 'Retry' }).className).toContain('[--btn-press:var(--mono-scale-press)]')
    expect(screen.getByRole('button', { name: 'Close' }).className).toContain('[--btn-press:var(--mono-scale-press-icon)]')
  })

  it('alert/disabled: an alert has no disabled state; a disabled action stays in the focus order, does not act, and tells the cause', async () => {
    const onClick = vi.fn()
    render(<Alert tone="warning" title="Low stock" text="Add a product first." action={{ label: 'Update stock', onClick, disabled: true, disabledReason: 'Add a product first' }} />)
    const button = screen.getByRole('button', { name: 'Update stock', description: 'Add a product first' })
    expect(button.getAttribute('aria-disabled')).toBe('true')
    const user = userEvent.setup()
    await user.tab()
    expect(document.activeElement).toBe(button)
    await user.click(button)
    expect(onClick).not.toHaveBeenCalled()
    // @ts-expect-error alert/disabled: the alert has no disabled prop.
    const disabled = <Alert disabled title="Low stock" text="Text" />
    expect(disabled).toBeTruthy()
  })

  it('alert/in-flow and alert/no-cover: the alert has no fixed and no absolute position (measured in Chrome)', () => {
    const { container } = render(<Alert variant="banner" title="Offline" text="Text" />)
    expect(root(container).className).not.toMatch(/(^| )(fixed|absolute|sticky)( |$)/)
    expect(root(container).className).toContain('grid')
  })

  it('alert/banner-position, alert/banner-max, alert/show-again, alert/use: rules for the screen, not for one component (review)', () => {
    // A component cannot see the header of the page, the other banners, or the choice of the component. The review of a
    // screen examines them.
    for (const id of ['alert/banner-position', 'alert/banner-max', 'alert/show-again', 'alert/use']) expect(level(id)).toBe('SHOULD')
  })

  it('alert/motion: a banner and an inline warning alert expand, an inline danger alert fades, the others have no motion (measured in Chrome)', () => {
    const { container } = render(
      <div>
        <Alert variant="banner" tone="info" title="Banner" text="Text" />
        <Alert tone="warning" title="Warning" text="Text" />
        <Alert tone="danger" title="Danger" text="Text" />
        <Alert tone="info" title="Info" text="Text" />
        <Alert tone="success" title="Success" text="Text" />
      </div>,
    )
    const roots = [...container.querySelectorAll('[data-mono="alert"]')].map((e) => e.className)
    expect(roots.map((c) => (c.includes('[--alert-rows-hidden:0fr]') ? 'expand' : c.includes('[--alert-opacity-hidden:0]') ? 'fade' : 'none'))).toEqual([
      'expand',
      'expand',
      'fade',
      'none',
      'none',
    ])
    // No shake: the root has no translate and no animation.
    for (const c of roots) expect(c).not.toMatch(/translate|animate-/)
  })

  it('alert/reduced-motion: reduced motion replaces the expand with a fade in and a fade out (measured in Chrome)', () => {
    const { container } = render(<Alert variant="banner" title="Banner" text="Text" />)
    const c = root(container).className
    expect(c).toContain('motion-reduce:[--alert-rows-hidden:1fr]')
    expect(c).toContain('[[data-motion=reduced]_&]:[--alert-opacity-hidden:0]')
    expect(c).toContain('motion-reduce:data-[ending-style]:[--alert-fade-duration:var(--mono-duration-press)]')
  })

  it('alert/moment: at the first frame of its entrance, an alert emits the moment of its tone; info and neutral emit none', () => {
    const cases = [
      [<Alert tone="success" title="Payment confirmed" text="Text" />, [{ moment: 'success', variant: undefined, source: 'alert' }]],
      [<Alert variant="banner" tone="warning" title="Offline" text="Text" />, [{ moment: 'warning', variant: undefined, source: 'alert' }]],
      [<Alert tone="danger" title="Payment failed" text="Text" />, [{ moment: 'error', variant: undefined, source: 'alert' }]],
      [<Alert tone="info" title="Next payout" text="Text" />, []],
      [<Alert variant="banner" tone="neutral" icon={<Offline />} title="Offline" text="Text" />, []],
    ] as const
    for (const [node, want] of cases) {
      const onMoment = vi.fn<(e: MomentEvent) => void>()
      const { unmount } = render(<MomentProvider onMoment={onMoment}>{node}</MomentProvider>)
      expect(onMoment.mock.calls.map((c) => c[0])).toEqual(want)
      unmount()
    }
  })

  it('alert/moment: the moment comes when the alert shows, in a layout effect (before the paint); a new render and strict mode emit no second moment', async () => {
    const onMoment = vi.fn<(e: MomentEvent) => void>()
    const order: string[] = []
    function Page() {
      const [shown, setShown] = useState(false)
      const [count, setCount] = useState(0)
      return (
        <div>
          <button type="button" onClick={() => setShown(true)}>
            Pay
          </button>
          <button type="button" onClick={() => setCount(count + 1)}>
            Render
          </button>
          {shown ? <Alert tone="danger" title="Payment failed" text={`Attempt ${count}`} /> : null}
        </div>
      )
    }
    render(
      <StrictMode>
        <MomentProvider
          onMoment={(e) => {
            // The alert is in the DOM when the moment comes: the moment and the first frame are at the same time.
            order.push(`${e.moment}:${document.querySelector('[role="alert"]') ? 'in' : 'out'}`)
            onMoment(e)
          }}
        >
          <Page />
        </MomentProvider>
      </StrictMode>,
    )
    expect(onMoment).not.toHaveBeenCalled()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Pay' }))
    await user.click(screen.getByRole('button', { name: 'Render' }))
    expect(order).toEqual(['error:in'])
  })

  it('alert/button-moment: the action and the close button emit the moment press, as each button does', async () => {
    const onMoment = vi.fn<(e: MomentEvent) => void>()
    render(
      <MomentProvider onMoment={onMoment}>
        <Alert variant="banner" tone="info" title="Offline" text="Text" action={{ label: 'Retry' }} onDismiss={() => {}} dismissLabel="Close" />
      </MomentProvider>,
    )
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onMoment.mock.calls.map((c) => c[0])).toEqual([
      { moment: 'press', variant: undefined, source: 'button' },
      { moment: 'press', variant: undefined, source: 'icon-button' },
    ])
  })

  it('alert/no-direct-feedback: the entrance and a press call no vibration API and play no sound', async () => {
    const vibrate = vi.fn()
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true })
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve())
    render(<Alert variant="banner" tone="danger" title="Payment failed" text="Text" action={{ label: 'Try again' }} />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }))
    expect(vibrate).not.toHaveBeenCalled()
    expect(play).not.toHaveBeenCalled()
    play.mockRestore()
  })

  it('alert/phone: with actionBelow, the action goes below the text and the close button stays at the end side (measured in Chrome)', () => {
    const { container } = render(
      <Alert variant="banner" actionBelow title="Offline" text="Text" action={{ label: 'Retry' }} onDismiss={() => {}} dismissLabel="Close" />,
    )
    const message = part(container, 'message')
    expect(message.nextElementSibling).toBe(part(container, 'action'))
    expect(part(container, 'container').lastElementChild).toBe(part(container, 'close'))
    expect(clause('alert/phone')?.classes).toEqual(['phone'])
  })

  it('alert/car, alert/watch, alert/xr: rules for the platform of the class, not for the web (review)', () => {
    // A web page cannot know the class of the device. In a car, the platform shows its own alert. On a watch and in an XR
    // headset, the app puts the banner at the top of the list or of the window.
    expect(clause('alert/car')?.classes).toEqual(['car'])
    expect(clause('alert/watch')?.classes).toEqual(['watch'])
    expect(clause('alert/xr')?.classes).toEqual(['xr'])
  })
})
