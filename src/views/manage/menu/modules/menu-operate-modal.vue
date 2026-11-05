<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { TreeSelectOption } from 'naive-ui';
import { normalizeMenuIconType } from '@/utils/system-manage';
import { fetchAddMenu, fetchMenuDetail, fetchUpdateMenu } from '@/service/api';
import { $t } from '@/locales';
import { useNaiveForm } from '@/hooks/common/form';
import { usePageOverlay } from '@/hooks/common/page-overlay';
import { layouts, views } from '@/router/elegant/imports';
import { useManageOptions } from '../../shared';

const props = defineProps<{ menuId?: string; parentId?: string; tree: Api.SystemManage.Menu[] }>();
const emit = defineEmits<{ submitted: [] }>();
const { overlayActive, overlayProps } = usePageOverlay();
const visible = defineModel<boolean>('visible', { default: false });
const { formRef, validate, restoreValidation } = useNaiveForm();
const { statusOptions } = useManageOptions();
const model = ref(createModel());
const loading = ref(false);
const saving = ref(false);
const ready = ref(false);
const rules = computed(() => ({ menuName: { required: true, message: $t('form.required'), trigger: 'blur' } }));
const layoutOptions = Object.keys(layouts).map(value => ({ label: value, value }));
const componentOptions = Object.keys(views).map(key => ({ label: key, value: `view.${key}` }));
const localIcons = Object.keys(import.meta.glob('/src/assets/svg-icon/*.svg')).map(path => {
  const value = path.split('/').pop()!.replace('.svg', '');
  return { label: value, value };
});
const textFields = [
  'routeName',
  'routePath',
  'routePathParam',
  'permission',
  'i18nKey',
  'highlightRouteName',
  'externalLink'
] as const;
const boolFields = ['cacheRoute', 'constantRoute', 'hideRoute'] as const;
const hasChildren = computed(() => {
  function find(nodes: Api.SystemManage.Menu[]): boolean {
    return nodes.some(node => (node.id === props.menuId ? Boolean(node.children?.length) : find(node.children || [])));
  }
  return find(props.tree);
});
const parentOptions = computed<TreeSelectOption[]>(() => {
  function options(nodes: Api.SystemManage.Menu[]): TreeSelectOption[] {
    return nodes
      .filter(node => node.id !== props.menuId && node.menuType === 'DIRECTORY')
      .map(node => ({
        key: node.id,
        label: node.menuName,
        children: options(node.children || [])
      }));
  }
  return [{ key: '0', label: $t('page.manage.root') }, ...options(props.tree)];
});
const canSetMenuGroup = computed(() =>
  props.tree.some(node => node.id === model.value.parentId && node.menuType === 'DIRECTORY')
);

function handleParentChange(value: string | number | null) {
  const parentId = value === null ? '0' : String(value);
  if (parentId === model.value.parentId) return;

  model.value.parentId = parentId;
  model.value.menuGroupName = null;
}

