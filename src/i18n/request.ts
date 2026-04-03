import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { defaultLocale, locales, type Locale } from './config';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('NEXT_LOCALE')?.value;
  const locale: Locale =
    localeCookie && locales.includes(localeCookie as Locale)
      ? (localeCookie as Locale)
      : defaultLocale;

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
