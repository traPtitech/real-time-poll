import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: () => import("../views/HomeView.vue"),
    },
    {
      path: "/poll/:id",
      name: "poll",
      component: () => import("../views/PollView.vue"),
      props: true,
    },
    import.meta.env.DEV && {
      path: "/debug",
      name: "debug",
      component: () => import("../views/DebugView.vue"),
    },
  ].filter((r) => !!r),
});

export default router;
