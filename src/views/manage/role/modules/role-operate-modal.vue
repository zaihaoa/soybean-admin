<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { fetchAddRole, fetchRoleDetail, fetchUpdateRole } from '@/service/api';
import { $t } from '@/locales';
import { useNaiveForm } from '@/hooks/common/form';
import { usePageOverlay } from '@/hooks/common/page-overlay';

const props = defineProps<{ roleId?: string }>();
const emit = defineEmits<{ submitted: [] }>();
const { overlayActive, overlayProps } = usePageOverlay();
const visible = defineModel<boolean>('visible', { default: false });
const { formRef, validate, restoreValidation } = useNaiveForm();
const model = ref(createModel());
const loading = ref(false);
const saving = ref(false);
const ready = ref(false);
const rules = computed(() => ({
  name: { required: true, message: $t('form.required'), trigger: 'blur' },
  code: { required: true, message: $t('form.required'), trigger: 'blur' }
}));
function createModel(): Api.SystemManage.RoleWrite {
  return { name: '', code: '', remark: '' };
}
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
        remark: data.remark || ''
      };
    }
    if (active) ready.value = true;
  } finally {
    if (active) loading.value = false;
  }
});
</script>

<template>
  <NModal
    v-bind="overlayProps"
    :show="overlayActive && visible"
    preset="card"
    transform-origin="center"
    :title="$t(roleId ? 'page.manage.editRole' : 'page.manage.addRole')"
    class="w-620px max-w-95vw"
    :mask-closable="!saving"
    :close-on-esc="!saving"
    :closable="!saving"
    @update:show="visible = $event"
  >
    <NScrollbar class="max-h-65vh pr-8px">
      <NSpin :show="loading">
        <NAlert v-if="!loading && !ready" type="error">{{ $t('page.manage.detailUnavailable') }}</NAlert>
        <NForm v-else ref="formRef" :model="model" :rules="rules" :disabled="loading || saving">
          <NFormItem :label="$t('page.manage.roleName')" path="name">
            <NInput v-model:value="model.name" :maxlength="100" />
          </NFormItem>
          <NFormItem :label="$t('page.manage.roleCode')" path="code">
            <NInput v-model:value="model.code" :maxlength="100" />
          </NFormItem>
          <NFormItem :label="$t('page.manage.remark')">
            <NInput v-model:value="model.remark" type="textarea" :maxlength="1000" show-count />
          </NFormItem>
        </NForm>
      </NSpin>
    </NScrollbar>
    <template #footer>
      <NSpace justify="end">
        <NButton :disabled="saving" @click="visible = false">{{ $t('common.cancel') }}</NButton>
        <NButton type="primary" :disabled="!ready || loading" :loading="saving" @click="submit">
          {{ $t('common.confirm') }}
        </NButton>
      </NSpace>
    </template>
  </NModal>
</template>
