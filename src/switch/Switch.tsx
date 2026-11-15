// The Switch of the language (contract: ir/contracts/switch.json). Base UI gives the behavior and the accessibility.
// The tokens and the geometry of the contract give the look: each size comes from --mono-switch-* (components.css).
import { Switch as Base } from '@base-ui/react/switch'
import { type ReactNode, useId } from 'react'
import { useMoment } from '../moments/moments.tsx'

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

const row = [
  'group/switch flex w-full cursor-pointer items-center justify-between gap-3',
  // switch/target: the full row is the target, 44 px high or more in the touch density.
  'min-h-(--mono-size-target-min)',
  'has-[[data-disabled]]:cursor-not-allowed',
].join(' ')

const track = [
  'relative inline-flex shrink-0 rounded-mono-full outline-none',
  'w-(--mono-switch-track-width) h-(--mono-switch-track-height)',
  // Off: the pressed fill with a ring in line-strong. On: the accent fill (switch/on-sign).
  'bg-mono-pressed shadow-[inset_0_0_0_1px_var(--mono-color-role-line-strong)]',
  'data-[checked]:bg-mono-accent data-[checked]:shadow-none',
  'transition-[background-color,box-shadow] duration-(--mono-spring-control-duration) ease-(--mono-spring-control)',
  // switch/focus: the focus ring of the language.
  'focus-visible:outline-solid focus-visible:outline-(length:--mono-focus-ring-width) focus-visible:outline-mono-ring',
  'focus-visible:outline-offset-(--mono-focus-ring-offset)',
  // switch/disabled
  'data-[disabled]:opacity-(--mono-opacity-disabled)',
  // switch/motion: reduced motion (the system option, or data-motion="reduced" on an ancestor) has no movement.
  'motion-reduce:transition-none [[data-motion=reduced]_&]:transition-none',
].join(' ')

const knob = [
  'absolute top-(--mono-switch-knob-inset) start-(--mono-switch-knob-inset)',
  'size-(--mono-switch-knob-size) rounded-mono-full bg-mono-switch-knob-off shadow-mono-knob',
  'data-[checked]:bg-mono-switch-knob-on',
  // switch/on-sign and switch/direction: on moves the knob to the end side. In right-to-left, the end side is the left.
  'data-[checked]:translate-x-(--mono-switch-knob-travel) rtl:data-[checked]:-translate-x-(--mono-switch-knob-travel)',
  'transition-[translate,background-color] duration-(--mono-spring-control-duration) ease-(--mono-spring-control)',
  'motion-reduce:transition-none [[data-motion=reduced]_&]:transition-none',
].join(' ')

export function Switch({ label, description, disabledReason, checked, defaultChecked, onCheckedChange, disabled, name, id, className }: SwitchProps) {
  const emit = useMoment('switch')
  const labelId = useId()
  const descriptionId = useId()
  const help = disabled && disabledReason ? disabledReason : description
  return (
    <label data-mono="switch" className={className ? `${row} ${className}` : row}>
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
        className={track}
      >
        <Base.Thumb className={knob} />
      </Base.Root>
    </label>
  )
}
