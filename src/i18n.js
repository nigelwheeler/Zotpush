var ZotpushI18n = (() => {
  "use strict";

  const catalogs = {
    en: {
      addonName: "ZotPush MD",
      developmentSuffix: " (Development)",
      exportMenu: "Push selection to Markdown…",
      languageMenu: "Language / Lingua",
      languageAutomatic: "Automatic (Zotero language; English fallback)",
      languageEnglish: "English",
      languageItalian: "Italiano",
      chooseDirectory: "Choose the Markdown output folder",
      selectItems: "Select at least one library item.",
      exportComplete: count => `${count} Markdown ${count === 1 ? "file exported" : "files exported"}. Zotero was not modified.`,
      exportFailed: message => `Export failed:\n${message}`,
      untitled: "Untitled",
      openItem: "Open item in Zotero",
      abstract: "Abstract",
      zoteroNotes: "Zotero notes",
      note: "Note",
      annotationSection: "Highlights and annotations",
      annotation: "Annotation",
      annotationTypes: {
        highlight: "Highlight",
        underline: "Underline",
        strike: "Strike-through",
        squiggly: "Squiggly underline",
        note: "Note",
        image: "Image",
        ink: "Drawing"
      },
      missingImage: "Image unavailable in Zotero's local cache.",
      tag: "Tag",
      openAnnotation: "Open in Zotero",
      personalNotes: "Personal notes",
      fileConflict: "The file already exists but does not contain the add-on markers. Export was cancelled to avoid overwriting it."
    },
    it: {
      addonName: "ZotPush MD",
      developmentSuffix: " (Sviluppo)",
      exportMenu: "Esporta selezione in Markdown…",
      languageMenu: "Lingua / Language",
      languageAutomatic: "Automatico (lingua di Zotero; inglese come ripiego)",
      languageEnglish: "English",
      languageItalian: "Italiano",
      chooseDirectory: "Scegli la cartella di destinazione Markdown",
      selectItems: "Seleziona almeno un elemento bibliografico.",
      exportComplete: count => `${count} ${count === 1 ? "file Markdown esportato" : "file Markdown esportati"}. Zotero non è stato modificato.`,
      exportFailed: message => `Esportazione non riuscita:\n${message}`,
      untitled: "Senza titolo",
      openItem: "Apri elemento in Zotero",
      abstract: "Riassunto",
      zoteroNotes: "Note Zotero",
      note: "Nota",
      annotationSection: "Evidenziazioni e annotazioni",
      annotation: "Annotazione",
      annotationTypes: {
        highlight: "Evidenziazione",
        underline: "Sottolineatura",
        strike: "Barratura",
        squiggly: "Sottolineatura ondulata",
        note: "Nota",
        image: "Immagine",
        ink: "Disegno"
      },
      missingImage: "Immagine non disponibile nella cache locale di Zotero.",
      tag: "Tag",
      openAnnotation: "Apri in Zotero",
      personalNotes: "Note personali",
      fileConflict: "Il file esiste già ma non contiene i marcatori del componente aggiuntivo. Esportazione annullata per evitare di sovrascriverlo."
    }
  };

  function resolveLanguage(setting, zoteroLocale) {
    if (setting === "en" || setting === "it") return setting;
    return String(zoteroLocale || "").toLowerCase().startsWith("it") ? "it" : "en";
  }

  function getMessages(language) {
    return catalogs[language] || catalogs.en;
  }

  return { resolveLanguage, getMessages };
})();

if (typeof module !== "undefined") module.exports = ZotpushI18n;