import { createRouter, createWebHistory } from "vue-router";
import Setup from "@/views/Setup.vue";
import Main from "@/views/Main.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: Setup },
    { path: "/main", component: Main },
  ],
});

export default router;
