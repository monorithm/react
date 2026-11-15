// The Button of the language (contract: ir/contracts/button.json). Base UI gives the behavior and the accessibility.
// The tokens and the geometry of the contract give the look (button.variants.ts, components.css).
import { Button as Base } from '@base-ui/react/button'
import { type ButtonHTMLAttributes, type MouseEvent, type ReactNode, type Ref, useId } from 'react'
import { ButtonSpinner } from './button.spinner'
import { buttonBase, buttonHeights, buttonIcon, buttonLayer, buttonPaddings, buttonVariants, type Size } from './button.variants'
import { cx, describedBy } from '@monorithm/react/lib/cx'
import { useMoment } from '@monorithm/react/hooks/use-moment'

/**
 * The other attributes of a button element. The Button passes them to its element, for example the attributes that the
 * trigger of a menu or a dialog adds (aria-haspopup, aria-expanded, aria-controls).
 */
export type ButtonNativeProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'type' | 'onClick' | 'disabled' | 'className' | 'value'>

interface CommonProps extends ButtonNativeProps {
  /** The label: the action, as a verb. "Save", "Mark as shipped" (button/name). */
  children: ReactNode
  size?: Size
  /** The full width of the container, with the height of the size (button/block). */
  block?: boolean
  /** An icon at the start side of the label. Assistive technology does not read it (button/icon). */
  startIcon?: ReactNode
  /** An icon at the end side of the label. */
  endIcon?: ReactNode
  disabled?: boolean
  /** The cause of the disabled state, for assistive technology (button/disabled). Also show the cause on the screen. */
  disabledReason?: string
  /** The type of the button. The default is "button": a button sends a form only with the type "submit" (button/type). */
  type?: 'button' | 'submit' | 'reset'
  /** Called at the press. The moment press comes first (button/moment). */
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void
  id?: string
  name?: string
  value?: string
  form?: string
  className?: string
  'aria-describedby'?: string
  ref?: Ref<HTMLButtonElement>
}

/** A button that can load. The loading label is necessary: it is the activity, for example "Saving" (button/loading). */
type LoadingProps = { loading?: undefined; loadingLabel?: undefined } | { loading: boolean; loadingLabel: ReactNode }

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link'

export type ButtonProps = CommonProps &
  (
    | ({ variant?: Exclude<ButtonVariant, 'link'> } & LoadingProps)
    // button/link-loading: a link button has no loading state.
    | { variant: 'link'; loading?: never; loadingLabel?: never }
    // A variant that is not known when the code compiles, with no loading state.
    | { variant: ButtonVariant; loading?: undefined; loadingLabel?: undefined }
  )

export function Button(props: ButtonProps) {
  const {
    children,
    size = 'md',
    block,
    startIcon,
    endIcon,
    disabled,
    disabledReason,
    type = 'button',
    onClick,
    className,
    ref,
    variant: _variant,
    loading: _loading,
    loadingLabel: _loadingLabel,
    'aria-describedby': describedByProp,
    // The other attributes (the id, the name, the value, the form, and the attributes of a trigger) go to the element.
    ...native
  } = props
  const variant = props.variant ?? 'secondary'
  const loading = variant !== 'link' && props.loading === true
  const emit = useMoment('button')
  const reasonId = useId()
  const reason = disabled && disabledReason ? reasonId : undefined
  return (
    <Base
      {...native}
      ref={ref}
      data-mono="button"
      data-variant={variant}
      data-size={size}
      data-loading={loading || undefined}
      type={type}
      // button/disabled and button/loading: the button stays in the focus order and keeps the focus. Base UI stops the press.
      disabled={disabled || loading}
      focusableWhenDisabled
      aria-describedby={describedBy(describedByProp, reason)}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        // button/moment: the click comes at the release on the button, or at Enter or Space.
        emit('press')
        onClick?.(event)
      }}
      className={cx(
        buttonBase,
        buttonVariants[variant],
        buttonHeights[size],
        variant === 'link' ? 'px-(--mono-button-link-padding)' : buttonPaddings[size],
        // button/press: the link has no scale.
        variant !== 'link' && '[--btn-press:var(--mono-scale-press)]',
        'rounded-mono-md [--btn-border-width:var(--mono-button-border)]',
        size === 'sm' ? 'text-mono-small' : 'text-mono-body',
        block ? 'flex w-full' : 'inline-flex',
        className,
      )}
    >
      {/* button/loading: the two layers share one cell of a grid. Thus the button keeps the width of the wider layer. */}
      <span className="grid">
        <span className={cx(buttonLayer, loading && 'invisible')} aria-hidden={loading || undefined}>
          {startIcon ? (
            <span aria-hidden="true" data-part="start-icon" className={buttonIcon}>
              {startIcon}
            </span>
          ) : null}
          <span data-part="label">{children}</span>
          {endIcon ? (
            <span aria-hidden="true" data-part="end-icon" className={buttonIcon}>
              {endIcon}
            </span>
          ) : null}
        </span>
        {props.loadingLabel !== undefined ? (
          <span className={cx(buttonLayer, !loading && 'invisible')} aria-hidden={!loading || undefined} data-part="activity">
            <ButtonSpinner />
            <span>{props.loadingLabel}</span>
          </span>
        ) : null}
      </span>
      {reason ? (
        <span id={reasonId} hidden>
          {disabledReason}
        </span>
      ) : null}
    </Base>
  )
}
