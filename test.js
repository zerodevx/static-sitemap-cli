import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, utimes } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import {
  SitemapError,
  resolveOptions,
  detectNoindex,
  generateUrls,
  generateTxtSitemap,
  generateXmlSitemap,
  run
} from './index.js'
/** @import { Options } from './index.js' */

const CLI = fileURLToPath(new URL('./cli.js', import.meta.url))
const BASE = 'https://example.com'
/** @type {string[]} */
const tmpdirs = []

/** @param {Record<string, string>} files */
async function make(files) {
  const dir = await mkdtemp(join(tmpdir(), 'sscli-'))
  tmpdirs.push(dir)
  for (const [name, content] of Object.entries(files)) {
    await mkdir(dirname(join(dir, name)), { recursive: true })
    await writeFile(join(dir, name), content)
  }
  return dir
}

/** @param {string[]} args @param {string} [cwd] @returns {Promise<{ code: number|string|null|undefined, stdout: string, stderr: string }>} */
const sscli = (args, cwd = process.cwd()) =>
  new Promise((resolve) => {
    execFile(process.execPath, [CLI, ...args], { cwd }, (err, stdout, stderr) => {
      resolve({ code: err ? err.code : 0, stdout, stderr })
    })
  })

/** @param {Partial<Options>} options */
const locs = async (options) =>
  (await generateUrls(resolveOptions({ base: BASE, ...options }))).map((u) => u.loc)

/** @param {string} dir */
const sitemaps = async (dir) => (await readdir(dir)).filter((f) => f.startsWith('sitemap')).sort()

after(() => Promise.all(tmpdirs.map((d) => rm(d, { recursive: true, force: true }))))

describe('resolveOptions', () => {
  test('requires a valid base, and adds trailing slash', () => {
    assert.throws(() => resolveOptions({}), SitemapError)
    assert.throws(() => resolveOptions({ base: 'not a url' }), SitemapError)
    assert.equal(resolveOptions({ base: 'https://a.com/sub' }).base, 'https://a.com/sub/')
  })

  test('ignores undefined values so defaults survive', () => {
    const opts = resolveOptions({ base: BASE, urls: undefined })
    assert.equal(opts.urls, 'clean')
  })

  test('format defaults to both, or xml with stdout', () => {
    assert.equal(resolveOptions({ base: BASE }).format, 'both')
    assert.equal(resolveOptions({ base: BASE, stdout: true }).format, 'xml')
    assert.equal(resolveOptions({ base: BASE, stdout: true, format: 'txt' }).format, 'txt')
  })

  test('rejects stdout with format both', () => {
    assert.throws(
      () => resolveOptions({ base: BASE, stdout: true, format: 'both' }),
      /single format/
    )
  })

  test('rejects bad enums and numbers', () => {
    assert.throws(() => resolveOptions({ base: BASE, format: 'json' }), /format/)
    assert.throws(() => resolveOptions({ base: BASE, urls: 'pretty' }), /urls/)
    assert.throws(() => resolveOptions({ base: BASE, concurrency: 0 }), /concurrency/)
    assert.throws(() => resolveOptions({ base: BASE, concurrency: 'x' }), /concurrency/)
  })

  test('validates changefreq and priority', () => {
    assert.throws(
      () => resolveOptions({ base: BASE, changefreq: { '**': 'sometimes' } }),
      /changefreq/
    )
    assert.throws(() => resolveOptions({ base: BASE, priority: { '**': 2 } }), /priority/)
    // @ts-expect-error testing invalid input
    assert.throws(() => resolveOptions({ base: BASE, priority: { '**': '0.5' } }), /priority/)
    assert.doesNotThrow(() =>
      resolveOptions({ base: BASE, changefreq: { '**': 'daily' }, priority: { '**': 0.5 } })
    )
  })

  test('wraps single match/ignore strings in arrays', () => {
    const opts = resolveOptions({ base: BASE, match: 'a/**', ignore: 'b/**' })
    assert.deepEqual(opts.match, ['a/**'])
    assert.deepEqual(opts.ignore, ['b/**'])
  })
})

describe('detectNoindex', () => {
  /** @type {string} */
  let dir
  before(async () => {
    dir = await make({
      'yes.html': '<html><head><meta name="robots" content="noindex, follow"></head></html>',
      'upper.html': '<HTML><HEAD><META NAME="ROBOTS" CONTENT="NOINDEX"></HEAD></HTML>',
      'follow.html': '<head><meta name="robots" content="index, follow"></head>',
      'nocontent.html': '<head><meta name="robots"></head>',
      'body.html': '<head></head><body><meta name="robots" content="noindex"></body>',
      'none.html': '<head><title>hi</title></head>'
    })
  })

  test('detects noindex', async () => {
    assert.equal(await detectNoindex(join(dir, 'yes.html')), true)
    assert.equal(await detectNoindex(join(dir, 'upper.html')), true)
  })

  test('returns false otherwise, without throwing', async () => {
    for (const f of ['follow', 'nocontent', 'body', 'none']) {
      assert.equal(await detectNoindex(join(dir, `${f}.html`)), false, f)
    }
  })

  test('rejects when the file is unreadable', async () => {
    await assert.rejects(detectNoindex(join(dir, 'missing.html')))
  })
})

