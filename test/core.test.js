const assert = require("node:assert/strict");
const localization = require("../src/i18n.js");
const preferencesPane = require("../src/preferences.js");
const core = require("../src/core.js");
const Plugin = require("../src/plugin.js");
const english = localization.getMessages("en");
const italian = localization.getMessages("it");

const item = {
  key: "ABCD1234", libraryID: 1, version: 2, citationKey: "rossi2025",
  title: "Titolo: prova", creators: [{ firstName: "Mario", lastName: "Rossi" }],
  date: "2025", year: "2025", itemType: "journalArticle", DOI: "10.1/x",
  ISBN: "", url: "https://example.test", collections: ["Ricerca"], tags: ["evidenza"],
  zoteroURI: "zotero://select/library/items/ABCD1234", abstract: "Abstract",
  notes: [], annotations: [{
    type: "image", pageLabel: "3", imagePath: "./assets/zotero-ABCD1234/IMAGE01.png",
    openURI: "zotero://open-pdf/library/items/PDFKEY01?page=3&annotation=IMAGE01"
  }, {
    type: "ink", pageLabel: "4",
    openURI: "zotero://open-pdf/library/items/PDFKEY01?page=4&annotation=INK01"
  }]
};

const first = core.merge("", item, "2026-08-26T00:00:00Z", english);
assert.match(first, /^---\nzotero_item_key: "ABCD1234"/);
assert.match(first, /title: "Titolo: prova"/);
assert.match(first, /## Personal notes/);
assert.match(first, /!\[\]\(\.\/assets\/zotero-ABCD1234\/IMAGE01\.png\)/);
assert.match(first, /\[Open in Zotero\]\(<zotero:\/\/open-pdf\/library\/items\/PDFKEY01\?page=3&annotation=IMAGE01>\)/);
assert.match(first, /Image unavailable in Zotero's local cache/);

const italianOutput = core.merge("", item, "2026-08-26T00:00:00Z", italian);
assert.match(italianOutput, /\[Apri in Zotero\]/);
assert.match(italianOutput, /## Note personali/);
assert.match(italianOutput, /Immagine non disponibile nella cache locale di Zotero/);
assert.equal(localization.resolveLanguage("auto", "it-IT"), "it");
assert.equal(localization.resolveLanguage("auto", "en-US"), "en");
assert.equal(localization.resolveLanguage("auto", "fr-FR"), "en");
assert.equal(localization.resolveLanguage("en", "it-IT"), "en");
assert.equal(localization.resolveLanguage("it", "en-US"), "it");

class MockElement {
  constructor() {
    this.children = [];
    this.attributes = {};
    this.listeners = {};
    this.hidden = false;
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  addEventListener(name, listener) {
    this.listeners[name] = listener;
  }

  removeEventListener(name) {
    delete this.listeners[name];
  }

  appendChild(child) {
    this.children.push(child);
    if (child.id) elements.set(child.id, child);
  }

  remove() {
    elements.delete(this.id);
  }
}

const elements = new Map();
const toolsPopup = new MockElement();
toolsPopup.id = "menu_ToolsPopup";
elements.set(toolsPopup.id, toolsPopup);
const contextPopup = new MockElement();
contextPopup.id = "zotero-itemmenu";
elements.set(contextPopup.id, contextPopup);
const window = {
  document: {
    getElementById: id => elements.get(id),
    createXULElement: () => new MockElement()
  },
  ZoteroPane: { getSelectedItems: () => [] }
};
const preferences = new Map();
const preferenceObservers = new Map();
const ZoteroAPI = { locale: "it-IT", getMainWindows: () => [window] };
const ServicesAPI = {
  prefs: {
    getStringPref: (key, fallback) => preferences.get(key) ?? fallback,
    setStringPref: (key, value) => {
      preferences.set(key, value);
      preferenceObservers.get(key)?.observe(null, "nsPref:changed", key);
    },
    addObserver: (key, observer) => preferenceObservers.set(key, observer),
    removeObserver: (key, observer) => {
      if (preferenceObservers.get(key) === observer) preferenceObservers.delete(key);
    }
  }
};
const plugin = new Plugin(ZoteroAPI, ServicesAPI, core, "zotpush-md-dev@local", localization);
plugin.start();
assert.equal(elements.get(plugin.toolsMenuID).attributes.label, "Esporta selezione in Markdown… (Sviluppo)");
assert.equal(elements.get(plugin.contextMenuID).attributes.label, "Esporta selezione in Markdown… (Sviluppo)");
assert.equal(toolsPopup.children.length, 1);
assert.equal(plugin.language, "it");

const paneCaption = new MockElement();
const paneDescription = new MockElement();
const paneLanguageLabel = new MockElement();
const paneOptions = ["auto", "en", "it"].map(value => Object.assign(new MockElement(), { value }));
const paneMenu = new MockElement();
paneMenu.value = "";
paneMenu.querySelectorAll = () => paneOptions;
const paneElements = new Map([
  ["caption", paneCaption],
  [".description", paneDescription],
  [".language-label", paneLanguageLabel],
  ["menulist", paneMenu]
]);
const paneRoot = { querySelector: selector => paneElements.get(selector) };
preferencesPane.init({ currentTarget: paneRoot }, ServicesAPI, ZoteroAPI, localization);
assert.equal(paneCaption.attributes.label, "Impostazioni lingua");
assert.equal(paneMenu.value, "auto");
assert.equal(paneOptions[0].attributes.label, italian.languageAutomatic);
paneMenu.value = "en";
paneMenu.listeners.command();
assert.equal(preferences.get("extensions.zotero.zotpush.language"), "en");
assert.equal(plugin.language, "en");
assert.equal(elements.get(plugin.toolsMenuID).attributes.label, "Push selection to Markdown… (Development)");
assert.equal(elements.get(plugin.contextMenuID).attributes.label, "Push selection to Markdown… (Development)");
assert.equal(paneCaption.attributes.label, "Language settings");
assert.equal(paneOptions[0].attributes.label, english.languageAutomatic);
const reloadedPlugin = new Plugin(ZoteroAPI, ServicesAPI, core, "zotpush-md-dev@local", localization);
assert.equal(reloadedPlugin.language, "en");
plugin.stop();
assert.equal(preferenceObservers.size, 0);

const manual = first + "\nQuesta parte è mia.\n";
const updated = core.merge(manual, { ...item, title: "Titolo aggiornato" }, "2026-08-27T00:00:00Z", english);
assert.match(updated, /# Titolo aggiornato/);
assert.match(updated, /Questa parte è mia\./);
assert.throws(() => core.merge("contenuto estraneo", item, "ora", italian), error => error.message === italian.fileConflict);
assert.equal(core.safeFilename('A/B: C?'), "A-B- C-");

console.log("Test core superati");
