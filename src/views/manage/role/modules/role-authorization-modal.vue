<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue';
import { useConfirmAction } from '@/utils/confirm-action';
import {
  fetchAuthorizeRole,
  fetchAuthorizeRoleAll,
  fetchFieldPermissionConstants,
  fetchMenuTree,
  fetchRoleDetail
} from '@/service/api';
import { $t } from '@/locales';
import { usePageOverlay } from '@/hooks/common/page-overlay';
import { RoleAuthorizationOperation } from '@/enum';
import { createMenuAuthorization, normalizeMenuAuthorization } from './menu-authorization';
import type { MenuAuthorizationSelection } from './menu-authorization';
import RoleFieldPermissions from './role-field-permissions.vue';
import RoleMenuPermissions from './role-menu-permissions.vue';
import RoleUserPermissionList from './role-user-permission-list.vue';

type PermissionFlag = Api.SystemManage.RolePermissionFlag;
type Grant = Api.SystemManage.RoleAuthorization;
interface PendingGrant {
  grant: Grant;
  commit: () => void;
}

const props = defineProps<{ roleId: string; roleName: string }>();
const emit = defineEmits<{ submitted: [] }>();
const visible = defineModel<boolean>('visible', { default: false });

const { overlayActive, overlayProps } = usePageOverlay();
const confirmAction = useConfirmAction();
const activeTab = ref('menu');
const busy = ref(false);
const loading = ref(false);
const menuLoading = ref(false);
const fieldLoading = ref(false);
const revision = ref(0);
const detail = shallowRef<Api.SystemManage.RoleDetail>();
const flags = shallowRef<string[]>([]);
const menus = shallowRef<Api.SystemManage.Menu[]>();
const fields = shallowRef<Api.SystemManage.FieldPermissionGroup[]>();
const initialMenus = shallowRef<MenuAuthorizationSelection>({ menuIds: [], buttonCodes: [] });
const menuDraft = shallowRef(initialMenus.value);
const initialFields = shallowRef<string[]>([]);
const fieldDraft = shallowRef(initialFields.value);

const menuFlag = 'ALL_MENU_PERMISSION';
const userFlag = 'ALL_DATA_USER_PERMISSION';
const fieldFlag = 'ALL_FIELD_PERMISSION';
const allPermissionNotice = computed(() =>
  $t(globalAll.value ? 'page.manage.globalPermissionNotice' : 'page.manage.allPermissionNotice')
);
const scopeLabels = {
  [menuFlag]: 'page.manage.menuPermission',
  [userFlag]: 'page.manage.userPermission',
  [fieldFlag]: 'page.manage.fieldPermission'
} as const;
const globalAll = computed(() => flags.value.includes('ALL_PERMISSION'));
const allMenus = computed(() => hasAll(menuFlag));
const allUsers = computed(() => hasAll(userFlag));
const allFields = computed(() => hasAll(fieldFlag));
const menuDirty = computed(
  () =>
    !sameItems(menuDraft.value.menuIds, initialMenus.value.menuIds) ||
    !sameItems(menuDraft.value.buttonCodes, initialMenus.value.buttonCodes)
);
const fieldDirty = computed(() => !sameItems(fieldDraft.value, initialFields.value));
const activeDraft = computed(() => {
  if (activeTab.value === 'menu') return getDraft(menuFlag);
  if (activeTab.value === 'field') return getDraft(fieldFlag);
  return undefined;
});
let session = 0;

function sameItems(items: string[], previous: string[]) {
  const previousItems = new Set(previous);
  return items.length === previous.length && items.every(item => previousItems.has(item));
}

function hasAll(flag: PermissionFlag) {
  return globalAll.value || flags.value.includes(flag);
}

function isCurrent(version: number, roleId: string) {
  return version === session && roleId === props.roleId && visible.value;
}

async function initialize() {
  const version = ++session;
  const { roleId } = props;
  activeTab.value = 'menu';
  busy.value = false;
  detail.value = undefined;
  flags.value = [];
  menus.value = undefined;
  fields.value = undefined;
  initialMenus.value = { menuIds: [], buttonCodes: [] };
  initialFields.value = [];
  menuDraft.value = initialMenus.value;
  fieldDraft.value = initialFields.value;
  revision.value = 0;
  loading.value = true;
  try {
    const { data, error } = await fetchRoleDetail(roleId);
    if (!isCurrent(version, roleId) || error || !data) return;
    detail.value = data;
    flags.value = data.permissionFlag ?? [];
    void loadMenus();
    void loadFields();
  } finally {
    if (isCurrent(version, roleId)) loading.value = false;
  }
}

function normalizeFields(groups: Api.SystemManage.FieldPermissionGroup[], codes: string[]) {
  const available = new Set(groups.flatMap(group => group.items.map(item => item.code)));
  return [...new Set(codes)].filter(code => available.has(code));
}

