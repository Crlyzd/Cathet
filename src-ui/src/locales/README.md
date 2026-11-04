# Contributing Translations to Cathet

Thank you for helping make **Cathet** accessible and welcoming to people across different cultures and regions!

Cathet supports standard national languages as well as regional languages and local dialects (like **Basa Jawa Krama**, **Ngoko**, and **Malangan / Boso Walikan**).

---

## How to Add or Improve a Language in 3 Steps

### Step 1: Duplicate `en.json`
1. Navigate to `src-ui/src/locales/`.
2. Copy `en.json` and rename it to your target locale code (e.g. `su.json` for Sundanese, `ban.json` for Balinese, `es.json` for Spanish, or `min.json` for Minangkabau).

### Step 2: Translate the Values
Open the new JSON file and translate the text on the right side of each key.

```json
{
  "common": {
    "save": "Simpen",
    "delete": "Busek"
  }
}
```

> **Note on Placeholders**: Some strings include dynamic placeholders in curly braces like `{count}` or `{query}`. Keep these exact placeholders in your translation so numbers and queries can be inserted dynamically.

### Step 3: Register in `src-ui/src/locales/index.ts`
Open `src-ui/src/locales/index.ts` and add your new locale to `SUPPORTED_LOCALES`:

```typescript
import su from "./su.json";

export const LOCALES: Record<string, TranslationDictionary> = {
  // ...
  "su": su as TranslationDictionary,
};

export const SUPPORTED_LOCALES: LocaleMeta[] = [
  // ...
  { code: "su", name: "Sundanese", nativeName: "Basa Sunda" },
];
```

Run `npx tsc --noEmit` to verify syntax, test locally, and submit a Pull Request!

---

## Fallback Engine
Cathet uses a fallback system: if you haven't finished translating every single key, any missing or untranslated keys will automatically show the English text. You never need to worry about the app crashing due to a missing key!

## Regional Dialects & Register Etiquette
When submitting regional dialects:
- **Formal / Inggil / Krama**: Use refined vocabulary appropriate for elders and formal contexts.
- **Conversational / Ngoko**: Use comfortable, daily conversational vocabulary.
- **Urban / Slang / Walikan Dialects**: Preserve authentic local terms and reversal vocabulary (e.g., Malang's *Hebak*, *Ngotek*, *Kipai*).

