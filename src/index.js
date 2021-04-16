const getSitemap = require('./sitemap')
const { Command, flags } = require('@oclif/command')
const getStdin = require('get-stdin')
const fs = require('fs')

class StaticSitemapCliCommand extends Command {
  async run () {
    const { argv, flags } = this.parse(StaticSitemapCliCommand)

    let baseUrl = await getStdin()
    if (!baseUrl) {
      if (!argv.length) {
        this.error('you must include a BASEURL - type "sscli --help" for help.', {
          code: 'BASEURL_NOT_FOUND',
          exit: 1
        })
      }
      baseUrl = argv[0]
    }
    const addSlash = (path) => (path.slice(-1) === '/' ? path : `${path}/`)
    baseUrl = addSlash(baseUrl)

    let sitemap
    try {
      sitemap = await getSitemap(baseUrl, flags)
    } catch (err) {
      if (err.message === 'NO_MATCHES_FOUND') {
        this.error('[static-sitemap-cli] No file matches found!', {
          code: 'NO_MATCHES_FOUND',
          exit: 1
        })
      } else {
        this.error(err.toString(), { exit: 1 })
      }
    }

    if (flags.save) {
      const outputDir = flags['output-dir'] || flags.root
      fs.writeFileSync(`${addSlash(outputDir)}sitemap.xml`, `${sitemap.xml}\n`, 'utf-8')
      fs.writeFileSync(`${addSlash(outputDir)}sitemap.txt`, `${sitemap.txt}\n`, 'utf-8')
    } else {
      this.log(sitemap)
    }
  }
}

StaticSitemapCliCommand.description = `
CLI to generate XML sitemaps for static sites from local filesystem.

At its most basic, just run from root of distribution:
$ sscli https://example.com > sitemap.xml

CLI by default outputs to 'stdout'; BASEURL can be piped in via 'stdin'.`

StaticSitemapCliCommand.args = [
  {
    name: 'baseUrl',
    required: false,
    description: 'Base URL that is prefixed to all sitemap items.\nFor example: https://example.com/'
  }
]

StaticSitemapCliCommand.flags = {
  version: flags.version({ char: 'V' }),
  help: flags.help({ char: 'h' }),
  root: flags.string({
    char: 'r',
    description: 'root working directory',
    default: '.'
  }),
  match: flags.string({
    char: 'm',
    multiple: true,
    description: 'micromatch globs to match',
    default: ['**/*.html', '!404.html']
  }),
  priority: flags.string({
    char: 'p',
    multiple: true,
    description: '`=`-separated glob-priority pair [eg: foo/**=0.1]'
  }),
  changefreq: flags.string({
    char: 'c',
    multiple: true,
    description: '`=`-separated glob-changefreq pair [eg: bar/**=daily]'
  }),
  'no-clean': flags.boolean({
    char: 'n',
    description: 'disable clean URLs',
    default: false
  }),
  slash: flags.boolean({
    char: 'l',
    description: 'add trailing slash to all URLs',
    default: false,
    exclusive: ['no-clean']
  }),
  'follow-noindex': flags.boolean({
    description: 'removes pages with noindex meta tag from sitemap (up to 5x slower due to reading and parsing every HTML file)',
    default: false
  }),
  text: flags.boolean({
    char: 't',
    description: 'output as text instead of XML',
    default: false,
    exclusive: ['priority', 'changefreq']
  }),
  save: flags.boolean({
    char: 's',
    description: 'write both XML and TXT outputs to file directly instead of `stdout`',
    default: false,
    exclusive: ['text']
  }),
  'output-dir': flags.string({
    char: 'o',
    description: 'specify the output dir; used together with --save; defaults to root working directory',
    dependsOn: ['save']
  }),
  verbose: flags.boolean({
    char: 'v',
    description: 'be more verbose',
    default: false
  })
}

module.exports = StaticSitemapCliCommand
