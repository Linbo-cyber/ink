#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const matter = require('gray-matter');

// ── Config ──────────────────────────────────────────────
const ROOT = process.cwd();
const configPath = path.join(ROOT, 'ink.config.js');
const defaultConfig = {
  title: 'Ink Docs',
  description: 'Documentation powered by Ink',
  basePath: '',
  language: 'zh-CN',
  themeConfig: {
    nav: [],
    sidebar: 'auto',
    search: true,
    darkMode: true,
    editLink: '',
    lastUpdated: true,
    footer: { message: 'Powered by Ink', copyright: '' }
  }
};
const userConfig = fs.existsSync(configPath) ? require(configPath) : {};
const config = deepMerge(defaultConfig, userConfig);
const base = config.basePath.replace(/\/+$/, '');

// ── Marked setup ────────────────────────────────────────
marked.setOptions({
  gfm: true,
  breaks: false,
  headerIds: true,
  mangle: false
});

const renderer = new marked.Renderer();
const headings = [];

renderer.heading = function ({ tokens, depth }) {
  const text = this.parser.parseInline(tokens);
  const raw = tokens.map(t => t.raw || t.text || '').join('');
  const id = slugify(raw || text);
  headings.push({ id, text: stripTags(text), level: depth });
  return `<h${depth} id="${id}"><a class="header-anchor" href="#${id}">#</a>${text}</h${depth}>`;
};

renderer.table = function (token) {
  let header = '';
  let body = '';
  let cell = '';
  for (let j = 0; j < token.header.length; j++) {
    cell += this.tablecell(token.header[j]);
  }
  header += this.tablerow({ text: cell });
  for (let j = 0; j < token.rows.length; j++) {
    let row = '';
    for (let k = 0; k < token.rows[j].length; k++) {
      row += this.tablecell(token.rows[j][k]);
    }
    body += this.tablerow({ text: row });
  }
  return `<div class="table-wrap"><table><thead>${header}</thead><tbody>${body}</tbody></table></div>`;
};

renderer.code = function ({ text, lang }) {
  const escaped = escapeHtml(text);
  const langClass = lang ? ` class="language-${lang}"` : '';
  const langLabel = lang ? `<span class="code-lang">${lang}</span>` : '';
  return `<div class="code-block">${langLabel}<button class="code-copy" onclick="navigator.clipboard.writeText(this.parentElement.querySelector('code').textContent)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button><pre><code${langClass}>${escaped}</code></pre></div>`;
};

renderer.image = function ({ href, title, text }) {
  const src = href.startsWith('http') ? href : `${base}/${href.replace(/^\/+/, '')}`;
  const alt = text || '';
  const t = title ? ` title="${title}"` : '';
  return `<figure class="ink-figure"><img src="${src}" alt="${alt}"${t} loading="lazy" />${alt ? `<figcaption>${alt}</figcaption>` : ''}</figure>`;
};

marked.use({ renderer });

// ── Collect docs ────────────────────────────────────────
const docsDir = path.join(ROOT, 'docs');
if (!fs.existsSync(docsDir)) { console.error('Error: docs/ directory not found'); process.exit(1); }

const startTime = Date.now();
console.log('Building...');

const pages = [];
collectDocs(docsDir, '');

function collectDocs(dir, rel) {
  const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => {
    // index first, then alphabetical
    if (a.name === 'index.md') return -1;
    if (b.name === 'index.md') return 1;
    return a.name.localeCompare(b.name);
  });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      collectDocs(fullPath, relPath);
    } else if (entry.name.endsWith('.md')) {
      const raw = fs.readFileSync(fullPath, 'utf-8');
      const { data: frontmatter, content } = matter(raw);
      const slug = relPath.replace(/\.md$/, '').replace(/\/index$/, '') || 'index';
      const outPath = slug === 'index' ? 'index.html' : `${slug}.html`;
      pages.push({ slug, outPath, frontmatter, content, relPath, fullPath });
    }
  }
}

