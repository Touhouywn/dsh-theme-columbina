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

    /**
     * Put a sidebar toggle in the title bar, top-left.
     *
     * The shell's control lives inside the sidebar, whose `backdrop-filter`
     * makes it the containing block for fixed children and whose `overflow`
     * clips anything above its top edge. A button mounted on <html> can sit on
     * the title bar; it forwards the click to the shell's control so the shell
     * keeps owning the state and the Ctrl+B shortcut.
     */
    function installTitlebarToggle() {
      if (document.querySelector('[data-columbina-titlebar-toggle]') !== null) return
      var button = document.createElement('button')
      button.type = 'button'
      button.setAttribute('data-columbina-titlebar-toggle', '')
      button.setAttribute('aria-label', '切换侧边栏')
      button.title = '切换侧边栏（Ctrl+B）'
      button.innerHTML =
        '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
        '<rect x="1.5" y="2.5" width="13" height="11" rx="2.4" stroke="currentColor" stroke-width="1.3"/>' +
        '<path d="M6.2 2.7v10.6" stroke="currentColor" stroke-width="1.3"/>' +
        '</svg>'
      button.addEventListener('click', function (event) {
        event.stopPropagation()
        var control = document.querySelector(
          'button[aria-label="收起侧边栏"],button[aria-label="展开侧边栏"]',
        )
        if (control === null) {
          control = document.querySelector('button[aria-label*="侧边栏"]')
        }
        if (control !== null) control.click()
      })
      document.documentElement.appendChild(button)
      return function () {
        button.remove()
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
      cradle: '/theme-columbina/opening-score-cradle.m4a',
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
        'opacity:1;transition:opacity 1s ease-out;font-family:var(--dsw-font-family,"Segoe UI",sans-serif);' +
        'color:#e9eeff;user-select:none'
      root.innerHTML = [
        '<img class="co-plate" alt="" decoding="async">',
        '<div class="co-iris"><video class="co-film" muted playsinline preload="auto"></video></div>',
        '<div class="co-moon"></div>',
        '<div class="co-veil"></div>',
        '<svg class="co-crescent" viewBox="0 0 100 100" aria-hidden="true">',
        '<path d="M64 8a42 42 0 1 0 0 84 33 33 0 1 1 0-84Z" fill="none" stroke="#e9eeff" stroke-width="1.6" stroke-linejoin="round"/>',
        '</svg>',
        '<div class="co-ring"></div>',
        '<div class="co-brand"><b>COLUMBINA</b><i>THE DAMSELLETTE · THIRD SEAT</i></div>',
        '<div class="co-lyrics">',
        '<div class="co-line">今晚的月亮，很轻。</div>',
        '<div class="co-line">轻得像一句没说完的话。</div>',
        '<div class="co-line">那就先闭上眼吧…</div>',
        '</div>',
        '<div class="co-title">',
        '<div class="co-kicker">WELCOME TO</div>',
        '<div class="co-headline">月下摇篮</div>',
        '<div class="co-tagline">月光作幕，歌声为枕</div>',
        '<div class="co-sub">MOONLIT CRADLE · COLUMBINA</div>',
        '</div>',
        '<div class="co-flash"></div>',
        '<div class="co-sound">♪ 点击启用声音</div>',
        '<div class="co-skip">点击 / 任意键 跳过</div>',
        '<audio class="co-score" preload="auto"></audio>',
      ].join('')
      document.documentElement.appendChild(root)
      if (root.getBoundingClientRect().width < window.innerWidth * 0.9) document.body.appendChild(root)

      var css = function (selector, text) {
        var node = root.querySelector(selector)
        if (node !== null) node.style.cssText = text
        return node
      }

      var width = root.clientWidth || window.innerWidth
      var height = root.clientHeight || window.innerHeight
      // The window of light opens over the character: her face sits slightly
      // right of centre in the supplied film.
      var centerX = width * 0.66
      var centerY = height * 0.37
      var holdRadius = Math.min(width, height) * 0.29
      var fullRadius = Math.hypot(Math.max(centerX, width - centerX), Math.max(centerY, height - centerY)) * 1.1

      var plate = css(
        '.co-plate',
        'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:62% 42%;' +
          'opacity:.18;transform:scale(1.06);filter:brightness(.6) saturate(.9)',
      )
      var iris = css('.co-iris', 'position:absolute;inset:0;pointer-events:none')
      var film = css(
        '.co-film',
        'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:62% 42%;' +
          'opacity:1;filter:brightness(.74) saturate(.94)',
      )
      var moon = css(
        '.co-moon',
        'position:absolute;left:' + centerX + 'px;top:' + centerY + 'px;width:2px;height:2px;border-radius:50%;' +
          'transform:translate(-50%,-50%);pointer-events:none;opacity:0;' +
          'background:radial-gradient(circle,rgba(159,216,245,.5) 0%,rgba(203,182,238,.22) 42%,rgba(7,11,24,0) 72%)',
      )
      var veil = css(
        '.co-veil',
        'position:absolute;inset:0;pointer-events:none;opacity:.62;transition:opacity 1.4s ease-out;' +
          'background:radial-gradient(120% 90% at 66% 37%,rgba(4,7,15,0) 0%,rgba(4,7,15,.42) 46%,rgba(4,7,15,.92) 100%),' +
          'linear-gradient(180deg,rgba(3,6,13,.86) 0%,rgba(3,6,13,.2) 34%,rgba(3,6,13,.24) 72%,rgba(3,6,13,.86) 100%)',
      )
      var crescent = css(
        '.co-crescent',
        'position:absolute;left:' + centerX + 'px;top:' + centerY + 'px;width:' + Math.round(holdRadius * 1.15) + 'px;' +
          'height:' + Math.round(holdRadius * 1.15) + 'px;transform:translate(-50%,-50%);opacity:0;' +
          'filter:drop-shadow(0 0 18px rgba(159,216,245,.55));transition:opacity .9s ease-out;will-change:opacity',
      )
      var ring = css(
        '.co-ring',
        'position:absolute;left:' + centerX + 'px;top:' + centerY + 'px;width:2px;height:2px;border-radius:50%;' +
          'transform:translate(-50%,-50%);pointer-events:none;opacity:0;' +
          'border:1px solid rgba(203,182,238,.42);box-shadow:0 0 26px rgba(159,216,245,.28),inset 0 0 40px rgba(159,216,245,.18)',
      )
      var brand = css(
        '.co-brand',
        'position:absolute;left:34px;top:calc(26px + env(safe-area-inset-top));opacity:0;transition:opacity 1.2s ease-out;' +
          'font-family:ui-monospace,monospace',
      )
      css('.co-brand b', 'display:block;font-size:13px;letter-spacing:.46em;color:rgba(233,238,255,.9);font-weight:500')
      css('.co-brand i', 'display:block;margin-top:7px;font-size:8px;letter-spacing:.3em;color:rgba(203,182,238,.6);font-style:normal')
      css(
        '.co-lyrics',
        'position:absolute;left:8vw;bottom:calc(16vh + env(safe-area-inset-bottom));display:grid;gap:10px;' +
          'font-size:clamp(15px,1.25vw,19px);letter-spacing:.14em;color:rgba(233,238,255,.9);' +
          'text-shadow:0 2px 26px rgba(3,6,13,.9)',
      )
      css('.co-line', 'opacity:0;transform:translateY(8px);transition:opacity 1.1s ease-out,transform 1.1s ease-out')
      var title = css(
        '.co-title',
        'position:absolute;left:8vw;top:50%;transform:translateY(-46%);opacity:0;' +
          'transition:opacity 1.4s ease-out,transform 1.6s cubic-bezier(.16,.42,.2,1);max-width:70vw',
      )
      var kicker = css(
        '.co-kicker',
        'font-size:9px;letter-spacing:.62em;text-indent:.62em;color:rgba(203,182,238,.85);margin-bottom:20px;' +
          'font-family:ui-monospace,monospace',
      )
      css(
        '.co-headline',
        'font-size:clamp(44px,5.4vw,82px);font-weight:200;letter-spacing:.2em;text-indent:.2em;color:#f4f8ff;line-height:1.08;' +
          'text-shadow:0 0 52px rgba(159,216,245,.42),0 0 120px rgba(203,182,238,.28),0 2px 30px rgba(0,0,0,.55)',
      )
      var tagline = css(
        '.co-tagline',
        'margin-top:20px;font-size:14px;letter-spacing:.44em;text-indent:.44em;color:#dfe6ff;opacity:0;' +
          'transition:opacity 1.2s ease-out;text-shadow:0 0 18px rgba(159,216,245,.45)',
      )
      var subtitle = css(
        '.co-sub',
        'margin-top:14px;font-size:8px;letter-spacing:.5em;text-indent:.5em;color:rgba(159,216,245,.72);opacity:0;' +
          'transition:opacity 1.2s ease-out;font-family:ui-monospace,monospace',
      )
      var flash = css(
        '.co-flash',
        'position:absolute;inset:0;pointer-events:none;opacity:0;' +
          'background:radial-gradient(circle at 66% 37%,rgba(244,249,255,.95) 0%,rgba(159,216,245,.45) 24%,rgba(203,182,238,0) 62%)',
      )
      var sound = css(
        '.co-sound',
        'position:absolute;left:34px;bottom:calc(28px + env(safe-area-inset-bottom));padding:7px 12px;' +
          'border:1px solid rgba(203,182,238,.36);background:rgba(7,11,24,.5);color:rgba(233,238,255,.82);' +
          'font-family:ui-monospace,monospace;font-size:9px;letter-spacing:.18em;opacity:0;transition:opacity .5s ease-out;' +
          'cursor:pointer;pointer-events:auto;backdrop-filter:blur(6px)',
      )
      css(
        '.co-skip',
        'position:absolute;right:34px;bottom:calc(28px + env(safe-area-inset-bottom));padding:6px 11px;border-radius:999px;' +
          'background:rgba(4,7,15,.42);backdrop-filter:blur(6px);font-family:ui-monospace,monospace;' +
          'font-size:9px;letter-spacing:.18em;color:rgba(233,238,255,.52)',
      )
      css('.co-score', 'display:none')

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

      var lines = root.querySelectorAll('.co-line')
      var timers = []
      var finished = false
      var audioStarted = false
      var startedAt = 0
      var impactAt = 0
      var frame = 0

      var at = function (delay, callback) {
        timers.push(setTimeout(callback, delay))
      }
      var pulse = function () {
        if (flash === null) return
        flash.style.transition = 'none'
        flash.style.opacity = '.95'
        requestAnimationFrame(function () {
          if (flash === null) return
          flash.style.transition = 'opacity 1.3s ease-out'
          flash.style.opacity = '0'
        })
      }
      var showLine = function (index) {
        for (var i = 0; i < lines.length; i += 1) {
          var on = i === index
          lines[i].style.opacity = on ? '1' : '0'
          lines[i].style.transform = on ? 'translateY(0)' : 'translateY(8px)'
        }
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

      /** Paint one frame of the opening iris. */
      var drawIris = function () {
        if (finished) return
        var elapsed = (performance.now() - startedAt) / 1000
        var radius = 0
        if (elapsed >= 3.4) {
          var grow = Math.min(1, (elapsed - 3.4) / 5.2)
          radius = holdRadius * (1 - Math.pow(1 - grow, 3))
        }
        if (impactAt > 0) {
          var burst = Math.min(1, (performance.now() - impactAt) / 780)
          radius = holdRadius + (fullRadius - holdRadius) * (1 - Math.pow(1 - burst, 3))
          if (burst >= 1) {
            film.style.maskImage = 'none'
            film.style.webkitMaskImage = 'none'
            ring.style.opacity = '0'
            moon.style.opacity = '0'
            frame = 0
            return
          }
        }
        // A radial mask on the video itself: a wrapper with `overflow:hidden`
        // and a big radius gets rasterised as a squircle when the layer is
        // promoted, while a mask is applied to the video surface exactly.
        var edge = Math.max(0, radius - 1.5).toFixed(1)
        var gradient =
          'radial-gradient(circle ' + radius.toFixed(1) + 'px at ' + centerX.toFixed(1) + 'px ' + centerY.toFixed(1) + 'px,' +
          '#000 0,' + '#000 ' + edge + 'px,transparent ' + radius.toFixed(1) + 'px)'
        film.style.maskImage = gradient
        film.style.webkitMaskImage = gradient
        ring.style.width = ring.style.height = Math.max(2, radius * 2).toFixed(0) + 'px'
        ring.style.opacity = radius > 6 ? '0.55' : '0'
        moon.style.width = moon.style.height = Math.max(2, radius * 2.8).toFixed(0) + 'px'
        moon.style.opacity = radius > 4 ? String(Math.min(0.9, 0.25 + (radius / holdRadius) * 0.55)) : '0'
        frame = requestAnimationFrame(drawIris)
      }

      var finish = function () {
        if (finished) return
        finished = true
        for (var index = 0; index < timers.length; index += 1) clearTimeout(timers[index])
        if (frame !== 0) cancelAnimationFrame(frame)
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
        root.style.transition = 'opacity 1s ease-out'
        root.style.opacity = '0'
        root.setAttribute('data-leaving', '')
        document.documentElement.dataset.columbinaOpening = 'done'
        setTimeout(function () {
          root.remove()
        }, 1050)
      }
      var onSkip = function () {
        finish()
      }
      var onKey = function () {
        finish()
      }
      root.addEventListener('click', onSkip)
      document.addEventListener('keydown', onKey, true)
      if (sound !== null) {
        sound.addEventListener('click', function (event) {
          event.stopPropagation()
          tryScore()
        })
      }

      var impact = function () {
        if (finished) return
        impactAt = performance.now()
        if (veil !== null) veil.style.opacity = '.16'
        if (film !== null) film.style.filter = 'brightness(.98) saturate(1.02)'
        if (crescent !== null) crescent.style.opacity = '0'
        if (ring !== null) ring.style.opacity = '0'
        if (title !== null) {
          title.style.opacity = '1'
          title.style.transform = 'translateY(-50%)'
        }
        pulse()
        if (frame === 0) frame = requestAnimationFrame(drawIris)
      }

      var startTimeline = function () {
        if (finished) return
        startedAt = performance.now()
        document.documentElement.dataset.columbinaOpening = 'playing'
        at(500, function () {
          if (brand !== null) brand.style.opacity = '1'
        })
        at(700, function () {
          if (crescent === null) return
          crescent.style.opacity = '1'
          var path = crescent.querySelector('path')
          if (path !== null) {
            try {
              var length = path.getTotalLength()
              path.style.strokeDasharray = length + ' ' + length
              path.style.strokeDashoffset = String(length)
              path.getBoundingClientRect()
              path.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(.3,.6,.2,1) .05s'
              path.style.strokeDashoffset = '0'
            } catch (error) {
              // No geometry API: the stroke appears already drawn.
            }
          }
        })
        at(900, function () {
          if (film === null) return
          var played = film.play()
          if (played && typeof played.catch === 'function') played.catch(function () {})
          if (frame === 0) frame = requestAnimationFrame(drawIris)
        })
        at(520, tryScore)
        at(1200, function () {
          showLine(0)
        })
        at(4000, function () {
          showLine(1)
        })
        at(6200, function () {
          showLine(2)
        })
        at(8600, function () {
          showLine(-1)
        })
        at(2400, function () {
          if (crescent !== null) crescent.style.opacity = '0'
        })
        at(9150, impact)
        at(10600, function () {
          if (tagline !== null) tagline.style.opacity = '1'
        })
        at(11800, function () {
          if (subtitle !== null) subtitle.style.opacity = '1'
        })
        at(15100, function () {
          root.style.opacity = '0'
        })
        at(16200, finish)

        if (reduce) {
          for (var index = 0; index < timers.length; index += 1) clearTimeout(timers[index])
          timers.length = 0
          if (film !== null) {
            film.style.maskImage = 'none'
            film.style.webkitMaskImage = 'none'
            film.style.filter = 'brightness(.95)'
            var played = film.play()
            if (played && typeof played.catch === 'function') played.catch(function () {})
          }
          if (veil !== null) veil.style.opacity = '.2'
          if (brand !== null) brand.style.opacity = '1'
          if (title !== null) {
            title.style.opacity = '1'
            title.style.transform = 'translateY(-50%)'
          }
          if (tagline !== null) tagline.style.opacity = '1'
          if (subtitle !== null) subtitle.style.opacity = '1'
          setTimeout(finish, 3800)
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
      { slug: 'i', title: '新月的摇篮曲（其一）：伴月同眠', latin: 'Somnias a Luna', local: false },
      { slug: 'ii', title: '新月的摇篮曲（其二）：宵晖下的笑颜', latin: 'Lucens ut risus', local: false },
      { slug: 'iii', title: '新月的摇篮曲（其三）：眉间落英', latin: 'Petala ceciderunt', local: false },
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
      hint.textContent = '读取 assets/bgm 里的三首本地文件；文件不在时保持静音并提示。音频不随仓库分发。'
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
            source: tracks[state.track] && tracks[state.track].local === true ? 'local' : 'missing',
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
          // Picking a track is a play request, even when the deck was muted.
          state.enabled = true
          writeState(state)
          attempt(true)
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
        return '/theme-columbina/music/track?slug=' + encodeURIComponent(tracks[index].slug)
      }

      /** Swap the source when needed, then let `play()` report the real state. */
      var attempt = function (restart) {
        if (!state.enabled) return
        failed = false
        var target = state.track
        var url = srcFor(target)
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
        if (restart || audio.getAttribute('src') !== url) {
          audio.pause()
          audio.setAttribute('src', url)
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
        pillState.textContent = failed ? '未找到' : blocked ? '点击播放' : playing ? 'NOW' : 'PAUSED'
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
        if (open) return
        // Opening the deck is a play request: if the deck was muted (the choice
        // is persisted), turn it back on and start the track in this gesture.
        if (!state.enabled) {
          state.enabled = true
          writeState(state)
          paint()
          notify()
        }
        if (audio.paused) attempt()
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

      // Ask the Host whether local copies exist; until this answers, the deck
      // streams from NetEase, which is always available when the network is.
      fetch('/theme-columbina/music/deck', { cache: 'no-store' })
        .then(function (response) {
          return response.json()
        })
        .then(function (data) {
          if (data === null || !Array.isArray(data.tracks)) return
          for (var index = 0; index < tracks.length && index < data.tracks.length; index += 1) {
            var entry = data.tracks[index]
            if (entry.slug !== tracks[index].slug) continue
            tracks[index].local = entry.local === true
            if (typeof entry.title === 'string') tracks[index].title = entry.title
            if (typeof entry.latin === 'string') tracks[index].latin = entry.latin
          }
          paint()
          notify()
        })
        .catch(function () {
          // No deck description: keep streaming.
        })

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
          var disposeToggle = null
          try {
            disposeDeck = mountDeck()
          } catch (error) {
            // A broken deck must never take the UI down with it.
          }
          try {
            disposeToggle = installTitlebarToggle()
          } catch (error) {
            // The stock control stays in place if the extra one cannot mount.
          }
          reportFacts()
          setTimeout(reportFacts, 2600)
          return function () {
            if (typeof disposeToggle === 'function') disposeToggle()
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
