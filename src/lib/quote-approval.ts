/**
 * Quote approval gate — the single source of truth for "may this user put a
 * quote in front of a customer directly, or must an owner approve it first?"
 *
 * The control the owner expects is: an employee/worker (and, when the owner
 * turns on required approval, an admin too) cannot send a priced quote to a
 * customer without owner review. "Sending" a quote is the moment its status
 * becomes `sent`; a held quote sits at `pending_approval` until an approver
 * releases it. This helper is shared by the client (quotes dashboard, smart
 * quote builder) AND the server (`/api/quote/save`) so the UI and the
 * server-side enforcement can never drift apart.
 */

import { resolvePermissions, type AdminPermissions } from './permissions'

export interface QuoteApprovalSettings {
  /** When true, even admins must have a quote approved unless they are a designated approver. */
  required?: boolean
  /** User ids explicitly allowed to send/approve directly when approval is required. */
  approver_ids?: string[]
}

export interface QuoteSenderContext {
  /** The acting user's role (owner | admin | worker_admin | worker). */
  role: string | null | undefined
  /** The acting user's id — used to match designated approvers. */
  userId: string | null | undefined
  /** The acting user's granular admin permissions, if any. */
  adminPermissions?: AdminPermissions | null
  /** The company's quote_approval_settings column, if any. */
  approvalSettings?: QuoteApprovalSettings | null
}

/**
 * Can this user send a quote straight to the customer (status `sent`), or must
 * it be held for owner approval (`pending_approval`)?
 *
 * - **Approval not required** (default): anyone who holds the `quotes`
 *   permission may send directly. Owners always have it; admins / worker_admins
 *   have it unless the owner toggled it off; a plain worker never does.
 * - **Approval required**: only the owner or a user listed as a designated
 *   approver may send directly — everyone else (admins included) is held.
 */
export function canSendQuoteDirectly(ctx: QuoteSenderContext): boolean {
  const role = ctx.role || 'worker'
  const approvalRequired = ctx.approvalSettings?.required || false

  if (!approvalRequired) {
    return resolvePermissions(role, ctx.adminPermissions ?? null).quotes
  }

  const isOwner = role === 'owner'
  const isDesignatedApprover =
    !!ctx.userId && (ctx.approvalSettings?.approver_ids?.includes(ctx.userId) ?? false)
  return isOwner || isDesignatedApprover
}
