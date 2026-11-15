// The Alert and the banner of the language (contract: ir/contracts/alert.json). The Button gives the action and the Icon
// button gives the close button: they bring their behavior, their accessibility, and their moment press. The tokens and
// the geometry of the contract give the look (alert.variants.ts, components.css).
import { type MouseEvent, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Button } from '../button/button'
import { IconButton } from '../icon-button/icon-button'
import { AlertCloseIcon, toneIcons } from './alert.icons'
import {
  type AlertMotion,
  type AlertTone,
  type AlertVariant,
  type BannerTone,
  alertActionBelow,
  alertActions,
  alertBody,
  alertColumn,
  alertClip,
  alertClose,
  alertContainer,
  alertFills,
  alertIconBox,
  alertIconColors,
  alertIconLine,
  alertMessage,
  alertMotions,
  alertRoot,
  alertSecondLine,
  alertShapes,
  alertTexts,
  alertTitle,
} from './alert.variants'
import { cx } from '@monorithm/react/lib/cx'
import { useMoment } from '@monorithm/react/hooks/use-moment'
import type { Moment } from '@monorithm/react/lib/moments'

/** The one action of an alert: a small button that solves the problem (alert/action, alert/action-solves). */
export interface AlertAction {
  /** The label: the step for the user, as a verb. "Try again", "Update stock" (alert/action). */
  label: ReactNode
  /** Called at the press. The moment press comes first (alert/button-moment). */
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
  /** The cause of the disabled state, for assistive technology. Also tell it in the text of the alert (alert/disabled). */
  disabledReason?: string
}

interface CommonProps {
  /** The result of the message: "Payment failed", "Message not sent". Never only the word Error (alert/title). */
  title: ReactNode
  /** The details of the message and the step for the user. */
  text: ReactNode
  /** One action or no action (alert/action). */
  action?: AlertAction
  /** Put the action below the text. Set it on a phone (alert/phone). */
  actionBelow?: boolean
  id?: string
  className?: string
}

/** An inline alert: in a section or in a form. It has no close button, and it stays until its section changes (alert/time). */
export interface InlineAlertProps extends CommonProps {
  variant?: 'inline'
  /** The type of the message. The default is info. Use danger only when the user must do an action (alert/danger-use). */
  tone?: AlertTone
  icon?: never
  secondLine?: never
  blocking?: never
  onDismiss?: never
  dismissLabel?: never
}

/** The tone of a banner. A neutral banner has the icon of its message, for example offline (alert/icon). */
type BannerToneProps = { tone?: AlertTone; icon?: never } | { tone: 'neutral'; icon: ReactNode }

/**
 * The close button of a banner. A banner about a blocking problem has no close button (alert/blocking). The close button
 * needs its accessible name (alert/close-name).
 */
type BannerCloseProps =
  | { blocking?: false; onDismiss?: undefined; dismissLabel?: undefined }
  | {
      blocking?: false
      /** Called when the banner closes: after the press on the close button and the exit motion (alert/close). */
      onDismiss: () => void
      /** The accessible name of the close button: the action, for example "Close" (alert/close-name). */
      dismissLabel: string
    }
  | { blocking: true; onDismiss?: never; dismissLabel?: never }

/** A banner: below the header of a page or the app bar of a screen. It is about the page or the account (alert/use). */
export type BannerProps = CommonProps &
  BannerToneProps &
  BannerCloseProps & {
    variant: 'banner'
    /** A second line of text, in the small size. */
    secondLine?: ReactNode
  }

export type AlertProps = InlineAlertProps | BannerProps

/** alert/moment: the moment of each tone. An info alert and a neutral banner emit no moment. */
const toneMoments: Partial<Record<BannerTone, Moment>> = { success: 'success', warning: 'warning', danger: 'error' }

/** alert/motion: a banner and an inline warning alert expand, an inline danger alert fades, the others show. */
const motionOf = (variant: AlertVariant, tone: BannerTone): AlertMotion =>
  variant === 'banner' || tone === 'warning' ? 'expand' : tone === 'danger' ? 'fade' : 'none'

