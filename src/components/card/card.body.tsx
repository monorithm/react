// The body of the Card (contract: ir/contracts/card.json): the content, for example a value, a list, or text. It has the
// body size and the body text color of the card.
import { type ReactNode, useContext } from 'react'
import { cx } from '@monorithm/react/lib/cx'
import { CardContext } from './card.context'
import { cardShape, cardShapeRadius } from './card.variants'

export interface CardBodyProps {
  children: ReactNode
  className?: string
}

export function CardBody({ children, className }: CardBodyProps) {
  const { loading } = useContext(CardContext)
  return (
    <div data-part="body" className={cx('min-w-0', loading && cardShape, loading && cardShapeRadius, className)}>
      {children}
    </div>
  )
}
