<script setup lang="ts">
import Toast from 'primevue/toast';
import { useRoute, useRouter } from 'vue-router';
import { computed, ref, watch } from 'vue';
import { useLayoutStore } from '../stores/layout';
import AppSidebar from './AppSidebar.vue';
import AppHeader from './AppHeader.vue';

const route = useRoute();
const router = useRouter();
const currentRouteName = computed(() => route.name as string);
const drawerOpen = ref(false);
const layout = useLayoutStore();
const isBlankLayout = computed(() => route.meta.layout === 'blank');

watch(
  () => route.name,
  () => {
    drawerOpen.value = false;
  },
);

function navigateTo(name: string) {
  router.push({ name });
}
</script>

<template>
  <div
    class="h-dvh w-full flex overflow-hidden bg-surface-50 dark:bg-surface-950"
  >
    <Toast position="top-center" />

    <!-- Mobile Drawer Backdrop -->
    <Transition name="drawer-fade">
      <div
        v-if="drawerOpen && !isBlankLayout"
        class="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
        @click="drawerOpen = false"
      />
    </Transition>

    <AppSidebar
      v-if="!isBlankLayout"
      :open="drawerOpen"
      :current-route-name="currentRouteName"
      @navigate="navigateTo"
      @close="drawerOpen = false"
    />

    <!-- Right column -->
    <div class="flex-1 flex flex-col overflow-hidden min-w-0">
      <AppHeader
        v-if="!isBlankLayout"
        :title="layout.pageTitle"
        @toggle-drawer="drawerOpen = true"
      />

      <main class="flex-1 flex flex-col min-h-0 overflow-hidden">
        <router-view v-slot="{ Component }">
          <transition
            name="slide"
            mode="out-in"
          >
            <keep-alive>
              <component :is="Component" />
            </keep-alive>
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<style>
.slide-enter-active,
.slide-leave-active {
  transition: all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.slide-enter-from {
  opacity: 0;
  transform: translateX(15px);
}
.slide-leave-to {
  opacity: 0;
  transform: translateX(-15px);
}

.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity 0.3s ease;
}
.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}

.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
</style>
