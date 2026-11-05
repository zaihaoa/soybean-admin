import { computed, onScopeDispose, reactive, shallowRef, watch } from 'vue';
import type { ComputedRef } from 'vue';
import { useEventListener } from '@vueuse/core';
import type { DataTableProps } from 'naive-ui';
import { fetchColumnConfig, saveColumnConfig } from '@/service/api/user-config';
import { getAuthorization } from '@/service/request/shared';
import { $t } from '@/locales';
import { useAuthStore } from '@/store/modules/auth';
import {
  clampColumnWidth,
  decodeColumnConfig,
  mergeColumnSettings,
  serializeColumnSettings,
  toColumnPreferences
} from './table-column-config';
import type { ColumnSetting } from './table-column-config';

type LoadState = 'loading' | 'ready' | 'failed' | 'invalid' | 'unsupported';
const saveQueues = new Map<string, Promise<void>>();

interface WidthChange {
  key: string;
  width: number;
  start: number;
}

export interface TableColumnSettings {
  columns: ColumnSetting[];
  defaults: ColumnSetting[];
  status: LoadState;
  saving: boolean;
  reload: () => Promise<void>;
  apply: (columns: readonly ColumnSetting[], reset: boolean) => Promise<boolean>;
}

export function useTableColumnSettings(code: string, defaults: ComputedRef<ColumnSetting[]>, enabled = true) {
  const authStore = useAuthStore();
  const status = shallowRef<LoadState>(enabled ? 'loading' : 'ready');
  const saved = shallowRef<ReturnType<typeof toColumnPreferences>>([]);
  const confirmed = computed(() => mergeColumnSettings(defaults.value, saved.value));
  const tableKey = shallowRef(0);
  const activeWidth = shallowRef<WidthChange>();
  const pendingWidths = shallowRef<WidthChange[]>([]);
  const pendingCount = shallowRef(0);
  const saving = computed(() => pendingCount.value > 0);
  let session = 0;
  let disposed = false;
  let resetAfterDrag = false;

  const tableChecks = computed(() => {
    if (status.value === 'loading') return [];

    const widths = new Map(pendingWidths.value.map(item => [item.key, item.width]));
    if (activeWidth.value) widths.set(activeWidth.value.key, activeWidth.value.width);
    return confirmed.value.map(column => ({ ...column, width: widths.get(column.key) ?? column.width }));
  });

  function currentSession(expected: number, token: string) {
    return expected === session && token === authStore.token && token === getAuthorization();
  }

  async function reload() {
    if (!enabled) return;
    const expected = ++session;
    const token = authStore.token;
    status.value = 'loading';
    saved.value = [];
    activeWidth.value = undefined;
    pendingWidths.value = [];
    pendingCount.value = 0;
    resetAfterDrag = false;
    tableKey.value += 1;
    if (!authStore.userInfo.userId || !token) return;
    if (!currentSession(expected, token)) {
      status.value = 'failed';
      return;
    }

    try {
      await saveQueues.get(JSON.stringify([token, code]));
      if (disposed || !currentSession(expected, token)) return;
      const { data, error } = await fetchColumnConfig(code, token);
      if (disposed || !currentSession(expected, token)) return;
      if (error) {
        status.value = 'failed';
        return;
      }

      const decoded = decodeColumnConfig(data?.content ?? null);
      status.value = decoded.status;
      if (decoded.status === 'ready') saved.value = decoded.columns;
    } catch {
      if (!disposed && currentSession(expected, token)) status.value = 'failed';
    }
  }

  function enqueue(
    update: (columns: ColumnSetting[]) => ColumnSetting[],
    complete?: (ok: boolean) => void
  ): Promise<boolean> {
    const expected = session;
    const token = authStore.token;
    if (!enabled || !currentSession(expected, token)) return Promise.resolve(false);

    const queueKey = JSON.stringify([token, code]);
    pendingCount.value += 1;

    const job = (saveQueues.get(queueKey) ?? Promise.resolve()).then(async () => {
      if (!token || !currentSession(expected, token)) return false;

      const columns = update(confirmed.value);
      try {
        const { data, error } = await saveColumnConfig(code, serializeColumnSettings(columns), token);
        if (!currentSession(expected, token)) return false;
        if (error || !data) return false;

        saved.value = toColumnPreferences(columns);
        status.value = 'ready';
        return true;
      } catch {
        return false;
      }
    });

    const queued = job.then(ok => {
      if (saveQueues.get(queueKey) === queued) saveQueues.delete(queueKey);
      if (!currentSession(expected, token)) return;
      pendingCount.value -= 1;
      complete?.(ok);
    });
    saveQueues.set(queueKey, queued);
    return job;
  }

  function apply(columns: readonly ColumnSetting[], reset: boolean) {
    if (status.value !== 'ready' && !(status.value === 'invalid' && reset)) return Promise.resolve(false);

    return enqueue(
      current => {
        const widths = new Map((reset ? defaults.value : current).map(column => [column.key, column.width]));
        const preferences = toColumnPreferences(columns).map(column => ({ ...column, width: widths.get(column.key) }));
        return mergeColumnSettings(defaults.value, preferences);
      },
      ok => {
        if (ok && reset) tableKey.value += 1;
        if (!ok && !disposed) window.$message?.error($t('datatable.columnSaveFailed'));
      }
    );
  }

  const onUnstableColumnResize: NonNullable<DataTableProps['onUnstableColumnResize']> = (
    _width,
    limitedWidth,
    column,
    getColumnWidth
  ) => {
    if (status.value !== 'ready' || !currentSession(session, authStore.token) || !Number.isFinite(limitedWidth)) return;

    const key = String(column.key);
    const setting = confirmed.value.find(item => item.key === key && item.visible);
    if (!setting) return;
    const start = activeWidth.value?.key === key ? activeWidth.value.start : getColumnWidth(column.key);
    if (start === undefined) return;

    activeWidth.value = { key, start: Math.round(start), width: clampColumnWidth(limitedWidth, setting) };
  };

  function finishResize() {
    const change = activeWidth.value;
    activeWidth.value = undefined;
    if (resetAfterDrag) {
      tableKey.value += 1;
      resetAfterDrag = false;
    }
    if (
      !change ||
      change.width === change.start ||
      status.value !== 'ready' ||
      !currentSession(session, authStore.token)
    ) {
      return;
    }

    pendingWidths.value = [...pendingWidths.value, change];
    void enqueue(
      columns => columns.map(column => (column.key === change.key ? { ...column, width: change.width } : column)),
      ok => {
        pendingWidths.value = pendingWidths.value.filter(item => item !== change);
        if (ok) return;
        if (!pendingWidths.value.some(item => item.key === change.key)) {
          if (activeWidth.value) resetAfterDrag = true;
          else tableKey.value += 1;
        }
        if (!disposed) window.$message?.error($t('datatable.columnSaveFailed'));
      }
    );
  }

  function cancelResize() {
    if (activeWidth.value) tableKey.value += 1;
    activeWidth.value = undefined;
    resetAfterDrag = false;
  }

  if (enabled) {
    useEventListener(window, 'mouseup', finishResize);
    useEventListener(window, 'blur', cancelResize);
    useEventListener(window, 'storage', event => {
      if (event.storageArea === window.localStorage && authStore.token !== getAuthorization()) void reload();
    });
    watch(() => [authStore.userInfo.userId, authStore.token], reload, { immediate: true });
  }
  onScopeDispose(() => {
    disposed = true;
  });

  const columnSettings: TableColumnSettings = reactive({
    columns: confirmed,
    defaults,
    status,
    saving,
    reload,
    apply
  });

  return { columnSettings, tableChecks, tableKey, onUnstableColumnResize };
}
