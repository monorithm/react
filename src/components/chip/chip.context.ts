// The set of chips, for its chips: the count of the presses on Clear filters.
import { createContext } from 'react'

/** The count of the presses on Clear filters. A change sets each filter chip with no pressed prop to off (chip/clear). */
export const ChipGroupContext = createContext(0)
