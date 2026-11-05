<script setup lang="tsx">
import { computed, onActivated, ref } from 'vue';
import { NButton, NSwitch } from 'naive-ui';
import { useConfirmAction } from '@/utils/confirm-action';
import { fetchDeleteUser, fetchUpdateUserStatus, fetchUserPage } from '@/service/api';
import { $t } from '@/locales';
import { useAppStore } from '@/store/modules/app';
import { useListSearch } from '@/hooks/common/list-search';
import { defaultTransform, EMPTY_TABLE_CELL, renderTableCell, useNaivePaginatedTable } from '@/hooks/common/table';
import CommonLogModal from '@/components/advanced/common-log-modal.vue';
import ListSearchBar from '@/components/advanced/list-search-bar.vue';
import { useManageDelete, useManageOptions, useManageTableSort } from '../shared';
import PasswordModal from './modules/password-modal.vue';
import UserOperateModal from './modules/user-operate-modal.vue';

const confirmAction = useConfirmAction();

const appStore = useAppStore();
const { userStatusOptions } = useManageOptions();
const filters = ref<Omit<Api.SystemManage.UserSearch, 'current' | 'size' | 'type' | 'sort' | 'order'>>({
  username: null,
  name: null,
  phone: null,
  email: null,
  status: null
});
const searchFields = ['username', 'name', 'phone', 'email'] as const;
const textFields = computed(() => searchFields.map(key => ({ key, label: $t(`page.manage.${key}`) })));
const { applied, conditions, search, reset, remove } = useListSearch(
  filters,
  () => [...textFields.value, { key: 'status', label: $t('page.manage.status'), options: userStatusOptions.value }],
  reloadSearch
);
const visible = ref(false);
const logBusinessKey = ref<string>();
const editingId = ref<string>();
const passwordVisible = ref(false);
const passwordUser = ref({ id: '', username: '' });
const updatingStatus = ref<string[]>([]);
const sortFields = {
  username: 'username',
  name: 'name',
  status: 'status',
  phone: 'phone',
  email: 'email',
  createUserName: 'createUserId',
  createTime: 'createTime'
} as const satisfies Record<string, Api.SystemManage.UserSort['sort']>;
const { sortParams, getSortProps, updateSorter } = useManageTableSort(sortFields, reloadSearch);

const { deleting, handleDelete } = useManageDelete(fetchDeleteUser, refresh);
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
  columnConfigCode: 'manage-user',
  requiredColumnKeys: ['username'],
  defaultColumnKeys: ['username', 'name', 'status', 'phone', 'email', 'roles', 'createTime'],
  api: (): ReturnType<typeof fetchUserPage> =>
    fetchUserPage({
      ...applied.value,
      ...sortParams.value,
      current: pagination.page || 1,
      size: pagination.pageSize || 10
    }),
  immediate: false,
  transform: response => defaultTransform<Api.SystemManage.User>(response),
  columns: () => [
    { key: 'username', title: $t('page.manage.username'), minWidth: 140, ...getSortProps('username') },
    { key: 'name', title: $t('page.manage.name'), minWidth: 120, ...getSortProps('name') },
    {
      key: 'status',
      title: $t('page.manage.status'),
      width: appStore.locale === 'zh-CN' ? 100 : 120,
      ...getSortProps('status'),
      render: row =>
        row.status?.trim() ? (
          <NSwitch
            round
            value={row.status === 'ENABLED'}
            aria-label={`${row.username} · ${$t('page.manage.status')}`}
            disabled={deleting.value}
            loading={updatingStatus.value.includes(row.id)}
            onUpdateValue={() => confirmStatusChange(row)}
          />
        ) : (
          EMPTY_TABLE_CELL
        )
    },
    {
      key: 'phone',
      title: $t('page.manage.phone'),
      minWidth: 140,
      ...getSortProps('phone')
    },
    {
      key: 'email',
      title: $t('page.manage.email'),
      minWidth: 180,
      ...getSortProps('email'),
      ellipsis: { tooltip: true }
    },
    {
      key: 'roles',
      title: $t('page.manage.roles'),
      minWidth: 160,
      render: row =>
        renderTableCell(
          row.roles
            ?.map(role => role.ruleName)
            .filter(name => name?.trim())
            .join('、')
        )
    },
    {
      key: 'createUserName',
      title: $t('page.manage.createUserName'),
      minWidth: 120,
      ...getSortProps('createUserName')
    },
    {
      key: 'createTime',
      title: $t('page.manage.createTime'),
      minWidth: 180,
      ...getSortProps('createTime')
    },
    {
      key: 'operate',
      title: $t('common.operate'),
      width: appStore.locale === 'zh-CN' ? 198 : 252,
      fixed: 'right',
      align: 'left',
      render: row => (
        <div class="flex items-center gap-8px">
          <NButton size="small" text type="primary" disabled={deleting.value} onClick={() => edit(row.id)}>
            {$t('common.edit')}
          </NButton>
          <NButton size="small" text type="primary" disabled={deleting.value} onClick={() => resetPassword(row)}>
            {$t('page.manage.resetPassword')}
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

function getRowKey(row: Api.SystemManage.User) {
  return row.id;
}

async function refresh() {
  await getData();
  if (!data.value.length && (pagination.page || 1) > 1) await getDataByPage((pagination.page || 1) - 1);
}
function confirmDelete(row: Api.SystemManage.User) {
  const title = $t('page.manage.deleteUser');
  confirmAction({
    title,
    content: $t('page.manage.confirmDeleteItem', { name: row.username }),
    onConfirm: () => handleDelete([row.id])
  });
}

function confirmStatusChange(row: Api.SystemManage.User) {
  const status = row.status === 'ENABLED' ? 'DISABLE' : 'ENABLED';
  const action = status === 'DISABLE' ? $t('page.manage.disabled') : $t('page.manage.enabled');
  confirmAction({
    title: action,
    content: $t('page.manage.confirmUserStatus', { action, name: row.username }),
    onConfirm: () => updateStatus(row.id, status)
  });
}

function showLogs(id: string) {
  logBusinessKey.value = id;
}

function edit(id?: string) {
  editingId.value = id;
  visible.value = true;
}
function resetPassword(user: Api.SystemManage.User) {
  passwordUser.value = user;
  passwordVisible.value = true;
}
async function updateStatus(id: string, status: Api.SystemManage.UserStatus) {
  if (updatingStatus.value.includes(id)) return;
  updatingStatus.value.push(id);
  try {
    const { data: success, error } = await fetchUpdateUserStatus(id, status);
    if (!error && success) {
      window.$message?.success($t('common.updateSuccess'));
      await getData();
    }
  } finally {
    updatingStatus.value = updatingStatus.value.filter(userId => userId !== id);
  }
}
async function reloadSearch() {
  await getDataByPage(1);
}
onActivated(refresh);
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-10px overflow-hidden lt-sm:overflow-auto">
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
        :options="userStatusOptions"
        :placeholder="$t('page.manage.status')"
        :aria-label="$t('page.manage.status')"
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
    <CommonLogModal v-model:business-key="logBusinessKey" business-type="USER" />
    <UserOperateModal v-model:visible="visible" :user-id="editingId" @submitted="refresh" />
    <PasswordModal v-model:visible="passwordVisible" :user-id="passwordUser.id" :username="passwordUser.username" />
  </div>
</template>
