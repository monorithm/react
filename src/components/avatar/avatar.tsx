// The Avatar of the language (contract: ir/contracts/avatar.json). Base UI gives the photo and the fallback: the initials
// show until the photo loads, and also when it does not load. The tokens and the geometry of the contract give the look
// (avatar.variants.ts, components.css).
import { Avatar as Base } from '@base-ui/react/avatar'
import { type ReactNode, type Ref } from 'react'
import { cx } from '@monorithm/react/lib/cx'
import { initials } from './avatar.initials'
import {
  type AvatarSize,
  type AvatarVariant,
  avatarBase,
  avatarFills,
  avatarInitials,
  avatarInitialsSizes,
  avatarLine,
  avatarLineHandle,
  avatarLineName,
  avatarPhoto,
  avatarRing,
  avatarShapes,
  avatarSizes,
} from './avatar.variants'

export type { AvatarSize, AvatarVariant }

interface FaceProps {
  name: string
  src?: string
  /** The classes of the container: the size, the shape, the fill, and the ring. The caller picks them. */
  className: string
  /** The size of the initials. */
  initialsClassName: string
  role?: 'img'
  'aria-label'?: string
  'aria-hidden'?: true
  id?: string
  'data-mono'?: 'avatar'
  'data-variant'?: AvatarVariant
  'data-size'?: AvatarSize
  'data-part'?: string
  ref?: Ref<HTMLSpanElement>
}

/**
 * The container, the photo, and the initials. The Avatar, the items of the Avatar group, and the Avatar button use it.
 * It is not a part of the public API.
 */
export function AvatarFace({ name, src, className, initialsClassName, ...rest }: FaceProps) {
  return (
    <Base.Root {...rest} className={className}>
      {/* avatar/photo: the image keeps its place in the markup and loads there. avatar/name: the container has the name,
          thus the photo has an empty alternative text. */}
      {src ? <Base.Image src={src} alt="" keepMounted data-part="photo" className={avatarPhoto} /> : null}
      {/* avatar/fallback: the initials show when there is no photo, and when the photo does not load.
          avatar/initials-direction: dir="auto" keeps the direction of the script of the name. */}
      <Base.Fallback data-part="initials" dir="auto" className={cx(avatarInitials, initialsClassName)}>
        {initials(name)}
      </Base.Fallback>
    </Base.Root>
  )
}

export interface AvatarProps {
  /**
   * The name of the person or of the organization, for example "Ama Mensah". It is the name for assistive technology
   * (avatar/name), and it gives the initials (avatar/initials).
   */
  name: string
  /** The URL of the photo, with the ratio 1 : 1. Give the thumbnail size, 160 px wide (avatar/photo). */
  src?: string
  /** person: round (the default). organization: a rounded square (avatar/shape). */
  variant?: AvatarVariant
  /** 24, 32, 40, or 56 px (avatar/size). The default is md (40 px), and xs (24 px) in a seller line. */
  size?: AvatarSize
  /**
   * The avatar is next to a name that the user can see, for example in a table row. Assistive technology does not read
   * it. Thus it reads the name one time (avatar/decorative).
   */
  decorative?: boolean
  /**
   * The handle, for example "@amamensah". With a handle, the avatar shows a seller line: the avatar, the name, and the
   * handle. The avatar in the line is decorative (avatar/seller-line, avatar/decorative).
   */
  handle?: ReactNode
  id?: string
  className?: string
  ref?: Ref<HTMLSpanElement>
}

export function Avatar({ name, src, variant = 'person', size, decorative, handle, id, className, ref }: AvatarProps) {
  const line = handle !== undefined && handle !== null
  const s = size ?? (line ? 'xs' : 'md')
  const face = (
    <AvatarFace
      ref={line ? undefined : ref}
      id={line ? undefined : id}
      data-mono="avatar"
      data-variant={variant}
      data-size={s}
      // avatar/role and avatar/name: an image with the name. avatar/decorative: hidden next to a name that shows.
      {...(decorative || line ? { 'aria-hidden': true as const } : { role: 'img' as const, 'aria-label': name })}
      name={name}
      src={src}
      className={cx(avatarBase, avatarSizes[s], avatarShapes[variant][s], avatarFills.avatar, avatarRing, !line && className)}
      initialsClassName={avatarInitialsSizes[s]}
    />
  )
  if (!line) return face
  return (
    <span ref={ref} id={id} data-mono="avatar" data-part="line" className={cx(avatarLine, className)}>
      {face}
      <span data-part="name" className={avatarLineName}>
        {name}
      </span>
      <span data-part="handle" className={avatarLineHandle}>
        {handle}
      </span>
    </span>
  )
}
