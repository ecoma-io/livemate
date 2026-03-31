import { createI18n } from 'vue-i18n';
import en from './en';
import vi from './vi';

export type MessageSchema = typeof en;

/** Recursively convert all literal string leaf values to `string`. */
type DeepStringify<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepStringify<T[K]>;
};

/** Type used by non-default locale files — same shape, but string leaves. */
export type LocaleMessages = DeepStringify<MessageSchema>;

export type AppLocale = 'auto' | 'en' | 'vi';

const LOCALE_STORAGE_KEY = 'livemate-locale';

function resolveLocale(preference: AppLocale): 'en' | 'vi' {
  if (preference !== 'auto') return preference;
  return navigator.language.startsWith('vi') ? 'vi' : 'en';
}

const savedLocale =
  (localStorage.getItem(LOCALE_STORAGE_KEY) as AppLocale) ?? 'auto';

const i18n = createI18n<[MessageSchema], 'en' | 'vi'>({
  legacy: false,
  locale: resolveLocale(savedLocale),
  fallbackLocale: 'en',
  messages: { en, vi: vi as unknown as MessageSchema },
});

export function setAppLocale(locale: AppLocale) {
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  const resolved = resolveLocale(locale);
  // vue-i18n typed generics make i18n.global.locale a complex union type.
  // At runtime with legacy: false, i18n.global.locale is a WritableComputedRef.
  (i18n.global as unknown as { locale: { value: string } }).locale.value =
    resolved;
}

export default i18n;
