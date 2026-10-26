/**
 * Columbina · 月下摇篮 — DeepSeek Harness theme plugin (host half).
 *
 * Responsibilities, and nothing else:
 *   1. serve the theme's own assets (`theme.css`, artwork, opening film, score)
 *      from `/theme-columbina/*`, so they can be edited in place;
 *   2. contribute the index-injection rows — stylesheet, image preload, the
 *      dark-palette hold and a tiny page self-check;
 *   3. proxy the three NetEase lullabies through `/theme-columbina/music/*`.
 *      The audio itself is never stored in the repository: the route resolves
 *      the public play URL at request time from a fixed whitelist of song ids,
 *      forwards the browser's Range header and streams the bytes through. If
 *      the host has no network, the route answers 502 and the player simply
 *      stays silent instead of failing the UI.
 *
 * There is no model-facing surface: no tool, no prompt section, no request.
 */
import { stat, readFile } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Stable Cordis plugin name. */
export const name = 'theme-columbina'

/** The asset route needs the host web server; the plugin stays pending without one. */
export const inject = ['webServer']

/** Route prefix owned by this plugin (no trailing slash: the server matches prefix + "/"). */
const ROUTE = '/theme-columbina'

const PLUGIN_ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')

/**
 * The lullaby deck. Ids are NetEase song ids; the titles are the published
 * track names, used only as labels. Nothing is downloaded at build time.
 */
const TRACKS = [
  {
    id: '2756019215',
    title: '新月的摇篮曲（其一）：伴月同眠',
    subtitle: 'Lullaby of the New Moon · I',
    latin: 'Somnias a Luna',
  },
  {
    id: '2756018754',
    title: '新月的摇篮曲（其二）：献给月亮的笑靥',
    subtitle: 'Lullaby of the New Moon · II',
    latin: 'Lucens ut risus',
  },
  {
    id: '2756018755',
    title: '新月的摇篮曲（其三）：落花成英',
    subtitle: 'Lullaby of the New Moon · III',
    latin: 'Petala ceciderunt',
  },
]
const TRACK_IDS = new Set(TRACKS.map((track) => track.id))

/** Public path → file on disk. An explicit allow-list, so no request can walk out of the package. */
const FILES = new Map([
  ['theme.css', { file: join(PLUGIN_ROOT, 'theme', 'theme.css'), type: 'text/css; charset=utf-8' }],
  ['background.webp', { file: join(PLUGIN_ROOT, 'assets', 'background.webp'), type: 'image/webp' }],
  ['background-1280.webp', { file: join(PLUGIN_ROOT, 'assets', 'background-1280.webp'), type: 'image/webp' }],
  ['opening-art.webp', { file: join(PLUGIN_ROOT, 'assets', 'opening-art.webp'), type: 'image/webp' }],
  ['opening.mp4', { file: join(PLUGIN_ROOT, 'assets', 'opening.mp4'), type: 'video/mp4' }],
  ['opening-score.m4a', { file: join(PLUGIN_ROOT, 'assets', 'opening-score.m4a'), type: 'audio/mp4' }],
  ['opening-score-starfall.m4a', { file: join(PLUGIN_ROOT, 'assets', 'opening-score-starfall.m4a'), type: 'audio/mp4' }],
  ['icon.png', { file: join(PLUGIN_ROOT, 'assets', 'icon.png'), type: 'image/png' }],
])
for (const name of ['moon', 'star', 'feather', 'flower', 'bell', 'cradle', 'note']) {
  FILES.set(`ornament-${name}.png`, {
    file: join(PLUGIN_ROOT, 'assets', `ornament-${name}.png`),
    type: 'image/png',
  })
}

/** Requests served per asset since this host process started. */
const HITS = { 'theme.css': 0, 'background.webp': 0 }
let lastReport = null
let reportCount = 0

/** Page-side probe: report what the theme actually sees, for `/status`. */
const PAGE_REPORT_SCRIPT = `(() => {
  const report = () => {
    const frame = document.querySelector('#root > div:first-child')
    const facts = new URLSearchParams({
      dark: String(document.body.hasAttribute('data-ds-dark-theme')),
      pref: String(document.documentElement.dataset.dsThemeSource || '-'),
      frame: String(frame !== null),
      center: String(document.querySelector('[class*="centerCol"]') !== null),
      sidebar: String(document.querySelector('[class*="sidebarCol"]') !== null),
      applied: String(getComputedStyle(document.body).getPropertyValue('--columbina-theme').trim() || '-'),
      base: String(getComputedStyle(document.body).getPropertyValue('--dsw-alias-bg-base').trim()),
      opening: String(document.getElementById('columbina-opening') !== null),
      bgm: String(document.querySelector('[data-columbina-player]') !== null),
      link: String(document.querySelector('link[href*="/theme-columbina/"]') !== null),
      inner: window.innerWidth + 'x' + window.innerHeight
    })
    fetch('/theme-columbina/report?' + facts.toString(), { cache: 'no-store' }).catch(() => {})
  }
  setTimeout(report, 1400)
})()`

