// Mock for next-intl in Jest tests — loads real English translations
const path = require('path');
const fs = require('fs');

function loadMessages() {
  const messagesDir = path.join(__dirname, '../../messages/en');
  const messages = {};
  try {
    const files = fs.readdirSync(messagesDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = JSON.parse(fs.readFileSync(path.join(messagesDir, file), 'utf8'));
        Object.assign(messages, content);
      }
    }
  } catch {
    // If message files don't exist, return empty
  }
  return messages;
}

const allMessages = loadMessages();

function getNestedValue(obj, keyPath) {
  const keys = keyPath.split('.');
  let current = obj;
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return keyPath; // Return the key path as fallback
    }
  }
  return typeof current === 'string' ? current : keyPath;
}

function useTranslations(namespace) {
  const t = function (key) {
    const fullPath = namespace ? `${namespace}.${key}` : key;
    return getNestedValue(allMessages, fullPath);
  };
  t.rich = function (key) {
    return t(key);
  };
  t.raw = function (key) {
    return t(key);
  };
  return t;
}

function useLocale() {
  return 'en';
}

function useMessages() {
  return allMessages;
}

function useNow() {
  return new Date();
}

function useTimeZone() {
  return 'America/Los_Angeles';
}

function useFormatter() {
  return {
    number: (v) => String(v),
    dateTime: (v) => String(v),
    relativeTime: (v) => String(v),
  };
}

function NextIntlClientProvider({ children }) {
  return children;
}

async function getTranslations(namespace) {
  const t = function (key) {
    const fullPath = namespace ? `${namespace}.${key}` : key;
    return getNestedValue(allMessages, fullPath);
  };
  t.rich = function (key) { return t(key); };
  t.raw = function (key) { return t(key); };
  return t;
}

async function getLocale() {
  return 'en';
}

async function getMessages() {
  return allMessages;
}

module.exports = {
  useTranslations,
  useLocale,
  useMessages,
  useNow,
  useTimeZone,
  useFormatter,
  NextIntlClientProvider,
  getTranslations,
  getLocale,
  getMessages,
};
