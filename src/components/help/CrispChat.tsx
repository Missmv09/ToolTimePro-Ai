'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Crisp Live Chat Integration for ToolTime Pro Dashboard
 *
 * Setup instructions:
 * 1. Create a Crisp account at https://crisp.chat
 * 2. Get your Website ID from Crisp Dashboard → Settings → Setup Instructions
 * 3. Set the NEXT_PUBLIC_CRISP_WEBSITE_ID environment variable in Netlify
 *
 * This component:
 * - Loads the Crisp chat widget on mount
 * - Identifies the logged-in user (email, name, company)
 * - Configures the widget colors to match ToolTime Pro branding
 * - Hides on unauthenticated pages (only renders inside dashboard)
 */

declare global {
  interface Window {
    $crisp: unknown[];
    CRISP_WEBSITE_ID: string;
  }
}

export default function CrispChat() {
  const { user, dbUser, company } = useAuth();

  useEffect(() => {
    const websiteId = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID || '6baf2f53-e868-4a02-a9c7-eef3e5549db6';
    if (!websiteId) return;

    // Initialize Crisp
    window.$crisp = window.$crisp || [];
    window.CRISP_WEBSITE_ID = websiteId;

    // Don't re-add the script if it's already loaded
    if (document.getElementById('crisp-widget-script')) return;

    const script = document.createElement('script');
    script.id = 'crisp-widget-script';
    script.src = 'https://client.crisp.chat/l.js';
    script.async = true;
    document.head.appendChild(script);

    // Brand colors: ToolTime Pro gold
    window.$crisp.push(['config', 'color:theme', ['#f5a623']]);

    return () => {
      // Cleanup on unmount (e.g., logout)
      const existingScript = document.getElementById('crisp-widget-script');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  // Identify the user when auth state changes
  useEffect(() => {
    if (!window.$crisp || !user?.email) return;

    window.$crisp.push(['set', 'user:email', [user.email]]);

    if (dbUser?.full_name) {
      window.$crisp.push(['set', 'user:nickname', [dbUser.full_name]]);
    }

    if (company?.name) {
      window.$crisp.push(['set', 'user:company', [company.name]]);
    }

    // Set session data for support context
    const sessionData = [
      ['plan', company?.plan || 'unknown'],
      ['role', dbUser?.role || 'unknown'],
      ['company_id', company?.id || 'unknown'],
    ];
    window.$crisp.push(['set', 'session:data', [sessionData]]);
  }, [user?.email, dbUser?.full_name, dbUser?.role, company?.name, company?.plan, company?.id]);

  // This component renders nothing — Crisp injects its own widget
  return null;
}
