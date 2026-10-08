# Window containers

Added in **v0.3.0**, following [Plume's window syntax](https://theme-plume.vuejs.press/guide/markdown/window/).

```markdown
::: window title="Example" height="200px" gap="20px"
### A heading

Write **ordinary Markdown** here.
:::
```

All three options are optional:

| Option | Meaning | Default |
| --- | --- | --- |
| `title` | Plain text in the window's title bar | No title |
| `height` | Content area height; excess content scrolls | Automatic |
| `gap` | Left and right content padding | `20px`, or `0px` for an image-only window |

Sizes accept CSS lengths such as `200px` or `12rem`; plain numbers use pixels.
Values may use double quotes, single quotes, or no quotes when they contain no
spaces. Invalid sizes, unknown options, and unfinished attributes leave the
container literal so its Markdown can be corrected. Close each container with
`:::`. For nested containers, use a longer outer fence:

```markdown
:::: window title="Nested example"
::: tip Note
This tip appears inside the window.
:::
::::
```

For an image without surrounding padding:

```markdown
::: window
![Example](./example.png)
:::
```

The restrained frame uses three decorative window dots and an optional centered
title. Click text or the title to edit that exact Markdown position. The existing
Edit button opens the container source. Window dots are decorative, not controls.
Fixed-height content uses native scrolling, including the mouse wheel/trackpad.

Rendered headings, lists, tables, images, code, and HTML are retained from
Typora's output. Vue components are not compiled: Typora does not provide the
VuePress/Vue runtime. This feature does not add an iframe or execute demo scripts.
HTML export includes the frame and its styles. Print styles expand fixed-height
windows to keep their contents visible; native PDF export has not been verified.

## Verification

```sh
node tests/interaction.cjs
node tests/window.cjs
```

Requires Playwright with its WebKit browser, as described in the README.
The browser suite has 28 checks, including window options, image-only content,
nested containers, literal code, invalid attributes, and HTML export. The window
interaction suite checks dimensions, native inner scrolling, caret placement
after scrolling, title-attribute editing, and unclipped print layout.

Native Typora verification displayed titled windows and an image-only window,
scrolled the fixed-height content independently of the page, and saved the
original window syntax and image reference successfully.
