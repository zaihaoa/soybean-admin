<script setup lang="ts">
import { computed } from 'vue';
import { GLOBAL_SIDER_MENU_ID, GLOBAL_SIDER_SUBMENU_ID } from '@/constants/app';
import { useAppStore } from '@/store/modules/app';
import { useThemeStore } from '@/store/modules/theme';
import { useVerticalMenuContext } from '../global-menu/context/vertical';
import GlobalLogo from '../global-logo/index.vue';

defineOptions({
  name: 'GlobalSider'
});

const appStore = useAppStore();
const themeStore = useThemeStore();
const { panelMenu, renderedPanelMenu, closePanel } = useVerticalMenuContext('GlobalSider');

const isTopHybridSidebarFirst = computed(() => themeStore.layout.mode === 'top-hybrid-sidebar-first');
const isTopHybridHeaderFirst = computed(() => themeStore.layout.mode === 'top-hybrid-header-first');
const darkMenu = computed(
  () =>
    !themeStore.darkMode && !isTopHybridSidebarFirst.value && !isTopHybridHeaderFirst.value && themeStore.sider.inverted
);
const showLogo = computed(() => themeStore.layout.mode === 'vertical');
const menuWrapperClass = computed(() => (showLogo.value ? 'flex-1-hidden' : 'h-full'));
</script>

<template>
  <DarkModeContainer class="relative size-full flex shadow-sider" :inverted="darkMenu" @keydown.esc="closePanel">
    <div class="size-full min-w-0 flex-col-stretch">
      <GlobalLogo
        v-if="showLogo"
        class="shrink-0"
        :show-title="!appStore.siderCollapse"
        :style="{ height: themeStore.header.height + 'px' }"
      />
      <div :id="GLOBAL_SIDER_MENU_ID" :class="menuWrapperClass"></div>
      <div v-if="showLogo" class="flex-center shrink-0 py-4px">
        <MenuToggler
          :collapsed="appStore.siderCollapse"
          :aria-controls="GLOBAL_SIDER_MENU_ID"
          hide-tooltip
          @click="appStore.toggleSiderCollapse"
        />
      </div>
    </div>
    <Transition name="submenu-backdrop">
      <div
        v-if="panelMenu"
        class="fixed inset-y-0 left-[var(--soy-sider-collapsed-width)] right-0 bg-black/20"
        aria-hidden="true"
        @click="closePanel"
      ></div>
    </Transition>
    <Transition name="submenu-panel">
      <div
        v-if="showLogo"
        v-show="panelMenu"
        :id="GLOBAL_SIDER_SUBMENU_ID"
        :inert="!panelMenu"
        class="absolute left-full top-0 z-1 h-full flex-col-stretch border-l border-gray-200/60 bg-inherit shadow-sider dark:border-gray-700"
        :style="{ width: `${themeStore.sider.mixChildMenuWidth}px` }"
      >
        <div
          class="mx-12px flex-y-center shrink-0 border-b border-slate-200 px-4px dark:border-slate-700"
          :class="{ 'text-white': darkMenu }"
          :style="{ height: themeStore.header.height + 'px' }"
        >
          <h2 class="truncate text-16px font-bold" :title="renderedPanelMenu?.label">
            {{ renderedPanelMenu?.label }}
          </h2>
        </div>
      </div>
    </Transition>
  </DarkModeContainer>
</template>

<style scoped>
@media (prefers-reduced-motion: no-preference) {
  .submenu-panel-enter-active {
    transition: clip-path 240ms ease-out;
  }

  .submenu-panel-leave-active {
    transition: clip-path 240ms ease-in;
  }

  .submenu-panel-enter-from,
  .submenu-panel-leave-to {
    clip-path: inset(0 100% 0 0);
  }

  .submenu-panel-enter-to,
  .submenu-panel-leave-from {
    clip-path: inset(0);
  }

  .submenu-backdrop-enter-active,
  .submenu-backdrop-leave-active {
    transition: opacity 200ms ease-out;
  }

  .submenu-backdrop-enter-from,
  .submenu-backdrop-leave-to {
    opacity: 0;
  }
}
</style>
