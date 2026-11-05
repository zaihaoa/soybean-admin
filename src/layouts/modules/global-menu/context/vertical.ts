import { computed, shallowRef, watch } from 'vue';
import { useRoute } from 'vue-router';
import type { RouteKey } from '@elegant-router/types';
import { useContext } from '@sa/hooks';
import { useAppStore } from '@/store/modules/app';
import { useRouteStore } from '@/store/modules/route';
import { useThemeStore } from '@/store/modules/theme';
import { useRouterPush } from '@/hooks/common/router';
import { useMenu } from './index';

export const [provideVerticalMenuContext, useVerticalMenuContext] = useContext('VerticalMenu', useVerticalMenu);

function useVerticalMenu() {
  const route = useRoute();
  const appStore = useAppStore();
  const routeStore = useRouteStore();
  const themeStore = useThemeStore();
  const { routerPushByKeyWithMetaQuery } = useRouterPush();
  const { selectedKey } = useMenu();

  const desktopCollapsed = computed(
    () => themeStore.layout.mode === 'vertical' && appStore.siderCollapse && !appStore.isMobile
  );
  const openMenuKey = shallowRef<string>();
  const routeRootMenu = computed(() => {
    const [routeRootKey] = routeStore.getSelectedMenuKeyPath(selectedKey.value);
    return routeStore.menus.find(menu => menu.key === routeRootKey);
  });
  const panelMenu = computed(() => {
    if (!desktopCollapsed.value || !openMenuKey.value) return undefined;

    return routeStore.menus.find(menu => menu.key === openMenuKey.value && menu.children?.length);
  });
  const renderedPanelMenu = computed<App.Global.Menu | undefined>(previous => panelMenu.value ?? previous);
  const activeRootMenu = computed(() => panelMenu.value ?? routeRootMenu.value);

  function closePanel() {
    openMenuKey.value = undefined;
  }

  function navigateMenu(key: RouteKey) {
    closePanel();
    return routerPushByKeyWithMetaQuery(key);
  }

  function selectRootMenu(menu: App.Global.Menu) {
    if (!menu.children?.length) {
      return navigateMenu(menu.routeKey);
    }

    openMenuKey.value = openMenuKey.value === menu.key ? undefined : menu.key;
  }

  watch([() => route.fullPath, desktopCollapsed], closePanel);

  return { desktopCollapsed, activeRootMenu, panelMenu, renderedPanelMenu, closePanel, navigateMenu, selectRootMenu };
}
