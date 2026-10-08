# Plume Blocks for Typora

Click a rendered container to edit its Markdown. Click outside to preview it again.
The **Edit** button also opens a collapsed details container for editing.

::: note
An ordinary note with **bold**, *italic*, and `inline code`.
:::

::: info Information
The Markdown stays compatible with VuePress / Plume.
:::

::: tip Helpful tip
Use a custom title after the container type.

- Lists remain Markdown.
- Links and emphasis remain editable.
:::

::: warning 注意
这是一个警告框。中文输入和原始 Markdown 由 Typora 处理。
:::

::: caution STOP
Check your work before continuing.
:::

::: details Click to view the code
```js
console.log('Hello, Plume!');
```
:::

::: left
Left-aligned content.
:::

::: center
**Centered content.**
:::

::: right
Right-aligned content.
:::

:::: tip Nested containers
::: center
A centered paragraph inside a tip.
:::
::::

## Window containers

::: window title="A simple example"
### Ordinary Markdown

A window can contain **formatted text**, lists, tables, images, and code.

```js
console.log('Hello from a window');
```
:::

:::: window title="Nested containers" height="180px" gap="24px"
::: tip A useful tip
Existing containers work inside windows too.
:::

Scroll within this window when its content exceeds the configured height.

1. The title bar stays in place.
2. The content scrolls naturally.
3. Click any text to edit the corresponding Markdown.
4. Click outside to restore the preview.
::::

## Literal code stays literal

```md
::: warning
This is a code sample, not a callout.
:::
```

End of demonstration.
