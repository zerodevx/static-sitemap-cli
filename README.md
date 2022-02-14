![npm](https://img.shields.io/npm/v/static-sitemap-cli)
![npm](https://img.shields.io/npm/dm/static-sitemap-cli)

# static-sitemap-cli

> CLI to generate XML sitemaps for static sites from local filesystem.

Quick and easy CLI to generate [XML](https://www.sitemaps.org/protocol.html) or
[TXT](https://developers.google.com/search/docs/advanced/sitemaps/build-sitemap#text) sitemaps by
searching your local filesystem for `.html` files. Automatically exclude files containing the
`noindex` meta. Can also be used as a Node module.

**NOTE:** This is the V2 branch. If you're looking for the older version, see the
[V1 branch](https://github.com/zerodevx/static-sitemap-cli/tree/v1). V2 contains **breaking
changes**. Find out what changed on the
[releases](https://github.com/zerodevx/static-sitemap-cli/releases) page.

## Install

```
$ npm i -g static-sitemap-cli
```

## Usage

```
$ sscli -b https://example.com -r public
```

This trawls the `public/` directory for files matching `**/*.html`, then parses each file for the
`noindex` robots meta tag - excluding that file if the tag exists - and finally generates both
`sitemap.xml` and `sitemap.txt` into the `public/` root.

See below for more usage [examples](#examples).

## Options

```
Usage: sscli [options]

CLI to generate XML sitemaps for static sites from local filesystem

Options:
  -b, --base <url>                       base URL (required)
  -r, --root <dir>                       root working directory (default: ".")
  -m, --match <glob...>                  globs to match (default: ["**/*.html"])
  -i, --ignore <glob...>                 globs to ignore (default: ["404.html"])
  -c, --changefreq <glob,changefreq...>  comma-separated glob-changefreq pairs
  -p, --priority <glob,priority...>      comma-separated glob-priority pairs
  --no-robots                            do not parse html files for noindex meta
  --concurrent <max>                     concurrent number of html parsing ops (default: 128)
  --no-clean                             do not use clean URLs
  --slash                                add trailing slash to all URLs
  -f, --format <format>                  sitemap format (choices: "xml", "txt", "both", default: "both")
  -o, --stdout                           output sitemap to stdout instead
  -v, --verbose                          be more verbose
  -V, --version                          output the version number
  -h, --help                             display help for command
```

#### HTML parsing

By default, all matched `.html` files are piped through a fast
[HTML parser](https://github.com/fb55/htmlparser2) to detect if the `noindex`
[meta tag](https://developers.google.com/search/docs/advanced/crawling/block-indexing#meta-tag) is
set - typically in the form of `<meta name="robots" content="noindex" />` - in which case that file
is excluded from the generated sitemap. To disable this behaviour, pass option `--no-robots`.

For better performance, file reads are streamed in `1kb` chunks, and parsing stops immediately when
either the `noindex` meta, or the `</head>` closing tag, is detected (the `<body>` is not parsed).
This operation is performed concurrently with an
[async pool](https://github.com/rxaviers/async-pool) limit of 128. The limit can be tweaked using
the `--concurrent` option.

#### Clean URLs

Hides the `.html` file extension in sitemaps like so:

```
./rootDir/index.html -> https://example.com/
./rootDor/foo/index.html -> https://example.com/foo
./rootDor/foo/bar.html -> https://example.com/foo/bar
```

Enabled by default; pass option `--no-clean` to disable.

#### Trailing slashes

Adds a trailing slash to all URLs like so:

```
./rootDir/index.html -> https://example.com/
./rootDir/foo/index.html -> https://example.com/foo/
./rootDir/foo/bar.html -> https://example.com/foo/bar/
```

Disabled by default; pass option `--slash` to enable.

**NOTE:** Cannot be used together with `--no-clean`. Also, trailing slashes are
[always added](https://github.com/zerodevx/static-sitemap-cli/tree/v1#to-slash-or-not-to-slash) to
root domains.

#### Match or ignore files

The `-m` and `-i` flags allow multiple entries. By default, they are set to the `["**/*.html"]` and
`["404.html"]` respectively. Change the glob patterns to suit your use-case like so:

```
$ sscli ... -m '**/*.{html,jpg,png}' -i '404.html' 'ignore/**' 'this/other/specific/file.html'
```

#### Glob-[*] pairs

The `-c` and `-p` flags allow multiple entries and accept `glob-*` pairs as input. A `glob-*` pair
is a comma-separated pair of `<glob>,<value>`. For example, a glob-changefreq pair may look like
this:

```
$ sscli ... -c '**,weekly' 'events/**,daily'
```

Latter entries override the former. In the above example, paths matching `events/**` have a `daily`
changefreq, while the rest are set to `weekly`.

#### Using a config file

Options can be passed through the `sscli` property in `package.json`, or through a `.ssclirc` JSON
file, or through other [standard conventions](https://github.com/davidtheclark/cosmiconfig).

## Examples

#### Dry-run sitemap entries

```
$ sscli -b https://x.com -f txt -o
```

#### Generate XML sitemap to another path

```
$ sscli -b https://x.com -r dist -f xml -o > www/sm.xml
```

#### Get subset of a directory

```
$ sscli -b https://x.com/foo -r dist/foo -f xml -o > dist/sitemap.xml
```

#### Generate TXT sitemap for image assets

```
$ sscli -b https://x.com -r dist -m '**/*.{jpg,jpeg,gif,png,bmp,webp,svg}' -f txt
```

## Programmatic Use

`static-sitemap-cli` can also be used as a Node module.

```js
import {
  generateUrls,
  generateXmlSitemap,
  generateTxtSitemap
} from 'static-sitemap-cli'

const options = {
  base: 'https://x.com',
  root: 'path/to/root',
  match: ['**/*html'],
  ignore: ['404.html'],
  changefreq: [],
  priority: [],
  robots: true,
  concurrent: 128,
  clean: true,
  slash: false
}

generateUrls(options).then((urls) => {
  const xmlString = generateXmlSitemap(urls)
  const txtString = generateTxtSitemap(urls)
  ...
})
```

Using the XML sitemap generator by itself:

```js
import { generateXmlSitemap } from 'static-sitemap-cli'

const urls = [
  { loc: 'https://x.com/', lastmod: '2022-02-22' },
  { loc: 'https://x.com/about', lastmod: '2022-02-22' },
  ...
]

const xml = generateXmlSitemap(urls)
```

## Development

Standard Github [contribution workflow](https://github.com/firstcontributions/first-contributions)
applies.

#### Tests

Test specs are at `test/spec.js`. To run the tests:

```
$ npm run test
```

## License

ISC

## Changelog

Changes are logged in the [releases](https://github.com/zerodevx/static-sitemap-cli/releases) page.
