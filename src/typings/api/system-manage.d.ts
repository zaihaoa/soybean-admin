declare namespace Api {
  namespace SystemManage {
    type Id = string;
    type Status = 'ENABLED' | 'DISABLED';
    type UserStatus = 'ENABLED' | 'DISABLE';
    type UserType = 'SYSTEM' | 'NORMAL';
    type RoleType = 'NORMAL' | 'BUILT_IN';
    type MenuType = 'DIRECTORY' | 'MENU';
    type IconType = 'ICONIFY' | 'LOCAL';
    type IconTypeResponse = IconType | '1' | '2' | '' | null;
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
    interface TableSort<Field extends string> {
      sort: Field;
      order: 'ASC' | 'DESC';
    }
    type UserSort = TableSort<'username' | 'name' | 'status' | 'phone' | 'email' | 'createUserId' | 'createTime'>;
    interface UserSearch extends Common.CommonSearchParams, Partial<UserSort> {
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
      buttonCodes?: string[];
      dataUserIds: Id[];
    }
    type RolePermissionFlag = 'ALL_MENU_PERMISSION' | 'ALL_FIELD_PERMISSION' | 'ALL_DATA_USER_PERMISSION';
    type UserAuthorizationOperation = import('@/enum').RoleAuthorizationOperation;
    type RoleAuthorization =
      | { type: 'MENU'; relevanceIds: Id[]; relevanceValues: string[] }
      | { type: 'FIELD' | 'BUTTON'; relevanceValues: string[] }
      | { type: 'DATA_USER'; relevanceIds: Id[]; operation: UserAuthorizationOperation };
    interface FieldPermissionGroup {
      groupName: string;
      items: { code: string; label: string }[];
    }
    interface UserAuthorizationRow {
      userId: Id;
      username: string;
      name: string;
      status: UserStatus;
      statusDesc?: string;
    }
    interface UserAuthorizationSearch extends Common.CommonSearchParams {
      roleId: Id;
      authorized: boolean;
      username?: string | null;
      name?: string | null;
      status?: UserStatus | null;
    }
    type RoleSort = TableSort<'name' | 'code' | 'type' | 'status' | 'remark' | 'createUserId' | 'createTime'>;
    interface RoleSearch extends Common.CommonSearchParams, Partial<RoleSort> {
      name?: string | null;
      code?: string | null;
      status?: Status | null;
      type?: RoleType | null;
    }
    type RoleWrite = Pick<Role, 'name' | 'code' | 'remark'>;
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
      menuGroupName?: string | null;
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
    interface Menu extends Omit<MenuWrite, 'iconType'>, Audit {
      id: Id;
      iconType?: IconTypeResponse;
      menuTypeDesc?: string;
      children?: Menu[];
    }
  }
}
