/**
 * Granular admin permissions system.
 *
 * Owners always have full access.  Workers have no admin access.
 * For admin / worker_admin roles the owner can toggle individual
 * permission categories.  When `admin_permissions` is null on a user
 * record every permission defaults to **granted** (backwards-compatible
 * with existing admins).
 */

export const PERMISSION_KEYS = [
  'team_management',
  'quotes',
  'invoices',
  'time_logs',
  'hr_notes',
  'customers',
  'leads',
  'jobs',
  'dispatch',
  'settings',
] as const

export type PermissionKey = (typeof PERMISSION_KEYS)[number]

export type AdminPermissions = Record<PermissionKey, boolean>

export interface PermissionDef {
  key: PermissionKey
  label: string
  description: string
}

export const PERMISSION_DEFS: PermissionDef[] = [
  {
    key: 'team_management',
    label: 'Team Management',
    description: 'Add, edit, and deactivate team members',
  },
  {
    key: 'hr_notes',
    label: 'HR Notes & Certs',
    description: 'Create and manage HR notes and certifications',
  },
  {
    key: 'jobs',
    label: 'Jobs',
    description: 'Create, edit, and delete jobs',
  },
  {
    key: 'dispatch',
    label: 'Dispatch Board',
    description: 'Assign workers and manage the dispatch board',
  },
  {
    key: 'quotes',
    label: 'Quotes',
    description: 'Create, edit, delete, and send quotes',
  },
  {
    key: 'invoices',
    label: 'Invoices',
    description: 'Create, edit, and manage invoices',
  },
  {
    key: 'customers',
    label: 'Customers',
    description: 'Add, edit, and manage customers',
  },
  {
    key: 'leads',
    label: 'Leads',
    description: 'View and manage leads',
  },
  {
    key: 'time_logs',
    label: 'Time Logs',
    description: 'View and edit all team time logs',
  },
  {
    key: 'settings',
    label: 'Settings',
    description: 'Access and modify company settings',
  },
]

/** Returns a permissions object with every permission granted. */
export function allPermissionsGranted(): AdminPermissions {
  return Object.fromEntries(PERMISSION_KEYS.map((k) => [k, true])) as AdminPermissions
}

/** Returns a permissions object with every permission denied. */
export function allPermissionsDenied(): AdminPermissions {
  return Object.fromEntries(PERMISSION_KEYS.map((k) => [k, false])) as AdminPermissions
}

/**
 * Resolve the effective permissions for a user.
 *
 * - Owners → everything granted
 * - Workers → everything denied
 * - Admin / Worker_admin with null admin_permissions → everything granted (backwards compat)
 * - Admin / Worker_admin with admin_permissions set → use those values
 */
export function resolvePermissions(
  role: string,
  adminPermissions: AdminPermissions | null | undefined,
): AdminPermissions {
  if (role === 'owner') return allPermissionsGranted()
  if (role === 'worker') return allPermissionsDenied()

  // admin or worker_admin
  if (!adminPermissions) return allPermissionsGranted()
  return { ...allPermissionsGranted(), ...adminPermissions }
}

/** Quick check: does this role have admin-level access at all? */
export function hasAdminAccess(role: string): boolean {
  return ['owner', 'admin', 'worker_admin'].includes(role)
}

/** Check a single permission for a user. */
export function checkPermission(
  role: string,
  adminPermissions: AdminPermissions | null | undefined,
  permission: PermissionKey,
): boolean {
  return resolvePermissions(role, adminPermissions)[permission]
}
