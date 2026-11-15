// The Text field of the language (contract: ir/contracts/text-field.json). Base UI Field and Input give the behavior and
// the accessibility: the label, the input, and the description. The field sets the time of the error and the warning:
// they show only at the validation of the field, never at each key (text-field/error-timing). The tokens and the geometry
// of the contract give the look (text-field.variants.ts, components.css).
import { Field } from '@base-ui/react/field'
import { Input } from '@base-ui/react/input'
import {
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { currencyAffix } from './text-field.amount'
import { FieldError, FieldHelp, FieldWarning } from './text-field.message'
import { type AutoCapitalize, type AutoComplete, type EnterKeyHint, type FieldType, fieldTypes, type InputMode } from './text-field.types'
import {
  fieldBox,
  fieldGroup,
  fieldLabel,
  fieldLabelText,
  fieldOptional,
  textFieldArea,
  textFieldCounter,
  textFieldGroup,
  textFieldHint,
  textFieldIcon,
  textFieldInput,
  textFieldInputEnd,
  textFieldInputStart,
  textFieldLabelRow,
  textFieldLtr,
  textFieldPrefix,
  textFieldSuffix,
  textFieldVars,
} from './text-field.variants'
import { cx, describedBy } from '@monorithm/react/lib/cx'
import { useMoment } from '@monorithm/react/hooks/use-moment'

export type TextFieldVariant = 'single-line' | 'multi-line'

/** The result of validate: an error, a warning, or nothing (a valid value). A string is an error. */
export type Validation = string | { error?: string; warning?: string } | null | undefined

interface CommonProps {
  /** The name of the field. It shows above the input at all times (text-field/label, text-field/name). */
  label: ReactNode
  /** An optional field: the label ends with the word optional (text-field/optional). A necessary field has no mark. */
  optional?: boolean
  /** The word optional in the language of the app. The default is "(optional)". */
  optionalText?: ReactNode
  /** One line of help below the input: the value to write (text-field/help, text-field/help-text). */
  help?: ReactNode
  /** The cause of the disabled state. It replaces the help text when the field is disabled (text-field/disabled). */
  disabledReason?: ReactNode
  /**
   * An error from the app, for example from the server after the form sends. Tell how to correct the value
   * (text-field/error-text). It shows at once when the input does not have the focus. While the user types, a new error
   * waits for the blur (text-field/error-timing).
   */
  error?: string
  /** A warning from the app: the value is valid, but the user must see a condition (text-field/warning-sign). */
  warning?: string
  /**
   * The check of the value. The field calls it when the user moves the focus away, at Enter, and when the form sends.
   * While a message shows, it also calls it at each change, only to remove the message (text-field/error-timing).
   */
  validate?: (value: string) => Validation
  /**
   * For a field that saves its own value: called at the blur and at Enter, when the value changed and has no error. When
   * it resolves, the field emits the moment success. A field in a form does not save: the form emits success
   * (text-field/moment-success).
   */
  onSave?: (value: string) => unknown
  value?: string
  defaultValue?: string
  /** Called at each change of the value. */
  onValueChange?: (value: string) => void
  /** A sample value in the empty input. It is not the label (text-field/placeholder). */
  placeholder?: string
  disabled?: boolean
  /** The user can move the focus to the input, and select and copy the value, but cannot change it (text-field/read-only). */
  readOnly?: boolean
  /** A necessary field. Assistive technology tells the state. The label has no mark (text-field/necessary-mark). */
  required?: boolean
  /** The form sends the value under this name. */
  name?: string
  id?: string
  /** The keyboard. The default comes from the type (text-field.types.ts). */
  inputMode?: InputMode
  /** The action of the enter key. The default comes from the type. */
  enterKeyHint?: EnterKeyHint
  /** The autofill value. The default comes from the type. Only a shared kiosk can stop autofill (text-field/paste). */
  autoComplete?: AutoComplete
  /** The capitals. The default comes from the type. */
  autoCapitalize?: AutoCapitalize
  /** The locale of the number format of the counter and of an amount, for example "en-GH". The default is the locale of the platform. */
  locale?: string
  onFocus?: (event: FocusEvent<HTMLElement>) => void
  onBlur?: (event: FocusEvent<HTMLElement>) => void
  onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void
  className?: string
  'aria-describedby'?: string
  /** The keyboard shortcut of the app that moves the focus to the field, for example "/". */
  'aria-keyshortcuts'?: string
}

export interface TextFieldSingleLineProps extends CommonProps {
  /** One line of text, for example a name, an amount, or a search. The default. */
  variant?: 'single-line'
  /** The type of the value: it sets the keyboard, the enter key, and the autofill (text-field/input-type). */
  type?: FieldType
  /** A leading icon inside the border. The search type has a search icon (text-field/search). */
  startIcon?: ReactNode
  /** A prefix inside the border at the start side, for example "https://" (text-field/prefix). */
  prefix?: ReactNode
  /** A keyboard hint at the end, for example "/". It shows only on a laptop or a desktop (text-field/hint). */
  hint?: ReactNode
  /** The ISO 4217 code of the currency of the price, for an amount (text-field/amount). */
  currency?: string
  maxLength?: number
  ref?: Ref<HTMLInputElement>
}

export interface TextFieldMultiLineProps extends CommonProps {
  /** A long text, for example a description. The user can make the input higher. */
  variant: 'multi-line'
  type?: 'text' | 'message'
  /** The limit of the count of characters. The counter shows when the count is near the limit (text-field/counter). */
  limit?: number
  /** The count at which the counter shows. The default is 90 % of the limit. */
  counterFrom?: number
  rows?: number
  ref?: Ref<HTMLTextAreaElement>
}

export type TextFieldProps = TextFieldSingleLineProps | TextFieldMultiLineProps

type Shown = { kind: 'error' | 'warning'; text: string } | null

/** The message on the screen: the error, else the warning. */
const visible = (error?: string, warning?: string): Shown =>
  error ? { kind: 'error', text: error } : warning ? { kind: 'warning', text: warning } : null
const same = (a: Shown, b: Shown) => a?.kind === b?.kind && a?.text === b?.text
const fromValidation = (r: Validation): { error?: string; warning?: string } =>
  typeof r === 'string' ? { error: r || undefined } : { error: r?.error || undefined, warning: r?.warning || undefined }

const segmenters = new Map<string, Intl.Segmenter>()
/** The count of grapheme clusters, not of code units (text-field/counter-count). */
function graphemes(text: string, locale?: string): number {
  let segmenter = segmenters.get(locale ?? '')
  if (!segmenter) {
    segmenter = new Intl.Segmenter(locale, { granularity: 'grapheme' })
    segmenters.set(locale ?? '', segmenter)
  }
  return Array.from(segmenter.segment(text)).length
}

/** The search icon of a search field. Assistive technology does not read it. */
function SearchIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M7 2a5 5 0 1 0 2.9 9.07l3.52 3.52 1.06-1.06-3.52-3.52A5 5 0 0 0 7 2Zm0 1.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z"
      />
    </svg>
  )
}

