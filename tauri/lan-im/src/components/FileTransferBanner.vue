<template>
  <div v-if="activeTransfers.length" class="border-t border-surface-800 px-4 py-2 space-y-1.5">
    <div v-for="t in activeTransfers" :key="t.id"
      class="flex items-center gap-3 text-xs text-surface-400">
      <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
      <div class="flex-1 min-w-0">
        <div class="flex justify-between mb-0.5">
          <span class="truncate">{{ t.name }}</span>
          <span class="shrink-0 ml-2">{{ t.progress }}%</span>
        </div>
        <div class="w-full bg-surface-700 rounded-full h-1">
          <div class="bg-accent-500 h-1 rounded-full transition-all duration-200"
            :style="{ width: t.progress + '%' }">
          </div>
        </div>
      </div>
      <span class="shrink-0 text-surface-600">
        {{ t.status === "done" ? "✓" : t.status === "sending" ? "↑" : "↓" }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useConnectionStore } from "@/stores";

const connStore = useConnectionStore();
const activeTransfers = computed(() =>
  Object.entries(connStore.fileTransfers)
    .map(([id, t]) => ({ id, ...t }))
    .filter(t => t.status !== "done" || t.progress < 100)
);
</script>
