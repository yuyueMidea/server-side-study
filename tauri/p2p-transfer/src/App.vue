<template>
  <div class="app">
    <div class="noise"></div>
    <div class="glow-orb glow-1"></div>
    <div class="glow-orb glow-2"></div>

    <div class="layout">
      <!-- ══ 侧边栏 ══ -->
      <aside class="sidebar">
        <div class="brand">
          <svg class="brand-icon" viewBox="0 0 32 32" fill="none">
            <path d="M16 2L28 9V23L16 30L4 23V9L16 2Z" stroke="currentColor" stroke-width="1.5"/>
            <path d="M16 8V16M16 16L11 12M16 16L21 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M16 16V24M16 24L11 20M16 24L21 20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>
          </svg>
          <span class="brand-name">XFER</span>
        </div>

        <nav class="nav">
          <button
            v-for="tab in tabs" :key="tab.id"
            class="nav-item"
            :class="{ active: activeTab === tab.id }"
            @click="activeTab = tab.id"
          >
            <span class="nav-icon">{{ tab.icon }}</span>
            <span class="nav-label">{{ tab.label }}</span>
            <span v-if="tab.badge" class="nav-badge">{{ tab.badge }}</span>
          </button>
        </nav>

        <!-- 本机状态卡片 -->
        <div class="status-card">
          <div class="status-row">
            <span class="dot" :class="listenerStatus"></span>
            <span class="status-label">{{ listenerStatusText }}</span>
            <button
              v-if="listenerStatus === 'error'"
              class="retry-btn"
              @click="retryListen"
              title="重试监听"
            >重试</button>
          </div>
          <div v-if="listenPort" class="port-row">
            端口 <strong>{{ listenPort }}</strong>
          </div>
          <div class="ip-block">
            <div class="ip-hint">本机地址（点击复制）</div>
            <div v-if="localIps.length === 0" class="ip-item muted">获取中...</div>
            <div
              v-for="ip in localIps" :key="ip"
              class="ip-item"
              @click="copyText(ip)"
            >
              <span>{{ ip }}</span>
              <span class="copy-hint">复制</span>
            </div>
          </div>
        </div>
      </aside>

      <!-- ══ 主内容 ══ -->
      <main class="main">

        <!-- ▸ 发送 Tab -->
        <section v-show="activeTab === 'send'" class="panel">
          <div class="panel-header">
            <div>
              <h2>发送文件</h2>
              <p class="panel-desc">输入对方 IP，选择文件即可发送</p>
            </div>
          </div>

          <div class="send-form">
            <!-- IP 输入 -->
            <div>
              <label class="field-label">目标 IP 地址</label>
              <div class="input-row">
                <input
                  v-model="targetIp"
                  class="text-input"
                  placeholder="例如 192.168.1.100"
                  :disabled="isSending"
                  @keydown.enter="handleSend"
                  spellcheck="false"
                  autocomplete="off"
                />
                <span class="port-hint">:{{ listenPort || 55001 }}</span>
              </div>
            </div>

            <!-- 文件选择区（支持拖拽） -->
            <div>
              <label class="field-label">选择文件</label>
              <div
                class="drop-zone"
                :class="{
                  dragging:   isDragging,
                  'has-file': selectedFile,
                  disabled:   isSending,
                }"
                @dragover.prevent="isDragging = true"
                @dragleave.prevent="isDragging = false"
                @drop.prevent="handleDrop"
                @click="!isSending && pickFile()"
              >
                <template v-if="!selectedFile">
                  <div class="drop-icon">{{ isDragging ? '⬇' : '⊕' }}</div>
                  <div class="drop-text">
                    {{ isDragging ? '松开以选择' : '点击选择文件，或将文件拖入此处' }}
                  </div>
                  <div class="drop-sub">支持任意格式，单文件</div>
                </template>
                <template v-else>
                  <div class="file-preview">
                    <span class="file-preview-icon">{{ fileIcon(selectedFile.name) }}</span>
                    <div class="file-preview-info">
                      <div class="file-preview-name">{{ selectedFile.name }}</div>
                      <div class="file-preview-size">
                        {{ selectedFile.size ? formatBytes(selectedFile.size) : '获取大小中...' }}
                      </div>
                    </div>
                    <button
                      class="file-clear"
                      @click.stop="selectedFile = null"
                      title="清除选择"
                    >✕</button>
                  </div>
                </template>
              </div>
            </div>

            <!-- 发送按钮 -->
            <button
              class="send-btn"
              :class="{ loading: isSending }"
              :disabled="!targetIp.trim() || !selectedFile || isSending"
              @click="handleSend"
            >
              <template v-if="!isSending">
                <span>发送文件</span>
                <span class="btn-arrow">→</span>
              </template>
              <template v-else>
                <span class="spinner"></span>
                <span>发送中...</span>
              </template>
            </button>

            <!-- 当前发送进度 -->
            <transition name="fade">
              <div v-if="currentSend" class="progress-card">
                <div class="prog-header">
                  <span class="prog-filename">{{ currentSend.file_name }}</span>
                  <span class="prog-size-text">
                    {{ formatBytes(currentSend.transferred_bytes) }} / {{ formatBytes(currentSend.total_bytes) }}
                  </span>
                </div>
                <div class="prog-bar">
                  <div
                    class="prog-fill"
                    :class="{ done: currentSend.status === 'complete', errored: currentSend.status === 'error' }"
                    :style="{ width: currentSend.percent + '%' }"
                  ></div>
                </div>
                <div class="prog-footer">
                  <span class="prog-pct">{{ Math.round(currentSend.percent) }}%</span>
                  <span v-if="currentSend.speed_bps && currentSend.status === 'progress'" class="prog-speed">
                    {{ formatSpeed(currentSend.speed_bps) }}
                  </span>
                  <span v-if="currentSend.status === 'complete'" class="prog-done">传输完成 ✓</span>
                  <span v-if="currentSend.status === 'error'" class="prog-err">传输失败 ✗</span>
                </div>
              </div>
            </transition>
          </div>
        </section>

        <!-- ▸ 接收 Tab -->
        <section v-show="activeTab === 'receive'" class="panel">
          <div class="panel-header">
            <div>
              <h2>接收文件</h2>
              <p class="panel-desc">无需任何操作，文件将自动保存到系统下载目录</p>
            </div>
            <button class="action-btn primary" @click="openDownloadDir">
              打开下载目录
            </button>
          </div>

          <!-- 等待状态 -->
          <div v-if="activeReceives.length === 0" class="empty-state">
            <div class="empty-icon receive-pulse">⬇</div>
            <p>等待文件传入...</p>
            <p class="empty-sub">将侧边栏中的本机 IP 告知发送方，启动后自动接收</p>
          </div>

          <div v-else class="card-list">
            <div
              v-for="r in activeReceives"
              :key="r.transfer_id"
              class="transfer-card receive-card"
              :class="r.status"
            >
              <div class="tc-header">
                <span class="tc-badge receive">↓ 接收</span>
                <span class="tc-from">来自 {{ r.peer_ip || '未知' }}</span>
                <span class="tc-name">{{ r.file_name }}</span>
                <span class="tc-size">{{ formatBytes(r.total_bytes) }}</span>
              </div>
              <div class="prog-bar">
                <div
                  class="prog-fill"
                  :class="{ done: r.status === 'complete', errored: r.status === 'error' }"
                  :style="{ width: r.percent + '%' }"
                ></div>
              </div>
              <div class="prog-footer">
                <span class="prog-pct">{{ Math.round(r.percent) }}%</span>
                <span v-if="r.speed_bps && r.status === 'progress'" class="prog-speed">
                  {{ formatSpeed(r.speed_bps) }}
                </span>
                <span v-if="r.status === 'complete'" class="prog-done">已保存到下载目录 ✓</span>
                <span v-if="r.status === 'error'" class="prog-err">接收失败，文件已丢弃</span>
              </div>
            </div>
          </div>
        </section>

        <!-- ▸ 历史 Tab -->
        <section v-show="activeTab === 'history'" class="panel">
          <div class="panel-header">
            <div>
              <h2>传输历史</h2>
              <p class="panel-desc">本次运行期间的所有传输记录</p>
            </div>
            <div class="panel-actions">
              <button
                v-if="history.length > 0"
                class="action-btn"
                @click="history = []"
              >清空</button>
              <button class="action-btn primary" @click="openDownloadDir">
                打开下载目录
              </button>
            </div>
          </div>

          <div v-if="history.length === 0" class="empty-state">
            <div class="empty-icon">◈</div>
            <p>暂无传输记录</p>
            <p class="empty-sub">发送或接收文件后将在此处显示</p>
          </div>

          <div v-else class="card-list">
            <div
              v-for="(item, idx) in history"
              :key="idx"
              class="transfer-card history-card"
              :class="[item.direction, item.status]"
            >
              <div class="hc-body">
                <div class="hc-icon-wrap" :class="item.direction">
                  <span>{{ item.direction === 'send' ? '↑' : '↓' }}</span>
                </div>
                <div class="hc-info">
                  <div class="hc-name">{{ item.file_name }}</div>
                  <div class="hc-meta">
                    {{ formatBytes(item.total_bytes) }}
                    <span class="sep">·</span>
                    {{ item.direction === 'send' ? '发送至' : '来自' }}
                    {{ item.peer_info || '未知' }}
                    <span class="sep">·</span>
                    {{ formatTime(item.timestamp) }}
                  </div>
                </div>
                <div class="hc-status-wrap">
                  <span class="hc-status" :class="item.status">
                    {{ statusLabel(item.status) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>

    <!-- Toast 通知 -->
    <transition name="toast-anim">
      <div
        v-if="toast.show"
        class="toast"
        :class="toast.type"
        @click="toast.show = false"
      >
        <span class="toast-icon">{{ toastIcon }}</span>
        <span class="toast-msg">{{ toast.message }}</span>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { open }   from '@tauri-apps/plugin-dialog'

// ─── 类型定义 ──────────────────────────────────────────────────────────────

interface TransferItem {
  transfer_id:       string
  file_name:         string
  transferred_bytes: number
  total_bytes:       number
  percent:           number
  direction:         'send' | 'receive'
  status:            'progress' | 'complete' | 'error'
  speed_bps?:        number
  peer_ip?:          string
}

interface HistoryItem extends TransferItem {
  peer_info?: string
  timestamp:  number
}

interface SelectedFile {
  name: string
  size: number
  path: string
}

interface TabItem {
  id: 'send' | 'receive' | 'history'
  icon: string
  label: string
  badge: number | null
}

// ─── 响应式状态 ────────────────────────────────────────────────────────────

const activeTab  = ref<'send' | 'receive' | 'history'>('send')
const localIps   = ref<string[]>([])
const listenPort = ref<number>(0)
const isSending  = ref(false)
const targetIp   = ref('')
const isDragging = ref(false)
const selectedFile = ref<SelectedFile | null>(null)
const history      = ref<HistoryItem[]>([])
const activeReceives = ref<TransferItem[]>([])
const currentSend    = ref<TransferItem | null>(null)

type ListenerStatus = 'idle' | 'listening' | 'error'
const listenerStatus = ref<ListenerStatus>('idle')

// 每个 transfer_id → peer_ip 的映射（接收端用）
const transferPeerMap = new Map<string, string>()

// ─── 计算属性 ──────────────────────────────────────────────────────────────

const listenerStatusText = computed(() => ({
  idle:      '未就绪',
  listening: '监听中',
  error:     '监听失败',
}[listenerStatus.value]))

const pendingReceives = computed(() =>
  activeReceives.value.filter(r => r.status === 'progress').length
)

const tabs = computed<TabItem[]>(() => [
  { id: 'send',    icon: '↑', label: '发送', badge: null },
  { id: 'receive', icon: '↓', label: '接收', badge: pendingReceives.value || null },
  { id: 'history', icon: '☰', label: '历史', badge: history.value.length || null },
])

// Toast
const toast = reactive({
  show:    false,
  message: '',
  type:    'info' as 'info' | 'success' | 'error',
  _timer:  0 as ReturnType<typeof setTimeout>,
})

const toastIcon = computed(() =>
  ({ success: '✓', error: '✕', info: 'ℹ' }[toast.type])
)

// ─── 格式化工具 ────────────────────────────────────────────────────────────

function formatBytes(n: number): string {
  if (!n || n === 0) return '0 B'
  const k = 1024
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(n) / Math.log(k)), units.length - 1)
  return `${(n / Math.pow(k, i)).toFixed(i ? 1 : 0)} ${units[i]}`
}

