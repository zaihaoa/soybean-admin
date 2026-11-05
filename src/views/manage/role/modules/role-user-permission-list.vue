<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from 'vue';
import { fetchUserAuthorizePage } from '@/service/api';
import { $t } from '@/locales';
import { useListSearch } from '@/hooks/common/list-search';
import { defaultTransform, useNaivePaginatedTable } from '@/hooks/common/table';
import { useManageOptions } from '../../shared';

type SearchFilters = Pick<Api.SystemManage.UserAuthorizationSearch, 'username' | 'name' | 'status'>;
type Row = Api.SystemManage.UserAuthorizationRow;

const props = defineProps<{
  roleId: string;
  authorized: boolean;
  disabled: boolean;
  revision: number;
}>();
const emit = defineEmits<{ apply: [ids: string[]] }>();

const { userStatusOptions } = useManageOptions();
const filters = ref<SearchFilters>({ username: null, name: null, status: null });
const selected = shallowRef<string[]>([]);
const loadFailed = ref(false);
const title = computed(() => $t(props.authorized ? 'page.manage.authorized' : 'page.manage.unauthorized'));
const { applied, conditions, search, reset, remove } = useListSearch(
  filters,
  () => [
    { key: 'username', label: $t('page.manage.username') },
    { key: 'name', label: $t('page.manage.name') },
    { key: 'status', label: $t('page.manage.status'), options: userStatusOptions.value }
  ],
  reloadFirstPage
);

const { data, loading, columnTableProps, tableKey, pagination, getDataByPage } = useNaivePaginatedTable({
  columnConfigCode: props.authorized ? 'manage-role-user-authorized' : 'manage-role-user-unauthorized',
  columnSettingsEnabled: false,
  requiredColumnKeys: ['username'],
  immediate: false,
  api: (): ReturnType<typeof fetchUserAuthorizePage> =>
    fetchUserAuthorizePage({
      ...applied.value,
      roleId: props.roleId,
      authorized: props.authorized,
      current: pagination.page || 1,
      size: pagination.pageSize || 10
    }),
  transform: response => {
    loadFailed.value = Boolean(response.error || !response.data);
    return defaultTransform<Row>(response);
  },
  onPaginationParamsChange: clearSelection,
  paginationProps: { pageSlot: 5, showSizePicker: false },
  columns: () => [
    { type: 'selection', disabled: (): boolean => props.disabled || loading.value || loadFailed.value, width: 42 },
    { key: 'username', title: $t('page.manage.username'), minWidth: 108 },
    { key: 'name', title: $t('page.manage.name'), minWidth: 90 },
    {
      key: 'status',
      title: $t('page.manage.status'),
      minWidth: 80,
      render: row => row.statusDesc || $t(row.status === 'ENABLED' ? 'page.manage.enabled' : 'page.manage.disabled')
    }
  ]
});

function clearSelection() {
  selected.value = [];
}

function reloadFirstPage() {
  clearSelection();
  return getDataByPage();
}

function rowKey(row: Row) {
  return row.userId;
}

function setSelection(keys: (string | number)[]) {
  const onPage = new Set(data.value.map(rowKey));
  selected.value = keys.map(String).filter(id => onPage.has(id));
}

function apply() {
  if (props.disabled || loading.value || loadFailed.value || !selected.value.length) return;
  emit('apply', selected.value);
}

watch([() => props.roleId, () => props.revision], reloadFirstPage);
onMounted(reloadFirstPage);
</script>

<template>
  <NCard size="small" :segmented="{ content: true }" header-style="height: 50px; padding-block: 0" class="min-w-0">
    <template #header>
      <span class="text-14px font-normal">{{ title }}</span>
    </template>
    <template #header-extra>
      <NButton type="primary" :disabled="disabled || loading || loadFailed || !selected.length" @click="apply">
        {{ $t(authorized ? 'page.manage.revokeAuthorization' : 'page.manage.authorize') }}
      </NButton>
    </template>
    <ListSearchBar
      :conditions="conditions"
      :loading="loading"
      class="mb-8px"
      @search="search"
      @reset="reset"
      @remove="remove"
    >
      <NInput
        v-model:value="filters.username"
        :placeholder="$t('page.manage.username')"
        :aria-label="$t('page.manage.username')"
        size="small"
        clearable
        class="!w-100px"
      />
      <NInput
        v-model:value="filters.name"
        :placeholder="$t('page.manage.name')"
        :aria-label="$t('page.manage.name')"
        size="small"
        clearable
        class="!w-90px"
      />
      <NSelect
        v-model:value="filters.status"
        :options="userStatusOptions"
        :placeholder="$t('page.manage.status')"
        size="small"
        clearable
        class="!w-78px"
      />
    </ListSearchBar>
    <NAlert v-if="loadFailed && !loading" type="error" class="mb-10px">{{ $t('page.manage.loadFailed') }}</NAlert>
    <NDataTable
      :key="tableKey"
      v-bind="columnTableProps"
      :data="data"
      :row-key="rowKey"
      :loading="loading"
      :pagination="pagination"
      :checked-row-keys="selected"
      remote
      size="small"
      flex-height
      class="h-440px"
      @update:checked-row-keys="setSelection"
    />
  </NCard>
</template>
