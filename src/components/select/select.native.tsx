// The native mode of the Select (contract: ir/contracts/select.json, select/system-picker). On a phone, a native
// <select> opens the picker of the system. The trigger keeps the look of the language, and the field keeps the same
// label, help text, error, and form value as the list mode (select/surfaces).
import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import { cx, describedBy } from '@monorithm/react/lib/cx'
import { useMoment } from '@monorithm/react/hooks/use-moment'
import type { SelectProps } from './select'
import { SelectLabelText, SelectMessage } from './select.field'
import { SelectChevron } from './select.icons'
import { selectChevron, selectField, selectLabel, selectNativeChevron, selectNativeEnd, selectTrigger } from './select.variants'

/** The media of a phone: touch is the primary input, and the device has no hover. */
export const PHONE_MEDIA = '(hover: none) and (pointer: coarse)'

const phoneQuery = (): MediaQueryList | undefined =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(PHONE_MEDIA) : undefined

function subscribe(onChange: () => void): () => void {
  const query = phoneQuery()
  query?.addEventListener('change', onChange)
  return () => query?.removeEventListener('change', onChange)
}

/**
 * True on a phone (select/system-picker). The server and the first render of the client give false. Thus the
 * hydration matches, and a phone then changes to the native select.
 */
export function useSystemPicker(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => phoneQuery()?.matches === true,
    () => false,
  )
}

// The keys that open the picker of a native select.
const opens = (key: string, alt: boolean) => key === ' ' || key === 'F4' || (alt && (key === 'ArrowDown' || key === 'ArrowUp'))

export function SelectNative(props: SelectProps) {
  const { label, options, value, defaultValue, onValueChange, placeholder, error, optional, size = 'md', disabled, required, name, form, className } = props
  const help = disabled && props.disabledReason ? props.disabledReason : props.help
  const emit = useMoment('select')
  const autoId = useId()
  const id = props.id ?? autoId
  const messageId = useId()
  const ref = useRef<HTMLSelectElement>(null)
  const [own, setOwn] = useState(defaultValue ?? '')
  const shown = value !== undefined ? (value ?? '') : own
  // select/moment: the picker of the system tells no open state. The select keeps it from the press, the change, the
  // blur, and the cancel of the picker.
  const open = useRef(false)
  const show = () => {
    // On a phone, the picker is modal: a press on an "open" select tells that the last picker closed with no change.
    if (open.current) emit('close')
    open.current = true
    emit('open')
  }
  const hide = () => {
    if (!open.current) return
    open.current = false
    emit('close')
  }
  const hideRef = useRef(hide)
  hideRef.current = hide
  useEffect(() => {
    const el = ref.current
    const onCancel = () => hideRef.current()
    el?.addEventListener('cancel', onCancel)
    return () => el?.removeEventListener('cancel', onCancel)
  }, [])
  return (
    <div data-mono="select" data-size={size} data-native="" className={cx(selectField, className)}>
      <label htmlFor={id} data-part="label" className={selectLabel}>
        <SelectLabelText label={label} optional={optional} optionalLabel={props.optionalLabel ?? '(optional)'} />
      </label>
      <div className="relative">
        <select
          ref={ref}
          id={id}
          // select/disabled: a disabled select sends no value, as a disabled native select.
          name={disabled ? undefined : name}
          form={form}
          value={shown}
          required={required}
          // select/disabled: the select stays in the focus order. Thus it has aria-disabled, not the disabled attribute,
          // and the handlers stop the press, the keys, and the change.
          aria-disabled={disabled || undefined}
          data-disabled={disabled ? '' : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(props['aria-describedby'], Boolean(error || help) && messageId)}
          data-part="trigger"
          data-placeholder={shown === '' ? '' : undefined}
          onMouseDown={(event) => {
            if (disabled) event.preventDefault()
          }}
          onPointerDown={(event) => {
            if (!disabled && event.button === 0) show()
          }}
          onKeyDown={(event) => {
            if (disabled) {
              if (event.key !== 'Tab') event.preventDefault()
              return
            }
            if (opens(event.key, event.altKey)) show()
          }}
          onChange={(event) => {
            // A disabled select keeps its value: the controlled value puts the old option back.
            if (disabled) return
            const next = event.currentTarget.value
            // select/moment: select comes at the change of the value, before close.
            emit('select')
            setOwn(next)
            onValueChange?.(next === '' ? null : next)
            hide()
          }}
          onBlur={hide}
          className={cx(
            selectTrigger(size, Boolean(error), Boolean(disabled)),
            selectNativeEnd,
            shown === '' ? 'text-mono-fg-muted' : 'text-mono-fg',
            '[&>option]:text-mono-fg',
          )}
        >
          {/* select/form: with no selection, the form sends an empty value, as in the list mode. */}
          {shown === '' ? (
            <option value="" hidden>
              {placeholder ?? ''}
            </option>
          ) : null}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <span aria-hidden="true" data-part="chevron" className={cx(selectChevron, selectNativeChevron)}>
          <SelectChevron />
        </span>
      </div>
      <SelectMessage help={help} error={error} id={messageId} />
    </div>
  )
}
