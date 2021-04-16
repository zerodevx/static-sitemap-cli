![npm](https://img.shields.io/npm/v/static-sitemap-cli)
![npm](https://img.shields.io/npm/dm/static-sitemap-cli)

# static-sitemap-cli

> CLI to generate XML sitemaps for static sites from local filesystem.

Quick and easy CLI to generate either XML or TXT sitemaps for your static site. Can also be used as a Node module.

## Install

```
$ npm i -g static-sitemap-cli
```

## Usage

Syntax: `static-sitemap-cli <BASEURL> [options]`

At its simplest, just go to your `dist` folder and run:

```
static-sitemap-cli https://example.com > sitemap.xml
```

Or, because it's quite a mouthful:

```
sscli https://example.com > sitemap.xml
```

where `sscli` is an alias of `static-sitemap-cli`. CLI by default outputs to `stdout` - so that you can pipe it to do other cool stuff. CLI also allows you to pipe in BASEURL via `stdin`.

## Options

```
USAGE
  $ static-sitemap-cli [BASEURL]

ARGUMENTS
  BASEURL  Base URL that is prefixed to all sitemap items.
           For example: https://example.com/

OPTIONS
  -V, --version                show CLI version

  -c, --changefreq=changefreq  `=`-separated glob-changefreq pair [eg:
                               bar/**=daily]

  -h, --help                   show CLI help

  -l, --slash                  add trailing slash to all URLs

  -m, --match=match            [default: **/*.html,!404.html] micromatch globs
                               to match

  -n, --no-clean               disable clean URLs

  -o, --output-dir=output-dir  specify the output dir; used together with
                               --save; defaults to root working directory

  -p, --priority=priority      `=`-separated glob-priority pair [eg: foo/**=0.1]

  -r, --root=root              [default: .] root working directory

  -s, --save                   write both XML and TXT outputs to file directly
                               instead of `stdout`

  -t, --text                   output as text instead of XML

  -v, --verbose                be more verbose

  --follow-noindex             removes pages with noindex meta tag from sitemap
                               (up to 5x slower due to reading and parsing every
                               HTML file)

DESCRIPTION
  CLI to generate XML sitemaps for static sites from local filesystem.

  At its most basic, just run from root of distribution:
  $ sscli https://example.com > sitemap.xml

  CLI by default outputs to 'stdout'; BASEURL can be piped in via 'stdin'.
```

### Clean URLs

Whether or not to include the `.html` extension. By default, something like:

`rootDir/foo/index.html` becomes `https://example.com/foo`.

`rootDir/foo/bar/foobar.html` becomes `https://example.com/foo/bar/foobar`.

Pass `-n` option to disable this behavior.

### Trailing Slashes

Controls whether or not URLs should include trailing slashes. For example:

`rootDir/bar/index.html` becomes `https://example.com/bar/`.

For obvious reasons, this cannot be used together with `-n`.

### Ignore Some Files

The `-m` flag allows multiple entries to be input. By default it's set to the following globs: `**/*.html` and `!404.html`.
You can change the glob pattern matches to suit your use-case, like:

`sscli https://example.com -m '**/*.html' -m '!404.html' -m '!**/ignore/**' -m '!this/other/specific/file.html'`

### Glob-\* Pairs

The `-p` and `-c` flags allow multiple entries and accept `glob-*` pairs as input. A `glob-*` pair is input as
`<glob-pattern>=<value>`, where `=` is used as the separator. For example, a glob-frequency pair should be input as
`events/**/*.html=daily`.

Latter entries will override the former. So for example in

`sscli https://example.com -c '**/*=weekly' -c 'events/**=daily'`

all URL entries will contain `<changefreq>weekly</changefreq>` while pages that match `event/**` will contain
`<changefreq>daily</changefreq>`.

### Output as Text

Sitemaps can be formatted as a simple [text file](https://support.google.com/webmasters/answer/183668?hl=en) as well,
where each line contains exactly one URL. Pass the option `-t` to do so. In this case, `--priority` and `--changefreq`
are redundant and ignored.

## Examples

### Create sitemap for `dist` folder

`static-sitemap-cli https://example.com -r dist > dist/sitemap.xml`

OR

`sscli https://example.com -r dist > dist/sitemap.xml`

### Ignore a bunch of files

`sscli https://example.com -m '**/*.html' '!404.html' '!**/ignore/**' '!this/other/specific/file.html' > sm.xml`

### Set priority of certain pages

By default, the optional `<priority>` label ([protocol reference](https://www.sitemaps.org/protocol.html)) is excluded,
so every pages' default is 0.5. To change the _relative_ priority of certain pages:

`sscli https://example.com -p '**/{foo,bar}/**=0.1' '**/important/**=0.9' > sm.xml`

### Set changefreq of all pages to weekly, and some to daily

`sscli https://example.com -c '**/*=weekly' -c 'events/**=daily' > sm.xml`

### Pipe in the base URL

`echo https://example.com | sscli > sm.xml`

### Save XML and TXT files into a specified location directly

`sscli https://example.com -r 'src' -s -o 'dist'`

## Programmatic Use

`static-sitemap-cli` can also be used as a Node module.

```js
const generateSitemap = require('static-sitemap-cli')

const flags = {
  root: './dist', // required
  match: ['**/*.html', '!404.html'], // required
  slash: false,
  'no-clean': false,
  text: false,
  priority: null,
  changefreq: null,
  save: false,
  'follow-noindex': false,
  verbose: false
}

// Pass in `baseUrl` and `flags`
const sitemap = generateSitemap('https://x.com', flags) // returns XML string

const txt = generateSitemap('https://x.com', { // returns TXT string
  ...flags,
  text: true
})

const maps = generateSitemap('https://x.com', { // returns BOTH XML and TXT as an object
  ...flags,                                     // eg: { xml: '...', txt: '...' }
  save: true
})
```

## Tests

Run `npm run test`.

## Implementation Notes

### To slash or not to slash

First of all, search engines treat trailing slashes the same **only** for **root URLs**.

```
1. https://example.com
2. https://example.com/
3. https://example.com/about
4. https://example.com/about/
```

(1) and (2) are **root URLs** and are treated exactly the same; while (3) and (4) are different and are treated as
2 unique addresses. This can be verified through devtools - where you'll notice there aren't `301 redirects` when
(1) or (2) are entered into the URL address bar.

Internally, browsers _append_ the slash when a root URL is entered, but _hides_ the slash when displayed in the URL
address bar - for vanity purposes.

To synchronise with browser behaviour, this
[commit](https://github.com/zerodevx/static-sitemap-cli/commit/04e6b79abfe26ed55c7dec8287bccfac7400a01f) adds the
trailing slash for **all** root URLs, even if the `--slash` flag is unused.

Is this important? Not really - most of the time; but if you're using [Google AMP](https://amp.dev/), then yes, the
trailing slash on all root URLs is important. Why? Because of how [AMP Cache](https://developers.google.com/amp/cache/)
stores the root URL _always with_ the trailing slash - so you can use your sitemap to perform cache-busting operations.

## License

ISC

## Changelog

Changes are logged in the [Releases](https://github.com/zerodevx/static-sitemap-cli/releases) page.
