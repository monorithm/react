// The tests of the Menu. Each name starts with the id of a clause of ir/contracts/menu.json. The browser test
// (test/browser/menu.browser.test.tsx) renders the menu in Chrome and measures the clauses that jsdom cannot compute.
import fs from 'node:fs'
import path from 'node:path'
import { Dialog } from '@base-ui/react/dialog'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { violations } from '@monorithm/react/test/axe'
import { type Clause, contract as loadContract } from '@monorithm/react/test/contract'
import { MomentProvider } from '@monorithm/react/contexts/moment-context'
import { type MomentEvent } from '@monorithm/react/lib/moments'
import { Menu, type MenuProps } from './menu'
import type { MenuGroup, MenuItem } from './menu.item'
import { SHEET_MEDIA } from './menu.sheet'

const contract = loadContract('menu')
const clause = (id: string) => contract.clauses.find((c) => c.id === id) as (Clause & { classes?: string[]; inputs?: string[] }) | undefined

const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 16 16">
    <path d={d} />
  </svg>
)
const Dots = () => <Icon d="M3 8h1M8 8h1M13 8h1" />

/** The actions of a product: a group with a name, a group with no name, and the destructive item. */
function actions(spy?: (label: string) => void): { groups: MenuGroup[]; destructive: MenuItem } {
  const item = (label: string, more: Partial<MenuItem> = {}): MenuItem => ({ label, onSelect: () => spy?.(label), ...more })
  return {
    groups: [
      {
        label: 'Blue shirt',
        items: [item('Edit', { icon: <Icon d="M3 13l8-8" />, shortcut: 'E' }), item('Duplicate', { icon: <Icon d="M4 4h8v8" />, shortcut: 'D' })],
      },
      { items: [item('Share link', { icon: <Icon d="M5 8h6" /> }), item('Archive', { disabled: true, disabledReason: 'Publish the product first' })] },
    ],
    destructive: item('Delete product', { icon: <Icon d="M4 4l8 8" /> }),
  }
}

/** The menu of a product. The props replace the props of the trigger and of the menu, not the items. */
const Product = ({ spy, ...rest }: Partial<Omit<MenuProps, 'items' | 'groups'>> & { spy?: (label: string) => void }) => (
  <Menu label="Product actions" icon={<Dots />} {...actions(spy)} {...rest} />
)

const trigger = (name = 'Product actions') => screen.getByRole('button', { name })
const menu = () => screen.queryByRole('menu')
const names = (role: 'menuitem' | 'button', root: HTMLElement) => within(root).getAllByRole(role).map((e) => e.getAttribute('aria-labelledby') && document.getElementById(e.getAttribute('aria-labelledby') ?? '')?.textContent)
/** The label of the focused item, or null. */
const focused = () => (document.activeElement?.getAttribute('role') === 'menuitem' ? document.activeElement.querySelector('[data-part="label"]')?.textContent : null)

