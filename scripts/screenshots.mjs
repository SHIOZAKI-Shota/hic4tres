import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const root = fileURLToPath(new URL('..', import.meta.url))
const out = join(root, 'docs', 'images')
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.map': 'application/json' }

const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '')
  try {
    const body = await readFile(join(root, path))
    res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' })
    res.end(body)
  } catch {
    res.writeHead(404)
    res.end()
  }
}).listen(0)
const base = `http://localhost:${server.address().port}/examples/`

const executablePath = process.env.CHROME_PATH
  ?? (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
    : process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      : '/usr/bin/google-chrome')
const browser = await puppeteer.launch({ executablePath, headless: true })
const wait = ms => new Promise(r => setTimeout(r, ms))

async function open(name, width, height) {
  const page = await browser.newPage()
  page.on('pageerror', e => console.error(`[${name}]`, e.message))
  await page.setViewport({ width, height, deviceScaleFactor: 2 })
  await page.goto(base + name, { waitUntil: 'networkidle0' })
  await wait(1500)
  return page
}

async function pressOnCube(page, selector) {
  const p = await page.evaluate(sel => {
    const r = window.__cube.face('front').el.querySelector(sel).getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  }, selector)
  await page.mouse.click(p.x, p.y)
}

for (const renderer of ['webgl', 'webgpu']) {
  const page = await open(`cube.html?still&renderer=${renderer}`, 800, 500)
  await pressOnCube(page, 'button')
  await pressOnCube(page, 'button')
  await pressOnCube(page, 'input')
  await page.keyboard.press('End')
  await page.keyboard.type('!')
  await wait(400)
  const state = await page.evaluate(() => ({
    backend: window.__hic.backend,
    clicks: window.__demo.clicks(),
    input: window.__cube.face('front').el.querySelector('input').value
  }))
  console.log(`cube (${renderer}):`, state)
  await page.evaluate(() => document.activeElement?.blur())
  await wait(300)
  await page.screenshot({ path: join(out, renderer === 'webgl' ? 'cube.png' : 'cube-webgpu.png') })
  await page.close()
}

{
  const page = await open('occlusion.html', 800, 500)
  const points = await page.evaluate(() => window.__points())
  for (const k of ['A', 'B', 'C', 'D']) {
    await page.evaluate(key => window.__begin(key), k)
    await page.mouse.click(points[k].x, points[k].y)
    await wait(150)
    await page.evaluate(() => document.activeElement?.blur())
  }
  const status = await page.evaluate(() => ({ ...window.__status }))
  for (const k of Object.keys(status)) if (!status[k]) status[k] = 'nothing happened'
  await page.evaluate(s => Object.assign(window.__status, s), status)
  await page.evaluate(() => window.__drawMarkers())
  await page.screenshot({ path: join(out, 'occlusion.png') })
  console.log('occlusion:', status)
  await page.close()
}

{
  const page = await open('compare-htmltexture.html', 800, 300)
  await page.screenshot({ path: join(out, 'compare-htmltexture.png') })
  await page.close()
}

{
  const page = await open('pitfalls.html', 900, 230)
  await page.screenshot({ path: join(out, 'pitfalls.png') })
  await page.close()
}

for (const renderer of ['webgl', 'webgpu']) {
  const page = await open(`tres/dist/index.html?renderer=${renderer}`, 800, 500)
  const center = sel => page.$eval(sel, e => {
    const r = e.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  })
  const input = await center('form input')
  await page.mouse.click(input.x, input.y)
  await page.keyboard.type('Tres')
  const button = await center('form button')
  await page.mouse.click(button.x, button.y)
  await wait(500)
  const state = await page.evaluate(() => ({ name: window.__tres.name.value, sent: [...window.__tres.sent.value] }))
  console.log(`tres (${renderer}):`, state)
  if (renderer === 'webgl') await page.screenshot({ path: join(out, 'tres.png') })
  await page.close()
}

await browser.close()
server.close()
console.log('wrote', out)
