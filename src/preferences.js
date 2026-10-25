var ZotpushPreferences = (() => {
  "use strict";

  const languagePref = "extensions.zotero.zotpush.language";

  async function init(event, services = Services, zotero = Zotero, localization = ZotpushI18n) {
    const pane = event.currentTarget || event.target;
    const caption = pane.querySelector("caption");
    const description = pane.querySelector(".description");
    const languageLabel = pane.querySelector(".language-label");
    const menu = pane.querySelector("menulist");
    const options = menu.querySelectorAll("menuitem");

    function update() {
      const setting = services.prefs.getStringPref(languagePref, "auto");
      const language = localization.resolveLanguage(setting, zotero.locale);
      const strings = localization.getMessages(language);
      caption.setAttribute("label", strings.languageSettingsTitle);
      description.setAttribute("value", strings.languageSettingsDescription);
      languageLabel.setAttribute("value", strings.languageSettingLabel);
      options.forEach((option, index) => {
        const label = index === 0 ? strings.languageAutomatic
          : index === 1 ? strings.languageEnglish
            : strings.languageItalian;
        option.setAttribute("label", label);
      });
      menu.value = setting;
    }

    menu.addEventListener("command", () => {
      if (["auto", "en", "it"].includes(menu.value)) {
        services.prefs.setStringPref(languagePref, menu.value);
        update();
      }
    });
    update();
  }

  return { init };
})();

if (typeof module !== "undefined") module.exports = ZotpushPreferences;