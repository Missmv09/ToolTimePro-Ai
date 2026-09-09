/**
 * Smart Quote page — EN/ES language switch.
 *
 * The 🇺🇸 EN / 🇪🇸 ES toggle used to set a local state that only the
 * speech-recognition locale read, so clicking ES changed nothing on screen.
 * These tests render the real page with the real message bundles for each
 * locale, so a key that is missing from messages/es/tools.json, or a string
 * whose placeholders don't line up, shows up here rather than in the browser.
 */

import React from 'react';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// ── next-intl → real message bundles with a switchable locale ───────────────
// jest.config maps `next-intl` to the English-only stub; override it here with
// a translator that reads messages/{en,es}/tools.json for whichever locale the
// test selects. It formats the ICU subset this page uses ({name} placeholders
// and {count, plural, one {…} other {…}} with #) using Intl.PluralRules for the
// locale, and throws on a missing key or unsupported syntax so a gap in the
// Spanish bundle fails the test instead of rendering a raw key.
let currentLocale = 'en';

jest.mock('next-intl', () => {
  const bundles = {
    en: require('../../../messages/en/tools.json'),
    es: require('../../../messages/es/tools.json'),
  };
  const lookup = (path) =>
    path.split('.').reduce((node, part) => (node == null ? node : node[part]), bundles[currentLocale]);
  const ARG = /\{(\w+)(?:,\s*plural,\s*((?:[^{}]|\{[^{}]*\})*))?\}/g;
  const formatIcu = (message, values = {}, locale) => {
    const out = message.replace(ARG, (_m, name, plural) => {
      const v = values[name];
      if (v === undefined) throw new Error(`Missing value "${name}" for: ${message}`);
      if (!plural) return String(v);
      const cases = {};
      for (const [, sel, txt] of plural.matchAll(/(\w+|=\d+)\s*\{([^{}]*)\}/g)) cases[sel] = txt;
      const chosen = cases[`=${v}`] ?? cases[new Intl.PluralRules(locale).select(Number(v))] ?? cases.other;
      if (chosen === undefined) throw new Error(`No plural case for ${v} in: ${message}`);
      return chosen.replace(/#/g, String(v));
    });
    if (/[{}]/.test(out)) throw new Error(`Unsupported ICU syntax in: ${message}`);
    return out;
  };
  return {
    useLocale: () => currentLocale,
    useTranslations: (namespace) => (key, values) => {
      const message = lookup(`${namespace}.${key}`);
      if (typeof message !== 'string') {
        throw new Error(`Missing ${currentLocale} translation: ${namespace}.${key}`);
      }
      return formatIcu(message, values, currentLocale);
    },
  };
});

// Stable router instance: the page's fetch effect depends on `router`, so a
// fresh object per render would re-run the fetch on every render.
const mockRouter = { push: jest.fn() };
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => React.createElement('img', props),
}));

// Likewise stable auth values: `user` is in that effect's dependency list.
const mockAuth = {
  user: { id: 'user-1' },
  dbUser: { id: 'dbuser-1', company_id: 'company-1' },
  company: { id: 'company-1', name: 'Test Co', industry: 'landscaping' },
  isLoading: false,
};
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

// Chainable Supabase stub: `await supabase.from('customers').select(...).eq(...).order(...)`
jest.mock('@/lib/supabase', () => {
  const builder = {
    select: () => builder,
    eq: () => builder,
    order: () => builder,
    single: () => Promise.resolve({ data: null, error: null }),
    then: (onFulfilled, onRejected) =>
      Promise.resolve({ data: [], error: null }).then(onFulfilled, onRejected),
  };
  return {
    supabase: {
      from: () => builder,
      auth: { getSession: () => Promise.resolve({ data: { session: null }, error: null }) },
    },
  };
});

const SmartQuotingPage = require('@/app/dashboard/smart-quote/page').default;

async function renderPage(locale) {
  currentLocale = locale;
  const result = render(<SmartQuotingPage />);
  // Let the initial customers fetch settle so its setState lands inside act().
  await act(async () => {});
  return result;
}

const reloadMock = jest.fn();

beforeEach(() => {
  reloadMock.mockClear();
  // jsdom's location.reload is not writable; swap in an observable one.
  delete window.location;
  window.location = { ...window.location, reload: reloadMock, origin: 'http://localhost' };
  document.cookie = 'NEXT_LOCALE=; path=/; max-age=0';
});

describe('Smart Quote page language switch', () => {
  test('renders in Spanish when the locale is es', async () => {
    await renderPage('es');

    expect(screen.getByRole('heading', { name: 'Cotización Inteligente' })).toBeInTheDocument();
    expect(screen.getByText('¿Cómo quieres crear esta cotización?')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cliente' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Partidas' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Resumen de la Cotización' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Enviar Cotización/ })).toBeInTheDocument();
    expect(screen.getByText('0 partidas')).toBeInTheDocument();

    // No English leaked through on the parts the screenshot showed.
    expect(screen.queryByText('Smart Quoting')).not.toBeInTheDocument();
    expect(screen.queryByText('Line Items')).not.toBeInTheDocument();
    expect(screen.queryByText('Quote Summary')).not.toBeInTheDocument();

    // The toggle reflects the active locale.
    expect(screen.getByRole('button', { name: /ES/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /EN/ })).toHaveAttribute('aria-pressed', 'false');
  });

  test('renders in English when the locale is en', async () => {
    await renderPage('en');

    expect(screen.getByRole('heading', { name: 'Smart Quoting' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Line Items' })).toBeInTheDocument();
    expect(screen.getByText('0 items')).toBeInTheDocument();
    expect(screen.queryByText('Cotización Inteligente')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /EN/ })).toHaveAttribute('aria-pressed', 'true');
  });

  test('clicking ES writes the site-wide NEXT_LOCALE cookie and reloads', async () => {
    await renderPage('en');

    fireEvent.click(screen.getByRole('button', { name: /ES/ }));

    expect(document.cookie).toMatch(/NEXT_LOCALE=es/);
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  test('clicking the already-active language is a no-op', async () => {
    await renderPage('en');

    fireEvent.click(screen.getByRole('button', { name: /EN/ }));

    expect(document.cookie).not.toMatch(/NEXT_LOCALE=/);
    expect(reloadMock).not.toHaveBeenCalled();
  });

  test('quick-add labels, table headers and the item count are localized', async () => {
    await renderPage('es');

    fireEvent.click(screen.getByRole('button', { name: /Cuidado de Césped/ }));

    // ICU plural: one → "1 partida"
    expect(screen.getByText('1 partida')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Cuidado de Césped')).toBeInTheDocument();

    const table = screen.getByRole('table');
    expect(within(table).getByText('Descripción')).toBeInTheDocument();
    expect(within(table).getByText('Cant.')).toBeInTheDocument();
    expect(within(table).getByRole('option', { name: 'unidad' })).toBeInTheDocument();
    expect(within(table).getByRole('option', { name: 'hora' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Poda de Árboles/ }));
    expect(screen.getByText('2 partidas')).toBeInTheDocument();
  });

  test('every Spanish key mirrors an English key (no missing translations)', () => {
    const en = require('../../../messages/en/tools.json').tools.smartQuote;
    const es = require('../../../messages/es/tools.json').tools.smartQuote;
    const flatten = (obj, prefix = '') =>
      Object.entries(obj).flatMap(([k, v]) =>
        typeof v === 'object' ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`],
      );
    expect(flatten(es).sort()).toEqual(flatten(en).sort());
  });
});
