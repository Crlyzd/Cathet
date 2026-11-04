import en from "./en.json";
import id from "./id.json";
import jvKrama from "./jv-krama.json";
import jvNgoko from "./jv-ngoko.json";
import jvMalang from "./jv-malang.json";

export interface LocaleMeta {
  code: string;
  name: string;
  nativeName: string;
}

export type TranslationDictionary = typeof en;

export const LOCALES: Record<string, TranslationDictionary> = {
  en: en as TranslationDictionary,
  id: id as TranslationDictionary,
  "jv-krama": jvKrama as TranslationDictionary,
  "jv-ngoko": jvNgoko as TranslationDictionary,
  "jv-malang": jvMalang as TranslationDictionary,
};

export const SUPPORTED_LOCALES: LocaleMeta[] = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia" },
  { code: "jv-krama", name: "Javanese (Krama)", nativeName: "Basa Jawa (Krama)" },
  { code: "jv-ngoko", name: "Javanese (Ngoko)", nativeName: "Basa Jawa (Ngoko)" },
  { code: "jv-malang", name: "Javanese (Malangan)", nativeName: "Basa Jawa (Malangan)" },
];

export const DEFAULT_LOCALE = "en";
