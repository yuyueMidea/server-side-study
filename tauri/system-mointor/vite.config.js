import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Tauri 需要清除 URL
  clearScreen: false,
  
  // 开发服务器配置
  server: {
    port: 5173,
    strictPort: true,
    host: 'localhost',
  },
  
  // 环境变量前缀
  envPrefix: ['VITE_', 'TAURI_'],
  
  // CSS 配置 - 重要!
  css: {
    postcss: './postcss.config.cjs',  // 明确指定 PostCSS 配置文件
  },
  
  // 构建配置
  build: {
    // Tauri 使用 Chromium on Windows 和 Safari on macOS and Linux
    target: process.env.TAURI_PLATFORM == 'windows' ? 'chrome105' : 'safari13',
    // 不压缩,让 Tauri 完成
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    // 为调试构建生成 sourcemap
    sourcemap: !!process.env.TAURI_DEBUG,
  },
})