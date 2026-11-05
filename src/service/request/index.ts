import type { AxiosResponse } from 'axios';
import { BACKEND_ERROR_CODE, createFlatRequest, createRequest } from '@sa/axios';
import { getServiceBaseURL } from '@/utils/service';
import { localStg } from '@/utils/storage';
import { useAuthStore } from '@/store/modules/auth';
import { getAuthorization, showErrorMsg } from './shared';
import { isCurrentSessionToken, parseSystemResponse } from './response';
import type { RequestInstanceState } from './type';

const isHttpProxy = import.meta.env.DEV && import.meta.env.VITE_HTTP_PROXY === 'Y';
const { baseURL, otherBaseURL } = getServiceBaseURL(import.meta.env, isHttpProxy);

export const request = createFlatRequest(
  {
    baseURL,
    transformResponse: [value => (typeof value === 'string' && value ? parseSystemResponse(value) : value)]
  },
  {
    defaultState: { errMsgStack: [] } as RequestInstanceState,
    transform(response: AxiosResponse<App.Service.Response<any>>) {
      return response.data.data;
    },
    onRequest(config) {
      config.headers.set('W-Token', getAuthorization(), false);
      return config;
    },
    isBackendSuccess(response) {
      return response.data.code === 0;
    },
    async onBackendFail() {
      return null;
    },
    onError(error) {
      if (error.code === 'ERR_CANCELED') return;
      const code = error.response?.data?.code;
      if (error.response?.status === 401 || code === 401) {
        if (isCurrentSessionToken(error.config?.headers?.['W-Token'], localStg.get('token'))) {
          void useAuthStore().resetStore();
        } else if (!localStg.get('token')) {
          showErrorMsg(request.state, error.response?.data?.message || error.message);
        }
        return;
      }
      const message = error.response?.data?.message || error.message;
      showErrorMsg(request.state, message);
    }
  }
);

export const demoRequest = createRequest(
  {
    baseURL: otherBaseURL.demo
  },
  {
    transform(response: AxiosResponse<App.Service.DemoResponse>) {
      return response.data.result;
    },
    async onRequest(config) {
      const { headers } = config;

      // set token
      const token = localStg.get('token');
      const Authorization = token ? `Bearer ${token}` : null;
      Object.assign(headers, { Authorization });

      return config;
    },
    isBackendSuccess(response) {
      // when the backend response code is "200", it means the request is success
      // you can change this logic by yourself
      return response.data.status === '200';
    },
    async onBackendFail(_response) {
      // when the backend response code is not "200", it means the request is fail
      // for example: the token is expired, refresh token and retry request
    },
    onError(error) {
      // when the request is fail, you can show error message

      let message = error.message;

      // show backend error message
      if (error.code === BACKEND_ERROR_CODE) {
        message = error.response?.data?.message || message;
      }

      window.$message?.error(message);
    }
  }
);
