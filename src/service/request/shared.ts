import { localStg } from '@/utils/storage';
import type { RequestInstanceState } from './type';

export function getAuthorization() {
  return localStg.get('token') || undefined;
}

export function showErrorMsg(state: RequestInstanceState, message: string) {
  if (state.errMsgStack.includes(message)) return;
  state.errMsgStack.push(message);
  window.$message?.error(message, {
    onLeave: () => {
      state.errMsgStack = state.errMsgStack.filter(msg => msg !== message);
    }
  });
}
