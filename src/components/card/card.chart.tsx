// The chart of the Card (contract: ir/contracts/card.json): only the frame. The app gives the chart as the children, and
// the text alternative with the same values (card/chart). Put the chart title, the info icon, and the legend in the
// CardHeader, above the chart.
import { type ReactNode, useContext } from 'react'
import { cx } from '@monorithm/react/lib/cx'
import { CardContext } from './card.context'
import { cardChart, cardShape } from './card.variants'

export interface CardChartProps {
  /** The chart. */
  children: ReactNode
  /** The text alternative of the chart, with the same values, for example a table. Assistive technology reads it. */
  alternative: ReactNode
  className?: string
}

export function CardChart({ children, alternative, className }: CardChartProps) {
  const { loading } = useContext(CardContext)
  return (
    <div data-part="chart" className={cx(cardChart, loading && cardShape, className)}>
      {children}
      <div data-part="alternative" className="sr-only">
        {alternative}
      </div>
    </div>
  )
}
