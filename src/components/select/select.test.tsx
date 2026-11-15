// The tests of the Select. Each name starts with the id of a clause of ir/contracts/select.json. The browser test
// (test/browser/select.browser.test.tsx) measures the clauses of the trigger that jsdom cannot compute. Base UI renders
// no list in static markup, thus these tests examine the list.
import fs from 'node:fs'
import path from 'node:path'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { violations } from '@monorithm/react/test/axe'
import { contract as loadContract } from '@monorithm/react/test/contract'
import { MomentProvider } from '@monorithm/react/contexts/moment-context'
import { type MomentEvent } from '@monorithm/react/lib/moments'
import { Select, type SelectProps } from './select'
import { PHONE_MEDIA } from './select.native'
import type { SelectOption } from './select.option'

const contract = loadContract('select')
const clause = (id: string) => contract.clauses.find((c) => c.id === id) as (typeof contract.clauses)[number] & { classes?: string[] }

const categories: SelectOption[] = [
  { value: 'clothes', label: 'Clothes' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'food', label: 'Food and drink', description: 'Not available in your area at this time', disabled: true },
  { value: 'home', label: 'Home' },
  { value: 'toys', label: 'Toys' },
]

const Category = (props: Partial<SelectProps>) => (
  <Select label="Category" options={categories} placeholder="Choose a category" name="category" {...props} />
)

const trigger = (name = 'Category') => screen.getByRole('combobox', { name })
const part = (el: Element, name: string) => el.querySelector(`[data-part="${name}"]`)
/** The name of the active option, or null. */
const active = () => document.querySelector('[role="option"][data-highlighted] [data-part="name"]')?.textContent ?? null
const isOpen = (name = 'Category') => trigger(name).getAttribute('aria-expanded') === 'true'

type User = ReturnType<typeof userEvent.setup>
/** Presses one key. Then waits for the active option (null: the list is closed). Base UI applies a key after a tick. */
async function press(user: User, key: string, expected: string | null, name = 'Category') {
  await user.keyboard(key)
  await waitFor(() => {
    if (expected === null) return expect(isOpen(name)).toBe(false)
    expect(active()).toBe(expected)
    // Base UI moves the focus to the active option after the highlight. The next key goes to the focused element.
    expect(document.activeElement?.querySelector('[data-part="name"]')?.textContent).toBe(expected)
  })
}
/** Waits 50 ms: a key or a press that does nothing has no state to wait for. */
const tick = () => act(() => new Promise((resolve) => setTimeout(resolve, 50)))
/** Presses the trigger, then waits for the open list. */
async function openList(user: User, name = 'Category') {
  await user.click(trigger(name))
  await waitFor(() => expect(isOpen(name)).toBe(true))
}

