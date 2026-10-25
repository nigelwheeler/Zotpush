# ZotPush MD

ZotPush MD is a Zotero add-on that exports selected library items to standalone Markdown files with YAML front matter, notes, annotations, and images. The files can be used with Obsidian or any other Markdown-compatible tool.

Current version: 0.3.1.

## Core guarantee

The add-on does not modify Zotero items, notes, annotations, tags, collections, attachments, or the Zotero database. The data flow is exclusively `Zotero → Markdown files`. The only files it writes are in the output folder chosen by the user. `npm test` includes a static check for prohibited mutating APIs.

## Build and install

To inspect the source and build an XPI locally, you need Node.js and npm. The test script also requires Bash and ripgrep. Building requires `zip`, or `tar.exe` on Windows.

```bash
git clone https://github.com/paolovolterra/Zotpush.git
cd Zotpush
npm.cmd test
npm.cmd run build
```

In PowerShell, use `npm.cmd` if the execution policy blocks the `npm.ps1` shim. Elsewhere, use `npm` in place of `npm.cmd`.

`npm test` runs the formatter tests and a static audit for mutating calls to Zotero. `npm run build` creates `dist/zotpush-md-0.3.1.xpi`. `npm run build:dev` creates `dist/zotpush-md-0.3.1-dev.xpi`, with the display name **ZotPush MD (Development)** and a separate add-on ID so it can be installed alongside the release. The development menu item is also marked `(Development)`. The dev manifest retains the required upstream update URL, but the upstream feed has no entry for the dev add-on ID. The project has no npm dependencies and does not require `npm install`. The audit checks the supplied source; review the code as well if you need an independent assessment.

The add-on's **Language / Lingua** menu offers **Automatic**, **English**, and **Italiano**. Automatic follows Zotero's installation language when Italian is selected and otherwise falls back to English. The choice is saved separately for each add-on installation. The menu, dialogs, errors, and add-on-generated Markdown text use the selected language; Zotero metadata and YAML field names remain unchanged.

To install either XPI, in Zotero choose **Tools → Add-ons → gear icon → Install Add-on From File**, then select the XPI. Select one or more library items, then choose **Push selezione in Markdown…** from the Tools menu or the item's context menu. That menu label is currently Italian in the add-on.

The Markdown filename includes the Zotero key to avoid collisions. Re-exports replace the YAML front matter and generated content while preserving anything after the final marker. If a file with the same name does not contain the add-on's markers, export stops without overwriting it.

The Markdown filename uses the Zotero item title, cleaned of filesystem-invalid characters, followed by its Zotero key:

```text
Zotero title - KEY.md
```

Alternatively, download the prebuilt XPI from the [GitHub release](https://github.com/paolovolterra/Zotpush/releases/tag/v0.3.1).

SHA-256 of the distributed XPI (`zotpush-md-0.3.1.xpi`):

```text
b8ef61825b64896bc0f6282d94aacbc8fd2365910e4b8f3b85b99e99d2f73ec6
```

Verify it with `sha256sum zotpush-md-0.3.1.xpi` on Linux, `shasum -a 256 zotpush-md-0.3.1.xpi` on macOS, or `Get-FileHash .\zotpush-md-0.3.1.xpi -Algorithm SHA256` in PowerShell. The [updates.json](updates.json) feed contains the same hash. A locally built XPI may have a different hash because of ZIP archive metadata; the hash above identifies the release file.

Version 0.3.1 is also archived on [Zenodo](https://doi.org/10.5281/zenodo.22901556), DOI `10.5281/zenodo.22901556`. The deposit contains the installable XPI and a separate ZIP with the source, tests, and build scripts. SHA-256 of `zotpush-md-source-v0.3.1.zip`:

```text
9255052fbb0c6fa236c86fc21829b21313f689405be69178457df4598516e733
```

## Version 0.3.1 limitations

- Exports only items selected manually.
- Reads the citation key from the available field or the `Citation Key:` line in Extra (compatible with Better BibTeX when available).
- Copies annotation images already present in the local cache to `assets/zotero-KEY/` and embeds them using relative Markdown links (`![](./assets/...)`), compatible with Obsidian, Markdown previews, and HTML rendering. The add-on does not force the cache to be created, since that would write to Zotero's data area.
- Declared compatibility: Zotero 9.0.x and Zotero 10.0.x. Automated tests and the static audit pass; compatibility with the Zotero 10 interface still needs testing across different installations.

## How ZotPush MD relates to zlb

[zlb](https://github.com/paolovolterra/zotero-llm-bridge) searches for and imports PDFs into the library through Zotero's local API. ZotPush MD starts from the library and exports selected references and annotations to Markdown. The tools are independent and cover different steps in the same research workflow.

ZotPush MD does not transmit library contents and contains no telemetry. Zotero may contact GitHub to check for updates listed in `updates.json`. The add-on writes only to the Markdown folder chosen by the user; it does not modify Zotero data.

## Planned improvements

- Make batch exports more resilient: if one document fails, continue with the remaining documents instead of aborting the whole batch.
- Provide a final summary separating files created, updated, skipped, and not exported, with the reason for each error.
- Add an optional mode to embed images as Base64 in the Markdown. The default would remain separate files in `assets/`, which are smaller, readable, and Git-friendly.

## Source and updates

The [GitHub repository](https://github.com/paolovolterra/Zotpush) is public. Releases contain the installable XPI; `updates.json` tells Zotero where to find the available version and its SHA-256 hash. This is a preview release; bug reports and suggestions can be opened in [Issues](https://github.com/paolovolterra/Zotpush/issues).

## Development

The XPI is a standard ZIP archive containing `manifest.json`, `bootstrap.js`, and `src/`. Run `npm test` to check the formatter and the read-only constraint.

## License

ZotPush MD is open-source software distributed under the [MIT License](LICENSE).
