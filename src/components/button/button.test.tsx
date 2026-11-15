// The tests of the Button. Each name starts with the id of a clause of ir/contracts/button.json. The browser test
// (test/browser/buttons.browser.test.tsx) measures the clauses that jsdom cannot compute.
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { violations } from '@monorithm/react/test/axe'
import { contract as loadContract } from '@monorithm/react/test/contract'
import { MomentProvider } from '@monorithm/react/contexts/moment-context'
import { type MomentEvent } from '@monorithm/react/lib/moments'
import { Button } from './button'

const contract = loadContract('button')

const Plus = () => (
  <svg viewBox="0 0 16 16">
    <path d="M8 3v10M3 8h10" />
  </svg>
)

describe('Button', () => {
  it('the tests cover each clause of the contract', () => {
    const tested = new Set([
      'button/role', 'button/name', 'button/keyboard', 'button/type', 'button/size', 'button/block', 'button/target',
      'button/variant', 'button/one-primary', 'button/confirm', 'button/hover', 'button/press', 'button/focus',
      'button/disabled', 'button/disabled-cause', 'button/loading', 'button/link-loading', 'button/icon', 'button/direction',
      'button/motion', 'button/moment', 'button/no-direct-feedback', 'button/layout',
    ])
    expect(contract.clauses.map((c: { id: string }) => c.id).filter((id: string) => !tested.has(id))).toEqual([])
  })

  it('button/role: the accessibility tree shows a button with the label as its name', () => {
    render(<Button>Save</Button>)
    expect(screen.getByRole('button', { name: 'Save' }).tagName).toBe('BUTTON')
  })

  it('button/role: axe finds no violation in each variant, with icons, disabled, and loading', async () => {
    const { container } = render(
      <div>
        {(['primary', 'secondary', 'outline', 'ghost', 'destructive', 'link'] as const).map((v) => (
          <Button key={v} variant={v}>
            {v}
          </Button>
        ))}
        <Button startIcon={<Plus />}>Add product</Button>
        <Button disabled disabledReason="Add a product first">
          Publish
        </Button>
        <Button loading loadingLabel="Saving">
          Save
        </Button>
      </div>,
    )
    expect(await violations(container)).toEqual([])
  })

  it('button/name: the children are the label and the name; an icon adds nothing to the name', () => {
    render(
      <Button startIcon={<Plus />} endIcon={<Plus />}>
        Mark as shipped
      </Button>,
    )
    expect(screen.getByRole('button').textContent).toBe('Mark as shipped')
    expect(screen.getByRole('button', { name: 'Mark as shipped' })).toBeTruthy()
  })

  it('button/keyboard: Tab focuses the button; Enter and Space press it', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Save</Button>)
    const user = userEvent.setup()
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button'))
    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    expect(onClick).toHaveBeenCalledTimes(2)
  })

  it('button/type: a button in a form does not send the form; type="submit" sends it', async () => {
    const onSubmit = vi.fn((e: { preventDefault: () => void }) => e.preventDefault())
    render(
      <form onSubmit={onSubmit}>
        <Button>Preview</Button>
        <Button type="submit">Send</Button>
      </form>,
    )
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Preview' }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Preview' }).getAttribute('type')).toBe('button')
    await user.click(screen.getByRole('button', { name: 'Send' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('button/size: each size takes the height token of the density; medium is the default', () => {
    render(
      <div>
        <Button size="sm">Small</Button>
        <Button>Medium</Button>
        <Button size="lg">Large</Button>
      </div>,
    )
    expect(screen.getByRole('button', { name: 'Small' }).className).toContain('h-(--mono-size-control-sm)')
    expect(screen.getByRole('button', { name: 'Medium' }).className).toContain('h-(--mono-size-control-md)')
    expect(screen.getByRole('button', { name: 'Large' }).className).toContain('h-(--mono-size-control-lg)')
  })

  it('button/block: a block button has the full width (measured in Chrome)', () => {
    render(<Button block>Pay</Button>)
    expect(screen.getByRole('button').className).toContain('w-full')
  })

  it('button/target: the target extends past a small button to the minimum target (measured in Chrome)', () => {
    render(<Button size="sm">Edit</Button>)
    expect(screen.getByRole('button').className).toContain('after:min-h-(--mono-size-target-min)')
  })

  it('button/variant: secondary is the default; each variant is on the element (colors measured in Chrome)', () => {
    render(
      <div>
        <Button>Default</Button>
        <Button variant="destructive">Delete</Button>
      </div>,
    )
    expect(screen.getByRole('button', { name: 'Default' }).dataset.variant).toBe('secondary')
    expect(screen.getByRole('button', { name: 'Delete' }).dataset.variant).toBe('destructive')
  })

  it('button/one-primary and button/confirm: rules for the screen and the flow, not for one component (review)', () => {
    // A component cannot see the other buttons of the screen or the flow of the app. The review of a screen examines them.
    expect(contract.clauses.find((c: { id: string }) => c.id === 'button/one-primary')?.level).toBe('SHOULD')
    expect(contract.clauses.find((c: { id: string }) => c.id === 'button/confirm')?.level).toBe('SHOULD')
  })

  it('button/hover and button/press: the hover classes are only for a device with hover (measured in Chrome)', () => {
    render(<Button>Save</Button>)
    expect(screen.getByRole('button').className).toContain('not-data-[disabled]:hover:')
  })

  it('button/focus: the focus ring is for keyboard focus only (measured in Chrome)', () => {
    render(<Button>Save</Button>)
    expect(screen.getByRole('button').className).toContain('focus-visible:outline-solid')
  })

  it('button/disabled: a disabled button stays in the focus order, does not act, and tells the cause', async () => {
    const onClick = vi.fn()
    render(
      <Button disabled disabledReason="Add a product first" onClick={onClick}>
        Publish
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Publish' })
    expect(button.getAttribute('aria-disabled')).toBe('true')
    expect(button.hasAttribute('disabled')).toBe(false)
    expect(screen.getByRole('button', { description: 'Add a product first' })).toBe(button)
    const user = userEvent.setup()
    await user.tab()
    expect(document.activeElement).toBe(button)
    await user.click(button)
    await user.keyboard('{Enter}')
    expect(onClick).not.toHaveBeenCalled()
  })

  it('button/disabled-cause: the cause on the screen is a rule for the screen (review)', () => {
    expect(contract.clauses.find((c: { id: string }) => c.id === 'button/disabled-cause')?.level).toBe('SHOULD')
  })

  it('button/loading: the name changes to the activity, the focus stays, and a press does nothing', async () => {
    const onClick = vi.fn()
    const { rerender } = render(
      <Button loading={false} loadingLabel="Saving" onClick={onClick}>
        Save
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Save' })
    button.focus()
    rerender(
      <Button loading loadingLabel="Saving" onClick={onClick}>
        Save
      </Button>,
    )
    expect(screen.getByRole('button', { name: 'Saving' })).toBe(button)
    expect(document.activeElement).toBe(button)
    expect(button.getAttribute('aria-disabled')).toBe('true')
    expect(button.querySelector('[data-part="spinner"]')).toBeTruthy()
    await userEvent.setup().click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('button/link-loading: the type of a link button has no loading prop', () => {
    // @ts-expect-error button/link-loading: a link button has no loading state.
    const link = <Button variant="link" loading loadingLabel="Loading">View all</Button>
    expect(link).toBeTruthy()
  })

  it('button/icon: an icon is hidden from assistive technology and has the icon size token', () => {
    render(<Button startIcon={<Plus />}>Add product</Button>)
    const icon = screen.getByRole('button').querySelector('[data-part="start-icon"]') as HTMLElement
    expect(icon.getAttribute('aria-hidden')).toBe('true')
    expect(icon.className).toContain('size-(--mono-size-icon)')
  })

  it('button/direction: the start icon comes first in the DOM, thus at the start side (measured in Chrome)', () => {
    render(
      <Button startIcon={<Plus />} endIcon={<Plus />}>
        Next
      </Button>,
    )
    const parts = [...screen.getByRole('button').querySelectorAll('[data-part]')].map((e) => e.getAttribute('data-part'))
    expect(parts).toEqual(['start-icon', 'label', 'end-icon'])
  })

  it('button/motion: reduced motion sets the press scale to 1 and stops the spinner (measured in Chrome)', () => {
    render(
      <Button loading loadingLabel="Saving">
        Save
      </Button>,
    )
    const button = screen.getByRole('button')
    expect(button.className).toContain('motion-reduce:[--btn-press:1]')
    expect(button.querySelector('[data-part="spinner"]')?.getAttribute('class')).toContain('motion-reduce:animate-none')
  })

  it('button/moment: a press emits press once; a disabled or a loading button emits no moment', async () => {
    const onMoment = vi.fn<(e: MomentEvent) => void>()
    render(
      <MomentProvider onMoment={onMoment}>
        <Button>Save</Button>
        <Button disabled>Publish</Button>
        <Button loading loadingLabel="Sending">
          Send
        </Button>
      </MomentProvider>,
    )
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await user.click(screen.getByRole('button', { name: 'Publish' }))
    await user.click(screen.getByRole('button', { name: 'Sending' }))
    expect(onMoment.mock.calls).toEqual([[{ moment: 'press', variant: undefined, source: 'button' }]])
  })

  it('button/moment: the moment comes at the release, not at pointer down', async () => {
    const onMoment = vi.fn()
    render(
      <MomentProvider onMoment={onMoment}>
        <Button>Save</Button>
      </MomentProvider>,
    )
    const user = userEvent.setup()
    const button = screen.getByRole('button')
    await user.pointer({ keys: '[MouseLeft>]', target: button })
    expect(onMoment).not.toHaveBeenCalled()
    await user.pointer({ keys: '[/MouseLeft]', target: button })
    expect(onMoment).toHaveBeenCalledTimes(1)
  })

  it('button/no-direct-feedback: a press calls no vibration API', async () => {
    const vibrate = vi.fn()
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true })
    render(<Button>Save</Button>)
    await userEvent.setup().click(screen.getByRole('button'))
    expect(vibrate).not.toHaveBeenCalled()
  })

  it('button/layout: the order of the actions is a rule for the screen (review)', () => {
    expect(contract.clauses.find((c: { id: string }) => c.id === 'button/layout')?.level).toBe('SHOULD')
  })

  it('button/role: the button gives the attributes of a trigger to its element', () => {
    render(
      <Button aria-haspopup="menu" aria-expanded={false} aria-controls="actions" data-testid="trigger">
        Actions
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Actions' })
    expect([button.getAttribute('aria-haspopup'), button.getAttribute('aria-expanded'), button.getAttribute('aria-controls')]).toEqual(['menu', 'false', 'actions'])
    expect(button.dataset.testid).toBe('trigger')
  })
})
