import test from 'ava'
import { execaSync } from 'execa'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const __testdir = path.dirname(fileURLToPath(import.meta.url))
const run = (root, ...args) =>
  execaSync('node', [
    path.join(__testdir, '..', 'src', 'cli.js'),
    '-b',
    'https://x.com',
    '-r',
    path.join(__testdir, ...root.split('/')),
    ...args
  ])

test('basic sitemaps', (t) => {
  run('fixtures')
  const p = path.join(__testdir, 'fixtures', 'sitemap')
  const xml = fs.readFileSync(`${p}.xml`, 'utf-8')
  t.true(xml.includes('<?xml version="1.0" encoding="UTF-8"?>'))
  t.true(xml.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'))
  t.true(xml.includes('<loc>https://x.com/</loc>'))
  t.true(xml.includes('<loc>https://x.com/hello</loc>'))
  t.true(xml.includes('<loc>https://x.com/about</loc>'))
  t.true(xml.includes('<loc>https://x.com/blog</loc>'))
  t.true(xml.includes('<loc>https://x.com/blog/mixed-2</loc>'))
  t.true(xml.includes('<loc>https://x.com/blog/events/event-1</loc>'))
  t.true(xml.includes('<loc>https://x.com/media</loc>'))
  t.is(xml.slice(-1), '\n')
  t.not(xml.slice(-2), '\n\n')
  t.false(xml.includes('.html'))
  t.false(xml.includes('https://x.com/noindex'))
  t.false(xml.includes('404'))
  fs.unlinkSync(`${p}.xml`)

  const txt = fs.readFileSync(`${p}.txt`, 'utf-8')
  t.true(txt.includes('https://x.com/'))
  t.true(txt.includes('https://x.com/hello'))
  t.true(txt.includes('https://x.com/about'))
  t.true(txt.includes('https://x.com/blog'))
  t.true(txt.includes('https://x.com/blog/mixed-2'))
  t.true(txt.includes('https://x.com/blog/events/event-1'))
  t.is(txt.slice(-1), '\n')
  t.not(txt.slice(-2), '\n\n')
  fs.unlinkSync(`${p}.txt`)
})

test('ignore some files', (t) => {
  const { stdout } = run('fixtures', '-o', '-f', 'txt', '-i', 'blog/events/**', 'blog/mixed-1.html')
  t.false(stdout.includes('https://x.com/blog/events'))
  t.false(stdout.includes('https://x.com/blog/mixed-1'))
  t.true(stdout.includes('https://x.com/blog/mixed-2'))
})

test('changefreq works', (t) => {
  const { stdout } = run('fixtures', '-o', '-f', 'xml', '-c', 'about/index.html,daily')
  t.true(stdout.includes('<changefreq>daily</changefreq>'))
})

test('priority works', (t) => {
  const { stdout } = run('fixtures', '-o', '-f', 'xml', '-p', 'blog/**,0', 'blog/news/**,0.9')
  t.true(stdout.includes('<priority>0</priority'))
  t.true(stdout.includes('<priority>0.9</priority'))
})

test('unclean urls', (t) => {
  const { stdout } = run('fixtures', '-o', '-f', 'xml', '--no-clean')
  t.true(stdout.includes('https://x.com/index.html</loc>'))
  t.true(stdout.includes('https://x.com/blog/news/post-2.html</loc>'))
})

test('trailing slash', (t) => {
  const { stdout } = run('fixtures', '-o', '-f', 'xml', '--slash')
  t.true(stdout.includes('https://x.com/</loc>'))
  t.true(stdout.includes('https://x.com/hello/</loc>'))
  t.true(stdout.includes('https://x.com/blog/mixed-1/</loc>'))
})

test('can disable robots check', (t) => {
  const { stdout } = run('fixtures', '-o', '-f', 'xml', '--no-robots')
  t.true(stdout.includes('https://x.com/noindex/not-indexed</loc>'))
  t.true(stdout.includes('https://x.com/noindex/not-indexed-2</loc>'))
})

test('match media assets', (t) => {
  const { stdout } = run('fixtures', '-m', '**/*.{jpg,png}', '-o', '-f', 'txt')
  t.is(stdout, 'https://x.com/media/cats.jpg\nhttps://x.com/media/dogs.png')
})

test('output not malformed if base is non-root', (t) => {
  const run2 = (root, ...args) =>
    execaSync('node', [
      path.join(__testdir, '..', 'src', 'cli.js'),
      '-b',
      'https://x.com/foo',
      '-r',
      path.join(__testdir, ...root.split('/')),
      ...args
    ])
  const { stdout } = run2('fixtures/about', '-o', '-f', 'txt')
  t.is(stdout, 'https://x.com/foo')
  const { stdout: stdout2 } = run2('fixtures/about', '-o', '-f', 'txt', '--slash')
  t.is(stdout2, 'https://x.com/foo/')
})

test('package.json has correct dependencies', (t) => {
  const pkg = JSON.parse(fs.readFileSync(path.join(__testdir, '..', 'package.json'), 'utf-8'))
  const dependencies = Object.keys(pkg.dependencies)
  t.deepEqual(dependencies, [
    'commander',
    'cosmiconfig',
    'fast-glob',
    'htmlparser2',
    'js2xmlparser',
    'micromatch',
    'tiny-async-pool'
  ])
})
