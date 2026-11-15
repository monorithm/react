// The contract of a component: from the IR of the installed @monorithm/design, at the language version of the tokens.
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { language } from '../src/tokens/values'

export interface Clause {
  id: string
  level: 'MUST' | 'SHOULD' | 'NEVER'
  text: string
}

export interface Contract {
  id: string
  tokens: Record<string, string>
  geometry: Record<string, { value: number; of?: string; unit?: 'px' }>
  clauses: Clause[]
}

const require = createRequire(import.meta.url)

export function contract(id: string): Contract {
  return JSON.parse(fs.readFileSync(require.resolve(`@monorithm/design/ir/${language}/contracts/${id}.json`), 'utf8')) as Contract
}
