// The skeleton of the language (contract: ir/contracts/progress.json, variant skeleton): the region that loads and its
// shapes. The shapes have the layout of the real content. Assistive technology does not read them: the region tells
// that it is busy, and the announcer tells the loading text.
import { type CSSProperties, type ReactNode, useEffect, useState } from 'react'
import { Announcer } from './progress.announcer'
import { ProgressMotion, SHIMMER_COUNT, SHIMMER_LIMIT } from './progress.motion'
import { shapeBase, shapeRadii, shapeText, skeletonRegion, skeletonStatus } from './progress.variants'
import { cx } from '@monorithm/react/lib/cx'

export type SkeletonRadius = keyof typeof shapeRadii

export interface SkeletonProps {
  /** The name of the region while it loads: the content, for example "Loading products" (progress/name). */
  label: string
  /** True while the app loads the content. The region shows the shapes and is busy (progress/skeleton-busy). */
  loading: boolean
  /**
   * The shapes, in the layout of the real content, for example the layout of the real product card (progress/skeleton-use).
   * Use a skeleton only for content that the app loads.
   */
  shapes: ReactNode
  /** The content. It shows when loading is false. */
  children?: ReactNode
  /** The status text after the shimmer limit. The default is the label (progress/shimmer-stop). */
  statusLabel?: string
  /** The result, for example "24 products". The announcer tells it one time when the content shows (progress/announce-once). */
  resultLabel?: string
  className?: string
}

/** The phase of the load, for the announcer: no load yet, a load, or the end of a load. */
type Phase = 'idle' | 'loading' | 'done'

export function Skeleton({ label, loading, shapes, children, statusLabel, resultLabel, className }: SkeletonProps) {
  const [phase, setPhase] = useState<Phase>(loading ? 'loading' : 'idle')
  if (loading && phase !== 'loading') setPhase('loading')
  if (!loading && phase === 'loading') setPhase('done')
  // progress/shimmer-stop: after the limit, the shimmer stops and the status text shows. A new load starts the limit again.
  const [expired, setExpired] = useState(false)
  useEffect(() => {
    setExpired(false)
    if (!loading) return
    const timer = setTimeout(() => setExpired(true), SHIMMER_LIMIT)
    return () => clearTimeout(timer)
  }, [loading])
  const status = statusLabel ?? label
  const announced = phase === 'loading' ? (expired ? status : label) : phase === 'done' ? (resultLabel ?? null) : null
  return (
    <>
      <div
        data-mono="progress"
        data-variant="skeleton"
        data-part="region"
        data-expired={loading && expired ? '' : undefined}
        // progress/skeleton-busy and progress/name: while it loads, the region is a busy group with the name of the
        // content. When the content shows, the region is not busy.
        role={loading ? 'group' : undefined}
        aria-label={loading ? label : undefined}
        aria-busy={loading}
        className={cx(skeletonRegion, className)}
      >
        {loading ? (
          <>
            {/* The shapes keep the layout of the region (display: contents). Assistive technology does not read them. */}
            <div aria-hidden="true" data-part="shapes" className="contents">
              {shapes}
            </div>
            {expired ? (
              <span aria-hidden="true" data-part="status" className={skeletonStatus}>
                {status}
              </span>
            ) : null}
          </>
        ) : (
          children
        )}
      </div>
      {/* progress/announce-once: out of the busy region, thus assistive technology does not wait for the end of the load. */}
      <Announcer text={announced} />
    </>
  )
}

export type SkeletonShapeProps = {
  className?: string
  style?: CSSProperties
} & (
  | {
      /** A line of text (the default): one line high, with the small radius (progress/skeleton-shape). Give the width with className. */
      kind?: 'text'
      radius?: never
    }
  | {
      /** An image or an avatar. Give its size with className. */
      kind: 'media'
      /** The radius of the real image or avatar, for example "full" for an avatar (progress/skeleton-shape). */
      radius: SkeletonRadius
    }
)

/** A placeholder with the size, the position, and the radius of one item of the content. */
export function SkeletonShape({ kind = 'text', radius, className, style }: SkeletonShapeProps) {
  return (
    <span
      aria-hidden="true"
      data-part="shape"
      data-kind={kind}
      style={{ '--progress-shimmer-count': SHIMMER_COUNT, ...style } as CSSProperties}
      className={cx(shapeBase, kind === 'text' ? cx(shapeText, shapeRadii.sm) : shapeRadii[radius ?? 'sm'], className)}
    >
      <ProgressMotion />
    </span>
  )
}
