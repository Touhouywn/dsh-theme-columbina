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
      'row.persona': '当前人格',
      'state.online': '主题在线',
      'state.offline': '主题未响应',
      'state.loading': '读取中…',
      'deck.title': '月之摇篮曲',
      'deck.subtitle': '三首摇篮曲，任选一首在主界面循环。',
      'deck.on': '播放中',
      'deck.off': '已关闭',
      'deck.blocked': '等待点击播放',
      'deck.offline': '暂时无法连接网易云',
      'deck.toggleOn': '开启背景音乐',
      'deck.toggleOff': '关闭背景音乐',
      'deck.volume': '音量',
      'deck.missing': '主题播放器未挂载：确认 dsh-theme-columbina 已启用。',
      'deck.note': '音频由本机通过 /theme-columbina/music 实时代理，不随仓库分发；离线时播放器保持静音。',
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
      'action.hint': '重播会重新加载当前页面并强制播放一次开屏。',
      'on': '已启用',
      'off': '未启用',
      'note.title': '说明',
      'note.body': '这个入口只读取 /theme-columbina/status、驱动主题自带的播放器、切换语气插件的开关注册，并可重播开屏；不会修改 DSH 核心、配置文件或其他插件。',
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
      'row.persona': 'Current voice',
      'state.online': 'Theme online',
      'state.offline': 'Theme not responding',
      'state.loading': 'Reading…',
      'deck.title': 'Lullaby deck',
      'deck.subtitle': 'Three lullabies; pick the one that loops in the main window.',
      'deck.on': 'Playing',
      'deck.off': 'Muted',
      'deck.blocked': 'Click to start',
      'deck.offline': 'NetEase unreachable',
      'deck.toggleOn': 'Turn music on',
      'deck.toggleOff': 'Turn music off',
      'deck.volume': 'Volume',
      'deck.missing': 'Player not mounted: make sure dsh-theme-columbina is enabled.',
      'deck.note': 'Audio is proxied live by this host through /theme-columbina/music and is never shipped with the repository.',
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
      'action.hint': 'Replay reloads the page and forces the opening once.',
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
      color: 'var(--dsw-alias-label-primary)',
      fontFamily: 'var(--dsw-font-family, system-ui, -apple-system, "Segoe UI", sans-serif)',
    }
    const header = { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '22px' }
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

    /** The page itself. */
    function ColumbinaPage(props) {
      const t = props && props.t ? props.t : function (key) {
        return key
      }
      const status = useStatus()
      const deck = useDeck()
      const persona = usePersona()
      const [copied, setCopied] = React.useState(false)

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
            h('div', { style: rowLast }, h('span', { style: rowLabel }, t('row.opening')), h('span', { style: rowValue }, report ? report.opening || '—' : '—')),
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
                  key: track.id,
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
                active && h('span', { style: { marginLeft: 'auto', fontSize: '10px', letterSpacing: '.16em', color: 'rgba(203,182,238,.85)' } }, deckPlaying ? 'PLAYING' : 'SELECTED'),
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
        ),
        h(
          'section',
          { style: { ...card, marginBottom: '16px' } },
          h('h2', { style: cardTitle }, t('action.title')),
          h(
            'div',
            { style: actions },
            h('button', { type: 'button', style: status.state.loading ? buttonDisabled : button, onClick: status.reload, disabled: status.state.loading }, t('action.refresh')),
            h('button', { type: 'button', style: button, onClick: replay }, t('action.replay')),
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
