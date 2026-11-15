// The tests of the bar, the spinner, and the skeleton. Each name starts with the id of a clause of
// ir/contracts/progress.json. The browser test (test/browser/progress.browser.test.tsx) measures the clauses that
// jsdom cannot compute: the sizes, the colors, the direction, and the motion.
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { violations } from '@monorithm/react/test/axe'
import { type Clause, contract as loadContract } from '@monorithm/react/test/contract'
import { MomentProvider } from '@monorithm/react/contexts/moment-context'
import { tokens } from '@monorithm/react/tokens/values'
import { Button } from '../button/button'
import { ProgressBar } from './progress'
import { KEYFRAMES, SHIMMER_COUNT } from './progress.motion'
import { Skeleton, SkeletonShape } from './progress.skeleton'
import { Spinner } from './progress.spinner'

const contract = loadContract('progress')
const clause = (id: string) => contract.clauses.find((c) => c.id === id) as (Clause & { classes?: string[] }) | undefined
const level = (id: string) => clause(id)?.level

const Card = () => (
  <div className="flex flex-col gap-2">
    <SkeletonShape kind="media" radius="lg" className="aspect-square w-full" />
    <SkeletonShape className="w-3/4" />
    <SkeletonShape className="w-1/2" />
  </div>
)

const fill = (container: HTMLElement) => container.querySelector('[data-part="fill"]') as HTMLElement
const announcer = (container: HTMLElement | Document = document) => container.querySelector('[data-part="announcer"]') as HTMLElement
const spinnerIcon = (container: HTMLElement) => container.querySelector('[data-part="spinner"]') as SVGElement

afterEach(() => {
  vi.useRealTimers()
})