function formatSpeed(bps: number): string {
  return `${formatBytes(bps)}/s`
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

function statusLabel(s: string): string {
  return ({ complete: '完成', error: '失败', progress: '进行中' } as Record<string, string>)[s] ?? s
}

function fileIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    pdf: '📄', doc: '📝', docx: '📝', txt: '📝', md: '📝',
    xls: '📊', xlsx: '📊', csv: '📊', ppt: '📊', pptx: '📊',
    zip: '🗜', tar: '🗜', gz: '🗜', rar: '🗜', '7z': '🗜',
    jpg: '🖼', jpeg: '🖼', png: '🖼', gif: '🖼', webp: '🖼', svg: '🖼',
    mp4: '🎬', mov: '🎬', avi: '🎬', mkv: '🎬', webm: '🎬',
    mp3: '🎵', wav: '🎵', flac: '🎵', aac: '🎵',
    exe: '⚙', dmg: '⚙', pkg: '⚙', deb: '⚙', apk: '⚙',
    js:  '📦', ts: '📦', py: '📦', rs: '📦', go: '📦',
  }
  return map[ext] ?? '📄'
}

// ─── Toast 工具 ────────────────────────────────────────────────────────────

function showToast(msg: string, type: 'info' | 'success' | 'error' = 'info', ms = 3500) {
  toast.message = msg
  toast.type    = type
  toast.show    = true
  clearTimeout(toast._timer)
  toast._timer  = setTimeout(() => { toast.show = false }, ms)
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    showToast(`已复制：${text}`, 'success', 1500)
  } catch {
    showToast('复制失败，请手动选择', 'error')
  }
}

