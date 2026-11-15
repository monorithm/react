// The tests of the Code entry. Each name starts with the id of a clause of ir/contracts/code-entry.json. The browser test
// (test/browser/code-entry.browser.test.tsx) measures the clauses that jsdom cannot compute.
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { violations } from '@monorithm/react/test/axe'
import { contract as loadContract } from '@monorithm/react/test/contract'
import { MomentProvider } from '@monorithm/react/contexts/moment-context'
import { type MomentEvent } from '@monorithm/react/lib/moments'
import { CodeEntry } from './code-entry'
import { latinDigits } from './code-entry.digits'

const contract = loadContract('code-entry')

const level = (id: string) => contract.clauses.find((c: { id: string }) => c.id === id)?.level
const boxes = () => screen.getAllByRole('textbox') as HTMLInputElement[]
const box = (position: number) => screen.getByRole('textbox', { name: `Digit ${position} of 6` }) as HTMLInputElement
const digits = () => boxes().map((b) => b.value)
const REFUSED = 'The code is not correct. Type the code again, or get a new code.'

/** An app that examines the code: 482913 is correct. It gives the error text when it refuses a code. */
function App({ onMoment = () => {} }: { onMoment?: (e: MomentEvent) => void }) {
  const [error, setError] = useState<string>()
  return (
    <MomentProvider onMoment={onMoment}>
      <CodeEntry
        label="One-time code"
        error={error}
        onComplete={(code) => {
          const correct = code === '482913'
          if (!correct) setError(REFUSED)
          return correct
        }}
      />
    </MomentProvider>
  )
}

