import { Parser } from 'htmlparser2'
import { Readable } from 'node:stream'
import { createReadStream } from 'node:fs'
import { glob, stat, writeFile } from 'node:fs/promises'
import { join, extname, sep, matchesGlob } from 'node:path'
import { styleText } from 'node:util'

export const FREQUENCIES = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never']
export const FORMATS = ['xml', 'txt', 'both']
export const URL_STYLES = ['clean', 'slash', 'raw']

/**
 * @typedef {object} Options
 * @property {string} [base] required; validated at runtime
 * @property {string} [dist]
 * @property {string | string[]} [match]
 * @property {string | string[]} [ignore]
 * @property {string} [format] xml | txt | both
 * @property {string} [urls] clean | slash | raw
 * @property {boolean} [lastmod]
 * @property {boolean} [robots]
 * @property {boolean} [stdout]
 * @property {boolean} [verbose]
 * @property {number | string} [concurrency]
 * @property {Record<string, string>} [changefreq]
 * @property {Record<string, number>} [priority]
 */

/** @typedef {Required<Omit<Options, 'match' | 'ignore' | 'concurrency'>> & { match: string[], ignore: string[], concurrency: number }} ResolvedOptions */

/** @typedef {{ loc: string, lastmod?: string, changefreq?: string, priority?: string }} UrlEntry */

/** @type {Omit<ResolvedOptions, 'base' | 'format'>} */
export const DEFAULTS = {
  dist: '.',
  match: ['**/*.html'],
  ignore: ['404.html'],
  urls: 'clean',
  lastmod: true,
  robots: true,
  stdout: false,
  verbose: false,
  concurrency: 32,
  changefreq: {},
  priority: {}
}

/** Expected, user-facing errors. Anything else is a bug. */
export class SitemapError extends Error {}

export const log = (msg = '') =>
  console.warn(styleText('cyan', `[sscli] ${msg}`, { stream: process.stderr }))

/**
 * Merge with defaults, then validate and normalise. Throws SitemapError.
 * @param {Options} [options]
 * @returns {ResolvedOptions}
 */
export function resolveOptions(options = {}) {
  const set = Object.entries(options).filter(([, v]) => v !== undefined)
  const opts = /** @type {ResolvedOptions} */ (
    /** @type {unknown} */ ({ ...DEFAULTS, ...Object.fromEntries(set) })
  )
  /** @type {(msg: string) => never} */
  const fail = (msg) => {
    throw new SitemapError(msg)
  }
  /** @param {'urls' | 'format'} name @param {string[]} list */
  const oneOf = (name, list) => {
    if (!list.includes(opts[name])) fail(`${name} must be one of: ${list.join(', ')}`)
  }

  if (!opts.base) fail('base URL is required')
  try {
    opts.base = new URL(opts.base).href
  } catch {
    fail(`invalid base URL: ${opts.base}`)
  }
  if (!opts.base.endsWith('/')) opts.base += '/'

  opts.match = [opts.match].flat()
  opts.ignore = [opts.ignore].flat()

  opts.concurrency = Number(opts.concurrency)
  if (!Number.isInteger(opts.concurrency) || opts.concurrency < 1) {
    fail('concurrency must be a positive integer')
  }

  oneOf('urls', URL_STYLES)
  opts.format ??= opts.stdout ? 'xml' : 'both'
  oneOf('format', FORMATS)
  if (opts.stdout && opts.format === 'both') fail('stdout needs a single format: xml or txt')

  for (const [pattern, v] of Object.entries(opts.changefreq)) {
    if (!FREQUENCIES.includes(v)) fail(`invalid changefreq for "${pattern}": ${v}`)
  }
  for (const [pattern, v] of Object.entries(opts.priority)) {
    if (typeof v !== 'number' || !(v >= 0 && v <= 1)) {
      fail(`invalid priority for "${pattern}": ${v} (expected a number from 0 to 1)`)
    }
  }
  return opts
}

