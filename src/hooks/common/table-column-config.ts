import type { TableColumnCheck } from '@sa/hooks';

export const MAX_FIXED_COLUMNS = 7;
export const MAX_COLUMN_WIDTH = 1200;

export interface ColumnSetting extends TableColumnCheck {
  required?: boolean;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
}

interface ColumnPreference {
  key: string;
  visible: boolean;
  fixed?: 'left' | 'right' | null;
  width?: number;
}

type DecodedConfig = { status: 'ready'; columns: ColumnPreference[] } | { status: 'invalid' | 'unsupported' };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function decodeColumnConfig(content: string | null): DecodedConfig {
  if (content === null) return { status: 'ready', columns: [] };

  try {
    const value: unknown = JSON.parse(content);
    if (!isRecord(value)) return { status: 'invalid' };
    if (typeof value.version === 'number' && value.version > 1) return { status: 'unsupported' };
    if (value.version !== 1 || !Array.isArray(value.columns)) return { status: 'invalid' };

    const columns = value.columns.flatMap((item: unknown): ColumnPreference[] => {
      if (!isRecord(item) || typeof item.key !== 'string' || typeof item.visible !== 'boolean') return [];

      const { key, visible, fixed, width } = item;
      return [
        {
          key,
          visible,
          fixed: fixed === 'left' || fixed === 'right' || fixed === null ? fixed : undefined,
          width: typeof width === 'number' ? width : undefined
        }
      ];
    });
    return { status: 'ready', columns };
  } catch {
    return { status: 'invalid' };
  }
}

export function clampColumnWidth(width: number, column: ColumnSetting): number {
  const minimum = column.minWidth ?? 48;
  const maximum = Math.max(minimum, Math.min(column.maxWidth ?? MAX_COLUMN_WIDTH, MAX_COLUMN_WIDTH));
  return Math.min(maximum, Math.max(minimum, Math.round(width)));
}

export function orderLeftFixedColumns(columns: readonly ColumnSetting[]): ColumnSetting[] {
  return [...columns.filter(column => column.fixed === 'left'), ...columns.filter(column => column.fixed !== 'left')];
}

export function mergeColumnSettings(
  defaults: readonly ColumnSetting[],
  saved: readonly ColumnPreference[]
): ColumnSetting[] {
  const configurable = defaults.filter(column => column.visible);
  const savedByKey = new Map<string, ColumnPreference>();
  saved.forEach(item => {
    if (!savedByKey.has(item.key)) savedByKey.set(item.key, item);
  });
  const definitions = new Map(configurable.map(column => [column.key, column]));
  const orderedKeys = new Set([...savedByKey.keys(), ...definitions.keys()]);
  let pinned = 0;
  const columns = Array.from(orderedKeys).flatMap((key): ColumnSetting[] => {
    const column = definitions.get(key);
    if (!column) return [];

    const preference = savedByKey.get(key);
    const checked = column.required || (preference?.visible ?? column.checked);
    const desiredFixed = preference?.fixed === null ? 'unFixed' : (preference?.fixed ?? column.fixed);
    const fixed = checked && desiredFixed !== 'unFixed' && pinned < MAX_FIXED_COLUMNS ? 'left' : 'unFixed';
    if (fixed === 'left') pinned += 1;

    const width = preference?.width;
    return [
      {
        ...column,
        checked,
        fixed,
        width:
          typeof width === 'number' && Number.isFinite(width) && width > 0
            ? clampColumnWidth(width, column)
            : column.width
      }
    ];
  });

  return [
    ...defaults.filter(column => !column.visible && column.fixed !== 'right'),
    ...orderLeftFixedColumns(columns),
    ...defaults.filter(column => !column.visible && column.fixed === 'right')
  ];
}

export function toColumnPreferences(columns: readonly ColumnSetting[]): ColumnPreference[] {
  return columns
    .filter(column => column.visible)
    .map(column => ({
      key: column.key,
      visible: column.checked,
      fixed: column.fixed === 'unFixed' ? null : 'left',
      width: column.width
    }));
}

export function serializeColumnSettings(columns: readonly ColumnSetting[]): string {
  return JSON.stringify({ version: 1, columns: toColumnPreferences(columns) });
}
