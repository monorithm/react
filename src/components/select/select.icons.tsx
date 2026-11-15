// The marks of the Select (contract: ir/contracts/select.json): the chevron, the check, and the error icon. Each mark
// fills its box, and its color is the text color of the box (currentColor). Assistive technology does not read them.

/** The down chevron at the end side of the trigger (select/trigger). */
export function SelectChevron() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      <path d="M4 6.25 8 10.25l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** The check of the selected option (select/selected-sign). */
export function SelectCheck() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      <path d="M3.5 8.5 6.5 11.5 12.5 4.75" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** The error icon before the error text (select/error). */
export function SelectErrorIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      <circle cx="8" cy="8" r="6.75" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 4.5v4.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="11.25" r="1" fill="currentColor" />
    </svg>
  )
}
