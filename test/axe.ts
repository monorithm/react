// Runs axe-core on a rendered container and returns the violations.
import axe from 'axe-core'

export async function violations(container: HTMLElement): Promise<string[]> {
  const result = await axe.run(container, { rules: { region: { enabled: false } } })
  return result.violations.map((v) => `${v.id}: ${v.help}`)
}
