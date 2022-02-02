#!/usr/bin/env node

import { program, Option } from 'commander'
import { cosmiconfig } from 'cosmiconfig'
import { promises as fs } from 'node:fs'
import { log, run } from './index.js'

const { version } = JSON.parse(
  await fs.readFile(new URL('../package.json', import.meta.url), 'utf8')
)

const conf = (await cosmiconfig('sscli').search()) || { config: {} }

program
  .name('sscli')
  .description('CLI to generate XML sitemaps for static sites from local filesystem')
  .option('-b, --base <url>', 'base URL (required)')
  .option('-r, --root <dir>', 'root working directory', '.')
  .option('-m, --match <glob...>', 'micromatch globs to match', ['**/*.html', '!404.html'])
  .option('-f, --changefreq <glob,changefreq...>', 'comma-separated glob change-frequency pairs')
  .option('-p, --priority <glob,priority...>', 'comma-separated glob priority pairs')
  .addOption(
    new Option('-x, --exclude <regex...>', 'exclude file if contents matches regex').default(
      [`<meta\\s+name="?'?robots"?'?\\s+content="?'?noindex`],
      'refer to docs'
    )
  )
  .option('-X, --no-exclude', 'do not search within files')
  .option('-v, --verbose', 'be more verbose')
  .option('--no-clean', 'disable clean URLs')
  .option('--slash', 'add trailing slash to all URLs')
  .addOption(
    new Option('--format <format>', 'sitemap format')
      .choices(['xml', 'txt', 'both'])
      .default('both')
  )
  .option('--stdout', 'output sitemap to stdout instead')
  .version(version)
  .addOption(new Option('--debug').hideHelp())
  .parse()

const opts = { ...program.opts(), ...conf.config }

if (opts.verbose && conf.filepath) {
  log(`[sscli] found config in '${conf.filepath}'`)
}

if (!opts.base) {
  program.error(`Error: required option '-b, --base <url>' not specified`)
}

try {
  opts.base = new URL(opts.base).href
} catch {
  program.error('Error: base is not a valid URL')
}

if (opts.changefreq && opts.changefreq.length) {
  const frequencies = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never']
  for (let i of opts.changefreq) {
    i = i.split(',')
    if (i.length !== 2 || !frequencies.includes(i[1])) {
      program.error('Error: glob change-frequency pairs malformed')
    }
  }
}

if (opts.priority && opts.priority.length) {
  const err = () => program.error('Error: glob priority pairs malformed')
  for (let i of opts.priority) {
    i = i.split(',')
    if (i.length !== 2) err()
    const f = parseFloat(i[1])
    if (isNaN(f) || f < 0 || f > 1) err()
  }
}

if (opts.debug) {
  console.warn(opts)
  process.exit()
}

try {
  run(opts)
} catch (err) {
  program.error(err)
}
