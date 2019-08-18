const {expect, test} = require('@oclif/test');
const cmd = require('../src');
const fs = require('fs');

describe('#index', () => {

  test
    .stdout()
    .do(() => cmd.run(['https://example.com', '--root', 'test/test-site/about']))
    .it('basic sitemap xml', ctx => {
      expect(ctx.stdout).to.contain('<loc>https://example.com</loc>');
      expect(ctx.stdout).to.contain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(ctx.stdout).to.contain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    });

  test
    .stdout()
    .do(() => cmd.run(['https://example.com', '--root', 'test/test-site/about', '--text']))
    .it('output text correctly without double newlines', ctx => {
      expect(ctx.stdout).to.equal('https://example.com\n');
    });

  test
    .stdout()
    .do(() => cmd.run(['https://example.com', '--root', 'test/test-site', '--priority', 'about/index.html=0.1']))
    .it('priority', ctx => {
      expect(ctx.stdout).to.contain('<priority>0.1</priority>');
    });

  test
    .stdout()
    .do(() => cmd.run(['https://example.com', '--root', 'test/test-site', '--changefreq', 'about/index.html=weekly']))
    .it('changefreq', ctx => {
      expect(ctx.stdout).to.contain('<changefreq>weekly</changefreq>');
    });

  test
    .stdout()
    .do(() => cmd.run(['https://example.com', '--root', 'test/test-site']))
    .it('clean urls', ctx => {
      expect(ctx.stdout).to.not.contain('.html');
      expect(ctx.stdout).to.contain('post-1</loc>');
      expect(ctx.stdout).to.contain('https://example.com/blog/events/event-1</loc>');
    });

  test
    .stdout()
    .do(() => cmd.run(['https://example.com', '--root', 'test/test-site', '--no-clean']))
    .it('no clean urls', ctx => {
      expect(ctx.stdout).to.contain('https://example.com/index.html</loc>');
      expect(ctx.stdout).to.contain('https://example.com/blog/news/post-2.html</loc>');
    });

  test
    .stdout()
    .do(() => cmd.run(['https://example.com', '--root', 'test/test-site', '--slash']))
    .it('trailing slash', ctx => {
      expect(ctx.stdout).to.contain('https://example.com/</loc>');
      expect(ctx.stdout).to.contain('https://example.com/blog/mixed-1/</loc>');
    });

  test
    .do(() => cmd.run(['https://example.com', '--root', 'test/test-site/about', '--save']))
    .it('saves to sitemap.xml', () => {
      let out = fs.readFileSync('test/test-site/about/sitemap.xml', 'utf-8');
      expect(out).to.contain('<loc>https://example.com</loc>');
      fs.unlinkSync('test/test-site/about/sitemap.xml');
    });


  /*
  test
    .stdout()
    .do(() => cmd.run([]))
    .it('the test', ctx => {
      expect(ctx.stdout)
    });
  */

});

