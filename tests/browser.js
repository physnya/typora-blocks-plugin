/* Open browser.html in Safari to run these tests against WebKit. */
addEventListener("DOMContentLoaded", async () => {
  const root = document.getElementById("fixture");
  let passed = 0;
  let failed = 0;
  function assert(value, message = "Assertion failed") { if (!value) throw new Error(message); }
  async function test(name, fn) {
    const row = document.createElement("li");
    try { await fn(); row.textContent = `PASS: ${name}`; row.className = "pass"; passed++; }
    catch (error) { row.textContent = `FAIL: ${name}: ${error.message}`; row.className = "fail"; failed++; }
    document.getElementById("results").append(row);
  }
  function render(html) { root.innerHTML = html; PlumeBlocks.transform(root); return root; }
  const tick = () => new Promise(resolve => setTimeout(resolve, 100));
  for (const type of ["note", "info", "tip", "warning", "caution", "details", "left", "center", "right", "window"]) {
    await test(`${type}: no blank lines required`, () => {
      render(`<p>::: ${type}\nBody <strong>bold</strong>\n:::</p>`);
      assert(root.querySelector(`.plume-${type}`));
      assert(root.querySelector("strong")?.textContent === "bold");
      assert(!root.textContent.includes(":::"));
    });
  }
  await test("window title, height and horizontal gap", () => {
    render('<p>::: window title="Example window" height="200px" gap="24"\nBody\n:::</p>');
    assert(root.querySelector(".plume-window-title").textContent === "Example window");
    const content = root.querySelector(".plume-window-content");
    assert(content.style.getPropertyValue("--plume-window-height") === "200px");
    assert(content.style.getPropertyValue("--plume-window-gap") === "24px");
    render("<p>::: window gap='1.5rem' height=120 title='中文标题'\nBody\n:::</p>");
    assert(root.querySelector(".plume-window-title").textContent === "中文标题");
    assert(root.querySelector(".plume-window-content").style.getPropertyValue("--plume-window-height") === "120px");
  });
  await test("image-only windows default to edge-to-edge content", () => {
    for (const image of ['<p><img alt="Hero"></p>', '<picture><source><img alt="Hero"></picture>']) {
      render(`<p>::: window</p>${image}<p>:::</p>`);
      assert(root.querySelector(".plume-window-image img"));
      assert(root.querySelector(".plume-window-content").style.getPropertyValue("--plume-window-gap") === "0px");
    }
    render('<p>::: window gap="12px"</p><p><img alt="Hero"></p><p>:::</p>');
    assert(root.querySelector(".plume-window-content").style.getPropertyValue("--plume-window-gap") === "12px");
    render('<p>::: window\n<span class="md-image"><img alt="Inline hero"></span>\n:::</p>');
    assert(root.querySelector('.plume-window-image > img')?.alt === 'Inline hero', "Image between soft-break delimiters was dropped");
    render('<p>::: window</p><p><a href="https://example.com"><img alt="Linked image"></a></p><p>:::</p>');
    assert(root.querySelector('.plume-window-image > a > img'), "Image link was lost");
  });
  await test("window titles cannot inject markup or CSS", () => {
    render('<p>::: window title="&lt;img src=x onerror=alert(1)&gt;"\nBody\n:::</p>');
    assert(root.querySelector(".plume-window-title").textContent === '<img src=x onerror=alert(1)>');
    assert(!root.querySelector("img"));
    render('<p>::: window height="20px; color:red"\nBody\n:::</p>');
    assert(!root.querySelector(".plume-window"));
  });
  await test("incomplete or invalid window options stay literal", () => {
    for (const info of ['title="unfinished', 'height="nonsense"', 'gap="-10px"', 'unsupported=true']) {
      render(`<p>::: window ${info}\nBody\n:::</p>`);
      assert(!root.querySelector(".plume-window"));
      assert(root.textContent.includes("::: window"));
    }
    render('<p>::: window title="Open"\nBody</p>');
    assert(!root.querySelector(".plume-window"));
  });
  await test("windows nest with existing containers", () => {
    render('<p>:::: window title="Nested"\n::: tip A tip\nInner\n:::\n::::</p>');
    assert(root.querySelector(".plume-window-content .plume-tip")?.textContent.includes("Inner"));
    render('<p>:::: tip Outer\n::: window\nInner\n:::\n::::</p>');
    assert(root.querySelector(".plume-tip .plume-window"));
  });
  await test("window content preserves rendered HTML, tables and literal code", () => {
    render('<p>::: window</p><h3>Heading</h3><div class="example">Rendered HTML</div><table><tr><td>Cell</td></tr></table><pre><code>::: window\nLiteral\n:::</code></pre><p>:::</p>');
    assert(root.querySelector(".plume-window-content .example").textContent === "Rendered HTML");
    assert(root.querySelector(".plume-window-content td").textContent === "Cell");
    assert(root.querySelectorAll(".plume-window").length === 1);
    assert(root.querySelector(".plume-window-content code").textContent.includes("::: window"));
  });
  await test("custom title is text, never injected HTML", () => {
    render('<p>::: warning &lt;img src=x onerror=alert(1)&gt;\nBody\n:::</p>');
    assert(root.querySelector(".plume-title").textContent === '<img src=x onerror=alert(1)>');
    assert(!root.querySelector("img"));
  });
  await test("paragraphs, lists, tables and code survive", () => {
    render('<p>::: tip</p><p>Paragraph</p><ul><li>Item</li></ul><table><tbody><tr><td>Cell</td></tr></tbody></table><pre><code>::: warning\nLiteral\n:::</code></pre><p>:::</p>');
    assert(root.querySelector(".plume-tip li")?.textContent === "Item");
    assert(root.querySelector(".plume-tip td")?.textContent === "Cell");
    assert(root.querySelectorAll(".plume-container").length === 1);
  });
  await test("nested containers with longer outer fence", () => {
    render('<p>:::: tip Outer\n::: center\nInner\n:::\n::::</p>');
    assert(root.querySelector(".plume-tip .plume-center")?.textContent.includes("Inner"));
  });
  await test("Typora lazy list continuation closes a container", () => {
    render('<p>::: tip List</p><ul><li><p>First</p></li><li><p>Last\n:::</p></li></ul><p>::: warning\nNext\n:::</p>');
    assert(root.querySelectorAll(".plume-container").length === 2);
    assert(root.querySelector(".plume-tip li:last-child").textContent === "Last");
    assert(root.querySelector(".plume-warning").textContent.includes("Next"));
  });
  await test("shorter closing fence cannot close outer container", () => {
    render('<p>:::: tip Outer\nBody\n:::\n::::</p>');
    assert(root.querySelector(".plume-tip")?.textContent.includes(":::"));
  });
  await test("unknown containers stay literal, including their nested content", () => {
    render('<p>:::: unknown\n::: tip\nBody\n:::\n::::</p>');
    assert(!root.querySelector(".plume-container"));
    assert(root.textContent.includes("unknown"));
  });
  await test("unclosed containers stay literal", () => {
    render('<p>:::: warning\n::: tip\nBody\n:::</p>');
    assert(!root.querySelector(".plume-container"));
  });
  await test("inline code and escaped markers stay literal", () => {
    render('<p><code>::: tip</code>\nText\n:::</p><p>\\::: note\nText\n:::</p>');
    assert(!root.querySelector(".plume-container"));
  });
  await test("adjacent containers and surrounding text in one paragraph", () => {
    render('<p>Before\n::: tip\nOne\n:::\n::: warning\nTwo\n:::\nAfter</p>');
    assert(root.querySelectorAll(".plume-container").length === 2);
    assert(root.firstElementChild.textContent === "Before");
    assert(root.lastElementChild.textContent === "After");
  });
  await test("Typora soft breaks, inline metadata and source are preserved", () => {
    root.innerHTML = '<p cid="n1">::: tip<span class="md-softbreak">\n</span><strong><span class="md-meta">**</span>Bold<span class="md-meta">**</span></strong><span class="md-softbreak">\n</span>:::</p>';
    const original = root.innerHTML;
    const groups = PlumeBlocks.plan(root, true);
    assert(groups.length === 1);
    assert(groups[0].content.querySelector("strong")?.textContent === "Bold");
    assert(root.innerHTML === original, "Editable DOM changed");
  });
  await test("exported line breaks are recognized", () => {
    render('<p>::: right<br>Right<br>:::</p>');
    assert(root.querySelector(".plume-right"));
  });
  await test("live preview, edit, mutation, details, export and cleanup", async () => {
    const write = document.createElement("div");
    write.id = "write";
    write.contentEditable = "true";
    write.innerHTML = '<p cid="n1">::: tip Live\nBody\n:::</p><p cid="n2">::: details More\nHidden body\n:::</p><p>Outside</p>';
    document.body.append(write);
    const originalText = write.textContent;
    const originalNodes = [...write.childNodes];
    window.File = { editor: { export: { exportToHTML: async () => '<html><head></head><body><div id="write"><p>::: tip\nExported\n:::</p><p>::: window title="Exported window" height="120px"\nWindow body\n:::</p></div></body></html>' } } };
    const exportFn = File.editor.export.exportToHTML;
    PlumeBlocks.start();
    await tick();
    assert(document.querySelectorAll(".plume-preview").length === 2);
    assert(write.textContent === originalText);
    assert([...write.childNodes].every((node, i) => node === originalNodes[i]));
    const details = document.querySelector(".plume-preview details");
    const collapsedHeight = details.getBoundingClientRect().height;
    details.open = true;
    await tick();
    assert(details.getBoundingClientRect().height > collapsedHeight);
    document.querySelector(".plume-preview").dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 }));
    await tick();
    assert(!write.firstElementChild.classList.contains("plume-source"));
    write.firstElementChild.firstChild.textContent = '::: caution Changed\nNew body\n:::';
    await tick();
    assert(document.querySelector(".plume-caution .plume-title")?.textContent === "Changed", "Mutation did not update preview");
    const exported = await File.editor.export.exportToHTML();
    assert(exported.includes('class="plume-container plume-tip"'));
    assert(!exported.includes("::: tip"));
    assert(exported.includes("--plume-accent"));
    assert(exported.includes('class="plume-window"'));
    assert(exported.includes("Exported window"));
    assert(exported.includes("--plume-window-height: 120px"));
    PlumeBlocks.stop();
    assert(!document.getElementById("plume-layer"));
    assert(!write.querySelector(".plume-source"));
    assert(File.editor.export.exportToHTML === exportFn);
    write.remove();
  });
  document.getElementById("result").textContent = `${passed} passed, ${failed} failed`;
  document.title = `${passed} passed, ${failed} failed — Plume Blocks`;
});
