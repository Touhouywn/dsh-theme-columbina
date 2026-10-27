/**
 * Columbina · voice — browser half, original-clip edition.
 *
 * Watches the transcript, asks the host for a whole-clip sequence (C′ templates
 * first, D retrieval below), and plays it. Silent when the bank has nothing
 * confident; the text stays on screen. This build never calls /speak.
 */
window.__ModuleLoader__.load({
  id: 'dsh-plugin-columbina-voice',
  factory: (require) => {
    var BUTTON_ATTR = 'data-columbina-voice'
    var STORE_KEY = 'columbina-voice-v2'
    var SELECT_URL = '/columbina-voice/select'
    var STATUS_URL = '/columbina-voice/status'

    var STABLE_MS = 1200 // 正文停这么久才念
    var POLL_MS = 900 // 找不到容器时的兜底轮询
    var MAX_CLIPS = 2 // 每回复最多两段

    var state = { enabled: true, speaking: false, mode: 'clips', clips: 0 }
    var listeners = []
    var lastSpoken = ''
    var firstSpoken = false
    var timer = null
    var audio = null
    var queue = []
    var playToken = 0

    function notify() {
      for (var i = 0; i < listeners.length; i += 1) {
        try {
          listeners[i](snapshot())
        } catch (error) {
          // A broken listener must not break the button.
        }
      }
      paint()
    }

    function snapshot() {
      return { enabled: state.enabled, speaking: state.speaking, mode: state.mode, clips: state.clips }
    }

    /** 没有记录时默认开启。 */
    function readStored() {
      try {
        var raw = window.localStorage.getItem(STORE_KEY)
        if (raw === null || raw === undefined) return true
        return raw === '1'
      } catch (error) {
        return true
      }
    }

    function store(enabled) {
      try {
        window.localStorage.setItem(STORE_KEY, enabled ? '1' : '0')
      } catch (error) {
        // Storage unavailable: session only.
      }
    }

    /** Strip markdown and code so the voice only sees prose. */
    function clean(text) {
      return String(text || '')
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/`[^`]*`/g, ' ')
        .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/^[#>\-*+\s]+/gm, '')
        .replace(/[*_~|]/g, '')
        .replace(/https?:\/\/\S+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    }

    function centerCol() {
      return document.querySelector('[class*="centerCol"]')
    }

    /** The last assistant paragraph on screen, or an empty string. */
    function latestParagraph() {
      var transcript = centerCol()
      if (transcript === null) return ''
      var blocks = transcript.querySelectorAll('[class*="markdown"]')
      if (blocks.length === 0) return ''
      var node = blocks[blocks.length - 1]
      var parent = node
      for (var depth = 0; depth < 4 && parent !== null; depth += 1) {
        if (/user|bubble/i.test(String(parent.className || ''))) return ''
        parent = parent.parentElement
      }
      var clone = node.cloneNode(true)
      var code = clone.querySelectorAll('pre, code')
      for (var index = 0; index < code.length; index += 1) code[index].remove()
      return clean(clone.textContent)
    }

    /** 全局 token：新序列 +1，旧的 onended 一看 token 不符就把队列丢掉。 */
    function stopAudio() {
      playToken += 1
      queue = []
      if (audio !== null) {
        try {
          audio.pause()
          audio.removeAttribute('src')
          audio.load()
        } catch (error) {
          // Already gone.
        }
        audio = null
      }
      if (state.speaking) {
        state.speaking = false
        notify()
      }
    }

    /** Play 1–2 whole original clips in order. */
    function playClips(clips) {
      stopAudio()
      if (!state.enabled || !Array.isArray(clips) || clips.length === 0) return
      playToken += 1
      var token = playToken
      queue = clips.slice(0, MAX_CLIPS)
      state.speaking = true
      state.mode = 'clips'
      notify()

      function next() {
        if (token !== playToken || !state.enabled) {
          queue = []
          return
        }
        var clip = queue.shift()
        if (clip === undefined) {
          state.speaking = false
          notify()
          return
        }
        var element = new Audio(clip.url)
        audio = element
        element.onended = function () {
          if (token !== playToken) {
            queue = []
            state.speaking = false
            notify()
            return
          }
          next()
        }
        element.onerror = element.onended
        element.play().catch(element.onended)
      }

      next()
    }

    function select(payload) {
      return fetch(SELECT_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(function (response) {
          if (!response.ok) throw new Error('HTTP ' + response.status)
          return response.json()
        })
        .then(function (data) {
          if (!data || !Array.isArray(data.clips) || data.clips.length === 0) {
            state.mode = 'silent'
            notify()
            return
          }
          playClips(data.clips)
        })
        .catch(function () {
          state.mode = 'error'
          notify()
        })
    }

    /** 正文稳定后念一次；本会话第一条不等点击。 */
    function speakStable() {
      if (!state.enabled) return
      var text = latestParagraph()
      if (text === '' || text === lastSpoken) return
      lastSpoken = text
      firstSpoken = true
      select({ text: text.slice(0, 280) })
    }

    function schedule() {
      if (!state.enabled) return
      if (timer !== null) clearTimeout(timer)
      timer = setTimeout(function () {
        timer = null
        speakStable()
      }, STABLE_MS)
    }

    /** 新正文一出现就先闭嘴，再等它稳定下来念新的。 */
    function onMutate() {
      if (!state.enabled) return
      var text = latestParagraph()
      if (state.speaking && text !== '' && text !== lastSpoken) stopAudio()
      schedule()
    }

    function attachObserver() {
      var target = centerCol()
      if (target === null) return null
      var observer = new MutationObserver(function () {
        onMutate()
      })
      observer.observe(target, { childList: true, subtree: true, characterData: true })
      return observer
    }

    /** MutationObserver 为主，容器还没出来时用 900ms 轮询兜底。 */
    function watch() {
      var observer = attachObserver()
      var pollId = setInterval(function () {
        if (observer !== null) return
        var found = attachObserver()
        if (found !== null) {
          observer = found
          clearInterval(pollId)
          schedule()
        }
      }, POLL_MS)
      // 首屏已经有正文时不会有 mutation，主动排一次
      schedule()
      return function () {
        if (observer !== null) observer.disconnect()
        clearInterval(pollId)
        if (timer !== null) clearTimeout(timer)
      }
    }

    /** Shared by the floating button and the Moonlit Cradle hub. */
    function setEnabled(enabled, announce) {
      state.enabled = !!enabled
      store(state.enabled)
      lastSpoken = ''
      if (timer !== null) {
        clearTimeout(timer)
        timer = null
      }
      notify()
      if (state.enabled && announce) {
        select({ intent: 'enable' })
      } else if (!state.enabled) {
        stopAudio()
      }
    }

    var button = null

    function paint() {
      if (button === null) return
      button.style.borderColor = state.enabled ? 'rgba(203,182,238,.62)' : 'rgba(203,182,238,.3)'
      button.style.color = state.speaking ? '#9fd8f5' : state.enabled ? '#e9eeff' : 'rgba(233,238,255,.6)'
      button.title = state.enabled
        ? '哥伦比娅语音 · 原声切片' + (state.clips > 0 ? ' · ' + state.clips : '')
        : '哥伦比娅语音 · 关'
      button.setAttribute('data-speaking', state.speaking ? '1' : '0')
      var icon = button.querySelector('span')
      if (icon !== null) icon.textContent = state.speaking ? '◍' : '♪'
    }

    function mount() {
      if (document.querySelector('[' + BUTTON_ATTR + ']') !== null) return null
      button = document.createElement('button')
      button.type = 'button'
      button.setAttribute(BUTTON_ATTR, '')
      button.style.cssText =
        'position:fixed;right:18px;bottom:calc(134px + env(safe-area-inset-bottom));z-index:2147482000;' +
        'width:38px;height:38px;border-radius:999px;display:flex;align-items:center;justify-content:center;' +
        'border:1px solid rgba(203,182,238,.3);background:rgba(9,14,29,.94);color:rgba(233,238,255,.6);' +
        'cursor:pointer;box-shadow:0 10px 30px rgba(2,5,12,.45);transition:border-color .18s ease,color .18s ease'
      var icon = document.createElement('span')
      icon.textContent = '♪'
      icon.style.cssText = 'font-size:15px;line-height:1'
      button.appendChild(icon)
      button.addEventListener('click', function (event) {
        event.stopPropagation()
        setEnabled(!state.enabled, true)
      })
      document.documentElement.appendChild(button)
      state.enabled = readStored()
      fetch(STATUS_URL, { cache: 'no-store' })
        .then(function (response) {
          return response.json()
        })
        .then(function (data) {
          state.mode = 'clips'
          state.clips = Number(data.clips) || 0
          notify()
        })
        .catch(function () {})
      paint()
      return function () {
        stopAudio()
        button.remove()
      }
    }

    function apply(ctx) {
      ctx.effect(
        function () {
          var onVoiceCommand = function (event) {
            var detail = event && event.detail ? event.detail : {}
            setEnabled(detail.enabled === true, true)
          }
          window.addEventListener('columbina:voice', onVoiceCommand)
          var disposeButton = mount()
          var disposeWatch = watch()
          return function () {
            window.removeEventListener('columbina:voice', onVoiceCommand)
            disposeWatch()
            if (typeof disposeButton === 'function') disposeButton()
            stopAudio()
          }
        },
        'columbina-voice: button and watcher',
      )
    }

    return { apply: apply }
  },
})
