import { computed, shallowReactive } from 'vue';
import type { ComputedRef, Ref } from 'vue';

type FilterKey<Filters> = Extract<keyof Filters, string>;

export interface ListSearchCondition<Key extends string> {
  key: Key;
  label: string;
  value: string;
}

interface ListSearchField<Key extends string> {
  key: Key;
  label: string;
  options?: readonly { label: string; value: string | number }[];
}

interface ListSearch<Filters> {
  applied: ComputedRef<Filters>;
  conditions: ComputedRef<ListSearchCondition<FilterKey<Filters>>[]>;
  search: () => Promise<void>;
  reset: () => Promise<void>;
  remove: (key: FilterKey<Filters>) => Promise<void>;
}

function hasFilterValue(value: unknown): boolean {
  return value != null && (typeof value !== 'string' || value.trim() !== '');
}

export function useListSearch<Filters extends object>(
  draft: Ref<Filters>,
  getFields: () => readonly ListSearchField<FilterKey<Filters>>[],
  onSearch: () => Promise<void>
): ListSearch<Filters> {
  const defaults = { ...draft.value };
  const state = shallowReactive({ applied: getQueryFilters(defaults) });
  const applied = computed(() => state.applied);

  const conditions = computed(() =>
    getFields().flatMap(({ key, label, options }) => {
      const value = applied.value[key];
      if (!hasFilterValue(value)) return [];

      const option = options?.find(item => item.value === value);
      return [{ key, label, value: option?.label ?? String(value) }];
    })
  );

  async function apply(next: Filters) {
    state.applied = next;
    await onSearch();
  }

  function getQueryFilters(values: Filters): Filters {
    const next = { ...values };
    for (const { key } of getFields()) {
      if (!hasFilterValue(next[key])) delete next[key];
    }
    return next;
  }

  function search() {
    return apply(getQueryFilters(draft.value));
  }

  function reset() {
    draft.value = { ...defaults };
    return search();
  }

  function remove(key: FilterKey<Filters>) {
    const next = { ...applied.value };
    delete next[key];
    draft.value[key] = defaults[key];
    return apply(next);
  }

  return { applied, conditions, search, reset, remove };
}
