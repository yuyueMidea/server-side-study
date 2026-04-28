<template>
  <div
    :style="{ width: size + 'px', height: size + 'px', fontSize: (size * 0.4) + 'px', background: color }"
    class="rounded-full flex items-center justify-center text-white font-display font-bold shrink-0 select-none"
  >
    {{ initials }}
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  name: { type: String, default: "?" },
  size: { type: Number, default: 36 },
});

const COLORS = [
  "#f55f1a","#e63946","#2a9d8f","#457b9d","#6a4c93",
  "#e9c46a","#118ab2","#ef476f","#06d6a0","#073b4c",
];

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h);
}

const color    = computed(() => COLORS[hashCode(props.name) % COLORS.length]);
const initials = computed(() => {
  const parts = (props.name || "?").trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return props.name.slice(0, 2).toUpperCase();
});
</script>
