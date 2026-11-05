<script setup lang="tsx">
import { computed, onActivated, ref } from 'vue';
import { NButton, NSwitch } from 'naive-ui';
import { useConfirmAction } from '@/utils/confirm-action';
import { fetchDeleteRole, fetchRolePage, fetchUpdateRoleStatus } from '@/service/api';
import { $t } from '@/locales';
import { useAppStore } from '@/store/modules/app';
import { useListSearch } from '@/hooks/common/list-search';
import { defaultTransform, EMPTY_TABLE_CELL, renderTableCell, useNaivePaginatedTable } from '@/hooks/common/table';
import CommonLogModal from '@/components/advanced/common-log-modal.vue';
import ListSearchBar from '@/components/advanced/list-search-bar.vue';
import { useManageDelete, useManageOptions, useManageTableSort } from '../shared';
import RoleAuthorizationModal from './modules/role-authorization-modal.vue';
import RoleOperateModal from './modules/role-operate-modal.vue';

const confirmAction = useConfirmAction();

const appStore = useAppStore();
const { statusOptions, roleTypeOptions } = useManageOptions();
const filters = ref<Omit<Api.SystemManage.RoleSearch, 'current' | 'size' | 'sort' | 'order'>>({
  name: null,
  code: null,
  status: null,
  type: null
});
const textFields = computed(
  () =>
    [
      { key: 'name', label: $t('page.manage.roleName') },
      { key: 'code', label: $t('page.manage.roleCode') }
    ] as const
);
const { applied, conditions, search, reset, remove } = useListSearch(
  filters,
  () => [
    ...textFields.value,
    { key: 'status', label: $t('page.manage.status'), options: statusOptions.value },
    { key: 'type', label: $t('page.manage.type'), options: roleTypeOptions.value }
  ],
  reloadSearch
);
const visible = ref(false);
const logBusinessKey = ref<string>();
const editingId = ref<string>();
const authVisible = ref(false);
const authRole = ref({ id: '', name: '' });
const updatingStatus = ref<string[]>([]);
const sortFields = {
  name: 'name',
  code: 'code',
  type: 'type',
  status: 'status',
  remark: 'remark',
  createUserName: 'createUserId',
  createTime: 'createTime'
} as const satisfies Record<string, Api.SystemManage.RoleSort['sort']>;
const { sortParams, getSortProps, updateSorter } = useManageTableSort(sortFields, reloadSearch);
const { deleting, handleDelete } = useManageDelete(fetchDeleteRole, refresh);
const {
  columnSettings,
  columnTableProps,
  tableKey,
  data,
  loading,
  getData,
  getDataByPage,
  pagination,
  mobilePagination
} = useNaivePaginatedTable({
  columnConfigCode: 'manage-role',
  requiredColumnKeys: ['name'],
  defaultColumnKeys: ['name', 'code', 'type', 'status', 'remark', 'createTime'],
  api: (): ReturnType<typeof fetchRolePage> =>
    fetchRolePage({
      ...applied.value,
      ...sortParams.value,
      current: pagination.page || 1,
      size: pagination.pageSize || 10
    }),
  immediate: false,
  transform: response => defaultTransform<Api.SystemManage.Role>(response),
  columns: () => [
    { key: 'name', title: $t('page.manage.roleName'), minWidth: 160, ...getSortProps('name') },
    { key: 'code', title: $t('page.manage.roleCode'), minWidth: 160, ...getSortProps('code') },
    {
      key: 'type',
      title: $t('page.manage.type'),
      width: 100,
      ...getSortProps('type'),
      render: row => renderTableCell(roleTypeOptions.value.find(item => item.value === row.type)?.label || row.type)
    },
    {
      key: 'status',
      title: $t('page.manage.status'),
      width: appStore.locale === 'zh-CN' ? 100 : 120,
      ...getSortProps('status'),
      render: row => {
        if (!row.status?.trim()) return EMPTY_TABLE_CELL;

        return (
          <NSwitch
            round
            value={row.status === 'ENABLED'}
            aria-label={`${row.name} · ${$t('page.manage.status')}`}
            disabled={deleting.value}
            loading={updatingStatus.value.includes(row.id)}
            onUpdateValue={() => confirmStatusChange(row)}
          />
        );
      }
    },
    {
      key: 'remark',
      title: $t('page.manage.remark'),
      minWidth: 200,
      ...getSortProps('remark'),
      ellipsis: { tooltip: true }
    },
    {
      key: 'createUserName',
      title: $t('page.manage.createUserName'),
      minWidth: 120,
      ...getSortProps('createUserName')
    },
    { key: 'createTime', title: $t('page.manage.createTime'), minWidth: 180, ...getSortProps('createTime') },
    {
      key: 'operate',
      title: $t('common.operate'),
      width: appStore.locale === 'zh-CN' ? 198 : 280,
      fixed: 'right',
      align: 'left',
      render: row => (
        <div class="flex items-center gap-8px">
          <NButton size="small" text type="primary" disabled={deleting.value} onClick={() => edit(row.id)}>
            {$t('common.edit')}
          </NButton>
          <NButton size="small" text type="primary" disabled={deleting.value} onClick={() => authorize(row)}>
            {$t('page.manage.authorize')}
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

function getRowKey(row: Api.SystemManage.Role) {
  return row.id;
}

async function refresh() {
  await getData();
  if (!data.value.length && (pagination.page || 1) > 1) await getDataByPage((pagination.page || 1) - 1);
}
function confirmDelete(row: Api.SystemManage.Role) {
  const title = $t('page.manage.deleteRole');
  confirmAction({
    title,
    content: $t('page.manage.confirmDeleteItem', { name: row.name }),
    onConfirm: () => handleDelete([row.id])
  });
}

function confirmStatusChange(row: Api.SystemManage.Role) {
  const status = row.status === 'ENABLED' ? 'DISABLED' : 'ENABLED';
  const action = status === 'DISABLED' ? $t('page.manage.disabled') : $t('page.manage.enabled');
  confirmAction({
    title: action,
    content: $t('page.manage.confirmRoleStatus', { action, name: row.name }),
    onConfirm: () => updateStatus(row.id, status)
  });
}

async function updateStatus(id: string, status: Api.SystemManage.Status) {
  if (updatingStatus.value.includes(id)) return;
  updatingStatus.value = [...updatingStatus.value, id];
  try {
    const { data: success, error } = await fetchUpdateRoleStatus(id, status);
    if (!error && success) {
      window.$message?.success($t('common.updateSuccess'));
      await getData();
    }
  } finally {
    updatingStatus.value = updatingStatus.value.filter(roleId => roleId !== id);
  }
}

function showLogs(id: string) {
  logBusinessKey.value = id;
}

function edit(id?: string) {
  editingId.value = id;
  visible.value = true;
}
function authorize(role: Api.SystemManage.Role) {
  authRole.value = role;
  authVisible.value = true;
}
async function reloadSearch() {
  await getDataByPage(1);
}
onActivated(refresh);
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <ListSearchBar :conditions="conditions" :loading="loading" @search="search" @reset="reset" @remove="remove">
      <NInput
        v-for="field in textFields"
        :key="field.key"
        v-model:value="filters[field.key]"
        :placeholder="field.label"
        :input-props="{ 'aria-label': field.label }"
        size="small"
        clearable
        class="list-search-input"
      />
      <NSelect
        v-model:value="filters.status"
        :options="statusOptions"
        :placeholder="$t('page.manage.status')"
        :aria-label="$t('page.manage.status')"
        size="small"
        clearable
        class="list-search-select"
      />
      <NSelect
        v-model:value="filters.type"
        :options="roleTypeOptions"
        :placeholder="$t('page.manage.type')"
        :aria-label="$t('page.manage.type')"
        size="small"
        clearable
        class="list-search-select"
      />
    </ListSearchBar>
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
        v-bind="columnTableProps"
        :data="data"
        :loading="loading || deleting || columnSettings.status === 'loading'"
        :row-key="getRowKey"
        :pagination="mobilePagination"
        :flex-height="!appStore.isMobile"
        remote
        size="small"
        class="sm:h-full"
        @update:sorter="updateSorter"
      />
    </NCard>
    <CommonLogModal v-model:business-key="logBusinessKey" business-type="ROLE" />
    <RoleOperateModal v-model:visible="visible" :role-id="editingId" @submitted="refresh" />
    <RoleAuthorizationModal
      v-model:visible="authVisible"
      :role-id="authRole.id"
      :role-name="authRole.name"
      @submitted="refresh"
    />
  </div>
</template>
