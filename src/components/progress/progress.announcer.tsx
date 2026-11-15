// The polite announcer of the bar, the spinner, and the skeleton (progress/announce-once).
import { type ReactNode, useEffect, useState } from 'react'

/**
 * A polite live region that only assistive technology reads. It is empty in the first render, and the text comes
 * after that render. Thus the screen reader hears the text one time, when the load starts. The region tells a new text
 * only when the text changes: not at each change of the value and not at each cycle of the motion.
 */
export function Announcer({ text }: { text: ReactNode }) {
  const [ready, setReady] = useState(false)
  useEffect(() => setReady(true), [])
  return (
    <span role="status" data-part="announcer" className="sr-only">
      {ready ? text : null}
    </span>
  )
}
