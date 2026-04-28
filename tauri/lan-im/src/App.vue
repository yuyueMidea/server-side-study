<template>
  <router-view v-slot="{ Component }">
    <transition name="fade-slide" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
</template>

<script setup>
import { onMounted } from "vue";
import { listen } from "@tauri-apps/api/event";
import { usePeersStore, useIdentityStore } from "@/stores";

const peers   = usePeersStore();
const idStore = useIdentityStore();

onMounted(async () => {
  await idStore.fetchLocalIp();

  // Listen for peer announcements from Rust UDP discovery
  await listen("peer-discovered", e => {
    peers.upsert(e.payload);
  });
  await listen("peer-left", e => {
    peers.markOffline(e.payload.id);
  });
});
</script>
