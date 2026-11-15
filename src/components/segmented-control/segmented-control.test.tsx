// The tests of the Segmented control. Each name starts with the id of a clause of ir/contracts/segmented-control.json.
// The browser test (test/browser/segmented-control.browser.test.tsx) measures the clauses that jsdom cannot compute.
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { violations } from '@monorithm/react/test/axe'
import { contract as loadContract } from '@monorithm/react/test/contract'
import { MomentProvider } from '@monorithm/react/contexts/moment-context'
import { type MomentEvent } from '@monorithm/react/lib/moments'
import { SegmentedControl, type SegmentedControlProps, type Segments } from './segmented-control'

const contract = loadContract('segmented-control')
const level = (id: string) => contract.clauses.find((c: { id: string }) => c.id === id)?.level

const Square = () => (
  <svg viewBox="0 0 16 16">
    <title>Square</title>
    <path d="M3 3h10v10H3z" />
  </svg>
)

const periods: Segments = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d', disabled: true, disabledReason: 'Not possible in this view' },
  { value: '1y', label: '1y' },
]

const Period = (props: Partial<SegmentedControlProps>) => <SegmentedControl label="Period" segments={periods} {...props} />

const View = (props: Partial<SegmentedControlProps>) => (
  <SegmentedControl
    label="View"
    segments={[
      { value: 'grid', label: 'Grid', icon: <Square />, iconOnly: true },
      { value: 'list', label: 'List', icon: <Square />, iconOnly: true },
    ]}
    {...props}
  />
)

const radio = (name: string) => screen.getByRole('radio', { name })
const checked = () => screen.getAllByRole('radio').map((r) => r.getAttribute('aria-checked'))

