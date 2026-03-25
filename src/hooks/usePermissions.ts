'use client'

import { useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  AdminPermissions,
  PermissionKey,
  resolvePermissions,
  hasAdminAccess as _hasAdminAccess,
} from '@/lib/permissions'

export function usePermissions() {
  const { dbUser } = useAuth()

  const role = dbUser?.role || 'worker'
  const rawPerms = (dbUser as Record<string, unknown> | null)?.admin_permissions as
    | AdminPermissions
    | null
    | undefined

  const permissions = useMemo(() => resolvePermissions(role, rawPerms), [role, rawPerms])

  const can = (permission: PermissionKey): boolean => permissions[permission]

  const isOwner = role === 'owner'
  const isAdmin = _hasAdminAccess(role)

  return { permissions, can, isOwner, isAdmin, role }
}