/** Palette hold plus the probe: the body script the index row carries. */
const PAGE_SCRIPT = `(() => {
  const attribute = 'data-ds-dark-theme'
  const hold = () => { if (!document.body.hasAttribute(attribute)) document.body.setAttribute(attribute, '') }
  hold()
  new MutationObserver(hold).observe(document.body, { attributes: true, attributeFilter: [attribute] })
  document.documentElement.style.colorScheme = 'dark'
})()
${PAGE_REPORT_SCRIPT}`

/**
 * Record one page report.
 * @param req - request carrying the facts as query parameters.
 * @param res - response to write.
 */
function serveReport(req, res) {
  const params = new URL(req.url ?? '/', 'http://example.invalid').searchParams
  lastReport = Object.fromEntries(params.entries())
  reportCount += 1
  res.writeHead(204, { 'cache-control': 'no-store' })
  res.end()
}

/**
 * Answer the self-check route.
 * @param res - response to write.
 */
function serveStatus(res) {
  const body = JSON.stringify({
    theme: 'columbina-lullaby',
    route: ROUTE,
    hits: { ...HITS },
    reportCount,
    lastReport,
    music: { tracks: TRACKS.length, ids: [...TRACK_IDS] },
  })
  res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(body)
}

/**
 * Serve one GET/HEAD request for a themed asset.
 * @param pathname - decoded request pathname.
 * @param req - incoming request (read for `if-none-match`).
 * @param res - response to write.
 */
async function serveAsset(pathname, req, res) {
  const key = pathname.slice(ROUTE.length + 1)
  if (key === 'status') {
    serveStatus(res)
    return
  }
  if (key === 'report') {
    serveReport(req, res)
    return
  }
  const entry = FILES.get(key)
  if (entry === undefined) {
    res.writeHead(404, { 'cache-control': 'no-store' })
    res.end()
    return
  }
  if (HITS[key] !== undefined) HITS[key] += 1
  let info
  try {
    info = await stat(entry.file)
  } catch {
    res.writeHead(404, { 'cache-control': 'no-store' })
    res.end()
    return
  }
  const etag = `"${Math.trunc(info.mtimeMs).toString(36)}-${info.size.toString(36)}"`
  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, { etag, 'cache-control': 'no-cache' })
    res.end()
    return
  }
  const body = await readFile(entry.file)
  const size = body.byteLength

  // Range support: Chromium asks for `bytes=0-` before it streams media.
  const range = req.headers.range
  if (typeof range === 'string' && range.startsWith('bytes=')) {
    const [rawStart, rawEnd] = range.slice(6).split('-')
    let start = rawStart === '' ? size - Number(rawEnd) : Number(rawStart)
    let end = rawStart === '' || rawEnd === '' || rawEnd === undefined ? size - 1 : Number(rawEnd)
    if (Number.isFinite(start) && Number.isFinite(end) && start >= 0 && start <= end && start < size) {
      end = Math.min(end, size - 1)
      const chunk = body.subarray(start, end + 1)
      res.writeHead(206, {
        'content-type': entry.type,
        'content-length': String(chunk.byteLength),
        'content-range': `bytes ${start}-${end}/${size}`,
        'accept-ranges': 'bytes',
        'cache-control': 'no-cache',
        etag,
      })
      res.end(req.method === 'HEAD' ? undefined : chunk)
      return
    }
    res.writeHead(416, { 'content-range': `bytes */${size}`, 'cache-control': 'no-cache' })
    res.end()
    return
  }

  res.writeHead(200, {
    'content-type': entry.type,
    'content-length': String(size),
    'accept-ranges': 'bytes',
    'cache-control': 'no-cache',
    etag,
  })
  res.end(req.method === 'HEAD' ? undefined : body)
}

/**
 * Stream one whitelisted lullaby from NetEase through the host.
 *
 * The browser cannot play `music.163.com` URLs directly (the CDN rejects
 * foreign referrers and the endpoints are http), so the host resolves the
 * public play URL and forwards the bytes. Only ids from `TRACK_IDS` are
 * accepted: the route is a player for this deck, not an open proxy.
 *
 * @param req - incoming request (Range and method are forwarded).
 * @param res - response to write.
 * @param id - requested song id.
 */
