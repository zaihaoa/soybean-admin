<script setup lang="tsx">
import { ref } from 'vue';
import { NButton, NPopconfirm, NTag } from 'naive-ui';
import { fetchDeleteRole, fetchRolePage } from '@/service/api';
import { $t } from '@/locales';
import { useAppStore } from '@/store/modules/app';
import { defaultTransform, useNaivePaginatedTable } from '@/hooks/common/table';
import { useManageDelete, useManageOptions } from '../shared';
import MenuAuthModal from './modules/menu-auth-modal.vue';
import RoleOperateDrawer from './modules/role-operate-drawer.vue';

const appStore = useAppStore();
const { statusOptions, roleTypeOptions } = useManageOptions();
const filters = ref<Omit<Api.SystemManage.RoleSearch, 'current' | 'size'>>({});
const applied = ref({ ...filters.value });
const visible = ref(false);
const editingId = ref<string>();
const authVisible = ref(false);
const authRole = ref({ id: '', name: '' });
const { checkedKeys, deleting, handleDelete } = useManageDelete(fetchDeleteRole, refresh);
const { columns, columnChecks, data, loading, getData, getDataByPage, pagination, mobilePagination } =
  useNaivePaginatedTable({
    api: (): ReturnType<typeof fetchRolePage> =>
      fetchRolePage({ ...applied.value, current: pagination.page || 1, size: pagination.pageSize || 10 }),
    immediate: false,
    transform: response => defaultTransform<Api.SystemManage.Role>(response),
    columns: () => [
      { type: 'selection', width: 48 },
      {
        key: 'index',
        title: $t('common.index'),
        width: 72,
        align: 'center',
        render: (_row, index): number => ((pagination.page || 1) - 1) * (pagination.pageSize || 10) + index + 1
      },
      { key: 'name', title: $t('page.manage.roleName'), minWidth: 160 },
      { key: 'code', title: $t('page.manage.roleCode'), minWidth: 160 },
      { key: 'remark', title: $t('page.manage.remark'), minWidth: 200, ellipsis: { tooltip: true } },
      {
        key: 'type',
        title: $t('page.manage.type'),
        width: 100,
        render: row => roleTypeOptions.value.find(item => item.value === row.type)?.label || row.type
      },
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
        key: 'operate',
        title: $t('common.operate'),
        width: 260,
        fixed: 'right',
        render: row => (
          <div class="flex-center gap-8px">
            <NButton size="small" ghost type="primary" disabled={deleting.value} onClick={() => edit(row.id)}>
              {$t('common.edit')}
            </NButton>
            <NButton size="small" disabled={deleting.value} onClick={() => authorize(row)}>
              {$t('page.manage.menuAuth')}
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
function authorize(role: Api.SystemManage.Role) {
  authRole.value = role;
  authVisible.value = true;
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
            <NGrid cols="1 s:2 l:4" responsive="screen" :x-gap="24" :y-gap="16">
              <NFormItemGi :label="$t('page.manage.roleName')">
                <NInput v-model:value="filters.name" clearable @keyup.enter="search()" />
              </NFormItemGi>
              <NFormItemGi :label="$t('page.manage.roleCode')">
                <NInput v-model:value="filters.code" clearable @keyup.enter="search()" />
              </NFormItemGi>
              <NFormItemGi :label="$t('page.manage.status')">
                <NSelect v-model:value="filters.status" clearable :options="statusOptions" />
              </NFormItemGi>
              <NFormItemGi :label="$t('page.manage.type')">
                <NSelect v-model:value="filters.type" clearable :options="roleTypeOptions" />
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
    <NCard :title="$t('page.manage.roleTitle')" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
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
        :scroll-x="1090"
        :flex-height="!appStore.isMobile"
        remote
        size="small"
        class="sm:h-full"
      />
    </NCard>
    <RoleOperateDrawer v-model:visible="visible" :role-id="editingId" @submitted="refresh" />
    <MenuAuthModal
      v-model:visible="authVisible"
      :role-id="authRole.id"
      :role-name="authRole.name"
      @submitted="refresh"
    />
  </div>
</template>