describe('SegmentedControl', () => {
  it('the tests cover each clause of the contract', () => {
    const tested = new Set([
      'segmented-control/role', 'segmented-control/name', 'segmented-control/use', 'segmented-control/count',
      'segmented-control/keyboard', 'segmented-control/target', 'segmented-control/focus', 'segmented-control/selected-sign',
      'segmented-control/pill', 'segmented-control/radius', 'segmented-control/density', 'segmented-control/segment',
      'segmented-control/icon', 'segmented-control/full-width', 'segmented-control/hover', 'segmented-control/direction',
      'segmented-control/direction-keys', 'segmented-control/motion', 'segmented-control/motion-keyboard',
      'segmented-control/reduced-motion', 'segmented-control/content', 'segmented-control/moment',
      'segmented-control/no-direct-feedback', 'segmented-control/disabled', 'segmented-control/disabled-cause',
      'segmented-control/tv', 'segmented-control/watch', 'segmented-control/xr',
    ])
    expect(contract.clauses.map((c: { id: string }) => c.id).filter((id: string) => !tested.has(id))).toEqual([])
  })

  it('segmented-control/role and segmented-control/name: a radio group with its name, and a radio button for each segment', () => {
    render(<Period defaultValue="30d" />)
    expect(screen.getByRole('radiogroup', { name: 'Period' }).dataset.mono).toBe('segmented-control')
    // The name is the label one time: the copy in the strong weight is hidden from assistive technology.
    expect(['7d', '30d', '90d', '1y'].map((name) => radio(name).getAttribute('aria-checked'))).toEqual(['false', 'true', 'false', 'false'])
    expect(screen.getAllByRole('radio')).toHaveLength(4)
  })

  it('segmented-control/role: axe finds no violation in each size, with icons, a disabled segment, and a disabled group', async () => {
    const { container } = render(
      <div>
        <Period defaultValue="7d" />
        <Period label="Period, large" size="lg" />
        <Period label="Period, full width" block />
        <View />
        <SegmentedControl label="Layout" segments={[{ value: 'a', label: 'Grid', icon: <Square /> }, { value: 'b', label: 'List', icon: <Square /> }]} />
        <Period label="Period, disabled" disabled />
      </div>,
    )
    expect(await violations(container)).toEqual([])
  })

  it('segmented-control/use and segmented-control/disabled-cause: rules for the screen, not for one component (review)', () => {
    // A component cannot see the other controls of the screen or the text near it. The review of a screen examines them.
    expect(level('segmented-control/use')).toBe('SHOULD')
    expect(level('segmented-control/disabled-cause')).toBe('SHOULD')
  })

  it('segmented-control/content: the cross-fade of the view below is a rule for the screen (review)', () => {
    // The control does not own the view that it changes. The app gives the cross-fade of 150 ms to that view.
    expect(level('segmented-control/content')).toBe('SHOULD')
  })

  it('segmented-control/count: the type takes two to five segments; one segment is selected, by default the first', () => {
    const s = { value: 'a', label: 'A' }
    // @ts-expect-error: one segment is not a segmented control.
    const one: Segments = [s]
    // @ts-expect-error: six segments are too many.
    const six: Segments = [s, s, s, s, s, s]
    const five: Segments = [s, s, s, s, s]
    expect([one.length, five.length, six.length]).toEqual([1, 5, 6])
    render(<Period />)
    expect(checked()).toEqual(['true', 'false', 'false', 'false'])
  })

  it('segmented-control/count: with the first segment disabled, the first segment that is not disabled is selected', () => {
    render(
      <SegmentedControl
        label="Status"
        segments={[
          { value: 'all', label: 'All', disabled: true },
          { value: 'open', label: 'Open' },
        ]}
      />,
    )
    expect(checked()).toEqual(['false', 'true'])
  })

  it('segmented-control/count: the form sends the value of the one selected segment', async () => {
    render(
      <form data-testid="form">
        <Period name="period" defaultValue="7d" />
      </form>,
    )
    const form = screen.getByTestId('form') as HTMLFormElement
    expect(new FormData(form).getAll('period')).toEqual(['7d'])
    await userEvent.setup().click(radio('1y'))
    expect(new FormData(form).getAll('period')).toEqual(['1y'])
  })

  it('segmented-control/keyboard: Tab goes to the selected segment; the arrow keys move the focus and the selection', async () => {
    render(
      <div>
        <button type="button">Before</button>
        <Period defaultValue="30d" />
        <button type="button">After</button>
      </div>,
    )
    const user = userEvent.setup()
    await user.tab()
    await user.tab()
    expect(document.activeElement).toBe(radio('30d'))
    await user.keyboard('{ArrowRight}')
    // segmented-control/disabled: the arrow key skips the disabled segment.
    expect(document.activeElement).toBe(radio('1y'))
    expect(radio('1y').getAttribute('aria-checked')).toBe('true')
    await user.keyboard('{ArrowLeft}')
    expect(document.activeElement).toBe(radio('30d'))
    expect(radio('30d').getAttribute('aria-checked')).toBe('true')
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'After' }))
    await user.tab({ shift: true })
    expect(document.activeElement).toBe(radio('30d'))
  })

  it('segmented-control/direction-keys: in right-to-left, the left arrow key selects the segment at the left', async () => {
    render(
      <div dir="rtl">
        <Period defaultValue="7d" />
      </div>,
    )
    const user = userEvent.setup()
    await user.tab()
    expect(document.activeElement).toBe(radio('7d'))
    // In right-to-left, the first segment is at the right: the segment at its left is the second segment.
    await user.keyboard('{ArrowLeft}')
    expect(radio('30d').getAttribute('aria-checked')).toBe('true')
    await user.keyboard('{ArrowRight}')
    expect(radio('7d').getAttribute('aria-checked')).toBe('true')
  })

  it('segmented-control/tv: left and right on the remote move the selection; lg takes the large size of the density', async () => {
    render(<Period size="lg" defaultValue="7d" />)
    expect(screen.getByRole('radiogroup').className).toContain('h-(--mono-size-control-lg)')
    const user = userEvent.setup()
    await user.tab()
    await user.keyboard('{ArrowRight}')
    expect(radio('30d').getAttribute('aria-checked')).toBe('true')
    expect(document.activeElement).toBe(radio('30d'))
  })

  it('segmented-control/target: a press on a segment selects it; the segment takes the minimum target (measured in Chrome)', async () => {
    render(<Period defaultValue="7d" />)
    await userEvent.setup().click(screen.getByText('1y', { selector: 'span:not([aria-hidden])' }))
    expect(radio('1y').getAttribute('aria-checked')).toBe('true')
    expect(radio('1y').className).toContain('min-w-(--mono-size-target-min)')
  })

  it('segmented-control/focus: the focus ring is for keyboard focus only (measured in Chrome)', () => {
    render(<Period />)
    expect(radio('7d').className).toContain('focus-visible:outline-solid')
    expect(radio('7d').className).toContain('focus-visible:outline-offset-(--mono-focus-ring-offset)')
  })

  it('segmented-control/selected-sign and segmented-control/pill: one pill, not a fill on each segment (measured in Chrome)', async () => {
    const { container } = render(<Period defaultValue="7d" />)
    const group = screen.getByRole('radiogroup')
    expect(container.querySelectorAll('[data-part="pill"]')).toHaveLength(1)
    expect(container.querySelector('[data-part="pill"]')?.getAttribute('aria-hidden')).toBe('true')
    expect([group.style.getPropertyValue('--seg-count'), group.style.getPropertyValue('--seg-index')]).toEqual(['4', '0'])
    await userEvent.setup().click(radio('1y'))
    expect(group.style.getPropertyValue('--seg-index')).toBe('3')
    expect(radio('1y').className).toContain('data-[checked]:font-mono-strong')
  })

  it('segmented-control/pill: with a value that is not a segment, the control shows no pill', () => {
    const { container } = render(<Period value="none" />)
    expect(container.querySelector('[data-part="pill"]')).toBeNull()
  })

  it('segmented-control/radius and segmented-control/density: the sizes come from the geometry and the density (measured in Chrome)', () => {
    render(<Period />)
    const group = screen.getByRole('radiogroup')
    expect(group.className).toContain('rounded-(--mono-segmented-control-track-radius)')
    expect(group.className).toContain('h-(--mono-size-control-md)')
    expect(group.className).toContain('text-mono-body')
  })

  it('segmented-control/segment: the icon comes before the label, at the start side', () => {
    render(<SegmentedControl label="Layout" segments={[{ value: 'a', label: 'Grid', icon: <Square /> }, { value: 'b', label: 'List' }]} />)
    const parts = [...radio('Grid').children].map((c) => c.getAttribute('data-part'))
    expect(parts).toEqual(['icon', 'label'])
    expect(radio('Grid').className).toContain('px-(--mono-segmented-control-segment-padding-inline)')
  })

  it('segmented-control/icon: an icon segment has the name of the option; assistive technology does not read the icon', () => {
    render(<View defaultValue="list" />)
    expect(radio('Grid').getAttribute('aria-checked')).toBe('false')
    expect(radio('List').getAttribute('aria-checked')).toBe('true')
    expect(radio('Grid').querySelector('[data-part="icon"]')?.getAttribute('aria-hidden')).toBe('true')
    expect(radio('Grid').querySelector('[data-part="label"]')).toBeNull()
    expect(screen.queryByRole('radio', { name: /Square/ })).toBeNull()
  })

  it('segmented-control/full-width: a block control has the full width (measured in Chrome)', () => {
    render(<Period block />)
    expect(screen.getByRole('radiogroup').className).toContain('grid w-full')
    expect(screen.getByRole('radiogroup').className).toContain('auto-cols-fr')
  })

  it('segmented-control/hover: the hover class is only for a device with hover (measured in Chrome)', () => {
    render(<Period />)
    expect(radio('30d').className).toContain('not-data-[checked]:not-data-[disabled]:hover:text-mono-fg')
  })

  it('segmented-control/direction: the pill moves to the end side, to the left in right-to-left (measured in Chrome)', () => {
    const { container } = render(<Period />)
    expect(container.querySelector('[data-part="pill"]')?.className).toContain('rtl:-translate-x-')
  })

  it('segmented-control/motion and segmented-control/motion-keyboard: a key selects spring-quick, a pointer spring-control', async () => {
    const { container } = render(<Period defaultValue="7d" />)
    const group = screen.getByRole('radiogroup')
    const user = userEvent.setup()
    expect(group.dataset.input).toBe('pointer')
    await user.tab()
    await user.keyboard('{ArrowRight}')
    expect(group.dataset.input).toBe('keyboard')
    await user.click(radio('7d'))
    expect(group.dataset.input).toBe('pointer')
    expect(group.className).toContain('data-[input=keyboard]:[--seg-ease:var(--mono-spring-quick)]')
    const pill = container.querySelector('[data-part="pill"]')?.className ?? ''
    expect(pill).toContain('ease-(--seg-ease)')
    expect(pill).toContain('not-supports-[transition-timing-function:linear(0,1)]:ease-(--mono-easing-out)')
  })

  it('segmented-control/reduced-motion: the pill has no transition; the label color keeps its transition (measured in Chrome)', () => {
    const { container } = render(<Period />)
    expect(container.querySelector('[data-part="pill"]')?.className).toContain('motion-reduce:transition-none')
    expect(radio('7d').className).not.toContain('motion-reduce:')
  })

  it('segmented-control/moment: a change emits select one time; the selected segment and a disabled segment emit no moment', async () => {
    const onMoment = vi.fn<(e: MomentEvent) => void>()
    render(
      <MomentProvider onMoment={onMoment}>
        <Period defaultValue="7d" />
      </MomentProvider>,
    )
    const user = userEvent.setup()
    await user.click(radio('30d'))
    expect(onMoment.mock.calls).toEqual([[{ moment: 'select', variant: undefined, source: 'segmented-control' }]])
    await user.click(radio('30d'))
    await user.click(radio('90d'))
    expect(onMoment).toHaveBeenCalledTimes(1)
    await user.keyboard('{ArrowRight}')
    expect(onMoment).toHaveBeenCalledTimes(2)
  })

  it('segmented-control/moment: in a controlled control, the moment and the callback come at the change', async () => {
    const onMoment = vi.fn<(e: MomentEvent) => void>()
    const onValueChange = vi.fn()
    render(
      <MomentProvider onMoment={onMoment}>
        <Period value="7d" onValueChange={onValueChange} />
      </MomentProvider>,
    )
    await userEvent.setup().click(radio('30d'))
    expect(onValueChange).toHaveBeenCalledWith('30d')
    expect(onMoment).toHaveBeenCalledTimes(1)
    // The app did not change the value: the selection stays.
    expect(radio('7d').getAttribute('aria-checked')).toBe('true')
  })

  it('segmented-control/no-direct-feedback: a change calls no vibration API', async () => {
    const vibrate = vi.fn()
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true })
    render(<Period />)
    await userEvent.setup().click(radio('30d'))
    expect(vibrate).not.toHaveBeenCalled()
  })

  it('segmented-control/disabled: the user cannot select a disabled segment, and its description tells why', async () => {
    const onValueChange = vi.fn()
    render(<Period defaultValue="7d" onValueChange={onValueChange} />)
    const segment = screen.getByRole('radio', { name: '90d', description: 'Not possible in this view' })
    expect(segment.getAttribute('aria-disabled')).toBe('true')
    expect(segment.className).toContain('data-[disabled]:opacity-(--mono-opacity-disabled)')
    await userEvent.setup().click(segment)
    expect(segment.getAttribute('aria-checked')).toBe('false')
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('segmented-control/disabled: in a disabled group, the user cannot select a segment', async () => {
    const onValueChange = vi.fn()
    render(<Period disabled onValueChange={onValueChange} />)
    expect(screen.getAllByRole('radio').every((r) => r.getAttribute('aria-disabled') === 'true')).toBe(true)
    await userEvent.setup().click(radio('30d'))
    expect(checked()).toEqual(['true', 'false', 'false', 'false'])
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('segmented-control/watch and segmented-control/xr: rules for the platform of the class, not for the web (review)', () => {
    // A web page cannot know the class of the device. On a watch, the app shows a Radio group (a list of choices) in place
    // of the control. In an XR headset, the system gives the hit region, the hover effect, and the pinch.
    expect(level('segmented-control/watch')).toBe('MUST')
    expect(level('segmented-control/xr')).toBe('MUST')
  })
})