describe('generateUrls', () => {
  /** @type {string} */
  let dist
  before(async () => {
    dist = await make({
      'index.html': '<head></head>',
      'about.html': '<head></head>',
      '404.html': '<head></head>',
      'secret.html': '<head><meta name="robots" content="noindex"></head>',
      'blog/index.html': '<head></head>',
      'blog/post.html': '<head></head>',
      'drafts/wip.html': '<head></head>',
      'notes.txt': 'not html'
    })
    const when = new Date('2024-01-02T03:04:05Z')
    await utimes(join(dist, 'index.html'), when, when)
  })

  test('clean urls by default; skips 404 and noindex; sorted by depth', async () => {
    assert.deepEqual(await locs({ dist }), [
      `${BASE}/`,
      `${BASE}/about`,
      `${BASE}/blog`,
      `${BASE}/blog/post`,
      `${BASE}/drafts/wip`
    ])
  })

  test('urls: slash', async () => {
    assert.deepEqual(await locs({ dist, urls: 'slash' }), [
      `${BASE}/`,
      `${BASE}/about/`,
      `${BASE}/blog/`,
      `${BASE}/blog/post/`,
      `${BASE}/drafts/wip/`
    ])
  })

  test('urls: raw', async () => {
    assert.deepEqual(await locs({ dist, urls: 'raw' }), [
      `${BASE}/about.html`,
      `${BASE}/index.html`,
      `${BASE}/blog/index.html`,
      `${BASE}/blog/post.html`,
      `${BASE}/drafts/wip.html`
    ])
  })

  test('robots: false keeps noindex pages', async () => {
    assert.ok((await locs({ dist, robots: false })).includes(`${BASE}/secret`))
  })

  test('match and ignore', async () => {
    assert.deepEqual(await locs({ dist, match: ['blog/**/*.html'] }), [
      `${BASE}/blog`,
      `${BASE}/blog/post`
    ])
    const out = await locs({ dist, ignore: ['404.html', 'drafts/**'] })
    assert.ok(!out.some((u) => u.includes('drafts')))
  })

  test('throws when nothing matches', async () => {
    await assert.rejects(locs({ dist, match: ['nope/**'] }), /no files matched/)
  })

  test('lastmod is on by default and can be disabled', async () => {
    const opts = resolveOptions({ base: BASE, dist })
    const home = (await generateUrls(opts)).find((u) => u.loc === `${BASE}/`)
    assert.equal(home?.lastmod, '2024-01-02T03:04:05.000Z')
    const off = await generateUrls(resolveOptions({ base: BASE, dist, lastmod: false }))
    assert.ok(off.every((u) => !('lastmod' in u)))
  })

  test('changefreq and priority: last matching glob wins', async () => {
    const opts = resolveOptions({
      base: BASE,
      dist,
      changefreq: { '**': 'monthly', 'blog/**': 'weekly' },
      priority: { '**': 0.5, 'index.html': 1 }
    })
    const urls = await generateUrls(opts)
    /** @param {string} loc */
    const get = (loc) => urls.find((u) => u.loc === `${BASE}${loc}`)
    assert.equal(get('/about')?.changefreq, 'monthly')
    assert.equal(get('/blog/post')?.changefreq, 'weekly')
    assert.equal(get('/about')?.priority, '0.5')
    assert.equal(get('/')?.priority, '1')
  })
})

