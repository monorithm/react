// The media of the Card (contract: ir/contracts/card.json): the photo of a content card, at the top edge, with the photo
// counter and the stock badge (card/content, card/content-counter). Put it first in the card.
import { type ReactNode, useContext } from 'react'
import { cx } from '@monorithm/react/lib/cx'
import { CardContext } from './card.context'
import { cardMedia, cardMediaLabel, cardShape } from './card.variants'

export interface CardMediaProps {
  /** The photo: an img element with its alt text. */
  children: ReactNode
  /** The photo counter, for example "Photo 1 of 4" (card/content-counter). */
  counter: ReactNode
  /**
   * The stock badge, as text, for example "In stock" or "Sold out". Color is not the only sign of the stock
   * (card/content-counter). Do not show an item that is not available as available (card/availability).
   */
  badge: ReactNode
  className?: string
}

export function CardMedia({ children, counter, badge, className }: CardMediaProps) {
  const { loading } = useContext(CardContext)
  return (
    // card/loading: the photo is one shape, with the radius of the photo.
    <div data-part="media" className={cx(cardMedia, loading && cardShape, className)}>
      {children}
      <span data-part="counter" className={cx(cardMediaLabel, 'start-(--mono-card-media-inset)')}>
        {counter}
      </span>
      <span data-part="badge" className={cx(cardMediaLabel, 'end-(--mono-card-media-inset)')}>
        {badge}
      </span>
    </div>
  )
}
