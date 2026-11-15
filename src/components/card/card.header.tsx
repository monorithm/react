// The header of the Card (contract: ir/contracts/card.json): the title and the actions on one line (card/header). In a
// chart card, it also has the info icon and the legend (card/chart).
import { type ReactNode, useContext } from 'react'
import { cx } from '@monorithm/react/lib/cx'
import { CardContext } from './card.context'
import { CardTitle } from './card.title'
import { cardActions, cardHeader, cardHeaderEnd, cardHeaderStart, type CardHeadingLevel, cardShape, cardShapeRadius, cardTitle } from './card.variants'

export interface CardHeaderProps {
  /** The name of the card, as a heading. In an interactive card, it is the name of the link or the button (card/name). */
  title: ReactNode
  /** The heading level of the title. The screen sets it: the level after the heading of the section (card/heading-level). */
  level: CardHeadingLevel
  /** A chart card: the info icon after the title, for example an icon button that tells what the chart shows. */
  info?: ReactNode
  /** A chart card: the legend of the chart, at the end side (card/chart). */
  legend?: ReactNode
  /** A button, an icon button, or a menu at the end side. It is a separate target (card/nested-control). */
  action?: ReactNode
  className?: string
}

export function CardHeader({ title, level, info, legend, action, className }: CardHeaderProps) {
  const { loading } = useContext(CardContext)
  const shape = loading && cx(cardShape, cardShapeRadius)
  return (
    <div data-part="header" className={cx(cardHeader, className)}>
      <div className={cardHeaderStart}>
        <CardTitle level={level} className={cardTitle}>
          {title}
        </CardTitle>
        {info ? (
          <span data-part="info" className={cx('flex shrink-0 items-center', shape)}>
            {info}
          </span>
        ) : null}
      </div>
      {legend || action ? (
        <div className={cardHeaderEnd}>
          {legend ? (
            <div data-part="legend" className={cx('flex items-center', shape)}>
              {legend}
            </div>
          ) : null}
          {action ? (
            <div data-part="actions" className={cx(cardActions, shape)}>
              {action}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
