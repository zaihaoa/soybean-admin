declare namespace Api {
  namespace CommonLog {
    type BusinessType = 'USER' | 'ROLE' | 'MENU';

    interface SearchParams extends Common.CommonSearchParams {
      businessType: BusinessType;
      businessKey: string;
    }

    interface Entry {
      id: string;
      operationType: string | null;
      createUserName: string | null;
      createTime: string | null;
      content: string | null;
    }
  }
}
