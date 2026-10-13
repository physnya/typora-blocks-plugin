/* Plume containers for Typora's macOS WebKit editor. No Node runtime required. */
(() => {
  "use strict";
  const css = `.plume-container {
  --plume-accent: #606b7a;
  --plume-bg: rgba(142, 150, 170, .08);
  margin: 1em 0;
  padding: 16px 18px;
  border: 0;
  border-radius: 8px;
  background: var(--plume-bg);
  color: inherit;
  overflow-wrap: anywhere;
  text-align: left;
}
.plume-info { --plume-accent: #356da6; --plume-bg: rgba(57, 132, 213, .08); }
.plume-tip { --plume-accent: #327b57; --plume-bg: rgba(41, 151, 100, .08); }
.plume-warning { --plume-accent: #926a20; --plume-bg: rgba(218, 162, 35, .10); }
.plume-caution { --plume-accent: #b34d59; --plume-bg: rgba(219, 71, 87, .08); }
.plume-container > .plume-title {
  margin: 0 0 .4em;
  padding: 0;
  font-size: .95em;
  font-weight: 600;
  line-height: 1.5;
  color: var(--plume-accent);
}
.plume-container > :last-child { margin-bottom: 0; }
.plume-container > summary.plume-title { cursor: pointer; }
.plume-container:not([open]) > summary.plume-title { margin-bottom: 0; }
.plume-align { margin: 1em 0; }
.plume-left, .plume-left > p { text-align: left; }
.plume-center, .plume-center > p { text-align: center; }
.plume-right, .plume-right > p { text-align: right; }
.plume-align pre, .plume-align code { text-align: left; }
.plume-window {
  margin: 1em 0; border: 1px solid rgba(128, 128, 128, .22);
  border-radius: 8px; overflow: hidden; color: inherit; text-align: left;
}
.plume-window-header {
  display: grid; grid-template-columns: 48px minmax(0, 1fr) 48px;
  align-items: center; gap: 8px; min-height: 36px; padding: 0 12px;
  background: rgba(128, 128, 128, .08); border-bottom: 1px solid rgba(128, 128, 128, .16);
}
.plume-window-dots { display: flex; gap: 5px; }
.plume-window-dots i { width: 9px; height: 9px; border-radius: 50%; background: #df7772; }
.plume-window-dots i:nth-child(2) { background: #dfb45e; }
.plume-window-dots i:nth-child(3) { background: #72b68b; }
.plume-window-title {
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  text-align: center; font-size: .85em; font-weight: 500; opacity: .8;
}
.plume-window-content {
  box-sizing: border-box; height: var(--plume-window-height, auto);
  padding: 16px var(--plume-window-gap, 20px); overflow: auto; overflow-wrap: anywhere;
}
.plume-window-content > :first-child { margin-top: 0; }
.plume-window-content > :last-child { margin-bottom: 0; }
.plume-window-image { padding-top: 0; padding-bottom: 0; }
.plume-window-image img { display: block; max-width: 100%; height: auto; margin: 0; }
#write > .plume-source { display: none !important; }
#write > .plume-anchor {
  display: block !important;
  visibility: hidden !important;
  height: var(--plume-height, 0px) !important;
  min-height: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  margin: 1em 0 !important;
  overflow: hidden !important;
  box-sizing: border-box !important;
}
.plume-host { position: relative; }
#plume-layer { position: absolute; top: 0; left: 0; width: 100%; height: 0; z-index: 10; pointer-events: none; }
#plume-layer[hidden], .plume-preview[hidden] { display: none !important; }
.plume-preview { position: absolute; pointer-events: auto; white-space: normal; }
.plume-preview > :first-child { margin-top: 0; }
.plume-preview > :nth-last-child(2) { margin-bottom: 0; }
.plume-preview p { margin: .6em 0; white-space: pre-wrap; }
.plume-preview img { max-width: 100%; }
.plume-preview pre { padding: 12px; overflow: auto; background: rgba(128,128,128,.1); border-radius: 5px; }
.plume-preview table { width: 100%; border-collapse: collapse; }
.plume-preview td, .plume-preview th { padding: 6px 10px; border: 1px solid rgba(128,128,128,.3); }
.plume-preview .md-meta { display: none; }
.plume-preview .plume-edit {
  position: absolute; right: 8px; top: 5px;
  border: 0; border-radius: 4px; padding: 2px 7px;
  background: transparent; color: inherit;
  font: 11px/1.5 -apple-system, sans-serif;
  cursor: pointer; opacity: 0;
}
.plume-preview:hover .plume-edit, .plume-preview:focus-within .plume-edit { opacity: .6; }
.plume-preview .plume-edit:hover, .plume-preview .plume-edit:focus-visible { opacity: 1; background: rgba(128, 128, 128, .1); }
@media (prefers-color-scheme: dark) {
  .plume-container { --plume-accent: #a3adbd; }
  .plume-info { --plume-accent: #73b4ff; }
  .plume-tip { --plume-accent: #66c997; }
  .plume-warning { --plume-accent: #e4bc65; }
  .plume-caution { --plume-accent: #f28695; }
}
@media print {
  .plume-container { break-inside: avoid; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  .plume-edit { display: none; }
  .plume-window-content { height: auto; overflow: visible; }
}
`;
  const stylesheet = document.createElement("style");
  stylesheet.id = "plume-blocks-css";
  stylesheet.textContent = css;
  document.head.append(stylesheet);
  const titles = { note: "Note", info: "Info", tip: "Tip", warning: "Warning", caution: "Caution", details: "Details" };
  const alignments = new Set(["left", "center", "right"]);
  const supported = token => Object.hasOwn(titles, token.type) || alignments.has(token.type) ||
    (token.type === "window" && token.options !== null);
  const origins = new WeakMap();

  function windowOptions(info = "") {
    const options = {};
    const pattern = /\s*(title|height|gap)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"']+))(?:\s+|$)/gy;
    let end = 0;
    let match;
    while ((match = pattern.exec(info))) {
      const [, name, double, single, bare] = match;
      const value = double ?? single ?? bare;
      if (name === "title") {
        options.title = value;
        const assignment = match[0].trimEnd();
        options.titleOffset = match.index + assignment.length - value.length - (bare === undefined ? 1 : 0);
      } else {
        const length = /^\d+(?:\.\d+)?$/.test(value) ? `${value}px` : value;
        if (!CSS.supports(name === "height" ? "height" : "padding-left", length)) return null;
        options[name] = length;
      }
      end = pattern.lastIndex;
    }
    return end === info.length ? options : null;
  }

  function copyWithOrigins(node) {
    const clone = node.cloneNode(true);
    origins.set(clone, origins.get(node) || { node });
    const source = document.createTreeWalker(node, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    const target = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let child;
    while ((child = source.nextNode())) {
      const copy = target.nextNode();
      if (child.nodeType === Node.TEXT_NODE || child.nodeName === "BLOCKQUOTE") {
        origins.set(copy, origins.get(child) || { node: child, offset: 0 });
      }
    }
    return clone;
  }

  function originAt(node, offset) {
    const origin = origins.get(node);
    return origin && { ...origin, offset: origin.offset + offset };
  }

  // Work on clones only. Typora owns all editable text and its Markdown model.
  function cloneBlock(node, live) {
    const clone = copyWithOrigins(node);
    if (live) {
      clone.querySelectorAll(".md-meta:not([md-inline='escape'] > .md-meta), .md-fences-adv-panel, .code-tooltip, .md-rawblock-tooltip").forEach(el => el.remove());
      clone.querySelectorAll(".md-softbreak").forEach(el => {
        const text = document.createTextNode("\n");
        const origin = originAt(...pointAt(el, 0));
        if (origin) origins.set(text, origin);
        el.replaceWith(text);
      });
      clone.querySelectorAll(".CodeMirror").forEach(el => {
        const pre = document.createElement("pre");
        pre.textContent = node.querySelector(".CodeMirror")?.CodeMirror?.getValue() ?? [...el.querySelectorAll(".CodeMirror-code .CodeMirror-line")].map(line => line.textContent).join("\n");
        const cm = node.querySelector(".CodeMirror")?.CodeMirror;
        if (cm && pre.firstChild) origins.set(pre.firstChild, { cm, offset: 0 });
        el.replaceWith(pre);
      });
    }
    clone.querySelectorAll("br").forEach(el => el.replaceWith("\n"));
    for (const el of [clone, ...clone.querySelectorAll("*")]) {
      el.removeAttribute("cid");
      el.removeAttribute("contenteditable");
      if (live) el.removeAttribute("id");
      el.classList.remove("plume-source", "plume-anchor");
      el.style.removeProperty("--plume-height");
    }
    return clone;
  }


  function pointAt(root, offset, before = false) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    let last;
    while ((node = walker.nextNode())) {
      if (offset < node.length || (before && offset === node.length)) return [node, offset];
      offset -= node.length;
      last = node;
    }
    return last ? [last, last.length] : [root, root.childNodes.length];
  }

  function sliceParagraph(paragraph, start, end) {
    const result = paragraph.cloneNode(false);
    const range = document.createRange();
    // Include images between text nodes at the same character offset.
    range.setStart(...pointAt(paragraph, start, true));
    range.setEnd(...pointAt(paragraph, end));
    result.append(range.cloneContents());
    const walker = document.createTreeWalker(result, NodeFilter.SHOW_TEXT);
    let text;
    let offset = start;
    while ((text = walker.nextNode())) {
      const origin = originAt(...pointAt(paragraph, offset));
      if (origin) origins.set(text, origin);
      offset += text.length;
    }
    return result;
  }

  function tokenize(root, live) {
    const tokens = [];
    [...root.children].forEach((source, block) => {
      const clone = cloneBlock(source, live);
      // Markdown can absorb closing fences into the last paragraph of a list
      // or blockquote. Split those trailing lines back into container tokens.
      if (source.matches("ul, ol, blockquote")) {
        const match = /\n((?: {0,3}:{3,}[ \t]*(?:\n|$))+)[ \t\n]*$/.exec(clone.textContent);
        const closings = match ? [...match[1].matchAll(/^ {0,3}(:{3,})[ \t]*$/gm)] : [];
        const plain = closings.every(marker => {
          const [node] = pointAt(clone, match.index + 1 + marker.index + marker[0].indexOf(":"));
          return node.parentElement?.closest("p, li") &&
            !node.parentElement.closest("pre, code, [md-inline='code'], [md-inline='escape']");
        });
        if (closings.length && plain) {
          const range = document.createRange();
          range.setStart(...pointAt(clone, match.index));
          range.setEnd(clone, clone.childNodes.length);
          range.deleteContents();
          tokens.push({ element: clone, block });
          for (const closing of closings) {
            const marker = document.createElement("p");
            marker.textContent = closing[1];
            tokens.push({ element: marker, block, length: closing[1].length });
          }
          return;
        }
      }
      if (source.tagName !== "P" || source.matches(".md-meta-block")) {
        tokens.push({ element: clone, block });
        return;
      }
      const text = clone.textContent;
      const markers = [];
      const pattern = /^ {0,3}(:{3,})(?:[ \t]*([a-z][\w-]*)(?:[ \t]+([^\n]*))?)?[ \t]*$/gm;
      for (const match of text.matchAll(pattern)) {
        const [node] = pointAt(clone, match.index + match[0].indexOf(":"));
        if (node.parentElement?.closest("code, [md-inline='code'], [md-inline='escape']")) continue;
        const title = match[3]?.trim();
        markers.push({ start: match.index, end: match.index + match[0].length,
          length: match[1].length, type: match[2], title,
          options: match[2] === "window" ? windowOptions(title) : undefined });
      }
      if (!markers.length) {
        tokens.push({ element: clone, block });
        return;
      }
      let offset = 0;
      for (const marker of markers) {
        const end = marker.start > offset && text[marker.start - 1] === "\n" ? marker.start - 1 : marker.start;
        if (end >= offset) {
          const element = sliceParagraph(clone, offset, end);
          if (element.hasChildNodes()) tokens.push({ element, block });
        }
        tokens.push({ ...marker, element: sliceParagraph(clone, marker.start, marker.end), block });
        offset = marker.end + (text[marker.end] === "\n" ? 1 : 0);
      }
      if (offset < text.length) tokens.push({ element: sliceParagraph(clone, offset, text.length), block });
    });
    return tokens;
  }

  function container(token, body) {
    if (token.type === "window") {
      const el = document.createElement("article");
      el.className = "plume-window";
      const header = document.createElement("header");
      header.className = "plume-window-header";
      const dots = document.createElement("span");
      dots.className = "plume-window-dots";
      dots.setAttribute("aria-hidden", "true");
      dots.append(document.createElement("i"), document.createElement("i"), document.createElement("i"));
      header.append(dots);
      if (token.options.title) {
        const title = document.createElement("span");
        title.className = "plume-window-title";
        title.textContent = token.options.title;
        const offset = token.element.textContent.indexOf(token.title) + token.options.titleOffset;
        const origin = originAt(...pointAt(token.element, offset));
        if (origin) origins.set(title.firstChild, origin);
        header.append(title);
      }
      const content = document.createElement("section");
      content.className = "plume-window-content";
      const onlyImage = body.childElementCount === 1 && !body.textContent.trim() &&
        (body.firstElementChild.matches("img, picture") ||
          (body.firstElementChild.matches("p") && body.querySelectorAll("img").length === 1));
      content.classList.toggle("plume-window-image", onlyImage);
      content.style.setProperty("--plume-window-gap", token.options.gap ?? (onlyImage ? "0px" : "20px"));
      if (token.options.height) content.style.setProperty("--plume-window-height", token.options.height);
      if (onlyImage) {
        const image = body.querySelector("picture") || body.querySelector("img");
        content.append(image.closest("a") || image);
      } else content.append(body);
      el.append(header, content);
      return el;
    }
    const aligned = alignments.has(token.type);
    const el = document.createElement(token.type === "details" ? "details" : "div");
    el.className = aligned ? `plume-align plume-${token.type}` : `plume-container plume-${token.type}`;
    if (!aligned) {
      const title = document.createElement(token.type === "details" ? "summary" : "p");
      title.className = "plume-title";
      title.textContent = token.title || titles[token.type];
      const offset = token.title ? token.element.textContent.indexOf(token.title) : token.element.textContent.length;
      const origin = originAt(...pointAt(token.element, offset));
      if (origin) origins.set(title.firstChild, origin);
      el.append(title);
    }
    el.append(body);
    return el;
  }

  // Return previews grouped by original DOM blocks, including several containers
  // that Typora may have parsed as a single paragraph without blank lines.
  function plan(root, live = false) {
    const tokens = tokenize(root, live);
    const stack = [];
    const pairs = new Map();
    const intervals = [];
    tokens.forEach((token, index) => {
      if (!token.length) return;
      if (token.type) stack.push(index);
      else if (stack.length && token.length >= tokens[stack.at(-1)].length) {
        const start = stack.pop();
        // Unknown container types keep their complete contents literal.
        if (supported(tokens[start]) && stack.every(i => supported(tokens[i]))) {
          pairs.set(start, index);
          intervals.push([tokens[start].block, token.block]);
        }
      }
    });
    // An incomplete outer container must stay editable and literal.
    for (const start of stack) {
      for (const [open] of pairs) if (open > start) pairs.delete(open);
    }
    const ranges = intervals.filter(([first, last]) => [...pairs].some(([a, b]) => tokens[a].block === first && tokens[b].block === last));
    ranges.sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const range of ranges) {
      const previous = merged.at(-1);
      if (previous && range[0] <= previous[1]) previous[1] = Math.max(previous[1], range[1]);
      else merged.push([...range]);
    }
    function render(start, end) {
      const fragment = document.createDocumentFragment();
      for (let i = start; i < end; i++) {
        const close = pairs.get(i);
        if (close !== undefined) {
          fragment.append(container(tokens[i], render(i + 1, close)));
          i = close;
        } else fragment.append(copyWithOrigins(tokens[i].element));
      }
      return fragment;
    }
    const blocks = [...root.children];
    return merged.map(([first, last]) => ({
      sources: blocks.slice(first, last + 1),
      content: render(tokens.findIndex(t => t.block === first), tokens.findLastIndex(t => t.block === last) + 1),
    }));
  }

  function transform(root) {
    for (const group of plan(root)) {
      group.sources[0].before(group.content);
      group.sources.forEach(node => node.remove());
    }
    return root;
  }

  function start() {
    const write = document.getElementById("write");
    if (!write || window.PlumeBlocks?.running) return;
    const host = write.parentElement;
    const positionedHost = getComputedStyle(host).position === "static";
    if (positionedHost) host.classList.add("plume-host");
    const layer = document.createElement("div");
    layer.id = "plume-layer";
    host.append(layer);
    const scroller = write.closest("content") || document.scrollingElement;
    let groups = [];
    let editing = new Set();
    const dirty = new Set();
    let frame = 0;
    let layoutFrame = 0;
    let composing = false;
    let stopped = false;
    let editGesture = false;
    const listeners = [];
    const on = (target, type, fn, options) => {
      target.addEventListener(type, fn, options);
      listeners.push(() => target.removeEventListener(type, fn, options));
    };
    function clearSource(node) {
      node.classList.remove("plume-source", "plume-anchor");
      node.style.removeProperty("--plume-height");
    }
    function showGroup(group) {
      const active = group.sources.some(node => editing.has(node));
      group.preview.hidden = active;
      group.sources.forEach((node, index) => {
        node.classList.toggle("plume-source", !active);
        node.classList.toggle("plume-anchor", !active && index === 0);
      });
    }
    function layout() {
      layoutFrame = 0;
      if (stopped) return;
      layer.hidden = !write.getClientRects().length || !!window.File?.editor?.sourceView?.inSourceMode;
      if (layer.hidden) return;
      const style = getComputedStyle(write);
      for (const prop of ["fontFamily", "fontSize", "lineHeight", "color"]) layer.style[prop] = style[prop];
      for (const group of groups) {
        if (group.preview.hidden) continue;
        // Preview quotes live outside #write, so editor-scoped theme rules no
        // longer match. Preserve their appearance from the original elements.
        for (const quote of group.preview.querySelectorAll("blockquote")) {
          const style = getComputedStyle(origins.get(quote).node);
          for (const prop of ["margin", "padding", "borderTop", "borderRight", "borderBottom", "borderLeft",
            "borderRadius", "background", "color", "fontFamily", "fontSize", "fontWeight", "fontStyle",
            "lineHeight", "textAlign", "boxShadow"]) quote.style[prop] = style[prop];
        }
        const source = group.sources[0];
        group.preview.style.width = `${source.getBoundingClientRect().width}px`;
        source.style.setProperty("--plume-height", `${group.preview.getBoundingClientRect().height}px`);
      }
      // Both layer and editor are in the same scroll container. These offsets
      // stay constant throughout native/compositor scrolling; no scroll handler.
      const origin = layer.getBoundingClientRect();
      for (const group of groups) {
        if (group.preview.hidden) continue;
        const rect = group.sources[0].getBoundingClientRect();
        group.preview.style.left = `${rect.left - origin.left}px`;
        group.preview.style.top = `${rect.top - origin.top}px`;
      }
    }
    function scheduleLayout() {
      if (!layoutFrame && !stopped) layoutFrame = setTimeout(layout, 0);
    }
    const resize = new ResizeObserver(scheduleLayout);
    resize.observe(write);

    function setEditing(next) {
      if (next.size === editing.size && [...next].every(node => editing.has(node))) return;
      editing = next;
      groups.forEach(showGroup);
      layout();
    }
    function beginEdit(group, event) {
      let origin;
      let before;
      if (event && !event.target.closest(".plume-edit")) {
        const hit = document.caretRangeFromPoint(event.clientX, event.clientY);
        if (hit && group.preview.contains(hit.startContainer)) {
          origin = originAt(hit.startContainer, hit.startOffset);
          before = hit.getBoundingClientRect();
        }
      }
      setEditing(new Set(group.sources));
      if (origin?.cm) {
        origin.cm.focus();
        origin.cm.setCursor(origin.cm.posFromIndex(origin.offset));
        return;
      }
      const range = document.createRange();
      if (origin?.node.isConnected) range.setStart(origin.node, Math.min(origin.offset, origin.node.length));
      else range.setStart(...pointAt(group.sources[0], 0));
      range.collapse(true);
      write.focus({ preventScroll: true });
      const selection = window.File?.editor?.selection;
      if (selection) {
        const editorRange = selection.rangy.createRange();
        editorRange.setStart(range.startContainer, range.startOffset);
        editorRange.collapse(true);
        selection.setRange(editorRange, true);
      } else {
        getSelection().removeAllRanges();
        getSelection().addRange(range);
      }
      // Revealing delimiters changes the block's height. Keep the clicked text
      // at its previous screen position instead of jumping to the opening line.
      if (before?.height) scroller.scrollTop += range.getBoundingClientRect().top - before.top;
    }
    function createPreview(group) {
      const preview = document.createElement("div");
      preview.className = "plume-preview";
      preview.addEventListener("mousedown", event => {
        if (event.button !== 0 || event.target.closest("summary, a")) return;
        if (event.target.matches(".plume-window-content")) {
          const content = event.target;
          const rect = content.getBoundingClientRect();
          if (event.clientX >= rect.left + content.clientLeft + content.clientWidth ||
              event.clientY >= rect.top + content.clientTop + content.clientHeight) return;
        }
        event.preventDefault();
        event.stopPropagation();
        editGesture = true;
        beginEdit(group, event);
      });
      preview.addEventListener("click", event => {
        if (event.detail === 0 && event.target.closest(".plume-edit")) beginEdit(group);
      });
      preview.addEventListener("toggle", scheduleLayout, true);
      preview.addEventListener("load", scheduleLayout, true);
      layer.append(preview);
      resize.observe(preview);
      return preview;
    }
    function refresh() {
      frame = 0;
      if (stopped || composing) return;
      const previous = groups;
      const plans = plan(write, true);
      const retained = new Set();
      groups = plans.map(candidate => {
        let group = previous.find(old => old.sources.length === candidate.sources.length &&
          old.sources.every((node, i) => node === candidate.sources[i]));
        const changed = !group || candidate.sources.some(node => dirty.has(node));
        if (!group) {
          group = { sources: candidate.sources };
          group.preview = createPreview(group);
        }
        retained.add(group);
        if (changed) {
          const folds = [...group.preview.querySelectorAll("details")].map(el => el.open);
          candidate.content.querySelectorAll("details").forEach((el, i) => { el.open = folds[i] || false; });
          const button = document.createElement("button");
          button.className = "plume-edit";
          button.type = "button";
          button.textContent = "Edit";
          button.setAttribute("aria-label", "Edit container Markdown");
          group.preview.replaceChildren(candidate.content, button);
        }
        return group;
      });
      for (const old of previous) {
        if (retained.has(old)) continue;
        old.sources.forEach(clearSource);
        resize.unobserve(old.preview);
        old.preview.remove();
      }
      dirty.clear();
      groups.forEach(showGroup);
      layout();
    }
    function schedule() {
      if (!frame && !stopped) frame = setTimeout(refresh, 50);
    }
    const observer = new MutationObserver(records => {
      for (const record of records) {
        let node = record.target.nodeType === Node.ELEMENT_NODE ? record.target : record.target.parentElement;
        while (node && node.parentElement !== write) node = node.parentElement;
        if (node) dirty.add(node);
      }
      schedule();
    });
    observer.observe(write, { childList: true, characterData: true, subtree: true });
    on(document, "selectionchange", () => {
      if (document.activeElement !== write || composing) return;
      const selection = getSelection();
      if (!selection?.rangeCount) return;
      const range = selection.getRangeAt(0);
      const selected = groups.filter(group => group.sources.some(node => range.intersectsNode(node)));
      const before = range.getBoundingClientRect();
      setEditing(new Set(selected.flatMap(group => group.sources)));
      if (before.height) scroller.scrollTop += range.getBoundingClientRect().top - before.top;
    });
    // Do not let the remainder of the preview click hit the newly revealed
    // editor and overwrite the mapped caret with a second native hit-test.
    on(document, "mousedown", () => { editGesture = false; }, true);
    for (const type of ["mouseup", "click"]) on(document, type, event => {
      if (!editGesture) return;
      event.preventDefault();
      event.stopPropagation();
      if (type === "click") editGesture = false;
    }, true);
    on(write, "compositionstart", () => { composing = true; });
    on(write, "compositionend", () => { composing = false; schedule(); });
    on(window, "resize", scheduleLayout);
    on(write, "load", scheduleLayout, true);
    const themeObserver = new MutationObserver(scheduleLayout);
    themeObserver.observe(document.body, { attributes: true, attributeFilter: ["class", "style"] });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });
    themeObserver.observe(document.head, { childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ["href", "media", "disabled"] });
    on(document.head, "load", scheduleLayout, true);
    on(matchMedia("(prefers-color-scheme: dark)"), "change", scheduleLayout);
    on(document, "keydown", event => {
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "b") {
        event.preventDefault();
        stop();
      }
    }, true);

    // macOS HTML/PDF export passes through this method in Typora 1.14.10.
    const exporter = window.File?.editor?.export;
    const originalExport = exporter?.exportToHTML;
    let wrappedExport;
    if (originalExport) {
      wrappedExport = async function (...args) {
        const html = await originalExport.apply(this, args);
        const doc = new DOMParser().parseFromString(html, "text/html");
        transform(doc.querySelector("#write") || doc.body);
        const style = doc.createElement("style");
        style.textContent = css;
        doc.head.append(style);
        return "<!doctype html>\n" + doc.documentElement.outerHTML;
      };
      exporter.exportToHTML = wrappedExport;
    }
    function stop() {
      stopped = true;
      clearTimeout(frame);
      clearTimeout(layoutFrame);
      observer.disconnect();
      themeObserver.disconnect();
      resize.disconnect();
      listeners.forEach(remove => remove());
      groups.forEach(group => group.sources.forEach(clearSource));
      if (positionedHost) host.classList.remove("plume-host");
      layer.remove();
      if (wrappedExport && exporter.exportToHTML === wrappedExport) exporter.exportToHTML = originalExport;
      window.PlumeBlocks.running = false;
    }
    Object.assign(window.PlumeBlocks, { running: true, refresh, stop });
    refresh();
  }
  window.PlumeBlocks = { plan, transform, start, running: false };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
