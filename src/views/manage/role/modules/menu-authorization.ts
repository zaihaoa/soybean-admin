export interface MenuAuthorizationNode {
  id: string;
  menuName: string;
  button?: readonly Api.SystemManage.MenuButton[] | null;
  children?: readonly MenuAuthorizationNode[] | null;
}

export interface MenuAuthorizationSelection {
  menuIds: string[];
  buttonCodes: string[];
}

interface MenuAuthorizationRow {
  id: string;
  name: string;
  depth: number;
  buttons: Api.SystemManage.MenuButton[];
}

function getButtons(node: MenuAuthorizationNode): Api.SystemManage.MenuButton[] {
  const buttons = node.button ?? [];
  return buttons.filter(
    (button, index) =>
      button?.code &&
      button.code === button.code.trim() &&
      button.code.length <= 200 &&
      !button.code.includes('*') &&
      buttons.findIndex(item => item?.code === button.code) === index
  );
}

function toRow(node: MenuAuthorizationNode, depth: number): MenuAuthorizationRow {
  return { id: node.id, name: node.menuName, depth, buttons: getButtons(node) };
}

export function createMenuAuthorization(tree: readonly MenuAuthorizationNode[]) {
  const branches = new Map<string, MenuAuthorizationRow[]>();
  const ancestors = new Map<string, string[]>();

  function visit(node: MenuAuthorizationNode, depth: number, parents: string[]): MenuAuthorizationRow[] {
    const rows = [
      toRow(node, depth),
      ...(node.children ?? []).flatMap(child => visit(child, depth + 1, [...parents, node.id]))
    ];
    branches.set(node.id, rows);
    ancestors.set(node.id, parents);
    return rows;
  }

  const groups = tree.map(node => {
    const rows = visit(node, 0, []);
    const [root] = rows;
    return { root, rows: rows.length > 1 && !root.buttons.length ? rows.slice(1) : rows };
  });

  return { groups, branches, ancestors };
}

type MenuAuthorization = ReturnType<typeof createMenuAuthorization>;

export function normalizeMenuAuthorization(
  model: MenuAuthorization,
  selection: MenuAuthorizationSelection
): MenuAuthorizationSelection {
  const menuIds = [...new Set(selection.menuIds)].filter(id => model.branches.has(id));
  const available = new Set(
    menuIds.flatMap(id => model.branches.get(id)?.[0].buttons.map(button => button.code) ?? [])
  );
  return { menuIds, buttonCodes: [...new Set(selection.buttonCodes)].filter(code => available.has(code)) };
}

export function getMenuAuthorizationState(
  model: MenuAuthorization,
  selection: { menuIds: ReadonlySet<string>; buttonCodes: ReadonlySet<string> },
  id: string
): { checked: boolean; indeterminate: boolean } {
  const rows = model.branches.get(id) ?? [];
  const { menuIds, buttonCodes } = selection;
  const checked =
    rows.length > 0 &&
    rows.every(row => menuIds.has(row.id) && row.buttons.every(button => buttonCodes.has(button.code)));
  return { checked, indeterminate: !checked && rows.some(row => menuIds.has(row.id)) };
}

export function setMenuAuthorizationBranch(
  model: MenuAuthorization,
  selection: MenuAuthorizationSelection,
  id: string,
  checked: boolean
): MenuAuthorizationSelection {
  const rows = model.branches.get(id) ?? [];
  const branchIds = new Set(rows.map(row => row.id));
  if (!checked) {
    return normalizeMenuAuthorization(model, {
      menuIds: selection.menuIds.filter(menuId => !branchIds.has(menuId)),
      buttonCodes: selection.buttonCodes
    });
  }
  return normalizeMenuAuthorization(model, {
    menuIds: [...selection.menuIds, ...(model.ancestors.get(id) ?? []), ...branchIds],
    buttonCodes: [...selection.buttonCodes, ...rows.flatMap(row => row.buttons.map(button => button.code))]
  });
}

export function setMenuAuthorizationButton(
  model: MenuAuthorization,
  selection: MenuAuthorizationSelection,
  id: string,
  code: string,
  checked: boolean
): MenuAuthorizationSelection {
  return normalizeMenuAuthorization(model, {
    menuIds: checked ? [...selection.menuIds, ...(model.ancestors.get(id) ?? []), id] : selection.menuIds,
    buttonCodes: checked ? [...selection.buttonCodes, code] : selection.buttonCodes.filter(item => item !== code)
  });
}
