import { request } from '../request';

interface ColumnConfigRecord {
  id: string;
  userId: string;
  type: 'CUSTOM_COLUMN';
  code: string;
  content: string;
}

export function fetchColumnConfig(code: string, token: string) {
  return request<ColumnConfigRecord | null>({
    url: '/user-config/detail',
    method: 'post',
    headers: { 'W-Token': token },
    data: { type: 'CUSTOM_COLUMN', code }
  });
}

export function saveColumnConfig(code: string, content: string, token: string) {
  return request<ColumnConfigRecord>({
    url: '/user-config/add-or-update',
    method: 'post',
    headers: { 'W-Token': token },
    data: { type: 'CUSTOM_COLUMN', code, content }
  });
}
