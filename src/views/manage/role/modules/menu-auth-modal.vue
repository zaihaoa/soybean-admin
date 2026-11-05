<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { fetchAuthorizeRoleMenus, fetchMenuTree, fetchRoleDetail } from '@/service/api';
import { $t } from '@/locales';

const props = defineProps<{ roleId: string; roleName: string }>();
const emit = defineEmits<{ submitted: [] }>();
const visible = defineModel<boolean>('visible', { default: false });
const loading = ref(false);
const saving = ref(false);
const ready = ref(false);
const menus = ref<Api.SystemManage.Menu[]>([]);
const keys = ref<string[]>([]);
const originalIds = ref<string[]>([]);
const allMenus = ref(false);
const treeIds = computed(() => {
  const ids = new Set<string>();
  function visit(nodes: Api.SystemManage.Menu[]) {
    for (const node of nodes) {
      ids.add(node.id);
      visit(node.children || []);
    }
  }
  visit(menus.value);
  return ids;
});
watch([visible, () => props.roleId], async ([show], _previous, onCleanup) => {
  let active = true;
  onCleanup(() => {
    active = false;
  });
  if (!show) return;
  ready.value = false;
  loading.value = true;
  menus.value = [];
  keys.value = [];
  originalIds.value = [];
  allMenus.value = false;
  try {
    const [detail, tree] = await Promise.all([fetchRoleDetail(props.roleId), fetchMenuTree()]);
    if (!active || detail.error || !detail.data || tree.error || !tree.data) return;
    menus.value = tree.data;
    originalIds.value = detail.data.menuIds || [];
    keys.value = originalIds.value.filter(id => treeIds.value.has(id));
    allMenus.value = (detail.data.permissionFlag || []).some(
      flag => flag === 'ALL_PERMISSION' || flag === 'ALL_MENU_PERMISSION'
    );
    ready.value = true;
  } finally {
    if (active) loading.value = false;
  }
});
async function submit() {
  if (!ready.value || saving.value) return;
  saving.value = true;
  try {
    // Deleted menu IDs cannot be authorized again; only submit currently available nodes.
    const { data, error } = await fetchAuthorizeRoleMenus(props.roleId, [...keys.value]);
    if (error || !data) return;
    window.$message?.success($t('common.updateSuccess'));
    visible.value = false;
    emit('submitted');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <NModal
    v-model:show="visible"
    preset="card"
    :title="`${$t('page.manage.menuAuth')} · ${roleName}`"
    class="w-600px max-w-95vw"
    :mask-closable="!saving"
    :close-on-esc="!saving"
    :closable="!saving"
  >
    <NSpin :show="loading">
      <NAlert v-if="!loading && !ready" type="error">{{ $t('page.manage.detailUnavailable') }}</NAlert>
      <template v-else>
        <NAlert v-if="allMenus" type="info" class="mb-16px">{{ $t('page.manage.allMenusNotice') }}</NAlert>
        <NTree
          v-model:checked-keys="keys"
          :data="menus"
          key-field="id"
          label-field="menuName"
          children-field="children"
          checkable
          :cascade="false"
          :disabled="saving || loading"
          block-line
          expand-on-click
          virtual-scroll
          class="h-400px"
        />
      </template>
    </NSpin>
    <template #footer>
      <NSpace justify="end">
        <NButton :disabled="saving" @click="visible = false">{{ $t('common.cancel') }}</NButton>
        <NButton type="primary" :loading="saving" :disabled="!ready || loading" @click="submit">
          {{ $t('common.confirm') }}
        </NButton>
      </NSpace>
    </template>
  </NModal>
</template>