// ── Build sidebar ───────────────────────────────────────
const sidebar = buildSidebar(pages);

// ── Render pages ────────────────────────────────────────
const distDir = path.join(ROOT, 'dist');
rmSync(distDir);

const layoutTpl = loadTemplate('layout.html');
const pageTpl = loadTemplate('page.html');

for (const page of pages) {
  headings.length = 0;

  let html = page.content;
  // Containers: ::: tip/warning/danger/info [title]
  html = processContainers(html);
  // Components: {% %}
  html = processComponents(html);
  // Markdown
  html = marked.parse(html);
  // Auto-spacing CJK
  html = autoSpace(html);

  const toc = headings.filter(h => h.level >= 2 && h.level <= 3);
  const title = page.frontmatter.title || extractTitle(page.content) || config.title;
  const description = page.frontmatter.description || config.description;

  // Prev/Next
  const idx = pages.indexOf(page);
  const prev = idx > 0 ? pages[idx - 1] : null;
  const next = idx < pages.length - 1 ? pages[idx + 1] : null;

  const pageHtml = renderTemplate(pageTpl, {
    content: html,
    toc,
    hasToc: toc.length > 0,
    prev,
    next,
    hasPrev: !!prev,
    hasNext: !!next,
    base,
    lastUpdated: config.themeConfig.lastUpdated ? getLastModified(page.fullPath) : ''
  });

  const fullHtml = renderTemplate(layoutTpl, {
    title: `${title} | ${config.title}`,
    description,
    language: config.language,
    base,
    config,
    sidebar,
    nav: config.themeConfig.nav || [],
    hasNav: (config.themeConfig.nav || []).length > 0,
    search: config.themeConfig.search,
    darkMode: config.themeConfig.darkMode,
    body: pageHtml,
    currentSlug: page.slug,
    footer: config.themeConfig.footer || {}
  });

  const outFile = path.join(distDir, page.outPath);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, fullHtml);
}

// ── Copy assets ─────────────────────────────────────────
const themeAssets = path.join(ROOT, 'themes/default/assets');
const distAssets = path.join(distDir, 'assets');
if (fs.existsSync(themeAssets)) copyDir(themeAssets, distAssets);

// Copy docs static files (images etc)
copyStaticFiles(docsDir, distDir);

// ── 404 ─────────────────────────────────────────────────
const tpl404 = loadTemplate('404.html');
if (tpl404) {
  const html404 = renderTemplate(layoutTpl, {
    title: `404 | ${config.title}`,
    description: 'Page not found',
    language: config.language,
    base,
    config,
    sidebar: [],
    nav: config.themeConfig.nav || [],
    hasNav: (config.themeConfig.nav || []).length > 0,
    search: false,
    darkMode: config.themeConfig.darkMode,
    body: renderTemplate(tpl404, { base }),
    currentSlug: '404',
    footer: config.themeConfig.footer || {}
  });
  fs.writeFileSync(path.join(distDir, '404.html'), html404);
}

