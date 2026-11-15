// The axes of the trigger, for the menu and the action sheet in the portal: the portal is not inside the elements of
// the trigger. Thus the popup gets the theme, the density, the motion, and the direction of the trigger.

export interface MenuAxes {
  theme?: string
  density?: string
  motion?: string
  dir: 'ltr' | 'rtl'
  /** The gap between the trigger and the menu, from the geometry: --mono-menu-menu-offset (menu/position). */
  offset: number
}

export const NO_AXES: MenuAxes = { dir: 'ltr', offset: 0 }

export function axesOf(trigger: HTMLElement | null): MenuAxes {
  if (!trigger) return NO_AXES
  const axis = (name: string) => trigger.closest(`[${name}]`)?.getAttribute(name) ?? undefined
  const offset = Number.parseFloat(getComputedStyle(trigger).getPropertyValue('--mono-menu-menu-offset'))
  return {
    theme: axis('data-theme'),
    density: axis('data-density'),
    motion: axis('data-motion'),
    dir: axis('dir') === 'rtl' ? 'rtl' : 'ltr',
    offset: Number.isFinite(offset) ? offset : 0,
  }
}
