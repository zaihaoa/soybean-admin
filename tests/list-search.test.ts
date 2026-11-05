import assert from 'node:assert/strict';
import test from 'node:test';
import { ref } from 'vue';
import { useListSearch } from '../src/hooks/common/list-search';

test('removing a submitted filter keeps other edits out of the next query', async () => {
  const emptyDraft = { name: null, status: null, code: null };
  const filters = ref<{ name?: string | null; status?: string | null; code?: string | null }>({ ...emptyDraft });
  let queries = 0;
  const listSearch = useListSearch(
    filters,
    () => [
      { key: 'name', label: '名称' },
      { key: 'status', label: '状态', options: [{ value: 'ENABLED', label: '启用' }] },
      { key: 'code', label: '编码' }
    ],
    async () => {
      queries += 1;
    }
  );

  filters.value = { name: '原名称', status: 'ENABLED', code: '  ' };
  await listSearch.search();
  assert.deepEqual(listSearch.applied.value, { name: '原名称', status: 'ENABLED' });
  assert.deepEqual(listSearch.conditions.value, [
    { key: 'name', label: '名称', value: '原名称' },
    { key: 'status', label: '状态', value: '启用' }
  ]);

  filters.value.name = '未提交的名称';
  await listSearch.remove('status');
  assert.deepEqual(listSearch.applied.value, { name: '原名称' });
  assert.equal(filters.value.name, '未提交的名称');
  assert.equal(filters.value.status, null);

  await listSearch.reset();
  assert.deepEqual(filters.value, emptyDraft);
  assert.deepEqual(listSearch.applied.value, {});
  assert.equal(queries, 3);
});
