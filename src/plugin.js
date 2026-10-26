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
    this.reformatTagsPref = "extensions.zotero.zotpush.reformatTags";
    this.tagRegexPref = "extensions.zotero.zotpush.tagRegex";
    this.saveExportLogPref = "extensions.zotero.zotpush.saveExportLog";
    this.exportLogDirectoryPref = "extensions.zotero.zotpush.exportLogDirectory";
    this.filenameFormatPref = "extensions.zotero.zotpush.filenameFormat";
    this.citationTemplatePref = "extensions.zotero.zotpush.citationTemplate";
    this.citationPropertyPref = "extensions.zotero.zotpush.citationProperty";
    this.includeCitationAliasPref = "extensions.zotero.zotpush.includeCitationAlias";
    this.isDevelopment = addonId === "zotpush-md-dev@local";
    if (!this.Services.prefs.prefHasUserValue(this.languagePref)) {
      this.Services.prefs.setStringPref(this.languagePref, "auto");
    }
    if (!this.Services.prefs.prefHasUserValue(this.reformatTagsPref)) {
      this.Services.prefs.setBoolPref(this.reformatTagsPref, false);
    }
    if (!this.Services.prefs.prefHasUserValue(this.tagRegexPref)) {
      this.Services.prefs.setStringPref(this.tagRegexPref, core.DEFAULT_TAG_PATTERN);
    }
    if (!this.Services.prefs.prefHasUserValue(this.saveExportLogPref)) {
      this.Services.prefs.setBoolPref(this.saveExportLogPref, false);
    }
    if (!this.Services.prefs.prefHasUserValue(this.exportLogDirectoryPref)) {
      this.Services.prefs.setStringPref(this.exportLogDirectoryPref, "");
    }
    if (!this.Services.prefs.prefHasUserValue(this.filenameFormatPref)) {
      this.Services.prefs.setStringPref(this.filenameFormatPref, "citation-key");
    }
    if (!this.Services.prefs.prefHasUserValue(this.citationTemplatePref)) {
      this.Services.prefs.setStringPref(this.citationTemplatePref, "{author} ({year})");
    }
    if (!this.Services.prefs.prefHasUserValue(this.citationPropertyPref)) {
      this.Services.prefs.setStringPref(this.citationPropertyPref, "harvard");
    }
    if (!this.Services.prefs.prefHasUserValue(this.includeCitationAliasPref)) {
      this.Services.prefs.setBoolPref(this.includeCitationAliasPref, true);
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
      const exportSettings = {
        reformatTags: this.Services.prefs.getBoolPref(this.reformatTagsPref, false),
        tagRegex: this.Services.prefs.getStringPref(this.tagRegexPref, this.core.DEFAULT_TAG_PATTERN),
        saveExportLog: this.Services.prefs.getBoolPref(this.saveExportLogPref, false),
        exportLogDirectory: this.Services.prefs.getStringPref(this.exportLogDirectoryPref, "").trim(),
        filenameFormat: this.Services.prefs.getStringPref(this.filenameFormatPref, "citation-key"),
        citationTemplate: this.Services.prefs.getStringPref(this.citationTemplatePref, "{author} ({year})"),
        citationProperty: this.Services.prefs.getStringPref(this.citationPropertyPref, "harvard").trim(),
        includeCitationAlias: this.Services.prefs.getBoolPref(this.includeCitationAliasPref, true)
      };
      const log = {
        startedAt: new Date().toISOString(),
        language: this.language,
        outputDirectory: directory,
        settings: { ...exportSettings },
        warnings: [],
        items: []
      };
      let count = 0;
      const tagTotals = { formatted: 0, duplicates: 0, removed: 0 };
      const regexWarnings = new Set();
      let citationPropertyInvalid = false;
      let filenameFallbackCount = 0;
      let exportError = null;
      for (const item of selected) {
        try {
          const model = await this.readItem(item);
          const result = await this.writeMarkdown(directory, model, exportSettings);
          count++;
          if (result.filenameFallback) filenameFallbackCount++;
          if (result.citationPropertyInvalid) citationPropertyInvalid = true;
          for (const change of result.tagResult.changes) {
            if (change.action === "formatted") tagTotals.formatted++;
            else if (change.action === "duplicate-removed") tagTotals.duplicates++;
            else if (change.action === "removed") tagTotals.removed++;
          }
          if (result.tagResult.error) regexWarnings.add(result.tagResult.error);
          log.items.push({
            key: model.key,
            title: model.title,
            outputPath: result.path,
            citation: result.citation,
            aliases: result.aliases,
            status: "exported",
            tagChanges: result.tagResult.changes
          });
        } catch (error) {
          exportError = error;
          this.Zotero.logError(error);
          log.items.push({ key: item.key, status: "failed", error: error.message });
          break;
        }
      }
      const report = [];
      if (count) report.push(this.strings.exportComplete(count));
      if (exportError) report.push(this.strings.exportFailed(exportError.message));
      if (exportSettings.reformatTags) {
        report.push(this.strings.tagExportSummary(tagTotals.formatted, tagTotals.duplicates, tagTotals.removed));
      }
      if (regexWarnings.size) report.push(this.strings.tagPatternWarning);
      if (filenameFallbackCount) report.push(this.strings.filenameFallback(filenameFallbackCount));
      if (citationPropertyInvalid) report.push(this.strings.citationPropertyInvalid);
      log.warnings = [...regexWarnings].map(detail => ({
        type: "invalid-tag-regex",
        message: this.strings.tagPatternWarning,
        detail
      }));

      if (exportSettings.saveExportLog) {
        try {
          const logDirectory = exportSettings.exportLogDirectory || directory;
          await IOUtils.makeDirectory(logDirectory, { createAncestors: true, ignoreExisting: true });
          const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
          const logPath = PathUtils.join(logDirectory, `zotpush-export-${timestamp}.json`);
          log.finishedAt = new Date().toISOString();
          log.summary = {
            exported: count,
            tagChanges: tagTotals,
            filenameFallbacks: filenameFallbackCount,
            citationPropertyInvalid,
            failed: Boolean(exportError)
          };
          await IOUtils.writeUTF8(logPath, JSON.stringify(log, null, 2), { tmpPath: logPath + ".tmp" });
          report.push(this.strings.logSaved(logPath));
        } catch (error) {
          this.Zotero.logError(error);
          report.push(this.strings.logSaveFailed(error.message));
        }
      }
      if (report.length) this.alert(win, report.join("\n\n"));
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
        let position = data.annotationPosition || {};
        if (typeof position === "string") {
          try {
            position = JSON.parse(position || "{}") || {};
          } catch {
            position = {};
          }
        }
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

  async writeMarkdown(directory, model, exportSettings = {}) {
    const tagResult = this.core.normalizeTags(
      model.tags,
      exportSettings.reformatTags === true,
      exportSettings.tagRegex || this.core.DEFAULT_TAG_PATTERN
    );
    const citation = this.core.formatCitation(model, exportSettings.citationTemplate, this.strings);
    const citationPropertyInvalid = Boolean(exportSettings.citationProperty) &&
      !this.core.isSafeCustomYamlKey(exportSettings.citationProperty);
    const exportModel = {
      ...model,
      tags: tagResult.tags,
      citation,
      citationProperty: citationPropertyInvalid ? "" : exportSettings.citationProperty,
      aliases: this.core.buildAliases(model, citation, this.strings, exportSettings.includeCitationAlias)
    };
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
    const filenameBase = this.core.filenameBase(model, exportSettings.filenameFormat, this.strings);
    const matches = await this.findExistingMarkdown(directory, model);
    const preferredPath = PathUtils.join(directory, `${filenameBase}.md`);
    const existingFile = matches.find(match => match.path === preferredPath) || matches[0] || null;
    const path = await this.resolveMarkdownPath(directory, filenameBase, model, existingFile);
    let existing = existingFile?.content || "";
    if (!existing && await IOUtils.exists(path)) existing = await IOUtils.readUTF8(path);
    const output = this.core.merge(existing, exportModel, new Date().toISOString(), this.strings);
    await IOUtils.writeUTF8(path, output, { tmpPath: path + ".tmp" });
    if (existingFile && existingFile.path !== path) {
      try {
        await IOUtils.remove(existingFile.path);
      } catch (error) {
        this.Zotero.logError(error);
      }
    }
    return {
      path,
      tagResult,
      citation,
      aliases: exportModel.aliases,
      filenameFallback: exportSettings.filenameFormat === "citation-key" && !String(model.citationKey || "").trim(),
      citationPropertyInvalid
    };
  }

  async findExistingMarkdown(directory, model) {
    const children = await IOUtils.getChildren(directory);
    const matches = [];
    for (const path of children) {
      if (!PathUtils.filename(path).toLowerCase().endsWith(".md")) continue;
      const content = await IOUtils.readUTF8(path);
      const identity = this.core.getZoteroItemIdentity(content);
      if (identity?.key === String(model.key) && identity.libraryID === String(model.libraryID)) {
        matches.push({ path, content });
      }
    }
    return matches;
  }

  async resolveMarkdownPath(directory, filenameBase, model, existingFile) {
    const preferredPath = PathUtils.join(directory, `${filenameBase}.md`);
    if (existingFile?.path === preferredPath || !(await IOUtils.exists(preferredPath))) {
      return preferredPath;
    }

    const suffix = `${this.core.safeFilename(model.key, "item")}-${this.core.safeFilename(String(model.libraryID), "library")}`;
    for (let index = 0; index < 1000; index++) {
      const disambiguator = index ? `${suffix}-${index + 1}` : suffix;
      const candidate = PathUtils.join(directory, `${filenameBase} - ${disambiguator}.md`);
      if (existingFile?.path === candidate || !(await IOUtils.exists(candidate))) return candidate;
    }
    throw new Error(this.strings.filenameConflict(filenameBase));
  }

  alert(win, message) {
    this.Services.prompt.alert(win, this.addonName, message);
  }
};

if (typeof module !== "undefined") module.exports = ZoteroObsidianReadonlyPlugin;
