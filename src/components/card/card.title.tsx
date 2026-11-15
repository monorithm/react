// The title of the Card (contract: ir/contracts/card.json): a heading at the level that the screen sets
// (card/heading-level). In an interactive card, the title is the target: one link or one button with the title as its
// name (card/role, card/name). Its ::after covers the full card (card/one-target).
import { Button as Base } from '@base-ui/react/button'
import { type MouseEvent, type ReactNode, useContext } from 'react'
import { cx } from '@monorithm/react/lib/cx'
import { useMoment } from '@monorithm/react/hooks/use-moment'
import { CardContext } from './card.context'
import { type CardHeadingLevel, cardShape, cardShapeRadius, cardTarget } from './card.variants'

export interface CardTitleProps {
  level: CardHeadingLevel
  children: ReactNode
  className?: string
}

export function CardTitle({ level, children, className }: CardTitleProps) {
  const { target, loading } = useContext(CardContext)
  const emit = useMoment('card')
  const Heading = `h${level}` as const
  let content: ReactNode = children
  if (target?.kind === 'link') {
    content = target.disabled ? (
      // card/disabled: a disabled link has no href, thus it does not open the page. It stays in the focus order.
      <a data-part="target" role="link" tabIndex={0} aria-disabled="true" aria-describedby={target.describedBy} className={cardTarget}>
        {children}
      </a>
    ) : (
      // card/moment: the click comes at the release on the card, or at Enter.
      <a data-part="target" href={target.href} onClick={() => emit('press')} className={cardTarget}>
        {children}
      </a>
    )
  } else if (target?.kind === 'button') {
    const { onPress } = target
    content = (
      <Base
        data-part="target"
        type="button"
        // card/disabled: the button stays in the focus order. Base UI stops the press.
        disabled={target.disabled}
        focusableWhenDisabled
        aria-describedby={target.describedBy}
        onClick={(event: MouseEvent<HTMLButtonElement>) => {
          // card/moment: the click comes at the release on the card, or at Enter or Space.
          emit('press')
          onPress(event)
        }}
        className={cardTarget}
      >
        {children}
      </Base>
    )
  }
  return (
    <Heading data-part="title" className={cx(className, loading && cardShape, loading && cardShapeRadius)}>
      {content}
    </Heading>
  )
}
