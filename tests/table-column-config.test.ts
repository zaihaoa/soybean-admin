import assert from 'node:assert/strict';
import test from 'node:test';
import {
  decodeColumnConfig,
  mergeColumnSettings,
  serializeColumnSettings
} from '../src/hooks/common/table-column-config';

const defaults = [
  { key: 'name', title: 'Name', visible: true, checked: true, fixed: 'unFixed', required: true, minWidth: 100 },
  { key: 'type', title: 'Type', visible: true, checked: true, fixed: 'unFixed', maxWidth: 220 },
  { key: 'new', title: 'New', visible: true, checked: false, fixed: 'unFixed' },
  { key: 'operate', title: 'Actions', visible: false, checked: true, fixed: 'right' }
] as const;

test('merges user order and widths with current column definitions', () => {
  const columns = mergeColumnSettings(defaults, [
    { key: 'type', visible: false, width: 500 },
    { key: 'removed', visible: true },
    { key: 'name', visible: false, fixed: 'left', width: 60 },
    { key: 'type', visible: true }
  ]);

  assert.deepEqual(
    columns.map(({ key, checked, width }) => [key, checked, width]),
    [
      ['name', true, 100],
      ['type', false, 220],
      ['new', false, undefined],
      ['operate', true, undefined]
    ]
  );
  const saved = JSON.parse(serializeColumnSettings(columns));
  assert.equal(saved.version, 1);
  assert.equal(saved.columns.length, 3);
  assert.equal(saved.columns[0].fixed, 'left');
  assert.equal('title' in saved.columns[0], false);
});

test('limits user-pinned columns independently of the system actions', () => {
  const columns = Array.from({ length: 8 }, (_, i) => ({ ...defaults[1], key: String(i) }));
  const merged = mergeColumnSettings(
    [...columns, defaults[3]],
    columns.map((column, index) => ({
      key: column.key,
      visible: true,
      fixed: index === 0 ? 'right' : 'left'
    }))
  );
  assert.equal(merged.filter(column => column.visible && column.fixed === 'left').length, 7);
  assert.equal(merged[0].fixed, 'left');
  assert.equal(merged.at(-1)?.fixed, 'right');
});

test('distinguishes missing, invalid and newer server preferences', () => {
  assert.deepEqual(decodeColumnConfig(null), { status: 'ready', columns: [] });
  assert.equal(decodeColumnConfig('{invalid').status, 'invalid');
  assert.equal(decodeColumnConfig('{"version":2,"columns":[]}').status, 'unsupported');
  assert.equal(decodeColumnConfig('{"version":1,"columns":[null,{"key":"a","visible":true}]}').status, 'ready');
});
