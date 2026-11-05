import { computed, effectScope, onScopeDispose, reactive, shallowRef, watch } from 'vue';
import type { Ref, VNodeChild } from 'vue';
import type { PaginationProps } from 'naive-ui';
import type { FlatResponseData } from '@sa/axios';
import { useBoolean, useTable } from '@sa/hooks';
import type { PaginationData, UseTableOptions } from '@sa/hooks';
import { jsonClone } from '@sa/utils';
import { $t } from '@/locales';
import { useAppStore } from '@/store/modules/app';
import { MAX_COLUMN_WIDTH } from './table-column-config';
import type { ColumnSetting } from './table-column-config';
import { useTableColumnSettings } from './use-table-column-settings';

export type UseNaiveTableOptions<ResponseData, ApiData, Pagination extends boolean> = Omit<
  UseTableOptions<ResponseData, ApiData, NaiveUI.TableColumn<ApiData>, Pagination>,
  'pagination' | 'getColumnChecks' | 'getColumns'
> & {
  /**
   * get column visible
   *
   * @param column
   *
   * @default true
   *
   * @returns true if the column is visible, false otherwise
   */
  getColumnVisible?: (column: NaiveUI.TableColumn<ApiData>) => boolean;
  /** Stable page or list identifier for the signed-in user's settings. */
  columnConfigCode: string;
  columnSettingsEnabled?: boolean;
  requiredColumnKeys?: readonly string[];
  /** Configurable columns shown by default, in the order of the column definitions. */
  defaultColumnKeys?: readonly string[];
};

type ColumnCheckOptions<ApiData> = Pick<
  UseNaiveTableOptions<unknown, ApiData, boolean>,
  'getColumnVisible' | 'requiredColumnKeys' | 'defaultColumnKeys'
>;

const SELECTION_KEY = '__selection__';

const EXPAND_KEY = '__expand__';

export const EMPTY_TABLE_CELL = '--';

export function renderTableCell(value: VNodeChild): VNodeChild {
  return value == null || (typeof value === 'string' && !value.trim()) ? EMPTY_TABLE_CELL : value;
}

export function useNaiveTable<ResponseData, ApiData>(options: UseNaiveTableOptions<ResponseData, ApiData, false>) {
  const result = useTable<ResponseData, ApiData, NaiveUI.TableColumn<ApiData>, false>({
    ...options,
    getColumnChecks: cols => getColumnChecks(cols, options),
    getColumns
  });

  return { ...result, ...useColumnProjection(options) };
}

function useColumnProjection<ApiData>(
  options: ColumnCheckOptions<ApiData> &
    Pick<UseNaiveTableOptions<unknown, ApiData, boolean>, 'columns' | 'columnConfigCode' | 'columnSettingsEnabled'>
) {
  const definitions = computed(options.columns);
  const defaults = computed(() => getColumnChecks(definitions.value, options));
  const { columnSettings, tableChecks, tableKey, onUnstableColumnResize } = useTableColumnSettings(
    options.columnConfigCode,
    defaults,
    options.columnSettingsEnabled
  );
  const columnTableProps = computed(() => {
    const resizeEnabled = options.columnSettingsEnabled !== false && columnSettings.status === 'ready';
    const columns = getColumns(definitions.value, tableChecks.value, resizeEnabled);
    const scrollX = columns.reduce((total, column) => {
      const minWidth = 'minWidth' in column ? numericWidth(column.minWidth) : undefined;
      return total + (numericWidth(column.width) ?? minWidth ?? 120);
    }, 0);

    return { columns, scrollX, onUnstableColumnResize, renderCell: renderTableCell };
  });

  return { columnSettings, tableKey, columnTableProps };
}

type PaginationParams = Pick<PaginationProps, 'page' | 'pageSize'>;

type UseNaivePaginatedTableOptions<ResponseData, ApiData> = UseNaiveTableOptions<ResponseData, ApiData, true> & {
  paginationProps?: Omit<PaginationProps, 'page' | 'itemCount'>;
  /**
   * whether to show the total count of the table
   *
   * @default true
   */
  showTotal?: boolean;
  onPaginationParamsChange?: (params: PaginationParams) => void | Promise<void>;
};

export function useNaivePaginatedTable<ResponseData, ApiData>(
  options: UseNaivePaginatedTableOptions<ResponseData, ApiData>
) {
  const scope = effectScope();
  const appStore = useAppStore();

  const isMobile = computed(() => appStore.isMobile);

  const showTotal = computed(() => options.showTotal ?? true);

  const pagination = reactive({
    page: 1,
    pageSize: 10,
    itemCount: 0,
    showSizePicker: true,
    pageSizes: [10, 15, 20, 25, 30],
    prefix: showTotal.value ? page => $t('datatable.itemCount', { total: page.itemCount }) : undefined,
    onUpdatePage(page) {
      pagination.page = page;
    },
    onUpdatePageSize(pageSize) {
      pagination.pageSize = pageSize;
      pagination.page = 1;
    },
    ...options.paginationProps
  }) as PaginationProps;

  // this is for mobile, if the system does not support mobile, you can use `pagination` directly
  const mobilePagination = computed(() => {
    const p: PaginationProps = {
      ...pagination,
      pageSlot: isMobile.value ? 3 : 9,
      prefix: !isMobile.value && showTotal.value ? pagination.prefix : undefined
    };

    return p;
  });

  const paginationParams = computed(() => {
    const { page, pageSize } = pagination;

    return {
      page,
      pageSize
    };
  });

  const result = useTable<ResponseData, ApiData, NaiveUI.TableColumn<ApiData>, true>({
    ...options,
    pagination: true,
    getColumnChecks: cols => getColumnChecks(cols, options),
    getColumns,
    onFetched: data => {
      pagination.itemCount = data.total;
      pagination.pageSize = data.pageSize;
    }
  });

  async function getDataByPage(page: number = 1) {
    if (page !== pagination.page) {
      pagination.page = page;

      return;
    }

    await result.getData();
  }

  scope.run(() => {
    watch(paginationParams, async newVal => {
      await options.onPaginationParamsChange?.(newVal);

      await result.getData();
    });
  });

  onScopeDispose(() => {
    scope.stop();
  });

  return {
    ...result,
    ...useColumnProjection(options),
    getDataByPage,
    pagination,
    mobilePagination
  };
}

