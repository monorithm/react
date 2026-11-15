// The emitter of @monorithm/react. It reads only ir/ (the pinned intermediate form of the language) and writes:
//   src/tokens/tokens.css   the CSS custom properties: --mono-<token path>, for each context of the axes
//   src/tokens/theme.css    the Tailwind 4 theme: the utility names of the tokens, mapped to the custom properties
//   src/tokens/values.ts    the plain values as TypeScript, for code that needs a number (a spring, a duration)
//
//   node emit/emit.ts           write the files
//   node emit/emit.ts --check   fail if a committed file differs from the output (the drift check of CI)
//
// The axes: an explicit data-theme or data-density attribute wins. With no attribute, the media query of the system
// selects the context: prefers-color-scheme for the theme, pointer: coarse for the density. The first context of an
// axis in ir/axes.json is the fallback (dark, pointer).
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')

type Json = null | boolean | number | string | Json[] | { [k: string]: Json }
interface Entry {
  type: string
  value?: Json
  axes?: string[]
  values?: Record<string, Json>
  extensions?: Record<string, Json>
}

const ir = (file: string): Json => JSON.parse(fs.readFileSync(path.join(ROOT, 'ir', file), 'utf8'))
const cssName = (p: string): string => `--mono-${p.replace(/\./g, '-')}`

/** The position of a damped spring from 0 to 1 at the time t (s), for the stiffness k, the damping c, and the mass m. */
export function springAt(t: number, k: number, c: number, m: number): number {
  const w0 = Math.sqrt(k / m)
  const z = c / (2 * Math.sqrt(k * m))
  if (z < 1) {
    const wd = w0 * Math.sqrt(1 - z * z)
    return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + ((z * w0) / wd) * Math.sin(wd * t))
  }
  if (Math.abs(z - 1) < 1e-9) return 1 - Math.exp(-w0 * t) * (1 + w0 * t)
  const r1 = -w0 * (z - Math.sqrt(z * z - 1))
  const r2 = -w0 * (z + Math.sqrt(z * z - 1))
  return 1 + (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r1 - r2)
}

/** A spring as a CSS linear() curve: 33 samples over the settle time of the token. The last sample is exactly 1. */
export function springLinear(spring: { stiffness: number; damping: number; mass: number }, ms: number): string {
  const n = 32
  const pts: string[] = []
  for (let i = 0; i <= n; i++) {
    const v = i === n ? 1 : springAt(((ms / 1000) * i) / n, spring.stiffness, spring.damping, spring.mass)
    pts.push(Number(v.toFixed(4)).toString())
  }
  return `linear(${pts.join(', ')})`
}

/** The CSS form of a plain value. A spring gives two properties: the curve and its duration. */
function css(p: string, e: Entry, value: Json): [string, string][] {
  switch (e.type) {
    case 'color': {
      const c = value as { hex: string; srgb: number[]; alpha: number }
      if (c.alpha === 1) return [[cssName(p), c.hex]]
      const [r, g, b] = c.srgb.map((x) => Math.round(x * 255))
      return [[cssName(p), `rgb(${r} ${g} ${b} / ${c.alpha})`]]
    }
    case 'dimension':
    case 'duration': {
      const d = value as { value: number; unit: string }
      return [[cssName(p), `${d.value}${d.unit}`]]
    }
    case 'number':
    case 'fontWeight':
      return [[cssName(p), String(value)]]
    case 'cubicBezier':
      return [[cssName(p), `cubic-bezier(${(value as number[]).join(', ')})`]]
    case 'shadow': {
      const s = value as Record<string, { value: number; unit: string }> & { color: { srgb: number[]; alpha: number } }
      const [r, g, b] = s.color.srgb.map((x) => Math.round(x * 255))
      const dim = (k: string): string => `${s[k]?.value}${s[k]?.unit}`
      return [[cssName(p), `${dim('offsetX')} ${dim('offsetY')} ${dim('blur')} ${dim('spread')} rgb(${r} ${g} ${b} / ${s.color.alpha})`]]
    }
    case 'transition': {
      const t = value as { duration: { value: number; unit: string }; timingFunction: number[] }
      const spring = (e.extensions?.['dev.monorithm'] as { spring?: { stiffness: number; damping: number; mass: number } } | undefined)?.spring
      const curve = spring ? springLinear(spring, t.duration.value) : `cubic-bezier(${t.timingFunction.join(', ')})`
      return [
        [cssName(p), curve],
        [`${cssName(p)}-duration`, `${t.duration.value}${t.duration.unit}`],
      ]
    }
    default:
      throw new Error(`The emitter does not know the type ${e.type} (${p})`)
  }
}

const block = (selector: string, decls: [string, string][], indent = ''): string =>
  decls.length ? `${indent}${selector} {\n${decls.map(([k, v]) => `${indent}  ${k}: ${v};`).join('\n')}\n${indent}}\n` : ''

/** The media query that selects a context when no attribute sets the axis. */
const MEDIA: Record<string, Record<string, string>> = {
  theme: { light: '(prefers-color-scheme: light)' },
  density: { touch: '(pointer: coarse)' },
}

