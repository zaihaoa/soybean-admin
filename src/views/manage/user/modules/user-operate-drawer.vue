<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { fetchAddUser, fetchRolePage, fetchUpdateUser, fetchUserDetail } from '@/service/api';
import { $t } from '@/locales';
import { useNaiveForm } from '@/hooks/common/form';

const props = defineProps<{ userId?: string }>();
const emit = defineEmits<{ submitted: [] }>();
const visible = defineModel<boolean>('visible', { default: false });
const { formRef, validate, restoreValidation } = useNaiveForm();
const model = ref(createModel());
const loading = ref(false);
const saving = ref(false);
const ready = ref(false);
const roleOptions = ref<{ label: string; value: string }[]>([]);
const title = computed(() => $t(props.userId ? 'page.manage.editUser' : 'page.manage.addUser'));
const rules = computed(() => ({
  username: { required: true, message: $t('form.required'), trigger: 'blur' },
  name: { required: true, message: $t('form.required'), trigger: 'blur' },
  roleIds: {
    type: 'array' as const,
    required: true,
    min: 1,
    message: $t('page.manage.roleRequired'),
    trigger: 'change'
  },
  password: { required: !props.userId, message: $t('form.pwd.required'), trigger: 'blur' },
  confirmPassword: {
    validator: (_rule: unknown, value: string) => Boolean(value) && value === model.value.password,
    message: $t('page.manage.passwordMismatch'),
    trigger: 'blur'
  }
}));

function createModel(): Api.SystemManage.UserWrite & Api.SystemManage.PasswordWrite {
  return { username: '', name: '', phone: '', email: '', roleIds: [], password: '', confirmPassword: '' };
}

async function loadRoles() {
  const roles: Api.SystemManage.Role[] = [];
  for (let current = 1; ; current += 1) {
    const { data, error } = await fetchRolePage({ current, size: 100 });
    if (error || !data) return null;
    roles.push(...data.records);
    if (current * data.size >= data.total) return roles;
    if (!data.records.length) return null;
  }
}

watch([visible, () => props.userId], async ([show], _previous, onCleanup) => {
  let active = true;
  onCleanup(() => {
    active = false;
  });
  if (!show) return;
  ready.value = false;
  loading.value = true;
  model.value = createModel();
  roleOptions.value = [];
  restoreValidation();
  try {
    const [roles, detail] = await Promise.all([loadRoles(), props.userId ? fetchUserDetail(props.userId) : null]);
    if (!active) return;
    if (!roles || (props.userId && (!detail || detail.error || !detail.data))) return;
    roleOptions.value = roles.map(role => ({
      value: role.id,
      label: role.name + (role.status === 'DISABLED' ? ` (${$t('page.manage.disabled')})` : '')
    }));
    if (detail?.data) {
      const user = detail.data;
      model.value = {
        ...createModel(),
        username: user.username,
        name: user.name,
        phone: user.phone || '',
        email: user.email || '',
        roleIds: (user.roles || []).map(role => role.ruleId)
      };
    }
    ready.value = true;
  } finally {
    if (active) loading.value = false;
  }
});

async function submit() {
  if (!ready.value || saving.value) return;
  saving.value = true;
  try {
    const valid = await validate().then(
      () => true,
      () => false
    );
    if (!valid) return;
    const { password, confirmPassword, ...user } = model.value;
    const result = props.userId
      ? await fetchUpdateUser({ id: props.userId, ...user })
      : await fetchAddUser({ ...user, password, confirmPassword });
    if (result.error || !result.data) return;
    window.$message?.success($t('common.updateSuccess'));
    visible.value = false;
    emit('submitted');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <NDrawer v-model:show="visible" :width="440" :mask-closable="!saving" :close-on-esc="!saving">
    <NDrawerContent :title="title" :native-scrollbar="false" :closable="!saving">
      <NSpin :show="loading">
        <NAlert v-if="!loading && !ready" type="error">{{ $t('page.manage.detailUnavailable') }}</NAlert>
        <NForm v-else ref="formRef" :model="model" :rules="rules" :disabled="loading || saving">
          <NFormItem :label="$t('page.manage.username')" path="username">
            <NInput v-model:value="model.username" />
          </NFormItem>
          <NFormItem :label="$t('page.manage.name')" path="name"><NInput v-model:value="model.name" /></NFormItem>
          <template v-if="!userId">
            <NFormItem :label="$t('page.manage.password')" path="password">
              <NInput
                v-model:value="model.password"
                type="password"
                show-password-on="click"
                autocomplete="new-password"
              />
            </NFormItem>
            <NFormItem :label="$t('page.manage.confirmPassword')" path="confirmPassword">
              <NInput
                v-model:value="model.confirmPassword"
                type="password"
                show-password-on="click"
                autocomplete="new-password"
              />
            </NFormItem>
          </template>
          <NFormItem :label="$t('page.manage.phone')" path="phone"><NInput v-model:value="model.phone" /></NFormItem>
          <NFormItem :label="$t('page.manage.email')" path="email"><NInput v-model:value="model.email" /></NFormItem>
          <NFormItem :label="$t('page.manage.roles')" path="roleIds">
            <NSelect
              v-model:value="model.roleIds"
              multiple
              filterable
              :options="roleOptions"
              :placeholder="$t('page.manage.select')"
            />
          </NFormItem>
          <NAlert v-if="ready && !roleOptions.length" type="warning">{{ $t('page.manage.emptyRoleOptions') }}</NAlert>
        </NForm>
      </NSpin>
      <template #footer>
        <NSpace justify="end">
          <NButton :disabled="saving" @click="visible = false">{{ $t('common.cancel') }}</NButton>
          <NButton type="primary" :disabled="!ready || loading" :loading="saving" @click="submit">
            {{ $t('common.confirm') }}
          </NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>
