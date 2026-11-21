# 麦麦 HyperOS 4 主题

<p align="center">
  <img src="./assets/icon.png" alt="麦麦 HyperOS 4 主题" width="120" />
</p>

为 [MaiBot](https://github.com/Mai-with-u/MaiBot) WebUI 提供的第四种界面风格：HyperOS 蓝、MiSans 字体、玻璃质感与底部悬浮底栏。

风格只在选中「HyperOS 4」时生效；切回现代 / 未来复古 / 千禧时，界面与官方完全一致。

- 当前版本：**6.6.3**
- 适配：MaiBot 1.4.4 ~ 1.4.99 · Dashboard 1.10.x · Plugin SDK 2.20.0 ~ 2.99.99

---

## 特性

### 视觉

- **内置 MiSans 字体**：Regular / Medium / Demibold 三档、300 个 woff2 切片（约 5.8 MB），离线可用，按需加载
- **HyperOS 蓝**：主强调色 `hsl(217 96% 50%)`，另有橙 / 绿 / 紫 / 石墨四色可选
- **大圆角与柔和阴影**：卡片 28px、侧栏 28px、控件胶囊形
- **悬浮侧栏**：玻璃模糊 + 四周留白，不再是贴边整块
- **底部悬浮底栏**：8 个入口做成 macOS 式底栏，可开关
- **右下角对话条**：固定在右下角，圆形按钮展开 / 收起
- **折叠头像列**：侧栏折叠后直接显示头像竖列，滚轮可滑，不再弹窗

### 交互

- **分页当前页高亮**：列表页（学习 / 表达方式等）的数字分页，当前页用主色实心 + 白字
- **统一数字分页**：通讯录、日志等「‹ 1 / 29 ›」式分页，自动补成 `‹ 1 2 3 … 29 ›` 胶囊，与学习页一致
- **界面风格卡片图标**：HyperOS 4 卡片使用 HyperOS 环形标记（三段弧 + 中心点），随选中态变色
- **插件图标**：`assets/icon.png`，深色底 + 三色弧环，插件列表与详情页生效
- **折叠侧栏头像列**：40×40 圆角方块、12px 间距，hover 1px 淡蓝、选中 2px 实蓝，麦麦自己也有一张

### 全站打磨（6.6.3）

- **卡片**：22px 圆角、发丝描边、双层柔和阴影；内嵌小卡 16px 且不叠阴影
- **控件**：输入框 14px 圆角 + 聚焦主色光晕；按钮统一 14px 圆角；分类标签胶囊化
- **列表**：表格行悬停染色、分隔线统一发丝色
- **细节**：滚动条细条圆角、焦点环 2px 主色、标题字距收紧

### 字号统一（6.6.3）

全站字号吸附到一套刻度，避免同级别文字忽大忽小：

| 层级 | 字号 | 行高 |
|---|---|---|
| 辅助信息 | 12px | 1.55 |
| 次要文本 | 13px | 1.55 |
| 正文 | 14px | 1.55 |
| 小标题 | 15 / 16px | 1.4 |
| 区块标题 | 18 / 22px | 1.4 |
| 展示数字 | 保持原样（≥30px） | — |

---

## 截图

| 首页 | 外观设置 |
|---|---|
| 玻璃底栏 + 卡片圆角 | 界面风格四选一 + 主题面板 |

---

## 安装

### 方式一：插件市场（推荐）

1. 打开 WebUI → **插件** → **市场**
2. 搜索 `HyperOS` 或 `麦麦 HyperOS 4 主题`
3. 点安装，装完重启麦麦

### 方式二：手动 clone

```bash
cd MaiBot/plugins
git clone https://github.com/Saria-Gins/maibot-hyperos4-theme.git local_dps_hyperos4_theme
```

重启麦麦。

### 方式三：下载压缩包

1. 到 [Releases](https://github.com/Saria-Gins/maibot-hyperos4-theme/releases) 下载 **`maibot-hyperos4-theme-v<版本>.zip`**
2. 在 `MaiBot/plugins/` 下新建目录 `local_dps_hyperos4_theme`
3. 把 zip 内容解压到该目录，确认根下能直接看到 `_manifest.json`、`plugin.py`
4. 重启麦麦

> 每个 tag 发布时由 GitHub Actions 自动构建该 zip（含字体与内置 dashboard 构建，约 15 MB）。

### 环境要求

| 项 | 版本 |
|---|---|
| MaiBot | 1.4.4 ~ 1.4.99 |
| Plugin SDK | 2.20.0 ~ 2.99.99 |
| Dashboard | 1.10.x（内置构建为 1.10.8） |

---

## 使用

### 启用主题

1. 打开 WebUI → **设置** → **外观**
2. 在「界面风格」里选中第四张卡片 **HyperOS 4**（图标是环形标记）
3. 页面会自动切到现代风格作为骨架，并载入主题样式

> 主题**默认不生效**：装好后如果没选中这张卡片，界面与官方完全一致。
> 选中后会被记住，下次打开自动生效；取消选中即恢复原生界面。

### 主题面板

选中卡片后，上方会出现「HyperOS 4 主题」面板：

| 控件 | 说明 | 默认 |
|---|---|---|
| 开关 | 等价于选中第四张风格卡片 | 开 |
| 强调色 | 蓝 / 橙 / 绿 / 紫 / 石墨 | 蓝 |
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

### 分页

| 页面 | 分页形式 | 主题处理 |
|---|---|---|
| 学习、表达方式、插件市场列表 | 逐页数字按钮 | 当前页主色实心 + 白字，其余浅灰 |
| 通讯录、日志、数据等 | `‹ 1 / 29 ›` 文本式 | 自动补成 `‹ 1 2 3 … 29 ›` 胶囊，点击驱动原生跳页 |

数字分页是 DOM 层增强：页面切换后自动重建，总数变化（搜索过滤）会重算，不会与原生翻页冲突。

---

## 安装后是源码模式还是兼容模式

插件内置了一份打好补丁的 dashboard 构建（`dashboard/hyperos4-dashboard-<版本>.zip`）。

- **dashboard 版本一致** → 插件启动时把内置构建铺进 `dist`，直接获得源码模式（底栏由 dashboard 渲染）
- **版本不一致** → 不动你的 `dist`，自动使用兼容模式（插件自建底栏与头像列）

也就是说**市场安装后默认就是源码模式，不需要你构建任何东西**。

### 备份与还原

| 时机 | 行为 |
|---|---|
| 首次部署（dist 未被插件接管） | 备份官方 dist 为 `maibot_dashboard_dist_official-<版本>.zip` |
| 已部署过（存在 `.hyperos4-build-*` 标记） | 不再重复备份，避免把插件构建误存为官方 |
| 停用 / 卸载 | 优先按当前 dashboard 版本还原，缺失则回退最近一份备份 |
| 字体 | 卸载时清理 `dist/fonts/misans/`，不动其它字体目录 |

跨 dashboard 版本升级后卸载，还原的是**对应版本**的官方构建，不会退回旧版。

## 关于「悬浮底栏」的实现

底栏有两种运行方式，插件会自动选择：

| 环境 | 行为 |
|---|---|
| 官方 dashboard | **兼容模式**：插件自建底栏，隐藏侧栏入口网格，会话列表保持完整 |
| 打过补丁的 dashboard | **原生模式**：底栏由 dashboard 源码渲染，与侧栏共用路由与激活态 |

兼容模式与原生模式的差异：

- 兼容模式点击底栏会走一次 SPA 内的 history 跳转（页面不整刷）
- 原生模式的激活态样式更贴合 dashboard 内部路由

如果你自己维护 dashboard 源码，想要原生模式，需要三处改动：

1. 新增 `dashboard/src/lib/use-hyperos-theme.ts`：读取 `<html data-hyperos4="on">` 与 `data-hyperos4-dock` 的 hook（`useHyperosTheme` / `useHyperosDock`）
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

---

## 目录结构

```
.
├── _manifest.json                      # manifest v2（含 display.icon）
├── plugin.py                           # 注入 / 移除样式、字体与内置构建
├── config.py                           # 默认参数
├── assets/
│   ├── icon.png                        # 插件图标（512×512）
│   └── icon.svg                        # 同款矢量
├── theme/
│   ├── hyperos4.css                    # 主题样式（含分页高亮）
│   ├── dock.css                        # 底栏与折叠列表样式
│   └── hyperos4.js                     # 面板、输入条、分页增强、状态同步
├── fonts/
│   ├── misans.css                      # @font-face 定义
│   └── misans/*.woff2                  # 300 个字体切片
└── dashboard/
    ├── build.json                      # 内置构建元数据（版本 / 哈希 / 文件数）
    └── hyperos4-dashboard-<版本>.zip   # 打好补丁的 dashboard dist
```

---

## 常见问题

**字体没变成 MiSans？**

- 强制刷新一次（Ctrl+F5）
- 确认 `maibot_dashboard/dist/fonts/misans/` 下有 `*.woff2`
- 插件自定义页面是沙箱 iframe，主题管不到那层

**开关底栏没反应？**

- 确认是在 `设置 → 外观` 里切换的开关
- 底栏依赖源码改动，见「关于悬浮底栏的实现」

**分页没有变成胶囊？**

- 学习页是原生逐页按钮，只做高亮；通讯录等文本式分页才会补成数字胶囊
- 若列表不足一页（只有 1 页），不生成数字分页

**切到别的风格后界面乱了？**

- 主题是 opt-in 的，正常不会影响其它风格；如果出现异常，Ctrl+F5 强制刷新

**卸载后字体还在？**

- 从 6.1.2 起，卸载会清理 `dist/fonts/misans/`；更早版本需要手动删除该目录

**卸载后界面回不去官方？**

- 6.6.1 起按 dashboard 版本备份官方 dist，卸载会还原对应版本；更早版本可能还原成旧构建

---

## 卸载

1. WebUI → 插件 → 卸载
2. 或在 `MaiBot/plugins/` 下删除 `local_dps_hyperos4_theme` 目录
3. 重启麦麦

卸载会自动移除注入的样式、脚本、字体与内置构建，并按版本还原官方 dist；浏览器里的 localStorage 设置需手动清理（可选）。

---

## 开发

```bash
# 本地改完 CSS/JS 后重新注入（无需重启麦麦，刷新浏览器即可）
python tools/apply_hyper2.py

# 重新打包内置 dashboard 构建
python tools/pack_dashboard.py
```

`window.__hyperos4.set({ dockEnabled: false })` 可在控制台快速切换底栏，便于排查。

---

## 更新日志

完整的版本记录见 [CHANGELOG.md](./CHANGELOG.md)。

---

## 许可

[MIT](./LICENSE)

字体文件来自小米 MiSans（官方免费商用），版权归小米所有。
