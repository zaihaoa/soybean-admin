<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue';
import { VueDraggable } from 'vue-draggable-plus';
import type { MoveEvent } from 'vue-draggable-plus';
import { $t } from '@/locales';
import { usePageOverlay } from '@/hooks/common/page-overlay';
import { MAX_FIXED_COLUMNS, orderLeftFixedColumns } from '@/hooks/common/table-column-config';
import type { ColumnSetting } from '@/hooks/common/table-column-config';
import type { TableColumnSettings } from '@/hooks/common/use-table-column-settings';

defineOptions({ name: 'TableColumnSetting' });

const props = defineProps<{ settings: TableColumnSettings }>();

const { overlayActive, overlayProps } = usePageOverlay();
const showSettings = shallowRef(false);
const applying = shallowRef(false);
const resetWidths = shallowRef(false);
const draft = shallowRef<ColumnSetting[]>([]);

const configurable = computed(() => draft.value.filter(column => column.visible));
const availableColumns = computed(() => {
  const draftByKey = new Map(configurable.value.map(column => [column.key, column]));
  return props.settings.defaults.flatMap(column => {
    const item = draftByKey.get(column.key);
    return item ? [item] : [];
  });
});
const toggleable = computed(() => configurable.value.filter(column => !column.required));
const checkedCount = computed(() => configurable.value.filter(column => column.checked).length);
const fixedCount = computed(
  () => configurable.value.filter(column => column.checked && column.fixed !== 'unFixed').length
);
const selected = computed({
  get: () => orderLeftFixedColumns(configurable.value.filter(column => column.checked)),
  set: (columns: ColumnSetting[]) => {
    draft.value = [
      ...orderLeftFixedColumns(columns),
      ...draft.value.filter(column => !column.visible || !column.checked)
    ];
  }
});
const canApply = computed(
  () =>
    selected.value.length > 0 &&
    !props.settings.saving &&
    (props.settings.status === 'ready' || (props.settings.status === 'invalid' && resetWidths.value))
);

function startDraft() {
  draft.value = props.settings.columns.map(column => ({ ...column }));
  resetWidths.value = false;
}

function openSettings() {
  startDraft();
  showSettings.value = true;
}

function closeSettings() {
  showSettings.value = false;
}

function toggleSelectAll(checked: boolean) {
  draft.value = draft.value.map(column =>
    column.visible && !column.required ? { ...column, checked, fixed: checked ? column.fixed : 'unFixed' } : column
  );
}

function toggleColumn(key: string, checked: boolean) {
  draft.value = draft.value.map(column =>
    column.key === key ? { ...column, checked, fixed: checked ? column.fixed : 'unFixed' } : column
  );
}

function moveToTop(column: ColumnSetting) {
  selected.value = [column, ...selected.value.filter(item => item.key !== column.key)];
}

function isFirstInGroup(column: ColumnSetting) {
  return selected.value.find(item => item.fixed === column.fixed)?.key === column.key;
}

function canMoveColumn({ dragged, related }: MoveEvent) {
  return dragged.dataset.fixed === related.dataset.fixed;
}

function toggleFixed(column: ColumnSetting) {
  if (column.fixed === 'unFixed' && fixedCount.value >= MAX_FIXED_COLUMNS) return;

  const next = column.fixed === 'unFixed' ? 'left' : 'unFixed';
  draft.value = draft.value.map(item => (item.key === column.key ? { ...item, fixed: next } : item));
}

function restoreDefaults() {
  draft.value = props.settings.defaults.map(column => ({ ...column }));
  resetWidths.value = true;
}

async function applySettings() {
  if (!canApply.value || applying.value) return;

  applying.value = true;
  try {
    if (await props.settings.apply(draft.value, resetWidths.value)) closeSettings();
  } finally {
    applying.value = false;
  }
}

watch(
  () => props.settings.status,
  () => {
    if (showSettings.value && !applying.value) startDraft();
  }
);
</script>

