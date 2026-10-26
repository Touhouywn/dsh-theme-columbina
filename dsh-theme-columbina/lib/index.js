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
import { existsSync } from 'node:fs'
import { stat, readFile } from 'node:fs/promises'
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
    slug: 'i',
    file: '01-somnias-a-luna.mp3',
    title: '新月的摇篮曲（其一）：伴月同眠',
    latin: 'Somnias a Luna',
  },
  {
    slug: 'ii',
    file: '02-lucens-ut-risus.mp3',
    title: '新月的摇篮曲（其二）：宵晖下的笑颜',
    latin: 'Lucens ut risus',
  },
  {
    slug: 'iii',
    file: '03-petala-ceciderunt.mp3',
    title: '新月的摇篮曲（其三）：眉间落英',
    latin: 'Petala ceciderunt',
  },
]

/** Where the user's own copies of the deck live. Never in git. */
const LOCAL_DIR = join(PLUGIN_ROOT, 'assets', 'bgm')

/** Public path → file on disk. An explicit allow-list, so no request can walk out of the package. */
const FILES = new Map([
  ['theme.css', { file: join(PLUGIN_ROOT, 'theme', 'theme.css'), type: 'text/css; charset=utf-8' }],
  ['background.webp', { file: join(PLUGIN_ROOT, 'assets', 'background.webp'), type: 'image/webp' }],
  ['background-1280.webp', { file: join(PLUGIN_ROOT, 'assets', 'background-1280.webp'), type: 'image/webp' }],
  ['opening-art.webp', { file: join(PLUGIN_ROOT, 'assets', 'opening-art.webp'), type: 'image/webp' }],
  ['opening.mp4', { file: join(PLUGIN_ROOT, 'assets', 'opening.mp4'), type: 'video/mp4' }],
  ['opening-score.m4a', { file: join(PLUGIN_ROOT, 'assets', 'opening-score.m4a'), type: 'audio/mp4' }],
  ['opening-score-starfall.m4a', { file: join(PLUGIN_ROOT, 'assets', 'opening-score-starfall.m4a'), type: 'audio/mp4' }],
  ['opening-score-cradle.m4a', { file: join(PLUGIN_ROOT, 'assets', 'opening-score-cradle.m4a'), type: 'audio/mp4' }],
  ['icon.png', { file: join(PLUGIN_ROOT, 'assets', 'icon.png'), type: 'image/png' }],
])
for (const ornament of ['moon', 'star', 'feather', 'flower', 'bell', 'cradle', 'note']) {
  FILES.set(`ornament-${ornament}.png`, {
    file: join(PLUGIN_ROOT, 'assets', `ornament-${ornament}.png`),
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
    music: { tracks: TRACKS.length, local: deck().filter((track) => track.local).length },
  })
  res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(body)
}

/**
 * Send one file with ETag and Range support.
 * @param file - absolute path on disk.
 * @param type - response content type.
 * @param req - incoming request (read for `if-none-match` and `range`).
 * @param res - response to write.
 */
async function sendFile(file, type, req, res) {
  let info
  try {
    info = await stat(file)
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
  const body = await readFile(file)
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
        'content-type': type,
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
    'content-type': type,
    'content-length': String(size),
    'accept-ranges': 'bytes',
    'cache-control': 'no-cache',
    etag,
  })
  res.end(req.method === 'HEAD' ? undefined : body)
}

/**
 * Describe the deck: ids, titles and whether a local copy exists.
 * @returns the track list with a `local` flag per entry.
 */
function deck() {
  return TRACKS.map((track) => ({ ...track, local: existsSync(join(LOCAL_DIR, track.file)) }))
}

/**
 * Resolve one deck entry by slug.
 * @param slug - `i` / `ii` / `iii`.
 * @returns the track row, or undefined.
 */
function trackBySlug(slug) {
  return TRACKS.find((track) => track.slug === slug)
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
  await sendFile(entry.file, entry.type, req, res)
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
            if (music && pathname === `${ROUTE}/music/track`) {
              const track = trackBySlug(searchParams.get('slug') ?? '')
              if (track === undefined) {
                res.writeHead(403, { 'cache-control': 'no-store' })
                res.end()
                return
              }
              await sendFile(join(LOCAL_DIR, track.file), 'audio/mpeg', req, res)
              return
            }
            if (music && pathname === `${ROUTE}/music/deck`) {
              res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
              res.end(JSON.stringify({ tracks: deck(), track: `${ROUTE}/music/track` }))
              return
            }
            await serveAsset(pathname, req, res)
          } catch (error) {
            if (process.env.COLUMBINA_DEBUG === '1') console.error(error)
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
