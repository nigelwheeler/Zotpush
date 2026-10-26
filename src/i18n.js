var ZotpushI18n = (() => {
  "use strict";

  const catalogs = {
    en: {
      addonName: "ZotPush MD",
      developmentSuffix: " (Development)",
      exportMenu: "Push selection to Markdown…",
      languageAutomatic: "Automatic (Zotero language; English fallback)",
      languageEnglish: "English",
      languageItalian: "Italiano",
      chooseDirectory: "Choose the Markdown output folder",
      selectItems: "Select at least one library item.",
      exportComplete: count => `${count} Markdown ${count === 1 ? "file exported" : "files exported"}. Zotero was not modified.`,
      exportFailed: message => `Export failed:\n${message}`,
      filenameFallback: count => `${count} item${count === 1 ? "" : "s"} had no citation key; title + Zotero key was used.`,
      citationPropertyInvalid: "The citation property name is invalid or reserved; it was omitted.",
      citationNoAuthor: "Unknown author",
      citationNoYear: "n.d.",
      citationAnd: "and",
      tagExportSummary: (formatted, duplicates, removed) => `Tags: ${formatted} reformatted, ${duplicates} duplicate${duplicates === 1 ? "" : "s"} removed, ${removed} empty ${removed === 1 ? "tag" : "tags"} removed.`,
      tagPatternWarning: "The replacement regex is invalid; the built-in safe pattern was used.",
      logSaved: path => `Export log saved to: ${path}`,
      logSaveFailed: message => `The export completed, but its log could not be saved: ${message}`,
      tagExportSummary: (formatted, duplicates, removed) => `Tags: ${formatted} reformatted, ${duplicates} duplicate${duplicates === 1 ? "" : "s"} removed, ${removed} empty ${removed === 1 ? "tag" : "tags"} removed.`,
      tagPatternWarning: "The replacement regex is invalid; the built-in safe pattern was used.",
      logSaved: path => `Export log saved to: ${path}`,
      logSaveFailed: message => `The export completed, but its log could not be saved: ${message}`,
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
      languageAutomatic: "Automatico (lingua di Zotero; inglese come ripiego)",
      languageEnglish: "English",
      languageItalian: "Italiano",
      chooseDirectory: "Scegli la cartella di destinazione Markdown",
      selectItems: "Seleziona almeno un elemento bibliografico.",
      exportComplete: count => `${count} ${count === 1 ? "file Markdown esportato" : "file Markdown esportati"}. Zotero non è stato modificato.`,
      exportFailed: message => `Esportazione non riuscita:\n${message}`,
      filenameFallback: count => `${count} ${count === 1 ? "elemento" : "elementi"} senza chiave citazione; è stato usato titolo + chiave Zotero.`,
      citationPropertyInvalid: "Il nome della proprietà di citazione non è valido o è riservato; è stato omesso.",
      citationNoAuthor: "Autore sconosciuto",
      citationNoYear: "s.d.",
      citationAnd: "e",
      tagExportSummary: (formatted, duplicates, removed) => `Tag: ${formatted} riformattati, ${duplicates} duplicati rimossi, ${removed} tag vuoti rimossi.`,
      tagPatternWarning: "L'espressione regex non è valida; è stato usato il modello sicuro predefinito.",
      logSaved: path => `Registro esportazione salvato in: ${path}`,
      logSaveFailed: message => `Esportazione completata, ma non è stato possibile salvare il registro: ${message}`,
      tagExportSummary: (formatted, duplicates, removed) => `Tag: ${formatted} riformattati, ${duplicates} duplicati rimossi, ${removed} tag vuoti rimossi.`,
      tagPatternWarning: "L'espressione regex non è valida; è stato usato il modello sicuro predefinito.",
      logSaved: path => `Registro esportazione salvato in: ${path}`,
      logSaveFailed: message => `Esportazione completata, ma non è stato possibile salvare il registro: ${message}`,
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