<script setup lang="tsx">
import { computed, onActivated, reactive, ref } from 'vue';
import { NButton, NPopover, NTable } from 'naive-ui';
import { useConfirmAction } from '@/utils/confirm-action';
import { fetchDeleteMenu, fetchMenuTree } from '@/service/api';
import { $t } from '@/locales';
import { useAppStore } from '@/store/modules/app';
import { useNaiveTable } from '@/hooks/common/table';
import CommonLogModal from '@/components/advanced/common-log-modal.vue';
import { useManageDelete } from '../shared';
import MenuOperateModal from './modules/menu-operate-modal.vue';

const confirmAction = useConfirmAction();

const appStore = useAppStore();
const visible = ref(false);
const logBusinessKey = ref<string>();
const expandedRowKeys = ref<Array<string | number>>([]);
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
const { deleting, handleDelete } = useManageDelete(fetchDeleteMenu, refresh, getTree);
const { columnSettings, columnTableProps, tableKey, data, loading, getData } = useNaiveTable({
  columnConfigCode: 'manage-menu',
  requiredColumnKeys: ['menuName'],
  api: fetchMenuTree,
  immediate: false,
  transform: response => response.data || [],
  columns: () => [
    { key: 'menuName', title: $t('page.manage.menuName'), minWidth: 140, tree: true },
    {
      key: 'menuType',
      title: $t('page.manage.menuType'),
      width: 90,
      render: row => {
        if (row.menuTypeDesc?.trim()) return row.menuTypeDesc;
        if (!row.menuType?.trim()) return null;

        return $t(row.menuType === 'DIRECTORY' ? 'page.manage.directory' : 'page.manage.menu');
      }
    },
    { key: 'menuGroupName', title: $t('page.manage.menuGroupColumn'), minWidth: 110 },
    { key: 'routeName', title: $t('page.manage.routeName'), minWidth: 150 },
    { key: 'routePath', title: $t('page.manage.routePath'), minWidth: 170 },
    { key: 'permission', title: $t('page.manage.permission'), minWidth: 140 },
    {
      key: 'button',
      title: $t('page.manage.buttonColumn'),
      width: 80,
      render: row => renderMenuButtons(row.button)
    },
    { key: 'sortNumber', title: $t('page.manage.sortNumber'), width: 70 },
    {
      key: 'operate',
      title: $t('common.operate'),
      width: appStore.locale === 'zh-CN' ? 214 : 250,
      fixed: 'right',
      align: 'left',
      render: row => (
        <div class="flex items-center gap-8px">
          {row.menuType === 'DIRECTORY' && (
            <NButton size="small" text type="primary" disabled={deleting.value} onClick={() => edit(undefined, row.id)}>
              {$t('page.manage.addChild')}
            </NButton>
          )}
          <NButton size="small" text type="primary" disabled={deleting.value} onClick={() => edit(row.id)}>
            {$t('common.edit')}
          </NButton>
          <NButton size="small" text type="primary" disabled={deleting.value} onClick={() => confirmDelete(row)}>
            {$t('common.delete')}
          </NButton>
          <NButton size="small" text type="primary" disabled={deleting.value} onClick={() => showLogs(row.id)}>
            {$t('common.logs')}
          </NButton>
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

function renderMenuButtons(buttons?: Api.SystemManage.MenuButton[] | null) {
  if (!buttons?.length) return null;

  return (
    <NPopover trigger="hover" placement="top">
      {{
        trigger: () => <span class="cursor-help text-primary">{$t('page.manage.buttonColumn')}</span>,
        default: () => (
          <NTable size="small" class="min-w-200px">
            <thead>
              <tr>
                <th>{$t('page.manage.buttonLabel')}</th>
                <th>{$t('page.manage.buttonCode')}</th>
              </tr>
            </thead>
            <tbody>
              {buttons.map((button, index) => (
                <tr key={`${button.code}-${index}`}>
                  <td>{button.label}</td>
                  <td>{button.code}</td>
                </tr>
              ))}
            </tbody>
          </NTable>
        )
      }}
    </NPopover>
  );
}

function getRowKey(row: Api.SystemManage.Menu) {
  return row.id;
}

function confirmDelete(row: Api.SystemManage.Menu) {
  const title = $t('page.manage.deleteMenu');
  if (row.children?.length) {
    confirmAction({ title, content: $t('page.manage.deleteChildrenFirst') });
    return;
  }

  confirmAction({
    title,
    content: $t('page.manage.confirmDeleteItem', { name: row.menuName }),
    onConfirm: () => handleDelete([row.id])
  });
}

function showLogs(id: string) {
  logBusinessKey.value = id;
}

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
onActivated(refresh);
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <NCard :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
      <template #header>
        <TableHeaderOperation
          :column-settings="columnSettings"
          :loading="loading || deleting || columnSettings.status === 'loading'"
          @refresh="refresh"
        >
          <NButton size="small" type="primary" @click="edit()">
            {{ $t('common.add') }}
          </NButton>
        </TableHeaderOperation>
      </template>
      <NDataTable
        :key="tableKey"
        v-bind="{ ...columnTableProps, renderCell: undefined }"
        v-model:expanded-row-keys="expandedRowKeys"
        :data="pageData"
        :loading="loading || deleting || columnSettings.status === 'loading'"
        :row-key="getRowKey"
        :pagination="tablePagination"
        :flex-height="!appStore.isMobile"
        remote
        size="small"
        class="sm:h-full"
      />
    </NCard>
    <CommonLogModal v-model:business-key="logBusinessKey" business-type="MENU" />
    <MenuOperateModal
      v-model:visible="visible"
      :menu-id="editingId"
      :parent-id="parentId"
      :tree="data"
      @submitted="refresh"
    />
  </div>
</template>
