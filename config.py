# -*- coding: utf-8 -*-
"""HyperOS 4 主题插件配置。"""

from maibot_sdk import Field, PluginConfigBase


class PluginSection(PluginConfigBase):
    """插件开关。"""

    enabled: bool = Field(default=True, description="是否启用 HyperOS 4 主题")
    config_version: str = Field(default="1.0.0", description="配置版本，由插件维护")


class ThemeSection(PluginConfigBase):
    """外观参数。"""

    accent: str = Field(
        default="blue",
        description="强调色：blue（HyperOS 蓝，默认）/ orange（小米橙）/ green / purple / graphite",
    )
    radius_px: int = Field(default=26, description="大圆角基准值（px），HyperOS 默认 26")
    blur_px: int = Field(default=18, description="磨砂玻璃模糊半径（px），0 表示关闭毛玻璃")
    tint_strength: int = Field(
        default=100,
        description="背景渐变浓度百分比，100 为标准，调低更素净",
    )
    dock_glass: bool = Field(default=True, description="底栏使用半透明玻璃；关闭则为实心卡片")
    dock_blur: int = Field(default=24, description="底栏磨砂模糊半径（px）")
    dock_enabled: bool = Field(default=True, description="把侧栏功能栏移到底部作为悬浮底栏")


class HyperOS4ThemeConfig(PluginConfigBase):
    """主题插件总配置。"""

    plugin: PluginSection = Field(default_factory=PluginSection)
    theme: ThemeSection = Field(default_factory=ThemeSection)
