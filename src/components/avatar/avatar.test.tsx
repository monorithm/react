// The tests of the Avatar, the Avatar group, and the Avatar button. Each name starts with the id of a clause of
// ir/contracts/avatar.json. The browser test (test/browser/avatar.browser.test.tsx) measures the clauses that jsdom
// cannot compute.
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { violations } from '@monorithm/react/test/axe'
import { type Clause, contract as loadContract } from '@monorithm/react/test/contract'
import { MomentProvider } from '@monorithm/react/contexts/moment-context'
import { type MomentEvent } from '@monorithm/react/lib/moments'
import { Avatar } from './avatar'
import { AvatarButton } from './avatar.button'
import { AvatarGroup } from './avatar.group'
import { initials } from './avatar.initials'

const contract = loadContract('avatar')
const clause = (id: string) => contract.clauses.find((c) => c.id === id) as (Clause & { classes?: string[] }) | undefined

const PHOTO = 'https://example.com/ama-160.jpg'
const followers = [{ name: 'Kwame' }, { name: 'Efua' }, { name: 'Yaw' }, { name: 'Akosua' }, { name: 'Kofi' }]

/** The element of the initials in a container. */
const initialsOf = (el: Element) => el.querySelector('[data-part="initials"]') as HTMLElement | null

describe('Avatar', () => {
  it('the tests cover each clause of the contract', () => {
    const tested = new Set([
      'avatar/role', 'avatar/name', 'avatar/decorative', 'avatar/shape', 'avatar/size', 'avatar/density', 'avatar/photo',
      'avatar/fallback', 'avatar/initials', 'avatar/initials-style', 'avatar/ring', 'avatar/group', 'avatar/group-overlap',
      'avatar/count', 'avatar/group-name', 'avatar/seller-line', 'avatar/not-a-control', 'avatar/in-a-control',
      'avatar/button', 'avatar/button-initials', 'avatar/button-role', 'avatar/keyboard', 'avatar/target', 'avatar/hover',
      'avatar/press', 'avatar/focus', 'avatar/state-sign', 'avatar/disabled', 'avatar/direction', 'avatar/initials-direction',
      'avatar/motion', 'avatar/moment', 'avatar/no-direct-feedback', 'avatar/header', 'avatar/menu', 'avatar/surfaces',
      'avatar/car',
    ])
    expect(contract.clauses.map((c) => c.id).filter((id) => !tested.has(id))).toEqual([])
  })

  it('avatar/role: the accessibility tree shows an avatar as an image with the name as its name', () => {
    render(
      <div>
        <Avatar name="Ama Mensah" />
        <Avatar name="Kente Shop" variant="organization" />
      </div>,
    )
    expect(screen.getByRole('img', { name: 'Ama Mensah' }).dataset.variant).toBe('person')
    expect(screen.getByRole('img', { name: 'Kente Shop' }).dataset.variant).toBe('organization')
  })

  it('avatar/role: axe finds no violation in each variant and state', async () => {
    const { container } = render(
      <div>
        <Avatar name="Ama Mensah" />
        <Avatar name="Ama Mensah" src={PHOTO} />
        <Avatar name="Kente Shop" variant="organization" size="lg" />
        <p>
          <Avatar name="Ama Mensah" size="xs" decorative /> Ama Mensah
        </p>
        <Avatar name="Ama Mensah" handle="@amamensah" />
        <AvatarGroup items={followers} total={6} noun="followers" />
        <AvatarButton name="Ama Mensah" />
        <AvatarButton name="Ama Mensah" expanded label="Account menu" />
        <AvatarButton name="Ama Mensah" disabled disabledReason="Sign in first" label="Account, disabled" />
      </div>,
    )
    expect(await violations(container)).toEqual([])
  })

  it('avatar/name: the name is the alternative text; the initials are not the name', () => {
    render(<Avatar name="Ama Mensah" />)
    const img = screen.getByRole('img')
    expect(img.getAttribute('aria-label')).toBe('Ama Mensah')
    expect(initialsOf(img)?.textContent).toBe('AM')
    expect(screen.queryByRole('img', { name: 'AM' })).toBeNull()
  })

  it('avatar/decorative: an avatar next to a name that shows is hidden; assistive technology reads the name one time', () => {
    render(
      <table>
        <tbody>
          <tr>
            <td>
              <Avatar name="Ama Mensah" size="xs" decorative />
              Ama Mensah
            </td>
          </tr>
        </tbody>
      </table>,
    )
    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.getByRole('cell', { name: 'Ama Mensah' })).toBeTruthy()
    expect(document.querySelector('[data-mono="avatar"]')?.getAttribute('aria-hidden')).toBe('true')
  })

  it('avatar/decorative: the avatar of a seller line is hidden; the line gives the name one time', () => {
    render(<Avatar name="Ama Mensah" handle="@amamensah" />)
    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.getAllByText('Ama Mensah')).toHaveLength(1)
    expect(document.querySelector('[data-part="line"] > [data-mono="avatar"]')?.getAttribute('aria-hidden')).toBe('true')
  })

  it('avatar/shape: a person is round; an organization has the radius of 28% of its size (measured in Chrome)', () => {
    render(
      <div>
        <Avatar name="Ama Mensah" size="sm" />
        <Avatar name="Kente Shop" variant="organization" size="sm" />
      </div>,
    )
    expect(screen.getByRole('img', { name: 'Ama Mensah' }).className).toContain('rounded-mono-full')
    const org = screen.getByRole('img', { name: 'Kente Shop' }).className
    expect(org).toContain('rounded-(--mono-avatar-sm-organization-radius)')
    expect(org).not.toContain('rounded-mono-full')
  })

  it('avatar/size: each size takes the avatar size token; md is the default (measured in Chrome)', () => {
    render(
      <div>
        {(['xs', 'sm', 'md', 'lg'] as const).map((s) => (
          <Avatar key={s} name={`Size ${s}`} size={s} />
        ))}
        <Avatar name="Default" />
      </div>,
    )
    for (const s of ['xs', 'sm', 'md', 'lg']) {
      expect(screen.getByRole('img', { name: `Size ${s}` }).className).toContain(`size-(--mono-size-avatar-${s})`)
    }
    expect(screen.getByRole('img', { name: 'Default' }).dataset.size).toBe('md')
  })

  it('avatar/density: the avatar takes no token of the density; the avatar button takes the control size (measured in Chrome)', () => {
    render(
      <div>
        <Avatar name="Ama Mensah" />
        <AvatarButton name="Ama Mensah" />
      </div>,
    )
    const avatar = screen.getByRole('img').className
    expect(avatar).not.toMatch(/control|target|text-mono-/)
    expect(screen.getByRole('button').className).toContain('size-(--mono-size-control-md)')
  })

  it('avatar/photo: the photo fills the shape with a crop; when it loads, the initials go', () => {
    render(<Avatar name="Ama Mensah" src={PHOTO} />)
    const avatar = screen.getByRole('img', { name: 'Ama Mensah' })
    const photo = avatar.querySelector('img') as HTMLImageElement
    expect(photo.getAttribute('src')).toBe(PHOTO)
    expect(photo.getAttribute('alt')).toBe('')
    expect(photo.className).toContain('object-cover')
    expect(photo.className).toContain('size-full')
    expect(initialsOf(avatar)?.textContent).toBe('AM')
    fireEvent.load(photo)
    expect(initialsOf(avatar)).toBeNull()
    expect(photo.hasAttribute('aria-hidden')).toBe(false)
  })

  it('avatar/photo: the photo is the thumbnail, 160 px wide: the prop documents it, and the geometry gives the width', () => {
    // The app gives the URL of the thumbnail. The component cannot see the width of the file before it loads.
    expect(contract.geometry['photo.width']).toEqual({ value: 160, unit: 'px' })
  })

  it('avatar/fallback: with no photo, or with a photo that does not load, the initials show on the selected fill', () => {
    render(
      <div>
        <Avatar name="Ama Mensah" />
        <Avatar name="Efua Owusu" src="https://example.com/missing.jpg" />
      </div>,
    )
    const none = screen.getByRole('img', { name: 'Ama Mensah' })
    expect(none.querySelector('img')).toBeNull()
    expect(initialsOf(none)?.textContent).toBe('AM')
    expect(none.className).toContain('bg-mono-selected')
    const broken = screen.getByRole('img', { name: 'Efua Owusu' })
    const photo = broken.querySelector('img') as HTMLImageElement
    fireEvent.error(photo)
    expect(initialsOf(broken)?.textContent).toBe('EO')
    expect(photo.hasAttribute('data-error')).toBe(true)
    expect(photo.className).toContain('data-[error]:hidden')
  })

  it('avatar/initials: the first letter of the first word and of the last word, as capitals; one word gives one letter', () => {
    expect(initials('Ama Mensah')).toBe('AM')
    expect(initials('Kwame Nkrumah Mensah')).toBe('KM')
    expect(initials('ama')).toBe('A')
    expect(initials('  efua   owusu ')).toBe('EO')
    expect(initials('élodie (Yaw) ñuñez')).toBe('ÉÑ')
    expect(initials('Kente Shop - Accra')).toBe('KA')
    expect(initials('')).toBe('')
  })

  it('avatar/initials-style: the initials have the secondary color, the strong weight, no tracking, and the size of the avatar (measured in Chrome)', () => {
    render(
      <div>
        {(['xs', 'sm', 'md', 'lg'] as const).map((s) => (
          <Avatar key={s} name={`Size ${s}`} size={s} />
        ))}
      </div>,
    )
    for (const s of ['xs', 'sm', 'md', 'lg']) {
      const cls = initialsOf(screen.getByRole('img', { name: `Size ${s}` }))?.className
      expect(cls).toContain('text-mono-fg-2')
      expect(cls).toContain('font-mono-strong')
      expect(cls).toContain('tracking-(--mono-avatar-initials-tracking)')
      expect(cls).toContain(`text-(length:--mono-avatar-${s}-initials-size)`)
    }
  })

  it('avatar/ring: each avatar has the ring of the geometry in the avatar ring color (measured in Chrome)', () => {
    render(<Avatar name="Ama Mensah" />)
    const cls = screen.getByRole('img').className
    expect(cls).toContain('after:border-(length:--mono-avatar-ring)')
    expect(cls).toContain('after:border-mono-avatar-ring')
  })

  it('avatar/group: a group shows three avatars or less, then the count of the persons that it does not show', () => {
    render(<AvatarGroup items={followers} total={6} size="sm" />)
    const group = screen.getByRole('img')
    const items = [...group.querySelectorAll('[data-part="item"]')]
    expect(items.map((i) => initialsOf(i)?.textContent)).toEqual(['K', 'E', 'Y'])
    expect(group.querySelector('[data-part="count"]')?.textContent).toBe('+3')
    expect(group.lastElementChild?.getAttribute('data-part')).toBe('count')
    for (const i of [...items, group.querySelector('[data-part="count"]') as Element]) {
      expect(i.className).toContain('size-(--mono-size-avatar-sm)')
    }
  })

  it('avatar/group: with no person that it does not show, the group has no count item', () => {
    render(<AvatarGroup items={followers.slice(0, 2)} />)
    expect(screen.getByRole('img').querySelectorAll('[data-part="item"]')).toHaveLength(2)
    expect(screen.getByRole('img').querySelector('[data-part="count"]')).toBeNull()
  })

  it('avatar/group-overlap: each item after the first overlaps the item before it; the ring of the group replaces the avatar ring (measured in Chrome)', () => {
    render(<AvatarGroup items={followers} />)
    const parts = [...screen.getByRole('img').children]
    expect(parts[0]?.className).not.toContain('-ms-(--mono-avatar-group-overlap)')
    for (const p of parts.slice(1)) expect(p.className).toContain('-ms-(--mono-avatar-group-overlap)')
    for (const p of parts) {
      expect(p.className).toContain('shadow-[0_0_0_var(--mono-avatar-group-ring)_var(--mono-color-role-surface)]')
      expect(p.className).not.toContain('after:border')
    }
  })

  it('avatar/count: the count has the shape, the size, and the initials style of an avatar, on the pressed fill', () => {
    render(<AvatarGroup items={followers} variant="organization" size="lg" />)
    const group = screen.getByRole('img')
    const item = group.querySelector('[data-part="item"]') as HTMLElement
    const count = group.querySelector('[data-part="count"]') as HTMLElement
    expect(count.textContent).toBe('+2')
    for (const c of ['rounded-(--mono-avatar-lg-organization-radius)', 'size-(--mono-size-avatar-lg)']) {
      expect(item.className).toContain(c)
      expect(count.className).toContain(c)
    }
    expect(count.className).toContain(initialsOf(item)?.className as string)
    expect(count.className).toContain('bg-mono-pressed')
    expect(count.className).not.toContain('bg-mono-selected')
  })

  it('avatar/group-name: the group is one image; its name gives the names that show and the count', () => {
    render(<AvatarGroup items={followers} total={6} noun="followers" />)
    const group = screen.getByRole('img', { name: 'Kwame, Efua, Yaw, and 3 more followers' })
    expect(screen.getAllByRole('img')).toEqual([group])
    for (const child of group.children) expect(child.getAttribute('aria-hidden')).toBe('true')
  })

  it('avatar/group-name: a name with no count, and a name in another language from the label', () => {
    render(
      <div>
        <AvatarGroup items={followers.slice(0, 2)} />
        <AvatarGroup items={followers} label={(names, more) => `${names.join(', ')} et ${more} autres abonnés`} />
        <AvatarGroup items={followers} label="Les abonnés de la boutique" />
      </div>,
    )
    expect(screen.getByRole('img', { name: 'Kwame and Efua' })).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Kwame, Efua, Yaw et 2 autres abonnés' })).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Les abonnés de la boutique' })).toBeTruthy()
  })

  it('avatar/seller-line: the avatar, the name, and the handle, in this sequence, with the styles of the contract (measured in Chrome)', () => {
    render(<Avatar name="Ama Mensah" handle="@amamensah" />)
    const line = document.querySelector('[data-part="line"]') as HTMLElement
    expect([...line.children].map((c) => c.getAttribute('data-part') ?? c.getAttribute('data-mono'))).toEqual(['avatar', 'name', 'handle'])
    expect(line.className).toContain('gap-(--mono-avatar-seller-gap)')
    expect((line.firstElementChild as HTMLElement).dataset.size).toBe('xs')
    const name = line.querySelector('[data-part="name"]')?.className
    expect(name).toContain('text-mono-small')
    expect(name).toContain('font-mono-strong')
    const handle = line.querySelector('[data-part="handle"]')?.className
    expect(handle).toContain('text-mono-caption')
    expect(handle).toContain('text-mono-fg-muted')
  })

  it('avatar/not-a-control: an avatar does not get the focus, and it has no hover state and no pressed state', async () => {
    render(
      <div>
        <Avatar name="Ama Mensah" />
        <AvatarGroup items={followers} />
        <Avatar name="Ama Mensah" handle="@amamensah" />
        <button type="button">After</button>
      </div>,
    )
    await userEvent.setup().tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'After' }))
    for (const el of document.querySelectorAll('[data-mono="avatar"], [data-mono="avatar"] *')) {
      expect(el.hasAttribute('tabindex')).toBe(false)
      expect(el.getAttribute('class') ?? '').not.toMatch(/hover:|active:|cursor-pointer/)
    }
  })

  it('avatar/in-a-control: a press on an avatar in a larger control presses the full control', async () => {
    expect(clause('avatar/in-a-control')?.level).toBe('SHOULD')
    const onClick = vi.fn()
    render(
      <button type="button" onClick={onClick}>
        <Avatar name="Kente Shop" variant="organization" size="sm" decorative />
        Kente Shop
      </button>,
    )
    await userEvent.setup().click(document.querySelector('[data-mono="avatar"] [data-part="initials"]') as HTMLElement)
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Kente Shop' })).toBeTruthy()
  })

  it('avatar/button: a round button that opens a menu, with the background fill and the avatar ring (measured in Chrome)', () => {
    render(<AvatarButton name="Ama Mensah" />)
    const button = screen.getByRole('button')
    expect(button.tagName).toBe('BUTTON')
    expect(button.getAttribute('aria-haspopup')).toBe('menu')
    expect(button.dataset.variant).toBe('button')
    expect(button.className).toContain('rounded-mono-full')
    expect(button.className).toContain('[--btn-fill:var(--mono-color-role-bg)]')
    expect(button.className).toContain('[--btn-border:var(--mono-color-avatar-ring)]')
  })

  it('avatar/button-initials: the initials of the button have the caption size of the density (measured in Chrome)', () => {
    render(<AvatarButton name="Ama Mensah" />)
    const ini = initialsOf(screen.getByRole('button')) as HTMLElement
    expect(ini.textContent).toBe('AM')
    expect(ini.className).toContain('text-mono-caption')
    expect(ini.className).not.toContain('--mono-avatar-md-initials-size')
  })

  it('avatar/button-role: the avatar button is a button with the name Account; the initials are not the name', () => {
    render(
      <div>
        <AvatarButton name="Ama Mensah" src={PHOTO} />
        <AvatarButton name="Efua Owusu" label="Compte" />
      </div>,
    )
    expect(screen.getByRole('button', { name: 'Account' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Compte' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /AM|EO|Ama|Efua/ })).toBeNull()
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('avatar/keyboard: Tab moves the focus to the button; Enter and Space open the menu; expanded tells that it is open', async () => {
    const onClick = vi.fn()
    const { rerender } = render(<AvatarButton name="Ama Mensah" onClick={onClick} />)
    const button = screen.getByRole('button', { name: 'Account' })
    expect(button.getAttribute('aria-expanded')).toBe('false')
    const user = userEvent.setup()
    await user.tab()
    expect(document.activeElement).toBe(button)
    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    expect(onClick).toHaveBeenCalledTimes(2)
    rerender(<AvatarButton name="Ama Mensah" onClick={onClick} expanded />)
    expect(button.getAttribute('aria-expanded')).toBe('true')
    // Escape and the return of the focus are the behavior of the account menu: the Menu comes later in the build order.
  })

  it('avatar/target: the target extends past the button to the minimum target of the density (measured in Chrome)', () => {
    render(<AvatarButton name="Ama Mensah" />)
    const cls = screen.getByRole('button').className
    expect(cls).toContain('after:min-h-(--mono-size-target-min)')
    expect(cls).toContain('after:min-w-(--mono-size-target-min)')
  })

  it('avatar/hover: the hover ring is only for a device with hover (measured in Chrome)', () => {
    render(<AvatarButton name="Ama Mensah" />)
    const cls = screen.getByRole('button').className
    expect(cls).toContain('[--btn-border-hover:var(--mono-color-role-line-strong)]')
    expect(cls).toContain('not-data-[disabled]:hover:border-')
  })

  it('avatar/press: the press scale of an icon comes from the token (measured in Chrome)', () => {
    render(<AvatarButton name="Ama Mensah" />)
    expect(screen.getByRole('button').className).toContain('[--btn-press:var(--mono-scale-press-icon)]')
  })

  it('avatar/focus: the focus ring is for keyboard focus only (measured in Chrome)', () => {
    render(<AvatarButton name="Ama Mensah" />)
    expect(screen.getByRole('button').className).toContain('focus-visible:outline-solid')
  })

  it('avatar/state-sign: the focus has the ring, the press has the scale, and the disabled state has the opacity (measured in Chrome)', () => {
    render(<AvatarButton name="Ama Mensah" />)
    const cls = screen.getByRole('button').className
    expect(cls).toContain('focus-visible:outline-(length:--mono-focus-ring-width)')
    expect(cls).toContain('not-data-[disabled]:active:scale-[var(--btn-press,1)]')
    expect(cls).toContain('data-[disabled]:opacity-(--mono-opacity-disabled)')
  })

  it('avatar/disabled: a disabled button stays in the focus order, does not open the menu, and tells why', async () => {
    const onClick = vi.fn()
    render(<AvatarButton name="Ama Mensah" disabled disabledReason="Sign in to open the account menu" onClick={onClick} />)
    const button = screen.getByRole('button', { name: 'Account' })
    expect(button.getAttribute('aria-disabled')).toBe('true')
    expect(button.hasAttribute('disabled')).toBe(false)
    expect(screen.getByRole('button', { description: 'Sign in to open the account menu' })).toBe(button)
    const user = userEvent.setup()
    await user.tab()
    expect(document.activeElement).toBe(button)
    await user.click(button)
    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    expect(onClick).not.toHaveBeenCalled()
  })

  it('avatar/direction: the group and the seller line go from the start side in the DOM (measured in Chrome)', () => {
    render(
      <div>
        <AvatarGroup items={followers} />
        <Avatar name="Ama Mensah" handle="@amamensah" />
      </div>,
    )
    const group = screen.getByRole('img')
    expect([...group.children].map((c) => c.textContent)).toEqual(['K', 'E', 'Y', '+2'])
    expect(document.querySelector('[data-part="line"]')?.className).toContain('gap-')
  })

  it('avatar/initials-direction: the initials have the direction of the script of the name (measured in Chrome)', () => {
    render(
      <div dir="rtl">
        <Avatar name="Ama Mensah" />
        <Avatar name="דוד לוי" />
      </div>,
    )
    expect(initialsOf(screen.getByRole('img', { name: 'Ama Mensah' }))?.getAttribute('dir')).toBe('auto')
    expect(initialsOf(screen.getByRole('img', { name: 'דוד לוי' }))?.textContent).toBe('דל')
  })

  it('avatar/motion: reduced motion sets the press scale to 1; the ring color keeps its transition (measured in Chrome)', () => {
    render(<AvatarButton name="Ama Mensah" />)
    const cls = screen.getByRole('button').className
    expect(cls).toContain('motion-reduce:[--btn-press:1]')
    expect(cls).toContain('[[data-motion=reduced]_&]:[--btn-press:1]')
    expect(cls).not.toContain('motion-reduce:transition-none')
  })

  it('avatar/moment: the avatar button emits press once; a disabled button and an avatar emit no moment', async () => {
    const onMoment = vi.fn<(e: MomentEvent) => void>()
    render(
      <MomentProvider onMoment={onMoment}>
        <AvatarButton name="Ama Mensah" />
        <AvatarButton name="Efua Owusu" label="Other account" disabled />
        <Avatar name="Kwame" />
        <AvatarGroup items={followers} />
      </MomentProvider>,
    )
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Account' }))
    await user.click(screen.getByRole('button', { name: 'Other account' }))
    await user.click(screen.getByRole('img', { name: 'Kwame' }))
    await user.click(screen.getByRole('img', { name: /Kwame, Efua/ }))
    expect(onMoment.mock.calls).toEqual([[{ moment: 'press', variant: undefined, source: 'avatar' }]])
  })

  it('avatar/moment: the moment comes at the release, not at pointer down; Enter and Space emit it', async () => {
    const onMoment = vi.fn()
    render(
      <MomentProvider onMoment={onMoment}>
        <AvatarButton name="Ama Mensah" />
      </MomentProvider>,
    )
    const user = userEvent.setup()
    const button = screen.getByRole('button')
    await user.pointer({ keys: '[MouseLeft>]', target: button })
    expect(onMoment).not.toHaveBeenCalled()
    await user.pointer({ keys: '[/MouseLeft]', target: button })
    expect(onMoment).toHaveBeenCalledTimes(1)
    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    expect(onMoment).toHaveBeenCalledTimes(3)
  })

  it('avatar/no-direct-feedback: a press calls no vibration API', async () => {
    const vibrate = vi.fn()
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true })
    render(<AvatarButton name="Ama Mensah" />)
    await userEvent.setup().click(screen.getByRole('button'))
    expect(vibrate).not.toHaveBeenCalled()
  })

  it('avatar/header: the place of the avatar button in the header is a rule for the screen (review)', () => {
    expect(clause('avatar/header')?.level).toBe('SHOULD')
  })

  it('avatar/menu: the offset and the bottom sheet are rules for the account menu (review)', () => {
    // The Menu comes later in the build order. The avatar button gives onClick and expanded to open it.
    expect(clause('avatar/menu')?.level).toBe('SHOULD')
  })

  it('avatar/surfaces and avatar/car: the TV, the watch, the XR headset, and the car are device classes that this package does not target (review)', () => {
    // The package has the axes pointer and touch (data-density). It has no TV, watch, XR, or car class at this time.
    expect(clause('avatar/surfaces')?.classes).toEqual(['tv', 'watch', 'xr'])
    expect(clause('avatar/car')?.classes).toEqual(['car'])
  })
})
