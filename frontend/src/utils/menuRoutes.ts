export type MenuTreeNode = {
  path: string
  children?: MenuTreeNode[]
}

export function flattenMenuPaths(nodes: MenuTreeNode[]): string[] {
  const out: string[] = []
  const walk = (n: MenuTreeNode) => {
    if (!n.path.startsWith("__")) {
      out.push(n.path)
    }
    for (const c of n.children ?? []) walk(c)
  }
  for (const n of nodes) walk(n)
  return out
}

/** True if pathname is allowed by menu paths (prefix match for nested routes). */
export function isPathAllowedByMenus(
  pathname: string,
  paths: Set<string>,
): boolean {
  if (paths.size === 0) return true
  for (const p of paths) {
    if (p === "/") {
      if (pathname === "/") return true
      continue
    }
    if (pathname === p || pathname.startsWith(`${p}/`)) return true
  }
  return false
}