// ─── 文件选择（Tauri 原生对话框） ─────────────────────────────────────────

async function pickFile() {
  const result = await open({ multiple: false, title: '选择要发送的文件' })
  if (!result) return

  const path = typeof result === 'string' ? result : (result as string[])[0]
  // 先用路径提取文件名，size 暂设 0
  const name = path.replace(/\\/g, '/').split('/').pop() ?? path
  selectedFile.value = { name, size: 0, path }

  // 异步获取真实文件大小
  try {
    const meta = await invoke<{ name: string; size: number; is_file: boolean }>('get_file_meta', { filePath: path })
    if (!meta.is_file) {
      showToast('不支持目录，请选择文件', 'error')
      selectedFile.value = null
      return
    }
    selectedFile.value = { name: meta.name, size: meta.size, path }
  } catch (err) {
    showToast(`读取文件信息失败: ${err}`, 'error')
  }
}

async function handleDrop(e: DragEvent) {
  isDragging.value = false
  if (isSending.value) return

  const files = e.dataTransfer?.files
  if (!files || files.length === 0) return

  const f    = files[0] as File & { path?: string }
  const path = (f as unknown as { path?: string }).path ?? ''
  if (!path) {
    showToast('无法获取文件路径，请改用"点击选择"', 'error')
    return
  }
  selectedFile.value = { name: f.name, size: f.size, path }
}

