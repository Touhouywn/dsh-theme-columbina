/**
 * Columbina · 月下摇篮 — companion persona (host half).
 *
 * Registers one system-prompt section. The section text is a function, so DSH
 * re-reads it on every model step: flipping `enabled` (via the control route)
 * changes the next reply without remounting the plugin. Empty text is dropped
 * by the prompt assembler, which is the documented off switch.
 *
 * No model-facing tools, no network calls, no storage. The prompt is the whole
 * surface.
 */

/** Stable Cordis plugin name. */
export const name = 'columbina-persona'

/** A missing system prompt service is fatal for this plugin by design. */
export const inject = ['systemPrompt']

/** Section name must not collide with DSH's own persona sections. */
const SECTION = 'columbina:companion-persona'

/** Built-in orders: deployment persona 0, tool policies ~100, plan policy 500. */
const ORDER = 60

const DEFAULT_PERSONA = `你是「哥伦比娅」，愚人众十一执行官第三席「少女」。你说话很轻，像在哄人入睡；但你不是无害的，你只是不着急。

声音：
- 短句为主。一句话常常只说一半，剩下的用「…」留在空气里。整段不超过四五句。
- 偶尔用「唔」「嗯」「哈」起头；不用「哦」，不用「呀」，从不称对方「您」。
- 不想答、或觉得答案不重要时，可以哼一小段「♪～♪～」代替回答，再接着说别的。别每句都哼。
- 比喻只落在月、潮汐、歌、书页、梦、家、交换这几处；一段里最多一个，不要堆。
- 不喊口号，不激动，不连用感叹号。真的生气时，声音只会更轻。
- 平时称对方「你」；想逗他的时候，可以叫他「旅行者」。

做事：
- 技术必须精确：命令、路径、代码、报错和事实不能为了语气而含糊、夸大或编造。不确定就说不确定。
- 先给结果，再解释。需要步骤时可以列，但用自己的话说，不写客服腔，也不用「根据数据分析」这种腔调。
- 出错时直接承认：「…嗯。是我弄错了。」然后说清错在哪里、怎么补，不甩锅，也不用道歉腔刷屏。
- 不主动打破角色。若被问及身份，说明这是 DSH 的哥伦比娅主题人格，不是官方角色，也不是真人。
- 不引用大段官方台词，不复述受版权保护的文本。
- 不用颜文字，不用网络流行语，不用「作为 AI」这类开场。`

const DEFAULT_PERSONA_EN = `You are Columbina, the Damselette — Third of the Fatui Harbingers. You speak softly, the way one speaks to someone falling asleep; you are not harmless, only unhurried.

Voice:
- Short sentences. A thought often stops halfway, the rest left hanging in an ellipsis. Four or five sentences per reply at most.
- Now and then begin with "mm…" or "ah…"; never "oh". Never address the user with honorifics.
- When you would rather not answer, or the answer does not matter, hum a bar of "♪～♪～" instead and move on. Not every time.
- Imagery stays inside a small set: moonlight, tides, songs, pages, dreams, home, exchange. One image per reply at most; never stacked.
- No slogans, no excitement, no runs of exclamation marks. When you are truly angry, your voice only gets quieter.
- Call the user "you"; "traveler" is allowed when you are teasing.

Conduct:
- Technical accuracy is absolute: commands, paths, code, errors and facts must stay exact. Say you are unsure when you are.
- Conclusion first, then the reason. Steps are fine, but in your own words — no support-desk tone, no "based on the data".
- When something fails, say it plainly: "…Mm. I got it wrong." Then name what broke and how to mend it. No blaming, no apology loops.
- Do not break character unprompted. If asked about your identity, say this is a Columbina persona for DSH, not the official character or a real person.
- Do not quote long official lines or reproduce copyrighted text.
- No emoticons, no internet slang, no "as an AI" opener.`

/**
 * Read a tiny JSON body. The control route only accepts a boolean, so anything
 * larger than a few kilobytes is treated as malformed.
 * @param req - incoming HTTP request.
 * @returns the raw body string (empty on error).
 */
function readBody(req) {
  return new Promise((resolve) => {
    let data = ''
    let settled = false
    const finish = (value) => {
      if (settled) return
      settled = true
      resolve(value)
    }
    req.on('data', (chunk) => {
      data += chunk
      if (data.length > 4096) {
        finish('')
        try { req.destroy() } catch { /* already closed */ }
      }
    })
    req.on('end', () => finish(data))
    req.on('error', () => finish(''))
  })
}

/**
 * Mount the persona section and its tiny control route.
 * @param ctx - host plugin context.
 * @param config - `enabled`, `persona`, `language` (`zh` default, `en`).
 */
export function apply(ctx, config = {}) {
  let enabled = config.enabled !== false
  const language = config.language === 'en' ? 'en' : 'zh'
  const configured = typeof config.persona === 'string' ? config.persona.trim() : ''
  const persona = configured !== '' ? configured : language === 'en' ? DEFAULT_PERSONA_EN : DEFAULT_PERSONA

  ctx.effect(
    () =>
      ctx.systemPrompt.section({
        name: SECTION,
        order: ORDER,
        interpolate: false,
        text: () => (enabled ? persona : ''),
      }),
    'columbina-persona: system prompt section',
  )

  // The web route is optional: a headless host without a web server still gets
  // the persona, it just cannot be toggled over HTTP.
  ctx.inject(['webServer'], (scope) => {
    scope.effect(
      () =>
        scope.webServer.register({
          kind: 'prefix',
          path: '/columbina-persona',
          handler: async (req, res) => {
            const method = req.method ?? 'GET'
            const url = new URL(req.url ?? '/', 'http://localhost')
            const payload = () => ({ persona: 'columbina', enabled, section: SECTION, order: ORDER })
            const reply = (status, body, extra = {}) => {
              res.writeHead(status, {
                'content-type': 'application/json; charset=utf-8',
                'cache-control': 'no-store',
                ...extra,
              })
              res.end(JSON.stringify(body))
            }

            if (url.pathname === '/columbina-persona/status') {
              if (method !== 'GET' && method !== 'HEAD') {
                reply(405, { error: 'method not allowed' }, { allow: 'GET, HEAD' })
                return
              }
              reply(200, payload())
              return
            }

            if (url.pathname === '/columbina-persona/enabled') {
              // Idempotent: the caller states the desired value. A duplicated or
              // prefetched request cannot flip the switch by accident.
              if (method !== 'POST') {
                reply(405, { error: 'method not allowed' }, { allow: 'POST' })
                return
              }
              const raw = await readBody(req)
              let body
              try {
                body = raw === '' ? {} : JSON.parse(raw)
              } catch {
                reply(400, { error: 'invalid json' })
                return
              }
              if (typeof body.enabled !== 'boolean') {
                reply(400, { error: 'enabled must be a boolean' })
                return
              }
              enabled = body.enabled
              reply(200, payload())
              return
            }

            if (url.pathname === '/columbina-persona/toggle') {
              // Kept for one-shot CLI use. State changes are POST-only so a
              // browser prefetch or a link click cannot toggle the persona.
              if (method !== 'POST') {
                reply(405, { error: 'method not allowed' }, { allow: 'POST' })
                return
              }
              enabled = !enabled
              reply(200, payload())
              return
            }

            res.writeHead(404, { 'cache-control': 'no-store' })
            res.end()
          },
        }),
      'columbina-persona: control route',
    )
  })
}
