/* HyperOS 4 主题运行时
 *
 * 外观页「界面风格」里的第四个选项 + 顶部面板 + 底部悬浮底栏。
 *
 * - 选中 HyperOS 4：写入标记，必要时把服务端 webui_style 切到 0（modern）作骨架，应用皮肤。
 * - 选中其它三张：清标记，皮肤关闭，界面交还 dashboard。
 * - 底栏：把侧栏那组功能入口搬到底部悬浮条，玻璃与模糊可调。
 */

(function () {
  'use strict'

  var SETTINGS_KEY = 'hyperos4-theme.settings.v2'
  var ACTIVE_KEY = 'hyperos4-theme.style-active'
  var APP_SELECTED_KEY = 'hyperos4-theme.app-selected-index'
  var PANEL_ID = 'hyperos4-panel'
  var CARD_ID = 'hyperos4-style-card'
  var TARGET_STYLE = 0
  var COMPOSER_KEY = 'hyperos4-theme.composer'
  var FAB_ID = 'hyperos4-composer-fab'

  var ACCENTS = {
    blue: { hue: 217, hue2: 200, label: 'HyperOS 蓝' },
    orange: { hue: 24, hue2: 14, label: '小米橙' },
    green: { hue: 148, hue2: 168, label: '青竹绿' },
    purple: { hue: 268, hue2: 292, label: '暮山紫' },
    graphite: { hue: 220, hue2: 232, label: '石墨灰' },
  }

  var defaults = window.__HYPEROS4_DEFAULT__ || {
    enabled: true,
    accent: 'blue',
    radius: 26,
    blur: 14,
    tint: 100,
    dockEnabled: true,
    dockGlass: true,
    dockBlur: 18,
  }

  function clamp(value, min, max, fallback) {
    var num = Number(value)
    if (!isFinite(num)) return fallback
    return Math.min(max, Math.max(min, num))
  }

  function normalize(raw) {
    var merged = {}
    for (var key in defaults) merged[key] = defaults[key]
    if (raw && typeof raw === 'object') {
      for (var k in merged) {
        if (raw[k] !== undefined) merged[k] = raw[k]
      }
    }
    return {
      enabled: merged.enabled !== false,
      accent: ACCENTS[merged.accent] ? merged.accent : 'blue',
      radius: clamp(merged.radius, 8, 48, 26),
      blur: clamp(merged.blur, 0, 48, 18),
      tint: clamp(merged.tint, 0, 100, 100),
      dockEnabled: merged.dockEnabled !== false,
      dockGlass: merged.dockGlass !== false,
      dockBlur: clamp(merged.dockBlur, 0, 48, 24),
    }
  }

  var settings = (function () {
    try {
      return normalize(JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null'))
    } catch (error) {
      return normalize(null)
    }
  })()

  /* 先落属性，保证 dashboard 首帧渲染就能读到 HyperOS 模式 */
  try {
    document.documentElement.dataset.hyperos4 =
      (localStorage.getItem(ACTIVE_KEY) === '1' && settings.enabled !== false) ? 'on' : 'off'
  } catch (error) {
    document.documentElement.dataset.hyperos4 = 'on'
  }

  function active() {
    /* 默认 opt-in：只有用户显式选中 HyperOS 4 卡片后才生效 */
    return localStorage.getItem(ACTIVE_KEY) === '1' && settings.enabled !== false
  }

  function setActive(value) {
    try {
      localStorage.setItem(ACTIVE_KEY, value ? '1' : '0')
    } catch (error) {
      /* 隐私模式下仅本次会话生效 */
    }
    settings.enabled = value
    apply()
    syncCard()
    syncPanel()
    syncDock()
  }

  function persistSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch (error) {
      /* 隐私模式下仅本次会话生效 */
    }
  }

  var styleCache = Object.create(null)

  function setVarIfChanged(root, name, value) {
    if (styleCache[name] === value) return
    styleCache[name] = value
    root.style.setProperty(name, value)
  }

  function apply() {
    var root = document.documentElement
    var accent = ACCENTS[settings.accent] || ACCENTS.blue
    root.dataset.hyperos4 = active() ? 'on' : 'off'
    root.dataset.hyperos4Dock = active() && settings.dockEnabled ? 'on' : 'off'
    // 只在值真正变化时写变量：每次写入都会触发全站样式重算
    setVarIfChanged(root, '--hyperos4-accent-h', String(accent.hue))
    setVarIfChanged(root, '--hyperos4-accent-h2', String(accent.hue2))
    setVarIfChanged(root, '--hyperos4-radius', settings.radius + 'px')
    setVarIfChanged(root, '--hyperos4-blur', settings.blur + 'px')
    setVarIfChanged(root, '--hyperos4-tint', String(settings.tint / 100))
    setVarIfChanged(root, '--hyperos4-dock-blur', settings.dockBlur + 'px')
    setVarIfChanged(root, '--hyperos4-dock-alpha', settings.dockGlass ? '0.38' : '1')
    if (!active()) {
      /* 主题关闭时把标记类清掉，避免影响其它界面风格 */
      var staleComposer = document.querySelector('.hyperos4-composer')
      if (staleComposer) staleComposer.classList.remove('hyperos4-composer')
      var staleFab = document.getElementById(FAB_ID)
      if (staleFab) staleFab.remove()
    }
  }

  /* ---------------------------------------------------------------- 服务端布局 */

  var styleInFlight = false

  function patchWebuiStyle(value) {
    return fetch('/api/host/settings/appearance', {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-MaiBot-Host': '1' },
      body: JSON.stringify({ webui_style: value }),
    })
  }

  /**
   * 与 dashboard 的界面风格对齐。
   * force=true：用户刚点了 HyperOS 卡片，需要把 webui_style 改成 modern；
   * force=false：开机校验，若当前风格不是 modern（用户选了千禧/未来复古等），
   *              说明主题不该生效，直接停用并把界面交还回去。
   */
  function syncServerStyle(force) {
    if (styleInFlight || location.pathname.startsWith('/auth')) return
    styleInFlight = true
    var release = function () {
      styleInFlight = false
    }
    fetch('/api/host/settings', { credentials: 'same-origin', cache: 'no-store' })
      .then(function (resp) {
        if (!resp.ok) throw new Error('settings ' + resp.status)
        return resp.json()
      })
      .then(function (data) {
        var current = Number((data && data.webui && data.webui.webui_style) || 0)
        if (current === TARGET_STYLE) return null
        if (!force) {
          setActive(false)
          return null
        }
        return patchWebuiStyle(TARGET_STYLE).then(function () {
          location.reload()
        })
      })
      .catch(function (error) {
        if (window.console && console.warn) console.warn('[HyperOS4] 界面风格同步失败：' + error.message)
      })
      .then(release, release)
  }

  /* ---------------------------------------------------------------- 第四张卡片 */

  function el(tag, className, text) {
    var node = document.createElement(tag)
    if (className) node.className = className
    if (text !== undefined) node.textContent = text
    return node
  }

  var ICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" ' +
    'aria-hidden="true">' +
    '<circle cx="12" cy="12" r="8.6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" ' +
    'stroke-dasharray="13.5 4.6" transform="rotate(-90 12 12)" opacity="0.95"/>' +
    '<circle cx="12" cy="12" r="2.6" fill="currentColor"/></svg>'

  var CHECK_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" ' +
    'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M20 6 9 17l-5-5"></path></svg>'

  var CARD_IDLE_CLASS =
    'bg-card hover:border-primary/70 hover:bg-accent/40 flex items-start gap-3 rounded-lg border p-4 text-left transition-all'
  var CARD_ACTIVE_CLASS =
    'flex items-start gap-3 rounded-lg border p-4 text-left transition-all border-primary bg-primary/10 shadow-sm'
  var ICON_IDLE_CLASS =
    'bg-background text-muted-foreground shrink-0 rounded-md border p-2 [&_svg]:h-5 [&_svg]:w-5'
  var ICON_ACTIVE_CLASS =
    'shrink-0 rounded-md border p-2 [&_svg]:h-5 [&_svg]:w-5 border-primary bg-primary text-primary-foreground'

  function styleContainer() {
    var cards = document.querySelectorAll('[data-dashboard-option-card]')
    if (!cards.length) return null
    return cards[0].parentElement
  }

  function appCards() {
    return Array.prototype.filter.call(
      document.querySelectorAll('[data-dashboard-option-card]'),
      function (card) {
        return card.id !== CARD_ID
      }
    )
  }

  function paintAppCards(dimmed) {
    appCards().forEach(function (card) {
      if (!dimmed) return
      var indicator = card.querySelector('[data-option-part="indicator"]')
      var icon = card.querySelector('[data-option-part="icon"]')
      card.setAttribute('aria-pressed', 'false')
      card.className = CARD_IDLE_CLASS
      if (icon) icon.className = ICON_IDLE_CLASS
      if (indicator) {
        indicator.setAttribute('data-selected', 'false')
        indicator.innerHTML = ''
      }
    })
  }

  function syncCard() {
    var card = document.getElementById(CARD_ID)
    if (!card) return
    var isOn = active()
    card.setAttribute('aria-pressed', isOn ? 'true' : 'false')
    card.className = isOn ? CARD_ACTIVE_CLASS : CARD_IDLE_CLASS
    var icon = card.querySelector('[data-option-part="icon"]')
    if (icon) icon.className = isOn ? ICON_ACTIVE_CLASS : ICON_IDLE_CLASS
    var indicator = card.querySelector('[data-option-part="indicator"]')
    if (indicator) {
      indicator.setAttribute('data-selected', isOn ? 'true' : 'false')
      indicator.innerHTML = isOn ? CHECK_SVG : ''
    }
    if (isOn) paintAppCards(true)
  }

  function buildCard() {
    var card = el('button')
    card.type = 'button'
    card.id = CARD_ID
    card.setAttribute('data-dashboard-option-card', 'true')
    card.className = CARD_IDLE_CLASS

    var icon = el('span')
    icon.setAttribute('data-option-part', 'icon')
    icon.className = ICON_IDLE_CLASS
    icon.innerHTML = ICON_SVG

    var text = el('span', 'min-w-0 flex-1 space-y-1')
    text.appendChild(el('span', 'block font-semibold', 'HyperOS 4'))
    text.appendChild(el('span', 'text-muted-foreground block text-sm', '澎湃风格：底栏、玻璃层次与 HyperOS 蓝'))

    var indicator = el('span')
    indicator.setAttribute('data-option-part', 'indicator')
    indicator.setAttribute('aria-hidden', 'true')

    card.appendChild(icon)
    card.appendChild(text)
    card.appendChild(indicator)

    card.addEventListener('click', function () {
      setActive(true)
      syncServerStyle(true)
    })
    return card
  }

  function ensureCard() {
    var container = styleContainer()
    if (!container) return
    if (document.getElementById(CARD_ID)) {
      syncCard()
      return
    }
    container.appendChild(buildCard())
    syncCard()
  }

  function watchAppCardClicks() {
    document.addEventListener(
      'click',
      function (event) {
        var card = event.target && event.target.closest ? event.target.closest('[data-dashboard-option-card]') : null
        if (!card || card.id === CARD_ID) return
        localStorage.setItem(ACTIVE_KEY, '0')
        localStorage.removeItem(APP_SELECTED_KEY)
        apply()
        setTimeout(function () {
          location.reload()
        }, 400)
      },
      true
    )
  }


  /* 兼容模式：官方 dashboard 没有源码改动时，自建底栏 */
  function ensureCompatDock() {
    var root = document.documentElement
    var wanted = active() && settings.dockEnabled
    var native = document.querySelector('ul[data-hyperos4-dock="true"]')
    var dock = document.getElementById('hyperos4-dock')

    if (!wanted || native) {
      if (dock) dock.remove()
      root.removeAttribute('data-hyperos4-dock-compat')
      return
    }
    if (!dock) {
      dock = document.createElement('nav')
      dock.id = 'hyperos4-dock'
      dock.setAttribute('aria-label', 'HyperOS 功能底栏')
      document.body.appendChild(dock)
    }
    root.setAttribute('data-hyperos4-dock-compat', 'on')

    var source = document.querySelector('aside nav ul[data-observation-keys]')
    if (!source) return
    var links = Array.prototype.slice.call(source.querySelectorAll('a')).filter(function (link, index, arr) {
      var href = link.getAttribute('href') || ''
      /* 插件自定义页面不进底栏，避免折叠态下条目翻倍 */
      if (href.indexOf('/extensions') === 0) return false
      return arr.findIndex(function (other) { return other.getAttribute('href') === href }) === index
    })
    if (!links.length) return
    if (dock.dataset.version !== String(links.length)) {
      dock.innerHTML = ''
      links.forEach(function (link) {
        var item = document.createElement('a')
        item.href = link.getAttribute('href') || '/'
        /* 直接克隆源链接的内部结构：图标、短标签、提示点都与原生一致 */
        item.innerHTML = link.innerHTML
        item.setAttribute('aria-label', link.getAttribute('aria-label') || '')
        if (!item.querySelector('[data-observation-key-label]')) {
          var text = document.createElement('span')
          text.textContent = (link.getAttribute('aria-label') || '').replace(/设置$/, '')
          item.appendChild(text)
        }
        item.addEventListener('click', function (event) {
          event.preventDefault()
          var path = new URL(item.href, location.origin).pathname
          if (location.pathname !== path) {
            history.pushState({}, '', item.href)
            window.dispatchEvent(new PopStateEvent('popstate'))
          }
          syncCompatDockActive()
        })
        dock.appendChild(item)
      })
      dock.dataset.version = String(links.length)
    }
    syncCompatDockActive()
    ensureCompatRail()
  }


  /* 兼容模式：折叠侧栏的头像竖列（自取会话数据） */
  var compatBotId = null
  var compatSessions = null

  function compatFetch(path) {
    return fetch(path, { credentials: 'same-origin' }).then(function (r) { return r.json() })
  }

  function resolveBotId() {
    if (compatBotId) return Promise.resolve(compatBotId)
    return compatFetch('/api/host/bots').then(function (data) {
      var bots = (data && data.bots) || []
      var pick = bots.filter(function (b) { return b.status === 'running' })[0] || bots[0]
      compatBotId = pick && pick.bot_id
      return compatBotId
    }).catch(function () { return null })
  }

  function loadCompatSessions() {
    if (compatSessions) return Promise.resolve(compatSessions)
    return resolveBotId().then(function (id) {
      if (!id) return []
      return compatFetch('/api/host/bots/' + id + '/proxy/api/chat/sessions?limit=60&offset=0')
        .then(function (d) { compatSessions = (d && d.sessions) || []; return compatSessions })
        .catch(function () { return [] })
    })
  }

  function compatAvatar(id, session) {
    var isGroup = (session.chat_type || '').indexOf('group') !== -1 || !!session.group_id
    var key = isGroup ? 'group_id' : 'user_id'
    var value = isGroup ? (session.group_id || session.target_id) : (session.user_id || session.target_id)
    if (!value) return ''
    return '/api/host/bots/' + id + '/proxy/api/webui/avatar?platform=' +
      encodeURIComponent(session.platform || 'qq') + '&' + key + '=' + encodeURIComponent(value)
  }

  function compatGo(url) {
    history.pushState({}, '', url)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  function ensureCompatRail() {
    var collapsed = document.querySelector('aside[data-observation-sidebar][data-collapsed="true"]')
    var compat = document.documentElement.getAttribute('data-hyperos4-dock-compat') === 'on'
    var wanted = active() && settings.dockEnabled && compat && !!collapsed
    var rail = document.getElementById('hyperos4-rail')
    if (!wanted) {
      if (rail) rail.remove()
      return
    }
    if (!rail) {
      rail = document.createElement('div')
      rail.id = 'hyperos4-rail'
      rail.setAttribute('aria-label', '会话头像列')
      document.body.appendChild(rail)
    }
    if (rail.dataset.ready === '1') {
      Array.prototype.forEach.call(rail.children, function (btn) {
        btn.dataset.active = btn.dataset.href && location.pathname.indexOf('/chat') === 0 &&
          location.search.indexOf(btn.dataset.session || '###') !== -1 ? 'true' : 'false'
      })
      return
    }
    rail.dataset.ready = '1'
    loadCompatSessions().then(function (list) {
      resolveBotId().then(function (id) {
        rail.innerHTML = ''
        function add(session, labelText) {
          var btn = document.createElement('button')
          btn.type = 'button'
          btn.title = labelText || ''
          var url = session ? compatAvatar(id, session) : ''
          if (url) {
            var img = document.createElement('img')
            img.src = url
            img.alt = labelText || ''
            img.loading = 'lazy'
            btn.appendChild(img)
          } else {
            var span = document.createElement('span')
            span.className = 'hyperos4-rail-fallback'
            span.textContent = (labelText || '?').slice(0, 1)
            btn.appendChild(span)
          }
          var target = session ? '/chat?observe=' + encodeURIComponent(session.session_id) : '/chat'
          btn.dataset.href = target
          btn.dataset.session = session ? session.session_id : ''
          btn.addEventListener('click', function () { compatGo(target) })
          rail.appendChild(btn)
        }
        /* 麦麦自己：用 bot 账号头像 */
        compatFetch('/api/host/bots/' + id + '/proxy/api/chat/info').then(function (info) {
          var qq = info && info.bot_qq
          var first = rail.querySelector('button')
          if (!first || !qq) return
          var img = document.createElement('img')
          img.src = '/api/host/bots/' + id + '/proxy/api/webui/avatar?platform=qq&user_id=' +
            encodeURIComponent(qq)
          img.alt = '麦麦'
          img.loading = 'lazy'
          first.innerHTML = ''
          first.appendChild(img)
        }).catch(function () {})
        add(null, '麦麦')
        list.slice(0, 40).forEach(function (session) {
          add(session, session.display_name || session.user_nickname || session.group_name || '会话')
        })
      })
    })
  }

  function syncCompatDockActive() {
    var dock = document.getElementById('hyperos4-dock')
    if (!dock) return
    Array.prototype.forEach.call(dock.children, function (item) {
      var source = document.querySelector('aside nav ul[data-observation-keys] a[href="' + item.getAttribute('href') + '"]')
      var on = source ? source.getAttribute('data-active') === 'true'
        : (item.href === location.origin + location.pathname)
      item.dataset.active = on ? 'true' : 'false'
    })
  }

  /* 底栏由 dashboard 源码渲染，这里保持空实现 */




  /* 统一字号：把零散的字号吸附到 12/13/14/15/16/18/22/26 这套刻度上 */
  var TYPE_SCALE = [12, 13, 14, 15, 16, 18, 22, 26]

  function snapTypeSize(px) {
    var best = TYPE_SCALE[0]
    var bestGap = Math.abs(px - best)
    for (var i = 1; i < TYPE_SCALE.length; i++) {
      var gap = Math.abs(px - TYPE_SCALE[i])
      if (gap < bestGap) {
        bestGap = gap
        best = TYPE_SCALE[i]
      }
    }
    return best
  }

  var typeDone = typeof WeakSet === 'function' ? new WeakSet() : null

  function normalizeType() {
    if (!active()) return
    var nodes = document.querySelectorAll('body *')
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i]
      if (typeDone && typeDone.has(el)) continue
      if (el.children.length || !el.firstChild || el.firstChild.nodeType !== 3) {
        if (typeDone) typeDone.add(el)
        continue
      }
      var text = (el.textContent || '').trim()
      if (!text) {
        if (typeDone) typeDone.add(el)
        continue
      }
      if (typeDone) typeDone.add(el)
      var cs = getComputedStyle(el)
      var size = parseFloat(cs.fontSize)
      if (!isFinite(size) || size <= 0) continue
      // 超过 30px 的多为展示性大数字/标题，保持原样
      if (size >= 30) continue
      var target = snapTypeSize(size)
      if (Math.abs(target - size) < 0.6) continue
      el.style.setProperty('font-size', target + 'px', 'important')
      el.style.setProperty('line-height', target <= 14 ? '1.55' : '1.4', 'important')
    }
  }

  var lastNormalizeAt = 0
  var lastPagerAt = 0
  var lastPath = ''

  function idleRun(fn) {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(fn, { timeout: 1200 })
    } else {
      setTimeout(fn, 60)
    }
  }

  function runHeavyTasks() {
    var now = Date.now()
    var path = location.pathname
    var routeChanged = path !== lastPath
    if (routeChanged) {
      lastPath = path
      if (typeDone) typeDone = new WeakSet()
    }
    if (routeChanged || now - lastPagerAt > 1200) {
      lastPagerAt = now
      markPager()
      buildNumberPager()
    }
    if (routeChanged || now - lastNormalizeAt > 2500) {
      lastNormalizeAt = now
      idleRun(normalizeType)
    }
  }

  /* 标记分页按钮，便于 CSS 高亮当前页 */
  function markPager() {
    if (!active()) return
    var nodes = document.querySelectorAll('*')
    var label = null
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i]
      if (node.children.length === 0 && (node.textContent || '').trim() === '每页') {
        label = node
        break
      }
    }
    if (!label) return
    var box = label.parentElement
    for (var depth = 0; depth < 3 && box && box.querySelectorAll('button').length < 4; depth++) {
      box = box.parentElement
    }
    if (!box) return
    var buttons = box.querySelectorAll('button')
    for (var j = 0; j < buttons.length; j++) {
      var text = (buttons[j].textContent || '').trim()
      if (/^\d+$/.test(text) || text === '') {
        buttons[j].setAttribute('data-hyperos4-pager', 'true')
      }
    }
  }


  /* 通讯录等页面的数字分页：读取原生「x / y」并渲染胶囊，点击驱动跳页弹窗 */
  function buildNumberPager() {
    if (!active()) return
    var nav = document.querySelector('nav[aria-label="数据分页"]')
    if (!nav) return
    var indicator = nav.querySelector('button[aria-label="跳转到指定页"]')
    if (!indicator) return
    var match = /(\d+)\s*\/\s*(\d+)/.exec(indicator.textContent || '')
    if (!match) return
    var current = Number(match[1])
    var total = Number(match[2])
    if (!total || total < 2) return

    var signature = current + '/' + total
    var host = nav.querySelector('[data-hyperos4-numpager]')
    if (host && host.dataset.signature === signature) return
    if (!host) {
      host = document.createElement('div')
      host.setAttribute('data-hyperos4-numpager', 'true')
      nav.insertBefore(host, nav.firstChild)
    }
    host.dataset.signature = signature
    host.innerHTML = ''
    nav.classList.add('hyperos4-pager-built')

    function jump(page) {
      if (page < 1 || page > total || page === current) return
      document.documentElement.classList.add('hyperos4-pager-busy')
      indicator.click()
      setTimeout(function () {
        var dialog = document.querySelector('[role="dialog"]')
        var input = dialog && dialog.querySelector('input[type="number"]')
        var confirm = dialog && dialog.querySelector('button')
        if (input && confirm) {
          /* React 受控组件需要走原生 setter，否则值不会被状态接收 */
          var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
          setter.call(input, String(page))
          input.dispatchEvent(new Event('input', { bubbles: true }))
          input.dispatchEvent(new Event('change', { bubbles: true }))
          confirm.click()
        }
        setTimeout(function () {
          document.documentElement.classList.remove('hyperos4-pager-busy')
        }, 400)
      }, 60)
    }

    function pill(label, page, opts) {
      var btn = document.createElement('button')
      btn.type = 'button'
      btn.textContent = label
      btn.className = 'hyperos4-numpager-pill'
      if (opts && opts.active) btn.dataset.active = 'true'
      if (opts && opts.edge) btn.dataset.edge = 'true'
      if (opts && opts.disabled) {
        btn.disabled = true
        btn.dataset.disabled = 'true'
      } else {
        btn.addEventListener('click', function () { jump(page) })
      }
      host.appendChild(btn)
    }

    pill('‹', current - 1, { edge: true, disabled: current <= 1 })
    var pages = []
    for (var p = 1; p <= total; p++) {
      if (p === 1 || p === total || Math.abs(p - current) <= 1) pages.push(p)
      else if (pages[pages.length - 1] !== 'gap') pages.push('gap')
    }
    pages.forEach(function (item) {
      if (item === 'gap') {
        var dots = document.createElement('span')
        dots.className = 'hyperos4-numpager-gap'
        dots.textContent = '…'
        host.appendChild(dots)
      } else {
        pill(String(item), item, { active: item === current })
      }
    })
    pill('›', current + 1, { edge: true, disabled: current >= total })
  }

  function syncDock() {}

  /* ---------------------------------------------------------------- 输入条 */

  /* ---------------------------------------------------------------- 输入条 */

  var CHAT_ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V6a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"></path></svg>'
  var CHEVRON_DOWN =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg>'

  function composerExpanded() {
    return localStorage.getItem(COMPOSER_KEY) !== 'collapsed'
  }

  function applyComposerState() {
    document.documentElement.dataset.hyperos4Composer = composerExpanded() ? 'expanded' : 'collapsed'
    var fab = document.getElementById(FAB_ID)
    if (fab) fab.innerHTML = composerExpanded() ? CHEVRON_DOWN : CHAT_ICON
  }

  function toggleComposer() {
    try {
      localStorage.setItem(COMPOSER_KEY, composerExpanded() ? 'collapsed' : 'expanded')
    } catch (error) {
      /* 存不了就只影响本次 */
    }
    applyComposerState()
  }

  /**
   * 收缩按钮只在「有输入条」的页面出现：首页有 composer，其它页面按了也没意义。
   */
  function syncFab() {
    var composer = document.querySelector('.hyperos4-composer')
    var fab = document.getElementById(FAB_ID)
    var wanted = active() && !!composer

    if (!wanted) {
      if (fab) fab.remove()
      return
    }
    if (fab) return
    var button = document.createElement('button')
    button.id = FAB_ID
    button.type = 'button'
    button.title = '展开 / 收起对话输入'
    button.setAttribute('aria-label', '展开或收起对话输入')
    button.addEventListener('click', toggleComposer)
    document.body.appendChild(button)
    applyComposerState()
  }

  function markComposer() {
    if (!active()) {
      var stale = document.querySelector('.hyperos4-composer')
      if (stale) stale.classList.remove('hyperos4-composer')
      return
    }
    var existing = document.querySelector('.hyperos4-composer')
    if (existing) return
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) {
      var text = walker.currentNode.nodeValue || ''
      if (text.indexOf('说点什么') === -1 && text.indexOf('Say something') === -1) continue
      var form = walker.currentNode.parentElement && walker.currentNode.parentElement.closest('form')
      if (form) {
        form.classList.add('hyperos4-composer')
        return
      }
    }
  }

  /* ---------------------------------------------------------------- 设置面板 */

  function buildPanel() {
    var panel = el('section')
    panel.id = PANEL_ID

    var head = el('div', 'hx-head')
    var headText = el('div')
    headText.appendChild(el('div', 'hx-title', 'HyperOS 4 主题'))
    headText.appendChild(
      el('div', 'hx-desc', '在下方「界面风格」里选中 HyperOS 4 才会启用；这里调整配色、底栏与质感')
    )
    head.appendChild(headText)

    var switchBtn = el('button', 'hx-switch')
    switchBtn.type = 'button'
    switchBtn.setAttribute('role', 'switch')
    switchBtn.setAttribute('aria-label', '启用 HyperOS 4 主题')
    head.appendChild(switchBtn)
    panel.appendChild(head)

    var accentRow = el('div', 'hx-row')
    accentRow.appendChild(el('span', 'hx-label', '强调色'))
    var swatches = el('div', 'hx-swatches')
    Object.keys(ACCENTS).forEach(function (key) {
      var accent = ACCENTS[key]
      var swatch = el('button', 'hx-swatch')
      swatch.type = 'button'
      swatch.dataset.accent = key
      swatch.title = accent.label
      swatch.setAttribute('aria-label', accent.label)
      swatch.style.background = 'hsl(' + accent.hue + ' 96% 52%)'
      swatch.addEventListener('click', function () {
        settings.accent = key
        persistSettings()
        apply()
        syncPanel()
      })
      swatches.appendChild(swatch)
    })
    accentRow.appendChild(swatches)
    panel.appendChild(accentRow)

    function slider(key, label, min, max, suffix, after) {
      var row = el('div', 'hx-row')
      row.appendChild(el('span', 'hx-label', label))
      var right = el('div')
      right.style.display = 'flex'
      right.style.alignItems = 'center'
      right.style.gap = '10px'
      var input = document.createElement('input')
      input.type = 'range'
      input.min = String(min)
      input.max = String(max)
      input.step = '1'
      var value = el('span', 'hx-value')
      input.addEventListener('input', function () {
        settings[key] = clamp(input.value, min, max, defaults[key])
        value.textContent = settings[key] + suffix
        persistSettings()
        apply()
        if (after) after()
      })
      right.appendChild(input)
      right.appendChild(value)
      row.appendChild(right)
      panel.appendChild(row)
      return { input: input, value: value }
    }

    function toggle(key, label, after) {
      var row = el('div', 'hx-row')
      row.appendChild(el('span', 'hx-label', label))
      var btn = el('button', 'hx-switch')
      btn.type = 'button'
      btn.setAttribute('role', 'switch')
      btn.setAttribute('aria-label', label)
      btn.addEventListener('click', function () {
        settings[key] = !settings[key]
        persistSettings()
        apply()
        if (after) after()
        sync()
      })
      row.appendChild(btn)
      panel.appendChild(row)
      return btn
    }

    var dockToggle = toggle('dockEnabled', '悬浮底栏', syncDock)
    var glassToggle = toggle('dockGlass', '底栏透明玻璃')
    var radiusCtl = slider('radius', '卡片圆角', 8, 48, 'px')
    var blurCtl = slider('blur', '卡片磨砂模糊', 0, 48, 'px')
    var dockBlurCtl = slider('dockBlur', '底栏模糊', 0, 48, 'px')
    var tintCtl = slider('tint', '背景光晕', 0, 100, '%')

    var footer = el('div', 'hx-row')
    footer.appendChild(el('span', 'hx-desc', '设置保存在本机浏览器；取消选中 HyperOS 4 即恢复原生界面'))
    panel.appendChild(footer)

    switchBtn.addEventListener('click', function () {
      setActive(!active())
      if (active()) syncServerStyle(true)
    })

    function sync() {
      switchBtn.setAttribute('aria-checked', active() ? 'true' : 'false')
      dockToggle.setAttribute('aria-checked', settings.dockEnabled ? 'true' : 'false')
      glassToggle.setAttribute('aria-checked', settings.dockGlass ? 'true' : 'false')
      swatches.querySelectorAll('.hx-swatch').forEach(function (swatch) {
        swatch.setAttribute('aria-pressed', swatch.dataset.accent === settings.accent ? 'true' : 'false')
      })
      radiusCtl.input.value = String(settings.radius)
      radiusCtl.value.textContent = settings.radius + 'px'
      blurCtl.input.value = String(settings.blur)
      blurCtl.value.textContent = settings.blur + 'px'
      dockBlurCtl.input.value = String(settings.dockBlur)
      dockBlurCtl.value.textContent = settings.dockBlur + 'px'
      tintCtl.input.value = String(settings.tint)
      tintCtl.value.textContent = settings.tint + '%'
    }
    sync()
    panel.__sync = sync
    return panel
  }

  function syncPanel() {
    var panel = document.getElementById(PANEL_ID)
    if (panel && panel.__sync) panel.__sync()
  }

  function activeTabPanel() {
    var tabs = document.querySelectorAll('[role="tab"][data-state="active"]')
    for (var i = 0; i < tabs.length; i++) {
      if (/外观|Appearance|外観/.test(tabs[i].textContent || '')) {
        var panels = document.querySelectorAll('[role="tabpanel"][data-state="active"]')
        if (panels.length) return panels[panels.length - 1]
        return null
      }
    }
    return null
  }

  function ensurePanel() {
    var host = activeTabPanel()
    if (!host) return
    var existing = document.getElementById(PANEL_ID)
    if (!existing) {
      host.insertBefore(buildPanel(), host.firstElementChild)
      return
    }
    if (existing.parentElement !== host) {
      host.insertBefore(existing, host.firstElementChild)
    }
  }


  /* 滚动期间临时关闭磨砂，停止滚动后再恢复 */
  var scrollTimer = null

  function watchScroll() {
    if (watchScroll.done) return
    watchScroll.done = true
    var root = document.documentElement
    var onScroll = function () {
      if (root.getAttribute('data-hyperos4-scrolling') !== 'on') {
        root.setAttribute('data-hyperos4-scrolling', 'on')
      }
      if (scrollTimer) clearTimeout(scrollTimer)
      scrollTimer = setTimeout(function () {
        scrollTimer = null
        root.removeAttribute('data-hyperos4-scrolling')
      }, 160)
    }
    window.addEventListener('scroll', onScroll, { passive: true, capture: true })
    document.addEventListener('scroll', onScroll, { passive: true, capture: true })
  }

  var pending = null
  function schedule() {
    if (pending) return
    pending = setTimeout(function () {
      pending = null
      if (document.hidden) return
      apply()
      ensurePanel()
      ensureCard()
      syncDock()
      ensureCompatDock()
      markComposer()
      syncFab()
      runHeavyTasks()
    }, 180)
  }

  function start() {
    apply()
    watchScroll()
    if (active()) syncServerStyle(false)
    watchAppCardClicks()
    ensurePanel()
    ensureCard()
    syncDock()
    markPager()
    buildNumberPager()
    ensureCompatDock()
    markComposer()
    syncFab()
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true })
    window.addEventListener('hashchange', schedule)
    window.addEventListener('popstate', schedule)
    document.addEventListener('click', schedule, true)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start)
  } else {
    start()
  }

  window.__hyperos4 = {
    get settings() {
      return JSON.parse(JSON.stringify(settings))
    },
    get active() {
      return active()
    },
    set: function (patch) {
      settings = normalize(Object.assign({}, settings, patch))
      persistSettings()
      apply()
      syncPanel()
      syncDock()
    },
    enable: function (value) {
      setActive(!!value)
      if (active()) syncServerStyle(true)
    },
  }
})()
