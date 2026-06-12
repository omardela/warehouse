export const OWNER_ROLE_NAME = "Owner" as const;

/**
 * Returns true when the given RoleTemplate name belongs to the
 * system-protected Owner role.  Call this instead of inlining the
 * string literal so there is exactly one place to update if the
 * sentinel name ever changes.
 */
export function isOwnerRole(templateName: string | null | undefined): boolean {
  return templateName === OWNER_ROLE_NAME;
}
