import { NextResponse } from 'next/server';
import { verifyPlatformAdmin } from '@/lib/platform-admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/verify
 * Verifies if the current user is a platform admin.
 */
export async function GET(request: Request) {
  const admin = await verifyPlatformAdmin(request);

  if (!admin) {
    return NextResponse.json({ isAdmin: false }, { status: 403 });
  }

  return NextResponse.json({ isAdmin: true, email: admin.email });
}
