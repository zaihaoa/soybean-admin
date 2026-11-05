import { request } from '../request';

export function fetchLogin(username: string, password: string) {
  return request<Api.Auth.LoginToken>({ url: '/login', method: 'post', data: { username, password } });
}

export function fetchGetUserInfo() {
  return request<Api.Auth.CurrentUserInfo>({ url: '/user/current-user-info' });
}

export function fetchLogout() {
  return request<boolean>({ url: '/logout', method: 'post' });
}