export function emit(): Map<string, string> {
  const canonical = ir('canonical.json') as unknown as Record<string, Entry>
  const axes = ir('axes.json') as unknown as Record<string, { contexts: string[]; default: string }>
  const manifest = ir('manifest.json') as unknown as { language: string }
  const head = (kind: string): string =>
    `/* Generated by emit/emit.ts from ir/ (language ${manifest.language}). Do not edit: change the language source. ${kind} */\n`

  // tokens.css
  const fixed: [string, string][] = []
  const byAxis: Record<string, Record<string, [string, string][]>> = {}
  for (const [p, e] of Object.entries(canonical)) {
    if (!e.axes) {
      fixed.push(...css(p, e, e.value ?? null))
      continue
    }
    if (e.axes.length !== 1) throw new Error(`${p} changes with ${e.axes.join(' and ')}: the emitter knows one axis for each token`)
    const axis = e.axes[0] as string
    for (const [key, v] of Object.entries(e.values ?? {})) {
      const ctx = key.split('=')[1] as string
      byAxis[axis] ??= {}
      ;(byAxis[axis][ctx] ??= []).push(...css(p, e, v))
    }
  }
  let tokens = head('The custom properties of the tokens.')
  tokens += block(':root', fixed)
  for (const [axis, { contexts: ctxs, default: def }] of Object.entries(axes)) {
    const decl = byAxis[axis] ?? {}
    tokens += `\n/* The axis ${axis}: ${ctxs.join(', ')}. The fallback is ${def}. */\n`
    tokens += block(`:root, [data-${axis}='${def}']`, decl[def] ?? [])
    for (const ctx of ctxs.filter((c) => c !== def)) {
      tokens += block(`[data-${axis}='${ctx}']`, decl[ctx] ?? [])
      const media = MEDIA[axis]?.[ctx]
      if (media) tokens += `@media ${media} {\n${block(`:root:not([data-${axis}])`, decl[ctx] ?? [], '  ')}}\n`
    }
  }

  // theme.css: the Tailwind 4 theme. A color role becomes --color-mono-<name>, a radius --radius-mono-<name>, a font size
  // --text-mono-<name>, and a font weight --font-weight-mono-<name>.
  const theme: [string, string][] = []
  for (const p of Object.keys(canonical)) {
    const e = canonical[p] as Entry
    const parts = p.split('.')
    if (e.type === 'color' && parts[0] === 'color') theme.push([`--color-mono-${parts.slice(parts[1] === 'role' ? 2 : 1).join('-')}`, `var(${cssName(p)})`])
    if (parts[0] === 'radius') theme.push([`--radius-mono-${parts.slice(1).join('-')}`, `var(${cssName(p)})`])
    if (e.type === 'shadow') theme.push([`--shadow-mono-${parts.slice(1).join('-')}`, `var(${cssName(p)})`])
    if (parts[0] === 'font-size') theme.push([`--text-mono-${parts.slice(1).join('-')}`, `var(${cssName(p)})`])
    if (e.type === 'fontWeight') theme.push([`--font-weight-mono-${parts.slice(1).join('-')}`, `var(${cssName(p)})`])
  }
  const themeCss = `${head('The Tailwind 4 theme. Import it after tailwindcss.')}@theme inline {\n${theme.map(([k, v]) => `  ${k}: ${v};`).join('\n')}\n}\n`

  // values.ts
  const values = `${head('The plain values.')}\nexport const language = ${JSON.stringify(manifest.language)} as const\n\nexport const tokens = ${JSON.stringify(canonical, null, 2)} as const\n`

  // components.css: the geometry of each contract. A multiple of a token becomes calc(var(--token) * n).
  let components = head('The geometry of the contracts.')
  const contractDir = path.join(ROOT, 'ir', 'contracts')
  // The selector is the component, not :root: a var() resolves where it is declared, thus the geometry must be declared
  // inside the density context of the component.
  for (const f of fs.readdirSync(contractDir).filter((n) => n.endsWith('.json')).sort()) {
    const geo: [string, string][] = []
    const c = JSON.parse(fs.readFileSync(path.join(contractDir, f), 'utf8')) as { id: string; geometry: Record<string, { value: number; of?: string; unit?: string }> }
    for (const [part, g] of Object.entries(c.geometry)) {
      const name = `--mono-${c.id}-${part.replace(/\./g, '-')}`
      geo.push([name, g.of ? (g.value === 1 ? `var(${cssName(g.of)})` : `calc(var(${cssName(g.of)}) * ${g.value})`) : `${g.value}${g.unit ?? 'px'}`])
    }
    components += block(`[data-mono='${c.id}']`, geo)
  }

  return new Map([
    ['src/tokens/components.css', components],
    ['src/tokens/tokens.css', tokens],
    ['src/tokens/theme.css', themeCss],
    ['src/tokens/values.ts', values],
  ])
}

function main(): void {
  const files = emit()
  if (process.argv.includes('--check')) {
    const diff = [...files].filter(([f, t]) => !fs.existsSync(path.join(ROOT, f)) || fs.readFileSync(path.join(ROOT, f), 'utf8') !== t).map(([f]) => f)
    if (diff.length) {
      console.error(`emit: ${diff.join(', ')} differ from the output of the emitter. Run: yarn emit`)
      process.exit(1)
    }
    console.log(`emit: the ${files.size} generated files match ir/.`)
    return
  }
  for (const [f, t] of files) {
    fs.mkdirSync(path.dirname(path.join(ROOT, f)), { recursive: true })
    fs.writeFileSync(path.join(ROOT, f), t)
  }
  console.log(`emit: wrote ${[...files.keys()].join(', ')}`)
}

if (import.meta.url === `file://${process.argv[1]}`) main()
