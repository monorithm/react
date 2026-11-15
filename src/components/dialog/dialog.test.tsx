// The tests of the Dialog. Each name starts with the id of a clause of ir/contracts/dialog.json. The browser test
// (test/browser/dialog.browser.test.tsx) measures the clauses that jsdom cannot compute: the sizes, the colors, the two
// forms, and the motion. Base UI renders no dialog in static markup, thus these tests examine the behavior.
import fs from 'node:fs'
import path from 'node:path'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { violations } from '@monorithm/react/test/axe'
import { contract as loadContract } from '@monorithm/react/test/contract'
import { MomentProvider } from '@monorithm/react/contexts/moment-context'
import { type MomentEvent } from '@monorithm/react/lib/moments'
import { tokens } from '@monorithm/react/tokens/values'
import { Button } from '../button/button'
import { Dialog, type DialogProps } from './dialog'

const contract = loadContract('dialog')
const clause = (id: string) => contract.clauses.find((c) => c.id === id) as (typeof contract.clauses)[number] & { classes?: string[] }
const variantsSource = fs.readFileSync(path.join(import.meta.dirname, 'dialog.variants.ts'), 'utf8')

const TITLE = 'Delete this product?'
const TEXT = 'The product goes to the trash. You can restore it for 30 days.'

const Delete = (props: Partial<DialogProps>) => (
  <Dialog
    variant="destructive"
    title={TITLE}
    description={TEXT}
    confirmLabel="Delete product"
    cancelLabel="Keep product"
    trigger={<button type="button">Delete</button>}
    {...props}
  />
)

type User = ReturnType<typeof userEvent.setup>
const dialog = () => screen.getByRole('alertdialog')
const safe = () => within(dialog()).getByRole('button', { name: 'Keep product' })
const confirm = () => within(dialog()).getByRole('button', { name: 'Delete product' })
/** Presses the trigger, then waits for the dialog and the focus on the safe action. */
async function openDialog(user: User, name = 'Delete') {
  await user.click(screen.getByRole('button', { name }))
  await waitFor(() => expect(document.activeElement).toBe(safe()))
}
const closed = () => waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
/** Waits 50 ms: a key or a press that does nothing has no state to wait for. */
const tick = () => act(() => new Promise((resolve) => setTimeout(resolve, 50)))

