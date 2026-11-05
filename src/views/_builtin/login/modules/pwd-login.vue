<script setup lang="ts">
import { reactive } from 'vue';
import { $t } from '@/locales';
import { useAuthStore } from '@/store/modules/auth';
import { useNaiveForm } from '@/hooks/common/form';

const authStore = useAuthStore();
const { formRef, validate } = useNaiveForm();
const model = reactive({ username: '', password: '' });
const rules = { username: { required: true }, password: { required: true } };

async function handleSubmit() {
  if (authStore.loginLoading) return;
  await validate();
  await authStore.login(model.username, model.password);
}
</script>

<template>
  <NForm ref="formRef" :model="model" :rules="rules" size="large" :show-label="false" @keyup.enter="handleSubmit">
    <NFormItem path="username">
      <NInput
        v-model:value="model.username"
        autocomplete="username"
        :placeholder="$t('page.login.common.userNamePlaceholder')"
      />
    </NFormItem>
    <NFormItem path="password">
      <NInput
        v-model:value="model.password"
        type="password"
        autocomplete="current-password"
        show-password-on="click"
        :placeholder="$t('page.login.common.passwordPlaceholder')"
      />
    </NFormItem>
    <NButton type="primary" size="large" round block :loading="authStore.loginLoading" @click="handleSubmit">
      {{ $t('common.confirm') }}
    </NButton>
  </NForm>
</template>