async function loadMenus() {
  const role = detail.value;
  if (!role || menuLoading.value) return;
  const version = session;
  menuLoading.value = true;
  try {
    const { data, error } = await fetchMenuTree();
    if (!isCurrent(version, role.id) || error || !data) return;
    menus.value = data;
    initialMenus.value = normalizeMenuAuthorization(createMenuAuthorization(data), {
      menuIds: role.menuIds ?? [],
      buttonCodes: role.buttonCodes ?? []
    });
    menuDraft.value = initialMenus.value;
  } finally {
    if (isCurrent(version, role.id)) menuLoading.value = false;
  }
}

async function loadFields() {
  const role = detail.value;
  if (!role || fieldLoading.value) return;
  const version = session;
  fieldLoading.value = true;
  try {
    const { data, error } = await fetchFieldPermissionConstants();
    if (!isCurrent(version, role.id) || error || !data) return;
    fields.value = data;
    initialFields.value = normalizeFields(data, role.fieldCodes ?? []);
    fieldDraft.value = initialFields.value;
  } finally {
    if (isCurrent(version, role.id)) fieldLoading.value = false;
  }
}

function getDraft(flag: PermissionFlag): PendingGrant | undefined {
  if (flag === menuFlag && menus.value && menuDirty.value && !allMenus.value) {
    const draft = menuDraft.value;
    return {
      grant: { type: 'MENU', relevanceIds: draft.menuIds, relevanceValues: draft.buttonCodes },
      commit: () => {
        initialMenus.value = draft;
      }
    };
  }
  if (flag === fieldFlag && fields.value && fieldDirty.value && !allFields.value) {
    const draft = fieldDraft.value;
    return {
      grant: { type: 'FIELD', relevanceValues: draft },
      commit: () => {
        initialFields.value = draft;
      }
    };
  }
  return undefined;
}

async function persistGrant(draft: PendingGrant, version: number, roleId: string): Promise<boolean> {
  const { data, error } = await fetchAuthorizeRole(roleId, draft.grant);
  if (!isCurrent(version, roleId)) return false;
  if (error || data !== true) {
    showSaveError(error, data);
    return false;
  }
  draft.commit();
  return true;
}

async function persistFlag(flag: PermissionFlag, authorized: boolean, version: number, roleId: string) {
  const { data, error } = await fetchAuthorizeRoleAll(roleId, flag, authorized);
  if (!isCurrent(version, roleId)) return false;
  if (error || data !== true) {
    showSaveError(error, data);
    return false;
  }
  flags.value = authorized ? [...new Set([...flags.value, flag])] : flags.value.filter(item => item !== flag);
  return true;
}

function showSaveError(error: unknown, saved: boolean | null) {
  if (error || saved === true) return;
  window.$message?.error($t('page.manage.saveFailed'));
}

function notifySaved() {
  window.$message?.success($t('common.updateSuccess'));
  emit('submitted');
}

function confirmAll(flag: PermissionFlag, authorized: boolean) {
  if (busy.value || !detail.value || globalAll.value) return;
  const { roleId } = props;
  const version = session;
  confirmAction({
    title: $t('page.manage.allPermission'),
    content: $t('page.manage.allPermissionConfirm', {
      action: $t(authorized ? 'page.manage.enableAuthorization' : 'page.manage.disableAuthorization'),
      scope: $t(scopeLabels[flag])
    }),
    onConfirm: async () => {
      if (!isCurrent(version, roleId) || busy.value || globalAll.value) return;
      busy.value = true;
      try {
        const draft = authorized ? getDraft(flag) : undefined;
        if (draft && !(await persistGrant(draft, version, roleId))) return;

        if (!(await persistFlag(flag, authorized, version, roleId))) return;
        if (flag === userFlag) revision.value += 1;
        notifySaved();
      } finally {
        if (isCurrent(version, roleId)) busy.value = false;
      }
    }
  });
}

function toggleAllMenus(checked: boolean) {
  confirmAll(menuFlag, checked);
}

function toggleAllUsers(checked: boolean) {
  confirmAll(userFlag, checked);
}

function toggleAllFields(checked: boolean) {
  confirmAll(fieldFlag, checked);
}

async function save(draft: PendingGrant) {
  if (busy.value || !detail.value) return;
  const version = session;
  const { roleId } = props;
  busy.value = true;
  try {
    if (await persistGrant(draft, version, roleId)) notifySaved();
  } finally {
    if (isCurrent(version, roleId)) busy.value = false;
  }
}

function confirmPermissions() {
  if (activeDraft.value) return save(activeDraft.value);
}

function saveUsers(ids: string[], operation: Api.SystemManage.UserAuthorizationOperation) {
  if (allUsers.value || !ids.length) return;
  return save({
    grant: { type: 'DATA_USER', relevanceIds: ids, operation },
    commit: () => {
      revision.value += 1;
    }
  });
}

function close() {
  if (busy.value) return;
  if (!menuDirty.value && !fieldDirty.value) {
    visible.value = false;
    return;
  }
  const version = session;
  const { roleId } = props;
  confirmAction({
    title: $t('common.cancel'),
    content: $t('page.manage.discardAuthorizationConfirm'),
    onConfirm: () => {
      if (isCurrent(version, roleId) && !busy.value) visible.value = false;
    }
  });
}

