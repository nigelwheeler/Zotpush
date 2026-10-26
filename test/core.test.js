const assert = require("node:assert/strict");
const fs = require("node:fs");
const localization = require("../src/i18n.js");
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
    prefHasUserValue: key => preferences.has(key),
    getStringPref: (key, fallback) => preferences.get(key) ?? fallback,
    getBoolPref: (key, fallback) => preferences.get(key) ?? fallback,
    setStringPref: (key, value) => {
      preferences.set(key, value);
      preferenceObservers.get(key)?.observe(null, "nsPref:changed", key);
    },
    setBoolPref: (key, value) => preferences.set(key, value),
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
assert.equal(preferences.get("extensions.zotero.zotpush.language"), "auto");
const preferencePaneMarkup = fs.readFileSync(require.resolve("../preferences.xhtml"), "utf8");
assert.match(preferencePaneMarkup, /Language settings \/ Impostazioni lingua/);
assert.match(preferencePaneMarkup, /preference="extensions\.zotero\.zotpush\.language"/);
assert.match(preferencePaneMarkup, /Automatic \/ Automatico/);
assert.match(preferencePaneMarkup, /label="English"/);
assert.match(preferencePaneMarkup, /label="Italiano"/);
assert.match(preferencePaneMarkup, /preference="extensions\.zotero\.zotpush\.reformatTags"/);
assert.match(preferencePaneMarkup, /preference="extensions\.zotero\.zotpush\.tagRegex"/);
assert.match(preferencePaneMarkup, /preference="extensions\.zotero\.zotpush\.saveExportLog"/);
assert.match(preferencePaneMarkup, /preference="extensions\.zotero\.zotpush\.exportLogDirectory"/);
for (const preference of [
  "extensions.zotero.zotpush.language",
  "extensions.zotero.zotpush.reformatTags",
  "extensions.zotero.zotpush.tagRegex",
  "extensions.zotero.zotpush.saveExportLog",
  "extensions.zotero.zotpush.exportLogDirectory"
]) {
  assert.equal(preferencePaneMarkup.split(`preference="${preference}"`).length - 1, 1);
}
ServicesAPI.prefs.setStringPref("extensions.zotero.zotpush.language", "en");
assert.equal(preferences.get("extensions.zotero.zotpush.language"), "en");
assert.equal(plugin.language, "en");
assert.equal(elements.get(plugin.toolsMenuID).attributes.label, "Push selection to Markdown… (Development)");
assert.equal(elements.get(plugin.contextMenuID).attributes.label, "Push selection to Markdown… (Development)");
const reloadedPlugin = new Plugin(ZoteroAPI, ServicesAPI, core, "zotpush-md-dev@local", localization);
assert.equal(reloadedPlugin.language, "en");

const sourceModel = {
  key: "TAGTEST01", libraryID: 1, version: 1, citationKey: "", title: "Tag test",
  creators: [], date: "", year: "", itemType: "book", DOI: "", ISBN: "", url: "",
  collections: [], tags: ["Science & Technology"], zoteroURI: "", abstract: "",
  notes: [], annotations: []
};
const sourceItem = { key: sourceModel.key, isRegularItem: () => true };
const writtenFiles = new Map();
const alerts = [];
global.PathUtils = { join: (...parts) => parts.join("\\") };
global.IOUtils = {
  makeDirectory: async () => {},
  exists: async () => false,
  copy: async () => {},
  writeUTF8: async (path, value) => writtenFiles.set(path, value)
};
window.ZoteroPane.getSelectedItems = () => [sourceItem];
plugin.chooseDirectory = async () => "C:\\Markdown";
plugin.readItem = async () => sourceModel;
plugin.Services.prompt = { alert: (_window, _title, message) => alerts.push(message) };
preferences.set(plugin.reformatTagsPref, true);
preferences.set(plugin.tagRegexPref, core.DEFAULT_TAG_PATTERN);
preferences.set(plugin.saveExportLogPref, true);
preferences.set(plugin.exportLogDirectoryPref, "C:\\ExportLogs");

(async () => {
  await plugin.exportSelection(window);
  const markdownPath = [...writtenFiles.keys()].find(path => path.endsWith("TAGTEST01.md"));
  const logPath = [...writtenFiles.keys()].find(path => path.endsWith(".json"));
  assert.ok(markdownPath);
  assert.ok(logPath);
  assert.ok(logPath.startsWith("C:\\ExportLogs"));
  assert.match(writtenFiles.get(markdownPath), /tags:\n  - "science-technology"/);
  assert.deepEqual(sourceModel.tags, ["Science & Technology"]);
  assert.match(alerts[0], /1 reformatted/);
  const exportLog = JSON.parse(writtenFiles.get(logPath));
  assert.equal(exportLog.items[0].tagChanges[0].from, "Science & Technology");
  assert.equal(exportLog.items[0].tagChanges[0].to, "science-technology");
  assert.equal(exportLog.summary.exported, 1);
  preferences.set(plugin.tagRegexPref, "[");
  preferences.set(plugin.exportLogDirectoryPref, "C:\\ExportLogsFallback");
  await plugin.exportSelection(window);
  const fallbackLogPath = [...writtenFiles.keys()].find(path => path.startsWith("C:\\ExportLogsFallback") && path.endsWith(".json"));
  assert.ok(fallbackLogPath);
  assert.match(alerts[1], /replacement regex is invalid/i);
  const fallbackLog = JSON.parse(writtenFiles.get(fallbackLogPath));
  assert.equal(fallbackLog.warnings[0].type, "invalid-tag-regex");
  assert.equal(fallbackLog.items[0].tagChanges[0].to, "science-technology");
  const manual = first + "\nQuesta parte è mia.\n";
  const updated = core.merge(manual, { ...item, title: "Titolo aggiornato" }, "2026-08-27T00:00:00Z", english);
  assert.match(updated, /# Titolo aggiornato/);
  assert.match(updated, /Questa parte è mia\./);
  assert.throws(() => core.merge("contenuto estraneo", item, "ora", italian), error => error.message === italian.fileConflict);
  assert.equal(core.safeFilename('A/B: C?'), "A-B- C-");
  assert.equal(core.safeFilename('CON.txt'), "CON-item.txt");
  assert.equal(core.htmlToMarkdown("<p>It&apos;s &amp; fine</p>"), "It's & fine");
  const rawTags = ["Science & Technology", "UPPER_case", "Research Methods", "research methods", "!!!"];
  const normalizedTags = core.normalizeTags(rawTags, true);
  assert.deepEqual(normalizedTags.tags, ["science-technology", "upper_case", "research-methods"]);
  assert.equal(normalizedTags.changes.length, 5);
  assert.equal(normalizedTags.changes[3].action, "duplicate-removed");
  assert.equal(normalizedTags.changes[4].action, "removed");
  assert.deepEqual(rawTags, ["Science & Technology", "UPPER_case", "Research Methods", "research methods", "!!!"]);
  assert.deepEqual(core.normalizeTags(rawTags, false).tags, rawTags);
  assert.equal(core.normalizeTags(["C++"], true, "[").error !== null, true);
  assert.deepEqual(core.normalizeTags(["Science & Tech"], true, "&").tags, ["science-tech"]);
  assert.equal(core.DEFAULT_TAG_PATTERN, "[^\\p{L}\\p{N}/_-]+");
  plugin.stop();
  assert.equal(preferenceObservers.size, 0);
  console.log("Test core superati");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
