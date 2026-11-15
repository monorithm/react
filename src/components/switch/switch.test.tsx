// The tests of the Switch. Each name starts with the id of a clause of ir/contracts/switch.json.
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { violations } from '@monorithm/react/test/axe'
import { contract as loadContract } from '@monorithm/react/test/contract'
import { MomentProvider } from '@monorithm/react/contexts/moment-context'
import { type MomentEvent } from '@monorithm/react/lib/moments'
import { Switch } from './switch'

const contract = loadContract('switch')

describe('Switch', () => {
  it('the tests cover each clause of the contract', () => {
    const tested = new Set(
      [
        'switch/role', 'switch/name', 'switch/immediate', 'switch/keyboard', 'switch/target', 'switch/focus', 'switch/on-sign',
        'switch/direction', 'switch/motion', 'switch/moment', 'switch/no-direct-feedback', 'switch/disabled', 'switch/density',
      ],
    )
    expect(contract.clauses.map((c: { id: string }) => c.id).filter((id: string) => !tested.has(id))).toEqual([])
  })

  it('switch/role: the accessibility tree shows a switch with the label as its name and its state', () => {
    render(<Switch label="Alerts" />)
    const sw = screen.getByRole('switch', { name: 'Alerts' })
    expect(sw.getAttribute('aria-checked')).toBe('false')
  })

  it('switch/role: axe finds no violation, off and on, enabled and disabled', async () => {
    const { container } = render(
      <div>
        <Switch label="Alerts" />
        <Switch label="Sounds" defaultChecked />
        <Switch label="Courier delivery" disabled disabledReason="Not available in your area at this time" />
      </div>,
    )
    expect(await violations(container)).toEqual([])
  })

  it('switch/name: the label prop is the name; the component takes no other name', () => {
    render(<Switch label="Order notifications" description="Get a message for each new order" />)
    const sw = screen.getByRole('switch', { name: 'Order notifications' })
    expect(sw.getAttribute('aria-describedby')).toBeTruthy()
    expect(document.getElementById(sw.getAttribute('aria-describedby') as string)?.textContent).toBe('Get a message for each new order')
  })

  it('switch/immediate: the change calls onCheckedChange at once with the new state', async () => {
    const onChange = vi.fn()
    render(<Switch label="Alerts" onCheckedChange={onChange} />)
    await userEvent.click(screen.getByRole('switch', { name: 'Alerts' }))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('switch/keyboard: Space changes the state, and Tab reaches the switch', async () => {
    const user = userEvent.setup()
    render(<Switch label="Alerts" />)
    await user.tab()
    const sw = screen.getByRole('switch', { name: 'Alerts' })
    expect(document.activeElement).toBe(sw)
    await user.keyboard(' ')
    expect(sw.getAttribute('aria-checked')).toBe('true')
  })

  it('switch/target: a click on the label of the row changes the state', async () => {
    render(<Switch label="Alerts" description="For each new order" />)
    await userEvent.click(screen.getByText('Alerts'))
    expect(screen.getByRole('switch', { name: 'Alerts' }).getAttribute('aria-checked')).toBe('true')
    await userEvent.click(screen.getByText('For each new order'))
    expect(screen.getByRole('switch', { name: 'Alerts' }).getAttribute('aria-checked')).toBe('false')
  })

  it('switch/target: the row has the minimum target of the density', () => {
    const { container } = render(<Switch label="Alerts" />)
    expect((container.firstElementChild as HTMLElement).className).toContain('min-h-(--mono-size-target-min)')
  })

  it('switch/focus: the track shows the focus ring of the language', () => {
    render(<Switch label="Alerts" />)
    const cls = screen.getByRole('switch').className
    expect(cls).toContain('focus-visible:outline-(length:--mono-focus-ring-width)')
    expect(cls).toContain('focus-visible:outline-mono-ring')
    expect(cls).toContain('focus-visible:outline-offset-(--mono-focus-ring-offset)')
  })

  it('switch/on-sign: on has the accent fill and moves the knob; the state is not only a color', async () => {
    render(<Switch label="Alerts" />)
    const sw = screen.getByRole('switch', { name: 'Alerts' })
    await userEvent.click(sw)
    expect(sw.hasAttribute('data-checked')).toBe(true)
    expect(sw.className).toContain('data-[checked]:bg-mono-accent')
    const knob = sw.firstElementChild as HTMLElement
    expect(knob.hasAttribute('data-checked')).toBe(true)
    expect(knob.className).toContain('data-[checked]:translate-x-(--mono-switch-knob-travel)')
  })

  it('switch/direction: in right-to-left, on moves the knob to the left', () => {
    render(<Switch label="Alerts" />)
    const knob = screen.getByRole('switch').firstElementChild as HTMLElement
    expect(knob.className).toContain('rtl:data-[checked]:-translate-x-(--mono-switch-knob-travel)')
    expect(knob.className).toContain('start-(--mono-switch-knob-inset)')
  })

  it('switch/motion: the knob uses spring-control, and reduced motion removes the movement', () => {
    render(<Switch label="Alerts" />)
    const knob = screen.getByRole('switch').firstElementChild as HTMLElement
    expect(knob.className).toContain('ease-(--mono-spring-control)')
    expect(knob.className).toContain('duration-(--mono-spring-control-duration)')
    expect(knob.className).toContain('motion-reduce:transition-none')
    expect(knob.className).toContain('[[data-motion=reduced]_&]:transition-none')
  })

  it('switch/moment: a change emits toggle with on or off, once, at the change of the state', async () => {
    const events: MomentEvent[] = []
    render(
      <MomentProvider onMoment={(e) => events.push(e)}>
        <Switch label="Alerts" />
      </MomentProvider>,
    )
    const sw = screen.getByRole('switch', { name: 'Alerts' })
    await userEvent.click(sw)
    expect(events).toEqual([{ moment: 'toggle', variant: 'on', source: 'switch' }])
    await userEvent.click(sw)
    expect(events.at(-1)).toEqual({ moment: 'toggle', variant: 'off', source: 'switch' })
    expect(events).toHaveLength(2)
  })

  it('switch/no-direct-feedback: a change starts no vibration and no audio', async () => {
    const vibrate = vi.fn()
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true })
    const AudioCtx = vi.fn()
    vi.stubGlobal('AudioContext', AudioCtx)
    render(<Switch label="Alerts" />)
    await userEvent.click(screen.getByRole('switch', { name: 'Alerts' }))
    expect(vibrate).not.toHaveBeenCalled()
    expect(AudioCtx).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('switch/disabled: a disabled switch does not change, has the disabled opacity, and tells why', async () => {
    const onChange = vi.fn()
    render(<Switch label="Courier delivery" disabled disabledReason="Not available in your area at this time" description="Pay the rider" onCheckedChange={onChange} />)
    const sw = screen.getByRole('switch', { name: 'Courier delivery' })
    await userEvent.click(sw)
    expect(onChange).not.toHaveBeenCalled()
    expect(sw.getAttribute('aria-checked')).toBe('false')
    expect(sw.className).toContain('data-[disabled]:opacity-(--mono-opacity-disabled)')
    expect(screen.getByText('Not available in your area at this time')).toBeTruthy()
    expect(screen.queryByText('Pay the rider')).toBeNull()
  })

  it('switch/density: the sizes come from the geometry of the contract on the control unit', () => {
    const { container } = render(<Switch label="Alerts" />)
    const rowEl = container.firstElementChild as HTMLElement
    expect(rowEl.getAttribute('data-mono')).toBe('switch')
    const sw = screen.getByRole('switch')
    expect(sw.className).toContain('w-(--mono-switch-track-width)')
    expect(sw.className).toContain('h-(--mono-switch-track-height)')
    expect((sw.firstElementChild as HTMLElement).className).toContain('size-(--mono-switch-knob-size)')
    expect(contract.geometry['track.width']).toEqual({ value: 2.25, of: 'size.control-unit' })
  })
})
