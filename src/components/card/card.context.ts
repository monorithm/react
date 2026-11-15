// The context of the Card for its parts: the target of an interactive card, and the loading state.
import { createContext, type MouseEvent } from 'react'

/** The target of an interactive card: one link or one button (card/link-or-button). */
export type CardTarget =
  | { kind: 'link'; href: string; disabled: boolean; describedBy?: string }
  | { kind: 'button'; onPress: (event: MouseEvent<HTMLButtonElement>) => void; disabled: boolean; describedBy?: string }

export interface CardContextValue {
  /** The target, or null for a static card (card/static). */
  target: CardTarget | null
  /** The parts show the shapes of the skeleton (card/loading). */
  loading: boolean
}

export const CardContext = createContext<CardContextValue>({ target: null, loading: false })
