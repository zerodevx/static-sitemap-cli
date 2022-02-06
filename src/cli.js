#!/usr/bin/env node
import { program, Option } from 'commander'
import { cosmiconfig } from 'cosmiconfig'
import { promises as fs } from 'node:fs'
import nodepath from 'node:path'
import { run, log } from './index.js'

const { version } = JSON.parse(
  await fs.readFile(new URL('../package.json', import.meta.url), 'utf8')
)

const conf = (await cosmiconfig('sscli').search()) || { config: {} }

program
  .name('sscli')
  .description('CLI to generate XML sitemaps for static sites from local filesystem')
  .option('-b, --base <url>', 'base URL (required)')
  .option('-r, --root <dir>', 'root working directory', '.')
  .option('-i, --ignore <glob...>', 'globs to ignore', ['404.html'])
  .option('-c, --changefreq <glob,changefreq...>', 'comma-separated glob-changefreq pairs')
  .option('-p, --priority <glob,priority...>', 'comma-separated glob-priority pairs')
  .option('--no-robots', 'do not parse html files for noindex meta')
  .option('--concurrent <max>', 'concurrent number of html parsing ops', 128)
  .option('--no-clean', 'do not use clean URLs')
  .option('--slash', 'add trailing slash to all URLs')
  .addOption(
    new Option('-f, --format <format>', 'sitemap format')
      .choices(['xml', 'txt', 'both'])
      .default('both')
  )
  .option('-o, --stdout', 'output sitemap to stdout instead')
  .option('-v, --verbose', 'be more verbose')
  .version(version)
  .addOption(new Option('--debug').hideHelp())
  .parse()

const opts = { ...program.opts(), ...conf.config }

if (opts.verbose && conf.filepath) {
  log(`found config in ${nodepath.relative(process.cwd(), conf.filepath)}`)
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
      program.error('Error: glob-changefreq pairs malformed')
    }
  }
}

if (opts.priority && opts.priority.length) {
  const err = () => program.error('Error: glob-priority pairs malformed')
  for (let i of opts.priority) {
    i = i.split(',')
    if (i.length !== 2) err()
    const f = parseFloat(i[1])
    if (isNaN(f) || f < 0 || f > 1) err()
  }
}

if (!opts.clean && opts.slash) {
  program.error(`Error: can't add trailing slash to unclean urls`)
}

if (opts.debug) {
  console.warn(opts)
  process.exit()
}

try {
  await run(opts)
} catch (err) {
  if (err.message === 'NO_MATCHES') program.error(`Error: no matches found`)
  console.error(err)
  process.exit(1)
}