function updateShow(show: boolean) {
  if (!show) close();
}

watch([visible, () => props.roleId], ([show]) => {
  menuLoading.value = false;
  fieldLoading.value = false;
  if (show) void initialize();
  else session += 1;
});
</script>

<template>
  <NModal
    v-bind="overlayProps"
    :show="overlayActive && visible"
    preset="card"
    transform-origin="center"
    :title="$t('page.manage.roleAuthorization', { name: roleName })"
    class="role-authorization-modal"
    :style="{ width: '80%', height: '90dvh' }"
    :content-style="{ minHeight: 0, overflow: 'auto' }"
    :mask-closable="false"
    :close-on-esc="!busy"
    :closable="!busy"
    @update:show="updateShow"
  >
    <NSpin v-if="loading" class="py-32px" />
    <div v-else-if="!detail" class="flex items-center gap-12px">
      <NAlert type="error">{{ $t('page.manage.loadFailed') }}</NAlert>
      <NButton @click="initialize">{{ $t('common.refresh') }}</NButton>
    </div>
    <NTabs v-else v-model:value="activeTab" type="line" animated>
      <NTabPane name="menu" :tab="$t('page.manage.menuPermission')" display-directive="show:lazy">
        <div class="mb-12px flex flex-wrap items-center gap-10px">
          <span>{{ $t('page.manage.allPermission') }}</span>
          <NSwitch
            :aria-label="$t('page.manage.allPermission')"
            :value="allMenus"
            :disabled="busy || globalAll"
            @update:value="toggleAllMenus"
          />
          <NText v-if="allMenus" depth="3">{{ allPermissionNotice }}</NText>
        </div>
        <NSpin v-if="menuLoading" class="py-24px" />
        <RoleMenuPermissions
          v-else-if="menus"
          v-model="menuDraft"
          :menus="menus"
          :all="allMenus"
          :disabled="busy || allMenus"
        />
        <div v-else class="flex items-center gap-12px">
          <NAlert type="error">{{ $t('page.manage.loadFailed') }}</NAlert>
          <NButton @click="loadMenus">{{ $t('common.refresh') }}</NButton>
        </div>
      </NTabPane>

      <NTabPane name="data" :tab="$t('page.manage.dataPermission')" display-directive="show:lazy">
        <NTabs type="line" default-value="users" size="small">
          <NTabPane name="users" :tab="$t('page.manage.userPermission')">
            <div class="mb-12px flex flex-wrap items-center gap-10px">
              <span>{{ $t('page.manage.allPermission') }}</span>
              <NSwitch
                :aria-label="$t('page.manage.allPermission')"
                :value="allUsers"
                :disabled="busy || globalAll"
                @update:value="toggleAllUsers"
              />
              <NText v-if="allUsers" depth="3">{{ allPermissionNotice }}</NText>
            </div>
            <div class="role-user-permission-lists">
              <RoleUserPermissionList
                :role-id="roleId"
                :authorized="false"
                :disabled="busy || allUsers"
                :revision="revision"
                @apply="saveUsers($event, RoleAuthorizationOperation.Grant)"
              />
              <RoleUserPermissionList
                :role-id="roleId"
                :authorized="true"
                :disabled="busy || allUsers"
                :revision="revision"
                @apply="saveUsers($event, RoleAuthorizationOperation.Revoke)"
              />
            </div>
          </NTabPane>
        </NTabs>
      </NTabPane>

      <NTabPane name="field" :tab="$t('page.manage.fieldPermission')" display-directive="show:lazy">
        <div class="mb-12px flex flex-wrap items-center gap-10px">
          <span>{{ $t('page.manage.allPermission') }}</span>
          <NSwitch
            :aria-label="$t('page.manage.allPermission')"
            :value="allFields"
            :disabled="busy || globalAll"
            @update:value="toggleAllFields"
          />
          <NText v-if="allFields" depth="3">{{ allPermissionNotice }}</NText>
        </div>
        <NSpin v-if="fieldLoading" class="py-24px" />
        <RoleFieldPermissions
          v-else-if="fields"
          v-model="fieldDraft"
          :groups="fields"
          :all="allFields"
          :disabled="busy || allFields"
        />
        <div v-else class="flex items-center gap-12px">
          <NAlert type="error">{{ $t('page.manage.loadFailed') }}</NAlert>
          <NButton @click="loadFields">{{ $t('common.refresh') }}</NButton>
        </div>
      </NTabPane>
    </NTabs>
    <template #footer>
      <div class="flex justify-end gap-8px">
        <NButton :disabled="busy" @click="close">{{ $t('common.cancel') }}</NButton>
        <NButton
          v-if="activeTab !== 'data'"
          type="primary"
          :disabled="busy || !activeDraft"
          @click="confirmPermissions"
        >
          {{ $t('common.confirm') }}
        </NButton>
      </div>
    </template>
  </NModal>
</template>

<style scoped>
.role-user-permission-lists {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

@media (max-width: 900px) {
  .role-user-permission-lists {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
