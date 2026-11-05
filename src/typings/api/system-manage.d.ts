declare namespace Api {
  namespace SystemManage {
    type Id = string;
    type Status = 'ENABLED' | 'DISABLED';
    type UserStatus = 'NORMAL' | 'DISABLE';
    type UserType = 'SYSTEM' | 'NORMAL';
    type RoleType = 'NORMAL' | 'BUILT_IN';
    type MenuType = 'DIRECTORY' | 'MENU';
    type IconType = '1' | '2';
    interface UserRole {
      ruleId: Id;
      ruleCode: string;
      ruleName: string;
    }
    interface Audit {
      createUserId?: Id;
      updateUserId?: Id;
      createUserName?: string;
      updateUserName?: string;
      createTime?: string;
      updateTime?: string;
    }
    interface User extends Audit {
      id: Id;
      username: string;
      name: string;
      phone?: string;
      email?: string;
      status: UserStatus;
      statusDesc?: string;
      type: UserType;
      typeDesc?: string;
      roles: UserRole[];
    }
    interface UserSearch extends Common.CommonSearchParams {
      username?: string | null;
      name?: string | null;
      phone?: string | null;
      email?: string | null;
      status?: UserStatus | null;
      type?: UserType | null;
    }
    interface UserWrite {
      username: string;
      name: string;
      phone: string;
      email: string;
      roleIds: Id[];
    }
    interface PasswordWrite {
      password: string;
      confirmPassword: string;
    }
    interface Role extends Audit {
      id: Id;
      name: string;
      code: string;
      remark: string;
      status: Status;
      type: RoleType;
      permissionFlag: string[];
    }
    interface RoleDetail extends Role {
      menuIds: Id[];
      fieldCodes: string[];
      dataUserIds: Id[];
    }
    interface RoleSearch extends Common.CommonSearchParams {
      name?: string | null;
      code?: string | null;
      status?: Status | null;
      type?: RoleType | null;
    }
    type RoleWrite = Pick<Role, 'name' | 'code' | 'remark' | 'status' | 'type' | 'permissionFlag'>;
    interface MenuRouteParam {
      param: string;
      value: string;
    }
    interface MenuButton {
      code: string;
      label: string;
    }
    interface MenuWrite {
      menuType: MenuType;
      menuName: string;
      status: Status;
      parentId: Id;
      routeName: string;
      routePath: string;
      routePathParam: string;
      permission: string;
      layout: string | null;
      component: string | null;
      i18nKey: string;
      sortNumber: number;
      iconType: IconType;
      icon: string;
      cacheRoute: boolean;
      constantRoute: boolean;
      hideRoute: boolean;
      highlightRouteName: string;
      externalLink: string;
      routeParam: MenuRouteParam[];
      button: MenuButton[];
    }
    interface Menu extends MenuWrite, Audit {
      id: Id;
      menuTypeDesc?: string;
      children?: Menu[];
    }
  }
}
