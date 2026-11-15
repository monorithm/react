// The tests of the Icon button. Each name starts with the id of a clause of ir/contracts/icon-button.json. The browser
// test (test/browser/buttons.browser.test.tsx) measures the clauses that jsdom cannot compute.
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { violations } from '@monorithm/react/test/axe'
import { contract as loadContract } from '@monorithm/react/test/contract'
import { MomentProvider } from '@monorithm/react/contexts/moment-context'
import { type MomentEvent } from '@monorithm/react/lib/moments'
import { IconButton } from './icon-button'

const contract = loadContract('icon-button')

const Bell = () => (
  <svg viewBox="0 0 16 16">
    <path d="M4 11V7a4 4 0 0 1 8 0v4l1 1H3z" />
  </svg>
)

describe('IconButton', () => {
  it('the tests cover each clause of the contract', () => {
    const tested = new Set([
      'icon-button/role', 'icon-button/name', 'icon-button/keyboard', 'icon-button/square', 'icon-button/target',
      'icon-button/icon', 'icon-button/round', 'icon-button/badge', 'icon-button/direction', 'icon-button/hover',
      'icon-button/press', 'icon-button/focus', 'icon-button/disabled', 'icon-button/motion', 'icon-button/moment',
      'icon-button/no-direct-feedback',
    ])
    expect(contract.clauses.map((c: { id: string }) => c.id).filter((id: string) => !tested.has(id))).toEqual([])
  })

  it('icon-button/role: the accessibility tree shows a button with the label as its name', () => {
    render(<IconButton label="Notifications" icon={<Bell />} />)
    expect(screen.getByRole('button', { name: 'Notifications' }).tagName).toBe('BUTTON')
  })

  it('icon-button/role: axe finds no violation in each variant, with a badge, and disabled', async () => {
    const { container } = render(
      <div>
        {(['ghost', 'outline', 'secondary', 'round'] as const).map((v) => (
          <IconButton key={v} variant={v} label={`Search ${v}`} icon={<Bell />} />
        ))}
        <IconButton label="Notifications" badge="New items" icon={<Bell />} />
        <IconButton label="Delete" disabled disabledReason="Select a row first" icon={<Bell />} />
      </div>,
    )
    expect(await violations(container)).toEqual([])
  })

  it('icon-button/name: the label prop is the name; the icon adds nothing to it', () => {
    render(<IconButton label="Search" icon={<Bell />} />)
    const button = screen.getByRole('button', { name: 'Search' })
    expect(button.getAttribute('aria-label')).toBe('Search')
    expect(button.textContent).toBe('')
  })

  it('icon-button/keyboard: Tab focuses the icon button; Enter and Space press it', async () => {
    const onClick = vi.fn()
    render(<IconButton label="Search" icon={<Bell />} onClick={onClick} />)
    const user = userEvent.setup()
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button'))
    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    expect(onClick).toHaveBeenCalledTimes(2)
  })

  it('icon-button/square: the width and the height take the same token (measured in Chrome)', () => {
    render(<IconButton label="Search" size="sm" icon={<Bell />} />)
    const c = screen.getByRole('button').className
    expect(c).toContain('w-(--mono-size-control-sm)')
    expect(c).toContain('h-(--mono-size-control-sm)')
  })

  it('icon-button/target: the target extends past a small icon button (measured in Chrome)', () => {
    render(<IconButton label="Search" size="sm" icon={<Bell />} />)
    expect(screen.getByRole('button').className).toContain('after:min-w-(--mono-size-target-min)')
  })

  it('icon-button/icon: the icon is hidden from assistive technology and has the icon size token', () => {
    render(<IconButton label="Search" icon={<Bell />} />)
    const icon = screen.getByRole('button').querySelector('[data-part="icon"]') as HTMLElement
    expect(icon.getAttribute('aria-hidden')).toBe('true')
    expect(icon.className).toContain('size-(--mono-size-icon)')
  })

  it('icon-button/round: ghost is the default; the round variant is round (the use is a rule for the screen)', () => {
    render(
      <div>
        <IconButton label="Edit" icon={<Bell />} />
        <IconButton label="Search" variant="round" icon={<Bell />} />
      </div>,
    )
    expect(screen.getByRole('button', { name: 'Edit' }).dataset.variant).toBe('ghost')
    expect(screen.getByRole('button', { name: 'Search' }).className).toContain('rounded-mono-full')
    expect(contract.clauses.find((c: { id: string }) => c.id === 'icon-button/round')?.level).toBe('SHOULD')
  })

  it('icon-button/badge: the badge is a dot hidden from assistive technology, and its text goes into the name', () => {
    render(<IconButton label="Notifications" badge="New items" icon={<Bell />} />)
    const button = screen.getByRole('button', { name: 'Notifications, New items' })
    expect(button.querySelector('[data-part="badge"]')?.getAttribute('aria-hidden')).toBe('true')
  })

  it('icon-button/direction: the badge is at the end side, thus at the left in right-to-left (measured in Chrome)', () => {
    render(<IconButton label="Notifications" badge="New items" icon={<Bell />} />)
    expect(screen.getByRole('button').querySelector('[data-part="badge"]')?.className).toContain('inset-e-(--mono-icon-button-badge-inset)')
  })

  it('icon-button/hover, icon-button/press, and icon-button/focus: the classes of the states (measured in Chrome)', () => {
    render(<IconButton label="Search" icon={<Bell />} />)
    const c = screen.getByRole('button').className
    expect(c).toContain('not-data-[disabled]:hover:')
    expect(c).toContain('[--btn-press:var(--mono-scale-press-icon)]')
    expect(c).toContain('focus-visible:outline-solid')
  })

  it('icon-button/disabled: a disabled icon button stays in the focus order, does not act, and tells the cause', async () => {
    const onClick = vi.fn()
    render(<IconButton label="Delete" disabled disabledReason="Select a row first" icon={<Bell />} onClick={onClick} />)
    const button = screen.getByRole('button', { name: 'Delete', description: 'Select a row first' })
    expect(button.getAttribute('aria-disabled')).toBe('true')
    const user = userEvent.setup()
    await user.tab()
    expect(document.activeElement).toBe(button)
    await user.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('icon-button/motion: reduced motion sets the press scale to 1 (measured in Chrome)', () => {
    render(<IconButton label="Search" icon={<Bell />} />)
    expect(screen.getByRole('button').className).toContain('motion-reduce:[--btn-press:1]')
  })

  it('icon-button/moment: a press emits press once; a disabled icon button emits no moment', async () => {
    const onMoment = vi.fn<(e: MomentEvent) => void>()
    render(
      <MomentProvider onMoment={onMoment}>
        <IconButton label="Search" icon={<Bell />} />
        <IconButton label="Delete" disabled icon={<Bell />} />
      </MomentProvider>,
    )
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Search' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onMoment.mock.calls).toEqual([[{ moment: 'press', variant: undefined, source: 'icon-button' }]])
  })

  it('icon-button/no-direct-feedback: a press calls no vibration API', async () => {
    const vibrate = vi.fn()
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true })
    render(<IconButton label="Search" icon={<Bell />} />)
    await userEvent.setup().click(screen.getByRole('button'))
    expect(vibrate).not.toHaveBeenCalled()
  })

  it('icon-button/role: the icon button gives the attributes of a trigger to its element', () => {
    render(<IconButton label="More actions" icon={<Bell />} aria-haspopup="menu" aria-expanded />)
    const button = screen.getByRole('button', { name: 'More actions' })
    expect([button.getAttribute('aria-haspopup'), button.getAttribute('aria-expanded')]).toEqual(['menu', 'true'])
  })
})
