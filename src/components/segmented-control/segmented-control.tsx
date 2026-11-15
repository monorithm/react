// The Segmented control of the language (contract: ir/contracts/segmented-control.json). Base UI (Radio group) gives
// the behavior and the accessibility: a radio group with its name, a radio button for each segment, the arrow keys,
// and the value for the form. The tokens and the geometry of the contract give the look (segmented-control.variants.ts).
import { DirectionProvider, type TextDirection, useDirection } from '@base-ui/react/direction-provider'
import { Radio as BaseRadio } from '@base-ui/react/radio'
import { RadioGroup as BaseGroup } from '@base-ui/react/radio-group'
import { type CSSProperties, type ReactNode, useId, useLayoutEffect, useRef, useState } from 'react'
import { cx } from '@monorithm/react/lib/cx'
import { FOCUS } from '@monorithm/react/lib/row'
import { useMoment } from '@monorithm/react/hooks/use-moment'
import { pill, segment, segmentIcon, segmentLabel, segmentLabelLayer, type Size, track, trackHeights } from './segmented-control.variants'

/** One option of the control. */
export interface Segment {
  value: string
  /** The name of the option, for example "30d". It is also the accessible name (segmented-control/role). */
  label: string
  /** An icon at the start side of the label. Assistive technology does not read it (segmented-control/icon). */
  icon?: ReactNode
  /** Show only the icon. The label stays the accessible name, for example "Grid" (segmented-control/icon). */
  iconOnly?: boolean
  disabled?: boolean
  /** The cause of the disabled state, for assistive technology (segmented-control/disabled). Also show it on the screen. */
  disabledReason?: string
}

/** Two to five segments (segmented-control/count). */
export type Segments =
  | readonly [Segment, Segment]
  | readonly [Segment, Segment, Segment]
  | readonly [Segment, Segment, Segment, Segment]
  | readonly [Segment, Segment, Segment, Segment, Segment]

export interface SegmentedControlProps {
  /** The name of the group, for example "Period" or "View" (segmented-control/name). */
  label: string
  /** The options: two to five segments (segmented-control/count). */
  segments: Segments
  value?: string
  /** The selected segment at the start. The default is the first segment that is not disabled. */
  defaultValue?: string
  /** Called at the change of the selection, with the value of the selected segment. */
  onValueChange?: (value: string) => void
  /** md: the default. lg: the large size, for a TV (segmented-control/tv). */
  size?: Size
  /** The full width of the container, with segments of the same width. Set it on a phone (segmented-control/full-width). */
  block?: boolean
  /** The form sends the value of the selected segment under this name. */
  name?: string
  disabled?: boolean
  id?: string
  className?: string
}

/** The direction of the layout of an element: the CSS direction, or the dir attribute of an ancestor. */
const directionOf = (element: HTMLElement): TextDirection =>
  getComputedStyle(element).direction === 'rtl' || element.closest('[dir]')?.getAttribute('dir')?.toLowerCase() === 'rtl' ? 'rtl' : 'ltr'

export function SegmentedControl({
  label,
  segments,
  value,
  defaultValue,
  onValueChange,
  size = 'md',
  block,
  name,
  disabled,
  id,
  className,
}: SegmentedControlProps) {
  const emit = useMoment('segmented-control')
  const reasonId = useId()
  const ref = useRef<HTMLDivElement>(null)
  // segmented-control/count: one segment is selected. With no value, the first segment that is not disabled.
  const [inner, setInner] = useState(() => defaultValue ?? (segments.find((s) => !s.disabled) ?? segments[0]).value)
  const current = value ?? inner
  const index = segments.findIndex((s) => s.value === current)
  // segmented-control/motion-keyboard: the last input. A key selects spring-quick for the pill, a pointer spring-control.
  const [input, setInput] = useState<'pointer' | 'keyboard'>('pointer')
  // segmented-control/direction-keys: Base UI reads the direction from its context. The control gives it the direction of
  // the layout. Thus the left arrow key selects the segment at the left, also in right-to-left.
  const contextDirection = useDirection()
  const [layoutDirection, setLayoutDirection] = useState<TextDirection | null>(null)
  const readDirection = () => {
    if (ref.current) setLayoutDirection(directionOf(ref.current))
  }
  useLayoutEffect(readDirection, [])
  return (
    <DirectionProvider direction={layoutDirection ?? contextDirection}>
      <BaseGroup
        ref={ref}
        id={id}
        data-mono="segmented-control"
        data-size={size}
        data-input={input}
        aria-label={label}
        name={name}
        value={current}
        disabled={disabled}
        onKeyDownCapture={() => setInput('keyboard')}
        onPointerDownCapture={() => setInput('pointer')}
        onFocusCapture={readDirection}
        // segmented-control/moment: the moment comes at the change of the selection, not at the end of the pill motion.
        // A press on the selected segment and a disabled segment make no change, thus no moment.
        onValueChange={(next: unknown) => {
          if (next === current) return
          emit('select')
          setInner(next as string)
          onValueChange?.(next as string)
        }}
        style={{ '--seg-count': segments.length, '--seg-index': index } as CSSProperties}
        className={cx(track, trackHeights[size], block ? 'grid w-full' : 'inline-grid', className)}
      >
        {index >= 0 ? <span aria-hidden="true" data-part="pill" className={pill} /> : null}
        {segments.map((s, i) => {
          const reason = s.disabled && s.disabledReason ? `${reasonId}-${i}` : undefined
          return (
            <BaseRadio.Root
              key={s.value}
              value={s.value}
              disabled={s.disabled}
              aria-label={s.iconOnly ? s.label : undefined}
              aria-describedby={reason}
              data-part="segment"
              // segmented-control/focus: the focus ring of the language, for keyboard focus only.
              className={cx(segment, FOCUS)}
            >
              {s.icon ? (
                <span aria-hidden="true" data-part="icon" className={segmentIcon}>
                  {s.icon}
                </span>
              ) : null}
              {s.iconOnly ? null : (
                <span data-part="label" className={segmentLabel}>
                  <span className={segmentLabelLayer}>{s.label}</span>
                  <span aria-hidden="true" className={cx(segmentLabelLayer, 'invisible font-mono-strong')}>
                    {s.label}
                  </span>
                </span>
              )}
              {reason ? (
                <span id={reason} hidden>
                  {s.disabledReason}
                </span>
              ) : null}
            </BaseRadio.Root>
          )
        })}
      </BaseGroup>
    </DirectionProvider>
  )
}
