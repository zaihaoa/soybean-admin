import { normalizePage } from '@/utils/system-manage';
import { request } from '../request';

export async function fetchCommonLogPage(data: Api.CommonLog.SearchParams) {
  const response = await request<Api.Common.PaginatingQueryRecord<Api.CommonLog.Entry>>({
    url: '/common-log/page',
    method: 'post',
    data
  });
  if (response.error) return response;
  return { ...response, data: normalizePage(response.data) };
}
