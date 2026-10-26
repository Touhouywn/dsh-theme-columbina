/**
 * Columbina · voice — host half, original-clip edition.
 *
 * The bank is a local catalog of clips cut from the user's full-voice
 * compilation. The main conversation is served by:
 *   1. hand-authored intent templates (C′) — one to three whole clips;
 *   2. character-bigram retrieval (D) — only above a confidence threshold.
 *
 * No SAPI, no GPT-SoVITS, no generated words: every byte served here is an
 * original recording or a splice of original recordings.
 */
import { readFile, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

export const name = 'columbina-voice'

export const inject = ['webServer']

const ROUTE = '/columbina-voice'
const CATALOG_URL = new URL('./assets/catalog.json', import.meta.url)
const TEMPLATES_URL = new URL('./assets/templates.json', import.meta.url)
const ASSET_DIR = new URL('./assets/', import.meta.url)

const DEFAULT_THRESHOLD = 0.32
const DEFAULT_MAX_CLIPS = 3

let bankPromise = null

function readJson(req, limit = 64 * 1024) {
  return new Promise((resolve) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
      if (data.length > limit) req.destroy()
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(data))
      } catch {
        resolve(null)
      }
    })
    req.on('error', () => resolve(null))
  })
}

function normalize(text) {
  return String(text || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^\p{Script=Han}a-zA-Z0-9]+/gu, '')
    .toLowerCase()
}

function bigrams(text) {
  const value = normalize(text)
  if (value.length <= 1) return new Set(value ? [value] : [])
  const set = new Set()
  for (let i = 0; i < value.length - 1; i += 1) set.add(value.slice(i, i + 2))
  return set
}

function similarity(query, target) {
  const a = bigrams(query)
  const b = bigrams(target)
  if (a.size === 0 || b.size === 0) return 0
  let intersection = 0
  for (const gram of a) if (b.has(gram)) intersection += 1
  const dice = (2 * intersection) / (a.size + b.size)
  const cover = intersection / Math.min(a.size, b.size)
  return 0.55 * dice + 0.45 * cover
}

function technical(text) {
  return /```|`[^`]+`|https?:\/\/|[A-Za-z]:\\|\/(?:[\w.-]+\/)+|(?:^|\s)(?:cd|npm|pnpm|git|curl|powershell|python|node|ffmpeg|dsh)\s|\{|\}|=>|function\s|<\w+[^>]*>|文件|路径|命令|代码|报错|终端|目录|配置|缓存|删除|安装|运行|执行|端口|进程/i.test(String(text || ''))
}

function intentOf(sentence) {
  const s = String(sentence || '').trim()
  if (s.length === 0 || s.length > 60) return ''
  if (/^(晚安|再见|拜拜|回头见)/.test(s)) return 'farewell'
  if (/^(你好|早安|早上好|午安|晚上好)/.test(s)) return 'greeting'
  if (/^(谢谢|感谢)/.test(s)) return 'thanks'
  if (/^抱歉|^对不起|^不好意思/.test(s)) return ''
  if (/失败|报错|错误|无法|不能|做不到|出了点问题|糟糕/.test(s)) return 'error'
  if (/^(嗯|好|可以|知道了|我在|听得到|明白|行)/.test(s)) return 'ack'
  if (/别急|慢慢|我在听|不用担心|没事|陪着你/.test(s)) return 'soft'
  if (/月亮|月夜|月光|月色|今晚的月/.test(s)) return 'moon'
  if (/睡|梦/.test(s)) return 'sleep'
  if (/朋友|同伴/.test(s)) return 'friend'
  if (/旅行者/.test(s)) return 'traveler'
  return ''
}

async function loadBank() {
  if (bankPromise) return bankPromise
  bankPromise = (async () => {
    const catalog = JSON.parse(await readFile(CATALOG_URL, 'utf8'))
    const clips = Array.isArray(catalog.clips) ? catalog.clips : []
    const byId = new Map()
    for (const clip of clips) {
      if (clip && typeof clip.id === 'string' && typeof clip.file === 'string') byId.set(clip.id, clip)
    }
    let templates = {}
    try {
      const data = JSON.parse(await readFile(TEMPLATES_URL, 'utf8'))
      templates = data && typeof data.templates === 'object' ? data.templates : {}
    } catch {
      templates = {}
    }
    return { catalog, clips, byId, templates }
  })()
  return bankPromise
}

function publicClip(clip) {
  return {
    id: clip.id,
    text: clip.text,
    duration: clip.duration,
    url: `${ROUTE}/clip/${encodeURIComponent(clip.id)}`,
  }
}

function resolveTemplate(bank, name, maxClips) {
  const ids = bank.templates[name]
  if (!Array.isArray(ids)) return []
  const out = []
  for (const id of ids) {
    const clip = bank.byId.get(String(id))
    if (clip && !out.some((item) => item.id === clip.id)) out.push(publicClip(clip))
    if (out.length >= maxClips) break
  }
  return out
}

function pickRetrieval(bank, sentence, threshold) {
  let best = null
  let bestScore = 0
  for (const clip of bank.clips) {
    if (clip.usable === false) continue
    if (/桑多涅|桑多念|多涅|Sandrone|Marionette/i.test(String(clip.text || '') + ' ' + String(clip.asrText || ''))) continue
    const score = similarity(sentence, clip.asrText || clip.text)
    if (score > bestScore) {
      bestScore = score
      best = clip
    }
  }
  if (best === null || bestScore < threshold) return { clip: null, score: bestScore }
  return { clip: publicClip(best), score: bestScore }
}

function selectFromText(bank, text, threshold, maxClips) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 280)
  if (clean === '') return { mode: 'none', score: 0, clips: [] }

  const sentences = clean
    .split(/[。！？!?；;\n]+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2)
    .slice(0, 4)

  const clips = []
  let mode = 'none'
  let bestScore = 0
  for (const sentence of sentences) {
    const intent = intentOf(sentence)
    let picked = []
    if (intent !== '') {
      picked = resolveTemplate(bank, intent, maxClips - clips.length)
      if (picked.length > 0) mode = 'intent'
    }
    if (picked.length === 0) {
      if (technical(sentence)) continue
      if (/怎么|如何|为什么|什么|哪|谁|多少|吗|呢/.test(sentence)) continue
      const found = pickRetrieval(bank, sentence, threshold)
      bestScore = Math.max(bestScore, found.score)
      if (found.clip !== null) {
        picked = [found.clip]
        if (mode === 'none') mode = 'retrieval'
      }
    }
    for (const clip of picked) {
      if (!clips.some((item) => item.id === clip.id)) clips.push(clip)
      if (clips.length >= maxClips) break
    }
    if (clips.length >= maxClips) break
  }
  return { mode: clips.length > 0 ? mode : 'none', score: Number(bestScore.toFixed(3)), clips }
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(payload))
}

