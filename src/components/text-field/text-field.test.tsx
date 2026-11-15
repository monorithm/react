// The tests of the Text field. Each name starts with the id of a clause of ir/contracts/text-field.json. The browser test
// (test/browser/text-field.browser.test.tsx) measures the clauses that jsdom cannot compute.
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { violations } from '@monorithm/react/test/axe'
import { contract as loadContract } from '@monorithm/react/test/contract'
import { MomentProvider } from '@monorithm/react/contexts/moment-context'
import { type MomentEvent } from '@monorithm/react/lib/moments'
import { TextField } from './text-field'
import { currencyAffix, parseAmount } from './text-field.amount'
import { fieldTypes } from './text-field.types'

const contract = loadContract('text-field')
const clause = (id: string) => contract.clauses.find((c) => c.id === id) as { level: string; classes?: string[] }

const USER_NAME_ERROR = 'Use only letters, numbers, and underscores.'
const userName = (v: string) => (/^\w*$/.test(v) ? null : USER_NAME_ERROR)

/** Collects the moments of the fields inside it. */
function withMoments() {
  const onMoment = vi.fn<(e: MomentEvent) => void>()
  const moments = () => onMoment.mock.calls.map(([e]) => e.moment)
  return { onMoment, moments }
}

const input = (name: string | RegExp) => screen.getByRole('textbox', { name }) as HTMLInputElement

