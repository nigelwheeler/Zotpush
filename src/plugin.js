/* global ZoteroObsidianCore, Cc, Ci */
var ZoteroObsidianReadonlyPlugin = class ZoteroObsidianReadonlyPlugin {
  constructor(ZoteroAPI, ServicesAPI, core, addonId = "zotero-obsidian-readonly@example.com", localization = ZotpushI18n) {
    this.Zotero = ZoteroAPI;
    this.Services = ServicesAPI;
    this.core = core;
    this.localization = localization;
    const idPrefix = addonId.replace(/[^a-zA-Z0-9_-]/g, "-");
    this.toolsMenuID = `${idPrefix}-zotpush-export-tools`;
    this.contextMenuID = `${idPrefix}-zotpush-export-context`;
    this.languagePref = "extensions.zotero.zotpush.language";
    this.isDevelopment = addonId === "zotpush-md-dev@local";
    if (!this.Services.prefs.prefHasUserValue(this.languagePref)) {
      this.Services.prefs.setStringPref(this.languagePref, "auto");
    }
    this.languageObserver = {
      observe: (_subject, topic, preference) => {
        if (topic !== "nsPref:changed" || preference !== this.languagePref) return;
        this.updateLanguage();
        for (const win of this.windows) this.updateWindowLabels(win);
      }
    };
    this.updateLanguage();
    this.windows = new Set();
  }

  updateLanguage() {
    try {
      const savedLanguage = this.Services.prefs.getStringPref(this.languagePref, "auto");
      this.languageSetting = ["auto", "en", "it"].includes(savedLanguage) ? savedLanguage : "auto";
    } catch {
      this.languageSetting = "auto";
    }
    this.language = this.localization.resolveLanguage(this.languageSetting, this.Zotero.locale);
    this.strings = this.localization.getMessages(this.language);
    this.addonName = this.strings.addonName + (this.isDevelopment ? this.strings.developmentSuffix : "");
    this.exportMenuLabel = this.strings.exportMenu + (this.isDevelopment ? this.strings.developmentSuffix : "");
  }

  updateWindowLabels(win) {
    const exportItem = win.document.getElementById(this.toolsMenuID);
    const contextItem = win.document.getElementById(this.contextMenuID);
    exportItem?.setAttribute("label", this.exportMenuLabel);
    contextItem?.setAttribute("label", this.exportMenuLabel);
  }

  start() {
    this.Services.prefs.addObserver(this.languagePref, this.languageObserver);
    for (const win of this.Zotero.getMainWindows()) this.addToWindow(win);
  }

  stop() {
    this.Services.prefs.removeObserver(this.languagePref, this.languageObserver);
    for (const win of this.windows) this.removeFromWindow(win);
  }

  addToWindow(win) {
    if (!win || win.document.getElementById(this.toolsMenuID)) return;
    const popup = win.document.getElementById("menu_ToolsPopup");
    if (!popup) return;
    const item = win.document.createXULElement("menuitem");
    item.id = this.toolsMenuID;
    item.setAttribute("label", this.exportMenuLabel);
    item.addEventListener("command", () => this.exportSelection(win));
    popup.appendChild(item);

    const contextPopup = win.document.getElementById("zotero-itemmenu");
    if (contextPopup) {
      const contextItem = win.document.createXULElement("menuitem");
      contextItem.id = this.contextMenuID;
      contextItem.setAttribute("label", this.exportMenuLabel);
      contextItem.addEventListener("command", () => this.exportSelection(win));
      const updateVisibility = () => {
        const hasRegularItem = win.ZoteroPane.getSelectedItems()
          .some(selected => selected.isRegularItem());
        contextItem.hidden = !hasRegularItem;
      };
      contextItem._zoteroObsidianPopupHandler = updateVisibility;
      contextPopup.addEventListener("popupshowing", updateVisibility);
      contextPopup.appendChild(contextItem);
    }
    this.windows.add(win);
    this.updateWindowLabels(win);
  }

  removeFromWindow(win) {
    win?.document.getElementById(this.toolsMenuID)?.remove();
    const contextItem = win?.document.getElementById(this.contextMenuID);
    const contextPopup = win?.document.getElementById("zotero-itemmenu");
    if (contextItem?._zoteroObsidianPopupHandler) {
      contextPopup?.removeEventListener(
        "popupshowing",
        contextItem._zoteroObsidianPopupHandler
      );
    }
    contextItem?.remove();
    this.windows.delete(win);
  }

  async chooseDirectory(win) {
    const picker = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
    picker.init(win.browsingContext, `${this.strings.chooseDirectory}${this.isDevelopment ? this.strings.developmentSuffix : ""}`, Ci.nsIFilePicker.modeGetFolder);
    const result = await new Promise(resolve => picker.open(resolve));
    if (result !== Ci.nsIFilePicker.returnOK) return null;
    return picker.file.path;
  }

  async exportSelection(win) {
    try {
      const selected = win.ZoteroPane.getSelectedItems().filter(item => item.isRegularItem());
      if (!selected.length) {
        this.alert(win, this.strings.selectItems);
        return;
      }
      const directory = await this.chooseDirectory(win);
      if (!directory) return;
      let count = 0;
      for (const item of selected) {
        const model = await this.readItem(item);
        await this.writeMarkdown(directory, model);
        count++;
      }
      this.alert(win, this.strings.exportComplete(count));
    } catch (error) {
      this.Zotero.logError(error);
      this.alert(win, this.strings.exportFailed(error.message));
    }
  }

  async readItem(item) {
    const libraryPrefix = this.Zotero.API.getLibraryPrefix(item.libraryID);
    const extra = item.getField("extra") || "";
    const citationKey = item.getField("citationKey") ||
      (extra.match(/^Citation Key:\s*(.+)$/mi)?.[1] || "").trim();
    const collections = item.getCollections().map(id => this.Zotero.Collections.get(id)?.name).filter(Boolean);
    const notes = this.Zotero.Items.get(item.getNotes()).map(note => ({ key: note.key, note: note.getNote() }));
    const annotations = [];
    for (const attachment of this.Zotero.Items.get(item.getAttachments())) {
      for (const annotation of attachment.getAnnotations()) {
        const data = annotation.toJSON();
        const position = typeof data.annotationPosition === "string"
          ? JSON.parse(data.annotationPosition || "{}") : (data.annotationPosition || {});
        let imageSourcePath = "";
        if (["image", "ink"].includes(data.annotationType) &&
            await this.Zotero.Annotations.hasCacheImage(annotation)) {
          imageSourcePath = this.Zotero.Annotations.getCacheImagePath(annotation);
        }
        const pageLabel = data.annotationPageLabel ||
          (Number.isInteger(position.pageIndex) ? position.pageIndex + 1 : "");
        annotations.push({
          key: annotation.key,
          type: data.annotationType,
          text: data.annotationText,
          comment: data.annotationComment,
          pageLabel,
          tags: annotation.getTags().map(tag => tag.tag),
          imageSourcePath,
          openURI: `zotero://open-pdf/${libraryPrefix}/items/${attachment.key}` +
            `?page=${encodeURIComponent(pageLabel || 1)}&annotation=${annotation.key}`
        });
      }
    }
    const date = item.getField("date") || "";
    return {
      key: item.key,
      libraryID: item.libraryID,
      version: item.version,
      citationKey,
      title: item.getField("title"),
      creators: item.getCreators(),
      date,
      year: date.match(/\b(\d{4})\b/)?.[1] || "",
      itemType: this.Zotero.ItemTypes.getName(item.itemTypeID),
      DOI: item.getField("DOI"),
      ISBN: item.getField("ISBN"),
      url: item.getField("url"),
      abstract: item.getField("abstractNote"),
      collections,
      tags: item.getTags().map(tag => tag.tag),
      notes,
      annotations,
      zoteroURI: `zotero://select/${libraryPrefix}/items/${item.key}`
    };
  }

  async writeMarkdown(directory, model) {
    const assetRelativeDir = `./assets/zotero-${model.key}`;
    const assetDir = PathUtils.join(directory, "assets", `zotero-${model.key}`);
    for (const annotation of model.annotations) {
      if (!annotation.imageSourcePath) continue;
      await IOUtils.makeDirectory(assetDir, { createAncestors: true, ignoreExisting: true });
      const imageName = `${annotation.key}.png`;
      const destination = PathUtils.join(assetDir, imageName);
      await IOUtils.copy(annotation.imageSourcePath, destination, { noOverwrite: false });
      annotation.imagePath = `${assetRelativeDir}/${imageName}`;
    }
    const leaf = `${this.core.safeFilename(model.title, this.strings.untitled)} - ${model.key}.md`;
    const path = PathUtils.join(directory, leaf);
    let existing = "";
    if (await IOUtils.exists(path)) existing = await IOUtils.readUTF8(path);
    const output = this.core.merge(existing, model, new Date().toISOString(), this.strings);
    await IOUtils.writeUTF8(path, output, { tmpPath: path + ".tmp" });
  }

  alert(win, message) {
    this.Services.prompt.alert(win, this.addonName, message);
  }
};

if (typeof module !== "undefined") module.exports = ZoteroObsidianReadonlyPlugin;
