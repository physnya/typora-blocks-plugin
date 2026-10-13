// node tests/blockquote-style.cjs (requires Playwright + WebKit)
const assert = require('node:assert/strict');
const path = require('node:path');
const { webkit } = require('playwright');

(async () => {
  const browser = await webkit.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1000, height: 850 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setContent(`<style>
      body { margin: 0; font: 18px/1.8 sans-serif; --quote-bg: #f5e3c4; --quote-color: #766052; }
      body.dark { --quote-bg: #34302a; --quote-color: #e1d0ba; }
      content { display: block; height: 800px; overflow: auto; }
      #write { max-width: 700px; padding: 24px; margin: auto; }
      blockquote { margin: 1rem 0; }
      /* Themes such as Crimson Paper scope quote styling to the real editor. */
      #write blockquote {
        margin: 1.3em 0; padding: .2em 1.2em; border-left: none;
        border-radius: .4rem; background: var(--quote-bg); color: var(--quote-color);
        font-style: italic;
      }
    </style><content><div id="write" contenteditable="true">
      <p>::: tip</p><p>你好</p><blockquote id="tip-quote"><p>你好</p></blockquote><p>你好</p><p>:::</p>
      <p>::: window title="Nested quotes"</p><blockquote id="window-quote"><p>Outer quote</p><blockquote id="inner-quote"><p>Inner quote</p></blockquote></blockquote><p>:::</p>
      <p id="outside">Outside.</p>
    </div></content>`);
    const original = await page.locator('#write').evaluate(el => el.innerHTML);
    await page.addScriptTag({ path: path.join(__dirname, '..', 'plume-blocks.js') });
    await page.waitForTimeout(150);
    async function checkQuoteStyles() {
      const pairs = await page.evaluate(() => {
        const props = ['backgroundColor', 'color', 'paddingLeft', 'paddingTop', 'borderLeftWidth', 'borderLeftStyle', 'borderRadius', 'fontStyle'];
        return [...document.querySelectorAll('.plume-preview blockquote')].map((quote, i) => {
          const source = document.querySelectorAll('#write blockquote')[i];
          const expected = getComputedStyle(source);
          const actual = getComputedStyle(quote);
          return { expected: props.map(prop => expected[prop]), actual: props.map(prop => actual[prop]) };
        });
      });
      assert.equal(pairs.length, 3);
      for (const pair of pairs) assert.deepEqual(pair.actual, pair.expected);
    }
    await checkQuoteStyles();
    assert.equal(await page.locator('.plume-tip blockquote').textContent(), '你好');
    console.log('PASS: supplied Chinese example and nested window quotes retain editor theme styling');
    await page.evaluate(() => { window.savedQuote = document.querySelector('.plume-tip blockquote'); document.body.classList.add('dark'); });
    await page.waitForTimeout(100);
    await checkQuoteStyles();
    assert(await page.evaluate(() => savedQuote === document.querySelector('.plume-tip blockquote')));
    console.log('PASS: theme colors update without replacing quote nodes');
    await page.addStyleTag({ content: '#write blockquote { padding-left: 36px; border-left: 3px solid rgb(120, 100, 80); }' });
    await page.waitForTimeout(100);
    await checkQuoteStyles();
    console.log('PASS: changed theme styles and quote borders update in previews');
    const hit = await page.locator('.plume-tip blockquote p').evaluate(el => {
      const range = document.createRange();
      range.setStart(el.firstChild, 1); range.setEnd(el.firstChild, 2);
      const rect = range.getBoundingClientRect();
      const x = rect.left + rect.width * .25, y = rect.top + rect.height / 2;
      return { x, y, offset: document.caretRangeFromPoint(x, y).startOffset };
    });
    await page.mouse.click(hit.x, hit.y);
    await page.waitForTimeout(100);
    const selected = await page.evaluate(() => ({ quote: getSelection().anchorNode.parentElement.closest('blockquote')?.id, offset: getSelection().anchorOffset }));
    assert.equal(selected.quote, 'tip-quote');
    assert.equal(selected.offset, hit.offset);
    await page.locator('#outside').click();
    await page.waitForTimeout(100);
    await checkQuoteStyles();
    await page.evaluate(() => PlumeBlocks.stop());
    assert.equal(await page.locator('#write').evaluate(el => el.innerHTML.replace(/ (?:class|style)=""/g, '')), original);
    assert.deepEqual(errors, []);
    console.log('PASS: quote click maps to the correct source and leaves Markdown DOM intact');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
