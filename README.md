# 麦麦 HyperOS 4 主题

MaiBot WebUI 的第四种界面风格：HyperOS 蓝、玻璃卡片、底部悬浮底栏、右下角可收起的对话输入。

## 关键：底栏是源码级改造

底栏不再靠 CSS/DOM 搬移，而是改在 dashboard 源码里：

| 文件 | 改动 |
|---|---|
| `dashboard/src/lib/use-hyperos-theme.ts` | 读取 `<html data-hyperos4="on">` 的 hook（MutationObserver 跟随） |
| `dashboard/src/components/observation-layout/ObservationSidebar.tsx` | HyperOS 模式下不渲染标题/分页，并给 nav 打 `data-hyperos4-dock="true"` |

关闭主题时属性为 `off`，该分支完全不渲染，界面与官方一致。

### 重建流程

```bash
python E:\dps\qqbot\tools\build_dashboard.py
```

脚本会：`pnpm install`（首次）→ `vite build` → 备份官方 dist → 部署新 dist。
还原官方界面：`python E:\dps\qqbot\tools\build_dashboard.py --restore`

> dashboard 升级（pip 包版本变化）后需要重新构建，否则会退回官方布局（主题其余部分仍生效）。

## 外观页面板

| 控件 | 说明 |
|---|---|
| 开关 | 等价于选中第四张风格卡片 |
| 强调色 | HyperOS 蓝（默认）/ 小米橙 / 青竹绿 / 暮山紫 / 石墨灰 |
| 悬浮底栏 | 是否把入口做成底部底栏 |
| 底栏透明玻璃 / 底栏模糊 | 玻璃程度与模糊半径 |
| 卡片圆角 / 卡片磨砂 / 背景光晕 | 皮肤质感 |

## 右下角输入条

首页输入条固定在右下角，圆形按钮展开/收起；只在有输入条的页面出现。

## 已知边界

- 底栏依赖源码改动，dashboard 大版本升级需重新构建（脚本已备）
- 输入条仍用 CSS 定位（搬 DOM 会破坏 React 事件）