<template>
  <NTooltip placement="top">
    <template #trigger>
      <NButton
        size="small"
        quaternary
        :aria-label="$t('common.columnSetting')"
        :aria-expanded="showSettings"
        @click="openSettings"
      >
        <template #icon>
          <icon-ant-design-setting-outlined class="text-icon" />
        </template>
      </NButton>
    </template>
    {{ $t('common.columnSetting') }}
  </NTooltip>
  <NModal
    v-bind="overlayProps"
    :show="overlayActive && showSettings"
    preset="card"
    transform-origin="center"
    :title="$t('common.columnSetting')"
    :mask-closable="!applying"
    :close-on-esc="!applying"
    :closable="!applying"
    class="w-960px max-w-95vw"
    @update:show="showSettings = $event"
  >
    <NSpin :show="settings.status === 'loading'">
      <NAlert v-if="settings.status === 'failed'" type="error" class="mb-16px">
        {{ $t('datatable.columnLoadFailed') }}
        <NButton size="small" text type="primary" class="ml-8px" @click="settings.reload">
          {{ $t('common.refresh') }}
        </NButton>
      </NAlert>
      <NAlert v-else-if="settings.status === 'invalid'" type="warning" class="mb-16px">
        {{ $t('datatable.columnInvalid') }}
      </NAlert>
      <NAlert v-else-if="settings.status === 'unsupported'" type="warning" class="mb-16px">
        {{ $t('datatable.columnUnsupported') }}
      </NAlert>
      <div class="max-h-65vh min-h-320px flex flex-col gap-16px overflow-y-auto sm:flex-row sm:overflow-hidden">
        <div class="min-w-0 flex-1 sm:overflow-y-auto">
          <NCheckbox
            :checked="configurable.length > 0 && checkedCount === configurable.length"
            :indeterminate="checkedCount > 0 && checkedCount < configurable.length"
            :disabled="!toggleable.length || applying"
            @update:checked="toggleSelectAll"
          >
            {{ $t('common.selectAll') }}
          </NCheckbox>
          <div class="mt-16px grid grid-cols-2 gap-12px md:grid-cols-3 lg:grid-cols-4">
            <NCheckbox
              v-for="column in availableColumns"
              :key="column.key"
              :checked="column.checked"
              :disabled="column.required || applying"
              @update:checked="toggleColumn(column.key, $event)"
            >
              <component :is="column.title" v-if="typeof column.title === 'function'" />
              <template v-else>{{ column.title }}</template>
            </NCheckbox>
          </div>
        </div>
        <div
          class="flex flex-col sm:w-240px sm:shrink-0 sm:border-l sm:border-gray-200 sm:pl-12px sm:dark:border-gray-700"
        >
          <div class="mb-8px px-8px text-gray-500">
            {{ $t('datatable.columnFixedLimit', { count: MAX_FIXED_COLUMNS }) }}
          </div>
          <VueDraggable
            v-model="selected"
            handle=".column-drag-handle"
            :animation="150"
            :disabled="applying"
            :on-move="canMoveColumn"
            class="sm:min-h-0 sm:overflow-y-auto"
          >
            <div
              v-for="column in selected"
              :key="column.key"
              :data-fixed="column.fixed"
              class="column-setting-row min-h-30px flex-y-center gap-6px rounded-6px px-6px focus-within:bg-primary/10 hover:bg-primary/10"
            >
              <icon-mdi-drag class="column-drag-handle shrink-0 cursor-move text-14px" />
              <div class="min-w-0 flex-1 truncate" :title="typeof column.title === 'string' ? column.title : undefined">
                <component :is="column.title" v-if="typeof column.title === 'function'" />
                <template v-else>{{ column.title }}</template>
              </div>
              <NButton
                quaternary
                size="tiny"
                class="column-setting-action"
                :disabled="column.required || applying"
                :title="$t('datatable.columnRemove')"
                :aria-label="$t('datatable.columnRemove')"
                @click="toggleColumn(column.key, false)"
              >
                <template #icon><icon-mdi-close-circle-outline /></template>
              </NButton>
              <NButton
                quaternary
                size="tiny"
                class="column-setting-action"
                :disabled="applying || isFirstInGroup(column)"
                :title="$t('datatable.columnMoveTop')"
                :aria-label="$t('datatable.columnMoveTop')"
                @click="moveToTop(column)"
              >
                <template #icon><icon-mdi-arrow-collapse-up /></template>
              </NButton>
              <NButton
                quaternary
                size="tiny"
                class="column-setting-action"
                :class="{ 'is-pinned': column.fixed === 'left' }"
                :disabled="applying || (column.fixed === 'unFixed' && fixedCount >= MAX_FIXED_COLUMNS)"
                :type="column.fixed === 'unFixed' ? 'default' : 'primary'"
                :title="$t(column.fixed === 'left' ? 'icon.unpin' : 'icon.pin')"
                :aria-label="$t(column.fixed === 'left' ? 'icon.unpin' : 'icon.pin')"
                @click="toggleFixed(column)"
              >
                <template #icon>
                  <icon-mdi-pin v-if="column.fixed === 'left'" />
                  <icon-mdi-pin-outline v-else />
                </template>
              </NButton>
            </div>
          </VueDraggable>
        </div>
      </div>
    </NSpin>
    <template #footer>
      <div class="flex items-center justify-between gap-8px">
        <NButton
          text
          type="primary"
          :disabled="applying || (settings.status !== 'ready' && settings.status !== 'invalid')"
          @click="restoreDefaults"
        >
          {{ $t('datatable.columnRestore') }}
        </NButton>
        <NSpace>
          <NButton :disabled="applying" @click="closeSettings">{{ $t('common.close') }}</NButton>
          <NButton type="primary" :loading="applying" :disabled="!canApply" @click="applySettings">
            {{ $t('datatable.columnApply') }}
          </NButton>
        </NSpace>
      </div>
    </template>
  </NModal>
</template>

<style scoped>
@media (hover: hover) {
  .column-setting-row:not(:hover, :focus-within) .column-setting-action:not(.is-pinned) {
    opacity: 0;
    pointer-events: none;
  }
}
</style>
