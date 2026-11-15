// The mark of the close button of the Bottom sheet (contract: ir/contracts/bottom-sheet.json). The mark fills its box,
// and its color is the text color of the box (currentColor). Assistive technology does not read it.

/** The cross of the close button (bottom-sheet/header). */
export function SheetCloseIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
