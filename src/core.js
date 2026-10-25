/* Pure formatting functions. This file intentionally has no Zotero write API. */
var ZotpushCoreLocalization = typeof module !== "undefined"
  ? require("./i18n.js")
  : ZotpushI18n;
var ZoteroObsidianCore = (() => {
  "use strict";

  const START = "<!-- zotero-obsidian-readonly:start -->";
  const END = "<!-- zotero-obsidian-readonly:end -->";

  function text(value) {
    return String(value ?? "").replace(/\r\n?/g, "\n").trim();
  }

  function yamlString(value) {
    return JSON.stringify(text(value));
  }

  function yamlList(values, indent = 0) {
    const pad = " ".repeat(indent);
    const list = (values || []).map(text).filter(Boolean);
    return list.length ? "\n" + list.map(value => `${pad}  - ${yamlString(value)}`).join("\n") : " []";
  }

  function safeFilename(value, fallback = "untitled") {
    const cleaned = text(value)
      .normalize("NFKC")
      .replace(/[\\/:*?\"<>|\u0000-\u001f]/g, "-")
      .replace(/\s+/g, " ")
      .replace(/[. ]+$/g, "")
      .replace(/\.+/g, ".")
      .slice(0, 140)
      .trim();
    const extensionMatch = cleaned.match(/(\.[^./\\]+)$/);
    const stem = extensionMatch ? cleaned.slice(0, -extensionMatch[1].length) : cleaned;
    const reservedWindowsNames = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
    const safe = cleaned && reservedWindowsNames.test(stem) ? `${stem}-item${extensionMatch ? extensionMatch[1] : ""}` : cleaned;
    return safe || fallback;
  }

  function htmlToMarkdown(value) {
    return text(value)
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
      .replace(/<li[^>]*>/gi, "- ")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/gi, "'")
      .replace(/&#39;/gi, "'")
      .replace(/&#x27;/gi, "'")
      .replace(/&#x2F;/gi, "/")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function renderYAML(item, exportedAt) {
    const creators = (item.creators || []).map(c =>
      c.name || [c.firstName, c.lastName].filter(Boolean).join(" ")
    );
    const lines = [
      "---",
      `zotero_item_key: ${yamlString(item.key)}`,
      `zotero_library_id: ${yamlString(item.libraryID)}`,
      `citation_key: ${yamlString(item.citationKey)}`,
      `title: ${yamlString(item.title)}`,
      `authors:${yamlList(creators)}`,
      `date: ${yamlString(item.date)}`,
      `year: ${yamlString(item.year)}`,
      `item_type: ${yamlString(item.itemType)}`,
      `doi: ${yamlString(item.DOI)}`,
      `isbn: ${yamlString(item.ISBN)}`,
      `url: ${yamlString(item.url)}`,
      `collections:${yamlList(item.collections)}`,
      `tags:${yamlList(item.tags)}`,
      `zotero_uri: ${yamlString(item.zoteroURI)}`,
      `zotero_version: ${Number(item.version) || 0}`,
      `exported_at: ${yamlString(exportedAt)}`,
      "---"
    ];
    return lines.join("\n");
  }

  function renderGenerated(item, strings) {
    const out = [START, `# ${text(item.title) || strings.untitled}`];
    if (item.zoteroURI) out.push(`[${strings.openItem}](<${item.zoteroURI}>)`);
    if (item.abstract) out.push(`## ${strings.abstract}`, text(item.abstract));
    if (item.notes?.length) {
      out.push(`## ${strings.zoteroNotes}`);
      item.notes.forEach(note => out.push(`### ${strings.note} ${note.key}`, htmlToMarkdown(note.note)));
    }
    if (item.annotations?.length) {
      out.push(`## ${strings.annotationSection}`);
      item.annotations.forEach(annotation => {
        const page = annotation.pageLabel ? ` — p. ${annotation.pageLabel}` : "";
        const kind = strings.annotationTypes[annotation.type] || annotation.type || strings.annotation;
        out.push(`### ${kind}${page}`);
        if (annotation.text) out.push(`> ${text(annotation.text).replace(/\n/g, "\n> ")}`);
        if (annotation.comment) out.push(text(annotation.comment));
        if (annotation.imagePath) out.push(`![](${annotation.imagePath})`);
        else if (["image", "ink"].includes(annotation.type)) out.push(`_${strings.missingImage}_`);
        if (annotation.tags?.length) out.push(`${strings.tag}: ${annotation.tags.map(tag => `#${text(tag).replace(/\s+/g, "-")}`).join(" ")}`);
        if (annotation.openURI) out.push(`[${strings.openAnnotation}](<${annotation.openURI}>)`);
      });
    }
    out.push(END);
    return out.join("\n\n");
  }

  function merge(existing, item, exportedAt, strings = ZotpushCoreLocalization.getMessages("en")) {
    const generated = `${renderYAML(item, exportedAt)}\n\n${renderGenerated(item, strings)}`;
    if (!existing) return `${generated}\n\n## ${strings.personalNotes}\n`;
    const end = existing.indexOf(END);
    const start = existing.indexOf(START);
    if (start < 0 || end < start) {
      throw new Error(strings.fileConflict);
    }
    return generated + existing.slice(end + END.length);
  }

  return { START, END, safeFilename, htmlToMarkdown, renderYAML, renderGenerated, merge };
})();

if (typeof module !== "undefined") module.exports = ZoteroObsidianCore;
