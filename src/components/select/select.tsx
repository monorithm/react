// The Select of the language (contract: ir/contracts/select.json). Base UI gives the behavior and the accessibility of
// the list: the combobox, the listbox, the keys, the typeahead, the position, and the value for the form. The tokens and
// the geometry of the contract give the look (select.variants.ts, components.css). On a phone, the Select uses the
// select of the system (select.native.tsx).
import { DirectionProvider } from '@base-ui/react/direction-provider'
import { Select as Base } from '@base-ui/react/select'
import { type ReactNode, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { cx, describedBy } from '@monorithm/react/lib/cx'
import { useMoment } from '@monorithm/react/hooks/use-moment'
import { SelectLabelText, SelectMessage } from './select.field'
import { SelectChevron } from './select.icons'
import { SelectNative, useSystemPicker } from './select.native'
import { SelectItem, type SelectOption } from './select.option'
import {
  selectChevron,
  selectField,
  selectLabel,
  selectList,
  selectPopup,
  selectPositioner,
  type SelectSize,
  selectTrigger,
  selectTriggerEnd,
  selectValue,
} from './select.variants'

export interface SelectProps {
  /** The name of the select, above the trigger. "Category" (select/name). The placeholder is not the label. */
  label: ReactNode
  /** The options: a short list (select/use). For a long list, use a combobox. */
  options: readonly SelectOption[]
  /** The value of the selected option, or null for no selection. */
  value?: string | null
  defaultValue?: string | null
  /** Called at the change of the value. The moment select comes first (select/moment). */
  onValueChange?: (value: string | null) => void
  /** The text of the trigger when no option is selected, in the muted text color (select/trigger). */
  placeholder?: string
  /** One line of help text below the trigger (select/help). */
  help?: ReactNode
  /** The error. It replaces the help text, and tells how to correct the value (select/error). Show it only after the
   * user moves away from the select or sends the form (select/error-time). */
  error?: ReactNode
  /** The cause of the disabled state. It replaces the help text when the select is disabled (select/disabled). */
  disabledReason?: ReactNode
  /** An optional select: the label ends with the word optional (select/name). A necessary select has no mark. */
  optional?: boolean
  /** The word after the label of an optional select. The default is "(optional)". */
  optionalLabel?: ReactNode
  size?: SelectSize
  disabled?: boolean
  required?: boolean
  /** The form sends the value of the selected option under this name (select/form). */
  name?: string
  form?: string
  id?: string
  /**
   * true: a native select that opens the picker of the system. false: the list of the language. With no value, the
   * Select uses the native select on a phone: a device with touch as the primary input and no hover
   * (select/system-picker).
   */
  native?: boolean
  /** The list is open at the first render. */
  defaultOpen?: boolean
  /** Called when the list opens or closes. The moments open and close come first (select/moment). */
  onOpenChange?: (open: boolean) => void
  className?: string
  'aria-describedby'?: string
}

export function Select({ native, ...props }: SelectProps) {
  const phone = useSystemPicker()
  return (native ?? phone) ? <SelectNative {...props} /> : <SelectListbox {...props} />
}

/** The axes of the trigger, for the list in the portal: the list is not inside the elements of the trigger. */
interface Context {
  theme?: string
  density?: string
  motion?: string
  dir: 'ltr' | 'rtl'
  /** The gap between the trigger and the list, from the geometry: --mono-select-list-gap (select/list). */
  gap: number
}

const NO_CONTEXT: Context = { dir: 'ltr', gap: 0 }

function contextOf(trigger: HTMLElement | null): Context {
  if (!trigger) return NO_CONTEXT
  const axis = (name: string) => trigger.closest(`[${name}]`)?.getAttribute(name) ?? undefined
  const gap = Number.parseFloat(getComputedStyle(trigger).getPropertyValue('--mono-select-list-gap'))
  return {
    theme: axis('data-theme'),
    density: axis('data-density'),
    motion: axis('data-motion'),
    dir: axis('dir') === 'rtl' ? 'rtl' : 'ltr',
    gap: Number.isFinite(gap) ? gap : 0,
  }
}

// A key that types a character: typeahead (select/typeahead). Space opens the list.
const types = (event: { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean }) =>
  event.key.length === 1 && event.key !== ' ' && !event.ctrlKey && !event.metaKey && !event.altKey

function SelectListbox(props: SelectProps) {
  const { label, options, value, defaultValue, onValueChange, placeholder, error, optional, size = 'md', disabled, required, name, form, id } = props
  const help = disabled && props.disabledReason ? props.disabledReason : props.help
  const emit = useMoment('select')
  const messageId = useId()
  const trigger = useRef<HTMLButtonElement>(null)
  const popup = useRef<HTMLDivElement>(null)
  const [open, setOpenState] = useState(props.defaultOpen === true && !disabled)
  const isOpen = useRef(open)
  const current = useRef<string | null>(defaultValue ?? null)
  const pendingKey = useRef<string | null>(null)
  const [context, setContext] = useState<Context>(NO_CONTEXT)

  const setOpen = (next: boolean) => {
    // select/disabled: the list of a disabled select does not open. select/moment: thus it emits no moment.
    if (next && disabled) return
    if (isOpen.current === next) return
    isOpen.current = next
    // select/moment: open when the list opens, close when it closes.
    emit(next ? 'open' : 'close')
    setOpenState(next)
    props.onOpenChange?.(next)
  }

  // The list in the portal gets the axes of the trigger before the first frame.
  useLayoutEffect(() => {
    if (open) setContext(contextOf(trigger.current))
  }, [open])

  // select/typeahead: a key opens a closed list. Then the open list gets the key: its typeahead moves the active option.
  useEffect(() => {
    const key = pendingKey.current
    if (!open || key === null) return
    pendingKey.current = null
    const timer = setTimeout(() => {
      popup.current?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
    })
    return () => clearTimeout(timer)
  }, [open])

  return (
    <div data-mono="select" data-size={size} className={cx(selectField, props.className)}>
      <Base.Root<string>
        id={id}
        items={options}
        value={value}
        defaultValue={defaultValue}
        // select/disabled: Base UI takes a disabled trigger out of the focus order. Thus the select is read-only for
        // Base UI, and the open state stays closed.
        readOnly={disabled}
        required={required}
        name={disabled ? undefined : name}
        form={form}
        open={open}
        onOpenChange={(next) => setOpen(next)}
        onValueChange={(next) => {
          const now = value !== undefined ? value : current.current
          if (next === now) return
          current.current = next
          // select/moment: select comes at the change of the value, before close.
          emit('select')
          onValueChange?.(next)
        }}
      >
        <Base.Label data-part="label" className={selectLabel}>
          <SelectLabelText label={label} optional={optional} optionalLabel={props.optionalLabel ?? '(optional)'} />
        </Base.Label>
        <Base.Trigger
          ref={trigger}
          data-part="trigger"
          data-disabled={disabled ? '' : undefined}
          aria-disabled={disabled || undefined}
          aria-readonly={undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(props['aria-describedby'], Boolean(error || help) && messageId)}
          onKeyDown={(event) => {
            if (disabled || open) return
            // select/keyboard: with no selection, the up arrow also makes the first option active. Base UI makes the
            // last option active, thus the Home key of the open list replaces it.
            const now = value !== undefined ? value : current.current
            const key = types(event) ? event.key : event.key === 'ArrowUp' && now === null ? 'Home' : null
            if (key === null) return
            // select/typeahead: a closed list opens. Base UI selects the option at once, thus its handler does not run.
            event.preventBaseUIHandler()
            event.preventDefault()
            pendingKey.current = key
            setOpen(true)
          }}
          className={cx(selectTrigger(size, Boolean(error), Boolean(disabled)), selectTriggerEnd)}
        >
          <Base.Value data-part="value" placeholder={placeholder} className={selectValue} />
          <Base.Icon data-part="chevron" className={selectChevron}>
            <SelectChevron />
          </Base.Icon>
        </Base.Trigger>
        <SelectMessage help={help} error={error} id={messageId} />
        {/* select/direction: the list opens from the start corner of the trigger. In right-to-left, the right corner. */}
        <DirectionProvider direction={context.dir}>
          <Base.Portal>
            <Base.Positioner
              data-mono="select"
              data-theme={context.theme}
              data-density={context.density}
              data-motion={context.motion}
              dir={context.dir}
              // select/list: 4 px below the trigger, or 4 px above it if it does not fit below.
              side="bottom"
              align="start"
              sideOffset={context.gap}
              alignItemWithTrigger={false}
              className={selectPositioner}
            >
              <Base.Popup ref={popup} data-part="list" className={selectPopup}>
                <Base.List className={selectList}>
                  {options.map((option) => (
                    <SelectItem key={option.value} option={option} />
                  ))}
                </Base.List>
              </Base.Popup>
            </Base.Positioner>
          </Base.Portal>
        </DirectionProvider>
      </Base.Root>
    </div>
  )
}
