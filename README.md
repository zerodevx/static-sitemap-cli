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
`<meta name="robots" content="noindex" />` tag, excluding that file if the tag exists, and finally
generates both `sitemap.xml` and `sitemap.txt` into the `public/` root.

See below for more usage [examples](#examples).

## Options

```
Usage: sscli [options]

CLI to generate XML sitemaps for static sites from local filesystem

Options:
  -b, --base <url>                       base URL (required)
  -r, --root <dir>                       root working directory (default: ".")
  -m, --match <glob...>                  globs to match (default: ["**/*.html","!404.html"])
  -f, --changefreq <glob,changefreq...>  comma-separated glob-changefreq pairs
  -p, --priority <glob,priority...>      comma-separated glob-priority pairs
  -X, --no-exclude                       do not exclude html files containing noindex meta
  --concurrent <max>                     concurrent number of html parsing ops (default: 50)
  --no-clean                             do not use clean URLs
  --slash                                add trailing slash to all URLs
  --format <format>                      sitemap format (choices: "xml", "txt", "both", default: "both")
  --stdout                               output sitemap to stdout instead
  -v, --verbose                          be more verbose
  -V, --version                          output the version number
  -h, --help                             display help for command
```

#### HTML parsing

By default, all matched files are piped through a fast
[HTML parser](https://github.com/fb55/htmlparser2) to detect if the `noindex`
[meta tag](https://developers.google.com/search/docs/advanced/crawling/block-indexing#meta-tag) is
set - in which case that file is excluded from the generated sitemap. To disable this behaviour,
pass option `-X`.

For better performance, file reads are streamed, and parsing stops immediately when `noindex` or the
`</head>` closing tag is detected (the `<body>` is not parsed). The operation is performed
concurrently with an [async pool](https://github.com/rxaviers/async-pool) limit of 50. This limit
can be tweaked using the `--concurrent` option.

#### Clean URLs

Hides the `.html` file extension in sitemaps like so:

```
./rootDir/index.html -> https://example.com/
./rootDir/hello.html -> https://example.com/hello
./rootDor/foo/bar/foobar.html -> https://example.com/foo/bar/foobar
```

Enabled by default; pass option `--no-clean` to disable.

#### Trailing slashes

Adds a trailing slash to all URLs like so:

```
./rootDir/index.html -> https://example.com/
./rootDir/hello.html -> https://example.com/hello/
./rootDir/foo/bar/foobar.html -> https://example.com/foo/bar/foobar/
```

Disabled by default; pass option `--slash` to enable.

**NOTE:** Cannot be used together with `-no-clean`. Trailing slashes are **always** added to root
domains. Find out
[why](https://github.com/zerodevx/static-sitemap-cli/tree/v1#to-slash-or-not-to-slash).

#### Ignore some files

The `-m` flag allows multiple entries. By default, it's set to the following globs:
`["**/*.html", "!404.html"]`. You can change the glob pattern matches to suit your use-case like so:

```
$ sscli ... -m '**/*.html' '!404.html' '!**/ignore/**' '!this/other/specific/file.html'
```

#### Glob-[*] pairs

The `-f` and `-p` flags allow multiple entries and accept `glob-*` pairs as input. A `glob-*` pair
is a comma-separated pair of `<glob>,<value>`. For example, a glob-changefreq pair may look like
this:

```
$ sscli ... -f '**/*,weekly' 'events/**/*,daily'
```

Latter entries override the former. In the above example, paths matching `events/**/*` have a
`daily` changefreq, while the rest are set to `weekly`.

#### Using a config file

Options can be passed through the `sscli` property in `package.json`, or through a `.ssclirc` JSON
file, or through other [standard conventions](https://github.com/davidtheclark/cosmiconfig).

## Examples

#### Dry-run sitemap entries

```
$ sscli -b https://x.com --format txt --stdout
```

#### Generate XML sitemap to another path

```
$ sscli -b https://x.com -r dist --format xml --stdout > www/sm.xml
```

## Programmatic Use

`static-sitemap-cli` can also be used as a Node module.

```js
import { run } from 'static-sitemap-cli'

const options = {
  base: 'https://x.com',
  root: 'path/to/root',
  match: ['**/*.html', '!404.html'],
  changefreq: [],
  priority: [],
  exclude: true,
  concurrent: 50,
  clean: true,
  slash: false,
  format: 'both'
}

run(options).then(() => console.log('done!'))
```

To use the XML sitemap generator programmatically:

```js
import { generateXmlSitemap } from 'static-sitemap-cli'

const urls = [
  { loc: 'https://x.com/', lastmod: '2022-02-22' },
  { loc: 'https://x.com/about', lastmod: '2022-02-22' },
  ...
]

const xml = generateXmlSitemap(urls)
console.log(xml)
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
