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
  return `<div class="code-block">${langLabel}<button class="code-copy" onclick="inkCopyCode(this)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button><pre><code${langClass}>${escaped}</code></pre></div>`;
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

// Auto-detect nav link icons
const navIconMap = {
  'github.com': '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>',
  'twitter.com': '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
  'discord.com': '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286z"/></svg>'
};
// Built-in Lucide icons for features (user can override with custom SVG or emoji)
const featureIcons = {
  zap: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  package: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>',
  'folder-tree': '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2.5a1 1 0 0 1-.8-.4l-.9-1.2A1 1 0 0 0 15 3h-2a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z"/><path d="M20 21a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-2.9a1 1 0 0 1-.88-.55l-.42-.85a1 1 0 0 0-.88-.55H13a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1Z"/><path d="M3 3v2"/><path d="M3 3v18"/><path d="M3 15h9"/><path d="M3 7h9"/></svg>',
  search: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
  moon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
  bot: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>',
  rocket: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>',
  globe: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>',
  palette: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>',
  shield: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>',
  code: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
  terminal: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/></svg>',
  settings: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
  layers: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22.4 10.08-8.58 3.91a2 2 0 0 1-1.66 0l-8.58-3.9"/><path d="m22.4 14.08-8.58 3.91a2 2 0 0 1-1.66 0l-8.58-3.9"/></svg>',
  sparkles: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>'
};

function resolveFeatureIcon(icon) {
  if (!icon) return '';
  // If it's a known Lucide icon name
  if (featureIcons[icon]) return featureIcons[icon];
  // If it starts with <svg, it's custom SVG
  if (icon.trim().startsWith('<svg')) return icon;
  // Otherwise treat as emoji
  return icon;
}

const processedNav = (config.themeConfig.nav || []).map(item => {
  if (item.icon) return item; // user already provided icon
  for (const [domain, svg] of Object.entries(navIconMap)) {
    if (item.link && item.link.includes(domain)) {
      return { ...item, icon: svg };
    }
  }
  return item;
});

for (const page of pages) {
  headings.length = 0;

  let html = page.content;
  // Protect fenced code blocks from container/component processing
  const codeBlocks = [];
  html = html.replace(/^(`{3,})[^\n]*\n[\s\S]*?^\1\s*$/gm, (match) => {
    codeBlocks.push(match);
    return `<!--CODE_BLOCK_${codeBlocks.length - 1}-->`;
  });
  // Containers: ::: tip/warning/danger/info [title]
  html = processContainers(html);
  // Components: {% %}
  html = processComponents(html);
  // Restore code blocks
  html = html.replace(/<!--CODE_BLOCK_(\d+)-->/g, (_, i) => codeBlocks[parseInt(i)]);
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

  // Hero page or regular page
  const isHero = page.frontmatter.layout === 'hero' && page.frontmatter.hero;
  const heroTpl = loadTemplate('hero.html');
  let pageHtml;

  if (isHero && heroTpl) {
    const hero = page.frontmatter.hero;
    // Resolve action links with basePath
    if (hero.actions) {
      hero.actions = hero.actions.map(a => ({
        ...a,
        link: a.link.startsWith('http') ? a.link : `${base}${a.link}`
      }));
    }
    // Resolve feature icons
    if (hero.features) {
      hero.features = hero.features.map(f => ({
        ...f,
        icon: resolveFeatureIcon(f.icon)
      }));
    }
    pageHtml = renderTemplate(heroTpl, {
      hero,
      hasActions: !!(hero.actions && hero.actions.length),
      hasFeatures: !!(hero.features && hero.features.length),
      content: html,
      base
    });
  } else {
    pageHtml = renderTemplate(pageTpl, {
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
  }

  const fullHtml = renderTemplate(layoutTpl, {
    title: isHero ? config.title : `${title} | ${config.title}`,
    description,
    language: config.language,
    base,
    config,
    sidebar,
    nav: processedNav,
    hasNav: processedNav.length > 0,
    search: config.themeConfig.search,
    darkMode: config.themeConfig.darkMode,
    body: pageHtml,
    currentSlug: page.slug,
    isHero,
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
    nav: processedNav,
    hasNav: processedNav.length > 0,
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
  const icons = {
    tip: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>',
    warning: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
    danger: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>',
    info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>'
  };
  return md.replace(/^:::\s*(tip|warning|danger|info|details)(?:\[([^\]]*)\])?\s*\n([\s\S]*?)^:::\s*$/gm, (_, type, title, body) => {
    const titles = { tip: '提示', warning: '警告', danger: '危险', info: '信息', details: '详情' };
    const t = title || titles[type] || type;
    if (type === 'details') {
      return `<details class="ink-details"><summary>${t}</summary>\n\n${body.trim()}\n\n</details>`;
    }
    const icon = icons[type] || '';
    return `<div class="ink-container ink-${type}"><p class="container-title">${icon}${t}</p>\n\n${body.trim()}\n\n</div>`;
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

  // Music player: {% player src="..." title="..." artist="..." %}
  md = md.replace(/\{%\s*player\s+([\s\S]*?)%\}/g, (_, attrs) => {
    const get = (k, d) => { const m = attrs.match(new RegExp(k + '="([^"]*)"')); return m ? m[1] : d || ''; };
    const src = get('src', '');
    const title = get('title', '未知曲目');
    const artist = get('artist', '');
    const uid = 'player_' + Math.random().toString(36).slice(2, 7);
    let html = `<div class="ink-player" id="${uid}">`;
    html += `<button class="ink-player-btn" onclick="inkPlayerToggle('${uid}')"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg></button>`;
    html += '<div class="ink-player-info">';
    html += `<div class="ink-player-title">${title}</div>`;
    if (artist) html += `<div class="ink-player-artist">${artist}</div>`;
    html += '</div>';
    html += '<div class="ink-player-progress">';
    html += `<span class="ink-player-time" id="${uid}_cur">0:00</span>`;
    html += `<div class="ink-player-bar" onclick="inkPlayerSeek(event,'${uid}')"><div class="ink-player-fill" id="${uid}_fill"></div></div>`;
    html += `<span class="ink-player-time" id="${uid}_dur">0:00</span>`;
    html += '</div>';
    html += `<button class="ink-player-loop" onclick="inkPlayerLoop('${uid}')" title="循环"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg></button>`;
    html += `<audio id="${uid}_audio" src="${src}" preload="metadata"></audio>`;
    html += '</div>';
    return html;
  });

  // Video player: {% video src="..." caption="..." poster="..." %}
  md = md.replace(/\{%\s*video\s+([\s\S]*?)%\}/g, (_, attrs) => {
    const get = (k, d) => { const m = attrs.match(new RegExp(k + '="([^"]*)"')); return m ? m[1] : d || ''; };
    const src = get('src', '');
    const caption = get('caption', '');
    const poster = get('poster', '');
    const uid = 'video_' + Math.random().toString(36).slice(2, 7);
    let html = '<div class="ink-video">';
    html += `<div class="ink-video-container" id="${uid}"></div>`;
    if (caption) html += `<div class="ink-video-caption">${caption}</div>`;
    html += '</div>';
    html += `<script>document.addEventListener('DOMContentLoaded',function(){if(typeof Artplayer!=='undefined'){new Artplayer({container:'#${uid}',url:'${src}'${poster ? ",poster:'" + poster + "'" : ''},volume:0.7,autoSize:true,fullscreen:true,fullscreenWeb:true,pip:true,playbackRate:true,aspectRatio:true,setting:true,theme:'var(--ink-accent)',lang:navigator.language.startsWith('zh')?'zh-cn':'en'});}});</script>`;
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
