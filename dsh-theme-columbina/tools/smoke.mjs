// Offline smoke test for the Columbina theme host half: no DSH required.
//
//   node tools/smoke.mjs
//
// Exercises the route table, the asset allow-list, ETag revalidation, the
// method guard, the music deck description and the whitelist rejection. The
// streaming path itself needs the network and a live host, so it is not
// covered here (see README "验证").
import { apply, name, inject } from '../lib/index.js'

const routes = []
const injections = new Map()
const disposers = []

const ctx = {
  effect(fn, label) {
    const dispose = fn()
    disposers.push({ label, dispose })
    return dispose
  },
  on(event, handler, options) {
    injections.set(event, { handler, options })
    return () => injections.delete(event)
  },
  webServer: {
    register(route) {
      routes.push(route)
      return () => {
        const at = routes.indexOf(route)
        if (at !== -1) routes.splice(at, 1)
      }
    },
  },
}

apply(ctx, {})

let failures = 0
const check = (label, actual, expected) => {
  const ok = String(actual) === String(expected)
  if (!ok) failures += 1
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label.padEnd(46)} ${actual}${ok ? '' : ` (expected ${expected})`}`)
}

console.log('name     :', name)
console.log('inject   :', inject)
console.log('routes   :', routes.map((r) => `${r.kind} ${r.path}`).join(', '))

const table = []
injections.get('webserver/index-inject').handler(table)
console.log('rows     :', table.map((r) => r.kind).join(', '))

function request(url, method = 'GET', headers = {}) {
  return new Promise((resolve, reject) => {
    const chunks = []
    const res = {
      status: 0,
      headers: {},
      writeHead(status, extra = {}) {
        this.status = status
        this.headers = extra
      },
      end(body) {
        if (body) chunks.push(Buffer.from(body))
        resolve({ status: this.status, headers: this.headers, body: Buffer.concat(chunks) })
      },
      on() {},
      once() {},
      destroy() {},
    }
    Promise.resolve(routes[0].handler({ method, url, headers }, res)).catch(reject)
  })
}

const css = await request('/theme-columbina/theme.css')
check('GET theme.css', css.status, 200)
check('theme.css content-type', css.headers['content-type'].split(';')[0], 'text/css')
check('theme.css declares marker', css.body.toString().includes('--columbina-theme'), true)

const revalidated = await request('/theme-columbina/theme.css', 'GET', { 'if-none-match': css.headers.etag })
check('revalidate (same etag)', revalidated.status, 304)

const bg = await request('/theme-columbina/background.webp')
check('GET background.webp', bg.status, 200)
check('background content-type', bg.headers['content-type'], 'image/webp')

const traversal = await request('/theme-columbina/../package.json')
check('path traversal', traversal.status, 404)
const missing = await request('/theme-columbina/nope.webp')
check('unknown asset', missing.status, 404)
const head = await request('/theme-columbina/background.webp', 'HEAD')
check('HEAD background.webp', head.status, 200)

const post = await request('/theme-columbina/theme.css', 'POST')
check('POST theme.css', post.status, 405)

const deck = await request('/theme-columbina/music/deck')
check('GET music/deck', deck.status, 200)
const parsed = JSON.parse(deck.body.toString())
check('music/deck track count', parsed.tracks.length, 3)
check('music/deck stream route', parsed.stream, '/theme-columbina/music/stream')

const rejected = await request('/theme-columbina/music/stream?id=1')
check('music/stream rejects unknown id', rejected.status, 403)

const status = await request('/theme-columbina/status')
check('GET status', status.status, 200)
check('status theme name', JSON.parse(status.body.toString()).theme, 'columbina-lullaby')

for (const entry of disposers) entry.dispose()
check('routes after dispose', routes.length, 0)

console.log(failures === 0 ? '\nall checks passed' : `\n${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)
