import fastglob from 'fast-glob'
import micromatch from 'micromatch'
import js2xmlparser from 'js2xmlparser'
import { WritableStream } from 'htmlparser2/lib/WritableStream.js'
import pool from 'tiny-async-pool'
import nodepath from 'node:path'
import { createReadStream, promises as fs } from 'node:fs'

function log(msg) {
  console.warn('\x1b[36m%s\x1b[0m', `[sscli] ${msg}`)
}

async function getFiles({ root, ignore, verbose }) {
  const files = await fastglob('**/*.html', { cwd: root, stats: true, ignore })
  if (!files.length) {
    throw new Error('NO_MATCHES')
  }
  if (verbose) {
    log(`matched ${files.length} files`)
    for (const f of files) log(`~ ${f.path}`)
  }
  return files
}

function detectNoindex(path) {
  return new Promise((resolve) => {
    const parser = new WritableStream({
      onopentag(tag, { name, content }) {
        if (tag === 'meta' && name === 'robots' && content.includes('noindex')) {
          parser.end()
          resolve(true)
        }
      },
      onclosetag(tag) {
        if (tag === 'head') {
          parser.end()
          resolve()
        }
      }
    })
    const filestream = createReadStream(path)
    filestream.pipe(parser).on('finish', resolve)
  })
}

async function generateUrl(
  file,
  { root, base, changefreq, priority, robots, clean, slash, verbose }
) {
  if (robots) {
    if (await detectNoindex(nodepath.join(root, file.path))) {
      if (verbose) log(`noindex: ${file.path}`)
      return
    }
  }
  let url = base + file.path.split(nodepath.sep).join('/')
  if (clean) {
    if (url.slice(-11) === '/index.html') url = url.slice(0, -11)
    else if (url.slice(-5) === '.html') url = url.slice(0, -5)
    if (slash || url.split('/').length === 3) url += '/'
  }
  const check = (pairs, tagname) => {
    for (let a = pairs.length - 1; a >= 0; a--) {
      const p = pairs[a].split(',')
      if (micromatch.isMatch(file.path, p[0])) return { [tagname]: p[1] }
    }
  }
  return {
    loc: url,
    lastmod: file.stats.mtime.toISOString(),
    ...(changefreq && changefreq.length && check(changefreq, 'changefreq')),
    ...(priority && priority.length && check(priority, 'priority'))
  }
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
  return js2xmlparser.parse(
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
  const files = await getFiles(opts)
  const iterator = (f) => generateUrl(f, opts)
  const urls = (await pool(opts.concurrent, files, iterator)).filter((i) => i)
  const generate = async (format) => {
    const output = format === 'xml' ? generateXmlSitemap(urls) : generateTxtSitemap(urls)
    if (opts.stdout) console.log(output)
    else {
      await fs.writeFile(nodepath.join(opts.root, `sitemap.${format}`), `${output}\n`, 'utf-8')
      if (opts.verbose) log(`successfully generated sitemap.${format} at ${opts.root}`)
    }
  }
  if (['txt', 'both'].includes(opts.format)) await generate('txt')
  if (['xml', 'both'].includes(opts.format)) await generate('xml')
}

export { run, log, getFiles, detectNoindex, generateUrl, generateTxtSitemap, generateXmlSitemap }
