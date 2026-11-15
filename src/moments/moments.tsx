// The moments of the language. A component emits a moment. It never starts a haptic or a sound directly: the app
// gives a handler, and the handler applies the moment policy (the platform, the system option, the app option).
import { createContext, type ReactNode, useCallback, useContext } from 'react'

/** The moments of the language (the contract schema of @monorithm/design). */
export type Moment =
  | 'press'
  | 'toggle'
  | 'select'
  | 'drag-start'
  | 'threshold'
  | 'snap'
  | 'open'
  | 'close'
  | 'success'
  | 'warning'
  | 'error'
  | 'notify'
  | 'send'

export interface MomentEvent {
  moment: Moment
  /** For example "on" or "off" for toggle. */
  variant?: string
  /** The id of the contract of the component that emits the moment. */
  source: string
}

export type MomentHandler = (event: MomentEvent) => void

const MomentContext = createContext<MomentHandler | null>(null)

/** Gives the handler of the moments to the components inside it. With no provider, a moment does nothing. */
export function MomentProvider({ onMoment, children }: { onMoment: MomentHandler; children: ReactNode }) {
  return <MomentContext.Provider value={onMoment}>{children}</MomentContext.Provider>
}

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
