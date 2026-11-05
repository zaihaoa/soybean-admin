<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue';
import type { MenuGroupOption, MenuOption } from 'naive-ui';
import { SimpleScrollbar } from '@sa/materials';
import { GLOBAL_SIDER_MENU_ID, GLOBAL_SIDER_SUBMENU_ID } from '@/constants/app';
import { useRouteStore } from '@/store/modules/route';
import { useThemeStore } from '@/store/modules/theme';
import { groupMenuChildren } from '../shared';
import { useMenu } from '../context';
import { useVerticalMenuContext } from '../context/vertical';

defineOptions({
  name: 'VerticalMenu'
});

const themeStore = useThemeStore();
const routeStore = useRouteStore();
const { selectedKey } = useMenu();
const { desktopCollapsed, activeRootMenu, panelMenu, renderedPanelMenu, navigateMenu, selectRootMenu } =
  useVerticalMenuContext('VerticalMenu');

const inverted = computed(() => !themeStore.darkMode && themeStore.sider.inverted);
const menuTarget = computed(() => `#${desktopCollapsed.value ? GLOBAL_SIDER_SUBMENU_ID : GLOBAL_SIDER_MENU_ID}`);
const menuOptions = computed(() => {
  if (desktopCollapsed.value) return renderedPanelMenu.value ? groupMenuChildren(renderedPanelMenu.value) : [];

  return routeStore.menus.map(menu => (menu.children?.length ? { ...menu, children: groupMenuChildren(menu) } : menu));
});

const expandedKeys = shallowRef(
  routeStore.menus.filter(menu => menu.key === 'manage' && menu.children?.length).map(menu => menu.key)
);

function expandSelectedMenuPath(key: string) {
  if (!key) return;

  const path = routeStore.getSelectedMenuKeyPath(key);
  expandedKeys.value = [...new Set([...expandedKeys.value, ...path])];
}

function handleMenuItemKeydown(event: KeyboardEvent) {
  const { target, key } = event;
  if (!(target instanceof HTMLElement) || !target.matches('.n-menu-item[tabindex]')) return;
  if (key !== 'Enter' && key !== ' ') return;

  event.preventDefault();
  target.querySelector<HTMLElement>(':scope > .n-menu-item-content')?.click();
}

function getMenuNodeProps(option: MenuOption | MenuGroupOption) {
  return { tabindex: option.type === 'group' || option.disabled ? undefined : 0 };
}

watch([selectedKey, desktopCollapsed], ([key]) => expandSelectedMenuPath(key), { immediate: true });
</script>

<template>
  <Teleport v-if="desktopCollapsed" :to="`#${GLOBAL_SIDER_MENU_ID}`">
    <SimpleScrollbar>
      <div class="px-2px pt-7px">
        <button
          v-for="menu in routeStore.menus"
          :key="menu.key"
          type="button"
          class="mb-6px h-56px w-full flex-col-center gap-4px rounded-8px px-4px hover:bg-primary/10 focus-visible:outline-primary"
          :class="{
            'bg-primary/10 text-primary': activeRootMenu?.key === menu.key,
            'text-white/80': inverted && activeRootMenu?.key !== menu.key
          }"
          :aria-current="!menu.children?.length && selectedKey === menu.key ? 'page' : undefined"
          :aria-expanded="menu.children?.length ? panelMenu?.key === menu.key : undefined"
          :aria-controls="menu.children?.length ? GLOBAL_SIDER_SUBMENU_ID : undefined"
          @click="selectRootMenu(menu)"
        >
          <component :is="menu.icon" />
          <span class="w-full truncate">{{ menu.label }}</span>
        </button>
      </div>
    </SimpleScrollbar>
  </Teleport>
  <Teleport v-if="!desktopCollapsed || renderedPanelMenu" :to="menuTarget">
    <SimpleScrollbar>
      <NMenu
        v-model:expanded-keys="expandedKeys"
        class="vertical-menu"
        mode="vertical"
        :value="selectedKey"
        :options="menuOptions"
        :node-props="getMenuNodeProps"
        :inverted="inverted"
        :root-indent="14"
        :indent="18"
        @keydown="handleMenuItemKeydown"
        @update:value="navigateMenu"
      />
    </SimpleScrollbar>
  </Teleport>
</template>

<style scoped>
.vertical-menu {
  padding-top: 5px;
}

.vertical-menu :deep(.n-menu-item-content::before) {
  inset-inline: 3px;
}

.vertical-menu :deep(.n-menu-item:focus-visible) {
  outline: 1px solid var(--n-item-text-color-active);
  outline-offset: -3px;
}

.vertical-menu :deep(.n-menu-item-group-title) {
  display: block;
  overflow: hidden;
  padding-right: 8px;
  line-height: 36px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
