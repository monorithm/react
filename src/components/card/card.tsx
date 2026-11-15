// The Card of the language (contract: ir/contracts/card.json): a surface that holds the content of one item. The tokens
// and the geometry of the contract give the look (card.variants.ts, components.css).
// An interactive card is one link (href) or one button (onPress). Its title is the target, and the ::after of the
// target covers the full card (card/one-target). A control in the card stays a separate target above it, with its focus
// stop after the focus stop of the card (card/nested-control). Thus an interactive card needs a title: a CardHeader or
// a CardStat. Put each control after the title in the DOM.
import { type MouseEvent, type ReactNode, type Ref, useId, useMemo } from 'react'
import { cx } from '@monorithm/react/lib/cx'
import { CardContext, type CardTarget } from './card.context'
import { cardBase, cardInteractive, cardPaddings, cardShimmerKeyframes, type CardSize, type CardVariant } from './card.variants'

interface CommonProps {
  /** basic (the default), stat, chart, or content. */
  variant?: CardVariant
  /** md: a padding of 16 px (the default). lg: a padding of 20 px (card/padding). */
  size?: CardSize
  /** The card shows a skeleton with the layout of its parts. The size of the card does not change (card/loading). */
  loading?: boolean
  /** The parts: CardMedia, CardHeader, CardStat, CardBody, CardChart, and CardFooter. */
  children: ReactNode
  id?: string
  className?: string
  ref?: Ref<HTMLDivElement>
}

/** A static card: no focus stop, no hover state, no pressed state, and no disabled state (card/static). */
type StaticProps = { href?: undefined; onPress?: undefined; disabled?: never; disabledReason?: never }

interface InteractiveProps {
  /** The card does not start its action. It stays in the focus order (card/disabled). */
  disabled?: boolean
  /** The cause of the disabled state, for assistive technology (card/disabled). Also show the cause on the screen. */
  disabledReason?: string
}

/** A card that opens a page is a link (card/link-or-button). */
type LinkProps = InteractiveProps & { href: string; onPress?: never }

/** A card that starts an action on the same screen is a button (card/link-or-button). The moment press comes first. */
type ButtonProps = InteractiveProps & { onPress: (event: MouseEvent<HTMLButtonElement>) => void; href?: never }

export type CardProps = CommonProps & (StaticProps | LinkProps | ButtonProps)

export function Card(props: CardProps) {
  const { variant = 'basic', size = 'md', loading = false, children, id, className, ref } = props
  const reasonId = useId()
  const interactive = props.href !== undefined || props.onPress !== undefined
  const disabled = interactive && props.disabled === true
  const reason = disabled && props.disabledReason ? reasonId : undefined
  const href = props.href
  const onPress = props.onPress
  const context = useMemo(() => {
    let target: CardTarget | null = null
    if (href !== undefined) target = { kind: 'link', href, disabled, describedBy: reason }
    else if (onPress !== undefined) target = { kind: 'button', onPress, disabled, describedBy: reason }
    return { target, loading }
  }, [href, onPress, disabled, reason, loading])
  return (
    <div
      ref={ref}
      id={id}
      data-mono="card"
      data-variant={variant}
      data-size={size}
      data-interactive={context.target?.kind}
      data-disabled={disabled || undefined}
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      className={cx(cardBase, cardPaddings[size], interactive && cardInteractive, className)}
    >
      <CardContext.Provider value={context}>{children}</CardContext.Provider>
      {reason ? (
        <span id={reasonId} hidden>
          {props.disabledReason}
        </span>
      ) : null}
      {/* card/loading: the keyframes of the shimmer. React puts one copy in the head of the document. */}
      {loading ? (
        <style href="mono-card-shimmer" precedence="mono">
          {cardShimmerKeyframes}
        </style>
      ) : null}
    </div>
  )
}
