// The tests of the Chip. Each name starts with the id of a clause of ir/contracts/chip.json. The browser test
// (test/browser/chip.browser.test.tsx) measures the clauses that jsdom cannot compute.
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { violations } from '@monorithm/react/test/axe'
import { type Clause, contract as loadContract } from '@monorithm/react/test/contract'
import { MomentProvider } from '@monorithm/react/contexts/moment-context'
import { type MomentEvent } from '@monorithm/react/lib/moments'
import { Chip } from './chip'
import { ChipGroup } from './chip.group'

const contract = loadContract('chip')
const clause = (id: string) => contract.clauses.find((c) => c.id === id) as (Clause & { classes?: string[] }) | undefined

/** A set of filters that the app controls: two filter chips, one menu chip, and Clear filters. */
function Filters({ onMoment }: { onMoment?: (e: MomentEvent) => void }) {
  const [sale, setSale] = useState(true)
  const [size, setSize] = useState<string | undefined>('Medium')
  const set = (
    <ChipGroup
      label="Filters"
      clearLabel="Clear filters"
      onClear={() => {
        setSale(false)
        setSize(undefined)
      }}
    >
      <Chip pressed={sale} onPressedChange={setSale}>
        On sale
      </Chip>
      <Chip defaultPressed>New</Chip>
      <Chip variant="menu" value={size} onClick={() => setSize('Large')}>
        Size
      </Chip>
    </ChipGroup>
  )
  return onMoment ? <MomentProvider onMoment={onMoment}>{set}</MomentProvider> : set
}

