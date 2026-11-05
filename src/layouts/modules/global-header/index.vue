<script setup lang="ts">
import { useFullscreen } from '@vueuse/core';
import { GLOBAL_HEADER_MENU_ID, GLOBAL_SIDER_MENU_ID } from '@/constants/app';
import { useAppStore } from '@/store/modules/app';
import { useThemeStore } from '@/store/modules/theme';
import GlobalBreadcrumb from '../global-breadcrumb/index.vue';
import GlobalLogo from '../global-logo/index.vue';
import GlobalSearch from '../global-search/index.vue';
import GlobalTab from '../global-tab/index.vue';
import ThemeButton from './components/theme-button.vue';
import UserAvatar from './components/user-avatar.vue';

defineOptions({
  name: 'GlobalHeader'
});

interface Props {
  /** Whether to show the logo */
  showLogo?: App.Global.HeaderProps['showLogo'];
  /** Whether to show the menu toggler */
  showMenuToggler?: App.Global.HeaderProps['showMenuToggler'];
  /** Whether to show the menu */
  showMenu?: App.Global.HeaderProps['showMenu'];
}

defineProps<Props>();

const appStore = useAppStore();
const themeStore = useThemeStore();
const { isFullscreen, toggle } = useFullscreen();
</script>

<template>
  <DarkModeContainer class="header-bar h-full flex-y-center px-12px shadow-header lt-sm:px-4px">
    <GlobalLogo v-if="showLogo" class="h-full shrink-0" :style="{ width: themeStore.sider.width + 'px' }" />
    <MenuToggler
      v-if="showMenuToggler"
      :collapsed="appStore.siderCollapse"
      :aria-controls="GLOBAL_SIDER_MENU_ID"
      @click="appStore.toggleSiderCollapse"
    />
    <div v-if="showMenu" :id="GLOBAL_HEADER_MENU_ID" class="h-full min-w-0 flex-y-center flex-1-hidden"></div>
    <GlobalBreadcrumb
      v-else-if="!appStore.isMobile"
      class="ml-12px min-w-0 overflow-hidden"
      :class="{ 'max-w-1/3': themeStore.tab.visible }"
    />
    <GlobalTab v-if="themeStore.tab.visible" />
    <div class="ml-auto h-full flex-y-center shrink-0">
      <GlobalSearch v-if="themeStore.header.globalSearch.visible" />
      <FullScreen v-if="!appStore.isMobile" :full="isFullscreen" @click="toggle" />
      <LangSwitch
        v-if="themeStore.header.multilingual.visible"
        :lang="appStore.locale"
        :lang-options="appStore.localeOptions"
        @change-lang="appStore.changeLocale"
      />
      <ThemeSchemaSwitch
        :theme-schema="themeStore.themeScheme"
        :is-dark="themeStore.darkMode"
        @switch="themeStore.toggleThemeScheme"
      />
      <ThemeButton />
      <UserAvatar />
    </div>
  </DarkModeContainer>
</template>

<style scoped>
@media (width < 640px) {
  .header-bar :deep(.n-button) {
    padding-inline: 6px;
  }
}
</style>
