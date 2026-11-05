import assert from 'node:assert/strict';
import test from 'node:test';
import { groupMenuChildren } from '../src/layouts/modules/global-menu/shared';
import { filterAuthRoutesByMenuPermission } from '../src/store/modules/route/menu-permission';
import { generatedRoutes } from '../src/router/elegant/routes';

function menu(key: string, menuGroupName?: string | null): App.Global.Menu {
  return { key, label: key, menuGroupName, routeKey: 'manage_user', routePath: '/manage/user' };
}

test('groups sibling menus by trimmed names in order of first appearance', () => {
  const user = menu('user', ' 基础 ');
  const ungrouped = menu('ungrouped');
  const settings = menu('settings', '配置');
  const role = menu('role', '基础');
  const blank = menu('blank', '  ');
  const parent = { ...menu('manage'), children: [user, ungrouped, settings, role, blank] };

  const options = groupMenuChildren(parent);
  assert.deepEqual(
    options.map(option => option.label),
    ['基础', '配置', 'ungrouped', 'blank']
  );
  assert.deepEqual(options[0].children, [user, role]);
  assert.deepEqual(options[1].children, [settings]);
  assert.deepEqual(parent.children, [user, ungrouped, settings, role, blank]);
});

test('keeps same-named groups separate across parents and accepts legacy menu entries', () => {
  const legacy = menu('legacy');
  const first = groupMenuChildren({ ...menu('first'), children: [menu('a', '基础')] });
  const second = groupMenuChildren({ ...menu('second'), children: [menu('b', '基础')] });

  assert.notEqual(first[0].key, second[0].key);
  assert.deepEqual(groupMenuChildren({ ...menu('old'), children: [legacy] }), [legacy]);
  assert.deepEqual(groupMenuChildren(menu('empty')), []);
});

test('carries group names only on authorized routes', () => {
  const routes = filterAuthRoutesByMenuPermission(generatedRoutes, [
    { routeName: 'manage_user', menuGroupName: '基础' },
    { routeName: 'manage_role', menuGroupName: '权限', status: 'DISABLED' }
  ]);
  const children = routes.find(route => route.name === 'manage')?.children;

  assert.deepEqual(
    children?.map(route => [route.name, route.meta?.menuGroupName]),
    [['manage_user', '基础']]
  );
});

test('does not render a group from a different parent in the static route tree', () => {
  const routes = filterAuthRoutesByMenuPermission(generatedRoutes, [
    { routeName: 'manage', children: [{ routeName: 'manage_user', menuGroupName: '基础' }] },
    { routeName: 'other', children: [{ routeName: 'manage_role', menuGroupName: '权限' }] }
  ]);
  const children = routes.find(route => route.name === 'manage')?.children;

  assert.equal(children?.find(route => route.name === 'manage_user')?.meta?.menuGroupName, '基础');
  assert.equal(children?.find(route => route.name === 'manage_role')?.meta?.menuGroupName, null);
});
