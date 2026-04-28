<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="h-14 flex items-center justify-between px-5 border-b border-surface-800 shrink-0">
      <div class="flex items-center gap-3">
        <div class="relative">
          <Avatar :name="peer.username" :size="34" />
          <span class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-surface-950"
            :class="peer.status === 'online' ? 'bg-online' : 'bg-offline'">
          </span>
        </div>
        <div>
          <p class="font-medium text-white text-sm">{{ peer.username }}</p>
          <p class="text-xs text-surface-500 font-mono">
            {{ peer.ip }}
            <span class="ml-2 text-surface-600"
              :class="connMode === 'webrtc' ? 'text-online' : 'text-away'">
              ● {{ connMode === "webrtc" ? "WebRTC P2P" : connMode === "websocket" ? "WebSocket" : "连接中..." }}
            </span>
          </p>
        </div>
      </div>

      <!-- file send btn -->
      <label class="btn-ghost cursor-pointer" title="发送文件">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
        </svg>
        <input type="file" class="hidden" @change="handleFileInput" />
      </label>
    </div>

    <!-- Message list -->
    <MessageList :peer-id="peer.id" class="flex-1 overflow-y-auto" />

    <!-- File transfer progress -->
    <FileTransferBanner />

    <!-- Input area -->
    <div
      class="border-t border-surface-800 p-4 shrink-0"
      @dragover.prevent="dragging = true"
      @dragleave="dragging = false"
      @drop.prevent="handleDrop"
    >
      <!-- drag overlay -->
      <div v-if="dragging"
        class="absolute inset-0 z-50 bg-surface-900/90 border-2 border-dashed border-accent-500 rounded-xl
               flex items-center justify-center pointer-events-none">
        <div class="text-center">
          <svg class="w-12 h-12 text-accent-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <p class="text-accent-400 font-medium">松开发送文件</p>
        </div>
      </div>

      <div class="flex items-end gap-3">
        <textarea
          v-model="inputText"
          ref="inputRef"
          class="input-base flex-1 resize-none min-h-[42px] max-h-32 py-2.5 leading-relaxed"
          placeholder="输入消息… (Enter 发送, Shift+Enter 换行)"
          @keydown.enter.exact.prevent="sendText"
          @keydown.enter.shift.exact="() => {}"
          rows="1"
          @input="autoResize"
        />
        <button class="btn-primary !py-2.5 !px-4 shrink-0" @click="sendText" :disabled="!inputText.trim()">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from "vue";
import { usePeersStore, useMessagesStore, useConnectionStore, useIdentityStore } from "@/stores";
import { useWebRTC } from "@/utils/webrtc";
import MessageList from "./MessageList.vue";
import Avatar from "./Avatar.vue";
import FileTransferBanner from "./FileTransferBanner.vue";

const peersStore = usePeersStore();
const msgStore   = useMessagesStore();
const connStore  = useConnectionStore();
const idStore    = useIdentityStore();
const rtc        = useWebRTC();

const peer      = computed(() => peersStore.activePeer);
const inputText = ref("");
const dragging  = ref(false);
const inputRef  = ref(null);

const connMode = computed(() => {
  const conn = connStore.connections[peer.value?.id];
  if (!conn) return "none";
  if (conn.mode === "webrtc" && conn.dc?.readyState === "open") return "webrtc";
  if (conn.mode === "websocket" && conn.ws?.readyState === 1) return "websocket";
  return "connecting";
});

function autoResize() {
  const el = inputRef.value;
  if (!el) return;
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 128) + "px";
}

function sendText() {
  const text = inputText.value.trim();
  if (!text || !peer.value) return;

  const sent = rtc.sendText(peer.value.id, text);
  const msg = {
    from: idStore.username, text, timestamp: Date.now(), type: "text",
    status: sent ? "sent" : "failed",
  };
  msgStore.addMessage(peer.value.id, msg);
  msgStore.saveToDB(peer.value.id, msg);
  inputText.value = "";
  nextTick(() => {
    if (inputRef.value) {
      inputRef.value.style.height = "auto";
    }
  });
}

async function handleDrop(e) {
  dragging.value = false;
  const files = [...e.dataTransfer.files];
  for (const f of files) await sendFile(f);
}

async function handleFileInput(e) {
  const files = [...e.target.files];
  for (const f of files) await sendFile(f);
  e.target.value = "";
}

async function sendFile(file) {
  if (!peer.value) return;
  const ok = await rtc.sendFile(peer.value.id, file);
  if (ok) {
    msgStore.addMessage(peer.value.id, {
      from: idStore.username, type: "file",
      fileName: file.name, fileSize: file.size,
      timestamp: Date.now(), status: "sent",
    });
  }
}
</script>
