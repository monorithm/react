// The variant of the group, for its options: rows or option cards.
import { createContext } from 'react'

export type RadioGroupVariant = 'list' | 'cards'

export const RadioGroupContext = createContext<RadioGroupVariant>('list')