describe('generators', () => {
  const urls = [
    { loc: 'https://a.com/?x=1&y=<2>', lastmod: '2024-01-01T00:00:00.000Z' },
    { loc: 'https://a.com/b', changefreq: 'daily', priority: '0.5' }
  ]

  test('txt', () => {
    assert.equal(generateTxtSitemap(urls), 'https://a.com/?x=1&y=<2>\nhttps://a.com/b')
  })

  test('xml escapes and keeps tag order', () => {
    const xml = generateXmlSitemap(urls)
    assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'))
    assert.ok(xml.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'))
    assert.ok(xml.includes('<loc>https://a.com/?x=1&amp;y=&lt;2&gt;</loc>'))
    assert.ok(
      xml.includes(
        '<url><loc>https://a.com/b</loc><changefreq>daily</changefreq><priority>0.5</priority></url>'
      )
    )
  })
})

describe('run', () => {
  test('writes both files by default', async () => {
    const dist = await make({ 'index.html': '<head></head>', 'a.html': '<head></head>' })
    await run({ base: BASE, dist })
    assert.deepEqual(await sitemaps(dist), ['sitemap.txt', 'sitemap.xml'])
    assert.equal(await readFile(join(dist, 'sitemap.txt'), 'utf8'), `${BASE}/\n${BASE}/a\n`)
  })

  test('writes only the requested format', async () => {
    const dist = await make({ 'index.html': '<head></head>' })
    await run({ base: BASE, dist, format: 'xml' })
    assert.deepEqual(await sitemaps(dist), ['sitemap.xml'])
  })
})

describe('cli', () => {
  /** @type {string} */
  let dist
  /** @type {(...rest: string[]) => string[]} */
  let args
  before(async () => {
    dist = await make({ 'index.html': '<head></head>', 'about.html': '<head></head>' })
    args = (...rest) => ['-b', BASE, '-d', dist, ...rest]
  })

  test('--version', async () => {
    const pkg = JSON.parse(await readFile(new URL('./package.json', import.meta.url), 'utf8'))
    const { code, stdout } = await sscli(['--version'])
    assert.equal(code, 0)
    assert.equal(stdout.trim(), pkg.version)
  })

  test('--help fits in 64 columns', async () => {
    const { code, stdout } = await sscli(['--help'])
    assert.equal(code, 0)
    assert.ok(stdout.startsWith('Usage: sscli [options]'))
    for (const line of stdout.split('\n')) assert.ok(line.length <= 64, `too long: ${line}`)
  })

  test('fails without a base, and hints at config', async () => {
    const { code, stderr } = await sscli([], await make({}))
    assert.equal(code, 1)
    assert.match(stderr, /base URL is required.*config/)
  })

  test('fails on unknown options and stray arguments', async () => {
    assert.equal((await sscli(args('--nope'))).code, 1)
    assert.equal((await sscli(args('extra'))).code, 1)
  })

  test('--stdout prints xml by default', async () => {
    const { code, stdout } = await sscli(args('--stdout'))
    assert.equal(code, 0)
    assert.ok(stdout.startsWith('<?xml'))
    assert.ok(stdout.includes('<loc>https://example.com/about</loc>'))
  })

  test('--stdout -f txt prints urls', async () => {
    const { stdout } = await sscli(args('-o', '-f', 'txt'))
    assert.equal(stdout.trim(), `${BASE}/\n${BASE}/about`)
  })

  test('--stdout -f both is an error', async () => {
    const { code, stderr } = await sscli(args('-o', '-f', 'both'))
    assert.equal(code, 1)
    assert.match(stderr, /single format/)
  })

  test('--no-lastmod and --urls', async () => {
    const { stdout } = await sscli(args('-o', '--no-lastmod', '--urls', 'raw'))
    assert.ok(!stdout.includes('lastmod'))
    assert.ok(stdout.includes('<loc>https://example.com/about.html</loc>'))
  })

  test('reads package.json#sscli, and flags override it', async () => {
    const cwd = await make({
      'package.json': JSON.stringify({
        sscli: { base: 'https://cfg.example', urls: 'raw', priority: { '**': 0.8 } }
      }),
      'a.html': '<head></head>'
    })
    const a = await sscli(['-o'], cwd)
    assert.ok(a.stdout.includes('<loc>https://cfg.example/a.html</loc>'))
    assert.ok(a.stdout.includes('<priority>0.8</priority>'))
    const b = await sscli(['-o', '--urls', 'clean'], cwd)
    assert.ok(b.stdout.includes('<loc>https://cfg.example/a</loc>'))
  })

  test('bare sscli runs from config alone (base and dist)', async () => {
    const cwd = await make({
      'package.json': JSON.stringify({ sscli: { base: 'https://cfg.example', dist: 'public' } }),
      'public/a.html': '<head></head>'
    })
    const { code } = await sscli([], cwd)
    assert.equal(code, 0)
    assert.deepEqual(await sitemaps(join(cwd, 'public')), ['sitemap.txt', 'sitemap.xml'])
  })

  test('flags override config base and dist independently', async () => {
    const cwd = await make({
      'package.json': JSON.stringify({ sscli: { base: 'https://cfg.example', dist: 'public' } }),
      'public/a.html': '<head></head>',
      'other/b.html': '<head></head>'
    })
    const a = await sscli(['-o', '-f', 'txt', '-d', 'other'], cwd)
    assert.equal(a.stdout.trim(), 'https://cfg.example/b')
    const b = await sscli(['-o', '-f', 'txt', '-b', 'https://cli.example'], cwd)
    assert.equal(b.stdout.trim(), 'https://cli.example/a')
  })

  test('reads sscli.config.js', async () => {
    const cwd = await make({
      'package.json': '{"type":"module"}',
      'sscli.config.js': `export default { base: 'https://cfg.example', ignore: ['b.html'] }`,
      'a.html': '<head></head>',
      'b.html': '<head></head>'
    })
    const { stdout } = await sscli(['-o', '-f', 'txt'], cwd)
    assert.equal(stdout.trim(), 'https://cfg.example/a')
  })
})
