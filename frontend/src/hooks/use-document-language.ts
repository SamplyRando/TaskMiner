import { useEffect } from "react";

// The application is French (index.html declares lang="fr"). Sections written
// in another language declare it while they are mounted so screen readers
// pronounce them correctly, then restore the previous value.
export function useDocumentLanguage(language: string) {
  useEffect(() => {
    const root = document.documentElement;
    const previousLanguage = root.lang;
    root.lang = language;
    return () => {
      root.lang = previousLanguage;
    };
  }, [language]);
}
