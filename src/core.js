/* Pure formatting functions. This file intentionally has no Zotero write API. */
var ZotpushCoreLocalization = typeof module !== "undefined"
  ? require("./i18n.js")
  : ZotpushI18n;
var ZoteroObsidianCore = (() => {
  "use strict";

  const START = "<!-- zotero-obsidian-readonly:start -->";
  const END = "<!-- zotero-obsidian-readonly:end -->";
  const DEFAULT_TAG_PATTERN = "[^\\p{L}\\p{N}/_-]+";
  const RESERVED_YAML_KEYS = new Set([
    "zotero_item_key", "zotero_library_id", "citation_key", "title", "authors",
    "date", "year", "item_type", "doi", "isbn", "url", "collections", "tags",
    "zotero_uri", "zotero_version", "exported_at", "aliases"
  ]);

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

  function normalizeTags(tags, enabled, pattern = DEFAULT_TAG_PATTERN) {
    const originalTags = (tags || []).map(tag => String(tag ?? ""));
    if (!enabled) return { tags: originalTags, changes: [], error: null };

    let replacementPattern;
    let error = null;
    try {
      replacementPattern = new RegExp(pattern || DEFAULT_TAG_PATTERN, "gu");
    } catch (regexError) {
      replacementPattern = new RegExp(DEFAULT_TAG_PATTERN, "gu");
      error = regexError.message;
    }

    const normalizedTags = [];
    const changes = [];
    const seen = new Set();
    for (const original of originalTags) {
      const normalized = original.normalize("NFKC").toLowerCase()
        .replace(replacementPattern, "-")
        .replace(/[^\p{L}\p{N}/_-]+/gu, "-")
        .replace(/-+/g, "-")
        .replace(/\/+/g, "/")
        .replace(/^[-/]+|[-/]+$/g, "");

      if (!normalized) {
        changes.push({ from: original, to: "", action: "removed" });
      } else if (seen.has(normalized)) {
        changes.push({ from: original, to: normalized, action: "duplicate-removed" });
      } else {
        seen.add(normalized);
        normalizedTags.push(normalized);
        if (normalized !== original) changes.push({ from: original, to: normalized, action: "formatted" });
      }
    }

    return { tags: normalizedTags, changes, error };
  }

  function filenameBase(item, format, strings) {
    const key = safeFilename(item.key, "item");
    const title = safeFilename(item.title, strings.untitled);
    const titleAndKey = `${title} - ${key}`;
    const citationKey = text(item.citationKey);
    if (format === "citation-key" && citationKey) {
      return safeFilename(citationKey, titleAndKey);
    }
    return titleAndKey;
  }

  function formatCitation(item, template, strings) {
    const creators = (item.creators || []).map(creator => ({
      short: text(creator.lastName || creator.name || [creator.firstName, creator.lastName].filter(Boolean).join(" ")),
      full: text(creator.name || [creator.firstName, creator.lastName].filter(Boolean).join(" "))
    })).filter(creator => creator.short);
    const shortAuthors = creators.length === 0 ? strings.citationNoAuthor
      : creators.length === 1 ? creators[0].short
        : creators.length === 2 ? `${creators[0].short} ${strings.citationAnd} ${creators[1].short}`
          : `${creators[0].short} et al.`;
    const values = {
      author: shortAuthors,
      authors: creators.map(creator => creator.full).join("; ") || strings.citationNoAuthor,
      year: text(item.year) || strings.citationNoYear,
      title: text(item.title),
      citationKey: text(item.citationKey),
      key: text(item.key)
    };
    return String(template || "{author} ({year})")
      .replace(/\{([A-Za-z]+)\}/g, (placeholder, name) =>
        Object.hasOwn(values, name) ? values[name] : placeholder
      ).trim();
  }

  function buildAliases(item, citation, strings, includeCitation = true) {
    const candidates = [
      `${text(item.title) || strings.untitled} - ${text(item.key)}`,
      text(item.citationKey),
      includeCitation ? text(citation) : ""
    ].filter(Boolean);
    const seen = new Set();
    return candidates.filter(alias => {
      const normalized = alias.toLocaleLowerCase();
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
  }

  function isSafeCustomYamlKey(key) {
    const normalized = text(key).toLowerCase();
    return /^[A-Za-z_][A-Za-z0-9_-]*$/.test(key) && !RESERVED_YAML_KEYS.has(normalized);
  }

  function getFrontMatter(markdown) {
    const frontMatter = String(markdown || "").match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/);
    if (!frontMatter) return null;
    const values = {};
    for (const line of frontMatter[1].split(/\r?\n/)) {
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*(.*)$/);
      if (!match) continue;
      const [, name, rawValue] = match;
      try {
        values[name] = JSON.parse(rawValue);
      } catch {
        values[name] = rawValue.replace(/^['"]|['"]$/g, "");
      }
    }
    return values;
  }

  function getZoteroItemIdentity(markdown) {
    const frontMatter = getFrontMatter(markdown);
    if (!frontMatter || !frontMatter.zotero_item_key) return null;
    return {
      key: String(frontMatter.zotero_item_key),
      libraryID: String(frontMatter.zotero_library_id ?? "")
    };
  }

  function getZoteroItemKey(markdown) {
    return getZoteroItemIdentity(markdown)?.key || "";
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
    ];
    if (item.aliases?.length) lines.push(`aliases:${yamlList(item.aliases)}`);
    if (item.citationProperty && item.citation && isSafeCustomYamlKey(item.citationProperty)) {
      lines.push(`${item.citationProperty}: ${yamlString(item.citation)}`);
    }
    lines.push("---");
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

  return {
    START, END, DEFAULT_TAG_PATTERN, safeFilename, htmlToMarkdown, normalizeTags,
    filenameBase, formatCitation, buildAliases, isSafeCustomYamlKey, getFrontMatter,
    getZoteroItemIdentity, getZoteroItemKey,
    renderYAML, renderGenerated, merge
  };
})();

if (typeof module !== "undefined") module.exports = ZoteroObsidianCore;
