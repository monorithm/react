// The stat of the Card (contract: ir/contracts/card.json): the label above the value, and a change with its period
// (card/stat, card/stat-value, card/stat-change). The label is the title of a stat card.
import { type ReactNode, useContext } from 'react'
import { cx } from '@monorithm/react/lib/cx'
import { CardContext } from './card.context'
import { CardTitle } from './card.title'
import {
  type CardHeadingLevel,
  cardShape,
  cardShapeRadius,
  cardStat,
  cardStatChange,
  cardStatLabel,
  cardStatPeriod,
  cardStatValue,
} from './card.variants'

/** card/stat-change: a change shows only with its period. A period can show with no change. */
type ChangeProps = { change?: undefined; period?: ReactNode } | { change: ReactNode; period: ReactNode }

export type CardStatProps = {
  /** The label, for example "Total sales". It is the title, thus the name of an interactive card (card/name). */
  label: ReactNode
  /** The heading level of the label. The screen sets it (card/heading-level). */
  level: CardHeadingLevel
  /** The value, for example an amount. */
  value: ReactNode
  className?: string
} & ChangeProps

export function CardStat({ label, level, value, change, period, className }: CardStatProps) {
  const { loading } = useContext(CardContext)
  const shape = loading && cx(cardShape, cardShapeRadius)
  return (
    <div data-part="stat" className={cx(cardStat, className)}>
      <CardTitle level={level} className={cardStatLabel}>
        {label}
      </CardTitle>
      <p data-part="value" className={cx(cardStatValue, shape)}>
        {value}
      </p>
      {change !== undefined || period !== undefined ? (
        <p data-part="change" className={cx(cardStatChange, shape)}>
          {change !== undefined ? <span data-part="delta">{change}</span> : null}
          {change !== undefined && period !== undefined ? ' ' : null}
          {period !== undefined ? (
            <span data-part="period" className={cardStatPeriod}>
              {period}
            </span>
          ) : null}
        </p>
      ) : null}
    </div>
  )
}
