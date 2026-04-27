import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [vue()],

  // Vite 选项针对 Tauri 开发和构建优化
  clearScreen: false,

  server: {
    port:          5173,
    strictPort:    true,
    // Tauri 在所有平台上通过 IP 请求 devServer
    host:          '0.0.0.0',
    watch: {
      // 在 Windows 上使用轮询
      usePolling: process.platform === 'win32',
    },
  },

  build: {
    // Tauri 支持 es2021
    target:    process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
    // 开发时不压缩，方便调试
    minify:    !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
}))
