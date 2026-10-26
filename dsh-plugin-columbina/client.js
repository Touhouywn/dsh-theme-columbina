/**
 * Moonlit Cradle — the left-sidebar page for the Columbina theme.
 *
 * The page reads the theme's own `/theme-columbina/status` route, drives the
 * lullaby deck through `window.__columbinaDeck` (the player instance the theme
 * mounts), can replay the opening, and can toggle the companion persona through
 * its own route. It never writes the profile, never alters another plugin, and
 * never touches the DOM outside its own React subtree.
 */
window.__ModuleLoader__.load({
  id: 'dsh-plugin-columbina',
  factory: (require) => {
    const React = require('react')
    const h = React.createElement

    const NS = 'columbinaHub'
    const PANEL_ID = 'columbina'
    const STATUS_URL = '/theme-columbina/status'
    const PERSONA_URL = '/columbina-persona/status'
    const PERSONA_SET_URL = '/columbina-persona/enabled'
    const SCORE_KEY = 'columbina-opening-score'
    const BGM_DIR = '%USERPROFILE%\\.dsh\\themes\\columbina\\assets\\bgm'

    const zh = {
      panel: '月下摇篮',
      title: '哥伦比娅 · 月下摇篮',
      subtitle: 'DSH 主题控制台：运行状态、摇篮曲与对话语气。',
      'status.title': '运行状态',
      'row.route': '主题路由',
      'row.css': '样式表命中',
      'row.reports': '页面自检',
      'row.dark': '深色属性',
      'row.applied': '样式已应用',
      'row.opening': '开屏遮罩',
      'row.player': '播放器',
      'row.persona': '当前人格',
      'opening.title': '开屏',
      'opening.score': '配乐',
      'opening.replay': '重播开屏',
      'opening.hint': '重播会重新加载页面，并强制播放一次开屏；地址带 #opening 也可以。',
      'opening.scoreHint': '开屏只有这一首配乐，和画面同一根时间轴。',
      'deck.local': '本地',
      'deck.absent': '缺文件',
      'deck.folder': '放文件的目录',
      'deck.copy': '复制路径',
      'deck.copied': '已复制',
      'state.online': '主题在线',
      'state.offline': '主题未响应',
      'state.loading': '读取中…',
      'deck.title': '月之摇篮曲',
      'deck.subtitle': '三首摇篮曲，任选一首在主界面循环。',
      'deck.on': '播放中',
      'deck.off': '已关闭',
      'deck.blocked': '等待点击播放',
      'deck.offline': '未找到本地文件',
      'deck.toggleOn': '开启背景音乐',
      'deck.toggleOff': '关闭背景音乐',
      'deck.volume': '音量',
      'deck.missing': '主题播放器未挂载：确认 dsh-theme-columbina 已启用。',
      'deck.note': '读取主题 assets/bgm 里的三首本地文件；文件不在时保持静音并提示。音频不随仓库分发。',
      'persona.title': '对话语气',
      'persona.on': '哥伦比娅',
      'persona.off': '关闭',
      'persona.missing': '未安装',
      'persona.hint': '切换后只影响下一条回复；代码、路径与报错仍保持精确。',
      'action.title': '操作',
      'action.refresh': '刷新状态',
      'action.replay': '重播开屏',
      'action.persona': '切换语气',
      'action.copy': '复制诊断',
      'action.copied': '已复制',
      'action.hint': '诊断信息包含主题状态、播放器状态与当前开屏配乐。',
      'on': '已启用',
      'off': '未启用',
      'note.title': '说明',
      'note.body': '这个入口只读取主题的公开路由、驱动主题自带的播放器、写一次开屏配乐偏好，并可重播开屏；不会修改 DSH 核心、配置文件或其他插件。',
      error: '读取状态失败',
    }

    const en = {
      panel: 'Moonlit Cradle',
      title: 'Columbina · Moonlit Cradle',
      subtitle: 'A console for the DSH theme: status, the lullaby deck and the voice.',
      'status.title': 'Runtime status',
      'row.route': 'Theme route',
      'row.css': 'Stylesheet hits',
      'row.reports': 'Page checks',
      'row.dark': 'Dark attribute',
      'row.applied': 'Styles applied',
      'row.opening': 'Opening overlay',
      'row.player': 'Player',
      'row.persona': 'Current voice',
      'opening.title': 'Opening',
      'opening.score': 'Score',
      'opening.replay': 'Replay opening',
      'opening.hint': 'Replay reloads the page and forces the opening once; #opening works too.',
      'opening.scoreHint': 'One score, cut to the same timeline as the opening.',
      'deck.local': 'local',
      'deck.absent': 'missing',
      'deck.folder': 'Folder',
      'deck.copy': 'Copy path',
      'deck.copied': 'Copied',
      'state.online': 'Theme online',
      'state.offline': 'Theme not responding',
      'state.loading': 'Reading…',
      'deck.title': 'Lullaby deck',
      'deck.subtitle': 'Three lullabies; pick the one that loops in the main window.',
      'deck.on': 'Playing',
      'deck.off': 'Muted',
      'deck.blocked': 'Click to start',
      'deck.offline': 'Local files missing',
      'deck.toggleOn': 'Turn music on',
      'deck.toggleOff': 'Turn music off',
      'deck.volume': 'Volume',
      'deck.missing': 'Player not mounted: make sure dsh-theme-columbina is enabled.',
      'deck.note': 'Plays the three files in the theme assets/bgm folder; stays silent when they are missing. No audio ships with the repository.',
      'persona.title': 'Conversation voice',
      'persona.on': 'Columbina',
      'persona.off': 'off',
      'persona.missing': 'not installed',
      'persona.hint': 'Takes effect on the next reply; code, paths and errors stay exact.',
      'action.title': 'Actions',
      'action.refresh': 'Refresh status',
      'action.replay': 'Replay opening',
      'action.persona': 'Toggle voice',
      'action.copy': 'Copy diagnostics',
      'action.copied': 'Copied',
      'action.hint': 'Diagnostics include theme state, player state and the current opening score.',
      'on': 'on',
      'off': 'off',
      'note.title': 'Notes',
      'note.body': 'This page reads /theme-columbina/status, drives the theme player, toggles the persona plugin and can replay the opening. It does not change DSH core, the profile, or any other plugin.',
      error: 'Failed to read status',
    }

    const page = {
      padding: '32px 36px 48px',
      maxWidth: '980px',
      margin: '0 auto',
      boxSizing: 'border-box',
      // The `main` slot renders straight into `centerCol`, which is
      // `overflow: hidden`; without its own scroller the page is clipped at the
      // fold and nothing below it can be reached.
      height: '100%',
      overflowY: 'auto',
      overscrollBehavior: 'contain',
      color: 'var(--dsw-alias-label-primary)',
      fontFamily: 'var(--dsw-font-family, system-ui, -apple-system, "Segoe UI", sans-serif)',
    }
    const header = {
      display: 'flex',
      alignItems: 'center',
      gap: '18px',
      padding: '20px 22px',
      marginBottom: '18px',
      borderRadius: '18px',
      border: '1px solid rgba(203,182,238,.22)',
      background:
        'radial-gradient(120% 160% at 8% 0%, rgba(203,182,238,.16), transparent 52%),' +
        'linear-gradient(180deg, rgba(18,26,48,.8), rgba(9,14,28,.88))',
      boxShadow: '0 24px 60px rgba(2,5,12,.45)',
    }
    const emblem = {
      width: '58px',
      height: '58px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 35% 30%, #e8dfff, #2a2145 72%)',
      color: '#f4f8ff',
      border: '1px solid rgba(203,182,238,.55)',
      boxShadow: '0 0 22px rgba(203,182,238,.22)',
      flex: 'none',
    }
    const title = { margin: 0, fontSize: '22px', fontWeight: 600, letterSpacing: '.02em' }
    const subtitle = {
      margin: '6px 0 0',
      color: 'var(--dsw-alias-label-tertiary)',
      fontSize: '13px',
      lineHeight: 1.6,
    }
    const grid = {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '16px',
      marginBottom: '16px',
    }
    const card = {
      background: 'var(--dsw-alias-bg-layer-1)',
      border: '1px solid var(--dsw-alias-border-l2)',
      borderRadius: '14px',
      padding: '18px 20px',
      boxShadow: 'var(--dsw-shadow-lv1, none)',
    }
    const cardTitle = {
      margin: '0 0 12px',
      fontSize: '12px',
      fontWeight: 600,
      letterSpacing: '.08em',
      textTransform: 'uppercase',
      color: 'var(--dsw-alias-label-tertiary)',
    }
    const row = {
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: '16px',
      padding: '7px 0',
      borderBottom: '1px solid var(--dsw-alias-border-l1)',
      fontSize: '13px',
    }
    const rowLast = { ...row, borderBottom: 'none' }
    const rowLabel = { color: 'var(--dsw-alias-label-secondary)' }
    const rowValue = {
      color: 'var(--dsw-alias-label-primary)',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      fontSize: '12.5px',
      textAlign: 'right',
      overflowWrap: 'anywhere',
    }
    const chip = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '7px',
      padding: '3px 9px',
      borderRadius: '999px',
      border: '1px solid var(--dsw-alias-border-l2)',
      background: 'var(--dsw-alias-bg-layer-2)',
      fontSize: '11.5px',
      color: 'var(--dsw-alias-label-secondary)',
    }
    const dot = {
      width: '7px',
      height: '7px',
      borderRadius: '50%',
      background: 'var(--dsw-alias-state-success-primary)',
    }
    const actions = { display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }
    const button = {
      appearance: 'none',
      border: '1px solid var(--dsw-alias-border-l2)',
      background: 'var(--dsw-alias-bg-layer-2)',
      color: 'var(--dsw-alias-label-primary)',
      borderRadius: '8px',
      padding: '8px 14px',
      fontSize: '12.5px',
      fontFamily: 'inherit',
      cursor: 'pointer',
    }
    const buttonDisabled = { ...button, opacity: 0.55, cursor: 'default' }
    const hint = {
      margin: '12px 0 0',
      fontSize: '12px',
      lineHeight: 1.7,
      color: 'var(--dsw-alias-label-tertiary)',
    }
    const note = {
      margin: 0,
      fontSize: '12.5px',
      lineHeight: 1.8,
      color: 'var(--dsw-alias-label-secondary)',
    }
    const errorText = {
      margin: '10px 0 0',
      fontSize: '12px',
      lineHeight: 1.6,
      color: 'var(--dsw-alias-state-error-primary)',
    }

    /** The theme's mark: a crescent with a four-point star. */
    function MoonMark(props) {
      const size = props && props.size ? props.size : 18
      return h(
        'svg',
        {
          viewBox: '0 0 24 24',
          width: size,
          height: size,
          fill: 'none',
          'aria-hidden': true,
          style: { display: 'block' },
        },
        h('path', {
          d: 'M15.6 3.2a9 9 0 1 0 5.2 12.4A7.4 7.4 0 0 1 15.6 3.2Z',
          stroke: 'currentColor',
          strokeWidth: 1.5,
          strokeLinejoin: 'round',
        }),
        h('path', {
          d: 'M17.4 4.6l.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8Z',
          fill: 'currentColor',
          opacity: 0.85,
        }),
      )
    }

    /** Read the theme's live self-check route. */
    function useStatus() {
      const [state, setState] = React.useState({ loading: true, data: null, error: null })
      const reload = React.useCallback(function () {
        setState(function (previous) {
          return { ...previous, loading: true }
        })
        fetch(STATUS_URL, { cache: 'no-store' })
          .then(function (response) {
            if (!response.ok) throw new Error('HTTP ' + response.status)
            return response.json()
          })
          .then(function (data) {
            setState({ loading: false, data: data, error: null })
          })
          .catch(function (error) {
            setState({ loading: false, data: null, error: error })
          })
      }, [])
      React.useEffect(
        function () {
          reload()
        },
        [reload],
      )
      return { state: state, reload: reload }
    }

    /**
     * Follow the deck instance the theme mounted. It can appear late (the theme
     * client and this page are separate modules), so the hook polls until it
     * exists and then subscribes.
     */
    function useDeck() {
      const [snapshot, setSnapshot] = React.useState(null)
      React.useEffect(function () {
        let stop = null
        let timer = null
        const attach = function () {
          const deck = window.__columbinaDeck
          if (deck === undefined) return false
          setSnapshot(deck.getState())
          stop = deck.subscribe(function (next) {
            setSnapshot(next)
          })
          return true
        }
        if (!attach()) {
          timer = setInterval(function () {
            if (attach() && timer !== null) {
              clearInterval(timer)
              timer = null
            }
          }, 1200)
        }
        return function () {
          if (timer !== null) clearInterval(timer)
          if (typeof stop === 'function') stop()
        }
      }, [])
      return snapshot
    }

    /** Follow the persona plugin's toggle. */
    function usePersona() {
      const [state, setState] = React.useState({ loading: true, available: false, enabled: false })
      const apply = function (data) {
        setState({ loading: false, available: true, enabled: data.enabled === true })
      }
      const fail = function () {
        setState({ loading: false, available: false, enabled: false })
      }
      const load = React.useCallback(function () {
        fetch(PERSONA_URL, { cache: 'no-store' })
          .then(function (response) {
            if (!response.ok) throw new Error('HTTP ' + response.status)
            return response.json()
          })
          .then(apply)
          .catch(fail)
      }, [])
      const setEnabled = React.useCallback(function (next) {
        setState(function (previous) {
          return { ...previous, loading: true }
        })
        fetch(PERSONA_SET_URL, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ enabled: next }),
        })
          .then(function (response) {
            if (!response.ok) throw new Error('HTTP ' + response.status)
            return response.json()
          })
          .then(apply)
          .catch(fail)
      }, [])
      React.useEffect(
        function () {
          load()
        },
        [load],
      )
      return { state: state, setEnabled: setEnabled }
    }

    /** Read and write the opening-score preference shared with the theme. */
    function useOpeningScore() {
      const read = function () {
        try {
          const stored = window.localStorage.getItem(SCORE_KEY)
          return stored === 'starfall' || stored === 'cradle' ? stored : 'moon-cocoon'
        } catch (error) {
          return 'moon-cocoon'
        }
      }
      const [score, setScore] = React.useState(read)
      const choose = function (next) {
        setScore(next)
        try {
          window.localStorage.setItem(SCORE_KEY, next)
        } catch (error) {
          // Storage unavailable: the choice still shows for this page.
        }
      }
      return { score: score, choose: choose }
    }

    /** The page itself. */
    function ColumbinaPage(props) {
      const t = props && props.t ? props.t : function (key) {
        return key
      }
      const status = useStatus()
      const deck = useDeck()
      const persona = usePersona()
      const opening = useOpeningScore()
      const [copied, setCopied] = React.useState(false)
      const [folderCopied, setFolderCopied] = React.useState(false)

      React.useEffect(function () {
        if (!copied) return undefined
        const timer = setTimeout(function () {
          setCopied(false)
        }, 1800)
        return function () {
          clearTimeout(timer)
        }
      }, [copied])

      const data = status.state.data
      const report = data && data.lastReport ? data.lastReport : null
      const online = data !== null && data !== undefined
      const hits = data && data.hits ? data.hits['theme.css'] : 0
      const deckState = deck
      const deckPlaying = deckState !== null && deckState.playing === true
      const deckFailed = deckState !== null && deckState.failed === true
      const deckBlocked = deckState !== null && deckState.blocked === true

      function replay() {
        window.location.hash = 'opening'
        window.location.reload()
      }

      function copyFolder() {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(BGM_DIR).then(function () {
            setFolderCopied(true)
            setTimeout(function () {
              setFolderCopied(false)
            }, 1700)
          }).catch(function () {})
        }
      }

      const scoreOption = function (label, mood, active, onClick) {
        return h(
          'button',
          {
            type: 'button',
            onClick: onClick,
            style: {
              ...button,
              flex: '1 1 0',
              textAlign: 'left',
              padding: '10px 12px',
              borderColor: active ? 'rgba(203,182,238,.65)' : 'var(--dsw-alias-border-l2)',
              background: active
                ? 'linear-gradient(90deg, rgba(203,182,238,.2), rgba(159,216,245,.08))'
                : 'var(--dsw-alias-bg-layer-2)',
            },
          },
          h('div', { style: { fontSize: '12.5px', marginBottom: '3px' } }, label),
          h('div', { style: { fontSize: '9px', letterSpacing: '.08em', opacity: 0.7, fontFamily: 'ui-monospace, monospace' } }, mood),
        )
      }

      function copy() {
        const payload = JSON.stringify(
          { theme: data, deck: deckState, persona: persona.state },
          null,
          2,
        )
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(payload).then(function () {
            setCopied(true)
          }).catch(function () {})
          return
        }
        setCopied(true)
      }

      const deckHint = deckState === null
        ? t('deck.missing')
        : deckFailed
          ? t('deck.offline')
          : deckPlaying
            ? t('deck.on')
            : deckBlocked
              ? t('deck.blocked')
              : deckState.enabled === false
                ? t('deck.off')
                : t('deck.blocked')

      return h(
        'div',
        { style: page },
        h(
          'div',
          { style: header },
          h('div', { style: emblem }, h(MoonMark, { size: 28 })),
          h(
            'div',
            null,
            h('h1', { style: title }, t('title')),
            h('p', { style: subtitle }, t('subtitle')),
          ),
          h(
            'div',
            { style: { ...chip, marginLeft: 'auto' } },
            h('span', { style: { ...dot, background: online ? 'var(--dsw-alias-state-success-primary)' : 'var(--dsw-alias-state-error-primary)' } }),
            status.state.loading ? t('state.loading') : online ? t('state.online') : t('state.offline'),
          ),
        ),
        h(
          'div',
          { style: grid },
          h(
            'section',
            { style: card },
            h('h2', { style: cardTitle }, t('status.title')),
            h('div', { style: row }, h('span', { style: rowLabel }, t('row.route')), h('span', { style: rowValue }, data ? data.route : '—')),
            h('div', { style: row }, h('span', { style: rowLabel }, t('row.css')), h('span', { style: rowValue }, String(hits || 0))),
            h('div', { style: row }, h('span', { style: rowLabel }, t('row.reports')), h('span', { style: rowValue }, data ? String(data.reportCount || 0) : '—')),
            h('div', { style: row }, h('span', { style: rowLabel }, t('row.dark')), h('span', { style: rowValue }, report ? report.dark || '—' : '—')),
            h('div', { style: row }, h('span', { style: rowLabel }, t('row.opening')), h('span', { style: rowValue }, report ? report.opening || '—' : '—')),
            h('div', { style: rowLast }, h('span', { style: rowLabel }, t('row.player')), h('span', { style: rowValue }, report ? report.player || report.bgm || '—' : '—')),
            status.state.error !== null && h('p', { style: errorText }, t('error')),
          ),
          h(
            'section',
            { style: card },
            h('h2', { style: cardTitle }, t('persona.title')),
            h(
              'div',
              { style: { ...rowLast, paddingTop: 0 } },
              h('span', { style: rowLabel }, t('row.persona')),
              h(
                'span',
                { style: rowValue },
                persona.state.loading
                  ? t('state.loading')
                  : persona.state.available
                    ? persona.state.enabled ? t('persona.on') : t('persona.off')
                    : t('persona.missing'),
              ),
            ),
            h(
              'button',
              {
                type: 'button',
                style: !persona.state.available || persona.state.loading ? buttonDisabled : { ...button, marginTop: '14px' },
                onClick: function () {
                  persona.setEnabled(!persona.state.enabled)
                },
                disabled: !persona.state.available || persona.state.loading,
              },
              t('action.persona'),
            ),
            h('p', { style: hint }, t('persona.hint')),
          ),
        ),
        h(
          'section',
          { style: { ...card, marginBottom: '16px' } },
          h('h2', { style: cardTitle }, t('opening.title')),
          h('p', { style: { ...note, marginBottom: '12px', color: 'var(--dsw-alias-label-tertiary)' } }, t('opening.score')),
          h(
            'div',
            {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '14px',
                padding: '10px 12px',
                border: '1px solid rgba(203,182,238,.42)',
                borderRadius: '10px',
                background: 'linear-gradient(90deg, rgba(203,182,238,.16), rgba(159,216,245,.06))',
              },
            },
            h('span', { style: { fontSize: '12.5px' } }, '月茧'),
            h('span', { style: { fontSize: '9px', letterSpacing: '.08em', opacity: 0.7, fontFamily: 'ui-monospace, monospace' } }, 'MUSIC BOX · IMPACT 9.15s'),
            h('span', { style: { marginLeft: 'auto', fontSize: '9px', letterSpacing: '.14em', color: 'rgba(159,216,245,.8)' } }, 'DEFAULT'),
          ),
          h(
            'div',
            { style: { display: 'flex', gap: '10px', flexWrap: 'wrap' } },
            h(
              'button',
              {
                type: 'button',
                style: {
                  ...button,
                  borderColor: 'rgba(203,182,238,.55)',
                  background: 'linear-gradient(90deg, rgba(203,182,238,.22), rgba(159,216,245,.1))',
                },
                onClick: replay,
              },
              t('opening.replay'),
            ),
          ),
          h('p', { style: hint }, t('opening.scoreHint')),
          h('p', { style: hint }, t('opening.hint')),
        ),
        h(
          'section',
          { style: { ...card, marginBottom: '16px' } },
          h('h2', { style: cardTitle }, t('deck.title')),
          h('p', { style: { ...note, marginBottom: '14px', color: 'var(--dsw-alias-label-tertiary)' } }, t('deck.subtitle')),
          h(
            'div',
            { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
            (deckState !== null ? deckState.tracks : []).map(function (track, index) {
              const active = deckState.track === index
              return h(
                'button',
                {
                  key: track.slug || index,
                  type: 'button',
                  onClick: function () {
                    if (window.__columbinaDeck) window.__columbinaDeck.select(index)
                  },
                  style: {
                    appearance: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '11px 13px',
                    borderRadius: '10px',
                    fontFamily: 'inherit',
                    border: active ? '1px solid rgba(203,182,238,.6)' : '1px solid var(--dsw-alias-border-l1)',
                    background: active
                      ? 'linear-gradient(90deg, rgba(203,182,238,.16), rgba(159,216,245,.06))'
                      : 'var(--dsw-alias-bg-layer-2)',
                    color: 'var(--dsw-alias-label-primary)',
                  },
                },
                h('span', { style: { fontSize: '13px', color: 'rgba(203,182,238,.9)', width: '16px', textAlign: 'center' } }, ['Ⅰ', 'Ⅱ', 'Ⅲ'][index]),
                h(
                  'span',
                  { style: { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 } },
                  h('span', { style: { fontSize: '13px' } }, track.title),
                  h('span', { style: { fontSize: '9px', letterSpacing: '.2em', color: 'rgba(159,216,245,.65)', fontFamily: 'ui-monospace, monospace' } }, track.latin || track.subtitle || ''),
                ),
                h(
                  'span',
                  {
                    style: {
                      marginLeft: 'auto',
                      fontSize: '9px',
                      letterSpacing: '.14em',
                      color: track.local === true ? 'rgba(159,216,245,.9)' : 'rgba(227,154,192,.85)',
                      border: '1px solid ' + (track.local === true ? 'rgba(159,216,245,.35)' : 'rgba(227,154,192,.35)'),
                      borderRadius: '999px',
                      padding: '2px 7px',
                    },
                  },
                  track.local === true ? t('deck.local') : t('deck.absent'),
                ),
                active && h('span', { style: { marginLeft: '8px', fontSize: '9px', letterSpacing: '.16em', color: 'rgba(203,182,238,.85)' } }, deckPlaying ? 'PLAYING' : 'SELECTED'),
              )
            }),
          ),
          deckState === null && h('p', { style: hint }, t('deck.missing')),
          h(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: '14px', marginTop: '16px', flexWrap: 'wrap' } },
            h(
              'button',
              {
                type: 'button',
                style: deckState === null ? buttonDisabled : button,
                disabled: deckState === null,
                onClick: function () {
                  if (window.__columbinaDeck) window.__columbinaDeck.toggle()
                },
              },
              deckState !== null && deckState.enabled ? t('deck.toggleOff') : t('deck.toggleOn'),
            ),
            h(
              'label',
              { style: { display: 'flex', alignItems: 'center', gap: '9px', fontSize: '12px', color: 'var(--dsw-alias-label-tertiary)' } },
              t('deck.volume'),
              h('input', {
                type: 'range',
                min: '0',
                max: '100',
                value: deckState === null ? 0 : Math.round(deckState.volume * 100),
                disabled: deckState === null,
                onChange: function (event) {
                  if (window.__columbinaDeck) window.__columbinaDeck.setVolume(Number(event.target.value) / 100)
                },
                style: { width: '130px', accentColor: '#cbb6ee' },
              }),
            ),
            h('span', { style: { ...chip, marginLeft: 'auto' } }, h('span', { style: { ...dot, background: deckPlaying ? 'var(--dsw-alias-state-success-primary)' : 'var(--dsw-alias-label-dimmed)' } }), deckHint),
          ),
          h('p', { style: hint }, t('deck.note')),
          h(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: '9px', marginTop: '10px', flexWrap: 'wrap' } },
            h('span', { style: { ...hint, margin: 0 } }, t('deck.folder')),
            h(
              'code',
              {
                style: {
                  fontSize: '10.5px',
                  color: 'rgba(159,216,245,.85)',
                  background: 'rgba(159,216,245,.08)',
                  padding: '3px 7px',
                  borderRadius: '6px',
                  fontFamily: 'ui-monospace, monospace',
                },
              },
              BGM_DIR,
            ),
            h(
              'button',
              { type: 'button', style: { ...button, padding: '4px 10px', fontSize: '11px' }, onClick: copyFolder },
              folderCopied ? t('deck.copied') : t('deck.copy'),
            ),
          ),
        ),
        h(
          'section',
          { style: { ...card, marginBottom: '16px' } },
          h('h2', { style: cardTitle }, t('action.title')),
          h(
            'div',
            { style: actions },
            h('button', { type: 'button', style: status.state.loading ? buttonDisabled : button, onClick: status.reload, disabled: status.state.loading }, t('action.refresh')),
            h('button', { type: 'button', style: button, onClick: copy }, t('action.copy')),
            copied && h('span', { style: hint }, t('action.copied')),
          ),
          h('p', { style: hint }, t('action.hint')),
        ),
        h(
          'section',
          { style: card },
          h('h2', { style: cardTitle }, t('note.title')),
          h('p', { style: note }, t('note.body')),
        ),
      )
    }

    /** Register the sidebar row and its page through the host's own slots. */
    function apply(ctx) {
      ctx.effect(
        () =>
          ctx.locale.register(NS, {
            zh: zh,
            en: en,
          }),
        'columbina-hub: dictionaries',
      )
      const t = ctx.locale.bind(NS)

      const report = function () {
        let panels = []
        try {
          panels = ctx.slots
            .entriesOfSlot('sidebar.panellist')
            .map(function (entry) {
              return entry && entry.options ? entry.options.id : undefined
            })
            .filter(Boolean)
        } catch (error) {
          panels = []
        }
        const params = new URLSearchParams({ panel: PANEL_ID, panels: panels.join(',') })
        fetch('/columbina-hub/ping?' + params.toString(), { cache: 'no-store' }).catch(function () {})
      }

      ctx.slots.inject('sidebar.panellist', function () {
        return ctx.slots.register(
          {
            name: 'sidebar.panellist',
            id: PANEL_ID,
            order: 15,
            label: function () {
              return t('panel')
            },
            locale: NS,
          },
          MoonMark,
        )
      })

      ctx.slots.inject('main', function* () {
        yield ctx.slots.register(
          {
            name: 'main',
            key: PANEL_ID,
            locale: NS,
            inject: function () {
              return { t: t }
            },
          },
          ColumbinaPage,
        )
      })

      report()
      ctx.effect(
        function () {
          return ctx.slots.subscribe('sidebar.panellist', report)
        },
        'columbina-hub: sidebar report',
      )
    }

    return {
      inject: ['slots', 'locale'],
      apply: apply,
    }
  },
})