beforeAll(() => {
  // The geometry of the contracts: the list reads its gap from --mono-select-list-gap.
  const style = document.createElement('style')
  style.textContent = fs.readFileSync(path.join(import.meta.dirname, '../../tokens/components.css'), 'utf8')
  document.head.append(style)
  // jsdom has no scrollIntoView. Base UI calls it to show the active option.
  HTMLElement.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Select', () => {
  it('the tests cover each clause of the contract', () => {
    const tested = new Set([
      'select/role', 'select/name', 'select/use', 'select/no-filter', 'select/trigger', 'select/size', 'select/density',
      'select/target', 'select/help', 'select/keyboard', 'select/list-keys', 'select/escape', 'select/typeahead',
      'select/active-option', 'select/focus', 'select/hover', 'select/pointer', 'select/selected-sign', 'select/list',
      'select/max-height', 'select/system-picker', 'select/direction', 'select/motion', 'select/motion-reduced',
      'select/moment', 'select/no-direct-feedback', 'select/disabled', 'select/disabled-option', 'select/error',
      'select/error-motion', 'select/error-time', 'select/form', 'select/surfaces', 'select/tv', 'select/car',
      'select/watch', 'select/xr',
    ])
    expect(contract.clauses.map((c) => c.id).filter((id) => !tested.has(id))).toEqual([])
  })

  it('select/role: a combobox with the label as its name and the selected option as its value; a listbox of options', async () => {
    render(<Category defaultValue="home" />)
    const t = trigger()
    expect(t.textContent).toBe('Home')
    expect(t.getAttribute('aria-haspopup')).toBe('listbox')
    expect(t.getAttribute('aria-expanded')).toBe('false')
    await openList(userEvent.setup())
    const list = screen.getByRole('listbox')
    expect(t.getAttribute('aria-controls')).toBe(list.id)
    const options = within(list).getAllByRole('option')
    expect(options.map((o) => o.getAttribute('aria-selected'))).toEqual(['false', 'false', 'false', 'true', 'false'])
    expect(screen.getByRole('option', { name: 'Home', selected: true })).toBeTruthy()
  })

  it('select/role: axe finds no violation in each state, with the list open, and in the native mode', async () => {
    const { container } = render(
      <div>
        <Category label="Placeholder" />
        <Category label="Value" defaultValue="toys" help="Buyers filter by it" />
        <Category label="Optional" optional size="sm" />
        <Category label="Error" size="lg" error="Choose a category for the listing" />
        <Category label="Disabled" disabled disabledReason="Add a shop first" />
        <Category label="Native" native defaultValue="home" help="Buyers filter by it" />
        <Category label="Native error" native error="Choose a category for the listing" />
      </div>,
    )
    expect(await violations(container)).toEqual([])
    await userEvent.setup().click(trigger('Value'))
    await screen.findByRole('listbox')
    expect(await violations(document.body)).toEqual([])
  })

  it('select/name: the label is above the trigger; the placeholder is not the name; an optional label ends with optional', () => {
    render(
      <div>
        <Category />
        <Category label="Size" name="size" optional />
        <Category label="Color" name="color" required />
      </div>,
    )
    const t = trigger()
    const label = document.getElementById(t.getAttribute('aria-labelledby') ?? '')
    expect(label?.textContent).toBe('Category')
    // The label comes before the trigger.
    expect((label?.compareDocumentPosition(t) ?? 0) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(t.textContent).toBe('Choose a category')
    expect(trigger('Size (optional)')).toBeTruthy()
    // A necessary select has no mark: the name is the label only.
    expect(trigger('Color').getAttribute('aria-required')).toBe('true')
    expect(document.getElementById(trigger('Color').getAttribute('aria-labelledby') ?? '')?.textContent).toBe('Color')
  })

  it('select/use: the choice of a select or a combobox is a rule for the screen (review)', () => {
    expect(clause('select/use').level).toBe('SHOULD')
  })

  it('select/no-filter: the select has no text input, and typeahead does not filter the options', async () => {
    render(<Category />)
    const user = userEvent.setup()
    await user.click(trigger())
    await screen.findByRole('listbox')
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.queryByRole('searchbox')).toBeNull()
    await user.keyboard('h')
    await waitFor(() => expect(active()).toBe('Home'))
    expect(screen.getAllByRole('option')).toHaveLength(5)
  })

  it('select/trigger: the value at the start side, the chevron at the end side; the placeholder has the muted color', () => {
    render(<Category />)
    const t = trigger()
    const value = part(t, 'value') as HTMLElement
    const chevron = part(t, 'chevron') as HTMLElement
    expect(value.textContent).toBe('Choose a category')
    expect(value.hasAttribute('data-placeholder')).toBe(true)
    expect(value.className).toContain('data-[placeholder]:text-mono-fg-muted')
    expect([...t.children].indexOf(value)).toBeLessThan([...t.children].indexOf(chevron))
    expect(chevron.getAttribute('aria-hidden')).toBe('true')
    // The look of the input of a text field (measured in Chrome).
    for (const name of ['bg-mono-surface', 'rounded-mono-md', 'border-(length:--mono-select-trigger-border)']) {
      expect(t.className).toContain(name)
    }
    expect(t.className).toContain('var(--mono-color-role-field-line)')
  })

  it('select/size: each size takes the control height of the density; medium is the default (measured in Chrome)', () => {
    render(
      <div>
        <Category label="Small" size="sm" />
        <Category label="Medium" />
        <Category label="Large" size="lg" />
      </div>,
    )
    expect(trigger('Small').className).toContain('h-(--mono-size-control-sm)')
    expect(trigger('Medium').className).toContain('h-(--mono-size-control-md)')
    expect(trigger('Large').className).toContain('h-(--mono-size-control-lg)')
  })

  it('select/density: the text, the chevron, the check, and the radius take the tokens of the density (measured in Chrome)', async () => {
    render(<Category defaultValue="home" />)
    expect(trigger().className).toContain('text-mono-body')
    expect(part(trigger(), 'chevron')?.className).toContain('size-(--mono-size-icon)')
    await userEvent.setup().click(trigger())
    const home = await screen.findByRole('option', { name: 'Home' })
    expect(home.className).toContain('text-mono-body')
    expect(part(home, 'check')?.className).toContain('size-(--mono-size-icon)')
  })

  it('select/target: a press on the chevron opens the list; an option has the medium height (measured in Chrome)', async () => {
    render(<Category size="sm" />)
    expect(trigger().className).toContain('after:min-h-(--mono-size-target-min)')
    await userEvent.setup().click(part(trigger(), 'chevron') as HTMLElement)
    await waitFor(() => expect(isOpen()).toBe(true))
    expect((await screen.findByRole('option', { name: 'Home' })).className).toContain('min-h-(--mono-size-control-md)')
  })

  it('select/help: the help text is the description of the select', () => {
    render(<Category help="Buyers filter by it" />)
    expect(screen.getByRole('combobox', { name: 'Category', description: 'Buyers filter by it' })).toBeTruthy()
    const field = trigger().closest('[data-mono="select"]') as HTMLElement
    expect(field.className).toContain('gap-(--mono-select-field-gap)')
    // The help text is below the trigger.
    expect(trigger().compareDocumentPosition(part(field, 'help') as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('select/keyboard: Tab focuses the trigger; Enter, Space, and the arrows open the list at the selected or the first option', async () => {
    render(
      <div>
        <button type="button">Before</button>
        <Category defaultValue="home" />
        <Category label="Size" name="size" />
      </div>,
    )
    const user = userEvent.setup()
    await user.tab()
    await user.tab()
    expect(document.activeElement).toBe(trigger())
    for (const key of ['{Enter}', ' ', '{ArrowDown}', '{ArrowUp}']) {
      await press(user, key, 'Home')
      expect(isOpen()).toBe(true)
      await press(user, '{Escape}', null)
    }
    await user.tab()
    expect(document.activeElement).toBe(trigger('Size'))
    // With no selection, the first option is active.
    for (const key of ['{Enter}', ' ', '{ArrowDown}', '{ArrowUp}']) {
      await press(user, key, 'Clothes')
      await press(user, '{Escape}', null, 'Size')
    }
  })

  it('select/list-keys: the arrows move the active option and stay at the ends; Enter and Space select and close', async () => {
    const onValueChange = vi.fn()
    render(<Category onValueChange={onValueChange} />)
    const user = userEvent.setup()
    await user.tab()
    await press(user, '{Enter}', 'Clothes')
    await press(user, '{ArrowUp}', 'Clothes')
    for (const name of ['Electronics', 'Food and drink', 'Home', 'Toys', 'Toys']) await press(user, '{ArrowDown}', name)
    await press(user, '{ArrowUp}', 'Home')
    await press(user, '{Enter}', null)
    expect(onValueChange).toHaveBeenLastCalledWith('home')
    await press(user, '{Enter}', 'Home')
    await press(user, '{ArrowDown}', 'Toys')
    await press(user, ' ', null)
    expect(onValueChange).toHaveBeenLastCalledWith('toys')
    expect(trigger().textContent).toBe('Toys')
  })

  it('select/escape: Escape keeps the value; the focus goes back to the trigger; Tab closes and goes to the next control', async () => {
    render(
      <div>
        <Category defaultValue="home" />
        <button type="button">After</button>
      </div>,
    )
    const user = userEvent.setup()
    await user.tab()
    await press(user, '{Enter}', 'Home')
    await press(user, '{ArrowDown}', 'Toys')
    await press(user, '{Escape}', null)
    expect(trigger().textContent).toBe('Home')
    expect(document.activeElement).toBe(trigger())
    await press(user, '{Enter}', 'Home')
    await press(user, '{ArrowDown}', 'Toys')
    await press(user, '{Enter}', null)
    expect(trigger().textContent).toBe('Toys')
    expect(document.activeElement).toBe(trigger())
    await press(user, '{Enter}', 'Toys')
    await press(user, '{ArrowUp}', 'Home')
    await user.tab()
    await waitFor(() => expect(isOpen()).toBe(false))
    expect(trigger().textContent).toBe('Toys')
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'After' }))
  })

  it('select/typeahead: a key opens a closed list and moves the active option; the value does not change', async () => {
    const onValueChange = vi.fn()
    render(<Category defaultValue="clothes" onValueChange={onValueChange} />)
    const user = userEvent.setup()
    await user.tab()
    await press(user, 'h', 'Home')
    expect(isOpen()).toBe(true)
    expect(trigger().textContent).toBe('Clothes')
    expect(screen.getAllByRole('option')).toHaveLength(5)
    await press(user, '{Escape}', null)
    await press(user, 'e', 'Electronics')
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('select/active-option: the active option has the selected fill and, with the keyboard, the focus ring', async () => {
    render(<Category />)
    const user = userEvent.setup()
    await user.tab()
    await press(user, '{ArrowDown}', 'Clothes')
    await press(user, '{ArrowDown}', 'Electronics')
    const option = screen.getByRole('option', { name: 'Electronics' })
    expect(option.className).toContain('data-[highlighted]:bg-mono-selected')
    expect(option.className).toContain('focus-visible:outline-solid')
    expect(option.className).toContain('focus-visible:outline-offset-(--mono-focus-ring-offset)')
    // Base UI 1.9 has no virtual focus for the select: it moves the focus to the active option. Thus assistive
    // technology reads the active option. The trigger keeps the look of the focus while the list is open.
    expect(document.activeElement).toBe(option)
    expect(trigger().hasAttribute('data-popup-open')).toBe(true)
  })

  it('select/focus: the focus and the open list give the ring border and the soft ring (measured in Chrome)', () => {
    render(<Category />)
    expect(trigger().className).toContain('[&:is(:focus,[data-popup-open])]:[--sel-focus:var(--mono-color-role-ring)]')
    expect(trigger().className).toContain('[--sel-tint:var(--mono-color-role-accent-soft)]')
  })

  it('select/hover: the hover class is only for a device with hover; an option at hover gets the selected fill', async () => {
    render(
      <div>
        <Category />
        <Category label="Disabled" disabled />
      </div>,
    )
    expect(trigger().className).toContain('hover:[--sel-hover:var(--mono-color-role-fg-muted)]')
    expect(trigger('Disabled').className).not.toContain('hover:')
    const user = userEvent.setup()
    await openList(user)
    await user.hover(screen.getByRole('option', { name: 'Toys' }))
    await waitFor(() => expect(active()).toBe('Toys'))
  })

  it('select/pointer: a press opens, a second press closes; a press on an option selects; a press outside keeps the value', async () => {
    render(
      <div>
        <Category />
        <button type="button">Outside</button>
      </div>,
    )
    const user = userEvent.setup()
    await openList(user)
    await user.click(trigger())
    await waitFor(() => expect(isOpen()).toBe(false))
    await openList(user)
    await user.click(screen.getByRole('option', { name: 'Home' }))
    await waitFor(() => expect(isOpen()).toBe(false))
    expect(trigger().textContent).toBe('Home')
    await openList(user)
    await user.click(screen.getByRole('button', { name: 'Outside' }))
    await waitFor(() => expect(isOpen()).toBe(false))
    expect(trigger().textContent).toBe('Home')
  })

  it('select/selected-sign: the selected option has the check and the strong name; the trigger shows its name', async () => {
    render(<Category defaultValue="electronics" />)
    expect(trigger().textContent).toBe('Electronics')
    await userEvent.setup().click(trigger())
    const selected = await screen.findByRole('option', { name: 'Electronics', selected: true })
    expect(part(selected, 'check')?.querySelector('svg')).toBeTruthy()
    expect(part(selected, 'check')?.className).toContain('text-mono-accent')
    expect(part(selected, 'name')?.className).toContain('in-data-[selected]:font-mono-strong')
    expect(part(selected, 'name')?.className).toContain('in-data-[selected]:text-mono-fg-strong')
    // Color is not the only sign: the check shows only on the selected option.
    expect(screen.getAllByRole('option').filter((o) => part(o, 'check'))).toEqual([selected])
  })

  it('select/list: the list is 4 px below the trigger, from the geometry; it has the raised surface and the trigger width', async () => {
    render(<Category />)
    await userEvent.setup().click(trigger())
    const list = await screen.findByRole('listbox')
    const positioner = list.closest('[data-mono="select"]') as HTMLElement
    const popup = list.closest('[data-part="list"]') as HTMLElement
    expect(positioner.getAttribute('data-side')).toBe('bottom')
    expect(popup.getAttribute('data-side')).toBe('bottom')
    expect(popup.getAttribute('data-align')).toBe('start')
    // jsdom has no layout: the trigger is a box of 0 px at the origin. Thus the list is at the gap only.
    await waitFor(() => expect(positioner.style.transform).toBe('translate(0px, 4px)'))
    for (const name of ['bg-mono-raised', 'shadow-mono-overlay', 'rounded-mono-lg', 'min-w-(--anchor-width)']) {
      expect(popup.className).toContain(name)
    }
    expect(list.className).toContain('p-(--mono-select-list-padding)')
  })

  it('select/max-height: eight options and the padding, then the list scrolls; the selected option comes into view', async () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ value: `v${i + 1}`, label: `Option ${i + 1}` }))
    render(<Select label="Many" options={many} defaultValue="v11" />)
    const scroll = vi.mocked(HTMLElement.prototype.scrollIntoView)
    scroll.mockClear()
    await userEvent.setup().click(trigger('Many'))
    const list = await screen.findByRole('listbox')
    expect(list.className).toContain('overflow-y-auto')
    expect(list.className).toContain('[--sel-list-max:calc(var(--mono-select-list-max-height)+var(--mono-select-list-padding)*2)]')
    await waitFor(() => expect(scroll.mock.contexts).toContain(screen.getByRole('option', { name: 'Option 11' })))
  })

  it('select/system-picker: native gives a native select with the same look; on a phone it is the default', () => {
    const { unmount } = render(<Category native size="sm" error="Choose a category" />)
    const select = trigger()
    expect(select.tagName).toBe('SELECT')
    expect(select.className).toContain('appearance-none')
    for (const name of ['bg-mono-surface', 'rounded-mono-md', 'h-(--mono-size-control-sm)', '[--sel-error:var(--mono-color-role-danger)]']) {
      expect(select.className).toContain(name)
    }
    expect(part(select.closest('[data-mono="select"]') as Element, 'chevron')?.querySelector('svg')).toBeTruthy()
    unmount()
    // A phone: touch is the primary input, and the device has no hover.
    const matchMedia = vi.fn((query: string) => ({
      matches: query === PHONE_MEDIA,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
    vi.stubGlobal('matchMedia', matchMedia)
    const phone = render(<Category />)
    expect(trigger().tagName).toBe('SELECT')
    expect(matchMedia).toHaveBeenCalledWith(PHONE_MEDIA)
    phone.unmount()
    vi.unstubAllGlobals()
    render(<Category />)
    expect(trigger().tagName).toBe('BUTTON')
  })

  it('select/direction: the list gets the right-to-left direction and the axes of the trigger (measured in Chrome)', async () => {
    render(
      <div dir="rtl" data-theme="light" data-density="touch">
        <Category />
      </div>,
    )
    expect(trigger().className).toContain('ps-(--mono-select-trigger-padding)')
    expect(trigger().className).toContain('pe-(--mono-select-chevron-inset)')
    await userEvent.setup().click(trigger())
    const positioner = (await screen.findByRole('listbox')).closest('[data-mono="select"][dir]') as HTMLElement
    expect(positioner.getAttribute('dir')).toBe('rtl')
    expect(positioner.getAttribute('data-theme')).toBe('light')
    expect(positioner.getAttribute('data-density')).toBe('touch')
    // The list opens from the right corner of the trigger.
    expect(positioner.style.getPropertyValue('--transform-origin')).toMatch(/^100% /)
  })

  it('select/motion: the list opens from the edge of the trigger, 4 px nearer, at scale 0.98, in 150 ms with ease-out', async () => {
    render(<Category />)
    await userEvent.setup().click(trigger())
    const popup = (await screen.findByRole('listbox')).closest('[data-part="list"]') as HTMLElement
    const css = popup.className
    expect(css).toContain('origin-(--transform-origin)')
    expect(css).toContain('data-[side=bottom]:[--sel-from:calc(var(--mono-select-open-offset)*-1)]')
    expect(css).toContain('data-[starting-style]:scale-[var(--sel-still-scale,var(--mono-scale-menu-in))]')
    expect(css).toContain('[transition-duration:var(--sel-duration,var(--mono-duration-fast))]')
    expect(css).toContain('[transition-timing-function:var(--sel-easing,var(--mono-easing-out))]')
    expect(css).toContain('data-[ending-style]:[--sel-duration:var(--mono-duration-press)]')
    expect(css).toContain('data-[ending-style]:[--sel-easing:var(--mono-easing-in)]')
  })

  it('select/motion-reduced: reduced motion stops the move and the scale; the fade stays', async () => {
    render(
      <div data-motion="reduced">
        <Category />
      </div>,
    )
    await userEvent.setup().click(trigger())
    const popup = (await screen.findByRole('listbox')).closest('[data-part="list"]') as HTMLElement
    expect(popup.closest('[data-motion]')?.getAttribute('data-motion')).toBe('reduced')
    for (const name of ['motion-reduce:[--sel-still-scale:1]', '[[data-motion=reduced]_&]:[--sel-still-move:0px]']) {
      expect(popup.className).toContain(name)
    }
    expect(popup.className).toContain('[&[data-starting-style],&[data-ending-style]]:opacity-0')
  })

  it('select/moment: open, then select before close; a move of the active option and Escape emit no select', async () => {
    const onMoment = vi.fn<(e: MomentEvent) => void>()
    render(
      <MomentProvider onMoment={onMoment}>
        <Category defaultValue="clothes" />
      </MomentProvider>,
    )
    const moments = () => onMoment.mock.calls.map(([e]) => `${e.source}:${e.moment}`)
    const user = userEvent.setup()
    await user.tab()
    await press(user, '{Enter}', 'Clothes')
    expect(moments()).toEqual(['select:open'])
    await press(user, '{ArrowDown}', 'Electronics')
    await press(user, '{ArrowDown}', 'Food and drink')
    expect(moments()).toEqual(['select:open'])
    await press(user, '{Escape}', null)
    expect(moments()).toEqual(['select:open', 'select:close'])
    onMoment.mockClear()
    await openList(user)
    await user.click(screen.getByRole('option', { name: 'Home' }))
    await waitFor(() => expect(isOpen()).toBe(false))
    expect(moments()).toEqual(['select:open', 'select:select', 'select:close'])
    // A press on the selected option is no change of the value.
    onMoment.mockClear()
    await openList(user)
    await user.click(screen.getByRole('option', { name: 'Home' }))
    await waitFor(() => expect(isOpen()).toBe(false))
    expect(moments()).toEqual(['select:open', 'select:close'])
  })

  it('select/moment: the picker of the system emits open, select, and close; a disabled select emits no moment', async () => {
    const onMoment = vi.fn<(e: MomentEvent) => void>()
    render(
      <MomentProvider onMoment={onMoment}>
        <Category native />
        <Category label="Disabled" disabled />
        <Category label="Disabled native" native disabled />
      </MomentProvider>,
    )
    const moments = () => onMoment.mock.calls.map(([e]) => e.moment)
    const user = userEvent.setup()
    await user.selectOptions(trigger(), 'home')
    expect(moments()).toEqual(['open', 'select', 'close'])
    onMoment.mockClear()
    fireEvent.pointerDown(trigger(), { button: 0 })
    fireEvent.blur(trigger())
    expect(moments()).toEqual(['open', 'close'])
    onMoment.mockClear()
    await user.click(trigger('Disabled'))
    await user.keyboard('{Enter}')
    fireEvent.pointerDown(trigger('Disabled native'), { button: 0 })
    fireEvent.change(trigger('Disabled native'), { target: { value: 'toys' } })
    expect(onMoment).not.toHaveBeenCalled()
  })

  it('select/no-direct-feedback: the select calls no vibration API', async () => {
    const vibrate = vi.fn()
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true })
    render(<Category />)
    const user = userEvent.setup()
    await openList(user)
    await user.click(screen.getByRole('option', { name: 'Toys' }))
    await waitFor(() => expect(isOpen()).toBe(false))
    expect(vibrate).not.toHaveBeenCalled()
  })

  it('select/disabled: it stays in the focus order, its list does not open, and its help text tells why', async () => {
    render(
      <form data-testid="form">
        <button type="button">Before</button>
        <Category disabled defaultValue="home" help="Buyers filter by it" disabledReason="Add a shop first" />
        <Category label="Native" name="native" native disabled defaultValue="home" disabledReason="Add a shop first" />
      </form>,
    )
    const user = userEvent.setup()
    await user.tab()
    await user.tab()
    const t = screen.getByRole('combobox', { name: 'Category', description: 'Add a shop first' })
    expect(document.activeElement).toBe(t)
    expect(t.getAttribute('aria-disabled')).toBe('true')
    for (const key of ['{Enter}', ' ', '{ArrowDown}', 't']) {
      await user.keyboard(key)
      await tick()
      expect(isOpen()).toBe(false)
    }
    await user.click(t)
    await tick()
    expect(isOpen()).toBe(false)
    expect(t.textContent).toBe('Home')
    expect(t.className).toContain('opacity-(--mono-opacity-disabled)')
    expect(t.className).toContain('bg-mono-bg')
    await user.tab()
    const native = screen.getByRole('combobox', { name: 'Native', description: 'Add a shop first' })
    expect(document.activeElement).toBe(native)
    expect(native.getAttribute('aria-disabled')).toBe('true')
    fireEvent.change(native, { target: { value: 'toys' } })
    expect((native as HTMLSelectElement).value).toBe('home')
    // A disabled select sends no value, as a disabled native select.
    const data = new FormData(screen.getByTestId('form') as HTMLFormElement)
    expect([data.has('category'), data.has('native')]).toEqual([false, false])
  })

  it('select/disabled-option: the arrows move to it, the user cannot select it, and its description tells why', async () => {
    const onValueChange = vi.fn()
    render(<Category onValueChange={onValueChange} />)
    const user = userEvent.setup()
    await user.tab()
    await press(user, '{Enter}', 'Clothes')
    await press(user, '{ArrowDown}', 'Electronics')
    await press(user, '{ArrowDown}', 'Food and drink')
    const food = screen.getByRole('option', { name: 'Food and drink', description: 'Not available in your area at this time' })
    expect(food.getAttribute('aria-disabled')).toBe('true')
    expect(part(food, 'name')?.className).toContain('in-data-[disabled]:opacity-(--mono-opacity-disabled)')
    await user.keyboard('{Enter}')
    await user.click(food)
    await tick()
    expect(isOpen()).toBe(true)
    expect(onValueChange).not.toHaveBeenCalled()
    expect(trigger().textContent).toBe('Choose a category')
  })

  it('select/error: the error replaces the help text, with the icon; the trigger is invalid and has the danger border', () => {
    render(<Category help="Buyers filter by it" error="Choose a category for the listing" />)
    const t = screen.getByRole('combobox', { name: 'Category', description: 'Choose a category for the listing' })
    expect(t.getAttribute('aria-invalid')).toBe('true')
    expect(screen.queryByText('Buyers filter by it')).toBeNull()
    const error = part(t.closest('[data-mono="select"]') as Element, 'error') as HTMLElement
    expect(error.querySelector('svg')?.closest('[aria-hidden="true"]')).toBeTruthy()
    expect(error.className).toContain('text-mono-danger-text')
    expect(t.className).toContain('[--sel-error:var(--mono-color-role-danger)]')
  })

  it('select/error-motion: the error fades in for 150 ms with no shake; the focus ring takes the danger tint', () => {
    render(<Category error="Choose a category for the listing" />)
    const error = part(trigger().closest('[data-mono="select"]') as Element, 'error') as HTMLElement
    expect(error.className).toContain('starting:opacity-0')
    expect(error.className).toContain('duration-(--mono-duration-fast)')
    expect(error.className).not.toMatch(/animate-|translate|rotate/)
    expect(trigger().className).toContain('[--sel-tint:var(--mono-color-role-danger-soft)]')
  })

  it('select/error-time: the time of the error is a rule for the form (review)', () => {
    expect(clause('select/error-time').level).toBe('SHOULD')
  })

  it('select/form: the form sends the value of the selected option with the name of the select', async () => {
    render(
      <form data-testid="form">
        <Category defaultValue="clothes" />
        <Category label="Native" name="native" native />
      </form>,
    )
    const form = screen.getByTestId('form') as HTMLFormElement
    expect(new FormData(form).get('category')).toBe('clothes')
    expect(new FormData(form).get('native')).toBe('')
    const user = userEvent.setup()
    await openList(user)
    await user.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'Toys' }))
    await waitFor(() => expect(isOpen()).toBe(false))
    await user.selectOptions(trigger('Native'), 'home')
    expect(new FormData(form).get('category')).toBe('toys')
    expect(new FormData(form).get('native')).toBe('home')
  })

  it('select/surfaces: the list and the native select have the same label, help text, error, and stored value', () => {
    const field = (native: boolean) => {
      const view = render(
        <form data-testid="form">
          <Category native={native} optional defaultValue="home" help="Buyers filter by it" />
          <Category native={native} label="Size" name="size" error="Choose a size" />
        </form>,
      )
      const result = {
        help: screen.getByRole('combobox', { name: 'Category (optional)', description: 'Buyers filter by it' }) !== null,
        error: screen.getByRole('combobox', { name: 'Size', description: 'Choose a size' }).getAttribute('aria-invalid'),
        value: [...new FormData(screen.getByTestId('form') as HTMLFormElement).entries()],
      }
      view.unmount()
      return result
    }
    const list = field(false)
    expect(list).toEqual({ help: true, error: 'true', value: [['category', 'home'], ['size', '']] })
    expect(field(true)).toEqual(list)
  })

  it('select/tv: a clause of the TV class; the web package has no TV axis (review on the platform)', () => {
    expect(clause('select/tv').classes).toEqual(['tv'])
  })

  it('select/car: a clause of the car class; the platform gives the list template (review on the platform)', () => {
    expect(clause('select/car').classes).toEqual(['car'])
  })

  it('select/watch: a clause of the watch class (review on the platform)', () => {
    expect(clause('select/watch')).toMatchObject({ level: 'SHOULD', classes: ['watch'] })
  })

  it('select/xr: a clause of the XR class (review on the platform)', () => {
    expect(clause('select/xr').classes).toEqual(['xr'])
  })
})