export function useTableOperate<TableData>(
  data: Ref<TableData[]>,
  idKey: keyof TableData,
  getData: () => Promise<void>
) {
  const { bool: drawerVisible, setTrue: openDrawer, setFalse: closeDrawer } = useBoolean();

  const operateType = shallowRef<NaiveUI.TableOperateType>('add');

  function handleAdd() {
    operateType.value = 'add';
    openDrawer();
  }

  /** the editing row data */
  const editingData = shallowRef<TableData | null>(null);

  function handleEdit(id: TableData[keyof TableData]) {
    operateType.value = 'edit';
    const findItem = data.value.find(item => item[idKey] === id) || null;
    editingData.value = jsonClone(findItem);

    openDrawer();
  }

  /** the checked row keys of table */
  const checkedRowKeys = shallowRef<string[]>([]);

  /** the hook after the batch delete operation is completed */
  async function onBatchDeleted() {
    window.$message?.success($t('common.deleteSuccess'));

    checkedRowKeys.value = [];

    await getData();
  }

  /** the hook after the delete operation is completed */
  async function onDeleted() {
    window.$message?.success($t('common.deleteSuccess'));

    await getData();
  }

  return {
    drawerVisible,
    openDrawer,
    closeDrawer,
    operateType,
    handleAdd,
    editingData,
    handleEdit,
    checkedRowKeys,
    onBatchDeleted,
    onDeleted
  };
}

export function defaultTransform<ApiData>(
  response: FlatResponseData<any, Api.Common.PaginatingQueryRecord<ApiData>>
): PaginationData<ApiData> {
  const { data, error } = response;

  if (!error) {
    const { records, current, size, total } = data;

    return {
      data: records,
      pageNum: current,
      pageSize: size,
      total
    };
  }

  return {
    data: [],
    pageNum: 1,
    pageSize: 10,
    total: 0
  };
}

function numericWidth(value?: string | number) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^\d+(?:\.\d+)?px$/.test(value)) return Number.parseFloat(value);
  return undefined;
}

function getColumnChecks<ApiData>(
  cols: NaiveUI.TableColumn<ApiData>[],
  { getColumnVisible, requiredColumnKeys, defaultColumnKeys }: ColumnCheckOptions<ApiData>
): ColumnSetting[] {
  return cols.map(column => {
    if (isTableColumnHasKey(column)) {
      const key = String(column.key);
      const configurable = key !== 'operate' && (getColumnVisible?.(column) ?? true);
      const required = requiredColumnKeys?.includes(key) ?? false;
      return {
        key,
        title: column.title ?? key,
        checked: !configurable || required || (defaultColumnKeys?.includes(key) ?? true),
        fixed: configurable && column.fixed === 'right' ? 'left' : (column.fixed ?? 'unFixed'),
        visible: configurable,
        required,
        width: numericWidth(column.width),
        minWidth: 'minWidth' in column ? numericWidth(column.minWidth) : undefined,
        maxWidth: 'maxWidth' in column ? numericWidth(column.maxWidth) : undefined
      };
    }

    const selection = column.type === 'selection';
    return {
      key: selection ? SELECTION_KEY : EXPAND_KEY,
      title: $t(selection ? 'common.check' : 'common.expandColumn'),
      checked: true,
      fixed: column.fixed ?? 'unFixed',
      visible: false
    };
  });
}

function getColumns<Column extends NaiveUI.TableColumn<any>>(
  cols: Column[],
  checks: readonly ColumnSetting[],
  resizeEnabled = false
): Column[] {
  const columnMap = new Map(
    cols.map(column => [
      isTableColumnHasKey(column) ? String(column.key) : column.type === 'selection' ? SELECTION_KEY : EXPAND_KEY,
      column
    ])
  );

  const orderedChecks = [
    ...checks.filter(check => !check.visible && check.fixed !== 'right'),
    ...checks.filter(check => check.visible && check.fixed === 'left'),
    ...checks.filter(check => check.visible && check.fixed === 'unFixed'),
    ...checks.filter(check => check.fixed === 'right')
  ];

  return orderedChecks.flatMap(check => {
    const column = columnMap.get(check.key);
    if (!column || !check.checked) return [];
    if (!check.visible) return [column];

    return [
      {
        ...column,
        width: check.width ?? column.width ?? (check.fixed !== 'unFixed' ? (check.minWidth ?? 120) : undefined),
        minWidth: check.minWidth ?? 48,
        maxWidth: Math.max(check.minWidth ?? 48, Math.min(check.maxWidth ?? MAX_COLUMN_WIDTH, MAX_COLUMN_WIDTH)),
        fixed: check.fixed === 'unFixed' ? undefined : check.fixed,
        resizable: resizeEnabled
      }
    ];
  });
}

export function isTableColumnHasKey<T>(column: NaiveUI.TableColumn<T>): column is NaiveUI.TableColumnWithKey<T> {
  return 'key' in column;
}