function createModel(): Api.SystemManage.MenuWrite {
  return {
    menuType: 'DIRECTORY',
    menuName: '',
    menuGroupName: null,
    status: 'ENABLED',
    parentId: props.parentId || '0',
    routeName: '',
    routePath: '',
    routePathParam: '',
    permission: '',
    layout: 'base',
    component: null,
    i18nKey: '',
    sortNumber: 0,
    iconType: 'ICONIFY',
    icon: '',
    cacheRoute: false,
    constantRoute: false,
    hideRoute: false,
    highlightRouteName: '',
    externalLink: '',
    routeParam: [],
    button: []
  };
}
watch([visible, () => props.menuId, () => props.parentId], async ([show], _previous, onCleanup) => {
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
    if (props.menuId) {
      const { data, error } = await fetchMenuDetail(props.menuId);
      if (!active || error || !data) return;
      // Pick DTO fields explicitly; never submit children, audit fields or stale row data.
      const defaults = createModel();
      for (const key of Object.keys(defaults) as (keyof Api.SystemManage.MenuWrite)[]) {
        Object.assign(defaults, { [key]: data[key] ?? defaults[key] });
      }
      model.value = { ...defaults, iconType: normalizeMenuIconType(data.iconType) };
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
    if (
      model.value.routeParam.some(item => !item.param.trim() || !item.value.trim()) ||
      model.value.button.some(item => !item.code.trim() || !item.label.trim())
    ) {
      window.$message?.warning($t('page.manage.invalidPair'));
      return;
    }
    const payload = {
      ...model.value,
      menuGroupName: canSetMenuGroup.value ? model.value.menuGroupName?.trim() || null : null,
      sortNumber: model.value.sortNumber ?? 0
    };
    const result = props.menuId ? await fetchUpdateMenu({ id: props.menuId, ...payload }) : await fetchAddMenu(payload);
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
  <NModal
    v-bind="overlayProps"
    :show="overlayActive && visible"
    preset="card"
    transform-origin="center"
    :title="$t(menuId ? 'page.manage.editMenu' : 'page.manage.addMenu')"
    class="w-900px max-w-95vw"
    :mask-closable="!saving"
    :close-on-esc="!saving"
    :closable="!saving"
    @update:show="visible = $event"
  >
    <NScrollbar class="max-h-65vh pr-16px">
      <NSpin :show="loading">
        <NAlert v-if="!loading && !ready" type="error">{{ $t('page.manage.detailUnavailable') }}</NAlert>
        <NForm
          v-else
          ref="formRef"
          :model="model"
          :rules="rules"
          :disabled="loading || saving"
          label-placement="left"
          :label-width="120"
        >
          <NGrid cols="1 m:2" responsive="screen" :x-gap="24">
            <NFormItemGi :label="$t('page.manage.menuType')">
              <NRadioGroup v-model:value="model.menuType">
                <NRadio value="DIRECTORY">{{ $t('page.manage.directory') }}</NRadio>
                <NRadio value="MENU" :disabled="hasChildren">{{ $t('page.manage.menu') }}</NRadio>
              </NRadioGroup>
            </NFormItemGi>
            <NFormItemGi :label="$t('page.manage.menuName')" path="menuName">
              <NInput v-model:value="model.menuName" :maxlength="100" />
            </NFormItemGi>
            <NFormItemGi :label="$t('page.manage.parent')">
              <NTreeSelect
                :value="model.parentId"
                :options="parentOptions"
                filterable
                @update:value="handleParentChange"
              />
            </NFormItemGi>
            <NFormItemGi v-if="canSetMenuGroup" :label="$t('page.manage.menuGroupName')">
              <NInput
                v-model:value="model.menuGroupName"
                :placeholder="$t('page.manage.menuGroupPlaceholder')"
                :maxlength="100"
                clearable
              />
            </NFormItemGi>
            <NFormItemGi :label="$t('page.manage.sortNumber')">
              <NInputNumber v-model:value="model.sortNumber" class="w-full" :precision="0" />
            </NFormItemGi>
            <NFormItemGi v-for="field in textFields" :key="field" :label="$t(`page.manage.${field}`)">
              <NInput v-model:value="model[field]" :maxlength="field === 'externalLink' ? 100 : 200" />
            </NFormItemGi>
            <NFormItemGi :label="$t('page.manage.layout')">
              <NSelect v-model:value="model.layout" :options="layoutOptions" clearable />
            </NFormItemGi>
            <NFormItemGi :label="$t('page.manage.component')">
              <NSelect v-model:value="model.component" :options="componentOptions" clearable filterable />
            </NFormItemGi>
            <NFormItemGi :label="$t('page.manage.iconType')">
              <NRadioGroup v-model:value="model.iconType">
                <NRadio value="ICONIFY">{{ $t('page.manage.iconify') }}</NRadio>
                <NRadio value="LOCAL">{{ $t('page.manage.localIcon') }}</NRadio>
              </NRadioGroup>
            </NFormItemGi>
            <NFormItemGi :label="$t('page.manage.icon')">
              <NInput v-if="model.iconType === 'ICONIFY'" v-model:value="model.icon" :maxlength="100">
                <template #suffix><SvgIcon v-if="model.icon" :icon="model.icon" /></template>
              </NInput>
              <NSelect v-else v-model:value="model.icon" :options="localIcons" filterable />
            </NFormItemGi>
            <NFormItemGi :label="$t('page.manage.status')">
              <NRadioGroup v-model:value="model.status">
                <NRadio v-for="item in statusOptions" :key="item.value" :value="item.value" :label="item.label" />
              </NRadioGroup>
            </NFormItemGi>
            <NFormItemGi v-for="field in boolFields" :key="field" :label="$t(`page.manage.${field}`)">
              <NSwitch v-model:value="model[field]" />
            </NFormItemGi>
          </NGrid>
          <NFormItem :label="$t('page.manage.routeParam')">
            <NDynamicInput v-model:value="model.routeParam" :on-create="() => ({ param: '', value: '' })">
              <template #default="{ value }">
                <div class="flex-1 flex gap-12px">
                  <NInput v-model:value="value.param" :placeholder="$t('page.manage.param')" />
                  <NInput v-model:value="value.value" :placeholder="$t('page.manage.value')" />
                </div>
              </template>
            </NDynamicInput>
          </NFormItem>
          <NFormItem :label="$t('page.manage.button')">
            <NDynamicInput v-model:value="model.button" :on-create="() => ({ code: '', label: '' })">
              <template #default="{ value }">
                <div class="flex-1 flex gap-12px">
                  <NInput v-model:value="value.code" :placeholder="$t('page.manage.buttonCode')" />
                  <NInput v-model:value="value.label" :placeholder="$t('page.manage.buttonLabel')" />
                </div>
              </template>
            </NDynamicInput>
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
