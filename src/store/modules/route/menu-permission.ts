import type { ElegantConstRoute } from '@elegant-router/types';
import { normalizeMenuIconType } from '@/utils/system-manage';

interface GrantedMenu {
  menu: Api.Auth.AuthorizedMenu;
  parentRouteName?: string;
}

function getEnabledMenus(menus: readonly Api.Auth.AuthorizedMenu[], parentRouteName?: string): GrantedMenu[] {
  return menus.flatMap(menu =>
    menu.status === 'DISABLED'
      ? []
      : [{ menu, parentRouteName }, ...getEnabledMenus(menu.children ?? [], menu.routeName)]
  );
}

function applyMenuMetadata(route: ElegantConstRoute, grant?: GrantedMenu, parentRouteName?: string): ElegantConstRoute {
  if (!grant) return route;

  const { menu } = grant;
  const title = menu.menuName?.trim();
  const icon = menu.icon?.trim() || undefined;
  const isLocalIcon = normalizeMenuIconType(menu.iconType) === 'LOCAL';
  const groupMatchesParent = grant.parentRouteName ? grant.parentRouteName === parentRouteName : menu.parentId == null;

  return {
    ...route,
    meta: {
      ...route.meta,
      title: title || route.meta?.title || route.name,
      i18nKey: title ? null : route.meta?.i18nKey,
      menuType: menu.menuType ?? route.meta?.menuType,
      order: menu.sortNumber ?? route.meta?.order,
      hideInMenu: menu.hideRoute ?? route.meta?.hideInMenu,
      ...(menu.menuGroupName !== undefined && { menuGroupName: groupMatchesParent ? menu.menuGroupName : null }),
      ...(menu.icon !== undefined && {
        icon: isLocalIcon ? undefined : icon,
        localIcon: isLocalIcon ? icon : undefined
      })
    }
  };
}

function filterGrantedRoutes(
  routes: readonly ElegantConstRoute[],
  grantedMenus: ReadonlyMap<string, GrantedMenu>,
  parentRouteName?: string
): ElegantConstRoute[] {
  return routes.flatMap(route => {
    const grant = grantedMenus.get(route.name);
    if (route.children?.length) {
      const children = filterGrantedRoutes(route.children, grantedMenus, route.name);
      return children.length ? [{ ...applyMenuMetadata(route, grant, parentRouteName), children }] : [];
    }

    return route.name === 'home' || grant ? [applyMenuMetadata(route, grant, parentRouteName)] : [];
  });
}

export function filterAuthRoutesByMenuPermission(
  routes: readonly ElegantConstRoute[],
  authMenuList?: readonly Api.Auth.AuthorizedMenu[] | null
): ElegantConstRoute[] {
  const grantedMenus = new Map(getEnabledMenus(authMenuList ?? []).map(grant => [grant.menu.routeName, grant]));
  return filterGrantedRoutes(routes, grantedMenus);
}
