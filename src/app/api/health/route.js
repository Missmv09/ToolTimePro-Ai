import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Tiny public build-identity probe. It answers one question: *which* build is
// this deployment currently serving?
//
// CI uses it to tell "the sandbox is up" apart from "the sandbox is up but
// still serving the previous deploy" — Netlify keeps the old deploy live until
// the new one publishes, so a plain 200 says nothing about whether the commit
// under test is live yet. Without this, the authenticated E2E suite races the
// deploy: it warms up the old build, then Netlify swaps in the new one
// mid-run and every in-flight request dies (see scripts/wait-for-deploy.js).
//
// COMMIT_REF / BRANCH / CONTEXT are Netlify build-time vars, inlined into the
// server bundle by the DefinePlugin list in next.config.js. Locally they're
// undefined and this reports "unknown".
export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      commit: process.env.COMMIT_REF || 'unknown',
      branch: process.env.BRANCH || 'unknown',
      context: process.env.CONTEXT || 'unknown',
      appEnv: process.env.NEXT_PUBLIC_APP_ENV || 'unknown',
      time: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}
