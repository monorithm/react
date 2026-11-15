// The Avatar button (contract: ir/contracts/avatar.json): the account control in the header. It opens the account menu.
// Base UI gives the behavior and the accessibility of the button. The base of the buttons (../button/button.variants)
// gives the target, the press, the focus ring, and the disabled state.
import { Button as Base } from '@base-ui/react/button'
import { type MouseEvent, type Ref, useId } from 'react'
import { cx, describedBy } from '@monorithm/react/lib/cx'
import { useMoment } from '@monorithm/react/hooks/use-moment'
import { AvatarFace } from './avatar'
import { avatarButton, avatarButtonFace, avatarButtonInitials } from './avatar.variants'

export interface AvatarButtonProps {
  /** The name of the person of the account. It gives the initials. It is not the name of the button (avatar/button-role). */
  name: string
  /** The URL of the photo: the thumbnail, 160 px wide (avatar/photo). */
  src?: string
  /** The name of the button for assistive technology. The default is "Account" (avatar/button-role). */
  label?: string
  /** The account menu is open (avatar/keyboard). */
  expanded?: boolean
  /** Called at the press. Open the account menu here, 4 px from the button (avatar/menu). The moment press comes first. */
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
  /** The cause of the disabled state: why the menu does not open, for assistive technology (avatar/disabled). */
  disabledReason?: string
  id?: string
  className?: string
  'aria-describedby'?: string
  ref?: Ref<HTMLButtonElement>
}

export function AvatarButton({ name, src, label = 'Account', expanded, onClick, disabled, disabledReason, id, className, ref, ...rest }: AvatarButtonProps) {
  const emit = useMoment('avatar')
  const reasonId = useId()
  const reason = disabled && disabledReason ? reasonId : undefined
  return (
    <Base
      ref={ref}
      id={id}
      type="button"
      data-mono="avatar"
      data-variant="button"
      // avatar/button-role: a button with the name Account. The initials are not the name.
      aria-label={label}
      // avatar/button: a button that opens a menu. The expanded state tells if the menu is open.
      aria-haspopup="menu"
      aria-expanded={expanded ?? false}
      // avatar/disabled: the button stays in the focus order. Base UI stops the press.
      disabled={disabled}
      focusableWhenDisabled
      aria-describedby={describedBy(rest['aria-describedby'], reason)}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        // avatar/moment: the click comes at the release on the button, or at Enter or Space. Not at pointer down.
        emit('press')
        onClick?.(event)
      }}
      className={cx(avatarButton, className)}
    >
      <AvatarFace aria-hidden name={name} src={src} className={avatarButtonFace} initialsClassName={avatarButtonInitials} />
      {reason ? (
        <span id={reasonId} hidden>
          {disabledReason}
        </span>
      ) : null}
    </Base>
  )
}