// ─── 发送逻辑 ─────────────────────────────────────────────────────────────

async function handleSend() {
  const ip = targetIp.value.trim()
  if (!ip) { showToast('请输入目标 IP 地址', 'error'); return }
  if (!selectedFile.value) { showToast('请先选择文件', 'error'); return }
  if (isSending.value) return

  isSending.value = true
  currentSend.value = null

  try {
    await invoke('send_file', {
      targetIp: ip,
      filePath: selectedFile.value.path,
    })
    showToast(`"${selectedFile.value.name}" 发送完成！`, 'success')
    selectedFile.value = null
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    showToast(`发送失败：${msg}`, 'error', 6000)
  } finally {
    isSending.value = false
  }
}

async function openDownloadDir() {
  try {
    await invoke('open_download_dir')
  } catch (err) {
    showToast(`无法打开目录：${err}`, 'error')
  }
}

async function retryListen() {
  try {
    const port = await invoke<number>('start_listening')
    listenerStatus.value = 'listening'
    listenPort.value = port
    showToast(`监听已启动，端口 ${port}`, 'success')
  } catch (err) {
    showToast(`重试失败：${err}`, 'error')
  }
}

// ─── 事件监听（Tauri → 前端） ─────────────────────────────────────────────

async function setupEventListeners() {
  // 监听器就绪
  await listen<{ port: number; status: string; message?: string }>(
    'listener_ready',
    ({ payload }) => {
      if (payload.status === 'listening') {
        listenerStatus.value = 'listening'
        listenPort.value     = payload.port
      } else {
        listenerStatus.value = 'error'
        showToast(`监听启动失败：${payload.message ?? '未知'}`, 'error', 6000)
      }
    }
  )

  // 传输进度（发送 & 接收共用同一事件）
  await listen<TransferItem>('transfer_progress', ({ payload }) => {
    if (payload.direction === 'send') {
      currentSend.value = payload

      if (payload.status === 'complete' || payload.status === 'error') {
        history.value.unshift({
          ...payload,
          peer_info: targetIp.value || undefined,
          timestamp: Date.now(),
        })
      }
    } else {
      // 接收进度
      const peer_ip = transferPeerMap.get(payload.transfer_id)
      const enriched: TransferItem = { ...payload, peer_ip }

      const idx = activeReceives.value.findIndex(r => r.transfer_id === payload.transfer_id)
      if (idx >= 0) {
        activeReceives.value[idx] = enriched
      } else {
        activeReceives.value.unshift(enriched)
        activeTab.value = 'receive'
      }

      if (payload.status === 'complete' || payload.status === 'error') {
        history.value.unshift({
          ...enriched,
          peer_info: peer_ip,
          timestamp: Date.now(),
        })
      }
    }
  })

  // 收到文件传输请求（接收方侧）
  await listen<{ transfer_id: string; file_name: string; file_size: number; peer_ip: string }>(
    'file_incoming',
    ({ payload }) => {
      transferPeerMap.set(payload.transfer_id, payload.peer_ip)
      showToast(
        `收到文件：${payload.file_name}（${formatBytes(payload.file_size)}）来自 ${payload.peer_ip}`,
        'info',
        4000
      )
      activeTab.value = 'receive'
    }
  )

  // 文件保存完成
  await listen<{ transfer_id: string; file_name: string; save_path: string }>(
    'file_saved',
    ({ payload }) => {
      showToast(`"${payload.file_name}" 已保存到下载目录`, 'success')
    }
  )

  // 连接建立
  await listen<{ peer_ip: string; connected: boolean; peer_id: string }>(
    'connection_event',
    ({ payload }) => {
      if (payload.connected) {
        showToast(`已连接到 ${payload.peer_ip}`, 'success', 2000)
      }
    }
  )

  // 应用级错误
  await listen<string>('app_error', ({ payload }) => {
    showToast(payload, 'error', 6000)
  })
}

