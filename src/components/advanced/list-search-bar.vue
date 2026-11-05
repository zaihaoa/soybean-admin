<script setup lang="ts" generic="FieldKey extends string">
import { $t } from '@/locales';
import type { ListSearchCondition } from '@/hooks/common/list-search';

defineOptions({ name: 'ListSearchBar' });

interface Props {
  conditions: readonly ListSearchCondition<FieldKey>[];
  loading?: boolean;
}

const props = defineProps<Props>();

interface Emits {
  (e: 'search'): void;
  (e: 'reset'): void;
  (e: 'remove', key: FieldKey): void;
}

const emit = defineEmits<Emits>();

function handleSearch() {
  if (!props.loading) emit('search');
}

function handleReset() {
  emit('reset');
}

function handleRemove(key: FieldKey) {
  emit('remove', key);
}
</script>

<template>
  <NCard :bordered="false" size="small" class="card-wrapper" content-style="padding: 10px 12px">
    <form class="flex flex-wrap items-center gap-6px" @submit.prevent="handleSearch">
      <NConfigProvider abstract :theme-overrides="{ common: { heightSmall: '30px' } }">
        <slot></slot>
      </NConfigProvider>
      <div class="flex shrink-0 gap-6px">
        <NTooltip>
          <template #trigger>
            <NButton
              attr-type="submit"
              type="primary"
              size="small"
              :loading="loading"
              :aria-label="$t('common.search')"
            >
              <template #icon>
                <icon-uil-search class="text-icon" />
              </template>
            </NButton>
          </template>
          {{ $t('common.search') }}
        </NTooltip>
        <NTooltip>
          <template #trigger>
            <NButton size="small" :disabled="loading" :aria-label="$t('common.reset')" @click="handleReset">
              <template #icon>
                <icon-mdi-refresh class="text-icon" />
              </template>
            </NButton>
          </template>
          {{ $t('common.reset') }}
        </NTooltip>
      </div>
    </form>
    <div v-if="conditions.length" class="mt-8px flex flex-wrap items-center gap-6px">
      <NTag
        v-for="condition in conditions"
        :key="condition.key"
        :bordered="false"
        :disabled="loading"
        :title="`${condition.label}: ${condition.value}`"
        closable
        size="small"
        class="max-w-full"
        @close="handleRemove(condition.key)"
      >
        <span class="truncate">
          <span class="opacity-70">{{ condition.label }}:</span>
          {{ condition.value }}
        </span>
      </NTag>
      <NButton text type="primary" size="small" :disabled="loading" @click="handleReset">
        {{ $t('common.clear') }}
      </NButton>
    </div>
  </NCard>
</template>

<style scoped>
:slotted(.list-search-input) {
  width: 140px;
  max-width: 100%;
}

:slotted(.list-search-select) {
  width: 96px;
  max-width: 100%;
}
</style>
