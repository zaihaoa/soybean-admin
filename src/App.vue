<script setup lang="ts">
import { computed, h } from 'vue';
import { NConfigProvider, darkTheme } from 'naive-ui';
import type { DataTableRenderSorter, WatermarkProps } from 'naive-ui';
import { naiveDateLocales, naiveLocales } from './locales/naive';
import { useAppStore } from './store/modules/app';
import { useThemeStore } from './store/modules/theme';

defineOptions({
  name: 'App'
});

const appStore = useAppStore();
const themeStore = useThemeStore();

const naiveDarkTheme = computed(() => (themeStore.darkMode ? darkTheme : undefined));

const naiveLocale = computed(() => {
  return naiveLocales[appStore.locale];
});

const naiveDateLocale = computed(() => {
  return naiveDateLocales[appStore.locale];
});

const watermarkProps = computed<WatermarkProps>(() => {
  return {
    content: themeStore.watermarkContent,
    cross: true,
    fullscreen: true,
    fontSize: 16,
    lineHeight: 16,
    width: 384,
    height: 384,
    xOffset: 12,
    yOffset: 60,
    rotate: -15,
    zIndex: 9999
  };
});

const renderTableSorter: DataTableRenderSorter = ({ order }) =>
  h(
    'svg',
    {
      class: 'table-sort-indicator',
      width: 14,
      height: 16,
      viewBox: '0 0 14 16',
      fill: 'currentColor',
      'aria-hidden': true,
      focusable: 'false'
    },
    [
      h('path', { d: 'M7 1 13 7H1Z', class: { 'is-active': order === 'ascend' } }),
      h('path', { d: 'M1 9H13L7 15Z', class: { 'is-active': order === 'descend' } })
    ]
  );

const componentOptions = { DataTable: { renderSorter: renderTableSorter } };
</script>

<template>
  <NConfigProvider
    :theme="naiveDarkTheme"
    :theme-overrides="themeStore.naiveTheme"
    :locale="naiveLocale"
    :date-locale="naiveDateLocale"
    :component-options="componentOptions"
    class="h-full"
  >
    <AppProvider>
      <RouterView class="bg-layout" />
      <NWatermark v-if="themeStore.watermark.visible" v-bind="watermarkProps" />
    </AppProvider>
  </NConfigProvider>
</template>

<style scoped></style>
