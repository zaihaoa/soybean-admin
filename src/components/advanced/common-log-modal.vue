<script setup lang="ts">
import { ref, watch } from 'vue';
import { fetchCommonLogPage } from '@/service/api';
import { $t } from '@/locales';
import { usePageOverlay } from '@/hooks/common/page-overlay';
import { defaultTransform, useNaivePaginatedTable } from '@/hooks/common/table';

defineOptions({ name: 'CommonLogModal' });

const props = defineProps<{ businessType: Api.CommonLog.BusinessType }>();
const businessKey = defineModel<string>('businessKey');

const PAGE_SIZE = 50;
const { overlayActive, overlayProps } = usePageOverlay();
const loadFailed = ref(false);
const { columnTableProps, tableKey, data, loading, pagination, mobilePagination, getDataByPage } =
  useNaivePaginatedTable({
    columnConfigCode: 'common-log',
    columnSettingsEnabled: false,
    immediate: false,
    api: loadPage,
    transform: response => {
      loadFailed.value = Boolean(response?.error);
      if (!response || response.error) return { data: [], pageNum: 1, pageSize: PAGE_SIZE, total: 0 };

      return defaultTransform(response);
    },
    paginationProps: { pageSize: PAGE_SIZE, showSizePicker: false },
    columns: () => [
      { key: 'operationType', title: $t('common.operationType'), width: 120 },
      { key: 'createUserName', title: $t('common.operator'), width: 112 },
      { key: 'createTime', title: $t('common.operationTime'), width: 184 },
      {
        key: 'content',
        title: $t('common.operationContent'),
        width: 488,
        className: 'whitespace-pre-wrap [overflow-wrap:anywhere]'
      }
    ]
  });

async function loadPage(): Promise<Awaited<ReturnType<typeof fetchCommonLogPage>> | null> {
  if (!businessKey.value) return null;

  return fetchCommonLogPage({
    businessType: props.businessType,
    businessKey: businessKey.value,
    current: pagination.page ?? 1,
    size: pagination.pageSize ?? PAGE_SIZE
  });
}

function rowKey(row: Api.CommonLog.Entry) {
  return row.id;
}

function updateShow(show: boolean) {
  if (!show) businessKey.value = undefined;
}

watch(
  [businessKey, () => props.businessType],
  ([key]) => {
    if (!key) return;

    data.value = [];
    loadFailed.value = false;
    pagination.itemCount = 0;
    void getDataByPage(1);
  },
  { immediate: true }
);
</script>

<template>
  <NModal
    v-bind="overlayProps"
    :show="overlayActive && Boolean(businessKey)"
    preset="card"
    transform-origin="center"
    class="w-960px max-w-95vw"
    :title="$t('common.operationLog')"
    :aria-label="$t('common.operationLog')"
    closable
    @update:show="updateShow"
  >
    <NAlert v-if="loadFailed && !loading" type="error" class="mb-8px">{{ $t('page.manage.loadFailed') }}</NAlert>
    <NDataTable
      :key="tableKey"
      v-bind="columnTableProps"
      :data="data"
      :loading="loading"
      :row-key="rowKey"
      :pagination="mobilePagination"
      max-height="55vh"
      remote
    />
  </NModal>
</template>
