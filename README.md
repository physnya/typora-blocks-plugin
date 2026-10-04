# Plume Blocks for Typora (macOS)

A standalone browser plugin for Typora's WebKit editor. Supports Plume-style
`note`, `info`, `tip`, `warning`, `caution`, `details`, `left`, `center`, and `right`
containers, custom text titles, and nested containers.

```markdown
::: tip A useful tip
Write **ordinary Markdown** here.
:::

::: center
Centered text.
:::
```

Open `demo.md` in a newly opened Typora window to try every type.
Click text in a preview to edit that position in the original Markdown. Its
**Edit** button opens the beginning of the container. Click
outside the container to restore the preview. Click a details title to fold or
unfold it. `Cmd+Shift+B` disables previews for the current window; reopen that
window to enable them again. Typora's source mode always retains the `:::` text.

## Install / remove

Python 3 is required only for installation. From this directory:

```sh
python3 install.py /Applications/Typora.app
python3 install.py /Applications/Typora.app --uninstall
```

The installer adds one deferred script to
`Contents/Resources/TypeMark/index.html`, saving the original as
`index.html.before-plume-blocks`. Reinstallation is idempotent. Uninstall removes
only the loader, preserving unrelated HTML changes and the plugin source files.
Open a new Typora window after installing or removing the plugin. Existing
windows retain their loaded scripts until closed.

Keep a copy of this directory **outside Typora.app** for development and updates.
A Typora application update can replace the bundle and remove the plugin. Run
the installer from that external copy to reinstall it. Modifying a signed app's
resources changes its signature validation; this installer does not re-sign
Typora or change macOS security settings.

## Implementation

`plume-blocks.js` contains the CSS, container parser, live preview lifecycle, and
HTML export hook. There are no npm dependencies or network requests.

The parser recognizes delimiter lines in rendered paragraphs and the closing
delimiter Typora sometimes absorbs into a list's final item. It creates DOM
clones for the preview, preserving inline formatting and ordinary lists, tables,
images, and fenced code. Previews live outside `#write`, inside the same scrolling
parent as the editor. Their document coordinates stay fixed during scrolling;
there is no JavaScript scroll tracking. The original editable
nodes are temporarily hidden with classes and a height placeholder; they are
never replaced, reparented, or edited by the plugin. A text-node map links cloned
text and offsets to their original editable nodes. Click-to-edit reveals those
nodes and sets Typora's native selection at the clicked character. It preserves
the clicked line's vertical viewport position where the scroll limits allow.
Unchanged previews retain their DOM nodes and folding state during editing;
only previews whose source changed are rebuilt. Typora continues to own saving
and undo.

The export wrapper transforms the HTML returned by
`File.editor.export.exportToHTML` and embeds the plugin CSS. This is the native
HTML/PDF path in the inspected macOS Typora 1.14.10 bundle. HTML details export as
standard, initially collapsed `<details>` elements. Pandoc-based formats such as
Word and LaTeX are outside this hook. End-to-end native PDF export is not yet
verified.

## Scope and limitations

- Container delimiters must be at document level. Containers nested inside
  other containers work; container syntax inside blockquotes/list items is not
  supported. A list can be part of a document-level container.
- Close containers explicitly; incomplete and unknown containers remain literal.
- Use a longer fence for an outer container, e.g. `:::: tip` and `::::`.
- Titles are plain text. This is a visual implementation of these nine container
  types, not the complete VuePress or Plume Markdown engine.
- Read previews through the rendered blocks; use edit/source mode for selecting
  and copying their Markdown. Interactive math, diagram, and HTML widgets inside
  previews are cloned views rather than independent editor instances.
- Typora's internal HTML structure and export method are unofficial interfaces;
  a future release may require adapting the plugin.

## Verification

Open `tests/browser.html` in Safari. It runs 21 assertions covering all nine
types, custom titles, rich content, nesting, malformed syntax, literal code,
Typora soft breaks/list continuations, text preservation, live edits, details,
export transformation, and cleanup. Latest result: **21 passed, 0 failed**.

The additional interaction suite exercises real mouse clicks and typing in
headless WebKit. Run it from an external development copy of this directory:

```sh
npm install --no-save playwright
npx playwright install webkit
node tests/interaction.cjs
```

It checks synchronous alignment at six scroll positions, exact caret placement
in repeated/formatted text, viewport position, unchanged neighboring previews,
folding state, typing and leaving a block, nested text, and cleanup. All checks
passed. A native Typora test also clicked inside `TARGET`, inserted `X` to get
`TARXGET`, and verified the saved Markdown still contained `**TARXGET**`.

JavaScript syntax and installer round-trip checks also passed. Native Typora
1.14.10 loaded the final hook and displayed all nine types, a list, and a nested
container in the installed theme. Click-to-edit and click-outside-to-preview
worked. Saving the demo after these interactions produced a byte-for-byte match
with its original Markdown. The Safari fixture exercises WebKit directly
without modifying user documents.

## References

- [Plume containers](https://theme-plume.vuejs.press/guide/markdown/container/)
- [Plume alignment syntax](https://theme-plume.vuejs.press/guide/markdown/extensions/#%E8%87%AA%E5%AE%9A%E4%B9%89%E5%AF%B9%E9%BD%90)
- [obgnail/typora_plugin](https://github.com/obgnail/typora_plugin): inspiration
  for a script loader and renderer/export hooks. Its Node/Electron loader is not
  used in this browser-only macOS implementation. No upstream code is vendored.