beforeAll(() => {
  // The geometry of the contracts: the dialog reads --mono-dialog-phone-below-width for the phone form.
  const style = document.createElement('style')
  style.textContent = fs.readFileSync(path.join(import.meta.dirname, '../../tokens/components.css'), 'utf8')
  document.head.append(style)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Dialog', () => {
  it('the tests cover each clause of the contract', () => {
    const tested = new Set([
      'dialog/role', 'dialog/use', 'dialog/title', 'dialog/action-name', 'dialog/description', 'dialog/two-actions',
      'dialog/variant', 'dialog/destructive-sign', 'dialog/initial-focus', 'dialog/focus-stays', 'dialog/inert',
      'dialog/scroll-lock', 'dialog/escape', 'dialog/safe-action', 'dialog/confirm-action', 'dialog/return-focus',
      'dialog/lost-origin', 'dialog/scrim', 'dialog/container', 'dialog/layer', 'dialog/width', 'dialog/spacing',
      'dialog/type', 'dialog/density', 'dialog/overflow', 'dialog/footer', 'dialog/footer-phone', 'dialog/phone',
      'dialog/phone-close', 'dialog/tablet', 'dialog/target', 'dialog/focus', 'dialog/direction', 'dialog/direction-motion',
      'dialog/motion', 'dialog/motion-phone', 'dialog/motion-reduced', 'dialog/moment', 'dialog/no-direct-feedback',
      'dialog/disabled', 'dialog/surfaces', 'dialog/tv', 'dialog/car', 'dialog/watch', 'dialog/xr', 'dialog/foldable',
    ])
    expect(contract.clauses.map((c) => c.id).filter((id) => !tested.has(id))).toEqual([])
  })

  it('dialog/role: a modal alert dialog; the title is its name and the text is its description', async () => {
    render(<Delete />)
    const trigger = screen.getByRole('button', { name: 'Delete' })
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog')
    await openDialog(userEvent.setup())
    const d = screen.getByRole('alertdialog', { name: TITLE, description: TEXT })
    expect(d.getAttribute('aria-modal')).toBe('true')
    expect(d.dataset.mono).toBe('dialog')
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
  })

  it('dialog/role: axe finds no violation in each variant, with the dialog open, and with a disabled action', async () => {
    for (const props of [
      { variant: 'confirm' as const, title: 'Mark the order as shipped?', confirmLabel: 'Mark as shipped' },
      { variant: 'destructive' as const },
      { confirmDisabled: true, confirmDisabledReason: 'The product is in an open order. Close the order first.' },
    ]) {
      const view = render(<Delete defaultOpen {...props} />)
      await screen.findByRole('alertdialog')
      expect(await violations(document.body)).toEqual([])
      view.unmount()
    }
  })

  it('dialog/use: a dialog only confirms an action that the user cannot undo; a rule for the app (review)', () => {
    expect(clause('dialog/use').level).toBe('SHOULD')
  })

  it('dialog/title: the title is the heading and the name of the dialog; its words are a rule for the app (review)', async () => {
    render(<Delete defaultOpen />)
    const heading = await screen.findByRole('heading', { level: 2, name: TITLE })
    expect(dialog().getAttribute('aria-labelledby')).toBe(heading.id)
  })

  it('dialog/action-name: the confirm label is the name of the confirm action; its words are a rule for the app (review)', async () => {
    render(<Delete defaultOpen confirmLabel="Delete message" cancelLabel="Keep message" />)
    await screen.findByRole('alertdialog')
    expect(within(dialog()).getAllByRole('button').map((b) => b.textContent)).toEqual(['Keep message', 'Delete message'])
  })

  it('dialog/description: assistive technology reads the text as the description of the dialog', async () => {
    render(<Delete defaultOpen description="The file goes to the trash." />)
    await screen.findByRole('alertdialog')
    const text = document.getElementById(dialog().getAttribute('aria-describedby') ?? '')
    expect(text?.textContent).toBe('The file goes to the trash.')
    expect(screen.getByRole('alertdialog', { description: 'The file goes to the trash.' })).toBe(dialog())
  })

  it('dialog/two-actions: the dialog has two actions, the safe action and the confirm action', async () => {
    render(<Delete defaultOpen />)
    await screen.findByRole('alertdialog')
    expect(within(dialog()).getAllByRole('button')).toHaveLength(2)
    expect(clause('dialog/two-actions').level).toBe('SHOULD')
  })

  it('dialog/variant: the safe action is ghost; the confirm action is primary, or destructive for an action that removes data', async () => {
    const view = render(<Delete defaultOpen variant="confirm" confirmLabel="Mark as shipped" />)
    await screen.findByRole('alertdialog')
    expect(dialog().dataset.variant).toBe('confirm')
    expect(safe().dataset.variant).toBe('ghost')
    expect(within(dialog()).getByRole('button', { name: 'Mark as shipped' }).dataset.variant).toBe('primary')
    view.unmount()
    render(<Delete defaultOpen />)
    await screen.findByRole('alertdialog')
    expect(safe().dataset.variant).toBe('ghost')
    expect(confirm().dataset.variant).toBe('destructive')
  })

  it('dialog/variant: confirm is the default variant', async () => {
    render(<Dialog defaultOpen title="Mark the order as shipped?" description="The buyer gets a message." confirmLabel="Mark as shipped" cancelLabel="Cancel" />)
    await screen.findByRole('alertdialog')
    expect(within(dialog()).getByRole('button', { name: 'Mark as shipped' }).dataset.variant).toBe('primary')
  })

  it('dialog/destructive-sign: the title and the confirm label name the action; the color is not the only sign', async () => {
    render(<Delete defaultOpen />)
    await screen.findByRole('alertdialog')
    expect(screen.getByRole('alertdialog', { name: TITLE })).toBeTruthy()
    expect(confirm().textContent).toBe('Delete product')
  })

  it('dialog/initial-focus: at the open, the focus moves to the safe action, with the keyboard and with the pointer', async () => {
    render(<Delete />)
    const user = userEvent.setup()
    await openDialog(user)
    await user.keyboard('{Escape}')
    await closed()
    // The keyboard: Enter on the trigger.
    await user.keyboard('{Enter}')
    await waitFor(() => expect(document.activeElement).toBe(safe()))
    await user.keyboard('{Escape}')
    await closed()
    // A touch: Base UI focuses the container after a touch, but the dialog asks for the safe action.
    await user.pointer([{ keys: '[TouchA>]', target: screen.getByRole('button', { name: 'Delete' }) }, { keys: '[/TouchA]' }])
    await waitFor(() => expect(document.activeElement).toBe(safe()))
  })

  it('dialog/initial-focus: a controlled dialog with no trigger also moves the focus to the safe action', async () => {
    function Page() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Remove
          </button>
          <Delete trigger={undefined} open={open} onOpenChange={setOpen} />
        </>
      )
    }
    render(<Page />)
    await openDialog(userEvent.setup(), 'Remove')
  })

  it('dialog/focus-stays: Tab and Shift Tab move the focus only between the controls of the dialog', async () => {
    render(
      <>
        <button type="button">Before</button>
        <Delete />
        <button type="button">After</button>
      </>,
    )
    const user = userEvent.setup()
    await openDialog(user)
    const seen: (string | null | undefined)[] = []
    // A focus guard of Base UI at each end of the dialog moves the focus back into the dialog after a tick.
    const actions = ['Keep product', 'Delete product']
    for (const shift of [false, false, false, true, true, true]) {
      await user.tab({ shift })
      await waitFor(() => expect(actions).toContain(document.activeElement?.textContent))
      seen.push(document.activeElement?.textContent)
    }
    expect(seen).toEqual(['Delete product', 'Keep product', 'Delete product', 'Keep product', 'Delete product', 'Keep product'])
  })

  it('dialog/inert: while the dialog is open, assistive technology does not read the page behind', async () => {
    render(
      <main>
        <button type="button">Page action</button>
        <Delete />
      </main>,
    )
    const page = screen.getByRole('button', { name: 'Page action' })
    await openDialog(userEvent.setup())
    await waitFor(() => expect(page.closest('[aria-hidden="true"]')).toBeTruthy())
    expect(screen.queryByRole('button', { name: 'Page action' })).toBeNull()
    expect(dialog().closest('[aria-hidden="true"]')).toBeNull()
    // The viewport covers the window above the page, thus a pointer cannot press the page (measured in Chrome).
    expect(dialog().parentElement?.className).toContain('fixed inset-0')
  })

  it('dialog/scroll-lock: while the dialog is open, the page does not scroll; the close removes the lock', async () => {
    render(<Delete />)
    const user = userEvent.setup()
    await openDialog(user)
    const locked = () => getComputedStyle(document.documentElement).overflowY === 'hidden' || getComputedStyle(document.body).overflowY === 'hidden'
    expect(locked()).toBe(true)
    await user.keyboard('{Escape}')
    await closed()
    await waitFor(() => expect(locked()).toBe(false))
  })

  it('dialog/escape: Escape closes the dialog with no change, as the safe action does', async () => {
    const onConfirm = vi.fn()
    const onOpenChange = vi.fn()
    render(<Delete onConfirm={onConfirm} onOpenChange={onOpenChange} />)
    const user = userEvent.setup()
    await openDialog(user)
    await user.keyboard('{Escape}')
    await closed()
    expect(onConfirm).not.toHaveBeenCalled()
    expect(onOpenChange.mock.calls).toEqual([[true], [false]])
  })

  it('dialog/safe-action: the safe action closes the dialog with no change', async () => {
    const onConfirm = vi.fn()
    const onOpenChange = vi.fn()
    render(<Delete onConfirm={onConfirm} onOpenChange={onOpenChange} />)
    const user = userEvent.setup()
    await openDialog(user)
    await user.click(safe())
    await closed()
    expect(onConfirm).not.toHaveBeenCalled()
    expect(onOpenChange.mock.calls).toEqual([[true], [false]])
  })

  it('dialog/confirm-action: the confirm action starts the action one time and closes the dialog', async () => {
    const onConfirm = vi.fn()
    const onOpenChange = vi.fn()
    render(<Delete onConfirm={onConfirm} onOpenChange={onOpenChange} />)
    const user = userEvent.setup()
    await openDialog(user)
    await user.click(confirm())
    await closed()
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onOpenChange.mock.calls).toEqual([[true], [false]])
  })

  it('dialog/confirm-action: Enter on the focused confirm action confirms; a Button can be the trigger', async () => {
    const onConfirm = vi.fn()
    render(<Delete onConfirm={onConfirm} trigger={<Button variant="destructive">Delete</Button>} />)
    const user = userEvent.setup()
    await openDialog(user)
    await user.tab()
    expect(document.activeElement).toBe(confirm())
    await user.keyboard('{Enter}')
    await closed()
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('dialog/return-focus: at the close, the focus goes back to the control that opened the dialog', async () => {
    render(
      <>
        <button type="button">Before</button>
        <Delete />
      </>,
    )
    const user = userEvent.setup()
    const trigger = screen.getByRole('button', { name: 'Delete' })
    for (const close of [() => user.keyboard('{Escape}'), () => user.click(safe()), () => user.click(confirm())]) {
      await openDialog(user)
      await close()
      await closed()
      await waitFor(() => expect(document.activeElement).toBe(trigger))
    }
  })

  it('dialog/return-focus: a controlled dialog returns the focus to the control that had the focus at the open', async () => {
    function Page() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Remove
          </button>
          <Delete trigger={undefined} open={open} onOpenChange={setOpen} />
        </>
      )
    }
    render(<Page />)
    const user = userEvent.setup()
    await openDialog(user, 'Remove')
    await user.keyboard('{Escape}')
    await closed()
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Remove' })))
  })

  describe('dialog/lost-origin', () => {
    /** A list of products. The confirm action of a row removes the row and its trigger. */
    function Products({ initial, inside = false }: { initial: string[]; inside?: boolean }) {
      const [rows, setRows] = useState(initial)
      const [target, setTarget] = useState<string | null>(null)
      const remove = (name: string) => setRows((r) => r.filter((n) => n !== name))
      const dialogFor = (name: string, trigger?: React.ReactElement) => (
        <Delete
          title={`Delete ${name}?`}
          trigger={trigger}
          open={trigger ? undefined : target === name}
          onOpenChange={trigger ? undefined : (o) => setTarget(o ? name : null)}
          onConfirm={() => remove(name)}
        />
      )
      return (
        <>
          <button type="button">Add product</button>
          <ul aria-label="Products">
            {rows.map((name) => (
              <li key={name}>
                {name}
                {inside ? (
                  dialogFor(name, <button type="button">Delete {name}</button>)
                ) : (
                  <button type="button" onClick={() => setTarget(name)}>
                    Delete {name}
                  </button>
                )}
              </li>
            ))}
          </ul>
          {!inside && target ? dialogFor(target) : null}
        </>
      )
    }

    async function deleteRow(user: User, name: string) {
      await openDialog(user, `Delete ${name}`)
      await user.click(confirm())
      await closed()
      await waitFor(() => expect(screen.queryByRole('button', { name: `Delete ${name}` })).toBeNull())
      await tick()
    }

    it('dialog/lost-origin: when the row of the trigger is removed, the focus goes to the next item', async () => {
      render(<Products initial={['Shirt', 'Lamp', 'Mug']} />)
      const user = userEvent.setup()
      await deleteRow(user, 'Lamp')
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Delete Mug' }))
    })

    it('dialog/lost-origin: the same when the dialog is in the removed row', async () => {
      render(<Products initial={['Shirt', 'Lamp', 'Mug']} inside />)
      const user = userEvent.setup()
      await deleteRow(user, 'Lamp')
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Delete Mug' }))
    })

    it('dialog/lost-origin: with no next item, the focus goes to the previous item', async () => {
      render(<Products initial={['Shirt', 'Lamp']} />)
      const user = userEvent.setup()
      await deleteRow(user, 'Lamp')
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Delete Shirt' }))
    })

    it('dialog/lost-origin: with no item, the focus goes to the container, never to the top of the page', async () => {
      render(
        <section aria-label="Products">
          <Products initial={['Lamp']} inside />
        </section>,
      )
      const user = userEvent.setup()
      // Remove the item before the list: then the page has no item before or after the trigger.
      screen.getByRole('button', { name: 'Add product' }).remove()
      await deleteRow(user, 'Lamp')
      expect(document.activeElement).toBe(screen.getByRole('list', { name: 'Products' }))
      expect(document.activeElement).not.toBe(document.body)
    })
  })

  it('dialog/scrim: the scrim covers the page with the scrim color (colors measured in Chrome)', async () => {
    render(<Delete defaultOpen />)
    await screen.findByRole('alertdialog')
    const scrim = document.querySelector('[data-part="scrim"]') as HTMLElement
    expect(scrim.className).toContain('fixed inset-0')
    expect(scrim.className).toContain('bg-mono-scrim')
  })

  it('dialog/container: the raised fill, the overlay shadow, and the large radius (measured in Chrome)', async () => {
    render(<Delete defaultOpen />)
    await screen.findByRole('alertdialog')
    for (const name of ['bg-mono-raised', 'shadow-mono-overlay', 'var(--mono-radius-lg)']) expect(dialog().className).toContain(name)
  })

  it('dialog/layer: the scrim and the dialog are on the modal layer, above the popovers (measured in Chrome)', async () => {
    render(<Delete defaultOpen />)
    await screen.findByRole('alertdialog')
    expect(document.querySelector('[data-part="scrim"]')?.className).toContain('z-(--mono-layer-dialog)')
    expect(document.querySelector('[data-part="viewport"]')?.className).toContain('z-(--mono-layer-dialog)')
  })

  it('dialog/width: the width of the container is the geometry container.width, never more than the window (measured in Chrome)', async () => {
    expect(contract.geometry['container.width']).toEqual({ value: 440, unit: 'px' })
    render(<Delete defaultOpen />)
    await screen.findByRole('alertdialog')
    expect(dialog().className).toContain('var(--mono-dialog-container-width)')
    expect(dialog().className).toContain('max-w-full')
  })

  it('dialog/spacing: the padding, the gap of the title, and the gap of the footer come from the tokens (measured in Chrome)', async () => {
    render(<Delete defaultOpen />)
    await screen.findByRole('alertdialog')
    expect(dialog().className).toContain('var(--mono-space-5)')
    expect(dialog().className).toContain('gap-(--mono-space-4)')
    expect(dialog().querySelector('[data-part="text"]')?.className).toContain('gap-(--mono-dialog-title-gap)')
  })

  it('dialog/type and dialog/density: the title and the text take the type tokens of the density (measured in Chrome)', async () => {
    render(<Delete defaultOpen />)
    await screen.findByRole('alertdialog')
    const title = dialog().querySelector('[data-part="title"]') as HTMLElement
    const text = dialog().querySelector('[data-part="description"]') as HTMLElement
    expect(title.className).toContain('text-mono-title-3 font-mono-strong text-mono-fg-strong')
    expect(text.className).toContain('text-mono-small text-mono-fg-2')
    expect(safe().className).toContain('h-(--mono-size-control-md)')
  })

  it('dialog/overflow: the dialog stays inside the window and the content scrolls (measured in Chrome)', async () => {
    render(<Delete defaultOpen />)
    await screen.findByRole('alertdialog')
    expect(dialog().className).toContain('max-h-full overflow-y-auto')
  })

  it('dialog/footer: the safe action comes first in the DOM, the confirm action last (measured in Chrome)', async () => {
    render(<Delete defaultOpen />)
    await screen.findByRole('alertdialog')
    const footer = dialog().querySelector('[data-part="footer"]') as HTMLElement
    expect([...footer.children]).toEqual([safe(), confirm()])
    expect(footer.className).toContain('justify-end')
  })

  it('dialog/footer-phone: the phone form stacks the actions with the confirm action first (measured in Chrome)', async () => {
    render(<Delete defaultOpen />)
    await screen.findByRole('alertdialog')
    const footer = dialog().querySelector('[data-part="footer"]') as HTMLElement
    expect(footer.className).toContain('max-mono-tablet:[--dlg-footer-direction:column-reverse]')
    expect(confirm().className).toContain('max-mono-tablet:h-(--mono-size-control-lg)')
  })

  it('dialog/phone: the phone form starts below the geometry phone.below-width, the value of the breakpoint tablet', () => {
    const below = contract.geometry['phone.below-width']
    expect(below).toEqual({ value: 768, unit: 'px' })
    expect(tokens['breakpoint.tablet'].value.value).toBe(below?.value)
    // The variants use only the variant of the token, and no typed width.
    expect(variantsSource).toContain('max-mono-tablet:')
    expect([...variantsSource.matchAll(/max-\[(\d+)px\]:/g)]).toEqual([])
  })

  it('dialog/phone: the handle, the top radius, and the bottom safe area of the sheet (measured in Chrome)', async () => {
    render(<Delete defaultOpen />)
    await screen.findByRole('alertdialog')
    const handle = dialog().querySelector('[data-part="handle"]') as HTMLElement
    expect(handle.getAttribute('aria-hidden')).toBe('true')
    expect(handle.className).toContain('bg-mono-line-strong')
    expect(dialog().className).toContain('max-mono-tablet:[--dlg-radius-top:var(--mono-radius-xl)]')
    expect(dialog().className).toContain('env(safe-area-inset-bottom,0px)')
  })

  /** A window less than 768 px wide: matchMedia matches the query of the phone form. */
  const phoneWindow = (phone: boolean) => {
    const matchMedia = vi.fn((query: string) => ({ matches: phone && query === '(width < 768px)', addEventListener() {}, removeEventListener() {} }))
    vi.stubGlobal('matchMedia', matchMedia)
    return matchMedia
  }

  it('dialog/phone-close: on the phone form, a tap on the scrim closes the dialog with no change', async () => {
    const matchMedia = phoneWindow(true)
    const onConfirm = vi.fn()
    render(<Delete onConfirm={onConfirm} />)
    const user = userEvent.setup()
    await openDialog(user)
    await user.click(document.querySelector('[data-part="viewport"]') as HTMLElement)
    await closed()
    expect(matchMedia).toHaveBeenCalledWith('(width < 768px)')
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('dialog/phone-close: on the web form, a press on the scrim does not close the dialog', async () => {
    phoneWindow(false)
    render(<Delete />)
    const user = userEvent.setup()
    await openDialog(user)
    await user.click(document.querySelector('[data-part="viewport"]') as HTMLElement)
    await tick()
    expect(dialog()).toBeTruthy()
    // A press in the dialog does not close it on the phone form.
    vi.unstubAllGlobals()
    phoneWindow(true)
    await user.click(dialog().querySelector('[data-part="title"]') as HTMLElement)
    await tick()
    expect(dialog()).toBeTruthy()
  })

  it('dialog/phone-close: Back (the CloseWatcher of the browser) closes the dialog with no change', async () => {
    const watchers: { onclose: (() => void) | null; destroyed: boolean }[] = []
    vi.stubGlobal(
      'CloseWatcher',
      class {
        onclose: (() => void) | null = null
        destroyed = false
        constructor() {
          watchers.push(this)
        }
        destroy() {
          this.destroyed = true
        }
      },
    )
    const onConfirm = vi.fn()
    render(<Delete onConfirm={onConfirm} />)
    const user = userEvent.setup()
    await openDialog(user)
    const watcher = watchers.find((w) => !w.destroyed)
    act(() => watcher?.onclose?.())
    await closed()
    expect(onConfirm).not.toHaveBeenCalled()
    expect(watchers.every((w) => w.destroyed)).toBe(true)
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Delete' })))
  })

  it('dialog/phone-close: the drag down is a part of the draggable sheet, not of this dialog (review)', () => {
    // This dialog has the look of a sheet on a phone, with no drag. The Bottom sheet component has the drag.
    expect(clause('dialog/phone-close').text).toContain('drag down')
  })

  it('dialog/tablet: from 768 px wide, the dialog is in the center with the web footer (measured in Chrome)', () => {
    expect(clause('dialog/tablet').classes).toEqual(['tablet'])
  })

  it('dialog/target: each action extends its target to the minimum target of the density (measured in Chrome)', async () => {
    render(<Delete defaultOpen />)
    await screen.findByRole('alertdialog')
    for (const b of [safe(), confirm()]) expect(b.className).toContain('after:min-h-(--mono-size-target-min)')
  })

  it('dialog/focus: each action has the focus ring of the language for keyboard focus (measured in Chrome)', async () => {
    render(<Delete defaultOpen />)
    await screen.findByRole('alertdialog')
    for (const b of [safe(), confirm()]) expect(b.className).toContain('focus-visible:outline-solid')
  })

  it('dialog/direction: the portal copies the direction and the axes of the place that opened the dialog', async () => {
    render(
      <div dir="rtl" data-theme="light" data-density="touch" data-motion="reduced">
        <Delete />
      </div>,
    )
    await openDialog(userEvent.setup())
    const portal = dialog().closest('[data-base-ui-portal]') as HTMLElement
    expect(portal.parentElement).toBe(document.body)
    expect(portal.getAttribute('dir')).toBe('rtl')
    expect(portal.dataset).toMatchObject({ theme: 'light', density: 'touch', motion: 'reduced' })
    expect(dialog().className).toContain('text-start')
  })

  it('dialog/direction-motion: the scale starts at the center and the sheet moves on the vertical axis only (measured in Chrome)', async () => {
    render(<Delete defaultOpen />)
    await screen.findByRole('alertdialog')
    expect(dialog().className).toContain('origin-center')
    expect(dialog().className).not.toMatch(/translate-x|rtl:/)
  })

  it('dialog/motion: the open and the close come from the motion tokens (measured in Chrome)', async () => {
    render(<Delete defaultOpen />)
    await screen.findByRole('alertdialog')
    for (const name of ['var(--mono-scale-dialog-in)', 'var(--mono-duration-base)', 'ease-(--mono-easing-out)', 'data-[ending-style]:ease-(--mono-easing-in)']) {
      expect(dialog().className).toContain(name)
    }
    expect(document.querySelector('[data-part="scrim"]')?.className).toContain('data-[ending-style]:opacity-0')
  })

  it('dialog/motion-phone: the sheet comes up in dur-sheet and goes down in dur-base (measured in Chrome)', async () => {
    render(<Delete defaultOpen />)
    await screen.findByRole('alertdialog')
    expect(dialog().className).toContain('motion-safe:max-mono-tablet:[--dlg-in:var(--mono-duration-sheet)]')
    expect(dialog().className).toContain('motion-safe:max-mono-tablet:[--dlg-from-y:100%]')
  })

  it('dialog/motion-reduced: reduced motion has a fade only, with the reduced durations (measured in Chrome)', async () => {
    render(<Delete defaultOpen />)
    await screen.findByRole('alertdialog')
    for (const prefix of ['motion-reduce:', '[[data-motion=reduced]_&]:']) {
      expect(dialog().className).toContain(`${prefix}[--dlg-from-scale:1]`)
      expect(dialog().className).toContain(`${prefix}[--dlg-in:var(--mono-duration-fast)]`)
    }
  })

  it('dialog/moment: open at the open; press for each action; close at the close; a disabled action emits no moment', async () => {
    const onMoment = vi.fn<(e: MomentEvent) => void>()
    const { rerender } = render(
      <MomentProvider onMoment={onMoment}>
        <Delete />
      </MomentProvider>,
    )
    const user = userEvent.setup()
    await openDialog(user)
    await user.click(confirm())
    await closed()
    expect(onMoment.mock.calls.map(([e]) => [e.source, e.moment])).toEqual([
      ['dialog', 'open'],
      ['button', 'press'],
      ['dialog', 'close'],
    ])
    onMoment.mockClear()
    rerender(
      <MomentProvider onMoment={onMoment}>
        <Delete confirmDisabled confirmDisabledReason="The product is in an open order." />
      </MomentProvider>,
    )
    await openDialog(user)
    await user.click(confirm())
    await tick()
    await user.keyboard('{Escape}')
    await closed()
    expect(onMoment.mock.calls.map(([e]) => [e.source, e.moment])).toEqual([
      ['dialog', 'open'],
      ['dialog', 'close'],
    ])
  })

  it('dialog/moment: a controlled dialog emits open and close when the app changes open', async () => {
    const onMoment = vi.fn<(e: MomentEvent) => void>()
    const view = (open: boolean) => (
      <MomentProvider onMoment={onMoment}>
        <Delete trigger={undefined} open={open} />
      </MomentProvider>
    )
    const { rerender } = render(view(false))
    expect(onMoment).not.toHaveBeenCalled()
    rerender(view(true))
    await screen.findByRole('alertdialog')
    rerender(view(false))
    await closed()
    expect(onMoment.mock.calls.map(([e]) => e.moment)).toEqual(['open', 'close'])
  })

  it('dialog/no-direct-feedback: the open, the actions, and the close call no vibration API', async () => {
    const vibrate = vi.fn()
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true })
    render(<Delete />)
    const user = userEvent.setup()
    await openDialog(user)
    await user.click(confirm())
    await closed()
    expect(vibrate).not.toHaveBeenCalled()
  })

  it('dialog/disabled: a disabled confirm action stays in the focus order, does not act, and the dialog tells why', async () => {
    const onConfirm = vi.fn()
    const reason = 'The product is in an open order. Close the order first.'
    render(<Delete onConfirm={onConfirm} confirmDisabled confirmDisabledReason={reason} />)
    const user = userEvent.setup()
    await openDialog(user)
    const button = confirm()
    expect(button.getAttribute('aria-disabled')).toBe('true')
    expect(button.className).toContain('data-[disabled]:opacity-(--mono-opacity-disabled)')
    expect(screen.getByRole('button', { name: 'Delete product', description: reason })).toBe(button)
    expect(within(dialog()).getByText(reason)).toBeTruthy()
    await user.tab()
    expect(document.activeElement).toBe(button)
    await user.click(button)
    await user.keyboard('{Enter}')
    await tick()
    expect(onConfirm).not.toHaveBeenCalled()
    expect(dialog()).toBeTruthy()
  })

  it('dialog/surfaces: the web form and the phone form have the same title, text, and actions', async () => {
    const content = async (phone: boolean) => {
      phoneWindow(phone)
      const view = render(<Delete defaultOpen />)
      await screen.findByRole('alertdialog')
      const html = dialog().innerHTML.replace(/id="[^"]*"|aria-describedby="[^"]*"/g, '')
      view.unmount()
      vi.unstubAllGlobals()
      return html
    }
    expect(await content(true)).toBe(await content(false))
  })

  it('dialog/tv: a clause of the TV class; the web package has no TV axis (review on the platform)', () => {
    expect(clause('dialog/tv').classes).toEqual(['tv'])
  })

  it('dialog/car: a clause of the car class; the platform gives the alert template (review on the platform)', () => {
    expect(clause('dialog/car').classes).toEqual(['car'])
  })

  it('dialog/watch: a clause of the watch class (review on the platform)', () => {
    expect(clause('dialog/watch')).toMatchObject({ level: 'SHOULD', classes: ['watch'] })
  })

  it('dialog/xr: a clause of the XR class; the platform gives the alert (review on the platform)', () => {
    expect(clause('dialog/xr').classes).toEqual(['xr'])
  })

  it('dialog/foldable: on a foldable, the place of the dialog is the first segment of the window (measured in Chrome)', async () => {
    render(<Delete defaultOpen />)
    await screen.findByRole('alertdialog')
    const viewport = document.querySelector('[data-part="viewport"]') as HTMLElement
    expect(viewport.className).toContain('[@media(horizontal-viewport-segments:2)]:w-[env(viewport-segment-width_0_0)]')
    expect(viewport.className).toContain('[@media(vertical-viewport-segments:2)]:h-[env(viewport-segment-height_0_0)]')
  })
})
