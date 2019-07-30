![npm](https://img.shields.io/npm/v/static-sitemap-cli)
![npm](https://img.shields.io/npm/dw/static-sitemap-cli)

# static-sitemap-cli

Simple CLI to pre-generate XML sitemaps for static sites locally.

Built in 10 minutes. :stuck_out_tongue_winking_eye:


## Install

```
npm i -g static-sitemap-cli
```


## Usage

Syntax: `static-sitemap-cli <BASEURL> <options>`

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
| -m     | --match      | [default: **/*.html] list of globs to match                     |
| -i     | --ignore     | [default: 404.html] list of globs to ignore                     |
| -p     | --priority   | comma-separated glob/priority pair; eg: foo/*.html,0.1          |
| -f     | --changefreq | comma-separated glob/changefreq pair; eg: foo/*.html,daily      |
| -n     | --no-clean   | disable clean URLs                                              |
| -s     | --slash      | add trailing slash to all URLs                                  |

#### Clean URLs

Whether or not to include the `.html` extension. By default, something like:

`https://example.com/foo/index.html` becomes `https://example.com/foo`.

Pass `-n` option to disable this behavior.

#### Trailing Slashes

Control whether or not URLs should include trailing slashes. For example:

`https://example.com/bar/index.html` becomes `https://example.com/bar/`.

For obvious reasons, this cannot be used together with `-n`.


## Examples

#### Create sitemap for `dist/` folder

```
static-sitemap-cli https://example.com -r dist/ > dist/sitemap.xml
```

OR

```
sscli https://example.com -r dist/ > dist/sitemap.xml
```

Note: Just put `dist/` for that location, not `dist/.` or `./dist/**`.

#### Ignore a bunch of files

```
sscli https://example.com -i=404.html foo/**/* > sm.xml
```

#### Set priority of certain pages

By default, the optional `<priority>` label ([protocol reference](https://www.sitemaps.org/protocol.html)) is excluded,
so every pages' default is 0.5. To change the *relative* priority (to 0.1) of certain pages:

```
sscli https://example.com -p=**/{foo,bar}/**,0.1 **/important/**,0.9 > sm.xml
```

#### Pipe in the base URL

```
echo https://example.com | sscli > sm.xml
```


## To-do

Add tests! :sweat_smile:


## Changelog

**v0.2.0 - 2019-07-31:**
* Allow BASEURL to be piped in also.
* Refactor some dependencies.

**v0.1.1 - 2019-07-27:**
* Bugfix: properly check rootDir before replacing.
* Add new alias `sscli` because the original is quite a mouthful.

**v0.1.0 - 2019-07-26:**
* Initial release.
* Built in 10 minutes. :stuck_out_tongue_winking_eye:

