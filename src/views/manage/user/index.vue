<script setup lang="tsx">
import { ref } from 'vue';
import { NButton, NPopconfirm, NTag } from 'naive-ui';
import { fetchDeleteUser, fetchUpdateUserStatus, fetchUserPage } from '@/service/api';
import { $t } from '@/locales';
import { useAppStore } from '@/store/modules/app';
import { defaultTransform, useNaivePaginatedTable } from '@/hooks/common/table';
import { useManageDelete, useManageOptions } from '../shared';
import PasswordModal from './modules/password-modal.vue';
import UserOperateDrawer from './modules/user-operate-drawer.vue';

const appStore = useAppStore();
const { userStatusOptions, userTypeOptions } = useManageOptions();
const filters = ref<Omit<Api.SystemManage.UserSearch, 'current' | 'size'>>({});
const applied = ref({ ...filters.value });
const searchFields = ['username', 'name', 'phone', 'email'] as const;
const visible = ref(false);
const editingId = ref<string>();
const passwordVisible = ref(false);
const passwordUser = ref({ id: '', username: '' });
const updatingStatus = ref<string[]>([]);

const { checkedKeys, deleting, handleDelete } = useManageDelete(fetchDeleteUser, refresh);
const { columns, columnChecks, data, loading, getData, getDataByPage, pagination, mobilePagination } =
  useNaivePaginatedTable({
    api: (): ReturnType<typeof fetchUserPage> =>
      fetchUserPage({ ...applied.value, current: pagination.page || 1, size: pagination.pageSize || 10 }),
    immediate: false,
    transform: response => defaultTransform<Api.SystemManage.User>(response),
    columns: () => [
      { type: 'selection', width: 48 },
      {
        key: 'index',
        title: $t('common.index'),
        width: 72,
        align: 'center',
        render: (_row, index): number => ((pagination.page || 1) - 1) * (pagination.pageSize || 10) + index + 1
      },
      { key: 'username', title: $t('page.manage.username'), minWidth: 140 },
      { key: 'name', title: $t('page.manage.name'), minWidth: 120 },
      { key: 'phone', title: $t('page.manage.phone'), minWidth: 140, render: row => row.phone || '—' },
      { key: 'email', title: $t('page.manage.email'), minWidth: 180, ellipsis: { tooltip: true } },
      {
        key: 'roles',
        title: $t('page.manage.roles'),
        minWidth: 160,
        render: row => (row.roles || []).map(role => role.ruleName).join('、') || '—'
      },
      {
        key: 'type',
        title: $t('page.manage.type'),
        width: 110,
        render: row => row.typeDesc || userTypeOptions.value.find(item => item.value === row.type)?.label || row.type
      },
      {
        key: 'status',
        title: $t('page.manage.status'),
        width: 90,
        render: row => (
          <NTag type={row.status === 'NORMAL' ? 'success' : 'warning'}>
            {row.statusDesc || userStatusOptions.value.find(item => item.value === row.status)?.label || row.status}
          </NTag>
        )
      },
      {
        key: 'operate',
        title: $t('common.operate'),
        width: 360,
        fixed: 'right',
        render: row => (
          <div class="flex-center gap-8px">
            <NButton size="small" ghost type="primary" disabled={deleting.value} onClick={() => edit(row.id)}>
              {$t('common.edit')}
            </NButton>
            <NPopconfirm onPositiveClick={() => updateStatus(row)}>
              {{
                default: () => $t('common.confirm'),
                trigger: () => (
                  <NButton size="small" disabled={deleting.value} loading={updatingStatus.value.includes(row.id)}>
                    {row.status === 'NORMAL' ? $t('page.manage.disabled') : $t('page.manage.enabled')}
                  </NButton>
                )
              }}
            </NPopconfirm>
            <NButton size="small" disabled={deleting.value} onClick={() => resetPassword(row)}>
              {$t('page.manage.resetPassword')}
            </NButton>
            <NPopconfirm onPositiveClick={() => handleDelete([row.id])}>
              {{
                default: () => $t('common.confirmDelete'),
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

async function refresh() {
  await getData();
  if (!data.value.length && (pagination.page || 1) > 1) await getDataByPage((pagination.page || 1) - 1);
}
function edit(id?: string) {
  editingId.value = id;
  visible.value = true;
}
function resetPassword(user: Api.SystemManage.User) {
  passwordUser.value = user;
  passwordVisible.value = true;
}
async function updateStatus(user: Api.SystemManage.User) {
  if (updatingStatus.value.includes(user.id)) return;
  updatingStatus.value.push(user.id);
  try {
    const { data: success, error } = await fetchUpdateUserStatus(
      user.id,
      user.status === 'NORMAL' ? 'DISABLE' : 'NORMAL'
    );
    if (!error && success) {
      window.$message?.success($t('common.updateSuccess'));
      await getData();
    }
  } finally {
    updatingStatus.value = updatingStatus.value.filter(id => id !== user.id);
  }
}
async function search(reset = false) {
  if (reset) filters.value = {};
  applied.value = { ...filters.value };
  checkedKeys.value = [];
  await getDataByPage(1);
}
void getData();
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <NCard :bordered="false" size="small" class="card-wrapper">
      <NCollapse :default-expanded-names="['search']">
        <NCollapseItem :title="$t('common.search')" name="search">
          <NForm label-placement="left" :show-feedback="false" @submit.prevent="search()">
            <NGrid cols="1 s:2 l:3" responsive="screen" :x-gap="24" :y-gap="16">
              <NFormItemGi v-for="field in searchFields" :key="field" :label="$t(`page.manage.${field}`)">
                <NInput v-model:value="filters[field]" clearable @keyup.enter="search()" />
              </NFormItemGi>
              <NFormItemGi :label="$t('page.manage.status')">
                <NSelect v-model:value="filters.status" clearable :options="userStatusOptions" />
              </NFormItemGi>
              <NFormItemGi :label="$t('page.manage.type')">
                <NSelect v-model:value="filters.type" clearable :options="userTypeOptions" />
              </NFormItemGi>
            </NGrid>
            <NSpace justify="end" class="pt-16px">
              <NButton :disabled="loading" @click="search(true)">{{ $t('common.reset') }}</NButton>
              <NButton type="primary" ghost :loading="loading" @click="search()">{{ $t('common.search') }}</NButton>
            </NSpace>
          </NForm>
        </NCollapseItem>
      </NCollapse>
    </NCard>
    <NCard :title="$t('page.manage.userTitle')" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
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
        :data="data"
        :loading="loading || deleting"
        :row-key="row => row.id"
        :pagination="mobilePagination"
        :scroll-x="1470"
        :flex-height="!appStore.isMobile"
        remote
        size="small"
        class="sm:h-full"
      />
    </NCard>
    <UserOperateDrawer v-model:visible="visible" :user-id="editingId" @submitted="refresh" />
    <PasswordModal v-model:visible="passwordVisible" :user-id="passwordUser.id" :username="passwordUser.username" />
  </div>
</template>
