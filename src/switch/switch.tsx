// The Switch of the language (contract: ir/contracts/switch.json). Base UI gives the behavior and the accessibility.
// The tokens and the geometry of the contract give the look: each size comes from --mono-switch-* (components.css).
import { Switch as Base } from '@base-ui/react/switch'
import { type ReactNode, useId } from 'react'
import { useMoment } from '@monorithm/react/moments/moments'
import { switchKnob, switchRow, switchTrack } from '@monorithm/react/switch/switch.variants'

export interface SwitchProps {
  /** The name: the item that is on, not an action. "Alerts", not "Disable alerts" (switch/name). */
  label: ReactNode
  /** Help text under the label. */
  description?: ReactNode
  /** The cause of the disabled state. It replaces the description when the switch is disabled (switch/disabled). */
  disabledReason?: ReactNode
  checked?: boolean
  defaultChecked?: boolean
  /** Called at the change of the state, with the new state. The change applies immediately (switch/immediate). */
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  name?: string
  id?: string
  className?: string
}

export function Switch({ label, description, disabledReason, checked, defaultChecked, onCheckedChange, disabled, name, id, className }: SwitchProps) {
  const emit = useMoment('switch')
  const labelId = useId()
  const descriptionId = useId()
  const help = disabled && disabledReason ? disabledReason : description
  return (
    <label data-mono="switch" className={className ? `${switchRow} ${className}` : switchRow}>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span id={labelId} className="text-mono-fg-strong">
          {label}
        </span>
        {help ? (
          <span id={descriptionId} className="text-sm text-mono-fg">
            {help}
          </span>
        ) : null}
      </span>
      <Base.Root
        id={id}
        name={name}
        checked={checked}
        defaultChecked={defaultChecked}
        disabled={disabled}
        aria-labelledby={labelId}
        aria-describedby={help ? descriptionId : undefined}
        // switch/moment: the moment comes at the change of the state, not at the end of the knob motion.
        onCheckedChange={(next) => {
          emit('toggle', next ? 'on' : 'off')
          onCheckedChange?.(next)
        }}
        className={switchTrack}
      >
        <Base.Thumb className={switchKnob} />
      </Base.Root>
    </label>
  )
}
