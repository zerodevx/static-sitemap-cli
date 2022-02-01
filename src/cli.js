import { program, Option } from 'commander'
import { cosmiconfig } from 'cosmiconfig'
import { promises as fs } from 'fs'

const { version } = JSON.parse(
  await fs.readFile(new URL('../package.json', import.meta.url), 'utf8')
)

const config = (await cosmiconfig('sscli').search()) || { results: {} }

program
  .name('sscli')
  .description('CLI to generate XML sitemaps for static sites from local filesystem')
  .option('-b, --base <url>', 'base URL (required)')
  .option('-r, --root <dir>', 'root working directory', '.')
  .option('-m, --match <glob...>', 'micromatch globs to match', ['**/*.html', '!404.html'])
  .option('-f, --frequency <glob,frequency...>', 'comma-separated glob change-frequency pairs')
  .option('-p, --priority <glob,priority...>', 'comma-separated glob priority pairs')
  .addOption(
    new Option('-x, --exclude <regex...>', 'exclude file if contents matches regex').default(
      [`<meta\\s+name="?'?robots"?'?\\s+content="?'?noindex`],
      'refer to docs'
    )
  )
  .option('-X, --no-exclude', 'do not search within files')
  .option('-v, --verbose', 'be more verbose')
  .option('--slash', 'add trailing slash to all URLs')
  .option('--no-clean', 'disable clean URLs')
  .addOption(
    new Option('--format <format>', 'sitemap format')
      .choices(['xml', 'txt', 'both'])
      .default('both')
  )
  .option('--stdout', 'output sitemap to stdout instead')
  .version(version)
  .parse()

const opts = { ...program.opts(), ...config.results }

// Validate opts
function parseFrequency(val) {
  const frequencies = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never']
}

if (!opts.base) program.error(`error: required option '-b, --base <url>' not specified`)

console.log(opts)