describe('TextField', () => {
  it('the tests cover each clause of the contract', () => {
    const tested = new Set([
      'text-field/role', 'text-field/name', 'text-field/label', 'text-field/placeholder', 'text-field/help',
      'text-field/help-text', 'text-field/optional', 'text-field/necessary-mark', 'text-field/spacing', 'text-field/keyboard',
      'text-field/target', 'text-field/density', 'text-field/no-zoom', 'text-field/border', 'text-field/hover',
      'text-field/focus', 'text-field/focus-group', 'text-field/error-timing', 'text-field/error-sign', 'text-field/error-link',
      'text-field/error-focus', 'text-field/error-text', 'text-field/warning-sign', 'text-field/send-errors',
      'text-field/composition', 'text-field/input-type', 'text-field/keyboards', 'text-field/keyboards-2', 'text-field/autofill',
      'text-field/autofill-group', 'text-field/paste', 'text-field/server-check', 'text-field/digits', 'text-field/amount',
      'text-field/amount-store', 'text-field/prefix', 'text-field/search', 'text-field/hint', 'text-field/other-fields',
      'text-field/multi-line', 'text-field/counter', 'text-field/counter-count', 'text-field/disabled', 'text-field/read-only',
      'text-field/direction', 'text-field/direction-end', 'text-field/motion', 'text-field/reduced-motion',
      'text-field/moment-error', 'text-field/moment-warning', 'text-field/moment-success', 'text-field/no-key-moment',
      'text-field/moment-disabled', 'text-field/no-direct-feedback', 'text-field/voice', 'text-field/form-layout',
      'text-field/not-obscured', 'text-field/foldable', 'text-field/tv', 'text-field/tv-reduced-motion', 'text-field/tv-fields',
      'text-field/car', 'text-field/watch', 'text-field/watch-target', 'text-field/xr-target',
    ])
    expect(contract.clauses.map((c) => c.id).filter((id) => !tested.has(id))).toEqual([])
  })

  it('text-field/role: the accessibility tree shows a text field with the label as its name, and its states', () => {
    render(
      <div>
        <TextField label="Shop name" />
        <TextField label="Phone number" type="phone" disabled />
        <TextField label="Order number" defaultValue="A-1042" readOnly />
        <TextField label="Full name" required />
        <TextField label="User name" error={USER_NAME_ERROR} />
        <TextField label="Description" variant="multi-line" />
      </div>,
    )
    expect(input('Shop name').tagName).toBe('INPUT')
    expect(input('Phone number').disabled).toBe(true)
    expect(input('Order number').readOnly).toBe(true)
    expect(input('Full name').getAttribute('aria-required')).toBe('true')
    expect(input('User name').getAttribute('aria-invalid')).toBe('true')
    expect(input('Shop name').hasAttribute('aria-invalid')).toBe(false)
    expect(input('Description').tagName).toBe('TEXTAREA')
  })

  it('text-field/role: axe finds no violation in each variant and state', async () => {
    const { container } = render(
      <div>
        <TextField label="Shop name" help="The name that buyers see" />
        <TextField label="Delivery instructions" optional placeholder="Gate code, floor" />
        <TextField label="User name" defaultValue="ama k" error={USER_NAME_ERROR} />
        <TextField label="Email" type="email" warning="This address is not confirmed yet." />
        <TextField label="Phone number" type="phone" disabled disabledReason="To change your number, go to Account recovery." />
        <TextField label="Order number" defaultValue="A-1042" readOnly />
        <TextField label="Search products" type="search" hint="/" />
        <TextField label="Price" type="amount" currency="GHS" locale="en-GH" />
        <TextField label="Website" prefix="https://" />
        <TextField label="Password" type="password" required />
        <TextField label="Description" variant="multi-line" limit={20} defaultValue="Red shoes for the beach" />
        <TextField label="Note" variant="multi-line" error="Write 10 characters or more." />
      </div>,
    )
    expect(await violations(container)).toEqual([])
  })

  it('text-field/role: the form sends the value under the name; a disabled field sends no value', async () => {
    render(
      <form data-testid="form">
        <TextField label="Shop name" name="shop" defaultValue="Ama Shoes" />
        <TextField label="Description" name="about" variant="multi-line" />
        <TextField label="Phone number" name="phone" defaultValue="0244" disabled />
      </form>,
    )
    const user = userEvent.setup()
    await user.type(input('Description'), 'Shoes and bags')
    const data = new FormData(screen.getByTestId('form') as HTMLFormElement)
    expect([...data.entries()]).toEqual([
      ['shop', 'Ama Shoes'],
      ['about', 'Shoes and bags'],
    ])
  })

  it('text-field/name: the accessible name starts with the label; the prefix comes after it', () => {
    render(
      <div>
        <TextField label="Price" type="amount" currency="GHS" locale="en-GH" />
        <TextField label="Website" prefix="https://" placeholder="example.com" />
      </div>,
    )
    expect(input('Price GH₵')).toBeTruthy()
    expect(input('Website https://')).toBeTruthy()
  })

  it('text-field/label: the label is outside the input, before it, and stays when the user types', async () => {
    const { container } = render(<TextField label="Shop name" placeholder="Ama Shoes" />)
    const label = screen.getByText('Shop name').closest('label') as HTMLLabelElement
    const box = container.querySelector('[data-part="input"]') as HTMLElement
    expect(box.contains(label)).toBe(false)
    expect(label.compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    await userEvent.setup().type(input('Shop name'), 'Kofi Bags')
    expect(screen.getByText('Shop name').closest('label')).toBe(label)
    expect(input('Shop name').value).toBe('Kofi Bags')
  })

  it('text-field/placeholder: the label prop is necessary; the placeholder is never the name', () => {
    // @ts-expect-error text-field/placeholder: a field without a label does not compile.
    const noLabel = <TextField placeholder="Shop name" />
    expect(noLabel).toBeTruthy()
    render(<TextField label="Shop name" placeholder="Ama Shoes" />)
    expect(input('Shop name').placeholder).toBe('Ama Shoes')
    expect(screen.queryByRole('textbox', { name: 'Ama Shoes' })).toBeNull()
  })

  it('text-field/help: the help text is below the input and is its description', () => {
    const { container } = render(<TextField label="Shop name" help="The name that buyers see" />)
    expect(screen.getByRole('textbox', { name: 'Shop name', description: 'The name that buyers see' })).toBeTruthy()
    const box = container.querySelector('[data-part="input"]') as HTMLElement
    const help = container.querySelector('[data-part="help"]') as HTMLElement
    expect(box.compareDocumentPosition(help) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('text-field/help-text and text-field/error-text: the words of the help and the error are rules for the writer (review)', () => {
    expect(clause('text-field/help-text').level).toBe('SHOULD')
    expect(clause('text-field/error-text').level).toBe('SHOULD')
  })

  it('text-field/optional: the label of an optional field ends with the word optional, regular and muted', () => {
    render(<TextField label="Delivery instructions" optional />)
    expect(input('Delivery instructions (optional)')).toBeTruthy()
    const mark = screen.getByText('(optional)')
    expect(mark.dataset.part).toBe('optional-mark')
    expect(mark.className).toContain('text-mono-fg-muted')
    expect(mark.className).not.toContain('font-mono-strong')
    expect(screen.getByText('Delivery instructions').className).toContain('font-mono-strong')
  })

  it('text-field/optional: the word optional can come in the language of the app', () => {
    render(<TextField label="Instructions de livraison" optional optionalText="(facultatif)" />)
    expect(input('Instructions de livraison (facultatif)')).toBeTruthy()
  })

  it('text-field/necessary-mark: a necessary field has no mark in its label', () => {
    render(<TextField label="Full name" required />)
    expect(screen.getByText('Full name').closest('label')?.textContent).toBe('Full name')
    expect(input('Full name').getAttribute('aria-required')).toBe('true')
  })

  it('text-field/spacing: the gaps of the field come from the label gap of the geometry (measured in Chrome)', () => {
    const { container } = render(<TextField label="Shop name" help="The name that buyers see" />)
    const root = container.firstElementChild as HTMLElement
    expect(root.getAttribute('data-mono')).toBe('text-field')
    expect(root.className).toContain('gap-(--field-gap)')
    expect(root.className).toContain('[--field-gap:var(--mono-text-field-label-gap)]')
    expect(contract.geometry['label.gap']).toEqual({ value: 6, unit: 'px' })
  })

  it('text-field/keyboard: Tab goes to each input in the visual order; Shift and Tab go back; add-ons get no focus', async () => {
    render(
      <div>
        <TextField label="Search products" type="search" hint="/" />
        <TextField label="Price" type="amount" currency="GHS" locale="en-GH" />
        <TextField label="Description" variant="multi-line" />
      </div>,
    )
    const user = userEvent.setup()
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('searchbox', { name: 'Search products' }))
    await user.tab()
    expect(document.activeElement).toBe(input('Price GH₵'))
    await user.tab()
    expect(document.activeElement).toBe(input('Description'))
    await user.tab({ shift: true })
    expect(document.activeElement).toBe(input('Price GH₵'))
  })

  it('text-field/target: a press on the label or on an add-on moves the focus to the input', async () => {
    const { container } = render(<TextField label="Search products" type="search" hint="/" />)
    const user = userEvent.setup()
    const search = screen.getByRole('searchbox', { name: 'Search products' })
    await user.click(screen.getByText('Search products'))
    expect(document.activeElement).toBe(search)
    search.blur()
    await user.click(container.querySelector('[data-part="start-icon"]') as HTMLElement)
    expect(document.activeElement).toBe(search)
    search.blur()
    await user.click(container.querySelector('[data-part="hint"]') as HTMLElement)
    expect(document.activeElement).toBe(search)
  })

  it('text-field/density and text-field/no-zoom: the height and the text size come from the density (measured in Chrome)', () => {
    const { container } = render(<TextField label="Shop name" />)
    expect((container.querySelector('[data-part="input"]') as HTMLElement).className).toContain('h-(--mono-size-control-md)')
    expect(input('Shop name').className).toContain('text-mono-body')
  })

  it('text-field/border, text-field/hover, and text-field/focus: the box has the state classes (measured in Chrome)', () => {
    const { container } = render(<TextField label="Shop name" />)
    const cls = (container.querySelector('[data-part="input"]') as HTMLElement).className
    expect(cls).toContain('border-(length:--field-border)')
    expect(cls).toContain('border-mono-field-line')
    expect(cls).toContain('not-focus-within:hover:border-mono-fg-muted')
    // text-field/focus: each focus shows the border and the ring, not only the keyboard focus.
    expect(cls).toContain('not-data-[invalid]:focus-within:border-mono-ring')
    expect(cls).not.toContain('focus-visible')
  })

  it('text-field/focus-group: the add-ons are inside the box; the box shows the error of the group', () => {
    const { container } = render(<TextField label="Price" type="amount" currency="GHS" locale="en-GH" error="Write an amount, for example 25.00." />)
    const box = container.querySelector('[data-part="input"]') as HTMLElement
    expect(box.querySelector('[data-part="prefix"]')).toBeTruthy()
    expect(box.contains(input('Price GH₵'))).toBe(true)
    expect(box.hasAttribute('data-invalid')).toBe(true)
  })

  it('text-field/error-timing: the error shows after the blur, never at a key; a correct value removes it at once', async () => {
    render(<TextField label="User name" validate={userName} help="Letters, numbers, and underscores" />)
    const user = userEvent.setup()
    const field = input('User name')
    await user.type(field, 'ama k')
    expect(screen.queryByText(USER_NAME_ERROR)).toBeNull()
    expect(field.hasAttribute('aria-invalid')).toBe(false)
    await user.tab()
    expect(screen.getByText(USER_NAME_ERROR)).toBeTruthy()
    // A key that keeps the value invalid keeps the error. A key that makes it correct removes the error at once.
    await user.click(field)
    await user.keyboard('{Backspace}')
    expect(screen.getByText(USER_NAME_ERROR)).toBeTruthy()
    await user.keyboard('{Backspace}')
    expect(screen.queryByText(USER_NAME_ERROR)).toBeNull()
    // A new error waits for the next blur.
    await user.keyboard(' ')
    expect(screen.queryByText(USER_NAME_ERROR)).toBeNull()
    await user.tab()
    expect(screen.getByText(USER_NAME_ERROR)).toBeTruthy()
  })

  it('text-field/error-timing: the field validates when the user sends the form, with a button or with Enter', async () => {
    const onSubmit = vi.fn((e: { preventDefault: () => void }) => e.preventDefault())
    render(
      <form onSubmit={onSubmit}>
        <TextField label="User name" validate={userName} defaultValue="ama k" />
        <TextField label="Shop name" validate={(v) => (v ? null : 'Write the name of the shop.')} />
        <button type="submit">Send</button>
      </form>,
    )
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Send' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(screen.getByText(USER_NAME_ERROR)).toBeTruthy()
    expect(screen.getByText('Write the name of the shop.')).toBeTruthy()
  })

  it('text-field/error-timing: an error of the app waits for the blur while the user types', async () => {
    function Live() {
      const [v, setV] = useState('')
      return <TextField label="User name" value={v} onValueChange={setV} error={userName(v) ?? undefined} />
    }
    render(<Live />)
    const user = userEvent.setup()
    await user.type(input('User name'), 'ama k')
    expect(screen.queryByText(USER_NAME_ERROR)).toBeNull()
    await user.tab()
    expect(screen.getByText(USER_NAME_ERROR)).toBeTruthy()
  })

  it('text-field/error-timing: an error of the app shows at once when the input does not have the focus', () => {
    const { rerender } = render(<TextField label="Email" type="email" />)
    rerender(<TextField label="Email" type="email" error="This email has an account. Sign in." />)
    expect(screen.getByText('This email has an account. Sign in.')).toBeTruthy()
    rerender(<TextField label="Email" type="email" />)
    expect(screen.queryByText('This email has an account. Sign in.')).toBeNull()
  })

  it('text-field/error-sign: the error replaces the help, with an error icon before the text', () => {
    const { container } = render(<TextField label="User name" help="Letters, numbers, and underscores" error={USER_NAME_ERROR} />)
    expect(screen.queryByText('Letters, numbers, and underscores')).toBeNull()
    const error = container.querySelector('[data-part="error"]') as HTMLElement
    const icon = error.querySelector('[data-part="error-icon"]') as HTMLElement
    expect(icon.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
    expect(error.firstElementChild).toBe(icon)
    expect(error.textContent).toBe(USER_NAME_ERROR)
    expect(error.className).toContain('text-mono-danger-text')
    expect((container.querySelector('[data-part="input"]') as HTMLElement).hasAttribute('data-invalid')).toBe(true)
  })

  it('text-field/error-link: the error is the description of the invalid input, read with the label', () => {
    render(<TextField label="User name" help="Letters, numbers, and underscores" error={USER_NAME_ERROR} />)
    const field = screen.getByRole('textbox', { name: 'User name', description: USER_NAME_ERROR })
    expect(field.getAttribute('aria-invalid')).toBe('true')
  })

  it('text-field/error-focus: an invalid box keeps the danger border and the danger ring at focus (measured in Chrome)', () => {
    const { container } = render(<TextField label="User name" error={USER_NAME_ERROR} />)
    const cls = (container.querySelector('[data-part="input"]') as HTMLElement).className
    expect(cls).toContain('data-[invalid]:border-mono-danger')
    expect(cls).toContain('data-[invalid]:focus-within:[--field-ring:var(--mono-color-role-danger-soft)]')
  })

  it('text-field/warning-sign: the warning replaces the help, with an icon; the border and the validity do not change', async () => {
    const { container } = render(
      <TextField label="Email" type="email" help="We send the receipt here" validate={(v) => (v.endsWith('.con') ? { warning: 'Make sure that the address ends with .com.' } : null)} />,
    )
    const user = userEvent.setup()
    await user.type(input('Email'), 'ama@shop.con')
    expect(screen.getByText('We send the receipt here')).toBeTruthy()
    await user.tab()
    expect(screen.queryByText('We send the receipt here')).toBeNull()
    const warning = container.querySelector('[data-part="warning"]') as HTMLElement
    expect(warning.firstElementChild?.getAttribute('data-part')).toBe('warning-icon')
    expect(warning.className).toContain('text-mono-warning-text')
    expect(screen.getByRole('textbox', { name: 'Email', description: 'Make sure that the address ends with .com.' })).toBeTruthy()
    expect(input('Email').hasAttribute('aria-invalid')).toBe(false)
    expect((container.querySelector('[data-part="input"]') as HTMLElement).hasAttribute('data-invalid')).toBe(false)
  })

  it('text-field/send-errors: the focus on the error summary is a rule for the form (review)', () => {
    expect(clause('text-field/send-errors').level).toBe('SHOULD')
  })

  it('text-field/composition: during the composition, Enter does not send the form and the field does not validate', async () => {
    const onSubmit = vi.fn((e: { preventDefault: () => void }) => e.preventDefault())
    render(
      <form onSubmit={onSubmit}>
        <TextField label="User name" validate={userName} defaultValue="ama k" />
        <button type="submit">Send</button>
      </form>,
    )
    const user = userEvent.setup()
    const field = input('User name')
    await user.click(field)
    fireEvent.compositionStart(field)
    await user.keyboard('{Enter}')
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.queryByText(USER_NAME_ERROR)).toBeNull()
    // A key event of the input method editor: isComposing is true.
    expect(fireEvent.keyDown(field, { key: 'Enter', isComposing: true })).toBe(true)
    expect(screen.queryByText(USER_NAME_ERROR)).toBeNull()
    fireEvent.compositionEnd(field)
    await user.keyboard('{Enter}')
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(screen.getByText(USER_NAME_ERROR)).toBeTruthy()
  })

  it('text-field/input-type: the type sets the keyboard, the enter key, and the autofill; a prop changes each', () => {
    render(
      <div>
        <TextField label="Email" type="email" />
        <TextField label="Recovery email" type="email" inputMode="text" enterKeyHint="done" autoComplete="section-recovery email" />
      </div>,
    )
    const email = input('Email')
    expect([email.type, email.inputMode, email.getAttribute('enterkeyhint'), email.autocomplete]).toEqual(['text', 'email', 'next', 'email'])
    const recovery = input('Recovery email')
    expect([recovery.inputMode, recovery.getAttribute('enterkeyhint'), recovery.getAttribute('autocomplete')]).toEqual(['text', 'done', 'section-recovery email'])
  })

  /** The attributes of the input of each type: the HTML type, the keyboard, the enter key, the autofill, the capitals. */
  function attrs(type: Parameters<typeof TextField>[0]['type']) {
    const { unmount } = render(<TextField label="Field" type={type as 'text'} />)
    const el = screen.getByLabelText('Field') as HTMLInputElement
    const out = [el.type, el.getAttribute('inputmode'), el.getAttribute('enterkeyhint'), el.getAttribute('autocomplete'), el.getAttribute('autocapitalize')]
    unmount()
    return out
  }

  it('text-field/keyboards: email has letters with @ and Next; phone a number pad with plus and Next; code a number pad and Done', () => {
    expect(attrs('email')).toEqual(['text', 'email', 'next', 'email', 'none'])
    expect(attrs('phone')).toEqual(['tel', 'tel', 'next', 'tel-national', null])
    expect(attrs('code')).toEqual(['text', 'numeric', 'done', 'one-time-code', null])
  })

  it('text-field/keyboards-2: password Go; amount a decimal pad and Done; search Search; message a capital and Send', () => {
    expect(attrs('password')).toEqual(['password', 'text', 'go', 'current-password', 'none'])
    expect(attrs('amount')).toEqual(['text', 'decimal', 'done', 'transaction-amount', null])
    expect(attrs('search')).toEqual(['search', 'search', 'search', null, null])
    expect(attrs('message')).toEqual(['text', 'text', 'send', null, 'sentences'])
  })

  it('text-field/autofill: the autofill follows the value: the user name, the national phone number, the code, the new password', () => {
    expect(attrs('username')[3]).toBe('username')
    expect(attrs('phone')[3]).toBe('tel-national')
    expect(attrs('code')[3]).toBe('one-time-code')
    expect(attrs('new-password')[3]).toBe('new-password')
  })

  it('text-field/autofill-group: one autofill group for a form is a rule for the form (review)', () => {
    // The app sets the group with a section in autoComplete, for example "section-billing email".
    expect(clause('text-field/autofill-group').level).toBe('SHOULD')
  })

  it('text-field/paste: the field accepts paste, and no type stops autofill', async () => {
    render(<TextField label="Code" type="code" />)
    const field = input('Code')
    expect(fireEvent.paste(field)).toBe(true)
    const user = userEvent.setup()
    await user.click(field)
    await user.paste('482913')
    expect(field.value).toBe('482913')
    expect(Object.values(fieldTypes).filter((t) => t.autoComplete === 'off')).toEqual([])
  })

  it('text-field/server-check: the type changes only the keyboard; the platform adds no check of the value', async () => {
    expect(clause('text-field/server-check').level).toBe('SHOULD')
    render(<TextField label="Email" type="email" required />)
    await userEvent.setup().type(input('Email'), 'not an address')
    expect(input('Email').validity.valid).toBe(true)
  })

  it('text-field/digits: the input accepts the Latin digits and the digits of the locale', async () => {
    render(<TextField label="Quantity" type="code" />)
    const user = userEvent.setup()
    await user.type(input('Quantity'), '45 ٤٥')
    expect(input('Quantity').value).toBe('45 ٤٥')
    expect(parseAmount('٤٥', 'GHS', 'ar')).toEqual({ minor: 4500, currency: 'GHS' })
  })

  it('text-field/amount: the field shows the currency of the price; the locale sets the side and the decimal sign', () => {
    const { container } = render(
      <div>
        <TextField label="Price" type="amount" currency="GHS" locale="en-GH" />
        <TextField label="Preis" type="amount" currency="EUR" locale="de-DE" />
      </div>,
    )
    const [ghs, eur] = container.querySelectorAll('[data-part="input"]')
    expect(ghs?.querySelector('[data-part="prefix"]')?.textContent).toBe('GH₵')
    expect(eur?.querySelector('[data-part="suffix"]')?.textContent).toBe('€')
    expect(input('Price GH₵').placeholder).toBe('0.00')
    expect(input('Preis €').placeholder).toBe('0,00')
    expect(currencyAffix('USD', 'en-GH').symbol).toBe('US$')
  })

  it('text-field/amount-store: parseAmount gives the integer of the minor unit with the ISO 4217 code', () => {
    expect(parseAmount('25.50', 'GHS', 'en-GH')).toEqual({ minor: 2550, currency: 'GHS' })
    expect(parseAmount('1.234,5', 'EUR', 'de-DE')).toEqual({ minor: 123450, currency: 'EUR' })
    expect(parseAmount('١٢٫٥', 'EGP', 'ar-EG')).toEqual({ minor: 1250, currency: 'EGP' })
    expect(parseAmount('1500', 'JPY', 'ja-JP')).toEqual({ minor: 1500, currency: 'JPY' })
    expect(parseAmount('2.555', 'GHS', 'en-GH')).toBeNull()
    expect(parseAmount('abc', 'GHS', 'en-GH')).toBeNull()
  })

  it('text-field/prefix: the prefix is inside the border at the start side, with a line of 1 px (measured in Chrome)', () => {
    const { container } = render(<TextField label="Website" prefix="https://" />)
    const box = container.querySelector('[data-part="input"]') as HTMLElement
    const prefix = box.querySelector('[data-part="prefix"]') as HTMLElement
    expect(box.firstElementChild).toBe(prefix)
    expect(prefix.className).toContain('border-e-(length:--mono-text-field-prefix-separator)')
  })

  it('text-field/search: a search field has a leading search icon and can show a keyboard hint at the end', () => {
    const { container } = render(<TextField label="Search products" type="search" hint="/" />)
    const box = container.querySelector('[data-part="input"]') as HTMLElement
    const icon = box.querySelector('[data-part="start-icon"]') as HTMLElement
    expect(box.firstElementChild).toBe(icon)
    expect(icon.className).toContain('[&>svg]:size-(--mono-size-icon)')
    expect(box.lastElementChild?.getAttribute('data-part')).toBe('hint')
  })

  it('text-field/hint: the hint is hidden from assistive technology and shows only with a fine pointer (measured in Chrome)', () => {
    const { container } = render(<TextField label="Search products" type="search" hint="/" aria-keyshortcuts="/" />)
    const hint = container.querySelector('[data-part="hint"]') as HTMLElement
    expect(hint.tagName).toBe('KBD')
    expect(hint.getAttribute('aria-hidden')).toBe('true')
    expect(hint.className).toContain('hidden pointer-fine:flex')
    expect(screen.getByRole('searchbox').getAttribute('aria-keyshortcuts')).toBe('/')
  })

  it('text-field/other-fields: the choice of the phone field, the select, and the file add area is a rule for the screen (review)', () => {
    expect(clause('text-field/other-fields').level).toBe('SHOULD')
  })

  it('text-field/multi-line: a multi-line input is a textarea that the user can make higher (measured in Chrome)', () => {
    render(<TextField label="Description" variant="multi-line" />)
    const area = input('Description')
    expect(area.tagName).toBe('TEXTAREA')
    expect(area.className).toContain('resize-y')
    expect(area.className).toContain('min-h-(--mono-text-field-multi-line-min-height)')
  })

  it('text-field/counter: the counter shows only when the limit is near, at the end of the label row', async () => {
    const { container } = render(<TextField label="Description" variant="multi-line" limit={10} locale="en" />)
    const user = userEvent.setup()
    await user.type(input('Description'), 'Red shoe')
    expect(container.querySelector('[data-part="counter"]')).toBeNull()
    await user.keyboard('s')
    const counter = container.querySelector('[data-part="counter"]') as HTMLElement
    expect(counter.textContent).toBe('9 / 10')
    expect(counter.parentElement?.lastElementChild).toBe(counter)
    expect(counter.parentElement?.firstElementChild?.tagName).toBe('LABEL')
    expect(screen.getByRole('textbox', { name: 'Description', description: '9 / 10' })).toBeTruthy()
  })

  it('text-field/counter-count: the counter counts grapheme clusters after the composition, in the number format of the locale', () => {
    const { container, rerender } = render(<TextField label="Description" variant="multi-line" limit={2000} defaultValue={'a'.repeat(1929)} locale="en" />)
    const area = input('Description')
    // One family emoji: 7 code points and 11 code units, but one grapheme cluster.
    fireEvent.compositionStart(area)
    fireEvent.change(area, { target: { value: `${'a'.repeat(1929)}👨‍👩‍👧` } })
    expect(container.querySelector('[data-part="counter"]')?.textContent).toBe('1,929 / 2,000')
    fireEvent.compositionEnd(area)
    expect(container.querySelector('[data-part="counter"]')?.textContent).toBe('1,930 / 2,000')
    rerender(<TextField label="Description" variant="multi-line" limit={2000} defaultValue={'a'.repeat(1929)} locale="ar-EG" />)
    expect(container.querySelector('[data-part="counter"]')?.textContent).toBe('١٬٩٣٠ / ٢٬٠٠٠')
  })

  it('text-field/disabled: a disabled input does not change, has the disabled state, and its help tells why', async () => {
    const { container } = render(
      <TextField label="Phone number" type="phone" defaultValue="0244123456" help="For the delivery" disabled disabledReason="To change your number, go to Account recovery." error={USER_NAME_ERROR} />,
    )
    const field = input('Phone number')
    await userEvent.setup().type(field, '9')
    expect(field.value).toBe('0244123456')
    expect(field.disabled).toBe(true)
    expect(screen.getByRole('textbox', { description: 'To change your number, go to Account recovery.' })).toBe(field)
    expect(screen.queryByText('For the delivery')).toBeNull()
    expect(screen.queryByText(USER_NAME_ERROR)).toBeNull()
    const box = container.querySelector('[data-part="input"]') as HTMLElement
    expect(box.hasAttribute('data-disabled')).toBe(true)
    expect(box.className).toContain('data-[disabled]:opacity-(--mono-opacity-disabled)')
    expect(box.className).toContain('data-[disabled]:bg-mono-bg')
  })

  it('text-field/read-only: the user can focus and select the value of a read-only input, but cannot change it', async () => {
    render(<TextField label="Order number" defaultValue="A-1042" readOnly />)
    const field = input('Order number')
    const user = userEvent.setup()
    await user.tab()
    expect(document.activeElement).toBe(field)
    field.select()
    expect(field.value.slice(field.selectionStart ?? 0, field.selectionEnd ?? 0)).toBe('A-1042')
    await user.keyboard('9')
    expect(field.value).toBe('A-1042')
  })

  it('text-field/direction: the add-ons come before the input in the DOM, thus at the start side (measured in Chrome)', () => {
    const { container } = render(<TextField label="Search products" type="search" hint="/" />)
    const parts = [...(container.querySelector('[data-part="input"]') as HTMLElement).children].map((e) => e.getAttribute('data-part'))
    expect(parts).toEqual(['start-icon', 'control', 'hint'])
  })

  it('text-field/direction-end: digits, phone numbers, codes, and amounts keep the left-to-right order', () => {
    render(
      <div dir="rtl">
        <TextField label="Phone number" type="phone" />
        <TextField label="Code" type="code" />
        <TextField label="Price" type="amount" />
        <TextField label="Name" />
      </div>,
    )
    expect(['Phone number', 'Code', 'Price', 'Name'].map((n) => input(n).getAttribute('dir'))).toEqual(['ltr', 'ltr', 'ltr', null])
  })

  it('text-field/motion and text-field/reduced-motion: the colors change in dur-fast; nothing moves or scales (measured in Chrome)', () => {
    const { container } = render(<TextField label="User name" error={USER_NAME_ERROR} />)
    const box = (container.querySelector('[data-part="input"]') as HTMLElement).className
    expect(box).toContain('transition-[border-color,box-shadow] duration-(--mono-duration-fast) ease-(--mono-easing-standard)')
    expect(box).not.toMatch(/scale|translate|animate/)
    const error = (container.querySelector('[data-part="error"]') as HTMLElement).className
    expect(error).toContain('starting:opacity-0')
    expect(error).not.toContain('motion-reduce')
  })

  it('text-field/moment-error: the field emits error in the frame in which the error shows, one time', async () => {
    const { onMoment, moments } = withMoments()
    render(
      <MomentProvider onMoment={onMoment}>
        <TextField label="User name" validate={userName} />
      </MomentProvider>,
    )
    const user = userEvent.setup()
    await user.type(input('User name'), 'ama k')
    expect(moments()).toEqual([])
    await user.tab()
    expect(screen.getByText(USER_NAME_ERROR)).toBeTruthy()
    expect(onMoment.mock.calls).toEqual([[{ moment: 'error', variant: undefined, source: 'text-field' }]])
    // The same error at the next blur does not show again: no second moment.
    await user.click(input('User name'))
    await user.tab()
    expect(moments()).toEqual(['error'])
  })

  it('text-field/moment-error: the field emits error when the form sends and the error shows', async () => {
    const { onMoment, moments } = withMoments()
    render(
      <MomentProvider onMoment={onMoment}>
        <form onSubmit={(e) => e.preventDefault()}>
          <TextField label="User name" validate={userName} defaultValue="ama k" />
          <button type="submit">Send</button>
        </form>
      </MomentProvider>,
    )
    await userEvent.setup().click(screen.getByRole('button', { name: 'Send' }))
    expect(moments()).toEqual(['error'])
  })

  it('text-field/moment-warning: the field emits warning when the warning shows, at the validation of the field', async () => {
    const { onMoment, moments } = withMoments()
    render(
      <MomentProvider onMoment={onMoment}>
        <TextField label="Email" type="email" validate={(v) => (v.endsWith('.con') ? { warning: 'Make sure that the address ends with .com.' } : null)} />
      </MomentProvider>,
    )
    const user = userEvent.setup()
    await user.type(input('Email'), 'ama@shop.con')
    expect(moments()).toEqual([])
    await user.tab()
    expect(moments()).toEqual(['warning'])
  })

  it('text-field/moment-success: in a form the fields emit no success; a field that saves its value emits success', async () => {
    const { onMoment, moments } = withMoments()
    const onSave = vi.fn(async () => {})
    render(
      <MomentProvider onMoment={onMoment}>
        <form onSubmit={(e) => e.preventDefault()}>
          <TextField label="Shop name" defaultValue="Ama Shoes" />
          <button type="submit">Save</button>
        </form>
        <TextField label="Display name" defaultValue="Ama" onSave={onSave} />
      </MomentProvider>,
    )
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(moments()).toEqual([])
    // No change of the value: no save.
    await user.click(input('Display name'))
    await user.tab()
    expect(onSave).not.toHaveBeenCalled()
    await user.click(input('Display name'))
    await user.keyboard(' K.')
    expect(moments()).toEqual([])
    await user.keyboard('{Enter}')
    expect(onSave).toHaveBeenCalledWith('Ama K.')
    await vi.waitFor(() => expect(moments()).toEqual(['success']))
    await user.tab()
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('text-field/moment-success: a value that does not save emits no success', async () => {
    const { onMoment, moments } = withMoments()
    const onSave = vi.fn(async () => {
      throw new Error('offline')
    })
    render(
      <MomentProvider onMoment={onMoment}>
        <TextField label="Display name" onSave={onSave} />
      </MomentProvider>,
    )
    const user = userEvent.setup()
    await user.type(input('Display name'), 'Ama')
    await user.tab()
    await vi.waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    await Promise.resolve()
    expect(moments()).toEqual([])
  })

  it('text-field/no-key-moment: the keys emit no moment, before and after an error shows', async () => {
    const { onMoment, moments } = withMoments()
    render(
      <MomentProvider onMoment={onMoment}>
        <TextField label="User name" validate={userName} />
      </MomentProvider>,
    )
    const user = userEvent.setup()
    await user.type(input('User name'), 'a b c d e')
    expect(moments()).toEqual([])
    await user.tab()
    await user.click(input('User name'))
    await user.keyboard('{Backspace}{Backspace} f g h')
    expect(moments()).toEqual(['error'])
  })

  it('text-field/moment-disabled: a disabled or a read-only field emits no moment', async () => {
    const { onMoment, moments } = withMoments()
    const { rerender } = render(
      <MomentProvider onMoment={onMoment}>
        <TextField label="Order number" defaultValue="A 1042" readOnly validate={userName} />
        <TextField label="Phone number" disabled validate={userName} />
      </MomentProvider>,
    )
    const user = userEvent.setup()
    await user.click(input('Order number'))
    await user.tab()
    rerender(
      <MomentProvider onMoment={onMoment}>
        <TextField label="Order number" defaultValue="A 1042" readOnly validate={userName} error="Not found" />
        <TextField label="Phone number" disabled validate={userName} error="Not found" />
      </MomentProvider>,
    )
    expect(moments()).toEqual([])
  })

  it('text-field/no-direct-feedback: an error starts no vibration and no audio', async () => {
    const vibrate = vi.fn()
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true })
    const AudioCtx = vi.fn()
    vi.stubGlobal('AudioContext', AudioCtx)
    render(<TextField label="User name" validate={userName} />)
    const user = userEvent.setup()
    await user.type(input('User name'), 'ama k')
    await user.tab()
    expect(screen.getByText(USER_NAME_ERROR)).toBeTruthy()
    expect(vibrate).not.toHaveBeenCalled()
    expect(AudioCtx).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('text-field/voice: the field does not block the input events of dictation and voice input', () => {
    const onValueChange = vi.fn()
    render(<TextField label="Message" type="message" onValueChange={onValueChange} />)
    const field = input('Message')
    const before = new InputEvent('beforeinput', { inputType: 'insertReplacementText', data: 'See you at noon', bubbles: true, cancelable: true })
    expect(field.dispatchEvent(before)).toBe(true)
    fireEvent.input(field, { target: { value: 'See you at noon' }, inputType: 'insertReplacementText' })
    expect(field.value).toBe('See you at noon')
    expect(onValueChange).toHaveBeenCalledWith('See you at noon')
  })

  it('text-field/form-layout and text-field/not-obscured: the layout of the form and of the screen are rules for the screen (review)', () => {
    expect(clause('text-field/form-layout').level).toBe('SHOULD')
    expect(clause('text-field/not-obscured').level).toBe('SHOULD')
    expect(contract.geometry['form.max-width']).toEqual({ value: 560, unit: 'px' })
  })

  it('text-field/foldable: a change of posture (a resize and a new orientation) keeps the value and the focus', async () => {
    const { rerender } = render(<TextField label="Shop name" />)
    const user = userEvent.setup()
    await user.type(input('Shop name'), 'Ama Shoes')
    window.dispatchEvent(new Event('resize'))
    window.dispatchEvent(new Event('orientationchange'))
    rerender(<TextField label="Shop name" className="w-1/2" />)
    expect(input('Shop name').value).toBe('Ama Shoes')
    expect(document.activeElement).toBe(input('Shop name'))
  })

  it('text-field/tv and text-field/tv-reduced-motion: rules for the TV class; this package has no TV context (review)', () => {
    // The package has the axes theme, density, direction, and motion, and no axis for the class of the device. Thus no
    // field of this package scales at focus: that is also the state of a TV with reduced motion.
    expect(clause('text-field/tv').classes).toEqual(['tv'])
    expect(clause('text-field/tv-reduced-motion').classes).toEqual(['tv'])
    const { container } = render(<TextField label="Search" type="search" />)
    expect((container.querySelector('[data-part="input"]') as HTMLElement).className).not.toContain('scale')
  })

  it('text-field/tv-fields, text-field/car, text-field/watch, text-field/watch-target, and text-field/xr-target: rules for other classes (review)', () => {
    expect(clause('text-field/tv-fields').level).toBe('SHOULD')
    expect(clause('text-field/car')).toMatchObject({ level: 'NEVER', classes: ['car'] })
    expect(clause('text-field/watch')).toMatchObject({ level: 'SHOULD', classes: ['watch'] })
    expect(clause('text-field/watch-target').classes).toEqual(['watch'])
    expect(clause('text-field/xr-target').classes).toEqual(['xr'])
  })
})
