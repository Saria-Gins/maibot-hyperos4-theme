# 麦麦 HyperOS 4 主题

为 [MaiBot](https://github.com/Mai-with-u/MaiBot) WebUI 提供的第四种界面风格：HyperOS 蓝、MiSans 字体、玻璃质感与底部悬浮底栏。

风格只在选中「HyperOS 4」时生效，切回现代 / 未来复古 / 千禧时界面与官方完全一致。

---

## 特性

- **内置 MiSans 字体**：Regular / Medium / Demibold 三档、300 个 woff2 切片（约 5.8 MB），离线可用，按需加载
- **HyperOS 蓝**：主强调色 `hsl(217 96% 50%)`，另有橙 / 绿 / 紫 / 灰四色可选
- **大圆角与柔和阴影**：卡片 28px、侧栏 28px、控件胶囊形
- **悬浮侧栏**：玻璃模糊 + 四周留白，不再是贴边整块
- **底部悬浮底栏**：8 个入口做成 macOS 式底栏，可开关
- **右下角对话条**：固定在右下角，圆形按钮展开 / 收起
- **折叠头像列**：侧栏折叠后直接显示头像竖列，滚轮可滑，不再弹窗

---

## 安装

### 方式一：插件市场（推荐）

1. 打开 WebUI → **插件** → **市场**
2. 搜索 `HyperOS` 或 `HyperOS 4 主题`
3. 点安装，装完重启麦麦

### 方式二：手动 clone

```bash
cd MaiBot/plugins
git clone https://github.com/Saria-Gins/maibot-hyperos4-theme.git local_dps_hyperos4_theme
```

重启麦麦。

### 方式三：下载压缩包

1. 到 [Releases](https://github.com/Saria-Gins/maibot-hyperos4-theme/releases) 下载对应版本的 Source code (zip)
2. 解压到 `MaiBot/plugins/local_dps_hyperos4_theme/`
3. 确认该目录下能直接看到 `_manifest.json`、`plugin.py`
4. 重启麦麦

### 环境要求

| 项 | 版本 |
|---|---|
| MaiBot | 1.4.0 ~ 1.4.99 |
| Plugin SDK | 2.20.0 ~ 2.99.99 |
| Dashboard | 1.10.x |

---

## 使用

### 启用主题

1. 打开 WebUI → **设置** → **外观**
2. 在「界面风格」里选中第四张卡片 **HyperOS 4**
3. 页面会自动切到现代风格作为骨架，并载入主题样式

> 主题**默认不生效**：装好后如果没选中这张卡片，界面与官方完全一致。
> 选中后会被记住，下次打开自动生效；取消选中即恢复原生界面。

### 主题面板

选中卡片后，上方会出现「HyperOS 4 主题」面板：

| 控件 | 说明 | 默认 |
|---|---|---|
| 开关 | 等价于选中第四张风格卡片 | 开 |
| 强调色 | 蓝 / 橙 / 绿 / 紫 / 灰 | 蓝 |
| 悬浮底栏 | 8 个入口做成底部底栏 | 开 |
| 底栏透明玻璃 | 底栏背景是否半透明玻璃 | 开 |
| 卡片圆角 | 卡片圆角大小 | 26px |
| 卡片磨砂模糊 | 卡片背景模糊强度 | 18px |
| 底栏模糊 | 底栏背景模糊强度 | 24px |
| 背景光晕 | 页面背景光晕强度 | 100% |

所有设置保存在浏览器 localStorage，换浏览器或清缓存会重置。

### 底栏与折叠的行为

| 悬浮底栏 | 侧栏展开 | 侧栏折叠 |
|---|---|---|
| 开 | 侧栏会话列表 + 底部悬浮底栏 | 头像竖列（滚轮可滑） |
| 关 | 入口回到侧栏（HyperOS 药丸样式） | dashboard 原生折叠样式 |

### 右下角对话条

首页右下角固定一个对话输入条，圆形按钮切换展开 / 收起：

- 只在存在输入条的页面出现
- 状态会记住

---

## 安装后是源码模式还是兼容模式

插件内置了一份打好补丁的 dashboard 构建（`dashboard/hyperos4-dashboard-<版本>.zip`）。

- **dashboard 版本一致** → 插件启动时把内置构建铺进 `dist`，直接获得源码模式（底栏由 dashboard 渲染），首次会备份官方 dist，卸载自动还原
- **版本不一致** → 不动你的 `dist`，自动使用兼容模式（插件自建底栏与头像列）

也就是说**市场安装后默认就是源码模式，不需要你构建任何东西**。

## 关于「悬浮底栏」的实现

底栏有两种运行方式，插件会自动选择：

| 环境 | 行为 |
|---|---|
| 官方 dashboard | **兼容模式**：插件自建底栏，隐藏侧栏入口网格，会话列表保持完整 |
| 打过补丁的 dashboard | **原生模式**：底栏由 dashboard 源码渲染，与侧栏共用路由与激活态 |

也就是说，**从市场安装后底栏开箱可用**，不需要你改任何前端代码。

兼容模式与原生模式的差异：

- 兼容模式点击底栏会走一次 SPA 内的 history 跳转（页面不整刷）
- 原生模式的激活态样式更贴合 dashboard 内部路由

如果你自己维护 dashboard 源码，想要原生模式，需要三处改动：

1. 新增 `dashboard/src/lib/use-hyperos-theme.ts`：读取 `<html data-hyperos4="on">` 与 `data-hyperos4-dock` 的 hook
2. `ObservationSidebar.tsx`：HyperOS 底栏模式下不渲染标题行，并给导航 `<ul>` 打 `data-hyperos4-dock="true"`
3. `ObservationConversations.tsx`：折叠且底栏开启时，用内联头像列表替代弹窗

构建：

```bash
cd MaiBot/dashboard
pnpm install --config.node-linker=hoisted
node node_modules/vite/bin/vite.js build
# 产物在 dashboard/dist，替换到 maibot_dashboard 包的 dist 目录
```

> dashboard 升级后需要重新构建，否则会回落到兼容模式（底栏仍可用，只是由插件渲染）。

## 常见问题

**字体没变成 MiSans？**

- 强制刷新一次（Ctrl+F5）
- 确认 `maibot_dashboard/dist/fonts/misans/` 下有 `*.woff2`
- 插件自定义页面是沙箱 iframe，主题管不到那层

**开关底栏没反应？**

- 确认是在 `设置 → 外观` 里切换的开关
- 底栏依赖源码改动，见上一节

**切到别的风格后界面乱了？**

- 主题是 opt-in 的，正常不会影响其它风格；如果出现异常，Ctrl+F5 强制刷新

**卸载后字体还在？**

- 从 6.1.2 起，卸载会清理 `dist/fonts/misans/`；更早版本需要手动删除该目录

---

## 卸载

1. WebUI → 插件 → 卸载
2. 或在 `MaiBot/plugins/` 下删除 `local_dps_hyperos4_theme` 目录
3. 重启麦麦

卸载会自动移除注入的样式、脚本与字体；浏览器里的 localStorage 设置需手动清理（可选）。

---

## 目录结构

```
.
├── _manifest.json          # manifest v2
├── plugin.py               # 注入 / 移除样式与字体
├── config.py               # 默认参数
├── theme/
│   ├── hyperos4.css        # 主题样式
│   ├── dock.css            # 底栏与折叠列表样式
│   └── hyperos4.js         # 面板、输入条、状态同步
└── fonts/
    ├── misans.css          # @font-face 定义（绝对路径）
    └── misans/*.woff2      # 300 个字体切片
```

---

## 开发

```bash
# 本地改完 CSS/JS 后重新注入（无需重启麦麦，刷新浏览器即可）
python tools/apply_hyper2.py

# 浏览器验证需要 playwright chromium
# 主题状态可通过 window.__hyperos4 读写
```

`window.__hyperos4.set({ dockEnabled: false })` 可在控制台快速切换底栏，便于排查。

---

## 许可

[MIT](./LICENSE)

字体文件来自小米 MiSans（官方免费商用），版权归小米所有。
