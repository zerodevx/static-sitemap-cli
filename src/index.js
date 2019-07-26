const {Command, flags} = require('@oclif/command');
const sitemap = require('sitemap');
const filehound = require('filehound');
const nm = require('nanomatch');

class StaticSitemapCliCommand extends Command {
  async run() {
    const {argv, flags} = this.parse(StaticSitemapCliCommand);

    const baseUrl = argv[0].slice(-1) === '/' ? argv[0].slice(0, -1) : argv[0];
    const rootDir = flags.root.slice(-1) === '/' ? flags.root : flags.root + '/';

    const files = filehound.create()
      .paths(flags.root)
      .ext(flags.match.split(','))
      .discard(flags.ignore.split(','))
      .findSync();

    let urls = [];
    for (let a = 0; a < files.length; a++) {
      let obj = {
        lastmodrealtime: true,
        lastmodfile: files[a]
      };
      if (flags.priority) {
        for (let b = 0; b < flags.priority.length; b++) {
          if (nm.isMatch(files[a], flags.priority[b].split(',')[0])) {
            obj.priority = parseFloat(flags.priority[b].split(',')[1]);
          }
        }
      }
      if (flags.changefreq) {
        for (let b = 0; b < flags.changefreq.length; b++) {
          if (nm.isMatch(files[a], flags.changefreq[b].split(',')[0])) {
            obj.changefreq = flags.changefreq[b].split(',')[1];
          }
        }
      }
      let url = files[a].replace(rootDir, '/');
      if (!flags['no-clean']) {
        if (url.slice(-5) === '.html') {
          url = url.slice(0, -5);
          if (url.slice(-5) === 'index') {
            url = url.slice(0, -5);
          }
        }
      }
      if (flags.slash) {
        url = url.slice(-1) === '/' ? url : url + '/';
      } else {
        url = url.slice(-1) === '/' ? url.slice(0, -1) : url;
      }
      obj.url = url;
      urls.push(obj);
    }

    const sm = sitemap.createSitemap({
      hostname: baseUrl,
      urls: urls,
    });

    this.log(sm.toString());

  }
}

StaticSitemapCliCommand.description = `static-sitemap-cli <BASEURL> <options>
CLI to pre-generate XML sitemaps for static sites locally.

At its most basic, just run from root of distribution:
> static-sitemap-cli https://example.com > sitemap.xml
This creates the file 'sitemap.xml' into your root dir.

'static-sitemap-cli' by default outputs to 'stdout'.
`;

StaticSitemapCliCommand.args = [{
  name: 'baseUrl',
  required: true,
  description: 'Base URL that is prefixed to all location entries.\nFor example: https://example.com/',
}];

StaticSitemapCliCommand.flags = {
  version: flags.version({char: 'v'}),
  help: flags.help({char: 'h'}),
  root: flags.string({
    char: 'r',
    description: 'root dir to start from',
    default: '.'
  }),
  match: flags.string({
    char: 'm',
    description: 'comma-separated list of extensions to match',
    default: '.html'
  }),
  ignore: flags.string({
    char: 'i',
    description: 'comma-separated list of globs to ignore',
    default: '404.html',
  }),
  priority: flags.string({
    char: 'p',
    multiple: true,
    description: 'comma-separated glob/priority pair; eg: foo/*.html,0.1',
  }),
  changefreq: flags.string({
    char: 'f',
    multiple: true,
    description: 'comma-separated glob/changefreq pair; eg: foo/*.html,daily',
  }),
  'no-clean': flags.boolean({
    char: 'n',
    description: 'disable clean URLs',
    default: false,
  }),
  slash: flags.boolean({
    char: 's',
    description: 'add trailing slash to all URLs',
    default: false,
    exclusive: ['no-clean'],
  }),
}

module.exports = StaticSitemapCliCommand
