<template>
  <div class="h-screen flex overflow-hidden bg-surface-950">
    <!-- ── Sidebar ── -->
    <aside class="w-64 flex flex-col border-r border-surface-800 shrink-0">
      <!-- brand header -->
      <div class="h-14 flex items-center justify-between px-4 border-b border-surface-800">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-lg bg-accent-500 flex items-center justify-center shadow-glow">
            <svg class="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
            </svg>
          </div>
          <span class="font-display font-bold text-white text-sm tracking-wide">LAN · IM</span>
        </div>
        <button @click="scanPeers" class="btn-ghost !px-2 !py-1 text-xs" title="刷新">
          <svg class="w-4 h-4" :class="scanning && 'animate-spin'" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <!-- self info -->
      <div class="px-3 py-3 border-b border-surface-800">
        <div class="flex items-center gap-2.5 px-2 py-1.5 rounded-lg bg-surface-800/50">
          <Avatar :name="idStore.username" :size="28" />
          <div class="min-w-0">
            <p class="text-sm font-medium text-white truncate">{{ idStore.username }}</p>
            <p class="text-xs text-surface-500 font-mono truncate">{{ idStore.localIp }}</p>
          </div>
          <div class="w-2 h-2 rounded-full bg-online ml-auto shrink-0"></div>
        </div>
      </div>

      <!-- peers list -->
      <div class="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        <div class="px-2 py-1 mb-1">
          <span class="text-[10px] uppercase tracking-widest font-medium text-surface-600">
            局域网用户 {{ onlinePeers.length }}
          </span>
        </div>

        <div v-if="!onlinePeers.length" class="px-3 py-6 text-center">
          <div class="w-10 h-10 rounded-full bg-surface-800 flex items-center justify-center mx-auto mb-3">
            <svg class="w-5 h-5 text-surface-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          </div>
          <p class="text-surface-500 text-xs">扫描中...</p>
          <p class="text-surface-600 text-xs mt-1">确保在同一局域网内</p>
        </div>

        <div
          v-for="peer in allPeers"
          :key="peer.id"
          class="user-row"
          :class="{ active: peersStore.active === peer.id }"
          @click="selectPeer(peer)"
        >
          <div class="relative shrink-0">
            <Avatar :name="peer.username" :size="32" />
            <span class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-surface-900"
              :class="peer.status === 'online' ? 'bg-online' : 'bg-offline'">
            </span>
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-surface-100 truncate">{{ peer.username }}</p>
            <p class="text-xs text-surface-500 font-mono truncate">{{ peer.ip }}</p>
          </div>
          <span v-if="unread(peer.id)" class="w-5 h-5 rounded-full bg-accent-500 text-white text-xs
                       flex items-center justify-center font-medium shrink-0">
            {{ unread(peer.id) > 9 ? "9+" : unread(peer.id) }}
          </span>
        </div>
      </div>

      <!-- bottom bar -->
      <div class="h-12 border-t border-surface-800 flex items-center px-3 gap-1">
        <button class="btn-ghost flex-1 flex items-center gap-2 text-xs" @click="minimize">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 15.75h18M3 12h18M3 8.25h18" />
          </svg>
          最小化
        </button>
      </div>
    </aside>

    <!-- ── Main chat area ── -->
    <main class="flex-1 flex flex-col min-w-0">
      <template v-if="peersStore.activePeer">
        <ChatWindow />
      </template>
      <template v-else>
        <div class="flex-1 flex flex-col items-center justify-center text-center p-8">
          <div class="w-16 h-16 rounded-2xl bg-surface-800 flex items-center justify-center mb-4">
            <svg class="w-8 h-8 text-surface-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
            </svg>
          </div>
          <h3 class="font-display font-bold text-white text-xl mb-2">开始聊天</h3>
          <p class="text-surface-500 text-sm max-w-xs">从左侧选择一个局域网用户发起会话</p>
        </div>
      </template>
    </main>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { usePeersStore, useIdentityStore, useMessagesStore } from "@/stores";
import { useWebRTC } from "@/utils/webrtc";
import ChatWindow from "@/components/ChatWindow.vue";
import Avatar from "@/components/Avatar.vue";

const peersStore = usePeersStore();
const idStore    = useIdentityStore();
const msgStore   = useMessagesStore();
const rtc        = useWebRTC();

const scanning = ref(false);

const allPeers    = computed(() => peersStore.peers);
const onlinePeers = computed(() => peersStore.peers.filter(p => p.status !== "offline"));

function unread(peerId) { return 0; } // TODO: track unread count

async function scanPeers() {
  scanning.value = true;
  await invoke("trigger_scan");
  setTimeout(() => scanning.value = false, 2000);
}

async function selectPeer(peer) {
  peersStore.active = peer.id;
  await msgStore.loadFromDB(peer.id);
  // Initiate WebRTC
  if (!rtc.connStore.connections[peer.id]?.dc) {
    rtc.connect(peer.id);
  }
}

async function minimize() {
  const { appWindow } = await import("@tauri-apps/api/window");
  appWindow.minimize();
}

onMounted(() => {
  scanPeers();
});
</script>