// ─── 初始化 ────────────────────────────────────────────────────────────────

onMounted(async () => {
  await setupEventListeners()

  // 获取本机 IP 列表
  try {
    localIps.value = await invoke<string[]>('get_local_ips')
  } catch { /* 忽略 */ }

  // 查询当前状态（监听可能已在 setup 中启动）
  try {
    const status = await invoke<{ is_listening: boolean; listen_port: number }>('get_app_status')
    if (status.is_listening) {
      listenerStatus.value = 'listening'
      listenPort.value     = status.listen_port
    }
  } catch { /* 忽略 */ }
})
</script>

<style>
/* ══ Reset & CSS 变量 ════════════════════════════════════════════════ */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:          #080b12;
  --bg2:         #0d1117;
  --surface:     #111827;
  --surface2:    #1a2233;
  --border:      #1f2d40;
  --border2:     #2a3a52;

  --accent:      #3b82f6;
  --accent-glow: rgba(59, 130, 246, 0.15);
  --accent-dim:  rgba(59, 130, 246, 0.10);
  --green:       #10b981;
  --green-dim:   rgba(16, 185, 129, 0.10);
  --red:         #ef4444;
  --red-dim:     rgba(239, 68, 68, 0.10);

  --text:        #e2e8f0;
  --text2:       #94a3b8;
  --text3:       #475569;

  --r:           10px;
  --r-lg:        14px;
  --sidebar-w:   220px;

  font-size: 14px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

html, body, #app { height: 100%; overflow: hidden; }
body { background: var(--bg); color: var(--text); }

/* ══ 背景装饰 ═══════════════════════════════════════════════════════ */
.app { position: relative; height: 100vh; overflow: hidden; }

.noise {
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E");
  background-size: 150px;
}

.glow-orb {
  position: fixed; border-radius: 50%;
  filter: blur(90px); pointer-events: none; z-index: 0;
}
.glow-1 {
  width: 500px; height: 500px; top: -150px; left: -150px;
  background: radial-gradient(circle, rgba(59,130,246,0.07), transparent 70%);
}
.glow-2 {
  width: 350px; height: 350px; bottom: -80px; right: -80px;
  background: radial-gradient(circle, rgba(16,185,129,0.05), transparent 70%);
}

/* ══ 整体布局 ═══════════════════════════════════════════════════════ */
.layout { position: relative; z-index: 1; display: flex; height: 100vh; }

/* ══ 侧边栏 ════════════════════════════════════════════════════════= */
.sidebar {
  width: var(--sidebar-w); flex-shrink: 0;
  background: var(--bg2); border-right: 1px solid var(--border);
  display: flex; flex-direction: column;
  padding: 20px 12px; gap: 22px;
  overflow: hidden;
}

.brand { display: flex; align-items: center; gap: 10px; padding: 0 6px; }
.brand-icon {
  width: 28px; height: 28px; color: var(--accent);
  filter: drop-shadow(0 0 8px rgba(59,130,246,0.5));
  flex-shrink: 0;
}
.brand-name { font-size: 16px; font-weight: 700; letter-spacing: 0.18em; }

