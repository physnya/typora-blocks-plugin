// npm install --no-save playwright && npx playwright install webkit
const assert = require('node:assert/strict');
const path = require('node:path');
const { webkit } = require('playwright');

(async () => {
  const browser = await webkit.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 900, height: 760 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setContent(`<style>
      body { margin: 0; font: 17px/1.6 -apple-system, sans-serif; color: #333; }
      content { display: block; height: 700px; overflow: auto; }
      #write { margin: 40px auto; max-width: 660px; outline: none; }
      #write .md-meta { display: none; }
      p { margin: .6em 0; }
    </style><content><div id="write" contenteditable="true">
      <h1>Window containers</h1>
      <p id="opening">::: window gap="24px" title="Window title" height="180px"</p>
      <p>A fixed-height example with ordinary Markdown.</p>
      ${Array.from({ length: 12 }, (_, i) => `<p>Example line ${i + 1}.</p>`).join('')}
      <p id="target">Find the <strong><span class="md-meta">**</span>target text<span class="md-meta">**</span></strong> here.</p>
      <p>:::</p>
      <p id="outside">Outside the window.</p>
      <p>:::: window title="Nested example"</p>
      <p>::: tip A useful note</p><p>Nested content.</p><p>:::</p><p>::::</p>
      <div style="height: 900px">After</div>
    </div></content>`);
    await page.addScriptTag({ path: path.join(__dirname, '..', 'plume-blocks.js') });
    await page.waitForTimeout(150);
    assert.equal(await page.locator('.plume-window').count(), 2);
    const initial = await page.locator('.plume-window-content').first().evaluate(el => ({
      height: el.getBoundingClientRect().height, padding: getComputedStyle(el).paddingLeft,
      scrollHeight: el.scrollHeight, clientHeight: el.clientHeight,
    }));
    assert.equal(initial.height, 180);
    assert.equal(initial.padding, '24px');
    assert(initial.scrollHeight > initial.clientHeight);
    console.log('PASS: fixed window height and horizontal gap');

    const content = page.locator('.plume-window-content').first();
    const box = await content.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, 180);
    await page.waitForTimeout(200);
    assert(await content.evaluate(el => el.scrollTop > 0));
    assert(await page.locator('.plume-preview').first().isVisible());
    await content.evaluate(el => { el.scrollTop = el.scrollHeight; });
    const clicked = await page.locator('.plume-window-content strong').evaluate(el => {
      const range = document.createRange();
      range.setStart(el.firstChild, 4);
      range.setEnd(el.firstChild, 5);
      const rect = range.getBoundingClientRect();
      const x = rect.left + rect.width * .25;
      const y = rect.top + rect.height / 2;
      const hit = document.caretRangeFromPoint(x, y);
      return { x, y, offset: hit.startOffset, text: hit.startContainer.textContent };
    });
    await page.mouse.click(clicked.x, clicked.y);
    await page.waitForTimeout(100);
    const selected = await page.evaluate(() => ({
      text: getSelection().anchorNode.textContent, offset: getSelection().anchorOffset,
      parent: getSelection().anchorNode.parentElement.tagName,
    }));
    assert.equal(selected.text, clicked.text);
    assert.equal(selected.offset, clicked.offset);
    assert.equal(selected.parent, 'STRONG');
    await page.keyboard.insertText('X');
    assert.equal(await page.locator('#target strong').textContent(), `**${clicked.text.slice(0, clicked.offset)}X${clicked.text.slice(clicked.offset)}**`);
    console.log('PASS: native inner scrolling and exact click-to-edit after scrolling');
    await page.locator('#outside').click();
    await page.waitForTimeout(150);
    await page.locator('.plume-window-title').first().scrollIntoViewIfNeeded();
    const titleHit = await page.locator('.plume-window-title').first().evaluate(el => {
      const range = document.createRange();
      range.setStart(el.firstChild, 3);
      range.setEnd(el.firstChild, 4);
      const rect = range.getBoundingClientRect();
      const x = rect.left + rect.width * .25;
      const y = rect.top + rect.height / 2;
      return { x, y, offset: document.caretRangeFromPoint(x, y).startOffset };
    });
    await page.mouse.click(titleHit.x, titleHit.y);
    await page.waitForTimeout(100);
    const titleSelection = await page.evaluate(() => ({
      source: getSelection().anchorNode.parentElement.id,
      offset: getSelection().anchorOffset,
      expected: document.querySelector('#opening').textContent.indexOf('Window title'),
    }));
    assert.equal(titleSelection.source, 'opening');
    assert.equal(titleSelection.offset, titleSelection.expected + titleHit.offset);
    console.log('PASS: title clicks map to the title attribute, including reordered options');
    await page.locator('#outside').click();
    await page.waitForTimeout(100);
    await page.emulateMedia({ media: 'print' });
    const printed = await content.evaluate(el => ({ overflow: getComputedStyle(el).overflow, height: el.clientHeight, scrollHeight: el.scrollHeight }));
    assert.equal(printed.overflow, 'visible');
    assert.equal(printed.height, printed.scrollHeight);
    console.log('PASS: printing expands fixed-height windows to keep all content');
    assert.deepEqual(errors, []);
    await page.evaluate(() => PlumeBlocks.stop());
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
