import { normalizePage } from '@/utils/system-manage';
import { request } from '../request';

export async function fetchUserPage(data: Api.SystemManage.UserSearch) {
  const response = await request<Api.Common.PaginatingQueryRecord<Api.SystemManage.User>>({
    url: '/user/page',
    method: 'post',
    data
  });
  if (response.error) return response;
  return { ...response, data: normalizePage(response.data) };
}
export function fetchUserDetail(id: string) {
  return request<Api.SystemManage.User | null>({ url: '/user/detail', method: 'post', data: { id } });
}
export function fetchAddUser(data: Api.SystemManage.UserWrite & Api.SystemManage.PasswordWrite) {
  return request<string>({ url: '/user/add', method: 'post', data });
}
export function fetchUpdateUser(data: Api.SystemManage.UserWrite & { id: string }) {
  return request<boolean>({ url: '/user/update', method: 'put', data });
}
export function fetchDeleteUser(id: string) {
  return request<boolean>({ url: '/user/delete', method: 'delete', data: { id } });
}
export function fetchUpdateUserStatus(id: string, status: Api.SystemManage.UserStatus) {
  return request<boolean>({ url: '/user/update-status', method: 'post', data: { id, status } });
}
export function fetchResetUserPassword(id: string, data: Api.SystemManage.PasswordWrite) {
  return request<boolean>({ url: '/user/reset-password', method: 'post', data: { id, ...data } });
}
export async function fetchRolePage(data: Api.SystemManage.RoleSearch) {
  const response = await request<Api.Common.PaginatingQueryRecord<Api.SystemManage.Role>>({
    url: '/role/page',
    method: 'post',
    data
  });
  if (response.error) return response;
  return { ...response, data: normalizePage(response.data) };
}
export function fetchRoleDetail(id: string) {
  return request<Api.SystemManage.RoleDetail | null>({ url: '/role/detail', params: { id } });
}
export function fetchAddRole(data: Api.SystemManage.RoleWrite) {
  return request<string>({ url: '/role/add', method: 'post', data });
}
export function fetchUpdateRole(data: Api.SystemManage.RoleWrite & { id: string }) {
  return request<boolean>({ url: '/role/update', method: 'put', data });
}
export function fetchUpdateRoleStatus(id: string, status: Api.SystemManage.Status) {
  return request<boolean>({ url: '/role/update-status', method: 'post', data: { id, status } });
}
export function fetchDeleteRole(id: string) {
  return request<boolean>({ url: '/role/delete', method: 'delete', data: { id } });
}
export function fetchAuthorizeRole(roleId: string, grant: Api.SystemManage.RoleAuthorization) {
  return request<boolean>({ url: '/role/authorize', method: 'put', data: { roleId, ...grant } });
}
export function fetchAuthorizeRoleAll(
  roleId: string,
  permissionFlag: Api.SystemManage.RolePermissionFlag,
  authorized: boolean
) {
  return request<boolean>({ url: '/role/authorize-all', method: 'put', data: { roleId, permissionFlag, authorized } });
}
export function fetchFieldPermissionConstants() {
  return request<Api.SystemManage.FieldPermissionGroup[]>({ url: '/role/field-permission-constants' });
}
export async function fetchUserAuthorizePage(data: Api.SystemManage.UserAuthorizationSearch) {
  const response = await request<Api.Common.PaginatingQueryRecord<Api.SystemManage.UserAuthorizationRow>>({
    url: '/user/authorize-page',
    method: 'post',
    data: { ...data, sort: 'id', order: 'ASC' }
  });
  if (response.error) return response;
  return { ...response, data: normalizePage(response.data) };
}
export function fetchMenuTree() {
  return request<Api.SystemManage.Menu[]>({ url: '/menu/menu-tree' });
}
export function fetchMenuDetail(id: string) {
  return request<Api.SystemManage.Menu | null>({ url: '/menu/detail', method: 'post', data: { id } });
}
export function fetchAddMenu(data: Api.SystemManage.MenuWrite) {
  return request<string>({ url: '/menu/add', method: 'post', data });
}
export function fetchUpdateMenu(data: Api.SystemManage.MenuWrite & { id: string }) {
  return request<boolean>({ url: '/menu/update', method: 'put', data });
}
export function fetchDeleteMenu(id: string) {
  return request<boolean>({ url: '/menu/delete', method: 'delete', data: { id } });
}