describe('Chip', () => {
  it('the tests cover each clause of the contract', () => {
    const tested = new Set([
      'chip/role', 'chip/menu-role', 'chip/name', 'chip/use', 'chip/keyboard', 'chip/menu', 'chip/density', 'chip/shape',
      'chip/target', 'chip/off-sign', 'chip/on-sign', 'chip/on-border', 'chip/menu-value', 'chip/icon', 'chip/hover',
      'chip/press', 'chip/focus', 'chip/disabled', 'chip/direction', 'chip/chevron-direction', 'chip/motion', 'chip/moment',
      'chip/menu-moment', 'chip/no-direct-feedback', 'chip/gap', 'chip/clear', 'chip/tv', 'chip/tv-keys', 'chip/xr',
    ])
    expect(contract.clauses.map((c) => c.id).filter((id) => !tested.has(id))).toEqual([])
  })

  it('chip/role: the accessibility tree shows a filter chip as a toggle button with the label as its name and its state', () => {
    render(
      <div>
        <Chip>On sale</Chip>
        <Chip defaultPressed>New</Chip>
      </div>,
    )
    const off = screen.getByRole('button', { name: 'On sale', pressed: false })
    const on = screen.getByRole('button', { name: 'New', pressed: true })
    expect([off.tagName, off.getAttribute('aria-pressed'), on.getAttribute('aria-pressed')]).toEqual(['BUTTON', 'false', 'true'])
    expect(off.getAttribute('type')).toBe('button')
  })

  it('chip/role: axe finds no violation in each variant and state', async () => {
    const { container } = render(
      <ChipGroup label="Filters" clearLabel="Clear filters">
        <Chip>On sale</Chip>
        <Chip defaultPressed>New</Chip>
        <Chip disabled disabledReason="No product is on sale at this time">
          Discount
        </Chip>
        <Chip variant="menu">Size</Chip>
        <Chip variant="menu" value="Red" expanded>
          Color
        </Chip>
        <Chip variant="menu" disabled disabledReason="Select a category first">
          Brand
        </Chip>
      </ChipGroup>,
    )
    expect(await violations(container)).toEqual([])
  })

  it('chip/menu-role: a menu chip is a button that opens a menu; expanded tells if the menu is open; a value sets pressed', () => {
    render(
      <div>
        <Chip variant="menu">Size</Chip>
        <Chip variant="menu" value="Red" expanded>
          Color
        </Chip>
      </div>,
    )
    const size = screen.getByRole('button', { name: 'Size', expanded: false, pressed: false })
    const color = screen.getByRole('button', { name: 'Color: Red', expanded: true, pressed: true })
    expect(size.getAttribute('aria-haspopup')).toBe('menu')
    expect(color.getAttribute('aria-haspopup')).toBe('menu')
  })

  it('chip/name: the label that the user can see is the name; a menu chip names the filter and the value', () => {
    render(
      <div>
        <Chip>On sale</Chip>
        <Chip variant="menu" value="Medium">
          Size
        </Chip>
      </div>,
    )
    expect(screen.getByRole('button', { name: 'On sale' }).textContent).toBe('On sale')
    expect(screen.getByRole('button', { name: 'Size: Medium' }).textContent).toBe('Size: Medium')
  })

  it('chip/use: the choice of the control is a rule for the screen (review)', () => {
    // A component cannot see the other controls of the screen. The review of a screen examines them.
    expect(clause('chip/use')?.level).toBe('SHOULD')
  })

  it('chip/keyboard: Tab moves the focus to each chip; Enter and Space turn a filter chip on or off and open a menu chip', async () => {
    const onClick = vi.fn()
    render(
      <div>
        <Chip>On sale</Chip>
        <Chip variant="menu" onClick={onClick}>
          Size
        </Chip>
      </div>,
    )
    const user = userEvent.setup()
    const filter = screen.getByRole('button', { name: 'On sale' })
    await user.tab()
    expect(document.activeElement).toBe(filter)
    await user.keyboard('{Enter}')
    expect(filter.getAttribute('aria-pressed')).toBe('true')
    await user.keyboard(' ')
    expect(filter.getAttribute('aria-pressed')).toBe('false')
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Size' }))
    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    expect(onClick).toHaveBeenCalledTimes(2)
  })

  it('chip/menu: a press calls onClick to open the menu, and expanded follows the open state (the menu offset in Chrome)', async () => {
    // The Menu comes later in the build order. The menu, the bottom sheet, Escape, and the focus return are its clauses.
    function Menu() {
      const [open, setOpen] = useState(false)
      return (
        <Chip variant="menu" expanded={open} onClick={() => setOpen(!open)}>
          Size
        </Chip>
      )
    }
    render(<Menu />)
    const chip = screen.getByRole('button', { name: 'Size' })
    await userEvent.setup().click(chip)
    expect(chip.getAttribute('aria-expanded')).toBe('true')
  })

  it('chip/density: the height token and the label size token of the density (measured in Chrome)', () => {
    render(<Chip>On sale</Chip>)
    const c = screen.getByRole('button').className
    expect(c).toContain('h-(--mono-size-control-md)')
    expect(c).toContain('text-mono-small')
  })

  it('chip/shape: the full radius, the border, and the padding come from the geometry (measured in Chrome)', () => {
    render(<Chip>On sale</Chip>)
    const c = screen.getByRole('button').className
    expect(c).toContain('rounded-mono-full')
    expect(c).toContain('[--btn-border-width:var(--mono-chip-border)]')
    expect(c).toContain('px-(--mono-chip-container-padding-inline)')
  })

  it('chip/target: the target extends past a small chip to the minimum target (measured in Chrome)', () => {
    render(<Chip>S</Chip>)
    expect(screen.getByRole('button').className).toContain('after:min-w-(--mono-size-target-min)')
  })

  it('chip/off-sign: a chip that is off has the line border and the secondary label (measured in Chrome)', () => {
    render(<Chip>On sale</Chip>)
    const chip = screen.getByRole('button')
    expect(chip.className).toContain('[--btn-border:var(--mono-color-role-line)]')
    expect(chip.className).not.toContain('font-mono-strong')
    expect(chip.querySelector('[data-part="check"]')).toBeNull()
  })

  it('chip/on-sign: a filter chip that is on shows a check at the start side, and has the strong weight', () => {
    render(<Chip defaultPressed>New</Chip>)
    const chip = screen.getByRole('button')
    expect([...chip.querySelectorAll('[data-part]')].map((e) => e.getAttribute('data-part'))).toEqual(['check', 'label'])
    expect(chip.className).toContain('font-mono-strong')
  })

  it('chip/on-border: the border of a chip that is on has no color, and its width stays (measured in Chrome)', () => {
    render(<Chip defaultPressed>New</Chip>)
    const c = screen.getByRole('button').className
    expect(c).not.toContain('[--btn-border:')
    expect(c).toContain('[--btn-border-width:var(--mono-chip-border)]')
  })

  it('chip/menu-value: a menu chip with a value is on and shows the chevron, not a check; with no value it is off', () => {
    render(
      <div>
        <Chip variant="menu" value="Medium">
          Size
        </Chip>
        <Chip variant="menu">Color</Chip>
      </div>,
    )
    const on = screen.getByRole('button', { name: 'Size: Medium' })
    const off = screen.getByRole('button', { name: 'Color' })
    expect([...on.querySelectorAll('[data-part]')].map((e) => e.getAttribute('data-part'))).toEqual(['label', 'chevron'])
    expect(on.className).toContain('font-mono-strong')
    expect(off.querySelector('[data-part="chevron"]')).toBeTruthy()
    expect(off.className).not.toContain('font-mono-strong')
  })

  it('chip/icon: the check and the chevron are hidden from assistive technology and have the icon size token', () => {
    render(
      <div>
        <Chip defaultPressed>New</Chip>
        <Chip variant="menu">Size</Chip>
      </div>,
    )
    for (const part of ['check', 'chevron']) {
      const icon = document.querySelector(`[data-part="${part}"]`) as SVGElement
      expect(icon.getAttribute('aria-hidden')).toBe('true')
      expect(icon.getAttribute('class')).toContain('size-(--mono-size-icon)')
      expect(icon.querySelector('path')?.getAttribute('stroke')).toBe('currentColor')
    }
  })

  it('chip/hover: the hover classes are only for a device with hover, and only for a chip that is off (measured in Chrome)', () => {
    render(
      <div>
        <Chip>On sale</Chip>
        <Chip defaultPressed>New</Chip>
      </div>,
    )
    expect(screen.getByRole('button', { name: 'On sale' }).className).toContain('not-data-[disabled]:hover:[--btn-label:')
    expect(screen.getByRole('button', { name: 'New' }).className).not.toContain('[--btn-fill-hover:')
  })

  it('chip/press: the press scale comes from the token (measured in Chrome)', () => {
    render(<Chip>On sale</Chip>)
    expect(screen.getByRole('button').className).toContain('[--btn-press:var(--mono-scale-press)]')
  })

  it('chip/focus: the focus ring is for keyboard focus only (measured in Chrome)', () => {
    render(<Chip>On sale</Chip>)
    expect(screen.getByRole('button').className).toContain('focus-visible:outline-solid')
  })

  it('chip/disabled: a disabled chip stays in the focus order, its state does not change, and it tells the cause', async () => {
    const onPressedChange = vi.fn()
    const onClick = vi.fn()
    render(
      <div>
        <Chip disabled disabledReason="No product is on sale at this time" onPressedChange={onPressedChange}>
          On sale
        </Chip>
        <Chip variant="menu" disabled disabledReason="Select a category first" onClick={onClick}>
          Brand
        </Chip>
      </div>,
    )
    const filter = screen.getByRole('button', { name: 'On sale' })
    const menu = screen.getByRole('button', { name: 'Brand' })
    for (const chip of [filter, menu]) {
      expect(chip.getAttribute('aria-disabled')).toBe('true')
      expect(chip.hasAttribute('disabled')).toBe(false)
      expect(chip.hasAttribute('data-disabled')).toBe(true)
    }
    expect(screen.getByRole('button', { description: 'No product is on sale at this time' })).toBe(filter)
    expect(screen.getByRole('button', { description: 'Select a category first' })).toBe(menu)
    const user = userEvent.setup()
    await user.tab()
    expect(document.activeElement).toBe(filter)
    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    await user.click(filter)
    expect(filter.getAttribute('aria-pressed')).toBe('false')
    await user.tab()
    expect(document.activeElement).toBe(menu)
    await user.keyboard('{Enter}')
    await user.click(menu)
    expect(onPressedChange).not.toHaveBeenCalled()
    expect(onClick).not.toHaveBeenCalled()
  })

  it('chip/direction: the check comes before the label and the chevron after it in the DOM (measured in Chrome)', () => {
    render(
      <div>
        <Chip defaultPressed>New</Chip>
        <Chip variant="menu">Size</Chip>
      </div>,
    )
    const parts = [...document.querySelectorAll('[data-part]')].map((e) => e.getAttribute('data-part'))
    expect(parts).toEqual(['check', 'label', 'label', 'chevron'])
  })

  it('chip/chevron-direction: the chevron has no mirror class for a right-to-left layout (measured in Chrome)', () => {
    render(<Chip variant="menu">Size</Chip>)
    expect(document.querySelector('[data-part="chevron"]')?.getAttribute('class')).not.toMatch(/rtl:|scale-x/)
  })

  it('chip/motion: the colors change in dur-fast, and reduced motion removes the transitions (measured in Chrome)', () => {
    render(<Chip>On sale</Chip>)
    const c = screen.getByRole('button').className
    expect(c).toContain('motion-reduce:transition-none')
    expect(c).toContain('[[data-motion=reduced]_&]:transition-none')
    expect(c).toContain('motion-reduce:[--btn-press:1]')
  })

  it('chip/moment: a filter chip emits select with on or off at the change; a disabled chip emits no moment', async () => {
    const onMoment = vi.fn<(e: MomentEvent) => void>()
    render(
      <MomentProvider onMoment={onMoment}>
        <Chip>On sale</Chip>
        <Chip disabled>Discount</Chip>
      </MomentProvider>,
    )
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'On sale' }))
    await user.click(screen.getByRole('button', { name: 'On sale' }))
    await user.click(screen.getByRole('button', { name: 'Discount' }))
    expect(onMoment.mock.calls).toEqual([
      [{ moment: 'select', variant: 'on', source: 'chip' }],
      [{ moment: 'select', variant: 'off', source: 'chip' }],
    ])
  })

  it('chip/moment: the moment comes at the release, not at pointer down', async () => {
    const onMoment = vi.fn()
    render(
      <MomentProvider onMoment={onMoment}>
        <Chip>On sale</Chip>
      </MomentProvider>,
    )
    const user = userEvent.setup()
    const chip = screen.getByRole('button')
    await user.pointer({ keys: '[MouseLeft>]', target: chip })
    expect(onMoment).not.toHaveBeenCalled()
    await user.pointer({ keys: '[/MouseLeft]', target: chip })
    expect(onMoment).toHaveBeenCalledTimes(1)
  })

  it('chip/menu-moment: a menu chip emits no moment; a change from Clear filters emits no moment of a chip', async () => {
    const onMoment = vi.fn<(e: MomentEvent) => void>()
    render(<Filters onMoment={onMoment} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Size: Medium' }))
    expect(screen.getByRole('button', { name: 'Size: Large' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(onMoment.mock.calls.filter(([e]) => e.source === 'chip')).toEqual([])
  })

  it('chip/no-direct-feedback: a press calls no vibration API', async () => {
    const vibrate = vi.fn()
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true })
    render(
      <div>
        <Chip>On sale</Chip>
        <Chip variant="menu">Size</Chip>
      </div>,
    )
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'On sale' }))
    await user.click(screen.getByRole('button', { name: 'Size' }))
    expect(vibrate).not.toHaveBeenCalled()
  })

  it('chip/gap: a set of chips is a named group with the gap of the geometry (measured in Chrome)', () => {
    render(
      <ChipGroup label="Filters">
        <Chip>On sale</Chip>
      </ChipGroup>,
    )
    const set = screen.getByRole('group', { name: 'Filters' })
    expect(set.className).toContain('gap-(--mono-chip-set-gap)')
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull()
  })

  it('chip/clear: Clear filters sets each filter chip off and each menu chip off with no value', async () => {
    render(<Filters />)
    expect(screen.getAllByRole('button', { pressed: true }).map((b) => b.textContent)).toEqual(['On sale', 'New', 'Size: Medium'])
    await userEvent.setup().click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(screen.queryAllByRole('button', { pressed: true })).toEqual([])
    expect(screen.getByRole('button', { name: 'Size', pressed: false })).toBeTruthy()
    expect(screen.getAllByRole('button', { pressed: false }).map((b) => b.textContent)).toEqual(['On sale', 'New', 'Size'])
  })

  it('chip/clear: after Clear filters, a filter chip with no pressed prop turns on again at a press', async () => {
    render(<Filters />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    await user.click(screen.getByRole('button', { name: 'New' }))
    expect(screen.getByRole('button', { name: 'New' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('chip/tv, chip/tv-keys, chip/xr: the TV and the XR headset are device classes that this package does not target (review)', () => {
    // The package has the axes pointer and touch (data-density). It has no TV class and no XR class at this time.
    expect(clause('chip/tv')?.classes).toEqual(['tv'])
    expect(clause('chip/tv-keys')?.classes).toEqual(['tv'])
    expect(clause('chip/xr')?.classes).toEqual(['xr'])
  })

  it('chip/menu-value: the app gives the separator of its language between the label and the value', () => {
    render(
      <Chip variant="menu" value="Moyenne" separator=" : ">
        Taille
      </Chip>,
    )
    expect(screen.getByRole('button').textContent).toContain('Taille : Moyenne')
  })
})
