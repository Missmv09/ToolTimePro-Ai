import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Domain registration through ToolTime Pro was removed. We now follow the
// Jobber / Housecall Pro model: customers either use a free *.tooltimepro.com
// subdomain or bring their own domain (BYO) and point DNS at us.
//
// This endpoint is kept so any stale client that still POSTs here gets a clear
// message instead of silently failing. Use /api/website-builder/connect-domain
// to attach a BYO domain to a site.

function gone() {
  return NextResponse.json({
    error: 'Domain registration has been moved out of the app. Register your domain at GoDaddy, Namecheap, or any registrar, then come back and use "Connect your own domain" to point it at your site.',
    code: 'DOMAIN_REGISTRATION_REMOVED',
  }, { status: 410 });
}

export async function POST() { return gone(); }
export async function GET() { return gone(); }
