const {Command, flags} = require('@oclif/command');
const getStdin = require('get-stdin');
const globby = require('globby');
const minimatch = require('minimatch');
const sitemap = require('sitemap');


class StaticSitemapCliCommand extends Command {

  async run() {
    const {argv, flags} = this.parse(StaticSitemapCliCommand);

    let baseUrl = await getStdin();
    if (!baseUrl) {
      if (!argv.length) {
        this.error('you must include a BASEURL - type "sscli --help" for help.', { code: 'BASEURL_NOT_FOUND', exit: 1 });
      }
      baseUrl = argv[0];
    }
    baseUrl = baseUrl.slice(-1) === '/' ? baseUrl.slice(0, -1) : baseUrl;
    let rootDir = flags.root || '';
    if (rootDir.length) {
      rootDir = rootDir.slice(-1) === '/' ? flags.root : flags.root + '/';
    }
    const globs = [...flags.match.map(g => `${rootDir}${g}`), ...flags.ignore.map(g => `!${rootDir}${g}`)];
    const files = await globby(globs);
    console.warn(`Found ${files.length} files!`);

    let urls = [];
    for (let a = 0; a < files.length; a++) {
      let obj = {
        lastmodrealtime: true,
        lastmodfile: files[a]
      };
      if (flags.priority) {
        for (let b = 0; b < flags.priority.length; b++) {
          if (minimatch(files[a], flags.priority[b].split(',')[0])) {
            obj.priority = parseFloat(flags.priority[b].split(',')[1]);
            break;
          }
        }
      }
      if (flags.changefreq) {
        for (let b = 0; b < flags.changefreq.length; b++) {
          if (minimatch(files[a], flags.changefreq[b].split(',')[0])) {
            obj.changefreq = flags.changefreq[b].split(',')[1];
            break;
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

StaticSitemapCliCommand.description = `
CLI to pre-generate XML sitemaps for static sites locally.

At its most basic, just run from root of distribution:
> static-sitemap-cli https://example.com > sitemap.xml
Or:
> sscli https://example.com > sitemap.xml
This creates the file 'sitemap.xml' into your root dir.
CLI by default outputs to 'stdout', and accepts 'stdin' as BASEURL.`;

StaticSitemapCliCommand.args = [{
  name: 'baseUrl',
  required: false,
  description: 'Base URL that is prefixed to all location entries.\nFor example: https://example.com/',
}];

StaticSitemapCliCommand.flags = {
  version: flags.version({char: 'v'}),
  help: flags.help({char: 'h'}),
  root: flags.string({
    char: 'r',
    description: 'root directory to start from',
    default: '',
  }),
  match: flags.string({
    char: 'm',
    multiple: true,
    description: 'list of globs to match',
    default: ['**/*.html'],
  }),
  ignore: flags.string({
    char: 'i',
    multiple: true,
    description: 'list of globs to ignore',
    default: ['404.html'],
  }),
  priority: flags.string({
    char: 'p',
    multiple: true,
    description: 'comma-separated glob/priority pair; eg: foo/*.html,0.1',
  }),
  changefreq: flags.string({
    char: 'f',
    multiple: true,
    description: 'comma-separated glob/changefreq pair; eg: bar/*.html,daily',
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