// ── Search index ────────────────────────────────────────
const searchIndex = pages.map(p => ({
  title: p.frontmatter.title || p.slug,
  url: `${base}/${p.outPath}`,
  content: p.content.replace(/^---[\s\S]*?---/, '').replace(/[#*`\[\](){}|>_~]/g, '').replace(/\{%[\s\S]*?%\}/g, '').replace(/:::[\s\S]*?:::/g, '').slice(0, 2000)
}));
fs.writeFileSync(path.join(distDir, 'search-index.json'), JSON.stringify(searchIndex));

const elapsed = Date.now() - startTime;
console.log(`Done in ${elapsed}ms — ${pages.length} pages`);

// ═══════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════

function buildSidebar(pages) {
  if (config.themeConfig.sidebar === 'auto') {
    const tree = {};
    for (const p of pages) {
      const parts = p.slug.split('/');
      if (parts.length === 1) {
        if (!tree._items) tree._items = [];
        tree._items.push({ text: p.frontmatter.title || p.slug, link: `${base}/${p.outPath}`, slug: p.slug, order: p.frontmatter.order || 999 });
      } else {
        const group = parts[0];
        if (!tree[group]) tree[group] = { text: group, items: [] };
        tree[group].items.push({
          text: p.frontmatter.title || parts.slice(1).join('/'),
          link: `${base}/${p.outPath}`,
          slug: p.slug,
          order: p.frontmatter.order || 999
        });
      }
    }
    const result = [];
    if (tree._items) {
      tree._items.sort((a, b) => a.order - b.order);
      result.push(...tree._items.map(i => ({ text: i.text, link: i.link, slug: i.slug })));
    }
    for (const [key, group] of Object.entries(tree)) {
      if (key === '_items') continue;
      group.items.sort((a, b) => a.order - b.order);
      // Check for group index page title
      const indexPage = pages.find(p => p.slug === key || p.slug === `${key}/index`);
      result.push({
        text: indexPage?.frontmatter.title || capitalize(key),
        items: group.items.map(i => ({ text: i.text, link: i.link, slug: i.slug })),
        collapsed: false
      });
    }
    return result;
  }
  return config.themeConfig.sidebar || [];
}

function processContainers(md) {
  return md.replace(/^:::\s*(tip|warning|danger|info|details)(?:\[([^\]]*)\])?\s*\n([\s\S]*?)^:::\s*$/gm, (_, type, title, body) => {
    const titles = { tip: '提示', warning: '警告', danger: '危险', info: '信息', details: '详情' };
    const t = title || titles[type] || type;
    if (type === 'details') {
      return `<details class="ink-details"><summary>${t}</summary>\n\n${body.trim()}\n\n</details>`;
    }
    return `<div class="ink-container ink-${type}"><p class="container-title">${t}</p>\n\n${body.trim()}\n\n</div>`;
  });
}

function processComponents(md) {
  // Badge: {% badge text="..." type="tip|warning|danger" %}
  md = md.replace(/\{%\s*badge\s+([\s\S]*?)%\}/g, (_, attrs) => {
    const get = (k, d) => { const m = attrs.match(new RegExp(k + '="([^"]*)"')); return m ? m[1] : d || ''; };
    return `<span class="ink-badge ink-badge-${get('type', 'tip')}">${get('text', '')}</span>`;
  });
  // Steps: {% steps %}...{% endsteps %}
  md = md.replace(/\{%\s*steps\s*%\}([\s\S]*?)\{%\s*endsteps\s*%\}/g, (_, body) => {
    return `<div class="ink-steps">\n\n${body.trim()}\n\n</div>`;
  });
  // Tabs: {% tabs %}{% tab "name" %}...{% endtab %}{% endtabs %}
  md = md.replace(/\{%\s*tabs\s*%\}([\s\S]*?)\{%\s*endtabs\s*%\}/g, (_, body) => {
    const tabs = [];
    body.replace(/\{%\s*tab\s+"([^"]+)"\s*%\}([\s\S]*?)(?=\{%\s*(?:tab|endtabs))/g, (_, name, content) => {
      tabs.push({ name, content: content.trim() });
    });
    const uid = 'tabs_' + Math.random().toString(36).slice(2, 7);
    let html = `<div class="ink-tabs" id="${uid}">`;
    html += '<div class="ink-tabs-nav">';
    tabs.forEach((t, i) => {
      html += `<button class="ink-tab-btn${i === 0 ? ' active' : ''}" onclick="inkSwitchTab('${uid}',${i})">${t.name}</button>`;
    });
    html += '</div>';
    tabs.forEach((t, i) => {
      html += `<div class="ink-tab-panel${i === 0 ? ' active' : ''}">\n\n${t.content}\n\n</div>`;
    });
    html += '</div>';
    return html;
  });
  return md;
}

