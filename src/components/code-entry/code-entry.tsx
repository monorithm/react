// The Code entry of the language (contract: ir/contracts/code-entry.json). The tokens and the geometry of the contract
// give the look (code-entry.variants.ts, components.css).
// Base UI 1.9 has the OTP field, but it does not meet the contract. Thus this file gives the behavior:
// - Its value has no empty box before a digit. Backspace in a box between two digits moves the digits that follow it
//   (code-entry/backspace), and Backspace in a box with a digit moves the focus to the previous box.
// - A paste starts at the box with the focus, not at the first box (code-entry/paste).
// - Its numeric validation refuses the digits of the locale, for example ٤ (code-entry/digits).
// - It gives the same code again at each paste of a full code (code-entry/send-once).
// - In a right-to-left DirectionProvider, it changes the direction of the arrow keys (code-entry/arrows).
import {
  type ChangeEvent,
  type ClipboardEvent,
  type CompositionEvent,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import { cx } from '@monorithm/react/lib/cx'
import { useMoment } from '@monorithm/react/hooks/use-moment'
import { latinDigits } from './code-entry.digits'
import {
  codeEntryBox,
  codeEntryBoxes,
  codeEntryError,
  codeEntryLabel,
  codeEntryMessage,
  codeEntryReason,
  codeEntryRoot,
  codeEntryTimer,
} from './code-entry.variants'

export interface CodeEntryProps {
  /** The name of the group, for example "One-time code" (code-entry/name). */
  label: ReactNode
  /** The number of boxes. The contract gives six (code-entry/boxes). */
  length?: number
  /** The name of each box: its position. The default is "Digit 2 of 6" (code-entry/name). Give the text of the locale here. */
  boxLabel?: (position: number, length: number) => string
  /** The digits from the first box, in Latin digits. A space holds the place of an empty box before a digit. */
  value?: string
  defaultValue?: string
  /** Called at each change of a digit, with the new value. */
  onValueChange?: (value: string) => void
  /**
   * Called when the last empty box gets its digit, or at a paste or an autofill of the full code, with the code in Latin
   * digits (code-entry/auto-send). The app examines the code: return true when it is correct and false when it is not
   * correct (code-entry/result). Until the result comes, the component gives no code to the app (code-entry/send-once).
   */
  onComplete?: (code: string) => boolean | Promise<boolean>
  /**
   * The error text: how to correct the code, for example "Type the code again, or get a new code" (code-entry/error-text).
   * Give it after the app refuses a code (code-entry/error-time). When the user changes a digit, the error goes away. It
   * comes back when the text changes, or when onComplete gives false.
   */
  error?: string
  /** The time until the user can get a new code, for example "Send a new code in 0:42" (code-entry/timer). */
  timer?: ReactNode
  /** The boxes do not accept a digit, a paste, or an autofill (code-entry/disabled). */
  disabled?: boolean
  /** The cause of the disabled state. It is the description of the group (code-entry/disabled). */
  disabledReason?: ReactNode
  id?: string
  className?: string
}

const digitLabel = (position: number, length: number) => `Digit ${position} of ${length}`

/** One box for each position: a Latin digit, or an empty string. */
const toBoxes = (value: string, length: number): string[] => {
  const chars = Array.from(value)
  return Array.from({ length }, (_, index) => latinDigits(chars[index] ?? ''))
}

/** The value of the boxes: a space for an empty box before a digit, and no empty boxes at the end. */
const toValue = (boxes: string[]): string => boxes.map((digit) => digit || ' ').join('').trimEnd()

/** Some keyboards of Android show each text as a composition. Thus on Android, each change of the text applies. */
const composes = () => typeof navigator === 'undefined' || !/android/i.test(navigator.userAgent)

export function CodeEntry({
  label,
  length = 6,
  boxLabel = digitLabel,
  value,
  defaultValue = '',
  onValueChange,
  onComplete,
  error,
  timer,
  disabled,
  disabledReason,
  id,
  className,
}: CodeEntryProps) {
  const emit = useMoment('code-entry')
  const labelId = useId()
  const errorId = useId()
  const reasonId = useId()
  const row = useRef<HTMLDivElement>(null)
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const [inner, setInner] = useState(defaultValue)
  const boxes = toBoxes(value ?? inner, length)
  // The box with the focus, or null when the focus is out of the group.
  const [focused, setFocused] = useState<number | null>(null)
  // The text of an input method editor until the composition ends.
  const [composing, setComposing] = useState<{ index: number; text: string } | null>(null)

  // code-entry/error-time: the error shows when the app gives its text. It goes away when the user changes a digit, and
  // it comes back when the text changes or when the app refuses the next code.
  const [errorText, setErrorText] = useState(error)
  const [dismissed, setDismissed] = useState(false)
  if (error !== errorText) {
    setErrorText(error)
    setDismissed(false)
  }
  const invalid = Boolean(error) && !dismissed
  const reason = disabled && disabledReason && !invalid ? reasonId : undefined

  // code-entry/send-once: true from the time the app gets a code until its result comes.
  const waiting = useRef(false)
  // The result comes later: it reads the state and the emit function of that time.
  const latest = useRef({ disabled, emit })
  useEffect(() => {
    latest.current = { disabled, emit }
  })

  const focusBox = (index: number) => {
    const box = inputs.current[Math.max(0, Math.min(index, length - 1))]
    box?.focus()
    box?.select()
  }

  /** Gives the code to the app and waits for the result of the app (code-entry/auto-send, code-entry/result). */
  const give = (code: string) => {
    if (!onComplete || waiting.current) return
    waiting.current = true
    setDismissed(true)
    void new Promise<boolean>((resolve) => resolve(onComplete(code)))
      .then((correct) => {
        if (typeof correct !== 'boolean') return
        // code-entry/moment: success or error at the result of the app. A disabled code entry emits no moment.
        if (!latest.current.disabled) latest.current.emit(correct ? 'success' : 'error')
        if (!correct) setDismissed(false)
      })
      .finally(() => {
        waiting.current = false
      })
  }

  /** Applies an input of the user. A full code goes to the app; a paste of the full code goes again (code-entry/auto-send). */
  const update = (next: string[], focusIndex: number, fullCode: boolean) => {
    const before = toValue(boxes)
    const after = toValue(next)
    if (after !== before) {
      if (value === undefined) setInner(after)
      setDismissed(true)
      onValueChange?.(after)
    }
    focusBox(focusIndex)
    if (next.every(Boolean) && (after !== before || fullCode)) give(next.join(''))
  }

  /** Puts the digits of an input in the boxes. A disabled box does not accept a digit (code-entry/disabled). */
  const put = (index: number, digits: string, cleared: boolean) => {
    if (disabled) return
    if (digits.length > 1) {
      // code-entry/paste and code-entry/autofill: a code fills the boxes from the first box.
      const code = Array.from(digits).slice(0, length)
      update(
        Array.from({ length }, (_, i) => code[i] ?? ''),
        Math.min(code.length, length - 1),
        code.length === length,
      )
    } else if (digits.length === 1) {
      // code-entry/next-box: the digit replaces the digit of the box, and the focus moves to the next box. In the last
      // box, the focus stays.
      update(boxes.with(index, digits), index + 1, false)
    } else if (cleared) {
      update(boxes.with(index, ''), index, false)
    }
    // A letter or a sign changes nothing: React puts the digit of the box back (code-entry/digits).
  }

  const onChange = (index: number) => (event: ChangeEvent<HTMLInputElement>) => {
    const text = event.currentTarget.value
    if (composing?.index === index) {
      setComposing({ index, text })
      return
    }
    const input = event.nativeEvent as InputEvent
    // A typed key gives its own digit, also when the box has a digit before the caret.
    const typed = input.inputType === 'insertText' && typeof input.data === 'string'
    put(index, latinDigits(typed ? (input.data as string) : text), text === '')
  }

  const onCompositionEnd = (index: number) => (event: CompositionEvent<HTMLInputElement>) => {
    if (composing?.index !== index) return
    setComposing(null)
    put(index, latinDigits(event.data ?? ''), event.currentTarget.value === '')
  }

  const onKeyDown = (index: number) => (event: KeyboardEvent<HTMLInputElement>) => {
    if (composing || event.nativeEvent.isComposing || event.altKey || event.ctrlKey || event.metaKey) return
    if (event.key === 'Backspace') {
      // code-entry/backspace: remove the digit of the box. In an empty box, remove the digit of the previous box, and move
      // the focus to it.
      event.preventDefault()
      if (boxes[index]) update(boxes.with(index, ''), index, false)
      else if (index > 0) update(boxes.with(index - 1, ''), index - 1, false)
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      // code-entry/arrows: the boxes go from left to right in each layout. Thus Left Arrow goes to the box at the left.
      event.preventDefault()
      focusBox(event.key === 'ArrowLeft' ? index - 1 : index + 1)
    }
  }

  const onPaste = (index: number) => (event: ClipboardEvent<HTMLInputElement>) => {
    // code-entry/paste and code-entry/no-paste-block: the component puts the digits of the paste in the boxes itself. Thus
    // the browser does not put the text in one box.
    event.preventDefault()
    put(index, latinDigits(event.clipboardData.getData('text/plain')), false)
  }

  const onBlur = (event: FocusEvent<HTMLInputElement>) => {
    if (!row.current?.contains(event.relatedTarget as Node | null)) setFocused(null)
  }

  // code-entry/tab: one Tab stop. Out of the group, it is the first empty box, or the last box when all boxes have a
  // digit. In the group, it is the box with the focus: thus the next Tab moves the focus out of the group.
  const empty = boxes.indexOf('')
  const tabStop = focused ?? (empty === -1 ? length - 1 : empty)

  return (
    <div
      id={id}
      data-mono="code-entry"
      role="group"
      aria-labelledby={labelId}
      aria-describedby={reason}
      data-invalid={invalid || undefined}
      data-disabled={disabled || undefined}
      className={cx(codeEntryRoot, className)}
    >
      <span id={labelId} data-part="label" className={codeEntryLabel}>
        {label}
      </span>
      {/* code-entry/direction: the boxes go from left to right in each layout, and the first digit is at the left. */}
      <div ref={row} dir="ltr" data-part="boxes" className={codeEntryBoxes}>
        {boxes.map((digit, index) => (
          <input
            // The boxes have fixed positions: the position is the key.
            key={index}
            ref={(element) => {
              inputs.current[index] = element
            }}
            data-part="box"
            type="text"
            // code-entry/input-mode: the numeric keyboard of the system.
            inputMode="numeric"
            // code-entry/autofill: the first box tells the system that it holds a one-time code.
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            aria-label={boxLabel(index + 1, length)}
            // code-entry/error-name: the invalid state, and the error text as the description.
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? errorId : undefined}
            value={composing?.index === index ? composing.text : digit}
            tabIndex={tabStop === index ? 0 : -1}
            disabled={disabled}
            onChange={onChange(index)}
            onKeyDown={onKeyDown(index)}
            onPaste={onPaste(index)}
            onFocus={(event) => {
              setFocused(index)
              event.currentTarget.select()
            }}
            onBlur={onBlur}
            onCompositionStart={() => {
              if (composes()) setComposing({ index, text: digit })
            }}
            onCompositionEnd={onCompositionEnd(index)}
            className={codeEntryBox}
          />
        ))}
      </div>
      <div data-part="message" className={codeEntryMessage}>
        {/* code-entry/error-read: the line is a live region at all times. Thus a screen reader reads the new text. */}
        <p id={errorId} role="alert" data-part="error-text" data-shown={invalid || undefined} className={codeEntryError}>
          {invalid ? error : null}
        </p>
        {reason ? (
          <p id={reasonId} data-part="disabled-reason" className={codeEntryReason}>
            {disabledReason}
          </p>
        ) : null}
      </div>
      {timer ? (
        <p data-part="timer" className={codeEntryTimer}>
          {timer}
        </p>
      ) : null}
    </div>
  )
}
