import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { defaultLocale, locales, type Locale } from './config';

export default getRequestConfig(async () => {
  let locale: Locale = defaultLocale;
  try {
    const cookieStore = await cookies();
    const localeCookie = cookieStore?.get('NEXT_LOCALE')?.value;
    if (localeCookie && locales.includes(localeCookie as Locale)) {
      locale = localeCookie as Locale;
    }
  } catch {
    // cookies() can throw during edge-case renders (e.g. static generation
    // or serverless cold-start timing issues). Fall back to default locale.
  }

  // Load all message files for the locale
  const [
    common,
    marketing,
    tools,
    demo,
    auth,
    portal,
    worker,
    legal,
    blog,
    misc,
  ] = await Promise.all([
    import(`../../messages/${locale}/common.json`).then((m) => m.default).catch(() => ({})),
    import(`../../messages/${locale}/marketing.json`).then((m) => m.default).catch(() => ({})),
    import(`../../messages/${locale}/tools.json`).then((m) => m.default).catch(() => ({})),
    import(`../../messages/${locale}/demo.json`).then((m) => m.default).catch(() => ({})),
    import(`../../messages/${locale}/auth.json`).then((m) => m.default).catch(() => ({})),
    import(`../../messages/${locale}/portal.json`).then((m) => m.default).catch(() => ({})),
    import(`../../messages/${locale}/worker.json`).then((m) => m.default).catch(() => ({})),
    import(`../../messages/${locale}/legal.json`).then((m) => m.default).catch(() => ({})),
    import(`../../messages/${locale}/blog.json`).then((m) => m.default).catch(() => ({})),
    import(`../../messages/${locale}/misc.json`).then((m) => m.default).catch(() => ({})),
  ]);

  return {
    locale,
    messages: {
      ...common,
      ...marketing,
      ...tools,
      ...demo,
      ...auth,
      ...portal,
      ...worker,
      ...legal,
      ...blog,
      ...misc,
    },
  };
});
