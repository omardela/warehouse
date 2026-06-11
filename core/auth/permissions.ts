export function hasPermission(permissions: string[], code: string): boolean {
  return permissions.includes(code);
}
