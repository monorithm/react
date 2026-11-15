// The tests of the Radio group. Each name starts with the id of a clause of ir/contracts/radio-group.json. The browser
// test (test/browser/choices.browser.test.tsx) measures the clauses that jsdom cannot compute.
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { violations } from '@monorithm/react/test/axe'
import { type MomentEvent, MomentProvider } from '@monorithm/react/moments/moments'
import { RadioGroup } from '@monorithm/react/radio-group/radio-group'
import { Radio } from '@monorithm/react/radio-group/radio-group.radio'

const contract = (await import('@monorithm/react/ir/contracts/radio-group.json', { with: { type: 'json' } })).default

const Delivery = (props: Partial<Parameters<typeof RadioGroup>[0]>) => (
  <RadioGroup label="Delivery method" name="delivery" {...props}>
    <Radio value="pickup" label="Pickup" description="At the shop" detail="Free" />
    <Radio value="standard" label="Standard" description="In 3 days" detail="GH₵ 25.00" />
    <Radio value="courier" label="Courier" description="Today" disabled disabledReason="Not available in your area at this time" />
    <Radio value="express" label="Express" description="Tomorrow" detail="GH₵ 40.00" />
  </RadioGroup>
)

describe('RadioGroup', () => {
  it('the tests cover each clause of the contract', () => {
    const tested = new Set([
      'radio-group/role', 'radio-group/name', 'radio-group/use', 'radio-group/keyboard', 'radio-group/target',
      'radio-group/focus', 'radio-group/selected-sign', 'radio-group/density', 'radio-group/direction', 'radio-group/motion',
      'radio-group/moment', 'radio-group/no-direct-feedback', 'radio-group/disabled', 'radio-group/form',
    ])
    expect(contract.clauses.map((c: { id: string }) => c.id).filter((id: string) => !tested.has(id))).toEqual([])
  })

  it('radio-group/role and radio-group/name: a radio group with its name, and a radio button for each option', () => {
    render(<Delivery defaultValue="standard" />)
    expect(screen.getByRole('radiogroup', { name: 'Delivery method' })).toBeTruthy()
    expect(screen.getAllByRole('radio').map((r) => r.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false', 'false'])
    expect(screen.getByRole('radio', { name: 'Standard' })).toBeTruthy()
  })

  it('radio-group/role: axe finds no violation in the two variants', async () => {
    const { container } = render(
      <div>
        <Delivery defaultValue="pickup" />
        <Delivery variant="cards" defaultValue="standard" name="delivery-2" label="Delivery method, cards" />
      </div>,
    )
    expect(await violations(container)).toEqual([])
  })

  it('radio-group/use: the choice of the control is a rule for the screen (review)', () => {
    expect(contract.clauses.find((c: { id: string }) => c.id === 'radio-group/use')?.level).toBe('SHOULD')
  })

  it('radio-group/keyboard: Tab goes to the selected option; the arrow keys move the focus and the selection', async () => {
    render(
      <div>
        <button type="button">Before</button>
        <Delivery defaultValue="standard" />
        <button type="button">After</button>
      </div>,
    )
    const user = userEvent.setup()
    await user.tab()
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Standard' }))
    await user.keyboard('{ArrowDown}')
    // radio-group/disabled: the arrow key skips the disabled option.
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Express' }))
    expect(screen.getByRole('radio', { name: 'Express' }).getAttribute('aria-checked')).toBe('true')
    await user.keyboard('{ArrowUp}')
    expect(screen.getByRole('radio', { name: 'Standard' }).getAttribute('aria-checked')).toBe('true')
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'After' }))
  })

  it('radio-group/target: a press on the label, the description, or the detail selects the option', async () => {
    render(<Delivery variant="cards" />)
    const user = userEvent.setup()
    await user.click(screen.getByText('Pickup'))
    expect(screen.getByRole('radio', { name: 'Pickup' }).getAttribute('aria-checked')).toBe('true')
    await user.click(screen.getByText('In 3 days'))
    expect(screen.getByRole('radio', { name: 'Standard' }).getAttribute('aria-checked')).toBe('true')
    await user.click(screen.getByText('GH₵ 40.00'))
    expect(screen.getByRole('radio', { name: 'Express' }).getAttribute('aria-checked')).toBe('true')
  })

  it('radio-group/focus: a row has the ring on the ring of the option; a card has it on the card (measured in Chrome)', () => {
    render(
      <div>
        <Delivery />
        <Delivery variant="cards" label="Cards" />
      </div>,
    )
    const [row, , , , card] = screen.getAllByRole('radio')
    expect(row?.className).toContain('focus-visible:outline-solid')
    expect(card?.closest('label')?.className).toContain('has-[[role=radio]:focus-visible]:outline-solid')
  })

  it('radio-group/selected-sign: the selected option has the dot (colors measured in Chrome)', () => {
    render(<Delivery defaultValue="pickup" />)
    expect(screen.getByRole('radio', { name: 'Pickup' }).querySelector('[data-part="dot"]')?.hasAttribute('data-checked')).toBe(true)
  })

  it('radio-group/density and radio-group/direction: the ring takes its size from the geometry (measured in Chrome)', () => {
    render(<Delivery />)
    expect(screen.getAllByRole('radio')[0]?.className).toContain('size-(--mono-radio-group-ring-size)')
  })

  it('radio-group/motion: a key selects spring-quick for the dot, and a pointer selects spring-control', async () => {
    render(<Delivery defaultValue="pickup" />)
    const group = screen.getByRole('radiogroup')
    const user = userEvent.setup()
    expect(group.dataset.input).toBe('pointer')
    await user.tab()
    await user.keyboard('{ArrowDown}')
    expect(group.dataset.input).toBe('keyboard')
    await user.click(screen.getByText('Pickup'))
    expect(group.dataset.input).toBe('pointer')
    const dot = screen.getByRole('radio', { name: 'Pickup' }).querySelector('[data-part="dot"]')?.className ?? ''
    expect(dot).toContain('[[data-input=keyboard]_&]:ease-(--mono-spring-quick)')
    expect(dot).toContain('motion-reduce:transition-none')
  })

  it('radio-group/moment: a change of the selection emits select one time', async () => {
    const onMoment = vi.fn<(e: MomentEvent) => void>()
    render(
      <MomentProvider onMoment={onMoment}>
        <Delivery defaultValue="pickup" />
      </MomentProvider>,
    )
    await userEvent.setup().click(screen.getByText('Standard'))
    expect(onMoment.mock.calls).toEqual([[{ moment: 'select', variant: undefined, source: 'radio-group' }]])
  })

  it('radio-group/no-direct-feedback: a change calls no vibration API', async () => {
    const vibrate = vi.fn()
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true })
    render(<Delivery />)
    await userEvent.setup().click(screen.getByText('Standard'))
    expect(vibrate).not.toHaveBeenCalled()
  })

  it('radio-group/disabled: the user cannot select a disabled option, and its description tells why', async () => {
    const onValueChange = vi.fn()
    render(<Delivery defaultValue="pickup" onValueChange={onValueChange} />)
    const courier = screen.getByRole('radio', { name: 'Courier', description: 'Not available in your area at this time' })
    expect(courier.getAttribute('aria-disabled')).toBe('true')
    await userEvent.setup().click(screen.getByText('Courier'))
    expect(courier.getAttribute('aria-checked')).toBe('false')
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('radio-group/form: the form sends the value of the selected option with the name of the group', async () => {
    render(
      <form data-testid="form">
        <Delivery defaultValue="pickup" />
      </form>,
    )
    const form = screen.getByTestId('form') as HTMLFormElement
    expect(new FormData(form).get('delivery')).toBe('pickup')
    await userEvent.setup().click(screen.getByText('Express'))
    expect(new FormData(form).get('delivery')).toBe('express')
  })
})