async function streamMusic(req, res, id) {
  if (!TRACK_IDS.has(id)) {
    res.writeHead(403, { 'cache-control': 'no-store' })
    res.end()
    return
  }
  const headers = {
    'user-agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
    referer: 'https://music.163.com/',
    accept: '*/*',
  }
  if (typeof req.headers.range === 'string') headers.range = req.headers.range

  // Abort only the connection attempt. The signal must be cleared once the
  // headers are in: `AbortSignal.timeout` would otherwise kill the body of a
  // slow stream and the upstream error would surface as an uncaught exception.
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  let upstream
  try {
    upstream = await fetch(`https://music.163.com/song/media/outer/url?id=${id}.mp3`, {
      headers,
      redirect: 'follow',
      signal: controller.signal,
    })
  } catch {
    clearTimeout(timer)
    res.writeHead(502, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
    res.end(JSON.stringify({ error: 'upstream unreachable' }))
    return
  }
  clearTimeout(timer)
  if (!upstream.ok || upstream.body === null) {
    res.writeHead(502, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
    res.end(JSON.stringify({ error: 'upstream refused', status: upstream.status }))
    return
  }

  const type = upstream.headers.get('content-type') ?? 'audio/mpeg'
  if (!type.startsWith('audio/')) {
    // NetEase answers 200 with an HTML error page for tracks that need a login.
    res.writeHead(502, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
    res.end(JSON.stringify({ error: 'not playable without an account' }))
    return
  }
  const length = upstream.headers.get('content-length')
  const contentRange = upstream.headers.get('content-range')
  const status = upstream.status === 206 ? 206 : 200
  const responseHeaders = {
    'content-type': type,
    'accept-ranges': 'bytes',
    'cache-control': 'public, max-age=1800',
  }
  if (length !== null) responseHeaders['content-length'] = length
  if (contentRange !== null) responseHeaders['content-range'] = contentRange
  res.writeHead(status, responseHeaders)
  if (req.method === 'HEAD') {
    res.end()
    return
  }
  const stream = Readable.fromWeb(upstream.body)
  // A paused or seeked <audio> element closes the socket mid-body; that must
  // tear the upstream stream down quietly instead of throwing at the process.
  const destroy = () => {
    try {
      stream.destroy()
    } catch {
      // Already closed.
    }
  }
  res.on('close', destroy)
  res.on('error', destroy)
  stream.on('error', () => {
    try {
      res.destroy()
    } catch {
      // Already closed.
    }
  })
  stream.pipe(res)
}

/**
 * Mount the theme on the running host.
 * @param ctx - plugin context carrying the web server.
 * @param config - `art` (default true), `forceDark` (default true), `music` (default true).
 */
export function apply(ctx, config = {}) {
  const art = config?.art !== false
  const forceDark = config?.forceDark !== false
  const music = config?.music !== false

  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: 'prefix',
        path: ROUTE,
        handler: async (req, res) => {
          if (req.method !== 'GET' && req.method !== 'HEAD') {
            res.writeHead(405, { allow: 'GET, HEAD' })
            res.end()
            return
          }
          const { pathname, searchParams } = new URL(req.url ?? '/', 'http://localhost')
          try {
            if (music && pathname === `${ROUTE}/music/stream`) {
              await streamMusic(req, res, searchParams.get('id') ?? '')
              return
            }
            if (music && pathname === `${ROUTE}/music/deck`) {
              res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
              res.end(JSON.stringify({ tracks: TRACKS, stream: `${ROUTE}/music/stream` }))
              return
            }
            await serveAsset(pathname, req, res)
          } catch {
            // A media stream that dies mid-body must never take the host down.
            try {
              if (!res.headersSent) res.writeHead(500, { 'cache-control': 'no-store' })
              res.end()
            } catch {
              // The socket is already gone.
            }
          }
        },
      }),
    'theme-columbina: asset route',
  )

  ctx.on(
    'webserver/index-inject',
    (table) => {
      table.push({ kind: 'html', placement: 'head', html: `<link rel="stylesheet" href="${ROUTE}/theme.css">` })
      if (art) {
        table.push({
          kind: 'html',
          placement: 'head',
          html: `<link rel="preload" as="image" href="${ROUTE}/background.webp">`,
        })
      }
      if (forceDark) {
        table.push({ kind: 'script', placement: 'body', text: PAGE_SCRIPT })
      } else {
        table.push({ kind: 'script', placement: 'body', text: PAGE_REPORT_SCRIPT })
      }
    },
    { prepend: false },
  )
}
