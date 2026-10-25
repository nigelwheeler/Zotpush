var ZoteroObsidianReadonly;
var pluginRootURI;

async function startup({ id, rootURI }) {
  await Zotero.initializationPromise;
  pluginRootURI = rootURI;
  Services.scriptloader.loadSubScript(rootURI + "src/i18n.js");
  await Zotero.PreferencePanes.register({
    pluginID: id,
    id: `${id.replace(/[^a-zA-Z0-9_-]/g, "-")}-zotpush-preferences`,
    src: rootURI + "preferences.xhtml",
    scripts: [rootURI + "src/i18n.js", rootURI + "src/preferences.js"]
  });
  Services.scriptloader.loadSubScript(rootURI + "src/core.js");
  Services.scriptloader.loadSubScript(rootURI + "src/plugin.js");
  ZoteroObsidianReadonly = new ZoteroObsidianReadonlyPlugin(
    Zotero,
    Services,
    ZoteroObsidianCore,
    id,
    ZotpushI18n
  );
  ZoteroObsidianReadonly.start();
}

function shutdown() {
  ZoteroObsidianReadonly?.stop();
  ZoteroObsidianReadonly = null;
  pluginRootURI = null;
}

function install() {}
function uninstall() {}

function onMainWindowLoad({ window }) {
  ZoteroObsidianReadonly?.addToWindow(window);
}

function onMainWindowUnload({ window }) {
  ZoteroObsidianReadonly?.removeFromWindow(window);
}
