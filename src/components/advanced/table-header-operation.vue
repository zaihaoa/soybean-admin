<script setup lang="ts">
import { useConfirmAction } from '@/utils/confirm-action';
import { $t } from '@/locales';
import type { TableColumnSettings } from '@/hooks/common/use-table-column-settings';

defineOptions({
  name: 'TableHeaderOperation'
});

interface Props {
  itemAlign?: NaiveUI.Align;
  disabledDelete?: boolean;
  loading?: boolean;
  columnSettings: TableColumnSettings;
}

defineProps<Props>();

interface Emits {
  (e: 'add'): void;
  (e: 'delete'): void;
  (e: 'refresh'): void;
}

const emit = defineEmits<Emits>();

const confirmAction = useConfirmAction();

function add() {
  emit('add');
}

function batchDelete() {
  confirmAction({
    title: $t('common.batchDelete'),
    content: $t('common.confirmDelete'),
    onConfirm: () => emit('delete')
  });
}

function refresh() {
  emit('refresh');
}
</script>

<template>
  <div class="w-full flex flex-wrap items-center justify-between gap-8px">
    <NSpace :align="itemAlign" wrap class="min-w-0">
      <slot name="prefix"></slot>
      <slot name="default">
        <NButton size="small" type="primary" @click="add">
          {{ $t('common.add') }}
        </NButton>
        <NButton size="small" ghost type="error" :disabled="disabledDelete" @click="batchDelete">
          {{ $t('common.batchDelete') }}
        </NButton>
      </slot>
    </NSpace>
    <div class="ml-auto flex shrink-0 items-center gap-4px">
      <NTooltip placement="top">
        <template #trigger>
          <NButton size="small" quaternary :aria-label="$t('common.refresh')" @click="refresh">
            <template #icon>
              <icon-mdi-refresh class="text-icon" :class="{ 'animate-spin': loading }" />
            </template>
          </NButton>
        </template>
        {{ $t('common.refresh') }}
      </NTooltip>
      <TableColumnSetting :settings="columnSettings" />
      <slot name="suffix"></slot>
    </div>
  </div>
</template>

<style scoped></style>
