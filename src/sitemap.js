const fg = require('fast-glob')
const mm = require('micromatch')
const parser = require('js2xmlparser')
const fs = require('fs')
const htmlparser = require('htmlparser2')

module.exports = async (baseUrl, flags) => {
  const getUrl = (path) => {
    let url = baseUrl + path
    if (!flags['no-clean']) {
      if (url.slice(-11) === '/index.html') {
        url = url.slice(0, -11)
      } else if (url.slice(-5) === '.html') {
        url = url.slice(0, -5)
      }
    }
    if (flags.slash || url.split('/').length === 3) {
      url = url + '/'
    }
    return url
  }
  const files = await fg(flags.match, {
    cwd: flags.root,
    stats: true
  })
  if (files.length === 0) {
    throw new Error('NO_MATCHES_FOUND')
  }
  if (flags.verbose) {
    console.warn('\x1b[36m%s\x1b[0m', `[static-sitemap-cli] found ${files.length} files!`)
    for (let a = 0; a < files.length - 1; a++) {
      console.warn('\x1b[36m%s\x1b[0m', `[static-sitemap-cli] -${files[a].path}`)
    }
  }
  let sitemapText = ''
  for (let a = 0; a < files.length - 1; a++) {
    sitemapText += getUrl(files[a].path) + '\n'
  }
  sitemapText += getUrl(files[files.length - 1].path)
  if (flags.text) {
    return sitemapText
  }
  const urls = []
  // Start looping through every entry
  for (let a = 0; a < files.length; a++) {
    const obj = {
      loc: getUrl(files[a].path),
      lastmod: files[a].stats.mtime.toISOString()
    }
    if (flags['follow-noindex']) {
      const fileContent = fs.readFileSync(flags.root + '/' + files[a].path)
      let noindex = false
      const parsedHtml = new htmlparser.Parser({
        onopentag (name, attrs) {
          if (name === 'meta' && attrs.name === 'robots' && attrs.content === 'noindex') {
            noindex = true
            parsedHtml.end()
          }
        }
      })
      parsedHtml.write(fileContent)
      parsedHtml.end()
      if (noindex) {
        continue
      }
    }
    if (flags.priority) {
      for (let b = 0; b < flags.priority.length; b++) {
        if (mm.isMatch(files[a].path, flags.priority[b].split('=')[0])) {
          obj.priority = parseFloat(flags.priority[b].split('=')[1])
        }
      }
    }
    if (flags.changefreq) {
      for (let b = 0; b < flags.changefreq.length; b++) {
        if (mm.isMatch(files[a].path, flags.changefreq[b].split('=')[0])) {
          obj.changefreq = flags.changefreq[b].split('=')[1]
        }
      }
    }
    urls.push(obj)
  }
  const sitemap = parser.parse(
    'urlset',
    {
      '@': {
        xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9'
      },
      url: [urls]
    },
    {
      declaration: {
        encoding: 'UTF-8'
      },
      format: {
        doubleQuotes: true
      }
    }
  )
  return flags.save ? { xml: sitemap, txt: sitemapText } : sitemap
}
