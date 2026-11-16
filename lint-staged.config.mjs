/**
 * @param {string[]} filenames
 * @param {string} prefix
 */
function stripPrefix(filenames, prefix) {
  return filenames.map((f) => f.replace(new RegExp(`^${prefix}/`), ''))
}

export default {
  '*.{ts,tsx,md,css}': 'prettier --write',
  'apps/web/**/*.json': 'prettier --write',
  'apps/graphql/**/*.py': (filenames) => {
    if (filenames.length === 0) return []
    const args = stripPrefix(filenames, 'apps/graphql').join(' ')
    return `cd apps/graphql && uv run --group dev ruff check --fix ${args} && uv run --group dev ruff format ${args}`
  },
  'apps/agents/**/*.py': (filenames) => {
    if (filenames.length === 0) return []
    const args = stripPrefix(filenames, 'apps/agents').join(' ')
    return `cd apps/agents && uv run --group dev ruff check --fix ${args} && uv run --group dev ruff format ${args}`
  },
  'apps/web/**/*.{ts,tsx}': (filenames) => {
    if (filenames.length === 0) return []
    const args = stripPrefix(filenames, 'apps/web').join(' ')
    return `cd apps/web && eslint --max-warnings 0 --fix ${args}`
  },
  'packages/ui/**/*.{ts,tsx}': (filenames) => {
    if (filenames.length === 0) return []
    const args = stripPrefix(filenames, 'packages/ui').join(' ')
    return `cd packages/ui && eslint --max-warnings 0 --fix ${args}`
  },
}
