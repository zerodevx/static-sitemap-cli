const {Command, flags} = require('@oclif/command');
const getStdin = require('get-stdin');
const fg = require('fast-glob');
const mm = require('micromatch');
const parser = require('js2xmlparser');
const fs = require('fs');

class StaticSitemapCliCommand extends Command {

  async run() {
    const {argv, flags} = this.parse(StaticSitemapCliCommand);

    let baseUrl = await getStdin();
    if (!baseUrl) {
      if (!argv.length) {
        this.error('you must include a BASEURL - type "sscli --help" for help.', {
          code: 'BASEURL_NOT_FOUND',
          exit: 1
        });
      }
      baseUrl = argv[0];
    }

    const addSlash = path => path.slice(-1) === '/' ? path : `${path}/`;
    const getUrl = path => {
      let url = baseUrl + path;
      if (!flags['no-clean']) {
        if (url.slice(-11) === '/index.html') {
          url = url.slice(0, -11);
        } else if (url.slice(-5) === '.html') {
          url = url.slice(0, -5);
        }
      }
      if (flags.slash || url.split('/').length === 3) {
        url = url + '/';
      }
      return url;
    };
    baseUrl = addSlash(baseUrl);

    const files = await fg(flags.match, {
      cwd: flags.root,
      stats: true
    });
    if (flags.verbose) {
      console.warn('\x1b[36m%s\x1b[0m', `[static-sitemap-cli] found ${files.length} files!`);
    }

    if (flags.text) {
      for (let a = 0; a < files.length; a++) {
        if (flags.verbose) {
          console.warn(files[a].path);
        }
        this.log(getUrl(files[a].path));
      }
      return;
    }

    let urls = [];
    for (let a = 0; a < files.length; a++) {
      if (flags.verbose) {
        console.warn(files[a].path);
      }
      let obj = {
        loc: getUrl(files[a].path),
        lastmod: files[a].stats.mtime.toISOString()
      };
      if (flags.priority) {
        for (let b = 0; b < flags.priority.length; b++) {
          if (mm.isMatch(files[a].path, flags.priority[b].split('=')[0])) {
            obj.priority = parseFloat(flags.priority[b].split('=')[1]);
          }
        }
      }
      if (flags.changefreq) {
        for (let b = 0; b < flags.changefreq.length; b++) {
          if (mm.isMatch(files[a].path, flags.changefreq[b].split('=')[0])) {
            obj.changefreq = flags.changefreq[b].split('=')[1];
          }
        }
      }
      urls.push(obj);
    }

    let sitemap = parser.parse('urlset', {
      '@': {
        xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9'
      },
      url: [urls]
    }, {
      declaration: {
        encoding: 'UTF-8'
      },
      format: {
        doubleQuotes: true
      }
    });
    if (flags.save) {
      fs.writeFileSync(`${addSlash(flags.root)}sitemap.xml`, `${sitemap}\n`, 'utf-8');
    } else {
      this.log(sitemap);
    }

  }
}

StaticSitemapCliCommand.description = `
CLI to pre-generate XML sitemaps for static sites locally.

At its most basic, just run from root of distribution:
$ sscli https://example.com > sitemap.xml

CLI by default outputs to 'stdout'; BASEURL can be piped in via 'stdin'.`;

StaticSitemapCliCommand.args = [{
  name: 'baseUrl',
  required: false,
  description: 'Base URL that is prefixed to all location entries.\nFor example: https://example.com/',
}];

StaticSitemapCliCommand.flags = {
  version: flags.version({char: 'V'}),
  help: flags.help({char: 'h'}),
  root: flags.string({
    char: 'r',
    description: 'root working directory',
    default: '.',
  }),
  match: flags.string({
    char: 'm',
    multiple: true,
    description: 'globs to match',
    default: ['**/*.html', '!404.html'],
  }),
  priority: flags.string({
    char: 'p',
    multiple: true,
    description: 'glob-priority pair [eg: foo/**=0.1]',
  }),
  changefreq: flags.string({
    char: 'c',
    multiple: true,
    description: 'glob-changefreq pair (eg: bar/**=daily)',
  }),
  'no-clean': flags.boolean({
    char: 'n',
    description: 'disable clean URLs',
    default: false,
  }),
  slash: flags.boolean({
    char: 'l',
    description: 'add trailing slash to all URLs',
    default: false,
    exclusive: ['no-clean'],
  }),
  text: flags.boolean({
    char: 't',
    description: 'output as .TXT instead',
    default: false,
    exclusive: ['priority', 'changefreq'],
  }),
  save: flags.boolean({
    char: 's',
    description: 'save output directly to file <root>/sitemap.xml',
    default: false,
    exclusive: ['text'],
  }),
  verbose: flags.boolean({
    char: 'v',
    description: 'be more verbose',
    default: false,
  }),
}

module.exports = StaticSitemapCliCommand;
