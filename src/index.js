const { Command, flags } = require('@oclif/command');
const getStdin = require('get-stdin');
const fg = require('fast-glob');
const mm = require('micromatch');
const parser = require('js2xmlparser');
const fs = require('fs');
const htmlparser = require('htmlparser2');

class StaticSitemapCliCommand extends Command {
  async run() {
    const { argv, flags } = this.parse(StaticSitemapCliCommand);

    let baseUrl = await getStdin();
    if (!baseUrl) {
      if (!argv.length) {
        this.error('you must include a BASEURL - type "sscli --help" for help.', {
          code: 'BASEURL_NOT_FOUND',
          exit: 1,
        });
      }
      baseUrl = argv[0];
    }

    const addSlash = (path) => (path.slice(-1) === '/' ? path : `${path}/`);
    baseUrl = addSlash(baseUrl);

    const getUrl = (path) => {
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

    const files = await fg(flags.match, {
      cwd: flags.root,
      stats: true,
    });
    if (files.length === 0) {
      this.error('[static-sitemap-cli] no file matches found!', {
        code: 'NO_MATCHES_FOUND',
        exit: 1,
      });
    }
    if (flags.verbose) {
      console.warn('\x1b[36m%s\x1b[0m', `[static-sitemap-cli] found ${files.length} files!`);
      for (let a = 0; a < files.length - 1; a++) {
        console.warn('\x1b[36m%s\x1b[0m', `[static-sitemap-cli] -${files[a].path}`);
      }
    }

    let sitemapText = '';
    for (let a = 0; a < files.length - 1; a++) {
      sitemapText += getUrl(files[a].path) + '\n';
    }
    sitemapText += getUrl(files[files.length - 1].path);

    if (flags.text) {
      this.log(sitemapText);
      return;
    }

    let urls = [];
    for (let a = 0; a < files.length; a++) {
      let obj = {
        loc: getUrl(files[a].path),
        lastmod: files[a].stats.mtime.toISOString(),
      };

      if (flags['follow-noindex']) {
        const fileContent = fs.readFileSync(flags.root + '/' + files[a].path);

        let noindex = false;

        const parsedHtml = new htmlparser.Parser({
          onopentag(name, attrs) {
            if (name === 'meta' && attrs.name === 'robots' && attrs.content === 'noindex') {
              noindex = true;
              parsedHtml.end();
            }
          },
        });

        parsedHtml.write(fileContent);
        parsedHtml.end();

        // No index meta tag

        if (noindex) {
          console.log('No index!');
          continue;
        }
      }

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

    let sitemap = parser.parse(
      'urlset',
      {
        '@': {
          xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9',
        },
        url: [urls],
      },
      {
        declaration: {
          encoding: 'UTF-8',
        },
        format: {
          doubleQuotes: true,
        },
      },
    );

    if (flags.save) {
      let outputDir = flags['output-dir'] || flags.root;
      fs.writeFileSync(`${addSlash(outputDir)}sitemap.xml`, `${sitemap}\n`, 'utf-8');
      fs.writeFileSync(`${addSlash(outputDir)}sitemap.txt`, `${sitemapText}\n`, 'utf-8');
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

StaticSitemapCliCommand.args = [
  {
    name: 'baseUrl',
    required: false,
    description: 'Base URL that is prefixed to all location entries.\nFor example: https://example.com/',
  },
];

StaticSitemapCliCommand.flags = {
  version: flags.version({ char: 'V' }),
  help: flags.help({ char: 'h' }),
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
  'follow-noindex': flags.boolean({
    description: 'removes pages with noindex meta tag from sitemap (up to 5x slower due to reading and parsing every HTML file)',
    default: false,
  }),
  text: flags.boolean({
    char: 't',
    description: 'output as .TXT instead',
    default: false,
    exclusive: ['priority', 'changefreq'],
  }),
  save: flags.boolean({
    char: 's',
    description: 'save output to XML and TXT files directly',
    default: false,
    exclusive: ['text'],
  }),
  'output-dir': flags.string({
    char: 'o',
    description: 'specify the output dir; used together with --save; defaults to root working directory',
    dependsOn: ['save'],
  }),
  verbose: flags.boolean({
    char: 'v',
    description: 'be more verbose',
    default: false,
  }),
};

module.exports = StaticSitemapCliCommand;
