export interface DeleteNode {
  id: string;
  children?: DeleteNode[];
}

export function normalizeMenuIconType(iconType?: Api.SystemManage.IconTypeResponse): Api.SystemManage.IconType {
  return iconType === 'LOCAL' || iconType === '2' ? 'LOCAL' : 'ICONIFY';
}

export function normalizePage<T>(page: { current: number; size: number; total: number; records?: T[] | null }) {
  return { ...page, records: page.records ?? [] };
}

/** Keep a parent whenever any descendant is unselected or fails to delete. */
export async function deleteRecords(ids: string[], remove: (id: string) => Promise<boolean>, tree?: DeleteNode[]) {
  const result = { deleted: [] as string[], failed: [] as string[], blocked: [] as string[] };
  const selected = new Set(ids);
  const deleted = new Set<string>();
  const ordered: DeleteNode[] = [];
  function visit(nodes: DeleteNode[]) {
    for (const node of nodes) {
      visit(node.children || []);
      if (selected.has(node.id)) ordered.push(node);
    }
  }
  function descendantsDeleted(node: DeleteNode): boolean {
    return (node.children || []).every(child => deleted.has(child.id) && descendantsDeleted(child));
  }
  visit(tree ?? ids.map(id => ({ id })));
  for (const node of ordered) {
    if (!descendantsDeleted(node)) {
      result.blocked.push(node.id);
      continue;
    }
    try {
      if (await remove(node.id)) {
        result.deleted.push(node.id);
        deleted.add(node.id);
      } else {
        result.failed.push(node.id);
      }
    } catch {
      result.failed.push(node.id);
    }
  }
  const known = new Set(ordered.map(node => node.id));
  result.blocked.push(...ids.filter(id => !known.has(id)));
  return result;
}
