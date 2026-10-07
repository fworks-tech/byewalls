import { createRequire } from 'node:module'
import { join } from 'node:path'

const nodeRequire = createRequire(join(process.cwd(), 'sqlite-shim.js'))
const sqlite = nodeRequire('node:sqlite') as typeof import('node:sqlite')

export const DatabaseSync = sqlite.DatabaseSync
export type DatabaseSync = InstanceType<typeof sqlite.DatabaseSync>