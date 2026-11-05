import assert from 'node:assert/strict';
import test from 'node:test';
import { filterAuthRoutesByMenuPermission } from '../src/store/modules/route/menu-permission';
import { generatedRoutes } from '../src/router/elegant/routes';

const routes = generatedRoutes.filter(route => !route.meta?.constant);

test('registers only authorized management pages and keeps their parent and home', () => {
  const result = filterAuthRoutesByMenuPermission(routes, [
    { routeName: 'manage', children: [{ routeName: 'manage_user' }] },
    { routeName: 'unregistered' }
  ]);

  assert.deepEqual(
    result.map(route => route.name),
    ['home', 'manage']
  );
  assert.deepEqual(
    result.find(route => route.name === 'manage')?.children?.map(route => [route.name, route.path, route.component]),
    [['manage_user', '/manage/user', 'view.manage_user']]
  );
  assert.equal(routes.find(route => route.name === 'manage')?.children?.length, 3);
});

test('keeps a parent for a granted child even if the parent name is absent', () => {
  const result = filterAuthRoutesByMenuPermission(routes, [{ routeName: 'manage_role' }]);

  assert.deepEqual(
    result.find(route => route.name === 'manage')?.children?.map(route => route.name),
    ['manage_role']
  );
});

test('uses backend names, icons, order and visibility while retaining the local page mapping', () => {
  const result = filterAuthRoutesByMenuPermission(routes, [
    {
      routeName: 'manage',
      menuName: '系统',
      icon: 'carbon:cloud-service-management',
      iconType: 'ICONIFY',
      sortNumber: 1000,
      hideRoute: false,
      children: [
        {
          routeName: 'manage_user',
          menuName: '账号管理',
          icon: 'custom-user',
          iconType: 'LOCAL',
          sortNumber: 0,
          hideRoute: true
        },
        { routeName: 'manage_role', menuName: '角色管理', status: 'DISABLED' }
      ]
    }
  ]);

  const group = result.find(route => route.name === 'manage');
  assert.ok(group?.meta);
  assert.equal(group.meta.title, '系统');
  assert.equal(group.meta.i18nKey, null);
  assert.equal(group.meta.icon, 'carbon:cloud-service-management');
  assert.equal(group.meta.order, 1000);
  assert.equal(group.meta.hideInMenu, false);
  assert.deepEqual(
    group.children?.map(route => route.name),
    ['manage_user']
  );

  const user = group.children?.[0];
  assert.ok(user?.meta);
  assert.equal(user.path, '/manage/user');
  assert.equal(user.component, 'view.manage_user');
  assert.equal(user.meta.title, '账号管理');
  assert.equal(user.meta.i18nKey, null);
  assert.equal(user.meta.icon, undefined);
  assert.equal(user.meta.localIcon, 'custom-user');
  assert.equal(user.meta.order, 0);
  assert.equal(user.meta.hideInMenu, true);
});

test('missing menu grants and a directory without granted children both hide the management section', () => {
  for (const menus of [undefined, null, [], [{ routeName: 'manage' }]]) {
    const result = filterAuthRoutesByMenuPermission(routes, menus);
    assert.deepEqual(
      result.map(route => route.name),
      ['home']
    );
  }
});
