<script setup lang="tsx">
import { computed, reactive, ref } from 'vue';
import { NButton, NPopconfirm, NTag } from 'naive-ui';
import { fetchDeleteMenu, fetchMenuTree } from '@/service/api';
import { $t } from '@/locales';
import { useAppStore } from '@/store/modules/app';
import { useNaiveTable } from '@/hooks/common/table';
import SvgIcon from '@/components/custom/svg-icon.vue';
import { useManageDelete, useManageOptions } from '../shared';
import MenuOperateModal from './modules/menu-operate-modal.vue';

const appStore = useAppStore();
const { statusOptions } = useManageOptions();
const visible = ref(false);
const editingId = ref<string>();
const parentId = ref<string>();
const pagination = reactive({
  page: 1,
  pageSize: 10,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
  onUpdatePage: (page: number) => {
    pagination.page = page;
  },
  onUpdatePageSize: (size: number) => {
    pagination.pageSize = size;
    pagination.page = 1;
  }
});
const { checkedKeys, deleting, handleDelete } = useManageDelete(fetchDeleteMenu, refresh, getTree);
const { columns, columnChecks, data, loading, getData } = useNaiveTable({
  api: fetchMenuTree,
  immediate: false,
  transform: response => response.data || [],
  columns: () => [
    { type: 'selection', width: 48, cascade: false },
    { key: 'id', title: 'ID', width: 220 },
    {
      key: 'menuType',
      title: $t('page.manage.menuType'),
      width: 90,
      render: row => (
        <NTag type={row.menuType === 'DIRECTORY' ? 'default' : 'primary'}>
          {row.menuTypeDesc || $t(row.menuType === 'DIRECTORY' ? 'page.manage.directory' : 'page.manage.menu')}
        </NTag>
      )
    },
    { key: 'menuName', title: $t('page.manage.menuName'), minWidth: 140 },
    {
      key: 'icon',
      title: $t('page.manage.icon'),
      width: 70,
      render: row => (
        <div class="flex-center">
          <SvgIcon
            icon={row.iconType === '2' ? undefined : row.icon}
            localIcon={row.iconType === '2' ? row.icon : undefined}
            class="text-icon"
          />
        </div>
      )
    },
    { key: 'routeName', title: $t('page.manage.routeName'), minWidth: 150 },
    { key: 'routePath', title: $t('page.manage.routePath'), minWidth: 150 },
    {
      key: 'status',
      title: $t('page.manage.status'),
      width: 90,
      render: row => (
        <NTag type={row.status === 'ENABLED' ? 'success' : 'warning'}>
          {statusOptions.value.find(item => item.value === row.status)?.label || row.status}
        </NTag>
      )
    },
    {
      key: 'hideRoute',
      title: $t('page.manage.hideRoute'),
      width: 100,
      render: row => (
        <NTag type={row.hideRoute ? 'error' : 'default'}>
          {$t(row.hideRoute ? 'common.yesOrNo.yes' : 'common.yesOrNo.no')}
        </NTag>
      )
    },
    { key: 'parentId', title: $t('page.manage.parent'), width: 210 },
    { key: 'sortNumber', title: $t('page.manage.sortNumber'), width: 70 },
    {
      key: 'operate',
      title: $t('common.operate'),
      width: 260,
      fixed: 'right',
      render: row => (
        <div class="flex-center justify-end gap-8px">
          {row.menuType === 'DIRECTORY' && (
            <NButton
              size="small"
              ghost
              type="primary"
              disabled={deleting.value}
              onClick={() => edit(undefined, row.id)}
            >
              {$t('page.manage.addChild')}
            </NButton>
          )}
          <NButton size="small" ghost type="primary" disabled={deleting.value} onClick={() => edit(row.id)}>
            {$t('common.edit')}
          </NButton>
          <NPopconfirm onPositiveClick={() => handleDelete([row.id])}>
            {{
              default: () =>
                row.children?.length ? $t('page.manage.deleteChildrenFirst') : $t('common.confirmDelete'),
              trigger: () => (
                <NButton size="small" ghost type="error" disabled={deleting.value}>
                  {$t('common.delete')}
                </NButton>
              )
            }}
          </NPopconfirm>
        </div>
      )
    }
  ]
});
const pageData = computed(() =>
  data.value.slice((pagination.page - 1) * pagination.pageSize, pagination.page * pagination.pageSize)
);
const tablePagination = computed(() => ({
  ...pagination,
  itemCount: data.value.length,
  pageSlot: appStore.isMobile ? 3 : 9,
  prefix: () => $t('datatable.itemCount', { total: data.value.length })
}));
function edit(id?: string, parent?: string) {
  editingId.value = id;
  parentId.value = parent;
  visible.value = true;
}
function getTree() {
  return data.value;
}

async function refresh() {
  await getData();
  pagination.page = Math.min(pagination.page, Math.max(1, Math.ceil(data.value.length / pagination.pageSize)));
}
void refresh();
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <NCard :title="$t('page.manage.menuTitle')" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :disabled-delete="!checkedKeys.length || deleting"
          :loading="loading || deleting"
          @add="edit()"
          @delete="handleDelete()"
          @refresh="refresh"
        />
      </template>
      <NDataTable
        v-model:checked-row-keys="checkedKeys"
        :columns="columns"
        :data="pageData"
        :loading="loading || deleting"
        :row-key="row => row.id"
        :pagination="tablePagination"
        :scroll-x="1700"
        :flex-height="!appStore.isMobile"
        remote
        size="small"
        class="sm:h-full"
      />
    </NCard>
    <MenuOperateModal
      v-model:visible="visible"
      :menu-id="editingId"
      :parent-id="parentId"
      :tree="data"
      @submitted="refresh"
    />
  </div>
</template>