export function Alert(props: AlertProps) {
  const { title, text, action, actionBelow, id, className } = props
  const variant: AlertVariant = props.variant ?? 'inline'
  const tone: BannerTone = props.tone ?? 'info'
  const banner = props.variant === 'banner'
  // alert/blocking and alert/time: only a banner that the user can close has a close button.
  const onDismiss = banner && !props.blocking ? props.onDismiss : undefined
  const emit = useMoment('alert')
  const root = useRef<HTMLDivElement>(null)
  const entered = useRef(false)
  const [phase, setPhase] = useState<'shown' | 'ending' | 'closed'>('shown')

  // alert/moment: the moment of the tone at the first frame of the entrance. A layout effect runs before the browser
  // paints that frame. The ref stops a second moment: a new render, or a new tone, is not a new entrance.
  useLayoutEffect(() => {
    if (entered.current) return
    entered.current = true
    const moment = toneMoments[tone]
    if (moment) emit(moment)
  }, [emit, tone])

  // alert/close and alert/motion: the banner goes back, then it closes. The exit motion is a transition of the root
  // (data-ending-style). With no running transition (for example in jsdom), the banner closes immediately.
  useEffect(() => {
    if (phase !== 'ending') return
    let active = true
    const close = () => {
      if (!active) return
      active = false
      setPhase('closed')
      onDismiss?.()
    }
    const running = root.current?.getAnimations?.() ?? []
    if (running.length === 0) close()
    else void Promise.allSettled(running.map((a) => a.finished)).then(close)
    return () => {
      active = false
    }
  }, [phase, onDismiss])

  if (phase === 'closed') return null

  const Icon = tone === 'neutral' ? null : toneIcons[tone]
  // alert/role and alert/announce: the region has the title and the text, not the buttons. A danger alert is an alert
  // (assertive: it stops the current speech). The others are a status (polite: they wait). The two roles are atomic, so
  // the screen reader speaks the title and the text one time, together.
  const message = (
    <div role={tone === 'danger' ? 'alert' : 'status'} data-part="message" className={cx(alertMessage, !actionBelow && 'flex-1')}>
      <span aria-hidden="true" data-part="icon" className={cx(alertIconLine, alertIconColors[tone])}>
        <span className={alertIconBox}>{Icon ? <Icon /> : props.icon}</span>
      </span>
      <div data-part="body" className={alertBody}>
        <div data-part="title" className={alertTitle}>
          {title}
        </div>
        <div data-part="text" className={alertTexts[variant]}>
          {text}
        </div>
        {banner && props.secondLine ? (
          <div data-part="second-line" className={alertSecondLine}>
            {props.secondLine}
          </div>
        ) : null}
      </div>
    </div>
  )
  // alert/action: one small button. alert/press: it scales to 0.97 at pointer down (the Button).
  const actionButton = action ? (
    <Button size="sm" variant="outline" disabled={action.disabled} disabledReason={action.disabledReason} onClick={action.onClick}>
      {action.label}
    </Button>
  ) : null
  // alert/close: a small ghost icon button at the end side. alert/press: it scales to 0.96 at pointer down.
  const close = onDismiss ? (
    <span data-part="close" className={alertClose}>
      <IconButton size="sm" variant="ghost" label={props.dismissLabel ?? ''} icon={<AlertCloseIcon />} onClick={() => setPhase('ending')} />
    </span>
  ) : null
  const container = cx(alertContainer, alertShapes[variant], alertFills[tone], actionBelow ? 'items-start' : 'items-center')

  return (
    <div
      ref={root}
      id={id}
      data-mono="alert"
      data-variant={variant}
      data-tone={tone}
      data-ending-style={phase === 'ending' ? '' : undefined}
      className={cx(alertRoot, alertMotions[motionOf(variant, tone)], className)}
    >
      <div className={alertClip}>
        {actionBelow ? (
          // alert/phone: the action goes below the text. The close button stays at the end side.
          <div data-part="container" className={container}>
            <div className={alertColumn}>
              {message}
              {actionButton ? (
                <span data-part="action" className={alertActionBelow}>
                  {actionButton}
                </span>
              ) : null}
            </div>
            {close}
          </div>
        ) : (
          <div data-part="container" className={container}>
            {message}
            {actionButton || close ? (
              <div data-part="actions" className={alertActions}>
                {actionButton ? (
                  <span data-part="action" className="inline-flex">
                    {actionButton}
                  </span>
                ) : null}
                {close}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
