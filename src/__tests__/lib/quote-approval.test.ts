import { canSendQuoteDirectly } from '@/lib/quote-approval'
import type { AdminPermissions } from '@/lib/permissions'

describe('canSendQuoteDirectly', () => {
  describe('when company approval is NOT required (default)', () => {
    it('lets an owner send directly', () => {
      expect(canSendQuoteDirectly({ role: 'owner', userId: 'u1' })).toBe(true)
    })

    it('blocks a plain worker (no quotes permission)', () => {
      expect(canSendQuoteDirectly({ role: 'worker', userId: 'u2' })).toBe(false)
    })

    it('lets an admin with default permissions send directly', () => {
      expect(canSendQuoteDirectly({ role: 'admin', userId: 'u3', adminPermissions: null })).toBe(true)
    })

    it('blocks an admin whose quotes permission was toggled off', () => {
      const perms = { quotes: false } as unknown as AdminPermissions
      expect(canSendQuoteDirectly({ role: 'admin', userId: 'u4', adminPermissions: perms })).toBe(false)
    })

    it('lets a worker_admin with default permissions send directly', () => {
      expect(canSendQuoteDirectly({ role: 'worker_admin', userId: 'u5', adminPermissions: null })).toBe(true)
    })

    it('defaults a missing role to worker and blocks it', () => {
      expect(canSendQuoteDirectly({ role: null, userId: 'u6' })).toBe(false)
    })
  })

  describe('when company approval IS required', () => {
    const required = { approvalSettings: { required: true } }

    it('still lets the owner send directly', () => {
      expect(canSendQuoteDirectly({ role: 'owner', userId: 'u1', ...required })).toBe(true)
    })

    it('holds an admin (not a designated approver)', () => {
      expect(canSendQuoteDirectly({ role: 'admin', userId: 'u3', adminPermissions: null, ...required })).toBe(false)
    })

    it('holds a worker', () => {
      expect(canSendQuoteDirectly({ role: 'worker', userId: 'u2', ...required })).toBe(false)
    })

    it('lets a designated approver send directly, whatever their role', () => {
      expect(
        canSendQuoteDirectly({
          role: 'worker',
          userId: 'approver-1',
          approvalSettings: { required: true, approver_ids: ['approver-1'] },
        }),
      ).toBe(true)
    })

    it('holds an admin who is not in the approver list', () => {
      expect(
        canSendQuoteDirectly({
          role: 'admin',
          userId: 'u3',
          adminPermissions: null,
          approvalSettings: { required: true, approver_ids: ['someone-else'] },
        }),
      ).toBe(false)
    })
  })
})
