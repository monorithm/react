// The Avatar group (contract: ir/contracts/avatar.json): three avatars or less that overlap, then the count of the other
// persons. The accessibility tree shows the group as one image, with one name.
import { type Ref } from 'react'
import { cx } from '@monorithm/react/lib/cx'
import { AvatarFace } from './avatar'
import {
  type AvatarSize,
  type AvatarVariant,
  avatarBase,
  avatarFills,
  avatarGroup,
  avatarGroupOverlap,
  avatarGroupRing,
  avatarInitials,
  avatarInitialsSizes,
  avatarShapes,
  avatarSizes,
} from './avatar.variants'

/** The group shows three avatars or less (avatar/group). */
const SHOWN = 3

/** The English names of the persons that show, then the count: "Kwame, Efua, Yaw, and 3 more followers". */
const list = new Intl.ListFormat('en', { style: 'long', type: 'conjunction' })

export interface AvatarGroupItem {
  /** The name of the person, for example "Kwame". It goes into the name of the group and gives the initials. */
  name: string
  /** The URL of the photo: the thumbnail, 160 px wide (avatar/photo). */
  src?: string
}

export interface AvatarGroupProps {
  /** The persons, in sequence. The group shows the first three (avatar/group). */
  items: AvatarGroupItem[]
  /** The number of all the persons, also of the persons that items does not give. The default is the length of items. */
  total?: number
  /** The noun of the count in the name of the group, for example "followers": "and 3 more followers" (avatar/group-name). */
  noun?: string
  /**
   * The name of the group for assistive technology, in place of the English name that the group makes. A function gets
   * the names that show and the count (avatar/group-name).
   */
  label?: string | ((names: string[], more: number) => string)
  /** The size of each item. All the items have the same size (avatar/group). The default is md. */
  size?: AvatarSize
  /** The shape of each item (avatar/shape). The default is person. */
  variant?: AvatarVariant
  id?: string
  className?: string
  ref?: Ref<HTMLSpanElement>
}

export function AvatarGroup({ items, total, noun, label, size = 'md', variant = 'person', id, className, ref }: AvatarGroupProps) {
  const shown = items.slice(0, SHOWN)
  // avatar/group: the count is the number of the persons that the group does not show.
  const more = Math.max(0, (total ?? items.length) - shown.length)
  const names = shown.map((item) => item.name)
  const count = [`${more} more`, noun].filter(Boolean).join(' ')
  const name = typeof label === 'function' ? label(names, more) : (label ?? list.format(more > 0 ? [...names, count] : names))
  // avatar/group: all the items have the same size and the same shape. avatar/group-overlap: the ring of the group.
  const item = (index: number) =>
    cx(avatarBase, avatarSizes[size], avatarShapes[variant][size], avatarGroupRing, index > 0 && avatarGroupOverlap)
  return (
    // avatar/group-name: one image with one name. Assistive technology does not read each avatar.
    <span ref={ref} id={id} role="img" aria-label={name} data-mono="avatar" data-part="group" data-size={size} className={cx(avatarGroup, className)}>
      {shown.map((person, index) => (
        <AvatarFace
          key={`${index}-${person.name}`}
          aria-hidden
          data-part="item"
          name={person.name}
          src={person.src}
          className={cx(item(index), avatarFills.avatar)}
          initialsClassName={avatarInitialsSizes[size]}
        />
      ))}
      {/* avatar/count: the last item, with the shape, the size, and the initials style of an avatar, on the pressed fill. */}
      {more > 0 ? (
        <span aria-hidden="true" data-part="count" className={cx(item(shown.length), avatarFills.count, avatarInitials, avatarInitialsSizes[size])}>
          {`+${more}`}
        </span>
      ) : null}
    </span>
  )
}
