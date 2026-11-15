// The scroll of a long tab list (tabs/overflow-focus). The function uses only the DOM, with no import and no closure: the
// browser test runs its source in Chrome.

/**
 * Scrolls the scroller on the horizontal axis until all of the tab shows, with the scroll padding of the scroller (the
 * space of the focus ring). The page does not scroll. The physical offsets are correct in left-to-right and in
 * right-to-left.
 */
export function revealTab(scroller: HTMLElement, tab: HTMLElement): void {
  const style = getComputedStyle(scroller)
  const area = scroller.getBoundingClientRect()
  const box = tab.getBoundingClientRect()
  const left = box.left - (parseFloat(style.scrollPaddingLeft) || 0) - (area.left + scroller.clientLeft)
  const right = box.right + (parseFloat(style.scrollPaddingRight) || 0) - (area.left + scroller.clientLeft + scroller.clientWidth)
  // The browser rounds a scroll offset to a full pixel. Thus the offset goes up to the next pixel in the direction of
  // the scroll, and no part of the tab stays behind the edge.
  if (left < 0) scroller.scrollLeft = Math.floor(scroller.scrollLeft + left)
  else if (right > 0) scroller.scrollLeft = Math.ceil(scroller.scrollLeft + Math.min(right, left))
}
