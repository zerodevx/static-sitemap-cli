#!/usr/bin/env node
import { parseArgs } from 'node:util'
import { access, readFile } from 'node:fs/promises'
import { relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import pkg from './package.json' with { type: 'json' }
import { run, log, SitemapError } from './index.js'

const HELP = `Usage: sscli [options]

Generate sitemaps for static sites from the filesystem.

Options:
  -b, --base <url>      base URL of the site (required)
  -d, --dist <dir>      directory to scan, and where sitemaps
                        are written (default: .)
  -m, --match <glob>    glob to match; repeatable
                        (default: **/*.html)
  -i, --ignore <glob>   glob to ignore; repeatable
                        (default: 404.html)
  -f, --format <fmt>    xml, txt or both (default: both;
                        xml with --stdout)
      --urls <style>    clean, slash or raw (default: clean)
      --no-lastmod      omit lastmod dates
      --no-robots       don't check html for noindex meta
  -o, --stdout          print to stdout instead of files
  -v, --verbose         log progress
  -V, --version         print version
  -h, --help            print this help

Config: package.json "sscli" key or sscli.config.js, read
from the current directory. Flags override config.`

/** @type {(msg: string) => never} */
const fail = (msg) => {
  console.error(`sscli: ${msg}\nTry 'sscli --help' for usage.`)
  process.exit(1)
}

/** @param {string} file */
const exists = (file) =>
  access(file).then(
    () => true,
    () => false
  )

/** @returns {Promise<{ file?: string, config: import('./index.js').Options }>} */
async function loadConfig() {
  const js = resolve('sscli.config.js')
  if (await exists(js)) {
    return { file: js, config: (await import(pathToFileURL(js).href)).default }
  }
  const json = resolve('package.json')
  if (await exists(json)) {
    const { sscli } = JSON.parse(await readFile(json, 'utf8'))
    if (sscli) return { file: json, config: sscli }
  }
  return { config: {} }
}

const { values } = (() => {
  try {
    return parseArgs({
      allowNegative: true,
      options: {
        base: { type: 'string', short: 'b' },
        dist: { type: 'string', short: 'd' },
        match: { type: 'string', short: 'm', multiple: true },
        ignore: { type: 'string', short: 'i', multiple: true },
        format: { type: 'string', short: 'f' },
        urls: { type: 'string' },
        lastmod: { type: 'boolean' },
        robots: { type: 'boolean' },
        stdout: { type: 'boolean', short: 'o' },
        verbose: { type: 'boolean', short: 'v' },
        version: { type: 'boolean', short: 'V' },
        help: { type: 'boolean', short: 'h' }
      }
    })
  } catch (err) {
    const e = /** @type {NodeJS.ErrnoException} */ (err)
    if (!e.code?.startsWith('ERR_PARSE_ARGS_')) throw err
    fail(e.message.split('. ')[0])
  }
})()

if (values.help) {
  console.log(HELP)
  process.exit()
}
if (values.version) {
  console.log(pkg.version)
  process.exit()
}

const { file, config } = await loadConfig()
const opts = { ...config, ...values }

if (opts.verbose && file) log(`found config in ${relative(process.cwd(), file)}`)
if (!opts.base) fail('base URL is required: use --base, or set "base" in config')

try {
  await run(opts)
} catch (err) {
  if (err instanceof SitemapError) fail(err.message)
  console.error(err)
  process.exit(1)
}
