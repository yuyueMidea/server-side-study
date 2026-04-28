<template>
  <div ref="listEl" class="flex flex-col gap-1 p-4">
    <!-- date separator helper -->
    <template v-for="(group, gi) in groupedMessages" :key="gi">
      <!-- Date label -->
      <div class="flex items-center gap-3 my-3">
        <div class="flex-1 h-px bg-surface-800"></div>
        <span class="text-[11px] text-surface-600 font-medium px-2">{{ group.label }}</span>
        <div class="flex-1 h-px bg-surface-800"></div>
      </div>

      <!-- Messages -->
      <div v-for="(msg, mi) in group.messages" :key="msg.id"
        class="bubble-pop flex gap-3 items-end"
        :class="msg.from === selfName ? 'flex-row-reverse' : 'flex-row'"
      >
        <!-- Avatar (only for first in run) -->
        <div class="shrink-0 w-8">
          <Avatar v-if="isFirstInRun(group.messages, mi)"
            :name="msg.from" :size="32" />
        </div>

        <!-- Bubble -->
        <div class="max-w-[70%] flex flex-col"
          :class="msg.from === selfName ? 'items-end' : 'items-start'">

          <!-- name (first in run) -->
          <span v-if="isFirstInRun(group.messages, mi) && msg.from !== selfName"
            class="text-xs text-surface-500 mb-1 px-1">
            {{ msg.from }}
          </span>

          <!-- file bubble -->
          <div v-if="msg.type === 'file'"
            class="flex items-center gap-3 rounded-2xl px-4 py-3 border text-sm"
            :class="msg.from === selfName
              ? 'bg-accent-500/20 border-accent-500/30 text-accent-300'
              : 'bg-surface-800 border-surface-700 text-surface-200'">
            <svg class="w-8 h-8 shrink-0 text-current opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <div class="min-w-0">
              <p class="font-medium truncate">{{ msg.fileName }}</p>
              <p class="text-xs opacity-60">{{ formatSize(msg.fileSize) }}</p>
            </div>
            <a v-if="msg.fileUrl" :href="msg.fileUrl" :download="msg.fileName"
              class="shrink-0 ml-1 p-1.5 rounded-lg hover:bg-white/10 transition-colors">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            </a>
          </div>

          <!-- text bubble -->
          <div v-else
            class="px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words"
            :class="msg.from === selfName
              ? 'bg-accent-500 text-white rounded-br-md'
              : 'bg-surface-800 text-surface-100 rounded-bl-md'"
          >
            {{ msg.text }}
          </div>

          <!-- timestamp + status -->
          <div class="flex items-center gap-1 mt-1 px-1">
            <span class="text-[10px] text-surface-600">{{ formatTime(msg.timestamp) }}</span>
            <span v-if="msg.from === selfName" class="text-[10px]"
              :class="msg.status === 'sent' ? 'text-surface-500' : 'text-accent-400'">
              {{ msg.status === "sent" ? "✓" : msg.status === "failed" ? "!" : "…" }}
            </span>
          </div>
        </div>
      </div>
    </template>

    <!-- Empty state -->
    <div v-if="messages.length === 0" class="flex-1 flex flex-col items-center justify-center py-16 text-center">
      <div class="w-12 h-12 rounded-full bg-surface-800 flex items-center justify-center mb-3">
        <svg class="w-6 h-6 text-surface-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
        </svg>
      </div>
      <p class="text-surface-500 text-sm">开始新对话</p>
      <p class="text-surface-600 text-xs mt-1">发送的消息端到端加密，仅在局域网传输</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from "vue";
import { useMessagesStore, useIdentityStore } from "@/stores";
import Avatar from "./Avatar.vue";

const props = defineProps({ peerId: { type: String, required: true } });
const msgStore = useMessagesStore();
const idStore  = useIdentityStore();
const listEl   = ref(null);
const selfName = computed(() => idStore.username);
const messages = computed(() => msgStore.threadOf(props.peerId));

function isFirstInRun(msgs, idx) {
  if (idx === 0) return true;
  return msgs[idx].from !== msgs[idx - 1].from;
}

// Group by day
const groupedMessages = computed(() => {
  const groups = [];
  const dayMap = {};
  for (const msg of messages.value) {
    const d = new Date(msg.timestamp);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!dayMap[key]) {
      const label = isToday(d) ? "今天" : isYesterday(d) ? "昨天" : d.toLocaleDateString("zh-CN");
      dayMap[key] = { label, messages: [] };
      groups.push(dayMap[key]);
    }
    dayMap[key].messages.push(msg);
  }
  return groups;
});

function isToday(d) {
  const t = new Date();
  return d.getDate()===t.getDate() && d.getMonth()===t.getMonth() && d.getFullYear()===t.getFullYear();
}
function isYesterday(d) {
  const t = new Date(); t.setDate(t.getDate()-1);
  return d.getDate()===t.getDate() && d.getMonth()===t.getMonth() && d.getFullYear()===t.getFullYear();
}
function formatTime(ts) {
  return new Date(ts).toLocaleTimeString("zh-CN", { hour:"2-digit", minute:"2-digit" });
}
function formatSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + " KB";
  return (bytes/(1024*1024)).toFixed(1) + " MB";
}

// Auto-scroll to bottom on new messages
watch(messages, () => nextTick(() => {
  if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight;
}), { deep: true });
</script>