function autoSpace(html) {
  const CJK = '\u2e80-\u2fff\u3040-\u309f\u30a0-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff';
  const re1 = new RegExp(`([${CJK}])([A-Za-z0-9\`\\$%#])`, 'g');
  const re2 = new RegExp(`([A-Za-z0-9\`\\$%#])([${CJK}])`, 'g');
  const parts = html.split(/(<pre[\s\S]*?<\/pre>|<code[\s\S]*?<\/code>)/gi);
  return parts.map((p, i) => i % 2 === 0 ? p.replace(re1, '$1 $2').replace(re2, '$1 $2') : p).join('');
}

// ── Template engine ─────────────────────────────────────
function renderTemplate(tpl, ctx) {
  // {{#each items}} ... {{/each}}
  tpl = processEach(tpl, ctx);
  // {{#if cond}} ... {{else}} ... {{/if}}
  tpl = tpl.replace(/\{\{#if\s+(\w[\w.]*)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, key, body) => {
    const val = getVal(ctx, key);
    const [ifPart, elsePart] = body.split(/\{\{else\}\}/);
    return val ? (ifPart || '') : (elsePart || '');
  });
  // {{#unless cond}} ... {{/unless}}
  tpl = tpl.replace(/\{\{#unless\s+(\w[\w.]*)\}\}([\s\S]*?)\{\{\/unless\}\}/g, (_, key, body) => {
    return getVal(ctx, key) ? '' : body;
  });
  // {{{raw}}} and {{escaped}}
  tpl = tpl.replace(/\{\{\{(\w[\w.]*)\}\}\}/g, (_, key) => String(getVal(ctx, key) ?? ''));
  tpl = tpl.replace(/\{\{(\w[\w.]*)\}\}/g, (_, key) => escapeHtml(String(getVal(ctx, key) ?? '')));
  return tpl;
}

function processEach(tpl, ctx) {
  const re = /\{\{#each\s+(\w[\w.]*)\}\}/g;
  let match;
  while ((match = re.exec(tpl)) !== null) {
    const key = match[1];
    const start = match.index;
    const afterOpen = start + match[0].length;
    let depth = 1, i = afterOpen;
    while (i < tpl.length && depth > 0) {
      if (tpl.startsWith('{{#each ', i)) depth++;
      if (tpl.startsWith('{{/each}}', i)) { depth--; if (depth === 0) break; }
      i++;
    }
    const inner = tpl.slice(afterOpen, i);
    const end = i + '{{/each}}'.length;
    const arr = getVal(ctx, key);
    let result = '';
    if (Array.isArray(arr)) {
      for (const item of arr) {
        const itemCtx = typeof item === 'object' ? { ...ctx, ...item } : { ...ctx, '.': item };
        result += renderTemplate(inner, itemCtx);
      }
    }
    tpl = tpl.slice(0, start) + result + tpl.slice(end);
    re.lastIndex = start + result.length;
  }
  return tpl;
}

function getVal(ctx, key) {
  if (key === '.') return ctx['.'];
  return key.split('.').reduce((o, k) => o && o[k], ctx);
}

function loadTemplate(name) {
  const p = path.join(ROOT, 'themes/default/templates', name);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : '';
}

function slugify(text) {
  return text.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^\w\u4e00-\u9fff\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
}

function stripTags(s) { return s.replace(/<[^>]+>/g, ''); }

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function extractTitle(md) {
  const m = md.match(/^#\s+(.+)$/m);
  return m ? m[1] : '';
}

function getLastModified(filePath) {
  try {
    const stat = fs.statSync(filePath);
    return stat.mtime.toISOString().slice(0, 10);
  } catch { return ''; }
}

function rmSync(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function copyStaticFiles(srcDir, destDir) {
  const exts = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.mp4', '.mp3', '.pdf', '.zip'];
  function walk(dir, rel) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      const r = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(full, r);
      else if (exts.includes(path.extname(entry.name).toLowerCase())) {
        const dest = path.join(destDir, r);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(full, dest);
      }
    }
  }
  walk(srcDir, '');
}

function deepMerge(target, source) {
  const out = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) && target[key]) {
      out[key] = deepMerge(target[key], source[key]);
    } else {
      out[key] = source[key];
    }
  }
  return out;
}
