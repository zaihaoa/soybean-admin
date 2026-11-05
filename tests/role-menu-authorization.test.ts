import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createMenuAuthorization,
  getMenuAuthorizationState,
  setMenuAuthorizationBranch,
  setMenuAuthorizationButton
} from '../src/views/manage/role/modules/menu-authorization';

const tree = [
  {
    id: '1',
    menuName: 'Module',
    children: [
      {
        id: '2',
        menuName: 'First',
        button: [
          { code: 'shared', label: 'Shared' },
          { code: 'edit', label: 'Edit' }
        ]
      },
      { id: '3', menuName: 'Second', button: [{ code: 'shared', label: 'Shared' }] }
    ]
  }
];

test('selects the whole branch and keeps a menu after revoking one action', () => {
  const model = createMenuAuthorization(tree);
  const selection = setMenuAuthorizationBranch(model, { menuIds: [], buttonCodes: [] }, '1', true);
  assert.deepEqual(selection, { menuIds: ['1', '2', '3'], buttonCodes: ['shared', 'edit'] });
  const edited = setMenuAuthorizationButton(model, selection, '2', 'edit', false);
  assert.deepEqual(edited, { menuIds: ['1', '2', '3'], buttonCodes: ['shared'] });
  assert.deepEqual(
    getMenuAuthorizationState(
      model,
      { menuIds: new Set(edited.menuIds), buttonCodes: new Set(edited.buttonCodes) },
      '1'
    ),
    { checked: false, indeterminate: true }
  );
});

test('selects an action with its ancestors and retains codes shared by another selected menu', () => {
  const model = createMenuAuthorization(tree);
  const initial = setMenuAuthorizationButton(model, { menuIds: [], buttonCodes: [] }, '2', 'shared', true);
  assert.deepEqual(initial, { menuIds: ['1', '2'], buttonCodes: ['shared'] });
  const both = setMenuAuthorizationBranch(model, initial, '3', true);
  const edited = setMenuAuthorizationBranch(model, both, '2', false);
  assert.deepEqual(edited, { menuIds: ['1', '3'], buttonCodes: ['shared'] });
});
