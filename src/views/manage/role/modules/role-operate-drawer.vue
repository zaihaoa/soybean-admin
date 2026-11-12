<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { fetchAddRole, fetchRoleDetail, fetchUpdateRole } from '@/service/api';
import { $t } from '@/locales';
import { useNaiveForm } from '@/hooks/common/form';
import { useManageOptions } from '../../shared';

const props = defineProps<{ roleId?: string }>();
const emit = defineEmits<{ submitted: [] }>();
const visible = defineModel<boolean>('visible', { default: false });
const { formRef, validate, restoreValidation } = useNaiveForm();
const { statusOptions, roleTypeOptions } = useManageOptions();
const model = ref(createModel());
const loading = ref(false);
const saving = ref(false);
const ready = ref(false);
const rules = computed(() => ({
  name: { required: true, message: $t('form.required'), trigger: 'blur' },
  code: { required: true, message: $t('form.required'), trigger: 'blur' }
}));
function createModel(): Api.SystemManage.RoleWrite {
  return { name: '', code: '', remark: '', type: 'NORMAL', status: 'ENABLED', permissionFlag: [] };
}
watch([visible, () => props.roleId], async ([show], _previous, onCleanup) => {
  let active = true;
  onCleanup(() => {
    active = false;
  });
  if (!show) return;
  ready.value = false;
  loading.value = true;
  model.value = createModel();
  restoreValidation();
  try {
    if (props.roleId) {
      const { data, error } = await fetchRoleDetail(props.roleId);
      if (!active || error || !data) return;
      model.value = {
        name: data.name,
        code: data.code,
        remark: data.remark || '',
        status: data.status,
        type: data.type,
        permissionFlag: [...(data.permissionFlag || [])]
      };
    }
    if (active) ready.value = true;
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
    const result = props.roleId
      ? await fetchUpdateRole({ id: props.roleId, ...model.value })
      : await fetchAddRole({ ...model.value });
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
    <NDrawerContent
      :title="$t(roleId ? 'page.manage.editRole' : 'page.manage.addRole')"
      :native-scrollbar="false"
      :closable="!saving"
    >
      <NSpin :show="loading">
        <NAlert v-if="!loading && !ready" type="error">{{ $t('page.manage.detailUnavailable') }}</NAlert>
        <NForm v-else ref="formRef" :model="model" :rules="rules" :disabled="loading || saving">
          <NFormItem :label="$t('page.manage.roleName')" path="name">
            <NInput v-model:value="model.name" :maxlength="100" />
          </NFormItem>
          <NFormItem :label="$t('page.manage.roleCode')" path="code">
            <NInput v-model:value="model.code" :maxlength="100" />
          </NFormItem>
          <NFormItem :label="$t('page.manage.status')">
            <NRadioGroup v-model:value="model.status">
              <NRadio v-for="item in statusOptions" :key="item.value" :value="item.value" :label="item.label" />
            </NRadioGroup>
          </NFormItem>
          <NFormItem :label="$t('page.manage.type')">
            <NSelect :value="model.type" :options="roleTypeOptions" disabled />
          </NFormItem>
          <NFormItem :label="$t('page.manage.remark')">
            <NInput v-model:value="model.remark" type="textarea" :maxlength="1000" show-count />
          </NFormItem>
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