/** @param {ResolvedOptions} opts @returns {Promise<string[]>} */
export async function getFiles({ dist, match, ignore, verbose }) {
  const files = await Array.fromAsync(glob(match, { cwd: dist, exclude: ignore }))
  if (!files.length) throw new SitemapError('no files matched')
  if (verbose) {
    log(`matched ${files.length} files`)
    for (const f of files) log(`~ ${f}`)
  }
  return files
}

/** @param {string} path @returns {Promise<boolean>} */
export async function detectNoindex(path) {
  let noindex = false
  let done = false
  const parser = new Parser({
    onopentag(tag, attrs) {
      if (
        !done &&
        tag === 'meta' &&
        attrs.name?.toLowerCase() === 'robots' &&
        attrs.content?.toLowerCase().includes('noindex')
      ) {
        noindex = done = true
      }
    },
    onclosetag(tag) {
      if (tag === 'head') done = true
    }
  })
  // breaking out of the loop destroys the stream, so large files aren't fully read
  for await (const chunk of createReadStream(path, { encoding: 'utf8', highWaterMark: 1024 })) {
    parser.write(chunk)
    if (done) break
  }
  parser.end()
  return noindex
}

/** @param {string} path @param {ResolvedOptions} opts @returns {Promise<UrlEntry | undefined>} */
export async function transformUrl(path, opts) {
  const { dist, base, urls, lastmod, robots, changefreq, priority, verbose } = opts
  const fullpath = join(dist, path)
  const stats = await stat(fullpath)
  if (!stats.isFile()) return
  if (robots && extname(path) === '.html' && (await detectNoindex(fullpath))) {
    if (verbose) log(`noindex: ${path}`)
    return
  }
  const rel = path.split(sep).join('/')
  let url = base + rel
  if (urls !== 'raw') {
    if (url.endsWith('/index.html')) url = url.slice(0, -11)
    else if (url.endsWith('.html')) url = url.slice(0, -5)
    if (urls === 'slash' || url.split('/').length === 3) url += '/'
  }
  // last matching glob wins
  /** @param {Record<string, string | number>} map @param {string} tag */
  const check = (map, tag) => {
    const hit = Object.entries(map).findLast(([pattern]) => matchesGlob(rel, pattern))
    return hit && { [tag]: String(hit[1]) }
  }
  return {
    loc: url,
    ...(lastmod && { lastmod: stats.mtime.toISOString() }),
    ...check(changefreq, 'changefreq'),
    ...check(priority, 'priority')
  }
}

/** @param {ResolvedOptions} opts @returns {Promise<UrlEntry[]>} */
export async function generateUrls(opts) {
  const files = await getFiles(opts)
  const urls = await Readable.from(files)
    .map((f) => transformUrl(f, opts), { concurrency: opts.concurrency })
    .filter(Boolean)
    .toArray()
  const depth = (u = '') => u.split('/').length
  return urls.sort((a, b) => depth(a.loc) - depth(b.loc) || (a.loc < b.loc ? -1 : 1))
}

/** @param {UrlEntry[]} urls @returns {string} */
export function generateTxtSitemap(urls) {
  return urls.map((u) => u.loc).join('\n')
}

/** @type {Record<string, string>} */
const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }
/** @param {string} s */
const esc = (s) => s.replace(/[&<>"']/g, (c) => ESCAPES[c])

/** @param {UrlEntry[]} urls @returns {string} */
export function generateXmlSitemap(urls) {
  const rows = urls
    .map((u) => {
      const tags = Object.entries(u).map(([k, v]) => `<${k}>${esc(v)}</${k}>`)
      return `<url>${tags.join('')}</url>`
    })
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows}\n</urlset>`
}

/** @param {Options} options */
export async function run(options) {
  const opts = resolveOptions(options)
  const urls = await generateUrls(opts)
  /** @param {string} format */
  const generate = async (format) => {
    const output = format === 'xml' ? generateXmlSitemap(urls) : generateTxtSitemap(urls)
    if (opts.stdout) return console.log(output)
    await writeFile(join(opts.dist, `sitemap.${format}`), `${output}\n`)
    if (opts.verbose) log(`generated sitemap.${format} in ${opts.dist}`)
  }
  if (opts.format !== 'xml') await generate('txt')
  if (opts.format !== 'txt') await generate('xml')
}