/* ── 导航 ── */
.nav { display: flex; flex-direction: column; gap: 2px; }

.nav-item {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 10px; border-radius: var(--r);
  border: none; background: transparent;
  color: var(--text2); font-size: 13px;
  cursor: pointer; transition: all 0.15s;
  width: 100%; text-align: left;
}
.nav-item:hover { background: var(--surface); color: var(--text); }
.nav-item.active { background: var(--accent-dim); color: var(--accent); }

.nav-icon  { font-size: 14px; width: 18px; text-align: center; flex-shrink: 0; }
.nav-label { flex: 1; }
.nav-badge {
  background: var(--accent); color: #fff;
  font-size: 10px; font-weight: 700;
  padding: 1px 6px; border-radius: 10px;
  min-width: 18px; text-align: center;
}

/* ── 状态卡片 ── */
.status-card {
  margin-top: auto;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--r); padding: 12px;
  display: flex; flex-direction: column; gap: 10px;
}

.status-row {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; color: var(--text2);
}

.dot {
  width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
  transition: all 0.3s;
}
.dot.idle      { background: var(--text3); }
.dot.listening { background: var(--green); box-shadow: 0 0 6px var(--green); animation: blink 2s infinite; }
.dot.error     { background: var(--red); }

@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.45} }

.retry-btn {
  margin-left: auto; padding: 2px 8px;
  border: 1px solid rgba(239,68,68,0.3); border-radius: 5px;
  background: var(--red-dim); color: var(--red);
  font-size: 11px; cursor: pointer; transition: all 0.15s;
}
.retry-btn:hover { background: rgba(239,68,68,0.2); }

.port-row { font-size: 11px; color: var(--text3); }
.port-row strong { color: var(--green); }

.ip-block { display: flex; flex-direction: column; gap: 4px; }

.ip-hint {
  font-size: 10px; color: var(--text3);
  letter-spacing: 0.06em; text-transform: uppercase;
}

.ip-item {
  font-size: 12px;
  font-family: 'Fira Code', 'Cascadia Code', 'Courier New', monospace;
  color: var(--accent); cursor: pointer;
  padding: 4px 6px; border-radius: 5px;
  display: flex; justify-content: space-between; align-items: center;
  transition: background 0.1s;
}
.ip-item:hover { background: var(--accent-dim); }
.ip-item.muted { color: var(--text3); cursor: default; }
.copy-hint { font-size: 10px; color: var(--text3); opacity: 0; transition: opacity 0.15s; }
.ip-item:hover .copy-hint { opacity: 1; }

/* ══ 主内容区 ═══════════════════════════════════════════════════════ */
.main {
  flex: 1; overflow-y: auto; padding: 28px 32px;
  min-width: 0;
}
.main::-webkit-scrollbar { width: 4px; }
.main::-webkit-scrollbar-track { background: transparent; }
.main::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }

.panel { display: flex; flex-direction: column; gap: 22px; }

.panel-header {
  display: flex; justify-content: space-between;
  align-items: flex-start; gap: 12px;
}
.panel-header h2 { font-size: 18px; font-weight: 600; color: var(--text); }
.panel-desc { font-size: 12px; color: var(--text3); margin-top: 3px; }
.panel-actions { display: flex; gap: 8px; flex-shrink: 0; }

/* ══ 发送表单 ════════════════════════════════════════════════════════ */
.send-form { display: flex; flex-direction: column; gap: 16px; }

.field-label {
  display: block; margin-bottom: 7px;
  font-size: 11px; font-weight: 600;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--text3);
}

.input-row { display: flex; align-items: stretch; }

.text-input {
  flex: 1;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--r) 0 0 var(--r);
  padding: 10px 14px; font-size: 14px;
  font-family: 'Fira Code', 'Cascadia Code', monospace;
  color: var(--text); outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  min-width: 0;
}
.text-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-dim);
  z-index: 1;
}
.text-input::placeholder { color: var(--text3); }
.text-input:disabled { opacity: 0.5; cursor: not-allowed; }

.port-hint {
  background: var(--surface2); border: 1px solid var(--border);
  border-left: none; border-radius: 0 var(--r) var(--r) 0;
  padding: 10px 12px; font-size: 12px;
  font-family: monospace; color: var(--text3);
  white-space: nowrap; flex-shrink: 0;
}

