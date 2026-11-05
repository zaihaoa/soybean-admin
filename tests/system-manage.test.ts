import assert from 'node:assert/strict';
import test from 'node:test';
import { deleteRecords } from '../src/utils/system-manage';
import { parseSystemResponse } from '../src/service/request/response';

test('preserves snowflake IDs in details, roles and authorization arrays without changing pagination numbers', () => {
  const result = parseSystemResponse(
    '{"code":0,"data":{"id":1981234567890123456,"parentId":0,"current":1,"size":10,"total":2,"roles":[{"ruleId":123}],"menuIds":[1981234567890123457,1]}}'
  );
  assert.equal(result.data.id, '1981234567890123456');
  assert.equal(result.data.parentId, '0');
  assert.equal(result.data.roles[0].ruleId, '123');
  assert.deepEqual(result.data.menuIds, ['1981234567890123457', '1']);
  assert.equal(result.data.current, 1);
  assert.equal(result.data.size, 10);
  assert.equal(result.data.total, 2);
});

test('reports partial deletion and continues deleting independent records', async () => {
  const result = await deleteRecords(['a', 'b', 'c'], async id => id !== 'b');
  assert.deepEqual(result, { deleted: ['a', 'c'], failed: ['b'], blocked: [] });
});

test('keeps every ancestor when a descendant fails, while deleting unrelated branches', async () => {
  const calls: string[] = [];
  const result = await deleteRecords(
    ['root', 'parent', 'child', 'other'],
    async id => {
      calls.push(id);
      return id !== 'child';
    },
    [{ id: 'root', children: [{ id: 'parent', children: [{ id: 'child' }] }] }, { id: 'other' }]
  );
  assert.deepEqual(calls, ['child', 'other']);
  assert.deepEqual(result, { deleted: ['other'], failed: ['child'], blocked: ['parent', 'root'] });
});

test('blocks deleting a directory with unselected descendants', async () => {
  const result = await deleteRecords(['root'], async () => true, [{ id: 'root', children: [{ id: 'child' }] }]);
  assert.deepEqual(result, { deleted: [], failed: [], blocked: ['root'] });
});

test('deletes all descendants before a selected parent and handles thrown failures', async () => {
  const calls: string[] = [];
  const result = await deleteRecords(
    ['parent', 'child', 'other'],
    async id => {
      calls.push(id);
      if (id === 'other') throw new Error('network');
      return true;
    },
    [{ id: 'parent', children: [{ id: 'child' }] }, { id: 'other' }]
  );
  assert.deepEqual(calls, ['child', 'parent', 'other']);
  assert.deepEqual(result, { deleted: ['child', 'parent'], failed: ['other'], blocked: [] });
});
