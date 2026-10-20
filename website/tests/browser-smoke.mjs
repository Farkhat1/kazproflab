import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const websiteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspaceRoot = path.dirname(websiteRoot);
const baseUrl = (process.env.BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const outputDir = process.env.QA_REPORT_DIR
  ? path.resolve(process.env.QA_REPORT_DIR)
  : path.join(websiteRoot, 'qa');
const expectPrerender = process.env.EXPECT_PRERENDER === '1';
const saveScreenshots = process.env.QA_SCREENSHOTS !== '0';
const interactionsOnly = process.env.QA_INTERACTIONS_ONLY === '1';
const data = JSON.parse(await fs.readFile(path.join(websiteRoot, 'src/data/site-data.json'), 'utf8'));
const home = JSON.parse(await fs.readFile(path.join(websiteRoot, 'src/data/home-content.json'), 'utf8'));
const sourceData = JSON.parse(await fs.readFile(path.join(workspaceRoot, 'content-source/site-data.json'), 'utf8'));
const validPaths = new Set(data.pages.map((item) => item.path));
const byPath = new Map(data.pages.map((item) => [item.path, item]));
const sourceByPath = new Map(sourceData.pages.map((item) => [item.path, item]));
const filters = [
  { label: 'Обучение', root: '/g9499437-obuchenie-povyshenie-kvalifikatsii' },
  { label: 'Аккредитация', root: '/g9714386-podgotovka-otsenke-akkreditatsii' },
  { label: 'Аудит и оценка', root: '/g9714388-audit-otsenka' },
  { label: 'Системы менеджмента', root: '/g9714387-razrabotka-vnedrenie-sistem' },
];
const report = {
  baseUrl,
  startedAt: new Date().toISOString(),
  browser: process.env.QA_BROWSER || 'msedge',
  expectedPrerender: expectPrerender,
  scope: interactionsOnly ? 'interactions' : 'full',
  sourcePageCount: sourceData.pages.length,
  routeChecks: [],
  responsiveChecks: [],
  noJavaScriptChecks: [],
  interactionChecks: [],
  screenshots: [],
  consoleErrors: [],
  pageErrors: [],
  hydrationErrors: [],
  failedRequests: [],
  invalidLinks: [],
  failures: [],
};

await fs.mkdir(outputDir, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normal(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

function searchNormal(value = '') {
  return normal(value).toLocaleLowerCase('ru').replaceAll('ё', 'е');
}

function belongsTo(item, root) {
  if (item.breadcrumbs?.some((crumb) => crumb.path === root)) return true;
  let parent = item.parentPath;
  const seen = new Set();
  while (parent && !seen.has(parent)) {
    if (parent === root) return true;
    seen.add(parent);
    parent = byPath.get(parent)?.parentPath;
  }
  return byPath.get(root)?.servicePaths?.includes(item.path) ?? false;
}

const homeFragments = [
  { name: 'intro title', text: home.intro.title },
  { name: 'intro tagline', html: home.intro.tagline },
  ...home.intro.paragraphs.map((item, index) => ({ name: `intro paragraph ${index + 1}`, html: item.html })),
  ...Object.entries(home.sectionTitles).map(([name, text]) => ({ name: `section ${name}`, text })),
  ...home.services.flatMap((item, index) => [
    { name: `service ${index + 1} title`, text: item.title },
    ...item.paragraphs.map((html, p) => ({ name: `service ${index + 1} paragraph ${p + 1}`, html })),
  ]),
  ...['audiences', 'benefits', 'process'].flatMap((section) => home[section].flatMap((item, index) => [
    { name: `${section} ${index + 1} title`, text: item.title },
    { name: `${section} ${index + 1} body`, html: item.bodyHtml },
  ])),
];

let browser;
let page;
let currentRoute = '';
const routeResourceErrors = [];

async function runInteraction(name, action) {
  const start = Date.now();
  try {
    const details = await action();
    report.interactionChecks.push({ name, ok: true, durationMs: Date.now() - start, ...details });
    console.log(`PASS ${name}`);
  } catch (error) {
    const failure = { name, ok: false, error: error.message, durationMs: Date.now() - start };
    report.interactionChecks.push(failure);
    report.failures.push({ scope: 'interaction', ...failure });
    console.error(`FAIL ${name}: ${error.message}`);
    if (page && saveScreenshots) {
      const filename = `failure-${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`;
      await page.screenshot({ path: path.join(outputDir, filename), fullPage: true }).catch(() => {});
    }
    await page?.keyboard.press('Escape').catch(() => {});
  }
}

async function visit(route) {
  currentRoute = route;
  const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' });
  await page.locator('main h1').waitFor({ state: 'visible' });
  await page.evaluate(() => document.fonts.ready);
  return response;
}

async function waitForTitle(title) {
  await page.waitForFunction(
    (expected) => document.querySelector('main h1')?.textContent.replace(/\s+/g, ' ').trim() === expected,
    normal(title),
  );
}

async function settleImages() {
  return page.evaluate(async () => {
    const images = [...document.querySelectorAll('img')];
    images.forEach((image) => { image.loading = 'eager'; });
    await Promise.all(images.map((image) => Promise.race([
      image.decode().catch(() => {}),
      new Promise((resolve) => setTimeout(resolve, 6000)),
    ])));
    return images.filter((image) => !image.complete || !image.naturalWidth).map((image) => ({
      src: image.getAttribute('src'),
      alt: image.getAttribute('alt'),
      complete: image.complete,
    }));
  });
}

async function checkRoute(item) {
  const errorStart = routeResourceErrors.length;
  const response = await visit(item.path);
  const initialHtml = await response.text();
  const brokenImages = await settleImages();
  const source = sourceByPath.get(item.path);
  const check = await page.evaluate(({ item, source, company, initialHtml, homeFragments }) => {
    const normalize = (value = '') => String(value).replace(/\s+/g, ' ').trim();
    const parseText = (html = '') => {
      const template = document.createElement('template');
      template.innerHTML = html;
      return normalize(template.content.textContent);
    };
    const compact = (value = '') => String(value).replace(/\s+/g, '');
    const main = document.querySelector('main');
    const mainText = normalize(main?.textContent);
    const prose = normalize([...document.querySelectorAll('main .cp-prose')].map((element) => element.textContent).join(' '));
    const sourceText = parseText(source?.bodyHtml);
    const prerenderDocument = new DOMParser().parseFromString(initialHtml, 'text/html');
    const preRendered = Boolean(prerenderDocument.querySelector('#root')?.textContent.trim());
    const errors = [];
    const h1 = [...document.querySelectorAll('h1')];
    if (h1.length !== 1) errors.push(`Expected one h1, found ${h1.length}`);
    if (!normalize(h1[0]?.textContent)) errors.push('Empty h1');
    if (item.type !== 'home' && item.type !== 'catalog' && normalize(h1[0]?.textContent) !== normalize(source?.title)) {
      errors.push('Page title differs from source');
    }
    let bodyVerification;
    if (item.type === 'home') {
      const missing = homeFragments.filter((fragment) => {
        const expected = fragment.html ? parseText(fragment.html) : normalize(fragment.text);
        return expected && !compact(mainText).includes(compact(expected));
      }).map((fragment) => fragment.name);
      bodyVerification = { mode: 'all structured home content including hidden accordion panels', fragments: homeFragments.length, missing };
      if (missing.length) errors.push(`Missing home content: ${missing.join(', ')}`);
    } else if (item.type === 'contacts') {
      const fields = [company.name, company.contactName, company.address, company.email, ...(company.phones || [])];
      const missingFields = fields.filter((value) => value && !mainText.includes(normalize(value)));
      const start = source.bodyHtml.indexOf('<h2>Как нас найти</h2>');
      const expectedDetails = parseText(start >= 0 ? source.bodyHtml.slice(start) : source.bodyHtml);
      bodyVerification = { mode: 'contact fields and complete directions / schedule', missingFields, detailsMatch: prose === expectedDetails };
      if (missingFields.length) errors.push(`Missing contact values: ${missingFields.join(', ')}`);
      if (prose !== expectedDetails) errors.push('Contact directions or schedule differ from source');
    } else {
      bodyVerification = { mode: 'exact source body text with whitespace normalized', matches: prose === sourceText, sourceCharacters: sourceText.length, renderedCharacters: prose.length };
      if (prose !== sourceText) errors.push('Full body content differs from source');
    }
    if (item.type === 'service' && item.price && !mainText.includes(normalize(item.price))) errors.push('Source price is missing');
    if (item.type === 'category') {
      const links = [...document.querySelectorAll('.cp-service-card')].map((anchor) => anchor.getAttribute('href'));
      const expected = [...new Set(item.servicePaths || [])].sort();
      if (JSON.stringify([...new Set(links)].sort()) !== JSON.stringify(expected)) errors.push('Category service list differs from source');
      const childLinks = [...document.querySelectorAll('.cp-category-link')].map((anchor) => anchor.getAttribute('href'));
      if (JSON.stringify([...new Set(childLinks)].sort()) !== JSON.stringify([...new Set(item.childrenPaths || [])].sort())) errors.push('Subcategory list differs from source');
    }
    if (!document.querySelector('meta[name="description"]')?.content?.trim()) errors.push('Missing meta description');
    const canonical = document.querySelector('link[rel="canonical"]')?.href;
    if (canonical !== `https://kazproflab.kz${item.path}`) errors.push(`Unexpected canonical: ${canonical}`);
    return {
      path: item.path,
      type: item.type,
      title: normalize(h1[0]?.textContent),
      bodyVerification,
      preRendered,
      imageCount: document.images.length,
      links: [...document.querySelectorAll('a[href]')].map((anchor) => ({ href: anchor.getAttribute('href'), text: normalize(anchor.textContent).slice(0, 90) })),
      ids: [...document.querySelectorAll('[id]')].map((element) => element.id),
      errors,
    };
  }, { item, source, company: data.company, initialHtml, homeFragments });
  check.httpStatus = response.status();
  check.brokenImages = brokenImages;
  check.resourceErrors = routeResourceErrors.slice(errorStart);
  if (check.httpStatus !== 200) check.errors.push(`HTTP ${check.httpStatus}`);
  if (brokenImages.length) check.errors.push(`${brokenImages.length} broken images`);
  if (check.resourceErrors.length) check.errors.push(`${check.resourceErrors.length} resource errors`);
  if (expectPrerender && !check.preRendered) check.errors.push('Expected prerendered HTML but root was empty');
  check.ok = check.errors.length === 0;
  report.routeChecks.push(check);
  if (!check.ok) {
    report.failures.push({ scope: 'route', path: item.path, errors: check.errors });
    console.error(`FAIL route ${item.path}: ${check.errors.join('; ')}`);
  }
}

async function checkResponsive(item, width, screenshotName) {
  await page.setViewportSize({ width, height: width > 800 ? 960 : 844 });
  await visit(item.path);
  await settleImages();
  const dimensions = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const documentWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    const overflow = documentWidth > width + 1;
    const offenders = overflow ? [...document.querySelectorAll('body *')].filter((element) => {
      const style = getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && (rect.right > width + 2 || rect.left < -2);
    }).slice(0, 15).map((element) => ({
      tag: element.tagName,
      className: typeof element.className === 'string' ? element.className : '',
      right: Math.round(element.getBoundingClientRect().right),
      left: Math.round(element.getBoundingClientRect().left),
    })) : [];
    return { viewportWidth: width, documentWidth, overflow, offenders };
  });
  const entry = { path: item.path, requestedWidth: width, ...dimensions, ok: !dimensions.overflow };
  report.responsiveChecks.push(entry);
  if (!entry.ok) report.failures.push({ scope: 'responsive', ...entry });
  if (screenshotName && saveScreenshots) {
    await page.screenshot({ path: path.join(outputDir, screenshotName), fullPage: true, animations: 'disabled' });
    report.screenshots.push({ path: item.path, width, file: screenshotName });
  }
}

try {
  assert(data.pages.length === sourceData.pages.length, 'The app and source have different route counts');
  assert(data.pages.length === validPaths.size, 'Duplicate app routes');
  for (const source of sourceData.pages) assert(validPaths.has(source.path), `Missing source route ${source.path}`);
  browser = await chromium.launch({
    channel: process.env.QA_BROWSER || 'msedge',
    headless: true,
  });
  const context = await browser.newContext({ viewport: { width: 1536, height: 960 }, locale: 'ru-RU', reducedMotion: 'reduce' });
  await context.addInitScript(() => {
    window.__qaOpenedWindows = [];
    window.open = (...args) => {
      window.__qaOpenedWindows.push(args);
      return null;
    };
  });
  await context.route(/https?:\/\/(?:wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)\//, (route) => route.abort('blockedbyclient'));
  page = await context.newPage();
  page.setDefaultTimeout(7000);
  page.setDefaultNavigationTimeout(30000);
  page.on('pageerror', (error) => report.pageErrors.push({ route: currentRoute, message: error.message }));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const entry = { route: currentRoute, message: message.text() };
    report.consoleErrors.push(entry);
    if (/hydrat|server.render|Minified React error #(?:418|419|420|421|422|423|424|425)/i.test(message.text())) report.hydrationErrors.push(entry);
  });
  page.on('response', (response) => {
    if (response.status() >= 400 && !response.url().endsWith('/favicon.ico')) routeResourceErrors.push({ route: currentRoute, url: response.url(), status: response.status() });
  });
  page.on('requestfailed', (request) => {
    const reason = request.failure()?.errorText;
    if (reason?.includes('ERR_ABORTED')) return;
    const entry = { route: currentRoute, url: request.url(), reason };
    report.failedRequests.push(entry);
    routeResourceErrors.push(entry);
  });

  for (let index = 0; !interactionsOnly && index < data.pages.length; index += 1) {
    await checkRoute(data.pages[index]);
    if ((index + 1) % 10 === 0 || index === data.pages.length - 1) console.log(`Routes checked: ${index + 1}/${data.pages.length}`);
  }

  const idsByPath = new Map(report.routeChecks.map((entry) => [entry.path, new Set(entry.ids)]));
  for (const entry of report.routeChecks) {
    for (const link of entry.links) {
      let url;
      try { url = new URL(link.href, `${baseUrl}${entry.path}`); } catch {
        report.invalidLinks.push({ from: entry.path, ...link, reason: 'invalid URL' });
        continue;
      }
      if (url.origin !== new URL(baseUrl).origin) continue;
      const route = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : '/';
      if (route.startsWith('/assets/')) continue;
      if (!validPaths.has(route)) {
        report.invalidLinks.push({ from: entry.path, ...link, reason: 'route does not exist' });
      } else if (url.hash && !idsByPath.get(route)?.has(decodeURIComponent(url.hash.slice(1)))) {
        report.invalidLinks.push({ from: entry.path, ...link, reason: 'anchor does not exist' });
      }
    }
    delete entry.links;
    delete entry.ids;
  }
  if (report.invalidLinks.length) report.failures.push({ scope: 'links', count: report.invalidLinks.length });

  const service = data.pages.find((item) => item.type === 'service' && item.bodyHtml.includes('<table')) || data.pages.find((item) => item.type === 'service');
  const longestService = data.pages.filter((item) => item.type === 'service').sort((a, b) => b.title.length - a.title.length)[0];
  const representative = [
    { page: byPath.get('/'), name: 'home' },
    { page: byPath.get('/product_list'), name: 'catalog' },
    { page: byPath.get(filters[0].root), name: 'training' },
    { page: service, name: 'service' },
    { page: longestService, name: 'long-title' },
    { page: byPath.get('/about_us'), name: 'about' },
    { page: byPath.get('/contacts'), name: 'contacts' },
    { page: byPath.get('/return_policy'), name: 'policy' },
    { page: byPath.get('/testimonials'), name: 'reviews' },
  ].filter((entry, index, all) => entry.page && all.findIndex((other) => other.page?.path === entry.page.path) === index);
  for (const width of interactionsOnly ? [] : [1536, 390, 320]) {
    for (const entry of representative) {
      const capture = ['home', 'catalog', 'service', 'contacts'].includes(entry.name) && width !== 320;
      const filename = capture ? `${entry.name}-${width === 1536 ? 'desktop' : 'mobile'}.png` : undefined;
      await checkResponsive(entry.page, width, filename);
    }
    console.log(`Responsive checks completed: ${width}px`);
  }

  if (expectPrerender && !interactionsOnly) {
    const staticContext = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1536, height: 960 }, locale: 'ru-RU' });
    const staticPage = await staticContext.newPage();
    try {
      for (const item of [byPath.get('/'), byPath.get('/product_list'), service, byPath.get('/contacts')]) {
        const response = await staticPage.goto(`${baseUrl}${item.path}`, { waitUntil: 'load' });
        const evidence = await staticPage.evaluate(() => ({
          title: document.querySelector('main h1')?.textContent.replace(/\s+/g, ' ').trim(),
          h1Count: document.querySelectorAll('main h1').length,
          bodyCharacters: document.querySelector('main')?.textContent.replace(/\s+/g, ' ').trim().length || 0,
          rootHasContent: Boolean(document.querySelector('#root')?.textContent.trim()),
          serviceCards: document.querySelectorAll('.cp-service-card').length,
          navigationLinks: document.querySelectorAll('a[href]').length,
          whatsappHref: document.querySelector('.whatsapp-float')?.getAttribute('href'),
        }));
        const ok = response.status() === 200 && evidence.h1Count === 1 && evidence.rootHasContent && evidence.bodyCharacters > 100 && evidence.navigationLinks > 0;
        const entry = { path: item.path, javaScriptEnabled: false, httpStatus: response.status(), ...evidence, ok };
        report.noJavaScriptChecks.push(entry);
        if (!ok) report.failures.push({ scope: 'no-javascript', ...entry });
      }
      console.log(`No-JavaScript prerender checks completed: ${report.noJavaScriptChecks.length}`);
    } finally {
      await staticContext.close();
    }
  }

  await page.setViewportSize({ width: 1536, height: 960 });
  await runInteraction('catalog filters, search, clear and reset', async () => {
    await visit('/product_list');
    const allServices = data.pages.filter((item) => item.type === 'service');
    const cards = page.locator('.cp-service-card');
    assert(await cards.count() === allServices.length, 'Catalog initially omits services');
    const filterCounts = {};
    for (const filter of filters) {
      const button = page.locator('.cp-filter-list').getByRole('button', { name: filter.label, exact: true });
      await button.click();
      const expected = allServices.filter((item) => belongsTo(item, filter.root)).map((item) => item.path).sort();
      const actual = await cards.evaluateAll((elements) => elements.map((element) => element.getAttribute('href')).sort());
      assert(JSON.stringify(actual) === JSON.stringify(expected), `Incorrect results for ${filter.label}`);
      assert(await button.getAttribute('aria-pressed') === 'true', `Filter ${filter.label} has no selected state`);
      filterCounts[filter.label] = actual.length;
    }
    await page.locator('.cp-filter-list').getByRole('button', { name: 'Все услуги', exact: true }).click();
    const search = page.locator('#cp-service-search');
    await search.fill('17025');
    const expectedResults = allServices.filter((item) => searchNormal(`${item.title} ${item.description || ''} ${item.text || ''}`).includes('17025'));
    assert(await cards.count() === expectedResults.length, 'Search results do not match source content');
    await page.getByRole('button', { name: 'Очистить поиск', exact: true }).click();
    assert(await search.inputValue() === '', 'Clear search did not clear the input');
    assert(await cards.count() === allServices.length, 'Clear search did not restore all results');
    await search.fill('qazwsx-no-service-8562');
    assert(await cards.count() === 0, 'Nonexistent query should have no results');
    assert(await page.locator('.cp-empty').isVisible(), 'Empty state is missing');
    await page.locator('.cp-empty').getByRole('button').click();
    assert(await search.inputValue() === '', 'Empty-state reset did not clear query');
    assert(await cards.count() === allServices.length, 'Empty-state reset did not restore catalog');
    return { totalServices: allServices.length, filterCounts, searchResultCount: expectedResults.length };
  });

  await runInteraction('category to subcategory to service navigation', async () => {
    const category = byPath.get(filters[0].root);
    await visit(category.path);
    const firstChild = page.locator('.cp-category-link').first();
    const childPath = await firstChild.getAttribute('href');
    await firstChild.click();
    await page.waitForURL(`${baseUrl}${childPath}`);
    await waitForTitle(byPath.get(childPath).title);
    assert(normal(await page.locator('h1').textContent()) === normal(byPath.get(childPath).title), 'Subcategory navigation shows wrong title');
    const firstService = page.locator('.cp-service-card').first();
    const servicePath = await firstService.getAttribute('href');
    await firstService.click();
    await page.waitForURL(`${baseUrl}${servicePath}`);
    await waitForTitle(byPath.get(servicePath).title);
    assert(normal(await page.locator('h1').textContent()) === normal(byPath.get(servicePath).title), 'Service navigation shows wrong title');
    return { category: category.path, childPath, servicePath };
  });

  await runInteraction('consultation validation, draft, focus trap and Escape', async () => {
    await visit('/');
    const trigger = page.locator('.hero-actions button').first();
    await trigger.click();
    const dialog = page.locator('dialog.consultation-dialog');
    await dialog.waitFor({ state: 'visible' });
    assert(await dialog.evaluate((element) => element.contains(document.activeElement)), 'Dialog does not receive keyboard focus');
    const submit = dialog.locator('button[type="submit"]');
    const message = dialog.locator('#consultation-message');
    await submit.click();
    assert(await message.evaluate((element) => element.validity.valueMissing), 'Empty task is not invalid');
    assert(await page.evaluate(() => window.__qaOpenedWindows.length) === 0, 'Empty form opened WhatsApp');
    await message.fill('Тест');
    await submit.click();
    assert(await message.evaluate((element) => !element.checkValidity()), 'A task shorter than five characters is not invalid');
    assert(await page.evaluate(() => window.__qaOpenedWindows.length) === 0, 'Invalid short task opened WhatsApp');
    const testName = 'Проверка интерфейса';
    const testMessage = 'Тестовый черновик консультации без отправки.';
    await dialog.locator('#consultation-name').fill(testName);
    await message.fill(testMessage);
    await submit.click();
    const windows = await page.evaluate(() => window.__qaOpenedWindows);
    assert(windows.length === 1, 'Valid form did not create exactly one WhatsApp draft');
    const draft = new URL(windows[0][0]);
    const draftText = draft.searchParams.get('text') || '';
    assert(draft.origin === 'https://wa.me', 'Draft has an unexpected destination');
    assert(draft.pathname === `/${data.company.whatsappPhone}`, 'Draft uses the wrong WhatsApp number');
    assert(draftText.includes(testName) && draftText.includes(testMessage), 'Draft omits name or task');
    assert(draftText.includes('https://kazproflab.kz/'), 'Draft omits page context');
    assert(windows[0][1] === '_blank' && /noopener/.test(windows[0][2]), 'New window lacks expected isolation');
    for (let index = 0; index < 9; index += 1) {
      await page.keyboard.press('Tab');
      assert(await dialog.evaluate((element) => element.contains(document.activeElement)), 'Keyboard focus escaped open dialog');
    }
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });
    assert(await trigger.evaluate((element) => document.activeElement === element), 'Escape did not return focus to the trigger');
    return { draftPhone: draft.pathname.slice(1), draftWasIntercepted: true, sentMessages: 0 };
  });

  await runInteraction('service consultation keeps selected topic', async () => {
    await visit(service.path);
    const trigger = page.locator('.cp-service-summary button');
    await trigger.click();
    const dialog = page.locator('dialog.consultation-dialog');
    await dialog.waitFor({ state: 'visible' });
    assert(await dialog.locator('#consultation-message').inputValue() === service.title, 'Service title is not prefilled');
    await dialog.locator('.dialog-close').click();
    await dialog.waitFor({ state: 'hidden' });
    assert(await trigger.evaluate((element) => document.activeElement === element), 'Close button did not restore focus');
    return { topic: service.title };
  });

  await runInteraction('home accordion preserves content and toggles panels', async () => {
    await visit('/');
    const triggers = page.locator('.accordion-trigger');
    assert(await triggers.count() === home.services.length, 'Accordion service count differs from source');
    for (let index = 0; index < home.services.length; index += 1) {
      const trigger = triggers.nth(index);
      if (await trigger.getAttribute('aria-expanded') !== 'true') await trigger.click();
      const panelId = await trigger.getAttribute('aria-controls');
      assert(await page.locator(`#${panelId}`).isVisible(), `Accordion panel ${index + 1} did not open`);
      assert(await trigger.getAttribute('aria-expanded') === 'true', `Accordion panel ${index + 1} lacks expanded state`);
      await trigger.click();
      assert(await page.locator(`#${panelId}`).isHidden(), `Accordion panel ${index + 1} did not close`);
    }
    return { panels: home.services.length };
  });

  await runInteraction('mobile menu, Escape and route selection', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await visit('/');
    const toggle = page.locator('.menu-toggle');
    assert(await toggle.isVisible(), 'Mobile menu toggle is hidden');
    await toggle.click();
    assert(await toggle.getAttribute('aria-expanded') === 'true', 'Mobile menu did not open');
    const contactLink = page.locator('#primary-navigation a[href="/contacts"]');
    assert(await contactLink.isVisible(), 'Opened mobile navigation is not visible');
    await page.keyboard.press('Escape');
    assert(await toggle.getAttribute('aria-expanded') === 'false', 'Escape did not close mobile navigation');
    assert(await toggle.evaluate((element) => document.activeElement === element), 'Escape did not restore menu-toggle focus');
    await toggle.click();
    await contactLink.click();
    await page.waitForURL(`${baseUrl}/contacts`);
    await waitForTitle('Контакты');
    await page.waitForFunction(() => document.querySelector('.menu-toggle')?.getAttribute('aria-expanded') === 'false');
    assert(await toggle.getAttribute('aria-expanded') === 'false', 'Route selection did not close menu');
    assert(normal(await page.locator('h1').textContent()) === 'Контакты', 'Mobile menu opened wrong route');
    const float = page.locator('.whatsapp-float');
    const href = new URL(await float.getAttribute('href'));
    const bounds = await float.boundingBox();
    assert(href.pathname === `/${data.company.whatsappPhone}`, 'Floating WhatsApp uses wrong phone');
    assert(bounds && bounds.x < 100, 'WhatsApp shortcut should stay on the left like the original');
    assert(href.searchParams.get('text')?.includes('https://kazproflab.kz/contacts'), 'WhatsApp shortcut omits current page');
    return { whatsappPosition: 'left', phone: href.pathname.slice(1) };
  });

  if (report.pageErrors.length) report.failures.push({ scope: 'runtime', count: report.pageErrors.length });
  if (report.hydrationErrors.length) report.failures.push({ scope: 'hydration', count: report.hydrationErrors.length });
  const otherConsoleErrors = report.consoleErrors.filter((entry) => !/favicon\.ico/.test(entry.message));
  if (otherConsoleErrors.length) report.failures.push({ scope: 'console', count: otherConsoleErrors.length });
} catch (error) {
  report.failures.push({ scope: 'fatal', error: error.stack || error.message });
  console.error(error.stack || error.message);
} finally {
  await browser?.close();
  report.finishedAt = new Date().toISOString();
  report.renderingMode = !report.routeChecks.length ? 'not checked' : report.routeChecks.every((entry) => entry.preRendered)
    ? 'prerendered HTML with client hydration'
    : report.routeChecks.some((entry) => entry.preRendered) ? 'mixed' : 'client rendering';
  report.summary = {
    passed: report.failures.length === 0,
    routes: report.routeChecks.length,
    routeFailures: report.routeChecks.filter((entry) => !entry.ok).length,
    responsiveChecks: report.responsiveChecks.length,
    responsiveFailures: report.responsiveChecks.filter((entry) => !entry.ok).length,
    noJavaScriptChecks: report.noJavaScriptChecks.length,
    noJavaScriptFailures: report.noJavaScriptChecks.filter((entry) => !entry.ok).length,
    interactions: report.interactionChecks.length,
    interactionFailures: report.interactionChecks.filter((entry) => !entry.ok).length,
    invalidLinks: report.invalidLinks.length,
    hydrationErrors: report.hydrationErrors.length,
    pageErrors: report.pageErrors.length,
    totalFailures: report.failures.length,
  };
  await fs.writeFile(path.join(outputDir, 'browser-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ ...report.summary, report: path.join(outputDir, 'browser-report.json') }, null, 2));
  if (!report.summary.passed) process.exitCode = 1;
}
