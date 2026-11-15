// The footer of the Card (contract: ir/contracts/card.json): the last part, with actions or a summary, for example a
// total. Each action is a separate target (card/nested-control), 8 px from the next action.
import { type ReactNode, useContext } from 'react'
import { cx } from '@monorithm/react/lib/cx'
import { CardContext } from './card.context'
import { cardActions, cardShape, cardShapeRadius } from './card.variants'

export interface CardFooterProps {
  children: ReactNode
  className?: string
}

export function CardFooter({ children, className }: CardFooterProps) {
  const { loading } = useContext(CardContext)
  return (
    <div data-part="footer" className={cx(cardActions, 'min-w-0 flex-wrap', loading && cardShape, loading && cardShapeRadius, className)}>
      {children}
    </div>
  )
}
