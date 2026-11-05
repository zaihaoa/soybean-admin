import { computed, ref } from 'vue';
import { deleteRecords } from '@/utils/system-manage';
import type { DeleteNode } from '@/utils/system-manage';
import { $t } from '@/locales';

export function useManageOptions() {
  const statusOptions = computed(() => [
    { label: $t('page.manage.enabled'), value: 'ENABLED' },
    { label: $t('page.manage.disabled'), value: 'DISABLED' }
  ]);
  const userStatusOptions = computed(() => [
    { label: $t('page.manage.enabled'), value: 'NORMAL' },
    { label: $t('page.manage.disabled'), value: 'DISABLE' }
  ]);
  const roleTypeOptions = computed(() => [
    { label: $t('page.manage.normal'), value: 'NORMAL' },
    { label: $t('page.manage.builtIn'), value: 'BUILT_IN' }
  ]);
  const userTypeOptions = computed(() => [
    { label: $t('page.manage.normal'), value: 'NORMAL' },
    { label: $t('page.manage.system'), value: 'SYSTEM' }
  ]);
  return { statusOptions, userStatusOptions, roleTypeOptions, userTypeOptions };
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
