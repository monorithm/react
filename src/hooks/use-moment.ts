// The emit function of a component: it sends a moment to the handler of the nearest MomentProvider.
import { useCallback, useContext } from 'react'
import { MomentContext } from '../contexts/moment-context'
import type { Moment } from '../lib/moments'

/** The emit function of a component. The source is the id of its contract. */
export function useMoment(source: string): (moment: Moment, variant?: string) => void {
  const handler = useContext(MomentContext)
  return useCallback(
    (moment: Moment, variant?: string) => {
      handler?.({ moment, variant, source })
    },
    [handler, source],
  )
}
