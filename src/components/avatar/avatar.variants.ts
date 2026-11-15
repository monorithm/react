// The look of the Avatar, the Avatar group, and the Avatar button (contract: ir/contracts/avatar.json). Each size comes
// from the tokens and from --mono-avatar-* (components.css). The components pick one class for each property in
// TypeScript. Thus two classes never set the same property, and Tailwind sees each class as a literal.
import { buttonBase } from '../button/button.variants'

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg'

/** person: round. organization: a rounded square (avatar/shape). */
export type AvatarVariant = 'person' | 'organization'

/**
 * The container: the photo and the initials at the center. avatar/not-a-control: it has no focus, no hover state, and no
 * pressed state. avatar/in-a-control: a press on it goes to the control that contains it.
 */
export const avatarBase = 'relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden align-middle'

/**
 * avatar/size: the width and the height of each size. avatar/density: the avatar sizes are not tokens of the density
 * axis. Thus the density does not change them.
 */
export const avatarSizes: Record<AvatarSize, string> = {
  xs: 'size-(--mono-size-avatar-xs)',
  sm: 'size-(--mono-size-avatar-sm)',
  md: 'size-(--mono-size-avatar-md)',
  lg: 'size-(--mono-size-avatar-lg)',
}

/** avatar/shape: a person is round. An organization is a rounded square, with a radius of 28% of the size. */
export const avatarShapes: Record<AvatarVariant, Record<AvatarSize, string>> = {
  person: { xs: 'rounded-mono-full', sm: 'rounded-mono-full', md: 'rounded-mono-full', lg: 'rounded-mono-full' },
  organization: {
    xs: 'rounded-(--mono-avatar-xs-organization-radius)',
    sm: 'rounded-(--mono-avatar-sm-organization-radius)',
    md: 'rounded-(--mono-avatar-md-organization-radius)',
    lg: 'rounded-(--mono-avatar-lg-organization-radius)',
  },
}

/** avatar/fallback: the selected fill under the initials. avatar/count: the pressed fill under the count. */
export const avatarFills = { avatar: 'bg-mono-selected', count: 'bg-mono-pressed' } as const

/**
 * avatar/ring: a ring of 1 px in the avatar ring color. The ring is on the edge of the shape, over the photo. Thus the
 * photo fills the full container.
 */
export const avatarRing = [
  "after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:content-['']",
  'after:border-(length:--mono-avatar-ring) after:border-mono-avatar-ring',
].join(' ')

/**
 * avatar/photo: the photo fills the shape with a crop, and it does not stretch. avatar/fallback: a photo that does not
 * load does not show, and the initials stay.
 */
export const avatarPhoto = 'absolute inset-0 size-full object-cover data-[error]:hidden'

/** avatar/initials-style: the secondary text color, the strong weight, and no letter tracking. */
export const avatarInitials = 'font-mono-strong text-mono-fg-2 tracking-(--mono-avatar-initials-tracking)'

/** avatar/initials-style: the size of the initials for each avatar size: 10, 12, 14, and 18 px. */
export const avatarInitialsSizes: Record<AvatarSize, string> = {
  xs: 'text-(length:--mono-avatar-xs-initials-size)',
  sm: 'text-(length:--mono-avatar-sm-initials-size)',
  md: 'text-(length:--mono-avatar-md-initials-size)',
  lg: 'text-(length:--mono-avatar-lg-initials-size)',
}

/**
 * avatar/seller-line: the avatar, the name, and the handle, with a gap of 8 px. avatar/direction: the items go from the
 * start side, thus from the right in a right-to-left layout.
 */
export const avatarLine = 'inline-flex min-w-0 items-center gap-(--mono-avatar-seller-gap)'
/** avatar/seller-line: the name has the small text size and the strong weight. */
export const avatarLineName = 'text-mono-small font-mono-strong text-mono-fg'
/** avatar/seller-line: the handle has the caption size and the muted text color. */
export const avatarLineHandle = 'text-mono-caption text-mono-fg-muted'

/** avatar/group: a row of items. avatar/direction: the row starts at the start side, thus at the right in right-to-left. */
export const avatarGroup = 'inline-flex items-center align-middle'
/** avatar/group-overlap: each item after the first overlaps the item before it by 8 px, at its start side. */
export const avatarGroupOverlap = '-ms-(--mono-avatar-group-overlap)'
/** avatar/group-overlap: a ring of 2 px in the surface color, outside the shape, replaces the avatar ring. */
export const avatarGroupRing = 'shadow-[0_0_0_var(--mono-avatar-group-ring)_var(--mono-color-role-surface)]'

/** The Avatar button. The base of the buttons gives the target, the press, the focus ring, and the disabled state. */
export const avatarButton = [
  // avatar/target, avatar/press, avatar/focus, avatar/state-sign, avatar/disabled, avatar/motion: the base of the buttons.
  buttonBase,
  // avatar/button: round, with the width and the height of a medium button of the density.
  'inline-flex p-0 size-(--mono-size-control-md) rounded-mono-full',
  // avatar/button: the background fill. avatar/fallback: the initials in the secondary text color.
  '[--btn-fill:var(--mono-color-role-bg)] [--btn-label:var(--mono-color-role-fg-2)]',
  // avatar/button: the border is the avatar ring. avatar/hover: at hover, it changes to the strong line color in dur-fast.
  '[--btn-border-width:var(--mono-avatar-button-ring)] [--btn-border:var(--mono-color-avatar-ring)]',
  '[--btn-border-hover:var(--mono-color-role-line-strong)]',
  // avatar/press: at pointer down, the button scales to the press scale of an icon, in dur-press.
  '[--btn-press:var(--mono-scale-press-icon)]',
].join(' ')

/** The avatar in the button: the photo and the initials fill the inside of the ring. */
export const avatarButtonFace = 'relative flex size-full items-center justify-center overflow-hidden rounded-mono-full'
/** avatar/button-initials: the initials of the button have the caption size of the density. */
export const avatarButtonInitials = 'text-mono-caption'
