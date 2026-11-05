<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { fetchResetUserPassword } from '@/service/api';
import { $t } from '@/locales';
import { useNaiveForm } from '@/hooks/common/form';

const props = defineProps<{ userId: string; username: string }>();
const visible = defineModel<boolean>('visible', { default: false });
const { formRef, validate, restoreValidation } = useNaiveForm();
const model = reactive({ password: '', confirmPassword: '' });
const saving = ref(false);
const rules = computed(() => ({
  password: { required: true, message: $t('form.pwd.required') },
  confirmPassword: {
    validator: (_rule: unknown, value: string) => Boolean(value) && value === model.password,
    message: $t('page.manage.passwordMismatch')
  }
}));
watch(visible, show => {
  if (!show) return;
  model.password = '';
  model.confirmPassword = '';
  restoreValidation();
});
async function submit() {
  if (saving.value) return;
  saving.value = true;
  try {
    const valid = await validate().then(
      () => true,
      () => false
    );
    if (!valid) return;
    const { data, error } = await fetchResetUserPassword(props.userId, { ...model });
    if (error || !data) return;
    window.$message?.success($t('common.updateSuccess'));
    visible.value = false;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <NModal
    v-model:show="visible"
    preset="card"
    :title="`${$t('page.manage.resetPassword')} · ${username}`"
    class="w-440px max-w-95vw"
    :mask-closable="!saving"
    :close-on-esc="!saving"
    :closable="!saving"
  >
    <NForm ref="formRef" :model="model" :rules="rules" :disabled="saving">
      <NFormItem :label="$t('page.manage.password')" path="password">
        <NInput v-model:value="model.password" type="password" autocomplete="new-password" show-password-on="click" />
      </NFormItem>
      <NFormItem :label="$t('page.manage.confirmPassword')" path="confirmPassword">
        <NInput
          v-model:value="model.confirmPassword"
          type="password"
          autocomplete="new-password"
          show-password-on="click"
        />
      </NFormItem>
    </NForm>
    <template #footer>
      <NSpace justify="end">
        <NButton :disabled="saving" @click="visible = false">{{ $t('common.cancel') }}</NButton>
        <NButton type="primary" :loading="saving" @click="submit">{{ $t('common.confirm') }}</NButton>
      </NSpace>
    </template>
  </NModal>
</template>
