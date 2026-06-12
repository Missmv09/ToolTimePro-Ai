#!/usr/bin/env node
/**
 * i18n key validator — fails CI when the code references a translation key that
 * doesn't exist in the message catalog.
 *
 * Background: components resolve copy via next-intl, e.g.
 *     const t = useTranslations('misc.jenny');
 *     ...
 *     {t('womenOwned')}   // -> looks up misc.jenny.womenOwned
 * If that key is missing, next-intl logs MISSING_MESSAGE at runtime and renders
 * the raw key to the user. Prerendering only catches keys on paths that get
 * statically rendered, so client-only branches slip through. This script closes
 * that gap by statically checking every `t('literal')` call against the merged
 * message files for every locale.
 *
 * Rules:
 *   - A referenced key missing from the DEFAULT locale (en) is an ERROR — it
 *     renders a raw key to users. CI fails.
 *   - A key present in en but missing from another locale is a WARNING — it
 *     falls back to en, which is degraded but not broken. Use --strict to make
 *     these errors too.
 *   - Dynamic keys (template literals / variables, e.g. t(`f.${i}.title`)) and
 *     dynamic namespaces can't be resolved statically and are skipped (counted).
 *
 * Usage:
 *   node scripts/check-i18n-keys.js          # en missing = fail
 *   node scripts/check-i18n-keys.js --strict # any locale missing = fail
 */

const fs = require('fs');
const path = require('path');

const STRICT = process.argv.includes('--strict');
const ROOT = process.cwd();
const MESSAGES_DIR = path.join(ROOT, 'messages');
const SRC_DIR = path.join(ROOT, 'src');
const DEFAULT_LOCALE = 'en';

// ── Load message catalogs ────────────────────────────────────────────────────
// next-intl (src/i18n/request.ts) shallow-merges every per-locale JSON file into
// one object, so the top-level key of each file becomes a namespace root. We
// replicate that here by Object.assign-ing all files for a locale.
function loadLocale(locale) {
  const dir = path.join(MESSAGES_DIR, locale);
  const merged = {};
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.json')) continue;
    Object.assign(merged, JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')));
  }
  return merged;
}

const locales = fs.readdirSync(MESSAGES_DIR).filter((d) =>
  fs.statSync(path.join(MESSAGES_DIR, d)).isDirectory()
);
if (!locales.includes(DEFAULT_LOCALE)) {
  console.error(`No "${DEFAULT_LOCALE}" locale found under messages/`);
  process.exit(2);
}
const catalogs = Object.fromEntries(locales.map((l) => [l, loadLocale(l)]));

function lookup(obj, dottedPath) {
  return dottedPath.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), obj);
}

// ── Collect source files ─────────────────────────────────────────────────────
function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip test mocks/tests — they stub next-intl and use dynamic namespaces.
      if (/node_modules|\.next|__mocks__|__tests__/.test(p)) continue;
      walk(p, acc);
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      acc.push(p);
    }
  }
  return acc;
}

// ── Extract and check ────────────────────────────────────────────────────────
const errors = [];      // { file, key } missing in default locale
const localeWarnings = []; // { file, key, locale } missing in non-default locale
let dynamicNamespaces = 0;
let dynamicKeys = 0;

// translator var assigned from a STRING-literal namespace
const NS_LITERAL = /\b(\w+)\s*=\s*(?:await\s+)?(?:use|get)Translations\(\s*(['"`])([^'"`]*)\2\s*\)/g;
// translator var assigned from a non-literal (variable/template) namespace
const NS_DYNAMIC = /\b(\w+)\s*=\s*(?:await\s+)?(?:use|get)Translations\(\s*(?!['"`)])/g;

for (const file of walk(SRC_DIR)) {
  const code = fs.readFileSync(file, 'utf8');
  if (!/Translations\(/.test(code)) continue;

  const varToNs = {};
  let m;
  while ((m = NS_LITERAL.exec(code))) varToNs[m[1]] = m[3];
  // Mark dynamic-namespace translators so we skip (not falsely flag) their keys.
  const dynamicVars = new Set();
  while ((m = NS_DYNAMIC.exec(code))) {
    dynamicVars.add(m[1]);
    dynamicNamespaces++;
  }

  for (const [v, ns] of Object.entries(varToNs)) {
    // Matches t('k'), t("k"), t.rich('k'), t.markup('k') — NOT t(`...`) or t(var)
    const callRe = new RegExp(`\\b${v}(?:\\.(?:rich|markup))?\\(\\s*(['"])([^'"]+)\\1`, 'g');
    let c;
    while ((c = callRe.exec(code))) {
      const key = c[2];
      const full = ns ? `${ns}.${key}` : key;
      if (lookup(catalogs[DEFAULT_LOCALE], full) === undefined) {
        errors.push({ file, key: full });
        continue;
      }
      for (const loc of locales) {
        if (loc === DEFAULT_LOCALE) continue;
        if (lookup(catalogs[loc], full) === undefined) {
          localeWarnings.push({ file, key: full, locale: loc });
        }
      }
    }
    // Count dynamic-key calls for visibility (can't statically verify).
    const dynRe = new RegExp(`\\b${v}(?:\\.(?:rich|markup))?\\(\\s*(\`|[a-zA-Z_])`, 'g');
    while ((dynRe.exec(code))) dynamicKeys++;
  }
  void dynamicVars; // their keys are simply never matched against the catalog
}

// ── Report ───────────────────────────────────────────────────────────────────
const rel = (f) => path.relative(ROOT, f);
const isTTY = process.stdout.isTTY;
const red = (s) => (isTTY ? `\x1b[31m${s}\x1b[0m` : s);
const yellow = (s) => (isTTY ? `\x1b[33m${s}\x1b[0m` : s);
const green = (s) => (isTTY ? `\x1b[32m${s}\x1b[0m` : s);
const dim = (s) => (isTTY ? `\x1b[2m${s}\x1b[0m` : s);

console.log(`\ni18n key check — locales: ${locales.join(', ')} (default: ${DEFAULT_LOCALE})`);
console.log(dim(`Skipped ${dynamicKeys} dynamic key(s) and ${dynamicNamespaces} dynamic namespace(s) — not statically checkable.\n`));

const uniqErrors = [...new Map(errors.map((e) => [`${e.file}|${e.key}`, e])).values()];
if (uniqErrors.length) {
  console.log(red(`✗ ${uniqErrors.length} referenced key(s) missing from "${DEFAULT_LOCALE}":`));
  for (const e of uniqErrors) console.log(`    ${rel(e.file)}  ${red(e.key)}`);
  console.log('');
}

const uniqWarnings = [...new Map(localeWarnings.map((w) => [`${w.locale}|${w.key}`, w])).values()];
if (uniqWarnings.length) {
  const label = STRICT ? red('✗') : yellow('⚠');
  console.log(`${label} ${uniqWarnings.length} key(s) present in "${DEFAULT_LOCALE}" but missing in another locale (fallback to ${DEFAULT_LOCALE}):`);
  for (const w of uniqWarnings) console.log(`    [${w.locale}] ${w.key}  ${dim(rel(w.file))}`);
  console.log('');
}

const failed = uniqErrors.length > 0 || (STRICT && uniqWarnings.length > 0);
if (failed) {
  console.log(red(`FAILED — fix the missing key(s) above.`));
  process.exit(1);
}
console.log(green(`✓ All referenced translation keys resolve in ${STRICT ? 'every locale' : `"${DEFAULT_LOCALE}"`}.`) + (uniqWarnings.length ? yellow(` (${uniqWarnings.length} non-default-locale warning(s))`) : ''));
process.exit(0);
