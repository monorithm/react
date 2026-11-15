// The context of the moments and its provider. The app gives the handler, and the handler applies the moment policy:
// the platform, the system option, and the app option. A component never starts a haptic or a sound directly.
import { createContext, type ReactNode } from 'react'
import type { MomentHandler } from '../lib/moments'

/** The handler of the moments. With no provider, the value is null and a moment does nothing. */
export const MomentContext = createContext<MomentHandler | null>(null)

/** Gives the handler of the moments to the components inside it. With no provider, a moment does nothing. */
export function MomentProvider({ onMoment, children }: { onMoment: MomentHandler; children: ReactNode }) {
  return <MomentContext.Provider value={onMoment}>{children}</MomentContext.Provider>
}
