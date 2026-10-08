# Changelog

## 0.3.0

- Add Plume-style `window` containers with a minimal title bar and window dots.
- Support `title`, `height`, and `gap`, nested containers, and edge-to-edge images.
- Preserve click-to-edit after scrolling within fixed-height windows.
- Include window styling in HTML exports and expand scrollable content for print.
- Preserve image-only paragraphs when parsing containers and fix standalone cleanup.
- See [WINDOW.md](WINDOW.md) for syntax, examples, and verification commands.

## 0.2.1

- Simplify colored blocks with borderless, softer backgrounds and balanced padding.
- Remove the left accent line and use smaller, lighter-weight titles.
- Make the edit button blend into the block until hovered or keyboard-focused.

## 0.2.0

- Keep development source in an external Git repository.
- Deploy an independent runtime copy outside Typora.app.
- Automatically restore the loader and plugin after bundle replacement using a
  per-user LaunchAgent, with file watches and a 60-second interval.
- Preserve each updated release's original HTML before patching it.
- Stop automatic repair when uninstalling.
- Test update recovery, idempotence, unsupported layouts, and removal.

## 0.1.0

- Preserve the initial working macOS plugin, supporting nine Plume-style
  container and alignment types, nested containers, and HTML export.
- Fix click-to-edit caret positioning using original text-node mappings.
- Fix flicker by retaining unchanged previews.
- Fix scroll drift by placing previews in the editor's native scroll container.
- Include browser and WebKit mouse/scroll regression tests.
