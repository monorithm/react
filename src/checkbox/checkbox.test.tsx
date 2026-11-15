// The tests of the Checkbox. Each name starts with the id of a clause of ir/contracts/checkbox.json. The browser test
// (test/browser/choices.browser.test.tsx) measures the clauses that jsdom cannot compute.
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { violations } from '@monorithm/react/test/axe'
import { type MomentEvent, MomentProvider } from '@monorithm/react/moments/moments'
import { Checkbox } from '@monorithm/react/checkbox/checkbox'

const contract = (await import('@monorithm/react/ir/contracts/checkbox.json', { with: { type: 'json' } })).default

/** A parent checkbox with three options: the parent is mixed when some options are on. */
function Parent() {
  const [on, setOn] = useState([true, true, false])
  const count = on.filter(Boolean).length
  return (
    <div>
      <Checkbox
        label="All products"
        description={`${count} of 3 selected`}
        checked={count === 3}
        mixed={count > 0 && count < 3}
        onCheckedChange={(next) => setOn([next, next, next])}
      />
      {['Shoes', 'Bags', 'Hats'].map((n, i) => (
        <Checkbox key={n} label={n} checked={on[i]} onCheckedChange={(next) => setOn(on.map((v, j) => (j === i ? next : v)))} />
      ))}
    </div>
  )
}

