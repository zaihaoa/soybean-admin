import type { MenuGroupOption } from 'naive-ui';

export function groupMenuChildren(parent: App.Global.Menu): Array<App.Global.Menu | MenuGroupOption> {
  const groups = new Map<string, App.Global.Menu[]>();
  const ungrouped: App.Global.Menu[] = [];

  parent.children?.forEach(menu => {
    const name = menu.menuGroupName?.trim();
    if (!name) {
      ungrouped.push(menu);
      return;
    }

    const children = groups.get(name);
    if (children) {
      children.push(menu);
    } else {
      groups.set(name, [menu]);
    }
  });

  const groupedOptions = Array.from(groups, ([label, children]): MenuGroupOption => ({
    type: 'group',
    key: `menu-group:${parent.key}:${label}`,
    label,
    children
  }));

  return [...groupedOptions, ...ungrouped];
}