type User = ReturnType<typeof userEvent.setup>
/** Presses one key. Then waits for the focused item (null: the menu is closed). Base UI applies a key after a tick. */
async function press(user: User, key: string, expected: string | null) {
  await user.keyboard(key)
  await waitFor(() => {
    if (expected === null) return expect(menu()).toBeNull()
    expect(focused()).toBe(expected)
  })
}
/** Waits 50 ms: a key or a press that does nothing has no state to wait for. */
const tick = () => act(() => new Promise((resolve) => setTimeout(resolve, 50)))
/** Presses the trigger, then waits for the open menu. */
async function openMenu(user: User, name = 'Product actions') {
  await user.click(trigger(name))
  return screen.findByRole('menu')
}
/** The width of the window for the media of the action sheet: a phone, or a larger screen. */
function stubWidth(phone: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query === SHEET_MEDIA ? phone : false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

beforeAll(() => {
  // The geometry of the contracts: the menu reads its offset from --mono-menu-menu-offset.
  const style = document.createElement('style')
  style.textContent = fs.readFileSync(path.join(import.meta.dirname, '../../tokens/components.css'), 'utf8')
  document.head.append(style)
  // jsdom has no scrollIntoView. Base UI calls it to show the item with the focus.
  HTMLElement.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Menu', () => {
  it('the tests cover each clause of the contract', () => {
    const tested = new Set([
      'menu/role', 'menu/item-name', 'menu/name', 'menu/use', 'menu/trigger', 'menu/position', 'menu/position-flip',
      'menu/surface', 'menu/item', 'menu/density', 'menu/target', 'menu/wrap', 'menu/no-truncate', 'menu/shortcut',
      'menu/shortcut-look', 'menu/shortcut-desktop', 'menu/group', 'menu/separator', 'menu/destructive',
      'menu/destructive-sign', 'menu/confirm', 'menu/keyboard', 'menu/arrow-keys', 'menu/skip', 'menu/home-end',
      'menu/typeahead', 'menu/activate', 'menu/escape', 'menu/focus', 'menu/trigger-focus', 'menu/pointer', 'menu/hover',
      'menu/disabled', 'menu/disabled-trigger', 'menu/action-sheet', 'menu/action-sheet-items', 'menu/action-sheet-look',
      'menu/action-sheet-rows', 'menu/action-sheet-role', 'menu/action-sheet-close', 'menu/action-sheet-motion',
      'menu/tablet', 'menu/direction', 'menu/direction-motion', 'menu/motion', 'menu/motion-reduced', 'menu/moment',
      'menu/moment-trigger', 'menu/no-direct-feedback', 'menu/surfaces', 'menu/tv', 'menu/tv-focus', 'menu/car',
      'menu/watch', 'menu/xr',
    ])
    expect(contract.clauses.map((c) => c.id).filter((id) => !tested.has(id))).toEqual([])
  })

  it('menu/role: a button tells that it opens a menu and if it is open; the menu has the name of the trigger', async () => {
    render(<Product />)
    const t = trigger()
    expect(t.tagName).toBe('BUTTON')
    expect(t.getAttribute('aria-haspopup')).toBe('menu')
    expect(t.getAttribute('aria-expanded')).toBe('false')
    const m = await openMenu(userEvent.setup())
    expect(t.getAttribute('aria-expanded')).toBe('true')
    expect(t.getAttribute('aria-controls')).toBe(m.id)
    expect(screen.getByRole('menu', { name: 'Product actions' })).toBe(m)
    expect(names('menuitem', m)).toEqual(['Edit', 'Duplicate', 'Share link', 'Archive', 'Delete product'])
    expect(screen.getByRole('menuitem', { name: 'Delete product' })).toBeTruthy()
  })

  it('menu/role: axe finds no violation in each trigger, with the menu open, and with the action sheet open', async () => {
    const { container } = render(
      <div>
        <Product />
        <Product label="Order actions" icon={undefined} variant="outline" size="sm" />
        <Product label="Shop actions" disabled disabledReason="Open the shop first" />
        <Product label="Sheet actions" container="action-sheet" />
      </div>,
    )
    expect(await violations(container)).toEqual([])
    const user = userEvent.setup()
    await openMenu(user)
    expect(await violations(document.body)).toEqual([])
    await press(user, '{Escape}', null)
    await user.click(trigger('Sheet actions'))
    await screen.findByRole('dialog')
    expect(await violations(document.body)).toEqual([])
  })

  it('menu/item-name: the name is the label; the item tells its shortcut; the icon is hidden; a group has its label as its name', async () => {
    render(<Product />)
    const m = await openMenu(userEvent.setup())
    const edit = screen.getByRole('menuitem', { name: 'Edit' })
    expect(edit.getAttribute('aria-keyshortcuts')).toBe('E')
    expect(edit.querySelector('[data-part="icon"]')?.getAttribute('aria-hidden')).toBe('true')
    expect(edit.querySelector('[data-part="shortcut"]')?.getAttribute('aria-hidden')).toBe('true')
    expect(screen.getByRole('menuitem', { name: 'Share link' }).hasAttribute('aria-keyshortcuts')).toBe(false)
    const group = within(m).getByRole('group', { name: 'Blue shirt' })
    expect(within(group).getAllByRole('menuitem').map((e) => e.textContent)).toEqual(['EditE', 'DuplicateD'])
  })

  it('menu/name: the trigger has a name; a trigger with only an icon has the label as its text name', () => {
    render(
      <div>
        <Product />
        <Product label="Order actions" icon={undefined} />
      </div>,
    )
    expect(trigger().getAttribute('aria-label')).toBe('Product actions')
    expect(trigger().querySelector('[data-part="icon"]')?.getAttribute('aria-hidden')).toBe('true')
    expect(trigger('Order actions').textContent).toBe('Order actions')
    expect(trigger('Order actions').hasAttribute('aria-label')).toBe(false)
    // @ts-expect-error menu/name: the trigger has a name.
    const noName = <Menu items={[]} />
    expect(noName).toBeTruthy()
  })

  it('menu/use and menu/confirm: the choice of a menu and the confirm dialog are rules for the screen (review)', () => {
    expect(clause('menu/use')?.level).toBe('SHOULD')
    expect(clause('menu/confirm')?.level).toBe('SHOULD')
  })

  it('menu/trigger: an icon button or a button; while the menu is open, the trigger keeps its hover look', async () => {
    render(
      <div>
        <Product />
        <Product label="Order actions" icon={undefined} />
      </div>,
    )
    expect(trigger().dataset.mono).toBe('icon-button')
    expect(trigger().dataset.variant).toBe('ghost')
    expect(trigger('Order actions').dataset.mono).toBe('button')
    expect(trigger('Order actions').dataset.variant).toBe('secondary')
    await openMenu(userEvent.setup())
    expect(trigger().hasAttribute('data-popup-open')).toBe(true)
    // The hover fill while the menu is open (measured in Chrome).
    expect(trigger().className).toContain('data-[popup-open]:bg-[color:var(--btn-fill-hover,var(--btn-fill,transparent))]')
  })

  it('menu/position and menu/position-flip: 4 px below the trigger at its start edge, from the geometry (measured in Chrome)', async () => {
    render(<Product />)
    const m = await openMenu(userEvent.setup())
    const positioner = m.parentElement as HTMLElement
    expect(positioner.dataset.side).toBe('bottom')
    expect(positioner.dataset.align).toBe('start')
    expect(positioner.dataset.mono).toBe('menu')
  })

  it('menu/surface: the raised fill, the overlay shadow, the large radius, and the padding; no scrim (measured in Chrome)', async () => {
    render(<Product />)
    const m = await openMenu(userEvent.setup())
    for (const name of ['bg-mono-raised', 'shadow-mono-overlay', 'rounded-mono-lg', 'p-(--mono-menu-menu-padding)', 'min-w-(--mono-menu-menu-min-width)']) {
      expect(m.className).toContain(name)
    }
    expect(document.querySelector('[class*="bg-mono-scrim"]')).toBeNull()
  })

  it('menu/item and menu/density: the item takes the tokens of the density and the geometry (measured in Chrome)', async () => {
    render(<Product />)
    await openMenu(userEvent.setup())
    const edit = screen.getByRole('menuitem', { name: 'Edit' })
    for (const name of ['min-h-(--mono-size-control-md)', 'px-(--mono-menu-item-padding)', 'rounded-mono-sm', 'text-mono-body']) {
      expect(edit.className).toContain(name)
    }
    const icon = edit.querySelector('[data-part="icon"]') as HTMLElement
    expect(icon.className).toContain('size-(--mono-size-icon)')
    expect(icon.className).toContain('me-(--mono-menu-icon-gap)')
    expect(icon.className).toContain('text-mono-fg-muted')
  })

  it('menu/target: the full item is the target; a separator and a group label are not targets and get no focus', async () => {
    render(<Product size="sm" />)
    expect(trigger().className).toContain('after:min-h-(--mono-size-target-min)')
    const m = await openMenu(userEvent.setup())
    for (const el of m.querySelectorAll('[data-part="separator"], [data-part="group-label"]')) {
      expect(el.getAttribute('role')).not.toBe('menuitem')
      expect(el.hasAttribute('tabindex')).toBe(false)
    }
    // The icon, the label, and the key cap are inside the item: a press on each is a press on the item.
    const edit = screen.getByRole('menuitem', { name: 'Edit' })
    expect(edit.querySelectorAll('[data-part="icon"], [data-part="label"], [data-part="shortcut"]')).toHaveLength(3)
  })

  it('menu/wrap and menu/no-truncate: a long label goes to a second line, and the menu has a minimum width only', async () => {
    render(<Menu label="Product actions" items={[{ label: 'Move the product to a different shop and keep its orders' }]} />)
    const m = await openMenu(userEvent.setup())
    expect(m.className).toContain('w-max')
    expect(m.className).toContain('max-w-(--available-width)')
    const label = m.querySelector('[data-part="label"]') as HTMLElement
    expect(label.className).toContain('whitespace-normal')
    expect(label.className).not.toContain('truncate')
    expect(label.className).not.toContain('text-ellipsis')
  })

  it('menu/shortcut, menu/shortcut-look, and menu/shortcut-desktop: the key cap at the end side, only at 1024 px or more', async () => {
    render(<Product />)
    await openMenu(userEvent.setup())
    const key = screen.getByRole('menuitem', { name: 'Edit' }).querySelector('[data-part="shortcut"]') as HTMLElement
    expect(key.tagName).toBe('KBD')
    expect(key.textContent).toBe('E')
    // The last child of the item, thus at the end side (measured in Chrome).
    expect(key.parentElement?.lastElementChild === key || key.nextElementSibling?.hasAttribute('hidden')).toBe(true)
    for (const name of ['hidden', 'mono-desktop:inline-flex', 'bg-mono-selected', 'border-mono-line-strong', 'font-mono', 'text-mono-fg-2']) {
      expect(key.className.split(' ')).toContain(name)
    }
  })

  it('menu/group: a group label names the items below it, with the caption size and the muted text color', async () => {
    render(<Product />)
    const m = await openMenu(userEvent.setup())
    const label = m.querySelector('[data-part="group-label"]') as HTMLElement
    expect(label.textContent).toBe('Blue shirt')
    expect(label.className).toContain('text-mono-caption')
    expect(label.className).toContain('text-mono-fg-muted')
    // The label is at the top of the group: the first child.
    expect(label.parentElement?.firstElementChild).toBe(label)
  })

  it('menu/separator: a separator divides two groups, and the accessibility tree shows it as a separator', async () => {
    render(<Product />)
    const m = await openMenu(userEvent.setup())
    const separators = within(m).getAllByRole('separator')
    // One between the two groups, one before the destructive item.
    expect(separators).toHaveLength(2)
    expect(separators[0]?.className).toContain('bg-mono-line-subtle')
    expect(separators[0]?.className).toContain('-mx-(--mono-menu-menu-padding)')
  })

  it('menu/destructive and menu/destructive-sign: the last item, after a separator, with a verb and the danger text color', async () => {
    render(<Product />)
    const m = await openMenu(userEvent.setup())
    const items = within(m).getAllByRole('menuitem')
    const last = items.at(-1) as HTMLElement
    expect(last).toBe(screen.getByRole('menuitem', { name: 'Delete product' }))
    expect(last.dataset.part).toBe('destructive-item')
    expect(last.previousElementSibling?.getAttribute('role')).toBe('separator')
    expect(last.className).toContain('text-mono-danger-text')
    expect(last.className).toContain('[--mi-active:var(--mono-color-role-danger-soft)]')
    expect(last.querySelector('[data-part="icon"]')?.className).toContain('text-mono-danger-text')
  })

  it('menu/keyboard: Tab focuses the trigger; Enter, Space, and the down arrow open at the first item; the up arrow at the last', async () => {
    render(
      <div>
        <button type="button">Before</button>
        <Product />
      </div>,
    )
    const user = userEvent.setup()
    await user.tab()
    await user.tab()
    expect(document.activeElement).toBe(trigger())
    for (const key of ['{Enter}', ' ', '{ArrowDown}']) {
      await press(user, key, 'Edit')
      await press(user, '{Escape}', null)
    }
    await press(user, '{ArrowUp}', 'Delete product')
  })

  it('menu/arrow-keys and menu/skip: the arrows move the focus, go around at the ends, and pass over the separators and labels', async () => {
    render(<Product />)
    const user = userEvent.setup()
    await user.tab()
    await press(user, '{Enter}', 'Edit')
    for (const name of ['Duplicate', 'Share link', 'Archive', 'Delete product', 'Edit']) await press(user, '{ArrowDown}', name)
    await press(user, '{ArrowUp}', 'Delete product')
    await press(user, '{ArrowUp}', 'Archive')
  })

  it('menu/home-end: Home moves the focus to the first item, and End to the last item', async () => {
    render(<Product />)
    const user = userEvent.setup()
    await user.tab()
    await press(user, '{ArrowDown}', 'Edit')
    await press(user, '{End}', 'Delete product')
    await press(user, '{Home}', 'Edit')
  })

  it('menu/typeahead: typed characters move the focus to the next item with that start; the menu does not filter', async () => {
    render(<Product />)
    const user = userEvent.setup()
    await user.tab()
    await press(user, '{Enter}', 'Edit')
    await press(user, 's', 'Share link')
    await tick()
    await act(() => new Promise((resolve) => setTimeout(resolve, 600)))
    await press(user, 'd', 'Delete product')
    expect(screen.getAllByRole('menuitem')).toHaveLength(5)
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('menu/activate: Enter and Space start the action and close the menu; the focus goes back to the trigger', async () => {
    const spy = vi.fn()
    render(<Product spy={spy} />)
    const user = userEvent.setup()
    await user.tab()
    await press(user, '{Enter}', 'Edit')
    await press(user, '{Enter}', null)
    expect(spy).toHaveBeenLastCalledWith('Edit')
    await waitFor(() => expect(document.activeElement).toBe(trigger()))
    await press(user, '{Enter}', 'Edit')
    await press(user, '{ArrowDown}', 'Duplicate')
    await press(user, ' ', null)
    expect(spy).toHaveBeenLastCalledWith('Duplicate')
    await waitFor(() => expect(document.activeElement).toBe(trigger()))
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('menu/activate and menu/confirm: if the action opens a dialog, the focus goes into the dialog', async () => {
    function WithConfirm() {
      const [confirm, setConfirm] = useState(false)
      return (
        <>
          <Menu label="Product actions" items={[{ label: 'Edit' }]} destructive={{ label: 'Delete product', onSelect: () => setConfirm(true) }} />
          <Dialog.Root open={confirm} onOpenChange={setConfirm}>
            <Dialog.Portal>
              <Dialog.Popup aria-label="Delete the product">
                <button type="button">Cancel</button>
                <button type="button">Delete</button>
              </Dialog.Popup>
            </Dialog.Portal>
          </Dialog.Root>
        </>
      )
    }
    render(<WithConfirm />)
    const user = userEvent.setup()
    await user.tab()
    await press(user, '{ArrowUp}', 'Delete product')
    await user.keyboard('{Enter}')
    const dialog = await screen.findByRole('dialog', { name: 'Delete the product' })
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))
    expect(menu()).toBeNull()
  })

  it('menu/escape: Escape closes with no action and the focus goes to the trigger; Tab closes and goes to the next control', async () => {
    const spy = vi.fn()
    render(
      <div>
        <Product spy={spy} />
        <button type="button">After</button>
      </div>,
    )
    const user = userEvent.setup()
    await user.tab()
    await press(user, '{Enter}', 'Edit')
    await press(user, '{Escape}', null)
    expect(document.activeElement).toBe(trigger())
    await press(user, '{Enter}', 'Edit')
    await press(user, '{ArrowDown}', 'Duplicate')
    await user.tab()
    await waitFor(() => expect(menu()).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'After' })))
    expect(spy).not.toHaveBeenCalled()
  })

  it('menu/focus: the focus goes into the menu; the item with the focus has the selected fill and the focus ring', async () => {
    render(<Product />)
    const user = userEvent.setup()
    const m = await openMenu(user)
    await waitFor(() => expect(m.contains(document.activeElement)).toBe(true))
    await user.keyboard('{ArrowDown}')
    await waitFor(() => expect(focused()).not.toBeNull())
    const item = document.activeElement as HTMLElement
    expect(item.hasAttribute('data-highlighted')).toBe(true)
    expect(item.className).toContain('data-[highlighted]:[--mi-on:var(--mi-active)]')
    expect(item.className).toContain('[--mi-active:var(--mono-color-role-selected)]')
    expect(item.className).toContain('focus-visible:outline-solid')
    expect(item.className).toContain('focus-visible:outline-offset-(--mono-focus-ring-offset)')
  })

  it('menu/trigger-focus: the trigger has the focus ring of a button, for keyboard focus only (measured in Chrome)', () => {
    render(<Product />)
    expect(trigger().className).toContain('focus-visible:outline-solid')
    expect(trigger().className).toContain('focus-visible:outline-(length:--mono-focus-ring-width)')
  })

  it('menu/pointer: a press opens and a second press closes; a press on an item acts and closes; a press out closes', async () => {
    const spy = vi.fn()
    render(
      <div>
        <Product spy={spy} />
        <p>Outside</p>
      </div>,
    )
    const user = userEvent.setup()
    await openMenu(user)
    await user.click(trigger())
    await waitFor(() => expect(menu()).toBeNull())
    await openMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'Share link' }))
    await waitFor(() => expect(menu()).toBeNull())
    expect(spy).toHaveBeenCalledWith('Share link')
    await openMenu(user)
    await user.click(document.body)
    await waitFor(() => expect(menu()).toBeNull())
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('menu/hover: the hover class is only for a device with hover; at pointer down, the pressed fill; a fill change of 150 ms', async () => {
    render(<Product />)
    const user = userEvent.setup()
    await openMenu(user)
    const share = screen.getByRole('menuitem', { name: 'Share link' })
    // Tailwind puts hover: in @media (hover: hover). Thus a phone shows only the pressed fill.
    expect(share.className).toContain('hover:[--mi-on:var(--mi-active)]')
    expect(share.className).toContain('not-data-[disabled]:active:[--mi-down:var(--mi-pressed)]')
    expect(share.className).toContain('[--mi-pressed:var(--mono-color-role-pressed)]')
    expect(share.className).toContain('duration-(--mono-duration-fast)')
    await user.hover(share)
    await waitFor(() => expect(share.hasAttribute('data-highlighted')).toBe(true))
  })

  it('menu/disabled: a disabled item can get the focus, does not act, and tells why', async () => {
    const spy = vi.fn()
    render(<Product spy={spy} />)
    const user = userEvent.setup()
    await user.tab()
    await press(user, '{Enter}', 'Edit')
    for (const name of ['Duplicate', 'Share link', 'Archive']) await press(user, '{ArrowDown}', name)
    const archive = screen.getByRole('menuitem', { name: 'Archive', description: 'Publish the product first' })
    expect(archive.getAttribute('aria-disabled')).toBe('true')
    expect(archive.className).toContain('data-[disabled]:*:opacity-(--mono-opacity-disabled)')
    await user.keyboard('{Enter}')
    await tick()
    await user.click(archive)
    await tick()
    expect(spy).not.toHaveBeenCalled()
    expect(menu()).not.toBeNull()
  })

  it('menu/disabled-trigger: the disabled opacity; it stays in the focus order, tells why, and its menu does not open', async () => {
    const onOpenChange = vi.fn()
    render(<Product disabled disabledReason="Open the shop first" onOpenChange={onOpenChange} />)
    const t = screen.getByRole('button', { name: 'Product actions', description: 'Open the shop first' })
    expect(t.getAttribute('aria-disabled')).toBe('true')
    expect(t.hasAttribute('disabled')).toBe(false)
    expect(t.className).toContain('data-[disabled]:opacity-(--mono-opacity-disabled)')
    const user = userEvent.setup()
    await user.tab()
    expect(document.activeElement).toBe(t)
    for (const key of ['{Enter}', ' ', '{ArrowDown}', '{ArrowUp}']) {
      await user.keyboard(key)
      await tick()
    }
    await user.click(t)
    await tick()
    expect(menu()).toBeNull()
    expect(t.getAttribute('aria-expanded')).toBe('false')
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('menu/action-sheet: at a width of less than 768 px, the menu opens as an action sheet; the prop container selects it', async () => {
    stubWidth(true)
    render(
      <div>
        <Product />
        <Product label="Order actions" container="menu" />
      </div>,
    )
    expect(trigger().getAttribute('aria-haspopup')).toBe('dialog')
    expect(trigger('Order actions').getAttribute('aria-haspopup')).toBe('menu')
    const user = userEvent.setup()
    await user.click(trigger())
    const sheet = await screen.findByRole('dialog', { name: 'Product actions' })
    expect(sheet.dataset.part).toBe('action-sheet')
    expect(menu()).toBeNull()
  })

  it('menu/tablet: at a width of 768 px or more, the menu opens at its trigger, not as an action sheet', async () => {
    stubWidth(false)
    render(<Product />)
    expect(trigger().getAttribute('aria-haspopup')).toBe('menu')
    await openMenu(userEvent.setup())
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('menu/action-sheet-items and menu/surfaces: the same items, order, labels, icons, and actions in the two containers', async () => {
    const spy = vi.fn()
    render(
      <div>
        <Product spy={spy} />
        <Product label="Sheet actions" container="action-sheet" spy={spy} />
      </div>,
    )
    const user = userEvent.setup()
    const m = await openMenu(user)
    const inMenu = names('menuitem', m)
    const menuIcons = within(m).getAllByRole('menuitem').map((e) => e.querySelector('[data-part="icon"]')?.innerHTML ?? null)
    await press(user, '{Escape}', null)
    await user.click(trigger('Sheet actions'))
    const sheet = await screen.findByRole('dialog')
    const items = [...sheet.querySelectorAll<HTMLElement>('[data-part="item"], [data-part="destructive-item"]')]
    expect(items.map((e) => document.getElementById(e.getAttribute('aria-labelledby') ?? '')?.textContent)).toEqual(inMenu)
    expect(items.map((e) => e.querySelector('[data-part="icon"]')?.innerHTML ?? null)).toEqual(menuIcons)
    expect(within(sheet).getByRole('group', { name: 'Blue shirt' })).toBeTruthy()
    // The destructive item stays last, after a separator. The sheet shows no shortcut.
    const last = items.at(-1) as HTMLElement
    expect(last.dataset.part).toBe('destructive-item')
    expect(last.previousElementSibling?.getAttribute('role')).toBe('separator')
    expect(sheet.querySelector('[data-part="shortcut"]')).toBeNull()
    await user.click(within(sheet).getByRole('button', { name: 'Share link' }))
    expect(spy).toHaveBeenCalledWith('Share link')
  })

  it('menu/action-sheet-look and menu/action-sheet-rows: the tokens of the sheet; the touch density (measured in Chrome)', async () => {
    render(<Product container="action-sheet" />)
    await userEvent.setup().click(trigger())
    const sheet = await screen.findByRole('dialog')
    for (const name of ['bg-mono-raised', 'shadow-mono-overlay', 'rounded-t-mono-xl', 'px-(--mono-menu-sheet-padding)']) {
      expect(sheet.className).toContain(name)
    }
    expect(sheet.className).toContain('env(safe-area-inset-bottom')
    expect(sheet.closest('[data-mono="menu"]')?.getAttribute('data-density')).toBe('touch')
    const handle = sheet.querySelector('[data-part="handle"]') as HTMLElement
    expect(handle.getAttribute('aria-hidden')).toBe('true')
    expect(handle.className).toContain('bg-mono-line-strong')
  })

  it('menu/action-sheet-role: a modal dialog with the name of the menu; the focus stays inside and goes back to the trigger', async () => {
    render(
      <div>
        <Product container="action-sheet" />
        <button type="button">After</button>
      </div>,
    )
    const user = userEvent.setup()
    await user.tab()
    await user.keyboard('{Enter}')
    const sheet = await screen.findByRole('dialog', { name: 'Product actions' })
    expect(sheet.getAttribute('aria-modal')).toBe('true')
    await waitFor(() => expect(sheet.contains(document.activeElement)).toBe(true))
    // The focus trap: Tab goes around inside the sheet.
    for (let i = 0; i < 8; i++) {
      await user.tab()
      // Base UI moves the focus from a focus guard back into the sheet after a tick.
      await tick()
      expect(sheet.contains(document.activeElement)).toBe(true)
    }
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(trigger()))
  })

  it('menu/action-sheet-close: a tap on an item acts and closes; the scrim and Escape close with no action', async () => {
    const spy = vi.fn()
    render(<Product container="action-sheet" spy={spy} />)
    const user = userEvent.setup()
    await user.click(trigger())
    const sheet = await screen.findByRole('dialog')
    const scrim = document.querySelector('[data-part="scrim"]') as HTMLElement
    expect(scrim.className).toContain('bg-mono-scrim')
    await user.click(scrim)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await user.click(trigger())
    await screen.findByRole('dialog')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(spy).not.toHaveBeenCalled()
    await user.click(trigger())
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Edit' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(spy).toHaveBeenCalledWith('Edit')
    // A disabled item does not act and does not close the sheet.
    await user.click(trigger())
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Archive' }))
    await tick()
    expect(screen.queryByRole('dialog')).not.toBeNull()
    expect(sheet).toBeTruthy()
    // The sheet has no drag: the draggable sheet is the Bottom sheet. The back gesture of the system is a rule for the
    // native platforms.
    expect(clause('menu/action-sheet-close')?.classes).toEqual(['phone'])
  })

  it('menu/action-sheet-motion, menu/motion, and menu/motion-reduced: the motion classes (measured in Chrome)', async () => {
    render(
      <div>
        <Product />
        <Product label="Sheet actions" container="action-sheet" />
      </div>,
    )
    const user = userEvent.setup()
    const m = await openMenu(user)
    expect(m.className).toContain('origin-(--transform-origin)')
    expect(m.className).toContain('data-[starting-style]:scale-[var(--menu-still-scale,var(--mono-scale-menu-in))]')
    expect(m.className).toContain('motion-reduce:[--menu-still-scale:1]')
    await press(user, '{Escape}', null)
    await user.click(trigger('Sheet actions'))
    const sheet = await screen.findByRole('dialog')
    expect(sheet.className).toContain('[transition-duration:var(--ms-in,var(--mono-duration-sheet))]')
    expect(sheet.className).toContain('motion-reduce:[--ms-slide:0px]')
  })

  it('menu/direction and menu/direction-motion: the icon comes first and the shortcut last; the menu gets the direction', async () => {
    render(
      <div dir="rtl">
        <Product />
      </div>,
    )
    const m = await openMenu(userEvent.setup())
    const parts = [...screen.getByRole('menuitem', { name: 'Edit' }).children].map((e) => e.getAttribute('data-part'))
    expect(parts).toEqual(['icon', 'label', 'shortcut'])
    expect(m.parentElement?.getAttribute('dir')).toBe('rtl')
    // The offset of the entrance is vertical: translate-y only (measured in Chrome).
    expect(m.className).not.toContain('translate-x')
  })

  it('menu/moment: open, then select before close; a move of the focus emits no moment', async () => {
    const onMoment = vi.fn<(e: MomentEvent) => void>()
    render(
      <MomentProvider onMoment={onMoment}>
        <Product />
      </MomentProvider>,
    )
    const user = userEvent.setup()
    await user.tab()
    await press(user, '{Enter}', 'Edit')
    await press(user, '{ArrowDown}', 'Duplicate')
    await press(user, '{Enter}', null)
    await openMenu(user)
    await press(user, '{Escape}', null)
    expect(onMoment.mock.calls.map(([e]) => e.moment)).toEqual(['open', 'select', 'close', 'open', 'close'])
    expect(new Set(onMoment.mock.calls.map(([e]) => e.source))).toEqual(new Set(['menu']))
  })

  it('menu/moment: the action sheet emits open, then select before close', async () => {
    const onMoment = vi.fn<(e: MomentEvent) => void>()
    render(
      <MomentProvider onMoment={onMoment}>
        <Product container="action-sheet" />
      </MomentProvider>,
    )
    const user = userEvent.setup()
    await user.click(trigger())
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Edit' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await user.click(trigger())
    await screen.findByRole('dialog')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(onMoment.mock.calls.map(([e]) => e.moment)).toEqual(['open', 'select', 'close', 'open', 'close'])
  })

  it('menu/moment-trigger: a press on the trigger emits only open; a disabled trigger and a disabled item emit no moment', async () => {
    const onMoment = vi.fn<(e: MomentEvent) => void>()
    render(
      <MomentProvider onMoment={onMoment}>
        <Product />
        <Product label="Shop actions" disabled />
      </MomentProvider>,
    )
    const user = userEvent.setup()
    await user.click(trigger('Shop actions'))
    await tick()
    expect(onMoment).not.toHaveBeenCalled()
    await openMenu(user)
    expect(onMoment.mock.calls).toEqual([[{ moment: 'open', variant: undefined, source: 'menu' }]])
    await user.click(screen.getByRole('menuitem', { name: 'Archive' }))
    await tick()
    expect(onMoment).toHaveBeenCalledTimes(1)
  })

  it('menu/no-direct-feedback: the menu calls no vibration API', async () => {
    const vibrate = vi.fn()
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true })
    render(<Product />)
    const user = userEvent.setup()
    await openMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'Edit' }))
    expect(vibrate).not.toHaveBeenCalled()
  })

  it('menu/tv, menu/tv-focus, menu/car, menu/watch, menu/xr: device classes that this package does not target (review)', () => {
    expect(clause('menu/tv')?.classes).toEqual(['tv'])
    expect(clause('menu/tv-focus')?.classes).toEqual(['tv'])
    expect(clause('menu/car')?.classes).toEqual(['car'])
    expect(clause('menu/watch')?.classes).toEqual(['watch'])
    expect(clause('menu/watch')?.level).toBe('SHOULD')
    expect(clause('menu/xr')?.classes).toEqual(['xr'])
  })
})
