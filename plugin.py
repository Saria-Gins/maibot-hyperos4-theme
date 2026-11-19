# -*- coding: utf-8 -*-
"""HyperOS 4 风格主题：往 dashboard 的 index.html 注入样式与设置面板脚本。

dashboard 的自定义 CSS 存在浏览器 localStorage，插件页面又是 iframe，服务端拿不到主界面 DOM。
这里只做两件事：注入一段受控样式块（全局生效）+ 一段脚本（把设置面板挂进「设置 → 外观」）。
不改资产文件名、不改 JS 构建产物，dashboard 升级后重新注入即可。
"""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path
from typing import Any, Dict

from maibot_sdk import CONFIG_RELOAD_SCOPE_SELF, MaiBotPlugin

from .config import HyperOS4ThemeConfig

logger = logging.getLogger(__name__)

STYLE_ID = "hyperos4-theme-style"
SCRIPT_ID = "hyperos4-theme-script"
FONT_LINK_ID = "hyperos4-fonts"
FONTS_SRC = Path(__file__).parent / "fonts"
BUILD_SRC = Path(__file__).parent / "dashboard"
STYLE_RE = re.compile(rf"\n?<style id=\"{STYLE_ID}\"[^>]*>.*?</style>", re.S)
SCRIPT_RE = re.compile(rf"\n?<script id=\"{SCRIPT_ID}\"[^>]*>.*?</script>", re.S)
FONT_LINK_RE = re.compile(rf"\n?<link id=\"{FONT_LINK_ID}\"[^>]*>")

ASSET_DIR = Path(__file__).parent / "theme"
CSS_FILE = ASSET_DIR / "hyperos4.css"
DOCK_CSS_FILE = ASSET_DIR / "dock.css"
JS_FILE = ASSET_DIR / "hyperos4.js"

ACCENTS: Dict[str, tuple[int, int]] = {
    "orange": (24, 14),
    "blue": (214, 200),
    "green": (148, 168),
    "purple": (268, 292),
    "graphite": (220, 232),
}


