import { useAuthStore } from '@/store/modules/auth';

export function useAuth() {
  const authStore = useAuthStore();

  function hasAuth(codes: string | string[]) {
    if (!authStore.isLogin) {
      return false;
    }

    const requested = typeof codes === 'string' ? [codes] : codes;
    const { buttons } = authStore.userInfo;
    const isAdmin = buttons.includes('*');
    return requested.some(code => isAdmin || buttons.includes(code));
  }

  return {
    hasAuth
  };
}
