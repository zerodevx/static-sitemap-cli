/* global describe */

const { expect, test } = require('@oclif/test')
const cmd = require('../src')
const fs = require('fs')

describe('#index', () => {
  test
    .stdout()
    .do(() => cmd.run(['https://example.com', '--root', 'test/test-site']))
    .it('basic sitemap xml', (ctx) => {
      expect(ctx.stdout).to.contain('<loc>https://example.com/</loc>')
      expect(ctx.stdout).to.contain('<loc>https://example.com/about</loc>')
      expect(ctx.stdout).to.contain('<loc>https://example.com/blog</loc>')
      expect(ctx.stdout).to.contain('<loc>https://example.com/blog/mixed-2</loc>')
      expect(ctx.stdout).to.contain('<loc>https://example.com/blog/events/event-1</loc>')
      expect(ctx.stdout).to.contain('<?xml version="1.0" encoding="UTF-8"?>')
      expect(ctx.stdout).to.contain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    })

  test
    .stdout()
    .do(() => cmd.run(['https://example.com', '--root', 'test/test-site/about', '--text']))
    .it('output text correctly without double newlines', (ctx) => {
      expect(ctx.stdout).to.equal('https://example.com/\n')
    })

  test
    .stdout()
    .do(() => cmd.run(['https://example.com', '--root', 'test/test-site', '--match', 'about/*.html', '--text']))
    .it('matches only what was specified', (ctx) => {
      expect(ctx.stdout).to.equal('https://example.com/about\n')
    })

  test
    .stdout()
    .do(() => cmd.run(['https://example.com', '--root', 'test/test-site', '--priority', 'about/index.html=0.1']))
    .it('priority', (ctx) => {
      expect(ctx.stdout).to.contain('<priority>0.1</priority>')
    })

  test
    .stdout()
    .do(() => cmd.run(['https://example.com', '--root', 'test/test-site', '--changefreq', 'about/index.html=weekly']))
    .it('changefreq', (ctx) => {
      expect(ctx.stdout).to.contain('<changefreq>weekly</changefreq>')
    })

  test
    .stdout()
    .do(() => cmd.run(['https://example.com', '--root', 'test/test-site', '-c', 'about/index.html=daily']))
    .it('changefreq', (ctx) => {
      expect(ctx.stdout).to.contain('<changefreq>daily</changefreq>')
    })

  test
    .stdout()
    .do(() => cmd.run(['https://example.com', '--root', 'test/test-site']))
    .it('clean urls', (ctx) => {
      expect(ctx.stdout).to.not.contain('.html')
      expect(ctx.stdout).to.contain('post-1</loc>')
      expect(ctx.stdout).to.contain('https://example.com/blog/events/event-1</loc>')
    })

  test
    .stdout()
    .do(() => cmd.run(['https://example.com', '--root', 'test/test-site', '--no-clean']))
    .it('no clean urls', (ctx) => {
      expect(ctx.stdout).to.contain('https://example.com/index.html</loc>')
      expect(ctx.stdout).to.contain('https://example.com/blog/news/post-2.html</loc>')
    })

  test
    .stdout()
    .do(() => cmd.run(['https://example.com', '--root', 'test/test-site', '--slash']))
    .it('trailing slash', (ctx) => {
      expect(ctx.stdout).to.contain('https://example.com/</loc>')
      expect(ctx.stdout).to.contain('https://example.com/blog/mixed-1/</loc>')
    })

  test
    .do(() => cmd.run(['https://example.com', '--root', 'test/test-site/about', '--save']))
    .it('saves to sitemap.xml and sitemap.txt', () => {
      const xml = fs.readFileSync('test/test-site/about/sitemap.xml', 'utf-8')
      expect(xml).to.contain('<loc>https://example.com/</loc>')
      const txt = fs.readFileSync('test/test-site/about/sitemap.txt', 'utf-8')
      expect(txt).to.contain('https://example.com/\n')
      fs.unlinkSync('test/test-site/about/sitemap.xml')
      fs.unlinkSync('test/test-site/about/sitemap.txt')
    })

  test
    .do(() => cmd.run(['https://example.com', '--root', 'test/test-site/about', '--save', '--output-dir', 'test/test-site']))
    .it('saves to sitemap.txt and output-dir works', () => {
      const txt = fs.readFileSync('test/test-site/sitemap.txt', 'utf-8')
      expect(txt).to.equal('https://example.com/\n')
      fs.unlinkSync('test/test-site/sitemap.xml')
      fs.unlinkSync('test/test-site/sitemap.txt')
    })

  test
    .stdout()
    .do(() => cmd.run(['https://example.com', '--root', 'test/test-site', '--follow-noindex']))
    .it('ignores files with robots noindex meta tag', (ctx) => {
      expect(ctx.stdout).to.not.contain('<loc>https://example.com/noindex/not-indexed</loc>')
      expect(ctx.stdout).to.not.contain('<loc>https://example.com/noindex/not-indexed-2</loc>')
    })

  test
    .stdout()
    .do(() => cmd.run(['https://example.com', '--root', 'test/test-site']))
    .it('does NOT ignore files with robots noindex meta tag when overridden', (ctx) => {
      expect(ctx.stdout).to.not.contain('<loc>https://example.com/noindex/not-indexed/</loc>')
      expect(ctx.stdout).to.not.contain('<loc>https://example.com/noindex/not-indexed-2/</loc>')
    })

  test
    .stdout()
    .do(() => cmd.run(['https://x.com/foo', '--root', 'test/test-site/blog', '--text']))
    .it('does not force add trailing slash if baseUrl is not domain root', (ctx) => {
      expect(ctx.stdout).to.contain('https://x.com/foo\n')
    })

  test
    .stdout()
    .do(() => cmd.run(['https://x.com', '--root', 'test/test-site/blog', '--text']))
    .it('force adds trailing slash if baseUrl is a domain root', (ctx) => {
      expect(ctx.stdout).to.contain('https://x.com/\n')
    })

  /*
  test
    .stdout()
    .do(() => cmd.run([]))
    .it('the test', ctx => {
      expect(ctx.stdout)
    });
  */
})