export function apply(ctx, config = {}) {
  const threshold = Number.isFinite(Number(config?.threshold)) ? Number(config.threshold) : DEFAULT_THRESHOLD
  const maxClips = Number.isFinite(Number(config?.maxClips)) ? Math.max(1, Math.min(3, Number(config.maxClips))) : DEFAULT_MAX_CLIPS

  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: ROUTE,
    handler: async (req, res) => {
      const url = new URL(req.url ?? '/', 'http://localhost')
      const bank = await loadBank()

      if (url.pathname === `${ROUTE}/status` && req.method === 'GET') {
        sendJson(res, 200, {
          plugin: 'columbina-voice',
          mode: 'clips',
          clips: bank.clips.length,
          threshold,
          maxClips,
        })
        return
      }

      if (url.pathname === `${ROUTE}/catalog` && req.method === 'GET') {
        sendJson(res, 200, { version: 1, clips: bank.clips.map(publicClip) })
        return
      }

      if (url.pathname === `${ROUTE}/select` && req.method === 'POST') {
        const body = await readJson(req)
        const intent = typeof body?.intent === 'string' ? body.intent.trim() : ''
        if (intent !== '') {
          const clips = resolveTemplate(bank, intent, maxClips)
          sendJson(res, 200, { mode: clips.length ? 'intent' : 'none', score: 1, clips })
          return
        }
        const text = typeof body?.text === 'string' ? body.text : ''
        sendJson(res, 200, selectFromText(bank, text, threshold, maxClips))
        return
      }

      if (url.pathname.startsWith(`${ROUTE}/clip/`) && req.method === 'GET') {
        const id = decodeURIComponent(url.pathname.slice(`${ROUTE}/clip/`.length))
        const clip = bank.byId.get(id)
        if (!clip) {
          sendJson(res, 404, { error: 'unknown clip' })
          return
        }
        const path = fileURLToPath(new URL(clip.file, ASSET_DIR))
        try {
          const info = await stat(path)
          if (!info.isFile()) throw new Error('not a file')
          const data = await readFile(path)
          res.writeHead(200, {
            'content-type': 'audio/ogg',
            'content-length': String(data.length),
            'cache-control': 'public, max-age=31536000, immutable',
          })
          res.end(data)
        } catch {
          sendJson(res, 404, { error: 'clip missing' })
        }
        return
      }

      // The old live-TTS route is intentionally retired: this build is
      // original-clips-only. Keep a clear response for old clients.
      if (url.pathname === `${ROUTE}/speak`) {
        sendJson(res, 410, { error: 'this build only serves original clips' })
        return
      }

      sendJson(res, 404, { error: 'not found' })
    },
  }), 'columbina-voice: clips routes')
}