describe('Progress and skeleton', () => {
  it('the tests cover each clause of the contract', () => {
    const tested = new Set([
      'progress/role', 'progress/name', 'progress/value-text', 'progress/indeterminate', 'progress/spinner-name',
      'progress/skeleton-busy', 'progress/announce-once', 'progress/keyboard', 'progress/focus', 'progress/target',
      'progress/size', 'progress/bar', 'progress/label', 'progress/value-sign', 'progress/density', 'progress/done',
      'progress/direction', 'progress/media-timeline', 'progress/spinner-direction', 'progress/shimmer-direction',
      'progress/bar-motion', 'progress/indeterminate-motion', 'progress/spinner-use', 'progress/spinner-delay',
      'progress/spinner', 'progress/skeleton-use', 'progress/skeleton-shape', 'progress/shimmer', 'progress/shimmer-stop',
      'progress/animate', 'progress/motion', 'progress/moment', 'progress/no-direct-feedback', 'progress/no-disabled',
      'progress/failure', 'progress/always-on', 'progress/tv', 'progress/car', 'progress/xr', 'progress/use', 'progress/steps',
    ])
    expect(contract.clauses.map((c) => c.id).filter((id) => !tested.has(id))).toEqual([])
  })

  it('progress/role: the accessibility tree shows a progress bar with its name, its value, the minimum, and the maximum', () => {
    render(<ProgressBar label="Uploading 3 photos" value={64} />)
    const bar = screen.getByRole('progressbar', { name: 'Uploading 3 photos' })
    expect(bar.getAttribute('aria-valuenow')).toBe('64')
    // The default range is 0 to 100.
    expect(bar.getAttribute('aria-valuemin')).toBe('0')
    expect(bar.getAttribute('aria-valuemax')).toBe('100')
    expect(bar.getAttribute('aria-valuetext')).toBe('64%')
  })

  it('progress/role: axe finds no violation in each variant and state', async () => {
    const all = (loading: boolean) => (
      <div>
        <ProgressBar label="Uploading 3 photos" value={64} />
        <ProgressBar label="Uploading the file" value={96} max={240} valueText="96 of 240 KB" />
        <ProgressBar label="Preparing the export" />
        <ProgressBar label="Uploaded" value={100} resultLabel="Upload complete" />
        <Spinner label="Saving" />
        <Skeleton label="Loading products" loading={loading} shapes={<Card />} resultLabel="24 products">
          <p>Products</p>
        </Skeleton>
      </div>
    )
    // The first state: the spinner before its delay, and the skeleton with its shimmer.
    const first = render(all(true))
    expect(await violations(first.container)).toEqual([])
    first.unmount()
    // After the spinner delay and the shimmer limit: the spinner shows, and the status text shows. Then the content.
    vi.useFakeTimers()
    const { container, rerender } = render(all(true))
    act(() => vi.advanceTimersByTime(tokens['duration.shimmer-limit'].value.value))
    vi.useRealTimers()
    expect(container.querySelector('[data-part="status"]')).toBeTruthy()
    expect(await violations(container)).toEqual([])
    rerender(all(false))
    expect(await violations(container)).toEqual([])
  })

  it('progress/name: the name of a bar is its label; the name of a region that loads tells the content', () => {
    render(
      <>
        <ProgressBar label="Uploading 3 photos" value={10} />
        <Skeleton label="Loading products" loading shapes={<Card />} />
      </>,
    )
    expect(screen.getByRole('progressbar').getAttribute('aria-labelledby')).toBeTruthy()
    expect(screen.getByRole('progressbar', { name: 'Uploading 3 photos' })).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Loading products' }).getAttribute('data-variant')).toBe('skeleton')
  })

  it('progress/value-text: when the value is not a percentage, the value text tells it', () => {
    render(<ProgressBar label="Uploading the file" value={96} max={240} valueText="96 of 240 KB" />)
    const bar = screen.getByRole('progressbar', { name: 'Uploading the file' })
    expect(bar.getAttribute('aria-valuetext')).toBe('96 of 240 KB')
    expect(bar.getAttribute('aria-valuenow')).toBe('96')
    expect(bar.getAttribute('aria-valuemax')).toBe('240')
    // The screen shows the percentage of the range.
    expect(bar.querySelector('[data-part="value"]')?.textContent).toBe('40%')
  })

  it('progress/indeterminate: with no value, the bar has no current value and shows no percentage', () => {
    const { container } = render(<ProgressBar label="Preparing the export" />)
    const bar = screen.getByRole('progressbar', { name: 'Preparing the export' })
    expect(bar.hasAttribute('data-indeterminate')).toBe(true)
    expect(bar.hasAttribute('aria-valuenow')).toBe(false)
    // No value text: Base UI writes "indeterminate progress" in English, and the component removes it.
    expect(bar.hasAttribute('aria-valuetext')).toBe(false)
    expect(container.querySelector('[data-part="value"]')).toBeNull()
    expect(bar.textContent).not.toMatch(/%/)
    expect(fill(container).className).toContain('animate-[mono-progress-sweep')
  })

  it('progress/spinner-name: assistive technology does not read the spinner; the announcer tells the activity', () => {
    vi.useFakeTimers()
    const { container } = render(<Spinner label="Saving" />)
    act(() => vi.advanceTimersByTime(tokens['duration.spinner-delay'].value.value))
    expect(spinnerIcon(container).getAttribute('aria-hidden')).toBe('true')
    expect(screen.getByRole('status').textContent).toBe('Saving')
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('progress/skeleton-busy: the region is busy, the shapes are hidden, and the region is not busy when the content shows', () => {
    const { container, rerender } = render(
      <Skeleton label="Loading products" loading shapes={<Card />}>
        <p>Products</p>
      </Skeleton>,
    )
    const region = screen.getByRole('group', { name: 'Loading products' })
    expect(region.getAttribute('aria-busy')).toBe('true')
    const shapes = region.querySelector('[data-part="shapes"]') as HTMLElement
    expect(shapes.getAttribute('aria-hidden')).toBe('true')
    for (const shape of container.querySelectorAll('[data-part="shape"]')) expect(shape.getAttribute('aria-hidden')).toBe('true')
    expect(screen.queryByText('Products')).toBeNull()
    rerender(
      <Skeleton label="Loading products" loading={false} shapes={<Card />}>
        <p>Products</p>
      </Skeleton>,
    )
    // The same element: the region is not busy, and it has no name of a load.
    expect(region.isConnected).toBe(true)
    expect(region.getAttribute('aria-busy')).toBe('false')
    expect(region.hasAttribute('aria-label')).toBe(false)
    expect(screen.queryByRole('group')).toBeNull()
    expect(screen.getByText('Products')).toBeTruthy()
    expect(container.querySelector('[data-part="shape"]')).toBeNull()
  })

  it('progress/announce-once: the live region is empty in the first render, and tells the loading text after it', () => {
    // The markup of the first render (the server, or the frame before the effects): an empty polite live region.
    const markup = renderToStaticMarkup(<ProgressBar label="Uploading 3 photos" value={10} />)
    expect(markup).toContain('<span role="status" data-part="announcer" class="sr-only"></span>')
    const { container } = render(<ProgressBar label="Uploading 3 photos" value={10} />)
    expect(announcer(container).textContent).toBe('Uploading 3 photos')
    // The bar itself is not a live region: the screen reader does not hear each change of the value.
    expect(screen.getByRole('progressbar').hasAttribute('aria-live')).toBe(false)
  })

  it('progress/announce-once: a change of the value does not change the text of the announcer; the result comes one time', () => {
    const { container, rerender } = render(<ProgressBar label="Uploading 3 photos" value={10} resultLabel="Uploaded" />)
    const region = announcer(container)
    const observer = new MutationObserver(() => {})
    observer.observe(region, { childList: true, characterData: true, subtree: true })
    for (const v of [20, 40, 64, 80, 99]) {
      rerender(<ProgressBar label="Uploading 3 photos" value={v} resultLabel="Uploaded" />)
      expect(observer.takeRecords()).toEqual([])
    }
    expect(region.textContent).toBe('Uploading 3 photos')
    // At the end, the announcer tells the result one time.
    rerender(<ProgressBar label="Uploading 3 photos" value={100} resultLabel="Uploaded" />)
    expect(observer.takeRecords().length).toBeGreaterThan(0)
    expect(region.textContent).toBe('Uploaded')
    rerender(<ProgressBar label="Uploading 3 photos" value={100} resultLabel="Uploaded" />)
    expect(observer.takeRecords()).toEqual([])
    observer.disconnect()
  })

  it('progress/announce-once: the skeleton tells the loading text at the start and the result at the end, one time each', () => {
    const { rerender } = render(<Skeleton label="Loading products" loading={false} shapes={<Card />} resultLabel="24 products" />)
    // No load: the announcer tells nothing.
    expect(announcer().textContent).toBe('')
    rerender(<Skeleton label="Loading products" loading shapes={<Card />} resultLabel="24 products" />)
    expect(announcer().textContent).toBe('Loading products')
    // The announcer is out of the busy region: assistive technology does not wait for the end of the load.
    expect(announcer().closest('[aria-busy]')).toBeNull()
    rerender(<Skeleton label="Loading products" loading={false} shapes={<Card />} resultLabel="24 products" />)
    expect(announcer().textContent).toBe('24 products')
  })

  it('progress/keyboard: the bar, the spinner, and the skeleton have no keyboard action; Tab does not stop on them', async () => {
    render(
      <>
        <ProgressBar label="Uploading 3 photos" value={64} />
        <ProgressBar label="Preparing the export" />
        <Spinner label="Saving" />
        <Skeleton label="Loading products" loading shapes={<Card />} />
        <button type="button">Next</button>
      </>,
    )
    const user = userEvent.setup()
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Next' }))
    await user.keyboard('{Enter}{ArrowRight}{Home}')
    expect(screen.getByRole('progressbar', { name: 'Uploading 3 photos' }).getAttribute('aria-valuenow')).toBe('64')
  })

  it('progress/focus: no part can get the focus; a loading button keeps its focus (the ring is measured in Chrome)', () => {
    const { container, rerender } = render(
      <>
        <ProgressBar label="Uploading 3 photos" value={64} />
        <Spinner label="Saving" />
        <Skeleton label="Loading products" loading shapes={<Card />} />
        <Button loading={false} loadingLabel="Saving">
          Save
        </Button>
      </>,
    )
    const focusable = '[tabindex], a[href], button, input, select, textarea'
    for (const part of container.querySelectorAll('[data-mono="progress"]')) {
      expect(part.matches(focusable) || part.querySelector(focusable) !== null).toBe(false)
    }
    const button = screen.getByRole('button', { name: 'Save' })
    button.focus()
    rerender(
      <>
        <ProgressBar label="Uploading 3 photos" value={64} />
        <Spinner label="Saving" />
        <Skeleton label="Loading products" loading shapes={<Card />} />
        <Button loading loadingLabel="Saving">
          Save
        </Button>
      </>,
    )
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Saving' }))
  })

  it('progress/target: no part is a target; a press on the bar, the spinner, or a shape does nothing', async () => {
    const onClick = vi.fn()
    const { container } = render(
      // The click listener of the container sees each press: no part stops it, and no part acts.
      <div onClick={onClick}>
        <ProgressBar label="Uploading 3 photos" value={64} />
        <Spinner label="Saving" />
        <Skeleton label="Loading products" loading shapes={<Card />} />
      </div>,
    )
    const before = container.innerHTML
    const user = userEvent.setup()
    for (const part of ['track', 'fill', 'spinner', 'shape']) await user.click(container.querySelector(`[data-part="${part}"]`) as Element)
    expect(container.innerHTML).toBe(before)
    expect(onClick).toHaveBeenCalledTimes(4)
    expect(container.querySelectorAll('button, [role="button"], [role="slider"]').length).toBe(0)
  })

  it('progress/size: before the delay, the spinner keeps its box; a text shape is one line of the text high', () => {
    vi.useFakeTimers()
    const { container } = render(
      <>
        <Spinner label="Saving" />
        <SkeletonShape className="w-1/2" />
      </>,
    )
    // The icon is in the layout from the first render, invisible: the delay does not change the layout.
    expect(spinnerIcon(container).getAttribute('class')).toContain('invisible')
    expect(spinnerIcon(container).getAttribute('class')).toContain('size-(--mono-size-icon)')
    expect((container.querySelector('[data-part="shape"]') as HTMLElement).className).toContain('h-lh')
  })

  it('progress/bar: the track has the geometry height, the full radius, and the selected color (measured in Chrome)', () => {
    const { container } = render(<ProgressBar label="Uploading 3 photos" value={64} />)
    const track = container.querySelector('[data-part="track"]') as HTMLElement
    expect(track.className).toContain('h-(--mono-progress-track-height)')
    expect(track.className).toContain('rounded-mono-full')
    expect(track.className).toContain('bg-mono-selected')
    expect(fill(container).className).toContain('bg-mono-accent')
    expect(fill(container).className).toContain('rounded-mono-full')
  })

  it('progress/label: the label comes first and the percentage last, with tabular figures (measured in Chrome)', () => {
    render(<ProgressBar label="Uploading 3 photos" value={64} />)
    const bar = screen.getByRole('progressbar')
    const parts = [...bar.querySelectorAll('[data-part]')].map((e) => e.getAttribute('data-part'))
    expect(parts).toEqual(['label', 'value', 'track', 'fill'])
    expect((bar.querySelector('[data-part="value"]') as HTMLElement).className).toContain('tabular-nums')
    expect(bar.className).toContain('gap-(--mono-progress-value-gap)')
  })

  it('progress/value-sign: the length of the fill and the percentage text show the value', () => {
    const { container } = render(<ProgressBar label="Uploading 3 photos" value={64} />)
    expect(fill(container).style.getPropertyValue('--progress-fraction')).toBe('0.64')
    expect(fill(container).className).toContain('scale-x-(--progress-fraction)')
    expect(container.querySelector('[data-part="value"]')?.textContent).toBe('64%')
  })

  it('progress/density: the label and the percentage have the small text size of the density (measured in Chrome)', () => {
    render(<ProgressBar label="Uploading 3 photos" value={64} />)
    expect(screen.getByRole('progressbar').className).toContain('text-mono-small')
  })

  it('progress/done: the bar shows 100 % only at the maximum; a value near the end rounds down', () => {
    const { container, rerender } = render(<ProgressBar label="Uploading 3 photos" value={99.6} />)
    expect(container.querySelector('[data-part="value"]')?.textContent).toBe('99%')
    expect(screen.getByRole('progressbar').getAttribute('aria-valuetext')).toBe('99%')
    rerender(<ProgressBar label="Uploading 3 photos" value={239.9} max={240} />)
    expect(container.querySelector('[data-part="value"]')?.textContent).toBe('99%')
    rerender(<ProgressBar label="Uploading 3 photos" value={100} />)
    expect(container.querySelector('[data-part="value"]')?.textContent).toBe('100%')
    expect(screen.getByRole('progressbar').hasAttribute('data-complete')).toBe(true)
  })

  it('progress/direction: the percentage has the digits of the locale; the fill grows from the start side', () => {
    const { container } = render(
      <div dir="rtl">
        <ProgressBar label="رفع 3 صور" value={64} locale="ar-EG" />
      </div>,
    )
    // The Arabic percent sign comes with a letter mark (U+061C) for the direction of the text.
    expect(container.querySelector('[data-part="value"]')?.textContent).toMatch(/^٦٤٪/)
    expect(screen.getByRole('progressbar').getAttribute('aria-valuetext')).toMatch(/^٦٤٪/)
    // The origin of the scale is the start side: the right side in right-to-left (measured in Chrome).
    expect(fill(container).className).toContain('rtl:origin-right')
  })

  it('progress/media-timeline: the bar is not a media timeline; it has no seek and no slider role (review)', () => {
    // A media timeline is a different control: it fills from the left in each language. The bar grows from the start side.
    render(<ProgressBar label="Uploading 3 photos" value={64} />)
    expect(screen.queryByRole('slider')).toBeNull()
    expect(level('progress/media-timeline')).toBe('MUST')
  })

  it('progress/spinner-direction: the spinner turns clockwise and has no mirror for right-to-left (measured in Chrome)', () => {
    const { container } = render(
      <div dir="rtl">
        <Spinner label="Saving" />
      </div>,
    )
    expect(KEYFRAMES).toContain('@keyframes mono-progress-spin{to{transform:rotate(1turn)}}')
    expect(spinnerIcon(container).getAttribute('class')).not.toMatch(/rtl:|scale-x/)
  })

  it('progress/shimmer-direction: in right-to-left, the loop of the shimmer goes in reverse (measured in Chrome)', () => {
    const { container } = render(<SkeletonShape />)
    expect((container.querySelector('[data-part="shape"]') as HTMLElement).className).toContain('rtl:[--progress-sweep:reverse]')
    expect(level('progress/shimmer-direction')).toBe('SHOULD')
  })

  it('progress/bar-motion: a larger value moves the fill with spring-control; a smaller value jumps', () => {
    const { container, rerender } = render(<ProgressBar label="Uploading 3 photos" value={20} />)
    expect(fill(container).className).toContain('ease-(--mono-spring-control)')
    expect(fill(container).className).toContain('duration-(--mono-spring-control-duration)')
    expect(fill(container).className).toContain('transition-[scale]')
    expect(fill(container).hasAttribute('data-jump')).toBe(false)
    rerender(<ProgressBar label="Uploading 3 photos" value={60} />)
    expect(fill(container).hasAttribute('data-jump')).toBe(false)
    rerender(<ProgressBar label="Uploading 3 photos" value={30} />)
    expect(fill(container).hasAttribute('data-jump')).toBe(true)
    expect(fill(container).className).toContain('data-[jump]:transition-none')
    // The same value again does not change the last direction; the next larger value moves again.
    rerender(<ProgressBar label="Uploading 3 photos" value={30} />)
    expect(fill(container).hasAttribute('data-jump')).toBe(true)
    rerender(<ProgressBar label="Uploading 3 photos" value={45} />)
    expect(fill(container).hasAttribute('data-jump')).toBe(false)
    // The fill changes its horizontal scale, not its width.
    expect(fill(container).style.width).toBe('')
  })

  it('progress/indeterminate-motion: the fill loops in dur-shimmer with the linear curve (measured in Chrome)', () => {
    const { container } = render(<ProgressBar label="Preparing the export" />)
    expect(contract.tokens['indeterminate.duration']).toBe('duration.shimmer')
    expect(contract.tokens['indeterminate.easing']).toBe('easing.linear')
    expect(fill(container).className).toContain('animate-[mono-progress-sweep_var(--mono-duration-shimmer)_var(--mono-easing-linear)_infinite')
  })

  it('progress/spinner-use: a spinner only inside a button or for a short wait is a rule for the screen (review)', () => {
    // The component cannot know the length of the wait. The prop documentation tells the rule.
    expect(level('progress/spinner-use')).toBe('MUST')
  })

  it('progress/spinner-delay: the spinner shows only after 400 ms; a task that ends before shows no spinner', () => {
    vi.useFakeTimers()
    expect(tokens[contract.tokens['spinner.delay'] as 'duration.spinner-delay'].value.value).toBe(400)
    const { container, unmount } = render(<Spinner label="Saving" />)
    act(() => vi.advanceTimersByTime(399))
    expect(spinnerIcon(container).getAttribute('class')).toContain('invisible')
    expect(announcer(container).textContent).toBe('')
    act(() => vi.advanceTimersByTime(1))
    expect(spinnerIcon(container).getAttribute('class')).not.toContain('invisible')
    expect(container.querySelector('[data-variant="spinner"]')?.hasAttribute('data-shown')).toBe(true)
    expect(announcer(container).textContent).toBe('Saving')
    unmount()
    // A task that ends in less than 400 ms: the spinner goes before the delay, and it never shows.
    const short = render(<Spinner label="Saving" />)
    act(() => vi.advanceTimersByTime(200))
    short.unmount()
    expect(() => act(() => vi.advanceTimersByTime(400))).not.toThrow()
  })

  it('progress/spinner: the icon size of the density, the color of the text, one turn in dur-spin (measured in Chrome)', () => {
    const { container } = render(<Spinner label="Saving" />)
    const icon = spinnerIcon(container)
    expect(icon.getAttribute('class')).toContain('size-(--mono-size-icon)')
    expect(icon.getAttribute('class')).toContain('animate-[mono-progress-spin_var(--mono-duration-spin)_var(--mono-easing-linear)_infinite]')
    for (const stroke of icon.querySelectorAll('[stroke]')) expect(stroke.getAttribute('stroke')).toBe('currentColor')
  })

  it('progress/skeleton-use: a skeleton only for content that loads, in its real layout, is a rule for the screen (review)', () => {
    // The app gives the shapes in the layout of the real content. The component shows them while the content loads.
    expect(level('progress/skeleton-use')).toBe('MUST')
  })

  it('progress/skeleton-shape: a text shape has the small radius; a media shape has the radius of the real item', () => {
    const { container } = render(
      <>
        <SkeletonShape className="w-1/2" />
        <SkeletonShape kind="media" radius="full" className="size-(--mono-size-avatar-md)" />
      </>,
    )
    const [text, avatar] = [...container.querySelectorAll('[data-part="shape"]')] as HTMLElement[]
    expect(text?.className).toContain('rounded-mono-sm')
    expect(text?.className).toContain('bg-mono-selected')
    expect(avatar?.className).toContain('rounded-mono-full')
    expect(avatar?.className).not.toContain('rounded-mono-sm')
    // @ts-expect-error progress/skeleton-shape: a media shape needs the radius of the real image or avatar.
    const missing = <SkeletonShape kind="media" />
    expect(missing).toBeTruthy()
  })

  it('progress/shimmer: a band of the shimmer color loops in dur-shimmer with the linear curve (measured in Chrome)', () => {
    const { container } = render(<SkeletonShape />)
    const shape = container.querySelector('[data-part="shape"]') as HTMLElement
    expect(shape.className).toContain('after:via-mono-skeleton-shimmer')
    expect(shape.className).toContain('after:animate-[mono-progress-sweep_var(--mono-duration-shimmer)_var(--mono-easing-linear)')
  })

  it('progress/shimmer-stop: after 5 s, the shimmer stops and a status text shows', () => {
    vi.useFakeTimers()
    expect(tokens['duration.shimmer-limit'].value.value).toBe(5000)
    const { container } = render(<Skeleton label="Loading products" loading shapes={<Card />} statusLabel="This takes longer than usual" />)
    const region = screen.getByRole('group', { name: 'Loading products' })
    // The CSS stops the loop at the limit: the number of loops is the limit divided by one loop.
    expect((container.querySelector('[data-part="shape"]') as HTMLElement).style.getPropertyValue('--progress-shimmer-count')).toBe(String(5000 / 1500))
    expect(SHIMMER_COUNT).toBe(5000 / 1500)
    act(() => vi.advanceTimersByTime(4999))
    expect(region.hasAttribute('data-expired')).toBe(false)
    expect(container.querySelector('[data-part="status"]')).toBeNull()
    act(() => vi.advanceTimersByTime(1))
    expect(region.hasAttribute('data-expired')).toBe(true)
    expect(container.querySelector('[data-part="status"]')?.textContent).toBe('This takes longer than usual')
    expect((container.querySelector('[data-part="shape"]') as HTMLElement).className).toContain('in-data-[expired]:after:hidden')
    // The announcer tells the status text one time.
    expect(announcer().textContent).toBe('This takes longer than usual')
  })

  it('progress/shimmer-stop: the default status text is the label; a new load starts the limit again', () => {
    vi.useFakeTimers()
    const { container, rerender } = render(<Skeleton label="Loading products" loading shapes={<Card />} />)
    act(() => vi.advanceTimersByTime(5000))
    expect(container.querySelector('[data-part="status"]')?.textContent).toBe('Loading products')
    rerender(<Skeleton label="Loading products" loading={false} shapes={<Card />} />)
    rerender(<Skeleton label="Loading products" loading shapes={<Card />} />)
    expect(container.querySelector('[data-part="status"]')).toBeNull()
    act(() => vi.advanceTimersByTime(5000))
    expect(container.querySelector('[data-part="status"]')).toBeTruthy()
  })

  it('progress/animate: the keyframes change only the transform and the opacity; the fill transition is the scale', () => {
    const properties = [...KEYFRAMES.matchAll(/[{;]([a-z-]+):/g)].map((m) => m[1])
    expect(new Set(properties)).toEqual(new Set(['transform', 'opacity']))
    const { container } = render(<ProgressBar label="Uploading 3 photos" value={64} />)
    expect(fill(container).className).toMatch(/(^| )transition-\[scale\]( |$)/)
  })

  it('progress/motion: reduced motion stops the turn, the shimmer, the sweep, and the spring (measured in Chrome)', () => {
    const { container } = render(
      <>
        <ProgressBar label="Uploading 3 photos" value={64} />
        <ProgressBar label="Preparing the export" />
        <Spinner label="Saving" />
        <SkeletonShape />
      </>,
    )
    const [bar, sweep] = [...container.querySelectorAll('[data-part="fill"]')] as HTMLElement[]
    expect(bar?.className).toContain('motion-reduce:transition-none')
    expect(bar?.className).toContain('[[data-motion=reduced]_&]:transition-none')
    expect(sweep?.className).toContain('motion-reduce:translate-none')
    expect(sweep?.className).toContain('motion-reduce:animate-[mono-progress-pulse_var(--mono-duration-pulse)')
    expect(spinnerIcon(container).getAttribute('class')).toContain('motion-reduce:animate-[mono-progress-pulse_var(--mono-duration-pulse)')
    expect(spinnerIcon(container).getAttribute('class')).toContain('[[data-motion=reduced]_&]:animate-[mono-progress-pulse')
    expect((container.querySelector('[data-part="shape"]') as HTMLElement).className).toContain('motion-reduce:after:hidden')
    expect(KEYFRAMES).toContain('@keyframes mono-progress-pulse{50%{opacity:var(--mono-opacity-pulse)}}')
  })

  it('progress/moment: the bar, the spinner, and the skeleton emit no moment', () => {
    vi.useFakeTimers()
    const onMoment = vi.fn()
    const tree = (value: number, loading: boolean) => (
      <MomentProvider onMoment={onMoment}>
        <ProgressBar label="Uploading 3 photos" value={value} />
        <Spinner label="Saving" />
        <Skeleton label="Loading products" loading={loading} shapes={<Card />}>
          <p>Products</p>
        </Skeleton>
      </MomentProvider>
    )
    const { rerender } = render(tree(10, true))
    act(() => vi.advanceTimersByTime(6000))
    rerender(tree(100, false))
    expect(onMoment).not.toHaveBeenCalled()
  })

  it('progress/no-direct-feedback: no part calls the vibration API', () => {
    vi.useFakeTimers()
    const vibrate = vi.fn()
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true })
    const { rerender } = render(<ProgressBar label="Uploading 3 photos" value={10} />)
    rerender(<ProgressBar label="Uploading 3 photos" value={100} />)
    render(<Spinner label="Saving" />)
    render(<Skeleton label="Loading products" loading shapes={<Card />} />)
    act(() => vi.advanceTimersByTime(6000))
    expect(vibrate).not.toHaveBeenCalled()
  })

  it('progress/no-disabled: no part has a disabled state or the disabled opacity', () => {
    // @ts-expect-error progress/no-disabled: the bar has no disabled prop.
    const bar = <ProgressBar label="Uploading 3 photos" value={10} disabled />
    // @ts-expect-error progress/no-disabled: the spinner has no disabled prop.
    const spinner = <Spinner label="Saving" disabled />
    const { container } = render(
      <>
        {bar}
        {spinner}
        <Skeleton label="Loading products" loading shapes={<Card />} />
      </>,
    )
    expect(container.innerHTML).not.toMatch(/disabled/)
    expect(container.innerHTML).not.toContain('--mono-opacity-disabled')
  })

  it('progress/failure: the text of the result and its action are a rule for the screen (review)', () => {
    // The app removes the indicator and shows an alert or a toast with the result and one action.
    expect(level('progress/failure')).toBe('SHOULD')
  })

  it('progress/always-on, progress/tv, progress/car, progress/xr: rules for the platform of the class, not for the web (review)', () => {
    expect(clause('progress/always-on')?.classes).toEqual(['watch'])
    expect(clause('progress/tv')?.classes).toEqual(['tv'])
    expect(clause('progress/car')?.classes).toEqual(['car'])
    expect(clause('progress/xr')?.classes).toEqual(['xr'])
    // progress/tv and progress/xr: the motion changes only the opacity and the 2D transform. No part moves toward the user.
    expect(KEYFRAMES).not.toMatch(/translateZ|translate3d|scale|perspective/)
  })

  it('progress/use and progress/steps: the choice of a bar, a spinner, or a timeline is a rule for the screen (review)', () => {
    expect(level('progress/use')).toBe('SHOULD')
    expect(level('progress/steps')).toBe('SHOULD')
  })
})