class HyperOS4ThemePlugin(MaiBotPlugin):
    """管理 index.html 里的主题样式块与面板脚本。"""

    config_model = HyperOS4ThemeConfig

    async def on_load(self) -> None:
        self._apply()

    async def on_unload(self) -> None:
        removed = self._remove()
        logger.info("[HyperOS4] 卸载完成，移除注入=%s；请刷新 WebUI", removed)

    async def on_config_update(self, scope: str, config_data: Dict[str, Any], version: str) -> None:
        del config_data, version
        if scope == CONFIG_RELOAD_SCOPE_SELF:
            self._apply()

    # ------------------------------------------------------------------ 内部

    def _dist_index(self) -> Path:
        from maibot_dashboard import get_dist_path

        return Path(get_dist_path()).resolve() / "index.html"

    def _defaults(self) -> Dict[str, Any]:
        theme = self.config.theme
        accent = theme.accent.strip().lower()
        return {
            "enabled": bool(self.config.plugin.enabled),
            "accent": accent if accent in ACCENTS else "blue",
            "dockEnabled": bool(self.config.theme.dock_enabled),
            "dockGlass": bool(self.config.theme.dock_glass),
            "dockBlur": max(0, min(48, int(self.config.theme.dock_blur))),
            "radius": max(8, min(48, int(theme.radius_px))),
            "blur": max(0, min(48, int(theme.blur_px))),
            "tint": max(0, min(100, int(theme.tint_strength))),
        }

    def _build_style(self, defaults: Dict[str, Any]) -> str:
        """样式块：先给变量默认值，再附完整皮肤（无 JS 时也能生效）。"""

        hue, hue2 = ACCENTS[defaults["accent"]]
        preamble = (
            "html{"
            f"--hyperos4-accent-h:{hue};"
            f"--hyperos4-accent-h2:{hue2};"
            f"--hyperos4-radius:{defaults['radius']}px;"
            f"--hyperos4-blur:{defaults['blur']}px;"
            f"--hyperos4-tint:{defaults['tint'] / 100};"
            f"--hyperos4-dock-blur:{defaults['dockBlur']}px;"
            f"--hyperos4-dock-alpha:{0.38 if defaults['dockGlass'] else 1};"
            "}\n"
        )
        return (
            preamble
            + CSS_FILE.read_text(encoding="utf-8")
            + "\n"
            + DOCK_CSS_FILE.read_text(encoding="utf-8")
        )

    def _build_script(self, defaults: Dict[str, Any]) -> str:
        payload = json.dumps(defaults, ensure_ascii=False)
        return f"window.__HYPEROS4_DEFAULT__ = {payload};\n" + JS_FILE.read_text(encoding="utf-8")


    def _install_fonts(self, dist: Path) -> bool:
        """把 MiSans 字体与样式拷进 dashboard 的静态目录，返回是否可用。"""

        src_dir = FONTS_SRC / "misans"
        css = FONTS_SRC / "misans.css"
        if not src_dir.is_dir() or not css.is_file():
            return False
        dst_dir = dist / "fonts" / "misans"
        dst_dir.mkdir(parents=True, exist_ok=True)
        for item in src_dir.iterdir():
            if item.suffix != ".woff2":
                continue
            target = dst_dir / item.name
            if target.exists() and target.stat().st_size == item.stat().st_size:
                continue
            target.write_bytes(item.read_bytes())
        dst_css = dst_dir / "misans.css"
        if not dst_css.exists() or dst_css.stat().st_size != css.stat().st_size:
            dst_css.write_bytes(css.read_bytes())
        return True


    # ---------------------------------------------------------------- 源码模式

    def _installed_dashboard_version(self) -> str | None:
        try:
            from importlib.metadata import version

            return version("maibot-dashboard")
        except Exception:
            return None

    def _build_meta(self) -> dict | None:
        meta_file = BUILD_SRC / "build.json"
        if not meta_file.is_file():
            return None
        try:
            import json

            return json.loads(meta_file.read_text(encoding="utf-8"))
        except Exception:
            return None

    def _deploy_dashboard_build(self) -> str:
        """dashboard 版本匹配时，把插件内置的构建铺进 dist，直接获得源码模式。

        返回状态字符串：deployed / skipped-version / skipped-no-build / failed
        """

        meta = self._build_meta()
        if not meta:
            return "skipped-no-build"
        target_version = str(meta.get("dashboard_version") or "")
        installed = self._installed_dashboard_version()
        if not installed or (target_version and installed != target_version):
            return "skipped-version"

        import shutil
        import zipfile

        index = self._dist_index()
        dist = index.parent
        marker = dist / f".hyperos4-build-{target_version}"
        if marker.is_file():
            return "deployed"

        zip_path = BUILD_SRC / str(meta.get("zip") or "")
        if not zip_path.is_file():
            return "skipped-no-build"

        backup = dist.parent / "maibot_dashboard_dist_official.zip"
        if not backup.is_file():
            tmp = backup.with_suffix(".tmp")
            with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zf:
                for item in dist.rglob("*"):
                    if item.is_file():
                        zf.write(item, item.relative_to(dist))
            tmp.replace(backup)

        staging = dist.parent / "maibot_dashboard_dist_staging"
        if staging.exists():
            shutil.rmtree(staging)
        staging.mkdir(parents=True)
        with zipfile.ZipFile(zip_path) as zf:
            zf.extractall(staging)

        for item in dist.iterdir():
            if item.name in {"fonts"}:
                continue
            if item.is_dir():
                shutil.rmtree(item, ignore_errors=True)
            else:
                item.unlink(missing_ok=True)
        for item in staging.iterdir():
            if item.name == "fonts":
                continue
            target = dist / item.name
            if target.is_dir():
                shutil.rmtree(target, ignore_errors=True)
            shutil.move(str(item), str(target))
        shutil.rmtree(staging, ignore_errors=True)

        marker.write_text(target_version, encoding="utf-8")
        return "deployed"

    def _restore_dashboard_build(self) -> bool:
        """卸载时把官方 dist 还原回去。"""

        import shutil
        import zipfile

        index = self._dist_index()
        dist = index.parent
        backup = dist.parent / "maibot_dashboard_dist_official.zip"
        if not backup.is_file():
            return False
        staging = dist.parent / "maibot_dashboard_dist_restore"
        if staging.exists():
            shutil.rmtree(staging)
        staging.mkdir(parents=True)
        with zipfile.ZipFile(backup) as zf:
            zf.extractall(staging)
        for item in dist.iterdir():
            if item.name == "fonts":
                continue
            if item.is_dir():
                shutil.rmtree(item, ignore_errors=True)
            else:
                item.unlink(missing_ok=True)
        for item in staging.iterdir():
            if item.name == "fonts":
                continue
            target = dist / item.name
            if target.is_dir():
                shutil.rmtree(target, ignore_errors=True)
            shutil.move(str(item), str(target))
        shutil.rmtree(staging, ignore_errors=True)
        for marker in dist.glob(".hyperos4-build-*"):
            marker.unlink(missing_ok=True)
        return True

    def _apply(self) -> None:
        index = self._dist_index()
        if not index.is_file():
            logger.warning("[HyperOS4] 找不到 dashboard 的 index.html：%s", index)
            return

        status = self._deploy_dashboard_build()
        if status == "deployed":
            logger.info("HyperOS 4：已应用内置 dashboard 构建（源码模式）")
        elif status == "skipped-version":
            logger.info("HyperOS 4：dashboard 版本不匹配，使用兼容模式底栏")
        html = index.read_text(encoding="utf-8")
        html_without = FONT_LINK_RE.sub("", SCRIPT_RE.sub("", STYLE_RE.sub("", html)))

        if not self.config.plugin.enabled:
            if html_without != html:
                index.write_text(html_without, encoding="utf-8")
                logger.info("[HyperOS4] 插件已停用，注入内容已移除")
            return

        if "</head>" not in html_without:
            logger.warning("[HyperOS4] index.html 缺少 </head>，跳过注入")
            return

        defaults = self._defaults()
        style_tag = (
            f'\n<style id="{STYLE_ID}" data-plugin="local.dps.hyperos4-theme">\n'
            f"{self._build_style(defaults)}</style>"
        )
        script_tag = (
            f'\n<script id="{SCRIPT_ID}" data-plugin="local.dps.hyperos4-theme">\n'
            f"{self._build_script(defaults)}</script>"
        )
        font_link = ""
        if self._install_fonts(index.parent):
            font_link = f'\n<link id="{FONT_LINK_ID}" rel="stylesheet" href="/fonts/misans/misans.css">'
        updated = html_without.replace("</head>", f"{font_link}{style_tag}{script_tag}</head>", 1)

        if updated == html:
            logger.info("[HyperOS4] 注入内容已是最新")
            return
        index.write_text(updated, encoding="utf-8")
        logger.info(
            "[HyperOS4] 主题已注入（强调色=%s，圆角=%spx，模糊=%spx）",
            defaults["accent"], defaults["radius"], defaults["blur"],
        )


    def _uninstall_fonts(self) -> None:
        """卸载时清理拷进 dist 的字体，只动本插件自己的目录。"""

        index = self._dist_index()
        target = index.parent / "fonts" / "misans"
        if not target.is_dir():
            return
        for item in target.iterdir():
            if item.is_file() and item.suffix in {".woff2", ".css"}:
                item.unlink(missing_ok=True)
        try:
            target.rmdir()
        except OSError:
            pass

    def _remove(self) -> bool:
        index = self._dist_index()
        if not index.is_file():
            return False
        html = index.read_text(encoding="utf-8")
        cleaned = FONT_LINK_RE.sub("", SCRIPT_RE.sub("", STYLE_RE.sub("", html)))
        if cleaned == html:
            self._uninstall_fonts()
            return False
        index.write_text(cleaned, encoding="utf-8")
        self._uninstall_fonts()
        self._restore_dashboard_build()
        return True


def create_plugin() -> HyperOS4ThemePlugin:
    """宿主加载入口。"""

    return HyperOS4ThemePlugin()
