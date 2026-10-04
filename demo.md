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

## Literal code stays literal

```md
::: warning
This is a code sample, not a callout.
:::
```

End of demonstration.