/* ── 拖拽区 ── */
.drop-zone {
  border: 1.5px dashed var(--border2);
  border-radius: var(--r-lg); padding: 28px 24px;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 8px;
  cursor: pointer; transition: all 0.2s;
  background: var(--surface); min-height: 130px;
  user-select: none;
}
.drop-zone:hover:not(.disabled) {
  border-color: var(--accent); background: var(--accent-dim);
}
.drop-zone.dragging {
  border-color: var(--accent); background: var(--accent-glow);
  box-shadow: 0 0 0 3px rgba(59,130,246,0.08) inset;
}
.drop-zone.has-file {
  border-style: solid; border-color: var(--border2);
  background: var(--surface2); padding: 18px 20px;
}
.drop-zone.disabled { cursor: not-allowed; opacity: 0.55; }

.drop-icon  { font-size: 28px; color: var(--text3); line-height: 1; }
.drop-text  { font-size: 13px; color: var(--text2); }
.drop-sub   { font-size: 11px; color: var(--text3); }

/* ── 文件预览 ── */
.file-preview { display: flex; align-items: center; gap: 14px; width: 100%; }
.file-preview-icon { font-size: 34px; flex-shrink: 0; }
.file-preview-info { flex: 1; min-width: 0; }
.file-preview-name {
  font-size: 14px; font-weight: 500; color: var(--text);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.file-preview-size { font-size: 12px; color: var(--text3); margin-top: 3px; }
.file-clear {
  width: 26px; height: 26px; border-radius: 50%;
  border: 1px solid var(--border2); background: var(--surface);
  color: var(--text2); cursor: pointer; font-size: 11px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: all 0.15s;
}
.file-clear:hover { background: var(--red-dim); border-color: var(--red); color: var(--red); }

/* ── 发送按钮 ── */
.send-btn {
  align-self: flex-start; min-width: 130px;
  background: var(--accent); border: none; border-radius: var(--r);
  padding: 11px 22px; font-size: 14px; font-weight: 600;
  color: #fff; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  transition: all 0.2s;
}
.send-btn:hover:not(:disabled) {
  background: #2563eb;
  box-shadow: 0 4px 18px rgba(59,130,246,0.4);
  transform: translateY(-1px);
}
.send-btn:active:not(:disabled) { transform: translateY(0); }
.send-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.btn-arrow { font-size: 16px; transition: transform 0.2s; }
.send-btn:hover:not(:disabled) .btn-arrow { transform: translateX(3px); }

/* ── Spinner ── */
.spinner {
  width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff; border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ══ 进度条 ════════════════════════════════════════════════════════= */
.prog-bar {
  height: 4px; background: var(--border);
  border-radius: 2px; overflow: hidden;
}
.prog-fill {
  height: 100%; border-radius: 2px;
  background: linear-gradient(90deg, var(--accent), #60a5fa);
  transition: width 0.25s ease;
  position: relative; overflow: hidden;
}
.prog-fill::after {
  content: '';
  position: absolute; top: 0; left: -60%;
  width: 50%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
  animation: sheen 1.6s ease-in-out infinite;
}
.prog-fill.done {
  background: linear-gradient(90deg, var(--green), #34d399);
}
.prog-fill.done::after, .prog-fill.errored::after { display: none; }
.prog-fill.errored { background: var(--red); }

@keyframes sheen { to { left: 110%; } }

.prog-footer {
  display: flex; align-items: center; gap: 10px;
  font-size: 12px;
}
.prog-pct   { color: var(--accent); font-weight: 700; font-family: monospace; min-width: 36px; }
.prog-speed { color: var(--text3); }
.prog-done  { color: var(--green); margin-left: auto; }
.prog-err   { color: var(--red);   margin-left: auto; }

/* ── 进度卡片（发送面板内嵌） ── */
.progress-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--r); padding: 14px 16px;
  display: flex; flex-direction: column; gap: 9px;
}
.prog-header {
  display: flex; justify-content: space-between; align-items: center;
  gap: 10px; font-size: 13px; overflow: hidden;
}
.prog-filename {
  color: var(--text); overflow: hidden;
  text-overflow: ellipsis; white-space: nowrap; flex: 1;
}
.prog-size-text { color: var(--text3); flex-shrink: 0; font-size: 12px; }

/* ══ 卡片列表 ══════════════════════════════════════════════════════= */
.card-list { display: flex; flex-direction: column; gap: 8px; }

/* ── 传输卡片（接收 & 历史共用） ── */
.transfer-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--r); overflow: hidden;
  transition: border-color 0.15s;
  animation: slideIn 0.25s ease;
}
@keyframes slideIn {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.transfer-card:hover { border-color: var(--border2); }

/* ── 接收卡片 ── */
.receive-card { border-left: 2px solid var(--green); }
.receive-card.error { border-left-color: var(--red); opacity: 0.85; }
.receive-card.complete { opacity: 0.8; }

.tc-header {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 14px 0; overflow: hidden;
}
.tc-badge {
  font-size: 10px; font-weight: 700; padding: 2px 7px;
  border-radius: 4px; flex-shrink: 0; letter-spacing: 0.04em;
}
.tc-badge.receive { background: var(--green-dim); color: var(--green); }
.tc-from   { font-size: 11px; color: var(--green); flex-shrink: 0; }
.tc-name   { font-size: 13px; color: var(--text); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tc-size   { font-size: 11px; color: var(--text3); flex-shrink: 0; }

.receive-card .prog-bar { margin: 10px 14px 0; }
.receive-card .prog-footer { padding: 6px 14px 12px; }

/* ── 历史卡片 ── */
.history-card.send    { border-left: 2px solid var(--accent); }
.history-card.receive { border-left: 2px solid var(--green); }

.hc-body {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 14px;
}
.hc-icon-wrap {
  width: 34px; height: 34px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700; flex-shrink: 0;
}
.hc-icon-wrap.send    { background: var(--accent-dim); color: var(--accent); }
.hc-icon-wrap.receive { background: var(--green-dim);  color: var(--green); }

.hc-info { flex: 1; min-width: 0; }
.hc-name {
  font-size: 13px; font-weight: 500; color: var(--text);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.hc-meta { font-size: 11px; color: var(--text3); margin-top: 3px; }
.sep { margin: 0 4px; }

.hc-status-wrap { flex-shrink: 0; }
.hc-status {
  font-size: 11px; font-weight: 600;
  padding: 3px 8px; border-radius: 4px;
}
.hc-status.complete { color: var(--green); background: var(--green-dim); }
.hc-status.error    { color: var(--red);   background: var(--red-dim); }
.hc-status.progress { color: var(--accent);background: var(--accent-dim); }

/* ══ 空状态 ════════════════════════════════════════════════════════= */
.empty-state {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 64px 24px; gap: 10px;
  color: var(--text3); text-align: center;
}
.empty-icon {
  font-size: 38px; opacity: 0.25;
  animation: float 3s ease-in-out infinite;
}
.receive-pulse {
  animation: rpulse 1.8s ease-in-out infinite !important;
}
@keyframes float  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
@keyframes rpulse { 0%,100%{opacity:0.25;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.1)} }
.empty-state p    { font-size: 14px; color: var(--text2); }
.empty-sub        { font-size: 12px; color: var(--text3) !important; }

/* ══ 按钮 ══════════════════════════════════════════════════════════= */
.action-btn {
  padding: 7px 14px; border-radius: 7px;
  font-size: 12px; font-weight: 500;
  cursor: pointer; transition: all 0.15s;
  border: 1px solid var(--border2);
  background: transparent; color: var(--text2);
}
.action-btn:hover { background: var(--surface2); color: var(--text); }
.action-btn.primary {
  background: var(--green-dim);
  border-color: rgba(16,185,129,0.25);
  color: var(--green);
}
.action-btn.primary:hover { background: rgba(16,185,129,0.18); }

/* ══ Toast ════════════════════════════════════════════════════════== */
.toast {
  position: fixed; bottom: 24px; left: 50%;
  transform: translateX(-50%);
  background: var(--surface2); border: 1px solid var(--border2);
  border-radius: 10px; padding: 10px 16px;
  font-size: 13px; color: var(--text);
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  z-index: 999;
  display: flex; align-items: center; gap: 8px;
  cursor: pointer; max-width: min(480px, calc(100vw - 48px));
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.toast.success { border-color: rgba(16,185,129,0.35); }
.toast.error   { border-color: rgba(239,68,68,0.35); }
.toast.info    { border-color: rgba(59,130,246,0.35); }

.toast-icon { font-size: 12px; flex-shrink: 0; }
.toast.success .toast-icon { color: var(--green); }
.toast.error   .toast-icon { color: var(--red); }
.toast.info    .toast-icon { color: var(--accent); }
.toast-msg { flex: 1; overflow: hidden; text-overflow: ellipsis; }

.toast-anim-enter-active, .toast-anim-leave-active {
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.toast-anim-enter-from, .toast-anim-leave-to {
  opacity: 0; transform: translateX(-50%) translateY(12px) scale(0.95);
}

/* ══ 过渡动画 ═══════════════════════════════════════════════════════ */
.fade-enter-active, .fade-leave-active { transition: all 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
