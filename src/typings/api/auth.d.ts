declare namespace Api {
  /**
   * namespace Auth
   *
   * backend api module: "auth"
   */
  namespace Auth {
    interface LoginToken {
      token: string;
      userId: string;
      username: string;
      name: string;
    }

    interface AuthorizedMenu {
      routeName: string;
      parentId?: string | null;
      menuName?: string | null;
      menuType?: SystemManage.MenuType | null;
      menuGroupName?: string | null;
      status?: SystemManage.Status | null;
      sortNumber?: number | null;
      hideRoute?: boolean | null;
      icon?: string | null;
      iconType?: SystemManage.IconTypeResponse;
      children?: AuthorizedMenu[] | null;
    }

    interface CurrentUserInfo {
      userId?: string;
      id?: string;
      username: string;
      name?: string | null;
      roles?: SystemManage.UserRole[] | null;
      authMenuList?: AuthorizedMenu[] | null;
      authMenuPermissionList?: string[] | null;
      adminUser?: boolean;
      adminRole?: boolean;
    }

    interface UserInfo {
      userId: string;
      userName: string;
      roles: string[];
      buttons: string[];
      authMenuList: AuthorizedMenu[];
    }
  }
}
