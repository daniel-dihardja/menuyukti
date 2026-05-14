import fs from 'node:fs/promises'
import path from 'node:path'

const repoRoot = path.resolve(process.cwd(), '..', '..')
const schemaPath = path.join(repoRoot, 'apps', 'graphql', 'schema.graphql')

const operationFiles = [
  path.join(repoRoot, 'apps', 'web', 'lib', 'graphql', 'queries', 'workspace.ts'),
  path.join(repoRoot, 'apps', 'web', 'app', 'api', 'analytics', 'create', 'route.ts'),
  path.join(
    repoRoot,
    'apps',
    'web',
    'app',
    'api',
    'analytics',
    '[analyticsId]',
    'cogs',
    'route.ts',
  ),
]

function parseRootFields(schemaText, rootTypeName) {
  const lines = schemaText.split('\n')
  const start = lines.findIndex((line) => line.trim() === `type ${rootTypeName} {`)
  if (start < 0) return new Set()
  const bodyLines = []
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i]
    if (line.trim() === '}') break
    bodyLines.push(line)
  }
  const fields = bodyLines
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith('#'))
    .map((line) => line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*(\(|:)/)?.[1])
    .filter(Boolean)
  return new Set(fields)
}

function extractGraphqlStrings(fileText) {
  const docs = []
  const regex = /`([\s\S]*?)`/g
  let match
  while ((match = regex.exec(fileText)) !== null) {
    const value = match[1]
    if (/\b(query|mutation)\b/.test(value)) {
      docs.push(value)
    }
  }
  return docs
}

function operationType(doc) {
  if (/\bmutation\b/.test(doc)) return 'Mutation'
  if (/\bquery\b/.test(doc)) return 'Query'
  return null
}

function firstRootField(doc) {
  const body = doc.slice(doc.indexOf('{') + 1)
  const lines = body.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('}')) continue
    const cleaned = trimmed.replace(/^[A-Za-z_][A-Za-z0-9_]*\s*:\s*/, '')
    const field = cleaned.match(/^([A-Za-z_][A-Za-z0-9_]*)/)?.[1]
    if (field) return field
  }
  return null
}

async function main() {
  const schemaText = await fs.readFile(schemaPath, 'utf8')
  const queryFields = parseRootFields(schemaText, 'Query')
  const mutationFields = parseRootFields(schemaText, 'Mutation')
  const errors = []

  for (const opFile of operationFiles) {
    const content = await fs.readFile(opFile, 'utf8')
    const docs = extractGraphqlStrings(content)
    for (const doc of docs) {
      const type = operationType(doc)
      const field = firstRootField(doc)
      if (!type || !field) continue
      const fieldSet = type === 'Query' ? queryFields : mutationFields
      if (!fieldSet.has(field)) {
        errors.push(`${path.relative(repoRoot, opFile)} references missing ${type}.${field}`)
      }
    }
  }

  if (errors.length > 0) {
    console.error('GraphQL operation drift detected:')
    for (const err of errors) console.error(`- ${err}`)
    process.exit(1)
  }
  console.log('GraphQL operation validation passed for apps/web.')
}

await main()
