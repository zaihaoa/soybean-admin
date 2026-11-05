<script setup lang="ts">
import { computed } from 'vue';
import { $t } from '@/locales';
import {
  createMenuAuthorization,
  getMenuAuthorizationState,
  setMenuAuthorizationBranch,
  setMenuAuthorizationButton
} from './menu-authorization';
import type { MenuAuthorizationNode, MenuAuthorizationSelection } from './menu-authorization';

const props = defineProps<{
  menus: MenuAuthorizationNode[];
  disabled: boolean;
  all: boolean;
}>();
const selection = defineModel<MenuAuthorizationSelection>({ required: true });

const model = computed(() => createMenuAuthorization(props.menus));
const selected = computed(() => ({
  menuIds: new Set(selection.value.menuIds),
  buttonCodes: new Set(selection.value.buttonCodes)
}));

function branchState(id: string) {
  return props.all
    ? { checked: true, indeterminate: false }
    : getMenuAuthorizationState(model.value, selected.value, id);
}

function selectBranch(id: string, checked: boolean) {
  if (!props.disabled) selection.value = setMenuAuthorizationBranch(model.value, selection.value, id, checked);
}

function selectButton(id: string, code: string, checked: boolean) {
  if (!props.disabled) selection.value = setMenuAuthorizationButton(model.value, selection.value, id, code, checked);
}
</script>

<template>
  <NEmpty v-if="!model.groups.length" :description="$t('common.noData')" class="py-24px" />
  <div v-else class="overflow-x-auto">
    <NTable :single-line="false" size="small" class="min-w-540px">
      <colgroup>
        <col class="w-16%" />
        <col class="w-22%" />
        <col />
      </colgroup>
      <thead>
        <tr>
          <th>{{ $t('page.manage.module') }}</th>
          <th>{{ $t('page.manage.submenu') }}</th>
          <th>{{ $t('page.manage.actionPermission') }}</th>
        </tr>
      </thead>
      <tbody v-for="group in model.groups" :key="group.root.id">
        <tr v-for="(row, index) in group.rows" :key="row.id">
          <td v-if="index === 0" :rowspan="group.rows.length">
            <NCheckbox
              v-bind="branchState(group.root.id)"
              :disabled="disabled"
              @update:checked="selectBranch(group.root.id, $event)"
            >
              {{ group.root.name }}
            </NCheckbox>
          </td>
          <td>
            <NCheckbox
              v-if="row.depth"
              v-bind="branchState(row.id)"
              :style="{ marginInlineStart: `${(row.depth - 1) * 16}px` }"
              :disabled="disabled"
              @update:checked="selectBranch(row.id, $event)"
            >
              {{ row.name }}
            </NCheckbox>
            <span v-else aria-hidden="true">—</span>
          </td>
          <td>
            <div class="flex flex-wrap gap-x-18px gap-y-6px">
              <NCheckbox
                v-for="button in row.buttons"
                :key="button.code"
                :checked="all || (selected.menuIds.has(row.id) && selected.buttonCodes.has(button.code))"
                :disabled="disabled"
                @update:checked="selectButton(row.id, button.code, $event)"
              >
                {{ button.label }}
              </NCheckbox>
            </div>
          </td>
        </tr>
      </tbody>
    </NTable>
  </div>
</template>
