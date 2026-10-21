export declare const FREQUENCIES: string[]
export declare const FORMATS: string[]
export declare const URL_STYLES: string[]
export type Options = {
  /**
   * required; validated at runtime
   */
  base?: string
  dist?: string
  match?: string | string[]
  ignore?: string | string[]
  /**
   * xml | txt | both
   */
  format?: string
  /**
   * clean | slash | raw
   */
  urls?: string
  lastmod?: boolean
  robots?: boolean
  stdout?: boolean
  verbose?: boolean
  concurrency?: number | string
  changefreq?: Record<string, string>
  priority?: Record<string, number>
}
export type ResolvedOptions = Required<Omit<Options, 'match' | 'ignore' | 'concurrency'>> & {
  match: string[]
  ignore: string[]
  concurrency: number
}
export type UrlEntry = {
  loc: string
  lastmod?: string
  changefreq?: string
  priority?: string
}
/**
 * @typedef {object} Options
 * @property {string} [base] required; validated at runtime
 * @property {string} [dist]
 * @property {string | string[]} [match]
 * @property {string | string[]} [ignore]
 * @property {string} [format] xml | txt | both
 * @property {string} [urls] clean | slash | raw
 * @property {boolean} [lastmod]
 * @property {boolean} [robots]
 * @property {boolean} [stdout]
 * @property {boolean} [verbose]
 * @property {number | string} [concurrency]
 * @property {Record<string, string>} [changefreq]
 * @property {Record<string, number>} [priority]
 */
/** @typedef {Required<Omit<Options, 'match' | 'ignore' | 'concurrency'>> & { match: string[], ignore: string[], concurrency: number }} ResolvedOptions */
/** @typedef {{ loc: string, lastmod?: string, changefreq?: string, priority?: string }} UrlEntry */
/** @type {Omit<ResolvedOptions, 'base' | 'format'>} */
export declare const DEFAULTS: Omit<ResolvedOptions, 'base' | 'format'>
/** Expected, user-facing errors. Anything else is a bug. */
export declare class SitemapError extends Error {}
export declare const log: (msg?: string) => void
/**
 * Merge with defaults, then validate and normalise. Throws SitemapError.
 * @param {Options} [options]
 * @returns {ResolvedOptions}
 */
export declare function resolveOptions(options?: Options): ResolvedOptions
/** @param {ResolvedOptions} opts @returns {Promise<string[]>} */
export declare function getFiles({
  dist,
  match,
  ignore,
  verbose
}: ResolvedOptions): Promise<string[]>
/** @param {string} path @returns {Promise<boolean>} */
export declare function detectNoindex(path: string): Promise<boolean>
/** @param {string} path @param {ResolvedOptions} opts @returns {Promise<UrlEntry | undefined>} */
export declare function transformUrl(
  path: string,
  opts: ResolvedOptions
): Promise<UrlEntry | undefined>
/** @param {ResolvedOptions} opts @returns {Promise<UrlEntry[]>} */
export declare function generateUrls(opts: ResolvedOptions): Promise<UrlEntry[]>
/** @param {UrlEntry[]} urls @returns {string} */
export declare function generateTxtSitemap(urls: UrlEntry[]): string
/** @param {UrlEntry[]} urls @returns {string} */
export declare function generateXmlSitemap(urls: UrlEntry[]): string
/** @param {Options} options */
export declare function run(options: Options): Promise<void>