describe('Checkbox', () => {
  it('the tests cover each clause of the contract', () => {
    const tested = new Set([
      'checkbox/role', 'checkbox/use', 'checkbox/keyboard', 'checkbox/target', 'checkbox/focus', 'checkbox/on-sign',
      'checkbox/mixed', 'checkbox/density', 'checkbox/direction', 'checkbox/motion', 'checkbox/moment',
      'checkbox/no-direct-feedback', 'checkbox/disabled', 'checkbox/form',
    ])
    expect(contract.clauses.map((c: { id: string }) => c.id).filter((id: string) => !tested.has(id))).toEqual([])
  })

  it('checkbox/role: the accessibility tree shows a checkbox with the label as its name and its state', () => {
    render(
      <div>
        <Checkbox label="Shoes" />
        <Checkbox label="Bags" defaultChecked />
        <Checkbox label="All products" mixed />
      </div>,
    )
    expect(screen.getByRole('checkbox', { name: 'Shoes' }).getAttribute('aria-checked')).toBe('false')
    expect(screen.getByRole('checkbox', { name: 'Bags' }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByRole('checkbox', { name: 'All products' }).getAttribute('aria-checked')).toBe('mixed')
  })

  it('checkbox/role: axe finds no violation, off, on, mixed, and disabled', async () => {
    const { container } = render(
      <div>
        <Checkbox label="Shoes" />
        <Checkbox label="Bags" defaultChecked />
        <Checkbox label="All products" mixed description="2 of 3 selected" />
        <Checkbox label="Archived products" disabled disabledReason="Not possible in this view" />
      </div>,
    )
    expect(await violations(container)).toEqual([])
  })

  it('checkbox/use: the choice of the control is a rule for the screen (review)', () => {
    expect(contract.clauses.find((c: { id: string }) => c.id === 'checkbox/use')?.level).toBe('SHOULD')
  })

  it('checkbox/keyboard: Tab focuses the checkbox; Space changes the state', async () => {
    render(<Checkbox label="Shoes" />)
    const user = userEvent.setup()
    await user.tab()
    const cb = screen.getByRole('checkbox')
    expect(document.activeElement).toBe(cb)
    await user.keyboard(' ')
    expect(cb.getAttribute('aria-checked')).toBe('true')
  })

  it('checkbox/target: a press on the label or the description changes the state', async () => {
    render(<Checkbox label="Shoes" description="Sneakers and boots" />)
    const user = userEvent.setup()
    await user.click(screen.getByText('Shoes'))
    expect(screen.getByRole('checkbox').getAttribute('aria-checked')).toBe('true')
    await user.click(screen.getByText('Sneakers and boots'))
    expect(screen.getByRole('checkbox').getAttribute('aria-checked')).toBe('false')
  })

  it('checkbox/focus: the focus ring is on the box, for keyboard focus only (measured in Chrome)', () => {
    render(<Checkbox label="Shoes" />)
    expect(screen.getByRole('checkbox').className).toContain('focus-visible:outline-solid')
  })

  it('checkbox/on-sign: on shows a check mark; the mark is in the DOM in each state (measured in Chrome)', () => {
    render(<Checkbox label="Bags" defaultChecked />)
    const mark = screen.getByRole('checkbox').querySelector('[data-part="mark"] path')
    expect(mark?.getAttribute('d')).toBe('M4 8.5 6.75 11 12 5.25')
  })

  it('checkbox/mixed: a mixed parent shows a dash and the count; a press turns it and its options on', async () => {
    render(<Parent />)
    const parent = screen.getByRole('checkbox', { name: 'All products' })
    expect(parent.getAttribute('aria-checked')).toBe('mixed')
    expect(parent.querySelector('[data-part="mark"] path')?.getAttribute('d')).toBe('M4.5 8h7')
    expect(screen.getByRole('checkbox', { description: '2 of 3 selected' })).toBe(parent)
    await userEvent.setup().click(parent)
    expect(parent.getAttribute('aria-checked')).toBe('true')
    expect(screen.getByRole('checkbox', { name: 'Hats' }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByText('3 of 3 selected')).toBeTruthy()
  })

  it('checkbox/density, checkbox/direction: the box takes its size from the geometry (measured in Chrome)', () => {
    render(<Checkbox label="Shoes" />)
    expect(screen.getByRole('checkbox').className).toContain('size-(--mono-checkbox-box-size)')
  })

  it('checkbox/motion: the mark grows with spring-control, and has no transition with reduced motion', () => {
    render(<Checkbox label="Shoes" />)
    const c = screen.getByRole('checkbox').querySelector('[data-part="mark"]')?.className ?? ''
    expect(c).toContain('ease-(--mono-spring-control)')
    expect(c).toContain('motion-reduce:transition-none')
  })

  it('checkbox/moment: a change emits toggle with on or off, at the change of the state', async () => {
    const onMoment = vi.fn<(e: MomentEvent) => void>()
    render(
      <MomentProvider onMoment={onMoment}>
        <Checkbox label="Shoes" />
      </MomentProvider>,
    )
    const user = userEvent.setup()
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('checkbox'))
    expect(onMoment.mock.calls.map(([e]) => [e.moment, e.variant, e.source])).toEqual([
      ['toggle', 'on', 'checkbox'],
      ['toggle', 'off', 'checkbox'],
    ])
  })

  it('checkbox/no-direct-feedback: a change calls no vibration API', async () => {
    const vibrate = vi.fn()
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true })
    render(<Checkbox label="Shoes" />)
    await userEvent.setup().click(screen.getByRole('checkbox'))
    expect(vibrate).not.toHaveBeenCalled()
  })

  it('checkbox/disabled: a disabled checkbox does not change, and its description tells why', async () => {
    const onChange = vi.fn()
    render(<Checkbox label="Archived products" description="Old items" disabled disabledReason="Not possible in this view" onCheckedChange={onChange} />)
    const cb = screen.getByRole('checkbox', { name: 'Archived products', description: 'Not possible in this view' })
    expect(cb.getAttribute('aria-disabled')).toBe('true')
    await userEvent.setup().click(screen.getByText('Archived products'))
    expect(cb.getAttribute('aria-checked')).toBe('false')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('checkbox/form: when the checkbox is on, the form sends its value with its name', async () => {
    render(
      <form data-testid="form">
        <Checkbox label="Shoes" name="category" value="shoes" />
        <Checkbox label="Bags" name="category" value="bags" defaultChecked />
      </form>,
    )
    const form = screen.getByTestId('form') as HTMLFormElement
    expect(new FormData(form).getAll('category')).toEqual(['bags'])
    await userEvent.setup().click(screen.getByRole('checkbox', { name: 'Shoes' }))
    expect(new FormData(form).getAll('category')).toEqual(['shoes', 'bags'])
  })
})
