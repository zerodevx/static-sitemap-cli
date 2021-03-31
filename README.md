![npm](https://img.shields.io/npm/v/static-sitemap-cli)
![npm](https://img.shields.io/npm/dm/static-sitemap-cli)

# static-sitemap-cli

Simple CLI to pre-generate XML sitemaps for static sites locally.

Built in 10 minutes. :stuck_out_tongue_winking_eye:

## Install

```
npm i -g static-sitemap-cli
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

Where `sscli` is just an alias of `static-sitemap-cli`. CLI by default outputs to `stdout` -
so that you can pipe it to do other cool stuff. CLI also allows you to pipe in BASEURL via `stdin`.

### Arguments

| Argument | Description                                                                            |
| -------- | -------------------------------------------------------------------------------------- |
| BASEURL  | Base URL that is prefixed to all location entries. For example: `https://example.com/` |

### Options

| Option  | Long             | Description                                                                                                       |
| ------- | ---------------- | ----------------------------------------------------------------------------------------------------------------- |
| -h      | --help           | show CLI help                                                                                                     |
| -V      | --version        | show CLI version                                                                                                  |
| -r      | --root           | [default: current dir] root directory to start from                                                               |
| -m      | --match          | [default: **/*.html,!404.html] list of globs to match                                                             |
| -p      | --priority       | glob-priority pair (eg: foo/\*.html=0.1)                                                                          |
| -c      | --changefreq     | glob-changefreq pair (eg: foo/\*.html=daily)                                                                      |
| -n      | --no-clean       | disable clean URLs                                                                                                |
| -l      | --slash          | add trailing slash to all URLs                                                                                    |
| -t      | --text           | output as .TXT instead                                                                                            |
| -s      | --save           | save output to XML and TXT files directly                                                                         |
| -o      | --output-dir     | specify the output dir; used together with --save; defaults to root working directory                             |
| -v      | --verbose        | be more verbose                                                                                                   |
| **N/A** | --follow-noindex | removes pages with noindex meta tag from sitemap **(up to 5x slower due to reading and parsing every HTML file)** |

#### Clean URLs

Whether or not to include the `.html` extension. By default, something like:

`rootDir/foo/index.html` becomes `https://example.com/foo`.

`rootDir/foo/bar/foobar.html` becomes `https://example.com/foo/bar/foobar`.

Pass `-n` option to disable this behavior.

#### Trailing Slashes

Controls whether or not URLs should include trailing slashes. For example:

`rootDir/bar/index.html` becomes `https://example.com/bar/`.

For obvious reasons, this cannot be used together with `-n`.

#### Ignore Some Files

The `-m` flag allows multiple entries to be input. By default it's set to the following globs: `**/*.html` and `!404.html`.
You can change the glob pattern matches to suit your use-case, like:

`sscli https://example.com -m '**/*.html' -m '!404.html' -m '!**/ignore/**' -m '!this/other/specific/file.html'`

#### Glob-\* Pairs

The `-p` and `-c` flags allow multiple entries and accept `glob-*` pairs as input. A `glob-*` pair is input as
`<glob-pattern>=<value>`, where `=` is used as the separator. For example, a glob-frequency pair should be input as
`events/**/*.html=daily`.

Latter entries will override the former. So for example in

`sscli https://example.com -c '**/*=weekly' -c 'events/**=daily'`

all URL entries will contain `<changefreq>weekly</changefreq>` while pages that match `event/**` will contain
`<changefreq>daily</changefreq>`.

#### Output as Text

Sitemaps can be formatted as a simple [text file](https://support.google.com/webmasters/answer/183668?hl=en) as well,
where each line contains exactly one URL. Pass the option `-t` to do so. In this case, `--priority` and `--changefreq`
are redundant and ignored.

## Examples

#### Create sitemap for `dist` folder

`static-sitemap-cli https://example.com -r dist > dist/sitemap.xml`

OR

`sscli https://example.com -r dist > dist/sitemap.xml`

#### Ignore a bunch of files

`sscli https://example.com -m '**/*.html' '!404.html' '!**/ignore/**' '!this/other/specific/file.html' > sm.xml`

#### Set priority of certain pages

By default, the optional `<priority>` label ([protocol reference](https://www.sitemaps.org/protocol.html)) is excluded,
so every pages' default is 0.5. To change the _relative_ priority of certain pages:

`sscli https://example.com -p '**/{foo,bar}/**=0.1' '**/important/**=0.9' > sm.xml`

#### Set changefreq of all pages to weekly, and some to daily

`sscli https://example.com -c '**/*=weekly' -c 'events/**=daily' > sm.xml`

#### Pipe in the base URL

`echo https://example.com | sscli > sm.xml`

#### Save XML and TXT files into a specified location directly

`sscli https://example.com -r 'src' -s -o 'dist'`

## To-do

~~Add tests! :sweat_smile:~~

## Tests

Run `npm run test`.

## Implementation Notes

#### To slash or not to slash

First of all, search engines treat trailing slashes the same **only** for **root URLs**.

```
1. https://example.com
2. https://example.com/
3. https://example.com/about
4. https://example.com/about/
```

(1) and (2) are **root URLs** and are treated exactly the same; while (3) and (4) are different and are treated as 2 unique addresses. This can be verified through devtools - where you'll notice there aren't `301 redirects` when (1) or (2) are entered into the URL address bar.

Internally, browsers _append_ the slash when a root URL is entered, but _hides_ the slash when displayed in the URL address bar - for vanity purposes.

To synchronise with browser behaviour, this [commit](https://github.com/zerodevx/static-sitemap-cli/commit/04e6b79abfe26ed55c7dec8287bccfac7400a01f) adds the trailing slash for **all** root URLs, even if the `--slash` flag is unused.

Is this important? Not really - most of the time; but if you're using [Google AMP](https://amp.dev/), then yes, the trailing slash on all root URLs is important. Why? Because of how [AMP Cache](https://developers.google.com/amp/cache/) stores the root URL _always with_ the trailing slash - so you can use your sitemap to perform cache-busting operations.

## License

ISC

## Changelog

**v1.4.2** - 2021-03-31:

- Update dependencies.

**v1.4.1** - 2020-09-30:

- Update dependencies.

**v1.4.0** - 2020-07-09:

- Add `noindex` meta tag detection feature per [#9](https://github.com/zerodevx/static-sitemap-cli/issues/9). (Thanks [@davwheat](https://github.com/davwheat)!)

**v1.3.3** - 2020-07-07:

- Update dependencies.

**v1.3.2** - 2020-02-22:

- Update the changelog.
- Update dependencies.

**v1.3.1** - 2020-02-22:

- Fixes [#7](https://github.com/zerodevx/static-sitemap-cli/pull/7) typo in README re `--changefreq` alias. (Thanks [@joshtaylor](https://github.com/joshtaylor)!)

**v1.3.0** - 2020-01-10:

- `--save` now outputs BOTH sitemap.xml and sitemap.txt formats.
- Update dependencies.

**v1.2.0** - 2019-09-26:

- Always add trailing slash to root urls. (ref: [implementation notes](#to-slash-or-not-to-slash))

**v1.1.0** - 2019-08-18:

- **BREAKING**: Trailing slash alias `-s` renamed to `-l`. Sorry. :cry:
- Add feature save directly to file `<rootDir>/sitemap.xml` instead of `stdout`.

**v1.0.1** - 2019-08-16:

- Bugfix - empty line at EOF in text mode.

**v1.0.0** - 2019-08-15:

- **BREAKING:** `--ignore` is deprecated. Use `--match` instead.
- **BREAKING:** Glob-\* pairs are no longer comma-seperated. Use `=` instead.
- **BREAKING:** Logic for multiple glob-\* pairs changed. Later pairs override the earlier ones now.
- Major refactor of original codebase; discontinued usage of [globby](https://www.npmjs.com/package/globby) and [sitemap](https://www.npmjs.com/package/sitemap) in favour of [fast-glob](https://www.npmjs.com/package/fast-glob), [micromatch](https://www.npmjs.com/package/micromatch), and [js2xmlparser](https://www.npmjs.com/package/js2xmlparser).
- Resulting code should be much easier to reason with and maintain now.
- Add feature to output as text (one URL per line).
- Add verbose mode to see some console feedback.
- And finally, add tests with ~95% coverage.

**v0.2.0** - 2019-07-31:

- Allow BASEURL to be piped in also.
- Refactor some dependencies.

**v0.1.1** - 2019-07-27:

- Bugfix: properly check rootDir before replacing.
- Add new alias `sscli` because the original is quite a mouthful.

**v0.1.0** - 2019-07-26:

- Initial release.
- Built in 10 minutes. :stuck_out_tongue_winking_eye:
