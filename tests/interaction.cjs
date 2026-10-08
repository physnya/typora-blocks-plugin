// npm install --no-save playwright && npx playwright install webkit
// node tests/interaction.cjs
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { webkit } = require('playwright');

(async () => {
  const browser = await webkit.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(pathToFileURL(path.join(__dirname, 'browser.html')).href);
    await page.waitForFunction(() => /passed/.test(document.querySelector('#result').textContent));
    assert.equal(await page.locator('#result').textContent(), '28 passed, 0 failed');
    console.log('PASS: 28 WebKit parser, preview and export tests');

    await page.setContent(`<style>
      body { margin: 0; font: 18px/1.6 sans-serif; }
      content { position: absolute; top: 40px; left: 40px; width: 700px; height: 500px; overflow: auto; }
      #write { padding: 20px; outline: none; }
      #write p { white-space: pre-wrap; }
      #write .md-meta { display: none; }
      .spacer { height: 200px; }
    </style><content><div id="write" contenteditable="true">
      <div class="spacer">Before</div>
      <p>::: tip Custom title</p>
      <p id="body">Repeated text. <strong><span class="md-meta">**</span>Repeated text.<span class="md-meta">**</span></strong><span class="md-softbreak">\n</span>Last line.</p>
      <p>:::</p>
      <p id="outside">Outside the container.</p>
      <p>::: details Keep open\nOther content\n:::</p>
      <p>:::: tip Outer\n::: center\nNested <em><span class="md-meta">*</span>target text<span class="md-meta">*</span></em>\n:::\n::::</p>
      <div style="height: 1400px">After</div>
    </div></content>`);
    await page.addScriptTag({ path: path.join(__dirname, '..', 'plume-blocks.js') });
    await page.waitForTimeout(150);
    assert.equal(await page.locator('.plume-preview').count(), 3);

    const scrolling = await page.evaluate(() => {
      const host = document.querySelector('content');
      const preview = document.querySelector('.plume-preview');
      const anchor = document.querySelector('.plume-anchor');
      const samples = [];
      const top = preview.style.top;
      for (const scroll of [30, 140, 275, 80, 0, 120]) {
        host.scrollTop = scroll;
        // Deliberately do not yield: the compositor must move both together
        // without a delayed scroll callback or animation-frame correction.
        samples.push(Math.abs(preview.getBoundingClientRect().top - anchor.getBoundingClientRect().top));
      }
      return { samples, unchangedTop: preview.style.top === top, parent: preview.parentElement.parentElement.tagName };
    });
    assert(scrolling.samples.every(delta => delta < 1), JSON.stringify(scrolling));
    assert(scrolling.unchangedTop);
    assert.equal(scrolling.parent, 'CONTENT');
    console.log('PASS: six scroll positions stay aligned synchronously');

    await page.evaluate(() => {
      document.querySelector('details').open = true;
      window.savedPreview = document.querySelectorAll('.plume-preview')[1];
      window.savedDetails = savedPreview.querySelector('details');
      window.removals = 0;
      window.testObserver = new MutationObserver(records => {
        for (const record of records) window.removals += record.removedNodes.length;
      });
      testObserver.observe(document.querySelector('#plume-layer'), { childList: true, subtree: true });
    });
    await page.waitForTimeout(100);
    const clicked = await page.evaluate(() => {
      const text = document.querySelector('.plume-preview strong').firstChild;
      const range = document.createRange();
      range.setStart(text, 6);
      range.setEnd(text, 7);
      const rect = range.getBoundingClientRect();
      const x = rect.left + rect.width * .25;
      const y = rect.top + rect.height / 2;
      const hit = document.caretRangeFromPoint(x, y);
      return { x, y, offset: hit.startOffset, text: hit.startContainer.textContent, top: hit.getBoundingClientRect().top };
    });
    await page.mouse.click(clicked.x, clicked.y);
    await page.waitForTimeout(150);
    const selected = await page.evaluate(() => {
      const selection = getSelection();
      return {
        text: selection.anchorNode.textContent, offset: selection.anchorOffset,
        bold: selection.anchorNode.parentElement.tagName,
        top: selection.getRangeAt(0).getBoundingClientRect().top,
        samePreview: savedPreview === document.querySelectorAll('.plume-preview')[1],
        sameDetails: savedDetails === document.querySelector('details'),
        open: savedDetails.open, removals,
      };
    });
    assert.equal(selected.text, clicked.text);
    assert.equal(selected.offset, clicked.offset);
    assert.equal(selected.bold, 'STRONG', 'Repeated text must map to the clicked occurrence');
    assert(Math.abs(selected.top - clicked.top) < 2, JSON.stringify({ selected, clicked }));
    assert(selected.samePreview && selected.sameDetails && selected.open);
    assert.equal(selected.removals, 0, 'Click-to-edit must not rebuild previews');
    console.log('PASS: real mouse click preserves exact text offset and viewport position');
    console.log('PASS: other previews and open details are untouched');

    await page.keyboard.insertText('X');
    await page.waitForTimeout(150);
    assert.equal(await page.locator('#body strong').textContent(), `**${clicked.text.slice(0, clicked.offset)}X${clicked.text.slice(clicked.offset)}**`);
    assert(await page.evaluate(() => savedPreview === document.querySelectorAll('.plume-preview')[1] && savedDetails.open));
    await page.locator('#outside').click();
    await page.waitForTimeout(100);
    assert(await page.locator('.plume-preview').first().isVisible());
    assert((await page.locator('.plume-preview strong').textContent()).includes('X'));
    console.log('PASS: typing edits clicked text, then leaving restores its preview');

    await page.locator('.plume-preview em').scrollIntoViewIfNeeded();
    const nested = await page.locator('.plume-preview em').boundingBox();
    await page.mouse.click(nested.x + nested.width / 2, nested.y + nested.height / 2);
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => getSelection().anchorNode.parentElement.tagName), 'EM');
    console.log('PASS: nested inline formatting maps back to the original node');
    assert.deepEqual(errors, []);
    await page.evaluate(() => { testObserver.disconnect(); PlumeBlocks.stop(); });
    assert.equal(await page.locator('#plume-layer').count(), 0);
    console.log('PASS: cleanup, no JavaScript errors');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
