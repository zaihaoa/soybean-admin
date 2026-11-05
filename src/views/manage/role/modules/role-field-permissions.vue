<script setup lang="ts">
import { computed } from 'vue';
import { $t } from '@/locales';

const props = defineProps<{
  groups: Api.SystemManage.FieldPermissionGroup[];
  disabled: boolean;
  all: boolean;
}>();
const selection = defineModel<string[]>({ required: true });
const selected = computed(() => new Set(selection.value));

function groupState(group: Api.SystemManage.FieldPermissionGroup) {
  const checked = props.all || group.items.every(item => selected.value.has(item.code));
  return { checked, indeterminate: !checked && group.items.some(item => selected.value.has(item.code)) };
}

function selectCodes(codes: string[], checked: boolean) {
  if (props.disabled) return;
  const affected = new Set(codes);
  selection.value = checked
    ? [...new Set([...selection.value, ...codes])]
    : selection.value.filter(code => !affected.has(code));
}

function selectGroup(group: Api.SystemManage.FieldPermissionGroup, checked: boolean) {
  selectCodes(
    group.items.map(item => item.code),
    checked
  );
}
</script>

<template>
  <NEmpty v-if="!groups.length" :description="$t('common.noData')" class="py-24px" />
  <NTable v-else :single-line="false" size="small">
    <tbody>
      <tr v-for="group in groups" :key="group.groupName">
        <td class="w-160px">
          <NCheckbox
            v-bind="groupState(group)"
            :disabled="disabled || !group.items.length"
            @update:checked="selectGroup(group, $event)"
          >
            {{ group.groupName }}
          </NCheckbox>
        </td>
        <td>
          <div class="flex flex-wrap gap-x-18px gap-y-6px">
            <NCheckbox
              v-for="item in group.items"
              :key="item.code"
              :checked="all || selected.has(item.code)"
              :disabled="disabled"
              @update:checked="selectCodes([item.code], $event)"
            >
              {{ item.label }}
            </NCheckbox>
          </div>
        </td>
      </tr>
    </tbody>
  </NTable>
</template>