export function TextField(props: TextFieldProps) {
  const {
    label,
    optional,
    optionalText = '(optional)',
    help,
    disabledReason,
    error,
    warning,
    validate,
    onSave,
    value,
    defaultValue,
    onValueChange,
    placeholder,
    disabled,
    readOnly,
    required,
    name,
    id,
    locale,
    className,
    ref,
  } = props
  const multi = props.variant === 'multi-line'
  const spec = fieldTypes[props.type ?? 'text']
  const emit = useMoment('text-field')
  const labelId = useId()
  const prefixId = useId()
  const suffixId = useId()
  const counterId = useId()
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
  const focused = useRef(false)
  const composing = useRef(false)
  // The result of validate at the last validation of the field.
  const checked = useRef<{ error?: string; warning?: string }>({})
  const saved = useRef(value ?? defaultValue ?? '')
  // The message on the screen. At the mount, it is the message of the app.
  const [shown, setShown] = useState<Shown>(() => visible(error, warning))
  const shownRef = useRef(shown)
  // The text of the counter: it changes only after the composition ends (text-field/counter-count).
  const [counted, setCounted] = useState(value ?? defaultValue ?? '')

  const setRef = useCallback(
    (el: HTMLElement | null) => {
      inputRef.current = el as HTMLInputElement | HTMLTextAreaElement | null
      if (typeof ref === 'function') ref(el as (HTMLInputElement & HTMLTextAreaElement) | null)
      else if (ref) (ref as { current: HTMLElement | null }).current = el
    },
    [ref],
  )

  /** Shows a message. With add false (the user types), a message can only stay or go: a new message waits. */
  function show(next: Shown, add: boolean) {
    const prev = shownRef.current
    const n = add ? next : next && prev && next.kind === prev.kind ? prev : null
    if (same(n, prev)) return
    shownRef.current = n
    setShown(n)
    // text-field/moment-error and text-field/moment-warning: in the frame in which the message shows. A disabled or a
    // read-only field emits no moment (text-field/moment-disabled).
    if (n && !disabled && !readOnly) emit(n.kind)
  }

  /** The validation of the field: at the blur, at Enter, and when the form sends (text-field/error-timing). */
  function validateField(): Shown {
    if (disabled) return null
    checked.current = fromValidation(validate?.(inputRef.current?.value ?? ''))
    const next = visible(error || checked.current.error, warning || checked.current.warning)
    show(next, true)
    return next
  }

  /** At a change of the value: the message goes when the value is correct. No new message shows (text-field/no-key-moment). */
  function recheck(text: string) {
    if (!shownRef.current || composing.current) return
    checked.current = fromValidation(validate?.(text))
    show(visible(error || checked.current.error, warning || checked.current.warning), false)
  }

  /** text-field/moment-success: a field that saves its own value emits success when the value saves. */
  function save(result: Shown) {
    const text = inputRef.current?.value ?? ''
    if (!onSave || disabled || readOnly || result?.kind === 'error' || text === saved.current) return
    const before = saved.current
    saved.current = text
    Promise.resolve()
      .then(() => onSave(text))
      .then(
        () => emit('success'),
        () => {
          saved.current = before
        },
      )
  }

  // text-field/error-timing: a new message of the app shows at once when the input does not have the focus. While the
  // user types, it waits for the blur. The ref keeps the last props: thus a second run of the effect does nothing.
  const lastProps = useRef({ error, warning })
  useLayoutEffect(() => {
    if (lastProps.current.error === error && lastProps.current.warning === warning) return
    lastProps.current = { error, warning }
    show(visible(error || checked.current.error, warning || checked.current.warning), !focused.current)
  }, [error, warning])

  useEffect(() => {
    if (value !== undefined && !composing.current) setCounted(value)
  }, [value])

  // The form sends: the validation of the field. The form resets: no message.
  const onFormSubmit = useEffectEvent(() => {
    validateField()
  })
  const onFormReset = useEffectEvent(() => {
    checked.current = {}
    shownRef.current = null
    setShown(null)
    setTimeout(() => setCounted(inputRef.current?.value ?? ''))
  })
  useEffect(() => {
    const form = inputRef.current?.form
    if (!form) return undefined
    const submit = () => onFormSubmit()
    const reset = () => onFormReset()
    form.addEventListener('submit', submit, true)
    form.addEventListener('reset', reset)
    return () => {
      form.removeEventListener('submit', submit, true)
      form.removeEventListener('reset', reset)
    }
  }, [])

  const currency = multi ? undefined : props.currency
  const affix = useMemo(() => (currency ? currencyAffix(currency, locale) : null), [currency, locale])
  const prefix = multi ? undefined : affix?.side === 'start' ? affix.symbol : props.prefix
  const suffix = affix?.side === 'end' ? affix.symbol : undefined
  const icon = multi ? undefined : (props.startIcon ?? (props.type === 'search' ? <SearchIcon /> : undefined))
  const hint = multi ? undefined : props.hint

  const limit = multi ? props.limit : undefined
  const numbers = useMemo(() => new Intl.NumberFormat(locale), [locale])
  const count = limit === undefined ? 0 : graphemes(counted, locale)
  // text-field/counter: the counter shows only when the limit is near.
  const showCounter = limit !== undefined && count >= (multi && props.counterFrom !== undefined ? props.counterFrom : Math.ceil(limit * 0.9))

  const message = disabled ? null : shown
  const helpText = disabled && disabledReason ? disabledReason : help
  const invalid = message?.kind === 'error'

  const control = {
    ref: setRef,
    id,
    name,
    value,
    defaultValue,
    // text-field/amount: the sample of an amount has the decimal sign of the locale.
    placeholder: placeholder ?? affix?.sample,
    disabled,
    readOnly,
    // text-field/role: assistive technology tells the necessary state. The field adds no check of the platform, thus
    // the platform shows no error of its own.
    'aria-required': required || undefined,
    // text-field/name: the accessible name starts with the label. The prefix and the suffix come after it.
    'aria-labelledby': cx(labelId, prefix ? prefixId : null, suffix ? suffixId : null),
    'aria-describedby': describedBy(props['aria-describedby'], showCounter && counterId),
    'aria-keyshortcuts': props['aria-keyshortcuts'],
    // text-field/input-type: the keyboard, the enter key, and the autofill of the type.
    inputMode: props.inputMode ?? spec.inputMode,
    enterKeyHint: props.enterKeyHint ?? spec.enterKeyHint,
    autoComplete: props.autoComplete ?? spec.autoComplete,
    autoCapitalize: props.autoCapitalize ?? spec.autoCapitalize,
    autoCorrect: spec.plain ? 'off' : undefined,
    spellCheck: spec.plain ? false : undefined,
    // text-field/direction-end: digits, phone numbers, and codes keep their left-to-right order.
    dir: spec.ltr ? 'ltr' : undefined,
    onValueChange: (next: string) => {
      if (!composing.current) {
        setCounted(next)
        recheck(next)
      }
      onValueChange?.(next)
    },
    onFocus: (event: FocusEvent<HTMLElement>) => {
      focused.current = true
      props.onFocus?.(event)
    },
    onBlur: (event: FocusEvent<HTMLElement>) => {
      focused.current = false
      save(validateField())
      props.onBlur?.(event)
    },
    onKeyDown: (event: KeyboardEvent<HTMLElement> & { preventBaseUIHandler: () => void }) => {
      if (event.key === 'Enter' && !multi) {
        // text-field/composition: Enter confirms the candidate of the input method editor. It does not validate and does
        // not send the form. Safari sends this key after the end of the composition: thus also stop the send there.
        if (composing.current || event.nativeEvent.isComposing || event.keyCode === 229) {
          event.preventBaseUIHandler()
          if (!event.nativeEvent.isComposing) event.preventDefault()
        } else {
          save(validateField())
        }
      }
      props.onKeyDown?.(event)
    },
    onCompositionStart: () => {
      composing.current = true
    },
    onCompositionEnd: (event: { currentTarget: { value: string } }) => {
      composing.current = false
      setCounted(event.currentTarget.value)
      recheck(event.currentTarget.value)
    },
  } as const

  /** text-field/target: a press on an add-on moves the focus to the input. */
  const focusInput = (event: MouseEvent<HTMLDivElement>) => {
    const el = inputRef.current
    if (!el || disabled || event.target === el) return
    event.preventDefault()
    el.focus()
  }

  const box = multi ? (
    <Input
      {...control}
      data-part="input"
      render={<textarea rows={props.rows} />}
      // text-field/multi-line: the textarea is the box. Base UI sets data-invalid and data-disabled on it.
      className={cx(fieldBox, textFieldArea)}
    />
  ) : (
    <div
      data-part="input"
      data-invalid={invalid || undefined}
      data-disabled={disabled || undefined}
      onMouseDown={focusInput}
      className={cx(fieldBox, textFieldGroup)}
    >
      {icon ? (
        <span aria-hidden="true" data-part="start-icon" className={textFieldIcon}>
          {icon}
        </span>
      ) : null}
      {/* text-field/direction: <bdi> keeps the order of the characters of an add-on, for example "GH₵" in right-to-left.
          The add-on itself keeps the direction of the field, thus its line stays between it and the value. */}
      {prefix ? (
        <span id={prefixId} data-part="prefix" className={textFieldPrefix}>
          <bdi>{prefix}</bdi>
        </span>
      ) : null}
      <Input
        {...control}
        data-part="control"
        type={spec.html}
        maxLength={props.maxLength}
        className={cx(
          textFieldInput,
          icon && !prefix ? textFieldInputStart.addOn : textFieldInputStart.edge,
          hint && !suffix ? textFieldInputEnd.addOn : textFieldInputEnd.edge,
          spec.ltr && textFieldLtr,
        )}
      />
      {suffix ? (
        <span id={suffixId} data-part="suffix" className={textFieldSuffix}>
          <bdi>{suffix}</bdi>
        </span>
      ) : null}
      {hint ? (
        <kbd aria-hidden="true" data-part="hint" className={textFieldHint}>
          <bdi>{hint}</bdi>
        </kbd>
      ) : null}
    </div>
  )

  return (
    <Field.Root
      data-mono="text-field"
      data-variant={multi ? 'multi-line' : 'single-line'}
      disabled={disabled}
      invalid={invalid}
      className={cx(fieldGroup, textFieldVars, className)}
    >
      <div className={textFieldLabelRow}>
        <Field.Label id={labelId} data-part="label" className={fieldLabel}>
          <span className={fieldLabelText}>{label}</span>
          {optional ? (
            <>
              {' '}
              <span data-part="optional-mark" className={fieldOptional}>
                {optionalText}
              </span>
            </>
          ) : null}
        </Field.Label>
        {showCounter ? (
          <span id={counterId} data-part="counter" className={textFieldCounter}>
            {numbers.format(count)} / {numbers.format(limit)}
          </span>
        ) : null}
      </div>
      {box}
      {message?.kind === 'error' ? (
        <FieldError>{message.text}</FieldError>
      ) : message?.kind === 'warning' ? (
        <FieldWarning>{message.text}</FieldWarning>
      ) : helpText ? (
        <FieldHelp>{helpText}</FieldHelp>
      ) : null}
    </Field.Root>
  )
}
