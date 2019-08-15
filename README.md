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
|----------|----------------------------------------------------------------------------------------|
| BASEURL  | Base URL that is prefixed to all location entries. For example: `https://example.com/` |


### Options

| Option | Long         | Description                                                     |
|--------|--------------|-----------------------------------------------------------------|
| -h     | --help       | show CLI help                                                   |
| -v     | --version    | show CLI version                                                |
| -r     | --root       | [default: current dir] root directory to start from             |
| -m     | --match      | [default: **/*.html,!404.html] list of globs to match           |
| -p     | --priority   | glob-priority pair (eg: foo/*.html=0.1)                         |
| -f     | --changefreq | glob-changefreq pair (eg: foo/*.html=daily)                     |
| -n     | --no-clean   | disable clean URLs                                              |
| -s     | --slash      | add trailing slash to all URLs                                  |
| -t     | --text       | output as .TXT instead                                          |
| -v     | --verbose    | be more verbose                                                 |


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


#### Glob-* Pairs

The `-p` and `-c` flags allow multiple entries and accept `glob-*` pairs as input. A `glob-*` pair is basically
`<glob-pattern>=<value>`, where `=` separates the two. For example, a glob-frequency pair should be input as
`events/**/*.html=daily`.

Entries input later will override the earlier ones. So for example in this,

`sscli https://example.com -f '**/*=weekly' -f 'events/**=daily'`

all page entries will contain `<changefreq>weekly</changefreq>` while pages that match `event/**` will contain
`<changefreq>daily</changefreq>`.


#### Output as Text

Sitemaps can be generated in a simple [text file](https://support.google.com/webmasters/answer/183668?hl=en) format as well,
where each line contains exactly one URL. Pass the option `-t` to do so. In this case, `--priority` and `--changefreq`
are redundant.


## Examples

#### Create sitemap for `dist` folder

`static-sitemap-cli https://example.com -r dist > dist/sitemap.xml`

OR

`sscli https://example.com -r dist > dist/sitemap.xml`


#### Ignore a bunch of files

`sscli https://example.com -m '**/*.html' '!404.html' '!**/ignore/**' '!this/other/specific/file.html' > sm.xml`


#### Set priority of certain pages

By default, the optional `<priority>` label ([protocol reference](https://www.sitemaps.org/protocol.html)) is excluded,
so every pages' default is 0.5. To change the *relative* priority of certain pages:

`sscli https://example.com -p '**/{foo,bar}/**=0.1' '**/important/**=0.9' > sm.xml`


#### Set changefreq of all pages to weekly, and some to daily

`sscli https://example.com -f '**/*=weekly' -f 'events/**=daily' > sm.xml`


#### Pipe in the base URL

`echo https://example.com | sscli > sm.xml`



## To-do

~~Add tests! :sweat_smile:~~


## Tests

Run `npm run test`.


## Changelog

**v1.0.0** - 2019-08-15:
* **BREAKING:** `--ignore` is deprecated. Use `--matches` instead.
* **BREAKING:** Glob-* pairs are no longer comma-seperated. Use `=` instead.
* **BREAKING:** Logic for multiple glob-* pairs changed. Later pairs override the earlier ones now.
* Major refactor of original codebase; discontinued usage of [globby](https://www.npmjs.com/package/globby) and [sitemap](https://www.npmjs.com/package/sitemap) in favour of [fast-glob](https://www.npmjs.com/package/fast-glob), [micromatch](https://www.npmjs.com/package/micromatch), and [js2xmlparser](https://www.npmjs.com/package/js2xmlparser).
* Resulting code should be much easier to reason with and maintain now.
* Add feature to output as text (one URL per line).
* Add verbose mode to see some console feedback.
* And finally, add tests with ~95% coverage.

**v0.2.0** - 2019-07-31:
* Allow BASEURL to be piped in also.
* Refactor some dependencies.

**v0.1.1** - 2019-07-27:
* Bugfix: properly check rootDir before replacing.
* Add new alias `sscli` because the original is quite a mouthful.

**v0.1.0** - 2019-07-26:
* Initial release.
* Built in 10 minutes. :stuck_out_tongue_winking_eye:
