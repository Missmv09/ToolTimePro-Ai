/**
 * Lightweight i18n for ToolTime Pro static marketing pages.
 * Reads NEXT_LOCALE cookie (set by the Next.js app) to pick language.
 * Elements with data-i18n="key" get their textContent replaced.
 * Elements with data-i18n-placeholder="key" get their placeholder replaced.
 * Elements with data-i18n-html="key" get their innerHTML replaced.
 */
(function () {
  'use strict';

  var COOKIE_NAME = 'NEXT_LOCALE';
  var DEFAULT_LOCALE = 'en';
  var SUPPORTED = ['en', 'es'];
  var translations = null;

  /** Read a cookie value by name */
  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  }

  /** Get current locale from cookie, default to 'en' */
  function getLocale() {
    var val = getCookie(COOKIE_NAME);
    return (val && SUPPORTED.indexOf(val) !== -1) ? val : DEFAULT_LOCALE;
  }

  /** Set the locale cookie and reload */
  function switchLocale(lang) {
    if (SUPPORTED.indexOf(lang) === -1) return;
    document.cookie = COOKIE_NAME + '=' + lang + ';path=/;max-age=31536000';
    window.location.reload();
  }

  /** Apply translations to all data-i18n elements */
  function applyTranslations(locale) {
    if (!translations || !translations[locale]) return;
    var t = translations[locale];

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (t[key] !== undefined) {
        el.textContent = t[key];
      }
    });

    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-html');
      if (t[key] !== undefined) {
        el.innerHTML = t[key];
      }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-placeholder');
      if (t[key] !== undefined) {
        el.placeholder = t[key];
      }
    });

    // Update html lang attribute
    document.documentElement.lang = locale;

    // Update any language toggle buttons
    document.querySelectorAll('[data-i18n-toggle]').forEach(function (btn) {
      btn.textContent = locale === 'en' ? '🌐 ES' : '🌐 EN';
    });
  }

  /** Load translations and apply */
  function init() {
    var locale = getLocale();
    var scriptEl = document.querySelector('script[src*="i18n.js"]');
    var basePath = '';
    if (scriptEl) {
      var src = scriptEl.getAttribute('src');
      basePath = src.substring(0, src.lastIndexOf('/') + 1);
    }

    var xhr = new XMLHttpRequest();
    xhr.open('GET', basePath + 'translations.json', true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        try {
          translations = JSON.parse(xhr.responseText);
          applyTranslations(locale);
        } catch (e) {
          console.error('i18n: Failed to parse translations.json', e);
        }
      }
    };
    xhr.send();
  }

  // Expose switchLocale globally
  window.switchLocale = switchLocale;
  window.getLocale = getLocale;

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
