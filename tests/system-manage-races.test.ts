import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizePage } from '../src/utils/system-manage';
import { isCurrentSessionToken } from '../src/service/request/response';
import useTableModule from '../packages/hooks/src/use-table';

// packages/hooks is built as CJS in the Node-only regression runner.
const useTable =
  typeof useTableModule === 'function'
    ? useTableModule
    : (useTableModule as { default: typeof useTableModule }).default;

test('normalizes empty backend pages, including omitted records', () => {
  assert.deepEqual(normalizePage({ current: 1, size: 10, total: 0, records: null }).records, []);
  assert.deepEqual(normalizePage({ current: 1, size: 10, total: 0 }).records, []);
});

test('a response from an old or anonymous session cannot log out a new session', () => {
  assert.equal(isCurrentSessionToken('old-token', 'new-token'), false);
  assert.equal(isCurrentSessionToken(undefined, 'new-token'), false);
  assert.equal(isCurrentSessionToken('', ''), false);
  assert.equal(isCurrentSessionToken('new-token', 'new-token'), true);
});

test('a slow old page cannot overwrite the latest page or stop its loading indicator', async () => {
  const responses: ((data: { id: string }[]) => void)[] = [];
  const table = useTable({
    api: () =>
      new Promise<{ id: string }[]>(resolve => {
        responses.push(resolve);
      }),
    transform: (response: { id: string }[]) => response,
    columns: () => ['id'],
    getColumnChecks: () => [],
    getColumns: columns => columns,
    pagination: false,
    immediate: false
  });
  const first = table.getData();
  const second = table.getData();
  responses[0]([{ id: 'old' }]);
  await first;
  assert.equal(table.loading.value, true);
  responses[1]([{ id: 'new' }]);
  await second;
  assert.equal(table.data.value[0].id, 'new');
  const third = table.getData();
  const fourth = table.getData();
  responses[3]([{ id: 'latest' }]);
  await fourth;
  responses[2]([{ id: 'stale' }]);
  await third;
  assert.equal(table.data.value[0].id, 'latest');
  assert.equal(table.loading.value, false);
});
