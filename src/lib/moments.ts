// The moments of the language: the types. A component emits a moment. It never starts a haptic or a sound directly: the
// app gives a handler, and the handler applies the moment policy (the platform, the system option, the app option).

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