describe('CodeEntry', () => {
  it('the tests cover each clause of the contract', () => {
    const tested = new Set([
      'code-entry/role', 'code-entry/name', 'code-entry/boxes', 'code-entry/digits', 'code-entry/input-mode',
      'code-entry/autofill', 'code-entry/paste', 'code-entry/no-paste-block', 'code-entry/next-box', 'code-entry/backspace',
      'code-entry/arrows', 'code-entry/tab', 'code-entry/auto-send', 'code-entry/send-once', 'code-entry/result',
      'code-entry/target', 'code-entry/density', 'code-entry/shape', 'code-entry/fit', 'code-entry/digit', 'code-entry/hover',
      'code-entry/focus', 'code-entry/error-sign', 'code-entry/error-text', 'code-entry/error-time', 'code-entry/error-name',
      'code-entry/error-read', 'code-entry/direction', 'code-entry/motion', 'code-entry/no-shake', 'code-entry/moment',
      'code-entry/no-direct-feedback', 'code-entry/disabled', 'code-entry/timer', 'code-entry/change-number',
      'code-entry/second-device',
    ])
    expect(contract.clauses.map((c: { id: string }) => c.id).filter((id: string) => !tested.has(id))).toEqual([])
  })

  it('code-entry/role: the accessibility tree shows a group with its name, and a text field with a name for each box', () => {
    render(<CodeEntry label="One-time code" />)
    const group = screen.getByRole('group', { name: 'One-time code' })
    expect(group.getAttribute('data-mono')).toBe('code-entry')
    expect(boxes()).toHaveLength(6)
    for (const b of boxes()) {
      expect(group.contains(b)).toBe(true)
      expect(b.tagName).toBe('INPUT')
      expect(b.type).toBe('text')
    }
  })

  it('code-entry/role: axe finds no violation: empty, filled, in the error state, disabled, and with a timer', async () => {
    const { container } = render(
      <div>
        <CodeEntry label="One-time code" />
        <CodeEntry label="Filled code" defaultValue="4829" />
        <CodeEntry label="Refused code" defaultValue="000000" error={REFUSED} />
        <CodeEntry label="Disabled code" disabled disabledReason="Wait for the new code" />
        <CodeEntry label="Code with a timer" timer="Send a new code in 0:42" />
      </div>,
    )
    expect(await violations(container)).toEqual([])
  })

  it('code-entry/name: the group has the label as its name; the name of each box gives its position', () => {
    render(<CodeEntry label="One-time code" />)
    expect(boxes().map((b) => b.getAttribute('aria-label'))).toEqual([1, 2, 3, 4, 5, 6].map((n) => `Digit ${n} of 6`))
    expect(box(2)).toBe(boxes()[1])
  })

  it('code-entry/name: the app gives the names of the boxes in the language of the locale', () => {
    render(<CodeEntry label="Code à usage unique" boxLabel={(p, n) => `Chiffre ${p} sur ${n}`} />)
    expect(screen.getByRole('group', { name: 'Code à usage unique' })).toBeTruthy()
    expect(screen.getByRole('textbox', { name: 'Chiffre 2 sur 6' })).toBe(boxes()[1])
  })

  it('code-entry/boxes: six boxes by default; each box holds one digit', async () => {
    const user = userEvent.setup()
    render(<CodeEntry label="One-time code" />)
    expect(boxes()).toHaveLength(6)
    await user.click(box(1))
    await user.keyboard('48')
    expect(digits()).toEqual(['4', '8', '', '', '', ''])
  })

  it('code-entry/boxes: the length prop sets the number of boxes', () => {
    render(<CodeEntry label="Short code" length={4} />)
    expect(screen.getAllByRole('textbox').map((b) => b.getAttribute('aria-label'))).toEqual([1, 2, 3, 4].map((n) => `Digit ${n} of 4`))
  })

  it('code-entry/digits: a box accepts a digit of the locale; the app gets the code in Latin digits', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn(() => true)
    const onValueChange = vi.fn()
    render(<CodeEntry label="One-time code" onComplete={onComplete} onValueChange={onValueChange} />)
    await user.click(box(1))
    await user.keyboard('٤٨٢٩١٣')
    expect(digits()).toEqual(['4', '8', '2', '9', '1', '3'])
    expect(onValueChange).toHaveBeenLastCalledWith('482913')
    expect(onComplete).toHaveBeenCalledWith('482913')
    expect(latinDigits('४८२ ९१३ ４８２')).toBe('482913482')
  })

  it('code-entry/digits: a box does not accept a letter or a sign; the focus stays', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<CodeEntry label="One-time code" onValueChange={onValueChange} />)
    await user.click(box(1))
    await user.keyboard('a+-²')
    expect(digits()).toEqual(['', '', '', '', '', ''])
    expect(document.activeElement).toBe(box(1))
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('code-entry/digits: a digit from an input method editor goes into the box at the end of the composition', () => {
    render(<CodeEntry label="One-time code" />)
    const first = box(1)
    first.focus()
    fireEvent.compositionStart(first)
    fireEvent.change(first, { target: { value: '４' } })
    expect(first.value).toBe('４')
    expect(document.activeElement).toBe(first)
    fireEvent.compositionEnd(first, { data: '４' })
    expect(digits()[0]).toBe('4')
    expect(document.activeElement).toBe(box(2))
  })

  it('code-entry/input-mode: each box opens the numeric keyboard of the system', () => {
    render(<CodeEntry label="One-time code" />)
    expect(boxes().map((b) => b.inputMode)).toEqual(Array(6).fill('numeric'))
  })

  it('code-entry/autofill: the first box holds a one-time code; an autofill fills all six boxes and gives the code', () => {
    const onComplete = vi.fn(() => true)
    render(<CodeEntry label="One-time code" onComplete={onComplete} />)
    expect(boxes().map((b) => b.getAttribute('autocomplete'))).toEqual(['one-time-code', 'off', 'off', 'off', 'off', 'off'])
    // The system puts the full code in the first box.
    fireEvent.change(box(1), { target: { value: '482913' } })
    expect(digits()).toEqual(['4', '8', '2', '9', '1', '3'])
    expect(onComplete).toHaveBeenCalledExactlyOnceWith('482913')
  })

  it('code-entry/paste: a paste in a box fills all six boxes from the first box, with only the digits', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn(() => true)
    render(<CodeEntry label="One-time code" defaultValue="11" onComplete={onComplete} />)
    await user.click(box(3))
    await user.paste('Code: 482-913')
    expect(digits()).toEqual(['4', '8', '2', '9', '1', '3'])
    expect(document.activeElement).toBe(box(6))
    expect(onComplete).toHaveBeenCalledExactlyOnceWith('482913')
  })

  it('code-entry/paste: a paste of a part of the code fills the boxes from the first box; the focus goes to the next box', async () => {
    const user = userEvent.setup()
    render(<CodeEntry label="One-time code" defaultValue="777777" />)
    await user.click(box(5))
    await user.paste('48 29')
    expect(digits()).toEqual(['4', '8', '2', '9', '', ''])
    expect(document.activeElement).toBe(box(5))
  })

  it('code-entry/no-paste-block: the paste and the autofill of the system arrive; no box stops them', async () => {
    const user = userEvent.setup()
    render(<CodeEntry label="One-time code" />)
    expect(box(1).getAttribute('autocomplete')).not.toBe('off')
    await user.click(box(1))
    await user.paste('482913')
    expect(digits().join('')).toBe('482913')
    fireEvent.change(box(1), { target: { value: '135790' } })
    expect(digits().join('')).toBe('135790')
  })

  it('code-entry/next-box: a digit goes into the box and the focus moves to the next box; a new digit replaces the digit', async () => {
    const user = userEvent.setup()
    render(<CodeEntry label="One-time code" defaultValue="123" />)
    await user.click(box(2))
    await user.keyboard('9')
    expect(digits()).toEqual(['1', '9', '3', '', '', ''])
    expect(document.activeElement).toBe(box(3))
  })

  it('code-entry/next-box: in the last box, the focus stays', async () => {
    const user = userEvent.setup()
    render(<CodeEntry label="One-time code" defaultValue="48291" />)
    await user.click(box(6))
    await user.keyboard('3')
    expect(document.activeElement).toBe(box(6))
    await user.keyboard('7')
    expect(digits()).toEqual(['4', '8', '2', '9', '1', '7'])
    expect(document.activeElement).toBe(box(6))
  })

  it('code-entry/backspace: Backspace removes the digit of the box; in an empty box, it goes to the previous box and removes its digit', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<CodeEntry label="One-time code" defaultValue="482913" onValueChange={onValueChange} />)
    await user.click(box(6))
    await user.keyboard('{Backspace}')
    expect(digits()).toEqual(['4', '8', '2', '9', '1', ''])
    expect(document.activeElement).toBe(box(6))
    await user.keyboard('{Backspace}')
    expect(digits()).toEqual(['4', '8', '2', '9', '', ''])
    expect(document.activeElement).toBe(box(5))
  })

  it('code-entry/backspace: Backspace in a box between two digits empties only that box', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<CodeEntry label="One-time code" defaultValue="482913" onValueChange={onValueChange} />)
    await user.click(box(3))
    await user.keyboard('{Backspace}')
    expect(digits()).toEqual(['4', '8', '', '9', '1', '3'])
    expect(document.activeElement).toBe(box(3))
    expect(onValueChange).toHaveBeenLastCalledWith('48 913')
  })

  it('code-entry/arrows: Left Arrow and Right Arrow move the focus and change no digit, also in a right-to-left layout', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(
      <div dir="rtl">
        <CodeEntry label="رمز لمرة واحدة" defaultValue="482" onValueChange={onValueChange} />
      </div>,
    )
    await user.click(box(2))
    await user.keyboard('{ArrowLeft}')
    expect(document.activeElement).toBe(box(1))
    await user.keyboard('{ArrowLeft}')
    expect(document.activeElement).toBe(box(1))
    await user.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}')
    expect(document.activeElement).toBe(box(4))
    expect(digits()).toEqual(['4', '8', '2', '', '', ''])
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('code-entry/tab: Tab goes to the first empty box; the next Tab goes out of the group', async () => {
    const user = userEvent.setup()
    render(
      <div>
        <button type="button">Before</button>
        <CodeEntry label="One-time code" defaultValue="48" />
        <button type="button">After</button>
      </div>,
    )
    await user.tab()
    await user.tab()
    expect(document.activeElement).toBe(box(3))
    await user.keyboard('{ArrowLeft}')
    expect(document.activeElement).toBe(box(2))
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'After' }))
    await user.tab({ shift: true })
    expect(document.activeElement).toBe(box(3))
    await user.tab({ shift: true })
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Before' }))
  })

  it('code-entry/tab: when all boxes have a digit, Tab goes to the last box', async () => {
    const user = userEvent.setup()
    render(<CodeEntry label="One-time code" defaultValue="482913" />)
    await user.tab()
    expect(document.activeElement).toBe(box(6))
    expect(boxes().map((b) => b.tabIndex)).toEqual([-1, -1, -1, -1, -1, 0])
  })

  it('code-entry/auto-send: the last digit gives the code to the app, with no button', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn(() => true)
    render(<CodeEntry label="One-time code" onComplete={onComplete} />)
    expect(screen.queryByRole('button')).toBeNull()
    await user.click(box(1))
    await user.keyboard('48291')
    expect(onComplete).not.toHaveBeenCalled()
    await user.keyboard('3')
    expect(onComplete).toHaveBeenCalledExactlyOnceWith('482913')
  })

  it('code-entry/auto-send: the last empty box gives the code, also when it is not the last box', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn(() => true)
    render(<CodeEntry label="One-time code" defaultValue="48 913" onComplete={onComplete} />)
    await user.click(box(3))
    await user.keyboard('2')
    expect(onComplete).toHaveBeenCalledExactlyOnceWith('482913')
  })

  it('code-entry/send-once: the component gives each code one time, until the app gives its result', async () => {
    const user = userEvent.setup()
    let result: (correct: boolean) => void = () => {}
    const onComplete = vi.fn(() => new Promise<boolean>((resolve) => (result = resolve)))
    render(<CodeEntry label="One-time code" onComplete={onComplete} />)
    await user.click(box(1))
    await user.paste('000000')
    await user.paste('000000')
    await user.keyboard('{Backspace}0')
    expect(onComplete).toHaveBeenCalledTimes(1)
    await act(async () => result(false))
    await user.paste('000000')
    expect(onComplete).toHaveBeenCalledTimes(2)
  })

  it('code-entry/result: the app examines the code; the component gives each full code and refuses none', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(box(1))
    await user.paste('000000')
    expect(await screen.findByText(REFUSED)).toBeTruthy()
    await user.paste('482913')
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(''))
    expect(box(1).getAttribute('aria-invalid')).toBeNull()
  })

  it('code-entry/target: each box is the minimum target of the density or more (measured in Chrome)', () => {
    render(<CodeEntry label="One-time code" />)
    expect(box(1).className).toContain('min-w-(--mono-size-target-min)')
    expect(box(1).className).toContain('h-(--mono-code-entry-box-height)')
  })

  it('code-entry/density: the box takes the size of the density, and the gap of the geometry (measured in Chrome)', () => {
    render(<CodeEntry label="One-time code" />)
    expect(box(1).className).toContain('w-(--mono-code-entry-box-width)')
    expect((box(1).parentElement as HTMLElement).className).toContain('gap-(--mono-code-entry-box-gap)')
    expect(contract.geometry['box.gap']).toEqual({ value: 8, unit: 'px' })
  })

  it('code-entry/shape: the surface fill, the field line border, and the medium radius (measured in Chrome)', () => {
    render(<CodeEntry label="One-time code" />)
    const cls = box(1).className
    for (const c of ['bg-mono-surface', 'border-mono-field-line', 'rounded-mono-md', 'border-(length:--mono-code-entry-box-border)']) {
      expect(cls).toContain(c)
    }
  })

  it('code-entry/fit: the boxes get narrower in a narrow form, to the minimum target (measured in Chrome)', () => {
    expect(level('code-entry/fit')).toBe('SHOULD')
    render(<CodeEntry label="One-time code" />)
    expect((box(1).parentElement as HTMLElement).className).toContain('max-w-full')
    expect(box(1).className).toContain('shrink')
  })

  it('code-entry/digit: the digit is at the center, with tabular figures, the strong weight, and title-2 (measured in Chrome)', () => {
    render(<CodeEntry label="One-time code" />)
    const cls = box(1).className
    for (const c of ['text-center', 'tabular-nums', 'font-mono-strong', 'text-mono-title-2', 'text-mono-fg']) expect(cls).toContain(c)
  })

  it('code-entry/hover: the hover border is only for a device with hover (measured in Chrome)', () => {
    render(<CodeEntry label="One-time code" />)
    expect(box(1).className).toContain('hover:border-mono-fg-muted')
  })

  it('code-entry/focus: the focus of a field for each input method: focus, not focus-visible (measured in Chrome)', () => {
    render(<CodeEntry label="One-time code" />)
    expect(box(1).className).toContain('not-aria-invalid:focus:border-mono-ring')
    expect(box(1).className).not.toContain('focus-visible:')
  })

  it('code-entry/error-sign: in the error state, all six boxes are invalid and the error text shows; color is not the only sign', () => {
    render(<CodeEntry label="One-time code" defaultValue="000000" error={REFUSED} />)
    expect(boxes().map((b) => b.getAttribute('aria-invalid'))).toEqual(Array(6).fill('true'))
    expect(box(1).className).toContain('aria-invalid:border-mono-danger')
    expect(screen.getByText(REFUSED)).toBeTruthy()
    expect(screen.getByRole('group').dataset.invalid).toBe('true')
  })

  it('code-entry/error-text: the error text shows below the boxes, in the danger text color (measured in Chrome)', () => {
    render(<CodeEntry label="One-time code" defaultValue="000000" error={REFUSED} />)
    const text = screen.getByText(REFUSED)
    expect(box(6).compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(text.className).toContain('text-mono-danger-text')
  })

  it('code-entry/error-time: the component shows no error while the user types', async () => {
    const user = userEvent.setup()
    render(<CodeEntry label="One-time code" />)
    await user.click(box(1))
    await user.keyboard('4a8+2')
    expect(boxes().every((b) => !b.hasAttribute('aria-invalid'))).toBe(true)
    expect(screen.getByRole('alert').textContent).toBe('')
  })

  it('code-entry/error-time: the error shows after the app refuses a code; a change of a digit removes it', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(box(1))
    await user.keyboard('00000')
    expect(screen.queryByText(REFUSED)).toBeNull()
    await user.keyboard('0')
    expect(await screen.findByText(REFUSED)).toBeTruthy()
    await user.keyboard('{Backspace}')
    expect(screen.queryByText(REFUSED)).toBeNull()
    // The same text comes again at the next refusal.
    await user.keyboard('0')
    expect(await screen.findByText(REFUSED)).toBeTruthy()
  })

  it('code-entry/error-name: in the error state, each box is invalid and the error text is its description', () => {
    render(<CodeEntry label="One-time code" defaultValue="000000" error={REFUSED} />)
    expect(screen.getAllByRole('textbox', { description: REFUSED })).toHaveLength(6)
    expect(screen.getByRole('textbox', { name: 'Digit 3 of 6', description: REFUSED }).getAttribute('aria-invalid')).toBe('true')
  })

  it('code-entry/error-read: the error line is a live region before the error shows; the text goes into it', async () => {
    const user = userEvent.setup()
    render(<App />)
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toBe('')
    await user.click(box(1))
    await user.paste('000000')
    await waitFor(() => expect(alert.textContent).toBe(REFUSED))
    expect(screen.getByRole('alert')).toBe(alert)
    // The focus does not move.
    expect(document.activeElement).toBe(box(6))
  })

  it('code-entry/direction: the boxes go from left to right in each layout (measured in Chrome)', () => {
    render(
      <div dir="rtl">
        <CodeEntry label="رمز لمرة واحدة" defaultValue="482913" timer="Send a new code in 0:42" />
      </div>,
    )
    const row = box(1).parentElement as HTMLElement
    expect(row.getAttribute('dir')).toBe('ltr')
    expect(digits()).toEqual(['4', '8', '2', '9', '1', '3'])
    // The timer is not in the row: it follows the direction of the layout.
    expect(row.contains(screen.getByText('Send a new code in 0:42'))).toBe(false)
  })

  it('code-entry/motion: the border, the soft ring, and the error text change in dur-fast; reduced motion stops it (measured in Chrome)', () => {
    render(<CodeEntry label="One-time code" defaultValue="0" error={REFUSED} />)
    expect(box(1).className).toContain('duration-(--mono-duration-fast)')
    expect(box(1).className).toContain('motion-reduce:transition-none')
    expect(screen.getByRole('alert').className).toContain('transition-opacity')
    expect(screen.getByRole('alert').className).toContain('[[data-motion=reduced]_&]:transition-none')
  })

  it('code-entry/no-shake: a refusal changes no class of a box: the boxes do not shake or move', async () => {
    const user = userEvent.setup()
    render(<App />)
    const before = boxes().map((b) => b.className)
    await user.click(box(1))
    await user.paste('000000')
    await screen.findByText(REFUSED)
    expect(boxes().map((b) => b.className)).toEqual(before)
    expect(before.join(' ')).not.toMatch(/animate-|translate|scale/)
  })

  it('code-entry/moment: success when the app accepts the code, error when it refuses it; a digit, a paste, and a focus move emit none', async () => {
    const user = userEvent.setup()
    const onMoment = vi.fn<(e: MomentEvent) => void>()
    render(<App onMoment={onMoment} />)
    await user.click(box(1))
    await user.keyboard('4{ArrowLeft}{ArrowRight}')
    await user.paste('12')
    expect(onMoment).not.toHaveBeenCalled()
    await user.paste('000000')
    await waitFor(() => expect(onMoment).toHaveBeenCalledTimes(1))
    await user.paste('482913')
    await waitFor(() => expect(onMoment).toHaveBeenCalledTimes(2))
    expect(onMoment.mock.calls).toEqual([
      [{ moment: 'error', variant: undefined, source: 'code-entry' }],
      [{ moment: 'success', variant: undefined, source: 'code-entry' }],
    ])
  })

  it('code-entry/moment: a disabled code entry emits no moment, also when the result comes', async () => {
    const user = userEvent.setup()
    const onMoment = vi.fn()
    let result: (correct: boolean) => void = () => {}
    const onComplete = () => new Promise<boolean>((resolve) => (result = resolve))
    const { rerender } = render(
      <MomentProvider onMoment={onMoment}>
        <CodeEntry label="One-time code" onComplete={onComplete} />
      </MomentProvider>,
    )
    await user.click(box(1))
    await user.paste('482913')
    rerender(
      <MomentProvider onMoment={onMoment}>
        <CodeEntry label="One-time code" onComplete={onComplete} disabled disabledReason="Checking the code" />
      </MomentProvider>,
    )
    await act(async () => result(true))
    expect(onMoment).not.toHaveBeenCalled()
  })

  it('code-entry/no-direct-feedback: a refusal and an acceptance call no vibration API', async () => {
    const user = userEvent.setup()
    const vibrate = vi.fn()
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true })
    render(<App />)
    await user.click(box(1))
    await user.paste('000000')
    await screen.findByText(REFUSED)
    await user.paste('482913')
    await waitFor(() => expect(screen.queryByText(REFUSED)).toBeNull())
    expect(vibrate).not.toHaveBeenCalled()
  })

  it('code-entry/disabled: the boxes do not accept a digit, a paste, or an autofill; the description of the group tells why', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    const onComplete = vi.fn(() => true)
    render(
      <div>
        <button type="button">Before</button>
        <CodeEntry label="One-time code" disabled disabledReason="Wait for the new code" onValueChange={onValueChange} onComplete={onComplete} />
        <button type="button">After</button>
      </div>,
    )
    expect(screen.getByRole('group', { name: 'One-time code', description: 'Wait for the new code' })).toBeTruthy()
    expect(boxes().every((b) => b.disabled)).toBe(true)
    expect(box(1).className).toContain('disabled:opacity-(--mono-opacity-disabled)')
    await user.tab()
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'After' }))
    await user.click(box(1))
    await user.keyboard('4')
    fireEvent.paste(box(1), { clipboardData: { getData: () => '482913' } })
    fireEvent.change(box(1), { target: { value: '482913' } })
    expect(digits()).toEqual(Array(6).fill(''))
    expect(onValueChange).not.toHaveBeenCalled()
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('code-entry/timer: the timer for a new code shows with tabular figures (a rule for the screen)', () => {
    expect(level('code-entry/timer')).toBe('SHOULD')
    render(<CodeEntry label="One-time code" timer="Send a new code in 0:42" />)
    const timer = screen.getByText('Send a new code in 0:42')
    expect(timer.dataset.part).toBe('timer')
    expect(timer.className).toContain('tabular-nums')
    expect(timer.className).toContain('text-mono-fg-muted')
  })

  it('code-entry/change-number: the action Change number is a rule for the screen (review)', () => {
    expect(level('code-entry/change-number')).toBe('SHOULD')
  })

  it('code-entry/second-device: on a TV and in a car, a code for a second device is a rule for the screen (review)', () => {
    expect(level('code-entry/second-device')).toBe('SHOULD')
  })
})
