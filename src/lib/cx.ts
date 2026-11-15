// Helpers for class names and ids.

/** Joins class names and drops the empty ones. */
export const cx = (...names: (string | false | null | undefined)[]): string => names.filter(Boolean).join(' ')

/** The ids for aria-describedby: the ids of the caller and the id of the cause of the disabled state. */
export const describedBy = (...ids: (string | false | null | undefined)[]): string | undefined => cx(...ids) || undefined
