'use strict';

/**
 * 运行环境配置
 *
 * 网页版：所有请求走同源相对路径（apiBase 为空串）。
 * Capacitor 原生版：页面从 capacitor://localhost 或 https://localhost 加载，
 * 相对路径会指向 App 内部而不是服务器，因此必须切到线上域名。
 *
 * 必须在其他脚本之前加载。
 */
(() => {
  const REMOTE_ORIGIN = 'https://samehz.onrender.com';

  const isNative = Boolean(
    (window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform())
    || location.protocol === 'capacitor:'
    || (window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform() !== 'web'),
  );

  window.SAMEHZ = {
    native: isNative,
    /** API 与 WebSocket 的前缀；网页版为空串 */
    apiBase: isNative ? REMOTE_ORIGIN : '',
    /** 邀请链接必须指向公网站点，即使当前运行在 App 内 */
    publicOrigin: isNative ? REMOTE_ORIGIN : location.origin,
  };

  // 原生壳一律使用精简布局（即使平板或横屏），由 CSS 的 .is-native 驱动
  if (isNative) {
    document.documentElement.classList.add('is-native');

    // 让 WebView 从状态栏/灵动岛下方开始，避免顶栏被遮挡
    document.addEventListener('DOMContentLoaded', () => {
      const plugins = (window.Capacitor && window.Capacitor.Plugins) || {};
      const statusBar = plugins.StatusBar;
      if (!statusBar) return;
      try {
        if (statusBar.setOverlaysWebView) {
          statusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
        }
        if (statusBar.setStyle) {
          statusBar.setStyle({ style: 'DARK' }).catch(() => {});
        }
        if (statusBar.setBackgroundColor) {
          statusBar.setBackgroundColor({ color: '#0b0a09' }).catch(() => {});
        }
      } catch {
        // 插件不可用时退回纯 CSS 安全区处理
      }
    }, { once: true });
  }
})();
