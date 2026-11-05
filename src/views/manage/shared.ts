import { computed, ref, shallowRef } from 'vue';
import type { DataTableSortOrder, DataTableSortState } from 'naive-ui';
import { deleteRecords } from '@/utils/system-manage';
import type { DeleteNode } from '@/utils/system-manage';
import { $t } from '@/locales';

export function useManageOptions() {
  const statusOptions = computed(() => [
    { label: $t('page.manage.enabled'), value: 'ENABLED' },
    { label: $t('page.manage.disabled'), value: 'DISABLED' }
  ]);
  const userStatusOptions = computed(() => [
    { label: $t('page.manage.enabled'), value: 'ENABLED' },
    { label: $t('page.manage.disabled'), value: 'DISABLE' }
  ]);
  const roleTypeOptions = computed(() => [
    { label: $t('page.manage.normal'), value: 'NORMAL' },
    { label: $t('page.manage.builtIn'), value: 'BUILT_IN' }
  ]);
  return { statusOptions, userStatusOptions, roleTypeOptions };
}

export function useManageTableSort<const Fields extends Record<string, string>>(
  sortFields: Fields,
  reload: () => Promise<void>
) {
  type ColumnKey = Extract<keyof Fields, string>;
  const sortParams = shallowRef<Api.SystemManage.TableSort<Fields[ColumnKey]>>();

  function getSortProps(key: ColumnKey): { sorter: true; sortOrder: DataTableSortOrder } {
    const sort = sortParams.value;
    if (!sort || sort.sort !== sortFields[key]) return { sorter: true, sortOrder: false };

    return { sorter: true, sortOrder: sort.order === 'ASC' ? 'ascend' : 'descend' };
  }

  function isSortableColumn(key: string | number): key is ColumnKey {
    return Object.hasOwn(sortFields, key);
  }

  async function updateSorter(sorter: DataTableSortState | DataTableSortState[] | null) {
    const state = Array.isArray(sorter) ? sorter[0] : sorter;
    sortParams.value =
      state?.order && isSortableColumn(state.columnKey)
        ? { sort: sortFields[state.columnKey], order: state.order === 'ascend' ? 'ASC' : 'DESC' }
        : undefined;
    await reload();
  }

  return { sortParams, getSortProps, updateSorter };
}

export function useManageDelete(
  remove: (id: string) => Promise<{ data: boolean | null; error: unknown }>,
  refresh: () => Promise<void>,
  tree?: () => DeleteNode[]
) {
  const checkedKeys = ref<string[]>([]);
  const deleting = ref(false);
  async function handleDelete(ids = checkedKeys.value) {
    if (deleting.value) return;
    deleting.value = true;
    try {
      const result = await deleteRecords(
        ids,
        async id => {
          const { data, error } = await remove(id);
          return !error && data === true;
        },
        tree?.()
      );
      const deleted = new Set(result.deleted);
      checkedKeys.value = checkedKeys.value.filter(id => !deleted.has(id));
      const failedKeys = [...result.failed, ...result.blocked];
      checkedKeys.value = [...new Set([...checkedKeys.value, ...failedKeys])];
      if (failedKeys.length) {
        window.$message?.warning(
          $t('page.manage.deleteSummary', {
            success: result.deleted.length,
            failed: result.failed.length,
            blocked: result.blocked.length
          })
        );
      } else {
        window.$message?.success($t('common.deleteSuccess'));
      }
      await refresh();
    } finally {
      deleting.value = false;
    }
  }
  return { checkedKeys, deleting, handleDelete };
}
