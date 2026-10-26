/**
 * Columbina · 月下摇篮 — DeepSeek Harness theme plugin (browser half).
 *
 * Hand-written bundle in the client-modules format: executing this file only
 * *registers* a factory; the body runs when the kernel materialises the module
 * and mounts it as a Cordis plugin in the page.
 *
 * The desktop shell serves the page from `dsh-app://app/` and applies the
 * Host's index-injection rows from a snapshot taken at startup, so styling from
 * the Host alone would arrive too late (or not at all). A client half is
 * delivered through the live module graph instead and works in both carriers.
 *
 * Three things live here:
 *   1. the stylesheet link and the dark-palette hold;
 *   2. the cinematic opening (video + HUD + score), played once per session;
 *   3. the lullaby deck: a persistent <audio> element plus a floating player,
 *      streaming the three tracks through the Host's `/music` route.
 *
 * Every visual property of the opening and the player is inline: the client
 * kernel recycles plugin <style> tags, so a stylesheet-based overlay can lose
 * its layout mid-animation.
 */
window.__ModuleLoader__.load({
  id: 'dsh-theme-columbina',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports

    /** Same asset URL the host half serves and the index row points at. */
    var CSS_URL = '/theme-columbina/theme.css'
    var DARK_ATTRIBUTE = 'data-ds-dark-theme'
    var OPENING_ID = 'columbina-opening'
    var PLAYER_ATTR = 'data-columbina-player'
    var STORE_KEY = 'columbina-bgm-v1'
    var OPENING_SEEN = 'columbina-opening-v1'
    var OPENING_SCORE_KEY = 'columbina-opening-score'

    /**
     * Attach the theme stylesheet.
     *
     * The link is always version-stamped: the desktop shell proxies host
     * responses through its custom protocol and drops the cache headers, so a
     * plain URL would be served from cache forever and CSS edits would never
     * reach the window.
     */
    function ensureStylesheet() {
      var stale = document.querySelectorAll('link[href*="' + CSS_URL + '"]')
      for (var index = 0; index < stale.length; index += 1) stale[index].remove()
      var link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = CSS_URL + '?v=' + String(Date.now())
      link.setAttribute('data-columbina-style', '')
      document.head.appendChild(link)
      return function () {
        link.remove()
      }
    }

    /** Hold the dark palette attribute the theme's CSS is scoped to. */
    function holdDarkPalette() {
      var body = document.body
      if (body === null) return function () {}
      var hold = function () {
        if (!body.hasAttribute(DARK_ATTRIBUTE)) body.setAttribute(DARK_ATTRIBUTE, '')
      }
      hold()
      var observer = new MutationObserver(hold)
      observer.observe(body, { attributes: true, attributeFilter: [DARK_ATTRIBUTE] })
      var previousScheme = document.documentElement.style.colorScheme
      document.documentElement.style.colorScheme = 'dark'
      return function () {
        observer.disconnect()
        document.documentElement.style.colorScheme = previousScheme
      }
    }

    /** Report what the theme sees in the document, for `/theme-columbina/status`. */
    function reportFacts() {
      try {
        var facts = new URLSearchParams({
          from: 'client',
          dark: String(document.body.hasAttribute(DARK_ATTRIBUTE)),
          pref: String(document.documentElement.dataset.dsThemeSource || '-'),
          frame: String(document.querySelector('#root > div:first-child') !== null),
          center: String(document.querySelector('[class*="centerCol"]') !== null),
          sidebar: String(document.querySelector('[class*="sidebarCol"]') !== null),
          applied: String(getComputedStyle(document.body).getPropertyValue('--columbina-theme').trim() || '-'),
          base: String(getComputedStyle(document.body).getPropertyValue('--dsw-alias-bg-base').trim()),
          opening: String(document.getElementById(OPENING_ID) !== null),
          player: String(document.querySelector('[' + PLAYER_ATTR + ']') !== null),
          link: String(document.querySelector('link[href*="theme.css"]') !== null),
          inner: window.innerWidth + 'x' + window.innerHeight,
        })
        fetch('/theme-columbina/report?' + facts.toString(), { cache: 'no-store' }).catch(function () {})
      } catch (error) {
        // A failed self-check must never break the page.
      }
    }

    /* ==================================================================
       Cinematic opening — 月下摇篮
       The reference film opens on black, lets the artwork surface under a
       telemetry HUD, then lands on a hard impact and the wordmark. DSH has
       no startup hook, so the same sequence runs as a one-shot overlay above
       the already-booted UI.
       ================================================================== */
    var OPENING_ART = '/theme-columbina/opening-art.webp'
    var OPENING_VIDEO = '/theme-columbina/opening.mp4'
    var SCORES = {
      'moon-cocoon': '/theme-columbina/opening-score.m4a',
      starfall: '/theme-columbina/opening-score-starfall.m4a',
    }

    /** Read the preferred opening score; defaults to the music-box lullaby. */
    function preferredScore() {
      try {
        var stored = window.localStorage.getItem(OPENING_SCORE_KEY)
        if (stored !== null && SCORES[stored] !== undefined) return SCORES[stored]
      } catch (error) {
        // Storage unavailable: use the default.
      }
      return SCORES['moon-cocoon']
    }

    /**
     * Run `callback` once the window is really on screen and painting.
     *
     * The shell builds the page before it shows the window; starting on DOM
     * readiness played the whole sequence while the window was hidden, so the
     * first thing anyone saw was its last frame. The signal used here is real
     * compositing (rAF only ticks for a visible document) plus focus.
     * @param callback - receives control when the window is on screen.
     * @param maxWait - longest wait in milliseconds before proceeding anyway.
     */
    function whenWindowShown(callback, maxWait) {
      var started = false
      var cap = null
      var fire = function () {
        if (started) return
        started = true
        if (cap !== null) clearTimeout(cap)
        callback()
      }
      cap = setTimeout(fire, typeof maxWait === 'number' ? maxWait : 12000)

      var frames = 0
      var frameStep = function () {
        if (started) return
        frames += 1
        var shell = document.querySelector('[data-shell-bottom]')
        if (shell === null) shell = document.querySelector('[class*="frame"]')
        if (frames >= 3 && shell !== null) {
          fire()
          return
        }
        if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(frameStep)
        else setTimeout(frameStep, 60)
      }

      var focusStep = function () {
        if (started) return
        if (document.hasFocus() && document.visibilityState === 'visible') {
          if (typeof window.requestAnimationFrame === 'function') {
            window.requestAnimationFrame(function () {
              window.requestAnimationFrame(fire)
            })
          } else {
            setTimeout(fire, 60)
          }
          return
        }
        setTimeout(focusStep, 120)
      }

      if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(frameStep)
      focusStep()
    }

    /**
     * Play the opening once per page session.
     *
     * ~16 s: black → video surfaces under telemetry → impact at 9.15 s →
     * wordmark and tagline → fade out. Skippable at any moment (click or any
     * key) with a hard safety net, and never started before the window paints.
     */
    function playOpening() {
      if (document.getElementById(OPENING_ID) !== null) return
      var forced = false
      try {
        forced = window.location.hash.indexOf('opening') !== -1
        if (!forced) {
          if (window.sessionStorage.getItem(OPENING_SEEN) === '1') return
          window.sessionStorage.setItem(OPENING_SEEN, '1')
        }
      } catch (error) {
        // Storage unavailable: play it once per load.
      }

      var reduce = false
      try {
        reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      } catch (error) {
        reduce = false
      }

      var root = document.createElement('div')
      root.id = OPENING_ID
      root.style.cssText =
        'position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:2147483000;overflow:hidden;background:#04070f;' +
        'opacity:1;transition:opacity .9s ease-out,transform .9s ease-out;' +
        'font-family:var(--dsw-font-family,"Segoe UI",sans-serif);color:#e9eeff;user-select:none'
      root.innerHTML = [
        '<img class="co-plate" alt="" decoding="async">',
        '<video class="co-film" muted playsinline preload="auto"></video>',
        '<div class="co-veil"></div>',
        '<div class="co-veil-b"></div>',
        '<div class="co-grain"></div>',
        '<svg class="co-ring" viewBox="0 0 400 400" aria-hidden="true">',
        '<circle cx="200" cy="200" r="188" fill="none" stroke="rgba(203,182,238,.20)" stroke-width="1" stroke-dasharray="1 8"/>',
        '<circle cx="200" cy="200" r="158" fill="none" stroke="rgba(159,216,245,.28)" stroke-width="1" stroke-dasharray="92 200"/>',
        '<circle cx="200" cy="200" r="120" fill="none" stroke="rgba(233,238,255,.14)" stroke-width="1"/>',
        '</svg>',
        '<div class="co-num">Ⅲ</div>',
        '<div class="co-brand"><b>COLUMBINA</b><i>THE DAMSELLETTE · SEAT III</i></div>',
        '<div class="co-clock"><b>00:00</b><i>ELAPSED</i></div>',
        '<div class="co-log">',
        '<div class="co-logline"><span>›</span> 月相校准 · 霜月</div>',
        '<div class="co-logline"><span>›</span> 载入摇篮曲 · 三章</div>',
        '<div class="co-logline"><span>›</span> 月影折射 · 第七幕</div>',
        '<div class="co-logline"><span>›</span> 权限确认 · 第三席</div>',
        '</div>',
        '<div class="co-center">',
        '<div class="co-kicker">LULLABY PROTOCOL</div>',
        '<div class="co-headline">摇篮曲起</div>',
        '<div class="co-sub">A SONG BEFORE SLEEP</div>',
        '</div>',
        '<div class="co-progress"><div class="co-progress-fill"></div></div>',
        '<div class="co-pct">000</div>',
        '<div class="co-diag">MOONLIGHT LATTICE · NOD-KRAI · SEAT III</div>',
        '<div class="co-credit">SCORE · ORIGINAL · MIT</div>',
        '<div class="co-sign">',
        '<div class="co-wordmark">COLUMBINA</div>',
        '<div class="co-tagline">月光作幕，歌声为枕</div>',
        '<div class="co-subtitle">MOONLIT CRADLE</div>',
        '</div>',
        '<div class="co-flash"></div>',
        '<div class="co-sound">♪ 点击启用声音</div>',
        '<div class="co-skip">点击 / 任意键 跳过</div>',
        '<audio class="co-score" preload="auto"></audio>',
        '<div class="co-c co-c-tl"></div>',
        '<div class="co-c co-c-tr"></div>',
        '<div class="co-c co-c-bl"></div>',
        '<div class="co-c co-c-br"></div>',
      ].join('')
      document.documentElement.appendChild(root)
      if (root.getBoundingClientRect().width < window.innerWidth * 0.9) document.body.appendChild(root)

      var css = function (selector, text) {
        var node = root.querySelector(selector)
        if (node !== null) node.style.cssText = text
        return node
      }

      var plate = css(
        '.co-plate',
        'position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;object-position:62% 42%;' +
          'opacity:0;transform:scale(1.08);filter:brightness(.7) saturate(.95);' +
          'transition:opacity 1.8s ease-out,transform 20s cubic-bezier(.16,.42,.2,1),filter 1.6s ease-out',
      )
      var film = css(
        '.co-film',
        'position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;object-position:62% 42%;' +
          'opacity:0;filter:brightness(.72) saturate(.92) hue-rotate(-4deg);transition:opacity 2.2s ease-out,filter 1.4s ease-out',
      )
      var veil = css(
        '.co-veil',
        'position:absolute;inset:0;background:radial-gradient(120% 90% at 62% 44%,rgba(4,7,15,.05) 0%,rgba(4,7,15,.55) 52%,#04070f 100%),' +
          'linear-gradient(180deg,rgba(3,6,13,.92) 0%,rgba(3,6,13,.28) 38%,rgba(3,6,13,.9) 100%);' +
          'transition:opacity 1.4s ease-out',
      )
      var veilB = css(
        '.co-veil-b',
        'position:absolute;inset:0;opacity:0;background:radial-gradient(64% 54% at 62% 42%,rgba(140,190,240,.16) 0%,rgba(4,7,15,0) 62%),' +
          'linear-gradient(180deg,rgba(4,7,15,.42) 0%,rgba(4,7,15,.02) 42%,rgba(4,7,15,.86) 100%);transition:opacity 1.4s ease-out',
      )
      css(
        '.co-grain',
        'position:absolute;inset:0;pointer-events:none;opacity:.38;mix-blend-mode:overlay;' +
          'background:repeating-linear-gradient(0deg,rgba(255,255,255,.03) 0px,rgba(255,255,255,.03) 1px,transparent 1px,transparent 3px)',
      )
      var ring = css(
        '.co-ring',
        'position:absolute;left:50%;top:44%;width:min(64vh,560px);height:min(64vh,560px);' +
          'transform:translate(-50%,-50%) scale(1.3);opacity:0;transition:opacity 1.8s ease-out,transform 16s cubic-bezier(.16,.42,.2,1)',
      )
      css(
        '.co-num',
        'position:absolute;right:-1vw;top:46%;transform:translateY(-50%);font-size:32vh;line-height:.8;font-weight:200;' +
          'letter-spacing:-.04em;color:transparent;-webkit-text-stroke:1px rgba(203,182,238,.16);opacity:.6;font-family:ui-monospace,monospace',
      )
      var brand = css(
        '.co-brand',
        'position:absolute;left:34px;top:calc(24px + env(safe-area-inset-top));opacity:0;transition:opacity 1s ease-out;font-family:ui-monospace,monospace',
      )
      css('.co-brand b', 'display:block;font-size:13px;letter-spacing:.46em;color:rgba(233,238,255,.9);font-weight:500')
      css('.co-brand i', 'display:block;margin-top:7px;font-size:8px;letter-spacing:.32em;color:rgba(203,182,238,.6);font-style:normal')
      var clock = css(
        '.co-clock',
        'position:absolute;right:34px;top:calc(22px + env(safe-area-inset-top));text-align:right;font-family:ui-monospace,monospace;opacity:0;transition:opacity 1s ease-out',
      )
      var clockNum = css(
        '.co-clock b',
        'display:block;font-size:26px;letter-spacing:.08em;color:rgba(233,238,255,.88);font-variant-numeric:tabular-nums;font-weight:300',
      )
      css('.co-clock i', 'display:block;font-size:8px;letter-spacing:.3em;color:rgba(203,182,238,.55);font-style:normal;margin-top:4px')
      css(
        '.co-log',
        'position:absolute;left:7.5vw;bottom:calc(30px + env(safe-area-inset-bottom));font-family:ui-monospace,monospace;' +
          'font-size:10px;letter-spacing:.14em;color:rgba(233,238,255,.52);line-height:2.1',
      )
      css('.co-logline', 'opacity:0;transform:translateX(-8px);transition:opacity .6s ease-out,transform .6s ease-out')
      css('.co-logline span', 'color:#cbb6ee;margin-right:8px')
      css(
        '.co-center',
        'position:absolute;left:7.5vw;top:50%;transform:translateY(-50%);width:min(46vw,720px);text-align:left',
      )
      var kicker = css(
        '.co-kicker',
        'font-size:9px;letter-spacing:.6em;text-indent:.6em;color:rgba(203,182,238,.8);margin-bottom:22px;font-family:ui-monospace,monospace',
      )
      var headline = css(
        '.co-headline',
        'font-size:clamp(38px,4.6vw,70px);font-weight:200;letter-spacing:.14em;color:#f2f6ff;' +
          'text-shadow:0 0 44px rgba(159,216,245,.3),0 2px 30px rgba(0,0,0,.6);line-height:1.1;' +
          'transition:opacity .34s ease-out,transform .34s ease-out;opacity:1;transform:translateY(0)',
      )
      var sub = css(
        '.co-sub',
        'margin-top:14px;font-size:9px;letter-spacing:.38em;color:rgba(233,238,255,.44);font-family:ui-monospace,monospace',
      )
      var progress = css(
        '.co-progress',
        'position:absolute;left:7.5vw;bottom:calc(18vh + env(safe-area-inset-bottom));width:min(34vw,400px);height:1px;' +
          'background:rgba(203,182,238,.18);opacity:0;transition:opacity .9s ease-out',
      )
      var progressFill = css(
        '.co-progress-fill',
        'height:100%;width:0%;background:linear-gradient(90deg,rgba(203,182,238,.35),#cbb6ee,#eaf3ff);' +
          'box-shadow:0 0 12px rgba(203,182,238,.6);transition:width .9s cubic-bezier(.2,.7,.2,1)',
      )
      var pct = css(
        '.co-pct',
        'position:absolute;left:calc(7.5vw + min(34vw,400px) + 14px);bottom:calc(18vh + env(safe-area-inset-bottom) - 9px);' +
          'font-family:ui-monospace,monospace;font-size:10px;letter-spacing:.18em;color:rgba(203,182,238,.75);' +
          'opacity:0;transition:opacity .9s ease-out;font-variant-numeric:tabular-nums',
      )
      css(
        '.co-credit',
        'position:absolute;right:34px;bottom:calc(14px + env(safe-area-inset-bottom));font-family:ui-monospace,monospace;' +
          'font-size:7px;letter-spacing:.18em;color:rgba(203,182,238,.26)',
      )
      var diag = css(
        '.co-diag',
        'position:absolute;right:34px;bottom:calc(30px + env(safe-area-inset-bottom));font-family:ui-monospace,monospace;' +
          'font-size:8px;letter-spacing:.22em;color:rgba(203,182,238,.34);opacity:0;transition:opacity .9s ease-out',
      )
      var sign = css(
        '.co-sign',
        'position:absolute;left:50%;bottom:calc(7vh + env(safe-area-inset-bottom));transform:translateX(-50%);' +
          'display:grid;justify-items:center;gap:10px;opacity:0;visibility:hidden;transition:opacity 1.2s ease-out;text-align:center',
      )
      var wordmark = css(
        '.co-wordmark',
        'font-size:clamp(20px,2.1vw,32px);letter-spacing:.5em;text-indent:.5em;font-weight:300;color:#f4f8ff;' +
          'text-shadow:0 0 24px rgba(159,216,245,.5),0 0 60px rgba(203,182,238,.35);font-family:ui-monospace,monospace',
      )
      var tagline = css(
        '.co-tagline',
        'font-size:14px;letter-spacing:.44em;text-indent:.44em;color:#dfe6ff;text-shadow:0 0 18px rgba(159,216,245,.4);opacity:.6',
      )
      var subtitle = css(
        '.co-subtitle',
        'font-size:8px;letter-spacing:.52em;text-indent:.52em;color:rgba(203,182,238,.6);font-family:ui-monospace,monospace;opacity:.7',
      )
      var flash = css(
        '.co-flash',
        'position:absolute;inset:0;pointer-events:none;opacity:0;' +
          'background:radial-gradient(circle at 62% 44%,rgba(240,247,255,.9) 0%,rgba(159,216,245,.42) 26%,rgba(203,182,238,0) 64%)',
      )
      var sound = css(
        '.co-sound',
        'position:absolute;left:7.5vw;bottom:calc(18vh + 52px + env(safe-area-inset-bottom));padding:7px 12px;' +
          'border:1px solid rgba(203,182,238,.36);background:rgba(7,11,24,.55);color:rgba(233,238,255,.82);' +
          'font-family:ui-monospace,monospace;font-size:9px;letter-spacing:.18em;opacity:0;transition:opacity .4s ease-out;' +
          'cursor:pointer;pointer-events:auto;backdrop-filter:blur(6px)',
      )
      css(
        '.co-skip',
        'position:absolute;right:34px;bottom:calc(56px + env(safe-area-inset-bottom));font-family:ui-monospace,monospace;' +
          'font-size:9px;letter-spacing:.18em;color:rgba(233,238,255,.3)',
      )
      css('.co-score', 'display:none')
      var corners = 'position:absolute;width:26px;height:26px;border-color:rgba(203,182,238,.3);border-style:solid;border-width:0;' +
        'opacity:0;transition:opacity 1.1s ease-out'
      var tl = css('.co-c-tl', corners + ';left:20px;top:calc(18px + env(safe-area-inset-top));border-left-width:1px;border-top-width:1px')
      var tr = css('.co-c-tr', corners + ';right:20px;top:calc(18px + env(safe-area-inset-top));border-right-width:1px;border-top-width:1px')
      var bl = css('.co-c-bl', corners + ';left:20px;bottom:calc(18px + env(safe-area-inset-bottom));border-left-width:1px;border-bottom-width:1px')
      var br = css('.co-c-br', corners + ';right:20px;bottom:calc(18px + env(safe-area-inset-bottom));border-right-width:1px;border-bottom-width:1px')

      var score = root.querySelector('.co-score')
      if (score !== null) {
        score.addEventListener(
          'error',
          function () {
            if (score.getAttribute('data-fallback') === '1') return
            score.setAttribute('data-fallback', '1')
            score.src = SCORES.starfall
            score.load()
          },
          true,
        )
        score.src = preferredScore()
        score.volume = 0.9
        try {
          score.load()
        } catch (error) {
          // A missing score is not fatal: the sequence stays visual.
        }
      }
      if (plate !== null) {
        plate.onerror = function () {
          plate.style.display = 'none'
        }
        plate.src = OPENING_ART
      }
      if (film !== null) {
        film.onerror = function () {
          film.style.display = 'none'
        }
        film.src = OPENING_VIDEO
      }

      var logs = root.querySelectorAll('.co-logline')
      var timers = []
      var clockTimer = null
      var startedAt = 0
      var finished = false
      var audioStarted = false

      var at = function (delay, callback) {
        timers.push(setTimeout(callback, delay))
      }
      var showLog = function (index) {
        if (logs[index] === undefined) return
        logs[index].style.opacity = '1'
        logs[index].style.transform = 'translateX(0)'
      }
      var setProgress = function (value) {
        if (progressFill !== null) progressFill.style.width = value + '%'
        if (pct !== null) pct.textContent = String(value).padStart(3, '0')
      }
      var glitch = function () {
        if (headline === null) return
        headline.style.textShadow =
          '2px 0 rgba(203,182,238,.55),-2px 0 rgba(159,216,245,.45),0 0 44px rgba(159,216,245,.3)'
        setTimeout(function () {
          if (headline !== null) headline.style.textShadow = '0 0 44px rgba(159,216,245,.3),0 2px 30px rgba(0,0,0,.6)'
        }, 170)
      }
      var setHeadline = function (text, caption) {
        if (headline === null) return
        headline.style.opacity = '0'
        headline.style.transform = 'translateY(10px)'
        setTimeout(function () {
          if (finished || headline === null) return
          headline.textContent = text
          if (sub !== null && caption !== undefined) sub.textContent = caption
          headline.style.opacity = '1'
          headline.style.transform = 'translateY(0)'
          glitch()
        }, 180)
      }
      var pulse = function () {
        if (flash === null) return
        flash.style.transition = 'none'
        flash.style.opacity = '.95'
        requestAnimationFrame(function () {
          if (flash === null) return
          flash.style.transition = 'opacity 1.2s ease-out'
          flash.style.opacity = '0'
        })
      }
      var reveal = function () {
        if (film !== null) film.style.opacity = '1'
        if (plate !== null) plate.style.opacity = '.22'
        if (veil !== null) veil.style.opacity = '.2'
        if (veilB !== null) veilB.style.opacity = '1'
        if (ring !== null) {
          ring.style.opacity = '.5'
          ring.style.transform = 'translate(-50%,-50%) scale(1)'
        }
        if (sign !== null) {
          sign.style.visibility = 'visible'
          sign.style.opacity = '1'
        }
        pulse()
        setProgress(100)
        setHeadline('月下摇篮', 'MOONLIT CRADLE')
        if (kicker !== null) kicker.textContent = 'WELCOME TO'
      }
      var tryScore = function () {
        if (score === null || audioStarted) return
        audioStarted = true
        var played = score.play()
        if (played && typeof played.then === 'function') {
          played
            .then(function () {
              if (sound !== null) sound.style.opacity = '0'
            })
            .catch(function () {
              audioStarted = false
              if (sound !== null) sound.style.opacity = '1'
            })
        }
      }
      var updateClock = function () {
        if (clockNum === null || startedAt === 0) return
        var seconds = Math.min(99, Math.floor((performance.now() - startedAt) / 1000))
        clockNum.textContent = '00:' + String(seconds).padStart(2, '0')
      }

      var finish = function () {
        if (finished) return
        finished = true
        for (var index = 0; index < timers.length; index += 1) clearTimeout(timers[index])
        if (clockTimer !== null) clearInterval(clockTimer)
        root.removeEventListener('click', onSkip)
        document.removeEventListener('keydown', onKey, true)
        if (score !== null) {
          try {
            score.pause()
            score.removeAttribute('src')
            score.load()
          } catch (error) {
            // Releasing media is best-effort.
          }
        }
        if (film !== null) {
          try {
            film.pause()
            film.removeAttribute('src')
            film.load()
          } catch (error) {
            // Releasing the film is best-effort.
          }
        }
        root.style.transition = 'opacity .9s ease-out,transform .9s ease-out'
        root.style.opacity = '0'
        root.style.transform = 'scale(1.03)'
        root.setAttribute('data-leaving', '')
        document.documentElement.dataset.columbinaOpening = 'done'
        setTimeout(function () {
          root.remove()
        }, 950)
      }
      var onSkip = function () {
        finish()
      }
      var onKey = function (event) {
        if (event.key !== undefined) finish()
      }
      root.addEventListener('click', onSkip)
      document.addEventListener('keydown', onKey, true)
      if (sound !== null) {
        sound.addEventListener('click', function (event) {
          event.stopPropagation()
          tryScore()
        })
      }

      var startTimeline = function () {
        if (finished) return
        startedAt = performance.now()
        clockTimer = setInterval(updateClock, 200)
        document.documentElement.dataset.columbinaOpening = 'playing'
        at(140, function () {
          if (brand !== null) brand.style.opacity = '1'
          if (clock !== null) clock.style.opacity = '1'
          if (diag !== null) diag.style.opacity = '1'
          if (tl !== null) tl.style.opacity = '1'
          if (tr !== null) tr.style.opacity = '1'
          if (bl !== null) bl.style.opacity = '1'
          if (br !== null) br.style.opacity = '1'
          if (progress !== null) progress.style.opacity = '1'
          if (pct !== null) pct.style.opacity = '1'
        })
        at(520, function () {
          tryScore()
        })
        at(600, function () {
          if (film === null) return
          film.style.opacity = '.5'
          var played = film.play()
          if (played && typeof played.catch === 'function') played.catch(function () {})
        })
        at(900, function () {
          if (plate !== null) plate.style.opacity = '.55'
        })
        at(1400, function () {
          showLog(0)
          setProgress(9)
        })
        at(2600, function () {
          setHeadline('摇篮曲起', 'A SONG BEFORE SLEEP')
        })
        at(3800, function () {
          showLog(1)
          setProgress(28)
        })
        at(5200, function () {
          setHeadline('梦境同步', 'DREAM SYNC')
          setProgress(46)
        })
        at(6600, function () {
          showLog(2)
          setProgress(62)
        })
        at(7600, function () {
          setHeadline('权限确认', 'ACCESS CHECK')
          setProgress(78)
        })
        at(8600, function () {
          showLog(3)
          setProgress(90)
        })
        at(9150, reveal)
        at(10900, function () {
          if (kicker !== null) kicker.textContent = 'WELCOME TO'
          setHeadline('月下摇篮', 'THE THIRD SEAT')
        })
        at(12400, function () {
          if (tagline !== null) tagline.style.opacity = '1'
          if (subtitle !== null) subtitle.style.opacity = '1'
          if (diag !== null) diag.textContent = 'ACCESS GRANTED · THE DAMSELLETTE · COLUMBINA'
        })
        at(14800, function () {
          if (diag !== null) diag.textContent = 'LULLABY ACTIVE · GOOD NIGHT'
        })
        at(15300, function () {
          root.style.opacity = '0'
          root.style.transform = 'scale(1.03)'
        })
        at(16300, finish)

        if (reduce) {
          for (var index = 0; index < timers.length; index += 1) clearTimeout(timers[index])
          timers.length = 0
          if (clockTimer !== null) clearInterval(clockTimer)
          if (brand !== null) brand.style.opacity = '1'
          if (clock !== null) clock.style.opacity = '1'
          if (progress !== null) progress.style.opacity = '1'
          if (pct !== null) pct.style.opacity = '1'
          reveal()
          if (kicker !== null) kicker.textContent = 'WELCOME TO'
          if (headline !== null) {
            headline.textContent = '月下摇篮'
            headline.style.opacity = '1'
            headline.style.transform = 'translateY(0)'
          }
          setTimeout(finish, 3400)
        }
      }

      whenWindowShown(startTimeline, 12000)
    }

    /* ==================================================================
       Lullaby deck — the three-track player
       The audio never ships with the repository: the Host resolves the public
       NetEase URL and streams it, so this module only owns the <audio> element,
       the persisted choice, and the floating panel.
       ================================================================== */
    var FALLBACK_TRACKS = [
      { id: '2756019215', title: '新月的摇篮曲（其一）：伴月同眠', latin: 'Somnias a Luna' },
      { id: '2756018754', title: '新月的摇篮曲（其二）：献给月亮的笑靥', latin: 'Lucens ut risus' },
      { id: '2756018755', title: '新月的摇篮曲（其三）：落花成英', latin: 'Petala ceciderunt' },
    ]

    /** Read the persisted deck state. */
    function readState() {
      var state = { enabled: true, track: 0, volume: 0.45 }
      try {
        var raw = window.localStorage.getItem(STORE_KEY)
        if (raw !== null) {
          var parsed = JSON.parse(raw)
          if (parsed !== null && typeof parsed === 'object') {
            if (typeof parsed.enabled === 'boolean') state.enabled = parsed.enabled
            if (typeof parsed.track === 'number' && parsed.track >= 0 && parsed.track <= 2) state.track = parsed.track
            if (typeof parsed.volume === 'number' && parsed.volume >= 0 && parsed.volume <= 1) state.volume = parsed.volume
          }
        }
      } catch (error) {
        // Storage unavailable: defaults are fine.
      }
      return state
    }

    /** Persist the deck state. */
    function writeState(state) {
      try {
        window.localStorage.setItem(STORE_KEY, JSON.stringify(state))
      } catch (error) {
        // Storage unavailable: the deck still works for this session.
      }
    }

    /**
     * Build the player, mount it on <html>, and publish `window.__columbinaDeck`
     * so the optional hub panel can drive the same instance.
     */
    function mountDeck() {
      if (document.querySelector('[' + PLAYER_ATTR + ']') !== null) return

      var tracks = FALLBACK_TRACKS.slice()
      var state = readState()
      var listeners = []
      var audio = new Audio()
      audio.loop = true
      audio.preload = 'none'
      audio.volume = state.volume
      var started = false
      var blocked = false
      var failed = false

      var notify = function () {
        var snapshot = api.getState()
        for (var index = 0; index < listeners.length; index += 1) {
          try {
            listeners[index](snapshot)
          } catch (error) {
            // A broken listener must not break the deck.
          }
        }
      }

      var root = document.createElement('div')
      root.setAttribute(PLAYER_ATTR, '')
      root.style.cssText =
        'position:fixed;right:18px;bottom:calc(86px + env(safe-area-inset-bottom));z-index:2147482000;' +
        'display:flex;flex-direction:column;align-items:flex-end;gap:10px;pointer-events:none;' +
        'font-family:var(--dsw-font-family,"Segoe UI",system-ui,sans-serif)'
      document.documentElement.appendChild(root)

      var pill = document.createElement('button')
      pill.type = 'button'
      pill.setAttribute('data-deck-pill', '')
      pill.title = '月之摇篮曲'
      pill.style.cssText =
        'pointer-events:auto;display:flex;align-items:center;gap:9px;height:38px;padding:0 14px 0 11px;' +
        'border-radius:999px;border:1px solid rgba(203,182,238,.34);background:rgba(9,14,29,.78);' +
        'color:#dfe6ff;cursor:pointer;backdrop-filter:blur(12px) saturate(120%);' +
        'box-shadow:0 10px 30px rgba(2,5,12,.45),inset 0 1px 0 rgba(233,238,255,.08);' +
        'font-size:11.5px;letter-spacing:.06em;transition:border-color .2s ease,background .2s ease'
      var pillIcon = document.createElement('span')
      pillIcon.textContent = '♪'
      pillIcon.style.cssText = 'font-size:14px;color:#cbb6ee;line-height:1'
      var pillText = document.createElement('span')
      pillText.style.cssText = 'max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap'
      pillText.textContent = '月之摇篮曲'
      var pillState = document.createElement('span')
      pillState.setAttribute('data-deck-state', '')
      pillState.style.cssText = 'font-size:9px;letter-spacing:.14em;color:rgba(203,182,238,.7);font-family:ui-monospace,monospace'
      pillState.textContent = 'PAUSED'
      pill.appendChild(pillIcon)
      pill.appendChild(pillText)
      pill.appendChild(pillState)

      var panel = document.createElement('div')
      panel.style.cssText =
        'pointer-events:auto;display:none;width:296px;padding:16px 16px 14px;border-radius:16px;' +
        'border:1px solid rgba(203,182,238,.26);background:linear-gradient(180deg,rgba(13,20,38,.96),rgba(8,13,26,.97));' +
        'box-shadow:0 22px 60px rgba(2,5,12,.6);backdrop-filter:blur(18px) saturate(125%);color:#e9eeff'

      var head = document.createElement('div')
      head.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:12px'
      var headTitle = document.createElement('div')
      headTitle.innerHTML = '<div style="font-size:12.5px;letter-spacing:.14em;color:#eef2ff">月之摇篮曲</div>' +
        '<div style="font-size:8px;letter-spacing:.3em;color:rgba(203,182,238,.6);margin-top:3px">LULLABY DECK</div>'
      var close = document.createElement('button')
      close.type = 'button'
      close.textContent = '×'
      close.style.cssText = 'appearance:none;border:none;background:transparent;color:rgba(233,238,255,.5);font-size:18px;cursor:pointer;line-height:1;padding:2px 4px'
      head.appendChild(headTitle)
      head.appendChild(close)
      panel.appendChild(head)

      var list = document.createElement('div')
      list.style.cssText = 'display:flex;flex-direction:column;gap:7px'
      var rows = []
      for (var index = 0; index < tracks.length; index += 1) {
        var row = document.createElement('button')
        row.type = 'button'
        row.setAttribute('data-deck-track', String(index))
        row.style.cssText =
          'appearance:none;text-align:left;cursor:pointer;display:flex;align-items:center;gap:10px;' +
          'padding:9px 10px;border-radius:10px;border:1px solid rgba(203,182,238,.14);background:rgba(203,182,238,.04);color:#e9eeff'
        var ordinal = document.createElement('span')
        ordinal.textContent = ['Ⅰ', 'Ⅱ', 'Ⅲ'][index]
        ordinal.style.cssText = 'font-size:12px;color:rgba(203,182,238,.85);width:14px;text-align:center;flex:none'
        var meta = document.createElement('span')
        meta.style.cssText = 'display:flex;flex-direction:column;gap:2px;min-width:0'
        var metaTitle = document.createElement('span')
        metaTitle.textContent = tracks[index].title
        metaTitle.style.cssText = 'font-size:11.5px;line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis'
        var metaLatin = document.createElement('span')
        metaLatin.textContent = tracks[index].latin
        metaLatin.style.cssText = 'font-size:8px;letter-spacing:.18em;color:rgba(159,216,245,.6)'
        meta.appendChild(metaTitle)
        meta.appendChild(metaLatin)
        row.appendChild(ordinal)
        row.appendChild(meta)
        rows.push(row)
        list.appendChild(row)
      }
      panel.appendChild(list)

      var footer = document.createElement('div')
      footer.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:13px'
      var toggle = document.createElement('button')
      toggle.type = 'button'
      toggle.setAttribute('data-deck-toggle', '')
      toggle.style.cssText =
        'appearance:none;cursor:pointer;border-radius:999px;border:1px solid rgba(203,182,238,.3);' +
        'background:rgba(203,182,238,.1);color:#e9eeff;font-size:11px;letter-spacing:.1em;padding:6px 13px'
      var volume = document.createElement('input')
      volume.type = 'range'
      volume.min = '0'
      volume.max = '100'
      volume.value = String(Math.round(state.volume * 100))
      volume.setAttribute('aria-label', '音量')
      volume.style.cssText = 'width:110px;accent-color:#cbb6ee;cursor:pointer'
      footer.appendChild(toggle)
      footer.appendChild(volume)
      panel.appendChild(footer)

      var hint = document.createElement('div')
      hint.style.cssText = 'margin-top:10px;font-size:9.5px;line-height:1.7;color:rgba(152,162,194,.8)'
      hint.textContent = '曲目来自网易云音乐，由本机代理实时播放，不随主题仓库分发。'
      panel.appendChild(hint)

      root.appendChild(panel)
      root.appendChild(pill)

      var api = {
        getState: function () {
          return {
            enabled: state.enabled,
            track: state.track,
            volume: state.volume,
            playing: !audio.paused && started,
            blocked: blocked,
            failed: failed,
            tracks: tracks.slice(),
          }
        },
        toggle: function (next) {
          state.enabled = typeof next === 'boolean' ? next : !state.enabled
          writeState(state)
          if (state.enabled) attempt()
          else {
            audio.pause()
            blocked = false
          }
          paint()
          notify()
          return state.enabled
        },
        select: function (index) {
          if (index < 0 || index >= tracks.length) return state.track
          state.track = index
          writeState(state)
          if (state.enabled) attempt(true)
          paint()
          notify()
          return state.track
        },
        next: function () {
          return api.select((state.track + 1) % tracks.length)
        },
        setVolume: function (value) {
          state.volume = Math.max(0, Math.min(1, Number(value)))
          audio.volume = state.volume
          writeState(state)
          paint()
          notify()
        },
        subscribe: function (listener) {
          listeners.push(listener)
          return function () {
            var at = listeners.indexOf(listener)
            if (at !== -1) listeners.splice(at, 1)
          }
        },
      }
      window.__columbinaDeck = api

      var srcFor = function (index) {
        return '/theme-columbina/music/stream?id=' + encodeURIComponent(tracks[index].id)
      }

      /** Fade the element out, swap the source, then fade back in. */
      var attempt = function (restart) {
        if (!state.enabled) return
        failed = false
        var target = state.track
        var play = function () {
          var played = audio.play()
          if (played && typeof played.then === 'function') {
            played
              .then(function () {
                blocked = false
                started = true
                paint()
                notify()
              })
              .catch(function () {
                blocked = true
                paint()
                notify()
              })
          }
        }
        if (restart || audio.getAttribute('src') !== srcFor(target)) {
          audio.pause()
          audio.setAttribute('src', srcFor(target))
          try {
            audio.load()
          } catch (error) {
            // Loading is best-effort; play() will report the real failure.
          }
        }
        play()
      }

      audio.addEventListener('playing', function () {
        failed = false
        started = true
        paint()
        notify()
      })
      audio.addEventListener('error', function () {
        failed = true
        started = false
        paint()
        notify()
      })
      audio.addEventListener('pause', function () {
        paint()
        notify()
      })

      var paint = function () {
        var track = tracks[state.track]
        pillText.textContent = track.title.replace(/^新月的摇篮曲（其[一二三]）：/, '')
        var playing = !audio.paused && started && !failed
        pillState.textContent = failed ? 'OFFLINE' : blocked ? '点击播放' : playing ? 'NOW' : 'PAUSED'
        pillState.style.color = failed ? 'rgba(227,154,192,.85)' : playing ? 'rgba(159,216,245,.85)' : 'rgba(203,182,238,.6)'
        pill.style.borderColor = playing ? 'rgba(203,182,238,.62)' : 'rgba(203,182,238,.3)'
        toggle.textContent = state.enabled ? (playing ? '暂停 · ON' : '播放 · ON') : '播放 · OFF'
        toggle.style.background = state.enabled ? 'rgba(203,182,238,.16)' : 'rgba(203,182,238,.06)'
        for (var index = 0; index < rows.length; index += 1) {
          rows[index].setAttribute('data-active', index === state.track ? '1' : '0')
        }
        volume.value = String(Math.round(state.volume * 100))
      }

      pill.addEventListener('click', function (event) {
        event.stopPropagation()
        var open = panel.style.display !== 'none'
        panel.style.display = open ? 'none' : 'block'
        if (!open && state.enabled && audio.paused) attempt()
      })
      close.addEventListener('click', function (event) {
        event.stopPropagation()
        panel.style.display = 'none'
      })
      panel.addEventListener('click', function (event) {
        event.stopPropagation()
      })
      for (var rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
        (function (index) {
          rows[index].addEventListener('click', function () {
            api.select(index)
          })
        })(rowIndex)
      }
      toggle.addEventListener('click', function () {
        api.toggle()
      })
      volume.addEventListener('input', function () {
        api.setVolume(Number(volume.value) / 100)
      })

      // Browsers only allow audible playback after a gesture. The first one of
      // the session starts the deck (unless the opening is still on screen, in
      // which case the main theme would talk over its own score).
      var firstGesture = function () {
        document.removeEventListener('pointerdown', firstGesture, true)
        document.removeEventListener('keydown', firstGesture, true)
        if (document.getElementById(OPENING_ID) !== null) {
          if (document.documentElement.dataset.columbinaOpening !== 'done') {
            document.addEventListener('pointerdown', firstGesture, true)
            document.addEventListener('keydown', firstGesture, true)
            return
          }
        }
        attempt()
      }
      document.addEventListener('pointerdown', firstGesture, true)
      document.addEventListener('keydown', firstGesture, true)

      // A track may already be selected and the page may be autoplay-friendly
      // (the desktop shell is): try right away, and fall back to the gesture.
      if (state.enabled) setTimeout(function () {
        if (document.getElementById(OPENING_ID) === null) attempt()
      }, 900)

      paint()
      notify()

      return function () {
        try {
          audio.pause()
          audio.removeAttribute('src')
          audio.load()
        } catch (error) {
          // Releasing media is best-effort.
        }
        root.remove()
        delete window.__columbinaDeck
      }
    }

    /** Mount the theme on the page. */
    function apply(ctx) {
      ctx.effect(
        function () {
          var disposeStyle = ensureStylesheet()
          var disposeDark = holdDarkPalette()
          var disposeDeck = null
          try {
            disposeDeck = mountDeck()
          } catch (error) {
            // A broken deck must never take the UI down with it.
          }
          reportFacts()
          setTimeout(reportFacts, 2600)
          return function () {
            if (typeof disposeDeck === 'function') disposeDeck()
            disposeDark()
            disposeStyle()
          }
        },
        'theme-columbina: stylesheet, palette and deck',
      )

      // The overlay covers the window immediately: it is the first thing seen.
      whenWindowShown(function () {
        try {
          playOpening()
        } catch (error) {
          // A failed opening is an acceptable outcome; a thrown mount is not.
        }
      }, 12000)
    }

    return { apply: apply }
  },
})
