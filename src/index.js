import fastglob from 'fast-glob'
import micromatch from 'micromatch'
import parser from 'js2xmlparser'
import nodepath from 'node:path'
import { promises as fs } from 'node:fs'

function log(msg) {
  console.warn('\x1b[36m%s\x1b[0m', `[sscli] ${msg}`)
}

async function generateUrls({
  base,
  root,
  match,
  changefreq,
  priority,
  exclude,
  verbose,
  clean,
  slash
}) {
  const files = await fastglob(match, { cwd: root, stats: true })
  if (!files.length) {
    throw new Error('no matches found')
  }
  if (verbose) {
    log(`matched ${files.length} files`)
    for (const f of files) log(`~ ${f.path}`)
  }
  return files.reduce(async (acc, f) => {
    if (exclude && exclude.length) {
      for (const e of exclude) {
        const str = await fs.readFile(nodepath.join(root, f.path), 'utf-8')
        if (str.match(new RegExp(e))) {
          if (verbose) log(`excluding: ${f.path}`)
          return await acc
        }
      }
    }
    let url = base + f.path.split(nodepath.sep).join('/')
    if (clean) {
      if (url.slice(-11) === '/index.html') {
        url = url.slice(0, -11)
      } else if (url.slice(-5) === '.html') {
        url = url.slice(0, -5)
      }
      if (slash || url.split('/').length === 3) {
        url += '/'
      }
    }
    const part = {
      loc: url,
      lastmod: f.stats.mtime.toISOString()
    }
    const check = (pairs) => {
      for (let a = pairs.length - 1; a >= 0; a--) {
        const p = pairs[a].split(',')
        if (micromatch.isMatch(f.path, p[0])) return p[1]
      }
    }
    if (changefreq && changefreq.length) {
      const val = check(changefreq)
      if (val) part.changefreq = val
    }
    if (priority && priority.length) {
      const val = check(priority)
      if (val) part.priority = val
    }
    return [...(await acc), part]
  }, [])
}

function generateTxtSitemap(urls) {
  let output = ''
  for (let a = 0; a < urls.length; a++) {
    output += urls[a].loc
    if (a < urls.length - 1) output += '\n'
  }
  return output
}

function generateXmlSitemap(urls) {
  return parser.parse(
    'urlset',
    {
      '@': { xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9' },
      url: [urls]
    },
    {
      declaration: { encoding: 'UTF-8' },
      format: { doubleQuotes: true }
    }
  )
}

async function run(opts) {
  const urls = await generateUrls(opts)
  const generate = async (format) => {
    const output = format === 'txt' ? generateTxtSitemap(urls) : generateXmlSitemap(urls)
    if (opts.stdout) console.log(output)
    else {
      await fs.writeFile(nodepath.join(opts.root, `sitemap.${format}`), `${output}\n`, 'utf-8')
      if (opts.verbose) log(`successfully generated sitemap.${format} at ${opts.root}`)
    }
  }
  if (['txt', 'both'].includes(opts.format)) await generate('txt')
  if (['xml', 'both'].includes(opts.format)) await generate('xml')
}

export { run, log, generateUrls, generateTxtSitemap, generateXmlSitemap }
