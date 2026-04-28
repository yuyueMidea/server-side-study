<template>
  <div class="min-h-screen bg-surface-950 flex items-center justify-center p-6">
    <!-- background grid -->
    <div class="absolute inset-0 opacity-[0.04]"
      style="background-image: linear-gradient(#fff 1px, transparent 1px),
             linear-gradient(90deg, #fff 1px, transparent 1px);
             background-size: 40px 40px;">
    </div>

    <!-- accent blob -->
    <div class="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full
                bg-accent-500/10 blur-[100px] pointer-events-none"></div>

    <div class="relative z-10 w-full max-w-sm">
      <!-- logo -->
      <div class="mb-10 text-center">
        <div class="inline-flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-xl bg-accent-500 flex items-center justify-center shadow-glow">
            <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
            </svg>
          </div>
          <span class="font-display text-2xl font-bold text-white tracking-tight">LAN · IM</span>
        </div>
        <p class="text-surface-400 text-sm">局域网即时通讯 · 无需公网</p>
      </div>

      <!-- card -->
      <div class="card p-6 space-y-5">
        <div>
          <label class="block text-xs font-medium text-surface-400 mb-2 uppercase tracking-widest">
            你的昵称
          </label>
          <input
            v-model="username"
            class="input-base text-lg"
            placeholder="输入一个名字..."
            @keyup.enter="start"
            autofocus
          />
        </div>

        <div v-if="localIp" class="flex items-center gap-2 text-sm text-surface-400">
          <div class="w-2 h-2 rounded-full bg-online animate-pulse"></div>
          本机 IP：<span class="text-surface-200 font-mono">{{ localIp }}</span>
        </div>

        <button class="btn-primary w-full text-base py-3" :disabled="!username.trim()" @click="start">
          进入内网 →
        </button>
      </div>

      <p class="text-center text-surface-600 text-xs mt-6">
        所有消息仅在局域网内传输，端对端加密
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { invoke } from "@tauri-apps/api/core";
import { useIdentityStore } from "@/stores";

const router   = useRouter();
const idStore  = useIdentityStore();
const username = ref(idStore.username || "");
const localIp  = ref(idStore.localIp  || "");

onMounted(async () => {
  await idStore.fetchLocalIp();
  localIp.value = idStore.localIp;
});

async function start() {
  if (!username.value.trim()) return;
  idStore.setUsername(username.value.trim());
  // Tell Rust to start UDP discovery broadcast
  await invoke("start_discovery", { username: username.value.trim() });
  // Init SQLite DB
  await invoke("init_db");
  router.push("/main");
}
</script>
