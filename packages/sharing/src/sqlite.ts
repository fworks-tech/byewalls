// SQLite shim for Node.js built-in sqlite module (experimental)
// Requires a sqlite-shim.js file at the project root that exports the native module.
// Example sqlite-shim.js:
//   module.exports = require('node:sqlite')
// This works around TypeScript/Node.js module resolution for the experimental node:sqlite API.
import { createRequire } from 'node:module'
import { join } from 'node:path'

const nodeRequire = createRequire(join(process.cwd(), 'sqlite-shim.js'))
const sqlite = nodeRequire('node:sqlite') as typeof import('node:sqlite')

export const DatabaseSync = sqlite.DatabaseSync
export type DatabaseSync = InstanceType<typeof sqlite.DatabaseSync>