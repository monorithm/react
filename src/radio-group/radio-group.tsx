// The Radio group of the language (contract: ir/contracts/radio-group.json). Base UI gives the behavior and the
// accessibility: the roles, the arrow keys, and the value for the form. The tokens and the geometry of the contract give
// the look: each size comes from --mono-radio-group-*.
import { RadioGroup as BaseGroup } from '@base-ui/react/radio-group'
import { type ReactNode, useId, useState } from 'react'
import { cx } from '@monorithm/react/lib/cx'
import { useMoment } from '@monorithm/react/moments/moments'
import { RadioGroupContext, type RadioGroupVariant } from '@monorithm/react/radio-group/radio-group.context'

export interface RadioGroupProps {
  /** The name of the group, for example "Delivery method" (radio-group/name). */
  label: ReactNode
  /** list: rows (the default). cards: option cards, for choices with a price or a time. */
  variant?: RadioGroupVariant
  value?: string
  defaultValue?: string
  /** Called at the change of the selection, with the value of the selected option. */
  onValueChange?: (value: string) => void
  /** The form sends the value of the selected option under this name (radio-group/form). */
  name?: string
  disabled?: boolean
  required?: boolean
  id?: string
  className?: string
  /** The options: Radio elements (radio-group.radio.tsx). */
  children: ReactNode
}

export function RadioGroup({ label, variant = 'list', value, defaultValue, onValueChange, name, disabled, required, id, className, children }: RadioGroupProps) {
  const emit = useMoment('radio-group')
  const labelId = useId()
  // radio-group/motion: the last input. A key selects spring-quick for the dot, a pointer selects spring-control.
  const [input, setInput] = useState<'pointer' | 'keyboard'>('pointer')
  return (
    <BaseGroup
      id={id}
      data-mono="radio-group"
      data-variant={variant}
      data-input={input}
      aria-labelledby={labelId}
      name={name}
      value={value}
      defaultValue={defaultValue}
      disabled={disabled}
      required={required}
      onKeyDownCapture={() => setInput('keyboard')}
      onPointerDownCapture={() => setInput('pointer')}
      // radio-group/moment: the moment comes at the change of the selection, not at the end of the dot motion.
      onValueChange={(next: unknown) => {
        emit('select')
        onValueChange?.(next as string)
      }}
      className={cx('flex flex-col', variant === 'cards' && 'gap-(--mono-radio-group-cards-gap)', className)}
    >
      <span id={labelId} className="mb-1 text-mono-small text-mono-fg-2">
        {label}
      </span>
      <RadioGroupContext.Provider value={variant}>{children}</RadioGroupContext.Provider>
    </BaseGroup>
  )
}
