![NPM Version](https://img.shields.io/npm/v/static-sitemap-cli)
![NPM Downloads](https://img.shields.io/npm/dm/static-sitemap-cli)

# static-sitemap-cli

> CLI to generate XML sitemaps for static sites from local filesystem.

Quick and easy CLI to generate [XML](https://www.sitemaps.org/protocol.html) or
[TXT](https://developers.google.com/search/docs/advanced/sitemaps/build-sitemap#text) sitemaps by
searching your local filesystem for `.html` files. Automatically ignore files containing the
`noindex` meta. Can also be used as a Node module.

Built on modern Node APIs, with a single runtime dependency
([htmlparser2](https://github.com/fb55/htmlparser2)).

**NOTE:** This is V3, which contains **breaking changes**. Coming from V2? Jump to
[Migrating from V2](#migrating-from-v2).

## Install

Requires Node 22.14 or later.

```
$ npm i -g static-sitemap-cli
```

## Usage

```
$ sscli -b https://example.com -d public
```

This trawls the `public/` directory for files matching `**/*.html`, then parses each file for the
`noindex` robots meta tag - excluding that file if the tag exists - and finally generates both
`sitemap.xml` and `sitemap.txt` into the `public/` directory.

See below for more usage [examples](#examples).

## Options

```
Usage: sscli [options]

Generate sitemaps for static sites from the filesystem.

Options:
  -b, --base <url>      base URL of the site (required)
  -d, --dist <dir>      directory to scan, and where sitemaps
                        are written (default: .)
  -m, --match <glob>    glob to match; repeatable
                        (default: **/*.html)
  -i, --ignore <glob>   glob to ignore; repeatable
                        (default: 404.html)
  -f, --format <fmt>    xml, txt or both (default: both;
                        xml with --stdout)
      --urls <style>    clean, slash or raw (default: clean)
      --no-lastmod      omit lastmod dates
      --no-robots       don't check html for noindex meta
  -o, --stdout          print to stdout instead of files
  -v, --verbose         log progress
  -V, --version         print version
  -h, --help            print this help

Config: package.json "sscli" key or sscli.config.js, read
from the current directory. Flags override config.
```

#### HTML parsing

By default, all matched `.html` files are piped through a fast
[HTML parser](https://github.com/fb55/htmlparser2) to detect if the `noindex`
[meta tag](https://developers.google.com/search/docs/advanced/crawling/block-indexing#meta-tag) is
set - typically in the form of `<meta name="robots" content="noindex" />` - in which case that file
is excluded from the generated sitemap. To disable this behaviour, pass option `--no-robots`.

For better performance, file reads are streamed in `1kb` chunks, and parsing stops immediately when
either the `noindex` meta, or the `</head>` closing tag, is detected (the `<body>` is not parsed).
Up to 32 files are parsed concurrently; change this with the `concurrency` [config](#config-file)
key.

#### URL styles

The `--urls` option controls how file paths become URLs.

`clean` (default) hides the `.html` file extension:

```
./dist/index.html -> https://example.com/
./dist/foo/index.html -> https://example.com/foo
./dist/foo/bar.html -> https://example.com/foo/bar
```

`slash` is like `clean`, but adds a trailing slash to all URLs:

```
./dist/index.html -> https://example.com/
./dist/foo/index.html -> https://example.com/foo/
./dist/foo/bar.html -> https://example.com/foo/bar/
```

`raw` leaves paths untouched:

```
./dist/index.html -> https://example.com/index.html
./dist/foo/index.html -> https://example.com/foo/index.html
./dist/foo/bar.html -> https://example.com/foo/bar.html
```

**NOTE:** For `clean` and `slash`, a trailing slash is
[always added](https://github.com/zerodevx/static-sitemap-cli/tree/v1#to-slash-or-not-to-slash) to
root domains.

#### Match or ignore files

`-m` and `-i` can each be given multiple times. By default they are set to `**/*.html` and
`404.html` respectively; passing either flag replaces its default. Globs are matched relative to
`dist` using Node's native
[`fs.glob`](https://nodejs.org/api/fs.html#fspromisesglobpattern-options).

```
$ sscli -b https://x.com -d dist -m '**/*.{html,jpg,png}' -i '404.html' -i 'drafts/**' -i 'this/specific/file.html'
```

Quote your globs so that your shell doesn't expand them first.

#### Last modified dates

Each entry gets a `lastmod` date taken from the file's modification time. In CI, a fresh checkout
gives every file the same timestamp, which search engines may treat as unreliable. If that's you,
pass `--no-lastmod` to omit the tag.

#### Config file

Options can be set in the `sscli` property of `package.json`, so that a bare `sscli` (for example in
an npm script) does the job:

```json
{
  "sscli": {
    "base": "https://example.com",
    "dist": "public",
    "urls": "slash",
    "ignore": ["404.html", "drafts/**"]
  },
  "scripts": {
    "postbuild": "sscli"
  }
}
```

or in a `sscli.config.js` file that has a default export:

```js
export default {
  base: 'https://example.com',
  dist: 'public',
  changefreq: { '**': 'weekly', 'events/**': 'daily' },
  priority: { '**': 0.5, 'index.html': 1 }
}
```

Both are read from the current working directory only; if both exist, `sscli.config.js` wins. Keys
are the long option names (`base`, `dist`, `match`, `ignore`, `format`, `urls`, `lastmod`, `robots`,
`stdout`, `verbose`), plus the config-only keys below. Command-line flags override the config, one
by one.

Config-only keys:

| Key           | Description                                                                                              |
| ------------- | -------------------------------------------------------------------------------------------------------- |
| `changefreq`  | Object of `glob: frequency`. One of `always`, `hourly`, `daily`, `weekly`, `monthly`, `yearly`, `never`. |
| `priority`    | Object of `glob: number`, where the number is from `0` to `1`.                                           |
| `concurrency` | Number of HTML files parsed at once. Default `32`.                                                       |

For `changefreq` and `priority`, the last matching glob wins. In the config example above, paths
matching `events/**` have a `daily` changefreq, while the rest are `weekly`.

## Examples

#### Dry-run sitemap entries

```
$ sscli -b https://x.com -f txt -o
```

#### Generate XML sitemap to another path

```
$ sscli -b https://x.com -d dist -o > www/sm.xml
```

`--stdout` defaults to the `xml` format. It can't be used with `-f both`.

#### Get subset of a directory

```
$ sscli -b https://x.com/foo -d dist/foo -o > dist/sitemap.xml
```

#### Generate TXT sitemap for image assets

```
$ sscli -b https://x.com -d dist -m '**/*.{jpg,jpeg,gif,png,bmp,webp,svg}' -f txt
```

## Programmatic Use

`static-sitemap-cli` can also be used as a Node module. Options are the same as the
[config](#config-file) keys.

```js
import { run } from 'static-sitemap-cli'

// generate and write sitemap files, like the CLI does
await run({ base: 'https://x.com', dist: 'path/to/dist' })
```

To get the sitemap strings instead, resolve (validate and apply defaults to) the options first:

```js
import {
  resolveOptions,
  generateUrls,
  generateXmlSitemap,
  generateTxtSitemap
} from 'static-sitemap-cli'

const options = resolveOptions({
  base: 'https://x.com',
  dist: 'path/to/dist',
  match: ['**/*.html'],
  ignore: ['404.html'],
  urls: 'clean', // 'clean' | 'slash' | 'raw'
  lastmod: true,
  robots: true,
  changefreq: { '**': 'weekly' },
  priority: { '**': 0.5 },
  concurrency: 32
})

const urls = await generateUrls(options)
const xml = generateXmlSitemap(urls)
const txt = generateTxtSitemap(urls)
```

`resolveOptions` and `run` throw a `SitemapError` for invalid options or when no files match.

Using the XML sitemap generator by itself:

```js
import { generateXmlSitemap } from 'static-sitemap-cli'

const urls = [
  { loc: 'https://x.com/', lastmod: '2022-02-22' },
  { loc: 'https://x.com/about', lastmod: '2022-02-22' }
]

const xml = generateXmlSitemap(urls)
```

## Migrating from V2

V3 requires Node 22.14+, replaces five of six runtime dependencies with native Node APIs, and
reworks the CLI. The output format is unchanged.

#### CLI

`--root` is now `--dist`; `--base` is unchanged:

```diff
- sscli -b https://example.com -r public
+ sscli -b https://example.com -d public
```

| V2                                                | V3                                            |
| ------------------------------------------------- | --------------------------------------------- |
| `-r, --root <dir>`                                | `-d, --dist <dir>`                            |
| `--no-clean`                                      | `--urls raw`                                  |
| `--slash`                                         | `--urls slash`                                |
| `-c, --changefreq <glob,freq...>`                 | `changefreq` object in [config](#config-file) |
| `-p, --priority <glob,priority...>`               | `priority` object in [config](#config-file)   |
| `--concurrent <max>`                              | `concurrency` in [config](#config-file)       |
| `--debug`                                         | removed                                       |
| `-b`, `-m`, `-i`, `--no-robots`, `-f`, `-o`, `-v` | unchanged                                     |
| _(new)_                                           | `--no-lastmod`                                |

Behaviour changes:

- **Repeat flags instead of listing values.** `-m a b c` becomes `-m a -m b -m c`.
- **`--stdout` prints a single format.** It now defaults to `xml`, where before it printed both
  sitemaps one after the other. `--stdout -f both` is an error.
- **Flags override config.** In V2 the config file overrode flags.
- **Config files.** Only `package.json#sscli` and `sscli.config.js` in the current directory are
  read. `.ssclirc`, YAML, other cosmiconfig formats, and searching parent directories are no longer
  supported.
- **Glob pairs.** `-c '**,weekly' 'events/**,daily'` becomes config:

  ```js
  export default {
    changefreq: { '**': 'weekly', 'events/**': 'daily' }
  }
  ```

  Order still matters, and the last match wins. Since globs no longer share a comma-separated
  string, globs containing commas (such as `{a,b}`) now work.

- **Globbing uses Node's native engine** instead of `fast-glob` and `micromatch`. Typical patterns
  behave the same, but check edge cases such as dotfiles, symlinks and extglobs.

#### Programmatic use

- Options are renamed: `root` → `dist`, `concurrent` → `concurrency`, and `clean` and `slash` →
  `urls`.
- `changefreq` and `priority` are objects (`{ glob: value }`) instead of arrays of `'glob,value'`
  strings.
- `generateUrls` expects options that have gone through `resolveOptions` (or call `run`, which does
  it for you).
- `getFiles` returns paths as strings, and `transformUrl` takes a path string.
- Expected failures throw `SitemapError`. V2 threw `Error('NO_MATCHES')`.

#### Dependencies

`commander`, `cosmiconfig`, `fast-glob`, `js2xmlparser`, `micromatch` and `tiny-async-pool` are
gone. Only `htmlparser2` remains.

#### Fixes

- A `<meta name="robots">` tag without a `content` attribute no longer crashes.
- A `noindex` meta inside `<body>` is no longer picked up.
- A read error on a file now rejects instead of hanging.

## Development

Standard Github [contribution workflow](https://github.com/firstcontributions/first-contributions)
applies.

#### Tests

Tests use Node's built-in test runner. To run lint and tests:

```
$ npm test
```

## License

ISC
