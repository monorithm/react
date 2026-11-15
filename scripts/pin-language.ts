// Pins one version of the language: copies ir/<version>/ of @monorithm/design into ir/ and writes language.lock with
// the version and the SHA-256 checksum of the manifest of the IR. The build and the tests read only ir/.
//
//   node scripts/pin-language.ts [path of the design repository] [version]
//   node scripts/pin-language.ts --check     fail if ir/ does not match language.lock
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const sha = (file: string): string => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')

function verify(): void {
  const lock = JSON.parse(fs.readFileSync(path.join(ROOT, 'language.lock'), 'utf8')) as { language: string; manifest: string }
  const manifestFile = path.join(ROOT, 'ir', 'manifest.json')
  if (sha(manifestFile) !== lock.manifest) throw new Error('ir/manifest.json does not match language.lock')
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8')) as { language: string; files: Record<string, string> }
  if (manifest.language !== lock.language) throw new Error(`ir/ is language ${manifest.language}, the lock says ${lock.language}`)
  for (const [name, sum] of Object.entries(manifest.files)) {
    if (sha(path.join(ROOT, 'ir', name)) !== sum) throw new Error(`ir/${name} does not match its checksum in the manifest`)
  }
  console.log(`ir/ is language ${lock.language}, and each file matches its checksum.`)
}

function pin(designRepo: string, version?: string): void {
  const pkg = JSON.parse(fs.readFileSync(path.join(designRepo, 'package.json'), 'utf8')) as { name: string; version: string }
  if (pkg.name !== '@monorithm/design') throw new Error(`${designRepo} is not @monorithm/design`)
  const v = version ?? pkg.version
  const src = path.join(designRepo, 'ir', v)
  if (!fs.existsSync(src)) throw new Error(`${src} does not exist`)
  fs.rmSync(path.join(ROOT, 'ir'), { recursive: true, force: true })
  fs.cpSync(src, path.join(ROOT, 'ir'), { recursive: true })
  const lock = { language: v, manifest: sha(path.join(ROOT, 'ir', 'manifest.json')) }
  fs.writeFileSync(path.join(ROOT, 'language.lock'), `${JSON.stringify(lock, null, 2)}\n`)
  verify()
}

try {
  if (process.argv.includes('--check')) verify()
  else pin(path.resolve(process.argv[2] ?? path.join(ROOT, '..', 'design')), process.argv[3])
} catch (e) {
  console.error(`pin-language: ${(e as Error).message}`)
  process.exit(1)
}
